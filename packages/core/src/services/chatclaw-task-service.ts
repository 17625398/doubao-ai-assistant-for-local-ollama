/**
 * ChatClaw 任务自动化服务
 * 实现ChatClaw的任务自动化功能，包括定时任务、重复任务等
 */
import { logger } from '../utils/logger';

export interface TaskConfig {
  id: string;
  name: string;
  description: string;
  type: 'cron' | 'interval' | 'once';
  schedule: string; // cron表达式或时间间隔（毫秒）
  enabled: boolean;
  lastRun?: string;
  nextRun?: string;
  createdAt: string;
  updatedAt: string;
  action: {
    type: 'chat' | 'knowledge' | 'skill' | 'system';
    params: any;
  };
}

export class ChatClawTaskService {
  private tasks: Map<string, TaskConfig> = new Map();
  private timers: Map<string, NodeJS.Timeout> = new Map();

  /**
   * 初始化任务服务
   */
  initialize(): void {
    // 初始化默认任务
    this.initializeDefaultTasks();
    // 启动任务调度
    this.startTaskScheduler();
  }

  /**
   * 初始化默认任务
   */
  private initializeDefaultTasks(): void {
    const defaultTasks: TaskConfig[] = [
      {
        id: 'task-1',
        name: '每日提醒',
        description: '每天早上8点发送提醒消息',
        type: 'cron',
        schedule: '0 8 * * *', // 每天早上8点
        enabled: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        action: {
          type: 'chat',
          params: {
            message: '早上好！今天有什么可以帮您的吗？'
          }
        }
      },
      {
        id: 'task-2',
        name: '知识库备份',
        description: '每周日晚上10点备份知识库',
        type: 'cron',
        schedule: '0 22 * * 0', // 每周日晚上10点
        enabled: false,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        action: {
          type: 'knowledge',
          params: {
            action: 'backup'
          }
        }
      },
      {
        id: 'task-3',
        name: '系统检查',
        description: '每小时检查系统状态',
        type: 'interval',
        schedule: '3600000', // 1小时
        enabled: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        action: {
          type: 'system',
          params: {
            action: 'check'
          }
        }
      }
    ];

    defaultTasks.forEach(task => {
      this.tasks.set(task.id, task);
    });
  }

  /**
   * 启动任务调度
   */
  private startTaskScheduler(): void {
    // 检查所有任务
    this.tasks.forEach((task) => {
      if (task.enabled) {
        this.scheduleTask(task);
      }
    });
  }

  /**
   * 调度任务
   */
  private scheduleTask(task: TaskConfig): void {
    // 清除现有的定时器
    if (this.timers.has(task.id)) {
      clearTimeout(this.timers.get(task.id)!);
    }

    switch (task.type) {
      case 'cron':
        // 模拟cron调度
        this.simulateCronTask(task);
        break;
      case 'interval':
        // 设置间隔定时器
        const interval = parseInt(task.schedule);
        const intervalTimer = setInterval(() => {
          this.executeTask(task);
        }, interval);
        this.timers.set(task.id, intervalTimer);
        break;
      case 'once':
        // 设置一次性定时器
        const delay = this.calculateDelay(task.schedule);
        const onceTimer = setTimeout(() => {
          this.executeTask(task);
          this.timers.delete(task.id);
        }, delay);
        this.timers.set(task.id, onceTimer);
        break;
    }
  }

  /**
   * 模拟cron任务
   */
  private simulateCronTask(task: TaskConfig): void {
    // 简化实现，实际项目中可以使用cron库
    const delay = 3600000; // 1小时
    const cronTimer = setInterval(() => {
      this.executeTask(task);
    }, delay);
    this.timers.set(task.id, cronTimer);
  }

  /**
   * 计算延迟时间
   */
  private calculateDelay(schedule: string): number {
    // 尝试解析为时间戳
    const timestamp = parseInt(schedule);
    if (!isNaN(timestamp)) {
      // 如果是时间戳，计算距离现在的时间
      const now = Date.now();
      return Math.max(0, timestamp - now);
    }
    // 否则返回默认值
    return 0;
  }

