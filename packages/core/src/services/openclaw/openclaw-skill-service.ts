import {
  OpenClawSkill,
  SkillToolDefinition,
  SkillExecutionContext,
  SkillExecutionResult,
  ExecutionStep,
  ClawHubSkill,
  SkillFilter,
  DependencyResolution,
  SkillHealthReport,
} from './openclaw-types'
import { OpenClawGatewayBridge } from './openclaw-gateway-bridge'

const logger = console

export class OpenClawSkillService {
  private gateway: OpenClawGatewayBridge
  private skills = new Map<string, OpenClawSkill>()
  private toolHandlers = new Map<string, (params: any, ctx?: SkillExecutionContext) => Promise<any>>()
  private rateLimitMap = new Map<string, { count: number; resetAt: number }>()

  constructor(gateway: OpenClawGatewayBridge) {
    this.gateway = gateway
    this.registerBuiltinSkills()
  }

  async discoverSkills(source: 'builtin' | 'workspace' | 'clawhub' | 'custom'): Promise<OpenClawSkill[]> {
    const result = Array.from(this.skills.values()).filter((s) => s.source === source)

    if (source === 'clawhub') {
      try {
        const remote = await this.gateway.request<ClawHubSkill[]>('GET', '/api/skills/clawhub?limit=100')
        for (const item of remote) {
          if (!this.skills.has(item.id)) {
            this.skills.set(item.id, {
              id: item.id,
              name: item.name,
              description: item.description,
              version: item.version,
              category: item.category,
              author: item.author,
              source: 'clawhub',
              tools: {},
              enabled: false,
            })
          }
        }
      } catch { /* local only */ }
    }

    return Array.from(this.skills.values()).filter((s) => s.source === source)
  }

  async installSkill(idOrUrl: string): Promise<OpenClawSkill> {
    try {
      const skill = await this.gateway.request<any>('POST', '/api/skills/install', { id: idOrUrl })
      const mapped: OpenClawSkill = {
        id: skill.id || idOrUrl,
        name: skill.name || idOrUrl,
        description: skill.description || '',
        version: skill.version || '1.0.0',
        category: skill.category || 'general',
        author: skill.author,
        source: skill.source === 'workspace' ? 'workspace' : 'custom',
        keywords: skill.keywords,
        tools: this.mapToolDefinitions(skill.tools || {}),
        scripts: skill.scripts?.map((s: any) => ({
          name: s.name,
          language: s.language || 'javascript',
          path: s.path || s.entryPoint || '',
          entryPoint: s.entryPoint,
        })),
        metadata: skill.metadata,
        enabled: true,
        installedAt: Date.now(),
        updatedAt: Date.now(),
      }
      this.skills.set(mapped.id, mapped)
      return mapped
    } catch (err: any) {
      throw new Error(`Failed to install skill ${idOrUrl}: ${err.message}`)
    }
  }

  async uninstallSkill(id: string): Promise<boolean> {
    const skill = this.skills.get(id)
    if (!skill) return false

    for (const toolName of Object.keys(skill.tools)) {
      this.toolHandlers.delete(`${id}:${toolName}`)
    }

    try {
      await this.gateway.request('DELETE', `/api/skills/${id}`)
    } catch { /* local */ }

    return this.skills.delete(id)
  }

  async updateSkill(id: string): Promise<OpenClawSkill | null> {
    const existing = this.skills.get(id)
    if (!existing) return null

    try {
      const updated = await this.gateway.request<any>('POST', `/api/skills/${id}/update`)
      Object.assign(existing, updated, { updatedAt: Date.now() })
      this.skills.set(id, existing)
      return existing
    } catch {
      return existing
    }
  }

  getSkill(id: string): OpenClawSkill | undefined {
    return this.skills.get(id)
  }

