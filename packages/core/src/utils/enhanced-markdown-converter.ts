/**
 * 增强型DOM到Markdown转换器
 * 优化版本：支持更多HTML元素、更好的格式保留、代码高亮识别
 */

import { logger } from './logger';

logger.setPrefix('[EnhancedMarkdownConverter]');

// ========================================
// 类型定义
// ========================================

export interface MarkdownConverterOptions {
  maxChars?: number;
  maxUrls?: number;
  extractLinkUrl?: boolean;
  extractImageUrl?: boolean;
  preserveCodeBlocks?: boolean;
  extractTables?: boolean;
  headingLevel?: number;
  includeFencedCode?: boolean;
  includeDetails?: boolean;
  linkRewriteRules?: LinkRewriteRule[];
}

export interface LinkRewriteRule {
  pattern: RegExp;
  replacement: string;
}

export interface ConverterStats {
  imageCount: number;
  linkCount: number;
  codeBlockCount: number;
  tableCount: number;
  paragraphCount: number;
  listCount: number;
  headingCount: number;
  quoteCount: number;
}

// ========================================
// 转换器实现
// ========================================

export class EnhancedDomToMarkdownConverter {
  private options: Required<MarkdownConverterOptions>;
  private urlSeen = new Set<string>();
  private urlCount = 0;
  private tableCounter = 1;
  private nestedTables = new Map<number, string>();
  private footnotes: Array<{ id: number; content: string }> = [];
  private stats: ConverterStats = {
    imageCount: 0,
    linkCount: 0,
    codeBlockCount: 0,
    tableCount: 0,
    paragraphCount: 0,
    listCount: 0,
    headingCount: 0,
    quoteCount: 0,
  };
  
  // 语言别名映射
  private languageAliases: Record<string, string> = {
    'js': 'javascript',
    'ts': 'typescript',
    'py': 'python',
    'rb': 'ruby',
    'yml': 'yaml',
    'sh': 'bash',
    'shell': 'bash',
    'zsh': 'bash',
    'ps1': 'powershell',
    'csharp': 'c#',
    'cpp': 'c++',
    'html5': 'html',
    'css3': 'css',
  };
  
  // 忽略标签
  private ignoreTags = new Set([
    'script', 'style', 'link', 'noscript', 'meta', 'head',
    'input', 'select', 'textarea', 'fieldset', 'option', 'optgroup',
    'button', 'template', 'slot',
  ]);
  
  // 块级标签
  private blockTags = new Set([
    'address', 'article', 'aside', 'audio', 'blockquote', 'body',
    'canvas', 'center', 'dd', 'dir', 'div', 'dl', 'dt', 'fieldset',
    'figcaption', 'figure', 'footer', 'form', 'frameset', 'h1', 'h2',
    'h3', 'h4', 'h5', 'h6', 'header', 'hgroup', 'hr', 'html', 'isindex',
    'li', 'main', 'menu', 'nav', 'noframes', 'noscript', 'ol', 'output',
    'p', 'pre', 'section', 'table', 'tbody', 'td', 'tfoot', 'th', 'thead',
    'tr', 'ul', 'video', 'details', 'summary',
  ]);
  
  // 行内元素
  private inlineTags = new Set([
    'a', 'abbr', 'b', 'bdi', 'bdo', 'br', 'cite', 'code', 'data', 'del',
    'dfn', 'em', 'i', 'ins', 'kbd', 'mark', 'math', 'meter', 'progress',
    'q', 'ruby', 's', 'samp', 'small', 'span', 'strong', 'sub', 'sup',
    'time', 'u', 'var', 'wbr',
  ]);
  
  // 空标签（无闭合）
  private voidTags = new Set([
    'area', 'base', 'br', 'col', 'embed', 'hr', 'img', 'input',
    'link', 'meta', 'param', 'source', 'track', 'wbr',
  ]);
  
  constructor(options: MarkdownConverterOptions = {}) {
    this.options = {
      maxChars: 120000,
      maxUrls: 200,
      extractLinkUrl: true,
      extractImageUrl: true,
      preserveCodeBlocks: true,
      extractTables: true,
      headingLevel: 0,
      includeFencedCode: true,
      includeDetails: true,
      linkRewriteRules: [],
      ...options,
    };
  }
  
