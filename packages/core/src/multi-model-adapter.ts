/**
 * 多模型适配层 - 核心实现
 * 统一接口 + 智能路由 + 多模型支持
 */

import { OllamaClient } from './utils/ollama-client'
import { logger } from './utils/logger'
import { eventBus } from './utils/event-bus'

// =============================================
// 类型定义
// =============================================

/** 模型能力 */
export interface ModelCapability {
  supportsChat: boolean
  supportsGenerate: boolean
  supportsStreaming: boolean
  supportsMultimodal: boolean
  supportsFunctionCall: boolean
  supportsVision: boolean
  maxContextLength: number
  maxTokens: number
  typicalLatency: number
  costPerToken: number
}

/** 聊天消息 */
export interface ChatMessage {
  role: 'system' | 'user' | 'assistant'
  content: string
  images?: string[]
  name?: string
}

/** 聊天请求 */
export interface ChatRequest {
  model?: string
  messages: ChatMessage[]
  system?: string
  temperature?: number
  maxTokens?: number
  stream?: boolean
  options?: Record<string, any>
}

/** 聊天响应 */
export interface ChatResponse {
  message: ChatMessage
  done: boolean
  totalDuration?: number
}

/** 流式响应块 */
export interface ChatChunk {
  delta: string
  done: boolean
  metrics?: {
    promptEvalCount?: number
    evalCount?: number
    totalDuration?: number
  }
}

/** 模型信息 */
export interface ModelInfo {
  name: string
  provider: string
  model: string
  capabilities: ModelCapability
  status: 'available' | 'unavailable' | 'loading'
}

/** 模型统计 */
export interface ModelStats {
  model: string
  totalQueries: number
  successfulQueries: number
  failedQueries: number
  averageResponseTime: number
  lastUsed: string
}

/** 路由决策 */
export interface RoutingDecision {
  adapterName: string
  model: string
  reasoning: string
  confidence: number
  estimatedLatency: number
  estimatedCost: number
}

/** 适配器接口 */
export interface IModelAdapter {
  readonly provider: string
  readonly modelName: string
  readonly capabilities: ModelCapability

  chat(request: ChatRequest): Promise<ChatResponse>
  chatStream(request: ChatRequest): AsyncGenerator<ChatChunk, void, unknown>
  generate(prompt: string, options?: any): Promise<{ response: string }>

  listModels(): Promise<ModelInfo[]>
  isAvailable(): Promise<boolean>
}

// =============================================
// 复杂度计算
// =============================================

/**
 * 计算消息复杂度
 * @param message 输入文本
 * @returns 复杂度分数 (0-1)
 */
export function calculateMessageComplexity(message: string): number {
  // 长度得分 (最大 0.5)
  const lengthScore = Math.min(message.length / 500, 0.5)

  // 代码检测 (+0.3)
  const hasCode = /```[\s\S]*?```|`[\s\S]*?`/.test(message)

  // 数学公式检测 (+0.2)
  const hasMath =
    /\$[\s\S]*?\$|\\\(.*\\\)|\[.*\]/.test(message) &&
    (message.includes('+') || message.includes('=') || message.includes('∑'))

  // 多问题检测 (+0.1)
  const hasMultipleQuestions = (message.match(/\?/g) || []).length > 2

  // 多模态检测 (+0.2)
  const hasImages = /!\[.*?\]\(.*?\)|<img/.test(message)

  let score = lengthScore
  if (hasCode) score += 0.3
  if (hasMath) score += 0.2
  if (hasMultipleQuestions) score += 0.1
  if (hasImages) score += 0.2

  return Math.min(score, 1)
}

/**
 * 根据复杂度选择模型类型
 */
export function selectModelType(complexity: number): 'lightweight' | 'heavyweight' {
  return complexity > 0.6 ? 'heavyweight' : 'lightweight'
}

// =============================================
// Ollama 适配器
// =============================================

