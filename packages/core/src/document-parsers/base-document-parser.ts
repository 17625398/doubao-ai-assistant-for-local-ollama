// 基础文档解析器类

import {
  DocumentType,
  DocumentMetadata,
  DocumentContent,
  DocumentParseResult,
  ParseOptions,
  DocumentParser,
  ContentType,
  TextContent,
  TableContent,
  ImageContent,
} from '../types/document';
import { logger } from '../utils/logger';
import { createWorker } from 'tesseract.js';

/**
 * 基础文档解析器类
 */
export abstract class BaseDocumentParser implements DocumentParser {
  abstract supportedTypes: DocumentType[];

  /**
   * 检测文档类型
   */
  async detectType(file: File | ArrayBuffer | string): Promise<DocumentType> {
    if (typeof file === 'string') {
      // 根据文件扩展名检测
      const extension = file.toLowerCase().split('.').pop();
      switch (extension) {
        case 'pdf':
          return DocumentType.PDF;
        case 'doc':
        case 'docx':
          return DocumentType.WORD;
        case 'xls':
        case 'xlsx':
          return DocumentType.EXCEL;
        case 'ppt':
        case 'pptx':
          return DocumentType.POWERPOINT;
        case 'txt':
        case 'md':
        case 'html':
        case 'htm':
          return DocumentType.TEXT;
        case 'jpg':
        case 'jpeg':
        case 'png':
        case 'gif':
        case 'webp':
          return DocumentType.IMAGE;
        default:
          return DocumentType.UNKNOWN;
      }
    } else if (file instanceof File) {
      // 根据文件 MIME 类型检测
      const mimeType = file.type;
      if (mimeType.includes('pdf')) {
        return DocumentType.PDF;
      } else if (mimeType.includes('word') || mimeType.includes('document')) {
        return DocumentType.WORD;
      } else if (mimeType.includes('excel') || mimeType.includes('sheet')) {
        return DocumentType.EXCEL;
      } else if (mimeType.includes('powerpoint') || mimeType.includes('presentation')) {
        return DocumentType.POWERPOINT;
      } else if (mimeType.includes('text')) {
        return DocumentType.TEXT;
      } else if (mimeType.includes('image')) {
        return DocumentType.IMAGE;
      } else {
        return DocumentType.UNKNOWN;
      }
    } else {
      // ArrayBuffer 类型，根据文件头特征检测
      return this.detectTypeFromArrayBuffer(file);
    }
  }

  /**
   * 从 ArrayBuffer 检测文档类型
   */
  private detectTypeFromArrayBuffer(buffer: ArrayBuffer): DocumentType {
    // 检查 buffer 是否已分离（detached）
    if (buffer.byteLength === 0 && buffer.byteLength !== (buffer as ArrayBuffer & { maxByteLength?: number }).maxByteLength) {
      // buffer 已分离，返回默认值
      console.warn('[detectTypeFromArrayBuffer] ArrayBuffer is detached, returning UNKNOWN')
      return DocumentType.UNKNOWN
    }
    
    // 复制 buffer 以避免被分离后无法访问
    let view: Uint8Array
    try {
      view = new Uint8Array(buffer.slice(0, 12)) // 读取文件头
    } catch (e) {
      // 如果复制失败，buffer 可能已分离
      console.warn('[detectTypeFromArrayBuffer] Failed to slice buffer, may be detached')
      return DocumentType.UNKNOWN
    }
    
    // PDF 文件头：%PDF-1.
    if (view[0] === 0x25 && view[1] === 0x50 && view[2] === 0x44 && view[3] === 0x46 && view[4] === 0x2D) {
      return DocumentType.PDF;
    }
    
    // DOCX/XLSX/PPTX 文件头：PK 压缩文件
    if (view[0] === 0x50 && view[1] === 0x4B) {
      // 这里简化处理，实际可以根据压缩包内的内容进一步区分
      return DocumentType.WORD;
    }
    
    // JPEG 文件头：FF D8
    if (view[0] === 0xFF && view[1] === 0xD8) {
      return DocumentType.IMAGE;
    }
    
    // PNG 文件头：89 50 4E 47
    if (view[0] === 0x89 && view[1] === 0x50 && view[2] === 0x4E && view[3] === 0x47) {
      return DocumentType.IMAGE;
    }
    
    // GIF 文件头：47 49 46
    if (view[0] === 0x47 && view[1] === 0x49 && view[2] === 0x46) {
      return DocumentType.IMAGE;
    }
    
    // WebP 文件头：52 49 46 46 ... 57 45 42 50
    if (view[0] === 0x52 && view[1] === 0x49 && view[2] === 0x46 && view[3] === 0x46 && 
        view[8] === 0x57 && view[9] === 0x45 && view[10] === 0x42 && view[11] === 0x50) {
      return DocumentType.IMAGE;
    }
    
    // 文本文件：检查是否为 ASCII 或 UTF-8 文本
    let isText = true;
    for (let i = 0; i < Math.min(view.length, 100); i++) {
      const byte = view[i];
      // 允许可打印字符、空格、制表符、换行符
      if (byte < 32 && byte !== 9 && byte !== 10 && byte !== 13) {
        isText = false;
        break;
      }
    }
    if (isText) {
      return DocumentType.TEXT;
    }
    
    return DocumentType.UNKNOWN;
  }

