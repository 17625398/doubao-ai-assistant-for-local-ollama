/**
 * ChatClaw 文档处理服务
 * 实现ChatClaw的文档处理能力，包括文档上传、知识库管理、文档分块和嵌入、文档搜索等功能
 */
import { documentParserRegistry } from '../document-parsers'
import { DocumentType, DocumentParseResult, ParseOptions } from '../types/document'
import { logger } from '../utils/logger'
import {
  DocumentErrorDiagnoser,
  DiagnosticResult,
  DocumentErrorType,
  ErrorSeverity,
} from '../utils/document-error-diagnoser'
import { openKBService } from './openkb-service'
import { openKBSandboxService } from './openkb-sandbox-service'

/**
 * 支持的文件格式
 */
const SUPPORTED_FORMATS = {
  'application/pdf': { name: 'PDF', ext: '.pdf' },
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': {
    name: 'Word (DOCX)',
    ext: '.docx',
  },
  'application/msword': { name: 'Word (DOC)', ext: '.doc' },
  'text/plain': { name: '文本文件', ext: '.txt' },
  'text/markdown': { name: 'Markdown', ext: '.md' },
  'text/html': { name: 'HTML', ext: '.html' },
  'application/epub+zip': { name: 'EPUB', ext: '.epub' },
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': {
    name: 'Excel (XLSX)',
    ext: '.xlsx',
  },
  'application/vnd.ms-excel': { name: 'Excel (XLS)', ext: '.xls' },
  'text/csv': { name: 'CSV', ext: '.csv' },
  'application/rtf': { name: 'RTF', ext: '.rtf' },
}

/**
 * 文件大小限制（10MB）
 */
const MAX_FILE_SIZE = 10 * 1024 * 1024

export class ChatClawDocumentService {
  private knowledgeBase: any[] = []
  private documentEmbeddings: Map<string, any[]> = new Map()

  /**
   * 验证文件
   * @param file 文件对象
   * @param fileName 文件名
   * @returns 验证结果
   */
  private validateFile(file: File, fileName: string): { valid: boolean; error?: DiagnosticResult } {
    // 检查文件是否存在
    if (!file) {
      return {
        valid: false,
        error: DocumentErrorDiagnoser.diagnose(new Error('文件对象为空'), fileName, 0),
      }
    }

    // 检查文件名
    if (!fileName || fileName.trim() === '') {
      return {
        valid: false,
        error: DocumentErrorDiagnoser.diagnose(new Error('文件名为空'), fileName, file.size),
      }
    }

    // 检查文件大小
    if (file.size > MAX_FILE_SIZE) {
      return {
        valid: false,
        error: DocumentErrorDiagnoser.diagnose(
          new Error(`文件大小超过限制: ${file.size} > ${MAX_FILE_SIZE}`),
          fileName,
          file.size
        ),
      }
    }

    // 检查文件类型
    const fileExtension = '.' + fileName.split('.').pop()?.toLowerCase()
    const mimeType = file.type || this.guessMimeType(fileName)

    const isSupportedType =
      SUPPORTED_FORMATS[mimeType as keyof typeof SUPPORTED_FORMATS] ||
      Object.values(SUPPORTED_FORMATS).some(f => f.ext === fileExtension)

    if (!isSupportedType) {
      return {
        valid: false,
        error: DocumentErrorDiagnoser.diagnose(
          new Error(`不支持的文件格式: ${fileExtension || mimeType}`),
          fileName,
          file.size
        ),
      }
    }

    return { valid: true }
  }

  /**
   * 猜测文件的MIME类型
   */
  private guessMimeType(fileName: string): string {
    const extension = fileName.split('.').pop()?.toLowerCase()
    const mimeMap: Record<string, string> = {
      pdf: 'application/pdf',
      docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      doc: 'application/msword',
      txt: 'text/plain',
      md: 'text/markdown',
      html: 'text/html',
      htm: 'text/html',
      epub: 'application/epub+zip',
      xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      xls: 'application/vnd.ms-excel',
      csv: 'text/csv',
      rtf: 'application/rtf',
    }
    return mimeMap[extension || ''] || 'application/octet-stream'
  }

  /**
   * 获取支持的文件格式列表
   */
  getSupportedFormats(): string[] {
    return Object.values(SUPPORTED_FORMATS).map(f => f.name + f.ext)
  }

  /**
   * 获取文件大小限制
   */
  getMaxFileSize(): number {
    return MAX_FILE_SIZE
  }

