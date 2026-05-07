import { logger } from '../utils/logger'
import { linkMindService, type LinkMindServiceConfig } from './linkmind-service'
import { governanceService } from './governance-service'

export interface AgentConfig {
  id: string
  name: string
  description?: string
  type: 'openclaw' | 'hermes' | 'deerflow' | 'custom'
  model: string
  systemPrompt?: string
  temperature?: number
  maxTokens?: number
  tools?: string[]
  enabled: boolean
  metadata?: Record<string, any>
}

export interface AgentExecutionRequest {
  agentId: string
  input: string
  context?: Record<string, any>
  stream?: boolean
}

export interface AgentExecutionResult {
  success: boolean
  output: string
  steps?: Array<{
    tool: string
    input: Record<string, any>
    output: string
    durationMs: number
  }>
  tokenUsage?: {
    promptTokens: number
    completionTokens: number
    totalTokens: number
  }
  durationMs: number
  error?: string
}

export interface AgentSyncResult {
  source: string
  syncedAt: number
  agentsAdded: number
  agentsUpdated: number
  agentsRemoved: number
  errors: string[]
}

export interface AgentBridgeServiceConfig extends Partial<LinkMindServiceConfig> {
  agentsEndpoint?: string
  autoSyncInterval?: number
  maxConcurrentExecutions?: number
  executionTimeout?: number
}

const DEFAULT_CONFIG = {
  agentsEndpoint: '/agents',
  autoSyncInterval: 0,
  maxConcurrentExecutions: 3,
  executionTimeout: 120000,
}

type AgentStatus = 'idle' | 'running' | 'error' | 'disabled'

class AgentInstance {
  public config: AgentConfig
  public status: AgentStatus = 'idle'
  public lastRunAt: number | null = null
  public lastDurationMs: number | null = null
  public runCount: number = 0
  public lastError: string | null = null

  constructor(config: AgentConfig) {
    this.config = config
  }

  get id() {
    return this.config.id
  }
  get name() {
    return this.config.name
  }
  get enabled() {
    return this.config.enabled
  }
}

export class AgentBridgeService {
  private config: Required<Omit<AgentBridgeServiceConfig, keyof LinkMindServiceConfig>>
  private agents = new Map<string, AgentInstance>()
  private activeExecutions = new Set<string>()
  private syncTimer: ReturnType<typeof setInterval> | null = null

  constructor(config: AgentBridgeServiceConfig = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config } as any

