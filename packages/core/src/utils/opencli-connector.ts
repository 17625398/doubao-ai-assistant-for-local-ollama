/**
 * OpenCLI 与 WebContentExtractor 协同工作模块
 * 
 * 提供智能路由、组合工作流、性能优化等功能
 */

import { opencli, OpenCLIResult } from './opencli-skill';
import { WebContentExtractor, ExtractOptions, ExtractResult } from './web-content-extractor';
import { opencliVisualizer } from './opencli-visualizer';
import { logger } from './logger';

/**
 * 页面复杂度评估结果
 */
export interface PageComplexity {
  /** 复杂度分数 (0-100) */
  score: number;
  /** 是否复杂页面 */
  isComplex: boolean;
  /** 评估因素 */
  factors: {
    /** 动态内容 */
    hasDynamicContent: boolean;
    /** 需要登录 */
    requiresAuth: boolean;
    /** 大量交互元素 */
    hasManyInteractions: boolean;
    /** SPA 应用 */
    isSPA: boolean;
    /** iframe 嵌套 */
    hasIframes: boolean;
  };
}

/**
 * 智能提取选项
 */
export interface SmartExtractOptions extends ExtractOptions {
  /** 是否启用智能路由 */
  enableSmartRouting?: boolean;
  /** 是否使用 OpenCLI 预处理 */
  useOpenCLIPreprocess?: boolean;
  /** 是否记录性能数据 */
  logPerformance?: boolean;
}

/**
 * 提取性能数据
 */
export interface ExtractPerformance {
  /** 总耗时（毫秒） */
  totalDuration: number;
  /** OpenCLI 耗时（毫秒） */
  opencliDuration?: number;
  /** Extractor 耗时（毫秒） */
  extractorDuration: number;
  /** 使用的策略 */
  strategy: 'opencli' | 'extractor' | 'hybrid';
}

/**
 * 协同工作结果
 */
export interface CollaborativeExtractResult {
  /** 提取结果 */
  result: ExtractResult;
  /** 性能数据 */
  performance: ExtractPerformance;
  /** 使用的策略 */
  strategy: string;
  /** 是否成功 */
  success: boolean;
  /** 错误信息 */
  error?: string;
}

/**
 * OpenCLI 协同工作类
 */
export class OpenCLIConnector {
  private static instance: OpenCLIConnector;
  private extractor: WebContentExtractor;
  private performanceLog: ExtractPerformance[] = [];

  private constructor() {
    this.extractor = new WebContentExtractor();
  }

  /**
   * 获取单例实例
   */
  public static getInstance(): OpenCLIConnector {
    if (!OpenCLIConnector.instance) {
      OpenCLIConnector.instance = new OpenCLIConnector();
    }
    return OpenCLIConnector.instance;
  }

  /**
   * 评估页面复杂度
   */
  public evaluatePageComplexity(): PageComplexity {
    const factors = {
      hasDynamicContent: this.checkDynamicContent(),
      requiresAuth: this.checkRequiresAuth(),
      hasManyInteractions: this.checkManyInteractions(),
      isSPA: this.checkIsSPA(),
      hasIframes: this.checkHasIframes(),
    };

    let score = 0;
    if (factors.hasDynamicContent) score += 20;
    if (factors.requiresAuth) score += 30;
    if (factors.hasManyInteractions) score += 15;
    if (factors.isSPA) score += 20;
    if (factors.hasIframes) score += 15;

    return {
      score,
      isComplex: score >= 40,
      factors,
    };
  }

  /**
   * 检查动态内容
   */
  private checkDynamicContent(): boolean {
    if (typeof window === 'undefined') return false;
    
    // 检查是否有异步加载的内容
    const loadingElements = document.querySelectorAll('[data-loading], .loading, .spinner');
    const dynamicContainers = document.querySelectorAll('[data-dynamic], [data-async]');
    return loadingElements.length > 0 || dynamicContainers.length > 0;
  }

