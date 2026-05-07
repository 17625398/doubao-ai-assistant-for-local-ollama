// 文档服务

import { ollamaClient } from '../utils/ollama-client';
import { logger } from '../utils/logger';
import { eventBus } from '../utils/event-bus';
import { Document, DocumentContent, DocumentMetadata, DocumentType, DocumentStatus } from '../types';
import { cacheManager } from '../utils/cache-manager';
import { DocumentParserUtil } from '../utils/document-parser';

/**
 * 文档服务配置
 */
interface DocumentServiceConfig {
  maxFileSize: number;
  cacheTTL: number;
  defaultModel: string;
  processingTimeout: number;
  maxContentLength: number;
  maxImages: number;
}

/**
 * 文档服务
 */
export class DocumentService {
  private config: DocumentServiceConfig;
  private processingDocuments: Map<string, AbortController> = new Map();

  constructor(config?: Partial<DocumentServiceConfig>) {
    this.config = {
      maxFileSize: 50 * 1024 * 1024, // 50MB
      cacheTTL: 3600000 * 24, // 24 hours
      defaultModel: 'gemma4:26b',
      processingTimeout: 60000, // 60 seconds
      maxContentLength: 50000, // 50k characters
      maxImages: 50, // 50 images
      ...config
    };
  }

  /**
   * 处理文档
   */
  async processDocument(file: File, options?: {
    type?: DocumentType;
    userId?: string;
    sessionId?: string;
  }): Promise<Document> {
    const { type, userId, sessionId } = options || {};
    const documentId = this.generateDocumentId();
    const progressId = `document:${documentId}:progress`;

    try {
      // 检查文件大小
      if (file.size > this.config.maxFileSize) {
        throw new Error(`文件大小超过限制 (${this.config.maxFileSize / (1024 * 1024)}MB)`);
      }

      // 触发开始处理事件
      eventBus.emit('document:processing-started', { documentId, fileName: file.name });

      // 提取元数据
      const metadata = this.extractMetadata(file, type);
      
      // 检查缓存
      const cacheKey = this.generateCacheKey(file);
      const cachedDocument = await this.getCachedDocument(cacheKey);
      if (cachedDocument) {
        eventBus.emit('document:processed', { ...cachedDocument, id: documentId });
        return { ...cachedDocument, id: documentId };
      }

      // 创建中止控制器
      const abortController = new AbortController();
      this.processingDocuments.set(documentId, abortController);

      // 设置超时
      const timeoutId = setTimeout(() => {
        abortController.abort();
        eventBus.emit('document:processing-failed', { documentId, error: '处理超时' });
      }, this.config.processingTimeout);

      // 提取内容
      eventBus.emit('document:progress', { id: progressId, progress: 25, message: '提取内容中...' });
      const content = await this.extractContent(file, abortController.signal);

      // 分析内容
      eventBus.emit('document:progress', { id: progressId, progress: 50, message: '分析内容中...' });
      const analysis = await this.analyzeContent(content, abortController.signal);

      // 提取关键信息
      eventBus.emit('document:progress', { id: progressId, progress: 75, message: '提取关键信息中...' });
      const keyInformation = await this.extractKeyInformation(content, abortController.signal);

      clearTimeout(timeoutId);

      const document: Document = {
        id: documentId,
        metadata,
        content,
        analysis: {
          ...analysis,
          ...keyInformation
        },
        processedAt: Date.now(),
        status: 'completed',
        userId,
        sessionId
      };

      // 缓存文档
      await this.cacheDocument(cacheKey, document);

      // 触发处理完成事件
      eventBus.emit('document:processed', document);
      eventBus.emit('document:progress', { id: progressId, progress: 100, message: '处理完成' });

      return document;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : '处理文档失败';
      logger.error('Failed to process document:', error);
      
      // 触发失败事件
      eventBus.emit('document:processing-failed', { documentId, error: errorMessage });
      eventBus.emit('document:progress', { id: progressId, progress: 0, message: `失败: ${errorMessage}` });

      // 创建失败状态的文档
      const failedDocument: Document = {
        id: documentId,
        metadata: this.extractMetadata(file, type),
        content: {
          text: `处理失败: ${errorMessage}`,
          html: `<p>处理失败: ${errorMessage}</p>`,
          images: []
        },
        analysis: {
          summary: '',
          keywords: [],
          topics: [],
          entities: [],
          mainPoints: [],
          questions: []
        },
        processedAt: Date.now(),
        status: 'failed',
        error: errorMessage,
        userId,
        sessionId
      };

      return failedDocument;
    } finally {
      this.processingDocuments.delete(documentId);
    }
  }

