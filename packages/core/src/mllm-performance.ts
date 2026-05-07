/**
 * 多模型适配层 - 性能优化
 * 连接池、批量请求、并行推理
 */

import type { ChatRequest, ChatResponse, ChatChunk } from './types/multi-model';

// =============================================
// 连接池
// =============================================

/** 连接池配置 */
export interface ConnectionPoolConfig {
  /** 最大连接数 */
  maxConnections: number;
  /** 最小连接数 */
  minConnections: number;
  /** 连接空闲超时 (ms) */
  idleTimeout: number;
  /** 连接获取超时 (ms) */
  acquireTimeout: number;
  /** 连接预热 */
  prewarm?: boolean;
}

/** 连接状态 */
interface PooledConnection {
  id: string;
  inUse: boolean;
  lastUsed: number;
  adapter: unknown;
  requestCount: number;
}

/** 连接池事件 */
export interface ConnectionPoolEvents {
  acquire: (id: string) => void;
  release: (id: string) => void;
  create: (id: string) => void;
  destroy: (id: string) => void;
  error: (error: Error) => void;
}

export class ConnectionPool<T = unknown> {
  private pool: Map<string, PooledConnection> = new Map();
  private waiting: Array<{
    resolve: (conn: PooledConnection) => void;
    reject: (error: Error) => void;
    timeout: ReturnType<typeof setTimeout>;
  }> = [];
  private config: Required<ConnectionPoolConfig>;
  private listeners: Partial<ConnectionPoolEvents> = {};
  private createConnection: () => T;

  constructor(
    config: ConnectionPoolConfig,
    factory: () => T
  ) {
    this.config = {
      prewarm: config.prewarm ?? false,
      ...config,
    };
    this.createConnection = factory;

    if (this.config.prewarm) {
      this.prewarm();
    }
  }

  /** 预热连接 */
  async prewarm(): Promise<void> {
    const promises: Promise<void>[] = [];

    for (let i = 0; i < this.config.minConnections; i++) {
      promises.push(this.create().then(() => {}));
    }

    await Promise.all(promises);
  }

  /** 获取连接 */
  async acquire(): Promise<PooledConnection> {
    // 尝试获取空闲连接
    for (const conn of this.pool.values()) {
      if (!conn.inUse) {
        conn.inUse = true;
        conn.lastUsed = Date.now();
        this.listeners.acquire?.(conn.id);
        return conn;
      }
    }

    // 如果有空闲槽位，创建新连接
    if (this.pool.size < this.config.maxConnections) {
      const conn = await this.create();
      conn.inUse = true;
      return conn;
    }

    // 等待空闲连接
    return this.waitForConnection();
  }

  /** 释放连接 */
  release(conn: PooledConnection): void {
    conn.inUse = false;
    conn.lastUsed = Date.now();
    this.listeners.release?.(conn.id);

    // 如果有等待的请求，优先分配
    if (this.waiting.length > 0) {
      const waiter = this.waiting.shift()!;
      clearTimeout(waiter.timeout);
      conn.inUse = true;
      waiter.resolve(conn);
    }
  }

  /** 销毁连接 */
  destroy(conn: PooledConnection): void {
    this.pool.delete(conn.id);
    this.listeners.destroy?.(conn.id);
  }

  /** 清理空闲连接 */
  async cleanup(): Promise<void> {
    const now = Date.now();

    for (const [id, conn] of this.pool.entries()) {
      if (
        !conn.inUse &&
        now - conn.lastUsed > this.config.idleTimeout &&
        this.pool.size > this.config.minConnections
      ) {
        this.destroy(conn);
      }
    }
  }

  /** 获取统计 */
  getStats(): {
    total: number;
    inUse: number;
    idle: number;
    waiting: number;
  } {
    let inUse = 0;
    let idle = 0;

    for (const conn of this.pool.values()) {
      if (conn.inUse) {
        inUse++;
      } else {
        idle++;
      }
    }

    return {
      total: this.pool.size,
      inUse,
      idle,
      waiting: this.waiting.length,
    };
  }

  /** 添加事件监听 */
  on<K extends keyof ConnectionPoolEvents>(
    event: K,
    listener: ConnectionPoolEvents[K]
  ): void {
    this.listeners[event] = listener;
  }

