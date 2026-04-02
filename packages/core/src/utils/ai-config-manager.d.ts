import { AIServiceConfig, AIProvider, OllamaConfig, OllamaModel } from '../types';
import { OllamaClient } from './ollama-client';
/**
 * AI 配置管理器事件
 */
export interface AIConfigEvents {
    'ai-config:changed': AIServiceConfig;
    'ai-config:provider-changed': AIProvider;
    'ollama:connected': {
        version: string;
    };
    'ollama:disconnected': void;
    'ollama:models-updated': OllamaModel[];
}
/**
 * AI 配置管理器
 */
export declare class AIConfigManager {
    private static instance;
    private config;
    private ollamaClient;
    private storageKey;
    private constructor();
    static getInstance(): AIConfigManager;
    /**
     * 获取默认配置
     */
    private getDefaultConfig;
    /**
     * 从存储加载配置
     */
    private loadConfig;
    /**
     * 保存配置到存储
     */
    private saveConfig;
    /**
     * 获取当前配置
     */
    getConfig(): AIServiceConfig;
    /**
     * 更新完整配置
     */
    updateConfig(config: Partial<AIServiceConfig>): Promise<void>;
    /**
     * 获取当前服务提供商
     */
    getProvider(): AIProvider;
    /**
     * 设置服务提供商
     */
    setProvider(provider: AIProvider): Promise<void>;
    /**
     * 获取 Ollama 配置
     */
    getOllamaConfig(): OllamaConfig | undefined;
    /**
     * 更新 Ollama 配置
     */
    updateOllamaConfig(config: Partial<OllamaConfig>): Promise<void>;
    /**
     * 获取 Ollama 客户端实例
     */
    getOllamaClient(): OllamaClient;
    /**
     * 测试 Ollama 连接
     */
    testOllamaConnection(): Promise<{
        success: boolean;
        version?: string;
        error?: string;
    }>;
    /**
     * 获取可用的 Ollama 模型列表
     */
    getOllamaModels(): Promise<OllamaModel[]>;
    /**
     * 获取默认模型名称
     */
    getDefaultModel(): string;
    /**
     * 设置默认模型
     */
    setDefaultModel(model: string): Promise<void>;
    /**
     * 重置为默认配置
     */
    resetToDefaults(): Promise<void>;
    /**
     * 导出配置
     */
    exportConfig(): string;
    /**
     * 导入配置
     */
    importConfig(configJson: string): Promise<void>;
}
/**
 * 全局 AI 配置管理器实例
 */
export declare const aiConfigManager: AIConfigManager;
export default AIConfigManager;
