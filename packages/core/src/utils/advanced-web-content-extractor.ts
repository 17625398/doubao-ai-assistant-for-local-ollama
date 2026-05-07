/**
 * 高级网页内容提取器 - 对标原生程序实现
 * 基于豆包原生程序的 ElementToMarkdown 和 ContentScorer 实现
 */

import { logger } from './logger';

logger.setPrefix('[WebContentExtractor]');

export interface EnhancedExtractOptions {
  /** 最大字符数 */
  maxChars?: number;
  /** 提取链接URL */
  extractLinkUrl?: boolean;
  /** 提取图片URL */
  extractImageUrl?: boolean;
  /** 最大URL数量 */
  maxUrls?: number;
  /** 标题偏移级别 */
  headingLevel?: number;
  /** 是否提取元数据 */
  includeMetadata?: boolean;
  /** 是否提取正文摘要 */
  includeSummary?: boolean;
  /** 是否保留代码块格式 */
  preserveCodeBlocks?: boolean;
  /** 是否提取表格 */
  extractTables?: boolean;
  /** 最小内容长度阈值 */
  minContentLength?: number;
  /** 是否递归提取同域名链接 */
  recursiveSameDomain?: boolean;
  /** 递归提取的最大深度 */
  maxRecursionDepth?: number;
  /** 递归提取的最大链接数 */
  maxRecursiveLinks?: number;
  /** 是否包含图片数据（base64） */
  includeImageData?: boolean;
  /** 是否提取视频信息 */
  extractVideo?: boolean;
  /** 是否使用 Readability 算法 */
  useReadability?: boolean;
  /** 是否提取上下文文本 */
  extractContext?: boolean;
  /** 上下文文本最大长度 */
  contextMaxLength?: number;
}

export interface EnhancedExtractResult {
  /** 提取的Markdown内容 */
  content: string;
  /** 页面标题 */
  title: string;
  /** 页面URL */
  url: string;
  /** 作者 */
  author?: string;
  /** 发布时间 */
  publishedAt?: string;
  /** 摘要 */
  summary?: string;
  /** 元数据 */
  metadata: EnhancedPageMetadata;
  /** 提取统计 */
  stats: EnhancedExtractionStats;
  /** 是否成功 */
  success: boolean;
  /** 错误信息 */
  error?: string;
  /** 提取的图片 */
  images?: EnhancedImageResult[];
  /** 提取的链接 */
  links?: LinkResult[];
  /** 上下文文本（选中内容的上下文） */
  contextText?: string;
}

export interface EnhancedImageResult {
  url: string;
  alt: string;
  title?: string;
  dataUrl?: string;
  width?: number;
  height?: number;
  /** 是否为封面图片 */
  isCover?: boolean;
}

export interface LinkResult {
  url: string;
  text: string;
  title?: string;
  /** 是否为同域名链接 */
  isSameDomain?: boolean;
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
  /** Open Graph 数据 */
  openGraph?: Record<string, string>;
  /** Twitter Card 数据 */
  twitterCard?: Record<string, string>;
}

export interface EnhancedExtractionStats {
  originalLength: number;
  extractedLength: number;
  paragraphCount: number;
  imageCount: number;
  linkCount: number;
  codeBlockCount: number;
  tableCount: number;
  processingTime: number;
  /** 内容得分 */
  contentScore?: number;
}

/**
 * 内容评分器 - 对标原生程序的 ContentScorer
 */
class AdvancedContentScorer {
  private negativePatterns = [
    /comment/i, /footer/i, /header/i, /nav/i, /breadcrumb/i,
    /sidebar/i, /recommend/i, /related/i, /share/i, /social/i,
    /promo/i, /advert/i, /ads/i, /popup/i, /modal/i, /overlay/i,
    /widget/i, /subscribe/i, /newsletter/i, /copyright/i,
    /cookie/i, /gdpr/i, /consent/i, /banner/i, /toolbar/i,
  ];

  private positivePatterns = [
    /article/i, /post/i, /entry/i, /content/i, /main/i,
    /markdown/i, /richtext/i, /detail/i, /doc/i, /body/i,
    /text/i, /story/i, /blog/i, /page/i,
  ];

