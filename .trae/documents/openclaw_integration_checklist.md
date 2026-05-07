# OpenClaw 深度集成验证清单

> **基于**: [openclaw_integration_spec.md](./openclaw_integration_spec.md) + [openclaw_integration_tasks.md](./openclaw_integration_tasks.md)
> **用途**: 逐项验证每个模块的实现正确性和完整性

---

## 阶段 A: 基础桥接层验证

### A1: 类型定义 (openclaw-types.ts)

- [ ] `OpenClawGatewayConfig` — host/port/wsPort/apiKey/timeout/reconnect/maxRetries 完整
- [ ] `GatewayStatus` — connected/version/uptime/channels/agents/activeSessions/lastHeartbeat
- [ ] `OpenClawAgentConfig` — id/name/workspace/model/systemPrompt/soulMd/tools/skills/sandbox/channels/enabled
- [ ] `OpenClawSession` — id/agentId/channelId/peerId/createdAt/updatedAt/messageCount/tokenUsage/status/metadata
- [ ] `AgentExecutionOptions` — stream/thinking/verbose/trace/usage/toolCall/context
- [ ] `OpenClawChannelType` — 25+ 通道类型联合枚举完整
- [ ] `OpenClawChannelConfig` — id/type/name/enabled/dmPolicy/allowFrom/agentId/config/status/lastActivity/messageCount
- [ ] `OpenClawInboundMessage` — id/channel/channelId/sender/content/attachments/timestamp/type/context/rawPayload
- [ ] `OpenClawOutboundMessage` — to/channel/content/attachments/replyToId/options
- [ ] `OpenClawSkill` — id/name/description/version/category/author/source/keywords/tools/agents/scripts/metadata/enabled
- [ ] `SkillToolDefinition` — name/description/parameters/handlerRef/requiresAuth/rateLimit
- [ ] `SkillExecutionRequest` / `SkillExecutionResult` — 执行请求和结果类型
- [ ] `OpenClawToolDefinition` — id/name/category/description/parameters/requiresSandbox/dangerous/rateLimit
- [ ] `DMPairingPolicy` — mode/autoApprove/codeLength/codeTTL
- [ ] `SandboxPolicy` — mode/defaultAllow/defaultDeny/perAgent/resourceLimits
- [ ] `AccessControlEntry` — id/channelId/peerId/role/permissions/grantedAt/grantedBy/expiresAt/reason
- [ ] `VoiceWakeConfig` / `TalkModeConfig` — 语音配置类型

### A2: GatewayBridge 服务

- [ ] **连接生命周期**: connect() 成功建立连接并返回 GatewayStatus
- [ ] **断开连接**: disconnect() 清理资源并关闭 WS
- [ ] **健康检查**: healthCheck() 返回正确的健康状态
- [ ] **状态获取**: getStatus() 返回完整的网关状态信息
- [ ] **HTTP 代理**: request<T>() 支持 GET/POST/PUT/DELETE 并返回正确类型
- [ ] **流式代理**: stream() 返回 AsyncGenerator<StreamChunk>
- [ ] **WS 事件**: message/session/tool/channel/error 四类事件正常触发
- [ ] **自动重连**: 连接断开后自动重试（可配置 maxRetries）
- [ ] **心跳检测**: 定期发送心跳包，超时判定离线
- [ ] **请求超时**: 超时后抛出错误而非无限等待

### A3: Gateway API 路由

- [ ] GET `/api/openclaw/gateway/status` → { success: true, ...status }
- [ ] GET `/api/openclaw/gateway/health` → { success: true, healthy: bool }
- [ ] GET `/api/openclaw/gateway/config` → { success: true, config: {...} }
- [ ] PUT `/api/openclaw/gateway/config` → { success: true }
- [ ] 错误响应格式统一 { success: false, error: string }

---

## 阶段 B: Agent 管理验证

### B1: AgentManager 服务