  /**
   * 转换DOM节点为Markdown
   */
  convert(node: Node | null | undefined): { markdown: string; stats: ConverterStats } {
    if (!node) return { markdown: '', stats: this.stats };
    
    // 重置状态
    this.reset();
    
    let markdown = this.convertNode(node);
    
    // 清理多余空行
    markdown = this.cleanMarkdown(markdown);
    
    // 添加脚注
    if (this.footnotes.length > 0) {
      markdown += '\n\n' + this.footnotes
        .sort((a, b) => a.id - b.id)
        .map((f) => `\n[^${f.id}]]:\n${f.content}`)
        .join('');
    }
    
    // 截断
    if (markdown.length > this.options.maxChars) {
      markdown = markdown.slice(0, this.options.maxChars);
    }
    
    return { markdown: markdown.trim(), stats: { ...this.stats } };
  }
  
  private reset(): void {
    this.urlSeen.clear();
    this.urlCount = 0;
    this.tableCounter = 1;
    this.nestedTables.clear();
    this.footnotes = [];
    this.stats = {
      imageCount: 0,
      linkCount: 0,
      codeBlockCount: 0,
      tableCount: 0,
      paragraphCount: 0,
      listCount: 0,
      headingCount: 0,
      quoteCount: 0,
    };
  }
  
