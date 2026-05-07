import * as cheerio from 'cheerio';
import type { ExtractionResult } from './web-content-extraction-service';

// Use built-in fetch API - native fetch is available in both browser and modern Node.js
// In extension context, we always use the native fetch API
const fetchImplementation = typeof window !== 'undefined' ? window.fetch : globalThis.fetch;

if (!fetchImplementation) {
  throw new Error('Fetch API is not available in this environment');
}

const fetchWrapper = fetchImplementation;

// CORS 代理列表（按优先级排序）
const CORS_PROXIES = [
  'https://corsproxy.io/?',
  'https://api.allorigins.win/raw?url=',
  'https://api.codetabs.com/v1/proxy?quest=',
];

export class WebContentExtractionPipeline {
  /**
   * 从URL提取网页内容（带CORS重试）
   * @param url 网页URL
   * @param useProxy 是否使用代理
   * @returns 提取的内容
   */
  async extractFromUrl(url: string, useProxy: boolean = true): Promise<ExtractionResult> {
    const trace: NonNullable<ExtractionResult['trace']> = []

    // 首先尝试直接请求
    if (!useProxy) {
      try {
        const startedAt = Date.now()
        const response = await fetchWrapper(url);
        const html = await response.text();
        trace.push({ engine: 'http', status: 'success', durationMs: Date.now() - startedAt })
        return {
          ...this.extractFromHtml(html),
          engine: 'http',
          sourceEngine: 'http',
          confidence: 0.85,
          trace,
          fallbackTrace: [],
        };
      } catch (error: any) {
        throw new Error(`Failed to extract content from URL: ${error.message}`);
      }
    }

    // 尝试使用代理
    for (let i = 0; i < CORS_PROXIES.length; i++) {
      const proxyUrl = CORS_PROXIES[i] + encodeURIComponent(url);
      try {
        const startedAt = Date.now()
        const response = await fetchWrapper(proxyUrl);
        const html = await response.text();
        const engineName = `proxy-${i + 1}`
        trace.push({ engine: engineName, status: 'success', durationMs: Date.now() - startedAt })
        const fallbackTrace = trace
          .filter(item => item.status === 'failed' || item.status === 'skipped')
          .map(item => item.engine)
        return {
          ...this.extractFromHtml(html),
          engine: 'http-proxy',
          sourceEngine: engineName,
          confidence: 0.7,
          trace,
          fallbackTrace,
        };
      } catch (error: any) {
        trace.push({
          engine: `proxy-${i + 1}`,
          status: 'failed',
          reason: error?.message || String(error),
        })
        console.warn(`Proxy ${i + 1} failed:`, error.message);
      }
    }

    throw new Error('Failed to extract content: All CORS proxies failed. Please try a different URL or enable a local proxy server.');
  }

  /**
   * 从URL提取网页内容（旧方法，保持向后兼容）
   * @param url 网页URL
   * @returns 提取的内容
   */
  async extractFromUrlOld(url: string): Promise<ExtractionResult> {
    try {
      const startedAt = Date.now()
      const response = await fetchWrapper(url);
      const html = await response.text();
      return {
        ...this.extractFromHtml(html),
        engine: 'http',
        sourceEngine: 'http',
        confidence: 0.85,
        trace: [{ engine: 'http', status: 'success', durationMs: Date.now() - startedAt }],
        fallbackTrace: [],
      };
    } catch (error: any) {
      throw new Error(`Failed to extract content from URL: ${error.message}`);
    }
  }

  /**
   * 从HTML提取内容
   * @param html HTML内容
   * @returns 提取的内容
   */
  extractFromHtml(html: string): ExtractionResult {
    const $ = cheerio.load(html);
    
    // 提取标题
    const title = $('title').text().trim() || $('h1').first().text().trim() || '';
    
    // 提取正文内容
    const content = this.extractMainContent($);
    
    // 提取元数据
    const metadata = this.extractMetadata($);
    
    return {
      content,
      title,
      metadata,
      engine: 'html-parse',
      sourceEngine: 'html-parse',
      confidence: content.length > 300 ? 0.8 : 0.6,
      trace: [{ engine: 'html-parse', status: 'success' }],
      fallbackTrace: [],
    };
  }

  /**
   * 提取主要内容
   * @param $ Cheerio实例
   * @returns 提取的内容
   */
  private extractMainContent($: cheerio.CheerioAPI): string {
    // 尝试不同的内容选择器
    const contentSelectors = [
      'main',
      '.main-content',
      '.content',
      '.article',
      'article',
      '.post',
      '.page-content',
      'body'
    ];

    let mainContent = '';
    
    for (const selector of contentSelectors) {
      const element = $(selector);
      if (element.length > 0) {
        // 移除脚本和样式
        element.find('script, style, noscript, iframe').remove();
        // 提取文本内容
        mainContent = element.text().trim();
        if (mainContent.length > 100) { // 确保提取到足够的内容
          break;
        }
      }
    }

    // 如果没有找到合适的内容，使用整个body
    if (!mainContent) {
      $('script, style, noscript, iframe').remove();
      mainContent = $('body').text().trim();
    }

    // 清理内容
    return this.cleanContent(mainContent);
  }

  /**
   * 提取元数据
   * @param $ Cheerio实例
   * @returns 提取的元数据
   */
  private extractMetadata($: cheerio.CheerioAPI): Record<string, string> {
    const metadata: Record<string, string> = {};
    
    // 提取meta标签
    $('meta').each((_, element) => {
      const name = $(element).attr('name') || $(element).attr('property') || $(element).attr('http-equiv');
      const content = $(element).attr('content');
      if (name && content) {
        metadata[name] = content;
      }
    });
    
    // 提取链接
    metadata.links = JSON.stringify(
      $('a')
        .map((_, element) => ({
          text: $(element).text().trim(),
          href: $(element).attr('href')
        }))
        .get()
        .filter(link => link.href)
    );
    
    return metadata;
  }

  /**
   * 清理内容
   * @param content 原始内容
   * @returns 清理后的内容
   */
  private cleanContent(content: string): string {
    return content
      .replace(/\s+/g, ' ') // 替换多个空白字符为单个空格
      .replace(/\n+/g, '\n') // 替换多个换行符为单个换行符
      .trim();
  }

  /**
   * 提取特定元素
   * @param html HTML内容
   * @param selector CSS选择器
   * @returns 提取的元素内容
   */
  extractElement(html: string, selector: string): string {
    const $ = cheerio.load(html);
    const element = $(selector);
    return element.text().trim();
  }

  /**
   * 提取链接
   * @param html HTML内容
   * @returns 提取的链接列表
   */
  extractLinks(html: string): Array<{ text: string; href: string }> {
    const $ = cheerio.load(html);
    return $('a')
      .map((_, element) => ({
        text: $(element).text().trim(),
        href: $(element).attr('href') || ''
      }))
      .get()
      .filter(link => link.href);
  }
}
