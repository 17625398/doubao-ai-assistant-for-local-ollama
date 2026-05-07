import {
  OpenClawChannelConfig,
  OpenClawChannelType,
  OpenClawInboundMessage,
  OpenClawOutboundMessage,
  ConnectionTestResult,
  MessageSendResult,
  PairingCode,
  PendingPairingRequest,
  PeerInfo,
  ApprovalResult,
  DMPairingPolicy,
  CHANNEL_LABELS,
} from './openclaw-types'
import { OpenClawGatewayBridge } from './openclaw-gateway-bridge'

const logger = console

export class OpenClawChannelBridge {
  private gateway: OpenClawGatewayBridge
  private channels = new Map<string, OpenClawChannelConfig>()
  private pendingPairings = new Map<string, PendingPairingRequest>()
  private allowedPeers = new Map<string, PeerInfo[]>()
  private pairingCodes = new Map<string, PairingCode>()

  constructor(gateway: OpenClawGatewayBridge) {
    this.gateway = gateway
    this.setupEventListeners()
  }

  private setupEventListeners(): void {
    this.gateway.on('message:inbound', (msg: any) => {
      this.handleInboundMessage(msg)
    })
    this.gateway.on('channel', (msg: any) => {
      if (msg.data?.id && msg.data?.status !== undefined) {
        const existing = this.channels.get(msg.data.id)
        if (existing) {
          Object.assign(existing, msg.data)
          this.channels.set(existing.id, existing)
        }
      }
    })
    this.gateway.on('pairing:request', (msg: any) => {
      const req: PendingPairingRequest = {
        channelId: msg.channelId || '',
        peerId: msg.peerId || '',
        peerName: msg.peerName || msg.sender?.name || 'Unknown',
        code: msg.code || '',
        requestedAt: Date.now(),
      }
      this.pendingPairings.set(req.code, req)
      logger.info(`[OpenClawChannel] Pairing request from ${req.peerName} on ${req.channelId}`)
    })
  }

  async addChannel(config: Omit<OpenClawChannelConfig, 'createdAt' | 'updatedAt' | 'status'>): Promise<string> {
    const channel: OpenClawChannelConfig = {
      ...config,
      status: 'pending',
      messageCount: 0,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    }

    try {
      await this.gateway.request('POST', '/api/channels', channel)
    } catch (err) {
      logger.warn(`[OpenClawChannel] Gateway add failed for ${config.name}: ${err}`)
    }

    this.channels.set(channel.id, channel)
    logger.info(`[OpenClawChannel] Added channel: ${config.name} (${CHANNEL_LABELS[config.type] || config.type})`)
    return channel.id
  }

  removeChannel(id: string): boolean {
    try {
      this.gateway.request('DELETE', `/api/channels/${id}`).catch(() => {})
    } catch { /* local */ }

    return this.channels.delete(id)
  }

  async updateChannel(id: string, updates: Partial<OpenClawChannelConfig>): Promise<boolean> {
    const existing = this.channels.get(id)
    if (!existing) return false

    Object.assign(existing, updates, { updatedAt: Date.now() })
    this.channels.set(id, existing)

    try {
      await this.gateway.request('PUT', `/api/channels/${id}`, existing)
    } catch { /* local */ }

    return true
  }

  getChannel(id: string): OpenClawChannelConfig | undefined {
    return this.channels.get(id)
  }

  listChannels(): OpenClawChannelConfig[] {
    return Array.from(this.channels.values()).sort((a, b) => a.name.localeCompare(b.name))
  }

  listChannelsByType(type?: OpenClawChannelType): OpenClawChannelConfig[] {
    let result = this.listChannels()
    if (type) result = result.filter((c) => c.type === type)
    return result
  }

  async enableChannel(id: string): Promise<boolean> {
    return this.updateChannel(id, { enabled: true })
  }

  async disableChannel(id: string): Promise<boolean> {
    return this.updateChannel(id, { enabled: false, status: 'disconnected' })
  }

  async testConnection(id: string): Promise<ConnectionTestResult> {
    const channel = this.channels.get(id)
    if (!channel) return { connected: false, latency: -1, error: `Channel not found: ${id}` }

    const start = Date.now()
    try {
      const result = await this.gateway.request<any>('POST', `/api/channels/${id}/test`)
      const latency = Date.now() - start

      const connected = result.connected === true || result.status === 'connected'
      this.updateChannel(id, { status: connected ? 'connected' : 'error' })

      return {
        connected,
        latency,
        info: result.info,
      }
    } catch (err: any) {
      this.updateChannel(id, { status: 'error' })
      return { connected: false, latency: Date.now() - start, error: err.message }
    }
  }

  async sendMessage(msg: OpenClawOutboundMessage): Promise<MessageSendResult> {
    const start = Date.now()

    try {
      const result = await this.gateway.request<any>('POST', '/api/channels/message', msg)

      const channel = Array.from(this.channels.values()).find(
        (c) => c.type === msg.channel || c.id === (msg.channel as unknown as string),
      )
      if (channel) {
        channel.messageCount = (channel.messageCount || 0) + 1
        channel.lastActivity = Date.now()
        this.channels.set(channel.id, channel)
      }

      return {
        success: true,
        messageId: result.messageId || result.id,
        channel: msg.channel,
        latencyMs: Date.now() - start,
      }
    } catch (err: any) {
      return { success: false, channel: msg.channel, error: err.message, latencyMs: Date.now() - start }
    }
  }

