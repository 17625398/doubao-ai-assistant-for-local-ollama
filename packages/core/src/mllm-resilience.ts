/**
 * 弹性机制 - 重试、熔断、限流
 */

import { logger } from './utils/logger';

/**
 * 重试配置
 */
export interface RetryConfig {
  /** 最大重试次数 */
  maxRetries?: number;
  /** 初始延迟 (毫秒) */
  initialDelay?: number;
  /** 最大延迟 (毫秒) */
  maxDelay?: number;
  /** 退避策略 */
  backoff?: 'linear' | 'exponential' | 'fixed';
  /** 可重试的错误码 */
  retryableErrors?: number[];
}

/**
 * 熔断器状态
 */
export type CircuitState = 'closed' | 'open' | 'half-open';

/**
 * 熔断器配置
 */
export interface CircuitBreakerConfig {
  /** 失败率阈值 (0-1) */
  failureThreshold?: number;
  /** 成功阈值 */
  successThreshold?: number;
  /** 半开状态超时 (毫秒) */
  halfOpenTimeout?: number;
  /** 滑动窗口大小 */
  windowSize?: number;
}

/**
 * 限流配置
 */
export interface RateLimitConfig {
  /** 每窗口最大请求数 */
  maxRequests?: number;
  /** 窗口大小 (毫秒) */
  windowMs?: number;
  /** 队列最大长度 */
  queueSize?: number;
}

/**
 * 弹性上下文
 */
export interface ResilienceContext {
  attempt: number;
  startTime: number;
  error?: Error;
}

/**
 * 重试装饰器
 */
export function withRetry<T>(
  fn: () => Promise<T>,
  config: RetryConfig = {},
  onRetry?: (err: Error, attempt: number) => void
): Promise<T> {
  const {
    maxRetries = 3,
    initialDelay = 1000,
    maxDelay = 30000,
    backoff = 'exponential',
    retryableErrors = [408, 429, 500, 502, 503, 504],
  } = config;

  const context: ResilienceContext = {
    attempt: 0,
    startTime: Date.now(),
  };

  async function attempt(): Promise<T> {
    context.attempt++;

    try {
      return await fn();
    } catch (error) {
      const err = error as Error & { status?: number };
      const isRetryable = retryableErrors.includes(err?.status || 0);

      // 判断是否应该重试
      const shouldRetry = context.attempt < maxRetries && 
        (isRetryable || err.message?.includes('timeout') || err.message?.includes('network'));

      if (shouldRetry) {
        // 计算延迟
        let delay = initialDelay;
        if (backoff === 'exponential') {
          delay = Math.min(initialDelay * Math.pow(2, context.attempt - 1), maxDelay);
        } else if (backoff === 'linear') {
          delay = initialDelay * context.attempt;
        }

        logger.warn(`Retry ${context.attempt}/${maxRetries} after ${delay}ms`, err.message);

        if (onRetry) {
          onRetry(err, context.attempt);
        }

        // 添加抖动
        delay = delay * (0.8 + Math.random() * 0.4);

        await sleep(delay);
        return attempt();
      }

      context.error = err;
      throw err;
    }
  }

  return attempt();
}

/**
 * 熔断器
 */
export class CircuitBreaker {
  private state: CircuitState = 'closed';
  private failures = 0;
  private successes = 0;
  private lastFailureTime = 0;
  private window: { success: boolean; timestamp: number }[] = [];

  private config: Required<CircuitBreakerConfig>;

  constructor(config: CircuitBreakerConfig = {}) {
    this.config = {
      failureThreshold: config.failureThreshold ?? 0.5,
      successThreshold: config.successThreshold ?? 2,
      halfOpenTimeout: config.halfOpenTimeout ?? 60000,
      windowSize: config.windowSize ?? 100,
    };
  }

  /**
   * 执行带熔断保护的函数
   */
  async execute<T>(fn: () => Promise<T>): Promise<T> {
    // 检查状态
    if (this.state === 'open') {
      if (Date.now() - this.lastFailureTime > this.config.halfOpenTimeout) {
        this.state = 'half-open';
        this.successes = 0;
        logger.info('Circuit breaker: open -> half-open');
      } else {
        throw new Error('Circuit breaker is open');
      }
    }

    try {
      const result = await fn();
      this.recordSuccess();
      return result;
    } catch (error) {
      this.recordFailure();
      throw error;
    }
  }

  /**
   * 记录成功
   */
  private recordSuccess(): void {
    this.failures = Math.max(0, this.failures - 1);

    if (this.state === 'half-open') {
      this.successes++;
      if (this.successes >= this.config.successThreshold) {
        this.state = 'closed';
        this.window = [];
        logger.info('Circuit breaker: half-open -> closed');
      }
    }
  }

  /**
   * 记录失败
   */
  private recordFailure(): void {
    this.failures++;
    this.lastFailureTime = Date.now();

    // 添加到滑动窗口
    this.window.push({ success: false, timestamp: Date.now() });
    if (this.window.length > this.config.windowSize) {
      this.window.shift();
    }

    // 计算失败率
    const recentRequests = this.window.length;
    const recentFailures = this.window.filter(w => !w.success).length;
    const failureRate = recentRequests > 0 ? recentFailures / recentRequests : 0;

    if (this.state === 'closed' && failureRate >= this.config.failureThreshold) {
      this.state = 'open';
      logger.warn(`Circuit breaker: closed -> open (failure rate: ${(failureRate * 100).toFixed(1)}%)`);
    } else if (this.state === 'half-open') {
      this.state = 'open';
      logger.warn('Circuit breaker: half-open -> open');
    }
  }

