/**
 * 多模型适配层 - 增强缓存系统
 * 支持 LRU/LFU 淘汰策略、持久化缓存、分布式缓存
 */

import type { ChatRequest, ChatResponse } from './types/multi-model';

// =============================================
// LRU/LFU 缓存实现
// =============================================

/** 缓存条目 */
interface CacheEntry<T> {
  key: string;
  value: T;
  accessCount: number;
  lastAccess: number;
  createdAt: number;
  expiresAt?: number;
  size?: number;
}

/** 缓存淘汰策略 */
export type EvictionPolicy = 'lru' | 'lfu' | 'fifo' | 'lifespan';

/** 缓存配置 */
export interface EnhancedCacheConfig {
  /** 最大条目数 */
  maxEntries: number;
  /** 最大内存 (bytes) */
  maxMemory?: number;
  /** 淘汰策略 */
  evictionPolicy: EvictionPolicy;
  /** TTL (ms) */
  ttl?: number;
  /** 持久化存储 (localStorage/IndexedDB/file) */
  persistence?: 'localStorage' | 'IndexedDB' | 'file' | 'none';
  /** 持久化路径 (用于 file 模式) */
  persistencePath?: string;
  /** 相似度缓存启用 */
  similarityCache?: boolean;
  /** 相似度阈值 (0-1) */
  similarityThreshold?: number;
  /** 压缩缓存 */
  compress?: boolean;
}

/** 缓存统计 */
export interface CacheStats {
  hits: number;
  misses: number;
  evictions: number;
  size: number;
  memoryUsage: number;
  hitRate: number;
}

export class EnhancedCacheManager<T = ChatResponse> {
  private cache: Map<string, CacheEntry<T>> = new Map();
  private config: Required<EnhancedCacheConfig>;
  private stats: CacheStats = {
    hits: 0,
    misses: 0,
    evictions: 0,
    size: 0,
    memoryUsage: 0,
    hitRate: 0,
  };
  private persistenceKey = 'mllm-cache-v2';
  private persistInterval?: ReturnType<typeof setInterval>;

  constructor(config: EnhancedCacheConfig) {
    this.config = {
      maxMemory: config.maxMemory ?? 100 * 1024 * 1024, // 100MB
      ttl: config.ttl ?? 3600000, // 1小时
      persistence: config.persistence ?? 'none',
      persistencePath: config.persistencePath ?? '',
      similarityCache: config.similarityCache ?? false,
      similarityThreshold: config.similarityThreshold ?? 0.85,
      compress: config.compress ?? false,
      ...config,
    };

    this.loadFromPersistence();
    this.startPersistenceInterval();
  }

  /** 获取缓存 */
  async get(key: string): Promise<T | null> {
    const entry = this.cache.get(key);

    if (!entry) {
      this.stats.misses++;
      this.updateHitRate();
      return null;
    }

    // 检查过期
    if (entry.expiresAt && Date.now() > entry.expiresAt) {
      this.delete(key);
      this.stats.misses++;
      this.updateHitRate();
      return null;
    }

    // 更新访问信息
    entry.accessCount++;
    entry.lastAccess = Date.now();

    this.stats.hits++;
    this.updateHitRate();
    return entry.value;
  }

  /** 设置缓存 */
  async set(key: string, value: T, ttl?: number): Promise<void> {
    // 计算大小
    const size = this.estimateSize(value);

    // 检查是否需要淘汰
    while (this.shouldEvict(size)) {
      this.evictOne();
    }

    const entry: CacheEntry<T> = {
      key,
      value,
      accessCount: 1,
      lastAccess: Date.now(),
      createdAt: Date.now(),
      expiresAt: ttl ? Date.now() + ttl : Date.now() + this.config.ttl,
      size,
    };

    this.cache.set(key, entry);
    this.stats.memoryUsage += size;
    this.stats.size = this.cache.size;

    // 异步保存
    this.schedulePersistence();
  }

  /** 删除缓存 */
  async delete(key: string): Promise<boolean> {
    const entry = this.cache.get(key);
    if (entry) {
      this.stats.memoryUsage -= entry.size ?? 0;
      this.cache.delete(key);
      this.stats.size = this.cache.size;
      this.schedulePersistence();
      return true;
    }
    return false;
  }

  /** 清空缓存 */
  async clear(): Promise<void> {
    this.cache.clear();
    this.stats.memoryUsage = 0;
    this.stats.size = 0;
    this.clearPersistence();
  }

  /** 检查是否存在 */
  async has(key: string): Promise<boolean> {
    const entry = this.cache.get(key);
    if (!entry) return false;

    if (entry.expiresAt && Date.now() > entry.expiresAt) {
      this.delete(key);
      return false;
    }

    return true;
  }

  /** 获取统计 */
  getStats(): CacheStats {
    return { ...this.stats };
  }

  /** 获取所有键 */
  async keys(): Promise<string[]> {
    return Array.from(this.cache.keys());
  }

  /** 批量获取 */
  async getMany(keys: string[]): Promise<Map<string, T | null>> {
    const result = new Map<string, T | null>();
    for (const key of keys) {
      result.set(key, await this.get(key));
    }
    return result;
  }

