/**
 * PicoClaw Gateway 服务
 * 管理 PicoClaw Gateway 的启动、停止和监控
 */
import { logger } from '../utils/logger';
import { eventBus } from '../utils/event-bus';
import { exec, ExecOptions } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

export interface GatewayStatus {
  status: 'running' | 'stopped' | 'starting' | 'stopping' | 'error';
  pid?: number;
  memoryUsage?: number; // MB
  cpuUsage?: number; // percentage
  uptime?: number; // seconds
  port?: number;
  version?: string;
}

export interface GatewayConfig {
  binaryPath: string;
  configPath: string;
  port: number;
  host: string;
  logLevel: 'debug' | 'info' | 'warn' | 'error';
  env: Record<string, string>;
}

export class ChatClawPicoClawGatewayService {
  private config: GatewayConfig;
  private status: GatewayStatus = {
    status: 'stopped'
  };
  private process: any = null;
  private monitorInterval: NodeJS.Timeout | null = null;

  constructor() {
    this.config = this.getDefaultConfig();
  }

  /**
   * 获取默认配置
   */
  private getDefaultConfig(): GatewayConfig {
    return {
      binaryPath: './picoclaw',
      configPath: '~/.picoclaw/config.json',
      port: 18800,
      host: '127.0.0.1',
      logLevel: 'info',
      env: {
        GOMEMLIMIT: '20MiB',
        GOGC: '20'
      }
    };
  }

  /**
   * 获取配置
   */
  getConfig(): GatewayConfig {
    return { ...this.config };
  }

  /**
   * 更新配置
   */
  updateConfig(updates: Partial<GatewayConfig>): void {
    this.config = { ...this.config, ...updates };
    logger.info('PicoClaw Gateway configuration updated');
  }

  /**
   * 启动 Gateway 服务
   */
  async start(): Promise<boolean> {
    if (this.status.status === 'running') {
      logger.info('PicoClaw Gateway is already running');
      return true;
    }

    try {
      this.status = {
        ...this.status,
        status: 'starting'
      };

      logger.info('Starting PicoClaw Gateway...');

      // 检查二进制文件是否存在
      const binaryExists = await this.checkBinaryExists();
      if (!binaryExists) {
        logger.error('PicoClaw binary not found');
        this.status = {
          ...this.status,
          status: 'error'
        };
        return false;
      }

      // 启动 Gateway 进程
      const command = `${this.config.binaryPath} gateway`;
      const options: ExecOptions = {
        env: {
          ...process.env,
          ...this.config.env,
          PICOCLAW_CONFIG: this.config.configPath,
          PICOCLAW_GATEWAY_HOST: this.config.host,
          PICOCLAW_GATEWAY_PORT: this.config.port.toString(),
          PICOCLAW_LOG_LEVEL: this.config.logLevel
        }
      };

      logger.debug(`Starting PicoClaw Gateway with command: ${command}`);
      
      // 使用 spawn 启动后台进程
      const { spawn } = require('child_process');
      this.process = spawn(this.config.binaryPath, ['gateway'], {
        env: options.env,
        stdio: 'ignore',
        detached: true
      } as any);

      this.process.on('error', (error: any) => {
        logger.error('PicoClaw Gateway process error:', error);
        this.status = {
          ...this.status,
          status: 'error'
        };
      });

      this.process.on('exit', (code: number) => {
        logger.info(`PicoClaw Gateway process exited with code: ${code}`);
        this.status = {
          ...this.status,
          status: 'stopped'
        };
        this.process = null;
      });

      // 等待 Gateway 启动
      await this.waitForGatewayStart();

      // 开始监控
      this.startMonitoring();

      this.status = {
        ...this.status,
        status: 'running',
        port: this.config.port
      };

      logger.info('PicoClaw Gateway started successfully');
      eventBus.emit('chatclaw:picoclaw-gateway-started', this.status);

      return true;
    } catch (error) {
      logger.error('Failed to start PicoClaw Gateway:', error);
      this.status = {
        ...this.status,
        status: 'error'
      };
      return false;
    }
  }

  /**
   * 停止 Gateway 服务
   */
  async stop(): Promise<boolean> {
    if (this.status.status !== 'running') {
      logger.info('PicoClaw Gateway is not running');
      return true;
    }

    try {
      this.status = {
        ...this.status,
        status: 'stopping'
      };

      logger.info('Stopping PicoClaw Gateway...');

      // 停止监控
      this.stopMonitoring();

      // 终止进程
      if (this.process) {
        // 先尝试优雅停止
        try {
          this.process.kill('SIGTERM');
          // 等待进程退出
          await new Promise((resolve) => {
            const timeout = setTimeout(() => resolve(false), 5000);
            this.process?.on('exit', () => {
              clearTimeout(timeout);
              resolve(true);
            });
          });
        } catch (error) {
          logger.error('Failed to gracefully stop PicoClaw Gateway:', error);
          // 强制终止
          if (this.process) {
            this.process.kill('SIGKILL');
          }
        }

        this.process = null;
      }

      this.status = {
        ...this.status,
        status: 'stopped'
      };

      logger.info('PicoClaw Gateway stopped successfully');
      eventBus.emit('chatclaw:picoclaw-gateway-stopped', null);

      return true;
    } catch (error) {
      logger.error('Failed to stop PicoClaw Gateway:', error);
      return false;
    }
  }