  /**
   * 获取状态
   */
  getState(): { state: CircuitState; failures: number; successRate: number } {
    const successRate = this.window.length > 0
      ? this.window.filter(w => w.success).length / this.window.length
      : 1;

    return {
      state: this.state,
      failures: this.failures,
      successRate,
    };
  }

  /**
   * 重置
   */
  reset(): void {
    this.state = 'closed';
    this.failures = 0;
    this.successes = 0;
    this.window = [];
  }

  /**
   * 强制打开
   */
  forceOpen(): void {
    this.state = 'open';
    this.lastFailureTime = Date.now();
  }

  /**
   * 强制关闭
   */
  forceClose(): void {
    this.state = 'closed';
    this.failures = 0;
    this.window = [];
  }
}

/**
 * 限流器
 */
export class RateLimiter {
  private requests: number[] = [];
  private queue: Array<() => void> = [];
  private processing = false;

  private config: Required<RateLimitConfig>;

  constructor(config: RateLimitConfig = {}) {
    this.config = {
      maxRequests: config.maxRequests ?? 60,
      windowMs: config.windowMs ?? 60000,
      queueSize: config.queueSize ?? 100,
    };
  }

  /**
   * 执行带限流的函数
   */
  async execute<T>(fn: () => Promise<T>): Promise<T> {
    return new Promise((resolve, reject) => {
      const execute = async () => {
        try {
          const result = await fn();
          resolve(result);
        } catch (error) {
          reject(error);
        } finally {
          this.processNext();
        }
      };

      // 清理过期请求
      this.cleanup();

      if (this.requests.length < this.config.maxRequests) {
        this.requests.push(Date.now());
        execute();
      } else if (this.queue.length < this.config.queueSize) {
        this.queue.push(execute as any);
      } else {
        reject(new Error('Rate limit queue full'));
      }
    });
  }

  /**
   * 处理下一个
   */
  private processNext(): void {
    if (this.queue.length > 0 && this.requests.length < this.config.maxRequests) {
      const next = this.queue.shift();
      if (next) {
        this.requests.push(Date.now());
        next();
      }
    }
  }

  /**
   * 清理过期请求
   */
  private cleanup(): void {
    const cutoff = Date.now() - this.config.windowMs;
    this.requests = this.requests.filter(t => t > cutoff);
  }

  /**
   * 获取状态
   */
  getState(): { available: number; queued: number; windowMs: number } {
    this.cleanup();
    return {
      available: this.config.maxRequests - this.requests.length,
      queued: this.queue.length,
      windowMs: this.config.windowMs,
    };
  }

  /**
   * 等待直到可用
   */
  async waitUntilAvailable(): Promise<void> {
    this.cleanup();
    if (this.requests.length >= this.config.maxRequests) {
      const oldest = this.requests[0];
      const waitTime = oldest + this.config.windowMs - Date.now();
      if (waitTime > 0) {
        await sleep(waitTime);
      }
    }
  }
}

/**
 * 弹性组合器
 */
export class ResilienceManager {
  private circuitBreakers: Map<string, CircuitBreaker> = new Map();
  private rateLimiters: Map<string, RateLimiter> = new Map();

  /**
   * 获取/创建熔断器
   */
  getCircuitBreaker(name: string, config?: CircuitBreakerConfig): CircuitBreaker {
    if (!this.circuitBreakers.has(name)) {
      this.circuitBreakers.set(name, new CircuitBreaker(config));
    }
    return this.circuitBreakers.get(name)!;
  }

  /**
   * 获取/创建限流器
   */
  getRateLimiter(name: string, config?: RateLimitConfig): RateLimiter {
    if (!this.rateLimiters.has(name)) {
      this.rateLimiters.set(name, new RateLimiter(config));
    }
    return this.rateLimiters.get(name)!;
  }

  /**
   * 执行带完整弹性的函数
   */
  async execute<T>(
    name: string,
    fn: () => Promise<T>,
    options?: {
      retry?: RetryConfig;
      circuitBreaker?: CircuitBreakerConfig;
      rateLimit?: RateLimitConfig;
    }
  ): Promise<T> {
    const cb = options?.circuitBreaker
      ? this.getCircuitBreaker(name, options.circuitBreaker)
      : null;

    const rl = options?.rateLimit
      ? this.getRateLimiter(name, options.rateLimit)
      : null;

    let execute = fn;

    // 添加熔断
    if (cb) {
      const originalFn = execute;
      execute = () => cb.execute(originalFn);
    }

    // 添加限流
    if (rl) {
      const originalFn = execute;
      execute = () => rl.execute(originalFn);
    }

    // 添加重试
    if (options?.retry) {
      return withRetry(execute, options.retry);
    }

    return execute();
  }

  /**
   * 获取所有状态
   */
  getAllStates(): Record<string, any> {
    const states: Record<string, any> = {};

    for (const [name, cb] of this.circuitBreakers.entries()) {
      states[`circuit_${name}`] = cb.getState();
    }

    for (const [name, rl] of this.rateLimiters.entries()) {
      states[`rate_${name}`] = rl.getState();
    }

    return states;
  }

  /**
   * 重置所有
   */
  resetAll(): void {
    for (const cb of this.circuitBreakers.values()) {
      cb.reset();
    }
    this.rateLimiters.clear();
  }
}

// 工具函数
function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// 全局实例
let globalResilienceManager: ResilienceManager | null = null;

export function getResilienceManager(): ResilienceManager {
  if (!globalResilienceManager) {
    globalResilienceManager = new ResilienceManager();
  }
  return globalResilienceManager;
}

export default ResilienceManager;
