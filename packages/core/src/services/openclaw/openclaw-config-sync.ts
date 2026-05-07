import {
  OpenClawGatewayConfig,
  DEFAULT_GATEWAY_CONFIG,
  ValidationResult,
  ConfigChangeCallback,
  Snapshot,
  RestoreResult,
  SyncResult,
  ImportResult,
} from './openclaw-types'
import { OpenClawGatewayBridge } from './openclaw-gateway-bridge'

const logger = console

export class OpenClawConfigSync {
  private gateway: OpenClawGatewayBridge
  private localConfig: any = {}
  private changeListeners: Array<(cb: ConfigChangeCallback) => void> = []
  private snapshots: Map<string, Snapshot> = new Map()
  private watchTimer: ReturnType<typeof setInterval> | null = null

  constructor(gateway: OpenClawGatewayBridge) {
    this.gateway = gateway
  }

  async fetchConfig(): Promise<any> {
    try {
      const config = await this.gateway.request<any>('GET', '/api/config')
      this.localConfig = config || {}
      return config
    } catch (err) {
      logger.warn(`[OpenClawConfig] Fetch failed, using cached: ${err}`)
      return this.localConfig
    }
  }

  getConfigSection(section: string): any {
    if (!this.localConfig) return null

    const sectionMap: Record<string, string[]> = {
      agent: ['agents', 'model', 'thinking'],
      channels: ['channels', 'channelDefaults'],
      security: ['security', 'dmPolicy', 'sandbox'],
      voice: ['voice', 'tts', 'asr'],
      skills: ['skills', 'clawhub'],
    }

    const keys = sectionMap[section] || [section]
    const result: any = {}

    for (const key of keys) {
      if (this.localConfig[key] !== undefined) {
        result[key] = this.localConfig[key]
      }
    }

    return Object.keys(result).length > 0 ? result : null
  }

  getModelConfig(): any {
    return this.getConfigSection('agent')?.model || this.localConfig?.model || {}
  }

  getChannelConfigs(): any[] {
    return this.getConfigSection('channels')?.channels || this.localConfig?.channels || []
  }

  getAgentConfigs(): any[] {
    return this.getConfigSection('agent')?.agents || this.localConfig?.agents || []
  }

  getSandboxConfig(): any {
    return this.getConfigSection('security')?.sandbox || this.localConfig?.sandbox || { mode: 'none' }
  }

  getSecurityConfig(): any {
    return this.getConfigSection('security') || this.localConfig?.security || {}
  }

  async updateConfig(updates: any): Promise<boolean> {
    Object.assign(this.localConfig, updates)

    try {
      await this.gateway.request('PUT', '/api/config', this.localConfig)
    } catch (err) {
      logger.warn(`[OpenClawConfig] Push update failed: ${err}`)
    }

    for (const listener of this.changeListeners) {
      try {
        listener({
          section: 'global',
          oldValue: {},
          newValue: updates,
          timestamp: Date.now(),
        })
      } catch { /* ignore */ }
    }

    return true
  }

  async updateSection(section: string, value: any): Promise<boolean> {
    const oldValue = this.localConfig[section]

    if (section === 'model' && typeof value === 'string') {
      if (!this.localConfig.agent) this.localConfig.agent = {}
      this.localConfig.agent.model = value
    } else {
      this.localConfig[section] = value
    }

    try {
      await this.gateway.request('PUT', `/api/config/sections/${section}`, value)
    } catch (err) {
      logger.warn(`[OpenClawConfig] Section push failed: ${err}`)
    }

    for (const listener of this.changeListeners) {
      try {
        listener({ section, oldValue, newValue: value, timestamp: Date.now() })
      } catch { /* ignore */ }
    }

    return true
  }

  async setModel(model: string): Promise<boolean> {
    return this.updateSection('model', model)
  }

  async setThinking(level: string): Promise<boolean> {
    return this.updateSection('thinking', level)
  }