  private convertNode(node: Node): string {
    // 文本节点
    if (node.nodeType === Node.TEXT_NODE) {
      return this.handleText(node.textContent || '');
    }
    
    // 非元素节点
    if (node.nodeType !== Node.ELEMENT_NODE) return '';
    
    const el = node as Element;
    const tag = el.tagName.toLowerCase();
    
    // 忽略标签
    if (this.ignoreTags.has(tag)) return '';
    
    // 处理Shadow DOM
    const shadow = (el as unknown as { shadowRoot?: ShadowRoot | null }).shadowRoot;
    if (shadow) {
      let out = '';
      for (const child of Array.from(shadow.childNodes)) {
        out += this.convertNode(child);
      }
      return out;
    }
    
    // 处理slot
    if (el instanceof HTMLSlotElement) {
      let out = '';
      for (const n of Array.from(el.assignedNodes())) {
        out += this.convertNode(n);
      }
      return out;
    }
    
    let out = '';
    
    switch (tag) {
      // 标题
      case 'h1':
      case 'h2':
      case 'h3':
      case 'h4':
      case 'h5':
      case 'h6':
        out = this.handleHeading(el as HTMLElement);
        break;
      
      // 段落
      case 'p':
        out = this.handleParagraph(el);
        break;
      
      // 强调
      case 'strong':
      case 'b':
        out = this.handleBold(el);
        break;
      case 'em':
      case 'i':
        out = this.handleItalic(el);
        break;
      case 'mark':
        out = this.handleHighlight(el);
        break;
      case 's':
      case 'del':
      case 'strike':
        out = this.handleStrikethrough(el);
        break;
      case 'u':
        out = this.handleUnderline(el);
        break;
      case 'ins':
        out = this.handleInserted(el);
        break;
      
      // 引用
      case 'blockquote':
        out = this.handleBlockquote(el);
        break;
      
      // 代码
      case 'pre':
        out = this.handlePreformatted(el);
        break;
      case 'code':
        out = this.handleInlineCode(el);
        break;
      case 'kbd':
        out = this.handleKbd(el);
        break;
      case 'samp':
        out = this.handleSample(el);
        break;
      case 'var':
        out = this.handleVariable(el);
        break;
      
      // 链接和图片
      case 'a':
        out = this.handleLink(el as HTMLAnchorElement);
        break;
      case 'img':
        out = this.handleImage(el as HTMLImageElement);
        break;
      
      // 列表
      case 'ul':
      case 'ol':
        out = this.handleList(el as HTMLOListElement | HTMLUListElement);
        break;
      case 'li':
        out = this.handleListItem(el);
        break;
      case 'dl':
        out = this.handleDefinitionList(el);
        break;
      case 'dt':
        out = this.handleDefinitionTerm(el);
        break;
      case 'dd':
        out = this.handleDefinitionDescription(el);
        break;
      
      // 表格
      case 'table':
        out = this.handleTable(el as HTMLTableElement);
        break;
      case 'thead':
      case 'tbody':
      case 'tfoot':
        out = this.handleTableSection(el);
        break;
      case 'tr':
        out = this.handleTableRow(el);
        break;
      case 'th':
      case 'td':
        out = this.handleTableCell(el);
        break;
      
      // 媒体
      case 'video':
        out = this.handleVideo(el as HTMLVideoElement);
        break;
      case 'audio':
        out = this.handleAudio(el as HTMLAudioElement);
        break;
      case 'source':
        out = this.handleSource(el as HTMLSourceElement);
        break;
      case 'iframe':
        out = this.handleIframe(el as HTMLIFrameElement);
        break;
      case 'embed':
        out = this.handleEmbed(el);
        break;
      case 'object':
        out = this.handleObject(el);
        break;
      case 'figure':
        out = this.handleFigure(el);
        break;
      case 'figcaption':
        out = this.handleFigcaption(el);
        break;
      case 'picture':
        out = this.handlePicture(el);
        break;
      
      // Details/Summary
      case 'details':
        out = this.handleDetails(el);
        break;
      case 'summary':
        out = this.handleSummary(el);
        break;
      
      // 换行和分隔
      case 'br':
        return '\n';
      case 'hr':
        return '\n---\n\n';
      
      // 数学
      case 'math':
        out = this.handleMath(el);
        break;
      case 'mi':
      case 'mn':
      case 'mo':
      case 'ms':
      case 'mtext':
        out = this.handleMathML(el);
        break;
      
      // 其他元素
      case 'abbr':
        out = this.handleAbbreviation(el);
        break;
      case 'address':
        out = this.handleAddress(el);
        break;
      case 'bdi':
      case 'bdo':
        out = this.handleBidirectional(el);
        break;
      case 'data':
        out = this.handleData(el);
        break;
      case 'time':
        out = this.handleTime(el as HTMLTimeElement);
        break;
      case 'wbr':
        return this.handleWordBreakOpportunity();
      case 'ruby':
        out = this.handleRuby(el);
        break;
      case 'rt':
      case 'rp':
        out = this.handleRubyText(el);
        break;
      
      // Meter 和 Progress
      case 'meter':
        out = this.handleMeter(el as HTMLMeterElement);
        break;
      case 'progress':
        out = this.handleProgress(el as HTMLProgressElement);
        break;
      case 'output':
        out = this.handleOutput(el);
        break;
      case 'cite':
        out = this.handleCite(el);
        break;
      case 'dfn':
        out = this.handleDefinition(el);
        break;
      case 'q':
        out = this.handleQuote(el);
        break;
      case 'span':
        out = this.handleSpan(el);
        break;
      
      default:
        out = this.handleChildren(el);
        break;
    }
    
    // 添加适当的换行
    if (out.trim().length <= 0) return '';
    
    if (this.blockTags.has(tag)) {
      out = `\n\n${out}\n\n`;
    } else if (out.trim().length > 0) {
      out = `${out} `;
    }
    
    return out;
  }
  
  // ========================================
  // 文本处理
  // ========================================
  
  private handleText(text: string): string {
    return text.replace(/\s+/g, ' ');
  }
  
  // ========================================
  // 标题处理
  // ========================================
  
  private handleHeading(el: HTMLElement): string {
    const level = Math.min(
      Number.parseInt(el.tagName[1] || '1', 10) + this.options.headingLevel,
      6
    );
    const text = this.handleChildren(el).replace(/^\s+/, '').trim();
    if (!text) return '';
    
    this.stats.headingCount++;
    
    // 检查是否是可复制的链接标题
    const hasCopyLink = el.querySelector('.heading-link, .anchor, [id]');
    const linkId = hasCopyLink?.getAttribute('id') || el.getAttribute('id');
    
    let result = `${'#'.repeat(level)} ${text}`;
    if (linkId) {
      result += ` {#${linkId}}`;
    }
    
    return result;
  }
  
  // ========================================
  // 段落处理
  // ========================================
  
