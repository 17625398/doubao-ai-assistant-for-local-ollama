// Excel 文档解析器

import { BaseDocumentParser } from './base-document-parser';
import {
  DocumentType,
  DocumentParseResult,
  ParseOptions,
  ContentType,
} from '../types/document';
import { logger } from '../utils/logger';
import * as XLSX from 'xlsx';

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

// 导入缺失的类型
import { DocumentContent } from '../types/document';
