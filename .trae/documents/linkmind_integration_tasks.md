# LinkMind 深度集成 - 实施计划

> **状态**: ✅ Phase 1 & Phase 2 已完成 | **最后更新**: 2026-04-23

## 阶段一：核心适配器层（P0 - 基础设施） ✅ 全部完成

### Task 1.1: 创建 LinkMindAdapter 适配器 ✅

- **文件**: `packages/core/src/linkmind-adapter.ts`
- **依赖**: 无
- **输入**: [multi-model.ts 类型定义](file:///D:\Doubao\refactored\packages\core\src\types\multi-model.ts)
- **输出**: 实现 `IModelAdapter` 接口的 LinkMindAdapter 类
- **验收标准**:
  - [x] 实现 `chat()` 方法，调用 `/v1/chat/completions`
  - [x] 实现 `chatStream()` 方法，支持 SSE 流式响应
  - [x] 实现 `getModelInfo()` 返回模型能力信息
  - [x] 实现 `listModels()` 获取可用模型列表
  - [x] 实现 `isAvailable()` 连接检测
  - [x] 注册到 MultiModelAdapterLayer（含动态 registerAdapter/removeAdapter）

### Task 1.2: 扩展 LinkMindService 端点 ✅

- **文件**: `packages/core/src/services/linkmind-service.ts`
- **依赖**: Task 1.1
- **输入**: [现有 linkmind-service.ts](file:///D:\Doubao\refactored\packages\core\src\services\linkmind-service.ts)
- **输出**: 新增 embeddings、rerank、instruction 端点
- **验收标准**:
  - [x] 新增 `embed(texts: string[])` 方法 → `/v1/embeddings`
  - [x] 新增 `rerank(query: string, docs: string[])` 方法 → `/v1/rerank`
  - [x] 新增 `generateInstruction(prompt: string)` 方法 → `/instruction/generate`
  - [x] 统一错误处理和超时机制
  - [x] 支持流式和非流式两种模式
  - [x] 新增 `cacheGet/Set()` 缓存方法 + `checkContent()` 内容过滤

### Task 1.3: 创建 EmbeddingService 向量嵌入服务 ✅

- **文件**: `packages/core/src/services/embedding-service.ts`
- **依赖**: Task 1.2
- **输入**: LinkMind /v1/embeddings API 规范
- **输出**: 封装向量嵌入逻辑的服务类
- **验收标准**:
  - [x] 支持 batch embedding（批量文本向量化）
  - [x] 缓存已计算的向量（LRU Cache, 可配置 TTL）
  - [x] 支持多种模型切换（text-embedding-ada-002, bge-large 等）
  - [x] 提供相似度计算工具函数（cosine similarity + euclidean distance）
  - [x] `findSimilar()` 相似度检索（topK + minScore 过滤）

### Task 1.4: 创建 Next.js API 代理路由 ✅

- **文件**: `packages/web/src/app/api/linkmind/*.ts`
- **依赖**: Task 1.2
- **输入**: [现有 network-proxy.ts](file:///D:\Doubao\refactored\packages\core\src\utils\network-proxy.ts) 模式
- **输出**: 完整的 API Route 代理层
- **验收标准**:
  - [x] `/api/linkmind/chat/route.ts` - 聊天代理（SSE 流式转发）
  - [x] `/api/linkmind/models/route.ts` - 模型列表代理（TTL=5min 缓存）
  - [x] `/api/linkmind/embeddings/route.ts` - 向量嵌入代理（上限500条）
  - [x] 统一 CSP 绕过处理
  - [x] 错误码转换和日志记录

---

## 阶段二：RAG 知识库系统（P0 - 核心功能） ✅ 全部完成

### Task 2.1: 创建 RAGService 核心服务 ✅

- **文件**: `packages/core/src/services/rag-service.ts`
- **依赖**: Task 1.3 (EmbeddingService)
- **输入**: LinkMind RAG API + Chroma/Elasticsearch 协议
- **输出**: 完整的 RAG 服务实现
- **验收标准**:
  - [x] `addDocuments()` - 文档入库（分块+向量化）
  - [x] `query()` - 语义检索（query→embedding→similarity search）
  - [x] `createCollection()` / `dropCollection()` - 集合管理
  - [x] `listCollections()` - 列出所有知识库
  - [x] `getCollectionStats()` - 统计信息
  - [x] 支持混合检索（关键词+语义）
  - [x] 内置 InMemoryVectorStore（无需外部数据库）
  - [x] 支持 Rerank 重排序

### Task 2.2: 文档分块策略实现 ✅

- **文件**: `packages/core/src/utils/document-chunker.ts`
- **依赖**: Task 2.1
- **输入**: [现有 text-chunking-service.ts](file:///D:\Doubao\refactored\packages\core\src\services\text-chunking-service.ts)
- **输出**: 增强的文档分块器
- **验收标准**:
  - [x] 固定长度分块（可配置 chunk_size, overlap）
  - [x] 语义分块（按段落/章节边界切分）
  - [x] Markdown 感知分块（保留标题层级结构 + sectionPath）
  - [x] 元数据附加（来源页码、标题、headingLevel）
  - [x] 三策略自动选择（Markdown → semantic → fixed）

### Task 2.3: 创建 RAGKnowledgePanel 前端组件 ✅

- **文件**: `packages/web/src/components/rag/RAGKnowledgePanel.tsx`
- **依赖**: Task 2.1
- **输入**: [现有 SkillLibrary.tsx](file:///D:\Doubao\refactored\packages\web\src\components\SkillLibrary.tsx) 样式参考
- **输出**: 知识库管理 UI
- **验收标准**:
  - [x] 知识库列表展示（名称、文档数、创建时间）
  - [x] 上传文档到知识库（拖拽支持 + 多文件批量上传）
  - [x] 删除文档/清空知识库
  - [x] 测试查询界面（输入问题→显示检索结果 + 相关度评分）
  - [x] 知识库统计面板
  - [x] 三标签页布局：浏览 / 上传 / 智能检索
  - [x] 已集成到 Sidebar 入口 + page.tsx 面板状态管理

### Task 2.4: RAG 增强对话集成 ✅

- **文件**: `packages/web/src/hooks/useRAGChat.ts` (新建)
- **依赖**: Task 2.1 + Task 2.3
- **输入**: [现有 useOllamaChat.ts](file:///D:\Doubao\refactored\packages\web\src\hooks\useOllamaChat.ts)
- **输出**: RAG 增强的聊天 Hook
- **验收标准**:
  - [x] 发送消息前自动执行 RAG 检索
  - [x] 检索结果注入到 system prompt 或 context
  - [x] 引用来源在响应中标注
  - [x] 可开关 RAG 增强（用户控制）
  - [x] 检索过程状态提示（"正在搜索知识库..."）
  - [x] 支持 AbortController 取消检索
  - [x] 可配置 topK / minScore / autoInject

---

## 阶段三：多模态服务扩展（P1 - 增强体验） ✅

### Task 3.1: 创建 MultimodalService 多模态服务 ✅

- **文件**: `packages/core/src/services/multimodal-service.ts`
- **依赖**: Task 1.2
- **输入**: LinkMind 多模态端点规范
- **输出**: ASR/TTS/图像生成/视觉理解服务
- **验收标准**:
  - [x] `speechToText(audio)` → `/audio/speech2text` (FormData + JSON 双模式)
  - [x] `textToSpeech(text)` → `/audio/text2speech` (6 种音色, 语速调节, base64/Blob 输出)
  - [x] `textToImage(prompt)` → `/image/text2image` (多模型/尺寸/负提示词)
  - [x] `imageUnderstand(image, prompt)` → 图像理解 (multipart + dataURL 支持)
  - [x] 音频格式转换与兼容性处理 (wav/mp3/webm)
  - [x] `analyzeVideo()` 视频分析支持
  - [x] 文件大小校验 (音频25MB / 图像20MB 上限)

### Task 3.2: VoiceStudioPanel 语音工作室 ✅

- **文件**: `packages/web/src/components/voice-studio/VoiceStudioPanel.tsx`
- **依赖**: Task 3.1
- **输入**: [现有 voice-chat 组件](file:///D:\Doubao\refactored\packages\web\src\components\voice-chat)
- **输出**: 专业语音交互面板
- **验收标准**:
  - [x] 录音按钮 + 实时波形动画 (20 条频谱柱)
  - [x] ASR 转文字结果展示 + 发送到对话按钮
  - [x] TTS 语音合成播放（6 种音色 / 0.25x~4x 语速）
  - [x] 音频历史记录 (ASR+TTS 各保留最近 20 条)
  - [x] 导出音频文件 (浏览器原生 audio 播放器)
  - [x] ASR/TTS 双标签页布局

### Task 3.3: ImageGenPanel AI绘图面板 ✅

- **文件**: `packages/web/src/components/image-gen/ImageGenPanel.tsx`
- **依赖**: Task 3.1
- **输入**: LinkMind image generation API
- **输出**: AI 图像生成 UI
- **验收标准**:
  - [x] Prompt 输入框 + 参数调节（尺寸/风格/数量）
  - [x] 8 种快速风格预设 (写实/动漫/油画/水彩/赛博朋克等)
  - [x] 生成进度指示 (双环旋转动画)
  - [x] 图片预览画廊（网格布局 + 点击放大）
  - [x] 图片下载/复制/发送到对话
  - [x] 生成历史记录 (最近 20 次)
  - [x] 负面提示词 + DALL-E/StableDiffusion 多模型选择

---

## 阶段四：MCP 深度对接（P1 - 工具生态） ✅

### Task 4.1: 创建 MCPBridgeService MCP桥接服务 ✅

- **文件**: `packages/core/src/services/mcp-bridge-service.ts`
- **依赖**: Task 1.2
- **输入**: [现有 MCPPanel.tsx](file:///D:\Doubao\refactored\packages\web\src\components\MCPPanel.tsx) + LinkMind MCP API
- **输出**: 通过 LinkMind 网关访问 MCP 工具
- **验收标准**:
  - [x] `listTools(serverId?)` - 列出 MCP 工具 (带缓存)
  - [x] `callTool(name, args)` - 调用 MCP 工具 (并发限制 + 超时控制)
  - [x] `listResources()` - 列出 MCP 资源
  - [x] `readResource(uri)` - 读取资源内容
  - [x] `addServer(config)` / `removeServer(id)` - 服务器管理
  - [x] 连接状态跟踪 (MCPConnection 类: connected/error/connecting/disconnected)
  - [x] 工具搜索 (`searchTools(query)`)
  - [x] 能力查询 (`getCapabilities()`)

### Task 4.2: MCPToolBrowser 工具浏览器 ✅

- **文件**: `packages/web/src/components/mcp/MCPToolBrowser.tsx`
- **依赖**: Task 4.1
- **输入**: 增强 [MCPPanel](file:///D:\Doubao\refactored\packages\web\src\components\MCPPanel.tsx)
- **输出**: 功能完整的 MCP 工具浏览器
- **验收标准**:
  - [x] MCP 服务器连接状态仪表盘 (绿/黄/红/灰 四色指示灯)
  - [x] 工具分类浏览（按服务器分组 + 搜索过滤）
  - [x] 工具详情查看（参数说明、schema 自动渲染表单）
  - [x] 工具测试调用面板（参数填写+执行+结果 JSON 展示）
  - [x] 服务器添加 (stdio/SSE 类型) 内嵌表单
  - [x] 三标签页：工具列表 / 服务器管理 / 调用执行

---

## 阶段五：治理与监控（P2 - 企业特性） ✅ 已完成

### Task 5.1: 创建 GovernanceService 治理服务 ✅

- **文件**: `packages/core/src/services/governance-service.ts`
- **依赖**: Task 1.2
- **输入**: LinkMind stats/cache/filter API
- **输出**: Token 统计、缓存管理、内容过滤
- **验收标准**:
  - [x] `getTokenStats(period)` - Token 用量统计 (today/yesterday/week/month/all)
  - [x] `getCache(key)` / `setCache(key, value, ttl)` - Medusa 缓存 (LRU + TTL)
  - [x] `checkContent(content)` - 内容过滤检查 (正则/关键词/PII)
  - [x] 成本估算模型 (calculateCost)
  - [x] 每日配额追踪 (getDailyRemaining)

### Task 5.2: TokenUsageDashboard 用量仪表盘 ✅

- **文件**: `packages/web/src/components/governance/TokenUsageDashboard.tsx`
- **依赖**: Task 5.1
- **输入**: Governance API
- **输出**: 可视化用量分析面板
- **验收标准**:
  - [x] 今日/本周/本月 Token 用量图表 (四标签页切换)
  - [x] 各模型使用占比排行表
  - [x] 每小时用量分布柱状图
  - [x] 配额预警提示 (每日剩余额度)
  - [x] 缓存状态面板 (命中率/条目数/大小)
  - [x] 过滤规则管理 (启用/禁用/新增)

---

## 阶段六：Agent桥接与路由（P1-P2） ✅ 已完成

### Task 6.1: 创建 AgentBridgeService Agent桥接服务 ✅

- **文件**: `packages/core/src/services/agent-bridge-service.ts`
- **依赖**: Task 1.2
- **输入**: LinkMind agents endpoint
- **输出**: Agent 注册/执行/同步/状态跟踪
- **验收标准**:
  - [x] Agent 注册与注销 (registerAgent/unregisterAgent)
  - [x] Agent 执行 (execute/executeByName) + Token 记录
  - [x] Agent 同步 (syncAgents from OpenClaw/Hermes/DeerFlow)
  - [x] 状态跟踪 (idle/running/error/disabled)
  - [x] 并发执行控制 (maxConcurrentExecutions)
  - [x] 超时保护 (executionTimeout)

### Task 6.2: Agent API 代理路由 ✅

- **文件**: `packages/web/src/app/api/linkmind/agents/route.ts`
- **依赖**: Task 6.1
- **输出**: Agent CRUD + 执行 + 同步 API
- **验收标准**:
  - [x] GET /api/linkmind/agents - 列表 + 状态查询
  - [x] POST /api/linkmind/agents?action=execute - 执行 Agent
  - [x] POST /api/linkmind/agents?action=register - 注册 Agent
  - [x] POST /api/linkmind/agents?action=sync - 同步 Agent 列表

---

## 阶段七：Agent 运行时桥接（P2 - 高级集成）

### Task 7.1: 创建 AgentBridgeService Agent桥接服务

- **文件**: `packages/core/src/services/agent-bridge-service.ts`
- **依赖**: Task 1.1
- **输入**: OpenClaw/Hermes/DeerFlow 配置格式
- **输出**: Agent 运行时配置同步服务
- **验收标准**:
  - [ ] `syncFromOpenClaw()` - 从 OpenClaw 导入模型配置
  - [ ] `pushToOpenClaw()` - 推送配置到 OpenClaw
  - [ ] `importHermesConfig()` / `exportHermesConfig()` - Hermes 同步
  - [ ] `importDeerFlowConfig()` / `exportDeerFlowConfig()` - DeerFlow 同步
  - [ ] 配置差异对比与合并策略

---

## 阶段八：侧边栏与导航整合（P1 - 用户体验）

### Task 8.1: Sidebar 入口扩展

- **文件**: `packages/web/src/components/Sidebar.tsx`
- **依赖**: Task 2.3, 3.2, 3.3, 4.2, 5.2, 6.2
- **输入**: [现有 Sidebar](file:///D:\Doubao\refactored\packages\web\src\components\Sidebar.tsx)
- **输出**: 更新后的侧边栏导航
- **验收标准**:
  - [ ] 🧠 知识库入口 → RAGKnowledgePanel
  - [ ] 🎙️ 语音工作室入口 → VoiceStudioPanel
  - [ ] 🎨 AI绘图入口 → ImageGenPanel
  - [ ] 📊 用量分析入口 → TokenUsageDashboard
  - [ ] 🔗 MCP工具入口 → MCPToolBrowser（增强版）
  - [ ] ⚙️ LinkMind配置入口 → LinkMindConfigPanel
  - [ ] 图标 + 名称 + 快捷键支持

---

## 任务依赖关系图

```
Task 1.1 (LinkMindAdapter)
    ↓
Task 1.2 (扩展LinkMindService) ──→ Task 1.4 (API代理路由)
    ↓
Task 1.3 (EmbeddingService)
    ↓
Task 2.1 (RAGService) ──→ Task 2.2 (文档分块)
    ↓                        ↓
Task 2.3 (RAGPanel)     Task 2.4 (RAG增强对话)

Task 3.1 (MultimodalService)
    ↓
Task 3.2 (VoiceStudio) + Task 3.3 (ImageGen)

Task 4.1 (MCPBridgeService)
    ↓
Task 4.2 (MCPToolBrowser)

Task 5.1 (GovernanceService)
    ↓
Task 5.2 (TokenDashboard)

Task 6.1 (RoutingRuleEditor) + Task 6.2 (ConfigPanel)

Task 7.1 (AgentBridge)

Task 8.1 (Sidebar整合) ← 依赖以上所有UI组件
```

## 推荐实施顺序

| 批次        | 任务                  | 预期产出                        | 里程碑          |
| ----------- | --------------------- | ------------------------------- | --------------- |
| **Batch 1** | 1.1 → 1.2 → 1.3 → 1.4 | LinkMind 作为第三种模型后端可用 | ✅ 基础连通     |
| **Batch 2** | 2.1 → 2.2 → 2.3 → 2.4 | RAG 知识库完整可用              | 📚 知识库上线   |
| **Batch 3** | 3.1 → 3.2 → 3.3       | 多模态能力就绪                  | 🎤🎨 多模态就绪 |
| **Batch 4** | 4.1 → 4.2             | MCP 深度集成完成                | 🔧 工具生态打通 |
| **Batch 5** | 6.1 → 6.2 → 8.1       | 配置管理与导航整合              | ⚙️ 配置体系完善 |
| **Batch 6** | 5.1 → 5.2 + 7.1       | 治理与Agent桥接                 | 📊🤖 企业级特性 |
