import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { CacheManager } from '../../utils/cache-manager';

/**
 * 生成指定大小的测试数据
 */
function generateTestData(sizeBytes: number): string {
  const chunk = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  const repeatCount = Math.ceil(sizeBytes / chunk.length);
  return Array(repeatCount).fill(chunk).join('').slice(0, sizeBytes);
}

/**
 * 测量操作耗时
 */
async function measureTime<T>(fn: () => Promise<T> | T): Promise<{ result: T; elapsedMs: number }> {
  const start = performance.now();
  const result = await fn();
  const elapsedMs = performance.now() - start;
  return { result, elapsedMs };
}

describe('Cache Performance Tests', () => {
  let cacheManager: CacheManager;

  beforeEach(() => {
    cacheManager = new CacheManager({
      maxSize: 1000,
      defaultExpiry: 3600000,
      cleanupInterval: 60000,
    });
  });

  afterEach(() => {
    cacheManager.stop();
  });

  describe('Cache Write Performance', () => {
    it('should write small values in under 100ms', async () => {
      const iterations = 1000;
      const value = generateTestData(1024); // 1KB

      const { elapsedMs } = await measureTime(() => {
        for (let i = 0; i < iterations; i++) {
          cacheManager.set(`key-${i}`, value);
        }
        return undefined;
      });

      const avgTime = elapsedMs / iterations;
      console.log(`[Cache Write] ${iterations} small values: total=${elapsedMs.toFixed(2)}ms, avg=${avgTime.toFixed(4)}ms`);

      expect(avgTime).toBeLessThan(100);
      expect(cacheManager.size()).toBe(iterations);
    });

    it('should write large values efficiently', async () => {
      const iterations = 100;
      const value = generateTestData(100 * 1024); // 100KB

      const { elapsedMs } = await measureTime(() => {
        for (let i = 0; i < iterations; i++) {
          cacheManager.set(`large-key-${i}`, value);
        }
        return undefined;
      });

      const avgTime = elapsedMs / iterations;
      console.log(`[Cache Write] ${iterations} large values (100KB): total=${elapsedMs.toFixed(2)}ms, avg=${avgTime.toFixed(4)}ms`);

      expect(avgTime).toBeLessThan(100);
      expect(cacheManager.size()).toBe(iterations);
    });

    it('should handle 1MB value writes within reasonable time', async () => {
      const value = generateTestData(1024 * 1024); // 1MB

      const { elapsedMs } = await measureTime(() => {
        cacheManager.set('mb-key', value);
        return undefined;
      });

      console.log(`[Cache Write] 1MB value: ${elapsedMs.toFixed(2)}ms`);
      expect(elapsedMs).toBeLessThan(1000);
    });
  });

  describe('Cache Read Performance', () => {
    it('should read small values in under 100ms', async () => {
      const iterations = 1000;
      const value = generateTestData(1024);

      // 预填充缓存
      for (let i = 0; i < iterations; i++) {
        cacheManager.set(`key-${i}`, value);
      }

      const { elapsedMs } = await measureTime(() => {
        for (let i = 0; i < iterations; i++) {
          cacheManager.get(`key-${i}`);
        }
        return undefined;
      });

      const avgTime = elapsedMs / iterations;
      console.log(`[Cache Read] ${iterations} small values: total=${elapsedMs.toFixed(2)}ms, avg=${avgTime.toFixed(4)}ms`);

      expect(avgTime).toBeLessThan(100);
    });

    it('should read large values efficiently', async () => {
      const iterations = 100;
      const value = generateTestData(100 * 1024);

      for (let i = 0; i < iterations; i++) {
        cacheManager.set(`large-key-${i}`, value);
      }

      const { elapsedMs } = await measureTime(() => {
        for (let i = 0; i < iterations; i++) {
          cacheManager.get(`large-key-${i}`);
        }
        return undefined;
      });

      const avgTime = elapsedMs / iterations;
      console.log(`[Cache Read] ${iterations} large values (100KB): total=${elapsedMs.toFixed(2)}ms, avg=${avgTime.toFixed(4)}ms`);

      expect(avgTime).toBeLessThan(100);
    });

    it('should handle cache misses quickly', async () => {
      const iterations = 1000;

      const { elapsedMs } = await measureTime(() => {
        for (let i = 0; i < iterations; i++) {
          cacheManager.get(`missing-key-${i}`);
        }
        return undefined;
      });

      const avgTime = elapsedMs / iterations;
      console.log(`[Cache Read] ${iterations} cache misses: total=${elapsedMs.toFixed(2)}ms, avg=${avgTime.toFixed(4)}ms`);

      expect(avgTime).toBeLessThan(100);
    });
  });

  describe('Cache Mixed Operations', () => {
    it('should handle mixed read/write under 100ms per operation', async () => {
      const iterations = 500;
      const value = generateTestData(10 * 1024); // 10KB

      // 预填充一半
      for (let i = 0; i < iterations / 2; i++) {
        cacheManager.set(`key-${i}`, value);
      }

      const { elapsedMs } = await measureTime(() => {
        for (let i = 0; i < iterations; i++) {
          if (i % 2 === 0) {
            cacheManager.get(`key-${i}`);
          } else {
            cacheManager.set(`key-${i}`, value);
          }
        }
        return undefined;
      });

      const avgTime = elapsedMs / iterations;
      console.log(`[Cache Mixed] ${iterations} operations: total=${elapsedMs.toFixed(2)}ms, avg=${avgTime.toFixed(4)}ms`);

      expect(avgTime).toBeLessThan(100);
    });
  });

  describe('Cache Eviction Performance', () => {
    it('should evict oldest entries efficiently when max size reached', async () => {
      const maxSize = 100;
      const cache = new CacheManager({ maxSize, defaultExpiry: 3600000 });
      const value = generateTestData(1024);

      // 填充到最大容量
      for (let i = 0; i < maxSize; i++) {
        cache.set(`key-${i}`, value);
      }

      const { elapsedMs } = await measureTime(() => {
        // 继续写入，触发淘汰
        for (let i = 0; i < 50; i++) {
          cache.set(`new-key-${i}`, value);
        }
        return undefined;
      });

      console.log(`[Cache Eviction] 50 evictions: ${elapsedMs.toFixed(2)}ms`);
      expect(cache.size()).toBe(maxSize);
      expect(elapsedMs / 50).toBeLessThan(100);

      cache.stop();
    });
  });

  describe('Cache Cleanup Performance', () => {
    it('should clean up expired entries efficiently', async () => {
      const cache = new CacheManager({
        maxSize: 1000,
        defaultExpiry: 100, // 100ms expiry
        cleanupInterval: 50,
      });
      const value = generateTestData(1024);

      // 写入大量数据
      for (let i = 0; i < 500; i++) {
        cache.set(`key-${i}`, value, 50); // 50ms expiry
      }

      expect(cache.size()).toBe(500);

      // 等待过期（cleanupInterval 为 50ms，定时器会自动清理）
      await new Promise(resolve => setTimeout(resolve, 200));

      const afterWait = cache.size();
      cache.cleanup();
      const afterCleanup = cache.size();

      console.log(`[Cache Cleanup] Before wait: 500, After wait: ${afterWait}, After cleanup: ${afterCleanup}`);
      // 由于定时器可能已经自动清理，afterWait 可能已经为 0
      expect(afterCleanup).toBe(0);

      cache.stop();
    });
  });

  describe('Cache Key Generation Performance', () => {
    it('should generate keys for large files efficiently', async () => {
      const fileSize = 10 * 1024 * 1024; // 10MB
      const buffer = new ArrayBuffer(fileSize);
      const file = new File([buffer], 'large-file.txt', { type: 'text/plain' });

      const iterations = 100;
      const { elapsedMs } = await measureTime(() => {
        for (let i = 0; i < iterations; i++) {
          cacheManager.generateKey(file);
        }
        return undefined;
      });

      const avgTime = elapsedMs / iterations;
      console.log(`[Cache Key] ${iterations} 10MB file keys: total=${elapsedMs.toFixed(2)}ms, avg=${avgTime.toFixed(4)}ms`);

      expect(avgTime).toBeLessThan(100);
    });
  });
});