    if (this.config.autoSyncInterval > 0) {
      this.syncTimer = setInterval(() => this.syncAgents(), this.config.autoSyncInterval)
    }
  }

  updateConfig(updates: Partial<AgentBridgeServiceConfig>): void {
    Object.assign(this.config, updates)
  }

  async registerAgent(agentConfig: AgentConfig): Promise<boolean> {
    const existing = this.agents.get(agentConfig.id)

    if (existing) {
      existing.config = { ...existing.config, ...agentConfig }
      logger.info(`[AgentBridge] Updated agent: ${agentConfig.name}`)
    } else {
      this.agents.set(agentConfig.id, new AgentInstance(agentConfig))
      logger.info(`[AgentBridge] Registered agent: ${agentConfig.name} (${agentConfig.type})`)
    }

    return true
  }

  unregisterAgent(agentId: string): boolean {
    const removed = this.agents.delete(agentId)
    if (removed) logger.info(`[AgentBridge] Unregistered agent: ${agentId}`)
    return removed
  }

  listAgents(): AgentConfig[] {
    return Array.from(this.agents.values()).map(a => a.config)
  }

  getAgent(agentId: string): AgentConfig | undefined {
    return this.agents.get(agentId)?.config
  }

  getAgentStatus(
    agentId: string
  ):
    | { status: AgentStatus; runCount: number; lastRunAt: number | null; lastError: string | null }
    | undefined {
    const instance = this.agents.get(agentId)
    if (!instance) return undefined
    return {
      status: instance.status,
      runCount: instance.runCount,
      lastRunAt: instance.lastRunAt,
      lastError: instance.lastError,
    }
  }

  async execute(request: AgentExecutionRequest): Promise<AgentExecutionResult> {
    const startTime = Date.now()
    const instance = this.agents.get(request.agentId)

    if (!instance) {
      return {
        success: false,
        output: '',
        durationMs: Date.now() - startTime,
        error: `Agent not found: ${request.agentId}`,
      }
    }

    if (!instance.enabled) {
      return {
        success: false,
        output: '',
        durationMs: Date.now() - startTime,
        error: `Agent disabled: ${instance.config.name}`,
      }
    }

    if (this.activeExecutions.size >= this.config.maxConcurrentExecutions) {
      return {
        success: false,
        output: '',
        durationMs: Date.now() - startTime,
        error: 'Too many concurrent executions',
      }
    }

    const execId = `${request.agentId}:${Date.now()}`
    this.activeExecutions.add(execId)
    instance.status = 'running'

    try {
      logger.info(
        `[AgentBridge] execute() → ${instance.config.name}, input=${request.input.slice(0, 100)}...`
      )

      const response = await linkMindService.request<any>(
        `${this.config.agentsEndpoint}/${request.agentId}/execute`,
        {
          method: 'POST',
          body: JSON.stringify({
            input: request.input,
            context: request.context || {},
            stream: request.stream || false,
          }),
          signal: AbortSignal.timeout(this.config.executionTimeout),
        }
      )

      const durationMs = Date.now() - startTime
      instance.status = 'idle'
      instance.lastRunAt = Date.now()
      instance.lastDurationMs = durationMs
      instance.runCount++

      if (response.tokenUsage) {
        governanceService.recordTokenUsage({
          model: instance.config.model,
          promptTokens: response.tokenUsage.promptTokens || 0,
          completionTokens: response.tokenUsage.completionTokens || 0,
          totalTokens: response.tokenUsage.totalTokens || 0,
          cost: governanceService.calculateCost(
            instance.config.model,
            response.tokenUsage.promptTokens || 0,
            response.tokenUsage.completionTokens || 0
          ),
          latencyMs: durationMs,
        })
      }

      logger.info(`[AgentBridge] execute() done in ${durationMs}ms`)

      return {
        success: !response.error && !!response.output,
        output: response.output || '',
        steps: response.steps,
        tokenUsage: response.tokenUsage,
        durationMs,
        error: response.error,
      }
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error)
      instance.status = 'error'
      instance.lastError = msg
      logger.error(`[AgentBridge] execute(${request.agentId}) error:`, msg)
      return { success: false, output: '', durationMs: Date.now() - startTime, error: msg }
    } finally {
      this.activeExecutions.delete(execId)
    }
  }

  async executeByName(
    agentName: string,
    input: string,
    context?: Record<string, any>
  ): Promise<AgentExecutionResult> {
    let targetAgent: AgentInstance | undefined
    for (const agent of this.agents.values()) {
      if (agent.config.name === agentName) {
        targetAgent = agent
        break
      }
    }

    if (!targetAgent) {
      return {
        success: false,
        output: '',
        durationMs: 0,
        error: `Agent not found by name: ${agentName}`,
      }
    }

    return this.execute({ agentId: targetAgent.id, input, context })
  }

  async syncAgents(source?: string): Promise<AgentSyncResult> {
    const startTime = Date.now()
    const errors: string[] = []
    let agentsAdded = 0
    let agentsUpdated = 0
    let agentsRemoved = 0

    try {
      const endpoint = source
        ? `${this.config.agentsEndpoint}?source=${source}`
        : `${this.config.agentsEndpoint}/sync`
      const response = await linkMindService.request<any>(endpoint, { method: 'POST' })

      if (response.agents && Array.isArray(response.agents)) {
        const incomingIds = new Set<string>()

        for (const agentData of response.agents) {
          incomingIds.add(agentData.id)
          const existing = this.agents.get(agentData.id)

          if (existing) {
            existing.config = { ...existing.config, ...agentData }
            agentsUpdated++
          } else {
            this.agents.set(agentData.id, new AgentInstance(agentData))
            agentsAdded++
          }
        }

        for (const [id, agent] of this.agents) {
          if (!incomingIds.has(id)) {
            this.agents.delete(id)
            agentsRemoved++
          }
        }
      }
    } catch (err) {
      errors.push(err instanceof Error ? err.message : String(err))
    }

    const result: AgentSyncResult = {
      source: source || 'default',
      syncedAt: Date.now(),
      agentsAdded,
      agentsUpdated,
      agentsRemoved,
      errors,
    }

    logger.info(
      `[AgentBridge] syncAgents() done in ${Date.now() - startTime}ms: +${agentsAdded} ~${agentsUpdated} -${agentsRemoved}`
    )

    return result
  }

  searchAgents(query: string): AgentConfig[] {
    const q = query.toLowerCase()
    return this.listAgents().filter(
      a =>
        a.name.toLowerCase().includes(q) ||
        a.id.toLowerCase().includes(q) ||
        (a.description || '').toLowerCase().includes(q) ||
        a.type.toLowerCase().includes(q)
    )
  }

  getAllStatuses(): Array<{
    id: string
    name: string
    type: string
    status: AgentStatus
    enabled: boolean
    runCount: number
    lastRunAt: number | null
  }> {
    return Array.from(this.agents.values()).map(a => ({
      id: a.config.id,
      name: a.config.name,
      type: a.config.type,
      status: a.status,
      enabled: a.config.enabled,
      runCount: a.runCount,
      lastRunAt: a.lastRunAt,
    }))
  }

  enableAgent(agentId: string): boolean {
    const agent = this.agents.get(agentId)
    if (!agent) return false
    agent.config.enabled = true
    return true
  }

  disableAgent(agentId: string): boolean {
    const agent = this.agents.get(agentId)
    if (!agent) return false
    agent.config.enabled = false
    agent.status = 'disabled'
    return true
  }

  destroy(): void {
    if (this.syncTimer) {
      clearInterval(this.syncTimer)
      this.syncTimer = null
    }
    this.agents.clear()
    this.activeExecutions.clear()
  }
}

export const agentBridgeService = new AgentBridgeService()
