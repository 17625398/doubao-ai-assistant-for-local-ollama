export type OpenAICompatibleRole = 'system' | 'user' | 'assistant';
export interface OpenAICompatibleChatMessage {
    role: OpenAICompatibleRole;
    content: string;
    name?: string;
}
export interface OpenAICompatibleConfig {
    baseUrl: string;
    apiKey?: string;
    defaultModel: string;
    timeout: number;
    streamEnabled: boolean;
    headers?: Record<string, string>;
}
export interface OpenAICompatibleModel {
    id: string;
}
export declare class OpenAICompatibleClient {
    private config;
    constructor(config: OpenAICompatibleConfig);
    updateConfig(config: Partial<OpenAICompatibleConfig>): void;
    getConfig(): OpenAICompatibleConfig;
    private getBaseUrl;
    private buildHeaders;
    isAvailable(): Promise<boolean>;
    listModels(): Promise<OpenAICompatibleModel[]>;
    chat(params: {
        model?: string;
        messages: OpenAICompatibleChatMessage[];
        temperature?: number;
    }): Promise<{
        content: string;
    }>;
    chatStream(params: {
        model?: string;
        messages: OpenAICompatibleChatMessage[];
        temperature?: number;
    }, signal?: AbortSignal): AsyncGenerator<{
        delta: string;
    }, void, unknown>;
    generate(params: {
        prompt: string;
        system?: string;
        model?: string;
    }): Promise<{
        content: string;
    }>;
}
