// Worker管理器 - 用于管理Web Workers和进程间通信

import { EventHandler } from './event-bus';

// 消息类型定义
export interface WorkerMessage<T = unknown> {
  id: string;          // 消息唯一标识
  type: string;        // 消息类型
  payload: T;          // 消息数据
  timestamp: number;   // 时间戳
}

// 响应消息类型
export interface WorkerResponse<T = unknown> {
  id: string;          // 对应请求的消息ID
  success: boolean;    // 是否成功
  data?: T;            // 响应数据
  error?: string;      // 错误信息
  timestamp: number;   // 时间戳
}

// 消息处理器类型
export type MessageHandler<T = unknown, R = unknown> = (payload: T) => Promise<R>;

// Worker包装器类
export class WorkerWrapper {
  private name: string;
  private worker: Worker;
  private manager: WorkerManager;
  private eventHandlers: Map<string, Set<EventHandler>> = new Map();

  constructor(name: string, worker: Worker, manager: WorkerManager) {
    this.name = name;
    this.worker = worker;
    this.manager = manager;
    this.setupEventListeners();
  }

  // 设置事件监听器
  private setupEventListeners() {
    this.worker.onmessage = (event) => {
      const data = event.data;
      if (data.type === 'response') {
        this.manager.handleResponse(data);
      } else if (data.type === 'event') {
        this.handleEvent(data.event, data.payload);
      }
    };

    this.worker.onerror = (error) => {
      console.error(`Worker ${this.name} error:`, error);
    };
  }

  // 发送消息
  sendMessage(message: WorkerMessage) {
    this.worker.postMessage(message);
  }

  // 发送事件
  sendEvent(event: string, payload: unknown) {
    this.worker.postMessage({ type: 'event', event, payload });
  }

  // 处理事件
  private handleEvent(event: string, payload: unknown) {
    const handlers = this.eventHandlers.get(event);
    if (handlers) {
      handlers.forEach(handler => {
        try {
          handler(payload);
        } catch (error) {
          console.error(`Error in event handler for ${event}:`, error);
        }
      });
    }
  }

  // 订阅事件
  on<T>(event: string, handler: EventHandler<T>): () => void {
    if (!this.eventHandlers.has(event)) {
      this.eventHandlers.set(event, new Set());
    }
    this.eventHandlers.get(event)!.add(handler as EventHandler);

    return () => {
      this.off(event, handler);
    };
  }

  // 取消订阅
  off<T>(event: string, handler: EventHandler<T>) {
    const handlers = this.eventHandlers.get(event);
    if (handlers) {
      handlers.delete(handler as EventHandler);
      if (handlers.size === 0) {
        this.eventHandlers.delete(event);
      }
    }
  }

  // 终止Worker
  terminate() {
    this.worker.terminate();
  }

  // 获取Worker名称
  getName(): string {
    return this.name;
  }
}

// Worker管理器类
export class WorkerManager {
  private static instance: WorkerManager;
  private workers: Map<string, WorkerWrapper> = new Map();
  private messageIdCounter = 0;
  private pendingMessages: Map<string, { resolve: Function; reject: Function }> = new Map();

  static getInstance(): WorkerManager {
    if (!WorkerManager.instance) {
      WorkerManager.instance = new WorkerManager();
    }
    return WorkerManager.instance;
  }

  // 创建Worker
  createWorker(name: string, scriptUrl: string, options?: WorkerOptions): WorkerWrapper {
    const worker = new Worker(scriptUrl, options);
    const wrapper = new WorkerWrapper(name, worker, this);
    this.workers.set(name, wrapper);
    return wrapper;
  }

  // 获取Worker
  getWorker(name: string): WorkerWrapper | undefined {
    return this.workers.get(name);
  }

  // 发送消息到Worker
  sendMessage<T, R>(workerName: string, type: string, payload: T): Promise<R> {
    const worker = this.workers.get(workerName);
    if (!worker) {
      return Promise.reject(new Error(`Worker ${workerName} not found`));
    }

    const id = this.generateMessageId();
    return new Promise((resolve, reject) => {
      this.pendingMessages.set(id, { resolve, reject });
      worker.sendMessage({ id, type, payload, timestamp: Date.now() });
    });
  }

  // 处理Worker响应
  handleResponse(response: WorkerResponse) {
    const pending = this.pendingMessages.get(response.id);
    if (pending) {
      this.pendingMessages.delete(response.id);
      if (response.success) {
        pending.resolve(response.data);
      } else {
        pending.reject(new Error(response.error));
      }
    }
  }

  // 广播事件到所有Worker
  broadcastEvent(event: string, payload: unknown) {
    this.workers.forEach(worker => {
      worker.sendEvent(event, payload);
    });
  }

  // 移除Worker
  removeWorker(name: string) {
    const worker = this.workers.get(name);
    if (worker) {
      worker.terminate();
      this.workers.delete(name);
    }
  }

  // 获取所有Worker名称
  getWorkerNames(): string[] {
    return Array.from(this.workers.keys());
  }

  // 生成唯一消息ID
  private generateMessageId(): string {
    return `msg_${Date.now()}_${++this.messageIdCounter}`;
  }
}

export const workerManager = WorkerManager.getInstance();