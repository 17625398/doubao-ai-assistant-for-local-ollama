# OpenClaw 深度集成任务清单

> **基于**: [openclaw_integration_spec.md](./openclaw_integration_spec.md)
> **目标**: 将 [openclaw/openclaw](https://github.com/openclaw/openclaw) 深度集成到 Doubao Refactored 项目
> **总任务数**: 30+ | **预计阶段**: 9 个 Phase (A~I)

---

## 阶段 A: 基础桥接层 (P0 - 核心基础)

### Task A1: 创建 OpenClaw 类型定义

- **文件**: `packages/core/src/services/openclaw/openclaw-types.ts`
- **依赖**: 无
- **输入**: OpenClaw 源码中的类型 + spec 文档中的接口定义
- **输出**: 统一的 TypeScript 类型系统
- **验收标准**:
  - [ ] `OpenClawGatewayConfig` — 网关配置接口
  - [ ] `OpenClawAgentConfig` / `OpenClawSession` — Agent/会话类型
  - [ ] `OpenClawChannelConfig` / `OpenClawChannelType` — 通道类型
  - [ ] `OpenClawSkill` / `SkillToolDefinition` — 技能类型
  - [ ] `OpenClawToolDefinition` — 工具类型
  - [ ] `DMPairingPolicy` / `SandboxPolicy` — 安全策略类型
  - [ ] `VoiceWakeConfig` / `TalkModeConfig` — 语音配置类型
  - [ ] 所有枚举和联合类型完整

### Task A2: 创建 OpenClawGatewayBridge 网关桥接服务

- **文件**: `packages/core/src/services/openclaw/openclaw-gateway-bridge.ts`
- **依赖**: Task A1
- **输入**: OpenClaw Gateway HTTP API (port 18789) + WebSocket (port 18790)
- **输出**: 统一网关连接管理
- **验收标准**:
  - [ ] `connect()` / `disconnect()` 连接生命周期
  - [ ] `healthCheck()` 健康检查
  - [ ] `getStatus()` 获取网关状态 (version/uptime/channels/agents/sessions)
  - [ ] `request<T>()` HTTP API 代理 (GET/POST/PUT/DELETE)
  - [ ] `stream()` 流式响应代理
  - [ ] WebSocket 事件流订阅 (message/session/tool/channel/error)
  - [ ] 自动重连机制
  - [ ] 心跳检测
  - [ ] 请求超时控制

### Task A3: 创建 Gateway API 代理路由

- **文件**:
  - `packages/web/src/app/api/openclaw/gateway/status/route.ts`
  - `packages/web/src/app/api/openclaw/gateway/health/route.ts`
  - `packages/web/src/app/api/openclaw/gateway/config/route.ts`
- **依赖**: Task A2
- **输入**: OpenClawGatewayBridge
- **输出**: RESTful API 端点
- **验收标准**:
  - [ ] GET `/api/openclaw/gateway/status` → 网关状态
  - [ ] GET `/api/openclaw/gateway/health` → 健康检查
  - [ ] GET/PUT `/api/openclaw/gateway/config` → 配置读写
  - [ ] 错误处理 + CORS 支持

---

## 阶段 B: Agent 管理 (P0 - 核心功能)

### Task B1: 创建 OpenClawAgentManager Agent 管理器

- **文件**: `packages/core/src/services/openclaw/openclaw-agent-manager.ts`
- **依赖**: Task A2
- **输入**: OpenClaw Agent API + Workspace/Sessions 模型
- **输出**: 完整的 Agent CRUD + 会话管理
- **与现有 AgentBridgeService 关系**: 继承或组合，增强为 OpenClaw 兼容
- **验收标准**:
  - [ ] `registerAgent()` / `unregisterAgent()` Agent 注册注销
  - [ ] `updateAgent()` / `getAgent()` / `listAgents()` Agent 查询更新
  - [ ] `enableAgent()` / `disableAgent()` 启用禁用
  - [ ] `createSession()` / `getSession()` / `listSessions()` 会话管理
  - [ ] `sendMessage()` 发送消息并获取响应
  - [ ] `streamMessage()` 流式消息 (SSE/WebSocket)
  - [ ] `resetSession()` / `compactSession()` 会话重置/压缩
  - [ ] `archiveSession()` / `deleteSession()` 会话归档删除
  - [ ] `getWorkspaceFiles()` / `updateWorkspaceFile()` 工作区文件管理
  - [ ] `setRoutingRule()` / `getRoutingRules()` 路由规则
  - [ ] `routeMessage()` 消息路由决策
  - [ ] Token 用量记录集成 (GovernanceService)

### Task B2: 创建 Agent API 代理路由

- **文件**:
  - `packages/web/src/app/api/openclaw/agents/route.ts` (列表+创建)
  - `packages/web/src/app/api/openclaw/agents/[id]/route.ts` (CRUD)
  - `packages/web/src/app/api/openclaw/agents/[id]/chat/route.ts` (消息发送)
  - `packages/web/src/app/api/openclaw/agents/[id]/sessions/route.ts` (会话管理)
- **依赖**: Task B1
- **验收标准**:
  - [ ] GET/POST `/api/openclaw/agents` — 列表/创建
  - [ ] GET/PUT/DELETE `/api/openclaw/agents/:id` — CRUD
  - [ ] POST `/api/openclaw/agents/:id/chat` — 发送消息 (支持 stream)
  - [ ] GET/POST `/api/openclaw/agents/:id/sessions` — 会话列表/创建

### Task B3: 增强 AgentBridgeService 兼容 OpenClaw

- **文件**: `packages/core/src/services/agent-bridge-service.ts` (修改)
- **依赖**: Task B1
- **输入**: OpenClawAgentManager
- **输出**: 向后兼容的统一 Agent 接口
- **验收标准**:
  - [ ] AgentBridgeService 可选委托给 OpenClawAgentManager
  - [ ] 现有调用方无需修改
  - [ ] syncAgents() 支持从 OpenClaw Gateway 同步

---

## 阶段 C: 通道桥接 (P0-P1 - 多通道支持)

### Task C1: 创建 OpenClawChannelBridge 通道桥接服务

- **文件**: `packages/core/src/services/openclaw/openclaw-channel-bridge.ts`
- **依赖**: Task A2
- **输入**: OpenClaw Channel API (25+ 通道类型)
- **输出**: 统一通道抽象层
- **与现有 chatclaw-openclaw-service.ts 关系**: 重构/增强
- **验收标准**:
  - [ ] `addChannel()` / `removeChannel()` 通道增删
  - [ ] `updateChannel()` / `getChannel()` / `listChannels()` 通道查询
  - [ ] `enableChannel()` / `disableChannel()` 启用禁用
  - [ ] `testConnection()` 连接测试
  - [ ] `sendMessage()` 发送出站消息
  - [ ] `sendTypingIndicator()` 输入指示器
  - [ ] `sendReaction()` 表情反应
  - [ ] DM 配对: approve/reject/listPending/listAllowed
  - [ ] 入站消息事件: message:inbound/message:outbound/channel:status/pairing:request
  - [ ] 25+ 通道类型枚举完整

### Task C2: 创建 Channel API 代理路由

- **文件**:
  - `packages/web/src/app/api/openclaw/channels/route.ts` (列表+添加)
  - `packages/web/src/app/api/openclaw/channels/[id]/route.ts` (CRUD+测试)
  - `packages/web/src/app/api/openclaw/channels/[id]/message/route.ts` (发消息)
  - `packages/web/src/app/api/openclaw/channels/[id]/pairings/route.ts` (配对管理)
- **依赖**: Task C1
- **验收标准**:
  - [ ] GET/POST `/api/openclaw/channels` — 通道列表/添加
  - [ ] PUT/DELETE `/api/openclaw/channels/:id` — 更新/删除
  - [ ] POST `/api/openclaw/channels/:id/test` — 连接测试
  - [ ] POST `/api/openclaw/channels/:id/message` — 发送消息
  - [ ] GET/POST `/api/openclaw/channels/:id/pairings` — 配对管理

### Task C3: 重点通道适配器实现

- **文件**: `packages/core/src/services/openclaw/adapters/`
- **依赖**: Task C1
- **优先级通道**:
  - [ ] **WebChat** (`webchat-adapter.ts`) — 内嵌 Web 聊天，无需外部 SDK
  - [ ] **微信 WeChat** (`wechat-adapter.ts`) — 企业微信/个人微信桥接
  - [ ] **QQ** (`qq-adapter.ts`) — QQ Bot API 桥接
- **可选扩展**:
  - [ ] Telegram (`telegram-adapter.ts`)
  - [ ] Discord (`discord-adapter.ts`)
  - [ ] 飞书 Feishu (`feishu-adapter.ts`)
- **验收标准**:
  - [ ] WebChat 适配器支持内嵌 iframe 或自定义组件
  - [ ] 微信适配器支持文本/图片/文件消息
  - [ ] QQ 适配器支持 At 消息/CQ 码解析
  - [ ] 每个适配器有独立的配置验证逻辑

### Task C4: 创建 ChannelPanel 通道管理 UI

- **文件**: `packages/web/src/components/openclaw/OpenClawChannelPanel.tsx`
- **依赖**: Task C1 + C2
- **验收标准**:
  - [ ] 通道列表展示 (名称/类型/状态/DM策略/消息数)
  - [ ] 添加通道表单 (类型选择 + 配置表单)
  - [ ] 编辑通道配置
  - [ ] 测试连接按钮 + 结果展示
  - [ ] 启用/禁用切换
  - [ ] 待审批配对列表 + 批准/拒绝操作

---

## 阶段 D: 技能系统 (P1 - 技能生态)

### Task D1: 创建 OpenClawSkillService 技能服务

- **文件**: `packages/core/src/services/openclaw/openclaw-skill-service.ts`
- **依赖**: Task A2
- **输入**: SKILL.md 格式 + ClawHub 注册表
- **输出**: 技能发现/注册/执行引擎
- **与现有 chatclaw-openclaw-skill-service.ts 关系**: 重构/增强
- **验收标准**:
  - [ ] `discoverSkills()` 技能发现 (builtin/workspace/clawhub/custom)
  - [ ] `installSkill()` / `uninstallSkill()` 安装卸载
  - [ ] `updateSkill()` 更新技能
  - [ ] `getSkill()` / `listSkills()` / `searchSkills()` 查询
  - [ ] `enableSkill()` / `disableSkill()` 启用禁用
  - [ ] `execute()` 同步执行技能工具
  - [ ] `executeStream()` 流式执行
  - [ ] `registerToolHandler()` / `unregisterToolHandler()` 工具处理器注册
  - [ ] `searchClawHub()` / `installFromClawHub()` ClawHub 集成
  - [ ] `resolveDependencies()` 依赖解析
  - [ ] `checkSkillHealth()` 健康检查

### Task D2: 创建 Skill API 代理路由

- **文件**:
  - `packages/web/src/app/api/openclaw/skills/route.ts` (列表+搜索)
  - `packages/web/src/app/api/openclaw/skills/install/route.ts` (安装)
  - `packages/web/src/app/api/openclaw/skills/[id]/route.ts` (CRUD)
  - `packages/web/src/app/api/openclaw/skills/[id]/execute/route.ts` (执行)
  - `packages/web/src/app/api/openclaw/skills/clawhub/route.ts` (ClawHub)
- **依赖**: Task D1
- **验收标准**:
  - [ ] GET `/api/openclaw/skills` — 技能列表 (支持 filter)
  - [ ] POST `/api/openclaw/skills/install` — 安装技能
  - [ ] DELETE `/api/openclaw/skills/:id` — 卸载技能
  - [ ] POST `/api/openclaw/skills/:id/execute` — 执行技能
  - [ ] GET `/api/openclaw/skills/clawhub?q=` — ClawHub 搜索

### Task D3: 实现 10+ 内置技能

- **目录**: `packages/core/src/services/openclaw/skills/`
- **依赖**: Task D1
- **内置技能清单**:
  | ID | 名称 | 分类 | 说明 |
  |----|------|------|------|
  | `chat` | 基础聊天 | communication | AI 对话 |
  | `web-search` | 网络搜索 | search | Google/Bing/DuckDuckGo |
  | `code-search` | 代码搜索 | search | GitHub/GitLab 代码搜索 |
  | `git-ops` | Git 操作 | code | commit/pull/push/branch |
  | `npm-ops` | NPM 操作 | code | install/build/publish |
  | `file-manager` | 文件管理 | productivity | 读写/搜索/组织文件 |
  | `image-gen` | 图像生成 | media | AI 绘图 |
  | `tts` | 语音合成 | media | 文本转语音 |
  | `asr` | 语音识别 | media | 语音转文本 |
  | `webhook-trigger` | Webhook 触发 | automation | 触发外部 Webhook |
  | `data-query` | 数据查询 | data | SQL/NoSQL 查询 |
  | `secret-scan` | 密钥扫描 | security | 敏感信息检测 |
- **验收标准**:
  - [ ] 每个技能有完整的 SKILL.md 定义
  - [ ] 每个技能的工具参数 Schema 正确
  - [ ] 每个技能可独立启用/禁用
  - [ ] 技能之间可组合使用

### Task D4: 创建 SkillPanel + SkillEditor UI

- **文件**:
  - `packages/web/src/components/openclaw/OpenClawSkillPanel.tsx` (技能浏览)
  - `packages/web/src/components/openclaw/OpenClawSkillEditor.tsx` (技能编辑)
- **依赖**: Task D1 + D2
- **验收标准**:
  - [ ] 技能列表 (名称/分类/版本/来源/状态)
  - [ ] ClawHub 搜索 + 一键安装
  - [ ] 上传自定义 SKILL.md
  - [ ] 技能详情查看 (工具列表/参数/脚本)
  - [ ] 技能编辑器 (YAML frontmatter 表单 + Markdown 编辑)
  - [ ] 技能测试面板 (选择工具 → 填参数 → 执行 → 查结果)

---

## 阶段 E: 工具桥接 (P1 - 工具执行)

### Task E1: 创建 OpenClawToolBridge 工具桥接服务

- **文件**: `packages/core/src/services/openclaw/openclaw-tool-bridge.ts`
- **依赖**: Task A2
- **输入**: OpenClaw Tools API (Browser/Canvas/Cron/Sessions/Nodes)
- **输出**: 统一工具调用接口
- **验收标准**:
  - [ ] `listTools()` / `getTool()` 工具发现
  - [ ] 浏览器工具: navigate/screenshot/click/type/extractText/evaluate/waitFor/getPageContent
  - [ ] Canvas 工具: create/render/update/export/listCanvases
  - [ ] Cron 工具: create/list/get/enable/disable/delete/runNow/history
  - [ ] 会话工具: list/get/send/spawn/history
  - [ ] `callTool()` 通用工具调用
  - [ ] `callToolStream()` 流式工具调用
  - [ ] 沙箱模式支持 (Docker/SSH)

### Task E2: 创建 Tool + Cron API 代理路由

- **文件**:
  - `packages/web/src/app/api/openclaw/tools/route.ts` (工具列表)
  - `packages/web/src/app/api/openclaw/tools/[id]/call/route.ts` (调用)
  - `packages/web/src/app/api/openclaw/cron/route.ts` (Cron 列表)
  - `packages/web/src/app/api/openclaw/cron/[id]/route.ts` (Cron CRUD)
- **依赖**: Task E1
- **验收标准**:
  - [ ] GET `/api/openclaw/tools` — 工具列表
  - [ ] POST `/api/openclaw/tools/:id/call` — 调用工具
  - [ ] GET/POST/DELETE `/api/openclaw/cron` — Cron 任务管理
  - [ ] POST `/api/openclaw/cron/:id/run` — 立即执行

### Task E3: 创建 CronDashboard 定时任务 UI

- **文件**: `packages/web/src/components/openclaw/OpenClawCronPanel.tsx`
- **依赖**: Task E1 + E2
- **验收标准**:
  - [ ] Cron 任务列表 (名称/调度表达式/上次运行/下次运行/状态)
  - [ ] 新建任务向导 (名称/调度/Agent/动作/参数)
  - [ ] 启用/禁用/删除/立即执行 操作
  - [ ] 运行历史查看 (时间/耗时/状态/输出)
  - [ ] 调度表达式可视化编辑器

---

## 阶段 F: 配置与安全 (P1-P2 - 治理)

### Task F1: 创建 OpenClawConfigSync 配置同步服务

- **文件**: `packages/core/src/services/openclaw/openclaw-config-sync.ts`
- **依赖**: Task A2
- **输入**: openclaw.json 格式
- **输出**: 配置读写/同步/验证
- **验收标准**:
  - [ ] `fetchConfig()` / `getConfigSection()` 配置读取
  - [ ] `updateConfig()` / `updateSection()` 配置写入
  - [ ] `getModelConfig()` / `getChannelConfigs()` / `getAgentConfigs()`
  - [ ] `validateConfig()` / `validateSection()` 配置验证
  - [ ] `pushToLocal()` / `pullFromLocal()` 双向同步
  - [ ] `watchChanges()` 配置变更监听
  - [ ] `exportConfig()` / `importConfig()` 导入导出 (JSON/YAML)
  - [ ] `createSnapshot()` / `restoreSnapshot()` 快照回滚

### Task F2: 创建 OpenClawSecurityService 安全服务

- **文件**: `packages/core/src/services/openclaw/openclaw-security-service.ts`
- **依赖**: Task F1
- **输入**: OpenClaw Security Model (DM Pairing/Sandbox/ACL)
- **输出**: 访问控制 + 内容安全 + 审计日志
- **与现有 GovernanceService 关系**: 融合扩展
- **验收标准**:
  - [ ] DM 配对: setDMPolicy/generateCode/approve/reject/listPending
  - [ ] ACL: grantAccess/revokeAccess/checkAccess/listEntries
  - [ ] 沙箱: setSandboxPolicy/setAgentSandbox/isToolAllowedInSandbox
  - [ ] 内容安全: scanContent/blockContent/unblockContent (融合 GovernanceService)
  - [ ] 审计: logAuditEvent/queryAuditLogs/exportAuditLogs

### Task F3: 创建 ConfigEditor + SecurityDashboard UI

- **文件**:
  - `packages/web/src/components/openclaw/OpenClawConfigPanel.tsx`
  - `packages/web/src/components/openclaw/OpenClawSecurityPanel.tsx`
- **依赖**: Task F1 + F2
- **验收标准**:
  - [ ] 配置编辑器 (模型/思考等级/端口/API Key 等)
  - [ ] 连接测试按钮 + 状态指示
  - [ ] 导入/导出配置 (JSON/YAML)
  - [ ] 快照管理 (创建/列表/恢复)
  - [ ] DM 策略设置 (pairing/open/closed)
  - [ ] 待审批配对列表 + 批准/拒绝
  - [ ] 沙箱模式设置 (none/docker/ssh)
  - [ ] 审计日志查询 + 导出

---

## 阶段 G: 语音增强 (P2 - 语音能力)

### Task G1: 创建 OpenClawVoiceService 语音服务

- **文件**: `packages/core/src/services/openclaw/openclaw-voice-service.ts`
- **依赖**: Task A2
- **输入**: OpenClaw Voice API (Wake Words + Talk Mode)
- **输出**: 语音唤醒 + Talk Mode + TTS/ASR
- **与现有 MultimodalService/VoiceService 关系**: 增强/替代
- **验收标准**:
  - [ ] `configureWake()` / `startWakeListening()` / `stopWakeListening()` 唤醒词管理
  - [ ] `addWakeWord()` / `removeWakeWord()` / `testWakeWord()`
  - [ ] `startTalkMode()` / `stopTalkMode()` Talk Mode 控制
  - [ ] `sendVoiceAudio()` / `startVoiceStream()` / `stopVoiceStream()` 语音输入
  - [ ] `synthesizeSpeech()` / `synthesizeSpeechStream()` TTS
  - [ ] `transcribeAudio()` / `transcribeStream()` ASR
  - [ ] 事件: wake:detected/voice:input/voice:text/voice:error

### Task G2: 创建 Voice API 代理路由

- **文件**:
  - `packages/web/src/app/api/openclaw/voice/status/route.ts`
  - `packages/web/src/app/api/openclaw/voice/wake/test/route.ts`
  - `packages/web/src/app/api/openclaw/voice/tts/route.ts`
  - `packages/web/src/app/api/openclaw/voice/asr/route.ts`
- **依赖**: Task G1
- **验收标准**:
  - [ ] GET `/api/openclaw/voice/status` — 语音状态
  - [ ] POST `/api/openclaw/voice/wake/test` — 测试唤醒词
  - [ ] POST `/api/openclaw/voice/tts` — 语音合成
  - [ ] POST `/api/openclaw/voice/asr` — 语音识别

### Task G3: 创建 VoiceControlPanel 语音控制 UI

- **文件**: `packages/web/src/components/openclaw/OpenClawVoicePanel.tsx`
- **依赖**: Task G1 + G2
- **验收标准**:
  - [ ] 唤醒词配置 (添加/删除/测试)
  - [ ] Talk Mode 开关 (按住说话/连续监听)
  - [ ] TTS 设置 (音色/语速/音调)
  - [ ] ASR 设置 (语言/提供商)
  - [ ] 实时语音波形显示
  - [ ] 语音历史记录

---

## 阶段 H: UI 集成 (P1 - 用户界面)

### Task H1: 创建 OpenClawControlPanel 主控制面板

- **文件**: `packages/web/src/components/openclaw/OpenClawControlPanel.tsx`
- **依赖**: Task B1 + C1 + D1 + E1 + F1
- **说明**: 8 标签页主面板 (总览/Agents/通道/技能/工具/Cron/配置/安全)
- **验收标准**:
  - [ ] 总览 Tab: 网关状态卡片 + 实时活动流
  - [ ] Agents Tab: Agent 列表 + CRUD + 从模板创建
  - [ ] 通道 Tab: 通道列表 + 添加/编辑/测试
  - [ ] 技能 Tab: 技能列表 + ClawHub 安装 + 上传
  - [ ] 工具 Tab: 工具列表 + 手动调用测试
  - [ ] Cron Tab: 任务列表 + 新建/编辑/执行
  - [ ] 配置 Tab: 配置编辑器 + 连接测试 + 导入导出
  - [ ] 安全 Tab: DM 策略 + 配对审批 + 审计日志
  - [ ] 响应式布局 + Dark Mode 支持

### Task H2: 创建 OpenClawChatView 多通道聊天视图

- **文件**: `packages/web/src/components/openclaw/OpenClawChatView.tsx`
- **依赖**: Task C1 + B1
- **验收标准**:
  - [ ] 通道选择器标签栏 (全部/微信/Telegram/Discord/WebChat...)
  - [ ] 多通道消息合并展示
  - [ ] 消息来源标识 (通道图标 + 发送者)
  - [ ] Agent 标识 (哪个 Agent 处理的)
  - [ ] 工具使用标记 (使用了哪些工具)
  - [ ] 发送消息 (可选择目标通道)
  - [ ] 语音输入按钮 (如果 VoiceService 可用)

### Task H3: Sidebar 入口 + page.tsx 集成

- **文件**:
  - `packages/web/src/components/Sidebar.tsx` (修改)
  - `packages/web/src/app/page.tsx` (修改)
- **依赖**: Task H1
- **验收标准**:
  - [ ] Sidebar 新增「OpenClaw」入口按钮 (🦞 图标)
  - [ ] 点击触发 open-openclaw-panel 自定义事件
  - [ ] page.tsx 监听事件 + 状态管理
  - [ ] OpenClawControlPanel 渲染

### Task H4: Core 导出注册

- **文件**: `packages/core/src/index.ts` (修改)
- **依赖**: 全部 Phase A-G 服务完成
- **验收标准**:
  - [ ] 所有 OpenClaw 服务从 index.ts 导出
  - [ ] 类型定义正确导出
  - [ ] 单例实例可导入使用

---

## 阶段 I: 编译验证与文档 (P1 - 收尾)

### Task I1: Core 包编译验证

- **命令**: `cd packages/core && npx tsc --noEmit`
- **验收标准**:
  - [ ] 0 TypeScript 编译错误
  - [ ] 0 类型错误
  - [ ] 所有 import 路径正确

### Task I2: Web 包编译验证

- **命令**: `cd packages/web && npx tsc --noEmit`
- **验收标准**:
  - [ ] 0 TypeScript 编译错误
  - [ ] 0 类型错误
  - [ ] 所有组件 import 正确

### Task I3-I5: 文档更新

- **文件**:
  - `.trae/documents/linkmind_integration_spec.md` (追加 OpenClaw 章节)
  - `.trae/documents/linkmind_integration_tasks.md` (追加 OpenClaw 任务)
  - `.trae/documents/linkmind_integration_checklist.md` (追加 OpenClaw 验证项)
- **验收标准**:
  - [ ] spec 文档包含 OpenClaw 集成章节
  - [ ] tasks 文档所有 OpenClaw 任务已打勾
  - [ ] checklist 文档所有验证项已完成

---

## 任务依赖关系图

```
Phase A (基础桥接层)
├── A1: 类型定义 ──────────────────────────────┐
├── A2: GatewayBridge ← A1                      │
└── A3: Gateway API Routes ← A2                 │
                                                  │
Phase B (Agent 管理)                              │
├── B1: AgentManager ← A2                        │
├── B2: Agent API Routes ← B1                    │
└── B3: 增强 AgentBridgeService ← B1             │
                                                  │
Phase C (通道桥接)                                │
├── C1: ChannelBridge ← A2                       │
├── C2: Channel API Routes ← C1                  │
├── C3: 通道适配器 ← C1                           │
└── C4: ChannelPanel UI ← C1+C2                   │
                                                  │
Phase D (技能系统)                                │
├── D1: SkillService ← A2                         │
├── D2: Skill API Routes ← D1                    │
├── D3: 内置技能集 ← D1                           │
└── D4: SkillPanel+Editor UI ← D1+D2              │
                                                  │
Phase E (工具桥接)                                │
├── E1: ToolBridge ← A2                           │
├── E2: Tool+Cron API Routes ← E1                │
└── E3: CronDashboard UI ← E1+E2                  │
                                                  │
Phase F (配置与安全)                              │
├── F1: ConfigSync ← A2                           │
├── F2: SecurityService ← F1                      │
└── F3: ConfigEditor+Security UI ← F1+F2          │
                                                  │
Phase G (语音增强)                                │
├── G1: VoiceService ← A2                         │
├── G2: Voice API Routes ← G1                    │
└── G3: VoiceControlPanel UI ← G1+G2             │
                                                  │
Phase H (UI 集成)                                 │
├── H1: ControlPanel ← B1+C1+D1+E1+F1            │
├── H2: ChatView ← C1+B1                          │
├── H3: Sidebar+page 集成 ← H1                    │
└── H4: Core 导出 ← A~G 全部                      │
                                                  │
Phase I (编译验证)                                │
├── I1: Core 编译 ← H4                            │
├── I2: Web 编译 ← H4                            │
└── I3-I5: 文档更新 ← I1+I2                       │
```

---

## 优先级执行建议

### 第一批 (P0 — 必须先完成)
A1 → A2 → A3 → B1 → B2 → C1 → C2

### 第二批 (P1 — 核心体验)
B3 → C3 → D1 → D2 → E1 → E2 → H1 → H3 → H4

### 第三批 (P2 — 增强体验)
C4 → D3 → D4 → E3 → F1 → F2 → F3 → G1 → G2 → G3 → H2

### 第四批 (收尾)
I1 → I2 → I3 → I4 → I5
