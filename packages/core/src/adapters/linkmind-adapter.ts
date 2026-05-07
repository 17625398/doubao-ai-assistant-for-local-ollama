import { logger } from '../utils/logger'
import { eventBus } from '../utils/event-bus'
import { linkMindService, type LinkMindServiceConfig } from '../services/linkmind-service'
import type {
  IModelAdapter,
  ChatRequest,
  ChatResponse,
  ChatChunk,
  ModelInfo,
  ModelCapability,
  ChatMessage,
} from '../types/multi-model'

export interface LinkMindAdapterConfig {
  baseUrl?: string
  apiKey?: string
  defaultModel?: string
  timeout?: number
  transportMode?: 'direct' | 'backend-relay' | 'proxy'
  gatewayPath?: string
}

export class LinkMindAdapter implements IModelAdapter {
  readonly provider = 'linkmind'
  readonly modelName: string
  readonly capabilities: ModelCapability

  private config: LinkMindAdapterConfig

  constructor(config: LinkMindAdapterConfig = {}) {
    this.config = {
      baseUrl:
        config.baseUrl ||
        (typeof window !== 'undefined' ? '/api/linkmind' : 'http://localhost:8080'),
      apiKey: config.apiKey,
      defaultModel: config.defaultModel || 'qwen-plus',
      timeout: config.timeout || 60000,
      transportMode: config.transportMode || 'proxy',
      gatewayPath: config.gatewayPath || '/api/linkmind',
    }

    this.modelName = this.config.defaultModel!
    this.capabilities = this.getDefaultCapabilities()

    this.syncLinkMindConfig()
  }

  private getDefaultCapabilities(): ModelCapability {
    return {
      supportsChat: true,
      supportsGenerate: true,
      supportsStreaming: true,
      supportsMultimodal: true,
      supportsFunctionCall: true,
      supportsVision: true,
      maxContextLength: 128000,
      maxTokens: 8192,
      typicalLatency: 800,
      costPerToken: 0.000002,
      streaming: true,
      functionCalling: true,
      vision: true,
      multimodal: true,
    }
  }

  private syncLinkMindConfig(): void {
    try {
      linkMindService.updateConfig({
        baseUrl: this.config.baseUrl,
        apiKey: this.config.apiKey,
        timeout: this.config.timeout,
        transportMode: this.config.transportMode,
        gatewayPath: this.config.gatewayPath,
        defaultModel: this.config.defaultModel,
      } as LinkMindServiceConfig)
    } catch (e) {
      logger.warn('[LinkMindAdapter] Failed to sync config to LinkMindService:', e)
    }
  }

  updateConfig(updates: Partial<LinkMindAdapterConfig>): void {
    this.config = { ...this.config, ...updates }
    this.syncLinkMindConfig()
  }

  get currentModelName(): string {
    return this.config.defaultModel || this.modelName
  }

  private formatMessages(messages: ChatMessage[]): Array<{
    role: 'system' | 'user' | 'assistant'
    content: string | Array<{ type: string; text?: string; image_url?: { url: string } }>
  }> {
    return messages.map(msg => {
      if (msg.images?.length && typeof msg.content === 'string') {
        return {
          role: msg.role,
          content: [
            { type: 'text', text: msg.content },
            ...msg.images.map(img => ({
              type: 'image_url',
              image_url: { url: img },
            })),
          ],
        }
      }
      return {
        role: msg.role,
        content: msg.content,
      }
    })
  }