- [ ] **注册 Agent**: registerAgent(config) 返回 agentId，agents Map 中存在
- [ ] **注销 Agent**: unregisterAgent(id) 从 Map 中移除
- [ ] **更新 Agent**: updateAgent(id, updates) 合并更新字段
- [ ] **查询 Agent**: getAgent(id) 返回完整配置或 null
- [ ] **列表 Agents**: listAgents(filters) 支持过滤
- [ ] **启用/禁用**: enableAgent/disableAgent 切换 enabled 状态
- [ ] **创建会话**: createSession(agentId) 返回新 Session 对象
- [ ] **查询会话**: getSession(id) 返回会话详情或 null
- [ ] **会话列表**: listSessions(agentId?) 支持按 agent 过滤
- [ ] **发送消息**: sendMessage(sessionId, msg) 返回 AgentResponse
- [ ] **流式消息**: streamMessage(sessionId, msg) 返回 AsyncGenerator
- [ ] **重置会话**: resetSession(id) 清空消息历史
- [ ] **压缩会话**: compactSession(id) 压缩上下文
- [ ] **归档会话**: archiveSession(id) 标记为 archived
- [ ] **删除会话**: deleteSession(id) 从 Map 移除
- [ ] **工作区文件**: getWorkspaceFiles/updateWorkspaceFile/readWorkspaceFile 正常
- [ ] **路由规则**: setRoutingRule/getRoutingRules 存取路由表
- [ ] **消息路由**: routeMessage(channelId, peerId, msg) 返回 RouteDecision
- [ ] **Token 记录**: 每次 Agent 执行自动记录到 GovernanceService

### B2: Agent API 路由

- [ ] GET `/api/openclaw/agents` → { success: true, agents: [...] }
- [ ] POST `/api/openclaw/agents` → { success: true, id: string }
- [ ] GET `/api/openclaw/agents/:id` → { success: true, agent: {...} }
- [ ] PUT `/api/openclaw/agents/:id` → { success: true }
- [ ] DELETE `/api/openclaw/agents/:id` → { success: true }
- [ ] POST `/api/openclaw/agents/:id/chat` → { success: true, output: string } (支持 ?stream=true)
- [ ] GET `/api/openclaw/agents/:id/sessions` → { success: true, sessions: [...] }
- [ ] POST `/api/openclaw/agents/:id/sessions` → { success: true, session: {...} }

### B3: AgentBridgeService 增强

- [ ] AgentBridgeService 可选委托给 OpenClawAgentManager
- [ ] 现有调用方代码无需修改即可工作
- [ ] syncAgents() 支持从 OpenClaw Gateway 同步 Agent 列表
- [ ] 向后兼容：无 OpenClaw 时降级为本地模式

---

## 阶段 C: 通道桥接验证

### C1: ChannelBridge 服务

- [ ] **添加通道**: addChannel(config) 返回 channelId
- [ ] **移除通道**: removeChannel(id) 从 Map 移除
- [ ] **更新通道**: updateChannel(id, updates) 合并更新
- [ ] **查询通道**: getChannel(id) 返回配置或 null
- [ ] **通道列表**: listChannels() 返回所有通道
- [ ] **启用/禁用**: enableChannel/disableChannel 切换状态
- [ ] **连接测试**: testConnection(id) 返回 ConnectionTestResult
- [ ] **发消息**: sendMessage(msg) 返回 MessageSendResult
- [ ] **输入指示器**: sendTypingIndicator 正常
- [ ] **表情反应**: sendReaction 正常
- [ ] **DM 配对 - 生成码**: generatePairingCode 返回 code + TTL
- [ ] **DM 配对 - 批准**: approvePairing 将 peer 加入 allowlist
- [ ] **DM 配对 - 拒绝**: rejectPairing 移除待审批记录
- [ ] **DM 配对 - 待审列表**: listPendingCodes 返回待审批列表
- [ ] **DM 配对 - 已允许**: listAllowedPeers 返回已允许的 peer 列表
- [ ] **入站消息事件**: message:inbound 事件包含完整 OpenClawInboundMessage
- [ ] **出站消息事件**: message:outbound 事件包含 OpenClawOutboundMessage
- [ ] **通道状态事件**: channel:status 事件包含最新状态
- [ ] **配对请求事件**: pairing:request 事件包含配对请求信息

### C2: Channel API 路由