  calculateScore(element: Element): number {
    const tagName = element.tagName.toLowerCase();
    
    if (['nav', 'footer', 'header', 'aside', 'script', 'style', 'noscript', 'iframe'].includes(tagName)) {
      return -Infinity;
    }

    const text = element.textContent || '';
    const normalizedText = this.normalizeText(text);
    const textLength = normalizedText.length;

    if (textLength < 50) return -Infinity;

    let score = 0;

    // 文本长度得分
    score += Math.min(textLength * 0.5, 2000);

    // 段落密度得分
    const paragraphs = element.querySelectorAll('p');
    const paragraphText = Array.from(paragraphs).reduce((sum, p) => {
      return sum + this.normalizeText(p.textContent || '').length;
    }, 0);
    const paragraphDensity = textLength > 0 ? paragraphText / textLength : 0;
    score += paragraphDensity * 500;

    // 标题得分
    const headings = element.querySelectorAll('h1, h2, h3, h4, h5, h6');
    score += headings.length * 50;

    // 链接密度惩罚
    const links = element.querySelectorAll('a');
    let linkTextLength = 0;
    links.forEach(link => {
      linkTextLength += this.normalizeText(link.textContent || '').length;
    });
    const linkDensity = textLength > 0 ? linkTextLength / textLength : 0;
    score -= linkDensity * textLength * 2;

    // 标签名得分
    if (tagName === 'article') score += 1000;
    if (tagName === 'main') score += 800;
    if (tagName === 'section') score += 200;

    // ID和类名分析
    const idAndClass = `${element.id || ''} ${(element as HTMLElement).className || ''}`.toLowerCase();
    
    for (const pattern of this.positivePatterns) {
      if (pattern.test(idAndClass)) score += 300;
    }
    
    for (const pattern of this.negativePatterns) {
      if (pattern.test(idAndClass)) score -= 500;
    }

    // 表单元素惩罚
    const formElements = element.querySelectorAll('form, input, textarea, select, button');
    score -= formElements.length * 100;

    // 图片得分
    const images = element.querySelectorAll('img');
    score += Math.min(images.length * 20, 200);

    // 代码块得分
    const codeBlocks = element.querySelectorAll('pre, code');
    score += codeBlocks.length * 30;

    return score;
  }

  private normalizeText(text: string): string {
    return text.replace(/\s+/g, ' ').trim();
  }
}

/**
 * Readability 风格的正文提取器
 */
class ReadabilityExtractor {
  extract(document: Document): { content: string; title: string; byline?: string; dir?: string } | null {
    // 克隆文档避免修改原始DOM
    const clone = document.cloneNode(true) as Document;
    
    // 移除不需要的元素
    const removeSelectors = [
      'script', 'style', 'link', 'meta', 'noscript', 'iframe',
      'form', 'input', 'button', 'select', 'textarea',
      'nav', 'footer', 'header', 'aside',
      '.sidebar', '.navigation', '.breadcrumb', '.pagination',
      '.comment', '.comments', '.share', '.social',
      '.ad', '.ads', '.advert', '.popup', '.modal',
      '.cookie', '.gdpr', '.consent', '.banner',
    ];
    
    removeSelectors.forEach(selector => {
      try {
        clone.querySelectorAll(selector).forEach(el => el.remove());
      } catch {}
    });

    // 查找最佳内容容器
    const contentContainer = this.findContentContainer(clone);
    if (!contentContainer) return null;

    // 提取标题
    const title = this.extractTitle(clone);
    
    // 提取作者信息
    const byline = this.extractByline(contentContainer);

    // 清理内容
    this.cleanContent(contentContainer);

    // 转换为文本
    const content = this.convertToText(contentContainer);

    return { content, title, byline, dir: clone.documentElement.getAttribute('dir') || undefined };
  }

  private findContentContainer(doc: Document): Element | null {
    // 尝试常见选择器
    const selectors = [
      'article', 'main', '[role="main"]', '#content', '.content',
      '.post', '.entry', '.article', '.main-content', '.article-content',
      '.post-content', '.entry-content', '.story-body',
    ];

    for (const selector of selectors) {
      const el = doc.querySelector(selector);
      if (el && (el.textContent || '').length > 200) {
        return el;
      }
    }

    // 使用评分查找最佳候选
    const candidates = Array.from(doc.querySelectorAll('body, main, article, section, div'));
    let best: Element | null = null;
    let bestScore = -Infinity;
    const scorer = new AdvancedContentScorer();

    for (const el of candidates) {
      const score = scorer.calculateScore(el);
      if (score > bestScore) {
        bestScore = score;
        best = el;
      }
    }

    return best;
  }

