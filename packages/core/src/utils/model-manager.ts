// 模型管理器

import { OllamaModel } from '../types';
import { OpenAICompatibleModel } from './openai-compatible-client';
import { isVisionModel, getModelDisplayName, sortModels } from './model-utils';

/**
 * 模型配置接口
 */
export interface ModelConfig {
  id: string;
  name: string;
  provider: 'ollama' | 'openai' | 'google' | 'custom';
  baseUrl?: string;
  apiKey?: string;
  parameters?: {
    temperature: number;
    topP: number;
    topK: number;
    maxTokens?: number;
  };
  isDefault?: boolean;
  isVision?: boolean;
}

/**
 * 模型管理器类
 */
export class ModelManager {
  private models: ModelConfig[] = [];
  private defaultModelId: string | null = null;
  private storageKey = 'model-configs';

  /**
   * 初始化模型管理器
   */
  constructor() {
    this.loadModels();
  }

  /**
   * 从本地存储加载模型配置
   */
  private loadModels(): void {
    try {
      const stored = localStorage.getItem(this.storageKey);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed)) {
          this.models = parsed;
          // 找到默认模型
          const defaultModel = this.models.find(model => model.isDefault);
          this.defaultModelId = defaultModel?.id || null;
        }
      }
    } catch (error) {
      console.error('Failed to load model configs:', error);
      this.models = [];
    }
  }

  /**
   * 保存模型配置到本地存储
   */
  private saveModels(): void {
    try {
      localStorage.setItem(this.storageKey, JSON.stringify(this.models));
    } catch (error) {
      console.error('Failed to save model configs:', error);
    }
  }

  /**
   * 获取所有模型配置
   * @returns 模型配置列表
   */
  getModels(): ModelConfig[] {
    return [...this.models];
  }

  /**
   * 获取默认模型
   * @returns 默认模型配置
   */
  getDefaultModel(): ModelConfig | null {
    if (this.defaultModelId) {
      return this.models.find(model => model.id === this.defaultModelId) || null;
    }
    return this.models[0] || null;
  }

  /**
   * 设置默认模型
   * @param modelId 模型ID
   */
  setDefaultModel(modelId: string): void {
    // 移除所有模型的默认标记
    this.models = this.models.map(model => ({
      ...model,
      isDefault: model.id === modelId
    }));
    this.defaultModelId = modelId;
    this.saveModels();
  }

  /**
   * 添加模型配置
   * @param model 模型配置
   */
  addModel(model: Omit<ModelConfig, 'id'>): string {
    const id = `model_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const newModel: ModelConfig = {
      ...model,
      id,
      isVision: model.isVision || isVisionModel({ id: model.name } as any)
    };
    
    // 如果是第一个模型，设置为默认
    if (this.models.length === 0) {
      newModel.isDefault = true;
      this.defaultModelId = id;
    }
    
    this.models.push(newModel);
    this.saveModels();
    return id;
  }

  /**
   * 更新模型配置
   * @param modelId 模型ID
   * @param updates 更新内容
   */
  updateModel(modelId: string, updates: Partial<ModelConfig>): boolean {
    const index = this.models.findIndex(model => model.id === modelId);
    if (index === -1) {
      return false;
    }
    
    this.models[index] = {
      ...this.models[index],
      ...updates,
      isVision: updates.isVision || isVisionModel({ id: updates.name || this.models[index].name } as any)
    };
    
    if (updates.isDefault) {
      // 移除其他模型的默认标记
      this.models = this.models.map(model => ({
        ...model,
        isDefault: model.id === modelId
      }));
      this.defaultModelId = modelId;
    }
    
    this.saveModels();
    return true;
  }

  /**
   * 删除模型配置
   * @param modelId 模型ID
   */
  deleteModel(modelId: string): boolean {
    const index = this.models.findIndex(model => model.id === modelId);
    if (index === -1) {
      return false;
    }
    
    // 如果删除的是默认模型，设置第一个模型为默认
    if (this.models[index].isDefault && this.models.length > 1) {
      this.models[0].isDefault = true;
      this.defaultModelId = this.models[0].id;
    } else if (this.models.length === 1) {
      this.defaultModelId = null;
    }
    
    this.models.splice(index, 1);
    this.saveModels();
    return true;
  }

  /**
   * 从Ollama获取模型列表
   * @param baseUrl Ollama API基础URL
   * @returns Ollama模型列表
   */
  async fetchOllamaModels(baseUrl: string = 'http://127.0.0.1:11434'): Promise<OllamaModel[]> {
    try {
      const response = await fetch(`${baseUrl}/api/tags`);
      if (!response.ok) {
        throw new Error(`Failed to fetch Ollama models: ${response.status}`);
      }
      const data = await response.json();
      return data.models || [];
    } catch (error) {
      console.error('Failed to fetch Ollama models:', error);
      return [];
    }
  }

  /**
   * 将Ollama模型转换为模型配置
   * @param ollamaModel Ollama模型
   * @param baseUrl Ollama API基础URL
   * @returns 模型配置
   */
  convertOllamaModelToConfig(ollamaModel: OllamaModel, baseUrl: string): ModelConfig {
    return {
      id: `ollama_${ollamaModel.name}`,
      name: ollamaModel.name,
      provider: 'ollama',
      baseUrl,
      parameters: {
        temperature: 0.7,
        topP: 0.95,
        topK: 40
      },
      isVision: isVisionModel(ollamaModel)
    };
  }

  /**
   * 导入Ollama模型
   * @param baseUrl Ollama API基础URL
   */
  async importOllamaModels(baseUrl: string = 'http://127.0.0.1:11434'): Promise<number> {
    const ollamaModels = await this.fetchOllamaModels(baseUrl);
    let importedCount = 0;
    
    for (const model of ollamaModels) {
      const existingModel = this.models.find(m => m.provider === 'ollama' && m.name === model.name);
      if (!existingModel) {
        const config = this.convertOllamaModelToConfig(model, baseUrl);
        this.addModel(config);
        importedCount++;
      }
    }
    
    return importedCount;
  }
}

// 导出单例实例
export const modelManager = new ModelManager();
