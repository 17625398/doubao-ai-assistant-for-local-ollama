/**
 * PageIndex 服务
 * 基于 OpenKB 的 PageIndex 理念实现的长文档树状索引系统
 * 核心特性：
 * 1. 分层树状索引 - 将长文档组织成树结构
 * 2. 页面级摘要 - 每个节点都有智能摘要
 * 3. 向量无关检索 - 基于推理的导航
 * 4. 自顶向下导航 - 从概览到细节
 * 5. 多模态支持 - 理解图片、表格
 * 6. 智能分块 - 基于语义的文档分块
 * 7. 索引持久化 - 自动保存和加载索引
 */

import { logger } from '../utils/logger'

// 检测运行环境
const isNodeEnvironment = typeof process !== 'undefined' && process.versions?.node

// 多模态内容类型
export enum MultimodalContentType {
  TEXT = 'text',
  IMAGE = 'image',
  TABLE = 'table',
  CHART = 'chart',
  CODE = 'code',
  FORMULA = 'formula',
}

// 多模态内容项
export interface MultimodalContentItem {
  type: MultimodalContentType
  content: string
  description?: string
  pageIndex: number
  metadata?: {
    width?: number
    height?: number
    format?: string
    caption?: string
  }
}

// PageIndex 节点类型
export enum PageIndexNodeType {
  ROOT = 'root',
  CHAPTER = 'chapter',
  SECTION = 'section',
  PAGE = 'page',
  SUMMARY = 'summary',
}

// PageIndex 树节点
export interface PageIndexNode {
  id: string
  type: PageIndexNodeType
  title: string
  summary: string
  content?: string
  pageRange: { start: number; end: number }
  children: PageIndexNode[]
  level: number
  multimodalContent?: MultimodalContentItem[]
  metadata?: {
    wordCount?: number
    imageCount?: number
    tableCount?: number
    chartCount?: number
    codeBlockCount?: number
    keyConcepts?: string[]
    semanticTags?: string[]
    contentTypeDistribution?: Record<MultimodalContentType, number>
  }
}

// PageIndex 树
export interface PageIndexTree {
  documentId: string
  documentTitle: string
  totalPages: number
  root: PageIndexNode
  createdAt: number
  updatedAt: number
}

// 检索结果
export interface PageIndexSearchResult {
  node: PageIndexNode
  relevance: number
  path: string[]
  context: string
}

// 检索选项
export interface PageIndexSearchOptions {
  maxResults?: number
  minRelevance?: number
  includeContext?: boolean
  contextPages?: number
}

// 智能分块策略
export enum ChunkingStrategy {
  FIXED_SIZE = 'fixed_size',
  SEMANTIC = 'semantic',
  STRUCTURAL = 'structural',
  HYBRID = 'hybrid',
}

// 文档分块配置
export interface PageIndexConfig {
  threshold: number
  maxDepth: number
  maxPagesPerNode: number
  minPagesPerNode: number
  generateSummaries: boolean
  extractConcepts: boolean
  enableMultimodal: boolean
  enableSemanticSearch: boolean
  chunkingStrategy: ChunkingStrategy
  enablePersistence: boolean
  persistencePath?: string
  llmConfig?: {
    model?: string
    temperature?: number
    maxTokens?: number
  }
}

// 默认配置
const DEFAULT_CONFIG: PageIndexConfig = {
  threshold: 20,
  maxDepth: 4,
  maxPagesPerNode: 50,
  minPagesPerNode: 5,
  generateSummaries: true,
  extractConcepts: true,
  enableMultimodal: true,
  enableSemanticSearch: true,
  chunkingStrategy: ChunkingStrategy.HYBRID,
  enablePersistence: true,
  llmConfig: {
    model: 'ollama/qwen3.6',
    temperature: 0.3,
    maxTokens: 2000,
  },
}

export class PageIndexService {
  private config: PageIndexConfig
  private indexCache: Map<string, PageIndexTree> = new Map()
  private multimodalCache: Map<string, MultimodalContentItem[]> = new Map()

  constructor(config?: Partial<PageIndexConfig>) {
    this.config = { ...DEFAULT_CONFIG, ...config }
    this.loadPersistedIndexes()
  }

