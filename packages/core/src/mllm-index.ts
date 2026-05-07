/**
 * 多模型适配层 - 主入口
 * 统一接口 + 智能路由 + 多模型支持
 */

export * from './types/multi-model'

// =============================================
// 适配器
// =============================================

// Ollama 适配器
export { OllamaAdapter } from './adapters/ollama-adapter'
export type { OllamaAdapterConfig } from './adapters/ollama-adapter'

// OpenAI 兼容适配器
export { OpenAICompatibleAdapter } from './adapters/openai-compatible-adapter'
export type { OpenAICompatibleConfig } from './adapters/openai-compatible-adapter'

// Azure OpenAI 适配器
export { AzureOpenAIAdapter } from './adapters/azure-openai-adapter'
export type { AzureOpenAIConfig } from './adapters/azure-openai-adapter'

// AWS Bedrock 适配器
export { BedrockAdapter } from './adapters/bedrock-adapter'
export type { BedrockConfig } from './adapters/bedrock-adapter'

// 本地模型适配器
export { LocalModelAdapter } from './adapters/local-model-adapter'
export type { LocalModelConfig, LocalProvider } from './adapters/local-model-adapter'

// Gemini 适配器
export { GeminiAdapter } from './adapters/gemini-adapter'
export type { GeminiAdapterConfig } from './adapters/gemini-adapter'

// Claude 适配器
export { ClaudeAdapter } from './adapters/claude-adapter'
export type { ClaudeAdapterConfig } from './adapters/claude-adapter'

// 适配器注册表
export { AdapterRegistry, createAdapterRegistry } from './adapters/adapter-registry'
export type { AdapterRegistryConfig, AdapterType } from './adapters/adapter-registry'

// =============================================
// 核心实现
// =============================================

export { MultiModelAdapterLayer } from './multi-model-adapter'
export type { LayerConfig } from './multi-model-adapter'
export { createMultiModelLayer, getMultiModelLayer } from './multi-model-adapter'

// =============================================
// 缓存机制 (V1)
// =============================================

export { ModelCacheManager, getModelCache, createModelCache } from './mllm-cache'
export type { CacheConfig } from './mllm-cache'

// =============================================
// 缓存机制 (V2 - 增强版)
// =============================================

export {
  EnhancedCacheManager,
  ResponseCache,
  SimilarQuestionCache,
  createResponseCache,
  createSimilarQuestionCache,
  createEnhancedCache,
  generateRequestKey,
} from './mllm-cache-v2'
export type { EnhancedCacheConfig, CacheStats, EvictionPolicy } from './mllm-cache-v2'

// =============================================
// WebSocket 支持
// =============================================

export { ModelWebSocketClient, ModelWebSocketServer } from './mllm-websocket'
export type { WebSocketConfig, WebSocketEvents } from './mllm-websocket'

// =============================================
// 性能优化
// =============================================

export {
  ConnectionPool,
  BatchRequestHandler,
  ParallelExecutor,
  PerformanceMonitor,
  createConnectionPool,
  createBatchHandler,
  createParallelExecutor,
  createPerformanceMonitor,
} from './mllm-performance'
export type {
  ConnectionPoolConfig,
  ConnectionPoolEvents,
  BatchConfig,
  ParallelConfig,
  ParallelResult,
} from './mllm-performance'

// =============================================
// 弹性机制
// =============================================

export {
  withRetry,
  CircuitBreaker,
  RateLimiter,
  ResilienceManager,
  getResilienceManager,
} from './mllm-resilience'
export type {
  RetryConfig,
  CircuitBreakerConfig,
  RateLimitConfig,
  CircuitState,
  ResilienceContext,
} from './mllm-resilience'

// =============================================
// 监控指标
// =============================================

export { ModelMetrics, getModelMetrics, createModelMetrics } from './mllm-metrics'
export type { MetricsConfig, MetricsSummary } from './mllm-metrics'

// =============================================
// 工具函数
// =============================================

export { calculateMessageComplexity, selectModelType } from './multi-model-adapter'
