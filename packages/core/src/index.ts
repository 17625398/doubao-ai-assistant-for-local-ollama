export * from './doubao-blueprint'

// Core 模块入口

export * from './types'
export * from './types/plugin'
export * from './utils/logger'
export * from './utils/event-bus'
export * from './utils/ollama-client'
export * from './utils/openai-compatible-client'
export * from './utils/ai-config-manager'
export * from './document-parsers'
export * from './utils/ai-document-processor'
export * from './utils/cache-manager'
export * from './utils/plugin-system'
export * from './utils/text-picker'
export * from './utils/bookmark-manager'

// 导出设计系统
export * from './design'

// 导出插件模块
export { PluginManager, pluginManager } from './plugins'
export type { PluginContext, ChatResponse as PluginChatResponse } from './plugins'
export { registerAllPlugins } from './plugins'

// 导出上下文管理模块
export {
  ContextManager,
  contextManager,
  PageContextCapture,
  pageContextCapture,
  DocumentContextExtract,
  documentContextExtract,
} from './context'
export type {
  ContextSource,
  ContextSourceType,
  ContextConfig,
  PageContext,
  DocumentContext,
  ExtractOptions,
  DocumentExtractOptions,
  SupportedDocType,
} from './context'

// 导出流式处理模块
export {
  StreamController,
  createStreamController,
  StreamContextInjector,
  streamContextInjector,
} from './stream'
export type {
  StreamChunk,
  StreamState,
  StreamConfig,
  StreamCallbacks,
  StreamMessage,
  ContextInjectionConfig,
} from './stream'

// 延迟导出浏览器环境相关的模块，避免 SSR 问题
export { ChatHistoryManager } from './utils/chat-history-manager'
export { VoiceManager } from './utils/voice-manager'
export { VoiceWakeService } from './services/voice-wake-service'
export { VoiceChatService } from './services/voice-chat-service'

// 导出延迟初始化的实例 getter
import { ChatHistoryManager } from './utils/chat-history-manager'
import { VoiceManager } from './utils/voice-manager'
import { MemPalaceService } from './utils/mem-palace'
import { VoiceWakeService } from './services/voice-wake-service'
import { VoiceChatService } from './services/voice-chat-service'

let chatHistoryManagerInstance: ChatHistoryManager | null = null
let voiceManagerInstance: VoiceManager | null = null
let memPalaceServiceInstance: MemPalaceService | null = null
let voiceWakeServiceInstance: VoiceWakeService | null = null
let voiceChatServiceInstance: VoiceChatService | null = null

export function getChatHistoryManager(): ChatHistoryManager {
  if (!chatHistoryManagerInstance) {
    chatHistoryManagerInstance = new ChatHistoryManager()
  }
  return chatHistoryManagerInstance
}

export function getVoiceManager(): VoiceManager {
  if (!voiceManagerInstance) {
    voiceManagerInstance = new VoiceManager()
  }
  return voiceManagerInstance
}

export function getMemPalaceService(): MemPalaceService {
  if (!memPalaceServiceInstance) {
    memPalaceServiceInstance = new MemPalaceService()
  }
  return memPalaceServiceInstance
}

export function getVoiceWakeService(): VoiceWakeService {
  if (!voiceWakeServiceInstance) {
    voiceWakeServiceInstance = new VoiceWakeService(getVoiceManager())
  }
  return voiceWakeServiceInstance
}

export function getVoiceChatService(): VoiceChatService {
  if (!voiceChatServiceInstance) {
    voiceChatServiceInstance = new VoiceChatService(getVoiceManager(), getVoiceWakeService())
  }
  return voiceChatServiceInstance
}

// 为了向后兼容，保留原有导出名称
export {
  getChatHistoryManager as chatHistoryManager,
  getVoiceManager as voiceManager,
  getMemPalaceService as memPalaceService,
  getVoiceWakeService as voiceWakeService,
  getVoiceChatService as voiceChatService,
}