  /**
   * 解析文档
   */
  abstract parse(file: File | ArrayBuffer | string, options?: ParseOptions): Promise<DocumentParseResult>;

  /**
   * 解析文档元数据
   */
  async parseMetadata(file: File | ArrayBuffer | string): Promise<DocumentMetadata> {
    const type = await this.detectType(file);
    let name = 'Unknown';
    let size = 0;

    if (file instanceof File) {
      name = file.name;
      size = file.size;
    } else if (typeof file === 'string') {
      name = file.split('/').pop() || 'Unknown';
      // 在浏览器环境中，无法直接获取文件大小
      size = 0;
    } else {
      // ArrayBuffer 可能已分离（detached），需要安全处理
      try {
        size = file.byteLength;
      } catch (e) {
        console.warn('[parseMetadata] Failed to get byteLength, buffer may be detached')
        size = 0;
      }
    }

    return {
      name,
      type,
      size,
      createdAt: new Date(),
      modifiedAt: new Date(),
    };
  }

  /**
   * 提取纯文本
   */
  async extractText(file: File | ArrayBuffer | string, options?: ParseOptions): Promise<string> {
    const result = await this.parse(file, { ...options, extractText: true });
    return result.text || '';
  }

  /**
   * 提取表格
   */
  async extractTables(file: File | ArrayBuffer | string, options?: ParseOptions): Promise<TableContent[]> {
    const result = await this.parse(file, { ...options, extractTables: true });
    return result.content.filter((item): item is TableContent => item.type === ContentType.TABLE);
  }

  /**
   * 提取图片
   */
  async extractImages(file: File | ArrayBuffer | string, options?: ParseOptions): Promise<ImageContent[]> {
    const result = await this.parse(file, { ...options, extractImages: true });
    return result.content.filter((item): item is ImageContent => item.type === ContentType.IMAGE);
  }

  /**
   * 执行 OCR 识别
   */
  async performOCR(image: File | ArrayBuffer | string, language: string = 'eng'): Promise<string> {
    logger.info('Performing OCR with language:', language);
    
    try {
      // 检查是否在浏览器环境中
      if (typeof window !== 'undefined') {
        // 浏览器环境 - 禁用 OCR 以避免潜在问题
        logger.warn('OCR is disabled in browser environment');
        return '';
      }
      
      const worker = await createWorker(language);
      await worker.reinitialize(language);

      const imageSource = image instanceof ArrayBuffer ? new Blob([image]) : image;

      const result = await worker.recognize(imageSource);
      await worker.terminate();

      return result?.data?.text || '';
    } catch (error) {
      logger.error('OCR failed:', error);
      return '';
    }
  }

