// PDF 文档解析器 - 使用 pdfjs-dist 高效提取文本
//
// 策略：
// 1. 使用 pdfjs-dist 直接提取文本内容（高效，适合 AI 分析）
// 2. 对于扫描件 PDF，使用 LinkMind 服务进行 OCR
// 3. 保留简单字节扫描作为备用方法

import { BaseDocumentParser } from './base-document-parser'
import {
  DocumentType,
  DocumentParseResult,
  ParseOptions,
  ContentType,
  DocumentContent,
  DocumentMetadata,
} from '../types/document'
import { logger } from '../utils/logger'
import { createPdfLoadOptions, ensurePdfJsRuntime } from '../utils/pdfjs-runtime'
import { linkMindService } from '../services/linkmind-service'
import { pdfProcessingPolicyService } from '../services/pdf-processing-policy-service'
import { featureCapabilityService } from '../services/feature-capability-service'

/**
 * PDF 文档解析器
 */
export class PDFDocumentParser extends BaseDocumentParser {
  supportedTypes = [DocumentType.PDF]

  private isHttpEndpointBlockedByCsp(endpoint: string): boolean {
    if (typeof window === 'undefined') return false
    if (window.location.protocol !== 'https:') return false
    return endpoint.startsWith('http://')
  }

  async parse(
    file: File | ArrayBuffer | string,
    options?: ParseOptions
  ): Promise<DocumentParseResult> {
    const startTime = Date.now()
    let buffer: ArrayBuffer
    const pdfPolicy = pdfProcessingPolicyService.resolvePolicy(options)

    try {
      console.log('[PDFDocumentParser.parse] Starting PDF document parsing')

      // 获取 ArrayBuffer
      if (file instanceof File) {
        console.log(
          '[PDFDocumentParser.parse] Processing File object:',
          file.name,
          file.size,
          file.type
        )
        buffer = await file.arrayBuffer()
        console.log(
          '[PDFDocumentParser.parse] File converted to ArrayBuffer, size:',
          buffer.byteLength
        )
      } else if (typeof file === 'string') {
        throw new Error('File path not supported in browser environment')
      } else {
        buffer = file
        console.log(
          '[PDFDocumentParser.parse] Using ArrayBuffer directly, size:',
          buffer.byteLength
        )
      }

      // 验证 buffer 有效性
      if (!buffer || buffer.byteLength === 0) {
        throw new Error('Invalid PDF data: empty or null buffer')
      }

      const tryTextExtraction = async (): Promise<DocumentParseResult | null> => {
        // 【核心方法】使用 pdfjs-dist 提取文本
        let textResult: { success: boolean; text?: string } = { success: false }
        try {
          textResult = await this.extractTextWithPdfjs(buffer)
        } catch (error) {
          console.warn('[PDFDocumentParser.parse] PDF.js extraction failed:', error)
        }

        if (textResult.success && textResult.text && textResult.text.trim().length > 0) {
          const metadata = await this.parseMetadata(file)
          const content: DocumentContent[] = [{ type: ContentType.TEXT, text: textResult.text }]
          return {
            ...(await this.createParseResult(metadata, content, options)),
            parseTime: Date.now() - startTime,
          }
        }

        // 文本提取失败，尝试简单字节扫描
        let simpleResult: { success: boolean; text?: string } = { success: false }
        try {
          simpleResult = this.extractTextSimple(buffer)
        } catch (error) {
          console.warn('[PDFDocumentParser.parse] Simple scan failed:', error)
        }

        if (simpleResult.success && simpleResult.text && !this.isGibberish(simpleResult.text)) {
          const metadata = await this.parseMetadata(file)
          const content: DocumentContent[] = [{ type: ContentType.TEXT, text: simpleResult.text }]
          return {
            ...(await this.createParseResult(metadata, content, options)),
            parseTime: Date.now() - startTime,
          }
        }

        return null
      }

      const tryOcrExtraction = async (): Promise<DocumentParseResult | null> => {
        if (pdfPolicy.mode === 'disabled') return null

        const linkMindBaseUrl = linkMindService.getConfig().baseUrl
        const ollamaBaseUrl =
          process.env.OLLAMA_BASE_URL ||
          (typeof window !== 'undefined' ? '/api/ollama' : 'http://localhost:11434')
        if (
          this.isHttpEndpointBlockedByCsp(linkMindBaseUrl) &&
          this.isHttpEndpointBlockedByCsp(ollamaBaseUrl)
        ) {
          logger.warn(
            '[PDFDocumentParser.parse] Skip OCR due to CSP: HTTPS page cannot connect to HTTP OCR endpoints'
          )
          return null
        }

        const withTimeout = async <T>(factory: () => Promise<T>): Promise<T> => {
          const controller = new AbortController()
          const timer = setTimeout(() => controller.abort(), pdfPolicy.timeoutMs)
          try {
            // controller 仅用于超时计时，不强制注入到所有子调用，避免大改签名
            return await Promise.race([
              factory(),
              new Promise<T>((_, reject) => {
                controller.signal.addEventListener('abort', () => reject(new Error('OCR timeout')))
              }),
            ])
          } finally {
            clearTimeout(timer)
          }
        }

        for (let attempt = 0; attempt <= pdfPolicy.maxRetries; attempt++) {
          if (featureCapabilityService.isEnabled('enableLinkMindOcr')) {
            try {
              const linkMindResult = await withTimeout(() => this.useLinkMindService(file, options))
              if (linkMindResult.success && linkMindResult.text?.trim()) return linkMindResult
            } catch (error) {
              console.warn('[PDFDocumentParser.parse] LinkMind OCR attempt failed:', error)
            }
          }
          try {
            const ollamaResult = await withTimeout(() => this.useOllamaOpenAIOCR(buffer, options))
            if (ollamaResult.success && ollamaResult.text?.trim()) return ollamaResult
          } catch (error) {
            console.warn('[PDFDocumentParser.parse] Ollama OCR attempt failed:', error)
          }

          try {
            const fileName = file instanceof File ? file.name : 'unknown.pdf'
            const imageOcrResult = await withTimeout(() =>
              this.convertPdfToImagesAndOcr(buffer, options, fileName)
            )
            if (imageOcrResult.success && imageOcrResult.text?.trim()) return imageOcrResult
          } catch (error) {
            console.warn('[PDFDocumentParser.parse] Image OCR attempt failed:', error)
          }
        }

        return null
      }

      if (pdfPolicy.mode === 'ocrFirst') {
        const ocrResult = await tryOcrExtraction()
        if (ocrResult) {
          return {
            ...ocrResult,
            parseTime: Date.now() - startTime,
          }
        }
      }

      const textParseResult = await tryTextExtraction()
      if (textParseResult) return textParseResult

      if (pdfPolicy.mode !== 'disabled') {
        const ocrResult = await tryOcrExtraction()
        if (ocrResult) {
          return {
            ...ocrResult,
            parseTime: Date.now() - startTime,
          }
        }
      }

      const metadata = await this.parseMetadata(file)

      // 尝试提取文件名作为内容提示
      let fileName = 'unknown.pdf'
      if (file instanceof File) {
        fileName = file.name
      }

      // 创建一个结果，提示将处理此 PDF
      const fallbackContent = `【PDF 文档: ${fileName}】

此 PDF 文档已上传。

文档元数据：
- 文件名: ${fileName}
- 页数: ${metadata.pageCount || '未知'}
- 文件大小: ${metadata.size ? (metadata.size / 1024 / 1024).toFixed(2) + ' MB' : '未知'}

您可以直接与 AI 对话，询问关于此文档的内容。`

      console.log('[PDFDocumentParser.parse] Returning fallback result')

      return {
        metadata,
        content: [
          {
            type: ContentType.TEXT,
            text: fallbackContent,
          },
        ],
        text: fallbackContent,
        parseTime: Date.now() - startTime,
        success: true, // 标记为成功，使用 fallback 内容
      }
    } catch (error) {
      console.error('[PDFDocumentParser.parse] Failed to parse PDF document:', error)
      logger.error('Failed to parse PDF document:', error)

      const metadata = await this.parseMetadata(file)
      const errorMsg = error instanceof Error ? error.message : 'unknown error'
      
      // 即使出错，也返回一个包含错误信息的成功结果，确保用户体验
      let fileName = 'unknown.pdf'
      if (file instanceof File) {
        fileName = file.name
      }

      const errorContent = `【PDF 文档: ${fileName}】

处理 PDF 文档时遇到问题：${errorMsg}

文档元数据：
- 文件名: ${fileName}
- 文件大小: ${metadata.size ? (metadata.size / 1024 / 1024).toFixed(2) + ' MB' : '未知'}

建议：
- 检查 PDF 文件是否损坏
- 尝试使用其他 PDF 阅读器打开文件
- 如果问题持续存在，请联系技术支持`

      return {
        metadata,
        content: [
          {
            type: ContentType.TEXT,
            text: errorContent,
          },
        ],
        text: errorContent,
        parseTime: Date.now() - startTime,
        success: true, // 标记为成功，但内容包含错误提示
      }
    }
  }

