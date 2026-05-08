'use client'

import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react'
import { MessageList } from './MessageList'
import { ChatInput } from '../ChatInput'
import { HomeSidebar } from './home/HomeSidebar'
import { SkillSelector } from './home/SkillSelector'
import { OllamaSettingsDialog } from './home/OllamaSettingsDialog'
import { SplitPaneEditor } from './split-editor/SplitPaneEditor'
import { ModelSelector } from './home/ModelSelector'
import { useOllama } from './contexts/OllamaContext'
import { OllamaProvider } from './contexts/OllamaContext'
import { useSkillContext } from '../../contexts/SkillContext'
import { ChatAreaProvider } from '../layout/chat-area/ChatAreaContext'

import { skillInputPluginRegistry } from '@core/plugins/skill-input-plugin/registry'
import {
  ollamaCapabilityService,
  type CapabilityId,
} from '../../services/doubao-home/services/ollamaCapabilityService'
import { createMessageId } from '../../services/doubao-home/services/ollamaHomeClient'
import {
  loadRecentPrompts,
  saveRecentPrompt,
} from '../../services/doubao-home/services/homeRecents'
import { buildDiagnosticsPrompt } from '../../services/doubao-home/services/localCapabilities'
import type { DoubaoHomeMessage, LocalCapabilityStatus } from '../../services/doubao-home/types'
import type { HomeNavKey } from '../../services/doubao-home/data/homeContent'
import { defaultRecentItems, suggestions } from '../../services/doubao-home/data/homeContent'
import { Columns } from 'lucide-react'
import { streamingStore } from '../../services/streamingStore'
import type { ChatMessage } from '../types'
import {
  loadConversations,
  saveConversations,
  createConversation,
  updateConversation,
  type Conversation,
} from '../../services/doubao-home/services/conversationService'

const SKILL_TO_CAPABILITY_MAP: Record<string, CapabilityId> = {
  write: 'writing',
  translate: 'translation',
  ppt: 'ppt',
  'image-gen': 'image-gen',
  video: 'video',
  music: 'music',
  code: 'code-review',
  search: 'deep-search',
  'deep-search': 'deep-search',
  'academic-search': 'academic-search',
  'read-document': 'read-document',
  'read-website': 'read-document',
}

interface IntegratedChatViewProps {
  mode?: 'full' | 'minimal'
  showHomeFeatures?: boolean
}

