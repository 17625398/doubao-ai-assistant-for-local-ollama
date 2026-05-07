/**
 * 本地模型适配器
 * 支持 Ollama、LM Studio、llama.cpp 等本地推理服务
 */

import type {
  IModelAdapter,
  ChatRequest,
  ChatResponse,
  ChatChunk,
  ModelInfo,
  ModelCapability,
} from '../types/multi-model';

/** 本地模型提供商类型 */
export type LocalProvider = 'ollama' | 'lm-studio' | 'llama-cpp' | 'text-generation-webui' | 'koboldcpp';

/** 本地模型配置 */
export interface LocalModelConfig {
  /** 提供商类型 */
  provider: LocalProvider;
  /** 服务地址 */
  baseUrl: string;
  /** 模型名称 */
  model: string;
  /** API Key (可选，某些服务需要) */
  apiKey?: string;
  /** 超时时间(ms) */
  timeout?: number;
  /** 默认最大 tokens */
  maxTokens?: number;
  /** 上下文窗口大小 */
  contextWindow?: number;
  /** 备用模型列表 */
  fallbackModels?: string[];
}

/** 本地模型响应格式 */
interface LocalModelResponse {
  model?: string;
  created_at?: string;
  response?: string;
  done?: boolean;
  context?: number[];
  total_duration?: number;
  load_duration?: number;
  prompt_eval_count?: number;
  prompt_eval_duration?: number;
  eval_count?: number;
  eval_duration?: number;
}

/** 本地模型流式块 */
interface LocalModelStreamChunk {
  model?: string;
  created_at?: string;
  response?: string;
  done?: boolean;
  context?: number[];
  total_duration?: number;
  eval_count?: number;
}

export class LocalModelAdapter implements IModelAdapter {
  readonly provider: string;
  readonly modelName: string;
  readonly capabilities: ModelCapability;

  private config: Required<LocalModelConfig>;

  constructor(config: LocalModelConfig) {
    this.provider = config.provider;
    this.modelName = config.model;
    this.config = {
      timeout: config.timeout ?? 300000, // 5 分钟
      maxTokens: config.maxTokens ?? 2048,
      contextWindow: config.contextWindow ?? 4096,
      fallbackModels: config.fallbackModels ?? [],
      apiKey: config.apiKey ?? '',
      ...config,
    };

    // 根据提供商设置能力
    this.capabilities = this.getProviderCapabilities(config.provider);
  }

  /** 获取提供商能力 */
  private getProviderCapabilities(provider: LocalProvider): ModelCapability {
    switch (provider) {
      case 'ollama':
        return {
          streaming: true,
          functionCalling: false,
          vision: false,
          jsonMode: false,
        };
      case 'lm-studio':
        return {
          streaming: true,
          functionCalling: false,
          vision: false,
          jsonMode: true,
        };
      case 'llama-cpp':
        return {
          streaming: true,
          functionCalling: false,
          vision: false,
          jsonMode: false,
        };
      default:
        return {
          streaming: true,
          functionCalling: false,
          vision: false,
          jsonMode: false,
        };
    }
  }

  /** 获取模型信息 */
  async getModelInfo(): Promise<ModelInfo> {
    return {
      name: this.modelName,
      provider: this.provider,
      model: this.modelName,
      capabilities: this.capabilities,
      contextWindow: this.config.contextWindow,
      maxOutputTokens: this.config.maxTokens,
    };
  }

