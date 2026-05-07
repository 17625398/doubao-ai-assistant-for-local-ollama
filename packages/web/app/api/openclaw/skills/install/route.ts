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

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    if (!body.idOrUrl)
      return NextResponse.json({ success: false, error: 'idOrUrl is required' }, { status: 400 })
    const r = await gw('POST', '/api/skills/install', body)
    return NextResponse.json({ success: r.ok, skill: r.data })
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 })
  }
}
