// AI 配置管理器 - 管理 Ollama 和其他 AI 服务的配置

import { AIServiceConfig, AIProvider, OllamaConfig, OllamaModel, OpenAIConfig, CustomServiceConfig, ModelParams, ProxyConfig, UIConfig, PrivacyConfig, ResponseStylePreset } from '../types';
import { OllamaClient, ollamaClient as globalOllamaClient } from './ollama-client';
import { logger } from './logger';
import { eventBus } from './event-bus';

/**
 * AI 配置管理器事件
 */
export interface AIConfigEvents {
  'ai-config:changed': AIServiceConfig;
  'ai-config:provider-changed': AIProvider;
  'ollama:connected': { version: string };
  'ollama:disconnected': void;
  'ollama:models-updated': OllamaModel[];
}

/**
 * AI 配置管理器
 */
export class AIConfigManager {
  private static instance: AIConfigManager;
  private config: AIServiceConfig;
  private ollamaClient: OllamaClient;
  private storageKey = 'ai-service-config';
  private loadPromise: Promise<void>;

  private constructor() {
    this.config = this.getDefaultConfig();
    this.ollamaClient = new OllamaClient(this.config.ollama);
    globalOllamaClient.updateConfig(this.config.ollama || {});
    this.loadPromise = this.loadConfig();
    logger.info('AIConfigManager initialized');
  }

  static getInstance(): AIConfigManager {
    if (!AIConfigManager.instance) {
      AIConfigManager.instance = new AIConfigManager();
    }
    return AIConfigManager.instance;
  }

  /**
   * 获取默认配置
   */
  private getDefaultConfig(): AIServiceConfig {
    const isExtensionEnv =
      typeof chrome !== 'undefined' && Boolean(chrome?.runtime?.id) && Boolean(chrome?.storage?.local);
    const ollamaBaseUrl = isExtensionEnv ? 'http://192.168.0.32:11434' : '/api/ollama';
    return {
      version: '1.0.0',
      provider: 'ollama',
      proxy: {
        enabled: false,
        url: '',
      },
      ollama: {
        baseUrl: ollamaBaseUrl,
        defaultModel: 'gemma4:e4b',
        timeout: 30000,
        streamEnabled: true,
        headers: {},
        modelParams: {
          temperature: 0.7,
          maxTokens: 2048,
          topP: 0.9,
        },
      },
      openai: {
        apiKey: '',
        baseUrl: 'https://api.openai.com/v1',
        defaultModel: 'gpt-3.5-turbo',
        timeout: 30000,
        streamEnabled: true,
        headers: {},
        modelParams: {
          temperature: 0.7,
          maxTokens: 2048,
          topP: 0.9,
        },
      },
      custom: {
        baseUrl: 'http://localhost:1234/v1',
        apiKey: '',
        defaultModel: '',
        timeout: 30000,
        streamEnabled: true,
        headers: {},
        modelParams: {
          temperature: 0.7,
          maxTokens: 2048,
          topP: 0.9,
        },
      },
      linkmind: {
        baseUrl: '/api/linkmind',
        apiKey: '',
        transportMode: 'proxy',
        gatewayPath: '/api/linkmind',
        timeout: 60000,
        defaultModel: 'qwen-plus',
      },
      ui: {
        theme: 'light',
        language: 'zh-CN',
        autoOpen: false,
        contextMenu: true,
        responseStyle: 'normal',
      },
      privacy: {
        saveChatHistory: true,
        shareUsageData: false,
      },
    };
  }

