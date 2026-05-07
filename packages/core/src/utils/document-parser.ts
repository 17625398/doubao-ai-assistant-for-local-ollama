// 文档解析器实现

import {
  DocumentType,
  DocumentMetadata,
  DocumentContent,
  DocumentPage,
  DocumentParseResult,
  ParseOptions,
  DocumentParser,
  DocumentParserRegistry,
  ContentType,
  TextContent,
  TableContent,
  ImageContent,
} from '../types/document'
import { logger } from './logger'
import * as XLSX from 'xlsx'
import { createWorker } from 'tesseract.js'
import { cacheManager } from './cache-manager'
import * as mammoth from 'mammoth'
import JSZip from 'jszip'

/**
 * 基础文档解析器类
 */
export abstract class BaseDocumentParser implements DocumentParser {
  abstract supportedTypes: DocumentType[]

  /**
   * 检测文档类型
   */
  async detectType(file: File | ArrayBuffer | string): Promise<DocumentType> {
    if (typeof file === 'string') {
      // 根据文件扩展名检测
      const extension = file.toLowerCase().split('.').pop()
      switch (extension) {
        case 'pdf':
          return DocumentType.PDF
        case 'doc':
        case 'docx':
          return DocumentType.WORD
        case 'xls':
        case 'xlsx':
          return DocumentType.EXCEL
        case 'ppt':
        case 'pptx':
          return DocumentType.POWERPOINT
        case 'txt':
        case 'md':
        case 'html':
        case 'htm':
          return DocumentType.TEXT
        case 'jpg':
        case 'jpeg':
        case 'png':
        case 'gif':
        case 'webp':
          return DocumentType.IMAGE
        default:
          return DocumentType.UNKNOWN
      }
    } else if (file instanceof File) {
      // 根据文件 MIME 类型检测
      const mimeType = file.type
      if (mimeType.includes('pdf')) {
        return DocumentType.PDF
      } else if (mimeType.includes('word') || mimeType.includes('document')) {
        return DocumentType.WORD
      } else if (mimeType.includes('excel') || mimeType.includes('sheet')) {
        return DocumentType.EXCEL
      } else if (mimeType.includes('powerpoint') || mimeType.includes('presentation')) {
        return DocumentType.POWERPOINT
      } else if (mimeType.includes('text')) {
        return DocumentType.TEXT
      } else if (mimeType.includes('image')) {
        return DocumentType.IMAGE
      } else {
        return DocumentType.UNKNOWN
      }
    } else {
      // ArrayBuffer 类型，根据文件头特征检测
      return this.detectTypeFromArrayBuffer(file)
    }
  }

  /**
   * 从 ArrayBuffer 检测文档类型
   */
  private detectTypeFromArrayBuffer(buffer: ArrayBuffer): DocumentType {
    const view = new Uint8Array(buffer.slice(0, 12)) // 读取文件头

    // PDF 文件头：%PDF-1.
    if (
      view[0] === 0x25 &&
      view[1] === 0x50 &&
      view[2] === 0x44 &&
      view[3] === 0x46 &&
      view[4] === 0x2d
    ) {
      return DocumentType.PDF
    }

    // DOCX/XLSX/PPTX 文件头：PK 压缩文件
    if (view[0] === 0x50 && view[1] === 0x4b) {
      // 这里简化处理，实际可以根据压缩包内的内容进一步区分
      return DocumentType.WORD
    }

    // JPEG 文件头：FF D8
    if (view[0] === 0xff && view[1] === 0xd8) {
      return DocumentType.IMAGE
    }

    // PNG 文件头：89 50 4E 47
    if (view[0] === 0x89 && view[1] === 0x50 && view[2] === 0x4e && view[3] === 0x47) {
      return DocumentType.IMAGE
    }

    // GIF 文件头：47 49 46
    if (view[0] === 0x47 && view[1] === 0x49 && view[2] === 0x46) {
      return DocumentType.IMAGE
    }

    // WebP 文件头：52 49 46 46 ... 57 45 42 50
    if (
      view[0] === 0x52 &&
      view[1] === 0x49 &&
      view[2] === 0x46 &&
      view[3] === 0x46 &&
      view[8] === 0x57 &&
      view[9] === 0x45 &&
      view[10] === 0x42 &&
      view[11] === 0x50
    ) {
      return DocumentType.IMAGE
    }

    // 文本文件：检查是否为 ASCII 或 UTF-8 文本
    let isText = true
    for (let i = 0; i < Math.min(view.length, 100); i++) {
      const byte = view[i]
      // 允许可打印字符、空格、制表符、换行符
      if (byte < 32 && byte !== 9 && byte !== 10 && byte !== 13) {
        isText = false
        break
      }
    }
    if (isText) {
      return DocumentType.TEXT
    }

    return DocumentType.UNKNOWN
  }

