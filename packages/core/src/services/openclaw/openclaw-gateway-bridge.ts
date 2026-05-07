import {
  OpenClawGatewayConfig,
  DEFAULT_GATEWAY_CONFIG,
  GatewayStatus,
  StreamChunk,
} from './openclaw-types'

const logger = console

type EventListener = (data: any) => void
type EventMap = Record<string, Set<EventListener>>

export class OpenClawGatewayBridge {
  private config: Required<OpenClawGatewayConfig>
  private status: GatewayStatus = {
    connected: false,
    version: '',
    uptime: 0,
    channels: 0,
    agents: 0,
    activeSessions: 0,
    lastHeartbeat: 0,
  }
  private ws: WebSocket | null = null
  private heartbeatTimer: ReturnType<typeof setInterval> | null = null
  private reconnectAttempts = 0
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null
  private listeners: EventMap = {}
  private abortController: AbortController | null = null

  constructor(config: Partial<OpenClawGatewayConfig> = {}) {
    this.config = { ...DEFAULT_GATEWAY_CONFIG, ...config } as any
  }

  get baseUrl(): string {
    return `http://${this.config.host}:${this.config.port}`
  }

  get wsUrl(): string {
    return `ws://${this.config.host}:${this.config.wsPort}`
  }

  getStatus(): GatewayStatus {
    return { ...this.status }
  }

  isConnected(): boolean {
    return this.status.connected && this.ws?.readyState === WebSocket.OPEN
  }

  on(event: string, listener: EventListener): () => void {
    if (!this.listeners[event]) this.listeners[event] = new Set()
    this.listeners[event].add(listener)
    return () => this.listeners[event]?.delete(listener)
  }

  public emit(event: string, data: any): void {
    this.listeners[event]?.forEach(fn => {
      try {
        fn(data)
      } catch (e) {
        logger.error(`[OpenClawGW] event handler error:`, e)
      }
    })
  }

  async connect(): Promise<GatewayStatus> {
    try {
      const health = await this.healthCheck()
      if (!health.healthy) throw new Error('Gateway health check failed')

      await this.connectWebSocket()
      this.startHeartbeat()

      this.status.connected = true
      this.reconnectAttempts = 0

      logger.info(`[OpenClawGW] Connected to ${this.baseUrl}`)
      return this.status
    } catch (err: any) {
      this.status.connected = false
      this.status.error = err.message
      logger.error(`[OpenClawGW] Connection failed: ${err.message}`)

      if (this.config.reconnect && this.reconnectAttempts < this.config.maxRetries) {
        this.scheduleReconnect()
      }

      throw err
    }
  }

  async disconnect(): Promise<void> {
    this.stopHeartbeat()
    this.clearReconnectTimer()

    if (this.ws) {
      this.ws.close(1000, 'Client disconnect')
      this.ws = null
    }

    this.abortController?.abort()
    this.abortController = null

    this.status.connected = false
    this.status.lastHeartbeat = 0
    this.emit('disconnected', {})
    logger.info('[OpenClawGW] Disconnected')
  }

  async healthCheck(): Promise<{ healthy: boolean; latency?: number }> {
    const start = Date.now()
    try {
      const res = await fetch(`${this.baseUrl}/api/health`, {
        signal: AbortSignal.timeout(this.config.timeout),
        headers: this.authHeaders(),
      })
      const data = await res.json()
      return { healthy: res.ok && data.status === 'ok', latency: Date.now() - start }
    } catch {
      return { healthy: false, latency: Date.now() - start }
    }
  }

  async request<T = any>(method: string, path: string, body?: any): Promise<T> {
    const url = `${this.baseUrl}${path.startsWith('/') ? '' : '/'}${path}`
    this.abortController = new AbortController()
    const timer = setTimeout(() => this.abortController!.abort(), this.config.timeout)

    try {
      const options: RequestInit = {
        method,
        headers: {
          'Content-Type': 'application/json',
          ...this.authHeaders(),
        },
        signal: this.abortController.signal,
      }
      if (body !== undefined && method !== 'GET') options.body = JSON.stringify(body)

      const res = await fetch(url, options)
      clearTimeout(timer)

      if (!res.ok) {
        const errorBody = await res.text().catch(() => '')
        throw new Error(`HTTP ${res.status}: ${errorBody}`)
      }

      const contentType = res.headers.get('content-type') || ''
      if (contentType.includes('json')) return res.json() as Promise<T>
      return res.text() as unknown as T
    } catch (err: any) {
      clearTimeout(timer)
      if (err.name === 'AbortError') throw new Error('Request timeout')
      throw err
    }
  }