  private extractTitle(doc: Document): string {
    // 尝试 Open Graph title
    const ogTitle = doc.querySelector('meta[property="og:title"]')?.getAttribute('content');
    if (ogTitle) return ogTitle;

    // 尝试 h1
    const h1 = doc.querySelector('h1');
    if (h1 && h1.textContent) return h1.textContent.trim();

    // 使用 document.title
    return doc.title || '';
  }

  private extractByline(container: Element): string | undefined {
    const selectors = [
      '.author', '.byline', '.meta-author', '.post-author',
      '[rel="author"]', '.entry-author', '.article-author',
    ];

    for (const selector of selectors) {
      const el = container.querySelector(selector);
      if (el && el.textContent) {
        return el.textContent.trim();
      }
    }

    return undefined;
  }

  private cleanContent(container: Element): void {
    // 移除空元素
    container.querySelectorAll('*').forEach(el => {
      if (!el.textContent?.trim() && !el.querySelector('img, video, audio, canvas, svg')) {
        el.remove();
      }
    });

    // 移除内联样式和事件
    container.querySelectorAll('[style], [onclick], [onmouseover], [onmouseout]').forEach(el => {
      el.removeAttribute('style');
      el.removeAttribute('onclick');
      el.removeAttribute('onmouseover');
      el.removeAttribute('onmouseout');
    });
  }

  private convertToText(container: Element): string {
    // 简化的文本转换
    let text = '';
    
    const walk = (node: Node, depth: number) => {
      if (node.nodeType === Node.TEXT_NODE) {
        text += (node.textContent || '').replace(/\s+/g, ' ');
        return;
      }

      if (node.nodeType !== Node.ELEMENT_NODE) return;

      const el = node as Element;
      const tag = el.tagName.toLowerCase();

      if (['script', 'style', 'link', 'meta', 'noscript'].includes(tag)) return;

      if (tag === 'br') {
        text += '\n';
        return;
      }

      if (tag === 'p' || tag === 'div' || tag === 'li' || tag === 'tr') {
        text += '\n';
      }

      if (tag.startsWith('h') && tag.length === 2) {
        text += '\n';
      }

      for (const child of Array.from(el.childNodes)) {
        walk(child, depth + 1);
      }

      if (tag === 'p' || tag === 'div' || tag === 'li' || tag === 'tr' || tag === 'blockquote') {
        text += '\n';
      }

      if (tag.startsWith('h') && tag.length === 2) {
        text += '\n';
      }
    };

    walk(container, 0);

    // 清理多余空白
    return text.replace(/\n{3,}/g, '\n\n').trim();
  }
}

/**
 * DOM到Markdown转换器 - 对标原生程序的 ElementToMarkdown
 */
class EnhancedDomToMarkdownConverter {
  private options: Required<EnhancedExtractOptions>;
  private urlSeen = new Set<string>();
  private urlCount = 0;
  private tableCounter = 1;
  private nestedTables = new Map<number, string>();
  private stats: EnhancedExtractionStats = {
    originalLength: 0,
    extractedLength: 0,
    paragraphCount: 0,
    imageCount: 0,
    linkCount: 0,
    codeBlockCount: 0,
    tableCount: 0,
    processingTime: 0,
  };
  private images: EnhancedImageResult[] = [];
  private links: LinkResult[] = [];

  private ignoreTags = new Set([
    'script', 'style', 'link', 'noscript', 'meta', 'head',
    'input', 'select', 'fieldset', 'option', 'optgroup',
  ]);

  private blockTags = new Set([
    'address', 'article', 'aside', 'audio', 'blockquote', 'body',
    'canvas', 'center', 'dd', 'dir', 'div', 'dl', 'dt', 'fieldset',
    'figcaption', 'figure', 'footer', 'form', 'frameset', 'h1', 'h2',
    'h3', 'h4', 'h5', 'h6', 'header', 'hgroup', 'hr', 'html', 'isindex',
    'li', 'main', 'menu', 'nav', 'noframes', 'noscript', 'ol', 'output',
    'p', 'pre', 'section', 'table', 'tbody', 'td', 'tfoot', 'th', 'thead',
    'tr', 'ul', 'video',
  ]);

