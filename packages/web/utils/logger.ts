export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

export interface LogConfig {
  level: LogLevel;
  enableTimestamps: boolean;
  enableColors: boolean;
  enableContext: boolean;
}

export interface LogEntry {
  timestamp: Date;
  level: LogLevel;
  context: string;
  message: string;
  data?: unknown;
}

const DEFAULT_CONFIG: LogConfig = {
  level: 'info',
  enableTimestamps: true,
  enableColors: true,
  enableContext: true,
};

let config: LogConfig = { ...DEFAULT_CONFIG };
const logHistory: LogEntry[] = [];
const MAX_HISTORY_SIZE = 1000;

const levelOrder: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
};

const levelColors: Record<LogLevel, string> = {
  debug: '\x1b[36m',
  info: '\x1b[32m',
  warn: '\x1b[33m',
  error: '\x1b[31m',
};

const levelLabels: Record<LogLevel, string> = {
  debug: 'DEBUG',
  info: 'INFO ',
  warn: 'WARN ',
  error: 'ERROR',
};

const resetColor = '\x1b[0m';

const shouldLog = (level: LogLevel): boolean => {
  return levelOrder[level] >= levelOrder[config.level];
};

const formatTimestamp = (): string => {
  if (!config.enableTimestamps) return '';
  const now = new Date();
  const pad = (n: number) => n.toString().padStart(2, '0');
  return `[${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(now.getSeconds())}.${pad(now.getMilliseconds())}]`;
};

const formatContext = (context: string): string => {
  if (!config.enableContext || !context) return '';
  return `[${context}]`;
};

const formatMessage = (level: LogLevel, context: string, message: string): string => {
  const parts: string[] = [];
  
  if (config.enableTimestamps) {
    parts.push(formatTimestamp());
  }
  
  if (config.enableColors) {
    parts.push(levelColors[level]);
  }
  
  parts.push(levelLabels[level]);
  
  if (config.enableColors) {
    parts.push(resetColor);
  }
  
  if (context) {
    parts.push(formatContext(context));
  }
  
  parts.push(message);
  
  return parts.join(' ');
};

const addToHistory = (level: LogLevel, context: string, message: string, data?: unknown): void => {
  logHistory.push({
    timestamp: new Date(),
    level,
    context,
    message,
    data,
  });
  
  while (logHistory.length > MAX_HISTORY_SIZE) {
    logHistory.shift();
  }
};

export const logger = {
  config: config,

  setConfig(newConfig: Partial<LogConfig>): void {
    config = { ...config, ...newConfig };
  },

  debug(message: string, context: string = '', data?: unknown): void {
    if (!shouldLog('debug')) return;
    console.debug(formatMessage('debug', context, message), data);
    addToHistory('debug', context, message, data);
  },

  info(message: string, context: string = '', data?: unknown): void {
    if (!shouldLog('info')) return;
    console.info(formatMessage('info', context, message), data);
    addToHistory('info', context, message, data);
  },

  warn(message: string, context: string = '', data?: unknown): void {
    if (!shouldLog('warn')) return;
    console.warn(formatMessage('warn', context, message), data);
    addToHistory('warn', context, message, data);
  },

  error(message: string, context: string = '', error?: Error): void {
    if (!shouldLog('error')) return;
    console.error(formatMessage('error', context, message), error);
    addToHistory('error', context, message, error);
  },

  log(message: string, context: string = '', data?: unknown): void {
    this.info(message, context, data);
  },

  getHistory(count: number = 100): LogEntry[] {
    return logHistory.slice(-count);
  },

  clearHistory(): void {
    logHistory.length = 0;
  },

  getHistoryByLevel(level: LogLevel, count: number = 100): LogEntry[] {
    return logHistory
      .filter(entry => entry.level === level)
      .slice(-count);
  },

  getHistoryByContext(context: string, count: number = 100): LogEntry[] {
    return logHistory
      .filter(entry => entry.context === context)
      .slice(-count);
  },
};

export const createLogger = (context: string) => ({
  debug: (message: string, data?: unknown) => logger.debug(message, context, data),
  info: (message: string, data?: unknown) => logger.info(message, context, data),
  warn: (message: string, data?: unknown) => logger.warn(message, context, data),
  error: (message: string, error?: Error) => logger.error(message, context, error),
  log: (message: string, data?: unknown) => logger.info(message, context, data),
});

export default logger;