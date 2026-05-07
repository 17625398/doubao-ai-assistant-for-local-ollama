// 插件系统模块
// 提供插件的注册、管理、执行等功能

import {
  Plugin,
  PluginConfig,
  ToolPlugin,
  InputHandlerPlugin,
  MessageHandlerPlugin,
  UIExtensionPlugin,
  PluginManagerEvents,
  PluginManifest,
} from '../types/plugin';
import { logger } from './logger';
import { eventBus } from './event-bus';

const PLUGIN_STORAGE_KEY = 'doubao_plugins_config';
const PLUGIN_DIR = './plugins'; // 插件目录
type RuntimeImport = (modulePath: string) => Promise<Record<string, unknown>>;

/**
 * 插件管理器
 * 管理所有插件的生命周期和配置
 */
export class PluginManager {
  private plugins: Map<string, Plugin> = new Map();
  private configs: Map<string, PluginConfig> = new Map();
  private initialized: boolean = false;
  private runtimeImportModule: RuntimeImport | null = null;

  constructor() {
    this.loadConfigs();
  }

  /**
   * 加载插件配置
   */
  private loadConfigs(): void {
    if (typeof window === 'undefined') return;
    
    try {
      const data = localStorage.getItem(PLUGIN_STORAGE_KEY);
      if (data) {
        const configs: PluginConfig[] = JSON.parse(data);
        configs.forEach(config => {
          this.configs.set(config.id, config);
        });
        logger.info('[PluginManager] Loaded', configs.length, 'plugin configs');
      }
    } catch (error) {
      logger.error('[PluginManager] Failed to load configs:', error);
    }
  }

  /**
   * 保存插件配置
   */
  private saveConfigs(): void {
    if (typeof window === 'undefined') return;
    
    try {
      const configs = Array.from(this.configs.values());
      localStorage.setItem(PLUGIN_STORAGE_KEY, JSON.stringify(configs));
    } catch (error) {
      logger.error('[PluginManager] Failed to save configs:', error);
    }
  }

  /**
   * 注册插件
   * @param plugin 插件实例
   * @param autoEnable 是否自动启用
   */
  async registerPlugin(plugin: Plugin, autoEnable: boolean = false): Promise<void> {
    if (this.plugins.has(plugin.id)) {
      throw new Error(`Plugin ${plugin.id} is already registered`);
    }

    try {
      // 检查是否有保存的配置
      const savedConfig = this.configs.get(plugin.id);
      plugin.enabled = savedConfig?.enabled ?? autoEnable;

      // 初始化插件
      if (plugin.enabled) {
        await plugin.initialize();
        logger.info('[PluginManager] Plugin initialized:', plugin.id);
      }

      this.plugins.set(plugin.id, plugin);
      
      // 保存配置
      this.configs.set(plugin.id, {
        id: plugin.id,
        enabled: plugin.enabled,
        config: savedConfig?.config,
      });
      this.saveConfigs();

      eventBus.emit('plugin:loaded', { plugin });
      logger.info('[PluginManager] Plugin registered:', plugin.id);
    } catch (error) {
      logger.error('[PluginManager] Failed to register plugin:', plugin.id, error);
      eventBus.emit('plugin:error', { pluginId: plugin.id, error: error as Error });
      throw error;
    }
  }

  /**
   * 卸载插件
   */
  async unregisterPlugin(pluginId: string): Promise<void> {
    const plugin = this.plugins.get(pluginId);
    if (!plugin) {
      logger.warn('[PluginManager] Plugin not found:', pluginId);
      return;
    }

    try {
      if (plugin.enabled) {
        await plugin.destroy();
      }
      this.plugins.delete(pluginId);
      this.configs.delete(pluginId);
      this.saveConfigs();
      
      eventBus.emit('plugin:unloaded', { pluginId });
      logger.info('[PluginManager] Plugin unregistered:', pluginId);
    } catch (error) {
      logger.error('[PluginManager] Failed to unregister plugin:', pluginId, error);
      eventBus.emit('plugin:error', { pluginId, error: error as Error });
      throw error;
    }
  }

  /**
   * 启用插件
   */
  async enablePlugin(pluginId: string): Promise<void> {
    const plugin = this.plugins.get(pluginId);
    if (!plugin) {
      throw new Error(`Plugin ${pluginId} not found`);
    }

    if (plugin.enabled) {
      return;
    }

    try {
      await plugin.initialize();
      plugin.enabled = true;
      
      const config = this.configs.get(pluginId);
      if (config) {
        config.enabled = true;
        this.saveConfigs();
      }
      
      eventBus.emit('plugin:enabled', { pluginId });
      logger.info('[PluginManager] Plugin enabled:', pluginId);
    } catch (error) {
      logger.error('[PluginManager] Failed to enable plugin:', pluginId, error);
      eventBus.emit('plugin:error', { pluginId, error: error as Error });
      throw error;
    }
  }

  /**
   * 禁用插件
   */
  async disablePlugin(pluginId: string): Promise<void> {
    const plugin = this.plugins.get(pluginId);
    if (!plugin) {
      throw new Error(`Plugin ${pluginId} not found`);
    }

    if (!plugin.enabled) {
      return;
    }

    try {
      await plugin.destroy();
      plugin.enabled = false;
      
      const config = this.configs.get(pluginId);
      if (config) {
        config.enabled = false;
        this.saveConfigs();
      }
      
      eventBus.emit('plugin:disabled', { pluginId });
      logger.info('[PluginManager] Plugin disabled:', pluginId);
    } catch (error) {
      logger.error('[PluginManager] Failed to disable plugin:', pluginId, error);
      eventBus.emit('plugin:error', { pluginId, error: error as Error });
      throw error;
    }
  }

