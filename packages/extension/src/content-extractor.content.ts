// 内容提取器 - 使用MutationObserver和轮询

/**
 * 提取结果接口
 */
export interface ExtractResult {
  content: string;
  title: string;
  url: string;
  metadata: {
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
  };
  stats: {
    originalLength: number;
    extractedLength: number;
    paragraphCount: number;
    imageCount: number;
    linkCount: number;
    codeBlockCount: number;
    tableCount: number;
    processingTime: number;
  };
  success: boolean;
  error?: string;
}

/**
 * 内容提取器类
 */
class ContentExtractor {
  /**
   * 提取页面内容
   */
  async extractPage(): Promise<{ code: number; data: ExtractResult }> {
    const startTime = performance.now();
    
    try {
      // 等待页面完全加载
      await this.waitForPageLoad();
      
      // 使用MutationObserver监控页面变化
      await this.waitForDynamicContent();
      
      // 提取内容
      const result = this.extractContent();
      const processingTime = performance.now() - startTime;
      
      return {
        code: 0,
        data: {
          ...result,
          stats: {
            ...result.stats,
            processingTime: Math.round(processingTime),
          },
          success: true,
        },
      };
    } catch (error) {
      return {
        code: 1,
        data: {
          content: '',
          title: document.title,
          url: window.location.href,
          metadata: {
            title: document.title,
            description: '',
            keywords: '',
            author: '',
            publishedTime: '',
            modifiedTime: '',
            siteName: '',
            favicon: '',
            coverImage: '',
            type: 'article',
            language: document.documentElement.lang || 'zh-CN',
          },
          stats: {
            originalLength: 0,
            extractedLength: 0,
            paragraphCount: 0,
            imageCount: 0,
            linkCount: 0,
            codeBlockCount: 0,
            tableCount: 0,
            processingTime: 0,
          },
          success: false,
          error: error instanceof Error ? error.message : String(error),
        },
      };
    }
  }

  /**
   * 等待页面完全加载
   */
  private waitForPageLoad(): Promise<void> {
    return new Promise((resolve) => {
      if (document.readyState === 'complete') {
        resolve();
      } else {
        window.addEventListener('load', () => resolve());
      }
    });
  }

  /**
   * 使用MutationObserver等待动态内容加载
   */
  private waitForDynamicContent(): Promise<void> {
    return new Promise((resolve) => {
      let mutations = 0;
      let lastMutationTime = Date.now();
      const maxMutations = 1000;
      const idleTime = 3000; // 3秒无变化视为加载完成
      
      const observer = new MutationObserver((mutationList) => {
        mutations += mutationList.length;
        lastMutationTime = Date.now();
        
        // 防止无限等待
        if (mutations > maxMutations) {
          observer.disconnect();
          resolve();
        }
      });
      
      observer.observe(document.body, {
        childList: true,
        subtree: true,
        attributes: true,
        characterData: true,
      });
      
      // 轮询检查是否 idle
      const checkIdle = setInterval(() => {
        if (Date.now() - lastMutationTime > idleTime) {
          observer.disconnect();
          clearInterval(checkIdle);
          resolve();
        }
      }, 500);
      
      // 最大等待时间
      setTimeout(() => {
        observer.disconnect();
        clearInterval(checkIdle);
        resolve();
      }, 30000); // 30秒超时
    });
  }

  /**
   * 提取页面内容
   */
  private extractContent(): Omit<ExtractResult, 'success' | 'error'> {
    const title = document.title;
    const url = window.location.href;
    
    // 提取正文内容
    const content = this.extractMainContent();
    
    // 提取元数据
    const metadata = this.extractMetadata();
    
    // 计算统计信息
    const stats = this.calculateStats(content);
    
    return {
      content,
      title,
      url,
      metadata,
      stats,
    };
  }

  /**
   * 提取主要内容
   */
  private extractMainContent(): string {
    // 尝试不同的内容提取策略
    const strategies = [
      () => this.extractFromSemanticElements(),
      () => this.extractFromCommonClasses(),
      () => this.extractFromBody(),
    ];
    
    for (const strategy of strategies) {
      const content = strategy();
      if (content && content.length > 100) {
        return content;
      }
    }
    
    return '';
  }

