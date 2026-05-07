import { logger } from '../utils/logger'
import { linkMindService, type LinkMindServiceConfig } from './linkmind-service'

export interface MCPServerConfig {
  id: string
  name: string
  type: 'stdio' | 'sse' | 'streamable-http'
  command?: string
  args?: string[]
  url?: string
  headers?: Record<string, string>
  env?: Record<string, string>
  enabled: boolean
}

export interface MCPTool {
  name: string
  description?: string
  inputSchema: Record<string, any>
  serverId: string
  serverName: string
}

export interface MCPToolCallRequest {
  toolName: string
  serverId: string
  arguments: Record<string, any>
}

export interface MCPToolCallResult {
  success: boolean
  content: Array<{ type: string; text?: string }>
  isError?: boolean
  raw?: any
  error?: string
}

export interface MCPCapability {
  tools: boolean
  resources: boolean
  prompts: boolean
  sampling: boolean
  roots: boolean
}

export interface MCPListToolsResponse {
  tools: Array<{
    name: string
    description?: string
    inputSchema: Record<string, any>
  }>
}

export interface MCPResource {
  uri: string
  name: string
  mimeType?: string
  description?: string
}

export interface MCPBridgeServiceConfig extends Partial<LinkMindServiceConfig> {
  mcpEndpoint?: string
  defaultTimeout?: number
  maxConcurrentCalls?: number
  autoReconnect?: boolean
  reconnectInterval?: number
}

const DEFAULT_CONFIG = {
  mcpEndpoint: '/mcp',
  defaultTimeout: 30000,
  maxConcurrentCalls: 5,
  autoReconnect: true,
  reconnectInterval: 5000,
}

type ConnectionStatus = 'disconnected' | 'connecting' | 'connected' | 'error'

class MCPConnection {
  public status: ConnectionStatus = 'disconnected'
  public lastError: string | null = null
  public lastConnectedAt: number | null = null
  private config: MCPServerConfig

  constructor(config: MCPServerConfig) {
    this.config = config
  }

  get id() { return this.config.id }
  get name() { return this.config.name }
  get enabled() { return this.config.enabled }

  setStatus(status: ConnectionStatus, error?: string) {
    this.status = status
    if (error) this.lastError = error
    if (status === 'connected') {
      this.lastConnectedAt = Date.now()
      this.lastError = null
    }
  }
}

export class MCPBridgeService {
  private config: Required<Omit<MCPBridgeServiceConfig, keyof LinkMindServiceConfig>> & Pick<MCPBridgeServiceConfig, 'mcpEndpoint'>
  private connections = new Map<string, MCPConnection>()
  private toolCache = new Map<string, MCPTool[]>()
  private activeCalls = new Set<string>()

