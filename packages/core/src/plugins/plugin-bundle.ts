// 插件注册工具 - 简化插件注册流程

import { PluginManager, pluginManager } from './plugin-manager';
import { ChatPlugin } from './types';
import { codeAssistantPlugin } from './builtin/code-assistant-plugin';
import { translatorPlugin } from './builtin/translator-plugin';
import { writingAssistantPlugin } from './builtin/writing-assistant-plugin';
import { codeAnalyzerPlugin } from './builtin/code-analyzer-plugin';
import { summarizerPlugin } from './builtin/summarizer-plugin';

/**
 * 插件包配置
 */
export interface PluginBundleConfig {
  enableCodeAssistant?: boolean;    // 启用代码助手
  enableTranslator?: boolean;       // 启用翻译
  enableWritingAssistant?: boolean; // 启用写作助手
  enableCodeAnalyzer?: boolean;     // 启用代码分析
  enableSummarizer?: boolean;       // 启用摘要
  customPlugins?: ChatPlugin[];     // 自定义插件
}

/**
 * 默认配置
 */
const DEFAULT_CONFIG: PluginBundleConfig = {
  enableCodeAssistant: true,
  enableTranslator: true,
  enableWritingAssistant: true,
  enableCodeAnalyzer: true,
  enableSummarizer: true,
  customPlugins: []
};

/**
 * 创建插件包
 * 
 * @param config 配置选项
 * @returns 插件数组
 */
export function createPluginBundle(config?: Partial<PluginBundleConfig>): ChatPlugin[] {
  const finalConfig = { ...DEFAULT_CONFIG, ...config };
  const plugins: ChatPlugin[] = [];

  // 添加内置插件
  if (finalConfig.enableCodeAssistant) {
    plugins.push(codeAssistantPlugin);
  }

  if (finalConfig.enableTranslator) {
    plugins.push(translatorPlugin);
  }

  if (finalConfig.enableWritingAssistant) {
    plugins.push(writingAssistantPlugin);
  }

  if (finalConfig.enableCodeAnalyzer) {
    plugins.push(codeAnalyzerPlugin);
  }

  if (finalConfig.enableSummarizer) {
    plugins.push(summarizerPlugin);
  }

  // 添加自定义插件
  if (finalConfig.customPlugins) {
    plugins.push(...finalConfig.customPlugins);
  }

  return plugins;
}

/**
 * 注册所有插件
 * 
 * @param pluginManager 插件管理器实例
 * @param config 配置选项
 */
export async function registerAllPlugins(
  manager: PluginManager = pluginManager,
  config?: Partial<PluginBundleConfig>
): Promise<void> {
  const plugins = createPluginBundle(config);

  console.log(`[PluginBundle] Registering ${plugins.length} plugins...`);

  for (const plugin of plugins) {
    try {
      await manager.register(plugin);
      console.log(`[PluginBundle] ✓ Registered: ${plugin.name}`);
    } catch (error) {
      console.error(`[PluginBundle] ✗ Failed to register ${plugin.name}:`, error);
    }
  }

  console.log(`[PluginBundle] Registration complete`);
}

/**
 * 注册单个插件的快捷方法
 */
export const quickRegister = {
  /**
   * 只注册代码相关插件
   */
  async codeOnly(manager: PluginManager = pluginManager): Promise<void> {
    await registerAllPlugins(manager, {
      enableCodeAssistant: true,
      enableCodeAnalyzer: true,
      enableTranslator: false,
      enableWritingAssistant: false,
      enableSummarizer: false
    });
  },

  /**
   * 只注册写作相关插件
   */
  async writingOnly(manager: PluginManager = pluginManager): Promise<void> {
    await registerAllPlugins(manager, {
      enableCodeAssistant: false,
      enableCodeAnalyzer: false,
      enableTranslator: true,
      enableWritingAssistant: true,
      enableSummarizer: true
    });
  },

  /**
   * 只注册翻译插件
   */
  async translatorOnly(manager: PluginManager = pluginManager): Promise<void> {
    await manager.register(translatorPlugin);
  },

  /**
   * 注册全部内置插件
   */
  async all(manager: PluginManager = pluginManager): Promise<void> {
    await registerAllPlugins(manager);
  }
};

/**
 * 获取所有已注册的插件信息
 */
export function getPluginInfo(): Array<{
  id: string;
  name: string;
  version: string;
  description: string;
  skills: number;
}> {
  return [
    codeAssistantPlugin,
    translatorPlugin,
    writingAssistantPlugin,
    codeAnalyzerPlugin,
    summarizerPlugin
  ].map(plugin => ({
    id: plugin.id,
    name: plugin.name,
    version: plugin.version,
    description: plugin.description || '',
    skills: plugin.skills?.length || 0
  }));
}
