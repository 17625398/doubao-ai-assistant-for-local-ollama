import { NextRequest, NextResponse } from 'next/server'

const LINKMIND_BASE = process.env.LINKMIND_BASE_URL || 'http://localhost:8080'
const MCP_PATH = '/mcp'

function log(level: string, msg: string) {
  console.log(`[${new Date().toISOString()}] [LinkMind/MCP] ${level.toUpperCase()}: ${msg}`)
}

async function proxyToMCP(request: NextRequest, method: string, path: string, customBody?: any) {
  const startTime = Date.now()
  try {
    let body: any = customBody
    const ct = request.headers.get('content-type') || ''
    if (!body && ct.includes('json')) body = await request.json()

    log('info', `${method} → ${path}`)

    const response = await fetch(`${LINKMIND_BASE}${MCP_PATH}${path}`, {
      method,
      headers: {
        ...(ct.includes('json') || body ? { 'Content-Type': 'application/json' } : {}),
        Authorization: request.headers.get('authorization') || '',
        'User-Agent': 'doubao-linkmind-mcp-proxy',
      },
      body: body ? JSON.stringify(body) : undefined,
    })

    if (!response.ok) {
      const errText = await response.text().catch(() => '')
      return NextResponse.json({ success: false, error: `Upstream ${response.status}: ${errText}` }, { status: response.status })
    }

    const data = await response.json()
    return NextResponse.json({ success: true, ...data, durationMs: Date.now() - startTime })
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error)
    log('error', msg)
    return NextResponse.json({ success: false, error: msg }, { status: 502 })
  }
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const serverId = searchParams.get('serverId')
  const action = searchParams.get('action')

  if (action === 'list-servers' || !serverId) {
    return proxyToMCP(request, 'GET', '/servers')
  }

  if (action === 'tools') {
    return proxyToMCP(request, 'GET', `/servers/${serverId}/tools`)
  }

  if (action === 'resources') {
    return proxyToMCP(request, 'GET', `/servers/${serverId}/resources`)
  }

  if (action === 'status') {
    return proxyToMCP(request, 'GET', `/servers/${serverId}/status`)
  }

  return proxyToMCP(request, 'GET', `/servers/${serverId}`)
}

export async function POST(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const serverId = searchParams.get('serverId')
  const action = searchParams.get('action')

  if (action === 'add-server') {
    return proxyToMCP(request, 'POST', '/servers')
  }

  if (action === 'call-tool' && serverId) {
    return proxyToMCP(request, 'POST', `/servers/${serverId}/tools/call`)
  }

  if (action === 'read-resource' && serverId) {
    return proxyToMCP(request, 'POST', `/servers/${serverId}/resources/read`)
  }

  if ((action === 'enable' || action === 'disable') && serverId) {
    return proxyToMCP(request, 'PATCH', `/servers/${serverId}`)
  }

  if (action === 'validate') {
    return proxyToMCP(request, 'POST', '/validate')
  }

  return proxyToMCP(request, 'POST', '')
}

export async function DELETE(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const serverId = searchParams.get('serverId')

  if (serverId) {
    return proxyToMCP(request, 'DELETE', `/servers/${serverId}`)
  }

  return NextResponse.json({ success: false, error: 'Missing serverId' }, { status: 400 })
}