  /**
   * 解析文档
   */
  abstract parse(
    file: File | ArrayBuffer | string,
    options?: ParseOptions
  ): Promise<DocumentParseResult>

  /**
   * 解析文档元数据
   */

  /**
   * 将 PDF 转换为图片数组（base64 格式）
   */
  protected async pdfToImages(
    arrayBuffer: ArrayBuffer,
    options?: {
      dpi?: number
      format?: string
      maxPages?: number
      startPage?: number
      endPage?: number
    }
  ): Promise<string[]> {
    try {
      console.log('[pdfToImages] Starting PDF to images conversion')

      // 检查 arrayBuffer 是否有效
      if (!arrayBuffer || arrayBuffer.byteLength === 0) {
        throw new Error('Invalid arrayBuffer: empty or null')
      }
      console.log('[pdfToImages] ArrayBuffer length:', arrayBuffer.byteLength)

      console.log('[pdfToImages] Importing pdfjs-dist...')
      const pdfjsModule: any = await import('pdfjs-dist')
      const pdfjs: any = pdfjsModule?.default || pdfjsModule
      console.log('[pdfToImages] pdfjs-dist imported successfully')

      if (!pdfjs || typeof pdfjs.getDocument !== 'function') {
        throw new Error('Failed to load pdfjs-dist: getDocument function not found')
      }

      console.log('[pdfToImages] Creating PDF document...')

      const timeoutMs = 30000 // 30秒超时
      const timeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(() => reject(new Error(`PDF loading timeout after ${timeoutMs}ms`)), timeoutMs)
      })

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const loadingTask = pdfjs.getDocument({
        data: arrayBuffer,
        useWorker: false,
        disableWorker: true,
        disableFontFace: true,
        nativeImageDecoderSupport: 'none',
      } as any)

      // 使用 Promise.race 实现超时
      const pdfDocument = await Promise.race([loadingTask.promise, timeoutPromise])

      console.log('[pdfToImages] PDF document loaded successfully')

      const images: string[] = []
      const dpi = typeof options?.dpi === 'number' && options.dpi > 0 ? options.dpi : 150
      const scale = dpi / 72 // PDF 标准 DPI 是 72
      console.log('[pdfToImages] Number of pages:', pdfDocument.numPages)

      const startPage =
        typeof options?.startPage === 'number' ? Math.max(0, Math.floor(options.startPage)) : 0
      const endPage =
        typeof options?.endPage === 'number' ? Math.max(-1, Math.floor(options.endPage)) : -1
      const maxPages = typeof options?.maxPages === 'number' ? Math.floor(options.maxPages) : 0

      const lastIndex =
        endPage >= 0 ? Math.min(endPage, pdfDocument.numPages - 1) : pdfDocument.numPages - 1
      const effectiveMaxPages = maxPages > 0 ? maxPages : Number.POSITIVE_INFINITY

      for (
        let pageIndex = startPage;
        pageIndex <= lastIndex && images.length < effectiveMaxPages;
        pageIndex += 1
      ) {
        const pageNumber = pageIndex + 1
        console.log('[pdfToImages] Processing page', pageNumber)
        const page = await pdfDocument.getPage(pageNumber)

        // 获取页面尺寸
        const viewport = page.getViewport({ scale })
        console.log('[pdfToImages] Page', pageNumber, 'viewport:', {
          width: viewport.width,
          height: viewport.height,
        })

        // 创建 canvas
        const canvas = document.createElement('canvas')
        const context = canvas.getContext('2d')
        if (!context) {
          throw new Error('Failed to get canvas context')
        }

        // 设置 canvas 尺寸
        canvas.width = Math.max(1, Math.floor(viewport.width))
        canvas.height = Math.max(1, Math.floor(viewport.height))

        // 渲染页面到 canvas
        console.log('[pdfToImages] Rendering page', pageNumber, 'to canvas...')
        await page.render({ canvasContext: context, viewport, canvas }).promise
        console.log('[pdfToImages] Page', pageNumber, 'rendered to canvas')

        // 转换为 base64
        const format = (options?.format || 'png').toLowerCase()
        const mime = format === 'jpeg' || format === 'jpg' ? 'image/jpeg' : 'image/png'
        const base64 = mime === 'image/jpeg' ? canvas.toDataURL(mime, 0.92) : canvas.toDataURL(mime)
        const base64WithoutPrefix = base64.replace(/^data:image\/(png|jpeg);base64,/, '')
        images.push(base64WithoutPrefix)
        console.log('[pdfToImages] Page', pageNumber, 'converted to base64')

        // 释放资源
        page.cleanup()
        canvas.width = 0
        canvas.height = 0
        console.log('[pdfToImages] Page', pageNumber, 'processed')
      }

