import { WebContentExtractionService } from './web-content-extraction-service';
import { ExtractionResult, ExtractionOptions } from './web-content-extraction-service';
import { circuitBreakerService } from './circuit-breaker-service';
import { logger } from '../utils/logger';
import { linkMindService } from './linkmind-service';

// Conditionally import JSHeavyWebProcessingService only in Node.js environment
let JSHeavyWebProcessingService: any;
let jsHeavyWebProcessingService: any;

if (typeof window === 'undefined') {
  const { JSHeavyWebProcessingService: Service } = require('./js-heavy-web-processing-service');
  JSHeavyWebProcessingService = Service;
  jsHeavyWebProcessingService = new Service();
}

export class MultiEngineSchedulerService {
  private engines: Map<string, WebEngine> = new Map();
  private engineHealth: Map<string, EngineHealth> = new Map();
  private siteRegistry: Map<string, string> = new Map();
  private webContentExtractionService: WebContentExtractionService;

  constructor() {
    this.webContentExtractionService = new WebContentExtractionService();
    this.initializeEngines();
    this.initializeSiteRegistry();
    this.initializeCircuitBreakers();
  }

  /**
   * 初始化断路器
   */
  private initializeCircuitBreakers(): void {
    // 为每个引擎注册断路器
    this.engines.forEach((_, engineName) => {
      circuitBreakerService.registerEngine(engineName, {
        failureThreshold: 3,
        resetTimeout: 30000,
        maxRequests: 50,
        windowSize: 60000,
        timeout: 60000,
        retryCount: 3,
        retryDelay: 1000
      });
    });
    logger.info('Circuit breakers initialized for all engines');
  }

  /**
   * 初始化引擎
   */
  private initializeEngines(): void {
    // 注册内置引擎
    this.engines.set('http', {
      name: 'HTTP',
      type: 'basic',
      priority: 1,
      handler: this.handleHttp.bind(this)
    });
    this.engines.set('linkmind', {
      name: 'LinkMind',
      type: 'advanced',
      priority: 2,
      handler: this.handleLinkMind.bind(this)
    });

    // Only register advanced engines if JSHeavyWebProcessingService is available (Node.js environment)
    if (jsHeavyWebProcessingService) {
      this.engines.set('cdp', {
        name: 'CDP',
        type: 'advanced',
        priority: 3,
        handler: this.handleCDP.bind(this)
      });

      this.engines.set('dynamic', {
        name: 'Dynamic',
        type: 'advanced',
        priority: 4,
        handler: this.handleDynamic.bind(this)
      });

      this.engines.set('stealth', {
        name: 'Stealth',
        type: 'advanced',
        priority: 5,
        handler: this.handleStealth.bind(this)
      });

      this.engines.set('clibrowser', {
        name: 'CLIBrowser',
        type: 'advanced',
        priority: 6,
        handler: this.handleCLIBrowser.bind(this)
      });
    }

    // 初始化引擎健康状态
    this.engines.forEach((engine, key) => {
      this.engineHealth.set(key, {
        status: 'healthy',
        lastCheck: new Date(),
        errorCount: 0,
        successCount: 0
      });
    });
  }

