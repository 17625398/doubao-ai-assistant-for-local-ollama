/**
 * ChatClaw 智能侧边栏服务
 * 实现贴靠在其他应用窗口旁的 AI 助手侧边栏功能
 */

import { logger } from '../utils/logger';
import { OllamaClient } from '../utils/ollama-client';
import { aiConfigManager } from '../utils/ai-config-manager';
import { chatClawMemoryService } from './chatclaw-memory-service';

export type SidebarPosition = 'left' | 'right' | 'floating';
export type SidebarMode = 'compact' | 'normal' | 'expanded';

export interface SidebarConfig {
  enabled: boolean;
  position: SidebarPosition;
  mode: SidebarMode;
  width: number;
  autoHide: boolean;
  autoHideDelay: number;
  opacity: number;
  alwaysOnTop: boolean;
  contextAware: boolean;
  quickActions: string[];
  pinned: boolean;
}

export interface SidebarContext {
  activeApplication?: string;
  activeWindowTitle?: string;
  selectedText?: string;
  clipboardContent?: string;
  currentUrl?: string;
  timestamp: number;
}

export interface QuickAction {
  id: string;
  name: string;
  icon: string;
  prompt: string;
  shortcut?: string;
}

export interface SidebarMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: number;
  context?: SidebarContext;
}

export class ChatClawSidebarService {
  private config: SidebarConfig = {
    enabled: false,
    position: 'right',
    mode: 'normal',
    width: 320,
    autoHide: false,
    autoHideDelay: 3000,
    opacity: 1,
    alwaysOnTop: false,
    contextAware: true,
    quickActions: ['summarize', 'explain', 'translate', 'code'],
    pinned: false
  };

  private ollamaClient: OllamaClient;
  private messages: SidebarMessage[] = [];
  private currentContext: SidebarContext | null = null;
  private visibilityListeners: Set<(visible: boolean) => void> = new Set();
  private messageListeners: Set<(message: SidebarMessage) => void> = new Set();
  private quickActions: Map<string, QuickAction> = new Map();

  constructor() {
    this.ollamaClient = new OllamaClient();
    this.initializeDefaultQuickActions();
  }

  /**
   * 初始化默认快捷操作
   */
  private initializeDefaultQuickActions(): void {
    const defaultActions: QuickAction[] = [
      {
        id: 'summarize',
        name: '总结',
        icon: '📝',
        prompt: '请总结以下内容的关键要点：',
        shortcut: 'Ctrl+Shift+S'
      },
      {
        id: 'explain',
        name: '解释',
        icon: '💡',
        prompt: '请详细解释以下内容：',
        shortcut: 'Ctrl+Shift+E'
      },
      {
        id: 'translate',
        name: '翻译',
        icon: '🌐',
        prompt: '请将以下内容翻译成中文：',
        shortcut: 'Ctrl+Shift+T'
      },
      {
        id: 'code',
        name: '代码',
        icon: '💻',
        prompt: '请分析以下代码并提供改进建议：',
        shortcut: 'Ctrl+Shift+C'
      },
      {
        id: 'grammar',
        name: '语法检查',
        icon: '✓',
        prompt: '请检查以下内容的语法和拼写错误：',
        shortcut: 'Ctrl+Shift+G'
      },
      {
        id: 'rewrite',
        name: '改写',
        icon: '✏️',
        prompt: '请改写以下内容，使其更加清晰和专业：',
        shortcut: 'Ctrl+Shift+R'
      }
    ];

    defaultActions.forEach(action => {
      this.quickActions.set(action.id, action);
    });
  }

  /**
   * 初始化服务
   */
  initialize(): void {
    logger.info('ChatClaw Sidebar Service initialized');
  }

  /**
   * 获取配置
   */
  getConfig(): SidebarConfig {
    return { ...this.config };
  }

  /**
   * 更新配置
   */
  updateConfig(newConfig: Partial<SidebarConfig>): void {
    this.config = { ...this.config, ...newConfig };
    logger.info('Sidebar config updated:', this.config);
  }

  /**
   * 启用侧边栏
   */
  enable(): void {
    this.config.enabled = true;
    logger.info('Sidebar enabled');
    this.notifyVisibilityChange(true);
  }

  /**
   * 禁用侧边栏
   */
  disable(): void {
    this.config.enabled = false;
    logger.info('Sidebar disabled');
    this.notifyVisibilityChange(false);
  }

