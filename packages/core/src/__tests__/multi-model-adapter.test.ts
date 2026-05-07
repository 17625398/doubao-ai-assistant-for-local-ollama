/**
 * 多模型适配层单元测试
 */

import {
  calculateMessageComplexity,
  selectModelType,
  ModelCacheManager,
  CircuitBreaker,
  RateLimiter,
  ResilienceManager,
  withRetry,
  ModelMetrics,
} from '../multi-model-adapter';
import {
  OllamaAdapter,
} from '../adapters/ollama-adapter';
import type { ChatRequest, ChatMessage } from '../types/multi-model';

// ============================================
// 复杂度计算测试
// ============================================

describe('calculateMessageComplexity', () => {
  test('简单消息复杂度低', () => {
    const complexity = calculateMessageComplexity('你好');
    expect(complexity).toBeLessThan(0.2);
  });

  test('长消息复杂度较高', () => {
    const longMessage = 'a'.repeat(500);
    const complexity = calculateMessageComplexity(longMessage);
    expect(complexity).toBeGreaterThanOrEqual(0.5);
  });

  test('包含代码的消息复杂度增加', () => {
    const codeMessage = '```javascript\nconst x = 1;\n```';
    const complexity = calculateMessageComplexity(codeMessage);
    expect(complexity).toBeGreaterThanOrEqual(0.3);
  });

  test('包含数学公式的消息复杂度增加', () => {
    const mathMessage = '求解: $x^2 + y^2 = z^2$';
    const complexity = calculateMessageComplexity(mathMessage);
    expect(complexity).toBeGreaterThanOrEqual(0.2);
  });

  test('复杂度上限为 1', () => {
    const veryLongMessage = 'a'.repeat(10000) + '```code```' + '?'.repeat(10);
    const complexity = calculateMessageComplexity(veryLongMessage);
    expect(complexity).toBeLessThanOrEqual(1);
  });
});

describe('selectModelType', () => {
  test('低复杂度选择 lightweight', () => {
    const modelType = selectModelType(0.3);
    expect(modelType).toBe('lightweight');
  });

  test('高复杂度选择 heavyweight', () => {
    const modelType = selectModelType(0.7);
    expect(modelType).toBe('heavyweight');
  });

  test('边界值 0.6 选择 heavyweight', () => {
    const modelType = selectModelType(0.6);
    expect(modelType).toBe('heavyweight');
  });

  test('边界值 0.59 选择 lightweight', () => {
    const modelType = selectModelType(0.59);
    expect(modelType).toBe('lightweight');
  });
});

// ============================================
// 缓存管理器测试
// ============================================

describe('ModelCacheManager', () => {
  let cache: ModelCacheManager;

  beforeEach(() => {
    cache = new ModelCacheManager({ enabled: true, ttl: 1000 });
  });

  afterEach(() => {
    cache.clear();
  });

  test('缓存设置和获取', () => {
    const request: ChatRequest = {
      messages: [{ role: 'user', content: 'test' }],
    };

    const response = {
      message: { role: 'assistant', content: 'response' },
      done: true,
    };

    cache.set(request, response as any);
    const cached = cache.get(request);

    expect(cached).not.toBeNull();
    expect(cached?.message.content).toBe('response');
  });

  test('缓存未命中返回 null', () => {
    const request: ChatRequest = {
      messages: [{ role: 'user', content: 'test' }],
    };

    const cached = cache.get(request);
    expect(cached).toBeNull();
  });

  test('相同请求返回缓存', () => {
    const request: ChatRequest = {
      messages: [{ role: 'user', content: 'test' }],
    };

    const response = {
      message: { role: 'assistant', content: 'cached' },
      done: true,
    };

    cache.set(request, response as any);
    const cached1 = cache.get(request);
    const cached2 = cache.get(request);

    expect(cached1).toBe(cached2);
  });

  test('不同请求返回不同缓存', () => {
    const request1: ChatRequest = {
      messages: [{ role: 'user', content: 'test1' }],
    };

    const request2: ChatRequest = {
      messages: [{ role: 'user', content: 'test2' }],
    };

    cache.set(request1, { message: { role: 'assistant', content: 'r1' }, done: true } as any);
    cache.set(request2, { message: { role: 'assistant', content: 'r2' }, done: true } as any);

    const cached1 = cache.get(request1);
    const cached2 = cache.get(request2);

    expect(cached1?.message.content).toBe('r1');
    expect(cached2?.message.content).toBe('r2');
  });

  test('TTL 过期后缓存失效', async () => {
    const fastCache = new ModelCacheManager({ enabled: true, ttl: 50 });

    const request: ChatRequest = {
      messages: [{ role: 'user', content: 'test' }],
    };

    fastCache.set(request, { message: { role: 'assistant', content: 'test' }, done: true } as any);

    expect(fastCache.get(request)).not.toBeNull();

    await new Promise(resolve => setTimeout(resolve, 100));

    expect(fastCache.get(request)).toBeNull();
  });

  test('清除所有缓存', () => {
    const request: ChatRequest = {
      messages: [{ role: 'user', content: 'test' }],
    };

    cache.set(request, { message: { role: 'assistant', content: 'test' }, done: true } as any);
    expect(cache.get(request)).not.toBeNull();

    cache.clear();
    expect(cache.get(request)).toBeNull();
  });

  test('统计信息正确', () => {
    const request: ChatRequest = {
      messages: [{ role: 'user', content: 'test' }],
    };

    cache.get(request); // miss
    cache.set(request, { message: { role: 'assistant', content: 'test' }, done: true } as any);
    cache.get(request); // hit
    cache.get(request); // hit

    const stats = cache.getStats();
    expect(stats.hits).toBe(2);
    expect(stats.misses).toBe(1);
    expect(stats.hitRate).toBeCloseTo(0.667, 2);
  });
});

