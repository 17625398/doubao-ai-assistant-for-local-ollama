// Page Assist Bridge - 负责与Page Assist扩展通信

import { logger } from '@core/utils/logger';

logger.setPrefix('[Page Assist Bridge]');

// Page Assist扩展的ID（可能需要根据实际情况修改）
// 注意：实际的Page Assist扩展ID可能不同，需要根据安装的扩展进行配置
const PAGE_ASSIST_EXTENSION_ID = 'page-assist';

// 重试配置
const MAX_RETRIES = 3;
const RETRY_DELAY = 1000; // 1秒

export interface PageAssistMessage {
  type: string;
  data?: any;
}

export interface PageAssistResponse {
  success: boolean;
  data?: any;
  error?: string;
}

export class PageAssistBridge {
  private static instance: PageAssistBridge;
  private isInitialized: boolean = false;
  private isAvailable: boolean = false;
  private lastCheckTime: number = 0;
  private checkInterval: number = 30000; // 30秒

  private constructor() {}

  public static getInstance(): PageAssistBridge {
    if (!PageAssistBridge.instance) {
      PageAssistBridge.instance = new PageAssistBridge();
    }
    return PageAssistBridge.instance;
  }

  /**
   * 初始化Page Assist桥接
   */
  public async initialize(): Promise<boolean> {
    if (this.isInitialized && Date.now() - this.lastCheckTime < this.checkInterval) {
      return this.isAvailable;
    }

    try {
      // 检查Page Assist是否可用
      const isAvailable = await this.checkAvailability();
      this.isAvailable = isAvailable;
      this.isInitialized = true;
      this.lastCheckTime = Date.now();
      
      if (isAvailable) {
        logger.info('Page Assist extension is available');
      } else {
        logger.warn('Page Assist extension is not available');
      }
      
      return isAvailable;
    } catch (error) {
      logger.error('Failed to initialize Page Assist bridge:', error);
      this.isInitialized = true;
      this.isAvailable = false;
      this.lastCheckTime = Date.now();
      return false;
    }
  }

  /**
   * 检查Page Assist扩展是否可用
   */
  public async checkAvailability(): Promise<boolean> {
    try {
      // 尝试发送ping消息到Page Assist
      const response = await this.sendMessageWithRetry({ type: 'ping' });
      return response.success;
    } catch (error) {
      return false;
    }
  }

  /**
   * 带重试机制的消息发送
   */
  private async sendMessageWithRetry(message: PageAssistMessage, retries: number = 0): Promise<PageAssistResponse> {
    try {
      // 发送消息到Page Assist
      const response = await chrome.runtime.sendMessage(PAGE_ASSIST_EXTENSION_ID, message);
      
      if (response) {
        return {
          success: true,
          data: response
        };
      } else {
        return {
          success: false,
          error: 'No response from Page Assist'
        };
      }
    } catch (error) {
      if (retries < MAX_RETRIES) {
        logger.warn(`Failed to send message, retrying ${retries + 1}/${MAX_RETRIES}...`);
        await new Promise(resolve => setTimeout(resolve, RETRY_DELAY));
        return this.sendMessageWithRetry(message, retries + 1);
      }
      
      logger.error('Failed to send message to Page Assist after retries:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to send message'
      };
    }
  }

  /**
   * 向Page Assist发送消息
   */
  public async sendMessage(message: PageAssistMessage): Promise<PageAssistResponse> {
    try {
      // 检查Page Assist是否可用
      if (!this.isAvailable && !await this.checkAvailability()) {
        return {
          success: false,
          error: 'Page Assist extension is not available'
        };
      }

      return await this.sendMessageWithRetry(message);
    } catch (error) {
      logger.error('Failed to send message to Page Assist:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to send message'
      };
    }
  }

  /**
   * 与Page Assist进行聊天
   */
  public async chat(messages: Array<{ role: string; content: string }>, model?: string): Promise<PageAssistResponse> {
    return this.sendMessage({
      type: 'chat',
      data: {
        model: model || 'default',
        messages
      }
    });
  }

  /**
   * 获取Page Assist的模型列表
   */
  public async getModels(): Promise<PageAssistResponse> {
    return this.sendMessage({ type: 'getModels' });
  }

  /**
   * 获取Page Assist的设置
   */
  public async getSettings(): Promise<PageAssistResponse> {
    return this.sendMessage({ type: 'getSettings' });
  }

  /**
   * 更新Page Assist的设置
   */
  public async updateSettings(settings: any): Promise<PageAssistResponse> {
    return this.sendMessage({
      type: 'updateSettings',
      data: settings
    });
  }

  /**
   * 检查Page Assist是否正在运行
   */
  public async isRunning(): Promise<boolean> {
    const response = await this.sendMessage({ type: 'status' });
    return response.success && response.data?.isRunning === true;
  }

  /**
   * 重置状态
   */
  public reset(): void {
    this.isInitialized = false;
    this.isAvailable = false;
    this.lastCheckTime = 0;
  }
}

export const pageAssistBridge = PageAssistBridge.getInstance();
