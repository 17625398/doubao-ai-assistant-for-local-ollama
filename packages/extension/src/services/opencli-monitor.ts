/**
 * OpenCLI 性能监控模块
 * 
 * 监控系统性能指标，包括命令执行时间、内存使用、错误率等
 * 提供性能报告和实时数据
 */

import { type CommandResult } from './opencli-bridge';

/**
 * 性能指标
 */
export interface PerformanceMetric {
  name: string;
  value: number;
  unit: string;
  timestamp: number;
  tags?: Record<string, string>;
}

/**
 * 命令执行记录
 */
export interface CommandExecutionRecord {
  command: string;
  args: Record<string, any>;
  duration: number;
  success: boolean;
  error?: string;
  timestamp: number;
  memoryUsage?: {
    heapUsed: number;
    heapTotal: number;
  };
}

/**
 * 性能统计
 */
export interface PerformanceStats {
  commands: {
    total: number;
    successful: number;
    failed: number;
    successRate: number;
    averageDuration: number;
    minDuration: number;
    maxDuration: number;
    p50Duration: number;
    p95Duration: number;
    p99Duration: number;
  };
  memory: {
    current: number;
    average: number;
    peak: number;
  };
  errors: {
    total: number;
    rate: number;
    byType: Record<string, number>;
  };
  throughput: {
    commandsPerSecond: number;
    peakCommandsPerSecond: number;
  };
}

/**
 * 监控配置
 */
export interface MonitorConfig {
  enabled: boolean;
  maxRecords: number;
  sampleRate: number; // 采样率 (0-1)
  reportInterval: number; // 报告间隔 (毫秒)
}

/**
 * OpenCLI 性能监控类
 * 
 * 单例模式，收集和分析性能数据
 */
export class PerformanceMonitor {
  private static instance: PerformanceMonitor | null = null;
  
  private records: CommandExecutionRecord[] = [];
  private config: MonitorConfig = {
    enabled: true,
    maxRecords: 1000,
    sampleRate: 1.0,
    reportInterval: 60000, // 1 分钟
  };
  
  private startTime: number = Date.now();
  private eventListeners: Map<string, Array<(data: any) => void>> = new Map();
  private reportTimer: number | null = null;
  
  /**
   * 私有构造函数 (单例模式)
   */
  private constructor() {
    this.startAutoReport();
  }
  
  /**
   * 获取单例实例
   */
  public static getInstance(): PerformanceMonitor {
    if (!PerformanceMonitor.instance) {
      PerformanceMonitor.instance = new PerformanceMonitor();
    }
    return PerformanceMonitor.instance;
  }
  
  /**
   * 记录命令执行
   */
  public recordCommand(
    command: string,
    args: Record<string, any>,
    result: CommandResult,
    duration: number
  ): void {
    if (!this.config.enabled) {
      return;
    }
    
    // 采样
    if (Math.random() > this.config.sampleRate) {
      return;
    }
    
    const record: CommandExecutionRecord = {
      command,
      args,
      duration,
      success: result.success,
      error: result.error || result.message,
      timestamp: Date.now(),
    };
    
    // 记录内存使用（如果可用）
    if (typeof performance !== 'undefined' && (performance as any).memory) {
      const memory = (performance as any).memory;
      record.memoryUsage = {
        heapUsed: memory.usedJSHeapSize,
        heapTotal: memory.totalJSHeapSize,
      };
    }
    
    this.records.push(record);
    
    // 限制记录数量
    if (this.records.length > this.config.maxRecords) {
      this.records.shift();
    }
    
    // 触发事件
    this.emit('command:recorded', record);
    
    // 检查是否有性能问题
    this.checkPerformanceIssues(record);
  }
  
