/**
 * 网页内容提取引擎管理器
 * 支持多引擎策略：Lightpanda、Jina.ai、Readability
 */

import { lightpandaClient, LightpandaConfig, FetchOptions, FetchResult } from './lightpanda-client';
import { logger } from './logger';

logger.setPrefix('[ExtractionEngineManager]');

export type ExtractionEngine = 'auto' | 'lightpanda' | 'jina' | 'readability' | 'direct' | 'browser-extension';

export interface EngineStats {
  engine: ExtractionEngine;
  totalRequests: number;
  successfulRequests: number;
  failedRequests: number;
  averageResponseTime: number;
  lastUsed: Date;
}

export interface ExtractionOptions extends FetchOptions {
  engine?: ExtractionEngine;
  fallback?: boolean;
  includeCookies?: boolean;
}

export interface ExtractionResult {
  success: boolean;
  content: string;
  title?: string;
  url: string;
  engine: ExtractionEngine;
  mode?: string;
  error?: string;
  metadata?: {
    contentType?: string;
    statusCode?: number;
    loadTime?: number;
    compressionRatio?: number;
    iframeCount?: number;
    formCount?: number;
    shadowCount?: number;
    standaloneFieldCount?: number;
    isLoginPage?: boolean;
    spaFrameworks?: string[];
    originalEngine?: string;
    originalError?: string;
  };
}

export interface EngineManagerConfig {
  priority: ExtractionEngine[];
  fallbackEnabled: boolean;
  timeout: number;
  lightpanda?: LightpandaConfig;
}

const DEFAULT_CONFIG: EngineManagerConfig = {
  priority: ['lightpanda', 'jina', 'direct'],
  fallbackEnabled: true,
  timeout: 30000,
};

export class ExtractionEngineManager {
  private config: EngineManagerConfig;
  private stats: Map<ExtractionEngine, EngineStats> = new Map();
  private lightpandaConfig: LightpandaConfig | undefined;

  constructor(config: Partial<EngineManagerConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.lightpandaConfig = config.lightpanda;
    this.initializeStats();
  }

  /**
   * 提取网页内容
   */
  async extract(options: ExtractionOptions): Promise<ExtractionResult> {
    const engine = options.engine || 'auto';
    const startTime = Date.now();

    if (engine === 'auto') {
      return this.extractWithAutoEngine(options, startTime);
    }

    return this.extractWithSpecificEngine(engine, options, startTime);
  }

  private getAutoEngineCandidates(): ExtractionEngine[] {
    const isBrowserRuntime = typeof window !== 'undefined' && typeof chrome !== 'undefined';

    return this.config.priority.filter((engine) => {
      if (engine === 'browser-extension' || engine === 'readability') {
        return isBrowserRuntime;
      }
      return true;
    });
  }

  /**
   * 自动选择引擎提取
   */
  private async extractWithAutoEngine(
    options: ExtractionOptions,
    startTime: number
  ): Promise<ExtractionResult> {
    const engines = this.getAutoEngineCandidates();
    const errors: string[] = [];

    for (const engine of engines) {
      try {
        const result = await this.tryExtractWithEngine(engine, options, startTime);
        if (result.success) {
          logger.info(`Auto-selected engine: ${engine}`);
          return result;
        }
        errors.push(`${engine}: ${result.error}`);
      } catch (error) {
        errors.push(`${engine}: ${error}`);
      }

      if (!this.config.fallbackEnabled) {
        break;
      }
    }

    return {
      success: false,
      content: '',
      url: options.url,
      engine: 'auto',
      error: `All engines failed: ${errors.join('; ')}`,
    };
  }

