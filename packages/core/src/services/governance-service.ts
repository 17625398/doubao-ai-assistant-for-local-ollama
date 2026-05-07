import { logger } from '../utils/logger'
import { linkMindService, type LinkMindServiceConfig } from './linkmind-service'
import { eventBus } from '../utils/event-bus'

export interface TokenUsageRecord {
  timestamp: number
  model: string
  promptTokens: number
  completionTokens: number
  totalTokens: number
  cost?: number
  latencyMs?: number
  userId?: string
  sessionId?: string
}

export interface TokenStats {
  period: 'hour' | 'day' | 'week' | 'month' | 'all'
  startTime: number
  endTime: number
  totalTokens: number
  totalCost: number
  requestCount: number
  averageLatencyMs: number
  topModels: Array<{ model: string; tokens: number; count: number }>
  hourlyDistribution: Array<{ hour: number; tokens: number; count: number }>
}

export interface CacheEntry<T = any> {
  key: string
  value: T
  createdAt: number
  lastAccessedAt: number
  ttl: number
  hits: number
  sizeBytes?: number
}

export interface CacheConfig {
  maxSize: number
  defaultTTL: number
  maxTTL: number
  cleanupInterval: number
}

export interface FilterResult {
  passed: boolean
  reason?: string
  category?: string
  confidence?: number
  sanitizedContent?: string
  action?: 'block' | 'warn' | 'sanitize' | 'pass'
}

export interface FilterRule {
  id: string
  name: string
  pattern: RegExp | string
  action: 'block' | 'warn' | 'sanitize'
  category: string
  enabled: boolean
  priority: number
}

export interface GovernanceServiceConfig extends Partial<LinkMindServiceConfig> {
  cacheEnabled?: boolean
  cacheMaxSize?: number
  cacheDefaultTTL?: number
  filterEnabled?: boolean
  tokenTrackingEnabled?: boolean
  dailyTokenLimit?: number
  monthlyBudget?: number
  costPerMillionTokens?: Record<string, number>
}

const DEFAULT_CACHE_CONFIG: Required<CacheConfig> = {
  maxSize: 500,
  defaultTTL: 300000,
  maxTTL: 3600000,
  cleanupInterval: 60000,
}

const DEFAULT_CONFIG = {
  cacheEnabled: true,
  cacheMaxSize: 500,
  cacheDefaultTTL: 5 * 60 * 1000,
  filterEnabled: true,
  tokenTrackingEnabled: true,
  dailyTokenLimit: 1000000,
  monthlyBudget: 100,
  costPerMillionTokens: {
    'gpt-4o': 2.5,
    'gpt-4o-mini': 0.15,
    'gpt-4-turbo': 10,
    'gpt-3.5-turbo': 0.5,
    'dall-e-3': 40,
    'dall-e-2': 2,
    default: 1.0,
  },
}

export class GovernanceService {
  private config: GovernanceServiceConfig

  private tokenRecords: TokenUsageRecord[] = []
  private cache = new Map<string, CacheEntry>()
  private cacheConfig: CacheConfig
  private filterRules: FilterRule[] = []
  private cleanupTimer: ReturnType<typeof setInterval> | null = null

  constructor(config: GovernanceServiceConfig = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config }
    this.cacheConfig = {
      ...DEFAULT_CACHE_CONFIG,
      maxSize: this.config.cacheMaxSize ?? DEFAULT_CACHE_CONFIG.maxSize,
      defaultTTL: this.config.cacheDefaultTTL ?? DEFAULT_CACHE_CONFIG.defaultTTL,
    }

