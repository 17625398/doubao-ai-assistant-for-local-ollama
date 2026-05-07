/**
 * 文档对话服务
 * 基于文档内容进行实时问答，确保回答严格基于原文内容
 */

import { logger } from '../utils/logger';
import { TextChunkingService } from './text-chunking-service';

/**
 * 文档块
 */
interface DocumentChunk {
  id: string;
  content: string;
  startIndex: number;
  endIndex: number;
  embedding?: number[];
}

/**
 * 对话消息
 */
export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  citedChunks?: string[]; // 引用的文档块
}

/**
 * 文档对话配置
 */
export interface DocumentChatConfig {
  chunkSize?: number;
  chunkOverlap?: number;
  maxContextChunks?: number;
  citationEnabled?: boolean;
  strictMode?: boolean; // 严格模式：确保回答只基于文档内容
  similarityThreshold?: number;
}

/**
 * 文档对话会话
 */
export interface DocumentChatSession {
  id: string;
  documentContent: string;
  chunks: DocumentChunk[];
  messages: ChatMessage[];
  config: DocumentChatConfig;
  createdAt: Date;
  updatedAt: Date;
}

export class DocumentChatService {
  private sessions: Map<string, DocumentChatSession> = new Map();
  private textChunkingService: TextChunkingService;
  private defaultConfig: DocumentChatConfig = {
    chunkSize: 1000,
    chunkOverlap: 100,
    maxContextChunks: 5,
    citationEnabled: true,
    strictMode: true,
    similarityThreshold: 0.5
  };

  constructor() {
    this.textChunkingService = new TextChunkingService();
    logger.info('DocumentChatService initialized');
  }

  /**
   * 创建新的文档对话会话
   * @param documentContent 文档内容
   * @param config 配置
   * @returns 会话ID
   */
  createSession(
    documentContent: string,
    config?: DocumentChatConfig
  ): string {
    const sessionId = `session-${Date.now()}`;
    const mergedConfig = { ...this.defaultConfig, ...config };

    // 分块文档
    const chunks = this.chunkDocument(documentContent, mergedConfig);

    const session: DocumentChatSession = {
      id: sessionId,
      documentContent,
      chunks,
      messages: [],
      config: mergedConfig,
      createdAt: new Date(),
      updatedAt: new Date()
    };

    this.sessions.set(sessionId, session);
    logger.info(`Created document chat session: ${sessionId}`);

    return sessionId;
  }

  /**
   * 分块文档
   * @param content 文档内容
   * @param config 配置
   * @returns 文档块数组
   */
  private chunkDocument(content: string, config: DocumentChatConfig): DocumentChunk[] {
    const chunkTexts = this.textChunkingService.chunkBySentences(
      content,
      config.chunkSize || 1000,
      config.chunkOverlap || 100
    );

    const chunks: DocumentChunk[] = [];
    let currentIndex = 0;

    for (let i = 0; i < chunkTexts.length; i++) {
      const chunkContent = chunkTexts[i];
      const startIndex = content.indexOf(chunkContent, currentIndex);
      const endIndex = startIndex + chunkContent.length;

      chunks.push({
        id: `chunk-${i}`,
        content: chunkContent,
        startIndex,
        endIndex
      });

      currentIndex = startIndex + (chunkContent.length - (config.chunkOverlap || 100));
    }

    return chunks;
  }

  /**
   * 发送用户消息并获取回复
   * @param sessionId 会话ID
   * @param userMessage 用户消息
   * @returns 助手回复
   */
  async sendMessage(
    sessionId: string,
    userMessage: string
  ): Promise<ChatMessage> {
    const session = this.sessions.get(sessionId);
    if (!session) {
      throw new Error(`Session not found: ${sessionId}`);
    }

    // 添加用户消息
    const userChatMessage: ChatMessage = {
      id: `msg-${Date.now()}`,
      role: 'user',
      content: userMessage,
      timestamp: new Date()
    };

    session.messages.push(userChatMessage);

    // 检索相关文档块
    const relevantChunks = this.retrieveRelevantChunks(userMessage, session);

    // 生成回复
    const assistantMessage = await this.generateResponse(
      userMessage,
      relevantChunks,
      session
    );

    // 添加助手消息
    session.messages.push(assistantMessage);
    session.updatedAt = new Date();

    return assistantMessage;
  }

