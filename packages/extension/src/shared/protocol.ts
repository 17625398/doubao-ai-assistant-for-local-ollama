export type DoubaoExtensionMessageType =
  | 'DOUBAO_CAPTURE_PAGE_CONTEXT'
  | 'DOUBAO_PAGE_CONTEXT_CAPTURED'
  | 'DOUBAO_GET_ACTIVE_CONTEXT'
  | 'DOUBAO_ANALYZE_CONTEXT'
  | 'DOUBAO_OPEN_SIDE_PANEL'
  | 'DOUBAO_SELECTION_CHANGED'
  | 'DOUBAO_RUN_SKILL'
  | 'DOUBAO_HEALTH_CHECK'
  | 'DOUBAO_RUN_DIAGNOSTICS'
  | 'DOUBAO_SAVE_ARTIFACT'
  | 'DOUBAO_LIST_ARTIFACTS'
  | 'DOUBAO_DELETE_ARTIFACT'
  | 'DOUBAO_CLEAR_ARTIFACTS'
  | 'DOUBAO_EXPORT_ARTIFACTS'
  | 'EXTRACT_CONTENT'
  | 'ANALYZE_CONTENT'

export interface DoubaoPageLink {
  text: string
  href: string
}

export interface DoubaoPageImage {
  alt: string
  src: string
}

export interface DoubaoPageContext {
  tabId?: number
  title: string
  url: string
  origin: string
  description?: string
  language?: string
  selectedText?: string
  mainText: string
  headings: string[]
  links: DoubaoPageLink[]
  images: DoubaoPageImage[]
  capturedAt: string
  stats: {
    characters: number
    words: number
    headings: number
    links: number
    images: number
  }
}

export interface DoubaoSkillRequest {
  skillId:
    | 'summarize'
    | 'translate'
    | 'deep-search'
    | 'extract-outline'
    | 'write-email'
    | 'code-review'
    | 'diagnose-page'
  prompt?: string
  context?: DoubaoPageContext
}

export interface DoubaoSkillResult {
  skillId: DoubaoSkillRequest['skillId']
  title: string
  summary: string
  sections: Array<{
    title: string
    items: string[]
  }>
  suggestedPrompts: string[]
  generatedAt: string
  source: 'model' | 'local-fallback'
  provider?: string
  model?: string
  markdown?: string
  warning?: string
}

export type DiagnosticStatus = 'pass' | 'warn' | 'fail' | 'info'

export interface DiagnosticCheck {
  id: string
  name: string
  status: DiagnosticStatus
  detail: string
  hint?: string
  action?: string
  meta?: Record<string, string | number | boolean | null>
}

export interface DiagnosticSection {
  id: string
  name: string
  status: DiagnosticStatus
  checks: DiagnosticCheck[]
}

export interface DiagnosticReport {
  id: string
  title: string
  generatedAt: string
  summary: string
  overallStatus: DiagnosticStatus
  sections: DiagnosticSection[]
  exportText: string
}

export type DoubaoArtifactKind = 'skill-result' | 'diagnostic-report'

export interface DoubaoArtifactRecord {
  id: string
  kind: DoubaoArtifactKind
  title: string
  pageTitle?: string
  pageUrl?: string
  origin?: string
  createdAt: string
  updatedAt: string
  summary: string
  skillResult?: DoubaoSkillResult
  diagnosticReport?: DiagnosticReport
}

export interface DoubaoArtifactListResult {
  records: DoubaoArtifactRecord[]
  total: number
}

export interface DoubaoExtensionMessage<T = unknown> {
  type: DoubaoExtensionMessageType
  requestId?: string
  payload?: T
}

export interface DoubaoExtensionResponse<T = unknown> {
  ok: boolean
  data?: T
  error?: string
}

export function createResponse<T>(data: T): DoubaoExtensionResponse<T> {
  return { ok: true, data }
}

export function createError(error: unknown): DoubaoExtensionResponse<never> {
  return {
    ok: false,
    error: error instanceof Error ? error.message : String(error),
  }
}
