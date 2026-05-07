/**
 * Document Analysis Service
 * 长文档分析服务，支持 PDF、Word、图片等文档的解析和分析
 * 基于 All-Model-Chat 项目的文档处理功能
 */

import { logger } from '../utils/logger'
import { eventBus } from '../utils/event-bus'
import { aiConfigManager } from '../utils/ai-config-manager'

// Ollama 配置接口
export interface OllamaConfig {
  baseUrl: string
  model: string
  temperature?: number
  maxTokens?: number
}

// Ollama 服务状态 - 优先从环境变量读取
let globalOllamaConfig: OllamaConfig = {
  baseUrl: process.env.NEXT_PUBLIC_OLLAMA_URL || process.env.OLLAMA_BASE_URL || '/api/ollama',
  model:
    (typeof process !== 'undefined' && process.env?.OLLAMA_MODEL) ||
    'huihui_ai/Qwen3.6-abliterated:27b', // 使用已安装的模型
  temperature: 0.7,
  maxTokens: 2048,
}

// 初始化配置监听 - 当 AIConfigManager 更新配置时同步到 document-analysis-service
interface AIConfigEvent {
  ollama?: {
    baseUrl?: string;
    defaultModel?: string;
    modelParams?: {
      temperature?: number;
      maxTokens?: number;
    };
  };
}

function initializeConfigSync() {
  // 监听 ai-config:changed 事件，当配置更新时同步到全局配置
  eventBus.on('ai-config:changed', (config: AIConfigEvent) => {
    if (config?.ollama) {
      globalOllamaConfig = {
        baseUrl: config.ollama.baseUrl || '/api/ollama',
        model: config.ollama.defaultModel || 'gemma4:e4b',
        temperature: config.ollama.modelParams?.temperature || 0.7,
        maxTokens: config.ollama.modelParams?.maxTokens || 2048,
      }
      logger.info(
        '[DocumentAnalysisService] Synced config from AIConfigManager',
        globalOllamaConfig
      )
    }
  })
}

// 尝试初始化配置监听（在浏览器环境中）
if (typeof window !== 'undefined') {
  // 延迟初始化，等待 aiConfigManager 加载完成
  setTimeout(() => {
    initializeConfigSync()
    // 如果 aiConfigManager 已经加载了配置，立即同步
    const ollamaConfig = aiConfigManager.getOllamaConfig()
    if (ollamaConfig) {
      globalOllamaConfig = {
        baseUrl: ollamaConfig.baseUrl || '/api/ollama',
        model: ollamaConfig.defaultModel || 'gemma4:e4b',
        temperature: ollamaConfig.modelParams?.temperature || 0.7,
        maxTokens: ollamaConfig.modelParams?.maxTokens || 2048,
      }
      logger.info(
        '[DocumentAnalysisService] Initial config loaded from AIConfigManager',
        globalOllamaConfig
      )
    }
  }, 100)
}

// 文档类型
export type DocumentType = 'pdf' | 'doc' | 'docx' | 'txt' | 'md' | 'image' | 'excel' | 'other'

// 文档信息
export interface DocumentInfo {
  name: string
  type: DocumentType
  size: number
  pageCount?: number
  mimeType: string
}

// 文档内容
export interface DocumentContent {
  info: DocumentInfo
  text: string
  pages?: Array<{
    pageNumber: number
    text: string
    images?: string[] // Base64
  }>
  metadata?: Record<string, any>
}

// 分析结果
export interface AnalysisResult {
  summary: string
  keyPoints: string[]
  topics: string[]
  sentiment?: string
  entities?: Array<{
    name: string
    type: string
  }>
  questions?: string[]
}

// 分析选项
export interface AnalysisOptions {
  includeSummary?: boolean
  includeKeyPoints?: boolean
  includeTopics?: boolean
  includeSentiment?: boolean
  includeEntities?: boolean
  includeQuestions?: boolean
  maxLength?: number
}

/**
 * Document Analysis Service 类
 */
