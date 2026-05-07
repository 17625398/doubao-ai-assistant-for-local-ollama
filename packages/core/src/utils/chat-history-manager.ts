// 聊天记录管理器
// 提供聊天记录的保存、加载、导出、搜索等功能

import { ChatSession, ChatMessage } from '../types';
import { logger } from './logger';
import { eventBus } from './event-bus';

const STORAGE_KEY = 'doubao_chat_history';
const MAX_SESSIONS = 100; // 最大保存会话数
const MAX_MESSAGES_PER_SESSION = 1000; // 每个会话最大消息数

/**
 * 聊天记录管理器
 */
export class ChatHistoryManager {
  private sessions: Map<string, ChatSession> = new Map();
  private currentSessionId: string | null = null;
  private initialized: boolean = false;

  constructor() {
    // 延迟初始化，避免在服务端渲染时执行
    if (typeof window !== 'undefined') {
      this.initialize();
    }
  }

  /**
   * 初始化（在浏览器环境中调用）
   */
  private initialize(): void {
    if (this.initialized) return;
    this.loadFromStorage();
    this.initialized = true;
  }

  /**
   * 创建新会话
   */
  createSession(title?: string): ChatSession {
    const session: ChatSession = {
      id: this.generateId(),
      title: title || '新对话',
      messages: [],
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };

    this.sessions.set(session.id, session);
    this.currentSessionId = session.id;
    this.saveToStorage();
    
    eventBus.emit('chat:session-created', session);
    logger.info('[ChatHistoryManager] Created new session:', session.id);
    
    return session;
  }

  /**
   * 获取当前会话
   */
  getCurrentSession(): ChatSession | null {
    if (!this.currentSessionId) return null;
    return this.sessions.get(this.currentSessionId) || null;
  }

  getCurrentSessionId(): string | null {
    return this.currentSessionId;
  }

  /**
   * 设置当前会话
   */
  setCurrentSession(sessionId: string): boolean {
    const session = this.sessions.get(sessionId);
    if (!session) {
      logger.warn('[ChatHistoryManager] Session not found:', sessionId);
      return false;
    }
    
    this.currentSessionId = sessionId;
    eventBus.emit('chat:session-changed', session);
    logger.info('[ChatHistoryManager] Switched to session:', sessionId);
    return true;
  }

  setSessionMessages(sessionId: string, messages: ChatMessage[]): boolean {
    const session = this.sessions.get(sessionId);
    if (!session) return false;

    session.messages = messages.slice(-MAX_MESSAGES_PER_SESSION);
    session.updatedAt = Date.now();

    const firstUser = session.messages.find((m) => m.role === 'user' && m.content.trim());
    if (firstUser && (!session.title || session.title === '新对话' || session.title === '欢迎使用AI智能分析平台')) {
      session.title = this.generateTitle(firstUser.content);
    }

    this.saveToStorage();
    eventBus.emit('chat:session-updated', { sessionId, title: session.title });
    return true;
  }

  /**
   * 获取所有会话列表
   */
  getAllSessions(): ChatSession[] {
    return Array.from(this.sessions.values())
      .sort((a, b) => b.updatedAt - a.updatedAt);
  }

  /**
   * 获取会话详情
   */
  getSession(sessionId: string): ChatSession | null {
    return this.sessions.get(sessionId) || null;
  }

  updateSessionTitle(sessionId: string, title: string): boolean {
    const session = this.sessions.get(sessionId);
    if (!session) return false;

    const nextTitle = title.trim();
    if (!nextTitle) return false;

    session.title = nextTitle;
    session.updatedAt = Date.now();
    this.saveToStorage();
    eventBus.emit('chat:session-updated', { sessionId, title: nextTitle });
    return true;
  }

  /**
   * 添加消息到当前会话
   */
  addMessage(message: Omit<ChatMessage, 'id' | 'timestamp'>): ChatMessage | null {
    const session = this.getCurrentSession();
    if (!session) {
      logger.warn('[ChatHistoryManager] No active session');
      return null;
    }

    const fullMessage: ChatMessage = {
      ...message,
      id: this.generateId(),
      timestamp: Date.now(),
    };

    session.messages.push(fullMessage);
    session.updatedAt = Date.now();

    // 限制消息数量
    if (session.messages.length > MAX_MESSAGES_PER_SESSION) {
      session.messages = session.messages.slice(-MAX_MESSAGES_PER_SESSION);
    }

    // 自动更新标题（如果是第一条用户消息）
    if (session.messages.length === 1 && message.role === 'user') {
      session.title = this.generateTitle(message.content);
    }

    this.saveToStorage();
    eventBus.emit('chat:message-added', { sessionId: session.id, message: fullMessage });
    
    return fullMessage;
  }

  /**
   * 更新消息
   */
  updateMessage(sessionId: string, messageId: string, updates: Partial<ChatMessage>): boolean {
    const session = this.sessions.get(sessionId);
    if (!session) return false;

    const messageIndex = session.messages.findIndex(m => m.id === messageId);
    if (messageIndex === -1) return false;

    session.messages[messageIndex] = {
      ...session.messages[messageIndex],
      ...updates,
    };
    session.updatedAt = Date.now();

    this.saveToStorage();
    eventBus.emit('chat:message-updated', { sessionId, messageId, updates });
    return true;
  }

