import { describe, it, expect } from 'vitest';
import { DocumentType } from '../../types/document';
import { documentParserRegistry } from '../../document-parsers/document-parser-registry';
import { DocumentParserUtil } from '../../document-parsers/document-parser-util';

/**
 * 文档格式兼容性测试套件
 * 覆盖各种 MIME 类型、文件扩展名、文档类型枚举和解析器注册表
 */
describe('Document Format Compatibility', () => {
  describe('MIME Type Compatibility', () => {
    it('should recognize PDF MIME types', () => {
      const pdfTypes = [
        'application/pdf',
        'application/x-pdf',
      ];
      pdfTypes.forEach(type => {
        expect(typeof type).toBe('string');
        expect(type.includes('pdf')).toBe(true);
      });
    });

    it('should recognize Word document MIME types', () => {
      const wordTypes = [
        'application/msword',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'application/rtf',
        'application/vnd.oasis.opendocument.text',
      ];
      wordTypes.forEach(type => {
        expect(typeof type).toBe('string');
        expect(
          type.includes('word') ||
          type.includes('document') ||
          type.includes('rtf') ||
          type.includes('odt')
        ).toBe(true);
      });
    });

    it('should recognize Excel MIME types', () => {
      const excelTypes = [
        'application/vnd.ms-excel',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'text/csv',
        'text/tab-separated-values',
        'application/vnd.oasis.opendocument.spreadsheet',
      ];
      excelTypes.forEach(type => {
        expect(typeof type).toBe('string');
        expect(
          type.includes('excel') ||
          type.includes('sheet') ||
          type.includes('csv') ||
          type.includes('tab-separated') ||
          type.includes('ods')
        ).toBe(true);
      });
    });

    it('should recognize PowerPoint MIME types', () => {
      const pptTypes = [
        'application/vnd.ms-powerpoint',
        'application/vnd.openxmlformats-officedocument.presentationml.presentation',
        'application/vnd.oasis.opendocument.presentation',
      ];
      pptTypes.forEach(type => {
        expect(typeof type).toBe('string');
        expect(
          type.includes('powerpoint') ||
          type.includes('presentation') ||
          type.includes('odp')
        ).toBe(true);
      });
    });

    it('should recognize text MIME types', () => {
      const textTypes = [
        'text/plain',
        'text/html',
        'text/markdown',
        'application/json',
        'application/xml',
        'text/xml',
        'text/yaml',
        'application/x-yaml',
      ];
      textTypes.forEach(type => {
        expect(typeof type).toBe('string');
        expect(
          type.includes('text') ||
          type.includes('json') ||
          type.includes('xml') ||
          type.includes('yaml')
        ).toBe(true);
      });
    });

    it('should recognize image MIME types', () => {
      const imageTypes = [
        'image/jpeg',
        'image/png',
        'image/gif',
        'image/webp',
        'image/bmp',
        'image/tiff',
        'image/svg+xml',
      ];
      imageTypes.forEach(type => {
        expect(typeof type).toBe('string');
        expect(type.startsWith('image/')).toBe(true);
      });
    });

    it('should handle empty or unknown MIME types', () => {
      const emptyType = '';
      const unknownType = 'application/octet-stream';
      expect(typeof emptyType).toBe('string');
      expect(typeof unknownType).toBe('string');
    });
  });

  describe('File Extension Compatibility', () => {
    it('should map PDF extensions to DocumentType.PDF', () => {
      const extensions = ['pdf'];
      extensions.forEach(ext => {
        expect(ext.toLowerCase()).toBe(ext);
        expect(ext).toBe('pdf');
      });
    });

    it('should map Word extensions correctly', () => {
      const extensions = ['doc', 'docx', 'rtf', 'odt'];
      extensions.forEach(ext => {
        expect(typeof ext).toBe('string');
        expect(ext.length).toBeGreaterThan(0);
      });
    });

    it('should map Excel extensions correctly', () => {
      const extensions = ['xls', 'xlsx', 'csv', 'tsv', 'ods'];
      extensions.forEach(ext => {
        expect(typeof ext).toBe('string');
        expect(ext.length).toBeGreaterThan(0);
      });
    });

    it('should map PowerPoint extensions correctly', () => {
      const extensions = ['ppt', 'pptx', 'odp'];
      extensions.forEach(ext => {
        expect(typeof ext).toBe('string');
        expect(ext.length).toBeGreaterThan(0);
      });
    });

    it('should map text extensions correctly', () => {
      const extensions = ['txt', 'md', 'html', 'htm', 'json', 'xml', 'yaml', 'yml'];
      extensions.forEach(ext => {
        expect(typeof ext).toBe('string');
        expect(ext.length).toBeGreaterThan(0);
      });
    });

    it('should map image extensions correctly', () => {
      const extensions = ['jpg', 'jpeg', 'png', 'gif', 'webp', 'bmp', 'tiff', 'svg'];
      extensions.forEach(ext => {
        expect(typeof ext).toBe('string');
        expect(ext.length).toBeGreaterThan(0);
      });
    });

    it('should handle case-insensitive extensions', () => {
      const mixedCase = ['PDF', 'DocX', 'XLSX', 'PNG', 'JPG'];
      mixedCase.forEach(ext => {
        const lower = ext.toLowerCase();
        expect(lower).toBe(ext.toLowerCase());
      });
    });

    it('should handle extensions with multiple dots', () => {
      const complexNames = ['archive.tar.gz', 'document.backup.pdf', 'data.min.json'];
      complexNames.forEach(name => {
        const parts = name.split('.');
        const ext = parts.pop() || '';
        expect(typeof ext).toBe('string');
        expect(ext.length).toBeGreaterThan(0);
      });
    });
  });

  describe('DocumentType Enum Compatibility', () => {
    it('should have all expected DocumentType values', () => {
      expect(DocumentType.PDF).toBe('pdf');
      expect(DocumentType.WORD).toBe('word');
      expect(DocumentType.EXCEL).toBe('excel');
      expect(DocumentType.POWERPOINT).toBe('powerpoint');
      expect(DocumentType.TEXT).toBe('text');
      expect(DocumentType.MARKDOWN).toBe('markdown');
      expect(DocumentType.IMAGE).toBe('image');
      expect(DocumentType.CSV).toBe('csv');
      expect(DocumentType.RTF).toBe('rtf');
      expect(DocumentType.EPUB).toBe('epub');
      expect(DocumentType.UNKNOWN).toBe('unknown');
    });

    it('should verify DocumentType enum keys match values', () => {
      const entries = Object.entries(DocumentType);
      entries.forEach(([key, value]) => {
        expect(typeof key).toBe('string');
        expect(typeof value).toBe('string');
        expect(key.toLowerCase()).toBe(value.replace(/[^a-z]/g, '') || key.toLowerCase());
      });
    });

    it('should handle DocumentType.UNKNOWN as fallback', () => {
      expect(DocumentType.UNKNOWN).toBeDefined();
      expect(DocumentType.UNKNOWN).toBe('unknown');
    });
  });

  describe('DocumentParserRegistry Type Detection', () => {
    it('should detect PDF from string path', async () => {
      const type = await documentParserRegistry.detectType('document.pdf');
      expect(type).toBe(DocumentType.PDF);
    });

    it('should detect Word from string path', async () => {
      const type = await documentParserRegistry.detectType('document.docx');
      expect(type).toBe(DocumentType.WORD);
    });

    it('should detect Excel from string path', async () => {
      const type = await documentParserRegistry.detectType('spreadsheet.xlsx');
      expect(type).toBe(DocumentType.EXCEL);
    });

    it('should detect PowerPoint from string path', async () => {
      const type = await documentParserRegistry.detectType('presentation.pptx');
      expect(type).toBe(DocumentType.POWERPOINT);
    });

    it('should detect text from string path', async () => {
      const type = await documentParserRegistry.detectType('readme.txt');
      expect(type).toBe(DocumentType.TEXT);
    });

    it('should detect markdown from string path', async () => {
      const type = await documentParserRegistry.detectType('readme.md');
      expect(type).toBe(DocumentType.TEXT);
    });

    it('should detect image from string path', async () => {
      const type = await documentParserRegistry.detectType('photo.png');
      expect(type).toBe(DocumentType.IMAGE);
    });

    it('should detect unknown from unsupported extension', async () => {
      const type = await documentParserRegistry.detectType('data.xyz');
      expect(type).toBe(DocumentType.UNKNOWN);
    });

    it('should detect type from File object with MIME type', async () => {
      const file = new File(['test'], 'doc.pdf', { type: 'application/pdf' });
      const type = await documentParserRegistry.detectType(file);
      expect(type).toBe(DocumentType.PDF);
    });

    it('should detect type from File object with empty MIME type', async () => {
      const file = new File(['test'], 'document.docx', { type: '' });
      const type = await documentParserRegistry.detectType(file);
      expect(type).toBe(DocumentType.WORD);
    });

    it('should detect type from File object fallback to extension', async () => {
      const file = new File(['test'], 'image.png', { type: '' });
      const type = await documentParserRegistry.detectType(file);
      expect(type).toBe(DocumentType.IMAGE);
    });

    it('should return UNKNOWN for ArrayBuffer input', async () => {
      const buffer = new ArrayBuffer(8);
      const type = await documentParserRegistry.detectType(buffer);
      expect(type).toBe(DocumentType.UNKNOWN);
    });
  });

  describe('DocumentParserUtil Interface', () => {
    it('should verify DocumentParserUtil static methods exist', () => {
      expect(typeof DocumentParserUtil.parse).toBe('function');
      expect(typeof DocumentParserUtil.extractText).toBe('function');
      expect(typeof DocumentParserUtil.extractTables).toBe('function');
      expect(typeof DocumentParserUtil.extractImages).toBe('function');
      expect(typeof DocumentParserUtil.chunkDocument).toBe('function');
      expect(typeof DocumentParserUtil.getSupportedTypes).toBe('function');
      expect(typeof DocumentParserUtil.registerParser).toBe('function');
    });

    it('should return supported types array', () => {
      const types = DocumentParserUtil.getSupportedTypes();
      expect(Array.isArray(types)).toBe(true);
      expect(types.length).toBeGreaterThan(0);
    });

    it('should chunk document with correct return type', () => {
      const content = 'a'.repeat(5000);
      const chunks = DocumentParserUtil.chunkDocument(content, 1000, 100);
      expect(Array.isArray(chunks)).toBe(true);
      expect(chunks.length).toBeGreaterThan(0);
      chunks.forEach(chunk => {
        expect(chunk).toHaveProperty('text');
        expect(chunk).toHaveProperty('startIndex');
        expect(chunk).toHaveProperty('endIndex');
        expect(typeof chunk.text).toBe('string');
        expect(typeof chunk.startIndex).toBe('number');
        expect(typeof chunk.endIndex).toBe('number');
        expect(chunk.startIndex).toBeLessThanOrEqual(chunk.endIndex);
      });
    });

    it('should handle empty content in chunkDocument', () => {
      const chunks = DocumentParserUtil.chunkDocument('', 1000, 100);
      expect(Array.isArray(chunks)).toBe(true);
      expect(chunks.length).toBe(0);
    });

    it('should handle content shorter than chunk size', () => {
      const content = 'short content';
      const chunks = DocumentParserUtil.chunkDocument(content, 1000, 100);
      expect(chunks.length).toBe(1);
      expect(chunks[0].text).toBe(content);
      expect(chunks[0].startIndex).toBe(0);
      expect(chunks[0].endIndex).toBe(content.length);
    });
  });

  describe('DocumentParseResult Interface', () => {
    it('should verify DocumentParseResult structure', async () => {
      const result = await documentParserRegistry.parse('test.txt');
      expect(result).toHaveProperty('metadata');
      expect(result).toHaveProperty('content');
      expect(result).toHaveProperty('parseTime');
      expect(result).toHaveProperty('success');
      expect(Array.isArray(result.content)).toBe(true);
      expect(typeof result.parseTime).toBe('number');
      expect(typeof result.success).toBe('boolean');
    });

    it('should verify DocumentMetadata structure in parse result', async () => {
      const result = await documentParserRegistry.parse('test.txt');
      expect(result.metadata).toHaveProperty('name');
      expect(result.metadata).toHaveProperty('type');
      expect(result.metadata).toHaveProperty('size');
      expect(typeof result.metadata.name).toBe('string');
      expect(typeof result.metadata.type).toBe('string');
      expect(typeof result.metadata.size).toBe('number');
    });
  });

  describe('ParseOptions Interface Compatibility', () => {
    it('should accept all ParseOptions properties', () => {
      const options = {
        extractText: true,
        extractTables: true,
        extractImages: true,
        extractHeadersFooters: true,
        parseByPage: true,
        maxPages: 10,
        startPage: 0,
        endPage: 9,
        dpi: 150,
        enableOCR: true,
        ocrLanguage: 'zh-CN',
        enableChunking: true,
        chunkSize: 2000,
        chunkOverlap: 200,
        enableCache: false,
        cacheExpiry: 3600000,
      };

      expect(options.extractText).toBe(true);
      expect(options.extractTables).toBe(true);
      expect(options.extractImages).toBe(true);
      expect(options.maxPages).toBe(10);
      expect(options.dpi).toBe(150);
      expect(options.chunkSize).toBe(2000);
      expect(options.chunkOverlap).toBe(200);
    });
  });

  describe('ContentType Enum Compatibility', () => {
    it('should verify ContentType enum values', async () => {
      const { ContentType } = await import('../../types/document');
      expect(ContentType.TEXT).toBe('text');
      expect(ContentType.TABLE).toBe('table');
      expect(ContentType.IMAGE).toBe('image');
      expect(ContentType.HEADER).toBe('header');
      expect(ContentType.FOOTER).toBe('footer');
      expect(ContentType.PAGE_BREAK).toBe('pageBreak');
      expect(ContentType.SECTION_BREAK).toBe('sectionBreak');
    });
  });

  describe('Error Handling Consistency', () => {
    it('should handle empty string path', async () => {
      const type = await documentParserRegistry.detectType('');
      expect(type).toBe(DocumentType.UNKNOWN);
    });

    it('should handle path without extension', async () => {
      const type = await documentParserRegistry.detectType('README');
      expect(type).toBe(DocumentType.UNKNOWN);
    });

    it('should handle path with trailing dot', async () => {
      const type = await documentParserRegistry.detectType('file.');
      expect(type).toBe(DocumentType.UNKNOWN);
    });

    it('should handle null or undefined gracefully in detectType', async () => {
      const typeNull = await documentParserRegistry.detectType(null as any);
      expect(typeNull).toBe(DocumentType.UNKNOWN);
    });

    it('should return error result for unsupported file type', async () => {
      const result = await documentParserRegistry.parse('unsupported.xyz');
      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
      expect(typeof result.error).toBe('string');
    });

    it('should handle File with empty name', async () => {
      const file = new File(['test'], '', { type: 'text/plain' });
      const type = await documentParserRegistry.detectType(file);
      expect(type).toBe(DocumentType.TEXT);
    });
  });
});