  /**
   * 切换侧边栏显示状态
   */
  toggle(): boolean {
    this.config.enabled = !this.config.enabled;
    logger.info(`Sidebar ${this.config.enabled ? 'shown' : 'hidden'}`);
    this.notifyVisibilityChange(this.config.enabled);
    return this.config.enabled;
  }

  /**
   * 设置位置
   */
  setPosition(position: SidebarPosition): void {
    this.config.position = position;
    logger.info(`Sidebar position set to: ${position}`);
  }

  /**
   * 设置模式
   */
  setMode(mode: SidebarMode): void {
    this.config.mode = mode;
    this.config.width = mode === 'compact' ? 240 : mode === 'expanded' ? 480 : 320;
    logger.info(`Sidebar mode set to: ${mode}`);
  }

  /**
   * 设置宽度
   */
  setWidth(width: number): void {
    this.config.width = Math.max(240, Math.min(640, width));
    logger.info(`Sidebar width set to: ${this.config.width}`);
  }

  /**
   * 更新上下文
   */
  updateContext(context: Partial<SidebarContext>): void {
    this.currentContext = {
      ...this.currentContext,
      ...context,
      timestamp: Date.now()
    };
    logger.info('Sidebar context updated:', this.currentContext);
  }

  /**
   * 获取当前上下文
   */
  getCurrentContext(): SidebarContext | null {
    return this.currentContext;
  }

  /**
   * 清空上下文
   */
  clearContext(): void {
    this.currentContext = null;
    logger.info('Sidebar context cleared');
  }

  /**
   * 发送消息
   */
  async sendMessage(content: string, useContext: boolean = true): Promise<SidebarMessage> {
    const userMessage: SidebarMessage = {
      id: `msg_${Date.now()}_user`,
      role: 'user',
      content,
      timestamp: Date.now(),
      context: useContext ? this.currentContext || undefined : undefined
    };

    this.messages.push(userMessage);
    this.notifyMessageAdded(userMessage);

    try {
      // 构建系统提示
      let systemPrompt = '你是 ChatClaw 智能侧边栏助手，一个贴靠在其他应用窗口旁的 AI 助手。';
      
      if (useContext && this.currentContext) {
        systemPrompt += '\n\n当前上下文信息：';
        if (this.currentContext.activeApplication) {
          systemPrompt += `\n- 当前应用: ${this.currentContext.activeApplication}`;
        }
        if (this.currentContext.activeWindowTitle) {
          systemPrompt += `\n- 窗口标题: ${this.currentContext.activeWindowTitle}`;
        }
        if (this.currentContext.selectedText) {
          systemPrompt += `\n- 选中文本: ${this.currentContext.selectedText.substring(0, 200)}...`;
        }
        if (this.currentContext.currentUrl) {
          systemPrompt += `\n- 当前页面: ${this.currentContext.currentUrl}`;
        }
      }

      // 获取相关记忆
      const memories = await chatClawMemoryService.retrieveMemories({
        query: content,
        limit: 5
      });

      if (memories.length > 0) {
        systemPrompt += '\n\n相关历史记忆：';
        memories.forEach((mem, idx) => {
          systemPrompt += `\n${idx + 1}. ${mem.content.substring(0, 100)}...`;
        });
      }

      const model = aiConfigManager.getDefaultModel();

      const response = await this.ollamaClient.chat({
        model,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content }
        ],
        stream: false
      });

      const assistantMessage: SidebarMessage = {
        id: `msg_${Date.now()}_assistant`,
        role: 'assistant',
        content: response.message?.content || '抱歉，我没有得到有效的回复。',
        timestamp: Date.now()
      };

      this.messages.push(assistantMessage);
      this.notifyMessageAdded(assistantMessage);

      // 保存到记忆
      await chatClawMemoryService.addMemory({
        type: 'short-term',
        content: `用户: ${content}\n助手: ${assistantMessage.content}`,
        importance: 0.7,
        tags: ['sidebar', 'conversation']
      });

