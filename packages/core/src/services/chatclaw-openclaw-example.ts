/**
 * OpenClaw 集成使用示例
 * 展示如何使用 OpenClaw 集成的所有功能
 */
import { logger } from '../utils/logger';
import { chatClawOpenClawService } from './chatclaw-openclaw-service';
import { chatClawOpenClawSkillService } from './chatclaw-openclaw-skill-service';
import { ChatClawGatewayService, chatClawGatewayService } from './chatclaw-gateway-service';
import { ChatClawAgentService } from './chatclaw-agent-service';
import { chatClawAgentService } from './chatclaw-multi-agent-service';
import { VoiceWakeService } from './voice-wake-service';
import { VoiceChatService } from './voice-chat-service';
import { ChatClawCanvasService, chatClawCanvasService } from './chatclaw-canvas-service';

export class OpenClawIntegrationExample {
  /**
   * 运行所有示例
   */
  static async runAllExamples(): Promise<void> {
    logger.info('=== OpenClaw 集成使用示例 ===\n');

    await this.example1_GatewayManagement();
    await this.example2_ChannelManagement();
    await this.example3_AgentManagement();
    await this.example4_SkillSystem();
    await this.example5_VoiceFeatures();
    await this.example6_CanvasFeatures();
    await this.example7_DMAccessControl();
    await this.example8_CompleteWorkflow();

    logger.info('\n=== 示例运行完成 ===');
  }

  /**
   * 示例 1: Gateway 管理
   */
  static async example1_GatewayManagement(): Promise<void> {
    logger.info('\n示例 1: Gateway 管理');
    
    try {
      // 主动刷新 Gateway 状态
      const status = await chatClawGatewayService.refreshStatus({
        includeHealthCheck: true
      });
      logger.info('Gateway 当前状态:', status);

      const diagnosis = await chatClawGatewayService.diagnoseGateway({
        includeDoctor: false
      });
      logger.info('Gateway 诊断结果:', diagnosis);
      
      // 获取 Gateway 配置
      const config = chatClawGatewayService.getConfig();
      logger.info('Gateway 配置:', config);
      
      logger.info('Gateway 管理示例完成');
    } catch (error) {
      logger.error('Gateway 管理示例失败:', error);
    }
  }

  /**
   * 示例 2: 通道管理
   */
  static async example2_ChannelManagement(): Promise<void> {
    logger.info('\n示例 2: 通道管理');
    
    try {
      // 获取所有 OpenClaw 通道
      const channels = chatClawOpenClawService.getAllOpenClawChannels();
      logger.info('OpenClaw 通道列表:');
      channels.forEach(channel => {
        logger.info(`  - ${channel.name} (${channel.type}): ${channel.enabled ? '已启用' : '已禁用'}`);
      });
      
      // 获取通道统计
      const stats = chatClawOpenClawService.getOpenClawChannelStats();
      logger.info('通道统计:', stats);
      
      // 获取 Telegram 通道的认证 URL
      try {
        const authUrl = chatClawOpenClawService.getChannelAuthUrl('openclaw-telegram');
        logger.info(`Telegram 认证 URL: ${authUrl}`);
      } catch (error) {
        logger.info('获取认证 URL 示例完成');
      }
      
      logger.info('通道管理示例完成');
    } catch (error) {
      logger.error('通道管理示例失败:', error);
    }
  }

  /**
   * 示例 3: 代理管理
   */
  static async example3_AgentManagement(): Promise<void> {
    logger.info('\n示例 3: 代理管理');
    
    try {
      // 获取所有代理
      const agents = chatClawAgentService.getAllAgents();
      logger.info('代理列表:');
      agents.forEach((agent: { id: string; agent: ChatClawAgentService }) => {
        const status = agent.agent.getStatus();
        logger.info(`  - ${agent.id}: ${status.toolCount} tools, ${status.memoryCount} memories`);
      });

      // 获取默认代理
      const defaultAgent = chatClawAgentService.getDefaultAgent();
      if (defaultAgent) {
        logger.info(`默认代理已获取`);
      }
      
      logger.info('代理管理示例完成');
    } catch (error) {
      logger.error('代理管理示例失败:', error);
    }
  }

