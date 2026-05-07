// 网页内容提取服务

import { logger } from '../utils/logger';

export interface ExtractionOptions {
  useProxy?: boolean;
}

export interface ExtractionTrace {
  engine: string;
  status: 'success' | 'failed' | 'skipped';
  reason?: string;
  durationMs?: number;
}

export interface ExtractionResult {
  content: string;
  title: string;
  metadata: Record<string, string>;
  engine?: string;
  sourceEngine?: string;
  confidence?: number;
  trace?: ExtractionTrace[];
  fallbackTrace?: string[];
}

/**
 * 网页内容提取服务
 */
export class WebContentExtractionService {
  /**
   * 兼容调度器接口：按 URL 提取网页内容
   */
  async extractFromUrl(url: string, options: ExtractionOptions = {}): Promise<ExtractionResult> {
    const startedAt = Date.now()
    try {
      const response = await fetch(url)
      if (!response.ok) {
        throw new Error(`Failed to fetch url: ${response.status}`)
      }

      const html = await response.text()

      // 在浏览器环境用 DOMParser；在非浏览器环境回退到纯文本结果
      if (typeof DOMParser === 'undefined') {
        return {
          content: html,
          title: url,
          metadata: {},
          engine: 'http',
          sourceEngine: 'http',
          confidence: html.trim().length > 0 ? 0.6 : 0,
          trace: [
            {
              engine: 'http',
              status: 'success',
              durationMs: Date.now() - startedAt,
            },
          ],
          fallbackTrace: [],
        }
      }

      const doc = new DOMParser().parseFromString(html, 'text/html')
      const title = doc.title || url
      const content = (doc.body?.textContent || '').replace(/\s+/g, ' ').trim()
      const metadata: Record<string, string> = {}

      doc.querySelectorAll('meta').forEach(meta => {
        const name =
          meta.getAttribute('name') ||
          meta.getAttribute('property') ||
          meta.getAttribute('http-equiv')
        const value = meta.getAttribute('content')
        if (name && value) {
          metadata[name] = value
        }
      })

      if (options.useProxy !== undefined) {
        metadata.extractionUseProxy = String(options.useProxy)
      }

      return {
        content,
        title,
        metadata,
        engine: 'http',
        sourceEngine: 'http',
        confidence: content.length > 300 ? 0.95 : content.length > 0 ? 0.75 : 0.2,
        trace: [
          {
            engine: 'http',
            status: 'success',
            durationMs: Date.now() - startedAt,
          },
        ],
        fallbackTrace: [],
      }
    } catch (error) {
      logger.error('Error extracting from URL:', error)
      return {
        content: '',
        title: '',
        metadata: {},
        engine: 'http',
        sourceEngine: 'http',
        confidence: 0,
        trace: [
          {
            engine: 'http',
            status: 'failed',
            reason: error instanceof Error ? error.message : String(error),
            durationMs: Date.now() - startedAt,
          },
        ],
        fallbackTrace: [],
      }
    }
  }

  /**
   * 提取网页基本信息
   */
  extractPageInfo(): {
    title: string;
    url: string;
    description: string;
    keywords: string[];
    favicon: string | null;
  } {
    try {
      if (typeof window === 'undefined' || typeof document === 'undefined') {
        return {
          title: '',
          url: '',
          description: '',
          keywords: [],
          favicon: null,
        };
      }

      // 提取标题
      const title = document.title || '';

      // 提取URL
      const url = window.location.href || '';

      // 提取描述
      let description = '';
      const metaDescription = document.querySelector('meta[name="description"]') as HTMLMetaElement;
      if (metaDescription) {
        description = metaDescription.content || '';
      }

      // 提取关键词
      let keywords: string[] = [];
      const metaKeywords = document.querySelector('meta[name="keywords"]') as HTMLMetaElement;
      if (metaKeywords && metaKeywords.content) {
        keywords = metaKeywords.content.split(',').map(keyword => keyword.trim()).filter(Boolean);
      }

      // 提取favicon
      let favicon: string | null = null;
      const faviconElement = document.querySelector('link[rel*="icon"]') as HTMLLinkElement;
      if (faviconElement && faviconElement.href) {
        favicon = faviconElement.href;
      }

      return {
        title,
        url,
        description,
        keywords,
        favicon,
      };
    } catch (error) {
      logger.error('Error extracting page info:', error);
      return {
        title: '',
        url: '',
        description: '',
        keywords: [],
        favicon: null,
      };
    }
  }

