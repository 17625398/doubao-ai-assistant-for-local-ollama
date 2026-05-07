/**
 * ChatClaw 渠道入职服务
 * 处理新渠道的入职流程
 */

import { logger } from '../utils/logger';
import { chatClawChannelConfigService } from './chatclaw-channel-config-service';
import { chatClawChannelConnectorService } from './chatclaw-channel-connector-service';
import { ChannelConfig, CommunicationChannel } from './chatclaw-communication-service';

export interface OnboardingStep {
  id: string;
  name: string;
  description: string;
  fields: OnboardingField[];
  validate: (data: any) => { valid: boolean; errors: string[] };
}

export interface OnboardingField {
  id: string;
  name: string;
  type: 'text' | 'password' | 'select' | 'checkbox' | 'file';
  required: boolean;
  placeholder?: string;
  options?: { value: string; label: string }[];
  defaultValue?: any;
  helpText?: string;
}

export interface OnboardingState {
  channelType: CommunicationChannel | null;
  currentStep: number;
  steps: OnboardingStep[];
  formData: Record<string, any>;
  errors: Record<string, string[]>;
  isLoading: boolean;
  success: boolean;
  channelId: string | null;
}

export class ChatClawChannelOnboardingService {
  private static instance: ChatClawChannelOnboardingService;

  private constructor() {
    this.initialize();
  }

  static getInstance(): ChatClawChannelOnboardingService {
    if (!ChatClawChannelOnboardingService.instance) {
      ChatClawChannelOnboardingService.instance = new ChatClawChannelOnboardingService();
    }
    return ChatClawChannelOnboardingService.instance;
  }

  /**
   * 初始化服务
   */
  private initialize(): void {
    logger.info('ChatClaw Channel Onboarding Service initialized');
  }

  /**
   * 获取渠道类型列表
   */
  getChannelTypes(): { value: CommunicationChannel; label: string }[] {
    return [
      { value: 'whatsapp', label: 'WhatsApp' },
      { value: 'telegram', label: 'Telegram' },
      { value: 'slack', label: 'Slack' },
      { value: 'discord', label: 'Discord' },
      { value: 'webhook', label: 'Webhook' },
      { value: 'wechat', label: 'WeChat' },
      { value: 'dingtalk', label: 'DingTalk' },
      { value: 'wecom', label: 'WeCom' },
      { value: 'lark', label: 'Lark' }
    ];
  }

