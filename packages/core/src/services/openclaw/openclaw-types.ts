export interface OpenClawGatewayConfig {
  host: string
  port: number
  wsPort: number
  apiKey?: string
  timeout: number
  reconnect: boolean
  maxRetries: number
}

export const DEFAULT_GATEWAY_CONFIG: OpenClawGatewayConfig = {
  host: 'localhost',
  port: 18789,
  wsPort: 18790,
  timeout: 30000,
  reconnect: true,
  maxRetries: 5,
}

export interface GatewayStatus {
  connected: boolean
  version: string
  uptime: number
  channels: number
  agents: number
  activeSessions: number
  lastHeartbeat: number
  error?: string
}

export type OpenClawChannelType =
  | 'whatsapp'
  | 'telegram'
  | 'slack'
  | 'discord'
  | 'google-chat'
  | 'signal'
  | 'imessage'
  | 'bluebubbles'
  | 'irc'
  | 'microsoft-teams'
  | 'matrix'
  | 'feishu'
  | 'line'
  | 'mattermost'
  | 'nextcloud-talk'
  | 'nostr'
  | 'synology-chat'
  | 'tlon'
  | 'twitch'
  | 'zalo'
  | 'zalo-personal'
  | 'wechat'
  | 'qq'
  | 'webchat'

export const CHANNEL_LABELS: Record<OpenClawChannelType, string> = {
  whatsapp: 'WhatsApp',
  telegram: 'Telegram',
  slack: 'Slack',
  discord: 'Discord',
  'google-chat': 'Google Chat',
  signal: 'Signal',
  imessage: 'iMessage',
  bluebubbles: 'BlueBubbles',
  irc: 'IRC',
  'microsoft-teams': 'Microsoft Teams',
  matrix: 'Matrix',
  feishu: '飞书',
  line: 'LINE',
  mattermost: 'Mattermost',
  'nextcloud-talk': 'Nextcloud Talk',
  nostr: 'Nostr',
  'synology-chat': 'Synology Chat',
  tlon: 'Tlon',
  twitch: 'Twitch',
  zalo: 'Zalo',
  'zalo-personal': 'Zalo Personal',
  wechat: '微信',
  qq: 'QQ',
  webchat: 'WebChat',
}

export const CHANNEL_ICONS: Record<OpenClawChannelType, string> = {
  whatsapp: '💬',
  telegram: '✈️',
  slack: '💼',
  discord: '🎮',
  'google-chat': '📧',
  signal: '🔒',
  imessage: '🍏',
  bluebubbles: '🫧',
  irc: '📡',
  'microsoft-teams': '🟦',
  matrix: '🌐',
  feishu: '🐦',
  line: '💚',
  mattermost: '💬',
  'nextcloud-talk': '☁️',
  nostr: '👃',
  'synology-chat': '💾',
  tlon: '🔷',
  twitch: '🎬',
  zalo: '🟦',
  'zalo-personal': '🟦',
  wechat: '💚',
  qq: '🐧',
  webchat: '🌐',
}

export interface Attachment {
  id: string
  type: 'image' | 'file' | 'voice' | 'video' | 'sticker'
  url?: string
  data?: ArrayBuffer
  mimeType: string
  name?: string
  size?: number
}

export interface OpenClawChannelConfig {
  id: string
  type: OpenClawChannelType
  name: string
  enabled: boolean
  dmPolicy: DMPairingPolicy['mode']
  allowFrom?: string[]
  agentId?: string
  config: Record<string, any>
  status: ChannelConnectionStatus
  lastActivity?: number
  messageCount?: number
  createdAt: number
  updatedAt: number
}

export type ChannelConnectionStatus = 'connected' | 'disconnected' | 'error' | 'pending'

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

export interface AgentSandboxConfig {
  mode: 'none' | 'docker' | 'ssh' | 'openshell'
  allowTools: string[]
  denyTools: string[]
}

export interface OpenClawAgentConfig {
  id: string
  name: string
  description?: string
  workspace: string
  model: string
  systemPrompt?: string
  soulMd?: string
  tools?: string[]
  skills?: string[]
  temperature?: number
  maxTokens?: number
  sandbox?: AgentSandboxConfig
  channels?: string[]
  enabled: boolean
  createdAt?: number
  updatedAt?: number
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
  status: SessionStatus
  metadata?: Record<string, any>
}

export type SessionStatus = 'active' | 'idle' | 'archived' | 'error'