  /**
   * 使用 pdfjs-dist 提取文本
   */
  private async extractTextWithPdfjs(
    buffer: ArrayBuffer
  ): Promise<{ success: boolean; text?: string }> {
    try {
      console.log('[extractTextWithPdfjs] Starting text extraction with pdfjs-dist')

      // 创建 buffer 副本避免 detached 问题
      const bufferCopy = buffer.slice(0)

      const pdfjs = await ensurePdfJsRuntime({
        allowCdnFallback: true,
      })

      if (!pdfjs || !pdfjs.getDocument) {
        console.warn('[extractTextWithPdfjs] pdfjs-dist not available')
        return { success: false }
      }

      console.log('[extractTextWithPdfjs] Loading PDF document...')
      const loadingTask = pdfjs.getDocument(createPdfLoadOptions(bufferCopy))
      const pdfDocument = await loadingTask.promise
      console.log('[extractTextWithPdfjs] PDF loaded, pages:', pdfDocument.numPages)

      const textParts: string[] = []
      const maxPages = Math.min(pdfDocument.numPages, 100) // 限制最大页数

      for (let i = 1; i <= maxPages; i++) {
        try {
          const page = await pdfDocument.getPage(i)
          const textContent = await page.getTextContent()

          // 使用更准确的方法提取文本，保留段落结构
          const pageText = textContent.items
            .map((item: any) => {
              // pdfjs 返回的文本项
              // item.str: 文本内容
              // item.hasEOL: 是否行尾
              if (item.hasEOL) {
                return item.str + '\n'
              }
              return item.str
            })
            .join('')

          // 不过滤空行，保留原始格式
          if (pageText.trim()) {
            textParts.push(pageText)
          }
        } catch (pageError) {
          console.warn(`[extractTextWithPdfjs] Failed to extract text from page ${i}:`, pageError)
        }
      }

      await pdfDocument.destroy?.()

      const fullText = textParts.join('\n\n')
      console.log('[extractTextWithPdfjs] Text extraction completed, length:', fullText.length)

      // 检测是否为乱码
      if (this.isGibberish(fullText)) {
        console.warn('[extractTextWithPdfjs] Detected gibberish text, will try OCR')
        return { success: false }
      }

      return { success: fullText.trim().length > 0, text: fullText }
    } catch (error) {
      console.warn('[extractTextWithPdfjs] Text extraction failed:', error)
      return { success: false }
    }
  }

