/**
 * ChatClaw 动态上下文管理服务
 * 借鉴豆包 AI 的 32K-百万级 token 上下文窗口能力
 * 实现自适应上下文管理、分层采样策略
 */

import { logger } from '../utils/logger';
import { eventBus } from '../utils/event-bus';

/**
 * 上下文策略类型
 */
export type ContextStrategy = 'adaptive' | 'sliding_window' | 'hierarchical' | 'standard';

/**
 * 对话消息
 */
export interface ConversationMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: number;
  importance?: number; // 0-1, 消息重要性评分
  metadata?: Record<string, any>;
}

/**
 * 对话会话
 */
export interface Conversation {
  id: string;
  messages: ConversationMessage[];
  metadata: {
    createdAt: number;
    updatedAt: number;
    totalTokens: number;
    topic?: string;
    summary?: string;
  };
}

/**
 * 管理后的上下文
 */
export interface ManagedContext {
  messages: ConversationMessage[];
  summary?: string;
  keyPoints: string[];
  tokenCount: number;
  strategy: ContextStrategy;
  compressionRatio: number;
}

/**
 * 语义单元
 */
export interface SemanticUnit {
  content: string;
  startIndex: number;
  endIndex: number;
  importance: number;
  topics: string[];
  relatedUnits: number[];
}

/**
 * 上下文管理配置
 */
export interface ContextManagerConfig {
  /** 默认上下文窗口大小 */
  defaultWindowSize: number;
  /** 最大上下文窗口大小（32K） */
  maxWindowSize: number;
  /** 扩展上下文窗口大小（百万级 token） */
  extendedWindowSize: number;
  /** 启用分层采样 */
  enableHierarchicalSampling: boolean;
  /** 启用智能压缩 */
  enableSmartCompression: boolean;
  /** 保留最新消息数 */
  recentMessagesCount: number;
  /** 重要性阈值 */
  importanceThreshold: number;
}

/**
 * 动态上下文管理服务
 * 借鉴豆包 AI 的长上下文处理技术
 */
export class ChatClawContextManager {
  private config: ContextManagerConfig;
  private conversations: Map<string, Conversation> = new Map();
  private tokenEstimator: (text: string) => number;

  constructor(config?: Partial<ContextManagerConfig>) {
    this.config = {
      defaultWindowSize: 8192,
      maxWindowSize: 32768, // 32K
      extendedWindowSize: 1000000, // 百万级
      enableHierarchicalSampling: true,
      enableSmartCompression: true,
      recentMessagesCount: 5,
      importanceThreshold: 0.6,
      ...config,
    };

    // 简单的 token 估算器（实际项目中应该使用更精确的 tokenizer）
    this.tokenEstimator = (text: string) => Math.ceil(text.length / 4);

    logger.info('[ChatClawContextManager] Initialized with config:', this.config);
  }

  /**
   * 管理上下文
   * 根据策略选择不同的上下文管理方法
   */
  async manageContext(
    conversation: Conversation,
    strategy: ContextStrategy = 'adaptive'
  ): Promise<ManagedContext> {
    const startTime = Date.now();
    
    try {
      switch (strategy) {
        case 'adaptive':
          return await this.adaptiveContextManagement(conversation);
        case 'sliding_window':
          return this.slidingWindowContext(conversation);
        case 'hierarchical':
          return await this.hierarchicalContext(conversation);
        case 'standard':
        default:
          return this.standardContext(conversation);
      }
    } catch (error) {
      logger.error('[ChatClawContextManager] Context management failed:', error);
      // 失败时回退到标准上下文
      return this.standardContext(conversation);
    } finally {
      const duration = Date.now() - startTime;
      logger.debug(`[ChatClawContextManager] Context management took ${duration}ms`);
    }
  }