  /** 批量设置 */
  async setMany(entries: Array<[string, T]>, ttl?: number): Promise<void> {
    for (const [key, value] of entries) {
      await this.set(key, value, ttl);
    }
  }

  /** 相似问题查找 */
  async findSimilar(
    query: string,
    threshold?: number
  ): Promise<Array<{ key: string; value: T; similarity: number }>> {
    if (!this.config.similarityCache) {
      return [];
    }

    const thresholdVal = threshold ?? this.config.similarityThreshold;
    const results: Array<{ key: string; value: T; similarity: number }> = [];

    for (const [key, entry] of this.cache.entries()) {
      if (entry.expiresAt && Date.now() > entry.expiresAt) {
        continue;
      }

      const valueStr = typeof entry.value === 'string'
        ? entry.value
        : JSON.stringify(entry.value);

      const similarity = this.calculateSimilarity(query, valueStr);
      if (similarity >= thresholdVal) {
        results.push({
          key,
          value: entry.value,
          similarity,
        });
      }
    }

    // 按相似度排序
    results.sort((a, b) => b.similarity - a.similarity);

    return results.slice(0, 10);
  }

  /** 计算相似度 (Jaccard) */
  private calculateSimilarity(str1: string, str2: string): number {
    const tokens1 = new Set(this.tokenize(str1));
    const tokens2 = new Set(this.tokenize(str2));

    const intersection = new Set([...tokens1].filter((x) => tokens2.has(x)));
    const union = new Set([...tokens1, ...tokens2]);

    return union.size > 0 ? intersection.size / union.size : 0;
  }

  /** 分词 */
  private tokenize(text: string): string[] {
    return text
      .toLowerCase()
      .replace(/[^\w\s]/g, ' ')
      .split(/\s+/)
      .filter((t) => t.length > 2);
  }

  /** 是否应该淘汰 */
  private shouldEvict(additionalSize = 0): boolean {
    if (this.cache.size >= this.config.maxEntries) {
      return true;
    }

    if (
      this.config.maxMemory &&
      this.stats.memoryUsage + additionalSize > this.config.maxMemory
    ) {
      return true;
    }

    return false;
  }

  /** 淘汰一个条目 */
  private evictOne(): void {
    if (this.cache.size === 0) return;

    let keyToEvict: string | null = null;

    switch (this.config.evictionPolicy) {
      case 'lru':
        // 找到最久未访问的
        let oldest = Infinity;
        for (const [key, entry] of this.cache.entries()) {
          if (entry.lastAccess < oldest) {
            oldest = entry.lastAccess;
            keyToEvict = key;
          }
        }
        break;

      case 'lfu':
        // 找到访问次数最少的
        let minCount = Infinity;
        for (const [key, entry] of this.cache.entries()) {
          if (entry.accessCount < minCount) {
            minCount = entry.accessCount;
            keyToEvict = key;
          }
        }
        break;

      case 'fifo':
        // 找到最早创建的
        let earliest = Infinity;
        for (const [key, entry] of this.cache.entries()) {
          if (entry.createdAt < earliest) {
            earliest = entry.createdAt;
            keyToEvict = key;
          }
        }
        break;

      case 'lifespan':
        // 优先淘汰快过期的
        let earliestExpiry = Infinity;
        for (const [key, entry] of this.cache.entries()) {
          const expiry = entry.expiresAt ?? Infinity;
          if (expiry < earliestExpiry) {
            earliestExpiry = expiry;
            keyToEvict = key;
          }
        }
        break;
    }

    if (keyToEvict) {
      this.delete(keyToEvict);
      this.stats.evictions++;
    }
  }

  /** 估算大小 */
  private estimateSize(value: T): number {
    const str = typeof value === 'string' ? value : JSON.stringify(value);
    return new Blob([str]).size;
  }

  /** 更新命中率 */
  private updateHitRate(): void {
    const total = this.stats.hits + this.stats.misses;
    this.stats.hitRate = total > 0 ? this.stats.hits / total : 0;
  }

  /** 加载持久化数据 */
  private loadFromPersistence(): void {
    if (this.config.persistence === 'none') return;

    try {
      if (typeof window !== 'undefined' && this.config.persistence === 'localStorage') {
        const data = localStorage.getItem(this.persistenceKey);
        if (data) {
          const parsed = JSON.parse(data);
          this.cache = new Map(parsed.cache);
          this.stats = parsed.stats;
        }
      }
      // 其他持久化方式需要额外实现
    } catch (error) {
      console.error('Failed to load cache from persistence:', error);
    }
  }

  /** 调度持久化保存 */
  private schedulePersistence(): void {
    // 防抖: 延迟保存
    if (this.persistTimeout) {
      clearTimeout(this.persistTimeout);
    }
    this.persistTimeout = setTimeout(() => {
      this.saveToPersistence();
    }, 1000);
  }

  private persistTimeout?: ReturnType<typeof setTimeout>;

