/**
 * 多模型缓存管理器
 * 支持请求缓存、响应缓存、相似问题缓存
 */

import type { ChatRequest, ChatResponse } from './types/multi-model';

/**
 * 缓存配置
 */
export interface CacheConfig {
  /** 是否启用 */
  enabled?: boolean;
  /** 缓存 TTL (毫秒) */
  ttl?: number;
  /** 最大缓存条目数 */
  maxEntries?: number;
  /** 相似度阈值 (0-1) */
  similarityThreshold?: number;
}

/**
 * 缓存条目
 */
interface CacheEntry<T> {
  key: string;
  value: T;
  timestamp: number;
  ttl: number;
  hits: number;
}

/**
 * 相似缓存条目
 */
interface SimilarityEntry {
  request: string;
  response: string;
  timestamp: number;
  similarity: number;
}

/**
 * 缓存管理器
 */
export class ModelCacheManager {
  private requestCache: Map<string, CacheEntry<ChatResponse>> = new Map();
  private similarityCache: SimilarityEntry[] = [];
  private config: Required<CacheConfig>;
  private stats = {
    hits: 0,
    misses: 0,
    similarityHits: 0,
  };

  constructor(config: CacheConfig = {}) {
    this.config = {
      enabled: config.enabled ?? true,
      ttl: config.ttl ?? 3600000, // 1小时
      maxEntries: config.maxEntries ?? 1000,
      similarityThreshold: config.similarityThreshold ?? 0.85,
    };
  }

  /**
   * 生成缓存键
   */
  generateCacheKey(request: ChatRequest): string {
    const parts = [
      request.model || 'default',
      JSON.stringify(request.messages),
      String(request.temperature ?? 0.7),
      String(request.maxTokens ?? 0),
    ];
    return this.hashString(parts.join('|'));
  }

  /**
   * 简单哈希
   */
  private hashString(str: string): string {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }
    return Math.abs(hash).toString(36);
  }

  /**
   * 获取缓存
   */
  get(request: ChatRequest): ChatResponse | null {
    if (!this.config.enabled) return null;

    const key = this.generateCacheKey(request);
    const entry = this.requestCache.get(key);

    if (!entry) return null;

    // 检查过期
    if (Date.now() - entry.timestamp > entry.ttl) {
      this.requestCache.delete(key);
      this.stats.misses++;
      return null;
    }

    // 增加命中次数
    entry.hits++;
    this.stats.hits++;

    return entry.value;
  }

  /**
   * 设置缓存
   */
  set(request: ChatRequest, response: ChatResponse, ttl?: number): void {
    if (!this.config.enabled) return;

    const key = this.generateCacheKey(request);

    // LRU 淘汰
    if (this.requestCache.size >= this.config.maxEntries && !this.requestCache.has(key)) {
      this.evictLRU();
    }

    this.requestCache.set(key, {
      key,
      value: response,
      timestamp: Date.now(),
      ttl: ttl ?? this.config.ttl,
      hits: 0,
    });

    // 同时添加到相似度缓存
    this.addSimilarityCache(request, response);
  }

  /**
   * 添加到相似度缓存
   */
  private addSimilarityCache(request: ChatRequest, response: ChatResponse): void {
    const requestText = request.messages.map(m => m.content).join(' ');

    this.similarityCache.push({
      request: requestText,
      response: typeof response.message?.content === 'string' ? response.message.content : response.content ?? '',
      timestamp: Date.now(),
      similarity: 1.0,
    });

    // 限制相似缓存大小
    if (this.similarityCache.length > this.config.maxEntries) {
      this.similarityCache.shift();
    }
  }

  /**
   * 查找相似缓存
   */
  findSimilar(request: ChatRequest): { response: string; similarity: number } | null {
    if (!this.config.enabled || this.similarityCache.length === 0) return null;

    const requestText = request.messages.map(m => m.content).join(' ');
    let bestMatch: SimilarityEntry | null = null;
    let bestSimilarity = 0;

    for (const entry of this.similarityCache) {
      // 检查过期
      if (Date.now() - entry.timestamp > this.config.ttl) continue;

      const similarity = this.calculateSimilarity(requestText, entry.request);

      if (similarity > bestSimilarity && similarity >= this.config.similarityThreshold) {
        bestSimilarity = similarity;
        bestMatch = entry;
      }
    }

    if (bestMatch) {
      this.stats.similarityHits++;
      return {
        response: bestMatch.response,
        similarity: bestSimilarity,
      };
    }

    return null;
  }

  /**
   * 计算文本相似度 (Jaccard 相似度)
   */
  private calculateSimilarity(text1: string, text2: string): number {
    const words1 = new Set(text1.toLowerCase().split(/\s+/));
    const words2 = new Set(text2.toLowerCase().split(/\s+/));

    const intersection = new Set([...words1].filter(x => words2.has(x)));
    const union = new Set([...words1, ...words2]);

    return intersection.size / union.size;
  }

  /**
   * LRU 淘汰
   */
  private evictLRU(): void {
    let oldest: string | null = null;
    let oldestTime = Infinity;

    for (const [key, entry] of this.requestCache.entries()) {
      if (entry.timestamp < oldestTime) {
        oldestTime = entry.timestamp;
        oldest = key;
      }
    }

    if (oldest) {
      this.requestCache.delete(oldest);
    }
  }

  /**
   * 清除所有缓存
   */
  clear(): void {
    this.requestCache.clear();
    this.similarityCache = [];
  }

  /**
   * 清除过期缓存
   */
  clearExpired(): number {
    const now = Date.now();
    let count = 0;

    // 清除过期请求缓存
    for (const [key, entry] of this.requestCache.entries()) {
      if (now - entry.timestamp > entry.ttl) {
        this.requestCache.delete(key);
        count++;
      }
    }

    // 清除过期相似缓存
    this.similarityCache = this.similarityCache.filter(
      entry => now - entry.timestamp <= this.config.ttl
    );

    return count;
  }

  /**
   * 获取统计
   */
  getStats(): {
    size: number;
    hits: number;
    misses: number;
    similarityHits: number;
    hitRate: number;
  } {
    const total = this.stats.hits + this.stats.misses;
    return {
      size: this.requestCache.size,
      hits: this.stats.hits,
      misses: this.stats.misses,
      similarityHits: this.stats.similarityHits,
      hitRate: total > 0 ? this.stats.hits / total : 0,
    };
  }

  /**
   * 更新配置
   */
  updateConfig(config: Partial<CacheConfig>): void {
    this.config = { ...this.config, ...config };
  }

  /**
   * 序列化缓存 (用于持久化)
   */
  serialize(): string {
    return JSON.stringify({
      cache: Array.from(this.requestCache.entries()),
      similarity: this.similarityCache,
      stats: this.stats,
    });
  }

  /**
   * 反序列化缓存
   */
  deserialize(data: string): void {
    try {
      const parsed = JSON.parse(data);
      this.requestCache = new Map(parsed.cache || []);
      this.similarityCache = parsed.similarity || [];
      this.stats = { ...this.stats, ...parsed.stats };
    } catch (e) {
      console.error('Failed to deserialize cache:', e);
    }
  }
}

// 全局缓存实例
let globalCache: ModelCacheManager | null = null;

export function getModelCache(): ModelCacheManager {
  if (!globalCache) {
    globalCache = new ModelCacheManager();
  }
  return globalCache;
}

export function createModelCache(config?: CacheConfig): ModelCacheManager {
  globalCache = new ModelCacheManager(config);
  return globalCache;
}

export default ModelCacheManager;
