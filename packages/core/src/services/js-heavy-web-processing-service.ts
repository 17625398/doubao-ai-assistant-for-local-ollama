// This service should only be used in Node.js environment
// It will not work in browser environments due to Playwright dependencies

let chromium: any;

// Only import Playwright in Node.js environment
if (typeof window === 'undefined') {
  const playwright = require('playwright');
  chromium = playwright.chromium;
}

import { ExtractionResult } from './web-content-extraction-service';

export class JSHeavyWebProcessingService {
  private browser: any | null = null;

  /**
   * 初始化浏览器
   */
  private async initBrowser(): Promise<any> {
    if (!chromium) {
      throw new Error('Playwright is not available in this environment. This service only works in Node.js.');
    }
    if (!this.browser) {
      this.browser = await chromium.launch({
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox']
      });
    }
    return this.browser;
  }

  /**
   * 关闭浏览器
   */
  async closeBrowser(): Promise<void> {
    if (this.browser) {
      await this.browser.close();
      this.browser = null;
    }
  }

  /**
   * 处理JavaScript-heavy网页
   * @param url 网页URL
   * @param options 处理选项
   * @returns 提取的内容
   */
  async processJSHeavyPage(url?: string, options: JSHeavyProcessingOptions = {}): Promise<ExtractionResult> {
    // If no URL is provided, return placeholder
    if (!url) {
      return {
        content: 'JS-heavy page processing not implemented in this context',
        title: 'JS-heavy Page',
        metadata: {}
      };
    }

    let page: any | null = null;
    
    try {
      const browser = await this.initBrowser();
      page = await browser.newPage();
      
      // 设置导航选项
      await page.goto(url, {
        waitUntil: options.waitUntil || 'networkidle',
        timeout: options.timeout || 60000
      });
      
      // 等待指定的选择器
      if (options.waitForSelector) {
        await page.waitForSelector(options.waitForSelector, {
          timeout: options.timeout || 30000
        });
      }
      
      // 等待指定的时间
      if (options.waitForTimeout) {
        await page.waitForTimeout(options.waitForTimeout);
      }
      
      // 滚动页面以加载更多内容
      if (options.scrollToLoad) {
        await this.scrollToLoad(page, options.scrollTimes || 3, options.scrollDelay || 1000);
      }
      
      // 提取内容
      const html = await page.content();
      const title = await page.title();
      
      // 提取元数据
      const metadata = await this.extractMetadata(page);
      
      // 提取主内容
      const content = await this.extractContent(page, options);
      
      return {
        content,
        title,
        metadata
      };
    } catch (error: any) {
      throw new Error(`Failed to process JS-heavy page: ${error.message}`);
    } finally {
      if (page) {
        await page.close();
      }
    }
  }

  /**
   * 滚动页面以加载更多内容
   * @param page Playwright页面
   * @param scrollTimes 滚动次数
   * @param scrollDelay 滚动延迟
   */
  private async scrollToLoad(page: any, scrollTimes: number, scrollDelay: number): Promise<void> {
    for (let i = 0; i < scrollTimes; i++) {
      await page.evaluate(() => {
        window.scrollBy(0, window.innerHeight);
      });
      await page.waitForTimeout(scrollDelay);
    }
  }

  /**
   * 提取元数据
   * @param page Playwright页面
   * @returns 提取的元数据
   */
  private async extractMetadata(page: any): Promise<Record<string, string>> {
    const metadata: Record<string, string> = {};
    
    // 提取meta标签
    const metaTags = await page.evaluate(() => {
      const tags: Array<{ name: string; content: string }> = [];
      document.querySelectorAll('meta').forEach(meta => {
        const name = meta.getAttribute('name') || meta.getAttribute('property') || meta.getAttribute('http-equiv');
        const content = meta.getAttribute('content');
        if (name && content) {
          tags.push({ name, content });
        }
      });
      return tags;
    });
    
    metaTags.forEach((tag: any) => {
      metadata[tag.name] = tag.content;
    });
    
    // 提取链接
    const links = await page.evaluate(() => {
      const linkList: Array<{ text: string; href: string }> = [];
      document.querySelectorAll('a').forEach(a => {
        const text = a.textContent?.trim() || '';
        const href = a.getAttribute('href') || '';
        if (href) {
          linkList.push({ text, href });
        }
      });
      return linkList;
    });
    
    metadata.links = JSON.stringify(links);
    
    return metadata;
  }

