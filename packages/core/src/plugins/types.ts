// 插件系统核心类型定义

import React from 'react';

/**
 * 插件上下文接口
 */
export interface PluginContext {
  // 聊天消息历史
  messages: ChatMessage[];
  
  // 当前配置
  config: {
    model: string;
    temperature: number;
    maxTokens: number;
  };
  
  // API 端点
  apiEndpoint: string;
  apiKey?: string;
  
  // 工具函数
  utils: {
    sendMessage: (message: ChatMessage) => void;
    clearHistory: () => void;
    updateConfig: (config: Partial<PluginContext['config']>) => void;
  };
}

/**
 * 聊天消息接口
 */
export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: number;
  metadata?: Record<string, any>;
}

/**
 * 聊天响应接口
 */
export interface ChatResponse {
  content: string;
  isComplete: boolean;
  metadata?: {
    model?: string;
    usage?: {
      promptTokens: number;
      completionTokens: number;
      totalTokens: number;
    };
  };
}

/**
 * 聊天底部组件属性
 */
export interface ChatFooterProps {
  onSkillActivate: (skillId: string) => void;
  onAttachment: (file: File) => void;
  disabled?: boolean;
}

/**
 * 聊天输入框组件属性
 */
export interface ChatInputProps {
  value: string;
  onChange: (value: string) => void;
  onSend: () => void;
  placeholder?: string;
  disabled?: boolean;
}

/**
 * 技能定义接口
 */
export interface SkillDefinition {
  id: string;
  name: string;
  description: string;
  icon: string;
  category: 'writing' | 'coding' | 'analysis' | 'translation' | 'custom';
  
  // 触发条件
  trigger?: {
    keywords?: string[];
    patterns?: RegExp[];
  };
  
  // 处理函数
  handler: SkillHandler;
  
  // UI 配置
  ui?: {
    showInToolbar?: boolean;
    showInMenu?: boolean;
  };
}

/**
 * 技能处理器类型
 */
export type SkillHandler = (
  input: string,
  context: SkillContext
) => Promise<SkillResult>;

/**
 * 技能上下文接口
 */
export interface SkillContext {
  messages: ChatMessage[];
  selectedText?: string;
  currentPage?: {
    url: string;
    title: string;
    content?: string;
  };
  attachments?: Array<{
    type: string;
    name: string;
    content: string;
  }>;
}

/**
 * 技能结果接口
 */
export interface SkillResult {
  prompt: string;
  systemPrompt?: string;
  metadata?: Record<string, any>;
}

/**
 * 聊天插件接口
 */
export interface ChatPlugin {
  // 基本信息
  id: string;
  name: string;
  version: string;
  description?: string;
  author?: string;
  
  // 生命周期
  initialize?(context: PluginContext): Promise<void>;
  destroy?(): Promise<void>;
  
  // UI 扩展点
  renderFooter?(props: ChatFooterProps): React.ReactNode;
  renderMessage?(message: ChatMessage): React.ReactNode;
  renderInput?(props: ChatInputProps): React.ReactNode;
  renderToolbar?(): React.ReactNode;
  
  // 消息处理
  preprocessMessage?(message: ChatMessage): ChatMessage | Promise<ChatMessage>;
  postprocessResponse?(response: ChatResponse): ChatResponse | Promise<ChatResponse>;
  
  // 技能支持
  skills?: SkillDefinition[];
  
  // 配置
  config?: Record<string, any>;
}

/**
 * 插件注册信息
 */
export interface PluginRegistration {
  plugin: ChatPlugin;
  context?: PluginContext;
  enabled: boolean;
  registeredAt: number;
}

/**
 * 插件管理器选项
 */
export interface PluginManagerOptions {
  debug?: boolean;
  autoInitialize?: boolean;
}
