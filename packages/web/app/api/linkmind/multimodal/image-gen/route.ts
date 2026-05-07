import { NextRequest, NextResponse } from 'next/server'

const LINKMIND_BASE = process.env.LINKMIND_BASE_URL || 'http://localhost:8080'
const MAX_PROMPT_LENGTH = 2000

export async function POST(request: NextRequest) {
  const startTime = Date.now()

  try {
    const body = await request.json()
    const prompt = body.prompt || ''

    if (prompt.length > MAX_PROMPT_LENGTH) {
      return NextResponse.json(
        { success: false, error: `Prompt too long: ${prompt.length} > ${MAX_PROMPT_LENGTH}` },
        { status: 413 }
      )
    }

    console.log(`[LinkMind/ImageGen] POST → model=${body.model || 'default'}, size=${body.size || '1024x1024'}`)

    const response = await fetch(`${LINKMIND_BASE}/image/text2image`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: request.headers.get('authorization') || '',
        'User-Agent': 'doubao-linkmind-imagegen-proxy',
      },
      body: JSON.stringify(body),
    })

    if (!response.ok) {
      const errText = await response.text().catch(() => '')
      return NextResponse.json({ success: false, error: `Upstream ${response.status}: ${errText}` }, { status: response.status })
    }

    const data = await response.json()
    return NextResponse.json({
      success: true,
      images: data.data || data.images || [],
      raw: data,
      durationMs: Date.now() - startTime,
    })
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error)
    console.error(`[LinkMind/ImageGen] Error: ${msg}`)
    return NextResponse.json({ success: false, error: msg }, { status: 502 })
  }
}