// 新增工具模块
export * from './utils/notification-manager'
export * from './utils/prompt-manager'
export * from './utils/prompt-template-library'
export * from './utils/prompt-optimizer'
export * from './utils/prompt-validator'
export * from './utils/prompt-update-manager'
export * from './utils/context-engineering'
export * from './utils/mem-palace'
export * from './utils/ini-config-parser'
export * from './utils/response-style'
export * from './utils/theme-manager'
export * from './utils/seafile-client'
export * from './utils/web-content-extractor'
export * from './utils/advanced-web-content-extractor'
export * from './utils/rbac'

// 服务器端专用模块（仅在 Node.js 环境中使用）
// 注意：以下模块使用了 Node.js 特有的 API，不能在浏览器端使用
// export * from './utils/lightpanda-client';
// export * from './utils/extraction-engine-manager';

// 多进程架构相关模块
export * from './utils/worker-manager'
export * from './utils/message-router'
export * from './utils/cross-process-event-bus'
export * from './utils/multi-process-example'

// 网络代理系统
export * from './utils/network-proxy'

// 系统诊断模块
export * from './utils/system-diagnostics'

// RBAC 服务
export * from './services/rbac-service'

// JWT 服务
export * from './services/jwt-service'
export * from './utils/jwt'

// 错误处理服务
export * from './services/error-handler-service'

// 日志服务
export { LoggerService, loggerService } from './services/logger-service'

// 依赖注入服务
export * from './services/dependency-injection-service'

// 配置管理服务
export * from './services/config-service'

// 插件管理服务
export {
  PluginManagerService,
  pluginManager as pluginManagerService,
} from './services/plugin-manager-service'

// 技能管理服务
export { SkillManagerService, skillManagerService } from './services/skill-manager-service'

// ChatClaw 集成服务
export {
  ChatClawIntegrationService,
  chatClawIntegrationService,
} from './services/chatclaw-integration-service'

// ChatClaw 后台服务
export { ChatClawServerService, chatClawServerService } from './services/chatclaw-server-service'

// ChatClaw 文档处理服务
export {
  ChatClawDocumentService,
  chatClawDocumentService,
} from './services/chatclaw-document-service'

// OpenKB 知识库服务
export { OpenKBService, openKBService } from './services/openkb-service'
export type {
  OpenKBAddResult,
  OpenKBQueryResult,
  OpenKBChatMessage,
  OpenKBChatResult,
  OpenKBChatSession,
  OpenKBChatOptions,
  OpenKBStatus,
} from './services/openkb-service'

// Gemini 服务 (All-Model-Chat 集成)
export { GeminiService, initGeminiService, getGeminiService } from './services/gemini-service'
export type {
  GeminiConfig,
  GeminiMessage,
  GeminiPart,
  GeminiChatSession,
  GenerationConfig,
  SafetySetting,
  ToolConfig,
  StreamCallbacks as GeminiStreamCallbacks,
  SearchResult as GeminiSearchResult,
} from './services/gemini-service'

// Web Search 服务 (All-Model-Chat 集成)
export {
  WebSearchService,
  initWebSearchService,
  getWebSearchService,
} from './services/web-search-service'
export type {
  SearchResultItem,
  SearchResults,
  SearchConfig,
  SearchOptions,
} from './services/web-search-service'

// Python Execution 服务 (All-Model-Chat 集成) - 仅在浏览器环境中使用
// 注意：pyodide 只能在浏览器环境中使用，服务器端渲染时会跳过
export type { PythonExecutionResult, ExecutionConfig } from './services/python-execution-service'

// 仅导出类型，避免在服务器端渲染时加载 pyodide
// PythonExecutionService 和 getPythonExecutionService 将在浏览器环境中动态导入

// Voice 服务 (All-Model-Chat 集成)
export { VoiceService, getVoiceService } from './services/voice-service'
export type {
  VoiceRecognitionResult,
  TTSOptions,
  VoiceServiceConfig,
} from './services/voice-service'

