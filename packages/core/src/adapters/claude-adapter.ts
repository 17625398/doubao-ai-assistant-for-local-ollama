/**
 * Claude 专用适配器
 * 支持 Anthropic Claude 系列模型
 */

import type {
  IModelAdapter,
  ChatRequest,
  ChatResponse,
  ChatChunk,
  ModelInfo,
  ModelCapability,
  ChatMessage,
} from '../types/multi-model';

/**
 * Claude 适配器配置
 */
export interface ClaudeAdapterConfig {
  /** API 密钥 */
  apiKey: string;
  /** 模型名称 */
  model?: string;
  /** API 地址 */
  baseUrl?: string;
  /** API 版本 */
  version?: string;
}

/**
 * Claude 模型能力映射
 */
const CLAUDE_MODELS: Record<string, Partial<ModelCapability>> = {
  'claude-3-5-sonnet-20241022': {
    supportsVision: true,
    supportsMultimodal: true,
    supportsFunctionCall: true,
    maxContextLength: 200000,
    maxTokens: 8192,
    costPerToken: 0.000003,
    typicalLatency: 800,
  },
  'claude-3-5-haiku-20241022': {
    supportsVision: false,
    supportsMultimodal: false,
    supportsFunctionCall: true,
    maxContextLength: 200000,
    maxTokens: 4096,
    costPerToken: 0.0000008,
    typicalLatency: 500,
  },
  'claude-3-opus-20240229': {
    supportsVision: true,
    supportsMultimodal: true,
    supportsFunctionCall: true,
    maxContextLength: 200000,
    maxTokens: 4096,
    costPerToken: 0.000015,
    typicalLatency: 1200,
  },
  'claude-3-sonnet-20240229': {
    supportsVision: true,
    supportsMultimodal: true,
    supportsFunctionCall: true,
    maxContextLength: 200000,
    maxTokens: 4096,
    costPerToken: 0.000003,
    typicalLatency: 800,
  },
  'claude-3-haiku-20240307': {
    supportsVision: false,
    supportsMultimodal: false,
    supportsFunctionCall: false,
    maxContextLength: 200000,
    maxTokens: 4096,
    costPerToken: 0.0000008,
    typicalLatency: 400,
  },
};

/**
 * Claude 适配器
 */
export class ClaudeAdapter implements IModelAdapter {
  readonly provider = 'anthropic';
  readonly modelName: string;
  readonly capabilities: ModelCapability;

  private apiKey: string;
  private baseUrl: string;
  private version: string;

  constructor(config: ClaudeAdapterConfig) {
    this.apiKey = config.apiKey;
    this.modelName = config.model || 'claude-3-5-sonnet-20241022';
    this.baseUrl = config.baseUrl || 'https://api.anthropic.com';
    this.version = config.version || '2023-06-01';

    const modelCaps = CLAUDE_MODELS[this.modelName] || CLAUDE_MODELS['claude-3-5-sonnet-20241022'];

    this.capabilities = {
      supportsChat: true,
      supportsGenerate: true,
      supportsStreaming: true,
      supportsMultimodal: modelCaps.supportsMultimodal ?? true,
      supportsFunctionCall: modelCaps.supportsFunctionCall ?? true,
      supportsVision: modelCaps.supportsVision ?? true,
      maxContextLength: modelCaps.maxContextLength || 200000,
      maxTokens: modelCaps.maxTokens || 4096,
      typicalLatency: modelCaps.typicalLatency || 800,
      costPerToken: modelCaps.costPerToken || 0.000003,
      // Aliases for compatibility
      streaming: true,
      functionCalling: modelCaps.supportsFunctionCall ?? true,
      vision: modelCaps.supportsVision ?? true,
      multimodal: modelCaps.supportsMultimodal ?? true,
    };
  }

  /**
   * 聊天对话
   */
  async chat(request: ChatRequest): Promise<ChatResponse> {
    const body: any = {
      model: this.modelName,
      messages: this.formatMessages(request.messages),
      max_tokens: request.maxTokens || this.capabilities.maxTokens,
    };

    if (request.system) {
      body.system = request.system;
    }

    if (request.temperature !== undefined) {
      body.temperature = request.temperature;
    }

    if (request.options?.top_p) {
      body.top_p = request.options.top_p;
    }

    const response = await this.fetch('/v1/messages', {
      method: 'POST',
      body,
    });

    const data = response as any;

    return {
      message: {
        role: 'assistant',
        content: data.content?.[0]?.text || '',
      },
      done: true,
    };
  }

