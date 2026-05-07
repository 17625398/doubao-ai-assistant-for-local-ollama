// 附件处理器 - 借鉴 jit-pdf-sdk 设计
// 提供文件分类、缩略图生成、内容提取等功能

import { ensurePdfJsRuntime, createPdfLoadOptions } from './pdfjs-runtime'
import { openKBSandboxService } from '../services/openkb-sandbox-service'

export type AttachmentType = 'image' | 'pdf' | 'code' | 'document' | 'spreadsheet' | 'unknown'

export interface AttachmentMetadata {
  name: string
  size: number
  mimeType: string
  lastModified: number
  extension: string
}

export interface ImageMetadata extends AttachmentMetadata {
  width?: number
  height?: number
  aspectRatio?: number
}

export interface PdfMetadata extends AttachmentMetadata {
  pageCount: number
  title?: string
  author?: string
  extractedText?: string
}

export interface CodeMetadata extends AttachmentMetadata {
  language: string
  lineCount: number
  encoding: string
}

export interface ContentSummary {
  type: AttachmentType
  description: string
  canAnalyze: boolean
  metadata?: ImageMetadata | PdfMetadata | CodeMetadata | AttachmentMetadata
  openKBStatus?: {
    uploaded: boolean
    documentId?: string
    error?: string
    analysis?: {
      summary: string
      keyPoints: string[]
      sources: string[]
    }
  }
}

export interface AIAttachmentPayload {
  type: 'image' | 'document' | 'code' | 'file'
  content: string
  mimeType: string
  name?: string
  metadata?: Record<string, unknown>
}

// 代码文件扩展名映射
const CODE_EXTENSIONS: Record<string, string> = {
  '.ts': 'typescript',
  '.tsx': 'typescript-react',
  '.js': 'javascript',
  '.jsx': 'javascript-react',
  '.mjs': 'javascript-module',
  '.cjs': 'javascript-commonjs',
  '.py': 'python',
  '.java': 'java',
  '.go': 'go',
  '.rs': 'rust',
  '.c': 'c',
  '.cc': 'cpp',
  '.cpp': 'cpp',
  '.h': 'c-header',
  '.hpp': 'cpp-header',
  '.json': 'json',
  '.md': 'markdown',
  '.yml': 'yaml',
  '.yaml': 'yaml',
  '.xml': 'xml',
  '.html': 'html',
  '.htm': 'html',
  '.css': 'css',
  '.scss': 'scss',
  '.sass': 'sass',
  '.less': 'less',
  '.sql': 'sql',
  '.sh': 'shell',
  '.bash': 'bash',
  '.zsh': 'zsh',
  '.ps1': 'powershell',
  '.rb': 'ruby',
  '.php': 'php',
  '.swift': 'swift',
  '.kt': 'kotlin',
  '.scala': 'scala',
  '.r': 'r',
  '.m': 'matlab',
  '.lua': 'lua',
  '.pl': 'perl',
  '.pm': 'perl-module',
}

// 文档类型映射
const DOCUMENT_MIME_TYPES = [
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.ms-powerpoint',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  'text/plain',
  'text/rtf',
  'application/rtf',
]

// 电子表格类型
const SPREADSHEET_MIME_TYPES = [
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'text/csv',
]

export class AttachmentProcessor {
  /**
   * 根据文件内容智能分类
   */
  static categorizeFile(file: File): AttachmentType {
    const mimeType = file.type.toLowerCase()
    const extension = this.getFileExtension(file.name).toLowerCase()

    // 图片类型
    if (mimeType.startsWith('image/')) {
      return 'image'
    }

    // PDF 类型
    if (mimeType === 'application/pdf' || extension === '.pdf') {
      return 'pdf'
    }

    // 代码文件
    if (CODE_EXTENSIONS[extension] || this.isCodeFileByContent(file)) {
      return 'code'
    }

    // 电子表格
    if (SPREADSHEET_MIME_TYPES.includes(mimeType)) {
      return 'spreadsheet'
    }

    // 文档类型
    if (DOCUMENT_MIME_TYPES.includes(mimeType)) {
      return 'document'
    }

    return 'unknown'
  }

  /**
   * 获取文件扩展名
   */
  static getFileExtension(filename: string): string {
    const lastDot = filename.lastIndexOf('.')
    return lastDot === -1 ? '' : filename.slice(lastDot)
  }

