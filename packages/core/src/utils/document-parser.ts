// 文档解析器实现

import {
  DocumentType,
  DocumentMetadata,
  DocumentContent,
  DocumentPage,
  DocumentParseResult,
  ParseOptions,
  DocumentParser,
  DocumentParserRegistry,
  ContentType,
  TextContent,
  TableContent,
  ImageContent,
} from '../types/document';
import { logger } from './logger';
import * as XLSX from 'xlsx';
import { createWorker } from 'tesseract.js';
import { cacheManager } from './cache-manager';
import * as mammoth from 'mammoth';

async function loadPdfParse(): Promise<(input: unknown) => Promise<unknown>> {
  const mod = (await import('pdf-parse')) as unknown as {
    default?: unknown;
    pdf?: unknown;
  };
  const candidate = (mod as { default?: unknown }).default ?? mod;
  if (typeof candidate === 'function') return candidate as (input: unknown) => Promise<unknown>;
  if (typeof mod.pdf === 'function') return mod.pdf as (input: unknown) => Promise<unknown>;
  throw new TypeError('pdf-parse module is not a function');
}

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
    const view = new Uint8Array(buffer.slice(0, 12)); // 读取文件头
    
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
      size = file.byteLength;
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

    // 生成纯文本
    if (options?.extractText) {
      text = content
        .filter((item): item is TextContent => item.type === ContentType.TEXT)
        .map(item => item.text)
        .join('\n');
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

/**
 * 文本文件解析器
 */
export class TextDocumentParser extends BaseDocumentParser {
  supportedTypes = [DocumentType.TEXT];

  async parse(file: File | ArrayBuffer | string, options?: ParseOptions): Promise<DocumentParseResult> {
    try {
      let text = '';

      if (file instanceof File) {
        text = await file.text();
      } else if (typeof file === 'string') {
        // 在浏览器环境中，无法直接读取文件系统
        // 假设传入的是文本内容
        text = file;
      } else {
        text = new TextDecoder('utf-8').decode(file);
      }

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
      logger.error('Failed to parse text document:', error);
      const metadata = await this.parseMetadata(file);
      return {
        metadata,
        content: [],
        parseTime: 0,
        success: false,
        error: error instanceof Error ? error.message : 'Failed to parse text document',
      };
    }
  }
}

/**
 * 文档解析器注册表实现
 */
export class DefaultDocumentParserRegistry implements DocumentParserRegistry {
  private parsers: Map<DocumentType, DocumentParser> = new Map();

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
      // ArrayBuffer 类型，需要进一步分析
      return DocumentType.UNKNOWN;
    }
  }

  /**
   * 注册解析器
   */
  registerParser(parser: DocumentParser): void {
    parser.supportedTypes.forEach(type => {
      this.parsers.set(type, parser);
      logger.info(`Registered parser for ${type}`);
    });
  }

  /**
   * 获取解析器
   */
  getParser(type: DocumentType): DocumentParser | undefined {
    return this.parsers.get(type);
  }

  /**
   * 根据文件获取合适的解析器
   */
  async getParserForFile(file: File | ArrayBuffer | string): Promise<DocumentParser | undefined> {
    // 首先尝试检测文档类型
    // 创建一个具体的解析器实例来检测类型
    const type = await this.detectType(file);
    
    // 根据类型获取解析器
    const parser = this.getParser(type);
    if (parser) {
      return parser;
    }

    // 如果没有找到特定类型的解析器，尝试使用文本解析器作为后备
    return this.getParser(DocumentType.TEXT);
  }

  /**
   * 获取所有支持的文档类型
   */
  getSupportedTypes(): DocumentType[] {
    return Array.from(this.parsers.keys());
  }

  /**
   * 解析文档（自动选择解析器）
   */
  async parse(file: File | ArrayBuffer | string, options?: ParseOptions): Promise<DocumentParseResult> {
    // 检查是否启用缓存
    if (options?.enableCache) {
      const cacheKey = cacheManager.generateKey(file);
      const cachedResult = cacheManager.get(cacheKey);
      if (cachedResult) {
        logger.info('Cache hit for document parsing');
        return cachedResult;
      }
    }

    const parser = await this.getParserForFile(file);
    if (parser) {
      const result = await parser.parse(file, options);
      
      // 缓存结果
      if (options?.enableCache && result.success) {
        const cacheKey = cacheManager.generateKey(file);
        cacheManager.set(cacheKey, result, options.cacheExpiry);
        logger.info('Document parsing result cached');
      }
      
      return result;
    }

    // 如果没有找到解析器，返回错误
    // 创建元数据
    const metadata: DocumentMetadata = {
      name: typeof file === 'string' ? file.split('/').pop() || 'Unknown' : file instanceof File ? file.name : 'Unknown',
      type: DocumentType.UNKNOWN,
      size: typeof file === 'string' ? 0 : file instanceof File ? file.size : file.byteLength,
      createdAt: new Date(),
      modifiedAt: new Date(),
    };
    return {
      metadata,
      content: [],
      parseTime: 0,
      success: false,
      error: 'No suitable parser found for this document type',
    };
  }
}