  /**
   * 检测文本是否为乱码
   */
  private isGibberish(text: string): boolean {
    if (!text || text.length < 10) return false

    // 计算非 ASCII 字符的比例
    const nonAsciiChars = text.replace(/[\x00-\x7F]/g, '').length
    const nonAsciiRatio = nonAsciiChars / text.length

    // 计算不可打印字符的比例
    const unprintableChars = text.replace(/[\x20-\x7E\n\r\t]/g, '').length
    const unprintableRatio = unprintableChars / text.length

    // 计算重复字符的比例
    const uniqueChars = new Set(text).size
    const repetitionRatio = 1 - uniqueChars / text.length

    // 检测是否包含大量乱码特征字符
    const gibberishChars = /[\x00-\x1F\x7F-\xFF\p{Unassigned}]/gu
    const gibberishMatch = text.match(gibberishChars)
    const gibberishRatio = gibberishMatch ? gibberishMatch.length / text.length : 0

    // 检测是否包含有意义的中文或英文单词
    const hasMeaningfulContent = /[\u4e00-\u9fff]|\b[a-zA-Z]{3,}\b/.test(text)

    // 检测是否包含连续的乱码模式
    const hasGibberishPattern = /[\x00-\x1F\x7F-\xFF]{3,}/.test(text)

    // 检测是否包含大量特殊字符
    const specialChars = text.replace(/[\w\s\u4e00-\u9fff]/g, '').length
    const specialCharRatio = specialChars / text.length

    console.log('[isGibberish] Analysis:', {
      nonAsciiRatio,
      unprintableRatio,
      repetitionRatio,
      gibberishRatio,
      specialCharRatio,
      hasMeaningfulContent,
      hasGibberishPattern,
    })

    // 如果满足以下条件之一，认为是乱码
    return (
      unprintableRatio > 0.2 || // 超过20%的不可打印字符
      gibberishRatio > 0.3 || // 超过30%的乱码特征字符
      specialCharRatio > 0.5 || // 超过50%的特殊字符
      repetitionRatio > 0.9 || // 超过90%的重复率
      (repetitionRatio > 0.8 && !hasMeaningfulContent) || // 高重复率且无意义内容
      (!hasMeaningfulContent && nonAsciiRatio > 0.8) || // 无意义内容且大部分是非ASCII字符
      hasGibberishPattern // 包含连续的乱码模式
    )
  }

