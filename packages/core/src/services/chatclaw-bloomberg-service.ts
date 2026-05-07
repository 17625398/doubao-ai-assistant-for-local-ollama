/**
 * Bloomberg API 集成服务
 * 提供 Bloomberg 金融数据访问能力
 */
import { logger } from '../utils/logger';
import { eventBus } from '../utils/event-bus';

// Use built-in fetch API in browser, node-fetch in Node.js
let fetch: any;
if (typeof window === 'undefined') {
  // Node.js environment
  try {
    fetch = require('node-fetch');
  } catch (error) {
    // Fallback to global fetch if available
    fetch = globalThis.fetch || (() => Promise.reject(new Error('Fetch not available')));
  }
} else {
  // Browser environment - use native fetch API
  fetch = window.fetch;
}

/**
 * Bloomberg 连接状态
 */
export type BloombergConnectionStatus = 'disconnected' | 'connecting' | 'connected' | 'error';

/**
 * Bloomberg 数据类型
 */
export type BloombergDataType = 'reference' | 'historical' | 'market' | 'ticks' | 'bars' | 'fields' | 'eqs';

/**
 * Bloomberg 连接配置
 */
export interface BloombergConnectionConfig {
  host?: string;
  port?: number;
  apiKey?: string;
  autoConnect?: boolean;
  timeout?: number;
}

/**
 * Bloomberg 数据查询参数
 */
export interface BloombergQueryParams {
  securities: string[];
  fields: string[];
  startDate?: string;
  endDate?: string;
  options?: Record<string, any>;
}

/**
 * Bloomberg 数据响应
 */
export interface BloombergDataResponse {
  security: string;
  data: Record<string, any>[];
  errors?: string[];
}

/**
 * Bloomberg API 集成服务
 */
export class ChatClawBloombergService {
  private static instance: ChatClawBloombergService;
  private connectionStatus: BloombergConnectionStatus = 'disconnected';
  private connectionConfig: BloombergConnectionConfig = {
    host: '127.0.0.1',
    port: 8194,
    autoConnect: true,
    timeout: 30000
  };
  private openFigiApiKey: string = '';
  private lastConnectionAttempt: number = 0;
  private connectionRetryCount: number = 0;
  private maxConnectionRetries: number = 3;
  private connectionRetryDelay: number = 5000;

  /**
   * 私有构造函数
   */
  private constructor() {
    this.initialize();
  }

  /**
   * 获取单例实例
   */
  public static getInstance(): ChatClawBloombergService {
    if (!ChatClawBloombergService.instance) {
      ChatClawBloombergService.instance = new ChatClawBloombergService();
    }
    return ChatClawBloombergService.instance;
  }

  /**
   * 初始化服务
   */
  private initialize(): void {
    logger.info('Initializing Bloomberg API integration service');
    
    // 尝试自动连接
    if (this.connectionConfig.autoConnect) {
      this.connect();
    }

    // 注册事件监听器
    eventBus.on('bloomberg:connect', () => this.connect());
    eventBus.on('bloomberg:disconnect', () => this.disconnect());
    eventBus.on('bloomberg:query', (params: BloombergQueryParams) => this.queryData(params));
  }

  /**
   * 连接到 Bloomberg API
   */
  public async connect(config?: BloombergConnectionConfig): Promise<boolean> {
    if (this.connectionStatus === 'connected') {
      logger.info('Bloomberg API is already connected');
      return true;
    }

    if (this.connectionStatus === 'connecting') {
      logger.info('Bloomberg API is already connecting');
      return false;
    }

    // 更新配置
    if (config) {
      this.connectionConfig = { ...this.connectionConfig, ...config };
    }

    this.connectionStatus = 'connecting';
    logger.info('Connecting to Bloomberg API...');

    try {
      // 这里应该尝试连接到 Bloomberg API
      // 由于我们使用 HTTP API，这里只是模拟连接
      // 实际连接逻辑需要根据具体的 Bloomberg API 服务来实现
      
      // 模拟连接延迟
      await new Promise(resolve => setTimeout(resolve, 1000));

      // 检查 OpenFIGI API 密钥
      if (this.openFigiApiKey) {
        // 验证 OpenFIGI API 密钥
        const validationResult = await this.validateOpenFigiApiKey();
        if (!validationResult) {
          throw new Error('Invalid OpenFIGI API key');
        }
      }

      this.connectionStatus = 'connected';
      this.lastConnectionAttempt = Date.now();
      this.connectionRetryCount = 0;
      logger.info('Bloomberg API connected successfully');
      
      // 触发连接成功事件
      eventBus.emit('bloomberg:connected', null);
      
      return true;
    } catch (error) {
      this.connectionStatus = 'error';
      this.connectionRetryCount++;
      logger.error('Failed to connect to Bloomberg API:', error);
      
      // 触发连接失败事件
      eventBus.emit('bloomberg:connection-error', error);
      
      // 尝试重试
      if (this.connectionRetryCount < this.maxConnectionRetries) {
        logger.info(`Retrying connection in ${this.connectionRetryDelay}ms...`);
        setTimeout(() => this.connect(), this.connectionRetryDelay);
      }
      
      return false;
    }
  }

