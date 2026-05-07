import { DecisionLog } from './context-engineering-system';

// 决策记录器接口
export interface DecisionLogger {
  // 记录决策
  log(type: string, description: string, details: any): void;
  
  // 获取决策记录
  getLogs(): DecisionLog[];
  
  // 清除决策记录
  clearLogs(): void;
}

// 决策记录器实现
export class DecisionLoggerImpl implements DecisionLogger {
  private logs: DecisionLog[] = [];
  private maxLogs = 100; // 最大日志数量

  // 记录决策
  log(type: string, description: string, details: any): void {
    const log: DecisionLog = {
      timestamp: new Date(),
      type,
      description,
      details
    };

    this.logs.push(log);

    // 限制日志数量
    if (this.logs.length > this.maxLogs) {
      this.logs.shift();
    }

    // 可以在这里添加日志持久化逻辑
    console.log('[Decision]', type, description, details);
  }

  // 获取决策记录
  getLogs(): DecisionLog[] {
    return [...this.logs];
  }

  // 清除决策记录
  clearLogs(): void {
    this.logs = [];
  }
}

// 创建单例实例
let decisionLoggerInstance: DecisionLoggerImpl | null = null;

export function getDecisionLogger(): DecisionLogger {
  if (!decisionLoggerInstance) {
    decisionLoggerInstance = new DecisionLoggerImpl();
  }
  return decisionLoggerInstance;
}

// 为了向后兼容，保留原有导出名称
export const decisionLogger = getDecisionLogger();