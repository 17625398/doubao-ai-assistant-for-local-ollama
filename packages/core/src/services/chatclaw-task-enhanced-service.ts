/**
 * ChatClaw 定时任务增强服务
 * 提供更完善的定时任务功能，包括 cron 表达式、任务历史、通知等
 */

import { logger } from '../utils/logger';
import { OllamaClient } from '../utils/ollama-client';
import { aiConfigManager } from '../utils/ai-config-manager';

export interface EnhancedTaskConfig {
  id: string;
  name: string;
  description: string;
  type: 'cron' | 'interval' | 'once' | 'daily' | 'weekly' | 'monthly';
  schedule: string;
  enabled: boolean;
  lastRun?: string;
  nextRun?: string;
  runCount: number;
  failCount: number;
  createdAt: string;
  updatedAt: string;
  action: {
    type: 'chat' | 'knowledge' | 'skill' | 'system' | 'monitor' | 'report';
    params: any;
  };
  notification?: {
    enabled: boolean;
    channels: ('webhook' | 'email' | 'message')[];
    onSuccess: boolean;
    onFailure: boolean;
  };
  retry?: {
    enabled: boolean;
    maxAttempts: number;
    delay: number;
  };
}

export interface TaskExecutionRecord {
  id: string;
  taskId: string;
  taskName: string;
  startTime: string;
  endTime?: string;
  status: 'running' | 'success' | 'failed' | 'cancelled';
  result?: any;
  error?: string;
  duration?: number;
}

export class ChatClawTaskEnhancedService {
  private tasks: Map<string, EnhancedTaskConfig> = new Map();
  private timers: Map<string, NodeJS.Timeout> = new Map();
  private executionHistory: Map<string, TaskExecutionRecord[]> = new Map();
  private ollamaClient: OllamaClient;
  private maxHistoryPerTask: number = 100;

  constructor() {
    this.ollamaClient = new OllamaClient();
  }

  /**
   * 初始化服务
   */
  initialize(): void {
    this.initializeDefaultTasks();
    this.startTaskScheduler();
    logger.info('ChatClaw Task Enhanced Service initialized');
  }

  /**
   * 初始化默认任务
   */
  private initializeDefaultTasks(): void {
    const defaultTasks: EnhancedTaskConfig[] = [
      {
        id: 'task-daily-report',
        name: '每日报告',
        description: '每天早上9点生成昨日总结报告',
        type: 'cron',
        schedule: '0 9 * * *',
        enabled: false,
        runCount: 0,
        failCount: 0,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        action: {
          type: 'report',
          params: { reportType: 'daily' }
        },
        notification: {
          enabled: true,
          channels: ['message'],
          onSuccess: true,
          onFailure: true
        },
        retry: {
          enabled: true,
          maxAttempts: 3,
          delay: 60000
        }
      },
      {
        id: 'task-monitor-health',
        name: '系统健康监控',
        description: '每5分钟检查系统健康状态',
        type: 'interval',
        schedule: '300000',
        enabled: false,
        runCount: 0,
        failCount: 0,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        action: {
          type: 'monitor',
          params: { checkType: 'health' }
        },
        notification: {
          enabled: true,
          channels: ['message'],
          onSuccess: false,
          onFailure: true
        }
      },
      {
        id: 'task-weekly-backup',
        name: '每周数据备份',
        description: '每周日凌晨2点执行数据备份',
        type: 'cron',
        schedule: '0 2 * * 0',
        enabled: false,
        runCount: 0,
        failCount: 0,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        action: {
          type: 'system',
          params: { action: 'backup' }
        },
        notification: {
          enabled: true,
          channels: ['message', 'email'],
          onSuccess: true,
          onFailure: true
        },
        retry: {
          enabled: true,
          maxAttempts: 5,
          delay: 300000
        }
      }
    ];

    defaultTasks.forEach(task => {
      this.tasks.set(task.id, task);
    });
  }

  /**
   * 解析 cron 表达式
   */
  private parseCronExpression(cron: string): { nextRun: Date; interval: number } {
    const parts = cron.split(' ');
    if (parts.length !== 5) {
      throw new Error('Invalid cron expression. Expected 5 parts: minute hour day month weekday');
    }

    const [minute, hour, day, month, weekday] = parts;
    const now = new Date();
    let nextRun = new Date(now);

    // 简化实现：计算下一次运行时间
    if (minute !== '*') {
      nextRun.setMinutes(parseInt(minute));
    }
    if (hour !== '*') {
      nextRun.setHours(parseInt(hour));
    }

    // 如果计算的时间已经过去，设置为明天
    if (nextRun <= now) {
      nextRun.setDate(nextRun.getDate() + 1);
    }

    // 计算间隔（简化）
    const interval = 24 * 60 * 60 * 1000; // 默认每天

    return { nextRun, interval };
  }

