/**
 * 增强型网页内容提取器
 * 优化版本：支持JavaScript动态内容、结构化数据提取、媒体内容增强
 */

import { logger } from './logger';

logger.setPrefix('[EnhancedWebExtractor]');

// ========================================
// 类型定义
// ========================================

export interface EnhancedExtractOptions {
  // 基础选项
  maxChars?: number;
  extractLinkUrl?: boolean;
  extractImageUrl?: boolean;
  maxUrls?: number;
  
  // 动态内容处理
  waitForDynamicContent?: boolean;
  maxWaitTime?: number;
  stabilityThreshold?: number;
  checkInterval?: number;
  
  // 结构化数据提取
  extractJsonLd?: boolean;
  extractMicrodata?: boolean;
  extractRdfa?: boolean;
  
  // 媒体内容
  extractMedia?: boolean;
  extractVideos?: boolean;
  extractAudios?: boolean;
  includeImageData?: boolean;
  
  // 内容质量
  preserveCodeBlocks?: boolean;
  extractTables?: boolean;
  minContentLength?: number;
  
  // 高级选项
  recursiveSameDomain?: boolean;
  maxRecursionDepth?: number;
  maxRecursiveLinks?: number;
}

export interface StructuredData {
  type: string;
  data: Record<string, unknown>;
  format: 'json-ld' | 'microdata' | 'rdfa';
}

export interface MediaContent {
  type: 'image' | 'video' | 'audio' | 'embed';
  url: string;
  title?: string;
  description?: string;
  thumbnail?: string;
  duration?: string;
  alt?: string;
}

export interface EnhancedExtractResult {
  content: string;
  title: string;
  url: string;
  author?: string;
  publishedAt?: string;
  modifiedAt?: string;
  summary?: string;
  structuredData: StructuredData[];
  media: MediaContent[];
  metadata: EnhancedPageMetadata;
  stats: EnhancedExtractionStats;
  success: boolean;
  error?: string;
}

export interface EnhancedPageMetadata {
  title: string;
  description: string;
  keywords: string;
  author: string;
  publishedTime: string;
  modifiedTime: string;
  siteName: string;
  favicon: string;
  coverImage: string;
  type: string;
  language: string;
  canonicalUrl?: string;
  schemaTypes?: string[];
  readingTime?: string;
}

export interface EnhancedExtractionStats {
  originalLength: number;
  extractedLength: number;
  paragraphCount: number;
  imageCount: number;
  videoCount: number;
  audioCount: number;
  linkCount: number;
  codeBlockCount: number;
  tableCount: number;
  jsonLdCount: number;
  processingTime: number;
}

// ========================================
// JSON-LD 提取器
// ========================================

class JsonLdExtractor {
  extract(doc: Document): StructuredData[] {
    const results: StructuredData[] = [];
    
    // 查找所有 script[type="application/ld+json"] 标签
    const scripts = doc.querySelectorAll('script[type="application/ld+json"]');
    
    scripts.forEach((script) => {
      try {
        const content = script.textContent?.trim();
        if (!content) return;
        
        const data = JSON.parse(content);
        
        // 处理数组
        if (Array.isArray(data)) {
          for (const item of data) {
            this.processJsonLdItem(item, results);
          }
        } else {
          this.processJsonLdItem(data, results);
        }
      } catch (e) {
        logger.debug('Failed to parse JSON-LD:', e);
      }
    });
    
    return results;
  }
  
  private processJsonLdItem(item: Record<string, unknown>, results: StructuredData[]): void {
    if (!item['@type']) return;
    
    const type = Array.isArray(item['@type']) 
      ? (item['@type'] as string[]).join(', ')
      : String(item['@type']);
    
    // 过滤掉非实体类型
    if (type.startsWith('@')) return;
    
    results.push({
      type,
      data: item,
      format: 'json-ld',
    });
  }
}

// ========================================
// Microdata 提取器
// ========================================

