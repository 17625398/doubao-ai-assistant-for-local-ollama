/**
 * PicoClaw 定时任务服务
 * 管理和执行 PicoClaw 定时任务，支持 cron 表达式
 */
import { logger } from '../utils/logger';
import { eventBus } from '../utils/event-bus';

export interface CronJob {
  id: string;
  schedule: string; // cron 表达式
  message: string;
  channel?: string; // 可选的通道
  enabled: boolean;
  lastRun?: string;
  nextRun?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CronJobExecution {
  jobId: string;
  timestamp: string;
  success: boolean;
  error?: string;
  output?: any;
}

export class ChatClawPicoClawCronService {
  private jobs: Map<string, CronJob> = new Map();
  private jobExecutions: Map<string, CronJobExecution[]> = new Map();
  private gatewayUrl: string = 'http://localhost:18800';

  constructor() {
    this.initialize();
  }

  /**
   * 初始化定时任务服务
   */
  private initialize(): void {
    logger.info('Initializing PicoClaw cron service');
    eventBus.on('chatclaw:picoclaw-config-updated', this.handleConfigUpdate.bind(this));
  }

  /**
   * 处理配置更新
   */
  private handleConfigUpdate(config: any): void {
    if (config.gatewayUrl) {
      this.gatewayUrl = config.gatewayUrl;
    }
  }

  /**
   * 创建定时任务
   */
  async createJob(schedule: string, message: string, channel?: string): Promise<CronJob | null> {
    try {
      const jobId = `cron_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      
      const job: CronJob = {
        id: jobId,
        schedule,
        message,
        channel,
        enabled: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      // 调用 PicoClaw API 创建任务
      const response = await fetch(`${this.gatewayUrl}/api/cron/create`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(job)
      });

      if (response.ok) {
        const createdJob = await response.json();
        this.jobs.set(jobId, createdJob);
        logger.info(`Created cron job: ${jobId} - ${message}`);
        return createdJob;
      } else {
        const errorData = await response.json().catch(() => ({}));
        const errorMessage = errorData.message || 'Failed to create cron job';
        logger.error(`Failed to create cron job: ${errorMessage}`);
        return null;
      }
    } catch (error) {
      logger.error('Failed to create cron job:', error);
      return null;
    }
  }

  /**
   * 获取所有定时任务
   */
  async getAllJobs(): Promise<CronJob[]> {
    try {
      // 调用 PicoClaw API 获取任务列表
      const response = await fetch(`${this.gatewayUrl}/api/cron/list`);
      
      if (response.ok) {
        const jobs = await response.json();
        // 更新本地缓存
        jobs.forEach((job: CronJob) => {
          this.jobs.set(job.id, job);
        });
        return jobs;
      } else {
        // 返回本地缓存的任务
        return Array.from(this.jobs.values());
      }
    } catch (error) {
      logger.error('Failed to get cron jobs:', error);
      return Array.from(this.jobs.values());
    }
  }

  /**
   * 获取定时任务
   */
  async getJob(jobId: string): Promise<CronJob | null> {
    try {
      // 调用 PicoClaw API 获取任务
      const response = await fetch(`${this.gatewayUrl}/api/cron/${jobId}`);
      
      if (response.ok) {
        const job = await response.json();
        this.jobs.set(jobId, job);
        return job;
      } else {
        // 返回本地缓存的任务
        return this.jobs.get(jobId) || null;
      }
    } catch (error) {
      logger.error(`Failed to get cron job ${jobId}:`, error);
      return this.jobs.get(jobId) || null;
    }
  }

  /**
   * 更新定时任务
   */
  async updateJob(jobId: string, updates: Partial<CronJob>): Promise<CronJob | null> {
    try {
      // 调用 PicoClaw API 更新任务
      const response = await fetch(`${this.gatewayUrl}/api/cron/${jobId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(updates)
      });

      if (response.ok) {
        const updatedJob = await response.json();
        this.jobs.set(jobId, updatedJob);
        logger.info(`Updated cron job: ${jobId}`);
        return updatedJob;
      } else {
        const errorData = await response.json().catch(() => ({}));
        const errorMessage = errorData.message || 'Failed to update cron job';
        logger.error(`Failed to update cron job ${jobId}: ${errorMessage}`);
        return null;
      }
    } catch (error) {
      logger.error(`Failed to update cron job ${jobId}:`, error);
      return null;
    }
  }

  /**
   * 删除定时任务
   */
  async deleteJob(jobId: string): Promise<boolean> {
    try {
      // 调用 PicoClaw API 删除任务
      const response = await fetch(`${this.gatewayUrl}/api/cron/${jobId}`, {
        method: 'DELETE'
      });

      if (response.ok) {
        this.jobs.delete(jobId);
        this.jobExecutions.delete(jobId);
        logger.info(`Deleted cron job: ${jobId}`);
        return true;
      } else {
        const errorData = await response.json().catch(() => ({}));
        const errorMessage = errorData.message || 'Failed to delete cron job';
        logger.error(`Failed to delete cron job ${jobId}: ${errorMessage}`);
        return false;
      }
    } catch (error) {
      logger.error(`Failed to delete cron job ${jobId}:`, error);
      return false;
    }
  }

