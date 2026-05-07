/**
 * ChatClaw 渠道连接器服务
 * 处理渠道连接和消息处理
 */

import { logger } from '../utils/logger';
import { chatClawCommunicationService, ChannelConfig, IncomingMessage } from './chatclaw-communication-service';
import { chatClawChannelConfigService } from './chatclaw-channel-config-service';
import { chatClawGatewayService } from './chatclaw-gateway-service';

export interface ChannelConnector {
  type: string;
  connect(): Promise<boolean>;
  disconnect(): Promise<boolean>;
  sendMessage(content: string, attachments?: any[]): Promise<boolean>;
  isConnected(): boolean;
  getStatus(): string;
}

export class ChatClawChannelConnectorService {
  private static instance: ChatClawChannelConnectorService;
  private connectors: Map<string, ChannelConnector> = new Map();
  private messageHandlers: Set<(message: IncomingMessage) => void> = new Set();

  private constructor() {
    this.initialize();
  }

  static getInstance(): ChatClawChannelConnectorService {
    if (!ChatClawChannelConnectorService.instance) {
      ChatClawChannelConnectorService.instance = new ChatClawChannelConnectorService();
    }
    return ChatClawChannelConnectorService.instance;
  }

  /**
   * 初始化服务
   */
  private initialize(): void {
    // 注册消息处理器
    chatClawCommunicationService.onMessage(async (message) => {
      await this.handleIncomingMessage(message);
    });

    logger.info('ChatClaw Channel Connector Service initialized');
  }

  /**
   * 注册渠道连接器
   */
  registerConnector(channelId: string, connector: ChannelConnector): void {
    this.connectors.set(channelId, connector);
    logger.info(`Registered connector for channel: ${channelId}`);
  }

  /**
   * 获取渠道连接器
   */
  getConnector(channelId: string): ChannelConnector | undefined {
    return this.connectors.get(channelId);
  }

  /**
   * 连接渠道
   */
  async connectChannel(channelId: string): Promise<boolean> {
    try {
      const channel = await chatClawChannelConfigService.getChannel(channelId);
      if (!channel) {
        logger.error(`Channel not found: ${channelId}`);
        return false;
      }

      // 创建并注册连接器
      const connector = this.createConnector(channel);
      if (!connector) {
        logger.error(`Failed to create connector for channel: ${channelId}`);
        return false;
      }

      this.registerConnector(channelId, connector);

      // 连接渠道
      const connected = await connector.connect();
      if (connected) {
        await chatClawChannelConfigService.enableChannel(channelId);
        logger.info(`Connected channel: ${channelId}`);
      }

      return connected;
    } catch (error) {
      logger.error(`Failed to connect channel ${channelId}:`, error);
      return false;
    }
  }

  /**
   * 断开渠道连接
   */
  async disconnectChannel(channelId: string): Promise<boolean> {
    try {
      const connector = this.connectors.get(channelId);
      if (!connector) {
        logger.error(`Connector not found for channel: ${channelId}`);
        return false;
      }

      const disconnected = await connector.disconnect();
      if (disconnected) {
        await chatClawChannelConfigService.disableChannel(channelId);
        this.connectors.delete(channelId);
        logger.info(`Disconnected channel: ${channelId}`);
      }

      return disconnected;
    } catch (error) {
      logger.error(`Failed to disconnect channel ${channelId}:`, error);
      return false;
    }
  }

  /**
   * 发送消息到渠道
   */
  async sendMessageToChannel(channelId: string, content: string, attachments?: any[]): Promise<boolean> {
    try {
      const connector = this.connectors.get(channelId);
      if (!connector) {
        logger.error(`Connector not found for channel: ${channelId}`);
        return false;
      }

      if (!connector.isConnected()) {
        logger.error(`Channel not connected: ${channelId}`);
        return false;
      }

      const sent = await connector.sendMessage(content, attachments);
      if (sent) {
        logger.info(`Message sent to channel: ${channelId}`);
      }

      return sent;
    } catch (error) {
      logger.error(`Failed to send message to channel ${channelId}:`, error);
      return false;
    }
  }

