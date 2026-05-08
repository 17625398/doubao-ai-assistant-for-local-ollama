import type { DoubaoHomeMessage } from '../types'

const STORAGE_KEY = 'doubao-home-conversations'
const MAX_CONVERSATIONS = 50

export interface Conversation {
  id: string
  title: string
  messages: DoubaoHomeMessage[]
  createdAt: number
  updatedAt: number
}

export function createMessageId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
}

function generateTitle(messages: DoubaoHomeMessage[]): string {
  const firstUser = messages.find(m => m.role === 'user')
  if (!firstUser) return '新对话'
  const text = firstUser.content.trim()
  return text.length > 40 ? text.slice(0, 40) + '…' : text
}

export function loadConversations(): Conversation[] {
  if (typeof window === 'undefined') return []
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw)
    if (!Array.isArray(parsed)) return []
    return parsed as Conversation[]
  } catch {
    return []
  }
}

export function saveConversations(convs: Conversation[]): void {
  if (typeof window === 'undefined') return
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(convs.slice(0, MAX_CONVERSATIONS)))
  } catch {
    // localStorage full or unavailable
  }
}

export function createConversation(messages?: DoubaoHomeMessage[]): Conversation {
  const id = createMessageId()
  const now = Date.now()
  const msgs = messages || []
  return {
    id,
    title: generateTitle(msgs),
    messages: msgs,
    createdAt: now,
    updatedAt: now,
  }
}

export function updateConversation(
  conv: Conversation,
  messages: DoubaoHomeMessage[]
): Conversation {
  return {
    ...conv,
    title: generateTitle(messages),
    messages,
    updatedAt: Date.now(),
  }
}