export interface AgentExecutionOptions {
  stream?: boolean
  thinking?: 'off' | 'low' | 'medium' | 'high'
  verbose?: boolean
  trace?: boolean
  usage?: 'off' | 'tokens' | 'full'
  toolCall?: 'auto' | 'required' | 'disabled'
  context?: Record<string, any>
}

export interface AgentResponse {
  success: boolean
  output: string
  sessionId: string
  agentId: string
  tokenUsage?: {
    promptTokens: number
    completionTokens: number
    totalTokens: number
  }
  durationMs: number
  toolCalls?: ToolCallRecord[]
  error?: string
}

export interface ToolCallRecord {
  tool: string
  input: Record<string, any>
  output: string
  durationMs: number
  success: boolean
}

export interface StreamChunk {
  type: 'text' | 'tool_call' | 'token_usage' | 'done' | 'error'
  content?: string
  data?: any
  error?: string
}

export interface DMPairingPolicy {
  mode: 'pairing' | 'open' | 'closed'
  autoApprove?: string[]
  codeLength?: number
  codeTTL?: number
}

export interface PairingCode {
  code: string
  channelId: string
  peerId?: string
  createdAt: number
  expiresAt: number
  approved: boolean
}

export interface PendingPairingRequest {
  channelId: string
  peerId: string
  peerName: string
  code: string
  requestedAt: number
}

export interface PeerInfo {
  peerId: string
  name: string
  addedAt: number
  addedBy?: string
}

export interface SandboxPolicy {
  mode: 'none' | 'docker' | 'ssh' | 'openshell'
  defaultAllow?: string[]
  defaultDeny?: string[]
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

export interface AccessDecision {
  allowed: boolean
  role?: string
  reason?: string
}

export interface SkillParameterSchema {
  name: string
  type: 'string' | 'number' | 'boolean' | 'array' | 'object'
  description: string
  required?: boolean
  default?: any
  enum?: any[]
}

export interface SkillToolDefinition {
  name: string
  description: string
  parameters: SkillParameterSchema[]
  handlerRef?: string
  requiresAuth?: boolean
  rateLimit?: RateLimitConfig
}

export interface RateLimitConfig {
  maxRequests: number
  windowMs: number
}

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
  agents?: Record<string, any>
  scripts?: ScriptDefinition[]
  metadata?: Record<string, any>
  enabled: boolean
  installedAt?: number
  updatedAt?: number
}

export interface ScriptDefinition {
  name: string
  language: 'javascript' | 'typescript' | 'bash' | 'python'
  path: string
  entryPoint?: string
}

