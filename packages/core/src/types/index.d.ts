export interface MessagePayload {
    type: string;
    data?: unknown;
    url?: string;
}
export interface CaptureResponse {
    code: number;
    data?: string;
    error?: string;
}
export interface TabInfo {
    id: number;
    url: string;
    title?: string;
    active: boolean;
}
export interface ScreenshotRequest {
    func: 'screenshop';
    method: string;
}
export interface ClosePageRequest {
    func: 'closePage' | 'closeAllPage';
    url: string;
}
export type ContentScriptMessage = ScreenshotRequest | ClosePageRequest;
export interface ChatMessage {
    id: string;
    role: 'user' | 'assistant' | 'system';
    content: string;
    timestamp: number;
    attachments?: Attachment[];
}
export interface Attachment {
    type: 'image' | 'file' | 'audio';
    url: string;
    name: string;
    size?: number;
}
export interface ChatSession {
    id: string;
    title: string;
    messages: ChatMessage[];
    createdAt: number;
    updatedAt: number;
}
export interface ExtensionConfig {
    version: string;
    name: string;
    description: string;
    permissions: string[];
    hostPermissions: string[];
}
export interface RouteConfig {
    urlPath: string;
    entryName: string;
    entryPath: string;
    isSPA: boolean;
    isStream: boolean;
    isSSR: boolean;
    isRSC: boolean;
    redirect?: string;
    responseHeader?: Record<string, string>;
    extra?: Record<string, unknown>;
}
export interface RouteManifest {
    routes: RouteConfig[];
}
/**
 * 模型参数配置
 */
export interface ModelParams {
    /** 温度（创造性）0-1 */
    temperature: number;
    /** 最大 token 数 */
    maxTokens: number;
    /** Top P 采样 */
    topP: number;
}
/**
 * Ollama 服务配置
 */
export interface OllamaConfig {
    /** 服务地址，默认 http://localhost:11434 */
    baseUrl: string;
    /** 默认使用的模型 */
    defaultModel: string;
    /** 请求超时时间（毫秒） */
    timeout: number;
    /** 是否启用流式响应 */
    streamEnabled: boolean;
    /** 自定义请求头 */
    headers?: Record<string, string>;
    /** 模型参数 */
    modelParams?: ModelParams;
}
/**
 * Ollama 模型信息
 */
export interface OllamaModel {
    /** 模型名称 */
    name: string;
    /** 模型标识 */
    model?: string;
    /** 模型大小（字节） */
    size?: number;
    /** 模型参数大小 */
    parameter_size?: string;
    /** 量化级别 */
    quantization_level?: string;
    /** 模型描述 */
    description?: string;
    /** 是否已下载到本地 */
    downloaded?: boolean;
}
/**
 * Ollama 生成请求参数
 */
export interface OllamaGenerateRequest {
    /** 模型名称 */
    model: string;
    /** 提示词 */
    prompt: string;
    /** 系统提示词 */
    system?: string;
    /** 上下文（用于多轮对话） */
    context?: number[];
    /** 是否流式输出 */
    stream?: boolean;
    /** 生成参数 */
    options?: OllamaGenerateOptions;
}
/**
 * Ollama 生成参数选项
 */
export interface OllamaGenerateOptions {
    /** 温度（创造性）0-1 */
    temperature?: number;
    /** 最大 token 数 */
    num_predict?: number;
    /** Top P 采样 */
    top_p?: number;
    /** Top K 采样 */
    top_k?: number;
    /** 重复惩罚 */
    repeat_penalty?: number;
    /** 随机种子 */
    seed?: number;
}
/**
 * Ollama 生成响应
 */
export interface OllamaGenerateResponse {
    /** 模型名称 */
    model: string;
    /** 创建时间 */
    created_at: string;
    /** 生成的响应 */
    response: string;
    /** 是否完成 */
    done: boolean;
    /** 上下文（用于多轮对话） */
    context?: number[];
    /** 统计信息 */
    eval_count?: number;
    eval_duration?: number;
    load_duration?: number;
    prompt_eval_count?: number;
    prompt_eval_duration?: number;
    total_duration?: number;
}
/**
 * Ollama 聊天请求参数
 */
export interface OllamaChatRequest {
    /** 模型名称 */
    model: string;
    /** 消息列表 */
    messages: OllamaChatMessage[];
    /** 是否流式输出 */
    stream?: boolean;
    /** 生成参数 */
    options?: OllamaGenerateOptions;
}
/**
 * Ollama 聊天消息
 */
export interface OllamaChatMessage {
    /** 角色：system/user/assistant */
    role: 'system' | 'user' | 'assistant';
    /** 消息内容 */
    content: string;
    /** 图片（用于多模态模型） */
    images?: string[];
}
/**
 * Ollama 聊天响应
 */
export interface OllamaChatResponse {
    /** 模型名称 */
    model: string;
    /** 创建时间 */
    created_at: string;
    /** 消息 */
    message: OllamaChatMessage;
    /** 是否完成 */
    done: boolean;
}
/**
 * AI 服务提供商类型
 */
export type AIProvider = 'ollama' | 'openai' | 'custom';
/**
 * AI 服务配置
 */
export interface AIServiceConfig {
    /** 服务提供商 */
    provider: AIProvider;
    /** Ollama 配置 */
    ollama?: OllamaConfig;
    /** OpenAI 配置 */
    openai?: {
        apiKey: string;
        baseUrl?: string;
        defaultModel: string;
        timeout?: number;
        streamEnabled?: boolean;
        headers?: Record<string, string>;
        modelParams?: ModelParams;
    };
    /** 自定义服务配置 */
    custom?: {
        baseUrl: string;
        apiKey?: string;
        defaultModel: string;
        headers?: Record<string, string>;
        timeout?: number;
        streamEnabled?: boolean;
        modelParams?: ModelParams;
    };
}