  listSkills(filter?: SkillFilter): OpenClawSkill[] {
    let result = Array.from(this.skills.values())

    if (filter) {
      if (filter.category) result = result.filter((s) => s.category === filter.category)
      if (filter.source) result = result.filter((s) => s.source === filter.source)
      if (filter.enabled !== undefined) result = result.filter((s) => s.enabled === filter.enabled)
      if (filter.keyword) {
        const kw = filter.keyword.toLowerCase()
        result = result.filter(
          (s) =>
            s.name.toLowerCase().includes(kw) ||
            s.description.toLowerCase().includes(kw) ||
            s.keywords?.some((k) => k.toLowerCase().includes(kw)),
        )
      }
    }

    return result.sort((a, b) => a.name.localeCompare(b.name))
  }

  searchSkills(query: string): OpenClawSkill[] {
    const q = query.toLowerCase()
    return Array.from(this.skills.values())
      .filter(
        (s) =>
          s.name.toLowerCase().includes(q) ||
          s.description.toLowerCase().includes(q) ||
          s.keywords?.some((k) => k.toLowerCase().includes(q)),
      )
      .sort((a, b) => {
        const aScore = (a.name.toLowerCase().startsWith(q) ? 2 : 0) + (a.keywords?.some((k) => k.includes(q)) ? 1 : 0)
        const bScore = (b.name.toLowerCase().startsWith(q) ? 2 : 0) + (b.keywords?.some((k) => k.includes(q)) ? 1 : 0)
        return bScore - aScore
      })
  }

  enableSkill(id: string): boolean {
    const skill = this.skills.get(id)
    if (!skill) return false
    skill.enabled = true
    this.skills.set(id, skill)
    return true
  }

  disableSkill(id: string): boolean {
    const skill = this.skills.get(id)
    if (!skill) return false
    skill.enabled = false
    this.skills.set(id, skill)
    return true
  }

  async execute(request: {
    skillId: string
    toolName: string
    params: Record<string, any>
    context?: SkillExecutionContext
  }): Promise<SkillExecutionResult> {
    const startTime = Date.now()
    const skill = this.skills.get(request.skillId)

    if (!skill) {
      return {
        success: false,
        skillId: request.skillId,
        toolName: request.toolName,
        output: null,
        error: `Skill not found: ${request.skillId}`,
        executionTimeMs: Date.now() - startTime,
      }
    }

    if (!skill.enabled) {
      return {
        success: false,
        skillId: request.skillId,
        toolName: request.toolName,
        output: null,
        error: `Skill disabled: ${skill.name}`,
        executionTimeMs: Date.now() - startTime,
      }
    }

    const toolDef = skill.tools[request.toolName]
    if (!toolDef && !this.toolHandlers.has(`${request.skillId}:${request.toolName}`)) {
      return {
        success: false,
        skillId: request.skillId,
        toolName: request.toolName,
        output: null,
        error: `Tool not found in skill: ${request.toolName}`,
        executionTimeMs: Date.now() - startTime,
      }
    }

    if (toolDef?.rateLimit && !this.checkRateLimit(`${request.skillId}:${request.toolName}`, toolDef.rateLimit)) {
      return {
        success: false,
        skillId: request.skillId,
        toolName: request.toolName,
        output: null,
        error: 'Rate limit exceeded',
        executionTimeMs: Date.now() - startTime,
      }
    }

    try {
      let output: any

      const handlerKey = `${request.skillId}:${request.toolName}`
      const handler = this.toolHandlers.get(handlerKey)

      if (handler) {
        output = await handler(request.params, request.context)
      } else {
        output = await this.gateway.request('POST', `/api/skills/${request.skillId}/tools/${request.toolName}`, {
          params: request.params,
          context: request.context,
        })
      }

      return {
        success: true,
        skillId: request.skillId,
        toolName: request.toolName,
        output,
        executionTimeMs: Date.now() - startTime,
        steps: [
          {
            step: 1,
            tool: request.toolName,
            input: request.params,
            output: typeof output === 'object' ? JSON.stringify(output).slice(0, 500) : String(output),
            durationMs: Date.now() - startTime,
            success: true,
          },
        ],
      }
    } catch (err: any) {
      return {
        success: false,
        skillId: request.skillId,
        toolName: request.toolName,
        output: null,
        error: err.message,
        executionTimeMs: Date.now() - startTime,
      }
    }
  }