export class OllamaAdapter implements IModelAdapter {
  readonly provider = 'ollama'
  readonly modelName: string
  readonly capabilities: ModelCapability

  private client: OllamaClient

  constructor(config: { baseUrl?: string; defaultModel?: string; timeout?: number }) {
    this.client = new OllamaClient({
      baseUrl: config.baseUrl,
      defaultModel: config.defaultModel || 'gemma4:26b',
      timeout: config.timeout || 360000,
    })

    this.modelName = config.defaultModel || 'gemma4:26b'

    this.capabilities = {
      supportsChat: true,
      supportsGenerate: true,
      supportsStreaming: true,
      supportsMultimodal: false,
      supportsFunctionCall: false,
      supportsVision: false,
      maxContextLength: 8192,
      maxTokens: 4096,
      typicalLatency: 100,
      costPerToken: 0,
    }
  }

  async chat(request: ChatRequest): Promise<ChatResponse> {
    const response = await this.client.chat({
      model: request.model || this.modelName,
      messages: request.messages.map(m => ({
        role: m.role,
        content: m.content,
        images: m.images,
      })),
      system: request.system,
      options: request.options,
    })

    return {
      message: response.message,
      done: true,
      totalDuration: (response as any).total_duration ?? (response as any).totalDuration,
    }
  }

  async *chatStream(request: ChatRequest): AsyncGenerator<ChatChunk> {
    for await (const chunk of this.client.chatStream({
      model: request.model || this.modelName,
      messages: request.messages.map(m => ({
        role: m.role,
        content: m.content,
        images: m.images,
      })),
      system: request.system,
      options: request.options,
    })) {
      yield {
        delta: chunk.message?.content || '',
        done: chunk.done || false,
        metrics: {
          promptEvalCount: (chunk as any).prompt_eval_count ?? (chunk as any).promptEvalCount,
          evalCount: (chunk as any).eval_count ?? (chunk as any).evalCount,
          totalDuration: (chunk as any).total_duration ?? (chunk as any).totalDuration,
        },
      }
    }
  }

  async generate(prompt: string, options?: any): Promise<{ response: string }> {
    const response = await this.client.generate(prompt, options)
    return { response: response.response }
  }

  async listModels(): Promise<ModelInfo[]> {
    const models = await this.client.listModels()
    return models.map((m: { name: string }) => ({
      name: m.name,
      provider: 'ollama',
      model: m.name,
      capabilities: this.capabilities,
      status: 'available',
    }))
  }

  async isAvailable(): Promise<boolean> {
    return this.client.isAvailable()
  }
}

// =============================================
// OpenAI 兼容适配器
// =============================================

export class OpenAICompatibleAdapter implements IModelAdapter {
  readonly provider: string
  readonly modelName: string
  readonly capabilities: ModelCapability

  private baseUrl: string
  private apiKey: string

  constructor(config: {
    provider: string
    model: string
    baseUrl: string
    apiKey: string
    capabilities?: Partial<ModelCapability>
  }) {
    this.provider = config.provider
    this.modelName = config.model
    this.baseUrl = config.baseUrl
    this.apiKey = config.apiKey

    this.capabilities = {
      supportsChat: true,
      supportsGenerate: true,
      supportsStreaming: true,
      supportsMultimodal: config.capabilities?.supportsMultimodal ?? false,
      supportsFunctionCall: config.capabilities?.supportsFunctionCall ?? false,
      supportsVision: config.capabilities?.supportsVision ?? false,
      maxContextLength: config.capabilities?.maxContextLength ?? 128000,
      maxTokens: config.capabilities?.maxTokens ?? 4096,
      typicalLatency: config.capabilities?.typicalLatency ?? 500,
      costPerToken: config.capabilities?.costPerToken ?? 0.0001,
    }
  }