  /**
   * 获取插件
   */
  getPlugin(pluginId: string): Plugin | undefined {
    return this.plugins.get(pluginId);
  }

  /**
   * 获取所有插件
   */
  getAllPlugins(): Plugin[] {
    return Array.from(this.plugins.values());
  }

  /**
   * 获取已启用的插件
   */
  getEnabledPlugins(): Plugin[] {
    return Array.from(this.plugins.values()).filter(p => p.enabled);
  }

  /**
   * 获取工具插件
   */
  getToolPlugins(): ToolPlugin[] {
    return this.getEnabledPlugins().filter(
      (p): p is ToolPlugin => 'type' in p && p.type === 'tool'
    );
  }

  /**
   * 获取输入处理器插件
   */
  getInputHandlerPlugins(): InputHandlerPlugin[] {
    return this.getEnabledPlugins().filter(
      (p): p is InputHandlerPlugin => 'type' in p && p.type === 'input-handler'
    );
  }

  /**
   * 获取消息处理器插件
   */
  getMessageHandlerPlugins(): MessageHandlerPlugin[] {
    return this.getEnabledPlugins().filter(
      (p): p is MessageHandlerPlugin => 'type' in p && p.type === 'message-handler'
    );
  }

  /**
   * 获取 UI 扩展插件
   */
  getUIExtensionPlugins(position?: UIExtensionPlugin['position']): UIExtensionPlugin[] {
    const plugins = this.getEnabledPlugins().filter(
      (p): p is UIExtensionPlugin => 'type' in p && p.type === 'ui-extension'
    );
    
    if (position) {
      return plugins.filter(p => p.position === position);
    }
    
    return plugins;
  }

  /**
   * 更新插件配置
   */
  updatePluginConfig(pluginId: string, config: Record<string, unknown>): void {
    const existingConfig = this.configs.get(pluginId);
    if (existingConfig) {
      existingConfig.config = { ...existingConfig.config, ...config };
      this.saveConfigs();
      logger.info('[PluginManager] Plugin config updated:', pluginId);
    }
  }

  /**
   * 获取插件配置
   */
  getPluginConfig(pluginId: string): Record<string, unknown> | undefined {
    return this.configs.get(pluginId)?.config;
  }

  /**
   * 检查插件是否已注册
   */
  isRegistered(pluginId: string): boolean {
    return this.plugins.has(pluginId);
  }

  /**
   * 检查插件是否已启用
   */
  isEnabled(pluginId: string): boolean {
    return this.plugins.get(pluginId)?.enabled ?? false;
  }

  /**
   * 从本地文件加载插件
   * @param filePath 插件文件路径
   */
  async loadPluginFromFile(filePath: string): Promise<Plugin> {
    try {
      // 通过运行时 import 避免前端打包阶段解析任意路径依赖。
      const module = await this.importPluginModule(filePath);
      
      // 查找插件类
      const pluginClass = Object.values(module).find(
        (value) => typeof value === 'function' && 'prototype' in value && 'id' in value.prototype
      );
      
      if (!pluginClass) {
        throw new Error('No plugin class found in the file');
      }
      
      // 实例化插件
      const plugin = new (pluginClass as new () => Plugin)();
      
      // 注册插件
      await this.registerPlugin(plugin);
      
      return plugin;
    } catch (error) {
      logger.error('[PluginManager] Failed to load plugin from file:', filePath, error);
      throw error;
    }
  }

  private async importPluginModule(filePath: string): Promise<Record<string, unknown>> {
    if (!this.runtimeImportModule) {
      this.runtimeImportModule = new Function(
        'modulePath',
        'return import(/* webpackIgnore: true */ modulePath);'
      ) as RuntimeImport;
    }

    return this.runtimeImportModule(filePath);
  }

  /**
   * 从远程 URL 加载插件
   * @param url 插件 URL
   */
  async loadPluginFromUrl(url: string): Promise<Plugin> {
    try {
      // 下载插件代码
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`Failed to download plugin: ${response.statusText}`);
      }
      
      const code = await response.text();
      
      // 创建临时模块
      const module = { exports: {} };
      const require = (path: string) => {
        // 简单的模块解析（实际应用中可能需要更复杂的逻辑）
        if (path === 'core') {
          return require('../index');
        }
        throw new Error(`Module ${path} not found`);
      };
      
      // 执行插件代码
      const evalCode = `(function(module, exports, require) { ${code} })(module, module.exports, require);`;
      eval(evalCode);
      
      // 查找插件类
      const pluginClass = Object.values(module.exports).find(
        (value) => typeof value === 'function' && 'prototype' in value && 'id' in value.prototype
      );
      
      if (!pluginClass) {
        throw new Error('No plugin class found in the code');
      }
      
      // 实例化插件
      const plugin = new (pluginClass as new () => Plugin)();
      
      // 注册插件
      await this.registerPlugin(plugin);
      
      return plugin;
    } catch (error) {
      logger.error('[PluginManager] Failed to load plugin from URL:', url, error);
      throw error;
    }
  }

  /**
   * 扫描并加载本地插件目录
   */
  async scanAndLoadPlugins(): Promise<void> {
    try {
      // 在浏览器环境中，我们可以使用动态导入来加载插件
      if (typeof window !== 'undefined') {
        // 这里可以实现从插件目录加载插件的逻辑
        // 例如，通过 Webpack 的 require.context 或其他方式
        logger.info('[PluginManager] Scanning for plugins...');
      }
    } catch (error) {
      logger.error('[PluginManager] Failed to scan plugins:', error);
    }
  }
}

// 导出单例实例
export const pluginManager = new PluginManager();

// 为了 SSR 兼容性，提供 getter 函数
export function getPluginManager(): PluginManager {
  return pluginManager;
}