  /**
   * 自适应上下文管理（推荐）
   * 借鉴豆包 AI 的动态注意力机制
   */
  private async adaptiveContextManagement(conversation: Conversation): Promise<ManagedContext> {
    const { messages, metadata } = conversation;
    
    if (messages.length === 0) {
      return {
        messages: [],
        keyPoints: [],
        tokenCount: 0,
        strategy: 'adaptive',
        compressionRatio: 1,
      };
    }

    // 1. 识别关键信息
    const keyInfo = await this.extractKeyInformation(messages);
    
    // 2. 动态调整上下文窗口
    const requiredWindow = this.calculateRequiredWindow(keyInfo);
    const actualWindow = Math.min(requiredWindow, this.config.maxWindowSize);
    
    // 3. 保留最近的消息（保证对话连贯性）
    const recentMessages = messages.slice(-this.config.recentMessagesCount);
    const recentTokens = recentMessages.reduce((sum, m) => sum + this.tokenEstimator(m.content), 0);
    
    // 4. 分层采样策略（借鉴豆包的长视频处理）
    const remainingTokens = actualWindow - recentTokens;
    const historicalMessages = messages.slice(0, -this.config.recentMessagesCount);
    
    const sampledMessages = this.hierarchicalSampling(
      historicalMessages,
      keyInfo,
      remainingTokens
    );
    
    // 5. 合并消息
    const finalMessages = [...sampledMessages, ...recentMessages];
    
    // 6. 生成摘要和关键点
    const summary = await this.generateSummary(finalMessages);
    const keyPoints = this.extractKeyPoints(keyInfo);
    
    const totalTokens = finalMessages.reduce((sum, m) => sum + this.tokenEstimator(m.content), 0);
    const originalTokens = messages.reduce((sum, m) => sum + this.tokenEstimator(m.content), 0);
    
    return {
      messages: finalMessages,
      summary,
      keyPoints,
      tokenCount: totalTokens,
      strategy: 'adaptive',
      compressionRatio: originalTokens > 0 ? totalTokens / originalTokens : 1,
    };
  }

  /**
   * 滑动窗口上下文
   * 保留最近 N 条消息
   */
  private slidingWindowContext(conversation: Conversation): ManagedContext {
    const { messages } = conversation;
    const windowSize = this.config.defaultWindowSize;
    
    let selectedMessages: ConversationMessage[] = [];
    let totalTokens = 0;
    
    // 从后向前选择消息，直到达到窗口大小
    for (let i = messages.length - 1; i >= 0; i--) {
      const message = messages[i];
      const tokens = this.tokenEstimator(message.content);
      
      if (totalTokens + tokens > windowSize) {
        break;
      }
      
      selectedMessages.unshift(message);
      totalTokens += tokens;
    }
    
    const originalTokens = messages.reduce((sum, m) => sum + this.tokenEstimator(m.content), 0);
    
    return {
      messages: selectedMessages,
      keyPoints: [],
      tokenCount: totalTokens,
      strategy: 'sliding_window',
      compressionRatio: originalTokens > 0 ? totalTokens / originalTokens : 1,
    };
  }

  /**
   * 分层上下文
   * 使用多层级摘要
   */
  private async hierarchicalContext(conversation: Conversation): Promise<ManagedContext> {
    const { messages } = conversation;
    
    // 1. 将消息分组
    const groups = this.groupMessages(messages, 10); // 每组最多 10 条
    
    // 2. 为每组生成摘要
    const groupSummaries = await Promise.all(
      groups.map(group => this.summarizeGroup(group))
    );
    
    // 3. 保留最近的消息
    const recentMessages = messages.slice(-this.config.recentMessagesCount);
    
    // 4. 构建层次结构
    const hierarchicalMessages: ConversationMessage[] = [
      {
        id: 'hierarchical-summary',
        role: 'system',
        content: `对话历史摘要：\n${groupSummaries.join('\n')}`,
        timestamp: Date.now(),
      },
      ...recentMessages,
    ];
    
    const totalTokens = hierarchicalMessages.reduce(
      (sum, m) => sum + this.tokenEstimator(m.content), 0
    );
    const originalTokens = messages.reduce((sum, m) => sum + this.tokenEstimator(m.content), 0);
    
    return {
      messages: hierarchicalMessages,
      summary: groupSummaries.join('\n'),
      keyPoints: groupSummaries,
      tokenCount: totalTokens,
      strategy: 'hierarchical',
      compressionRatio: originalTokens > 0 ? totalTokens / originalTokens : 1,
    };
  }

  /**
   * 标准上下文
   * 简单的截断处理
   */
  private standardContext(conversation: Conversation): ManagedContext {
    const { messages } = conversation;
    const maxTokens = this.config.defaultWindowSize;
    
    let selectedMessages: ConversationMessage[] = [];
    let totalTokens = 0;
    
    for (const message of messages) {
      const tokens = this.tokenEstimator(message.content);
      
      if (totalTokens + tokens > maxTokens) {
        break;
      }
      
      selectedMessages.push(message);
      totalTokens += tokens;
    }
    
    const originalTokens = messages.reduce((sum, m) => sum + this.tokenEstimator(m.content), 0);
    
    return {
      messages: selectedMessages,
      keyPoints: [],
      tokenCount: totalTokens,
      strategy: 'standard',
      compressionRatio: originalTokens > 0 ? totalTokens / originalTokens : 1,
    };
  }

