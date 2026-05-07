import { NextRequest, NextResponse } from 'next/server'

const LINKMIND_BASE = process.env.LINKMIND_BASE_URL || 'http://localhost:8080'
const AGENTS_PATH = '/agents'

function log(level: string, msg: string) {
  console.log(`[${new Date().toISOString()}] [LinkMind/Agent] ${level.toUpperCase()}: ${msg}`)
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const agentId = searchParams.get('agentId')
  const action = searchParams.get('action')

  try {
    if (action === 'status' && agentId) {
      const res = await fetch(`${LINKMIND_BASE}${AGENTS_PATH}/${agentId}/status`, {
        headers: { Authorization: request.headers.get('authorization') || '' },
      })
      const data = await res.json()
      return NextResponse.json({ success: true, ...data })
    }

    const res = await fetch(`${LINKMIND_BASE}${AGENTS_PATH}`, {
      headers: { Authorization: request.headers.get('authorization') || '' },
    })
    const data = await res.json()
    return NextResponse.json({ success: true, agents: data.agents || data || [] })
  } catch (error) {
    log('error', String(error))
    return NextResponse.json({ success: false, error: String(error) }, { status: 502 })
  }
}

export async function POST(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const action = searchParams.get('action')
  const startTime = Date.now()

  try {
    if (action === 'execute') {
      const body = await request.json()
      log('info', `execute → ${body.agentId}, stream=${body.stream}`)

      const res = await fetch(`${LINKMIND_BASE}${AGENTS_PATH}/${body.agentId}/execute`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: request.headers.get('authorization') || '',
          'User-Agent': 'doubao-linkmind-agent-proxy',
        },
        body: JSON.stringify(body),
        signal: AbortSignal.timeout(120000),
      })

      const data = await res.json()
      return NextResponse.json({ success: true, ...data, durationMs: Date.now() - startTime })
    }

    if (action === 'register') {
      const body = await request.json()
      const res = await fetch(`${LINKMIND_BASE}${AGENTS_PATH}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: request.headers.get('authorization') || '',
        },
        body: JSON.stringify(body),
      })
      const data = await res.json()
      return NextResponse.json({ success: true, ...data })
    }

    if (action === 'sync') {
      const source = searchParams.get('source')
      const res = await fetch(`${LINKMIND_BASE}${AGENTS_PATH}/sync?${source ? `source=${source}` : ''}`, {
        method: 'POST',
        headers: { Authorization: request.headers.get('authorization') || '' },
      })
      const data = await res.json()
      return NextResponse.json({ success: true, ...data, durationMs: Date.now() - startTime })
    }

    return NextResponse.json({ success: false, error: 'Unknown action' }, { status: 400 })
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error)
    log('error', msg)
    return NextResponse.json({ success: false, error: msg }, { status: 502 })
  }
}