  constructor(options: EnhancedExtractOptions = {}) {
    this.options = {
      maxChars: 120000,
      extractLinkUrl: true,
      extractImageUrl: true,
      maxUrls: 200,
      headingLevel: 0,
      includeMetadata: true,
      includeSummary: true,
      preserveCodeBlocks: true,
      extractTables: true,
      minContentLength: 100,
      recursiveSameDomain: false,
      maxRecursionDepth: 1,
      maxRecursiveLinks: 5,
      includeImageData: false,
      extractVideo: false,
      useReadability: true,
      extractContext: false,
      contextMaxLength: 5000,
      ...options,
    };
  }

  convert(node: Node | null | undefined): { markdown: string; stats: EnhancedExtractionStats; images: EnhancedImageResult[]; links: LinkResult[] } {
    if (!node) return { markdown: '', stats: this.stats, images: [], links: [] };
    
    let markdown = this.convertNode(node);
    
    // 清理多余空行
    markdown = markdown.replace(/\s+\n$/gim, '\n').replace(/\n{3,}/gim, '\n\n');

    // 添加嵌套表格脚注
    if (this.nestedTables.size > 0) {
      const footnotes: Array<{ id: number; content: string }> = [];
      this.nestedTables.forEach((content, id) => {
        footnotes.push({
          id,
          content: `\n\n[^table${id}]:\n${this.indent(this.codeWrap(content), 2, ' ')}\n`,
        });
      });
      markdown += footnotes
        .sort((a, b) => a.id - b.id)
        .map(x => x.content)
        .join('');
    }

    // 截断到最大长度
    if (markdown.length > this.options.maxChars) {
      markdown = markdown.slice(0, this.options.maxChars);
    }

    this.stats.extractedLength = markdown.length;

    return { markdown: markdown.trim(), stats: this.stats, images: this.images, links: this.links };
  }

  private convertNode(node: Node): string {
    if (node.nodeType === Node.TEXT_NODE) {
      const text = node.textContent || '';
      return text.replace(/\s+/g, ' ');
    }

    if (node.nodeType !== Node.ELEMENT_NODE) return '';

    const el = node as Element;
    const tag = el.tagName.toLowerCase();
    
    if (this.ignoreTags.has(tag)) return '';

    let out = '';
    switch (tag) {
      case 'h1': case 'h2': case 'h3': case 'h4': case 'h5': case 'h6':
        out = this.handleHeading(el as HTMLElement);
        break;
      case 'p':
        out = this.handleParagraph(el);
        break;
      case 'br':
        out = '\n';
        break;
      case 'hr':
        out = '\n---\n';
        break;
      case 'strong': case 'b':
        out = this.handleBold(el);
        break;
      case 'em': case 'i':
        out = this.handleItalic(el);
        break;
      case 'code':
        out = this.handleCode(el);
        break;
      case 'pre':
        out = this.handlePre(el);
        break;
      case 'blockquote':
        out = this.handleBlockquote(el);
        break;
      case 'ul': case 'ol':
        out = this.handleList(el);
        break;
      case 'table':
        out = this.handleTable(el);
        break;
      case 'img':
        out = this.handleImage(el);
        break;
      case 'a':
        out = this.handleLink(el);
        break;
      case 'video':
        if (this.options.extractVideo) {
          out = this.handleVideo(el);
        }
        break;
      default:
        out = this.handleChildren(el);
        break;
    }

    return this.blockTags.has(tag) ? `\n${out}\n` : out;
  }

  private handleHeading(el: HTMLElement): string {
    const level = parseInt(el.tagName[1]) + this.options.headingLevel;
    const prefix = '#'.repeat(Math.max(1, Math.min(6, level)));
    const text = this.getTextContent(el).trim();
    return `${prefix} ${text}`;
  }

  private handleParagraph(el: Element): string {
    this.stats.paragraphCount++;
    const text = this.convertChildren(el).trim();
    return text ? `${text}` : '';
  }

  private handleBold(el: Element): string {
    const text = this.getTextContent(el).trim();
    return text ? `**${text}**` : '';
  }

  private handleItalic(el: Element): string {
    const text = this.getTextContent(el).trim();
    return text ? `*${text}*` : '';
  }

  private handleCode(el: Element): string {
    const text = this.getTextContent(el);
    return text ? `\`${text}\`` : '';
  }

