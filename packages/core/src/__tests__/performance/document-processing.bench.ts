import { bench, describe } from 'vitest';
import { DocumentParserUtil, TextDocumentParser, PDFDocumentParser, WordDocumentParser, ExcelDocumentParser } from '../../utils/document-parser';
import { DocumentService } from '../../services/document-service';
import { DocumentType } from '../../types/document';

/**
 * 生成指定大小的文本内容（模拟大文档）
 */
function generateLargeText(sizeBytes: number): string {
  const chunk = '这是一段用于性能测试的示例文本内容。包含中文、English、123数字和特殊符号！\n';
  const repeatCount = Math.ceil(sizeBytes / new TextEncoder().encode(chunk).length);
  return Array(repeatCount).fill(chunk).join('');
}

/**
 * 生成指定大小的 ArrayBuffer（模拟二进制文档）
 */
function generateLargeBuffer(sizeBytes: number): ArrayBuffer {
  const buffer = new ArrayBuffer(sizeBytes);
  const view = new Uint8Array(buffer);
  for (let i = 0; i < sizeBytes; i++) {
    view[i] = i % 256;
  }
  return buffer;
}

/**
 * 创建模拟的 File 对象
 */
function createMockFile(name: string, sizeBytes: number, type: string): File {
  const content = type.includes('text') || type.includes('markdown')
    ? generateLargeText(sizeBytes)
    : generateLargeBuffer(sizeBytes);
  return new File([content], name, { type });
}

describe('Document Processing Performance', () => {
  const SIZES = [
    { name: '1MB', bytes: 1 * 1024 * 1024 },
    { name: '5MB', bytes: 5 * 1024 * 1024 },
    { name: '10MB', bytes: 10 * 1024 * 1024 },
  ];

  const TARGET_TIME_MS = 30000; // 30秒验收标准

  describe('Text Document Parsing', () => {
    const parser = new TextDocumentParser();

    for (const size of SIZES) {
      bench(`parse ${size.name} text document`, async () => {
        const file = createMockFile(`test-${size.name}.txt`, size.bytes, 'text/plain');
        const result = await parser.parse(file, { extractText: true });

        if (!result.success) {
          throw new Error(`Failed to parse text document: ${result.error}`);
        }
        if (result.parseTime > TARGET_TIME_MS) {
          throw new Error(
            `Parse time ${result.parseTime}ms exceeds target ${TARGET_TIME_MS}ms for ${size.name} document`
          );
        }
      }, {
        time: 30000,
        iterations: 3,
      });
    }
  });

  describe('Document Parser Registry', () => {
    for (const size of SIZES) {
      bench(`registry parse ${size.name} text document`, async () => {
        const file = createMockFile(`test-${size.name}.txt`, size.bytes, 'text/plain');
        const result = await DocumentParserUtil.parse(file, { extractText: true });

        if (!result.success) {
          throw new Error(`Registry parse failed: ${result.error}`);
        }
        if (result.parseTime > TARGET_TIME_MS) {
          throw new Error(
            `Registry parse time ${result.parseTime}ms exceeds target ${TARGET_TIME_MS}ms for ${size.name} document`
          );
        }
      }, {
        time: 30000,
        iterations: 3,
      });
    }
  });

  describe('Document Service Processing', () => {
    const docService = new DocumentService({
      maxFileSize: 20 * 1024 * 1024, // 20MB
      processingTimeout: 60000,
      maxContentLength: 100000,
    });

    for (const size of SIZES.filter(s => s.bytes <= 5 * 1024 * 1024)) {
      bench(`service process ${size.name} document`, async () => {
        const file = createMockFile(`test-${size.name}.txt`, size.bytes, 'text/plain');
        const startTime = Date.now();
        const document = await docService.processDocument(file);
        const elapsed = Date.now() - startTime;

        if (document.status === 'failed') {
          throw new Error(`Document processing failed: ${document.error}`);
        }
        if (elapsed > TARGET_TIME_MS) {
          throw new Error(
            `Processing time ${elapsed}ms exceeds target ${TARGET_TIME_MS}ms for ${size.name} document`
          );
        }
      }, {
        time: 60000,
        iterations: 2,
      });
    }
  });

  describe('Document Chunking Performance', () => {
    const parser = new TextDocumentParser();

    for (const size of SIZES) {
      bench(`chunk ${size.name} document`, async () => {
        const text = generateLargeText(size.bytes);
        const startTime = Date.now();
        const chunks = DocumentParserUtil.chunkDocument(text, 2000, 200);
        const elapsed = Date.now() - startTime;

        if (chunks.length === 0) {
          throw new Error('Chunking produced no chunks');
        }
        if (elapsed > TARGET_TIME_MS) {
          throw new Error(
            `Chunking time ${elapsed}ms exceeds target ${TARGET_TIME_MS}ms for ${size.name} document`
          );
        }
      }, {
        time: 30000,
        iterations: 3,
      });
    }
  });
});