- [ ] GET/POST `/api/openclaw/channels` → 列表/添加
- [ ] PUT/DELETE `/api/openclaw/channels/:id` → 更新/删除
- [ ] POST `/api/openclaw/channels/:id/test` → { success: true, connected: bool, latency: number }
- [ ] POST `/api/openclaw/channels/:id/message` → { success: true, messageId: string }
- [ ] GET `/api/openclaw/channels/:id/pairings` → { pending: [...], allowed: [...] }
- [ ] POST `/api/openclaw/channels/:id/pairings/:code/approve` → { success: true }

### C3: 通道适配器

- [ ] **WebChat 适配器**: 支持内嵌聊天组件或自定义渲染
- [ ] **微信适配器**: 文本/图片/文件消息收发正常
- [ ] **QQ 适配器**: At 消息/CQ 码解析正常
- [ ] 每个适配器有独立的 validateConfig() 方法
- [ ] 适配器连接/断开生命周期正确

### C4: ChannelPanel UI

- [ ] 通道列表展示 (名称/类型/状态图标/DM策略/消息数)
- [ ] 添加通道弹窗 (类型下拉选择 + 动态配置表单)
- [ ] 编辑通道配置弹窗
- [ ] 测试连接按钮 → 显示结果 (延迟/成功失败)
- [ ] 启用/禁用开关
- [ ] 待审批配对子面板 (code + 来源 + 批准/拒绝按钮)

---

## 阶段 D: 技能系统验证

### D1: SkillService 服务

- [ ] **技能发现**: discoverSkills('builtin') 返回内置技能列表
- [ ] **安装技能**: installSkill(idOrUrl) 下载并注册技能
- [ ] **卸载技能**: uninstallSkill(id) 移除技能及工具处理器
- [ ] **更新技能**: updateSkill(id) 拉取最新版本
- [ ] **查询单个**: getSkill(id) 返回技能详情或 null
- [ ] **查询列表**: listSkills(filter) 支持分类/来源/关键词过滤
- [ ] **搜索**: searchSkills(query) 模糊匹配名称/描述/关键词
- [ ] **启用/禁用**: enableSkill/disableSkill 切换状态
- [ ] **同步执行**: execute(request) 返回 SkillExecutionResult
- [ ] **流式执行**: executeStream(request) 返回 AsyncGenerator<SkillStreamEvent>
- [ ] **工具注册**: registerToolHandler(name, handler) 注册自定义工具处理
- [ ] **工具注销**: unregisterToolHandler(name) 移除处理器
- [ ] **ClawHub 搜索**: searchClawHub(query) 返回 ClawHub 技能列表
- [ ] **ClawHub 安装**: installFromClawHub(skillId) 从市场安装
- [ ] **依赖解析**: resolveDependencies(id) 分析并返回依赖树
- [ ] **健康检查**: checkSkillHealth(id) 返回技能运行状态报告

### D2: Skill API 路由

- [ ] GET `/api/openclaw/skills?category=&source=` → { skills: [...] }
- [ ] POST `/api/openclaw/skills/install` → { skill: {...} }
- [ ] DELETE `/api/openclaw/skills/:id` → { success: true }
- [ ] POST `/api/openclaw/skills/:id/execute` → { result: {...} }
- [ ] GET `/api/openclaw/skills/clawhub?q=xxx` → { results: [...] }

### D3: 内置技能集

- [ ] chat 技能: SKILL.md 定义完整 + 工具参数 Schema 正确
- [ ] web-search 技能: 支持多搜索引擎切换
- [ ] git-ops 技能: commit/pull/push/branch 操作可用
- [ ] npm-ops 技能: install/build/publish 操作可用
- [ ] file-manager 技能: 文件读写搜索操作可用
- [ ] image-gen 技能: 与现有 ImageGen 集成
- [ ] tts/asr 技能: 与现有 MultimodalService 集成
- [ ] webhook-trigger 技能: HTTP POST 触发可用
- [ ] data-query 技能: SQL/NoSQL 查询接口
- [ ] secret-scan 技能: 正则匹配敏感模式
- [ ] 每个技能可独立 enable/disable
- [ ] 技能间可组合调用 (如 web-search + file-manager)