  /**
   * 处理收到的消息
   */
  private async handleIncomingMessage(message: IncomingMessage): Promise<void> {
    logger.info(`[Connector] Received message from ${message.channel}: ${message.content.substring(0, 50)}...`);

    // 路由消息到 Gateway
    try {
      // 创建会话（如果不存在）
      const sessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      chatClawGatewayService.createSession('user', { channel: message.channel });

      // 路由消息
      await chatClawGatewayService.routeMessage(sessionId, message.channelId, message);
    } catch (error) {
      logger.error('Failed to route message:', error);
    }

    // 通知所有处理器
    this.messageHandlers.forEach(handler => {
      try {
        handler(message);
      } catch (error) {
        logger.error('Message handler error:', error);
      }
    });
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
   * 创建渠道连接器
   */
  private createConnector(channel: ChannelConfig): ChannelConnector | undefined {
    switch (channel.type) {
      case 'whatsapp':
        return new WhatsAppConnector(channel);
      case 'telegram':
        return new TelegramConnector(channel);
      case 'slack':
        return new SlackConnector(channel);
      case 'discord':
        return new DiscordConnector(channel);
      default:
        logger.warn(`No connector implementation for channel type: ${channel.type}`);
        return undefined;
    }
  }

  /**
   * 获取所有连接器状态
   */
  getConnectorsStatus(): Record<string, { connected: boolean; status: string }> {
    const status: Record<string, { connected: boolean; status: string }> = {};

    this.connectors.forEach((connector, channelId) => {
      status[channelId] = {
        connected: connector.isConnected(),
        status: connector.getStatus()
      };
    });

    return status;
  }

  /**
   * 连接所有启用的渠道
   */
  async connectAllEnabledChannels(): Promise<{ success: number; failed: number }> {
    const channels = await chatClawChannelConfigService.getEnabledChannels();
    let success = 0;
    let failed = 0;

    for (const channel of channels) {
      const connected = await this.connectChannel(channel.id);
      if (connected) success++;
      else failed++;
    }

    return { success, failed };
  }

  /**
   * 断开所有渠道连接
   */
  async disconnectAllChannels(): Promise<{ success: number; failed: number }> {
    const channelIds = Array.from(this.connectors.keys());
    let success = 0;
    let failed = 0;

    for (const channelId of channelIds) {
      const disconnected = await this.disconnectChannel(channelId);
      if (disconnected) success++;
      else failed++;
    }

    return { success, failed };
  }
}

/**
 * WhatsApp 连接器
 */
class WhatsAppConnector implements ChannelConnector {
  type = 'whatsapp';
  private channel: ChannelConfig;
  private connected = false;
  private status = 'disconnected';

  constructor(channel: ChannelConfig) {
    this.channel = channel;
  }

  async connect(): Promise<boolean> {
    try {
      const { accountSid, authToken, phoneNumber } = this.channel.config;
      if (!accountSid || !authToken || !phoneNumber) {
        this.status = 'invalid_config';
        return false;
      }

      // 模拟连接逻辑
      logger.info(`Connecting to WhatsApp with phone number: ${phoneNumber}`);
      // 这里可以实现实际的 WhatsApp 连接逻辑

      this.connected = true;
      this.status = 'connected';
      return true;
    } catch (error) {
      logger.error('Failed to connect to WhatsApp:', error);
      this.status = 'connection_failed';
      return false;
    }
  }

  async disconnect(): Promise<boolean> {
    try {
      // 模拟断开连接逻辑
      logger.info('Disconnecting from WhatsApp');
      // 这里可以实现实际的 WhatsApp 断开连接逻辑

      this.connected = false;
      this.status = 'disconnected';
      return true;
    } catch (error) {
      logger.error('Failed to disconnect from WhatsApp:', error);
      return false;
    }
  }

  async sendMessage(content: string, attachments?: any[]): Promise<boolean> {
    try {
      // 模拟发送消息逻辑
      logger.info(`Sending message to WhatsApp: ${content.substring(0, 50)}...`);
      // 这里可以实现实际的 WhatsApp 消息发送逻辑

      return true;
    } catch (error) {
      logger.error('Failed to send message to WhatsApp:', error);
      return false;
    }
  }

  isConnected(): boolean {
    return this.connected;
  }

  getStatus(): string {
    return this.status;
  }
}

/**
 * Telegram 连接器
 */
class TelegramConnector implements ChannelConnector {
  type = 'telegram';
  private channel: ChannelConfig;
  private connected = false;
  private status = 'disconnected';

  constructor(channel: ChannelConfig) {
    this.channel = channel;
  }

  async connect(): Promise<boolean> {
    try {
      const { botToken } = this.channel.config;
      if (!botToken) {
        this.status = 'invalid_config';
        return false;
      }

      // 模拟连接逻辑
      logger.info('Connecting to Telegram');
      // 这里可以实现实际的 Telegram 连接逻辑

      this.connected = true;
      this.status = 'connected';
      return true;
    } catch (error) {
      logger.error('Failed to connect to Telegram:', error);
      this.status = 'connection_failed';
      return false;
    }
  }