// Document Analysis 服务 (All-Model-Chat 集成)
export {
  DocumentAnalysisService,
  getDocumentAnalysisService,
} from './services/document-analysis-service'
export type {
  DocumentType,
  DocumentInfo,
  DocumentContent,
  AnalysisResult,
  AnalysisOptions,
} from './services/document-analysis-service'

// PageIndex 服务
export { PageIndexService, pageIndexService } from './services/page-index-service'
export type {
  PageIndexTree,
  PageIndexNode,
  PageIndexNodeType,
  PageIndexSearchResult,
  PageIndexSearchOptions,
  PageIndexConfig,
  ChunkingStrategy,
  MultimodalContentType,
  MultimodalContentItem,
} from './services/page-index-service'

// OpenKB 沙箱服务
export { OpenKBSandboxService, openKBSandboxService } from './services/openkb-sandbox-service'

// ChatClaw 多问同开服务
export {
  ChatClawMultiAskService,
  chatClawMultiAskService,
} from './services/chatclaw-multi-ask-service'

// ChatClaw 任务自动化服务
export { ChatClawTaskService, chatClawTaskService } from './services/chatclaw-task-service'

// ChatClaw 对话集成服务
export {
  ChatClawChatIntegrationService,
  chatClawChatIntegrationService,
} from './services/chatclaw-chat-integration-service'

// 对话编排服务
export {
  DialogOrchestratorService,
  dialogOrchestratorService,
} from './services/dialog-orchestrator-service'

// 增强追问服务
export {
  EnhancedFollowUpService,
  enhancedFollowUpService,
} from './services/enhanced-followup-service'
export type {
  FollowUpContext,
  FollowUpOption,
  FollowUpCategory,
  FollowUpConfig,
} from './services/enhanced-followup-service'

// ChatClaw 记忆服务
export { ChatClawMemoryService, chatClawMemoryService } from './services/chatclaw-memory-service'

// ChatClaw 划词即时问答服务
export {
  ChatClawQuickAskService,
  chatClawQuickAskService,
} from './services/chatclaw-quick-ask-service'

// ChatClaw 定时任务增强服务
export {
  ChatClawTaskEnhancedService,
  chatClawTaskEnhancedService,
} from './services/chatclaw-task-enhanced-service'

// ChatClaw 多渠道通讯集成服务
export {
  ChatClawCommunicationService,
  chatClawCommunicationService,
} from './services/chatclaw-communication-service'
export type { CommunicationChannel } from './services/chatclaw-communication-service'

// ChatClaw 智能侧边栏服务
export { ChatClawSidebarService, chatClawSidebarService } from './services/chatclaw-sidebar-service'
export type { SidebarPosition, SidebarMode, QuickAction } from './services/chatclaw-sidebar-service'

// ChatClaw Gateway 服务
export { ChatClawGatewayService, chatClawGatewayService } from './services/chatclaw-gateway-service'
export type {
  GatewayConfig,
  Session,
  Channel,
  Event,
  GatewayDiagnosisOptions,
  GatewayDiagnosticReport,
  GatewayStatusRefreshOptions,
  GatewayLifecycleState,
  OpenClawCommandTarget,
  OpenClawCommandResult,
  OpenClawRuntimeInfo,
  GatewayHealthReport,
  AgentRuntimeSyncReport,
  GatewayStructuredError,
  GatewayServiceStatus,
} from './services/chatclaw-gateway-service'

// ChatClaw OpenClaw 集成服务
export {
  ChatClawOpenClawService,
  chatClawOpenClawService,
} from './services/chatclaw-openclaw-service'
export type {
  OpenClawChannel,
  OpenClawChannelConfig,
  OpenClawMessage,
} from './services/chatclaw-openclaw-service'

// ChatClaw OpenClaw 技能服务
export {
  ChatClawOpenClawSkillService,
  chatClawOpenClawSkillService,
} from './services/chatclaw-openclaw-skill-service'
export type { Skill, SkillTool, SkillParameter } from './services/chatclaw-openclaw-skill-service'

