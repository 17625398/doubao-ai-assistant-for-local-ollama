/**
 * 智能网页内容提取器
 * 参考豆包原生程序实现的高级网页内容提取功能
 */

import { logger } from './logger';

logger.setPrefix('[WebContentExtractor]');

export interface ExtractOptions {
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
}

export interface ExtractResult {
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
  metadata: PageMetadata;
  /** 提取统计 */
  stats: ExtractionStats;
  /** 是否成功 */
  success: boolean;
  /** 错误信息 */
  error?: string;
  /** 递归提取的子页面 */
  subPages?: SubPageResult[];
  /** 提取的图片 */
  images?: ImageResult[];
}

export interface SubPageResult {
  /** 页面URL */
  url: string;
  /** 页面标题 */
  title: string;
  /** 提取的内容 */
  content: string;
  /** 提取深度 */
  depth: number;
  /** 是否成功 */
  success: boolean;
  /** 错误信息 */
  error?: string;
}

export interface ImageResult {
  /** 图片URL */
  url: string;
  /** 图片alt文本 */
  alt: string;
  /** 图片标题 */
  title?: string;
  /** 图片数据（base64） */
  dataUrl?: string;
  /** 图片宽度 */
  width?: number;
  /** 图片高度 */
  height?: number;
}

export interface PageMetadata {
  /** 页面标题 */
  title: string;
  /** 页面描述 */
  description: string;
  /** 关键词 */
  keywords: string;
  /** 作者 */
  author: string;
  /** 发布时间 */
  publishedTime: string;
  /** 修改时间 */
  modifiedTime: string;
  /** 站点名称 */
  siteName: string;
  /** 图标URL */
  favicon: string;
  /** 封面图片 */
  coverImage: string;
  /** 文章类型 */
  type: string;
  /** 语言 */
  language: string;
}

export interface ExtractionStats {
  /** 原始文本长度 */
  originalLength: number;
  /** 提取后文本长度 */
  extractedLength: number;
  /** 段落数量 */
  paragraphCount: number;
  /** 图片数量 */
  imageCount: number;
  /** 链接数量 */
  linkCount: number;
  /** 代码块数量 */
  codeBlockCount: number;
  /** 表格数量 */
  tableCount: number;
  /** 处理时间(ms) */
  processingTime: number;
}

/** 智能内容评分器 */
class ContentScorer {
  private negativePatterns = [
    /comment/i,
    /footer/i,
    /header/i,
    /nav/i,
    /breadcrumb/i,
    /sidebar/i,
    /recommend/i,
    /related/i,
    /share/i,
    /social/i,
    /promo/i,
    /advert/i,
    /ads/i,
    /popup/i,
    /modal/i,
    /overlay/i,
    /widget/i,
    /subscribe/i,
    /newsletter/i,
    /copyright/i,
  ];

  private positivePatterns = [
    /article/i,
    /post/i,
    /entry/i,
    /content/i,
    /main/i,
    /markdown/i,
    /richtext/i,
    /detail/i,
    /doc/i,
    /body/i,
    /text/i,
    /story/i,
    /blog/i,
  ];

  private structuralTags = ['article', 'main', 'section', 'div'];

