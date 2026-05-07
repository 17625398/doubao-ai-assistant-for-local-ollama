import './styles.css'
import type {
  DiagnosticReport,
  DoubaoArtifactListResult,
  DoubaoArtifactRecord,
  DoubaoExtensionMessage,
  DoubaoPageContext,
  DoubaoSkillRequest,
  DoubaoSkillResult,
} from '../shared/protocol'

let currentContext: DoubaoPageContext | null = null
let lastSkill: DoubaoSkillRequest['skillId'] = 'summarize'
let historyVisible = false

function byId<T extends HTMLElement>(id: string): T {
  const element = document.getElementById(id)
  if (!element) throw new Error(`Missing element: ${id}`)
  return element as T
}

function sendMessage<T>(message: DoubaoExtensionMessage): Promise<T> {
  return new Promise((resolve, reject) => {
    chrome.runtime.sendMessage(message, response => {
      if (chrome.runtime.lastError) {
        reject(new Error(chrome.runtime.lastError.message))
        return
      }
      if (!response?.ok) {
        reject(new Error(response?.error || '请求失败'))
        return
      }
      resolve(response.data as T)
    })
  })
}

function setText(id: string, value: string): void {
  byId(id).textContent = value
}

function escapeHtml(value: string): string {
  return value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;')
}

function renderContext(context: DoubaoPageContext | null): void {
  currentContext = context
  const card = byId('context-card')
  card.classList.toggle('loading', !context)
  card.classList.toggle('ready', Boolean(context))

  if (!context) {
    setText('page-title', '等待页面上下文')
    setText('page-url', '打开网页后点击右下角豆包按钮，或使用右键菜单。')
    setText('stat-chars', '--')
    setText('stat-headings', '--')
    setText('stat-links', '--')
    setText('stat-images', '--')
    return
  }

  setText('page-title', context.title)
  setText('page-url', context.url)
  setText('stat-chars', String(context.stats.characters))
  setText('stat-headings', String(context.stats.headings))
  setText('stat-links', String(context.stats.links))
  setText('stat-images', String(context.stats.images))
}

function renderResult(result: DoubaoSkillResult): void {
  byId('result-empty').classList.add('hidden')
  const container = byId('result-content')
  container.classList.remove('hidden')
  setText('result-time', new Date(result.generatedAt).toLocaleTimeString())

  const sourceLabel = result.source === 'model' ? `模型：${escapeHtml(result.provider || 'unknown')}/${escapeHtml(result.model || 'unknown')}` : '本地回退'
  container.innerHTML = `
    <article class="artifact-card">
      <div class="artifact-badge-row"><div class="artifact-badge">${escapeHtml(result.skillId)}</div><div class="source-badge ${result.source === 'model' ? 'model' : 'fallback'}">${sourceLabel}</div></div>
      ${result.warning ? `<div class="warning-box">${escapeHtml(result.warning)}</div>` : ''}
      <h2>${escapeHtml(result.title)}</h2>
      <p class="artifact-summary">${escapeHtml(result.summary)}</p>
      ${result.markdown ? `<pre class="model-markdown">${escapeHtml(result.markdown)}</pre>` : ''}
      <div class="artifact-sections">${result.sections.map(section => `<section><h3>${escapeHtml(section.title)}</h3><ul>${section.items.map(item => `<li>${escapeHtml(item)}</li>`).join('')}</ul></section>`).join('')}</div>
      <div class="prompt-chips">${result.suggestedPrompts.map(prompt => `<button data-prompt="${escapeHtml(prompt)}">${escapeHtml(prompt)}</button>`).join('')}</div>
    </article>
  `

  container.querySelectorAll<HTMLButtonElement>('[data-prompt]').forEach(button => {
    button.addEventListener('click', () => {
      byId<HTMLTextAreaElement>('prompt-input').value = button.dataset.prompt || ''
      void runSkill(lastSkill)
    })
  })
  void loadHistory()
}

function renderDiagnostics(report: DiagnosticReport): void {
  byId('result-empty').classList.add('hidden')
  const container = byId('result-content')
  container.classList.remove('hidden')
  setText('result-time', new Date(report.generatedAt).toLocaleTimeString())

  container.innerHTML = `
    <article class="artifact-card diagnostics-card">
      <div class="artifact-badge-row"><div class="artifact-badge">diagnostics</div><div class="source-badge ${report.overallStatus}">总体：${escapeHtml(report.overallStatus)}</div></div>
      <h2>${escapeHtml(report.title)}</h2>
      <p class="artifact-summary">${escapeHtml(report.summary)}</p>
      <div class="diagnostic-sections">
        ${report.sections.map(section => `<section class="diagnostic-section"><div class="diagnostic-section-title"><h3>${escapeHtml(section.name)}</h3><span class="diagnostic-status ${section.status}">${escapeHtml(section.status)}</span></div>${section.checks.map(check => `<div class="diagnostic-check ${check.status}"><div class="diagnostic-check-head"><strong>${escapeHtml(check.name)}</strong><span>${escapeHtml(check.status)}</span></div><p>${escapeHtml(check.detail)}</p>${check.hint ? `<small>提示：${escapeHtml(check.hint)}</small>` : ''}${check.action ? `<small>建议操作：${escapeHtml(check.action)}</small>` : ''}</div>`).join('')}</section>`).join('')}
      </div>
      <button id="copy-diagnostics" class="copy-diagnostics">复制诊断报告</button>
    </article>
  `

  byId<HTMLButtonElement>('copy-diagnostics').addEventListener('click', () => {
    void navigator.clipboard.writeText(report.exportText)
  })
  void loadHistory()
}