  private handleParagraph(el: Element): string {
    const text = this.handleChildren(el).trim();
    if (!text) return '';
    
    this.stats.paragraphCount++;
    return text;
  }
  
  // ========================================
  // 强调处理
  // ========================================
  
  private handleBold(el: Element): string {
    const text = this.handleChildren(el).trim();
    if (!text) return '';
    return `**${text}**`;
  }
  
  private handleItalic(el: Element): string {
    const text = this.handleChildren(el).trim();
    if (!text) return '';
    return `_${text}_`;
  }
  
  private handleHighlight(el: Element): string {
    const text = this.handleChildren(el).trim();
    if (!text) return '';
    return `==${text}==`;
  }
  
  private handleStrikethrough(el: Element): string {
    const text = this.handleChildren(el).trim();
    if (!text) return '';
    return `~~${text}~~`;
  }
  
  private handleUnderline(el: Element): string {
    const text = this.handleChildren(el).trim();
    if (!text) return '';
    return `<u>${text}</u>`;
  }
  
  private handleInserted(el: Element): string {
    const text = this.handleChildren(el).trim();
    if (!text) return '';
    return `++${text}++`;
  }
  
  // ========================================
  // 引用处理
  // ========================================
  
  private handleBlockquote(el: Element): string {
    const text = this.handleChildren(el)
      .split('\n')
      .filter(line => line.trim())
      .map(line => `> ${line}`)
      .join('\n');
    
    if (!text) return '';
    
    this.stats.quoteCount++;
    return text;
  }
  
  // ========================================
  // 代码处理
  // ========================================
  
  private handlePreformatted(el: Element): string {
    if (!this.options.preserveCodeBlocks) {
      return this.handleChildren(el);
    }
    
    const codeEl = el.querySelector('code');
    if (codeEl) {
      return this.formatCodeBlock(codeEl.textContent || '', this.detectCodeLanguage(codeEl));
    }
    
    return this.formatCodeBlock(el.textContent || '', '');
  }
  
  private handleInlineCode(el: Element): string {
    const text = el.textContent || '';
    const parentTag = el.parentElement?.tagName.toLowerCase();
    
    // 如果父元素是 pre，则不在包装
    if (parentTag === 'pre') {
      return text;
    }
    
    return `\`${text}\``;
  }
  
  private handleKbd(el: Element): string {
    const text = el.textContent || '';
    return `<kbd>${text}</kbd>`;
  }
  
  private handleSample(el: Element): string {
    const text = el.textContent || '';
    return `<samp>${text}</samp>`;
  }
  
  private handleVariable(el: Element): string {
    const text = el.textContent || '';
    return `<var>${text}</var>`;
  }
  
  private formatCodeBlock(code: string, lang: string): string {
    const normalizedLang = this.normalizeLanguage(lang);
    const normalizedCode = code.replace(/^\n+|\n+$/g, '');
    
    this.stats.codeBlockCount++;
    
    if (!this.options.includeFencedCode) {
      return normalizedCode;
    }
    
    return `\`\`\`${normalizedLang}\n${normalizedCode}\n\`\`\``;
  }
  
  private detectCodeLanguage(el: Element): string {
    // 从 class 属性检测
    const className = el.getAttribute('class') || '';
    
    // language- 前缀
    const langMatch = className.match(/\blanguage-(\w+)/i);
    if (langMatch) return langMatch[1];
    
    // 纯语言名
    const simpleMatch = className.match(/\b(javascript|typescript|python|java|cpp|c\+\+|ruby|go|rust|html|css|json|xml|yaml|sql|bash|shell|powershell|php|swift|kotlin|rust|scala|r|perl|haskell|lua|matlab|latex)\b/i);
    if (simpleMatch) return simpleMatch[1];
    
    // 从文件扩展名
    const dataFile = el.getAttribute('data-file');
    if (dataFile) {
      const ext = dataFile.split('.').pop()?.toLowerCase();
      if (ext) return ext;
    }
    
    return '';
  }
  
  private normalizeLanguage(lang: string): string {
    const lower = lang.toLowerCase();
    return this.languageAliases[lower] || lower;
  }
  
  // ========================================
  // 链接和图片处理
  // ========================================
  
