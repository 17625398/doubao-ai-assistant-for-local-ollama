// LinkMind 服务 - 企业级多模态 AI 中间件

import { logger } from '../utils/logger'
import type { LinkMindConfig } from '../types'
import { eventBus } from '../utils/event-bus'

export interface LinkMindServiceConfig extends LinkMindConfig {
  timeout?: number
  transportMode?: 'direct' | 'backend-relay' | 'proxy'
  gatewayPath?: string
}

export interface LinkMindModel {
  id: string
  name: string
  provider?: string
}

export interface LinkMindChatMessage {
  role: 'system' | 'user' | 'assistant'
  content: string | Array<{ type: string; text?: string; image_url?: { url: string } }>
}

export interface LinkMindChatRequest {
  model: string
  messages: LinkMindChatMessage[]
  temperature?: number
  max_tokens?: number
  stream?: boolean
}

export interface LinkMindChatResponse {
  id: string
  model: string
  choices: Array<{
    message: {
      role: string
      content: string
    }
    finish_reason: string
  }>
  usage?: {
    prompt_tokens: number
    completion_tokens: number
    total_tokens: number
  }
}

export interface LinkMindDocumentRequest {
  file?: File | Blob
  url?: string
  extractText?: boolean
  extractTables?: boolean
  extractImages?: boolean
}

export interface LinkMindDocumentResponse {
  success: boolean
  text?: string
  tables?: string[]
  images?: string[]
  error?: string
}

export interface LinkMindOCRRequest {
  image: string // base64 or url
  language?: string
}

export interface LinkMindOCRResponse {
  success: boolean
  text?: string
  error?: string
}

export class LinkMindService {
  private config: LinkMindServiceConfig
  private static instance: LinkMindService | null = null

  constructor(config?: Partial<LinkMindServiceConfig>) {
    const defaultBaseUrl = typeof window !== 'undefined' ? '/api/linkmind' : 'http://localhost:8080'
    this.config = {
      baseUrl: config?.baseUrl || defaultBaseUrl,
      apiKey: config?.apiKey,
      timeout: config?.timeout || 60000,
      transportMode: config?.transportMode || 'proxy',
      gatewayPath: config?.gatewayPath || '/api/linkmind',
      defaultModel: config?.defaultModel || 'qwen-plus',
    }
  }

  static getInstance(config?: Partial<LinkMindServiceConfig>): LinkMindService {
    if (!LinkMindService.instance) {
      LinkMindService.instance = new LinkMindService(config)
    }
    return LinkMindService.instance
  }

  static resetInstance(): void {
    LinkMindService.instance = null
  }

  updateConfig(config: Partial<LinkMindServiceConfig>): void {
    this.config = {
      ...this.config,
      ...config,
    }
  }

  getConfig(): LinkMindServiceConfig {
    return { ...this.config }
  }

  async request<T = any>(endpoint: string, options?: RequestInit): Promise<T> {
    return this.fetchInternal<T>(endpoint, options)
  }

  private async fetch<T>(endpoint: string, options?: RequestInit): Promise<T> {
    return this.fetchInternal<T>(endpoint, options)
  }

  private async fetchFormData<T>(
    endpoint: string,
    formData: FormData,
    options?: RequestInit
  ): Promise<T> {
    return this.fetchInternal<T>(endpoint, {
      ...options,
      method: 'POST',
      body: formData,
      headers: {
        ...(this.config.apiKey ? { Authorization: `Bearer ${this.config.apiKey}` } : {}),
        ...options?.headers,
      },
    })
  }

  private async fetchInternal<T>(endpoint: string, options?: RequestInit): Promise<T> {
    const url = this.resolveEndpointUrl(endpoint)
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...(this.config.apiKey ? { Authorization: `Bearer ${this.config.apiKey}` } : {}),
      ...(options?.headers as Record<string, string>),
    }

