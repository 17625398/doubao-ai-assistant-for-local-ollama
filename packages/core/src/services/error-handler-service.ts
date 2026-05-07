// 错误处理服务

import { logger } from '../utils/logger';

/**
 * 错误类型
 */
export enum ErrorType {
  NETWORK = 'NETWORK',
  VALIDATION = 'VALIDATION',
  AUTHENTICATION = 'AUTHENTICATION',
  AUTHORIZATION = 'AUTHORIZATION',
  DATABASE = 'DATABASE',
  DOCUMENT_PARSING = 'DOCUMENT_PARSING',
  AI_SERVICE = 'AI_SERVICE',
  PLUGIN = 'PLUGIN',
  UNKNOWN = 'UNKNOWN',
}

/**
 * 自定义错误类
 */
export class AppError extends Error {
  readonly errorType: ErrorType;
  readonly statusCode: number;
  readonly isOperational: boolean;
  readonly timestamp: number;

  constructor(
    message: string,
    errorType: ErrorType = ErrorType.UNKNOWN,
    statusCode: number = 500,
    isOperational: boolean = true
  ) {
    super(message);
    this.errorType = errorType;
    this.statusCode = statusCode;
    this.isOperational = isOperational;
    this.timestamp = Date.now();

    // 捕获堆栈跟踪
    Error.captureStackTrace(this, this.constructor);
  }
}

/**
 * 错误处理服务
 */
export class ErrorHandlerService {
  private static instance: ErrorHandlerService;

  private constructor() {}

  static getInstance(): ErrorHandlerService {
    if (!ErrorHandlerService.instance) {
      ErrorHandlerService.instance = new ErrorHandlerService();
    }
    return ErrorHandlerService.instance;
  }

  /**
   * 处理错误
   */
  handleError(error: Error | AppError): void {
    if (error instanceof AppError) {
      this.handleAppError(error);
    } else {
      this.handleUnknownError(error);
    }
  }

  /**
   * 处理应用错误
   */
  private handleAppError(error: AppError): void {
    switch (error.errorType) {
      case ErrorType.NETWORK:
        logger.error('Network error:', error.message);
        break;
      case ErrorType.VALIDATION:
        logger.error('Validation error:', error.message);
        break;
      case ErrorType.AUTHENTICATION:
        logger.error('Authentication error:', error.message);
        break;
      case ErrorType.AUTHORIZATION:
        logger.error('Authorization error:', error.message);
        break;
      case ErrorType.DATABASE:
        logger.error('Database error:', error.message);
        break;
      case ErrorType.DOCUMENT_PARSING:
        logger.error('Document parsing error:', error.message);
        break;
      case ErrorType.AI_SERVICE:
        logger.error('AI service error:', error.message);
        break;
      case ErrorType.PLUGIN:
        logger.error('Plugin error:', error.message);
        break;
      default:
        logger.error('Unknown error:', error.message);
    }

    // 记录错误详情
    logger.debug('Error details:', {
      type: error.errorType,
      statusCode: error.statusCode,
      message: error.message,
      stack: error.stack,
      timestamp: error.timestamp,
    });
  }

  /**
   * 处理未知错误
   */
  private handleUnknownError(error: Error): void {
    logger.error('Unexpected error:', error.message);
    logger.debug('Error stack:', error.stack);
  }

  /**
   * 创建网络错误
   */
  createNetworkError(message: string, statusCode: number = 503): AppError {
    return new AppError(message, ErrorType.NETWORK, statusCode);
  }

  /**
   * 创建验证错误
   */
  createValidationError(message: string): AppError {
    return new AppError(message, ErrorType.VALIDATION, 400);
  }

  /**
   * 创建认证错误
   */
  createAuthenticationError(message: string): AppError {
    return new AppError(message, ErrorType.AUTHENTICATION, 401);
  }

  /**
   * 创建授权错误
   */
  createAuthorizationError(message: string): AppError {
    return new AppError(message, ErrorType.AUTHORIZATION, 403);
  }

  /**
   * 创建数据库错误
   */
  createDatabaseError(message: string): AppError {
    return new AppError(message, ErrorType.DATABASE, 500);
  }

  /**
   * 创建文档解析错误
   */
  createDocumentParsingError(message: string): AppError {
    return new AppError(message, ErrorType.DOCUMENT_PARSING, 400);
  }

  /**
   * 创建 AI 服务错误
   */
  createAIServiceError(message: string): AppError {
    return new AppError(message, ErrorType.AI_SERVICE, 500);
  }

  /**
   * 创建插件错误
   */
  createPluginError(message: string): AppError {
    return new AppError(message, ErrorType.PLUGIN, 500);
  }

  /**
   * 包装异步函数，统一处理错误
   */
  async wrapAsync<T>(fn: () => Promise<T>): Promise<T> {
    try {
      return await fn();
    } catch (error) {
      this.handleError(error as Error);
      throw error;
    }
  }

  /**
   * 包装同步函数，统一处理错误
   */
  wrapSync<T>(fn: () => T): T {
    try {
      return fn();
    } catch (error) {
      this.handleError(error as Error);
      throw error;
    }
  }
}

/**
 * 全局错误处理服务实例
 */
export const errorHandler = ErrorHandlerService.getInstance();