  private handleLink(el: HTMLAnchorElement): string {
    let text = this.handleChildren(el).replace(/\n/g, ' ').trim();
    if (!text) return '';
    
    if (!this.options.extractLinkUrl) return text;
    
    const rawHref = el.getAttribute('href') || '';
    const href = this.takeUrl(rawHref);
    
    if (!href) return text;
    
    // 应用链接重写规则
    const rewrittenHref = this.rewriteLink(href);
    
    this.stats.linkCount++;
    
    // 检查标题
    const title = el.getAttribute('title');
    const titlePart = title ? ` "${title}"` : '';
    
    // 检查是否是标题链接
    if (/^#+ /.test(text)) {
      return `\n\n[${text}](${rewrittenHref}${titlePart})\n\n`;
    }
    
    // 检查是否是图片链接
    if (el.querySelector('img')) {
      return `[![${el.querySelector('img')?.getAttribute('alt') || ''}](${rewrittenHref})]`;
    }
    
    return `[${text}](${rewrittenHref}${titlePart})`;
  }
  
  private handleImage(el: HTMLImageElement): string {
    if (!this.options.extractImageUrl) {
      const alt = (el.getAttribute('alt') || '').trim();
      return alt ? `![${alt}]()` : '';
    }
    
    const rawSrc = el.currentSrc || el.getAttribute('src') || '';
    const src = this.takeUrl(rawSrc);
    const alt = (el.getAttribute('alt') || '').trim();
    const title = el.getAttribute('title');
    
    if (!src && !alt) return '';
    if (!src) return alt ? `![${alt}]()` : '';
    
    this.stats.imageCount++;
    
    if (title) {
      return `![${alt}](${src} "${title}")`;
    }
    return `![${alt}](${src})`;
  }
  
  private takeUrl(raw: string): string | null {
    if (!raw) return null;
    
    const normalized = this.normalizeUrl(raw.trim());
    if (this.isInvalidUrl(normalized)) return null;
    
    try {
      const abs = new URL(normalized, location.href).toString();
      
      if (!abs.startsWith('http://') && !abs.startsWith('https://')) return null;
      if (this.urlSeen.has(abs)) return abs;
      if (this.urlCount >= this.options.maxUrls) return null;
      
      this.urlSeen.add(abs);
      this.urlCount++;
      return abs;
    } catch {
      return null;
    }
  }
  
  private normalizeUrl(url: string): string {
    if (url.startsWith('//')) return `${location.protocol}${url}`;
    if (url.startsWith('/')) return `${location.origin}${url}`;
    return url;
  }
  
  private isInvalidUrl(url: string): boolean {
    return (
      url.startsWith('javascript:') ||
      url.startsWith('data:') ||
      url.startsWith('mailto:') ||
      url.startsWith('tel:') ||
      url.length >= 2048
    );
  }
  
  private rewriteLink(url: string): string {
    for (const rule of this.options.linkRewriteRules) {
      url = url.replace(rule.pattern, rule.replacement);
    }
    return url;
  }
  
  // ========================================
  // 列表处理
  // ========================================
  