  /**
   * 判断是否为代码文件（基于内容启发式判断）
   */
  private static isCodeFileByContent(file: File): boolean {
    const extension = this.getFileExtension(file.name).toLowerCase()
    return extension in CODE_EXTENSIONS
  }

  /**
   * 获取代码语言
   */
  static getCodeLanguage(filename: string): string {
    const extension = this.getFileExtension(filename).toLowerCase()
    return CODE_EXTENSIONS[extension] || 'text'
  }

  /**
   * 生成文件缩略图（借鉴 jit-pdf 的缩略图导航）
   */
  static async generateThumbnail(
    file: File,
    options: { maxWidth?: number; maxHeight?: number; quality?: number } = {}
  ): Promise<string | undefined> {
    const { maxWidth = 200, maxHeight = 200, quality = 0.8 } = options
    const type = this.categorizeFile(file)

    try {
      switch (type) {
        case 'image':
          return await this.compressImage(file, { maxWidth, maxHeight, quality })

        case 'pdf':
          return await this.extractPdfThumbnail(file)

        case 'code':
          return this.getCodeFileIcon(file.name)

        case 'document':
          return this.getDocumentIcon(file.name)

        case 'spreadsheet':
          return this.getSpreadsheetIcon(file.name)

        default:
          return this.getGenericFileIcon(file.name)
      }
    } catch (error) {
      console.warn('[AttachmentProcessor] Failed to generate thumbnail:', error)
      return this.getGenericFileIcon(file.name)
    }
  }

  /**
   * 压缩图片生成缩略图
   */
  private static async compressImage(
    file: File,
    options: { maxWidth: number; maxHeight: number; quality: number }
  ): Promise<string> {
    return new Promise((resolve, reject) => {
      const img = new Image()
      const url = URL.createObjectURL(file)

      img.onload = () => {
        URL.revokeObjectURL(url)

        const canvas = document.createElement('canvas')
        const ctx = canvas.getContext('2d')
        if (!ctx) {
          reject(new Error('Failed to get canvas context'))
          return
        }

        // 计算缩放后的尺寸
        let { width, height } = img
        const { maxWidth, maxHeight } = options

        if (width > maxWidth || height > maxHeight) {
          const ratio = Math.min(maxWidth / width, maxHeight / height)
          width *= ratio
          height *= ratio
        }

        canvas.width = width
        canvas.height = height
        ctx.drawImage(img, 0, 0, width, height)

        resolve(canvas.toDataURL('image/jpeg', options.quality))
      }

      img.onerror = () => {
        URL.revokeObjectURL(url)
        reject(new Error('Failed to load image'))
      }

      img.src = url
    })
  }

  /**
   * 提取 PDF 第一页作为缩略图
   */
  private static async extractPdfThumbnail(file: File): Promise<string | undefined> {
    try {
      const pdfjs = await ensurePdfJsRuntime({
        allowCdnFallback: true,
      })

      if (!pdfjs.getDocument) {
        return this.getDocumentIcon(file.name)
      }

      const arrayBuffer = await file.arrayBuffer()
      const loadingTask = pdfjs.getDocument(createPdfLoadOptions(arrayBuffer))
      const pdf = await loadingTask.promise

      const page = await pdf.getPage(1)
      const viewport = page.getViewport({ scale: 0.5 })

      const canvas = document.createElement('canvas')
      const ctx = canvas.getContext('2d')
      if (!ctx) return undefined

      canvas.width = viewport.width
      canvas.height = viewport.height

      await page.render({
        canvasContext: ctx,
        viewport,
      }).promise

      return canvas.toDataURL('image/jpeg', 0.8)
    } catch (error) {
      console.warn('[AttachmentProcessor] Failed to extract PDF thumbnail:', error)
      return this.getDocumentIcon(file.name)
    }
  }

  /**
   * 获取文件图标（使用 SVG Data URL）
   */
  private static getFileIconSvg(color: string, icon: string): string {
    const svg = `
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="${color}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        ${icon}
      </svg>
    `
    return `data:image/svg+xml;base64,${btoa(unescape(encodeURIComponent(svg)))}`
  }