export class DocumentAnalysisService {
  /**
   * 检测文档类型
   */
  detectDocumentType(file: File): DocumentType {
    const mimeType = file.type.toLowerCase()
    const extension = file.name.split('.').pop()?.toLowerCase() || ''

    if (mimeType.includes('pdf') || extension === 'pdf') {
      return 'pdf'
    }
    if (mimeType.includes('word') || extension === 'doc' || extension === 'docx') {
      return extension === 'doc' ? 'doc' : 'docx'
    }
    if (mimeType.includes('text') || extension === 'txt') {
      return 'txt'
    }
    if (mimeType.includes('markdown') || extension === 'md') {
      return 'md'
    }
    // Excel 文件检测
    if (
      mimeType.includes('excel') ||
      mimeType.includes('spreadsheet') ||
      mimeType.includes('sheet') ||
      ['xls', 'xlsx', 'csv', 'tsv', 'ods'].includes(extension)
    ) {
      return 'excel'
    }
    if (
      mimeType.includes('image') ||
      ['jpg', 'jpeg', 'png', 'gif', 'webp', 'bmp'].includes(extension)
    ) {
      return 'image'
    }

    return 'other'
  }

  /**
   * 解析文档
   */
  async parseDocument(file: File): Promise<DocumentContent> {
    const type = this.detectDocumentType(file)
    const info: DocumentInfo = {
      name: file.name,
      type,
      size: file.size,
      mimeType: file.type,
    }

    logger.info(`[DocumentAnalysisService] Parsing document: ${file.name}, type: ${type}`)

    switch (type) {
      case 'txt':
      case 'md':
        return this.parseTextFile(file, info)
      case 'image':
        return this.parseImageFile(file, info)
      case 'pdf':
        return this.parsePDFFile(file, info)
      case 'doc':
      case 'docx':
        return this.parseWordFile(file, info)
      case 'excel':
        return this.parseExcelFile(file, info)
      default:
        throw new Error(`Unsupported document type: ${type}`)
    }
  }

  /**
   * 解析文本文件
   */
  private async parseTextFile(file: File, info: DocumentInfo): Promise<DocumentContent> {
    const text = await file.text()
    const lines = text.split('\n')
    const pages: DocumentContent['pages'] = []

    // 简单分页（每 50 行一页）
    const linesPerPage = 50
    for (let i = 0; i < lines.length; i += linesPerPage) {
      const pageLines = lines.slice(i, i + linesPerPage)
      pages.push({
        pageNumber: Math.floor(i / linesPerPage) + 1,
        text: pageLines.join('\n'),
      })
    }

    return {
      info: {
        ...info,
        pageCount: pages.length,
      },
      text,
      pages,
    }
  }

  /**
   * 解析图片文件
   */
  private async parseImageFile(file: File, info: DocumentInfo): Promise<DocumentContent> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader()

      reader.onload = () => {
        const base64 = reader.result?.toString() || ''
        resolve({
          info,
          text: `[图片: ${file.name}]`,
          pages: [
            {
              pageNumber: 1,
              text: '',
              images: [base64],
            },
          ],
        })
      }

      reader.onerror = () => {
        reject(new Error('Failed to read image file'))
      }

