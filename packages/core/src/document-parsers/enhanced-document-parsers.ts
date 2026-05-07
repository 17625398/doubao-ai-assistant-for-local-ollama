/**
 * 增强型文档解析器 - 支持更多文档格式
 * 优化版本：支持CSV、RTF、EPUB等新格式
 */

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
import { BaseDocumentParser } from './base-document-parser';
import { logger } from '../utils/logger';

/**
 * CSV文档解析器
 */
export class CsvDocumentParser extends BaseDocumentParser {
  supportedTypes = [DocumentType.CSV];
  
  async parse(file: File | ArrayBuffer | string, options?: ParseOptions): Promise<DocumentParseResult> {
    const startTime = Date.now();
    let content: DocumentContent[] = [];
    let text = '';
    let csvData: string[][] = [];
    
    try {
      let csvText: string;
      
      if (file instanceof File) {
        csvText = await file.text();
      } else if (file instanceof ArrayBuffer) {
        csvText = new TextDecoder().decode(file);
      } else {
        csvText = file;
      }
      
      // 解析CSV
      csvData = this.parseCSV(csvText);
      
      // 转换为表格内容
      if (options?.extractTables !== false && csvData.length > 0) {
        const tableContent: TableContent = {
          type: ContentType.TABLE,
          headers: csvData[0] || [],
          rows: csvData.slice(1),
          rawCsv: csvText,
        };
        content.push(tableContent);
      }
      
      // 提取文本
      if (options?.extractText) {
        text = csvData
          .map(row => row.join('\t'))
          .join('\n');
        content.push({
          type: ContentType.TEXT,
          text,
        });
      }
      
      return await this.createParseResult({
        name: file instanceof File ? file.name : 'unknown.csv',
        type: DocumentType.CSV,
        size: csvText.length,
        createdAt: new Date(),
        modifiedAt: new Date(),
      }, content, options);
      
    } catch (error) {
      logger.error('CSV parsing failed:', error);
      return {
        metadata: {
          name: 'unknown.csv',
          type: DocumentType.CSV,
          size: 0,
          createdAt: new Date(),
          modifiedAt: new Date(),
        },
        content: [],
        parseTime: Date.now() - startTime,
        success: false,
        error: error instanceof Error ? error.message : 'CSV parsing failed',
      };
    }
  }
  
  private parseCSV(text: string): string[][] {
    const rows: string[][] = [];
    const lines = text.split(/\r?\n/);
    
    for (const line of lines) {
      if (!line.trim()) continue;
      
      const row: string[] = [];
      let current = '';
      let inQuotes = false;
      
      for (let i = 0; i < line.length; i++) {
        const char = line[i];
        const nextChar = line[i + 1];
        
        if (inQuotes) {
          if (char === '"' && nextChar === '"') {
            current += '"';
            i++;
          } else if (char === '"') {
            inQuotes = false;
          } else {
            current += char;
          }
        } else {
          if (char === '"') {
            inQuotes = true;
          } else if (char === ',') {
            row.push(current.trim());
            current = '';
          } else {
            current += char;
          }
        }
      }
      
      row.push(current.trim());
      rows.push(row);
    }
    
    return rows;
  }
}

/**
 * RTF文档解析器
 */
export class RtfDocumentParser extends BaseDocumentParser {
  supportedTypes = [DocumentType.RTF];
  
  async parse(file: File | ArrayBuffer | string, options?: ParseOptions): Promise<DocumentParseResult> {
    const startTime = Date.now();
    let content: DocumentContent[] = [];
    
    try {
      let rtfText: string;
      
      if (file instanceof File) {
        rtfText = await file.text();
      } else if (file instanceof ArrayBuffer) {
        rtfText = new TextDecoder().decode(file);
      } else {
        rtfText = file;
      }
      
      // 解析RTF为纯文本
      const plainText = this.stripRtf(rtfText);
      
      if (options?.extractText !== false) {
        content.push({
          type: ContentType.TEXT,
          text: plainText,
        });
      }
      
      return await this.createParseResult({
        name: file instanceof File ? file.name : 'unknown.rtf',
        type: DocumentType.RTF,
        size: rtfText.length,
        createdAt: new Date(),
        modifiedAt: new Date(),
      }, content, options);
      
    } catch (error) {
      logger.error('RTF parsing failed:', error);
      return {
        metadata: {
          name: 'unknown.rtf',
          type: DocumentType.RTF,
          size: 0,
          createdAt: new Date(),
          modifiedAt: new Date(),
        },
        content: [],
        parseTime: Date.now() - startTime,
        success: false,
        error: error instanceof Error ? error.message : 'RTF parsing failed',
      };
    }
  }
  