  /**
   * 删除消息
   */
  deleteMessage(sessionId: string, messageId: string): boolean {
    const session = this.sessions.get(sessionId);
    if (!session) return false;

    const initialLength = session.messages.length;
    session.messages = session.messages.filter(m => m.id !== messageId);
    
    if (session.messages.length !== initialLength) {
      session.updatedAt = Date.now();
      this.saveToStorage();
      eventBus.emit('chat:message-deleted', { sessionId, messageId });
      return true;
    }
    return false;
  }

  /**
   * 删除会话
   */
  deleteSession(sessionId: string): boolean {
    const deleted = this.sessions.delete(sessionId);
    if (deleted) {
      if (this.currentSessionId === sessionId) {
        this.currentSessionId = null;
      }
      this.saveToStorage();
      eventBus.emit('chat:session-deleted', sessionId);
      logger.info('[ChatHistoryManager] Deleted session:', sessionId);
    }
    return deleted;
  }

  /**
   * 清空会话消息
   */
  clearSessionMessages(sessionId: string): boolean {
    const session = this.sessions.get(sessionId);
    if (!session) return false;

    session.messages = [];
    session.updatedAt = Date.now();
    this.saveToStorage();
    eventBus.emit('chat:session-cleared', sessionId);
    return true;
  }

  /**
   * 搜索聊天记录
   */
  search(query: string): Array<{ session: ChatSession; message: ChatMessage }> {
    const results: Array<{ session: ChatSession; message: ChatMessage }> = [];
    const lowerQuery = query.toLowerCase();

    for (const session of this.sessions.values()) {
      for (const message of session.messages) {
        if (message.content.toLowerCase().includes(lowerQuery)) {
          results.push({ session, message });
        }
      }
    }

    return results.sort((a, b) => b.message.timestamp - a.message.timestamp);
  }

  /**
   * 导出会话为 JSON
   */
  exportSession(sessionId: string): string | null {
    const session = this.sessions.get(sessionId);
    if (!session) return null;

    return JSON.stringify(session, null, 2);
  }

  /**
   * 导出所有会话为 JSON
   */
  exportAllSessions(): string {
    const data = {
      exportTime: Date.now(),
      sessions: Array.from(this.sessions.values()),
    };
    return JSON.stringify(data, null, 2);
  }

  /**
   * 导入会话
   */
  importSessions(jsonData: string): boolean {
    try {
      const data = JSON.parse(jsonData);
      
      if (data.sessions && Array.isArray(data.sessions)) {
        // 导入多个会话
        for (const session of data.sessions) {
          if (this.validateSession(session)) {
            this.sessions.set(session.id, session);
          }
        }
      } else if (this.validateSession(data)) {
        // 导入单个会话
        this.sessions.set(data.id, data);
      }

      this.cleanupSessions();
      this.saveToStorage();
      eventBus.emit('chat:sessions-imported', undefined);
      logger.info('[ChatHistoryManager] Imported sessions');
      return true;
    } catch (error) {
      logger.error('[ChatHistoryManager] Failed to import sessions:', error);
      return false;
    }
  }

  /**
   * 从本地存储加载
   */
  private loadFromStorage(): void {
    // 只在浏览器环境中执行
    if (typeof window === 'undefined' || !window.localStorage) {
      return;
    }
    
    try {
      const data = localStorage.getItem(STORAGE_KEY);
      if (data) {
        const parsed = JSON.parse(data);
        if (parsed.sessions && Array.isArray(parsed.sessions)) {
          for (const session of parsed.sessions) {
            if (this.validateSession(session)) {
              this.sessions.set(session.id, session);
            }
          }
        }
        this.currentSessionId = parsed.currentSessionId || null;
        logger.info('[ChatHistoryManager] Loaded', this.sessions.size, 'sessions from storage');
      }
    } catch (error) {
      logger.error('[ChatHistoryManager] Failed to load from storage:', error);
    }
  }

  /**
   * 保存到本地存储
   */
  private saveToStorage(): void {
    if (typeof window === 'undefined') {
      return;
    }
    
    try {
      // 清理旧会话
      this.cleanupSessions();

      // 限制每个会话的消息数量和内容长度
      const sessionsToSave = this.prepareSessionsForSave();

      const data = {
        sessions: sessionsToSave,
        currentSessionId: this.currentSessionId,
      };

      const serialized = JSON.stringify(data);
      
      // 检查是否超出配额
      if (serialized.length > 4.5 * 1024 * 1024) { // 4.5MB 安全阈值
        logger.warn('[ChatHistoryManager] Data too large, further reducing...');
        this.aggressiveReduce();
        const reducedData = {
          sessions: this.prepareSessionsForSave(),
          currentSessionId: this.currentSessionId,
        };
        localStorage.setItem(STORAGE_KEY, JSON.stringify(reducedData));
      } else {
        localStorage.setItem(STORAGE_KEY, serialized);
      }
    } catch (error) {
      if (error instanceof DOMException && error.name === 'QuotaExceededError') {
        logger.warn('[ChatHistoryManager] Storage quota exceeded, reducing data...');
        this.aggressiveReduce();
        try {
          const reducedData = {
            sessions: this.prepareSessionsForSave(),
            currentSessionId: this.currentSessionId,
          };
          localStorage.setItem(STORAGE_KEY, JSON.stringify(reducedData));
        } catch (e) {
          logger.error('[ChatHistoryManager] Still failed after reduction:', e);
          // 最后手段：只保存当前会话的标题和元数据
          this.emergencySave();
        }
      } else {
        logger.error('[ChatHistoryManager] Failed to save to storage:', error);
      }
    }
  }

