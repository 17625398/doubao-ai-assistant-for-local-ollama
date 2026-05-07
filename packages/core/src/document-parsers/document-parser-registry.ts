// 文档解析器注册表

import {
  DocumentType,
  DocumentParseResult,
  ParseOptions,
  DocumentParser,
  DocumentParserRegistry,
} from '../types/document'
import { logger } from '../utils/logger'
import { cacheManager } from '../utils/cache-manager'
import { TextDocumentParser } from './text-document-parser'
import { PDFDocumentParser } from './pdf-document-parser'
import { WordDocumentParser } from './word-document-parser'
import { ExcelDocumentParser } from './excel-document-parser'
import { PowerPointDocumentParser } from './powerpoint-document-parser'
import { ImageDocumentParser } from './image-document-parser'
import { MarkdownDocumentParser } from './markdown-document-parser'
import { LinkMindDocumentParser } from './linkmind-document-parser'

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
        case 'rtf':
        case 'odt':
          return DocumentType.WORD
        case 'xls':
        case 'xlsx':
        case 'csv':
        case 'tsv':
        case 'ods':
          return DocumentType.EXCEL
        case 'ppt':
        case 'pptx':
        case 'odp':
          return DocumentType.POWERPOINT
        case 'txt':
        case 'md':
        case 'html':
        case 'htm':
        case 'json':
        case 'xml':
        case 'yaml':
        case 'yml':
          return DocumentType.TEXT
        case 'jpg':
        case 'jpeg':
        case 'png':
        case 'gif':
        case 'webp':
        case 'bmp':
        case 'tiff':
        case 'svg':
          return DocumentType.IMAGE
        default:
          return DocumentType.UNKNOWN
      }
    } else if (file instanceof File) {
      // 根据文件 MIME 类型检测
      const mimeType = file.type
      if (mimeType.includes('pdf')) {
        return DocumentType.PDF
      } else if (mimeType.includes('word') || mimeType.includes('document') || mimeType.includes('rtf') || mimeType.includes('odt')) {
        return DocumentType.WORD
      } else if (mimeType.includes('excel') || mimeType.includes('sheet') || mimeType.includes('csv') || mimeType.includes('tsv') || mimeType.includes('ods')) {
        return DocumentType.EXCEL
      } else if (mimeType.includes('powerpoint') || mimeType.includes('presentation') || mimeType.includes('odp')) {
        return DocumentType.POWERPOINT
      } else if (mimeType.includes('text') || mimeType.includes('json') || mimeType.includes('xml') || mimeType.includes('yaml')) {
        return DocumentType.TEXT
      } else if (mimeType.includes('image')) {
        return DocumentType.IMAGE
      } else {
        // 如果 MIME 类型为空，根据文件扩展名检测
        const extension = file.name.toLowerCase().split('.').pop()
        switch (extension) {
          case 'pdf':
            return DocumentType.PDF
          case 'doc':
          case 'docx':
          case 'rtf':
          case 'odt':
            return DocumentType.WORD
          case 'xls':
          case 'xlsx':
          case 'csv':
          case 'tsv':
          case 'ods':
            return DocumentType.EXCEL
          case 'ppt':
          case 'pptx':
          case 'odp':
            return DocumentType.POWERPOINT
          case 'txt':
          case 'md':
          case 'html':
          case 'htm':
          case 'json':
          case 'xml':
          case 'yaml':
          case 'yml':
            return DocumentType.TEXT
          case 'jpg':
          case 'jpeg':
          case 'png':
          case 'gif':
          case 'webp':
          case 'bmp':
          case 'tiff':
          case 'svg':
            return DocumentType.IMAGE
          default:
            return DocumentType.UNKNOWN
        }
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

    // 优先使用 LinkMind 兜底解析器，再回退到文本解析器
    return this.getParser(DocumentType.UNKNOWN) || this.getParser(DocumentType.TEXT)
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
    const metadata = {
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

  /**
   * 兼容旧调用：parseFile(file, options)
   */
  async parseFile(
    file: File | ArrayBuffer | string,
    options?: ParseOptions
  ): Promise<DocumentParseResult> {
    return this.parse(file, options)
  }
}

/**
 * 全局文档解析器注册表实例
 */
export const documentParserRegistry = new DefaultDocumentParserRegistry()

// 注册默认解析器
documentParserRegistry.registerParser(new TextDocumentParser())
documentParserRegistry.registerParser(new PDFDocumentParser())
documentParserRegistry.registerParser(new WordDocumentParser())
documentParserRegistry.registerParser(new ExcelDocumentParser())
documentParserRegistry.registerParser(new PowerPointDocumentParser())
documentParserRegistry.registerParser(new ImageDocumentParser())
documentParserRegistry.registerParser(new MarkdownDocumentParser())
// 注册 LinkMind 文档解析器 - 作为后备解析器
documentParserRegistry.registerParser(new LinkMindDocumentParser())
