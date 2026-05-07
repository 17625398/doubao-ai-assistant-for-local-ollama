/**
 * OpenCLI 脚本录制和回放模块
 * 
 * 提供浏览器操作录制、脚本生成和回放功能
 */

import { opencli } from './opencli-skill';
import { opencliVisualizer } from './opencli-visualizer';
import { logger } from './logger';

/**
 * 录制的操作类型
 */
export type RecordedActionType = 
  | 'open'
  | 'click'
  | 'type'
  | 'scroll'
  | 'wait'
  | 'screenshot'
  | 'eval'
  | 'get'
  | 'close';

/**
 * 录制的操作
 */
export interface RecordedAction {
  /** 操作类型 */
  type: RecordedActionType;
  /** 选择器 */
  selector?: string;
  /** 值（用于 type 操作） */
  value?: string;
  /** 参数 */
  params?: any[];
  /** 时间戳 */
  timestamp: number;
  /** 操作描述 */
  description?: string;
}

/**
 * 录制的脚本
 */
export interface RecordedScript {
  /** 脚本名称 */
  name: string;
  /** 创建时间 */
  createdAt: number;
  /** 操作列表 */
  actions: RecordedAction[];
  /** 元数据 */
  metadata?: {
    /** 初始 URL */
    initialUrl?: string;
    /** 总操作数 */
    totalActions?: number;
    /** 录制时长（毫秒） */
    duration?: number;
  };
}

/**
 * 回放选项
 */
export interface PlaybackOptions {
  /** 操作间延迟（毫秒） */
  delayBetweenActions?: number;
  /** 失败时是否停止 */
  stopOnError?: boolean;
  /** 是否显示可视化反馈 */
  showVisualFeedback?: boolean;
  /** 超时时间（毫秒） */
  timeout?: number;
}

/**
 * 回放结果
 */
export interface PlaybackResult {
  /** 是否成功 */
  success: boolean;
  /** 完成的操作数 */
  completedActions: number;
  /** 失败的操作索引 */
  failedAtIndex?: number;
  /** 错误信息 */
  error?: string;
  /** 执行时长（毫秒） */
  duration: number;
}

/**
 * OpenCLI 脚本录制器
 */
export class OpenCLIRecorder {
  private static instance: OpenCLIRecorder;
  private isRecording = false;
  private recordedActions: RecordedAction[] = [];
  private startTime: number = 0;
  private scripts: Map<string, RecordedScript> = new Map();

  private constructor() {}

  /**
   * 获取单例实例
   */
  public static getInstance(): OpenCLIRecorder {
    if (!OpenCLIRecorder.instance) {
      OpenCLIRecorder.instance = new OpenCLIRecorder();
    }
    return OpenCLIRecorder.instance;
  }

  /**
   * 开始录制
   */
  public start(scriptName: string = '未命名脚本'): void {
    if (this.isRecording) {
      logger.warn('[OpenCLIRecorder] 已在录制中');
      return;
    }

    this.isRecording = true;
    this.recordedActions = [];
    this.startTime = Date.now();

    opencliVisualizer.showToast(`开始录制：${scriptName}`, 'info');
    opencliVisualizer.updateStatus('🔴 录制中...', 'busy');

    logger.info('[OpenCLIRecorder] 开始录制');
  }

  /**
   * 停止录制
   */
  public stop(): RecordedScript {
    if (!this.isRecording) {
      logger.warn('[OpenCLIRecorder] 未在录制中');
      return this.createScript('未命名脚本');
    }

    this.isRecording = false;
    const duration = Date.now() - this.startTime;
    const script = this.createScript('录制脚本', duration);

    opencliVisualizer.showToast(`录制完成：${script.actions.length} 个操作`, 'success');
    opencliVisualizer.updateStatus('OpenCLI 就绪', 'ready');

    logger.info('[OpenCLIRecorder] 停止录制，共录制', script.actions.length, '个操作');

    return script;
  }

  /**
   * 创建脚本
   */
  private createScript(name: string, duration?: number): RecordedScript {
    const script: RecordedScript = {
      name,
      createdAt: Date.now(),
      actions: this.recordedActions,
      metadata: {
        totalActions: this.recordedActions.length,
        duration,
      },
    };

    // 保存脚本
    const scriptId = `script_${Date.now()}`;
    this.scripts.set(scriptId, script);

    return script;
  }