  /**
   * 执行任务
   */
  private async executeTask(task: TaskConfig): Promise<void> {
    try {
      logger.info(`执行任务: ${task.name}`);
      
      // 更新任务状态
      const updatedTask = {
        ...task,
        lastRun: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      this.tasks.set(task.id, updatedTask);

      // 执行任务动作
      switch (task.action.type) {
        case 'chat':
          await this.executeChatAction(task.action.params);
          break;
        case 'knowledge':
          await this.executeKnowledgeAction(task.action.params);
          break;
        case 'skill':
          await this.executeSkillAction(task.action.params);
          break;
        case 'system':
          await this.executeSystemAction(task.action.params);
          break;
      }

      logger.info(`任务执行完成: ${task.name}`);
    } catch (error) {
      logger.error(`任务执行失败: ${task.name}`, error);
    }
  }

  /**
   * 执行聊天动作
   */
  private async executeChatAction(params: any): Promise<void> {
    // 模拟聊天动作
    logger.info(`执行聊天动作: ${params.message}`);
  }

  /**
   * 执行知识库动作
   */
  private async executeKnowledgeAction(params: any): Promise<void> {
    // 模拟知识库动作
    logger.info(`执行知识库动作: ${params.action}`);
  }

  /**
   * 执行技能动作
   */
  private async executeSkillAction(params: any): Promise<void> {
    // 模拟技能动作
    logger.info(`执行技能动作: ${params.skillId}`);
  }

  /**
   * 执行系统动作
   */
  private async executeSystemAction(params: any): Promise<void> {
    // 模拟系统动作
    logger.info(`执行系统动作: ${params.action}`);
  }

  /**
   * 获取所有任务
   */
  getTasks(): TaskConfig[] {
    return Array.from(this.tasks.values());
  }

  /**
   * 获取启用的任务
   */
  getEnabledTasks(): TaskConfig[] {
    return Array.from(this.tasks.values()).filter(task => task.enabled);
  }

  /**
   * 添加任务
   */
  addTask(task: Omit<TaskConfig, 'id' | 'createdAt' | 'updatedAt' | 'lastRun' | 'nextRun'>): TaskConfig {
    const newTask: TaskConfig = {
      ...task,
      id: `task-${Date.now()}`,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    this.tasks.set(newTask.id, newTask);

    if (newTask.enabled) {
      this.scheduleTask(newTask);
    }

    return newTask;
  }

  /**
   * 更新任务
   */
  updateTask(taskId: string, updates: Partial<TaskConfig>): TaskConfig | null {
    const task = this.tasks.get(taskId);
    if (!task) {
      return null;
    }

    const updatedTask: TaskConfig = {
      ...task,
      ...updates,
      updatedAt: new Date().toISOString()
    };

    this.tasks.set(taskId, updatedTask);

    // 重新调度任务
    if (updatedTask.enabled) {
      this.scheduleTask(updatedTask);
    } else {
      // 停止任务
      if (this.timers.has(taskId)) {
        clearTimeout(this.timers.get(taskId)!);
        this.timers.delete(taskId);
      }
    }

    return updatedTask;
  }

  /**
   * 删除任务
   */
  deleteTask(taskId: string): boolean {
    // 停止任务
    if (this.timers.has(taskId)) {
      clearTimeout(this.timers.get(taskId)!);
      this.timers.delete(taskId);
    }

    // 删除任务
    return this.tasks.delete(taskId);
  }

  /**
   * 启用任务
   */
  enableTask(taskId: string): boolean {
    const task = this.tasks.get(taskId);
    if (!task) {
      return false;
    }

    const updatedTask = this.updateTask(taskId, { enabled: true });
    return updatedTask !== null;
  }

  /**
   * 禁用任务
   */
  disableTask(taskId: string): boolean {
    const task = this.tasks.get(taskId);
    if (!task) {
      return false;
    }

    const updatedTask = this.updateTask(taskId, { enabled: false });
    return updatedTask !== null;
  }

  /**
   * 立即执行任务
   */
  async executeTaskNow(taskId: string): Promise<boolean> {
    const task = this.tasks.get(taskId);
    if (!task) {
      return false;
    }

    await this.executeTask(task);
    return true;
  }

  /**
   * 获取任务统计信息
   */
  getTaskStats(): {
    totalTasks: number;
    enabledTasks: number;
    disabledTasks: number;
  } {
    const totalTasks = this.tasks.size;
    const enabledTasks = Array.from(this.tasks.values()).filter(task => task.enabled).length;
    const disabledTasks = totalTasks - enabledTasks;

    return {
      totalTasks,
      enabledTasks,
      disabledTasks
    };
  }

  /**
   * 清理任务服务
   */
  cleanup(): void {
    // 清除所有定时器
    this.timers.forEach(timer => {
      clearTimeout(timer);
    });
    this.timers.clear();
  }
}

// 导出单例
export const chatClawTaskService = new ChatClawTaskService();
// 初始化服务
chatClawTaskService.initialize();