  /**
   * 提取文档元数据
   */
  private extractMetadata(file: File, type?: DocumentType): DocumentMetadata {
    return {
      name: file.name,
      size: file.size,
      type: file.type,
      lastModified: file.lastModified,
      documentType: type || this.detectDocumentType(file)
    };
  }

  /**
   * 检测文档类型
   */
  private detectDocumentType(file: File): DocumentType {
    const name = file.name.toLowerCase();
    const type = file.type;

    if (type === 'text/plain' || name.endsWith('.txt')) {
      return 'text';
    } else if (type === 'text/markdown' || name.endsWith('.md')) {
      return 'markdown';
    } else if (type === 'application/pdf' || name.endsWith('.pdf')) {
      return 'pdf';
    } else if (type.includes('word') || name.endsWith('.doc') || name.endsWith('.docx')) {
      return 'word';
    } else if (type.includes('excel') || name.endsWith('.xls') || name.endsWith('.xlsx')) {
      return 'excel';
    } else if (type.includes('powerpoint') || name.endsWith('.ppt') || name.endsWith('.pptx')) {
      return 'powerpoint';
    } else if (type.startsWith('image/')) {
      return 'image';
    } else {
      return 'other';
    }
  }

  /**
   * 提取文档内容
   */
  private async extractContent(file: File, signal?: AbortSignal): Promise<DocumentContent> {
    try {
      // 使用文档解析器提取内容
      const result = await DocumentParserUtil.parse(file);
      
      // 限制内容长度
      const text = (result.text || '').substring(0, this.config.maxContentLength);
      const html = `<pre>${text}</pre>`;
      
      // 提取图片
      const images = (result.content || [])
        .filter((item: any) => item.type === 'image')
        .map((item: any) => item.url)
        .slice(0, this.config.maxImages);
      
      return {
        text,
        html,
        images
      };
    } catch (error) {
      logger.error('Failed to extract content:', error);
      throw error;
    }
  }

  /**
   * 分析文档内容
   */
  private async analyzeContent(content: DocumentContent, signal?: AbortSignal): Promise<{
    summary: string;
    keywords: string[];
    topics: string[];
  }> {
    try {
      const cacheKey = `analyze:${btoa(content.text.substring(0, 1000))}`;
      const cached = await this.getCachedAnalysis(cacheKey);
      if (cached) {
        return cached;
      }

      const response = await ollamaClient.generate(
        `请分析以下文档内容并提供：\n1. 简短摘要（不超过200字）\n2. 5个关键词\n3. 3个主题\n\n文档内容：${content.text.substring(0, 1000)}...`,
        {
          model: this.config.defaultModel,
          system: '你是一个专业的文档分析助手，擅长分析文档内容并提取关键信息。'
        }
      );

      const analysis = response.response || '';
      const result = this.parseAnalysis(analysis);
      
      // 缓存分析结果
      await this.cacheAnalysis(cacheKey, result);
      
      return result;
    } catch (error) {
      logger.error('Failed to analyze content:', error);
      return {
        summary: '分析失败',
        keywords: [],
        topics: []
      };
    }
  }

  /**
   * 解析分析结果
   */
  private parseAnalysis(analysis: string): {
    summary: string;
    keywords: string[];
    topics: string[];
  } {
    const lines = analysis.split('\n').filter(line => line.trim());
    let summary = '';
    const keywords: string[] = [];
    const topics: string[] = [];

    let section = '';
    for (const line of lines) {
      if (line.includes('摘要') || line.includes('summary')) {
        section = 'summary';
      } else if (line.includes('关键词') || line.includes('keywords')) {
        section = 'keywords';
      } else if (line.includes('主题') || line.includes('topics')) {
        section = 'topics';
      } else if (section === 'summary') {
        summary += line + ' ';
      } else if (section === 'keywords') {
        keywords.push(line.replace(/^-\s*/, '').replace(/^\d+\.\s*/, ''));
      } else if (section === 'topics') {
        topics.push(line.replace(/^-\s*/, '').replace(/^\d+\.\s*/, ''));
      }
    }

    // 如果没有明确的章节，尝试提取信息
    if (!summary && !keywords.length && !topics.length) {
      summary = analysis.substring(0, 200);
    }

    return {
      summary: summary.trim(),
      keywords: keywords.slice(0, 5),
      topics: topics.slice(0, 3)
    };
  }

