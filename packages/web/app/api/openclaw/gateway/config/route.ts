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

export async function GET() {
  try {
    const r = await gw('GET', '/api/config')
    return NextResponse.json({ success: true, config: r.data }, { status: r.status })
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 })
  }
}

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json()
    const r = await gw('PUT', '/api/config', body)
    return NextResponse.json({ success: r.ok }, { status: r.status })
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 })
  }
}
