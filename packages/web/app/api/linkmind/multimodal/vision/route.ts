import { NextRequest, NextResponse } from 'next/server'

const LINKMIND_BASE = process.env.LINKMIND_BASE_URL || 'http://localhost:8080'
const MAX_IMAGE_SIZE = 20 * 1024 * 1024

export async function POST(request: NextRequest) {
  const startTime = Date.now()

  try {
    const contentType = request.headers.get('content-type') || ''

    let body: Record<string, any>

    if (contentType.includes('multipart/form-data')) {
      const formData = await request.formData()
      const file = formData.get('image') as File | null
      if (file && file.size > MAX_IMAGE_SIZE) {
        return NextResponse.json(
          { success: false, error: `Image too large: ${(file.size / 1024 / 1024).toFixed(1)}MB > 20MB limit` },
          { status: 413 }
        )
      }

      if (file) {
        const reader = new FileReader()
        const dataUrl = await new Promise<string>((resolve, reject) => {
          reader.onload = () => resolve(reader.result as string)
          reader.onerror = reject
          reader.readAsDataURL(file)
        })
        body = {
          model: formData.get('model') || 'gpt-4o-mini',
          messages: [
            {
              role: 'user',
              content: [
                { type: 'image_url', image_url: { url: dataUrl } },
                { type: 'text', text: formData.get('prompt') || '请详细描述这张图片的内容' },
              ],
            },
          ],
          max_tokens: parseInt(formData.get('max_tokens') as string) || 1000,
        }
      } else {
        body = await request.json()
      }
    } else {
      body = await request.json()
    }

    console.log(`[LinkMind/Vision] POST → ${Date.now() - startTime}ms`)

    const response = await fetch(`${LINKMIND_BASE}/v1/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: request.headers.get('authorization') || '',
        'User-Agent': 'doubao-linkmind-vision-proxy',
      },
      body: JSON.stringify(body),
    })

    if (!response.ok) {
      const errText = await response.text().catch(() => '')
      console.error(`[LinkMind/Vision] Upstream error: ${response.status} ${errText}`)
      return NextResponse.json({ success: false, error: `Upstream ${response.status}: ${errText}` }, { status: response.status })
    }

    const data = await response.json()
    const text = data.choices?.[0]?.message?.content || data.text || ''
    return NextResponse.json({
      success: true,
      text,
      raw: data,
      durationMs: Date.now() - startTime,
    })
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error)
    console.error(`[LinkMind/Vision] Error: ${msg}`)
    return NextResponse.json({ success: false, error: msg }, { status: 502 })
  }
}
