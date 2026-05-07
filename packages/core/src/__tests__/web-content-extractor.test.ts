import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

class TestTextNode {
  nodeType = 3;
  textContent: string;
  parentElement: TestElement | null = null;
  constructor(text: string) {
    this.textContent = text;
  }
}

type AttrMap = Record<string, string>;

class TestElement {
  nodeType = 1;
  tagName: string;
  parentElement: TestElement | null = null;
  private attrs: AttrMap = {};
  childNodes: Array<TestElement | TestTextNode> = [];

  constructor(tagName: string, attrs?: AttrMap) {
    this.tagName = tagName.toUpperCase();
    if (attrs) this.attrs = { ...attrs };
  }

  get id(): string {
    return this.attrs.id || '';
  }

  get className(): string {
    return this.attrs.class || '';
  }

  get children(): TestElement[] {
    return this.childNodes.filter((x): x is TestElement => x instanceof TestElement);
  }

  get textContent(): string {
    let out = '';
    for (const n of this.childNodes) {
      if (n instanceof TestTextNode) out += n.textContent;
      else out += n.textContent;
    }
    return out;
  }

  append(...nodes: Array<TestElement | TestTextNode>): this {
    for (const n of nodes) {
      if (n instanceof TestElement) n.parentElement = this;
      else n.parentElement = this;
      this.childNodes.push(n);
    }
    return this;
  }

  setAttribute(name: string, value: string): void {
    this.attrs[name] = value;
  }

  getAttribute(name: string): string | null {
    return this.attrs[name] ?? null;
  }

  remove(): void {
    if (!this.parentElement) return;
    this.parentElement.childNodes = this.parentElement.childNodes.filter((x) => x !== this);
    this.parentElement = null;
  }

  cloneNode(deep: boolean): TestElement {
    const clone = new TestElement(this.tagName, { ...this.attrs });
    if (!deep) return clone;
    for (const child of this.childNodes) {
      if (child instanceof TestTextNode) {
        clone.append(new TestTextNode(child.textContent));
      } else {
        clone.append(child.cloneNode(true));
      }
    }
    return clone;
  }

  querySelector(selector: string): TestElement | null {
    const all = this.querySelectorAll(selector);
    return all[0] || null;
  }

  querySelectorAll(selector: string): TestElement[] {
    const parts = selector
      .split(',')
      .map((x) => x.trim())
      .filter(Boolean);
    if (parts.length > 1) {
      const merged: TestElement[] = [];
      const seen = new Set<TestElement>();
      for (const p of parts) {
        for (const el of this.querySelectorAll(p)) {
          if (seen.has(el)) continue;
          seen.add(el);
          merged.push(el);
        }
      }
      return merged;
    }

    const part = parts[0] || '';
    if (!part) return [];
    if (part === '*') return this.walk().filter((x) => x !== this);
    const partSansStrings = part.replace(/"[^"]*"/g, '""').replace(/'[^']*'/g, "''");
    if (/[>+~]/.test(partSansStrings) || /\s/.test(partSansStrings) || /:[a-zA-Z]/.test(partSansStrings) || /\[[^\]]*(?:\^=|\$=|~=|\|=)/.test(partSansStrings)) {
      throw new Error(`Unsupported selector: ${part}`);
    }

    const parsed = parseSimpleSelector(part);
    const out: TestElement[] = [];
    for (const el of this.walk()) {
      if (el === this) continue;
      if (!matchesSelector(el, parsed)) continue;
      out.push(el);
    }
    return out;
  }

  private walk(): TestElement[] {
    const out: TestElement[] = [this];
    for (const child of this.children) out.push(...child.walk());
    return out;
  }
}

type ParsedSelector = {
  tag?: string;
  attr?: { name: string; op?: '=' | '*='; value?: string };
  id?: string;
  className?: string;
};

function parseSimpleSelector(selector: string): ParsedSelector {
  const s = selector.trim();
  if (s.startsWith('#')) return { id: s.slice(1) };
  if (s.startsWith('.')) return { className: s.slice(1) };
  if (s.startsWith('[')) {
    const mContains = s.match(/^\[([^\]=]+)\*="([^"]*)"\]$/);
    if (mContains) return { attr: { name: mContains[1]!.trim(), op: '*=', value: mContains[2] } };
    const mEq = s.match(/^\[([^\]=]+)="([^"]*)"\]$/);
    if (mEq) return { attr: { name: mEq[1]!.trim(), op: '=', value: mEq[2] } };
    const mExists = s.match(/^\[([^\]=]+)\]$/);
    if (mExists) return { attr: { name: mExists[1]!.trim() } };
    return {};
  }
  const tagAttrContains = s.match(/^([a-zA-Z0-9_-]+)\[([^\]=]+)\*="([^"]*)"\]$/);
  if (tagAttrContains) {
    return {
      tag: tagAttrContains[1]!.toUpperCase(),
      attr: { name: tagAttrContains[2]!.trim(), op: '*=', value: tagAttrContains[3] },
    };
  }
  const tagAttrEq = s.match(/^([a-zA-Z0-9_-]+)\[([^\]=]+)="([^"]*)"\]$/);
  if (tagAttrEq) {
    return {
      tag: tagAttrEq[1]!.toUpperCase(),
      attr: { name: tagAttrEq[2]!.trim(), op: '=', value: tagAttrEq[3] },
    };
  }
  const tagAttrExists = s.match(/^([a-zA-Z0-9_-]+)\[([^\]=]+)\]$/);
  if (tagAttrExists) {
    return { tag: tagAttrExists[1]!.toUpperCase(), attr: { name: tagAttrExists[2]!.trim() } };
  }
  return { tag: s.toUpperCase() };
}

