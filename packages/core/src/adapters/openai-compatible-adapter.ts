/**
 * OpenAI 兼容模型适配器
 * 支持 OpenAI、DeepSeek、Claude 等兼容 API 的模型
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
 * OpenAI 兼容适配器配置
 */
export interface OpenAICompatibleConfig {
  /** 提供商名称 */
  provider: string;
  /** 模型名称 */
  model: string;
  /** API 地址 */
  baseUrl: string;
  /** API 密钥 */
  apiKey: string;
  /** 额外能力配置 */
  capabilities?: Partial<ModelCapability>;
}

/**
 * OpenAI 兼容模型适配器
 * 提供 OpenAI Chat Completions API 兼容模型的统一接口
 */
export class OpenAICompatibleAdapter implements IModelAdapter {
  readonly provider: string;
  readonly modelName: string;
  readonly capabilities: ModelCapability;

  private baseUrl: string;
  private apiKey: string;

  constructor(config: OpenAICompatibleConfig) {
    this.provider = config.provider;
    this.modelName = config.model;
    this.baseUrl = config.baseUrl.replace(/\/$/, ''); // 移除末尾斜杠
    this.apiKey = config.apiKey;

    // 根据提供商设置默认能力
    this.capabilities = this.getCapabilities(config.capabilities);
  }

  /**
   * 获取模型能力
   */
  private getCapabilities(override?: Partial<ModelCapability>): ModelCapability {
    // 提供商默认能力映射
    const providerDefaults: Record<string, Partial<ModelCapability>> = {
      openai: {
        supportsFunctionCall: true,
        supportsVision: true,
        supportsMultimodal: true,
        typicalLatency: 500,
        costPerToken: 0.00001, // GPT-4
      },
      deepseek: {
        supportsFunctionCall: false,
        supportsVision: false,
        supportsMultimodal: false,
        typicalLatency: 300,
        costPerToken: 0.000001, // DeepSeek V2
      },
      anthropic: {
        supportsFunctionCall: true,
        supportsVision: true,
        supportsMultimodal: true,
        typicalLatency: 800,
        costPerToken: 0.000003, // Claude 3
      },
      azure: {
        supportsFunctionCall: true,
        supportsVision: true,
        supportsMultimodal: true,
        typicalLatency: 600,
        costPerToken: 0.00001,
      },
      gemini: {
        supportsFunctionCall: true,
        supportsVision: true,
        supportsMultimodal: true,
        typicalLatency: 400,
        costPerToken: 0.00000125, // Gemini 1.5 Pro
      },
    };

    const defaults = providerDefaults[this.provider] || {};

    return {
      supportsChat: true,
      supportsGenerate: true,
      supportsStreaming: true,
      supportsMultimodal: defaults.supportsMultimodal ?? false,
      supportsFunctionCall: defaults.supportsFunctionCall ?? false,
      supportsVision: defaults.supportsVision ?? false,
      maxContextLength: 128000,
      maxTokens: 4096,
      typicalLatency: defaults.typicalLatency ?? 500,
      costPerToken: defaults.costPerToken ?? 0.00001,
      ...override,
      // Aliases for compatibility
      streaming: true,
      functionCalling: defaults.supportsFunctionCall ?? false,
      vision: defaults.supportsVision ?? false,
      multimodal: defaults.supportsMultimodal ?? false,
    };
  }

  /**
   * 更新 API 密钥
   */
  setApiKey(apiKey: string): void {
    this.apiKey = apiKey;
  }

  /**
   * 聊天对话
   */
  async chat(request: ChatRequest): Promise<ChatResponse> {
    const response = await this.fetch('/chat/completions', {
      method: 'POST',
      body: {
        model: this.modelName,
        messages: this.formatMessages(request.messages),
        stream: false,
        temperature: request.temperature ?? 0.7,
        max_tokens: request.maxTokens ?? 4096,
        ...this.getExtraParams(request),
      },
    });

    const data = response as any;

    return {
      message: {
        role: 'assistant',
        content: data.choices?.[0]?.message?.content || '',
      },
      done: true,
    };
  }

