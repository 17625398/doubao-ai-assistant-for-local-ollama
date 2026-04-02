import { logger } from './logger';

export type OpenAICompatibleRole = 'system' | 'user' | 'assistant';

export interface OpenAICompatibleChatMessage {
  role: OpenAICompatibleRole;
  content: string;
  name?: string;
}

export interface OpenAICompatibleConfig {
  baseUrl: string;
  apiKey?: string;
  defaultModel: string;
  timeout: number;
  streamEnabled: boolean;
  headers?: Record<string, string>;
}

export interface OpenAICompatibleModel {
  id: string;
}

export class OpenAICompatibleClient {
  private config: OpenAICompatibleConfig;

  constructor(config: OpenAICompatibleConfig) {
    this.config = {
      ...config,
      timeout: 30000,
      streamEnabled: true,
    };
  }

  updateConfig(config: Partial<OpenAICompatibleConfig>): void {
    this.config = { ...this.config, ...config };
  }

  getConfig(): OpenAICompatibleConfig {
    return { ...this.config };
  }

  private getBaseUrl(): string {
    const baseUrl = (this.config.baseUrl || '').trim();
    return baseUrl.endsWith('/') ? baseUrl.slice(0, -1) : baseUrl;
  }

  private buildHeaders(): Record<string, string> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...(this.config.headers || {}),
    };
    const apiKey = (this.config.apiKey || '').trim();
    if (apiKey && !headers.Authorization && !headers.authorization) {
      headers.Authorization = `Bearer ${apiKey}`;
    }
    return headers;
  }

  async isAvailable(): Promise<boolean> {
    try {
      const response = await fetch(`${this.getBaseUrl()}/models`, {
        method: 'GET',
        headers: this.buildHeaders(),
        signal: AbortSignal.timeout(this.config.timeout),
      });
      return response.ok;
    } catch (error) {
      logger.warn('OpenAI-compatible service not available:', error);
      return false;
    }
  }

  async listModels(): Promise<OpenAICompatibleModel[]> {
    const response = await fetch(`${this.getBaseUrl()}/models`, {
      method: 'GET',
      headers: this.buildHeaders(),
      signal: AbortSignal.timeout(this.config.timeout),
    });

    if (!response.ok) {
      throw new Error(`Failed to list models: ${response.statusText}`);
    }

    const data = await response.json();
    const models: OpenAICompatibleModel[] = Array.isArray(data?.data) ? data.data : [];
    return models.filter((m) => typeof m?.id === 'string');
  }

  async chat(params: {
    model?: string;
    messages: OpenAICompatibleChatMessage[];
    temperature?: number;
  }): Promise<{ content: string }> {
    const response = await fetch(`${this.getBaseUrl()}/chat/completions`, {
      method: 'POST',
      headers: this.buildHeaders(),
      body: JSON.stringify({
        model: params.model || this.config.defaultModel,
        messages: params.messages,
        temperature: params.temperature,
        stream: false,
      }),
      signal: AbortSignal.timeout(this.config.timeout),
    });

    if (!response.ok) {
      const text = await safeReadText(response);
      throw new Error(text ? `Chat failed: ${text}` : `Chat failed: ${response.statusText}`);
    }

    const data = await response.json();
    const content = data?.choices?.[0]?.message?.content;
    return { content: typeof content === 'string' ? content : '' };
  }

  async *chatStream(
    params: {
      model?: string;
      messages: OpenAICompatibleChatMessage[];
      temperature?: number;
    },
    signal?: AbortSignal
  ): AsyncGenerator<{ delta: string }, void, unknown> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.config.timeout);
    const onAbort = () => controller.abort();

    try {
      if (signal) {
        if (signal.aborted) controller.abort();
        else signal.addEventListener('abort', onAbort);
      }

      const response = await fetch(`${this.getBaseUrl()}/chat/completions`, {
        method: 'POST',
        headers: this.buildHeaders(),
        body: JSON.stringify({
          model: params.model || this.config.defaultModel,
          messages: params.messages,
          temperature: params.temperature,
          stream: true,
        }),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const text = await safeReadText(response);
        throw new Error(text ? `Chat stream failed: ${text}` : `Chat stream failed: ${response.statusText}`);
      }

      const reader = response.body?.getReader();
      if (!reader) {
        throw new Error('No response body');
      }

      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const parts = buffer.split('\n');
        buffer = parts.pop() || '';

        for (const rawLine of parts) {
          const line = rawLine.trim();
          if (!line.startsWith('data:')) continue;

          const dataPart = line.slice('data:'.length).trim();
          if (!dataPart) continue;
          if (dataPart === '[DONE]') return;

          let parsed: any;
          try {
            parsed = JSON.parse(dataPart);
          } catch {
            continue;
          }

          const delta = parsed?.choices?.[0]?.delta?.content;
          if (typeof delta === 'string' && delta) {
            yield { delta };
          }
        }
      }
    } catch (error) {
      if (isAbortError(error) || controller.signal.aborted) return;
      throw error;
    } finally {
      clearTimeout(timeoutId);
      if (signal) signal.removeEventListener('abort', onAbort);
    }
  }

  async generate(params: { prompt: string; system?: string; model?: string }): Promise<{ content: string }> {
    const messages: OpenAICompatibleChatMessage[] = [];
    if (params.system) {
      messages.push({ role: 'system', content: params.system });
    }
    messages.push({ role: 'user', content: params.prompt });
    return this.chat({ model: params.model, messages });
  }
}

async function safeReadText(response: Response): Promise<string> {
  try {
    return await response.text();
  } catch {
    return '';
  }
}

function isAbortError(error: unknown): boolean {
  if (!error || typeof error !== 'object') return false;
  const anyError = error as { name?: unknown; message?: unknown };
  if (anyError.name === 'AbortError') return true;
  const message = typeof anyError.message === 'string' ? anyError.message : '';
  return message.includes('AbortError') || (message.includes('aborted') && message.includes('signal'));
}
