/**
 * SuggestionBar — 建议标签栏组件
 *
 * 位于输入框下方，显示当前技能的建议标签（推荐操作/模板/快捷入口）。
 * UX增强：图标色彩过渡、悬浮上浮+阴影、点击反馈波纹
 */

import { useSkillContext } from '../../../contexts/SkillContext'
import type { SuggestionItem } from '@core/plugins/skill-input-plugin/types'
import {
  PenTool,
  ImagePlus,
  Code2,
  Languages,
  TrendingUp,
  FileText,
  Mail,
  Music,
  Video,
  GraduationCap,
} from 'lucide-react'

/** 每个图标的品牌色 */
const ICON_COLOR_MAP: Record<string, string> = {
  PenTool: '#6366f1',
  ImagePlus: '#ec4899',
  Code2: '#10b981',
  Languages: '#f59e0b',
  TrendingUp: '#06b6d4',
  FileText: '#8b5cf6',
  Mail: '#ef4444',
  Music: '#a855f7',
  Video: '#f97316',
  GraduationCap: '#14b8a6',
}

const ICON_MAP: Record<string, React.FC<any>> = {
  PenTool,
  ImagePlus,
  Code2,
  Languages,
  TrendingUp,
  FileText,
  Mail,
  Music,
  Video,
  GraduationCap,
}

interface SuggestionBarProps {
  /** 自定义建议项（覆盖插件的 suggestions） */
  suggestions?: SuggestionItem[]
  /** 点击建议回调 */
  onSuggestionClick?: (item: SuggestionItem) => void
}

export function SuggestionBar({ suggestions: overrideSuggestions, onSuggestionClick }: SuggestionBarProps) {
  const { activePlugin } = useSkillContext()

  const displaySuggestions = overrideSuggestions ?? activePlugin.suggestions

  if (!displaySuggestions || displaySuggestions.length === 0) return null

  return (
    <div className="w-full mt-2.5 flex flex-wrap items-center gap-2 animate-in fade-in slide-in-from-bottom-1 duration-400 delay-100">
      {displaySuggestions.map((item, idx) => {
        const IconComponent = item.icon ? ICON_MAP[item.icon] : null
        const brandColor = item.icon ? (ICON_COLOR_MAP[item.icon] || '#6b7280') : '#6b7280'

        return (
          <button
            key={item.id}
            onClick={() => onSuggestionClick?.(item)}
            className="group relative inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg
                       bg-white/80 backdrop-blur-sm border border-[#EAEDF2]
                       text-xs font-medium text-[#4A5568]
                       transition-all duration-200 ease-out
                       hover:-translate-y-0.5 hover:bg-white hover:border-[#D0D5DD] hover:shadow-[0_4px_12px_rgba(0,0,0,0.08)]
                       active:translate-y-0 active:scale-[0.96]
                       cursor-pointer"
            style={{ animationDelay: `${idx * 50}ms` }}
          >
            {IconComponent && (
              <IconComponent
                size={13}
                className="transition-colors duration-200"
                style={{ color: brandColor }}
                strokeWidth={2}
              />
            )}
            <span>{item.label}</span>

            {/* 悬浮时的微光效果 */}
            <span className="absolute inset-0 rounded-lg bg-gradient-to-br from-brand/5 to-transparent opacity-0 transition-opacity duration-200 group-hover:opacity-100 pointer-events-none" style={{ '--brand': brandColor } as React.CSSProperties} />
          </button>
        )
      })}
    </div>
  )
}