  private stripRtf(rtf: string): string {
    // 移除RTF控制组
    let text = rtf
      .replace(/\\[a-z]+\d*\s?/gi, '') // 移除控制词
      .replace(/\\'[0-9a-fA-F]{2}/g, (match) => { // 十六进制字符
        const hex = match.slice(2);
        return String.fromCharCode(parseInt(hex, 16));
      })
      .replace(/\{|\}/g, '') // 移除大括号
      .replace(/\\\n/g, '\n') // 转换换行
      .replace(/\\n/g, '\n') // 转换换行
      .replace(/\\\\/g, '\\'); // 恢复转义的反斜杠
    
    return text.trim();
  }
}

/**
 * EPUB文档解析器
 */
export class EpubDocumentParser extends BaseDocumentParser {
  supportedTypes = [DocumentType.EPUB];
  
  async parse(file: File | ArrayBuffer | string, options?: ParseOptions): Promise<DocumentParseResult> {
    const startTime = Date.now();
    let content: DocumentContent[] = [];
    let text = '';
    
    try {
      let epubData: ArrayBuffer;
      
      if (file instanceof File) {
        epubData = await file.arrayBuffer();
      } else if (typeof file === 'string') {
        throw new Error('EPUB parsing from string not supported');
      } else {
        epubData = file;
      }
      
      // 解析EPUB
      const result = await this.parseEpub(epubData, options);
      content = result.content;
      text = result.text;
      
      return await this.createParseResult({
        name: file instanceof File ? file.name : 'unknown.epub',
        type: DocumentType.EPUB,
        size: epubData.byteLength,
        createdAt: new Date(),
        modifiedAt: new Date(),
      }, content, options);
      
    } catch (error) {
      logger.error('EPUB parsing failed:', error);
      return {
        metadata: {
          name: 'unknown.epub',
          type: DocumentType.EPUB,
          size: 0,
          createdAt: new Date(),
          modifiedAt: new Date(),
        },
        content: [],
        parseTime: Date.now() - startTime,
        success: false,
        error: error instanceof Error ? error.message : 'EPUB parsing failed',
      };
    }
  }
  
  private async parseEpub(epubData: ArrayBuffer, options?: ParseOptions): Promise<{
    content: DocumentContent[];
    text: string;
  }> {
    const content: DocumentContent[] = [];
    let text = '';
    
    // 由于浏览器环境限制，简化的EPUB解析
    // 实际生产环境应使用专门的EPUB解析库
    
    // 检查是否是ZIP格式（EPUB基于ZIP）
    const view = new Uint8Array(epubData.slice(0, 4));
    if (view[0] === 0x50 && view[1] === 0x4B) {
      // ZIP格式，但无法完整解析
      text = '[EPUB content - ZIP archive detected but full parsing not available in browser]';
    } else {
      // 尝试作为纯文本解析
      text = new TextDecoder().decode(epubData);
    }
    
    if (options?.extractText !== false) {
      content.push({
        type: ContentType.TEXT,
        text,
      });
    }
    
    return { content, text };
  }
}

/**
 * 增强型文本解析器 - 支持更多文本格式
 */
export class EnhancedTextDocumentParser extends BaseDocumentParser {
  supportedTypes = [DocumentType.TEXT];
  
