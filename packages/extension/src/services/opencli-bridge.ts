/**
 * OpenCLI Bridge - OpenCLI CLI 与扩展程序的桥梁
 * 
 * 负责与 OpenCLI CLI 守护进程 (端口 19825) 进行 HTTP 通信
 * 集成连接池和缓存系统，提高性能
 * 
 * @see https://github.com/jackwener/opencli
 */

import { connectionPool } from './opencli-connection-pool';
import { commandCache } from './opencli-cache';
import { performanceMonitor } from './opencli-monitor';

/**
 * 命令执行结果
 */
export interface CommandResult {
  success: boolean;
  data?: any;
  error?: string;
  message?: string;
}

/**
 * OpenCLI 守护进程状态
 */
interface DaemonStatus {
  running: boolean;
  version?: string;
  port?: number;
  uptime?: number;
}

/**
 * OpenCLI Bridge 类
 * 
 * 单例模式，提供与 OpenCLI CLI 的所有通信功能
 */
export class OpenCLIBridge {
  private static instance: OpenCLIBridge | null = null;
  
  // OpenCLI CLI 守护进程默认地址
  private readonly daemonUrl: string = 'http://localhost:19825';
  
  // 请求超时时间 (毫秒)
  private readonly timeout: number = 30000;
  
  // 重试配置
  private readonly maxRetries: number = 3;
  private readonly retryDelay: number = 1000;
  
  // 缓存最近的状态检查结果
  private cachedStatus: DaemonStatus | null = null;
  private statusCacheTime: number = 0;
  private readonly statusCacheDuration: number = 5000; // 5 秒缓存
  
  /**
   * 私有构造函数 (单例模式)
   */
  private constructor() {}
  
  /**
   * 获取单例实例
   */
  public static getInstance(): OpenCLIBridge {
    if (!OpenCLIBridge.instance) {
      OpenCLIBridge.instance = new OpenCLIBridge();
    }
    return OpenCLIBridge.instance;
  }
  
  /**
   * 检查 OpenCLI 守护进程状态
   * 
   * @param forceRefresh 是否强制刷新 (忽略缓存)
   * @returns 守护进程状态
   */
  public async checkDaemonStatus(forceRefresh: boolean = false): Promise<DaemonStatus> {
    // 检查缓存
    if (!forceRefresh && this.cachedStatus && 
        Date.now() - this.statusCacheTime < this.statusCacheDuration) {
      return this.cachedStatus;
    }
    
    try {
      const response = await this.fetchWithTimeout('/status', {
        method: 'GET',
      });
      
      if (!response.ok) {
        throw new Error(`守护进程返回错误状态：${response.status}`);
      }
      
      const status = await response.json();
      
      // 更新缓存
      this.cachedStatus = {
        running: true,
        version: status.version,
        port: status.port || 19825,
        uptime: status.uptime,
      };
      this.statusCacheTime = Date.now();
      
      return this.cachedStatus;
    } catch (error) {
      // 连接失败，守护进程未运行
      this.cachedStatus = { running: false };
      this.statusCacheTime = Date.now();
      
      return { running: false };
    }
  }
  
  /**
   * 执行 OpenCLI 命令（集成缓存和连接池）
   * 
   * @param command 命令名称 (如：click, type, navigate 等)
   * @param args 命令参数
   * @param options 执行选项
   * @returns 命令执行结果
   */
  public async execute(
    command: string,
    args: Record<string, any> = {},
    options: { timeout?: number; retries?: number; useCache?: boolean } = {}
  ): Promise<CommandResult> {
    const startTime = Date.now();
    const useCache = options.useCache ?? true;
    
    // 在控制台显示命令执行信息
    console.group(`🔧 OpenCLI 命令：${command}`);
    console.log('📝 参数:', JSON.stringify(args, null, 2));
    console.log('⏱️ 开始时间:', new Date(startTime).toLocaleString());
    
    // 参数验证
    if (!command || typeof command !== 'string') {
      console.error('❌ 参数验证失败：命令名称必须是非空字符串');
      console.groupEnd();
      return {
        success: false,
        error: 'INVALID_COMMAND',
        message: '命令名称必须是非空字符串',
      };
    }
    
    // 尝试从缓存获取
    if (useCache) {
      const cachedResult = commandCache.get(command, args);
      if (cachedResult) {
        console.log('✅ 使用缓存结果');
        console.log('⚡ 耗时：0ms (缓存)');
        console.groupEnd();
        return cachedResult;
      } else {
        console.log('🔄 缓存未命中，执行实际命令');
      }
    }
    
    // 检查守护进程状态
    const status = await this.checkDaemonStatus();
    if (!status.running) {
      console.error('❌ 守护进程未运行');
      console.log('💡 提示：请先启动 OpenCLI CLI');
      console.groupEnd();
      return {
        success: false,
        error: 'DAEMON_NOT_RUNNING',
        message: 'OpenCLI 守护进程未运行。请先启动 OpenCLI CLI。',
      };
    }
    console.log('✅ 守护进程状态：运行中');
    
    // 使用连接池执行命令
    console.log('📡 发送请求到 OpenCLI 服务器...');
    const result = await connectionPool.execute(`/${command}`, {
      method: 'POST',
      body: JSON.stringify(args),
    });
    
    // 记录性能数据
    const duration = Date.now() - startTime;
    performanceMonitor.recordCommand(command, args, result, duration);
    
    // 显示执行结果
    if (result.success) {
      console.log('✅ 执行成功');
      if (result.data) {
        console.log('📊 返回数据:', JSON.stringify(result.data, null, 2));
      }
    } else {
      console.error('❌ 执行失败');
      console.error('错误代码:', result.error);
      console.error('错误信息:', result.message);
    }
    
    console.log('⏱️ 总耗时:', `${duration.toFixed(2)}ms`);
    console.groupEnd();
    
    // 缓存成功结果
    if (useCache && result.success) {
      commandCache.set(command, args, result);
    }
    
    return result;
  }
  