// Chrome MCP Server 技能
export * from './skills/chrome-mcp-server'

// 文本分块服务
export { TextChunkingService } from './services/text-chunking-service'

// 网页内容提取管道
export { WebContentExtractionPipeline } from './services/web-content-extraction-pipeline'

// 本地存储服务
export { LocalStorageService } from './services/local-storage-service'

// 文本摘要服务
export { TextSummaryService } from './services/text-summary-service'

// 结构化信息提取服务
export { StructuredInformationExtractionService } from './services/structured-information-extraction-service'

// 网页内容提取服务
export {
  WebContentExtractionService,
  webContentExtractionService,
} from './services/web-content-extraction-service'

// JavaScript-heavy网页处理服务 (仅Node.js可用，不在浏览器中使用)
// export { JSHeavyWebProcessingService } from './services/js-heavy-web-processing-service';

// 多格式支持服务
export { MultiFormatSupportService } from './services/multi-format-support-service'

// PDF 处理策略服务
export {
  PdfProcessingPolicyService,
  pdfProcessingPolicyService,
} from './services/pdf-processing-policy-service'

// 多引擎调度服务
export { MultiEngineSchedulerService } from './services/multi-engine-scheduler-service'

// 语义理解服务
export {
  SemanticUnderstandingService,
  semanticUnderstandingService,
} from './services/semantic-understanding-service'

// ChatClaw 渠道入职服务
export {
  ChatClawChannelOnboardingService,
  chatClawChannelOnboardingService,
} from './services/chatclaw-channel-onboarding-service'

// 情感分析服务
export {
  SentimentAnalysisService,
  sentimentAnalysisService,
} from './services/sentiment-analysis-service'

// 多模态内容分析服务
export {
  MultimodalContentAnalysisService,
  multimodalContentAnalysisService,
} from './services/multimodal-content-analysis-service'

// 功能能力开关服务
export {
  FeatureCapabilityService,
  featureCapabilityService,
} from './services/feature-capability-service'
export type { FeatureCapabilities } from './services/feature-capability-service'

// 增强版 Feature Flags 服务 (对齐原生豆包 17+ 开关)
export { FeatureFlagService, featureFlagService } from './services/feature-flag-service'
export type {
  FeatureFlags,
  NativeAlignedFeatures,
  ExtendedFeatures,
} from './services/feature-flag-service'

// Page-Agent 服务
export { PageAgentService, pageAgentService } from './services/page-agent-service'

// Caveman 服务
export { CavemanService, cavemanService } from './services/caveman-service'
export type {
  CavemanMode,
  WenyanMode,
  ExtendedMode,
  CavemanConfig,
  TokenStats,
  CustomRule,
} from './services/caveman-service'

// ChatClaw Canvas 服务
export { ChatClawCanvasService, chatClawCanvasService } from './services/chatclaw-canvas-service'
export type { CanvasElement, CanvasState } from './services/chatclaw-canvas-service'

// OpenClaw 集成使用示例
export {
  OpenClawIntegrationExample,
  openClawIntegrationExample,
} from './services/chatclaw-openclaw-example'

// ChatClaw 四层思考模式服务（借鉴豆包 AI）
export {
  ChatClawThinkingModeService,
  chatClawThinkingModeService,
} from './services/chatclaw-thinking-mode-service'
export type {
  ThinkingMode,
  ThinkingModeConfig,
  AIRequestOptions,
  AIResponse,
} from './services/chatclaw-thinking-mode-service'

// ChatClaw 动态上下文管理服务（借鉴豆包 AI）
export { ChatClawContextManager, chatClawContextManager } from './services/chatclaw-context-manager'
export type {
  ContextStrategy,
  ConversationMessage,
  Conversation,
  ManagedContext,
  SemanticUnit,
  ContextManagerConfig,
} from './services/chatclaw-context-manager'

