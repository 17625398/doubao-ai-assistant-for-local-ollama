// 日志工具

/**
 * 日志级别枚举
 */
export enum LogLevel {
  DEBUG = 0,
  INFO = 1,
  WARN = 2,
  ERROR = 3,
}

/**
 * 诊断结果类型（用于避免循环导入）
 */
interface DiagnosticResult {
  errorType: string;
  severity: string;
  message: string;
  details: string;
  suggestion: string;
  technicalDetails?: any;
  timestamp: string;
}

/**
 * 日志记录器类
 */
export class Logger {
  private static instance: Logger
  private level: LogLevel = LogLevel.DEBUG
  private prefix: string = '[Doubao]'

  /**
   * 获取单例实例
   */
  static getInstance(): Logger {
    if (!Logger.instance) {
      Logger.instance = new Logger()
    }
    return Logger.instance
  }

  /**
   * 设置日志级别
   * @param level 日志级别
   */
  setLevel(level: LogLevel): void {
    this.level = level
  }

  /**
   * 设置日志前缀
   * @param prefix 日志前缀
   */
  setPrefix(prefix: string): void {
    this.prefix = prefix
  }

  /**
   * 格式化诊断结果
   */
  private formatDiagnostic(diagnostic?: DiagnosticResult): string {
    if (!diagnostic) return ''
    return `
  类型: ${diagnostic.errorType}
  严重级别: ${diagnostic.severity}
  消息: ${diagnostic.message}
  建议: ${diagnostic.suggestion}
  时间: ${diagnostic.timestamp}
`
  }

  /**
   * 输出调试日志
   */
  debug(...args: unknown[]): void {
    if (this.level <= LogLevel.DEBUG) {
      console.log(this.prefix, '[DEBUG]', ...args)
    }
  }

  /**
   * 输出信息日志
   */
  info(...args: unknown[]): void {
    if (this.level <= LogLevel.INFO) {
      console.info(this.prefix, '[INFO]', ...args)
    }
  }

  /**
   * 输出警告日志
   */
  warn(...args: unknown[]): void {
    if (this.level <= LogLevel.WARN) {
      console.warn(this.prefix, '[WARN]', ...args)
    }
  }

  /**
   * 输出错误日志
   */
  error(...args: unknown[]): void {
    if (this.level <= LogLevel.ERROR) {
      // 检查是否有诊断结果
      const diagnosticIndex = args.findIndex(
        (arg) => arg && typeof arg === 'object' && 'errorType' in arg
      )

      if (diagnosticIndex !== -1) {
        try {
          const diagnostic = args[diagnosticIndex] as DiagnosticResult
          const otherArgs = args.filter((_, i) => i !== diagnosticIndex)

          console.error(this.prefix, '[ERROR]', ...otherArgs)
          console.error(this.prefix, '[DIAGNOSTIC]', this.formatDiagnostic(diagnostic))
        } catch (error) {
          // 如果处理诊断结果时出错，直接输出所有参数
          console.error(this.prefix, '[ERROR]', ...args)
          console.error(this.prefix, '[ERROR]', 'Failed to format diagnostic result:', error)
        }
      } else {
        console.error(this.prefix, '[ERROR]', ...args)
      }
    }
  }
}

/**
 * 全局日志实例
 */
export const logger = Logger.getInstance()

