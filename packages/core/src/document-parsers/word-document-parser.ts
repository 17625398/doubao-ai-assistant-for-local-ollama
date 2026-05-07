// Word 文档解析器

import { BaseDocumentParser } from './base-document-parser';
import {
  DocumentType,
  DocumentParseResult,
  ParseOptions,
  ContentType,
} from '../types/document';
import { logger } from '../utils/logger';
const isBrowser = typeof window !== 'undefined' && typeof window.document !== 'undefined';

// 尝试导入 mammoth 库
let mammothLib: any = null;
try {
  import('mammoth').then((module) => {
    mammothLib = module.default || module;
  });
} catch (error) {
  logger.warn('Failed to import mammoth:', error);
}

/**
 * Word 文档解析器
 */
export class WordDocumentParser extends BaseDocumentParser {
  supportedTypes = [DocumentType.WORD];

  async parse(file: File | ArrayBuffer | string, options?: ParseOptions): Promise<DocumentParseResult> {
    try {
      // 获取文件名用于错误信息
      let fileName = 'Unknown';
      if (file instanceof File) {
        fileName = file.name;
        // 检查是否为 .doc 文件（旧版 Word 格式）
        if (file.name.toLowerCase().endsWith('.doc') && !file.name.toLowerCase().endsWith('.docx')) {
          const metadata = await this.parseMetadata(file);
          return {
            metadata,
            content: [],
            parseTime: 0,
            success: false,
            error: 'Old .doc format is not supported. Please use .docx format instead.',
          };
        }
      } else if (typeof file === 'string') {
        fileName = file.split('/').pop() || file;
        if (file.toLowerCase().endsWith('.doc') && !file.toLowerCase().endsWith('.docx')) {
          const metadata = await this.parseMetadata(file);
          return {
            metadata,
            content: [],
            parseTime: 0,
            success: false,
            error: 'Old .doc format is not supported. Please use .docx format instead.',
          };
        }
      }

      if (!mammothLib) {
        try {
          // 动态导入 mammoth 库
          const module = await import('mammoth');
          mammothLib = module.default || module;
        } catch (error) {
          logger.warn('Failed to import mammoth:', error);
          const metadata = await this.parseMetadata(file);
          return {
            metadata,
            content: [],
            parseTime: 0,
            success: false,
            error: 'Word document parsing is not available in this environment',
          };
        }
      }

      let buffer: ArrayBuffer;

      if (file instanceof File) {
        // 在解析之前验证文件格式
        const validationResult = await this.validateDocxFormat(file);
        if (!validationResult.valid) {
          const metadata = await this.parseMetadata(file);
          return {
            metadata,
            content: [],
            parseTime: 0,
            success: false,
            error: validationResult.error || 'Invalid docx file format',
          };
        }
        buffer = await file.arrayBuffer();
      } else if (typeof file === 'string') {
        // 在浏览器环境中，无法直接读取文件系统
        throw new Error('File path not supported in browser environment');
      } else {
        // file 是 ArrayBuffer 类型 - 验证格式
        const validationResult = this.validateArrayBufferFormat(file);
        if (!validationResult.valid) {
          const metadata = await this.parseMetadata(file);
          return {
            metadata,
            content: [],
            parseTime: 0,
            success: false,
            error: validationResult.error || 'Invalid docx file format',
          };
        }
        buffer = file;
      }

      const result = await mammothLib.extractRawText({ arrayBuffer: buffer });
      const text = result.value;

      const metadata = await this.parseMetadata(file);
      metadata.wordCount = text.split(/\s+/).length;
      metadata.charCount = text.length;

      const content: DocumentContent[] = [
        {
          type: ContentType.TEXT,
          text,
        },
      ];

      return await this.createParseResult(metadata, content, options);
    } catch (error) {
      logger.error('Failed to parse Word document:', error);
      const metadata = await this.parseMetadata(file);
      return {
        metadata,
        content: [],
        parseTime: 0,
        success: false,
        error: this.getUserFriendlyError(error),
      };
    }
  }

  /**
   * 验证 File 是否为有效的 DOCX 格式
   */
  private async validateDocxFormat(file: File): Promise<{ valid: boolean; error?: string }> {
    try {
      // 检查 MIME 类型
      const validMimeTypes = [
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'application/msword', // 有时 .docx 会被标记为 msword
        'application/octet-stream', // 某些浏览器可能返回这个
      ];

      // 检查文件扩展名
      const ext = file.name.toLowerCase();
      if (!ext.endsWith('.docx')) {
        return {
          valid: false,
          error: `文件 "${file.name}" 不是 .docx 格式。请确保使用 Microsoft Word 2007 或更高版本保存的文件。`,
        };
      }

      // 读取文件头验证 ZIP 格式（DOCX 本质上是 ZIP 文件）
      const headerBuffer = await file.slice(0, 4).arrayBuffer();
      const header = new Uint8Array(headerBuffer);

      // DOCX 文件以 PK 开头（ZIP 文件格式签名）
      // PK = 0x50, 0x4B
      if (header[0] !== 0x50 || header[1] !== 0x4B) {
        return {
          valid: false,
          error: `文件 "${file.name}" 似乎已损坏或不是有效的 Word 文档。文件头不匹配，请尝试重新保存文件。`,
        };
      }

      return { valid: true };
    } catch (error) {
      logger.warn('Failed to validate docx format:', error);
      // 如果验证失败，让 mammoth 自己处理
      return { valid: true };
    }
  }

  /**
   * 验证 ArrayBuffer 是否为有效的 DOCX 格式
   */
  private validateArrayBufferFormat(buffer: ArrayBuffer): { valid: boolean; error?: string } {
    try {
      const header = new Uint8Array(buffer, 0, 4);

      // DOCX 文件以 PK 开头（ZIP 文件格式签名）
      if (header[0] !== 0x50 || header[1] !== 0x4B) {
        return {
          valid: false,
          error: '提供的文件数据不是有效的 Word 文档格式。',
        };
      }

      return { valid: true };
    } catch (error) {
      logger.warn('Failed to validate arraybuffer format:', error);
      return { valid: true };
    }
  }

  /**
   * 将技术错误转换为用户友好的错误信息
   */
  private getUserFriendlyError(error: unknown): string {
    const errorMessage = error instanceof Error ? error.message : String(error);

    if (errorMessage.includes('body element')) {
      return '文件格式无效。请确认文件是使用 Microsoft Word 保存的 .docx 格式，而不是从网页或其他程序导出的文件。';
    }

    if (errorMessage.includes('Could not find') || errorMessage.includes('not a docx')) {
      return '文件似乎已损坏。请尝试在 Microsoft Word 中打开并重新保存该文件。';
    }

    if (errorMessage.includes('ENOENT') || errorMessage.includes('not found')) {
      return '文件内容为空或已损坏。';
    }

    return `Word 文档解析失败: ${errorMessage}`;
  }
}

// 导入缺失的类型
import { DocumentContent } from '../types/document';
