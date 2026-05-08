import React, { useRef, useState, useMemo } from 'react'
import type { LocalCapabilityStatus } from '../../../services/doubao-home/types'
import type { HomeNavKey } from '../../../services/doubao-home/data/homeContent'
import { navItems } from '../../../services/doubao-home/data/homeContent'
import { useSkillContext } from '../../../contexts/SkillContext'
import { skillInputPluginRegistry } from '@core/plugins/skill-input-plugin/registry'
import type { SkillCategory, SkillInputPlugin } from '@core/plugins/skill-input-plugin/types'
import type { Conversation } from '../../../services/doubao-home/services/conversationService'

const statusText: Record<string, string> = {
  unknown: '未检测',
  checking: '检测中',
  online: '在线',
  offline: '离线',
}

interface HomeSidebarProps {
  active: HomeNavKey
  recents: string[]
  conversations: Conversation[]
  activeSessionId: string | null
  localStatus: LocalCapabilityStatus
  hasMessages: boolean
  onSelectNav: (label: HomeNavKey, prompt: string) => void
  onUsePrompt: (prompt: string) => void
  onInspectLocal: () => void
  onImportFile: (file: File) => void
  onExportSession: () => void
  onClearSession: () => void
  onDiagnostics: () => void
  onOpenSettings: () => void
  onOpenDocumentUpload: () => void
  onOpenCodeUpload: () => void
  onNewSession: () => void
  onSelectSession: (sessionId: string) => void
  onDeleteSession: (sessionId: string) => void
}

