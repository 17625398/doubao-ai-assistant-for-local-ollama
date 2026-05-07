/**
 * SkillCardGrid — 技能卡片网格
 *
 * 欢迎页核心展示区，以精美卡片形式展示所有可用技能。
 * 每张卡片展示技能图标、名称、描述和快捷引导问题。
 * 点击卡片激活对应技能并填充引导提示。
 */

import React, { useMemo, useState } from 'react'
import { useSkillContext } from '../../contexts/SkillContext'
import { skillInputPluginRegistry } from '@core/plugins/skill-input-plugin/registry'
import type { SkillCategory, SkillInputPlugin } from '@core/plugins/skill-input-plugin/types'

/** 技能视觉配置 */
const skillVisuals: Record<string, { gradient: string; icon: string; pattern: string; backgroundSize?: string; glowColor?: string }> = {
  'deep-search':       { gradient: 'from-emerald-500 to-teal-600',   icon: '🔬', pattern: 'radial-gradient(circle at 30% 20%, rgba(255,255,255,0.15), transparent 55%)', glowColor: '#10b981' },
  'academic-search':   { gradient: 'from-blue-500 to-indigo-600',     icon: '📚', pattern: 'radial-gradient(circle at 70% 30%, rgba(255,255,255,0.12), transparent 50%)', glowColor: '#3b82f6' },
  'read-document':     { gradient: 'from-amber-500 to-orange-600',     icon: '📖', pattern: 'repeating-linear-gradient(45deg, transparent, transparent 6px, rgba(255,255,255,0.04) 6px, rgba(255,255,255,0.04) 12px)', glowColor: '#f59e0b' },
  'write':             { gradient: 'from-violet-500 to-purple-600',    icon: '✍️', pattern: 'linear-gradient(135deg, rgba(255,255,255,0.1) 0%, transparent 60%)', glowColor: '#8b5cf6' },
  'translate':         { gradient: 'from-cyan-500 to-sky-600',        icon: '🌐', pattern: 'radial-gradient(ellipse at 20% 80%, rgba(255,255,255,0.12), transparent 50%)', glowColor: '#06b6d4' },
  'code':              { gradient: 'from-pink-500 to-rose-600',        icon: '⚡', pattern: 'repeating-linear-gradient(-45deg, transparent, transparent 8px, rgba(255,255,255,0.03) 8px, rgba(255,255,255,0.03) 16px)', glowColor: '#ec4899' },
  'image-gen':         { gradient: 'from-fuchsia-500 to-pink-600',     icon: '🎨', pattern: 'radial-gradient(circle at 80% 20%, rgba(255,255,255,0.18), transparent 45%)', glowColor: '#d946ef' },
  'video':             { gradient: 'from-red-500 to-rose-700',         icon: '🎬', pattern: 'linear-gradient(to bottom right, rgba(255,255,255,0.08), transparent)', glowColor: '#ef4444' },
  'ppt':               { gradient: 'from-orange-500 to-red-600',       icon: '📊', pattern: 'conic-gradient(from 180deg at 50% 50%, rgba(255,255,255,0.06) 0deg, transparent 120deg, rgba(255,255,255,0.06) 240deg, transparent 360deg)', glowColor: '#f97316' },
  'music':             { gradient: 'from-green-500 to-emerald-700',    icon: '🎵', pattern: 'radial-gradient(circle at 50% 50%, rgba(255,255,255,0.1), transparent 65%)', glowColor: '#22c55e' },
  'search':            { gradient: 'from-slate-600 to-gray-800',        icon: '🔍', pattern: 'linear-gradient(rgba(255,255,255,0.05) 1px, transparent 1px)', backgroundSize: '8px 8px', glowColor: '#64748b' },
  'chat':              { gradient: 'from-[var(--brand-orange)] to-[var(--brand-orange-dark)]',      icon: '💬', pattern: 'radial-gradient(circle at 30% 70%, rgba(255,255,255,0.1), transparent 50%)', glowColor: 'var(--brand-orange)' },
}