  /**
   * 使用指定引擎提取
   */
  private async extractWithSpecificEngine(
    engine: ExtractionEngine,
    options: ExtractionOptions,
    startTime: number
  ): Promise<ExtractionResult> {
    try {
      const result = await this.tryExtractWithEngine(engine, options, startTime);
      
      if (!result.success && options.fallback !== false && this.config.fallbackEnabled) {
        // 尝试其他引擎作为后备
        const fallbackEngines = this.config.priority.filter(e => e !== engine);
        for (const fallbackEngine of fallbackEngines) {
          try {
            const fallbackResult = await this.tryExtractWithEngine(
              fallbackEngine,
              options,
              startTime
            );
            if (fallbackResult.success) {
              logger.info(`Fallback to engine: ${fallbackEngine}`);
              return {
                ...fallbackResult,
                metadata: {
                  ...fallbackResult.metadata,
                  originalEngine: engine,
                  originalError: result.error,
                } as any,
              };
            }
          } catch {
            // 继续尝试下一个后备引擎
          }
        }
      }

      return result;
    } catch (error) {
      return {
        success: false,
        content: '',
        url: options.url,
        engine,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  /**
   * 尝试使用指定引擎提取
   */
  private async tryExtractWithEngine(
    engine: ExtractionEngine,
    options: ExtractionOptions,
    startTime: number
  ): Promise<ExtractionResult> {
    switch (engine) {
      case 'browser-extension':
        return this.extractWithBrowserExtension(options, startTime);
      case 'lightpanda':
        return this.extractWithLightpanda(options, startTime);
      case 'jina':
        return this.extractWithJina(options, startTime);
      case 'direct':
        return this.extractWithDirect(options, startTime);
      case 'readability':
        return this.extractWithReadability(options, startTime);
      default:
        throw new Error(`Unknown engine: ${engine}`);
    }
  }

  /**
   * 使用浏览器扩展提取
   * 注意：此引擎只在浏览器环境中可用，服务器端会返回不可用
   */
  private async extractWithBrowserExtension(
    options: ExtractionOptions,
    startTime: number
  ): Promise<ExtractionResult> {
    // 浏览器扩展引擎只在客户端可用
    if (typeof window === 'undefined' || typeof chrome === 'undefined') {
      return {
        success: false,
        content: '',
        url: options.url,
        engine: 'browser-extension',
        error: 'Browser extension engine is only available in browser environment',
      };
    }

    try {
      // 动态导入扩展连接器（避免服务器端打包问题）
      const { extractWithBrowserState } = await import('./extension-connector-client');
      
      const result = await extractWithBrowserState({
        url: options.url,
        maxChars: 120_000,
        includeCookies: options.includeCookies || false,
        timeout: options.timeout || this.config.timeout,
      });

      this.updateStats('browser-extension', result.success, Date.now() - startTime);

      return {
        success: result.success,
        content: result.content,
        title: result.title,
        url: result.url,
        engine: 'browser-extension',
        metadata: {
          loadTime: Date.now() - startTime,
          isLoginPage: !result.loginState?.isLoggedIn,
        },
      };
    } catch (error) {
      this.updateStats('browser-extension', false, Date.now() - startTime);
      return {
        success: false,
        content: '',
        url: options.url,
        engine: 'browser-extension',
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  /**
   * 使用 Lightpanda 提取
   */
  private async extractWithLightpanda(
    options: ExtractionOptions,
    startTime: number
  ): Promise<ExtractionResult> {
    if (this.lightpandaConfig) {
      lightpandaClient.updateConfig(this.lightpandaConfig);
    }

    const isAvailable = await lightpandaClient.isAvailable();
    if (!isAvailable) {
      throw new Error('Lightpanda is not available');
    }

    const result = await lightpandaClient.fetch({
      url: options.url,
      headers: options.headers,
      cookies: options.cookies,
      waitForSelector: options.waitForSelector,
      waitForNetworkIdle: options.waitForNetworkIdle,
      scrollToBottom: options.scrollToBottom,
      timeout: options.timeout || this.config.timeout,
    });

    this.updateStats('lightpanda', result.success, Date.now() - startTime);

    return {
      success: result.success,
      content: result.content,
      title: result.title,
      url: result.url,
      engine: 'lightpanda',
      mode: result.mode,
      error: result.error,
      metadata: result.metadata,
    };
  }

  /**
   * 使用 Jina.ai 提取
   */
  private async extractWithJina(
    options: ExtractionOptions,
    startTime: number
  ): Promise<ExtractionResult> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), options.timeout || this.config.timeout);

    try {
      // Jina.ai API 格式: https://r.jina.ai/http://URL 或 https://r.jina.ai/https://URL
      const jinaUrl = `https://r.jina.ai/http://${options.url.replace(/^https?:\/\//, '')}`;
      const response = await fetch(jinaUrl, {
        headers: {
          'Accept': 'text/plain, application/json;q=0.9, text/markdown;q=0.8',
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36',
          'Accept-Language': 'en-US,en;q=0.9',
          ...options.headers,
        },
        signal: controller.signal,
      });

      if (!response.ok) {
        throw new Error(`Jina.ai returned ${response.status}`);
      }

      const contentType = response.headers.get('content-type') || '';
      let content = '';
      let title: string | undefined;

      if (contentType.includes('application/json')) {
        const data = await response.json();
        content = data.data?.content || data.content || '';
        title = data.data?.title || data.title;
      } else {
        content = await response.text();
      }

      const success = !!content;

      this.updateStats('jina', success, Date.now() - startTime);

      return {
        success: !!content,
        content,
        title,
        url: options.url,
        engine: 'jina',
        metadata: {
          loadTime: Date.now() - startTime,
          contentType,
        },
      };
    } catch (error) {
      this.updateStats('jina', false, Date.now() - startTime);
      return {
        success: false,
        content: '',
        url: options.url,
        engine: 'jina',
        error: error instanceof Error ? error.message : String(error),
      };
    } finally {
      clearTimeout(timeoutId);
    }
  }

  /**
   * 使用直接 HTTP 请求提取（后备方案）
   */
  private async extractWithDirect(
    options: ExtractionOptions,
    startTime: number
  ): Promise<ExtractionResult> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), options.timeout || this.config.timeout);

    try {
      const response = await fetch(options.url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
          'Accept-Language': 'en-US,en;q=0.9',
          'Cache-Control': 'no-cache',
          'Pragma': 'no-cache',
          'Upgrade-Insecure-Requests': '1',
          ...options.headers,
        },
        redirect: 'follow',
        signal: controller.signal,
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const html = await response.text();

      // 简单的 HTML 到文本转换
      let text = html
        .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, ' ')
        .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, ' ')
        .replace(/<nav\b[^>]*>[\s\S]*?<\/nav>/gi, ' ')
        .replace(/<header\b[^>]*>[\s\S]*?<\/header>/gi, ' ')
        .replace(/<footer\b[^>]*>[\s\S]*?<\/footer>/gi, ' ')
        .replace(/<aside\b[^>]*>[\s\S]*?<\/aside>/gi, ' ')
        .replace(/<[^>]+>/g, ' ')
        .replace(/&nbsp;/g, ' ')
        .replace(/&amp;/g, '&')
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/&quot;/g, '"')
        .replace(/&#39;/g, "'")
        .replace(/\s+/g, ' ')
        .trim();

      // 提取标题
      const titleMatch = html.match(/<title[^>]*>([^<]*)<\/title>/i);
      const title = titleMatch ? titleMatch[1].trim() : undefined;

      // 检测 iframe
      const iframeMatches = html.match(/<iframe[^>]*>/gi);
      const iframeCount = iframeMatches ? iframeMatches.length : 0;
      
      // 检测表单
      const formMatches = html.match(/<form[^>]*>/gi);
      const formCount = formMatches ? formMatches.length : 0;
      
      // 提取 iframe src
      const iframeSrcs: string[] = [];
      if (iframeMatches) {
        iframeMatches.forEach((match, index) => {
          const srcMatch = match.match(/src=["']([^"']+)["']/);
          if (srcMatch) {
            iframeSrcs.push(`[iframe ${index}] ${srcMatch[1]}`);
          }
        });
      }
      
      // 如果有 iframe，添加提示
      if (iframeCount > 0) {
        text += `\n\n=== 检测到 ${iframeCount} 个 iframe ===\n`;
        text += '注意：iframe 内容需要 JavaScript 执行才能提取\n';
        text += '建议使用 Lightpanda 引擎：?engine=lightpanda\n';
        if (iframeSrcs.length > 0) {
          text += '\niframe 源地址:\n' + iframeSrcs.join('\n');
        }
      }
      
      // 如果有表单，添加表单信息
      if (formCount > 0) {
        text += `\n\n=== 检测到 ${formCount} 个表单 ===\n`;
        
        // 提取表单字段
        const formRegex = /<form[^>]*>[\s\S]*?<\/form>/gi;
        let formMatch;
        let formIndex = 0;
        
        while ((formMatch = formRegex.exec(html)) !== null && formIndex < formCount) {
          const formHtml = formMatch[0];
          
          // 提取 input 字段
          const inputRegex = /<input[^>]*>/gi;
          let inputMatch;
          const fields: string[] = [];
          
          while ((inputMatch = inputRegex.exec(formHtml)) !== null) {
            const inputTag = inputMatch[0];
            const nameMatch = inputTag.match(/name=["']([^"']+)["']/);
            const typeMatch = inputTag.match(/type=["']([^"']+)["']/);
            const placeholderMatch = inputTag.match(/placeholder=["']([^"']+)["']/);
            
            const fieldInfo = [
              nameMatch ? nameMatch[1] : 'unnamed',
              typeMatch ? `(${typeMatch[1]})` : '(text)',
              placeholderMatch ? `[${placeholderMatch[1]}]` : '',
            ].join(' ');
            
            fields.push(fieldInfo);
          }
          
          if (fields.length > 0) {
            text += `\n[表单 ${formIndex}]\n`;
            text += fields.map(f => `  - ${f}`).join('\n') + '\n';
          }
          
          formIndex++;
        }
      }

      const success = text.length > 0;
      this.updateStats('direct', success, Date.now() - startTime);

      return {
        success,
        content: text,
        title,
        url: options.url,
        engine: 'direct',
        metadata: {
          loadTime: Date.now() - startTime,
          contentType: response.headers.get('content-type') || undefined,
          statusCode: response.status,
          iframeCount,
          formCount,
        },
      };
    } catch (error) {
      this.updateStats('direct', false, Date.now() - startTime);
      return {
        success: false,
        content: '',
        url: options.url,
        engine: 'direct',
        error: error instanceof Error ? error.message : String(error),
      };
    } finally {
      clearTimeout(timeoutId);
    }
  }

  /**
   * 使用 Readability 提取（浏览器扩展模式）
   */
  private async extractWithReadability(
    options: ExtractionOptions,
    startTime: number
  ): Promise<ExtractionResult> {
    // 这个引擎只在浏览器扩展内容脚本中使用
    // 在服务器端返回不可用
    return {
      success: false,
      content: '',
      url: options.url,
      engine: 'readability',
      error: 'Readability engine is only available in browser extension',
    };
  }

  /**
   * 检测引擎可用性
   */
  async checkEngineAvailability(engine: ExtractionEngine): Promise<boolean> {
    switch (engine) {
      case 'browser-extension':
        // 浏览器扩展引擎只在浏览器环境中可用
        if (typeof window === 'undefined' || typeof chrome === 'undefined') {
          return false;
        }
        try {
          const { isExtensionAvailable } = await import('./extension-connector-client');
          return await isExtensionAvailable();
        } catch {
          return false;
        }
      case 'lightpanda':
        return lightpandaClient.isAvailable();
      case 'jina':
        try {
          const response = await fetch('https://r.jina.ai/http://example.com', {
            method: 'HEAD',
          });
          return response.ok;
        } catch {
          return false;
        }
      case 'direct':
        // 直接 HTTP 请求总是可用（只要有网络）
        return true;
      case 'readability':
        // Readability 只在浏览器环境中可用
        return typeof window !== 'undefined';
      case 'auto':
        return true;
      default:
        return false;
    }
  }

  /**
   * 获取引擎统计信息
   */
  getStats(engine?: ExtractionEngine): EngineStats | Map<ExtractionEngine, EngineStats> {
    if (engine) {
      return this.stats.get(engine) || this.createEmptyStats(engine);
    }
    return new Map(this.stats);
  }

  /**
   * 重置统计信息
   */
  resetStats(engine?: ExtractionEngine): void {
    if (engine) {
      this.stats.set(engine, this.createEmptyStats(engine));
    } else {
      this.initializeStats();
    }
  }

  /**
   * 更新配置
   */
  updateConfig(config: Partial<EngineManagerConfig>): void {
    this.config = { ...this.config, ...config };
    if (config.lightpanda) {
      this.lightpandaConfig = config.lightpanda;
    }
  }

  /**
   * 获取当前配置
   */
  getConfig(): EngineManagerConfig {
    return { ...this.config };
  }

  // ==================== 私有方法 ====================

  private initializeStats(): void {
    const engines: ExtractionEngine[] = ['browser-extension', 'lightpanda', 'jina', 'direct', 'readability', 'auto'];
    for (const engine of engines) {
      this.stats.set(engine, this.createEmptyStats(engine));
    }
  }

  private createEmptyStats(engine: ExtractionEngine): EngineStats {
    return {
      engine,
      totalRequests: 0,
      successfulRequests: 0,
      failedRequests: 0,
      averageResponseTime: 0,
      lastUsed: new Date(0),
    };
  }

  private updateStats(engine: ExtractionEngine, success: boolean, responseTime: number): void {
    const stats = this.stats.get(engine);
    if (!stats) return;

    stats.totalRequests++;
    if (success) {
      stats.successfulRequests++;
    } else {
      stats.failedRequests++;
    }

    // 更新平均响应时间
    stats.averageResponseTime =
      (stats.averageResponseTime * (stats.totalRequests - 1) + responseTime) /
      stats.totalRequests;

    stats.lastUsed = new Date();
  }
}

// 导出单例实例
export const engineManager = new ExtractionEngineManager();