  /**
   * 批量执行命令
   * 
   * @param commands 命令数组
   * @param options 执行选项
   * @returns 每个命令的执行结果
   * 
   * @example
   * await bridge.batchExecute([
   *   { command: 'navigate', args: { url: 'https://example.com' } },
   *   { command: 'click', args: { selector: '#login-btn' } },
   *   { command: 'type', args: { selector: '#username', value: 'test' } }
   * ]);
   */
  public async batchExecute(
    commands: Array<{ command: string; args?: Record<string, any> }>,
    options: { stopOnError?: boolean; timeout?: number } = {}
  ): Promise<Array<CommandResult>> {
    const results: CommandResult[] = [];
    const stopOnError = options.stopOnError ?? false;
    
    for (const cmd of commands) {
      const result = await this.execute(cmd.command, cmd.args, { timeout: options.timeout });
      results.push(result);
      
      // 如果失败且要求停止，则中断
      if (!result.success && stopOnError) {
        break;
      }
    }
    
    return results;
  }
  
  /**
   * 获取当前会话信息
   */
  public async getSessionInfo(): Promise<CommandResult> {
    return await this.execute('session.info', {});
  }
  
  /**
   * 创建新会话
   */
  public async createSession(options?: { headless?: boolean }): Promise<CommandResult> {
    return await this.execute('session.create', options || {});
  }
  
  /**
   * 关闭当前会话
   */
  public async closeSession(): Promise<CommandResult> {
    return await this.execute('session.close', {});
  }
  
  /**
   * 截图
   * 
   * @param options 截图选项
   * @returns 截图结果 (base64 或文件路径)
   */
  public async screenshot(options?: { fullPage?: boolean; selector?: string }): Promise<CommandResult> {
    return await this.execute('screenshot', options || {});
  }
  
  /**
   * 提取页面内容
   * 
   * @param selector CSS 选择器 (可选，不传则提取整个页面)
   * @returns 提取的内容
   */
  public async extractContent(selector?: string): Promise<CommandResult> {
    return await this.execute('extract.content', { selector: selector || null });
  }
  
  /**
   * 提取页面链接
   * 
   * @param options 提取选项
   * @returns 链接列表
   */
  public async extractLinks(options?: { internal?: boolean; external?: boolean }): Promise<CommandResult> {
    return await this.execute('extract.links', options || {});
  }
  
  /**
   * 执行自定义 JavaScript
   * 
   * @param script JavaScript 代码
   * @returns 执行结果
   */
  public async evaluate(script: string): Promise<CommandResult> {
    return await this.execute('evaluate', { script });
  }
  
  /**
   * 等待元素出现
   * 
   * @param selector CSS 选择器
   * @param timeout 超时时间 (毫秒)
   * @returns 等待结果
   */
  public async waitForElement(selector: string, timeout?: number): Promise<CommandResult> {
    return await this.execute('wait.element', { selector, timeout });
  }
  
  /**
   * 等待页面加载完成
   * 
   * @param timeout 超时时间 (毫秒)
   * @returns 等待结果
   */
  public async waitForLoad(timeout?: number): Promise<CommandResult> {
    return await this.execute('wait.load', { timeout });
  }
  
  /**
   * 导航到 URL
   * 
   * @param url 目标 URL
   * @param options 导航选项
   * @returns 导航结果
   */
  public async navigate(url: string, options?: { waitUntil?: 'load' | 'domcontentloaded' | 'networkidle' }): Promise<CommandResult> {
    return await this.execute('navigate', { url, ...options });
  }
  
  /**
   * 点击元素
   * 
   * @param selector CSS 选择器
   * @param options 点击选项
   * @returns 点击结果
   */
  public async click(selector: string, options?: { delay?: number; button?: 'left' | 'right' | 'middle' }): Promise<CommandResult> {
    return await this.execute('click', { selector, ...options });
  }
  
