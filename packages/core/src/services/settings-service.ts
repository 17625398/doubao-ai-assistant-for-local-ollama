// 系统设置服务

import { logger } from '../utils/logger';
import { eventBus } from '../utils/event-bus';
import { Settings, UserPreferences, SystemConfig } from '../types';

/**
 * 存储接口
 */
interface StorageInterface {
  get(key: string): string | null;
  set(key: string, value: string): void;
  remove(key: string): void;
  clear(): void;
}

/**
 * 本地存储实现
 */
class LocalStorage implements StorageInterface {
  get(key: string): string | null {
    return localStorage.getItem(key);
  }
  
  set(key: string, value: string): void {
    localStorage.setItem(key, value);
  }
  
  remove(key: string): void {
    localStorage.removeItem(key);
  }
  
  clear(): void {
    localStorage.clear();
  }
}

/**
 * 内存存储实现（用于测试或无localStorage环境）
 */
class MemoryStorage implements StorageInterface {
  private storage: Map<string, string> = new Map();
  
  get(key: string): string | null {
    return this.storage.get(key) || null;
  }
  
  set(key: string, value: string): void {
    this.storage.set(key, value);
  }
  
  remove(key: string): void {
    this.storage.delete(key);
  }
  
  clear(): void {
    this.storage.clear();
  }
}

/**
 * 系统设置服务配置
 */
interface SettingsServiceConfig {
  storageKey: string;
  storage: StorageInterface;
  enableValidation: boolean;
  enableEncryption: boolean;
  encryptionKey: string;
}

/**
 * 系统设置服务
 */
export class SettingsService {
  private settings: Settings;
  private config: SettingsServiceConfig;
  private settingCache: Map<string, any> = new Map();
  private version = '1.0.0';

  constructor(config?: Partial<SettingsServiceConfig>) {
    this.config = {
      storageKey: 'doubao-settings',
      storage: typeof localStorage !== 'undefined' ? new LocalStorage() : new MemoryStorage(),
      enableValidation: true,
      enableEncryption: false,
      encryptionKey: 'doubao-settings-key',
      ...config
    };
    
    this.settings = this.loadSettings();
    logger.info('SettingsService initialized with version:', this.version);
  }

  /**
   * 加载设置
   */
  private loadSettings(): Settings {
    try {
      const stored = this.config.storage.get(this.config.storageKey);
      if (stored) {
        let parsed: any;
        
        // 尝试解密
        if (this.config.enableEncryption) {
          parsed = this.decrypt(stored);
        } else {
          parsed = JSON.parse(stored);
        }
        
        // 版本迁移
        return this.migrateSettings(parsed);
      }
    } catch (error) {
      logger.error('Failed to load settings:', error);
      // 尝试从备份加载
      try {
        const backup = this.config.storage.get(`${this.config.storageKey}-backup`);
        if (backup) {
          const parsed = JSON.parse(backup);
          logger.info('Loaded settings from backup');
          return this.migrateSettings(parsed);
        }
      } catch (backupError) {
        logger.error('Failed to load backup settings:', backupError);
      }
    }
    return this.getDefaultSettings();
  }

  /**
   * 保存设置
   */
  private saveSettings(): void {
    try {
      let data = JSON.stringify({
        ...this.settings,
        version: this.version
      });
      
      // 加密
      if (this.config.enableEncryption) {
        data = this.encrypt(data);
      }
      
      // 创建备份
      this.config.storage.set(`${this.config.storageKey}-backup`, JSON.stringify(this.settings));
      
      // 保存主设置
      this.config.storage.set(this.config.storageKey, data);
      
      // 清除缓存
      this.settingCache.clear();
      
      // 触发事件
      eventBus.emit('settings:updated', { ...this.settings });
    } catch (error) {
      logger.error('Failed to save settings:', error);
    }
  }