  /**
   * 提取文档中的关键信息
   */
  private async extractKeyInformation(content: DocumentContent, signal?: AbortSignal): Promise<{
    entities: string[];
    mainPoints: string[];
    questions: string[];
  }> {
    try {
      const cacheKey = `extract:${btoa(content.text.substring(0, 1000))}`;
      const cached = await this.getCachedExtraction(cacheKey);
      if (cached) {
        return cached;
      }

      const response = await ollamaClient.generate(
        `请从以下文档中提取：\n1. 5个关键实体\n2. 3个主要观点\n3. 2个相关问题\n\n文档内容：${content.text.substring(0, 1000)}...`,
        {
          model: this.config.defaultModel,
          system: '你是一个专业的信息提取助手，擅长从文档中提取关键信息。'
        }
      );

      const extraction = response.response || '';
      const result = this.parseExtraction(extraction);
      
      // 缓存提取结果
      await this.cacheExtraction(cacheKey, result);
      
      return result;
    } catch (error) {
      logger.error('Failed to extract key information:', error);
      return {
        entities: [],
        mainPoints: [],
        questions: []
      };
    }
  }

  /**
   * 解析提取结果
   */
  private parseExtraction(extraction: string): {
    entities: string[];
    mainPoints: string[];
    questions: string[];
  } {
    const lines = extraction.split('\n').filter(line => line.trim());
    const entities: string[] = [];
    const mainPoints: string[] = [];
    const questions: string[] = [];

    let section = '';
    for (const line of lines) {
      if (line.includes('实体') || line.includes('entities')) {
        section = 'entities';
      } else if (line.includes('观点') || line.includes('points')) {
        section = 'mainPoints';
      } else if (line.includes('问题') || line.includes('questions')) {
        section = 'questions';
      } else if (section === 'entities') {
        entities.push(line.replace(/^-\s*/, '').replace(/^\d+\.\s*/, ''));
      } else if (section === 'mainPoints') {
        mainPoints.push(line.replace(/^-\s*/, '').replace(/^\d+\.\s*/, ''));
      } else if (section === 'questions') {
        questions.push(line.replace(/^-\s*/, '').replace(/^\d+\.\s*/, ''));
      }
    }

    return {
      entities: entities.slice(0, 5),
      mainPoints: mainPoints.slice(0, 3),
      questions: questions.slice(0, 2)
    };
  }

  /**
   * 搜索文档
   */
  async searchDocuments(query: string, documents: Document[], options?: {
    limit?: number;
    threshold?: number;
  }): Promise<{ document: Document; score: number }[]> {
    try {
      const { limit = 10, threshold = 0.1 } = options || {};
      const results: { document: Document; score: number }[] = [];

      // 并行计算相关性
      const relevancePromises = documents.map(async (document) => {
        const score = await this.calculateRelevance(query, document);
        if (score > threshold) {
          return { document, score };
        }
        return null;
      });

      const relevanceResults = await Promise.all(relevancePromises);
      const validResults = relevanceResults.filter((result): result is { document: Document; score: number } => result !== null);

      // 按相关性排序
      validResults.sort((a, b) => b.score - a.score);
      return validResults.slice(0, limit);
    } catch (error) {
      logger.error('Failed to search documents:', error);
      return [];
    }
  }