  /**
   * 流式聊天对话
   */
  async *chatStream(request: ChatRequest): AsyncGenerator<ChatChunk> {
    const body: any = {
      model: this.modelName,
      messages: this.formatMessages(request.messages),
      max_tokens: request.maxTokens || this.capabilities.maxTokens,
      stream: true,
    };

    if (request.system) {
      body.system = request.system;
    }

    if (request.temperature !== undefined) {
      body.temperature = request.temperature;
    }

    const response = await this.fetch('/v1/messages', {
      method: 'POST',
      body,
    });

    const reader = response.body?.getReader();
    if (!reader) throw new Error('No response body');

    const decoder = new TextDecoder();
    let buffer = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() || '';

      for (const line of lines) {
        if (line.startsWith('data: ')) {
          const dataStr = line.slice(6);

          if (dataStr === '[DONE]') {
            yield { delta: '', done: true };
            break;
          }

          try {
            const event = JSON.parse(dataStr);

            if (event.type === 'content_block_delta') {
              if (event.delta?.type === 'text_delta') {
                yield { delta: event.delta.text, done: false };
              }
            } else if (event.type === 'message_stop') {
              yield { delta: '', done: true };
            }
          } catch {
            // 忽略解析错误
          }
        }
      }
    }
  }

  /**
   * 文本生成
   */
  async generate(prompt: string, options?: any): Promise<{ response: string }> {
    const response = await this.chat({
      messages: [{ role: 'user', content: prompt }],
      ...options,
    });
    const content = typeof response.message?.content === 'string'
      ? response.message.content
      : response.content ?? '';
    return { response: content };
  }

  /**
   * 列出可用模型
   */
  async listModels(): Promise<ModelInfo[]> {
    // Claude API 不提供列出模型的端点
    return Object.keys(CLAUDE_MODELS).map(name => ({
      name,
      provider: 'anthropic',
      model: name,
      capabilities: this.getModelCapabilities(name),
      status: 'available',
    }));
  }

  /**
   * 检查服务可用性
   */
  async isAvailable(): Promise<boolean> {
    try {
      await this.fetch('/v1/messages', {
        method: 'POST',
        body: {
          model: this.modelName,
          max_tokens: 1,
          messages: [{ role: 'user', content: 'test' }],
        },
      });
      return true;
    } catch {
      return false;
    }
  }

  /**
   * 获取当前模型信息
   */
  async getModelInfo(): Promise<ModelInfo> {
    return {
      name: this.modelName,
      provider: this.provider,
      model: this.modelName,
      capabilities: this.capabilities,
    };
  }

  /**
   * 获取当前模型名称
   */
  getCurrentModel(): string {
    return this.modelName;
  }

  /**
   * 发送请求
   */
  private async fetch(endpoint: string, options: {
    method: string;
    body?: any;
  }): Promise<Response> {
    const response = await fetch(`${this.baseUrl}${endpoint}`, {
      method: options.method,
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': this.apiKey,
        'anthropic-version': this.version,
        'anthropic-dangerous-direct-browser-access': 'true',
      },
      body: JSON.stringify(options.body),
    });

    if (!response.ok) {
      const error = await response.text().catch(() => response.statusText);
      throw new Error(`Claude API error ${response.status}: ${error}`);
    }

    return response;
  }

  /**
   * 格式化消息为 Claude 格式
   */
  private formatMessages(messages: ChatMessage[]): any[] {
    const formatted: any[] = [];

    for (const msg of messages) {
      if (msg.role === 'system') continue; // Claude 使用单独的 system 参数

      const content: any[] = [{ type: 'text', text: msg.content }];

      // 添加图片（如果有）
      if (msg.images?.length && this.capabilities.supportsVision) {
        for (const imageUrl of msg.images) {
          if (imageUrl.startsWith('data:')) {
            const [header, data] = imageUrl.split(',');
            const mimeType = header.match(/:(.*?);/)?.[1] || 'image/jpeg';
            content.push({
              type: 'image',
              source: {
                type: 'base64',
                media_type: mimeType,
                data,
              },
            });
          } else {
            // URL 图片
            content.push({
              type: 'image',
              source: {
                type: 'url',
                url: imageUrl,
              },
            });
          }
        }
      }

      formatted.push({
        role: msg.role === 'assistant' ? 'assistant' : 'user',
        content,
      });
    }

    return formatted;
  }

  /**
   * 获取模型能力
   */
  private getModelCapabilities(modelName: string): ModelCapability {
    const caps = CLAUDE_MODELS[modelName] || {};

    return {
      ...this.capabilities,
      supportsVision: caps.supportsVision ?? true,
      supportsMultimodal: caps.supportsMultimodal ?? true,
      supportsFunctionCall: caps.supportsFunctionCall ?? true,
      maxContextLength: caps.maxContextLength || 200000,
      maxTokens: caps.maxTokens || 4096,
      costPerToken: caps.costPerToken || 0.000003,
      typicalLatency: caps.typicalLatency || 800,
    };
  }
}

export default ClaudeAdapter;