  /**
   * 简单的字节扫描文本提取（备用方法，用于扫描件 PDF）
   */
  private extractTextSimple(buffer: ArrayBuffer): { success: boolean; text?: string } {
    try {
      console.log('[extractTextSimple] Using simple byte scan for text extraction')

      const uint8Array = new Uint8Array(buffer)
      const results: string[] = []
      let currentLine: string[] = []
      let inTextObject = false

      // PDF 文本对象通常以 BT (Begin Text) 和 ET (End Text) 标记
      for (let i = 0; i < uint8Array.length - 1; i++) {
        const byte = uint8Array[i]
        const nextByte = uint8Array[i + 1]

        // 检测 BT (Begin Text) - 0x42 = 'B', 0x54 = 'T'
        if (byte === 0x42 && nextByte === 0x54) {
          inTextObject = true
          currentLine = []
          i++ // 跳过下一个字节
          continue
        }

        // 检测 ET (End Text) - 0x45 = 'E', 0x54 = 'T'
        if (byte === 0x45 && nextByte === 0x54) {
          if (currentLine.length > 0) {
            results.push(currentLine.join('').trim())
            currentLine = []
          }
          inTextObject = false
          i++
          continue
        }

        // 在文本对象中提取可打印字符
        if (inTextObject) {
          // 可打印 ASCII 字符 (32-126)
          if (byte >= 32 && byte <= 126) {
            currentLine.push(String.fromCharCode(byte))
          }
          // 中文字符范围 (UTF-8 多字节)
          else if (byte >= 0x80) {
            const char = this.tryDecodeUtf8(uint8Array, i)
            if (char) {
              currentLine.push(char.char)
              i += char.bytes - 1
              continue
            }
          }
          // 换行符
          else if (byte === 0x0a || byte === 0x0d) {
            if (currentLine.length > 0) {
              results.push(currentLine.join('').trim())
              currentLine = []
            }
          }
        }
      }

      const text = results
        .filter(line => line.length > 5) // 过滤太短的行
        .join('\n')
        .replace(/\n{3,}/g, '\n\n') // 减少多余空行
        .trim()

      console.log('[extractTextSimple] Simple extraction completed, length:', text.length)
      return { success: text.length > 100, text }
    } catch (error) {
      console.warn('[extractTextSimple] Simple extraction failed:', error)
      return { success: false }
    }
  }

  /**
   * 尝试解码 UTF-8 字符
   */
  private tryDecodeUtf8(bytes: Uint8Array, start: number): { char: string; bytes: number } | null {
    if (start >= bytes.length) return null

    const b0 = bytes[start]

    // 3 字节 UTF-8 (中文常见范围)
    if ((b0 & 0xf0) === 0xe0 && start + 2 < bytes.length) {
      const b1 = bytes[start + 1]
      const b2 = bytes[start + 2]
      if ((b1 & 0xc0) === 0x80 && (b2 & 0xc0) === 0x80) {
        const charCode = ((b0 & 0x0f) << 12) | ((b1 & 0x3f) << 6) | (b2 & 0x3f)
        // 验证是有效的中文范围 (CJK Unified Ideographs)
        if (charCode >= 0x4e00 && charCode <= 0x9fff) {
          return { char: String.fromCharCode(charCode), bytes: 3 }
        }
      }
    }

    // 2 字节 UTF-8
    if ((b0 & 0xe0) === 0xc0 && start + 1 < bytes.length) {
      const b1 = bytes[start + 1]
      if ((b1 & 0xc0) === 0x80) {
        const charCode = ((b0 & 0x1f) << 6) | (b1 & 0x3f)
        if (charCode > 127) {
          return { char: String.fromCharCode(charCode), bytes: 2 }
        }
      }
    }

    return null
  }

