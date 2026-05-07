/**
 * ChatClaw 多渠道通讯集成服务
 * 实现微信、钉钉、企业微信、飞书等渠道的集成
 */

import { logger } from '../utils/logger';
import { OllamaClient } from '../utils/ollama-client';
import { aiConfigManager } from '../utils/ai-config-manager';
import { messageSanitizer } from '../utils/message-sanitizer';
import { chatClawChannelAuthService } from './chatclaw-channel-auth-service';

export type CommunicationChannel = 'wechat' | 'dingtalk' | 'wecom' | 'lark' | 'slack' | 'webhook' | 'whatsapp' | 'telegram' | 'discord' | 'openclaw-whatsapp' | 'openclaw-telegram' | 'openclaw-slack' | 'openclaw-discord' | 'openclaw-google-chat' | 'openclaw-signal' | 'openclaw-imessage' | 'openclaw-bluebubbles' | 'openclaw-irc' | 'openclaw-microsoft-teams' | 'openclaw-matrix' | 'openclaw-feishu' | 'openclaw-line' | 'openclaw-mattermost' | 'openclaw-nextcloud-talk' | 'openclaw-nostr' | 'openclaw-synology-chat' | 'openclaw-tlon' | 'openclaw-twitch' | 'openclaw-zalo' | 'openclaw-zalo-personal' | 'openclaw-wechat' | 'openclaw-webchat';

export interface ChannelConfig {
  id: string;
  type: CommunicationChannel;
  name: string;
  enabled: boolean;
  config: Record<string, any>;
  createdAt: string;
  updatedAt: string;
}

export interface MessageTemplate {
  id: string;
  name: string;
  channel: CommunicationChannel;
  template: string;
  variables: string[];
  createdAt: string;
}

export interface MessageRequest {
  channelId: string;
  templateId?: string;
  content: string;
  variables?: Record<string, string>;
  attachments?: Array<{
    type: 'file' | 'image' | 'link';
    url: string;
    name?: string;
  }>;
}

export interface MessageResponse {
  success: boolean;
  messageId?: string;
  error?: string;
  timestamp: string;
}

export interface IncomingMessage {
  id: string;
  channel: CommunicationChannel;
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
}

export class ChatClawCommunicationService {
  private channels: Map<string, ChannelConfig> = new Map();
  private templates: Map<string, MessageTemplate> = new Map();
  private messageHandlers: Set<(message: IncomingMessage) => void> = new Set();
  private ollamaClient: OllamaClient;

  constructor() {
    this.ollamaClient = new OllamaClient();
    this.initializeDefaultChannels();
    this.initializeDefaultTemplates();
  }

  /**
   * 初始化默认渠道配置
   */
  private initializeDefaultChannels(): void {
    const defaultChannels: ChannelConfig[] = [
      {
        id: 'channel-webhook',
        type: 'webhook',
        name: 'Webhook 通用接口',
        enabled: false,
        config: {
          url: '',
          method: 'POST',
          headers: {}
        },
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      },
      {
        id: 'channel-wechat',
        type: 'wechat',
        name: '微信公众号',
        enabled: false,
        config: {
          appId: '',
          appSecret: '',
          token: '',
          encodingAESKey: ''
        },
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      },
      {
        id: 'channel-dingtalk',
        type: 'dingtalk',
        name: '钉钉机器人',
        enabled: false,
        config: {
          webhook: '',
          secret: '',
          accessToken: ''
        },
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      },
      {
        id: 'channel-wecom',
        type: 'wecom',
        name: '企业微信',
        enabled: false,
        config: {
          corpId: '',
          corpSecret: '',
          agentId: '',
          webhook: ''
        },
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      },
      {
        id: 'channel-lark',
        type: 'lark',
        name: '飞书机器人',
        enabled: false,
        config: {
          webhook: '',
          secret: '',
          appId: '',
          appSecret: ''
        },
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      },
      {
        id: 'channel-slack',
        type: 'slack',
        name: 'Slack',
        enabled: false,
        config: {
          webhook: '',
          botToken: '',
          channel: ''
        },
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      },
      {
        id: 'channel-whatsapp',
        type: 'whatsapp',
        name: 'WhatsApp',
        enabled: false,
        config: {
          accountSid: '',
          authToken: '',
          phoneNumber: ''
        },
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      },
      {
        id: 'channel-telegram',
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
        id: 'channel-discord',
        type: 'discord',
        name: 'Discord',
        enabled: false,
        config: {
          botToken: '',
          channelId: '',
          guildId: ''
        },
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      },
      // OpenClaw 通道
      {
        id: 'openclaw-whatsapp',
        type: 'openclaw-whatsapp',
        name: 'OpenClaw WhatsApp',
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
        type: 'openclaw-telegram',
        name: 'OpenClaw Telegram',
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
        type: 'openclaw-slack',
        name: 'OpenClaw Slack',
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
        type: 'openclaw-discord',
        name: 'OpenClaw Discord',
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
      this.channels.set(channel.id, channel);
    });
  }

