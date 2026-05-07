/**
 * SkillSelector — 技能选择器
 *
 * 横向滚动标签栏，展示所有已注册的技能插件。
 * 点击切换当前活跃技能，高亮显示当前选中项。
 * 支持分类分组显示。
 */

import React, { useMemo, useRef } from 'react'
import { useSkillContext } from '../../../contexts/SkillContext'
import { skillInputPluginRegistry } from '@core/plugins/skill-input-plugin/registry'
import type { SkillCategory, SkillInputPlugin } from '@core/plugins/skill-input-plugin/types'

/** 分类元信息 — 完整覆盖所有 SkillCategory */
const categoryMeta: Record<SkillCategory, { label: string; icon: string; color: string }> = {
  chat:            { label: '对话', icon: '💬', color: '#1668DC' },
  search:          { label: '搜索', icon: '🔍', color: '#10B981' },
  'deep-search':   { label: '深度搜索', icon: '🔬', color: '#059669' },
  'academic-search':{ label: '学术', icon: '📚', color: '#3B82F6' },
  'read-document':  { label: '文档', icon: '📄', color: '#F59E0B' },
  'read-website':  { label: '网页', icon: '🌐', color: '#06B6D4' },
  write:           { label: '创作', icon: '✨', color: '#8B5CF6' },
  translate:       { label: '翻译', icon: '🌐', color: '#14B8A6' },
  code:            { label: '代码', icon: '💻', color: '#EC4899' },
  'image-gen':     { label: '图片', icon: '🎨', color: '#F472B6' },
  video:           { label: '视频', icon: '🎬', color: '#EF4444' },
  music:           { label: '音乐', icon: '🎵', color: '#22C55E' },
  ppt:             { label: 'PPT', icon: '📊', color: '#F97316' },
}

// 分类展示顺序
const categoryOrder: SkillCategory[] = [
  'chat',
  'search', 'deep-search', 'academic-search',
  'read-document', 'read-website',
  'write', 'translate',
  'code',
  'image-gen', 'video', 'music', 'ppt',
]

interface SkillSelectorProps {
  /** 紧凑模式（用于嵌入输入框上方） */
  compact?: boolean
  /** 选择技能后的回调 */
  onSkillSelect?: (pluginId: string) => void
}

export const SkillSelector: React.FC<SkillSelectorProps> = ({
  compact = false,
  onSkillSelect,
}) => {
  const { activePluginId, switchToSkill, resetToChat } = useSkillContext()
  const scrollRef = useRef<HTMLDivElement>(null)

  // 从注册表获取所有插件，按分类排序
  const plugins = useMemo(() => skillInputPluginRegistry.listAll(), [])

  const grouped = useMemo(() => {
    const groups = new Map<SkillCategory, SkillInputPlugin[]>()
    for (const p of plugins) {
      const list = groups.get(p.category) ?? []
      list.push(p)
      groups.set(p.category, list)
    }
    return groups
  }, [plugins])

  const handleSelect = (pluginId: string) => {
    if (pluginId === 'chat') {
      resetToChat()
    } else {
      switchToSkill(pluginId)
    }
    onSkillSelect?.(pluginId)

    // 自动滚动到可见
    setTimeout(() => {
      const el = scrollRef.current?.querySelector(`[data-skill-id="${pluginId}"]`)
      el?.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' })
    }, 50)
  }

  if (plugins.length <= 1) return null

  return (
    <div className={`relative ${compact ? '' : 'mb-3'}`}>
      {/* 滚动容器 */}
      <div ref={scrollRef} className="flex items-center gap-1 overflow-x-auto scrollbar-hide pb-1.5 px-1 snap-x snap-mandatory">
        {categoryOrder.map(cat => {
          const items = grouped.get(cat)
          if (!items?.length) return null
          const meta = categoryMeta[cat]

          return (
            <React.Fragment key={cat}>
              {/* 分类标签（非紧凑模式） */}
              {!compact && (
                <span className="shrink-0 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-[#bbb]">
                  {meta.icon} {meta.label}
                </span>
              )}

              {items.map(plugin => {
                const isActive = plugin.id === activePluginId
                const catMeta = categoryMeta[plugin.category] ?? categoryMeta.chat

                return (
                  <button
                    key={plugin.id}
                    type="button"
                    data-skill-id={plugin.id}
                    onClick={() => handleSelect(plugin.id)}
                    title={plugin.description ?? plugin.name}
                    className={`group relative shrink-0 snap-start inline-flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-[13px] font-medium transition-all duration-200 ease-out cursor-pointer
                      ${compact ? 'text-xs px-2 py-1' : ''}
                      ${isActive
                        ? `bg-[${catMeta.color}] text-white shadow-md shadow-[${catMeta.color}]/25 scale-[1.03] -translate-y-px`
                        : 'bg-white border border-[#E8ECF1] text-[#555] hover:border-[#ccc] hover:shadow-sm hover:-translate-y-px'
                      }`}
                  >
                    {/* 激活光晕 */}
                    {isActive && (
                      <span className="absolute -inset-1 rounded-xl bg-[#1668DC]/10 animate-pulse" />
                    )}
                    {/* 图标 */}
                    <span className="relative text-sm leading-none transition-transform group-hover:scale-110">{(plugin as any).icon ?? catMeta.icon}</span>

                    {/* 名称 */}
                    <span className={`relative whitespace-nowrap ${isActive ? '' : 'group-hover:text-[#333]'}`}>
                      {plugin.name}
                    </span>

                    {/* 激活状态指示点 — 动画滑入 */}
                    {isActive && (
                      <span className="absolute -bottom-0.5 left-1/2 -translate-x-1/2 h-0.5 w-3 rounded-full bg-current opacity-60 animate-in zoom-in-95 duration-200" />
                    )}
                  </button>
                )
              })}
            </React.Fragment>
          )
        })}
      </div>

      {/* 渐变遮罩 - 左右两侧 */}
      <style jsx>{`
        .scrollbar-hide::-webkit-scrollbar { display: none; }
        .scrollbar-hide { -ms-overflow-style: none; scrollbar-width: none; }
      `}</style>
    </div>
  )
}

export default SkillSelector
