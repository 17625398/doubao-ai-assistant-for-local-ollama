/**
 * Web Search Service
 * 实时联网搜索服务，集成 Google Search API
 * 基于 All-Model-Chat 项目的搜索功能
 */

import { logger } from '../utils/logger'

// 搜索结果项
export interface SearchResultItem {
  title: string
  link: string
  snippet: string
  displayUrl: string
}

// 搜索结果
export interface SearchResults {
  query: string
  items: SearchResultItem[]
  totalResults: number
  searchTime: number
}

// 搜索配置
export interface SearchConfig {
  apiKey: string
  searchEngineId: string
  baseUrl?: string
}

// 搜索选项
export interface SearchOptions {
  num?: number // 结果数量 (1-10)
  start?: number // 起始位置
  safe?: 'high' | 'medium' | 'off' // 安全搜索级别
  language?: string // 语言代码 (e.g., 'lang_zh-CN')
  siteSearch?: string // 限定站点
}

/**
 * Web Search Service 类
 */
export class WebSearchService {
  private config: SearchConfig

  constructor(config: SearchConfig) {
    this.config = {
      baseUrl: 'https://www.googleapis.com/customsearch/v1',
      ...config,
    }
    logger.info('[WebSearchService] Initialized')
  }

  /**
   * 执行搜索
   */
  async search(query: string, options: SearchOptions = {}): Promise<SearchResults> {
    try {
      logger.info(`[WebSearchService] Searching: ${query}`)

      const params = new URLSearchParams({
        key: this.config.apiKey,
        cx: this.config.searchEngineId,
        q: query,
        num: (options.num || 5).toString(),
        start: (options.start || 1).toString(),
        safe: options.safe || 'off',
      })

      if (options.language) {
        params.append('lr', options.language)
      }

      if (options.siteSearch) {
        params.append('siteSearch', options.siteSearch)
      }

      const url = `${this.config.baseUrl}?${params.toString()}`

      const response = await fetch(url)

      if (!response.ok) {
        throw new Error(`Search API error: ${response.status} ${response.statusText}`)
      }

      const data = await response.json()

      const results: SearchResults = {
        query,
        items: data.items?.map((item: any) => ({
          title: item.title || '',
          link: item.link || '',
          snippet: item.snippet || '',
          displayUrl: item.displayLink || item.link || '',
        })) || [],
        totalResults: parseInt(data.searchInformation?.totalResults || '0', 10),
        searchTime: data.searchInformation?.searchTime || 0,
      }

      logger.info(`[WebSearchService] Found ${results.items.length} results`)
      return results
    } catch (error) {
      logger.error('[WebSearchService] Search error:', error)
      throw error
    }
  }

  /**
   * 批量搜索（多个查询）
   */
  async batchSearch(queries: string[], options: SearchOptions = {}): Promise<SearchResults[]> {
    const results: SearchResults[] = []
    for (const query of queries) {
      try {
        const result = await this.search(query, options)
        results.push(result)
      } catch (error) {
        logger.error(`[WebSearchService] Batch search error for query "${query}":`, error)
        results.push({
          query,
          items: [],
          totalResults: 0,
          searchTime: 0,
        })
      }
    }
    return results
  }

  /**
   * 获取搜索结果摘要
   */
  async getSearchSummary(query: string, maxResults: number = 3): Promise<string> {
    try {
      const results = await this.search(query, { num: maxResults })

      if (results.items.length === 0) {
        return `未找到关于 "${query}" 的搜索结果。`
      }

      const summary = results.items
        .map((item, index) => {
          return `[${index + 1}] ${item.title}\n${item.snippet}\n来源: ${item.displayUrl}`
        })
        .join('\n\n')

      return `搜索结果:\n\n${summary}`
    } catch (error) {
      logger.error('[WebSearchService] Summary error:', error)
      return `搜索失败: ${error instanceof Error ? error.message : '未知错误'}`
    }
  }

  /**
   * 格式化搜索结果为 Gemini 提示
   */
  formatResultsForGemini(results: SearchResults): string {
    if (results.items.length === 0) {
      return ''
    }

    const formatted = results.items
      .map((item, index) => {
        return `<source${index + 1}>
<title>${item.title}</title>
<url>${item.link}</url>
<content>${item.snippet}</content>
</source${index + 1}>`
      })
      .join('\n')

    return `基于以下搜索结果回答问题:\n\n${formatted}\n\n请根据以上信息回答问题，并在回答中引用相关来源。`
  }
}

// 导出单例实例（可选）
let globalWebSearchService: WebSearchService | null = null

export function initWebSearchService(config: SearchConfig): WebSearchService {
  globalWebSearchService = new WebSearchService(config)
  return globalWebSearchService
}

export function getWebSearchService(): WebSearchService | null {
  return globalWebSearchService
}