  /**
   * 获取性能统计
   */
  public getStats(timeRange?: { start?: number; end?: number }): PerformanceStats {
    let filteredRecords = [...this.records];
    
    // 时间范围过滤
    if (timeRange) {
      if (timeRange.start) {
        filteredRecords = filteredRecords.filter((r) => r.timestamp >= timeRange.start!);
      }
      if (timeRange.end) {
        filteredRecords = filteredRecords.filter((r) => r.timestamp <= timeRange.end!);
      }
    }
    
    const total = filteredRecords.length;
    const successful = filteredRecords.filter((r) => r.success).length;
    const failed = total - successful;
    const successRate = total > 0 ? (successful / total) * 100 : 0;
    
    // 计算执行时间统计
    const durations = filteredRecords.map((r) => r.duration).sort((a, b) => a - b);
    const averageDuration = total > 0 ? durations.reduce((a, b) => a + b, 0) / total : 0;
    const minDuration = total > 0 ? durations[0] : 0;
    const maxDuration = total > 0 ? durations[durations.length - 1] : 0;
    
    // 百分位数
    const p50Duration = this.getPercentile(durations, 50);
    const p95Duration = this.getPercentile(durations, 95);
    const p99Duration = this.getPercentile(durations, 99);
    
    // 内存统计
    const memoryRecords = filteredRecords.filter((r) => r.memoryUsage);
    const currentMemory = memoryRecords.length > 0 
      ? memoryRecords[memoryRecords.length - 1].memoryUsage!.heapUsed 
      : 0;
    const averageMemory = memoryRecords.length > 0
      ? memoryRecords.reduce((sum, r) => sum + r.memoryUsage!.heapUsed, 0) / memoryRecords.length
      : 0;
    const peakMemory = memoryRecords.length > 0
      ? Math.max(...memoryRecords.map((r) => r.memoryUsage!.heapUsed))
      : 0;
    
    // 错误统计
    const errorByType = new Map<string, number>();
    filteredRecords.forEach((r) => {
      if (r.error) {
        const type = r.error.split(':')[0];
        errorByType.set(type, (errorByType.get(type) || 0) + 1);
      }
    });
    
    // 吞吐量计算
    const timeSpan = filteredRecords.length > 1
      ? (filteredRecords[filteredRecords.length - 1].timestamp - filteredRecords[0].timestamp) / 1000
      : 1;
    const commandsPerSecond = timeSpan > 0 ? total / timeSpan : 0;
    
    // 计算峰值吞吐量（按秒分组）
    const commandsBySecond = new Map<number, number>();
    filteredRecords.forEach((r) => {
      const second = Math.floor(r.timestamp / 1000);
      commandsBySecond.set(second, (commandsBySecond.get(second) || 0) + 1);
    });
    const peakCommandsPerSecond = commandsBySecond.size > 0
      ? Math.max(...Array.from(commandsBySecond.values()))
      : 0;
    
    return {
      commands: {
        total,
        successful,
        failed,
        successRate,
        averageDuration,
        minDuration,
        maxDuration,
        p50Duration,
        p95Duration,
        p99Duration,
      },
      memory: {
        current: currentMemory,
        average: averageMemory,
        peak: peakMemory,
      },
      errors: {
        total: failed,
        rate: total > 0 ? (failed / total) * 100 : 0,
        byType: Object.fromEntries(errorByType),
      },
      throughput: {
        commandsPerSecond,
        peakCommandsPerSecond,
      },
    };
  }
  
  /**
   * 获取百分位数
   */
  private getPercentile(sortedData: number[], percentile: number): number {
    if (sortedData.length === 0) {
      return 0;
    }
    
    const index = Math.ceil((percentile / 100) * sortedData.length) - 1;
    return sortedData[Math.max(0, index)];
  }
  
  /**
   * 检查性能问题
   */
  private checkPerformanceIssues(record: CommandExecutionRecord): void {
    // 慢命令检测 (> 5 秒)
    if (record.duration > 5000) {
      this.emit('performance:slow', {
        ...record,
        threshold: 5000,
      });
    }
    
    // 内存使用过高检测 (> 100MB)
    if (record.memoryUsage && record.memoryUsage.heapUsed > 100 * 1024 * 1024) {
      this.emit('performance:highMemory', {
        ...record,
        threshold: 100 * 1024 * 1024,
      });
    }
    
    // 连续错误检测
    const recentErrors = this.records
      .slice(-10)
      .filter((r) => !r.success);
    
    if (recentErrors.length >= 5) {
      this.emit('performance:consecutiveErrors', {
        count: recentErrors.length,
        recent: recentErrors,
      });
    }
  }
  
  /**
   * 获取最近的执行记录
   */
  public getRecentRecords(limit: number = 100): CommandExecutionRecord[] {
    return this.records.slice(-limit);
  }
  
  /**
   * 获取慢命令列表
   */
  public getSlowCommands(threshold: number = 5000, limit: number = 20): CommandExecutionRecord[] {
    return this.records
      .filter((r) => r.duration > threshold)
      .sort((a, b) => b.duration - a.duration)
      .slice(0, limit);
  }
  
  /**
   * 获取错误命令列表
   */
  public getFailedCommands(limit: number = 50): CommandExecutionRecord[] {
    return this.records
      .filter((r) => !r.success)
      .slice(-limit);
  }
  