  constructor(config: MCPBridgeServiceConfig = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config }
  }

  async addServer(serverConfig: MCPServerConfig): Promise<boolean> {
    const conn = new MCPConnection(serverConfig)
    conn.setStatus('connecting')

    try {
      logger.info(`[MCPBridge] Adding server: ${serverConfig.name} (${serverConfig.type})`)

      const response = await linkMindService.request<any>(`${this.config.mcpEndpoint}/servers`, {
        method: 'POST',
        body: JSON.stringify(serverConfig),
      })

      if (response.success || response.id || response.ok !== false) {
        conn.setStatus('connected')
        this.connections.set(serverConfig.id, conn)

        await this.refreshTools(serverConfig.id)
        logger.info(`[MCPBridge] Server connected: ${serverConfig.name}`)
        return true
      } else {
        conn.setStatus('error', response.error || 'Failed to connect')
        return false
      }
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error)
      conn.setStatus('error', msg)
      logger.error(`[MCPBridge] Failed to add server ${serverConfig.name}:`, msg)
      return false
    }
  }

  async removeServer(serverId: string): Promise<void> {
    try {
      await linkMindService.request(`${this.config.mcpEndpoint}/servers/${serverId}`, { method: 'DELETE' })
    } catch {}

    this.connections.delete(serverId)
    this.toolCache.delete(serverId)
    logger.info(`[MCPBridge] Server removed: ${serverId}`)
  }

  async listServers(): Promise<MCPServerConfig[]> {
    try {
      const response = await linkMindService.request<any>(`${this.config.mcpEndpoint}/servers`)
      return Array.isArray(response.servers) ? response.servers : []
    } catch {
      return Array.from(this.connections.values()).map((c) => ({
        id: c.id,
        name: c.name,
        type: 'stdio' as const,
        enabled: c.enabled,
      }))
    }
  }

  async listAllTools(refresh = false): Promise<MCPTool[]> {
    if (!refresh && this.toolCache.size > 0) {
      const all: MCPTool[] = []
      for (const tools of this.toolCache.values()) all.push(...tools)
      return all
    }

    const allTools: MCPTool[] = []
    for (const [serverId, conn] of this.connections) {
      if (!conn.enabled) continue
      try {
        const tools = await this.listTools(serverId)
        allTools.push(...tools)
      } catch {}
    }
    return allTools
  }

  async listTools(serverId: string): Promise<MCPTool[]> {
    const cached = this.toolCache.get(serverId)
    if (cached) return cached

    return this.refreshTools(serverId)
  }

  async refreshTools(serverId: string): Promise<MCPTool[]> {
    const conn = this.connections.get(serverId)
    if (!conn) throw new Error(`Server not found: ${serverId}`)

    try {
      const response = await linkMindService.request<MCPListToolsResponse>(
        `${this.config.mcpEndpoint}/servers/${serverId}/tools`
      )

      const tools: MCPTool[] = (response.tools || []).map((t) => ({
        ...t,
        serverId,
        serverName: conn.name,
      }))

      this.toolCache.set(serverId, tools)
      return tools
    } catch (error) {
      logger.error(`[MCPBridge] refreshTools(${serverId}) error:`, error)
      return []
    }
  }

  async callTool(request: MCPToolCallRequest): Promise<MCPToolCallResult> {
    const callId = `${request.serverId}:${request.toolName}:${Date.now()}`

    if (this.activeCalls.size >= this.config.maxConcurrentCalls) {
      return {
        success: false,
        content: [{ type: 'text', text: `Too many concurrent calls (max ${this.config.maxConcurrentCalls})` }],
        isError: true,
        error: 'Rate limit exceeded',
      }
    }

    this.activeCalls.add(callId)

    try {
      logger.info(
        `[MCPBridge] callTool() â†?${request.toolName} @ ${request.serverId}, args=${JSON.stringify(request.arguments).slice(0, 200)}`
      )

      const startTime = Date.now()

      const response = await linkMindService.request<any>(
        `${this.config.mcpEndpoint}/servers/${request.serverId}/tools/call`,
        {
          method: 'POST',
          body: JSON.stringify({
            toolName: request.toolName,
            arguments: request.arguments,
          }),
          signal: AbortSignal.timeout(this.config.defaultTimeout),
        }
      )

      const duration = Date.now() - startTime
      logger.info(`[MCPBridge] callTool() done in ${duration}ms`)

      if (response.isError || response.error) {
        return {
          success: false,
          content: response.content || [{ type: 'text', text: response.error || 'Unknown error' }],
          isError: true,
          raw: response,
          error: response.error || 'Tool call failed',
        }
      }

      return {
        success: true,
        content: response.content || [],
        raw: response,
      }
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error)
      logger.error(`[MCPBridge] callTool(${request.toolName}) error:`, msg)
      return {
        success: false,
        content: [{ type: 'text', text: msg }],
        isError: true,
        error: msg,
      }
    } finally {
      this.activeCalls.delete(callId)
    }
  }

  async listResources(serverId: string): Promise<MCPResource[]> {
    try {
      const response = await linkMindService.request<any>(
        `${this.config.mcpEndpoint}/servers/${serverId}/resources`
      )
      return Array.isArray(response.resources) ? response.resources : []
    } catch {
      return []
    }
  }

  async readResource(serverId: string, uri: string): Promise<string> {
    try {
      const response = await linkMindService.request<any>(
        `${this.config.mcpEndpoint}/servers/${serverId}/resources/read`,
        {
          method: 'POST',
          body: JSON.stringify({ uri }),
        }
      )
      return response.contents?.[0]?.text || response.text || ''
    } catch (error) {
      throw new Error(`Failed to read resource ${uri}: ${error instanceof Error ? error.message : String(error)}`)
    }
  }

  getServerStatus(serverId: string): MCPConnection | undefined {
    return this.connections.get(serverId)
  }

  getAllStatuses(): Array<{
    id: string
    name: string
    status: ConnectionStatus
    toolCount: number
    lastError: string | null
  }> {
    return Array.from(this.connections.values()).map((c) => ({
      id: c.id,
      name: c.name,
      status: c.status,
      toolCount: this.toolCache.get(c.id)?.length || 0,
      lastError: c.lastError,
    }))
  }

  async testConnection(serverId: string): Promise<{ connected: boolean; latencyMs: number; error?: string }> {
    const start = Date.now()
    try {
      const tools = await this.refreshTools(serverId)
      return { connected: true, latencyMs: Date.now() - start, error: undefined }
    } catch (error) {
      return {
        connected: false,
        latencyMs: Date.now() - start,
        error: error instanceof Error ? error.message : String(error),
      }
    }
  }

  searchTools(query: string): MCPTool[] {
    const q = query.toLowerCase()
    const results: MCPTool[] = []

    for (const tools of this.toolCache.values()) {
      for (const tool of tools) {
        if (
          tool.name.toLowerCase().includes(q) ||
          (tool.description && tool.description.toLowerCase().includes(q))
        ) {
          results.push(tool)
        }
      }
    }

    return results
  }

  getCapabilities(): MCPCapability {
    let hasResources = false
    let hasPrompts = false
    let hasSampling = false
    let hasRoots = false

    for (const conn of this.connections.values()) {
      if (conn.enabled) {
        hasResources = hasPrompts = hasSampling = hasRoots = true
        break
      }
    }

    return {
      tools: this.connections.size > 0,
      resources: hasResources,
      prompts: hasPrompts,
      sampling: hasSampling,
      roots: hasRoots,
    }
  }

  clearCache(): void {
    this.toolCache.clear()
  }
}

export const mcpBridgeService = new MCPBridgeService()