  /**
   * 启用/禁用定时任务
   */
  async setJobEnabled(jobId: string, enabled: boolean): Promise<boolean> {
    const result = await this.updateJob(jobId, { enabled });
    return result !== null;
  }

  /**
   * 立即执行定时任务
   */
  async executeJob(jobId: string): Promise<CronJobExecution | null> {
    try {
      const job = this.jobs.get(jobId);
      if (!job) {
        logger.warn(`Cron job ${jobId} not found`);
        return null;
      }

      // 调用 PicoClaw API 执行任务
      const response = await fetch(`${this.gatewayUrl}/api/cron/${jobId}/execute`, {
        method: 'POST'
      });

      if (response.ok) {
        const execution: CronJobExecution = {
          jobId,
          timestamp: new Date().toISOString(),
          success: true,
          output: await response.json()
        };

        // 保存执行记录
        const executions = this.jobExecutions.get(jobId) || [];
        executions.push(execution);
        this.jobExecutions.set(jobId, executions);

        // 更新任务的最后执行时间
        await this.updateJob(jobId, { lastRun: execution.timestamp });

        logger.info(`Executed cron job: ${jobId}`);
        return execution;
      } else {
        const errorData = await response.json().catch(() => ({}));
        const errorMessage = errorData.message || 'Failed to execute cron job';
        
        const execution: CronJobExecution = {
          jobId,
          timestamp: new Date().toISOString(),
          success: false,
          error: errorMessage
        };

        // 保存执行记录
        const executions = this.jobExecutions.get(jobId) || [];
        executions.push(execution);
        this.jobExecutions.set(jobId, executions);

        logger.error(`Failed to execute cron job ${jobId}: ${errorMessage}`);
        return execution;
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      
      const execution: CronJobExecution = {
        jobId,
        timestamp: new Date().toISOString(),
        success: false,
        error: errorMessage
      };

      // 保存执行记录
      const executions = this.jobExecutions.get(jobId) || [];
      executions.push(execution);
      this.jobExecutions.set(jobId, executions);

      logger.error(`Failed to execute cron job ${jobId}:`, error);
      return execution;
    }
  }

  /**
   * 获取任务执行记录
   */
  getJobExecutions(jobId: string): CronJobExecution[] {
    return this.jobExecutions.get(jobId) || [];
  }

  /**
   * 获取所有任务执行记录
   */
  getAllJobExecutions(): Map<string, CronJobExecution[]> {
    return this.jobExecutions;
  }

  /**
   * 清理任务执行记录
   */
  cleanupJobExecutions(jobId: string, keepCount: number = 10): void {
    const executions = this.jobExecutions.get(jobId);
    if (executions && executions.length > keepCount) {
      const cleanedExecutions = executions.slice(-keepCount);
      this.jobExecutions.set(jobId, cleanedExecutions);
      logger.info(`Cleaned up executions for job ${jobId}, kept ${keepCount} records`);
    }
  }

  /**
   * 清理所有任务执行记录
   */
  cleanupAllJobExecutions(keepCount: number = 10): void {
    for (const jobId of this.jobExecutions.keys()) {
      this.cleanupJobExecutions(jobId, keepCount);
    }
  }

  /**
   * 验证 cron 表达式
   */
  validateCronExpression(expression: string): boolean {
    // 简单的 cron 表达式验证
    const cronPattern = /^\s*($|#|\d{1,2}(\/\d+)?|\*|\*(\/\d+)?|\d{1,2}-\d{1,2}|\d{1,2}-\d{1,2}(\/\d+)?)(\s+\d{1,2}(\/\d+)?|\s+\*|\s+\*(\/\d+)?|\s+\d{1,2}-\d{1,2}|\s+\d{1,2}-\d{1,2}(\/\d+)?){4}\s*$/;
    return cronPattern.test(expression);
  }

  /**
   * 解析 cron 表达式，返回下一次执行时间
   */
  getNextRunTime(cronExpression: string): string | null {
    try {
      // 这里可以实现 cron 表达式解析逻辑
      // 为了简化，返回一个模拟的时间
      const nextRun = new Date();
      nextRun.setMinutes(nextRun.getMinutes() + 5);
      return nextRun.toISOString();
    } catch (error) {
      logger.error('Failed to parse cron expression:', error);
      return null;
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

  /**
   * 获取任务统计信息
   */
  getJobStats() {
    const jobs = Array.from(this.jobs.values());
    const enabledJobs = jobs.filter(job => job.enabled);
    const disabledJobs = jobs.filter(job => !job.enabled);
    
    return {
      total: jobs.length,
      enabled: enabledJobs.length,
      disabled: disabledJobs.length
    };
  }
}

// 导出单例
export const chatClawPicoClawCronService = new ChatClawPicoClawCronService();