  private handleList(el: HTMLOListElement | HTMLUListElement): string {
    const ordered = el.tagName.toLowerCase() === 'ol';
    let out = '';
    let index = 1;
    
    this.stats.listCount++;
    
    for (const child of Array.from(el.children)) {
      if (!(child instanceof Element)) continue;
      
      const childTag = child.tagName.toLowerCase();
      
      // 处理嵌套列表
      if (['ul', 'ol'].includes(childTag)) {
        out += '\n' + this.handleList(child as HTMLOListElement | HTMLUListElement);
        continue;
      }
      
      if (childTag !== 'li') {
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
    
    return out || '';
  }
  
  private handleListItem(el: Element): string {
    return this.handleChildren(el);
  }
  
  private handleDefinitionList(el: Element): string {
    let out = '';
    
    for (const child of Array.from(el.children)) {
      const childTag = child.tagName.toLowerCase();
      
      if (childTag === 'dt') {
        out += `\n\n**${this.handleChildren(child).trim()}**\n`;
      } else if (childTag === 'dd') {
        out += `${this.indent(this.handleChildren(child).trim(), 1).trim()}\n`;
      } else {
        out += this.convertNode(child);
      }
    }
    
    return out;
  }
  
  private handleDefinitionTerm(el: Element): string {
    return this.handleChildren(el).trim();
  }
  
  private handleDefinitionDescription(el: Element): string {
    return this.handleChildren(el).trim();
  }
  
  private indent(text: string, count = 1, unit = '  '): string {
    if (count <= 0 || !text) return text;
    const prefix = unit.repeat(count);
    return text
      .split('\n')
      .map(line => (line.trim() ? `${prefix}${line}` : line))
      .join('\n');
  }
  
  // ========================================
  // 表格处理
  // ========================================
  
  private handleTable(el: HTMLTableElement): string {
    if (!this.options.extractTables) return '';
    
    this.stats.tableCount++;
    
    let csv = '\n';
    
    // 处理表头
    const thead = el.querySelector('thead');
    if (thead) {
      const headerRow = thead.querySelector('tr');
      if (headerRow) {
        csv += this.processRowToCSV(headerRow, true) + '\n';
      }
    } else {
      // 第一个数据行作为表头
      const firstRow = el.querySelector('tr');
      if (firstRow) {
        csv += this.processRowToCSV(firstRow, true) + '\n';
      }
    }
    
    // 处理表头和数据分隔符
    const columns = el.querySelectorAll('td, th').length;
    csv += '|' + '---|'.repeat(Math.max(1, columns)) + '\n';
    
    // 处理表体
    const tbody = el.querySelector('tbody') || el;
    const rows = tbody.querySelectorAll('tr');
    rows.forEach(row => {
      if (row.parentElement === tbody) {
        csv += this.processRowToCSV(row, false) + '\n';
      }
    });
    
    // 检查嵌套表格
    const nestedTables = el.querySelectorAll(':scope > table');
    nestedTables.forEach((table, i) => {
      this.tableCounter++;
      this.nestedTables.set(this.tableCounter, this.handleTable(table as HTMLTableElement));
      csv += `\n[^table${this.tableCounter}]`;
    });
    
    return `\n\`\`\`csv\n${csv}\`\`\`\n`;
  }
  
  private handleTableSection(el: Element): string {
    return this.handleChildren(el);
  }
  
  private handleTableRow(el: Element): string {
    return this.processRowToCSV(el, false);
  }
  
  private handleTableCell(el: Element): string {
    return this.handleChildren(el).trim();
  }
  
  private processRowToCSV(tr: Element, isHeader: boolean): string {
    const cells = Array.from(tr.children).filter(x => {
      const tag = x.tagName.toLowerCase();
      return tag === 'th' || tag === 'td';
    });
    
    const row: string[] = [];
    
    for (const cell of cells) {
      let value = '';
      
      for (const child of Array.from(cell.childNodes)) {
        // 检查嵌套表格
        if (child.nodeType === Node.ELEMENT_NODE && (child as Element).tagName.toLowerCase() === 'table') {
          this.tableCounter++;
          const tableText = this.handleTable(child as HTMLTableElement);
          this.nestedTables.set(this.tableCounter, tableText);
          value += `[^table${this.tableCounter}]`;
          continue;
        }
        
        value += this.convertNode(child);
      }
      
      value = value.trim();
      
      // 处理 colspan
      const colspanRaw = (cell as Element).getAttribute('colspan') || '1';
      const colspan = Number.isFinite(Number(colspanRaw)) ? Math.max(1, Number(colspanRaw)) : 1;
      
      for (let i = 0; i < colspan; i++) {
        if (i === 0) row.push(this.escapeCsvCell(value, isHeader));
        else row.push('');
      }
    }
    
    return '|' + row.join('|');
  }
  
  private escapeCsvCell(text: string, isHeader: boolean): string {
    if (!text) return '';
    
    if (isHeader) {
      return text;
    }
    
    let needWrap = false;
    const escaped = text.replace(/[,"\n]/gim, (ch) => {
      needWrap = true;
      if (ch === '"') return "'";
      if (ch === '\n') return '\\n';
      return ch;
    });
    
    return needWrap ? `"${escaped}"` : escaped;
  }
  
  // ========================================
  // 媒体处理
  // ========================================
  
  private handleVideo(el: HTMLVideoElement): string {
    const src = el.getAttribute('src') || '';
    const poster = el.getAttribute('poster') || '';
    const title = el.getAttribute('title');
    
    if (src) {
      return `\n\n[视频: ${this.normalizeUrl(src)}]${title ? ` - ${title}` : ''}\n\n`;
    }
    
    if (poster) {
      return `\n\n[视频封面: ${this.normalizeUrl(poster)}]\n\n`;
    }
    
    return '';
  }
  
  private handleAudio(el: HTMLAudioElement): string {
    const src = el.getAttribute('src') || '';
    const title = el.getAttribute('title');
    
    if (src) {
      return `\n\n[音频: ${this.normalizeUrl(src)}]${title ? ` - ${title}` : ''}\n\n`;
    }
    
    return '';
  }
  
  private handleSource(el: HTMLSourceElement): string {
    const src = el.getAttribute('src');
    const type = el.getAttribute('type');
    
    if (src) {
      if (type?.includes('video')) {
        return `\n\n[视频源: ${this.normalizeUrl(src)}]\n\n`;
      }
      if (type?.includes('audio')) {
        return `\n\n[音频源: ${this.normalizeUrl(src)}]\n\n`;
      }
    }
    
    return '';
  }
  
  private handleIframe(el: HTMLIFrameElement): string {
    const src = el.getAttribute('src') || '';
    const title = el.getAttribute('title') || 'iframe';
    
    if (src) {
      // YouTube
      if (src.includes('youtube.com/embed') || src.includes('youtu.be/')) {
        return `\n\n[YouTube: ${src}]\n\n`;
      }
      // Vimeo
      if (src.includes('player.vimeo.com')) {
        return `\n\n[Vimeo: ${src}]\n\n`;
      }
      // 其他
      return `\n\n[${title}: ${this.normalizeUrl(src)}]\n\n`;
    }
    
    return '';
  }
  
  private handleEmbed(el: Element): string {
    const src = el.getAttribute('src') || el.getAttribute('data') || '';
    
    if (src) {
      return `\n\n[嵌入内容: ${this.normalizeUrl(src)}]\n\n`;
    }
    
    return '';
  }
  
  private handleObject(el: Element): string {
    const data = el.getAttribute('data') || '';
    
    if (data) {
      return `\n\n[对象: ${this.normalizeUrl(data)}]\n\n`;
    }
    
    return '';
  }
  
  private handleFigure(el: Element): string {
    const caption = el.querySelector('figcaption');
    const captionText = caption ? `\n${this.handleChildren(caption).trim()}\n` : '';
    const content = this.handleChildren(el);
    
    // 移除已处理的 figcaption
    const contentWithoutCaption = content.replace(captionText, '');
    
    return `\n\n${contentWithoutCaption.trim()}${captionText}\n\n`;
  }
  
  private handleFigcaption(el: Element): string {
    return this.handleChildren(el).trim();
  }
  
  private handlePicture(el: Element): string {
    let out = '';
    
    // 处理 source 元素
    el.querySelectorAll('source').forEach(source => {
      const srcset = source.getAttribute('srcset');
      if (srcset) {
        const src = srcset.split(',')[0]?.trim()?.split(' ')[0];
        if (src) {
          out += `![picture](${this.normalizeUrl(src)})\n`;
        }
      }
    });
    
    // 处理 img 元素
    const img = el.querySelector('img');
    if (img) {
      out += this.handleImage(img);
    }
    
    return out;
  }
  
  // ========================================
  // Details/Summary 处理
  // ========================================
  
  private handleDetails(el: Element): string {
    if (!this.options.includeDetails) {
      return this.handleChildren(el);
    }
    
    const summary = el.querySelector('summary');
    const summaryText = summary 
      ? this.handleChildren(summary).trim() 
      : 'Details';
    
    const content = summary 
      ? this.handleChildren(el).replace(this.handleChildren(summary), '').trim()
      : this.handleChildren(el).trim();
    
    return `\n\n<details>\n<summary>${summaryText}</summary>\n\n${content}\n\n</details>\n\n`;
  }
  
  private handleSummary(el: Element): string {
    return this.handleChildren(el).trim();
  }
  
  // ========================================
  // 数学处理
  // ========================================
  
  private handleMath(el: Element): string {
    const text = el.textContent || '';
    return `$$${text}$$`;
  }
  
  private handleMathML(el: Element): string {
    return el.textContent || '';
  }
  
  // ========================================
  // 其他元素处理
  // ========================================
  
  private handleAbbreviation(el: Element): string {
    const text = el.textContent || '';
    const title = el.getAttribute('title');
    
    if (title) {
      return `*${text}*`;
    }
    
    return text;
  }
  
  private handleAddress(el: Element): string {
    const text = this.handleChildren(el).trim();
    if (!text) return '';
    
    return `\n\n<address>\n${text}\n</address>\n\n`;
  }
  
  private handleBidirectional(el: Element): string {
    const text = this.handleChildren(el);
    const dir = (el as HTMLElement).dir || 'ltr';
    
    return `<bdo dir="${dir}">${text}</bdo>`;
  }
  
  private handleData(el: Element): string {
    const text = el.textContent || '';
    const value = el.getAttribute('value');
    
    if (value) {
      return `${text} (${value})`;
    }
    
    return text;
  }
  
  private handleTime(el: HTMLTimeElement): string {
    const text = el.textContent || '';
    const datetime = el.getAttribute('datetime');
    
    if (datetime) {
      return `<time datetime="${datetime}">${text}</time>`;
    }
    
    return text;
  }
  
  private handleWordBreakOpportunity(): string {
    return '';
  }
  
  private handleRuby(el: Element): string {
    const text = this.handleChildren(el);
    return `(${text})`;
  }
  
  private handleRubyText(el: Element): string {
    return this.handleChildren(el);
  }
  
  private handleMeter(el: HTMLMeterElement): string {
    const value = el.getAttribute('value') || '0';
    const min = el.getAttribute('min') || '0';
    const max = el.getAttribute('max') || '100';
    const optimum = el.getAttribute('optimum');
    
    let text = `${value}/${max}`;
    if (optimum) {
      text += ` (optimum: ${optimum})`;
    }
    
    return `[Meter: ${text}]`;
  }
  
  private handleProgress(el: HTMLProgressElement): string {
    const value = el.getAttribute('value');
    const max = el.getAttribute('max') || '100';
    
    if (value) {
      return `[Progress: ${value}/${max}]`;
    }
    
    return '[Progress: indeterminate]';
  }
  
  private handleOutput(el: Element): string {
    const text = el.textContent || '';
    const forAttr = el.getAttribute('for');
    
    if (forAttr) {
      return `→ ${text}`;
    }
    
    return text;
  }
  
  private handleCite(el: Element): string {
    const text = this.handleChildren(el).trim();
    if (!text) return '';
    
    return `*${text}*`;
  }
  
  private handleDefinition(el: Element): string {
    const text = this.handleChildren(el).trim();
    if (!text) return '';
    
    return `*${text}*`;
  }
  
  private handleQuote(el: Element): string {
    const text = this.handleChildren(el).trim();
    if (!text) return '';
    
    const cite = el.getAttribute('cite');
    if (cite) {
      return `"${text}" — ${cite}`;
    }
    
    return `"${text}"`;
  }
  
  private handleSpan(el: Element): string {
    return this.handleChildren(el);
  }
  
  private handleChildren(el: Element): string {
    let out = '';
    for (const child of Array.from(el.childNodes)) {
      out += this.convertNode(child);
    }
    return out;
  }
  
  // ========================================
  // 清理和工具
  // ========================================
  
  private cleanMarkdown(markdown: string): string {
    return markdown
      .replace(/\s+\n$/gim, '\n')
      .replace(/\n{3,}/gim, '\n\n')
      .trim();
  }
  
  /**
   * 转换HTML字符串为Markdown
   */
  static htmlToMarkdown(html: string, options?: MarkdownConverterOptions): string {
    const parser = new DOMParser();
    const doc = parser.parseFromString(html, 'text/html');
    const converter = new EnhancedDomToMarkdownConverter(options);
    const result = converter.convert(doc.body);
    return result.markdown;
  }
}
