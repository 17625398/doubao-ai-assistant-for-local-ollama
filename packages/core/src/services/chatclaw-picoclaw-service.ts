/**
 * PicoClaw 集成服务
 * 集成 PicoClaw 的核心功能到 ChatClaw 系统
 */
import { logger } from '../utils/logger';
import { eventBus } from '../utils/event-bus';
import { chatClawPicoClawGatewayService } from './chatclaw-picoclaw-gateway-service';
import { chatClawPicoClawChannelService } from './chatclaw-picoclaw-channel-service';
import { chatClawPicoClawModelRoutingService } from './chatclaw-picoclaw-model-routing-service';
import { chatClawPicoClawSkillService } from './chatclaw-picoclaw-skill-service';
import { chatClawPicoClawCronService } from './chatclaw-picoclaw-cron-service';

export interface PicoClawConfig {
  enabled: boolean;
  gatewayUrl: string;
  apiKey?: string;
  channels: {
    telegram?: {
      enabled: boolean;
      token: string;
    };
    discord?: {
      enabled: boolean;
      token: string;
    };
    slack?: {
      enabled: boolean;
      token: string;
    };
  };
  models: {
    lightweight: {
      provider: string;
      model: string;
      apiKey: string;
    };
    heavyweight: {
      provider: string;
      model: string;
      apiKey: string;
    };
  };
  skills: {
    enabled: boolean;
    directory: string;
  };
  cron: {
    enabled: boolean;
  };
}

export interface PicoClawStatus {
  status: 'running' | 'stopped' | 'error';
  memoryUsage?: number;
  uptime?: number;
  channels: {
    [key: string]: {
      status: 'connected' | 'disconnected';
      lastMessage?: string;
    };
  };
  models: {
    [key: string]: {
      status: 'available' | 'unavailable';
      lastUsed?: string;
    };
  };
}

export class ChatClawPicoClawService {
  private config: PicoClawConfig;
  private isRunning: boolean = false;
  private status: PicoClawStatus = {
    status: 'stopped',
    channels: {},
    models: {}
  };

  constructor() {
    this.config = this.getDefaultConfig();
    this.initialize();
  }

  /**
   * 初始化 PicoClaw 集成服务
   */
  private initialize(): void {
    logger.info('Initializing PicoClaw integration service');
    eventBus.on('chatclaw:config-updated', this.handleConfigUpdate.bind(this));
    
    // 初始化技能服务
    if (this.config.skills?.directory) {
      chatClawPicoClawSkillService.setSkillsDirectory(this.config.skills.directory);
    }
  }

  /**
   * 获取默认配置
   */
  private getDefaultConfig(): PicoClawConfig {
    return {
      enabled: false,
      gatewayUrl: 'http://localhost:18800',
      channels: {},
      models: {
        lightweight: {
          provider: 'deepseek',
          model: 'deepseek-chat',
          apiKey: ''
        },
        heavyweight: {
          provider: 'openai',
          model: 'gpt-3.5-turbo',
          apiKey: ''
        }
      },
      skills: {
        enabled: true,
        directory: './skills'
      },
      cron: {
        enabled: true
      }
    };
  }

  /**
   * 获取配置
   */
  getConfig(): PicoClawConfig {
    return { ...this.config };
  }

  /**
   * 更新配置
   */
  updateConfig(updates: Partial<PicoClawConfig>): void {
    this.config = { ...this.config, ...updates };
    logger.info('PicoClaw configuration updated');
    eventBus.emit('chatclaw:picoclaw-config-updated', this.config);
  }

  /**
   * 处理配置更新
   */
  private handleConfigUpdate(config: any): void {
    if (config.picoclaw) {
      this.updateConfig(config.picoclaw);
    }
  }

