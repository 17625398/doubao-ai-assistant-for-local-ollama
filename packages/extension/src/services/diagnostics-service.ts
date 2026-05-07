import type {
  DiagnosticCheck,
  DiagnosticReport,
  DiagnosticSection,
  DiagnosticStatus,
  DoubaoPageContext,
} from '../shared/protocol'

interface StoredAIConfig {
  provider?: string
  ollama?: { baseUrl?: string; defaultModel?: string; timeout?: number }
  openai?: { baseUrl?: string; apiKey?: string; defaultModel?: string; timeout?: number }
  custom?: { baseUrl?: string; apiKey?: string; defaultModel?: string; timeout?: number }
}

const STORAGE_KEY = 'ai-service-config'
const REQUIRED_PERMISSIONS = ['storage', 'tabs', 'scripting', 'contextMenus', 'sidePanel', 'webNavigation']
const REQUIRED_HOSTS = ['<all_urls>']

function normalizeBaseUrl(baseUrl: string | undefined, fallback: string): string {
  const value = (baseUrl || fallback).trim()
  return value.endsWith('/') ? value.slice(0, -1) : value
}

function worstStatus(statuses: DiagnosticStatus[]): DiagnosticStatus {
  if (statuses.includes('fail')) return 'fail'
  if (statuses.includes('warn')) return 'warn'
  if (statuses.includes('info')) return 'info'
  return 'pass'
}

function section(id: string, name: string, checks: DiagnosticCheck[]): DiagnosticSection {
  return { id, name, status: worstStatus(checks.map(check => check.status)), checks }
}

async function loadAIConfig(): Promise<StoredAIConfig> {
  const result = await chrome.storage.local.get(STORAGE_KEY)
  return (result[STORAGE_KEY] || {}) as StoredAIConfig
}

async function testFetch(url: string, timeout = 5000, headers?: Record<string, string>): Promise<{ ok: boolean; status?: number; detail: string }> {
  try {
    const response = await fetch(url, {
      method: 'GET',
      headers,
      signal: AbortSignal.timeout(timeout),
    })
    return { ok: response.ok, status: response.status, detail: response.ok ? '连接成功' : `HTTP ${response.status}` }
  } catch (error) {
    return { ok: false, detail: error instanceof Error ? error.message : String(error) }
  }
}

async function diagnoseModel(config: StoredAIConfig): Promise<DiagnosticSection> {
  const provider = config.provider || 'ollama'
  const checks: DiagnosticCheck[] = [
    {
      id: 'provider-selected',
      name: '模型 Provider 配置',
      status: provider ? 'pass' : 'warn',
      detail: `当前 Provider：${provider || '未配置'}`,
      hint: '可在扩展设置页配置 Ollama、OpenAI 或自定义 OpenAI-compatible 服务。',
    },
  ]

  if (provider === 'openai' || provider === 'custom') {
    const providerConfig = provider === 'custom' ? config.custom : config.openai
    const baseUrl = normalizeBaseUrl(providerConfig?.baseUrl, provider === 'custom' ? 'http://localhost:1234/v1' : 'https://api.openai.com/v1')
    const headers: Record<string, string> = {}
    if (providerConfig?.apiKey) headers.Authorization = `Bearer ${providerConfig.apiKey}`
    const result = await testFetch(`${baseUrl}/models`, providerConfig?.timeout || 7000, headers)
    checks.push({
      id: 'openai-compatible-models',
      name: 'OpenAI-compatible /models',
      status: result.ok ? 'pass' : 'fail',
      detail: `${baseUrl}/models：${result.detail}`,
      hint: result.ok ? '模型服务可访问。' : '请检查 baseUrl、API Key、代理和跨域/网络访问。',
      action: '打开扩展设置页并检查 OpenAI-compatible 配置',
      meta: { provider, baseUrl, status: result.status ?? null },
    })
  } else {
    const baseUrl = normalizeBaseUrl(config.ollama?.baseUrl, 'http://localhost:11434')
    const result = await testFetch(`${baseUrl}/api/tags`, config.ollama?.timeout || 7000)
    checks.push({
      id: 'ollama-tags',
      name: 'Ollama /api/tags',
      status: result.ok ? 'pass' : 'fail',
      detail: `${baseUrl}/api/tags：${result.detail}`,
      hint: result.ok
        ? 'Ollama 可访问。'
        : '请确认 Ollama 已启动，并设置 OLLAMA_ORIGINS=chrome-extension://* 后重启 Ollama。',
      action: 'ollama serve',
      meta: { baseUrl, defaultModel: config.ollama?.defaultModel || '未配置', status: result.status ?? null },
    })
  }

  return section('model', '模型连接诊断', checks)
}

