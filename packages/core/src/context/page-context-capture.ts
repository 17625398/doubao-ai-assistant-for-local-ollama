// 页面上下文捕获器 - 从网页中提取有用的上下文信息

import { PageContext } from '../context/context-manager';
import { logger } from '../utils/logger';

/**
 * 页面内容提取选项
 */
export interface ExtractOptions {
  maxLength?: number;          // 最大长度
  extractLinks?: boolean;      // 是否提取链接
  extractImages?: boolean;     // 是否提取图片
  removeScripts?: boolean;     // 是否移除脚本
  removeStyles?: boolean;      // 是否移除样式
  onlyMainContent?: boolean;   // 只提取主要内容
}

/**
 * 默认提取选项
 */
const DEFAULT_EXTRACT_OPTIONS: ExtractOptions = {
  maxLength: 10000,
  extractLinks: false,
  extractImages: false,
  removeScripts: true,
  removeStyles: true,
  onlyMainContent: true
};

/**
 * 页面上下文捕获器
 * 
 * 功能:
 * 1. 提取页面文本内容
 * 2. 提取页面元数据
 * 3. 智能识别主要内容
 * 4. 过滤无关内容
 */
export class PageContextCapture {
  private options: ExtractOptions;

  constructor(options?: Partial<ExtractOptions>) {
    this.options = { ...DEFAULT_EXTRACT_OPTIONS, ...options };
  }

  /**
   * 捕获当前页面上下文
   */
  async captureCurrentPage(): Promise<PageContext | null> {
    try {
      if (typeof document === 'undefined') {
        logger.warn('[PageContextCapture] Not in browser environment');
        return null;
      }

      logger.info('[PageContextCapture] Capturing current page...');

      // 提取页面内容
      const content = this.extractPageContent();
      
      // 提取元数据
      const metadata = this.extractMetadata();

      const pageContext: PageContext = {
        url: window.location.href,
        title: document.title,
        content,
        metadata: {
          domain: window.location.hostname,
          language: metadata.language,
          wordCount: content.length,
          capturedAt: Date.now()
        }
      };

      logger.info(`[PageContextCapture] Captured: ${pageContext.title} (${content.length} chars)`);
      return pageContext;
    } catch (error) {
      logger.error('[PageContextCapture] Failed to capture page:', error);
      return null;
    }
  }

  /**
   * 从 HTML 字符串捕获
   */
  captureFromHTML(html: string, baseUrl?: string): PageContext | null {
    try {
      if (typeof DOMParser === 'undefined') {
        logger.warn('[PageContextCapture] DOMParser not available');
        return null;
      }

      const parser = new DOMParser();
      const doc = parser.parseFromString(html, 'text/html');

      // 临时替换 document 以提取内容
      const originalDocument = globalThis.document;
      (globalThis as any).document = doc;

      try {
        const content = this.extractPageContent();
        const metadata = this.extractMetadata();

        return {
          url: baseUrl || doc.URL || '',
          title: doc.title || 'Unknown',
          content,
          metadata: {
            domain: baseUrl ? new URL(baseUrl).hostname : 'unknown',
            language: metadata.language,
            wordCount: content.length,
            capturedAt: Date.now()
          }
        };
      } finally {
        (globalThis as any).document = originalDocument;
      }
    } catch (error) {
      logger.error('[PageContextCapture] Failed to capture from HTML:', error);
      return null;
    }
  }

  /**
   * 提取页面内容
   */
  private extractPageContent(): string {
    if (typeof document === 'undefined') return '';

    let body = document.body;

    // 如果只提取主要内容,尝试找到主要容器
    if (this.options.onlyMainContent) {
      const mainContent = this.findMainContent();
      if (mainContent) {
        body = mainContent;
      }
    }

    // 克隆节点以避免修改原页面
    const clone = body.cloneNode(true) as HTMLElement;

    // 移除不需要的元素
    this.removeUnwantedElements(clone);

    // 提取文本
    let text = this.extractTextFromElement(clone);

    // 清理文本
    text = this.cleanText(text);

    // 限制长度
    if (this.options.maxLength && text.length > this.options.maxLength) {
      text = text.substring(0, this.options.maxLength) + '...';
    }

    return text;
  }