  /**
   * 上传文档到知识库
   * @param file 文件对象
   * @param fileName 文件名
   * @param options 上传选项
   */
  async uploadDocument(
    file: File,
    fileName: string,
    options: { addToOpenKB?: boolean } = {}
  ): Promise<any> {
    const startTime = Date.now()
    logger.info(`开始上传文档: ${fileName}`, {
      fileSize: file?.size,
      mimeType: file?.type,
    })

    // 判断是否是 PDF 文件（提前定义，后续多处使用）
    const isPDF = file.type === 'application/pdf' || fileName.toLowerCase().endsWith('.pdf')

    try {
      // 验证文件
      const validation = this.validateFile(file, fileName)
      if (!validation.valid && validation.error) {
        logger.error('文件验证失败:', validation.error)
        console.error(
          'Document Upload Error:\n' + DocumentErrorDiagnoser.toLogFormat(validation.error)
        )
        return {
          success: false,
          error: validation.error.message,
          errorType: validation.error.errorType,
          severity: validation.error.severity,
          suggestion: validation.error.suggestion,
          diagnostic: validation.error,
        }
      }

      // 解析文档
      // 注意：PDF 文件禁用 OCR，直接上传到 OpenKB 知识库处理
      const parseOptions: ParseOptions = {
        extractText: true,
        enableChunking: true,
        chunkSize: 1000,
        chunkOverlap: 100,
        enableOCR: !isPDF, // PDF 禁用 OCR，其他类型保持启用
        enableCache: false,
      }

      logger.info(`开始解析文档: ${fileName}`)
      const parseResult = await documentParserRegistry.parse(file, parseOptions)

      if (!parseResult.success) {
        const diagnostic = DocumentErrorDiagnoser.diagnose(
          new Error(parseResult.error || '文档解析失败'),
          fileName,
          file.size
        )
        logger.error('文档解析失败:', diagnostic)
        console.error('Document Parse Error:\n' + DocumentErrorDiagnoser.toLogFormat(diagnostic))
        return {
          success: false,
          error: diagnostic.message,
          errorType: diagnostic.errorType,
          severity: diagnostic.severity,
          suggestion: diagnostic.suggestion,
          diagnostic,
        }
      }

      // 检查解析结果
      if (!parseResult.text || parseResult.text.trim() === '') {
        const diagnostic = DocumentErrorDiagnoser.diagnose(
          new Error('文档内容为空'),
          fileName,
          file.size
        )
        logger.error('文档内容为空:', diagnostic)
        return {
          success: false,
          error: '文档内容为空，无法上传',
          errorType: DocumentErrorType.PARSING_FAILED,
          severity: ErrorSeverity.MEDIUM,
          suggestion: '请确保文档包含可提取的文本内容。扫描件或图片文件可能需要OCR功能。',
          diagnostic,
        }
      }

      // 清洗文档内容
      const cleanedText = this.cleanTextData(parseResult.text)
      const cleanedChunks =
        parseResult.chunks?.map(chunk => ({
          ...chunk,
          text: this.cleanTextData(chunk.text),
        })) || []

      // 创建文档对象
      const document = {
        id: `doc-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        title: fileName,
        content: cleanedText,
        chunks: cleanedChunks,
        metadata: parseResult.metadata,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }

      // 添加到知识库
      this.knowledgeBase.push(document)

      // 生成文档嵌入
      this.generateEmbeddings(document)

      // 检测运行环境
      const isNodeEnvironment = typeof process !== 'undefined' && process.versions?.node

      // PDF 自动转入 OpenKB 知识库（isPDF 已在函数开头定义）
      const shouldAddToOpenKB = isPDF || options.addToOpenKB

      // 将文档添加到 OpenKB 知识库（仅在 Node.js 环境中）
      let openKBResult: {
        success: boolean
        documentId?: string
        summaryPath?: string
        error?: string
      } | null = null

      if (shouldAddToOpenKB) {
        if (isNodeEnvironment) {
          logger.info(`正在将文档添加到 OpenKB: ${fileName}${isPDF ? ' (PDF 自动转入)' : ''}`)
          try {
            // 将 File 对象保存到临时文件
            const tempFilePath = await this.saveFileToTemp(file, fileName)
            openKBResult = await openKBService.addDocument(tempFilePath)

            if (openKBResult.success) {
              logger.info(`文档已成功添加到 OpenKB: ${fileName}`, {
                documentId: openKBResult.documentId,
                summaryPath: openKBResult.summaryPath,
              })

              // 如果是 PDF 且页数超过阈值，构建 PageIndex
              if (isPDF && parseResult.metadata.pageCount) {
                const shouldUsePageIndex = openKBService.shouldUsePageIndex(
                  parseResult.metadata.pageCount
                )
                if (shouldUsePageIndex) {
                  logger.info(`PDF 页数 ${parseResult.metadata.pageCount}，将构建 PageIndex 索引`)
                  // PageIndex 将在 OpenKB 处理过程中自动构建
                }
              }
            } else {
              logger.warn(`添加文档到 OpenKB 失败: ${fileName}`, {
                error: openKBResult.error,
              })
            }
          } catch (openKBError) {
            logger.error(`添加文档到 OpenKB 时出错: ${fileName}`, openKBError)
            openKBResult = {
              success: false,
              error: openKBError instanceof Error ? openKBError.message : 'Unknown error',
            }
          }
        } else {
          // 浏览器环境：使用沙箱服务
          logger.info(`浏览器环境，使用 OpenKB 沙箱服务: ${fileName}`)
          try {
            // 1. 上传文件到沙箱
            const uploadResult = await openKBSandboxService.uploadFile(file)
            if (!uploadResult.success || !uploadResult.fileId) {
              throw new Error(uploadResult.error || 'Upload to sandbox failed')
            }

            // 2. 通过沙箱服务添加到 OpenKB
            openKBResult = await openKBSandboxService.addDocument(uploadResult.fileId, fileName)

            if (openKBResult.success) {
              logger.info(`文档已通过沙箱添加到 OpenKB: ${fileName}`, {
                documentId: openKBResult.documentId,
              })
            } else {
              logger.warn(`沙箱添加文档到 OpenKB 失败: ${fileName}`, {
                error: openKBResult.error,
              })
            }
          } catch (sandboxError) {
            logger.error(`沙箱服务出错: ${fileName}`, sandboxError)
            openKBResult = {
              success: false,
              error: sandboxError instanceof Error ? sandboxError.message : 'Sandbox error',
            }
          }
        }
      }

      const duration = Date.now() - startTime
      logger.info(`文档上传成功: ${fileName}`, {
        duration: `${duration}ms`,
        chunks: document.chunks.length,
        contentLength: document.content.length,
        openKBAdded: options.addToOpenKB && openKBResult?.success,
      })

      return {
        success: true,
        document: {
          id: document.id,
          title: document.title,
          size: document.metadata.size,
          type: document.metadata.type,
          chunks: document.chunks.length,
          createdAt: document.createdAt,
        },
        openKB: openKBResult?.success
          ? {
              added: true,
              documentId: openKBResult.documentId,
              summaryPath: openKBResult.summaryPath,
            }
          : { added: false, error: openKBResult?.error },
      }
    } catch (error) {
      const diagnostic = DocumentErrorDiagnoser.diagnose(error, fileName, file?.size)
      logger.error('文档上传失败:', diagnostic)
      console.error('Document Upload Error:\n' + DocumentErrorDiagnoser.toLogFormat(diagnostic))

      return {
        success: false,
        error: diagnostic.message,
        errorType: diagnostic.errorType,
        severity: diagnostic.severity,
        suggestion: diagnostic.suggestion,
        diagnostic,
      }
    }
  }

  /**
   * 搜索知识库
   * @param query 搜索查询
   * @param limit 结果数量限制
   */
  async searchKnowledge(query: string, limit: number = 5): Promise<any> {
    try {
      // 简单的文本匹配搜索
      const results = this.knowledgeBase
        .flatMap(document => {
          // 检查文档内容是否包含查询
          if (document.content.toLowerCase().includes(query.toLowerCase())) {
            return [
              {
                id: document.id,
                title: document.title,
                content: document.content,
                score: this.calculateScore(document.content, query),
                metadata: document.metadata,
              },
            ]
          }

          // 检查文档分块是否包含查询
          return document.chunks
            .filter((chunk: any) => chunk.text.toLowerCase().includes(query.toLowerCase()))
            .map((chunk: any) => ({
              id: `${document.id}-chunk-${chunk.startIndex}`,
              title: document.title,
              content: chunk.text,
              score: this.calculateScore(chunk.text, query),
              metadata: document.metadata,
            }))
        })
        .sort((a, b) => b.score - a.score)
        .slice(0, limit)

      return {
        success: true,
        results: results,
      }
    } catch (error) {
      logger.error('知识库搜索失败:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : '知识库搜索失败',
      }
    }
  }

  /**
   * 获取知识库文档列表
   */
  getKnowledgeBase(): any[] {
    return this.knowledgeBase.map(document => ({
      id: document.id,
      title: document.title,
      size: document.metadata.size,
      type: document.metadata.type,
      chunks: document.chunks.length,
      createdAt: document.createdAt,
      updatedAt: document.updatedAt,
    }))
  }

  /**
   * 根据ID获取文档
   * @param documentId 文档ID
   */
  getDocument(documentId: string): any {
    return this.knowledgeBase.find(doc => doc.id === documentId)
  }

  /**
   * 删除文档
   * @param documentId 文档ID
   */
  deleteDocument(documentId: string): any {
    try {
      const index = this.knowledgeBase.findIndex(doc => doc.id === documentId)
      if (index !== -1) {
        this.knowledgeBase.splice(index, 1)
        this.documentEmbeddings.delete(documentId)
        return {
          success: true,
        }
      } else {
        return {
          success: false,
          error: '文档不存在',
        }
      }
    } catch (error) {
      logger.error('文档删除失败:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : '文档删除失败',
      }
    }
  }

  /**
   * 将 File 对象保存到临时文件
   * @param file 文件对象
   * @param fileName 文件名
   */
  private async saveFileToTemp(file: File, fileName: string): Promise<string> {
    // 检测运行环境
    const isNodeEnvironment = typeof process !== 'undefined' && process.versions?.node

    if (isNodeEnvironment) {
      // Node.js 环境：使用 fs 模块
      const fs = await import('fs')
      const path = await import('path')
      const os = await import('os')

      const tempDir = os.tmpdir()
      const tempFilePath = path.join(tempDir, `openkb-${Date.now()}-${fileName}`)

      const arrayBuffer = await file.arrayBuffer()
      const buffer = Buffer.from(arrayBuffer)
      fs.writeFileSync(tempFilePath, buffer)

      return tempFilePath
    } else {
      // 浏览器环境：使用 knowledge-base/raw/ 目录
      // 由于浏览器无法直接写入文件系统，我们需要通过 API 或直接使用 File 对象
      logger.info('[saveFileToTemp] Browser environment detected, using alternative approach')

      // 在浏览器环境中，我们返回一个虚拟路径，实际文件处理由 OpenKB 通过其他方式完成
      // 或者我们可以将文件存储在 IndexedDB 或内存中
      const virtualPath = `browser://openkb-${Date.now()}-${fileName}`

      // 将文件存储在内存中，供后续使用
      this.browserFileCache = this.browserFileCache || new Map()
      this.browserFileCache.set(virtualPath, file)

      return virtualPath
    }
  }

  // 浏览器文件缓存（用于浏览器环境）
  private browserFileCache: Map<string, File> | null = null

  /**
   * 生成文档嵌入（模拟）
   * @param document 文档对象
   */
  private generateEmbeddings(document: any): void {
    // 模拟生成嵌入向量
    const embeddings = document.chunks.map((chunk: any, index: number) => ({
      chunkId: `chunk-${index}`,
      embedding: this.generateRandomEmbedding(768), // 模拟768维嵌入
      text: chunk.text,
      startIndex: chunk.startIndex,
      endIndex: chunk.endIndex,
    }))

    this.documentEmbeddings.set(document.id, embeddings)
  }

  /**
   * 生成随机嵌入向量（模拟）
   * @param dimension 嵌入维度
   */
  private generateRandomEmbedding(dimension: number): number[] {
    const embedding: number[] = []
    for (let i = 0; i < dimension; i++) {
      embedding.push(Math.random() * 2 - 1) // 生成 -1 到 1 之间的随机数
    }
    return embedding
  }

  /**
   * 计算搜索分数
   * @param text 文本
   * @param query 查询
   */
  private calculateScore(text: string, query: string): number {
    // 简单的分数计算：查询词在文本中出现的次数
    const lowerText = text.toLowerCase()
    const lowerQuery = query.toLowerCase()
    const regex = new RegExp(lowerQuery, 'g')
    const matches = lowerText.match(regex)
    return matches ? matches.length : 0
  }

  /**
   * 数据清洗函数 - 在存储到知识库前清洗文本数据
   * @param text 原始文本
   */
  private cleanTextData(text: string): string {
    if (!text) return ''

    let cleanedText = text
      // 移除多余的空白字符
      .replace(/\s+/g, ' ')
      // 移除多余的换行符
      .replace(/\n{3,}/g, '\n\n')
      // 移除首尾空白
      .trim()

    // 限制文本长度，避免超过模型上下文窗口
    const MAX_TEXT_LENGTH = 8000
    if (cleanedText.length > MAX_TEXT_LENGTH) {
      // 保留开头和结尾的内容，中间用省略号
      const head = cleanedText.substring(0, 4000)
      const tail = cleanedText.substring(cleanedText.length - 4000)
      cleanedText = head + '\n\n...（内容过长，已省略）...\n\n' + tail
    }

    return cleanedText
  }

  /**
   * 清理知识库
   */
  clearKnowledgeBase(): void {
    this.knowledgeBase = []
    this.documentEmbeddings.clear()
  }

  /**
   * 获取知识库统计信息
   */
  getKnowledgeBaseStats(): {
    documentCount: number
    totalChunks: number
    totalSize: number
  } {
    const documentCount = this.knowledgeBase.length
    const totalChunks = this.knowledgeBase.reduce((sum, doc) => sum + doc.chunks.length, 0)
    const totalSize = this.knowledgeBase.reduce((sum, doc) => sum + (doc.metadata.size || 0), 0)

    return {
      documentCount,
      totalChunks,
      totalSize,
    }
  }
}

// 导出单例
export const chatClawDocumentService = new ChatClawDocumentService()
