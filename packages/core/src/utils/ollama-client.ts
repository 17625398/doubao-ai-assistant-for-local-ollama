// Ollama API 客户端

import {
  OllamaConfig,
  OllamaModel,
  OllamaGenerateRequest,
  OllamaGenerateResponse,
  OllamaChatRequest,
  OllamaChatResponse,
  OllamaChatMessage,
  OllamaGenerateOptions,
} from '../types';
import { logger } from './logger';

/**
 * Ollama API 客户端
 */
export class OllamaClient {
  private config: OllamaConfig;

  constructor(config?: Partial<OllamaConfig>) {
    const isExtensionEnv =
      typeof chrome !== 'undefined' && Boolean(chrome?.runtime?.id) && Boolean(chrome?.storage?.local);
    // Web应用使用代理路径 /api/ollama，请求会发送到 /api/ollama/chat
    // 扩展使用直接连接
    const defaultBaseUrl = isExtensionEnv ? 'http://localhost:11434' : '/api/ollama';

    this.config = {
      baseUrl: defaultBaseUrl,
      defaultModel: 'fredrezones55/qwen3.5-opus:27b',
      timeout: 30000,
      streamEnabled: true,
      ...config,
    };

    if (isExtensionEnv) {
      const baseUrl = String(this.config.baseUrl || '').trim();
      if (baseUrl.startsWith('/')) {
        this.config.baseUrl = defaultBaseUrl;
      }
    }
    logger.info('OllamaClient initialized with baseUrl:', this.config.baseUrl, 'isExtension:', isExtensionEnv);
  }

  private buildForbiddenError(baseUrl: string, detail?: string, ctx?: { viaWebProxy?: boolean }): Error {
    const rawDetail = typeof detail === 'string' ? detail.trim() : '';
    let parsed:
      | {
          upstream?: string;
          upstreamUrl?: string;
          detail?: string;
          statusText?: string;
        }
      | undefined;
    if (rawDetail) {
      try {
        parsed = JSON.parse(rawDetail) as typeof parsed;
      } catch {}
    }

    if (parsed?.upstream || parsed?.upstreamUrl) {
      const upstream = parsed.upstreamUrl || parsed.upstream || '';
      const upstreamDetail = String(parsed.detail || parsed.statusText || '').trim();
      const extra = upstreamDetail ? ` 详情：${upstreamDetail}` : '';
      return new Error(`请求被上游/代理拒绝（403 Forbidden）。请检查中间机/反代是否放行宿主机访问，并确认上游可访问真实 Ollama。上游：${upstream}${extra}`);
    }

    if (String(baseUrl || '').trim().startsWith('/')) {
      const extra = rawDetail ? ` 详情：${rawDetail}` : '';
      if (ctx?.viaWebProxy) {
        return new Error(
          `请求被上游/代理拒绝（403 Forbidden）。请求已到达 Web 服务端 /api/ollama 代理，但上游返回了 403。请检查 Web 服务端 OLLAMA_BASE_URL 指向的中间机/反代是否有鉴权/白名单/方法限制。${extra}`
        );
      }
      return new Error(
        `请求被上游/代理拒绝（403 Forbidden）。当前使用 Web 代理地址：${baseUrl}，但未检测到服务端代理标记（x-doubao-ollama-proxy）。这通常表示 403 在到达 Next 的 /api/ollama 之前就被拦截（宿主机反代/网关/WAF/防火墙）。请优先检查宿主机对 /api/ollama/* 的转发与放行规则。${extra}`
      );
    }

    const hint =
      '请求被 Ollama 拒绝（403 Forbidden）。这通常是 CORS/Origin 限制导致：请在运行 Ollama 的机器上设置环境变量 OLLAMA_ORIGINS=chrome-extension://*（或 chrome-extension://<你的扩展ID>）后重启 Ollama。';
    const extra = rawDetail ? ` 详情：${rawDetail}` : '';
    return new Error(`${hint} 地址：${baseUrl}${extra}`);
  }

  /**
   * 更新配置
   */
  updateConfig(config: Partial<OllamaConfig>): void {
    const isExtensionEnv =
      typeof chrome !== 'undefined' && Boolean(chrome?.runtime?.id) && Boolean(chrome?.storage?.local);
    const defaultBaseUrl = isExtensionEnv ? 'http://192.168.0.32:11434' : '/api/ollama';

    this.config = { ...this.config, ...config };
    if (isExtensionEnv) {
      const baseUrl = String(this.config.baseUrl || '').trim();
      if (baseUrl.startsWith('/')) {
        this.config.baseUrl = defaultBaseUrl;
      }
    }
    logger.info('OllamaClient config updated:', this.config.baseUrl);
  }

  /**
   * 获取当前配置
   */
  getConfig(): OllamaConfig {
    return { ...this.config };
  }

