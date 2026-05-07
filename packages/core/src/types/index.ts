// 核心类型定义
export * from './rbac';

export interface MessagePayload {
  type: string;
  data?: unknown;
  url?: string;
  tabId?: number;
  // OpenCLI 命令相关
  action?: string;
  selector?: string;
  value?: string;
  // OpenCLI 队列相关
  commands?: Array<{ action: string; selector?: string; value?: string }>;
}

export interface CaptureResponse {
  code: number;
  data?: string;
  error?: string;
}

export interface TabInfo {
  id: number;
  url: string;
  title?: string;
  active: boolean;
}

export interface ScreenshotRequest {
  func: 'screenshop';
  method: string;
}

export interface ClosePageRequest {
  func: 'closePage' | 'closeAllPage';
  url: string;
}

export type ContentScriptMessage = ScreenshotRequest | ClosePageRequest;

// 消息状态
 export type MessageStatus = 'generating' | 'completed' | 'failed';

// 消息类型
export type MessageType = 'text' | 'image' | 'audio' | 'video' | 'file';

// 文档类型
export type DocumentType = 'text' | 'markdown' | 'pdf' | 'word' | 'excel' | 'powerpoint' | 'image' | 'other';

// 文档状态
export type DocumentStatus = 'processing' | 'completed' | 'failed';

// AI 聊天相关类型
export type ChatMessageSource = 'default' | 'openclaw';
export type DialogIntent =
  | 'general_chat'
  | 'search'
  | 'summary'
  | 'analysis'
  | 'writing'
  | 'task'
  | 'document'
  | 'tool_call';

export interface SuggestedFollowUp {
  id: string;
  label: string;
  prompt: string;
}

export interface StructuredAssistantResponse {
  summary: string;
  answer: string;
  evidence?: string[];
  suggestedFollowUps: SuggestedFollowUp[];
  actions?: string[];
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: number;
  attachments?: Attachment[];
  status?: MessageStatus;
  type?: MessageType;
  error?: string;
  userId?: string;
  sessionId?: string;
  source?: ChatMessageSource;
  sourceLabel?: string;
  intent?: DialogIntent;
  structuredResponse?: StructuredAssistantResponse;
}

export interface Attachment {
  type: 'image' | 'file' | 'audio';
  url: string;
  name: string;
  size?: number;
}

export interface ChatSession {
  id: string;
  title: string;
  messages: ChatMessage[];
  createdAt: number;
  updatedAt: number;
  batchProcessing?: {
    isActive: boolean;
    totalBatches: number;
    currentBatch: number;
  };
}

// 扩展配置类型
export interface ExtensionConfig {
  version: string;
  name: string;
  description: string;
  permissions: string[];
  hostPermissions: string[];
}

// 路由配置类型
export interface RouteConfig {
  urlPath: string;
  entryName: string;
  entryPath: string;
  isSPA: boolean;
  isStream: boolean;
  isSSR: boolean;
  isRSC: boolean;
  redirect?: string;
  responseHeader?: Record<string, string>;
  extra?: Record<string, unknown>;
}

export interface RouteManifest {
  routes: RouteConfig[];
}

// ==================== Ollama 服务配置类型 ====================

/**
 * 模型参数配置
 */
export interface ModelParams {
  /** 温度（创造性）0-1 */
  temperature: number;
  /** 最大 token 数 */
  maxTokens: number;
  /** Top P 采样 */
  topP: number;
}

/**
 * Ollama 服务配置
 */
export interface OllamaConfig {
  /** 服务地址，默认 http://localhost:11434 */
  baseUrl: string;
  /** 默认使用的模型 */
  defaultModel: string;
  /** 请求超时时间（毫秒） */
  timeout: number;
  /** 是否启用流式响应 */
  streamEnabled: boolean;
  /** 自定义请求头 */
  headers?: Record<string, string>;
  /** 模型参数 */
  modelParams?: ModelParams;
}