  /**
   * 示例 4: 技能系统
   */
  static async example4_SkillSystem(): Promise<void> {
    logger.info('\n示例 4: 技能系统');
    
    try {
      // 获取所有技能
      const allSkills = chatClawOpenClawSkillService.getAllSkills();
      logger.info(`技能总数: ${allSkills.length}`);
      
      // 获取启用的技能
      const enabledSkills = chatClawOpenClawSkillService.getEnabledSkills();
      logger.info(`启用的技能数: ${enabledSkills.length}`);
      
      // 获取技能分类
      const categories = chatClawOpenClawSkillService.getSkillCategories();
      logger.info('技能分类:', categories);
      
      // 搜索技能
      const searchResults = chatClawOpenClawSkillService.searchSkills('天气');
      logger.info('搜索 "天气" 的结果:', searchResults.map(s => s.name));
      
      // 执行技能（天气技能）
      try {
        const weatherResult = await chatClawOpenClawSkillService.executeSkillTool(
          'weather',
          'getWeather',
          { location: '北京', unit: 'celsius' }
        );
        logger.info('天气技能执行结果:', weatherResult);
      } catch (error) {
        logger.info('天气技能执行示例完成');
      }
      
      // 获取技能统计
      const skillStats = chatClawOpenClawSkillService.getSkillStats();
      logger.info('技能统计:', skillStats);
      
      logger.info('技能系统示例完成');
    } catch (error) {
      logger.error('技能系统示例失败:', error);
    }
  }

  /**
   * 示例 5: 语音功能
   */
  static async example5_VoiceFeatures(): Promise<void> {
    logger.info('\n示例 5: 语音功能');
    
    try {
      logger.info('语音功能示例完成（需要实际的语音服务实例）');
    } catch (error) {
      logger.error('语音功能示例失败:', error);
    }
  }

  /**
   * 示例 6: 画布功能
   */
  static async example6_CanvasFeatures(): Promise<void> {
    logger.info('\n示例 6: 画布功能');
    
    try {
      // 获取画布状态
      const canvasState = chatClawCanvasService.getState();
      logger.info('画布状态:', canvasState);
      
      logger.info('画布功能示例完成');
    } catch (error) {
      logger.error('画布功能示例失败:', error);
    }
  }

  /**
   * 示例 7: DM 访问控制
   */
  static async example7_DMAccessControl(): Promise<void> {
    logger.info('\n示例 7: DM 访问控制');
    
    try {
      // 获取所有通道并检查 DM 策略
      const channels = chatClawOpenClawService.getAllOpenClawChannels();
      logger.info('通道 DM 策略:');
      channels.forEach(channel => {
        const dmPolicy = channel.config.dmPolicy || 'pairing';
        logger.info(`  - ${channel.name}: DM 策略 = ${dmPolicy}`);
      });
      
      // 验证通道认证
      channels.forEach(channel => {
        const authResult = chatClawOpenClawService.verifyChannelAuth(channel.id);
        logger.info(`  - ${channel.name} 认证: ${authResult.success ? '通过' : '失败'}`);
      });
      
      logger.info('DM 访问控制示例完成');
    } catch (error) {
      logger.error('DM 访问控制示例失败:', error);
    }
  }

  /**
   * 示例 8: 完整工作流程
   */
  static async example8_CompleteWorkflow(): Promise<void> {
    logger.info('\n示例 8: 完整工作流程');
    
    try {
      // 1. 检查 Gateway 状态
      logger.info('1. 检查 Gateway 状态...');
      const gatewayStatus = await chatClawGatewayService.refreshStatus({
        includeHealthCheck: true
      });
      logger.info('   Gateway 状态:', gatewayStatus);
      
      // 2. 获取可用的通道
      logger.info('\n2. 获取可用的通道...');
      const channels = chatClawOpenClawService.getAllOpenClawChannels();
      const enabledChannels = channels.filter(c => c.enabled);
      logger.info(`   启用的通道数: ${enabledChannels.length}`);
      
      // 3. 获取默认代理
      logger.info('\n3. 获取默认代理...');
      const defaultAgent = chatClawAgentService.getDefaultAgent();
      if (defaultAgent) {
        logger.info(`   默认代理已获取`);
      }
      
      // 4. 检查可用的技能
      logger.info('\n4. 检查可用的技能...');
      const enabledSkills = chatClawOpenClawSkillService.getEnabledSkills();
      logger.info(`   可用技能数: ${enabledSkills.length}`);
      
      // 5. 为通道分配代理
      if (enabledChannels.length > 0 && defaultAgent) {
        logger.info('\n5. 为通道分配代理...');
        const channel = enabledChannels[0];
        const status = chatClawAgentService.getStatus();
        const agentId = status.defaultAgentId || 'general';
        chatClawOpenClawService.assignAgentToChannel(channel.id, agentId);
        logger.info(`   已为 ${channel.name} 分配代理 ${agentId}`);
      }
      
      // 6. 清理过期的会话上下文
      logger.info('\n6. 清理过期的会话上下文...');
      chatClawOpenClawService.cleanupConversationContexts();
      logger.info('   清理完成');
      
      logger.info('\n完整工作流程示例完成');
    } catch (error) {
      logger.error('完整工作流程示例失败:', error);
    }
  }
}

// 导出示例类
export const openClawIntegrationExample = new OpenClawIntegrationExample();
