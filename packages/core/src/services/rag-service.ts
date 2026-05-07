import { logger } from '../utils/logger';
import { eventBus } from '../utils/event-bus';
import { embeddingService, type EmbeddingResult } from './embedding-service';
import { linkMindService, type RerankRequest } from './linkmind-service';

export interface DocumentChunk {
  id: string;
  text: string;
  embedding?: number[];
  metadata: ChunkMetadata;
}

export interface ChunkMetadata {
  source: string;
  chunkIndex: number;
  totalChunks: number;
  title?: string;
  section?: string;
  page?: number;
  createdAt: number;
}

export interface CollectionConfig {
  name: string;
  description?: string;
  embeddingModel?: string;
  rerankModel?: string;
  chunkSize?: number;
  chunkOverlap?: number;
}

export interface CollectionInfo {
  name: string;
  description?: string;
  documentCount: number;
  chunkCount: number;
  createdAt: number;
  updatedAt: number;
  config: CollectionConfig;
}

export interface CollectionStats {
  name: string;
  totalDocuments: number;
  totalChunks: number;
  totalTokens: number;
  storageSizeEstimate: number;
  lastUpdated: number;
}

export interface QueryOptions {
  topK?: number;
  minScore?: number;
  hybridAlpha?: boolean | number;
  rerank?: boolean;
  filters?: Record<string, any>;
}

export interface HybridOptions extends QueryOptions {
  keywordWeight?: number;
  semanticWeight?: number;
}

export interface RAGResult {
  chunk: DocumentChunk;
  score: number;
  rerankScore?: number;
  highlightedText?: string;
  matchedKeywords?: string[];
}

export interface AddDocumentResult {
  success: boolean;
  documentId: string;
  chunksAdded: number;
  errors?: string[];
}

class InMemoryVectorStore {
  private collections = new Map<string, {
    config: CollectionConfig;
    chunks: DocumentChunk[];
    createdAt: number;
    updatedAt: number;
  }>();

  createCollection(name: string, config?: Partial<CollectionConfig>): void {
    if (!this.collections.has(name)) {
      this.collections.set(name, {
        config: { name, ...config },
        chunks: [],
        createdAt: Date.now(),
        updatedAt: Date.now(),
      });
    }
  }

  async addChunks(collectionName: string, chunks: DocumentChunk[], config: CollectionConfig): Promise<void> {
    let coll = this.collections.get(collectionName);
    if (!coll) {
      coll = { config, chunks: [], createdAt: Date.now(), updatedAt: Date.now() };
      this.collections.set(collectionName, coll);
    }
    coll.chunks.push(...chunks);
    coll.updatedAt = Date.now();
  }

  async query(
    collectionName: string,
    queryVector: number[],
    options: { topK: number; minScore: number }
  ): Promise<Array<{ chunk: DocumentChunk; score: number }>> {
    const coll = this.collections.get(collectionName);
    if (!coll) return [];

    const scored = coll.chunks
      .filter(c => c.embedding)
      .map(chunk => {
        let dotProduct = 0;
        let normA = 0;
        let normB = 0;

        for (let i = 0; i < (chunk.embedding as number[]).length; i++) {
          dotProduct += (chunk.embedding as number[])[i] * queryVector[i];
          normA += (chunk.embedding as number[])[i] ** 2;
          normB += queryVector[i] ** 2;
        }

        const denom = Math.sqrt(normA) * Math.sqrt(normB);
        const score = denom > 0 ? dotProduct / denom : 0;

        return { chunk, score };
      })
      .filter(r => r.score >= options.minScore)
      .sort((a, b) => b.score - a.score)
      .slice(0, options.topK);

    return scored;
  }

