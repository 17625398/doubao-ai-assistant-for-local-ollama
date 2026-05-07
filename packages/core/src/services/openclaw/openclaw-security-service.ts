import {
  DMPairingPolicy,
  SandboxPolicy,
  AccessControlEntry,
  AccessDecision,
  SecurityScanResult,
  BlockedPattern,
  AuditEvent,
} from './openclaw-types'
import { OpenClawGatewayBridge } from './openclaw-gateway-bridge'
import { GovernanceService } from '../governance-service'

const logger = console

export class OpenClawSecurityService {
  private gateway: OpenClawGatewayBridge
  private dmPolicies = new Map<string, DMPairingPolicy>()
  private sandboxPolicy: SandboxPolicy = { mode: 'none' }
  private aclEntries = new Map<string, AccessControlEntry>()
  private blockedPatterns = new Map<string, BlockedPattern>()
  private auditLog: AuditEvent[] = []
  private governance?: GovernanceService

  constructor(gateway: OpenClawGatewayBridge, governance?: GovernanceService) {
    this.gateway = gateway
    this.governance = governance
    this.registerDefaultBlockedPatterns()
  }

  setGovernance(governance: GovernanceService): void {
    this.governance = governance
  }

  async setDMPolicy(channelId: string, policy: DMPairingPolicy): Promise<void> {
    this.dmPolicies.set(channelId, policy)
    try {
      await this.gateway.request('PUT', `/api/security/dm-policy/${channelId}`, policy)
    } catch {
      /* local */
    }
    this.logAuditEvent('pairing', 'set-dm-policy', channelId, { mode: policy.mode })
  }

  getDMPolicy(channelId: string): DMPairingPolicy | undefined {
    return this.dmPolicies.get(channelId)
  }

  generatePairingCode(channelId: string): { code: string; expiresAt: number } {
    const code = Math.random().toString(36).slice(2, 8).toUpperCase()
    const expiresAt = Date.now() + 300000
    logger.info(`[OpenClawSecurity] Generated DM pairing code for ${channelId}: ${code}`)
    return { code, expiresAt }
  }

  approvePairing(code: string, _approver?: string): boolean {
    this.logAuditEvent('pairing', 'approve-pairing', code, {})
    return true
  }

  rejectPairing(code: string): boolean {
    this.logAuditEvent('pairing', 'reject-pairing', code, {})
    return true
  }

  listPendingCodes(
    _channelId?: string
  ): Array<{ code: string; channelId: string; createdAt: number }> {
    return []
  }

  listAllowedPeers(channelId: string): AccessControlEntry[] {
    return Array.from(this.aclEntries.values()).filter(
      e => e.channelId === channelId && e.role !== 'blocked'
    )
  }

  grantAccess(entry: Omit<AccessControlEntry, 'id' | 'grantedAt'>): string {
    const id = `acl_${Date.now()}`
    const fullEntry: AccessControlEntry = {
      id,
      channelId: entry.channelId,
      peerId: entry.peerId,
      role: entry.role,
      permissions: entry.permissions || [],
      grantedAt: Date.now(),
    }

    this.aclEntries.set(id, fullEntry)
    this.logAuditEvent('access', 'grant', id, { peerId: entry.peerId, role: entry.role })
    return id
  }

  revokeAccess(entryId: string): boolean {
    const entry = this.aclEntries.get(entryId)
    if (!entry) return false

    this.aclEntries.delete(entryId)
    this.logAuditEvent('access', 'revoke', entryId, { peerId: entry.peerId })
    return true
  }

  checkAccess(channelId: string, peerId: string, permission: string): AccessDecision {
    const entries = Array.from(this.aclEntries.values()).filter(
      e => e.channelId === channelId && e.peerId === peerId
    )

    if (entries.length === 0) {
      const policy = this.dmPolicies.get(channelId)
      if (policy?.mode === 'open') {
        return { allowed: true, role: 'user', reason: 'DM policy is open' }
      }
      if (policy?.mode === 'closed') {
        return { allowed: false, reason: 'DM policy is closed' }
      }
      return { allowed: false, reason: 'No access entry found and no open DM policy' }
    }

    const entry = entries.find(
      e =>
        e.role !== 'blocked' &&
        (e.permissions.includes(permission) || e.permissions.includes('*') || e.role === 'admin')
    )

    if (entry) {
      return { allowed: true, role: entry.role, reason: `Access granted via ${entry.role} role` }
    }

    return { allowed: false, reason: 'No matching permission found' }
  }

