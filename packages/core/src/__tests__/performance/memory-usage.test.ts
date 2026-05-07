import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { DocumentParserUtil, TextDocumentParser } from '../../utils/document-parser';
import { DocumentService } from '../../services/document-service';
import { CacheManager } from '../../utils/cache-manager';

/**
 * 获取当前内存使用情况（Node.js 环境）
 */
function getMemoryUsage(): { used: number; total: number; rss: number } {
  if (typeof process !== 'undefined' && process.memoryUsage) {
    const usage = process.memoryUsage();
    return {
      used: usage.heapUsed,
      total: usage.heapTotal,
      rss: usage.rss,
    };
  }
  // 浏览器环境使用 performance.memory（如果可用）
  if (typeof performance !== 'undefined' && (performance as any).memory) {
    const mem = (performance as any).memory;
    return {
      used: mem.usedJSHeapSize,
      total: mem.totalJSHeapSize,
      rss: mem.usedJSHeapSize,
    };
  }
  return { used: 0, total: 0, rss: 0 };
}

/**
 * 生成指定大小的文本内容
 */
function generateLargeText(sizeBytes: number): string {
  const chunk = '这是一段用于内存测试的示例文本内容。包含中文、English、123数字和特殊符号！用于模拟真实文档内容。\n';
  const repeatCount = Math.ceil(sizeBytes / new TextEncoder().encode(chunk).length);
  return Array(repeatCount).fill(chunk).join('');
}

/**
 * 创建模拟的 File 对象
 */
function createMockFile(name: string, sizeBytes: number, type: string): File {
  const content = generateLargeText(sizeBytes);
  return new File([content], name, { type });
}

