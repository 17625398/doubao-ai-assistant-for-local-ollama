import type { DoubaoPageContext, DoubaoSkillRequest } from '../shared/protocol'

interface StoredAIConfig {
  provider?: 'ollama' | 'openai' | 'custom' | string
  ollama?: {
    baseUrl?: string
    defaultModel?: string
    timeout?: number
    modelParams?: { temperature?: number; maxTokens?: number; topP?: number }
  }
  openai?: {
    baseUrl?: string
    apiKey?: string
    defaultModel?: string
    timeout?: number
    headers?: Record<string, string>
    modelParams?: { temperature?: number; maxTokens?: number; topP?: number }
  }
  custom?: {
    baseUrl?: string
    apiKey?: string
    defaultModel?: string
    timeout?: number
    headers?: Record<string, string>
    modelParams?: { temperature?: number; maxTokens?: number; topP?: number }
  }
}

export interface ModelCompletionResult {
  content: string
  provider: string
  model: string
}

const STORAGE_KEY = 'ai-service-config'
const DEFAULT_TIMEOUT = 45_000

async function loadAIConfig(): Promise<StoredAIConfig> {
  const result = await chrome.storage.local.get(STORAGE_KEY)
  return (result[STORAGE_KEY] || {}) as StoredAIConfig
}

function normalizeBaseUrl(baseUrl: string | undefined, fallback: string): string {
  const value = (baseUrl || fallback).trim()
  return value.endsWith('/') ? value.slice(0, -1) : value
}

function buildPrompt(request: DoubaoSkillRequest): string {
  const context = request.context
  const selected = context?.selectedText?.trim()
  const text = request.prompt?.trim() || selected || context?.mainText || ''
  const pageInfo = context
    ? [
        `标题：${context.title}`,
        `URL：${context.url}`,
        context.description ? `描述：${context.description}` : '',
        context.headings.length ? `标题结构：${context.headings.slice(0, 10).join(' / ')}` : '',
      ]
        .filter(Boolean)
        .join('\n')
    : '无页面上下文'

  const taskMap: Record<DoubaoSkillRequest['skillId'], string> = {
    summarize: '请总结页面内容，输出核心结论、关键事实、下一步建议。',
    translate: '请把输入内容翻译为中文，保留关键术语；如果原文是中文，则翻译为英文。',
    'deep-search': '请基于页面内容设计深度搜索计划，给出检索问题、关键词、可信来源类型和报告大纲。',
    'extract-outline': '请提取结构化大纲，按层级列出主题、论点、证据和遗漏信息。',
    'write-email': '请基于页面内容写一封清晰、专业、可执行的商务邮件。',
    'code-review': '请进行代码/技术内容审查，指出风险、可维护性问题和改进建议。',
    'diagnose-page': '请诊断页面上下文提取质量，指出可能缺失、噪声、动态内容和登录态问题。',
  }

  return [
    taskMap[request.skillId],
    '',
    '页面信息：',
    pageInfo,
    '',
    '输入内容：',
    text.slice(0, 12000),
    '',
    '请使用 Markdown，结构包括：摘要、要点、行动建议、可追问问题。',
  ].join('\n')
}

async function completeWithOllama(config: StoredAIConfig, request: DoubaoSkillRequest): Promise<ModelCompletionResult> {
  const ollama = config.ollama || {}
  const baseUrl = normalizeBaseUrl(ollama.baseUrl, 'http://localhost:11434')
  const model = ollama.defaultModel || 'gemma4:26b'
  const response = await fetch(`${baseUrl}/api/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    signal: AbortSignal.timeout(ollama.timeout || DEFAULT_TIMEOUT),
    body: JSON.stringify({
      model,
      stream: false,
      messages: [
        {
          role: 'system',
          content: '你是桌面端豆包 AI 侧边栏助手，擅长网页阅读、摘要、翻译、写作、搜索规划、代码审查和页面诊断。',
        },
        { role: 'user', content: buildPrompt(request) },
      ],
      options: {
        temperature: ollama.modelParams?.temperature ?? 0.4,
        top_p: ollama.modelParams?.topP ?? 0.9,
        num_predict: ollama.modelParams?.maxTokens ?? 2048,
      },
    }),
  })

  if (!response.ok) {
    const detail = await response.text().catch(() => '')
    throw new Error(detail || `Ollama 请求失败：${response.status}`)
  }

  const data = await response.json()
  const content = data?.message?.content || data?.response || ''
  return { content: String(content), provider: 'ollama', model }
}

async function completeWithOpenAICompatible(config: StoredAIConfig, request: DoubaoSkillRequest): Promise<ModelCompletionResult> {
  const providerConfig = config.provider === 'custom' ? config.custom || {} : config.openai || {}
  const baseUrl = normalizeBaseUrl(providerConfig.baseUrl, config.provider === 'custom' ? 'http://localhost:1234/v1' : 'https://api.openai.com/v1')
  const model = providerConfig.defaultModel || 'gpt-4o-mini'
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(providerConfig.headers || {}),
  }
  if (providerConfig.apiKey && !headers.Authorization && !headers.authorization) {
    headers.Authorization = `Bearer ${providerConfig.apiKey}`
  }

  const response = await fetch(`${baseUrl}/chat/completions`, {
    method: 'POST',
    headers,
    signal: AbortSignal.timeout(providerConfig.timeout || DEFAULT_TIMEOUT),
    body: JSON.stringify({
      model,
      stream: false,
      temperature: providerConfig.modelParams?.temperature ?? 0.4,
      max_tokens: providerConfig.modelParams?.maxTokens ?? 2048,
      messages: [
        {
          role: 'system',
          content: '你是桌面端豆包 AI 侧边栏助手，擅长网页阅读、摘要、翻译、写作、搜索规划、代码审查和页面诊断。',
        },
        { role: 'user', content: buildPrompt(request) },
      ],
    }),
  })

  if (!response.ok) {
    const detail = await response.text().catch(() => '')
    throw new Error(detail || `OpenAI-compatible 请求失败：${response.status}`)
  }

  const data = await response.json()
  return {
    content: String(data?.choices?.[0]?.message?.content || ''),
    provider: config.provider === 'custom' ? 'custom' : 'openai',
    model,
  }
}

export async function completeSkillWithConfiguredModel(request: DoubaoSkillRequest): Promise<ModelCompletionResult> {
  const config = await loadAIConfig()
  const provider = config.provider || 'ollama'
  if (provider === 'openai' || provider === 'custom') {
    return completeWithOpenAICompatible(config, request)
  }
  return completeWithOllama(config, request)
}

export function createModelPromptPreview(request: DoubaoSkillRequest): string {
  return buildPrompt(request)
}
