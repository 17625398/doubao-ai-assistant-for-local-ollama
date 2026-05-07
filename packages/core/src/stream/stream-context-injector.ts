// 流式上下文注入器 - 在流式响应中动态注入上下文

import { ContextManager, contextManager } from '../context';
import { StreamMessage } from '../stream/stream-controller';
import { logger } from '../utils/logger';

/**
 * 上下文注入配置
 */
export interface ContextInjectionConfig {
  maxContextTokens: number;      // 最大上下文 token 数
  injectAtStart?: boolean;       // 是否在开始注入
  injectDynamically?: boolean;   // 是否动态注入
  contextTypes?: string[];       // 要注入的上下文类型
  updateInterval?: number;       // 动态更新间隔 (ms)
}

/**
 * 默认配置
 */
const DEFAULT_CONFIG: ContextInjectionConfig = {
  maxContextTokens: 2000,
  injectAtStart: true,
  injectDynamically: false,
  contextTypes: ['page', 'document', 'code', 'selection'],
  updateInterval: 5000
};

/**
 * 流式上下文注入器
 * 
 * 功能:
 * 1. 在消息开始时注入上下文
 * 2. 动态更新上下文
 * 3. 智能上下文选择
 * 4. Token 限制控制
 */
export class StreamContextInjector {
  private config: ContextInjectionConfig;
  private contextManager: ContextManager;

  constructor(config?: Partial<ContextInjectionConfig>) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.contextManager = contextManager;
    logger.info('[StreamContextInjector] Initialized');
  }

  /**
   * 在消息中注入上下文
   */
  injectContext(messages: StreamMessage[]): StreamMessage[] {
    if (!this.config.injectAtStart) {
      return messages;
    }

    // 获取相关上下文
    const context = this.contextManager.getMergedContext({
      maxTokens: this.config.maxContextTokens,
      types: this.config.contextTypes as any,
      includeSummary: true
    });

    if (!context) {
      logger.debug('[StreamContextInjector] No context to inject');
      return messages;
    }

    // 创建系统消息
    const systemMessage: StreamMessage = {
      role: 'system',
      content: this.formatSystemPrompt(context)
    };

    // 检查是否已有系统消息
    const hasSystemMessage = messages.some(m => m.role === 'system');
    
    if (hasSystemMessage) {
      // 追加到现有系统消息
      return messages.map(m => {
        if (m.role === 'system') {
          return {
            ...m,
            content: m.content + '\n\n' + this.formatSystemPrompt(context)
          };
        }
        return m;
      });
    } else {
      // 添加新的系统消息
      return [systemMessage, ...messages];
    }
  }

  /**
   * 动态注入上下文 (在流式过程中)
   */
  async injectContextDynamically(
    onUpdate: (context: string) => void
  ): Promise<void> {
    if (!this.config.injectDynamically) {
      return;
    }

    const interval = this.config.updateInterval || 5000;
    
    const updateLoop = async () => {
      while (true) {
        await this.delay(interval);
        
        const context = this.contextManager.getMergedContext({
          maxTokens: this.config.maxContextTokens,
          types: this.config.contextTypes as any
        });

        if (context) {
          onUpdate(context);
          logger.debug('[StreamContextInjector] Context updated dynamically');
        }
      }
    };

    // 在后台运行
    updateLoop().catch(err => {
      logger.error('[StreamContextInjector] Dynamic injection failed:', err);
    });
  }

  /**
   * 智能选择相关上下文
   */
  selectRelevantContext(userMessage: string): string {
    // 分析用户消息,选择最相关的上下文
    const allSources = this.contextManager.getAllSources();
    
    // 简单的相关性评分
    const scored = allSources.map(source => {
      let score = source.priority || 5;
      
      // 关键词匹配加分
      const keywords = this.extractKeywords(userMessage);
      const content = source.content.toLowerCase();
      
      keywords.forEach(keyword => {
        if (content.includes(keyword.toLowerCase())) {
          score += 2;
        }
      });

      // 最近的内容加分
      const age = Date.now() - source.timestamp;
      if (age < 60000) score += 1;      // 1 分钟内
      if (age < 300000) score += 0.5;   // 5 分钟内

      return { source, score };
    });

    // 按分数排序
    scored.sort((a, b) => b.score - a.score);

    // 选择 top N
    const selected = scored.slice(0, 3);
    
    return selected
      .map(({ source }) => `[${source.type.toUpperCase()}] ${source.content}`)
      .join('\n\n---\n\n');
  }

  /**
   * 格式化系统提示
   */
  private formatSystemPrompt(context: string): string {
    return `## 相关上下文

以下是与当前对话相关的上下文信息,请在回答时参考这些信息:

${context}

---

请基于以上上下文信息,为用户提供准确、有帮助的回答。如果上下文中没有相关信息,请根据你的知识回答。`;
  }

  /**
   * 提取关键词
   */
  private extractKeywords(text: string): string[] {
    // 简单提取:移除停用词,保留重要词汇
    const stopWords = new Set([
      'the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for',
      'is', 'are', 'was', 'were', 'be', 'been', 'being',
      '有', '的', '了', '是', '在', '我', '你', '他', '她', '它', '们',
      '这', '那', '什么', '怎么', '为什么', '如何'
    ]);

    return text
      .split(/\s+/)
      .map(word => word.trim())
      .filter(word => word.length > 1 && !stopWords.has(word.toLowerCase()));
  }

  /**
   * 延迟函数
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * 更新配置
   */
  updateConfig(config: Partial<ContextInjectionConfig>): void {
    this.config = { ...this.config, ...config };
  }

  /**
   * 设置上下文管理器
   */
  setContextManager(manager: ContextManager): void {
    this.contextManager = manager;
  }
}

// 导出单例
export const streamContextInjector = new StreamContextInjector();