  /**
   * 检索相关文档块
   * @param query 查询
   * @param session 会话
   * @returns 相关文档块
   */
  private retrieveRelevantChunks(
    query: string,
    session: DocumentChatSession
  ): DocumentChunk[] {
    // 简单的关键词匹配检索
    const queryKeywords = this.extractKeywords(query);
    const scoredChunks = session.chunks.map(chunk => {
      let score = 0;
      const chunkLower = chunk.content.toLowerCase();

      for (const keyword of queryKeywords) {
        if (chunkLower.includes(keyword.toLowerCase())) {
          score += 1;
        }
      }

      // 检查是否有完整的句子匹配
      const sentences = chunk.content.split(/[.!?]+/);
      for (const sentence of sentences) {
        if (queryKeywords.some(keyword => 
          sentence.toLowerCase().includes(keyword.toLowerCase())
        )) {
          score += 2;
        }
      }

      return { chunk, score };
    });

    // 排序并返回最相关的块
    const sortedChunks = scoredChunks
      .filter(item => item.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, session.config.maxContextChunks || 5)
      .map(item => item.chunk);

    logger.info(`Retrieved ${sortedChunks.length} relevant chunks`);
    return sortedChunks;
  }

  /**
   * 提取关键词
   * @param text 文本
   * @returns 关键词数组
   */
  private extractKeywords(text: string): string[] {
    // 移除常见停用词
    const stopWords = [
      '的', '是', '在', '了', '和', '有', '我', '你', '他', '她', '它',
      'the', 'is', 'in', 'on', 'at', 'and', 'or', 'but', 'a', 'an', 'to',
      'for', 'with', 'from', 'by', 'as', 'like', 'about', 'into', 'through'
    ];

    const words = text.split(/\s+|[\p{P}]+/u).filter(word => word.length > 1);
    return words.filter(word => 
      !stopWords.includes(word.toLowerCase())
    );
  }

  /**
   * 生成回复
   * @param userMessage 用户消息
   * @param relevantChunks 相关文档块
   * @param session 会话
   * @returns 助手回复
   */
  private async generateResponse(
    userMessage: string,
    relevantChunks: DocumentChunk[],
    session: DocumentChatSession
  ): Promise<ChatMessage> {
    const citedChunkIds = relevantChunks.map(chunk => chunk.id);
    let responseContent = '';

    if (relevantChunks.length === 0) {
      responseContent = session.config.strictMode
        ? '抱歉，我在文档中没有找到与您问题相关的内容。请尝试其他问题，或提供更多详细信息。'
        : '我在文档中没有找到直接相关的内容，但我可以尝试基于一般知识回答您的问题。';
    } else {
      // 构建上下文
      const context = relevantChunks
        .map(chunk => chunk.content)
        .join('\n\n---\n\n');

      // 模拟AI回复（实际应用中应该调用AI模型）
      responseContent = this.generateSimulatedResponse(userMessage, context, session.config.strictMode ?? true);
    }

    return {
      id: `msg-${Date.now()}`,
      role: 'assistant',
      content: responseContent,
      timestamp: new Date(),
      citedChunks: session.config.citationEnabled ? citedChunkIds : undefined
    };
  }

  /**
   * 生成模拟回复
   * @param query 查询
   * @param context 上下文
   * @param strictMode 严格模式
   * @returns 模拟回复
   */
  private generateSimulatedResponse(
    query: string,
    context: string,
    strictMode: boolean
  ): string {
    // 这里是一个简单的模拟实现
    // 实际应用中应该调用AI模型API
    
    if (strictMode) {
      return `基于文档内容，我找到了以下相关信息：\n\n${context.substring(0, 500)}${context.length > 500 ? '...' : ''}\n\n您的问题是："${query}"\n\n请注意，我的回答严格基于提供的文档内容。`;
    }

    return `关于您的问题"${query}"，根据文档内容，我找到了以下相关信息：\n\n${context.substring(0, 800)}${context.length > 800 ? '...' : ''}`;
  }

  /**
   * 获取会话历史
   * @param sessionId 会话ID
   * @returns 消息列表
   */
  getSessionHistory(sessionId: string): ChatMessage[] {
    const session = this.sessions.get(sessionId);
    if (!session) {
      throw new Error(`Session not found: ${sessionId}`);
    }
    return [...session.messages];
  }

  /**
   * 获取会话
   * @param sessionId 会话ID
   * @returns 会话
   */
  getSession(sessionId: string): DocumentChatSession | undefined {
    return this.sessions.get(sessionId);
  }

  /**
   * 删除会话
   * @param sessionId 会话ID
   */
  deleteSession(sessionId: string): void {
    if (this.sessions.delete(sessionId)) {
      logger.info(`Deleted document chat session: ${sessionId}`);
    }
  }

  /**
   * 获取所有会话ID
   * @returns 会话ID列表
   */
  getAllSessions(): string[] {
    return Array.from(this.sessions.keys());
  }

  /**
   * 获取文档块内容
   * @param sessionId 会话ID
   * @param chunkId 块ID
   * @returns 文档块
   */
  getChunkContent(sessionId: string, chunkId: string): string | undefined {
    const session = this.sessions.get(sessionId);
    if (!session) return undefined;

    const chunk = session.chunks.find(c => c.id === chunkId);
    return chunk?.content;
  }
}

/**
 * 全局文档对话服务实例
 */
export const documentChatService = new DocumentChatService();

export default DocumentChatService;