  /**
   * 断开与 Bloomberg API 的连接
   */
  public disconnect(): boolean {
    if (this.connectionStatus === 'disconnected') {
      logger.info('Bloomberg API is already disconnected');
      return true;
    }

    logger.info('Disconnecting from Bloomberg API...');
    
    // 这里应该断开与 Bloomberg API 的连接
    // 由于我们使用 HTTP API，这里只是模拟断开
    
    this.connectionStatus = 'disconnected';
    logger.info('Bloomberg API disconnected successfully');
    
    // 触发断开连接事件
    eventBus.emit('bloomberg:disconnected', null);
    
    return true;
  }

  /**
   * 获取连接状态
   */
  public getConnectionStatus(): BloombergConnectionStatus {
    return this.connectionStatus;
  }

  /**
   * 设置 OpenFIGI API 密钥
   */
  public setOpenFigiApiKey(apiKey: string): void {
    this.openFigiApiKey = apiKey;
    logger.info('OpenFIGI API key set');
  }

  /**
   * 验证 OpenFIGI API 密钥
   */
  private async validateOpenFigiApiKey(): Promise<boolean> {
    if (!this.openFigiApiKey) {
      return false;
    }

    try {
      const response = await fetch('https://api.openfigi.com/v3/mapping', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-OPENFIGI-APIKEY': this.openFigiApiKey
        },
        body: JSON.stringify([{ idType: 'TICKER', idValue: 'AAPL', exchCode: 'US' }])
      });