  /**
   * 提取内容
   * @param page Playwright页面
   * @param options 提取选项
   * @returns 提取的内容
   */
  private async extractContent(page: any, options: JSHeavyProcessingOptions): Promise<string> {
    if (options.selector) {
      // 提取指定选择器的内容
      const content = await page.evaluate((selector: string) => {
        const element = document.querySelector(selector);
        return element ? element.textContent || '' : '';
      }, options.selector);
      return content.trim();
    } else {
      // 提取主内容
      const content = await page.evaluate(() => {
        // 尝试不同的内容选择器
        const selectors = [
          'main',
          '.main-content',
          '.content',
          '.article',
          'article',
          '.post',
          '.page-content',
          'body'
        ];
        
        for (const selector of selectors) {
          const element = document.querySelector(selector);
          if (element) {
            // 移除脚本和样式
            element.querySelectorAll('script, style, noscript, iframe').forEach(el => el.remove());
            return element.textContent || '';
          }
        }
        
        // 如果没有找到合适的内容，使用整个body
        document.querySelectorAll('script, style, noscript, iframe').forEach(el => el.remove());
        return document.body.textContent || '';
      });
      
      return content.trim().replace(/\s+/g, ' ');
    }
  }

  /**
   * 提取特定元素
   * @param url 网页URL
   * @param selector CSS选择器
   * @param options 处理选项
   * @returns 提取的元素内容
   */
  async extractElement(url: string, selector: string, options: JSHeavyProcessingOptions = {}): Promise<string> {
    let page: any | null = null;
    
    try {
      const browser = await this.initBrowser();
      page = await browser.newPage();
      
      await page.goto(url, {
        waitUntil: options.waitUntil || 'networkidle',
        timeout: options.timeout || 60000
      });
      
      if (options.waitForSelector) {
        await page.waitForSelector(options.waitForSelector, {
          timeout: options.timeout || 30000
        });
      }
      
      const content = await page.evaluate((sel: string) => {
        const element = document.querySelector(sel);
        return element ? element.textContent || '' : '';
      }, selector);
      
      return content.trim();
    } catch (error: any) {
      throw new Error(`Failed to extract element: ${error.message}`);
    } finally {
      if (page) {
        await page.close();
      }
    }
  }

  /**
   * 提取链接
   * @param url 网页URL
   * @param options 处理选项
   * @returns 提取的链接列表
   */
  async extractLinks(url: string, options: JSHeavyProcessingOptions = {}): Promise<Array<{ text: string; href: string }>> {
    let page: any | null = null;
    
    try {
      const browser = await this.initBrowser();
      page = await browser.newPage();
      
      await page.goto(url, {
        waitUntil: options.waitUntil || 'networkidle',
        timeout: options.timeout || 60000
      });
      
      if (options.waitForSelector) {
        await page.waitForSelector(options.waitForSelector, {
          timeout: options.timeout || 30000
        });
      }
      
      const links = await page.evaluate(() => {
        const linkList: Array<{ text: string; href: string }> = [];
        document.querySelectorAll('a').forEach(a => {
          const text = a.textContent?.trim() || '';
          const href = a.getAttribute('href') || '';
          if (href) {
            linkList.push({ text, href });
          }
        });
        return linkList;
      });
      
      return links;
    } catch (error: any) {
      throw new Error(`Failed to extract links: ${error.message}`);
    } finally {
      if (page) {
        await page.close();
      }
    }
  }

  /**
   * 批量处理多个JavaScript-heavy网页
   * @param urls URL列表
   * @param options 处理选项
   * @returns 处理结果列表
   */
  async batchProcess(urls: string[], options: JSHeavyProcessingOptions = {}): Promise<Array<{ url: string; result: ExtractionResult }>> {
    const results = await Promise.all(
      urls.map(async url => {
        try {
          const result = await this.processJSHeavyPage(url, options);
          return { url, result };
        } catch (error: any) {
          console.error(`Failed to process ${url}: ${error.message}`);
          return { 
            url, 
            result: {
              content: '',
              title: '',
              metadata: {}
            }
          };
        }
      })
    );
    
    return results;
  }
}


// JavaScript-heavy网页处理选项接口
export interface JSHeavyProcessingOptions {
  waitUntil?: 'load' | 'domcontentloaded' | 'networkidle' | 'commit';
  timeout?: number;
  waitForSelector?: string;
  waitForTimeout?: number;
  scrollToLoad?: boolean;
  scrollTimes?: number;
  scrollDelay?: number;
  selector?: string;
}
