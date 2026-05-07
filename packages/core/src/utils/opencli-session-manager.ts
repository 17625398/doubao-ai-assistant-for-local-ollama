/**
 * OpenCLI 会话管理模块
 * 
 * 提供浏览器会话的保存、加载和切换功能
 */

import { opencli } from './opencli-skill';
import { opencliVisualizer } from './opencli-visualizer';
import { logger } from './logger';

/**
 * 会话数据
 */
export interface SessionData {
  /** 会话 ID */
  id: string;
  /** 会话名称 */
  name: string;
  /** 创建时间 */
  createdAt: number;
  /** 更新时间 */
  updatedAt: number;
  /** 初始 URL */
  initialUrl?: string;
  /** Cookies */
  cookies?: string;
  /** LocalStorage 数据 */
  localStorage?: Record<string, string>;
  /** SessionStorage 数据 */
  sessionStorage?: Record<string, string>;
  /** 认证令牌 */
  tokens?: Record<string, string>;
}

/**
 * 会话管理选项
 */
export interface SessionManagerOptions {
  /** 是否自动保存会话 */
  autoSave?: boolean;
  /** 是否加密敏感数据 */
  encryptSensitiveData?: boolean;
  /** 会话保存期限（天） */
  sessionExpiryDays?: number;
}

/**
 * OpenCLI 会话管理器
 */
export class OpenCLISessionManager {
  private static instance: OpenCLISessionManager;
  private sessions: Map<string, SessionData> = new Map();
  private currentSessionId: string | null = null;
  private options: SessionManagerOptions;
  private encryptionKey: string | null = null;

  private constructor(options: SessionManagerOptions = {}) {
    this.options = {
      autoSave: false,
      encryptSensitiveData: true,
      sessionExpiryDays: 30,
      ...options,
    };
    this.initializeEncryption();
  }

  /**
   * 初始化加密
   */
  private initializeEncryption(): void {
    if (this.options.encryptSensitiveData) {
      this.encryptionKey = this.generateEncryptionKey();
      logger.info('[OpenCLISessionManager] 加密已初始化');
    }
  }

