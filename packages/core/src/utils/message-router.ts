// 消息路由器 - 用于处理Worker内部的消息路由

import { WorkerMessage, WorkerResponse, MessageHandler } from './worker-manager';

// 消息路由器类
export class MessageRouter {
  private handlers: Map<string, MessageHandler<any, any>> = new Map();

  // 注册消息处理器
  register<T = unknown, R = unknown>(type: string, handler: MessageHandler<T, R>) {
    this.handlers.set(type, handler);
  }

  // 处理消息
  async handle(message: WorkerMessage): Promise<WorkerResponse> {
    const handler = this.handlers.get(message.type);
    if (!handler) {
      return {
        id: message.id,
        success: false,
        error: `Unknown message type: ${message.type}`,
        timestamp: Date.now()
      };
    }

    try {
      const data = await handler(message.payload);
      return {
        id: message.id,
        success: true,
        data,
        timestamp: Date.now()
      };
    } catch (error) {
      return {
        id: message.id,
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: Date.now()
      };
    }
  }

  // 移除消息处理器
  unregister(type: string) {
    this.handlers.delete(type);
  }

  // 获取所有注册的消息类型
  getRegisteredTypes(): string[] {
    return Array.from(this.handlers.keys());
  }
}

// 创建消息路由器实例
export const messageRouter = new MessageRouter();