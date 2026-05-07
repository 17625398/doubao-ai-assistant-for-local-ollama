/**
 * OpenCLI 技能包装器
 * 
 * 封装 OpenCLI CLI 命令，提供浏览器自动化能力
 */

import { logger } from './logger';

// 只在 Node.js 环境中导入 Node.js 特定模块
let execSync: any;
let spawn: any;

if (typeof window === 'undefined') {
  // Node.js 环境
  const { execSync: execSyncFn, spawn: spawnFn } = require('child_process');
  execSync = execSyncFn;
  spawn = spawnFn;
} else {
  // 浏览器环境 - 使用浏览器原生 API
  execSync = () => {
    throw new Error('execSync is not available in browser environment');
  };
  spawn = () => {
    throw new Error('spawn is not available in browser environment');
  };
}

export interface OpenCLICommand {
  /** 命令名称 */
  name: string;
  /** 子命令 */
  subcommand?: string;
  /** 命令参数 */
  args?: string[];
  /** 工作目录 */
  cwd?: string;
  /** 超时时间（毫秒） */
  timeout?: number;
}

export interface OpenCLIResult {
  /** 是否成功 */
  success: boolean;
  /** 输出内容 */
  output: string;
  /** 错误信息 */
  error?: string;
  /** 执行时间（毫秒） */
  duration?: number;
  /** 退出码 */
  exitCode?: number;
}

export interface BrowserState {
  /** 当前 URL */
  url: string;
  /** 页面标题 */
  title: string;
  /** 页面状态 */
  pageState?: Record<string, unknown>;
}

/**
 * OpenCLI 技能类
 * 
 * 提供浏览器自动化操作能力
 */
export class OpenCLISkill {
  private static instance: OpenCLISkill;
  private isAvailable = false;
  private daemonRunning = false;

  private constructor() {
    this.checkAvailability();
  }

  /**
   * 获取单例实例
   */
  public static getInstance(): OpenCLISkill {
    if (!OpenCLISkill.instance) {
      OpenCLISkill.instance = new OpenCLISkill();
    }
    return OpenCLISkill.instance;
  }

  /**
   * 检查 OpenCLI 是否可用
   */
  private checkAvailability(): void {
    try {
      const result = execSync('opencli --version', {
        encoding: 'utf-8',
        stdio: ['pipe', 'pipe', 'pipe'],
      });
      this.isAvailable = true;
      logger.info('[OpenCLI] 版本:', result.trim());
      this.checkDaemon();
    } catch (error) {
      this.isAvailable = false;
      logger.warn('[OpenCLI] 未安装或不可用');
    }
  }

  /**
   * 检查 Daemon 状态
   */
  private checkDaemon(): void {
    try {
      const result = execSync('opencli daemon status', {
        encoding: 'utf-8',
        stdio: ['pipe', 'pipe', 'pipe'],
      });
      this.daemonRunning = result.includes('running');
      if (!this.daemonRunning) {
        logger.warn('[OpenCLI] Daemon 未运行，尝试启动...');
        this.startDaemon();
      } else {
        logger.info('[OpenCLI] Daemon 运行正常');
      }
    } catch (error) {
      this.daemonRunning = false;
      logger.warn('[OpenCLI] Daemon 状态检查失败');
    }
  }

  /**
   * 启动 Daemon
   */
  private startDaemon(): void {
    try {
      execSync('opencli doctor', {
        encoding: 'utf-8',
        stdio: ['pipe', 'pipe', 'pipe'],
        timeout: 10000,
      });
      logger.info('[OpenCLI] Daemon 已启动');
      this.daemonRunning = true;
    } catch (error) {
      logger.error('[OpenCLI] Daemon 启动失败');
    }
  }

  /**
   * 判断 OpenCLI 是否可用
   */
  public isReady(): boolean {
    return this.isAvailable && this.daemonRunning;
  }