      console.log('[pdfToImages] PDF to images conversion completed successfully')
      try {
        await pdfDocument.destroy()
      } catch {}
      return images
    } catch (error) {
      console.error('[pdfToImages] PDF to images conversion failed:', error)
      throw new Error(
        'Failed to convert PDF to images: ' +
          (error instanceof Error ? error.message : 'Unknown error')
      )
    }
  }

  async parseMetadata(file: File | ArrayBuffer | string): Promise<DocumentMetadata> {
    const type = await this.detectType(file)
    let name = 'Unknown'
    let size = 0

    if (file instanceof File) {
      name = file.name
      size = file.size
    } else if (typeof file === 'string') {
      name = file.split('/').pop() || 'Unknown'
      // 在浏览器环境中，无法直接获取文件大小
      size = 0
    } else {
      size = file.byteLength
    }

    return {
      name,
      type,
      size,
      createdAt: new Date(),
      modifiedAt: new Date(),
    }
  }

  /**
   * 提取纯文本
   */
  async extractText(file: File | ArrayBuffer | string, options?: ParseOptions): Promise<string> {
    const result = await this.parse(file, { ...options, extractText: true })
    return result.text || ''
  }

  /**
   * 提取表格
   */
  async extractTables(
    file: File | ArrayBuffer | string,
    options?: ParseOptions
  ): Promise<TableContent[]> {
    const result = await this.parse(file, { ...options, extractTables: true })
    return result.content.filter((item): item is TableContent => item.type === ContentType.TABLE)
  }

  /**
   * 提取图片
   */
  async extractImages(
    file: File | ArrayBuffer | string,
    options?: ParseOptions
  ): Promise<ImageContent[]> {
    const result = await this.parse(file, { ...options, extractImages: true })
    return result.content.filter((item): item is ImageContent => item.type === ContentType.IMAGE)
  }

  /**
   * 执行 OCR 识别
   */
  async performOCR(image: File | ArrayBuffer | string, language: string = 'eng'): Promise<string> {
    logger.info('Performing OCR with language:', language)

    try {
      const worker = await createWorker(language)
      await worker.reinitialize(language)

      const imageSource = image instanceof ArrayBuffer ? new Blob([image]) : image

      const result = await worker.recognize(imageSource)
      await worker.terminate()

      return result?.data?.text || ''
    } catch (error) {
      logger.error('OCR failed:', error)
      return ''
    }
  }

  /**
   * 检查是否需要 OCR
   */
  async needsOCR(file: File | ArrayBuffer | string): Promise<boolean> {
    const type = await this.detectType(file)
    // 对于图像类型的文件，默认需要 OCR
    return type === DocumentType.IMAGE
  }

  /**
   * 分块处理文档
   */
  chunkDocument(
    content: string,
    chunkSize: number = 2000,
    chunkOverlap: number = 200
  ): { text: string; startIndex: number; endIndex: number }[] {
    const chunks: { text: string; startIndex: number; endIndex: number }[] = []
    let startIndex = 0

    while (startIndex < content.length) {
      const endIndex = Math.min(startIndex + chunkSize, content.length)
      const chunk = content.substring(startIndex, endIndex)
      chunks.push({ text: chunk, startIndex, endIndex })
      startIndex = endIndex - chunkOverlap
      if (startIndex >= content.length - chunkOverlap) {
        break
      }
    }

    return chunks
  }

  /**
   * 生成解析结果
   */
  protected async createParseResult(
    metadata: DocumentMetadata,
    content: DocumentContent[],
    options?: ParseOptions
  ): Promise<DocumentParseResult> {
    const startTime = Date.now()

    let text = ''
    let pages: DocumentPage[] = []
    let chunks: { text: string; startIndex: number; endIndex: number; pageIndex?: number }[] = []

    // 处理 OCR
    if (options?.enableOCR) {
      const imageContents = content.filter(
        (item): item is ImageContent => item.type === ContentType.IMAGE
      )
      for (const imageContent of imageContents) {
        try {
          const ocrText = await this.performOCR(imageContent.url, options.ocrLanguage)
          // 将 OCR 结果添加为文本内容
          content.push({
            type: ContentType.TEXT,
            text: ocrText,
          })
        } catch (error) {
          logger.error('OCR failed:', error)
        }
      }
    }

    // 生成纯文本
    if (options?.extractText) {
      text = content
        .filter((item): item is TextContent => item.type === ContentType.TEXT)
        .map(item => item.text)
        .join('\n')
    }

    // 按页面组织内容
    if (options?.parseByPage) {
      let currentPage: DocumentContent[] = []
      let pageIndex = 0

      content.forEach(item => {
        if (item.type === ContentType.PAGE_BREAK) {
          if (currentPage.length > 0) {
            pages.push({
              index: pageIndex++,
              content: [...currentPage],
            })
            currentPage = []
          }
        } else {
          currentPage.push(item)
        }
      })

      if (currentPage.length > 0) {
        pages.push({
          index: pageIndex,
          content: currentPage,
        })
      }
    }

    // 分块处理
    if (options?.enableChunking && text) {
      const chunkResults = this.chunkDocument(text, options.chunkSize, options.chunkOverlap)
      chunks = chunkResults
    }

    return {
      metadata,
      content,
      pages,
      text,
      chunks,
      parseTime: Date.now() - startTime,
      success: true,
    }
  }
}