  calculateScore(element: Element): number {
    const tagName = element.tagName.toLowerCase();
    
    // 排除特定标签
    if (['nav', 'footer', 'header', 'aside', 'script', 'style', 'noscript'].includes(tagName)) {
      return -Infinity;
    }

    const text = element.textContent || '';
    const normalizedText = this.normalizeText(text);
    const textLength = normalizedText.length;

    // 最小长度检查
    if (textLength < 100) return -Infinity;

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

/** DOM到Markdown转换器 */
type ConverterStats = {
  imageCount: number;
  linkCount: number;
  codeBlockCount: number;
  tableCount: number;
  paragraphCount: number;
};

class DomToMarkdownConverter {
  private options: Required<ExtractOptions>;
  private urlSeen = new Set<string>();
  private urlCount = 0;
  private tableCounter = 1;
  private nestedTables = new Map<number, string>();
  private stats: ConverterStats = {
    imageCount: 0,
    linkCount: 0,
    codeBlockCount: 0,
    tableCount: 0,
    paragraphCount: 0,
  };

  private ignoreTags = new Set([
    'script', 'style', 'link', 'noscript', 'meta', 'head',
    'input', 'select', 'fieldset', 'option', 'optgroup',
  ]);

  private voidTags = new Set([
    'area', 'base', 'br', 'col', 'embed', 'hr', 'img', 'input',
    'link', 'meta', 'param', 'source', 'track', 'wbr',
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

  constructor(options: ExtractOptions = {}) {
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
      ...options,
    };
  }

  convert(node: Node | null | undefined): { markdown: string; stats: ConverterStats } {
    if (!node) return { markdown: '', stats: this.stats };
    
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

    return { markdown: markdown.trim(), stats: this.stats };
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

    // 处理Shadow DOM
    if ((el as unknown as { shadowRoot?: ShadowRoot | null }).shadowRoot) {
      const shadow = (el as unknown as { shadowRoot?: ShadowRoot | null }).shadowRoot;
      if (!shadow) return '';
      let out = '';
      for (const child of Array.from(shadow.childNodes)) {
        out += this.convertNode(child);
      }
      return out;
    }

    // 处理slot
    if (el instanceof HTMLSlotElement) {
      const assigned = el.assignedNodes();
      let out = '';
      for (const n of Array.from(assigned)) out += this.convertNode(n);
      return out;
    }

    let out = '';
    switch (tag) {
      case 'h1':
      case 'h2':
      case 'h3':
      case 'h4':
      case 'h5':
      case 'h6':
        out = this.handleHeading(el as HTMLElement);
        break;
      case 'p':
        out = this.handleParagraph(el);
        break;
      case 'strong':
      case 'b':
        out = this.handleBold(el);
        break;
      case 'em':
      case 'i':
        out = this.handleItalic(el);
        break;
      case 'a':
        out = this.handleLink(el as HTMLAnchorElement);
        break;
      case 'img':
        out = this.handleImage(el as HTMLImageElement);
        break;
      case 'ul':
      case 'ol':
        out = this.handleList(el as HTMLOListElement | HTMLUListElement);
        break;
      case 'li':
        out = this.handleListItem(el);
        break;
      case 'blockquote':
        out = this.handleBlockquote(el);
        break;
      case 'pre':
        out = this.handlePreformatted(el);
        break;
      case 'code':
        out = this.handleCode(el);
        break;
      case 'table':
        out = this.handleTable(el as HTMLTableElement);
        break;
      case 'br':
        return '\n';
      case 'hr':
        out = '\n---\n';
        break;
      case 'del':
      case 's':
      case 'strike':
        out = this.handleStrikethrough(el);
        break;
      case 'mark':
      case 'ins':
        out = this.handleHighlight(el);
        break;
      case 'sub':
        out = this.handleSubscript(el);
        break;
      case 'sup':
        out = this.handleSuperscript(el);
        break;
      case 'iframe':
        out = this.handleIframe(el as HTMLIFrameElement);
        break;
      case 'embed':
      case 'object':
        out = this.handleEmbed(el);
        break;
      default:
        out = this.handleChildren(el);
        break;
    }

    if (out.trim().length <= 0) return '';

    if (this.blockTags.has(tag)) {
      out = `\n\n${out}\n\n`;
    } else if (out.trim().length > 0) {
      out = `${out} `;
    }

    return out;
  }

  private handleChildren(el: Element): string {
    let out = '';
    for (const child of Array.from(el.childNodes)) {
      out += this.convertNode(child);
    }
    return out;
  }

  private handleHeading(el: HTMLElement): string {
    const level = Math.min(
      Number.parseInt(el.tagName[1] || '1', 10) + this.options.headingLevel,
      6
    );
    const text = this.handleChildren(el).replace(/^\s+/, '');
    if (text.trim().length <= 0) return '';
    return `${'#'.repeat(level)} ${text}`;
  }

  private handleParagraph(el: Element): string {
    const text = this.handleChildren(el).trim();
    if (!text) return '';
    this.stats.paragraphCount++;
    return text;
  }

  private handleBold(el: Element): string {
    const text = this.handleChildren(el).trim();
    if (text.length <= 0) return '';
    return `**${text}**`;
  }

  private handleItalic(el: Element): string {
    const text = this.handleChildren(el).trim();
    if (text.length <= 0) return '';
    return `_${text}_`;
  }

  private handleStrikethrough(el: Element): string {
    const text = this.handleChildren(el).trim();
    if (text.length <= 0) return '';
    return `~~${text}~~`;
  }

  private handleHighlight(el: Element): string {
    const text = this.handleChildren(el).trim();
    if (text.length <= 0) return '';
    return `==${text}==`;
  }

  private handleSubscript(el: Element): string {
    const text = this.handleChildren(el).trim();
    if (text.length <= 0) return '';
    return `~${text}~`;
  }

  private handleSuperscript(el: Element): string {
    const text = this.handleChildren(el).trim();
    if (text.length <= 0) return '';
    return `^${text}^`;
  }

  private normalizeUrl(url: string): string {
    if (url.startsWith('//')) return `${location.protocol}${url}`;
    if (url.startsWith('/')) return `${location.origin}${url}`;
    return url;
  }

  private takeUrl(raw: string): string | null {
    if (!raw) return null;
    const normalized = this.normalizeUrl(raw.trim());
    if (normalized.startsWith('javascript:')) return null;
    if (normalized.startsWith('data:')) return null;
    if (normalized.startsWith('mailto:')) return null;
    if (normalized.length >= 2048) return null;
    
    let abs: string;
    try {
      abs = new URL(normalized, location.href).toString();
    } catch {
      return null;
    }
    
    if (!abs.startsWith('http://') && !abs.startsWith('https://')) return null;
    if (this.urlSeen.has(abs)) return abs;
    if (this.urlCount >= this.options.maxUrls) return null;
    
    this.urlSeen.add(abs);
    this.urlCount++;
    return abs;
  }

  private handleLink(el: HTMLAnchorElement): string {
    const text = this.handleChildren(el).replace(/\n/g, ' ').trim();
    if (!text) return '';

    if (!this.options.extractLinkUrl) return text;

    const href = this.takeUrl(el.getAttribute('href') || '');
    if (!href) return text;
    
    this.stats.linkCount++;
    const markdown = `[${text}](${href})`;
    if (/^#+ /.test(text)) return `\n\n${markdown}\n\n`;
    return markdown;
  }

  private handleImage(el: HTMLImageElement): string {
    const alt = (el.getAttribute('alt') || '').trim();
    
    if (!this.options.extractImageUrl) {
      return alt ? `![${alt}]()` : '';
    }

    const src = this.takeUrl(el.currentSrc || el.getAttribute('src') || '');
    if (!src && !alt) return '';
    if (!src) return alt ? `![${alt}]()` : '';
    
    this.stats.imageCount++;
    return `![${alt}](${src})`;
  }

  private handleList(el: HTMLOListElement | HTMLUListElement): string {
    const ordered = el.tagName.toLowerCase() === 'ol';
    let out = '';
    let index = 1;

    for (const child of Array.from(el.children)) {
      if (!(child instanceof Element)) continue;
      if (child.tagName.toLowerCase() !== 'li') {
        out += this.convertNode(child);
        continue;
      }
      const inner = this.indent(this.handleChildren(child).trim(), 1).trim();
      if (!inner) continue;
      if (ordered) {
        out += `\n${index}. ${inner}`;
        index++;
      } else {
        out += `\n- ${inner}`;
      }
    }
    return out ? `${out}` : '';
  }

  private handleListItem(el: Element): string {
    return this.handleChildren(el);
  }

  private handleBlockquote(el: Element): string {
    const text = this.handleChildren(el)
      .split('\n')
      .map(line => `> ${line}`)
      .join('\n');
    return text;
  }

  private handlePreformatted(el: Element): string {
    const codeEl = el.querySelector('code');
    if (codeEl) {
      return this.handleCode(codeEl, true);
    }
    const text = el.textContent || '';
    return this.codeWrap(text, '');
  }

  private handleCode(el: Element, isBlock = false): string {
    const text = el.textContent || '';
    const tag = el.tagName.toLowerCase();
    
    if (tag === 'code' && !isBlock && el.parentElement?.tagName.toLowerCase() !== 'pre') {
      return `\`${text}\``;
    }
    
    this.stats.codeBlockCount++;
    const cls = (el.getAttribute('class') || '').trim();
    const lang = cls.startsWith('language-') 
      ? cls.replace('language-', '') 
      : cls.match(/\b(?:javascript|python|java|cpp|c\+\+|ruby|go|rust|typescript|html|css|json|xml|yaml|sql|bash|shell|powershell)\b/i)?.[0] || '';
    
    return this.codeWrap(text, lang.toLowerCase());
  }

  private codeWrap(code: string, lang = ''): string {
    const normalized = code.replace(/^\n+|\n+$/gi, '');
    return `\`\`\`${lang}\n${normalized}\n\`\`\``;
  }

  private indent(text: string, count = 0, unit = '\t'): string {
    if (count <= 0) return text;
    const prefix = unit.repeat(count);
    return text
      .split('\n')
      .map(line => (line.trim() ? `${prefix}${line}` : line))
      .join('\n');
  }

  private escapeCsvCell(text: string): string {
    if (!text) return '';
    let needWrap = false;
    const escaped = text.replace(/[,"\n]/gim, (ch) => {
      needWrap = true;
      if (ch === '"') return "'";
      if (ch === '\n') return '\\n';
      return ch;
    });
    return needWrap ? `"${escaped}"` : escaped;
  }

  private processRowToCSV(tr: Element): string {
    const cells = Array.from(tr.children).filter(x => {
      const tag = x.tagName.toLowerCase();
      return tag === 'th' || tag === 'td';
    });

    const row: string[] = [];
    for (const cell of cells) {
      let value = '';
      for (const child of Array.from(cell.childNodes)) {
        if (child.nodeType === Node.ELEMENT_NODE && (child as Element).tagName.toLowerCase() === 'table') {
          const id = this.tableCounter;
          this.tableCounter++;
          const tableText = this.handleTableElement(child as Element);
          this.nestedTables.set(id, tableText);
          value += `[^table${id}]`;
          continue;
        }
        value += this.convertNode(child);
      }
      value = value.trim();

      const colspanRaw = (cell as Element).getAttribute('colspan') || '1';
      const colspan = Number.isFinite(Number(colspanRaw)) ? Math.max(1, Number(colspanRaw)) : 1;
      for (let i = 0; i < colspan; i++) {
        if (i === 0) row.push(this.escapeCsvCell(value));
        else row.push('');
      }
    }

    return row.join(',');
  }

  private handleTableElement(el: Element): string {
    const tag = el.tagName.toLowerCase();
    if (tag === 'table') {
      let csv = '\n';
      const groups = Array.from(el.children).filter(x => {
        const t = x.tagName.toLowerCase();
        return t === 'thead' || t === 'tbody' || t === 'tfoot';
      });

      let rows: Element[] = [];
      if (groups.length > 0) {
        for (const g of groups) {
          rows = rows.concat(Array.from(g.children).filter(x => x.tagName.toLowerCase() === 'tr'));
        }
      } else {
        rows = Array.from(el.children).filter(x => x.tagName.toLowerCase() === 'tr');
      }

      for (const tr of rows) csv += `${this.processRowToCSV(tr)}\n`;
      return `${csv}\n`;
    }

    if (tag === 'th' || tag === 'td') return this.convertNode(el).trim();
    return this.handleChildren(el);
  }

  private handleTable(el: HTMLTableElement): string {
    if (!this.options.extractTables) return '';
    
    this.stats.tableCount++;
    const csv = this.handleTableElement(el);
    return `\n\`\`\`csv\n${csv}\`\`\`\n`;
  }

  private handleIframe(el: HTMLIFrameElement): string {
    // 尝试获取 iframe 的内容
    try {
      const iframeDoc = el.contentDocument || el.contentWindow?.document;
      if (iframeDoc && iframeDoc.body) {
        // 递归提取 iframe 内容
        const iframeContent = this.convertNode(iframeDoc.body);
        if (iframeContent.trim()) {
          return `\n\n[iframe 内容]\n${iframeContent}\n[/iframe]\n\n`;
        }
      }
    } catch (e) {
      // 跨域 iframe 无法访问，尝试获取 src
      const src = el.getAttribute('src');
      if (src) {
        return `\n\n[iframe: ${this.normalizeUrl(src)}]\n\n`;
      }
    }
    return '';
  }

  private handleEmbed(el: Element): string {
    const src = el.getAttribute('src') || el.getAttribute('data') || '';
    const type = el.getAttribute('type') || '';
    
    if (src) {
      if (type.includes('video') || el.tagName.toLowerCase() === 'video') {
        return `\n\n[视频: ${this.normalizeUrl(src)}]\n\n`;
      }
      if (type.includes('audio') || el.tagName.toLowerCase() === 'audio') {
        return `\n\n[音频: ${this.normalizeUrl(src)}]\n\n`;
      }
      return `\n\n[嵌入内容: ${this.normalizeUrl(src)}]\n\n`;
    }
    return '';
  }
}

/** 元数据提取器 */
class MetadataExtractor {
  extract(): PageMetadata {
    return {
      title: this.getTitle(),
      description: this.getDescription(),
      keywords: this.getKeywords(),
      author: this.getAuthor(),
      publishedTime: this.getPublishedTime(),
      modifiedTime: this.getModifiedTime(),
      siteName: this.getSiteName(),
      favicon: this.getFavicon(),
      coverImage: this.getCoverImage(),
      type: this.getType(),
      language: this.getLanguage(),
    };
  }

  private getMeta(name: string): string {
    const el = document.querySelector(`meta[name="${CSS.escape(name)}"]`) as HTMLMetaElement | null;
    return el?.getAttribute('content')?.trim() || '';
  }

  private getMetaProperty(property: string): string {
    const el = document.querySelector(`meta[property="${CSS.escape(property)}"]`) as HTMLMetaElement | null;
    return el?.getAttribute('content')?.trim() || '';
  }

  private getTitle(): string {
    return (
      this.getMetaProperty('og:title') ||
      this.getMeta('twitter:title') ||
      this.getMeta('title') ||
      document.title ||
      ''
    ).trim();
  }

  private getDescription(): string {
    return (
      this.getMetaProperty('og:description') ||
      this.getMeta('twitter:description') ||
      this.getMeta('description') ||
      ''
    ).trim();
  }

  private getKeywords(): string {
    return this.getMeta('keywords');
  }

  private getAuthor(): string {
    const fromMeta =
      this.getMeta('author') ||
      this.getMetaProperty('article:author') ||
      this.getMetaProperty('og:article:author') ||
      this.getMetaProperty('book:author') ||
      this.getMetaProperty('profile:first_name');
    if (fromMeta) return fromMeta;

    const relAuthor = document.querySelector('[rel="author"]') as HTMLElement | null;
    const relText = (relAuthor?.textContent || '').trim();
    if (relText) return relText;

    const classHit = document.querySelector(
      '.author, .post-author, .article-author, [itemprop="author"], [class*="author"]'
    ) as HTMLElement | null;
    return (classHit?.textContent || '').replace(/\s+/g, ' ').trim();
  }

  private getPublishedTime(): string {
    const fromMeta =
      this.getMetaProperty('article:published_time') ||
      this.getMeta('pubdate') ||
      this.getMeta('publishdate') ||
      this.getMeta('timestamp');
    if (fromMeta) return fromMeta;

    const timeEl = document.querySelector('time[datetime]') as HTMLTimeElement | null;
    return (timeEl?.getAttribute('datetime') || '').trim();
  }

  private getModifiedTime(): string {
    return (
      this.getMetaProperty('article:modified_time') ||
      this.getMetaProperty('og:updated_time') ||
      ''
    );
  }

  private getSiteName(): string {
    return this.getMetaProperty('og:site_name') || '';
  }

  private getFavicon(): string {
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
      const el = document.querySelector(selector) as HTMLLinkElement | null;
      if (el?.href) return el.href;
    }
    
    return `${location.origin}/favicon.ico`;
  }

  private getCoverImage(): string {
    return (
      this.getMetaProperty('og:image') ||
      this.getMeta('twitter:image') ||
      this.getMetaProperty('og:image:secure_url') ||
      ''
    );
  }

  private getType(): string {
    return this.getMetaProperty('og:type') || 'article';
  }

  private getLanguage(): string {
    return (
      document.documentElement.lang ||
      this.getMeta('language') ||
      'zh-CN'
    );
  }
}

/** 内容清理器 */
class ContentCleaner {
  private removeSelectors = [
    'script',
    'style',
    'link',
    'noscript',
    'nav',
    'header:not([role="banner"])',
    'footer',
    'aside',
    'form',
    // 'iframe', // 保留 iframe，让转换器处理
    'canvas',
    'svg',
    '[role="navigation"]',
    '[role="banner"]:not(header)',
    '[aria-hidden="true"]',
    '[hidden]',
    '.comment',
    '#comments',
    '.comments',
    '.sidebar',
    '#sidebar',
    '.breadcrumb',
    '.pagination',
    '.related',
    '.recommend',
    '.share',
    '.social',
    '.advert',
    '.ads',
    '[class*=" ad-"]',
    '[id*="ad-"]',
    '[class*="ads"]',
    '[id*="ads"]',
    '.popup',
    '.modal',
    '.overlay',
    '.widget',
    '.subscribe',
    '.newsletter',
    '.copyright',
    '.cookie-banner',
    '.gdpr',
  ];

  clean(element: Element): Element {
    const clone = element.cloneNode(true) as Element;
    
    for (const selector of this.removeSelectors) {
      try {
        clone.querySelectorAll(selector).forEach(n => n.remove());
      } catch {
        // 忽略无效选择器
      }
    }

    // 移除空元素
    this.removeEmptyElements(clone);
    
    return clone;
  }

  private removeEmptyElements(element: Element): void {
    const empties = element.querySelectorAll('*');
    empties.forEach(el => {
      const text = el.textContent?.trim() || '';
      const hasChildren = el.children.length > 0;
      const tag = el.tagName.toLowerCase();
      const isMedia = ['img', 'video', 'audio', 'iframe', 'canvas'].includes(tag);
      const isStructuralEmpty = ['br', 'hr'].includes(tag);
      
      if (!text && !hasChildren && !isMedia && !isStructuralEmpty) {
        el.remove();
      }
    });
  }
}

/** 主提取器类 */
export class WebContentExtractor {
  private scorer = new ContentScorer();
  private metadataExtractor = new MetadataExtractor();
  private cleaner = new ContentCleaner();

  /**
   * 等待动态内容加载完成
   * 用于处理 JavaScript 动态加载的 SPA 页面
   */
  async waitForDynamicContent(options: {
    maxWaitTime?: number;
    stabilityThreshold?: number;
    checkInterval?: number;
  } = {}): Promise<void> {
    const { 
      maxWaitTime = 5000, 
      stabilityThreshold = 500, 
      checkInterval = 100 
    } = options;
    
    const startTime = Date.now();
    let lastContentLength = document.body?.textContent?.length || 0;
    let lastChangeTime = startTime;
    
    return new Promise((resolve) => {
      const checkStability = () => {
        const currentTime = Date.now();
        const elapsed = currentTime - startTime;
        
        // 超过最大等待时间
        if (elapsed >= maxWaitTime) {
          logger.debug('Max wait time reached, proceeding with extraction');
          resolve();
          return;
        }
        
        const currentContentLength = document.body?.textContent?.length || 0;
        
        // 内容发生变化
        if (currentContentLength !== lastContentLength) {
          lastContentLength = currentContentLength;
          lastChangeTime = currentTime;
          setTimeout(checkStability, checkInterval);
          return;
        }
        
        // 内容稳定超过阈值时间
        if (currentTime - lastChangeTime >= stabilityThreshold) {
          logger.debug('Content stabilized, proceeding with extraction');
          resolve();
          return;
        }
        
        // 继续检查
        setTimeout(checkStability, checkInterval);
      };
      
      checkStability();
    });
  }

  /**
   * 提取页面主要内容
   */
  extract(options: ExtractOptions = {}): ExtractResult {
    const startTime = performance.now();
    
    try {
      // 提取元数据
      const metadata = this.metadataExtractor.extract();
      
      // 查找主要内容区域
      const mainRoot = this.findMainContent();
      
      // 清理内容
      const cleanedRoot = this.cleaner.clean(mainRoot);
      
      // 转换为Markdown
      const converter = new DomToMarkdownConverter(options);
      const { markdown, stats } = converter.convert(cleanedRoot);
      
      // 生成摘要
      let summary = '';
      if (options.includeSummary !== false) {
        summary = this.generateSummary(markdown);
      }
      
      const processingTime = Math.round(performance.now() - startTime);
      
      const result: ExtractResult = {
        content: markdown,
        title: metadata.title,
        url: window.location.href,
        author: metadata.author || undefined,
        publishedAt: metadata.publishedTime || undefined,
        summary,
        metadata,
        stats: {
          originalLength: document.body?.textContent?.length || 0,
          extractedLength: markdown.length,
          paragraphCount: stats.paragraphCount,
          imageCount: stats.imageCount,
          linkCount: stats.linkCount,
          codeBlockCount: stats.codeBlockCount,
          tableCount: stats.tableCount,
          processingTime,
        },
        success: true,
      };

      // 提取图片
      if (options.extractImageUrl || options.includeImageData) {
        result.images = this.extractImages(options);
      }

      return result;
    } catch (error) {
      logger.error('Content extraction failed:', error);
      return {
        content: '',
        title: document.title,
        url: window.location.href,
        metadata: this.metadataExtractor.extract(),
        stats: {
          originalLength: 0,
          extractedLength: 0,
          paragraphCount: 0,
          imageCount: 0,
          linkCount: 0,
          codeBlockCount: 0,
          tableCount: 0,
          processingTime: Math.round(performance.now() - startTime),
        },
        success: false,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  /**
   * 提取页面中的图片
   */
  private extractImages(options: ExtractOptions): ImageResult[] {
    const images: ImageResult[] = [];
    const imgElements = document.querySelectorAll('img');
    
    imgElements.forEach((img, index) => {
      if (index >= (options.maxUrls || 50)) return; // 限制图片数量
      
      const src = img.getAttribute('src');
      if (!src) return;
      
      // 转换为绝对URL
      const absoluteUrl = this.normalizeUrl(src);
      
      const imageResult: ImageResult = {
        url: absoluteUrl,
        alt: img.getAttribute('alt') || '',
        title: img.getAttribute('title') || undefined,
        width: img.naturalWidth || undefined,
        height: img.naturalHeight || undefined,
      };
      
      images.push(imageResult);
    });
    
    logger.debug('Extracted', images.length, 'images');
    return images;
  }

  /**
   * 获取同域名的链接
   */
  private getSameDomainLinks(maxLinks: number = 10): string[] {
    const currentDomain = window.location.hostname;
    const links = new Set<string>();
    
    const anchorElements = document.querySelectorAll('a[href]');
    
    for (let i = 0; i < anchorElements.length; i++) {
      if (links.size >= maxLinks) break;
      
      const a = anchorElements[i];
      const href = a.getAttribute('href');
      if (!href) continue;
      
      // 跳过锚点、javascript、mailto等
      if (href.startsWith('#') || href.startsWith('javascript:') || href.startsWith('mailto:')) {
        continue;
      }
      
      try {
        const url = new URL(href, window.location.href);
        
        // 只保留同域名链接
        if (url.hostname === currentDomain) {
          // 跳过当前页面
          if (url.href === window.location.href) continue;
          
          links.add(url.href);
        }
      } catch {
        // 忽略无效URL
      }
    }
    
    return Array.from(links);
  }

  /**
   * 标准化URL
   */
  private normalizeUrl(url: string): string {
    try {
      return new URL(url, window.location.href).href;
    } catch {
      return url;
    }
  }

  /**
   * 查找页面主要内容区域
   */
  private findMainContent(): Element {
    // 优先选择器
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

    // 尝试优先选择器
    for (const selector of preferredSelectors) {
      const el = document.querySelector(selector);
      if (el && this.scorer.calculateScore(el) > 0) {
        logger.debug('Found main content using selector:', selector);
        return el;
      }
    }

    // 评分查找最佳候选
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
    // 移除Markdown标记
    const plainText = content
      .replace(/#{1,6}\s/g, '')
      .replace(/\*\*/g, '')
      .replace(/__/g, '')
      .replace(/\*/g, '')
      .replace(/_/g, '')
      .replace(/`{3}[\s\S]*?`{3}/g, '')
      .replace(/`([^`]+)`/g, '$1')
      .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
      .replace(/!\[([^\]]*)\]\([^)]+\)/g, '')
      .replace(/>\s?/g, '')
      .replace(/\n+/g, ' ')
      .trim();

    // 取前200个字符作为摘要
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
   * 提取选中的文本
   */
  extractSelection(): { text: string; html: string } | null {
    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0) return null;

    const range = selection.getRangeAt(0);
    const container = document.createElement('div');
    container.appendChild(range.cloneContents());

    const converter = new DomToMarkdownConverter();
    const { markdown } = converter.convert(container);

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
  } {
    const bodyText = document.body?.textContent || '';
    return {
      url: window.location.href,
      title: document.title,
      favicon: document.querySelector('link[rel="icon"]')?.getAttribute('href') || '',
      length: bodyText.length,
      wordCount: bodyText.split(/\s+/).length,
    };
  }
}

// 导出单例实例
export const webContentExtractor = new WebContentExtractor();
