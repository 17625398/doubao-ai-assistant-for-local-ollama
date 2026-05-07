# LinkMind 深度集成 - 验证清单

> **状态**: ✅ Phase 1~4 已通过验证 | **最后更新**: 2026-04-23

## 阶段一：核心适配器层验证 ✅

### 1.1 LinkMindAdapter 适配器

- [x] **编译检查**: `npx tsc --noEmit` 无类型错误 (Core 包 0 错误)
- [x] **接口实现**: 实现 `IModelAdapter` 所有必需方法
- [x] **单元测试**: chat() 方法正确调用 `/v1/chat/completions`
- [x] **单元测试**: chatStream() 正确解析 SSE 流
- [x] **单元测试**: listModels() 返回模型列表格式正确
- [x] **集成测试**: 通过 MultiModelAdapterLayer 路由到 LinkMind（含 registerAdapter）
- [x] **错误处理**: 连接失败时返回明确错误信息
- [x] **超时控制**: 可配置超时时间，超时后抛出 AbortError
- [x] **CSP 兼容**: 默认通过 API Route 代理，支持 direct 模式切换

### 1.2 LinkMindService 扩展

- [x] **embeddings 端点**: `embed()` 返回向量数组（维度正确）
- [x] **rerank 端点**: `rerank()` 返回相关性分数数组
- [x] **instruction 端点**: `generateInstruction()` 返回有效指令文本
- [x] **批量处理**: embed 支持一次最多文本（API 层限制 500 条）
- [x] **缓存机制**: cacheGet/Set() 方法已实现
- [x] **日志记录**: 所有请求/响应均有日志输出
- [x] **内容过滤**: checkContent() 敏感词检测方法

### 1.3 EmbeddingService

- [x] **向量化精度**: cosineSimilarity + euclideanDistance 实现
- [x] **批量性能**: batch embedding 支持 batchSize 配置
- [x] **缓存命中**: EmbeddingCache LRU 缓存，可配置 TTL
- [x] **模型切换**: 支持 bge-large, text-embedding-ada-002 等
- [x] **相似度工具**: findSimilar() 支持 topK/minScore 过滤

### 1.4 Next.js API 代理路由

- [x] **chat 代理**: POST /api/linkmind/chat 正确转发到 LinkMind（SSE 流式）
- [x] **models 代理**: GET /api/linkmind/models 返回模型列表（TTL=5min 缓存）
- [x] **embeddings 代理**: POST /api/linkmind/embeddings 返回向量
- [x] **CSP 绕过**: HTTPS 页面可正常调用 HTTP 后端
- [x] **错误透传**: LinkMind 错误码和消息完整传递给前端
- [x] **日志记录**: 代理层记录耗时、状态码

---

## 阶段二：RAG 知识库系统验证 ✅

### 2.1 RAGService 核心服务

- [x] **文档入库**: addDocuments() 成功将文档分块并存储
- [x] **语义检索**: query() 返回相关度排序的结果列表
- [x] **集合管理**: createCollection/dropCollection 操作成功
- [x] **统计信息**: getCollectionStats() 返回文档数/分块数/时间戳
- [x] **混合检索**: hybridQuery() 结合关键词+语义搜索
- [x] **空结果处理**: 无匹配结果时返回空数组而非报错
- [x] **Rerank**: 支持可选重排序提升结果质量
- [x] **InMemoryVectorStore**: 内置向量存储，无需外部数据库依赖

### 2.2 文档分块策略

- [x] **固定分块**: chunk_size=500, overlap=50 时切分正确
- [x] **语义分块**: 按段落边界切分，不拆断句子
- [x] **Markdown 分块**: 保留 # ## ### 层级结构作为 sectionPath 元数据
- [x] **元数据附加**: 每个chunk包含 source, heading, headingLevel, startIndex, endIndex
- [x] **三策略自动选择**: isMarkdown() → semanticChunk → fixedChunk
- [x] **Token 估算**: estimateTokens() 中英文混合估算

### 2.3 RAGKnowledgePanel 前端组件

- [x] **UI 渲染**: 面板正常显示，无 React 报错
- [x] **知识库列表**: 显示名称、文档数、更新时间
- [x] **上传功能**: 拖拽/点击上传文件，进度条显示（多文件批量）
- [x] **删除功能**: 删除文档后列表实时更新
- [x] **测试查询**: 输入问题后展示检索结果+相关度分数
- [x] **响应式布局**: 移动端/桌面端均正常显示
- [x] **三标签页**: 浏览 / 上传 / 智能检索
- [x] **Sidebar 入口**: 紫色高亮 + RAG 标签按钮

### 2.4 RAG 增强对话集成 ✅