export const HomeSidebar: React.FC<HomeSidebarProps> = ({
  active,
  recents,
  conversations,
  activeSessionId,
  localStatus,
  hasMessages,
  onSelectNav,
  onUsePrompt,
  onInspectLocal,
  onImportFile,
  onExportSession,
  onClearSession,
  onDiagnostics,
  onOpenSettings,
  onOpenDocumentUpload,
  onOpenCodeUpload,
  onNewSession,
  onSelectSession,
  onDeleteSession,
}) => {
  const [showLocalPanel, setShowLocalPanel] = useState(false)
  const [showSkillPanel, setShowSkillPanel] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const { activePluginId, switchToSkill, resetToChat } = useSkillContext()

  // 从注册表获取所有非 chat 技能插件，按分类排序
  const skillPlugins = useMemo(() => {
    return skillInputPluginRegistry
      .listAll()
      .filter(p => p.id !== 'chat')
      .sort((a, b) => a.category.localeCompare(b.category))
  }, [])

  // 按分类分组
  const skillsByCategory = useMemo(() => {
    const groups = new Map<SkillCategory, SkillInputPlugin[]>()
    for (const p of skillPlugins) {
      const list = groups.get(p.category) ?? []
      list.push(p)
      groups.set(p.category, list)
    }
    return groups
  }, [skillPlugins])

  /** 分类显示名称 — 完整覆盖 */
  const categoryLabels: Record<SkillCategory, string> = {
    chat: '对话',
    search: '搜索',
    'deep-search': '深度搜索',
    'academic-search': '学术搜索',
    'read-document': '文档阅读',
    'read-website': '网页阅读',
    write: '创作',
    translate: '翻译',
    code: '代码',
    'image-gen': '图片生成',
    video: '视频',
    music: '音乐',
    ppt: 'PPT',
  }

  return (
    <aside className="group/sidebar hidden w-[240px] shrink-0 border-r border-[var(--border-light)] bg-[var(--sidebar-bg)] md:flex md:flex-col">
      {/* 用户区域 - 豆包App风格 */}
      <div className="flex h-14 items-center gap-3 border-b border-[var(--border-light)] px-4 bg-[var(--bg-primary)]">
        {/* 豆包Logo */}
        <div className="relative">
          <div className="absolute -inset-1 rounded-full bg-gradient-to-br from-[var(--brand-orange)]/20 to-[var(--brand-orange)]/10 blur-md animate-breathe" />
          <div className="relative flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-[var(--brand-orange)] to-[var(--brand-orange-dark)] shadow-lg">
            <span className="text-[14px] font-bold text-white">豆</span>
            <span className="absolute -bottom-0.5 -right-0.5 flex h-3 w-3 items-center justify-center rounded-full bg-white shadow-sm">
              <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
            </span>
          </div>
        </div>
        <div className="flex flex-col flex-1 min-w-0">
          <span className="text-[14px] font-bold text-[var(--text-primary)] leading-tight">
            豆包 AI
          </span>
          <span className="text-[10px] text-[var(--text-tertiary)] leading-tight flex items-center gap-1">
            <span className="h-1 w-1 rounded-full bg-emerald-400" />
            本地大模型
          </span>
        </div>
        <button
          type="button"
          onClick={onNewSession}
          className="group/new relative rounded-xl p-2 text-[var(--text-tertiary)] transition-all duration-300 hover:bg-[var(--sidebar-item-active)] hover:text-[var(--brand-orange)] active:scale-95"
          title="新建对话"
        >
          <svg
            className="h-4 w-4"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2.5}
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
          </svg>
        </button>
      </div>

      {/* 导航菜单 - 豆包App风格 */}
      <nav className="flex-1 overflow-y-auto px-3 py-3">
        <div className="space-y-0.5">
          {navItems.map(item => (
            <button
              key={item.label}
              type="button"
              onClick={() => onSelectNav(item.label, item.prompt)}
              className={`group relative flex h-10 w-full items-center gap-3 rounded-xl px-3 text-left text-[13px] font-medium transition-all duration-200 ${
                active === item.label
                  ? 'bg-[var(--sidebar-item-active)] text-[var(--brand-orange)]'
                  : 'text-[var(--text-secondary)] hover:bg-[var(--sidebar-item-hover)] hover:text-[var(--text-primary)]'
              }`}
            >
              {active === item.label && (
                <span className="absolute left-0 top-1/2 h-5 w-0.5 -translate-y-1/2 rounded-full bg-[var(--brand-orange)]" />
              )}
              <span
                className={`text-base ${active === item.label ? 'text-[var(--brand-orange)]' : 'text-[var(--text-tertiary)]'}`}
              >
                {item.icon}
              </span>
              <span className="truncate">{item.label}</span>
            </button>
          ))}

          {/* 本地能力面板 */}
          <button
            type="button"
            onClick={() => setShowLocalPanel(!showLocalPanel)}
            className={`group flex h-10 w-full items-center gap-3 rounded-xl px-3 text-left text-[13px] font-medium transition-all duration-200 ${
              showLocalPanel
                ? 'bg-[var(--sidebar-item-active)] text-[var(--brand-orange)]'
                : 'text-[var(--text-secondary)] hover:bg-[var(--sidebar-item-hover)]'
            }`}
          >
            <span className="text-base">💻</span>
            <span>本地能力</span>
            <svg
              className={`ml-auto h-4 w-4 text-[var(--text-tertiary)] transition-transform duration-200 ${showLocalPanel ? 'rotate-90 text-[var(--brand-orange)]' : ''}`}
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2.5}
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
            </svg>
          </button>

          {/* 技能面板 - 优化折叠手风琴 */}
          {skillPlugins.length > 0 && (
            <>
              <button
                type="button"
                onClick={() => setShowSkillPanel(!showSkillPanel)}
                className={`group flex h-10 w-full items-center gap-3 rounded-xl px-3 text-left text-[13px] font-medium transition-all duration-200 ${
                  showSkillPanel
                    ? 'bg-[var(--sidebar-item-active)] text-[var(--brand-orange)]'
                    : 'text-[var(--text-secondary)] hover:bg-[var(--sidebar-item-hover)]'
                }`}
              >
                <span className="text-base">✦</span>
                <span>技能中心</span>
                {activePluginId !== 'chat' && (
                  <span className="ml-auto mr-1 flex h-1.5 w-1.5">
                    <span className="absolute inline-flex h-full w-full rounded-full bg-[var(--brand-orange)] opacity-75 animate-ping" />
                    <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-[var(--brand-orange)]" />
                  </span>
                )}
                <svg
                  className={`ml-auto h-4 w-4 text-[var(--text-tertiary)] transition-all duration-300 ${showSkillPanel ? 'rotate-90 text-[var(--brand-orange)]' : ''}`}
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2.5}
                >
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                </svg>
              </button>

              {showSkillPanel && (
                <div className="ml-2 mt-2 rounded-xl border border-[var(--border-light)] bg-white p-2.5 max-h-[320px] overflow-y-auto animate-in slide-in-from-top-2 fade-in duration-200 shadow-lg">
                  {Array.from(skillsByCategory.entries()).map(([cat, skills], ci) => (
                    <div
                      key={cat}
                      className={ci > 0 ? 'mt-2.5 pt-2.5 border-t border-gray-100' : ''}
                    >
                      <div className="px-2 py-1.5 text-[10px] font-bold uppercase tracking-wider text-gray-400">
                        {categoryLabels[cat]}
                      </div>
                      <div className="space-y-0.5">
                        {skills.map(skill => {
                          const isActive = skill.id === activePluginId
                          return (
                            <button
                              key={skill.id}
                              type="button"
                              onClick={() => {
                                switchToSkill(skill.id)
                                onUsePrompt(skill.guidanceQuestions?.[0] ?? '')
                              }}
                              className={`group/skill relative flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-[12px] transition-all duration-150 hover:translate-x-0.5 ${
                                isActive
                                  ? 'bg-gradient-to-r from-orange-50 to-orange-50/50 text-orange-600 font-semibold shadow-sm'
                                  : 'text-gray-600 hover:bg-gray-50 hover:text-gray-800'
                              }`}
                            >
                              {isActive && (
                                <span className="absolute left-0 top-1/2 h-5 w-0.5 -translate-y-1/2 rounded-full bg-orange-500 shadow-sm shadow-orange-500/50" />
                              )}
                              <span className="text-base">{(skill as any).icon ?? '⚡'}</span>
                              <span className="flex-1 truncate">{skill.name}</span>
                              {skill.guidanceQuestions && skill.guidanceQuestions.length > 0 && (
                                <span className="text-[9px] text-gray-400 bg-gray-100 px-1.5 py-0.5 rounded-full shrink-0">
                                  {skill.guidanceQuestions.length}
                                </span>
                              )}
                              {isActive && (
                                <svg
                                  className="h-3.5 w-3.5 shrink-0 text-orange-500"
                                  fill="currentColor"
                                  viewBox="0 0 20 20"
                                >
                                  <path
                                    fillRule="evenodd"
                                    d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                                    clipRule="evenodd"
                                  />
                                </svg>
                              )}
                            </button>
                          )
                        })}
                      </div>
                    </div>
                  ))}

                  {activePluginId !== 'chat' && (
                    <div className="mt-2.5 border-t border-gray-100 pt-2.5">
                      <button
                        type="button"
                        onClick={() => {
                          resetToChat()
                        }}
                        className="flex w-full items-center justify-center gap-2 rounded-lg bg-gradient-to-r from-orange-50 to-orange-50/50 px-3 py-2 text-[11px] font-semibold text-orange-600 hover:from-orange-100 hover:to-orange-100/50 transition-all duration-200 active:scale-[0.98]"
                      >
                        <svg
                          className="h-3.5 w-3.5"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                          strokeWidth={2}
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            d="M10 19l-7-7m0 0l7-7m-7 7h18"
                          />
                        </svg>
                        返回通用聊天
                      </button>
                    </div>
                  )}
                </div>
              )}
            </>
          )}

          {/* 快捷功能区 - 增强体验 */}
          <div className="mt-4 px-1">
            <div className="mb-3 flex items-center gap-2">
              <span className="text-[11px] font-semibold text-[var(--text-tertiary)]">
                ⚡ 快捷功能
              </span>
              <div className="h-px flex-1 bg-gradient-to-r from-[var(--border-light)] to-transparent" />
            </div>
            <div className="grid grid-cols-4 gap-1.5">
              <button
                type="button"
                onClick={() => {
                  if (skillInputPluginRegistry.has('translate')) switchToSkill('translate')
                  onUsePrompt('请翻译以下内容为英文：')
                }}
                className="group relative flex flex-col items-center gap-1 rounded-xl bg-gradient-to-br from-cyan-50 to-teal-50 p-2.5 text-center transition-all duration-200 hover:scale-105 hover:shadow-lg hover:shadow-cyan-500/20 hover:-translate-y-1 active:scale-100"
                title="翻译助手"
              >
                <span className="text-lg">🌐</span>
                <span className="text-[10px] font-semibold text-cyan-700">翻译</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  if (skillInputPluginRegistry.has('write')) switchToSkill('write')
                  onUsePrompt('请帮我写一篇文章：')
                }}
                className="group relative flex flex-col items-center gap-1 rounded-xl bg-gradient-to-br from-amber-50 to-yellow-50 p-2.5 text-center transition-all duration-200 hover:scale-105 hover:shadow-lg hover:shadow-amber-500/20 hover:-translate-y-1 active:scale-100"
                title="写作助手"
              >
                <span className="text-lg">📝</span>
                <span className="text-[10px] font-semibold text-amber-700">写作</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  if (skillInputPluginRegistry.has('image-gen')) switchToSkill('image-gen')
                  onUsePrompt('请生成一张图片：')
                }}
                className="group relative flex flex-col items-center gap-1 rounded-xl bg-gradient-to-br from-pink-50 to-fuchsia-50 p-2.5 text-center transition-all duration-200 hover:scale-105 hover:shadow-lg hover:shadow-pink-500/20 hover:-translate-y-1 active:scale-100"
                title="AI 图片生成"
              >
                <span className="text-lg">🎨</span>
                <span className="text-[10px] font-semibold text-pink-700">生图</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  if (skillInputPluginRegistry.has('read-document')) switchToSkill('read-document')
                  onOpenDocumentUpload()
                }}
                className="group relative flex flex-col items-center gap-1 rounded-xl bg-gradient-to-br from-green-50 to-emerald-50 p-2.5 text-center transition-all duration-200 hover:scale-105 hover:shadow-lg hover:shadow-green-500/20 hover:-translate-y-1 active:scale-100"
                title="文档阅读"
              >
                <span className="text-lg">📄</span>
                <span className="text-[10px] font-semibold text-green-700">文档</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  if (skillInputPluginRegistry.has('code')) switchToSkill('code')
                  onUsePrompt('请帮我编写代码：')
                }}
                className="group relative flex flex-col items-center gap-1 rounded-xl bg-gradient-to-br from-purple-50 to-violet-50 p-2.5 text-center transition-all duration-200 hover:scale-105 hover:shadow-lg hover:shadow-purple-500/20 hover:-translate-y-1 active:scale-100"
                title="代码编写"
              >
                <span className="text-lg">⚙️</span>
                <span className="text-[10px] font-semibold text-purple-700">代码</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  if (skillInputPluginRegistry.has('deep-search')) switchToSkill('deep-search')
                  onUsePrompt('请深度搜索以下主题：')
                }}
                className="group relative flex flex-col items-center gap-1 rounded-xl bg-gradient-to-br from-emerald-50 to-teal-50 p-2.5 text-center transition-all duration-200 hover:scale-105 hover:shadow-lg hover:shadow-emerald-500/20 hover:-translate-y-1 active:scale-100"
                title="深度搜索"
              >
                <span className="text-lg">🔬</span>
                <span className="text-[10px] font-semibold text-emerald-700">搜索</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  if (skillInputPluginRegistry.has('ppt')) switchToSkill('ppt')
                  onUsePrompt('请生成一份PPT大纲：')
                }}
                className="group relative flex flex-col items-center gap-1 rounded-xl bg-gradient-to-br from-orange-50 to-red-50 p-2.5 text-center transition-all duration-200 hover:scale-105 hover:shadow-lg hover:shadow-orange-500/20 hover:-translate-y-1 active:scale-100"
                title="PPT 生成"
              >
                <span className="text-lg">📑</span>
                <span className="text-[10px] font-semibold text-orange-700">PPT</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  if (skillInputPluginRegistry.has('academic-search'))
                    switchToSkill('academic-search')
                  onUsePrompt('请搜索以下学术文献：')
                }}
                className="group relative flex flex-col items-center gap-1 rounded-xl bg-gradient-to-br from-blue-50 to-indigo-50 p-2.5 text-center transition-all duration-200 hover:scale-105 hover:shadow-lg hover:shadow-blue-500/20 hover:-translate-y-1 active:scale-100"
                title="学术搜索"
              >
                <span className="text-lg">📚</span>
                <span className="text-[10px] font-semibold text-blue-700">学术</span>
              </button>
            </div>
          </div>

          {/* 本地能力面板详情 */}
          {showLocalPanel && (
            <div className="ml-1 mt-3 rounded-xl border border-[var(--border-light)] bg-[var(--bg-primary)] p-3">
              <div className="mb-2 flex items-center justify-between">
                <span className="text-[11px] font-semibold text-[var(--text-secondary)]">
                  Ollama
                </span>
                <span
                  className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${
                    localStatus.ollama === 'online'
                      ? 'bg-emerald-100 text-emerald-700'
                      : localStatus.ollama === 'checking'
                        ? 'bg-amber-100 text-amber-700'
                        : 'bg-gray-100 text-gray-500'
                  }`}
                >
                  {statusText[localStatus.ollama]}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-2 mb-2">
                <div className="rounded-lg bg-[var(--bg-secondary)] px-2.5 py-2">
                  <div className="text-[10px] text-[var(--text-tertiary)]">模型数</div>
                  <div className="text-[12px] font-semibold text-[var(--text-primary)]">
                    {localStatus.modelCount}
                  </div>
                </div>
                <div className="rounded-lg bg-[var(--bg-secondary)] px-2.5 py-2">
                  <div className="text-[10px] text-[var(--text-tertiary)]">当前模型</div>
                  <div className="truncate text-[11px] font-semibold text-[var(--text-primary)]">
                    {localStatus.activeModel}
                  </div>
                </div>
              </div>

              <input
                ref={inputRef}
                type="file"
                className="hidden"
                accept=".txt,.md,.json,.csv,.log,.ts,.tsx,.js,.jsx"
                onChange={event => {
                  const file = event.target.files?.[0]
                  if (file) onImportFile(file)
                  event.currentTarget.value = ''
                }}
              />

              <div className="space-y-1.5">
                <div className="flex gap-1.5">
                  <button
                    type="button"
                    onClick={onInspectLocal}
                    className="flex-1 rounded-lg bg-[var(--brand-orange)] px-2 py-1.5 text-[11px] font-medium text-white hover:opacity-90 transition-opacity"
                  >
                    检测
                  </button>
                  <button
                    type="button"
                    onClick={() => inputRef.current?.click()}
                    className="flex-1 rounded-lg bg-[var(--bg-secondary)] border border-[var(--border-light)] px-2 py-1.5 text-[11px] font-medium text-[var(--text-secondary)] hover:bg-[var(--bg-hover)] transition-colors"
                  >
                    导入
                  </button>
                </div>
                <div className="flex gap-1.5">
                  <button
                    type="button"
                    disabled={!hasMessages}
                    onClick={onExportSession}
                    className="flex-1 rounded-lg bg-[var(--bg-secondary)] border border-[var(--border-light)] px-2 py-1.5 text-[11px] font-medium text-[var(--text-secondary)] hover:bg-[var(--bg-hover)] disabled:opacity-40 transition-colors"
                  >
                    导出
                  </button>
                  <button
                    type="button"
                    disabled={!hasMessages}
                    onClick={onClearSession}
                    className="flex-1 rounded-lg bg-red-50 px-2 py-1.5 text-[11px] font-medium text-red-500 hover:bg-red-100 disabled:opacity-40 transition-colors"
                  >
                    清空
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </nav>

      <div className="flex min-h-0 flex-1 flex-col overflow-hidden border-t border-[var(--border-light)]">
        <div className="flex items-center justify-between px-4 py-2">
          <span className="text-[12px] font-medium text-[var(--text-tertiary)]">📝 历史对话</span>
          {conversations.length > 0 && (
            <span className="text-[10px] text-gray-400">{conversations.length}</span>
          )}
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-3 pb-3">
          {conversations.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-10 text-center">
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center shadow-sm mb-3">
                <svg className="w-7 h-7 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                </svg>
              </div>
              <p className="text-[12px] text-gray-400">开始一段新对话吧</p>
            </div>
          ) : (
            <div className="space-y-0.5">
              {conversations.map(conv => {
                const isActive = conv.id === activeSessionId
                return (
                  <div
                    key={conv.id}
                    className={`group relative flex items-center rounded-lg py-1.5 transition-all duration-200 hover:bg-[var(--sidebar-item-hover)] hover:pl-1 ${isActive ? 'bg-[var(--sidebar-item-active)]' : ''}`}
                  >
                    <button
                      type="button"
                      onClick={() => onSelectSession(conv.id)}
                      className="flex flex-1 items-center gap-2.5 px-2 text-left"
                    >
                      <span className={`h-1.5 w-1.5 shrink-0 rounded-full transition-colors ${isActive ? 'bg-[var(--brand-orange)]' : 'bg-gray-300 group-hover:bg-orange-400'}`} />
                      <span className="truncate text-[12px] leading-snug text-[var(--text-secondary)] group-hover:text-[var(--text-primary)]" title={conv.title}>
                        {conv.title}
                      </span>
                      <span className="shrink-0 text-[9px] text-gray-400">{conv.messages.length}条</span>
                    </button>
                    <button
                      type="button"
                      onClick={e => {
                        e.stopPropagation()
                        onDeleteSession(conv.id)
                      }}
                      className="mr-1 p-1.5 opacity-0 group-hover:opacity-100 hover:text-red-500 rounded-lg hover:bg-red-50 transition-all duration-200"
                      title="删除"
                    >
                      <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>

      {/* 底部用户区域 - 增强体验 */}
      <div className="border-t border-[var(--border-light)] bg-gradient-to-b from-white to-gray-50/50 px-4 py-3">
        <div className="flex items-center gap-3 group cursor-pointer p-1 rounded-xl hover:bg-white/80 transition-all duration-200">
          <div className="relative">
            <div className="absolute -inset-0.5 rounded-full bg-gradient-to-br from-orange-400/30 to-orange-600/20 blur-md group-hover:opacity-60 transition-opacity" />
            <div className="relative flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-orange-400 to-orange-600 shadow-md transition-transform duration-200 group-hover:scale-105">
              <span className="text-[12px] font-bold text-white">豆</span>
              <span className="absolute -bottom-0.5 -right-0.5 flex h-3 w-3 items-center justify-center rounded-full border-2 border-white bg-emerald-400 shadow-sm">
                <span className="h-1.5 w-1.5 rounded-full bg-white" />
              </span>
            </div>
          </div>
          <div className="flex flex-col flex-1 min-w-0">
            <span className="text-[13px] font-semibold text-gray-800 truncate group-hover:text-orange-600 transition-colors">
              用户
            </span>
            <span className="text-[11px] text-emerald-500 flex items-center gap-1 font-medium">
              <span className="h-1 w-1 rounded-full bg-emerald-400" />
              在线
            </span>
          </div>
          <button
            type="button"
            onClick={e => {
              e.stopPropagation()
              onOpenSettings()
            }}
            className="group/settings relative rounded-xl p-2 text-gray-400 transition-all duration-200 hover:bg-orange-50 hover:text-orange-500 active:scale-90"
            title="设置"
          >
            <svg
              className="h-5 w-5 transition-all duration-300 group-hover/settings:rotate-45"
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
      </div>
    </aside>
  )
}
