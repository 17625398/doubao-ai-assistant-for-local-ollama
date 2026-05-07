// 文档解析工具类

import {
  DocumentType,
  DocumentParseResult,
  ParseOptions,
  DocumentParser,
  TableContent,
  ImageContent,
} from '../types/document';
import { documentParserRegistry } from './document-parser-registry';

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
    return result.content.filter((item): item is TableContent => item.type === 'table');
  }

  /**
   * 提取图片
   */
  static async extractImages(file: File | ArrayBuffer | string, options?: ParseOptions): Promise<ImageContent[]> {
    const result = await this.parse(file, { ...options, extractImages: true });
    return result.content.filter((item): item is ImageContent => item.type === 'image');
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
