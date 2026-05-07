// Markdown 文档解析器

import { BaseDocumentParser } from './base-document-parser';
import {
  DocumentType,
  DocumentParseResult,
  ParseOptions,
  ContentType,
} from '../types/document';
import { logger } from '../utils/logger';

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

// 导入缺失的类型
import { DocumentContent } from '../types/document';
