/**
 * ChatClaw 多问同开服务
 * 实现ChatClaw的多模型同步响应功能，支持同时调用多个AI助手
 */
import { logger } from '../utils/logger';

export interface ModelConfig {
  id: string;
  name: string;
  provider: string;
  apiKey?: string;
  baseUrl?: string;
  enabled: boolean;
}

export interface MultiAskRequest {
  question: string;
  models: string[];
  context?: any;
}

export interface MultiAskResponse {
  modelId: string;
  modelName: string;
  response: string;
  duration: number;
  error?: string;
}

export class ChatClawMultiAskService {
  private models: Map<string, ModelConfig> = new Map();
  private maxConcurrentModels: number = 3;

  /**
   * 初始化多问同开服务
   */
  initialize(): void {
    // 初始化默认模型
    this.initializeDefaultModels();
  }

  /**
   * 初始化默认模型
   */
  private initializeDefaultModels(): void {
    const defaultModels: ModelConfig[] = [
      {
        id: 'deepseek',
        name: 'DeepSeek',
        provider: 'deepseek',
        enabled: true
      },
      {
        id: 'doubao',
        name: '豆包',
        provider: 'doubao',
        enabled: true
      },
      {
        id: 'tongyi',
        name: '通义千问',
        provider: 'tongyi',
        enabled: true
      },
      {
        id: 'yuanbao',
        name: '元宝',
        provider: 'yuanbao',
        enabled: false
      },
      {
        id: 'kimi',
        name: 'Kimi',
        provider: 'kimi',
        enabled: false
      },
      {
        id: 'chatgpt',
        name: 'ChatGPT',
        provider: 'openai',
        enabled: false
      },
      {
        id: 'gemini',
        name: 'Gemini',
        provider: 'google',
        enabled: false
      },
      {
        id: 'claude',
        name: 'Claude',
        provider: 'anthropic',
        enabled: false
      }
    ];

    defaultModels.forEach(model => {
      this.models.set(model.id, model);
    });
  }

  /**
   * 获取所有模型
   */
  getModels(): ModelConfig[] {
    return Array.from(this.models.values());
  }

  /**
   * 获取启用的模型
   */
  getEnabledModels(): ModelConfig[] {
    return Array.from(this.models.values()).filter(model => model.enabled);
  }

  /**
   * 更新模型配置
   */
  updateModelConfig(modelId: string, config: Partial<ModelConfig>): void {
    const model = this.models.get(modelId);
    if (model) {
      this.models.set(modelId, { ...model, ...config });
    }
  }

  /**
   * 执行多问同开
   */
  async executeMultiAsk(request: MultiAskRequest): Promise<MultiAskResponse[]> {
    try {
      // 验证模型数量
      if (request.models.length > this.maxConcurrentModels) {
        throw new Error(`最多同时支持 ${this.maxConcurrentModels} 个模型`);
      }

      // 过滤启用的模型
      const selectedModels = request.models
        .map(modelId => this.models.get(modelId))
        .filter((model): model is ModelConfig => model !== undefined && model.enabled);

      if (selectedModels.length === 0) {
        throw new Error('没有启用的模型');
      }

      // 并行执行模型请求
      const responses = await Promise.all(
        selectedModels.map(async (model) => {
          const startTime = Date.now();
          try {
            // 模拟模型响应
            const response = await this.simulateModelResponse(model, request.question, request.context);
            const duration = Date.now() - startTime;
            return {
              modelId: model.id,
              modelName: model.name,
              response,
              duration
            };
          } catch (error) {
            const duration = Date.now() - startTime;
            return {
              modelId: model.id,
              modelName: model.name,
              response: '',
              duration,
              error: error instanceof Error ? error.message : '模型响应失败'
            };
          }
        })
      );

      return responses;
    } catch (error) {
      logger.error('多问同开执行失败:', error);
      return [];
    }
  }

  /**
   * 模拟模型响应
   */
  private async simulateModelResponse(model: ModelConfig, question: string, context?: any): Promise<string> {
    // 模拟网络延迟
    await new Promise(resolve => setTimeout(resolve, Math.random() * 2000 + 1000));

    // 模拟不同模型的响应
    const responses = {
      deepseek: `DeepSeek 回答: 关于 "${question}"，我认为这是一个很有趣的问题。根据我的理解，这涉及到多个方面的考虑...`,
      doubao: `豆包回答: 你好！关于 "${question}"，我可以为你提供一些见解。首先，我们需要考虑...`,
      tongyi: `通义千问回答: 针对 "${question}" 这个问题，我的分析如下：从多个角度来看...`,
      yuanbao: `元宝回答: 你问的 "${question}" 是一个很好的问题。让我为你详细解答...`,
      kimi: `Kimi 回答: 关于 "${question}"，我有以下看法：首先...`,
      chatgpt: `ChatGPT 回答: Thank you for asking about "${question}". Based on my understanding...`,
      gemini: `Gemini 回答: I've analyzed your question about "${question}" and here's what I think...`,
      claude: `Claude 回答: Regarding "${question}", I can provide the following insights...`
    };

    return responses[model.id as keyof typeof responses] || `模型 ${model.name} 回答: 关于 "${question}"，我认为...`;
  }

  /**
   * 设置最大并发模型数
   */
  setMaxConcurrentModels(max: number): void {
    this.maxConcurrentModels = Math.max(1, Math.min(max, 5));
  }

  /**
   * 获取最大并发模型数
   */
  getMaxConcurrentModels(): number {
    return this.maxConcurrentModels;
  }
}

// 导出单例
export const chatClawMultiAskService = new ChatClawMultiAskService();
// 初始化服务
chatClawMultiAskService.initialize();
