/**
 * Oh My Browser 插件集成服务
 * 提供网页搜索和交互功能
 */
import { logger } from '../utils/logger';
import { eventBus } from '../utils/event-bus';
import { spawn } from 'child_process';
import { promisify } from 'util';

/**
 * Oh My Browser 插件状态
 */
export type OhMyBrowserStatus = 'disconnected' | 'connecting' | 'connected' | 'error';

/**
 * Oh My Browser 搜索参数
 */
export interface OhMyBrowserSearchParams {
  query: string;
  max_results?: number;
  engine?: 'auto' | 'google' | 'baidu' | 'sogou';
  language?: string;
  region?: string;
}

/**
 * Oh My Browser 读取参数
 */
export interface OhMyBrowserReadParams {
  url: string;
  format?: 'markdown' | 'text' | 'html';
  timeout?: number;
  wait?: number;
}

/**
 * Oh My Browser 操作参数
 */
export interface OhMyBrowserActionParams {
  action: 'click' | 'fill' | 'scroll' | 'screenshot' | 'evaluate' | 'keypress';
  tabId?: number;
  selector?: string;
  value?: string;
  key?: string;
  code?: string;
  annotate?: boolean;
  wait?: number;
}

/**
 * Oh My Browser 映射参数
 */
export interface OhMyBrowserMapParams {
  tabId?: number;
  label?: string;
  types?: string[];
  region?: string;
}

/**
 * Oh My Browser 快照参数
 */
export interface OhMyBrowserSnapshotParams {
  tabId?: number;
  format?: 'markdown' | 'text' | 'html';
  wait?: number;
}

/**
 * Oh My Browser 插件集成服务
 */
export class ChatClawOhMyBrowserService {
  private static instance: ChatClawOhMyBrowserService;
  private status: OhMyBrowserStatus = 'disconnected';
  private ombProcess: any = null;
  private messageId = 0;
  private messageHandlers: Map<number, { resolve: Function; reject: Function }> = new Map();
  private outputBuffer: string = '';

  /**
   * 私有构造函数
   */
  private constructor() {
    this.initialize();
  }

  /**
   * 获取单例实例
   */
  public static getInstance(): ChatClawOhMyBrowserService {
    if (!ChatClawOhMyBrowserService.instance) {
      ChatClawOhMyBrowserService.instance = new ChatClawOhMyBrowserService();
    }
    return ChatClawOhMyBrowserService.instance;
  }

  /**
   * 初始化服务
   */
  private initialize(): void {
    logger.info('Initializing Oh My Browser plugin service');
    
    // 注册事件监听器
    eventBus.on('oh-my-browser:connect', () => this.connect());
    eventBus.on('oh-my-browser:disconnect', () => this.disconnect());
    eventBus.on('oh-my-browser:search', (params: OhMyBrowserSearchParams) => this.search(params));
    eventBus.on('oh-my-browser:read', (params: OhMyBrowserReadParams) => this.read(params));
    eventBus.on('oh-my-browser:action', (params: OhMyBrowserActionParams) => this.action(params));
    eventBus.on('oh-my-browser:map', (params: OhMyBrowserMapParams) => this.map(params));
    eventBus.on('oh-my-browser:snapshot', (params: OhMyBrowserSnapshotParams) => this.snapshot(params));
  }

  /**
   * 连接到 Oh My Browser
   */
  public async connect(): Promise<boolean> {
    if (this.status === 'connected') {
      logger.info('Oh My Browser is already connected');
      return true;
    }

    if (this.status === 'connecting') {
      logger.info('Oh My Browser is already connecting');
      return false;
    }

    this.status = 'connecting';
    logger.info('Connecting to Oh My Browser...');

    try {
      // 启动 omb 进程
      this.ombProcess = spawn('omb', ['plugin']);

      // 处理 stdout
      this.ombProcess.stdout.on('data', (data: Buffer) => {
        this.handleOutput(data.toString());
      });

      // 处理 stderr
      this.ombProcess.stderr.on('data', (data: Buffer) => {
        logger.error('Oh My Browser stderr:', data.toString());
      });

      // 处理进程退出
      this.ombProcess.on('exit', (code: number) => {
        logger.info(`Oh My Browser process exited with code ${code}`);
        this.status = 'disconnected';
        this.ombProcess = null;
        eventBus.emit('oh-my-browser:disconnected', null);
      });

      // 等待进程启动
      await new Promise(resolve => setTimeout(resolve, 1000));

      if (this.ombProcess && this.ombProcess.pid) {
        this.status = 'connected';
        logger.info('Oh My Browser connected successfully');
        eventBus.emit('oh-my-browser:connected', null);
        return true;
      } else {
        throw new Error('Failed to start Oh My Browser process');
      }
    } catch (error) {
      this.status = 'error';
      logger.error('Failed to connect to Oh My Browser:', error);
      eventBus.emit('oh-my-browser:connection-error', error);
      return false;
    }
  }

