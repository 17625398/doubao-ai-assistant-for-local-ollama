// 网络代理系统

import { logger } from './logger';

/**
 * 网络代理配置
 */
export interface NetworkProxyConfig {
  enabled: boolean;
  baseUrl: string;
  timeout: number;
  retryCount: number;
  cacheEnabled: boolean;
  cacheTTL: number; // 缓存过期时间（毫秒）
  pathRewriteRules?: Record<string, string>; // 路径重写规则
  vertexAICompatible?: boolean; // 是否启用Vertex AI兼容路径
}

/**
 * 网络请求选项
 */
export interface NetworkRequestOptions {
  method?: string;
  headers?: Record<string, string>;
  body?: any;
  timeout?: number;
  retryCount?: number;
  cacheEnabled?: boolean;
  bypassInterceptor?: boolean; // 是否绕过拦截器
}

/**
 * 网络响应
 */
export interface NetworkResponse {
  status: number;
  statusText: string;
  headers: Record<string, string>;
  body: any;
  fromCache?: boolean;
}

/**
 * 网络拦截器
 */
export interface NetworkInterceptor {
  beforeRequest?: (url: string, options: NetworkRequestOptions) => Promise<{ url: string; options: NetworkRequestOptions }>;
  afterResponse?: (response: NetworkResponse) => Promise<NetworkResponse>;
  onError?: (error: Error) => Promise<Error>;
}

/**
 * 网络代理服务
 */
export class NetworkProxyService {
  private config: NetworkProxyConfig;
  private cache: Map<string, { data: NetworkResponse; timestamp: number }>;
  private interceptors: NetworkInterceptor[] = [];
  private originalFetch: typeof fetch | null = null;

  constructor(config?: Partial<NetworkProxyConfig>) {
    this.config = {
      enabled: false,
      baseUrl: '',
      timeout: 30000,
      retryCount: 3,
      cacheEnabled: true,
      cacheTTL: 3600000, // 1小时
      pathRewriteRules: {},
      vertexAICompatible: false,
      ...config,
    };
    this.cache = new Map();
    logger.info('NetworkProxyService initialized with config:', this.config);
    this.setupFetchInterceptor();
  }