class MicrodataExtractor {
  extract(doc: Document): StructuredData[] {
    const results: StructuredData[] = [];
    
    // 查找所有带有 itemtype 的元素
    const items = doc.querySelectorAll('[itemscope][itemtype]');
    
    items.forEach((item) => {
      const itemType = item.getAttribute('itemtype') || '';
      const data: Record<string, unknown> = {};
      
      // 提取所有 itemprop
      const props = item.querySelectorAll('[itemprop]');
      props.forEach((prop) => {
        const propName = prop.getAttribute('itemprop') || '';
        const value = this.getPropertyValue(prop);
        if (propName && value) {
          data[propName] = value;
        }
      });
      
      if (Object.keys(data).length > 0) {
        results.push({
          type: itemType.split('/').pop() || 'Unknown',
          data,
          format: 'microdata',
        });
      }
    });
    
    return results;
  }
  
  private getPropertyValue(element: Element): string | null {
    const tagName = element.tagName.toLowerCase();
    
    // 元素特定属性
    if (element.hasAttribute('content')) {
      return element.getAttribute('content');
    }
    if (element.hasAttribute('href')) {
      return element.getAttribute('href');
    }
    if (element.hasAttribute('src')) {
      return element.getAttribute('src');
    }
    if (element.hasAttribute('datetime')) {
      return element.getAttribute('datetime');
    }
    
    // 特定标签
    if (tagName === 'meta') {
      return (element as HTMLMetaElement).content || null;
    }
    if (tagName === 'img') {
      return (element as HTMLImageElement).alt || null;
    }
    if (tagName === 'a') {
      return element.textContent?.trim() || null;
    }
    if (tagName === 'time') {
      return (element as HTMLTimeElement).dateTime || element.textContent?.trim() || null;
    }
    
    // 链接和图像
    if (['a', 'area'].includes(tagName)) {
      return element.getAttribute('href') || element.textContent?.trim() || null;
    }
    if (['img', 'audio', 'video', 'source'].includes(tagName)) {
      return element.getAttribute('src') || null;
    }
    if (tagName === 'object') {
      return element.getAttribute('data') || null;
    }
    if (tagName === 'embed') {
      return element.getAttribute('src') || null;
    }
    
    // 默认文本内容
    return element.textContent?.trim() || null;
  }
}

// ========================================
// RDFa 提取器
// ========================================

class RdfaExtractor {
  extract(doc: Document): StructuredData[] {
    const results: StructuredData[] = [];
    
    // 查找所有带有 typeof 的元素
    const items = doc.querySelectorAll('[typeof]');
    
    items.forEach((item) => {
      const itemType = item.getAttribute('typeof') || '';
      const data: Record<string, unknown> = {};
      
      // 提取所有 property
      const props = item.querySelectorAll('[property]');
      props.forEach((prop) => {
        const propName = prop.getAttribute('property') || '';
        // 移除前缀
        const cleanName = propName.includes(':') 
          ? propName.split(':').pop() 
          : propName;
        const value = this.getPropertyValue(prop);
        if (cleanName && value) {
          data[cleanName] = value;
        }
      });
      
      if (Object.keys(data).length > 0) {
        results.push({
          type: itemType,
          data,
          format: 'rdfa',
        });
      }
    });
    
    return results;
  }
  
  private getPropertyValue(element: Element): string | null {
    // 检查 content 属性
    if (element.hasAttribute('content')) {
      return element.getAttribute('content');
    }
    // 检查 href 属性
    if (element.hasAttribute('href')) {
      return element.getAttribute('href');
    }
    // 检查 src 属性
    if (element.hasAttribute('src')) {
      return element.getAttribute('src');
    }
    
    // 返回文本内容
    return element.textContent?.trim() || null;
  }
}

// ========================================
// 媒体内容提取器
// ========================================

class MediaExtractor {
  extract(doc: Document, options: EnhancedExtractOptions): MediaContent[] {
    const media: MediaContent[] = [];
    
    // 提取图片
    if (options.extractImageUrl !== false) {
      const images = this.extractImages(doc, options);
      media.push(...images);
    }
    
    // 提取视频
    if (options.extractVideos) {
      const videos = this.extractVideos(doc);
      media.push(...videos);
    }
    
    // 提取音频
    if (options.extractAudios) {
      const audios = this.extractAudios(doc);
      media.push(...audios);
    }
    
    // 提取嵌入内容
    if (options.extractMedia) {
      const embeds = this.extractEmbeds(doc);
      media.push(...embeds);
    }
    
    return media;
  }
  