  async chat(request: ChatRequest): Promise<ChatResponse> {
    const response = await fetch(`${this.baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${this.apiKey}`,
      },
      body: JSON.stringify({
        model: this.modelName,
        messages: this.formatMessages(request.messages),
        stream: false,
        temperature: request.temperature ?? 0.7,
        max_tokens: request.maxTokens ?? 4096,
      }),
    })

    if (!response.ok) {
      throw new Error(`API error: ${response.status} ${response.statusText}`)
    }

    const data = await response.json()
    return {
      message: {
        role: 'assistant',
        content: data.choices[0].message.content,
      },
      done: true,
    }
  }

  async *chatStream(request: ChatRequest): AsyncGenerator<ChatChunk> {
    const response = await fetch(`${this.baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${this.apiKey}`,
      },
      body: JSON.stringify({
        model: this.modelName,
        messages: this.formatMessages(request.messages),
        stream: true,
        temperature: request.temperature ?? 0.7,
        max_tokens: request.maxTokens ?? 4096,
      }),
    })

    if (!response.ok) {
      throw new Error(`API error: ${response.status} ${response.statusText}`)
    }

    const reader = response.body?.getReader()
    if (!reader) throw new Error('No response body')

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
          const dataStr = line.slice(6)
          if (dataStr === '[DONE]') {
            yield { delta: '', done: true }
            break
          }

          try {
            const data = JSON.parse(dataStr)
            const delta = data.choices[0]?.delta?.content || ''
            if (delta) {
              yield { delta, done: false }
            }
            if (data.choices[0]?.finish_reason) {
              yield { delta: '', done: true }
            }
          } catch (e) {
            // 忽略解析错误
          }
        }
      }
    }
  }

  async generate(prompt: string, options?: any): Promise<{ response: string }> {
    const response = await this.chat({
      messages: [{ role: 'user', content: prompt }],
      ...options,
    })
    return { response: response.message.content }
  }

  async listModels(): Promise<ModelInfo[]> {
    return [
      {
        name: this.modelName,
        provider: this.provider,
        model: this.modelName,
        capabilities: this.capabilities,
        status: 'available',
      },
    ]
  }

  async isAvailable(): Promise<boolean> {
    try {
      const response = await fetch(`${this.baseUrl}/models`, {
        headers: { Authorization: `Bearer ${this.apiKey}` },
      })
      return response.ok
    } catch {
      return false
    }
  }

  private formatMessages(messages: ChatMessage[]): any[] {
    return messages.map(msg => {
      if (msg.images?.length) {
        return {
          role: msg.role,
          content: [
            { type: 'text', text: msg.content },
            { type: 'image_url', image_url: { url: msg.images[0] } },
          ],
        }
      }
      return { role: msg.role, content: msg.content }
    })
  }
}

// =============================================
// 多模型适配层
// =============================================

export interface LayerConfig {
  ollama?: {
    baseUrl?: string
    defaultModel?: string
    timeout?: number
  }
  openai?: Record<
    string,
    {
      provider: string
      model: string
      baseUrl: string
      apiKey: string
      capabilities?: Partial<ModelCapability>
    }
  >
  linkmind?: {
    baseUrl?: string
    apiKey?: string
    defaultModel?: string
    timeout?: number
    transportMode?: 'direct' | 'backend-relay' | 'proxy'
  }
  default?: string
  preferLocal?: boolean
  complexityThreshold?: number
}

export class MultiModelAdapterLayer {
  private adapters: Map<string, IModelAdapter> = new Map()
  private stats: Map<string, ModelStats> = new Map()
  private defaultAdapterName: string
  private preferLocal: boolean
  private complexityThreshold: number