  /**
   * 提取网页主要内容
   */
  extractMainContent(): {
    text: string;
    html: string;
    images: string[];
    links: Array<{ text: string; url: string }>;
  } {
    try {
      if (typeof window === 'undefined' || typeof document === 'undefined') {
        return {
          text: '',
          html: '',
          images: [],
          links: [],
        };
      }

      // 提取纯文本
      const text = this.extractTextContent();

      // 提取HTML
      const html = this.extractHtmlContent();

      // 提取图片
      const images = this.extractImages();

      // 提取链接
      const links = this.extractLinks();

      return {
        text,
        html,
        images,
        links,
      };
    } catch (error) {
      logger.error('Error extracting main content:', error);
      return {
        text: '',
        html: '',
        images: [],
        links: [],
      };
    }
  }

  /**
   * 提取纯文本内容
   */
  private extractTextContent(): string {
    try {
      if (typeof document === 'undefined') {
        return '';
      }

      // 创建文档副本以避免修改原始DOM
      const clone = document.cloneNode(true) as Document;

      // 移除脚本和样式元素
      const scripts = clone.querySelectorAll('script, style, iframe, noscript');
      scripts.forEach(el => el.remove());

      // 移除注释
      const walker = document.createTreeWalker(
        clone,
        NodeFilter.SHOW_COMMENT,
        null
      );
      const comments: Comment[] = [];
      let comment;
      while ((comment = walker.nextNode() as Comment)) {
        comments.push(comment);
      }
      comments.forEach(comment => comment.remove());

      // 提取文本
      let text = clone.body.textContent || '';

      // 清理空白字符
      text = text.replace(/\s+/g, ' ').trim();

      return text;
    } catch (error) {
      logger.error('Error extracting text content:', error);
      return '';
    }
  }

  /**
   * 提取HTML内容
   */
  private extractHtmlContent(): string {
    try {
      if (typeof document === 'undefined') {
        return '';
      }

      // 创建文档副本以避免修改原始DOM
      const clone = document.cloneNode(true) as Document;

      // 移除脚本和样式元素
      const scripts = clone.querySelectorAll('script, style, iframe, noscript');
      scripts.forEach(el => el.remove());

      return clone.body.innerHTML || '';
    } catch (error) {
      logger.error('Error extracting HTML content:', error);
      return '';
    }
  }

  /**
   * 提取图片
   */
  private extractImages(): string[] {
    try {
      if (typeof document === 'undefined') {
        return [];
      }

      const images: string[] = [];
      const imgElements = document.querySelectorAll('img');

      imgElements.forEach(img => {
        const src = img.src;
        if (src) {
          images.push(src);
        }
      });

      return images;
    } catch (error) {
      logger.error('Error extracting images:', error);
      return [];
    }
  }

  /**
   * 提取链接
   */
  private extractLinks(): Array<{ text: string; url: string }> {
    try {
      if (typeof document === 'undefined') {
        return [];
      }

      const links: Array<{ text: string; url: string }> = [];
      const linkElements = document.querySelectorAll('a');

      linkElements.forEach(link => {
        const url = link.href;
        const text = link.textContent || '';
        if (url && text.trim()) {
          links.push({ text: text.trim(), url });
        }
      });

      return links;
    } catch (error) {
      logger.error('Error extracting links:', error);
      return [];
    }
  }

  /**
   * 提取结构化数据
   */
  extractStructuredData(): Record<string, any> {
    try {
      if (typeof document === 'undefined') {
        return {};
      }

      const structuredData: Record<string, any> = {};

      // 提取Schema.org数据
      const scriptElements = document.querySelectorAll('script[type="application/ld+json"]');
      scriptElements.forEach(script => {
        try {
          const content = script.textContent;
          if (content) {
            const data = JSON.parse(content);
            structuredData.schemaOrg = data;
          }
        } catch (e) {
          logger.warn('Error parsing Schema.org data:', e);
        }
      });

      // 提取Open Graph数据
      const openGraphData: Record<string, string> = {};
      const ogMetaElements = document.querySelectorAll('meta[property^="og:"]');
      ogMetaElements.forEach(meta => {
        const property = meta.getAttribute('property')?.replace('og:', '');
        const content = meta.getAttribute('content');
        if (property && content) {
          openGraphData[property] = content;
        }
      });
      if (Object.keys(openGraphData).length > 0) {
        structuredData.openGraph = openGraphData;
      }

      // 提取Twitter Card数据
      const twitterCardData: Record<string, string> = {};
      const twitterMetaElements = document.querySelectorAll('meta[name^="twitter:"]');
      twitterMetaElements.forEach(meta => {
        const name = meta.getAttribute('name')?.replace('twitter:', '');
        const content = meta.getAttribute('content');
        if (name && content) {
          twitterCardData[name] = content;
        }
      });
      if (Object.keys(twitterCardData).length > 0) {
        structuredData.twitterCard = twitterCardData;
      }

      return structuredData;
    } catch (error) {
      logger.error('Error extracting structured data:', error);
      return {};
    }
  }

