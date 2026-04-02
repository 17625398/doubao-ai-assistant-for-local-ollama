// Ollama API 客户端
import { logger } from './logger';
/**
 * Ollama API 客户端
 */
export class OllamaClient {
    constructor(config) {
        const isExtensionEnv = typeof chrome !== 'undefined' && Boolean(chrome?.runtime?.id) && Boolean(chrome?.storage?.local);
        // Web应用使用代理路径 /api/ollama，请求会发送到 /api/ollama/chat
        // 扩展使用直接连接
        const defaultBaseUrl = isExtensionEnv ? 'http://localhost:11434' : '/api/ollama';
        this.config = {
            baseUrl: defaultBaseUrl,
            defaultModel: 'fredrezones55/qwen3.5-opus:27b',
            timeout: 30000,
            streamEnabled: true,
            ...config,
        };
        if (isExtensionEnv) {
            const baseUrl = String(this.config.baseUrl || '').trim();
            if (baseUrl.startsWith('/')) {
                this.config.baseUrl = defaultBaseUrl;
            }
        }
        logger.info('OllamaClient initialized with baseUrl:', this.config.baseUrl, 'isExtension:', isExtensionEnv);
    }
    buildForbiddenError(baseUrl, detail, ctx) {
        const rawDetail = typeof detail === 'string' ? detail.trim() : '';
        let parsed;
        if (rawDetail) {
            try {
                parsed = JSON.parse(rawDetail);
            }
            catch { }
        }
        if (parsed?.upstream || parsed?.upstreamUrl) {
            const upstream = parsed.upstreamUrl || parsed.upstream || '';
            const upstreamDetail = String(parsed.detail || parsed.statusText || '').trim();
            const extra = upstreamDetail ? ` 详情：${upstreamDetail}` : '';
            return new Error(`请求被上游/代理拒绝（403 Forbidden）。请检查中间机/反代是否放行宿主机访问，并确认上游可访问真实 Ollama。上游：${upstream}${extra}`);
        }
        if (String(baseUrl || '').trim().startsWith('/')) {
            const extra = rawDetail ? ` 详情：${rawDetail}` : '';
            if (ctx?.viaWebProxy) {
                return new Error(`请求被上游/代理拒绝（403 Forbidden）。请求已到达 Web 服务端 /api/ollama 代理，但上游返回了 403。请检查 Web 服务端 OLLAMA_BASE_URL 指向的中间机/反代是否有鉴权/白名单/方法限制。${extra}`);
            }
            return new Error(`请求被上游/代理拒绝（403 Forbidden）。当前使用 Web 代理地址：${baseUrl}，但未检测到服务端代理标记（x-doubao-ollama-proxy）。这通常表示 403 在到达 Next 的 /api/ollama 之前就被拦截（宿主机反代/网关/WAF/防火墙）。请优先检查宿主机对 /api/ollama/* 的转发与放行规则。${extra}`);
        }
        const hint = '请求被 Ollama 拒绝（403 Forbidden）。这通常是 CORS/Origin 限制导致：请在运行 Ollama 的机器上设置环境变量 OLLAMA_ORIGINS=chrome-extension://*（或 chrome-extension://<你的扩展ID>）后重启 Ollama。';
        const extra = rawDetail ? ` 详情：${rawDetail}` : '';
        return new Error(`${hint} 地址：${baseUrl}${extra}`);
    }
    /**
     * 更新配置
     */
    updateConfig(config) {
        const isExtensionEnv = typeof chrome !== 'undefined' && Boolean(chrome?.runtime?.id) && Boolean(chrome?.storage?.local);
        const defaultBaseUrl = isExtensionEnv ? 'http://192.168.0.32:11434' : '/api/ollama';
        this.config = { ...this.config, ...config };
        if (isExtensionEnv) {
            const baseUrl = String(this.config.baseUrl || '').trim();
            if (baseUrl.startsWith('/')) {
                this.config.baseUrl = defaultBaseUrl;
            }
        }
        logger.info('OllamaClient config updated:', this.config.baseUrl);
    }
    /**
     * 获取当前配置
     */
    getConfig() {
        return { ...this.config };
    }
    /**
     * 检查服务是否可用
     */
    async isAvailable() {
        try {
            const response = await fetch(`${this.config.baseUrl}/api/tags`, {
                method: 'GET',
                signal: AbortSignal.timeout(this.config.timeout),
            });
            if (!response.ok) {
                if (response.status === 403) {
                    const viaWebProxy = response.headers.get('x-doubao-ollama-proxy') === '1';
                    const detail = await response.text().catch(() => '');
                    throw this.buildForbiddenError(this.config.baseUrl, detail, { viaWebProxy });
                }
                return false;
            }
            return response.ok;
        }
        catch (error) {
            logger.warn('Ollama service not available:', error);
            return false;
        }
    }
    /**
     * 获取本地模型列表
     */
    async listModels() {
        try {
            const response = await fetch(`${this.config.baseUrl}/api/tags`, {
                method: 'GET',
                headers: this.config.headers,
                signal: AbortSignal.timeout(this.config.timeout),
            });
            if (!response.ok) {
                const detail = await response.text().catch(() => '');
                if (response.status === 403) {
                    const viaWebProxy = response.headers.get('x-doubao-ollama-proxy') === '1';
                    throw this.buildForbiddenError(this.config.baseUrl, detail, { viaWebProxy });
                }
                throw new Error(detail ? `Failed to list models: ${detail}` : `Failed to list models: ${response.statusText}`);
            }
            const data = await response.json();
            return data.models || [];
        }
        catch (error) {
            logger.error('Failed to list Ollama models:', error);
            throw error;
        }
    }
    /**
     * 生成文本（非流式）
     */
    async generate(prompt, options) {
        const request = {
            model: options?.model || this.config.defaultModel,
            prompt,
            system: options?.system,
            context: options?.context,
            stream: false,
            options: options?.options,
        };
        try {
            const response = await fetch(`${this.config.baseUrl}/api/generate`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    ...this.config.headers,
                },
                body: JSON.stringify(request),
                signal: AbortSignal.timeout(this.config.timeout),
            });
            if (!response.ok) {
                const detail = await response.text().catch(() => '');
                if (response.status === 403) {
                    const viaWebProxy = response.headers.get('x-doubao-ollama-proxy') === '1';
                    throw this.buildForbiddenError(this.config.baseUrl, detail, { viaWebProxy });
                }
                throw new Error(detail ? `Generate failed: ${detail}` : `Generate failed: ${response.statusText}`);
            }
            return await response.json();
        }
        catch (error) {
            logger.error('Ollama generate failed:', error);
            throw error;
        }
    }
    /**
     * 生成文本（流式）
     */
    async *generateStream(prompt, options, signal) {
        const request = {
            model: options?.model || this.config.defaultModel,
            prompt,
            system: options?.system,
            context: options?.context,
            stream: true,
            options: options?.options,
        };
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), this.config.timeout);
        const onAbort = () => controller.abort();
        try {
            if (signal) {
                if (signal.aborted)
                    controller.abort();
                else
                    signal.addEventListener('abort', onAbort);
            }
            const response = await fetch(`${this.config.baseUrl}/api/generate`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    ...this.config.headers,
                },
                body: JSON.stringify(request),
                signal: controller.signal,
            });
            clearTimeout(timeoutId);
            if (!response.ok) {
                const detail = await response.text().catch(() => '');
                if (response.status === 403) {
                    const viaWebProxy = response.headers.get('x-doubao-ollama-proxy') === '1';
                    throw this.buildForbiddenError(this.config.baseUrl, detail, { viaWebProxy });
                }
                throw new Error(detail ? `Generate stream failed: ${detail}` : `Generate stream failed: ${response.statusText}`);
            }
            const reader = response.body?.getReader();
            if (!reader) {
                throw new Error('No response body');
            }
            const decoder = new TextDecoder();
            let buffer = '';
            while (true) {
                const { done, value } = await reader.read();
                if (done)
                    break;
                buffer += decoder.decode(value, { stream: true });
                const lines = buffer.split('\n');
                buffer = lines.pop() || '';
                for (const line of lines) {
                    if (line.trim()) {
                        try {
                            const chunk = JSON.parse(line);
                            yield chunk;
                        }
                        catch (e) {
                            logger.warn('Failed to parse stream chunk:', line);
                        }
                    }
                }
            }
        }
        catch (error) {
            if (isAbortError(error) || controller.signal.aborted)
                return;
            logger.error('Ollama generate stream failed:', error);
            throw error;
        }
        finally {
            clearTimeout(timeoutId);
            if (signal)
                signal.removeEventListener('abort', onAbort);
        }
    }
    /**
     * 聊天（非流式）
     */
    async chat(request) {
        try {
            const response = await fetch(`${this.config.baseUrl}/api/chat`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    ...this.config.headers,
                },
                body: JSON.stringify({
                    ...request,
                    stream: false,
                }),
                signal: AbortSignal.timeout(this.config.timeout),
            });
            if (!response.ok) {
                const detail = await response.text().catch(() => '');
                if (response.status === 403) {
                    const viaWebProxy = response.headers.get('x-doubao-ollama-proxy') === '1';
                    throw this.buildForbiddenError(this.config.baseUrl, detail, { viaWebProxy });
                }
                throw new Error(detail ? `Chat failed: ${detail}` : `Chat failed: ${response.statusText}`);
            }
            return await response.json();
        }
        catch (error) {
            logger.error('Ollama chat failed:', error);
            throw error;
        }
    }
    /**
     * 聊天（流式）
     */
    async *chatStream(request, signal) {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), this.config.timeout);
        const onAbort = () => controller.abort();
        try {
            if (signal) {
                if (signal.aborted)
                    controller.abort();
                else
                    signal.addEventListener('abort', onAbort);
            }
            const response = await fetch(`${this.config.baseUrl}/api/chat`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    ...this.config.headers,
                },
                body: JSON.stringify({
                    ...request,
                    stream: true,
                }),
                signal: controller.signal,
            });
            clearTimeout(timeoutId);
            if (!response.ok) {
                const detail = await response.text().catch(() => '');
                if (response.status === 403) {
                    const viaWebProxy = response.headers.get('x-doubao-ollama-proxy') === '1';
                    throw this.buildForbiddenError(this.config.baseUrl, detail, { viaWebProxy });
                }
                throw new Error(detail ? `Chat stream failed: ${detail}` : `Chat stream failed: ${response.statusText}`);
            }
            const reader = response.body?.getReader();
            if (!reader) {
                throw new Error('No response body');
            }
            const decoder = new TextDecoder();
            let buffer = '';
            while (true) {
                const { done, value } = await reader.read();
                if (done)
                    break;
                buffer += decoder.decode(value, { stream: true });
                const lines = buffer.split('\n');
                buffer = lines.pop() || '';
                for (const line of lines) {
                    if (line.trim()) {
                        try {
                            const chunk = JSON.parse(line);
                            yield chunk;
                        }
                        catch (e) {
                            logger.warn('Failed to parse chat stream chunk:', line);
                        }
                    }
                }
            }
        }
        catch (error) {
            if (isAbortError(error) || controller.signal.aborted)
                return;
            logger.error('Ollama chat stream failed:', error);
            throw error;
        }
        finally {
            clearTimeout(timeoutId);
            if (signal)
                signal.removeEventListener('abort', onAbort);
        }
    }
    /**
     * 拉取模型
     */
    async pullModel(modelName) {
        try {
            const response = await fetch(`${this.config.baseUrl}/api/pull`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    ...this.config.headers,
                },
                body: JSON.stringify({ name: modelName }),
                signal: AbortSignal.timeout(this.config.timeout * 10), // 拉取模型需要更长时间
            });
            if (!response.ok) {
                throw new Error(`Pull model failed: ${response.statusText}`);
            }
            // 处理流式响应
            const reader = response.body?.getReader();
            if (reader) {
                const decoder = new TextDecoder();
                while (true) {
                    const { done } = await reader.read();
                    if (done)
                        break;
                }
            }
            logger.info('Model pulled successfully:', modelName);
        }
        catch (error) {
            logger.error('Failed to pull model:', error);
            throw error;
        }
    }
    /**
     * 删除模型
     */
    async deleteModel(modelName) {
        try {
            const response = await fetch(`${this.config.baseUrl}/api/delete`, {
                method: 'DELETE',
                headers: {
                    'Content-Type': 'application/json',
                    ...this.config.headers,
                },
                body: JSON.stringify({ name: modelName }),
                signal: AbortSignal.timeout(this.config.timeout),
            });
            if (!response.ok) {
                throw new Error(`Delete model failed: ${response.statusText}`);
            }
            logger.info('Model deleted successfully:', modelName);
        }
        catch (error) {
            logger.error('Failed to delete model:', error);
            throw error;
        }
    }
    /**
     * 获取模型信息
     */
    async getModelInfo(modelName) {
        try {
            const response = await fetch(`${this.config.baseUrl}/api/show`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    ...this.config.headers,
                },
                body: JSON.stringify({ name: modelName }),
                signal: AbortSignal.timeout(this.config.timeout),
            });
            if (!response.ok) {
                throw new Error(`Get model info failed: ${response.statusText}`);
            }
            return await response.json();
        }
        catch (error) {
            logger.error('Failed to get model info:', error);
            throw error;
        }
    }
}
/**
 * 创建默认的生成选项
 */