  /**
   * 断开与 Oh My Browser 的连接
   */
  public disconnect(): boolean {
    if (this.status === 'disconnected') {
      logger.info('Oh My Browser is already disconnected');
      return true;
    }

    logger.info('Disconnecting from Oh My Browser...');

    try {
      if (this.ombProcess) {
        this.ombProcess.kill();
        this.ombProcess = null;
      }

      this.status = 'disconnected';
      this.messageHandlers.clear();
      this.outputBuffer = '';
      logger.info('Oh My Browser disconnected successfully');
      eventBus.emit('oh-my-browser:disconnected', null);
      return true;
    } catch (error) {
      logger.error('Failed to disconnect from Oh My Browser:', error);
      return false;
    }
  }

  /**
   * 获取插件状态
   */
  public getStatus(): OhMyBrowserStatus {
    return this.status;
  }

  /**
   * 处理 omb 输出
   */
  private handleOutput(output: string): void {
    this.outputBuffer += output;
    
    // 处理完整的 JSON 消息
    const lines = this.outputBuffer.split('\n');
    for (const line of lines) {
      if (line.trim()) {
        try {
          const message = JSON.parse(line);
          this.handleMessage(message);
        } catch (error) {
          // 忽略非 JSON 输出
        }
      }
    }
    
    // 保留未处理的部分
    this.outputBuffer = lines[lines.length - 1] || '';
  }

  /**
   * 处理 omb 消息
   */
  private handleMessage(message: any): void {
    if (message.id && this.messageHandlers.has(message.id)) {
      const handler = this.messageHandlers.get(message.id);
      if (handler) {
        if (message.error) {
          handler.reject(new Error(message.error));
        } else {
          handler.resolve(message.result);
        }
        this.messageHandlers.delete(message.id);
      }
    }
  }

  /**
   * 发送消息到 omb
   */
  private sendMessage(method: string, params: any): Promise<any> {
    return new Promise((resolve, reject) => {
      if (!this.ombProcess || this.status !== 'connected') {
        reject(new Error('Oh My Browser is not connected'));
        return;
      }

      const id = ++this.messageId;
      this.messageHandlers.set(id, { resolve, reject });

      const message = JSON.stringify({
        jsonrpc: '2.0',
        id,
        method,
        params
      });

      this.ombProcess.stdin.write(message + '\n');
    });
  }

  /**
   * 搜索网页
   */
  public async search(params: OhMyBrowserSearchParams): Promise<any> {
    try {
      logger.info('Searching web:', params.query);
      const result = await this.sendMessage('omb_search', params);
      logger.info('Search result received');
      return result;
    } catch (error) {
      logger.error('Failed to search web:', error);
      throw error;
    }
  }

  /**
   * 读取网页内容
   */
  public async read(params: OhMyBrowserReadParams): Promise<any> {
    try {
      logger.info('Reading webpage:', params.url);
      const result = await this.sendMessage('omb_read', params);
      logger.info('Webpage content received');
      return result;
    } catch (error) {
      logger.error('Failed to read webpage:', error);
      throw error;
    }
  }

  /**
   * 执行浏览器操作
   */
  public async action(params: OhMyBrowserActionParams): Promise<any> {
    try {
      logger.info('Executing browser action:', params.action);
      const result = await this.sendMessage('omb_action', params);
      logger.info('Browser action executed');
      return result;
    } catch (error) {
      logger.error('Failed to execute browser action:', error);
      throw error;
    }
  }

  /**
   * 查找页面元素
   */
  public async map(params: OhMyBrowserMapParams): Promise<any> {
    try {
      logger.info('Mapping page elements');
      const result = await this.sendMessage('omb_map', params);
      logger.info('Page elements mapped');
      return result;
    } catch (error) {
      logger.error('Failed to map page elements:', error);
      throw error;
    }
  }

  /**
   * 创建可访问性快照
   */
  public async snapshot(params: OhMyBrowserSnapshotParams): Promise<any> {
    try {
      logger.info('Creating accessibility snapshot');
      const result = await this.sendMessage('omb_snapshot', params);
      logger.info('Accessibility snapshot created');
      return result;
    } catch (error) {
      logger.error('Failed to create accessibility snapshot:', error);
      throw error;
    }
  }

  /**
   * 获取插件信息
   */
  public async getInfo(): Promise<any> {
    try {
      logger.info('Getting Oh My Browser info');
      const result = await this.sendMessage('omb_info', {});
      logger.info('Oh My Browser info received');
      return result;
    } catch (error) {
      logger.error('Failed to get Oh My Browser info:', error);
      throw error;
    }
  }

  /**
   * 检查插件是否安装
   */
  public async checkInstallation(): Promise<boolean> {
    try {
      // 尝试运行 omb 命令
      const { exec } = require('child_process');
      const execAsync = promisify(exec);
      
      const { stdout } = await execAsync('omb --version');
      logger.info('Oh My Browser is installed:', stdout.trim());
      return true;
    } catch (error) {
      logger.error('Oh My Browser is not installed:', error);
      return false;
    }
  }

  /**
   * 安装插件
   */
  public async install(): Promise<boolean> {
    try {
      logger.info('Installing Oh My Browser...');
      
      // 这里应该执行安装命令
      // 由于环境限制，实际安装需要用户手动执行
      logger.info('Please install Oh My Browser manually by running: curl -fsSL https://api.omb.org.cn/install | bash');
      
      return false;
    } catch (error) {
      logger.error('Failed to install Oh My Browser:', error);
      return false;
    }
  }
}

// 导出单例
export const chatClawOhMyBrowserService = ChatClawOhMyBrowserService.getInstance();
