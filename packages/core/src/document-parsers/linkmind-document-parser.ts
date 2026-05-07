// LinkMind 文档解析器 - 使用 LinkMind 服务进行文档处理

import { BaseDocumentParser } from './base-document-parser';
import {
  DocumentType,
  DocumentMetadata,
  DocumentContent,
  DocumentParseResult,
  ParseOptions,
  ContentType,
  TextContent,
  TableContent,
  ImageContent,
} from '../types/document';
import { logger } from '../utils/logger';
import { linkMindService, LinkMindDocumentRequest, LinkMindOCRRequest } from '../services/linkmind-service';
import { featureCapabilityService } from '../services/feature-capability-service';

export class LinkMindDocumentParser extends BaseDocumentParser {
  supportedTypes = [
    DocumentType.UNKNOWN,
  ];

  /**
   * 解析文档
   */
  async parse(file: File | ArrayBuffer | string, options?: ParseOptions): Promise<DocumentParseResult> {
    const startTime = Date.now();
    
    try {
      if (!featureCapabilityService.isEnabled('enableLinkMindDocument')) {
        return {
          metadata: await this.parseMetadata(file),
          content: [],
          text: '',
          pages: [],
          chunks: [],
          parseTime: Date.now() - startTime,
          success: false,
          error: 'LinkMind document capability is disabled',
        };
      }
      logger.info('[LinkMindDocumentParser] Starting document parsing');
      
      // 解析元数据
      const metadata = await this.parseMetadata(file);
      
      // 准备 LinkMind 文档请求
      const documentRequest: LinkMindDocumentRequest = {
        extractText: options?.extractText ?? true,
        extractTables: options?.extractTables ?? false,
        extractImages: options?.extractImages ?? false,
      };

      let documentResponse;

      if (file instanceof File) {
        documentRequest.file = file;
        logger.info('[LinkMindDocumentParser] Sending file to LinkMind:', file.name, file.size);
        documentResponse = await linkMindService.extractDocument(documentRequest);
      } else if (typeof file === 'string') {
        documentRequest.url = file;
        logger.info('[LinkMindDocumentParser] Sending URL to LinkMind:', file);
        documentResponse = await linkMindService.extractDocument(documentRequest);
      } else {
        // ArrayBuffer 类型，转换为 Blob
        const blob = new Blob([file]);
        documentRequest.file = blob;
        logger.info('[LinkMindDocumentParser] Sending ArrayBuffer to LinkMind:', file.byteLength);
        documentResponse = await linkMindService.extractDocument(documentRequest);
      }

      if (!documentResponse.success) {
        logger.error('[LinkMindDocumentParser] LinkMind document extraction failed:', documentResponse.error);
        return {
          metadata,
          content: [],
          text: '',
          pages: [],
          chunks: [],
          parseTime: Date.now() - startTime,
          success: false,
          error: documentResponse.error || 'LinkMind document extraction failed',
        };
      }

      // 构建内容
      const content: DocumentContent[] = [];

      // 添加文本内容
      if (documentResponse.text) {
        content.push({
          type: ContentType.TEXT,
          text: documentResponse.text,
        });
      }

      // 添加表格内容
      if (documentResponse.tables && documentResponse.tables.length > 0) {
        documentResponse.tables.forEach((tableText, index) => {
          content.push({
            type: ContentType.TABLE,
            rows: tableText.split('\n').map(row => row.split(',')),
            rawCsv: tableText,
            title: `Table ${index + 1}`,
          });
        });
      }

      // 添加图片内容
      if (documentResponse.images && documentResponse.images.length > 0) {
        documentResponse.images.forEach((imageUrl, index) => {
          content.push({
            type: ContentType.IMAGE,
            url: imageUrl,
            alt: `Image ${index + 1}`,
          });
        });
      }

      // 执行 OCR（如果需要）
      if (
        options?.enableOCR &&
        featureCapabilityService.isEnabled('enableLinkMindOcr') &&
        content.some(item => item.type === ContentType.IMAGE)
      ) {
        const imageContents = content.filter((item): item is ImageContent => item.type === ContentType.IMAGE);
        for (const imageContent of imageContents) {
          try {
            const ocrRequest: LinkMindOCRRequest = {
              image: imageContent.url,
              language: options.ocrLanguage || 'eng',
            };
            const ocrResponse = await linkMindService.performOCR(ocrRequest);
            if (ocrResponse.success && ocrResponse.text) {
              content.push({
                type: ContentType.TEXT,
                text: ocrResponse.text,
              });
            }
          } catch (error) {
            logger.error('[LinkMindDocumentParser] OCR failed:', error);
          }
        }
      }

      // 生成解析结果
      return await this.createParseResult(metadata, content, options);
    } catch (error) {
      logger.error('[LinkMindDocumentParser] Parse error:', error);
      const metadata = await this.parseMetadata(file);
      return {
        metadata,
        content: [],
        text: '',
        pages: [],
        chunks: [],
        parseTime: Date.now() - startTime,
        success: false,
        error: error instanceof Error ? error.message : 'Unknown parse error',
      };
    }
  }

  /**
   * 执行 OCR 识别
   */
  async performOCR(image: File | ArrayBuffer | string, language: string = 'eng'): Promise<string> {
    try {
      logger.info('[LinkMindDocumentParser] Performing OCR with LinkMind:', language);

      let imageUrl: string;

      if (image instanceof File) {
        // 对于 File 对象，使用 LinkMind 的文件上传
        const ocrResponse = await linkMindService.extractDocument({
          file: image,
          extractText: true,
        });
        return ocrResponse.success && ocrResponse.text ? ocrResponse.text : '';
      } else if (image instanceof ArrayBuffer) {
        // 对于 ArrayBuffer，转换为 Blob
        const blob = new Blob([image]);
        const ocrResponse = await linkMindService.extractDocument({
          file: blob,
          extractText: true,
        });
        return ocrResponse.success && ocrResponse.text ? ocrResponse.text : '';
      } else {
        // 对于 URL 字符串
        const ocrRequest: LinkMindOCRRequest = {
          image,
          language,
        };
        const ocrResponse = await linkMindService.performOCR(ocrRequest);
        return ocrResponse.success && ocrResponse.text ? ocrResponse.text : '';
      }
    } catch (error) {
      logger.error('[LinkMindDocumentParser] OCR error:', error);
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
}

export const linkMindDocumentParser = new LinkMindDocumentParser();
