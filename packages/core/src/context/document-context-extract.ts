// 文档上下文提取器 - 从各种文档格式中提取文本内容

import { DocumentContext } from '../context/context-manager';
import { logger } from '../utils/logger';

/**
 * 支持的文档类型
 */
export type SupportedDocType = 
  | 'text/plain'
  | 'text/html'
  | 'text/markdown'
  | 'application/pdf'
  | 'application/msword'
  | 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
  | 'application/vnd.ms-excel'
  | 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
  | 'application/vnd.ms-powerpoint'
  | 'application/vnd.openxmlformats-officedocument.presentationml.presentation';

/**
 * 文档提取选项
 */
export interface DocumentExtractOptions {
  maxLength?: number;         // 最大长度
  extractMetadata?: boolean;  // 是否提取元数据
  pageCount?: number;         // PDF/Word 页数限制
}

/**
 * 默认提取选项
 */
const DEFAULT_OPTIONS: DocumentExtractOptions = {
  maxLength: 15000,
  extractMetadata: true,
  pageCount: 10
};

/**
 * 文档上下文提取器
 * 
 * 功能:
 * 1. 支持多种文档格式
 * 2. 智能文本提取
 * 3. 元数据提取
 * 4. 长度控制
 */
export class DocumentContextExtract {
  private options: DocumentExtractOptions;

  constructor(options?: Partial<DocumentExtractOptions>) {
    this.options = { ...DEFAULT_OPTIONS, ...options };
  }

  /**
   * 从 File 对象提取文档上下文
   */
  async extractFromFile(file: File): Promise<DocumentContext | null> {
    try {
      logger.info(`[DocumentContextExtract] Extracting from: ${file.name} (${file.type})`);

      const fileType = this.detectFileType(file);
      
      let content = '';
      let pageCount: number | undefined;

      switch (fileType) {
        case 'text':
          content = await this.extractTextFile(file);
          break;
        case 'pdf':
          const pdfResult = await this.extractPDF(file);
          content = pdfResult.content;
          pageCount = pdfResult.pageCount;
          break;
        case 'html':
          content = await this.extractHTML(file);
          break;
        case 'markdown':
          content = await this.extractMarkdown(file);
          break;
        default:
          logger.warn(`[DocumentContextExtract] Unsupported file type: ${file.type}`);
          content = await this.extractTextFile(file); // 尝试作为文本读取
      }

      // 限制长度
      if (this.options.maxLength && content.length > this.options.maxLength) {
        content = content.substring(0, this.options.maxLength) + '... [truncated]';
      }

      const docContext: DocumentContext = {
        fileName: file.name,
        fileType: file.type,
        content,
        metadata: {
          fileSize: file.size,
          pageCount,
          extractedAt: Date.now()
        }
      };

      logger.info(`[DocumentContextExtract] Extracted: ${content.length} chars, ${pageCount} pages`);
      return docContext;
    } catch (error) {
      logger.error('[DocumentContextExtract] Failed to extract document:', error);
      return null;
    }
  }

  /**
   * 从 ArrayBuffer 提取
   */
  async extractFromArrayBuffer(
    buffer: ArrayBuffer, 
    fileName: string, 
    fileType: string
  ): Promise<DocumentContext | null> {
    const file = new File([buffer], fileName, { type: fileType });
    return this.extractFromFile(file);
  }

  /**
   * 从文本字符串提取
   */
  async extractFromText(
    text: string, 
    fileName: string = 'text.txt',
    fileType: string = 'text/plain'
  ): Promise<DocumentContext> {
    let content = text;

    if (this.options.maxLength && content.length > this.options.maxLength) {
      content = content.substring(0, this.options.maxLength) + '...';
    }

    return {
      fileName,
      fileType,
      content,
      metadata: {
        fileSize: text.length,
        extractedAt: Date.now()
      }
    };
  }

