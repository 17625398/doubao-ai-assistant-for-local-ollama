/**
 * 文档解析错误诊断工具
 * 提供详细的错误分析和诊断信息
 */

/**
 * 错误类型枚举
 */
export enum DocumentErrorType {
  FILE_NOT_FOUND = 'FILE_NOT_FOUND',
  FILE_TOO_LARGE = 'FILE_TOO_LARGE',
  UNSUPPORTED_FORMAT = 'UNSUPPORTED_FORMAT',
  PARSING_FAILED = 'PARSING_FAILED',
  ENCODING_ERROR = 'ENCODING_ERROR',
  MEMORY_ERROR = 'MEMORY_ERROR',
  TIMEOUT_ERROR = 'TIMEOUT_ERROR',
  NETWORK_ERROR = 'NETWORK_ERROR',
  PERMISSION_ERROR = 'PERMISSION_ERROR',
  VALIDATION_ERROR = 'VALIDATION_ERROR',
  UNKNOWN_ERROR = 'UNKNOWN_ERROR'
}

/**
 * 错误严重级别
 */
export enum ErrorSeverity {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  CRITICAL = 'critical'
}

/**
 * 诊断结果接口
 */
export interface DiagnosticResult {
  errorType: DocumentErrorType;
  severity: ErrorSeverity;
  message: string;
  details: string;
  suggestion: string;
  technicalDetails?: any;
  timestamp: string;
}

/**
 * 文档错误诊断器
 */
export class DocumentErrorDiagnoser {
  /**
   * 诊断文档解析错误
   * @param error 原始错误对象
   * @param fileName 文件名
   * @param fileSize 文件大小（字节）
   * @returns 诊断结果
   */
  static diagnose(
    error: any,
    fileName?: string,
    fileSize?: number
  ): DiagnosticResult {
    const timestamp = new Date().toISOString();
    const errorType = this.classifyError(error, fileName, fileSize);
    const severity = this.determineSeverity(errorType);
    const message = this.generateMessage(errorType, fileName);
    const details = this.generateDetails(error, fileName, fileSize);
    const suggestion = this.generateSuggestion(errorType, fileName);

    return {
      errorType,
      severity,
      message,
      details,
      suggestion,
      technicalDetails: {
        originalError: error?.message || String(error),
        stack: error?.stack,
        fileName,
        fileSize,
        userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : 'unknown',
        timestamp
      },
      timestamp
    };
  }

  /**
   * 对错误进行分类
   */
  private static classifyError(
    error: any,
    fileName?: string,
    fileSize?: number
  ): DocumentErrorType {
    const errorMessage = String(error?.message || error || '').toLowerCase();
    const errorCode = error?.code || '';

    // 文件不存在
    if (
      errorMessage.includes('not found') ||
      errorMessage.includes('找不到') ||
      errorCode === 'ENOENT'
    ) {
      return DocumentErrorType.FILE_NOT_FOUND;
    }

    // 文件过大
    if (
      errorMessage.includes('too large') ||
      errorMessage.includes('文件过大') ||
      errorMessage.includes('size limit') ||
      errorCode === 'ERR_FILE_TOO_LARGE'
    ) {
      return DocumentErrorType.FILE_TOO_LARGE;
    }

    // 解析失败（优先于格式检查，因为格式错误信息中可能包含"格式"这个词）
    if (
      errorMessage.includes('parse') ||
      errorMessage.includes('解析') ||
      errorMessage.includes('fail') ||
      errorMessage.includes('失败') ||
      errorMessage.includes('extract')
    ) {
      return DocumentErrorType.PARSING_FAILED;
    }

    // 不支持的格式（需要更精确的匹配）
    if (
      errorMessage.includes('unsupported') ||
      (errorMessage.includes('不支持') && errorMessage.includes('格式')) ||
      errorMessage.includes('invalid format')
    ) {
      return DocumentErrorType.UNSUPPORTED_FORMAT;
    }

    // 编码错误
    if (
      errorMessage.includes('encoding') ||
      errorMessage.includes('编码') ||
      errorMessage.includes('charset')
    ) {
      return DocumentErrorType.ENCODING_ERROR;
    }

    // 内存错误
    if (
      errorMessage.includes('memory') ||
      errorMessage.includes('heap') ||
      errorMessage.includes('内存')
    ) {
      return DocumentErrorType.MEMORY_ERROR;
    }

    // 超时错误
    if (
      errorMessage.includes('timeout') ||
      errorMessage.includes('超时') ||
      errorMessage.includes('timed out')
    ) {
      return DocumentErrorType.TIMEOUT_ERROR;
    }

    // 网络错误
    if (
      errorMessage.includes('network') ||
      errorMessage.includes('网络') ||
      errorMessage.includes('connection') ||
      errorCode === 'ECONNREFUSED' ||
      errorCode === 'ENOTFOUND'
    ) {
      return DocumentErrorType.NETWORK_ERROR;
    }

    // 权限错误
    if (
      errorMessage.includes('permission') ||
      errorMessage.includes('权限') ||
      errorMessage.includes('access denied')
    ) {
      return DocumentErrorType.PERMISSION_ERROR;
    }

    // 验证错误
    if (
      errorMessage.includes('validation') ||
      errorMessage.includes('验证') ||
      errorMessage.includes('invalid')
    ) {
      return DocumentErrorType.VALIDATION_ERROR;
    }

    // 未知错误
    return DocumentErrorType.UNKNOWN_ERROR;
  }