  private extractImages(doc: Document, options: EnhancedExtractOptions): MediaContent[] {
    const images: MediaContent[] = [];
    const imgElements = doc.querySelectorAll('img');
    
    imgElements.forEach((img) => {
      const src = img.getAttribute('src') || img.getAttribute('data-src') || '';
      if (!src) return;
      
      // 跳过图标和小图片
      const width = img.getAttribute('width');
      const height = img.getAttribute('height');
      if ((width && parseInt(width) < 50) || (height && parseInt(height) < 50)) {
        return;
      }
      
      images.push({
        type: 'image',
        url: this.resolveUrl(src, doc.baseURI || ''),
        alt: img.getAttribute('alt') || '',
        title: img.getAttribute('title') || undefined,
        thumbnail: img.getAttribute('srcset')?.split(',')[0]?.trim()?.split(' ')[0] || undefined,
      });
    });
    
    return images;
  }
  
  private extractVideos(doc: Document): MediaContent[] {
    const videos: MediaContent[] = [];
    
    // 查找 video 元素
    doc.querySelectorAll('video').forEach((video) => {
      const src = video.getAttribute('src') || '';
      const poster = video.getAttribute('poster') || '';
      
      if (src || poster) {
        videos.push({
          type: 'video',
          url: src || poster,
          title: video.getAttribute('title') || undefined,
          thumbnail: poster || undefined,
          duration: this.formatDuration(video.getAttribute('duration')),
        });
      }
      
      // 查找 source 元素
      video.querySelectorAll('source').forEach((source) => {
        const sourceSrc = source.getAttribute('src');
        if (sourceSrc) {
          videos.push({
            type: 'video',
            url: this.resolveUrl(sourceSrc, doc.baseURI || ''),
            title: video.getAttribute('title') || undefined,
            thumbnail: poster || undefined,
          });
        }
      });
    });
    
    // 查找 iframe (YouTube, Vimeo等)
    doc.querySelectorAll('iframe[src*="youtube"], iframe[src*="vimeo"]').forEach((iframe) => {
      const src = iframe.getAttribute('src') || '';
      videos.push({
        type: 'video',
        url: src,
        thumbnail: this.extractVideoThumbnail(src),
      });
    });
    
    return videos;
  }
  
  private extractAudios(doc: Document): MediaContent[] {
    const audios: MediaContent[] = [];
    
    doc.querySelectorAll('audio').forEach((audio) => {
      const src = audio.getAttribute('src') || '';
      
      if (src) {
        audios.push({
          type: 'audio',
          url: src,
          title: audio.getAttribute('title') || undefined,
          duration: this.formatDuration(audio.getAttribute('duration')),
        });
      }
      
      // 查找 source 元素
      audio.querySelectorAll('source').forEach((source) => {
        const sourceSrc = source.getAttribute('src');
        if (sourceSrc) {
          audios.push({
            type: 'audio',
            url: this.resolveUrl(sourceSrc, doc.baseURI || ''),
            title: audio.getAttribute('title') || undefined,
          });
        }
      });
    });
    
    return audios;
  }
  
  private extractEmbeds(doc: Document): MediaContent[] {
    const embeds: MediaContent[] = [];
    
    doc.querySelectorAll('embed, object[data]').forEach((el) => {
      const data = el.getAttribute('data') || el.getAttribute('src') || '';
      if (data) {
        embeds.push({
          type: 'embed',
          url: data,
          title: el.getAttribute('title') || undefined,
        });
      }
    });
    
    return embeds;
  }
  