/**
 * 文本文件解析器
 */
export class TextDocumentParser extends BaseDocumentParser {
  supportedTypes = [DocumentType.TEXT]

  async parse(
    file: File | ArrayBuffer | string,
    options?: ParseOptions
  ): Promise<DocumentParseResult> {
    try {
      let text = ''

      if (file instanceof File) {
        text = await file.text()
      } else if (typeof file === 'string') {
        // 在浏览器环境中，无法直接读取文件系统
        // 假设传入的是文本内容
        text = file
      } else {
        text = new TextDecoder('utf-8').decode(file)
      }

      const metadata = await this.parseMetadata(file)
      metadata.wordCount = text.split(/\s+/).length
      metadata.charCount = text.length

      const content: DocumentContent[] = [
        {
          type: ContentType.TEXT,
          text,
        },
      ]

      // 文本解析器默认提取文本
      const mergedOptions = { extractText: true, ...options }
      return await this.createParseResult(metadata, content, mergedOptions)
    } catch (error) {
      logger.error('Failed to parse text document:', error)
      const metadata = await this.parseMetadata(file)
      return {
        metadata,
        content: [],
        parseTime: 0,
        success: false,
        error: error instanceof Error ? error.message : 'Failed to parse text document',
      }
    }
  }

  async parseMetadata(file: File | ArrayBuffer | string): Promise<DocumentMetadata> {
    const metadata = await super.parseMetadata(file)
    // 文本解析器强制将类型设为 TEXT
    metadata.type = DocumentType.TEXT
    return metadata
  }
}

/**
 * 文档解析器注册表实现
 */
export class DefaultDocumentParserRegistry implements DocumentParserRegistry {
  private parsers: Map<DocumentType, DocumentParser> = new Map()

  /**
   * 检测文档类型
   */
  async detectType(file: File | ArrayBuffer | string): Promise<DocumentType> {
    if (typeof file === 'string') {
      // 根据文件扩展名检测
      const extension = file.toLowerCase().split('.').pop()
      switch (extension) {
        case 'pdf':
          return DocumentType.PDF
        case 'doc':
        case 'docx':
          return DocumentType.WORD
        case 'xls':
        case 'xlsx':
          return DocumentType.EXCEL
        case 'ppt':
        case 'pptx':
          return DocumentType.POWERPOINT
        case 'txt':
        case 'md':
        case 'html':
        case 'htm':
          return DocumentType.TEXT
        case 'jpg':
        case 'jpeg':
        case 'png':
        case 'gif':
        case 'webp':
          return DocumentType.IMAGE
        default:
          return DocumentType.UNKNOWN
      }
    } else if (file instanceof File) {
      // 根据文件 MIME 类型检测
      const mimeType = file.type
      if (mimeType.includes('pdf')) {
        return DocumentType.PDF
      } else if (mimeType.includes('word') || mimeType.includes('document')) {
        return DocumentType.WORD
      } else if (mimeType.includes('excel') || mimeType.includes('sheet')) {
        return DocumentType.EXCEL
      } else if (mimeType.includes('powerpoint') || mimeType.includes('presentation')) {
        return DocumentType.POWERPOINT
      } else if (mimeType.includes('text')) {
        return DocumentType.TEXT
      } else if (mimeType.includes('image')) {
        return DocumentType.IMAGE
      } else {
        return DocumentType.UNKNOWN
      }
    } else {
      // ArrayBuffer 类型，需要进一步分析
      return DocumentType.UNKNOWN
    }
  }

