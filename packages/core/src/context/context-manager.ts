// 上下文管理系统 - 智能管理 AI 对话的上下文信息

import { logger } from '../utils/logger';

/**
 * 上下文来源类型
 */
export type ContextSourceType = 
  | 'page'           // 网页内容
  | 'document'       // 文档内容
  | 'screenshot'     // 截图
  | 'selection'      // 选中文本
  | 'manual'         // 手动输入
  | 'code'           // 代码片段
  | 'image'          // 图片描述
  | 'conversation';  // 对话历史

/**
 * 上下文来源接口
 */
export interface ContextSource {
  id: string;
  type: ContextSourceType;
  content: string;
  summary?: string;
  metadata: Record<string, any>;
  timestamp: number;
  priority?: number; // 优先级 1-10,默认 5
  tokens?: number;   // 估算的 token 数量
}

/**
 * 上下文配置接口
 */
export interface ContextConfig {
  maxTotalTokens: number;        // 最大总 token 数
  maxSources: number;            // 最大来源数量
  sourceTimeout: number;         // 来源过期时间(毫秒)
  enableAutoOptimize: boolean;   // 是否自动优化
  enableCompression: boolean;    // 是否启用压缩
  defaultPriority: number;       // 默认优先级
}

/**
 * 页面上下文信息
 */
export interface PageContext {
  url: string;
  title: string;
  content: string;
  metadata: {
    domain: string;
    language?: string;
    wordCount: number;
    capturedAt: number;
  };
}

/**
 * 文档上下文信息
 */
export interface DocumentContext {
  fileName: string;
  fileType: string;
  content: string;
  metadata: {
    fileSize: number;
    pageCount?: number;
    extractedAt: number;
  };
}

/**
 * 默认配置
 */
const DEFAULT_CONFIG: ContextConfig = {
  maxTotalTokens: 4000,          // 约 4000 tokens
  maxSources: 10,                // 最多 10 个来源
  sourceTimeout: 30 * 60 * 1000, // 30 分钟
  enableAutoOptimize: true,
  enableCompression: true,
  defaultPriority: 5
};

/**
 * 上下文管理器
 * 
 * 功能:
 * 1. 多来源上下文管理
 * 2. 智能优化和压缩
 * 3. 自动过期清理
 * 4. Token 数量控制
 * 5. 优先级排序
 */
export class ContextManager {
  private sources: Map<string, ContextSource> = new Map();
  private config: ContextConfig;
  private estimatedTokensPerChar = 0.25; // 粗略估算: 1 token ≈ 4 字符