  validateConfig(config?: any): ValidationResult {
    const target = config || this.localConfig
    const errors: Array<{ path: string; message: string }> = []
    const warnings: Array<{ path: string; message: string }> = []

    if (!target || typeof target !== 'object') {
      errors.push({ path: 'root', message: 'Config must be an object' })
      return { valid: false, errors, warnings }
    }

    if (!target.model && !target.agent?.model) {
      warnings.push({ path: 'model', message: 'No default model configured' })
    }

    if (Array.isArray(target.channels)) {
      target.channels.forEach((ch: any, i: number) => {
        if (!ch.id) errors.push({ path: `channels[${i}].id`, message: 'Channel ID is required' })
        if (!ch.type) errors.push({ path: `channels[${i}].type`, message: 'Channel type is required' })
        if (ch.type === 'wechat' && !ch.config?.appId) {
          warnings.push({ path: `channels[${i}]`, message: 'WeChat channel missing appId' })
        }
      })
    }

    if (Array.isArray(target.agents)) {
      target.agents.forEach((a: any, i: number) => {
        if (!a.name) errors.push({ path: `agents[${i}].name`, message: 'Agent name is required' })
        if (!a.model) warnings.push({ path: `agents[${i}].model`, message: `Agent "${a.name}" has no model` })
      })
    }

    return { valid: errors.length === 0, errors, warnings }
  }

  validateSection(section: string, value: any): ValidationResult {
    const tempConfig = { ...this.localConfig }
    tempConfig[section] = value
    return this.validateConfig(tempConfig)
  }

  async pushToLocal(path?: string): Promise<boolean> {
    try {
      await this.gateway.request('POST', '/api/config/push', { path })
      return true
    } catch (err: any) {
      logger.error(`[OpenClawConfig] Push to local failed: ${err.message}`)
      return false
    }
  }

  async pullFromFile(_path?: string): Promise<boolean> {
    try {
      const config = await this.fetchConfig()
      this.localConfig = config
      return true
    } catch (err: any) {
      logger.error(`[OpenClawConfig] Pull failed: ${err.message}`)
      return false
    }
  }

  watchChanges(callback: (cb: ConfigChangeCallback) => void): () => void {
    this.changeListeners.push(callback)

    if (!this.watchTimer) {
      this.watchTimer = setInterval(async () => {
        try {
          const remote = await this.gateway.request<any>('GET', '/api/config')
          if (JSON.stringify(remote) !== JSON.stringify(this.localConfig)) {
            this.localConfig = remote
            callback({
              section: 'global',
              oldValue: this.localConfig,
              newValue: remote,
              timestamp: Date.now(),
            })
          }
        } catch { /* ignore */ }
      }, 10000)
    }

    return () => {
      const idx = this.changeListeners.indexOf(callback)
      if (idx >= 0) this.changeListeners.splice(idx, 1)

      if (this.changeListeners.length === 0 && this.watchTimer) {
        clearInterval(this.watchTimer)
        this.watchTimer = null
      }
    }
  }

  unwatchChanges(): void {
    if (this.watchTimer) {
      clearInterval(this.watchTimer)
      this.watchTimer = null
    }
    this.changeListeners = []
  }

  exportConfig(format: 'json' | 'yaml' = 'json'): string {
    if (format === 'json') {
      return JSON.stringify(this.localConfig, null, 2)
    }

    return this.simpleYamlStringify(this.localConfig)
  }

  importConfig(content: string, format: 'json' | 'yaml' = 'json'): ImportResult {
    let parsed: any
    const warnings: string[] = []
    const errors: string[] = []
    const appliedSections: string[] = []

    try {
      if (format === 'json') {
        parsed = JSON.parse(content)
      } else {
        parsed = this.simpleYamlParse(content)
      }
    } catch (err: any) {
      return { imported: false, warnings, errors: [`Parse error: ${err.message}`], appliedSections }
    }

    const validation = this.validateConfig(parsed)
    if (!validation.errors.length) {
      Object.assign(this.localConfig, parsed)
      appliedSections.push(...Object.keys(parsed))
    }

    validation.warnings.forEach((w) => warnings.push(`${w.path}: ${w.message}`))
    validation.errors.forEach((e) => errors.push(`${e.path}: ${e.message}`))

    return { imported: errors.length === 0, warnings, errors, appliedSections }
  }

  createSnapshot(label?: string): Snapshot {
    const id = `snap_${Date.now()}`
    const snapshot: Snapshot = {
      id,
      label: label || `Snapshot ${new Date().toLocaleString()}`,
      config: JSON.parse(JSON.stringify(this.localConfig)),
      createdAt: Date.now(),
      size: JSON.stringify(this.localConfig).length,
    }

    this.snapshots.set(id, snapshot)

    if (this.snapshots.size > 20) {
      const oldestKey = Array.from(this.snapshots.keys())[0]
      this.snapshots.delete(oldestKey)
    }

    logger.info(`[OpenClawConfig] Created snapshot: ${snapshot.label} (${snapshot.size} bytes)`)
    return snapshot
  }