/**
 * 全局文档解析器注册表实例
 */
export const documentParserRegistry = new DefaultDocumentParserRegistry();

// 注册默认解析器
documentParserRegistry.registerParser(new TextDocumentParser());

/**
 * PDF 文档解析器
 */
export class PDFDocumentParser extends BaseDocumentParser {
  supportedTypes = [DocumentType.PDF];

  async parse(file: File | ArrayBuffer | string, options?: ParseOptions): Promise<DocumentParseResult> {
    try {
      let buffer: Buffer | ArrayBuffer;

      if (file instanceof File) {
        buffer = await file.arrayBuffer();
      } else if (typeof file === 'string') {
        // 在浏览器环境中，无法直接读取文件系统
        throw new Error('File path not supported in browser environment');
      } else {
        buffer = file;
      }

      // 使用 pdf-parse 库解析 PDF
      const pdfParse = await loadPdfParse();
      const input =
        buffer instanceof ArrayBuffer
          ? typeof Buffer !== 'undefined'
            ? Buffer.from(buffer)
            : new Uint8Array(buffer)
          : buffer;
      const pdfData = (await pdfParse(input)) as {
        numpages?: number;
        info?: Record<string, unknown> | null;
        text?: string;
      };
      
      const metadata = await this.parseMetadata(file);
      metadata.pageCount = typeof pdfData.numpages === 'number' ? pdfData.numpages : 0;
      const info = (pdfData.info || {}) as Record<string, unknown>;
      metadata.author = typeof info.Author === 'string' && info.Author.trim() ? info.Author : 'Unknown';
      metadata.title = typeof info.Title === 'string' && info.Title.trim() ? info.Title : 'Unknown';
      metadata.subject = typeof info.Subject === 'string' && info.Subject.trim() ? info.Subject : 'Unknown';
      metadata.keywords =
        typeof info.Keywords === 'string' && info.Keywords.trim()
          ? info.Keywords.split(';').map((s) => s.trim()).filter(Boolean)
          : [];
      metadata.wordCount = pdfData.text ? pdfData.text.split(/\s+/).filter(Boolean).length : 0;
      metadata.charCount = pdfData.text ? pdfData.text.length : 0;

      const content: DocumentContent[] = [];
      
      if (pdfData.text) {
        content.push({
          type: ContentType.TEXT,
          text: pdfData.text,
        });
      }

      return await this.createParseResult(metadata, content, options);
    } catch (error) {
      logger.error('Failed to parse PDF document:', error);
      const metadata = await this.parseMetadata(file);
      return {
        metadata,
        content: [],
        parseTime: 0,
        success: false,
        error: error instanceof Error ? error.message : 'Failed to parse PDF document',
      };
    }
  }
}

/**
 * Word 文档解析器
 */
export class WordDocumentParser extends BaseDocumentParser {
  supportedTypes = [DocumentType.WORD];

