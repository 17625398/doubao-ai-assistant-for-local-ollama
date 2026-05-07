// 插件系统导出

export { PluginManager, pluginManager } from './plugin-manager';
export * from './types';

// 导出内置插件
export { CodeAssistantPlugin, codeAssistantPlugin } from './builtin/code-assistant-plugin';
export { TranslatorPlugin, translatorPlugin } from './builtin/translator-plugin';
export { WritingAssistantPlugin, writingAssistantPlugin } from './builtin/writing-assistant-plugin';
export { CodeAnalyzerPlugin, codeAnalyzerPlugin } from './builtin/code-analyzer-plugin';
export { SummarizerPlugin, summarizerPlugin } from './builtin/summarizer-plugin';

// 导出插件注册工具
export { createPluginBundle, registerAllPlugins } from './plugin-bundle';
