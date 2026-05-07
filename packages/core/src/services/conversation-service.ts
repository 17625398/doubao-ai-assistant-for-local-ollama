// 对话服务

import { ChatMessage } from '../types';
import { ollamaClient } from '../utils/ollama-client';
import { logger } from '../utils/logger';

/**
 * 对话主题接口
 */
export interface ConversationTopic {
  id: string;
  title: string;
  confidence: number;
  startTime: number;
  endTime: number;
  messageCount: number;
}

/**
 * 对话摘要接口
 */
export interface ConversationSummary {
  id: string;
  content: string;
  topics: string[];
  keyPoints: string[];
  generatedAt: number;
}

/**
 * 对话服务类
 */
export class ConversationService {
  /**
   * 检测对话主题
   * @param messages 对话消息列表
   * @param model 模型名称
   * @returns 对话主题列表
   */
  async detectTopics(messages: ChatMessage[], model: string = 'llama3'): Promise<ConversationTopic[]> {
    try {
      // 构建对话文本
      const conversationText = messages
        .map(msg => `${msg.role === 'user' ? '用户' : '助手'}: ${msg.content}`)
        .join('\n');

      const prompt = `基于以下对话内容，检测出对话的主要主题，每个主题需要包含标题、置信度（0-1）、开始时间、结束时间和消息数量：\n\n${conversationText}\n\n请以JSON格式返回，例如：{"topics": [{"title": "主题1", "confidence": 0.9, "startTime": 1234567890000, "endTime": 1234567895000, "messageCount": 3}]}`;

      const response = await ollamaClient.generate(
        prompt,
        {
          model,
          stream: false
        }
      );

      if (!response.response) {
        throw new Error('No response from model');
      }

      const parsed = JSON.parse(response.response);
      if (parsed && Array.isArray(parsed.topics)) {
        return parsed.topics.map((topic: any) => ({
          id: `topic_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          title: topic.title || '未命名主题',
          confidence: Math.max(0, Math.min(1, topic.confidence || 0.5)),
          startTime: topic.startTime || messages[0]?.timestamp || Date.now(),
          endTime: topic.endTime || messages[messages.length - 1]?.timestamp || Date.now(),
          messageCount: topic.messageCount || messages.length
        }));
      }

      return [];
    } catch (error) {
      logger.error('Failed to detect conversation topics:', error);
      return [];
    }
  }

  /**
   * 生成对话摘要
   * @param messages 对话消息列表
   * @param model 模型名称
   * @returns 对话摘要
   */
  async generateSummary(messages: ChatMessage[], model: string = 'llama3'): Promise<ConversationSummary> {
    try {
      // 构建对话文本
      const conversationText = messages
        .map(msg => `${msg.role === 'user' ? '用户' : '助手'}: ${msg.content}`)
        .join('\n');

      const prompt = `基于以下对话内容，生成一个详细的摘要，包括主要话题、关键点和结论：\n\n${conversationText}\n\n请以JSON格式返回，例如：{"content": "摘要内容", "topics": ["主题1", "主题2"], "keyPoints": ["关键点1", "关键点2"]}`;

      const response = await ollamaClient.generate(
        prompt,
        {
          model,
          stream: false
        }
      );

      if (!response.response) {
        throw new Error('No response from model');
      }

      const parsed = JSON.parse(response.response);
      if (parsed) {
        return {
          id: `summary_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          content: parsed.content || '无摘要',
          topics: parsed.topics || [],
          keyPoints: parsed.keyPoints || [],
          generatedAt: Date.now()
        };
      }

      return {
        id: `summary_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        content: '无法生成摘要',
        topics: [],
        keyPoints: [],
        generatedAt: Date.now()
      };
    } catch (error) {
      logger.error('Failed to generate conversation summary:', error);
      return {
        id: `summary_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        content: '生成摘要时出错',
        topics: [],
        keyPoints: [],
        generatedAt: Date.now()
      };
    }
  }

  /**
   * 检测对话主题变化
   * @param messages 对话消息列表
   * @param model 模型名称
   * @returns 主题变化点列表
   */
  async detectTopicChanges(messages: ChatMessage[], model: string = 'llama3'): Promise<number[]> {
    try {
      if (messages.length < 2) {
        return [];
      }

      const changes: number[] = [];
      
      // 每3条消息检测一次主题变化
      for (let i = 3; i < messages.length; i += 3) {
        const recentMessages = messages.slice(i - 3, i);
        const previousMessages = messages.slice(Math.max(0, i - 6), i - 3);

        if (previousMessages.length < 1) {
          continue;
        }

        const recentText = recentMessages
          .map(msg => `${msg.role === 'user' ? '用户' : '助手'}: ${msg.content}`)
          .join('\n');

        const previousText = previousMessages
          .map(msg => `${msg.role === 'user' ? '用户' : '助手'}: ${msg.content}`)
          .join('\n');

        const prompt = `比较以下两个对话片段，判断主题是否发生了显著变化：\n\n之前的对话：\n${previousText}\n\n最近的对话：\n${recentText}\n\n如果主题发生了显著变化，请返回 "true"，否则返回 "false"。`;

        const response = await ollamaClient.generate(
          prompt,
          {
            model,
            stream: false
          }
        );

        if (response.response && response.response.toLowerCase().includes('true')) {
          changes.push(i);
        }
      }

      return changes;
    } catch (error) {
      logger.error('Failed to detect topic changes:', error);
      return [];
    }
  }
}

// 导出单例实例
export const conversationService = new ConversationService();