  /**
   * 检查是否需要登录
   */
  private checkRequiresAuth(): boolean {
    if (typeof window === 'undefined') return false;
    
    // 检查是否有登录相关的元素
    const authIndicators = [
      document.querySelector('[data-auth]'),
      document.querySelector('.login-required'),
      document.querySelector('.auth-required'),
      document.cookie.includes('session'),
      document.cookie.includes('token'),
    ];
    
    return authIndicators.some(Boolean);
  }

  /**
   * 检查是否有大量交互元素
   */
  private checkManyInteractions(): boolean {
    if (typeof window === 'undefined') return false;
    
    const interactiveElements = document.querySelectorAll(
      'button, a, input, select, textarea, [onclick], [role="button"]'
    );
    return interactiveElements.length > 50;
  }

  /**
   * 检查是否是 SPA
   */
  private checkIsSPA(): boolean {
    if (typeof window === 'undefined') return false;
    
    // 检查是否有 SPA 框架的特征
    const spaIndicators = [
      document.querySelector('#root'),
      document.querySelector('#app'),
      document.querySelector('[data-reactroot]'),
      document.querySelector('[data-vue]'),
      document.querySelector('[ng-version]'),
    ];
    
    return spaIndicators.some(Boolean);
  }

  /**
   * 检查是否有 iframe
   */
  private checkHasIframes(): boolean {
    if (typeof document === 'undefined') return false;
    return document.querySelectorAll('iframe').length > 0;
  }

  /**
   * 智能提取页面内容
   */
  public async smartExtract(
    options: SmartExtractOptions = {}
  ): Promise<CollaborativeExtractResult> {
    const startTime = Date.now();
    const {
      enableSmartRouting = true,
      useOpenCLIPreprocess = false,
      logPerformance = true,
      ...extractOptions
    } = options;

    try {
      // 评估页面复杂度
      const complexity = this.evaluatePageComplexity();
      logger.info('[OpenCLIConnector] 页面复杂度评估:', complexity);

      // 显示状态
      opencliVisualizer.updateStatus('评估页面...', 'busy');

      let strategy: 'opencli' | 'extractor' | 'hybrid' = 'extractor';
      let opencliDuration: number | undefined;

      // 智能路由决策
      if (enableSmartRouting) {
        if (complexity.isComplex || complexity.factors.requiresAuth) {
          strategy = useOpenCLIPreprocess ? 'hybrid' : 'opencli';
        }
      }

      logger.info('[OpenCLIConnector] 使用策略:', strategy);

      // 根据策略执行提取
      let result: ExtractResult;

      switch (strategy) {
        case 'opencli':
          result = await this.extractWithOpenCLI(extractOptions, startTime);
          opencliDuration = Date.now() - startTime;
          break;

        case 'hybrid':
          result = await this.extractHybrid(extractOptions, startTime);
          opencliDuration = Date.now() - startTime;
          break;

        case 'extractor':
        default:
          result = await this.extractWithExtractor(extractOptions);
          break;
      }

      const totalDuration = Date.now() - startTime;

      // 记录性能数据
      const performance: ExtractPerformance = {
        totalDuration,
        opencliDuration,
        extractorDuration: totalDuration - (opencliDuration || 0),
        strategy,
      };

      if (logPerformance) {
        this.performanceLog.push(performance);
        logger.info('[OpenCLIConnector] 性能数据:', performance);
      }

      // 更新状态
      opencliVisualizer.updateStatus('提取完成', 'ready');
      opencliVisualizer.showToast(`内容提取成功 (${totalDuration}ms)`, 'success');

      return {
        result,
        performance,
        strategy: this.getStrategyDescription(strategy),
        success: true,
      };
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      logger.error('[OpenCLIConnector] 提取失败:', errorMsg);
      
      opencliVisualizer.updateStatus('提取失败', 'error');
      opencliVisualizer.showToast(`提取失败：${errorMsg}`, 'error');

      return {
        result: { 
          content: '', 
          title: '', 
          url: '', 
          metadata: {},
          success: false 
        } as ExtractResult,
        performance: {
          totalDuration: Date.now() - startTime,
          extractorDuration: 0,
          strategy: 'extractor',
        },
        strategy: 'error',
        success: false,
        error: errorMsg,
      };
    }
  }