  /**
   * 初始化站点注册表
   */
  private initializeSiteRegistry(): void {
    // 内置站点注册表 - 按类别分组
    const sites: Record<string, string> = {
      // 社交媒体（需要反爬虫保护）
      'github.com': 'dynamic',
      'twitter.com': 'stealth',
      'facebook.com': 'stealth',
      'instagram.com': 'stealth',
      'linkedin.com': 'stealth',
      'pinterest.com': 'stealth',
      'reddit.com': 'dynamic',
      'tumblr.com': 'dynamic',
      'weibo.com': 'dynamic',
      'tiktok.com': 'stealth',

      // 搜索引擎（简单HTTP即可）
      'google.com': 'http',
      'bing.com': 'http',
      'yahoo.com': 'http',
      'baidu.com': 'http',
      'sogou.com': 'http',
      'so.com': 'http',

      // 新闻网站
      'sina.com.cn': 'http',
      '163.com': 'http',
      'qq.com': 'http',
      'people.com.cn': 'http',
      'xinhuanet.com': 'http',
      'theguardian.com': 'http',
      'nytimes.com': 'dynamic',
      'washingtonpost.com': 'dynamic',
      'bloomberg.com': 'dynamic',

      // 电商网站（需要JavaScript执行）
      'taobao.com': 'dynamic',
      'jd.com': 'dynamic',
      'amazon.com': 'dynamic',
      'ebay.com': 'dynamic',
      'aliexpress.com': 'dynamic',
      'shopee.com': 'dynamic',
      'lazada.com': 'dynamic',

      // 视频网站
      'youtube.com': 'dynamic',
      'netflix.com': 'stealth',
      'spotify.com': 'stealth',
      'youku.com': 'dynamic',
      'tudou.com': 'dynamic',
      'bilibili.com': 'dynamic',

      // 开发者社区
      'stackoverflow.com': 'http',
      'quora.com': 'dynamic',
      'medium.com': 'dynamic',
      'dev.to': 'http',
      'hashnode.com': 'http',
      'producthunt.com': 'dynamic',
      'hackernews.com': 'http',

      // 代码托管
      'github.io': 'http',
      'gitlab.com': 'dynamic',
      'bitbucket.org': 'dynamic',

      // 包管理器
      'docker.com': 'http',
      'npmjs.com': 'http',
      'pypi.org': 'http',
      'maven.org': 'http',
      'crates.io': 'http',
      'nuget.org': 'http',
      'packagist.org': 'http',
      'rubygems.org': 'http',
      'yarnpkg.com': 'http',
      'pnpm.io': 'http',
      'deno.land': 'http',

      // 编程语言官方文档
      'golang.org': 'http',
      'rust-lang.org': 'http',
      'python.org': 'http',
      'nodejs.org': 'http',
      'reactjs.org': 'http',
      'vuejs.org': 'http',
      'angular.io': 'http',
      'svelte.dev': 'http',

      // 前端框架和库
      'tailwindcss.com': 'http',
      'bootstrap.com': 'http',
      'jquery.com': 'http',
      'lodash.com': 'http',
      'axios-http.com': 'http',
      'momentjs.com': 'http',
      'date-fns.org': 'http',

      // 数据可视化
      'chartjs.org': 'http',
      'threejs.org': 'http',
      'd3js.org': 'http',
      'plotly.com': 'http',
      'bokeh.org': 'http',
      'dash.plotly.com': 'http',

      // AI/ML框架
      'tensorflow.org': 'http',
      'pytorch.org': 'http',
      'keras.io': 'http',
      'scikit-learn.org': 'http',
      'pandas.pydata.org': 'http',
      'numpy.org': 'http',
      'matplotlib.org': 'http',
      'seaborn.pydata.org': 'http',

      // AI应用平台
      'streamlit.io': 'http',
      'gradio.app': 'http',
      'huggingface.co': 'dynamic',
      'openai.com': 'dynamic',
      'anthropic.com': 'dynamic',
      'google.com/ai': 'dynamic',
      'microsoft.com/ai': 'dynamic',
      'amazon.com/ai': 'dynamic',
      'meta.com/ai': 'dynamic',
    };

    Object.entries(sites).forEach(([domain, engine]) => {
      this.siteRegistry.set(domain, engine);
    });
  }

  /**
   * 调度引擎处理请求
   * @param url 目标URL
   * @param options 提取选项
   * @returns 提取结果
   */
  async schedule(url: string, options: ExtractionOptions = {}): Promise<ExtractionResult> {
    const trace: ExtractionResult['trace'] = []
    // 选择最优引擎
    const engineName = this.selectEngine(url);
    const engine = this.engines.get(engineName);

    if (!engine) {
      throw new Error(`No engine found for URL: ${url}`);
    }

    // 尝试使用选定的引擎
    try {
      const startedAt = Date.now()
      const result = await circuitBreakerService.execute(engineName, () => engine.handler(url, options));
      this.updateEngineHealth(engineName, true);
      trace.push({
        engine: engineName,
        status: 'success',
        durationMs: Date.now() - startedAt,
      })
      return this.mergeTrace(result, trace, engineName);
    } catch (error) {
      this.updateEngineHealth(engineName, false);
      trace.push({
        engine: engineName,
        status: 'failed',
        reason: error instanceof Error ? error.message : String(error),
      })
      
      // 智能降级
      return await this.fallbackEngines(url, options, engineName, trace);
    }
  }

  /**
   * 选择最优引擎
   * @param url 目标URL
   * @returns 引擎名称
   */
  private selectEngine(url: string): string {
    // 从站点注册表中查找
    const domain = this.getDomain(url);
    if (this.siteRegistry.has(domain)) {
      const engineName = this.siteRegistry.get(domain)!;
      // 检查引擎是否健康
      const health = this.engineHealth.get(engineName);
      if (health && health.status === 'healthy') {
        return engineName;
      }
    }

    // 检查所有引擎的健康状态
    const healthyEngines = Array.from(this.engines.entries())
      .filter(([name]) => {
        const health = this.engineHealth.get(name);
        return health && health.status === 'healthy';
      })
      .sort(([, a], [, b]) => a.priority - b.priority);

    // 根据URL特征选择引擎
    if (url.includes('twitter.com') || url.includes('facebook.com') || url.includes('instagram.com')) {
      const stealthEngine = healthyEngines.find(([name]) => name === 'stealth');
      if (stealthEngine) return stealthEngine[0];
    } else if (url.includes('github.com') || url.includes('youtube.com')) {
      const dynamicEngine = healthyEngines.find(([name]) => name === 'dynamic');
      if (dynamicEngine) return dynamicEngine[0];
    }

    // 返回第一个健康的引擎
    if (healthyEngines.length > 0) {
      return healthyEngines[0][0];
    }

    // 回退到HTTP引擎
    return 'http';
  }

