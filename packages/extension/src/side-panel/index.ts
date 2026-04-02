// Side Panel 主逻辑

import { logger } from '@core/utils/logger';
import { ChatMessage, ChatSession } from '@core/types';
import { aiConfigManager, ollamaClient, OpenAICompatibleClient, OpenAICompatibleChatMessage } from '@core/index';

logger.setPrefix('[Doubao SidePanel]');

class SidePanel {
  private messageInput: HTMLTextAreaElement;
  private sendBtn: HTMLButtonElement;
  private messagesContainer: HTMLElement;
  private currentSession: ChatSession | null = null;
  private isLoading = false;

  constructor() {
    this.messageInput = document.getElementById('message-input') as HTMLTextAreaElement;
    this.sendBtn = document.getElementById('send-btn') as HTMLButtonElement;
    this.messagesContainer = document.getElementById('messages') as HTMLElement;

    void this.init();
  }

  private async init(): Promise<void> {
    this.setupEventListeners();
    await this.checkPendingNewChat();
    await this.loadSession();
    this.hideSkeleton();

    await this.checkSelectedText();
    await this.checkPendingScreenshot();
    await this.checkPendingReadPage();

    logger.info('Side panel initialized');
  }

  private setupEventListeners(): void {
    // 发送消息
    this.sendBtn.addEventListener('click', () => this.sendMessage());

    // 输入框回车发送
    this.messageInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        this.sendMessage();
      }
    });

    // 输入框自动调整高度
    this.messageInput.addEventListener('input', () => {
      this.adjustTextareaHeight();
      this.updateSendButton();
    });

    // 新建对话
    document.getElementById('new-chat-btn')?.addEventListener('click', () => {
      this.createNewSession();
    });

    // 截图按钮
    document.getElementById('screenshot-btn')?.addEventListener('click', () => {
      this.captureScreenshot();
    });

    document.getElementById('read-page-btn')?.addEventListener('click', () => {
      this.readCurrentPage();
    });

    // 设置按钮
    document.getElementById('settings-btn')?.addEventListener('click', () => {
      chrome.runtime.openOptionsPage();
    });
  }

  private adjustTextareaHeight(): void {
    this.messageInput.style.height = 'auto';
    this.messageInput.style.height = `${Math.min(this.messageInput.scrollHeight, 120)}px`;
  }

  private updateSendButton(): void {
    const hasContent = this.messageInput.value.trim().length > 0;
    this.sendBtn.disabled = !hasContent || this.isLoading;
  }

  private async sendMessage(): Promise<void> {
    const content = this.messageInput.value.trim();
    if (!content || this.isLoading) return;

    if (!this.currentSession) {
      await this.createNewSession();
    }

    // 添加用户消息
    const userMessage: ChatMessage = {
      id: this.generateId(),
      role: 'user',
      content,
      timestamp: Date.now(),
    };

    this.addMessageToUI(userMessage);
    this.appendMessageToSession(userMessage);
    await this.saveCurrentSession();
    this.messageInput.value = '';
    this.adjustTextareaHeight();
    this.updateSendButton();

    // 模拟AI回复
    this.isLoading = true;
    this.updateSendButton();

    try {
      const response = await this.getAIResponse();
      const aiMessage: ChatMessage = {
        id: this.generateId(),
        role: 'assistant',
        content: response,
        timestamp: Date.now(),
      };
      this.addMessageToUI(aiMessage);
      this.appendMessageToSession(aiMessage);
      await this.saveCurrentSession();
    } catch (error) {
      logger.error('Failed to get AI response:', error);
      const message = error instanceof Error ? error.message : '获取回复失败，请稍后重试';
      this.addErrorMessage(message);
    } finally {
      this.isLoading = false;
      this.updateSendButton();
    }
  }

  private async getAIResponse(): Promise<string> {
    await aiConfigManager.ensureLoaded();
    const config = aiConfigManager.getConfig();
    const messages = (this.currentSession?.messages || [])
      .filter((m) => m.role === 'user' || m.role === 'assistant' || m.role === 'system')
      .slice(-10);

    if (config.provider === 'ollama' && config.ollama) {
      // 通过后台脚本来与Ollama通信，避免CORS问题
      try {
        // 向后台脚本发送消息，请求与Ollama通信
        const response = await new Promise((resolve, reject) => {
          chrome.runtime.sendMessage(
            {
              type: 'ollamaChat',
              data: {
                model: config.ollama!.defaultModel || 'fredrezones55/qwen3.5-opus:27b',
                messages: messages.map((m) => ({ role: m.role as 'user' | 'assistant' | 'system', content: m.content })),
                stream: false,
              },
            },
            (response) => {
              if (chrome.runtime.lastError) {
                reject(new Error(chrome.runtime.lastError.message));
                return;
              }
              resolve(response);
            }
          );
        });

        const result = response as { code: number; data?: { message?: { content?: string } }; error?: string };
        if (result.code !== 0) {
          throw new Error(result.error || 'Ollama 服务请求失败');
        }

        return result.data?.message?.content || '';
      } catch (error) {
        logger.error('Ollama 服务请求失败:', error);
        throw new Error(`Ollama 服务请求失败：${error instanceof Error ? error.message : String(error)}`);
      }
    }

    if (config.provider === 'openai' && config.openai) {
      if (!config.openai.apiKey) {
        throw new Error('OpenAI API Key 未配置，请在设置中填写');
      }
      const client = new OpenAICompatibleClient({
        baseUrl: config.openai.baseUrl || 'https://api.openai.com/v1',
        apiKey: config.openai.apiKey,
        defaultModel: config.openai.defaultModel,
        timeout: config.openai.timeout ?? 30000,
        streamEnabled: config.openai.streamEnabled ?? false,
        headers: config.openai.headers,
      });

      const response = await client.chat({
        model: config.openai.defaultModel,
        messages: messages.map((m) => ({
          role: m.role as 'system' | 'user' | 'assistant',
          content: m.content,
        })) as OpenAICompatibleChatMessage[],
      });

      return response.content || '';
    }

    if (config.provider === 'custom' && config.custom) {
      if (!config.custom.baseUrl) {
        throw new Error('自定义服务 Base URL 未配置，请在设置中填写');
      }
      const client = new OpenAICompatibleClient({
        baseUrl: config.custom.baseUrl,
        apiKey: config.custom.apiKey,
        defaultModel: config.custom.defaultModel,
        timeout: config.custom.timeout ?? 30000,
        streamEnabled: config.custom.streamEnabled ?? false,
        headers: config.custom.headers,
      });

      const response = await client.chat({
        model: config.custom.defaultModel,
        messages: messages.map((m) => ({
          role: m.role as 'system' | 'user' | 'assistant',
          content: m.content,
        })) as OpenAICompatibleChatMessage[],
      });

      return response.content || '';
    }

    throw new Error('AI 服务未配置，请打开设置完成配置');
  }

  private addMessageToUI(message: ChatMessage): void {
    const messageEl = document.createElement('div');
    messageEl.className = `message ${message.role}`;
    messageEl.innerHTML = `
      <div class="message-avatar">
        ${message.role === 'user' ? '👤' : '🤖'}
      </div>
      <div class="message-content">
        ${this.escapeHtml(message.content)}
      </div>
    `;
    this.messagesContainer.appendChild(messageEl);
    this.scrollToBottom();
  }

  private addErrorMessage(error: string): void {
    const errorEl = document.createElement('div');
    errorEl.className = 'message system';
    errorEl.innerHTML = `
      <div class="message-content" style="background: #ffebee; color: #c62828;">
        ⚠️ ${this.escapeHtml(error)}
      </div>
    `;
    this.messagesContainer.appendChild(errorEl);
    this.scrollToBottom();
  }

  private scrollToBottom(): void {
    this.messagesContainer.scrollTop = this.messagesContainer.scrollHeight;
  }

  private escapeHtml(text: string): string {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  private generateId(): string {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  private async loadSession(): Promise<void> {
    // 加载或创建会话
    const result = await chrome.storage.local.get('currentSession');
    if (result.currentSession) {
      this.currentSession = result.currentSession;
      const msgs = Array.isArray(this.currentSession?.messages) ? this.currentSession.messages : [];
      if (msgs.length > 0) this.renderMessages();
      else this.showWelcome();
    } else {
      this.showWelcome();
    }
  }

  private renderMessages(): void {
    if (!this.currentSession) return;

    this.messagesContainer.innerHTML = '';
    this.currentSession.messages.forEach((msg) => {
      this.addMessageToUI(msg);
    });
  }

  private showWelcome(): void {
    this.messagesContainer.innerHTML = `
      <div class="welcome-message">
        <h2>👋 欢迎使用豆包AI助手</h2>
        <p>我可以帮你解答问题、写作、翻译、编程等</p>
      </div>
    `;
  }

  private async createNewSession(): Promise<void> {
    this.currentSession = {
      id: this.generateId(),
      title: '新对话',
      messages: [],
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };

    await chrome.storage.local.set({ currentSession: this.currentSession });
    this.showWelcome();
    logger.info('New session created');
  }

  private appendMessageToSession(message: ChatMessage): void {
    if (!this.currentSession) return;
    this.currentSession.messages.push(message);
    this.currentSession.updatedAt = Date.now();
  }

  private async saveCurrentSession(): Promise<void> {
    if (!this.currentSession) return;
    await chrome.storage.local.set({ currentSession: this.currentSession });
  }

  private async captureScreenshot(): Promise<void> {
    try {
      const response = await chrome.runtime.sendMessage({ type: 'capture' });
      if (response.code === 0 && response.data) {
        if (!this.currentSession) {
          await this.createNewSession();
        }

        const message: ChatMessage = {
          id: this.generateId(),
          role: 'user',
          content: '[截图]',
          timestamp: Date.now(),
          attachments: [{
            type: 'image',
            url: response.data,
            name: 'screenshot.png',
          }],
        };
        this.addMessageToUI(message);
        this.appendMessageToSession(message);
        await this.saveCurrentSession();
      }
    } catch (error) {
      logger.error('Screenshot failed:', error);
      this.addErrorMessage('截图失败');
    }
  }

  private async checkSelectedText(): Promise<void> {
    const result = await chrome.storage.local.get('selectedText');
    if (result.selectedText) {
      this.messageInput.value = `请解释以下内容：\n${result.selectedText}`;
      this.adjustTextareaHeight();
      this.updateSendButton();
      // 清除选中的文本
      await chrome.storage.local.remove('selectedText');
    }
  }

  private async readCurrentPage(): Promise<void> {
    try {
      const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
      const tab = tabs[0];
      if (!tab?.id) {
        this.addErrorMessage('未找到当前页面');
        return;
      }

      const response = await chrome.tabs.sendMessage(tab.id, { type: 'readPage', maxChars: 120_000, extractLinkUrl: false, extractImageUrl: false, maxUrls: 200 });
      if (!response || response.code !== 0) {
        this.addErrorMessage('读取网页失败');
        return;
      }

      const url = typeof response.url === 'string' ? response.url : tab.url || '';
      const title = typeof response.title === 'string' ? response.title : tab.title || '';
      const content = typeof response.data === 'string' ? response.data : '';

      if (!content) {
        this.addErrorMessage('网页内容为空或不可读取');
        return;
      }

      const next = `【网页内容】\n标题：${title}\n链接：${url}\n\n${content}`;
      const maxInputChars = 120_000;
      this.messageInput.value = next.length > maxInputChars ? next.slice(0, maxInputChars) : next;
      this.adjustTextareaHeight();
      this.updateSendButton();
    } catch (error) {
      logger.error('Read page failed:', error);
      this.addErrorMessage('读取网页失败');
    }
  }

  private async checkPendingScreenshot(): Promise<void> {
    try {
      const result = await chrome.storage.local.get('pendingScreenshot');
      const dataUrl = typeof result.pendingScreenshot === 'string' ? result.pendingScreenshot : '';
      if (!dataUrl) return;

      await chrome.storage.local.remove('pendingScreenshot');

      if (!this.currentSession) {
        await this.createNewSession();
      }

      const message: ChatMessage = {
        id: this.generateId(),
        role: 'user',
        content: '[截图]',
        timestamp: Date.now(),
        attachments: [{
          type: 'image',
          url: dataUrl,
          name: 'screenshot.png',
        }],
      };

      this.addMessageToUI(message);
      this.appendMessageToSession(message);
      await this.saveCurrentSession();
    } catch (error) {
      logger.error('Failed to consume pendingScreenshot:', error);
    }
  }

  private async checkPendingReadPage(): Promise<void> {
    try {
      const result = await chrome.storage.local.get('pendingReadPage');
      if (!result.pendingReadPage) return;
      await chrome.storage.local.remove('pendingReadPage');
      await this.readCurrentPage();
    } catch (error) {
      logger.error('Failed to consume pendingReadPage:', error);
    }
  }

  private async checkPendingNewChat(): Promise<void> {
    try {
      const result = await chrome.storage.local.get('pendingNewChat');
      if (!result.pendingNewChat) return;
      await chrome.storage.local.remove('pendingNewChat');
      await this.createNewSession();
    } catch (error) {
      logger.error('Failed to consume pendingNewChat:', error);
    }
  }

  private hideSkeleton(): void {
    const skeleton = document.getElementById('skeleton');
    const mainContent = document.getElementById('main-content');

    if (skeleton && mainContent) {
      setTimeout(() => {
        skeleton.classList.add('hidden');
        mainContent.classList.remove('hidden');
      }, 500);
    }
  }
}

// 初始化
document.addEventListener('DOMContentLoaded', () => {
  new SidePanel();
});