  /**
   * 使用 OpenCLI 提取
   */
  private async extractWithOpenCLI(
    options: ExtractOptions,
    startTime: number
  ): Promise<ExtractResult> {
    logger.info('[OpenCLIConnector] 使用 OpenCLI 提取');
    opencliVisualizer.showToast('使用 OpenCLI 提取...', 'info');

    // 等待页面稳定
    await this.waitForPageStable();

    // 使用 Extractor 提取
    return this.extractWithExtractor(options);
  }

  /**
   * 使用 Extractor 提取
   */
  private async extractWithExtractor(
    options: ExtractOptions
  ): Promise<ExtractResult> {
    logger.info('[OpenCLIConnector] 使用 WebContentExtractor 提取');
    opencliVisualizer.showToast('提取页面内容...', 'info');

    return this.extractor.extract(options);
  }

  /**
   * 混合提取（OpenCLI 预处理 + Extractor 提取）
   */
  private async extractHybrid(
    options: ExtractOptions,
    startTime: number
  ): Promise<ExtractResult> {
    logger.info('[OpenCLIConnector] 使用混合策略提取');
    opencliVisualizer.showToast('预处理页面...', 'info');

    // OpenCLI 预处理：滚动、等待等
    try {
      // 滚动页面加载动态内容
      await opencli.scroll('down', 1000);
      await this.waitForPageStable();
      
      // 滚动回顶部
      await opencli.scroll('up', 1000);
      await this.waitForPageStable();
    } catch (error) {
      logger.warn('[OpenCLIConnector] OpenCLI 预处理失败，继续提取:', error);
    }

    // 使用 Extractor 提取
    return this.extractWithExtractor(options);
  }

  /**
   * 等待页面稳定
   */
  private async waitForPageStable(delay: number = 1000): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, delay));
  }

  /**
   * 获取策略描述
   */
  private getStrategyDescription(strategy: string): string {
    const descriptions: Record<string, string> = {
      opencli: '使用 OpenCLI 提取（适合复杂/需要登录的页面）',
      extractor: '使用 WebContentExtractor 提取（适合简单页面）',
      hybrid: '使用混合策略（OpenCLI 预处理 + Extractor 提取）',
      error: '提取失败',
    };
    return descriptions[strategy] || strategy;
  }

  /**
   * 获取性能统计
   */
  public getPerformanceStats(): {
    totalExtractions: number;
    averageDuration: number;
    strategyDistribution: Record<string, number>;
  } {
    if (this.performanceLog.length === 0) {
      return {
        totalExtractions: 0,
        averageDuration: 0,
        strategyDistribution: {},
      };
    }

    const totalDuration = this.performanceLog.reduce(
      (sum, p) => sum + p.totalDuration,
      0
    );

    const strategyDistribution: Record<string, number> = {};
    this.performanceLog.forEach(p => {
      strategyDistribution[p.strategy] = (strategyDistribution[p.strategy] || 0) + 1;
    });

    return {
      totalExtractions: this.performanceLog.length,
      averageDuration: Math.round(totalDuration / this.performanceLog.length),
      strategyDistribution,
    };
  }

  /**
   * 清除性能日志
   */
  public clearPerformanceLog(): void {
    this.performanceLog = [];
  }

  /**
   * 测试 OpenCLI 连接
   */
  public async testOpenCLIConnection(): Promise<boolean> {
    try {
      const isReady = opencli.isReady();
      if (isReady) {
        opencliVisualizer.updateStatus('OpenCLI 已连接', 'ready');
        return true;
      } else {
        opencliVisualizer.updateStatus('OpenCLI 未连接', 'error');
        return false;
      }
    } catch (error) {
      opencliVisualizer.updateStatus('OpenCLI 连接失败', 'error');
      return false;
    }
  }
}

// 导出单例
export const opencliConnector = OpenCLIConnector.getInstance();
