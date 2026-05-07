// 插件系统类型定义

/**
 * 插件状态
 */
export enum PluginStatus {
  ACTIVE = 'active',
  INACTIVE = 'inactive',
  ERROR = 'error',
  LOADING = 'loading',
}

/**
 * 插件清单
 */
export interface PluginManifest {
  name: string;
  version: string;
  description?: string;
  author?: string;
  dependencies?: Record<string, string>;
  main?: string;
  icon?: string;
  homepage?: string;
  license?: string;
}

/**
 * 插件接口
 * 所有插件必须实现这个接口
 */
export interface Plugin {
  /** 插件唯一标识 */
  id: string;
  /** 插件名称 */
  name: string;
  /** 插件版本 */
  version: string;
  /** 插件描述 */
  description?: string;
  /** 插件作者 */
  author?: string;
  /** 插件图标 */
  icon?: string;
  /** 是否启用 */
  enabled: boolean;
  /** 插件状态 */
  status?: PluginStatus;
  
  /**
   * 插件初始化
   * 在插件被加载时调用
   */
  initialize(): void | Promise<void>;
  
  /**
   * 插件销毁
   * 在插件被卸载时调用
   */
  destroy(): void | Promise<void>;
}

/**
 * 工具插件接口
 * 提供特定功能的插件
 */
export interface ToolPlugin extends Plugin {
  /** 插件类型 */
  type: 'tool';
  /** 工具分类 */
  category: string;
  /** 执行工具功能 */
  execute(params: unknown): Promise<unknown>;
}

/**
 * 输入处理器插件接口
 * 处理特定类型的输入
 */
export interface InputHandlerPlugin extends Plugin {
  /** 插件类型 */
  type: 'input-handler';
  /** 支持的文件类型 */
  supportedTypes: string[];
  /** 处理输入 */
  handle(input: File | string): Promise<{
    type: string;
    content: string;
    metadata?: Record<string, unknown>;
  }>;
}

/**
 * 消息处理器插件接口
 * 处理消息内容
 */
export interface MessageHandlerPlugin extends Plugin {
  /** 插件类型 */
  type: 'message-handler';
  /** 处理消息 */
  processMessage(message: {
    role: 'user' | 'assistant';
    content: string;
  }): Promise<{
    content: string;
    metadata?: Record<string, unknown>;
  }>;
}

/**
 * UI 扩展插件接口
 * 扩展界面功能
 */
export interface UIExtensionPlugin extends Plugin {
  /** 插件类型 */
  type: 'ui-extension';
  /** 扩展位置 */
  position: 'sidebar' | 'toolbar' | 'message-action' | 'input-action';
  /** 渲染组件 */
  render(): unknown;
}

/**
 * 插件类型联合
 */
export type PluginType = ToolPlugin | InputHandlerPlugin | MessageHandlerPlugin | UIExtensionPlugin;

/**
 * 插件配置
 */
export interface PluginConfig {
  /** 插件 ID */
  id: string;
  /** 是否启用 */
  enabled: boolean;
  /** 插件配置数据 */
  config?: Record<string, unknown>;
}

/**
 * 插件管理器事件
 */
export interface PluginManagerEvents {
  'plugin:loaded': { plugin: Plugin };
  'plugin:unloaded': { pluginId: string };
  'plugin:enabled': { pluginId: string };
  'plugin:disabled': { pluginId: string };
  'plugin:error': { pluginId: string; error: Error };
}

/**
 * 插件注册信息
 */
export interface PluginRegistration {
  /** 插件类 */
  pluginClass: new () => Plugin;
  /** 插件元数据 */
  metadata: Omit<Plugin, 'initialize' | 'destroy' | 'enabled'>;
}

/**
 * 插件市场条目
 */
export interface PluginMarketItem {
  /** 插件 ID */
  id: string;
  /** 插件名称 */
  name: string;
  /** 插件描述 */
  description: string;
  /** 插件版本 */
  version: string;
  /** 插件作者 */
  author: string;
  /** 下载地址 */
  downloadUrl: string;
  /** 图标 */
  icon?: string;
  /** 标签 */
  tags?: string[];
  /** 下载次数 */
  downloads?: number;
  /** 评分 */
  rating?: number;
}