  /**
   * 启动任务调度器
   */
  private startTaskScheduler(): void {
    this.tasks.forEach((task) => {
      if (task.enabled) {
        this.scheduleTask(task);
      }
    });
  }

  /**
   * 调度任务
   */
  private scheduleTask(task: EnhancedTaskConfig): void {
    // 清除现有定时器
    this.clearTaskTimer(task.id);

    try {
      switch (task.type) {
        case 'cron':
          this.scheduleCronTask(task);
          break;
        case 'interval':
          this.scheduleIntervalTask(task);
          break;
        case 'once':
          this.scheduleOnceTask(task);
          break;
        case 'daily':
          this.scheduleDailyTask(task);
          break;
        case 'weekly':
          this.scheduleWeeklyTask(task);
          break;
        case 'monthly':
          this.scheduleMonthlyTask(task);
          break;
      }

      // 更新下次运行时间
      this.updateNextRunTime(task.id);
    } catch (error) {
      logger.error(`Failed to schedule task ${task.id}:`, error);
    }
  }

  /**
   * 调度 cron 任务
   */
  private scheduleCronTask(task: EnhancedTaskConfig): void {
    try {
      const { nextRun, interval } = this.parseCronExpression(task.schedule);
      const delay = nextRun.getTime() - Date.now();

      const timer = setTimeout(() => {
        this.executeTask(task);
        // 重新调度
        this.scheduleCronTask(task);
      }, Math.max(0, delay));

      this.timers.set(task.id, timer);
    } catch (error) {
      logger.error(`Failed to schedule cron task ${task.id}:`, error);
    }
  }

  /**
   * 调度间隔任务
   */
  private scheduleIntervalTask(task: EnhancedTaskConfig): void {
    const interval = parseInt(task.schedule);
    if (isNaN(interval) || interval <= 0) {
      logger.error(`Invalid interval for task ${task.id}: ${task.schedule}`);
      return;
    }

    const timer = setInterval(() => {
      this.executeTask(task);
    }, interval);

    this.timers.set(task.id, timer);
  }

  /**
   * 调度一次性任务
   */
  private scheduleOnceTask(task: EnhancedTaskConfig): void {
    const delay = this.calculateDelay(task.schedule);
    if (delay <= 0) {
      logger.warn(`Task ${task.id} scheduled time has passed`);
      return;
    }

    const timer = setTimeout(() => {
      this.executeTask(task);
      this.tasks.delete(task.id);
      this.timers.delete(task.id);
    }, delay);

    this.timers.set(task.id, timer);
  }

  /**
   * 调度每日任务
   */
  private scheduleDailyTask(task: EnhancedTaskConfig): void {
    const [hour, minute] = task.schedule.split(':').map(Number);
    const now = new Date();
    const nextRun = new Date(now.getFullYear(), now.getMonth(), now.getDate(), hour, minute);

    if (nextRun <= now) {
      nextRun.setDate(nextRun.getDate() + 1);
    }

    const delay = nextRun.getTime() - Date.now();
    const timer = setTimeout(() => {
      this.executeTask(task);
      this.scheduleDailyTask(task);
    }, delay);

    this.timers.set(task.id, timer);
  }

  /**
   * 调度每周任务
   */
  private scheduleWeeklyTask(task: EnhancedTaskConfig): void {
    const [dayOfWeek, time] = task.schedule.split(' ');
    const [hour, minute] = time.split(':').map(Number);
    const targetDay = parseInt(dayOfWeek);

    const now = new Date();
    const nextRun = new Date(now.getFullYear(), now.getMonth(), now.getDate(), hour, minute);

    const currentDay = now.getDay();
    const daysUntilTarget = (targetDay - currentDay + 7) % 7;

    if (daysUntilTarget === 0 && nextRun <= now) {
      nextRun.setDate(nextRun.getDate() + 7);
    } else {
      nextRun.setDate(nextRun.getDate() + daysUntilTarget);
    }

    const delay = nextRun.getTime() - Date.now();
    const timer = setTimeout(() => {
      this.executeTask(task);
      this.scheduleWeeklyTask(task);
    }, delay);

    this.timers.set(task.id, timer);
  }