### D4: SkillPanel + SkillEditor UI

- [ ] 技能列表表格 (名称/分类/版本/来源/状态/操作)
- [ ] ClawHub 搜索框 + 结果列表 + 一键安装按钮
- [ ] 上传 SKILL.md 文件功能
- [ ] 技能详情面板 (描述/工具列表/参数 Schema/脚本)
- [ ] SkillEditor: YAML frontmatter 表单编辑
- [ ] SkillEditor: Markdown 描述编辑区
- [ ] SkillEditor: 工具参数 Schema 编辑器
- [ ] 测试面板: 选择工具 → 填写参数 → 执行 → 显示结果

---

## 阶段 E: 工具桥接验证

### E1: ToolBridge 服务

- [ ] **工具列表**: listTools() 返回所有可用工具定义
- [ ] **单个查询**: getTool(id) 返回工具定义或 null
- [ ] **浏览器导航**: browserNavigate(url) 打开页面
- [ ] **浏览器截图**: browserScreenshot(options?) 返回图片 Buffer
- [ ] **浏览器操作**: browserAction(action) 支持 click/type/extract/evaluate/wait
- [ ] **Canvas 创建**: canvasCreate(type) 返回 CanvasHandle
- [ ] **Canvas 渲染**: canvasRender(id, data) 渲染数据
- [ ] **Canvas 导出**: canvasExport(id, format) 导出 PNG/SVG/JSON
- [ ] **Cron 创建**: cronCreate(schedule, action) 创建定时任务
- [ ] **Cron 列表**: cronList() 返回所有任务
- [ ] **Cron 启停**: cronEnable/cronDisable 控制任务
- [ ] **Cron 执行**: cronRun(jobId) 立即执行一次
- [ ] **Cron 历史**: cronHistory(jobId) 运行历史
- [ ] **会话列表**: sessionList(agentId?) 返回会话摘要
- [ ] **会话发送**: sessionSend(id, msg) 发送消息到会话
- [ ] **会话生成**: sessionSpawn(agentId, msg) 生成新会话并发送
- [ ] **通用调用**: callTool(toolId, params) 统一调用入口
- [ ] **流式调用**: callToolStream(toolId, params) 流式输出
- [ ] **沙箱支持**: 危险工具在沙箱中执行

### E2: Tool + Cron API 路由

- [ ] GET `/api/openclaw/tools` → { tools: [...] }
- [ ] POST `/api/openclaw/tools/:id/call` → { result: {...} }
- [ ] GET/POST/DELETE `/api/openclaw/cron` → 任务 CRUD
- [ ] POST `/api/openclaw/cron/:id/run` → { runId, status, output }

### E3: CronDashboard UI

- [ ] Cron 任务列表 (名称/Cron表达式/上次运行时间/下次运行时间/状态)
- [ ] 新建任务向导 (名称/调度表达式选择器/目标Agent/动作选择/参数填写)
- [ ] 启用/禁用/删除/立即执行 按钮
- [ ] 运行历史面板 (时间戳/耗时/成功失败/输出摘要)
- [ ] Cron 表达式可视化编辑器 (日历/预览下次运行)

---

## 阶段 F: 配置与安全验证

### F1: ConfigSync 服务

- [ ] **获取配置**: fetchConfig() 返回完整 openclaw.json 内容
- [ ] **分段获取**: getConfigSection('agent') 只返回 agent 段
- [ ] **模型配置**: getModelConfig() 返回 model/thinking/verbose 等
- [ ] **通道配置**: getChannelConfigs() 返回所有通道配置
- [ ] **Agent 配置**: getAgentConfigs() 返回所有 Agent 配置
- [ ] **沙箱配置**: getSandboxConfig() 返回沙箱策略
- [ ] **安全配置**: getSecurityConfig() 返回安全策略
- [ ] **更新配置**: updateConfig(updates) 合并更新
- [ ] **分段更新**: updateSection('agent', value) 更新指定段
- [ ] **设置模型**: setModel(model) 快捷方法
- [ ] **设置思考等级**: setThinking(level) 快捷方法
- [ ] **验证配置**: validateConfig(config) 返回 ValidationResult (errors/warnings)
- [ ] **验证段落**: validateSection('channels', value) 局部验证
- [ ] **推送到本地**: pushToLocal(path?) 写入文件系统
- [ ] **从本地拉取**: pullFromFile(path?) 读取文件系统
- [ ] **监听变更**: watchChanges(callback) 配置变更回调
- [ ] **停止监听**: unwatchChanges() 移除监听器
- [ ] **导出 JSON**: exportConfig('json') 返回 JSON 字符串
- [ ] **导出 YAML**: exportConfig('yaml') 返回 YAML 字符串
- [ ] **导入配置**: importConfig(content, format) 解析并应用
- [ ] **创建快照**: createSnapshot(label?) 保存当前配置快照
- [ ] **列出快照**: listSnapshots() 返回快照列表
- [ ] **恢复快照**: restoreSnapshot(id) 回滚到指定快照