  /**
   * 启动 PicoClaw 服务
   */
  async start(): Promise<boolean> {
    if (!this.config.enabled) {
      logger.info('PicoClaw integration is disabled');
      return false;
    }

    try {
      logger.info('Starting PicoClaw integration service');
      
      // 启动 PicoClaw Gateway
      const gatewayStarted = await chatClawPicoClawGatewayService.start();
      if (!gatewayStarted) {
        logger.error('Failed to start PicoClaw Gateway');
        this.status = {
          ...this.status,
          status: 'error'
        };
        return false;
      }

      // 检查 PicoClaw Gateway 是否可访问
      const isGatewayAvailable = await this.checkGatewayHealth();
      if (!isGatewayAvailable) {
        logger.error('PicoClaw Gateway is not available');
        this.status = {
          ...this.status,
          status: 'error'
        };
        return false;
      }

      // 初始化通道
      await this.initializeChannels();

      // 初始化模型
      await this.initializeModels();

      this.isRunning = true;
      this.status = {
        ...this.status,
        status: 'running'
      };

      logger.info('PicoClaw integration service started successfully');
      eventBus.emit('chatclaw:picoclaw-started', this.status);
      
      return true;
    } catch (error) {
      logger.error('Failed to start PicoClaw integration service:', error);
      this.status = {
        ...this.status,
        status: 'error'
      };
      return false;
    }
  }

  /**
   * 停止 PicoClaw 服务
   */
  async stop(): Promise<boolean> {
    try {
      logger.info('Stopping PicoClaw integration service');
      
      // 清理资源
      await this.cleanupResources();

      // 停止 PicoClaw Gateway
      await chatClawPicoClawGatewayService.stop();

      this.isRunning = false;
      this.status = {
        ...this.status,
        status: 'stopped'
      };

      logger.info('PicoClaw integration service stopped successfully');
      eventBus.emit('chatclaw:picoclaw-stopped', null);
      
      return true;
    } catch (error) {
      logger.error('Failed to stop PicoClaw integration service:', error);
      return false;
    }
  }

  /**
   * 检查 PicoClaw Gateway 健康状态
   */
  private async checkGatewayHealth(): Promise<boolean> {
    try {
      const response = await fetch(`${this.config.gatewayUrl}/health`);
      return response.ok;
    } catch (error) {
      logger.error('Failed to check PicoClaw Gateway health:', error);
      return false;
    }
  }

  /**
   * 初始化通道
   */
  private async initializeChannels(): Promise<void> {
    // 设置通道服务的 Gateway URL
    chatClawPicoClawChannelService.setGatewayUrl(this.config.gatewayUrl);
    
    // 初始化各通道
    const channels = Object.keys(this.config.channels);
    for (const channel of channels) {
      const channelConfig = this.config.channels[channel as keyof typeof this.config.channels];
      if (channelConfig?.enabled) {
        try {
          await chatClawPicoClawChannelService.connectChannel(channel);
        } catch (error) {
          logger.error(`Failed to initialize channel ${channel}:`, error);
        }
      }
    }
  }

  /**
   * 清理通道资源
   */
  private async cleanupChannels(): Promise<void> {
    const channels = Object.keys(this.config.channels);
    for (const channel of channels) {
      try {
        await chatClawPicoClawChannelService.disconnectChannel(channel);
      } catch (error) {
        logger.error(`Failed to cleanup channel ${channel}:`, error);
      }
    }
  }

  /**
   * 初始化模型
   */
  private async initializeModels(): Promise<void> {
    // 设置模型路由服务的 Gateway URL
    chatClawPicoClawModelRoutingService.setGatewayUrl(this.config.gatewayUrl);
    
    // 更新模型配置
    chatClawPicoClawModelRoutingService.updateModels(this.config.models);
    
    logger.info('Initializing models');
  }

  /**
   * 清理资源
   */
  private async cleanupResources(): Promise<void> {
    // 清理通道资源
    await this.cleanupChannels();
    logger.info('Cleaning up PicoClaw resources');
  }

  /**
   * 获取 PicoClaw 状态
   */
  getStatus(): PicoClawStatus {
    const gatewayStatus = chatClawPicoClawGatewayService.getStatus();
    const channelStatuses = chatClawPicoClawChannelService.getAllChannelStatuses();
    
    return {
      ...this.status,
      memoryUsage: gatewayStatus.memoryUsage,
      channels: {
        ...this.status.channels,
        ...channelStatuses,
        gateway: {
          status: gatewayStatus.status === 'running' ? 'connected' : 'disconnected',
          lastMessage: gatewayStatus.status === 'running' ? 'Gateway is running' : 'Gateway is not running'
        }
      }
    };
  }

