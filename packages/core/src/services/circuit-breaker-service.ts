/**
 * 熔断限流重试服务
 * 每引擎独立健康监控
 */

import { logger } from '../utils/logger';

/**
 * 断路器状态
 */
export enum CircuitState {
  CLOSED = 'closed',      // 闭合状态，正常请求
  OPEN = 'open',          // 打开状态，拒绝请求
  HALF_OPEN = 'half_open' // 半开状态，尝试恢复
}

/**
 * 断路器配置
 */
export interface CircuitBreakerConfig {
  failureThreshold: number;  // 失败阈值
  resetTimeout: number;      // 重置超时时间（毫秒）
  maxRequests: number;       // 最大请求数
  windowSize: number;        // 滑动窗口大小
  timeout: number;           // 请求超时时间（毫秒）
  retryCount: number;        // 重试次数
  retryDelay: number;        // 重试延迟（毫秒）
}

/**
 * 引擎健康状态
 */
export interface EngineHealthStatus {
  state: CircuitState;
  failureCount: number;
  successCount: number;
  lastFailure: Date | null;
  lastReset: Date | null;
  requestCount: number;
  errorRate: number;
  latency: number;
}

/**
 * 断路器服务
 */
export class CircuitBreakerService {
  private engines: Map<string, EngineCircuitBreaker> = new Map();
  private defaultConfig: CircuitBreakerConfig = {
    failureThreshold: 5,
    resetTimeout: 30000,
    maxRequests: 100,
    windowSize: 60000,
    timeout: 30000,
    retryCount: 3,
    retryDelay: 1000
  };

  constructor() {
    logger.info('CircuitBreakerService initialized');
  }

  /**
   * 注册引擎
   * @param engineName 引擎名称
   * @param config 断路器配置
   */
  registerEngine(engineName: string, config?: Partial<CircuitBreakerConfig>): void {
    const circuitBreaker = new EngineCircuitBreaker({
      ...this.defaultConfig,
      ...config
    });
    this.engines.set(engineName, circuitBreaker);
    logger.info(`Registered engine: ${engineName}`);
  }

  /**
   * 执行请求
   * @param engineName 引擎名称
   * @param fn 请求函数
   * @returns 请求结果
   */
  async execute<T>(engineName: string, fn: () => Promise<T>): Promise<T> {
    const circuitBreaker = this.engines.get(engineName);
    if (!circuitBreaker) {
      throw new Error(`Engine not registered: ${engineName}`);
    }

    return circuitBreaker.execute(fn);
  }

  /**
   * 获取引擎健康状态
   * @param engineName 引擎名称
   * @returns 健康状态
   */
  getEngineHealth(engineName: string): EngineHealthStatus | null {
    const circuitBreaker = this.engines.get(engineName);
    if (!circuitBreaker) {
      return null;
    }
    return circuitBreaker.getHealthStatus();
  }

  /**
   * 获取所有引擎健康状态
   * @returns 所有引擎健康状态
   */
  getAllEngineHealth(): Map<string, EngineHealthStatus> {
    const healthMap = new Map<string, EngineHealthStatus>();
    this.engines.forEach((breaker, engineName) => {
      healthMap.set(engineName, breaker.getHealthStatus());
    });
    return healthMap;
  }

  /**
   * 重置引擎断路器
   * @param engineName 引擎名称
   */
  resetEngine(engineName: string): void {
    const circuitBreaker = this.engines.get(engineName);
    if (circuitBreaker) {
      circuitBreaker.reset();
      logger.info(`Reset circuit breaker for engine: ${engineName}`);
    }
  }

  /**
   * 重置所有引擎断路器
   */
  resetAllEngines(): void {
    this.engines.forEach((breaker, engineName) => {
      breaker.reset();
      logger.info(`Reset circuit breaker for engine: ${engineName}`);
    });
  }

  /**
   * 移除引擎
   * @param engineName 引擎名称
   */
  removeEngine(engineName: string): void {
    this.engines.delete(engineName);
    logger.info(`Removed engine: ${engineName}`);
  }

  /**
   * 获取所有引擎
   * @returns 引擎名称列表
   */
  getEngines(): string[] {
    return Array.from(this.engines.keys());
  }
}

/**
 * 引擎断路器
 */
class EngineCircuitBreaker {
  private config: CircuitBreakerConfig;
  private state: CircuitState = CircuitState.CLOSED;
  private failureCount: number = 0;
  private successCount: number = 0;
  private lastFailure: Date | null = null;
  private lastReset: Date | null = null;
  private requestCount: number = 0;
  private errorRate: number = 0;
  private latency: number = 0;
  private requestTimestamps: number[] = [];
  private failureTimestamps: number[] = [];

  constructor(config: CircuitBreakerConfig) {
    this.config = config;
  }

