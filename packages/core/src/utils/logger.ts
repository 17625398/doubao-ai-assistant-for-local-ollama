// 日志工具

export enum LogLevel {
  DEBUG = 0,
  INFO = 1,
  WARN = 2,
  ERROR = 3
}

export class Logger {
  private static instance: Logger;
  private level: LogLevel = LogLevel.DEBUG;
  private prefix: string = '[Doubao]';

  static getInstance(): Logger {
    if (!Logger.instance) {
      Logger.instance = new Logger();
    }
    return Logger.instance;
  }

  setLevel(level: LogLevel): void {
    this.level = level;
  }

  setPrefix(prefix: string): void {
    this.prefix = prefix;
  }

  debug(...args: unknown[]): void {
    if (this.level <= LogLevel.DEBUG) {
      console.log(this.prefix, '[DEBUG]', ...args);
    }
  }

  info(...args: unknown[]): void {
    if (this.level <= LogLevel.INFO) {
      console.info(this.prefix, '[INFO]', ...args);
    }
  }

  warn(...args: unknown[]): void {
    if (this.level <= LogLevel.WARN) {
      console.warn(this.prefix, '[WARN]', ...args);
    }
  }

  error(...args: unknown[]): void {
    if (this.level <= LogLevel.ERROR) {
      console.error(this.prefix, '[ERROR]', ...args);
    }
  }
}

export const logger = Logger.getInstance();
