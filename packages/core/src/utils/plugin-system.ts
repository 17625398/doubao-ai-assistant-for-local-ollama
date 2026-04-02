// 插件系统模块

import { DocumentParser, DocumentType, DocumentParseResult, ParseOptions } from '../types/document';
import { logger } from './logger';

/**
 * 插件类型
 */
export enum PluginType {
  DOCUMENT_PARSER = 'document_parser',
  AI_PROCESSOR = 'ai_processor',
  UI_COMPONENT = 'ui_component',
  UTILITY = 'utility',
}

/**
 * 插件元数据
 */
export interface PluginMetadata {
  name: string;
  version: string;
  description: string;
  type: PluginType;
  author?: string;
  dependencies?: string[];
}

/**
 * 插件接口
 */
export interface Plugin {
  metadata: PluginMetadata;
  initialize(): Promise<void>;
  destroy(): Promise<void>;
}

/**
 * 文档解析器插件接口
 */
export interface DocumentParserPlugin extends Plugin {
  parser: DocumentParser;
}

/**
 * 插件管理器
 */
export class PluginManager {
  private plugins: Map<string, Plugin> = new Map();
  private initialized: boolean = false;

  /**
   * 注册插件
   */
  async registerPlugin(plugin: Plugin): Promise<void> {
    try {
      await plugin.initialize();
      this.plugins.set(plugin.metadata.name, plugin);
      logger.info(`Plugin registered: ${plugin.metadata.name} (${plugin.metadata.type})`);
    } catch (error) {
      logger.error(`Failed to register plugin ${plugin.metadata.name}:`, error);
      throw error;
    }
  }

  /**
   * 卸载插件
   */
  async unregisterPlugin(name: string): Promise<void> {
    const plugin = this.plugins.get(name);
    if (plugin) {
      try {
        await plugin.destroy();
        this.plugins.delete(name);
        logger.info(`Plugin unregistered: ${name}`);
      } catch (error) {
        logger.error(`Failed to unregister plugin ${name}:`, error);
        throw error;
      }
    }
  }

  /**
   * 获取插件
   */
  getPlugin(name: string): Plugin | undefined {
    return this.plugins.get(name);
  }

  /**
   * 获取指定类型的插件
   */
  getPluginsByType(type: PluginType): Plugin[] {
    return Array.from(this.plugins.values()).filter(plugin => plugin.metadata.type === type);
  }

  /**
   * 获取所有插件
   */
  getAllPlugins(): Plugin[] {
    return Array.from(this.plugins.values());
  }

  /**
   * 初始化所有插件
   */
  async initialize(): Promise<void> {
    if (this.initialized) {
      return;
    }

    const plugins = Array.from(this.plugins.values());
    for (let i = 0; i < plugins.length; i++) {
      const plugin = plugins[i];
      try {
        await plugin.initialize();
      } catch (error) {
        logger.error(`Failed to initialize plugin ${plugin.metadata.name}:`, error);
      }
    }

    this.initialized = true;
    logger.info('All plugins initialized');
  }

  /**
   * 销毁所有插件
   */
  async destroy(): Promise<void> {
    const plugins = Array.from(this.plugins.values());
    for (let i = 0; i < plugins.length; i++) {
      const plugin = plugins[i];
      try {
        await plugin.destroy();
      } catch (error) {
        logger.error(`Failed to destroy plugin ${plugin.metadata.name}:`, error);
      }
    }

    this.plugins.clear();
    this.initialized = false;
    logger.info('All plugins destroyed');
  }

  /**
   * 加载插件
   */
  async loadPlugin(pluginPath: string): Promise<Plugin> {
    try {
      // 这里是插件加载的占位符
      // 实际实现中可能需要动态导入或加载外部插件
      logger.info(`Loading plugin from: ${pluginPath}`);
      throw new Error('Plugin loading not implemented');
    } catch (error) {
      logger.error(`Failed to load plugin from ${pluginPath}:`, error);
      throw error;
    }
  }
}

/**
 * 全局插件管理器实例
 */
export const pluginManager = new PluginManager();

/**
 * 创建文档解析器插件
 */
export function createDocumentParserPlugin(
  metadata: Omit<PluginMetadata, 'type'>,
  parser: DocumentParser
): DocumentParserPlugin {
  return {
    metadata: {
      ...metadata,
      type: PluginType.DOCUMENT_PARSER,
    },
    parser,
    async initialize() {
      logger.info(`Initializing document parser plugin: ${this.metadata.name}`);
      // 初始化逻辑
    },
    async destroy() {
      logger.info(`Destroying document parser plugin: ${this.metadata.name}`);
      // 清理逻辑
    },
  };
}

export default PluginManager;
