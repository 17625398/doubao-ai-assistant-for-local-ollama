/**
 * OpenCLI 脚本录制模块（增强版）
 * 
 * 录制用户在浏览器中的操作，生成可重放的 OpenCLI 脚本
 * 支持点击、输入、导航、滚动等操作的录制
 */

import { openCLIHistory, type HistoryEntry } from './opencli-history';
import { openCLIQueue, type QueuedCommand } from './opencli-queue';

/**
 * 录制的操作类型
 */
export enum RecordedActionType {
  NAVIGATE = 'navigate',
  CLICK = 'click',
  TYPE = 'type',
  PRESS = 'press',
  SCROLL = 'scroll',
  WAIT = 'wait',
  SELECT = 'select',
  CHECKBOX = 'checkbox',
  RADIO = 'radio',
  HOVER = 'hover',
  CUSTOM = 'custom',
}

/**
 * 录制的操作
 */
export interface RecordedAction {
  id: string;
  type: RecordedActionType;
  timestamp: number;
  selector: string;
  value?: any;
  options?: Record<string, any>;
  pageUrl?: string;
  pageTitle?: string;
  notes?: string;
}

/**
 * 录制的脚本
 */
export interface RecordedScript {
  id: string;
  name: string;
  description?: string;
  createdAt: number;
  updatedAt: number;
  actions: RecordedAction[];
  totalDuration: number;
  tags?: string[];
  metadata?: {
    author?: string;
    version?: string;
    targetUrl?: string;
  };
}

/**
 * 录制配置
 */
export interface RecorderConfig {
  autoStart: boolean;
  captureValue: boolean; // 是否捕获输入值
  captureSensitive: boolean; // 是否捕获敏感信息 (密码等)
  debounceDelay: number; // 去抖延迟 (毫秒)
  maxActions: number; // 最大录制动作数
}

/**
 * 录制状态
 */
export enum RecorderStatus {
  IDLE = 'idle',
  RECORDING = 'recording',
  PAUSED = 'paused',
  STOPPED = 'stopped',
}

/**
 * OpenCLI 脚本录制器类
 * 
 * 单例模式，管理录制和回放
 */
export class OpenCLIRecorderEnhanced {
  private static instance: OpenCLIRecorderEnhanced | null = null;

  private status: RecorderStatus = RecorderStatus.IDLE;
  private currentActions: RecordedAction[] = [];
  private currentScriptName: string = '';
  private startTime: number = 0;
  
  private config: RecorderConfig = {
    autoStart: false,
    captureValue: true,
    captureSensitive: false,
    debounceDelay: 300,
    maxActions: 500,
  };

  private eventListeners: Map<string, Array<(data: any) => void>> = new Map();
  private lastActionTime: Map<string, number> = new Map(); // 用于去抖

  /**
   * 私有构造函数 (单例模式)
   */
  private constructor() {}

  /**
   * 获取单例实例
   */
  public static getInstance(): OpenCLIRecorderEnhanced {
    if (!OpenCLIRecorderEnhanced.instance) {
      OpenCLIRecorderEnhanced.instance = new OpenCLIRecorderEnhanced();
    }
    return OpenCLIRecorderEnhanced.instance;
  }

