// 缓存管理模块

import { DocumentParseResult } from '../types/document';
import { logger } from './logger';

/**
 * 缓存项
 */
export interface CacheItem<T = any> {
  key: string;
  value: T;
  timestamp: number;
  expiry: number;
}

/**
 * 缓存配置
 */
export interface CacheConfig {
  maxSize: number; // 最大缓存项数量
  defaultExpiry: number; // 默认过期时间（毫秒）
  cleanupInterval: number; // 清理间隔（毫秒）
}

/**
 * 缓存管理器
 */
export class CacheManager {
  private cache: Map<string, CacheItem> = new Map();
  private config: CacheConfig;
  private cleanupTimer: ReturnType<typeof setTimeout> | null = null;

  constructor(config?: Partial<CacheConfig>) {
    this.config = {
      maxSize: 50,
      defaultExpiry: 3600000, // 1小时
      cleanupInterval: 600000, // 10分钟
      ...config,
    };

    // 启动定期清理
    this.startCleanupTimer();
    logger.info('CacheManager initialized with config:', this.config);
  }

  /**
   * 启动清理定时器
   */
  private startCleanupTimer(): void {
    this.cleanupTimer = setInterval(() => {
      this.cleanup();
    }, this.config.cleanupInterval);
  }

  /**
   * 停止清理定时器
   */
  stop(): void {
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
      this.cleanupTimer = null;
    }
  }

  /**
   * 生成缓存键
   */
  generateKey(file: File | string | ArrayBuffer): string {
    if (file instanceof File) {
      return `${file.name}-${file.size}-${file.lastModified}`;
    } else if (typeof file === 'string') {
      return file;
    } else {
      // 对于 ArrayBuffer，计算简单的哈希值
      const hash = this.calculateHash(file);
      return `buffer-${hash}`;
    }
  }

  /**
   * 计算 ArrayBuffer 的哈希值
   */
  private calculateHash(buffer: ArrayBuffer): string {
    const view = new Uint8Array(buffer);
    let hash = 0;
    for (let i = 0; i < view.length; i++) {
      hash = ((hash << 5) - hash) + view[i];
      hash = hash & hash; // 转换为 32 位整数
    }
    return hash.toString(16);
  }

  /**
   * 设置缓存
   */
  set<T = any>(key: string, value: T, expiry?: number): void {
    const now = Date.now();
    const item: CacheItem<T> = {
      key,
      value,
      timestamp: now,
      expiry: expiry || this.config.defaultExpiry,
    };

    // 检查缓存大小
    if (this.cache.size >= this.config.maxSize) {
      this.evictOldest();
    }

    this.cache.set(key, item as CacheItem);
    logger.debug(`Cache set: ${key}`);
  }

  /**
   * 获取缓存
   */
  get<T = any>(key: string): T | null {
    const item = this.cache.get(key);
    if (!item) {
      return null;
    }

    // 检查是否过期
    const now = Date.now();
    if (now - item.timestamp > item.expiry) {
      this.cache.delete(key);
      logger.debug(`Cache expired: ${key}`);
      return null;
    }

    logger.debug(`Cache hit: ${key}`);
    return item.value as T;
  }

  /**
   * 删除缓存
   */
  delete(key: string): void {
    this.cache.delete(key);
    logger.debug(`Cache deleted: ${key}`);
  }

  /**
   * 清空缓存
   */
  clear(): void {
    this.cache.clear();
    logger.debug('Cache cleared');
  }

  /**
   * 获取缓存大小
   */
  size(): number {
    return this.cache.size;
  }

  /**
   * 清理过期项
   */
  cleanup(): void {
    const now = Date.now();
    let deleted = 0;

    this.cache.forEach((item, key) => {
      if (now - item.timestamp > item.expiry) {
        this.cache.delete(key);
        deleted++;
      }
    });

    if (deleted > 0) {
      logger.debug(`Cache cleanup: deleted ${deleted} items`);
    }
  }

  /**
   * 移除最旧的项
   */
  private evictOldest(): void {
    let oldestKey: string | null = null;
    let oldestTimestamp = Infinity;

    this.cache.forEach((item, key) => {
      if (item.timestamp < oldestTimestamp) {
        oldestTimestamp = item.timestamp;
        oldestKey = key;
      }
    });

    if (oldestKey) {
      this.cache.delete(oldestKey);
      logger.debug(`Cache evicted oldest: ${oldestKey}`);
    }
  }
}

/**
 * 全局缓存管理器实例
 */
export const cacheManager = new CacheManager();

export default CacheManager;
