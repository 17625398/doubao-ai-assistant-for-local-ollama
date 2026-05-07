// 插件管理服务

// Webpack 全局变量声明 - 用于绕过 Webpack 的模块解析
declare const __non_webpack_require__: NodeRequire;

import { logger } from '../utils/logger';
import { errorHandler } from './error-handler-service';
import { container } from './dependency-injection-service';
import { Plugin } from '../types/plugin';

enum PluginStatus {
  INACTIVE = 'INACTIVE',
  ACTIVE = 'ACTIVE',
}

interface PluginManifest {
  name: string;
  version?: string;
  dependencies?: Record<string, string>;
}

type ManagedPlugin = Plugin & {
  status?: PluginStatus;
  activate?: () => void | Promise<void>;
  deactivate?: () => void | Promise<void>;
  uninstall?: () => void | Promise<void>;
};

/**
 * 插件管理服务
 */
export class PluginManagerService {
  private static instance: PluginManagerService;
  private plugins: Map<string, Plugin> = new Map();
  private pluginManifests: Map<string, PluginManifest> = new Map();

  private constructor() {}

  static getInstance(): PluginManagerService {
    if (!PluginManagerService.instance) {
      PluginManagerService.instance = new PluginManagerService();
    }
    return PluginManagerService.instance;
  }

  /**
   * 注册插件
   */
  registerPlugin(plugin: Plugin): void {
    if (!plugin.name) {
      throw errorHandler.createValidationError('Plugin name is required');
    }

    this.plugins.set(plugin.name, plugin);
    logger.info(`Plugin registered: ${plugin.name}`);
  }

  /**
   * 注册插件清单
   */
  registerPluginManifest(manifest: PluginManifest): void {
    if (!manifest.name) {
      throw errorHandler.createValidationError('Plugin manifest name is required');
    }

    this.pluginManifests.set(manifest.name, manifest);
    logger.info(`Plugin manifest registered: ${manifest.name}`);
  }

  /**
   * 获取插件
   */
  getPlugin(name: string): Plugin | undefined {
    return this.plugins.get(name);
  }

  /**
   * 获取插件清单
   */
  getPluginManifest(name: string): PluginManifest | undefined {
    return this.pluginManifests.get(name);
  }

  /**
   * 获取所有插件
   */
  getPlugins(): Map<string, Plugin> {
    return new Map(this.plugins);
  }

  /**
   * 获取所有插件清单
   */
  getPluginManifests(): Map<string, PluginManifest> {
    return new Map(this.pluginManifests);
  }

  /**
   * 激活插件
   */
  async activatePlugin(name: string): Promise<void> {
    const plugin = this.plugins.get(name) as ManagedPlugin | undefined;
    if (!plugin) {
      throw errorHandler.createValidationError(`Plugin ${name} not found`);
    }

    try {
      if ((plugin as ManagedPlugin).activate) {
        await (plugin as ManagedPlugin).activate!();
      }
      (plugin as any).status = PluginStatus.ACTIVE;
      logger.info(`Plugin activated: ${name}`);
    } catch (error) {
      logger.error(`Failed to activate plugin ${name}:`, error);
      throw errorHandler.createPluginError(`Failed to activate plugin ${name}`);
    }
  }

  /**
   * 停用插件
   */
  async deactivatePlugin(name: string): Promise<void> {
    const plugin = this.plugins.get(name) as ManagedPlugin | undefined;
    if (!plugin) {
      throw errorHandler.createValidationError(`Plugin ${name} not found`);
    }

    try {
      if ((plugin as ManagedPlugin).deactivate) {
        await (plugin as ManagedPlugin).deactivate!();
      }
      (plugin as any).status = PluginStatus.INACTIVE;
      logger.info(`Plugin deactivated: ${name}`);
    } catch (error) {
      logger.error(`Failed to deactivate plugin ${name}:`, error);
      throw errorHandler.createPluginError(`Failed to deactivate plugin ${name}`);
    }
  }

  /**
   * 卸载插件
   */
  async uninstallPlugin(name: string): Promise<void> {
    const plugin = this.plugins.get(name) as ManagedPlugin | undefined;
    if (!plugin) {
      throw errorHandler.createValidationError(`Plugin ${name} not found`);
    }

    try {
      // 先停用插件
      if ((plugin as ManagedPlugin).status === PluginStatus.ACTIVE) {
        await this.deactivatePlugin(name);
      }

      // 执行卸载逻辑
      if ((plugin as ManagedPlugin).uninstall) {
        await (plugin as ManagedPlugin).uninstall!();
      }

      // 从插件列表中移除
      this.plugins.delete(name);
      this.pluginManifests.delete(name);
      logger.info(`Plugin uninstalled: ${name}`);
    } catch (error) {
      logger.error(`Failed to uninstall plugin ${name}:`, error);
      throw errorHandler.createPluginError(`Failed to uninstall plugin ${name}`);
    }
  }