  /**
   * 获取URL的域名
   * @param url URL
   * @returns 域名
   */
  private getDomain(url: string): string {
    try {
      const urlObj = new URL(url);
      return urlObj.hostname;
    } catch {
      return '';
    }
  }

  /**
   * 降级到其他引擎
   * @param url 目标URL
   * @param options 提取选项
   * @param failedEngine 失败的引擎
   * @returns 提取结果
   */
  private async fallbackEngines(
    url: string,
    options: ExtractionOptions,
    failedEngine: string,
    trace: ExtractionResult['trace'] = []
  ): Promise<ExtractionResult> {
    // 5层智能降级策略: SiteAdapter → HTTP → CDP → Dynamic → Stealth → CLIBrowser
    const fallbackOrder = ['linkmind', 'http', 'cdp', 'dynamic', 'stealth', 'clibrowser'];
    
    // 过滤掉已经失败的引擎和不可用的引擎
    const availableEngines = fallbackOrder.filter(engineName => {
      return engineName !== failedEngine && this.engines.has(engineName);
    });

    // 尝试其他引擎
    for (const engineName of availableEngines) {
      const engine = this.engines.get(engineName);
      if (!engine) continue;

      // 检查引擎健康状态
      const health = this.engineHealth.get(engineName);
      if (health && health.status === 'unhealthy') {
        trace.push({
          engine: engineName,
          status: 'skipped',
          reason: 'engine unhealthy',
        })
        continue; // 跳过不健康的引擎
      }

      try {
        const startedAt = Date.now()
        const result = await circuitBreakerService.execute(engineName, () => engine.handler(url, options));
        this.updateEngineHealth(engineName, true);
        trace.push({
          engine: engineName,
          status: 'success',
          durationMs: Date.now() - startedAt,
        })
        return this.mergeTrace(result, trace, engineName);
      } catch (error) {
        this.updateEngineHealth(engineName, false);
        trace.push({
          engine: engineName,
          status: 'failed',
          reason: error instanceof Error ? error.message : String(error),
        })
        continue;
      }
    }

    throw new Error('All engines failed to process the request');
  }

  /**
   * HTTP引擎处理
   * @param url 目标URL
   * @param options 提取选项
   * @returns 提取结果
   */
  private async handleHttp(url: string, options: ExtractionOptions): Promise<ExtractionResult> {
    return this.webContentExtractionService.extractFromUrl(url, options);
  }

  private async handleLinkMind(url: string, options: ExtractionOptions): Promise<ExtractionResult> {
    const response = await linkMindService.extractDocument({
      url,
      extractText: true,
      extractTables: false,
      extractImages: false,
    });
    if (!response.success || !response.text) {
      throw new Error(response.error || 'LinkMind extraction failed');
    }
    return {
      content: response.text,
      title: url,
      metadata: { source: 'linkmind' },
      engine: 'linkmind',
      sourceEngine: 'linkmind',
      confidence: response.text.trim().length > 0 ? 0.9 : 0.2,
      trace: [{ engine: 'linkmind', status: 'success' }],
      fallbackTrace: [],
    };
  }

  private mergeTrace(
    result: ExtractionResult,
    trace: ExtractionResult['trace'],
    engineName: string
  ): ExtractionResult {
    const mergedTrace = [...(trace || []), ...(result.trace || [])]
    const sourceEngine = result.sourceEngine || result.engine || engineName
    const fallbackTrace = mergedTrace
      .filter(item => item.status === 'failed' || item.status === 'skipped')
      .map(item => item.engine)

    return {
      ...result,
      engine: result.engine || sourceEngine,
      sourceEngine,
      confidence: result.confidence ?? this.estimateConfidence(result),
      trace: mergedTrace,
      fallbackTrace,
    }
  }

  private estimateConfidence(result: ExtractionResult): number {
    const textLength = (result.content || '').trim().length
    if (textLength > 1000) return 0.95
    if (textLength > 200) return 0.8
    if (textLength > 0) return 0.6
    return 0.2
  }