  /**
   * 流式聊天对话
   */
  async *chatStream(request: ChatRequest): AsyncGenerator<ChatChunk> {
    const response = await this.fetch('/chat/completions', {
      method: 'POST',
      body: {
        model: this.modelName,
        messages: this.formatMessages(request.messages),
        stream: true,
        temperature: request.temperature ?? 0.7,
        max_tokens: request.maxTokens ?? 4096,
        ...this.getExtraParams(request),
      },
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
        if (line.trim() && line.startsWith('data: ')) {
          const dataStr = line.slice(6);

          if (dataStr === '[DONE]') {
            yield { delta: '', done: true };
            break;
          }

          try {
            const data = JSON.parse(dataStr);
            const delta = data.choices?.[0]?.delta?.content || '';

            if (delta) {
              yield { delta, done: false };
            }

            if (data.choices?.[0]?.finish_reason) {
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
   * 文本生成 (使用 chat 接口)
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
    try {
      const response = await this.fetch('/models', { method: 'GET' });
      const data = response as any;

      return (data.data || []).map((m: any) => ({
        name: m.id,
        provider: this.provider,
        model: m.id,
        capabilities: this.capabilities,
        status: 'available' as const,
      }));
    } catch {
      // 返回当前模型
      return [{
        name: this.modelName,
        provider: this.provider,
        model: this.modelName,
        capabilities: this.capabilities,
        status: await this.isAvailable() ? 'available' : 'unavailable',
      }];
    }
  }

  /**
   * 检查服务可用性
   */
  async isAvailable(): Promise<boolean> {
    try {
      await this.fetch('/models', { method: 'GET' });
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
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };

    // 根据提供商添加认证头
    if (this.provider === 'anthropic') {
      headers['x-api-key'] = this.apiKey;
      headers['anthropic-version'] = '2023-06-01';
    } else {
      headers['Authorization'] = `Bearer ${this.apiKey}`;
    }

    const response = await fetch(`${this.baseUrl}${endpoint}`, {
      method: options.method,
      headers,
      body: options.body ? JSON.stringify(options.body) : undefined,
    });

    if (!response.ok) {
      const error = await response.text().catch(() => response.statusText);
      throw new Error(`API error ${response.status}: ${error}`);
    }

    return response;
  }

  /**
   * 格式化消息
   */
  private formatMessages(messages: ChatMessage[]): any[] {
    return messages.map(msg => {
      // 多模态消息
      if (msg.images?.length && this.capabilities.supportsVision) {
        return {
          role: msg.role,
          content: [
            { type: 'text', text: msg.content },
            {
              type: 'image_url',
              image_url: {
                url: this.formatImageUrl(msg.images[0]),
              },
            },
          ],
        };
      }

      // 函数调用 (OpenAI 格式)
      if (msg.functionCall) {
        return {
          role: msg.role,
          content: msg.content,
          function_call: msg.functionCall,
        };
      }

      return { role: msg.role, content: msg.content };
    });
  }

  /**
   * 格式化图片 URL
   */
  private formatImageUrl(url: string): string {
    // 如果是 base64，保持原样
    if (url.startsWith('data:')) {
      return url;
    }
    // 如果是普通 URL，直接返回
    return url;
  }

  /**
   * 获取额外参数
   */
  private getExtraParams(request: ChatRequest): Record<string, any> {
    const params: Record<string, any> = {};

    // OpenAI 特定参数
    if (this.provider === 'openai' || this.provider === 'azure') {
      if (request.options?.top_p) params.top_p = request.options.top_p;
      if (request.options?.frequency_penalty) params.frequency_penalty = request.options.frequency_penalty;
      if (request.options?.presence_penalty) params.presence_penalty = request.options.presence_penalty;
      if (request.options?.stop) params.stop = request.options.stop;
    }

    // Anthropic 特定参数
    if (this.provider === 'anthropic') {
      params.max_tokens = request.maxTokens ?? 4096;
      if (request.options?.top_p) params.top_p = request.options.top_p;
      if (request.options?.top_k) params.top_k = request.options.top_k;
      params.system = request.system;
    }

    // Gemini 特定参数
    if (this.provider === 'gemini') {
      params.max_output_tokens = request.maxTokens ?? 4096;
      if (request.options?.top_p) params.top_p = request.options.top_p;
      if (request.options?.temperature) params.temperature = request.temperature;
    }

    return params;
  }
}

// 默认导出
export default OpenAICompatibleAdapter;