  async parse(file: File | ArrayBuffer | string, options?: ParseOptions): Promise<DocumentParseResult> {
    const startTime = Date.now();
    let content: DocumentContent[] = [];
    let text = '';
    
    try {
      let textContent: string;
      
      if (file instanceof File) {
        textContent = await file.text();
      } else if (file instanceof ArrayBuffer) {
        textContent = new TextDecoder().decode(file);
      } else {
        textContent = file;
      }
      
      // 检测编码并转换
      textContent = this.detectAndConvertEncoding(textContent);
      
      // 提取元数据
      const metadata = await this.parseMetadata(file);
      
      // 智能分块处理
      if (options?.extractText !== false) {
        const chunks = this.smartChunkText(textContent, options?.chunkSize || 2000);
        
        for (const chunk of chunks) {
          content.push({
            type: ContentType.TEXT,
            text: chunk,
          });
        }
        
        text = textContent;
      }
      
      // 提取结构化信息
      const structuredInfo = this.extractStructuredInfo(textContent);
      if (structuredInfo) {
        content.push({
          type: ContentType.TEXT,
          text: structuredInfo,
        });
      }
      
      return await this.createParseResult(metadata, content, options);
      
    } catch (error) {
      logger.error('Text parsing failed:', error);
      return {
        metadata: {
          name: 'unknown.txt',
          type: DocumentType.TEXT,
          size: 0,
          createdAt: new Date(),
          modifiedAt: new Date(),
        },
        content: [],
        parseTime: Date.now() - startTime,
        success: false,
        error: error instanceof Error ? error.message : 'Text parsing failed',
      };
    }
  }
  
  private detectAndConvertEncoding(text: string): string {
    // 检测BOM并转换编码
    if (text.charCodeAt(0) === 0xFEFF) {
      // UTF-16 BE
      return text.slice(1);
    } else if (text.charCodeAt(0) === 0xFFFE) {
      // UTF-16 LE - 需要转换
      try {
        const arr = new Uint16Array(
          text.split('').map((_, i) => text.charCodeAt(i))
        );
        return String.fromCharCode.apply(null, Array.from(arr).reverse());
      } catch {
        return text;
      }
    }
    return text;
  }
  
  private smartChunkText(text: string, chunkSize: number): string[] {
    const chunks: string[] = [];
    
    // 按段落分割
    const paragraphs = text.split(/\n\n+/);
    let currentChunk = '';
    
    for (const paragraph of paragraphs) {
      if (currentChunk.length + paragraph.length > chunkSize && currentChunk.length > 0) {
        chunks.push(currentChunk.trim());
        currentChunk = '';
      }
      currentChunk += paragraph + '\n\n';
    }
    
    if (currentChunk.trim()) {
      chunks.push(currentChunk.trim());
    }
    
    return chunks.length > 0 ? chunks : [text];
  }
  
  private extractStructuredInfo(text: string): string | null {
    // 提取邮箱
    const emails = text.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g);
    
    // 提取URL
    const urls = text.match(/https?:\/\/[^\s]+/g);
    
    // 提取电话号码
    const phones = text.match(/[\+]?[(]?[0-9]{1,3}[)]?[-\s\.]?[(]?[0-9]{1,4}[)]?[-\s\.]?[0-9]{1,4}[-\s\.]?[0-9]{1,9}/g);
    
    let info = '';
    
    if (emails && emails.length > 0) {
      info += `\n## 邮箱地址\n${emails.join('\n')}\n`;
    }
    
    if (urls && urls.length > 0) {
      info += `\n## URLs\n${urls.join('\n')}\n`;
    }
    
    if (phones && phones.length > 0) {
      info += `\n## 电话号码\n${phones.join('\n')}\n`;
    }
    
    return info || null;
  }
}

/**
 * Markdown解析器 - 增强版
 */
export class EnhancedMarkdownDocumentParser extends BaseDocumentParser {
  supportedTypes = [DocumentType.MARKDOWN];
  