  /**
   * 从存储加载配置
   */
  private async loadConfig(): Promise<void> {
    try {
      const isExtensionEnv =
        typeof chrome !== 'undefined' && Boolean(chrome?.runtime?.id) && Boolean(chrome?.storage?.local);

      if (isExtensionEnv) {
        const result = await chrome.storage.local.get(this.storageKey);
        if (result[this.storageKey]) {
          this.config = { ...this.getDefaultConfig(), ...result[this.storageKey] };
          if (this.config.ollama) {
            const baseUrl = String(this.config.ollama.baseUrl || '').trim();
            if (baseUrl.startsWith('/')) {
              this.config.ollama.baseUrl = 'http://192.168.0.32:11434';
            }
            this.ollamaClient.updateConfig(this.config.ollama);
            globalOllamaClient.updateConfig(this.config.ollama);
          }
          logger.info('AI config loaded from chrome.storage');
        }
      }
      else if (typeof window !== 'undefined' && window.localStorage) {
        const stored = localStorage.getItem(this.storageKey);
        if (stored) {
          const parsed = JSON.parse(stored) as AIServiceConfig;
          this.config = { ...this.getDefaultConfig(), ...parsed };
          if (this.config.ollama) {
            this.ollamaClient.updateConfig(this.config.ollama);
            globalOllamaClient.updateConfig(this.config.ollama);
          }
          logger.info('AI config loaded from localStorage');
        }
      }
    } catch (error) {
      logger.error('Failed to load AI config:', error);
    }
  }

  /**
   * 保存配置到存储
   */
  private async saveConfig(): Promise<void> {
    try {
      const isExtensionEnv =
        typeof chrome !== 'undefined' && Boolean(chrome?.runtime?.id) && Boolean(chrome?.storage?.local);

      if (isExtensionEnv) {
        await chrome.storage.local.set({ [this.storageKey]: this.config });
        logger.info('AI config saved to chrome.storage');
      }
      else if (typeof window !== 'undefined' && window.localStorage) {
        localStorage.setItem(this.storageKey, JSON.stringify(this.config));
        logger.info('AI config saved to localStorage');
      }
    } catch (error) {
      logger.error('Failed to save AI config:', error);
    }
  }

  async ensureLoaded(): Promise<void> {
    await this.loadPromise;
  }

  /**
   * 获取当前配置
   */
  getConfig(): AIServiceConfig {
    return { ...this.config };
  }

  /**
   * 更新完整配置
   */
  async updateConfig(config: Partial<AIServiceConfig>): Promise<void> {
    const oldProvider = this.config.provider;
    this.config = { ...this.config, ...config };

    if (config.ollama) {
      this.ollamaClient.updateConfig(config.ollama);
      globalOllamaClient.updateConfig(config.ollama);
    }

    await this.saveConfig();

    // 触发事件
    eventBus.emit('ai-config:changed', this.config);
    if (config.provider && config.provider !== oldProvider) {
      eventBus.emit('ai-config:provider-changed', config.provider);
    }

    logger.info('AI config updated:', this.config);
  }

  /**
   * 获取当前服务提供商
   */
  getProvider(): AIProvider {
    return this.config.provider;
  }

  /**
   * 设置服务提供商
   */
  async setProvider(provider: AIProvider): Promise<void> {
    await this.updateConfig({ provider });
  }

  /**
   * 获取 Ollama 配置
   */
  getOllamaConfig(): OllamaConfig | undefined {
    return this.config.ollama ? { ...this.config.ollama } : undefined;
  }

  /**
   * 更新 Ollama 配置
   */
  async updateOllamaConfig(config: Partial<OllamaConfig>): Promise<void> {
    const newConfig: OllamaConfig = {
      baseUrl: this.config.ollama?.baseUrl || 'http://192.168.0.32:11434',
      defaultModel: this.config.ollama?.defaultModel || 'gemma4:e4b',
      timeout: this.config.ollama?.timeout || 30000,
      streamEnabled: this.config.ollama?.streamEnabled ?? true,
      ...config,
    };
    await this.updateConfig({ ollama: newConfig });
  }

  /**
   * 获取 Ollama 客户端实例
   */
  getOllamaClient(): OllamaClient {
    return this.ollamaClient;
  }

