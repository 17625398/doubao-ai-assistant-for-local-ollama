import type {
  DiagnosticReport,
  DoubaoArtifactListResult,
  DoubaoArtifactRecord,
  DoubaoPageContext,
  DoubaoSkillResult,
} from '../shared/protocol'

const STORAGE_KEY = 'doubao-artifact-records'
const MAX_RECORDS = 200

function createId(prefix: string): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
}

async function readRecords(): Promise<DoubaoArtifactRecord[]> {
  const result = await chrome.storage.local.get(STORAGE_KEY)
  const records = result[STORAGE_KEY]
  return Array.isArray(records) ? (records as DoubaoArtifactRecord[]) : []
}

async function writeRecords(records: DoubaoArtifactRecord[]): Promise<void> {
  await chrome.storage.local.set({ [STORAGE_KEY]: records.slice(0, MAX_RECORDS) })
}

function contextFields(context: DoubaoPageContext | null | undefined): Pick<DoubaoArtifactRecord, 'pageTitle' | 'pageUrl' | 'origin'> {
  return {
    pageTitle: context?.title,
    pageUrl: context?.url,
    origin: context?.origin,
  }
}

export async function saveSkillArtifact(result: DoubaoSkillResult, context?: DoubaoPageContext | null): Promise<DoubaoArtifactRecord> {
  const now = new Date().toISOString()
  const record: DoubaoArtifactRecord = {
    id: createId('skill'),
    kind: 'skill-result',
    title: result.title,
    summary: result.summary,
    createdAt: now,
    updatedAt: now,
    skillResult: result,
    ...contextFields(context),
  }
  const records = await readRecords()
  await writeRecords([record, ...records])
  return record
}

export async function saveDiagnosticArtifact(report: DiagnosticReport, context?: DoubaoPageContext | null): Promise<DoubaoArtifactRecord> {
  const now = new Date().toISOString()
  const record: DoubaoArtifactRecord = {
    id: createId('diag'),
    kind: 'diagnostic-report',
    title: report.title,
    summary: report.summary,
    createdAt: now,
    updatedAt: now,
    diagnosticReport: report,
    ...contextFields(context),
  }
  const records = await readRecords()
  await writeRecords([record, ...records])
  return record
}

export async function listArtifacts(filter?: { pageUrl?: string; limit?: number }): Promise<DoubaoArtifactListResult> {
  const records = await readRecords()
  const filtered = filter?.pageUrl ? records.filter(record => record.pageUrl === filter.pageUrl) : records
  return {
    records: filtered.slice(0, filter?.limit ?? 50),
    total: filtered.length,
  }
}

export async function deleteArtifact(id: string): Promise<boolean> {
  const records = await readRecords()
  const next = records.filter(record => record.id !== id)
  await writeRecords(next)
  return next.length !== records.length
}

export async function clearArtifacts(filter?: { pageUrl?: string }): Promise<number> {
  const records = await readRecords()
  const next = filter?.pageUrl ? records.filter(record => record.pageUrl !== filter.pageUrl) : []
  await writeRecords(next)
  return records.length - next.length
}

function skillToMarkdown(result: DoubaoSkillResult): string {
  const lines = [`# ${result.title}`, '', `类型：${result.skillId}`, `来源：${result.source}`, `生成时间：${result.generatedAt}`, '', result.summary, '']
  if (result.warning) lines.push(`> ${result.warning}`, '')
  if (result.markdown) lines.push('## 模型原始输出', '', result.markdown, '')
  for (const section of result.sections) {
    lines.push(`## ${section.title}`)
    for (const item of section.items) lines.push(`- ${item}`)
    lines.push('')
  }
  return lines.join('\n')
}

function recordToMarkdown(record: DoubaoArtifactRecord): string {
  const lines = [`<!-- artifact:${record.id} -->`, `页面：${record.pageTitle || '未知'}`, `URL：${record.pageUrl || '未知'}`, `创建时间：${record.createdAt}`, '']
  if (record.skillResult) return [...lines, skillToMarkdown(record.skillResult)].join('\n')
  if (record.diagnosticReport) return [...lines, record.diagnosticReport.exportText].join('\n')
  return [...lines, `# ${record.title}`, '', record.summary].join('\n')
}

export async function exportArtifacts(filter?: { pageUrl?: string; format?: 'markdown' | 'json' }): Promise<string> {
  const { records } = await listArtifacts({ pageUrl: filter?.pageUrl, limit: MAX_RECORDS })
  if (filter?.format === 'json') {
    return JSON.stringify({ version: 1, exportedAt: new Date().toISOString(), records }, null, 2)
  }
  return records.map(recordToMarkdown).join('\n\n---\n\n')
}
