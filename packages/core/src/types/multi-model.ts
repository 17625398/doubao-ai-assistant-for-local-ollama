/**
 * 多模型适配层类型导出
 */

// =============================================
// 核心类型
// =============================================

export interface ModelCapability {
  /** 流式响应 */
  streaming?: boolean;
  /** 函数调用 */
  functionCalling?: boolean;
  /** 视觉理解 */
  vision?: boolean;
  /** JSON 模式 */
  jsonMode?: boolean;
  /** 多模态支持 (图片/音频) */
  multimodal?: boolean;
  /** 对话能力 */
  supportsChat?: boolean;
  /** 文本生成能力 */
  supportsGenerate?: boolean;
  /** 流式响应 */
  supportsStreaming?: boolean;
  /** 最大上下文长度 */
  maxContextLength?: number;
  /** 最大输出 token */
  maxTokens?: number;
  /** 典型延迟 (ms) */
  typicalLatency?: number;
  /** 每 token 成本 */
  costPerToken?: number;
  /** 支持多模态 (别名) */
  supportsMultimodal?: boolean;
  /** 支持函数调用 (别名) */
  supportsFunctionCall?: boolean;
  /** 支持视觉 (别名) */
  supportsVision?: boolean;
}

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string | ContentPart[];
  /** Base64 或 URL 格式的图片 */
  images?: string[];
  name?: string;
  functionCall?: {
    name: string;
    arguments: string;
  };
}

/** 内容部分 */
export interface ContentPart {
  type: 'text' | 'image_url';
  text?: string;
  image_url?: { url: string };
}

export interface ChatRequest {
  model?: string;
  messages: ChatMessage[];
  system?: string;
  temperature?: number;
  topP?: number;
  maxTokens?: number;
  stream?: boolean;
  stop?: string | string[];
  tools?: any[];
  toolChoice?: any;
  responseFormat?: any;
  options?: Record<string, any>;
  requiredCapabilities?: Partial<ModelCapability>;
}

export interface ChatResponse {
  id?: string;
  model?: string;
  content?: string;
  role?: string;
  message?: ChatMessage;
  done: boolean;
  totalDuration?: number;
  usage?: {
    inputTokens?: number;
    outputTokens?: number;
    totalTokens?: number;
  };
  finishReason?: string;
  raw?: Record<string, unknown>;
}

export interface ChatChunk {
  id?: string;
  delta: string;
  done: boolean;
  streamId?: string;
  fullContent?: string;
  finishReason?: string;
  usage?: {
    inputTokens?: number;
    outputTokens?: number;
    totalTokens?: number;
  };
  metrics?: {
    promptEvalCount?: number;
    evalCount?: number;
    totalDuration?: number;
  };
  raw?: Record<string, unknown>;
}

export interface ModelInfo {
  name: string;
  provider: string;
  model?: string;
  capabilities: ModelCapability;
  contextWindow?: number;
  maxOutputTokens?: number;
  status?: 'available' | 'unavailable' | 'loading';
}

export interface ModelStats {
  model: string;
  totalQueries: number;
  successfulQueries: number;
  failedQueries: number;
  averageResponseTime: number;
  lastUsed: string;
}

export interface RoutingDecision {
  adapterName: string;
  model: string;
  reasoning: string;
  confidence: number;
  estimatedLatency: number;
  estimatedCost: number;
}

// =============================================
// 适配器接口
// =============================================

export interface IModelAdapter {
  readonly provider: string;
  readonly capabilities: ModelCapability;
  /** 当前模型名称 */
  readonly modelName: string;

  chat(request: ChatRequest): Promise<ChatResponse>;
  chatStream(request: ChatRequest, signal?: AbortSignal): AsyncGenerator<ChatChunk, void, unknown>;
  getModelInfo(): Promise<ModelInfo>;
  getCurrentModel(): string;
  isAvailable(): Promise<boolean>;
  updateConfig?(updates: any): void;
}

// =============================================
// 配置类型
// =============================================

export interface OllamaConfig {
  baseUrl?: string;
  defaultModel?: string;
  timeout?: number;
  headers?: Record<string, string>;
}

export interface OpenAIProviderConfig {
  provider: string;
  model: string;
  baseUrl: string;
  apiKey: string;
  capabilities?: Partial<ModelCapability>;
}

export interface LayerConfig {
  ollama?: OllamaConfig;
  openai?: Record<string, OpenAIProviderConfig>;
  default?: string;
  preferLocal?: boolean;
  complexityThreshold?: number;
}

// =============================================
// 复杂度分析
// =============================================

export interface ComplexityResult {
  score: number;
  factors: {
    length: number;
    hasCode: boolean;
    hasMath: boolean;
    hasImages: boolean;
    multiTurn: boolean;
  };
  recommendedCapabilities: Partial<ModelCapability>;
}

// =============================================
// 事件类型
// =============================================

export interface ModelRoutingEvent {
  request: ChatRequest;
  decision: RoutingDecision;
  timestamp: number;
}

export interface ModelErrorEvent {
  adapterName: string;
  model: string;
  error: Error;
  timestamp: number;
  willRetry: boolean;
}

export interface ModelFallbackEvent {
  fromAdapter: string;
  toAdapter: string;
  reason: string;
  timestamp: number;
}

// =============================================
// 适配器类
// =============================================

export { OllamaAdapter } from '../adapters/ollama-adapter';
export { OpenAICompatibleAdapter } from '../adapters/openai-compatible-adapter';
export { MultiModelAdapterLayer } from '../multi-model-adapter';

// =============================================
// 工厂函数
// =============================================

export { createMultiModelLayer, getMultiModelLayer } from '../multi-model-adapter';

// =============================================
// 工具函数
// =============================================

export {
  calculateMessageComplexity,
  selectModelType
} from '../multi-model-adapter';