  constructor(config?: Partial<ContextConfig>) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    logger.info('[ContextManager] Initialized with config:', this.config);
  }

  /**
   * 添加页面上下文
   */
  async addPageContext(page: PageContext): Promise<string> {
    const id = this.generateId('page');
    const source: ContextSource = {
      id,
      type: 'page',
      content: page.content,
      metadata: {
        url: page.url,
        title: page.title,
        domain: page.metadata.domain,
        language: page.metadata.language
      },
      timestamp: page.metadata.capturedAt,
      priority: 6, // 页面上下文优先级较高
      tokens: this.estimateTokens(page.content)
    };

    this.sources.set(id, source);
    logger.info(`[ContextManager] Added page context: ${page.title} (${source.tokens} tokens)`);

    if (this.config.enableAutoOptimize) {
      this.optimize();
    }

    return id;
  }

  /**
   * 添加文档上下文
   */
  async addDocumentContext(doc: DocumentContext): Promise<string> {
    const id = this.generateId('doc');
    const source: ContextSource = {
      id,
      type: 'document',
      content: doc.content,
      summary: this.generateSummary(doc.content, 200),
      metadata: {
        fileName: doc.fileName,
        fileType: doc.fileType,
        fileSize: doc.metadata.fileSize,
        pageCount: doc.metadata.pageCount
      },
      timestamp: doc.metadata.extractedAt,
      priority: 7, // 文档上下文优先级更高
      tokens: this.estimateTokens(doc.content)
    };

    this.sources.set(id, source);
    logger.info(`[ContextManager] Added document context: ${doc.fileName} (${source.tokens} tokens)`);

    if (this.config.enableAutoOptimize) {
      this.optimize();
    }

    return id;
  }

  /**
   * 添加选中文本
   */
  async addSelection(text: string, sourceUrl?: string): Promise<string> {
    const id = this.generateId('selection');
    const source: ContextSource = {
      id,
      type: 'selection',
      content: text.trim(),
      metadata: {
        sourceUrl: sourceUrl || 'unknown',
        length: text.length
      },
      timestamp: Date.now(),
      priority: 8, // 用户主动选中,优先级很高
      tokens: this.estimateTokens(text)
    };

    this.sources.set(id, source);
    logger.info(`[ContextManager] Added selection context (${source.tokens} tokens)`);

    if (this.config.enableAutoOptimize) {
      this.optimize();
    }

    return id;
  }

  /**
   * 添加代码片段
   */
  async addCode(code: string, language?: string, filename?: string): Promise<string> {
    const id = this.generateId('code');
    const source: ContextSource = {
      id,
      type: 'code',
      content: code,
      metadata: {
        language: language || 'unknown',
        filename: filename || 'unknown',
        lines: code.split('\n').length
      },
      timestamp: Date.now(),
      priority: 7,
      tokens: this.estimateTokens(code)
    };

    this.sources.set(id, source);
    logger.info(`[ContextManager] Added code context: ${language} (${source.tokens} tokens)`);

    if (this.config.enableAutoOptimize) {
      this.optimize();
    }

    return id;
  }

  /**
   * 添加手动上下文
   */
  async addManual(content: string, description?: string): Promise<string> {
    const id = this.generateId('manual');
    const source: ContextSource = {
      id,
      type: 'manual',
      content: content.trim(),
      summary: description,
      metadata: {
        description,
        length: content.length
      },
      timestamp: Date.now(),
      priority: this.config.defaultPriority,
      tokens: this.estimateTokens(content)
    };

    this.sources.set(id, source);
    logger.info(`[ContextManager] Added manual context (${source.tokens} tokens)`);

    if (this.config.enableAutoOptimize) {
      this.optimize();
    }

    return id;
  }

  /**
   * 获取所有上下文来源
   */
  getAllSources(): ContextSource[] {
    return Array.from(this.sources.values())
      .sort((a, b) => {
        // 先按优先级排序,再按时间排序
        const priorityDiff = (b.priority || 5) - (a.priority || 5);
        if (priorityDiff !== 0) return priorityDiff;
        return b.timestamp - a.timestamp;
      });
  }

  /**
   * 获取合并后的上下文
   */
  getMergedContext(options?: {
    maxTokens?: number;
    types?: ContextSourceType[];
    includeSummary?: boolean;
  }): string {
    const maxTokens = options?.maxTokens || this.config.maxTotalTokens;
    const types = options?.types;

    let sources = this.getAllSources();

    // 按类型过滤
    if (types && types.length > 0) {
      sources = sources.filter(s => types.includes(s.type));
    }

    // 移除过期来源
    sources = this.filterExpired(sources);

    // 按 token 限制截取
    sources = this.limitByTokens(sources, maxTokens);

    // 生成合并文本
    return this.formatMergedContext(sources, options?.includeSummary);
  }

  /**
   * 获取上下文摘要
   */
  getSummary(): {
    totalSources: number;
    totalTokens: number;
    sourcesByType: Record<string, number>;
    oldestSource: number;
    newestSource: number;
  } {
    const sources = Array.from(this.sources.values());
    const now = Date.now();

    const sourcesByType: Record<string, number> = {};
    sources.forEach(s => {
      sourcesByType[s.type] = (sourcesByType[s.type] || 0) + 1;
    });

    return {
      totalSources: sources.length,
      totalTokens: sources.reduce((sum, s) => sum + (s.tokens || 0), 0),
      sourcesByType,
      oldestSource: sources.length > 0 
        ? now - Math.min(...sources.map(s => s.timestamp))
        : 0,
      newestSource: sources.length > 0
        ? now - Math.max(...sources.map(s => s.timestamp))
        : 0
    };
  }

  /**
   * 移除特定来源
   */
  removeSource(id: string): boolean {
    const removed = this.sources.delete(id);
    if (removed) {
      logger.info(`[ContextManager] Removed source: ${id}`);
    }
    return removed;
  }

  /**
   * 清空所有上下文
   */
  clear(): void {
    this.sources.clear();
    logger.info('[ContextManager] Cleared all contexts');
  }

  /**
   * 清理过期上下文
   */
  cleanup(): number {
    const now = Date.now();
    let removed = 0;

    for (const [id, source] of this.sources.entries()) {
      if (now - source.timestamp > this.config.sourceTimeout) {
        this.sources.delete(id);
        removed++;
      }
    }

    if (removed > 0) {
      logger.info(`[ContextManager] Cleaned up ${removed} expired sources`);
    }

    return removed;
  }

  /**
   * 更新配置
   */
  updateConfig(config: Partial<ContextConfig>): void {
    this.config = { ...this.config, ...config };
    logger.info('[ContextManager] Config updated:', this.config);

    if (this.config.enableAutoOptimize) {
      this.optimize();
    }
  }

  /**
   * 优化上下文
   */
  private optimize(): void {
    // 1. 清理过期来源
    this.cleanup();

    // 2. 限制来源数量
    if (this.sources.size > this.config.maxSources) {
      this.limitSources();
    }

    // 3. 压缩内容
    if (this.config.enableCompression) {
      this.compressSources();
    }

    logger.info(`[ContextManager] Optimized: ${this.sources.size} sources remaining`);
  }

  /**
   * 限制来源数量
   */
  private limitSources(): void {
    const sources = this.getAllSources();
    const toRemove = sources.slice(this.config.maxSources);

    toRemove.forEach(source => {
      this.sources.delete(source.id);
      logger.debug(`[ContextManager] Removed low priority source: ${source.id}`);
    });
  }

  /**
   * 压缩来源内容
   */
  private compressSources(): void {
    for (const [id, source] of this.sources.entries()) {
      // 对长内容进行压缩
      if (source.content.length > 2000) {
        const compressed = this.compressText(source.content);
        if (compressed.length < source.content.length) {
          source.content = compressed;
          source.tokens = this.estimateTokens(compressed);
          logger.debug(`[ContextManager] Compressed source ${id}: ${source.tokens} tokens`);
        }
      }
    }
  }

  /**
   * 过滤过期来源
   */
  private filterExpired(sources: ContextSource[]): ContextSource[] {
    const now = Date.now();
    return sources.filter(s => now - s.timestamp <= this.config.sourceTimeout);
  }

  /**
   * 按 token 限制截取
   */
  private limitByTokens(sources: ContextSource[], maxTokens: number): ContextSource[] {
    let totalTokens = 0;
    const result: ContextSource[] = [];

    for (const source of sources) {
      const tokens = source.tokens || 0;
      if (totalTokens + tokens > maxTokens) {
        // 如果超过限制,尝试截取内容
        const remainingTokens = maxTokens - totalTokens;
        if (remainingTokens > 100) { // 至少保留 100 tokens
          const truncated = this.truncateByTokens(source, remainingTokens);
          result.push(truncated);
        }
        break;
      }

      totalTokens += tokens;
      result.push(source);
    }

    return result;
  }

  /**
   * 格式化合并后的上下文
   */
  private formatMergedContext(
    sources: ContextSource[], 
    includeSummary?: boolean
  ): string {
    if (sources.length === 0) {
      return '';
    }

    const parts: string[] = [];

    sources.forEach((source, index) => {
      const header = this.formatSourceHeader(source, includeSummary);
      parts.push(header);
      parts.push(source.content);
      
      if (index < sources.length - 1) {
        parts.push('\n' + '='.repeat(50) + '\n');
      }
    });

    return parts.join('\n');
  }

  /**
   * 格式化来源头部
   */
  private formatSourceHeader(source: ContextSource, includeSummary?: boolean): string {
    const parts: string[] = [];

    // 类型标记
    parts.push(`[${source.type.toUpperCase()}]`);

    // 摘要或标题
    if (source.summary) {
      parts.push(source.summary);
    } else if (source.metadata.title) {
      parts.push(source.metadata.title);
    } else if (source.metadata.fileName) {
      parts.push(source.metadata.fileName);
    }

    // 元信息
    const metaParts: string[] = [];
    if (source.metadata.url) {
      metaParts.push(`URL: ${source.metadata.url}`);
    }
    if (source.metadata.language) {
      metaParts.push(`Language: ${source.metadata.language}`);
    }
    if (source.metadata.filename) {
      metaParts.push(`File: ${source.metadata.filename}`);
    }

    if (metaParts.length > 0) {
      parts.push(`(${metaParts.join(', ')})`);
    }

    return parts.join(' ');
  }

  /**
   * 生成文本摘要
   */
  private generateSummary(text: string, maxLength: number): string {
    if (text.length <= maxLength) {
      return text;
    }

    // 简单策略: 取前 maxLength 字符
    return text.substring(0, maxLength) + '...';
  }

  /**
   * 压缩文本
   */
  private compressText(text: string): string {
    // 移除多余空白
    text = text.replace(/\s+/g, ' ').trim();

    // 移除空行
    text = text.replace(/\n\s*\n/g, '\n');

    // 如果还是太长,进一步压缩
    if (text.length > 2000) {
      return this.generateSummary(text, 2000);
    }

    return text;
  }

  /**
   * 按 token 截断
   */
  private truncateByTokens(source: ContextSource, maxTokens: number): ContextSource {
    const maxChars = Math.floor(maxTokens / this.estimatedTokensPerChar);
    const truncated = source.content.substring(0, maxChars);

    return {
      ...source,
      content: truncated + '... [truncated]',
      tokens: maxTokens,
      metadata: {
        ...source.metadata,
        truncated: true,
        originalTokens: source.tokens
      }
    };
  }

  /**
   * 估算 token 数量
   */
  private estimateTokens(text: string): number {
    // 粗略估算: 英文约 1 token = 4 字符,中文约 1 token = 1-2 字符
    // 这里使用简单估算
    return Math.ceil(text.length * this.estimatedTokensPerChar);
  }

  /**
   * 生成唯一 ID
   */
  private generateId(prefix: string): string {
    return `${prefix}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * 获取来源详情
   */
  getSource(id: string): ContextSource | undefined {
    return this.sources.get(id);
  }

  /**
   * 更新来源优先级
   */
  updatePriority(id: string, priority: number): boolean {
    const source = this.sources.get(id);
    if (!source) return false;

    source.priority = Math.max(1, Math.min(10, priority));
    logger.debug(`[ContextManager] Updated priority of ${id} to ${source.priority}`);
    return true;
  }
}

// 导出单例
export const contextManager = new ContextManager();
