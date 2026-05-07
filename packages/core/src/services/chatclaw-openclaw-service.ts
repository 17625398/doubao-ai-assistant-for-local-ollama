/**
 * ChatClaw OpenClaw 集成服务
 * 实现 OpenClaw 通道与现有 ChatClaw 系统的集成
 */

import { logger } from '../utils/logger';
import { chatClawCommunicationService, IncomingMessage } from './chatclaw-communication-service';
import { chatClawMemoryService } from './chatclaw-memory-service';
import { chatClawAgentService } from './chatclaw-multi-agent-service';

// OpenClaw 通道类型
export type OpenClawChannel = 'whatsapp' | 'telegram' | 'slack' | 'discord' | 'google-chat' | 'signal' | 'imessage' | 'bluebubbles' | 'irc' | 'microsoft-teams' | 'matrix' | 'feishu' | 'line' | 'mattermost' | 'nextcloud-talk' | 'nostr' | 'synology-chat' | 'tlon' | 'twitch' | 'zalo' | 'zalo-personal' | 'wechat' | 'webchat';

export interface OpenClawChannelConfig {
  id: string;
  type: OpenClawChannel;
  name: string;
  enabled: boolean;
  config: Record<string, any>;
  status?: string;
  messageCount?: number;
  createdAt: string;
  updatedAt: string;
}

export interface OpenClawMessage {
  id: string;
  channel: OpenClawChannel;
  channelId: string;
  sender: {
    id: string;
    name: string;
    avatar?: string;
  };
  content: string;
  timestamp: string;
  type: 'text' | 'image' | 'file' | 'voice';
  rawData?: any;
  context?: {
    conversationId: string;
    threadId?: string;
    sessionId?: string;
  };
}

export class ChatClawOpenClawService {
  private openClawChannels: Map<string, OpenClawChannelConfig> = new Map();
  private channelToAgentMap: Map<string, string> = new Map(); // 通道到代理的映射
  private conversationContexts: Map<string, {
    agentId: string;
    lastMessageTime: number;
    context: string[];
  }> = new Map(); // 会话上下文

  constructor() {
    this.initializeDefaultChannels();
    this.setupMessageHandlers();
  }

  /**
   * 初始化默认 OpenClaw 通道
   */
  private initializeDefaultChannels(): void {
    const defaultChannels: OpenClawChannelConfig[] = [
      {
        id: 'openclaw-whatsapp',
        type: 'whatsapp',
        name: 'WhatsApp',
        enabled: false,
        config: {
          phoneNumber: '',
          accountSid: '',
          authToken: ''
        },
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      },
      {
        id: 'openclaw-telegram',
        type: 'telegram',
        name: 'Telegram',
        enabled: false,
        config: {
          botToken: '',
          chatId: ''
        },
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      },
      {
        id: 'openclaw-slack',
        type: 'slack',
        name: 'Slack',
        enabled: false,
        config: {
          botToken: '',
          channelId: '',
          dmPolicy: 'pairing'
        },
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      },
      {
        id: 'openclaw-discord',
        type: 'discord',
        name: 'Discord',
        enabled: false,
        config: {
          botToken: '',
          channelId: '',
          dmPolicy: 'pairing'
        },
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      }
    ];

    defaultChannels.forEach(channel => {
      this.openClawChannels.set(channel.id, channel);
    });
  }

  /**
   * 设置消息处理器
   */
  private setupMessageHandlers(): void {
    // 注册消息处理器，处理从通道收到的消息
    chatClawCommunicationService.onMessage(async (message: IncomingMessage) => {
      await this.handleChannelMessage(message);
    });
  }

