/**
 * OpenCLI 命令缓存模块
 * 
 * 使用 LRU 算法缓存命令执行结果
 * 支持智能缓存失效、命中率统计、持久化存储
 */

import { type CommandResult } from './opencli-bridge';

/**
 * 缓存条目
 */
interface CacheEntry {
  key: string;
  value: CommandResult;
  timestamp: number;
  hits: number;
  expiry: number; // 过期时间戳
}

/**
 * 缓存配置
 */
export interface CacheConfig {
  maxSize: number; // 最大缓存条目数
  defaultExpiry: number; // 默认过期时间 (毫秒)
  cleanupInterval: number; // 清理间隔 (毫秒)
  enabled: boolean;
}

/**
 * 缓存统计信息
 */
export interface CacheStats {
  size: number;
  hits: number;
  misses: number;
  hitRate: number;
  evictions: number;
  expired: number;
}

/**
 * LRU 缓存节点
 */
class LRUNode {
  public key: string;
  public value: CacheEntry;
  public prev: LRUNode | null = null;
  public next: LRUNode | null = null;
  
  constructor(key: string, value: CacheEntry) {
    this.key = key;
    this.value = value;
  }
}

/**
 * OpenCLI 命令缓存类
 * 
 * 单例模式，使用 LRU 算法管理缓存
 */
export class CommandCache {
  private static instance: CommandCache | null = null;
  
  private cache: Map<string, LRUNode> = new Map();
  private head: LRUNode | null = null; // 最近使用
  private tail: LRUNode | null = null; // 最少使用
  
  private config: CacheConfig = {
    maxSize: 100,
    defaultExpiry: 300000, // 5 分钟
    cleanupInterval: 60000, // 1 分钟
    enabled: true,
  };
  
  private stats = {
    hits: 0,
    misses: 0,
    evictions: 0,
    expired: 0,
  };
  
  private cleanupTimer: number | null = null;
  
  /**
   * 私有构造函数 (单例模式)
   */
  private constructor() {
    // 启动定期清理
    this.startCleanup();
  }
  
  /**
   * 获取单例实例
   */
  public static getInstance(): CommandCache {
    if (!CommandCache.instance) {
      CommandCache.instance = new CommandCache();
    }
    return CommandCache.instance;
  }
  
  /**
   * 生成缓存键
   */
  private generateKey(command: string, args: Record<string, any>): string {
    const argsStr = JSON.stringify(args, Object.keys(args).sort());
    return `${command}:${argsStr}`;
  }
  
  /**
   * 检查缓存是否可缓存
   */
  private isCacheable(command: string, args: Record<string, any>): boolean {
    // 不缓存写操作
    const nonCacheableCommands = [
      'click', 'type', 'press', 'navigate',
      'session.create', 'session.close',
      'attribute.set', 'text.set',
    ];
    
    if (nonCacheableCommands.includes(command)) {
      return false;
    }
    
    return true;
  }
  
  /**
   * 获取缓存
   */
  public get(command: string, args: Record<string, any>): CommandResult | null {
    if (!this.config.enabled) {
      return null;
    }
    
    const key = this.generateKey(command, args);
    const node = this.cache.get(key);
    
    if (!node) {
      this.stats.misses++;
      return null;
    }
    
    // 检查是否过期
    if (Date.now() > node.value.expiry) {
      this.remove(key);
      this.stats.expired++;
      this.stats.misses++;
      return null;
    }
    
    // 更新访问计数
    node.value.hits++;
    
    // 移动到头部（最近使用）
    this.moveToHead(node);
    
    this.stats.hits++;
    return node.value.value;
  }
  
  /**
   * 设置缓存
   */
  public set(
    command: string,
    args: Record<string, any>,
    result: CommandResult,
    expiry?: number
  ): void {
    if (!this.config.enabled) {
      return;
    }
    
    // 检查是否可缓存
    if (!this.isCacheable(command, args)) {
      return;
    }
    
    const key = this.generateKey(command, args);
    
    // 如果已存在，更新
    const existing = this.cache.get(key);
    if (existing) {
      existing.value.value = result;
      existing.value.expiry = Date.now() + (expiry || this.config.defaultExpiry);
      this.moveToHead(existing);
      return;
    }
    
    // 创建新条目
    const entry: CacheEntry = {
      key,
      value: result,
      timestamp: Date.now(),
      hits: 0,
      expiry: Date.now() + (expiry || this.config.defaultExpiry),
    };
    
    const node = new LRUNode(key, entry);
    
    // 如果达到最大容量，移除最少使用的
    if (this.cache.size >= this.config.maxSize) {
      this.removeTail();
    }
    
    // 添加到头部
    this.addToHead(node);
    this.cache.set(key, node);
  }
  