### F2: SecurityService 服务

- [ ] **设置 DM 策略**: setDMPolicy(channelId, policy) 应用策略
- [ ] **获取 DM 策略**: getDMPolicy(channelId) 返回当前策略
- [ ] **生成配对码**: generatePairingCode(channelId) 返回 code + TTL
- [ ] **批准配对**: approvePairing(code, approver?) 添加到 allowlist
- [ ] **拒绝配对**: rejectPairing(code) 移除待审批
- [ ] **待审列表**: listPendingCodes(channelId) 返回待审批码列表
- [ ] **授权访问**: grantAccess(entry) 添加 ACL 条目
- [ ] **撤销访问**: revokeAccess(entryId) 移除 ACL 条目
- [ ] **检查权限**: checkAccess(channelId, peerId, permission) 返回 AccessDecision
- [ ] **ACL 列表**: listEntries(channelId?) 返回 ACL 列表
- [ ] **设置沙箱**: setSandboxPolicy(policy) 应用全局沙箱策略
- [ ] **获取沙箱**: getSandboxPolicy() 返回当前策略
- [ ] **Agent 沙箱**: setAgentSandbox(agentId, config) 设置 per-agent 沙箱
- [ ] **沙箱检查**: isToolAllowedInSandbox(toolId, agentId) 判断是否允许
- [ ] **内容扫描**: scanContent(content) 返回 SecurityScanResult (融合 GovernanceService.checkContent)
- [ ] **屏蔽内容**: blockContent(pattern, reason) 添加屏蔽规则
- [ ] **解除屏蔽**: unblockContent(pattern) 移除屏蔽规则
- [ ] **屏蔽列表**: listBlockedPatterns() 返回当前屏蔽规则
- [ ] **审计日志**: logAuditEvent(event) 记录审计事件
- [ ] **日志查询**: queryAuditLogs(filters) 支持时间/类型/用户过滤
- [ ] **日志导出**: exportAuditLogs(format, filters) 导出 CSV/JSON

### F3: ConfigEditor + SecurityDashboard UI

- [ ] **ConfigEditor**:
  - [ ] 模型选择下拉框 (从远程拉取模型列表)
  - [ ] 思考等级选择 (off/low/medium/high)
  - [ ] 网关端口输入框
  - [ ] WS 端口输入框
  - [ ] API Key 输入框 (密码模式)
  - [ ] 测试连接按钮 + 状态指示 (🟢在线 / 🔴离线)
  - [ ] 保存配置按钮
  - [ ] 导出 YAML 按钮
  - [ ] 导入配置文件上传
  - [ ] 恢复默认按钮
  - [ ] 快照管理子面板 (列表/创建/恢复)
- [ ] **SecurityDashboard**:
  - [ ] DM 策略全局设置 (pairing/open/closed 下拉)
  - [ ] 沙箱模式设置 (none/docker/ssh/openshell 下拉)
  - [ ] Per-Agent 沙箱配置表
  - [ ] 待审批配对列表 (通道/Peer/Code/时间/批准/拒绝)
  - [ ] 已允许 Peer 列表
  - [ ] 审计日志查询面板 (时间范围/事件类型/关键字)
  - [ ] 审计日志导出按钮

---

## 阶段 G: 语音增强验证

