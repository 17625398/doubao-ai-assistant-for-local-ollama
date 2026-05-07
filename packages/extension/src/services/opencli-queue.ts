/**
 * OpenCLI 命令队列模块
 * 
 * 提供命令的排队、批量执行、优先级控制等功能
 * 支持暂停、恢复、取消等队列管理操作
 */

import { openCLIBridge, type CommandResult } from './opencli-bridge';

/**
 * 命令优先级
 */
export enum CommandPriority {
  LOW = 0,
  NORMAL = 1,
  HIGH = 2,
  CRITICAL = 3,
}

/**
 * 队列命令状态
 */
export enum QueueCommandStatus {
  PENDING = 'pending',
  RUNNING = 'running',
  COMPLETED = 'completed',
  FAILED = 'failed',
  CANCELLED = 'cancelled',
}

/**
 * 队列中的命令接口
 */
export interface QueuedCommand {
  id: string;
  command: string;
  args: Record<string, any>;
  priority: CommandPriority;
  status: QueueCommandStatus;
  result?: CommandResult;
  createdAt: number;
  startedAt?: number;
  completedAt?: number;
  retryCount: number;
  maxRetries: number;
}

/**
 * 队列配置
 */
export interface QueueConfig {
  maxRetries: number;
  retryDelay: number;
  concurrentLimit: number;
  autoStart: boolean;
}

/**
 * 队列统计信息
 */
export interface QueueStats {
  total: number;
  pending: number;
  running: number;
  completed: number;
  failed: number;
  cancelled: number;
  averageDuration: number;
}

/**
 * OpenCLI 命令队列类
 * 
 * 单例模式，管理所有待执行的命令
 */
export class OpenCLIQueue {
  private static instance: OpenCLIQueue | null = null;

  private queue: QueuedCommand[] = [];
  private isRunning: boolean = false;
  private isPaused: boolean = false;
  private currentProcessingCount: number = 0;
  
  private config: QueueConfig = {
    maxRetries: 3,
    retryDelay: 1000,
    concurrentLimit: 1, // 默认串行执行
    autoStart: true,
  };

  private eventListeners: Map<string, Array<(data: any) => void>> = new Map();

  /**
   * 私有构造函数 (单例模式)
   */
  private constructor() {}

  /**
   * 获取单例实例
   */
  public static getInstance(): OpenCLIQueue {
    if (!OpenCLIQueue.instance) {
      OpenCLIQueue.instance = new OpenCLIQueue();
    }
    return OpenCLIQueue.instance;
  }