  async keywordSearch(
    collectionName: string,
    query: string,
    topK: number
  ): Promise<Array<{ chunk: DocumentChunk; score: number; keywords: string[] }>> {
    const coll = this.collections.get(collectionName);
    if (!coll) return [];

    const terms = query.toLowerCase().split(/\s+/).filter(t => t.length > 1);

    const scored = coll.chunks
      .map(chunk => {
        const text = chunk.text.toLowerCase();
        let hits = 0;
        const matchedKeywords: string[] = [];

        for (const term of terms) {
          const regex = new RegExp(term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi');
          const matches = text.match(regex);
          if (matches && matches.length > 0) {
            hits += matches.length;
            if (!matchedKeywords.includes(term)) matchedKeywords.push(term);
          }
        }

        const score = terms.length > 0 ? hits / terms.length : 0;
        return { chunk, score, keywords: matchedKeywords };
      })
      .filter(r => r.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, topK);

    return scored;
  }

  getCollection(name: string): CollectionInfo | null {
    const coll = this.collections.get(name);
    if (!coll) return null;

    const docSources = new Set(coll.chunks.map(c => c.metadata.source));
    return {
      name,
      description: coll.config.description,
      documentCount: docSources.size,
      chunkCount: coll.chunks.length,
      createdAt: coll.createdAt,
      updatedAt: coll.updatedAt,
      config: coll.config,
    };
  }

  listCollections(): CollectionInfo[] {
    return Array.from(this.collections.keys())
      .map(name => this.getCollection(name)!)
      .filter(Boolean)
      .sort((a, b) => b.updatedAt - a.updatedAt);
  }

  deleteCollection(name: string): boolean {
    return this.collections.delete(name);
  }

  deleteChunks(collectionName: string, source?: string): number {
    const coll = this.collections.get(collectionName);
    if (!coll) return 0;

    if (source) {
      const before = coll.chunks.length;
      coll.chunks = coll.chunks.filter(c => c.metadata.source !== source);
      coll.updatedAt = Date.now();
      return before - coll.chunks.length;
    }

    const count = coll.chunks.length;
    coll.chunks = [];
    coll.updatedAt = Date.now();
    return count;
  }

  getStats(name: string): CollectionStats | null {
    const coll = this.collections.get(name);
    if (!coll) return null;

    const docSources = new Set(coll.chunks.map(c => c.metadata.source));
    const totalTokens = coll.chunks.reduce((sum, c) => sum + c.text.split(/\s+/).length, 0);

    return {
      name,
      totalDocuments: docSources.size,
      totalChunks: coll.chunks.length,
      totalTokens,
      storageSizeEstimate: JSON.stringify(coll.chunks).length,
      lastUpdated: coll.updatedAt,
    };
  }
}

export class RAGService {
  private store: InMemoryVectorStore;
  private static instance: RAGService | null = null;

  constructor() {
    this.store = new InMemoryVectorStore();
  }

  static getInstance(): RAGService {
    if (!RAGService.instance) {
      RAGService.instance = new RAGService();
    }
    return RAGService.instance;
  }

  static resetInstance(): void {
    RAGService.instance = null;
  }

  generateChunkId(source: string, index: number): string {
    const hash = this.simpleHash(`${source}:${index}:${Date.now()}`);
    return `chunk_${hash}_${index}`;
  }

  private simpleHash(str: string): string {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }
    return Math.abs(hash).toString(16).padStart(8, '0');
  }

  async addDocuments(
    documents: Array<{ text: string; metadata?: Partial<ChunkMetadata> }>,
    collectionName: string,
    config?: Partial<CollectionConfig>
  ): Promise<AddDocumentResult> {
    const startTime = Date.now();
    const docIds: string[] = [];
    let totalChunks = 0;
    const errors: string[] = [];

    const fullConfig: CollectionConfig = {
      name: collectionName,
      ...config,
    };

    for (const doc of documents) {
      try {
        const docId = `doc_${this.simpleHash(doc.text.slice(0, 100) + Date.now())}`;
        docIds.push(docId);

        const chunks = this.splitIntoChunks(doc.text, {
          chunkSize: fullConfig.chunkSize || 500,
          chunkOverlap: fullConfig.chunkOverlap || 50,
          source: doc.metadata?.source || docId,
          title: doc.metadata?.title,
          section: doc.metadata?.section,
          page: doc.metadata?.page,
        });

        const enrichedChunks: DocumentChunk[] = chunks.map((chunk, idx) => ({
          id: this.generateChunkId(doc.metadata?.source || docId, idx),
          text: chunk.text,
          metadata: {
            source: doc.metadata?.source || docId,
            chunkIndex: idx,
            totalChunks: chunks.length,
            title: doc.metadata?.title || chunk.title,
            section: doc.metadata?.section,
            page: doc.metadata?.page,
            createdAt: Date.now(),
          },
        }));

        if (enrichedChunks.length > 0) {
          const embedResults = await embeddingService.embedBatch(
            enrichedChunks.map(c => c.text),
            { model: fullConfig.embeddingModel }
          );

          embedResults.results.forEach((result, idx) => {
            enrichedChunks[idx].embedding = result.vector;
          });
        }

        await this.store.addChunks(collectionName, enrichedChunks, fullConfig);
        totalChunks += enrichedChunks.length;
      } catch (error) {
        const msg = error instanceof Error ? error.message : String(error);
        errors.push(msg);
        logger.error(`[RAGService] Failed to add document: ${msg}`);
      }
    }

    logger.info(
      `[RAGService] addDocuments: ${documents.length} docs → ${totalChunks} chunks in ${Date.now() - startTime}ms`
    );
    eventBus.emit('rag:documents:added', {
      collectionName,
      documentCount: documents.length,
      chunkCount: totalChunks,
      durationMs: Date.now() - startTime,
    });

    return {
      success: errors.length === 0,
      documentId: docIds.join(','),
      chunksAdded: totalChunks,
      errors: errors.length > 0 ? errors : undefined,
    };
  }