  /**
   * 注册解析器
   */
  registerParser(parser: DocumentParser): void {
    parser.supportedTypes.forEach(type => {
      this.parsers.set(type, parser)
      logger.info(`Registered parser for ${type}`)
    })
  }

  /**
   * 获取解析器
   */
  getParser(type: DocumentType): DocumentParser | undefined {
    return this.parsers.get(type)
  }

  /**
   * 根据文件获取合适的解析器
   */
  async getParserForFile(file: File | ArrayBuffer | string): Promise<DocumentParser | undefined> {
    // 首先尝试检测文档类型
    // 创建一个具体的解析器实例来检测类型
    const type = await this.detectType(file)

    // 根据类型获取解析器
    const parser = this.getParser(type)
    if (parser) {
      return parser
    }

    // 如果没有找到特定类型的解析器，尝试使用文本解析器作为后备
    return this.getParser(DocumentType.TEXT)
  }

  /**
   * 获取所有支持的文档类型
   */
  getSupportedTypes(): DocumentType[] {
    return Array.from(this.parsers.keys())
  }

  /**
   * 解析文档（自动选择解析器）
   */
  async parse(
    file: File | ArrayBuffer | string,
    options?: ParseOptions
  ): Promise<DocumentParseResult> {
    // 检查是否启用缓存
    if (options?.enableCache) {
      const cacheKey = cacheManager.generateKey(file)
      const cachedResult = cacheManager.get(cacheKey)
      if (cachedResult) {
        logger.info('Cache hit for document parsing')
        return cachedResult
      }
    }

    const parser = await this.getParserForFile(file)
    if (parser) {
      const result = await parser.parse(file, options)

      // 缓存结果
      if (options?.enableCache && result.success) {
        const cacheKey = cacheManager.generateKey(file)
        cacheManager.set(cacheKey, result, options.cacheExpiry)
        logger.info('Document parsing result cached')
      }

      return result
    }

    // 如果没有找到解析器，返回错误
    // 创建元数据
    const metadata: DocumentMetadata = {
      name:
        typeof file === 'string'
          ? file.split('/').pop() || 'Unknown'
          : file instanceof File
            ? file.name
            : 'Unknown',
      type: DocumentType.UNKNOWN,
      size: typeof file === 'string' ? 0 : file instanceof File ? file.size : file.byteLength,
      createdAt: new Date(),
      modifiedAt: new Date(),
    }
    return {
      metadata,
      content: [],
      parseTime: 0,
      success: false,
      error: 'No suitable parser found for this document type',
    }
  }
}

/**
 * 全局文档解析器注册表实例
 */
export const documentParserRegistry = new DefaultDocumentParserRegistry()

// 注册默认解析器
documentParserRegistry.registerParser(new TextDocumentParser())

/**
 * PDF 文档解析器
 */
export class PDFDocumentParser extends BaseDocumentParser {
  supportedTypes = [DocumentType.PDF]