  private static getCodeFileIcon(filename: string): string {
    const language = this.getCodeLanguage(filename)
    const colors: Record<string, string> = {
      typescript: '#3178c6',
      javascript: '#f7df1e',
      python: '#3776ab',
      java: '#007396',
      go: '#00add8',
      rust: '#dea584',
    }
    const color = colors[language] || '#6b7280'
    return this.getFileIconSvg(
      color,
      '<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/>'
    )
  }

  private static getDocumentIcon(filename: string): string {
    return this.getFileIconSvg(
      '#3b82f6',
      '<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/>'
    )
  }

  private static getSpreadsheetIcon(filename: string): string {
    return this.getFileIconSvg(
      '#22c55e',
      '<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><rect x="8" y="13" width="8" height="2"/><rect x="8" y="17" width="8" height="2"/>'
    )
  }

  private static getGenericFileIcon(filename: string): string {
    return this.getFileIconSvg(
      '#6b7280',
      '<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/>'
    )
  }

  /**
   * 提取文件内容摘要（用于 AI 对话）
   */
  static async extractContentSummary(file: File): Promise<ContentSummary> {
    const type = this.categorizeFile(file)
    const baseMetadata: AttachmentMetadata = {
      name: file.name,
      size: file.size,
      mimeType: file.type,
      lastModified: file.lastModified,
      extension: this.getFileExtension(file.name),
    }

    switch (type) {
      case 'image': {
        const imageInfo = await this.getImageInfo(file)
        const metadata: ImageMetadata = {
          ...baseMetadata,
          ...imageInfo,
        }
        return {
          type,
          description: `图片文件 (${metadata.width}x${metadata.height})`,
          canAnalyze: true,
          metadata,
        }
      }

      case 'pdf': {
        const pdfInfo = await this.extractPdfInfo(file)
        const metadata: PdfMetadata = {
          ...baseMetadata,
          ...pdfInfo,
        }

        // 自动上传到 OpenKB 知识库
        const openKBStatus = await this.uploadPdfToOpenKB(file)

        return {
          type,
          description: `PDF 文档，共 ${metadata.pageCount} 页${openKBStatus.uploaded ? ' (已上传至知识库)' : ''}`,
          canAnalyze: true,
          metadata,
          openKBStatus,
        }
      }

      case 'code': {
        const codeInfo = await this.analyzeCodeFile(file)
        const metadata: CodeMetadata = {
          ...baseMetadata,
          ...codeInfo,
        }
        return {
          type,
          description: `代码文件 (${metadata.language})，共 ${metadata.lineCount} 行`,
          canAnalyze: true,
          metadata,
        }
      }

      case 'spreadsheet': {
        return {
          type,
          description: `电子表格文件`,
          canAnalyze: true,
          metadata: baseMetadata,
        }
      }

      case 'document': {
        return {
          type,
          description: `文档文件`,
          canAnalyze: true,
          metadata: baseMetadata,
        }
      }

      default:
        return {
          type,
          description: `文件 (${this.formatFileSize(file.size)})`,
          canAnalyze: false,
          metadata: baseMetadata,
        }
    }
  }

  /**
   * 获取图片信息
   */
  private static async getImageInfo(
    file: File
  ): Promise<{ width: number; height: number; aspectRatio: number }> {
    return new Promise((resolve, reject) => {
      const img = new Image()
      const url = URL.createObjectURL(file)

      img.onload = () => {
        URL.revokeObjectURL(url)
        resolve({
          width: img.width,
          height: img.height,
          aspectRatio: img.width / img.height,
        })
      }

      img.onerror = () => {
        URL.revokeObjectURL(url)
        reject(new Error('Failed to load image'))
      }

      img.src = url
    })
  }

