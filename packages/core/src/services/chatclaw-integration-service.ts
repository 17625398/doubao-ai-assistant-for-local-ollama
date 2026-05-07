/**
 * ChatClaw 集成服务
 */
import { chatClawServerService } from './chatclaw-server-service';

type ChatClawFetchInit = RequestInit & {
  bypassInterceptor?: boolean;
};

export class ChatClawIntegrationService {
  private baseUrl: string;
  private apiKey: string;
  private initialized: boolean = false;

  private getErrorMessage(error: unknown): string {
    return error instanceof Error ? error.message : String(error ?? '');
  }

  private isLikelyFetchFailure(error: unknown): error is Error {
    return error instanceof Error && /Failed to fetch|NetworkError/i.test(error.message);
  }

  private isLikelyOhMyBrowserAuthError(error: unknown): boolean {
    return /AUTH_SESSION_MISSING|auth session missing|unauthorized/i.test(this.getErrorMessage(error));
  }

  private isLikelyOhMyBrowserBridgeError(error: unknown): boolean {
    return /\bfetch failed\b|extension.+(not connected|disconnected)|chrome.+(not running|closed)|browser.+(not connected|disconnected)/i.test(
      this.getErrorMessage(error)
    );
  }

  private isLikelyOhMyBrowserCliMissing(error: unknown): boolean {
    return /\bomb\b.+(not found|is not recognized)|ENOENT.+\bomb\b/i.test(this.getErrorMessage(error));
  }

  private createOpenClawFetchError(action: string, error: unknown): Error {
    if (this.isLikelyOhMyBrowserAuthError(error)) {
      return new Error(
        `${action}失败，Oh My Browser 当前未授权。请先执行 \`omb login\`，确认登录完成后再重试；如仍失败，可在技能库的 Oh My Browser 面板中重新核对授权状态。`
      );
    }

    if (this.isLikelyOhMyBrowserCliMissing(error)) {
      return new Error(
        `${action}失败，当前环境未检测到 \`omb\` 命令。请先安装 Oh My Browser CLI，并执行 \`openclaw plugins install oh-my-browser\` 与 \`openclaw gateway restart\` 后再试。`
      );
    }

    if (this.isLikelyOhMyBrowserBridgeError(error)) {
      return new Error(
        `${action}失败，Oh My Browser 暂时无法连接到你的真实浏览器。请确认 Chrome 已启动、扩展显示已连接，并在必要时执行 \`openclaw gateway restart\` 后重试。`
      );
    }

    if (this.isLikelyFetchFailure(error)) {
      return new Error(
        `${action}失败，无法连接到 OpenClaw 服务。请检查 OpenClaw 是否已启动，或确认连接配置中的 API 基础 URL \`${this.baseUrl}\` 可访问。`
      );
    }

    return error instanceof Error ? error : new Error(`${action}失败：未知错误`);
  }

  private normalizeUploadResult(result: any, fileName: string): any {
    if (result?.success) {
      return result;
    }

    const normalizedError =
      (typeof result?.error === 'string' && result.error.trim()) ||
      (typeof result?.message === 'string' && result.message.trim()) ||
      `文档 "${fileName}" 上传失败，未返回明确错误。请检查文件格式、文件内容或当前服务状态。`;

    return {
      ...result,
      success: false,
      error: normalizedError
    };
  }

  private async extractResponseErrorMessage(response: Response, fallbackMessage: string): Promise<string> {
    try {
      const rawText = await response.text();
      if (!rawText.trim()) {
        return `${fallbackMessage}（HTTP ${response.status}）`;
      }

      try {
        const parsed = JSON.parse(rawText) as { error?: string; message?: string };
        const structuredMessage =
          (typeof parsed.error === 'string' && parsed.error.trim()) ||
          (typeof parsed.message === 'string' && parsed.message.trim());

        if (structuredMessage) {
          return `${fallbackMessage}（HTTP ${response.status}）：${structuredMessage}`;
        }
      } catch {
        // Response body is plain text; fall through to raw text handling.
      }

      return `${fallbackMessage}（HTTP ${response.status}）：${rawText.trim()}`;
    } catch {
      return `${fallbackMessage}（HTTP ${response.status}）`;
    }
  }