async function diagnosePermissions(): Promise<DiagnosticSection> {
  const checks: DiagnosticCheck[] = []
  for (const permission of REQUIRED_PERMISSIONS) {
    const granted = await chrome.permissions.contains({ permissions: [permission as chrome.runtime.ManifestPermissions] })
    checks.push({
      id: `permission-${permission}`,
      name: `权限：${permission}`,
      status: granted ? 'pass' : 'fail',
      detail: granted ? '已授予' : '未授予',
      hint: granted ? undefined : '请检查 manifest 权限或重新加载扩展。',
    })
  }

  const hostGranted = await chrome.permissions.contains({ origins: REQUIRED_HOSTS })
  checks.push({
    id: 'host-all-urls',
    name: 'Host 权限：<all_urls>',
    status: hostGranted ? 'pass' : 'fail',
    detail: hostGranted ? '已授予所有网页访问权限' : '未授予所有网页访问权限',
    hint: hostGranted ? undefined : '网页阅读、侧边栏上下文采集需要 host 权限。',
  })

  return section('permissions', '扩展权限诊断', checks)
}

async function diagnoseActiveTab(context: DoubaoPageContext | null): Promise<DiagnosticSection> {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true })
  const url = tab?.url || context?.url || ''
  const isRestricted = /^(chrome|edge|about|devtools|chrome-extension):/i.test(url)
  const checks: DiagnosticCheck[] = [
    {
      id: 'active-tab',
      name: '当前标签页',
      status: tab?.id ? 'pass' : 'fail',
      detail: tab?.id ? `Tab ${tab.id}：${tab.title || '未命名'}` : '无法获取当前标签页',
      meta: { tabId: tab?.id ?? null },
    },
    {
      id: 'restricted-url',
      name: '页面协议可注入性',
      status: isRestricted ? 'warn' : 'pass',
      detail: isRestricted ? `受限页面：${url}` : `可尝试注入：${url || '未知 URL'}`,
      hint: isRestricted ? '浏览器内部页面通常禁止内容脚本注入，请切换到普通网页。' : undefined,
    },
  ]
  return section('tab', '当前标签页诊断', checks)
}

function diagnoseContext(context: DoubaoPageContext | null): DiagnosticSection {
  const checks: DiagnosticCheck[] = []
  if (!context) {
    checks.push({
      id: 'context-present',
      name: '页面上下文缓存',
      status: 'fail',
      detail: '暂无页面上下文',
      hint: '点击侧边栏“重新提取”或页面右下角“豆包”按钮。',
    })
    return section('context', '页面上下文质量', checks)
  }

  checks.push({
    id: 'context-present',
    name: '页面上下文缓存',
    status: 'pass',
    detail: `已捕获：${context.title}`,
    meta: { capturedAt: context.capturedAt },
  })
  checks.push({
    id: 'content-length',
    name: '正文长度',
    status: context.stats.characters > 500 ? 'pass' : context.stats.characters > 80 ? 'warn' : 'fail',
    detail: `正文字符数：${context.stats.characters}`,
    hint: context.stats.characters <= 500 ? '内容较短，可能是登录页、动态页面、iframe 或正文提取受限。' : undefined,
  })
  checks.push({
    id: 'heading-structure',
    name: '标题结构',
    status: context.stats.headings > 0 ? 'pass' : 'warn',
    detail: `标题数：${context.stats.headings}`,
    hint: context.stats.headings === 0 ? '缺少标题结构会影响大纲和摘要质量。' : undefined,
  })
  checks.push({
    id: 'selected-text',
    name: '选区上下文',
    status: context.selectedText ? 'pass' : 'info',
    detail: context.selectedText ? `已捕获选区：${context.selectedText.length} 字符` : '未捕获选区',
    hint: '选择文本后使用右键菜单可获得更精准结果。',
  })

  return section('context', '页面上下文质量', checks)
}

function buildExportText(report: Omit<DiagnosticReport, 'exportText'>): string {
  const lines = [
    `# ${report.title}`,
    `生成时间：${report.generatedAt}`,
    `总体状态：${report.overallStatus}`,
    '',
    report.summary,
    '',
  ]

  for (const sec of report.sections) {
    lines.push(`## ${sec.name} (${sec.status})`)
    for (const check of sec.checks) {
      lines.push(`- [${check.status}] ${check.name}: ${check.detail}`)
      if (check.hint) lines.push(`  - 提示：${check.hint}`)
      if (check.action) lines.push(`  - 建议操作：${check.action}`)
    }
    lines.push('')
  }

  return lines.join('\n')
}

export async function runDiagnostics(context: DoubaoPageContext | null): Promise<DiagnosticReport> {
  const config = await loadAIConfig()
  const sections = [
    await diagnoseModel(config),
    await diagnosePermissions(),
    await diagnoseActiveTab(context),
    diagnoseContext(context),
  ]
  const overallStatus = worstStatus(sections.map(item => item.status))
  const failCount = sections.flatMap(item => item.checks).filter(item => item.status === 'fail').length
  const warnCount = sections.flatMap(item => item.checks).filter(item => item.status === 'warn').length
  const generatedAt = new Date().toISOString()
  const reportWithoutExport = {
    id: `diag-${Date.now()}`,
    title: '豆包 AI 工作台诊断报告',
    generatedAt,
    summary: failCount > 0 ? `发现 ${failCount} 项失败、${warnCount} 项警告。` : warnCount > 0 ? `未发现失败项，存在 ${warnCount} 项警告。` : '所有关键检查均通过。',
    overallStatus,
    sections,
  }

  return {
    ...reportWithoutExport,
    exportText: buildExportText(reportWithoutExport),
  }
}
