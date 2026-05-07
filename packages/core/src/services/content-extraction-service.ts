// 内容提取服务

import { logger } from '../utils/logger';
import { eventBus } from '../utils/event-bus';
import { ContentExtractionResult, ExtractedContent, ExtractionOptions } from '../types';
import { cacheManager } from '../utils/cache-manager';

/**
 * 内容提取服务配置
 */
interface ContentExtractionServiceConfig {
  cacheTTL: number;
  requestTimeout: number;
  maxContentLength: number;
  maxImages: number;
  maxLinks: number;
}

/**
 * 内容提取服务
 */
export class ContentExtractionService {
  private config: ContentExtractionServiceConfig;
  private activeExtractions: Map<string, AbortController> = new Map();

  constructor(config?: Partial<ContentExtractionServiceConfig>) {
    this.config = {
      cacheTTL: 3600000, // 1 hour
      requestTimeout: 30000, // 30 seconds
      maxContentLength: 100000, // 100k characters
      maxImages: 50, // 50 images
      maxLinks: 100, // 100 links
      ...config
    };
  }

  /**
   * 从URL提取内容
   */
  async extractFromUrl(url: string, options?: ExtractionOptions): Promise<ContentExtractionResult> {
    const extractionId = `extract:${url}`;
    const progressId = `content:${extractionId}:progress`;

    try {
      // 触发开始提取事件
      eventBus.emit('content:extraction-started', { url });
      eventBus.emit('content:progress', { id: progressId, progress: 10, message: '开始提取内容...' });

      // 检查缓存
      const cacheKey = this.generateCacheKey(url);
      const cachedResult = await this.getCachedResult(cacheKey);
      if (cachedResult) {
        eventBus.emit('content:extracted', cachedResult);
        eventBus.emit('content:progress', { id: progressId, progress: 100, message: '从缓存获取内容' });
        return cachedResult;
      }

      // 创建中止控制器
      const abortController = new AbortController();
      this.activeExtractions.set(extractionId, abortController);

      // 设置超时
      const timeoutId = setTimeout(() => {
        abortController.abort();
        eventBus.emit('content:extraction-failed', { url, error: '请求超时' });
      }, this.config.requestTimeout);

      // 发送请求
      eventBus.emit('content:progress', { id: progressId, progress: 30, message: '请求页面...' });
      const response = await fetch(url, {
        signal: abortController.signal,
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
        }
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      eventBus.emit('content:progress', { id: progressId, progress: 60, message: '解析页面...' });
      const html = await response.text();
      
      eventBus.emit('content:progress', { id: progressId, progress: 80, message: '提取内容...' });
      const content = this.extractContentFromHtml(html, options);
      
      clearTimeout(timeoutId);

      const result: ContentExtractionResult = {
        url,
        content,
        extractedAt: Date.now(),
        success: true
      };

      // 缓存结果
      await this.cacheResult(cacheKey, result);

      eventBus.emit('content:extracted', result);
      eventBus.emit('content:progress', { id: progressId, progress: 100, message: '提取完成' });
      return result;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : '提取内容失败';
      logger.error('Failed to extract content from URL:', error);
      
      eventBus.emit('content:extraction-failed', { url, error: errorMessage });
      eventBus.emit('content:progress', { id: progressId, progress: 0, message: `失败: ${errorMessage}` });

      return {
        url,
        content: {
          title: '',
          text: '',
          html: '',
          images: [],
          links: []
        },
        extractedAt: Date.now(),
        success: false,
        error: errorMessage
      };
    } finally {
      this.activeExtractions.delete(extractionId);
    }
  }

  /**
   * 从HTML提取内容
   */
  private extractContentFromHtml(html: string, options?: ExtractionOptions): ExtractedContent {
    const doc = new DOMParser().parseFromString(html, 'text/html');
    
    // 提取标题
    const title = doc.title || this.extractMetaContent(doc, 'og:title') || this.extractMetaContent(doc, 'twitter:title') || '';
    
    // 提取正文
    let text = '';
    let htmlContent = '';
    
    // 尝试不同的内容提取策略
    const contentSelectors = [
      'article', '.article', '.content', '.main-content', 'main', '#main', 
      '.post-content', '.entry-content', '.article-content', '.body-content',
      '.content-body', '.content-main', '.main', '.container', 'body'
    ];
    let contentElement = null;
    
    for (const selector of contentSelectors) {
      contentElement = doc.querySelector(selector);
      if (contentElement) break;
    }
    
    if (contentElement) {
      // 移除不需要的元素
      this.removeUnwantedElements(contentElement);
      
      // 提取文本
      text = contentElement.textContent || '';
      htmlContent = contentElement.innerHTML || '';
    } else {
      // 回退到整个body
      const body = doc.body;
      if (body) {
        this.removeUnwantedElements(body);
        text = body.textContent || '';
        htmlContent = body.innerHTML || '';
      }
    }
    
    // 限制内容长度
    text = text.substring(0, this.config.maxContentLength);
    htmlContent = htmlContent.substring(0, this.config.maxContentLength * 2);
    
    // 提取图片
    const images = this.extractImages(doc).slice(0, this.config.maxImages);
    
    // 提取链接
    const links = this.extractLinks(doc).slice(0, this.config.maxLinks);
    
    return {
      title: title.trim(),
      text: text.trim(),
      html: htmlContent.trim(),
      images,
      links
    };
  }

  /**
   * 提取元标签内容
   */
  private extractMetaContent(doc: Document, name: string): string {
    const meta = doc.querySelector(`meta[property="${name}"]`) || doc.querySelector(`meta[name="${name}"]`);
    return meta ? (meta as HTMLMetaElement).content || '' : '';
  }

  /**
   * 移除不需要的元素
   */
  private removeUnwantedElements(element: Element): void {
    const unwantedSelectors = [
      'script', 'style', 'noscript', 'iframe', 'object', 'embed',
      '.ads', '.advertisement', '.banner', '.cookie-consent', '.cookie-banner',
      '.footer', '.header', '.navigation', '.sidebar', '.nav',
      '.social-share', '.comments', '.related-posts', '.comment-section',
      '.share-buttons', '.pagination', '.author-box', '.tags',
      '.category', '.breadcrumbs', '.search-form', '.newsletter',
      '.popup', '.modal', '.overlay', '.sticky', '.fixed'
    ];
    
    unwantedSelectors.forEach(selector => {
      const elements = element.querySelectorAll(selector);
      elements.forEach(el => el.remove());
    });
  }

  /**
   * 提取图片
   */
  private extractImages(doc: Document): string[] {
    const images: string[] = [];
    const imgElements = doc.querySelectorAll('img');
    
    imgElements.forEach(img => {
      const src = img.getAttribute('src') || img.getAttribute('data-src') || img.getAttribute('data-original') || '';
      if (src) {
        // 处理相对路径
        const fullSrc = this.resolveUrl(src, doc.baseURI);
        if (fullSrc && !images.includes(fullSrc)) {
          images.push(fullSrc);
        }
      }
    });
    
    return images;
  }

  /**
   * 提取链接
   */
  private extractLinks(doc: Document): string[] {
    const links: string[] = [];
    const linkElements = doc.querySelectorAll('a');
    
    linkElements.forEach(link => {
      const href = link.getAttribute('href');
      if (href) {
        // 处理相对路径
        const fullHref = this.resolveUrl(href, doc.baseURI);
        if (fullHref && fullHref.startsWith('http') && !links.includes(fullHref)) {
          links.push(fullHref);
        }
      }
    });
    
    return links;
  }

  /**
   * 解析URL
   */
  private resolveUrl(url: string, baseUrl: string): string {
    try {
      return new URL(url, baseUrl).href;
    } catch {
      return url;
    }
  }

  /**
   * 从文本提取关键信息
   */
  extractKeyInformation(text: string, options?: {
    maxLength?: number;
    includeKeywords?: boolean;
    includeSummary?: boolean;
  }): {
    summary: string;
    keywords: string[];
  } {
    const { maxLength = 500, includeKeywords = true, includeSummary = true } = options || {};
    
    // 生成摘要
    let summary = '';
    if (includeSummary) {
      summary = this.generateSummary(text, maxLength);
    }
    
    // 提取关键词
    let keywords: string[] = [];
    if (includeKeywords) {
      keywords = this.extractKeywords(text);
    }
    
    return {
      summary,
      keywords
    };
  }

  /**
   * 生成摘要
   */
  private generateSummary(text: string, maxLength: number): string {
    // 改进的摘要生成算法
    const sentences = text.split(/[.!?]+/).filter(s => s.trim());
    let summary = '';
    let length = 0;
    
    // 优先选择长句子（通常包含更多信息）
    const sortedSentences = sentences.sort((a, b) => b.length - a.length);
    
    for (const sentence of sortedSentences) {
      if (length + sentence.length + 1 <= maxLength) {
        summary += sentence + '. ';
        length += sentence.length + 1;
      } else if (length === 0) {
        // 如果第一个句子就超过长度限制，截断它
        summary = sentence.substring(0, maxLength - 3) + '...';
        break;
      } else {
        break;
      }
    }
    
    return summary.trim();
  }

  /**
   * 提取关键词
   */
  private extractKeywords(text: string): string[] {
    // 改进的关键词提取算法
    const stopWords = new Set([
      // 英文停用词
      'the', 'a', 'an', 'and', 'or', 'but', 'if', 'because', 'as', 'what', 'which', 'this', 'that',
      'these', 'those', 'then', 'just', 'so', 'than', 'such', 'both', 'through', 'about', 'for',
      'is', 'are', 'was', 'were', 'be', 'been', 'being', 'have', 'has', 'had', 'having', 'do',
      'does', 'did', 'doing', 'to', 'from', 'up', 'down', 'in', 'out', 'on', 'off', 'over',
      'under', 'again', 'further', 'then', 'once', 'here', 'there', 'when', 'where', 'why',
      'how', 'all', 'any', 'both', 'each', 'few', 'more', 'most', 'other', 'some', 'such',
      'no', 'nor', 'not', 'only', 'own', 'same', 'so', 'than', 'too', 'very', 's', 't',
      'can', 'will', 'don', 'should', 'now',
      // 中文停用词
      '的', '了', '是', '在', '我', '有', '和', '就', '不', '人', '都', '一', '一个', '上', '也', '很', '到', '说', '要', '去', '你',
      '会', '着', '没有', '看', '好', '自己', '这'
    ]);
    
    // 分词
    const words = text.toLowerCase().match(/\b\w+\b/g) || [];
    
    // 统计词频
    const wordCount = new Map<string, number>();
    words.forEach(word => {
      if (!stopWords.has(word) && word.length > 2) {
        wordCount.set(word, (wordCount.get(word) || 0) + 1);
      }
    });
    
    // 排序并返回前10个关键词
    return Array.from(wordCount.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([word]) => word);
  }

  /**
   * 从剪贴板提取内容
   */
  async extractFromClipboard(): Promise<ContentExtractionResult> {
    try {
      if (!navigator.clipboard) {
        throw new Error('Clipboard API not supported');
      }
      
      eventBus.emit('content:extraction-started', { source: 'clipboard' });
      
      const text = await navigator.clipboard.readText();
      
      // 提取URLs
      const links = this.extractUrlsFromText(text);
      
      // 检查是否包含URLs
      let title = 'Clipboard Content';
      if (links.length > 0) {
        title = 'Clipboard Content with Links';
      }
      
      const result: ContentExtractionResult = {
        url: 'clipboard',
        content: {
          title,
          text,
          html: `<pre>${text}</pre>`,
          images: [],
          links
        },
        extractedAt: Date.now(),
        success: true
      };

      eventBus.emit('content:extracted', result);
      return result;
    } catch (error) {
      logger.error('Failed to extract content from clipboard:', error);
      return {
        url: 'clipboard',
        content: {
          title: '',
          text: '',
          html: '',
          images: [],
          links: []
        },
        extractedAt: Date.now(),
        success: false,
        error: (error as Error).message
      };
    }
  }

  /**
   * 从文本中提取URL
   */
  private extractUrlsFromText(text: string): string[] {
    const urlRegex = /https?:\/\/(www\.)?[-a-zA-Z0-9@:%._\+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b([-a-zA-Z0-9()@:%_\+.~#?&//=]*)/g;
    const urls = text.match(urlRegex) || [];
    // 去重
    return [...new Set(urls)];
  }

  /**
   * 清理HTML内容
   */
  cleanHtml(html: string): string {
    const doc = new DOMParser().parseFromString(html, 'text/html');
    this.removeUnwantedElements(doc.body);
    return doc.body.innerHTML;
  }

  /**
   * 提取页面元数据
   */
  extractMetadata(html: string): Record<string, string> {
    const doc = new DOMParser().parseFromString(html, 'text/html');
    const metadata: Record<string, string> = {};
    
    // 提取标题
    metadata.title = doc.title || '';
    
    // 提取元标签
    const metaTags = doc.querySelectorAll('meta');
    metaTags.forEach(meta => {
      const name = meta.getAttribute('name') || meta.getAttribute('property') || '';
      const content = meta.getAttribute('content') || '';
      if (name && content) {
        metadata[name] = content;
      }
    });
    
    // 提取链接标签
    const linkTags = doc.querySelectorAll('link[rel]');
    linkTags.forEach(link => {
      const rel = link.getAttribute('rel') || '';
      const href = link.getAttribute('href') || '';
      if (rel && href) {
        metadata[rel] = href;
      }
    });
    
    // 提取Open Graph标签
    const ogTags = doc.querySelectorAll('meta[property^="og:"]');
    ogTags.forEach(tag => {
      const property = tag.getAttribute('property') || '';
      const content = tag.getAttribute('content') || '';
      if (property && content) {
        metadata[property] = content;
      }
    });
    
    return metadata;
  }

  /**
   * 取消提取
   */
  cancelExtraction(url: string): void {
    const extractionId = `extract:${url}`;
    const controller = this.activeExtractions.get(extractionId);
    if (controller) {
      controller.abort();
      this.activeExtractions.delete(extractionId);
      eventBus.emit('content:extraction-cancelled', { url });
    }
  }

  /**
   * 生成缓存键
   */
  private generateCacheKey(url: string): string {
    return `content:${btoa(url)}`;
  }

  /**
   * 获取缓存的结果
   */
  private async getCachedResult(cacheKey: string): Promise<ContentExtractionResult | null> {
    try {
      const cached = await cacheManager.get(cacheKey);
      return cached as ContentExtractionResult | null;
    } catch (error) {
      logger.error('Failed to get cached result:', error);
      return null;
    }
  }

  /**
   * 缓存结果
   */
  private async cacheResult(cacheKey: string, result: ContentExtractionResult): Promise<void> {
    try {
      await cacheManager.set(cacheKey, result, this.config.cacheTTL);
    } catch (error) {
      logger.error('Failed to cache result:', error);
    }
  }
}

/**
 * 全局内容提取服务实例
 */
export const contentExtractionService = new ContentExtractionService();

export default ContentExtractionService;