  /**
   * 版本迁移
   */
  private migrateSettings(settings: any): Settings {
    const defaultSettings = this.getDefaultSettings();
    
    // 确保所有必要的字段存在
    const migrated: Settings = {
      userPreferences: {
        ...defaultSettings.userPreferences,
        ...(settings.userPreferences || {})
      },
      systemConfig: {
        ...defaultSettings.systemConfig,
        ...(settings.systemConfig || {})
      }
    };
    
    return migrated;
  }

  /**
   * 获取默认设置
   */
  private getDefaultSettings(): Settings {
    return {
      userPreferences: {
        theme: 'light',
        language: 'zh-CN',
        notifications: true,
        autoSave: true,
        fontSize: 16,
        fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
        compactMode: false,
        animations: true,
        keyboardShortcuts: true,
        spellCheck: true
      },
      systemConfig: {
        ollamaUrl: 'http://localhost:11434',
        defaultModel: 'gemma4:26b',
        timeout: 30000,
        maxRetries: 3,
        cacheSize: 100,
        enableLogging: true,
        enableTelemetry: false,
        maxConcurrentRequests: 3,
        enableCaching: true
      }
    };
  }

  /**
   * 加密数据
   */
  private encrypt(data: string): string {
    try {
      // 简单的加密实现，实际应用中应该使用更安全的加密方法
      return btoa(unescape(encodeURIComponent(data)));
    } catch (error) {
      logger.error('Failed to encrypt settings:', error);
      return data;
    }
  }

  /**
   * 解密数据
   */
  private decrypt(data: string): any {
    try {
      // 简单的解密实现，实际应用中应该使用更安全的加密方法
      const decoded = decodeURIComponent(escape(atob(data)));
      return JSON.parse(decoded);
    } catch (error) {
      logger.error('Failed to decrypt settings:', error);
      throw error;
    }
  }

  /**
   * 获取所有设置
   */
  getSettings(): Settings {
    return { ...this.settings };
  }

  /**
   * 获取用户偏好
   */
  getUserPreferences(): UserPreferences {
    return { ...this.settings.userPreferences };
  }

  /**
   * 获取系统配置
   */
  getSystemConfig(): SystemConfig {
    return { ...this.settings.systemConfig };
  }

  /**
   * 批量更新设置
   */
  updateSettings(updates: Partial<Settings>): Settings {
    this.settings = {
      ...this.settings,
      ...updates,
      userPreferences: {
        ...this.settings.userPreferences,
        ...(updates.userPreferences || {})
      },
      systemConfig: {
        ...this.settings.systemConfig,
        ...(updates.systemConfig || {})
      }
    };
    
    if (this.config.enableValidation && !this.validateSettings()) {
      logger.warn('Settings validation failed, using default values for invalid settings');
    }
    
    this.saveSettings();
    return this.settings;
  }

  /**
   * 更新用户偏好
   */
  updateUserPreferences(preferences: Partial<UserPreferences>): UserPreferences {
    this.settings.userPreferences = {
      ...this.settings.userPreferences,
      ...preferences
    };
    this.saveSettings();
    
    // 触发特定偏好的事件
    Object.keys(preferences).forEach(key => {
      eventBus.emit(`preference:${key}-changed`, preferences[key as keyof UserPreferences]);
    });
    
    return this.settings.userPreferences;
  }

  /**
   * 更新系统配置
   */
  updateSystemConfig(config: Partial<SystemConfig>): SystemConfig {
    this.settings.systemConfig = {
      ...this.settings.systemConfig,
      ...config
    };
    
    if (this.config.enableValidation && !this.validateSettings()) {
      logger.warn('System config validation failed, using default values for invalid configs');
    }
    
    this.saveSettings();
    
    // 触发特定配置的事件
    Object.keys(config).forEach(key => {
      eventBus.emit(`config:${key}-changed`, config[key as keyof SystemConfig]);
    });
    
    return this.settings.systemConfig;
  }

  /**
   * 重置为默认设置
   */
  resetToDefaults(): Settings {
    this.settings = this.getDefaultSettings();
    this.saveSettings();
    eventBus.emit('settings:reset', this.settings);
    return this.settings;
  }

