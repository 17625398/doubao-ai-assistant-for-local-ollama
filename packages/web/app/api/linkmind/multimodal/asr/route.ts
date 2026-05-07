import { NextRequest, NextResponse } from 'next/server'

const LINKMIND_BASE = process.env.LINKMIND_BASE_URL || 'http://localhost:8080'
const REQUEST_TIMEOUT = parseInt(process.env.LINKMIND_REQUEST_TIMEOUT || '30000', 10)
const MAX_AUDIO_SIZE = 25 * 1024 * 1024

function classifyError(error: unknown): { code: string; message: string; status: number } {
  const msg = error instanceof Error ? error.message : String(error)

  // 网络层错误：后端不可达
  if (msg.includes('ECONNREFUSED') || msg.includes('fetch failed') || msg.includes('NetworkError')) {
    return {
      code: 'UPSTREAM_UNREACHABLE',
      message: `无法连接到 LinkMind 服务 (${LINKMIND_BASE})，请确认服务已启动`,
      status: 502,
    }
  }
  // 超时错误
  if (msg.includes('abort') || msg.includes('timeout') || msg.includes('AbortError')) {
    return {
      code: 'UPSTREAM_TIMEOUT',
      message: `LinkMind 服务响应超时 (>${REQUEST_TIMEOUT / 1000}s)，请稍后重试`,
      status: 504,
    }
  }
  // DNS 错误
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
    const contentType = request.headers.get('content-type') || ''

    let body: FormData | Record<string, any>
    if (contentType.includes('multipart/form-data')) {
      const formData = await request.formData()
      const file = formData.get('file') as File | null
      if (file && file.size > MAX_AUDIO_SIZE) {
        return NextResponse.json(
          {
            success: false,
            error: `Audio too large: ${(file.size / 1024 / 1024).toFixed(1)}MB > 25MB limit`,
            code: 'PAYLOAD_TOO_LARGE',
          },
          { status: 413 }
        )
      }
      body = formData
    } else {
      body = await request.json()
    }

    console.log(`[LinkMind/ASR] Proxying → ${LINKMIND_BASE}/audio/speech2text`)

    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT)

    let response: Response
    try {
      response = await fetch(`${LINKMIND_BASE}/audio/speech2text`, {
        method: 'POST',
        headers: {
          ...(body instanceof FormData ? {} : { 'Content-Type': 'application/json' }),
          Authorization: request.headers.get('authorization') || '',
          'User-Agent': 'doubao-linkmind-asr-proxy',
        },
        signal: controller.signal,
        body: body instanceof FormData ? body : JSON.stringify(body),
      })
    } catch (fetchError) {
      clearTimeout(timeoutId)
      const classified = classifyError(fetchError)
      console.error(`[LinkMind/ASR] ${classified.code}: ${classified.message}`)
      return NextResponse.json(
        { success: false, error: classified.message, code: classified.code },
        { status: classified.status }
      )
    }
    clearTimeout(timeoutId)

    if (!response.ok) {
      const errText = await response.text().catch(() => '')
      console.error(`[LinkMind/ASR] Upstream error: ${response.status} ${errText}`)
      return NextResponse.json(
        { success: false, error: `Upstream ${response.status}: ${errText}`, code: 'UPSTREAM_ERROR' },
        { status: response.status }
      )
    }

    const data = await response.json()
    const durationMs = Date.now() - startTime
    console.log(`[LinkMind/ASR] Success in ${durationMs}ms`)
    return NextResponse.json({
      success: true,
      ...data,
      durationMs,
    })
  } catch (error) {
    const classified = classifyError(error)
    console.error(`[LinkMind/ASR] ${classified.code}: ${classified.message}`)
    return NextResponse.json(
      { success: false, error: classified.message, code: classified.code },
      { status: classified.status }
    )
  }
}