  /**
   * 查找主要内容区域
   */
  private findMainContent(): HTMLElement | null {
    // 尝试常见的主要内容选择器
    const selectors = [
      'article',
      'main',
      '[role="main"]',
      '.main-content',
      '.content',
      '.post',
      '.article',
      '#content',
      '#main',
      '.container',
      '.entry-content'
    ];

    for (const selector of selectors) {
      const element = document.querySelector(selector);
      if (element && element.textContent && element.textContent.length > 100) {
        return element as HTMLElement;
      }
    }

    return null;
  }

  /**
   * 移除不需要的元素
   */
  private removeUnwantedElements(element: HTMLElement): void {
    // 移除脚本和样式
    if (this.options.removeScripts) {
      element.querySelectorAll('script').forEach(el => el.remove());
    }
    if (this.options.removeStyles) {
      element.querySelectorAll('style').forEach(el => el.remove());
    }

    // 移除导航、页脚等
    const unwantedSelectors = [
      'nav',
      'footer',
      'header',
      '.nav',
      '.navigation',
      '.footer',
      '.sidebar',
      '.ad',
      '.advertisement',
      '.cookie-banner',
      '.popup',
      '.modal'
    ];

    unwantedSelectors.forEach(selector => {
      try {
        element.querySelectorAll(selector).forEach(el => el.remove());
      } catch (e) {
        // 忽略选择器错误
      }
    });
  }

  /**
   * 从元素提取文本
   */
  private extractTextFromElement(element: HTMLElement): string {
    const parts: string[] = [];

    // 提取标题
    const headings = element.querySelectorAll('h1, h2, h3');
    headings.forEach(heading => {
      const text = heading.textContent?.trim();
      if (text) {
        parts.push(text);
      }
    });

    // 提取段落
    const paragraphs = element.querySelectorAll('p, li, td, th');
    paragraphs.forEach(p => {
      const text = p.textContent?.trim();
      if (text && text.length > 20) { // 过滤太短的文本
        parts.push(text);
      }
    });

    // 如果没有找到结构化内容,使用整体文本
    if (parts.length === 0) {
      const text = element.textContent?.trim();
      if (text) {
        parts.push(text);
      }
    }

    return parts.join('\n\n');
  }

  /**
   * 清理文本
   */
  private cleanText(text: string): string {
    return text
      // 移除多余空白
      .replace(/\s+/g, ' ')
      // 移除空行
      .replace(/\n\s*\n/g, '\n')
      // 移除特殊字符
      .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '')
      // 修剪
      .trim();
  }

  /**
   * 提取页面元数据
   */
  private extractMetadata(): {
    language?: string;
    description?: string;
    keywords?: string;
    author?: string;
  } {
    const metadata: Record<string, string> = {};

    if (typeof document === 'undefined') {
      return metadata;
    }

    // 提取语言
    metadata.language = document.documentElement.lang || 
                        navigator.language || 
                        'unknown';

    // 提取 meta 标签
    const metaTags = document.querySelectorAll('meta');
    metaTags.forEach(meta => {
      const name = meta.getAttribute('name') || meta.getAttribute('property');
      const content = meta.getAttribute('content');
      
      if (name && content) {
        if (name.includes('description')) {
          metadata.description = content;
        } else if (name.includes('keywords')) {
          metadata.keywords = content;
        } else if (name.includes('author')) {
          metadata.author = content;
        }
      }
    });

    return metadata;
  }

  /**
   * 更新提取选项
   */
  updateOptions(options: Partial<ExtractOptions>): void {
    this.options = { ...this.options, ...options };
  }
}

// 导出单例
export const pageContextCapture = new PageContextCapture();