  listSnapshots(): Snapshot[] {
    return Array.from(this.snapshots.values()).sort((a, b) => b.createdAt - a.createdAt)
  }

  restoreSnapshot(snapshotId: string): RestoreResult {
    const snapshot = this.snapshots.get(snapshotId)
    if (!snapshot) {
      return { restored: false, snapshotId, restoredAt: Date.now() }
    }

    const previousSnapshotId = this.createSnapshot(`Before restore ${snapshot.label}`).id
    this.localConfig = JSON.parse(JSON.stringify(snapshot.config))

    logger.info(`[OpenClawConfig] Restored snapshot: ${snapshot.label}`)

    return {
      restored: true,
      snapshotId,
      previousSnapshotId,
      restoredAt: Date.now(),
    }
  }

  private simpleYamlStringify(obj: any, indent: number = 0): string {
    const pad = '  '.repeat(indent)
    const lines: string[] = []

    if (obj === null || obj === undefined) {
      return 'null'
    }

    if (typeof obj !== 'object') {
      return String(obj)
    }

    if (Array.isArray(obj)) {
      for (const item of obj) {
        lines.push(`${pad}- ${this.simpleYamlStringify(item, indent + 1).trimStart()}`)
      }
      return lines.join('\n')
    }

    for (const [key, value] of Object.entries(obj)) {
      if (value === null || value === undefined) {
        lines.push(`${pad}${key}: null`)
      } else if (typeof value === 'object') {
        lines.push(`${pad}${key}:`)
        lines.push(this.simpleYamlStringify(value, indent + 1))
      } else if (typeof value === 'string') {
        lines.push(`${pad}${key}: "${value}"`)
      } else {
        lines.push(`${pad}${key}: ${value}`)
      }
    }

    return lines.join('\n')
  }

  private simpleYamlParse(yaml: string): any {
    const result: any = {}
    let currentObj = result
    const stack: any[] = [result]
    const keyStack: string[] = []

    for (const line of yaml.split('\n')) {
      const trimmed = line.trim()
      if (!trimmed || trimmed.startsWith('#')) continue

      const indent = line.length - line.trimStart().length
      const depth = Math.floor(indent / 2)

      while (stack.length > depth + 1) {
        stack.pop()
        keyStack.pop()
      }
      currentObj = stack[stack.length - 1]

      if (trimmed.startsWith('- ')) {
        const itemStr = trimmed.slice(2).trim()

        if (!Array.isArray(currentObj)) {
          const parentKey = keyStack[keyStack.length - 1]
          if (parentKey) currentObj[parentKey] = []
          currentObj = currentObj[parentKey] || []
          stack[stack.length - 1] = currentObj
        }

        if (itemStr.includes(': ')) {
          const [k, ...vParts] = itemStr.split(': ')
          const objItem: any = {}
          const v = vParts.join(': ').replace(/^["']|["']$/g, '')
          objItem[k] = this.tryParseValue(v)
          ;(currentObj as any[]).push(objItem)
        } else {
          ;(currentObj as any[]).push(this.tryParseValue(itemStr.replace(/^["']|["']$/g, '')))
        }
      } else if (trimmed.includes(': ')) {
        const colonIdx = trimmed.indexOf(': ')
        const key = trimmed.slice(0, colonIdx)
        const valueStr = trimmed.slice(colonIdx + 2).replace(/^["']|["']$/g, '')

        currentObj[key] = this.tryParseValue(valueStr)

        if (typeof currentObj[key] === 'object' && currentObj[key] !== null && !Array.isArray(currentObj[key])) {
          stack.push(currentObj[key])
          keyStack.push(key)
        }
      }
    }

    return result
  }

  private tryParseValue(value: string): any {
    if (value === 'true') return true
    if (value === 'false') return false
    if (value === 'null' || value === '') return null
    const num = Number(value)
    if (!isNaN(num) && value !== '') return num
    return value
  }
}

let configSyncInstance: OpenClawConfigSync | null = null

export function getOpenClawConfigSync(gateway?: OpenClawGatewayBridge): OpenClawConfigSync {
  if (!configSyncInstance) {
    const gw = gateway || (() => {
      const { getOpenClawGateway: g } = require('./openclaw-gateway-bridge')
      return g()
    })()
    configSyncInstance = new OpenClawConfigSync(gw)
  }
  return configSyncInstance
}
