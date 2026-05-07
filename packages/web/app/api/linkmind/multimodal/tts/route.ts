import { NextRequest, NextResponse } from 'next/server'

const LINKMIND_BASE = process.env.LINKMIND_BASE_URL || 'http://localhost:8080'
const REQUEST_TIMEOUT = parseInt(process.env.LINKMIND_REQUEST_TIMEOUT || '30000', 10)
const MAX_TEXT_LENGTH = 4000

function classifyError(error: unknown): { code: string; message: string; status: number } {
  const msg = error instanceof Error ? error.message : String(error)

  if (msg.includes('ECONNREFUSED') || msg.includes('fetch failed') || msg.includes('NetworkError')) {
    return {
      code: 'UPSTREAM_UNREACHABLE',
      message: `无法连接到 LinkMind 服务 (${LINKMIND_BASE})，请确认服务已启动`,
      status: 502,
    }
  }
  if (msg.includes('abort') || msg.includes('timeout') || msg.includes('AbortError')) {
    return {
      code: 'UPSTREAM_TIMEOUT',
      message: `LinkMind 服务响应超时 (>${REQUEST_TIMEOUT / 1000}s)，请稍后重试`,
      status: 504,
    }
  }
  if (msg.includes('ENOTFOUND') || msg.includes('getaddrinfo')) {
    return {
      code: 'UPSTREAM_DNS_ERROR',
      message: `无法解析 LinkMind 服务地址: ${LINKMIND_BASE}，请检查 LINKMIND_BASE_URL 配置`,
      status: 502,
    }
  }

  return {
    code: 'INTERNAL_ERROR',
    message: msg,
    status: 502,
  }
}

export async function POST(request: NextRequest) {
  const startTime = Date.now()

  try {
    const body = await request.json()
    const text = body.input || body.text || ''

    if (text.length > MAX_TEXT_LENGTH) {
      return NextResponse.json(
        { success: false, error: `Text too long: ${text.length} > ${MAX_TEXT_LENGTH} chars`, code: 'PAYLOAD_TOO_LARGE' },
        { status: 413 }
      )
    }

    console.log(`[LinkMind/TTS] Proxying → ${LINKMIND_BASE}/audio/text2speech`)

    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT)

    let response: Response
    try {
      response = await fetch(`${LINKMIND_BASE}/audio/text2speech`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: request.headers.get('authorization') || '',
          'User-Agent': 'doubao-linkmind-tts-proxy',
        },
        signal: controller.signal,
        body: JSON.stringify(body),
      })
    } catch (fetchError) {
      clearTimeout(timeoutId)
      const classified = classifyError(fetchError)
      console.error(`[LinkMind/TTS] ${classified.code}: ${classified.message}`)
      return NextResponse.json(
        { success: false, error: classified.message, code: classified.code },
        { status: classified.status }
      )
    }
    clearTimeout(timeoutId)

    if (!response.ok) {
      const errText = await response.text().catch(() => '')
      console.error(`[LinkMind/TTS] Upstream error: ${response.status} ${errText}`)
      return NextResponse.json(
        { success: false, error: `Upstream ${response.status}: ${errText}`, code: 'UPSTREAM_ERROR' },
        { status: response.status }
      )
    }

    const contentType = response.headers.get('content-type') || ''

    if (contentType.includes('audio') || contentType.includes('octet-stream')) {
      const audioBuffer = await response.arrayBuffer()
      const base64 = Buffer.from(audioBuffer).toString('base64')
      const durationMs = Date.now() - startTime
      console.log(`[LinkMind/TTS] Audio success in ${durationMs}ms`)
      return NextResponse.json({
        success: true,
        audioBase64: base64,
        mimeType: contentType,
        durationMs,
      })
    }

    const data = await response.json()
    const durationMs = Date.now() - startTime
    console.log(`[LinkMind/TTS] JSON success in ${durationMs}ms`)
    return NextResponse.json({ success: true, ...data, durationMs })
  } catch (error) {
    const classified = classifyError(error)
    console.error(`[LinkMind/TTS] ${classified.code}: ${classified.message}`)
    return NextResponse.json(
      { success: false, error: classified.message, code: classified.code },
      { status: classified.status }
    )
  }
}