### G1: VoiceService 服务

- [ ] **唤醒词配置**: configureWake(config) 应用配置
- [ ] **开始监听**: startWakeListening() 启动麦克风监听
- [ ] **停止监听**: stopWakeListening() 释放麦克风
- [ ] **添加唤醒词**: addWakeWord(word) 添加到唤醒词列表
- [ ] **移除唤醒词**: removeWakeWord(word) 从列表移除
- [ ] **测试唤醒词**: testWakeWord(word) 返回 WakeTestResult (置信度/是否匹配)
- [ ] **开始 Talk Mode**: startTalkMode() 进入连续对话模式
- [ ] **停止 Talk Mode**: stopTalkMode() 退出对话模式
- [ ] **发送音频**: sendVoiceAudio(audioData) 发送录音数据
- [ ] **语音流**: startVoiceStream() 返回 MediaStream
- [ ] **停止流**: stopVoiceStream() 关闭 MediaStream
- [ ] **TTS 合成**: synthesizeSpeech(text, options) 返回 ArrayBuffer
- [ ] **TTS 流式**: synthesizeSpeechStream(text, options) 返回 AsyncGenerator<ArrayBuffer>
- [ ] **ASR 转录**: transcribeAudio(audioData) 返回 TranscriptionResult
- [ ] **ASR 流式**: transcribeStream(stream) 返回 AsyncGenerator<Segment>
- [ ] **wake:detected 事件**: 触发时携带唤醒词字符串
- [ ] **voice:input 事件**: 触发时携带原始音频数据
- [ ] **voice:text 事件**: 触发时携带转录文本
- [ ] **voice:error 事件**: 触发时携带 Error 对象

### G2: Voice API 路由

- [ ] GET `/api/openclaw/voice/status` → { wakeEnabled, talkModeEnabled, ...config }
- [ ] POST `/api/openclaw/voice/wake/test` → { matched, confidence, word }
- [ ] POST `/api/openclaw/voice/tts` → audio ArrayBuffer (audio/mp3)
- [ ] POST `/api/openclaw/voice/asr` → { text, confidence, language }

### G3: VoiceControlPanel UI

- [ ] 唤醒词列表 (添加/删除/测试按钮)
- [ ] Talk Mode 开关 (Push-to-Talk / Continuous 切换)
- [ ] TTS 设置 (音色下拉/语速滑块/音调滑块)
- [ ] ASR 设置 (语言选择/提供商选择)
- [ ] 录音按钮 + 实时波形显示
- [ ] 语音历史记录列表 (时间/文本/时长)

---

## 阶段 H: UI 集成验证

### H1: ControlPanel 主控制面板

- [ ] **总览 Tab**:
  - [ ] 网关状态卡片 (Connected/Disconnected + 版本号 + 运行时间)
  - [ ] Agent 数量卡片 (活跃数/总数)
  - [ ] 通道数量卡片 (在线数/总数)
  - [ ] 技能数量卡片 (已启用/总数)
  - [ ] 实时活动流 (最近消息/事件滚动列表)
- [ ] **Agents Tab**:
  - [ ] 新建 Agent 按钮 + 从模板创建按钮 + 导入配置按钮
  - [ ] Agent 表格 (名称/模型/状态/会话数/操作列)
  - [ ] 编辑/删除/启用/禁用操作
- [ ] **通道 Tab**:
  - [ ] 添加通道按钮
  - [ ] 通道表格 (名称/类型/状态/DM策略/消息数)
  - [ ] 编辑/测试/启用/禁用操作
- [ ] **技能 Tab**:
  - [ ] ClawHub 安装按钮 + 上传 SKILL.md 按钮 + 搜索框
  - [ ] 技能表格 (名称/分类/版本/来源/状态)
  - [ ] 编辑/测试/启用/禁用操作
- [ ] **工具 Tab**:
  - [ ] 工具列表 (名称/分类/危险程度)
  - [ ] 手动调用测试面板 (选择工具→填参数→执行→看结果)
- [ ] **Cron Tab**:
  - [ ] 新建定时任务按钮
  - [ ] Cron 任务表格 (名称/调度/上次运行/下次运行/状态)
  - [ ] 启用/禁用/删除/立即执行操作
