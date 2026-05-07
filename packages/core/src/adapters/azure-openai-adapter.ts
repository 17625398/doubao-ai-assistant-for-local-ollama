/**
 * Azure OpenAI 适配器
 * 支持 Azure OpenAI Service 和 Azure AI Studio
 */

import type {
  IModelAdapter,
  ChatRequest,
  ChatResponse,
  ChatChunk,
  ModelInfo,
  ModelCapability,
} from '../types/multi-model';

/** Azure OpenAI 配置 */
export interface AzureOpenAIConfig {
  /** Azure OpenAI endpoint */
  endpoint: string;
  /** Azure OpenAI API key */
  apiKey: string;
  /** API version (e.g., 2024-02-15-preview) */
  apiVersion?: string;
  /** 默认模型部署名称 */
  deploymentName: string;
  /** 超时时间(ms) */
  timeout?: number;
  /** 备用模型 */
  fallbackModels?: string[];
}

/** Azure OpenAI 响应 */
interface AzureOpenAIResponse {
  id: string;
  choices: Array<{
    index: number;
    message: {
      role: string;
      content: string;
    };
    finish_reason: string;
  }>;
  usage: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
  model?: string;
  created: number;
}

/** Azure OpenAI 流式响应 */
interface AzureOpenAIStreamChunk {
  id: string;
  choices: Array<{
    index: number;
    delta: {
      role?: string;
      content?: string;
    };
    finish_reason?: string;
  }>;
}

export class AzureOpenAIAdapter implements IModelAdapter {
  readonly provider = 'azure-openai';
  readonly modelName: string;
  readonly capabilities: ModelCapability = {
    streaming: true,
    functionCalling: true,
    vision: true,
    jsonMode: true,
  };

  private config: Required<AzureOpenAIConfig>;

  constructor(config: AzureOpenAIConfig) {
    this.modelName = config.deploymentName;
    this.config = {
      apiVersion: config.apiVersion ?? '2024-02-15-preview',
      timeout: config.timeout ?? 120000,
      fallbackModels: config.fallbackModels ?? [],
      ...config,
    };

    // 验证配置
    if (!this.config.endpoint) {
      throw new Error('Azure OpenAI endpoint is required');
    }
    if (!this.config.deploymentName) {
      throw new Error('Azure OpenAI deployment name is required');
    }
  }

  /** 获取当前模型名称 */
  getCurrentModel(): string {
    return this.modelName;
  }

  /** 获取模型信息 */
  async getModelInfo(): Promise<ModelInfo> {
    return {
      name: this.modelName,
      provider: this.provider,
      model: this.modelName,
      capabilities: this.capabilities,
    };
  }