  async chat(request: ChatRequest): Promise<ChatResponse> {
    const startTime = Date.now()
    const model = request.model || this.modelName

    try {
      logger.info(`[LinkMindAdapter] chat() → ${model}, messages=${request.messages.length}`)

      const response = await linkMindService.chat({
        model,
        messages: this.formatMessages(request.messages),
        temperature: request.temperature ?? 0.7,
        max_tokens: request.maxTokens ?? 4096,
        stream: false,
      })

      const content = response.choices?.[0]?.message?.content || ''
      const duration = Date.now() - startTime

      eventBus.emit('linkmind:chat:complete', {
        model,
        duration,
        usage: response.usage,
        timestamp: Date.now(),
      })

      return {
        id: response.id,
        model: response.model || model,
        content,
        message: {
          role: 'assistant',
          content,
        },
        done: true,
        totalDuration: duration,
        usage: response.usage
          ? {
              inputTokens: response.usage.prompt_tokens,
              outputTokens: response.usage.completion_tokens,
              totalTokens: response.usage.total_tokens,
            }
          : undefined,
        finishReason: response.choices?.[0]?.finish_reason || 'stop',
        raw: response as unknown as Record<string, unknown>,
      }
    } catch (error) {
      logger.error('[LinkMindAdapter] chat() failed:', error)
      eventBus.emit('linkmind:chat:error', {
        model,
        error: error instanceof Error ? error.message : String(error),
        timestamp: Date.now(),
      })
      throw error
    }
  }

  async *chatStream(request: ChatRequest, signal?: AbortSignal): AsyncGenerator<ChatChunk> {
    const model = request.model || this.modelName
    let fullContent = ''

    logger.info(`[LinkMindAdapter] chatStream() → ${model}, messages=${request.messages.length}`)

    try {
      await linkMindService.chatStream(
        {
          model,
          messages: this.formatMessages(request.messages),
          temperature: request.temperature ?? 0.7,
          max_tokens: request.maxTokens ?? 4096,
          stream: true,
        },
        (chunk: string) => {
          fullContent += chunk
        }
      )

      yield {
        id: `linkmind-${Date.now()}`,
        delta: fullContent,
        fullContent,
        done: false,
      }

      yield {
        delta: '',
        fullContent,
        done: true,
      }
    } catch (error) {
      logger.error('[LinkMindAdapter] chatStream() failed:', error)

      if ((error as Error).name === 'AbortError' || signal?.aborted) {
        yield {
          delta: '',
          fullContent,
          done: true,
          finishReason: 'abort',
        }
        return
      }

      throw error
    }
  }

  async getModelInfo(): Promise<ModelInfo> {
    return {
      name: this.modelName,
      provider: this.provider,
      model: this.modelName,
      capabilities: this.capabilities,
      contextWindow: this.capabilities.maxContextLength,
      maxOutputTokens: this.capabilities.maxTokens,
      status: 'available',
    }
  }

  getCurrentModel(): string {
    return this.modelName
  }

  async listModels(): Promise<ModelInfo[]> {
    try {
      const models = await linkMindService.listModels()
      return models.map(m => ({
        name: m.id,
        provider: m.provider || 'linkmind',
        model: m.id,
        capabilities: {
          ...this.capabilities,
          supportsVision: this.detectVisionCapability(m.id),
          supportsMultimodal: this.detectVisionCapability(m.id),
        },
        status: 'available' as const,
      }))
    } catch (error) {
      logger.error('[LinkMindAdapter] listModels() failed:', error)
      return [
        {
          name: this.modelName,
          provider: this.provider,
          model: this.modelName,
          capabilities: this.capabilities,
          status: 'unavailable' as const,
        },
      ]
    }
  }

  private detectVisionCapability(modelId: string): boolean {
    const visionKeywords = [
      'vision',
      'gpt-4o',
      'gpt-4-turbo',
      'claude-3',
      'gemini',
      'qwen-vl',
      'glm-4v',
      'internvl',
      'llava',
      'moondream',
      'cogvlm',
      'minicpm-v',
      'deepseek-vl',
    ]
    const lower = modelId.toLowerCase()
    return visionKeywords.some(kw => lower.includes(kw))
  }

  async isAvailable(): Promise<boolean> {
    try {
      const result = await linkMindService.testConnection()
      return result.success
    } catch {
      return false
    }
  }

  async generate(prompt: string, options?: any): Promise<{ response: string }> {
    const response = await this.chat({
      messages: [{ role: 'user', content: prompt }],
      ...options,
    })
    return { response: response.content || '' }
  }
}