  async *stream(path: string, body?: any): AsyncGenerator<StreamChunk> {
    const url = `${this.baseUrl}${path.startsWith('/') ? '' : '/'}${path}`
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'text/event-stream',
        ...this.authHeaders(),
      },
      body: body ? JSON.stringify(body) : undefined,
      signal: AbortSignal.timeout(this.config.timeout * 3),
    })

    if (!res.ok || !res.body) {
      const text = await res.text().catch(() => '')
      yield { type: 'error', error: `Stream error ${res.status}: ${text}` }
      return
    }

    const reader = res.body.getReader()
    const decoder = new TextDecoder()
    let buffer = ''

    try {
      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        buffer += decoder.decode(value, { stream: true })
        const lines = buffer.split('\n')
        buffer = lines.pop() || ''

        for (const line of lines) {
          const trimmed = line.trim()
          if (!trimmed || trimmed.startsWith(':')) continue

          if (trimmed.startsWith('data: ')) {
            const data = trimmed.slice(6)
            if (data === '[DONE]') {
              yield { type: 'done' }
              return
            }
            try {
              const parsed = JSON.parse(data)
              yield {
                type: parsed.type || 'text',
                content: parsed.content ?? parsed.text,
                data: parsed,
              }
            } catch {
              yield { type: 'text', content: data }
            }
          }
        }
      }
      yield { type: 'done' }
    } catch (err: any) {
      yield { type: 'error', error: err.message }
    } finally {
      reader.releaseLock()
    }
  }

  private async connectWebSocket(): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        this.ws = new WebSocket(this.wsUrl)

        this.ws.onopen = () => {
          logger.info('[OpenClawGW] WS connected')
          resolve()
        }

        this.ws.onmessage = event => {
          try {
            const msg = JSON.parse(event.data as string)
            this.handleWSMessage(msg)
          } catch {
            this.emit('raw', event.data)
          }
        }

        this.ws.onerror = event => {
          reject(new Error('WebSocket connection error'))
        }

        this.ws.onclose = event => {
          this.status.connected = false
          this.emit('disconnected', { code: event.code, reason: event.reason })

          if (this.config.reconnect && this.reconnectAttempts < this.config.maxRetries) {
            this.scheduleReconnect()
          }
        }
      } catch (err) {
        reject(err)
      }
    })
  }

  private handleWSMessage(msg: any): void {
    switch (msg.type || msg.event) {
      case 'status':
        Object.assign(this.status, msg.data || msg)
        break
      case 'message':
      case 'message:inbound':
        this.emit('message', msg)
        this.emit('message:inbound', msg)
        break
      case 'session':
      case 'session:update':
        this.emit('session', msg)
        break
      case 'tool':
      case 'tool:call':
        this.emit('tool', msg)
        break
      case 'channel':
      case 'channel:status':
        this.emit('channel', msg)
        break
      case 'error':
        this.emit('error', msg)
        break
      default:
        this.emit('unknown', msg)
    }
  }

  private startHeartbeat(): void {
    this.stopHeartbeat()
    this.heartbeatTimer = setInterval(async () => {
      if (!this.isConnected()) return

      try {
        const result = await this.healthCheck()
        if (result.healthy) {
          this.status.lastHeartbeat = Date.now()
          this.emit('heartbeat', { timestamp: Date.now(), latency: result.latency })
        } else {
          this.handleDisconnect()
        }
      } catch {
        this.handleDisconnect()
      }
    }, 15000)
  }

  private stopHeartbeat(): void {
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer)
      this.heartbeatTimer = null
    }
  }

  private handleDisconnect(): void {
    this.status.connected = false
    this.stopHeartbeat()
    this.emit('disconnected', {})

    if (this.config.reconnect && this.reconnectAttempts < this.config.maxRetries) {
      this.scheduleReconnect()
    }
  }

  private scheduleReconnect(): void {
    this.clearReconnectTimer()
    this.reconnectAttempts++
    const delay = Math.min(1000 * Math.pow(2, this.reconnectAttempts), 30000)

    logger.info(
      `[OpenClawGW] Reconnecting in ${delay}ms (attempt ${this.reconnectAttempts}/${this.config.maxRetries})`
    )

    this.reconnectTimer = setTimeout(() => {
      this.connect().catch(err => {
        logger.error(`[OpenClawGW] Reconnect failed: ${err.message}`)
      })
    }, delay)
  }

  private clearReconnectTimer(): void {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer)
      this.reconnectTimer = null
    }
  }

  private authHeaders(): Record<string, string> {
    const headers: Record<string, string> = {}
    if (this.config.apiKey) {
      headers['Authorization'] = `Bearer ${this.config.apiKey}`
    }
    return headers
  }
}

let gatewayInstance: OpenClawGatewayBridge | null = null

export function getOpenClawGateway(config?: Partial<OpenClawGatewayConfig>): OpenClawGatewayBridge {
  if (!gatewayInstance) {
    gatewayInstance = new OpenClawGatewayBridge(config)
  }
  return gatewayInstance
}

export function resetOpenClawGateway(): void {
  if (gatewayInstance) {
    gatewayInstance.disconnect().catch(() => {})
    gatewayInstance = null
  }
}
