import {
  OpenClawToolDefinition,
  CronJob,
  CronAction,
  CronSchedule,
  CronRunResult,
  CronRunHistory,
} from './openclaw-types'
import { OpenClawGatewayBridge } from './openclaw-gateway-bridge'

const logger = console

export class OpenClawToolBridge {
  private gateway: OpenClawGatewayBridge
  private tools = new Map<string, OpenClawToolDefinition>()
  private cronJobs = new Map<string, CronJob>()
  private cronTimers = new Map<string, ReturnType<typeof setTimeout>>()

  constructor(gateway: OpenClawGatewayBridge) {
    this.gateway = gateway
    this.registerBuiltinTools()
    this.startCronScheduler()
  }

  listTools(): OpenClawToolDefinition[] {
    return Array.from(this.tools.values()).sort((a, b) => a.name.localeCompare(b.name))
  }

  getTool(id: string): OpenClawToolDefinition | undefined {
    return this.tools.get(id)
  }

  async callTool(toolId: string, params: Record<string, any>): Promise<any> {
    const tool = this.tools.get(toolId)
    if (!tool) throw new Error(`Tool not found: ${toolId}`)

    try {
      const result = await this.gateway.request('POST', `/api/tools/${toolId}/call`, { params })
      return result
    } catch (err: any) {
      logger.error(`[OpenClawTool] Error calling ${toolId}: ${err.message}`)
      throw err
    }
  }

  async *callToolStream(toolId: string, params: Record<string, any>): AsyncGenerator<any> {
    const tool = this.tools.get(toolId)
    if (!tool) {
      yield { type: 'error', error: `Tool not found: ${toolId}` }
      return
    }

    try {
      yield* this.gateway.stream(`/api/tools/${toolId}/stream`, { params })
    } catch (err: any) {
      yield { type: 'error', error: err.message }
    }
  }

  async browserNavigate(url: string): Promise<any> {
    return this.callTool('browser-navigate', { url })
  }

  async browserScreenshot(options?: { fullPage?: boolean; format?: string }): Promise<any> {
    return this.callTool('browser-screenshot', options || {})
  }

  async browserAction(action: string, params: Record<string, any> = {}): Promise<any> {
    const toolMap: Record<string, string> = {
      click: 'browser-click',
      type: 'browser-type',
      extractText: 'browser-extract-text',
      evaluate: 'browser-evaluate',
      waitFor: 'browser-wait-for',
      getPageContent: 'browser-get-page-content',
    }
    const toolId = toolMap[action] || `browser-${action}`
    return this.callTool(toolId, params)
  }

  async canvasCreate(type: string): Promise<any> {
    return this.callTool('canvas-create', { type })
  }

  async canvasRender(canvasId: string, data: any): Promise<any> {
    return this.callTool('canvas-render', { id: canvasId, data })
  }

  async canvasExport(canvasId: string, format: string = 'png'): Promise<any> {
    return this.callTool('canvas-export', { id: canvasId, format })
  }

