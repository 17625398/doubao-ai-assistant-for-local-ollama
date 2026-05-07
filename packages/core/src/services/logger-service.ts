// 日志服务

/**
 * 日志级别
 */
export enum LogLevel {
  DEBUG = 0,
  INFO = 1,
  WARN = 2,
  ERROR = 3,
  FATAL = 4,
}

/**
 * 日志配置
 */
export interface LoggerConfig {
  level: LogLevel;
  enableConsole: boolean;
  enableFile: boolean;
  file路径?: string;
  maxFileSize?: number;
  maxFiles?: number;
}

/**
 * 日志条目
 */
export interface LogEntry {
  timestamp: string;
  level: LogLevel;
  levelName: string;
  message: string;
  metadata?: Record<string, any>;
  stack?: string;
}

/**
 * 日志服务
 */
export class LoggerService {
  private static instance: LoggerService;
  private config: LoggerConfig;
  private logQueue: LogEntry[] = [];
  private isProcessing: boolean = false;

  private constructor(config: LoggerConfig = {
    level: LogLevel.INFO,
    enableConsole: true,
    enableFile: false,
  }) {
    this.config = config;
  }

  static getInstance(config?: LoggerConfig): LoggerService {
    if (!LoggerService.instance) {
      LoggerService.instance = new LoggerService(config);
    }
    return LoggerService.instance;
  }

  /**
   * 设置日志配置
   */
  setConfig(config: Partial<LoggerConfig>): void {
    this.config = { ...this.config, ...config };
  }

  /**
   * 获取当前日志配置
   */
  getConfig(): LoggerConfig {
    return { ...this.config };
  }

  /**
   * 调试日志
   */
  debug(message: string, metadata?: Record<string, any>): void {
    this.log(LogLevel.DEBUG, message, metadata);
  }

  /**
   * 信息日志
   */
  info(message: string, metadata?: Record<string, any>): void {
    this.log(LogLevel.INFO, message, metadata);
  }

  /**
   * 警告日志
   */
  warn(message: string, metadata?: Record<string, any>): void {
    this.log(LogLevel.WARN, message, metadata);
  }

  /**
   * 错误日志
   */
  error(message: string, metadata?: Record<string, any>, error?: Error): void {
    this.log(LogLevel.ERROR, message, metadata, error?.stack);
  }

  /**
   * 致命错误日志
   */
  fatal(message: string, metadata?: Record<string, any>, error?: Error): void {
    this.log(LogLevel.FATAL, message, metadata, error?.stack);
  }

  /**
   * 记录日志
   */
  private log(level: LogLevel, message: string, metadata?: Record<string, any>, stack?: string): void {
    if (level < this.config.level) {
      return;
    }

    const logEntry: LogEntry = {
      timestamp: new Date().toISOString(),
      level,
      levelName: LogLevel[level],
      message,
      metadata,
      stack,
    };

    this.logQueue.push(logEntry);
    this.processLogQueue();
  }

  /**
   * 处理日志队列
   */
  private async processLogQueue(): Promise<void> {
    if (this.isProcessing || this.logQueue.length === 0) {
      return;
    }

    this.isProcessing = true;

    while (this.logQueue.length > 0) {
      const logEntry = this.logQueue.shift();
      if (logEntry) {
        await this.processLogEntry(logEntry);
      }
    }

    this.isProcessing = false;
  }

  /**
   * 处理单个日志条目
   */
  private async processLogEntry(entry: LogEntry): Promise<void> {
    // 输出到控制台
    if (this.config.enableConsole) {
      this.logToConsole(entry);
    }

    // 输出到文件
    if (this.config.enableFile && this.config.file路径) {
      await this.logToFile(entry);
    }
  }

  /**
   * 输出日志到控制台
   */
  private logToConsole(entry: LogEntry): void {
    const { timestamp, level, levelName, message, metadata, stack } = entry;

    const consoleArgs: any[] = [`[${timestamp}] [${levelName}] ${message}`];

    if (metadata) {
      consoleArgs.push(metadata);
    }

    if (stack) {
      consoleArgs.push(stack);
    }

    switch (level) {
      case LogLevel.DEBUG:
        console.debug(...consoleArgs);
        break;
      case LogLevel.INFO:
        console.info(...consoleArgs);
        break;
      case LogLevel.WARN:
        console.warn(...consoleArgs);
        break;
      case LogLevel.ERROR:
      case LogLevel.FATAL:
        console.error(...consoleArgs);
        break;
    }
  }

  /**
   * 输出日志到文件
   */
  private async logToFile(entry: LogEntry): Promise<void> {
    try {
      // 在浏览器环境中，无法直接写入文件
      // 在 Node.js 环境中，可以使用 fs 模块写入文件
      if (typeof window === 'undefined') {
        const fs = require('fs');
        const path = require('path');

        // 确保目录存在
        const dir = path.dirname(this.config.file路径!);
        if (!fs.existsSync(dir)) {
          fs.mkdirSync(dir, { recursive: true });
        }

        // 写入日志
        const logString = JSON.stringify(entry) + '\n';
        fs.appendFileSync(this.config.file路径!, logString);

        // 检查文件大小，进行日志轮转
        await this.checkLogRotation();
      }
    } catch (error) {
      console.error('Failed to write log to file:', error);
    }
  }

  /**
   * 检查日志轮转
   */
  private async checkLogRotation(): Promise<void> {
    try {
      if (typeof window === 'undefined' && this.config.file路径) {
        const fs = require('fs');
        const path = require('path');

        const stats = fs.statSync(this.config.file路径!);
        const maxSize = this.config.maxFileSize || 10485760; // 默认 10MB

        if (stats.size > maxSize) {
          // 轮转日志文件
          const baseName = path.basename(this.config.file路径!);
          const dirName = path.dirname(this.config.file路径!);
          const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
          const rotatedPath = path.join(dirName, `${baseName}.${timestamp}`);

          fs.renameSync(this.config.file路径!, rotatedPath);

          // 清理旧日志文件
          await this.cleanupOldLogs();
        }
      }
    } catch (error) {
      console.error('Failed to check log rotation:', error);
    }
  }

  /**
   * 清理旧日志文件
   */
  private async cleanupOldLogs(): Promise<void> {
    try {
      if (typeof window === 'undefined' && this.config.file路径) {
        const fs = require('fs');
        const path = require('path');

        const dirName = path.dirname(this.config.file路径!);
        const baseName = path.basename(this.config.file路径!);
        const files: string[] = fs.readdirSync(dirName);

        // 过滤出相关的日志文件
        const logFiles = files
          .filter((file: string) => file.startsWith(baseName) && file !== baseName)
          .map((file: string) => path.join(dirName, file))
          .sort((a: string, b: string) => {
            return fs.statSync(b).mtime.getTime() - fs.statSync(a).mtime.getTime();
          });

        // 保留最新的几个文件
        const maxFiles = this.config.maxFiles || 5;
        if (logFiles.length > maxFiles) {
          const filesToDelete = logFiles.slice(maxFiles);
          for (const file of filesToDelete) {
            fs.unlinkSync(file);
          }
        }
      }
    } catch (error) {
      console.error('Failed to cleanup old logs:', error);
    }
  }

  /**
   * 清除日志队列
   */
  clearQueue(): void {
    this.logQueue = [];
  }

  /**
   * 获取日志队列长度
   */
  getQueueLength(): number {
    return this.logQueue.length;
  }
}

/**
 * 全局日志服务实例
 */
export const loggerService = LoggerService.getInstance();
