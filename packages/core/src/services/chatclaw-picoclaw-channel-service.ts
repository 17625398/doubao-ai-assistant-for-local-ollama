/**
 * PicoClaw 通道服务
 * 管理 PicoClaw 的多渠道通讯功能
 */
import { logger } from '../utils/logger';
import { eventBus } from '../utils/event-bus';

export interface ChannelConfig {
  enabled: boolean;
  token: string;
  [key: string]: any;
}

export interface ChannelStatus {
  status: 'connected' | 'disconnected' | 'error';
  lastMessage?: string;
  lastActivity?: string;
  error?: string;
}

export interface ChannelMessage {
  id: string;
  channel: string;
  content: string;
  sender: string;
  timestamp: string;
  metadata?: Record<string, any>;
}

export class ChatClawPicoClawChannelService {
  private channels: Map<string, ChannelConfig> = new Map();
  private channelStatuses: Map<string, ChannelStatus> = new Map();
  private gatewayUrl: string = 'http://localhost:18800';

  constructor() {
    this.initialize();
  }

  /**
   * 初始化通道服务
   */
  private initialize(): void {
    logger.info('Initializing PicoClaw channel service');
    eventBus.on('chatclaw:picoclaw-config-updated', this.handleConfigUpdate.bind(this));
  }

  /**
   * 处理配置更新
   */
  private handleConfigUpdate(config: any): void {
    if (config.channels) {
      this.updateChannels(config.channels);
    }
    if (config.gatewayUrl) {
      this.gatewayUrl = config.gatewayUrl;
    }
  }

  /**
   * 更新通道配置
   */
  updateChannels(channels: Record<string, ChannelConfig>): void {
    // 更新通道配置
    for (const [channel, config] of Object.entries(channels)) {
      this.channels.set(channel, config);
      // 如果通道启用，尝试连接
      if (config.enabled) {
        this.connectChannel(channel);
      } else {
        this.disconnectChannel(channel);
      }
    }
  }

  /**
   * 连接通道
   */
  async connectChannel(channel: string): Promise<boolean> {
    try {
      const config = this.channels.get(channel);
      if (!config || !config.enabled) {
        logger.warn(`Channel ${channel} is not enabled`);
        return false;
      }

      logger.info(`Connecting channel ${channel}...`);

      // 调用 PicoClaw API 连接通道
      const response = await fetch(`${this.gatewayUrl}/api/channels/${channel}/connect`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(config)
      });

      if (response.ok) {
        this.channelStatuses.set(channel, {
          status: 'connected',
          lastMessage: 'Channel connected successfully',
          lastActivity: new Date().toISOString()
        });
        logger.info(`Channel ${channel} connected successfully`);
        eventBus.emit('chatclaw:picoclaw-channel-connected', { channel, status: 'connected' });
        return true;
      } else {
        const errorData = await response.json().catch(() => ({}));
        const errorMessage = errorData.message || `Failed to connect channel ${channel}`;
        this.channelStatuses.set(channel, {
          status: 'error',
          error: errorMessage,
          lastActivity: new Date().toISOString()
        });
        logger.error(`Failed to connect channel ${channel}: ${errorMessage}`);
        return false;
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.channelStatuses.set(channel, {
        status: 'error',
        error: errorMessage,
        lastActivity: new Date().toISOString()
      });
      logger.error(`Failed to connect channel ${channel}:`, error);
      return false;
    }
  }

  /**
   * 断开通道
   */
  async disconnectChannel(channel: string): Promise<boolean> {
    try {
      logger.info(`Disconnecting channel ${channel}...`);

      // 调用 PicoClaw API 断开通道
      const response = await fetch(`${this.gatewayUrl}/api/channels/${channel}/disconnect`, {
        method: 'POST'
      });

      if (response.ok) {
        this.channelStatuses.set(channel, {
          status: 'disconnected',
          lastMessage: 'Channel disconnected',
          lastActivity: new Date().toISOString()
        });
        logger.info(`Channel ${channel} disconnected successfully`);
        eventBus.emit('chatclaw:picoclaw-channel-disconnected', { channel, status: 'disconnected' });
        return true;
      } else {
        logger.warn(`Failed to disconnect channel ${channel}`);
        return false;
      }
    } catch (error) {
      logger.error(`Failed to disconnect channel ${channel}:`, error);
      return false;
    }
  }