// ChatClaw 视觉理解服务（借鉴豆包 AI）
export { ChatClawVisionService, chatClawVisionService } from './services/chatclaw-vision-service'
export type {
  VisionOptions,
  VideoOptions,
  VisionAnalysisResult,
  VideoAnalysisResult,
  MultimodalMessage,
} from './services/chatclaw-vision-service'

// ChatClaw 语音对话服务（借鉴豆包 AI）
export {
  ChatClawVoiceDialogueService,
  chatClawVoiceDialogueService,
} from './services/chatclaw-voice-dialogue-service'
export type {
  VoiceDialogueConfig,
  VoiceDialogueState,
  VoiceDialogueEvent,
  VoiceDialogueStats,
} from './services/chatclaw-voice-dialogue-service'

// ChatClaw Agent 服务（借鉴豆包 AI）
export {
  ChatClawAgentService,
  createSearchTool,
  createCalculatorTool,
  createDataFetchTool,
  createAgentReachTools,
} from './services/chatclaw-agent-service'
export type {
  Tool,
  ToolCallResult,
  TaskPlan,
  SubTask,
  AgentConfig,
  AgentResult,
  MemoryEntry,
} from './services/chatclaw-agent-service'

// ChatClaw 多Agent服务（原有）
export { chatClawAgentService } from './services/chatclaw-multi-agent-service'

// =============================================
// 多模型适配层 (Multi-Model Adapter Layer)
// =============================================
export type {
  ModelCapability as MultiModelCapability,
  ChatMessage as MultiModelChatMessage,
  ChatRequest as MultiModelChatRequest,
  ChatResponse as MultiModelChatResponse,
  ChatChunk as MultiModelChatChunk,
  ModelInfo as MultiModelInfo,
  ModelStats as MultiModelStats,
  RoutingDecision as MultiModelRoutingDecision,
  IModelAdapter as MultiModelAdapter,
  ComplexityResult as MultiModelComplexityResult,
  ModelRoutingEvent as MultiModelRoutingEvent,
  ModelErrorEvent as MultiModelErrorEvent,
  ModelFallbackEvent as MultiModelFallbackEvent,
  OpenAIProviderConfig as MultiModelOpenAIProviderConfig,
} from './types/multi-model'

// 导出适配器类
export { OllamaAdapter } from './adapters/ollama-adapter'
export type { OllamaAdapterConfig } from './adapters/ollama-adapter'
export { OpenAICompatibleAdapter } from './adapters/openai-compatible-adapter'
export type { OpenAICompatibleConfig } from './adapters/openai-compatible-adapter'
export { MultiModelAdapterLayer } from './multi-model-adapter'
export type { LayerConfig } from './multi-model-adapter'

// 导出工厂函数和工具
export { createMultiModelLayer, getMultiModelLayer } from './multi-model-adapter'
export { calculateMessageComplexity, selectModelType } from './multi-model-adapter'

// ============================================
// Agent-Reach 服务 - 为 AI Agent 提供互联网访问能力
// ============================================
export { AgentReachService, agentReachService } from './services/agent-reach-service'
export type {
  SearchResult,
  WebPageContent,
  VideoInfo,
  VideoSubtitle,
  SocialPost,
  ChannelStatus,
  DiagnosisResult,
} from './services/agent-reach-service'

// ============================================
// LinkMind 服务 - 企业级多模态 AI 中间件
// ============================================
export { LinkMindService, linkMindService } from './services/linkmind-service'
export {
  LinkMindDocumentParser,
  linkMindDocumentParser,
} from './document-parsers/linkmind-document-parser'
export type {
  LinkMindServiceConfig,
  LinkMindModel,
  LinkMindChatMessage,
  LinkMindChatRequest,
  LinkMindChatResponse,
  LinkMindDocumentRequest,
  LinkMindDocumentResponse,
  LinkMindOCRRequest,
  LinkMindOCRResponse,
} from './services/linkmind-service'