  /**
   * 确定错误严重级别
   */
  private static determineSeverity(errorType: DocumentErrorType): ErrorSeverity {
    switch (errorType) {
      case DocumentErrorType.FILE_TOO_LARGE:
      case DocumentErrorType.MEMORY_ERROR:
        return ErrorSeverity.HIGH;
      case DocumentErrorType.PARSING_FAILED:
      case DocumentErrorType.NETWORK_ERROR:
        return ErrorSeverity.MEDIUM;
      case DocumentErrorType.UNSUPPORTED_FORMAT:
      case DocumentErrorType.TIMEOUT_ERROR:
        return ErrorSeverity.MEDIUM;
      case DocumentErrorType.VALIDATION_ERROR:
      case DocumentErrorType.PERMISSION_ERROR:
        return ErrorSeverity.LOW;
      default:
        return ErrorSeverity.MEDIUM;
    }
  }

  /**
   * 生成用户友好的错误消息
   */
  private static generateMessage(
    errorType: DocumentErrorType,
    fileName?: string
  ): string {
    const fileInfo = fileName ? ` "${fileName}"` : '';

    switch (errorType) {
      case DocumentErrorType.FILE_NOT_FOUND:
        return `找不到文件${fileInfo}`;
      case DocumentErrorType.FILE_TOO_LARGE:
        return `文件${fileInfo}过大，无法处理`;
      case DocumentErrorType.UNSUPPORTED_FORMAT:
        return `不支持${fileInfo}的文件格式`;
      case DocumentErrorType.PARSING_FAILED:
        return `无法解析文件${fileInfo}`;
      case DocumentErrorType.ENCODING_ERROR:
        return `文件${fileInfo}编码格式不正确`;
      case DocumentErrorType.MEMORY_ERROR:
        return `文件${fileInfo}太大，内存不足`;
      case DocumentErrorType.TIMEOUT_ERROR:
        return `处理文件${fileInfo}超时`;
      case DocumentErrorType.NETWORK_ERROR:
        return `网络连接失败，无法上传文件${fileInfo}`;
      case DocumentErrorType.PERMISSION_ERROR:
        return `没有权限访问文件${fileInfo}`;
      case DocumentErrorType.VALIDATION_ERROR:
        return `文件${fileInfo}格式验证失败`;
      default:
        return `处理文件${fileInfo}时发生未知错误`;
    }
  }

  /**
   * 生成详细的错误信息
   */
  private static generateDetails(
    error: any,
    fileName?: string,
    fileSize?: number
  ): string {
    const details: string[] = [];

    if (fileName) {
      details.push(`文件名: ${fileName}`);
    }

    if (fileSize) {
      const sizeStr = this.formatFileSize(fileSize);
      details.push(`文件大小: ${sizeStr}`);
    }

    if (error?.message) {
      details.push(`错误信息: ${error.message}`);
    }

    if (error?.code) {
      details.push(`错误代码: ${error.code}`);
    }

    return details.join('\n');
  }

