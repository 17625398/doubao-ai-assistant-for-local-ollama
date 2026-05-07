/**
 * ChatClaw 渠道配置服务
 * 管理渠道配置和认证信息
 */

import { logger } from '../utils/logger';
import { configService, ConfigStorageType } from './config-service';
import { ChannelConfig, CommunicationChannel } from './chatclaw-communication-service';
import { chatClawChannelAuthService } from './chatclaw-channel-auth-service';

export class ChatClawChannelConfigService {
  private static instance: ChatClawChannelConfigService;
  private configKey = 'chatclaw_channels';

  private constructor() {
    this.initialize();
  }

  static getInstance(): ChatClawChannelConfigService {
    if (!ChatClawChannelConfigService.instance) {
      ChatClawChannelConfigService.instance = new ChatClawChannelConfigService();
    }
    return ChatClawChannelConfigService.instance;
  }

  /**
   * 初始化服务
   */
  private initialize(): void {
    // 注册渠道配置存储
    configService.register(
      this.configKey,
      [] as ChannelConfig[],
      'ChatClaw 渠道配置',
      ConfigStorageType.LOCAL
    );
  }

  /**
   * 获取所有渠道配置
   */
  async getAllChannels(): Promise<ChannelConfig[]> {
    try {
      return await configService.get<ChannelConfig[]>(this.configKey);
    } catch (error) {
      logger.error('Failed to get channels:', error);
      return [];
    }
  }

  /**
   * 获取渠道配置
   */
  async getChannel(channelId: string): Promise<ChannelConfig | undefined> {
    const channels = await this.getAllChannels();
    return channels.find(channel => channel.id === channelId);
  }

  /**
   * 保存渠道配置
   */
  async saveChannel(channel: ChannelConfig): Promise<boolean> {
    try {
      const channels = await this.getAllChannels();
      const existingIndex = channels.findIndex(c => c.id === channel.id);

      if (existingIndex >= 0) {
        // 更新现有渠道
        channels[existingIndex] = {
          ...channel,
          updatedAt: new Date().toISOString()
        };
      } else {
        // 添加新渠道
        channels.push({
          ...channel,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        });
      }

      await configService.set(this.configKey, channels);
      
      // 更新访问控制配置
      chatClawChannelAuthService.updateAccessControl(channel.id, {
        allowedRoles: channel.config.allowedRoles || [],
        allowedUsers: channel.config.allowedUsers || [],
        dmPolicy: channel.config.dmPolicy || 'pairing',
        allowFrom: channel.config.allowFrom || []
      });
      
      logger.info(`Saved channel: ${channel.name}`);
      return true;
    } catch (error) {
      logger.error('Failed to save channel:', error);
      return false;
    }
  }

  /**
   * 删除渠道配置
   */
  async deleteChannel(channelId: string): Promise<boolean> {
    try {
      const channels = await this.getAllChannels();
      const filteredChannels = channels.filter(c => c.id !== channelId);

      if (filteredChannels.length === channels.length) {
        return false; // 渠道不存在
      }

      await configService.set(this.configKey, filteredChannels);
      logger.info(`Deleted channel: ${channelId}`);
      return true;
    } catch (error) {
      logger.error('Failed to delete channel:', error);
      return false;
    }
  }

  /**
   * 启用渠道
   */
  async enableChannel(channelId: string): Promise<boolean> {
    const channel = await this.getChannel(channelId);
    if (!channel) {
      return false;
    }

    channel.enabled = true;
    channel.updatedAt = new Date().toISOString();
    return await this.saveChannel(channel);
  }

  /**
   * 禁用渠道
   */
  async disableChannel(channelId: string): Promise<boolean> {
    const channel = await this.getChannel(channelId);
    if (!channel) {
      return false;
    }

    channel.enabled = false;
    channel.updatedAt = new Date().toISOString();
    return await this.saveChannel(channel);
  }

  /**
   * 获取启用的渠道
   */
  async getEnabledChannels(): Promise<ChannelConfig[]> {
    const channels = await this.getAllChannels();
    return channels.filter(channel => channel.enabled);
  }

  /**
   * 获取特定类型的渠道
   */
  async getChannelsByType(type: CommunicationChannel): Promise<ChannelConfig[]> {
    const channels = await this.getAllChannels();
    return channels.filter(channel => channel.type === type);
  }

  /**
   * 验证渠道配置
   */
  validateChannelConfig(channel: ChannelConfig): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    switch (channel.type) {
      case 'whatsapp':
        if (!channel.config.accountSid) errors.push('Account SID is required');
        if (!channel.config.authToken) errors.push('Auth Token is required');
        if (!channel.config.phoneNumber) errors.push('Phone Number is required');
        break;
      case 'telegram':
        if (!channel.config.botToken) errors.push('Bot Token is required');
        break;
      case 'slack':
        if (!channel.config.webhook && !channel.config.botToken) {
          errors.push('Either Webhook URL or Bot Token is required');
        }
        // 添加 DM 策略验证
        if (channel.config.dmPolicy && !['open', 'pairing', 'closed'].includes(channel.config.dmPolicy)) {
          errors.push('Invalid DM policy');
        }
        break;
      case 'discord':
        if (!channel.config.botToken) errors.push('Bot Token is required');
        if (!channel.config.channelId) errors.push('Channel ID is required');
        // 添加 DM 策略验证
        if (channel.config.dmPolicy && !['open', 'pairing', 'closed'].includes(channel.config.dmPolicy)) {
          errors.push('Invalid DM policy');
        }
        break;
      case 'webhook':
        if (!channel.config.url) errors.push('Webhook URL is required');
        break;
      case 'wechat':
        if (!channel.config.appId) errors.push('App ID is required');
        if (!channel.config.appSecret) errors.push('App Secret is required');
        break;
      case 'dingtalk':
        if (!channel.config.webhook) errors.push('Webhook URL is required');
        break;
      case 'wecom':
        if (!channel.config.corpId) errors.push('Corp ID is required');
        if (!channel.config.corpSecret) errors.push('Corp Secret is required');
        break;
      case 'lark':
        if (!channel.config.webhook) errors.push('Webhook URL is required');
        break;
    }

    // 验证访问控制配置
    if (channel.config.allowedRoles && !Array.isArray(channel.config.allowedRoles)) {
      errors.push('allowedRoles must be an array');
    }
    if (channel.config.allowedUsers && !Array.isArray(channel.config.allowedUsers)) {
      errors.push('allowedUsers must be an array');
    }
    if (channel.config.allowFrom && !Array.isArray(channel.config.allowFrom)) {
      errors.push('allowFrom must be an array');
    }

    return { valid: errors.length === 0, errors };
  }

  /**
   * 导入渠道配置
   */
  async importChannels(channels: ChannelConfig[]): Promise<{ success: number; failed: number }> {
    let success = 0;
    let failed = 0;

    for (const channel of channels) {
      const validation = this.validateChannelConfig(channel);
      if (validation.valid) {
        const saved = await this.saveChannel(channel);
        if (saved) success++;
        else failed++;
      } else {
        failed++;
      }
    }

    return { success, failed };
  }

  /**
   * 导出渠道配置
   */
  async exportChannels(): Promise<ChannelConfig[]> {
    return await this.getAllChannels();
  }
}

// 导出单例
export const chatClawChannelConfigService = ChatClawChannelConfigService.getInstance();