  constructor(config: LayerConfig = {}) {
    this.defaultAdapterName = config.default || 'ollama'
    this.preferLocal = config.preferLocal ?? true
    this.complexityThreshold = config.complexityThreshold ?? 0.6

    // 注册 Ollama
    if (config.ollama) {
      const adapter = new OllamaAdapter(config.ollama)
      this.adapters.set('ollama', adapter)
    }

    // 注册 OpenAI 兼容模型
    if (config.openai) {
      for (const [name, cfg] of Object.entries(config.openai)) {
        const adapter = new OpenAICompatibleAdapter(cfg)
        this.adapters.set(name, adapter)
      }
    }

    // 注册 LinkMind
    if (config.linkmind) {
      const { LinkMindAdapter } = require('./adapters/linkmind-adapter')
      const adapter = new LinkMindAdapter(config.linkmind)
      this.adapters.set('linkmind', adapter)
      logger.info('LinkMind adapter registered')
    }

    logger.info(`MultiModelAdapterLayer initialized with ${this.adapters.size} adapters`)
  }

  /**
   * 统一聊天接口 - 自动路由
   */
  async chat(request: ChatRequest): Promise<ChatResponse> {
    const decision = this.route(request)
    const adapter = this.adapters.get(decision.adapterName)

    if (!adapter) {
      throw new Error(`Adapter ${decision.adapterName} not found`)
    }

    logger.info(`Routing to ${decision.adapterName}:${decision.model}`)
    logger.debug(`Routing reasoning: ${decision.reasoning}`)

    const startTime = Date.now()

    try {
      const response = await adapter.chat({
        ...request,
        model: decision.model,
      })

      this.updateStats(decision.adapterName, true, Date.now() - startTime)
      return response
    } catch (error) {
      this.updateStats(decision.adapterName, false, Date.now() - startTime)

      // 降级到默认适配器
      if (decision.adapterName !== this.defaultAdapterName) {
        logger.warn(
          `Adapter ${decision.adapterName} failed, falling back to ${this.defaultAdapterName}`
        )
        const fallback = this.adapters.get(this.defaultAdapterName)
        if (fallback) {
          return fallback.chat(request)
        }
      }

      throw error
    }
  }

  /**
   * 统一流式聊天接口 - 自动路由
   */
  async *chatStream(request: ChatRequest): AsyncGenerator<ChatChunk> {
    const decision = this.route(request)
    const adapter = this.adapters.get(decision.adapterName)

    if (!adapter) {
      throw new Error(`Adapter ${decision.adapterName} not found`)
    }

    logger.info(`Routing (stream) to ${decision.adapterName}:${decision.model}`)

    try {
      yield* adapter.chatStream({
        ...request,
        model: decision.model,
      })
    } catch (error) {
      // 降级
      if (decision.adapterName !== this.defaultAdapterName) {
        const fallback = this.adapters.get(this.defaultAdapterName)
        if (fallback) {
          logger.warn(`Falling back to ${this.defaultAdapterName}`)
          yield* fallback.chatStream(request)
          return
        }
      }
      throw error
    }
  }

  /**
   * 直接指定适配器
   */
  async chatWith(adapterName: string, request: ChatRequest): Promise<ChatResponse> {
    const adapter = this.adapters.get(adapterName)
    if (!adapter) {
      throw new Error(`Adapter ${adapterName} not found`)
    }
    return adapter.chat(request)
  }