  /**
   * 调度每月任务
   */
  private scheduleMonthlyTask(task: EnhancedTaskConfig): void {
    const [dayOfMonth, time] = task.schedule.split(' ');
    const [hour, minute] = time.split(':').map(Number);
    const targetDate = parseInt(dayOfMonth);

    const now = new Date();
    let nextRun = new Date(now.getFullYear(), now.getMonth(), targetDate, hour, minute);

    if (nextRun <= now) {
      nextRun.setMonth(nextRun.getMonth() + 1);
    }

    const delay = nextRun.getTime() - Date.now();
    const timer = setTimeout(() => {
      this.executeTask(task);
      this.scheduleMonthlyTask(task);
    }, delay);

    this.timers.set(task.id, timer);
  }

  /**
   * 计算延迟时间
   */
  private calculateDelay(schedule: string): number {
    const timestamp = parseInt(schedule);
    if (!isNaN(timestamp)) {
      return Math.max(0, timestamp - Date.now());
    }

    // 尝试解析 ISO 日期字符串
    const date = new Date(schedule);
    if (!isNaN(date.getTime())) {
      return Math.max(0, date.getTime() - Date.now());
    }

    return 0;
  }

  /**
   * 更新下次运行时间
   */
  private updateNextRunTime(taskId: string): void {
    const task = this.tasks.get(taskId);
    if (!task) return;

    // 这里简化处理，实际应该根据调度类型计算
    const nextRun = new Date(Date.now() + 3600000); // 默认1小时后
    task.nextRun = nextRun.toISOString();
    this.tasks.set(taskId, task);
  }