    this.loadDefaultFilterRules()
    if (this.config.cacheEnabled) this.startCacheCleanup()
  }

  updateConfig(updates: Partial<GovernanceServiceConfig>): void {
    this.config = { ...this.config, ...updates }
    if ('cacheMaxSize' in updates)
      this.cacheConfig.maxSize = updates.cacheMaxSize ?? this.cacheConfig.maxSize
    if ('cacheDefaultTTL' in updates)
      this.cacheConfig.defaultTTL = updates.cacheDefaultTTL ?? this.cacheConfig.defaultTTL
  }

  recordTokenUsage(record: Omit<TokenUsageRecord, 'timestamp'>): void {
    if (!this.config.tokenTrackingEnabled) return

    const fullRecord: TokenUsageRecord = { ...record, timestamp: Date.now() }
    this.tokenRecords.push(fullRecord)

    eventBus.emit('token:recorded', fullRecord)

    if (this.tokenRecords.length > 10000) {
      const cutoff = Date.now() - 30 * 24 * 3600000
      this.tokenRecords = this.tokenRecords.filter(r => r.timestamp > cutoff)
    }
  }

  getTokenStats(period: 'today' | 'yesterday' | 'week' | 'month' | 'all'): TokenStats {
    const now = Date.now()
    let startTime: number
    let endTime = now
    let statsPeriod: TokenStats['period']

    switch (period) {
      case 'today':
        startTime = new Date().setHours(0, 0, 0, 0)
        statsPeriod = 'day'
        break
      case 'yesterday':
        endTime = new Date().setHours(0, 0, 0, 0)
        startTime = endTime - 86400000
        statsPeriod = 'day'
        break
      case 'week':
        startTime = now - 7 * 86400000
        statsPeriod = 'week'
        break
      case 'month':
        startTime = now - 30 * 86400000
        statsPeriod = 'month'
        break
      default:
        startTime = 0
        statsPeriod = 'all'
    }

    const records = this.tokenRecords.filter(
      r => r.timestamp >= startTime && r.timestamp <= endTime
    )

    const totalTokens = records.reduce((sum, r) => sum + r.totalTokens, 0)
    const totalCost = records.reduce((sum, r) => sum + (r.cost || 0), 0)
    const latencies = records.map(r => r.latencyMs).filter((l): l is number => l !== undefined)
    const avgLatency =
      latencies.length > 0 ? latencies.reduce((a, b) => a + b, 0) / latencies.length : 0

    const modelMap = new Map<string, { tokens: number; count: number }>()
    for (const r of records) {
      const existing = modelMap.get(r.model) || { tokens: 0, count: 0 }
      modelMap.set(r.model, { tokens: existing.tokens + r.totalTokens, count: existing.count + 1 })
    }
    const topModels = [...modelMap.entries()]
      .sort((a, b) => b[1].tokens - a[1].tokens)
      .slice(0, 10)
      .map(([model, data]) => ({ model, ...data }))

    const hourlyDist = Array.from({ length: 24 }, (_, i) => ({ hour: i, tokens: 0, count: 0 }))
    for (const r of records) {
      const hour = new Date(r.timestamp).getHours()
      hourlyDist[hour].tokens += r.totalTokens
      hourlyDist[hour].count++
    }

    return {
      period: statsPeriod,
      startTime,
      endTime,
      totalTokens,
      totalCost,
      requestCount: records.length,
      averageLatencyMs: Math.round(avgLatency),
      topModels,
      hourlyDistribution: hourlyDist,
    }
  }

  getDailyRemaining(): { used: number; limit: number; percentage: number; exceeded: boolean } {
    const todayStats = this.getTokenStats('today')
    const limit = this.config.dailyTokenLimit!
    return {
      used: todayStats.totalTokens,
      limit,
      percentage: Math.round((todayStats.totalTokens / limit) * 100),
      exceeded: todayStats.totalTokens > limit,
    }
  }

  async checkContent(content: string): Promise<FilterResult> {
    if (!this.config.filterEnabled) return { passed: true, action: 'pass' }

    try {
      const response = await linkMindService.request<any>('/moderation/check', {
        method: 'POST',
        body: JSON.stringify({ content }),
      })

      if (response.passed === false) {
        logger.warn(`[Governance] Content blocked: ${response.category} (${response.confidence})`)
        return response as FilterResult
      }

      return { passed: true, action: 'pass' }
    } catch {
      return this.localFilter(content)
    }
  }

  localFilter(content: string): FilterResult {
    for (const rule of this.filterRules.sort((a, b) => b.priority - a.priority)) {
      if (!rule.enabled) continue

      const pattern =
        typeof rule.pattern === 'string' ? new RegExp(rule.pattern, 'i') : rule.pattern
      if (pattern.test(content)) {
        logger.warn(`[Governance] Local filter triggered: [${rule.category}] ${rule.name}`)
        return {
          passed: false,
          reason: `Content matched rule: ${rule.name}`,
          category: rule.category,
          action: rule.action,
        }
      }
    }

    return { passed: true, action: 'pass' }
  }

  addFilterRule(rule: Omit<FilterRule, 'id'>): string {
    const id = crypto.randomUUID()
    this.filterRules.push({ ...rule, id })
    return id
  }

  removeFilterRule(id: string): boolean {
    const idx = this.filterRules.findIndex(r => r.id === id)
    if (idx === -1) return false
    this.filterRules.splice(idx, 1)
    return true
  }

  getFilterRules(): FilterRule[] {
    return [...this.filterRules]
  }

  setCache<T>(key: string, value: T, ttl?: number): void {
    if (!this.config.cacheEnabled) return

    const entry: CacheEntry<T> = {
      key,
      value,
      createdAt: Date.now(),
      lastAccessedAt: Date.now(),
      ttl: ttl ?? this.cacheConfig.defaultTTL,
      hits: 0,
      sizeBytes: this.estimateSize(value),
    }

    if (this.cache.size >= this.cacheConfig.maxSize) this.evictLRU()

    this.cache.set(key, entry)
  }

  getCache<T>(key: string): T | null {
    if (!this.config.cacheEnabled) return null

    const entry = this.cache.get(key)
    if (!entry) return null

    if (Date.now() - entry.createdAt > entry.ttl) {
      this.cache.delete(key)
      return null
    }

    entry.lastAccessedAt = Date.now()
    entry.hits++
    return entry.value as T
  }

  hasCache(key: string): boolean {
    const entry = this.cache.get(key)
    if (!entry) return false
    if (Date.now() - entry.createdAt > entry.ttl) {
      this.cache.delete(key)
      return false
    }
    return true
  }

  invalidateCache(pattern?: string | RegExp): number {
    if (!pattern) {
      const size = this.cache.size
      this.cache.clear()
      return size
    }

    const regex = pattern instanceof RegExp ? pattern : new RegExp(pattern)
    let count = 0
    for (const key of this.cache.keys()) {
      if (regex.test(key)) {
        this.cache.delete(key)
        count++
      }
    }
    return count
  }

  getCacheStats(): {
    size: number
    maxSize: number
    hitRate: number
    entries: Array<{ key: string; hits: number; ageMs: number; sizeBytes: number }>
  } {
    let totalHits = 0
    const entries: Array<{ key: string; hits: number; ageMs: number; sizeBytes: number }> = []
    for (const [, entry] of this.cache) {
      totalHits += entry.hits
      entries.push({
        key: entry.key.slice(0, 50) + (entry.key.length > 50 ? '...' : ''),
        hits: entry.hits,
        ageMs: Date.now() - entry.createdAt,
        sizeBytes: entry.sizeBytes || 0,
      })
    }

    return {
      size: this.cache.size,
      maxSize: this.cacheConfig.maxSize,
      hitRate: this.cache.size > 0 ? totalHits / this.cache.size : 0,
      entries: entries.sort((a, b) => b.hits - a.hits).slice(0, 20),
    }
  }

  calculateCost(model: string, inputTokens: number, outputTokens: number): number {
    const rate =
      this.config.costPerMillionTokens?.[model] || this.config.costPerMillionTokens?.default || 1.0
    return ((inputTokens + outputTokens) / 1_000_000) * rate
  }

  private evictLRU(): void {
    let oldestKey: string | null = null
    let oldestTime = Infinity

    for (const [key, entry] of this.cache) {
      if (entry.lastAccessedAt < oldestTime) {
        oldestTime = entry.lastAccessedAt
        oldestKey = key
      }
    }

    if (oldestKey) this.cache.delete(oldestKey)
  }

  private startCacheCleanup(): void {
    if (this.cleanupTimer) return

    this.cleanupTimer = setInterval(() => {
      const now = Date.now()
      for (const [key, entry] of this.cache) {
        if (now - entry.createdAt > entry.ttl) {
          this.cache.delete(key)
        }
      }
    }, this.cacheConfig.cleanupInterval)
  }

  private loadDefaultFilterRules(): void {
    this.filterRules = [
      {
        id: 'default-1',
        name: 'PII Email',
        pattern: /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/i,
        action: 'warn',
        category: 'PII',
        enabled: true,
        priority: 10,
      },
      {
        id: 'default-2',
        name: 'PII Phone',
        pattern: /\b\d{11}\b|\b\d{3}-\d{4}-\d{4}\b|\(\d{3}\)\s*\d{3}-\d{4}/,
        action: 'warn',
        category: 'PII',
        enabled: true,
        priority: 10,
      },
      {
        id: 'default-3',
        name: 'API Key Pattern',
        pattern: /\b(sk-[A-Za-z0-9]{20,})\b/,
        action: 'block',
        category: 'security',
        enabled: true,
        priority: 99,
      },
    ]
  }

  private estimateSize(value: any): number {
    if (value == null) return 8
    if (typeof value === 'string') return value.length * 2
    if (typeof value === 'number') return 8
    if (typeof value === 'boolean') return 4
    if (typeof value === 'object') return JSON.stringify(value).length * 2
    return 32
  }

  destroy(): void {
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer)
      this.cleanupTimer = null
    }
    this.cache.clear()
    this.tokenRecords = []
    this.filterRules = []
  }
}

export const governanceService = new GovernanceService()
