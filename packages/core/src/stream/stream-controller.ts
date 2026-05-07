// 高级流式控制器 - 提供完整的流式响应控制能力

import { logger } from '../utils/logger';

/**
 * 流式 chunk 接口
 */
export interface StreamChunk {
  content: string;           // 当前完整内容
  delta: string;             // 增量内容
  isComplete: boolean;       // 是否完成
  index: number;             // chunk 索引
  timestamp: number;         // 时间戳
  metadata?: {
    model?: string;
    usage?: {
      promptTokens: number;
      completionTokens: number;
      totalTokens: number;
    };
    finishReason?: string;
  };
}

/**
 * 流式状态
 */
export type StreamState = 
  | 'idle'        // 空闲
  | 'connecting'  // 连接中
  | 'streaming'   // 流式中
  | 'paused'      // 已暂停
  | 'completed'   // 已完成
  | 'cancelled'   // 已取消
  | 'error';      // 错误

/**
 * 流式配置
 */
export interface StreamConfig {
  apiUrl: string;              // API 地址
  apiKey?: string;             // API 密钥
  model: string;               // 模型名称
  temperature?: number;        // 温度 (0-1)
  maxTokens?: number;          // 最大 token 数
  timeout?: number;            // 超时时间 (ms)
  enableRetry?: boolean;       // 是否启用重试
  maxRetries?: number;         // 最大重试次数
  retryDelay?: number;         // 重试延迟 (ms)
}

/**
 * 流式回调接口
 */
export interface StreamCallbacks {
  onChunk?: (chunk: StreamChunk) => void;
  onComplete?: (fullContent: string) => void;
  onError?: (error: Error) => void;
  onPause?: () => void;
  onResume?: () => void;
  onCancel?: () => void;
  onStateChange?: (state: StreamState) => void;
}

/**
 * 流式消息接口
 */
export interface StreamMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

/**
 * 高级流式控制器
 * 
 * 功能:
 * 1. 流式响应处理
 * 2. 暂停/恢复控制
 * 3. 取消操作
 * 4. 自动重试
 * 5. 超时控制
 * 6. 状态管理
 * 7. 上下文注入
 */
export class StreamController {
  private state: StreamState = 'idle';
  private abortController: AbortController | null = null;
  private buffer: string = '';
  private chunks: StreamChunk[] = [];
  private config: StreamConfig;
  private callbacks: StreamCallbacks = {};
  private isPaused: boolean = false;
  private pausePromise: Promise<void> | null = null;
  private pauseResolver: (() => void) | null = null;
  private chunkIndex: number = 0;
  private retryCount: number = 0;

  constructor(config: StreamConfig) {
    this.config = {
      timeout: 60000,          // 默认 60 秒超时
      enableRetry: true,       // 默认启用重试
      maxRetries: 3,           // 最多重试 3 次
      retryDelay: 1000,        // 重试延迟 1 秒
      temperature: 0.7,
      ...config
    };
  }

  /**
   * 开始流式请求
   */
  async start(
    messages: StreamMessage[],
    callbacks?: StreamCallbacks
  ): Promise<string> {
    if (this.state === 'streaming' || this.state === 'connecting') {
      throw new Error('Stream already in progress');
    }

    // 设置回调
    if (callbacks) {
      this.callbacks = callbacks;
    }

    // 重置状态
    this.reset();
    this.setState('connecting');

    try {
      const content = await this.executeStream(messages);
      this.setState('completed');
      this.callbacks.onComplete?.(content);
      return content;
    } catch (error) {
      if (this.state !== 'cancelled') {
        this.setState('error');
        this.callbacks.onError?.(error as Error);
      }
      throw error;
    }
  }

  /**
   * 暂停流式
   */
  pause(): boolean {
    if (this.state !== 'streaming') {
      logger.warn('[StreamController] Cannot pause: not streaming');
      return false;
    }

    this.isPaused = true;
    this.setState('paused');
    this.callbacks.onPause?.();
    
    // 创建暂停 Promise
    this.pausePromise = new Promise((resolve) => {
      this.pauseResolver = resolve;
    });

    logger.info('[StreamController] Stream paused');
    return true;
  }

  /**
   * 恢复流式
   */
  resume(): boolean {
    if (this.state !== 'paused') {
      logger.warn('[StreamController] Cannot resume: not paused');
      return false;
    }

    this.isPaused = false;
    this.setState('streaming');
    this.callbacks.onResume?.();

    // 解决暂停 Promise
    if (this.pauseResolver) {
      this.pauseResolver();
      this.pauseResolver = null;
      this.pausePromise = null;
    }

    logger.info('[StreamController] Stream resumed');
    return true;
  }

  /**
   * 取消流式
   */
  cancel(): boolean {
    if (this.state === 'idle' || this.state === 'completed') {
      logger.warn('[StreamController] Cannot cancel: not in progress');
      return false;
    }

    this.setState('cancelled');
    this.callbacks.onCancel?.();

    if (this.abortController) {
      this.abortController.abort();
    }

    // 解决暂停 Promise (如果有)
    if (this.pauseResolver) {
      this.pauseResolver();
    }

    logger.info('[StreamController] Stream cancelled');
    return true;
  }

  /**
   * 获取当前状态
   */
  getState(): StreamState {
    return this.state;
  }

  /**
   * 获取已接收的 chunks
   */
  getChunks(): StreamChunk[] {
    return [...this.chunks];
  }

  /**
   * 获取完整内容
   */
  getFullContent(): string {
    return this.buffer;
  }

  /**
   * 获取当前 chunk 索引
   */
  getChunkIndex(): number {
    return this.chunkIndex;
  }