  /**
   * 从语义化元素提取
   */
  private extractFromSemanticElements(): string {
    const selectors = 'article, main, [role="main"], .article, .content, .main-content';
    const elements = document.querySelectorAll(selectors);
    
    for (let i = 0; i < elements.length; i++) {
      const element = elements[i];
      if (element.textContent && element.textContent.length > 100) {
        return this.cleanContent(element.textContent);
      }
    }
    
    return '';
  }

  /**
   * 从常见类名提取
   */
  private extractFromCommonClasses(): string {
    const commonClasses = [
      '.article-content', '.post-content', '.entry-content',
      '.content-body', '.main-content', '.article-body',
      '.content-main', '.article-text', '.post-body'
    ];
    
    for (const selector of commonClasses) {
      const element = document.querySelector(selector);
      if (element && element.textContent && element.textContent.length > 100) {
        return this.cleanContent(element.textContent);
      }
    }
    
    return '';
  }

  /**
   * 从body提取（最后手段）
   */
  private extractFromBody(): string {
    // 移除脚本和样式
    const bodyClone = document.body.cloneNode(true) as HTMLElement;
    const elementsToRemove = bodyClone.querySelectorAll('script, style, noscript, iframe, nav, header, footer, aside');
    
    for (let i = 0; i < elementsToRemove.length; i++) {
      elementsToRemove[i].remove();
    }
    
    const content = bodyClone.textContent || '';
    return this.cleanContent(content);
  }

  /**
   * 清理内容
   */
  private cleanContent(content: string): string {
    return content
      .replace(/\s+/g, ' ') // 替换多个空白为单个空格
      .replace(/^\s+|\s+$/g, '') // 去除首尾空白
      .trim();
  }

  /**
   * 提取元数据
   */
  private extractMetadata(): ExtractResult['metadata'] {
    const getMeta = (name: string) => {
      const meta = document.querySelector(`meta[name="${name}"]`) || 
                  document.querySelector(`meta[property="og:${name}"]`);
      return meta ? (meta as HTMLMetaElement).content : '';
    };
    
    return {
      title: document.title,
      description: getMeta('description'),
      keywords: getMeta('keywords'),
      author: getMeta('author'),
      publishedTime: getMeta('datePublished') || getMeta('published_time'),
      modifiedTime: getMeta('dateModified') || getMeta('modified_time'),
      siteName: getMeta('site_name') || getMeta('siteName'),
      favicon: this.getFavicon(),
      coverImage: getMeta('image') || getMeta('thumbnail'),
      type: getMeta('type') || 'article',
      language: document.documentElement.lang || 'zh-CN',
    };
  }

  /**
   * 获取favicon
   */
  private getFavicon(): string {
    const favicon = document.querySelector('link[rel*="icon"]');
    if (favicon) {
      const href = (favicon as HTMLLinkElement).href;
      if (href) return href;
    }
    
    // 尝试默认位置
    return `${window.location.origin}/favicon.ico`;
  }

  /**
   * 计算统计信息
   */
  private calculateStats(content: string): ExtractResult['stats'] {
    const paragraphs = content.split(/\n\s*\n/).filter(p => p.trim().length > 0);
    const images = document.querySelectorAll('img').length;
    const links = document.querySelectorAll('a').length;
    const codeBlocks = document.querySelectorAll('code, pre').length;
    const tables = document.querySelectorAll('table').length;
    
    return {
      originalLength: document.body.textContent?.length || 0,
      extractedLength: content.length,
      paragraphCount: paragraphs.length,
      imageCount: images,
      linkCount: links,
      codeBlockCount: codeBlocks,
      tableCount: tables,
      processingTime: 0, // 会在extractPage中设置
    };
  }
}

// 创建提取器实例
const extractor = new ContentExtractor();

// 监听消息
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'extractPage') {
    extractor.extractPage().then(sendResponse).catch((error) => {
      sendResponse({ code: 1, error: error.message });
    });
    return true; // 保持连接以异步响应
  }
});