export interface SkillExecutionContext {
  sessionId?: string
  agentId?: string
  channelId?: string
  peerId?: string
  userId?: string
  variables?: Record<string, any>
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

export interface ExecutionStep {
  step: number
  tool: string
  input: Record<string, any>
  output: any
  durationMs: number
  success: boolean
}

export interface ClawHubSkill {
  id: string
  name: string
  description: string
  author: string
  version: string
  category: string
  downloads: number
  rating: number
  installed?: boolean
}

export interface OpenClawToolDefinition {
  id: string
  name: string
  category: 'browser' | 'canvas' | 'cron' | 'sessions' | 'nodes' | 'custom'
  description: string
  parameters: SkillParameterSchema[]
  requiresSandbox?: boolean
  dangerous?: boolean
  rateLimit?: RateLimitConfig
}

export interface CronSchedule {
  expression: string
  timezone?: string
  description?: string
}

export interface CronAction {
  type: 'message' | 'tool' | 'skill' | 'webhook'
  target: string
  payload?: Record<string, any>
}

export interface CronJob {
  id: string
  name: string
  schedule: CronSchedule
  action: CronAction
  agentId?: string
  enabled: boolean
  createdAt: number
  updatedAt: number
  lastRunAt?: number
  nextRunAt?: number
  runCount: number
  errorCount: number
  metadata?: {
    history?: CronRunHistory[]
    [key: string]: any
  }
}

export interface CronRunResult {
  runId: string
  jobId: string
  startedAt: number
  completedAt: number
  success: boolean
  output?: any
  error?: string
  durationMs: number
}

export interface CronRunHistory {
  runId: string
  jobId: string
  startedAt: number
  completedAt: number
  success: boolean
  durationMs: number
  outputSummary?: string
  error?: string
}

export interface VoiceWakeConfig {
  enabled: boolean
  wakeWords: string[]
  sensitivity: number
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
  pushToTalk?: boolean
  continuous?: boolean
  endpointing: number
  silenceTimeout: number
  maxDuration: number
  language: string
  asrProvider: 'whisper' | 'google' | 'azure' | 'custom'
  ttsProvider: 'elevenlabs' | 'system' | 'openai' | 'custom'
}

export interface OpenClawTTSOptions {
  voice?: string
  rate?: number
  pitch?: number
  format?: 'mp3' | 'wav' | 'ogg'
}

export interface TranscriptionResult {
  text: string
  confidence: number
  language: string
  durationMs: number
  error?: string
  segments?: TranscriptionSegment[]
}

export interface TranscriptionSegment {
  text: string
  startTime: number
  endTime: number
  confidence: number
}

export interface WakeTestResult {
  matched: boolean
  word: string
  confidence: number
  latencyMs: number
}

export interface VoiceResponse {
  text: string
  audio?: ArrayBuffer
  toolCalls?: ToolCallRecord[]
}

export interface ConnectionTestResult {
  connected: boolean
  latency: number
  error?: string
  info?: Record<string, any>
}

export interface MessageSendResult {
  success: boolean
  messageId?: string
  channel: OpenClawChannelType
  error?: string
  latencyMs?: number
}

export interface ApprovalResult {
  approved: boolean
  peerId: string
  code: string
  approvedAt: number
  approvedBy?: string
}

export interface RoutingRule {
  id: string
  priority: number
  condition: {
    channelId?: string
    peerPattern?: string
    contentType?: string
  }
  targetAgentId: string
  fallbackAgentId?: string
  enabled: boolean
}

export interface RouteDecision {
  agentId: string
  sessionId: string
  ruleMatched?: string
  confidence: number
  reasoning: string
}

export interface WorkspaceFile {
  path: string
  name: string
  type: 'file' | 'directory'
  size?: number
  modifiedAt: number
  content?: string
}

export interface SessionCreateOptions {
  channelId?: string
  peerId?: string
  metadata?: Record<string, any>
}

export interface AgentFilters {
  enabled?: boolean
  type?: string
  model?: string
  channel?: string
}

export interface SessionFilters {
  status?: SessionStatus
  minMessages?: number
  since?: number
}

export interface SkillFilter {
  category?: string
  source?: OpenClawSkill['source']
  enabled?: boolean
  keyword?: string
}

export interface DependencyResolution {
  skillId: string
  dependencies: Array<{ skillId: string; version: string; satisfied: boolean }>
  missing: string[]
  circular: boolean
}

export interface SkillHealthReport {
  skillId: string
  healthy: boolean
  issues: string[]
  lastExecutedAt?: number
  avgExecutionTimeMs?: number
  successRate?: number
}

export interface SecurityScanResult {
  safe: boolean
  riskLevel: 'low' | 'medium' | 'high' | 'critical'
  matches: Array<{
    pattern: string
    type: 'regex' | 'keyword' | 'pii'
    match: string
    position: { start: number; end: number }
  }>
  blockedPatterns: string[]
}

export interface BlockedPattern {
  id: string
  pattern: string
  type: 'regex' | 'keyword' | 'pii'
  reason: string
  createdBy: string
  createdAt: number
  enabled: boolean
}

export interface AuditEvent {
  eventType: 'pairing' | 'access' | 'config' | 'tool' | 'content' | 'auth'
  action: string
  resourceId: string
  userId?: string
  details: Record<string, any>
  timestamp: number
  ip?: string
}

interface AuditLogFilters {
  eventType?: AuditEvent['eventType']
  action?: string
  resourceId?: string
  userId?: string
  since?: number
  until?: number
  limit?: number
}

export interface ValidationResult {
  valid: boolean
  errors: Array<{ path: string; message: string }>
  warnings: Array<{ path: string; message: string }>
}

export interface ConfigChangeCallback {
  section: string
  oldValue: any
  newValue: any
  timestamp: number
}

export interface Snapshot {
  id: string
  label: string
  config: any
  createdAt: number
  size: number
}

export interface RestoreResult {
  restored: boolean
  snapshotId: string
  previousSnapshotId?: string
  restoredAt: number
}

export interface SyncResult {
  success: boolean
  pulledAt: number
  pushedAt: number
  conflicts: Array<{ path: string; local: any; remote: any }>
  errors: string[]
}

export interface ImportResult {
  imported: boolean
  warnings: string[]
  errors: string[]
  appliedSections: string[]
}

export interface TokenUsageRecord {
  model: string
  promptTokens: number
  completionTokens: number
  totalTokens: number
  cost?: number
  latencyMs: number
}