  /**
   * 生成性能报告
   */
  public generateReport(): string {
    const stats = this.getStats();
    const uptime = Date.now() - this.startTime;
    
    let report = `=== OpenCLI 性能报告 ===\n\n`;
    report += `运行时间：${this.formatDuration(uptime)}\n`;
    report += `采样率：${this.config.sampleRate * 100}%\n\n`;
    
    report += `--- 命令执行 ---\n`;
    report += `总命令数：${stats.commands.total}\n`;
    report += `成功：${stats.commands.successful} (${stats.commands.successRate.toFixed(2)}%)\n`;
    report += `失败：${stats.commands.failed} (${stats.errors.rate.toFixed(2)}%)\n`;
    report += `平均耗时：${stats.commands.averageDuration.toFixed(2)}ms\n`;
    report += `P50: ${stats.commands.p50Duration.toFixed(2)}ms\n`;
    report += `P95: ${stats.commands.p95Duration.toFixed(2)}ms\n`;
    report += `P99: ${stats.commands.p99Duration.toFixed(2)}ms\n`;
    report += `吞吐量：${stats.throughput.commandsPerSecond.toFixed(2)} 命令/秒\n`;
    report += `峰值吞吐量：${stats.throughput.peakCommandsPerSecond} 命令/秒\n\n`;
    
    report += `--- 内存使用 ---\n`;
    report += `当前：${this.formatMemory(stats.memory.current)}\n`;
    report += `平均：${this.formatMemory(stats.memory.average)}\n`;
    report += `峰值：${this.formatMemory(stats.memory.peak)}\n\n`;
    
    report += `--- 错误统计 ---\n`;
    report += `总错误数：${stats.errors.total}\n`;
    report += `错误率：${stats.errors.rate.toFixed(2)}%\n`;
    if (Object.keys(stats.errors.byType).length > 0) {
      report += `错误类型:\n`;
      for (const [type, count] of Object.entries(stats.errors.byType)) {
        report += `  ${type}: ${count}\n`;
      }
    }
    
    // 慢命令 Top 5
    const slowCommands = this.getSlowCommands(5000, 5);
    if (slowCommands.length > 0) {
      report += `\n--- 慢命令 Top 5 ---\n`;
      slowCommands.forEach((cmd, i) => {
        report += `${i + 1}. ${cmd.command} (${cmd.duration.toFixed(2)}ms)\n`;
      });
    }
    
    return report;
  }
  
  /**
   * 格式化持续时间
   */
  private formatDuration(ms: number): string {
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    
    if (hours > 0) {
      return `${hours}小时 ${minutes % 60}分钟`;
    }
    if (minutes > 0) {
      return `${minutes}分钟 ${seconds % 60}秒`;
    }
    return `${seconds}秒`;
  }
  
  /**
   * 格式化内存
   */
  private formatMemory(bytes: number): string {
    if (bytes > 1024 * 1024) {
      return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
    }
    if (bytes > 1024) {
      return `${(bytes / 1024).toFixed(2)} KB`;
    }
    return `${bytes} B`;
  }
  
  /**
   * 更新配置
   */
  public updateConfig(config: Partial<MonitorConfig>): void {
    this.config = { ...this.config, ...config };
    
    // 如果禁用，停止自动报告
    if (!this.config.enabled && this.reportTimer) {
      this.stopAutoReport();
    } else if (this.config.enabled && !this.reportTimer) {
      this.startAutoReport();
    }
  }
  
  /**
   * 启用/禁用监控
   */
  public setEnabled(enabled: boolean): void {
    this.config.enabled = enabled;
    if (!enabled) {
      this.records = [];
    }
  }
  
  /**
   * 清空记录
   */
  public clear(): void {
    this.records = [];
  }
  
  /**
   * 启动自动报告
   */
  private startAutoReport(): void {
    if (this.reportTimer) {
      return;
    }
    
    this.reportTimer = window.setInterval(() => {
      const report = this.generateReport();
      console.log('[PerformanceMonitor]\n' + report);
      this.emit('report:generated', report);
    }, this.config.reportInterval);
  }
  
  /**
   * 停止自动报告
   */
  private stopAutoReport(): void {
    if (this.reportTimer) {
      clearInterval(this.reportTimer);
      this.reportTimer = null;
    }
  }
  
  /**
   * 注册事件监听器
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
          console.error(`[PerformanceMonitor] Event listener error for "${event}":`, error);
        }
      });
    }
  }
  
  /**
   * 导出监控数据
   */
  public export(): string {
    return JSON.stringify({
      records: this.records,
      stats: this.getStats(),
      config: this.config,
      startTime: this.startTime,
    }, null, 2);
  }
  
  /**
   * 导入监控数据
   */
  public import(data: string): void {
    try {
      const parsed = JSON.parse(data);
      if (parsed.records && Array.isArray(parsed.records)) {
        this.records = parsed.records;
      }
      if (parsed.startTime) {
        this.startTime = parsed.startTime;
      }
    } catch (error) {
      console.error('[PerformanceMonitor] 导入失败:', error);
    }
  }
}

// 导出单例实例
export const performanceMonitor = PerformanceMonitor.getInstance();