  /**
   * 生成唯一命令 ID
   */
  private generateId(): string {
    return `cmd_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * 添加命令到队列
   * 
   * @param command 命令名称
   * @param args 命令参数
   * @param priority 优先级 (默认：NORMAL)
   * @returns 命令 ID
   */
  public enqueue(
    command: string,
    args: Record<string, any> = {},
    priority: CommandPriority = CommandPriority.NORMAL
  ): string {
    const id = this.generateId();
    
    const queuedCommand: QueuedCommand = {
      id,
      command,
      args,
      priority,
      status: QueueCommandStatus.PENDING,
      createdAt: Date.now(),
      retryCount: 0,
      maxRetries: this.config.maxRetries,
    };

    this.queue.push(queuedCommand);
    
    // 按优先级排序
    this.sortQueue();

    // 触发动画
    this.emit('command:added', { id, command, args, priority });

    // 如果队列未运行且配置为自动启动，则开始处理
    if (!this.isRunning && this.config.autoStart) {
      this.start();
    }

    return id;
  }

  /**
   * 批量添加命令
   * 
   * @param commands 命令数组
   * @returns 命令 ID 数组
   */
  public enqueueBatch(
    commands: Array<{ command: string; args?: Record<string, any>; priority?: CommandPriority }>
  ): string[] {
    const ids: string[] = [];
    
    for (const cmd of commands) {
      const id = this.enqueue(cmd.command, cmd.args || {}, cmd.priority || CommandPriority.NORMAL);
      ids.push(id);
    }

    return ids;
  }

  /**
   * 对队列按优先级排序
   */
  private sortQueue(): void {
    this.queue.sort((a, b) => {
      // 优先级高的在前
      if (b.priority !== a.priority) {
        return b.priority - a.priority;
      }
      // 同优先级按创建时间排序
      return a.createdAt - b.createdAt;
    });
  }

  /**
   * 开始处理队列
   */
  public async start(): Promise<void> {
    if (this.isRunning) {
      return;
    }

    this.isRunning = true;
    this.isPaused = false;
    this.emit('queue:started');

    while (this.isRunning && !this.isPaused) {
      const pendingCommands = this.queue.filter(
        (cmd) => cmd.status === QueueCommandStatus.PENDING
      );

      if (pendingCommands.length === 0) {
        break;
      }

      // 检查并发限制
      if (this.currentProcessingCount >= this.config.concurrentLimit) {
        await this.delay(100);
        continue;
      }

      // 获取下一个命令
      const nextCommand = pendingCommands[0];
      await this.processCommand(nextCommand);
    }

    this.isRunning = false;
    this.emit('queue:completed');
  }

  /**
   * 处理单个命令
   */
  private async processCommand(cmd: QueuedCommand): Promise<void> {
    this.currentProcessingCount++;
    cmd.status = QueueCommandStatus.RUNNING;
    cmd.startedAt = Date.now();
    
    this.emit('command:started', { id: cmd.id, command: cmd.command });

    try {
      const result = await openCLIBridge.execute(cmd.command, cmd.args);
      
      cmd.result = result;
      cmd.completedAt = Date.now();

      if (result.success) {
        cmd.status = QueueCommandStatus.COMPLETED;
        this.emit('command:completed', { id: cmd.id, result });
      } else {
        // 执行失败，检查是否需要重试
        if (cmd.retryCount < cmd.maxRetries) {
          cmd.retryCount++;
          cmd.status = QueueCommandStatus.PENDING;
          this.emit('command:retry', { id: cmd.id, retryCount: cmd.retryCount, error: result.error });
          
          // 延迟后重试
          await this.delay(this.config.retryDelay * cmd.retryCount);
        } else {
          cmd.status = QueueCommandStatus.FAILED;
          this.emit('command:failed', { id: cmd.id, error: result.error });
        }
      }
    } catch (error) {
      cmd.status = QueueCommandStatus.FAILED;
      cmd.result = {
        success: false,
        error: 'EXECUTION_ERROR',
        message: error instanceof Error ? error.message : '未知错误',
      };
      this.emit('command:failed', { id: cmd.id, error: cmd.result.message });
    } finally {
      this.currentProcessingCount--;
    }
  }

  /**
   * 暂停队列处理
   */
  public pause(): void {
    this.isPaused = true;
    this.emit('queue:paused');
  }

  /**
   * 恢复队列处理
   */
  public resume(): void {
    if (this.isPaused) {
      this.isPaused = false;
      this.emit('queue:resumed');
      
      // 继续处理
      if (!this.isRunning) {
        this.start();
      }
    }
  }

  /**
   * 停止队列
   */
  public stop(): void {
    this.isRunning = false;
    this.isPaused = false;
    this.emit('queue:stopped');
  }

  /**
   * 取消指定命令
   * 
   * @param id 命令 ID
   */
  public cancel(id: string): boolean {
    const cmd = this.queue.find((c) => c.id === id);
    
    if (cmd && cmd.status === QueueCommandStatus.PENDING) {
      cmd.status = QueueCommandStatus.CANCELLED;
      this.emit('command:cancelled', { id });
      return true;
    }

    return false;
  }

  /**
   * 取消所有待处理命令
   */
  public cancelAll(): void {
    this.queue.forEach((cmd) => {
      if (cmd.status === QueueCommandStatus.PENDING) {
        cmd.status = QueueCommandStatus.CANCELLED;
      }
    });
    this.emit('queue:cleared');
  }

  /**
   * 清除队列
   */
  public clear(): void {
    this.queue = [];
    this.emit('queue:cleared');
  }

  /**
   * 获取队列状态
   */
  public getStatus(): {
    isRunning: boolean;
    isPaused: boolean;
    queueLength: number;
    processingCount: number;
  } {
    return {
      isRunning: this.isRunning,
      isPaused: this.isPaused,
      queueLength: this.queue.filter((cmd) => cmd.status === QueueCommandStatus.PENDING).length,
      processingCount: this.currentProcessingCount,
    };
  }

  /**
   * 获取队列统计
   */
  public getStats(): QueueStats {
    const stats: QueueStats = {
      total: this.queue.length,
      pending: this.queue.filter((cmd) => cmd.status === QueueCommandStatus.PENDING).length,
      running: this.queue.filter((cmd) => cmd.status === QueueCommandStatus.RUNNING).length,
      completed: this.queue.filter((cmd) => cmd.status === QueueCommandStatus.COMPLETED).length,
      failed: this.queue.filter((cmd) => cmd.status === QueueCommandStatus.FAILED).length,
      cancelled: this.queue.filter((cmd) => cmd.status === QueueCommandStatus.CANCELLED).length,
      averageDuration: 0,
    };

    // 计算平均执行时间
    const completedCommands = this.queue.filter(
      (cmd) => cmd.status === QueueCommandStatus.COMPLETED && cmd.startedAt && cmd.completedAt
    );

    if (completedCommands.length > 0) {
      const totalDuration = completedCommands.reduce(
        (sum, cmd) => sum + (cmd.completedAt! - cmd.startedAt!),
        0
      );
      stats.averageDuration = totalDuration / completedCommands.length;
    }

    return stats;
  }

  /**
   * 获取队列中的所有命令
   * 
   * @param status 可选的状态过滤器
   */
  public getCommands(status?: QueueCommandStatus): QueuedCommand[] {
    if (status) {
      return this.queue.filter((cmd) => cmd.status === status);
    }
    return [...this.queue];
  }

  /**
   * 获取指定命令
   * 
   * @param id 命令 ID
   */
  public getCommand(id: string): QueuedCommand | undefined {
    return this.queue.find((cmd) => cmd.id === id);
  }

  /**
   * 更新队列配置
   * 
   * @param config 新配置
   */
  public updateConfig(config: Partial<QueueConfig>): void {
    this.config = { ...this.config, ...config };
    this.emit('config:updated', this.config);
  }

  /**
   * 注册事件监听器
   * 
   * @param event 事件名称
   * @param callback 回调函数
   */
  public on(event: string, callback: (data: any) => void): void {
    if (!this.eventListeners.has(event)) {
      this.eventListeners.set(event, []);
    }
    this.eventListeners.get(event)!.push(callback);
  }

  /**
   * 移除事件监听器
   */
  public off(event: string, callback: (data: any) => void): void {
    const listeners = this.eventListeners.get(event);
    if (listeners) {
      const index = listeners.indexOf(callback);
      if (index > -1) {
        listeners.splice(index, 1);
      }
    }
  }

  /**
   * 触发事件
   */
  private emit(event: string, data?: any): void {
    const listeners = this.eventListeners.get(event);
    if (listeners) {
      listeners.forEach((callback) => {
        try {
          callback(data);
        } catch (error) {
          console.error(`[OpenCLIQueue] Event listener error for "${event}":`, error);
        }
      });
    }
  }

  /**
   * 延迟等待
   */
  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  /**
   * 导出队列为 JSON
   */
  public exportToJSON(): string {
    return JSON.stringify({
      queue: this.queue,
      config: this.config,
      stats: this.getStats(),
    }, null, 2);
  }

  /**
   * 从 JSON 导入队列
   * 
   * @param json JSON 字符串
   */
  public importFromJSON(json: string): void {
    try {
      const data = JSON.parse(json);
      if (data.queue && Array.isArray(data.queue)) {
        this.queue = data.queue;
      }
      if (data.config) {
        this.updateConfig(data.config);
      }
      this.emit('queue:imported');
    } catch (error) {
      throw new Error('无效的队列数据格式');
    }
  }
}

// 导出单例实例
export const openCLIQueue = OpenCLIQueue.getInstance();