  private formatDuration(seconds: string | null): string | undefined {
    if (!seconds) return undefined;
    const sec = parseFloat(seconds);
    if (isNaN(sec)) return undefined;
    
    const hours = Math.floor(sec / 3600);
    const minutes = Math.floor((sec % 3600) / 60);
    const secs = Math.floor(sec % 60);
    
    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${minutes}:${secs.toString().padStart(2, '0')}`;
  }
  
  private extractVideoThumbnail(url: string): string | undefined {
    // YouTube
    const ytMatch = url.match(/(?:youtube\.com\/(?:watch\?v=|embed\/)|youtu\.be\/)([a-zA-Z0-9_-]+)/);
    if (ytMatch) {
      return `https://img.youtube.com/vi/${ytMatch[1]}/hqdefault.jpg`;
    }
    
    // Vimeo
    const vimeoMatch = url.match(/vimeo\.com\/(\d+)/);
    if (vimeoMatch) {
      return `https://vumbnail.com/${vimeoMatch[1]}.jpg`;
    }
    
    return undefined;
  }
  
  private resolveUrl(url: string, baseUrl: string): string {
    try {
      return new URL(url, baseUrl).href;
    } catch {
      return url;
    }
  }
}

// ========================================
// 阅读时间计算器
// ========================================

class ReadingTimeCalculator {
  calculate(text: string): string {
    // 中文：每分钟约 400-500 字
    // 英文：每分钟约 200-250 词
    const chineseChars = (text.match(/[\u4e00-\u9fff]/g) || []).length;
    const englishWords = (text.match(/[a-zA-Z]+/g) || []).length;
    
    // 中文阅读速度：450字/分钟
    // 英文阅读速度：225词/分钟
    const chineseMinutes = chineseChars / 450;
    const englishMinutes = englishWords / 225;
    
    const totalMinutes = chineseMinutes + englishMinutes;
    
    if (totalMinutes < 1) {
      return '< 1 分钟';
    }
    
    return `${Math.round(totalMinutes)} 分钟`;
  }
}

// ========================================
// 增强型元数据提取器
// ========================================

class EnhancedMetadataExtractor {
  extract(doc: Document): EnhancedPageMetadata {
    return {
      title: this.getTitle(doc),
      description: this.getDescription(doc),
      keywords: this.getKeywords(doc),
      author: this.getAuthor(doc),
      publishedTime: this.getPublishedTime(doc),
      modifiedTime: this.getModifiedTime(doc),
      siteName: this.getSiteName(doc),
      favicon: this.getFavicon(doc),
      coverImage: this.getCoverImage(doc),
      type: this.getType(doc),
      language: this.getLanguage(doc),
      canonicalUrl: this.getCanonicalUrl(doc),
      schemaTypes: this.getSchemaTypes(doc),
    };
  }
  
  private getMeta(doc: Document, name: string): string {
    const el = doc.querySelector(`meta[name="${this.escape(name)}"]`) as HTMLMetaElement | null;
    return el?.getAttribute('content')?.trim() || '';
  }
  
  private getMetaProperty(doc: Document, property: string): string {
    const el = doc.querySelector(`meta[property="${this.escape(property)}"]`) as HTMLMetaElement | null;
    return el?.getAttribute('content')?.trim() || '';
  }
  
  private escape(str: string): string {
    return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }
  
  private getTitle(doc: Document): string {
    return (
      this.getMetaProperty(doc, 'og:title') ||
      this.getMeta(doc, 'twitter:title') ||
      this.getMeta(doc, 'title') ||
      doc.title ||
      ''
    ).trim();
  }
  
  private getDescription(doc: Document): string {
    return (
      this.getMetaProperty(doc, 'og:description') ||
      this.getMeta(doc, 'twitter:description') ||
      this.getMeta(doc, 'description') ||
      ''
    ).trim();
  }
  
  private getKeywords(doc: Document): string {
    return this.getMeta(doc, 'keywords');
  }
  
  private getAuthor(doc: Document): string {
    return (
      this.getMeta(doc, 'author') ||
      this.getMetaProperty(doc, 'article:author') ||
      this.getMetaProperty(doc, 'og:article:author') ||
      ''
    ).trim();
  }
  