- [ ] **配置 Tab**:
  - [ ] 配置表单 (模型/思考等级/端口/API Key)
  - [ ] 测试连接 + 保存 + 导入/导出
  - [ ] 快照管理
- [ ] **安全 Tab**:
  - [ ] DM 策略 + 沙箱模式设置
  - [ ] 待审批配对列表
  - [ ] 审计日志查询
- [ ] **通用 UI 质量**:
  - [ ] 响应式布局 (桌面/平板/移动)
  - [ ] Dark Mode 支持
  - [ ] 加载状态 (Skeleton/Spinner)
  - [ ] 错误提示 (Toast/Alert)
  - [ ] 关闭按钮 (X 或点击遮罩)

### H2: ChatView 多通道聊天视图

- [ ] 通道标签栏 (全部/微信/Telegram/Discord/WebChat/...)
- [ ] 多通道消息合并时间线
- [ ] 消息来源标识 (通道图标 + 发送者名称/ID)
- [ ] Agent 处理标记 (Agent 名称 + 处理状态)
- [ ] 工具使用标记 (使用的工具列表折叠展示)
- [ ] 发送区域 (输入框 + 语音按钮 + 附件按钮 + 发送按钮)
- [ ] 目标通道选择器 (回复时可选择发往哪个通道)

### H3: Sidebar + page.tsx 集成

- [ ] Sidebar 新增「OpenClaw」按钮 (🦞 图标 + hover 高亮)
- [ ] 点击触发 CustomEvent('open-openclaw-panel')
- [ ] page.tsx 监听 open-openclaw-panel 事件
- [ ] page.tsx 管理 openClawPanelOpen state
- [ ] OpenClawControlPanel 按 openClawPanelOpen 条件渲染
- [ ] onClose 回调将 openClawPanelOpen 设为 false

### H4: Core 导出

- [ ] index.ts 导出 OpenClawGatewayBridge
- [ ] index.ts 导出 OpenClawAgentManager
- [ ] index.ts 导出 OpenClawChannelBridge
- [ ] index.ts 导出 OpenClawSkillService
- [ ] index.ts 导出 OpenClawToolBridge
- [ ] index.ts 导出 OpenClawConfigSync
- [ ] index.ts 导出 OpenClawSecurityService
- [ ] index.ts 导出 OpenClawVoiceService
- [ ] index.ts 导出所有 openclaw-types 类型

---

## 阶段 I: 编译验证

### I1: Core 包编译

- [ ] `cd packages/core && npx tsc --noEmit` → exit code 0
- [ ] 0 TypeScript error
- [ ] 0 type error
- [ ] 所有 import 路径解析正确

### I2: Web 包编译

- [ ] `cd packages/web && npx tsc --noEmit` → exit code 0
- [ ] 0 TypeScript error
- [ ] 0 type error
- [ ] 所有组件 import 正确
- [ ] 所有 API route import 正确

### I3-I5: 文档更新

- [ ] linkmind_integration_spec.md 追加 OpenClaw 章节
- [ ] linkmind_integration_tasks.md 所有 OpenClaw 任务打勾 ✅
- [ ] linkmind_integration_checklist.md 所有验证项完成 ✅

---

## 性能基准验证

| 指标 | 目标值 | 验证方法 |
|------|--------|---------|
| Gateway 连接建立 | < 2s | connect() 计时 |
| Agent 消息首 token | < 5s | sendMessage() 计时 |
| 简单技能执行 | < 10s | execute() 计时 |
| 通道消息延迟 | < 500ms | sendMessage() 计时 |
| 配置同步 | < 1s | fetchConfig() 计时 |
| 技能搜索响应 | < 500ms | searchSkills() 计时 |

---

## 安全验证项

- [ ] API Key 不出现在日志中
- [ ] DM 配对码使用后失效
- [ ] 沙箱中的工具无法访问宿主敏感路径
- [ ] 审计日志不可篡改 (只追加)
- [ ] 配置导出不包含密钥明文 (脱敏)
- [ ] WebSocket 连接使用认证头
- [ ] CORS 配置严格限制来源