export interface LinkMindConfig {
  /** 服务器地址 */
  baseUrl: string;
  /** API 密钥 */
  apiKey?: string;
  /** 传输模式：直连/后端中继/代理 */
  transportMode?: 'direct' | 'backend-relay' | 'proxy';
  /** 同源网关路径（browser 下优先） */
  gatewayPath?: string;
  /** 超时时间（毫秒） */
  timeout?: number;
  /** 默认模型 */
  defaultModel?: string;
}

/**
 * Ollama 模型信息
 */
export interface OllamaModel {
  /** 模型名称 */
  name: string;
  /** 模型标识 */
  model?: string;
  /** 模型大小（字节） */
  size?: number;
  /** 模型参数大小 */
  parameter_size?: string;
  /** 量化级别 */
  quantization_level?: string;
  /** 模型描述 */
  description?: string;
  /** 是否已下载到本地 */
  downloaded?: boolean;
}

/**
 * Ollama 生成请求参数
 */
export interface OllamaGenerateRequest {
  /** 模型名称 */
  model: string;
  /** 提示词 */
  prompt: string;
  /** 系统提示词 */
  system?: string;
  /** 上下文（用于多轮对话） */
  context?: number[];
  /** 是否流式输出 */
  stream?: boolean;
  /** 生成参数 */
  options?: OllamaGenerateOptions;
  /** 中止信号 */
  signal?: AbortSignal;
}

/**
 * Ollama 生成参数选项
 */
export interface OllamaGenerateOptions {
  /** 温度（创造性）0-1 */
  temperature?: number;
  /** 最大 token 数 */
  num_predict?: number;
  /** Top P 采样 */
  top_p?: number;
  /** Top K 采样 */
  top_k?: number;
  /** 重复惩罚 */
  repeat_penalty?: number;
  /** 随机种子 */
  seed?: number;
}

/**
 * Ollama 生成响应
 */
export interface OllamaGenerateResponse {
  /** 模型名称 */
  model: string;
  /** 创建时间 */
  created_at: string;
  /** 生成的响应 */
  response: string;
  /** 是否完成 */
  done: boolean;
  /** 上下文（用于多轮对话） */
  context?: number[];
  /** 统计信息 */
  eval_count?: number;
  eval_duration?: number;
  load_duration?: number;
  prompt_eval_count?: number;
  prompt_eval_duration?: number;
  total_duration?: number;
}

/**
 * Ollama 聊天请求参数
 */
export interface OllamaChatRequest {
  /** 模型名称 */
  model: string;
  /** 消息列表 */
  messages: OllamaChatMessage[];
  /** 系统提示词 */
  system?: string;
  /** 是否流式输出 */
  stream?: boolean;
  /** 生成参数 */
  options?: OllamaGenerateOptions;
  /** 中止信号 */
  signal?: AbortSignal;
}

/**
 * Ollama 聊天消息
 */
export interface OllamaChatMessage {
  /** 角色：system/user/assistant */
  role: 'system' | 'user' | 'assistant';
  /** 消息内容 */
  content: string;
  /** 图片（用于多模态模型） */
  images?: string[];
}

/**
 * Ollama 聊天响应
 */
export interface OllamaChatResponse {
  /** 模型名称 */
  model: string;
  /** 创建时间 */
  created_at: string;
  /** 消息 */
  message: OllamaChatMessage;
  /** 是否完成 */
  done: boolean;
}

/**
 * AI 服务提供商类型
 */
export type AIProvider = 'ollama' | 'openai' | 'custom' | 'linkmind';

export type ResponseStylePreset = 'normal' | 'caveman-lite' | 'caveman' | 'caveman-ultra' | 'wenyan-lite' | 'wenyan' | 'wenyan-ultra' | 'concise' | 'technical' | 'code';

/**
 * 代理配置
 */
export interface ProxyConfig {
  /** 是否启用代理 */
  enabled: boolean;
  /** 代理 URL */
  url: string;
}

/**
 * UI 配置
 */