  /**
   * 测试 Ollama 连接
   */
  async testOllamaConnection(): Promise<{ success: boolean; version?: string; error?: string }> {
    try {
      const isAvailable = await this.ollamaClient.isAvailable();
      if (isAvailable) {
        // 尝试获取版本信息
        const models = await this.ollamaClient.listModels();
        eventBus.emit('ollama:connected', { version: 'unknown' });
        eventBus.emit('ollama:models-updated', models);
        return { success: true, version: 'connected' };
      }
      return { success: false, error: 'Service not available' };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      eventBus.emit('ollama:disconnected', undefined);
      return { success: false, error: errorMessage };
    }
  }

  /**
   * 获取可用的 Ollama 模型列表
   */
  async getOllamaModels(): Promise<OllamaModel[]> {
    try {
      const models = await this.ollamaClient.listModels();
      eventBus.emit('ollama:models-updated', models);
      return models;
    } catch (error) {
      logger.error('Failed to get Ollama models:', error);
      return [];
    }
  }

  /**
   * 获取默认模型名称
   */
  getDefaultModel(): string {
    switch (this.config.provider) {
      case 'ollama':
        return this.config.ollama?.defaultModel || 'llama2';
      case 'openai':
        return this.config.openai?.defaultModel || 'gpt-3.5-turbo';
      case 'custom':
        return this.config.custom?.defaultModel || '';
      case 'linkmind':
        return this.config.linkmind?.defaultModel || 'qwen-plus';
      default:
        return 'llama2';
    }
  }

  /**
   * 设置默认模型
   */
  async setDefaultModel(model: string): Promise<void> {
    switch (this.config.provider) {
      case 'ollama':
        await this.updateOllamaConfig({ defaultModel: model });
        break;
      case 'openai':
        await this.updateConfig({
          openai: { ...this.config.openai, defaultModel: model } as any,
        });
        break;
      case 'custom':
        await this.updateConfig({
          custom: { ...this.config.custom, defaultModel: model } as any,
        });
        break;
      case 'linkmind':
        await this.updateConfig({
          linkmind: { ...this.config.linkmind, defaultModel: model } as any,
        });
        break;
    }
  }

  /**
   * 更新代理配置
   */
  async updateProxyConfig(config: { enabled: boolean; url: string }): Promise<void> {
    await this.updateConfig({ proxy: config });
  }

  /**
   * 获取代理配置
   */
  getProxyConfig(): { enabled: boolean; url: string } {
    return this.config.proxy || { enabled: false, url: '' };
  }

  /**
   * 更新UI配置
   */
  async updateUIConfig(config: { theme?: string; language?: string; autoOpen?: boolean; contextMenu?: boolean; responseStyle?: ResponseStylePreset }): Promise<void> {
    const current = this.getUIConfig();
    const next: UIConfig = { ...current, ...config };
    await this.updateConfig({ ui: next });
  }

  /**
   * 获取UI配置
   */
  getUIConfig(): { theme: string; language: string; autoOpen: boolean; contextMenu: boolean; responseStyle: ResponseStylePreset } {
    return {
      theme: 'light',
      language: 'zh-CN',
      autoOpen: false,
      contextMenu: true,
      responseStyle: 'normal',
      ...this.config.ui,
    };
  }

  /**
   * 更新隐私配置
   */
  async updatePrivacyConfig(config: { saveChatHistory?: boolean; shareUsageData?: boolean }): Promise<void> {
    const current = this.getPrivacyConfig();
    const next: PrivacyConfig = { ...current, ...config };
    await this.updateConfig({ privacy: next });
  }

  /**
   * 获取隐私配置
   */
  getPrivacyConfig(): { saveChatHistory: boolean; shareUsageData: boolean } {
    return this.config.privacy || { saveChatHistory: true, shareUsageData: false };
  }

