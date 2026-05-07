# OpenClaw 深度集成规格文档

> **最后更新**: 2026-04-23 | **状态**: 📋 规格定义中
> **目标项目**: [openclaw/openclaw](https://github.com/openclaw/openclaw) v2026.x
> **集成基础**: 已有 `chatclaw-openclaw-service.ts` + `chatclaw-openclaw-skill-service.ts` + `agent-bridge-service.ts`

---

## 1. OpenClaw 项目概述

### 1.1 什么是 OpenClaw

OpenClaw 是一个**个人 AI 助手框架**，运行在自有设备上，通过**本地优先的网关架构**提供统一控制平面。核心特点：

| 特性 | 说明 |
|------|------|
| **本地优先网关** | 单一控制平面管理会话、通道、工具、事件 |
| **多通道收件箱** | 支持 25+ 通道：WhatsApp/Telegram/Slack/Discord/微信/QQ/WebChat 等 |
| **多 Agent 路由** | 将入站通道/账户/对等方路由到隔离的 Agent（工作区 + 会话） |
| **语音唤醒+对话模式** | macOS/iOS 唤醒词 + Android 连续语音，ElevenLabs + 系统 TTS |
| **Live Canvas** | Agent 驱动的可视化工作区，A2UI 协议 |
| **一等公民工具** | 浏览器、Canvas、节点、Cron、会话、Discord/Slack 操作 |
| **技能系统** | SKILL.md 驱动的技能注册表（ClawHub） |
| **安全模型** | DM 配对、沙箱模式（Docker/SSH/OpenShell 后端） |
| **配套应用** | macOS 菜单栏应用 + iOS/Android 节点 |

### 1.2 OpenClaw 核心架构

```
┌─────────────────────────────────────────────────────────────┐
│                    OpenClaw Gateway                         │
│  ┌───────────┐  ┌───────────┐  ┌───────────┐  ┌──────────┐ │
│  │  Channel  │  │   Agent   │  │   Tool    │  │  Skill   │ │
│  │  Manager  │→ │  Router   │→ │ Executor  │→ │ Registry │ │
│  └─────┬─────┘  └─────┬─────┘  └─────┬─────┘  └────┬────┘ │
│        │              │              │              │      │
│  ┌─────▼─────┐  ┌─────▼─────┐  ┌─────▼─────┐  ┌────▼────┐ │
│  │ 25+       │  │ Workspace │  │ Browser   │  │ ClawHub │ │
│  │ Channels  │  │ Sessions  │  │ Canvas    │  │ SKILLS  │ │
│  └───────────┘  └───────────┘  │ Cron      │  └─────────┘ │
│                               │ Nodes     │               │
│                               └──────────┘               │
├─────────────────────────────────────────────────────────────┤
│  Security: DM Pairing | Sandbox | Auth Profiles            │
│  Config: openclaw.json | AGENTS.md | SOUL.md | TOOLS.md    │
└─────────────────────────────────────────────────────────────┘
```

### 1.3 OpenClaw 关键目录结构

```
openclaw/
├── src/
│   ├── gateway/          # 网关核心 (HTTP/WS 控制平面)
│   ├── agents/           # Agent 系统 (工作区 + 会话)
│   ├── channels/         # 25+ 通道适配器
│   ├── tools/            # 内置工具 (浏览器/画布/Cron)
│   ├── config/           # 配置管理 (openclaw.json)
│   ├── context-engine/   # 上下文引擎
│   ├── cron/             # 定时任务调度器
│   ├── canvas-host/      # Live Canvas 宿主
│   ├── bootstrap/        # 启动引导
│   ├── commands/         # CLI 命令 (/status, /new, /reset...)
│   ├── acp/              # Agent Communication Protocol
│   ├── bindings/         # 语言绑定
│   ├── auto-reply/       # 自动回复引擎
│   └── compat/           # 兼容层
├── .agents/skills/       # 技能目录 (SKILL.md)
├── ui/control-ui/        # Web 控制台 UI
└── docs/                 # 文档
```

---

## 2. 集成目标与范围

### 2.1 集成目标

将 OpenClaw 作为**企业级 AI 中间件层**深度嵌入本项目，实现：

1. **统一 Agent 平台** — 复用 OpenClaw 的 Agent 工作区/会话模型
2. **多通道消息桥接** — 将 OpenClaw 的 25+ 通道接入本项目的聊天系统
3. **技能生态互通** — 接入 ClawHub 技能注册表，支持 5000+ 技能
4. **工具执行桥接** — 桥接 OpenClaw 的浏览器/画布/Cron 等一等工具
5. **配置同步** — 双向同步 openclaw.json 与本项目配置
6. **安全治理融合** — 将 OpenClaw 的 DM 配对/沙箱模型融入 GovernanceService
7. **语音能力增强** — 接入 OpenClaw 的唤醒词 + Talk Mode
8. **Live Canvas 集成** — 在项目中渲染 OpenClaw Canvas

### 2.2 集成范围 vs 不在范围

| ✅ 在范围内 | ❌ 不在范围 |
|------------|------------|
| OpenClaw Gateway API 桥接 | OpenClaw CLI 二进制分发 |
| Agent 工作区/会话管理 | OpenClaw Daemon 进程管理 |
| 通道连接器桥接 (HTTP/API 层) | 通道原生 SDK 集成 (如 WhatsApp Business API) |
| 技能注册表同步与执行 | ClawHub 技能市场运营 |
| 工具调用代理 (浏览器/Cron) | Docker 沙箱后端管理 |
| 配置文件读写与验证 | openclaw onboard 向导 |
| 安全策略 (DM配对/过滤) | 设备配对协议实现 |
| WebSocket 事件流 | iOS/Android 节点应用 |

---

## 3. 架构设计

### 3.1 整体集成架构

```
┌──────────────────────────────────────────────────────────────────┐
│                     Doubao Refactored Frontend                   │
│  ┌────────────┐ ┌────────────┐ ┌────────────┐ ┌──────────────┐  │
│  │ Chat UI    │ │ AgentPanel │ │ SkillPanel │ │ ChannelPanel │  │
│  └─────┬──────┘ └─────┬──────┘ └─────┬──────┘ └──────┬───────┘  │
│        │              │              │               │          │
├────────┼──────────────┼──────────────┼───────────────┼──────────┤
│        ▼              ▼              ▼               ▼          │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │                  API Proxy Routes                        │   │
│  │ /api/openclaw/* → OpenClawBridgeService                 │   │
│  └──────────────────────┬─────────────────────────────────┘   │
├─────────────────────────┼─────────────────────────────────────┤
│                          ▼                                     │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │              OpenClaw Integration Layer                   │   │
│  │                                                            │   │
│  │  ┌─────────────────┐  ┌─────────────────┐                │   │
│  │  │OpenClawGateway  │  │OpenClawAgentMgr │                │   │
│  │  │Bridge Service   │  │(Workspace+Sess) │                │   │
│  │  └────────┬────────┘  └────────┬────────┘                │   │
│  │           │                    │                          │   │
│  │  ┌────────▼────────┐  ┌────────▼────────┐               │   │
│  │  │OpenClawChannel  │  │OpenClawSkillSvc │               │   │
│  │  │Bridge (25+)     │  │(Registry+Exec)  │               │   │
│  │  └────────┬────────┘  └────────┬────────┘               │   │
│  │           │                    │                          │   │
│  │  ┌────────▼────────┐  ┌────────▼────────┐               │   │
│  │  │OpenClawToolBridge│  │OpenClawConfig  │               │   │
│  │  │(Browser/Canvas) │  │Sync Service    │               │   │
│  │  └────────┬────────┘  └────────┬────────┘               │   │
│  │           │                    │                          │   │
│  │  ┌────────▼────────┐  ┌────────▼────────┐               │   │
│  │  │OpenClawVoiceSvc │  │OpenClawSecurity │               │   │
│  │  │(Wake+Talk)      │  │(Pairing/Sandbox)│               │   │
│  │  └─────────────────┘  └─────────────────┘               │   │
│  └──────────────────────────────────────────────────────────┘   │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌──────────────────┐  ┌──────────────────┐  ┌──────────────┐  │
│  │ Existing Services│  │ LinkMind Layer   │  │ Governance   │  │
│  │ (Chat/RAG/MCP..) │  │ (Adapter/RAG...) │  │ (Token/Cache)│  │
│  └──────────────────┘  └──────────────────┘  └──────────────┘  │
│                                                                  │
├─────────────────────────────────────────────────────────────────┤
│                         ▼                                        │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │              OpenClaw Gateway (External)                  │   │
│  │  HTTP :18789 | WS :18790 | openclaw.json                │   │
│  └──────────────────────────────────────────────────────────┘   │
└──────────────────────────────────────────────────────────────────┘
```

### 3.2 核心服务映射

| OpenClaw 原生概念 | 本项目对应服务 | 说明 |
|-------------------|--------------|------|
| Gateway (控制平面) | `OpenClawGatewayBridge` | HTTP/WS API 桥接 |
| Agent + Workspace | `OpenClawAgentManager` | Agent 注册/工作区/会话 |
| Channel (25+) | `OpenClawChannelBridge` | 通道连接/消息路由 |
| Skill (SKILL.md) | `OpenClawSkillService` | 技能注册/发现/执行 |
| Tool (Browser/Canvas) | `OpenClawToolBridge` | 工具调用代理 |
| Config (openclaw.json) | `OpenClawConfigSync` | 配置读写/双向同步 |
| Session Model | `OpenClawSessionService` | 会话 CRUD/历史/生成 |
| Cron Jobs | `OpenCronBridge` | 定时任务桥接 |
| Security (DM Pairing) | `OpenClawSecurityService` | 访问控制/沙箱策略 |
| Voice (Wake+Talk) | `OpenClawVoiceService` | 语音唤醒/对话模式 |
| Canvas (A2UI) | `OpenClawCanvasRenderer` | Live Canvas 渲染 |

---

## 4. 详细模块设计

### 4.1 Phase A: OpenClawGatewayBridge (网关桥接)

**文件**: `packages/core/src/services/openclaw/openclaw-gateway-bridge.ts`

**职责**: 与 OpenClaw Gateway 建立 HTTP/WebSocket 连接，作为统一入口。

```typescript
export interface OpenClawGatewayConfig {
  host: string           // 默认 'localhost'
  port: number           // 默认 18789
  wsPort: number         // 默认 18790
  apiKey?: string        // API Key 认证
  timeout: number        // 默认 30000ms
  reconnect: boolean     // WS 自动重连
  maxRetries: number     // 最大重试次数
}

export interface GatewayStatus {
  connected: boolean
  version: string
  uptime: number
  channels: number
  agents: number
  activeSessions: number
  lastHeartbeat: number
}

export class OpenClawGatewayBridge extends EventEmitter {
  private config: OpenClawGatewayConfig
  private httpClient: HttpClient
  private wsClient?: WebSocket
  private status: GatewayStatus
  private eventBuffer: Map<string, any[]>

  // 核心方法
  async connect(): Promise<GatewayStatus>
  async disconnect(): Promise<void>
  async healthCheck(): Promise<GatewayStatus>
  async getStatus(): Promise<GatewayStatus>

  // WebSocket 事件流
  on(event: 'message' | 'session' | 'tool' | 'channel' | 'error', handler: Function): this
  emit(event: string, data: any): boolean

  // HTTP API 代理
  async request<T>(endpoint: string, options?: RequestOptions): Promise<T>
  async stream(endpoint: string, options?: StreamOptions): AsyncGenerator<StreamChunk>

  // 生命周期
  destroy(): void
}
```

**API 端点映射**:

| 本项目 API | OpenClaw 原生端点 | 方法 | 说明 |
|-----------|------------------|------|------|
| `/api/openclaw/gateway/status` | `/status` | GET | 网关状态 |
| `/api/openclaw/gateway/health` | `/health` | GET | 健康检查 |
| `/api/openclaw/gateway/version` | `/version` | GET | 版本信息 |
| `/api/openclaw/gateway/config` | `/config` | GET/PUT | 配置读写 |
| `/api/openclaw/gateway/restart` | `/restart` | POST | 重启网关 |
| `/api/openclaw/gateway/events` | WS `/events` | WS | 事件流订阅 |

---

### 4.2 Phase B: OpenClawAgentManager (Agent 管理)

**文件**: `packages/core/src/services/openclaw/openclaw-agent-manager.ts`

**职责**: 管理 OpenClaw Agent 工作区和会话，复用并增强现有 `agent-bridge-service.ts`。

```typescript
export interface OpenClawAgentConfig {
  id: string
  name: string
  description?: string
  workspace: string           // 工作区路径
  model: string              // 模型 ID (provider/model)
  systemPrompt?: string      // 自定义系统提示
  soulMd?: string            // SOUL.md 内容
  tools?: string[]           // 允许的工具列表
  skills?: string[]          // 绑定的技能 ID
  temperature?: number
  maxTokens?: number
  sandbox?: {                // 沙箱配置
    mode: 'none' | 'docker' | 'ssh' | 'openshell'
    allowTools: string[]
    denyTools: string[]
  }
  channels?: string[]        // 绑定的通道 ID
  enabled: boolean
}

export interface OpenClawSession {
  id: string
  agentId: string
  channelId?: string
  peerId?: string
  createdAt: number
  updatedAt: number
  messageCount: number
  tokenUsage: {
    promptTokens: number
    completionTokens: number
    totalTokens: number
  }
  status: 'active' | 'idle' | 'archived' | 'error'
  metadata?: Record<string, any>
}

export interface AgentExecutionOptions {
  stream?: boolean
  thinking?: 'off' | 'low' | 'medium' | 'high'
  verbose?: boolean
  trace?: boolean
  usage?: 'off' | 'tokens' | 'full'
  toolCall?: 'auto' | 'required' | 'disabled'
  context?: Record<string, any>
}

export class OpenClawAgentManager extends EventEmitter {
  private gateway: OpenClawGatewayBridge
  private agents: Map<string, OpenClawAgentInstance>
  private sessions: Map<string, OpenClawSession>

  // Agent 管理
  async registerAgent(config: OpenClawAgentConfig): Promise<string>
  async unregisterAgent(agentId: string): Promise<boolean>
  async updateAgent(agentId: string, updates: Partial<OpenClawAgentConfig>): Promise<boolean>
  async getAgent(agentId: string): Promise<OpenClawAgentConfig | null>
  async listAgents(filters?: AgentFilters): Promise<OpenClawAgentConfig[]>
  async enableAgent(agentId: string): Promise<boolean>
  async disableAgent(agentId: string): Promise<boolean>

  // 会话管理
  async createSession(agentId: string, options?: SessionCreateOptions): Promise<OpenClawSession>
  async getSession(sessionId: string): Promise<OpenClawSession | null>
  async listSessions(agentId?: string, filters?: SessionFilters): Promise<OpenClawSession[]>
  async sendMessage(sessionId: string, message: string, options?: AgentExecutionOptions): Promise<AgentResponse>
  async streamMessage(sessionId: string, message: string, options?: AgentExecutionOptions): AsyncGenerator<StreamChunk>
  async resetSession(sessionId: string): Promise<boolean>
  async archiveSession(sessionId: string): Promise<boolean>
  async deleteSession(sessionId: string): Promise<boolean>
  async compactSession(sessionId: string): Promise<boolean>

  // 工作区管理
  async getWorkspaceFiles(agentId: string): Promise<WorkspaceFile[]>
  async updateWorkspaceFile(agentId: string, path: string, content: string): Promise<boolean>
  async readWorkspaceFile(agentId: string, path: string): Promise<string>

  // 路由规则
  async setRoutingRule(rule: RoutingRule): Promise<void>
  async getRoutingRules(): Promise<RoutingRule[]>
  async routeMessage(channelId: string, peerId: string, message: string): Promise<RouteDecision>
}
```

**与现有 AgentBridgeService 的关系**:

```
OpenClawAgentManager (新)
    ↓ 继承/组合
AgentBridgeService (已有)
    ↓ 使用
LinkMindService → OpenClaw Gateway API
```

---

### 4.3 Phase C: OpenClawChannelBridge (通道桥接)

**文件**: `packages/core/src/services/openclaw/openclaw-channel-bridge.ts`

**职责**: 桥接 OpenClaw 的 25+ 通道到本项目的消息系统。

```typescript
export type OpenClawChannelType =
  | 'whatsapp' | 'telegram' | 'slack' | 'discord' | 'google-chat'
  | 'signal' | 'imessage' | 'bluebubbles' | 'irc' | 'microsoft-teams'
  | 'matrix' | 'feishu' | 'line' | 'mattermost' | 'nextcloud-talk'
  | 'nostr' | 'synology-chat' | 'tlon' | 'twitch'
  | 'zalo' | 'zalo-personal' | 'wechat' | 'qq' | 'webchat'

export interface OpenClawChannelConfig {
  id: string
  type: OpenClawChannelType
  name: string
  enabled: boolean
  dmPolicy: 'pairing' | 'open' | 'closed'
  allowFrom?: string[]       // 允许列表
  agentId?: string           // 路由到的 Agent
  config: Record<string, any> // 通道特定配置
  status: 'connected' | 'disconnected' | 'error' | 'pending'
  lastActivity?: number
  messageCount?: number
}

export interface OpenClawInboundMessage {
  id: string
  channel: OpenClawChannelType
  channelId: string
  sender: {
    id: string
    name: string
    displayName?: string
    avatarUrl?: string
  }
  content: string
  attachments?: Attachment[]
  timestamp: number
  type: 'text' | 'image' | 'file' | 'voice' | 'video' | 'sticker'
  context?: {
    conversationId?: string
    threadId?: string
    replyToId?: string
  }
  rawPayload?: any
}

export interface OpenClawOutboundMessage {
  to: string
  channel: OpenClawChannelType
  content: string
  attachments?: Attachment[]
  replyToId?: string
  options?: {
    silent?: boolean
    markdown?: boolean
    threading?: boolean
  }
}

export class OpenClawChannelBridge extends EventEmitter {
  private gateway: OpenClawGatewayBridge

  // 通道管理
  async addChannel(config: OpenClawChannelConfig): Promise<string>
  async removeChannel(channelId: string): Promise<boolean>
  async updateChannel(channelId: string, updates: Partial<OpenClawChannelConfig>): Promise<boolean>
  async getChannel(channelId: string): Promise<OpenClawChannelConfig | null>
  async listChannels(): Promise<OpenClawChannelConfig[]>
  async enableChannel(channelId: string): Promise<boolean>
  async disableChannel(channelId: string): Promise<boolean>
  async testConnection(channelId: string): Promise<ConnectionTestResult>

  // 消息处理
  async sendMessage(msg: OpenClawOutboundMessage): Promise<MessageSendResult>
  async sendTypingIndicator(channelId: string, peerId: string): Promise<void>
  async sendReaction(messageId: string, emoji: string): Promise<void>

  // DM 配对管理
  async approvePairing(channelId: string, code: string): Promise<PairingResult>
  async rejectPairing(channelId: string, code: string): Promise<void>
  async listPendingPairings(channelId: string): Promise<PendingPairing[]>
  async listAllowedPeers(channelId: string): Promise<PeerInfo[]>

  // 事件
  on(event: 'message:inbound', handler: (msg: OpenClawInboundMessage) => void): this
  on(event: 'message:outbound', handler: (msg: OpenClawOutboundMessage) => void): this
  on(event: 'channel:status', handler: (ch: OpenClawChannelConfig) => void): this
  on(event: 'pairing:request', handler: (req: PairingRequest) => void): this
}
```

**重点支持的通道**:

| 优先级 | 通道 | 说明 | 配置要点 |
|--------|------|------|---------|
| P0 | **WebChat** | 内嵌 Web 聊天窗口 | 无需外部 SDK |
| P0 | **微信 (WeChat)** | 企业微信/个人微信 | WeChat Work API / itchat |
| P0 | **QQ** | QQ 机器人 | QQ Bot API |
| P1 | **Telegram** | Telegram Bot | Bot Token |
| P1 | **Discord** | Discord Bot | Bot Token + Intents |
| P1 | **Slack** | Slack App | OAuth/Bot Token |
| P1 | **飞书 (Feishu)** | 飞书机器人 | App ID + Secret |
| P2 | **WhatsApp** | WhatsApp Business | Phone Number ID |
| P2 | **Signal** | Signal 信号 | phone-number |
| P2 | **Matrix** | Matrix 协议 | Homeserver URL |

---

### 4.4 Phase D: OpenClawSkillService (技能服务)

**文件**: `packages/core/src/services/openclaw/openclaw-skill-service.ts`

**职责**: 管理和执行 OpenClaw 技能（SKILL.md 格式），支持 ClawHub 生态。

```typescript
export interface OpenClawSkill {
  id: string
  name: string
  description: string
  version: string
  category: string
  author?: string
  source: 'builtin' | 'workspace' | 'clawhub' | 'custom'
  keywords?: string[]
  tools: Record<string, SkillToolDefinition>
  agents?: Record<string, AgentConfigForSkill>
  scripts?: ScriptDefinition[]
  metadata?: Record<string, any>
  enabled: boolean
  installedAt?: number
  updatedAt?: number
}

export interface SkillToolDefinition {
  name: string
  description: string
  parameters: ParameterSchema
  handlerRef?: string          // 引用内置处理器或脚本
  requiresAuth?: boolean
  rateLimit?: RateLimitConfig
}

export interface SkillExecutionRequest {
  skillId: string
  toolName: string
  parameters: Record<string, any>
  sessionId?: string
  context?: SkillExecutionContext
  options?: {
    timeout?: number
    dryRun?: boolean
    verbose?: boolean
  }
}

export interface SkillExecutionResult {
  success: boolean
  skillId: string
  toolName: string
  output: any
  error?: string
  executionTimeMs: number
  tokenUsage?: TokenUsageRecord
  steps?: ExecutionStep[]
}

export class OpenClawSkillService extends EventEmitter {
  private gateway: OpenClawGatewayBridge
  private skills: Map<string, OpenClawSkill>
  private executors: Map<string, SkillExecutor>

  // 技能发现与注册
  async discoverSkills(source?: 'builtin' | 'workspace' | 'clawhub'): Promise<OpenClawSkill[]>
  async installSkill(skillIdOrUrl: string): Promise<OpenClawSkill>
  async uninstallSkill(skillId: string): Promise<boolean>
  async updateSkill(skillId: string): Promise<OpenClawSkill>
  async getSkill(skillId: string): Promise<OpenClawSkill | null>
  async listSkills(filter?: SkillFilter): Promise<OpenClawSkill[]>
  async searchSkills(query: string): Promise<OpenClawSkill[]>
  async enableSkill(skillId: string): Promise<boolean>
  async disableSkill(skillId: string): Promise<boolean>

  // 技能执行
  async execute(request: SkillExecutionRequest): Promise<SkillExecutionResult>
  async executeStream(request: SkillExecutionRequest): AsyncGenerator<SkillStreamEvent>

  // 技能工具注册
  registerToolHandler(toolName: string, handler: SkillToolHandler): void
  unregisterToolHandler(toolName: string): void

  // ClawHub 集成
  async searchClawHub(query: string, category?: string): Promise<ClawHubSkill[]>
  async getClawHubSkillDetails(skillId: string): Promise<ClawHubSkillDetail>
  async installFromClawHub(skillId: string): Promise<OpenClawSkill>

  // 技能依赖解析
  async resolveDependencies(skillId: string): Promise<DependencyResolution>
  async checkSkillHealth(skillId: string): Promise<SkillHealthReport>
}
```

**SKILL.md 格式示例**:

```markdown
---
name: web-search
description: 在互联网上搜索信息
version: 1.0.0
category: search
keywords: [搜索, search, google, bing]
tools:
  search:
    name: search
    description: 执行网络搜索
    parameters:
      query:
        type: string
        required: true
        description: 搜索查询
      engine:
        type: string
        enum: [google, bing, duckduckgo]
        default: google
---
# Web Search Skill

使用此技能在互联网上搜索最新信息。
支持 Google、Bing、DuckDuckGo 多个搜索引擎。
```

**内置技能类别**:

| 类别 | 示例技能 | 说明 |
|------|---------|------|
| communication | chat, email, sms | 通信类 |
| search | web-search, code-search | 搜索类 |
| code | git, npm, docker, test | 开发工具 |
| productivity | calendar, todo, notes | 效率工具 |
| media | image-gen, tts, asr | 多媒体 |
| data | csv, json, database | 数据处理 |
| automation | cron, webhook, workflow | 自动化 |
| security | secret-scan, audit | 安全审计 |

---

### 4.5 Phase E: OpenClawToolBridge (工具桥接)

**文件**: `packages/core/src/services/openclaw/openclaw-tool-bridge.ts`

**职责**: 桥接 OpenClaw 的一等公民工具到本项目。

```typescript
export interface OpenClawToolDefinition {
  id: string
  name: string
  category: 'browser' | 'canvas' | 'cron' | 'sessions' | 'nodes' | 'custom'
  description: string
  parameters: ParameterSchema
  requiresSandbox?: boolean
  dangerous?: boolean
  rateLimit?: RateLimitConfig
}

// 浏览器工具
interface BrowserToolActions {
  navigate(url: string): Promise<BrowserPage>
  screenshot(selector?: string): Promise<Buffer>
  click(selector: string): Promise<void>
  type(selector: string, text: string): Promise<void>
  extractText(selector: string): Promise<string>
  evaluate(script: string): Promise<any>
  waitFor(selector: string, timeout?: number): Promise<void>
  getPageContent(): Promise<string>
}

// Canvas 工具
interface CanvasToolActions {
  create(canvasType: string): Promise<CanvasHandle>
  render(canvasId: string, data: any): Promise<RenderResult>
  update(canvasId: string, delta: any): Promise<void>
  export(canvasId: string, format: 'png' | 'svg' | 'json'): Promise<Buffer>
  listCanvases(): Promise<CanvasInfo[]>
}

// Cron 工具
interface CronToolActions {
  create(schedule: CronSchedule, action: CronAction): Promise<CronJob>
  list(): Promise<CronJob[]>
  get(jobId: string): Promise<CronJob>
  enable(jobId: string): Promise<void>
  disable(jobId: string): Promise<void>
  delete(jobId: string): Promise<void>
  runNow(jobId: string): Promise<CronRunResult>
  history(jobId: string, limit?: number): Promise<CronRunHistory[]>
}

// 会话工具
interface SessionToolActions {
  list(agentId?: string): Promise<SessionSummary[]>
  get(sessionId: string): Promise<SessionDetail>
  send(sessionId: string, message: string): Promise<SessionMessage>
  spawn(agentId: string, message: string): Promise<SessionDetail>
  history(sessionId: string, limit?: number): Promise<SessionMessage[]>
}

export class OpenClawToolBridge {
  private gateway: OpenClawGatewayBridge
  private tools: Map<string, OpenClawToolDefinition>
  private sandboxPool: SandboxPool

  // 工具发现
  async listTools(): Promise<OpenClawToolDefinition[]>
  async getTool(toolId: string): Promise<OpenClawToolDefinition | null>

  // 浏览器工具
  async browserNavigate(url: string): Promise<any>
  async browserScreenshot(options?: ScreenshotOptions): Promise<Buffer>
  async browserAction(action: BrowserAction): Promise<any>

  // Canvas 工具
  async canvasCreate(type: string): Promise<any>
  async canvasRender(id: string, data: any): Promise<any>
  async canvasExport(id: string, format: string): Promise<Buffer>

  // Cron 工具
  async cronCreate(schedule: CronSchedule, action: CronAction): Promise<CronJob>
  async cronList(): Promise<CronJob[]>
  async cronRun(jobId: string): Promise<any>

  // 会话工具
  async sessionList(agentId?: string): Promise<any>
  async sessionSend(sessionId: string, message: string): Promise<any>
  async sessionSpawn(agentId: string, message: string): Promise<any>

  // 通用工具调用
  async callTool(toolId: string, params: Record<string, any>, options?: ToolCallOptions): Promise<ToolCallResult>
  async callToolStream(toolId: string, params: Record<string, any>): AsyncGenerator<ToolStreamEvent>
}
```

---

### 4.6 Phase F: OpenClawConfigSync (配置同步)

**文件**: `packages/core/src/services/openclaw/openclaw-config-sync.ts`

**职责**: 读写和同步 OpenClaw 配置文件 (`openclaw.json`)。

```typescript
export interface OpenClawRawConfig {
  agent?: {
    model?: string
    thinking?: 'off' | 'low' | 'medium' | 'high'
    verbose?: boolean
    trace?: boolean
    usage?: 'off' | 'tokens' | 'full'
  }
  agents?: Record<string, AgentConfig>
  channels?: Record<string, ChannelConfig>
  gateway?: {
    port?: number
    bind?: string
    auth?: AuthConfig
  }
  tools?: {
    browser?: BrowserConfig
    canvas?: CanvasConfig
    cron?: CronConfig
  }
  sandbox?: SandboxConfig
  skills?: SkillConfig
  security?: SecurityConfig
  [key: string]: any
}

export class OpenClawConfigSync {
  private gateway: OpenClawGatewayBridge
  private localCache: OpenClawRawConfig
  private watchers: ConfigWatcher[]

  // 配置读取
  async fetchConfig(): Promise<OpenClawRawConfig>
  async getConfigSection(section: string): Promise<any>
  async getModelConfig(): Promise<ModelConfig>
  async getChannelConfigs(): Promise<Record<string, ChannelConfig>>
  async getAgentConfigs(): Promise<Record<string, AgentConfig>>
  async getSandboxConfig(): Promise<SandboxConfig>
  async getSecurityConfig(): Promise<SecurityConfig>

  // 配置写入
  async updateConfig(updates: Partial<OpenClawRawConfig>): Promise<UpdateResult>
  async updateSection(section: string, value: any): Promise<UpdateResult>
  async setModel(model: string): Promise<void>
  async setThinking(level: string): Promise<void>

  // 配置验证
  async validateConfig(config: OpenClawRawConfig): Promise<ValidationResult>
  async validateSection(section: string, value: any): Promise<ValidationResult>

  // 同步
  async pushToLocal(path?: string): Promise<SyncResult>
  async pullFromLocal(path?: string): Promise<SyncResult>
  async watchChanges(callback: ConfigChangeCallback): void
  async unwatchChanges(): void

  // 导入/导出
  async exportConfig(format: 'json' | 'yaml'): Promise<string>
  async importConfig(content: string, format: 'json' | 'yaml'): Promise<ImportResult>

  // 快照与回滚
  async createSnapshot(label?: string): Promise<Snapshot>
  async listSnapshots(): Promise<Snapshot[]>
  async restoreSnapshot(snapshotId: string): Promise<RestoreResult>
}
```

---

### 4.7 Phase G: OpenClawSecurityService (安全服务)

**文件**: `packages/core/src/services/openclaw/openclaw-security-service.ts`

**职责**: 实现 OpenClaw 的安全模型（DM 配对、沙箱、访问控制），与现有 GovernanceService 融合。

```typescript
export interface DM pairingPolicy {
  mode: 'pairing' | 'open' | 'closed'
  autoApprove?: string[]       // 自动批准的模式
  codeLength?: number          // 配对码长度
  codeTTL?: number             // 配对码有效期 (ms)
}

export interface SandboxPolicy {
  mode: 'none' | 'docker' | 'ssh' | 'openshell'
  defaultAllow?: string[]      // 默认允许的工具
  defaultDeny?: string[]       // 默认拒绝的工具
  perAgent?: Record<string, { allow: string[]; deny: string[] }>
  resourceLimits?: {
    memoryMB?: number
    cpuPercent?: number
    maxExecTimeSec?: number
    networkAccess?: boolean
  }
}

export interface AccessControlEntry {
  id: string
  channelId: string
  peerId: string
  role: 'admin' | 'user' | 'guest' | 'blocked'
  permissions: string[]
  grantedAt: number
  grantedBy?: string
  expiresAt?: number
  reason?: string
}

export class OpenClawSecurityService {
  private governance: GovernanceService
  private gateway: OpenClawGatewayBridge

  // DM 配对管理
  async setDMPolicy(channelId: string, policy: DMPairingPolicy): Promise<void>
  async getDMPolicy(channelId: string): Promise<DMPairingPolicy>
  async generatePairingCode(channelId: string): Promise<PairingCode>
  async approvePairing(channelId: string, code: string, approver?: string): Promise<ApprovalResult>
  async rejectPairing(channelId: string, code: string): Promise<void>
  async listPendingCodes(channelId: string): Promise<PendingCode[]>

  // 访问控制
  async grantAccess(entry: AccessControlEntry): Promise<void>
  async revokeAccess(entryId: string): Promise<void>
  async checkAccess(channelId: string, peerId: string, permission: string): Promise<AccessDecision>
  async listAccessEntries(channelId?: string): Promise<AccessControlEntry[]>

  // 沙箱管理
  async setSandboxPolicy(policy: SandboxPolicy): Promise<void>
  async getSandboxPolicy(): Promise<SandboxPolicy>
  async setAgentSandbox(agentId: string, config: { allow: string[]; deny: string[] }): Promise<void>
  async isToolAllowedInSandbox(toolId: string, agentId: string): Promise<boolean>

  // 内容安全 (与 GovernanceService 融合)
  async scanContent(content: string, context?: ScanContext): Promise<SecurityScanResult>
  async blockContent(pattern: string, reason: string): Promise<void>
  async unblockContent(pattern: string): Promise<void>
  async listBlockedPatterns(): Promise<BlockedPattern[]>

  // 审计日志
  async logAuditEvent(event: AuditEvent): Promise<void>
  async queryAuditLogs(filters: AuditLogFilters): Promise<AuditLog[]>
  async exportAuditLogs(format: 'json' | 'csv', filters?: AuditLogFilters): Promise<string>
}
```

---

### 4.8 Phase H: OpenClawVoiceService (语音服务)

**文件**: `packages/core/src/services/openclaw/openclaw-voice-service.ts`

**职责**: 接入 OpenClaw 的语音唤醒和 Talk Mode 能力。

```typescript
export interface VoiceWakeConfig {
  enabled: boolean
  wakeWords: string[]          // 唤醒词列表 (默认 ['hey claw', 'ok claw'])
  sensitivity: number         // 灵敏度 0-1
  provider: 'system' | 'elevenlabs' | 'custom'
  elevenLabs?: {
    apiKey: string
    voiceId: string
    model: string
  }
  systemTTS?: {
    voice: string
    rate: number
    pitch: number
  }
}

export interface TalkModeConfig {
  enabled: boolean
  pushToTalk?: boolean        // 按住说话模式
  continuous?: boolean        // 连续监听模式
  endpointing: number         // 语音结束检测阈值 ms
  silenceTimeout: number      // 静默超时 ms
  maxDuration: number         // 最大录音时长秒
  language: string            // 语言代码
  asrProvider: 'whisper' | 'google' | 'azure' | 'custom'
  ttsProvider: 'elevenlabs' | 'system' | 'openai' | 'custom'
}

export class OpenClawVoiceService extends EventEmitter {
  private gateway: OpenClawGatewayBridge
  private wakeConfig: VoiceWakeConfig
  private talkConfig: TalkModeConfig

  // 唤醒词管理
  async configureWake(config: Partial<VoiceWakeConfig>): Promise<void>
  async startWakeListening(): Promise<void>
  async stopWakeListening(): Promise<void>
  async addWakeWord(word: string): Promise<void>
  async removeWakeWord(word: string): Promise<void>
  async testWakeWord(word: string): Promise<WakeTestResult>

  // Talk Mode
  async startTalkMode(): Promise<void>
  async stopTalkMode(): Promise<void>
  async sendVoiceAudio(audioData: ArrayBuffer): Promise<VoiceResponse>
  async startVoiceStream(): Promise<MediaStream>
  async stopVoiceStream(): Promise<void>

  // TTS
  async synthesizeSpeech(text: string, options?: TTSOptions): Promise<ArrayBuffer>
  async synthesizeSpeechStream(text: string, options?: TTSOptions): AsyncGenerator<ArrayBuffer>

  // ASR
  async transcribeAudio(audioData: ArrayBuffer): Promise<TranscriptionResult>
  async transcribeStream(stream: ReadableStream): AsyncGenerator<TranscriptionSegment>

  // 事件
  on(event: 'wake:detected', handler: (word: string) => void): this
  on(event: 'voice:input', handler: (audio: ArrayBuffer) => void): this
  on(event: 'voice:text', handler: (text: string) => void): this
  on(event: 'voice:error', handler: (err: Error) => void): this
}
```

---

### 4.9 Phase I: UI 组件设计

#### 4.9.1 OpenClawControlPanel (控制面板)

**文件**: `packages/web/src/components/openclaw/OpenClawControlPanel.tsx`

```
┌─────────────────────────────────────────────────────────────┐
│  🦞 OpenClaw 控制面板                      [—] [□] [×]     │
├─────────────────────────────────────────────────────────────┤
│  [总览] [Agents] [通道] [技能] [工具] [Cron] [配置] [安全]  │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  总览 Tab                                                   │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐      │
│  │ 🟢 网关   │ │ 👥 Agents│ │ 📡 通道  │ │ 🔧 技能  │      │
│  │ Connected │ │ 12 活跃  │ │ 8 在线   │ │ 45 已安装│      │
│  └──────────┘ └──────────┘ └──────────┘ └──────────┘      │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │ 📊 实时活动                                           │   │
│  │ • Telegram @user: "帮我写代码" → dev-agent           │   │
│  │ • 微信 王五: "分析数据" → analyst-agent              │   │
│  │ • WebChat 匿名: "翻译文本" → translate-agent         │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  Agents Tab                                                 │
│  ┌──────────────────────────────────────────────────────┐  │
│  │ [+ 新建 Agent]  [从模板创建]  [导入配置]               │  │
│  ├──────────────────────────────────────────────────────┤  │
│  │ 名称      │ 模型        │ 状态  │ 会话数 │ 操作       │  │
│  │ dev-agent │ gpt-4o      │ 🟢 运行│ 23     │ ⚙️ 🗑️   │  │
│  │ analyst   │ claude-sonnet│ 🟢 运行│ 15     │ ⚙️ 🗑️   │  │
│  │ translator│ deepseek    │ ⏸️ 暂停│ 8      │ ▶️ ⚙️🗑️  │  │
│  └──────────────────────────────────────────────────────┘  │
│                                                             │
│  通道 Tab                                                   │
│  ┌──────────────────────────────────────────────────────┐  │
│  │ [+ 添加通道]                                          │  │
│  ├──────────────────────────────────────────────────────┤  │
│  │ 通道      │ 类型      │ 状态  │ DM策略 │ 消息数      │  │
│  │ wechat-main│ 微信     │ 🟢在线│ pairing│ 1,234      │  │
│  │ telegram  │ Telegram  │ 🟢在线│ open   │ 567        │  │
│  │ discord   │ Discord  │ 🔴离线│ closed │ 0          │  │
│  └──────────────────────────────────────────────────────┘  │
│                                                             │
│  技能 Tab                                                   │
│  ┌──────────────────────────────────────────────────────┐  │
│  │ [从 ClawHub 安装]  [上传 SKILL.md]  [搜索...]         │  │
│  ├──────────────────────────────────────────────────────┤  │
│  │ 技能名称    │ 分类    │ 版本  │ 来源    │ 状态        │  │
│  │ web-search  │ search  │ 1.0.0 │ builtin │ 🟢 启用    │  │
│  │ git-ops     │ code    │ 2.1.0 │ clawhub│ 🟢 启用    │  │
│  │ secret-scan │ security│ 1.0.0 │ custom │ ⏸️ 禁用    │  │
│  └──────────────────────────────────────────────────────┘  │
│                                                             │
│  Cron Tab                                                    │
│  ┌──────────────────────────────────────────────────────┐  │
│  │ [+ 新建定时任务]                                      │  │
│  ├──────────────────────────────────────────────────────┤  │
│  │ 任务名     │ 调度        │ 上次运行 │ 下次运行 │ 操作 │  │
│  │ daily-report│ 0 9 * * * │ 09:00   │ 明天09:00│ ▶️⏸️🗑️│  │
│  │ backup-db  │ 0 3 * * 0 │ 03:00   │ 周日03:00│ ▶️⏸️🗑️│  │
│  └──────────────────────────────────────────────────────┘  │
│                                                             │
│  配置 Tab                                                    │
│  ┌──────────────────────────────────────────────────────┐  │
│  │ 模型: [gpt-4o ▼]   思考等级: [high ▼]                 │  │
│  │ 网关端口: [18789]  WS端口: [18790]                     │  │
│  │ [测试连接]  [保存配置]  [导出 YAML]  [恢复默认]        │  │
│  └──────────────────────────────────────────────────────┘  │
│                                                             │
│  安全 Tab                                                    │
│  ┌──────────────────────────────────────────────────────┐  │
│  │ DM 策略: [pairing ▼]  沙箱: [docker ▼]                │  │
│  │ 待审批配对: 3 个                                       │  │
│  │ ┌────────────────────────────────────────────────┐   │  │
│  │ │ Telegram user123 → 代码: A7X9  [批准] [拒绝]    │   │  │
│  │ │ Discord user456 → 代码: B2K4  [批准] [拒绝]     │   │  │
│  │ └────────────────────────────────────────────────┘   │  │
│  │ [查看审计日志]                                        │  │
│  └──────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
```

#### 4.9.2 OpenClawChatView (多通道聊天视图)

**文件**: `packages/web/src/components/openclaw/OpenClawChatView.tsx`

在现有聊天界面中增加通道选择器和多通道消息展示：

```
┌─────────────────────────────────────────────────────────────┐
│  🦞 OpenClaw 多通道聊天                                     │
├─────────────────────────────────────────────────────────────┤
│  [全部通道] [微信] [Telegram] [Discord] [WebChat] [+]       │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ┌──────────────────────────────────────────────────────┐  │
│  │ 💬 微信 - 王五 (dev-agent)                            │  │
│  │ 你好，帮我看看这个 bug                                 │  │
│  │ ─────────────────────────────────────────────────── │  │
│  │ 🤖 我来帮你分析这个 bug...                             │  │
│  │ [已使用工具: browser, git-status]                      │  │
│  │                                                        │  │
│  │ 💬 Telegram - @alice (analyst-agent)                   │  │
│  │ 请分析 Q1 销售数据                                     │  │
│  │ ─────────────────────────────────────────────────── │  │
│  │ 🤖 正在分析中... [思考中 ████████░░ 80%]               │  │
│  └──────────────────────────────────────────────────────┘  │
│                                                             │
│  ┌──────────────────────────────────────────────────────┐  │
│  │ 发送消息...                    [🎤] [📎] [发送]        │  │
│  └──────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
```

#### 4.9.3 OpenClawSkillEditor (技能编辑器)

**文件**: `packages/web/src/components/openclaw/OpenClawSkillEditor.tsx`

可视化的 SKILL.md 编辑器，支持：
- YAML frontmatter 表单编辑
- Markdown 描述编辑
- 工具参数 Schema 编辑器
- 技能脚本编辑
- 预览与测试

---

## 5. API 路由设计

### 5.1 API 路由清单

| 方法 | 路径 | 服务 | 说明 |
|------|------|------|------|
| GET | `/api/openclaw/status` | GatewayBridge | 网关连接状态 |
| GET | `/api/openclaw/health` | GatewayBridge | 健康检查 |
| GET | `/api/openclaw/config` | ConfigSync | 获取完整配置 |
| PUT | `/api/openclaw/config` | ConfigSync | 更新配置 |
| GET | `/api/openclaw/agents` | AgentManager | Agent 列表 |
| POST | `/api/openclaw/agents` | AgentManager | 创建 Agent |
| GET | `/api/openclaw/agents/:id` | AgentManager | Agent 详情 |
| PUT | `/api/openclaw/agents/:id` | AgentManager | 更新 Agent |
| DELETE | `/api/openclaw/agents/:id` | AgentManager | 删除 Agent |
| POST | `/api/openclaw/agents/:id/chat` | AgentManager | 发送消息 |
| GET | `/api/openclaw/agents/:id/sessions` | AgentManager | 会话列表 |
| POST | `/api/openclaw/agents/:id/sessions` | AgentManager | 创建会话 |
| GET | `/api/openclaw/channels` | ChannelBridge | 通道列表 |
| POST | `/api/openclaw/channels` | ChannelBridge | 添加通道 |
| PUT | `/api/openclaw/channels/:id` | ChannelBridge | 更新通道 |
| DELETE | `/api/openclaw/channels/:id` | ChannelBridge | 删除通道 |
| POST | `/api/openclaw/channels/:id/test` | ChannelBridge | 测试连接 |
| POST | `/api/openclaw/channels/:id/message` | ChannelBridge | 发送消息 |
| GET | `/api/openclaw/skills` | SkillService | 技能列表 |
| POST | `/api/openclaw/skills/install` | SkillService | 安装技能 |
| DELETE | `/api/openclaw/skills/:id` | SkillService | 卸载技能 |
| POST | `/api/openclaw/skills/:id/execute` | SkillService | 执行技能 |
| GET | `/api/openclaw/tools` | ToolBridge | 工具列表 |
| POST | `/api/openclaw/tools/:id/call` | ToolBridge | 调用工具 |
| GET | `/api/openclaw/cron` | ToolBridge (Cron) | Cron 任务列表 |
| POST | `/api/openclaw/cron` | ToolBridge (Cron) | 创建 Cron 任务 |
| GET | `/api/openclaw/security/pairings` | SecurityService | 待审批配对 |
| POST | `/api/openclaw/security/pairings/:code/approve` | SecurityService | 批准配对 |
| GET | `/api/openclaw/security/audit` | SecurityService | 审计日志 |
| GET | `/api/openclaw/voice/status` | VoiceService | 语音状态 |
| POST | `/api/openclaw/voice/wake/test` | VoiceService | 测试唤醒词 |
| WS | `/api/openclaw/events` | GatewayBridge | 事件流 |

---

## 6. 数据流设计

### 6.1 消息流转流程

```
用户 (微信/Telegram/WebChat)
    │
    ▼
OpenClaw Gateway (接收入站消息)
    │
    ▼
OpenClawChannelBridge (消息标准化)
    │
    ▼
OpenClawAgentManager.routeMessage()
    │
    ├── 查找路由规则 → 确定 targetAgent
    ├── 查找/创建 Session
    └── 注入上下文 (AGENTS.md + SOUL.md + TOOLS.md)
    │
    ▼
Agent 执行 (LLM 调用)
    │
    ├── 工具调用 → OpenClawToolBridge.callTool()
    │   ├── browser → 页面操作
    │   ├── canvas → 可视化渲染
    │   ├── cron → 定时任务
    │   └── session → 会话管理
    │
    ├── 技能调用 → OpenClawSkillService.execute()
    │   ├── 搜索技能
    │   ├── 解析参数
    │   └── 执行工具链
    │
    └── 生成响应
    │
    ▼
OpenClawChannelBridge.sendMessage() (回复原通道)
    │
    ▼
用户收到响应
```

### 6.2 技能执行流程

```
用户请求: "搜索最新的 React 19 文档"
    │
    ▼
Agent 解析意图 → 匹配技能: web-search
    │
    ▼
OpenClawSkillService.execute({
  skillId: 'web-search',
  toolName: 'search',
  parameters: { query: 'React 19 documentation', engine: 'google' }
})
    │
    ▼
技能工具链执行:
  1. web-search.search(query) → 搜索结果
  2. browser.navigate(url) → 打开页面
  3. browser.extractText('main') → 提取内容
  4. (可选) rag-service.embed() + store() → 存入知识库
    │
    ▼
返回结构化结果给 Agent
    │
    ▼
Agent 总结并回复用户
```

---

## 7. 与现有系统集成关系

### 7.1 服务依赖图

```
                    ┌─────────────────────┐
                    │  OpenClawGateway    │
                    │      Bridge         │
                    └─────────┬───────────┘
                              │
          ┌───────────────────┼───────────────────┐
          │                   │                   │
          ▼                   ▼                   ▼
┌─────────────────┐ ┌─────────────────┐ ┌─────────────────┐
│ OpenClawAgent   │ │ OpenClawChannel │ │ OpenClawSkill   │
│ Manager         │ │ Bridge          │ │ Service         │
└────────┬────────┘ └────────┬────────┘ └────────┬────────┘
         │                   │                   │
         │          ┌────────▼────────┐          │
         │          │ OpenClawTool    │          │
         │          │ Bridge          │          │
         │          └────────┬────────┘          │
         │                   │                   │
         ▼                   ▼                   ▼
┌─────────────────────────────────────────────────────────┐
│                  现有服务层                                │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  │
│  │AgentBridge   │  │LinkMindService│  │Governance    │  │
│  │Service       │  │              │  │Service       │  │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘  │
│         │                 │                 │          │
│  ┌──────▼───────┐  ┌──────▼───────┐  ┌──────▼───────┐  │
│  │RAG Service   │  │MultimodalSvc │  │MCP Bridge    │  │
│  │EmbeddingSvc  │  │Chat Service  │  │Config Service│  │
│  └──────────────┘  └──────────────┘  └──────────────┘  │
└─────────────────────────────────────────────────────────┘
```

### 7.2 配置融合

```typescript
// 本项目配置扩展
interface DoubaoConfig {
  // ... 现有配置 ...

  openclaw?: {
    enabled: boolean
    gateway: {
      host: string
      port: number
      wsPort: number
      apiKey?: string
    }
    agents?: OpenClawAgentConfig[]
    channels?: OpenClawChannelConfig[]
    skills?: {
      autoDiscover: boolean
      builtinEnabled: boolean
      clawhubSync: boolean
    }
    security?: {
      dmPolicy: DMPairingPolicy
      sandboxMode: SandboxPolicy['mode']
    }
    voice?: {
      wakeWords: string[]
      talkMode: boolean
    }
    sync?: {
      autoPull: boolean
      autoPush: boolean
      intervalMs: number
    }
  }
}
```

---

## 8. 实施阶段规划

### Phase A: 基础桥接层 (P0)

| 任务 | 文件 | 说明 |
|------|------|------|
| A1 | `openclaw-gateway-bridge.ts` | Gateway HTTP/WS 连接 + 心跳 + 状态 |
| A2 | `openclaw-types.ts` | 所有 OpenClaw 相关类型定义 |
| A3 | API 路由: status/health/config | 基础 API 代理 |

### Phase B: Agent 管理 (P0)

| 任务 | 文件 | 说明 |
|------|------|------|
| B1 | `openclaw-agent-manager.ts` | Agent CRUD + 会话管理 |
| B2 | API 路由: agents/* | Agent RESTful API |
| B3 | 增强 `agent-bridge-service.ts` | 继承 OpenClaw Agent 模型 |

### Phase C: 通道桥接 (P0-P1)

| 任务 | 文件 | 说明 |
|------|------|------|
| C1 | `openclaw-channel-bridge.ts` | 25+ 通道抽象层 |
| C2 | API 路由: channels/* | 通道 CRUD + 消息发送 |
| C3 | 通道 UI: ChannelPanel | 通道管理界面 |
| C4 | 重点通道适配器: WebChat/微信/QQ | 高优先级通道实现 |

### Phase D: 技能系统 (P1)

| 任务 | 文件 | 说明 |
|------|------|------|
| D1 | `openclaw-skill-service.ts` | 技能发现/注册/执行 |
| D2 | API 路由: skills/* | 技能 RESTful API |
| D3 | 技能 UI: SkillPanel + SkillEditor | 技能浏览/编辑/测试 |
| D4 | ClawHub 集成 | 技能市场搜索/安装 |
| D5 | 内置技能集 (10+ 核心技能) | chat/search/code/productivity |

### Phase E: 工具桥接 (P1)

| 任务 | 文件 | 说明 |
|------|------|------|
| E1 | `openclaw-tool-bridge.ts` | 浏览器/Canvas/Cron/Session 工具 |
| E2 | API 路由: tools/*, cron/* | 工具调用 API |
| E3 | Cron Dashboard UI | 定时任务管理界面 |

### Phase F: 配置与安全 (P1-P2)

| 任务 | 文件 | 说明 |
|------|------|------|
| F1 | `openclaw-config-sync.ts` | 配置读写/同步/验证 |
| F2 | `openclaw-security-service.ts` | DM配对/沙箱/ACL/审计 |
| F3 | 配置 UI: ConfigEditor | 可视化配置编辑器 |
| F4 | 安全 UI: SecurityDashboard | 配对管理/审计日志 |

### Phase G: 语音增强 (P2)

| 任务 | 文件 | 说明 |
|------|------|------|
| G1 | `openclaw-voice-service.ts` | 唤醒词 + Talk Mode |
| G2 | API 路由: voice/* | 语音 API |
| G3 | 语音 UI: VoiceControlPanel | 语音控制面板 |

### Phase H: UI 集成 (P1)

| 任务 | 文件 | 说明 |
|------|------|------|
| H1 | `OpenClawControlPanel.tsx` | 主控制面板 (8标签页) |
| H2 | `OpenClawChatView.tsx` | 多通道聊天视图 |
| H3 | Sidebar 入口 | 新增「OpenClaw」按钮 |
| H4 | page.tsx 集成 | 状态管理 + 事件监听 |

### Phase I: 编译验证与文档 (P1)

| 任务 | 说明 |
|------|------|
| I1 | Core 包 TypeScript 编译 0 错误 |
| I2 | Web 包 TypeScript 编译 0 错误 |
| I3 | 更新 linkmind_integration_spec.md |
| I4 | 更新 linkmind_integration_tasks.md |
| I5 | 更新 linkmind_integration_checklist.md |

---

## 9. 风险与缓解

| 风险 | 影响 | 缓解措施 |
|------|------|---------|
| OpenClaw Gateway 未部署 | 核心功能不可用 | 提供模拟模式/Mock 数据用于开发调试 |
| 通道 SDK 兼容性 | 某些通道无法连接 | 优先实现 WebChat/HTTP API 层，SDK 作为可选扩展 |
| 技能执行安全性 | 恶意技能可能造成危害 | 沙箱隔离 + 权限审核 + 审计日志 |
| WebSocket 连接稳定性 | 事件流中断 | 自动重连 + 事件缓冲 + 离线队列 |
| 配置冲突 | 双向同步导致覆盖 | 冲突检测 + 版本号 + 手动解决机制 |
| 性能开销 | 大量通道/会话占用资源 | 连接池 + 会话归档 + 懒加载 |

---

## 10. 成功标准

### 功能完整性

- [ ] Gateway 连接/断开/心跳正常
- [ ] Agent 注册/更新/删除/启用/禁用完整
- [ ] 至少 3 个通道 (WebChat/微信/QQ) 可用
- [ ] 技能发现/安装/执行/卸载完整
- [ ] 至少 5 个内置技能可用
- [ ] 浏览器/Cron/会话工具可调用
- [ ] 配置读取/写入/同步/验证可用
- [ ] DM 配对/沙箱/审计功能可用
- [ ] 语音唤醒/Talk Mode 可配置

### 质量标准

- [ ] Core 包 TypeScript 编译 0 错误
- [ ] Web 包 TypeScript 编译 0 错误
- [ ] 所有 API 路由有错误处理
- [ ] 所有服务有日志记录
- [ ] UI 组件响应式布局
- [ ] 文档完整且准确

### 性能指标

- [ ] Gateway 连接建立 < 2s
- [ ] Agent 消息响应 < 5s (首token)
- [ ] 技能执行 < 10s (简单技能)
- [ ] 通道消息延迟 < 500ms
- [ ] 配置同步 < 1s

---

> **文档版本**: v1.0 | **作者**: Trae AI Assistant | **基于**: OpenClaw v2026.x + Doubao Refactored