  /**
   * 生成唯一 ID
   */
  private generateId(): string {
    return `rec_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * 开始录制
   * 
   * @param scriptName 脚本名称
   */
  public startRecording(scriptName: string = '未命名脚本'): void {
    if (this.status === RecorderStatus.RECORDING) {
      return;
    }

    this.status = RecorderStatus.RECORDING;
    this.currentActions = [];
    this.currentScriptName = scriptName;
    this.startTime = Date.now();

    this.attachEventListeners();
    this.emit('recording:started', { scriptName });
  }

  /**
   * 停止录制
   * 
   * @returns 录制的脚本
   */
  public stopRecording(): RecordedScript | null {
    if (this.status !== RecorderStatus.RECORDING) {
      return null;
    }

    this.status = RecorderStatus.STOPPED;
    this.detachEventListeners();

    const script: RecordedScript = {
      id: this.generateId(),
      name: this.currentScriptName,
      createdAt: this.startTime,
      updatedAt: Date.now(),
      actions: [...this.currentActions],
      totalDuration: Date.now() - this.startTime,
    };

    // 重置状态
    this.currentActions = [];
    this.currentScriptName = '';

    this.emit('recording:stopped', script);

    return script;
  }

  /**
   * 暂停录制
   */
  public pauseRecording(): void {
    if (this.status === RecorderStatus.RECORDING) {
      this.status = RecorderStatus.PAUSED;
      this.detachEventListeners();
      this.emit('recording:paused');
    }
  }

  /**
   * 恢复录制
   */
  public resumeRecording(): void {
    if (this.status === RecorderStatus.PAUSED) {
      this.status = RecorderStatus.RECORDING;
      this.attachEventListeners();
      this.emit('recording:resumed');
    }
  }

  /**
   * 获取当前录制状态
   */
  public getStatus(): RecorderStatus {
    return this.status;
  }

  /**
   * 获取当前录制的动作
   */
  public getCurrentActions(): RecordedAction[] {
    return [...this.currentActions];
  }

  /**
   * 添加手动动作
   * 
   * @param action 要添加的动作
   */
  public addAction(action: Omit<RecordedAction, 'id' | 'timestamp'>): void {
    if (this.status !== RecorderStatus.RECORDING) {
      return;
    }

    const fullAction: RecordedAction = {
      ...action,
      id: this.generateId(),
      timestamp: Date.now(),
    };

    this.currentActions.push(fullAction);

    // 限制动作数量
    if (this.currentActions.length > this.config.maxActions) {
      this.currentActions.shift();
    }

    this.emit('action:recorded', fullAction);
  }

  /**
   * 回放录制的脚本
   * 
   * @param script 要回放的脚本
   * @param options 回放选项
   */
  public async playback(
    script: RecordedScript,
    options: { speed?: number; stopOnError?: boolean; dryRun?: boolean } = {}
  ): Promise<{ success: boolean; results: any[] }> {
    const { speed = 1.0, stopOnError = false, dryRun = false } = options;
    const results: any[] = [];

    this.emit('playback:started', { script, options });

    for (let i = 0; i < script.actions.length; i++) {
      const action = script.actions[i];

      if (dryRun) {
        // 干运行模式，只记录不执行
        results.push({ action, executed: false });
        continue;
      }

      try {
        // 转换为 OpenCLI 命令
        const command = this.actionToCommand(action);
        
        // 添加到执行队列
        const commandId = openCLIQueue.enqueue(command.name, command.args);
        
        // 等待执行完成
        const result = await this.waitForCommandExecution(commandId);
        results.push({ action, result, executed: true });

        if (!result.success && stopOnError) {
          this.emit('playback:error', { action, result });
          return { success: false, results };
        }

        // 应用速度倍率
        if (speed !== 1.0 && i < script.actions.length - 1) {
          const nextAction = script.actions[i + 1];
          const delay = (nextAction.timestamp - action.timestamp) / speed;
          await this.delay(Math.min(delay, 5000)); // 最多等待 5 秒
        }
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : '未知错误';
        results.push({ action, error: errorMsg, executed: false });
        
        if (stopOnError) {
          this.emit('playback:error', { action, error: errorMsg });
          return { success: false, results };
        }
      }
    }

    const allSuccess = results.every((r) => r.executed && r.result?.success);
    this.emit('playback:completed', { success: allSuccess, results });

    return { success: allSuccess, results };
  }

  /**
   * 将录制的动作转换为 OpenCLI 命令
   */
  private actionToCommand(action: RecordedAction): { name: string; args: Record<string, any> } {
    switch (action.type) {
      case RecordedActionType.NAVIGATE:
        return { name: 'navigate', args: { url: action.value } };

      case RecordedActionType.CLICK:
        return { name: 'click', args: { selector: action.selector } };

      case RecordedActionType.TYPE:
        return { name: 'type', args: { selector: action.selector, value: action.value } };

      case RecordedActionType.PRESS:
        return { name: 'press', args: { key: action.value } };

      case RecordedActionType.SCROLL:
        return { name: 'scroll', args: { direction: action.value } };

      case RecordedActionType.WAIT:
        return { name: 'wait', args: { ms: action.value } };

      case RecordedActionType.SELECT:
        return { name: 'select', args: { selector: action.selector, value: action.value } };

      case RecordedActionType.CHECKBOX:
        return { name: 'check', args: { selector: action.selector } };

      case RecordedActionType.RADIO:
        return { name: 'click', args: { selector: action.selector } };

      case RecordedActionType.HOVER:
        return { name: 'hover', args: { selector: action.selector } };

      case RecordedActionType.CUSTOM:
        return { name: 'evaluate', args: { script: action.value } };

      default:
        throw new Error(`不支持的动作类型：${action.type}`);
    }
  }

  /**
   * 等待命令执行完成
   */
  private async waitForCommandExecution(
    commandId: string,
    timeout: number = 30000
  ): Promise<any> {
    return new Promise((resolve, reject) => {
      const startTime = Date.now();

      const checkStatus = () => {
        const command = openCLIQueue.getCommand(commandId);
        
        if (!command) {
          reject(new Error('命令不存在'));
          return;
        }

        if (command.status === 'completed') {
          resolve(command.result);
        } else if (command.status === 'failed') {
          resolve(command.result);
        } else if (Date.now() - startTime > timeout) {
          reject(new Error('等待超时'));
        } else {
          setTimeout(checkStatus, 100);
        }
      };

      checkStatus();
    });
  }

  /**
   * 导出脚本
   * 
   * @param script 要导出的脚本
   * @param format 导出格式 ('json' | 'js')
   */
  public exportScript(script: RecordedScript, format: 'json' | 'js' = 'json'): string {
    if (format === 'json') {
      return JSON.stringify(script, null, 2);
    } else if (format === 'js') {
      // 导出为 JavaScript 代码
      let code = `// OpenCLI Script: ${script.name}\n`;
      code += `// Generated at: ${new Date(script.createdAt).toISOString()}\n\n`;
      code += `const opencli = require('@jackwener/opencli');\n\n`;
      code += `async function run() {\n`;
      
      for (const action of script.actions) {
        const command = this.actionToCommand(action);
        code += `  await opencli.${command.name}(${JSON.stringify(command.args)});\n`;
      }
      
      code += `}\n\nrun().catch(console.error);\n`;
      
      return code;
    }