  /** 保存到持久化存储 */
  private saveToPersistence(): void {
    if (this.config.persistence === 'none') return;

    try {
      const data = JSON.stringify({
        cache: Array.from(this.cache.entries()),
        stats: this.stats,
      });

      if (typeof window !== 'undefined' && this.config.persistence === 'localStorage') {
        localStorage.setItem(this.persistenceKey, data);
      }
    } catch (error) {
      console.error('Failed to save cache to persistence:', error);
    }
  }

  /** 清空持久化 */
  private clearPersistence(): void {
    if (this.config.persistence === 'none') return;

    try {
      if (typeof window !== 'undefined' && this.config.persistence === 'localStorage') {
        localStorage.removeItem(this.persistenceKey);
      }
    } catch (error) {
      console.error('Failed to clear cache persistence:', error);
    }
  }

  /** 启动定期持久化 */
  private startPersistenceInterval(): void {
    if (this.config.persistence === 'none') return;

    this.persistInterval = setInterval(() => {
      this.saveToPersistence();
    }, 60000); // 每分钟保存一次
  }

  /** 销毁 */
  destroy(): void {
    if (this.persistInterval) {
      clearInterval(this.persistInterval);
    }
    if (this.persistTimeout) {
      clearTimeout(this.persistTimeout);
    }
    this.saveToPersistence();
  }
}

// =============================================
// 请求缓存
// =============================================

/** 请求缓存键生成器 */
export function generateRequestKey(
  request: ChatRequest,
  modelId?: string
): string {
  const parts: Record<string, unknown> = {
    model: modelId,
    messages: request.messages.map((m) => ({
      role: m.role,
      content:
        typeof m.content === 'string'
          ? m.content
          : (m.content as Array<{ type: string; text?: string }>).map((p) => p.type === 'text' ? p.text : '').join(''),
    })),
  };

  if (request.temperature !== undefined) {
    parts.temperature = request.temperature;
  }
  if (request.maxTokens !== undefined) {
    parts.maxTokens = request.maxTokens;
  }
  if (request.topP !== undefined) {
    parts.topP = request.topP;
  }

  return hashString(JSON.stringify(parts));
}

/** 简单的字符串哈希 */
function hashString(str: string): string {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return Math.abs(hash).toString(36) + str.length.toString(36);
}

// =============================================
// 响应缓存
// =============================================

export class ResponseCache {
  private cache: EnhancedCacheManager<ChatResponse>;

  constructor(config?: Partial<EnhancedCacheConfig>) {
    this.cache = new EnhancedCacheManager<ChatResponse>({
      maxEntries: config?.maxEntries ?? 1000,
      maxMemory: config?.maxMemory ?? 50 * 1024 * 1024,
      evictionPolicy: config?.evictionPolicy ?? 'lru',
      ttl: config?.ttl ?? 3600000,
      persistence: config?.persistence ?? 'none',
    });
  }

  async get(request: ChatRequest, modelId?: string): Promise<ChatResponse | null> {
    const key = generateRequestKey(request, modelId);
    return this.cache.get(key);
  }

  async set(request: ChatRequest, response: ChatResponse, modelId?: string): Promise<void> {
    const key = generateRequestKey(request, modelId);
    await this.cache.set(key, response);
  }

  async clear(): Promise<void> {
    await this.cache.clear();
  }

  getStats(): CacheStats {
    return this.cache.getStats();
  }
}

// =============================================
// 相似问题缓存
// =============================================

export class SimilarQuestionCache {
  private cache: EnhancedCacheManager<{ response: ChatResponse; query: string }>;

  constructor(config?: Partial<EnhancedCacheConfig>) {
    this.cache = new EnhancedCacheManager<{ response: ChatResponse; query: string }>({
      maxEntries: config?.maxEntries ?? 500,
      maxMemory: config?.maxMemory ?? 20 * 1024 * 1024,
      evictionPolicy: config?.evictionPolicy ?? 'lru',
      ttl: config?.ttl ?? 7200000, // 2小时
      persistence: config?.persistence ?? 'none',
      similarityCache: true,
      similarityThreshold: config?.similarityThreshold ?? 0.85,
    });
  }

  async findSimilarResponse(query: string): Promise<ChatResponse | null> {
    const results = await this.cache.findSimilar(query);
    if (results.length > 0) {
      return results[0].value.response;
    }
    return null;
  }

  async add(query: string, response: ChatResponse): Promise<void> {
    const key = hashString(query);
    await this.cache.set(key, { response, query });
  }

  async clear(): Promise<void> {
    await this.cache.clear();
  }

  getStats(): CacheStats {
    return this.cache.getStats();
  }
}

// =============================================
// 导出工厂函数
// =============================================

/** 创建响应缓存 */
export function createResponseCache(
  config?: Partial<EnhancedCacheConfig>
): ResponseCache {
  return new ResponseCache(config);
}

/** 创建相似问题缓存 */
export function createSimilarQuestionCache(
  config?: Partial<EnhancedCacheConfig>
): SimilarQuestionCache {
  return new SimilarQuestionCache(config);
}

/** 创建增强缓存 */
export function createEnhancedCache<T>(
  config: EnhancedCacheConfig
): EnhancedCacheManager<T> {
  return new EnhancedCacheManager<T>(config);
}

export default EnhancedCacheManager;