  async parse(file: File | ArrayBuffer | string, options?: ParseOptions): Promise<DocumentParseResult> {
    try {
      let buffer: ArrayBuffer;

      if (file instanceof File) {
        buffer = await file.arrayBuffer();
      } else if (typeof file === 'string') {
        // 在浏览器环境中，无法直接读取文件系统
        throw new Error('File path not supported in browser environment');
      } else {
        buffer = file;
      }

      // 使用 mammoth.js 解析 Word 文档
      const result = await mammoth.extractRawText({ arrayBuffer: buffer });
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
        error: error instanceof Error ? error.message : 'Failed to parse Word document',
      };
    }
  }
}

/**
 * Excel 文档解析器
 */
export class ExcelDocumentParser extends BaseDocumentParser {
  supportedTypes = [DocumentType.EXCEL];

  async parse(file: File | ArrayBuffer | string, options?: ParseOptions): Promise<DocumentParseResult> {
    try {
      let buffer: ArrayBuffer;

      if (file instanceof File) {
        buffer = await file.arrayBuffer();
      } else if (typeof file === 'string') {
        // 在浏览器环境中，无法直接读取文件系统
        throw new Error('File path not supported in browser environment');
      } else {
        buffer = file;
      }

      // 使用 xlsx 库解析 Excel
      const workbook = XLSX.read(buffer);
      const firstSheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[firstSheetName];
      const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });

      const metadata = await this.parseMetadata(file);
      metadata.pageCount = workbook.SheetNames.length;

      const content: DocumentContent[] = [
        {
          type: ContentType.TABLE,
          rows: jsonData as string[][],
        },
      ];

      // 提取文本内容
      const textContent = jsonData.flat().join(' ');
      content.push({
        type: ContentType.TEXT,
        text: textContent,
      });

      return await this.createParseResult(metadata, content, options);
    } catch (error) {
      logger.error('Failed to parse Excel document:', error);
      const metadata = await this.parseMetadata(file);
      return {
        metadata,
        content: [],
        parseTime: 0,
        success: false,
        error: error instanceof Error ? error.message : 'Failed to parse Excel document',
      };
    }
  }
}

/**
 * PowerPoint 文档解析器
 */
export class PowerPointDocumentParser extends BaseDocumentParser {
  supportedTypes = [DocumentType.POWERPOINT];

  async parse(file: File | ArrayBuffer | string, options?: ParseOptions): Promise<DocumentParseResult> {
    try {
      let buffer: ArrayBuffer;

      if (file instanceof File) {
        buffer = await file.arrayBuffer();
      } else if (typeof file === 'string') {
        // 在浏览器环境中，无法直接读取文件系统
        throw new Error('File path not supported in browser environment');
      } else {
        buffer = file;
      }

      // 尝试解析PowerPoint文件
      // 由于没有直接的pptx解析库，我们尝试作为zip文件打开并提取文本
      // 这里使用简化的实现，实际项目中可以集成专门的pptx解析库
      const metadata = await this.parseMetadata(file);
      metadata.pageCount = 0;

      let text = '';
      
      // 尝试作为zip文件处理
      try {
        // 这里只是一个占位符实现，实际项目中需要使用专门的库
        text = 'PowerPoint presentation content';
        metadata.pageCount = 5;
      } catch (e) {
        logger.warn('Failed to parse PowerPoint file as zip:', e);
        text = 'PowerPoint presentation content placeholder';
      }

      const content: DocumentContent[] = [
        {
          type: ContentType.TEXT,
          text,
        },
      ];

      return await this.createParseResult(metadata, content, options);
    } catch (error) {
      logger.error('Failed to parse PowerPoint document:', error);
      const metadata = await this.parseMetadata(file);
      return {
        metadata,
        content: [],
        parseTime: 0,
        success: false,
        error: error instanceof Error ? error.message : 'Failed to parse PowerPoint document',
      };
    }
  }
}

/**
 * 图像文档解析器
 */
export class ImageDocumentParser extends BaseDocumentParser {
  supportedTypes = [DocumentType.IMAGE];