  async parse(
    file: File | ArrayBuffer | string,
    options?: ParseOptions
  ): Promise<DocumentParseResult> {
    try {
      console.log('[PDFDocumentParser.parse] Starting PDF document parsing')

      let buffer: Buffer | ArrayBuffer

      if (file instanceof File) {
        console.log(
          '[PDFDocumentParser.parse] Processing File object:',
          file.name,
          file.size,
          file.type
        )
        buffer = await file.arrayBuffer()
        console.log('[PDFDocumentParser.parse] File converted to ArrayBuffer')
      } else if (typeof file === 'string') {
        // 在浏览器环境中，无法直接读取文件系统
        throw new Error('File path not supported in browser environment')
      } else {
        console.log('[PDFDocumentParser.parse] Processing ArrayBuffer:', file.byteLength)
        buffer = file
      }

      // 确保传入 ArrayBuffer
      let arrayBuffer: ArrayBuffer
      if (buffer instanceof ArrayBuffer) {
        arrayBuffer = buffer
      } else if (ArrayBuffer.isView(buffer)) {
        // TypedArray (Uint8Array, etc.)
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const view = buffer as any
        arrayBuffer = view.buffer.slice(view.byteOffset, view.byteOffset + view.byteLength)
      } else {
        throw new Error('Invalid buffer type')
      }

      // 转换 PDF 为图片
      console.log('[PDFDocumentParser.parse] Calling pdfToImages...')
      const images = await this.pdfToImages(arrayBuffer, {
        dpi: 150,
        format: 'png',
        maxPages: typeof options?.maxPages === 'number' ? options.maxPages : 10,
        startPage: options?.startPage,
        endPage: options?.endPage,
      })
      console.log(
        '[PDFDocumentParser.parse] pdfToImages completed,',
        images.length,
        'images generated'
      )

      const metadata = await this.parseMetadata(file)
      metadata.pageCount = images.length

      const content: DocumentContent[] = []

      // 添加图片到内容
      images.forEach((imageBase64, index) => {
        content.push({
          type: ContentType.IMAGE,
          url: `data:image/png;base64,${imageBase64}`,
          width: 800,
          height: 1000,
          alt: `Page ${index + 1}`,
          title: `Page ${index + 1}`,
          format: 'png',
        })
      })

      console.log('[PDFDocumentParser.parse] Creating parse result...')
      const result = await this.createParseResult(metadata, content, options)
      console.log('[PDFDocumentParser.parse] Parse result created successfully')
      return result
    } catch (error) {
      console.error('[PDFDocumentParser.parse] Failed to parse PDF document:', error)
      logger.error('Failed to parse PDF document:', error)
      const metadata = await this.parseMetadata(file)
      return {
        metadata,
        content: [],
        parseTime: 0,
        success: false,
        error: error instanceof Error ? error.message : 'Failed to parse PDF document',
      }
    }
  }
}

/**
 * Word 文档解析器
 */
export class WordDocumentParser extends BaseDocumentParser {
  supportedTypes = [DocumentType.WORD]

  async parse(
    file: File | ArrayBuffer | string,
    options?: ParseOptions
  ): Promise<DocumentParseResult> {
    try {
      // 检查是否为 .doc 文件（旧版 Word 格式）
      if (file instanceof File) {
        if (file.name.toLowerCase().endsWith('.doc')) {
          const metadata = await this.parseMetadata(file)
          return {
            metadata,
            content: [],
            parseTime: 0,
            success: false,
            error: 'Old .doc format is not supported. Please use .docx format instead.',
          }
        }
      } else if (typeof file === 'string') {
        if (file.toLowerCase().endsWith('.doc')) {
          const metadata = await this.parseMetadata(file)
          return {
            metadata,
            content: [],
            parseTime: 0,
            success: false,
            error: 'Old .doc format is not supported. Please use .docx format instead.',
          }
        }
      }

      let buffer: ArrayBuffer

      if (file instanceof File) {
        buffer = await file.arrayBuffer()
      } else if (typeof file === 'string') {
        // 在浏览器环境中，无法直接读取文件系统
        throw new Error('File path not supported in browser environment')
      } else {
        buffer = file
      }

      // 使用 mammoth.js 解析 Word 文档
      const result = await mammoth.extractRawText({ arrayBuffer: buffer })
      const text = result.value

      const metadata = await this.parseMetadata(file)
      metadata.wordCount = text.split(/\s+/).length
      metadata.charCount = text.length

      const content: DocumentContent[] = [
        {
          type: ContentType.TEXT,
          text,
        },
      ]

      return await this.createParseResult(metadata, content, options)
    } catch (error) {
      logger.error('Failed to parse Word document:', error)
      const metadata = await this.parseMetadata(file)
      return {
        metadata,
        content: [],
        parseTime: 0,
        success: false,
        error: error instanceof Error ? error.message : 'Failed to parse Word document',
      }
    }
  }
}

/**
 * Excel 文档解析器
 */
export class ExcelDocumentParser extends BaseDocumentParser {
  supportedTypes = [DocumentType.EXCEL]

  async parse(
    file: File | ArrayBuffer | string,
    options?: ParseOptions
  ): Promise<DocumentParseResult> {
    try {
      let buffer: ArrayBuffer

      if (file instanceof File) {
        buffer = await file.arrayBuffer()
      } else if (typeof file === 'string') {
        // 在浏览器环境中，无法直接读取文件系统
        throw new Error('File path not supported in browser environment')
      } else {
        buffer = file
      }

      // 使用 xlsx 库解析 Excel
      const workbook = XLSX.read(buffer)
      const firstSheetName = workbook.SheetNames[0]
      const worksheet = workbook.Sheets[firstSheetName]
      const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 })

      const metadata = await this.parseMetadata(file)
      metadata.pageCount = workbook.SheetNames.length

      const content: DocumentContent[] = [
        {
          type: ContentType.TABLE,
          rows: jsonData as string[][],
        },
      ]