  /**
   * 计算文档与查询的相关性
   */
  private async calculateRelevance(query: string, document: Document): Promise<number> {
    try {
      const cacheKey = `relevance:${btoa(`${query}:${document.content.text.substring(0, 500)}`)}`;
      const cached = await this.getCachedRelevance(cacheKey);
      if (cached !== null) {
        return cached;
      }

      const response = await ollamaClient.generate(
        `请计算以下查询与文档的相关性，返回0-1之间的分数：\n\n查询：${query}\n\n文档内容：${document.content.text.substring(0, 500)}...`,
        {
          model: this.config.defaultModel,
          system: '你是一个专业的文档相关性评估助手，擅长评估查询与文档之间的相关性。'
        }
      );

      const score = parseFloat(response.response || '0');
      const finalScore = isNaN(score) ? 0 : Math.max(0, Math.min(1, score));
      
      // 缓存相关性分数
      await this.cacheRelevance(cacheKey, finalScore);
      
      return finalScore;
    } catch (error) {
      logger.error('Failed to calculate relevance:', error);
      return 0;
    }
  }

  /**
   * 取消文档处理
   */
  cancelProcessing(documentId: string): void {
    const controller = this.processingDocuments.get(documentId);
    if (controller) {
      controller.abort();
      this.processingDocuments.delete(documentId);
      eventBus.emit('document:processing-cancelled', { documentId });
    }
  }

  /**
   * 生成文档ID
   */
  private generateDocumentId(): string {
    return `doc-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * 生成缓存键
   */
  private generateCacheKey(file: File): string {
    return `document:${btoa(`${file.name}:${file.size}:${file.lastModified}`)}`;
  }

  /**
   * 获取缓存的文档
   */
  private async getCachedDocument(cacheKey: string): Promise<Document | null> {
    try {
      const cached = await cacheManager.get(cacheKey);
      return cached as Document | null;
    } catch (error) {
      logger.error('Failed to get cached document:', error);
      return null;
    }
  }

  /**
   * 缓存文档
   */
  private async cacheDocument(cacheKey: string, document: Document): Promise<void> {
    try {
      await cacheManager.set(cacheKey, document, this.config.cacheTTL);
    } catch (error) {
      logger.error('Failed to cache document:', error);
    }
  }

  /**
   * 获取缓存的分析结果
   */
  private async getCachedAnalysis(cacheKey: string): Promise<{ summary: string; keywords: string[]; topics: string[] } | null> {
    try {
      const cached = await cacheManager.get(cacheKey);
      return cached as { summary: string; keywords: string[]; topics: string[] } | null;
    } catch (error) {
      logger.error('Failed to get cached analysis:', error);
      return null;
    }
  }

  /**
   * 缓存分析结果
   */
  private async cacheAnalysis(cacheKey: string, analysis: { summary: string; keywords: string[]; topics: string[] }): Promise<void> {
    try {
      await cacheManager.set(cacheKey, analysis, this.config.cacheTTL);
    } catch (error) {
      logger.error('Failed to cache analysis:', error);
    }
  }

  /**
   * 获取缓存的提取结果
   */
  private async getCachedExtraction(cacheKey: string): Promise<{ entities: string[]; mainPoints: string[]; questions: string[] } | null> {
    try {
      const cached = await cacheManager.get(cacheKey);
      return cached as { entities: string[]; mainPoints: string[]; questions: string[] } | null;
    } catch (error) {
      logger.error('Failed to get cached extraction:', error);
      return null;
    }
  }

  /**
   * 缓存提取结果
   */
  private async cacheExtraction(cacheKey: string, extraction: { entities: string[]; mainPoints: string[]; questions: string[] }): Promise<void> {
    try {
      await cacheManager.set(cacheKey, extraction, this.config.cacheTTL);
    } catch (error) {
      logger.error('Failed to cache extraction:', error);
    }
  }

  /**
   * 获取缓存的相关性分数
   */
  private async getCachedRelevance(cacheKey: string): Promise<number | null> {
    try {
      const cached = await cacheManager.get(cacheKey);
      return cached as number | null;
    } catch (error) {
      logger.error('Failed to get cached relevance:', error);
      return null;
    }
  }

  /**
   * 缓存相关性分数
   */
  private async cacheRelevance(cacheKey: string, score: number): Promise<void> {
    try {
      await cacheManager.set(cacheKey, score, this.config.cacheTTL);
    } catch (error) {
      logger.error('Failed to cache relevance:', error);
    }
  }
}

/**
 * 全局文档服务实例
 */
export const documentService = new DocumentService();

export default DocumentService;