  listEntries(channelId?: string): AccessControlEntry[] {
    let result = Array.from(this.aclEntries.values())
    if (channelId) result = result.filter(e => e.channelId === channelId)
    return result.sort((a, b) => b.grantedAt - a.grantedAt)
  }

  setSandboxPolicy(policy: SandboxPolicy): void {
    this.sandboxPolicy = policy
    try {
      this.gateway.request('PUT', '/api/security/sandbox', policy).catch(() => {})
    } catch {
      /* local */
    }
    this.logAuditEvent('config', 'set-sandbox-policy', '', { mode: policy.mode })
  }

  getSandboxPolicy(): SandboxPolicy {
    return { ...this.sandboxPolicy }
  }

  setAgentSandbox(agentId: string, config: { allow: string[]; deny: string[] }): void {
    if (!this.sandboxPolicy.perAgent) this.sandboxPolicy.perAgent = {}
    this.sandboxPolicy.perAgent[agentId] = config
    this.logAuditEvent('config', 'set-agent-sandbox', agentId, config)
  }

  isToolAllowedInSandbox(toolId: string, agentId?: string): boolean {
    if (this.sandboxPolicy.mode === 'none') return true

    const perAgentConfig = agentId ? this.sandboxPolicy.perAgent?.[agentId] : null

    if (perAgentConfig?.deny?.includes(toolId)) return false
    if (perAgentConfig?.allow?.includes(toolId)) return true
    if (this.sandboxPolicy.defaultDeny?.includes(toolId)) return false
    if (this.sandboxPolicy.defaultAllow?.includes(toolId)) return true

    return this.sandboxPolicy.mode === 'docker' || this.sandboxPolicy.mode === 'ssh'
  }

  scanContent(content: string): SecurityScanResult {
    const matches: SecurityScanResult['matches'] = []
    const blocked: string[] = []

    for (const [patternId, pattern] of this.blockedPatterns.entries()) {
      if (!pattern.enabled) continue

      let found = false
      try {
        if (pattern.type === 'regex') {
          const regex = new RegExp(pattern.pattern, 'gi')
          const matchResult = regex.exec(content)
          if (matchResult) {
            matches.push({
              pattern: pattern.pattern,
              type: 'regex',
              match: matchResult[0],
              position: {
                start: matchResult.index,
                end: matchResult.index + matchResult[0].length,
              },
            })
            found = true
          }
        } else if (pattern.type === 'keyword') {
          const idx = content.toLowerCase().indexOf(pattern.pattern.toLowerCase())
          if (idx >= 0) {
            matches.push({
              pattern: pattern.pattern,
              type: 'keyword',
              match: content.slice(idx, idx + pattern.pattern.length),
              position: { start: idx, end: idx + pattern.pattern.length },
            })
            found = true
          }
        }
      } catch {
        /* invalid regex */
      }

      if (found) blocked.push(patternId)
    }

    const riskLevel =
      matches.length > 5
        ? 'critical'
        : matches.length > 2
          ? 'high'
          : matches.length > 0
            ? 'medium'
            : 'low'

    if (this.governance && matches.length > 0) {
      try {
        this.governance.checkContent(content).catch(() => {})
      } catch {
        /* ignore */
      }
    }

    return {
      safe: riskLevel === 'low',
      riskLevel,
      matches,
      blockedPatterns: blocked,
    }
  }

  blockPattern(
    pattern: string,
    type: BlockedPattern['type'],
    reason: string,
    createdBy: string
  ): string {
    const id = `block_${Date.now()}`
    const bp: BlockedPattern = {
      id,
      pattern,
      type,
      reason,
      createdBy,
      createdAt: Date.now(),
      enabled: true,
    }

    this.blockedPatterns.set(id, bp)
    this.logAuditEvent('content', 'block-pattern', id, { pattern, type, reason })

    try {
      this.gateway.request('POST', '/api/security/blocked-patterns', bp).catch(() => {})
    } catch {
      /* local */
    }

    return id
  }

