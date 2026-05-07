/**
 * OpenCLI HTTP 连接池模块
 * 
 * 管理 HTTP 连接，实现连接复用，减少连接建立开销
 * 支持 Keep-Alive、连接健康检查、自动故障转移
 */

import { type CommandResult } from './opencli-bridge';

/**
 * 连接状态
 */
export enum ConnectionStatus {
  IDLE = 'idle',
  ACTIVE = 'active',
  ERROR = 'error',
  CLOSED = 'closed',
}

/**
 * 连接配置
 */
export interface ConnectionConfig {
  maxConnections: number;
  maxIdleTime: number; // 毫秒
  keepAlive: boolean;
  timeout: number;
  retryCount: number;
}

/**
 * HTTP 连接类
 */
class HTTPConnection {
  public id: string;
  public baseUrl: string;
  public status: ConnectionStatus = ConnectionStatus.IDLE;
  public lastUsedTime: number = Date.now();
  public requestCount: number = 0;
  
  private controller: AbortController | null = null;
  
  constructor(id: string, baseUrl: string) {
    this.id = id;
    this.baseUrl = baseUrl;
  }
  
  /**
   * 发送请求
   */
  public async request(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<Response> {
    this.status = ConnectionStatus.ACTIVE;
    this.lastUsedTime = Date.now();
    this.requestCount++;
    
    this.controller = new AbortController();
    
    try {
      const response = await fetch(`${this.baseUrl}${endpoint}`, {
        ...options,
        signal: this.controller.signal,
      });
      
      this.status = ConnectionStatus.IDLE;
      return response;
    } catch (error) {
      this.status = ConnectionStatus.ERROR;
      throw error;
    } finally {
      this.controller = null;
    }
  }
  
  /**
   * 关闭连接
   */
  public close(): void {
    if (this.controller) {
      this.controller.abort();
      this.controller = null;
    }
    this.status = ConnectionStatus.CLOSED;
  }
  
  /**
   * 检查连接是否可用
   */
  public isAvailable(): boolean {
    return this.status === ConnectionStatus.IDLE;
  }
  
  /**
   * 获取连接信息
   */
  public getInfo(): {
    id: string;
    baseUrl: string;
    status: string;
    lastUsedTime: number;
    requestCount: number;
  } {
    return {
      id: this.id,
      baseUrl: this.baseUrl,
      status: this.status,
      lastUsedTime: this.lastUsedTime,
      requestCount: this.requestCount,
    };
  }
}

/**
 * 连接池配置
 */
const defaultConfig: ConnectionConfig = {
  maxConnections: 5,
  maxIdleTime: 60000, // 1 分钟
  keepAlive: true,
  timeout: 30000,
  retryCount: 3,
};

/**
 * HTTP 连接池类
 * 
 * 单例模式，管理所有 HTTP 连接
 */
export class ConnectionPool {
  private static instance: ConnectionPool | null = null;
  
  private connections: Map<string, HTTPConnection> = new Map();
  private config: ConnectionConfig = defaultConfig;
  private baseUrl: string = 'http://localhost:19825';
  
  private eventListeners: Map<string, Array<(data: any) => void>> = new Map();
  
  /**
   * 私有构造函数 (单例模式)
   */
  private constructor() {}
  
  /**
   * 获取单例实例
   */
  public static getInstance(): ConnectionPool {
    if (!ConnectionPool.instance) {
      ConnectionPool.instance = new ConnectionPool();
    }
    return ConnectionPool.instance;
  }
  