      // 提取文本内容
      const textContent = jsonData.flat().join(' ')
      content.push({
        type: ContentType.TEXT,
        text: textContent,
      })

      return await this.createParseResult(metadata, content, options)
    } catch (error) {
      logger.error('Failed to parse Excel document:', error)
      const metadata = await this.parseMetadata(file)
      return {
        metadata,
        content: [],
        parseTime: 0,
        success: false,
        error: error instanceof Error ? error.message : 'Failed to parse Excel document',
      }
    }
  }
}

/**
 * PowerPoint 文档解析器
 * 使用 JSZip 解析 pptx 文件（pptx 实际上是一个 zip 文件）
 */
export class PowerPointDocumentParser extends BaseDocumentParser {
  supportedTypes = [DocumentType.POWERPOINT]

  async parse(
    file: File | ArrayBuffer | string,
    options?: ParseOptions
  ): Promise<DocumentParseResult> {
    try {
      let buffer: ArrayBuffer

      if (file instanceof File) {
        buffer = await file.arrayBuffer()
      } else if (typeof file === 'string') {
        // 在浏览器环境中，无法直接读取文件系统
        throw new Error('File path not supported in browser environment')
      } else {
        buffer = file
      }

      // 使用 JSZip 解析 pptx 文件
      const zip = await JSZip.loadAsync(buffer)

      const metadata = await this.parseMetadata(file)

      // 提取幻灯片数量（通过计算 slide 文件数量）
      let slideCount = 0
      zip.forEach(relativePath => {
        if (relativePath.match(/ppt\/slides\/slide\d+\.xml/)) {
          slideCount++
        }
      })
      metadata.pageCount = slideCount

      // 提取所有幻灯片的文本内容
      const content: DocumentContent[] = []
      let fullText = ''

      // 按顺序处理每个幻灯片
      for (let i = 1; i <= slideCount; i++) {
        const slidePath = `ppt/slides/slide${i}.xml`
        const slideFile = zip.file(slidePath)

        if (slideFile) {
          const slideXml = await slideFile.async('text')
          const slideText = this.extractTextFromSlideXml(slideXml)

          const slideContent = `幻灯片 ${i}:\n${slideText}\n`
          fullText += slideContent + '---\n'

          content.push({
            type: ContentType.TEXT,
            text: slideContent,
          })
        }
      }

      // 添加完整的文本内容
      if (fullText) {
        content.unshift({
          type: ContentType.TEXT,
          text: fullText,
        })
      }

      // 尝试提取文档属性
      const appXml = zip.file('docProps/app.xml')
      if (appXml) {
        const appProps = await appXml.async('text')
        const titleMatch = appProps.match(/<Title>([^<]*)<\/Title>/)
        if (titleMatch && titleMatch[1]) {
          metadata.title = titleMatch[1]
        }
      }

      metadata.wordCount = fullText.split(/\s+/).filter(Boolean).length
      metadata.charCount = fullText.length

      return await this.createParseResult(metadata, content, options)
    } catch (error) {
      logger.error('Failed to parse PowerPoint document:', error)
      const metadata = await this.parseMetadata(file)
      return {
        metadata,
        content: [],
        parseTime: 0,
        success: false,
        error: error instanceof Error ? error.message : 'Failed to parse PowerPoint document',
      }
    }
  }

  /**
   * 从幻灯片 XML 中提取文本
   */
  private extractTextFromSlideXml(xml: string): string {
    const texts: string[] = []

    // 匹配所有的 <a:t> 标签（文本内容）
    const textMatches = xml.match(/<a:t>([^<]*)<\/a:t>/g)
    if (textMatches) {
      textMatches.forEach(match => {
        const text = match.replace(/<a:t>([^<]*)<\/a:t>/, '$1')
        if (text.trim()) {
          texts.push(text)
        }
      })
    }

    return texts.join('\n')
  }
}

/**
 * 图像文档解析器
 */
export class ImageDocumentParser extends BaseDocumentParser {
  supportedTypes = [DocumentType.IMAGE]

