/**
 * Ollama 模型适配器
 * 支持本地 Ollama 服务
 */

import { OllamaClient } from '../utils/ollama-client';
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
 * Ollama 适配器配置
 */
export interface OllamaAdapterConfig {
  /** Ollama 服务地址 */
  baseUrl?: string;
  /** 默认模型名称 */
  defaultModel?: string;
  /** 超时时间 (毫秒) */
  timeout?: number;
  /** 自定义请求头 */
  headers?: Record<string, string>;
}

/**
 * Ollama 模型适配器
 * 提供 Ollama 本地模型的统一接口
 */
export class OllamaAdapter implements IModelAdapter {
  readonly provider = 'ollama';
  readonly modelName: string;
  readonly capabilities: ModelCapability;

  private client: OllamaClient;
  private config: OllamaAdapterConfig;

  constructor(config: OllamaAdapterConfig = {}) {
    this.config = {
      baseUrl: config.baseUrl,
      defaultModel: config.defaultModel || 'gemma4:26b',
      timeout: config.timeout || 360000,
      ...config,
    };

    // 创建 Ollama 客户端
    this.client = new OllamaClient({
      baseUrl: this.config.baseUrl,
      defaultModel: this.config.defaultModel,
      timeout: this.config.timeout,
      headers: this.config.headers,
    });

    this.modelName = this.config.defaultModel!;

    // 设置默认能力
    this.capabilities = this.detectCapabilities();
  }

  /**
   * 检测模型能力
   * 可根据实际模型动态调整
   */
  private detectCapabilities(): ModelCapability {
    return {
      supportsChat: true,
      supportsGenerate: true,
      supportsStreaming: true,
      supportsMultimodal: false,
      supportsFunctionCall: false,
      supportsVision: false,
      maxContextLength: 8192,
      maxTokens: 4096,
      typicalLatency: 100, // 本地模型低延迟
      costPerToken: 0, // 无 API 成本
      // Aliases for compatibility
      streaming: true,
      functionCalling: false,
      vision: false,
      multimodal: false,
    };
  }

  /**
   * 更新默认模型
   */
  setDefaultModel(modelName: string): void {
    this.config.defaultModel = modelName;
    this.client.updateConfig({ defaultModel: modelName });
  }

  /**
   * 聊天对话
   */
  async chat(request: ChatRequest): Promise<ChatResponse> {
    const response = await this.client.chat({
      model: request.model || this.modelName,
      messages: request.messages.map(m => this.formatMessage(m)),
      system: request.system,
      options: {
        temperature: request.temperature,
        num_predict: request.maxTokens,
        ...request.options,
      },
    });

    return {
      message: {
        role: 'assistant',
        content: response.message?.content || '',
      },
      done: true,
      totalDuration: (response as any).total_duration ?? (response as any).totalDuration,
    };
  }

  /**
   * 流式聊天对话
   */
  async *chatStream(request: ChatRequest): AsyncGenerator<ChatChunk> {
    for await (const chunk of this.client.chatStream({
      model: request.model || this.modelName,
      messages: request.messages.map(m => this.formatMessage(m)),
      system: request.system,
      options: {
        temperature: request.temperature,
        num_predict: request.maxTokens,
        ...request.options,
      },
    })) {
      yield {
        delta: chunk.message?.content || '',
        done: chunk.done || false,
        metrics: {
          promptEvalCount: (chunk as any).prompt_eval_count ?? (chunk as any).promptEvalCount,
          evalCount: (chunk as any).eval_count ?? (chunk as any).evalCount,
          totalDuration: (chunk as any).total_duration ?? (chunk as any).totalDuration,
        },
      };
    }
  }

  /**
   * 文本生成
   */
  async generate(prompt: string, options?: any): Promise<{ response: string }> {
    const response = await this.client.generate(prompt, {
      model: this.modelName,
      ...options,
    });

    return {
      response: response.response || '',
    };
  }

  /**
   * 列出可用模型
   */
  async listModels(): Promise<ModelInfo[]> {
    try {
      const models = await this.client.listModels();

      return models.map((m: { name: string }) => ({
        name: m.name,
        provider: 'ollama',
        model: m.name,
        capabilities: {
          ...this.capabilities,
          // 根据模型名称调整能力
          supportsMultimodal: m.name.includes('llava') || m.name.includes('vision'),
          supportsVision: m.name.includes('llava') || m.name.includes('vision'),
        },
        status: 'available' as const,
      }));
    } catch (error) {
      return [{
        name: this.modelName,
        provider: 'ollama',
        model: this.modelName,
        capabilities: this.capabilities,
        status: 'unavailable',
      }];
    }
  }

  /**
   * 检查服务可用性
   */
  async isAvailable(): Promise<boolean> {
    return this.client.isAvailable();
  }

  /**
   * 拉取模型
   */
  async pullModel(modelName: string): Promise<void> {
    await this.client.pullModel(modelName);
  }

  /**
   * 删除模型
   */
  async deleteModel(modelName: string): Promise<void> {
    await this.client.deleteModel(modelName);
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
   * 格式化消息
   */
  private formatMessage(message: ChatMessage): any {
    const formatted: any = {
      role: message.role,
      content: message.content,
    };

    // 处理图片
    if (message.images?.length) {
      formatted.images = message.images;
    }

    // 处理函数调用
    if (message.functionCall) {
      formatted.images = undefined; // Ollama 不支持 function call
    }

    return formatted;
  }
}

// 默认导出
export default OllamaAdapter;
