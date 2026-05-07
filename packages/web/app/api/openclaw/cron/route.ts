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
    const r = await gw('GET', '/api/cron')
    return NextResponse.json({ success: true, jobs: r.data.jobs || r.data || [] })
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const r = await gw('POST', '/api/cron', body)
    return NextResponse.json({ success: r.ok, job: r.data })
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const id = new URL(request.url).searchParams.get('id')
    if (!id) return NextResponse.json({ success: false, error: 'id is required' }, { status: 400 })
    const r = await gw('DELETE', `/api/cron/${id}`)
    return NextResponse.json({ success: r.ok }, { status: r.status })
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 })
  }
}
