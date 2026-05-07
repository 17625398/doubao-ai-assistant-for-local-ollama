// 聊天服务

import { ollamaClient } from '../utils/ollama-client';
import { promptTemplateLibrary } from '../utils/prompt-template-library';
import { logger } from '../utils/logger';
import { eventBus } from '../utils/event-bus';
import { ChatMessage, Attachment, MessageStatus, MessageType } from '../types';
import { cacheManager } from '../utils/cache-manager';

/**
 * 聊天服务配置
 */
interface ChatServiceConfig {
  maxContextLength: number;
  cacheTTL: number;
  defaultModel: string;
  streamingTimeout: number;
}

/**
 * 聊天服务
 */
export class ChatService {
  private currentContext: string[] = [];
  private messageHistory: ChatMessage[] = [];
  private config: ChatServiceConfig;
  private activeStreams: Map<string, AbortController> = new Map();
  private messageCache: Map<string, ChatMessage> = new Map();

  constructor(config?: Partial<ChatServiceConfig>) {
    this.config = {
      maxContextLength: 10,
      cacheTTL: 3600000, // 1 hour
      defaultModel: 'gemma4:26b',
      streamingTimeout: 30000, // 30 seconds
      ...config
    };
  }

  /**
   * 发送消息
   */
  async sendMessage(content: string, options?: {
    model?: string;
    systemPrompt?: string;
    attachments?: Attachment[];
    useTemplate?: string;
    templateVariables?: Record<string, any>;
    sessionId?: string;
  }): Promise<{ message: ChatMessage; stream: AsyncGenerator<string> }> {
    try {
      const { model, systemPrompt, attachments, useTemplate, templateVariables, sessionId } = options || {};
      
      // 生成提示词
      let finalPrompt = content;
      if (useTemplate) {
        finalPrompt = promptTemplateLibrary.generatePrompt(useTemplate, templateVariables || {});
      }

      // 检查缓存
      const cacheKey = this.generateCacheKey(content, model, useTemplate, templateVariables);
      const cachedResponse = await this.getCachedResponse(cacheKey);
      
      // 创建用户消息
      const userMessage: ChatMessage = {
        id: this.generateMessageId(),
        role: 'user',
        content: content,
        timestamp: Date.now(),
        attachments: attachments,
        status: 'completed',
        type: 'text'
      };
      this.messageHistory.push(userMessage);

      // 构建聊天历史
      const chatHistory = this.messageHistory.map(msg => ({
        role: msg.role,
        content: msg.content
      }));

      // 创建助手消息
      const assistantMessage: ChatMessage = {
        id: this.generateMessageId(),
        role: 'assistant',
        content: '',
        timestamp: Date.now(),
        status: 'generating',
        type: 'text'
      };
      this.messageHistory.push(assistantMessage);

      // 触发消息发送事件
      eventBus.emit('chat:message-sent', { message: userMessage, sessionId });

      // 发送请求到 Ollama
      const stream = this.generateStream(
        model,
        chatHistory,
        systemPrompt,
        assistantMessage.id,
        cacheKey
      );

      return { message: assistantMessage, stream };
    } catch (error) {
      logger.error('Failed to send message:', error);
      
      // 触发错误事件
      eventBus.emit('chat:error', { error: error instanceof Error ? error.message : '发送消息失败' });
      throw error;
    }
  }

  /**
   * 生成流式响应
   */
  private async* generateStream(
    model: string | undefined,
    messages: any[],
    systemPrompt: string | undefined,
    messageId: string,
    cacheKey: string
  ): AsyncGenerator<string> {
    const abortController = new AbortController();
    this.activeStreams.set(messageId, abortController);

    try {
      // 设置超时
      const timeoutId = setTimeout(() => {
        abortController.abort();
      }, this.config.streamingTimeout);

      const response = ollamaClient.chatStream({
        model: model || this.config.defaultModel,
        messages: messages,
        system: systemPrompt,
        signal: abortController.signal
      });

      let fullContent = '';
      let lastUpdateTime = Date.now();

      for await (const chunk of response) {
        if (chunk.message?.content) {
          fullContent += chunk.message.content;
          yield chunk.message.content;

          // 每500ms更新一次消息内容，减少DOM更新频率
          const now = Date.now();
          if (now - lastUpdateTime > 500) {
            const message = this.messageHistory.find(msg => msg.id === messageId);
            if (message && message.role === 'assistant') {
              message.content = fullContent;
              eventBus.emit('chat:message-updated', { message });
            }
            lastUpdateTime = now;
          }
        }
      }

      clearTimeout(timeoutId);

      // 最终更新消息内容
      const message = this.messageHistory.find(msg => msg.id === messageId);
      if (message && message.role === 'assistant') {
        message.content = fullContent;
        message.status = 'completed';
        eventBus.emit('chat:message-completed', { message });
      }

      // 保存到缓存
      if (fullContent) {
        await this.cacheResponse(cacheKey, fullContent);

        // 智能管理上下文
        this.updateContext(fullContent);
      }
    } catch (error) {
      // 更新消息状态为失败
      const message = this.messageHistory.find(msg => msg.id === messageId);
      if (message) {
        message.status = 'failed';
        message.error = error instanceof Error ? error.message : '生成响应失败';
        eventBus.emit('chat:message-failed', { message, error });
      }

      logger.error('Failed to generate stream:', error);
      throw error;
    } finally {
      this.activeStreams.delete(messageId);
    }
  }

