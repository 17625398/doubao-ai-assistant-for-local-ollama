/**
 * OpenCLI 连接器模块测试
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { OpenCLIConnector, PageComplexity } from './opencli-connector';

describe('OpenCLIConnector', () => {
  let connector: OpenCLIConnector;

  beforeEach(() => {
    connector = OpenCLIConnector.getInstance();
  });

  it('应该正确初始化单例', () => {
    expect(connector).toBeDefined();
    expect(connector instanceof OpenCLIConnector).toBe(true);
  });

  it('应该返回单例实例', () => {
    const instance1 = OpenCLIConnector.getInstance();
    const instance2 = OpenCLIConnector.getInstance();
    expect(instance1).toBe(instance2);
  });

  it('evaluatePageComplexity 应该返回正确的复杂度评估', () => {
    const complexity = connector.evaluatePageComplexity();
    
    expect(complexity).toHaveProperty('score');
    expect(complexity).toHaveProperty('isComplex');
    expect(complexity).toHaveProperty('factors');
    
    expect(typeof complexity.score).toBe('number');
    expect(complexity.score).toBeGreaterThanOrEqual(0);
    expect(complexity.score).toBeLessThanOrEqual(100);
    
    expect(typeof complexity.isComplex).toBe('boolean');
    
    expect(complexity.factors).toHaveProperty('hasDynamicContent');
    expect(complexity.factors).toHaveProperty('requiresAuth');
    expect(complexity.factors).toHaveProperty('hasManyInteractions');
    expect(complexity.factors).toHaveProperty('isSPA');
    expect(complexity.factors).toHaveProperty('hasIframes');
  });

  it('evaluatePageComplexity 应该正确识别复杂页面', () => {
    const complexity = connector.evaluatePageComplexity();
    
    if (complexity.score > 60) {
      expect(complexity.isComplex).toBe(true);
    } else {
      expect(complexity.isComplex).toBe(false);
    }
  });

  it('getPerformanceStats 应该返回性能统计', () => {
    const stats = connector.getPerformanceStats();
    
    expect(stats).toHaveProperty('totalExtractions');
    expect(stats).toHaveProperty('averageDuration');
    expect(stats).toHaveProperty('strategyDistribution');
    
    expect(typeof stats.totalExtractions).toBe('number');
    expect(typeof stats.averageDuration).toBe('number');
  });
});
