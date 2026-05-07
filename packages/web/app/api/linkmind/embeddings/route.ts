import { NextRequest, NextResponse } from 'next/server'

const LINKMIND_BASE = process.env.LINKMIND_BASE_URL || 'http://localhost:8080'
const MAX_BATCH_SIZE = 2048

export async function POST(request: NextRequest) {
  const startTime = Date.now()
  let body: any

  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ success: false, error: 'Invalid JSON body' }, { status: 400 })
  }

  const input = body.input
  if (!input) {
    return NextResponse.json({ success: false, error: 'Missing "input" field' }, { status: 400 })
  }

  const texts = Array.isArray(input) ? input : [input]

  if (texts.length > MAX_BATCH_SIZE) {
    return NextResponse.json(
      { success: false, error: `Batch size ${texts.length} exceeds limit of ${MAX_BATCH_SIZE}` },
      { status: 413 }
    )
  }

  if (texts.some(t => typeof t !== 'string' || t.length === 0)) {
    return NextResponse.json(
      { success: false, error: 'All inputs must be non-empty strings' },
      { status: 400 }
    )
  }

  console.log(`[LinkMind/Embeddings] POST → ${texts.length} texts, model=${body.model || 'default'}`)

  try {
    const response = await fetch(`${LINKMIND_BASE}/v1/embeddings`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: request.headers.get('authorization') || '',
        'User-Agent': 'doubao-linkmind-embed-proxy',
      },
      body: JSON.stringify({
        ...body,
        input: texts,
        encoding_format: body.encoding_format || 'float',
      }),
      signal: AbortSignal.timeout(120000),
    })

    if (!response.ok) {
      const errText = await response.text().catch(() => '')
      console.error(`[LinkMind/Embeddings] Upstream error: ${response.status}`)
      return NextResponse.json(
        { success: false, error: `Upstream ${response.status}: ${errText.slice(0, 500)}` },
        { status: response.status }
      )
    }

    const data = await response.json()
    const duration = Date.now() - startTime
    const dims = data.data?.[0]?.embedding?.length || '?'

    console.log(
      `[LinkMind/Embeddings] Complete: ${duration}ms, texts=${texts.length}, dims=${dims}`
    )

    return NextResponse.json(data, {
      headers: {
        'x-doubao-proxy': 'linkmind-embeddings',
        'x-duration-ms': String(duration),
        'x-embedding-dims': String(dims),
        'x-text-count': String(texts.length),
      },
    })
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error)
    console.error(`[LinkMind/Embeddings] Error: ${msg}`)
    return NextResponse.json({ success: false, error: msg }, { status: 502 })
  }
}
