/**
 * 模型适配器注册表
 * 统一管理所有适配器
 */

import type { IModelAdapter, ModelInfo, LayerConfig } from '../types/multi-model';

import { OllamaAdapter } from './ollama-adapter';
import { OpenAICompatibleAdapter } from './openai-compatible-adapter';
import { GeminiAdapter } from './gemini-adapter';
import { ClaudeAdapter } from './claude-adapter';

/**
 * 适配器类型
 */
export type AdapterType = 'ollama' | 'openai' | 'gemini' | 'claude' | 'custom';

/**
 * 适配器注册表配置
 */
export interface AdapterRegistryConfig {
  /** Ollama 配置 */
  ollama?: {
    baseUrl?: string;
    defaultModel?: string;
    timeout?: number;
  };
  /** OpenAI 兼容配置 */
  openai?: Record<string, {
    provider: string;
    model: string;
    baseUrl: string;
    apiKey: string;
  }>;
  /** Gemini 配置 */
  gemini?: {
    apiKey: string;
    model?: string;
  };
  /** Claude 配置 */
  claude?: {
    apiKey: string;
    model?: string;
  };
}

/**
 * 适配器注册表
 * 管理和创建所有模型适配器
 */
export class AdapterRegistry {
  private adapters: Map<string, IModelAdapter> = new Map();
  private config: AdapterRegistryConfig;

  constructor(config: AdapterRegistryConfig = {}) {
    this.config = config;
    this.registerDefaults();
  }

  /**
   * 注册默认适配器
   */
  private registerDefaults(): void {
    // Ollama
    if (this.config.ollama) {
      this.register('ollama', new OllamaAdapter(this.config.ollama));
    }

    // OpenAI 兼容
    if (this.config.openai) {
      for (const [name, cfg] of Object.entries(this.config.openai)) {
        this.register(name, new OpenAICompatibleAdapter(cfg));
      }
    }

    // Gemini
    if (this.config.gemini) {
      this.register('gemini', new GeminiAdapter(this.config.gemini));
    }

    // Claude
    if (this.config.claude) {
      this.register('claude', new ClaudeAdapter(this.config.claude));
    }
  }

  /**
   * 注册适配器
   */
  register(name: string, adapter: IModelAdapter): void {
    if (this.adapters.has(name)) {
      console.warn(`Adapter "${name}" already registered, overwriting`);
    }
    this.adapters.set(name, adapter);
  }

  /**
   * 获取适配器
   */
  get(name: string): IModelAdapter | undefined {
    return this.adapters.get(name);
  }

  /**
   * 获取所有适配器
   */
  getAll(): Map<string, IModelAdapter> {
    return new Map(this.adapters);
  }

  /**
   * 检查适配器是否存在
   */
  has(name: string): boolean {
    return this.adapters.has(name);
  }

  /**
   * 移除适配器
   */
  unregister(name: string): boolean {
    return this.adapters.delete(name);
  }

  /**
   * 列出所有可用适配器信息
   */
  async listAdapters(): Promise<ModelInfo[]> {
    const results: ModelInfo[] = [];

    for (const [name, adapter] of this.adapters.entries()) {
      const available = await adapter.isAvailable().catch(() => false);

      results.push({
        name,
        provider: adapter.provider,
        model: adapter.modelName,
        capabilities: adapter.capabilities,
        status: available ? 'available' : 'unavailable',
      });
    }

    return results;
  }

  /**
   * 按能力筛选适配器
   */
  filterByCapability(
    capability: keyof IModelAdapter['capabilities'],
    required: boolean = true
  ): IModelAdapter[] {
    const result: IModelAdapter[] = [];

    for (const adapter of this.adapters.values()) {
      if (adapter.capabilities[capability] === required) {
        result.push(adapter);
      }
    }

    return result;
  }

  /**
   * 按成本排序
   */
  sortByCost(): IModelAdapter[] {
    return Array.from(this.adapters.values()).sort(
      (a, b) => (a.capabilities.costPerToken ?? 0) - (b.capabilities.costPerToken ?? 0)
    );
  }

  /**
   * 按延迟排序
   */
  sortByLatency(): IModelAdapter[] {
    return Array.from(this.adapters.values()).sort(
      (a, b) => (a.capabilities.typicalLatency ?? Infinity) - (b.capabilities.typicalLatency ?? Infinity)
    );
  }

  /**
   * 从配置创建注册表
   */
  static fromConfig(config: AdapterRegistryConfig): AdapterRegistry {
    return new AdapterRegistry(config);
  }

  /**
   * 从 LayerConfig 创建注册表
   */
  static fromLayerConfig(config: LayerConfig): AdapterRegistry {
    const registryConfig: AdapterRegistryConfig = {};

    if (config.ollama) {
      registryConfig.ollama = config.ollama;
    }

    if (config.openai) {
      registryConfig.openai = config.openai;
    }

    // Gemini 和 Claude 需要通过 openai 配置添加
    if (config.openai?.gemini) {
      registryConfig.gemini = {
        apiKey: config.openai.gemini.apiKey,
        model: config.openai.gemini.model,
      };
    }

    if (config.openai?.claude) {
      registryConfig.claude = {
        apiKey: config.openai.claude.apiKey,
        model: config.openai.claude.model,
      };
    }

    return new AdapterRegistry(registryConfig);
  }
}

// 工厂函数
export function createAdapterRegistry(config?: AdapterRegistryConfig): AdapterRegistry {
  return new AdapterRegistry(config);
}

export default AdapterRegistry;