  /**
   * 智能更新上下文
   */
  private updateContext(content: string): void {
    // 计算内容重要性得分
    const importanceScore = this.calculateContentImportance(content);
    
    // 基于重要性管理上下文
    if (importanceScore > 0.5) {
      // 重要内容，添加到上下文
      this.currentContext.push(content);
    }
    
    // 保持上下文长度
    if (this.currentContext.length > this.config.maxContextLength) {
      // 移除最不重要的内容
      this.currentContext.shift();
    }
  }

  /**
   * 计算内容重要性
   */
  private calculateContentImportance(content: string): number {
    // 简单的重要性计算：基于长度、关键词等
    const lengthScore = Math.min(content.length / 500, 1);
    const hasKeywords = /(重要|关键|注意|警告|错误|问题|解决方案)/i.test(content);
    const keywordScore = hasKeywords ? 0.5 : 0;
    
    return Math.min(lengthScore + keywordScore, 1);
  }

  /**
   * 获取聊天历史
   */
  getMessageHistory(): ChatMessage[] {
    return [...this.messageHistory];
  }

  /**
   * 根据会话ID获取消息历史
   */
  getMessagesBySession(sessionId: string): ChatMessage[] {
    // 这里可以根据会话ID过滤消息
    // 目前返回所有消息，实际应用中需要根据会话ID进行过滤
    return this.getMessageHistory();
  }

  /**
   * 清空聊天历史
   */
  clearMessageHistory(sessionId?: string): void {
    this.messageHistory = [];
    this.currentContext = [];
    this.messageCache.clear();
    eventBus.emit('chat:history-cleared', { sessionId });
  }

  /**
   * 删除消息
   */
  deleteMessage(messageId: string): void {
    const index = this.messageHistory.findIndex(msg => msg.id === messageId);
    if (index !== -1) {
      const deletedMessage = this.messageHistory.splice(index, 1)[0];
      eventBus.emit('chat:message-deleted', { message: deletedMessage });
    }
  }

  /**
   * 编辑消息
   */
  editMessage(messageId: string, newContent: string): void {
    const message = this.messageHistory.find(msg => msg.id === messageId);
    if (message && message.role === 'user') {
      const oldContent = message.content;
      message.content = newContent;
      message.timestamp = Date.now();
      eventBus.emit('chat:message-edited', { message, oldContent });
    }
  }

  /**
   * 暂停流式响应
   */
  pauseStream(messageId: string): void {
    const controller = this.activeStreams.get(messageId);
    if (controller) {
      controller.abort();
      this.activeStreams.delete(messageId);
    }
  }

  /**
   * 搜索消息
   */
  searchMessages(query: string): ChatMessage[] {
    return this.messageHistory.filter(msg => 
      msg.content.toLowerCase().includes(query.toLowerCase())
    );
  }

  /**
   * 生成消息ID
   */
  private generateMessageId(): string {
    return `msg-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * 生成缓存键
   */
  private generateCacheKey(
    content: string,
    model?: string,
    template?: string,
    variables?: Record<string, any>
  ): string {
    const keyParts = [
      content,
      model || this.config.defaultModel,
      template || '',
      variables ? JSON.stringify(variables) : ''
    ];
    return `chat:${btoa(keyParts.join('|'))}`;
  }

  /**
   * 获取缓存的响应
   */
  private async getCachedResponse(cacheKey: string): Promise<string | null> {
    try {
      const cached = await cacheManager.get(cacheKey);
      return cached as string | null;
    } catch (error) {
      logger.error('Failed to get cached response:', error);
      return null;
    }
  }

  /**
   * 缓存响应
   */
  private async cacheResponse(cacheKey: string, content: string): Promise<void> {
    try {
      await cacheManager.set(cacheKey, content, this.config.cacheTTL);
    } catch (error) {
      logger.error('Failed to cache response:', error);
    }
  }

  /**
   * 分析消息
   */
  async analyzeMessage(message: string): Promise<string> {
    try {
      const cacheKey = `analyze:${btoa(message)}`;
      const cached = await this.getCachedResponse(cacheKey);
      if (cached) {
        return cached;
      }

      const response = await ollamaClient.generate(
        `请分析以下消息并提供见解：\n\n${message}`,
        {
          model: this.config.defaultModel,
          system: '你是一个专业的消息分析助手，擅长分析各种类型的消息并提供有价值的见解。'
        }
      );

      const result = response.response || '分析失败，请重试';
      await this.cacheResponse(cacheKey, result);
      return result;
    } catch (error) {
      logger.error('Failed to analyze message:', error);
      eventBus.emit('chat:error', { error: '分析消息失败' });
      throw error;
    }
  }

  /**
   * 生成回复建议
   */
  async generateReplySuggestions(message: string): Promise<string[]> {
    try {
      const cacheKey = `suggestions:${btoa(message)}`;
      const cached = await this.getCachedResponse(cacheKey);
      if (cached) {
        return JSON.parse(cached);
      }

      const response = await ollamaClient.generate(
        `请为以下消息生成3个回复建议：\n\n${message}`,
        {
          model: this.config.defaultModel,
          system: '你是一个专业的回复建议助手，擅长为各种消息生成合适的回复建议。'
        }
      );
      
      const suggestions = response.response?.split('\n')
        .filter((line: string) => line.trim())
        .map((line: string) => line.replace(/^\d+\.\s*/, ''))
        .slice(0, 3) || [];

      await this.cacheResponse(cacheKey, JSON.stringify(suggestions));
      return suggestions;
    } catch (error) {
      logger.error('Failed to generate reply suggestions:', error);
      return [];
    }
  }
}

/**
 * 全局聊天服务实例
 */
export const chatService = new ChatService();

export default ChatService;