export function createDefaultOptions() {
    return {
        temperature: 0.7,
        num_predict: 2048,
        top_p: 0.9,
        top_k: 40,
        repeat_penalty: 1.1,
    };
}
/**
 * 全局 Ollama 客户端实例
 */
export const ollamaClient = new OllamaClient();
export default OllamaClient;
function isAbortError(error) {
    if (!error || typeof error !== 'object')
        return false;
    const anyError = error;
    if (anyError.name === 'AbortError')
        return true;
    const message = typeof anyError.message === 'string' ? anyError.message : '';
    return message.includes('AbortError') || (message.includes('aborted') && message.includes('signal'));
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoib2xsYW1hLWNsaWVudC5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uL3NyYy91dGlscy9vbGxhbWEtY2xpZW50LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBLGlCQUFpQjtBQVdqQixPQUFPLEVBQUUsTUFBTSxFQUFFLE1BQU0sVUFBVSxDQUFDO0FBRWxDOztHQUVHO0FBQ0gsTUFBTSxPQUFPLFlBQVk7SUFHdkIsWUFBWSxNQUE4QjtRQUN4QyxNQUFNLGNBQWMsR0FDbEIsT0FBTyxNQUFNLEtBQUssV0FBVyxJQUFJLE9BQU8sQ0FBQyxNQUFNLEVBQUUsT0FBTyxFQUFFLEVBQUUsQ0FBQyxJQUFJLE9BQU8sQ0FBQyxNQUFNLEVBQUUsT0FBTyxFQUFFLEtBQUssQ0FBQyxDQUFDO1FBQ25HLGtEQUFrRDtRQUNsRCxXQUFXO1FBQ1gsTUFBTSxjQUFjLEdBQUcsY0FBYyxDQUFDLENBQUMsQ0FBQyx3QkFBd0IsQ0FBQyxDQUFDLENBQUMsYUFBYSxDQUFDO1FBRWpGLElBQUksQ0FBQyxNQUFNLEdBQUc7WUFDWixPQUFPLEVBQUUsY0FBYztZQUN2QixZQUFZLEVBQUUsZ0NBQWdDO1lBQzlDLE9BQU8sRUFBRSxLQUFLO1lBQ2QsYUFBYSxFQUFFLElBQUk7WUFDbkIsR0FBRyxNQUFNO1NBQ1YsQ0FBQztRQUVGLElBQUksY0FBYyxFQUFFLENBQUM7WUFDbkIsTUFBTSxPQUFPLEdBQUcsTUFBTSxDQUFDLElBQUksQ0FBQyxNQUFNLENBQUMsT0FBTyxJQUFJLEVBQUUsQ0FBQyxDQUFDLElBQUksRUFBRSxDQUFDO1lBQ3pELElBQUksT0FBTyxDQUFDLFVBQVUsQ0FBQyxHQUFHLENBQUMsRUFBRSxDQUFDO2dCQUM1QixJQUFJLENBQUMsTUFBTSxDQUFDLE9BQU8sR0FBRyxjQUFjLENBQUM7WUFDdkMsQ0FBQztRQUNILENBQUM7UUFDRCxNQUFNLENBQUMsSUFBSSxDQUFDLHdDQUF3QyxFQUFFLElBQUksQ0FBQyxNQUFNLENBQUMsT0FBTyxFQUFFLGNB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V0FBVyxFQUFFLEdBQUc7UUFDaEIsV0FBVyxFQUFFLElBQUk7UUFDakIsS0FBSyxFQUFFLEdBQUc7UUFDVixLQUFLLEVBQUUsRUFBRTtRQUNULGNBQWMsRUFBRSxHQUFHO0tBQ3BCLENBQUM7QUFDSixDQUFDO0FBRUQ7O0dBRUc7QUFDSCxNQUFNLENBQUMsTUFBTSxZQUFZLEdBQUcsSUFBSSxZQUFZLEVBQUUsQ0FBQztBQUUvQyxlQUFlLFlBQVksQ0FBQztBQUU1QixTQUFTLFlBQVksQ0FBQyxLQUFjO0lBQ2xDLElBQUksQ0FBQyxLQUFLLElBQUksT0FBTyxLQUFLLEtBQUssUUFBUTtRQUFFLE9BQU8sS0FBSyxDQUFDO0lBQ3RELE1BQU0sUUFBUSxHQUFHLEtBQThDLENBQUM7SUFDaEUsSUFBSSxRQUFRLENBQUMsSUFBSSxLQUFLLFlBQVk7UUFBRSxPQUFPLElBQUksQ0FBQztJQUNoRCxNQUFNLE9BQU8sR0FBRyxPQUFPLFFBQVEsQ0FBQyxPQUFPLEtBQUssUUFBUSxDQUFDLENBQUMsQ0FBQyxRQUFRLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUM7SUFDN0UsT0FBTyxPQUFPLENBQUMsUUFBUSxDQUFDLFlBQVksQ0FBQyxJQUFJLENBQUMsT0FBTyxDQUFDLFFBQVEsQ0FBQyxTQUFTLENBQUMsSUFBSSxPQUFPLENBQUMsUUFBUSxDQUFDLFFBQVEsQ0FBQyxDQUFDLENBQUM7QUFDdkcsQ0FBQyIsInNvdXJjZXNDb250ZW50IjpbIi8vIE9sbGFtYSBBUEkg5a6i5oi356uvXG5cbmltcG9ydCB7XG4gIE9sbGFtYUNvbmZpZyxcbiAgT2xsYW1hTW9kZWwsXG4gIE9sbGFtYUdlbmVyYXRlUmVxdWVzdCxcbiAgT2xsYW1hR2VuZXJhdGVSZXNwb25zZSxcbiAgT2xsYW1hQ2hhdFJlcXVlc3QsXG4gIE9sbGFtYUNoYXRSZXNwb25zZSxcbiAgT2xsYW1hR2VuZXJhdGVPcHRpb25zLFxufSBmcm9tICcuLi90eXBlcyc7XG5pbXBvcnQgeyBsb2dnZXIgfSBmcm9tICcuL2xvZ2dlcic7XG5cbi8qKlxuICogT2xsYW1hIEFQSSDlrqLmiLfnq69cbiAqL1xuZXhwb3J0IGNsYXNzIE9sbGFtYUNsaWVudCB7XG4gIHByaXZhdGUgY29uZmlnOiBPbGxhbWFDb25maWc7XG5cbiAgY29uc3RydWN0b3IoY29uZmlnPzogUGFydGlhbDxPbGxhbWFDb25maWc+KSB7XG4gICAgY29uc3QgaXNFeHRlbnNpb25FbnYgPVxuICAgICAgdHlwZW9mIGNocm9tZSAhPT0gJ3VuZGVmaW5lZCcgJiYgQm9vbGVhbihjaHJvbWU/LnJ1bnRpbWU/LmlkKSAmJiBCb29sZWFuKGNocm9tZT8uc3RvcmFnZT8ubG9jYWwpO1xuICAgIC8vIFdlYuW6lOeUqOS9v+eUqOS7o+eQhui3r+W+hCAvYXBpL29sbGFtYe+8jOivt+axguS8muWPkemAgeWIsCAvYXBpL29sbGFtYS9jaGF0XG4gICAgLy8g5omp5bGV5L2/55So55u05o6l6L+e5o6lXG4gICAgY29uc3QgZGVmYXVsdEJhc2VVcmwgPSBpc0V4dGVuc2lvbkVudiA/ICdodHRwOi8vbG9jYWxob3N0OjExNDM0JyA6ICcvYXBpL29sbGFtYSc7XG5cbiAgICB0aGlzLmNvbmZpZyA9IHtcbiAgICAgIGJhc2VVcmw6IGRlZmF1bHRCYXNlVXJsLFxuICAgICAgZGVmYXVsdE1vZGVsOiAnZnJlZHJlem9uZXM1NS9xd2VuMy41LW9wdXM6MjdiJyxcbiAgICAgIHRpbWVvdXQ6IDMwMDAwLFxuICAgICAgc3RyZWFtRW5hYmxlZDogdHJ1ZSxcbiAgICAgIC4uLmNvbmZpZyxcbiAgICB9O1xuXG4gICAgaWYgKGlzRXh0ZW5zaW9uRW52KSB7XG4gICAgICBjb25zdCBiYXNlVXJsID0gU3RyaW5nKHRoaXMuY29uZmlnLmJhc2VVcmwgfHwgJycpLnRyaW0oKTtcbiAgICAgIGlmIChiYXNlVXJsLnN0YXJ0c1dpdGgoJy8nKSkge1xuICAgICAgICB0aGlzLmNvbmZpZy5iYXNlVXJsID0gZGVmYXVsdEJhc2VVcmw7XG4gICAgICB9XG4gICAgfVxuICAgIGxvZ2dlci5pbmZvKCdPbGxhbWFDbGllbnQgaW5pdGlhbGl6ZWQgd2l0aCBiYXNlVXJsOicsIHRoaXMuY29uZmlnLmJhc2VVcmwsICdpc0V4dGVuc2lvbjonLCBpc0V4dGVuc2lvbkVudik7XG4gIH1cblxuICBwcml2YXRlIGJ1aWxkRm9yYmlkZGVuRXJyb3IoYmFzZVVybDogc3RyaW5nLCBkZXRhaWw/OiBzdHJpbmcsIGN0eD86IHsgdmlhV2ViUHJveHk/OiBib29sZWFuIH0pOiBFcnJvciB7XG4gICAgY29uc3QgcmF3RGV0YWlsID0gdHlwZW9mIGRldGFpbCA9PT0gJ3N0cmluZycgPyBkZXRhaWwudHJpbSgpIDogJyc7XG4gICAgbGV0IHBhcnNlZDpcbiAgICAgIHwge1xuICAgICAgICAgIHVwc3RyZWFtPzogc3RyaW5nO1xuICAgICAgICAgIHVwc3RyZWFtVXJsPzogc3RyaW5nO1xuICAgICAgICAgIGRldGFpbD86IHN0cmluZztcbiAgICAgICAgICBzdGF0dXNUZXh0Pzogc3RyaW5nO1xuICAgICAgICB9XG4gICAgICB8IHVuZGVmaW5lZDtcbiAgICBpZiAocmF3RGV0YWlsKSB7XG4gICAgICB0cnkge1xuICAgICAgICBwYXJzZWQgPSBKU09OLnBhcnNlKHJhd0RldGFpbCkgYXMgdHlwZW9mIHBhcnNlZDtcbiAgICAgIH0gY2F0Y2gge31cbiAgICB9XG5cbiAgICBpZiAocGFyc2VkPy51cHN0cmVhbSB8fCBwYXJzZWQ/LnVwc3RyZWFtVXJsKSB7XG4gICAgICBjb25zdCB1cHN0cmVhbSA9IHBhcnNlZC51cHN0cmVhbVVybCB8fCBwYXJzZWQudXBzdHJlYW0gfHwgJyc7XG4gICAgICBjb25zdCB1cHN0cmVhbURldGFpbCA9IFN0cmluZyhwYXJzZWQuZGV0YWlsIHx8IHBhcnNlZC5zdGF0dXNUZXh0IHx8ICcnKS50cmltKCk7XG4gICAgICBjb25zdCBleHRyYSA9IHVwc3RyZWFtRGV0YWlsID8gYCDor6bmg4XvvJoke3Vwc3RyZWFtRGV0YWlsfWAgOiAnJztcbiAgICAgIHJldHVybiBuZXcgRXJyb3IoYOivt+axguiiq+S4iua4uC/ku6PnkIbmi5Lnu53vvIg0MDMgRm9yYmlkZGVu77yJ44CC6K+35qOA5p+l5Lit6Ze05py6L+WPjeS7o+aYr+WQpuaUvuihjOWuv+S4u+acuuiuv+mXru+8jOW5tuehruiupOS4iua4uOWPr+iuv+mXruecn+WuniBPbGxhbWHjgILkuIrmuLjvvJoke3Vwc3RyZWFtfSR7ZXh0cmF9YCk7XG4gICAgfVxuXG4gICAgaWYgKFN0cmluZyhiYXNlVXJsIHx8ICcnKS50cmltKCkuc3RhcnRzV2l0aCgnLycpKSB7XG4gICAgICBjb25zdCBleHRyYSA9IHJhd0RldGFpbCA/IGAg6K+m5oOF77yaJHtyYXdEZXRhaWx9YCA6ICcnO1xuICAgICAgaWYgKGN0eD8udmlhV2ViUHJveHkpIHtcbiAgICAgICAgcmV0dXJuIG5ldyBFcnJvcihcbiAgICAgICAgICBg6K+35rGC6KKr5LiK5ri4L+S7o+eQhuaLkue7ne+8iDQwMyBGb3JiaWRkZW7vvInjgILor7fmsYLlt7LliLDovr4gV2ViIOacjeWKoeerryAvYXBpL29sbGFtYSDku6PnkIbvvIzkvYbkuIrmuLjov5Tlm57kuoYgNDAz44CC6K+35qOA5p+lIFdlYiDmnI3liqHnq68gT0xMQU1BX0JBU0VfVVJMIOaMh+WQkeeahOS4remXtOacui/lj43ku6PmmK/lkKbmnInpibTmnYMv55m95ZCN5Y2VL+aWueazlemZkOWItuOAgiR7ZXh0cmF9YFxuICAgICAgICApO1xuICAgICAgfVxuICAgICAgcmV0dXJuIG5ldyBFcnJvcihcbiAgICAgICAgYOivt+axguiiq+S4iua4uC/ku6PnkIbmi5Lnu53vvIg0MDMgRm9yYmlkZGVu77yJ44CC5b2T5YmN5L2/55SoIFdlYiDku6PnkIblnLDlnYDvvJoke2Jhc2VVcmx977yM5L2G5pyq5qOA5rWL5Yiw5pyN5Yqh56uv5Luj55CG5qCH6K6w77yIeC1kb3ViYW8tb2xsYW1hLXByb3h577yJ44CC6L+Z6YCa5bi46KGo56S6IDQwMyDlnKjliLDovr4gTmV4dCDnmoQgL2FwaS9vbGxhbWEg5LmL5YmN5bCx6KKr5oum5oiq77yI5a6/5Li75py65Y+N5LujL+e9keWFsy9XQUYv6Ziy54Gr5aKZ77yJ44CC6K+35LyY5YWI5qOA5p+l5a6/5Li75py65a+5IC9hcGkvb2xsYW1hLyog55qE6L2s5Y+R5LiO5pS+6KGM6KeE5YiZ44CCJHtleHRyYX1gXG4gICAgICApO1xuICAgIH1cblxuICAgIGNvbnN0IGhpbnQgPVxuICAgICAgJ+ivt+axguiiqyBPbGxhbWEg5ouS57ud77yINDAzIEZvcmJpZGRlbu+8ieOAgui/memAmuW4uOaYryBDT1JTL09yaWdpbiDpmZDliLblr7zoh7TvvJror7flnKjov5DooYwgT2xsYW1hIOeahOacuuWZqOS4iuiuvue9rueOr+Wig+WPmOmHjyBPTExBTUFfT1JJR0lOUz1jaHJvbWUtZXh0ZW5zaW9uOi8vKu+8iOaIliBjaHJvbWUtZXh0ZW5zaW9uOi8vPOS9oOeahOaJqeWxlUlEPu+8ieWQjumHjeWQryBPbGxhbWHjgIInO1xuICAgIGNvbnN0IGV4dHJhID0gcmF3RGV0YWlsID8gYCDor6bmg4XvvJoke3Jhd0RldGFpbH1gIDogJyc7XG4gICAgcmV0dXJuIG5ldyBFcnJvcihgJHtoaW50fSDlnLDlnYDvvJoke2Jhc2VVcmx9JHtleHRyYX1gKTtcbiAgfVxuXG4gIC8qKlxuICAgKiDmm7TmlrDphY3nva5cbiAgICovXG4gIHVwZGF0ZUNvbmZpZyhjb25maWc6IFBhcnRpYWw8T2xsYW1hQ29uZmlnPik6IHZvaWQge1xuICAgIGNvbnN0IGlzRXh0ZW5zaW9uRW52ID1cbiAgICAgIHR5cGVvZiBjaHJvbWUgIT09ICd1bmRlZmluZWQnICYmIEJvb2xlYW4oY2hyb21lPy5ydW50aW1lPy5pZCkgJiYgQm9vbGVhbihjaHJvbWU/LnN0b3JhZ2U/LmxvY2FsKTtcbiAgICBjb25zdCBkZWZhdWx0QmFzZVVybCA9IGlzRXh0ZW5zaW9uRW52ID8gJ2h0dHA6Ly8xOTIuMTY4LjAuMzI6MTE0MzQnIDogJy9hcGkvb2xsYW1hJztcblxuICAgIHRoaXMuY29uZmlnID0geyAuLi50aGlzLmNvbmZpZywgLi4uY29uZmlnIH07XG4gICAgaWYgKGlzRXh0ZW5zaW9uRW52KSB7XG4gICAgICBjb25zdCBiYXNlVXJsID0gU3RyaW5nKHRoaXMuY29uZmlnLmJhc2VVcmwgfHwgJycpLnRyaW0oKTtcbiAgICAgIGlmIChiYXNlVXJsLnN0YXJ0c1dpdGgoJy8nKSkge1xuICAgICAgICB0aGlzLmNvbmZpZy5iYXNlVXJsID0gZGVmYXVsdEJhc2VVcmw7XG4gICAgICB9XG4gICAgfVxuICAgIGxvZ2dlci5pbmZvKCdPbGxhbWFDbGllbnQgY29uZmlnIHVwZGF0ZWQ6JywgdGhpcy5jb25maWcuYmFzZVVybCk7XG4gIH1cblxuICAvKipcbiAgICog6I635Y+W5b2T5YmN6YWN572uXG4gICAqL1xuICBnZXRDb25maWcoKTogT2xsYW1hQ29uZmlnIHtcbiAgICByZXR1cm4geyAuLi50aGlzLmNvbmZpZyB9O1xuICB9XG5cbiAgLyoqXG4gICAqIOajgOafpeacjeWKoeaYr+WQpuWPr+eUqFxuICAgKi9cbiAgYXN5bmMgaXNBdmFpbGFibGUoKTogUHJvbWlzZTxib29sZWFuPiB7XG4gICAgdHJ5IHtcbiAgICAgIGNvbnN0IHJlc3BvbnNlID0gYXdhaXQgZmV0Y2goYCR7dGhpcy5jb25maWcuYmFzZVVybH0vYXBpL3RhZ3NgLCB7XG4gICAgICAgIG1ldGhvZDogJ0dFVCcsXG4gICAgICAgIHNpZ25hbDogQWJvcnRTaWduYWwudGltZW91dCh0aGlzLmNvbmZpZy50aW1lb3V0KSxcbiAgICAgIH0pO1xuICAgICAgaWYgKCFyZXNwb25zZS5vaykge1xuICAgICAgICBpZiAocmVzcG9uc2Uuc3RhdHVzID09PSA0MDMpIHtcbiAgICAgICAgICBjb25zdCB2aWFXZWJQcm94eSA9IHJlc3BvbnNlLmhlYWRlcnMuZ2V0KCd4LWRvdWJhby1vbGxhbWEtcHJveHknKSA9PT0gJzEnO1xuICAgICAgICAgIGNvbnN0IGRldGFpbCA9IGF3YWl0IHJlc3BvbnNlLnRleHQoKS5jYXRjaCgoKSA9PiAnJyk7XG4gICAgICAgICAgdGhyb3cgdGhpcy5idWlsZEZvcmJpZGRlbkVycm9yKHRoaXMuY29uZmlnLmJhc2VVcmwsIGRldGFpbCwgeyB2aWFXZWJQcm94eSB9KTtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgICB9XG4gICAgICByZXR1cm4gcmVzcG9uc2Uub2s7XG4gICAgfSBjYXRjaCAoZXJyb3IpIHtcbiAgICAgIGxvZ2dlci53YXJuKCdPbGxhbWEgc2VydmljZSBub3QgYXZhaWxhYmxlOicsIGVycm9yKTtcbiAgICAgIHJldHVybiBmYWxzZTtcbiAgICB9XG4gIH1cblxuICAvKipcbiAgICog6I635Y+W5pys5Zyw5qih5Z6L5YiX6KGoXG4gICAqL1xuICBhc3luYyBsaXN0TW9kZWxzKCk6IFByb21pc2U8T2xsYW1hTW9kZWxbXT4ge1xuICAgIHRyeSB7XG4gICAgICBjb25zdCByZXNwb25zZSA9IGF3YWl0IGZldGNoKGAke3RoaXMuY29uZmlnLmJhc2VVcmx9L2FwaS90YWdzYCwge1xuICAgICAgICBtZXRob2Q6ICdHRVQnLFxuICAgICAgICBoZWFkZXJzOiB0aGlzLmNvbmZpZy5oZWFkZXJzLFxuICAgICAgICBzaWduYWw6IEFib3J0U2lnbmFsLnRpbWVvdXQodGhpcy5jb25maWcudGltZW91dCksXG4gICAgICB9KTtcblxuICAgICAgaWYgKCFyZXNwb25zZS5vaykge1xuICAgICAgICBjb25zdCBkZXRhaWwgPSBhd2FpdCByZXNwb25zZS50ZXh0KCkuY2F0Y2goKCkgPT4gJycpO1xuICAgICAgICBpZiAocmVzcG9uc2Uuc3RhdHVzID09PSA0MDMpIHtcbiAgICAgICAgICBjb25zdCB2aWFXZWJQcm94eSA9IHJlc3BvbnNlLmhlYWRlcnMuZ2V0KCd4LWRvdWJhby1vbGxhbWEtcHJveHknKSA9PT0gJzEnO1xuICAgICAgICAgIHRocm93IHRoaXMuYnVpbGRGb3JiaWRkZW5FcnJvcih0aGlzLmNvbmZpZy5iYXNlVXJsLCBkZXRhaWwsIHsgdmlhV2ViUHJveHkgfSk7XG4gICAgICAgIH1cbiAgICAgICAgdGhyb3cgbmV3IEVycm9yKGRldGFpbCA/IGBGYWlsZWQgdG8gbGlzdCBtb2RlbHM6ICR7ZGV0YWlsfWAgOiBgRmFpbGVkIHRvIGxpc3QgbW9kZWxzOiAke3Jlc3BvbnNlLnN0YXR1c1RleHR9YCk7XG4gICAgICB9XG5cbiAgICAgIGNvbnN0IGRhdGEgPSBhd2FpdCByZXNwb25zZS5qc29uKCk7XG4gICAgICByZXR1cm4gZGF0YS5tb2RlbHMgfHwgW107XG4gICAgfSBjYXRjaCAoZXJyb3IpIHtcbiAgICAgIGxvZ2dlci5lcnJvcignRmFpbGVkIHRvIGxpc3QgT2xsYW1hIG1vZGVsczonLCBlcnJvcik7XG4gICAgICB0aHJvdyBlcnJvcjtcbiAgICB9XG4gIH1cblxuICAvKipcbiAgICog55Sf5oiQ5paH5pys77yI6Z2e5rWB5byP77yJXG4gICAqL1xuICBhc3luYyBnZW5lcmF0ZShcbiAgICBwcm9tcHQ6IHN0cmluZyxcbiAgICBvcHRpb25zPzogUGFydGlhbDxPbGxhbWFHZW5lcmF0ZVJlcXVlc3Q+XG4gICk6IFByb21pc2U8T2xsYW1hR2VuZXJhdGVSZXNwb25zZT4ge1xuICAgIGNvbnN0IHJlcXVlc3Q6IE9sbGFtYUdlbmVyYXRlUmVxdWVzdCA9IHtcbiAgICAgIG1vZGVsOiBvcHRpb25zPy5tb2RlbCB8fCB0aGlzLmNvbmZpZy5kZWZhdWx0TW9kZWwsXG4gICAgICBwcm9tcHQsXG4gICAgICBzeXN0ZW06IG9wdGlvbnM/LnN5c3RlbSxcbiAgICAgIGNvbnRleHQ6IG9wdGlvbnM/LmNvbnRleHQsXG4gICAgICBzdHJlYW06IGZhbHNlLFxuICAgICAgb3B0aW9uczogb3B0aW9ucz8ub3B0aW9ucyxcbiAgICB9O1xuXG4gICAgdHJ5IHtcbiAgICAgIGNvbnN0IHJlc3BvbnNlID0gYXdhaXQgZmV0Y2goYCR7dGhpcy5jb25maWcuYmFzZVVybH0vYXBpL2dlbmVyYXRlYCwge1xuICAgICAgICBtZXRob2Q6ICdQT1NUJyxcbiAgICAgICAgaGVhZGVyczoge1xuICAgICAgICAgICdDb250ZW50LVR5cGUnOiAnYXBwbGljYXRpb24vanNvbicsXG4gICAgICAgICAgLi4udGhpcy5jb25maWcuaGVhZGVycyxcbiAgICAgICAgfSxcbiAgICAgICAgYm9keTogSlNPTi5zdHJpbmdpZnkocmVxdWVzdCksXG4gICAgICAgIHNpZ25hbDogQWJvcnRTaWduYWwudGltZW91dCh0aGlzLmNvbmZpZy50aW1lb3V0KSxcbiAgICAgIH0pO1xuXG4gICAgICBpZiAoIXJlc3BvbnNlLm9rKSB7XG4gICAgICAgIGNvbnN0IGRldGFpbCA9IGF3YWl0IHJlc3BvbnNlLnRleHQoKS5jYXRjaCgoKSA9PiAnJyk7XG4gICAgICAgIGlmIChyZXNwb25zZS5zdGF0dXMgPT09IDQwMykge1xuICAgICAgICAgIGNvbnN0IHZpYVdlYlByb3h5ID0gcmVzcG9uc2UuaGVhZGVycy5nZXQoJ3gtZG91YmFvLW9sbGFtYS1wcm94eScpID09PSAnMSc7XG4gICAgICAgICAgdGhyb3cgdGhpcy5idWlsZEZvcmJpZGRlbkVycm9yKHRoaXMuY29uZmlnLmJhc2VVcmwsIGRldGFpbCwgeyB2aWFXZWJQcm94eSB9KTtcbiAgICAgICAgfVxuICAgICAgICB0aHJvdyBuZXcgRXJyb3IoZGV0YWlsID8gYEdlbmVyYXRlIGZhaWxlZDogJHtkZXRhaWx9YCA6IGBHZW5lcmF0ZSBmYWlsZWQ6ICR7cmVzcG9uc2Uuc3RhdHVzVGV4dH1gKTtcbiAgICAgIH1cblxuICAgICAgcmV0dXJuIGF3YWl0IHJlc3BvbnNlLmpzb24oKTtcbiAgICB9IGNhdGNoIChlcnJvcikge1xuICAgICAgbG9nZ2VyLmVycm9yKCdPbGxhbWEgZ2VuZXJhdGUgZmFpbGVkOicsIGVycm9yKTtcbiAgICAgIHRocm93IGVycm9yO1xuICAgIH1cbiAgfVxuXG4gIC8qKlxuICAgKiDnlJ/miJDmlofmnKzvvIjmtYHlvI/vvIlcbiAgICovXG4gIGFzeW5jICpnZW5lcmF0ZVN0cmVhbShcbiAgICBwcm9tcHQ6IHN0cmluZyxcbiAgICBvcHRpb25zPzogUGFydGlhbDxPbGxhbWFHZW5lcmF0ZVJlcXVlc3Q+LFxuICAgIHNpZ25hbD86IEFib3J0U2lnbmFsXG4gICk6IEFzeW5jR2VuZXJhdG9yPE9sbGFtYUdlbmVyYXRlUmVzcG9uc2UsIHZvaWQsIHVua25vd24+IHtcbiAgICBjb25zdCByZXF1ZXN0OiBPbGxhbWFHZW5lcmF0ZVJlcXVlc3QgPSB7XG4gICAgICBtb2RlbDogb3B0aW9ucz8ubW9kZWwgfHwgdGhpcy5jb25maWcuZGVmYXVsdE1vZGVsLFxuICAgICAgcHJvbXB0LFxuICAgICAgc3lzdGVtOiBvcHRpb25zPy5zeXN0ZW0sXG4gICAgICBjb250ZXh0OiBvcHRpb25zPy5jb250ZXh0LFxuICAgICAgc3RyZWFtOiB0cnVlLFxuICAgICAgb3B0aW9uczogb3B0aW9ucz8ub3B0aW9ucyxcbiAgICB9O1xuXG4gICAgY29uc3QgY29udHJvbGxlciA9IG5ldyBBYm9ydENvbnRyb2xsZXIoKTtcbiAgICBjb25zdCB0aW1lb3V0SWQgPSBzZXRUaW1lb3V0KCgpID0+IGNvbnRyb2xsZXIuYWJvcnQoKSwgdGhpcy5jb25maWcudGltZW91dCk7XG4gICAgY29uc3Qgb25BYm9ydCA9ICgpID0+IGNvbnRyb2xsZXIuYWJvcnQoKTtcblxuICAgIHRyeSB7XG4gICAgICBpZiAoc2lnbmFsKSB7XG4gICAgICAgIGlmIChzaWduYWwuYWJvcnRlZCkgY29udHJvbGxlci5hYm9ydCgpO1xuICAgICAgICBlbHNlIHNpZ25hbC5hZGRFdmVudExpc3RlbmVyKCdhYm9ydCcsIG9uQWJvcnQpO1xuICAgICAgfVxuXG4gICAgICBjb25zdCByZXNwb25zZSA9IGF3YWl0IGZldGNoKGAke3RoaXMuY29uZmlnLmJhc2VVcmx9L2FwaS9nZW5lcmF0ZWAsIHtcbiAgICAgICAgbWV0aG9kOiAnUE9TVCcsXG4gICAgICAgIGhlYWRlcnM6IHtcbiAgICAgICAgICAnQ29udGVudC1UeXBlJzogJ2FwcGxpY2F0aW9uL2pzb24nLFxuICAgICAgICAgIC4uLnRoaXMuY29uZmlnLmhlYWRlcnMsXG4gICAgICAgIH0sXG4gICAgICAgIGJvZHk6IEpTT04uc3RyaW5naWZ5KHJlcXVlc3QpLFxuICAgICAgICBzaWduYWw6IGNvbnRyb2xsZXIuc2lnbmFsLFxuICAgICAgfSk7XG4gICAgICBcbiAgICAgIGNsZWFyVGltZW91dCh0aW1lb3V0SWQpO1xuXG4gICAgICBpZiAoIXJlc3BvbnNlLm9rKSB7XG4gICAgICAgIGNvbnN0IGRldGFpbCA9IGF3YWl0IHJlc3BvbnNlLnRleHQoKS5jYXRjaCgoKSA9PiAnJyk7XG4gICAgICAgIGlmIChyZXNwb25zZS5zdGF0dXMgPT09IDQwMykge1xuICAgICAgICAgIGNvbnN0IHZpYVdlYlByb3h5ID0gcmVzcG9uc2UuaGVhZGVycy5nZXQoJ3gtZG91YmFvLW9sbGFtYS1wcm94eScpID09PSAnMSc7XG4gICAgICAgICAgdGhyb3cgdGhpcy5idWlsZEZvcmJpZGRlbkVycm9yKHRoaXMuY29uZmlnLmJhc2VVcmwsIGRldGFpbCwgeyB2aWFXZWJQcm94eSB9KTtcbiAgICAgICAgfVxuICAgICAgICB0aHJvdyBuZXcgRXJyb3IoZGV0YWlsID8gYEdlbmVyYXRlIHN0cmVhbSBmYWlsZWQ6ICR7ZGV0YWlsfWAgOiBgR2VuZXJhdGUgc3RyZWFtIGZhaWxlZDogJHtyZXNwb25zZS5zdGF0dXNUZXh0fWApO1xuICAgICAgfVxuXG4gICAgICBjb25zdCByZWFkZXIgPSByZXNwb25zZS5ib2R5Py5nZXRSZWFkZXIoKTtcbiAgICAgIGlmICghcmVhZGVyKSB7XG4gICAgICAgIHRocm93IG5ldyBFcnJvcignTm8gcmVzcG9uc2UgYm9keScpO1xuICAgICAgfVxuXG4gICAgICBjb25zdCBkZWNvZGVyID0gbmV3IFRleHREZWNvZGVyKCk7XG4gICAgICBsZXQgYnVmZmVyID0gJyc7XG5cbiAgICAgIHdoaWxlICh0cnVlKSB7XG4gICAgICAgIGNvbnN0IHsgZG9uZSwgdmFsdWUgfSA9IGF3YWl0IHJlYWRlci5yZWFkKCk7XG4gICAgICAgIGlmIChkb25lKSBicmVhaztcblxuICAgICAgICBidWZmZXIgKz0gZGVjb2Rlci5kZWNvZGUodmFsdWUsIHsgc3RyZWFtOiB0cnVlIH0pO1xuICAgICAgICBjb25zdCBsaW5lcyA9IGJ1ZmZlci5zcGxpdCgnXFxuJyk7XG4gICAgICAgIGJ1ZmZlciA9IGxpbmVzLnBvcCgpIHx8ICcnO1xuXG4gICAgICAgIGZvciAoY29uc3QgbGluZSBvZiBsaW5lcykge1xuICAgICAgICAgIGlmIChsaW5lLnRyaW0oKSkge1xuICAgICAgICAgICAgdHJ5IHtcbiAgICAgICAgICAgICAgY29uc3QgY2h1bmsgPSBKU09OLnBhcnNlKGxpbmUpIGFzIE9sbGFtYUdlbmVyYXRlUmVzcG9uc2U7XG4gICAgICAgICAgICAgIHlpZWxkIGNodW5rO1xuICAgICAgICAgICAgfSBjYXRjaCAoZSkge1xuICAgICAgICAgICAgICBsb2dnZXIud2FybignRmFpbGVkIHRvIHBhcnNlIHN0cmVhbSBjaHVuazonLCBsaW5lKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9IGNhdGNoIChlcnJvcikge1xuICAgICAgaWYgKGlzQWJvcnRFcnJvcihlcnJvcikgfHwgY29udHJvbGxlci5zaWduYWwuYWJvcnRlZCkgcmV0dXJuO1xuICAgICAgbG9nZ2VyLmVycm9yKCdPbGxhbWEgZ2VuZXJhdGUgc3RyZWFtIGZhaWxlZDonLCBlcnJvcik7XG4gICAgICB0aHJvdyBlcnJvcjtcbiAgICB9IGZpbmFsbHkge1xuICAgICAgY2xlYXJUaW1lb3V0KHRpbWVvdXRJZCk7XG4gICAgICBpZiAoc2lnbmFsKSBzaWduYWwucmVtb3ZlRXZlbnRMaXN0ZW5lcignYWJvcnQnLCBvbkFib3J0KTtcbiAgICB9XG4gIH1cblxuICAvKipcbiAgICog6IGK5aSp77yI6Z2e5rWB5byP77yJXG4gICAqL1xuICBhc3luYyBjaGF0KHJlcXVlc3Q6IE9sbGFtYUNoYXRSZXF1ZXN0KTogUHJvbWlzZTxPbGxhbWFDaGF0UmVzcG9uc2U+IHtcbiAgICB0cnkge1xuICAgICAgY29uc3QgcmVzcG9uc2UgPSBhd2FpdCBmZXRjaChgJHt0aGlzLmNvbmZpZy5iYXNlVXJsfS9hcGkvY2hhdGAsIHtcbiAgICAgICAgbWV0aG9kOiAnUE9TVCcsXG4gICAgICAgIGhlYWRlcnM6IHtcbiAgICAgICAgICAnQ29udGVudC1UeXBlJzogJ2FwcGxpY2F0aW9uL2pzb24nLFxuICAgICAgICAgIC4uLnRoaXMuY29uZmlnLmhlYWRlcnMsXG4gICAgICAgIH0sXG4gICAgICAgIGJvZHk6IEpTT04uc3RyaW5naWZ5KHtcbiAgICAgICAgICAuLi5yZXF1ZXN0LFxuICAgICAgICAgIHN0cmVhbTogZmFsc2UsXG4gICAgICAgIH0pLFxuICAgICAgICBzaWduYWw6IEFib3J0U2lnbmFsLnRpbWVvdXQodGhpcy5jb25maWcudGltZW91dCksXG4gICAgICB9KTtcblxuICAgICAgaWYgKCFyZXNwb25zZS5vaykge1xuICAgICAgICBjb25zdCBkZXRhaWwgPSBhd2FpdCByZXNwb25zZS50ZXh0KCkuY2F0Y2goKCkgPT4gJycpO1xuICAgICAgICBpZiAocmVzcG9uc2Uuc3RhdHVzID09PSA0MDMpIHtcbiAgICAgICAgICBjb25zdCB2aWFXZWJQcm94eSA9IHJlc3BvbnNlLmhlYWRlcnMuZ2V0KCd4LWRvdWJhby1vbGxhbWEtcHJveHknKSA9PT0gJzEnO1xuICAgICAgICAgIHRocm93IHRoaXMuYnVpbGRGb3JiaWRkZW5FcnJvcih0aGlzLmNvbmZpZy5iYXNlVXJsLCBkZXRhaWwsIHsgdmlhV2ViUHJveHkgfSk7XG4gICAgICAgIH1cbiAgICAgICAgdGhyb3cgbmV3IEVycm9yKGRldGFpbCA/IGBDaGF0IGZhaWxlZDogJHtkZXRhaWx9YCA6IGBDaGF0IGZhaWxlZDogJHtyZXNwb25zZS5zdGF0dXNUZXh0fWApO1xuICAgICAgfVxuXG4gICAgICByZXR1cm4gYXdhaXQgcmVzcG9uc2UuanNvbigpO1xuICAgIH0gY2F0Y2ggKGVycm9yKSB7XG4gICAgICBsb2dnZXIuZXJyb3IoJ09sbGFtYSBjaGF0IGZhaWxlZDonLCBlcnJvcik7XG4gICAgICB0aHJvdyBlcnJvcjtcbiAgICB9XG4gIH1cblxuICAvKipcbiAgICog6IGK5aSp77yI5rWB5byP77yJXG4gICAqL1xuICBhc3luYyAqY2hhdFN0cmVhbShcbiAgICByZXF1ZXN0OiBPbGxhbWFDaGF0UmVxdWVzdCxcbiAgICBzaWduYWw/OiBBYm9ydFNpZ25hbFxuICApOiBBc3luY0dlbmVyYXRvcjxPbGxhbWFDaGF0UmVzcG9uc2UsIHZvaWQsIHVua25vd24+IHtcbiAgICBjb25zdCBjb250cm9sbGVyID0gbmV3IEFib3J0Q29udHJvbGxlcigpO1xuICAgIGNvbnN0IHRpbWVvdXRJZCA9IHNldFRpbWVvdXQoKCkgPT4gY29udHJvbGxlci5hYm9ydCgpLCB0aGlzLmNvbmZpZy50aW1lb3V0KTtcbiAgICBjb25zdCBvbkFib3J0ID0gKCkgPT4gY29udHJvbGxlci5hYm9ydCgpO1xuXG4gICAgdHJ5IHtcbiAgICAgIGlmIChzaWduYWwpIHtcbiAgICAgICAgaWYgKHNpZ25hbC5hYm9ydGVkKSBjb250cm9sbGVyLmFib3J0KCk7XG4gICAgICAgIGVsc2Ugc2lnbmFsLmFkZEV2ZW50TGlzdGVuZXIoJ2Fib3J0Jywgb25BYm9ydCk7XG4gICAgICB9XG5cbiAgICAgIGNvbnN0IHJlc3BvbnNlID0gYXdhaXQgZmV0Y2goYCR7dGhpcy5jb25maWcuYmFzZVVybH0vYXBpL2NoYXRgLCB7XG4gICAgICAgIG1ldGhvZDogJ1BPU1QnLFxuICAgICAgICBoZWFkZXJzOiB7XG4gICAgICAgICAgJ0NvbnRlbnQtVHlwZSc6ICdhcHBsaWNhdGlvbi9qc29uJyxcbiAgICAgICAgICAuLi50aGlzLmNvbmZpZy5oZWFkZXJzLFxuICAgICAgICB9LFxuICAgICAgICBib2R5OiBKU09OLnN0cmluZ2lmeSh7XG4gICAgICAgICAgLi4ucmVxdWVzdCxcbiAgICAgICAgICBzdHJlYW06IHRydWUsXG4gICAgICAgIH0pLFxuICAgICAgICBzaWduYWw6IGNvbnRyb2xsZXIuc2lnbmFsLFxuICAgICAgfSk7XG4gICAgICBcbiAgICAgIGNsZWFyVGltZW91dCh0aW1lb3V0SWQpO1xuXG4gICAgICBpZiAoIXJlc3BvbnNlLm9rKSB7XG4gICAgICAgIGNvbnN0IGRldGFpbCA9IGF3YWl0IHJlc3BvbnNlLnRleHQoKS5jYXRjaCgoKSA9PiAnJyk7XG4gICAgICAgIGlmIChyZXNwb25zZS5zdGF0dXMgPT09IDQwMykge1xuICAgICAgICAgIGNvbnN0IHZpYVdlYlByb3h5ID0gcmVzcG9uc2UuaGVhZGVycy5nZXQoJ3gtZG91YmFvLW9sbGFtYS1wcm94eScpID09PSAnMSc7XG4gICAgICAgICAgdGhyb3cgdGhpcy5idWlsZEZvcmJpZGRlbkVycm9yKHRoaXMuY29uZmlnLmJhc2VVcmwsIGRldGFpbCwgeyB2aWFXZWJQcm94eSB9KTtcbiAgICAgICAgfVxuICAgICAgICB0aHJvdyBuZXcgRXJyb3IoZGV0YWlsID8gYENoYXQgc3RyZWFtIGZhaWxlZDogJHtkZXRhaWx9YCA6IGBDaGF0IHN0cmVhbSBmYWlsZWQ6ICR7cmVzcG9uc2Uuc3RhdHVzVGV4dH1gKTtcbiAgICAgIH1cblxuICAgICAgY29uc3QgcmVhZGVyID0gcmVzcG9uc2UuYm9keT8uZ2V0UmVhZGVyKCk7XG4gICAgICBpZiAoIXJlYWRlcikge1xuICAgICAgICB0aHJvdyBuZXcgRXJyb3IoJ05vIHJlc3BvbnNlIGJvZHknKTtcbiAgICAgIH1cblxuICAgICAgY29uc3QgZGVjb2RlciA9IG5ldyBUZXh0RGVjb2RlcigpO1xuICAgICAgbGV0IGJ1ZmZlciA9ICcnO1xuXG4gICAgICB3aGlsZSAodHJ1ZSkge1xuICAgICAgICBjb25zdCB7IGRvbmUsIHZhbHVlIH0gPSBhd2FpdCByZWFkZXIucmVhZCgpO1xuICAgICAgICBpZiAoZG9uZSkgYnJlYWs7XG5cbiAgICAgICAgYnVmZmVyICs9IGRlY29kZXIuZGVjb2RlKHZhbHVlLCB7IHN0cmVhbTogdHJ1ZSB9KTtcbiAgICAgICAgY29uc3QgbGluZXMgPSBidWZmZXIuc3BsaXQoJ1xcbicpO1xuICAgICAgICBidWZmZXIgPSBsaW5lcy5wb3AoKSB8fCAnJztcblxuICAgICAgICBmb3IgKGNvbnN0IGxpbmUgb2YgbGluZXMpIHtcbiAgICAgICAgICBpZiAobGluZS50cmltKCkpIHtcbiAgICAgICAgICAgIHRyeSB7XG4gICAgICAgICAgICAgIGNvbnN0IGNodW5rID0gSlNPTi5wYXJzZShsaW5lKSBhcyBPbGxhbWFDaGF0UmVzcG9uc2U7XG4gICAgICAgICAgICAgIHlpZWxkIGNodW5rO1xuICAgICAgICAgICAgfSBjYXRjaCAoZSkge1xuICAgICAgICAgICAgICBsb2dnZXIud2FybignRmFpbGVkIHRvIHBhcnNlIGNoYXQgc3RyZWFtIGNodW5rOicsIGxpbmUpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgfVxuICAgIH0gY2F0Y2ggKGVycm9yKSB7XG4gICAgICBpZiAoaXNBYm9ydEVycm9yKGVycm9yKSB8fCBjb250cm9sbGVyLnNpZ25hbC5hYm9ydGVkKSByZXR1cm47XG4gICAgICBsb2dnZXIuZXJyb3IoJ09sbGFtYSBjaGF0IHN0cmVhbSBmYWlsZWQ6JywgZXJyb3IpO1xuICAgICAgdGhyb3cgZXJyb3I7XG4gICAgfSBmaW5hbGx5IHtcbiAgICAgIGNsZWFyVGltZW91dCh0aW1lb3V0SWQpO1xuICAgICAgaWYgKHNpZ25hbCkgc2lnbmFsLnJlbW92ZUV2ZW50TGlzdGVuZXIoJ2Fib3J0Jywgb25BYm9ydCk7XG4gICAgfVxuICB9XG5cbiAgLyoqXG4gICAqIOaLieWPluaooeWei1xuICAgKi9cbiAgYXN5bmMgcHVsbE1vZGVsKG1vZGVsTmFtZTogc3RyaW5nKTogUHJvbWlzZTx2b2lkPiB7XG4gICAgdHJ5IHtcbiAgICAgIGNvbnN0IHJlc3BvbnNlID0gYXdhaXQgZmV0Y2goYCR7dGhpcy5jb25maWcuYmFzZVVybH0vYXBpL3B1bGxgLCB7XG4gICAgICAgIG1ldGhvZDogJ1BPU1QnLFxuICAgICAgICBoZWFkZXJzOiB7XG4gICAgICAgICAgJ0NvbnRlbnQtVHlwZSc6ICdhcHBsaWNhdGlvbi9qc29uJyxcbiAgICAgICAgICAuLi50aGlzLmNvbmZpZy5oZWFkZXJzLFxuICAgICAgICB9LFxuICAgICAgICBib2R5OiBKU09OLnN0cmluZ2lmeSh7IG5hbWU6IG1vZGVsTmFtZSB9KSxcbiAgICAgICAgc2lnbmFsOiBBYm9ydFNpZ25hbC50aW1lb3V0KHRoaXMuY29uZmlnLnRpbWVvdXQgKiAxMCksIC8vIOaLieWPluaooeWei+mcgOimgeabtOmVv+aXtumXtFxuICAgICAgfSk7XG5cbiAgICAgIGlmICghcmVzcG9uc2Uub2spIHtcbiAgICAgICAgdGhyb3cgbmV3IEVycm9yKGBQdWxsIG1vZGVsIGZhaWxlZDogJHtyZXNwb25zZS5zdGF0dXNUZXh0fWApO1xuICAgICAgfVxuXG4gICAgICAvLyDlpITnkIbmtYHlvI/lk43lupRcbiAgICAgIGNvbnN0IHJlYWRlciA9IHJlc3BvbnNlLmJvZHk/LmdldFJlYWRlcigpO1xuICAgICAgaWYgKHJlYWRlcikge1xuICAgICAgICBjb25zdCBkZWNvZGVyID0gbmV3IFRleHREZWNvZGVyKCk7XG4gICAgICAgIHdoaWxlICh0cnVlKSB7XG4gICAgICAgICAgY29uc3QgeyBkb25lIH0gPSBhd2FpdCByZWFkZXIucmVhZCgpO1xuICAgICAgICAgIGlmIChkb25lKSBicmVhaztcbiAgICAgICAgfVxuICAgICAgfVxuXG4gICAgICBsb2dnZXIuaW5mbygnTW9kZWwgcHVsbGVkIHN1Y2Nlc3NmdWxseTonLCBtb2RlbE5hbWUpO1xuICAgIH0gY2F0Y2ggKGVycm9yKSB7XG4gICAgICBsb2dnZXIuZXJyb3IoJ0ZhaWxlZCB0byBwdWxsIG1vZGVsOicsIGVycm9yKTtcbiAgICAgIHRocm93IGVycm9yO1xuICAgIH1cbiAgfVxuXG4gIC8qKlxuICAgKiDliKDpmaTmqKHlnotcbiAgICovXG4gIGFzeW5jIGRlbGV0ZU1vZGVsKG1vZGVsTmFtZTogc3RyaW5nKTogUHJvbWlzZTx2b2lkPiB7XG4gICAgdHJ5IHtcbiAgICAgIGNvbnN0IHJlc3BvbnNlID0gYXdhaXQgZmV0Y2goYCR7dGhpcy5jb25maWcuYmFzZVVybH0vYXBpL2RlbGV0ZWAsIHtcbiAgICAgICAgbWV0aG9kOiAnREVMRVRFJyxcbiAgICAgICAgaGVhZGVyczoge1xuICAgICAgICAgICdDb250ZW50LVR5cGUnOiAnYXBwbGljYXRpb24vanNvbicsXG4gICAgICAgICAgLi4udGhpcy5jb25maWcuaGVhZGVycyxcbiAgICAgICAgfSxcbiAgICAgICAgYm9keTogSlNPTi5zdHJpbmdpZnkoeyBuYW1lOiBtb2RlbE5hbWUgfSksXG4gICAgICAgIHNpZ25hbDogQWJvcnRTaWduYWwudGltZW91dCh0aGlzLmNvbmZpZy50aW1lb3V0KSxcbiAgICAgIH0pO1xuXG4gICAgICBpZiAoIXJlc3BvbnNlLm9rKSB7XG4gICAgICAgIHRocm93IG5ldyBFcnJvcihgRGVsZXRlIG1vZGVsIGZhaWxlZDogJHtyZXNwb25zZS5zdGF0dXNUZXh0fWApO1xuICAgICAgfVxuXG4gICAgICBsb2dnZXIuaW5mbygnTW9kZWwgZGVsZXRlZCBzdWNjZXNzZnVsbHk6JywgbW9kZWxOYW1lKTtcbiAgICB9IGNhdGNoIChlcnJvcikge1xuICAgICAgbG9nZ2VyLmVycm9yKCdGYWlsZWQgdG8gZGVsZXRlIG1vZGVsOicsIGVycm9yKTtcbiAgICAgIHRocm93IGVycm9yO1xuICAgIH1cbiAgfVxuXG4gIC8qKlxuICAgKiDojrflj5bmqKHlnovkv6Hmga9cbiAgICovXG4gIGFzeW5jIGdldE1vZGVsSW5mbyhtb2RlbE5hbWU6IHN0cmluZyk6IFByb21pc2U8T2xsYW1hTW9kZWw+IHtcbiAgICB0cnkge1xuICAgICAgY29uc3QgcmVzcG9uc2UgPSBhd2FpdCBmZXRjaChgJHt0aGlzLmNvbmZpZy5iYXNlVXJsfS9hcGkvc2hvd2AsIHtcbiAgICAgICAgbWV0aG9kOiAnUE9TVCcsXG4gICAgICAgIGhlYWRlcnM6IHtcbiAgICAgICAgICAnQ29udGVudC1UeXBlJzogJ2FwcGxpY2F0aW9uL2pzb24nLFxuICAgICAgICAgIC4uLnRoaXMuY29uZmlnLmhlYWRlcnMsXG4gICAgICAgIH0sXG4gICAgICAgIGJvZHk6IEpTT04uc3RyaW5naWZ5KHsgbmFtZTogbW9kZWxOYW1lIH0pLFxuICAgICAgICBzaWduYWw6IEFib3J0U2lnbmFsLnRpbWVvdXQodGhpcy5jb25maWcudGltZW91dCksXG4gICAgICB9KTtcblxuICAgICAgaWYgKCFyZXNwb25zZS5vaykge1xuICAgICAgICB0aHJvdyBuZXcgRXJyb3IoYEdldCBtb2RlbCBpbmZvIGZhaWxlZDogJHtyZXNwb25zZS5zdGF0dXNUZXh0fWApO1xuICAgICAgfVxuXG4gICAgICByZXR1cm4gYXdhaXQgcmVzcG9uc2UuanNvbigpO1xuICAgIH0gY2F0Y2ggKGVycm9yKSB7XG4gICAgICBsb2dnZXIuZXJyb3IoJ0ZhaWxlZCB0byBnZXQgbW9kZWwgaW5mbzonLCBlcnJvcik7XG4gICAgICB0aHJvdyBlcnJvcjtcbiAgICB9XG4gIH1cbn1cblxuLyoqXG4gKiDliJvlu7rpu5jorqTnmoTnlJ/miJDpgInpoblcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGNyZWF0ZURlZmF1bHRPcHRpb25zKCk6IE9sbGFtYUdlbmVyYXRlT3B0aW9ucyB7XG4gIHJldHVybiB7XG4gICAgdGVtcGVyYXR1cmU6IDAuNyxcbiAgICBudW1fcHJlZGljdDogMjA0OCxcbiAgICB0b3BfcDogMC45LFxuICAgIHRvcF9rOiA0MCxcbiAgICByZXBlYXRfcGVuYWx0eTogMS4xLFxuICB9O1xufVxuXG4vKipcbiAqIOWFqOWxgCBPbGxhbWEg5a6i5oi356uv5a6e5L6LXG4gKi9cbmV4cG9ydCBjb25zdCBvbGxhbWFDbGllbnQgPSBuZXcgT2xsYW1hQ2xpZW50KCk7XG5cbmV4cG9ydCBkZWZhdWx0IE9sbGFtYUNsaWVudDtcblxuZnVuY3Rpb24gaXNBYm9ydEVycm9yKGVycm9yOiB1bmtub3duKTogYm9vbGVhbiB7XG4gIGlmICghZXJyb3IgfHwgdHlwZW9mIGVycm9yICE9PSAnb2JqZWN0JykgcmV0dXJuIGZhbHNlO1xuICBjb25zdCBhbnlFcnJvciA9IGVycm9yIGFzIHsgbmFtZT86IHVua25vd247IG1lc3NhZ2U/OiB1bmtub3duIH07XG4gIGlmIChhbnlFcnJvci5uYW1lID09PSAnQWJvcnRFcnJvcicpIHJldHVybiB0cnVlO1xuICBjb25zdCBtZXNzYWdlID0gdHlwZW9mIGFueUVycm9yLm1lc3NhZ2UgPT09ICdzdHJpbmcnID8gYW55RXJyb3IubWVzc2FnZSA6ICcnO1xuICByZXR1cm4gbWVzc2FnZS5pbmNsdWRlcygnQWJvcnRFcnJvcicpIHx8IChtZXNzYWdlLmluY2x1ZGVzKCdhYm9ydGVkJykgJiYgbWVzc2FnZS5pbmNsdWRlcygnc2lnbmFsJykpO1xufVxuIl19