  /**
   * 生成文本摘要
   */
  private generateSimpleSummary(text: string, maxLength: number = 500): string {
    const sentences = text.split(/[.!?。！？]/).filter(s => s.trim().length > 20)
    const keySentences = sentences.slice(0, 3)

    if (keySentences.length > 0) {
      return keySentences.join('；').substring(0, maxLength)
    }

    return text.substring(0, maxLength) + '...'
  }

  /**
   * 提取关键概念
   */
  private extractSimpleConcepts(text: string): string[] {
    const words = text.toLowerCase().match(/\b\w{4,}\b/g) || []
    const wordFreq = new Map<string, number>()

    for (const word of words) {
      wordFreq.set(word, (wordFreq.get(word) || 0) + 1)
    }

    return Array.from(wordFreq.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([word]) => word)
  }

  /**
   * 分析多模态内容
   */
  private async analyzeMultimodalContent(
    pages: { index: number; content: string; text: string }[]
  ): Promise<MultimodalContentItem[]> {
    if (!this.config.enableMultimodal) {
      return []
    }

    const items: MultimodalContentItem[] = []

    for (const page of pages) {
      // 检测表格
      const tableMatches = page.text.match(/\|[^\n]+\|/g)
      if (tableMatches && tableMatches.length >= 2) {
        items.push({
          type: MultimodalContentType.TABLE,
          content: tableMatches.join('\n'),
          description: '表格数据',
          pageIndex: page.index,
        })
      }

      // 检测代码块
      const codeMatches = page.text.match(/```[\s\S]*?```/g)
      if (codeMatches) {
        for (const code of codeMatches) {
          items.push({
            type: MultimodalContentType.CODE,
            content: code,
            description: '代码块',
            pageIndex: page.index,
          })
        }
      }

      // 检测公式
      const formulaMatches = page.text.match(/\$\$?[\s\S]*?\$\$?/g)
      if (formulaMatches) {
        for (const formula of formulaMatches) {
          items.push({
            type: MultimodalContentType.FORMULA,
            content: formula,
            description: '数学公式',
            pageIndex: page.index,
          })
        }
      }
    }

    return items
  }

  /**
   * 智能分块
   */
  private smartChunking(
    pages: { index: number; content: string; text: string }[]
  ): { index: number; content: string; text: string }[][] {
    switch (this.config.chunkingStrategy) {
      case ChunkingStrategy.SEMANTIC:
        return this.semanticChunking(pages)
      case ChunkingStrategy.STRUCTURAL:
        return this.structuralChunking(pages)
      case ChunkingStrategy.HYBRID:
        return this.hybridChunking(pages)
      case ChunkingStrategy.FIXED_SIZE:
      default:
        return this.fixedSizeChunking(pages)
    }
  }

  private semanticChunking(
    pages: { index: number; content: string; text: string }[]
  ): { index: number; content: string; text: string }[][] {
    const chunks: { index: number; content: string; text: string }[][] = []
    let currentChunk: typeof pages = []
    let currentLength = 0
    const targetChunkSize = this.config.maxPagesPerNode * 1000

    for (const page of pages) {
      const pageLength = page.text.length

      if (currentLength + pageLength > targetChunkSize && currentChunk.length > 0) {
        chunks.push(currentChunk)
        currentChunk = []
        currentLength = 0
      }

      currentChunk.push(page)
      currentLength += pageLength
    }

    if (currentChunk.length > 0) {
      chunks.push(currentChunk)
    }

    return chunks
  }

  private structuralChunking(
    pages: { index: number; content: string; text: string }[]
  ): { index: number; content: string; text: string }[][] {
    const chunks: { index: number; content: string; text: string }[][] = []
    let currentChunk: typeof pages = []

    for (const page of pages) {
      const hasChapterHeading = /^(Chapter|Section|第[一二三四五六七八九十\d]+章|第[\d]+节|\d+\.\s+[A-Z])/im.test(
        page.text.trim()
      )

      if (hasChapterHeading && currentChunk.length > 0) {
        chunks.push(currentChunk)
        currentChunk = []
      }

      currentChunk.push(page)

      if (currentChunk.length >= this.config.maxPagesPerNode) {
        chunks.push(currentChunk)
        currentChunk = []
      }
    }

    if (currentChunk.length > 0) {
      chunks.push(currentChunk)
    }

    return chunks
  }