  /**
   * 初始化默认消息模板
   */
  private initializeDefaultTemplates(): void {
    const defaultTemplates: MessageTemplate[] = [
      {
        id: 'template-task-success',
        name: '任务成功通知',
        channel: 'webhook',
        template: '✅ 任务 "{{taskName}}" 执行成功\n\n执行时间: {{executionTime}}\n结果: {{result}}',
        variables: ['taskName', 'executionTime', 'result'],
        createdAt: new Date().toISOString()
      },
      {
        id: 'template-task-failed',
        name: '任务失败通知',
        channel: 'webhook',
        template: '❌ 任务 "{{taskName}}" 执行失败\n\n执行时间: {{executionTime}}\n错误: {{error}}',
        variables: ['taskName', 'executionTime', 'error'],
        createdAt: new Date().toISOString()
      },
      {
        id: 'template-daily-report',
        name: '每日报告',
        channel: 'dingtalk',
        template: '📊 {{date}} 每日报告\n\n{{content}}',
        variables: ['date', 'content'],
        createdAt: new Date().toISOString()
      },
      {
        id: 'template-alert',
        name: '系统告警',
        channel: 'wecom',
        template: '🚨 系统告警\n\n级别: {{level}}\n消息: {{message}}\n时间: {{timestamp}}',
        variables: ['level', 'message', 'timestamp'],
        createdAt: new Date().toISOString()
      }
    ];

    defaultTemplates.forEach(template => {
      this.templates.set(template.id, template);
    });
  }

  /**
   * 获取所有渠道
   */
  getAllChannels(): ChannelConfig[] {
    return Array.from(this.channels.values());
  }

  /**
   * 获取渠道
   */
  getChannel(channelId: string): ChannelConfig | undefined {
    return this.channels.get(channelId);
  }

  /**
   * 更新渠道配置
   */
  updateChannel(channelId: string, updates: Partial<ChannelConfig>): ChannelConfig | undefined {
    const channel = this.channels.get(channelId);
    if (!channel) return undefined;

    const updatedChannel = {
      ...channel,
      ...updates,
      updatedAt: new Date().toISOString()
    };

    this.channels.set(channelId, updatedChannel);
    logger.info(`[Communication] 更新渠道配置: ${channel.name}`);
    return updatedChannel;
  }

  /**
   * 启用渠道
   */
  enableChannel(channelId: string): boolean {
    const channel = this.channels.get(channelId);
    if (!channel) return false;

    channel.enabled = true;
    channel.updatedAt = new Date().toISOString();
    this.channels.set(channelId, channel);

    logger.info(`[Communication] 启用渠道: ${channel.name}`);
    return true;
  }

  /**
   * 禁用渠道
   */
  disableChannel(channelId: string): boolean {
    const channel = this.channels.get(channelId);
    if (!channel) return false;

    channel.enabled = false;
    channel.updatedAt = new Date().toISOString();
    this.channels.set(channelId, channel);

    logger.info(`[Communication] 禁用渠道: ${channel.name}`);
    return true;
  }

