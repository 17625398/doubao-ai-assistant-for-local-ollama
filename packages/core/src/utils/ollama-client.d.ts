import { OllamaConfig, OllamaModel, OllamaGenerateRequest, OllamaGenerateResponse, OllamaChatRequest, OllamaChatResponse, OllamaGenerateOptions } from '../types';
/**
 * Ollama API 客户端
 */
export declare class OllamaClient {
    private config;
    constructor(config?: Partial<OllamaConfig>);
    /**
     * 更新配置
     */
    updateConfig(config: Partial<OllamaConfig>): void;
    /**
     * 获取当前配置
     */
    getConfig(): OllamaConfig;
    /**
     * 检查服务是否可用
     */
    isAvailable(): Promise<boolean>;
    /**
     * 获取本地模型列表
     */
    listModels(): Promise<OllamaModel[]>;
    /**
     * 生成文本（非流式）
     */
    generate(prompt: string, options?: Partial<OllamaGenerateRequest>): Promise<OllamaGenerateResponse>;
    /**
     * 生成文本（流式）
     */
    generateStream(prompt: string, options?: Partial<OllamaGenerateRequest>, signal?: AbortSignal): AsyncGenerator<OllamaGenerateResponse, void, unknown>;
    /**
     * 聊天（非流式）
     */
    chat(request: OllamaChatRequest): Promise<OllamaChatResponse>;
    /**
     * 聊天（流式）
     */
    chatStream(request: OllamaChatRequest, signal?: AbortSignal): AsyncGenerator<OllamaChatResponse, void, unknown>;
    /**
     * 拉取模型
     */
    pullModel(modelName: string): Promise<void>;
    /**
     * 删除模型
     */
    deleteModel(modelName: string): Promise<void>;
    /**
     * 获取模型信息
     */
    getModelInfo(modelName: string): Promise<OllamaModel>;
}
/**
 * 创建默认的生成选项
 */
export declare function createDefaultOptions(): OllamaGenerateOptions;
/**
 * 全局 Ollama 客户端实例
 */
export declare const ollamaClient: OllamaClient;
export default OllamaClient;