  /**
   * 获取渠道入职步骤
   */
  getOnboardingSteps(channelType: CommunicationChannel): OnboardingStep[] {
    switch (channelType) {
      case 'whatsapp':
        return [
          {
            id: 'basic',
            name: '基本信息',
            description: '填写渠道基本信息',
            fields: [
              {
                id: 'name',
                name: '渠道名称',
                type: 'text',
                required: true,
                placeholder: '请输入渠道名称',
                helpText: '用于标识此渠道的名称'
              },
              {
                id: 'description',
                name: '渠道描述',
                type: 'text',
                required: false,
                placeholder: '请输入渠道描述',
                helpText: '对渠道的简要描述'
              }
            ],
            validate: (data) => {
              const errors: string[] = [];
              if (!data.name) errors.push('渠道名称不能为空');
              return { valid: errors.length === 0, errors };
            }
          },
          {
            id: 'credentials',
            name: '认证信息',
            description: '填写 WhatsApp 认证信息',
            fields: [
              {
                id: 'accountSid',
                name: 'Account SID',
                type: 'text',
                required: true,
                placeholder: '请输入 Account SID',
                helpText: '从 Twilio 控制台获取'
              },
              {
                id: 'authToken',
                name: 'Auth Token',
                type: 'password',
                required: true,
                placeholder: '请输入 Auth Token',
                helpText: '从 Twilio 控制台获取'
              },
              {
                id: 'phoneNumber',
                name: '电话号码',
                type: 'text',
                required: true,
                placeholder: '请输入电话号码',
                helpText: 'WhatsApp 电话号码，格式为 +1234567890'
              }
            ],
            validate: (data) => {
              const errors: string[] = [];
              if (!data.accountSid) errors.push('Account SID 不能为空');
              if (!data.authToken) errors.push('Auth Token 不能为空');
              if (!data.phoneNumber) errors.push('电话号码不能为空');
              return { valid: errors.length === 0, errors };
            }
          },
          {
            id: 'settings',
            name: '渠道设置',
            description: '配置渠道设置',
            fields: [
              {
                id: 'dmPolicy',
                name: 'DM 策略',
                type: 'select',
                required: true,
                defaultValue: 'pairing',
                options: [
                  { value: 'open', label: '开放' },
                  { value: 'pairing', label: '配对' },
                  { value: 'closed', label: '关闭' }
                ],
                helpText: '控制如何处理来自未知发送者的消息'
              },
              {
                id: 'allowFrom',
                name: '允许的发送者',
                type: 'text',
                required: false,
                placeholder: '请输入允许的发送者 ID，多个以逗号分隔',
                helpText: '仅允许指定的发送者发送消息'
              }
            ],
            validate: (data) => {
              const errors: string[] = [];
              if (!data.dmPolicy) errors.push('DM 策略不能为空');
              return { valid: errors.length === 0, errors };
            }
          },
          {
            id: 'test',
            name: '测试连接',
            description: '测试渠道连接',
            fields: [],
            validate: () => ({ valid: true, errors: [] })
          }
        ];
      case 'telegram':
        return [
          {
            id: 'basic',
            name: '基本信息',
            description: '填写渠道基本信息',
            fields: [
              {
                id: 'name',
                name: '渠道名称',
                type: 'text',
                required: true,
                placeholder: '请输入渠道名称',
                helpText: '用于标识此渠道的名称'
              },
              {
                id: 'description',
                name: '渠道描述',
                type: 'text',
                required: false,
                placeholder: '请输入渠道描述',
                helpText: '对渠道的简要描述'
              }
            ],
            validate: (data) => {
              const errors: string[] = [];
              if (!data.name) errors.push('渠道名称不能为空');
              return { valid: errors.length === 0, errors };
            }
          },
          {
            id: 'credentials',
            name: '认证信息',
            description: '填写 Telegram 认证信息',
            fields: [
              {
                id: 'botToken',
                name: 'Bot Token',
                type: 'password',
                required: true,
                placeholder: '请输入 Bot Token',
                helpText: '从 @BotFather 获取'
              }
            ],
            validate: (data) => {
              const errors: string[] = [];
              if (!data.botToken) errors.push('Bot Token 不能为空');
              return { valid: errors.length === 0, errors };
            }
          },
          {
            id: 'settings',
            name: '渠道设置',
            description: '配置渠道设置',
            fields: [
              {
                id: 'dmPolicy',
                name: 'DM 策略',
                type: 'select',
                required: true,
                defaultValue: 'pairing',
                options: [
                  { value: 'open', label: '开放' },
                  { value: 'pairing', label: '配对' },
                  { value: 'closed', label: '关闭' }
                ],
                helpText: '控制如何处理来自未知发送者的消息'
              },
              {
                id: 'allowFrom',
                name: '允许的发送者',
                type: 'text',
                required: false,
                placeholder: '请输入允许的发送者 ID，多个以逗号分隔',
                helpText: '仅允许指定的发送者发送消息'
              }
            ],
            validate: (data) => {
              const errors: string[] = [];
              if (!data.dmPolicy) errors.push('DM 策略不能为空');
              return { valid: errors.length === 0, errors };
            }
          },
          {
            id: 'test',
            name: '测试连接',
            description: '测试渠道连接',
            fields: [],
            validate: () => ({ valid: true, errors: [] })
          }
        ];
      case 'slack':
        return [
          {
            id: 'basic',
            name: '基本信息',
            description: '填写渠道基本信息',
            fields: [
              {
                id: 'name',
                name: '渠道名称',
                type: 'text',
                required: true,
                placeholder: '请输入渠道名称',
                helpText: '用于标识此渠道的名称'
              },
              {
                id: 'description',
                name: '渠道描述',
                type: 'text',
                required: false,
                placeholder: '请输入渠道描述',
                helpText: '对渠道的简要描述'
              }
            ],
            validate: (data) => {
              const errors: string[] = [];
              if (!data.name) errors.push('渠道名称不能为空');
              return { valid: errors.length === 0, errors };
            }
          },
          {
            id: 'credentials',
            name: '认证信息',
            description: '填写 Slack 认证信息',
            fields: [
              {
                id: 'botToken',
                name: 'Bot Token',
                type: 'password',
                required: true,
                placeholder: '请输入 Bot Token',
                helpText: '从 Slack App 管理页面获取'
              }
            ],
            validate: (data) => {
              const errors: string[] = [];
              if (!data.botToken) errors.push('Bot Token 不能为空');
              return { valid: errors.length === 0, errors };
            }
          },
          {
            id: 'settings',
            name: '渠道设置',
            description: '配置渠道设置',
            fields: [
              {
                id: 'dmPolicy',
                name: 'DM 策略',
                type: 'select',
                required: true,
                defaultValue: 'pairing',
                options: [
                  { value: 'open', label: '开放' },
                  { value: 'pairing', label: '配对' },
                  { value: 'closed', label: '关闭' }
                ],
                helpText: '控制如何处理来自未知发送者的消息'
              },
              {
                id: 'allowFrom',
                name: '允许的发送者',
                type: 'text',
                required: false,
                placeholder: '请输入允许的发送者 ID，多个以逗号分隔',
                helpText: '仅允许指定的发送者发送消息'
              }
            ],
            validate: (data) => {
              const errors: string[] = [];
              if (!data.dmPolicy) errors.push('DM 策略不能为空');
              return { valid: errors.length === 0, errors };
            }
          },
          {
            id: 'test',
            name: '测试连接',
            description: '测试渠道连接',
            fields: [],
            validate: () => ({ valid: true, errors: [] })
          }
        ];
      case 'discord':
        return [
          {
            id: 'basic',
            name: '基本信息',
            description: '填写渠道基本信息',
            fields: [
              {
                id: 'name',
                name: '渠道名称',
                type: 'text',
                required: true,
                placeholder: '请输入渠道名称',
                helpText: '用于标识此渠道的名称'
              },
              {
                id: 'description',
                name: '渠道描述',
                type: 'text',
                required: false,
                placeholder: '请输入渠道描述',
                helpText: '对渠道的简要描述'
              }
            ],
            validate: (data) => {
              const errors: string[] = [];
              if (!data.name) errors.push('渠道名称不能为空');
              return { valid: errors.length === 0, errors };
            }
          },
          {
            id: 'credentials',
            name: '认证信息',
            description: '填写 Discord 认证信息',
            fields: [
              {
                id: 'botToken',
                name: 'Bot Token',
                type: 'password',
                required: true,
                placeholder: '请输入 Bot Token',
                helpText: '从 Discord 开发者门户获取'
              },
              {
                id: 'channelId',
                name: 'Channel ID',
                type: 'text',
                required: true,
                placeholder: '请输入 Channel ID',
                helpText: 'Discord 频道 ID'
              }
            ],
            validate: (data) => {
              const errors: string[] = [];
              if (!data.botToken) errors.push('Bot Token 不能为空');
              if (!data.channelId) errors.push('Channel ID 不能为空');
              return { valid: errors.length === 0, errors };
            }
          },
          {
            id: 'settings',
            name: '渠道设置',
            description: '配置渠道设置',
            fields: [
              {
                id: 'dmPolicy',
                name: 'DM 策略',
                type: 'select',
                required: true,
                defaultValue: 'pairing',
                options: [
                  { value: 'open', label: '开放' },
                  { value: 'pairing', label: '配对' },
                  { value: 'closed', label: '关闭' }
                ],
                helpText: '控制如何处理来自未知发送者的消息'
              },
              {
                id: 'allowFrom',
                name: '允许的发送者',
                type: 'text',
                required: false,
                placeholder: '请输入允许的发送者 ID，多个以逗号分隔',
                helpText: '仅允许指定的发送者发送消息'
              }
            ],
            validate: (data) => {
              const errors: string[] = [];
              if (!data.dmPolicy) errors.push('DM 策略不能为空');
              return { valid: errors.length === 0, errors };
            }
          },
          {
            id: 'test',
            name: '测试连接',
            description: '测试渠道连接',
            fields: [],
            validate: () => ({ valid: true, errors: [] })
          }
        ];
      default:
        return [
          {
            id: 'basic',
            name: '基本信息',
            description: '填写渠道基本信息',
            fields: [
              {
                id: 'name',
                name: '渠道名称',
                type: 'text',
                required: true,
                placeholder: '请输入渠道名称',
                helpText: '用于标识此渠道的名称'
              },
              {
                id: 'description',
                name: '渠道描述',
                type: 'text',
                required: false,
                placeholder: '请输入渠道描述',
                helpText: '对渠道的简要描述'
              }
            ],
            validate: (data) => {
              const errors: string[] = [];
              if (!data.name) errors.push('渠道名称不能为空');
              return { valid: errors.length === 0, errors };
            }
          },
          {
            id: 'test',
            name: '测试连接',
            description: '测试渠道连接',
            fields: [],
            validate: () => ({ valid: true, errors: [] })
          }
        ];
    }
  }