  /**
   * 检测文件类型
   */
  private detectFileType(file: File): string {
    const type = file.type.toLowerCase();
    const name = file.name.toLowerCase();

    // 按 MIME 类型检测
    if (type.includes('pdf')) return 'pdf';
    if (type.includes('html')) return 'html';
    if (type.includes('markdown') || name.endsWith('.md')) return 'markdown';
    if (type.includes('text')) return 'text';
    if (type.includes('word') || name.endsWith('.doc') || name.endsWith('.docx')) return 'word';
    if (type.includes('excel') || name.endsWith('.xls') || name.endsWith('.xlsx')) return 'excel';
    if (type.includes('powerpoint') || name.endsWith('.ppt') || name.endsWith('.pptx')) return 'powerpoint';

    // 默认按文本处理
    return 'text';
  }

  /**
   * 提取文本文件
   */
  private async extractTextFile(file: File): Promise<string> {
    return await file.text();
  }

  /**
   * 提取 HTML 文件
   */
  private async extractHTML(file: File): Promise<string> {
    const html = await file.text();
    
    // 简单的 HTML 文本提取
    if (typeof DOMParser !== 'undefined') {
      const parser = new DOMParser();
      const doc = parser.parseFromString(html, 'text/html');
      return doc.body.textContent || '';
    }

    // 如果没有 DOMParser,使用正则简单提取
    return html
      .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
      .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
      .replace(/<[^>]+>/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  }

  /**
   * 提取 Markdown 文件
   */
  private async extractMarkdown(file: File): Promise<string> {
    const markdown = await file.text();
    
    // 移除 Markdown 标记,保留纯文本
    return markdown
      // 移除标题标记
      .replace(/^#{1,6}\s+/gm, '')
      // 移除粗体/斜体标记
      .replace(/\*{1,2}([^*]+)\*{1,2}/g, '$1')
      .replace(/_{1,2}([^_]+)_{1,2}/g, '$1')
      // 移除链接
      .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
      // 移除图片
      .replace(/!\[([^\]]*)\]\([^)]+\)/g, '$1')
      // 移除代码块标记
      .replace(/```[\s\S]*?```/g, (match) => {
        return match.replace(/```/g, '').trim();
      })
      // 移除行内代码
      .replace(/`([^`]+)`/g, '$1')
      // 移除列表标记
      .replace(/^[\s]*[-*+]\s+/gm, '')
      .replace(/^[\s]*\d+\.\s+/gm, '')
      // 移除引用标记
      .replace(/^>\s+/gm, '')
      // 移除水平线
      .replace(/^[-*_]{3,}$/gm, '')
      .trim();
  }

  /**
   * 提取 PDF 文件
   */
  private async extractPDF(file: File): Promise<{ content: string; pageCount?: number }> {
    try {
      // 尝试使用 pdfjs-dist (如果可用)
      const pdfjsLib = await this.loadPDFJS();
      
      if (!pdfjsLib) {
        logger.warn('[DocumentContextExtract] PDF.js not available, reading as text');
        return { content: await file.text() };
      }

      const arrayBuffer = await file.arrayBuffer();
      const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
      
      const textParts: string[] = [];
      const maxPages = this.options.pageCount || 10;
      const pagesToExtract = Math.min(pdf.numPages, maxPages);

      for (let i = 1; i <= pagesToExtract; i++) {
        const page = await pdf.getPage(i);
        const textContent = await page.getTextContent();
        const pageText = textContent.items
          .map((item: any) => item.str)
          .join(' ');
        
        if (pageText.trim()) {
          textParts.push(pageText);
        }
      }

      return {
        content: textParts.join('\n\n'),
        pageCount: pdf.numPages
      };
    } catch (error) {
      logger.error('[DocumentContextExtract] PDF extraction failed:', error);
      // 降级方案: 作为文本读取
      return { content: await file.text() };
    }
  }

  /**
   * 加载 PDF.js
   */
  private async loadPDFJS(): Promise<any> {
    try {
      // 尝试动态导入
      const pdfjs = await import('pdfjs-dist');
      return pdfjs.default || pdfjs;
    } catch (error) {
      logger.debug('[DocumentContextExtract] PDF.js not available');
      return null;
    }
  }

  /**
   * 更新提取选项
   */
  updateOptions(options: Partial<DocumentExtractOptions>): void {
    this.options = { ...this.options, ...options };
  }
}

// 导出单例
export const documentContextExtract = new DocumentContextExtract();