      return response.ok;
    } catch (error) {
      logger.error('Failed to validate OpenFIGI API key:', error);
      return false;
    }
  }

  /**
   * 查询 Bloomberg 数据
   */
  public async queryData(params: BloombergQueryParams): Promise<BloombergDataResponse[]> {
    if (this.connectionStatus !== 'connected') {
      throw new Error('Bloomberg API is not connected');
    }

    try {
      logger.info('Querying Bloomberg data:', params);
      
      // 这里应该根据不同的数据类型执行不同的查询
      // 目前我们使用 OpenFIGI API 作为示例
      const results: BloombergDataResponse[] = [];

      // 为每个证券查询数据
      for (const security of params.securities) {
        try {
          // 使用 OpenFIGI API 查询证券信息
          const securityData = await this.queryOpenFigiData(security);
          results.push(securityData);
        } catch (error) {
          logger.error(`Failed to query data for ${security}:`, error);
          results.push({
            security,
            data: [],
            errors: [error instanceof Error ? error.message : 'Unknown error']
          });
        }
      }

      logger.info(`Successfully queried data for ${results.length} securities`);
      return results;
    } catch (error) {
      logger.error('Failed to query Bloomberg data:', error);
      throw error;
    }
  }

  /**
   * 使用 OpenFIGI API 查询证券信息
   */
  private async queryOpenFigiData(security: string): Promise<BloombergDataResponse> {
    if (!this.openFigiApiKey) {
      return {
        security,
        data: [],
        errors: ['OpenFIGI API key not set']
      };
    }

    try {
      // 解析证券代码，提取 ticker 和 exchange
      const parts = security.split(' ');
      const ticker = parts[0];
      const exchCode = parts.length > 2 ? parts[1] : 'US';

      const response = await fetch('https://api.openfigi.com/v3/mapping', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-OPENFIGI-APIKEY': this.openFigiApiKey
        },
        body: JSON.stringify([{ idType: 'TICKER', idValue: ticker, exchCode }])
      });

      if (!response.ok) {
        throw new Error(`OpenFIGI API error: ${response.status} ${response.statusText}`);
      }

      const data = await response.json() as any[];
      
      return {
        security,
        data: data[0]?.data || []
      };
    } catch (error) {
      logger.error(`Failed to query OpenFIGI data for ${security}:`, error);
      return {
        security,
        data: [],
        errors: [error instanceof Error ? error.message : 'Unknown error']
      };
    }
  }

  /**
   * 查询实时数据（类似 bdp）
   */
  public async getReferenceData(securities: string[], fields: string[]): Promise<BloombergDataResponse[]> {
    return this.queryData({ securities, fields });
  }

  /**
   * 查询历史数据（类似 bdh）
   */
  public async getHistoricalData(
    securities: string[], 
    fields: string[], 
    startDate: string, 
    endDate: string,
    options?: Record<string, any>
  ): Promise<BloombergDataResponse[]> {
    return this.queryData({ securities, fields, startDate, endDate, options });
  }

  /**
   * 查询数据集（类似 bds）
   */
  public async getDataSetData(securities: string[], fields: string[]): Promise<BloombergDataResponse[]> {
    return this.queryData({ securities, fields });
  }

  /**
   * 查询 OHLCV 数据（类似 getBars）
   */
  public async getBarsData(
    securities: string[], 
    fields: string[], 
    startDate: string, 
    endDate: string,
    options?: Record<string, any>
  ): Promise<BloombergDataResponse[]> {
    return this.queryData({ securities, fields, startDate, endDate, options });
  }

  /**
   * 查询交易 tick 数据（类似 getTicks）
   */
  public async getTicksData(
    securities: string[], 
    fields: string[], 
    startDate: string, 
    endDate: string,
    options?: Record<string, any>
  ): Promise<BloombergDataResponse[]> {
    return this.queryData({ securities, fields, startDate, endDate, options });
  }

  /**
   * 搜索字段（类似 fieldSearch）
   */
  public async searchFields(query: string): Promise<any[]> {
    // 这里应该实现字段搜索功能
    // 目前返回空数组作为示例
    return [];
  }

  /**
   * 执行 EQS 查询（类似 beqs）
   */
  public async executeEQSQuery(query: string, options?: Record<string, any>): Promise<any[]> {
    // 这里应该实现 EQS 查询功能
    // 目前返回空数组作为示例
    return [];
  }

  /**
   * 导出数据为 CSV 格式
   */
  public exportDataToCSV(data: BloombergDataResponse[]): string {
    if (!data || data.length === 0) {
      return '';
    }

    // 提取所有字段
    const fields = new Set<string>();
    data.forEach(response => {
      response.data.forEach(item => {
        Object.keys(item).forEach(field => fields.add(field));
      });
    });

    // 构建 CSV 头
    const headers = ['Security', ...Array.from(fields)];
    const rows = [headers.join(',')];

    // 构建 CSV 行
    data.forEach(response => {
      response.data.forEach(item => {
        const row = [response.security];
        fields.forEach(field => {
          const value = item[field];
          row.push(typeof value === 'string' ? `"${value}"` : String(value));
        });
        rows.push(row.join(','));
      });
    });

    return rows.join('\n');
  }

  /**
   * 导出数据为 Excel 格式
   */
  public exportDataToExcel(data: BloombergDataResponse[]): Buffer {
    // 这里应该实现 Excel 导出功能
    // 目前返回空缓冲区作为示例
    return Buffer.alloc(0);
  }

  /**
   * 获取服务状态
   */
  public getStatus(): {
    status: BloombergConnectionStatus;
    lastConnectionAttempt: number;
    connectionRetryCount: number;
    openFigiApiKeySet: boolean;
  } {
    return {
      status: this.connectionStatus,
      lastConnectionAttempt: this.lastConnectionAttempt,
      connectionRetryCount: this.connectionRetryCount,
      openFigiApiKeySet: !!this.openFigiApiKey
    };
  }
}

// 导出单例
export const chatClawBloombergService = ChatClawBloombergService.getInstance();