  /**
   * 执行 OCR 识别
   */
  async performOCR(image: File | ArrayBuffer | string, language: string = 'eng'): Promise<string> {
    try {
      console.log('[performOCR] Starting OCR with LinkMind, language:', language)

      let fileToProcess: File | Blob

      if (image instanceof File) {
        fileToProcess = image
      } else if (image instanceof ArrayBuffer) {
        // 转换 ArrayBuffer 为 Blob
        fileToProcess = new Blob([image], { type: 'application/pdf' })
      } else {
        throw new Error('File path not supported in browser environment')
      }

      // 使用 LinkMind 服务提取文档内容（包含 OCR）
      const extractResponse = await linkMindService.extractDocument({
        file: fileToProcess,
        extractText: true,
      })

      if (extractResponse.success && extractResponse.text) {
        console.log('[performOCR] OCR completed successfully')
        return extractResponse.text
      }

      console.warn('[performOCR] OCR returned no text')
      return ''
    } catch (error) {
      console.error('[performOCR] OCR failed:', error)
      return ''
    }
  }

  /**
   * 使用 LinkMind 服务处理 PDF 文件
   */
  private async useLinkMindService(
    file: File | ArrayBuffer | string,
    options?: ParseOptions
  ): Promise<DocumentParseResult> {
    try {
      console.log('[useLinkMindService] Starting PDF processing with LinkMind')

      let fileToProcess: File | Blob

      if (file instanceof File) {
        fileToProcess = file
        console.log('[useLinkMindService] Processing File object:', file.name, file.size, file.type)
      } else if (file instanceof ArrayBuffer) {
        // 转换 ArrayBuffer 为 Blob
        fileToProcess = new Blob([file], { type: 'application/pdf' })
        console.log('[useLinkMindService] Processing ArrayBuffer, size:', file.byteLength)
      } else {
        throw new Error('File path not supported in browser environment')
      }

      // 尝试使用 LinkMind 服务的文档提取功能
      console.log('[useLinkMindService] Attempting document extraction')
      try {
        const extractResponse = await linkMindService.extractDocument({
          file: fileToProcess,
          extractText: true,
        })

        console.log('[useLinkMindService] Document extraction response:', extractResponse)

        if (extractResponse.success && extractResponse.text) {
          console.log(
            '[useLinkMindService] LinkMind service returned text, length:',
            extractResponse.text.length
          )

          // 检测返回的文本是否为乱码
          if (!this.isGibberish(extractResponse.text)) {
            console.log('[useLinkMindService] Text is valid, using extracted text')
            const metadata = await this.parseMetadata(file)
            const content: DocumentContent[] = [
              {
                type: ContentType.TEXT,
                text: extractResponse.text,
              },
            ]

            return {
              ...(await this.createParseResult(metadata, content, options)),
              parseTime: Date.now() - performance.now(),
            }
          } else {
            console.warn(
              '[useLinkMindService] Detected gibberish text from document extraction, trying OCR'
            )
          }
        } else {
          console.warn(
            '[useLinkMindService] Document extraction returned no text, trying OCR:',
            extractResponse.error
          )
        }
      } catch (extractError) {
        console.error('[useLinkMindService] Document extraction request failed:', extractError)
      }

      console.warn('[useLinkMindService] All LinkMind methods failed')
      return {
        metadata: await this.parseMetadata(file),
        content: [],
        text: '',
        parseTime: 0,
        success: false,
        error:
          'LinkMind OCR 服务无法识别 PDF 内容。\n\n可能的原因和解决方案：\n1. LinkMind 服务器未启动或不可用\n2. OCR 模型配置错误或未正确加载\n3. PDF 是扫描件或图片格式，需要云端 OCR 服务\n4. PDF 文件损坏或格式特殊\n\n建议：\n- 检查 LinkMind 服务器是否正常运行\n- 配置有效的云端 OCR 服务（如 Qwen API）\n- 尝试使用其他工具将 PDF 转换为文本格式',
      }
    } catch (error) {
      console.error('[useLinkMindService] LinkMind service failed:', error)
      const errorMessage = error instanceof Error ? error.message : 'unknown error'
      let suggestion = ''

      if (errorMessage.includes('Failed to recognize PDF')) {
        suggestion =
          '\n\nLinkMind OCR 服务无法识别 PDF。可能的原因：\n1. LinkMind 服务器的 OCR 模型配置不正确\n2. Ollama 后端的视觉模型不支持 OCR 任务\n3. PDF 内容为空或已加密\n\n建议：\n- 检查 LinkMind 配置中的 OCR 后端设置\n- 确认使用的模型是否支持视觉/OCR 功能\n- 考虑使用云端 OCR 服务（如 Qwen API）'
      } else if (errorMessage.includes('fetch') || errorMessage.includes('network')) {
        suggestion =
          '\n\n无法连接到 LinkMind 服务器。\n\n建议：\n- 确认 LinkMind 服务器已启动\n- 检查网络连接是否正常'
      }

      return {
        metadata: await this.parseMetadata(file),
        content: [],
        text: '',
        parseTime: 0,
        success: false,
        error: `LinkMind 服务处理失败: ${errorMessage}${suggestion}`,
      }
    }
  }