  registerToolHandler(skillId: string, toolName: string, handler: (params: any, ctx?: SkillExecutionContext) => Promise<any>): void {
    const key = `${skillId}:${toolName}`
    this.toolHandlers.set(key, handler)
  }

  unregisterToolHandler(skillId: string, toolName: string): void {
    this.toolHandlers.delete(`${skillId}:${toolName}`)
  }

  async searchClawHub(query: string): Promise<ClawHubSkill[]> {
    try {
      return await this.gateway.request<ClawHubSkill[]>('GET', `/api/skills/clawhub?q=${encodeURIComponent(query)}&limit=50`)
    } catch {
      return []
    }
  }

  async installFromClawHub(skillId: string): Promise<OpenClawSkill> {
    return this.installSkill(`clawhub:${skillId}`)
  }

  resolveDependencies(skillId: string): DependencyResolution {
    const skill = this.skills.get(skillId)
    if (!skill) {
      return { skillId, dependencies: [], missing: [skillId], circular: false }
    }

    const deps: DependencyResolution['dependencies'] = []
    const visited = new Set<string>()
    const stack = [skillId]

    while (stack.length > 0) {
      const current = stack.pop()!
      if (visited.has(current)) continue
      visited.add(current)

      const currentSkill = this.skills.get(current)
      if (currentSkill?.metadata?.dependencies) {
        for (const dep of currentSkill.metadata.dependencies as string[]) {
          deps.push({ skillId: dep, version: '*', satisfied: this.skills.has(dep) })
          if (!this.skills.has(dep) && !deps.find((d) => d.skillId === dep)?.satisfied) {
            stack.push(dep)
          }
        }
      }
    }

    const missing = deps.filter((d) => !d.satisfied).map((d) => d.skillId)

    return {
      skillId,
      dependencies: deps,
      missing: [...new Set(missing)],
      circular: visited.size > 50,
    }
  }

  checkSkillHealth(skillId: string): SkillHealthReport {
    const skill = this.skills.get(skillId)
    if (!skill) {
      return { skillId, healthy: false, issues: ['Skill not registered'] }
    }

    const issues: string[] = []

    if (!skill.enabled) issues.push('Skill is disabled')
    if (!skill.tools || Object.keys(skill.tools).length === 0) issues.push('No tools defined')
    if (skill.metadata?.deprecated) issues.push('Skill is deprecated')

    const hasHandler = Object.keys(skill.tools).some((t) => this.toolHandlers.has(`${skillId}:${t}`))
    if (!hasHandler) issues.push('No tool handlers registered')

    return {
      skillId,
      healthy: issues.length === 0,
      issues,
      lastExecutedAt: skill.updatedAt,
      successRate: issues.length === 0 ? 1.0 : 0.5,
    }
  }

  private mapToolDefinitions(tools: Record<string, any>): Record<string, SkillToolDefinition> {
    const result: Record<string, SkillToolDefinition> = {}
    for (const [name, def] of Object.entries(tools)) {
      result[name] = {
        name: def.name || name,
        description: def.description || '',
        parameters: (def.parameters || []).map((p: any) => ({
          name: p.name,
          type: p.type || 'string',
          description: p.description || '',
          required: p.required || false,
          default: p.default,
          enum: p.enum,
        })),
        requiresAuth: def.requiresAuth || false,
        rateLimit: def.rateLimit,
      }
    }
    return result
  }

  private checkRateLimit(key: string, limit: { maxRequests: number; windowMs: number }): boolean {
    const now = Date.now()
    const entry = this.rateLimitMap.get(key)

    if (!entry || now >= entry.resetAt) {
      this.rateLimitMap.set(key, { count: 1, resetAt: now + limit.windowMs })
      return true
    }

    if (entry.count >= limit.maxRequests) return false

    entry.count++
    return true
  }

