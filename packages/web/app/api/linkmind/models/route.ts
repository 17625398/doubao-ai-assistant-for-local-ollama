import { NextRequest, NextResponse } from 'next/server'

const LINKMIND_BASE = process.env.LINKMIND_BASE_URL || 'http://localhost:8080'
let cachedModels: any = null
let cacheTimestamp = 0
const CACHE_TTL = 60 * 1000

export async function GET(request: NextRequest) {
  const now = Date.now()

  if (cachedModels && now - cacheTimestamp < CACHE_TTL) {
    return NextResponse.json(cachedModels, {
      headers: { 'x-cache': 'hit', 'x-cache-age': String(now - cacheTimestamp) },
    })
  }

  try {
    const url = `${LINKMIND_BASE}/v1/models`
    const auth = request.headers.get('authorization') || ''

    const response = await fetch(url, {
      headers: {
        Authorization: auth,
        'User-Agent': 'doubao-linkmind-models-proxy',
      },
      signal: AbortSignal.timeout(10000),
    })

    if (!response.ok) {
      const errText = await response.text().catch(() => '')
      console.error(`[LinkMind/Models] Upstream error: ${response.status} ${errText}`)
      return NextResponse.json(
        { success: false, error: `Upstream ${response.status}: ${errText}` },
        { status: response.status }
      )
    }

    const data = await response.json()
    cachedModels = data
    cacheTimestamp = now

    const modelCount = data.data?.length || 0
    console.log(`[LinkMind/Models] Fetched ${modelCount} models`)

    return NextResponse.json(data, {
      headers: {
        'x-doubao-proxy': 'linkmind-models',
        'x-cache': 'miss',
        'x-model-count': String(modelCount),
      },
    })
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error)

    if (cachedModels) {
      console.warn(`[LinkMind/Models] Error (using stale cache): ${msg}`)
      return NextResponse.json(cachedModels, {
        headers: { 'x-cache': 'stale', 'x-cache-error': msg },
      })
    }

    console.error(`[LinkMind/Models] Error: ${msg}`)
    return NextResponse.json({ success: false, error: msg }, { status: 502 })
  }
}