      reader.readAsDataURL(file)
    })
  }

  /**
   * 解析 PDF 文件
   */
  private async parsePDFFile(file: File, info: DocumentInfo): Promise<DocumentContent> {
    logger.info('[DocumentAnalysisService] Parsing PDF with pdfjs-dist')

    try {
      // 动态导入 PDF 解析器
      const { PDFDocumentParser } = await import('../document-parsers/pdf-document-parser')
      const parser = new PDFDocumentParser()
      const result = await parser.parse(file)

      if (result.success && result.text) {
        return {
          info: {
            ...info,
            pageCount: result.metadata.pageCount,
          },
          text: result.text,
          pages: [
            {
              pageNumber: 1,
              text: result.text,
            },
          ],
          metadata: result.metadata,
        }
      }

      // 如果解析失败，返回错误信息
      const errorText = result.error || 'PDF 解析失败'
      return {
        info: {
          ...info,
          pageCount: 1,
        },
        text: errorText,
        pages: [
          {
            pageNumber: 1,
            text: errorText,
          },
        ],
      }
    } catch (error) {
      logger.error('[DocumentAnalysisService] PDF parsing failed:', error)
      const errorMsg = error instanceof Error ? error.message : 'PDF 解析失败'

      return {
        info: {
          ...info,
          pageCount: 1,
        },
        text: `[PDF 文档: ${file.name}]\n\n解析错误：${errorMsg}`,
        pages: [
          {
            pageNumber: 1,
            text: errorMsg,
          },
        ],
      }
    }
  }

  /**
   * 解析 Word 文件
   */
  private async parseWordFile(file: File, info: DocumentInfo): Promise<DocumentContent> {
    logger.info('[DocumentAnalysisService] Parsing Word document with mammoth')

    try {
      // 动态导入 Word 解析器
      const { WordDocumentParser } = await import('../document-parsers/word-document-parser')
      const parser = new WordDocumentParser()
      const result = await parser.parse(file)

      if (result.success && result.text) {
        return {
          info: {
            ...info,
            pageCount: result.metadata.pageCount,
          },
          text: result.text,
          pages: [
            {
              pageNumber: 1,
              text: result.text,
            },
          ],
          metadata: result.metadata,
        }
      }

      // 如果解析失败，返回错误信息
      const errorText = result.error || 'Word 文档解析失败'
      return {
        info: {
          ...info,
          pageCount: 1,
        },
        text: errorText,
        pages: [
          {
            pageNumber: 1,
            text: errorText,
          },
        ],
      }
    } catch (error) {
      logger.error('[DocumentAnalysisService] Word parsing failed:', error)
      const errorMsg = error instanceof Error ? error.message : 'Word 文档解析失败'

      return {
        info: {
          ...info,
          pageCount: 1,
        },
        text: `[Word 文档: ${file.name}]\n\n解析错误：${errorMsg}`,
        pages: [
          {
            pageNumber: 1,
            text: errorMsg,
          },
        ],
      }
    }
  }

  /**
   * 解析 Excel 文件
   */
  private async parseExcelFile(file: File, info: DocumentInfo): Promise<DocumentContent> {
    logger.info('[DocumentAnalysisService] Parsing Excel document with xlsx')

    try {
      // 动态导入 Excel 解析器
      const { ExcelDocumentParser } = await import('../document-parsers/excel-document-parser')
      const parser = new ExcelDocumentParser()
      const result = await parser.parse(file)

      if (result.success && result.content) {
        // 从 content 中提取文本
        const textContent = result.content
          .filter(c => c.type === 'text') // ContentType.TEXT
          .map(c => (c as { text: string }).text)
          .join('\n')

        return {
          info: {
            ...info,
            pageCount: result.metadata.pageCount || 1,
          },
          text: textContent,
          pages: [
            {
              pageNumber: 1,
              text: textContent,
            },
          ],
          metadata: result.metadata,
        }
      }

      // 如果解析失败，返回错误信息
      const errorText = result.error || 'Excel 文档解析失败'
      return {
        info: {
          ...info,
          pageCount: 1,
        },
        text: errorText,
        pages: [
          {
            pageNumber: 1,
            text: errorText,
          },
        ],
      }
    } catch (error) {
      logger.error('[DocumentAnalysisService] Excel parsing failed:', error)
      const errorMsg = error instanceof Error ? error.message : 'Excel 文档解析失败'

      return {
        info: {
          ...info,
          pageCount: 1,
        },
        text: `[Excel 文档: ${file.name}]\n\n解析错误：${errorMsg}`,
        pages: [
          {
            pageNumber: 1,
            text: errorMsg,
          },
        ],
      }
    }
  }

  /**
   * 分析文档内容
   */
  async analyzeDocument(
    content: DocumentContent,
    options: AnalysisOptions = {}
  ): Promise<AnalysisResult> {
    const result: AnalysisResult = {
      summary: '',
      keyPoints: [],
      topics: [],
    }

    // 生成摘要
    if (options.includeSummary !== false) {
      result.summary = this.generateSummary(content.text, options.maxLength)
    }

    // 提取关键点
    if (options.includeKeyPoints !== false) {
      result.keyPoints = this.extractKeyPoints(content.text)
    }

    // 提取主题
    if (options.includeTopics !== false) {
      result.topics = this.extractTopics(content.text)
    }

    // 情感分析（简化版）
    if (options.includeSentiment) {
      result.sentiment = this.analyzeSentiment(content.text)
    }

    // 实体识别（简化版）
    if (options.includeEntities) {
      result.entities = this.extractEntities(content.text)
    }

    // 生成问题（简化版）
    if (options.includeQuestions) {
      result.questions = this.generateQuestions(content.text)
    }

    return result
  }

  /**
   * 生成摘要（简化版）
   */
  private generateSummary(text: string, maxLength: number = 500): string {
    // 简单摘要：取前 maxLength 个字符
    if (text.length <= maxLength) {
      return text
    }

    // 尝试在句子边界截断
    const truncated = text.substring(0, maxLength)
    const lastSentenceEnd = Math.max(
      truncated.lastIndexOf('.'),
      truncated.lastIndexOf('。'),
      truncated.lastIndexOf('!'),
      truncated.lastIndexOf('！'),
      truncated.lastIndexOf('?'),
      truncated.lastIndexOf('？')
    )

    if (lastSentenceEnd > maxLength * 0.8) {
      return truncated.substring(0, lastSentenceEnd + 1)
    }

    return truncated + '...'
  }

  /**
   * 提取关键点（简化版）
   */
  private extractKeyPoints(text: string): string[] {
    const keyPoints: string[] = []
    const lines = text.split('\n')

    // 查找标题行（以 # 开头或全大写）
    for (const line of lines) {
      const trimmed = line.trim()
      if (trimmed.startsWith('#') || /^[A-Z][A-Z\s]{3,}[A-Z]$/.test(trimmed)) {
        keyPoints.push(trimmed.replace(/^#+\s*/, ''))
      }
      if (keyPoints.length >= 5) break
    }

    return keyPoints
  }

  /**
   * 提取主题（简化版）
   */
  private extractTopics(text: string): string[] {
    // 简单的关键词提取
    const words = text.toLowerCase().match(/\b\w{4,}\b/g) || []
    const wordCount: Record<string, number> = {}

    for (const word of words) {
      wordCount[word] = (wordCount[word] || 0) + 1
    }

    // 按频率排序，取前 5 个
    return Object.entries(wordCount)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([word]) => word)
  }

  /**
   * 情感分析（简化版）
   */
  private analyzeSentiment(text: string): string {
    const positiveWords = ['good', 'great', 'excellent', 'amazing', 'wonderful', '好', '棒', '优秀']
    const negativeWords = ['bad', 'terrible', 'awful', 'poor', 'worst', '差', '糟糕', '坏']

    let positive = 0
    let negative = 0

    const lowerText = text.toLowerCase()

    for (const word of positiveWords) {
      if (lowerText.includes(word)) positive++
    }

    for (const word of negativeWords) {
      if (lowerText.includes(word)) negative++
    }

    if (positive > negative) return 'positive'
    if (negative > positive) return 'negative'
    return 'neutral'
  }

  /**
   * 实体识别（简化版）
   */
  private extractEntities(text: string): Array<{ name: string; type: string }> {
    const entities: Array<{ name: string; type: string }> = []

    // 简单的模式匹配
    // 人名（大写单词）
    const personMatches = text.match(/\b[A-Z][a-z]+\s[A-Z][a-z]+\b/g)
    if (personMatches) {
      for (const match of personMatches.slice(0, 3)) {
        entities.push({ name: match, type: 'PERSON' })
      }
    }

    // 组织（包含 Company、Inc、Corp 等）
    const orgMatches = text.match(/\b[A-Z][a-zA-Z\s]+(?:Company|Inc|Corp|Ltd|Organization)\b/g)
    if (orgMatches) {
      for (const match of orgMatches.slice(0, 3)) {
        entities.push({ name: match, type: 'ORGANIZATION' })
      }
    }

    return entities
  }

  /**
   * 生成问题（简化版）
   */
  private generateQuestions(text: string): string[] {
    const questions: string[] = []
    const topics = this.extractTopics(text)

    for (const topic of topics.slice(0, 3)) {
      questions.push(`什么是 ${topic}？`)
      questions.push(`${topic} 的主要特点是什么？`)
    }

    return questions.slice(0, 5)
  }

  /**
   * 分块处理长文档
   */
  chunkDocument(content: DocumentContent, chunkSize: number = 1000): string[] {
    const chunks: string[] = []
    const text = content.text

    for (let i = 0; i < text.length; i += chunkSize) {
      chunks.push(text.substring(i, i + chunkSize))
    }

    return chunks
  }

  /**
   * 使用 Ollama LLM 进行语义分析
   * 支持5种分析模式：全文摘要、结构提取、关键信息抽取、问答模式、对比分析
   */
  async analyzeWithLLM(
    content: DocumentContent,
    mode: 'summary' | 'structure' | 'extraction' | 'qa' | 'compare',
    customQuestion?: string
  ): Promise<string> {
    const config = getOllamaConfig()
    const systemPrompt = this.getSystemPrompt(mode)
    const userPrompt = this.getUserPrompt(content, mode, customQuestion)

    try {
      logger.info(`[DocumentAnalysisService] Analyzing with LLM, mode: ${mode}`)

      // 使用代理路由，Ollama OpenAI 兼容 API 路径是 /v1/chat/completions
      const ollamaEndpoint =
        config.baseUrl === '/api/ollama' ? '/api/ollama/v1/chat/completions' : `${config.baseUrl}/v1/chat/completions`
      const response = await fetch(ollamaEndpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: config.model,
          messages: [
            {
              role: 'system',
              content: systemPrompt,
            },
            {
              role: 'user',
              content: userPrompt,
            },
          ],
          stream: false,
        }),
      })

      if (!response.ok) {
        throw new Error(`Ollama API error: ${response.status} ${response.statusText}`)
      }

      const data = await response.json()
      // OpenAI 兼容格式: data.choices[0].message.content
      // Ollama 原生格式: data.message.content
      const result = data.choices?.[0]?.message?.content || data.message?.content || ''

      logger.info(
        `[DocumentAnalysisService] LLM analysis completed, result length: ${result.length}`
      )
      return result
    } catch (error) {
      logger.error('[DocumentAnalysisService] LLM analysis failed:', error)
      throw new Error(`LLM分析失败: ${error instanceof Error ? error.message : '未知错误'}`)
    }
  }

  /**
   * 获取系统提示词
   */
  private getSystemPrompt(mode: string): string {
    const prompts: Record<string, string> = {
      summary: `你是一个专业的文档分析助手。你的任务是：
1. 仔细阅读用户提供的文档内容
2. 生成简洁准确的摘要，突出文档的核心要点
3. 识别文档的主要论点和关键信息
4. 使用清晰、专业的语言风格
5. 摘要应该涵盖文档的主要内容和结论

请用中文回复。`,

      structure: `你是一个专业的文档结构分析助手。你的任务是：
1. 分析文档的整体结构和组织方式
2. 识别文档的章节、段落和层次关系
3. 提取文档的目录结构和主要内容框架
4. 标注每个章节的核心要点
5. 使用层级结构展示文档的组织方式

请用中文回复，并使用清晰的层级结构。`,

      extraction: `你是一个专业的关键信息提取助手。你的任务是：
1. 从文档中提取所有重要的事实、数据和数字
2. 识别人名、地名、机构名、组织名等实体
3. 提取日期、时间、金额等量化信息
4. 识别文档中的专业术语和关键词
5. 分类整理提取的信息

请用中文回复，清晰标注不同类型的信息。`,

      qa: `你是一个专业的文档问答助手。你的任务是：
1. 基于用户提供的文档内容回答问题
2. 如果问题在文档中有明确答案，直接引用原文回答
3. 如果问题需要综合分析，给出合理的推断
4. 如果问题在文档中没有相关信息，明确告知用户
5. 回答要准确、简洁、有理有据

请用中文回复。如果涉及引用，请标注原文位置。`,

      compare: `你是一个专业的文档对比分析助手。你的任务是：
1. 对比分析多个文档的异同点
2. 识别文档之间的相同之处和差异
3. 分析每个文档的特点和侧重点
4. 总结各文档的优缺点
5. 提供综合性的对比结论

请用中文回复，使用表格或列表清晰展示对比结果。`,
    }

    return prompts[mode] || prompts.summary
  }

  /**
   * 获取用户提示词
   */
  private getUserPrompt(content: DocumentContent, mode: string, customQuestion?: string): string {
    const documentInfo = `文档信息：
- 文件名：${content.info.name}
- 类型：${content.info.type}
- 页数：${content.info.pageCount || '未知'}
- 文件大小：${(content.info.size / 1024 / 1024).toFixed(2)} MB
- 字符数：${content.text.length}

文档内容：
${content.text}`

    switch (mode) {
      case 'summary':
        return `请对以下文档进行摘要分析：

${documentInfo}

请生成一份简洁准确的摘要，包括：
1. 文档的核心主题
2. 主要内容和要点
3. 重要结论或观点`

      case 'structure':
        return `请分析以下文档的结构和层次：

${documentInfo}

请提取：
1. 文档的章节结构
2. 各章节的核心要点
3. 文档的逻辑组织方式`

      case 'extraction':
        return `请从以下文档中提取关键信息：

${documentInfo}

请提取并分类：
1. 实体（人名、机构名等）
2. 日期和时间
3. 数字和数据
4. 专业术语和关键词`

      case 'qa':
        return `基于以下文档回答问题：

${documentInfo}

${customQuestion ? `用户问题：${customQuestion}` : '请基于文档内容提供分析。'}`

      case 'compare':
        return `请对比分析以下文档：

${documentInfo}

请提供：
1. 文档的主要内容和特点
2. 文档的异同点
3. 综合评价`

      default:
        return documentInfo
    }
  }

  /**
   * 执行完整分析流程
   * 解析文档 -> 使用 LLM 分析 -> 返回结果
   */
  async fullAnalysis(
    file: File,
    mode: 'summary' | 'structure' | 'extraction' | 'qa' | 'compare',
    customQuestion?: string
  ): Promise<{
    content: DocumentContent
    llmResult: string
    analysisResult: AnalysisResult
  }> {
    logger.info(`[DocumentAnalysisService] Starting full analysis for: ${file.name}, mode: ${mode}`)

    // 1. 解析文档
    const content = await this.parseDocument(file)
    logger.info(`[DocumentAnalysisService] Document parsed, text length: ${content.text.length}`)

    // 2. 使用 LLM 进行语义分析
    const llmResult = await this.analyzeWithLLM(content, mode, customQuestion)
    logger.info(`[DocumentAnalysisService] LLM analysis completed`)

    // 3. 生成结构化分析结果
    const analysisResult = this.parseLLMResult(llmResult, mode)

    return {
      content,
      llmResult,
      analysisResult,
    }
  }

  /**
   * 解析 LLM 返回结果为结构化格式
   */
  private parseLLMResult(llmResult: string, mode: string): AnalysisResult {
    const result: AnalysisResult = {
      summary: '',
      keyPoints: [],
      topics: [],
    }

    // 简单解析：尝试提取结构化信息
    const lines = llmResult.split('\n').filter(line => line.trim())

    // 提取摘要（第一段或带有"摘要"、"总结"等标记的内容）
    const summaryMatch = llmResult.match(
      /(?:摘要|总结|概述)[:：]\s*([\s\S]+?)(?=\n\s*\d\.|#{1,3}\s|\n\n|$)/i
    )
    if (summaryMatch) {
      result.summary = summaryMatch[1].trim()
    } else {
      // 默认取前500字符作为摘要
      result.summary = llmResult.substring(0, 500)
    }

    // 提取关键点（带有数字编号的行）
    const keyPointMatches = llmResult.matchAll(/(?:^|\n)(?:\d+[.、)]\s*)(.+)/g)
    for (const match of keyPointMatches) {
      if (result.keyPoints.length < 10) {
        result.keyPoints.push(match[1].trim())
      }
    }

    // 提取主题词（识别加粗或特定标记的关键词）
    const topicMatches = llmResult.match(/(?:主题词|关键词|核心概念)[:：]\s*([^\n]+)/i)
    if (topicMatches) {
      result.topics = topicMatches[1]
        .split(/[,，、]/)
        .map(t => t.trim())
        .filter(t => t)
    }

    return result
  }
}

