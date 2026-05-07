import {
  OpenClawAgentConfig,
  OpenClawSession,
  AgentExecutionOptions,
  AgentResponse,
  StreamChunk,
  RoutingRule,
  RouteDecision,
  SessionCreateOptions,
  AgentFilters,
  SessionFilters,
  ToolCallRecord,
  TokenUsageRecord,
} from './openclaw-types'
import { OpenClawGatewayBridge } from './openclaw-gateway-bridge'
import { GovernanceService } from '../governance-service'

const logger = console

export class OpenClawAgentManager {
  private gateway: OpenClawGatewayBridge
  private agents = new Map<string, OpenClawAgentConfig>()
  private sessions = new Map<string, OpenClawSession>()
  private routingRules: RoutingRule[] = []
  private governance?: GovernanceService

  constructor(gateway: OpenClawGatewayBridge, governance?: GovernanceService) {
    this.gateway = gateway
    this.governance = governance
    this.setupEventListeners()
  }

  setGovernance(governance: GovernanceService): void {
    this.governance = governance
  }

  private setupEventListeners(): void {
    this.gateway.on('session', msg => {
      if (msg.data?.id && msg.data?.agentId) {
        const session: OpenClawSession = { ...msg.data }
        this.sessions.set(session.id, session)
      }
    })
  }

  async registerAgent(agentConfig: OpenClawAgentConfig): Promise<string> {
    if (!agentConfig.id)
      agentConfig.id = `agent_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`
    if (!agentConfig.workspace) agentConfig.workspace = `/workspaces/${agentConfig.id}`
    if (!agentConfig.createdAt) agentConfig.createdAt = Date.now()
    agentConfig.updatedAt = Date.now()

    try {
      await this.gateway.request('POST', '/api/agents', agentConfig)
    } catch (err) {
      logger.warn(`[OpenClawAgent] Gateway register failed, using local mode: ${err}`)
    }

    this.agents.set(agentConfig.id, agentConfig)
    logger.info(`[OpenClawAgent] Registered agent: ${agentConfig.name} (${agentConfig.id})`)
    return agentConfig.id
  }

  async unregisterAgent(id: string): Promise<boolean> {
    try {
      await this.gateway.request('DELETE', `/api/agents/${id}`)
    } catch {
      /* local fallback */
    }

    return this.agents.delete(id)
  }

  async updateAgent(id: string, updates: Partial<OpenClawAgentConfig>): Promise<boolean> {
    const existing = this.agents.get(id)
    if (!existing) return false

    Object.assign(existing, updates, { updatedAt: Date.now() })
    this.agents.set(id, existing)

    try {
      await this.gateway.request('PUT', `/api/agents/${id}`, existing)
    } catch {
      /* local */
    }

    return true
  }

  getAgent(id: string): OpenClawAgentConfig | undefined {
    return this.agents.get(id)
  }

  listAgents(filters?: AgentFilters): OpenClawAgentConfig[] {
    let result = Array.from(this.agents.values())

    if (filters) {
      if (filters.enabled !== undefined) result = result.filter(a => a.enabled === filters.enabled)
      if (filters.model) result = result.filter(a => a.model === filters.model)
      if (filters.channel) result = result.filter(a => a.channels?.includes(filters.channel ?? ''))
    }

    return result.sort((a, b) => (a.name || '').localeCompare(b.name || ''))
  }

  async enableAgent(id: string): Promise<boolean> {
    return this.updateAgent(id, { enabled: true })
  }

  async disableAgent(id: string): Promise<boolean> {
    return this.updateAgent(id, { enabled: false })
  }