function renderArtifact(record: DoubaoArtifactRecord): void {
  if (record.skillResult) renderResult(record.skillResult)
  if (record.diagnosticReport) renderDiagnostics(record.diagnosticReport)
}

function renderHistory(records: DoubaoArtifactRecord[], total: number): void {
  setText('history-count', `${total} 条`)
  const list = byId('history-list')
  if (records.length === 0) {
    list.innerHTML = '<div class="history-empty">暂无 Artifact 历史</div>'
    return
  }
  list.innerHTML = records.map(record => `<article class="history-item" data-id="${escapeHtml(record.id)}"><div class="history-item-head"><span class="history-kind">${record.kind === 'skill-result' ? '技能' : '诊断'}</span><time>${new Date(record.createdAt).toLocaleString()}</time></div><h3>${escapeHtml(record.title)}</h3><p>${escapeHtml(record.summary)}</p><small>${escapeHtml(record.pageTitle || record.pageUrl || '无页面来源')}</small><div class="history-item-actions"><button data-action="open" data-id="${escapeHtml(record.id)}">打开</button><button data-action="delete" data-id="${escapeHtml(record.id)}">删除</button></div></article>`).join('')
  list.querySelectorAll<HTMLButtonElement>('[data-action]').forEach(button => {
    button.addEventListener('click', () => {
      const id = button.dataset.id || ''
      const record = records.find(item => item.id === id)
      if (button.dataset.action === 'open' && record) renderArtifact(record)
      if (button.dataset.action === 'delete') void sendMessage<boolean>({ type: 'DOUBAO_DELETE_ARTIFACT', payload: { id } }).then(() => loadHistory())
    })
  })
}

async function loadHistory(): Promise<void> {
  const result = await sendMessage<DoubaoArtifactListResult>({ type: 'DOUBAO_LIST_ARTIFACTS', payload: { limit: 30 } })
  renderHistory(result.records, result.total)
}

async function loadActiveContext(): Promise<void> {
  try {
    const context = await sendMessage<DoubaoPageContext | null>({ type: 'DOUBAO_GET_ACTIVE_CONTEXT' })
    renderContext(context)
  } catch {
    renderContext(null)
  }
}

async function captureActiveTab(): Promise<void> {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true })
  if (!tab?.id) return
  const response = await chrome.tabs.sendMessage(tab.id, { type: 'DOUBAO_CAPTURE_PAGE_CONTEXT' }).catch(() => null)
  if (response?.ok && response.data) {
    const context = response.data as DoubaoPageContext
    await sendMessage({ type: 'DOUBAO_PAGE_CONTEXT_CAPTURED', payload: context })
    renderContext(context)
  }
}

async function runSkill(skillId: DoubaoSkillRequest['skillId']): Promise<void> {
  lastSkill = skillId
  const prompt = byId<HTMLTextAreaElement>('prompt-input').value.trim()
  const result = await sendMessage<DoubaoSkillResult>({ type: 'DOUBAO_ANALYZE_CONTEXT', payload: { skillId, prompt, context: currentContext } })
  renderResult(result)
}

async function runDiagnostics(): Promise<void> {
  const report = await sendMessage<DiagnosticReport>({ type: 'DOUBAO_RUN_DIAGNOSTICS' })
  renderDiagnostics(report)
}

async function exportHistory(format: 'markdown' | 'json' = 'markdown'): Promise<void> {
  const content = await sendMessage<string>({ type: 'DOUBAO_EXPORT_ARTIFACTS', payload: { format } })
  await navigator.clipboard.writeText(content || '暂无 Artifact 历史')
}

async function clearHistory(): Promise<void> {
  await sendMessage<number>({ type: 'DOUBAO_CLEAR_ARTIFACTS' })
  await loadHistory()
}

function toggleHistory(): void {
  historyVisible = !historyVisible
  byId('history-panel').classList.toggle('hidden', !historyVisible)
  if (historyVisible) void loadHistory()
}

function installEventListeners(): void {
  byId('refresh-context').addEventListener('click', () => void captureActiveTab())
  byId('run-diagnostics').addEventListener('click', () => void runDiagnostics())
  byId('toggle-history').addEventListener('click', toggleHistory)
  byId('export-history').addEventListener('click', () => void exportHistory('markdown'))
  byId('export-history-json').addEventListener('click', () => void exportHistory('json'))
  byId('clear-history').addEventListener('click', () => void clearHistory())
  byId('run-custom').addEventListener('click', () => void runSkill(lastSkill))

  byId<HTMLTextAreaElement>('prompt-input').addEventListener('keydown', event => {
    if (event.key === 'Enter' && (event.ctrlKey || event.metaKey)) {
      event.preventDefault()
      void runSkill(lastSkill)
    }
  })

  document.querySelectorAll<HTMLButtonElement>('[data-skill]').forEach(button => {
    button.addEventListener('click', () => void runSkill(button.dataset.skill as DoubaoSkillRequest['skillId']))
  })

  chrome.runtime.onMessage.addListener((message: DoubaoExtensionMessage) => {
    if (message.type === 'DOUBAO_RUN_SKILL') {
      const request = message.payload as DoubaoSkillRequest
      if (request.context) renderContext(request.context)
      void runSkill(request.skillId)
    }
  })
}

installEventListeners()
void loadActiveContext()
void loadHistory()