// 导出单例实例
let globalDocumentAnalysisService: DocumentAnalysisService | null = null

export function getDocumentAnalysisService(): DocumentAnalysisService {
  if (!globalDocumentAnalysisService) {
    globalDocumentAnalysisService = new DocumentAnalysisService()
  }
  return globalDocumentAnalysisService
}

// 导出配置函数
export function setOllamaConfig(config: Partial<OllamaConfig>): void {
  globalOllamaConfig = { ...globalOllamaConfig, ...config }
  logger.info('[DocumentAnalysisService] Ollama config updated', globalOllamaConfig)
}

export function getOllamaConfig(): OllamaConfig {
  return { ...globalOllamaConfig }
}

// Ollama 模型信息接口
export interface OllamaModelInfo {
  name: string
  model?: string
  size?: number
  digest?: string
  parameter_size?: string
  quantization_level?: string
  modified_at?: string
}

// 获取本地模型列表
export async function fetchLocalModels(): Promise<OllamaModelInfo[]> {
  const config = getOllamaConfig()
  const endpoint =
    config.baseUrl === '/api/ollama' ? '/api/ollama/models' : `${config.baseUrl}/api/tags`

  try {
    logger.info('[DocumentAnalysisService] Fetching local models from:', endpoint)
    const response = await fetch(endpoint)

    if (!response.ok) {
      const errorText = await response.text().catch(() => '')
      throw new Error(
        `Failed to fetch models: ${response.status} ${response.statusText} - ${errorText}`
      )
    }

    const data = await response.json()

    // 处理不同的响应格式
    if (data.models) {
      return data.models
    } else if (Array.isArray(data)) {
      return data
    } else {
      logger.warn('[DocumentAnalysisService] Unexpected model list format:', data)
      return []
    }
  } catch (error) {
    logger.error('[DocumentAnalysisService] Failed to fetch local models:', error)
    throw error
  }
}
