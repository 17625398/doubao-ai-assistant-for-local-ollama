import { logger } from '../utils/logger';
import { eventBus } from '../utils/event-bus';
import { linkMindService, type EmbeddingRequest, type EmbeddingResponse } from './linkmind-service';

export interface EmbeddingServiceConfig {
  model?: string;
  dimensions?: number;
  batchSize?: number;
  cacheEnabled?: boolean;
  cacheTTL?: number;
}

export interface EmbeddingResult {
  vector: number[];
  text: string;
  model: string;
  cached: boolean;
}

export interface SimilarityResult {
  index: number;
  score: number;
  text?: string;
  metadata?: Record<string, any>;
}

export interface BatchEmbedResult {
  results: EmbeddingResult[];
  totalTokens?: number;
  durationMs: number;
}

class EmbeddingCache {
  private cache = new Map<string, { vector: number[]; timestamp: number; model: string }>();
  private ttl: number;

  constructor(ttlMs: number = 30 * 60 * 1000) {
    this.ttl = ttlMs;
    setInterval(() => this.cleanup(), 5 * 60 * 1000);
  }

  private key(text: string, model: string): string {
    return `${model}:${text}`;
  }

  get(text: string, model: string): number[] | null {
    const entry = this.cache.get(this.key(text, model));
    if (!entry) return null;
    if (Date.now() - entry.timestamp > this.ttl) {
      this.cache.delete(this.key(text, model));
      return null;
    }
    return entry.vector;
  }

  set(text: string, model: string, vector: number[]): void {
    this.cache.set(this.key(text, model), { vector, timestamp: Date.now(), model });
  }

  has(text: string, model: string): boolean {
    return this.get(text, model) !== null;
  }

  invalidate(pattern?: string): void {
    if (!pattern) {
      this.cache.clear();
      return;
    }
    for (const key of this.cache.keys()) {
      if (key.includes(pattern)) {
        this.cache.delete(key);
      }
    }
  }

  get size(): number {
    return this.cache.size;
  }

  private cleanup(): void {
    const now = Date.now();
    for (const [key, entry] of this.cache.entries()) {
      if (now - entry.timestamp > this.ttl) {
        this.cache.delete(key);
      }
    }
  }
}

export class EmbeddingService {
  private config: Required<EmbeddingServiceConfig>;
  private cache: EmbeddingCache;
  private static instance: EmbeddingService | null = null;

  constructor(config: EmbeddingServiceConfig = {}) {
    this.config = {
      model: config.model || 'bge-large',
      dimensions: config.dimensions || 1024,
      batchSize: config.batchSize || 100,
      cacheEnabled: config.cacheEnabled ?? true,
      cacheTTL: config.cacheTTL || 30 * 60 * 1000,
    };
    this.cache = new EmbeddingCache(this.config.cacheTTL);
  }

  static getInstance(config?: EmbeddingServiceConfig): EmbeddingService {
    if (!EmbeddingService.instance) {
      EmbeddingService.instance = new EmbeddingService(config);
    }
    return EmbeddingService.instance;
  }

  static resetInstance(): void {
    EmbeddingService.instance = null;
  }

  updateConfig(updates: Partial<EmbeddingServiceConfig>): void {
    this.config = { ...this.config, ...updates };
  }

  async embed(text: string, options?: { model?: string }): Promise<EmbeddingResult> {
    const model = options?.model || this.config.model;

    if (this.config.cacheEnabled) {
      const cached = this.cache.get(text, model);
      if (cached) {
        return { vector: cached, text, model, cached: true };
      }
    }

    const response = await linkMindService.embed({
      input: text,
      model,
      dimensions: this.config.dimensions,
    });

    if (!response.success || !response.embeddings?.[0]) {
      throw new Error(response.error || 'Embedding failed');
    }

    const vector = response.embeddings[0];

    if (this.config.cacheEnabled) {
      this.cache.set(text, model, vector);
    }

    eventBus.emit('embedding:complete', { text, model, dimension: vector.length });

    return { vector, text, model, cached: false };
  }

