// 事件总线 - 用于模块间通信

export type EventHandler<T = unknown> = (payload: T) => void;

export class EventBus {
  private static instance: EventBus;
  private listeners: Map<string, Set<EventHandler>> = new Map();

  static getInstance(): EventBus {
    if (!EventBus.instance) {
      EventBus.instance = new EventBus();
    }
    return EventBus.instance;
  }

  on<T>(event: string, handler: EventHandler<T>): () => void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event)!.add(handler as EventHandler);

    // 返回取消订阅函数
    return () => {
      this.off(event, handler);
    };
  }

  off<T>(event: string, handler: EventHandler<T>): void {
    const handlers = this.listeners.get(event);
    if (handlers) {
      handlers.delete(handler as EventHandler);
      if (handlers.size === 0) {
        this.listeners.delete(event);
      }
    }
  }

  emit<T>(event: string, payload: T): void {
    const handlers = this.listeners.get(event);
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

  once<T>(event: string, handler: EventHandler<T>): void {
    const onceHandler: EventHandler<T> = (payload) => {
      this.off(event, onceHandler);
      handler(payload);
    };
    this.on(event, onceHandler);
  }

  clear(event?: string): void {
    if (event) {
      this.listeners.delete(event);
    } else {
      this.listeners.clear();
    }
  }
}

export const eventBus = EventBus.getInstance();
