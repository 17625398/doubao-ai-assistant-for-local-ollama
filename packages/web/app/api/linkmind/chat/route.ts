import { NextRequest, NextResponse } from 'next/server'

const LINKMIND_BASE = process.env.LINKMIND_BASE_URL || 'http://localhost:8080'

function log(level: string, msg: string) {
  const ts = new Date().toISOString()
  console.log(`[${ts}] [LinkMind/Chat] ${level.toUpperCase()}: ${msg}`)
}

export async function POST(request: NextRequest) {
  const startTime = Date.now()
  let body: any

  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ success: false, error: 'Invalid JSON body' }, { status: 400 })
  }

  const model = body.model || 'qwen-plus'
  const stream = body.stream === true

  log('info', `POST → ${model}, stream=${stream}, messages=${body.messages?.length || 0}`)

  try {
    const upstreamUrl = `${LINKMIND_BASE}/v1/chat/completions`

    if (stream) {
      const response = await fetch(upstreamUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: request.headers.get('authorization') || '',
          'User-Agent': 'doubao-linkmind-chat-proxy',
        },
        body: JSON.stringify(body),
      })

      if (!response.ok) {
        const errText = await response.text().catch(() => '')
        log('error', `Stream upstream error: ${response.status} ${errText}`)
        return NextResponse.json(
          { success: false, error: `Upstream ${response.status}: ${errText}` },
          { status: response.status }
        )
      }

      const encoder = new TextEncoder()
      const readable = new ReadableStream({
        async start(controller) {
          const reader = response.body?.getReader()
          if (!reader) {
            controller.close()
            return
          }

          const decoder = new TextDecoder()
          let buffer = ''

          try {
            while (true) {
              const { done, value } = await reader.read()
              if (done) break

              buffer += decoder.decode(value, { stream: true })
              const lines = buffer.split('\n')
              buffer = lines.pop() || ''

              for (const line of lines) {
                if (line.startsWith('data: ')) {
                  const data = line.slice(6)
                  if (data === '[DONE]') {
                    controller.enqueue(encoder.encode('data: [DONE]\n\n'))
                    controller.close()
                    return
                  }
                  controller.enqueue(encoder.encode(`${line}\n\n`))
                }
              }
            }

            controller.enqueue(encoder.encode('data: [DONE]\n\n'))
            controller.close()
          } catch (error) {
            controller.error(error)
          }
        },
      })

      return new Response(readable, {
        headers: {
          'Content-Type': 'text/event-stream',
          'Cache-Control': 'no-cache',
          Connection: 'keep-alive',
          'x-doubao-proxy': 'linkmind-chat',
          'x-duration-ms': String(Date.now() - startTime),
        },
      })
    }

    const response = await fetch(upstreamUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: request.headers.get('authorization') || '',
        'User-Agent': 'doubao-linkmind-chat-proxy',
      },
      body: JSON.stringify(body),
    })

    if (!response.ok) {
      const errText = await response.text().catch(() => '')
      log('error', `Upstream error: ${response.status} ${errText}`)
      return NextResponse.json(
        {
          success: false,
          error: `Upstream ${response.status}: ${errText}`,
          status: response.status,
        },
        { status: response.status }
      )
    }

    const data = await response.json()
    const duration = Date.now() - startTime

    log('info', `Complete: ${duration}ms, tokens=${data.usage?.total_tokens || '?'}`)

    return NextResponse.json(data, {
      headers: {
        'x-doubao-proxy': 'linkmind-chat',
        'x-duration-ms': String(duration),
      },
    })
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error)
    log('error', `Error: ${msg}`)
    return NextResponse.json({ success: false, error: msg }, { status: 502 })
  }
}
