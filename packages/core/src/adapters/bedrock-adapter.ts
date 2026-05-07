/**
 * AWS Bedrock 适配器
 * 支持 Claude on Bedrock、Titan、LLama2 等模型
 */

import type {
  IModelAdapter,
  ChatRequest,
  ChatResponse,
  ChatChunk,
  ModelInfo,
  ModelCapability,
} from '../types/multi-model';

/** AWS Bedrock 配置 */
export interface BedrockConfig {
  /** AWS Region */
  region: string;
  /** AWS Access Key ID */
  accessKeyId: string;
  /** AWS Secret Access Key */
  secretAccessKey: string;
  /** AWS Session Token (可选，用于临时凭证) */
  sessionToken?: string;
  /** 模型 ID (如: anthropic.claude-3-sonnet-20240229-v1:0) */
  modelId: string;
  /** 默认模型 */
  defaultModel?: string;
  /** 超时时间(ms) */
  timeout?: number;
  /** 备用模型 */
  fallbackModels?: string[];
}

/** Bedrock 响应格式 */
interface BedrockResponse {
  completion: string;
  stop_reason: string;
  tracer?: Record<string, unknown>;
  'Amazon-bedrockInvocationMetrics'?: {
    inputTokenCount: number;
    outputTokenCount: number;
    invocationLatency: number;
    firstByteLatency: number;
  };
}

/** Bedrock 流式响应 */
interface BedrockStreamChunk {
  chunk?: {
    bytes?: string; // base64 encoded
  };
  'amazon-bedrockInvocationMetrics'?: {
    inputTokenCount: number;
    outputTokenCount: number;
    invocationLatency: number;
    firstByteLatency: number;
  };
}

export class BedrockAdapter implements IModelAdapter {
  readonly provider = 'aws-bedrock';
  readonly modelName: string;
  readonly capabilities: ModelCapability = {
    streaming: true,
    functionCalling: true, // Claude 3 支持
    vision: true, // Claude 3 支持
    jsonMode: true,
  };

  private config: Required<BedrockConfig>;
  private authToken: string | null = null;
  private tokenExpiry: number = 0;

  constructor(config: BedrockConfig) {
    this.modelName = config.modelId;
    this.config = {
      timeout: config.timeout ?? 120000,
      fallbackModels: config.fallbackModels ?? [],
      defaultModel: config.defaultModel ?? config.modelId,
      sessionToken: config.sessionToken ?? '',
      ...config,
    };
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

  /** 获取模型信息 */
  async chat(request: ChatRequest): Promise<ChatResponse> {
    const auth = await this.getAuth();

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), this.config.timeout);