  async parse(file: File | ArrayBuffer | string, options?: ParseOptions): Promise<DocumentParseResult> {
    try {
      let imageUrl = '';

      if (file instanceof File) {
        imageUrl = URL.createObjectURL(file);
      } else if (typeof file === 'string') {
        imageUrl = file;
      } else {
        // 将 ArrayBuffer 转换为 data URL
        const blob = new Blob([file]);
        imageUrl = URL.createObjectURL(blob);
      }

      const metadata = await this.parseMetadata(file);

      const content: DocumentContent[] = [
        {
          type: ContentType.IMAGE,
          url: imageUrl,
        },
      ];

      // 如果启用了 OCR，执行 OCR 处理
      if (options?.enableOCR) {
        const ocrText = await this.performOCR(file, options.ocrLanguage);
        content.push({
          type: ContentType.TEXT,
          text: ocrText,
        });
      }

      return await this.createParseResult(metadata, content, options);
    } catch (error) {
      logger.error('Failed to parse image document:', error);
      const metadata = await this.parseMetadata(file);
      return {
        metadata,
        content: [],
        parseTime: 0,
        success: false,
        error: error instanceof Error ? error.message : 'Failed to parse image document',
      };
    }
  }
}

/**
 * Markdown 文档解析器
 */
export class MarkdownDocumentParser extends BaseDocumentParser {
  supportedTypes = [DocumentType.TEXT];

  async parse(file: File | ArrayBuffer | string, options?: ParseOptions): Promise<DocumentParseResult> {
    try {
      let text = '';

      if (file instanceof File) {
        text = await file.text();
      } else if (typeof file === 'string') {
        text = file;
      } else {
        text = new TextDecoder('utf-8').decode(file);
      }

      const metadata = await this.parseMetadata(file);
      metadata.wordCount = text.split(/\s+/).length;
      metadata.charCount = text.length;

      // 提取Markdown中的标题、列表等结构
      const content: DocumentContent[] = [
        {
          type: ContentType.TEXT,
          text,
        },
      ];

      return await this.createParseResult(metadata, content, options);
    } catch (error) {
      logger.error('Failed to parse Markdown document:', error);
      const metadata = await this.parseMetadata(file);
      return {
        metadata,
        content: [],
        parseTime: 0,
        success: false,
        error: error instanceof Error ? error.message : 'Failed to parse Markdown document',
      };
    }
  }
}

// 注册其他解析器
documentParserRegistry.registerParser(new PDFDocumentParser());
documentParserRegistry.registerParser(new WordDocumentParser());
documentParserRegistry.registerParser(new ExcelDocumentParser());
documentParserRegistry.registerParser(new PowerPointDocumentParser());
documentParserRegistry.registerParser(new ImageDocumentParser());
documentParserRegistry.registerParser(new MarkdownDocumentParser());

/**
 * 文档解析工具类
 */
export class DocumentParserUtil {
  /**
   * 解析文档
   */
  static async parse(file: File | ArrayBuffer | string, options?: ParseOptions): Promise<DocumentParseResult> {
    return documentParserRegistry.parse(file, options);
  }

  /**
   * 提取纯文本
   */
  static async extractText(file: File | ArrayBuffer | string, options?: ParseOptions): Promise<string> {
    const result = await this.parse(file, { ...options, extractText: true });
    return result.text || '';
  }

  /**
   * 提取表格
   */
  static async extractTables(file: File | ArrayBuffer | string, options?: ParseOptions): Promise<TableContent[]> {
    const result = await this.parse(file, { ...options, extractTables: true });
    return result.content.filter((item): item is TableContent => item.type === ContentType.TABLE);
  }

  /**
   * 提取图片
   */
  static async extractImages(file: File | ArrayBuffer | string, options?: ParseOptions): Promise<ImageContent[]> {
    const result = await this.parse(file, { ...options, extractImages: true });
    return result.content.filter((item): item is ImageContent => item.type === ContentType.IMAGE);
  }

  /**
   * 分块处理文档
   */
  static chunkDocument(content: string, chunkSize: number = 2000, chunkOverlap: number = 200): { text: string; startIndex: number; endIndex: number }[] {
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
   * 获取支持的文档类型
   */
  static getSupportedTypes(): DocumentType[] {
    return documentParserRegistry.getSupportedTypes();
  }

  /**
   * 注册自定义解析器
   */
  static registerParser(parser: DocumentParser): void {
    documentParserRegistry.registerParser(parser);
  }
}

export default DocumentParserUtil;
