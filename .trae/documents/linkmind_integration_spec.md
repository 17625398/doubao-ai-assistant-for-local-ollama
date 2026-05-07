# LinkMind 深度集成规格文档

> **最后更新**: 2026-04-23 | **状态**: ✅ Phase 1~6 已完成

## 0. 实现进度总览

### 已完成模块 (Phase 1 + Phase 2)

| 模块                       | 文件                                                                | 状态    | 说明                                                 |
| -------------------------- | ------------------------------------------------------------------- | ------- | ---------------------------------------------------- |
| **LinkMindAdapter**        | `packages/core/src/linkmind-adapter.ts`                             | ✅ 完成 | IModelAdapter 实现，支持 chat/stream/listModels      |
| **LinkMindService 扩展**   | `packages/core/src/services/linkmind-service.ts`                    | ✅ 完成 | 新增 embed/rerank/instruction/cache/checkContent     |
| **EmbeddingService**       | `packages/core/src/services/embedding-service.ts`                   | ✅ 完成 | 向量嵌入 + LRU 缓存 + 批量处理 + 相似度计算          |
| **RAGService**             | `packages/core/src/services/rag-service.ts`                         | ✅ 完成 | 内存向量存储 + 文档分块 + 混合搜索 + Rerank          |
| **DocumentChunker**        | `packages/core/src/utils/document-chunker.ts`                       | ✅ 完成 | 固定/语义/Markdown 三策略自动分块                    |
| **RAGKnowledgePanel**      | `packages/web/src/components/rag/RAGKnowledgePanel.tsx`             | ✅ 完成 | 知识库 UI：浏览/上传/检索三标签页                    |
| **useRAGChat Hook**        | `packages/web/src/hooks/useRAGChat.ts`                              | ✅ 完成 | RAG 增强对话：自动注入上下文、取消检索               |
| **API: Chat Proxy**        | `packages/web/src/app/api/linkmind/chat/route.ts`                   | ✅ 完成 | 流式转发 + 超时控制 + 错误处理                       |
| **API: Models Proxy**      | `packages/web/src/app/api/linkmind/models/route.ts`                 | ✅ 完成 | 模型列表缓存代理 (TTL=5min)                          |
| **API: Embeddings Proxy**  | `packages/web/src/app/api/linkmind/embeddings/route.ts`             | ✅ 完成 | 批量嵌入代理 (上限500)                               |
| **API: RAG Collections**   | `packages/web/src/app/api/linkmind/rag/collections/route.ts`        | ✅ 完成 | 集合 CRUD API                                        |
| **API: RAG Documents**     | `packages/web/src/app/api/linkmind/rag/documents/route.ts`          | ✅ 完成 | 文档上传/删除 API                                    |
| **API: RAG Query**         | `packages/web/src/app/api/linkmind/rag/query/route.ts`              | ✅ 完成 | RAG 检索 API                                         |
| **MultiModelAdapterLayer** | `packages/core/src/multi-model-adapter.ts`                          | ✅ 更新 | 新增 linkmind 配置项 + registerAdapter/removeAdapter |
| **Core 导出**              | `packages/core/src/index.ts`                                        | ✅ 更新 | 全部新模块已注册导出                                 |
| **Sidebar 入口**           | `packages/web/src/components/Sidebar.tsx`                           | ✅ 更新 | 新增「知识库」按钮 (紫色高亮 + RAG 标签)             |
| **Page 集成**              | `packages/web/src/app/page.tsx`                                     | ✅ 更新 | RAGKnowledgePanel 状态管理 + 事件监听                |
| **MultimodalService**      | `packages/core/src/services/multimodal-service.ts`                  | ✅ 完成 | ASR + TTS + ImageGen + Vision + VideoAnalysis        |
| **VoiceStudioPanel**       | `packages/web/src/components/voice-studio/VoiceStudioPanel.tsx`     | ✅ 完成 | 语音工作室：录音/ASR/TTS 播放/历史记录               |
| **ImageGenPanel**          | `packages/web/src/components/image-gen/ImageGenPanel.tsx`           | ✅ 完成 | AI 绘图：提示词/风格预设/多模型/画廊预览             |
| **MCPBridgeService**       | `packages/core/src/services/mcp-bridge-service.ts`                  | ✅ 完成 | MCP 服务器管理/工具列表/调用/资源读取                |
| **MCPToolBrowser**         | `packages/web/src/components/mcp/MCPToolBrowser.tsx`                | ✅ 完成 | MCP 工具浏览器：服务器/工具/调用三标签页             |
| **API: ASR Proxy**         | `packages/web/src/app/api/linkmind/multimodal/asr/route.ts`         | ✅ 完成 | 语音识别代理 (25MB 上限)                             |
| **API: TTS Proxy**         | `packages/web/src/app/api/linkmind/multimodal/tts/route.ts`         | ✅ 完成 | 语音合成代理 (4000字符上限)                          |
| **API: ImageGen Proxy**    | `packages/web/src/app/api/linkmind/multimodal/image-gen/route.ts`   | ✅ 完成 | 图像生成代理 (2000字符上限)                          |
| **API: Vision Proxy**      | `packages/web/src/app/api/linkmind/multimodal/vision/route.ts`      | ✅ 完成 | 图像理解代理 (20MB上限, multipart支持)               |
| **API: MCP Proxy**         | `packages/web/src/app/api/linkmind/mcp/route.ts`                    | ✅ 完成 | MCP 网关代理 (GET/POST/DELETE 全方法)                |
| **Sidebar 入口 (扩展)**    | `packages/web/src/components/Sidebar.tsx`                           | ✅ 更新 | 新增「语音工作室」「AI绘图」按钮                     |
| **Page 集成 (扩展)**       | `packages/web/src/app/page.tsx`                                     | ✅ 更新 | VoiceStudio/ImageGen/MCPToolBrowser 状态+事件        |
| **GovernanceService**      | `packages/core/src/services/governance-service.ts`                  | ✅ 完成 | Token统计/缓存管理/内容过滤/费用计算                 |
| **TokenUsageDashboard**    | `packages/web/src/components/governance/TokenUsageDashboard.tsx`    | ✅ 完成 | 用量仪表盘：总览/模型排行/缓存状态/过滤规则四标签页  |
| **AgentBridgeService**     | `packages/core/src/services/agent-bridge-service.ts`                | ✅ 完成 | Agent注册/执行/同步/状态跟踪                         |
| **API: Governance Stats**  | `packages/web/src/app/api/linkmind/governance/stats/route.ts`       | ✅ 完成 | Token 统计 API (today/week/month/all)                |
| **API: Cache Stats**       | `packages/web/src/app/api/linkmind/governance/cache/stats/route.ts` | ✅ 完成 | 缓存状态 + 清除 API                                  |
| **API: Filters**           | `packages/web/src/app/api/linkmind/governance/filters/route.ts`     | ✅ 完成 | 过滤规则 CRUD API                                    |
| **API: Agents**            | `packages/web/src/app/api/linkmind/agents/route.ts`                 | ✅ 完成 | Agent 列表/执行/注册/同步 API                        |
| **Sidebar (Phase5+6)**     | `packages/web/src/components/Sidebar.tsx`                           | ✅ 更新 | 新增「用量仪表盘」「Agent 管理」按钮                 |
| **Page (Phase5+6)**        | `packages/web/src/app/page.tsx`                                     | ✅ 更新 | TokenUsageDashboard 状态+事件                        |