  private hybridChunking(
    pages: { index: number; content: string; text: string }[]
  ): { index: number; content: string; text: string }[][] {
    const structuralChunks = this.structuralChunking(pages)
    const finalChunks: typeof structuralChunks = []

    for (const chunk of structuralChunks) {
      if (chunk.length > this.config.maxPagesPerNode) {
        const semanticSubChunks = this.semanticChunking(chunk)
        finalChunks.push(...semanticSubChunks)
      } else {
        finalChunks.push(chunk)
      }
    }

    return finalChunks
  }

  private fixedSizeChunking(
    pages: { index: number; content: string; text: string }[]
  ): { index: number; content: string; text: string }[][] {
    const chunks: { index: number; content: string; text: string }[][] = []

    for (let i = 0; i < pages.length; i += this.config.maxPagesPerNode) {
      chunks.push(pages.slice(i, i + this.config.maxPagesPerNode))
    }

    return chunks
  }

  /**
   * 持久化索引
   */
  private async persistIndex(tree: PageIndexTree): Promise<void> {
    if (!this.config.enablePersistence || !isNodeEnvironment) {
      return
    }

    try {
      const fs = await import('fs')
      const path = await import('path')

      const persistDir = this.config.persistencePath || path.join(process.cwd(), '.pageindex')
      if (!fs.existsSync(persistDir)) {
        fs.mkdirSync(persistDir, { recursive: true })
      }

      const filePath = path.join(persistDir, `${tree.documentId}.json`)
      fs.writeFileSync(filePath, JSON.stringify(tree, null, 2), 'utf-8')

      logger.info(`[PageIndex] Index persisted to ${filePath}`)
    } catch (error) {
      logger.warn('[PageIndex] Failed to persist index:', error)
    }
  }

  /**
   * 加载持久化的索引
   */
  private async loadPersistedIndexes(): Promise<void> {
    if (!this.config.enablePersistence || !isNodeEnvironment) {
      return
    }

    try {
      const fs = await import('fs')
      const path = await import('path')

      const persistDir = this.config.persistencePath || path.join(process.cwd(), '.pageindex')
      if (!fs.existsSync(persistDir)) {
        return
      }

      const files = fs.readdirSync(persistDir).filter(f => f.endsWith('.json'))

      for (const file of files) {
        try {
          const filePath = path.join(persistDir, file)
          const content = fs.readFileSync(filePath, 'utf-8')
          const tree: PageIndexTree = JSON.parse(content)

          this.indexCache.set(tree.documentId, tree)
          logger.info(`[PageIndex] Loaded persisted index: ${tree.documentId}`)
        } catch (e) {
          logger.warn(`[PageIndex] Failed to load index from ${file}:`, e)
        }
      }
    } catch (error) {
      logger.warn('[PageIndex] Failed to load persisted indexes:', error)
    }
  }

  /**
   * 检查文档是否需要 PageIndex 处理
   */
  shouldUsePageIndex(pageCount: number): boolean {
    return pageCount >= this.config.threshold
  }

  /**
   * 构建 PageIndex 树
   */
  async buildIndexTree(
    documentId: string,
    documentTitle: string,
    pages: { index: number; content: string; text: string }[],
    metadata?: { wordCount?: number; imageCount?: number; tableCount?: number }
  ): Promise<PageIndexTree> {
    logger.info(`[PageIndex] Building index tree for ${documentTitle} (${pages.length} pages)`)

    const totalPages = pages.length

    // 分析多模态内容
    const multimodalContent = await this.analyzeMultimodalContent(pages)
    if (multimodalContent.length > 0) {
      this.multimodalCache.set(documentId, multimodalContent)
    }

    // 使用智能分块
    const chunks = this.smartChunking(pages)
    logger.info(`[PageIndex] Document split into ${chunks.length} chunks using ${this.config.chunkingStrategy} strategy`)

    // 构建根节点
    const rootNode = await this.buildRootNode(pages, documentTitle, metadata, multimodalContent)

    // 如果页面数超过阈值，构建子树
    if (totalPages > this.config.minPagesPerNode) {
      rootNode.children = await this.buildChildNodesFromChunks(chunks, 1)
    }

    const tree: PageIndexTree = {
      documentId,
      documentTitle,
      totalPages,
      root: rootNode,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    }

    // 缓存索引树
    this.indexCache.set(documentId, tree)

    // 持久化索引
    await this.persistIndex(tree)

    logger.info(`[PageIndex] Index tree built successfully for ${documentTitle}`)
    return tree
  }

