/**
 * Gemini 专用适配器
 * 支持 Google Gemini 系列模型
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
 * Gemini 适配器配置
 */
export interface GeminiAdapterConfig {
  /** API 密钥 */
  apiKey: string;
  /** 模型名称 */
  model?: string;
  /** API 地址 */
  baseUrl?: string;
}

/**
 * Gemini 模型能力映射
 */
const GEMINI_MODELS: Record<string, Partial<ModelCapability>> = {
  'gemini-pro': {
    supportsVision: false,
    supportsMultimodal: false,
    maxContextLength: 32768,
    costPerToken: 0.00000125,
  },
  'gemini-pro-vision': {
    supportsVision: true,
    supportsMultimodal: true,
    maxContextLength: 12288,
    costPerToken: 0.000002,
  },
  'gemini-1.5-pro': {
    supportsVision: true,
    supportsMultimodal: true,
    maxContextLength: 1000000, // 1M tokens
    costPerToken: 0.00000125,
  },
  'gemini-1.5-flash': {
    supportsVision: true,
    supportsMultimodal: true,
    maxContextLength: 1000000,
    costPerToken: 0.000000075,
  },
  'gemini-2.0-flash': {
    supportsVision: true,
    supportsMultimodal: true,
    maxContextLength: 1000000,
    costPerToken: 0.000000075,
  },
};

/**
 * Gemini 适配器
 */
export class GeminiAdapter implements IModelAdapter {
  readonly provider = 'gemini';
  readonly modelName: string;
  readonly capabilities: ModelCapability;

  private apiKey: string;
  private baseUrl: string;

  constructor(config: GeminiAdapterConfig) {
    this.apiKey = config.apiKey;
    this.modelName = config.model || 'gemini-1.5-pro';
    this.baseUrl = config.baseUrl || 'https://generativelanguage.googleapis.com';

    // 获取模型能力
    const modelCaps = GEMINI_MODELS[this.modelName] || GEMINI_MODELS['gemini-1.5-pro'];

    this.capabilities = {
      supportsChat: true,
      supportsGenerate: true,
      supportsStreaming: true,
      supportsMultimodal: modelCaps.supportsMultimodal || false,
      supportsFunctionCall: true,
      supportsVision: modelCaps.supportsVision || false,
      maxContextLength: modelCaps.maxContextLength || 1000000,
      maxTokens: 8192,
      typicalLatency: 400,
      costPerToken: modelCaps.costPerToken || 0.000001,
      // Aliases for compatibility
      streaming: true,
      functionCalling: true,
      vision: modelCaps.supportsVision || false,
      multimodal: modelCaps.supportsMultimodal || false,
    };
  }

  /**
   * 聊天对话
   */
  async chat(request: ChatRequest): Promise<ChatResponse> {
    const contents = this.formatContents(request.messages);

    const response = await this.fetch('/v1beta/models/' + this.modelName + ':generateContent', {
      method: 'POST',
      body: {
        contents,
        generationConfig: {
          temperature: request.temperature ?? 0.9,
          topP: request.options?.top_p ?? 0.95,
          topK: request.options?.top_k ?? 40,
          maxOutputTokens: request.maxTokens ?? 8192,
        },
        systemInstruction: request.system ? { parts: [{ text: request.system }] } : undefined,
      },
    });

    const data = response as any;
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text || '';

    return {
      message: {
        role: 'assistant',
        content: text,
      },
      done: true,
    };
  }

  /**
   * 流式聊天对话
   */
  async *chatStream(request: ChatRequest): AsyncGenerator<ChatChunk> {
    const contents = this.formatContents(request.messages);

    const response = await this.fetchStream('/v1beta/models/' + this.modelName + ':streamGenerateContent', {
      method: 'POST',
      body: {
        contents,
        generationConfig: {
          temperature: request.temperature ?? 0.9,
          topP: request.options?.top_p ?? 0.95,
          topK: request.options?.top_k ?? 40,
          maxOutputTokens: request.maxTokens ?? 8192,
        },
        systemInstruction: request.system ? { parts: [{ text: request.system }] } : undefined,
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
        if (line.trim()) {
          try {
            const data = JSON.parse(line);
            const text = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
            if (text) {
              yield { delta: text, done: false };
            }
            if (data.candidates?.[0]?.finishReason) {
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
    try {
      const response = await this.fetch('/v1beta/models', { method: 'GET' });
      const data = response as any;

      return (data.models || []).map((m: any) => ({
        name: m.name.replace('models/', ''),
        provider: 'gemini',
        model: m.name.replace('models/', ''),
        capabilities: this.getModelCapabilities(m.name.replace('models/', '')),
        status: 'available',
      }));
    } catch {
      return [{
        name: this.modelName,
        provider: 'gemini',
        model: this.modelName,
        capabilities: this.capabilities,
        status: 'available',
      }];
    }
  }

  /**
   * 检查服务可用性
   */
  async isAvailable(): Promise<boolean> {
    try {
      await this.fetch('/v1beta/models', { method: 'GET' });
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
    const url = `${this.baseUrl}${endpoint}?key=${this.apiKey}`;

    const response = await fetch(url, {
      method: options.method,
      headers: { 'Content-Type': 'application/json' },
      body: options.body ? JSON.stringify(options.body) : undefined,
    });

    if (!response.ok) {
      const error = await response.text().catch(() => response.statusText);
      throw new Error(`Gemini API error ${response.status}: ${error}`);
    }

    return response;
  }

  /**
   * 流式请求
   */
  private async fetchStream(endpoint: string, options: {
    method: string;
    body?: any;
  }): Promise<Response> {
    const url = `${this.baseUrl}${endpoint}?key=${this.apiKey}`;

    const response = await fetch(url, {
      method: options.method,
      headers: { 'Content-Type': 'application/json' },
      body: options.body ? JSON.stringify(options.body) : undefined,
    });

    if (!response.ok) {
      const error = await response.text().catch(() => response.statusText);
      throw new Error(`Gemini API error ${response.status}: ${error}`);
    }

    return response;
  }

  /**
   * 格式化消息为 Gemini 格式
   */
  private formatContents(messages: ChatMessage[]): any[] {
    const contents: any[] = [];

    for (const msg of messages) {
      const parts: any[] = [];

      // 添加文本内容
      parts.push({ text: msg.content });

      // 添加图片（如果有）
      if (msg.images?.length && this.capabilities.supportsVision) {
        for (const imageUrl of msg.images) {
          if (imageUrl.startsWith('data:')) {
            // Base64 图片
            const [header, data] = imageUrl.split(',');
            const mimeType = header.match(/:(.*?);/)?.[1] || 'image/jpeg';
            parts.push({
              inlineData: {
                mimeType,
                data,
              },
            });
          } else {
            // URL 图片 - 需要转换为 base64
            // 简化处理，实际应先下载
            parts.push({
              inlineData: {
                mimeType: 'image/jpeg',
                data: imageUrl,
              },
            });
          }
        }
      }

      contents.push({
        role: msg.role === 'assistant' ? 'model' : 'user',
        parts,
      });
    }

    return contents;
  }

  /**
   * 获取模型能力
   */
  private getModelCapabilities(modelName: string): ModelCapability {
    const caps = GEMINI_MODELS[modelName] || {};

    return {
      ...this.capabilities,
      supportsVision: caps.supportsVision ?? false,
      supportsMultimodal: caps.supportsMultimodal ?? false,
      maxContextLength: caps.maxContextLength ?? 1000000,
      costPerToken: caps.costPerToken ?? 0.000001,
    };
  }
}

export default GeminiAdapter;
