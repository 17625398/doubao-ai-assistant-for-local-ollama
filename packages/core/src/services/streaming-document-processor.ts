/**
 * 流式文档处理器
 * 用于高效处理大型文档，支持分块处理和进度跟踪
 */

import { logger } from '../utils/logger';

logger.setPrefix('[StreamingDocumentProcessor]');

// ========================================
// 类型定义
// ========================================

export interface StreamingOptions {
  /** 块大小（字符数） */
  chunkSize?: number;
  /** 块重叠大小（字符数） */
  chunkOverlap?: number;
  /** 最大并发处理数 */
  maxConcurrency?: number;
  /** 是否启用进度跟踪 */
  enableProgress?: boolean;
  /** 处理间隔（ms） */
  processingInterval?: number;
}

export interface ChunkResult {
  index: number;
  text: string;
  startOffset: number;
  endOffset: number;
  isLast: boolean;
  processingTime: number;
}

export interface StreamingProgress {
  totalChunks: number;
  processedChunks: number;
  totalChars: number;
  processedChars: number;
  percentage: number;
  currentChunkIndex: number;
  startTime: number;
  estimatedTimeRemaining?: number;
}

export interface ProcessResult {
  chunks: ChunkResult[];
  totalProcessingTime: number;
  success: boolean;
  error?: string;
}

export type ProgressCallback = (progress: StreamingProgress) => void;
export type ChunkCallback = (chunk: ChunkResult) => void | Promise<void>;

// ========================================
// 智能文本分割器
// ========================================

class SmartTextSplitter {
  private chunkSize: number;
  private chunkOverlap: number;
  
  // 分割标记（按优先级）
  private separators = [
    // 段落分割
    '\n\n',
    // 句子分割
    '。', '！', '？', '. ', '! ', '? ',
    // 换行
    '\n',
    // 其他
    ';', '，', ', ',
  ];
  
  constructor(chunkSize: number = 2000, chunkOverlap: number = 200) {
    this.chunkSize = chunkSize;
    this.chunkOverlap = chunkOverlap;
  }
  
  /**
   * 智能分割文本
   */
  split(text: string): ChunkResult[] {
    if (!text || text.length === 0) return [];
    
    const chunks: ChunkResult[] = [];
    let startOffset = 0;
    let index = 0;
    
    while (startOffset < text.length) {
      const endOffset = Math.min(startOffset + this.chunkSize, text.length);
      let actualEnd = endOffset;
      
      // 如果不是最后一块，尝试在句子边界分割
      if (endOffset < text.length) {
        actualEnd = this.findOptimalSplitPoint(text, startOffset, endOffset);
      }
      
      const chunkText = text.slice(startOffset, actualEnd);
      const processingTime = Date.now();
      
      chunks.push({
        index,
        text: chunkText,
        startOffset,
        endOffset: actualEnd,
        isLast: actualEnd >= text.length,
        processingTime,
      });
      
      // 计算下一个起始位置（包含重叠）
      startOffset = actualEnd - this.chunkOverlap;
      if (startOffset <= chunks[chunks.length - 1].startOffset) {
        // 防止无限循环
        startOffset = actualEnd;
      }
      
      index++;
    }
    
    // 标记最后一个块
    if (chunks.length > 0) {
      chunks[chunks.length - 1].isLast = true;
    }
    
    return chunks;
  }
  
  /**
   * 找到最佳分割点
   */
  private findOptimalSplitPoint(text: string, start: number, maxEnd: number): number {
    // 向前查找最佳分割点
    for (const separator of this.separators) {
      const searchStart = Math.max(start, maxEnd - 200);
      const separatorIndex = text.lastIndexOf(separator, maxEnd);
      
      if (separatorIndex > searchStart) {
        // 跳过分隔符本身
        return separatorIndex + separator.length;
      }
    }
    
    // 如果没找到合适的分割点，在单词边界分割
    const spaceIndex = text.lastIndexOf(' ', maxEnd);
    if (spaceIndex > start) {
      return spaceIndex + 1;
    }
    
    // 不得已，在 maxEnd 分割
    return maxEnd;
  }
}