  /**
   * 生成加密密钥
   */
  private generateEncryptionKey(): string {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let key = '';
    for (let i = 0; i < 32; i++) {
      key += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return key;
  }

  /**
   * 简单加密（XOR 加密）
   */
  private encrypt(text: string): string {
    if (!this.encryptionKey) return text;
    
    let result = '';
    for (let i = 0; i < text.length; i++) {
      const charCode = text.charCodeAt(i);
      const keyChar = this.encryptionKey.charCodeAt(i % this.encryptionKey.length);
      result += String.fromCharCode(charCode ^ keyChar);
    }
    return btoa(result);
  }

  /**
   * 简单解密
   */
  private decrypt(encryptedText: string): string {
    if (!this.encryptionKey) return encryptedText;
    
    const decoded = atob(encryptedText);
    let result = '';
    for (let i = 0; i < decoded.length; i++) {
      const charCode = decoded.charCodeAt(i);
      const keyChar = this.encryptionKey.charCodeAt(i % this.encryptionKey.length);
      result += String.fromCharCode(charCode ^ keyChar);
    }
    return result;
  }

  /**
   * 加密敏感数据
   */
  private encryptSensitiveFields(session: SessionData): SessionData {
    if (!this.options.encryptSensitiveData) return session;

    const encrypted = { ...session };
    
    if (encrypted.cookies) {
      encrypted.cookies = this.encrypt(encrypted.cookies);
    }
    
    if (encrypted.tokens) {
      const encryptedTokens: Record<string, string> = {};
      for (const [key, value] of Object.entries(encrypted.tokens)) {
        encryptedTokens[key] = this.encrypt(value);
      }
      encrypted.tokens = encryptedTokens;
    }

    return encrypted;
  }

  /**
   * 解密敏感数据
   */
  private decryptSensitiveFields(session: SessionData): SessionData {
    if (!this.options.encryptSensitiveData) return session;

    const decrypted = { ...session };
    
    if (decrypted.cookies) {
      decrypted.cookies = this.decrypt(decrypted.cookies);
    }
    
    if (decrypted.tokens) {
      const decryptedTokens: Record<string, string> = {};
      for (const [key, value] of Object.entries(decrypted.tokens)) {
        decryptedTokens[key] = this.decrypt(value);
      }
      decrypted.tokens = decryptedTokens;
    }

    return decrypted;
  }

  /**
   * 获取单例实例
   */
  public static getInstance(options?: SessionManagerOptions): OpenCLISessionManager {
    if (!OpenCLISessionManager.instance) {
      OpenCLISessionManager.instance = new OpenCLISessionManager(options);
    }
    return OpenCLISessionManager.instance;
  }

  /**
   * 创建新会话
   */
  public createSession(name: string = '未命名会话'): SessionData {
    const sessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    const session: SessionData = {
      id: sessionId,
      name,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };

    this.sessions.set(sessionId, session);
    this.currentSessionId = sessionId;

    logger.info('[OpenCLISessionManager] 创建会话:', sessionId, name);
    this.auditLog('create_session', sessionId, { name });
    opencliVisualizer.showToast(`创建会话：${name}`, 'success');

    return session;
  }

  /**
   * 保存当前浏览器状态到会话
   */
  public async saveCurrentState(sessionId?: string): Promise<SessionData | null> {
    const targetSessionId = sessionId || this.currentSessionId;
    if (!targetSessionId) {
      logger.error('[OpenCLISessionManager] 没有当前会话');
      return null;
    }

    const session = this.sessions.get(targetSessionId);
    if (!session) {
      logger.error('[OpenCLISessionManager] 会话不存在:', targetSessionId);
      return null;
    }

    try {
      // 获取当前页面 URL
      const urlResult = await opencli.eval('window.location.href');
      session.initialUrl = urlResult.output;

      // 获取 Cookies
      const cookiesResult = await opencli.eval('document.cookie');
      session.cookies = cookiesResult.output;

      // 获取 LocalStorage
      const localStorageResult = await opencli.eval(`
        JSON.stringify(Object.fromEntries(Object.entries(localStorage)))
      `);
      session.localStorage = JSON.parse(localStorageResult.output);

      // 获取 SessionStorage
      const sessionStorageResult = await opencli.eval(`
        JSON.stringify(Object.fromEntries(Object.entries(sessionStorage)))
      `);
      session.sessionStorage = JSON.parse(sessionStorageResult.output);

      // 获取认证令牌
      session.tokens = await this.extractAuthTokens();

      session.updatedAt = Date.now();

      // 加密敏感数据后存储
      const encryptedSession = this.encryptSensitiveFields(session);
      this.sessions.set(targetSessionId, encryptedSession);

      logger.info('[OpenCLISessionManager] 保存会话状态:', sessionId);
      opencliVisualizer.showToast('会话状态已保存（加密）', 'success');

      return session;
    } catch (error) {
      logger.error('[OpenCLISessionManager] 保存会话状态失败:', error);
      opencliVisualizer.showToast('保存会话状态失败', 'error');
      return null;
    }
  }

  /**
   * 提取认证令牌
   */
  private async extractAuthTokens(): Promise<Record<string, string>> {
    try {
      const tokens: Record<string, string> = {};

      // 从 LocalStorage 提取常见令牌
      const tokenKeys = ['token', 'auth_token', 'access_token', 'jwt', 'session_token'];
      
      for (const key of tokenKeys) {
        const result = await opencli.eval(`localStorage.getItem('${key}')`);
        if (result.output && result.output !== 'null') {
          tokens[key] = result.output;
        }
      }

      return tokens;
    } catch (error) {
      logger.warn('[OpenCLISessionManager] 提取认证令牌失败:', error);
      return {};
    }
  }

  /**
   * 检查会话是否过期
   */
  private isSessionExpired(session: SessionData): boolean {
    const expiryMs = this.options.sessionExpiryDays! * 24 * 60 * 60 * 1000;
    const now = Date.now();
    return (now - session.updatedAt) > expiryMs;
  }

  /**
   * 验证会话完整性
   */
  private validateSession(session: SessionData): boolean {
    // 检查必要字段
    if (!session.id || !session.name || !session.createdAt) {
      return false;
    }
    // 检查时间戳合理性
    if (session.updatedAt < session.createdAt) {
      return false;
    }
    return true;
  }

  /**
   * 加载会话到浏览器
   */
  public async loadSession(sessionId: string): Promise<boolean> {
    const session = this.sessions.get(sessionId);
    if (!session) {
      logger.error('[OpenCLISessionManager] 会话不存在:', sessionId);
      return false;
    }

    // 验证会话完整性
    if (!this.validateSession(session)) {
      logger.error('[OpenCLISessionManager] 会话验证失败:', sessionId);
      opencliVisualizer.showToast('会话数据已损坏', 'error');
      return false;
    }

    // 检查会话是否过期
    if (this.isSessionExpired(session)) {
      logger.warn('[OpenCLISessionManager] 会话已过期:', sessionId);
      opencliVisualizer.showToast('会话已过期，请重新登录', 'error');
      return false;
    }

    // 解密敏感数据
    const decryptedSession = this.decryptSensitiveFields(session);

    try {
      opencliVisualizer.updateStatus(`加载会话：${session.name}`, 'busy');

      // 打开初始 URL
      if (decryptedSession.initialUrl) {
        await opencli.open(decryptedSession.initialUrl);
        await new Promise(resolve => setTimeout(resolve, 1000));
      }

      // 恢复 Cookies（需要通过扩展 API）
      if (decryptedSession.cookies) {
        await opencli.eval(`document.cookie = "${decryptedSession.cookies}"`);
      }

      // 恢复 LocalStorage
      if (decryptedSession.localStorage) {
        for (const [key, value] of Object.entries(decryptedSession.localStorage)) {
          await opencli.eval(`localStorage.setItem('${key}', '${value.replace(/'/g, "\\'")}')`);
        }
      }

      // 恢复 SessionStorage
      if (decryptedSession.sessionStorage) {
        for (const [key, value] of Object.entries(decryptedSession.sessionStorage)) {
          await opencli.eval(`sessionStorage.setItem('${key}', '${value.replace(/'/g, "\\'")}')`);
        }
      }

      // 恢复认证令牌
      if (decryptedSession.tokens) {
        for (const [key, value] of Object.entries(decryptedSession.tokens)) {
          await opencli.eval(`localStorage.setItem('${key}', '${value.replace(/'/g, "\\'")}')`);
        }
      }

      this.currentSessionId = sessionId;

      logger.info('[OpenCLISessionManager] 加载会话成功:', sessionId);
      this.auditLog('load_session', sessionId, { name: session.name });
      opencliVisualizer.updateStatus('会话加载成功', 'ready');
      opencliVisualizer.showToast(`加载会话：${session.name}`, 'success');

      return true;
    } catch (error) {
      logger.error('[OpenCLISessionManager] 加载会话失败:', error);
      this.auditLog('load_session_failed', sessionId, { error: String(error) });
      opencliVisualizer.updateStatus('会话加载失败', 'error');
      opencliVisualizer.showToast('加载会话失败', 'error');
      return false;
    }
  }

  /**
   * 切换会话
   */
  public async switchSession(sessionId: string): Promise<boolean> {
    const success = await this.loadSession(sessionId);
    if (success) {
      logger.info('[OpenCLISessionManager] 切换会话:', sessionId);
    }
    return success;
  }

  /**
   * 获取会话（自动解密）
   */
  public getSession(sessionId: string): SessionData | undefined {
    const session = this.sessions.get(sessionId);
    if (session) {
      return this.decryptSensitiveFields(session);
    }
    return session;
  }

  /**
   * 获取所有会话（自动解密）
   */
  public getAllSessions(): SessionData[] {
    const sessions = Array.from(this.sessions.values());
    return sessions.map(session => this.decryptSensitiveFields(session));
  }

  /**
   * 删除会话
   */
  public deleteSession(sessionId: string): boolean {
    const session = this.sessions.get(sessionId);
    const deleted = this.sessions.delete(sessionId);
    if (deleted) {
      if (this.currentSessionId === sessionId) {
        this.currentSessionId = null;
      }
      logger.info('[OpenCLISessionManager] 删除会话:', sessionId);
      this.auditLog('delete_session', sessionId, { 
        sessionName: session?.name,
        wasCurrent: this.currentSessionId === sessionId 
      });
      opencliVisualizer.showToast('会话已删除', 'success');
    }
    return deleted;
  }

  /**
   * 获取当前会话（自动解密）
   */
  public getCurrentSession(): SessionData | null {
    if (!this.currentSessionId) return null;
    const session = this.sessions.get(this.currentSessionId);
    if (session) {
      return this.decryptSensitiveFields(session);
    }
    return null;
  }

  /**
   * 导出会话为 JSON（加密敏感数据）
   */
  public exportSession(sessionId: string, includeRawData: boolean = false): string | null {
    const session = this.sessions.get(sessionId);
    if (!session) return null;

    if (includeRawData) {
      // 导出原始加密数据
      return JSON.stringify(session, null, 2);
    } else {
      // 导出解密后的数据
      const decrypted = this.decryptSensitiveFields(session);
      return JSON.stringify(decrypted, null, 2);
    }
  }

  /**
   * 从 JSON 导入会话
   */
  public importSession(json: string): SessionData | null {
    try {
      const session: SessionData = JSON.parse(json);
      this.sessions.set(session.id, session);
      logger.info('[OpenCLISessionManager] 导入会话:', session.id);
      return session;
    } catch (error) {
      logger.error('[OpenCLISessionManager] 导入会话失败:', error);
      return null;
    }
  }

  /**
   * 清除所有会话
   */
  public clearAllSessions(): void {
    const sessionCount = this.sessions.size;
    this.sessions.clear();
    this.currentSessionId = null;
    logger.info('[OpenCLISessionManager] 清除所有会话');
    this.auditLog('clear_all_sessions', undefined, { sessionCount });
    opencliVisualizer.showToast('所有会话已清除', 'success');
  }

  /**
   * 安全审计：记录敏感操作
   */
  private auditLog(action: string, sessionId?: string, details?: any): void {
    const timestamp = new Date().toISOString();
    const logEntry = {
      timestamp,
      action,
      sessionId,
      details,
      userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : 'unknown',
    };
    
    logger.info('[OpenCLISessionManager] 安全审计:', JSON.stringify(logEntry));
  }

  /**
   * 获取会话统计
   */
  public getSessionStats(): {
    totalSessions: number;
    hasCurrentSession: boolean;
    currentSessionName?: string;
    encryptedSessions: number;
    expiredSessions: number;
  } {
    let expiredSessions = 0;
    this.sessions.forEach(session => {
      if (this.isSessionExpired(session)) {
        expiredSessions++;
      }
    });

    return {
      totalSessions: this.sessions.size,
      hasCurrentSession: !!this.currentSessionId,
      currentSessionName: this.currentSessionId 
        ? this.sessions.get(this.currentSessionId)?.name 
        : undefined,
      encryptedSessions: this.options.encryptSensitiveData ? this.sessions.size : 0,
      expiredSessions,
    };
  }

  /**
   * 清理过期会话
   */
  public cleanupExpiredSessions(): number {
    let cleaned = 0;
    const sessionsToRemove: string[] = [];

    this.sessions.forEach((session, sessionId) => {
      if (this.isSessionExpired(session)) {
        sessionsToRemove.push(sessionId);
      }
    });

    for (const sessionId of sessionsToRemove) {
      this.deleteSession(sessionId);
      cleaned++;
    }

    if (cleaned > 0) {
      logger.info('[OpenCLISessionManager] 清理过期会话:', cleaned);
      this.auditLog('cleanup_expired_sessions', undefined, { cleaned });
    }

    return cleaned;
  }

  /**
   * 导出安全审计报告
   */
  public exportSecurityAudit(): {
    totalSessions: number;
    encryptedCount: number;
    expiredCount: number;
    lastCleanupTime: string;
    securityLevel: 'high' | 'medium' | 'low';
  } {
    const stats = this.getSessionStats();
    const securityLevel = this.options.encryptSensitiveData 
      ? (stats.expiredSessions === 0 ? 'high' : 'medium')
      : 'low';

    return {
      totalSessions: stats.totalSessions,
      encryptedCount: stats.encryptedSessions,
      expiredCount: stats.expiredSessions,
      lastCleanupTime: new Date().toISOString(),
      securityLevel,
    };
  }
}

// 导出单例
export const opencliSessionManager = OpenCLISessionManager.getInstance();