// ============================================
// 熔断器测试
// ============================================

describe('CircuitBreaker', () => {
  let breaker: CircuitBreaker;

  beforeEach(() => {
    breaker = new CircuitBreaker({
      failureThreshold: 0.5,
      successThreshold: 2,
      halfOpenTimeout: 1000,
      windowSize: 10,
    });
  });

  test('默认状态为 closed', () => {
    const state = breaker.getState();
    expect(state.state).toBe('closed');
  });

  test('成功调用保持 closed', async () => {
    await breaker.execute(() => Promise.resolve('success'));

    const state = breaker.getState();
    expect(state.state).toBe('closed');
  });

  test('失败次数超过阈值变为 open', async () => {
    breaker = new CircuitBreaker({
      failureThreshold: 0.3,
      halfOpenTimeout: 1000,
      windowSize: 10,
    });

    // 触发 3 次失败
    for (let i = 0; i < 3; i++) {
      try {
        await breaker.execute(() => Promise.reject(new Error('fail')));
      } catch {}
    }

    const state = breaker.getState();
    expect(state.state).toBe('open');
  });

  test('open 状态拒绝新请求', async () => {
    breaker.forceOpen();

    await expect(
      breaker.execute(() => Promise.resolve('should fail'))
    ).rejects.toThrow('Circuit breaker is open');
  });

  test('半开状态后成功调用恢复 closed', async () => {
    breaker.forceOpen();

    // 模拟时间过去
    breaker = new CircuitBreaker({
      failureThreshold: 0.5,
      successThreshold: 1,
      halfOpenTimeout: 10, // 短超时
    });

    breaker.forceOpen();

    await new Promise(resolve => setTimeout(resolve, 20));

    // 成功调用应该恢复
    breaker = new CircuitBreaker({
      failureThreshold: 0.5,
      successThreshold: 1,
      halfOpenTimeout: 10,
    });

    await breaker.execute(() => Promise.resolve('success'));
    const state = breaker.getState();
    expect(state.state).toBe('half-open');

    await breaker.execute(() => Promise.resolve('success'));
    const state2 = breaker.getState();
    expect(state2.state).toBe('closed');
  });

  test('reset 重置状态', () => {
    breaker.forceOpen();
    breaker.reset();

    const state = breaker.getState();
    expect(state.state).toBe('closed');
    expect(state.failures).toBe(0);
  });
});

// ============================================
// 限流器测试
// ============================================

describe('RateLimiter', () => {
  let limiter: RateLimiter;

  beforeEach(() => {
    limiter = new RateLimiter({
      maxRequests: 3,
      windowMs: 1000,
      queueSize: 5,
    });
  });

  test('未超过限制时立即执行', async () => {
    const result = await limiter.execute(() => Promise.resolve('success'));
    expect(result).toBe('success');
  });

  test('获取状态正确', () => {
    const state = limiter.getState();
    expect(state.available).toBe(3);
    expect(state.queued).toBe(0);
  });

  test('队列满时拒绝', async () => {
    limiter = new RateLimiter({
      maxRequests: 1,
      windowMs: 1000,
      queueSize: 1,
    });

    // 第一个请求立即执行
    await limiter.execute(() => Promise.resolve('1'));

    // 队列已满，第二个请求应该被拒绝
    await expect(
      limiter.execute(() => Promise.resolve('2'))
    ).rejects.toThrow('Rate limit queue full');
  });

  test('窗口过期后重置限制', async () => {
    limiter = new RateLimiter({
      maxRequests: 1,
      windowMs: 50,
      queueSize: 5,
    });

    await limiter.execute(() => Promise.resolve('1'));

    const state1 = limiter.getState();
    expect(state1.available).toBe(0);

    await new Promise(resolve => setTimeout(resolve, 60));

    const state2 = limiter.getState();
    expect(state2.available).toBe(1);
  });
});