  private getPublishedTime(doc: Document): string {
    return (
      this.getMetaProperty(doc, 'article:published_time') ||
      this.getMeta(doc, 'pubdate') ||
      this.getMeta(doc, 'publishdate') ||
      ''
    ).trim();
  }
  
  private getModifiedTime(doc: Document): string {
    return (
      this.getMetaProperty(doc, 'article:modified_time') ||
      this.getMetaProperty(doc, 'og:updated_time') ||
      ''
    ).trim();
  }
  
  private getSiteName(doc: Document): string {
    return this.getMetaProperty(doc, 'og:site_name') || '';
  }
  
  private getFavicon(doc: Document): string {
    const baseUri = doc.baseURI || '';
    const selectors = [
      'link[rel="icon"][type="image/svg+xml"]',
      'link[rel="icon"][sizes="192x192"]',
      'link[rel="icon"][sizes="128x128"]',
      'link[rel="icon"][sizes="96x96"]',
      'link[rel="icon"]',
      'link[rel="shortcut icon"]',
      'link[rel="apple-touch-icon"]',
    ];
    
    for (const selector of selectors) {
      const el = doc.querySelector(selector) as HTMLLinkElement | null;
      if (el?.href) return el.href;
    }
    
    return `${new URL(baseUri).origin}/favicon.ico`;
  }
  
  private getCoverImage(doc: Document): string {
    const baseUri = doc.baseURI || '';
    const image = (
      this.getMetaProperty(doc, 'og:image') ||
      this.getMeta(doc, 'twitter:image') ||
      this.getMetaProperty(doc, 'og:image:secure_url') ||
      ''
    ).trim();
    
    return image ? this.resolveUrl(image, baseUri) : '';
  }
  
  private getType(doc: Document): string {
    return this.getMetaProperty(doc, 'og:type') || 'article';
  }
  
  private getLanguage(doc: Document): string {
    return doc.documentElement.lang || this.getMeta(doc, 'language') || 'zh-CN';
  }
  
  private getCanonicalUrl(doc: Document): string | undefined {
    const canonical = doc.querySelector('link[rel="canonical"]') as HTMLLinkElement | null;
    if (canonical?.href) return canonical.href;
    
    // 从 og:url 获取
    const ogUrl = this.getMetaProperty(doc, 'og:url');
    if (ogUrl) return ogUrl;
    
    return undefined;
  }
  
  private getSchemaTypes(doc: Document): string[] {
    const types: string[] = [];
    
    // 从 JSON-LD 获取
    const scripts = doc.querySelectorAll('script[type="application/ld+json"]');
    scripts.forEach((script) => {
      try {
        const content = script.textContent?.trim();
        if (!content) return;
        
        const data = JSON.parse(content);
        const type = Array.isArray(data['@type']) 
          ? data['@type'] 
          : [data['@type']];
        
        types.push(...type.filter((t: unknown) => typeof t === 'string' && !t.startsWith('@')));
      } catch {
        // 忽略解析错误
      }
    });
    
    return [...new Set(types)];
  }
  
  private resolveUrl(url: string, baseUrl: string): string {
    try {
      return new URL(url, baseUrl).href;
    } catch {
      return url;
    }
  }
}

// ========================================
// 主提取器类
// ========================================

export class EnhancedWebContentExtractor {
  private jsonLdExtractor = new JsonLdExtractor();
  private microdataExtractor = new MicrodataExtractor();
  private rdfaExtractor = new RdfaExtractor();
  private mediaExtractor = new MediaExtractor();
  private metadataExtractor = new EnhancedMetadataExtractor();
  private readingTimeCalculator = new ReadingTimeCalculator();
  