  async query(
    queryString: string,
    collectionName: string,
    options?: QueryOptions
  ): Promise<RAGResult[]> {
    const startTime = Date.now();
    const topK = options?.topK ?? 5;
    const minScore = options?.minScore ?? 0.3;

    const queryEmbed = await embeddingService.embed(queryString, {
      model: options ? undefined : undefined,
    });

    const semanticResults = await this.store.query(
      collectionName,
      queryEmbed.vector,
      { topK: topK * 3, minScore: minScore * 0.5 }
    );

    let results: RAGResult[] = semanticResults.map(r => ({
      chunk: r.chunk,
      score: r.score,
    }));

    if (options?.rerank && results.length > 0) {
      try {
        const rerankResponse = await linkMindService.rerank({
          query: queryString,
          documents: results.map(r => r.chunk.text),
          topN: topK,
        } as RerankRequest);

        if (rerankResponse.success && rerankResponse.results) {
          const reranked = rerankResponse.results
            .filter(r => r.index < results.length)
            .map(r => ({
              ...results[r.index],
              rerankScore: r.score,
              score: r.score,
            }))
            .sort((a, b) => (b.rerankScore || 0) - (a.rerankScore || 0))
            .slice(0, topK);

          results = reranked;
        }
      } catch (error) {
        logger.warn('[RAGService] Rerank failed, using semantic scores:', error);
      }
    }

    results = results.slice(0, topK);

    results.forEach(r => {
      r.highlightedText = this.highlightQuery(queryString, r.chunk.text);
    });

    logger.info(`[RAGService] query: ${results.length} results in ${Date.now() - startTime}ms`);
    eventBus.emit('rag:query:complete', {
      collectionName,
      query: queryString,
      resultCount: results.length,
      durationMs: Date.now() - startTime,
    });

    return results;
  }

  async hybridQuery(
    queryString: string,
    collectionName: string,
    options?: HybridOptions
  ): Promise<RAGResult[]> {
    const topK = options?.topK ?? 5;
    const kwWeight = options?.keywordWeight ?? 0.3;
    const semWeight = typeof options?.hybridAlpha === 'number' ? options.hybridAlpha : 1 - kwWeight;

    const [semanticResults, keywordResults] = await Promise.all([
      this.query(queryString, collectionName, { ...options, topK: topK * 2, rerank: false }),
      this.keywordQuery(queryString, collectionName, topK * 2),
    ]);

    const combined = new Map<string, RAGResult>();

    semanticResults.forEach(r => {
      const key = r.chunk.id;
      const existing = combined.get(key);
      if (existing) {
        existing.score = Math.max(existing.score, r.score * semWeight);
      } else {
        combined.set(key, { ...r, score: r.score * semWeight });
      }
    });

    keywordResults.forEach(r => {
      const key = r.chunk.id;
      const existing = combined.get(key);
      if (existing) {
        existing.score += r.score * kwWeight;
        existing.matchedKeywords = r.matchedKeywords;
      } else {
        combined.set(key, { ...r, score: r.score * kwWeight, matchedKeywords: r.matchedKeywords });
      }
    });

    return Array.from(combined.values())
      .sort((a, b) => b.score - a.score)
      .slice(0, topK);
  }

