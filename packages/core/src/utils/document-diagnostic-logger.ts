/**
 * 文档诊断日志系统
 * 用于记录和分析文档上传/解析过程中的错误
 */
import { DiagnosticResult, DocumentErrorType, ErrorSeverity } from './document-error-diagnoser';

/**
 * 日志级别
 */
export enum LogLevel {
  DEBUG = 'debug',
  INFO = 'info',
  WARN = 'warn',
  ERROR = 'error'
}

/**
 * 诊断日志条目
 */
export interface DiagnosticLogEntry {
  id: string;
  timestamp: string;
  level: LogLevel;
  category: 'upload' | 'parse' | 'validate' | 'unknown';
  message: string;
  diagnostic?: DiagnosticResult;
  context?: Record<string, any>;
}

/**
 * 诊断日志系统
 */
export class DiagnosticLogger {
  private static logs: DiagnosticLogEntry[] = [];
  private static maxLogs = 100;
  private static listeners: ((log: DiagnosticLogEntry) => void)[] = [];

  /**
   * 添加日志条目
   */
  static log(
    level: LogLevel,
    category: DiagnosticLogEntry['category'],
    message: string,
    diagnostic?: DiagnosticResult,
    context?: Record<string, any>
  ): string {
    const entry: DiagnosticLogEntry = {
      id: `log-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      timestamp: new Date().toISOString(),
      level,
      category,
      message,
      diagnostic,
      context
    };

    // 添加到日志数组
    this.logs.push(entry);

    // 保持日志数量在限制内
    if (this.logs.length > this.maxLogs) {
      this.logs.shift();
    }

    // 通知监听器
    this.notifyListeners(entry);

    // 输出到控制台
    this.outputToConsole(entry);

    return entry.id;
  }

  /**
   * 添加诊断日志
   */
  static diagnostic(
    level: LogLevel,
    category: DiagnosticLogEntry['category'],
    message: string,
    diagnostic: DiagnosticResult,
    context?: Record<string, any>
  ): string {
    const entry: DiagnosticLogEntry = {
      id: `log-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      timestamp: new Date().toISOString(),
      level,
      category,
      message,
      diagnostic,
      context
    };

    this.logs.push(entry);

    if (this.logs.length > this.maxLogs) {
      this.logs.shift();
    }

    this.notifyListeners(entry);
    this.outputToConsole(entry);

    return entry.id;
  }

  /**
   * 添加错误日志
   */
  static error(
    message: string,
    diagnostic?: DiagnosticResult,
    context?: Record<string, any>
  ): string {
    return this.log(LogLevel.ERROR, 'unknown', message, diagnostic, context);
  }

  /**
   * 添加上传相关日志
   */
  static upload(
    level: LogLevel,
    message: string,
    diagnostic?: DiagnosticResult,
    context?: Record<string, any>
  ): string {
    return this.log(level, 'upload', message, diagnostic, context);
  }

  /**
   * 添加解析相关日志
   */
  static parse(
    level: LogLevel,
    message: string,
    diagnostic?: DiagnosticResult,
    context?: Record<string, any>
  ): string {
    return this.log(level, 'parse', message, diagnostic, context);
  }

  /**
   * 添加验证相关日志
   */
  static validate(
    level: LogLevel,
    message: string,
    diagnostic?: DiagnosticResult,
    context?: Record<string, any>
  ): string {
    return this.log(level, 'validate', message, diagnostic, context);
  }

  /**
   * 获取所有日志
   */
  static getLogs(): DiagnosticLogEntry[] {
    return [...this.logs];
  }

  /**
   * 获取错误日志
   */
  static getErrorLogs(): DiagnosticLogEntry[] {
    return this.logs.filter((log) => log.level === LogLevel.ERROR);
  }

  /**
   * 获取指定类别的日志
   */
  static getLogsByCategory(category: DiagnosticLogEntry['category']): DiagnosticLogEntry[] {
    return this.logs.filter((log) => log.category === category);
  }

  /**
   * 获取最近的日志
   */
  static getRecentLogs(count: number = 10): DiagnosticLogEntry[] {
    return this.logs.slice(-count);
  }

  /**
   * 清除所有日志
   */
  static clear(): void {
    this.logs = [];
  }