  /**
   * 等待动态内容加载
   */
  async waitForDynamicContent(options: {
    maxWaitTime?: number;
    stabilityThreshold?: number;
    checkInterval?: number;
  } = {}): Promise<void> {
    const {
      maxWaitTime = 5000,
      stabilityThreshold = 500,
      checkInterval = 100,
    } = options;
    
    const startTime = Date.now();
    let lastContentLength = document.body?.textContent?.length || 0;
    let lastChangeTime = startTime;
    
    return new Promise((resolve) => {
      const checkStability = () => {
        const currentTime = Date.now();
        const elapsed = currentTime - startTime;
        
        if (elapsed >= maxWaitTime) {
          logger.debug('Max wait time reached');
          resolve();
          return;
        }
        
        const currentContentLength = document.body?.textContent?.length || 0;
        
        if (currentContentLength !== lastContentLength) {
          lastContentLength = currentContentLength;
          lastChangeTime = currentTime;
          setTimeout(checkStability, checkInterval);
          return;
        }
        
        if (currentTime - lastChangeTime >= stabilityThreshold) {
          logger.debug('Content stabilized');
          resolve();
          return;
        }
        
        setTimeout(checkStability, checkInterval);
      };
      
      checkStability();
    });
  }
  
  /**
   * 提取增强内容
   */
  extract(options: EnhancedExtractOptions = {}): EnhancedExtractResult {
    const startTime = performance.now();
    
    const defaultOptions: EnhancedExtractOptions = {
      maxChars: 120000,
      extractLinkUrl: true,
      extractImageUrl: true,
      maxUrls: 200,
      waitForDynamicContent: true,
      maxWaitTime: 5000,
      extractJsonLd: true,
      extractMicrodata: true,
      extractRdfa: true,
      extractMedia: true,
      extractVideos: true,
      extractAudios: true,
      preserveCodeBlocks: true,
      extractTables: true,
      minContentLength: 100,
      ...options,
    };
    
    try {
      const doc = document;
      
      // 提取元数据
      const metadata = this.metadataExtractor.extract(doc);
      
      // 提取结构化数据
      const structuredData: StructuredData[] = [];
      
      if (defaultOptions.extractJsonLd) {
        structuredData.push(...this.jsonLdExtractor.extract(doc));
      }
      
      if (defaultOptions.extractMicrodata) {
        structuredData.push(...this.microdataExtractor.extract(doc));
      }
      
      if (defaultOptions.extractRdfa) {
        structuredData.push(...this.rdfaExtractor.extract(doc));
      }
      
      // 提取主要内容
      const mainContent = this.extractMainContent(doc, defaultOptions);
      
      // 提取媒体
      const media = this.mediaExtractor.extract(doc, defaultOptions);
      
      // 生成摘要
      const summary = this.generateSummary(mainContent);
      
      // 计算阅读时间
      metadata.readingTime = this.readingTimeCalculator.calculate(mainContent);
      
      const processingTime = Math.round(performance.now() - startTime);
      
      // 统计
      const stats: EnhancedExtractionStats = {
        originalLength: doc.body?.textContent?.length || 0,
        extractedLength: mainContent.length,
        paragraphCount: (mainContent.match(/\n\n+/g) || []).length,
        imageCount: media.filter((m) => m.type === 'image').length,
        videoCount: media.filter((m) => m.type === 'video').length,
        audioCount: media.filter((m) => m.type === 'audio').length,
        linkCount: (mainContent.match(/\[.+?\]\(.+?\)/g) || []).length,
        codeBlockCount: (mainContent.match(/```[\s\S]*?```/g) || []).length,
        tableCount: (mainContent.match(/```csv[\s\S]*?```/g) || []).length,
        jsonLdCount: structuredData.filter((s) => s.format === 'json-ld').length,
        processingTime,
      };
      
      return {
        content: mainContent.slice(0, defaultOptions.maxChars || 120000),
        title: metadata.title,
        url: doc.location.href,
        author: metadata.author || undefined,
        publishedAt: metadata.publishedTime || undefined,
        modifiedAt: metadata.modifiedTime || undefined,
        summary,
        structuredData,
        media,
        metadata,
        stats,
        success: true,
      };
    } catch (error) {
      logger.error('Enhanced extraction failed:', error);
      return {
        content: '',
        title: document?.title || '',
        url: document?.location?.href || '',
        structuredData: [],
        media: [],
        metadata: this.metadataExtractor?.extract?.(document) || {},
        stats: {
          originalLength: 0,
          extractedLength: 0,
          paragraphCount: 0,
          imageCount: 0,
          videoCount: 0,
          audioCount: 0,
          linkCount: 0,
          codeBlockCount: 0,
          tableCount: 0,
          jsonLdCount: 0,
          processingTime: Math.round(performance.now() - startTime),
        },
        success: false,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }
  
  /**
   * 提取主要内容区域
   */
  private extractMainContent(doc: Document, options: EnhancedExtractOptions): string {
    // 使用现有的内容提取逻辑
    // 这里简化处理，实际可以从 WebContentExtractor 复用
    
    const preferredSelectors = [
      'article',
      'main',
      '[role="main"]',
      '[itemprop="articleBody"]',
      '.article',
      '.post',
      '.entry-content',
      '.markdown-body',
      '.content',
      '#content',
      '#main',
      '.main',
    ];
    
    let contentElement: Element | null = null;
    
    for (const selector of preferredSelectors) {
      const el = doc.querySelector(selector);
      if (el) {
        contentElement = el;
        break;
      }
    }
    
    contentElement = contentElement || doc.body;
    
    // 清理内容
    const cleanedContent = this.cleanContent(contentElement as Element);
    
    // 转换为文本
    return cleanedContent.textContent?.trim() || '';
  }
  
  /**
   * 清理内容
   */
  private cleanContent(element: Element): Element {
    const clone = element.cloneNode(true) as Element;
    
    // 移除不需要的元素
    const removeSelectors = [
      'script', 'style', 'link', 'noscript', 'nav', 'footer', 'aside',
      'form', 'iframe', 'canvas', 'svg',
      '[role="navigation"]', '[aria-hidden="true"]', '[hidden]',
      '.comment', '.comments', '.sidebar', '.breadcrumb', '.pagination',
      '.related', '.recommend', '.share', '.social', '.advert', '.ads',
      '.popup', '.modal', '.overlay', '.widget', '.subscribe', '.newsletter',
    ];
    
    removeSelectors.forEach((selector) => {
      try {
        clone.querySelectorAll(selector).forEach((n) => n.remove());
      } catch {
        // 忽略无效选择器
      }
    });
    
    return clone;
  }
  
  /**
   * 生成摘要
   */
  private generateSummary(content: string): string {
    const plainText = content
      .replace(/#{1,6}\s/g, '')
      .replace(/\*\*/g, '')
      .replace(/\*/g, '')
      .replace(/`{3}[\s\S]*?`{3}/g, '')
      .replace(/`([^`]+)`/g, '$1')
      .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
      .replace(/!\[([^\]]*)\]\([^)]+\)/g, '')
      .replace(/>\s?/g, '')
      .replace(/\n+/g, ' ')
      .trim();
    
    const maxLength = 300;
    if (plainText.length <= maxLength) return plainText;
    
    const summary = plainText.slice(0, maxLength);
    const lastPeriod = summary.lastIndexOf('。');
    
    if (lastPeriod > maxLength * 0.5) {
      return summary.slice(0, lastPeriod + 1);
    }
    
    return summary + '...';
  }
  
  /**
   * 提取选中内容
   */
  extractSelection(): { text: string; html: string } | null {
    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0) return null;
    
    const range = selection.getRangeAt(0);
    const container = document.createElement('div');
    container.appendChild(range.cloneContents());
    
    return {
      text: selection.toString(),
      html: container.innerHTML,
    };
  }
  
  /**
   * 获取页面信息
   */
  getPageInfo(): {
    url: string;
    title: string;
    favicon: string;
    length: number;
    wordCount: number;
    readingTime: string;
  } {
    const bodyText = document.body?.textContent || '';
    return {
      url: document.location.href,
      title: document.title,
      favicon: document.querySelector('link[rel="icon"]')?.getAttribute('href') || '',
      length: bodyText.length,
      wordCount: bodyText.split(/\s+/).length,
      readingTime: this.readingTimeCalculator.calculate(bodyText),
    };
  }
}

// 导出单例
export const enhancedWebContentExtractor = new EnhancedWebContentExtractor();