  /**
   * 准备会话数据用于保存（限制消息数量和内容长度）
   */
  private prepareSessionsForSave(): Array<Record<string, unknown>> {
    const sessions = Array.from(this.sessions.values());
    return sessions.map(session => ({
      id: session.id,
      title: session.title,
      createdAt: session.createdAt,
      updatedAt: session.updatedAt,
      messages: session.messages.slice(-MAX_MESSAGES_PER_SESSION).map(msg => ({
        ...msg,
        // 限制消息内容长度
        content: msg.content.length > 50000 ? msg.content.slice(0, 50000) + '...' : msg.content,
        // 移除可能的大附件数据
        attachments: msg.attachments?.map(att => ({
          ...att,
          // 不保存 base64 数据，只保留元数据
          url: att.url?.startsWith('data:') ? undefined : att.url,
        })),
      })),
    }));
  }

  /**
   * 激进减少数据量
   */
  private aggressiveReduce(): void {
    // 只保留最近的 20 个会话
    const MAX_KEEP_SESSIONS = 20;
    const MAX_KEEP_MESSAGES = 100;
    const MAX_CONTENT_LENGTH = 10000;

    const sorted = Array.from(this.sessions.values())
      .sort((a, b) => b.updatedAt - a.updatedAt);

    // 删除旧会话
    if (sorted.length > MAX_KEEP_SESSIONS) {
      const toDelete = sorted.slice(MAX_KEEP_SESSIONS);
      for (const session of toDelete) {
        this.sessions.delete(session.id);
      }
    }

    // 减少每个会话的消息数量和内容长度
    for (const session of this.sessions.values()) {
      session.messages = session.messages.slice(-MAX_KEEP_MESSAGES).map(msg => {
        const reducedMsg = { ...msg };
        if (reducedMsg.content.length > MAX_CONTENT_LENGTH) {
          reducedMsg.content = reducedMsg.content.slice(0, MAX_CONTENT_LENGTH) + '...';
        }
        // 移除 base64 附件以减少存储空间
        if (reducedMsg.attachments) {
          reducedMsg.attachments = reducedMsg.attachments.filter(att => !att.url?.startsWith('data:'));
        }
        return reducedMsg;
      });
    }

    logger.info('[ChatHistoryManager] Aggressively reduced data size');
  }

  /**
   * 紧急保存（只保存元数据）
   */
  private emergencySave(): void {
    try {
      const minimalSessions = Array.from(this.sessions.values())
        .sort((a, b) => b.updatedAt - a.updatedAt)
        .slice(0, 5)
        .map(session => ({
          id: session.id,
          title: session.title,
          createdAt: session.createdAt,
          updatedAt: session.updatedAt,
          messages: session.messages.slice(-10).map(msg => ({
            id: msg.id,
            role: msg.role,
            content: msg.content.slice(0, 1000),
            timestamp: msg.timestamp,
          })),
        }));

      const data = {
        sessions: minimalSessions,
        currentSessionId: this.currentSessionId,
      };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
      logger.info('[ChatHistoryManager] Emergency save completed');
    } catch (e) {
      logger.error('[ChatHistoryManager] Emergency save failed:', e);
    }
  }

  /**
   * 清理旧会话
   */
  private cleanupSessions(): void {
    if (this.sessions.size > MAX_SESSIONS) {
      const sorted = Array.from(this.sessions.values())
        .sort((a, b) => a.updatedAt - b.updatedAt);
      
      const toDelete = sorted.slice(0, sorted.length - MAX_SESSIONS);
      for (const session of toDelete) {
        this.sessions.delete(session.id);
      }
      
      logger.info('[ChatHistoryManager] Cleaned up', toDelete.length, 'old sessions');
    }
  }

  /**
   * 验证会话数据
   */
  private validateSession(session: unknown): session is ChatSession {
    return (
      typeof session === 'object' &&
      session !== null &&
      'id' in session &&
      'title' in session &&
      'messages' in session &&
      Array.isArray((session as ChatSession).messages)
    );
  }

  /**
   * 生成唯一ID
   */
  private generateId(): string {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * 根据内容生成标题
   */
  private generateTitle(content: string): string {
    // 取前20个字符作为标题
    const title = content.trim().slice(0, 20);
    return title.length < content.trim().length ? title + '...' : title;
  }
}

// 注意：单例实例通过 core/index.ts 中的 getChatHistoryManager() 函数导出
// 避免在模块加载时直接实例化，以支持 SSR