  /**
   * 导出设置
   */
  exportSettings(format: 'json' | 'text' = 'json'): string {
    try {
      const settingsToExport = {
        ...this.settings,
        exportedAt: new Date().toISOString(),
        version: this.version
      };
      
      if (format === 'json') {
        return JSON.stringify(settingsToExport, null, 2);
      } else {
        return this.convertToText(settingsToExport);
      }
    } catch (error) {
      logger.error('Failed to export settings:', error);
      return format === 'json' ? '{}' : 'Export failed';
    }
  }

  /**
   * 转换为文本格式
   */
  private convertToText(settings: any): string {
    let text = `Doubao Settings Export\n`;
    text += `Exported At: ${settings.exportedAt}\n`;
    text += `Version: ${settings.version}\n\n`;
    
    text += `=== User Preferences ===\n`;
    Object.entries(settings.userPreferences || {}).forEach(([key, value]) => {
      text += `${key}: ${value}\n`;
    });
    
    text += `\n=== System Config ===\n`;
    Object.entries(settings.systemConfig || {}).forEach(([key, value]) => {
      text += `${key}: ${value}\n`;
    });
    
    return text;
  }

  /**
   * 导入设置
   */
  importSettings(settingsData: string, format: 'json' | 'text' = 'json'): { success: boolean; settings: Settings; error?: string } {
    try {
      let imported: any;
      
      if (format === 'json') {
        imported = JSON.parse(settingsData);
      } else {
        imported = this.parseTextSettings(settingsData);
      }
      
      // 验证导入的数据
      if (!imported.userPreferences || !imported.systemConfig) {
        throw new Error('Invalid settings format');
      }
      
      this.settings = {
        ...this.getDefaultSettings(),
        userPreferences: {
          ...this.getDefaultSettings().userPreferences,
          ...imported.userPreferences
        },
        systemConfig: {
          ...this.getDefaultSettings().systemConfig,
          ...imported.systemConfig
        }
      };
      
      if (this.config.enableValidation && !this.validateSettings()) {
        throw new Error('Invalid settings data');
      }
      
      this.saveSettings();
      eventBus.emit('settings:imported', this.settings);
      
      return { success: true, settings: this.settings };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to import settings';
      logger.error('Failed to import settings:', error);
      return { success: false, settings: this.settings, error: errorMessage };
    }
  }

  /**
   * 解析文本格式设置
   */
  private parseTextSettings(text: string): any {
    const lines = text.split('\n');
    const result: any = {
      userPreferences: {},
      systemConfig: {}
    };
    
    let currentSection = '';
    
    for (const line of lines) {
      const trimmed = line.trim();
      
      if (trimmed === '=== User Preferences ===') {
        currentSection = 'userPreferences';
      } else if (trimmed === '=== System Config ===') {
        currentSection = 'systemConfig';
      } else if (currentSection && trimmed.includes(':')) {
        const [key, ...valueParts] = trimmed.split(':');
        const value = valueParts.join(':').trim();
        
        // 尝试转换值类型
        let parsedValue: any = value;
        if (value === 'true') parsedValue = true;
        if (value === 'false') parsedValue = false;
        if (!isNaN(Number(value))) parsedValue = Number(value);
        
        if (currentSection === 'userPreferences') {
          result.userPreferences[key.trim()] = parsedValue;
        } else if (currentSection === 'systemConfig') {
          result.systemConfig[key.trim()] = parsedValue;
        }
      }
    }
    
    return result;
  }

  /**
   * 获取特定设置项
   */
  getSetting<T>(path: string): T | undefined {
    // 检查缓存
    if (this.settingCache.has(path)) {
      return this.settingCache.get(path) as T;
    }
    
    const keys = path.split('.');
    let value: any = this.settings;
    
    for (const key of keys) {
      if (value && typeof value === 'object') {
        value = value[key];
      } else {
        return undefined;
      }
    }
    
    // 缓存结果
    this.settingCache.set(path, value);
    return value;
  }