  private registerBuiltinSkills(): void {
    const builtinSkills: Omit<OpenClawSkill, 'tools'>[] = [
      {
        id: 'chat',
        name: '基础聊天',
        description: 'AI 对话能力，支持多轮对话和上下文理解',
        version: '1.0.0',
        category: 'communication',
        author: 'OpenClaw',
        source: 'builtin',
        keywords: ['chat', '对话', 'AI'],
        enabled: true,
      },
      {
        id: 'web-search',
        name: '网络搜索',
        description: '搜索引擎集成，支持 Google/Bing/DuckDuckGo',
        version: '1.0.0',
        category: 'search',
        author: 'OpenClaw',
        source: 'builtin',
        keywords: ['search', '搜索', 'web'],
        enabled: true,
      },
      {
        id: 'git-ops',
        name: 'Git 操作',
        description: 'Git 版本控制操作：commit/pull/push/branch',
        version: '1.0.0',
        category: 'code',
        author: 'OpenClaw',
        source: 'builtin',
        keywords: ['git', '版本控制', '代码'],
        enabled: true,
      },
      {
        id: 'npm-ops',
        name: 'NPM 操作',
        description: 'NPM 包管理：install/build/publish',
        version: '1.0.0',
        category: 'code',
        author: 'OpenClaw',
        source: 'builtin',
        keywords: ['npm', '包管理', 'node'],
        enabled: true,
      },
      {
        id: 'file-manager',
        name: '文件管理',
        description: '文件读写、搜索和组织',
        version: '1.0.0',
        category: 'productivity',
        author: 'OpenClaw',
        source: 'builtin',
        keywords: ['file', '文件', '管理'],
        enabled: true,
      },
      {
        id: 'image-gen',
        name: '图像生成',
        description: 'AI 绘图和图像处理',
        version: '1.0.0',
        category: 'media',
        author: 'OpenClaw',
        source: 'builtin',
        keywords: ['image', '图片', '生成', '绘画'],
        enabled: true,
      },
      {
        id: 'tts',
        name: '语音合成',
        description: '文本转语音 TTS',
        version: '1.0.0',
        category: 'media',
        author: 'OpenClaw',
        source: 'builtin',
        keywords: ['tts', '语音', '合成'],
        enabled: true,
      },
      {
        id: 'asr',
        name: '语音识别',
        description: '语音转文本 ASR',
        version: '1.0.0',
        category: 'media',
        author: 'OpenClaw',
        source: 'builtin',
        keywords: ['asr', '语音', '识别', '转录'],
        enabled: true,
      },
      {
        id: 'webhook-trigger',
        name: 'Webhook 触发',
        description: '触发外部 Webhook 端点',
        version: '1.0.0',
        category: 'automation',
        author: 'OpenClaw',
        source: 'builtin',
        keywords: ['webhook', '触发', '自动化'],
        enabled: true,
      },
      {
        id: 'data-query',
        name: '数据查询',
        description: 'SQL/NoSQL 数据库查询',
        version: '1.0.0',
        category: 'data',
        author: 'OpenClaw',
        source: 'builtin',
        keywords: ['data', '数据库', '查询', 'sql'],
        enabled: true,
      },
      {
        id: 'secret-scan',
        name: '密钥扫描',
        description: '敏感信息检测和安全扫描',
        version: '1.0.0',
        category: 'security',
        author: 'OpenClaw',
        source: 'builtin',
        keywords: ['secret', '密钥', '安全', '扫描'],
        enabled: true,
      },
      {
        id: 'code-search',
        name: '代码搜索',
        description: 'GitHub/GitLab 代码搜索',
        version: '1.0.0',
        category: 'search',
        author: 'OpenClaw',
        source: 'builtin',
        keywords: ['code', '代码', '搜索', 'github'],
        enabled: true,
      },
    ]

    for (const skill of builtinSkills) {
      this.skills.set(skill.id, { ...skill, tools: {} })
    }
  }
}

let skillServiceInstance: OpenClawSkillService | null = null

export function getOpenClawSkillService(gateway?: OpenClawGatewayBridge): OpenClawSkillService {
  if (!skillServiceInstance) {
    const gw = gateway || (() => {
      const { getOpenClawGateway: g } = require('./openclaw-gateway-bridge')
      return g()
    })()
    skillServiceInstance = new OpenClawSkillService(gw)
  }
  return skillServiceInstance
}