  /**
   * 使用 Ollama OpenAI 兼容 API 进行 OCR
   * 当 LinkMind OCR 失败时作为备选方案
   */
  private async useOllamaOpenAIOCR(
    file: File | ArrayBuffer,
    options?: ParseOptions
  ): Promise<DocumentParseResult> {
    const startTime = Date.now()
    try {
      console.log('[useOllamaOpenAIOCR] Starting OCR with Ollama OpenAI API...')

      // 检查文件类型 - Ollama OCR 只支持图片格式，不支持 PDF
      let fileMimeType = 'application/pdf'
      if (file instanceof File) {
        fileMimeType = file.type
      }

      // 如果是 PDF，Ollama 无法直接处理，需要使用 convertPdfToImagesAndOcr 来转换
      if (fileMimeType === 'application/pdf') {
        console.log('[useOllamaOpenAIOCR] Skipping - input is PDF, use convertPdfToImagesAndOcr instead')
        return {
          metadata: await this.parseMetadata(file),
          content: [],
          text: '',
          parseTime: 0,
          success: false,
          error: 'Ollama OCR 不支持直接处理 PDF 文件。请使用 convertPdfToImagesAndOcr 将 PDF 页面转换为图片后再进行 OCR。',
        }
      }

      // 将图片文件转换为 base64
      let base64Image: string
      if (file instanceof File) {
        base64Image = await this.convertToBase64(file)
      } else {
        // 如果是 ArrayBuffer，创建 Blob 然后转换
        const blob = new Blob([file], { type: fileMimeType })
        base64Image = await this.convertToBase64(blob)
      }

      // 构建 OpenAI 兼容的请求
      const requestBody = {
        model: 'huihui_ai/Qwen3.6-abliterated:27b',
        messages: [
          {
            role: 'user',
            content: [
              {
                type: 'text',
                text: '请识别这张图片中的文字内容，并返回纯文本。',
              },
              {
                type: 'image_url',
                image_url: {
                  url: base64Image,
                },
              },
            ],
          },
        ],
        stream: false,
      }

      console.log('[useOllamaOpenAIOCR] Sending request to Ollama OpenAI API...')

      // 获取 Ollama 基础 URL（从环境变量或配置）
      const ollamaBaseUrl =
        process.env.OLLAMA_BASE_URL ||
        (typeof window !== 'undefined' ? '/api/ollama' : 'http://localhost:11434')

      // CSP 检查 - 检查直接上游 URL
      const upstreamUrl = ollamaBaseUrl.startsWith('/') ? '' : ollamaBaseUrl
      if (upstreamUrl && this.isHttpEndpointBlockedByCsp(upstreamUrl)) {
        return {
          metadata: await this.parseMetadata(file),
          content: [],
          text: '',
          parseTime: 0,
          success: false,
          error:
            'CSP 阻止了 HTTP OCR 请求（当前页面为 HTTPS）。请将 OLLAMA_BASE_URL 配置为 HTTPS 或使用后台代理中转。',
        }
      }

      // 构建 API 端点列表
      // 注意：Ollama 原生 /api/chat 不支持多模态（数组 content），只支持 OpenAI 兼容格式
      const apiEndpoints: { url: string; format: 'openai' }[] = []

      if (ollamaBaseUrl.startsWith('/')) {
        // 使用代理路由
        apiEndpoints.push(
          { url: `${ollamaBaseUrl}/v1/chat/completions`, format: 'openai' }
        )
      } else {
        // 直接访问 Ollama 服务器
        apiEndpoints.push(
          { url: `${ollamaBaseUrl}/v1/chat/completions`, format: 'openai' }
        )
      }

      for (const endpoint of apiEndpoints) {
        console.log(`[useOllamaOpenAIOCR] Trying ${endpoint.format} API: ${endpoint.url}`)

        const controller = new AbortController()
        const timeoutId = setTimeout(() => controller.abort(), 60000) // 60秒超时

        let response: Response
        try {
          response = await fetch(endpoint.url, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify(requestBody),
            signal: controller.signal,
          })
          clearTimeout(timeoutId)

          // 检查响应
          if (response.ok) {
            const data = await response.json()
            console.log(`[useOllamaOpenAIOCR] ${endpoint.format} API response:`, data)

            // OpenAI 格式响应
            const extractedText = data.choices?.[0]?.message?.content || data.response || ''

            if (extractedText) {
              console.log('[useOllamaOpenAIOCR] OCR succeeded, length:', extractedText.length)

              const metadata = await this.parseMetadata(file)
              const content: DocumentContent[] = [
                {
                  type: ContentType.TEXT,
                  text: extractedText,
                },
              ]

              return {
                metadata,
                content,
                text: extractedText,
                parseTime: Date.now() - startTime,
                success: true,
              }
            }
          } else if (response.status === 404) {
            // 404 可能是端点不支持，继续尝试下一个
            console.log(`[useOllamaOpenAIOCR] ${endpoint.format} API returned 404, trying next...`)
            continue
          } else {
            // 其他错误也记录但继续尝试
            const errorText = await response.text()
            console.error(`[useOllamaOpenAIOCR] ${endpoint.format} API error:`, response.status, errorText)
            continue
          }
        } catch (fetchError) {
          clearTimeout(timeoutId)
          console.error(`[useOllamaOpenAIOCR] ${endpoint.format} API fetch failed:`, fetchError)
          continue
        }
      }

      // 所有端点都失败
      console.error('[useOllamaOpenAIOCR] All API endpoints failed')
      return {
        metadata: await this.parseMetadata(file),
        content: [],
        text: '',
        parseTime: Date.now() - startTime,
        success: false,
        error: `Ollama OCR 请求失败。请检查：1. Ollama 服务是否运行 2. 是否安装了视觉模型（如 llava）3. 网络连接是否正常`,
      }
    } catch (error) {
      console.error('[useOllamaOpenAIOCR] OCR failed:', error)
      return {
        metadata: await this.parseMetadata(file),
        content: [],
        text: '',
        parseTime: 0,
        success: false,
        error: `Ollama OCR 失败: ${error instanceof Error ? error.message : 'unknown error'}`,
      }
    }
  }

  /**
   * 将文件转换为 base64 格式
   */
  private convertToBase64(file: File | Blob): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = () => {
        const result = reader.result as string
        resolve(result)
      }
      reader.onerror = error => {
        reject(error)
      }
      reader.readAsDataURL(file)
    })
  }

  /**
   * 转换 PDF 为图像并使用 OCR
   */
  private async convertPdfToImagesAndOcr(
    buffer: ArrayBuffer,
    options?: ParseOptions,
    fileName?: string
  ): Promise<DocumentParseResult> {
    try {
      console.log('[convertPdfToImagesAndOcr] Starting PDF to image conversion')

      // 加载 PDF.js
      const pdfjs = await ensurePdfJsRuntime({
        allowCdnFallback: true,
      })

      if (!pdfjs || !pdfjs.getDocument) {
        throw new Error('PDF.js not available')
      }

      // 创建 ArrayBuffer 的副本，因为 PDF.js Worker 会分离原始 buffer
      // 这允许我们在 PDF.js 处理后仍然使用原始 buffer 进行元数据解析
      const bufferCopy = buffer.slice(0)
      console.log('[convertPdfToImagesAndOcr] Created buffer copy for PDF.js worker')

      // 加载 PDF 文档
      const loadingTask = pdfjs.getDocument(createPdfLoadOptions(bufferCopy))
      const pdfDocument = await loadingTask.promise

      const metadata: DocumentMetadata = {
        name: fileName || 'Untitled.pdf',
        type: DocumentType.PDF,
        size: buffer.byteLength,
        title: 'Untitled',
        author: '',
        pageCount: pdfDocument?.numPages || 0,
      }

      const pageTexts: string[] = []

      // 逐页处理
      for (let pageNum = 1; pageNum <= pdfDocument.numPages; pageNum++) {
        console.log(`[convertPdfToImagesAndOcr] Processing page ${pageNum}/${pdfDocument.numPages}`)

        const page = await pdfDocument.getPage(pageNum)

        // 渲染页面为图像
        const viewport = page.getViewport({ scale: 2.0 })
        const canvas = document.createElement('canvas')
        const context = canvas.getContext('2d')

        if (!context) {
          throw new Error('Failed to get canvas context')
        }

        canvas.width = viewport.width
        canvas.height = viewport.height

        const renderTask = page.render({
          canvasContext: context,
          viewport: viewport,
        })

        await renderTask.promise

        // 将 canvas 转换为 blob
        const imageBlob = await new Promise<Blob>((resolve, reject) => {
          canvas.toBlob(blob => {
            if (blob) {
              resolve(blob)
            } else {
              reject(new Error('Failed to convert canvas to blob'))
            }
          }, 'image/png')
        })

        // 使用 Ollama OpenAI 兼容 API 进行 OCR
        console.log(`[convertPdfToImagesAndOcr] Performing OCR on page ${pageNum} using Ollama...`)
        try {
          // 将 Blob 转换为 base64 字符串
          const imageBase64 = await new Promise<string>((resolve, reject) => {
            const reader = new FileReader()
            reader.onloadend = () => {
              if (typeof reader.result === 'string') {
                resolve(reader.result)
              } else {
                reject(new Error('Failed to convert blob to base64'))
              }
            }
            reader.onerror = () => reject(new Error('Failed to read blob'))
            reader.readAsDataURL(imageBlob)
          })

          // 调用 Ollama OpenAI API
          const requestBody = {
            model: 'huihui_ai/Qwen3.6-abliterated:27b',
            messages: [
              {
                role: 'user',
                content: [
                  {
                    type: 'text',
                    text: '请识别这张图片中的文字内容，并返回纯文本。',
                  },
                  {
                    type: 'image_url',
                    image_url: {
                      url: imageBase64,
                    },
                  },
                ],
              },
            ],
            stream: false,
          }

          const ollamaBaseUrl =
            process.env.OLLAMA_BASE_URL ||
            (typeof window !== 'undefined' ? '/api/ollama' : 'http://localhost:11434')
          const response = await fetch(`${ollamaBaseUrl}/v1/chat/completions`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify(requestBody),
          })

          if (response.ok) {
            const data = await response.json()
            if (data.choices && data.choices[0] && data.choices[0].message) {
              const extractedText = data.choices[0].message.content
              pageTexts.push(extractedText)
              console.log(`[convertPdfToImagesAndOcr] OCR succeeded for page ${pageNum}`)
            }
          } else {
            console.warn(
              `[convertPdfToImagesAndOcr] OCR failed for page ${pageNum}:`,
              response.status
            )
          }
        } catch (ocrError) {
          console.warn(`[convertPdfToImagesAndOcr] OCR failed for page ${pageNum}:`, ocrError)
          // 即使 OCR 失败，也继续处理下一页
        }
      }

      const text = pageTexts.join('\n')

      // 检查是否成功提取了文本
      if (text.trim().length > 0) {
        const content: DocumentContent[] = [
          {
            type: ContentType.TEXT,
            text: text,
          },
        ]

        return {
          metadata,
          content,
          text,
          parseTime: Date.now() - performance.now(),
          success: true,
        }
      } else {
        // 如果没有提取到文本，返回失败但不抛出异常
        return {
          metadata,
          content: [],
          text: '',
          parseTime: Date.now() - performance.now(),
          success: false,
          error:
            '无法从 PDF 图片中提取文本。可能的原因：Ollama OCR 服务不可用，或 PDF 只包含图片而不包含文本。',
        }
      }
    } catch (error) {
      console.error('[convertPdfToImagesAndOcr] Error:', error)
      const metadata: DocumentMetadata = {
        name: 'Untitled.pdf',
        type: DocumentType.PDF,
        size: buffer.byteLength,
        title: 'Untitled',
        author: '',
        pageCount: 0,
      }
      return {
        metadata,
        content: [],
        text: '',
        parseTime: 0,
        success: false,
        error: error instanceof Error ? error.message : 'PDF to image and OCR failed',
      }
    }
  }
}