  async cronCreate(
    name: string,
    schedule: CronSchedule,
    action: CronAction,
    agentId?: string
  ): Promise<CronJob> {
    const job: CronJob = {
      id: `cron_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      name,
      schedule,
      action,
      agentId,
      enabled: true,
      createdAt: Date.now(),
      updatedAt: Date.now(),
      runCount: 0,
      errorCount: 0,
    }

    this.cronJobs.set(job.id, job)
    this.scheduleNextRun(job)
    logger.info(`[OpenClawTool] Created cron job: ${name}`)

    return job
  }

  cronList(): CronJob[] {
    return Array.from(this.cronJobs.values()).sort((a, b) => b.updatedAt - a.updatedAt)
  }

  getCron(jobId: string): CronJob | undefined {
    return this.cronJobs.get(jobId)
  }

  async cronEnable(jobId: string): Promise<boolean> {
    const job = this.cronJobs.get(jobId)
    if (!job) return false

    job.enabled = true
    job.updatedAt = Date.now()
    this.scheduleNextRun(job)
    return true
  }

  async cronDisable(jobId: string): Promise<boolean> {
    const job = this.cronJobs.get(jobId)
    if (!job) return false

    job.enabled = false
    job.updatedAt = Date.now()
    this.clearCronTimer(jobId)
    return true
  }

  async cronDelete(jobId: string): Promise<boolean> {
    this.clearCronTimer(jobId)
    return this.cronJobs.delete(jobId)
  }

  async cronRunNow(jobId: string): Promise<CronRunResult> {
    const job = this.cronJobs.get(jobId)
    if (!job) throw new Error(`Cron job not found: ${jobId}`)

    return this.executeCronJob(job)
  }

  cronHistory(jobId: string, limit: number = 50): CronRunHistory[] {
    const job = this.cronJobs.get(jobId)
    if (!job?.metadata?.history) return []

    return (job.metadata.history as CronRunHistory[])
      .sort((a, b) => b.startedAt - a.startedAt)
      .slice(0, limit)
  }

  async sessionList(agentId?: string): Promise<any[]> {
    try {
      const query = agentId ? `?agentId=${agentId}` : ''
      return await this.gateway.request<any[]>('GET', `/api/sessions${query}`)
    } catch {
      return []
    }
  }

  async sessionSend(sessionId: string, message: string): Promise<any> {
    return await this.gateway.request('POST', `/api/sessions/${sessionId}/send`, {
      content: message,
    })
  }

  async sessionSpawn(agentId: string, message: string): Promise<any> {
    return await this.gateway.request('POST', '/api/sessions/spawn', { agentId, content: message })
  }

  private executeCronJob(job: CronJob): CronRunResult {
    const runId = `run_${Date.now()}`
    const startedAt = Date.now()

    job.lastRunAt = startedAt
    job.runCount++
    job.updatedAt = startedAt

    if (!job.metadata) job.metadata = {}
    if (!job.metadata.history) job.metadata.history = []

    const historyEntry: CronRunHistory = {
      runId,
      jobId: job.id,
      startedAt,
      completedAt: 0,
      success: false,
      durationMs: 0,
    }

    ;(async () => {
      try {
        let output: any

        switch (job.action.type) {
          case 'message':
            output = await this.sessionSpawn(
              job.agentId || '',
              JSON.stringify(job.action.payload || {})
            )
            break
          case 'tool':
            output = await this.callTool(job.action.target, job.action.payload || {})
            break
          case 'webhook':
            output = await fetch(job.action.target, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ ...job.action.payload, runId, jobId: job.id }),
            }).then(r => r.json())
            break
          default:
            output = { status: 'unknown_action_type' }
        }

        historyEntry.completedAt = Date.now()
        historyEntry.success = true
        historyEntry.durationMs = Date.now() - startedAt
        historyEntry.outputSummary =
          typeof output === 'string' ? output.slice(0, 200) : JSON.stringify(output).slice(0, 200)
      } catch (err: any) {
        historyEntry.completedAt = Date.now()
        historyEntry.success = false
        historyEntry.durationMs = Date.now() - startedAt
        historyEntry.error = err.message
        job.errorCount++

        logger.error(`[OpenClawTool] Cron job "${job.name}" failed: ${err.message}`)
      } finally {
        job.metadata!.history!.push(historyEntry)
        if ((job.metadata!.history! as CronRunHistory[]).length > 100) {
          ;(job.metadata!.history! as CronRunHistory[]).shift()
        }
        job.updatedAt = Date.now()
      }
    })()

    return { runId, jobId: job.id, startedAt, completedAt: 0, success: true, durationMs: 0 }
  }

  private scheduleNextRun(job: CronJob): void {
    this.clearCronTimer(job.id)

    if (!job.enabled) return

    try {
      const delay = this.parseCronExpression(job.schedule.expression)
      if (delay <= 0 || delay > 86400000 * 365) return

      const timer = setTimeout(() => {
        this.executeCronJob(job)
        this.scheduleNextRun(job)
      }, delay)

      this.cronTimers.set(job.id, timer)
      job.nextRunAt = Date.now() + delay
    } catch (err) {
      logger.warn(`[OpenClawTool] Invalid cron expression for job "${job.name}": ${err}`)
    }
  }

  private parseCronExpression(expression: string): number {
    const now = new Date()

    if (/^\d+$/.test(expression)) {
      const sec = parseInt(expression)
      if (sec >= 1 && sec <= 86400) return sec * 1000
    }

    if (expression.includes('*')) {
      const parts = expression.trim().split(/\s+/)
      if (parts.length >= 5) {
        const minutePart = parts[0]
        if (minutePart === '*' || /^\d+$/.test(minutePart)) {
          const minVal = minutePart === '*' ? 1 : parseInt(minutePart)
          const nextMin = minVal > now.getMinutes() ? minVal : minVal + 60
          const diff = nextMin - now.getMinutes() + (nextMin > now.getMinutes() ? 0 : 60)
          return Math.max(diff * 60000, 60000)
        }
      }
    }

    if (expression.startsWith('@')) {
      const intervalMap: Record<string, number> = {
        hourly: 3600000,
        daily: 86400000,
        weekly: 604800000,
        monthly: 2592000000,
      }
      const key = expression.slice(1)
      if (intervalMap[key]) return intervalMap[key]
    }

    return 3600000
  }

  private clearCronTimer(jobId: string): void {
    const timer = this.cronTimers.get(jobId)
    if (timer) {
      clearTimeout(timer)
      this.cronTimers.delete(jobId)
    }
  }

  private startCronScheduler(): void {
    setInterval(() => {
      for (const [id, job] of this.cronJobs.entries()) {
        if (job.enabled && !this.cronTimers.has(id)) {
          this.scheduleNextRun(job)
        }
      }
    }, 60000)
  }

  private registerBuiltinTools(): void {
    const builtinTools: Omit<OpenClawToolDefinition, 'parameters'>[] = [
      {
        id: 'browser-navigate',
        name: '浏览器导航',
        category: 'browser',
        description: '导航到指定 URL',
        requiresSandbox: false,
        dangerous: false,
      },
      {
        id: 'browser-screenshot',
        name: '浏览器截图',
        category: 'browser',
        description: '截取当前页面截图',
        requiresSandbox: false,
        dangerous: false,
      },
      {
        id: 'browser-click',
        name: '浏览器点击',
        category: 'browser',
        description: '点击页面元素',
        requiresSandbox: false,
        dangerous: false,
      },
      {
        id: 'browser-type',
        name: '浏览器输入',
        category: 'browser',
        description: '在页面元素中输入文本',
        requiresSandbox: false,
        dangerous: false,
      },
      {
        id: 'browser-extract-text',
        name: '提取文本',
        category: 'browser',
        description: '提取页面文本内容',
        requiresSandbox: false,
        dangerous: false,
      },
      {
        id: 'browser-evaluate',
        name: '执行脚本',
        category: 'browser',
        description: '在页面执行 JavaScript',
        requiresSandbox: true,
        dangerous: true,
      },
      {
        id: 'browser-wait-for',
        name: '等待元素',
        category: 'browser',
        description: '等待页面元素出现',
        requiresSandbox: false,
        dangerous: false,
      },
      {
        id: 'browser-get-page-content',
        name: '获取页面内容',
        category: 'browser',
        description: '获取完整页面 HTML 内容',
        requiresSandbox: false,
        dangerous: false,
      },
      {
        id: 'canvas-create',
        name: '创建画布',
        category: 'canvas',
        description: '创建新的可视化画布',
        requiresSandbox: false,
        dangerous: false,
      },
      {
        id: 'canvas-render',
        name: '渲染画布',
        category: 'canvas',
        description: '渲染数据到画布',
        requiresSandbox: false,
        dangerous: false,
      },
      {
        id: 'canvas-export',
        name: '导出画布',
        category: 'canvas',
        description: '导出画布为图片/SVG/JSON',
        requiresSandbox: false,
        dangerous: false,
      },
      {
        id: 'list-canvases',
        name: '列出画布',
        category: 'canvas',
        description: '获取所有画布列表',
        requiresSandbox: false,
        dangerous: false,
      },
    ]

    for (const tool of builtinTools) {
      this.tools.set(tool.id, { ...tool, parameters: [] })
    }
  }
}

let toolBridgeInstance: OpenClawToolBridge | null = null

export function getOpenClawToolBridge(gateway?: OpenClawGatewayBridge): OpenClawToolBridge {
  if (!toolBridgeInstance) {
    const gw =
      gateway ||
      (() => {
        const { getOpenClawGateway: g } = require('./openclaw-gateway-bridge')
        return g()
      })()
    toolBridgeInstance = new OpenClawToolBridge(gw)
  }
  return toolBridgeInstance
}