  /**
   * 生成连接 ID
   */
  private generateId(): string {
    return `conn_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
  
  /**
   * 获取可用连接
   */
  private async getAvailableConnection(): Promise<HTTPConnection> {
    // 查找空闲连接
    for (const connection of this.connections.values()) {
      if (connection.isAvailable()) {
        return connection;
      }
    }
    
    // 如果没有可用连接且未达到上限，创建新连接
    if (this.connections.size < this.config.maxConnections) {
      const connection = new HTTPConnection(this.generateId(), this.baseUrl);
      this.connections.set(connection.id, connection);
      this.emit('connection:created', { id: connection.id });
      return connection;
    }
    
    // 等待可用连接
    return new Promise((resolve) => {
      const checkConnection = () => {
        for (const connection of this.connections.values()) {
          if (connection.isAvailable()) {
            resolve(connection);
            return;
          }
        }
        setTimeout(checkConnection, 50);
      };
      checkConnection();
    });
  }
  
  /**
   * 执行请求（带重试）
   */
  public async execute(
    endpoint: string,
    options: RequestInit = {},
    retryCount: number = 0
  ): Promise<CommandResult> {
    const startTime = Date.now();
    
    try {
      const connection = await this.getAvailableConnection();
      
      const response = await connection.request(endpoint, {
        ...options,
        headers: {
          'Content-Type': 'application/json',
          ...options.headers,
        },
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`HTTP ${response.status}: ${errorText}`);
      }
      
      const result = await response.json();
      const duration = Date.now() - startTime;
      
      this.emit('request:completed', { endpoint, duration, success: true });
      
      return {
        success: true,
        data: result,
        message: '请求成功',
      };
    } catch (error) {
      const duration = Date.now() - startTime;
      const errorMsg = error instanceof Error ? error.message : '未知错误';
      
      // 自动重试
      if (retryCount < this.config.retryCount) {
        console.warn(`[ConnectionPool] 请求失败，重试 ${retryCount + 1}/${this.config.retryCount}:`, endpoint);
        await this.delay(100 * (retryCount + 1));
        return this.execute(endpoint, options, retryCount + 1);
      }
      
      this.emit('request:failed', { endpoint, duration, error: errorMsg });
      
      return {
        success: false,
        error: 'REQUEST_FAILED',
        message: errorMsg,
      };
    }
  }
  
  /**
   * GET 请求
   */
  public async get(endpoint: string): Promise<CommandResult> {
    return this.execute(endpoint, { method: 'GET' });
  }
  
  /**
   * POST 请求
   */
  public async post(endpoint: string, data: any): Promise<CommandResult> {
    return this.execute(endpoint, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }
  
  /**
   * 健康检查
   */
  public async healthCheck(): Promise<boolean> {
    try {
      const result = await this.get('/status');
      return result.success;
    } catch {
      return false;
    }
  }
  
  /**
   * 清理空闲连接
   */
  public cleanup(): void {
    const now = Date.now();
    const toRemove: string[] = [];
    
    for (const [id, connection] of this.connections.entries()) {
      if (
        connection.status === ConnectionStatus.IDLE &&
        now - connection.lastUsedTime > this.config.maxIdleTime
      ) {
        connection.close();
        toRemove.push(id);
        this.emit('connection:closed', { id, reason: 'idle_timeout' });
      }
    }
    
    toRemove.forEach((id) => this.connections.delete(id));
    
    if (toRemove.length > 0) {
      console.log(`[ConnectionPool] 清理了 ${toRemove.length} 个空闲连接`);
    }
  }
  
  /**
   * 关闭所有连接
   */
  public closeAll(): void {
    for (const connection of this.connections.values()) {
      connection.close();
      this.emit('connection:closed', { id: connection.id, reason: 'pool_closed' });
    }
    this.connections.clear();
  }
  
  /**
   * 获取连接池状态
   */
  public getStatus(): {
    totalConnections: number;
    activeConnections: number;
    idleConnections: number;
    errorConnections: number;
  } {
    let activeConnections = 0;
    let idleConnections = 0;
    let errorConnections = 0;
    
    for (const connection of this.connections.values()) {
      switch (connection.status) {
        case ConnectionStatus.ACTIVE:
          activeConnections++;
          break;
        case ConnectionStatus.IDLE:
          idleConnections++;
          break;
        case ConnectionStatus.ERROR:
          errorConnections++;
          break;
      }
    }
    
    return {
      totalConnections: this.connections.size,
      activeConnections,
      idleConnections,
      errorConnections,
    };
  }
  
  /**
   * 获取连接信息列表
   */
  public getConnectionsInfo(): Array<{
    id: string;
    baseUrl: string;
    status: string;
    lastUsedTime: number;
    requestCount: number;
  }> {
    return Array.from(this.connections.values()).map((conn) => conn.getInfo());
  }
  
  /**
   * 更新配置
   */
  public updateConfig(config: Partial<ConnectionConfig>): void {
    this.config = { ...this.config, ...config };
    this.emit('config:updated', this.config);
  }
  
  /**
   * 设置基础 URL
   */
  public setBaseUrl(url: string): void {
    this.baseUrl = url;
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
          console.error(`[ConnectionPool] Event listener error for "${event}":`, error);
        }
      });
    }
  }
  
  /**
   * 延迟等待
   */
  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
  
  /**
   * 启动定期清理
   */
  public startCleanup(interval: number = 60000): void {
    setInterval(() => this.cleanup(), interval);
  }
}

// 导出单例实例
export const connectionPool = ConnectionPool.getInstance();
