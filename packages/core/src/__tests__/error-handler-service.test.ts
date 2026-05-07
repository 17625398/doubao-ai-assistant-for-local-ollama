// 错误处理服务测试

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { errorHandler, AppError, ErrorType } from '../services/error-handler-service';
import { logger } from '../utils/logger';

// 模拟 logger
vi.mock('../utils/logger', () => ({
  logger: {
    error: vi.fn(),
    debug: vi.fn(),
  },
}));

describe('ErrorHandlerService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should create AppError with correct properties', () => {
    const error = new AppError('Test error', ErrorType.VALIDATION, 400);
    
    expect(error.message).toBe('Test error');
    expect(error.errorType).toBe(ErrorType.VALIDATION);
    expect(error.statusCode).toBe(400);
    expect(error.isOperational).toBe(true);
    expect(error.timestamp).toBeDefined();
  });

  it('should handle AppError correctly', () => {
    const error = new AppError('Test validation error', ErrorType.VALIDATION);
    
    errorHandler.handleError(error);
    
    expect(logger.error).toHaveBeenCalledWith('Validation error:', 'Test validation error');
    expect(logger.debug).toHaveBeenCalledWith('Error details:', expect.objectContaining({
      type: ErrorType.VALIDATION,
      message: 'Test validation error',
    }));
  });

  it('should handle unknown error correctly', () => {
    const error = new Error('Unknown error');
    
    errorHandler.handleError(error);
    
    expect(logger.error).toHaveBeenCalledWith('Unexpected error:', 'Unknown error');
    expect(logger.debug).toHaveBeenCalledWith('Error stack:', error.stack);
  });

  it('should create network error', () => {
    const error = errorHandler.createNetworkError('Network error');
    
    expect(error.errorType).toBe(ErrorType.NETWORK);
    expect(error.statusCode).toBe(503);
  });

  it('should create validation error', () => {
    const error = errorHandler.createValidationError('Validation error');
    
    expect(error.errorType).toBe(ErrorType.VALIDATION);
    expect(error.statusCode).toBe(400);
  });

  it('should create authentication error', () => {
    const error = errorHandler.createAuthenticationError('Authentication error');
    
    expect(error.errorType).toBe(ErrorType.AUTHENTICATION);
    expect(error.statusCode).toBe(401);
  });

  it('should create authorization error', () => {
    const error = errorHandler.createAuthorizationError('Authorization error');
    
    expect(error.errorType).toBe(ErrorType.AUTHORIZATION);
    expect(error.statusCode).toBe(403);
  });

  it('should create database error', () => {
    const error = errorHandler.createDatabaseError('Database error');
    
    expect(error.errorType).toBe(ErrorType.DATABASE);
    expect(error.statusCode).toBe(500);
  });

  it('should create document parsing error', () => {
    const error = errorHandler.createDocumentParsingError('Document parsing error');
    
    expect(error.errorType).toBe(ErrorType.DOCUMENT_PARSING);
    expect(error.statusCode).toBe(400);
  });

  it('should create AI service error', () => {
    const error = errorHandler.createAIServiceError('AI service error');
    
    expect(error.errorType).toBe(ErrorType.AI_SERVICE);
    expect(error.statusCode).toBe(500);
  });

  it('should create plugin error', () => {
    const error = errorHandler.createPluginError('Plugin error');
    
    expect(error.errorType).toBe(ErrorType.PLUGIN);
    expect(error.statusCode).toBe(500);
  });

  it('should wrap async function and handle error', async () => {
    const error = new Error('Async error');
    const asyncFn = async () => {
      throw error;
    };

    await expect(errorHandler.wrapAsync(asyncFn)).rejects.toThrow('Async error');
    expect(logger.error).toHaveBeenCalledWith('Unexpected error:', 'Async error');
  });

  it('should wrap sync function and handle error', () => {
    const error = new Error('Sync error');
    const syncFn = () => {
      throw error;
    };

    expect(() => errorHandler.wrapSync(syncFn)).toThrow('Sync error');
    expect(logger.error).toHaveBeenCalledWith('Unexpected error:', 'Sync error');
  });
});
