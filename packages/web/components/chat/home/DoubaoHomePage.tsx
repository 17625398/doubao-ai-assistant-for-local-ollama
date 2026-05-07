'use client'

import React, { useEffect, useMemo, useState, useRef } from 'react'
import type {
  DoubaoHomeMessage,
  LocalCapabilityStatus,
  OllamaSettings,
} from '../../../services/doubao-home/types'
import type { HomeNavKey } from '../../../services/doubao-home/data/homeContent'
import { defaultRecentItems, suggestions, tools } from '../../../services/doubao-home/data/homeContent'
import {
  createMessageId,
  defaultOllamaSettings,
  loadOllamaSettings,
  saveOllamaSettings,
  sendOllamaChat,
  testOllamaConnection,
} from '../../../services/doubao-home/services/ollamaHomeClient'
import {
  loadRecentPrompts,
  saveRecentPrompt,
} from '../../../services/doubao-home/services/homeRecents'
import {
  buildDiagnosticsPrompt,
  copySessionMarkdown,
  inspectLocalCapabilities,
  readLocalTextFile,
} from '../../../services/doubao-home/services/localCapabilities'
import type { MultimodalAttachment } from '../../../services/doubao-home/utils/multimodal'
import {
  buildMultimodalPrompt,
  getFileCategory,
  getFileIcon,
  formatFileSize,
} from '../../../services/doubao-home/utils/multimodal'
import { ChatInputBox } from './ChatInputBox'
import { FeaturePanel } from './FeaturePanel'
import { HomeSidebar } from './HomeSidebar'
import { OllamaSettingsDialog } from './OllamaSettingsDialog'
import { SkillSelector } from './SkillSelector'
import { SplitPaneEditor } from '../split-editor/SplitPaneEditor'
import { SkillProvider, useSkillContext } from '../../../contexts/SkillContext'
import { skillInputPluginRegistry } from '@core/plugins/skill-input-plugin/registry'
import {
  ollamaCapabilityService,
  type CapabilityId,
} from '../../../services/doubao-home/services/ollamaCapabilityService'
import { ArrowLeft, Sparkles, Columns } from 'lucide-react'

/** 技能切换指示栏 — 显示当前活跃技能并提供返回通用聊天的快捷入口 */
function SkillIndicator() {
  const { activePlugin, isSpecializedMode, resetToChat } = useSkillContext()

  if (!isSpecializedMode) return null

  return (
    <div className="animate-fade-in-up flex items-center gap-3 px-4 py-2.5 bg-[var(--bg-secondary)] border-b border-[var(--border-light)]">
      {/* 技能图标 */}
      <div className="relative w-8 h-8 shrink-0 rounded-xl bg-gradient-to-br from-[var(--brand-orange)]/15 to-[var(--brand-orange)]/5 flex items-center justify-center shadow-sm ring-1 ring-[var(--brand-orange)]/10">
        <span className="text-sm font-semibold text-[var(--brand-orange)]">
          {activePlugin.name.charAt(0)}
        </span>
        <span className="absolute inset-0 rounded-xl bg-[var(--brand-orange)]/5 animate-ping opacity-20" />
      </div>

      <div className="flex items-center gap-2 flex-1 min-w-0">
        <span className="text-[13px] font-semibold text-[var(--text-primary)] tracking-tight">
          {activePlugin.name}
        </span>
        {activePlugin.description && (
          <>
            <span className="text-[var(--border-medium)]">|</span>
            <span className="text-xs text-[var(--text-tertiary)] hidden sm:inline truncate max-w-[240px]">
              {activePlugin.description}
            </span>
          </>
        )}
      </div>

      {/* 返回按钮 */}
      <button
        onClick={resetToChat}
        className="group inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium
                   text-[var(--text-secondary)] bg-[var(--bg-primary)] backdrop-blur-sm border border-[var(--border-light)]
                   transition-all duration-200 ease-out
                   hover:-translate-y-px hover:text-[var(--brand-orange)] hover:border-[var(--brand-orange)]/25 hover:shadow-md hover:bg-[var(--bg-primary)]
                   active:translate-y-0 active:scale-[0.97]
                   cursor-pointer"
      >
        <ArrowLeft
          size={13}
          className="transition-transform duration-150 group-hover:-translate-x-0.5"
        />
        返回通用聊天
      </button>
    </div>
  )
}