  /**
   * 输入文本
   * 
   * @param selector CSS 选择器
   * @param value 要输入的文本
   * @param options 输入选项
   * @returns 输入结果
   */
  public async type(selector: string, value: string, options?: { delay?: number; clear?: boolean }): Promise<CommandResult> {
    return await this.execute('type', { selector, value, ...options });
  }
  
  /**
   * 按下键盘按键
   * 
   * @param key 按键名称 (如：'Enter', 'Tab', 'ArrowDown')
   * @param options 按键选项
   * @returns 按键结果
   */
  public async press(key: string, options?: { count?: number; delay?: number }): Promise<CommandResult> {
    return await this.execute('press', { key, ...options });
  }
  
  /**
   * 获取元素属性
   * 
   * @param selector CSS 选择器
   * @param attribute 属性名
   * @returns 属性值
   */
  public async getAttribute(selector: string, attribute: string): Promise<CommandResult> {
    return await this.execute('attribute.get', { selector, attribute });
  }
  
  /**
   * 设置元素属性
   * 
   * @param selector CSS 选择器
   * @param attribute 属性名
   * @param value 属性值
   * @returns 设置结果
   */
  public async setAttribute(selector: string, attribute: string, value: any): Promise<CommandResult> {
    return await this.execute('attribute.set', { selector, attribute, value });
  }
  
  /**
   * 获取元素文本
   * 
   * @param selector CSS 选择器
   * @returns 元素文本内容
   */
  public async getText(selector: string): Promise<CommandResult> {
    return await this.execute('text.get', { selector });
  }
  
  /**
   * 设置元素文本
   * 
   * @param selector CSS 选择器
   * @param value 文本内容
   * @returns 设置结果
   */
  public async setText(selector: string, value: string): Promise<CommandResult> {
    return await this.execute('text.set', { selector, value });
  }
  
  /**
   * 检查元素是否存在
   * 
   * @param selector CSS 选择器
   * @returns 是否存在
   */
  public async exists(selector: string): Promise<CommandResult> {
    return await this.execute('exists', { selector });
  }
  
  /**
   * 检查元素是否可见
   * 
   * @param selector CSS 选择器
   * @returns 是否可见
   */
  public async isVisible(selector: string): Promise<CommandResult> {
    return await this.execute('visible', { selector });
  }
  
  /**
   * 获取页面标题
   */
  public async getTitle(): Promise<CommandResult> {
    return await this.execute('title', {});
  }
  
  /**
   * 获取当前 URL
   */
  public async getCurrentUrl(): Promise<CommandResult> {
    return await this.execute('url', {});
  }
  
  /**
   * 后退
   */
  public async back(): Promise<CommandResult> {
    return await this.execute('back', {});
  }
  
  /**
   * 前进
   */
  public async forward(): Promise<CommandResult> {
    return await this.execute('forward', {});
  }
  
  /**
   * 刷新页面
   */
  public async refresh(): Promise<CommandResult> {
    return await this.execute('refresh', {});
  }
  
  /**
   * 设置视口大小
   * 
   * @param width 宽度
   * @param height 高度
   * @returns 设置结果
   */
  public async setViewport(width: number, height: number): Promise<CommandResult> {
    return await this.execute('viewport', { width, height });
  }
  
  /**
   * 滚动页面
   * 
   * @param options 滚动选项
   * @returns 滚动结果
   */
  public async scroll(options?: { x?: number; y?: number; selector?: string }): Promise<CommandResult> {
    return await this.execute('scroll', options || {});
  }
  
  /**
   * 等待指定时间
   * 
   * @param ms 等待时间 (毫秒)
   * @returns 等待结果
   */
  public async wait(ms: number): Promise<CommandResult> {
    return await this.execute('wait', { ms });
  }
  
  /**
   * 执行脚本文件
   * 
   * @param filePath 脚本文件路径
   * @param options 执行选项
   * @returns 执行结果
   */
  public async runScript(filePath: string, options?: { args?: any[] }): Promise<CommandResult> {
    return await this.execute('run', { file: filePath, ...options });
  }
  
  // ==================== 私有辅助方法 ====================
  
  /**
   * 带超时的 fetch 请求
   */
  private async fetchWithTimeout(
    url: string,
    options: RequestInit = {},
    timeout: number = this.timeout
  ): Promise<Response> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);
    
    try {
      const response = await fetch(`${this.daemonUrl}${url}`, {
        ...options,
        signal: controller.signal,
      });
      return response;
    } finally {
      clearTimeout(timeoutId);
    }
  }
  
  /**
   * 延迟等待
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
  
  /**
   * 清除缓存
   */
  public clearCache(): void {
    this.cachedStatus = null;
    this.statusCacheTime = 0;
  }
  
  /**
   * 设置守护进程地址
   * 
   * @param url 新的地址
   */
  public setDaemonUrl(url: string): void {
    // 清除缓存，因为状态可能已更改
    this.clearCache();
  }
}

// 导出单例实例
export const openCLIBridge = OpenCLIBridge.getInstance();