  /**
   * 检查服务是否可用
   */
  async isAvailable(): Promise<boolean> {
    try {
      const response = await fetch(`${this.config.baseUrl}/api/tags`, {
        method: 'GET',
        signal: AbortSignal.timeout(this.config.timeout),
      });
      if (!response.ok) {
        if (response.status === 403) {
          const viaWebProxy = response.headers.get('x-doubao-ollama-proxy') === '1';
          const detail = await response.text().catch(() => '');
          throw this.buildForbiddenError(this.config.baseUrl, detail, { viaWebProxy });
        }
        return false;
      }
      return response.ok;
    } catch (error) {
      logger.warn('Ollama service not available:', error);
      return false;
    }
  }

  /**
   * 获取本地模型列表
   */
  async listModels(): Promise<OllamaModel[]> {
    try {
      const response = await fetch(`${this.config.baseUrl}/api/tags`, {
        method: 'GET',
        headers: this.config.headers,
        signal: AbortSignal.timeout(this.config.timeout),
      });

      if (!response.ok) {
        const detail = await response.text().catch(() => '');
        if (response.status === 403) {
          const viaWebProxy = response.headers.get('x-doubao-ollama-proxy') === '1';
          throw this.buildForbiddenError(this.config.baseUrl, detail, { viaWebProxy });
        }
        throw new Error(detail ? `Failed to list models: ${detail}` : `Failed to list models: ${response.statusText}`);
      }

      const data = await response.json();
      return data.models || [];
    } catch (error) {
      logger.error('Failed to list Ollama models:', error);
      throw error;
    }
  }

  /**
   * 生成文本（非流式）
   */
  async generate(
    prompt: string,
    options?: Partial<OllamaGenerateRequest>
  ): Promise<OllamaGenerateResponse> {
    const request: OllamaGenerateRequest = {
      model: options?.model || this.config.defaultModel,
      prompt,
      system: options?.system,
      context: options?.context,
      stream: false,
      options: options?.options,
    };

    try {
      const response = await fetch(`${this.config.baseUrl}/api/generate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...this.config.headers,
        },
        body: JSON.stringify(request),
        signal: AbortSignal.timeout(this.config.timeout),
      });

      if (!response.ok) {
        const detail = await response.text().catch(() => '');
        if (response.status === 403) {
          const viaWebProxy = response.headers.get('x-doubao-ollama-proxy') === '1';
          throw this.buildForbiddenError(this.config.baseUrl, detail, { viaWebProxy });
        }
        throw new Error(detail ? `Generate failed: ${detail}` : `Generate failed: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      logger.error('Ollama generate failed:', error);
      throw error;
    }
  }

  /**
   * 生成文本（流式）
   */
  async *generateStream(
    prompt: string,
    options?: Partial<OllamaGenerateRequest>,
    signal?: AbortSignal
  ): AsyncGenerator<OllamaGenerateResponse, void, unknown> {
    const request: OllamaGenerateRequest = {
      model: options?.model || this.config.defaultModel,
      prompt,
      system: options?.system,
      context: options?.context,
      stream: true,
      options: options?.options,
    };

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.config.timeout);
    const onAbort = () => controller.abort();

    try {
      if (signal) {
        if (signal.aborted) controller.abort();
        else signal.addEventListener('abort', onAbort);
      }

      const response = await fetch(`${this.config.baseUrl}/api/generate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...this.config.headers,
        },
        body: JSON.stringify(request),
        signal: controller.signal,
      });
      
      clearTimeout(timeoutId);

      if (!response.ok) {
        const detail = await response.text().catch(() => '');
        if (response.status === 403) {
          const viaWebProxy = response.headers.get('x-doubao-ollama-proxy') === '1';
          throw this.buildForbiddenError(this.config.baseUrl, detail, { viaWebProxy });
        }
        throw new Error(detail ? `Generate stream failed: ${detail}` : `Generate stream failed: ${response.statusText}`);
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
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (line.trim()) {
            try {
              const chunk = JSON.parse(line) as OllamaGenerateResponse;
              yield chunk;
            } catch (e) {
              logger.warn('Failed to parse stream chunk:', line);
            }
          }
        }
      }
    } catch (error) {
      if (isAbortError(error) || controller.signal.aborted) return;
      logger.error('Ollama generate stream failed:', error);
      throw error;
    } finally {
      clearTimeout(timeoutId);
      if (signal) signal.removeEventListener('abort', onAbort);
    }
  }

  /**
   * 清理消息中的空images字段，避免模型不支持图像输入时报错
   */
  private cleanMessages(messages: OllamaChatMessage[]): OllamaChatMessage[] {
    return messages.map(msg => {
      const cleaned: OllamaChatMessage = {
        role: msg.role,
        content: msg.content,
      };
      // 只有当images存在且不为空时才保留
      if (msg.images && msg.images.length > 0) {
        cleaned.images = msg.images;
      }
      return cleaned;
    });
  }

  /**
   * 聊天（非流式）
   */
  async chat(request: OllamaChatRequest): Promise<OllamaChatResponse> {
    try {
      const cleanedRequest = {
        ...request,
        messages: this.cleanMessages(request.messages),
      };
      
      const response = await fetch(`${this.config.baseUrl}/api/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...this.config.headers,
        },
        body: JSON.stringify({
          ...cleanedRequest,
          stream: false,
        }),
        signal: AbortSignal.timeout(this.config.timeout),
      });