  /**
   * 发送消息到通道
   */
  async sendMessage(channel: string, message: string, options?: Record<string, any>): Promise<boolean> {
    try {
      // 使用通道服务发送消息
      return await chatClawPicoClawChannelService.sendMessage(channel, message, options);
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
      // 使用通道服务发送媒体消息
      return await chatClawPicoClawChannelService.sendMedia(channel, mediaUrl, caption);
    } catch (error) {
      logger.error(`Failed to send media to channel ${channel}:`, error);
      return false;
    }
  }

  /**
   * 获取通道状态
   */
  getChannelStatus(channel: string) {
    return chatClawPicoClawChannelService.getChannelStatus(channel);
  }

  /**
   * 获取所有通道状态
   */
  getAllChannelStatuses() {
    return chatClawPicoClawChannelService.getAllChannelStatuses();
  }

  /**
   * 刷新通道状态
   */
  async refreshChannelStatus(channel: string) {
    return await chatClawPicoClawChannelService.refreshChannelStatus(channel);
  }

  /**
   * 刷新所有通道状态
   */
  async refreshAllChannelStatuses() {
    await chatClawPicoClawChannelService.refreshAllChannelStatuses();
  }

  // ==================== 模型路由相关方法 ====================

  /**
   * 选择合适的模型
   */
  selectModel(message: string) {
    return chatClawPicoClawModelRoutingService.selectModel(message);
  }

  /**
   * 执行模型查询
   */
  async executeModelQuery(message: string, context?: any[]) {
    return await chatClawPicoClawModelRoutingService.executeQuery(message, context);
  }

  /**
   * 获取模型统计信息
   */
  getModelStats(modelType?: string) {
    return chatClawPicoClawModelRoutingService.getModelStats(modelType);
  }

  /**
   * 获取模型配置
   */
  getModels() {
    return chatClawPicoClawModelRoutingService.getModels();
  }

  /**
   * 设置复杂度阈值
   */
  setComplexityThreshold(threshold: number) {
    chatClawPicoClawModelRoutingService.setComplexityThreshold(threshold);
  }

  /**
   * 获取复杂度阈值
   */
  getComplexityThreshold() {
    return chatClawPicoClawModelRoutingService.getComplexityThreshold();
  }

  /**
   * 验证模型配置
   */
  validateModelConfig(modelType: 'lightweight' | 'heavyweight') {
    return chatClawPicoClawModelRoutingService.validateModelConfig(modelType);
  }

  /**
   * 验证所有模型配置
   */
  validateAllModelConfigs() {
    return chatClawPicoClawModelRoutingService.validateAllModelConfigs();
  }

  /**
   * 重置模型统计信息
   */
  resetModelStats() {
    chatClawPicoClawModelRoutingService.resetModelStats();
  }

  /**
   * 执行技能
   */
  async executeSkill(skillId: string, params: any): Promise<any> {
    try {
      // 使用技能服务执行技能
      return await chatClawPicoClawSkillService.executeSkill(skillId, params);
    } catch (error) {
      logger.error(`Failed to execute skill ${skillId}:`, error);
      return null;
    }
  }

  // ==================== 技能相关方法 ====================

  /**
   * 获取所有技能
   */
  getAllSkills() {
    return chatClawPicoClawSkillService.getAllSkills();
  }

  /**
   * 获取启用的技能
   */
  getEnabledSkills() {
    return chatClawPicoClawSkillService.getEnabledSkills();
  }

  /**
   * 获取技能
   */
  getSkill(skillId: string) {
    return chatClawPicoClawSkillService.getSkill(skillId);
  }

  /**
   * 启用/禁用技能
   */
  setSkillEnabled(skillId: string, enabled: boolean) {
    return chatClawPicoClawSkillService.setSkillEnabled(skillId, enabled);
  }

  /**
   * 搜索技能
   */
  searchSkills(query: string) {
    return chatClawPicoClawSkillService.searchSkills(query);
  }

  /**
   * 按分类获取技能
   */
  getSkillsByCategory(category: string) {
    return chatClawPicoClawSkillService.getSkillsByCategory(category);
  }

