import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  WebContentExtractor,
  type ExtractOptions,
  type ExtractResult,
} from '../../utils/web-content-extractor';
import {
  EnhancedWebContentExtractor,
  type EnhancedExtractOptions,
  type EnhancedExtractResult,
} from '../../utils/enhanced-web-extractor';

// 模拟 logger
vi.mock('../../utils/logger', () => ({
  logger: {
    info: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
    debug: vi.fn(),
    setPrefix: vi.fn(),
  },
}));

// 模拟 DOM 环境
const createMockDocument = (html: string, title = 'Test Page', url = 'https://example.com', lang = 'zh-CN') => {
  const parser = new (global as any).DOMParser();
  const doc = parser.parseFromString(html, 'text/html');

  // 设置 document 属性
  Object.defineProperty(doc, 'title', { value: title, writable: true });
  // DOMParser 创建的文档的 location 属性不可配置，使用 Proxy 包装
  const docWithLocation = new Proxy(doc as any, {
    get(target, prop) {
      if (prop === 'location') {
        return { href: url, origin: 'https://example.com' };
      }
      return target[prop];
    },
  });
  Object.defineProperty(docWithLocation.documentElement, 'lang', {
    value: lang,
    writable: true,
  });

  return docWithLocation;
};

describe('Web Extractor Integration Tests', () => {
  let webExtractor: WebContentExtractor;
  let enhancedExtractor: EnhancedWebContentExtractor;

  beforeEach(() => {
    webExtractor = new WebContentExtractor();
    enhancedExtractor = new EnhancedWebContentExtractor();
    vi.clearAllMocks();
    // 模拟 CSS.escape
    if (typeof (global as any).CSS === 'undefined') {
      (global as any).CSS = { escape: (s: string) => s.replace(/"/g, '\\"') };
    }
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  describe('WebContentExtractor', () => {
    it('should extract content from article element', () => {
      const html = `
        <html>
          <head><title>Test Article</title></head>
          <body>
            <article>
              <h1>Article Title</h1>
              <p>This is the main content of the article.</p>
              <p>It has multiple paragraphs.</p>
            </article>
          </body>
        </html>
      `;

      const doc = createMockDocument(html, 'Test Article');
      vi.stubGlobal('document', doc);
      vi.stubGlobal('window', {
        location: { href: 'https://example.com/article', origin: 'https://example.com' },
      });

      const result = webExtractor.extract({ maxChars: 10000 });

      expect(result.success).toBe(true);
      expect(result.title).toBe('Test Article');
      expect(result.content).toContain('Article Title');
      expect(result.content).toContain('main content');
    });

    it('should extract metadata from page', () => {
      const html = `
        <html>
          <head>
            <title>Page Title</title>
            <meta name="description" content="Page description">
            <meta name="author" content="John Doe">
            <meta name="keywords" content="test, example">
            <meta property="og:site_name" content="Example Site">
          </head>
          <body>
            <main>
              <h1>Main Content</h1>
              <p>Content here.</p>
            </main>
          </body>
        </html>
      `;

      const doc = createMockDocument(html, 'Page Title');
      vi.stubGlobal('document', doc);
      vi.stubGlobal('window', {
        location: { href: 'https://example.com', origin: 'https://example.com' },
      });

      const result = webExtractor.extract();

      expect(result.success).toBe(true);
      expect(result.metadata.title).toBe('Page Title');
      expect(result.metadata.description).toBe('Page description');
      expect(result.metadata.author).toBe('John Doe');
      expect(result.metadata.keywords).toBe('test, example');
      expect(result.metadata.siteName).toBe('Example Site');
    });

    it('should extract images from page', () => {
      const html = `
        <html>
          <head><title>Image Test</title></head>
          <body>
            <main>
              <img src="/image1.jpg" alt="Image 1" title="First Image">
              <img src="/image2.png" alt="Image 2">
              <p>Content with images.</p>
            </main>
          </body>
        </html>
      `;

      const doc = createMockDocument(html, 'Image Test');
      vi.stubGlobal('document', doc);
      vi.stubGlobal('window', {
        location: { href: 'https://example.com', origin: 'https://example.com' },
      });

      const result = webExtractor.extract({ extractImageUrl: true });

      expect(result.success).toBe(true);
      expect(result.images).toBeDefined();
      expect(result.images!.length).toBe(2);
      expect(result.images![0].alt).toBe('Image 1');
    });

    it('should handle pages with code blocks', () => {
      const html = `
        <html>
          <head><title>Code Test</title></head>
          <body>
            <main>
              <pre><code class="language-javascript">const x = 1;</code></pre>
              <p>Some text.</p>
              <pre><code class="language-python">print("hello")</code></pre>
            </main>
          </body>
        </html>
      `;

      const doc = createMockDocument(html, 'Code Test');
      vi.stubGlobal('document', doc);
      vi.stubGlobal('window', {
        location: { href: 'https://example.com', origin: 'https://example.com' },
      });

      const result = webExtractor.extract({ preserveCodeBlocks: true });

      expect(result.success).toBe(true);
      expect(result.stats.codeBlockCount).toBeGreaterThan(0);
    });

    it('should handle pages with tables', () => {
      const html = `
        <html>
          <head><title>Table Test</title></head>
          <body>
            <main>
              <table>
                <tr><th>Name</th><th>Age</th></tr>
                <tr><td>Alice</td><td>30</td></tr>
                <tr><td>Bob</td><td>25</td></tr>
              </table>
            </main>
          </body>
        </html>
      `;

      const doc = createMockDocument(html, 'Table Test');
      vi.stubGlobal('document', doc);
      vi.stubGlobal('window', {
        location: { href: 'https://example.com', origin: 'https://example.com' },
      });

      const result = webExtractor.extract({ extractTables: true });

      expect(result.success).toBe(true);
      expect(result.stats.tableCount).toBeGreaterThan(0);
    });

    it('should generate summary', () => {
      const html = `
        <html>
          <head><title>Summary Test</title></head>
          <body>
            <main>
              <p>This is a long paragraph with enough content to generate a summary. 
              It discusses various topics and provides detailed information about testing 
              web content extraction functionality in the application.</p>
            </main>
          </body>
        </html>
      `;

      const doc = createMockDocument(html, 'Summary Test');
      vi.stubGlobal('document', doc);
      vi.stubGlobal('window', {
        location: { href: 'https://example.com', origin: 'https://example.com' },
      });

      const result = webExtractor.extract({ includeSummary: true });

      expect(result.success).toBe(true);
      expect(result.summary).toBeDefined();
      expect(result.summary!.length).toBeGreaterThan(0);
    });

    it('should extract selection', () => {
      const html = `
        <html>
          <head><title>Selection Test</title></head>
          <body>
            <main>
              <p id="selectable">Selected text content</p>
            </main>
          </body>
        </html>
      `;

      const doc = createMockDocument(html, 'Selection Test');
      vi.stubGlobal('document', doc);
      vi.stubGlobal('window', {
        location: { href: 'https://example.com', origin: 'https://example.com' },
        getSelection: vi.fn().mockReturnValue({
          toString: () => 'Selected text content',
          rangeCount: 1,
          getRangeAt: vi.fn().mockReturnValue({
            cloneContents: vi.fn().mockReturnValue(doc.getElementById('selectable')),
          }),
        }),
      });

      const result = webExtractor.extractSelection();

      expect(result).not.toBeNull();
      expect(result!.text).toBe('Selected text content');
    });

    it('should get page info', () => {
      const html = `
        <html>
          <head><title>Page Info Test</title></head>
          <body>
            <main><p>Content</p></main>
          </body>
        </html>
      `;

      const doc = createMockDocument(html, 'Page Info Test');
      vi.stubGlobal('document', doc);
      vi.stubGlobal('window', {
        location: { href: 'https://example.com/page', origin: 'https://example.com' },
      });

      const info = webExtractor.getPageInfo();

      expect(info.title).toBe('Page Info Test');
      expect(info.url).toBe('https://example.com/page');
      expect(info.length).toBeGreaterThan(0);
    });

    it('should handle missing main content gracefully', () => {
      const html = `
        <html>
          <head><title>Minimal</title></head>
          <body>
            <div>Some content without semantic markup</div>
          </body>
        </html>
      `;

      const doc = createMockDocument(html, 'Minimal');
      vi.stubGlobal('document', doc);
      vi.stubGlobal('window', {
        location: { href: 'https://example.com', origin: 'https://example.com' },
      });

      const result = webExtractor.extract();

      expect(result.success).toBe(true);
      expect(result.content).toBeDefined();
    });
  });

  describe('EnhancedWebContentExtractor', () => {
    it('should extract structured data (JSON-LD)', () => {
      const html = `
        <html>
          <head>
            <title>Structured Data Test</title>
            <script type="application/ld+json">
              {
                "@type": "Article",
                "headline": "Test Article",
                "author": "John Doe"
              }
            </script>
          </head>
          <body>
            <main><p>Content</p></main>
          </body>
        </html>
      `;

      const doc = createMockDocument(html, 'Structured Data Test');
      vi.stubGlobal('document', doc);
      vi.stubGlobal('window', {
        location: { href: 'https://example.com', origin: 'https://example.com' },
      });

      const result = enhancedExtractor.extract({ extractJsonLd: true });

      expect(result.success).toBe(true);
      expect(result.structuredData.length).toBeGreaterThan(0);
      expect(result.structuredData[0].format).toBe('json-ld');
    });

    it('should extract media content', () => {
      const html = `
        <html>
          <head><title>Media Test</title></head>
          <body>
            <main>
              <img src="/photo.jpg" alt="Photo" width="800" height="600">
              <video src="/video.mp4" poster="/thumb.jpg"></video>
              <audio src="/audio.mp3"></audio>
            </main>
          </body>
        </html>
      `;

      const doc = createMockDocument(html, 'Media Test');
      vi.stubGlobal('document', doc);
      vi.stubGlobal('window', {
        location: { href: 'https://example.com', origin: 'https://example.com' },
      });

      const result = enhancedExtractor.extract({
        extractMedia: true,
        extractVideos: true,
        extractAudios: true,
        extractImageUrl: true,
      });

      expect(result.success).toBe(true);
      expect(result.media.length).toBeGreaterThan(0);
      expect(result.stats.imageCount).toBeGreaterThan(0);
    });

    it('should extract enhanced metadata', () => {
      const html = `
        <html lang="en">
          <head>
            <title>Enhanced Meta</title>
            <meta property="og:title" content="OG Title">
            <meta property="og:description" content="OG Description">
            <meta property="og:image" content="https://example.com/image.jpg">
            <meta property="article:published_time" content="2024-01-01">
            <meta property="article:modified_time" content="2024-01-02">
            <link rel="icon" href="/favicon.ico">
          </head>
          <body>
            <main><p>Content</p></main>
          </body>
        </html>
      `;

      const doc = createMockDocument(html, 'Enhanced Meta', 'https://example.com', 'en');
      vi.stubGlobal('document', doc);
      vi.stubGlobal('window', {
        location: { href: 'https://example.com', origin: 'https://example.com' },
      });

      const result = enhancedExtractor.extract();

      expect(result.success).toBe(true);
      expect(result.metadata.title).toBe('OG Title');
      expect(result.metadata.description).toBe('OG Description');
      expect(result.metadata.coverImage).toBe('https://example.com/image.jpg');
      expect(result.metadata.publishedTime).toBe('2024-01-01');
      expect(result.metadata.modifiedTime).toBe('2024-01-02');
      expect(result.metadata.language).toBe('en');
    });

    it('should handle extraction errors gracefully', () => {
      const doc = createMockDocument('<html><body></body></html>', 'Error Test');
      vi.stubGlobal('document', doc);
      vi.stubGlobal('window', {
        location: { href: 'https://example.com', origin: 'https://example.com' },
      });

      const result = enhancedExtractor.extract();

      expect(result.success).toBe(true); // Should still succeed with empty content
    });

    it('should calculate reading time', () => {
      const html = `
        <html>
          <head><title>Reading Time</title></head>
          <body>
            <main>
              <p>${'这是一段中文内容。'.repeat(100)}</p>
              <p>${'This is English content. '.repeat(50)}</p>
            </main>
          </body>
        </html>
      `;

      const doc = createMockDocument(html, 'Reading Time');
      vi.stubGlobal('document', doc);
      vi.stubGlobal('window', {
        location: { href: 'https://example.com', origin: 'https://example.com' },
      });

      const result = enhancedExtractor.extract();

      expect(result.success).toBe(true);
      expect(result.metadata.readingTime).toBeDefined();
      expect(result.metadata.readingTime).toContain('分钟');
    });

    it('should get page info', () => {
      const html = `
        <html>
          <head><title>Page Info</title></head>
          <body>
            <main><p>Content for page info test.</p></main>
          </body>
        </html>
      `;

      const doc = createMockDocument(html, 'Page Info', 'https://example.com/info');
      vi.stubGlobal('document', doc);
      vi.stubGlobal('window', {
        location: { href: 'https://example.com/info', origin: 'https://example.com' },
      });

      const info = enhancedExtractor.getPageInfo();

      expect(info.url).toBe('https://example.com/info');
      expect(info.title).toBe('Page Info');
      expect(info.wordCount).toBeGreaterThan(0);
      expect(info.readingTime).toBeDefined();
    });

    it('should extract microdata', () => {
      const html = `
        <html>
          <head><title>Microdata Test</title></head>
          <body>
            <main>
              <div itemscope itemtype="http://schema.org/Person">
                <span itemprop="name">John Doe</span>
                <span itemprop="jobTitle">Developer</span>
              </div>
            </main>
          </body>
        </html>
      `;

      const doc = createMockDocument(html, 'Microdata Test');
      vi.stubGlobal('document', doc);
      vi.stubGlobal('window', {
        location: { href: 'https://example.com', origin: 'https://example.com' },
      });

      const result = enhancedExtractor.extract({ extractMicrodata: true });

      expect(result.success).toBe(true);
      const microdata = result.structuredData.filter(s => s.format === 'microdata');
      expect(microdata.length).toBeGreaterThan(0);
    });

    it('should extract RDFa', () => {
      const html = `
        <html>
          <head><title>RDFa Test</title></head>
          <body>
            <main>
              <div typeof="schema:Person">
                <span property="schema:name">Jane Doe</span>
              </div>
            </main>
          </body>
        </html>
      `;

      const doc = createMockDocument(html, 'RDFa Test');
      vi.stubGlobal('document', doc);
      vi.stubGlobal('window', {
        location: { href: 'https://example.com', origin: 'https://example.com' },
      });

      const result = enhancedExtractor.extract({ extractRdfa: true });

      expect(result.success).toBe(true);
      const rdfa = result.structuredData.filter(s => s.format === 'rdfa');
      expect(rdfa.length).toBeGreaterThan(0);
    });
  });

  describe('Extraction Stats', () => {
    it('should provide accurate stats', () => {
      const html = `
        <html>
          <head><title>Stats Test</title></head>
          <body>
            <main>
              <h1>Title</h1>
              <p>Paragraph one.</p>
              <p>Paragraph two.</p>
              <img src="/img.jpg" alt="Image">
              <a href="/link">Link</a>
              <pre><code>code</code></pre>
            </main>
          </body>
        </html>
      `;

      const doc = createMockDocument(html, 'Stats Test');
      vi.stubGlobal('document', doc);
      vi.stubGlobal('window', {
        location: { href: 'https://example.com', origin: 'https://example.com' },
      });

      const result = webExtractor.extract();

      expect(result.success).toBe(true);
      expect(result.stats.originalLength).toBeGreaterThan(0);
      expect(result.stats.extractedLength).toBeGreaterThan(0);
      expect(result.stats.paragraphCount).toBeGreaterThan(0);
      expect(result.stats.processingTime).toBeGreaterThanOrEqual(0);
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty document', () => {
      const doc = createMockDocument('<html><head><title>Empty</title></head><body></body></html>', 'Empty');
      vi.stubGlobal('document', doc);
      vi.stubGlobal('window', {
        location: { href: 'https://example.com', origin: 'https://example.com' },
      });

      const result = webExtractor.extract();

      expect(result.success).toBe(true);
      expect(result.content).toBe('');
    });

    it('should handle document with only navigation', () => {
      const html = `
        <html>
          <head><title>Nav Only</title></head>
          <body>
            <nav>Navigation</nav>
            <footer>Footer</footer>
          </body>
        </html>
      `;

      const doc = createMockDocument(html, 'Nav Only');
      vi.stubGlobal('document', doc);
      vi.stubGlobal('window', {
        location: { href: 'https://example.com', origin: 'https://example.com' },
      });

      const result = webExtractor.extract();

      expect(result.success).toBe(true);
    });

    it('should respect maxChars option', () => {
      const longContent = 'a'.repeat(20000);
      const html = `
        <html>
          <head><title>Long Content</title></head>
          <body>
            <main><p>${longContent}</p></main>
          </body>
        </html>
      `;

      const doc = createMockDocument(html, 'Long Content');
      vi.stubGlobal('document', doc);
      vi.stubGlobal('window', {
        location: { href: 'https://example.com', origin: 'https://example.com' },
      });

      const result = webExtractor.extract({ maxChars: 5000 });

      expect(result.success).toBe(true);
      expect(result.content.length).toBeLessThanOrEqual(5000);
    });
  });
});