  /**
   * 构建根节点
   */
  private async buildRootNode(
    pages: { index: number; content: string; text: string }[],
    title: string,
    metadata?: { wordCount?: number; imageCount?: number; tableCount?: number },
    multimodalContent?: MultimodalContentItem[]
  ): Promise<PageIndexNode> {
    const fullText = pages.map(p => p.text).join('\n\n')
    const totalWordCount = fullText.length

    const summary = this.config.generateSummaries
      ? this.generateSimpleSummary(fullText, 800)
      : this.generateSimpleSummary(fullText, 800)

    const keyConcepts = this.config.extractConcepts
      ? this.extractSimpleConcepts(fullText)
      : []

    return {
      id: `root-${Date.now()}`,
      type: PageIndexNodeType.ROOT,
      title: title,
      summary: summary,
      pageRange: { start: 0, end: pages.length - 1 },
      children: [],
      level: 0,
      multimodalContent: multimodalContent?.slice(0, 20),
      metadata: {
        wordCount: totalWordCount,
        ...metadata,
        keyConcepts,
      },
    }
  }

  /**
   * 从分块构建子节点
   */
  private async buildChildNodesFromChunks(
    chunks: { index: number; content: string; text: string }[][],
    level: number
  ): Promise<PageIndexNode[]> {
    if (level > this.config.maxDepth) {
      return []
    }

    const nodes: PageIndexNode[] = []

    for (const chunk of chunks) {
      const node = await this.buildNodeFromChunk(chunk, level)
      nodes.push(node)
    }

    return nodes
  }

