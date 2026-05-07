/**
 * OpenCLI 历史记录管理模块
 * 
 * 负责记录、存储、查询和管理所有 OpenCLI 命令的执行历史
 * 支持持久化存储、统计分析、历史回放等功能
 */

/**
 * 历史记录条目
 */
export interface HistoryEntry {
  id: string;
  timestamp: number;
  command: string;
  args: Record<string, any>;
  result: {
    success: boolean;
    data?: any;
    error?: string;
    message?: string;
  };
  duration: number; // 执行耗时 (毫秒)
  tabId?: number;
  url?: string;
  pageTitle?: string;
  tags?: string[];
  notes?: string;
}

/**
 * 查询过滤器
 */
export interface HistoryFilter {
  command?: string;
  success?: boolean;
  startTime?: number;
  endTime?: number;
  tabId?: number;
  url?: string;
  tags?: string[];
  limit?: number;
  offset?: number;
}

/**
 * 统计信息
 */
export interface HistoryStats {
  totalCommands: number;
  successfulCommands: number;
  failedCommands: number;
  successRate: number;
  averageDuration: number;
  mostUsedCommands: Array<{ command: string; count: number }>;
  commandsByHour: Array<{ hour: number; count: number }>;
  recentActivity: HistoryEntry[];
}

/**
 * OpenCLI 历史记录管理类
 * 
 * 单例模式，管理所有历史记录
 */
export class OpenCLIHistoryManager {
  private static instance: OpenCLIHistoryManager | null = null;

  private history: HistoryEntry[] = [];
  private maxHistoryLength: number = 1000; // 最多保存 1000 条记录
  private storageKey: string = 'opencli_history';
  private autoSave: boolean = true;

  /**
   * 私有构造函数 (单例模式)
   */
  private constructor() {
    // 初始化时加载历史记录
    this.loadFromStorage().catch((error) => {
      console.error('[OpenCLIHistory] Failed to load history:', error);
    });
  }

  /**
   * 获取单例实例
   */
  public static getInstance(): OpenCLIHistoryManager {
    if (!OpenCLIHistoryManager.instance) {
      OpenCLIHistoryManager.instance = new OpenCLIHistoryManager();
    }
    return OpenCLIHistoryManager.instance;
  }

