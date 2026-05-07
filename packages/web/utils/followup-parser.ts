export type FollowUpCategory = 'detail' | 'related' | 'solution' | 'example' | 'clarification'

export interface ParsedFollowUpQuestion {
  content: string
  category: FollowUpCategory
  priority: number
}

export interface FollowUpParseResult {
  questions: ParsedFollowUpQuestion[]
  strategy: 'json' | 'text-fallback'
}

const VALID_CATEGORIES: FollowUpCategory[] = [
  'detail',
  'related',
  'solution',
  'example',
  'clarification',
]

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object'
}

function clampPriority(value: unknown): number {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return Math.max(1, Math.min(5, Math.round(value)))
  }
  if (typeof value === 'string') {
    const parsed = Number(value)
    if (Number.isFinite(parsed)) {
      return Math.max(1, Math.min(5, Math.round(parsed)))
    }
  }
  return 3
}

function normalizeCategory(value: unknown): FollowUpCategory {
  if (typeof value !== 'string') return 'detail'
  return VALID_CATEGORIES.includes(value as FollowUpCategory)
    ? (value as FollowUpCategory)
    : 'detail'
}

function toQuestion(candidate: unknown): ParsedFollowUpQuestion | null {
  if (!isRecord(candidate)) return null
  const rawContent = candidate.content
  const content = typeof rawContent === 'string' ? rawContent.trim() : ''
  if (!content) return null
  return {
    content,
    category: normalizeCategory(candidate.category),
    priority: clampPriority(candidate.priority),
  }
}

function parseFromJson(raw: string): ParsedFollowUpQuestion[] {
  const parsed = JSON.parse(raw) as unknown
  if (!isRecord(parsed) || !Array.isArray(parsed.questions)) return []
  return parsed.questions.map(toQuestion).filter((item): item is ParsedFollowUpQuestion => Boolean(item))
}

function extractQuestionsFromText(raw: string): string[] {
  const questions: string[] = []
  const questionRegex = /([^.!?\n]+\?)/g
  let match: RegExpExecArray | null
  while ((match = questionRegex.exec(raw)) !== null) {
    const text = match[1]?.trim()
    if (text) questions.push(text)
  }

  if (questions.length === 0) {
    const listRegex = /\d+\.\s+([^\n]+)/g
    while ((match = listRegex.exec(raw)) !== null) {
      const text = match[1]?.trim()
      if (text) questions.push(text)
    }
  }

  return questions
}

function parseFromTextFallback(raw: string): ParsedFollowUpQuestion[] {
  return extractQuestionsFromText(raw).map((content, index) => ({
    content,
    category: index === 0 ? 'detail' : index === 1 ? 'related' : 'solution',
    priority: Math.max(1, 3 - index),
  }))
}

export function parseFollowUpResponse(raw: string): FollowUpParseResult {
  const byJson = parseFromJson(raw)
  if (byJson.length > 0) {
    return {
      questions: byJson.sort((a, b) => a.priority - b.priority).slice(0, 3),
      strategy: 'json',
    }
  }

  const byText = parseFromTextFallback(raw)
  return {
    questions: byText.slice(0, 3),
    strategy: 'text-fallback',
  }
}