  private handlePre(el: Element): string {
    this.stats.codeBlockCount++;
    const code = el.querySelector('code');
    const lang = code?.className?.match(/language-(\w+)/)?.[1] || '';
    const text = this.getTextContent(code || el);
    return `\n\`\`\`${lang}\n${text}\n\`\`\`\n`;
  }

  private handleBlockquote(el: Element): string {
    const text = this.convertChildren(el).trim();
    return text.split('\n').map(line => `> ${line}`).join('\n');
  }

  private handleList(el: Element): string {
    const items = Array.from(el.children).filter(child => child.tagName.toLowerCase() === 'li');
    const ordered = el.tagName.toLowerCase() === 'ol';
    
    return items.map((item, index) => {
      const text = this.convertChildren(item).trim();
      const prefix = ordered ? `${index + 1}. ` : '- ';
      return `${prefix}${text}`;
    }).join('\n');
  }

  private handleTable(el: Element): string {
    this.stats.tableCount++;
    const rows = Array.from(el.querySelectorAll('tr'));
    if (rows.length === 0) return '';

    const csvRows: string[] = [];
    
    for (const row of rows) {
      const cells = Array.from(row.children).filter(cell => ['th', 'td'].includes(cell.tagName.toLowerCase()));
      const csvCells: string[] = [];
      
      for (const cell of cells) {
        let text = this.convertChildren(cell).trim();
        const colspan = parseInt(cell.getAttribute('colspan') || '1');
        
        // CSV 转义
        if (/[,"\n]/.test(text)) {
          text = `"${text.replace(/"/g, "'")}"`;
        }
        
        for (let i = 0; i < colspan; i++) {
          csvCells.push(i === 0 ? text : '');
        }
      }
      
      csvRows.push(csvCells.join(','));
    }

    // 添加表头分隔符
    if (csvRows.length > 1) {
      const headerCells = csvRows[0].split(',').length;
      csvRows.splice(1, 0, Array(headerCells).fill('---').join(','));
    }

    return `\n${csvRows.join('\n')}\n`;
  }

  private handleImage(el: Element): string {
    this.stats.imageCount++;
    const src = el.getAttribute('src') || '';
    const alt = el.getAttribute('alt') || '';
    const title = el.getAttribute('title') || '';

    if (src) {
      if (this.options.extractImageUrl && this.urlCount < this.options.maxUrls) {
        this.images.push({ url: src, alt, title: title || undefined });
        this.urlCount++;
      }

      const titleAttr = title ? ` "${title}"` : '';
      return `![${alt}](${src}${titleAttr})`;
    }

    return '';
  }

  private handleLink(el: Element): string {
    this.stats.linkCount++;
    const href = el.getAttribute('href') || '';
    const text = this.getTextContent(el).trim();

    if (href && text) {
      if (this.options.extractLinkUrl && this.urlCount < this.options.maxUrls) {
        const isSameDomain = this.isSameDomain(href);
        this.links.push({ url: href, text, isSameDomain });
        this.urlCount++;
      }
      return `[${text}](${href})`;
    }

    return text;
  }

  private handleVideo(el: Element): string {
    const src = el.getAttribute('src') || '';
    const poster = el.getAttribute('poster') || '';
    
    if (src) {
      return `\n[视频](${src})${poster ? ` (封面: ${poster})` : ''}\n`;
    }
    return '';
  }

  private handleChildren(el: Element): string {
    return this.convertChildren(el);
  }

  private convertChildren(el: Element): string {
    let out = '';
    for (const child of Array.from(el.childNodes)) {
      out += this.convertNode(child);
    }
    return out;
  }

  private getTextContent(el: Element): string {
    return el.textContent || '';
  }

  private isSameDomain(url: string): boolean {
    try {
      const currentHost = window.location.hostname;
      const urlHost = new URL(url, window.location.origin).hostname;
      return currentHost === urlHost;
    } catch {
      return false;
    }
  }

  private codeWrap(text: string): string {
    return text.replace(/^/gm, '    ');
  }

  private indent(text: string, n: number, char: string): string {
    const prefix = char.repeat(n);
    return text.split('\n').map(line => prefix + line).join('\n');
  }
}

/**
 * 高级网页内容提取器
 */
export class AdvancedWebContentExtractor {
  private scorer = new AdvancedContentScorer();
  private readability = new ReadabilityExtractor();

