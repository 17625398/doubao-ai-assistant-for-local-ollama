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

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const [pendingR, allowedR] = await Promise.all([
      gw('GET', `/api/channels/${id}/pairings`),
      gw('GET', `/api/channels/${id}/peers`),
    ])
    return NextResponse.json({
      success: true,
      pending: pendingR.data?.pending || [],
      allowed: allowedR.data?.peers || allowedR.data || [],
    })
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 })
  }
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const body = await request.json()
    let r: Awaited<ReturnType<typeof gw>>

    if (body.action === 'approve') {
      r = await gw('POST', `/api/channels/${id}/pairings/approve`, {
        code: body.code,
        approver: body.approver,
      })
      return NextResponse.json({ success: r.ok, ...r.data })
    }
    if (body.action === 'reject') {
      r = await gw('POST', `/api/channels/${id}/pairings/reject`, { code: body.code })
      return NextResponse.json({ success: r.ok })
    }
    if (body.action === 'generate') {
      r = await gw('POST', `/api/channels/${id}/pairings/generate`, { peerId: body.peerId })
      return NextResponse.json({ success: r.ok, ...r.data })
    }

    return NextResponse.json({ success: false, error: 'Invalid action' }, { status: 400 })
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 })
  }
}