      if (!response.ok) {
        const detail = await response.text().catch(() => '');
        if (response.status === 403) {
          const viaWebProxy = response.headers.get('x-doubao-ollama-proxy') === '1';
          throw this.buildForbiddenError(this.config.baseUrl, detail, { viaWebProxy });
        }
        throw new Error(detail ? `Chat failed: ${detail}` : `Chat failed: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      logger.error('Ollama chat failed:', error);
      throw error;
    }
  }

  /**
   * 聊天（流式）
   */
  async *chatStream(
    request: OllamaChatRequest,
    signal?: AbortSignal
  ): AsyncGenerator<OllamaChatResponse, void, unknown> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.config.timeout);
    const onAbort = () => controller.abort();

    try {
      if (signal) {
        if (signal.aborted) controller.abort();
        else signal.addEventListener('abort', onAbort);
      }

      const cleanedRequest = {
        ...request,
        messages: this.cleanMessages(request.messages),
      };

      const response = await fetch(`${this.config.baseUrl}/api/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...this.config.headers,
        },
        body: JSON.stringify({
          ...cleanedRequest,
          stream: true,
        }),
        signal: controller.signal,
      });
      
      clearTimeout(timeoutId);

      if (!response.ok) {
        const detail = await response.text().catch(() => '');
        if (response.status === 403) {
          const viaWebProxy = response.headers.get('x-doubao-ollama-proxy') === '1';
          throw this.buildForbiddenError(this.config.baseUrl, detail, { viaWebProxy });
        }
        throw new Error(detail ? `Chat stream failed: ${detail}` : `Chat stream failed: ${response.statusText}`);
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
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (line.trim()) {
            try {
              const chunk = JSON.parse(line) as OllamaChatResponse;
              yield chunk;
            } catch (e) {
              logger.warn('Failed to parse chat stream chunk:', line);
            }
          }
        }
      }
    } catch (error) {
      if (isAbortError(error) || controller.signal.aborted) return;
      logger.error('Ollama chat stream failed:', error);
      throw error;
    } finally {
      clearTimeout(timeoutId);
      if (signal) signal.removeEventListener('abort', onAbort);
    }
  }

  /**
   * 拉取模型
   */
  async pullModel(modelName: string): Promise<void> {
    try {
      const response = await fetch(`${this.config.baseUrl}/api/pull`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...this.config.headers,
        },
        body: JSON.stringify({ name: modelName }),
        signal: AbortSignal.timeout(this.config.timeout * 10), // 拉取模型需要更长时间
      });

      if (!response.ok) {
        throw new Error(`Pull model failed: ${response.statusText}`);
      }

      // 处理流式响应
      const reader = response.body?.getReader();
      if (reader) {
        const decoder = new TextDecoder();
        while (true) {
          const { done } = await reader.read();
          if (done) break;
        }
      }

      logger.info('Model pulled successfully:', modelName);
    } catch (error) {
      logger.error('Failed to pull model:', error);
      throw error;
    }
  }

  /**
   * 删除模型
   */
  async deleteModel(modelName: string): Promise<void> {
    try {
      const response = await fetch(`${this.config.baseUrl}/api/delete`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          ...this.config.headers,
        },
        body: JSON.stringify({ name: modelName }),
        signal: AbortSignal.timeout(this.config.timeout),
      });

      if (!response.ok) {
        throw new Error(`Delete model failed: ${response.statusText}`);
      }

      logger.info('Model deleted successfully:', modelName);
    } catch (error) {
      logger.error('Failed to delete model:', error);
      throw error;
    }
  }

  /**
   * 获取模型信息
   */
  async getModelInfo(modelName: string): Promise<OllamaModel> {
    try {
      const response = await fetch(`${this.config.baseUrl}/api/show`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...this.config.headers,
        },
        body: JSON.stringify({ name: modelName }),
        signal: AbortSignal.timeout(this.config.timeout),
      });

      if (!response.ok) {
        throw new Error(`Get model info failed: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      logger.error('Failed to get model info:', error);
      throw error;
    }
  }
}

/**
 * 创建默认的生成选项
 */
export function createDefaultOptions(): OllamaGenerateOptions {
  return {
    temperature: 0.7,
    num_predict: 2048,
    top_p: 0.9,
    top_k: 40,
    repeat_penalty: 1.1,
  };
}

/**
 * 全局 Ollama 客户端实例
 */
export const ollamaClient = new OllamaClient();

export default OllamaClient;

function isAbortError(error: unknown): boolean {
  if (!error || typeof error !== 'object') return false;
  const anyError = error as { name?: unknown; message?: unknown };
  if (anyError.name === 'AbortError') return true;
  const message = typeof anyError.message === 'string' ? anyError.message : '';
  return message.includes('AbortError') || (message.includes('aborted') && message.includes('signal'));
}