  /**
   * 录制打开操作
   */
  public recordOpen(url: string): void {
    if (!this.isRecording) return;

    this.recordedActions.push({
      type: 'open',
      params: [url],
      timestamp: Date.now(),
      description: `打开 ${url}`,
    });

    logger.info('[OpenCLIRecorder] 录制 open:', url);
  }

  /**
   * 录制点击操作
   */
  public recordClick(selector: string): void {
    if (!this.isRecording) return;

    this.recordedActions.push({
      type: 'click',
      selector,
      timestamp: Date.now(),
      description: `点击 ${selector}`,
    });

    logger.info('[OpenCLIRecorder] 录制 click:', selector);
  }

  /**
   * 录制输入操作
   */
  public recordType(selector: string, value: string): void {
    if (!this.isRecording) return;

    this.recordedActions.push({
      type: 'type',
      selector,
      value,
      timestamp: Date.now(),
      description: `输入 "${value}" 到 ${selector}`,
    });

    logger.info('[OpenCLIRecorder] 录制 type:', selector, value);
  }

  /**
   * 录制滚动操作
   */
  public recordScroll(direction: 'up' | 'down' | 'left' | 'right', amount?: number): void {
    if (!this.isRecording) return;

    this.recordedActions.push({
      type: 'scroll',
      params: [direction, amount],
      timestamp: Date.now(),
      description: `滚动 ${direction}${amount ? ` ${amount}px` : ''}`,
    });

    logger.info('[OpenCLIRecorder] 录制 scroll:', direction, amount);
  }

  /**
   * 录制等待操作
   */
  public recordWait(condition: string, timeout?: number): void {
    if (!this.isRecording) return;

    this.recordedActions.push({
      type: 'wait',
      params: [condition, timeout],
      timestamp: Date.now(),
      description: `等待 ${condition}${timeout ? ` (${timeout}ms)` : ''}`,
    });

    logger.info('[OpenCLIRecorder] 录制 wait:', condition, timeout);
  }

  /**
   * 录制截图操作
   */
  public recordScreenshot(outputPath?: string): void {
    if (!this.isRecording) return;

    this.recordedActions.push({
      type: 'screenshot',
      params: [outputPath],
      timestamp: Date.now(),
      description: `截图${outputPath ? ` 到 ${outputPath}` : ''}`,
    });

    logger.info('[OpenCLIRecorder] 录制 screenshot:', outputPath);
  }

  /**
   * 录制 JS 执行操作
   */
  public recordEval(script: string): void {
    if (!this.isRecording) return;

    this.recordedActions.push({
      type: 'eval',
      params: [script],
      timestamp: Date.now(),
      description: `执行 JavaScript`,
    });

    logger.info('[OpenCLIRecorder] 录制 eval');
  }

  /**
   * 获取录制的脚本
   */
  public getScript(scriptId: string): RecordedScript | undefined {
    return this.scripts.get(scriptId);
  }

  /**
   * 获取所有脚本
   */
  public getAllScripts(): RecordedScript[] {
    return Array.from(this.scripts.values());
  }

  /**
   * 删除脚本
   */
  public deleteScript(scriptId: string): boolean {
    return this.scripts.delete(scriptId);
  }

  /**
   * 导出脚本为 JSON
   */
  public exportScript(scriptId: string): string | null {
    const script = this.scripts.get(scriptId);
    if (!script) return null;

    return JSON.stringify(script, null, 2);
  }

  /**
   * 导入脚本
   */
  public importScript(json: string): string | null {
    try {
      const script: RecordedScript = JSON.parse(json);
      const scriptId = `script_${Date.now()}`;
      this.scripts.set(scriptId, script);
      return scriptId;
    } catch (error) {
      logger.error('[OpenCLIRecorder] 导入脚本失败:', error);
      return null;
    }
  }