  /**
   * 激活所有插件
   */
  async activateAllPlugins(): Promise<void> {
    for (const [name, plugin] of this.plugins.entries()) {
      const p = plugin as ManagedPlugin;
      if (p.status !== PluginStatus.ACTIVE) {
        await this.activatePlugin(name);
      }
    }
  }

  /**
   * 停用所有插件
   */
  async deactivateAllPlugins(): Promise<void> {
    for (const [name, plugin] of this.plugins.entries()) {
      const p = plugin as ManagedPlugin;
      if (p.status === PluginStatus.ACTIVE) {
        await this.deactivatePlugin(name);
      }
    }
  }

  /**
   * 加载插件
   */
  async loadPlugin(pluginPath: string): Promise<Plugin> {
    try {
      // 在浏览器环境中，无法直接加载本地文件
      // 在 Node.js 环境中，可以使用 require 加载插件
      if (typeof window === 'undefined') {
        // 使用 __non_webpack_require__ 绕过 Webpack 的模块解析
        // eslint-disable-next-line @typescript-eslint/no-var-requires
        const fs = __non_webpack_require__('fs');
        // eslint-disable-next-line @typescript-eslint/no-var-requires
        const path = __non_webpack_require__('path');

        // 检查插件文件是否存在
        if (!fs.existsSync(pluginPath)) {
          throw errorHandler.createValidationError(`Plugin file not found: ${pluginPath}`);
        }

        // 加载插件 - 使用 __non_webpack_require__ 动态加载
        // eslint-disable-next-line @typescript-eslint/no-var-requires
        const plugin = __non_webpack_require__(pluginPath);
        const pluginInstance = typeof plugin === 'function' ? new plugin() : plugin;

        // 注册插件
        this.registerPlugin(pluginInstance);
        
        return pluginInstance;
      } else {
        throw errorHandler.createValidationError('Plugin loading is not supported in browser environment');
      }
    } catch (error) {
      logger.error(`Failed to load plugin ${pluginPath}:`, error);
      throw errorHandler.createPluginError(`Failed to load plugin ${pluginPath}`);
    }
  }

  /**
   * 扫描插件目录
   */
  async scanPlugins(pluginsDir: string): Promise<Plugin[]> {
    try {
      // 在浏览器环境中，无法直接扫描目录
      // 在 Node.js 环境中，可以使用 fs 扫描目录
      if (typeof window === 'undefined') {
        // 使用 __non_webpack_require__ 绕过 Webpack 的模块解析
        // eslint-disable-next-line @typescript-eslint/no-var-requires
        const fs = __non_webpack_require__('fs');
        // eslint-disable-next-line @typescript-eslint/no-var-requires
        const path = __non_webpack_require__('path');

        // 检查目录是否存在
        if (!fs.existsSync(pluginsDir)) {
          throw errorHandler.createValidationError(`Plugins directory not found: ${pluginsDir}`);
        }

        const plugins: Plugin[] = [];
        const files = fs.readdirSync(pluginsDir);

        for (const file of files) {
          const pluginPath = path.join(pluginsDir, file);
          const stat = fs.statSync(pluginPath);

          if (stat.isFile() && (file.endsWith('.js') || file.endsWith('.ts'))) {
            try {
              const plugin = await this.loadPlugin(pluginPath);
              plugins.push(plugin);
            } catch (error) {
              logger.error(`Failed to load plugin ${file}:`, error);
            }
          }
        }

        return plugins;
      } else {
        throw errorHandler.createValidationError('Plugin scanning is not supported in browser environment');
      }
    } catch (error) {
      logger.error(`Failed to scan plugins directory ${pluginsDir}:`, error);
      throw errorHandler.createPluginError(`Failed to scan plugins directory ${pluginsDir}`);
    }
  }

  /**
   * 获取插件状态
   */
  getPluginStatus(name: string): PluginStatus | undefined {
    const plugin = this.plugins.get(name) as ManagedPlugin | undefined;
    return plugin?.status;
  }

  /**
   * 检查插件依赖
   */
  checkPluginDependencies(name: string): string[] {
    const manifest = this.pluginManifests.get(name);
    if (!manifest || !manifest.dependencies) {
      return [];
    }

    const missingDependencies: string[] = [];
    for (const [depName, version] of Object.entries(manifest.dependencies)) {
      if (!this.plugins.has(depName)) {
        missingDependencies.push(`${depName}@${version}`);
      }
    }

    return missingDependencies;
  }
}

/**
 * 全局插件管理服务实例
 */
export const pluginManager = PluginManagerService.getInstance();