  /** 聊天请求 */
  async chat(request: ChatRequest): Promise<ChatResponse> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), this.config.timeout);

    try {
      const response = await this.buildRequest(request, controller.signal);
      const data: AzureOpenAIResponse = await response.json();

      if (!response.ok) {
        throw this.createError(response.status, data as unknown as Record<string, unknown>);
      }

      return this.parseResponse(data);
    } catch (error) {
      throw this.handleError(error);
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

    // 合并 signal
    const combinedSignal = signal
      ? this.mergeSignals(signal, controller.signal)
      : controller.signal;

    try {
      const response = await this.buildRequest(
        { ...request, stream: true },
        combinedSignal
      );

      if (!response.ok) {
        const error = await response.json().catch(() => ({}));
        throw this.createError(response.status, error);
      }

      const reader = response.body?.getReader();
      if (!reader) {
        throw new Error('Response body is not readable');
      }

      const decoder = new TextDecoder();
      let buffer = '';
      let finalContent = '';
      let finishReason = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() ?? '';

        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed || trimmed === 'data: [DONE]') continue;

          if (trimmed.startsWith('data: ')) {
            try {
              const chunk: AzureOpenAIStreamChunk = JSON.parse(trimmed.slice(6));
              const delta = chunk.choices[0]?.delta?.content ?? '';
              if (delta) {
                finalContent += delta;
                yield {
                  id: chunk.id,
                  delta,
                  done: false,
                };
              }
              if (chunk.choices[0]?.finish_reason) {
                finishReason = chunk.choices[0].finish_reason;
              }
            } catch {
              // 忽略解析错误
            }
          }
        }
      }

      yield {
        id: '',
        delta: '',
        done: true,
        fullContent: finalContent,
        finishReason,
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

      const response = await fetch(
        `${this.config.endpoint}/openai/deployments/${this.config.deploymentName}/extensions/chat/completions?api-version=${this.config.apiVersion}`,
        {
          method: 'GET',
          headers: this.getHeaders(),
          signal: controller.signal,
        }
      );

      clearTimeout(timeout);
      // Azure 返回 404 或 400 表示端点存在
      return response.status < 500;
    } catch {
      return false;
    }
  }

  /** 更新配置 */
  updateConfig(updates: Partial<AzureOpenAIConfig>): void {
    this.config = { ...this.config, ...updates };
  }

  /** 构建请求 */
  private buildRequest(
    request: ChatRequest,
    signal: AbortSignal
  ): Promise<Response> {
    const url = `${this.config.endpoint}/openai/deployments/${this.config.deploymentName}/chat/completions?api-version=${this.config.apiVersion}`;

    const body: Record<string, unknown> = {
      messages: this.transformMessages(request.messages),
    };

    if (request.model) {
      body.model = request.model;
    }

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

    if (request.stream !== undefined) {
      body.stream = request.stream;
    }

    // Azure OpenAI 特定参数
    if (request.tools) {
      body.tools = request.tools;
    }

    if (request.toolChoice) {
      body.tool_choice = request.toolChoice;
    }

    if (request.responseFormat) {
      body.response_format = request.responseFormat;
    }

    return fetch(url, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify(body),
      signal,
    });
  }

  /** 转换消息格式 */
  private transformMessages(
    messages: ChatRequest['messages']
  ): Array<Record<string, unknown>> {
    return messages.map((msg) => {
      const result: Record<string, unknown> = {
        role: msg.role,
      };

      if (typeof msg.content === 'string') {
        result.content = msg.content;
      } else {
        // 处理多模态内容
        result.content = msg.content.map((part) => {
          if (part.type === 'text') {
            return { type: 'text', text: part.text };
          }
          if (part.type === 'image_url' && part.image_url) {
            return {
              type: 'image_url',
              image_url: {
                url: part.image_url.url,
                detail: 'auto',
              },
            };
          }
          return part;
        });
      }

      if (msg.name) {
        result.name = msg.name;
      }

      return result;
    });
  }

  /** 获取请求头 */
  private getHeaders(): Record<string, string> {
    return {
      'Content-Type': 'application/json',
      'api-key': this.config.apiKey,
    };
  }

  /** 解析响应 */
  private parseResponse(data: AzureOpenAIResponse): ChatResponse {
    const choice = data.choices[0];

    return {
      id: data.id,
      model: data.model ?? this.config.deploymentName,
      content: choice?.message?.content ?? '',
      role: (choice?.message?.role as 'assistant') ?? 'assistant',
      done: true,
      usage: {
        inputTokens: data.usage?.prompt_tokens ?? 0,
        outputTokens: data.usage?.completion_tokens ?? 0,
        totalTokens: data.usage?.total_tokens ?? 0,
      },
      finishReason: choice?.finish_reason as 'stop' | 'length' | undefined,
      raw: data as unknown as Record<string, unknown>,
    };
  }

  /** 创建错误 */
  private createError(
    status: number,
    data: Record<string, unknown>
  ): Error {
    const error = data.error as Record<string, unknown> | undefined;
    const message =
      (error?.message as string) ??
      (data.message as string) ??
      `Azure OpenAI error: ${status}`;
    return new Error(message);
  }

  /** 处理错误 */
  private handleError(error: unknown): Error {
    if (error instanceof Error) {
      if (error.name === 'AbortError') {
        return new Error('Request timeout');
      }
      return error;
    }
    return new Error(String(error));
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

export default AzureOpenAIAdapter;