function matchesSelector(el: TestElement, sel: ParsedSelector): boolean {
  if (sel.tag && el.tagName !== sel.tag) return false;
  if (sel.id && el.id !== sel.id) return false;
  if (sel.className) {
    const classes = el.className.split(/\s+/).filter(Boolean);
    if (!classes.includes(sel.className)) return false;
  }
  if (sel.attr) {
    const got = el.getAttribute(sel.attr.name);
    if (sel.attr.op === '=') return got === (sel.attr.value ?? '');
    if (sel.attr.op === '*=') return got !== null && got.includes(sel.attr.value ?? '');
    return got !== null;
  }
  return true;
}

type DocumentStub = {
  title: string;
  body: TestElement;
  documentElement: { lang: string };
  querySelector: (selector: string) => unknown;
  querySelectorAll: (selector: string) => unknown;
};

function createDocument(body: TestElement): DocumentStub {
  const doc: DocumentStub = {
    title: 'Test Page',
    body,
    documentElement: { lang: 'zh-CN' },
    querySelector: (selector: string) => {
      if (selector.trim() === 'body') return body;
      return body.querySelector(selector);
    },
    querySelectorAll: (selector: string) => {
      if (selector.trim() === 'body') return [body];
      const list = body.querySelectorAll(selector);
      if (selector.split(',').map((x) => x.trim()).includes('body')) return [body, ...list];
      return list;
    },
  };
  return doc;
}

describe('WebContentExtractor - DOM to Markdown regressions', () => {
  const originals = new Map<string, unknown>();
  const setGlobal = (key: string, value: unknown) => {
    const g = globalThis as unknown as Record<string, unknown>;
    if (!originals.has(key)) originals.set(key, g[key]);
    g[key] = value;
  };
  const restoreGlobals = () => {
    const g = globalThis as unknown as Record<string, unknown>;
    for (const [k, v] of originals.entries()) g[k] = v;
    originals.clear();
  };

  beforeEach(() => {
    setGlobal('CSS', { escape: (s: string) => s });
    setGlobal('Node', { TEXT_NODE: 3, ELEMENT_NODE: 1 });
    setGlobal('HTMLSlotElement', class HTMLSlotElement {});
    setGlobal('performance', { now: () => 0 });

    const loc = { href: 'https://example.com/a', origin: 'https://example.com', protocol: 'https:' };
    setGlobal('location', loc);
    setGlobal('window', { location: loc });
  });

  afterEach(() => {
    restoreGlobals();
  });

  it('保留文本节点间空格（避免 Helloworld）', async () => {
    const body = new TestElement('body').append(
      new TestElement('div').append(
        new TestElement('p').append(
          new TestTextNode('Hello '),
          new TestTextNode('world')
        )
      )
    );
    setGlobal('document', createDocument(body));

    const { WebContentExtractor } = await import('../utils/web-content-extractor');
    const extractor = new WebContentExtractor();
    const result = extractor.extract({ includeSummary: false, extractLinkUrl: false, extractImageUrl: false, maxChars: 10_000 });
    expect(result.success).toBe(true);
    expect(/Hello\s+world/.test(result.content)).toBe(true);
  });

  it('保留 br 换行', async () => {
    const body = new TestElement('body').append(
      new TestElement('div').append(
        new TestElement('p').append(
          new TestTextNode('a'),
          new TestElement('br'),
          new TestTextNode('b')
        )
      )
    );
    setGlobal('document', createDocument(body));

    const { WebContentExtractor } = await import('../utils/web-content-extractor');
    const extractor = new WebContentExtractor();
    const result = extractor.extract({ includeSummary: false, extractLinkUrl: false, extractImageUrl: false, maxChars: 10_000 });
    expect(result.success).toBe(true);
    expect(/a\s*\n\s*b/.test(result.content)).toBe(true);
  });
});
