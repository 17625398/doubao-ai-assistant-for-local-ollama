import { NextRequest, NextResponse } from 'next/server'

const GW = process.env.OPENCLAW_GATEWAY_URL || 'http://localhost:18789'

async function gw(method: string, path: string, body?: any) {
  const url = `${GW}${path}`
  const opts: RequestInit = { method, headers: { 'Content-Type': 'application/json' } }
  if (body !== undefined && method !== 'GET') opts.body = JSON.stringify(body)
  const res = await fetch(url, opts)
  const data = await res.json().catch(() => ({}))
  return { ok: res.ok, status: res.status, data }
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const body = await request.json()

    let sessionId = body.sessionId
    if (!sessionId) {
      const sr = await gw('POST', `/api/agents/${id}/sessions`, {
        channelId: body.channelId,
        peerId: body.peerId,
      })
      sessionId = sr.data?.id
    }

    const isStream =
      request.headers.get('accept')?.includes('text/event-stream') || body.stream === true

    if (isStream) {
      const encoder = new TextEncoder()
      const stream = new ReadableStream({
        async start(controller) {
          try {
            const res = await fetch(`${GW}/api/chat`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json', Accept: 'text/event-stream' },
              body: JSON.stringify({ sessionId, content: body.content || '', ...body.options }),
            })
            const reader = res.body?.getReader()
            if (reader) {
              while (true) {
                const { done, value } = await reader.read()
                if (done) break
                controller.enqueue(value)
              }
            }
            controller.enqueue(encoder.encode('data: [DONE]\n\n'))
            controller.close()
          } catch (err: any) {
            controller.enqueue(
              encoder.encode(`data: ${JSON.stringify({ type: 'error', error: err.message })}\n\n`)
            )
            controller.close()
          }
        },
      })
      return new Response(stream, {
        headers: { 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache' },
      })
    }

    const r = await gw('POST', '/api/chat', {
      sessionId,
      content: body.content || '',
      ...body.options,
    })
    return NextResponse.json({ success: r.ok, ...r.data, sessionId })
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 })
  }
}
