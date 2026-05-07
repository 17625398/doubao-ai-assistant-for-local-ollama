export type {
  OpenClawAgentConfig,
  OpenClawChannelConfig,
  OpenClawSkill,
  OpenClawToolDefinition,
  CronJob,
  OpenClawChannelType,
  AccessControlEntry,
} from '@ai-intelligent-analysis-platform/core'

export interface GatewayStatus {
  connected: boolean
  version?: string
  uptime?: number
  activeSessions?: number
  startTime?: number
}

export { CHANNEL_LABELS, CHANNEL_ICONS } from '@ai-intelligent-analysis-platform/core'