  /**
   * 添加日志监听器
   */
  static addListener(listener: (log: DiagnosticLogEntry) => void): () => void {
    this.listeners.push(listener);
    return () => {
      const index = this.listeners.indexOf(listener);
      if (index > -1) {
        this.listeners.splice(index, 1);
      }
    };
  }

  /**
   * 导出日志为JSON
   */
  static exportLogs(): string {
    return JSON.stringify(this.logs, null, 2);
  }

  /**
   * 导出日志报告
   */
  static exportReport(): string {
    const errorLogs = this.getErrorLogs();
    const uploadLogs = this.getLogsByCategory('upload');
    const parseLogs = this.getLogsByCategory('parse');
    const validateLogs = this.getLogsByCategory('validate');

    // 统计错误类型
    const errorTypeCounts: Record<string, number> = {};
    errorLogs.forEach((log) => {
      if (log.diagnostic) {
        const type = log.diagnostic.errorType;
        errorTypeCounts[type] = (errorTypeCounts[type] || 0) + 1;
      }
    });

    // 统计严重级别
    const severityCounts: Record<string, number> = {};
    errorLogs.forEach((log) => {
      if (log.diagnostic) {
        const severity = log.diagnostic.severity;
        severityCounts[severity] = (severityCounts[severity] || 0) + 1;
      }
    });

    return `
Document Upload Diagnostic Report
==================================
Generated: ${new Date().toISOString()}

Summary
-------
Total Logs: ${this.logs.length}
Errors: ${errorLogs.length}
Uploads: ${uploadLogs.length}
Parses: ${parseLogs.length}
Validations: ${validateLogs.length}

Error Type Distribution
-----------------------
${Object.entries(errorTypeCounts)
  .map(([type, count]) => `${type}: ${count}`)
  .join('\n') || 'No errors recorded'}

Severity Distribution
---------------------
${Object.entries(severityCounts)
  .map(([severity, count]) => `${severity}: ${count}`)
  .join('\n') || 'No errors recorded'}

Recent Errors (Last 5)
----------------------
${errorLogs
  .slice(-5)
  .map(
    (log) =>
      `[${log.timestamp}] ${log.message}${
        log.diagnostic ? `\n  Type: ${log.diagnostic.errorType}\n  Severity: ${log.diagnostic.severity}` : ''
      }`
  )
  .join('\n\n') || 'No errors recorded'}

Log Details
-----------
${this.logs
  .map(
    (log) =>
      `[${log.timestamp}] [${log.level.toUpperCase()}] [${log.category}] ${log.message}${
        log.context ? `\n  Context: ${JSON.stringify(log.context)}` : ''
      }${log.diagnostic ? `\n  Diagnostic: ${JSON.stringify(log.diagnostic)}` : ''}`
  )
  .join('\n')}
`.trim();
  }

  /**
   * 通知监听器
   */
  private static notifyListeners(entry: DiagnosticLogEntry): void {
    this.listeners.forEach((listener) => {
      try {
        listener(entry);
      } catch (error) {
        console.error('Error in diagnostic log listener:', error);
      }
    });
  }

  /**
   * 输出到控制台
   */
  private static outputToConsole(entry: DiagnosticLogEntry): void {
    const prefix = `[DocDiag][${entry.level.toUpperCase()}]`;

    if (entry.level === LogLevel.ERROR) {
      console.error(prefix, entry.message, entry);
    } else if (entry.level === LogLevel.WARN) {
      console.warn(prefix, entry.message, entry);
    } else if (entry.level === LogLevel.INFO) {
      console.info(prefix, entry.message, entry);
    } else {
      console.log(prefix, entry.message, entry);
    }
  }
}

/**
 * 便捷函数：记录上传错误
 */
export function logUploadError(
  message: string,
  diagnostic: DiagnosticResult,
  context?: Record<string, any>
): string {
  return DiagnosticLogger.upload(LogLevel.ERROR, message, diagnostic, context);
}

/**
 * 便捷函数：记录解析错误
 */
export function logParseError(
  message: string,
  diagnostic: DiagnosticResult,
  context?: Record<string, any>
): string {
  return DiagnosticLogger.parse(LogLevel.ERROR, message, diagnostic, context);
}

/**
 * 便捷函数：记录验证错误
 */
export function logValidateError(
  message: string,
  diagnostic: DiagnosticResult,
  context?: Record<string, any>
): string {
  return DiagnosticLogger.validate(LogLevel.ERROR, message, diagnostic, context);
}