  /**
   * 执行任务
   */
  private async executeTask(task: EnhancedTaskConfig): Promise<void> {
    const executionId = `exec_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const startTime = new Date().toISOString();

    // 创建执行记录
    const record: TaskExecutionRecord = {
      id: executionId,
      taskId: task.id,
      taskName: task.name,
      startTime,
      status: 'running'
    };

    this.addExecutionRecord(task.id, record);

    try {
      logger.info(`[Task] 开始执行任务: ${task.name}`);

      // 更新任务状态
      task.lastRun = startTime;
      task.runCount++;
      task.updatedAt = startTime;
      this.tasks.set(task.id, task);

      // 执行任务动作
      const result = await this.executeTaskAction(task);

      // 更新执行记录
      record.endTime = new Date().toISOString();
      record.status = 'success';
      record.result = result;
      record.duration = Date.now() - new Date(startTime).getTime();

      logger.info(`[Task] 任务执行成功: ${task.name}`);

      // 发送成功通知
      if (task.notification?.enabled && task.notification.onSuccess) {
        await this.sendNotification(task, 'success', result);
      }

    } catch (error) {
      logger.error(`[Task] 任务执行失败: ${task.name}`, error);

      task.failCount++;
      this.tasks.set(task.id, task);

      // 更新执行记录
      record.endTime = new Date().toISOString();
      record.status = 'failed';
      record.error = error instanceof Error ? error.message : '未知错误';
      record.duration = Date.now() - new Date(startTime).getTime();

      // 发送失败通知
      if (task.notification?.enabled && task.notification.onFailure) {
        await this.sendNotification(task, 'failed', record.error);
      }

      // 重试逻辑
      if (task.retry?.enabled && task.retry.maxAttempts > 0) {
        await this.retryTask(task, executionId);
      }
    }

    this.updateExecutionRecord(task.id, record);
  }

  /**
   * 执行任务动作
   */
  private async executeTaskAction(task: EnhancedTaskConfig): Promise<any> {
    switch (task.action.type) {
      case 'chat':
        return await this.executeChatAction(task.action.params);
      case 'knowledge':
        return await this.executeKnowledgeAction(task.action.params);
      case 'skill':
        return await this.executeSkillAction(task.action.params);
      case 'system':
        return await this.executeSystemAction(task.action.params);
      case 'monitor':
        return await this.executeMonitorAction(task.action.params);
      case 'report':
        return await this.executeReportAction(task.action.params);
      default:
        throw new Error(`Unknown action type: ${task.action.type}`);
    }
  }

  /**
   * 执行聊天动作
   */
  private async executeChatAction(params: any): Promise<any> {
    const model = aiConfigManager.getDefaultModel();

    const response = await this.ollamaClient.chat({
      model,
      messages: [
        { role: 'system', content: '你是 ChatClaw 任务助手' },
        { role: 'user', content: params.message }
      ],
      stream: false
    });

    return response.message?.content;
  }

  /**
   * 执行知识库动作
   */
  private async executeKnowledgeAction(params: any): Promise<any> {
    logger.info(`[Task] 执行知识库操作: ${params.action}`);
    return { action: params.action, status: 'completed' };
  }

  /**
   * 执行技能动作
   */
  private async executeSkillAction(params: any): Promise<any> {
    logger.info(`[Task] 执行技能: ${params.skillId}`);
    return { skillId: params.skillId, status: 'completed' };
  }

  /**
   * 执行系统动作
   */
  private async executeSystemAction(params: any): Promise<any> {
    logger.info(`[Task] 执行系统操作: ${params.action}`);
    return { action: params.action, status: 'completed' };
  }

  /**
   * 执行监控动作
   */
  private async executeMonitorAction(params: any): Promise<any> {
    logger.info(`[Task] 执行监控: ${params.checkType}`);
    return { checkType: params.checkType, status: 'healthy' };
  }

  /**
   * 执行报告动作
   */
  private async executeReportAction(params: any): Promise<any> {
    logger.info(`[Task] 生成报告: ${params.reportType}`);
    return { reportType: params.reportType, status: 'generated' };
  }

  /**
   * 重试任务
   */
  private async retryTask(task: EnhancedTaskConfig, executionId: string): Promise<void> {
    if (!task.retry?.enabled) return;

    const record = this.getExecutionRecord(task.id, executionId);
    if (!record) return;

    const attempts = record.result?.attempts || 0;
    if (attempts >= task.retry.maxAttempts) {
      logger.warn(`[Task] 任务 ${task.name} 已达到最大重试次数`);
      return;
    }

    logger.info(`[Task] 任务 ${task.name} 将在 ${task.retry.delay}ms 后重试 (${attempts + 1}/${task.retry.maxAttempts})`);

    await new Promise(resolve => setTimeout(resolve, task.retry!.delay));

    try {
      const result = await this.executeTaskAction(task);
      record.status = 'success';
      record.result = { ...result, attempts: attempts + 1 };
      logger.info(`[Task] 任务 ${task.name} 重试成功`);
    } catch (error) {
      record.result = { attempts: attempts + 1 };
      await this.retryTask(task, executionId);
    }

    this.updateExecutionRecord(task.id, record);
  }

  /**
   * 发送通知
   */
  private async sendNotification(task: EnhancedTaskConfig, status: 'success' | 'failed', result: any): Promise<void> {
    const message = status === 'success'
      ? `✅ 任务 "${task.name}" 执行成功`
      : `❌ 任务 "${task.name}" 执行失败: ${result}`;

    logger.info(`[Task Notification] ${message}`);

    // 这里可以实现具体的通知渠道逻辑
    // 如 webhook、邮件、消息推送等
  }

  /**
   * 添加执行记录
   */
  private addExecutionRecord(taskId: string, record: TaskExecutionRecord): void {
    if (!this.executionHistory.has(taskId)) {
      this.executionHistory.set(taskId, []);
    }

    const history = this.executionHistory.get(taskId)!;
    history.unshift(record);

    // 限制历史记录数量
    if (history.length > this.maxHistoryPerTask) {
      history.pop();
    }
  }

  /**
   * 更新执行记录
   */
  private updateExecutionRecord(taskId: string, record: TaskExecutionRecord): void {
    const history = this.executionHistory.get(taskId);
    if (!history) return;

    const index = history.findIndex(r => r.id === record.id);
    if (index !== -1) {
      history[index] = record;
    }
  }

  /**
   * 获取执行记录
   */
  private getExecutionRecord(taskId: string, executionId: string): TaskExecutionRecord | undefined {
    const history = this.executionHistory.get(taskId);
    return history?.find(r => r.id === executionId);
  }

  /**
   * 获取任务执行历史
   */
  getTaskHistory(taskId: string): TaskExecutionRecord[] {
    return this.executionHistory.get(taskId) || [];
  }

  /**
   * 获取所有任务
   */
  getAllTasks(): EnhancedTaskConfig[] {
    return Array.from(this.tasks.values());
  }

  /**
   * 获取任务
   */
  getTask(taskId: string): EnhancedTaskConfig | undefined {
    return this.tasks.get(taskId);
  }

  /**
   * 创建任务
   */
  createTask(config: Omit<EnhancedTaskConfig, 'id' | 'createdAt' | 'updatedAt' | 'runCount' | 'failCount'>): EnhancedTaskConfig {
    const id = `task_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const now = new Date().toISOString();

    const task: EnhancedTaskConfig = {
      ...config,
      id,
      runCount: 0,
      failCount: 0,
      createdAt: now,
      updatedAt: now
    };

    this.tasks.set(id, task);
    logger.info(`[Task] 创建任务: ${task.name}`);

    if (task.enabled) {
      this.scheduleTask(task);
    }

    return task;
  }