  /**
   * 生成处理建议
   */
  private static generateSuggestion(
    errorType: DocumentErrorType,
    fileName?: string
  ): string {
    switch (errorType) {
      case DocumentErrorType.FILE_NOT_FOUND:
        return '请确保文件存在且路径正确，然后重新上传';

      case DocumentErrorType.FILE_TOO_LARGE:
        return '请尝试:\n1. 减小文件大小（如压缩PDF）\n2. 分割大文件为多个小文件\n3. 联系管理员提高文件大小限制';

      case DocumentErrorType.UNSUPPORTED_FORMAT:
        return '请确保文件格式受支持:\n支持的格式: PDF, DOCX, DOC, TXT, MD, HTML, XLSX, XLS, CSV\n您可以尝试将文件转换为支持的格式';

      case DocumentErrorType.PARSING_FAILED:
        return '请尝试:\n1. 使用其他软件重新保存文件\n2. 将文件转换为其他格式\n3. 检查文件是否损坏\n4. 如果 PDF 是扫描件，请配置云端 OCR 服务（如 Qwen API）\n5. 检查 LinkMind 服务器是否正常运行';

      case DocumentErrorType.ENCODING_ERROR:
        return '请尝试:\n1. 使用UTF-8编码重新保存文件\n2. 在其他应用中打开并重新保存';

      case DocumentErrorType.MEMORY_ERROR:
        return '请尝试:\n1. 关闭其他应用程序\n2. 使用更小的文件\n3. 刷新页面后重试';

      case DocumentErrorType.TIMEOUT_ERROR:
        return '请尝试:\n1. 检查网络连接\n2. 稍后重试\n3. 使用更小的文件';

      case DocumentErrorType.NETWORK_ERROR:
        return '请检查网络连接后重试';

      case DocumentErrorType.PERMISSION_ERROR:
        return '请确保文件没有被其他程序占用，且您有读取权限';

      case DocumentErrorType.VALIDATION_ERROR:
        return '请检查文件格式是否正确，或尝试重新保存文件';

      default:
        return '请尝试重新上传文件。如果问题持续存在，请联系技术支持';
    }
  }

  /**
   * 格式化文件大小
   */
  private static formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  /**
   * 将诊断结果转换为日志格式
   */
  static toLogFormat(result: DiagnosticResult): string {
    return `
[Document Diagnostic]
类型: ${result.errorType}
严重级别: ${result.severity}
消息: ${result.message}
详情:
${result.details}
建议:
${result.suggestion}
时间: ${result.timestamp}
技术详情:
${JSON.stringify(result.technicalDetails, null, 2)}
`.trim();
  }
}

/**
 * 错误信息国际化映射
 */
export const ErrorMessages: Record<DocumentErrorType, { zh: string; en: string }> = {
  [DocumentErrorType.FILE_NOT_FOUND]: {
    zh: '文件未找到',
    en: 'File not found'
  },
  [DocumentErrorType.FILE_TOO_LARGE]: {
    zh: '文件过大',
    en: 'File too large'
  },
  [DocumentErrorType.UNSUPPORTED_FORMAT]: {
    zh: '不支持的文件格式',
    en: 'Unsupported file format'
  },
  [DocumentErrorType.PARSING_FAILED]: {
    zh: '文档解析失败',
    en: 'Document parsing failed'
  },
  [DocumentErrorType.ENCODING_ERROR]: {
    zh: '文件编码错误',
    en: 'File encoding error'
  },
  [DocumentErrorType.MEMORY_ERROR]: {
    zh: '内存不足',
    en: 'Insufficient memory'
  },
  [DocumentErrorType.TIMEOUT_ERROR]: {
    zh: '处理超时',
    en: 'Processing timeout'
  },
  [DocumentErrorType.NETWORK_ERROR]: {
    zh: '网络错误',
    en: 'Network error'
  },
  [DocumentErrorType.PERMISSION_ERROR]: {
    zh: '权限不足',
    en: 'Permission denied'
  },
  [DocumentErrorType.VALIDATION_ERROR]: {
    zh: '验证失败',
    en: 'Validation failed'
  },
  [DocumentErrorType.UNKNOWN_ERROR]: {
    zh: '未知错误',
    en: 'Unknown error'
  }
};

/**
 * 获取错误类型对应的用户友好消息
 */
export function getErrorMessage(
  errorType: DocumentErrorType,
  locale: 'zh' | 'en' = 'zh'
): string {
  return ErrorMessages[errorType]?.[locale] || ErrorMessages[DocumentErrorType.UNKNOWN_ERROR][locale];
}
