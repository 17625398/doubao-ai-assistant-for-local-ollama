/**
 * ChatClaw 划词即时问答服务
 * 实现选中文字后快速提问功能
 */

import { logger } from '../utils/logger';
import { OllamaClient } from '../utils/ollama-client';
import { aiConfigManager } from '../utils/ai-config-manager';

export interface QuickAskConfig {
  enabled: boolean;
  shortcut: string;
  autoCopy: boolean;
  showFloatingButton: boolean;
  buttonPosition: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right';
  maxTextLength: number;
  triggerOnSelection: boolean;
}

export interface QuickAskRequest {
  selectedText: string;
  question?: string;
  context?: string;
  sourceUrl?: string;
  timestamp: number;
}

export interface QuickAskResponse {
  answer: string;
  relatedQuestions?: string[];
  sources?: string[];
  processingTime: number;
}

export class ChatClawQuickAskService {
  private config: QuickAskConfig = {
    enabled: true,
    shortcut: 'Ctrl+Shift+Q',
    autoCopy: true,
    showFloatingButton: true,
    buttonPosition: 'top-right',
    maxTextLength: 500,
    triggerOnSelection: true,
  };
  private ollamaClient: OllamaClient;
  private selectionListeners: Set<(text: string, event: MouseEvent) => void> = new Set();

  constructor() {
    this.ollamaClient = new OllamaClient();
    this.initializeSelectionListener();
  }

  /**
   * 初始化选中文本监听器
   */
  private initializeSelectionListener(): void {
    if (typeof window === 'undefined') return;

    document.addEventListener('mouseup', this.handleSelection.bind(this));
    document.addEventListener('keyup', this.handleKeyUp.bind(this));
  }

  /**
   * 处理文本选择
   */
  private handleSelection(event: MouseEvent): void {
    if (!this.config.enabled || !this.config.triggerOnSelection) return;

    const selection = window.getSelection();
    if (!selection || selection.isCollapsed) return;

    const selectedText = selection.toString().trim();
    if (!selectedText || selectedText.length > this.config.maxTextLength) return;

    // 通知所有监听器
    this.selectionListeners.forEach(listener => listener(selectedText, event));
  }

  /**
   * 处理键盘事件
   */
  private handleKeyUp(event: KeyboardEvent): void {
    if (!this.config.enabled) return;

    // 检查快捷键
    const shortcutParts = this.config.shortcut.split('+');
    const key = shortcutParts.pop();
    const modifiers = shortcutParts;

    const keyMatch = event.key.toLowerCase() === key?.toLowerCase();
    const ctrlMatch = modifiers.includes('Ctrl') === event.ctrlKey;
    const shiftMatch = modifiers.includes('Shift') === event.shiftKey;
    const altMatch = modifiers.includes('Alt') === event.altKey;

    if (keyMatch && ctrlMatch && shiftMatch && altMatch) {
      const selection = window.getSelection();
      if (selection && !selection.isCollapsed) {
        const selectedText = selection.toString().trim();
        if (selectedText) {
          this.ask(selectedText);
        }
      }
    }
  }

  /**
   * 添加选中文本监听器
   */
  onSelection(callback: (text: string, event: MouseEvent) => void): () => void {
    this.selectionListeners.add(callback);
    return () => this.selectionListeners.delete(callback);
  }

  /**
   * 提问
   */
  async ask(request: QuickAskRequest | string): Promise<QuickAskResponse> {
    const startTime = Date.now();

    try {
      let selectedText: string;
      let context: string | undefined;

      if (typeof request === 'string') {
        selectedText = request;
      } else {
        selectedText = request.selectedText;
        context = request.context;
      }

      // 获取当前模型配置
      const model = aiConfigManager.getDefaultModel();

      // 构建提示词
      const prompt = this.buildPrompt(selectedText, context);

      // 调用 AI 模型
      const response = await this.ollamaClient.chat({
        model: model,
        messages: [
          {
            role: 'system',
            content: '你是一个智能助手，专门回答用户关于选中文字的问题。请提供简洁、准确的回答。'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        stream: false
      });

      const answer = response.message?.content || '抱歉，无法生成回答。';

      // 生成相关问题
      const relatedQuestions = await this.generateRelatedQuestions(selectedText, answer);

      return {
        answer,
        relatedQuestions,
        processingTime: Date.now() - startTime,
      };
    } catch (error) {
      logger.error('Quick ask failed:', error);
      return {
        answer: `抱歉，处理失败：${error instanceof Error ? error.message : '未知错误'}`,
        processingTime: Date.now() - startTime,
      };
    }
  }

  /**
   * 构建提示词
   */
  private buildPrompt(selectedText: string, context?: string): string {
    let prompt = `用户选中了以下文字：\n\n"""${selectedText}"""\n\n`;
    
    if (context) {
      prompt += `上下文信息：\n${context}\n\n`;
    }
    
    prompt += '请回答用户关于这段文字的问题，或者解释这段文字的含义。';
    
    return prompt;
  }

  /**
   * 生成相关问题
   */
  private async generateRelatedQuestions(selectedText: string, answer: string): Promise<string[]> {
    try {
      const model = aiConfigManager.getDefaultModel();

      const response = await this.ollamaClient.chat({
        model: model,
        messages: [
          {
            role: 'system',
            content: '请基于用户选中的文字和回答，生成3个相关的后续问题。只返回问题列表，每行一个。'
          },
          {
            role: 'user',
            content: `选中文字：${selectedText}\n\n回答：${answer}\n\n请生成3个相关问题：`
          }
        ],
        stream: false
      });

      const content = response.message?.content || '';
      return content.split('\n').filter(q => q.trim()).slice(0, 3);
    } catch (error) {
      logger.error('Failed to generate related questions:', error);
      return [];
    }
  }

  /**
   * 更新配置
   */
  updateConfig(newConfig: Partial<QuickAskConfig>): void {
    this.config = { ...this.config, ...newConfig };
    logger.info('Quick ask config updated:', this.config);
  }

  /**
   * 获取配置
   */
  getConfig(): QuickAskConfig {
    return { ...this.config };
  }

  /**
   * 启用/禁用
   */
  setEnabled(enabled: boolean): void {
    this.config.enabled = enabled;
    logger.info('Quick ask enabled:', enabled);
  }

  /**
   * 获取选中的文本
   */
  getSelectedText(): string {
    const selection = window.getSelection();
    return selection ? selection.toString().trim() : '';
  }
}

// 导出单例
export const chatClawQuickAskService = new ChatClawQuickAskService();