    try {
      const response = await fetch(
        this.getEndpoint(request.model ?? this.config.modelId),
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${auth}`,
            'X-Amz-Client-Context': this.getClientContext(),
          },
          body: JSON.stringify(this.buildBody(request)),
          signal: controller.signal,
        }
      );

      const data: BedrockResponse = await response.json();

      if (!response.ok) {
        throw new Error(`Bedrock error ${response.status}: ${JSON.stringify(data)}`);
      }

      return this.parseResponse(data, request.model ?? this.config.modelId);
    } finally {
      clearTimeout(timeout);
    }
  }

  /** 流式聊天请求 */
  async *chatStream(
    request: ChatRequest,
    signal?: AbortSignal
  ): AsyncGenerator<ChatChunk, void, unknown> {
    const auth = await this.getAuth();

    const timeoutController = new AbortController();
    const timeout = setTimeout(() => timeoutController.abort(), this.config.timeout);

    const combinedSignal = this.mergeSignals(signal, timeoutController.signal);

    try {
      const response = await fetch(
        this.getEndpoint(request.model ?? this.config.modelId),
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${auth}`,
            'X-Amz-Client-Context': this.getClientContext(),
          },
          body: JSON.stringify(this.buildBody({ ...request, stream: true })),
          signal: combinedSignal,
        }
      );

      if (!response.ok) {
        const error = await response.text();
        throw new Error(`Bedrock error ${response.status}: ${error}`);
      }

      const reader = response.body?.getReader();
      if (!reader) {
        throw new Error('Response body is not readable');
      }

      const decoder = new TextDecoder();
      let buffer = '';
      let finalContent = '';
      let inputTokens = 0;
      let outputTokens = 0;

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() ?? '';

        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed) continue;

          if (trimmed.startsWith('data:')) {
            try {
              const jsonStr = trimmed.slice(5).trim();
              if (jsonStr === '[DONE]') continue;

              const chunk: BedrockStreamChunk = JSON.parse(jsonStr);

              if (chunk['amazon-bedrockInvocationMetrics']) {
                inputTokens = chunk['amazon-bedrockInvocationMetrics'].inputTokenCount;
                outputTokens = chunk['amazon-bedrockInvocationMetrics'].outputTokenCount;
              }

              if (chunk.chunk?.bytes) {
                const text = new TextDecoder().decode(
                  Uint8Array.from(atob(chunk.chunk.bytes), (c) =>
                    c.charCodeAt(0)
                  )
                );
                const parsed = JSON.parse(text);

                if (parsed.type === 'content_block_delta') {
                  finalContent += parsed.delta.text;
                  yield {
                    id: `bedrock-${Date.now()}`,
                    delta: parsed.delta.text,
                    done: false,
                  };
                } else if (parsed.type === 'message_delta') {
                  if (parsed.usage) {
                    inputTokens = parsed.usage.input_tokens ?? 0;
                    outputTokens = parsed.usage.output_tokens ?? 0;
                  }
                }
              }
            } catch {
              // 忽略解析错误
            }
          }
        }
      }

      yield {
        id: `bedrock-${Date.now()}`,
        delta: '',
        done: true,
        fullContent: finalContent,
        finishReason: 'stop',
        usage: {
          inputTokens,
          outputTokens,
          totalTokens: inputTokens + outputTokens,
        },
      };
    } finally {
      clearTimeout(timeout);
      timeoutController.abort();
    }
  }

  /** 检查服务可用性 */
  async isAvailable(): Promise<boolean> {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 5000);

      const auth = await this.getAuth();

      const response = await fetch(
        `https://bedrock.${this.config.region}.amazonaws.com/modelinvoke/${this.config.modelId}/invoke`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${auth}`,
          },
          body: JSON.stringify({ prompt: 'test' }),
          signal: controller.signal,
        }
      );

      clearTimeout(timeout);
      return response.status < 500;
    } catch {
      return false;
    }
  }

  /** 更新配置 */
  updateConfig(updates: Partial<BedrockConfig>): void {
    // 如果更新了认证信息，清除缓存
    if (updates.accessKeyId || updates.secretAccessKey || updates.region) {
      this.authToken = null;
      this.tokenExpiry = 0;
    }
    this.config = { ...this.config, ...updates };
  }

  /** 获取认证令牌 (简化版，实际应使用 AWS Signature V4) */
  private async getAuth(): Promise<string> {
    // 检查缓存
    if (this.authToken && Date.now() < this.tokenExpiry) {
      return this.authToken;
    }

    // 实际生产环境应使用 AWS SDK 或签名 V4
    // 这里使用简化的 Bearer Token 方式
    this.authToken = `${this.config.accessKeyId}:${this.config.secretAccessKey}`;
    this.tokenExpiry = Date.now() + 3600000; // 1小时

    return this.authToken;
  }

  /** 获取 API 端点 */
  private getEndpoint(modelId: string): string {
    // 不同模型使用不同的端点格式
    if (modelId.startsWith('anthropic.')) {
      return `https://bedrock-runtime.${this.config.region}.amazonaws.com/model/${modelId}/invoke`;
    }
    if (modelId.startsWith('meta.')) {
      return `https://bedrock-runtime.${this.config.region}.amazonaws.com/model/${modelId}/invoke`;
    }
    return `https://bedrock-runtime.${this.config.region}.amazonaws.com/model/${modelId}/invoke`;
  }

  /** 获取客户端上下文 */
  private getClientContext(): string {
    return btoa(
      JSON.stringify({
        provider: 'multi-model-adapter',
        version: '1.0.0',
      })
    );
  }

  /** 构建请求体 */
  private buildBody(request: ChatRequest): Record<string, unknown> {
    const modelId = request.model ?? this.config.modelId;

    // Claude 模型
    if (modelId.startsWith('anthropic.')) {
      return this.buildClaudeBody(request);
    }

    // Llama 模型
    if (modelId.startsWith('meta.')) {
      return this.buildLlamaBody(request);
    }

    // 默认: Claude 格式
    return this.buildClaudeBody(request);
  }

  /** 构建 Claude 请求体 */
  private buildClaudeBody(request: ChatRequest): Record<string, unknown> {
    const body: Record<string, unknown> = {
      messages: this.transformMessages(request.messages),
      anthropic_version: 'bedrock-2023-05-31',
    };

    if (request.maxTokens !== undefined) {
      body.max_tokens = request.maxTokens;
    } else {
      body.max_tokens = this.getMaxOutputTokens();
    }

    if (request.temperature !== undefined) {
      body.temperature = request.temperature;
    }

    if (request.topP !== undefined) {
      body.top_p = request.topP;
    }

    if (request.stop) {
      body.stop_sequences = Array.isArray(request.stop)
        ? request.stop
        : [request.stop];
    }

    // Claude 3 支持 system prompt
    const systemPrompt = request.messages.find((m) => m.role === 'system');
    if (systemPrompt) {
      body.system =
        typeof systemPrompt.content === 'string'
          ? systemPrompt.content
          : systemPrompt.content.map((p) => (p.type === 'text' ? p.text : '')).join('');
    }

    return body;
  }

  /** 构建 Llama 请求体 */
  private buildLlamaBody(request: ChatRequest): Record<string, unknown> {
    const prompt = request.messages
      .map((m) => {
        if (m.role === 'system') return `<s>[INST] <<SYS>>\n${m.content}\n<</SYS>>\n[/INST]`;
        if (m.role === 'user') return `[INST] ${m.content} [/INST]`;
        if (m.role === 'assistant') return `${m.content}</s><s>[INST] `;
        return `${m.content}`;
      })
      .join('\n');

    const body: Record<string, unknown> = {
      prompt,
      max_gen_len: request.maxTokens ?? this.getMaxOutputTokens(),
    };

    if (request.temperature !== undefined) {
      body.temperature = request.temperature;
    }

    if (request.topP !== undefined) {
      body.top_p = request.topP;
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
            : msg.content.map((p) => (p.type === 'text' ? { type: 'text', text: p.text } : p)).filter(Boolean),
      }));
  }

  /** 解析响应 */
  private parseResponse(data: BedrockResponse, modelId: string): ChatResponse {
    return {
      id: `bedrock-${Date.now()}`,
      model: modelId,
      content: data.completion,
      role: 'assistant',
      done: true,
      usage: {
        inputTokens: data['Amazon-bedrockInvocationMetrics']?.inputTokenCount ?? 0,
        outputTokens: data['Amazon-bedrockInvocationMetrics']?.outputTokenCount ?? 0,
        totalTokens:
          (data['Amazon-bedrockInvocationMetrics']?.inputTokenCount ?? 0) +
          (data['Amazon-bedrockInvocationMetrics']?.outputTokenCount ?? 0),
      },
      finishReason: data.stop_reason as 'stop' | 'length' | undefined,
      raw: data as unknown as Record<string, unknown>,
    };
  }

  /** 获取上下文窗口大小 */
  private getContextWindow(): number {
    const modelId = this.config.modelId;
    if (modelId.includes('claude-3-opus')) return 200000;
    if (modelId.includes('claude-3-sonnet')) return 200000;
    if (modelId.includes('claude-3-haiku')) return 200000;
    if (modelId.includes('llama2')) return 4096;
    return 128000;
  }

  /** 获取最大输出 tokens */
  private getMaxOutputTokens(): number {
    const modelId = this.config.modelId;
    if (modelId.includes('claude-3-opus')) return 4096;
    if (modelId.includes('claude-3-sonnet')) return 4096;
    if (modelId.includes('claude-3-haiku')) return 4096;
    return 2048;
  }

  /** 合并 AbortSignal */
  private mergeSignals(...signals: (AbortSignal | undefined)[]): AbortSignal {
    const controller = new AbortController();

    for (const signal of signals) {
      if (!signal) continue;
      if (signal.aborted) {
        controller.abort();
        break;
      }
      signal.addEventListener('abort', () => controller.abort());
    }

    return controller.signal;
  }
}

export default BedrockAdapter;