  /**
   * 处理通道消息
   */
  private async handleChannelMessage(message: IncomingMessage): Promise<void> {
    try {
      // 1. 确定使用哪个代理
      const agentId = await this.getAgentForChannel(message.channelId);
      
      // 2. 构建会话 ID
      const conversationId = this.buildConversationId(message);
      
      // 3. 获取或创建会话上下文
      const context = this.getOrCreateConversationContext(conversationId, agentId);
      
      // 4. 添加消息到上下文
      context.context.push(`User: ${message.content}`);
      context.lastMessageTime = Date.now();
      
      // 5. 检索相关记忆
      const relevantMemories = await chatClawMemoryService.retrieveMemories({
        query: message.content,
        agentId,
        sessionId: conversationId,
        limit: 5
      });
      
      // 6. 构建完整上下文
      const memoryContext = relevantMemories.map(mem => mem.content).join('\n');
      const fullContext = `${memoryContext}\n${context.context.join('\n')}`;
      
      // 7. 处理消息（这里可以调用 AI 生成回复）
      // 注意：实际实现中，这里应该调用 AI 服务生成回复
      
      // 8. 添加消息到内存
      await chatClawMemoryService.addMemory({
        type: 'short-term',
        content: message.content,
        context: fullContext,
        importance: 0.7,
        tags: ['channel', message.channel],
        agentId,
        sessionId: conversationId
      });
      
      // 9. 更新会话上下文
      this.conversationContexts.set(conversationId, context);
      
      logger.info(`[OpenClaw] 处理通道消息: ${message.channel} - ${message.content.substring(0, 50)}...`);
    } catch (error) {
      logger.error('[OpenClaw] 处理通道消息失败:', error);
    }
  }

  /**
   * 为通道获取代理
   */
  private async getAgentForChannel(channelId: string): Promise<string> {
    // 1. 检查通道是否有指定的代理
    if (this.channelToAgentMap.has(channelId)) {
      return this.channelToAgentMap.get(channelId)!
    }

    // 2. 使用默认代理
    const defaultAgent = chatClawAgentService.getDefaultAgent();
    if (defaultAgent) {
      const status = chatClawAgentService.getStatus();
      return status.defaultAgentId || 'general';
    }

    // 3. 使用第一个代理
    const agents = await chatClawAgentService.getAgents();
    if (agents.length > 0) {
      return agents[0].id;
    }
    
    // 4. 默认代理 ID
    return 'default';
  }

  /**
   * 构建会话 ID
   */
  private buildConversationId(message: IncomingMessage): string {
    // 基于通道 ID 和发送者 ID 构建会话 ID
    return `${message.channelId}_${message.sender.id}`;
  }

  /**
   * 获取或创建会话上下文
   */
  private getOrCreateConversationContext(conversationId: string, agentId: string) {
    if (!this.conversationContexts.has(conversationId)) {
      this.conversationContexts.set(conversationId, {
        agentId,
        lastMessageTime: Date.now(),
        context: []
      });
    }
    return this.conversationContexts.get(conversationId)!;
  }

  /**
   * 获取所有 OpenClaw 通道
   */
  getAllOpenClawChannels(): OpenClawChannelConfig[] {
    return Array.from(this.openClawChannels.values());
  }

  /**
   * 获取 OpenClaw 通道
   */
  getOpenClawChannel(channelId: string): OpenClawChannelConfig | undefined {
    return this.openClawChannels.get(channelId);
  }

  /**
   * 更新 OpenClaw 通道配置
   */
  updateOpenClawChannel(channelId: string, updates: Partial<OpenClawChannelConfig>): OpenClawChannelConfig | undefined {
    const channel = this.openClawChannels.get(channelId);
    if (!channel) return undefined;

    const updatedChannel = {
      ...channel,
      ...updates,
      updatedAt: new Date().toISOString()
    };

    this.openClawChannels.set(channelId, updatedChannel);
    logger.info(`[OpenClaw] 更新通道配置: ${channel.name}`);
    return updatedChannel;
  }

  /**
   * 启用 OpenClaw 通道
   */
  enableOpenClawChannel(channelId: string): boolean {
    const channel = this.openClawChannels.get(channelId);
    if (!channel) return false;

    channel.enabled = true;
    channel.updatedAt = new Date().toISOString();
    this.openClawChannels.set(channelId, channel);

    logger.info(`[OpenClaw] 启用通道: ${channel.name}`);
    return true;
  }