  /**
   * 检查二进制文件是否存在
   */
  private async checkBinaryExists(): Promise<boolean> {
    try {
      await execAsync(`which ${this.config.binaryPath}`);
      return true;
    } catch (error) {
      // 尝试在当前目录查找
      try {
        await execAsync(`ls ${this.config.binaryPath}`);
        return true;
      } catch {
        return false;
      }
    }
  }

  /**
   * 等待 Gateway 启动
   */
  private async waitForGatewayStart(): Promise<void> {
    const maxRetries = 30;
    const retryInterval = 1000;

    for (let i = 0; i < maxRetries; i++) {
      try {
        const response = await fetch(`http://${this.config.host}:${this.config.port}/health`);
        if (response.ok) {
          return;
        }
      } catch {
        // 忽略错误，继续重试
      }
      await new Promise(resolve => setTimeout(resolve, retryInterval));
    }

    throw new Error('PicoClaw Gateway failed to start within timeout');
  }

  /**
   * 开始监控
   */
  private startMonitoring(): void {
    // 每 10 秒监控一次
    this.monitorInterval = setInterval(async () => {
      await this.updateStatus();
    }, 10000);
  }

  /**
   * 停止监控
   */
  private stopMonitoring(): void {
    if (this.monitorInterval) {
      clearInterval(this.monitorInterval);
      this.monitorInterval = null;
    }
  }

  /**
   * 更新状态
   */
  private async updateStatus(): Promise<void> {
    try {
      // 检查 Gateway 是否可访问
      const healthResponse = await fetch(`http://${this.config.host}:${this.config.port}/health`);
      if (healthResponse.ok) {
        const healthData = await healthResponse.json();
        
        // 更新状态
        this.status = {
          ...this.status,
          status: 'running',
          uptime: healthData.uptime,
          version: healthData.version
        };

        // 尝试获取内存使用情况
        try {
          const memoryUsage = await this.getMemoryUsage();
          this.status.memoryUsage = memoryUsage;
        } catch (error) {
          logger.debug('Failed to get memory usage:', error);
        }
      }
    } catch (error) {
      logger.debug('Failed to update PicoClaw Gateway status:', error);
      // 不更新状态，保持上次状态
    }
  }

  /**
   * 获取内存使用情况
   */
  private async getMemoryUsage(): Promise<number> {
    try {
      // 这里可以根据不同平台实现内存监控
      // 简单实现：通过 ps 命令获取内存使用
      const { stdout } = await execAsync(`ps aux | grep picoclaw | grep -v grep`);
      const lines = stdout.trim().split('\n');
      
      for (const line of lines) {
        if (line.includes('picoclaw gateway')) {
          const parts = line.split(/\s+/);
          // RSS 内存使用（第 5 列）
          const rss = parseInt(parts[5], 10);
          // 转换为 MB
          return Math.round(rss / 1024);
        }
      }
      
      return 0;
    } catch (error) {
      logger.debug('Failed to get memory usage:', error);
      return 0;
    }
  }

  /**
   * 获取 Gateway 状态
   */
  getStatus(): GatewayStatus {
    return { ...this.status };
  }

  /**
   * 检查 Gateway 是否运行
   */
  isRunning(): boolean {
    return this.status.status === 'running';
  }

  /**
   * 检查 Gateway 健康状态
   */
  async checkHealth(): Promise<boolean> {
    try {
      const response = await fetch(`http://${this.config.host}:${this.config.port}/health`);
      return response.ok;
    } catch (error) {
      logger.debug('Failed to check PicoClaw Gateway health:', error);
      return false;
    }
  }

  /**
   * 重载 Gateway 配置
   */
  async reloadConfig(): Promise<boolean> {
    try {
      const response = await fetch(`http://${this.config.host}:${this.config.port}/reload`, {
        method: 'POST'
      });
      return response.ok;
    } catch (error) {
      logger.error('Failed to reload PicoClaw Gateway config:', error);
      return false;
    }
  }

  /**
   * 获取 Gateway 版本
   */
  async getVersion(): Promise<string | null> {
    try {
      const response = await fetch(`http://${this.config.host}:${this.config.port}/health`);
      if (response.ok) {
        const data = await response.json();
        return data.version || null;
      }
      return null;
    } catch (error) {
      logger.debug('Failed to get PicoClaw Gateway version:', error);
      return null;
    }
  }
}

// 导出单例
export const chatClawPicoClawGatewayService = new ChatClawPicoClawGatewayService();
