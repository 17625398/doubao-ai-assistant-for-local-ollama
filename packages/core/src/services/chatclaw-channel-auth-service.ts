/**
 * ChatClaw 渠道认证安全服务
 * 管理渠道认证和安全验证
 */

import { logger } from '../utils/logger';
import { ChannelConfig, CommunicationChannel, IncomingMessage } from './chatclaw-communication-service';
import { chatClawChannelConfigService } from './chatclaw-channel-config-service';
import { getRBACService } from './rbac-service';

// 定义渠道认证状态
export interface ChannelAuthState {
  channelId: string;
  authenticated: boolean;
  lastAuthTime: string;
  expiresAt?: string;
  authToken?: string;
  refreshToken?: string;
}

// 定义渠道访问控制
export interface ChannelAccessControl {
  channelId: string;
  allowedRoles: string[];
  allowedUsers: string[];
  dmPolicy: 'open' | 'pairing' | 'closed';
  allowFrom: string[];
}

export class ChatClawChannelAuthService {
  private static instance: ChatClawChannelAuthService;
  private authStates: Map<string, ChannelAuthState> = new Map();
  private accessControls: Map<string, ChannelAccessControl> = new Map();
  private rbacService = getRBACService();
  
  private constructor() {
    this.initialize();
  }
  
  static getInstance(): ChatClawChannelAuthService {
    if (!ChatClawChannelAuthService.instance) {
      ChatClawChannelAuthService.instance = new ChatClawChannelAuthService();
    }
    return ChatClawChannelAuthService.instance;
  }
  
  /**
   * 初始化服务
   */
  private initialize(): void {
    // 加载渠道访问控制配置
    this.loadAccessControls();
  }
  
  /**
   * 加载渠道访问控制配置
   */
  private async loadAccessControls(): Promise<void> {
    try {
      const channels = await chatClawChannelConfigService.getAllChannels();
      channels.forEach(channel => {
        this.accessControls.set(channel.id, {
          channelId: channel.id,
          allowedRoles: channel.config.allowedRoles || [],
          allowedUsers: channel.config.allowedUsers || [],
          dmPolicy: channel.config.dmPolicy || 'pairing',
          allowFrom: channel.config.allowFrom || []
        });
      });
    } catch (error) {
      logger.error('Failed to load access controls:', error);
    }
  }
  
  /**
   * 验证渠道认证
   * @param channelId 渠道ID
   * @returns 认证状态
   */
  async validateChannelAuth(channelId: string): Promise<{ authenticated: boolean; error?: string }> {
    const channel = await chatClawChannelConfigService.getChannel(channelId);
    if (!channel) {
      return { authenticated: false, error: 'Channel not found' };
    }
    
    if (!channel.enabled) {
      return { authenticated: false, error: 'Channel is disabled' };
    }
    
    const authState = this.authStates.get(channelId);
    if (authState && authState.authenticated) {
      // 检查认证是否过期
      if (authState.expiresAt) {
        if (new Date(authState.expiresAt) < new Date()) {
          // 认证已过期，尝试刷新
          const refreshed = await this.refreshChannelAuth(channelId);
          return refreshed;
        }
      }
      return { authenticated: true };
    }
    
    // 执行认证
    return await this.authenticateChannel(channelId);
  }
  
  /**
   * 认证渠道
   * @param channelId 渠道ID
   * @returns 认证结果
   */
  private async authenticateChannel(channelId: string): Promise<{ authenticated: boolean; error?: string }> {
    try {
      const channel = await chatClawChannelConfigService.getChannel(channelId);
      if (!channel) {
        return { authenticated: false, error: 'Channel not found' };
      }
      
      // 根据渠道类型执行不同的认证逻辑
      let authenticated = false;
      
      switch (channel.type) {
        case 'whatsapp':
          authenticated = await this.authenticateWhatsapp(channel);
          break;
        case 'telegram':
          authenticated = await this.authenticateTelegram(channel);
          break;
        case 'slack':
          authenticated = await this.authenticateSlack(channel);
          break;
        case 'discord':
          authenticated = await this.authenticateDiscord(channel);
          break;
        case 'wechat':
          authenticated = await this.authenticateWechat(channel);
          break;
        case 'dingtalk':
          authenticated = await this.authenticateDingtalk(channel);
          break;
        case 'wecom':
          authenticated = await this.authenticateWecom(channel);
          break;
        case 'lark':
          authenticated = await this.authenticateLark(channel);
          break;
        case 'webhook':
          // Webhook 不需要认证，只需要验证URL
          authenticated = !!channel.config.url;
          break;
        default:
          // 其他渠道默认认证成功
          authenticated = true;
      }
      
      if (authenticated) {
        const authState: ChannelAuthState = {
          channelId,
          authenticated: true,
          lastAuthTime: new Date().toISOString(),
          // 设置过期时间为1小时
          expiresAt: new Date(Date.now() + 60 * 60 * 1000).toISOString()
        };
        this.authStates.set(channelId, authState);
        logger.info(`Channel authenticated: ${channelId}`);
        return { authenticated: true };
      } else {
        return { authenticated: false, error: 'Authentication failed' };
      }
    } catch (error) {
      logger.error(`Failed to authenticate channel ${channelId}:`, error);
      return { authenticated: false, error: 'Authentication error' };
    }
  }
  
