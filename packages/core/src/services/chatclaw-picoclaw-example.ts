/**
 * PicoClaw 集成使用示例
 * 展示如何使用 PicoClaw 集成功能
 */
import { chatClawPicoClawService } from './chatclaw-picoclaw-service';
import { logger } from '../utils/logger';

/**
 * PicoClaw 集成使用示例
 */
export class PicoClawExample {
  /**
   * 运行所有示例
   */
  static async runAllExamples(): Promise<void> {
    logger.info('=== PicoClaw 集成使用示例 ===');

    await this.example1_StartStop();
    await this.example2_ChannelOperations();
    await this.example3_ModelRouting();
    await this.example4_SkillExecution();
    await this.example5_CronJobs();
    await this.example6_StatusMonitoring();

    logger.info('=== 示例运行完成 ===');
  }

  /**
   * 示例 1: 启动和停止 PicoClaw
   */
  static async example1_StartStop(): Promise<void> {
    logger.info('\n示例 1: 启动和停止 PicoClaw');

    try {
      // 启动 PicoClaw
      logger.info('启动 PicoClaw...');
      const startResult = await chatClawPicoClawService.start();
      logger.info(`启动结果: ${startResult ? '成功' : '失败'}`);

      if (startResult) {
        // 等待几秒钟
        await new Promise(resolve => setTimeout(resolve, 2000));

        // 获取状态
        const status = chatClawPicoClawService.getStatus();
        logger.info(`当前状态: ${status.status}`);

        // 停止 PicoClaw
        logger.info('停止 PicoClaw...');
        const stopResult = await chatClawPicoClawService.stop();
        logger.info(`停止结果: ${stopResult ? '成功' : '失败'}`);
      }
    } catch (error) {
      logger.error('启动/停止示例失败:', error);
    }
  }

  /**
   * 示例 2: 通道操作
   */
  static async example2_ChannelOperations(): Promise<void> {
    logger.info('\n示例 2: 通道操作');

    try {
      // 获取通道状态
      const channelStatuses = chatClawPicoClawService.getAllChannelStatuses();
      logger.info(`通道数量: ${Object.keys(channelStatuses).length}`);

      // 打印通道状态
      for (const [channel, status] of Object.entries(channelStatuses)) {
        logger.info(`${channel}: ${status.status}`);
      }

      // 发送测试消息（如果通道已连接）
      const connectedChannels = Object.entries(channelStatuses)
        .filter(([_, status]) => status.status === 'connected')
        .map(([channel]) => channel);

      if (connectedChannels.length > 0) {
        const channel = connectedChannels[0];
        logger.info(`向通道 ${channel} 发送测试消息...`);
        const sendResult = await chatClawPicoClawService.sendMessage(
          channel, 
          'Hello from PicoClaw integration example!'
        );
        logger.info(`发送结果: ${sendResult ? '成功' : '失败'}`);
      }
    } catch (error) {
      logger.error('通道操作示例失败:', error);
    }
  }

  /**
   * 示例 3: 智能模型路由
   */
  static async example3_ModelRouting(): Promise<void> {
    logger.info('\n示例 3: 智能模型路由');

    try {
      // 测试简单查询
      const simpleMessage = 'Hello, how are you?';
      const simpleResult = chatClawPicoClawService.selectModel(simpleMessage);
      logger.info(`简单查询使用模型: ${simpleResult.modelType}`);
      logger.info(`复杂度: ${(simpleResult.complexity * 100).toFixed(1)}%`);

      // 测试复杂查询
      const complexMessage = 'Write a function in Python that sorts a list of dictionaries by a specific key, and also handles nested keys. Include error handling and docstrings.';
      const complexResult = chatClawPicoClawService.selectModel(complexMessage);
      logger.info(`复杂查询使用模型: ${complexResult.modelType}`);
      logger.info(`复杂度: ${(complexResult.complexity * 100).toFixed(1)}%`);

      // 执行模型查询
      logger.info('执行模型查询...');
      const queryResult = await chatClawPicoClawService.executeModelQuery('What is the capital of France?');
      if (queryResult) {
        logger.info(`查询结果: ${queryResult.modelType}`);
      }
    } catch (error) {
      logger.error('模型路由示例失败:', error);
    }
  }

