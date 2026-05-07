/**
 * CodeArtifactCanvas — 代码产物面板
 *
 * 在消息区域内联展示代码类 AI 输出，包含：
 * - 语法高亮显示
 * - 语言标签
 * - 复制按钮
 * - 折叠/展开
 * - 导出为文件
 */

import { useState } from 'react'
import type { CodeArtifact } from '@/types'
import {
  Copy,
  Check,
  ChevronDown,
  ChevronUp,
  Download,
  Maximize2,
} from 'lucide-react'

interface CodeArtifactCanvasProps {
  artifact: CodeArtifact
  maxHeight?: number
}

/** 常用语言颜色映射 */
const LANGUAGE_COLORS: Record<string, string> = {
  typescript: '#3178C6',
  javascript: '#F7DF1E',
  python: '#3776AB',
  java: '#007396',
  go: '#00ADD8',
  rust: '#DEA584',
  csharp: '#512BD4',
  cpp: '#00599C',
  html: '#E34F26',
  css: '#1572B6',
  json: '#292929',
  markdown: '#083FA1',
  sql: '#336791',
  shell: '#4EAA25',
  default: '#6B7280',
}

export function CodeArtifactCanvas({ artifact, maxHeight = 400 }: CodeArtifactCanvasProps) {
  const [copied, setCopied] = useState(false)
  const [expanded, setExpanded] = useState(false)
  const lines = artifact.code.split('\n')
  const langColor = LANGUAGE_COLORS[artifact.language.toLowerCase()] || LANGUAGE_COLORS.default
  const shouldTruncate = lines.length > 15 && !expanded
  const displayLines = shouldTruncate ? lines.slice(0, 15) : lines

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(artifact.code)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch (e) {
      console.error('[CodeArtifactCanvas] 复制失败:', e)
    }
  }

  const handleExport = () => {
    const filename = artifact.filename || `code.${artifact.language}`
    const blob = new Blob([artifact.code], { type: 'text/plain' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = filename
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="rounded-xl border border-[#E5E7EB] bg-[#1E1E2E] overflow-hidden shadow-sm my-3">
      {/* Header 工具栏 */}
      <div className="flex items-center justify-between px-4 py-2.5 bg-[#181825] border-b border-[#313244]">
        <div className="flex items-center gap-2.5">
          {/* 语言标签 */}
          <span
            className="px-2 py-0.5 rounded-md text-[11px] font-semibold uppercase tracking-wide"
            style={{ color: langColor, backgroundColor: `${langColor}18` }}
          >
            {artifact.language}
          </span>

          {artifact.filename && (
            <span className="text-xs text-[#A6ADC8]">{artifact.filename}</span>
          )}

          <span className="text-xs text-[#6C7086]">
            {lines.length} 行
          </span>
        </div>

        {/* 操作按钮组 */}
        <div className="flex items-center gap-1">
          <ToolbarButton icon={<Copy size={14} />} label="复制" onClick={handleCopy} />
          <ToolbarButton icon={<Download size={14} />} label="导出" onClick={handleExport} />
          <ToolbarButton icon={<Maximize2 size={14} />} label="全屏" onClick={() => {}} />

          {/* 展开/折叠 */}
          {lines.length > 15 && (
            <button
              onClick={() => setExpanded(!expanded)}
              className="flex items-center gap-1 px-2 py-1 rounded text-xs text-[#A6ADC8] hover:text-white hover:bg-[#313244] transition-colors cursor-pointer"
            >
              {expanded ? (
                <>
                  <ChevronUp size={14} /> 收起
                </>
              ) : (
                <>
                  <ChevronDown size={14} /> 展开全部 ({lines.length})
                </>
              )}
            </button>
          )}
        </div>
      </div>

      {/* 代码区域 */}
      <div
        className="overflow-auto"
        style={{ maxHeight: expanded ? undefined : maxHeight }}
      >
        <pre className="p-4 text-sm leading-6 m-0">
          <code className="font-mono text-[#CDD6F4]">
            {displayLines.map((line, i) => (
              <div key={i} className="flex hover:bg-[#313244]/30 px-2 -mx-2 rounded transition-colors">
                <span className="select-none text-right mr-4 min-w-[2em] text-[#585B70] text-xs leading-6">
                  {i + 1}
                </span>
                <span>{line || ' '}</span>
              </div>
            ))}
            {shouldTruncate && (
              <div className="text-center text-xs text-[#6C7086] py-2">
                ... 还有 {lines.length - 15} 行代码
              </div>
            )}
          </code>
        </pre>
      </div>

      {/* 复制成功提示 */}
      {copied && (
        <div className="absolute top-2 right-16 flex items-center gap-1 px-2 py-1 rounded bg-[#A6E3A1] text-[#1E1E2E] text-xs font-medium animate-fade-in">
          <Check size={12} /> 已复制
        </div>
      )}
    </div>
  )
}

/** 小型工具栏按钮 */
function ToolbarButton({
  icon,
  label,
  onClick,
}: {
  icon: React.ReactNode
  label: string
  onClick: () => void
}) {
  return (
    <button
      onClick={onClick}
      className="flex items-center gap-1 px-2 py-1 rounded text-[#A6ADC8] hover:text-white hover:bg-[#313244] transition-colors cursor-pointer"
      title={label}
    >
      {icon}
    </button>
  )
}