  async createSession(agentId: string, options?: SessionCreateOptions): Promise<OpenClawSession> {
    const agent = this.agents.get(agentId)
    if (!agent) throw new Error(`Agent not found: ${agentId}`)

    const session: OpenClawSession = {
      id: `sess_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      agentId,
      channelId: options?.channelId,
      peerId: options?.peerId,
      createdAt: Date.now(),
      updatedAt: Date.now(),
      messageCount: 0,
      tokenUsage: { promptTokens: 0, completionTokens: 0, totalTokens: 0 },
      status: 'active',
      metadata: options?.metadata,
    }

    try {
      const gwSession = await this.gateway.request<any>('POST', '/api/sessions', {
        agentId,
        channelId: options?.channelId,
        peerId: options?.peerId,
      })
      if (gwSession?.id) session.id = gwSession.id
    } catch {
      /* local fallback */
    }

    this.sessions.set(session.id, session)
    return session
  }

  getSession(id: string): OpenClawSession | undefined {
    return this.sessions.get(id)
  }

  listSessions(agentId?: string, filters?: SessionFilters): OpenClawSession[] {
    let result = Array.from(this.sessions.values())
    if (agentId) result = result.filter(s => s.agentId === agentId)

    if (filters) {
      if (filters.status) result = result.filter(s => s.status === filters.status)
      if (filters.minMessages) result = result.filter(s => s.messageCount >= filters.minMessages!)
      if (filters.since) result = result.filter(s => s.updatedAt >= filters.since!)
    }

    return result.sort((a, b) => b.updatedAt - a.updatedAt)
  }

  async sendMessage(
    sessionId: string,
    content: string | Array<{ type: string; text?: string; image_url?: { url: string } }>,
    options?: AgentExecutionOptions
  ): Promise<AgentResponse> {
    const startTime = Date.now()
    const session = this.sessions.get(sessionId)
    if (!session)
      return {
        success: false,
        output: '',
        sessionId,
        agentId: '',
        durationMs: Date.now() - startTime,
        error: `Session not found: ${sessionId}`,
      }

    const agent = this.agents.get(session.agentId)
    if (!agent)
      return {
        success: false,
        output: '',
        sessionId,
        agentId: session.agentId,
        durationMs: Date.now() - startTime,
        error: `Agent not found: ${session.agentId}`,
      }
    if (!agent.enabled)
      return {
        success: false,
        output: '',
        sessionId,
        agentId: session.agentId,
        durationMs: Date.now() - startTime,
        error: `Agent disabled: ${agent.name}`,
      }

    try {
      const payload = {
        sessionId,
        content,
        model: agent.model,
        systemPrompt: agent.systemPrompt,
        temperature: agent.temperature ?? 0.7,
        maxTokens: agent.maxTokens ?? 4096,
        stream: false,
        thinking: options?.thinking || 'off',
        toolCall: options?.toolCall || 'auto',
        tools: agent.tools,
        skills: agent.skills,
        context: options?.context,
      }

      const response = await this.gateway.request<any>('POST', '/api/chat', payload)

      session.messageCount += 2
      session.updatedAt = Date.now()

      if (response.tokenUsage) {
        session.tokenUsage.promptTokens += response.tokenUsage.promptTokens || 0
        session.tokenUsage.completionTokens += response.tokenUsage.completionTokens || 0
        session.tokenUsage.totalTokens += response.tokenUsage.totalTokens || 0
      }

      this.sessions.set(session.id, session)

      const tokenRecord: TokenUsageRecord = {
        model: agent.model,
        promptTokens: response.tokenUsage?.promptTokens || 0,
        completionTokens: response.tokenUsage?.completionTokens || 0,
        totalTokens: response.tokenUsage?.totalTokens || 0,
        latencyMs: Date.now() - startTime,
      }

      this.governance?.recordTokenUsage(tokenRecord)

      return {
        success: true,
        output: response.output || response.content || response.text || '',
        sessionId,
        agentId: session.agentId,
        tokenUsage: response.tokenUsage,
        durationMs: Date.now() - startTime,
        toolCalls: response.toolCalls as ToolCallRecord[] | undefined,
      }
    } catch (err: any) {
      return {
        success: false,
        output: '',
        sessionId,
        agentId: session.agentId,
        durationMs: Date.now() - startTime,
        error: err.message,
      }
    }
  }

  async *streamMessage(
    sessionId: string,
    content: string | Array<{ type: string; text?: string; image_url?: { url: string } }>,
    options?: AgentExecutionOptions
  ): AsyncGenerator<StreamChunk> {
    const session = this.sessions.get(sessionId)
    if (!session) {
      yield { type: 'error', error: `Session not found: ${sessionId}` }
      return
    }

    const agent = this.agents.get(session.agentId)
    if (!agent) {
      yield { type: 'error', error: `Agent not found: ${session.agentId}` }
      return
    }

    if (!agent.enabled) {
      yield { type: 'error', error: `Agent disabled: ${agent.name}` }
      return
    }

    const payload = {
      sessionId,
      content,
      model: agent.model,
      systemPrompt: agent.systemPrompt,
      temperature: agent.temperature ?? 0.7,
      maxTokens: agent.maxTokens ?? 4096,
      stream: true,
      thinking: options?.thinking || 'off',
      toolCall: options?.toolCall || 'auto',
      tools: agent.tools,
      skills: agent.skills,
      context: options?.context,
    }

    try {
      for await (const chunk of this.gateway.stream('/api/chat/stream', payload)) {
        yield chunk
      }

      session.messageCount += 2
      session.updatedAt = Date.now()
      this.sessions.set(session.id, session)
    } catch (err: any) {
      yield { type: 'error', error: err.message }
    }
  }

  async resetSession(id: string): Promise<boolean> {
    const session = this.sessions.get(id)
    if (!session) return false

    session.messageCount = 0
    session.tokenUsage = { promptTokens: 0, completionTokens: 0, totalTokens: 0 }
    session.status = 'active'
    session.updatedAt = Date.now()
    this.sessions.set(id, session)

    try {
      await this.gateway.request('POST', `/api/sessions/${id}/reset`)
    } catch {
      /* local */
    }

    return true
  }

  async compactSession(id: string): Promise<boolean> {
    const session = this.sessions.get(id)
    if (!session) return false

    try {
      await this.gateway.request('POST', `/api/sessions/${id}/compact`)
    } catch {
      /* local fallback - simulate compaction */
    }

    session.status = 'active'
    session.updatedAt = Date.now()
    this.sessions.set(id, session)
    return true
  }

  async archiveSession(id: string): Promise<boolean> {
    const session = this.sessions.get(id)
    if (!session) return false

    session.status = 'archived'
    session.updatedAt = Date.now()
    this.sessions.set(id, session)

    try {
      await this.gateway.request('PUT', `/api/sessions/${id}`, { status: 'archived' })
    } catch {
      /* local */
    }

    return true
  }

  async deleteSession(id: string): Promise<boolean> {
    try {
      await this.gateway.request('DELETE', `/api/sessions/${id}`)
    } catch {
      /* local */
    }

    return this.sessions.delete(id)
  }

  async getWorkspaceFiles(
    agentId: string,
    path?: string
  ): Promise<Array<{ path: string; name: string; type: string; size?: number }>> {
    try {
      return await this.gateway.request<any[]>('GET', `/api/agents/${agentId}/workspace/files`, {
        path,
      } as any)
    } catch {
      return []
    }
  }

  async updateWorkspaceFile(agentId: string, filePath: string, content: string): Promise<boolean> {
    try {
      await this.gateway.request('PUT', `/api/agents/${agentId}/workspace/files`, {
        path: filePath,
        content,
      })
      return true
    } catch {
      return false
    }
  }

  setRoutingRule(rule: RoutingRule): void {
    const idx = this.routingRules.findIndex(r => r.id === rule.id)
    if (idx >= 0) {
      this.routingRules[idx] = rule
    } else {
      this.routingRules.push(rule)
    }
    this.routingRules.sort((a, b) => b.priority - a.priority)
  }

  getRoutingRules(): RoutingRule[] {
    return [...this.routingRules]
  }

  routeMessage(channelId: string, peerId: string, _content: string): RouteDecision {
    for (const rule of this.routingRules) {
      if (!rule.enabled) continue

      const channelMatch = !rule.condition.channelId || rule.condition.channelId === channelId
      const peerMatch =
        !rule.condition.peerPattern || new RegExp(rule.condition.peerPattern).test(peerId)

      if (channelMatch && peerMatch) {
        return {
          agentId: rule.targetAgentId,
          sessionId: '',
          ruleMatched: rule.id,
          confidence: rule.priority / 100,
          reasoning: `Matched routing rule "${rule.id}"`,
        }
      }
    }

    const defaultAgent = Array.from(this.agents.values()).find(a => a.enabled)
    if (defaultAgent) {
      return {
        agentId: defaultAgent.id,
        sessionId: '',
        confidence: 0.1,
        reasoning: 'No rule matched, using first available agent',
      }
    }

    return {
      agentId: '',
      sessionId: '',
      confidence: 0,
      reasoning: 'No available agents',
    }
  }
}

let agentManagerInstance: OpenClawAgentManager | null = null

export function getOpenClawAgentManager(
  gateway?: OpenClawGatewayBridge,
  governance?: GovernanceService
): OpenClawAgentManager {
  if (!agentManagerInstance) {
    const gw =
      gateway ||
      (() => {
        const { getOpenClawGateway: g } = require('./openclaw-gateway-bridge')
        return g()
      })()
    agentManagerInstance = new OpenClawAgentManager(gw, governance)
  }
  return agentManagerInstance
}