  async parse(file: File | ArrayBuffer | string, options?: ParseOptions): Promise<DocumentParseResult> {
    const startTime = Date.now();
    let content: DocumentContent[] = [];
    let text = '';
    
    try {
      let mdText: string;
      
      if (file instanceof File) {
        mdText = await file.text();
      } else if (file instanceof ArrayBuffer) {
        mdText = new TextDecoder().decode(file);
      } else {
        mdText = file;
      }
      
      // 提取front matter
      const frontMatter = this.extractFrontMatter(mdText);
      
      // 提取目录结构
      const toc = this.extractTableOfContents(mdText);
      
      // 提取代码块
      const codeBlocks = this.extractCodeBlocks(mdText);

      // 提取表格
      const tables = this.extractTablesFromText(mdText);

      // 提取图片
      const images = this.extractImagesFromText(mdText);
      
      if (frontMatter) {
        content.push({
          type: ContentType.TEXT,
          text: frontMatter,
        });
      }
      
      if (toc) {
        content.push({
          type: ContentType.TEXT,
          text: toc,
        });
      }
      
      if (options?.extractText !== false) {
        text = mdText;
        content.push({
          type: ContentType.TEXT,
          text,
        });
      }
      
      // 添加提取的元数据
      if (codeBlocks.length > 0) {
        content.push({
          type: ContentType.TEXT,
          text: `\n## 代码块统计\n语言分布:\n${this.summarizeCodeBlocks(codeBlocks)}`,
        });
      }
      
      return await this.createParseResult({
        name: file instanceof File ? file.name : 'unknown.md',
        type: DocumentType.MARKDOWN,
        size: mdText.length,
        createdAt: new Date(),
        modifiedAt: new Date(),
      }, content, options);
      
    } catch (error) {
      logger.error('Markdown parsing failed:', error);
      return {
        metadata: {
          name: 'unknown.md',
          type: DocumentType.MARKDOWN,
          size: 0,
          createdAt: new Date(),
          modifiedAt: new Date(),
        },
        content: [],
        parseTime: Date.now() - startTime,
        success: false,
        error: error instanceof Error ? error.message : 'Markdown parsing failed',
      };
    }
  }
  
  private extractFrontMatter(text: string): string | null {
    const match = text.match(/^---\n([\s\S]*?)\n---/);
    if (match) {
      return `## Front Matter\n\`\`\`yaml\n${match[1]}\n\`\`\``;
    }
    return null;
  }
  
  private extractTableOfContents(text: string): string | null {
    const headings = text.match(/^#{1,6}\s+.+$/gm);
    if (headings && headings.length > 2) {
      const toc = headings.map(h => {
        const level = h.match(/^#+/)?.[0].length || 1;
        const title = h.replace(/^#+\s+/, '');
        return `${'  '.repeat(level - 1)}- ${title}`;
      }).join('\n');
      return `## 目录\n${toc}`;
    }
    return null;
  }
  
  private extractCodeBlocks(text: string): { lang: string; code: string }[] {
    const blocks: { lang: string; code: string }[] = [];
    const regex = /```(\w*)\n([\s\S]*?)```/g;
    let match;
    
    while ((match = regex.exec(text)) !== null) {
      blocks.push({
        lang: match[1] || 'text',
        code: match[2],
      });
    }
    
    return blocks;
  }
  
  private extractTablesFromText(text: string): { headers: string[]; rows: string[][] }[] {
    const tables: { headers: string[]; rows: string[][] }[] = [];
    const tableRegex = /\|.+\|\n\|[-:\s|]+\|\n((?:\|.+\|\n?)+)/g;
    let match;

    while ((match = tableRegex.exec(text)) !== null) {
      const rows = match[1].trim().split('\n').map(row =>
        row.split('|').map(cell => cell.trim()).filter((_, i, arr) => i > 0 && i < arr.length - 1)
      );
      if (rows.length > 0) {
        tables.push({
          headers: rows[0],
          rows: rows.slice(1),
        });
      }
    }

    return tables;
  }

  private extractImagesFromText(text: string): { alt: string; url: string }[] {
    const images: { alt: string; url: string }[] = [];
    const regex = /!\[([^\]]*)\]\(([^)]+)\)/g;
    let match;

    while ((match = regex.exec(text)) !== null) {
      images.push({
        alt: match[1],
        url: match[2],
      });
    }

    return images;
  }
  
  private summarizeCodeBlocks(blocks: { lang: string; code: string }[]): string {
    const langCount = new Map<string, number>();
    
    for (const block of blocks) {
      langCount.set(block.lang, (langCount.get(block.lang) || 0) + 1);
    }
    
    return Array.from(langCount.entries())
      .map(([lang, count]) => `- ${lang}: ${count} 个`)
      .join('\n');
  }
}

// 导出所有增强解析器
export const enhancedDocumentParsers = [
  new CsvDocumentParser(),
  new RtfDocumentParser(),
  new EpubDocumentParser(),
  new EnhancedTextDocumentParser(),
  new EnhancedMarkdownDocumentParser(),
];