// LinkMind 深度集成
// ============================================
export { LinkMindAdapter } from './adapters/linkmind-adapter'
export type { LinkMindAdapterConfig } from './adapters/linkmind-adapter'

export { EmbeddingService, embeddingService } from './services/embedding-service'
export type {
  EmbeddingServiceConfig,
  EmbeddingResult,
  SimilarityResult,
  BatchEmbedResult,
} from './services/embedding-service'

export { RAGService, ragService } from './services/rag-service'
export type {
  DocumentChunk,
  ChunkMetadata,
  CollectionConfig,
  CollectionInfo,
  CollectionStats,
  QueryOptions,
  HybridOptions,
  RAGResult,
  AddDocumentResult,
} from './services/rag-service'

export { DocumentChunker, documentChunker } from './utils/document-chunker'

// ============================================
// OpenClaw 深度集成 - 个人 AI 助手框架
// ============================================
export type {
  OpenClawGatewayConfig,
  DEFAULT_GATEWAY_CONFIG,
  OpenClawChannelType,
  ChannelConnectionStatus,
  SessionStatus,
  AgentSandboxConfig,
  OpenClawAgentConfig,
  OpenClawSession,
  AgentExecutionOptions,
  AgentResponse,
  ToolCallRecord,
  DMPairingPolicy,
  PairingCode,
  PendingPairingRequest,
  PeerInfo,
  SandboxPolicy,
  AccessControlEntry,
  AccessDecision,
  SkillParameterSchema,
  SkillToolDefinition,
  RateLimitConfig,
  OpenClawSkill,
  ScriptDefinition,
  SkillExecutionContext,
  SkillExecutionResult,
  ExecutionStep,
  ClawHubSkill,
  OpenClawToolDefinition,
  CronSchedule,
  CronAction,
  CronJob,
  CronRunResult,
  CronRunHistory,
  ValidationResult,
  ConfigChangeCallback,
  Snapshot,
  RestoreResult,
  SyncResult,
  ImportResult,
  SecurityScanResult,
  BlockedPattern,
  AuditEvent,
  VoiceWakeConfig,
  TalkModeConfig,
  OpenClawTTSOptions,
  TranscriptionResult,
  TranscriptionSegment,
  WakeTestResult,
  RoutingRule,
  RouteDecision,
  TokenUsageRecord,
  ConnectionTestResult,
  MessageSendResult,
  ApprovalResult,
  DependencyResolution,
  SkillHealthReport,
} from './services/openclaw/openclaw-types'

export const { CHANNEL_LABELS, CHANNEL_ICONS } =
  require('./services/openclaw/openclaw-types') as typeof import('./services/openclaw/openclaw-types')

export {
  OpenClawGatewayBridge,
  getOpenClawGateway,
  resetOpenClawGateway,
} from './services/openclaw/openclaw-gateway-bridge'

export {
  OpenClawAgentManager,
  getOpenClawAgentManager,
} from './services/openclaw/openclaw-agent-manager'

export {
  OpenClawChannelBridge,
  getOpenClawChannelBridge,
} from './services/openclaw/openclaw-channel-bridge'

export {
  OpenClawSkillService,
  getOpenClawSkillService,
} from './services/openclaw/openclaw-skill-service'

export { OpenClawToolBridge, getOpenClawToolBridge } from './services/openclaw/openclaw-tool-bridge'

export { OpenClawConfigSync, getOpenClawConfigSync } from './services/openclaw/openclaw-config-sync'

export {
  OpenClawSecurityService,
  getOpenClawSecurityService,
} from './services/openclaw/openclaw-security-service'

export {
  OpenClawVoiceService,
  getOpenClawVoiceService,
} from './services/openclaw/openclaw-voice-service'
export type {
  ChunkOptions,
  Chunk,
  ChunkMetadata as DocumentChunkerMetadata,
  ChunkResult,
} from './utils/document-chunker'