/** SkillPlugin ID → CapabilityId 映射 */
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

function DoubaoHomeInner(): React.ReactElement {
  const [input, setInput] = useState('')
  const [active, setActive] = useState<HomeNavKey>('豆包')
  const [recents, setRecents] = useState<string[]>(defaultRecentItems)
  const [messages, setMessages] = useState<DoubaoHomeMessage[]>([])
  const [settings, setSettings] = useState<OllamaSettings>(defaultOllamaSettings)
  const [draft, setDraft] = useState<OllamaSettings>(defaultOllamaSettings)
  const [openSettings, setOpenSettings] = useState(false)
  const [loading, setLoading] = useState(false)
  const [statusText, setStatusText] = useState('')
  const [localStatus, setLocalStatus] = useState<LocalCapabilityStatus>({
    ollama: 'unknown',
    modelCount: 0,
    activeModel: defaultOllamaSettings.model,
  })
  const [pendingAttachments, setPendingAttachments] = useState<MultimodalAttachment[]>([])
  const [docUploadTrigger, setDocUploadTrigger] = useState(0) // 触发文档上传的计数器
  const [codeUploadTrigger, setCodeUploadTrigger] = useState(0) // 触发代码上传的计数器
  const [isSplitEditorOpen, setIsSplitEditorOpen] = useState(false) // 分栏编辑器状态
  // 获取当前技能上下文
  const { activePluginId } = useSkillContext()
  const canSend = useMemo(
    () => (input.trim().length > 0 || pendingAttachments.length > 0) && !loading,
    [input, loading, pendingAttachments]
  )
  const messagesEndRef = useRef<HTMLDivElement>(null)

  // 刷新 Ollama 服务配置缓存
  useEffect(() => {
    ollamaCapabilityService.refreshSettings()
  }, [settings])

  // 自动滚动到最新消息
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, loading])

  useEffect(() => {
    const loaded = loadOllamaSettings()
    setSettings(loaded)
    setDraft(loaded)
    setLocalStatus(c => ({ ...c, activeModel: loaded.model }))
    setRecents(loadRecentPrompts(defaultRecentItems))
  }, [])

  const usePrompt = (prompt: string, attachments?: MultimodalAttachment[]): void => {
    if (prompt === '新建对话') {
      setMessages([])
      setInput('')
      setPendingAttachments([])
      return
    }
    setInput(prompt)
    if (attachments && attachments.length > 0) {
      setPendingAttachments(attachments)
    }
  }

  const selectNav = (label: HomeNavKey, prompt: string): void => {
    setActive(label)
    if (prompt) usePrompt(prompt)
  }

  const saveSettings = (): void => {
    const saved = saveOllamaSettings(draft)
    setSettings(saved)
    setDraft(saved)
    setLocalStatus(c => ({ ...c, activeModel: saved.model }))
    setOpenSettings(false)
  }

  const testOllama = async (): Promise<void> => {
    setStatusText('检测中...')
    try {
      const result = await testOllamaConnection(draft)
      if (result.firstModel && !draft.model)
        setDraft(p => ({ ...p, model: result.firstModel || p.model }))
      setStatusText(`连接成功 (${result.count}个模型)`)
    } catch {
      setStatusText('连接失败')
    }
  }

  const inspectLocal = async (): Promise<void> => {
    setLocalStatus(c => ({ ...c, ollama: 'checking' }))
    const r = await inspectLocalCapabilities(settings)
    setLocalStatus(r)
    setStatusText(r.ollama === 'online' ? `${r.modelCount} 个模型在线` : '离线')
  }

  const importLocalFile = async (file: File): Promise<void> => {
    const loaded = await readLocalTextFile(file)
    usePrompt(`请帮我总结：\n\n${loaded.content.slice(0, 1500)}`)
  }

  const exportSession = async (): Promise<void> => {
    await copySessionMarkdown(messages)
    setStatusText('已复制')
  }

  const clearSession = (): void => {
    setMessages([])
  }

  const send = async (
    text = input,
    attachments: MultimodalAttachment[] = pendingAttachments
  ): Promise<void> => {
    const content = text.trim()
    if ((!content && !attachments.length) || loading) return

    // Handle special commands
    if (content.startsWith('__DELETE_HISTORY__:')) {
      const idx = parseInt(content.split(':')[1])
      setRecents(prev => prev.filter((_, i) => i !== idx))
      setInput('')
      return
    }
    if (content === '__CLEAR_ALL_HISTORY__') {
      setRecents([])
      setInput('')
      return
    }

    // Build message with attachment info
    let finalContent = content
    const readyAttachments = attachments.filter(a => a.status === 'ready')

    // For Ollama, we include file info as text (Ollama doesn't support multimodal directly)
    if (readyAttachments.length > 0) {
      const { prompt } = buildMultimodalPrompt(content, readyAttachments)
      finalContent = prompt
    }

    setRecents(prev => saveRecentPrompt(prev, finalContent))

    const userMsg: DoubaoHomeMessage = {
      id: createMessageId(),
      role: 'user' as const,
      content: finalContent,
      ...(readyAttachments.length > 0 ? { attachments: readyAttachments } : {}),
    }

    const next = [...messages, userMsg]
    setMessages(next)
    setInput('')
    setPendingAttachments([])
    setLoading(true)

    try {
      // ══ 使用 OllamaCapabilityService 执行（带能力专属 system prompt）══

      // 将当前 SkillPlugin ID 映射为 CapabilityId
      const capabilityId: CapabilityId | undefined = SKILL_TO_CAPABILITY_MAP[activePluginId]

      if (capabilityId) {
        // 使用能力服务 — 带专属 system prompt 和参数优化
        const result = await ollamaCapabilityService.execute({
          capability: capabilityId,
          input: finalContent,
          contextMessages: next.slice(0, -1), // 不包含刚添加的 userMsg（service 内部会处理）
        })

        // 更新状态栏显示模型信息
        setStatusText(
          `${ollamaCapabilityService.getCapabilityConfig(capabilityId)?.label || capabilityId} · ${result.model} · ${(result.durationMs / 1000).toFixed(1)}s`
        )

        setMessages([
          ...next,
          {
            id: createMessageId(),
            role: 'assistant' as const,
            content: result.content,
          },
        ])
      } else {
        // 通用聊天模式 — 使用原始 sendOllamaChat
        const reply = await sendOllamaChat(
          settings,
          next.map(m => ({
            id: m.id,
            role: m.role,
            content: m.content,
          }))
        )

        setMessages([
          ...next,
          { id: createMessageId(), role: 'assistant' as const, content: reply },
        ])
      }
    } catch (error) {
      const errMsg = error instanceof Error ? error.message : String(error)
      setMessages([
        ...next,
        {
          id: createMessageId(),
          role: 'assistant' as const,
          content: `请求失败\n\n${errMsg}\n\n请检查：\n1. Ollama 服务是否启动\n2. 端点设置是否正确：${settings.baseUrl}\n3. 模型 ${settings.model} 是否已下载`,
        },
      ])
    } finally {
      setLoading(false)
    }
  }

  const hasMessages = messages.length > 0

  return (
    <main className="flex h-screen w-screen overflow-hidden bg-[var(--bg-secondary)]">
      {/* Sidebar */}
      <HomeSidebar
        active={active}
        recents={recents}
        localStatus={localStatus}
        hasMessages={hasMessages}
        onSelectNav={selectNav}
        onUsePrompt={usePrompt}
        onInspectLocal={() => void inspectLocal()}
        onImportFile={f => void importLocalFile(f)}
        onExportSession={() => void exportSession()}
        onClearSession={clearSession}
        onDiagnostics={() => usePrompt(buildDiagnosticsPrompt(localStatus, settings))}
        onOpenSettings={() => setOpenSettings(true)}
        onOpenDocumentUpload={() => setDocUploadTrigger(n => n + 1)}
        onOpenCodeUpload={() => setCodeUploadTrigger(n => n + 1)}
      />

      {/* Main area */}
      <section className="relative flex min-w-0 flex-1 flex-col bg-[var(--bg-primary)]">
        {/* 技能切换指示栏 */}
        <SkillIndicator />

        {/* Header - 豆包App风格 */}
        <header className="flex h-12 shrink-0 items-center justify-between px-4 border-b border-[var(--border-light)]">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setStatusText('菜单')}
              title="菜单"
              className="rounded-xl p-2 text-[var(--text-tertiary)] hover:bg-[var(--sidebar-item-hover)] hover:text-[var(--text-primary)] transition"
            >
              <svg
                className="h-5 w-5"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>
            <span className="text-[14px] font-semibold text-[var(--text-primary)]">新对话</span>
          </div>

          <div className="flex items-center gap-1">
            {/* Split Editor Button */}
            <button
              type="button"
              onClick={() => setIsSplitEditorOpen(true)}
              disabled={!hasMessages}
              title="分栏编辑导出"
              className={`rounded-xl p-2 transition ${
                hasMessages
                  ? 'text-[var(--brand-orange)] hover:bg-[var(--brand-orange)]/10'
                  : 'text-[var(--text-disabled)] cursor-not-allowed'
              }`}
            >
              <Columns className="h-5 w-5" />
            </button>
            <button
              type="button"
              onClick={() => setOpenSettings(true)}
              title="设置"
              className="rounded-xl p-2 text-[var(--text-tertiary)] hover:bg-[var(--sidebar-item-hover)] hover:text-[var(--text-primary)] transition"
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

        {/* Content */}
        <div
          className={`min-h-0 flex-1 ${hasMessages ? 'overflow-y-auto pb-[120px]' : 'flex flex-col items-center overflow-y-auto'}`}
        >
          {hasMessages ? (
            /* Chat messages */
            <div className="mx-auto w-full max-w-[720px] py-6 px-8">
              <div className="space-y-5">
                {messages.map((msg, idx) => (
                  <div
                    key={msg.id}
                    className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'} animate-message-in`}
                    style={{ animationDelay: `${Math.min(idx * 50, 200)}ms` }}
                  >
                    <div className={`max-w-[80%] sm:max-w-[75%] group/msg`}>
                      {/* Show attachments for user messages */}
                      {msg.role === 'user' && msg.attachments && msg.attachments.length > 0 && (
                        <div className="mb-2 flex flex-wrap gap-2 animate-in slide-in-from-bottom-1 fade-in duration-200">
                          {msg.attachments.map(att => {
                            const category = getFileCategory({ name: att.name, type: att.type })
                            return (
                              <div
                                key={att.id}
                                className="group/att flex items-center gap-2 rounded-xl border border-[var(--border-light)] bg-[var(--bg-primary)]/80 backdrop-blur-sm px-3 py-2 shadow-sm transition-all duration-200 hover:border-[var(--brand-orange)]/30 hover:shadow-md hover:shadow-[var(--brand-orange)]/10"
                              >
                                {att.dataUrl && category === 'image' ? (
                                  <img
                                    src={att.dataUrl}
                                    alt={att.name}
                                    className="h-10 w-10 rounded-lg object-cover ring-1 ring-[var(--border-light)]"
                                  />
                                ) : (
                                  <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-to-br from-[var(--bg-secondary)] to-[var(--bg-primary)] text-sm shadow-sm ring-1 ring-[var(--border-light)]/50">
                                    {getFileIcon(category)}
                                  </span>
                                )}
                                <div className="min-w-0 max-w-[140px]">
                                  <div
                                    className="truncate text-[12px] font-semibold text-[var(--text-primary)]"
                                    title={att.name}
                                  >
                                    {att.name}
                                  </div>
                                  <div className="text-[11px] text-[var(--text-tertiary)]">
                                    {formatFileSize(att.size)}
                                  </div>
                                </div>
                              </div>
                            )
                          })}
                        </div>
                      )}
                      {/* Message bubble — 豆包App原生风格 */}
                      <div
                        className={`relative overflow-hidden rounded-2xl px-4 py-3.5 text-[14px] leading-relaxed transition-all duration-300 ${
                          msg.role === 'user'
                            ? 'bg-gradient-to-br from-[var(--brand-orange)] to-[var(--brand-orange-dark)] text-white shadow-lg shadow-[var(--brand-orange)]/30 hover:shadow-xl hover:shadow-[var(--brand-orange)]/40 hover:-translate-y-0.5'
                            : 'bg-[var(--ai-bubble-bg)] border border-[var(--ai-bubble-border)] shadow-sm hover:shadow-md'
                        }`}
                      >
                        {/* 顶部光泽线条 */}
                        {msg.role === 'user' ? (
                          <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/40 to-transparent" />
                        ) : (
                          <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-[var(--brand-orange)]/15 to-transparent" />
                        )}

                        {/* 内容 */}
                        <div className="relative whitespace-pre-wrap">{msg.content}</div>

                        {/* AI回复底部标识 */}
                        {msg.role === 'assistant' && (
                          <div className="mt-2 flex items-center justify-end gap-1.5">
                            <span className="h-px w-8 bg-gradient-to-r from-transparent to-[var(--border-medium)]" />
                            <span className="text-[9px] text-[var(--text-disabled)] font-medium">
                              豆包 AI
                            </span>
                          </div>
                        )}
                      </div>

                      {/* 底部操作栏 — 悬停显示 */}
                      <div
                        className={`mt-1.5 flex items-center gap-2 ${msg.role === 'user' ? 'justify-end pr-1' : 'justify-start pl-1'}`}
                      >
                        {/* 时间戳 */}
                        <span className="text-[10px] text-[var(--text-disabled)] opacity-0 transition-all duration-300 group-hover/msg:opacity-100">
                          {new Date().toLocaleTimeString('zh-CN', {
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </span>
                        {/* 复制按钮 */}
                        <button
                          type="button"
                          onClick={() => navigator.clipboard.writeText(msg.content)}
                          className="opacity-0 transition-all duration-300 group-hover/msg:opacity-100 text-[var(--text-disabled)] hover:text-[var(--brand-orange)] p-0.5 rounded hover:bg-[var(--bg-secondary)]"
                          title="复制内容"
                        >
                          <svg
                            className="h-3 w-3"
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                            strokeWidth={2}
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              d="M15.75 17.25v3.375c0 .621-.504 1.125-1.125 1.125h-9.75a1.125 1.125 0 01-1.125-1.125V7.875c0-.621.504-1.125 1.125-1.125H6.75a9.06 9.06 0 011.5.124m7.5 10.376h3.375c.621 0 1.125-.504 1.125-1.125V11.25c0-4.46-3.243-8.161-7.5-8.876a9.06 9.06 0 00-1.5-.124H9.375c-.621 0-1.125.504-1.125 1.125v3.5m7.5 10.375H9.375a1.125 1.125 0 01-1.125-1.125v-9.25m12 6.625v-1.875a3.375 3.375 0 00-3.375-3.375h-1.5"
                            />
                          </svg>
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
                {loading && (
                  <div className="flex justify-start animate-message-in">
                    <div className="relative flex items-start gap-3">
                      {/* AI头像 — 豆包App风格 */}
                      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-[var(--brand-orange)] to-[var(--brand-orange-dark)] shadow-lg shadow-[var(--brand-orange)]/20 animate-glow">
                        <svg
                          className="h-5 w-5 text-white"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="1.8"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        >
                          <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" />
                        </svg>
                      </div>

                      {/* 气泡内容 */}
                      <div className="rounded-2xl border border-[var(--border-light)] bg-[var(--bg-primary)] px-5 py-3.5 shadow-sm min-w-[200px]">
                        <div className="flex items-center gap-3">
                          {/* 加载点 */}
                          <div className="flex items-center gap-1">
                            <span
                              className="h-2 w-2 rounded-full bg-[var(--brand-orange)] animate-bounce"
                              style={{ animationDelay: '0ms' }}
                            />
                            <span
                              className="h-2 w-2 rounded-full bg-[var(--brand-orange)]/70 animate-bounce"
                              style={{ animationDelay: '150ms' }}
                            />
                            <span
                              className="h-2 w-2 rounded-full bg-[var(--brand-orange)]/40 animate-bounce"
                              style={{ animationDelay: '300ms' }}
                            />
                          </div>
                          <span className="text-[13px] font-medium text-[var(--text-secondary)]">
                            <span className="text-[var(--brand-orange)] font-semibold">豆包</span>{' '}
                            正在思考
                          </span>
                          {/* 闪烁光标 */}
                          <span className="inline-block h-4 w-px bg-[var(--brand-orange)]/40 animate-cursor-blink" />
                        </div>
                        {/* 进度条装饰 */}
                        <div className="mt-2 h-0.5 w-full rounded-full bg-[var(--bg-tertiary)] overflow-hidden">
                          <div className="h-full w-1/3 rounded-full bg-gradient-to-r from-[var(--brand-orange)] to-[var(--brand-orange-light)] animate-shimmer" />
                        </div>
                      </div>
                    </div>
                  </div>
                )}
                <div ref={messagesEndRef} />
              </div>
            </div>
          ) : (
            /* Welcome screen — 豆包App原生风格 */
            <div className="flex w-full flex-col items-center overflow-y-auto py-8 px-4">
              {/* Hero 欢迎区域 — 豆包App原生风格 */}
              <div className="relative mb-10 w-full max-w-[680px] text-center animate-fade-in-up">
                {/* 装饰背景光晕 */}
                <div className="absolute -top-8 left-1/2 -translate-x-1/2 h-[200px] w-[400px] rounded-full bg-gradient-to-r from-[var(--brand-orange)]/8 via-[var(--brand-orange)]/12 to-[var(--brand-orange)]/8 blur-3xl" />
                <div className="absolute -top-4 left-1/2 -translate-x-1/2 h-[160px] w-[320px] rounded-full bg-gradient-to-r from-[var(--brand-orange)]/6 via-[var(--brand-orange)]/10 to-[var(--brand-orange)]/6 blur-2xl animate-breathe" />

                {/* Logo / Icon */}
                <div className="relative mx-auto mb-6 inline-flex">
                  <div className="absolute -inset-4 rounded-2xl bg-gradient-to-br from-[var(--brand-orange)]/20 to-[var(--brand-orange)]/10 blur-xl animate-breathe" />
                  <div className="relative h-[72px] w-[72px] flex items-center justify-center rounded-2xl bg-gradient-to-br from-[var(--brand-orange)] to-[var(--brand-orange-dark)] shadow-xl shadow-[var(--brand-orange)]/30 animate-glow">
                    <svg
                      className="h-9 w-9 text-white"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.6"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" />
                    </svg>
                    {/* 在线状态指示 */}
                    <span className="absolute -right-1.5 -top-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-white shadow-md">
                      <span className="relative flex h-3 w-3">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                        <span className="relative inline-flex h-3 w-3 rounded-full bg-emerald-500">
                          <svg
                            className="h-2 w-2 text-white"
                            fill="currentColor"
                            viewBox="0 0 20 20"
                          >
                            <path
                              fillRule="evenodd"
                              d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                              clipRule="evenodd"
                            />
                          </svg>
                        </span>
                      </span>
                    </span>
                  </div>
                </div>

                <h1 className="relative mb-3 text-[28px] font-bold tracking-tight text-[var(--text-primary)]">
                  <span className="bg-gradient-to-r from-[var(--brand-orange)] via-[var(--brand-orange-dark)] to-[var(--brand-orange)] bg-clip-text text-transparent animate-gradient">
                    你好，我是豆包 AI
                  </span>
                </h1>
                <p className="relative text-[14px] leading-relaxed text-[var(--text-secondary)] max-w-[480px] mx-auto">
                  基于本地大语言模型，支持
                  <span className="mx-1 inline-flex items-center gap-0.5 rounded-full bg-orange-50 px-2 py-0.5 text-[var(--brand-orange)] font-medium">
                    <svg
                      className="h-3 w-3"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      strokeWidth={2}
                    >
                      <path d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                    </svg>
                    多模态分析
                  </span>
                  、
                  <span className="mx-1 inline-flex items-center gap-0.5 rounded-full bg-purple-50 px-2 py-0.5 text-purple-600 font-medium">
                    <svg
                      className="h-3 w-3"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      strokeWidth={2}
                    >
                      <path d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
                    </svg>
                    代码生成
                  </span>
                  、
                  <span className="mx-1 inline-flex items-center gap-0.5 rounded-full bg-emerald-50 px-2 py-0.5 text-emerald-600 font-medium">
                    <svg
                      className="h-3 w-3"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      strokeWidth={2}
                    >
                      <path d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    文档解读
                  </span>
                  等多种能力
                </p>

                {/* 快速统计指示器 */}
                <div className="mt-4 flex items-center justify-center gap-4">
                  <div className="flex items-center gap-1.5 text-[12px] text-[var(--text-tertiary)]">
                    <span className="flex h-1.5 w-1.5 items-center justify-center rounded-full bg-emerald-400" />
                    <span>本地运行</span>
                  </div>
                  <div className="h-3 w-px bg-[var(--border-light)]" />
                  <div className="flex items-center gap-1.5 text-[12px] text-[var(--text-tertiary)]">
                    <span className="flex h-1.5 w-1.5 items-center justify-center rounded-full bg-[var(--brand-orange)]" />
                    <span>隐私安全</span>
                  </div>
                  <div className="h-3 w-px bg-[var(--border-light)]" />
                  <div className="flex items-center gap-1.5 text-[12px] text-[var(--text-tertiary)]">
                    <span className="flex h-1.5 w-1.5 items-center justify-center rounded-full bg-purple-400" />
                    <span>离线可用</span>
                  </div>
                </div>
              </div>

              {/* 2. FeaturePanel — 导航分类功能面板（非豆包时显示） */}
              <FeaturePanel active={active} onUsePrompt={usePrompt} onSend={() => void send()} />

              {/* 建议区域 — 豆包App原生风格 */}
              <div
                className="mt-10 w-full max-w-[760px] px-6 animate-fade-in-up"
                style={{ animationDelay: '300ms', animationFillMode: 'both' }}
              >
                <div className="mb-6 flex items-center justify-center gap-3">
                  <div className="h-px flex-1 max-w-[100px] bg-gradient-to-r from-transparent to-[var(--border-light)]" />
                  <h2 className="flex items-center gap-2 text-[15px] font-semibold text-[var(--text-secondary)]">
                    <span className="text-base">💡</span>
                    有什么我能帮你的吗？
                    <span className="text-base">✨</span>
                  </h2>
                  <div className="h-px flex-1 max-w-[100px] bg-gradient-to-l from-transparent to-[var(--border-light)]" />
                </div>

                <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
                  {suggestions.map((s, idx) => (
                    <button
                      key={s}
                      type="button"
                      onClick={() => {
                        usePrompt(s)
                        void send()
                      }}
                      className="group relative overflow-hidden rounded-xl border border-[var(--border-light)] bg-[var(--bg-primary)] px-4 py-3 text-left text-[13px] leading-snug text-[var(--text-secondary)] shadow-sm transition-all duration-300 skill-card"
                      style={{ animationDelay: `${idx * 50}ms`, animationFillMode: 'backwards' }}
                    >
                      {/* 悬浮时的背景渐变 */}
                      <div className="absolute inset-0 bg-gradient-to-br from-[var(--brand-orange)]/5 to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100" />

                      {/* 顶部装饰线 */}
                      <div className="absolute inset-x-0 top-0 h-0.5 bg-gradient-to-r from-[var(--brand-orange)] to-[var(--brand-orange)]/50 scale-x-0 transition-transform duration-300 group-hover:scale-x-100" />

                      <span className="relative flex items-center gap-2">
                        {/* 箭头图标 */}
                        <span className="flex h-5 w-5 items-center justify-center rounded-md bg-[var(--bg-secondary)] text-[var(--text-tertiary)] transition-all duration-200 group-hover:bg-[var(--brand-orange)]/10 group-hover:text-[var(--brand-orange)] group-hover:scale-110">
                          <svg
                            className="h-3 w-3 transition-transform duration-200 group-hover:translate-x-0.5"
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                            strokeWidth="2"
                          >
                            <path d="M13 7l5 5m0 0l-5 5m5-5H6" />
                          </svg>
                        </span>
                        {s}
                      </span>
                    </button>
                  ))}
                </div>

                {/* 底部提示 */}
                <div className="mt-6 flex items-center justify-center gap-2 text-[11px] text-[var(--text-tertiary)]">
                  <svg
                    className="h-3.5 w-3.5 text-[var(--text-disabled)]"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={1.5}
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M11.25 11.25l.041-.02a.75.75 0 011.063.852l-.708 2.836a.75.75 0 001.063.853l.041-.021M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9-3.75h.008v.008H12V8.25z"
                    />
                  </svg>
                  <span>
                    按{' '}
                    <kbd className="mx-1 rounded bg-[var(--bg-secondary)] px-1.5 py-0.5 font-mono text-[10px]">
                      Enter
                    </kbd>{' '}
                    快速发送 · 支持多模态输入
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Input box - 豆包App风格 */}
        <div className="shrink-0 border-t border-[var(--border-light)] bg-gradient-to-b from-transparent via-[var(--bg-primary)] to-[var(--bg-primary)] pt-2 pb-4">
          {/* SkillSelector — 紧凑模式 */}
          <div className="mx-auto max-w-[720px] px-4 mb-1">
            <SkillSelector
              compact
              onSkillSelect={pluginId => {
                const plugin = skillInputPluginRegistry.get(pluginId)
                if (plugin?.guidanceQuestions?.[0]) {
                  usePrompt(plugin.guidanceQuestions[0])
                  void send()
                }
              }}
            />
          </div>

          <ChatInputBox
            input={input}
            canSend={canSend}
            tools={tools}
            onInputChange={setInput}
            onSend={() => void send()}
            onUsePrompt={(prompt, atts) => usePrompt(prompt, atts)}
            onOpenSettings={() => setOpenSettings(true)}
            triggerDocUpload={docUploadTrigger}
            triggerCodeUpload={codeUploadTrigger}
          />
        </div>
      </section>

      <OllamaSettingsDialog
        open={openSettings}
        settings={settings}
        draft={draft}
        onDraftChange={setDraft}
        onClose={() => setOpenSettings(false)}
        onTest={() => void testOllama()}
        onSave={saveSettings}
      />

      {/* Split Pane Editor */}
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
  )
}

/** 导出组件 — 用 SkillProvider 包裹以支持技能上下文 */
export const DoubaoHomePage: React.FC = () => (
  <SkillProvider>
    <DoubaoHomeInner />
  </SkillProvider>
)
