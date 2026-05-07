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

export async function GET(request: NextRequest) {
  try {
    const query = new URL(request.url).searchParams.toString()
    const r = await gw('GET', `/api/skills${query ? '?' + query : ''}`)
    return NextResponse.json({ success: true, skills: r.data.skills || r.data || [] })
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 })
  }
}