  /**
   * 提取网页内容
   */
  async extract(options: EnhancedExtractOptions = {}): Promise<EnhancedExtractResult> {
    const startTime = Date.now();
    const opts: Required<EnhancedExtractOptions> = {
      maxChars: 120000,
      extractLinkUrl: true,
      extractImageUrl: true,
      maxUrls: 200,
      headingLevel: 0,
      includeMetadata: true,
      includeSummary: true,
      preserveCodeBlocks: true,
      extractTables: true,
      minContentLength: 100,
      recursiveSameDomain: false,
      maxRecursionDepth: 1,
      maxRecursiveLinks: 5,
      includeImageData: false,
      extractVideo: false,
      useReadability: true,
      extractContext: false,
      contextMaxLength: 5000,
      ...options,
    };

    try {
      // 1. 提取元数据
      const metadata = this.extractMetadata();

      // 2. 查找主要内容区域
      const mainContent = this.findMainContent();
      if (!mainContent) {
        return {
          content: '',
          title: document.title,
          url: window.location.href,
          metadata,
          stats: this.getEmptyStats(Date.now() - startTime),
          success: false,
          error: 'No main content found',
        };
      }

      // 3. 转换为 Markdown
      const converter = new EnhancedDomToMarkdownConverter(opts);
      const { markdown, stats, images, links } = converter.convert(mainContent);

      // 4. 如果使用 Readability，尝试提取更干净的正文
      let content = markdown;
      if (opts.useReadability) {
        const readabilityResult = this.readability.extract(document);
        if (readabilityResult && readabilityResult.content.length > content.length * 0.8) {
          content = readabilityResult.content;
          if (readabilityResult.title) {
            metadata.title = readabilityResult.title;
          }
        }
      }

      // 5. 生成摘要
      const summary = opts.includeSummary ? this.generateSummary(content) : undefined;

      // 6. 提取上下文（如果有选中文本）
      const contextText = opts.extractContext ? this.extractContextText(opts.contextMaxLength) : undefined;

      stats.originalLength = mainContent.textContent?.length || 0;
      stats.processingTime = Date.now() - startTime;

      return {
        content,
        title: metadata.title,
        url: window.location.href,
        author: metadata.author || undefined,
        publishedAt: metadata.publishedTime || undefined,
        summary,
        metadata,
        stats,
        success: true,
        images,
        links,
        contextText,
      };
    } catch (error) {
      return {
        content: '',
        title: document.title,
        url: window.location.href,
        metadata: this.extractMetadata(),
        stats: this.getEmptyStats(Date.now() - startTime),
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * 提取元数据
   */
  private extractMetadata(): EnhancedPageMetadata {
    const getMeta = (name: string, property?: string): string => {
      const el = document.querySelector(`meta[name="${name}"]`) ||
                 document.querySelector(`meta[property="${property || name}"]`);
      return el?.getAttribute('content') || '';
    };

    // 提取 Open Graph 数据
    const openGraph: Record<string, string> = {};
    document.querySelectorAll('meta[property^="og:"]').forEach(meta => {
      const prop = meta.getAttribute('property') || '';
      const content = meta.getAttribute('content') || '';
      if (prop && content) {
        openGraph[prop.replace('og:', '')] = content;
      }
    });

    // 提取 Twitter Card 数据
    const twitterCard: Record<string, string> = {};
    document.querySelectorAll('meta[name^="twitter:"]').forEach(meta => {
      const name = meta.getAttribute('name') || '';
      const content = meta.getAttribute('content') || '';
      if (name && content) {
        twitterCard[name.replace('twitter:', '')] = content;
      }
    });

    return {
      title: openGraph.title || getMeta('title') || document.title,
      description: openGraph.description || getMeta('description') || '',
      keywords: getMeta('keywords'),
      author: getMeta('author') || getMeta('author', 'article:author') || '',
      publishedTime: getMeta('published_time', 'article:published_time') || '',
      modifiedTime: getMeta('modified_time', 'article:modified_time') || '',
      siteName: openGraph.site_name || getMeta('site_name') || '',
      favicon: document.querySelector('link[rel="icon"]')?.getAttribute('href') ||
               document.querySelector('link[rel="shortcut icon"]')?.getAttribute('href') || '',
      coverImage: openGraph.image || getMeta('image') || twitterCard.image || '',
      type: getMeta('type', 'og:type') || 'article',
      language: document.documentElement.lang || '',
      openGraph,
      twitterCard,
    };
  }

  /**
   * 查找主要内容区域
   */
  private findMainContent(): Element | null {
    // 1. 尝试特定选择器
    const selectors = [
      'article', 'main', '[role="main"]', '#content', '.content',
      '.post', '.entry', '.article', '.main-content', '.article-content',
      '.post-content', '.entry-content', '.story-body', '.article-body',
      '.markdown-body', '.rich-text', '.text-content',
    ];

    for (const selector of selectors) {
      const el = document.querySelector(selector);
      if (el && (el.textContent || '').length > 200) {
        return el;
      }
    }

    // 2. 使用评分查找最佳候选
    const candidates = Array.from(document.querySelectorAll('body, main, article, section, div'));
    let best: Element | null = null;
    let bestScore = -Infinity;

    for (const el of candidates) {
      const score = this.scorer.calculateScore(el);
      if (score > bestScore) {
        bestScore = score;
        best = el;
      }
    }

    return best || document.body || document.documentElement;
  }

  /**
   * 生成内容摘要
   */
  private generateSummary(content: string): string {
    const plainText = content
      .replace(/#{1,6}\s/g, '')
      .replace(/\*\*/g, '')
      .replace(/`{3}[\s\S]*?`{3}/g, '')
      .replace(/`([^`]+)`/g, '$1')
      .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
      .replace(/!\[([^\]]*)\]\([^)]+\)/g, '')
      .replace(/>\s?/g, '')
      .replace(/\n+/g, ' ')
      .trim();

    const maxLength = 200;
    if (plainText.length <= maxLength) return plainText;
    
    const summary = plainText.slice(0, maxLength);
    const lastPeriod = summary.lastIndexOf('。');
    const lastSpace = summary.lastIndexOf(' ');
    
    if (lastPeriod > maxLength * 0.5) {
      return summary.slice(0, lastPeriod + 1);
    }
    if (lastSpace > maxLength * 0.5) {
      return summary.slice(0, lastSpace) + '...';
    }
    return summary + '...';
  }

  /**
   * 提取上下文文本（选中内容的上下文）
   */
  private extractContextText(maxLength: number): string {
    const selection = window.getSelection();
    if (!selection || !selection.toString().trim()) {
      return '';
    }

    const range = selection.getRangeAt(0);
    const container = range.commonAncestorContainer;
    const parent = container.nodeType === Node.TEXT_NODE ? container.parentElement : container as Element;
    if (!parent) return '';

    // 获取选中内容的上下文
    let contextText = '';
    let current: Element | null = parent;
    
    // 向上遍历获取足够上下文
    while (current && contextText.length < maxLength) {
      const text = current.textContent || '';
      if (text.length > contextText.length) {
        contextText = text;
      }
      current = current.parentElement;
    }

    // 截断到最大长度
    if (contextText.length > maxLength) {
      const selectionText = selection.toString();
      const selectionIndex = contextText.indexOf(selectionText);
      if (selectionIndex >= 0) {
        const start = Math.max(0, selectionIndex - 100);
        const end = Math.min(contextText.length, selectionIndex + selectionText.length + 100);
        contextText = contextText.slice(start, end);
      } else {
        contextText = contextText.slice(0, maxLength);
      }
    }

    return contextText.trim();
  }

  /**
   * 提取选中的文本
   */
  extractSelection(): { text: string; markdown: string; contextText?: string } | null {
    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0) return null;

    const range = selection.getRangeAt(0);
    const container = document.createElement('div');
    container.appendChild(range.cloneContents());

    const converter = new EnhancedDomToMarkdownConverter();
    const { markdown } = converter.convert(container);

    return {
      text: selection.toString(),
      markdown,
      contextText: this.extractContextText(5000),
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
  } {
    const bodyText = document.body?.textContent || '';
    return {
      url: window.location.href,
      title: document.title,
      favicon: document.querySelector('link[rel="icon"]')?.getAttribute('href') || '',
      length: bodyText.length,
      wordCount: bodyText.split(/\s+/).filter(Boolean).length,
    };
  }

  private getEmptyStats(processingTime: number): EnhancedExtractionStats {
    return {
      originalLength: 0,
      extractedLength: 0,
      paragraphCount: 0,
      imageCount: 0,
      linkCount: 0,
      codeBlockCount: 0,
      tableCount: 0,
      processingTime,
    };
  }
}

// 导出单例实例
export const advancedWebContentExtractor = new AdvancedWebContentExtractor();