  async disconnect(): Promise<boolean> {
    try {
      // 模拟断开连接逻辑
      logger.info('Disconnecting from Telegram');
      // 这里可以实现实际的 Telegram 断开连接逻辑

      this.connected = false;
      this.status = 'disconnected';
      return true;
    } catch (error) {
      logger.error('Failed to disconnect from Telegram:', error);
      return false;
    }
  }

  async sendMessage(content: string, attachments?: any[]): Promise<boolean> {
    try {
      // 模拟发送消息逻辑
      logger.info(`Sending message to Telegram: ${content.substring(0, 50)}...`);
      // 这里可以实现实际的 Telegram 消息发送逻辑

      return true;
    } catch (error) {
      logger.error('Failed to send message to Telegram:', error);
      return false;
    }
  }

  isConnected(): boolean {
    return this.connected;
  }

  getStatus(): string {
    return this.status;
  }
}

/**
 * Slack 连接器
 */
class SlackConnector implements ChannelConnector {
  type = 'slack';
  private channel: ChannelConfig;
  private connected = false;
  private status = 'disconnected';

  constructor(channel: ChannelConfig) {
    this.channel = channel;
  }

  async connect(): Promise<boolean> {
    try {
      const { webhook, botToken } = this.channel.config;
      if (!webhook && !botToken) {
        this.status = 'invalid_config';
        return false;
      }

      // 模拟连接逻辑
      logger.info('Connecting to Slack');
      // 这里可以实现实际的 Slack 连接逻辑

      this.connected = true;
      this.status = 'connected';
      return true;
    } catch (error) {
      logger.error('Failed to connect to Slack:', error);
      this.status = 'connection_failed';
      return false;
    }
  }

  async disconnect(): Promise<boolean> {
    try {
      // 模拟断开连接逻辑
      logger.info('Disconnecting from Slack');
      // 这里可以实现实际的 Slack 断开连接逻辑

      this.connected = false;
      this.status = 'disconnected';
      return true;
    } catch (error) {
      logger.error('Failed to disconnect from Slack:', error);
      return false;
    }
  }

  async sendMessage(content: string, attachments?: any[]): Promise<boolean> {
    try {
      // 模拟发送消息逻辑
      logger.info(`Sending message to Slack: ${content.substring(0, 50)}...`);
      // 这里可以实现实际的 Slack 消息发送逻辑

      return true;
    } catch (error) {
      logger.error('Failed to send message to Slack:', error);
      return false;
    }
  }

  isConnected(): boolean {
    return this.connected;
  }

  getStatus(): string {
    return this.status;
  }
}

/**
 * Discord 连接器
 */
class DiscordConnector implements ChannelConnector {
  type = 'discord';
  private channel: ChannelConfig;
  private connected = false;
  private status = 'disconnected';

  constructor(channel: ChannelConfig) {
    this.channel = channel;
  }

  async connect(): Promise<boolean> {
    try {
      const { botToken, channelId } = this.channel.config;
      if (!botToken || !channelId) {
        this.status = 'invalid_config';
        return false;
      }

      // 模拟连接逻辑
      logger.info('Connecting to Discord');
      // 这里可以实现实际的 Discord 连接逻辑

      this.connected = true;
      this.status = 'connected';
      return true;
    } catch (error) {
      logger.error('Failed to connect to Discord:', error);
      this.status = 'connection_failed';
      return false;
    }
  }

  async disconnect(): Promise<boolean> {
    try {
      // 模拟断开连接逻辑
      logger.info('Disconnecting from Discord');
      // 这里可以实现实际的 Discord 断开连接逻辑

      this.connected = false;
      this.status = 'disconnected';
      return true;
    } catch (error) {
      logger.error('Failed to disconnect from Discord:', error);
      return false;
    }
  }

  async sendMessage(content: string, attachments?: any[]): Promise<boolean> {
    try {
      // 模拟发送消息逻辑
      logger.info(`Sending message to Discord: ${content.substring(0, 50)}...`);
      // 这里可以实现实际的 Discord 消息发送逻辑

      return true;
    } catch (error) {
      logger.error('Failed to send message to Discord:', error);
      return false;
    }
  }

  isConnected(): boolean {
    return this.connected;
  }

  getStatus(): string {
    return this.status;
  }
}

// 导出单例
export const chatClawChannelConnectorService = ChatClawChannelConnectorService.getInstance();