describe('Memory Usage Tests', () => {
  const MAX_MEMORY_BYTES = 1 * 1024 * 1024 * 1024; // 1GB 验收标准
  const TARGET_SIZES = [
    { name: '1MB', bytes: 1 * 1024 * 1024 },
    { name: '5MB', bytes: 5 * 1024 * 1024 },
    { name: '10MB', bytes: 10 * 1024 * 1024 },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    // 建议垃圾回收（如果可用）
    if (typeof globalThis.gc === 'function') {
      globalThis.gc();
    }
  });

  describe('Document Parsing Memory', () => {
    for (const size of TARGET_SIZES) {
      it(`should parse ${size.name} document without exceeding 1GB memory`, async () => {
        const beforeMemory = getMemoryUsage();
        const file = createMockFile(`test-${size.name}.txt`, size.bytes, 'text/plain');

        const result = await DocumentParserUtil.parse(file, {
          extractText: true,
          enableChunking: true,
          chunkSize: 2000,
          chunkOverlap: 200,
        });

        const afterMemory = getMemoryUsage();
        const memoryDelta = afterMemory.used - beforeMemory.used;

        expect(result.success).toBe(true);
        expect(memoryDelta).toBeLessThan(MAX_MEMORY_BYTES);

        console.log(
          `[Memory] ${size.name} document parsing: ` +
          `before=${(beforeMemory.used / 1024 / 1024).toFixed(2)}MB, ` +
          `after=${(afterMemory.used / 1024 / 1024).toFixed(2)}MB, ` +
          `delta=${(memoryDelta / 1024 / 1024).toFixed(2)}MB`
        );
      });
    }
  });

  describe('Document Service Memory', () => {
    const docService = new DocumentService({
      maxFileSize: 20 * 1024 * 1024,
      processingTimeout: 60000,
      maxContentLength: 100000,
    });

    for (const size of TARGET_SIZES.filter(s => s.bytes <= 5 * 1024 * 1024)) {
      it(`should process ${size.name} document without exceeding 1GB memory`, async () => {
        const beforeMemory = getMemoryUsage();
        const file = createMockFile(`test-${size.name}.txt`, size.bytes, 'text/plain');

        const document = await docService.processDocument(file);

        const afterMemory = getMemoryUsage();
        const memoryDelta = afterMemory.used - beforeMemory.used;

        expect(document.status).not.toBe('failed');
        expect(memoryDelta).toBeLessThan(MAX_MEMORY_BYTES);

        console.log(
          `[Memory] ${size.name} document service: ` +
          `before=${(beforeMemory.used / 1024 / 1024).toFixed(2)}MB, ` +
          `after=${(afterMemory.used / 1024 / 1024).toFixed(2)}MB, ` +
          `delta=${(memoryDelta / 1024 / 1024).toFixed(2)}MB`
        );
      });
    }
  });

  describe('Cache Memory Usage', () => {
    it('should not exceed 1GB memory with large cache entries', async () => {
      const cacheManager = new CacheManager({
        maxSize: 100,
        defaultExpiry: 3600000,
      });

      const beforeMemory = getMemoryUsage();
      const entrySize = 1 * 1024 * 1024; // 1MB per entry
      const entryCount = 50; // 50 entries = 50MB

      for (let i = 0; i < entryCount; i++) {
        const largeValue = generateLargeText(entrySize);
        cacheManager.set(`key-${i}`, largeValue);
      }

      const afterMemory = getMemoryUsage();
      const memoryDelta = afterMemory.used - beforeMemory.used;

      expect(cacheManager.size()).toBe(entryCount);
      expect(memoryDelta).toBeLessThan(MAX_MEMORY_BYTES);

      console.log(
        `[Memory] Cache with ${entryCount} entries: ` +
        `before=${(beforeMemory.used / 1024 / 1024).toFixed(2)}MB, ` +
        `after=${(afterMemory.used / 1024 / 1024).toFixed(2)}MB, ` +
        `delta=${(memoryDelta / 1024 / 1024).toFixed(2)}MB`
      );

      cacheManager.stop();
    });

    it('should handle 10MB document caching within memory limits', async () => {
      const cacheManager = new CacheManager({
        maxSize: 10,
        defaultExpiry: 3600000,
      });

      const beforeMemory = getMemoryUsage();
      const file = createMockFile('test-10MB.txt', 10 * 1024 * 1024, 'text/plain');
      const result = await DocumentParserUtil.parse(file, { extractText: true });

      const cacheKey = cacheManager.generateKey(file);
      cacheManager.set(cacheKey, result);

      const afterMemory = getMemoryUsage();
      const memoryDelta = afterMemory.used - beforeMemory.used;

      expect(result.success).toBe(true);
      expect(memoryDelta).toBeLessThan(MAX_MEMORY_BYTES);

      console.log(
        `[Memory] 10MB document cache: ` +
        `before=${(beforeMemory.used / 1024 / 1024).toFixed(2)}MB, ` +
        `after=${(afterMemory.used / 1024 / 1024).toFixed(2)}MB, ` +
        `delta=${(memoryDelta / 1024 / 1024).toFixed(2)}MB`
      );

      cacheManager.stop();
    });
  });

  describe('Concurrent Document Processing Memory', () => {
    it('should handle concurrent 5MB documents without exceeding 1GB memory', async () => {
      const beforeMemory = getMemoryUsage();
      const concurrency = 5;
      const fileSize = 5 * 1024 * 1024;

      const files = Array.from({ length: concurrency }, (_, i) =>
        createMockFile(`concurrent-${i}.txt`, fileSize, 'text/plain')
      );

      const results = await Promise.all(
        files.map(file => DocumentParserUtil.parse(file, { extractText: true }))
      );

      const afterMemory = getMemoryUsage();
      const memoryDelta = afterMemory.used - beforeMemory.used;

      results.forEach((result, i) => {
        expect(result.success).toBe(true);
      });
      expect(memoryDelta).toBeLessThan(MAX_MEMORY_BYTES);

      console.log(
        `[Memory] Concurrent ${concurrency}x5MB documents: ` +
        `before=${(beforeMemory.used / 1024 / 1024).toFixed(2)}MB, ` +
        `after=${(afterMemory.used / 1024 / 1024).toFixed(2)}MB, ` +
        `delta=${(memoryDelta / 1024 / 1024).toFixed(2)}MB`
      );
    });
  });
});
