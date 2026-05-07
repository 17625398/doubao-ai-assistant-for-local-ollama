/**
 * ChatClaw 记忆服务
 * 实现上下文对话记忆功能，支持长期记忆和短期记忆
 */

import { logger } from '../utils/logger';

export interface MemoryEntry {
  id: string;
  type: 'short-term' | 'long-term';
  content: string;
  context?: string;
  timestamp: number;
  importance: number;
  tags: string[];
  agentId?: string;
  sessionId?: string;
}

export interface MemoryQuery {
  query: string;
  agentId?: string;
  sessionId?: string;
  type?: 'short-term' | 'long-term';
  limit?: number;
  tags?: string[];
}

export class ChatClawMemoryService {
  private memories: Map<string, MemoryEntry> = new Map();
  private shortTermLimit: number = 50;
  private longTermLimit: number = 1000;

  /**
   * 添加记忆
   */
  async addMemory(entry: Omit<MemoryEntry, 'id' | 'timestamp'>): Promise<MemoryEntry> {
    const id = `mem_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const memory: MemoryEntry = {
      ...entry,
      id,
      timestamp: Date.now(),
    };

    this.memories.set(id, memory);
    
    // 清理过期记忆
    await this.cleanupMemories();
    
    logger.info('Memory added:', { id, type: memory.type, content: memory.content.substring(0, 50) });
    return memory;
  }

  /**
   * 获取相关记忆
   */
  async retrieveMemories(query: MemoryQuery): Promise<MemoryEntry[]> {
    const { query: queryText, agentId, sessionId, type, limit = 10, tags } = query;
    
    let results: MemoryEntry[] = [];
    
    for (const memory of this.memories.values()) {
      // 过滤条件
      if (type && memory.type !== type) continue;
      if (agentId && memory.agentId !== agentId) continue;
      if (sessionId && memory.sessionId !== sessionId) continue;
      if (tags && !tags.some(tag => memory.tags.includes(tag))) continue;
      
      // 计算相关性分数
      const relevance = this.calculateRelevance(queryText, memory);
      if (relevance > 0.3) {
        results.push({ ...memory, importance: relevance });
      }
    }
    
    // 按相关性和重要性排序
    results.sort((a, b) => b.importance - a.importance);
    
    return results.slice(0, limit);
  }

  /**
   * 计算记忆相关性
   */
  private calculateRelevance(query: string, memory: MemoryEntry): number {
    const queryWords = query.toLowerCase().split(/\s+/);
    const contentWords = memory.content.toLowerCase().split(/\s+/);
    const contextWords = memory.context ? memory.context.toLowerCase().split(/\s+/) : [];
    
    let matchCount = 0;
    for (const word of queryWords) {
      if (contentWords.includes(word) || contextWords.includes(word)) {
        matchCount++;
      }
    }
    
    const relevance = matchCount / queryWords.length;
    
    // 考虑时间衰减
    const age = Date.now() - memory.timestamp;
    const timeDecay = Math.exp(-age / (24 * 60 * 60 * 1000)); // 24小时衰减
    
    return relevance * timeDecay * memory.importance;
  }

  /**
   * 清理过期记忆
   */
  private async cleanupMemories(): Promise<void> {
    const shortTermMemories: MemoryEntry[] = [];
    const longTermMemories: MemoryEntry[] = [];
    
    for (const memory of this.memories.values()) {
      if (memory.type === 'short-term') {
        shortTermMemories.push(memory);
      } else {
        longTermMemories.push(memory);
      }
    }
    
    // 清理短期记忆（保留最新的）
    if (shortTermMemories.length > this.shortTermLimit) {
      shortTermMemories.sort((a, b) => b.timestamp - a.timestamp);
      const toDelete = shortTermMemories.slice(this.shortTermLimit);
      for (const memory of toDelete) {
        this.memories.delete(memory.id);
      }
    }
    
    // 清理长期记忆（保留重要性高的）
    if (longTermMemories.length > this.longTermLimit) {
      longTermMemories.sort((a, b) => b.importance - a.importance);
      const toDelete = longTermMemories.slice(this.longTermLimit);
      for (const memory of toDelete) {
        this.memories.delete(memory.id);
      }
    }
  }

  /**
   * 将短期记忆转为长期记忆
   */
  async consolidateMemory(memoryId: string): Promise<boolean> {
    const memory = this.memories.get(memoryId);
    if (!memory) return false;
    
    memory.type = 'long-term';
    memory.importance = Math.min(memory.importance * 1.5, 1.0);
    
    logger.info('Memory consolidated to long-term:', { id: memoryId });
    return true;
  }

  /**
   * 删除记忆
   */
  async deleteMemory(memoryId: string): Promise<boolean> {
    const deleted = this.memories.delete(memoryId);
    if (deleted) {
      logger.info('Memory deleted:', { id: memoryId });
    }
    return deleted;
  }

  /**
   * 获取记忆统计
   */
  async getMemoryStats(): Promise<{ shortTerm: number; longTerm: number; total: number }> {
    let shortTerm = 0;
    let longTerm = 0;
    
    for (const memory of this.memories.values()) {
      if (memory.type === 'short-term') {
        shortTerm++;
      } else {
        longTerm++;
      }
    }
    
    return { shortTerm, longTerm, total: this.memories.size };
  }

  /**
   * 清空所有记忆
   */
  async clearAllMemories(): Promise<void> {
    this.memories.clear();
    logger.info('All memories cleared');
  }

  /**
   * 导出记忆
   */
  async exportMemories(): Promise<MemoryEntry[]> {
    return Array.from(this.memories.values());
  }

  /**
   * 导入记忆
   */
  async importMemories(entries: MemoryEntry[]): Promise<void> {
    for (const entry of entries) {
      this.memories.set(entry.id, entry);
    }
    logger.info('Memories imported:', { count: entries.length });
  }

  /**
   * 获取会话历史记录
   */
  async getConversationHistory(sessionId: string): Promise<any[]> {
    const memories = await this.retrieveMemories({
      query: '',
      sessionId,
      type: 'short-term',
      limit: 100
    });
    
    // 转换为对话历史格式
    return memories
      .sort((a, b) => a.timestamp - b.timestamp)
      .map(memory => {
        try {
          return JSON.parse(memory.content);
        } catch {
          return { role: 'user', content: memory.content };
        }
      });
  }

  /**
   * 保存会话消息
   */
  async saveMessage(sessionId: string, message: { role: string; content: string }): Promise<void> {
    await this.addMemory({
      type: 'short-term',
      content: JSON.stringify(message),
      importance: 0.5,
      tags: ['conversation', message.role],
      sessionId
    });
  }
}

// 导出单例
export const chatClawMemoryService = new ChatClawMemoryService();