  /**
   * 更新配置
   */
  updateConfig(config: Partial<StreamConfig>): void {
    this.config = { ...this.config, ...config };
  }

  /**
   * 执行流式请求
   */
  private async executeStream(messages: StreamMessage[]): Promise<string> {
    const maxRetries = this.config.enableRetry ? this.config.maxRetries || 3 : 0;

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        if (attempt > 0) {
          logger.info(`[StreamController] Retry attempt ${attempt}/${maxRetries}`);
          await this.delay(this.config.retryDelay || 1000);
        }

        return await this.doStream(messages);
      } catch (error) {
        if (this.state === 'cancelled') {
          throw new Error('Stream cancelled by user');
        }

        if (attempt === maxRetries) {
          throw error;
        }

        logger.warn(`[StreamController] Attempt ${attempt + 1} failed:`, error);
      }
    }

    throw new Error('Stream failed after retries');
  }

  /**
   * 执行实际的流式请求
   */
  private async doStream(messages: StreamMessage[]): Promise<string> {
    this.abortController = new AbortController();
    const timeoutId = setTimeout(() => {
      this.abortController?.abort();
    }, this.config.timeout);

    try {
      const response = await fetch(this.config.apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(this.config.apiKey ? { 'Authorization': `Bearer ${this.config.apiKey}` } : {}),
        },
        body: JSON.stringify({
          model: this.config.model,
          messages,
          stream: true,
          temperature: this.config.temperature,
          ...(this.config.maxTokens ? { max_tokens: this.config.maxTokens } : {}),
        }),
        signal: this.abortController.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const errorText = await response.text().catch(() => '');
        throw new Error(`HTTP ${response.status}: ${errorText || response.statusText}`);
      }

      return await this.processStream(response.body);
    } catch (error) {
      clearTimeout(timeoutId);
      throw error;
    }
  }

  /**
   * 处理流式响应
   */
  private async processStream(body: ReadableStream<Uint8Array> | null): Promise<string> {
    if (!body) {
      throw new Error('No response body');
    }

    const reader = body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';
    let fullContent = '';

    this.setState('streaming');

    try {
      while (true) {
        // 检查是否暂停
        if (this.isPaused && this.pausePromise) {
          await this.pausePromise;
        }

        // 检查是否取消
        if (this.state === 'cancelled') {
          break;
        }

        const { done, value } = await reader.read();
        
        if (done) {
          break;
        }

        // 解码数据
        buffer += decoder.decode(value, { stream: true });
        
        // 处理 SSE 格式
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed || !trimmed.startsWith('data:')) continue;

          const data = trimmed.slice(5).trim();
          if (data === '[DONE]') {
            continue;
          }

          try {
            const parsed = JSON.parse(data);
            const delta = parsed.choices?.[0]?.delta?.content || '';
            
            if (delta) {
              fullContent += delta;
              this.buffer = fullContent;
              this.chunkIndex++;

              const chunk: StreamChunk = {
                content: fullContent,
                delta,
                isComplete: false,
                index: this.chunkIndex,
                timestamp: Date.now(),
                metadata: {
                  model: this.config.model,
                  usage: parsed.usage,
                  finishReason: parsed.choices?.[0]?.finish_reason
                }
              };

              this.chunks.push(chunk);
              this.callbacks.onChunk?.(chunk);
            }

            // 检查是否完成
            if (parsed.choices?.[0]?.finish_reason) {
              const finalChunk: StreamChunk = {
                content: fullContent,
                delta: '',
                isComplete: true,
                index: this.chunkIndex + 1,
                timestamp: Date.now(),
                metadata: {
                  model: this.config.model,
                  usage: parsed.usage,
                  finishReason: parsed.choices[0].finish_reason
                }
              };

              this.chunks.push(finalChunk);
              this.callbacks.onChunk?.(finalChunk);
            }
          } catch (e) {
            logger.debug('[StreamController] Failed to parse chunk:', data);
          }
        }
      }

      return fullContent;
    } catch (error) {
      if (this.state === 'cancelled' || (error instanceof DOMException && error.name === 'AbortError')) {
        return fullContent;
      }
      throw error;
    }
  }

  /**
   * 设置状态
   */
  private setState(state: StreamState): void {
    this.state = state;
    this.callbacks.onStateChange?.(state);
    logger.debug(`[StreamController] State changed to: ${state}`);
  }

  /**
   * 重置状态
   */
  private reset(): void {
    this.state = 'idle';
    this.abortController = null;
    this.buffer = '';
    this.chunks = [];
    this.isPaused = false;
    this.pausePromise = null;
    this.pauseResolver = null;
    this.chunkIndex = 0;
    this.retryCount = 0;
    this.callbacks = {};
  }

  /**
   * 延迟函数
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * 销毁控制器
   */
  destroy(): void {
    this.cancel();
    this.reset();
    logger.info('[StreamController] Destroyed');
  }

  /**
   * 获取统计信息
   */
  getStats(): {
    state: StreamState;
    totalChunks: number;
    totalTokens: number;
    duration: number;
  } {
    const firstChunk = this.chunks[0];
    const lastChunk = this.chunks[this.chunks.length - 1];
    const duration = firstChunk && lastChunk 
      ? lastChunk.timestamp - firstChunk.timestamp 
      : 0;

    return {
      state: this.state,
      totalChunks: this.chunks.length,
      totalTokens: lastChunk?.metadata?.usage?.completionTokens || 0,
      duration
    };
  }
}

// 工厂函数
export function createStreamController(config: StreamConfig): StreamController {
  return new StreamController(config);
}