  /**
   * 设置特定设置项
   */
  setSetting(path: string, value: any): boolean {
    try {
      const keys = path.split('.');
      let current: any = this.settings;
      
      for (let i = 0; i < keys.length - 1; i++) {
        const key = keys[i];
        if (!current[key]) {
          current[key] = {};
        }
        current = current[key];
      }
      
      const lastKey = keys[keys.length - 1];
      const oldValue = current[lastKey];
      current[lastKey] = value;
      
      // 验证设置
      if (this.config.enableValidation && !this.validateSettings()) {
        // 恢复旧值
        current[lastKey] = oldValue;
        return false;
      }
      
      this.saveSettings();
      
      // 触发事件
      eventBus.emit(`setting:${path}-changed`, { oldValue, newValue: value });
      return true;
    } catch (error) {
      logger.error('Failed to set setting:', error);
      return false;
    }
  }

  /**
   * 检查设置是否有效
   */
  validateSettings(): boolean {
    try {
      // 验证系统配置
      const config = this.settings.systemConfig;
      if (!config.ollamaUrl || !config.defaultModel) {
        return false;
      }
      
      // 验证URL格式
      try {
        new URL(config.ollamaUrl);
      } catch {
        return false;
      }
      
      // 验证数值设置
      if (config.timeout < 1000 || config.maxRetries < 0 || config.cacheSize < 0) {
        return false;
      }
      
      // 验证用户偏好
      const preferences = this.settings.userPreferences;
      if (preferences.fontSize < 8 || preferences.fontSize > 32) {
        return false;
      }
      
      // 验证主题设置
      const validThemes = ['light', 'dark', 'system'];
      if (!validThemes.includes(preferences.theme)) {
        return false;
      }
      
      return true;
    } catch (error) {
      logger.error('Failed to validate settings:', error);
      return false;
    }
  }

  /**
   * 获取主题设置
   */
  getTheme(): string {
    return this.getSetting<string>('userPreferences.theme') || 'light';
  }

  /**
   * 设置主题
   */
  setTheme(theme: 'light' | 'dark' | 'system'): void {
    this.setSetting('userPreferences.theme', theme);
    eventBus.emit('theme:changed', theme);
  }

  /**
   * 获取语言设置
   */
  getLanguage(): string {
    return this.getSetting<string>('userPreferences.language') || 'zh-CN';
  }

  /**
   * 设置语言
   */
  setLanguage(language: string): void {
    this.setSetting('userPreferences.language', language);
    eventBus.emit('language:changed', language);
  }

  /**
   * 获取Ollama URL
   */
  getOllamaUrl(): string {
    return this.getSetting<string>('systemConfig.ollamaUrl') || 'http://localhost:11434';
  }

  /**
   * 设置Ollama URL
   */
  setOllamaUrl(url: string): void {
    this.setSetting('systemConfig.ollamaUrl', url);
    eventBus.emit('ollama:url-changed', url);
  }

  /**
   * 获取默认模型
   */
  getDefaultModel(): string {
    return this.getSetting<string>('systemConfig.defaultModel') || 'gemma4:26b';
  }

  /**
   * 设置默认模型
   */
  setDefaultModel(model: string): void {
    this.setSetting('systemConfig.defaultModel', model);
    eventBus.emit('ollama:model-changed', model);
  }

  /**
   * 测试设置
   */
  async testSettings(): Promise<{ success: boolean; errors: string[] }> {
    const errors: string[] = [];
    
    // 测试Ollama连接
    try {
      const url = this.getOllamaUrl();
      // 使用AbortController实现超时
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);
      
      const response = await fetch(`${url}/api/tags`, {
        method: 'GET',
        signal: controller.signal
      });
      
      clearTimeout(timeoutId);
      
      if (!response.ok) {
        errors.push(`Ollama connection failed: ${response.status}`);
      }
    } catch (error) {
      errors.push(`Ollama connection error: ${(error as Error).message}`);
    }
    
    return {
      success: errors.length === 0,
      errors
    };
  }
}

/**
 * 全局设置服务实例
 */
export const settingsService = new SettingsService();

export default SettingsService;