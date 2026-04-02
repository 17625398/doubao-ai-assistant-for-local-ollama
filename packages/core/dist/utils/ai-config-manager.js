// AI 配置管理器 - 管理 Ollama 和其他 AI 服务的配置
import { OllamaClient, ollamaClient as globalOllamaClient } from './ollama-client';
import { logger } from './logger';
import { eventBus } from './event-bus';
/**
 * AI 配置管理器
 */
export class AIConfigManager {
    constructor() {
        this.storageKey = 'ai-service-config';
        this.config = this.getDefaultConfig();
        this.ollamaClient = new OllamaClient(this.config.ollama);
        globalOllamaClient.updateConfig(this.config.ollama || {});
        this.loadPromise = this.loadConfig();
        logger.info('AIConfigManager initialized');
    }
    static getInstance() {
        if (!AIConfigManager.instance) {
            AIConfigManager.instance = new AIConfigManager();
        }
        return AIConfigManager.instance;
    }
    /**
     * 获取默认配置
     */
    getDefaultConfig() {
        const isExtensionEnv = typeof chrome !== 'undefined' && Boolean(chrome?.runtime?.id) && Boolean(chrome?.storage?.local);
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
                defaultModel: 'fredrezones55/qwen3.5-opus:27b',
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
            ui: {
                theme: 'light',
                language: 'zh-CN',
                autoOpen: false,
                contextMenu: true,
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
    async loadConfig() {
        try {
            const isExtensionEnv = typeof chrome !== 'undefined' && Boolean(chrome?.runtime?.id) && Boolean(chrome?.storage?.local);
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
                    const parsed = JSON.parse(stored);
                    this.config = { ...this.getDefaultConfig(), ...parsed };
                    if (this.config.ollama) {
                        this.ollamaClient.updateConfig(this.config.ollama);
                        globalOllamaClient.updateConfig(this.config.ollama);
                    }
                    logger.info('AI config loaded from localStorage');
                }
            }
        }
        catch (error) {
            logger.error('Failed to load AI config:', error);
        }
    }
    /**
     * 保存配置到存储
     */
    async saveConfig() {
        try {
            const isExtensionEnv = typeof chrome !== 'undefined' && Boolean(chrome?.runtime?.id) && Boolean(chrome?.storage?.local);
            if (isExtensionEnv) {
                await chrome.storage.local.set({ [this.storageKey]: this.config });
                logger.info('AI config saved to chrome.storage');
            }
            else if (typeof window !== 'undefined' && window.localStorage) {
                localStorage.setItem(this.storageKey, JSON.stringify(this.config));
                logger.info('AI config saved to localStorage');
            }
        }
        catch (error) {
            logger.error('Failed to save AI config:', error);
        }
    }
    async ensureLoaded() {
        await this.loadPromise;
    }
    /**
     * 获取当前配置
     */
    getConfig() {
        return { ...this.config };
    }
    /**
     * 更新完整配置
     */
    async updateConfig(config) {
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
    getProvider() {
        return this.config.provider;
    }
    /**
     * 设置服务提供商
     */
    async setProvider(provider) {
        await this.updateConfig({ provider });
    }
    /**
     * 获取 Ollama 配置
     */
    getOllamaConfig() {
        return this.config.ollama ? { ...this.config.ollama } : undefined;
    }
    /**
     * 更新 Ollama 配置
     */
    async updateOllamaConfig(config) {
        const newConfig = {
            baseUrl: this.config.ollama?.baseUrl || 'http://192.168.0.32:11434',
            defaultModel: this.config.ollama?.defaultModel || 'fredrezones55/qwen3.5-opus:27b',
            timeout: this.config.ollama?.timeout || 30000,
            streamEnabled: this.config.ollama?.streamEnabled ?? true,
            ...config,
        };
        await this.updateConfig({ ollama: newConfig });
    }
    /**
     * 获取 Ollama 客户端实例
     */
    getOllamaClient() {
        return this.ollamaClient;
    }
    /**
     * 测试 Ollama 连接
     */
    async testOllamaConnection() {
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
        }
        catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            eventBus.emit('ollama:disconnected', undefined);
            return { success: false, error: errorMessage };
        }
    }
    /**
     * 获取可用的 Ollama 模型列表
     */
    async getOllamaModels() {
        try {
            const models = await this.ollamaClient.listModels();
            eventBus.emit('ollama:models-updated', models);
            return models;
        }
        catch (error) {
            logger.error('Failed to get Ollama models:', error);
            return [];
        }
    }
    /**
     * 获取默认模型名称
     */
    getDefaultModel() {
        switch (this.config.provider) {
            case 'ollama':
                return this.config.ollama?.defaultModel || 'llama2';
            case 'openai':
                return this.config.openai?.defaultModel || 'gpt-3.5-turbo';
            case 'custom':
                return this.config.custom?.defaultModel || '';
            default:
                return 'llama2';
        }
    }
    /**
     * 设置默认模型
     */
    async setDefaultModel(model) {
        switch (this.config.provider) {
            case 'ollama':
                await this.updateOllamaConfig({ defaultModel: model });
                break;
            case 'openai':
                await this.updateConfig({
                    openai: { ...this.config.openai, defaultModel: model },
                });
                break;
            case 'custom':
                await this.updateConfig({
                    custom: { ...this.config.custom, defaultModel: model },
                });
                break;
        }
    }
    /**
     * 更新代理配置
     */
    async updateProxyConfig(config) {
        await this.updateConfig({ proxy: config });
    }
    /**
     * 获取代理配置
     */
    getProxyConfig() {
        return this.config.proxy || { enabled: false, url: '' };
    }
    /**
     * 更新UI配置
     */
    async updateUIConfig(config) {
        const current = this.getUIConfig();
        const next = { ...current, ...config };
        await this.updateConfig({ ui: next });
    }
    /**
     * 获取UI配置
     */
    getUIConfig() {
        return this.config.ui || { theme: 'light', language: 'zh-CN', autoOpen: false, contextMenu: true };
    }
    /**
     * 更新隐私配置
     */
    async updatePrivacyConfig(config) {
        const current = this.getPrivacyConfig();
        const next = { ...current, ...config };
        await this.updateConfig({ privacy: next });
    }
    /**
     * 获取隐私配置
     */
    getPrivacyConfig() {
        return this.config.privacy || { saveChatHistory: true, shareUsageData: false };
    }
    /**
     * 更新模型参数
     */
    async updateModelParams(provider, params) {
        switch (provider) {
            case 'ollama':
                await this.updateConfig({
                    ollama: { ...this.config.ollama, modelParams: { ...this.config.ollama?.modelParams, ...params } },
                });
                break;
            case 'openai':
                await this.updateConfig({
                    openai: { ...this.config.openai, modelParams: { ...this.config.openai?.modelParams, ...params } },
                });
                break;
            case 'custom':
                await this.updateConfig({
                    custom: { ...this.config.custom, modelParams: { ...this.config.custom?.modelParams, ...params } },
                });
                break;
        }
    }
    /**
     * 获取模型参数
     */
    getModelParams(provider) {
        switch (provider) {
            case 'ollama':
                return this.config.ollama?.modelParams || { temperature: 0.7, maxTokens: 2048, topP: 0.9 };
            case 'openai':
                return this.config.openai?.modelParams || { temperature: 0.7, maxTokens: 2048, topP: 0.9 };
            case 'custom':
                return this.config.custom?.modelParams || { temperature: 0.7, maxTokens: 2048, topP: 0.9 };
            default:
                return { temperature: 0.7, maxTokens: 2048, topP: 0.9 };
        }
    }
    /**
     * 重置为默认配置
     */
    async resetToDefaults() {
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
    exportConfig() {
        return JSON.stringify(this.config, null, 2);
    }
    /**
     * 导入配置
     */
    async importConfig(configJson) {
        try {
            const config = JSON.parse(configJson);
            await this.updateConfig(config);
            logger.info('AI config imported');
        }
        catch (error) {
            logger.error('Failed to import AI config:', error);
            throw new Error('Invalid config format');
        }
    }
    /**
     * 验证配置
     */
    validateConfig() {
        const errors = [];
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
        return { valid: errors.length === 0, errors };
    }
}
/**
 * 全局 AI 配置管理器实例
 */
