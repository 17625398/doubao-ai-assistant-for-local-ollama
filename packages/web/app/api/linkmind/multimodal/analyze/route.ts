import { NextRequest, NextResponse } from 'next/server'

const LINKMIND_BASE = process.env.LINKMIND_BASE_URL || 'http://localhost:8080'
const REQUEST_TIMEOUT = parseInt(process.env.LINKMIND_REQUEST_TIMEOUT || '30000', 10)
const MAX_FILE_SIZE = 50 * 1024 * 1024 // 50MB

/**
 * 通用多模态文件内容分析 API
 * 
 * 支持的文件类型：
 * - 图片 (image/*) → 视觉理解/OCR
 * - PDF → 文档解析和内容提取
 * - 音频 (audio/*) → ASR 语音转文字
 * - 视频 (video/*) → 帧提取+描述
 * - 文档/代码/表格 → 内容读取和分析
 * 
 * 请求格式：
 * - multipart/form-data: 文件 + 可选的 prompt 字段
 * - application/json: { base64, mimeType, prompt? }
 */
export async function POST(request: NextRequest) {
  const startTime = Date.now()

  function classifyError(error: unknown): { code: string; message: string; status: number } {
    const msg = error instanceof Error ? error.message : String(error)
    if (msg.includes('ECONNREFUSED') || msg.includes('fetch failed')) {
      return { code: 'UPSTREAM_UNREACHABLE', message: `无法连接到 LinkMind 服务 (${LINKMIND_BASE})`, status: 502 }
    }
    if (msg.includes('abort') || msg.includes('AbortError')) {
      return { code: 'UPSTREAM_TIMEOUT', message: `请求超时 (> ${REQUEST_TIMEOUT / 1000}s)`, status: 504 }
    }
    return { code: 'INTERNAL_ERROR', message: msg, status: 500 }
  }

  try {
    const contentType = request.headers.get('content-type') || ''
    
    let fileData: { name: string; type: string; size: number; base64?: string; textContent?: string; buffer?: ArrayBuffer } | null = null
    let prompt = ''
    let mimeType = ''

    if (contentType.includes('multipart/form-data')) {
      // Form data 模式
      const formData = await request.formData()
      const file = formData.get('file') as File | null
      prompt = formData.get('prompt') as string || ''
      
      if (!file) {
        return NextResponse.json({ success: false, error: '缺少 file 字段', code: 'MISSING_FILE' }, { status: 400 })
      }

      if (file.size > MAX_FILE_SIZE) {
        return NextResponse.json(
          { success: false, error: `文件过大: ${(file.size / 1024 / 1024).toFixed(1)}MB > ${(MAX_FILE_SIZE / 1024 / 1024)}MB`, code: 'PAYLOAD_TOO_LARGE' },
          { status: 413 }
        )
      }

      mimeType = file.type || 'application/octet-stream'
      const ext = file.name.split('.').pop()?.toLowerCase() || ''

      // 根据文件类型决定处理方式
      const isImage = mimeType.startsWith('image/')
      const isAudio = mimeType.startsWith('audio/')
      const isPdf = mimeType === 'application/pdf'
      const isTextLike = ['.txt', '.md', '.json', '.xml', '.csv', '.yaml', '.yml', '.log',
        '.js', '.ts', '.py', '.java', '.c', '.cpp', '.go', '.rs', '.html', '.css'].includes(`.${ext}`)

      if (isTextLike) {
        // 文本文件：直接读取内容
        const text = await file.text()
        fileData = { name: file.name, type: mimeType, size: file.size, textContent: text }
      } else if (isImage || isPdf || isAudio) {
        // 二进制文件：转为 Base64
        const reader = new FileReader()
        const base64 = await new Promise<string>((resolve, reject) => {
          reader.onload = () => resolve(reader.result as string)
          reader.onerror = reject
          reader.readAsDataURL(file)
        })
        fileData = { name: file.name, type: mimeType, size: file.size, base64 }
      } else {
        // 其他二进制：保留 Buffer
        fileData = { name: file.name, type: mimeType, size: file.size, buffer: await file.arrayBuffer() }
      }

    } else if (contentType.includes('application/json')) {
      // JSON 模式：接收已编码的数据
      const body = await request.json()
      fileData = {
        name: body.filename || 'unknown.file',
        type: body.mimeType || 'application/octet-stream',
        size: body.size || 0,
        base64: body.base64,
        textContent: body.textContent,
      }
      prompt = body.prompt || ''
      mimeType = body.mimeType || ''

    } else {
      return NextResponse.json({ success: false, error: '不支持的 Content-Type，请使用 form-data 或 JSON' }, { status: 400 })
    }

    if (!fileData) {
      return NextResponse.json({ success: false, error: '文件数据为空', code: 'EMPTY_DATA' }, { status: 400 })
    }

    // 默认提示词（根据文件类型）
    if (!prompt && fileData.type) {
      const mainType = fileData.type.split('/')[0]
      switch (mainType) {
        case 'image':
          prompt = '请详细描述这张图片的内容，包括主要对象、文字、颜色和布局。如果是截图，请描述页面结构和关键信息。'
          break
        case 'audio':
          prompt = '请将这段音频转录为文字，并总结主要内容。'
          break
        case 'video':
          prompt = '请分析这个视频文件的元数据和可能的视觉内容。'
          break
        default:
          if (fileData.type === 'application/pdf') {
            prompt = '请分析这份PDF文档的内容结构，提取关键信息、章节标题和摘要。'
          } else if (fileData.textContent) {
            prompt = '请总结以下文档/代码的主要内容、关键点和结构。'
          } else {
            prompt = '请分析此文件的内容。'
          }
      }
    }

    // 构建发送给 LinkMind 的请求体
    let upstreamUrl = ''
    let requestBody: Record<string, unknown> = {}

    if (fileData.base64?.startsWith('data:')) {
      // 图片/PDF/音频等 Base64 数据 → 使用 vision/chat 接口
      upstreamUrl = `${LINKMIND_BASE}/v1/chat/completions`
      
      let contentParts: unknown[]
      
      if (fileData.type.startsWith('image/')) {
        contentParts = [
          { type: 'image_url', image_url: { url: fileData.base64 } },
          { type: 'text', text: prompt },
        ]
      } else if (fileData.type.startsWith('audio/')) {
        // 音频先走 ASR 路径
        upstreamUrl = `${LINKMIND_BASE}/audio/speech2text`
        const formData = new FormData()
        // 将 base64 转回 Blob
        const fetchResp = await fetch(fileData.base64)
        const blob = await fetchResp.blob()
        const audioFile = new File([blob], fileData.name, { type: fileData.type })
        formData.append('file', audioFile)
        
        // 发送到 ASR 端点
        const controller = new AbortController()
        const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT)
        
        try {
          const response = await fetch(upstreamUrl, {
            method: 'POST',
            body: formData,
            signal: controller.signal,
            headers: { 'User-Agent': 'doubao-multimodal-analyze-proxy' },
          })
          
          clearTimeout(timeoutId)
          
          if (!response.ok) {
            const errText = await response.text().catch(() => '')
            return NextResponse.json({ success: false, error: `ASR 错误: ${response.status} ${errText}`, code: 'ASR_ERROR' }, { status: response.status })
          }

          const asrResult = await response.json()
          const transcript = asrResult.text || asrResult.transcript || asrResult.result || ''

          // 如果有额外提示，将转录结果与提示一起发给 chat
          if (prompt && !prompt.includes('转录') && !prompt.includes('转文字')) {
            const followUpUrl = `${LINKMIND_BASE}/v1/chat/completions`
            const chatBody = {
              model: 'qwen-plus',
              messages: [
                { role: 'system', content: '你是一个专业的音频内容分析师。' },
                { role: 'user', content: `音频转录结果:\n${transcript}\n\n用户指令:\n${prompt}` },
              ],
              max_tokens: 2000,
            }

            const chatResponse = await fetch(followUpUrl, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'User-Agent': 'doubao-multimodal-analyze-proxy',
              },
              body: JSON.stringify(chatBody),
            })

            if (chatResponse.ok) {
              const chatResult = await chatResponse.json()
              return NextResponse.json({
                success: true,
                result: chatResult.choices?.[0]?.message?.content || chatResult.text || '',
                transcript,
                durationMs: Date.now() - startTime,
              })
            }
          }

          return NextResponse.json({
            success: true,
            transcript,
            durationMs: Date.now() - startTime,
          })

        } catch (fetchErr) {
          clearTimeout(timeoutId)
          const classified = classifyError(fetchErr)
          console.error('[LinkMind/Analyze] ASR Error:', classified.message)
          return NextResponse.json({ success: false, error: classified.message, code: classified.code }, { status: classified.status })
        }

        // ASR 分支结束，不需要继续执行下面的通用逻辑
        return undefined as never
      } else if (fileData.type === 'application/pdf') {
        // PDF 作为图片 URL 发送
        contentParts = [
          { type: 'image_url', image_url: { url: fileData.base64 } },
          { type: 'text', text: prompt },
        ]
      } else {
        contentParts = [{ type: 'text', text: `${prompt}\n\n(附件: ${fileData.name}, 类型: ${fileData.type})` }]
      }

      requestBody = {
        model: 'qwen-plus',
        messages: [{ role: 'user', content: contentParts }],
        max_tokens: 4000,
      }

    } else if (fileData.textContent) {
      // 纯文本文件 → 直接作为文本消息发送
      upstreamUrl = `${LINKMIND_BASE}/v1/chat/completions`
      const truncatedContent = fileData.textContent.length > 50000 
        ? fileData.textContent.slice(0, 50000) + '\n...(内容过长，已截断)...'
        : fileData.textContent

      requestBody = {
        model: 'qwen-plus',
        messages: [
          { role: 'system', content: '你是一个专业的文档和代码分析助手。用户会发送文件内容给你，请根据用户的指令进行分析、总结或处理。如果内容是代码，可以帮忙解释逻辑、发现潜在问题或提出改进建议。' },
          { role: 'user', content: `${prompt}\n\n--- 文件: ${fileData.name} (${formatSize(fileData.size)}) ---\n\n${truncatedContent}` },
        ],
        max_tokens: 4000,
      }
    } else {
      // 其他未知类型
      upstreamUrl = `${LINKMIND_BASE}/v1/chat/completions`
      requestBody = {
        model: 'qwen-plus',
        messages: [{ role: 'user', content: `${prompt}\n\n(收到文件: ${fileData.name}, 类型: ${fileData.type}, 大小: ${fileData.size} bytes)` }],
        max_tokens: 1000,
      }
    }

    // 如果是 ASR 分支，已经返回了
    if ((upstreamUrl as string) === '') return undefined as never

    console.log(`[LinkMind/Analyze] POST → ${upstreamUrl.split('/').slice(-2).join('/')}, type=${mimeType}, size=${fileData.size}`)

    // 发送通用请求
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT)

    let response: Response
    try {
      response = await fetch(upstreamUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: request.headers.get('authorization') || '',
          'User-Agent': 'doubao-multimodal-analyze-proxy',
        },
        signal: controller.signal,
        body: JSON.stringify(requestBody),
      })
    } catch (fetchErr) {
      clearTimeout(timeoutId)
      const classified = classifyError(fetchErr)
      console.error('[LinkMind/Analyze]', classified.code, classified.message)
      return NextResponse.json({ success: false, error: classified.message, code: classified.code }, { status: classified.status })
    }
    clearTimeout(timeoutId)

    if (!response.ok) {
      const errText = await response.text().catch(() => '')
      console.error(`[LinkMind/Analyze] Upstream ${response.status}:`, errText)
      return NextResponse.json(
        { success: false, error: `上游错误 ${response.status}: ${errText.slice(0, 500)}`, code: 'UPSTREAM_ERROR' },
        { status: response.status }
      )
    }

    const data = await response.json()
    const durationMs = Date.now() - startTime
    console.log(`[LinkMind/Analyze] Success in ${durationMs}ms`)

    return NextResponse.json({
      success: true,
      result: data.choices?.[0]?.message?.content || data.text || data.result || '',
      usage: data.usage,
      durationMs,
      fileName: fileData.name,
      fileType: fileData.type,
    })

  } catch (error) {
    const classified = classifyError(error)
    console.error('[LinkMind/Analyze]', classified.code, classified.message)
    return NextResponse.json(
      { success: false, error: classified.message, code: classified.code },
      { status: classified.status }
    )
  }
}

/** 辅助函数：格式化文件大小 */
function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`
}