  /**
   * 示例 4: 技能执行
   */
  static async example4_SkillExecution(): Promise<void> {
    logger.info('\n示例 4: 技能执行');

    try {
      // 加载技能
      logger.info('加载技能...');
      chatClawPicoClawService.loadSkills();

      // 获取技能列表
      const skills = chatClawPicoClawService.getAllSkills();
      logger.info(`技能数量: ${skills.length}`);

      // 打印技能信息
      skills.forEach(skill => {
        logger.info(`${skill.name} (${skill.id}) - ${skill.description}`);
      });

      // 执行技能（如果有技能）
      if (skills.length > 0) {
        const skill = skills[0];
        logger.info(`执行技能: ${skill.name}`);
        const result = await chatClawPicoClawService.executeSkill(skill.id, {});
        logger.info(`执行结果: ${result.success ? '成功' : '失败'}`);
      }
    } catch (error) {
      logger.error('技能执行示例失败:', error);
    }
  }

  /**
   * 示例 5: 定时任务
   */
  static async example5_CronJobs(): Promise<void> {
    logger.info('\n示例 5: 定时任务');

    try {
      // 验证 cron 表达式
      const validExpression = '0 * * * *'; // 每小时执行
      const invalidExpression = 'invalid';

      const validResult = chatClawPicoClawService.validateCronExpression(validExpression);
      const invalidResult = !chatClawPicoClawService.validateCronExpression(invalidExpression);

      logger.info(`验证有效表达式: ${validResult ? '通过' : '失败'}`);
      logger.info(`验证无效表达式: ${invalidResult ? '通过' : '失败'}`);

      // 获取下一次执行时间
      const nextRun = chatClawPicoClawService.getNextRunTime(validExpression);
      if (nextRun) {
        logger.info(`下一次执行时间: ${nextRun}`);
      }

      // 创建定时任务
      logger.info('创建定时任务...');
      const jobId = await chatClawPicoClawService.createCronJob(
        '0 * * * *', 
        '定时提醒：该喝水了！'
      );

      if (jobId) {
        logger.info(`创建任务成功，ID: ${jobId}`);

        // 获取任务信息
        const job = await chatClawPicoClawService.getCronJob(jobId);
        if (job) {
          logger.info(`任务信息: ${job.message}`);
        }

        // 删除任务
        const deleteResult = await chatClawPicoClawService.deleteCronJob(jobId);
        logger.info(`删除任务: ${deleteResult ? '成功' : '失败'}`);
      }
    } catch (error) {
      logger.error('定时任务示例失败:', error);
    }
  }

  /**
   * 示例 6: 状态监控
   */
  static async example6_StatusMonitoring(): Promise<void> {
    logger.info('\n示例 6: 状态监控');

    try {
      // 获取 PicoClaw 状态
      const status = chatClawPicoClawService.getStatus();
      logger.info(`PicoClaw 状态: ${status.status}`);
      if (status.memoryUsage) {
        logger.info(`内存使用: ${status.memoryUsage}MB`);
      }

      // 获取模型统计
      const modelStats = chatClawPicoClawService.getModelStats();
      logger.info('模型统计:', modelStats);

      // 获取技能统计
      const skillStats = chatClawPicoClawService.getSkillStats();
      logger.info('技能统计:', skillStats);

      // 获取定时任务统计
      const cronStats = chatClawPicoClawService.getCronJobStats();
      logger.info('定时任务统计:', cronStats);
    } catch (error) {
      logger.error('状态监控示例失败:', error);
    }
  }

  /**
   * 示例配置
   */
  static getExampleConfig() {
    return {
      enabled: true,
      gatewayUrl: 'http://localhost:18800',
      apiKey: 'YOUR_API_KEY',
      channels: {
        telegram: {
          enabled: true,
          token: 'YOUR_TELEGRAM_BOT_TOKEN'
        },
        discord: {
          enabled: false,
          token: 'YOUR_DISCORD_BOT_TOKEN'
        },
        slack: {
          enabled: false,
          token: 'YOUR_SLACK_BOT_TOKEN'
        }
      },
      models: {
        lightweight: {
          provider: 'deepseek',
          model: 'deepseek-chat',
          apiKey: 'YOUR_DEEPSEEK_API_KEY'
        },
        heavyweight: {
          provider: 'openai',
          model: 'gpt-3.5-turbo',
          apiKey: 'YOUR_OPENAI_API_KEY'
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
}

// 导出示例类
export const picoClawExample = new PicoClawExample();