  /**
   * 更新任务
   */
  updateTask(taskId: string, updates: Partial<EnhancedTaskConfig>): EnhancedTaskConfig | undefined {
    const task = this.tasks.get(taskId);
    if (!task) return undefined;

    const updatedTask = {
      ...task,
      ...updates,
      updatedAt: new Date().toISOString()
    };

    this.tasks.set(taskId, updatedTask);

    // 重新调度
    this.clearTaskTimer(taskId);
    if (updatedTask.enabled) {
      this.scheduleTask(updatedTask);
    }

    logger.info(`[Task] 更新任务: ${updatedTask.name}`);
    return updatedTask;
  }

  /**
   * 删除任务
   */
  deleteTask(taskId: string): boolean {
    this.clearTaskTimer(taskId);
    this.executionHistory.delete(taskId);
    const deleted = this.tasks.delete(taskId);

    if (deleted) {
      logger.info(`[Task] 删除任务: ${taskId}`);
    }

    return deleted;
  }

  /**
   * 启用任务
   */
  enableTask(taskId: string): boolean {
    const task = this.tasks.get(taskId);
    if (!task) return false;

    task.enabled = true;
    task.updatedAt = new Date().toISOString();
    this.tasks.set(taskId, task);
    this.scheduleTask(task);

    logger.info(`[Task] 启用任务: ${task.name}`);
    return true;
  }

  /**
   * 禁用任务
   */
  disableTask(taskId: string): boolean {
    const task = this.tasks.get(taskId);
    if (!task) return false;

    task.enabled = false;
    task.updatedAt = new Date().toISOString();
    this.tasks.set(taskId, task);
    this.clearTaskTimer(taskId);

    logger.info(`[Task] 禁用任务: ${task.name}`);
    return true;
  }

  /**
   * 立即运行任务
   */
  async runTaskNow(taskId: string): Promise<boolean> {
    const task = this.tasks.get(taskId);
    if (!task) return false;

    await this.executeTask(task);
    return true;
  }

  /**
   * 清除任务定时器
   */
  private clearTaskTimer(taskId: string): void {
    const timer = this.timers.get(taskId);
    if (timer) {
      clearTimeout(timer);
      clearInterval(timer);
      this.timers.delete(taskId);
    }
  }

  /**
   * 获取任务统计
   */
  getTaskStats(): {
    total: number;
    enabled: number;
    disabled: number;
    running: number;
    totalRuns: number;
    totalFailures: number;
  } {
    const tasks = Array.from(this.tasks.values());
    return {
      total: tasks.length,
      enabled: tasks.filter(t => t.enabled).length,
      disabled: tasks.filter(t => !t.enabled).length,
      running: tasks.filter(t => t.enabled && this.timers.has(t.id)).length,
      totalRuns: tasks.reduce((sum, t) => sum + t.runCount, 0),
      totalFailures: tasks.reduce((sum, t) => sum + t.failCount, 0)
    };
  }

  /**
   * 验证 cron 表达式
   */
  validateCronExpression(cron: string): { valid: boolean; error?: string; nextRun?: Date } {
    try {
      const { nextRun } = this.parseCronExpression(cron);
      return { valid: true, nextRun };
    } catch (error) {
      return {
        valid: false,
        error: error instanceof Error ? error.message : 'Invalid cron expression'
      };
    }
  }

  /**
   * 清理所有资源
   */
  dispose(): void {
    this.timers.forEach(timer => {
      clearTimeout(timer);
      clearInterval(timer);
    });
    this.timers.clear();
    this.tasks.clear();
    this.executionHistory.clear();
    logger.info('ChatClaw Task Enhanced Service disposed');
  }
}

// 导出单例
export const chatClawTaskEnhancedService = new ChatClawTaskEnhancedService();