  /**
   * 生成唯一 ID
   */
  private generateId(): string {
    return `hist_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * 添加历史记录
   * 
   * @param entry 历史记录条目
   * @returns 记录 ID
   */
  public add(entry: Omit<HistoryEntry, 'id'>): string {
    const id = this.generateId();
    
    const historyEntry: HistoryEntry = {
      ...entry,
      id,
    };

    this.history.unshift(historyEntry); // 新记录添加到开头

    // 限制历史记录长度
    if (this.history.length > this.maxHistoryLength) {
      this.history = this.history.slice(0, this.maxHistoryLength);
    }

    // 自动保存
    if (this.autoSave) {
      this.saveToStorage().catch((error) => {
        console.error('[OpenCLIHistory] Failed to save history:', error);
      });
    }

    return id;
  }

  /**
   * 记录命令执行
   * 
   * @param command 命令名称
   * @param args 命令参数
   * @param result 执行结果
   * @param duration 执行耗时
   * @param context 上下文信息
   * @returns 记录 ID
   */
  public recordCommand(
    command: string,
    args: Record<string, any>,
    result: { success: boolean; data?: any; error?: string; message?: string },
    duration: number,
    context?: { tabId?: number; url?: string; pageTitle?: string }
  ): string {
    return this.add({
      timestamp: Date.now(),
      command,
      args,
      result,
      duration,
      ...context,
    });
  }

  /**
   * 查询历史记录
   * 
   * @param filter 查询过滤器
   * @returns 匹配的历史记录
   */
  public query(filter: HistoryFilter = {}): HistoryEntry[] {
    let results = [...this.history];

    // 按命令过滤
    if (filter.command) {
      results = results.filter((entry) => entry.command === filter.command);
    }

    // 按执行结果过滤
    if (filter.success !== undefined) {
      results = results.filter((entry) => entry.result.success === filter.success);
    }

    // 按时间范围过滤
    if (filter.startTime !== undefined) {
      results = results.filter((entry) => entry.timestamp >= filter.startTime!);
    }
    if (filter.endTime !== undefined) {
      results = results.filter((entry) => entry.timestamp <= filter.endTime!);
    }

    // 按标签页过滤
    if (filter.tabId !== undefined) {
      results = results.filter((entry) => entry.tabId === filter.tabId);
    }

    // 按 URL 过滤
    if (filter.url) {
      results = results.filter((entry) => entry.url?.includes(filter.url!));
    }

    // 按标签过滤
    if (filter.tags && filter.tags.length > 0) {
      results = results.filter((entry) => 
        entry.tags?.some((tag) => filter.tags!.includes(tag))
      );
    }

    // 应用分页
    const offset = filter.offset || 0;
    const limit = filter.limit || results.length;
    results = results.slice(offset, offset + limit);

    return results;
  }

  /**
   * 获取指定 ID 的历史记录
   */
  public getById(id: string): HistoryEntry | undefined {
    return this.history.find((entry) => entry.id === id);
  }

  /**
   * 获取最近的历史记录
   * 
   * @param limit 数量限制
   */
  public getRecent(limit: number = 10): HistoryEntry[] {
    return this.history.slice(0, limit);
  }

  /**
   * 获取失败的记录
   */
  public getFailed(limit: number = 50): HistoryEntry[] {
    return this.query({ success: false, limit });
  }

  /**
   * 删除指定历史记录
   */
  public delete(id: string): boolean {
    const index = this.history.findIndex((entry) => entry.id === id);
    
    if (index > -1) {
      this.history.splice(index, 1);
      
      if (this.autoSave) {
        this.saveToStorage().catch((error) => {
          console.error('[OpenCLIHistory] Failed to save history:', error);
        });
      }
      
      return true;
    }

    return false;
  }

  /**
   * 清空历史记录
   */
  public clear(): void {
    this.history = [];
    
    if (this.autoSave) {
      this.saveToStorage().catch((error) => {
        console.error('[OpenCLIHistory] Failed to clear history:', error);
      });
    }
  }

  /**
   * 获取统计信息
   */
  public getStats(timeRange?: { start?: number; end?: number }): HistoryStats {
    let entries = [...this.history];

    // 时间范围过滤
    if (timeRange) {
      if (timeRange.start) {
        entries = entries.filter((e) => e.timestamp >= timeRange.start!);
      }
      if (timeRange.end) {
        entries = entries.filter((e) => e.timestamp <= timeRange.end!);
      }
    }

    const totalCommands = entries.length;
    const successfulCommands = entries.filter((e) => e.result.success).length;
    const failedCommands = totalCommands - successfulCommands;
    const successRate = totalCommands > 0 ? (successfulCommands / totalCommands) * 100 : 0;

    // 计算平均耗时
    const totalDuration = entries.reduce((sum, e) => sum + e.duration, 0);
    const averageDuration = totalCommands > 0 ? totalDuration / totalCommands : 0;

    // 统计最常用的命令
    const commandCount = new Map<string, number>();
    entries.forEach((e) => {
      commandCount.set(e.command, (commandCount.get(e.command) || 0) + 1);
    });

    const mostUsedCommands = Array.from(commandCount.entries())
      .map(([command, count]) => ({ command, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    // 按小时统计
    const hourCount = new Array(24).fill(0);
    entries.forEach((e) => {
      const hour = new Date(e.timestamp).getHours();
      hourCount[hour]++;
    });

    const commandsByHour = hourCount.map((count, hour) => ({ hour, count }));

    return {
      totalCommands,
      successfulCommands,
      failedCommands,
      successRate,
      averageDuration,
      mostUsedCommands,
      commandsByHour,
      recentActivity: this.getRecent(20),
    };
  }

  /**
   * 为历史记录添加标签
   */
  public addTags(id: string, tags: string[]): boolean {
    const entry = this.getById(id);
    
    if (entry) {
      if (!entry.tags) {
        entry.tags = [];
      }
      tags.forEach((tag) => {
        if (!entry.tags!.includes(tag)) {
          entry.tags!.push(tag);
        }
      });
      
      if (this.autoSave) {
        this.saveToStorage().catch((error) => {
          console.error('[OpenCLIHistory] Failed to save tags:', error);
        });
      }
      
      return true;
    }

    return false;
  }

  /**
   * 为历史记录添加备注
   */
  public addNotes(id: string, notes: string): boolean {
    const entry = this.getById(id);
    
    if (entry) {
      entry.notes = notes;
      
      if (this.autoSave) {
        this.saveToStorage().catch((error) => {
          console.error('[OpenCLIHistory] Failed to save notes:', error);
        });
      }
      
      return true;
    }

    return false;
  }

  /**
   * 导出历史记录
   * 
   * @param format 导出格式 ('json' | 'csv')
   * @returns 导出的数据
   */
  public export(format: 'json' | 'csv' = 'json'): string {
    if (format === 'json') {
      return JSON.stringify(this.history, null, 2);
    } else if (format === 'csv') {
      const headers = ['id', 'timestamp', 'command', 'args', 'success', 'duration', 'url'];
      const rows = this.history.map((entry) => [
        entry.id,
        new Date(entry.timestamp).toISOString(),
        entry.command,
        JSON.stringify(entry.args),
        entry.result.success ? 'true' : 'false',
        entry.duration.toString(),
        entry.url || '',
      ]);

      return [headers.join(','), ...rows.map((row) => row.join(','))].join('\n');
    }

    throw new Error(`不支持的导出格式：${format}`);
  }

  /**
   * 导入历史记录
   * 
   * @param data 导入的数据
   * @param format 数据格式 ('json' | 'csv')
   */
  public import(data: string, format: 'json' | 'csv' = 'json'): void {
    try {
      if (format === 'json') {
        const imported = JSON.parse(data) as HistoryEntry[];
        this.history = [...imported, ...this.history];
      } else if (format === 'csv') {
        // CSV 解析 (简化版)
        const lines = data.split('\n');
        const headers = lines[0].split(',');
        
        for (let i = 1; i < lines.length; i++) {
          const values = lines[i].split(',');
          const entry: any = {};
          
          headers.forEach((header, index) => {
            entry[header.trim()] = values[index]?.trim();
          });
          
          if (entry.id) {
            this.history.push({
              ...entry,
              timestamp: parseInt(entry.timestamp) || Date.now(),
              args: JSON.parse(entry.args || '{}'),
              result: {
                success: entry.success === 'true',
              },
              duration: parseInt(entry.duration) || 0,
            });
          }
        }
      }

      if (this.autoSave) {
        this.saveToStorage().catch((error) => {
          console.error('[OpenCLIHistory] Failed to save imported history:', error);
        });
      }
    } catch (error) {
      throw new Error(`导入失败：${error instanceof Error ? error.message : '未知错误'}`);
    }
  }

  /**
   * 保存到本地存储
   */
  private async saveToStorage(): Promise<void> {
    if (typeof chrome !== 'undefined' && chrome.storage) {
      await chrome.storage.local.set({ [this.storageKey]: this.history });
    } else {
      // 浏览器环境降级处理
      try {
        localStorage.setItem(this.storageKey, JSON.stringify(this.history));
      } catch (error) {
        console.warn('[OpenCLIHistory] Storage not available');
      }
    }
  }

  /**
   * 从本地存储加载
   */
  private async loadFromStorage(): Promise<void> {
    try {
      if (typeof chrome !== 'undefined' && chrome.storage) {
        const result = await chrome.storage.local.get(this.storageKey);
        if (result[this.storageKey]) {
          this.history = result[this.storageKey];
        }
      } else {
        // 浏览器环境降级处理
        const stored = localStorage.getItem(this.storageKey);
        if (stored) {
          this.history = JSON.parse(stored);
        }
      }
    } catch (error) {
      console.error('[OpenCLIHistory] Failed to load from storage:', error);
      this.history = [];
    }
  }

  /**
   * 设置最大历史记录长度
   */
  public setMaxHistoryLength(length: number): void {
    this.maxHistoryLength = length;
    
    // 如果当前记录超过新限制，截断
    if (this.history.length > length) {
      this.history = this.history.slice(0, length);
      this.saveToStorage().catch((error) => {
        console.error('[OpenCLIHistory] Failed to trim history:', error);
      });
    }
  }

  /**
   * 启用/禁用自动保存
   */
  public setAutoSave(enabled: boolean): void {
    this.autoSave = enabled;
  }

  /**
   * 获取历史记录数量
   */
  public getCount(): number {
    return this.history.length;
  }

  /**
   * 清除存储中的历史记录
   */
  public async clearStorage(): Promise<void> {
    if (typeof chrome !== 'undefined' && chrome.storage) {
      await chrome.storage.local.remove(this.storageKey);
    } else {
      localStorage.removeItem(this.storageKey);
    }
    this.history = [];
  }
}

// 导出单例实例
export const openCLIHistory = OpenCLIHistoryManager.getInstance();
