// Content Script - 注入到网页中运行

import { logger } from '@core/utils/logger';
import { ScreenshotRequest, ClosePageRequest } from '@core/types';

logger.setPrefix('[Doubao ContentScript]');

// 标记脚本已加载
(window as unknown as Record<string, boolean>).screenPlugin = true;

type ReadPageConvertOptions = {
  extractLinkUrl: boolean;
  extractImageUrl: boolean;
  maxUrls: number;
  headingLevel: number;
};

class ReadPageDomToMarkdown {
  private options: ReadPageConvertOptions;
  private nestedTables = new Map<number, string>();
  private tableCounter = 1;
  private urlCount = 0;
  private urlSeen = new Set<string>();

  private ignoreTags = new Set([
    'input',
    'select',
    'fieldset',
    'option',
    'optgroup',
    'script',
    'style',
    'link',
    'noscript',
  ]);

  private blockTags = new Set([
    'address',
    'article',
    'aside',
    'audio',
    'blockquote',
    'body',
    'canvas',
    'center',
    'dd',
    'dir',
    'div',
    'dl',
    'dt',
    'fieldset',
    'figcaption',
    'figure',
    'footer',
    'form',
    'frameset',
    'h1',
    'h2',
    'h3',
    'h4',
    'h5',
    'h6',
    'header',
    'hgroup',
    'hr',
    'html',
    'isindex',
    'li',
    'main',
    'menu',
    'nav',
    'noframes',
    'noscript',
    'ol',
    'output',
    'p',
    'pre',
    'section',
    'table',
    'tbody',
    'td',
    'tfoot',
    'th',
    'thead',
    'tr',
    'ul',
  ]);

  constructor(partialOptions?: Partial<ReadPageConvertOptions>) {
    this.options = {
      extractImageUrl: false,
      extractLinkUrl: false,
      maxUrls: 200,
      headingLevel: 1,
      ...(partialOptions || {}),
    };
  }

  convert(node: Node | null | undefined): string {
    if (!node) return '';
    let out = this.convertNode(node);
    out = out.replace(/\s+\n$/gim, '\n').replace(/\n{3,}/gim, '\n\n');

    if (this.nestedTables.size > 0) {
      const footnotes: Array<{ id: number; content: string }> = [];
      this.nestedTables.forEach((content, id) => {
        footnotes.push({
          id,
          content: `\n\n[^table${id}]:\n${this.indent(this.codeWrap(content), 2, ' ')}\n`,
        });
      });
      out += footnotes
        .sort((a, b) => a.id - b.id)
        .map((x) => x.content)
        .join('');
    }

    return out.trim();
  }