  /**
   * 智能路由
   */
  private route(request: ChatRequest): RoutingDecision {
    const text = request.messages.map(m => m.content).join(' ')
    const complexity = calculateMessageComplexity(text)
    const modelType = selectModelType(complexity)

    // 检查是否需要多模态
    const hasImages = request.messages.some(m => m.images?.length)

    // 获取可用适配器
    const available = Array.from(this.adapters.entries()).filter(
      ([name, adapter]) => adapter.capabilities.supportsChat
    )

    if (hasImages) {
      // 需要视觉能力
      const visionAdapter = available.find(([_, a]) => a.capabilities.supportsVision)
      if (visionAdapter) {
        return {
          adapterName: visionAdapter[0],
          model: visionAdapter[1].modelName,
          reasoning: `Requires vision capability for image input`,
          confidence: 0.95,
          estimatedLatency: visionAdapter[1].capabilities.typicalLatency,
          estimatedCost: visionAdapter[1].capabilities.costPerToken,
        }
      }
    }

    if (this.preferLocal && modelType === 'lightweight') {
      // 优先使用本地模型处理简单任务
      const ollama = this.adapters.get('ollama')
      if (ollama) {
        return {
          adapterName: 'ollama',
          model: ollama.modelName,
          reasoning: `Complexity ${(complexity * 100).toFixed(0)}% (${modelType}), prefer local zero-cost model`,
          confidence: 0.9,
          estimatedLatency: ollama.capabilities.typicalLatency,
          estimatedCost: 0,
        }
      }
    }

    // 默认路由
    const defaultAdapter = this.adapters.get(this.defaultAdapterName)
    if (defaultAdapter) {
      return {
        adapterName: this.defaultAdapterName,
        model: defaultAdapter.modelName,
        reasoning: `Default adapter for complexity ${(complexity * 100).toFixed(0)}%`,
        confidence: 0.85,
        estimatedLatency: defaultAdapter.capabilities.typicalLatency,
        estimatedCost: defaultAdapter.capabilities.costPerToken,
      }
    }

    // 降级到第一个可用
    const first = available[0]
    return {
      adapterName: first[0],
      model: first[1].modelName,
      reasoning: `Fallback to first available adapter`,
      confidence: 0.5,
      estimatedLatency: first[1].capabilities.typicalLatency,
      estimatedCost: first[1].capabilities.costPerToken,
    }
  }

  /**
   * 更新统计
   */
  private updateStats(adapterName: string, success: boolean, responseTime: number): void {
    const stats = this.stats.get(adapterName) || {
      model: adapterName,
      totalQueries: 0,
      successfulQueries: 0,
      failedQueries: 0,
      averageResponseTime: 0,
      lastUsed: new Date().toISOString(),
    }

    stats.totalQueries++
    if (success) {
      stats.successfulQueries++
    } else {
      stats.failedQueries++
    }

    stats.averageResponseTime =
      (stats.averageResponseTime * (stats.totalQueries - 1) + responseTime) / stats.totalQueries
    stats.lastUsed = new Date().toISOString()

    this.stats.set(adapterName, stats)
  }

  /**
   * 动态注册适配器
   */
  registerAdapter(name: string, adapter: IModelAdapter): void {
    if (this.adapters.has(name)) {
      logger.warn(`Adapter "${name}" already exists, replacing`)
    }
    this.adapters.set(name, adapter)
    logger.info(`Adapter "${name}" registered (${adapter.provider}/${adapter.modelName})`)
  }

  /**
   * 移除适配器
   */
  removeAdapter(name: string): boolean {
    return this.adapters.delete(name)
  }

  /**
   * 获取所有适配器信息
   */
  async listAdapters(): Promise<ModelInfo[]> {
    const results: ModelInfo[] = []

    for (const [name, adapter] of this.adapters.entries()) {
      const stats = this.stats.get(name)
      const available = await adapter.isAvailable().catch(() => false)

      results.push({
        name,
        provider: adapter.provider,
        model: adapter.modelName,
        capabilities: adapter.capabilities,
        status: available ? 'available' : 'unavailable',
      })
    }

    return results
  }

  /**
   * 获取统计信息
   */
  getStats(): Record<string, ModelStats> {
    const result: Record<string, ModelStats> = {}
    for (const [name, stats] of this.stats.entries()) {
      result[name] = stats
    }
    return result
  }
}

// =============================================
// 工厂函数
// =============================================

let globalLayer: MultiModelAdapterLayer | null = null

export function createMultiModelLayer(config?: LayerConfig): MultiModelAdapterLayer {
  globalLayer = new MultiModelAdapterLayer(config)
  return globalLayer
}

export function getMultiModelLayer(): MultiModelAdapterLayer | null {
  return globalLayer
}

// 默认导出
export default MultiModelAdapterLayer