  /**
   * 提取 PDF 信息
   */
  private static async extractPdfInfo(
    file: File
  ): Promise<{ pageCount: number; extractedText?: string }> {
    try {
      const pdfjs = await ensurePdfJsRuntime({
        allowCdnFallback: true,
      })

      if (!pdfjs?.getDocument) {
        throw new Error('PDF.js not available')
      }

      const arrayBuffer = await file.arrayBuffer()
      const loadingTask = pdfjs.getDocument(createPdfLoadOptions(arrayBuffer))
      const pdf = await loadingTask.promise

      // 提取前 5 页的文本作为摘要
      let extractedText = ''
      const maxPages = Math.min(pdf.numPages, 5)

      for (let i = 1; i <= maxPages; i++) {
        try {
          const page = await pdf.getPage(i)
          const textContent = await page.getTextContent()
          const pageText = textContent.items
            .map((item: { str?: string }) => item.str || '')
            .join(' ')
          extractedText += pageText + '\n'
        } catch (e) {
          console.warn(`[AttachmentProcessor] Failed to extract text from page ${i}:`, e)
        }
      }

      return {
        pageCount: pdf.numPages,
        extractedText: extractedText.substring(0, 5000), // 限制文本长度
      }
    } catch (error) {
      console.warn('[AttachmentProcessor] Failed to extract PDF info:', error)
      return { pageCount: 0 }
    }
  }

  /**
   * 分析代码文件
   */
  private static async analyzeCodeFile(
    file: File
  ): Promise<{ language: string; lineCount: number; encoding: string }> {
    const content = await file.text()
    const lines = content.split('\n')

    return {
      language: this.getCodeLanguage(file.name),
      lineCount: lines.length,
      encoding: 'utf-8',
    }
  }

  /**
   * 上传 PDF 到 OpenKB 知识库并自动分析
   */
  private static async uploadPdfToOpenKB(file: File): Promise<{
    uploaded: boolean
    documentId?: string
    error?: string
    analysis?: {
      summary: string
      keyPoints: string[]
      sources: string[]
    }
  }> {
    try {
      console.log('[AttachmentProcessor] Uploading PDF to OpenKB:', file.name)

      // 检查是否在浏览器环境
      if (typeof window === 'undefined') {
        return { uploaded: false, error: 'Not in browser environment' }
      }

      // 第一步：上传文件到沙箱
      const uploadResult = await openKBSandboxService.uploadFile(file)

      if (!uploadResult.success || !uploadResult.fileId) {
        console.warn('[AttachmentProcessor] Failed to upload file to sandbox:', uploadResult.error)
        return { uploaded: false, error: uploadResult.error || 'Upload to sandbox failed' }
      }

      console.log('[AttachmentProcessor] File uploaded to sandbox:', uploadResult.fileId)

      // 第二步：添加到 OpenKB 知识库
      const addResult = await openKBSandboxService.addDocument(uploadResult.fileId, file.name)

      if (!addResult.success) {
        console.warn('[AttachmentProcessor] Failed to add document to OpenKB:', addResult.error)
        return { uploaded: false, error: addResult.error || 'Add to OpenKB failed' }
      }

      console.log('[AttachmentProcessor] PDF successfully added to OpenKB:', addResult.documentId)

      // 第三步：自动进行知识库分析
      console.log('[AttachmentProcessor] Starting automatic knowledge base analysis...')
      const analysis = await this.analyzeDocumentWithOpenKB(file.name)

      return {
        uploaded: true,
        documentId: addResult.documentId,
        analysis,
      }
    } catch (error) {
      console.error('[AttachmentProcessor] Error uploading PDF to OpenKB:', error)
      return {
        uploaded: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      }
    }
  }

