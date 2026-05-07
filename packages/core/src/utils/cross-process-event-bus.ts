// 跨进程事件总线 - 用于跨进程事件传递

import { EventBus, EventHandler } from './event-bus';
import { workerManager } from './worker-manager';

// 跨进程事件总线类
export class CrossProcessEventBus extends EventBus {
  private static crossProcessInstance: CrossProcessEventBus;

  static getInstance(): CrossProcessEventBus {
    if (!CrossProcessEventBus.crossProcessInstance) {
      CrossProcessEventBus.crossProcessInstance = new CrossProcessEventBus();
    }
    return CrossProcessEventBus.crossProcessInstance;
  }

  // 发送事件（跨进程）
  emit<T>(event: string, payload: T): void {
    // 先在当前进程触发事件
    super.emit(event, payload);
    
    // 然后向其他进程广播事件
    workerManager.broadcastEvent(event, payload);
  }
}

// 创建跨进程事件总线实例
export const crossProcessEventBus = CrossProcessEventBus.getInstance();