  /**
   * 提取关键信息
   */
  private async extractKeyInformation(
    messages: ConversationMessage[]
  ): Promise<{
    importantMessages: number[];
    topics: string[];
    entities: string[];
  }> {
    const importantMessages: number[] = [];
    const topics: string[] = [];
    const entities: string[] = [];
    
    // 简单的启发式方法识别重要消息
    for (let i = 0; i < messages.length; i++) {
      const message = messages[i];
      const importance = this.calculateMessageImportance(message);
      
      message.importance = importance;
      
      if (importance > this.config.importanceThreshold) {
        importantMessages.push(i);
      }
      
      // 提取主题和实体（简化实现）
      const extractedTopics = this.extractTopics(message.content);
      topics.push(...extractedTopics);
    }
    
    return {
      importantMessages,
      topics: [...new Set(topics)],
      entities: [...new Set(entities)],
    };
  }

  /**
   * 计算消息重要性
   */
  private calculateMessageImportance(message: ConversationMessage): number {
    let importance = 0.5;
    const content = message.content.toLowerCase();
    
    // 1. 系统消息重要性高
    if (message.role === 'system') {
      importance += 0.3;
    }
    
    // 2. 长消息通常包含更多信息
    if (message.content.length > 500) {
      importance += 0.1;
    }
    
    // 3. 包含关键信息的消息
    const importantKeywords = [
      '重要', '关键', '注意', '必须', '一定',
      '结论', '总结', '结果', '答案',
      '错误', '问题', '异常', '失败',
      '配置', '设置', '参数', '代码',
    ];
    
    for (const keyword of importantKeywords) {
      if (content.includes(keyword)) {
        importance += 0.05;
      }
    }
    
    // 4. 包含代码的消息
    if (content.includes('```') || content.includes('`')) {
      importance += 0.1;
    }
    
    return Math.min(1, importance);
  }

  /**
   * 提取主题
   */
  private extractTopics(content: string): string[] {
    const topics: string[] = [];
    const topicPatterns = [
      /关于(.+?)[的，。]/,
      /(.+?)问题/,
      /(.+?)功能/,
      /(.+?)模块/,
      /(.+?)系统/,
    ];
    
    for (const pattern of topicPatterns) {
      const match = content.match(pattern);
      if (match) {
        topics.push(match[1]);
      }
    }
    
    return topics;
  }

  /**
   * 计算所需窗口大小
   */
  private calculateRequiredWindow(keyInfo: {
    importantMessages: number[];
    topics: string[];
    entities: string[];
  }): number {
    let windowSize = this.config.defaultWindowSize;
    
    // 根据重要消息数量调整
    if (keyInfo.importantMessages.length > 10) {
      windowSize = this.config.maxWindowSize;
    }
    
    // 根据主题复杂度调整
    if (keyInfo.topics.length > 5) {
      windowSize = Math.max(windowSize, this.config.maxWindowSize);
    }
    
    return windowSize;
  }

  /**
   * 分层采样策略
   * 借鉴豆包的"先低帧率扫视全局，再高帧率聚焦关键片段"
   */
  private hierarchicalSampling(
    messages: ConversationMessage[],
    keyInfo: {
      importantMessages: number[];
      topics: string[];
      entities: string[];
    },
    maxTokens: number
  ): ConversationMessage[] {
    if (messages.length === 0 || maxTokens <= 0) {
      return [];
    }
    
    const selected: ConversationMessage[] = [];
    let usedTokens = 0;
    
    // 1. 首先选择重要消息（高帧率聚焦）
    for (const index of keyInfo.importantMessages) {
      if (index < messages.length) {
        const message = messages[index];
        const tokens = this.tokenEstimator(message.content);
        
        if (usedTokens + tokens <= maxTokens) {
          selected.push(message);
          usedTokens += tokens;
        }
      }
    }
    
    // 2. 然后均匀采样其他消息（低帧率扫视）
    const remainingTokens = maxTokens - usedTokens;
    if (remainingTokens > 0 && messages.length > selected.length) {
      const remainingMessages = messages.filter(m => !selected.includes(m));
      const sampleInterval = Math.ceil(remainingMessages.length / Math.max(1, remainingTokens / 500));
      
      for (let i = 0; i < remainingMessages.length; i += sampleInterval) {
        const message = remainingMessages[i];
        const tokens = this.tokenEstimator(message.content);
        
        if (usedTokens + tokens <= maxTokens) {
          selected.push(message);
          usedTokens += tokens;
        } else {
          break;
        }
      }
    }
    
    // 按时间排序
    return selected.sort((a, b) => a.timestamp - b.timestamp);
  }

