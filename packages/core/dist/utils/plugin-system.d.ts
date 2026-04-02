import { DocumentParser } from '../types/document';
/**
 * 插件类型
 */
export declare enum PluginType {
    DOCUMENT_PARSER = "document_parser",
    AI_PROCESSOR = "ai_processor",
    UI_COMPONENT = "ui_component",
    UTILITY = "utility"
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
export declare class PluginManager {
    private plugins;
    private initialized;
    /**
     * 注册插件
     */
    registerPlugin(plugin: Plugin): Promise<void>;
    /**
     * 卸载插件
     */
    unregisterPlugin(name: string): Promise<void>;
    /**
     * 获取插件
     */
    getPlugin(name: string): Plugin | undefined;
    /**
     * 获取指定类型的插件
     */
    getPluginsByType(type: PluginType): Plugin[];
    /**
     * 获取所有插件
     */
    getAllPlugins(): Plugin[];
    /**
     * 初始化所有插件
     */
    initialize(): Promise<void>;
    /**
     * 销毁所有插件
     */
    destroy(): Promise<void>;
    /**
     * 加载插件
     */
    loadPlugin(pluginPath: string): Promise<Plugin>;
}
/**
 * 全局插件管理器实例
 */
export declare const pluginManager: PluginManager;
/**
 * 创建文档解析器插件
 */
export declare function createDocumentParserPlugin(metadata: Omit<PluginMetadata, 'type'>, parser: DocumentParser): DocumentParserPlugin;
export default PluginManager;