- [x] **自动检索**: 发送消息时自动触发 RAG 检索 (useRAGChat hook)
- [x] **上下文注入**: 检索结果注入 system prompt 或 user message (autoInject)
- [x] **引用标注**: 返回结果含 chunkId/text/score/source 元数据
- [x] **开关控制**: 用户可关闭 RAG 增强 (toggleEnabled)
- [x] **状态提示**: isRetrieving 状态可绑定 UI 加载指示器
- [x] **降级处理**: RAG 服务不可用时返回 null，回退到普通对话
- [x] **取消检索**: AbortController 支持 cancelRetrieval()
- [x] **可配置参数**: topK / minScore / collectionName / autoInject

---

## 阶段三：多模态服务验证 ✅

### 3.1 MultimodalService

- [x] **ASR 识别**: speechToText() 将音频转为文字（FormData + JSON 双模式）
- [x] **TTS 合成**: textToSpeech() 返回可播放的音频 (base64/Blob/URL 三种输出)
- [x] **图像生成**: textToImage() 返回图片 URL 或 base64 (多模型支持)
- [x] **图像理解**: imageUnderstand() 正确描述图片内容 (multipart + dataURL)
- [x] **格式兼容**: 支持 wav/mp3/webm 音频格式
- [x] **参数校验**: 空 prompt/空 audio 时返回友好错误
- [x] **文件大小限制**: 音频 25MB / 图像 20MB 超限拦截
- [x] **视频分析**: analyzeVideo() 支持视频内容提取
- [x] **能力查询**: getCapabilities() 返回各模块可用状态

### 3.2 VoiceStudioPanel ✅

- [x] **录音功能**: 点击录音按钮开始/停止录制 (MediaRecorder API)
- [x] **波形显示**: 录音时实时显示音频波形动画 (20 条频谱柱)
- [x] **ASR 结果**: 录音结束后展示转写文字 + 发送到对话按钮
- [x] **TTS 播放**: 输入文字后可播放合成语音 (6 种音色/语速调节)
- [x] **历史记录**: ASR+TTS 各保存最近 20 条记录，点击可回填

### 3.3 ImageGenPanel ✅

- [x] **Prompt 输入**: 支持多行文本输入 (2000 字符上限)
- [x] **参数调节**: 尺寸(4 种)/模型(3 种)/数量(1~4) 选择器工作正常
- [x] **风格预设**: 8 种快速风格一键填充提示词前缀
- [x] **生成过程**: 显示双环旋转加载动画
- [x] **图片预览**: 生成完成后以网格形式展示 + 点击放大模态框
- [x] **下载功能**: 下载/复制/发送到对话三种操作
- [x] **历史记录**: 保存最近 20 次生成历史 (prompt + 图片缩略图)

---

## 阶段四：MCP 对接验证 ✅

### 4.1 MCPBridgeService ✅

- [x] **工具列举**: listTools() 返回所有可用 MCP 工具 (带缓存)
- [x] **工具调用**: callTool() 正确执行并返回结果 (并发限制 5 + 超时 30s)
- [x] **资源列举**: listResources() 返回 MCP 资源列表
- [x] **资源读取**: readResource(uri) 返回资源内容
- [x] **服务器管理**: addServer/removeServer 操作成功
- [x] **超时处理**: 工具调用超时后返回错误而非挂起 (AbortSignal.timeout)
- [x] **连接状态**: MCPConnection 跟踪 connected/error/connecting/disconnected 四态
- [x] **工具搜索**: searchTools(query) 按名称/描述模糊匹配

### 4.2 MCPToolBrowser ✅

- [x] **服务器仪表盘**: 显示连接状态(四色灯)和工具数量
- [x] **工具分类**: 按服务器分组显示工具 + 搜索过滤
- [x] **工具详情**: 点击查看参数 schema 和描述 → 自动渲染表单
- [x] **测试调用**: 填写参数后执行并展示 JSON 结果
- [x] **服务器添加**: 内嵌表单支持 stdio/SSE 类型配置
- [x] **三标签页布局**: 工具列表 / 服务器管理 / 调用执行

---

## 阶段五：治理与监控验证 ✅

### 5.1 GovernanceService ✅

- [x] **Token 统计**: getTokenStats('today') 返回今日用量 (支持 today/yesterday/week/month/all)
- [x] **缓存读写**: setCache/getCache 数据一致性验证 (LRU + TTL 自动清理)
- [x] **内容过滤**: checkContent() 检测敏感词并返回结果 (正则+关键词+PII)
- [x] **成本估算**: calculateCost() 返回合理成本数值 (按模型单价计算)
- [x] **每日配额**: getDailyRemaining() 返回已用/限额/百分比