  /** 发送聊天请求 */
  async chat(request: ChatRequest): Promise<ChatResponse> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), this.config.timeout);

    try {
      const response = await fetch(this.getChatEndpoint(), {
        method: 'POST',
        headers: this.getHeaders(),
        body: JSON.stringify(this.buildBody(request)),
        signal: controller.signal,
      });

      if (!response.ok) {
        const error = await response.text();
        throw new Error(`${this.provider} error ${response.status}: ${error}`);
      }

      const data: LocalModelResponse = await response.json();
      return this.parseResponse(data);
    } finally {
      clearTimeout(timeout);
    }
  }

  /** 流式聊天请求 */
  async *chatStream(
    request: ChatRequest,
    signal?: AbortSignal
  ): AsyncGenerator<ChatChunk, void, unknown> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), this.config.timeout);

    const combinedSignal = signal
      ? this.mergeSignals(signal, controller.signal)
      : controller.signal;

    try {
      const response = await fetch(this.getChatEndpoint(), {
        method: 'POST',
        headers: this.getHeaders(),
        body: JSON.stringify(this.buildBody({ ...request, stream: true })),
        signal: combinedSignal,
      });

      if (!response.ok) {
        const error = await response.text();
        throw new Error(`${this.provider} error ${response.status}: ${error}`);
      }

      const reader = response.body?.getReader();
      if (!reader) {
        throw new Error('Response body is not readable');
      }

      const decoder = new TextDecoder();
      let buffer = '';
      let finalContent = '';
      let totalDuration = 0;
      let evalCount = 0;

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() ?? '';

        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed) continue;

          // Ollama 格式
          if (trimmed.startsWith('{') && trimmed.endsWith('}')) {
            try {
              const chunk: LocalModelStreamChunk = JSON.parse(trimmed);

              if (chunk.total_duration) {
                totalDuration = chunk.total_duration;
              }
              if (chunk.eval_count) {
                evalCount = chunk.eval_count;
              }

              if (chunk.response !== undefined) {
                finalContent += chunk.response;
                yield {
                  id: `local-${Date.now()}`,
                  delta: chunk.response,
                  done: chunk.done ?? false,
                };
              }

              if (chunk.done) {
                yield {
                  id: `local-${Date.now()}`,
                  delta: '',
                  done: true,
                  fullContent: finalContent,
                  finishReason: 'stop',
                  raw: chunk as unknown as Record<string, unknown>,
                };
                return;
              }
            } catch {
              // 忽略解析错误
            }
          }
        }
      }

      // 如果没有收到 done 信号，手动发送完成
      if (!finalContent) {
        finalContent = buffer;
      }

      yield {
        id: `local-${Date.now()}`,
        delta: '',
        done: true,
        fullContent: finalContent,
        finishReason: 'stop',
      };
    } finally {
      clearTimeout(timeout);
      controller.abort();
    }
  }

  /** 检查服务可用性 */
  async isAvailable(): Promise<boolean> {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 5000);

      const response = await fetch(this.getTagsEndpoint(), {
        method: 'GET',
        headers: this.getHeaders(),
        signal: controller.signal,
      });

      clearTimeout(timeout);
      return response.ok;
    } catch {
      return false;
    }
  }

  /** 获取当前模型 */
  getCurrentModel(): string {
    return this.modelName;
  }

  /** 更新配置 */
  updateConfig(updates: Partial<LocalModelConfig>): void {
    this.config = { ...this.config, ...updates };
  }

  /** 获取聊天端点 */
  private getChatEndpoint(): string {
    const base = this.config.baseUrl.replace(/\/$/, '');

    switch (this.provider) {
      case 'ollama':
        return `${base}/api/chat`;
      case 'lm-studio':
        return `${base}/v1/chat/completions`;
      case 'llama-cpp':
        return `${base}/v1/completions`;
      case 'text-generation-webui':
        return `${base}/v1/chat/completions`;
      case 'koboldcpp':
        return `${base}/v1/generate`;
      default:
        return `${base}/api/chat`;
    }
  }

  /** 获取标签列表端点 */
  private getTagsEndpoint(): string {
    const base = this.config.baseUrl.replace(/\/$/, '');

    switch (this.provider) {
      case 'ollama':
        return `${base}/api/tags`;
      case 'lm-studio':
        return `${base}/v1/models`;
      default:
        return `${base}/api/tags`;
    }
  }

  /** 获取请求头 */
  private getHeaders(): Record<string, string> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };

    if (this.config.apiKey) {
      headers['Authorization'] = `Bearer ${this.config.apiKey}`;
    }

    return headers;
  }

  /** 构建请求体 */
  private buildBody(request: ChatRequest): Record<string, unknown> {
    switch (this.provider) {
      case 'ollama':
        return this.buildOllamaBody(request);
      case 'lm-studio':
      case 'text-generation-webui':
        return this.buildOpenAICompatibleBody(request);
      case 'llama-cpp':
      case 'koboldcpp':
        return this.buildCompletionBody(request);
      default:
        return this.buildOllamaBody(request);
    }
  }

  /** Ollama 格式 */
  private buildOllamaBody(request: ChatRequest): Record<string, unknown> {
    const body: Record<string, unknown> = {
      model: request.model ?? this.config.model,
      messages: this.transformMessages(request.messages),
      stream: request.stream ?? false,
    };

    if (request.temperature !== undefined) {
      body.temperature = request.temperature;
    }

    if (request.maxTokens !== undefined) {
      body.options = body.options ?? {};
      (body.options as Record<string, unknown>).num_predict = request.maxTokens;
    }

    if (request.topP !== undefined) {
      body.options = body.options ?? {};
      (body.options as Record<string, unknown>).top_p = request.topP;
    }

    if (request.stop) {
      body.options = body.options ?? {};
      (body.options as Record<string, unknown>).stop = Array.isArray(request.stop)
        ? request.stop
        : [request.stop];
    }

    return body;
  }

  /** OpenAI 兼容格式 */
  private buildOpenAICompatibleBody(request: ChatRequest): Record<string, unknown> {
    const body: Record<string, unknown> = {
      model: request.model ?? this.config.model,
      messages: this.transformMessages(request.messages),
      stream: request.stream ?? false,
    };

    if (request.temperature !== undefined) {
      body.temperature = request.temperature;
    }

    if (request.maxTokens !== undefined) {
      body.max_tokens = request.maxTokens;
    }

    if (request.topP !== undefined) {
      body.top_p = request.topP;
    }

    if (request.stop) {
      body.stop = request.stop;
    }

    return body;
  }

  /** 补全格式 */
  private buildCompletionBody(request: ChatRequest): Record<string, unknown> {
    const prompt = request.messages
      .map((m) => {
        if (m.role === 'system') return `### System:\n${m.content}\n\n`;
        if (m.role === 'user') return `### User:\n${m.content}\n\n`;
        if (m.role === 'assistant') return `### Assistant:\n${m.content}\n\n`;
        return `${m.content}\n`;
      })
      .join('');

    const body: Record<string, unknown> = {
      model: request.model ?? this.config.model,
      prompt,
      stream: request.stream ?? false,
    };

    if (request.temperature !== undefined) {
      body.temperature = request.temperature;
    }

    if (request.maxTokens !== undefined) {
      body.max_tokens = request.maxTokens;
    }

    if (request.topP !== undefined) {
      body.top_p = request.topP;
    }

    if (request.stop) {
      body.stop = Array.isArray(request.stop) ? request.stop : [request.stop, '### Assistant:'];
    }

    return body;
  }

  /** 转换消息格式 */
  private transformMessages(
    messages: ChatRequest['messages']
  ): Array<Record<string, unknown>> {
    return messages
      .filter((m) => m.role !== 'system')
      .map((msg) => ({
        role: msg.role,
        content:
          typeof msg.content === 'string'
            ? msg.content
            : msg.content.map((p) => (p.type === 'text' ? p.text : '')).join(''),
      }));
  }

  /** 解析响应 */
  private parseResponse(data: LocalModelResponse): ChatResponse {
    return {
      id: `local-${Date.now()}`,
      model: data.model ?? this.config.model,
      content: data.response ?? '',
      role: 'assistant',
      done: true,
      usage: {
        inputTokens: data.prompt_eval_count ?? 0,
        outputTokens: data.eval_count ?? 0,
        totalTokens: (data.prompt_eval_count ?? 0) + (data.eval_count ?? 0),
      },
      finishReason: data.done ? 'stop' : undefined,
      raw: data as unknown as Record<string, unknown>,
    };
  }

  /** 合并 AbortSignal */
  private mergeSignals(...signals: AbortSignal[]): AbortSignal {
    const controller = new AbortController();

    for (const signal of signals) {
      if (signal.aborted) {
        controller.abort();
        break;
      }
      signal.addEventListener('abort', () => controller.abort());
    }

    return controller.signal;
  }
}

export default LocalModelAdapter;