  /**
   * 提取页面统计信息
   */
  extractPageStats(): {
    wordCount: number;
    imageCount: number;
    linkCount: number;
    characterCount: number;
    htmlSize: number;
  } {
    try {
      if (typeof document === 'undefined') {
        return {
          wordCount: 0,
          imageCount: 0,
          linkCount: 0,
          characterCount: 0,
          htmlSize: 0,
        };
      }

      // 计算单词数
      const text = this.extractTextContent();
      const wordCount = text.split(/\s+/).filter(word => word.length > 0).length;

      // 计算图片数
      const imageCount = document.querySelectorAll('img').length;

      // 计算链接数
      const linkCount = document.querySelectorAll('a').length;

      // 计算字符数
      const characterCount = text.length;

      // 计算HTML大小
      const htmlSize = new Blob([document.documentElement.outerHTML]).size;

      return {
        wordCount,
        imageCount,
        linkCount,
        characterCount,
        htmlSize,
      };
    } catch (error) {
      logger.error('Error extracting page stats:', error);
      return {
        wordCount: 0,
        imageCount: 0,
        linkCount: 0,
        characterCount: 0,
        htmlSize: 0,
      };
    }
  }

  /**
   * 提取完整的页面数据
   */
  extractCompletePageData(): {
    pageInfo: {
      title: string;
      url: string;
      description: string;
      keywords: string[];
      favicon: string | null;
    };
    mainContent: {
      text: string;
      html: string;
      images: string[];
      links: Array<{ text: string; url: string }>;
    };
    structuredData: Record<string, any>;
    pageStats: {
      wordCount: number;
      imageCount: number;
      linkCount: number;
      characterCount: number;
      htmlSize: number;
    };
  } {
    return {
      pageInfo: this.extractPageInfo(),
      mainContent: this.extractMainContent(),
      structuredData: this.extractStructuredData(),
      pageStats: this.extractPageStats(),
    };
  }

  /**
   * 智能提取主要内容区块
   */
  extractMainContentBlock(): HTMLElement | null {
    try {
      if (typeof document === 'undefined') {
        return null;
      }

      // 常用的主内容容器选择器
      const mainSelectors = [
        'main',
        '#main',
        '#content',
        '.main-content',
        '.content',
        '.article',
        '.post',
        '.entry-content',
        '.article-content',
        '.post-content',
      ];

      // 尝试找到主内容容器
      for (const selector of mainSelectors) {
        const element = document.querySelector(selector);
        if (element) {
          return element as HTMLElement;
        }
      }

      // 分析页面结构，找到内容最丰富的区块
      const bodyChildren = Array.from(document.body.children);
      let mainBlock: HTMLElement | null = null;
      let maxTextLength = 0;

      bodyChildren.forEach(child => {
        if (child instanceof HTMLElement) {
          const textLength = child.textContent?.length || 0;
          if (textLength > maxTextLength) {
            maxTextLength = textLength;
            mainBlock = child;
          }
        }
      });

      return mainBlock;
    } catch (error) {
      logger.error('Error extracting main content block:', error);
      return null;
    }
  }

  /**
   * 提取页面标题（智能）
   */
  extractSmartTitle(): string {
    try {
      if (typeof document === 'undefined') {
        return '';
      }

      // 优先使用h1标签
      const h1 = document.querySelector('h1');
      if (h1 && h1.textContent) {
        return h1.textContent.trim();
      }

      // 其次使用h2标签
      const h2 = document.querySelector('h2');
      if (h2 && h2.textContent) {
        return h2.textContent.trim();
      }

      // 最后使用页面标题
      return document.title || '';
    } catch (error) {
      logger.error('Error extracting smart title:', error);
      return '';
    }
  }
}

// 导出单例实例
export const webContentExtractionService = new WebContentExtractionService();