  async keywordQuery(
    queryString: string,
    collectionName: string,
    topK?: number
  ): Promise<RAGResult[]> {
    const results = await this.store.keywordSearch(collectionName, queryString, topK || 5);

    return results.map(r => ({
      chunk: r.chunk,
      score: r.score,
      matchedKeywords: r.keywords,
    }));
  }

  async createCollection(name: string, config?: Partial<CollectionConfig>): Promise<void> {
    const info = this.store.getCollection(name);
    if (info) {
      throw new Error(`Collection "${name}" already exists`);
    }

    this.store.createCollection(name, config);
    logger.info(`[RAGService] Created collection: ${name}`);
  }

  async dropCollection(name: string): Promise<boolean> {
    const result = this.store.deleteCollection(name);
    if (result) {
      logger.info(`[RAGService] Dropped collection: ${name}`);
      eventBus.emit('rag:collection:dropped', { name });
    }
    return result;
  }

  listCollections(): CollectionInfo[] {
    return this.store.listCollections();
  }

  getCollectionStats(name: string): CollectionStats | null {
    return this.store.getStats(name);
  }

  async deleteDocuments(collectionName: string, source: string): Promise<number> {
    const count = this.store.deleteChunks(collectionName, source);
    logger.info(`[RAGService] Deleted ${count} chunks from "${collectionName}" (source: ${source})`);
    return count;
  }

  private splitIntoChunks(
    text: string,
    options: {
      chunkSize: number;
      chunkOverlap: number;
      source: string;
      title?: string;
      section?: string;
      page?: number;
    }
  ): Array<{ text: string; title?: string }> {
    const paragraphs = text.split(/\n\s*\n/);
    const chunks: Array<{ text: string; title?: string }> = [];
    let current = '';
    let title = options.title;

    for (const para of paragraphs) {
      const trimmed = para.trim();
      if (!trimmed) continue;

      if (/^#{1,6}\s/.test(trimmed)) {
        if (current.trim()) {
          chunks.push(...this.splitText(current.trim(), options.chunkSize, options.chunkOverlap, title));
        }
        current = trimmed;
        title = trimmed.replace(/^#{1,6}\s*/, '').trim();
        continue;
      }

      if ((current + '\n\n' + trimmed).length > options.chunkSize * 1.5) {
        if (current.trim()) {
          chunks.push(...this.splitText(current.trim(), options.chunkSize, options.chunkOverlap, title));
        }
        current = trimmed;
      } else {
        current = current ? `${current}\n\n${trimmed}` : trimmed;
      }
    }

    if (current.trim()) {
      chunks.push(...this.splitText(current.trim(), options.chunkSize, options.chunkOverlap, title));
    }

    return chunks;
  }

  private splitText(text: string, size: number, overlap: number, title?: string): Array<{ text: string; title?: string }> {
    if (text.length <= size) return [{ text, title }];

    const chunks: Array<{ text: string; title?: string }> = [];
    let start = 0;

    while (start < text.length) {
      let end = start + size;

      if (end < text.length) {
        const lastSpace = text.lastIndexOf(' ', end);
        const lastNewline = text.lastIndexOf('\n', end);
        const breakPoint = lastNewline > start ? lastNewline : (lastSpace > start ? lastSpace : end);
        end = breakPoint;
      }

      chunks.push({ text: text.slice(start, end).trim(), title });
      start = end - (chunks.length > 1 ? overlap : 0);
    }

    return chunks;
  }

  private highlightQuery(query: string, text: string, maxLength: number = 200): string {
    const terms = query.toLowerCase().split(/\s+/).filter(t => t.length > 1);
    if (terms.length === 0) return text.slice(0, maxLength);

    let result = text;
    for (const term of terms) {
      const regex = new RegExp(`(${term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
      result = result.replace(regex, '**$1**');
    }

    if (result.length > maxLength) {
      const firstBold = result.indexOf('**');
      if (firstBold > maxLength / 2) {
        result = '...' + result.slice(Math.max(0, firstBold - 30));
      }
      result = result.slice(0, maxLength) + '...';
    }

    return result;
  }
}

export const ragService = RAGService.getInstance();