  unblockPattern(patternId: string): boolean {
    const existing = this.blockedPatterns.get(patternId)
    if (!existing) return false

    existing.enabled = false
    this.blockedPatterns.set(patternId, existing)
    this.logAuditEvent('content', 'unblock-pattern', patternId, {})

    try {
      this.gateway.request('DELETE', `/api/security/blocked-patterns/${patternId}`).catch(() => {})
    } catch {
      /* local */
    }

    return true
  }

  listBlockedPatterns(): BlockedPattern[] {
    return Array.from(this.blockedPatterns.values()).filter(p => p.enabled)
  }

  logAuditEvent(
    eventType: AuditEvent['eventType'],
    action: string,
    resourceId: string,
    details: Record<string, any>
  ): void {
    const event: AuditEvent = {
      eventType,
      action,
      resourceId,
      details,
      timestamp: Date.now(),
    }

    this.auditLog.push(event)

    if (this.auditLog.length > 10000) {
      this.auditLog = this.auditLog.slice(-5000)
    }

    try {
      this.gateway.request('POST', '/api/security/audit-log', event).catch(() => {})
    } catch {
      /* local only */
    }
  }

  queryAuditLogs(filters?: {
    eventType?: AuditEvent['eventType']
    action?: string
    resourceId?: string
    since?: number
    until?: number
    limit?: number
  }): AuditEvent[] {
    let result = [...this.auditLog]

    if (filters) {
      if (filters.eventType) result = result.filter(e => e.eventType === filters.eventType)
      if (filters.action) result = result.filter(e => e.action === filters.action)
      if (filters.resourceId) result = result.filter(e => e.resourceId === filters.resourceId)
      if (filters.since) result = result.filter(e => e.timestamp >= filters.since!)
      if (filters.until) result = result.filter(e => e.timestamp <= filters.until!)
    }

    result.sort((a, b) => b.timestamp - a.timestamp)

    const limit = filters?.limit || 100
    return result.slice(0, limit)
  }

  exportAuditLogs(
    format: 'json' | 'csv' = 'json',
    filters?: Parameters<typeof this.queryAuditLogs>[0]
  ): string {
    const logs = this.queryAuditLogs({ ...filters, limit: 10000 })

    if (format === 'csv') {
      const headers = ['timestamp', 'eventType', 'action', 'resourceId', 'details']
      const rows = logs.map(l =>
        [
          new Date(l.timestamp).toISOString(),
          l.eventType,
          l.action,
          l.resourceId,
          JSON.stringify(l.details),
        ]
          .map(v => `"${String(v).replace(/"/g, '""')}"`)
          .join(',')
      )
      return [headers.join(','), ...rows].join('\n')
    }

    return JSON.stringify(logs, null, 2)
  }

  private registerDefaultBlockedPatterns(): void {
    const defaults: Array<{ pattern: string; type: BlockedPattern['type']; reason: string }> = [
      {
        pattern: '(?i)(api[_-]?key|apikey)["\\s]*[:=]["\']?[a-zA-Z0-9]{20,}',
        type: 'regex',
        reason: 'API Key detected',
      },
      {
        pattern: '(?i)(password|passwd|pwd)["\\s]*[:=]["\']?[^\s"]{6,}',
        type: 'regex',
        reason: 'Password detected',
      },
      {
        pattern: '(?i)(secret|token|auth)["\\s]*[:=]["\']?[a-zA-Z0-9_\\-\\.]{16,}',
        type: 'regex',
        reason: 'Secret/Token detected',
      },
      { pattern: 'sk-[a-zA-Z0-9]{20,}', type: 'regex', reason: 'OpenAI API key format' },
      { pattern: 'ghp_[a-zA-Z0-9]{36}', type: 'regex', reason: 'GitHub PAT format' },
      {
        pattern: '-----BEGIN (RSA |EC |DSA )?PRIVATE KEY-----',
        type: 'regex',
        reason: 'Private key detected',
      },
    ]

    for (const def of defaults) {
      this.blockPattern(def.pattern, def.type, def.reason, 'system')
    }
  }
}

let securityInstance: OpenClawSecurityService | null = null

export function getOpenClawSecurityService(
  gateway?: OpenClawGatewayBridge,
  governance?: GovernanceService
): OpenClawSecurityService {
  if (!securityInstance) {
    const gw =
      gateway ||
      (() => {
        const { getOpenClawGateway: g } = require('./openclaw-gateway-bridge')
        return g()
      })()
    securityInstance = new OpenClawSecurityService(gw, governance)
  }
  return securityInstance
}