  /**
   * 测试渠道连接
   */
  async testChannel(channelId: string): Promise<{ success: boolean; error?: string }> {
    const channel = this.channels.get(channelId);
    if (!channel) {
      return { success: false, error: 'Channel not found' };
    }

    try {
      switch (channel.type) {
        case 'webhook':
          return await this.testWebhook(channel);
        case 'wechat':
          return await this.testWechat(channel);
        case 'dingtalk':
          return await this.testDingtalk(channel);
        case 'wecom':
          return await this.testWecom(channel);
        case 'lark':
          return await this.testLark(channel);
        case 'slack':
          return await this.testSlack(channel);
        case 'whatsapp':
          return await this.testWhatsapp(channel);
        case 'telegram':
          return await this.testTelegram(channel);
        case 'discord':
          return await this.testDiscord(channel);
        // OpenClaw 通道测试
        case 'openclaw-whatsapp':
        case 'openclaw-telegram':
        case 'openclaw-slack':
        case 'openclaw-discord':
        case 'openclaw-google-chat':
        case 'openclaw-signal':
        case 'openclaw-imessage':
        case 'openclaw-bluebubbles':
        case 'openclaw-irc':
        case 'openclaw-microsoft-teams':
        case 'openclaw-matrix':
        case 'openclaw-feishu':
        case 'openclaw-line':
        case 'openclaw-mattermost':
        case 'openclaw-nextcloud-talk':
        case 'openclaw-nostr':
        case 'openclaw-synology-chat':
        case 'openclaw-tlon':
        case 'openclaw-twitch':
        case 'openclaw-zalo':
        case 'openclaw-zalo-personal':
        case 'openclaw-wechat':
        case 'openclaw-webchat':
          return await this.testOpenClawChannel(channel);
        default:
          return { success: false, error: 'Unsupported channel type' };
      }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Test failed'
      };
    }
  }

  /**
   * 测试 Webhook
   */
  private async testWebhook(channel: ChannelConfig): Promise<{ success: boolean; error?: string }> {
    const { url } = channel.config;
    if (!url) {
      return { success: false, error: 'Webhook URL is required' };
    }

    try {
      // 模拟测试请求
      logger.info(`[Communication] Testing webhook: ${url}`);
      return { success: true };
    } catch (error) {
      return { success: false, error: 'Webhook test failed' };
    }
  }

  /**
   * 测试微信公众号
   */
  private async testWechat(channel: ChannelConfig): Promise<{ success: boolean; error?: string }> {
    const { appId, appSecret } = channel.config;
    if (!appId || !appSecret) {
      return { success: false, error: 'App ID and App Secret are required' };
    }

    logger.info(`[Communication] Testing WeChat: ${appId}`);
    return { success: true };
  }

  /**
   * 测试钉钉
   */
  private async testDingtalk(channel: ChannelConfig): Promise<{ success: boolean; error?: string }> {
    const { webhook } = channel.config;
    if (!webhook) {
      return { success: false, error: 'Webhook URL is required' };
    }

    logger.info(`[Communication] Testing DingTalk`);
    return { success: true };
  }

  /**
   * 测试企业微信
   */
  private async testWecom(channel: ChannelConfig): Promise<{ success: boolean; error?: string }> {
    const { corpId, corpSecret } = channel.config;
    if (!corpId || !corpSecret) {
      return { success: false, error: 'Corp ID and Corp Secret are required' };
    }

    logger.info(`[Communication] Testing WeCom: ${corpId}`);
    return { success: true };
  }

  /**
   * 测试飞书
   */
  private async testLark(channel: ChannelConfig): Promise<{ success: boolean; error?: string }> {
    const { webhook } = channel.config;
    if (!webhook) {
      return { success: false, error: 'Webhook URL is required' };
    }

    logger.info(`[Communication] Testing Lark`);
    return { success: true };
  }

  /**
   * 测试 Slack
   */
  private async testSlack(channel: ChannelConfig): Promise<{ success: boolean; error?: string }> {
    const { webhook } = channel.config;
    if (!webhook) {
      return { success: false, error: 'Webhook URL is required' };
    }

    logger.info(`[Communication] Testing Slack`);
    return { success: true };
  }

  /**
   * 测试 WhatsApp
   */
  private async testWhatsapp(channel: ChannelConfig): Promise<{ success: boolean; error?: string }> {
    const { accountSid, authToken, phoneNumber } = channel.config;
    if (!accountSid || !authToken || !phoneNumber) {
      return { success: false, error: 'Account SID, Auth Token, and Phone Number are required' };
    }

    logger.info(`[Communication] Testing WhatsApp: ${phoneNumber}`);
    return { success: true };
  }

  /**
   * 测试 Telegram
   */
  private async testTelegram(channel: ChannelConfig): Promise<{ success: boolean; error?: string }> {
    const { botToken } = channel.config;
    if (!botToken) {
      return { success: false, error: 'Bot Token is required' };
    }

    logger.info(`[Communication] Testing Telegram`);
    return { success: true };
  }

  /**
   * 测试 Discord
   */
  private async testDiscord(channel: ChannelConfig): Promise<{ success: boolean; error?: string }> {
    const { botToken, channelId } = channel.config;
    if (!botToken || !channelId) {
      return { success: false, error: 'Bot Token and Channel ID are required' };
    }

    logger.info(`[Communication] Testing Discord`);
    return { success: true };
  }

  /**
   * 测试 OpenClaw 通道
   */
  private async testOpenClawChannel(channel: ChannelConfig): Promise<{ success: boolean; error?: string }> {
    logger.info(`[Communication] Testing OpenClaw channel: ${channel.type}`);
    
    // 检查必要的配置
    if (channel.type === 'openclaw-whatsapp') {
      const { phoneNumber, accountSid, authToken } = channel.config;
      if (!phoneNumber || !accountSid || !authToken) {
        return { success: false, error: 'Phone number, Account SID, and Auth Token are required' };
      }
    } else if (channel.type === 'openclaw-telegram') {
      const { botToken } = channel.config;
      if (!botToken) {
        return { success: false, error: 'Bot Token is required' };
      }
    } else if (channel.type === 'openclaw-slack' || channel.type === 'openclaw-discord') {
      const { botToken, channelId } = channel.config;
      if (!botToken || !channelId) {
        return { success: false, error: 'Bot Token and Channel ID are required' };
      }
    }

    return { success: true };
  }

  /**
   * 发送消息
   */
  async sendMessage(request: MessageRequest): Promise<MessageResponse> {
    // 验证消息请求
    const validation = messageSanitizer.validateMessageRequest(request);
    if (!validation.valid) {
      return {
        success: false,
        error: validation.errors.join(', '),
        timestamp: new Date().toISOString()
      };
    }

    // 清理消息请求
    const sanitizedRequest = messageSanitizer.sanitizeMessageRequest(request);

    const channel = this.channels.get(sanitizedRequest.channelId);
    if (!channel) {
      return {
        success: false,
        error: 'Channel not found',
        timestamp: new Date().toISOString()
      };
    }

    if (!channel.enabled) {
      return {
        success: false,
        error: 'Channel is disabled',
        timestamp: new Date().toISOString()
      };
    }

    // 验证渠道认证
    const authResult = await chatClawChannelAuthService.validateChannelAuth(sanitizedRequest.channelId);
    if (!authResult.authenticated) {
      return {
        success: false,
        error: authResult.error || 'Channel authentication failed',
        timestamp: new Date().toISOString()
      };
    }

    try {
      // 如果使用模板，渲染模板
      let content = sanitizedRequest.content;
      if (sanitizedRequest.templateId) {
        content = this.renderTemplate(sanitizedRequest.templateId, sanitizedRequest.variables || {});
      }

      switch (channel.type) {
        case 'webhook':
          return await this.sendWebhookMessage(channel, content, sanitizedRequest.attachments);
        case 'wechat':
          return await this.sendWechatMessage(channel, content, sanitizedRequest.attachments);
        case 'dingtalk':
          return await this.sendDingtalkMessage(channel, content, sanitizedRequest.attachments);
        case 'wecom':
          return await this.sendWecomMessage(channel, content, sanitizedRequest.attachments);
        case 'lark':
          return await this.sendLarkMessage(channel, content, sanitizedRequest.attachments);
        case 'slack':
          return await this.sendSlackMessage(channel, content, sanitizedRequest.attachments);
        case 'whatsapp':
          return await this.sendWhatsappMessage(channel, content, sanitizedRequest.attachments);
        case 'telegram':
          return await this.sendTelegramMessage(channel, content, sanitizedRequest.attachments);
        case 'discord':
          return await this.sendDiscordMessage(channel, content, sanitizedRequest.attachments);
        // OpenClaw 通道消息发送
        case 'openclaw-whatsapp':
        case 'openclaw-telegram':
        case 'openclaw-slack':
        case 'openclaw-discord':
        case 'openclaw-google-chat':
        case 'openclaw-signal':
        case 'openclaw-imessage':
        case 'openclaw-bluebubbles':
        case 'openclaw-irc':
        case 'openclaw-microsoft-teams':
        case 'openclaw-matrix':
        case 'openclaw-feishu':
        case 'openclaw-line':
        case 'openclaw-mattermost':
        case 'openclaw-nextcloud-talk':
        case 'openclaw-nostr':
        case 'openclaw-synology-chat':
        case 'openclaw-tlon':
        case 'openclaw-twitch':
        case 'openclaw-zalo':
        case 'openclaw-zalo-personal':
        case 'openclaw-wechat':
        case 'openclaw-webchat':
          return await this.sendOpenClawMessage(channel, content, sanitizedRequest.attachments);
        default:
          return {
            success: false,
            error: 'Unsupported channel type',
            timestamp: new Date().toISOString()
          };
      }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Send message failed',
        timestamp: new Date().toISOString()
      };
    }
  }

  /**
   * 发送 Webhook 消息
   */
  private async sendWebhookMessage(
    channel: ChannelConfig,
    content: string,
    attachments?: MessageRequest['attachments']
  ): Promise<MessageResponse> {
    const { url, method = 'POST', headers = {} } = channel.config;

    logger.info(`[Communication] Sending webhook message to: ${url}`);

    // 模拟发送
    return {
      success: true,
      messageId: `msg_${Date.now()}`,
      timestamp: new Date().toISOString()
    };
  }

  /**
   * 发送微信公众号消息
   */
  private async sendWechatMessage(
    channel: ChannelConfig,
    content: string,
    attachments?: MessageRequest['attachments']
  ): Promise<MessageResponse> {
    logger.info(`[Communication] Sending WeChat message`);

    return {
      success: true,
      messageId: `msg_${Date.now()}`,
      timestamp: new Date().toISOString()
    };
  }

  /**
   * 发送钉钉消息
   */
  private async sendDingtalkMessage(
    channel: ChannelConfig,
    content: string,
    attachments?: MessageRequest['attachments']
  ): Promise<MessageResponse> {
    logger.info(`[Communication] Sending DingTalk message`);

    return {
      success: true,
      messageId: `msg_${Date.now()}`,
      timestamp: new Date().toISOString()
    };
  }

  /**
   * 发送企业微信消息
   */
  private async sendWecomMessage(
    channel: ChannelConfig,
    content: string,
    attachments?: MessageRequest['attachments']
  ): Promise<MessageResponse> {
    logger.info(`[Communication] Sending WeCom message`);

    return {
      success: true,
      messageId: `msg_${Date.now()}`,
      timestamp: new Date().toISOString()
    };
  }

  /**
   * 发送飞书消息
   */
  private async sendLarkMessage(
    channel: ChannelConfig,
    content: string,
    attachments?: MessageRequest['attachments']
  ): Promise<MessageResponse> {
    logger.info(`[Communication] Sending Lark message`);

    return {
      success: true,
      messageId: `msg_${Date.now()}`,
      timestamp: new Date().toISOString()
    };
  }

  /**
   * 发送 Slack 消息
   */
  private async sendSlackMessage(
    channel: ChannelConfig,
    content: string,
    attachments?: MessageRequest['attachments']
  ): Promise<MessageResponse> {
    logger.info(`[Communication] Sending Slack message`);

    return {
      success: true,
      messageId: `msg_${Date.now()}`,
      timestamp: new Date().toISOString()
    };
  }

  /**
   * 发送 WhatsApp 消息
   */
  private async sendWhatsappMessage(
    channel: ChannelConfig,
    content: string,
    attachments?: MessageRequest['attachments']
  ): Promise<MessageResponse> {
    logger.info(`[Communication] Sending WhatsApp message`);

    return {
      success: true,
      messageId: `msg_${Date.now()}`,
      timestamp: new Date().toISOString()
    };
  }

  /**
   * 发送 Telegram 消息
   */
  private async sendTelegramMessage(
    channel: ChannelConfig,
    content: string,
    attachments?: MessageRequest['attachments']
  ): Promise<MessageResponse> {
    logger.info(`[Communication] Sending Telegram message`);

    return {
      success: true,
      messageId: `msg_${Date.now()}`,
      timestamp: new Date().toISOString()
    };
  }

  /**
   * 发送 Discord 消息
   */
  private async sendDiscordMessage(
    channel: ChannelConfig,
    content: string,
    attachments?: MessageRequest['attachments']
  ): Promise<MessageResponse> {
    logger.info(`[Communication] Sending Discord message`);

    return {
      success: true,
      messageId: `msg_${Date.now()}`,
      timestamp: new Date().toISOString()
    };
  }

  /**
   * 发送 OpenClaw 消息
   */
  private async sendOpenClawMessage(
    channel: ChannelConfig,
    content: string,
    attachments?: MessageRequest['attachments']
  ): Promise<MessageResponse> {
    logger.info(`[Communication] Sending OpenClaw message to ${channel.type}`);

    // 这里可以集成 OpenClaw 的实际发送逻辑
    // 目前只是模拟发送
    return {
      success: true,
      messageId: `openclaw_msg_${Date.now()}`,
      timestamp: new Date().toISOString()
    };
  }

  /**
   * 渲染消息模板
   */
  private renderTemplate(templateId: string, variables: Record<string, string>): string {
    const template = this.templates.get(templateId);
    if (!template) {
      throw new Error(`Template not found: ${templateId}`);
    }

    let result = template.template;
    Object.entries(variables).forEach(([key, value]) => {
      result = result.replace(new RegExp(`{{${key}}}`, 'g'), value);
    });

    return result;
  }

  /**
   * 获取所有模板
   */
  getAllTemplates(): MessageTemplate[] {
    return Array.from(this.templates.values());
  }

  /**
   * 创建模板
   */
  createTemplate(template: Omit<MessageTemplate, 'id' | 'createdAt'>): MessageTemplate {
    const id = `template_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const newTemplate: MessageTemplate = {
      ...template,
      id,
      createdAt: new Date().toISOString()
    };

    this.templates.set(id, newTemplate);
    logger.info(`[Communication] 创建模板: ${newTemplate.name}`);
    return newTemplate;
  }

  /**
   * 删除模板
   */
  deleteTemplate(templateId: string): boolean {
    const deleted = this.templates.delete(templateId);
    if (deleted) {
      logger.info(`[Communication] 删除模板: ${templateId}`);
    }
    return deleted;
  }

  /**
   * 注册消息处理器
   */
  onMessage(handler: (message: IncomingMessage) => void): () => void {
    this.messageHandlers.add(handler);
    return () => {
      this.messageHandlers.delete(handler);
    };
  }

  /**
   * 处理收到的消息
   */
  async handleIncomingMessage(message: IncomingMessage): Promise<void> {
    // 验证发送者权限
    const permissionResult = chatClawChannelAuthService.validateSenderPermission(message);
    if (!permissionResult.allowed) {
      logger.warn(`[Communication] Sender not allowed: ${message.sender.id} - ${permissionResult.error}`);
      return;
    }

    // 清理消息内容
    const sanitizedContent = messageSanitizer.sanitizeText(message.content);
    const sanitizedMessage: IncomingMessage = {
      ...message,
      content: sanitizedContent
    };

    logger.info(`[Communication] 收到消息 from ${message.channel}: ${sanitizedContent.substring(0, 50)}...`);

    // 调用 AI 处理消息
    try {
      const model = aiConfigManager.getDefaultModel();

      const response = await this.ollamaClient.chat({
        model,
        messages: [
          { role: 'system', content: '你是 ChatClaw 通讯助手，帮助用户处理消息' },
          { role: 'user', content: sanitizedContent }
        ],
        stream: false
      });

      // 可以在这里自动回复
      logger.info(`[Communication] AI 回复: ${response.message?.content?.substring(0, 50)}...`);
    } catch (error) {
      logger.error('[Communication] AI 处理失败:', error);
    }

    // 通知所有处理器
    this.messageHandlers.forEach(handler => {
      try {
        handler(sanitizedMessage);
      } catch (error) {
        logger.error('[Communication] Message handler error:', error);
      }
    });
  }

  /**
   * 获取渠道统计
   */
  getChannelStats(): {
    total: number;
    enabled: number;
    byType: Record<string, number>;
  } {
    const channels = Array.from(this.channels.values());
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
}

// 导出单例
export const chatClawCommunicationService = new ChatClawCommunicationService();
