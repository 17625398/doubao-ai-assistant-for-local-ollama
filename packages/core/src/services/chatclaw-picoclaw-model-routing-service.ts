/**
 * PicoClaw 模型路由服务
 * 实现智能模型选择，根据查询复杂度自动选择合适的模型
 */
import { logger } from '../utils/logger';
import { eventBus } from '../utils/event-bus';
import { calculateMessageComplexity, selectModel } from '../utils/picoclaw-utils';

export interface ModelConfig {
  provider: string;
  model: string;
  apiKey: string;
  temperature?: number;
  maxTokens?: number;
  [key: string]: any;
}

export interface ModelStats {
  totalQueries: number;
  successfulQueries: number;
  failedQueries: number;
  averageResponseTime: number;
  lastUsed: string;
}

export interface ModelSelectionResult {
  modelType: 'lightweight' | 'heavyweight';
  model: ModelConfig;
  complexity: number;
  reasoning: string;
}

export class ChatClawPicoClawModelRoutingService {
  private models: {
    lightweight: ModelConfig;
    heavyweight: ModelConfig;
  };
  private modelStats: Map<string, ModelStats> = new Map();
  private gatewayUrl: string = 'http://localhost:18800';
  private complexityThreshold: number = 0.6;

  constructor() {
    this.models = {
      lightweight: {
        provider: 'deepseek',
        model: 'deepseek-chat',
        apiKey: '',
        temperature: 0.7,
        maxTokens: 1024
      },
      heavyweight: {
        provider: 'openai',
        model: 'gpt-3.5-turbo',
        apiKey: '',
        temperature: 0.7,
        maxTokens: 4096
      }
    };
    this.initialize();
  }

  /**
   * 初始化模型路由服务
   */
  private initialize(): void {
    logger.info('Initializing PicoClaw model routing service');
    eventBus.on('chatclaw:picoclaw-config-updated', this.handleConfigUpdate.bind(this));
  }

  /**
   * 处理配置更新
   */
  private handleConfigUpdate(config: any): void {
    if (config.models) {
      this.updateModels(config.models);
    }
    if (config.gatewayUrl) {
      this.gatewayUrl = config.gatewayUrl;
    }
    if (config.complexityThreshold !== undefined) {
      this.complexityThreshold = config.complexityThreshold;
    }
  }

  /**
   * 更新模型配置
   */
  updateModels(models: {
    lightweight: ModelConfig;
    heavyweight: ModelConfig;
  }): void {
    this.models = models;
    logger.info('Model configurations updated');
  }

  /**
   * 选择合适的模型
   */
  selectModel(message: string): ModelSelectionResult {
    // 计算消息复杂度
    const complexity = calculateMessageComplexity(message);
    
    // 根据复杂度选择模型
    const modelType = selectModel(complexity);
    const model = this.models[modelType];
    
    // 生成选择理由
    let reasoning = '';
    if (modelType === 'lightweight') {
      reasoning = `Message complexity (${(complexity * 100).toFixed(1)}%) is below threshold (${(this.complexityThreshold * 100).toFixed(0)}%), using lightweight model`;
    } else {
      reasoning = `Message complexity (${(complexity * 100).toFixed(1)}%) is above threshold (${(this.complexityThreshold * 100).toFixed(0)}%), using heavyweight model`;
    }
    
    logger.debug(reasoning);
    
    return {
      modelType,
      model,
      complexity,
      reasoning
    };
  }