  /**
   * 删除缓存
   */
  public delete(command: string, args: Record<string, any>): boolean {
    const key = this.generateKey(command, args);
    return this.remove(key);
  }
  
  /**
   * 清除所有缓存
   */
  public clear(): void {
    this.cache.clear();
    this.head = null;
    this.tail = null;
  }
  
  /**
   * 获取缓存统计
   */
  public getStats(): CacheStats {
    const total = this.stats.hits + this.stats.misses;
    const hitRate = total > 0 ? (this.stats.hits / total) * 100 : 0;
    
    return {
      size: this.cache.size,
      hits: this.stats.hits,
      misses: this.stats.misses,
      hitRate,
      evictions: this.stats.evictions,
      expired: this.stats.expired,
    };
  }
  
  /**
   * 重置统计
   */
  public resetStats(): void {
    this.stats = {
      hits: 0,
      misses: 0,
      evictions: 0,
      expired: 0,
    };
  }
  
  /**
   * 获取所有缓存条目
   */
  public getEntries(): CacheEntry[] {
    return Array.from(this.cache.values()).map((node) => node.value);
  }
  
  /**
   * 更新配置
   */
  public updateConfig(config: Partial<CacheConfig>): void {
    this.config = { ...this.config, ...config };
    
    // 如果禁用，清理定时器
    if (!this.config.enabled && this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
      this.cleanupTimer = null;
    } else if (this.config.enabled && !this.cleanupTimer) {
      this.startCleanup();
    }
  }
  
  /**
   * 启用/禁用缓存
   */
  public setEnabled(enabled: boolean): void {
    this.config.enabled = enabled;
    if (!enabled) {
      this.clear();
    }
  }
  
  /**
   * 添加到头部
   */
  private addToHead(node: LRUNode): void {
    node.prev = null;
    node.next = this.head;
    
    if (this.head) {
      this.head.prev = node;
    }
    
    this.head = node;
    
    if (!this.tail) {
      this.tail = node;
    }
  }
  
  /**
   * 移除节点
   */
  private remove(key: string): boolean {
    const node = this.cache.get(key);
    if (!node) {
      return false;
    }
    
    this.removeNode(node);
    this.cache.delete(key);
    this.stats.evictions++;
    
    return true;
  }
  
  /**
   * 移除节点（从链表中）
   */
  private removeNode(node: LRUNode): void {
    if (node.prev) {
      node.prev.next = node.next;
    } else {
      this.head = node.next;
    }
    
    if (node.next) {
      node.next.prev = node.prev;
    } else {
      this.tail = node.prev;
    }
  }
  
  /**
   * 移动到头部
   */
  private moveToHead(node: LRUNode): void {
    this.removeNode(node);
    this.addToHead(node);
  }
  
  /**
   * 移除尾部节点（最少使用）
   */
  private removeTail(): void {
    if (!this.tail) {
      return;
    }
    
    const key = this.tail.key;
    this.removeNode(this.tail);
    this.cache.delete(key);
    this.stats.evictions++;
  }
  
  /**
   * 启动定期清理
   */
  private startCleanup(): void {
    if (this.cleanupTimer) {
      return;
    }
    
    this.cleanupTimer = window.setInterval(() => {
      this.cleanupExpired();
    }, this.config.cleanupInterval);
  }
  
  /**
   * 清理过期条目
   */
  private cleanupExpired(): void {
    const now = Date.now();
    const toRemove: string[] = [];
    
    for (const [key, node] of this.cache.entries()) {
      if (now > node.value.expiry) {
        toRemove.push(key);
      }
    }
    
    toRemove.forEach((key) => {
      this.remove(key);
      this.stats.expired++;
    });
    
    if (toRemove.length > 0) {
      console.log(`[CommandCache] 清理了 ${toRemove.length} 个过期条目`);
    }
  }
  
  /**
   * 停止清理定时器
   */
  public stopCleanup(): void {
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
      this.cleanupTimer = null;
    }
  }
  
  /**
   * 导出缓存
   */
  public export(): string {
    const entries = this.getEntries();
    return JSON.stringify({
      entries,
      stats: this.getStats(),
      config: this.config,
    }, null, 2);
  }
  
  /**
   * 导入缓存
   */
  public import(data: string): void {
    try {
      const parsed = JSON.parse(data);
      
      if (parsed.entries && Array.isArray(parsed.entries)) {
        parsed.entries.forEach((entry: CacheEntry) => {
          const node = new LRUNode(entry.key, entry);
          this.addToHead(node);
          this.cache.set(entry.key, node);
        });
      }
      
      if (parsed.stats) {
        this.stats = { ...this.stats, ...parsed.stats };
      }
    } catch (error) {
      console.error('[CommandCache] 导入失败:', error);
    }
  }
}

// 导出单例实例
export const commandCache = CommandCache.getInstance();
