// 配置管理服务测试

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { configService, ConfigStorageType } from '../services/config-service';
import { logger } from '../utils/logger';

// 模拟 logger
vi.mock('../utils/logger', () => ({
  logger: {
    error: vi.fn(),
  },
}));

// 模拟 localStorage
const mockLocalStorage: Record<string, string> = {};

beforeEach(() => {
  vi.clearAllMocks();
  // 重置 localStorage
  Object.keys(mockLocalStorage).forEach(key => delete mockLocalStorage[key]);
  // 模拟 localStorage
  vi.stubGlobal('localStorage', {
    getItem: (key: string) => mockLocalStorage[key] || null,
    setItem: (key: string, value: string) => { mockLocalStorage[key] = value; },
    removeItem: (key: string) => { delete mockLocalStorage[key]; },
  });
});

afterEach(() => {
  vi.clearAllMocks();
});

describe('ConfigService', () => {
  it('should register config item', () => {
    configService.register('testKey', 'defaultValue', 'Test config');
    const configInfo = configService.getConfigInfo('testKey');
    expect(configInfo).toBeDefined();
    expect(configInfo?.key).toBe('testKey');
    expect(configInfo?.defaultValue).toBe('defaultValue');
    expect(configInfo?.description).toBe('Test config');
    expect(configInfo?.storageType).toBe(ConfigStorageType.LOCAL);
  });

  it('should get config value', async () => {
    configService.register('testKey', 'defaultValue');
    const value = await configService.get('testKey');
    expect(value).toBe('defaultValue');
  });

  it('should set config value', async () => {
    configService.register('testKey', 'defaultValue');
    await configService.set('testKey', 'newValue');
    const value = await configService.get('testKey');
    expect(value).toBe('newValue');
  });

  it('should reset config value to default', async () => {
    configService.register('testKey', 'defaultValue');
    await configService.set('testKey', 'newValue');
    await configService.reset('testKey');
    const value = await configService.get('testKey');
    expect(value).toBe('defaultValue');
  });

  it('should throw error for unregistered config', async () => {
    await expect(configService.get('unregisteredKey')).rejects.toThrow('Config unregisteredKey not registered');
  });

  it('should get all configs', () => {
    configService.register('key1', 'value1');
    configService.register('key2', 'value2');
    const configs = configService.getConfigs();
    expect(configs.size).toBe(2);
    expect(configs.has('key1')).toBe(true);
    expect(configs.has('key2')).toBe(true);
  });

  it('should remove config', async () => {
    configService.register('testKey', 'defaultValue');
    await configService.remove('testKey');
    const configInfo = configService.getConfigInfo('testKey');
    expect(configInfo).toBeUndefined();
  });

  it('should load all configs', async () => {
    configService.register('key1', 'value1');
    configService.register('key2', 'value2');
    await configService.loadAll();
    // 验证配置是否被加载
    const value1 = await configService.get('key1');
    const value2 = await configService.get('key2');
    expect(value1).toBe('value1');
    expect(value2).toBe('value2');
  });
});