  private normalizeUploadThrownError(error: unknown, fileName: string): Error {
    if (error instanceof Error && error.message.trim()) {
      return error;
    }

    const fallbackMessage = `文档 "${fileName}" 上传失败，发生了未识别错误。请检查文件格式、网络连接或服务日志。`;
    return new Error(
      typeof error === 'string' && error.trim() ? error : fallbackMessage
    );
  }

  /**
   * 构造函数
   * @param baseUrl ChatClaw API 基础 URL
   * @param apiKey API 密钥
   */
  constructor(baseUrl: string = 'http://localhost:8080', apiKey: string = '') {
    this.baseUrl = baseUrl;
    this.apiKey = apiKey;
  }

  /**
   * 初始化 ChatClaw 集成
   */
  async initialize(): Promise<void> {
    if (this.initialized) {
      return;
    }

    try {
      // 测试连接
      await this.testConnection();
      this.initialized = true;
    } catch (error) {
      throw error;
    }
  }

  /**
   * 测试与 ChatClaw 的连接
   */
  async testConnection(): Promise<boolean> {
    try {
      // 先启动本地 ChatClaw 服务
      await chatClawServerService.start();
      
      // 检查本地 ChatClaw 服务是否运行
      const isServerRunning = await chatClawServerService.testConnection();
      
      if (isServerRunning) {
        return true;
      }

      // 如果本地服务未运行，尝试连接外部服务
      try {
        const response = await fetch(`${this.baseUrl}/api/v1/health`, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            ...(this.apiKey ? { 'Authorization': `Bearer ${this.apiKey}` } : {})
          },
          bypassInterceptor: true
        } as ChatClawFetchInit);

        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();
        return data.status === 'ok';
      } catch (error) {
        // 外部服务连接失败，返回 false
        return false;
      }
    } catch (error) {
      // 发生错误，返回 false
      return false;
    }
  }

  /**
   * 发送聊天请求
   * @param message 聊天消息
   * @param context 上下文
   */
  async sendChat(message: string, context?: any): Promise<any> {
    try {
      // 与 testConnection 保持一致，优先尝试启动本地服务
      await chatClawServerService.start();

      // 检查本地 ChatClaw 服务是否运行
      const isServerRunning = await chatClawServerService.testConnection();
      
      if (isServerRunning) {
        // 使用本地服务
        return chatClawServerService.sendChat(message, context);
      }

      // 如果本地服务未运行，尝试连接外部服务
      const response = await fetch(`${this.baseUrl}/api/v1/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(this.apiKey ? { 'Authorization': `Bearer ${this.apiKey}` } : {})
        },
        body: JSON.stringify({ message, context }),
        bypassInterceptor: true
      } as ChatClawFetchInit);

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      throw this.createOpenClawFetchError('发送到 OpenClaw', error);
    }
  }

  /**
   * 搜索知识库
   * @param query 搜索查询
   * @param limit 结果数量限制
   */
  async searchKnowledge(query: string, limit: number = 5): Promise<any> {
    try {
      // 检查本地 ChatClaw 服务是否运行
      const isServerRunning = await chatClawServerService.testConnection();
      
      if (isServerRunning) {
        // 使用本地服务
        const results = chatClawServerService.searchKnowledgeBase(query, limit);
        return {
          success: true,
          results: results
        };
      }

      // 如果本地服务未运行，尝试连接外部服务
      const response = await fetch(`${this.baseUrl}/api/v1/knowledge`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(this.apiKey ? { 'Authorization': `Bearer ${this.apiKey}` } : {})
        },
        body: JSON.stringify({ query, limit }),
        bypassInterceptor: true
      } as ChatClawFetchInit);

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      throw error;
    }
  }

  /**
   * 获取技能列表
   */
  async getSkills(): Promise<any> {
    try {
      // 检查本地 ChatClaw 服务是否运行
      const isServerRunning = await chatClawServerService.testConnection();
      
      if (isServerRunning) {
        // 使用本地服务
        return chatClawServerService.getSkills();
      }

      // 如果本地服务未运行，尝试连接外部服务
      const response = await fetch(`${this.baseUrl}/api/v1/skills`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          ...(this.apiKey ? { 'Authorization': `Bearer ${this.apiKey}` } : {})
        },
        bypassInterceptor: true
      } as ChatClawFetchInit);

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      throw error;
    }
  }

  /**
   * 执行技能
   * @param skillId 技能 ID
   * @param toolName 工具名称
   * @param params 工具参数
   */
  async executeSkill(skillId: string, toolName: string, params: any): Promise<any> {
    try {
      // 检查本地 ChatClaw 服务是否运行
      const isServerRunning = await chatClawServerService.testConnection();
      
      if (isServerRunning) {
        // 使用本地服务
        return chatClawServerService.executeSkill(skillId, toolName, params);
      }

      // 如果本地服务未运行，尝试连接外部服务
      const response = await fetch(`${this.baseUrl}/api/v1/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(this.apiKey ? { 'Authorization': `Bearer ${this.apiKey}` } : {})
        },
        body: JSON.stringify({ tool: toolName, params }),
        bypassInterceptor: true
      } as ChatClawFetchInit);

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      throw error;
    }
  }

  /**
   * 上传文档到知识库
   * @param file 文件对象
   * @param fileName 文件名
   */
  async uploadDocument(file: File, fileName: string): Promise<any> {
    try {
      // 与 testConnection / sendChat 保持一致，优先尝试启动本地服务
      await chatClawServerService.start();

      // 检查本地 ChatClaw 服务是否运行
      const isServerRunning = await chatClawServerService.testConnection();
      
      if (isServerRunning) {
        // 使用本地服务
        const result = await chatClawServerService.uploadDocument(file, fileName);
        return this.normalizeUploadResult(result, fileName);
      }

      // 如果本地服务未运行，尝试连接外部服务
      const formData = new FormData();
      formData.append('file', file, fileName);

      const response = await fetch(`${this.baseUrl}/api/v1/knowledge/upload`, {
        method: 'POST',
        headers: {
          ...(this.apiKey ? { 'Authorization': `Bearer ${this.apiKey}` } : {})
        },
        body: formData,
        bypassInterceptor: true
      } as ChatClawFetchInit);

      if (!response.ok) {
        throw new Error(
          await this.extractResponseErrorMessage(
            response,
            `文档 "${fileName}" 上传失败`
          )
        );
      }

      const result = await response.json();
      return this.normalizeUploadResult(result, fileName);
    } catch (error) {
      throw this.normalizeUploadThrownError(error, fileName);
    }
  }

  /**
   * 获取服务器状态
   */
  async getStatus(): Promise<any> {
    try {
        const response = await fetch(`${this.baseUrl}/api/v1/health`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          ...(this.apiKey ? { 'Authorization': `Bearer ${this.apiKey}` } : {})
        },
        bypassInterceptor: true
        } as ChatClawFetchInit);

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      throw error;
    }
  }

  /**
   * 设置 API 配置
   * @param baseUrl API 基础 URL
   * @param apiKey API 密钥
   */
  setConfig(baseUrl: string, apiKey: string): void {
    this.baseUrl = baseUrl;
    this.apiKey = apiKey;
    this.initialized = false;
  }

  /**
   * 获取当前配置
   */
  getConfig(): { baseUrl: string; apiKey: string } {
    return { baseUrl: this.baseUrl, apiKey: this.apiKey };
  }
}

// 导出单例
export const chatClawIntegrationService = new ChatClawIntegrationService();
