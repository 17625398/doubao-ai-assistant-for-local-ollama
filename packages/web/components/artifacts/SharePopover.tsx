/**
 * SharePopover — 分享弹窗组件
 *
 * 支持分享 Artifact 的多种方式：链接分享、图片导出、PDF导出等
 */

import { useState, useRef, useEffect } from 'react'
import { Link2, Image, FileText, QrCode, Check, ExternalLink } from 'lucide-react'

interface SharePopoverProps {
  open: boolean
  onClose: () => void
  /** 要分享的内容标题 */
  title?: string
  /** 分享链接生成函数 */
  generateShareUrl?: () => Promise<string>
  /** 图片导出函数 */
  exportAsImage?: () => Promise<Blob>
  /** PDF 导出函数 */
  exportAsPdf?: () => Promise<Blob>
}

type ShareMethod = 'link' | 'image' | 'pdf' | 'qr'

export function SharePopover({
  open,
  onClose,
  title = '分享',
  generateShareUrl,
  exportAsImage,
  exportAsPdf,
}: SharePopoverProps) {
  const [shareUrl, setShareUrl] = useState('')
  const [copied, setCopied] = useState(false)
  const [loading, setLoading] = useState<ShareMethod | null>(null)
  const popoverRef = useRef<HTMLDivElement>(null)

  // 点击外部关闭
  useEffect(() => {
    if (!open) return
    const handleClickOutside = (e: MouseEvent) => {
      if (popoverRef.current && !popoverRef.current.contains(e.target as Node)) {
        onClose()
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [open, onClose])

  if (!open) return null

  const handleShareLink = async () => {
    if (!generateShareUrl) return
    setLoading('link')
    try {
      const url = await generateShareUrl()
      setShareUrl(url)
    } catch (e) {
      console.error('[SharePopover] 生成分享链接失败:', e)
    }
    setLoading(null)
  }

  const handleCopyLink = async () => {
    if (!shareUrl) return
    try {
      await navigator.clipboard.writeText(shareUrl)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {}
  }

  const handleExport = async (method: 'image' | 'pdf') => {
    setLoading(method)
    try {
      const exporter = method === 'image' ? exportAsImage : exportAsPdf
      if (!exporter) return
      const blob = await exporter()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `${title}.${method === 'image' ? 'png' : 'pdf'}`
      a.click()
      URL.revokeObjectURL(url)
    } catch (e) {
      console.error(`[SharePopover] ${method} 导出失败:`, e)
    }
    setLoading(null)
  }

  return (
    <div
      ref={popoverRef}
      className="absolute right-0 top-full mt-2 w-72 rounded-xl bg-white border border-[#E5E7EB] shadow-lg z-50 animate-in fade-in zoom-in-95 duration-150"
    >
      {/* 标题栏 */}
      <div className="px-4 py-3 border-b border-[#F0F2F5]">
        <h3 className="text-sm font-semibold text-[#1A1A1A]">{title}</h3>
      </div>

      {/* 分享方式列表 */}
      <div className="p-2">
        {/* 链接分享 */}
        {generateShareUrl && (
          <ShareOption
            icon={<Link2 size={18} />}
            label="复制分享链接"
            desc="任何人可通过链接查看"
            loading={loading === 'link'}
            onClick={handleShareLink}
          />
        )}

        {shareUrl && (
          <div className="mx-2 mb-2 p-2 rounded-lg bg-[#F7F8FA] flex items-center gap-2">
            <input
              readOnly
              value={shareUrl}
              className="flex-1 text-xs bg-transparent outline-none text-[#3D3D3D] truncate"
            />
            <button
              onClick={handleCopyLink}
              className={`flex items-center gap-1 px-2 py-1 rounded text-xs transition-colors cursor-pointer ${
                copied
                  ? 'bg-[#10B981] text-white'
                  : 'bg-[#1668DC] text-white hover:bg-[#0E5BC8]'
              }`}
            >
              {copied ? <><Check size={12} /> 已复制</> : '复制'}
            </button>
          </div>
        )}

        {/* 图片导出 */}
        {exportAsImage && (
          <ShareOption
            icon={<Image size={18} />}
            label="导出为图片"
            desc="PNG 格式高清图片"
            loading={loading === 'image'}
            onClick={() => handleExport('image')}
          />
        )}

        {/* PDF 导出 */}
        {exportAsPdf && (
          <ShareOption
            icon={<FileText size={18} />}
            label="导出为 PDF"
            desc="适合打印和文档归档"
            loading={loading === 'pdf'}
            onClick={() => handleExport('pdf')}
          />
        )}

        {/* 二维码（占位） */}
        <ShareOption
          icon={<QrCode size={18} />}
          label="二维码分享"
          desc="扫码在手机上查看"
          onClick={() => {}}
        />
      </div>

      {/* 底部提示 */}
      <div className="px-4 py-2 border-t border-[#F0F2F5] flex items-center gap-1 text-xs text-[#9CA3AF]">
        <ExternalLink size={12} />
        分享内容将在 30 天后过期
      </div>
    </div>
  )
}

function ShareOption({
  icon,
  label,
  desc,
  loading,
  onClick,
}: {
  icon: React.ReactNode
  label: string
  desc: string
  loading?: boolean
  onClick: () => void
}) {
  return (
    <button
      onClick={onClick}
      disabled={loading}
      className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-[#F7F8FA] transition-colors text-left disabled:opacity-60 cursor-pointer"
    >
      <div className="w-9 h-9 rounded-lg bg-[#F0F2F5] flex items-center justify-center text-[#3D3D3D]">
        {loading ? (
          <div className="w-4 h-4 border-2 border-[#1668DC] border-t-transparent rounded-full animate-spin" />
        ) : (
          icon
        )}
      </div>
      <div className="flex-1 min-w-0">
        <div className="text-sm font-medium text-[#1A1A1A]">{label}</div>
        <div className="text-xs text-[#9CA3AF]">{desc}</div>
      </div>
    </button>
  )
}