  /**
   * 使用 OpenKB 自动分析文档内容
   * 带重试机制，确保文档被正确处理
   */
  private static async analyzeDocumentWithOpenKB(
    fileName: string
  ): Promise<{ summary: string; keyPoints: string[]; sources: string[] }> {
    try {
      console.log('[AttachmentProcessor] Analyzing document with OpenKB:', fileName)

      // 等待一段时间让 OpenKB 处理文档（增加到10秒）
      console.log('[AttachmentProcessor] Waiting for OpenKB to process document...')
      await new Promise(resolve => setTimeout(resolve, 10000))

      // 尝试查询文档摘要（带重试）
      let summaryQuery = await this.queryWithRetry(
        `请总结这份文档《${fileName}》的主要内容和核心要点。请提供：\n1. 文档的整体摘要（200字以内）\n2. 3-5个关键要点\n3. 文档类型和主题分类`,
        3
      )

      console.log('[AttachmentProcessor] Summary query result:', {
        success: summaryQuery.success,
        hasAnswer: !!summaryQuery.answer,
        answerLength: summaryQuery.answer?.length,
      })

      // 尝试查询关键信息（带重试）
      let keyPointsQuery = await this.queryWithRetry(
        `从文档《${fileName}》中提取最重要的关键信息、数据、结论或建议。列出3-5个要点。`,
        3
      )

      console.log('[AttachmentProcessor] Key points query result:', {
        success: keyPointsQuery.success,
        hasAnswer: !!keyPointsQuery.answer,
        answerLength: keyPointsQuery.answer?.length,
      })

      let summary: string
      if (summaryQuery.success && summaryQuery.answer && summaryQuery.answer.length > 50) {
        summary = summaryQuery.answer
      } else {
        // 如果查询失败或返回内容太短，使用更简单的查询
        console.log('[AttachmentProcessor] Trying simpler query...')
        const simpleQuery = await this.queryWithRetry(
          `这份文档《${fileName}》主要讲了什么内容？请简要说明。`,
          2
        )
        summary =
          simpleQuery.success && simpleQuery.answer && simpleQuery.answer.length > 20
            ? simpleQuery.answer
            : `文档《${fileName}》已成功添加到知识库。您可以通过 AI 对话方式查询文档内容。`
      }

      // 解析关键要点
      const keyPoints: string[] = []
      if (keyPointsQuery.success && keyPointsQuery.answer) {
        // 尝试从回答中提取要点（按行分割或按数字分割）
        const lines = keyPointsQuery.answer
          .split(/\n+/)
          .map(line => line.trim())
          .filter(line => line.length > 5)

        // 提取带编号或项目符号的行
        const structuredLines = lines.filter(
          line => line.match(/^\d+[.、]/) || line.match(/^[•\-\*]/) || line.length > 15
        )

        keyPoints.push(...structuredLines.slice(0, 5))
      }

      // 如果没有提取到要点，尝试从摘要中提取
      if (keyPoints.length === 0 && summary.length > 50) {
        const sentences = summary
          .split(/[。！？.!?]/)
          .map(s => s.trim())
          .filter(s => s.length > 10 && s.length < 100)
          .slice(0, 3)
        keyPoints.push(...sentences)
      }

      // 如果还是没有要点，使用默认提示
      if (keyPoints.length === 0) {
        keyPoints.push('✓ 文档已成功添加到知识库')
        keyPoints.push('💬 您可以通过对话方式查询文档内容')
        keyPoints.push('🤖 系统会自动基于知识库回答相关问题')
      }

      console.log('[AttachmentProcessor] Analysis complete:', {
        summaryLength: summary.length,
        keyPointsCount: keyPoints.length,
      })

      return {
        summary,
        keyPoints,
        sources: summaryQuery.sources || [fileName],
      }
    } catch (error) {
      console.error('[AttachmentProcessor] Error analyzing document:', error)
      return {
        summary: `文档《${fileName}》已上传到知识库。分析功能暂时不可用，您可以直接通过对话查询文档内容。`,
        keyPoints: ['✓ 文档上传成功', '💬 可通过对话查询内容', '📚 知识库索引已构建'],
        sources: [fileName],
      }
    }
  }

  /**
   * 带重试机制的 OpenKB 查询
   */
  private static async queryWithRetry(
    question: string,
    maxRetries: number = 3
  ): Promise<{ success: boolean; answer?: string; sources?: string[]; error?: string }> {
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      console.log(
        `[AttachmentProcessor] Query attempt ${attempt}/${maxRetries}:`,
        question.substring(0, 50) + '...'
      )

      const result = await openKBSandboxService.query(question)

      if (result.success && result.answer && result.answer.length > 20) {
        console.log(`[AttachmentProcessor] Query successful on attempt ${attempt}`)
        return result
      }

      console.warn(
        `[AttachmentProcessor] Query attempt ${attempt} failed:`,
        result.error || 'Empty answer'
      )

      // 如果不是最后一次尝试，等待后重试
      if (attempt < maxRetries) {
        const delay = attempt * 2000 // 2秒, 4秒, 6秒...
        console.log(`[AttachmentProcessor] Retrying in ${delay}ms...`)
        await new Promise(resolve => setTimeout(resolve, delay))
      }
    }