function IntegratedChatViewInner({ showHomeFeatures = true }: IntegratedChatViewProps) {
  const [input, setInput] = useState('')
  const [active, setActive] = useState<HomeNavKey>('豆包')
  const [recents, setRecents] = useState<string[]>(defaultRecentItems)
  const [messages, setMessages] = useState<DoubaoHomeMessage[]>([])
  const [openSettings, setOpenSettings] = useState(false)
  const [draftSettings, setDraftSettings] = useState<any>(null)
  const [loading, setLoading] = useState(false)
  const [statusText, setStatusText] = useState('')
  const [localStatus, setLocalStatus] = useState<LocalCapabilityStatus>({
    ollama: 'unknown',
    modelCount: 0,
    activeModel: 'gemma4:e4b',
  })
  const [isSplitEditorOpen, setIsSplitEditorOpen] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const streamingIdRef = useRef<string | null>(null)
  const abortControllerRef = useRef<AbortController | null>(null)
  const [conversations, setConversations] = useState<Conversation[]>([])
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null)
  const autoSaveRef = useRef<number | null>(null)
  const loadingTimeoutRef = useRef<number | null>(null)

  const clearLoadingTimeout = useCallback(() => {
    if (loadingTimeoutRef.current != null) {
      clearTimeout(loadingTimeoutRef.current)
      loadingTimeoutRef.current = null
    }
  }, [])

  const {
    settings: ollamaSettings,
    status: ollamaStatus,
    updateSettings: updateOllamaSettings,
    connect,
  } = useOllama()
  const { activePluginId, resetToChat, isSpecializedMode } = useSkillContext()

  const canSend = useMemo(() => input.trim().length > 0 && !loading, [input, loading])

  useEffect(() => {
    setRecents(loadRecentPrompts(defaultRecentItems))
    connect()
      .then(() => {
        setLocalStatus(s => ({ ...s, ollama: 'online' }))
      })
      .catch(() => {
        setLocalStatus(s => ({ ...s, ollama: 'offline' }))
      })

    const loaded = loadConversations()
    setConversations(loaded)
    if (loaded.length > 0) {
      setActiveSessionId(loaded[0].id)
      setMessages(loaded[0].messages)
    } else {
      const fresh = createConversation()
      setConversations([fresh])
      setActiveSessionId(fresh.id)
      saveConversations([fresh])
    }
  }, [])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, loading])

  useEffect(() => {
    if (loading) {
      clearLoadingTimeout()
      loadingTimeoutRef.current = window.setTimeout(() => {
        setLoading(false)
        streamingIdRef.current = null
        if (abortControllerRef.current) {
          abortControllerRef.current.abort()
          abortControllerRef.current = null
        }
      }, 120_000)
    } else {
      clearLoadingTimeout()
    }
    return clearLoadingTimeout
  }, [loading, clearLoadingTimeout])

  useEffect(() => {
    if (autoSaveRef.current != null) clearTimeout(autoSaveRef.current)
    if (!activeSessionId || streamingIdRef.current) return
    autoSaveRef.current = window.setTimeout(() => {
      setConversations(prev => {
        const updated = prev.map(c =>
          c.id === activeSessionId ? updateConversation(c, messages) : c
        )
        saveConversations(updated)
        return updated
      })
    }, 500)
  }, [messages, activeSessionId])

  const handleNewSession = useCallback(() => {
    abortControllerRef.current?.abort()
    streamingStore.clear(streamingIdRef.current || '')
    setMessages([])
    const fresh = createConversation()
    setConversations(prev => {
      const next = [fresh, ...prev]
      saveConversations(next)
      return next
    })
    setActiveSessionId(fresh.id)
  }, [])

  const usePrompt = useCallback((prompt: string) => {
    if (prompt === '新建对话') {
      handleNewSession()
      return
    }
    setInput(prompt)
  }, [handleNewSession])

  const handleSendMessage = useCallback(
    async (content: string) => {
      const finalContent = content.trim()
      if (!finalContent || loading) {
        console.log('[DEBUG] handleSendMessage early return', { finalContent, loading })
        return
      }

      console.log('[DEBUG] handleSendMessage called', { content, messagesLen: messages.length, loading })
      setRecents(prev => saveRecentPrompt(prev, finalContent))

      const userMsg: DoubaoHomeMessage = {
        id: createMessageId(),
        role: 'user' as const,
        content: finalContent,
      }
      const assistantId = createMessageId()
      const assistantMsg: DoubaoHomeMessage = {
        id: assistantId,
        role: 'assistant' as const,
        content: '',
      }

      const next = [...messages, userMsg, assistantMsg]
      setMessages(next)
      setInput('')
      setLoading(true)
      streamingIdRef.current = assistantId

      const abortController = new AbortController()
      abortControllerRef.current = abortController

      try {
        const capabilityId: CapabilityId | undefined = SKILL_TO_CAPABILITY_MAP[activePluginId]

        if (capabilityId) {
          const stream = ollamaCapabilityService.executeStream(
            {
              capability: capabilityId,
              input: finalContent,
              contextMessages: next.slice(0, -2),
            },
            abortController.signal
          )

          for await (const chunk of stream) {
            if (abortController.signal.aborted) break
            streamingStore.updateContent(assistantId, chunk)
          }

          const finalContent_ = streamingStore.getContent(assistantId)
          streamingStore.clear(assistantId)
          setMessages(prev =>
            prev.map(m => (m.id === assistantId ? { ...m, content: finalContent_ } : m))
          )
        } else {
          const { sendOllamaChatStream } =
            await import('../../services/doubao-home/services/ollamaHomeClient')
          const stream = sendOllamaChatStream(
            ollamaSettings,
            next.slice(0, -1).map(m => ({ id: m.id, role: m.role, content: m.content })),
            abortController.signal
          )

          for await (const chunk of stream) {
            if (abortController.signal.aborted) break
            streamingStore.updateContent(assistantId, chunk)
          }

          const finalContent_ = streamingStore.getContent(assistantId)
          streamingStore.clear(assistantId)
          setMessages(prev =>
            prev.map(m => (m.id === assistantId ? { ...m, content: finalContent_ } : m))
          )
        }
      } catch (error) {
        streamingStore.clear(assistantId)
        const currentStreamed = streamingStore.getContent(assistantId)
        const errMsg = error instanceof Error ? error.message : String(error)
        setMessages(prev =>
          prev.map(m =>
            m.id === assistantId
              ? {
                  ...m,
                  content: currentStreamed
                    ? `${currentStreamed}\n\n[错误] ${errMsg}`
                    : `请求失败\n\n${errMsg}\n\n请检查：\n1. Ollama 服务是否启动\n2. 端点设置是否正确：${ollamaSettings.baseUrl}\n3. 模型 ${ollamaSettings.model} 是否已下载`,
                }
              : m
          )
        )
      } finally {
        setLoading(false)
        streamingIdRef.current = null
        abortControllerRef.current = null
      }
    },
    [messages, loading, ollamaSettings, activePluginId]
  )

  const handleClearChat = useCallback(() => {
    abortControllerRef.current?.abort()
    streamingStore.clear(streamingIdRef.current || '')
    setMessages([])
    resetToChat()
  }, [resetToChat])

  const handleSelectSession = useCallback(
    (sessionId: string) => {
      if (sessionId === activeSessionId) return
      abortControllerRef.current?.abort()
      streamingStore.clear(streamingIdRef.current || '')
      const conv = conversations.find(c => c.id === sessionId)
      if (conv) {
        setActiveSessionId(sessionId)
        setMessages(conv.messages)
      }
    },
    [activeSessionId, conversations]
  )

  const handleDeleteSession = useCallback(
    (sessionId: string) => {
      setConversations(prev => {
        const next = prev.filter(c => c.id !== sessionId)
        saveConversations(next)
        return next
      })
      if (activeSessionId === sessionId) {
        setConversations(prev => {
          const next = prev.length > 0 ? prev : [createConversation()]
          if (prev.length === 0) saveConversations(next)
          const target = next[0]
          setActiveSessionId(target.id)
          setMessages(target.messages)
          return next
        })
      }
    },
    [activeSessionId]
  )

  const handleSelectModel = useCallback(
    (model: string) => {
      updateOllamaSettings({ ...ollamaSettings, model })
    },
    [ollamaSettings, updateOllamaSettings]
  )

  const handleEditMessage = useCallback(
    (messageId: string, mode: 'update' | 'resend' = 'update') => {
      const msg = messages.find(m => m.id === messageId)
      if (!msg || msg.role !== 'user') return
      if (mode === 'resend') {
        const idx = messages.findIndex(m => m.id === messageId)
        setMessages(prev => prev.slice(0, idx + 1))
        setInput(msg.content)
      } else {
        setInput(msg.content)
      }
    },
    [messages]
  )

  const handleDeleteMessageFromList = useCallback((messageId: string) => {
    setMessages(prev => prev.filter(m => m.id !== messageId))
  }, [])

  const handleRetryMessage = useCallback(
    (messageId: string) => {
      const idx = messages.findIndex(m => m.id === messageId)
      if (idx < 1) return
      const userMsg = messages[idx - 1]
      if (userMsg.role !== 'user') return
      setMessages(prev => prev.slice(0, idx))
      handleSendMessage(userMsg.content)
    },
    [messages, handleSendMessage]
  )

  const handleEditLastUserMessage = useCallback(() => {
    const lastUser = [...messages].reverse().find(m => m.role === 'user')
    if (lastUser) setInput(lastUser.content)
  }, [messages])

  const handleRetryLastTurn = useCallback(() => {
    const lastAssistant = [...messages].reverse().find(m => m.role === 'assistant')
    if (!lastAssistant) return
    handleRetryMessage(lastAssistant.id)
  }, [messages, handleRetryMessage])

  const handleSaveSettings = useCallback(
    (newSettings: any) => {
      updateOllamaSettings(newSettings)
      setDraftSettings(null)
      setOpenSettings(false)
    },
    [updateOllamaSettings]
  )

  const chatMessages: ChatMessage[] = useMemo(
    () => {
      const result = messages.map(m => ({
        id: m.id,
        role: m.role === 'user' ? 'user' : 'assistant',
        content: m.content,
        timestamp: Date.now(),
        isLoading: loading && m.id === streamingIdRef.current,
      }))
      console.log('[DEBUG] chatMessages computed', { messagesLen: messages.length, resultLen: result.length, loading })
      return result
    },
    [messages, loading]
  )

  const hasMessages = messages.length > 0
  console.log('[DEBUG] IntegratedChatViewInner render', { messagesLen: messages.length, hasMessages, loading })

  const chatAreaValue = useMemo(
    () => ({
      messageList: {
        messages: chatMessages,
        sessionTitle: '',
        setScrollContainerRef: () => {},
        onEditMessage: handleEditMessage,
        onDeleteMessage: handleDeleteMessageFromList,
        onRetryMessage: handleRetryMessage,
        onUpdateMessageFile: () => {},
        showThoughts: false,
        themeId: 'light',
        baseFontSize: 14,
        expandCodeBlocksByDefault: false,
        isMermaidRenderingEnabled: true,
        isGraphvizRenderingEnabled: true,
        onSuggestionClick: () => {},
        onOrganizeInfoClick: () => {},
        onFollowUpSuggestionClick: () => {},
        onGenerateCanvas: () => {},
        onContinueGeneration: () => {},
        onQuickTTS: async () => null,
        chatInputHeight: 100,
        appSettings: {} as any,
        currentModelId: ollamaSettings.model,
        onOpenSidePanel: () => {},
        onQuote: () => {},
        onInsert: () => {},
        activeSessionId: null,
      },
      input: {
        appSettings: {} as any,
        currentChatSettings: {} as any,
        setAppFileError: () => {},
        activeSessionId: null,
        commandedInput: null,
        onMessageSent: () => {},
        selectedFiles: [],
        setSelectedFiles: () => {},
        onSendMessage: handleSendMessage,
        isLoading: loading,
        isEditing: false,
        onStopGenerating: () => {
          abortControllerRef.current?.abort()
        },
        onCancelEdit: () => {},
        onProcessFiles: async () => {},
        onAddFileById: async () => {},
        onCancelUpload: () => {},
        onTranscribeAudio: async () => null,
        isProcessingFile: false,
        fileError: null,
        isImagenModel: false,
        aspectRatio: '',
        setAspectRatio: () => {},
        imageSize: '',
        setImageSize: () => {},
        isGoogleSearchEnabled: false,
        onToggleGoogleSearch: () => {},
        isCodeExecutionEnabled: false,
        onToggleCodeExecution: () => {},
        isLocalPythonEnabled: false,
        onToggleLocalPython: () => {},
        isUrlContextEnabled: false,
        onToggleUrlContext: () => {},
        isDeepSearchEnabled: false,
        onToggleDeepSearch: () => {},
        onClearChat: () => setMessages([]),
        onNewChat: () => setMessages([]),
        onOpenSettings: () => {
          setDraftSettings(ollamaSettings)
          setOpenSettings(true)
        },
        onToggleCanvasPrompt: () => {},
        onTogglePinCurrentSession: () => {},
        onRetryLastTurn: handleRetryLastTurn,
        onSelectModel: () => {},
        availableModels: [],
        onEditLastUserMessage: handleEditLastUserMessage,
        onTogglePip: () => {},
        isPipActive: false,
        generateQuadImages: false,
        onToggleQuadImages: () => {},
        setCurrentChatSettings: () => {},
        onSuggestionClick: () => {},
        onOrganizeInfoClick: () => {},
        showEmptyStateSuggestions: false,
        editMode: 'update' as const,
        onUpdateMessageContent: () => {},
        editingMessageId: null,
        setEditingMessageId: () => {},
        onAddUserMessage: () => {},
        onLiveTranscript: () => {},
        liveClientFunctions: undefined,
        onToggleBBox: () => {},
        isBBoxModeActive: false,
        onToggleGuide: () => {},
        isGuideModeActive: false,
        themeId: 'light',
      },
    }),
    [chatMessages, loading, ollamaSettings.model, handleSendMessage]
  )

  if (!showHomeFeatures) {
    return (
      <ChatAreaProvider value={chatAreaValue}>
        <div className="flex h-full flex-col">
          <div className="flex-1 overflow-y-auto">
            <MessageList messages={chatMessages} />
          </div>
          <div className="shrink-0 border-t border-[var(--border-light)]">
            <ChatInput
              onSend={handleSendMessage}
              disabled={loading}
              isStreaming={loading}
              currentModel={ollamaSettings.model}
              onOpenConfig={() => {
                setDraftSettings(ollamaSettings)
                setOpenSettings(true)
              }}
            />
          </div>
        </div>
      </ChatAreaProvider>
    )
  }

  return (
    <ChatAreaProvider value={chatAreaValue}>
      <main className="flex h-screen w-screen overflow-hidden bg-[var(--bg-secondary)]">
        <HomeSidebar
          active={active}
          recents={recents}
          conversations={conversations}
          activeSessionId={activeSessionId}
          localStatus={localStatus}
          hasMessages={hasMessages}
          onSelectNav={(label, prompt) => {
            setActive(label)
            if (prompt) usePrompt(prompt)
          }}
          onUsePrompt={usePrompt}
          onInspectLocal={() =>
            connect()
              .then(() => setStatusText('连接成功'))
              .catch(() => setStatusText('连接失败'))
          }
          onExportSession={() => {
            navigator.clipboard.writeText(messages.map(m => `${m.role}: ${m.content}`).join('\n\n'))
            setStatusText('已复制')
          }}
          onClearSession={handleClearChat}
          onDiagnostics={() => usePrompt(buildDiagnosticsPrompt(localStatus, ollamaSettings))}
          onOpenSettings={() => {
            setDraftSettings(ollamaSettings)
            setOpenSettings(true)
          }}
          onNewSession={handleNewSession}
          onSelectSession={handleSelectSession}
          onDeleteSession={handleDeleteSession}
          onImportFile={(_file: File) => {}}
          onOpenDocumentUpload={() => {}}
          onOpenCodeUpload={() => {}}
        />

        <section className="relative flex min-w-0 flex-1 flex-col bg-[var(--bg-primary)]">
          {isSpecializedMode && (
            <div className="flex items-center gap-3 px-4 py-2.5 bg-[var(--bg-secondary)] border-b border-[var(--border-light)]">
              <div className="w-8 h-8 shrink-0 rounded-xl bg-gradient-to-br from-[var(--brand-orange)]/15 to-[var(--brand-orange)]/5 flex items-center justify-center">
                <span className="text-sm font-semibold text-[var(--brand-orange)]">
                  {skillInputPluginRegistry.get(activePluginId)?.name?.charAt(0) || '?'}
                </span>
              </div>
              <div className="flex items-center gap-2 flex-1 min-w-0">
                <span className="text-[13px] font-semibold text-[var(--text-primary)]">
                  {skillInputPluginRegistry.get(activePluginId)?.name || '未知'}
                </span>
              </div>
              <button
                onClick={resetToChat}
                className="px-3 py-1.5 rounded-lg text-xs font-medium text-[var(--text-secondary)] bg-[var(--bg-primary)] border border-[var(--border-light)]"
              >
                返回通用聊天
              </button>
            </div>
          )}

          <header className="flex h-12 shrink-0 items-center justify-between px-4 border-b border-[var(--border-light)]">
            <div className="flex items-center gap-2">
              <ModelSelector settings={ollamaSettings} onSelectModel={handleSelectModel} />
            </div>
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => setIsSplitEditorOpen(true)}
                disabled={!hasMessages}
                className={`rounded-xl p-2 transition ${hasMessages ? 'text-[var(--brand-orange)] hover:bg-[var(--brand-orange)]/10' : 'text-[var(--text-disabled)] cursor-not-allowed'}`}
                title="分栏编辑导出"
              >
                <Columns className="h-5 w-5" />
              </button>
              <button
                type="button"
                onClick={() => {
                  setDraftSettings(ollamaSettings)
                  setOpenSettings(true)
                }}
                className="rounded-xl p-2 text-[var(--text-tertiary)] hover:bg-[var(--sidebar-item-hover)] hover:text-[var(--text-primary)]"
              >
                <svg
                  className="h-5 w-5"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={1.8}
                >
                  <circle cx="12" cy="12" r="3" />
                  <path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z" />
                </svg>
              </button>
            </div>
          </header>

          <div
            className={`min-h-0 flex-1 ${hasMessages ? 'overflow-y-auto pb-[120px]' : 'flex flex-col items-center overflow-y-auto'}`}
          >
            {hasMessages ? (
              <div className="mx-auto w-full max-w-[720px] py-6 px-8">
                <MessageList messages={chatMessages} />
              </div>
            ) : (
              <div className="flex w-full flex-col items-center overflow-y-auto py-8 px-4">
                <div className="text-center mb-10">
                  <div className="mx-auto mb-6 h-[72px] w-[72px] flex items-center justify-center rounded-2xl bg-gradient-to-br from-[var(--brand-orange)] to-[var(--brand-orange-dark)]">
                    <svg
                      className="h-9 w-9 text-white"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth={1.6}
                    >
                      <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" />
                    </svg>
                  </div>
                  <h1 className="text-[28px] font-bold text-[var(--text-primary)] mb-3">
                    你好，我是豆包 AI
                  </h1>
                  <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 mt-6">
                    {suggestions.map((s, idx) => (
                      <button
                        key={s}
                        type="button"
                        onClick={() => {
                          usePrompt(s)
                          handleSendMessage(s)
                        }}
                        className="group relative overflow-hidden rounded-xl border border-[var(--border-light)] bg-[var(--bg-primary)] px-4 py-3 text-left text-[13px] text-[var(--text-secondary)]"
                        style={{ animationDelay: `${idx * 50}ms` }}
                      >
                        {s}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>

          <div className="shrink-0 border-t border-[var(--border-light)] bg-gradient-to-b from-transparent via-[var(--bg-primary)] to-[var(--bg-primary)] pt-2 pb-4">
            <div className="mx-auto max-w-[720px] px-4 mb-1">
              <SkillSelector
                compact
                onSkillSelect={pluginId => {
                  const plugin = skillInputPluginRegistry.get(pluginId)
                  if (plugin?.guidanceQuestions?.[0]) {
                    usePrompt(plugin.guidanceQuestions[0])
                    handleSendMessage(plugin.guidanceQuestions[0])
                  }
                }}
              />
            </div>
            <div className="mx-auto max-w-[720px] px-4">
              <ChatInput
                onSend={handleSendMessage}
                disabled={loading}
                isStreaming={loading}
                currentModel={ollamaSettings.model}
                onOpenConfig={() => {
                  setDraftSettings(ollamaSettings)
                  setOpenSettings(true)
                }}
              />
            </div>
          </div>
        </section>

        <OllamaSettingsDialog
          open={openSettings}
          settings={ollamaSettings}
          draft={draftSettings || ollamaSettings}
          onDraftChange={setDraftSettings}
          onClose={() => {
            setOpenSettings(false)
            setDraftSettings(null)
          }}
          onTest={() => {
            connect()
            setStatusText(ollamaStatus === 'online' ? '连接成功' : '连接失败')
          }}
          onSave={handleSaveSettings}
        />

        {isSplitEditorOpen && (
          <SplitPaneEditor
            messages={messages.map(m => ({
              id: m.id,
              role: m.role === 'user' ? 'user' : m.role === 'assistant' ? 'model' : 'error',
              content: m.content,
              timestamp: Date.now(),
            }))}
            onClose={() => setIsSplitEditorOpen(false)}
          />
        )}
      </main>
    </ChatAreaProvider>
  )
}

export const IntegratedChatView: React.FC<IntegratedChatViewProps> = ({
  mode = 'full',
  showHomeFeatures = true,
}) => {
  if (mode === 'minimal') {
    return (
      <OllamaProvider>
        <IntegratedChatViewInner showHomeFeatures={false} />
      </OllamaProvider>
    )
  }

  return (
    <OllamaProvider>
      <IntegratedChatViewInner showHomeFeatures={showHomeFeatures} />
    </OllamaProvider>
  )
}

export { OllamaProvider, useOllama } from './contexts/OllamaContext'