  /**
   * 生成摘要
   */
  private async generateSummary(messages: ConversationMessage[]): Promise<string> {
    if (messages.length === 0) {
      return '';
    }
    
    // 简化实现：提取关键句
    const keySentences: string[] = [];
    
    for (const message of messages) {
      const sentences = message.content.split(/[。！？.!?]/);
      for (const sentence of sentences.slice(0, 2)) { // 取前两句
        if (sentence.trim().length > 10) {
          keySentences.push(sentence.trim());
        }
      }
    }
    
    return keySentences.slice(0, 5).join('；');
  }

  /**
   * 提取关键点
   */
  private extractKeyPoints(keyInfo: {
    importantMessages: number[];
    topics: string[];
    entities: string[];
  }): string[] {
    return [
      ...keyInfo.topics.slice(0, 5),
      ...keyInfo.entities.slice(0, 5),
    ];
  }

  /**
   * 消息分组
   */
  private groupMessages(
    messages: ConversationMessage[],
    groupSize: number
  ): ConversationMessage[][] {
    const groups: ConversationMessage[][] = [];
    
    for (let i = 0; i < messages.length; i += groupSize) {
      groups.push(messages.slice(i, i + groupSize));
    }
    
    return groups;
  }

  /**
   * 总结消息组
   */
  private async summarizeGroup(messages: ConversationMessage[]): Promise<string> {
    const contents = messages.map(m => `${m.role}: ${m.content.substring(0, 100)}`);
    return contents.join(' | ');
  }

  /**
   * 创建新会话
   */
  createConversation(id?: string): Conversation {
    const conversationId = id || `conv_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    const conversation: Conversation = {
      id: conversationId,
      messages: [],
      metadata: {
        createdAt: Date.now(),
        updatedAt: Date.now(),
        totalTokens: 0,
      },
    };
    
    this.conversations.set(conversationId, conversation);
    eventBus.emit('context:conversation-created', { conversationId });
    
    return conversation;
  }

  /**
   * 获取会话
   */
  getConversation(id: string): Conversation | undefined {
    return this.conversations.get(id);
  }

  /**
   * 添加消息到会话
   */
  addMessage(conversationId: string, message: Omit<ConversationMessage, 'id' | 'timestamp'>): ConversationMessage {
    const conversation = this.conversations.get(conversationId);
    if (!conversation) {
      throw new Error(`Conversation not found: ${conversationId}`);
    }
    
    const newMessage: ConversationMessage = {
      ...message,
      id: `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      timestamp: Date.now(),
    };
    
    conversation.messages.push(newMessage);
    conversation.metadata.updatedAt = Date.now();
    conversation.metadata.totalTokens += this.tokenEstimator(message.content);
    
    eventBus.emit('context:message-added', { conversationId, message: newMessage });
    
    return newMessage;
  }

  /**
   * 清除会话历史
   */
  clearConversation(conversationId: string): void {
    const conversation = this.conversations.get(conversationId);
    if (conversation) {
      conversation.messages = [];
      conversation.metadata.totalTokens = 0;
      conversation.metadata.updatedAt = Date.now();
      
      eventBus.emit('context:conversation-cleared', { conversationId });
    }
  }

  /**
   * 删除会话
   */
  deleteConversation(conversationId: string): void {
    this.conversations.delete(conversationId);
    eventBus.emit('context:conversation-deleted', { conversationId });
  }

  /**
   * 获取统计信息
   */
  getStats(): {
    totalConversations: number;
    totalMessages: number;
    averageMessagesPerConversation: number;
  } {
    const conversations = Array.from(this.conversations.values());
    const totalMessages = conversations.reduce((sum, c) => sum + c.messages.length, 0);
    
    return {
      totalConversations: conversations.length,
      totalMessages,
      averageMessagesPerConversation: conversations.length > 0 ? totalMessages / conversations.length : 0,
    };
  }
}

// 导出单例实例
export const chatClawContextManager = new ChatClawContextManager();