  /**
   * 设置Fetch拦截器
   */
  private setupFetchInterceptor(): void {
    if (typeof window !== 'undefined' && window.fetch) {
      this.originalFetch = window.fetch;
      const self = this;
      window.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
        try {
          // 转换input为string
          const url = typeof input === 'string' ? input : input.toString();
          const options = init || {};
          
          // 检查是否需要拦截
          if (this.shouldIntercept(url)) {
            // 转换为NetworkRequestOptions
            const networkOptions: NetworkRequestOptions = {
              method: options.method || 'GET',
              headers: options.headers as Record<string, string> || {},
              body: options.body,
            };

            // 应用拦截器
            const intercepted = await self.applyInterceptors(url, networkOptions);
            if (intercepted) {
              const { url: interceptedUrl, options: interceptedOptions } = intercepted;
              
              // 构建请求选项
              const requestOptions: RequestInit = {
                method: interceptedOptions.method,
                headers: interceptedOptions.headers,
                body: interceptedOptions.body,
                ...options,
              };

              const response = await self.originalFetch!.call(window, interceptedUrl, requestOptions);
              
              // 转换响应
              let responseBody: any;
              try {
                const clonedResponse = response.clone();
                responseBody = await clonedResponse.json();
              } catch {
                responseBody = await response.text();
              }

              const headers: Record<string, string> = {};
              response.headers.forEach((value, key) => {
                headers[key] = value;
              });

              const networkResponse: NetworkResponse = {
                status: response.status,
                statusText: response.statusText,
                headers: headers,
                body: responseBody,
              };

              // 应用响应拦截器
              const interceptedResponse = await self.applyResponseInterceptors(networkResponse);
              
              // 模拟Response对象
              return new Response(JSON.stringify(interceptedResponse.body), {
                status: interceptedResponse.status,
                statusText: interceptedResponse.statusText,
                headers: interceptedResponse.headers,
              });
            }
          }
        } catch (error) {
          logger.warn('Fetch interceptor bypassed after error:', error);
        }
        
        //  fallback to original fetch
        return self.originalFetch!.call(window, input, init);
      };
      logger.info('Fetch interceptor set up');
    }
  }

  /**
   * 检查是否需要拦截请求
   * @param url 请求URL
   * @returns 是否需要拦截
   */
  private shouldIntercept(url: string): boolean {
    // 排除特定 API 路径
    if (url.includes('/api/linkmind')) {
      return false;
    }
    // 只拦截HTTP/HTTPS请求（相对路径不拦截）
    if (!url.startsWith('http://') && !url.startsWith('https://')) {
      return false;
    }
    
    // 排除本地 Ollama 服务请求
    if (url.includes('192.168.0.32:11434') || url.includes('localhost:11434') || url.includes('127.0.0.1:11434')) {
      logger.debug('Bypassing interceptor for Ollama request:', url);
      return false;
    }
    
    // 排除其他本地服务
    if (url.includes('localhost') || url.includes('127.0.0.1')) {
      logger.debug('Bypassing interceptor for local request:', url);
      return false;
    }
    
    return true;
  }

  /**
   * 添加拦截器
   */
  addInterceptor(interceptor: NetworkInterceptor): void {
    this.interceptors.push(interceptor);
    logger.info('Added network interceptor');
  }

  /**
   * 移除拦截器
   */
  removeInterceptor(interceptor: NetworkInterceptor): void {
    const index = this.interceptors.indexOf(interceptor);
    if (index > -1) {
      this.interceptors.splice(index, 1);
      logger.info('Removed network interceptor');
    }
  }

  /**
   * 应用请求拦截器
   */
  private async applyInterceptors(url: string, options: NetworkRequestOptions): Promise<{ url: string; options: NetworkRequestOptions } | null> {
    if (options.bypassInterceptor) {
      return null;
    }

    let interceptedUrl = url;
    let interceptedOptions = { ...options };

    for (const interceptor of this.interceptors) {
      if (interceptor.beforeRequest) {
        const result = await interceptor.beforeRequest(interceptedUrl, interceptedOptions);
        interceptedUrl = result.url;
        interceptedOptions = result.options;
      }
    }

    return { url: interceptedUrl, options: interceptedOptions };
  }

  /**
   * 应用响应拦截器
   */
  private async applyResponseInterceptors(response: NetworkResponse): Promise<NetworkResponse> {
    let interceptedResponse = { ...response };

    for (const interceptor of this.interceptors) {
      if (interceptor.afterResponse) {
        interceptedResponse = await interceptor.afterResponse(interceptedResponse);
      }
    }

    return interceptedResponse;
  }

  /**
   * 重写请求路径
   */
  private rewritePath(url: string): string {
    let rewrittenUrl = url;

    // 应用路径重写规则
    if (this.config.pathRewriteRules) {
      for (const [pattern, replacement] of Object.entries(this.config.pathRewriteRules)) {
        const regex = new RegExp(pattern);
        if (regex.test(rewrittenUrl)) {
          rewrittenUrl = rewrittenUrl.replace(regex, replacement);
          logger.info(`Path rewritten: ${url} -> ${rewrittenUrl}`);
          break;
        }
      }
    }

    // 处理Vertex AI兼容路径
    if (this.config.vertexAICompatible && rewrittenUrl.includes('/v1/chat/completions')) {
      // 转换为Vertex AI兼容路径
      rewrittenUrl = rewrittenUrl.replace('/v1/chat/completions', '/v1/projects/-/locations/us-central1/publishers/google/models/gemini-pro:generateContent');
      logger.info(`Vertex AI path transformed: ${url} -> ${rewrittenUrl}`);
    }

    return rewrittenUrl;
  }

  /**
   * 更新配置
   */
  updateConfig(config: Partial<NetworkProxyConfig>): void {
    this.config = { ...this.config, ...config };
    logger.info('NetworkProxyService config updated:', this.config);
  }

  /**
   * 获取当前配置
   */
  getConfig(): NetworkProxyConfig {
    return { ...this.config };
  }

  /**
   * 构建缓存键
   */
  private buildCacheKey(url: string, options: NetworkRequestOptions): string {
    const { method = 'GET', body } = options;
    const bodyStr = body ? JSON.stringify(body) : '';
    return `${method}:${url}:${bodyStr}`;
  }

  /**
   * 检查缓存
   */
  private checkCache(key: string): NetworkResponse | null {
    if (!this.config.cacheEnabled) return null;

    const cached = this.cache.get(key);
    if (!cached) return null;

    const now = Date.now();
    if (now - cached.timestamp > this.config.cacheTTL) {
      this.cache.delete(key);
      return null;
    }

    logger.info('Cache hit for:', key);
    return { ...cached.data, fromCache: true };
  }

  /**
   * 设置缓存
   */
  private setCache(key: string, response: NetworkResponse): void {
    if (!this.config.cacheEnabled) return;

    this.cache.set(key, {
      data: response,
      timestamp: Date.now(),
    });
    logger.info('Cache set for:', key);
  }

  /**
   * 清理过期缓存
   */
  cleanupCache(): void {
    const now = Date.now();
    let deleted = 0;

    for (const [key, cached] of this.cache.entries()) {
      if (now - cached.timestamp > this.config.cacheTTL) {
        this.cache.delete(key);
        deleted++;
      }
    }

    if (deleted > 0) {
      logger.info(`Cleaned up ${deleted} expired cache entries`);
    }
  }

  /**
   * 发送网络请求
   */
  async request(url: string, options: NetworkRequestOptions = {}): Promise<NetworkResponse> {
    const { method = 'GET', headers = {}, body, timeout = this.config.timeout, retryCount = this.config.retryCount, cacheEnabled = this.config.cacheEnabled, bypassInterceptor = false } = options;

    // 构建缓存键
    const cacheKey = this.buildCacheKey(url, options);

    // 检查缓存
    if (cacheEnabled) {
      const cachedResponse = this.checkCache(cacheKey);
      if (cachedResponse) {
        return cachedResponse;
      }
    }

    // 应用拦截器
    let finalUrl = url;
    let finalOptions = { ...options };
    if (!bypassInterceptor) {
      const intercepted = await this.applyInterceptors(url, options);
      if (intercepted) {
        finalUrl = intercepted.url;
        finalOptions = intercepted.options;
      }
    }

    // 应用路径重写
    finalUrl = this.rewritePath(finalUrl);

    // 构建请求选项
    const requestOptions: RequestInit = {
      method: finalOptions.method || method,
      headers: {
        'Content-Type': 'application/json',
        ...finalOptions.headers,
        ...headers,
      },
    };

    if (finalOptions.body || body) {
      requestOptions.body = JSON.stringify(finalOptions.body || body);
    }

    // 发送请求（带重试）
    let lastError: Error | null = null;
    for (let i = 0; i < retryCount; i++) {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), timeout);

        let proxiedUrl = finalUrl;
        if (this.config.enabled && this.config.baseUrl) {
          // 使用代理
          proxiedUrl = `${this.config.baseUrl}${finalUrl.startsWith('/') ? '' : '/'}${finalUrl}`;
          logger.info(`Proxying request to: ${proxiedUrl}`);
        }

        const response = await fetch(proxiedUrl, {
          ...requestOptions,
          signal: controller.signal,
        });

        clearTimeout(timeoutId);

        // 解析响应
        let responseBody: any;
        try {
          responseBody = await response.json();
        } catch {
          responseBody = await response.text();
        }

        const headers: Record<string, string> = {};
        response.headers.forEach((value, key) => {
          headers[key] = value;
        });

        let networkResponse: NetworkResponse = {
          status: response.status,
          statusText: response.statusText,
          headers: headers,
          body: responseBody,
        };

        // 应用响应拦截器
        if (!bypassInterceptor) {
          networkResponse = await this.applyResponseInterceptors(networkResponse);
        }

        // 设置缓存
        if (cacheEnabled && response.ok) {
          this.setCache(cacheKey, networkResponse);
        }

        return networkResponse;
      } catch (error) {
        lastError = error as Error;
        logger.warn(`Request failed (attempt ${i + 1}/${retryCount}):`, error);
        if (i === retryCount - 1) {
          // 应用错误拦截器
          if (!bypassInterceptor) {
            for (const interceptor of this.interceptors) {
              if (interceptor.onError) {
                lastError = await interceptor.onError(lastError);
              }
            }
          }
          throw lastError;
        }
        // 等待一段时间后重试
        await new Promise(resolve => setTimeout(resolve, 1000 * (i + 1)));
      }
    }

    throw lastError || new Error('Request failed');
  }

  /**
   * GET 请求
   */
  async get(url: string, options?: Omit<NetworkRequestOptions, 'method'>): Promise<NetworkResponse> {
    return this.request(url, { ...options, method: 'GET' });
  }

  /**
   * POST 请求
   */
  async post(url: string, body: any, options?: Omit<NetworkRequestOptions, 'method' | 'body'>): Promise<NetworkResponse> {
    return this.request(url, { ...options, method: 'POST', body });
  }

  /**
   * PUT 请求
   */
  async put(url: string, body: any, options?: Omit<NetworkRequestOptions, 'method' | 'body'>): Promise<NetworkResponse> {
    return this.request(url, { ...options, method: 'PUT', body });
  }

  /**
   * DELETE 请求
   */
  async delete(url: string, options?: Omit<NetworkRequestOptions, 'method'>): Promise<NetworkResponse> {
    return this.request(url, { ...options, method: 'DELETE' });
  }
}

/**
 * 全局网络代理服务实例
 */
export const networkProxyService = new NetworkProxyService();

export default NetworkProxyService;