    // 对于 FormData，不设置 Content-Type，让浏览器自动设置
    if (options?.body instanceof FormData) {
      delete headers['Content-Type']
    }

    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), this.config.timeout)

    try {
      if (this.isLikelyBlockedByBrowserCsp(url) && this.config.transportMode === 'direct') {
        throw new Error(
          `CSP_BLOCKED_HTTP_ENDPOINT: 当前页面为 HTTPS，无法直接访问 ${url}。请改用 HTTPS 端点或通过扩展后台/本地代理中转。`
        )
      }
      logger.info('[LinkMindService] Fetching:', url)
      eventBus.emit('linkmind:request', {
        endpoint,
        method: options?.method || 'GET',
        transportMode: this.config.transportMode || 'proxy',
        timestamp: Date.now(),
      })
      const response = await fetch(url, {
        ...options,
        headers,
        signal: controller.signal,
      })

      clearTimeout(timeout)

      if (!response.ok) {
        const errorText = await response.text().catch(() => 'Unknown error')
        throw new Error(
          `LinkMind API error: ${response.status} ${response.statusText} - ${errorText}`
        )
      }

      const data = await response.json()
      logger.info('[LinkMindService] Fetch success:', endpoint)
      eventBus.emit('linkmind:response', {
        endpoint,
        status: response.status,
        ok: true,
        timestamp: Date.now(),
      })
      return data
    } catch (error) {
      clearTimeout(timeout)
      eventBus.emit('linkmind:response', {
        endpoint,
        status: 'error',
        ok: false,
        message: error instanceof Error ? error.message : String(error),
        timestamp: Date.now(),
      })
      if (error instanceof Error) {
        if (error.name === 'AbortError') {
          throw new Error(
            `LinkMind API timeout after ${this.config.timeout}ms - 请检查服务器是否运行`
          )
        } else if (error.message.includes('CSP_BLOCKED_HTTP_ENDPOINT')) {
          throw error
        } else if (error.message.includes('Failed to fetch')) {
          throw new Error(
            `无法连接到 LinkMind 服务器: ${this.config.baseUrl} - 请检查服务器是否运行且地址正确`
          )
        } else if (error.message.includes('CORS')) {
          throw new Error(`CORS 错误: 请确保 LinkMind 服务器允许跨域请求`)
        }
      }
      throw new Error(
        `连接 LinkMind 服务器失败: ${error instanceof Error ? error.message : '未知错误'}`
      )
    }
  }

  private isLikelyBlockedByBrowserCsp(url: string): boolean {
    if (typeof window === 'undefined') return false
    if (window.location.protocol !== 'https:') return false
    return url.startsWith('http://')
  }

  private resolveEndpointUrl(endpoint: string): string {
    const normalizedEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`
    const baseUrl = this.resolveBaseUrl()
    const normalizedBase = baseUrl.endsWith('/') ? baseUrl.slice(0, -1) : baseUrl
    return `${normalizedBase}${normalizedEndpoint}`
  }

  private resolveBaseUrl(): string {
    if (typeof window === 'undefined') {
      return this.config.baseUrl
    }
    if ((this.config.transportMode || 'proxy') === 'direct') {
      return this.config.baseUrl
    }
    return this.config.gatewayPath || '/api/linkmind'
  }

  async testConnection(): Promise<{ success: boolean; message: string }> {
    try {
      const models = await this.listModels()
      return {
        success: true,
        message: `连接成功，发现 ${models.length} 个模型`,
      }
    } catch (error) {
      return {
        success: false,
        message: error instanceof Error ? error.message : '连接失败',
      }
    }
  }

  async listModels(): Promise<LinkMindModel[]> {
    try {
      const response = await this.fetch<{
        object: string
        data: Array<{ id: string; object?: string; created?: number; owned_by?: string }>
      }>('/v1/models')

      if (!response.data) {
        logger.warn('[LinkMindService] No models data in response')
        return []
      }

      return response.data.map(model => ({
        id: model.id,
        name: model.id,
        provider: model.owned_by || 'unknown',
      }))
    } catch (error) {
      logger.error('[LinkMindService] Failed to list models:', error)
      throw error
    }
  }

  async chat(request: LinkMindChatRequest): Promise<LinkMindChatResponse> {
    try {
      logger.info('[LinkMindService] Sending chat request:', {
        model: request.model,
        messageCount: request.messages.length,
      })
      const response = await this.fetch<LinkMindChatResponse>('/v1/chat/completions', {
        method: 'POST',
        body: JSON.stringify(request),
      })
      logger.info('[LinkMindService] Chat response received')
      return response
    } catch (error) {
      logger.error('[LinkMindService] Chat error:', error)
      throw error
    }
  }

  async chatStream(
    request: LinkMindChatRequest,
    onChunk: (content: string) => void
  ): Promise<void> {
    try {
      const url = `${this.config.baseUrl}/v1/chat/completions`
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        ...(this.config.apiKey ? { Authorization: `Bearer ${this.config.apiKey}` } : {}),
      }

      const response = await fetch(url, {
        method: 'POST',
        headers,
        body: JSON.stringify({ ...request, stream: true }),
      })

      if (!response.ok) {
        const errorText = await response.text().catch(() => 'Unknown error')
        throw new Error(
          `LinkMind API error: ${response.status} ${response.statusText} - ${errorText}`
        )
      }

      const reader = response.body?.getReader()
      if (!reader) {
        throw new Error('No response body')
      }

      const decoder = new TextDecoder()
      let buffer = ''

      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        buffer += decoder.decode(value, { stream: true })
        const lines = buffer.split('\n')
        buffer = lines.pop() || ''

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = line.slice(6)
            if (data === '[DONE]') {
              return
            }
            try {
              const parsed = JSON.parse(data)
              const content = parsed.choices?.[0]?.delta?.content
              if (content) {
                onChunk(content)
              }
            } catch {
              // Ignore parse errors for incomplete chunks
            }
          }
        }
      }
    } catch (error) {
      logger.error('[LinkMindService] Chat stream error:', error)
      throw error
    }
  }

  async extractDocument(request: LinkMindDocumentRequest): Promise<LinkMindDocumentResponse> {
    try {
      if (request.file) {
        const formData = new FormData()
        formData.append('file', request.file)

        if (request.url) formData.append('url', request.url)
        formData.append('extractText', String(request.extractText ?? true))
        formData.append('extractTables', String(request.extractTables ?? false))
        formData.append('extractImages', String(request.extractImages ?? false))

        logger.info(
          '[LinkMindService] Extracting document:',
          request.file instanceof File ? request.file.name : 'Blob',
          request.file instanceof File ? request.file.size : request.file.size
        )
        const response = await this.fetchFormData<any>('/doc/doc2ext', formData)

        // 处理 LinkMind 服务器的响应格式
        if (response.status === 'failed') {
          return {
            success: false,
            error: response.msg || 'Document extraction failed',
          }
        } else if (response.status === 'success') {
          return {
            success: true,
            text: response.text,
            tables: response.tables,
            images: response.images,
          }
        }
        return response
      } else if (request.url) {
        logger.info('[LinkMindService] Extracting document from URL:', request.url)
        const response = await this.fetch<any>('/doc/doc2ext', {
          method: 'POST',
          body: JSON.stringify({
            url: request.url,
            extractText: request.extractText ?? true,
            extractTables: request.extractTables ?? false,
            extractImages: request.extractImages ?? false,
          }),
        })

        // 处理 LinkMind 服务器的响应格式
        if (response.status === 'failed') {
          return {
            success: false,
            error: response.msg || 'Document extraction failed',
          }
        } else if (response.status === 'success') {
          return {
            success: true,
            text: response.text,
            tables: response.tables,
            images: response.images,
          }
        }
        return response
      } else {
        return {
          success: false,
          error: 'Either file or url must be provided',
        }
      }
    } catch (error) {
      logger.error('[LinkMindService] Document extraction error:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Document extraction failed',
      }
    }
  }

  async performOCR(request: LinkMindOCRRequest): Promise<LinkMindOCRResponse> {
    try {
      // 创建 FormData 对象
      const formData = new FormData()

      // 如果 image 是 base64 字符串，转换为 Blob
      if (request.image.startsWith('data:')) {
        // 从 base64 字符串创建 Blob
        try {
          const response = await fetch(request.image)
          const blob = await response.blob()
          formData.append('file', blob, 'image.png')
        } catch (fetchError) {
          logger.error('[LinkMindService] Failed to convert base64 to blob:', fetchError)
          return {
            success: false,
            error:
              'Failed to convert image data: ' +
              (fetchError instanceof Error ? fetchError.message : 'unknown error'),
          }
        }
      } else {
        // 否则直接使用 image（可能是 URL）
        formData.append('file', request.image)
      }

      formData.append('language', request.language || 'zh-CN,en')
      formData.append('enableOCR', 'true')
      formData.append('extractText', 'true')

      // 使用 FormData 发送请求
      const response = await this.fetchFormData<any>('/ocr/doc2ocr', formData)

      // 处理 LinkMind 服务器的响应格式
      if (!response) {
        return {
          success: false,
          error: 'No response from OCR service',
        }
      }

      if (response.status === 'failed') {
        return {
          success: false,
          error: response.msg || 'OCR failed',
        }
      } else if (response.status === 'success') {
        return {
          success: true,
          text: response.text || '',
        }
      }
      return {
        success: false,
        error: 'Unexpected response format from OCR service',
      }
    } catch (error) {
      logger.error('[LinkMindService] OCR error:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'OCR failed',
      }
    }
  }

  async textToSQL(text: string): Promise<{ success: boolean; sql?: string; error?: string }> {
    try {
      const response = await this.fetch<any>('/sql/text2sql', {
        method: 'POST',
        body: JSON.stringify({ text }),
      })

      if (response.status === 'failed') {
        return {
          success: false,
          error: response.msg || 'Text-to-SQL failed',
        }
      } else if (response.status === 'success') {
        return {
          success: true,
          sql: response.sql,
        }
      }
      return response
    } catch (error) {
      logger.error('[LinkMindService] Text-to-SQL error:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Text-to-SQL failed',
      }
    }
  }

  async embed(request: EmbeddingRequest): Promise<EmbeddingResponse> {
    try {
      logger.info('[LinkMindService] embed() texts=', request.input.length, 'model=', request.model)
      const response = await this.fetch<any>('/v1/embeddings', {
        method: 'POST',
        body: JSON.stringify({
          model: request.model || this.config.defaultModel || 'bge-large',
          input: request.input,
          encoding_format: request.encodingFormat || 'float',
          dimensions: request.dimensions,
        }),
      })

      if (response.data && Array.isArray(response.data)) {
        const embeddings = response.data
          .sort((a: { index: number }, b: { index: number }) => a.index - b.index)
          .map((item: { embedding: number[] }) => item.embedding)

        return {
          success: true,
          embeddings,
          model: response.model || request.model,
          usage: response.usage
            ? {
                promptTokens: response.usage.prompt_tokens,
                totalTokens: response.usage.total_tokens,
              }
            : undefined,
          raw: response,
        }
      }

      return {
        success: false,
        error: 'Invalid embeddings response format',
        raw: response,
      }
    } catch (error) {
      logger.error('[LinkMindService] embed() error:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Embedding failed',
      }
    }
  }

  async rerank(request: RerankRequest): Promise<RerankResponse> {
    try {
      logger.info(
        '[LinkMindService] rerank() query length=',
        request.query.length,
        'docs=',
        request.documents.length
      )
      const response = await this.fetch<any>('/v1/rerank', {
        method: 'POST',
        body: JSON.stringify({
          model: request.model || this.config.defaultModel || 'bge-reranker',
          query: request.query,
          documents: request.documents,
          top_n: request.topN,
          return_documents: request.returnDocuments ?? true,
        }),
      })

      if (response.results && Array.isArray(response.results)) {
        return {
          success: true,
          results: response.results.map((r: { index: number; relevance_score: number }) => ({
            index: r.index,
            score: r.relevance_score,
          })),
          raw: response,
        }
      }

      return {
        success: false,
        error: 'Invalid rerank response format',
        raw: response,
      }
    } catch (error) {
      logger.error('[LinkMindService] rerank() error:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Rerank failed',
      }
    }
  }

  async generateInstruction(
    prompt: string,
    options?: InstructionOptions
  ): Promise<InstructionResponse> {
    try {
      logger.info('[LinkMindService] generateInstruction()')
      const response = await this.fetch<any>('/instruction/generate', {
        method: 'POST',
        body: JSON.stringify({
          prompt,
          context: options?.context,
          style: options?.style || 'professional',
          max_length: options?.maxLength || 500,
          model: options?.model || this.config.defaultModel,
        }),
      })

      if (response.status === 'success') {
        return {
          success: true,
          instruction: response.instruction || response.text || '',
          raw: response,
        }
      } else if (response.status === 'failed') {
        return {
          success: false,
          error: response.msg || 'Instruction generation failed',
          raw: response,
        }
      }

      return {
        success: true,
        instruction:
          typeof response.instruction === 'string'
            ? response.instruction
            : JSON.stringify(response.instruction),
        raw: response,
      }
    } catch (error) {
      logger.error('[LinkMindService] generateInstruction() error:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Instruction generation failed',
      }
    }
  }

  async getStats(options?: StatsOptions): Promise<StatsResponse> {
    try {
      const params = new URLSearchParams()
      if (options?.period) params.set('period', options.period)
      if (options?.model) params.set('model', options.model)

      const endpoint = `/stats/tokens${params.toString() ? `?${params}` : ''}`
      const response = await this.fetch<any>(endpoint)

      return {
        success: true,
        data: response,
        raw: response,
      }
    } catch (error) {
      logger.error('[LinkMindService] getStats() error:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to fetch stats',
      }
    }
  }

  async cacheGet(key: string): Promise<CacheResponse> {
    try {
      const response = await this.fetch<any>(`/cache/${encodeURIComponent(key)}`)
      return {
        success: true,
        value: response.value,
        exists: response.exists ?? true,
        ttl: response.ttl,
        raw: response,
      }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Cache get failed',
        exists: false,
      }
    }
  }

  async cacheSet(
    key: string,
    value: any,
    ttl?: number
  ): Promise<{ success: boolean; error?: string }> {
    try {
      await this.fetch<any>(`/cache/${encodeURIComponent(key)}`, {
        method: 'PUT',
        body: JSON.stringify({ value, ttl }),
      })
      return { success: true }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Cache set failed',
      }
    }
  }

  async checkContent(content: string): Promise<FilterResponse> {
    try {
      const response = await this.fetch<any>('/filter/check', {
        method: 'POST',
        body: JSON.stringify({ content }),
      })

      return {
        success: true,
        passed: response.passed ?? true,
        matchedRules: response.matched_rules || [],
        action: response.action || 'none',
        raw: response,
      }
    } catch (error) {
      return {
        success: false,
        passed: true,
        error: error instanceof Error ? error.message : 'Filter check failed',
        matchedRules: [],
        action: 'none',
      }
    }
  }
}

export interface EmbeddingRequest {
  input: string | string[]
  model?: string
  encodingFormat?: 'float' | 'base64'
  dimensions?: number
}

export interface EmbeddingResponse {
  success: boolean
  embeddings?: number[][]
  model?: string
  usage?: { promptTokens: number; totalTokens: number }
  error?: string
  raw?: any
}

export interface RerankRequest {
  query: string
  documents: string[]
  model?: string
  topN?: number
  returnDocuments?: boolean
}

export interface RerankResponse {
  success: boolean
  results?: Array<{ index: number; score: number }>
  error?: string
  raw?: any
}

export interface InstructionOptions {
  context?: string
  style?: 'professional' | 'casual' | 'technical' | 'creative'
  maxLength?: number
  model?: string
}

export interface InstructionResponse {
  success: boolean
  instruction?: string
  error?: string
  raw?: any
}

export interface StatsOptions {
  period?: 'today' | 'week' | 'month'
  model?: string
}

export interface StatsResponse {
  success: boolean
  data?: any
  error?: string
  raw?: any
}

export interface CacheResponse {
  success: boolean
  value?: any
  exists: boolean
  ttl?: number
  error?: string
  raw?: any
}

export interface FilterResponse {
  success: boolean
  passed: boolean
  matchedRules: string[]
  action: 'block' | 'warn' | 'none'
  error?: string
  raw?: any
}

export const linkMindService = LinkMindService.getInstance()