  sendTypingIndicator(channelId: string, _peerId: string): void {
    try {
      this.gateway.request('POST', `/api/channels/${channelId}/typing`, {}).catch(() => {})
    } catch { /* best effort */ }
  }

  sendReaction(_channelId: string, _messageId: string, _emoji: string): void {
    try {
      this.gateway.request('POST', '/api/channels/reaction', { channelId: _channelId, messageId: _messageId, emoji: _emoji }).catch(() => {})
    } catch { /* best effort */ }
  }

  generatePairingCode(channelId: string, peerId?: string): PairingCode {
    const code = Math.random().toString(36).slice(2, 8).toUpperCase()
    const now = Date.now()
    const pairing: PairingCode = {
      code,
      channelId,
      peerId,
      createdAt: now,
      expiresAt: now + 300000,
      approved: false,
    }

    this.pairingCodes.set(code, pairing)

    setTimeout(() => {
      if (!pairing.approved) this.pairingCodes.delete(code)
    }, 300000)

    logger.info(`[OpenClawChannel] Generated pairing code ${code} for channel ${channelId}`)
    return pairing
  }

  approvePairing(code: string, approver?: string): ApprovalResult {
    const pairing = this.pairingCodes.get(code)
    if (!pairing) throw new Error(`Invalid or expired pairing code: ${code}`)

    if (Date.now() > pairing.expiresAt) {
      this.pairingCodes.delete(code)
      throw new Error(`Pairing code expired: ${code}`)
    }

    pairing.approved = true

    const peer: PeerInfo = {
      peerId: pairing.peerId || `peer_${code}`,
      name: `Peer-${code}`,
      addedAt: Date.now(),
      addedBy: approver,
    }

    let peers = this.allowedPeers.get(pairing.channelId) || []
    peers.push(peer)
    this.allowedPeers.set(pairing.channelId, peers)

    this.pendingPairings.delete(code)

    logger.info(`[OpenClawChannel] Approved pairing ${code} for channel ${pairing.channelId}`)

    return {
      approved: true,
      peerId: peer.peerId,
      code,
      approvedAt: Date.now(),
      approvedBy: approver,
    }
  }

  rejectPairing(code: string): boolean {
    const pairing = this.pairingCodes.get(code)
    if (!pairing) return false

    this.pairingCodes.delete(code)
    this.pendingPairings.delete(code)

    logger.info(`[OpenClawChannel] Rejected pairing ${code} for channel ${pairing.channelId}`)
    return true
  }

  listPendingCodes(): PendingPairingRequest[] {
    return Array.from(this.pendingPairings.values())
  }

  listAllowedPeers(channelId: string): PeerInfo[] {
    return this.allowedPeers.get(channelId) || []
  }

  setDMPolicy(channelId: string, policy: DMPairingPolicy): void {
    const channel = this.channels.get(channelId)
    if (channel) {
      channel.dmPolicy = policy.mode
      this.channels.set(channelId, channel)
    }
  }

  getDMPolicy(channelId: string): DMPairingPolicy | undefined {
    const channel = this.channels.get(channelId)
    if (channel) {
      return { mode: channel.dmPolicy as DMPairingPolicy['mode'] }
    }
    return undefined
  }

  private handleInboundMessage(msg: any): void {
    const inbound: OpenClawInboundMessage = {
      id: msg.id || `msg_${Date.now()}`,
      channel: msg.channel || 'webchat',
      channelId: msg.channelId || '',
      sender: {
        id: msg.sender?.id || msg.from || 'unknown',
        name: msg.sender?.name || msg.senderName || 'Unknown',
        displayName: msg.sender?.displayName,
        avatarUrl: msg.sender?.avatarUrl,
      },
      content: msg.content || msg.text || '',
      attachments: msg.attachments,
      timestamp: msg.timestamp || Date.now(),
      type: msg.type || 'text',
      context: msg.context,
      rawPayload: msg,
    }

    const channel = this.channels.get(inbound.channelId)
    if (channel) {
      channel.lastActivity = Date.now()
      channel.messageCount = (channel.messageCount || 0) + 1
      this.channels.set(channel.id, channel)
    }

    this.gateway.emit('inbound-message', inbound)
  }
}

let channelBridgeInstance: OpenClawChannelBridge | null = null

export function getOpenClawChannelBridge(gateway?: OpenClawGatewayBridge): OpenClawChannelBridge {
  if (!channelBridgeInstance) {
    const gw = gateway || (() => {
      const { getOpenClawGateway: g } = require('./openclaw-gateway-bridge')
      return g()
    })()
    channelBridgeInstance = new OpenClawChannelBridge(gw)
  }
  return channelBridgeInstance
}