### 5.2 TokenUsageDashboard ✅

- [x] **总览面板**: Token 总量/成本/请求数/平均延迟汇总卡片
- [x] **模型排行表**: 各模型使用量排序展示
- [x] **时间筛选**: 日/周/月切换数据正确
- [x] **每小时分布**: 柱状图显示 24 小时用量趋势
- [x] **缓存状态**: 命中率/条目数/大小统计面板
- [x] **过滤规则**: 规则列表 + 启用/禁用/新增操作
- [x] **配额预警**: 接近限额时显示警告提示

---

## 阶段六：Agent桥接验证 ✅

### 6.1 AgentBridgeService ✅

- [x] **Agent 注册**: registerAgent/unregisterAgent 正常工作
- [x] **Agent 执行**: execute/executeByName 返回结果 + Token 记录
- [x] **Agent 同步**: syncAgents 从远程拉取并更新本地列表
- [x] **状态跟踪**: idle/running/error/disabled 状态正确切换
- [x] **并发控制**: maxConcurrentExecutions 限制同时执行数
- [x] **超时保护**: executionTimeout 超时自动终止执行

### 6.2 Agent API 代理路由 ✅

- [x] **GET /agents**: 返回 Agent 列表 + 状态查询
- [x] **POST ?action=execute**: 执行指定 Agent 并返回结果
- [x] **POST ?action=register**: 注册新 Agent 配置
- [x] **POST ?action=sync**: 同步远程 Agent 列表到本地

---

## 阶段八：导航整合验证

### 8.1 Sidebar 扩展

- [ ] **新入口显示**: 6 个新入口图标和名称正确
- [ ] **点击导航**: 点击各入口打开对应面板
- [ ] **激活状态**: 当前打开的面板在侧边栏高亮
- [ ] **快捷键**: 各入口支持自定义快捷键
- [ ] **折叠状态**: 侧边栏折叠时仅显示图标

---

## 全局集成验证

### 编译与构建

- [ ] **TypeScript 编译**: `npx tsc --noEmit` 零错误
- [ ] **Vite 构建**: `npm run build` 成功
- [ ] **包体积**: 新增代码导致 bundle 增量 < 200KB (gzip)
- [ ] **Tree Shaking**: 未使用的 LinkMind 功能不打入 bundle

### 运行时验证

- [ ] **启动成功**: `npm run dev` 无报错启动
- [ ] **页面加载**: 首屏加载 < 3s (本地)
- [ ] **LinkMind 断连**: 服务器不可用时 UI 不崩溃，显示重连提示
- [ ] **并发请求**: 多个面板同时操作无竞态条件
- [ ] **内存泄漏**: 长时间运行内存稳定（DevTools Memory 监控 30min）

### 安全验证

- [ ] **API Key 存储**: 不以明文出现在 localStorage（可选加密）
- [ ] **CSP 策略**: 不引入新的 CSP 违规
- [ ] **XSS 防护**: 用户输入（prompt/配置）经过转义
- [ ] **权限控制**: MCP 工具调用需用户确认（危险操作）

### 性能基准

| 操作              | 目标    | 测量方法         |
| ----------------- | ------- | ---------------- |
| LinkMind 聊天首响 | < 2s    | DevTools Network |
| Embedding 100条   | < 3s    | Console.time     |
| RAG 检索          | < 500ms | Service 日志     |
| ASR 转写 10s 音频 | < 15s   | UI 计时器        |
| TTS 合成 100字    | < 3s    | UI 计时器        |
| 图像生成          | < 30s   | UI 进度条        |

### 兼容性验证

- [ ] **Chrome 120+**: 全功能正常
- [ ] **Firefox 120+**: 全功能正常
- [ ] **Edge 120+**: 全功能正常
- [ ] **Safari 17+**: 基础功能正常（已知限制）
- [ ] **移动端 Chrome**: 响应式布局正常

---

## 回归验证清单

### 已有功能不受影响

- [ ] Ollama 本地聊天正常
- [ ] OpenAI 兼容聊天正常
- [ ] PDF 解析正常（含 fallback 链）
- [ ] 图片上传解析正常（base64 方案）
- [ ] 追问问题生成正常
- [ ] 网页内容提取正常
- [ ] 主题切换正常
- [ ] 设置面板正常

### LinkMind 作为可选依赖

- [ ] **未安装 LinkMind**: 项目正常启动，LinkMind 相关功能隐藏
- [ ] **安装后启用**: 自动检测 LinkMind 服务器，显示相关功能
- [ ] **中途断连**: 优雅降级，不影响其他模型后端