### 待实现模块 (Phase 7+)

| 模块                                 | 优先级 | 说明                          |
| ------------------------------------ | ------ | ----------------------------- |
| MultimodalService (ASR/TTS/ImageGen) | P1     | 多模态 API 集成               |
| MCPBridgeService                     | P1     | LinkMind MCP 网关桥接         |
| AgentBridgeService                   | P2     | OpenClaw/Hermes/DeerFlow 同步 |
| GovernanceService (缓存+统计+过滤)   | P2     | 企业级治理服务                |
| LinkMindConfigPanel                  | P1     | 可视化配置面板                |
| TokenUsageDashboard                  | P2     | 用量分析仪表盘                |
| lagi.yml 对接                        | P2     | LinkMind 配置文件同步         |

---

## 1. 项目概述

### 1.1 目标

将 [LinkMind](https://github.com/landingbj/LinkMind) 企业级多模态 AI 中间件深度集成到豆包项目中，实现统一的多模型路由、RAG 知识库、多模态 API（ASR/TTS/图像生成/OCR）、向量检索、MCP 访问等企业级能力。

### 1.2 LinkMind 核心能力矩阵

| 能力域              | LinkMind 原生支持                                | 项目当前状态                               | 集成目标                   |
| ------------------- | ------------------------------------------------ | ------------------------------------------ | -------------------------- |
| **多模型路由**      | best()/pass() 规则，集中配置                     | MultiModelAdapterLayer（仅 Ollama/OpenAI） | 扩展为 LinkMind 统一路由层 |
| **OpenAI 兼容 API** | /v1/chat/completions, /v1/embeddings, /v1/rerank | OpenAICompatibleAdapter                    | 完整兼容                   |
| **RAG 知识库**      | Chroma/Elasticsearch/Milvus/Pinecone/SQLite      | 无                                         | 新增 RAG 服务层            |
| **文档管道**        | /doc/doc2ext 提取+OCR                            | LinkMindDocumentParser（基础）             | 增强为完整文档管道         |
| **多模态 API**      | ASR, TTS, 图像生成, 视频, SQL                    | 仅 OCR + textToSQL                         | 补全 ASR/TTS/图像生成      |
| **Embeddings**      | /v1/embeddings 端点                              | 无                                         | 新增向量嵌入服务           |
| **MCP 访问**        | MCP 协议网关                                     | MCPPanel（UI壳）                           | 深度对接 LinkMind MCP      |
| **Agent 运行时**    | OpenClaw/Hermes/DeerFlow 同步                    | ChatClaw 系列                              | Agent 运行时桥接           |
| **缓存层**          | Medusa 缓存 + Token 统计                         | CacheManager（简单）                       | 升级为企业级缓存           |
| **过滤器**          | 敏感词/优先词/停止词                             | 无                                         | 新增内容过滤服务           |

## 2. 现有架构分析

### 2.1 已有 LinkMind 集成

```
packages/core/src/
├── services/
│   └── linkmind-service.ts          # 基础服务（chat/listModels/extractDoc/OCR/text2SQL）
├── document-parsers/
│   └── linkmind-document-parser.ts  # 文档解析器（作为后备）
├── types/
│   └── index.ts                     # LinkMindConfig 类型定义
└── services/
    └── linkmind-integration.md      # 集成文档
```

### 2.2 已有多模型架构

```
packages/core/src/
├── multi-model-adapter.ts           # 多模型适配器核心
├── ollama-adapter.ts                # Ollama 适配器
├── openai-compatible-adapter.ts     # OpenAI 兼容适配器
└── types/multi-model.ts             # 类型定义
```

### 2.3 前端组件体系

```
packages/web/src/components/
├── AllModelChat.tsx                 # 多模型聊天面板
├── ModelConfig.tsx                  # 模型配置
├── MCPPanel.tsx                     # MCP 管理 UI
├── WebContentAnalysis.tsx           # 网页内容分析
└── Sidebar.tsx                      # 侧边栏入口
```

## 3. 深度集成架构设计

### 3.1 整体架构图

```
┌─────────────────────────────────────────────────────────────┐
│                      前端 (Web)                              │
│  ┌─────────┐ ┌──────────┐ ┌───────┐ ┌────────┐ ┌────────┐ │
│  │ AllModel│ │  RAG     │ │ ASR/  │ │ TTS    │ │ Image  │ │
│  │ Chat    │ │ Panel    │ │ Voice │ │ Panel  │ │ Gen    │ │
│  └────┬────┘ └────┬─────┘ └───┬───┘ └───┬────┘ └───┬────┘ │
│       └────────────┼──────────┼────────┼─────────┼────────┘ │
│                    ▼          ▼        ▼         ▼          │
│              ┌─────────────────────────────────────────┐    │
│              │       Core Services Layer               │    │
│              ├─────────────────────────────────────────┤    │
│              │  LinkMindAdapter │ RAGService            │    │
│              │  EmbeddingService│ MultimodalService     │    │
│              │  MCPService     │ FilterService         │    │
│              │  CacheService   │ AgentBridgeService    │    │
│              └─────────────────┬───────────────────────┘    │
│                                │                            │
└────────────────────────────────┼────────────────────────────┘
                                 │
                    ┌────────────▼────────────┐
                    │   LinkMind Server        │
                    │   (localhost:8080)       │
                    │  ┌──────────────────┐   │
                    │  │ lagi.yml 配置     │   │
                    │  │ - model routing   │   │
                    │  │ - RAG pipelines   │   │
                    │  │ - vector stores   │   │
                    │  │ - MCP gateway     │   │
                    │  │ - agent sync      │   │
                    │  └──────────────────┘   │
                    └─────────────────────────┘
```

### 3.2 核心模块设计

#### 3.2.1 LinkMind 适配器 (LinkMindAdapter)

**文件**: `packages/core/src/linkmind-adapter.ts`

```typescript
// 实现 IModelAdapter 接口，接入 MultiModelAdapterLayer
export class LinkMindAdapter implements IModelAdapter {
  readonly provider = 'linkmind'
  readonly capabilities: ModelCapability

  // 核心方法
  chat(request: ChatRequest): Promise<ChatResponse>
  chatStream(request: ChatRequest, signal?: AbortSignal): AsyncGenerator<ChatChunk>
  embed(texts: string[]): Promise<number[][]> // 新增：向量嵌入
  rerank(query: string, docs: string[]): Promise<number[]> // 新增：重排序

  // 模型管理
  getModelInfo(): Promise<ModelInfo>
  listModels(): Promise<LinkMindModel[]>
}
```

#### 3.2.2 RAG 知识库服务 (RAGService)

**文件**: `packages/core/src/services/rag-service.ts`

```typescript
export class RAGService {
  // 文档管理
  addDocuments(docs: Document[], collection?: string): Promise<string[]>
  deleteDocuments(ids: string[], collection?: string): Promise<void>
  listCollections(): Promise<CollectionInfo[]>

  // 向量检索
  query(query: string, options?: QueryOptions): Promise<RAGResult[]>
  hybridQuery(query: string, options?: HybridOptions): Promise<RAGResult[]>

  // 知识库操作
  createCollection(name: string, config?: CollectionConfig): Promise<void>
  dropCollection(name: string): Promise<void>
  getCollectionStats(name: string): Promise<CollectionStats>
}
```

#### 3.2.3 多模态服务 (MultimodalService)

**文件**: `packages/core/src/services/multimodal-service.ts`

```typescript
export class MultimodalService {
  // 语音识别 (ASR)
  speechToText(audio: Blob | File, language?: string): Promise<ASRResult>

  // 语音合成 (TTS)
  textToSpeech(text: string, options?: TTSOptions): Promise<Blob>

  // 图像生成
  textToImage(prompt: string, options?: ImageGenOptions): Promise<ImageGenResult>

  // 图像理解
  imageUnderstand(image: string, prompt: string): Promise<VisionResult>

  // 视频理解
  videoAnalyze(videoUrl: string, prompt: string): Promise<VideoAnalysisResult>
}
```

#### 3.2.4 MCP 桥接服务 (MCPBridgeService)

**文件**: `packages/core/src/services/mcp-bridge-service.ts`

```typescript
export class MCPBridgeService {
  // 通过 LinkMind MCP 网关访问 MCP 工具
  listTools(serverName?: string): Promise<MCPTool[]>
  callTool(name: string, args: Record<string, any>): Promise<any>
  listResources(serverName?: string): Promise<MCPResource[]>
  readResource(uri: string): Promise<string>

  // 服务器管理
  connectServer(config: MCPServerConfig): Promise<void>
  disconnectServer(name: string): Promise<void>
  listServers(): Promise<MCPServerInfo[]>
}
```

#### 3.2.5 Agent 运行时桥接 (AgentBridgeService)

**文件**: `packages/core/src/services/agent-bridge-service.ts`

```typescript
export class AgentBridgeService {
  // OpenClaw 同步
  syncFromOpenClaw(): Promise<ModelConfig[]>
  pushToOpenClaw(models: ModelConfig[]): Promise<void>

  // Hermes Agent 同步
  importHermesConfig(): Promise<HermesConfig>
  exportHermesConfig(config: HermesConfig): Promise<void>

  // DeerFlow 同步
  importDeerFlowConfig(): Promise<DeerFlowConfig>
  exportDeerFlowConfig(config: DeerFlowConfig): Promise<void>
}
```

#### 3.2.6 缓存与治理服务 (GovernanceService)

**文件**: `packages/core/src/services/governance-service.ts`

```typescript
export class GovernanceService {
  // Medusa 缓存
  getCache(key: string): Promise<any>
  setCache(key: string, value: any, ttl?: number): Promise<void>
  invalidate(pattern: string): Promise<void>

  // Token 统计
  getTokenStats(period?: TimeRange): Promise<TokenStats>
  getCostEstimate(model: string, tokens: number): Promise<number>

  // 过滤器
  checkContent(content: string): Promise<FilterResult>
  registerFilter(type: FilterType, config: FilterConfig): void
}
```

## 4. API 端点映射

### 4.1 LinkMind 原生端点 → 项目服务方法

| LinkMind 端点                | 方法                    | 服务类             | 优先级    |
| ---------------------------- | ----------------------- | ------------------ | --------- |
| `POST /v1/chat/completions`  | `chat()`                | LinkMindAdapter    | P0        |
| `GET /v1/models`             | `listModels()`          | LinkMindAdapter    | P0        |
| `POST /v1/embeddings`        | `embed()`               | EmbeddingService   | P0        |
| `POST /v1/rerank`            | `rerank()`              | EmbeddingService   | P1        |
| `POST /doc/doc2ext`          | `extractDocument()`     | LinkMindService ✅ | P0 (已有) |
| `POST /ocr/doc2ocr`          | `performOCR()`          | LinkMindService ✅ | P0 (已有) |
| `POST /audio/speech2text`    | `speechToText()`        | MultimodalService  | P1        |
| `POST /audio/text2speech`    | `textToSpeech()`        | MultimodalService  | P1        |
| `POST /image/text2image`     | `textToImage()`         | MultimodalService  | P1        |
| `POST /sql/text2sql`         | `textToSQL()`           | LinkMindService ✅ | P0 (已有) |
| `POST /instruction/generate` | `generateInstruction()` | InstructionService | P2        |
| `POST /rag/query`            | `query()`               | RAGService         | P0        |
| `POST /rag/add_documents`    | `addDocuments()`        | RAGService         | P0        |
| `GET /mcp/tools`             | `listTools()`           | MCPBridgeService   | P1        |
| `POST /mcp/call_tool`        | `callTool()`            | MCPBridgeService   | P1        |
| `GET /stats/tokens`          | `getTokenStats()`       | GovernanceService  | P2        |
| `GET /cache/*`               | `getCache()`            | GovernanceService  | P2        |

## 5. 配置系统扩展

### 5.1 lagi.yml 对接方案

LinkMind 使用 `lagi.yml` 作为中心配置。项目需要新增：

```typescript
// packages/core/src/types/linkmind-routing-config.ts
export interface LinkMindRoutingConfig {
  models: {
    id: string
    provider: string // ollama/openai/azure/deepseek/qwen 等
    baseUrl?: string
    apiKey?: string
    capabilities: ModelCapability
    costPerToken?: number
    priority?: number
  }[]

  routers: {
    name: string
    rules: Array<{
      match: string // best() / pass()
      target: string // model id or router name
      condition?: string // 条件表达式
    }>
  }[]

  rag: {
    defaultProvider: 'chroma' | 'elasticsearch' | 'milvus' | 'pinecone' | 'sqlite'
    collections: Record<string, CollectionConfig>
  }

  mcp: {
    servers: Record<string, MCPServerConfig>
  }

  filters: {
    sensitiveWords?: string[]
    priorityWords?: string[]
    stopWords?: string[]
  }

  cache: {
    enabled: boolean
    ttl: number
    maxSize: number
  }
}
```

### 5.2 AI 配置面板扩展

在现有 `AIConfigPanel` 中新增：

- **LinkMind 连接配置**：服务器地址、API Key、传输模式
- **模型路由规则编辑器**：可视化 best()/pass() 规则配置
- **RAG 知识库管理**：集合创建/删除/统计
- **MCP 服务器管理**：连接/断开/工具浏览
- **Token 用量仪表盘**：实时成本追踪

## 6. 前端组件新增

### 6.1 新增组件清单

| 组件名                | 路径                       | 功能                    | 依赖              |
| --------------------- | -------------------------- | ----------------------- | ----------------- |
| `LinkMindConfigPanel` | `components/linkmind/`     | LinkMind 连接与路由配置 | LinkMindService   |
| `RAGKnowledgePanel`   | `components/rag/`          | 知识库管理与查询        | RAGService        |
| `VoiceStudioPanel`    | `components/voice-studio/` | ASR/TTS 录制与播放      | MultimodalService |
| `ImageGenPanel`       | `components/image-gen/`    | AI 图像生成             | MultimodalService |
| `TokenUsageDashboard` | `components/token-usage/`  | Token 统计与成本分析    | GovernanceService |
| `MCPToolBrowser`      | `components/mcp-browser/`  | MCP 工具浏览器与调用    | MCPBridgeService  |
| `RoutingRuleEditor`   | `components/routing/`      | 可视化路由规则编辑      | LinkMindAdapter   |

### 6.2 侧边栏入口扩展

在 Sidebar 中新增入口：

- 🧠 **知识库** → RAGKnowledgePanel
- 🎙️ **语音工作室** → VoiceStudioPanel
- 🎨 **AI绘图** → ImageGenPanel
- 📊 **用量分析** → TokenUsageDashboard
- 🔗 **MCP工具** → MCPToolBrowser（增强现有MCPPanel）
- ⚙️ **LinkMind配置** → LinkMindConfigPanel

## 7. 数据流设计

### 7.1 聊天请求流（含 LinkMind 路由）

```
用户输入消息
    ↓
useOllamaChat.sendMessage()
    ↓
MultiModelAdapterLayer.route(request)
    ↓
┌─────────────────────────────────────┐
│  复杂度分析 → selectModelType()     │
│  路由决策 → best()/pass() 规则匹配  │
│  ↓                                   │
│  ┌──────────┬──────────┬──────────┐ │
│  │ Ollama   │ OpenAI   │ LinkMind │ │ ← 新增
│  │ Adapter  │ Adapter  │ Adapter  │ │
│  └──────────┴──────────┴──────────┘ │
└─────────────────────────────────────┘
    ↓
LinkMindAdapter.chat() → POST /v1/chat/completions
    ↓
LinkMind Server (lagi.yml 路由到具体模型提供商)
    ↓
响应返回 → 流式渲染
```

### 7.2 RAG 增强对话流

```
用户提问
    ↓
[可选] RAG 检索 → RAGService.query(question)
    ↓
构建上下文: system + retrieved_docs + history
    ↓
发送到 LinkMind chat completions
    ↓
响应 + 引用来源展示
```

## 8. 后台代理扩展

### 8.1 Next.js API Routes 新增

```
packages/web/src/app/api/
├── linkmind/
│   ├── chat/route.ts          # 聊天代理（CSP绕过）
│   ├── models/route.ts        # 模型列表代理
│   ├── embeddings/route.ts    # 向量嵌入代理
│   ├── rag/
│   │   ├── query/route.ts     # RAG 查询代理
│   │   └── documents/route.ts # 文档管理代理
│   ├── multimodal/
│   │   ├── asr/route.ts       # 语音识别代理
│   │   ├── tts/route.ts       # 语音合成代理
│   │   └── image-gen/route.ts # 图像生成代理
│   ├── mcp/
│   │   ├── tools/route.ts     # MCP 工具列表代理
│   │   └── call/route.ts      # MCP 工具调用代理
│   └── stats/
│       └── tokens/route.ts    # Token 统计代理
└── ...
```

## 9. 错误处理与降级策略

### 9.1 分级降级

| 场景             | 降级策略                         |
| ---------------- | -------------------------------- |
| LinkMind 不可用  | 回退到本地 Ollama/OpenAI         |
| RAG 检索失败     | 直接发送原始问题（无增强）       |
| ASR/TTS 不可用   | 显示"功能暂不可用"，提供文本备选 |
| 图像生成超时     | 提示用户重试或切换模型           |
| MCP 工具调用失败 | 返回错误详情，建议检查连接       |

### 9.2 重试机制

- 网络错误：指数退避重试（最多3次）
- 超时错误：自动增加超时时间并重试一次
- 502/503/504：标记服务降级，切换备用通道

## 10. 安全考虑

- API Key 加密存储（localStorage + 可选加密）
- CSP 代理模式（默认通过 Next.js API Route 中转）
- 敏感内容过滤器集成
- Token 用量配额预警
- MCP 工具权限控制（白名单机制）
