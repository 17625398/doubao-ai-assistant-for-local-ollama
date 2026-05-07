// 配置管理服务

import { logger } from '../utils/logger';
import { errorHandler } from './error-handler-service';

/**
 * 配置存储类型
 */
export enum ConfigStorageType {
  LOCAL = 'local',
  SYNC = 'sync',
  MEMORY = 'memory',
}

/**
 * 配置项
 */
export interface ConfigItem<T = any> {
  key: string;
  value: T;
  defaultValue: T;
  description?: string;
  storageType: ConfigStorageType;
}

/**
 * 配置管理服务
 */
export class ConfigService {
  private static instance: ConfigService;
  private configs: Map<string, ConfigItem> = new Map();
  private storage: Record<string, any> = {};

  private constructor() {}

  static getInstance(): ConfigService {
    if (!ConfigService.instance) {
      ConfigService.instance = new ConfigService();
    }
    return ConfigService.instance;
  }

  /**
   * 注册配置项
   */
  register<T>(
    key: string,
    defaultValue: T,
    description?: string,
    storageType: ConfigStorageType = ConfigStorageType.LOCAL
  ): void {
    this.configs.set(key, {
      key,
      value: defaultValue,
      defaultValue,
      description,
      storageType,
    });
  }

  /**
   * 获取配置值
   */
  async get<T>(key: string): Promise<T> {
    const config = this.configs.get(key);
    if (!config) {
      throw errorHandler.createValidationError(`Config ${key} not registered`);
    }

    // 先从内存中获取
    if (this.storage[key] !== undefined) {
      return this.storage[key] as T;
    }

    // 从存储中获取
    try {
      let value: T;
      switch (config.storageType) {
        case ConfigStorageType.LOCAL:
          if (typeof localStorage !== 'undefined') {
            const storedValue = localStorage.getItem(key);
            value = storedValue ? JSON.parse(storedValue) : config.defaultValue;
          } else {
            value = config.defaultValue;
          }
          break;
        case ConfigStorageType.SYNC:
          if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.sync) {
            value = await new Promise<T>((resolve) => {
              chrome.storage.sync.get(key, (result) => {
                resolve(result[key] !== undefined ? result[key] : config.defaultValue);
              });
            });
          } else {
            value = config.defaultValue;
          }
          break;
        default:
          value = config.defaultValue;
      }

      // 缓存到内存
      this.storage[key] = value;
      return value;
    } catch (error) {
      logger.error('Failed to get config:', error);
      return config.defaultValue;
    }
  }

  /**
   * 设置配置值
   */
  async set<T>(key: string, value: T): Promise<void> {
    const config = this.configs.get(key);
    if (!config) {
      throw errorHandler.createValidationError(`Config ${key} not registered`);
    }

    // 缓存到内存
    this.storage[key] = value;

    // 保存到存储
    try {
      switch (config.storageType) {
        case ConfigStorageType.LOCAL:
          if (typeof localStorage !== 'undefined') {
            localStorage.setItem(key, JSON.stringify(value));
          }
          break;
        case ConfigStorageType.SYNC:
          if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.sync) {
            await new Promise<void>((resolve) => {
              chrome.storage.sync.set({ [key]: value }, resolve);
            });
          }
          break;
      }
    } catch (error) {
      logger.error('Failed to set config:', error);
      throw errorHandler.createDatabaseError('Failed to save config');
    }
  }

  /**
   * 重置配置值为默认值
   */
  async reset(key: string): Promise<void> {
    const config = this.configs.get(key);
    if (!config) {
      throw errorHandler.createValidationError(`Config ${key} not registered`);
    }

    await this.set(key, config.defaultValue);
  }

  /**
   * 重置所有配置值为默认值
   */
  async resetAll(): Promise<void> {
    for (const key of this.configs.keys()) {
      await this.reset(key);
    }
  }

  /**
   * 获取所有配置项
   */
  getConfigs(): Map<string, ConfigItem> {
    return new Map(this.configs);
  }

  /**
   * 获取配置项信息
   */
  getConfigInfo(key: string): ConfigItem | undefined {
    return this.configs.get(key);
  }

  /**
   * 移除配置项
   */
  async remove(key: string): Promise<void> {
    const config = this.configs.get(key);
    if (!config) {
      throw errorHandler.createValidationError(`Config ${key} not registered`);
    }

    // 从内存中移除
    delete this.storage[key];

    // 从存储中移除
    try {
      switch (config.storageType) {
        case ConfigStorageType.LOCAL:
          if (typeof localStorage !== 'undefined') {
            localStorage.removeItem(key);
          }
          break;
        case ConfigStorageType.SYNC:
          if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.sync) {
            await new Promise<void>((resolve) => {
              chrome.storage.sync.remove(key, resolve);
            });
          }
          break;
      }

      // 从配置中移除
      this.configs.delete(key);
    } catch (error) {
      logger.error('Failed to remove config:', error);
      throw errorHandler.createDatabaseError('Failed to remove config');
    }
  }

  /**
   * 加载所有配置
   */
  async loadAll(): Promise<void> {
    for (const key of this.configs.keys()) {
      await this.get(key);
    }
  }
}

/**
 * 全局配置服务实例
 */
export const configService = ConfigService.getInstance();