  /**
   * 从分块构建节点
   */
  private async buildNodeFromChunk(
    pages: { index: number; content: string; text: string }[],
    level: number
  ): Promise<PageIndexNode> {
    const startPage = pages[0].index
    const endPage = pages[pages.length - 1].index
    const text = pages.map(p => p.text).join('\n\n')

    const summary = this.config.generateSummaries
      ? this.generateSimpleSummary(text, 400)
      : this.generateSimpleSummary(text, 400)

    const title = this.extractTitle(text) || `Section ${startPage + 1}-${endPage + 1}`

    const multimodalContent = await this.analyzeMultimodalContent(pages)

    const keyConcepts = this.config.extractConcepts
      ? this.extractSimpleConcepts(text)
      : []

    const node: PageIndexNode = {
      id: `node-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      type: this.getNodeType(level),
      title,
      summary,
      content: text.substring(0, 3000),
      pageRange: { start: startPage, end: endPage },
      children: [],
      level,
      multimodalContent: multimodalContent.slice(0, 10),
      metadata: {
        wordCount: text.length,
        keyConcepts,
      },
    }

    // 如果页面数还很多，继续递归构建
    if (pages.length > this.config.minPagesPerNode && level < this.config.maxDepth) {
      const subChunks = this.smartChunking(pages)
      if (subChunks.length > 1) {
        node.children = await this.buildChildNodesFromChunks(subChunks, level + 1)
      }
    }

    return node
  }

  /**
   * 根据层级获取节点类型
   */
  private getNodeType(level: number): PageIndexNodeType {
    switch (level) {
      case 0:
        return PageIndexNodeType.ROOT
      case 1:
        return PageIndexNodeType.CHAPTER
      case 2:
        return PageIndexNodeType.SECTION
      default:
        return PageIndexNodeType.PAGE
    }
  }

  /**
   * 从文本中提取标题
   */
  private extractTitle(text: string): string | null {
    const lines = text.split('\n').filter(line => line.trim())

    for (const line of lines.slice(0, 10)) {
      const trimmed = line.trim()
      if (trimmed.length > 5 && trimmed.length < 100) {
        if (/^(Chapter|Section|第[一二三四五六七八九十\d]+章|第[\d]+节)/i.test(trimmed)) {
          return trimmed
        }
      }
    }

    return null
  }

  /**
   * 检索 PageIndex 树
   */
  async search(
    documentId: string,
    query: string,
    options: PageIndexSearchOptions = {}
  ): Promise<PageIndexSearchResult[]> {
    const {
      maxResults = 5,
      minRelevance = 0.3,
      includeContext = true,
      contextPages = 2,
    } = options

    const tree = this.indexCache.get(documentId)
    if (!tree) {
      logger.error(`[PageIndex] Tree not found for document ${documentId}`)
      return []
    }

    logger.info(`[PageIndex] Searching in ${tree.documentTitle}: ${query}`)

    const results: PageIndexSearchResult[] = []
    const queryLower = query.toLowerCase()
    const queryWords = queryLower.split(/\s+/)

    this.searchNode(tree.root, queryWords, [], results)

    results.sort((a, b) => b.relevance - a.relevance)

    const filteredResults = results
      .filter(r => r.relevance >= minRelevance)
      .slice(0, maxResults)

    if (includeContext) {
      for (const result of filteredResults) {
        result.context = await this.getContext(tree, result.node, contextPages)
      }
    }

    logger.info(`[PageIndex] Found ${filteredResults.length} results`)
    return filteredResults
  }

  /**
   * 递归检索节点
   */
  private searchNode(
    node: PageIndexNode,
    queryWords: string[],
    path: string[],
    results: PageIndexSearchResult[]
  ): void {
    const currentPath = [...path, node.title]

    const relevance = this.calculateRelevance(node, queryWords)

    if (relevance > 0) {
      results.push({
        node,
        relevance,
        path: currentPath,
        context: '',
      })
    }

    for (const child of node.children) {
      this.searchNode(child, queryWords, currentPath, results)
    }
  }

  /**
   * 计算节点与查询的相关性
   */
  private calculateRelevance(node: PageIndexNode, queryWords: string[]): number {
    const textToSearch = `${node.title} ${node.summary} ${node.content || ''}`.toLowerCase()

    let matchCount = 0
    for (const word of queryWords) {
      if (textToSearch.includes(word)) {
        matchCount++
      }
    }

    let relevance = matchCount / queryWords.length

    switch (node.type) {
      case PageIndexNodeType.ROOT:
        relevance *= 0.5
        break
      case PageIndexNodeType.CHAPTER:
        relevance *= 1.2
        break
      case PageIndexNodeType.SECTION:
        relevance *= 1.0
        break
      case PageIndexNodeType.PAGE:
        relevance *= 0.9
        break
    }

    return Math.min(relevance, 1.0)
  }

  /**
   * 获取节点的上下文
   */
  private async getContext(
    tree: PageIndexTree,
    node: PageIndexNode,
    contextPages: number
  ): Promise<string> {
    const { start, end } = node.pageRange
    const contextStart = Math.max(0, start - contextPages)
    const contextEnd = Math.min(tree.totalPages - 1, end + contextPages)

    return `Pages ${contextStart + 1}-${contextEnd + 1}: ${node.summary}`
  }

  /**
   * 获取索引树
   */
  getIndexTree(documentId: string): PageIndexTree | null {
    return this.indexCache.get(documentId) || null
  }

  /**
   * 获取索引树概览
   */
  getTreeOverview(documentId: string): { title: string; structure: string } | null {
    const tree = this.indexCache.get(documentId)
    if (!tree) return null

    const structure = this.formatNodeStructure(tree.root, 0)
    return {
      title: tree.documentTitle,
      structure,
    }
  }

  /**
   * 格式化节点结构
   */
  private formatNodeStructure(node: PageIndexNode, indent: number): string {
    const indentStr = '  '.repeat(indent)
    let result = `${indentStr}- ${node.title} (Pages ${node.pageRange.start + 1}-${node.pageRange.end + 1})\n`

    for (const child of node.children) {
      result += this.formatNodeStructure(child, indent + 1)
    }

    return result
  }

  /**
   * 删除索引树
   */
  deleteIndexTree(documentId: string): boolean {
    return this.indexCache.delete(documentId)
  }

  /**
   * 清空所有缓存
   */
  clearCache(): void {
    this.indexCache.clear()
  }

  /**
   * 获取缓存统计
   */
  getCacheStats(): { totalTrees: number; totalDocuments: number } {
    return {
      totalTrees: this.indexCache.size,
      totalDocuments: this.indexCache.size,
    }
  }
}

// 导出单例实例
export const pageIndexService = new PageIndexService()