  /**
   * 执行 OpenCLI 命令
   */
  public async execute(command: OpenCLICommand): Promise<OpenCLIResult> {
    const startTime = Date.now();
    
    try {
      const args = [command.name];
      if (command.subcommand) {
        args.push(command.subcommand);
      }
      if (command.args) {
        args.push(...command.args);
      }

      logger.info('[OpenCLI] 执行命令:', args.join(' '));

      const result = execSync(`opencli ${args.join(' ')}`, {
        encoding: 'utf-8',
        stdio: ['pipe', 'pipe', 'pipe'],
        cwd: command.cwd,
        timeout: command.timeout || 30000,
      });

      return {
        success: true,
        output: result,
        duration: Date.now() - startTime,
        exitCode: 0,
      };
    } catch (error: unknown) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      logger.error('[OpenCLI] 命令执行失败:', errorMsg);
      
      return {
        success: false,
        output: '',
        error: errorMsg,
        duration: Date.now() - startTime,
        exitCode: 1,
      };
    }
  }

  /**
   * 打开网页
   */
  public async open(url: string): Promise<OpenCLIResult> {
    return this.execute({
      name: 'operate',
      subcommand: 'open',
      args: [url],
      timeout: 10000,
    });
  }

  /**
   * 获取页面状态
   */
  public async getState(): Promise<BrowserState | null> {
    try {
      const result = await this.execute({
        name: 'operate',
        subcommand: 'state',
        timeout: 5000,
      });

      if (result.success && result.output) {
        // 解析输出获取页面状态
        const lines = result.output.split('\n');
        const state: BrowserState = {
          url: '',
          title: '',
        };

        for (const line of lines) {
          if (line.startsWith('URL:')) {
            state.url = line.replace('URL:', '').trim();
          } else if (line.startsWith('Title:')) {
            state.title = line.replace('Title:', '').trim();
          }
        }

        return state;
      }
      
      return null;
    } catch (error) {
      logger.error('[OpenCLI] 获取页面状态失败');
      return null;
    }
  }

  /**
   * 点击元素
   */
  public async click(selector: string): Promise<OpenCLIResult> {
    return this.execute({
      name: 'operate',
      subcommand: 'click',
      args: [selector],
      timeout: 5000,
    });
  }

  /**
   * 输入文本
   */
  public async type(selector: string, text: string): Promise<OpenCLIResult> {
    return this.execute({
      name: 'operate',
      subcommand: 'type',
      args: [selector, text],
      timeout: 5000,
    });
  }

  /**
   * 截图
   */
  public async screenshot(outputPath?: string): Promise<OpenCLIResult> {
    const args = outputPath ? ['--output', outputPath] : [];
    return this.execute({
      name: 'operate',
      subcommand: 'screenshot',
      args: args,
      timeout: 5000,
    });
  }

  /**
   * 滚动页面
   */
  public async scroll(direction: 'up' | 'down' | 'left' | 'right', amount?: number): Promise<OpenCLIResult> {
    const args = [direction as string];
    if (amount) {
      args.push(amount.toString());
    }
    return this.execute({
      name: 'operate',
      subcommand: 'scroll',
      args: args,
      timeout: 5000,
    });
  }

  /**
   * 等待
   */
  public async wait(condition: string, timeout?: number): Promise<OpenCLIResult> {
    const args = [condition];
    if (timeout) {
      args.push('--timeout', timeout.toString());
    }
    return this.execute({
      name: 'operate',
      subcommand: 'wait',
      args: args,
      timeout: timeout || 30000,
    });
  }

  /**
   * 获取元素内容
   */
  public async get(selector: string): Promise<OpenCLIResult> {
    return this.execute({
      name: 'operate',
      subcommand: 'get',
      args: [selector],
      timeout: 5000,
    });
  }

  /**
   * 执行 JavaScript
   */
  public async eval(script: string): Promise<OpenCLIResult> {
    return this.execute({
      name: 'operate',
      subcommand: 'eval',
      args: [script],
      timeout: 5000,
    });
  }

  /**
   * 关闭页面
   */
  public async close(): Promise<OpenCLIResult> {
    return this.execute({
      name: 'operate',
      subcommand: 'close',
      timeout: 5000,
    });
  }

  /**
   * 返回列表
   */
  public async back(): Promise<OpenCLIResult> {
    return this.execute({
      name: 'operate',
      subcommand: 'back',
      timeout: 5000,
    });
  }
}

// 导出单例
export const opencli = OpenCLISkill.getInstance();
