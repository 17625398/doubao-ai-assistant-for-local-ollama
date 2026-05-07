// 依赖注入服务测试

import { describe, it, expect, beforeEach } from 'vitest';
import { container, Inject, DependencyInjectionContainer } from '../services/dependency-injection-service';

describe('DependencyInjectionService', () => {
  beforeEach(() => {
    // 清空容器
    container.clear();
  });

  it('should register and resolve dependency', () => {
    const testDependency = { value: 'test' };
    container.register('testDependency', testDependency);
    const resolved = container.resolve('testDependency');
    expect(resolved).toBe(testDependency);
  });

  it('should register and resolve factory dependency', () => {
    const factory = () => ({ value: 'test' });
    container.register('testFactory', factory);
    const resolved = container.resolve('testFactory');
    expect(resolved).toEqual({ value: 'test' });
  });

  it('should register and resolve singleton dependency', () => {
    const factory = () => ({ value: Math.random() });
    container.register('testSingleton', factory, true);
    const resolved1 = container.resolve('testSingleton');
    const resolved2 = container.resolve('testSingleton');
    expect(resolved1).toBe(resolved2);
  });

  it('should throw error for unregistered dependency', () => {
    expect(() => container.resolve('unregistered')).toThrow('Dependency unregistered not registered');
  });

  it('should check if dependency exists', () => {
    container.register('testDependency', { value: 'test' });
    expect(container.has('testDependency')).toBe(true);
    expect(container.has('unregistered')).toBe(false);
  });

  it('should remove dependency', () => {
    container.register('testDependency', { value: 'test' });
    expect(container.has('testDependency')).toBe(true);
    container.remove('testDependency');
    expect(container.has('testDependency')).toBe(false);
  });

  it('should get all dependency keys', () => {
    container.register('key1', { value: 'test1' });
    container.register('key2', { value: 'test2' });
    const keys = container.getKeys();
    expect(keys).toContain('key1');
    expect(keys).toContain('key2');
    expect(keys.length).toBe(2);
  });

  it('should use Inject decorator', () => {
    container.register('testDependency', { value: 'test' });

    class TestClass {
      @Inject('testDependency')
      public dependency: any;
    }

    const instance = new TestClass();
    expect(instance.dependency).toEqual({ value: 'test' });
  });

  it('should get singleton instance of container', () => {
    const container1 = DependencyInjectionContainer.getInstance();
    const container2 = DependencyInjectionContainer.getInstance();
    expect(container1).toBe(container2);
  });
});