    throw new Error(`不支持的导出格式：${format}`);
  }

  /**
   * 导入脚本
   * 
   * @param data 脚本数据
   * @param format 数据格式 ('json' | 'js')
   */
  public importScript(data: string, format: 'json' | 'js' = 'json'): RecordedScript {
    if (format === 'json') {
      return JSON.parse(data) as RecordedScript;
    } else if (format === 'js') {
      // 简单的 JS 解析 (简化版)
      throw new Error('JavaScript 格式导入暂不支持');
    }

    throw new Error(`不支持的导入格式：${format}`);
  }

  /**
   * 保存脚本到存储
   */
  public async saveScript(script: RecordedScript): Promise<void> {
    const key = `opencli_scripts`;
    
    if (typeof chrome !== 'undefined' && chrome.storage) {
      const result = await chrome.storage.local.get(key);
      const scripts = result[key] || [];
      scripts.push(script);
      await chrome.storage.local.set({ [key]: scripts });
    } else {
      const stored = localStorage.getItem(key);
      const scripts = stored ? JSON.parse(stored) : [];
      scripts.push(script);
      localStorage.setItem(key, JSON.stringify(scripts));
    }

    this.emit('script:saved', script);
  }

  /**
   * 从存储加载脚本列表
   */
  public async loadScripts(): Promise<RecordedScript[]> {
    const key = `opencli_scripts`;
    
    if (typeof chrome !== 'undefined' && chrome.storage) {
      const result = await chrome.storage.local.get(key);
      return result[key] || [];
    } else {
      const stored = localStorage.getItem(key);
      return stored ? JSON.parse(stored) : [];
    }
  }

  /**
   * 删除存储的脚本
   */
  public async deleteScript(scriptId: string): Promise<boolean> {
    const key = `opencli_scripts`;
    
    if (typeof chrome !== 'undefined' && chrome.storage) {
      const result = await chrome.storage.local.get(key);
      const scripts = result[key] || [];
      const index = scripts.findIndex((s: RecordedScript) => s.id === scriptId);
      
      if (index > -1) {
        scripts.splice(index, 1);
        await chrome.storage.local.set({ [key]: scripts });
        return true;
      }
    }

    return false;
  }

  /**
   * 附加事件监听器
   */
  private attachEventListeners(): void {
    if (typeof window === 'undefined') {
      return;
    }

    // 点击事件
    window.addEventListener('click', this.handleClick, true);
    
    // 输入事件
    window.addEventListener('input', this.handleInput, true);
    
    // 键盘事件
    window.addEventListener('keydown', this.handleKeyDown, true);
    
    // 导航事件 (popstate)
    window.addEventListener('popstate', this.handleNavigation, true);
    
    // 滚动事件 (带节流)
    window.addEventListener('scroll', this.throttle(this.handleScroll, 500), true);
  }

  /**
   * 移除事件监听器
   */
  private detachEventListeners(): void {
    if (typeof window === 'undefined') {
      return;
    }

    window.removeEventListener('click', this.handleClick, true);
    window.removeEventListener('input', this.handleInput, true);
    window.removeEventListener('keydown', this.handleKeyDown, true);
    window.removeEventListener('popstate', this.handleNavigation, true);
    window.removeEventListener('scroll', this.handleScroll, true);
  }

  // 事件处理器
  private handleClick = (event: MouseEvent): void => {
    if (this.status !== RecorderStatus.RECORDING) return;
    
    const target = event.target as HTMLElement;
    if (!target) return;

    const selector = this.getSelector(target);
    
    this.addAction({
      type: RecordedActionType.CLICK,
      selector,
      pageUrl: window.location.href,
      pageTitle: document.title,
    });
  };

  private handleInput = (event: Event): void => {
    if (this.status !== RecorderStatus.RECORDING) return;
    
    const target = event.target as HTMLInputElement;
    if (!target || !this.config.captureValue) return;

    // 跳过密码等敏感字段
    if (!this.config.captureSensitive && 
        (target.type === 'password' || target.name?.toLowerCase().includes('password'))) {
      return;
    }

    // 去抖
    const now = Date.now();
    const lastTime = this.lastActionTime.get('input') || 0;
    if (now - lastTime < this.config.debounceDelay) {
      return;
    }
    this.lastActionTime.set('input', now);

    const selector = this.getSelector(target);
    
    this.addAction({
      type: RecordedActionType.TYPE,
      selector,
      value: target.value,
      pageUrl: window.location.href,
      pageTitle: document.title,
    });
  };

  private handleKeyDown = (event: KeyboardEvent): void => {
    if (this.status !== RecorderStatus.RECORDING) return;
    
    // 特殊按键
    if (['Enter', 'Tab', 'Escape', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(event.key)) {
      this.addAction({
        type: RecordedActionType.PRESS,
        selector: this.getSelector(event.target as HTMLElement),
        value: event.key,
        pageUrl: window.location.href,
        pageTitle: document.title,
      });
    }
  };

  private handleNavigation = (): void => {
    if (this.status !== RecorderStatus.RECORDING) return;

    this.addAction({
      type: RecordedActionType.NAVIGATE,
      selector: '',
      value: window.location.href,
      pageUrl: window.location.href,
      pageTitle: document.title,
    });
  };

  private handleScroll = (): void => {
    if (this.status !== RecorderStatus.RECORDING) return;

    this.addAction({
      type: RecordedActionType.SCROLL,
      selector: '',
      value: {
        x: window.scrollX,
        y: window.scrollY,
      },
      pageUrl: window.location.href,
      pageTitle: document.title,
    });
  };

  /**
   * 获取元素的 CSS 选择器
   */
  private getSelector(element: HTMLElement): string {
    if (element.id) {
      return `#${element.id}`;
    }

    if (element.className && typeof element.className === 'string') {
      const classes = element.className.split(' ').filter((c) => c).join('.');
      if (classes) {
        return `${element.tagName.toLowerCase()}.${classes}`;
      }
    }

    // 使用 nth-child
    if (element.parentElement) {
      const index = Array.from(element.parentElement.children).indexOf(element) + 1;
      return `${this.getSelector(element.parentElement)} > ${element.tagName.toLowerCase()}:nth-child(${index})`;
    }

    return element.tagName.toLowerCase();
  }

  /**
   * 节流函数
   */
  private throttle<T extends (...args: any[]) => any>(func: T, limit: number): T {
    let inThrottle: boolean;
    return ((...args: any[]) => {
      if (!inThrottle) {
        func.apply(this, args);
        inThrottle = true;
        setTimeout(() => (inThrottle = false), limit);
      }
    }) as T;
  }

  /**
   * 延迟等待
   */
  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  /**
   * 注册事件监听器
   */
  public on(event: string, callback: (data: any) => void): void {
    if (!this.eventListeners.has(event)) {
      this.eventListeners.set(event, []);
    }
    this.eventListeners.get(event)!.push(callback);
  }

  /**
   * 移除事件监听器
   */
  public off(event: string, callback: (data: any) => void): void {
    const listeners = this.eventListeners.get(event);
    if (listeners) {
      const index = listeners.indexOf(callback);
      if (index > -1) {
        listeners.splice(index, 1);
      }
    }
  }

  /**
   * 触发事件
   */
  private emit(event: string, data?: any): void {
    const listeners = this.eventListeners.get(event);
    if (listeners) {
      listeners.forEach((callback) => {
        try {
          callback(data);
        } catch (error) {
          console.error(`[OpenCLIRecorder] Event listener error for "${event}":`, error);
        }
      });
    }
  }

  /**
   * 更新录制配置
   */
  public updateConfig(config: Partial<RecorderConfig>): void {
    this.config = { ...this.config, ...config };
    this.emit('config:updated', this.config);
  }

  /**
   * 获取录制统计
   */
  public getStats(): {
    totalActions: number;
    actionTypes: Record<string, number>;
    averageActionsPerScript: number;
  } {
    const actionTypeCount = new Map<string, number>();
    
    this.currentActions.forEach((action) => {
      actionTypeCount.set(action.type, (actionTypeCount.get(action.type) || 0) + 1);
    });

    return {
      totalActions: this.currentActions.length,
      actionTypes: Object.fromEntries(actionTypeCount),
      averageActionsPerScript: this.currentActions.length > 0 ? 1 : 0,
    };
  }
}

// 导出单例实例
export const openCLIRecorderEnhanced = OpenCLIRecorderEnhanced.getInstance();