  /**
   * 回放脚本
   */
  public async playback(
    script: RecordedScript,
    options: PlaybackOptions = {}
  ): Promise<PlaybackResult> {
    const {
      delayBetweenActions = 500,
      stopOnError = true,
      showVisualFeedback = true,
      timeout = 30000,
    } = options;

    const startTime = Date.now();
    let completedActions = 0;

    logger.info('[OpenCLIRecorder] 开始回放脚本:', script.name);

    if (showVisualFeedback) {
      opencliVisualizer.updateStatus(`回放中：${script.name}`, 'busy');
    }

    try {
      for (let i = 0; i < script.actions.length; i++) {
        // 检查超时
        if (Date.now() - startTime > timeout) {
          return {
            success: false,
            completedActions,
            failedAtIndex: i,
            error: '回放超时',
            duration: Date.now() - startTime,
          };
        }

        const action = script.actions[i];

        try {
          await this.executeAction(action);
          completedActions++;

          if (showVisualFeedback) {
            opencliVisualizer.showToast(
              `执行 ${action.type} (${completedActions}/${script.actions.length})`,
              'success'
            );
          }

          // 操作间延迟
          if (i < script.actions.length - 1) {
            await new Promise(resolve => setTimeout(resolve, delayBetweenActions));
          }
        } catch (error) {
          const errorMsg = error instanceof Error ? error.message : String(error);
          logger.error('[OpenCLIRecorder] 回放失败:', action.type, errorMsg);

          if (stopOnError) {
            if (showVisualFeedback) {
              opencliVisualizer.updateStatus('回放失败', 'error');
              opencliVisualizer.showToast(`回放失败：${errorMsg}`, 'error');
            }

            return {
              success: false,
              completedActions,
              failedAtIndex: i,
              error: errorMsg,
              duration: Date.now() - startTime,
            };
          }
        }
      }

      const duration = Date.now() - startTime;

      if (showVisualFeedback) {
        opencliVisualizer.updateStatus('OpenCLI 就绪', 'ready');
        opencliVisualizer.showToast(
          `回放完成：${completedActions}/${script.actions.length} 个操作`,
          'success'
        );
      }

      logger.info('[OpenCLIRecorder] 回放完成:', script.name, `耗时 ${duration}ms`);

      return {
        success: true,
        completedActions,
        duration,
      };
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      logger.error('[OpenCLIRecorder] 回放异常:', errorMsg);

      if (showVisualFeedback) {
        opencliVisualizer.updateStatus('回放失败', 'error');
      }

      return {
        success: false,
        completedActions,
        error: errorMsg,
        duration: Date.now() - startTime,
      };
    }
  }

  /**
   * 执行单个操作
   */
  private async executeAction(action: RecordedAction): Promise<void> {
    switch (action.type) {
      case 'open':
        if (action.params?.[0]) {
          await opencli.open(action.params[0]);
        }
        break;

      case 'click':
        if (action.selector) {
          await opencli.click(action.selector);
        }
        break;

      case 'type':
        if (action.selector && action.value !== undefined) {
          await opencli.type(action.selector, action.value);
        }
        break;

      case 'scroll':
        if (action.params?.[0]) {
          await opencli.scroll(action.params[0], action.params?.[1]);
        }
        break;

      case 'wait':
        if (action.params?.[0]) {
          await opencli.wait(action.params[0], action.params?.[1]);
        } else {
          await new Promise(resolve => setTimeout(resolve, action.params?.[1] || 1000));
        }
        break;

      case 'screenshot':
        await opencli.screenshot(action.params?.[0]);
        break;

      case 'eval':
        if (action.params?.[0]) {
          await opencli.eval(action.params[0]);
        }
        break;

      case 'get':
        if (action.selector) {
          await opencli.get(action.selector);
        }
        break;

      case 'close':
        await opencli.close();
        break;
    }
  }

  /**
   * 清除所有录制的脚本
   */
  public clearAllScripts(): void {
    this.scripts.clear();
    logger.info('[OpenCLIRecorder] 已清除所有脚本');
  }

  /**
   * 获取录制状态
   */
  public getRecordingStatus(): {
    isRecording: boolean;
    recordedActionsCount: number;
    scriptsCount: number;
  } {
    return {
      isRecording: this.isRecording,
      recordedActionsCount: this.recordedActions.length,
      scriptsCount: this.scripts.size,
    };
  }
}

// 导出单例
export const opencliRecorder = OpenCLIRecorder.getInstance();