interface SkillCardGridProps {
  /** 点击卡片回调 */
  onSkillActivate?: (pluginId: string, prompt?: string) => void
  /** 最大展示数量 */
  maxItems?: number
}

export const SkillCardGrid: React.FC<SkillCardGridProps> = ({
  onSkillActivate,
  maxItems,
}) => {
  const { switchToSkill } = useSkillContext()
  const [pressedId, setPressedId] = useState<string | null>(null)

  // 获取所有非 chat 插件（chat 是默认态，不需要卡片）
  const skills = useMemo(() => {
    return skillInputPluginRegistry
      .listAll()
      .filter(p => p.id !== 'chat')
      .slice(0, maxItems ?? 12)
  }, [maxItems])

  if (skills.length === 0) return null

  const handleCardClick = (skill: SkillInputPlugin) => {
    setPressedId(skill.id)
    setTimeout(() => setPressedId(null), 300)
    switchToSkill(skill.id)

    // 如果有第一个引导问题，自动填充
    const firstQuestion = skill.guidanceQuestions?.[0]
    onSkillActivate?.(skill.id, firstQuestion)
  }

  return (
    <section className="w-full max-w-[960px] mx-auto">
      {/* 标题区域 — 增强版 */}
      <div className="mb-8 flex items-center justify-center gap-4">
        <div className="h-px flex-1 max-w-[120px] bg-gradient-to-r from-transparent to-[var(--border-light)]" />
        <div className="flex items-center gap-3">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-gradient-to-br from-[var(--brand-orange)]/10 to-[var(--brand-orange)]/5 shadow-sm">
            <svg className="h-4 w-4 text-[var(--brand-orange)]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
          </div>
          <h2 className="text-[17px] font-bold text-[var(--text-primary)] tracking-tight">
            能力中心
          </h2>
        </div>
        <div className="h-px flex-1 max-w-[120px] bg-gradient-to-l from-transparent to-[var(--border-light)]" />
      </div>

      {/* 卡片网格 — 增强版 */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-5">
        {skills.map((skill, idx) => {
          const visual = skillVisuals[skill.id] ?? skillVisuals.chat
          const questionCount = skill.guidanceQuestions?.length ?? 0

          return (
            <button
              key={skill.id}
              type="button"
              onClick={() => handleCardClick(skill)}
              className={`group relative overflow-hidden rounded-2xl border text-left 
                         transition-all duration-300 ease-out cursor-pointer
                         hover:-translate-y-2 hover:shadow-[0_24px_48px_rgba(15,23,42,0.15),0_8px_16px_rgba(255,107,53,0.1)]
                         active:translate-y-0 active:scale-[0.97]
                         animate-in fade-in slide-in-from-bottom-2 duration-400
                         ${pressedId === skill.id ? 'scale-[0.96] ring-2 ring-[var(--brand-orange)]/30' : ''}
                         ${skill.id === 'write' || skill.id === 'code' ? 'border-[var(--border-light)] bg-gradient-to-b from-[var(--bg-primary)] to-[var(--bg-secondary)]' : 'border-[var(--border-light)] bg-[var(--bg-primary)]'}
                         hover:border-transparent`}
              style={{ animationDelay: `${idx * 60}ms`, animationFillMode: 'backwards' }}
            >
              {/* 玻璃态背景层 */}
              <div className="absolute inset-0 bg-gradient-to-b from-[var(--bg-primary)]/80 to-[var(--bg-primary)]/60 backdrop-blur-sm opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
              
              {/* 卡片顶部彩色区域 */}
              <div className={`relative h-26 sm:h-30 bg-gradient-to-br ${visual.gradient} overflow-hidden`}>
                {/* 装饰图案 */}
                <div className="absolute inset-0 opacity-50" style={{ background: visual.pattern }} />
                
                {/* 动态光晕效果 */}
                <div 
                  className="absolute inset-0 opacity-0 transition-opacity duration-500 group-hover:opacity-60"
                  style={{
                    background: `radial-gradient(circle at 50% 30%, color-mix(in srgb, var(--brand-orange) 25%, transparent), transparent 70%)`
                  }}
                />

                {/* 悬浮时的径向光晕 */}
                <div className="pointer-events-none absolute inset-0 bg-white/0 transition-all duration-500 group-hover:bg-white/15" />

                {/* 大图标 — 增强版 */}
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="relative">
                    {/* 图标外发光 */}
                    <div className="absolute -inset-4 rounded-2xl bg-white/0 group-hover:bg-white/20 blur-xl transition-all duration-500" />
                    {/* 玻璃态图标容器 */}
                    <div className="relative flex h-14 w-14 items-center justify-center rounded-2xl bg-white/20 backdrop-blur-md shadow-lg transition-all duration-300 group-hover:scale-110 group-hover:-translate-y-1">
                      <span className="text-3xl sm:text-4xl drop-shadow-lg">
                        {visual.icon}
                      </span>
                    </div>
                  </div>
                </div>

                {/* 角标 - 引导问题数 */}
                {questionCount > 0 && (
                  <div className="absolute top-3 right-3 flex items-center gap-1 rounded-full bg-white/25 backdrop-blur-sm px-2.5 py-1 shadow-sm">
                    <span className="text-[10px] font-semibold text-white/95">{questionCount} 个引导</span>
                  </div>
                )}

                {/* 底部渐变过渡 */}
                <div className="absolute bottom-0 left-0 right-0 h-8 bg-gradient-to-t from-[var(--bg-primary)] via-[var(--bg-primary)]/90 to-transparent" />
              </div>

              {/* 内容区 */}
              <div className="relative p-4 sm:p-5">
                {/* 名称行 */}
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[15px] sm:text-[16px] font-bold text-[var(--text-primary)] group-hover:text-[var(--brand-orange)] transition-colors duration-200">
                    {skill.name}
                  </span>
                  {/* 箭头指示器 */}
                  <div className="flex h-6 w-6 items-center justify-center rounded-lg bg-[var(--bg-secondary)] text-[var(--text-disabled)] transition-all duration-200 group-hover:bg-[var(--brand-orange)]/10 group-hover:text-[var(--brand-orange)] group-hover:scale-110">
                    <svg
                      className="w-3.5 h-3.5 transition-transform duration-200 group-hover:translate-x-0.5"
                      fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" d="M13 7l5 5m0 0l-5 5m5-5H6" />
                    </svg>
                  </div>
                </div>

                {/* 描述 */}
                {skill.description && (
                  <p className="text-[12px] sm:text-[13px] leading-relaxed text-[var(--text-secondary)] line-clamp-2 mb-3">
                    {skill.description}
                  </p>
                )}

                {/* 快捷引导预览 */}
                {skill.guidanceQuestions && skill.guidanceQuestions.length > 0 && (
                  <div className="flex flex-wrap gap-1.5">
                    {skill.guidanceQuestions.slice(0, 2).map((q, i) => (
                      <span
                        key={i}
                        className="inline-flex items-center truncate max-w-[150px] px-2.5 py-1 rounded-lg bg-[var(--bg-secondary)] text-[11px] text-[var(--text-tertiary)] group-hover:bg-[var(--brand-orange)]/10 group-hover:text-[var(--brand-orange)]/80 transition-colors duration-200"
                      >
                        <svg className="mr-1 h-2.5 w-2.5 text-[var(--border-medium)] group-hover:text-[var(--brand-orange)]/50 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M8.625 9.75a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H8.25m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H12m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0h-.375M21 12c0 4.556-4.03 8.25-9 8.25a9.764 9.764 0 01-2.555-.337A5.972 5.972 0 015.41 20.97a5.969 5.969 0 01-.474-.065 4.48 4.48 0 00.978-2.025c.09-.457-.133-.901-.467-1.226C3.93 16.178 3 14.189 3 12c0-4.556 4.03-8.25 9-8.25s9 3.694 9 8.25z" />
                        </svg>
                        {q.length > 18 ? q.slice(0, 17) + '…' : q}
                      </span>
                    ))}
                  </div>
                )}
              </div>

              {/* 悬浮时的顶部高光 */}
              <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/50 to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
            </button>
          )
        })}
      </div>
    </section>
  )
}

export default SkillCardGrid