// ============================================
// 重试机制测试
// ============================================

describe('withRetry', () => {
  test('成功时不重试', async () => {
    let attempts = 0;
    const result = await withRetry(
      () => {
        attempts++;
        return Promise.resolve('success');
      },
      { maxRetries: 3 }
    );

    expect(result).toBe('success');
    expect(attempts).toBe(1);
  });

  test('可重试错误时重试', async () => {
    let attempts = 0;
    const error: any = new Error('retryable');
    error.status = 503;

    await expect(
      withRetry(
        () => {
          attempts++;
          if (attempts < 3) throw error;
          return Promise.resolve('success');
        },
        { maxRetries: 3, initialDelay: 10 }
      )
    ).resolves.toBe('success');

    expect(attempts).toBe(3);
  });

  test('超过最大重试次数后失败', async () => {
    let attempts = 0;
    const error: any = new Error('always fails');
    error.status = 500;

    await expect(
      withRetry(
        () => {
          attempts++;
          throw error;
        },
        { maxRetries: 2, initialDelay: 10 }
      )
    ).rejects.toThrow('always fails');

    expect(attempts).toBe(3); // 初始 + 2 次重试
  });
});

// ============================================
// 监控指标测试
// ============================================

describe('ModelMetrics', () => {
  let metrics: ModelMetrics;

  beforeEach(() => {
    metrics = new ModelMetrics({ enabled: true });
  });

  afterEach(() => {
    metrics.reset();
  });

  test('计数器递增', () => {
    metrics.incrementCounter('test_counter', { label: 'value' });
    metrics.incrementCounter('test_counter', { label: 'value' });
    metrics.incrementCounter('test_counter', { label: 'other' });

    expect(metrics.getCounter('test_counter', { label: 'value' })).toBe(2);
    expect(metrics.getCounter('test_counter', { label: 'other' })).toBe(1);
  });

  test('仪表设置和获取', () => {
    metrics.setGauge('test_gauge', 10);
    expect(metrics.getGauge('test_gauge')).toBe(10);

    metrics.incrementGauge('test_gauge', {}, 5);
    expect(metrics.getGauge('test_gauge')).toBe(15);
  });

  test('直方图记录', () => {
    metrics.recordHistogram('test_histogram', 10);
    metrics.recordHistogram('test_histogram', 20);
    metrics.recordHistogram('test_histogram', 30);

    const stats = metrics.getHistogramStats('test_histogram');
    expect(stats.count).toBe(3);
    expect(stats.sum).toBe(60);
    expect(stats.min).toBe(10);
    expect(stats.max).toBe(30);
  });

  test('导出 Prometheus 格式', () => {
    metrics.incrementCounter('requests_total', { model: 'gpt4', status: 'success' });
    metrics.setGauge('active_connections', 5);

    const output = metrics.exportPrometheus();

    expect(output).toContain('requests_total');
    expect(output).toContain('active_connections');
    expect(output).toContain('model="gpt4"');
  });

  test('导出 JSON 格式', () => {
    metrics.incrementCounter('test_counter');
    const output = metrics.exportJSON();

    expect(output).toHaveProperty('timestamp');
    expect(output).toHaveProperty('counters');
  });

  test('获取摘要', () => {
    metrics.recordRequest('gpt4', true, 100);
    metrics.recordRequest('gpt4', true, 200);
    metrics.recordRequest('gpt4', false, 50);

    const summary = metrics.getSummary();

    expect(summary.totalRequests).toBe(3);
    expect(summary.totalErrors).toBe(1);
    expect(summary.successRate).toBeCloseTo(0.667, 2);
    expect(summary.models['gpt4']).toBeDefined();
  });
});

// ============================================
// Ollama 适配器测试
// ============================================

describe('OllamaAdapter', () => {
  test('创建实例', () => {
    const adapter = new OllamaAdapter({
      baseUrl: 'http://localhost:11434',
      defaultModel: 'gemma4:26b',
    });

    expect(adapter.provider).toBe('ollama');
    expect(adapter.modelName).toBe('gemma4:26b');
    expect(adapter.capabilities.supportsChat).toBe(true);
    expect(adapter.capabilities.supportsStreaming).toBe(true);
    expect(adapter.capabilities.costPerToken).toBe(0);
  });

  test('能力检测正确', () => {
    const adapter = new OllamaAdapter();

    expect(adapter.capabilities.maxTokens).toBe(4096);
    expect(adapter.capabilities.maxContextLength).toBe(8192);
    expect(adapter.capabilities.typicalLatency).toBe(100);
  });
});