  async parse(
    file: File | ArrayBuffer | string,
    options?: ParseOptions
  ): Promise<DocumentParseResult> {
    try {
      let imageUrl = ''

      if (file instanceof File) {
        imageUrl = URL.createObjectURL(file)
      } else if (typeof file === 'string') {
        imageUrl = file
      } else {
        // 将 ArrayBuffer 转换为 data URL
        const blob = new Blob([file])
        imageUrl = URL.createObjectURL(blob)
      }

      const metadata = await this.parseMetadata(file)

      const content: DocumentContent[] = [
        {
          type: ContentType.IMAGE,
          url: imageUrl,
        },
      ]

      // 如果启用了 OCR，执行 OCR 处理
      if (options?.enableOCR) {
        const ocrText = await this.performOCR(file, options.ocrLanguage)
        content.push({
          type: ContentType.TEXT,
          text: ocrText,
        })
      }

      return await this.createParseResult(metadata, content, options)
    } catch (error) {
      logger.error('Failed to parse image document:', error)
      const metadata = await this.parseMetadata(file)
      return {
        metadata,
        content: [],
        parseTime: 0,
        success: false,
        error: error instanceof Error ? error.message : 'Failed to parse image document',
      }
    }
  }
}

/**
 * Markdown 文档解析器
 */
export class MarkdownDocumentParser extends BaseDocumentParser {
  supportedTypes = [DocumentType.TEXT]

  async parse(
    file: File | ArrayBuffer | string,
    options?: ParseOptions
  ): Promise<DocumentParseResult> {
    try {
      let text = ''

      if (file instanceof File) {
        text = await file.text()
      } else if (typeof file === 'string') {
        text = file
      } else {
        text = new TextDecoder('utf-8').decode(file)
      }

      const metadata = await this.parseMetadata(file)
      metadata.wordCount = text.split(/\s+/).length
      metadata.charCount = text.length

      // 提取Markdown中的标题、列表等结构
      const content: DocumentContent[] = [
        {
          type: ContentType.TEXT,
          text,
        },
      ]

      return await this.createParseResult(metadata, content, options)
    } catch (error) {
      logger.error('Failed to parse Markdown document:', error)
      const metadata = await this.parseMetadata(file)
      return {
        metadata,
        content: [],
        parseTime: 0,
        success: false,
        error: error instanceof Error ? error.message : 'Failed to parse Markdown document',
      }
    }
  }
}

// 注册其他解析器
documentParserRegistry.registerParser(new PDFDocumentParser())
documentParserRegistry.registerParser(new WordDocumentParser())
documentParserRegistry.registerParser(new ExcelDocumentParser())
documentParserRegistry.registerParser(new PowerPointDocumentParser())
documentParserRegistry.registerParser(new ImageDocumentParser())
documentParserRegistry.registerParser(new MarkdownDocumentParser())

/**
 * 文档解析工具类
 */
export class DocumentParserUtil {
  /**
   * 解析文档
   */
  static async parse(
    file: File | ArrayBuffer | string,
    options?: ParseOptions
  ): Promise<DocumentParseResult> {
    return documentParserRegistry.parse(file, options)
  }

  /**
   * 提取纯文本
   */
  static async extractText(
    file: File | ArrayBuffer | string,
    options?: ParseOptions
  ): Promise<string> {
    const result = await this.parse(file, { ...options, extractText: true })
    return result.text || ''
  }

  /**
   * 提取表格
   */
  static async extractTables(
    file: File | ArrayBuffer | string,
    options?: ParseOptions
  ): Promise<TableContent[]> {
    const result = await this.parse(file, { ...options, extractTables: true })
    return result.content.filter((item): item is TableContent => item.type === ContentType.TABLE)
  }

  /**
   * 提取图片
   */
  static async extractImages(
    file: File | ArrayBuffer | string,
    options?: ParseOptions
  ): Promise<ImageContent[]> {
    const result = await this.parse(file, { ...options, extractImages: true })
    return result.content.filter((item): item is ImageContent => item.type === ContentType.IMAGE)
  }

  /**
   * 分块处理文档
   */
  static chunkDocument(
    content: string,
    chunkSize: number = 2000,
    chunkOverlap: number = 200
  ): { text: string; startIndex: number; endIndex: number }[] {
    const chunks: { text: string; startIndex: number; endIndex: number }[] = []
    let startIndex = 0

    while (startIndex < content.length) {
      const endIndex = Math.min(startIndex + chunkSize, content.length)
      const chunk = content.substring(startIndex, endIndex)
      chunks.push({ text: chunk, startIndex, endIndex })
      startIndex = endIndex - chunkOverlap
      if (startIndex >= content.length - chunkOverlap) {
        break
      }
    }

    return chunks
  }

  /**
   * 获取支持的文档类型
   */
  static getSupportedTypes(): DocumentType[] {
    return documentParserRegistry.getSupportedTypes()
  }

  /**
   * 注册自定义解析器
   */
  static registerParser(parser: DocumentParser): void {
    documentParserRegistry.registerParser(parser)
  }
}

export default DocumentParserUtil
