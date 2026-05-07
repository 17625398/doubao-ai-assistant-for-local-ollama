// PowerPoint 文档解析器

import { BaseDocumentParser } from './base-document-parser';
import {
  DocumentType,
  DocumentParseResult,
  ParseOptions,
  ContentType,
} from '../types/document';
import { logger } from '../utils/logger';
import JSZip from 'jszip';

/**
 * PowerPoint 文档解析器
 * 使用 JSZip 解析 pptx 文件（pptx 实际上是一个 zip 文件）
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

      // 使用 JSZip 解析 pptx 文件
      const zip = await JSZip.loadAsync(buffer);
      
      const metadata = await this.parseMetadata(file);
      
      // 提取幻灯片数量（通过计算 slide 文件数量）
      let slideCount = 0;
      zip.forEach((relativePath) => {
        if (relativePath.match(/ppt\/slides\/slide\d+\.xml/)) {
          slideCount++;
        }
      });
      metadata.pageCount = slideCount;

      // 提取所有幻灯片的文本内容
      const content: DocumentContent[] = [];
      let fullText = '';
      
      // 按顺序处理每个幻灯片
      for (let i = 1; i <= slideCount; i++) {
        const slidePath = `ppt/slides/slide${i}.xml`;
        const slideFile = zip.file(slidePath);
        
        if (slideFile) {
          const slideXml = await slideFile.async('text');
          const slideText = this.extractTextFromSlideXml(slideXml);
          
          const slideContent = `幻灯片 ${i}:\n${slideText}\n`;
          fullText += slideContent + '---\n';
          
          content.push({
            type: ContentType.TEXT,
            text: slideContent,
          });
        }
      }

      // 添加完整的文本内容
      if (fullText) {
        content.unshift({
          type: ContentType.TEXT,
          text: fullText,
        });
      }

      // 尝试提取文档属性
      const appXml = zip.file('docProps/app.xml');
      if (appXml) {
        const appProps = await appXml.async('text');
        const titleMatch = appProps.match(/<Title>([^<]*)<\/Title>/);
        if (titleMatch && titleMatch[1]) {
          metadata.title = titleMatch[1];
        }
      }

      metadata.wordCount = fullText.split(/\s+/).filter(Boolean).length;
      metadata.charCount = fullText.length;

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

  /**
   * 从幻灯片 XML 中提取文本
   */
  private extractTextFromSlideXml(xml: string): string {
    const texts: string[] = [];
    
    // 匹配所有的 <a:t> 标签（文本内容）
    const textMatches = xml.match(/<a:t>([^<]*)<\/a:t>/g);
    if (textMatches) {
      textMatches.forEach(match => {
        const text = match.replace(/<a:t>([^<]*)<\/a:t>/, '$1');
        if (text.trim()) {
          texts.push(text);
        }
      });
    }
    
    return texts.join('\n');
  }
}

// 导入缺失的类型
import { DocumentContent } from '../types/document';