  /**
   * 更新模型参数
   */
  async updateModelParams(provider: AIProvider, params: { temperature?: number; maxTokens?: number; topP?: number }): Promise<void> {
    switch (provider) {
      case 'ollama':
        await this.updateConfig({
          ollama: { ...this.config.ollama, modelParams: { ...this.config.ollama?.modelParams, ...params } } as any,
        });
        break;
      case 'openai':
        await this.updateConfig({
          openai: { ...this.config.openai, modelParams: { ...this.config.openai?.modelParams, ...params } } as any,
        });
        break;
      case 'custom':
        await this.updateConfig({
          custom: { ...this.config.custom, modelParams: { ...this.config.custom?.modelParams, ...params } } as any,
        });
        break;
      case 'linkmind':
        // LinkMind 由服务端路由控制，目前仅保存基础参数，不直接写 modelParams
        await this.updateConfig({
          linkmind: { ...this.config.linkmind } as any,
        });
        break;
    }
  }

  /**
   * 获取模型参数
   */
  getModelParams(provider: AIProvider): { temperature: number; maxTokens: number; topP: number } {
    switch (provider) {
      case 'ollama':
        return this.config.ollama?.modelParams || { temperature: 0.7, maxTokens: 2048, topP: 0.9 };
      case 'openai':
        return this.config.openai?.modelParams || { temperature: 0.7, maxTokens: 2048, topP: 0.9 };
      case 'custom':
        return this.config.custom?.modelParams || { temperature: 0.7, maxTokens: 2048, topP: 0.9 };
      case 'linkmind':
        return { temperature: 0.7, maxTokens: 2048, topP: 0.9 };
      default:
        return { temperature: 0.7, maxTokens: 2048, topP: 0.9 };
    }
  }

  /**
   * 重置为默认配置
   */
  async resetToDefaults(): Promise<void> {
    this.config = this.getDefaultConfig();
    if (this.config.ollama) {
      this.ollamaClient.updateConfig(this.config.ollama);
      globalOllamaClient.updateConfig(this.config.ollama);
    }
    await this.saveConfig();
    eventBus.emit('ai-config:changed', this.config);
    logger.info('AI config reset to defaults');
  }

  /**
   * 导出配置
   */
  exportConfig(): string {
    return JSON.stringify(this.config, null, 2);
  }

  /**
   * 导入配置
   */
  async importConfig(configJson: string): Promise<void> {
    try {
      const config = JSON.parse(configJson) as AIServiceConfig;
      await this.updateConfig(config);
      logger.info('AI config imported');
    } catch (error) {
      logger.error('Failed to import AI config:', error);
      throw new Error('Invalid config format');
    }
  }

  /**
   * 验证配置
   */
  validateConfig(): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    // 验证 Ollama 配置
    if (this.config.provider === 'ollama' && this.config.ollama) {
      if (!this.config.ollama.baseUrl) {
        errors.push('Ollama base URL is required');
      }
      if (!this.config.ollama.defaultModel) {
        errors.push('Ollama default model is required');
      }
    }

    // 验证 OpenAI 配置
    if (this.config.provider === 'openai' && this.config.openai) {
      if (!this.config.openai.apiKey) {
        errors.push('OpenAI API key is required');
      }
      if (!this.config.openai.baseUrl) {
        errors.push('OpenAI base URL is required');
      }
      if (!this.config.openai.defaultModel) {
        errors.push('OpenAI default model is required');
      }
    }

    // 验证自定义配置
    if (this.config.provider === 'custom' && this.config.custom) {
      if (!this.config.custom.baseUrl) {
        errors.push('Custom base URL is required');
      }
      if (!this.config.custom.defaultModel) {
        errors.push('Custom default model is required');
      }
    }

    if (this.config.provider === 'linkmind' && this.config.linkmind) {
      if (!this.config.linkmind.baseUrl) {
        errors.push('LinkMind base URL is required');
      }
      if (!this.config.linkmind.defaultModel) {
        errors.push('LinkMind default model is required');
      }
    }

    return { valid: errors.length === 0, errors };
  }
}

/**
 * 全局 AI 配置管理器实例
 */
export const aiConfigManager = AIConfigManager.getInstance();

export default AIConfigManager;