  /**
   * 刷新渠道认证
   * @param channelId 渠道ID
   * @returns 认证结果
   */
  private async refreshChannelAuth(channelId: string): Promise<{ authenticated: boolean; error?: string }> {
    try {
      const channel = await chatClawChannelConfigService.getChannel(channelId);
      if (!channel) {
        return { authenticated: false, error: 'Channel not found' };
      }
      
      // 这里可以实现具体的刷新逻辑
      // 例如，对于需要访问令牌的渠道，使用刷新令牌获取新的访问令牌
      
      const authState: ChannelAuthState = {
        channelId,
        authenticated: true,
        lastAuthTime: new Date().toISOString(),
        expiresAt: new Date(Date.now() + 60 * 60 * 1000).toISOString()
      };
      
      this.authStates.set(channelId, authState);
      logger.info(`Channel auth refreshed: ${channelId}`);
      return { authenticated: true };
    } catch (error) {
      logger.error(`Failed to refresh channel auth ${channelId}:`, error);
      return { authenticated: false, error: 'Refresh failed' };
    }
  }
  
  /**
   * 验证消息发送者权限
   * @param message 入站消息
   * @returns 权限验证结果
   */
  validateSenderPermission(message: IncomingMessage): { allowed: boolean; error?: string } {
    const accessControl = this.accessControls.get(message.channelId);
    if (!accessControl) {
      return { allowed: false, error: 'Access control not found' };
    }
    
    // 检查DM策略
    if (accessControl.dmPolicy === 'closed') {
      return { allowed: false, error: 'Direct messages are closed' };
    }
    
    if (accessControl.dmPolicy === 'pairing') {
      // 检查发送者是否在允许列表中
      if (!accessControl.allowFrom.includes(message.sender.id)) {
        return { allowed: false, error: 'Sender not paired' };
      }
    }
    
    return { allowed: true };
  }
  
  /**
   * 验证用户对渠道的访问权限
   * @param userId 用户ID
   * @param channelId 渠道ID
   * @returns 权限验证结果
   */
  validateUserAccess(userId: string, channelId: string): { allowed: boolean; error?: string } {
    const accessControl = this.accessControls.get(channelId);
    if (!accessControl) {
      return { allowed: false, error: 'Access control not found' };
    }
    
    // 检查用户是否在允许列表中
    if (accessControl.allowedUsers.includes(userId)) {
      return { allowed: true };
    }
    
    // 检查用户角色
    const userClaims = this.rbacService.getUserClaims(userId);
    if (userClaims) {
      for (const role of userClaims.roles) {
        if (accessControl.allowedRoles.includes(role)) {
          return { allowed: true };
        }
      }
    }
    
    return { allowed: false, error: 'Access denied' };
  }
  
  /**
   * 更新渠道访问控制
   * @param channelId 渠道ID
   * @param accessControl 访问控制配置
   */
  updateAccessControl(channelId: string, accessControl: Partial<ChannelAccessControl>): void {
    const currentControl = this.accessControls.get(channelId) || {
      channelId,
      allowedRoles: [],
      allowedUsers: [],
      dmPolicy: 'pairing',
      allowFrom: []
    };
    
    const updatedControl = {
      ...currentControl,
      ...accessControl
    };
    
    this.accessControls.set(channelId, updatedControl);
    logger.info(`Updated access control for channel: ${channelId}`);
  }
  
  /**
   * 获取渠道访问控制
   * @param channelId 渠道ID
   * @returns 访问控制配置
   */
  getAccessControl(channelId: string): ChannelAccessControl | undefined {
    return this.accessControls.get(channelId);
  }
  
  /**
   * 清理过期的认证状态
   */
  cleanupExpiredAuthStates(): void {
    const now = new Date();
    for (const [channelId, authState] of this.authStates.entries()) {
      if (authState.expiresAt && new Date(authState.expiresAt) < now) {
        this.authStates.delete(channelId);
        logger.info(`Removed expired auth state for channel: ${channelId}`);
      }
    }
  }
  
  // 具体渠道的认证实现
  private async authenticateWhatsapp(channel: ChannelConfig): Promise<boolean> {
    const { accountSid, authToken, phoneNumber } = channel.config;
    return !!(accountSid && authToken && phoneNumber);
  }
  
  private async authenticateTelegram(channel: ChannelConfig): Promise<boolean> {
    const { botToken } = channel.config;
    return !!botToken;
  }
  
  private async authenticateSlack(channel: ChannelConfig): Promise<boolean> {
    const { webhook, botToken } = channel.config;
    return !!(webhook || botToken);
  }
  
  private async authenticateDiscord(channel: ChannelConfig): Promise<boolean> {
    const { botToken, channelId } = channel.config;
    return !!(botToken && channelId);
  }
  
  private async authenticateWechat(channel: ChannelConfig): Promise<boolean> {
    const { appId, appSecret } = channel.config;
    return !!(appId && appSecret);
  }
  
  private async authenticateDingtalk(channel: ChannelConfig): Promise<boolean> {
    const { webhook } = channel.config;
    return !!webhook;
  }
  
  private async authenticateWecom(channel: ChannelConfig): Promise<boolean> {
    const { corpId, corpSecret } = channel.config;
    return !!(corpId && corpSecret);
  }
  
  private async authenticateLark(channel: ChannelConfig): Promise<boolean> {
    const { webhook } = channel.config;
    return !!webhook;
  }
}

export const chatClawChannelAuthService = ChatClawChannelAuthService.getInstance();