  /**
   * 创建渠道
   */
  async createChannel(channelType: CommunicationChannel, formData: Record<string, any>): Promise<{ success: boolean; channelId?: string; error?: string }> {
    try {
      // 构建渠道配置
      const channelConfig: ChannelConfig = {
        id: `channel_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        name: formData.name,
        type: channelType,
        enabled: false,
        config: {
          ...formData,
          allowFrom: formData.allowFrom ? formData.allowFrom.split(',').map((item: string) => item.trim()) : []
        },
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      // 验证渠道配置
      const validation = chatClawChannelConfigService.validateChannelConfig(channelConfig);
      if (!validation.valid) {
        return { success: false, error: validation.errors.join(', ') };
      }

      // 保存渠道配置
      const saved = await chatClawChannelConfigService.saveChannel(channelConfig);
      if (!saved) {
        return { success: false, error: '保存渠道配置失败' };
      }

      return { success: true, channelId: channelConfig.id };
    } catch (error) {
      logger.error('Failed to create channel:', error);
      return { success: false, error: '创建渠道失败' };
    }
  }

  /**
   * 测试渠道连接
   */
  async testChannelConnection(channelId: string): Promise<{ success: boolean; error?: string }> {
    try {
      // 连接渠道
      const connected = await chatClawChannelConnectorService.connectChannel(channelId);
      if (!connected) {
        return { success: false, error: '连接渠道失败' };
      }

      // 断开连接
      await chatClawChannelConnectorService.disconnectChannel(channelId);

      return { success: true };
    } catch (error) {
      logger.error('Failed to test channel connection:', error);
      return { success: false, error: '测试渠道连接失败' };
    }
  }

  /**
   * 启用渠道
   */
  async enableChannel(channelId: string): Promise<{ success: boolean; error?: string }> {
    try {
      // 连接并启用渠道
      const connected = await chatClawChannelConnectorService.connectChannel(channelId);
      if (!connected) {
        return { success: false, error: '连接渠道失败' };
      }

      return { success: true };
    } catch (error) {
      logger.error('Failed to enable channel:', error);
      return { success: false, error: '启用渠道失败' };
    }
  }
}

// 导出单例
export const chatClawChannelOnboardingService = ChatClawChannelOnboardingService.getInstance();