  /**
   * 禁用 OpenClaw 通道
   */
  disableOpenClawChannel(channelId: string): boolean {
    const channel = this.openClawChannels.get(channelId);
    if (!channel) return false;

    channel.enabled = false;
    channel.updatedAt = new Date().toISOString();
    this.openClawChannels.set(channelId, channel);

    logger.info(`[OpenClaw] 禁用通道: ${channel.name}`);
    return true;
  }

  /**
   * 为通道分配代理
   */
  assignAgentToChannel(channelId: string, agentId: string): boolean {
    if (!this.openClawChannels.has(channelId)) {
      return false;
    }

    this.channelToAgentMap.set(channelId, agentId);
    logger.info(`[OpenClaw] 为通道 ${channelId} 分配代理 ${agentId}`);
    return true;
  }

  /**
   * 移除通道的代理分配
   */
  removeAgentFromChannel(channelId: string): boolean {
    const removed = this.channelToAgentMap.delete(channelId);
    if (removed) {
      logger.info(`[OpenClaw] 移除通道 ${channelId} 的代理分配`);
    }
    return removed;
  }

  /**
   * 获取通道的代理分配
   */
  getAgentForChannelConfig(channelId: string): string | undefined {
    return this.channelToAgentMap.get(channelId);
  }

  /**
   * 清理过期的会话上下文
   */
  cleanupConversationContexts(): void {
    const now = Date.now();
    const expirationTime = 24 * 60 * 60 * 1000; // 24小时

    for (const [conversationId, context] of this.conversationContexts.entries()) {
      if (now - context.lastMessageTime > expirationTime) {
        this.conversationContexts.delete(conversationId);
        logger.info(`[OpenClaw] 清理过期会话上下文: ${conversationId}`);
      }
    }
  }

  /**
   * 获取 OpenClaw 通道统计
   */
  getOpenClawChannelStats(): {
    total: number;
    enabled: number;
    byType: Record<string, number>;
  } {
    const channels = Array.from(this.openClawChannels.values());
    const byType: Record<string, number> = {};

    channels.forEach(channel => {
      byType[channel.type] = (byType[channel.type] || 0) + 1;
    });

    return {
      total: channels.length,
      enabled: channels.filter(c => c.enabled).length,
      byType
    };
  }

  /**
   * 获取通道认证 URL
   */
  getChannelAuthUrl(channelId: string): string {
    const channel = this.openClawChannels.get(channelId);
    if (!channel) {
      throw new Error('Channel not found');
    }

    // 根据通道类型生成认证 URL
    switch (channel.type) {
      case 'whatsapp':
        return 'https://console.twilio.com/';
      case 'telegram':
        return 'https://t.me/BotFather';
      case 'slack':
        return 'https://api.slack.com/apps';
      case 'discord':
        return 'https://discord.com/developers/applications';
      default:
        return 'https://openclaw.io/setup';
    }
  }

  /**
   * 验证通道认证
   */
  verifyChannelAuth(channelId: string): { success: boolean; error?: string } {
    const channel = this.openClawChannels.get(channelId);
    if (!channel) {
      return { success: false, error: 'Channel not found' };
    }

    // 验证通道配置
    const config = channel.config;
    let hasRequiredFields = true;
    let errorMessage = '';

    switch (channel.type) {
      case 'whatsapp':
        hasRequiredFields = !!(config.phoneNumber && config.accountSid && config.authToken);
        errorMessage = 'Please provide phone number, account SID, and auth token';
        break;
      case 'telegram':
        hasRequiredFields = !!(config.botToken);
        errorMessage = 'Please provide bot token';
        break;
      case 'slack':
        hasRequiredFields = !!(config.botToken);
        errorMessage = 'Please provide bot token';
        break;
      case 'discord':
        hasRequiredFields = !!(config.botToken);
        errorMessage = 'Please provide bot token';
        break;
      default:
        hasRequiredFields = true;
    }

    if (hasRequiredFields) {
      logger.info(`[OpenClaw] 通道认证验证成功: ${channel.name}`);
      return { success: true };
    } else {
      logger.error(`[OpenClaw] 通道认证验证失败: ${channel.name} - ${errorMessage}`);
      return { success: false, error: errorMessage };
    }
  }
}

// 导出单例
export const chatClawOpenClawService = new ChatClawOpenClawService();
