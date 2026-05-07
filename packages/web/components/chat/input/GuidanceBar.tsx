/**
 * GuidanceBar — 推荐问题横条组件
 *
 * 位于输入框上方，显示当前技能的推荐问题卡片（横向滚动）。
 * 不同技能展示不同的引导内容。点击即发送问题。
 * UX增强：渐变背景、交错入场动画、悬浮微交互
 */

import { useSkillContext } from '../../../contexts/SkillContext'
import { Sparkles, ArrowRight } from 'lucide-react'

interface GuidanceBarProps {
  /** 自定义问题列表（覆盖插件的 guidanceQuestions） */
  questions?: string[]
  /** 点击问题回调 */
  onQuestionSelect?: (question: string) => void
  /** 最大显示数量 */
  maxVisible?: number
}

export function GuidanceBar({
  questions: overrideQuestions,
  onQuestionSelect,
  maxVisible = 4,
}: GuidanceBarProps) {
  const { activePlugin } = useSkillContext()

  const displayQuestions = overrideQuestions ?? activePlugin.guidanceQuestions

  if (!displayQuestions || displayQuestions.length === 0) return null

  const visibleItems = displayQuestions.slice(0, maxVisible)

  return (
    <div className="relative w-full mb-3 overflow-hidden rounded-xl bg-gradient-to-r from-[#F8FAFD] via-white to-[#F5F7FA] px-3.5 py-2.5">
      {/* 装饰性渐变条 */}
      <div className="pointer-events-none absolute left-0 top-0 h-full w-1 rounded-l-xl bg-gradient-to-b from-[#1668DC] to-[#4A90E2]" />

      <div className="flex items-center gap-2.5 overflow-x-auto pb-0.5 scrollbar-thin scrollbar-thumb-gray-200/60">
        {/* 标题区 */}
        <div className="flex items-center gap-1.5 flex-shrink-0">
          <Sparkles size={15} className="text-[#1668DC]" />
          <span className="text-xs font-medium text-[#5B6470] whitespace-nowrap">试试问</span>
          <span className="text-[#D0D5DD]">·</span>
        </div>

        {/* 问题标签 — 带交错入场动画 */}
        <div className="flex gap-2 flex-nowrap">
          {visibleItems.map((q, idx) => (
            <button
              key={idx}
              onClick={() => onQuestionSelect?.(q)}
              className="group relative inline-flex items-center gap-1.5 pl-4 pr-2.5 py-1.5 rounded-full
                         bg-white text-xs text-[#374151] whitespace-nowrap
                         border border-[#E8ECF1] shadow-sm shadow-[#000]/[0.02]
                         transition-all duration-200 ease-out
                         hover:border-[#1668DC]/30 hover:shadow-md hover:shadow-[#1668DC]/10 hover:-translate-y-px
                         active:translate-y-0 active:scale-[0.97]
                         cursor-pointer
                         animate-in fade-in slide-in-from-bottom-2 duration-300"
              style={{ animationDelay: `${idx * 80}ms`, animationFillMode: 'backwards' }}
            >
              {/* 左侧小圆点装饰 */}
              <span className="absolute left-2 top-1/2 h-1 w-1 -translate-y-1/2 rounded-full bg-[#1668DC]/20 transition-colors group-hover:bg-[#1668DC]/50" />

              <span className="max-w-[180px] truncate">{q}</span>
              <ArrowRight
                size={12}
                className="text-[#C4C9D0] flex-shrink-0 transition-all duration-200 group-hover:translate-x-0.5 group-hover:text-[#1668DC]"
              />
            </button>
          ))}
        </div>
      </div>

      {/* 右侧渐变遮罩 — 提示可滚动 */}
      {visibleItems.length > 2 && (
        <div className="pointer-events-none absolute right-0 top-0 h-full w-8 bg-gradient-to-l from-[#F5F7FA] to-transparent" />
      )}
    </div>
  )
}