export interface UIConfig {
  /** 主题 */
  theme: string;
  /** 语言 */
  language: string;
  /** 是否自动打开 */
  autoOpen: boolean;
  /** 是否启用上下文菜单 */
  contextMenu: boolean;
  /** 回答风格 */
  responseStyle: ResponseStylePreset;
}

/**
 * 隐私配置
 */
export interface PrivacyConfig {
  /** 是否保存聊天历史 */
  saveChatHistory: boolean;
  /** 是否共享使用数据 */
  shareUsageData: boolean;
}

/**
 * OpenAI 配置
 */
export interface OpenAIConfig {
  /** API 密钥 */
  apiKey: string;
  /** 服务地址 */
  baseUrl: string;
  /** 默认模型 */
  defaultModel: string;
  /** 超时时间 */
  timeout: number;
  /** 是否启用流式响应 */
  streamEnabled: boolean;
  /** 自定义请求头 */
  headers?: Record<string, string>;
  /** 模型参数 */
  modelParams?: ModelParams;
}

/**
 * 自定义服务配置
 */
export interface CustomServiceConfig {
  /** 服务地址 */
  baseUrl: string;
  /** API 密钥 */
  apiKey: string;
  /** 默认模型 */
  defaultModel: string;
  /** 超时时间 */
  timeout: number;
  /** 是否启用流式响应 */
  streamEnabled: boolean;
  /** 自定义请求头 */
  headers?: Record<string, string>;
  /** 模型参数 */
  modelParams?: ModelParams;
}

/**
 * AI 服务配置
 */
export interface AIServiceConfig {
  /** 配置版本 */
  version?: string;
  /** 服务提供商 */
  provider: AIProvider;
  /** 代理配置 */
  proxy?: ProxyConfig;
  /** Ollama 配置 */
  ollama?: OllamaConfig;
  /** OpenAI 配置 */
  openai?: OpenAIConfig;
  /** 自定义服务配置 */
  custom?: CustomServiceConfig;
  /** LinkMind 配置 */
  linkmind?: LinkMindConfig;
  /** UI 配置 */
  ui?: UIConfig;
  /** 隐私配置 */
  privacy?: PrivacyConfig;
}

// Chrome 扩展 API 类型 - 使用 @types/chrome 包提供的类型

// 内容提取相关类型
export interface ExtractionOptions {
  maxContentLength?: number;
  includeImages?: boolean;
  includeLinks?: boolean;
}

export interface ExtractedContent {
  title: string;
  text: string;
  html: string;
  images: string[];
  links: string[];
}

export interface ContentExtractionResult {
  url: string;
  content: ExtractedContent;
  extractedAt: number;
  success: boolean;
  error?: string;
}

// 文档相关类型
export interface DocumentMetadata {
  name: string;
  size: number;
  type: string;
  lastModified: number;
  documentType?: DocumentType;
}

export interface DocumentContent {
  text: string;
  html: string;
  images: string[];
}

export interface DocumentAnalysis {
  summary: string;
  keywords: string[];
  topics: string[];
  entities?: string[];
  mainPoints?: string[];
  questions?: string[];
}

export interface Document {
  id: string;
  metadata: DocumentMetadata;
  content: DocumentContent;
  analysis: DocumentAnalysis;
  processedAt: number;
  status?: DocumentStatus;
  error?: string;
  userId?: string;
  sessionId?: string;
}

// 设置相关类型
export interface UserPreferences {
  theme: 'light' | 'dark' | 'system';
  language: string;
  notifications: boolean;
  autoSave: boolean;
  fontSize: number;
  fontFamily: string;
  compactMode?: boolean;
  animations?: boolean;
  keyboardShortcuts?: boolean;
  spellCheck?: boolean;
}

export interface SystemConfig {
  ollamaUrl: string;
  defaultModel: string;
  timeout: number;
  maxRetries: number;
  cacheSize: number;
  enableLogging: boolean;
  enableTelemetry?: boolean;
  maxConcurrentRequests?: number;
  enableCaching?: boolean;
}

export interface Settings {
  userPreferences: UserPreferences;
  systemConfig: SystemConfig;
}

// 技能类型
export * from './skill';