      return assistantMessage;

    } catch (error) {
      logger.error('Sidebar message failed:', error);
      
      const errorMessage: SidebarMessage = {
        id: `msg_${Date.now()}_error`,
        role: 'assistant',
        content: `抱歉，处理您的请求时出现错误：${error instanceof Error ? error.message : '未知错误'}`,
        timestamp: Date.now()
      };

      this.messages.push(errorMessage);
      this.notifyMessageAdded(errorMessage);
      return errorMessage;
    }
  }

  /**
   * 执行快捷操作
   */
  async executeQuickAction(actionId: string, content?: string): Promise<SidebarMessage | null> {
    const action = this.quickActions.get(actionId);
    if (!action) {
      logger.error(`Quick action not found: ${actionId}`);
      return null;
    }

    const textToProcess = content || this.currentContext?.selectedText || '';
    if (!textToProcess) {
      return this.sendMessage(`${action.prompt}\n\n（请提供需要处理的内容）`);
    }

    const fullPrompt = `${action.prompt}\n\n${textToProcess}`;
    return this.sendMessage(fullPrompt);
  }

  /**
   * 获取所有快捷操作
   */
  getQuickActions(): QuickAction[] {
    return Array.from(this.quickActions.values());
  }

  /**
   * 获取快捷操作
   */
  getQuickAction(actionId: string): QuickAction | undefined {
    return this.quickActions.get(actionId);
  }

  /**
   * 添加快捷操作
   */
  addQuickAction(action: Omit<QuickAction, 'id'>): QuickAction {
    const id = `action_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const newAction: QuickAction = { ...action, id };
    this.quickActions.set(id, newAction);
    logger.info(`Quick action added: ${newAction.name}`);
    return newAction;
  }

  /**
   * 删除快捷操作
   */
  deleteQuickAction(actionId: string): boolean {
    const deleted = this.quickActions.delete(actionId);
    if (deleted) {
      logger.info(`Quick action deleted: ${actionId}`);
    }
    return deleted;
  }

  /**
   * 获取消息历史
   */
  getMessages(): SidebarMessage[] {
    return [...this.messages];
  }

  /**
   * 清空消息历史
   */
  clearMessages(): void {
    this.messages = [];
    logger.info('Sidebar messages cleared');
  }

  /**
   * 注册可见性监听器
   */
  onVisibilityChange(handler: (visible: boolean) => void): () => void {
    this.visibilityListeners.add(handler);
    return () => {
      this.visibilityListeners.delete(handler);
    };
  }

  /**
   * 注册消息监听器
   */
  onMessage(handler: (message: SidebarMessage) => void): () => void {
    this.messageListeners.add(handler);
    return () => {
      this.messageListeners.delete(handler);
    };
  }

  /**
   * 通知可见性变化
   */
  private notifyVisibilityChange(visible: boolean): void {
    this.visibilityListeners.forEach(handler => {
      try {
        handler(visible);
      } catch (error) {
        logger.error('Visibility handler error:', error);
      }
    });
  }

  /**
   * 通知新消息
   */
  private notifyMessageAdded(message: SidebarMessage): void {
    this.messageListeners.forEach(handler => {
      try {
        handler(message);
      } catch (error) {
        logger.error('Message handler error:', error);
      }
    });
  }

  /**
   * 获取建议的快捷操作
   */
  getSuggestedActions(): QuickAction[] {
    const suggestions: QuickAction[] = [];
    
    if (this.currentContext?.selectedText) {
      const text = this.currentContext.selectedText;
      
      // 根据内容类型推荐操作
      if (text.length > 100) {
        suggestions.push(this.quickActions.get('summarize')!);
      }
      
      if (text.includes('function') || text.includes('class') || text.includes('const') || text.includes('let')) {
        suggestions.push(this.quickActions.get('code')!);
      }
      
      if (/[\u4e00-\u9fa5]/.test(text)) {
        suggestions.push(this.quickActions.get('translate')!);
      }
      
      suggestions.push(this.quickActions.get('explain')!);
    }

    // 添加默认操作
    if (suggestions.length === 0) {
      return this.getQuickActions().slice(0, 4);
    }

    return suggestions.slice(0, 4);
  }

  /**
   * 导出配置
   */
  exportConfig(): string {
    return JSON.stringify(this.config, null, 2);
  }

  /**
   * 导入配置
   */
  importConfig(configJson: string): boolean {
    try {
      const config = JSON.parse(configJson);
      this.config = { ...this.config, ...config };
      logger.info('Sidebar config imported');
      return true;
    } catch (error) {
      logger.error('Failed to import sidebar config:', error);
      return false;
    }
  }

  /**
   * 获取状态
   */
  getStatus(): {
    enabled: boolean;
    position: SidebarPosition;
    mode: SidebarMode;
    messageCount: number;
    hasContext: boolean;
  } {
    return {
      enabled: this.config.enabled,
      position: this.config.position,
      mode: this.config.mode,
      messageCount: this.messages.length,
      hasContext: this.currentContext !== null
    };
  }
}

// 导出单例
export const chatClawSidebarService = new ChatClawSidebarService();