  /**
   * 执行请求
   * @param fn 请求函数
   * @returns 请求结果
   */
  async execute<T>(fn: () => Promise<T>): Promise<T> {
    // 检查断路器状态
    if (this.state === CircuitState.OPEN) {
      // 检查是否可以尝试恢复
      if (this.canTryAgain()) {
        this.state = CircuitState.HALF_OPEN;
        logger.info('Circuit breaker state changed to HALF_OPEN');
      } else {
        throw new Error('Circuit breaker is OPEN, rejecting request');
      }
    }

    // 检查限流
    this.cleanupOldRequests();
    if (this.requestCount >= this.config.maxRequests) {
      throw new Error('Rate limit exceeded');
    }

    const startTime = Date.now();
    this.requestCount++;

    try {
      // 执行请求
      const result = await Promise.race([
        fn(),
        new Promise<never>((_, reject) => {
          setTimeout(() => reject(new Error('Request timeout')), this.config.timeout);
        })
      ]);

      // 处理成功
      this.handleSuccess();
      this.latency = Date.now() - startTime;
      return result;
    } catch (error) {
      // 处理失败
      this.handleFailure();
      this.latency = Date.now() - startTime;
      
      // 尝试重试
      return this.retry(fn);
    }
  }

  /**
   * 尝试重试
   * @param fn 请求函数
   * @param attempt 当前尝试次数
   * @returns 请求结果
   */
  private async retry<T>(fn: () => Promise<T>, attempt: number = 0): Promise<T> {
    if (attempt >= this.config.retryCount) {
      throw new Error('Max retries exceeded');
    }

    // 等待重试延迟
    await new Promise(resolve => setTimeout(resolve, this.config.retryDelay * (attempt + 1)));

    try {
      const result = await fn();
      this.handleSuccess();
      return result;
    } catch (error) {
      this.handleFailure();
      return this.retry(fn, attempt + 1);
    }
  }

  /**
   * 处理成功
   */
  private handleSuccess(): void {
    this.successCount++;
    this.failureCount = 0;

    if (this.state === CircuitState.HALF_OPEN) {
      // 半开状态下成功，切换到闭合状态
      this.state = CircuitState.CLOSED;
      logger.info('Circuit breaker state changed to CLOSED');
    }

    this.updateErrorRate();
  }

  /**
   * 处理失败
   */
  private handleFailure(): void {
    this.failureCount++;
    this.lastFailure = new Date();

    if (this.state === CircuitState.CLOSED && this.failureCount >= this.config.failureThreshold) {
      // 闭合状态下失败次数达到阈值，切换到打开状态
      this.state = CircuitState.OPEN;
      logger.info('Circuit breaker state changed to OPEN');
    } else if (this.state === CircuitState.HALF_OPEN) {
      // 半开状态下失败，切换回打开状态
      this.state = CircuitState.OPEN;
      logger.info('Circuit breaker state changed to OPEN');
    }

    this.updateErrorRate();
  }

  /**
   * 检查是否可以尝试恢复
   * @returns 是否可以尝试恢复
   */
  private canTryAgain(): boolean {
    if (!this.lastFailure) {
      return true;
    }

    const now = Date.now();
    const timeSinceFailure = now - this.lastFailure.getTime();
    return timeSinceFailure >= this.config.resetTimeout;
  }

  /**
   * 清理旧的请求记录
   */
  private cleanupOldRequests(): void {
    const now = Date.now();
    const cutoff = now - this.config.windowSize;

    this.requestTimestamps = this.requestTimestamps.filter(timestamp => timestamp >= cutoff);
    this.failureTimestamps = this.failureTimestamps.filter(timestamp => timestamp >= cutoff);

    this.requestCount = this.requestTimestamps.length;
  }

  /**
   * 更新错误率
   */
  private updateErrorRate(): void {
    this.cleanupOldRequests();
    if (this.requestCount > 0) {
      this.errorRate = this.failureTimestamps.length / this.requestCount;
    } else {
      this.errorRate = 0;
    }
  }

  /**
   * 重置断路器
   */
  reset(): void {
    this.state = CircuitState.CLOSED;
    this.failureCount = 0;
    this.successCount = 0;
    this.lastFailure = null;
    this.lastReset = new Date();
    this.requestCount = 0;
    this.errorRate = 0;
    this.latency = 0;
    this.requestTimestamps = [];
    this.failureTimestamps = [];
    logger.info('Circuit breaker reset');
  }

  /**
   * 获取健康状态
   * @returns 健康状态
   */
  getHealthStatus(): EngineHealthStatus {
    return {
      state: this.state,
      failureCount: this.failureCount,
      successCount: this.successCount,
      lastFailure: this.lastFailure,
      lastReset: this.lastReset,
      requestCount: this.requestCount,
      errorRate: this.errorRate,
      latency: this.latency
    };
  }
}

/**
 * 全局断路器服务实例
 */
export const circuitBreakerService = new CircuitBreakerService();

export default CircuitBreakerService;