  /**
   * 获取技能分类
   */
  getSkillCategories() {
    return chatClawPicoClawSkillService.getSkillCategories();
  }

  /**
   * 创建技能
   */
  createSkill(skillConfig: any) {
    return chatClawPicoClawSkillService.createSkill(skillConfig);
  }

  /**
   * 更新技能
   */
  updateSkill(skillId: string, updates: any) {
    return chatClawPicoClawSkillService.updateSkill(skillId, updates);
  }

  /**
   * 删除技能
   */
  deleteSkill(skillId: string) {
    return chatClawPicoClawSkillService.deleteSkill(skillId);
  }

  /**
   * 获取技能统计信息
   */
  getSkillStats() {
    return chatClawPicoClawSkillService.getSkillStats();
  }

  /**
   * 加载技能
   */
  loadSkills() {
    chatClawPicoClawSkillService.loadSkills();
  }

  /**
   * 创建定时任务
   */
  async createCronJob(schedule: string, message: string, channel?: string): Promise<string | null> {
    try {
      // 使用定时任务服务创建任务
      const job = await chatClawPicoClawCronService.createJob(schedule, message, channel);
      return job?.id || null;
    } catch (error) {
      logger.error('Failed to create cron job:', error);
      return null;
    }
  }

  // ==================== 定时任务相关方法 ====================

  /**
   * 获取所有定时任务
   */
  async getAllCronJobs() {
    return await chatClawPicoClawCronService.getAllJobs();
  }

  /**
   * 获取定时任务
   */
  async getCronJob(jobId: string) {
    return await chatClawPicoClawCronService.getJob(jobId);
  }

  /**
   * 更新定时任务
   */
  async updateCronJob(jobId: string, updates: any) {
    return await chatClawPicoClawCronService.updateJob(jobId, updates);
  }

  /**
   * 删除定时任务
   */
  async deleteCronJob(jobId: string) {
    return await chatClawPicoClawCronService.deleteJob(jobId);
  }

  /**
   * 启用/禁用定时任务
   */
  async setCronJobEnabled(jobId: string, enabled: boolean) {
    return await chatClawPicoClawCronService.setJobEnabled(jobId, enabled);
  }

  /**
   * 立即执行定时任务
   */
  async executeCronJob(jobId: string) {
    return await chatClawPicoClawCronService.executeJob(jobId);
  }

  /**
   * 获取任务执行记录
   */
  getCronJobExecutions(jobId: string) {
    return chatClawPicoClawCronService.getJobExecutions(jobId);
  }

  /**
   * 验证 cron 表达式
   */
  validateCronExpression(expression: string) {
    return chatClawPicoClawCronService.validateCronExpression(expression);
  }

  /**
   * 解析 cron 表达式，返回下一次执行时间
   */
  getNextRunTime(cronExpression: string) {
    return chatClawPicoClawCronService.getNextRunTime(cronExpression);
  }

  /**
   * 获取任务统计信息
   */
  getCronJobStats() {
    return chatClawPicoClawCronService.getJobStats();
  }

  /**
   * 清理任务执行记录
   */
  cleanupCronJobExecutions(jobId: string, keepCount?: number) {
    chatClawPicoClawCronService.cleanupJobExecutions(jobId, keepCount);
  }

  /**
   * 清理所有任务执行记录
   */
  cleanupAllCronJobExecutions(keepCount?: number) {
    chatClawPicoClawCronService.cleanupAllJobExecutions(keepCount);
  }

  /**
   * 重载 PicoClaw 配置
   */
  async reloadConfig(): Promise<boolean> {
    try {
      const response = await fetch(`${this.config.gatewayUrl}/reload`, {
        method: 'POST',
        headers: {
          'Authorization': this.config.apiKey ? `Bearer ${this.config.apiKey}` : ''
        }
      });
      
      return response.ok;
    } catch (error) {
      logger.error('Failed to reload PicoClaw config:', error);
      return false;
    }
  }

  /**
   * 检查是否运行中
   */
  isServiceRunning(): boolean {
    return this.isRunning;
  }
}

// 导出单例
export const chatClawPicoClawService = new ChatClawPicoClawService();