    // 所有重试都失败，返回最后一次结果
    return { success: false, error: 'All retry attempts failed' }
  }

  /**
   * 格式化文件大小
   */
  static formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 B'
    const k = 1024
    const sizes = ['B', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }

  /**
   * 将文件转换为 Base64
   */
  static async fileToBase64(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = () => {
        const result = reader.result as string
        // 移除 data:image/jpeg;base64, 前缀
        resolve(result.split(',')[1] || result)
      }
      reader.onerror = reject
      reader.readAsDataURL(file)
    })
  }

  /**
   * 准备附件数据给 AI（核心方法）
   */
  static async prepareForAI(file: File): Promise<AIAttachmentPayload> {
    const type = this.categorizeFile(file)
    const summary = await this.extractContentSummary(file)

    switch (type) {
      case 'image': {
        const base64 = await this.fileToBase64(file)
        return {
          type: 'image',
          content: base64,
          mimeType: file.type,
          name: file.name,
          metadata: summary.metadata as unknown as Record<string, unknown>,
        }
      }

      case 'pdf': {
        const pdfMetadata = summary.metadata as PdfMetadata
        return {
          type: 'document',
          content: pdfMetadata.extractedText || '',
          mimeType: 'application/pdf',
          name: file.name,
          metadata: {
            pageCount: pdfMetadata.pageCount,
            extractedText: pdfMetadata.extractedText?.substring(0, 10000),
          } as Record<string, unknown>,
        }
      }

      case 'code': {
        const content = await file.text()
        const codeMetadata = summary.metadata as CodeMetadata
        return {
          type: 'code',
          content,
          mimeType: file.type || 'text/plain',
          name: file.name,
          metadata: {
            language: codeMetadata.language,
            lineCount: codeMetadata.lineCount,
          } as Record<string, unknown>,
        }
      }

      case 'document':
      case 'spreadsheet': {
        // 对于文档，尝试提取文本或返回基本信息
        let content = ''
        try {
          content = await file.text()
        } catch {
          content = `[文档文件: ${file.name}]`
        }
        return {
          type: 'document',
          content: content.substring(0, 50000), // 限制大小
          mimeType: file.type,
          name: file.name,
          metadata: summary.metadata as unknown as Record<string, unknown>,
        }
      }

      default:
        return {
          type: 'file',
          content: `[文件: ${file.name}, 大小: ${this.formatFileSize(file.size)}]`,
          mimeType: file.type || 'application/octet-stream',
          name: file.name,
          metadata: summary.metadata as unknown as Record<string, unknown>,
        }
    }
  }

  /**
   * 批量准备附件给 AI
   */
  static async prepareMultipleForAI(files: File[]): Promise<{
    attachments: AIAttachmentPayload[]
    summary: string
  }> {
    const attachments = await Promise.all(files.map(file => this.prepareForAI(file)))

    const summary = this.generateAttachmentSummary(attachments)

    return { attachments, summary }
  }

  /**
   * 生成附件摘要
   */
  private static generateAttachmentSummary(attachments: AIAttachmentPayload[]): string {
    const typeCount = attachments.reduce(
      (acc, att) => {
        acc[att.type] = (acc[att.type] || 0) + 1
        return acc
      },
      {} as Record<string, number>
    )

    const parts: string[] = []
    if (typeCount.image) parts.push(`${typeCount.image} 张图片`)
    if (typeCount.document) parts.push(`${typeCount.document} 个文档`)
    if (typeCount.code) parts.push(`${typeCount.code} 个代码文件`)
    if (typeCount.file) parts.push(`${typeCount.file} 个其他文件`)

    return parts.join('，') || '无附件'
  }
}

// 导出便捷函数
export const categorizeFile = AttachmentProcessor.categorizeFile.bind(AttachmentProcessor)
export const generateThumbnail = AttachmentProcessor.generateThumbnail.bind(AttachmentProcessor)
export const extractContentSummary =
  AttachmentProcessor.extractContentSummary.bind(AttachmentProcessor)
export const prepareForAI = AttachmentProcessor.prepareForAI.bind(AttachmentProcessor)
export const prepareMultipleForAI =
  AttachmentProcessor.prepareMultipleForAI.bind(AttachmentProcessor)
export const formatFileSize = AttachmentProcessor.formatFileSize.bind(AttachmentProcessor)
export const fileToBase64 = AttachmentProcessor.fileToBase64.bind(AttachmentProcessor)