  /**
   * 执行模型查询
   */
  async executeQuery(message: string, context?: any[]): Promise<any> {
    try {
      // 选择模型
      const selectionResult = this.selectModel(message);
      const { modelType, model, reasoning } = selectionResult;
      
      // 记录开始时间
      const startTime = Date.now();
      
      // 调用 PicoClaw API 执行查询
      const response = await fetch(`${this.gatewayUrl}/api/models/query`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          modelType,
          model,
          message,
          context
        })
      });
      
      // 计算响应时间
      const responseTime = Date.now() - startTime;
      
      if (response.ok) {
        const result = await response.json();
        
        // 更新模型统计
        this.updateModelStats(modelType, true, responseTime);
        
        return {
          ...result,
          modelType,
          reasoning
        };
      } else {
        const errorData = await response.json().catch(() => ({}));
        const errorMessage = errorData.message || `Failed to execute query with ${modelType} model`;
        
        // 更新模型统计
        this.updateModelStats(modelType, false, responseTime);
        
        throw new Error(errorMessage);
      }
    } catch (error) {
      logger.error('Failed to execute model query:', error);
      throw error;
    }
  }

  /**
   * 更新模型统计信息
   */
  private updateModelStats(modelType: string, successful: boolean, responseTime: number): void {
    const stats = this.modelStats.get(modelType) || {
      totalQueries: 0,
      successfulQueries: 0,
      failedQueries: 0,
      averageResponseTime: 0,
      lastUsed: new Date().toISOString()
    };
    
    stats.totalQueries++;
    if (successful) {
      stats.successfulQueries++;
    } else {
      stats.failedQueries++;
    }
    
    // 更新平均响应时间
    if (stats.totalQueries === 1) {
      stats.averageResponseTime = responseTime;
    } else {
      stats.averageResponseTime = ((stats.averageResponseTime * (stats.totalQueries - 1)) + responseTime) / stats.totalQueries;
    }
    
    stats.lastUsed = new Date().toISOString();
    this.modelStats.set(modelType, stats);
  }

  /**
   * 获取模型统计信息
   */
  getModelStats(modelType?: string): ModelStats | Record<string, ModelStats> {
    if (modelType) {
      return this.modelStats.get(modelType) || {
        totalQueries: 0,
        successfulQueries: 0,
        failedQueries: 0,
        averageResponseTime: 0,
        lastUsed: new Date().toISOString()
      };
    }
    
    const allStats: Record<string, ModelStats> = {};
    for (const [type, stats] of this.modelStats.entries()) {
      allStats[type] = stats;
    }
    return allStats;
  }

  /**
   * 获取模型配置
   */
  getModels(): {
    lightweight: ModelConfig;
    heavyweight: ModelConfig;
  } {
    return { ...this.models };
  }

  /**
   * 获取单个模型配置
   */
  getModel(modelType: 'lightweight' | 'heavyweight'): ModelConfig {
    return { ...this.models[modelType] };
  }

  /**
   * 设置复杂度阈值
   */
  setComplexityThreshold(threshold: number): void {
    this.complexityThreshold = Math.max(0, Math.min(1, threshold));
    logger.info(`Complexity threshold updated to ${(threshold * 100).toFixed(0)}%`);
  }

  /**
   * 获取复杂度阈值
   */
  getComplexityThreshold(): number {
    return this.complexityThreshold;
  }

  /**
   * 设置 Gateway URL
   */
  setGatewayUrl(url: string): void {
    this.gatewayUrl = url;
  }

  /**
   * 获取 Gateway URL
   */
  getGatewayUrl(): string {
    return this.gatewayUrl;
  }

  /**
   * 验证模型配置
   */
  validateModelConfig(modelType: 'lightweight' | 'heavyweight'): string[] {
    const errors: string[] = [];
    const model = this.models[modelType];
    
    if (!model.provider) {
      errors.push(`${modelType} model provider is required`);
    }
    
    if (!model.model) {
      errors.push(`${modelType} model name is required`);
    }
    
    if (!model.apiKey) {
      errors.push(`${modelType} model API key is required`);
    }
    
    return errors;
  }

  /**
   * 验证所有模型配置
   */
  validateAllModelConfigs(): Record<string, string[]> {
    const errors: Record<string, string[]> = {};
    
    errors.lightweight = this.validateModelConfig('lightweight');
    errors.heavyweight = this.validateModelConfig('heavyweight');
    
    return errors;
  }

  /**
   * 重置模型统计信息
   */
  resetModelStats(): void {
    this.modelStats.clear();
    logger.info('Model stats reset');
  }
}

// 导出单例
export const chatClawPicoClawModelRoutingService = new ChatClawPicoClawModelRoutingService();
