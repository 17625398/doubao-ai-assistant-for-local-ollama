import { NextResponse } from 'next/server'

export async function GET(request: Request, { params }: { params: Promise<{ path: string[] }> }) {
  const resolvedParams = await params
  const path = resolvedParams.path.join('/')

  const searchParams = new URL(request.url).searchParams
  const ollamaBaseUrl =
    searchParams.get('endpoint') || process.env.OLLAMA_BASE_URL || 'http://192.168.0.32:11434'

  const url = `${ollamaBaseUrl}/${path}`

  console.log(`[Ollama Proxy GET] ${url}`)

  try {
    const response = await fetch(url)

    if (!response.ok) {
      const errorBody = await response.text().catch(() => '')
      console.error(`[Ollama Proxy GET Error] Ollama returned ${response.status}: ${errorBody}`)
      return NextResponse.json(
        { error: `Ollama server error`, detail: errorBody },
        { status: response.status }
      )
    }

    let data
    try {
      data = await response.json()
    } catch (parseError) {
      console.error('[Ollama Proxy GET Error] Failed to parse JSON:', parseError)
      const textBody = await response.text().catch(() => '')
      return NextResponse.json(
        { error: 'Failed to parse Ollama response', raw: textBody },
        { status: 500 }
      )
    }

    return NextResponse.json(data)
  } catch (error) {
    console.error('[Ollama Proxy GET Error]', error)
    const message = error instanceof Error ? error.message : 'Unknown error'
    return NextResponse.json({ error: `Failed to fetch from Ollama: ${message}` }, { status: 500 })
  }
}

export async function POST(request: Request, { params }: { params: Promise<{ path: string[] }> }) {
  const resolvedParams = await params
  const path = resolvedParams.path.join('/')

  const searchParams = new URL(request.url).searchParams
  const ollamaBaseUrl =
    searchParams.get('endpoint') || process.env.OLLAMA_BASE_URL || 'http://192.168.0.32:11434'

  const url = `${ollamaBaseUrl}/${path}`

  console.log(`[Ollama Proxy POST] ${url}`)

  let body
  try {
    body = await request.json()
  } catch (parseError) {
    console.error('[Ollama Proxy POST Error] Failed to parse request body:', parseError)
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })
  }

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    })

    if (!response.ok) {
      const errorBody = await response.text().catch(() => '')
      console.error(`[Ollama Proxy POST Error] Ollama returned ${response.status}: ${errorBody}`)
      return NextResponse.json(
        { error: `Ollama server error`, detail: errorBody },
        { status: response.status }
      )
    }

    if (response.headers.get('Content-Type') === 'application/x-ndjson') {
      const reader = response.body?.getReader()
      if (!reader) {
        return NextResponse.json({ error: 'No response body' }, { status: 500 })
      }

      const stream = new ReadableStream({
        async start(controller) {
          try {
            while (true) {
              const { done, value } = await reader.read()
              if (done) break
              controller.enqueue(value)
            }
            controller.close()
          } catch (error) {
            controller.error(error)
          }
        },
      })

      return new Response(stream, {
        headers: {
          'Content-Type': 'application/x-ndjson',
        },
      })
    }

    let data
    try {
      data = await response.json()
    } catch (parseError) {
      console.error('[Ollama Proxy POST Error] Failed to parse JSON:', parseError)
      const textBody = await response.text().catch(() => '')
      return NextResponse.json(
        { error: 'Failed to parse Ollama response', raw: textBody },
        { status: 500 }
      )
    }

    return NextResponse.json(data)
  } catch (error) {
    console.error('[Ollama Proxy POST Error]', error)
    const message = error instanceof Error ? error.message : 'Unknown error'
    return NextResponse.json({ error: `Failed to fetch from Ollama: ${message}` }, { status: 500 })
  }
}