  /** 创建连接 */
  private async create(): Promise<PooledConnection> {
    const id = `conn-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;

    const adapter = await Promise.resolve(this.createConnection());

    const conn: PooledConnection = {
      id,
      inUse: false,
      lastUsed: Date.now(),
      adapter: adapter as unknown,
      requestCount: 0,
    };

    this.pool.set(id, conn);
    this.listeners.create?.(id);

    return conn;
  }

  /** 等待连接 */
  private waitForConnection(): Promise<PooledConnection> {
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        const index = this.waiting.findIndex((w) => w.resolve === resolve);
        if (index !== -1) {
          this.waiting.splice(index, 1);
        }
        reject(new Error('Connection acquire timeout'));
      }, this.config.acquireTimeout);

      this.waiting.push({ resolve, reject, timeout });
    });
  }

  /** 销毁 */
  destroyAll(): void {
    for (const conn of this.pool.values()) {
      this.destroy(conn);
    }
    this.waiting.forEach((w) => {
      clearTimeout(w.timeout);
      w.reject(new Error('Pool destroyed'));
    });
    this.waiting = [];
  }
}

// =============================================
// 批量请求处理器
// =============================================

/** 批量请求配置 */
export interface BatchConfig {
  /** 最大批量大小 */
  maxBatchSize: number;
  /** 最大等待时间 (ms) */
  maxWaitTime: number;
  /** 启用批量 */
  enabled?: boolean;
}

/** 批量请求项 */
interface BatchItem {
  request: ChatRequest;
  resolve: (response: ChatResponse) => void;
  reject: (error: Error) => void;
  timestamp: number;
  priority: number;
}

/** 批量响应 */
interface BatchResponse {
  results: ChatResponse[];
  totalDuration: number;
}

export class BatchRequestHandler {
  private queue: BatchItem[] = [];
  private config: Required<BatchConfig>;
  private processing = false;
  private flushTimer?: ReturnType<typeof setTimeout>;
  private processor: (requests: ChatRequest[]) => Promise<ChatResponse[]>;

  constructor(
    config: BatchConfig,
    processor: (requests: ChatRequest[]) => Promise<ChatResponse[]>
  ) {
    this.config = {
      enabled: config.enabled ?? true,
      ...config,
    };
    this.processor = processor;
  }

  /** 添加请求 */
  async execute(request: ChatRequest, priority = 0): Promise<ChatResponse> {
    if (!this.config.enabled) {
      // 直接执行
      const results = await this.processor([request]);
      return results[0];
    }

    return new Promise((resolve, reject) => {
      this.queue.push({
        request,
        resolve,
        reject,
        timestamp: Date.now(),
        priority,
      });

      // 按优先级排序
      this.queue.sort((a, b) => b.priority - a.priority);

      // 设置刷新定时器
      this.scheduleFlush();

      // 如果队列已满，立即处理
      if (this.queue.length >= this.config.maxBatchSize) {
        this.flush();
      }
    });
  }

  /** 调度刷新 */
  private scheduleFlush(): void {
    if (this.flushTimer) return;

    this.flushTimer = setTimeout(() => {
      this.flush();
    }, this.config.maxWaitTime);
  }

  /** 刷新队列 */
  async flush(): Promise<void> {
    if (this.processing || this.queue.length === 0) return;

    this.processing = true;

    if (this.flushTimer) {
      clearTimeout(this.flushTimer);
      this.flushTimer = undefined;
    }

    // 获取当前批次
    const batch = this.queue.splice(0, this.config.maxBatchSize);

    try {
      const startTime = Date.now();
      const requests = batch.map((item) => item.request);
      const results = await this.processor(requests);
      const duration = Date.now() - startTime;

      // 解析结果
      for (let i = 0; i < batch.length; i++) {
        if (results[i]) {
          batch[i].resolve(results[i]);
        } else {
          batch[i].reject(new Error('No response for request'));
        }
      }
    } catch (error) {
      // 所有请求失败
      for (const item of batch) {
        item.reject(error as Error);
      }
    } finally {
      this.processing = false;

      // 如果还有请求，继续处理
      if (this.queue.length > 0) {
        this.scheduleFlush();
      }
    }
  }

  /** 获取队列大小 */
  getQueueSize(): number {
    return this.queue.length;
  }

  /** 启用/禁用 */
  setEnabled(enabled: boolean): void {
    this.config.enabled = enabled;
    if (enabled && this.queue.length > 0) {
      this.flush();
    }
  }

  /** 销毁 */
  destroy(): void {
    if (this.flushTimer) {
      clearTimeout(this.flushTimer);
    }

    // 拒绝所有等待的请求
    for (const item of this.queue) {
      item.reject(new Error('Handler destroyed'));
    }
    this.queue = [];
  }
}

// =============================================
// 并行推理
// =============================================

/** 并行推理结果 */
export interface ParallelResult {
  responses: ChatResponse[];
  duration: number;
  successful: number;
  failed: number;
}

/** 并行推理配置 */
export interface ParallelConfig {
  /** 最大并发数 */
  maxConcurrency: number;
  /** 启用并行 */
  enabled?: boolean;
  /** 失败策略 */
  failStrategy: 'all' | 'any' | 'majority' | 'none';
}

/** 任务状态 */
interface TaskState<T> {
  id: number;
  task: () => Promise<T>;
  resolve: (value: T) => void;
  reject: (error: Error) => void;
  status: 'pending' | 'running' | 'completed' | 'failed';
}

export class ParallelExecutor {
  private config: Required<ParallelConfig>;
  private running = 0;
  private completed = 0;
  private failed = 0;
  private tasks: TaskState<unknown>[] = [];
  private results: unknown[] = [];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private overallResolve?: (results: any) => void;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private overallReject?: (error: any) => void;

  constructor(config: ParallelConfig) {
    this.config = {
      enabled: config.enabled ?? true,
      ...config,
    };
  }

  /** 执行并行任务 */
  async execute<T>(
    tasks: Array<() => Promise<T>>
  ): Promise<{ successful: T[]; failed: Error[] }> {
    if (!this.config.enabled || tasks.length === 1) {
      // 单任务或禁用并行
      const results: T[] = [];
      const errors: Error[] = [];

      for (const task of tasks) {
        try {
          results.push(await task());
        } catch (error) {
          errors.push(error as Error);
        }
      }

      return { successful: results, failed: errors };
    }

    // 并行执行
    return new Promise((resolve, reject) => {
      this.results = [];
      this.tasks = [];
      this.running = 0;
      this.completed = 0;
      this.failed = 0;
      this.overallResolve = resolve as unknown as (results: unknown[]) => void;
      this.overallReject = reject;

      for (let i = 0; i < tasks.length; i++) {
        this.tasks.push({
          id: i,
          task: tasks[i] as () => Promise<unknown>,
          resolve: (value) => this.handleResolve(i, value),
          reject: (error) => this.handleReject(i, error),
          status: 'pending',
        });
      }

      // 启动任务
      this.startTasks();
    });
  }

  /** 启动任务 */
  private startTasks(): void {
    while (
      this.running < this.config.maxConcurrency &&
      this.tasks.some((t) => t.status === 'pending')
    ) {
      const task = this.tasks.find((t) => t.status === 'pending');
      if (task) {
        this.runTask(task);
      }
    }
  }

  /** 运行任务 */
  private runTask(task: TaskState<unknown>): void {
    task.status = 'running';
    this.running++;

    Promise.resolve()
      .then(() => task.task())
      .then(task.resolve)
      .catch(task.reject);
  }

  /** 处理成功 */
  private handleResolve(id: number, value: unknown): void {
    const task = this.tasks[id];
    task.status = 'completed';
    this.running--;
    this.completed++;
    this.results[id] = value;

    this.checkCompletion();
    this.startTasks();
  }

  /** 处理失败 */
  private handleReject(id: number, error: Error): void {
    const task = this.tasks[id];
    task.status = 'failed';
    this.running--;
    this.failed++;
    this.results[id] = error;

    this.checkCompletion();
    this.startTasks();
  }

  /** 检查完成 */
  private checkCompletion(): void {
    const total = this.tasks.length;
    const done = this.completed + this.failed;

    if (done < total) return;

    const successful = this.results.filter(
      (r) => !(r instanceof Error)
    ) as unknown[];
    const errors = this.results.filter(
      (r) => r instanceof Error
    ) as Error[];

    switch (this.config.failStrategy) {
      case 'all':
        if (errors.length === total) {
          this.overallReject?.(new Error(`All ${total} tasks failed`));
        } else {
          this.overallResolve?.(successful);
        }
        break;

      case 'any':
        if (successful.length > 0) {
          this.overallResolve?.(successful);
        } else {
          this.overallReject?.(errors[0]);
        }
        break;

      case 'majority':
        if (successful.length > total / 2) {
          this.overallResolve?.(successful);
        } else {
          this.overallReject?.(
            new Error(`Only ${successful.length}/${total} tasks succeeded`)
          );
        }
        break;

      case 'none':
      default:
        this.overallResolve?.(successful);
        break;
    }
  }

  /** 获取状态 */
  getStatus(): {
    total: number;
    running: number;
    completed: number;
    failed: number;
  } {
    return {
      total: this.tasks.length,
      running: this.running,
      completed: this.completed,
      failed: this.failed,
    };
  }
}

// =============================================
// 性能监控
// =============================================

/** 性能记录 */
interface PerformanceRecord {
  operation: string;
  startTime: number;
  endTime?: number;
  duration?: number;
  success: boolean;
  error?: string;
}

/** 性能监控器 */
export class PerformanceMonitor {
  private records: PerformanceRecord[] = [];
  private maxRecords: number;
  private operationCounts: Map<string, number> = new Map();
  private operationDurations: Map<string, number[]> = new Map();

  constructor(maxRecords = 10000) {
    this.maxRecords = maxRecords;
  }

  /** 记录操作开始 */
  start(operation: string): () => void {
    const startTime = Date.now();
    const record: PerformanceRecord = {
      operation,
      startTime,
      success: true,
    };

    const count = this.operationCounts.get(operation) ?? 0;
    this.operationCounts.set(operation, count + 1);

    // 返回结束函数
    return (success = true, error?: string) => {
      record.endTime = Date.now();
      record.duration = record.endTime - startTime;
      record.success = success;
      record.error = error;

      this.addRecord(record);
    };
  }

  /** 添加记录 */
  private addRecord(record: PerformanceRecord): void {
    this.records.push(record);

    // 限制记录数
    if (this.records.length > this.maxRecords) {
      this.records.shift();
    }

    // 更新统计
    const durations = this.operationDurations.get(record.operation) ?? [];
    durations.push(record.duration ?? 0);

    // 保留最近 1000 条
    if (durations.length > 1000) {
      durations.shift();
    }

    this.operationDurations.set(record.operation, durations);
  }

  /** 获取统计 */
  getStats(): {
    totalRecords: number;
    operations: Record<string, {
      count: number;
      avgDuration: number;
      minDuration: number;
      maxDuration: number;
      p50: number;
      p95: number;
      p99: number;
    }>;
  } {
    const stats: Record<string, {
      count: number;
      avgDuration: number;
      minDuration: number;
      maxDuration: number;
      p50: number;
      p95: number;
      p99: number;
    }> = {};

    for (const [op, durations] of this.operationDurations.entries()) {
      if (durations.length === 0) continue;

      const sorted = [...durations].sort((a, b) => a - b);

      stats[op] = {
        count: this.operationCounts.get(op) ?? 0,
        avgDuration: durations.reduce((a, b) => a + b, 0) / durations.length,
        minDuration: sorted[0],
        maxDuration: sorted[sorted.length - 1],
        p50: this.percentile(sorted, 50),
        p95: this.percentile(sorted, 95),
        p99: this.percentile(sorted, 99),
      };
    }

    return {
      totalRecords: this.records.length,
      operations: stats,
    };
  }

  /** 计算百分位数 */
  private percentile(sorted: number[], p: number): number {
    const index = Math.ceil((p / 100) * sorted.length) - 1;
    return sorted[Math.max(0, index)];
  }

  /** 获取最近的记录 */
  getRecentRecords(count = 100): PerformanceRecord[] {
    return this.records.slice(-count);
  }

  /** 清除记录 */
  clear(): void {
    this.records = [];
    this.operationCounts.clear();
    this.operationDurations.clear();
  }
}

// =============================================
// 导出工厂函数
// =============================================

/** 创建连接池 */
export function createConnectionPool<T>(
  config: ConnectionPoolConfig,
  factory: () => T
): ConnectionPool<T> {
  return new ConnectionPool<T>(config, factory);
}

/** 创建批量处理器 */
export function createBatchHandler(
  config: BatchConfig,
  processor: (requests: ChatRequest[]) => Promise<ChatResponse[]>
): BatchRequestHandler {
  return new BatchRequestHandler(config, processor);
}

/** 创建并行执行器 */
export function createParallelExecutor(config: ParallelConfig): ParallelExecutor {
  return new ParallelExecutor(config);
}

/** 创建性能监控器 */
export function createPerformanceMonitor(maxRecords?: number): PerformanceMonitor {
  return new PerformanceMonitor(maxRecords);
}