export const aiConfigManager = AIConfigManager.getInstance();
export default AIConfigManager;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYWktY29uZmlnLW1hbmFnZXIuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi9zcmMvdXRpbHMvYWktY29uZmlnLW1hbmFnZXIudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUEsb0NBQW9DO0FBR3BDLE9BQU8sRUFBRSxZQUFZLEVBQUUsWUFBWSxJQUFJLGtCQUFrQixFQUFFLE1BQU0saUJBQWlCLENBQUM7QUFDbkYsT0FBTyxFQUFFLE1BQU0sRUFBRSxNQUFNLFVBQVUsQ0FBQztBQUNsQyxPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0sYUFBYSxDQUFDO0FBYXZDOztHQUVHO0FBQ0gsTUFBTSxPQUFPLGVBQWU7SUFPMUI7UUFIUSxlQUFVLEdBQUcsbUJBQW1CLENBQUM7UUFJdkMsSUFBSSxDQUFDLE1BQU0sR0FBRyxJQUFJLENBQUMsZ0JBQWdCLEVBQUUsQ0FBQztRQUN0QyxJQUFJLENBQUMsWUFBWSxHQUFHLElBQUksWUFBWSxDQUFDLElBQUksQ0FBQyxNQUFNLENBQUMsTUFBTSxDQUFDLENBQUM7UUFDekQsa0JBQWtCLENBQUMsWUFBWSxDQUFDLElBQUksQ0FBQyxNQUFNLENBQUMsTUFBTSxJQUFJLEVBQUUsQ0FBQyxDQUFDO1FBQzFELElBQUksQ0FBQyxXQUFXLEdBQUcsSUFBSSxDQUFDLFVBQVUsRUFBRSxDQUFDO1FBQ3JDLE1BQU0sQ0FBQyxJQUFJLENBQUMsNkJBQTZCLENBQUMsQ0FBQztJQUM3QyxDQUFDO0lBRUQsTUFBTSxDQUFDLFdBQVc7UUFDaEIsSUFBSSxDQUFDLGVBQWUsQ0FBQyxRQUFRLEVBQUUsQ0FBQztZQUM5QixlQUFlLENBQUMsUUFBUSxHQUFHLElBQUksZUFBZSxFQUFFLENBQUM7UUFDbkQsQ0FBQztRQUNELE9BQU8sZUFBZSxDQUFDLFFBQVEsQ0FBQztJQUNsQyxDQUFDO0lBRUQ7O09BRUc7SUFDSyxnQkFBZ0I7UUFDdEIsTUFBTSxjQUFjLEdBQ2xCLE9BQU8sTUFBTSxLQUFLLFdBQVcsSUFBSSxPQUFPLENB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Q2hDLE1BQU0sQ0FBQyxJQUFJLENBQUMsNkJBQTZCLENBQUMsQ0FBQztZQUM3QyxDQUFDO1lBQ0QsSUFBSSxDQUFDLElBQUksQ0FBQyxNQUFNLENBQUMsTUFBTSxDQUFDLFlBQVksRUFBRSxDQUFDO2dCQUNyQyxNQUFNLENBQUMsSUFBSSxDQUFDLGtDQUFrQyxDQUFDLENBQUM7WUFDbEQsQ0FBQztRQUNILENBQUM7UUFFRCxVQUFVO1FBQ1YsSUFBSSxJQUFJLENBQUMsTUFBTSxDQUFDLFFBQVEsS0FBSyxRQUFRLElBQUksSUFBSSxDQUFDLE1BQU0sQ0FBQyxNQUFNLEVBQUUsQ0FBQztZQUM1RCxJQUFJLENBQUMsSUFBSSxDQUFDLE1BQU0sQ0FBQyxNQUFNLENBQUMsT0FBTyxFQUFFLENBQUM7Z0JBQ2hDLE1BQU0sQ0FBQyxJQUFJLENBQUMsNkJBQTZCLENBQUMsQ0FBQztZQUM3QyxDQUFDO1lBQ0QsSUFBSSxDQUFDLElBQUksQ0FBQyxNQUFNLENBQUMsTUFBTSxDQUFDLFlBQVksRUFBRSxDQUFDO2dCQUNyQyxNQUFNLENBQUMsSUFBSSxDQUFDLGtDQUFrQyxDQUFDLENBQUM7WUFDbEQsQ0FBQztRQUNILENBQUM7UUFFRCxPQUFPLEVBQUUsS0FBSyxFQUFFLE1BQU0sQ0FBQyxNQUFNLEtBQUssQ0FBQyxFQUFFLE1BQU0sRUFBRSxDQUFDO0lBQ2hELENBQUM7Q0FDRjtBQUVEOztHQUVHO0FBQ0gsTUFBTSxDQUFDLE1BQU0sZUFBZSxHQUFHLGVBQWUsQ0FBQyxXQUFXLEVBQUUsQ0FBQztBQUU3RCxlQUFlLGVBQWUsQ0FBQyIsInNvdXJjZXNDb250ZW50IjpbIi8vIEFJIOmFjee9rueuoeeQhuWZqCAtIOeuoeeQhiBPbGxhbWEg5ZKM5YW25LuWIEFJIOacjeWKoeeahOmFjee9rlxuXG5pbXBvcnQgeyBBSVNlcnZpY2VDb25maWcsIEFJUHJvdmlkZXIsIE9sbGFtYUNvbmZpZywgT2xsYW1hTW9kZWwsIE9wZW5BSUNvbmZpZywgQ3VzdG9tU2VydmljZUNvbmZpZywgTW9kZWxQYXJhbXMsIFByb3h5Q29uZmlnLCBVSUNvbmZpZywgUHJpdmFjeUNvbmZpZyB9IGZyb20gJy4uL3R5cGVzJztcbmltcG9ydCB7IE9sbGFtYUNsaWVudCwgb2xsYW1hQ2xpZW50IGFzIGdsb2JhbE9sbGFtYUNsaWVudCB9IGZyb20gJy4vb2xsYW1hLWNsaWVudCc7XG5pbXBvcnQgeyBsb2dnZXIgfSBmcm9tICcuL2xvZ2dlcic7XG5pbXBvcnQgeyBldmVudEJ1cyB9IGZyb20gJy4vZXZlbnQtYnVzJztcblxuLyoqXG4gKiBBSSDphY3nva7nrqHnkIblmajkuovku7ZcbiAqL1xuZXhwb3J0IGludGVyZmFjZSBBSUNvbmZpZ0V2ZW50cyB7XG4gICdhaS1jb25maWc6Y2hhbmdlZCc6IEFJU2VydmljZUNvbmZpZztcbiAgJ2FpLWNvbmZpZzpwcm92aWRlci1jaGFuZ2VkJzogQUlQcm92aWRlcjtcbiAgJ29sbGFtYTpjb25uZWN0ZWQnOiB7IHZlcnNpb246IHN0cmluZyB9O1xuICAnb2xsYW1hOmRpc2Nvbm5lY3RlZCc6IHZvaWQ7XG4gICdvbGxhbWE6bW9kZWxzLXVwZGF0ZWQnOiBPbGxhbWFNb2RlbFtdO1xufVxuXG4vKipcbiAqIEFJIOmFjee9rueuoeeQhuWZqFxuICovXG5leHBvcnQgY2xhc3MgQUlDb25maWdNYW5hZ2VyIHtcbiAgcHJpdmF0ZSBzdGF0aWMgaW5zdGFuY2U6IEFJQ29uZmlnTWFuYWdlcjtcbiAgcHJpdmF0ZSBjb25maWc6IEFJU2VydmljZUNvbmZpZztcbiAgcHJpdmF0ZSBvbGxhbWFDbGllbnQ6IE9sbGFtYUNsaWVudDtcbiAgcHJpdmF0ZSBzdG9yYWdlS2V5ID0gJ2FpLXNlcnZpY2UtY29uZmlnJztcbiAgcHJpdmF0ZSBsb2FkUHJvbWlzZTogUHJvbWlzZTx2b2lkPjtcblxuICBwcml2YXRlIGNvbnN0cnVjdG9yKCkge1xuICAgIHRoaXMuY29uZmlnID0gdGhpcy5nZXREZWZhdWx0Q29uZmlnKCk7XG4gICAgdGhpcy5vbGxhbWFDbGllbnQgPSBuZXcgT2xsYW1hQ2xpZW50KHRoaXMuY29uZmlnLm9sbGFtYSk7XG4gICAgZ2xvYmFsT2xsYW1hQ2xpZW50LnVwZGF0ZUNvbmZpZyh0aGlzLmNvbmZpZy5vbGxhbWEgfHwge30pO1xuICAgIHRoaXMubG9hZFByb21pc2UgPSB0aGlzLmxvYWRDb25maWcoKTtcbiAgICBsb2dnZXIuaW5mbygnQUlDb25maWdNYW5hZ2VyIGluaXRpYWxpemVkJyk7XG4gIH1cblxuICBzdGF0aWMgZ2V0SW5zdGFuY2UoKTogQUlDb25maWdNYW5hZ2VyIHtcbiAgICBpZiAoIUFJQ29uZmlnTWFuYWdlci5pbnN0YW5jZSkge1xuICAgICAgQUlDb25maWdNYW5hZ2VyLmluc3RhbmNlID0gbmV3IEFJQ29uZmlnTWFuYWdlcigpO1xuICAgIH1cbiAgICByZXR1cm4gQUlDb25maWdNYW5hZ2VyLmluc3RhbmNlO1xuICB9XG5cbiAgLyoqXG4gICAqIOiOt+WPlum7mOiupOmFjee9rlxuICAgKi9cbiAgcHJpdmF0ZSBnZXREZWZhdWx0Q29uZmlnKCk6IEFJU2VydmljZUNvbmZpZyB7XG4gICAgY29uc3QgaXNFeHRlbnNpb25FbnYgPVxuICAgICAgdHlwZW9mIGNocm9tZSAhPT0gJ3VuZGVmaW5lZCcgJiYgQm9vbGVhbihjaHJvbWU/LnJ1bnRpbWU/LmlkKSAmJiBCb29sZWFuKGNocm9tZT8uc3RvcmFnZT8ubG9jYWwpO1xuICAgIGNvbnN0IG9sbGFtYUJhc2VVcmwgPSBpc0V4dGVuc2lvbkVudiA/ICdodHRwOi8vMTkyLjE2OC4wLjMyOjExNDM0JyA6ICcvYXBpL29sbGFtYSc7XG4gICAgcmV0dXJuIHtcbiAgICAgIHZlcnNpb246ICcxLjAuMCcsXG4gICAgICBwcm92aWRlcjogJ29sbGFtYScsXG4gICAgICBwcm94eToge1xuICAgICAgICBlbmFibGVkOiBmYWxzZSxcbiAgICAgICAgdXJsOiAnJyxcbiAgICAgIH0sXG4gICAgICBvbGxhbWE6IHtcbiAgICAgICAgYmFzZVVybDogb2xsYW1hQmFzZVVybCxcbiAgICAgICAgZGVmYXVsdE1vZGVsOiAnZnJlZHJlem9uZXM1NS9xd2VuMy41LW9wdXM6MjdiJyxcbiAgICAgICAgdGltZW91dDogMzAwMDAsXG4gICAgICAgIHN0cmVhbUVuYWJsZWQ6IHRydWUsXG4gICAgICAgIGhlYWRlcnM6IHt9LFxuICAgICAgICBtb2RlbFBhcmFtczoge1xuICAgICAgICAgIHRlbXBlcmF0dXJlOiAwLjcsXG4gICAgICAgICAgbWF4VG9rZW5zOiAyMDQ4LFxuICAgICAgICAgIHRvcFA6IDAuOSxcbiAgICAgICAgfSxcbiAgICAgIH0sXG4gICAgICBvcGVuYWk6IHtcbiAgICAgICAgYXBpS2V5OiAnJyxcbiAgICAgICAgYmFzZVVybDogJ2h0dHBzOi8vYXBpLm9wZW5haS5jb20vdjEnLFxuICAgICAgICBkZWZhdWx0TW9kZWw6ICdncHQtMy41LXR1cmJvJyxcbiAgICAgICAgdGltZW91dDogMzAwMDAsXG4gICAgICAgIHN0cmVhbUVuYWJsZWQ6IHRydWUsXG4gICAgICAgIGhlYWRlcnM6IHt9LFxuICAgICAgICBtb2RlbFBhcmFtczoge1xuICAgICAgICAgIHRlbXBlcmF0dXJlOiAwLjcsXG4gICAgICAgICAgbWF4VG9rZW5zOiAyMDQ4LFxuICAgICAgICAgIHRvcFA6IDAuOSxcbiAgICAgICAgfSxcbiAgICAgIH0sXG4gICAgICBjdXN0b206IHtcbiAgICAgICAgYmFzZVVybDogJ2h0dHA6Ly9sb2NhbGhvc3Q6MTIzNC92MScsXG4gICAgICAgIGFwaUtleTogJycsXG4gICAgICAgIGRlZmF1bHRNb2RlbDogJycsXG4gICAgICAgIHRpbWVvdXQ6IDMwMDAwLFxuICAgICAgICBzdHJlYW1FbmFibGVkOiB0cnVlLFxuICAgICAgICBoZWFkZXJzOiB7fSxcbiAgICAgICAgbW9kZWxQYXJhbXM6IHtcbiAgICAgICAgICB0ZW1wZXJhdHVyZTogMC43LFxuICAgICAgICAgIG1heFRva2VuczogMjA0OCxcbiAgICAgICAgICB0b3BQOiAwLjksXG4gICAgICAgIH0sXG4gICAgICB9LFxuICAgICAgdWk6IHtcbiAgICAgICAgdGhlbWU6ICdsaWdodCcsXG4gICAgICAgIGxhbmd1YWdlOiAnemgtQ04nLFxuICAgICAgICBhdXRvT3BlbjogZmFsc2UsXG4gICAgICAgIGNvbnRleHRNZW51OiB0cnVlLFxuICAgICAgfSxcbiAgICAgIHByaXZhY3k6IHtcbiAgICAgICAgc2F2ZUNoYXRIaXN0b3J5OiB0cnVlLFxuICAgICAgICBzaGFyZVVzYWdlRGF0YTogZmFsc2UsXG4gICAgICB9LFxuICAgIH07XG4gIH1cblxuICAvKipcbiAgICog5LuO5a2Y5YKo5Yqg6L296YWN572uXG4gICAqL1xuICBwcml2YXRlIGFzeW5jIGxvYWRDb25maWcoKTogUHJvbWlzZTx2b2lkPiB7XG4gICAgdHJ5IHtcbiAgICAgIGNvbnN0IGlzRXh0ZW5zaW9uRW52ID1cbiAgICAgICAgdHlwZW9mIGNocm9tZSAhPT0gJ3VuZGVmaW5lZCcgJiYgQm9vbGVhbihjaHJvbWU/LnJ1bnRpbWU/LmlkKSAmJiBCb29sZWFuKGNocm9tZT8uc3RvcmFnZT8ubG9jYWwpO1xuXG4gICAgICBpZiAoaXNFeHRlbnNpb25FbnYpIHtcbiAgICAgICAgY29uc3QgcmVzdWx0ID0gYXdhaXQgY2hyb21lLnN0b3JhZ2UubG9jYWwuZ2V0KHRoaXMuc3RvcmFnZUtleSk7XG4gICAgICAgIGlmIChyZXN1bHRbdGhpcy5zdG9yYWdlS2V5XSkge1xuICAgICAgICAgIHRoaXMuY29uZmlnID0geyAuLi50aGlzLmdldERlZmF1bHRDb25maWcoKSwgLi4ucmVzdWx0W3RoaXMuc3RvcmFnZUtleV0gfTtcbiAgICAgICAgICBpZiAodGhpcy5jb25maWcub2xsYW1hKSB7XG4gICAgICAgICAgICBjb25zdCBiYXNlVXJsID0gU3RyaW5nKHRoaXMuY29uZmlnLm9sbGFtYS5iYXNlVXJsIHx8ICcnKS50cmltKCk7XG4gICAgICAgICAgICBpZiAoYmFzZVVybC5zdGFydHNXaXRoKCcvJykpIHtcbiAgICAgICAgICAgICAgdGhpcy5jb25maWcub2xsYW1hLmJhc2VVcmwgPSAnaHR0cDovLzE5Mi4xNjguMC4zMjoxMTQzNCc7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICB0aGlzLm9sbGFtYUNsaWVudC51cGRhdGVDb25maWcodGhpcy5jb25maWcub2xsYW1hKTtcbiAgICAgICAgICAgIGdsb2JhbE9sbGFtYUNsaWVudC51cGRhdGVDb25maWcodGhpcy5jb25maWcub2xsYW1hKTtcbiAgICAgICAgICB9XG4gICAgICAgICAgbG9nZ2VyLmluZm8oJ0FJIGNvbmZpZyBsb2FkZWQgZnJvbSBjaHJvbWUuc3RvcmFnZScpO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgICBlbHNlIGlmICh0eXBlb2Ygd2luZG93ICE9PSAndW5kZWZpbmVkJyAmJiB3aW5kb3cubG9jYWxTdG9yYWdlKSB7XG4gICAgICAgIGNvbnN0IHN0b3JlZCA9IGxvY2FsU3RvcmFnZS5nZXRJdGVtKHRoaXMuc3RvcmFnZUtleSk7XG4gICAgICAgIGlmIChzdG9yZWQpIHtcbiAgICAgICAgICBjb25zdCBwYXJzZWQgPSBKU09OLnBhcnNlKHN0b3JlZCkgYXMgQUlTZXJ2aWNlQ29uZmlnO1xuICAgICAgICAgIHRoaXMuY29uZmlnID0geyAuLi50aGlzLmdldERlZmF1bHRDb25maWcoKSwgLi4ucGFyc2VkIH07XG4gICAgICAgICAgaWYgKHRoaXMuY29uZmlnLm9sbGFtYSkge1xuICAgICAgICAgICAgdGhpcy5vbGxhbWFDbGllbnQudXBkYXRlQ29uZmlnKHRoaXMuY29uZmlnLm9sbGFtYSk7XG4gICAgICAgICAgICBnbG9iYWxPbGxhbWFDbGllbnQudXBkYXRlQ29uZmlnKHRoaXMuY29uZmlnLm9sbGFtYSk7XG4gICAgICAgICAgfVxuICAgICAgICAgIGxvZ2dlci5pbmZvKCdBSSBjb25maWcgbG9hZGVkIGZyb20gbG9jYWxTdG9yYWdlJyk7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9IGNhdGNoIChlcnJvcikge1xuICAgICAgbG9nZ2VyLmVycm9yKCdGYWlsZWQgdG8gbG9hZCBBSSBjb25maWc6JywgZXJyb3IpO1xuICAgIH1cbiAgfVxuXG4gIC8qKlxuICAgKiDkv53lrZjphY3nva7liLDlrZjlgqhcbiAgICovXG4gIHByaXZhdGUgYXN5bmMgc2F2ZUNvbmZpZygpOiBQcm9taXNlPHZvaWQ+IHtcbiAgICB0cnkge1xuICAgICAgY29uc3QgaXNFeHRlbnNpb25FbnYgPVxuICAgICAgICB0eXBlb2YgY2hyb21lICE9PSAndW5kZWZpbmVkJyAmJiBCb29sZWFuKGNocm9tZT8ucnVudGltZT8uaWQpICYmIEJvb2xlYW4oY2hyb21lPy5zdG9yYWdlPy5sb2NhbCk7XG5cbiAgICAgIGlmIChpc0V4dGVuc2lvbkVudikge1xuICAgICAgICBhd2FpdCBjaHJvbWUuc3RvcmFnZS5sb2NhbC5zZXQoeyBbdGhpcy5zdG9yYWdlS2V5XTogdGhpcy5jb25maWcgfSk7XG4gICAgICAgIGxvZ2dlci5pbmZvKCdBSSBjb25maWcgc2F2ZWQgdG8gY2hyb21lLnN0b3JhZ2UnKTtcbiAgICAgIH1cbiAgICAgIGVsc2UgaWYgKHR5cGVvZiB3aW5kb3cgIT09ICd1bmRlZmluZWQnICYmIHdpbmRvdy5sb2NhbFN0b3JhZ2UpIHtcbiAgICAgICAgbG9jYWxTdG9yYWdlLnNldEl0ZW0odGhpcy5zdG9yYWdlS2V5LCBKU09OLnN0cmluZ2lmeSh0aGlzLmNvbmZpZykpO1xuICAgICAgICBsb2dnZXIuaW5mbygnQUkgY29uZmlnIHNhdmVkIHRvIGxvY2FsU3RvcmFnZScpO1xuICAgICAgfVxuICAgIH0gY2F0Y2ggKGVycm9yKSB7XG4gICAgICBsb2dnZXIuZXJyb3IoJ0ZhaWxlZCB0byBzYXZlIEFJIGNvbmZpZzonLCBlcnJvcik7XG4gICAgfVxuICB9XG5cbiAgYXN5bmMgZW5zdXJlTG9hZGVkKCk6IFByb21pc2U8dm9pZD4ge1xuICAgIGF3YWl0IHRoaXMubG9hZFByb21pc2U7XG4gIH1cblxuICAvKipcbiAgICog6I635Y+W5b2T5YmN6YWN572uXG4gICAqL1xuICBnZXRDb25maWcoKTogQUlTZXJ2aWNlQ29uZmlnIHtcbiAgICByZXR1cm4geyAuLi50aGlzLmNvbmZpZyB9O1xuICB9XG5cbiAgLyoqXG4gICAqIOabtOaWsOWujOaVtOmFjee9rlxuICAgKi9cbiAgYXN5bmMgdXBkYXRlQ29uZmlnKGNvbmZpZzogUGFydGlhbDxBSVNlcnZpY2VDb25maWc+KTogUHJvbWlzZTx2b2lkPiB7XG4gICAgY29uc3Qgb2xkUHJvdmlkZXIgPSB0aGlzLmNvbmZpZy5wcm92aWRlcjtcbiAgICB0aGlzLmNvbmZpZyA9IHsgLi4udGhpcy5jb25maWcsIC4uLmNvbmZpZyB9O1xuXG4gICAgaWYgKGNvbmZpZy5vbGxhbWEpIHtcbiAgICAgIHRoaXMub2xsYW1hQ2xpZW50LnVwZGF0ZUNvbmZpZyhjb25maWcub2xsYW1hKTtcbiAgICAgIGdsb2JhbE9sbGFtYUNsaWVudC51cGRhdGVDb25maWcoY29uZmlnLm9sbGFtYSk7XG4gICAgfVxuXG4gICAgYXdhaXQgdGhpcy5zYXZlQ29uZmlnKCk7XG5cbiAgICAvLyDop6blj5Hkuovku7ZcbiAgICBldmVudEJ1cy5lbWl0KCdhaS1jb25maWc6Y2hhbmdlZCcsIHRoaXMuY29uZmlnKTtcbiAgICBpZiAoY29uZmlnLnByb3ZpZGVyICYmIGNvbmZpZy5wcm92aWRlciAhPT0gb2xkUHJvdmlkZXIpIHtcbiAgICAgIGV2ZW50QnVzLmVtaXQoJ2FpLWNvbmZpZzpwcm92aWRlci1jaGFuZ2VkJywgY29uZmlnLnByb3ZpZGVyKTtcbiAgICB9XG5cbiAgICBsb2dnZXIuaW5mbygnQUkgY29uZmlnIHVwZGF0ZWQ6JywgdGhpcy5jb25maWcpO1xuICB9XG5cbiAgLyoqXG4gICAqIOiOt+WPluW9k+WJjeacjeWKoeaPkOS+m+WVhlxuICAgKi9cbiAgZ2V0UHJvdmlkZXIoKTogQUlQcm92aWRlciB7XG4gICAgcmV0dXJuIHRoaXMuY29uZmlnLnByb3ZpZGVyO1xuICB9XG5cbiAgLyoqXG4gICAqIOiuvue9ruacjeWKoeaPkOS+m+WVhlxuICAgKi9cbiAgYXN5bmMgc2V0UHJvdmlkZXIocHJvdmlkZXI6IEFJUHJvdmlkZXIpOiBQcm9taXNlPHZvaWQ+IHtcbiAgICBhd2FpdCB0aGlzLnVwZGF0ZUNvbmZpZyh7IHByb3ZpZGVyIH0pO1xuICB9XG5cbiAgLyoqXG4gICAqIOiOt+WPliBPbGxhbWEg6YWN572uXG4gICAqL1xuICBnZXRPbGxhbWFDb25maWcoKTogT2xsYW1hQ29uZmlnIHwgdW5kZWZpbmVkIHtcbiAgICByZXR1cm4gdGhpcy5jb25maWcub2xsYW1hID8geyAuLi50aGlzLmNvbmZpZy5vbGxhbWEgfSA6IHVuZGVmaW5lZDtcbiAgfVxuXG4gIC8qKlxuICAgKiDmm7TmlrAgT2xsYW1hIOmFjee9rlxuICAgKi9cbiAgYXN5bmMgdXBkYXRlT2xsYW1hQ29uZmlnKGNvbmZpZzogUGFydGlhbDxPbGxhbWFDb25maWc+KTogUHJvbWlzZTx2b2lkPiB7XG4gICAgY29uc3QgbmV3Q29uZmlnOiBPbGxhbWFDb25maWcgPSB7XG4gICAgICBiYXNlVXJsOiB0aGlzLmNvbmZpZy5vbGxhbWE/LmJhc2VVcmwgfHwgJ2h0dHA6Ly8xOTIuMTY4LjAuMzI6MTE0MzQnLFxuICAgICAgZGVmYXVsdE1vZGVsOiB0aGlzLmNvbmZpZy5vbGxhbWE/LmRlZmF1bHRNb2RlbCB8fCAnZnJlZHJlem9uZXM1NS9xd2VuMy41LW9wdXM6MjdiJyxcbiAgICAgIHRpbWVvdXQ6IHRoaXMuY29uZmlnLm9sbGFtYT8udGltZW91dCB8fCAzMDAwMCxcbiAgICAgIHN0cmVhbUVuYWJsZWQ6IHRoaXMuY29uZmlnLm9sbGFtYT8uc3RyZWFtRW5hYmxlZCA/PyB0cnVlLFxuICAgICAgLi4uY29uZmlnLFxuICAgIH07XG4gICAgYXdhaXQgdGhpcy51cGRhdGVDb25maWcoeyBvbGxhbWE6IG5ld0NvbmZpZyB9KTtcbiAgfVxuXG4gIC8qKlxuICAgKiDojrflj5YgT2xsYW1hIOWuouaIt+err+WunuS+i1xuICAgKi9cbiAgZ2V0T2xsYW1hQ2xpZW50KCk6IE9sbGFtYUNsaWVudCB7XG4gICAgcmV0dXJuIHRoaXMub2xsYW1hQ2xpZW50O1xuICB9XG5cbiAgLyoqXG4gICAqIOa1i+ivlSBPbGxhbWEg6L+e5o6lXG4gICAqL1xuICBhc3luYyB0ZXN0T2xsYW1hQ29ubmVjdGlvbigpOiBQcm9taXNlPHsgc3VjY2VzczogYm9vbGVhbjsgdmVyc2lvbj86IHN0cmluZzsgZXJyb3I/OiBzdHJpbmcgfT4ge1xuICAgIHRyeSB7XG4gICAgICBjb25zdCBpc0F2YWlsYWJsZSA9IGF3YWl0IHRoaXMub2xsYW1hQ2xpZW50LmlzQXZhaWxhYmxlKCk7XG4gICAgICBpZiAoaXNBdmFpbGFibGUpIHtcbiAgICAgICAgLy8g5bCd6K+V6I635Y+W54mI5pys5L+h5oGvXG4gICAgICAgIGNvbnN0IG1vZGVscyA9IGF3YWl0IHRoaXMub2xsYW1hQ2xpZW50Lmxpc3RNb2RlbHMoKTtcbiAgICAgICAgZXZlbnRCdXMuZW1pdCgnb2xsYW1hOmNvbm5lY3RlZCcsIHsgdmVyc2lvbjogJ3Vua25vd24nIH0pO1xuICAgICAgICBldmVudEJ1cy5lbWl0KCdvbGxhbWE6bW9kZWxzLXVwZGF0ZWQnLCBtb2RlbHMpO1xuICAgICAgICByZXR1cm4geyBzdWNjZXNzOiB0cnVlLCB2ZXJzaW9uOiAnY29ubmVjdGVkJyB9O1xuICAgICAgfVxuICAgICAgcmV0dXJuIHsgc3VjY2VzczogZmFsc2UsIGVycm9yOiAnU2VydmljZSBub3QgYXZhaWxhYmxlJyB9O1xuICAgIH0gY2F0Y2ggKGVycm9yKSB7XG4gICAgICBjb25zdCBlcnJvck1lc3NhZ2UgPSBlcnJvciBpbnN0YW5jZW9mIEVycm9yID8gZXJyb3IubWVzc2FnZSA6ICdVbmtub3duIGVycm9yJztcbiAgICAgIGV2ZW50QnVzLmVtaXQoJ29sbGFtYTpkaXNjb25uZWN0ZWQnLCB1bmRlZmluZWQpO1xuICAgICAgcmV0dXJuIHsgc3VjY2VzczogZmFsc2UsIGVycm9yOiBlcnJvck1lc3NhZ2UgfTtcbiAgICB9XG4gIH1cblxuICAvKipcbiAgICog6I635Y+W5Y+v55So55qEIE9sbGFtYSDmqKHlnovliJfooahcbiAgICovXG4gIGFzeW5jIGdldE9sbGFtYU1vZGVscygpOiBQcm9taXNlPE9sbGFtYU1vZGVsW10+IHtcbiAgICB0cnkge1xuICAgICAgY29uc3QgbW9kZWxzID0gYXdhaXQgdGhpcy5vbGxhbWFDbGllbnQubGlzdE1vZGVscygpO1xuICAgICAgZXZlbnRCdXMuZW1pdCgnb2xsYW1hOm1vZGVscy11cGRhdGVkJywgbW9kZWxzKTtcbiAgICAgIHJldHVybiBtb2RlbHM7XG4gICAgfSBjYXRjaCAoZXJyb3IpIHtcbiAgICAgIGxvZ2dlci5lcnJvcignRmFpbGVkIHRvIGdldCBPbGxhbWEgbW9kZWxzOicsIGVycm9yKTtcbiAgICAgIHJldHVybiBbXTtcbiAgICB9XG4gIH1cblxuICAvKipcbiAgICog6I635Y+W6buY6K6k5qih5Z6L5ZCN56ewXG4gICAqL1xuICBnZXREZWZhdWx0TW9kZWwoKTogc3RyaW5nIHtcbiAgICBzd2l0Y2ggKHRoaXMuY29uZmlnLnByb3ZpZGVyKSB7XG4gICAgICBjYXNlICdvbGxhbWEnOlxuICAgICAgICByZXR1cm4gdGhpcy5jb25maWcub2xsYW1hPy5kZWZhdWx0TW9kZWwgfHwgJ2xsYW1hMic7XG4gICAgICBjYXNlICdvcGVuYWknOlxuICAgICAgICByZXR1cm4gdGhpcy5jb25maWcub3BlbmFpPy5kZWZhdWx0TW9kZWwgfHwgJ2dwdC0zLjUtdHVyYm8nO1xuICAgICAgY2FzZSAnY3VzdG9tJzpcbiAgICAgICAgcmV0dXJuIHRoaXMuY29uZmlnLmN1c3RvbT8uZGVmYXVsdE1vZGVsIHx8ICcnO1xuICAgICAgZGVmYXVsdDpcbiAgICAgICAgcmV0dXJuICdsbGFtYTInO1xuICAgIH1cbiAgfVxuXG4gIC8qKlxuICAgKiDorr7nva7pu5jorqTmqKHlnotcbiAgICovXG4gIGFzeW5jIHNldERlZmF1bHRNb2RlbChtb2RlbDogc3RyaW5nKTogUHJvbWlzZTx2b2lkPiB7XG4gICAgc3dpdGNoICh0aGlzLmNvbmZpZy5wcm92aWRlcikge1xuICAgICAgY2FzZSAnb2xsYW1hJzpcbiAgICAgICAgYXdhaXQgdGhpcy51cGRhdGVPbGxhbWFDb25maWcoeyBkZWZhdWx0TW9kZWw6IG1vZGVsIH0pO1xuICAgICAgICBicmVhaztcbiAgICAgIGNhc2UgJ29wZW5haSc6XG4gICAgICAgIGF3YWl0IHRoaXMudXBkYXRlQ29uZmlnKHtcbiAgICAgICAgICBvcGVuYWk6IHsgLi4udGhpcy5jb25maWcub3BlbmFpLCBkZWZhdWx0TW9kZWw6IG1vZGVsIH0gYXMgYW55LFxuICAgICAgICB9KTtcbiAgICAgICAgYnJlYWs7XG4gICAgICBjYXNlICdjdXN0b20nOlxuICAgICAgICBhd2FpdCB0aGlzLnVwZGF0ZUNvbmZpZyh7XG4gICAgICAgICAgY3VzdG9tOiB7IC4uLnRoaXMuY29uZmlnLmN1c3RvbSwgZGVmYXVsdE1vZGVsOiBtb2RlbCB9IGFzIGFueSxcbiAgICAgICAgfSk7XG4gICAgICAgIGJyZWFrO1xuICAgIH1cbiAgfVxuXG4gIC8qKlxuICAgKiDmm7TmlrDku6PnkIbphY3nva5cbiAgICovXG4gIGFzeW5jIHVwZGF0ZVByb3h5Q29uZmlnKGNvbmZpZzogeyBlbmFibGVkOiBib29sZWFuOyB1cmw6IHN0cmluZyB9KTogUHJvbWlzZTx2b2lkPiB7XG4gICAgYXdhaXQgdGhpcy51cGRhdGVDb25maWcoeyBwcm94eTogY29uZmlnIH0pO1xuICB9XG5cbiAgLyoqXG4gICAqIOiOt+WPluS7o+eQhumFjee9rlxuICAgKi9cbiAgZ2V0UHJveHlDb25maWcoKTogeyBlbmFibGVkOiBib29sZWFuOyB1cmw6IHN0cmluZyB9IHtcbiAgICByZXR1cm4gdGhpcy5jb25maWcucHJveHkgfHwgeyBlbmFibGVkOiBmYWxzZSwgdXJsOiAnJyB9O1xuICB9XG5cbiAgLyoqXG4gICAqIOabtOaWsFVJ6YWN572uXG4gICAqL1xuICBhc3luYyB1cGRhdGVVSUNvbmZpZyhjb25maWc6IHsgdGhlbWU/OiBzdHJpbmc7IGxhbmd1YWdlPzogc3RyaW5nOyBhdXRvT3Blbj86IGJvb2xlYW47IGNvbnRleHRNZW51PzogYm9vbGVhbiB9KTogUHJvbWlzZTx2b2lkPiB7XG4gICAgY29uc3QgY3VycmVudCA9IHRoaXMuZ2V0VUlDb25maWcoKTtcbiAgICBjb25zdCBuZXh0OiBVSUNvbmZpZyA9IHsgLi4uY3VycmVudCwgLi4uY29uZmlnIH07XG4gICAgYXdhaXQgdGhpcy51cGRhdGVDb25maWcoeyB1aTogbmV4dCB9KTtcbiAgfVxuXG4gIC8qKlxuICAgKiDojrflj5ZVSemFjee9rlxuICAgKi9cbiAgZ2V0VUlDb25maWcoKTogeyB0aGVtZTogc3RyaW5nOyBsYW5ndWFnZTogc3RyaW5nOyBhdXRvT3BlbjogYm9vbGVhbjsgY29udGV4dE1lbnU6IGJvb2xlYW4gfSB7XG4gICAgcmV0dXJuIHRoaXMuY29uZmlnLnVpIHx8IHsgdGhlbWU6ICdsaWdodCcsIGxhbmd1YWdlOiAnemgtQ04nLCBhdXRvT3BlbjogZmFsc2UsIGNvbnRleHRNZW51OiB0cnVlIH07XG4gIH1cblxuICAvKipcbiAgICog5pu05paw6ZqQ56eB6YWN572uXG4gICAqL1xuICBhc3luYyB1cGRhdGVQcml2YWN5Q29uZmlnKGNvbmZpZzogeyBzYXZlQ2hhdEhpc3Rvcnk/OiBib29sZWFuOyBzaGFyZVVzYWdlRGF0YT86IGJvb2xlYW4gfSk6IFByb21pc2U8dm9pZD4ge1xuICAgIGNvbnN0IGN1cnJlbnQgPSB0aGlzLmdldFByaXZhY3lDb25maWcoKTtcbiAgICBjb25zdCBuZXh0OiBQcml2YWN5Q29uZmlnID0geyAuLi5jdXJyZW50LCAuLi5jb25maWcgfTtcbiAgICBhd2FpdCB0aGlzLnVwZGF0ZUNvbmZpZyh7IHByaXZhY3k6IG5leHQgfSk7XG4gIH1cblxuICAvKipcbiAgICog6I635Y+W6ZqQ56eB6YWN572uXG4gICAqL1xuICBnZXRQcml2YWN5Q29uZmlnKCk6IHsgc2F2ZUNoYXRIaXN0b3J5OiBib29sZWFuOyBzaGFyZVVzYWdlRGF0YTogYm9vbGVhbiB9IHtcbiAgICByZXR1cm4gdGhpcy5jb25maWcucHJpdmFjeSB8fCB7IHNhdmVDaGF0SGlzdG9yeTogdHJ1ZSwgc2hhcmVVc2FnZURhdGE6IGZhbHNlIH07XG4gIH1cblxuICAvKipcbiAgICog5pu05paw5qih5Z6L5Y+C5pWwXG4gICAqL1xuICBhc3luYyB1cGRhdGVNb2RlbFBhcmFtcyhwcm92aWRlcjogQUlQcm92aWRlciwgcGFyYW1zOiB7IHRlbXBlcmF0dXJlPzogbnVtYmVyOyBtYXhUb2tlbnM/OiBudW1iZXI7IHRvcFA/OiBudW1iZXIgfSk6IFByb21pc2U8dm9pZD4ge1xuICAgIHN3aXRjaCAocHJvdmlkZXIpIHtcbiAgICAgIGNhc2UgJ29sbGFtYSc6XG4gICAgICAgIGF3YWl0IHRoaXMudXBkYXRlQ29uZmlnKHtcbiAgICAgICAgICBvbGxhbWE6IHsgLi4udGhpcy5jb25maWcub2xsYW1hLCBtb2RlbFBhcmFtczogeyAuLi50aGlzLmNvbmZpZy5vbGxhbWE/Lm1vZGVsUGFyYW1zLCAuLi5wYXJhbXMgfSB9IGFzIGFueSxcbiAgICAgICAgfSk7XG4gICAgICAgIGJyZWFrO1xuICAgICAgY2FzZSAnb3BlbmFpJzpcbiAgICAgICAgYXdhaXQgdGhpcy51cGRhdGVDb25maWcoe1xuICAgICAgICAgIG9wZW5haTogeyAuLi50aGlzLmNvbmZpZy5vcGVuYWksIG1vZGVsUGFyYW1zOiB7IC4uLnRoaXMuY29uZmlnLm9wZW5haT8ubW9kZWxQYXJhbXMsIC4uLnBhcmFtcyB9IH0gYXMgYW55LFxuICAgICAgICB9KTtcbiAgICAgICAgYnJlYWs7XG4gICAgICBjYXNlICdjdXN0b20nOlxuICAgICAgICBhd2FpdCB0aGlzLnVwZGF0ZUNvbmZpZyh7XG4gICAgICAgICAgY3VzdG9tOiB7IC4uLnRoaXMuY29uZmlnLmN1c3RvbSwgbW9kZWxQYXJhbXM6IHsgLi4udGhpcy5jb25maWcuY3VzdG9tPy5tb2RlbFBhcmFtcywgLi4ucGFyYW1zIH0gfSBhcyBhbnksXG4gICAgICAgIH0pO1xuICAgICAgICBicmVhaztcbiAgICB9XG4gIH1cblxuICAvKipcbiAgICog6I635Y+W5qih5Z6L5Y+C5pWwXG4gICAqL1xuICBnZXRNb2RlbFBhcmFtcyhwcm92aWRlcjogQUlQcm92aWRlcik6IHsgdGVtcGVyYXR1cmU6IG51bWJlcjsgbWF4VG9rZW5zOiBudW1iZXI7IHRvcFA6IG51bWJlciB9IHtcbiAgICBzd2l0Y2ggKHByb3ZpZGVyKSB7XG4gICAgICBjYXNlICdvbGxhbWEnOlxuICAgICAgICByZXR1cm4gdGhpcy5jb25maWcub2xsYW1hPy5tb2RlbFBhcmFtcyB8fCB7IHRlbXBlcmF0dXJlOiAwLjcsIG1heFRva2VuczogMjA0OCwgdG9wUDogMC45IH07XG4gICAgICBjYXNlICdvcGVuYWknOlxuICAgICAgICByZXR1cm4gdGhpcy5jb25maWcub3BlbmFpPy5tb2RlbFBhcmFtcyB8fCB7IHRlbXBlcmF0dXJlOiAwLjcsIG1heFRva2VuczogMjA0OCwgdG9wUDogMC45IH07XG4gICAgICBjYXNlICdjdXN0b20nOlxuICAgICAgICByZXR1cm4gdGhpcy5jb25maWcuY3VzdG9tPy5tb2RlbFBhcmFtcyB8fCB7IHRlbXBlcmF0dXJlOiAwLjcsIG1heFRva2VuczogMjA0OCwgdG9wUDogMC45IH07XG4gICAgICBkZWZhdWx0OlxuICAgICAgICByZXR1cm4geyB0ZW1wZXJhdHVyZTogMC43LCBtYXhUb2tlbnM6IDIwNDgsIHRvcFA6IDAuOSB9O1xuICAgIH1cbiAgfVxuXG4gIC8qKlxuICAgKiDph43nva7kuLrpu5jorqTphY3nva5cbiAgICovXG4gIGFzeW5jIHJlc2V0VG9EZWZhdWx0cygpOiBQcm9taXNlPHZvaWQ+IHtcbiAgICB0aGlzLmNvbmZpZyA9IHRoaXMuZ2V0RGVmYXVsdENvbmZpZygpO1xuICAgIGlmICh0aGlzLmNvbmZpZy5vbGxhbWEpIHtcbiAgICAgIHRoaXMub2xsYW1hQ2xpZW50LnVwZGF0ZUNvbmZpZyh0aGlzLmNvbmZpZy5vbGxhbWEpO1xuICAgICAgZ2xvYmFsT2xsYW1hQ2xpZW50LnVwZGF0ZUNvbmZpZyh0aGlzLmNvbmZpZy5vbGxhbWEpO1xuICAgIH1cbiAgICBhd2FpdCB0aGlzLnNhdmVDb25maWcoKTtcbiAgICBldmVudEJ1cy5lbWl0KCdhaS1jb25maWc6Y2hhbmdlZCcsIHRoaXMuY29uZmlnKTtcbiAgICBsb2dnZXIuaW5mbygnQUkgY29uZmlnIHJlc2V0IHRvIGRlZmF1bHRzJyk7XG4gIH1cblxuICAvKipcbiAgICog5a+85Ye66YWN572uXG4gICAqL1xuICBleHBvcnRDb25maWcoKTogc3RyaW5nIHtcbiAgICByZXR1cm4gSlNPTi5zdHJpbmdpZnkodGhpcy5jb25maWcsIG51bGwsIDIpO1xuICB9XG5cbiAgLyoqXG4gICAqIOWvvOWFpemFjee9rlxuICAgKi9cbiAgYXN5bmMgaW1wb3J0Q29uZmlnKGNvbmZpZ0pzb246IHN0cmluZyk6IFByb21pc2U8dm9pZD4ge1xuICAgIHRyeSB7XG4gICAgICBjb25zdCBjb25maWcgPSBKU09OLnBhcnNlKGNvbmZpZ0pzb24pIGFzIEFJU2VydmljZUNvbmZpZztcbiAgICAgIGF3YWl0IHRoaXMudXBkYXRlQ29uZmlnKGNvbmZpZyk7XG4gICAgICBsb2dnZXIuaW5mbygnQUkgY29uZmlnIGltcG9ydGVkJyk7XG4gICAgfSBjYXRjaCAoZXJyb3IpIHtcbiAgICAgIGxvZ2dlci5lcnJvcignRmFpbGVkIHRvIGltcG9ydCBBSSBjb25maWc6JywgZXJyb3IpO1xuICAgICAgdGhyb3cgbmV3IEVycm9yKCdJbnZhbGlkIGNvbmZpZyBmb3JtYXQnKTtcbiAgICB9XG4gIH1cblxuICAvKipcbiAgICog6aqM6K+B6YWN572uXG4gICAqL1xuICB2YWxpZGF0ZUNvbmZpZygpOiB7IHZhbGlkOiBib29sZWFuOyBlcnJvcnM6IHN0cmluZ1tdIH0ge1xuICAgIGNvbnN0IGVycm9yczogc3RyaW5nW10gPSBbXTtcblxuICAgIC8vIOmqjOivgSBPbGxhbWEg6YWN572uXG4gICAgaWYgKHRoaXMuY29uZmlnLnByb3ZpZGVyID09PSAnb2xsYW1hJyAmJiB0aGlzLmNvbmZpZy5vbGxhbWEpIHtcbiAgICAgIGlmICghdGhpcy5jb25maWcub2xsYW1hLmJhc2VVcmwpIHtcbiAgICAgICAgZXJyb3JzLnB1c2goJ09sbGFtYSBiYXNlIFVSTCBpcyByZXF1aXJlZCcpO1xuICAgICAgfVxuICAgICAgaWYgKCF0aGlzLmNvbmZpZy5vbGxhbWEuZGVmYXVsdE1vZGVsKSB7XG4gICAgICAgIGVycm9ycy5wdXNoKCdPbGxhbWEgZGVmYXVsdCBtb2RlbCBpcyByZXF1aXJlZCcpO1xuICAgICAgfVxuICAgIH1cblxuICAgIC8vIOmqjOivgSBPcGVuQUkg6YWN572uXG4gICAgaWYgKHRoaXMuY29uZmlnLnByb3ZpZGVyID09PSAnb3BlbmFpJyAmJiB0aGlzLmNvbmZpZy5vcGVuYWkpIHtcbiAgICAgIGlmICghdGhpcy5jb25maWcub3BlbmFpLmFwaUtleSkge1xuICAgICAgICBlcnJvcnMucHVzaCgnT3BlbkFJIEFQSSBrZXkgaXMgcmVxdWlyZWQnKTtcbiAgICAgIH1cbiAgICAgIGlmICghdGhpcy5jb25maWcub3BlbmFpLmJhc2VVcmwpIHtcbiAgICAgICAgZXJyb3JzLnB1c2goJ09wZW5BSSBiYXNlIFVSTCBpcyByZXF1aXJlZCcpO1xuICAgICAgfVxuICAgICAgaWYgKCF0aGlzLmNvbmZpZy5vcGVuYWkuZGVmYXVsdE1vZGVsKSB7XG4gICAgICAgIGVycm9ycy5wdXNoKCdPcGVuQUkgZGVmYXVsdCBtb2RlbCBpcyByZXF1aXJlZCcpO1xuICAgICAgfVxuICAgIH1cblxuICAgIC8vIOmqjOivgeiHquWumuS5iemFjee9rlxuICAgIGlmICh0aGlzLmNvbmZpZy5wcm92aWRlciA9PT0gJ2N1c3RvbScgJiYgdGhpcy5jb25maWcuY3VzdG9tKSB7XG4gICAgICBpZiAoIXRoaXMuY29uZmlnLmN1c3RvbS5iYXNlVXJsKSB7XG4gICAgICAgIGVycm9ycy5wdXNoKCdDdXN0b20gYmFzZSBVUkwgaXMgcmVxdWlyZWQnKTtcbiAgICAgIH1cbiAgICAgIGlmICghdGhpcy5jb25maWcuY3VzdG9tLmRlZmF1bHRNb2RlbCkge1xuICAgICAgICBlcnJvcnMucHVzaCgnQ3VzdG9tIGRlZmF1bHQgbW9kZWwgaXMgcmVxdWlyZWQnKTtcbiAgICAgIH1cbiAgICB9XG5cbiAgICByZXR1cm4geyB2YWxpZDogZXJyb3JzLmxlbmd0aCA9PT0gMCwgZXJyb3JzIH07XG4gIH1cbn1cblxuLyoqXG4gKiDlhajlsYAgQUkg6YWN572u566h55CG5Zmo5a6e5L6LXG4gKi9cbmV4cG9ydCBjb25zdCBhaUNvbmZpZ01hbmFnZXIgPSBBSUNvbmZpZ01hbmFnZXIuZ2V0SW5zdGFuY2UoKTtcblxuZXhwb3J0IGRlZmF1bHQgQUlDb25maWdNYW5hZ2VyO1xuIl19