  /**
   * 发送消息到通道
   */
  async sendMessage(channel: string, message: string, options?: Record<string, any>): Promise<boolean> {
    try {
      const status = this.channelStatuses.get(channel);
      if (!status || status.status !== 'connected') {
        logger.warn(`Channel ${channel} is not connected`);
        return false;
      }

      // 调用 PicoClaw API 发送消息
      const response = await fetch(`${this.gatewayUrl}/api/channels/${channel}/message`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ message, ...options })
      });

      if (response.ok) {
        logger.info(`Message sent to channel ${channel}`);
        return true;
      } else {
        const errorData = await response.json().catch(() => ({}));
        const errorMessage = errorData.message || `Failed to send message to channel ${channel}`;
        logger.error(`Failed to send message to channel ${channel}: ${errorMessage}`);
        return false;
      }
    } catch (error) {
      logger.error(`Failed to send message to channel ${channel}:`, error);
      return false;
    }
  }

  /**
   * 发送媒体消息到通道
   */
  async sendMedia(channel: string, mediaUrl: string, caption?: string): Promise<boolean> {
    try {
      const status = this.channelStatuses.get(channel);
      if (!status || status.status !== 'connected') {
        logger.warn(`Channel ${channel} is not connected`);
        return false;
      }

      // 调用 PicoClaw API 发送媒体消息
      const response = await fetch(`${this.gatewayUrl}/api/channels/${channel}/media`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ mediaUrl, caption })
      });

      if (response.ok) {
        logger.info(`Media sent to channel ${channel}`);
        return true;
      } else {
        const errorData = await response.json().catch(() => ({}));
        const errorMessage = errorData.message || `Failed to send media to channel ${channel}`;
        logger.error(`Failed to send media to channel ${channel}: ${errorMessage}`);
        return false;
      }
    } catch (error) {
      logger.error(`Failed to send media to channel ${channel}:`, error);
      return false;
    }
  }

  /**
   * 获取通道状态
   */
  getChannelStatus(channel: string): ChannelStatus | undefined {
    return this.channelStatuses.get(channel);
  }

  /**
   * 获取所有通道状态
   */
  getAllChannelStatuses(): Record<string, ChannelStatus> {
    const statuses: Record<string, ChannelStatus> = {};
    for (const [channel, status] of this.channelStatuses.entries()) {
      statuses[channel] = status;
    }
    return statuses;
  }

  /**
   * 获取已连接的通道
   */
  getConnectedChannels(): string[] {
    const connected: string[] = [];
    for (const [channel, status] of this.channelStatuses.entries()) {
      if (status.status === 'connected') {
        connected.push(channel);
      }
    }
    return connected;
  }

  /**
   * 检查通道是否连接
   */
  isChannelConnected(channel: string): boolean {
    const status = this.channelStatuses.get(channel);
    return status?.status === 'connected';
  }

  /**
   * 刷新通道状态
   */
  async refreshChannelStatus(channel: string): Promise<ChannelStatus | undefined> {
    try {
      // 调用 PicoClaw API 获取通道状态
      const response = await fetch(`${this.gatewayUrl}/api/channels/${channel}/status`);
      
      if (response.ok) {
        const statusData = await response.json();
        const status: ChannelStatus = {
          status: statusData.status || 'disconnected',
          lastMessage: statusData.lastMessage,
          lastActivity: statusData.lastActivity,
          error: statusData.error
        };
        this.channelStatuses.set(channel, status);
        return status;
      }
    } catch (error) {
      logger.error(`Failed to refresh channel ${channel} status:`, error);
    }
    return this.channelStatuses.get(channel);
  }

  /**
   * 批量刷新所有通道状态
   */
  async refreshAllChannelStatuses(): Promise<void> {
    const channels = Array.from(this.channels.keys());
    for (const channel of channels) {
      await this.refreshChannelStatus(channel);
    }
  }

  /**
   * 设置 Gateway URL
   */
  setGatewayUrl(url: string): void {
    this.gatewayUrl = url;
  }

  /**
   * 获取 Gateway URL
   */
  getGatewayUrl(): string {
    return this.gatewayUrl;
  }
}

// 导出单例
export const chatClawPicoClawChannelService = new ChatClawPicoClawChannelService();
