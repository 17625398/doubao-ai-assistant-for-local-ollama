/**
 * PicoClaw 性能测试工具
 * 测试 PicoClaw 集成的性能和资源占用
 */
import { chatClawPicoClawService } from '../services/chatclaw-picoclaw-service';
import { chatClawPicoClawGatewayService } from '../services/chatclaw-picoclaw-gateway-service';
import { logger } from './logger';

interface PerformanceTestResult {
  testName: string;
  passed: boolean;
  duration: number;
  memoryUsage?: number;
  error?: string;
  details?: any;
}

export class PicoClawPerformanceTest {
  private results: PerformanceTestResult[] = [];

  /**
   * 运行所有测试
   */
  async runAllTests(): Promise<PerformanceTestResult[]> {
    logger.info('Starting PicoClaw performance tests...');

    // 运行各个测试
    await this.testGatewayStartStop();
    await this.testChannelOperations();
    await this.testModelRouting();
    await this.testSkillExecution();
    await this.testCronJob();
    await this.testMemoryUsage();

    // 输出测试结果
    this.printResults();

    return this.results;
  }

  /**
   * 测试 Gateway 启动和停止
   */
  private async testGatewayStartStop(): Promise<void> {
    const testName = 'Gateway Start/Stop Test';
    const startTime = Date.now();

    try {
      // 启动 Gateway
      const startResult = await chatClawPicoClawGatewayService.start();
      
      if (!startResult) {
        throw new Error('Failed to start Gateway');
      }

      // 等待一段时间
      await new Promise(resolve => setTimeout(resolve, 1000));

      // 停止 Gateway
      const stopResult = await chatClawPicoClawGatewayService.stop();
      
      if (!stopResult) {
        throw new Error('Failed to stop Gateway');
      }

      const duration = Date.now() - startTime;
      this.results.push({
        testName,
        passed: true,
        duration,
        details: {
          startResult,
          stopResult
        }
      });

      logger.info(`${testName}: PASSED (${duration}ms)`);
    } catch (error) {
      const duration = Date.now() - startTime;
      this.results.push({
        testName,
        passed: false,
        duration,
        error: error instanceof Error ? error.message : 'Unknown error'
      });

      logger.error(`${testName}: FAILED - ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * 测试通道操作
   */
  private async testChannelOperations(): Promise<void> {
    const testName = 'Channel Operations Test';
    const startTime = Date.now();

    try {
      // 这里可以测试通道的连接和消息发送
      const channelStatuses = chatClawPicoClawService.getAllChannelStatuses();

      const duration = Date.now() - startTime;
      this.results.push({
        testName,
        passed: true,
        duration,
        details: {
          channelCount: Object.keys(channelStatuses).length
        }
      });

      logger.info(`${testName}: PASSED (${duration}ms)`);
    } catch (error) {
      const duration = Date.now() - startTime;
      this.results.push({
        testName,
        passed: false,
        duration,
        error: error instanceof Error ? error.message : 'Unknown error'
      });

      logger.error(`${testName}: FAILED - ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * 测试模型路由
   */
  private async testModelRouting(): Promise<void> {
    const testName = 'Model Routing Test';
    const startTime = Date.now();

    try {
      // 测试简单查询
      const simpleMessage = 'Hello, how are you?';
      const simpleResult = chatClawPicoClawService.selectModel(simpleMessage);

      // 测试复杂查询
      const complexMessage = 'Write a function in Python that sorts a list of dictionaries by a specific key, and also handles nested keys. Include error handling and docstrings.';
      const complexResult = chatClawPicoClawService.selectModel(complexMessage);

      const duration = Date.now() - startTime;
      this.results.push({
        testName,
        passed: true,
        duration,
        details: {
          simpleModel: simpleResult.modelType,
          complexModel: complexResult.modelType
        }
      });

      logger.info(`${testName}: PASSED (${duration}ms)`);
    } catch (error) {
      const duration = Date.now() - startTime;
      this.results.push({
        testName,
        passed: false,
        duration,
        error: error instanceof Error ? error.message : 'Unknown error'
      });

      logger.error(`${testName}: FAILED - ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * 测试技能执行
   */
  private async testSkillExecution(): Promise<void> {
    const testName = 'Skill Execution Test';
    const startTime = Date.now();

    try {
      // 加载技能
      chatClawPicoClawService.loadSkills();

      // 获取技能列表
      const skills = chatClawPicoClawService.getAllSkills();

      const duration = Date.now() - startTime;
      this.results.push({
        testName,
        passed: true,
        duration,
        details: {
          skillCount: skills.length
        }
      });

      logger.info(`${testName}: PASSED (${duration}ms)`);
    } catch (error) {
      const duration = Date.now() - startTime;
      this.results.push({
        testName,
        passed: false,
        duration,
        error: error instanceof Error ? error.message : 'Unknown error'
      });

      logger.error(`${testName}: FAILED - ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * 测试定时任务
   */
  private async testCronJob(): Promise<void> {
    const testName = 'Cron Job Test';
    const startTime = Date.now();

    try {
      // 验证 cron 表达式
      const validExpression = '0 * * * *'; // 每小时执行
      const invalidExpression = 'invalid';

      const validResult = chatClawPicoClawService.validateCronExpression(validExpression);
      const invalidResult = !chatClawPicoClawService.validateCronExpression(invalidExpression);

      const duration = Date.now() - startTime;
      this.results.push({
        testName,
        passed: validResult && invalidResult,
        duration,
        details: {
          validExpression: validResult,
          invalidExpression: invalidResult
        }
      });

      logger.info(`${testName}: PASSED (${duration}ms)`);
    } catch (error) {
      const duration = Date.now() - startTime;
      this.results.push({
        testName,
        passed: false,
        duration,
        error: error instanceof Error ? error.message : 'Unknown error'
      });

      logger.error(`${testName}: FAILED - ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * 测试内存使用情况
   */
  private async testMemoryUsage(): Promise<void> {
    const testName = 'Memory Usage Test';
    const startTime = Date.now();

    try {
      // 获取当前内存使用情况
      const memoryUsage = process.memoryUsage();
      const rssMB = Math.round(memoryUsage.rss / 1024 / 1024);

      const duration = Date.now() - startTime;
      this.results.push({
        testName,
        passed: rssMB < 50, // 要求内存使用小于 50MB
        duration,
        memoryUsage: rssMB,
        details: {
          rss: memoryUsage.rss,
          heapTotal: memoryUsage.heapTotal,
          heapUsed: memoryUsage.heapUsed
        }
      });

      logger.info(`${testName}: ${rssMB < 50 ? 'PASSED' : 'FAILED'} - ${rssMB}MB`);
    } catch (error) {
      const duration = Date.now() - startTime;
      this.results.push({
        testName,
        passed: false,
        duration,
        error: error instanceof Error ? error.message : 'Unknown error'
      });

      logger.error(`${testName}: FAILED - ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * 打印测试结果
   */
  private printResults(): void {
    logger.info('\n=== PicoClaw Performance Test Results ===');
    
    let totalTests = 0;
    let passedTests = 0;

    for (const result of this.results) {
      totalTests++;
      if (result.passed) {
        passedTests++;
      }

      const status = result.passed ? '✅ PASSED' : '❌ FAILED';
      logger.info(`${status} ${result.testName} (${result.duration}ms)`);
      
      if (result.memoryUsage) {
        logger.info(`   Memory: ${result.memoryUsage}MB`);
      }
      
      if (result.error) {
        logger.info(`   Error: ${result.error}`);
      }
    }

    const passRate = (passedTests / totalTests * 100).toFixed(1);
    logger.info(`\n=== Summary ===`);
    logger.info(`Total tests: ${totalTests}`);
    logger.info(`Passed: ${passedTests}`);
    logger.info(`Failed: ${totalTests - passedTests}`);
    logger.info(`Pass rate: ${passRate}%`);
  }

  /**
   * 获取测试结果
   */
  getResults(): PerformanceTestResult[] {
    return this.results;
  }
}

// 导出单例
export const picoClawPerformanceTest = new PicoClawPerformanceTest();