  async embedBatch(texts: string[], options?: { model?: string }): Promise<BatchEmbedResult> {
    const startTime = Date.now();
    const model = options?.model || this.config.model;
    const results: EmbeddingResult[] = [];

    const toEmbed: { text: string; index: number }[] = [];
    const cachedResults: Map<number, EmbeddingResult> = new Map();

    texts.forEach((text, index) => {
      if (this.config.cacheEnabled) {
        const cached = this.cache.get(text, model);
        if (cached) {
          cachedResults.set(index, { vector: cached, text, model, cached: true });
          return;
        }
      }
      toEmbed.push({ text, index });
    });

    if (toEmbed.length === 0) {
      texts.forEach((text, i) => {
        const cached = cachedResults.get(i);
        if (cached) results.push(cached);
      });
      return { results, durationMs: Date.now() - startTime };
    }

    for (let i = 0; i < toEmbed.length; i += this.config.batchSize) {
      const batch = toEmbed.slice(i, i + this.config.batchSize);

      try {
        const response: EmbeddingResponse = await linkMindService.embed({
          input: batch.map(b => b.text),
          model,
          dimensions: this.config.dimensions,
        });

        if (response.success && response.embeddings) {
          batch.forEach((item, idx) => {
            const vector = response.embeddings![idx];
            if (vector && this.config.cacheEnabled) {
              this.cache.set(item.text, model, vector);
            }
            results[item.index] = { vector, text: item.text, model, cached: false };
          });
        } else {
          batch.forEach(item => {
            results[item.index] = {
              vector: new Array(this.config.dimensions).fill(0),
              text: item.text,
              model,
              cached: false,
            };
          });
          logger.warn(`[EmbeddingService] Batch ${Math.floor(i / this.config.batchSize)} failed:`, response.error);
        }
      } catch (error) {
        logger.error(`[EmbeddingService] Batch error at offset ${i}:`, error);
        batch.forEach(item => {
          results[item.index] = {
            vector: new Array(this.config.dimensions).fill(0),
            text: item.text,
            model,
            cached: false,
          };
        });
      }
    }

    cachedResults.forEach((result, index) => {
      results[index] = result;
    });

    const finalResults = results.filter(Boolean);
    logger.info(
      `[EmbeddingService] embedBatch complete: ${texts.length} texts, ` +
      `${cachedResults.size} cached, ${toEmbed.length} computed, ${Date.now() - startTime}ms`
    );

    eventBus.emit('embedding:batch:complete', {
      totalTexts: texts.length,
      cachedCount: cachedResults.size,
      computedCount: toEmbed.length,
      durationMs: Date.now() - startTime,
    });

    return { results: finalResults, durationMs: Date.now() - startTime };
  }

  cosineSimilarity(a: number[], b: number[]): number {
    if (a.length !== b.length) {
      throw new Error('Vector dimensions must match');
    }

    let dotProduct = 0;
    let normA = 0;
    let normB = 0;

    for (let i = 0; i < a.length; i++) {
      dotProduct += a[i] * b[i];
      normA += a[i] * a[i];
      normB += b[i] * b[i];
    }

    const denominator = Math.sqrt(normA) * Math.sqrt(normB);
    if (denominator === 0) return 0;

    return dotProduct / denominator;
  }

  euclideanDistance(a: number[], b: number[]): number {
    if (a.length !== b.length) throw new Error('Vector dimensions must match');

    let sum = 0;
    for (let i = 0; i < a.length; i++) {
      const diff = a[i] - b[i];
      sum += diff * diff;
    }
    return Math.sqrt(sum);
  }

  async findSimilar(
    query: string,
    candidates: Array<{ text: string; metadata?: Record<string, any> }>,
    options?: {
      topK?: number;
      minScore?: number;
      model?: string;
    }
  ): Promise<SimilarityResult[]> {
    const topK = options?.topK ?? 10;
    const minScore = options?.minScore ?? 0;

    const queryResult = await this.embed(query, { model: options?.model });
    const candidateResults = await this.embedBatch(candidates.map(c => c.text), { model: options?.model });

    const scored: SimilarityResult[] = candidateResults.results
      .map((result, idx) => ({
        index: idx,
        score: this.cosineSimilarity(queryResult.vector, result.vector),
        text: candidates[idx].text,
        metadata: candidates[idx]?.metadata,
      }))
      .filter(r => r.score >= minScore)
      .sort((a, b) => b.score - a.score)
      .slice(0, topK);

    return scored;
  }

  clearCache(pattern?: string): void {
    this.cache.invalidate(pattern);
    logger.info(`[EmbeddingCache] Cleared${pattern ? ` (pattern: ${pattern})` : ' all'}`);
  }

  getCacheStats(): { size: number; enabled: boolean; ttl: number } {
    return {
      size: this.cache.size,
      enabled: this.config.cacheEnabled,
      ttl: this.config.cacheTTL,
    };
  }
}

export const embeddingService = EmbeddingService.getInstance();

export function cosineSimilarity(a: number[], b: number[]): number {
  return embeddingService.cosineSimilarity(a, b);
}
