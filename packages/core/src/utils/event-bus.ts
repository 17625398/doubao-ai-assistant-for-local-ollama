// 事件总线 - 用于模块间通信

/**
 * 事件处理器类型
 */
export type EventHandler<T = unknown> = (payload: T) => void

/**
 * 事件总线类 - 实现发布-订阅模式
 */
export class EventBus {
  private static instance: EventBus
  private listeners: Map<string, Set<EventHandler>> = new Map()

  /**
   * 获取单例实例
   */
  static getInstance(): EventBus {
    if (!EventBus.instance) {
      EventBus.instance = new EventBus()
    }
    return EventBus.instance
  }

  /**
   * 订阅事件
   * @param event 事件名称
   * @param handler 事件处理器
   * @returns 取消订阅函数
   */
  on<T>(event: string, handler: EventHandler<T>): () => void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set())
    }
    this.listeners.get(event)!.add(handler as EventHandler)

    // 返回取消订阅函数
    return () => {
      this.off(event, handler)
    }
  }

  /**
   * 取消订阅事件
   * @param event 事件名称
   * @param handler 事件处理器
   */
  off<T>(event: string, handler: EventHandler<T>): void {
    const handlers = this.listeners.get(event)
    if (handlers) {
      handlers.delete(handler as EventHandler)
      if (handlers.size === 0) {
        this.listeners.delete(event)
      }
    }
  }

  /**
   * 发布事件
   * @param event 事件名称
   * @param payload 事件数据
   */
  emit<T>(event: string, payload: T): void {
    const handlers = this.listeners.get(event)
    if (handlers) {
      handlers.forEach(handler => {
        try {
          handler(payload)
        } catch (error) {
          console.error(`Error in event handler for ${event}:`, error)
        }
      })
    }
  }

  /**
   * 订阅一次性事件
   * @param event 事件名称
   * @param handler 事件处理器
   */
  once<T>(event: string, handler: EventHandler<T>): void {
    const onceHandler: EventHandler<T> = payload => {
      this.off(event, onceHandler)
      handler(payload)
    }
    this.on(event, onceHandler)
  }

  /**
   * 清理事件监听器
   * @param event 事件名称（可选，不传则清空所有）
   */
  clear(event?: string): void {
    if (event) {
      this.listeners.delete(event)
    } else {
      this.listeners.clear()
    }
  }
}

/**
 * 全局事件总线实例
 */
export const eventBus = EventBus.getInstance()