// ========================================
// 文档内容检测器
// ========================================

class DocumentContentDetector {
  /**
   * 检测文档类型
   */
  detect(content: string): DocumentType {
    // 检测是否为 Markdown
    if (this.isMarkdown(content)) {
      return 'markdown';
    }
    
    // 检测是否为 HTML
    if (this.isHtml(content)) {
      return 'html';
    }
    
    // 检测是否为 JSON
    if (this.isJson(content)) {
      return 'json';
    }
    
    // 检测是否为代码
    if (this.isCode(content)) {
      return 'code';
    }
    
    // 默认纯文本
    return 'text';
  }
  
  private isMarkdown(content: string): boolean {
    const markdownPatterns = [
      /^#{1,6}\s/m,
      /\*\*.+\*\*/m,
      /__.+__/m,
      /\[.+\]\(.+\)/m,
      /!\[.+\]\(.+\)/m,
      /^[-*]\s/m,
      /^\d+\.\s/m,
      /^```/m,
    ];
    
    return markdownPatterns.some(pattern => pattern.test(content));
  }
  
  private isHtml(content: string): boolean {
    const htmlPatterns = [
      /<html/i,
      /<head/i,
      /<body/i,
      /<div/i,
      /<p>/i,
      /<span/i,
    ];
    
    return htmlPatterns.some(pattern => pattern.test(content));
  }
  
  private isJson(content: string): boolean {
    try {
      JSON.parse(content);
      return true;
    } catch {
      return false;
    }
  }
  
  private isCode(content: string): boolean {
    const codePatterns = [
      /^import\s+/m,
      /^export\s+/m,
      /^function\s+/m,
      /^const\s+/m,
      /^let\s+/m,
      /^var\s+/m,
      /^class\s+/m,
      /^def\s+/m,
      /^public\s+/m,
      /^private\s+/m,
      /^{[\s\S]*}$/,
      /\([\s\S]*\)\s*{/,
    ];
    
    return codePatterns.some(pattern => pattern.test(content));
  }
  
  /**
   * 检测语言（用于代码块）
   */
  detectLanguage(content: string): string | null {
    const patterns: [RegExp, string][] = [
      [/^import\s+.*from\s+['"`]/m, 'javascript'],
      [/^export\s+(default\s+)?/m, 'javascript'],
      [/^from\s+['"@]/m, 'python'],
      [/^def\s+\w+\s*\(/m, 'python'],
      [/^public\s+(class|interface|enum)/m, 'java'],
      [/^namespace\s+\w+/m, 'c#'],
      [/^package\s+\w+/m, 'go'],
      [/^fn\s+\w+\s*\(/m, 'rust'],
      [/^func\s+\w+\s*\(/m, 'go'],
      [/<\?php/m, 'php'],
      [/^<!DOCTYPE html>/im, 'html'],
      [/^<\?xml/m, 'xml'],
    ];
    
    for (const [pattern, lang] of patterns) {
      if (pattern.test(content)) {
        return lang;
      }
    }
    
    return null;
  }
}

type DocumentType = 'markdown' | 'html' | 'json' | 'code' | 'text';

// ========================================
// 主处理器类
// ========================================

export class StreamingDocumentProcessor {
  private options: Required<StreamingOptions>;
  private splitter: SmartTextSplitter;
  private detector: DocumentContentDetector;
  
  constructor(options: StreamingOptions = {}) {
    this.options = {
      chunkSize: options.chunkSize || 2000,
      chunkOverlap: options.chunkOverlap || 200,
      maxConcurrency: options.maxConcurrency || 3,
      enableProgress: options.enableProgress !== false,
      processingInterval: options.processingInterval || 0,
    };
    
    this.splitter = new SmartTextSplitter(
      this.options.chunkSize,
      this.options.chunkOverlap
    );
    
    this.detector = new DocumentContentDetector();
  }
  
  /**
   * 流式处理文档
   */
  async process(
    content: string,
    onProgress?: ProgressCallback,
    onChunk?: ChunkCallback
  ): Promise<ProcessResult> {
    const startTime = Date.now();
    
    try {
      // 检测文档类型
      const docType = this.detector.detect(content);
      logger.debug(`Detected document type: ${docType}`);
      
      // 分割文档
      const rawChunks = this.splitter.split(content);
      
      if (rawChunks.length === 0) {
        return {
          chunks: [],
          totalProcessingTime: Date.now() - startTime,
          success: true,
        };
      }
      
      // 初始化进度
      let processedChunks = 0;
      const progress: StreamingProgress = {
        totalChunks: rawChunks.length,
        processedChunks: 0,
        totalChars: content.length,
        processedChars: 0,
        percentage: 0,
        currentChunkIndex: 0,
        startTime,
      };
      
      if (this.options.enableProgress && onProgress) {
        onProgress(progress);
      }
      
      // 处理每个块
      const processedResults: ChunkResult[] = [];
      
      for (let i = 0; i < rawChunks.length; i++) {
        const chunk = rawChunks[i];
        
        // 增强块内容
        const enhancedChunk = await this.enhanceChunk(chunk, docType);
        
        processedResults.push(enhancedChunk);
        processedChunks++;
        progress.processedChunks = processedChunks;
        progress.processedChars += chunk.text.length;
        progress.percentage = Math.round((processedChunks / rawChunks.length) * 100);
        progress.currentChunkIndex = i;
        
        // 计算预计剩余时间
        const elapsed = Date.now() - startTime;
        const avgTimePerChunk = elapsed / processedChunks;
        const remainingChunks = rawChunks.length - processedChunks;
        progress.estimatedTimeRemaining = Math.round(avgTimePerChunk * remainingChunks);
        
        if (this.options.enableProgress && onProgress) {
          onProgress(progress);
        }
        
        if (onChunk) {
          await onChunk(enhancedChunk);
        }
        
        // 处理间隔
        if (this.options.processingInterval > 0) {
          await this.delay(this.options.processingInterval);
        }
      }
      
      return {
        chunks: processedResults,
        totalProcessingTime: Date.now() - startTime,
        success: true,
      };
      
    } catch (error) {
      logger.error('Document processing failed:', error);
      return {
        chunks: [],
        totalProcessingTime: Date.now() - startTime,
        success: false,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }
  
  /**
   * 并行流式处理
   */
  async processParallel(
    content: string,
    onProgress?: ProgressCallback,
    onChunk?: ChunkCallback
  ): Promise<ProcessResult> {
    const startTime = Date.now();
    
    try {
      const docType = this.detector.detect(content);
      const rawChunks = this.splitter.split(content);
      
      if (rawChunks.length === 0) {
        return {
          chunks: [],
          totalProcessingTime: Date.now() - startTime,
          success: true,
        };
      }
      
      const processedResults: ChunkResult[] = [];
      let processedChunks = 0;
      
      const progress: StreamingProgress = {
        totalChunks: rawChunks.length,
        processedChunks: 0,
        totalChars: content.length,
        processedChars: 0,
        percentage: 0,
        currentChunkIndex: 0,
        startTime,
      };
      
      // 分批处理
      for (let i = 0; i < rawChunks.length; i += this.options.maxConcurrency) {
        const batch = rawChunks.slice(i, i + this.options.maxConcurrency);
        
        const batchPromises = batch.map(async (chunk, batchIndex) => {
          const enhancedChunk = await this.enhanceChunk(chunk, docType);
          return { chunk: enhancedChunk, originalIndex: i + batchIndex };
        });
        
        const batchResults = await Promise.all(batchPromises);
        
        // 按原始顺序排序
        batchResults.sort((a, b) => a.originalIndex - b.originalIndex);
        
        for (const result of batchResults) {
          processedResults.push(result.chunk);
          processedChunks++;
          
          progress.processedChunks = processedChunks;
          progress.processedChars += result.chunk.text.length;
          progress.percentage = Math.round((processedChunks / rawChunks.length) * 100);
          progress.currentChunkIndex = result.originalIndex;
          
          const elapsed = Date.now() - startTime;
          const avgTimePerChunk = elapsed / processedChunks;
          const remainingChunks = rawChunks.length - processedChunks;
          progress.estimatedTimeRemaining = Math.round(avgTimePerChunk * remainingChunks);
          
          if (this.options.enableProgress && onProgress) {
            onProgress(progress);
          }
          
          if (onChunk) {
            await onChunk(result.chunk);
          }
        }
      }
      
      return {
        chunks: processedResults,
        totalProcessingTime: Date.now() - startTime,
        success: true,
      };
      
    } catch (error) {
      logger.error('Parallel document processing failed:', error);
      return {
        chunks: [],
        totalProcessingTime: Date.now() - startTime,
        success: false,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }
  
  /**
   * 增强单个块
   */
  private async enhanceChunk(chunk: ChunkResult, docType: string): Promise<ChunkResult> {
    const startTime = Date.now();
    let enhancedText = chunk.text;
    
    switch (docType) {
      case 'markdown':
        enhancedText = this.enhanceMarkdownChunk(chunk.text);
        break;
      case 'html':
        enhancedText = this.enhanceHtmlChunk(chunk.text);
        break;
      case 'code':
        enhancedText = this.enhanceCodeChunk(chunk.text);
        break;
      case 'json':
        enhancedText = this.enhanceJsonChunk(chunk.text);
        break;
      default:
        enhancedText = this.enhanceTextChunk(chunk.text);
    }
    
    return {
      ...chunk,
      text: enhancedText,
      processingTime: Date.now() - startTime,
    };
  }
  
  /**
   * 增强 Markdown 块
   */
  private enhanceMarkdownChunk(text: string): string {
    // 清理多余的空行
    let result = text.replace(/\n{3,}/g, '\n\n');
    
    // 确保标题格式正确
    result = result.replace(/^#{1,6}[^#]/gm, (match) => {
      const level = match.match(/^#+/)?.[0].length || 1;
      return ' '.repeat(level) + match;
    });
    
    return result;
  }
  
  /**
   * 增强 HTML 块
   */
  private enhanceHtmlChunk(text: string): string {
    // 移除注释
    let result = text.replace(/<!--[\s\S]*?-->/g, '');
    
    // 规范化空白
    result = result.replace(/\s+/g, ' ');
    
    return result;
  }
  
  /**
   * 增强代码块
   */
  private enhanceCodeChunk(text: string): string {
    // 检测语言
    const language = this.detector.detectLanguage(text);
    
    // 清理空白
    let result = text.split('\n')
      .map(line => line.trimEnd())
      .join('\n');
    
    return result;
  }
  
  /**
   * 增强 JSON 块
   */
  private enhanceJsonChunk(text: string): string {
    try {
      const parsed = JSON.parse(text);
      return JSON.stringify(parsed, null, 2);
    } catch {
      return text;
    }
  }
  
  /**
   * 增强纯文本块
   */
  private enhanceTextChunk(text: string): string {
    // 规范化空白
    let result = text.replace(/\s+/g, ' ');
    
    // 确保句子之间有空格
    result = result.replace(/([。！？])\s*([A-Za-z0-9])/g, '$1 $2');
    result = result.replace(/([A-Za-z0-9])\s*([。！？])/g, '$1 $2');
    
    return result;
  }
  
  /**
   * 延迟
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
  
  /**
   * 合并块结果
   */
  static mergeChunks(chunks: ChunkResult[]): string {
    return chunks.map(c => c.text).join('');
  }
  
  /**
   * 获取处理统计
   */
  static getStats(chunks: ChunkResult[]): {
    totalChunks: number;
    totalChars: number;
    avgChunkSize: number;
    totalProcessingTime: number;
    avgProcessingTime: number;
  } {
    const totalChars = chunks.reduce((sum, c) => sum + c.text.length, 0);
    const totalProcessingTime = chunks.reduce((sum, c) => sum + c.processingTime, 0);
    
    return {
      totalChunks: chunks.length,
      totalChars,
      avgChunkSize: chunks.length > 0 ? Math.round(totalChars / chunks.length) : 0,
      totalProcessingTime,
      avgProcessingTime: chunks.length > 0 ? Math.round(totalProcessingTime / chunks.length) : 0,
    };
  }
}

// 导出
export const streamingDocumentProcessor = new StreamingDocumentProcessor();