  private convertNode(node: Node): string {
    if (node.nodeType === Node.TEXT_NODE) {
      const text = node.textContent || '';
      return text.trim();
    }

    if (node.nodeType !== Node.ELEMENT_NODE) return '';

    const el = node as Element;
    const tag = el.tagName.toLowerCase();
    if (this.ignoreTags.has(tag)) return '';

    if (el instanceof HTMLSlotElement) {
      const assigned = el.assignedNodes();
      let out = '';
      for (const n of Array.from(assigned)) out += this.convertNode(n);
      return out;
    }

    if ((el as unknown as { shadowRoot?: ShadowRoot | null }).shadowRoot) {
      const shadow = (el as unknown as { shadowRoot?: ShadowRoot | null }).shadowRoot;
      if (!shadow) return '';
      let out = '';
      for (const child of Array.from(shadow.childNodes)) out += this.convertNode(child);
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
        out = this.handleChildren(el);
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
        out = this.handleChildren(el);
        break;
      case 'blockquote':
        out = this.handleBlockquote(el);
        break;
      case 'pre':
      case 'code':
        out = this.handleCode(el);
        break;
      case 'table':
        out = this.handleTable(el as HTMLTableElement);
        break;
      case 'thead':
      case 'tbody':
      case 'tr':
      case 'th':
      case 'td':
        out = this.handleTableElement(el);
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
    for (const child of Array.from(el.childNodes)) out += this.convertNode(child);
    return out;
  }

  private handleHeading(el: HTMLElement): string {
    const level = Number.parseInt(el.tagName[1] || '1', 10) + this.options.headingLevel;
    const text = this.handleChildren(el).replace(/^\s+/, '');
    if (text.trim().length <= 0) return '';
    return `${'#'.repeat(level)} ${text}`;
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

  private normalizeUrl(url: string): string {
    if (url.startsWith('//')) return `${location.protocol}${url}`;
    if (url.startsWith('/')) return `${location.origin}${url}`;
    return url;
  }

  private takeUrl(raw: string): string {
    if (!raw) return '';
    const normalized = this.normalizeUrl(raw.trim());
    if (normalized.startsWith('javascript:')) return '';
    if (normalized.length >= 256) return '';
    let abs: string;
    try {
      abs = new URL(normalized, location.href).toString();
    } catch {
      return '';
    }
    if (!abs.startsWith('http://') && !abs.startsWith('https://')) return '';
    if (this.urlSeen.has(abs)) return abs;
    if (this.urlCount >= this.options.maxUrls) return '';
    this.urlSeen.add(abs);
    this.urlCount += 1;
    return abs;
  }

  private handleLink(el: HTMLAnchorElement): string {
    const text = this.handleChildren(el).replace(/\n/g, ' ').trim();
    if (!text) return '';

    if (!this.options.extractLinkUrl) return text;

    const href = this.takeUrl(el.getAttribute('href') || '');
    if (!href) return text;
    const markdown = `[${text}](${href})`;
    if (/^#+ /.test(text)) return `\n\n${markdown}\n\n`;
    return markdown;
  }

  private handleImage(el: HTMLImageElement): string {
    const alt = (el.getAttribute('alt') || '').trim();
    if (!this.options.extractImageUrl) return alt ? `![${alt}]()` : '';

    const src = this.takeUrl(el.currentSrc || el.getAttribute('src') || '');
    if (!src && !alt) return '';
    if (!src) return alt ? `![${alt}]()` : '';
    return `![${alt}](${src})`;
  }

  private indent(text: string, count = 0, unit = '\t'): string {
    if (count <= 0) return text;
    const prefix = unit.repeat(count);
    return text
      .split('\n')
      .map((line) => (line.trim() ? `${prefix}${line}` : line))
      .join('\n');
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
        index += 1;
      } else {
        out += `\n- ${inner}`;
      }
    }
    return out ? `${out}` : '';
  }

  private handleBlockquote(el: Element): string {
    const text = this.handleChildren(el)
      .split('\n')
      .map((line) => `> ${line}`)
      .join('\n');
    return `${text}`;
  }

  private codeWrap(code: string, lang = ''): string {
    const normalized = code.replace(/^\n+|\n+$/gi, '');
    return `\`\`\`${lang}\n${normalized}\n\`\`\``;
  }

  private handleCode(el: Element): string {
    const tag = el.tagName.toLowerCase();
    const text = el.textContent || '';
    if (tag === 'code' && el.parentElement?.tagName.toLowerCase() !== 'pre') return `\`${text}\``;
    const cls = (el.getAttribute('class') || '').trim();
    const lang = cls.startsWith('language-') ? cls.replace('language-', '') : '';
    return this.codeWrap(text, lang);
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
    const cells = Array.from(tr.children).filter((x) => {
      const tag = x.tagName.toLowerCase();
      return tag === 'th' || tag === 'td';
    });

    const row: string[] = [];
    for (const cell of cells) {
      let value = '';
      for (const child of Array.from(cell.childNodes)) {
        if (child.nodeType === Node.ELEMENT_NODE && (child as Element).tagName.toLowerCase() === 'table') {
          const id = this.tableCounter;
          this.tableCounter += 1;
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
      for (let i = 0; i < colspan; i += 1) {
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
      const groups = Array.from(el.children).filter((x) => {
        const t = x.tagName.toLowerCase();
        return t === 'thead' || t === 'tbody' || t === 'tfoot';
      });

      let rows: Element[] = [];
      if (groups.length > 0) {
        for (const g of groups) {
          rows = rows.concat(Array.from(g.children).filter((x) => x.tagName.toLowerCase() === 'tr'));
        }
      } else {
        rows = Array.from(el.children).filter((x) => x.tagName.toLowerCase() === 'tr');
      }

      for (const tr of rows) csv += `${this.processRowToCSV(tr)}\n`;
      return `${csv}\n`;
    }

    if (tag === 'th' || tag === 'td') return this.convertNode(el).trim();
    return this.handleChildren(el);
  }

  private codeWrapTable(csv: string): string {
    return this.codeWrap(csv, 'csv');
  }

  private handleTable(el: HTMLTableElement): string {
    const csv = this.handleTableElement(el);
    return this.codeWrapTable(csv);
  }
}

// 监听来自页面的消息
window.addEventListener('message', (event: MessageEvent<unknown>) => {
  // 安全检查：只处理来自当前页面的消息
  if (event.source !== window) {
    return;
  }

  const data = event.data;

  // 验证消息格式
  if (!data || typeof data !== 'object' || !('func' in data)) {
    return;
  }

  const messageData = data as { func: string; [key: string]: unknown };
  logger.debug('Received message from page:', messageData.func);

  switch (messageData.func) {
    case 'screenshop': {
      const screenshotData = messageData as unknown as ScreenshotRequest;
      handleScreenshot(screenshotData.method);
      break;
    }

    case 'closePage': {
      const closeData = messageData as unknown as ClosePageRequest;
      handleClosePage(closeData.url, false);
      break;
    }

    case 'closeAllPage': {
      const closeAllData = messageData as unknown as ClosePageRequest;
      handleClosePage(closeAllData.url, true);
      break;
    }

    default:
      // 转发其他消息到 background
      chrome.runtime.sendMessage({ type: messageData.func, data });
  }
}, false);

// 处理截图请求
function handleScreenshot(method: string): void {
  chrome.runtime.sendMessage(
    { type: 'capture' },
    (response: { code: number; data?: string; error?: string }) => {
      if (response?.code === 0) {
        window.postMessage(
          { method, data: response.data },
          '*'
        );
      } else {
        logger.error('Screenshot failed:', response?.error);
      }
    }
  );
}

// 处理关闭页面请求
function handleClosePage(url: string, closeAll: boolean): void {
  chrome.runtime.sendMessage({
    type: closeAll ? 'closeAllPage' : 'closePage',
    url,
  });
}

// DOM 加载完成后标记页面
document.addEventListener('DOMContentLoaded', () => {
  const manifest = chrome.runtime.getManifest();
  document.body.setAttribute('data-screen', `1-${manifest.version}`);
  logger.info('Content script loaded, version:', manifest.version);
});

// 监听来自 background 的消息
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  logger.debug('Received message from background:', request);

  if (request && typeof request === 'object' && 'type' in request) {
    const typedRequest = request as {
      type: string;
      maxChars?: unknown;
      extractLinkUrl?: unknown;
      extractImageUrl?: unknown;
      maxUrls?: unknown;
      offset?: unknown;
    };

    switch (typedRequest.type) {
      case 'readPage':
        const maxChars = typeof typedRequest.maxChars === 'number' ? typedRequest.maxChars : 120_000;
        const extractLinkUrl = typedRequest.extractLinkUrl === true;
        const extractImageUrl = typedRequest.extractImageUrl === true;
        const maxUrls = typeof typedRequest.maxUrls === 'number' ? typedRequest.maxUrls : 200;

        const converter = new ReadPageDomToMarkdown({
          extractImageUrl,
          extractLinkUrl,
          maxUrls,
        });

        const content = converter.convert(document.body || document.documentElement);
        const data = content.length > maxChars ? content.slice(0, maxChars) : content;
        sendResponse({ code: 0, data, url: window.location.href, title: document.title });
        return true;

      case 'getPageInfo':
        sendResponse({
          code: 0,
          data: {
            url: window.location.href,
            title: document.title,
            favicon: document.querySelector('link[rel="icon"]')?.getAttribute('href') || '',
            length: document.body?.textContent?.length || 0,
            wordCount: document.body?.textContent?.split(/\s+/).length || 0,
          }
        });
        return true;

      case 'getSelection':
        const selection = window.getSelection();
        const selectedText = selection?.toString() || '';
        sendResponse({
          code: 0,
          data: {
            text: selectedText,
            length: selectedText.length,
          }
        });
        return true;

      case 'scrollTo':
        if (typeof typedRequest.offset === 'number') {
          window.scrollTo(0, typedRequest.offset);
          sendResponse({ code: 0 });
        } else {
          sendResponse({ code: -1, error: 'Invalid offset' });
        }
        return true;

      default:
        sendResponse({ received: true });
        return true;
    }
  }

  sendResponse({ received: true });
  return true;
});

const selectionButtonId = 'doubao-selection-action';
let selectionButton: HTMLButtonElement | null = null;
let selectionUpdateTimer: number | null = null;
let lastSelectionText = '';

function ensureSelectionButton(): HTMLButtonElement {
  if (selectionButton) return selectionButton;

  const btn = document.createElement('button');
  btn.id = selectionButtonId;
  btn.type = 'button';
  btn.textContent = '解释';
  btn.style.position = 'fixed';
  btn.style.zIndex = '2147483647';
  btn.style.display = 'none';
  btn.style.padding = '6px 10px';
  btn.style.border = '1px solid rgba(0,0,0,0.08)';
  btn.style.borderRadius = '10px';
  btn.style.background = '#0057ff';
  btn.style.color = '#fff';
  btn.style.fontSize = '12px';
  btn.style.fontWeight = '600';
  btn.style.lineHeight = '16px';
  btn.style.cursor = 'pointer';
  btn.style.boxShadow = '0 6px 18px rgba(0,0,0,0.12)';
  btn.style.userSelect = 'none';
  btn.style.webkitUserSelect = 'none';

  btn.addEventListener('mousedown', (e) => {
    e.preventDefault();
    e.stopPropagation();
  });

  btn.addEventListener('click', async (e) => {
    e.preventDefault();
    e.stopPropagation();

    const text = lastSelectionText.trim();
    if (!text) return;
    hideSelectionButton();

    await chrome.runtime.sendMessage({
      type: 'openSidePanel',
      data: { selectedText: text },
    });
  });

  document.documentElement.appendChild(btn);
  selectionButton = btn;
  return btn;
}

function hideSelectionButton(): void {
  if (!selectionButton) return;
  selectionButton.style.display = 'none';
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function shouldIgnoreSelection(selection: Selection): boolean {
  const anchor = selection.anchorNode;
  if (!anchor) return true;
  const element = anchor.nodeType === Node.ELEMENT_NODE ? (anchor as Element) : anchor.parentElement;
  if (!element) return false;
  const editable = element.closest('input, textarea, [contenteditable="true"], [contenteditable=""], [role="textbox"]');
  return !!editable;
}

function updateSelectionButton(): void {
  const selection = window.getSelection();
  if (!selection || selection.rangeCount === 0 || selection.isCollapsed) {
    hideSelectionButton();
    return;
  }

  if (shouldIgnoreSelection(selection)) {
    hideSelectionButton();
    return;
  }

  const rawText = selection.toString();
  const text = rawText.replace(/\s+/g, ' ').trim();
  if (!text) {
    hideSelectionButton();
    return;
  }

  lastSelectionText = text.length > 10_000 ? text.slice(0, 10_000) : text;
  const range = selection.getRangeAt(0);
  const rect = range.getBoundingClientRect();
  const clientRects = range.getClientRects();
  const bestRect = (rect.width === 0 && rect.height === 0 && clientRects.length > 0) ? clientRects[clientRects.length - 1] : rect;

  if (bestRect.width === 0 && bestRect.height === 0) {
    hideSelectionButton();
    return;
  }

  const btn = ensureSelectionButton();
  const padding = 10;
  const top = clamp(bestRect.bottom + 8, padding, window.innerHeight - padding);
  const left = clamp(bestRect.left, padding, window.innerWidth - padding);

  btn.style.top = `${top}px`;
  btn.style.left = `${left}px`;
  btn.style.display = 'block';
}

function scheduleSelectionUpdate(): void {
  if (selectionUpdateTimer !== null) window.clearTimeout(selectionUpdateTimer);
  selectionUpdateTimer = window.setTimeout(() => {
    selectionUpdateTimer = null;
    updateSelectionButton();
  }, 80);
}

document.addEventListener('selectionchange', () => {
  scheduleSelectionUpdate();
});

document.addEventListener('mousedown', (e) => {
  const target = e.target as Element | null;
  if (target && (target.id === selectionButtonId || target.closest(`#${selectionButtonId}`))) return;
  hideSelectionButton();
}, true);

window.addEventListener('scroll', () => {
  hideSelectionButton();
}, true);