  /**
   * CDP引擎处理
   * @param url 目标URL
   * @param options 提取选项
   * @returns 提取结果
   */
  private async handleCDP(url: string, options: ExtractionOptions): Promise<ExtractionResult> {
    if (!jsHeavyWebProcessingService) {
      throw new Error('CDP engine is not available in this environment.');
    }
    return jsHeavyWebProcessingService.processJSHeavyPage(url, {
      waitUntil: 'networkidle',
      timeout: 60000
    });
  }

  /**
   * Dynamic引擎处理
   * @param url 目标URL
   * @param options 提取选项
   * @returns 提取结果
   */
  private async handleDynamic(url: string, options: ExtractionOptions): Promise<ExtractionResult> {
    if (!jsHeavyWebProcessingService) {
      throw new Error('Dynamic engine is not available in this environment.');
    }
    return jsHeavyWebProcessingService.processJSHeavyPage(url, {
      waitUntil: 'networkidle',
      timeout: 60000,
      scrollToLoad: true,
      scrollTimes: 3,
      scrollDelay: 1000
    });
  }

  /**
   * Stealth引擎处理
   * @param url 目标URL
   * @param options 提取选项
   * @returns 提取结果
   */
  private async handleStealth(url: string, options: ExtractionOptions): Promise<ExtractionResult> {
    if (!jsHeavyWebProcessingService) {
      throw new Error('Stealth engine is not available in this environment.');
    }
    return jsHeavyWebProcessingService.processJSHeavyPage(url, {
      waitUntil: 'networkidle',
      timeout: 60000,
      scrollToLoad: true,
      scrollTimes: 5,
      scrollDelay: 1500
    });
  }

  /**
   * CLIBrowser引擎处理
   * @param url 目标URL
   * @param options 提取选项
   * @returns 提取结果
   */
  private async handleCLIBrowser(url: string, options: ExtractionOptions): Promise<ExtractionResult> {
    if (!jsHeavyWebProcessingService) {
      throw new Error('CLIBrowser engine is not available in this environment.');
    }
    // 这里可以集成OpenCLI等命令行浏览器
    // 暂时使用CDP引擎作为替代
    return this.handleCDP(url, options);
  }

  /**
   * 更新引擎健康状态
   * @param engineName 引擎名称
   * @param success 是否成功
   */
  private updateEngineHealth(engineName: string, success: boolean): void {
    const health = this.engineHealth.get(engineName);
    if (health) {
      health.lastCheck = new Date();
      if (success) {
        health.successCount++;
        health.errorCount = 0;
        health.status = 'healthy';
      } else {
        health.errorCount++;
        if (health.errorCount > 3) {
          health.status = 'unhealthy';
        }
      }
    }
  }

  /**
   * 获取引擎健康状态
   * @returns 引擎健康状态
   */
  getEngineHealth(): Map<string, EngineHealth> {
    return this.engineHealth;
  }

  /**
   * 添加自定义引擎
   * @param name 引擎名称
   * @param engine 引擎配置
   */
  addEngine(name: string, engine: WebEngine): void {
    this.engines.set(name, engine);
    this.engineHealth.set(name, {
      status: 'healthy',
      lastCheck: new Date(),
      errorCount: 0,
      successCount: 0
    });
    
    // 注册到断路器服务
    circuitBreakerService.registerEngine(name, {
      failureThreshold: 3,
      resetTimeout: 30000,
      maxRequests: 50,
      windowSize: 60000,
      timeout: 60000,
      retryCount: 3,
      retryDelay: 1000
    });
  }

  /**
   * 移除引擎
   * @param name 引擎名称
   */
  removeEngine(name: string): void {
    this.engines.delete(name);
    this.engineHealth.delete(name);
    
    // 从断路器服务中移除
    circuitBreakerService.removeEngine(name);
  }

  /**
   * 添加站点到注册表
   * @param domain 域名
   * @param engine 引擎名称
   */
  addSiteToRegistry(domain: string, engine: string): void {
    this.siteRegistry.set(domain, engine);
  }

  /**
   * 从注册表中移除站点
   * @param domain 域名
   */
  removeSiteFromRegistry(domain: string): void {
    this.siteRegistry.delete(domain);
  }

  /**
   * 获取所有引擎
   * @returns 引擎映射
   */
  getEngines(): Map<string, WebEngine> {
    return this.engines;
  }

  /**
   * 获取站点注册表
   * @returns 站点注册表
   */
  getSiteRegistry(): Map<string, string> {
    return this.siteRegistry;
  }
}

// Web引擎接口
export interface WebEngine {
  name: string;
  type: 'basic' | 'advanced';
  priority: number;
  handler: (url: string, options: ExtractionOptions) => Promise<ExtractionResult>;
}

// 引擎健康状态接口
export interface EngineHealth {
  status: 'healthy' | 'unhealthy' | 'unknown';
  lastCheck: Date;
  errorCount: number;
  successCount: number;
}