  /**
   * 检查是否需要 OCR
   */
  async needsOCR(file: File | ArrayBuffer | string): Promise<boolean> {
    const type = await this.detectType(file);
    // 对于图像类型的文件，默认需要 OCR
    return type === DocumentType.IMAGE;
  }

  /**
   * 分块处理文档
   */
  chunkDocument(content: string, chunkSize: number = 2000, chunkOverlap: number = 200): { text: string; startIndex: number; endIndex: number }[] {
    const chunks: { text: string; startIndex: number; endIndex: number }[] = [];
    let startIndex = 0;

    while (startIndex < content.length) {
      const endIndex = Math.min(startIndex + chunkSize, content.length);
      const chunk = content.substring(startIndex, endIndex);
      chunks.push({ text: chunk, startIndex, endIndex });
      startIndex = endIndex - chunkOverlap;
      if (startIndex >= content.length - chunkOverlap) {
        break;
      }
    }

    return chunks;
  }

  /**
   * 生成解析结果
   */
  protected async createParseResult(metadata: DocumentMetadata, content: DocumentContent[], options?: ParseOptions): Promise<DocumentParseResult> {
    const startTime = Date.now();
    
    let text = '';
    let pages: DocumentPage[] = [];
    let chunks: { text: string; startIndex: number; endIndex: number; pageIndex?: number }[] = [];

    // 处理 OCR
    if (options?.enableOCR) {
      const imageContents = content.filter((item): item is ImageContent => item.type === ContentType.IMAGE);
      for (const imageContent of imageContents) {
        try {
          const ocrText = await this.performOCR(imageContent.url, options.ocrLanguage);
          // 将 OCR 结果添加为文本内容
          content.push({
            type: ContentType.TEXT,
            text: ocrText,
          });
        } catch (error) {
          logger.error('OCR failed:', error);
        }
      }
    }

    // 生成纯文本 - 始终从文本内容生成（不受 extractText 选项限制）
    // 这样即使 PDF 是图片型的，至少有描述性文本表明内容存在
    const textContents = content.filter((item): item is TextContent => item.type === ContentType.TEXT);
    if (textContents.length > 0) {
      text = textContents.map(item => item.text).join('\n');
    } else if (content.length > 0) {
      // 如果没有文本内容但有图片，生成描述性文本
      const imageCount = content.filter(item => item.type === ContentType.IMAGE).length;
      const tableCount = content.filter(item => item.type === ContentType.TABLE).length;
      const parts: string[] = [];
      if (imageCount > 0) parts.push(`${imageCount} 页图片`);
      if (tableCount > 0) parts.push(`${tableCount} 个表格`);
      if (parts.length > 0) {
        text = `[文档包含: ${parts.join(', ')}]`;
      }
    }

    // 按页面组织内容
    if (options?.parseByPage) {
      let currentPage: DocumentContent[] = [];
      let pageIndex = 0;

      content.forEach(item => {
        if (item.type === ContentType.PAGE_BREAK) {
          if (currentPage.length > 0) {
            pages.push({
              index: pageIndex++,
              content: [...currentPage],
            });
            currentPage = [];
          }
        } else {
          currentPage.push(item);
        }
      });

      if (currentPage.length > 0) {
        pages.push({
          index: pageIndex,
          content: currentPage,
        });
      }
    }

    // 分块处理
    if (options?.enableChunking && text) {
      const chunkResults = this.chunkDocument(
        text,
        options.chunkSize,
        options.chunkOverlap
      );
      chunks = chunkResults;
    }

    return {
      metadata,
      content,
      pages,
      text,
      chunks,
      parseTime: Date.now() - startTime,
      success: true,
    };
  }
}

// 导入缺失的类型
import { DocumentPage } from '../types/document';
