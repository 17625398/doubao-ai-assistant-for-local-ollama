import React, { useCallback, useEffect, useRef, useState } from 'react'
import {
  creationTemplates,
  uploadMenuItems,
  moreCapabilities,
} from '../../../services/doubao-home/data/homeContent'
import {
  MultimodalAttachment,
  processAttachment,
  buildMultimodalPrompt,
  getFileCategory,
  getCategoryLabel,
  getFileIcon,
  formatFileSize,
  checkFileSize,
  MULTIMEDIA_ACCEPT,
} from '../../../services/doubao-home/utils/multimodal'
import { DocumentParserUtil } from '@ai-intelligent-analysis-platform/core'
import { useActivePlugin } from '../../../contexts/SkillContext'
import { GuidanceBar } from '../input/GuidanceBar'
import { SuggestionBar } from '../input/SuggestionBar'
import type { SuggestionItem } from '@core/plugins/skill-input-plugin/types'
import { TranslationPanel } from '../../translation/TranslationPanel'
import { DocumentAnalysisPanel } from '../../DocumentAnalysisPanel'
import { ScreenshotQuestionPanel } from '../../screenshot-question/ScreenshotQuestionPanel'
import { ImageGenPanel } from '../../image-gen/ImageGenPanel'
import { DataAnalysisPanel } from '../../data-analysis/DataAnalysisPanel'
import {
  ollamaCapabilityService,
  type CapabilityId,
} from '../../../services/doubao-home/services/ollamaCapabilityService'

/** 文档解析阶段 */
type ParseStage = 'idle' | 'reading' | 'parsing' | 'extracting' | 'processing' | 'complete'

/** 文档解析进度状态 */
interface DocumentParseProgress {
  stage: ParseStage
  fileName: string
  fileSize: number
  fileType: string
  progress: number
  error?: string
}

/** 拖放状态 */
type DragState = 'idle' | 'drag-over' | 'invalid'

interface ChatInputBoxProps {
  input: string
  canSend: boolean
  tools: readonly (readonly [string, string | null])[]
  onInputChange: (value: string) => void
  onSend: () => void
  onUsePrompt: (prompt: string, attachments?: MultimodalAttachment[]) => void
  onOpenSettings: () => void
  triggerDocUpload?: number // 外部触发文档上传的计数器
  triggerCodeUpload?: number // 外部触发代码上传的计数器
}

type MenuState = 'upload' | 'more' | null

export const ChatInputBox: React.FC<ChatInputBoxProps> = ({
  input,
  canSend,
  tools,
  onInputChange,
  onSend,
  onUsePrompt,
  triggerDocUpload,
  triggerCodeUpload,
}) => {
  // 从技能插件注册表读取当前活跃插件的配置
  const plugin = useActivePlugin()

  const [activeMenu, setActiveMenu] = useState<MenuState>(null)
  const fileRef = useRef<HTMLInputElement>(null)
  const documentRef = useRef<HTMLInputElement>(null) // 文档解析专用
  const codeRef = useRef<HTMLInputElement>(null) // 代码文件专用
  const [attachments, setAttachments] = useState<MultimodalAttachment[]>([])
  const [processingFiles, setProcessingFiles] = useState(false)
  const [isFocused, setIsFocused] = useState(false)
  const [dragState, setDragState] = useState<DragState>('idle')
  const [docParseProgress, setDocParseProgress] = useState<DocumentParseProgress | null>(null)
  const [showTranslation, setShowTranslation] = useState(false) // 翻译面板
  const [showScreenshot, setShowScreenshot] = useState(false) // 截图问答面板
  const [showImageGen, setShowImageGen] = useState(false) // 图片生成面板
  const [showDataAnalysis, setShowDataAnalysis] = useState(false) // 数据分析面板
  const [showDocAnalysis, setShowDocAnalysis] = useState(false) // 文档智能分析面板
  const dropZoneRef = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  // 自适应 textarea 高度
  const adjustTextareaHeight = useCallback(() => {
    const ta = textareaRef.current
    if (!ta) return
    ta.style.height = 'auto'
    ta.style.height = Math.min(ta.scrollHeight, 120) + 'px'
  }, [])

  useEffect(() => {
    adjustTextareaHeight()
  }, [input, adjustTextareaHeight])

  // 外部触发文档上传
  useEffect(() => {
    if (triggerDocUpload && triggerDocUpload > 0) {
      documentRef.current?.click()
    }
  }, [triggerDocUpload])

  // 外部触发代码上传
  useEffect(() => {
    if (triggerCodeUpload && triggerCodeUpload > 0) {
      codeRef.current?.click()
    }
  }, [triggerCodeUpload])

  /** 处理代码文件选择 */
  const handleCodeFileSelected = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const files = e.target.files
      if (!files?.length) return

      const newAttachments: MultimodalAttachment[] = []

      for (let i = 0; i < files.length; i++) {
        const file = files[i]
        const sizeCheck = checkFileSize(file)

        if (!sizeCheck.valid) {
          newAttachments.push({
            id: `err_${Date.now()}_${i}`,
            name: file.name,
            type: file.type || 'application/octet-stream',
            size: file.size,
            status: 'error',
            error: `文件过大 (${formatFileSize(file.size)} > ${formatFileSize(sizeCheck.maxSize)})`,
          })
          continue
        }

        const attachment = await processAttachment(file)
        newAttachments.push(attachment)
      }

      setAttachments(prev => [...prev, ...newAttachments])

      // 设置代码审查提示词
      if (newAttachments.length > 0) {
        onUsePrompt('请审查以下代码并指出潜在问题和改进建议：')
      }

      // 重置 file input
      if (codeRef.current) codeRef.current.value = ''
    },
    [onUsePrompt]
  )

  const closeMenus = useCallback(() => setActiveMenu(null), [])

  // 插件决定的文件类型接受限制（优先于全局默认值）
  const effectiveAccept = plugin.acceptedFileTypes?.join(',') ?? MULTIMEDIA_ACCEPT

  /** 处理文件选择 */
  const handleFileSelected = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const files = e.target.files
      if (!files?.length) return

      setProcessingFiles(true)
      closeMenus()

      const newAttachments: MultimodalAttachment[] = []
      let errorCount = 0

      for (let i = 0; i < files.length; i++) {
        const file = files[i]
        const sizeCheck = checkFileSize(file)

        if (!sizeCheck.valid) {
          // 文件过大，显示错误提示
          newAttachments.push({
            id: `err_${Date.now()}_${i}`,
            name: file.name,
            type: file.type || 'application/octet-stream',
            size: file.size,
            status: 'error',
            error: `文件过大 (${formatFileSize(file.size)} > ${formatFileSize(sizeCheck.maxSize)})`,
          })
          errorCount++
          continue
        }

        const attachment = await processAttachment(file)
        newAttachments.push(attachment)
        if (attachment.status === 'error') errorCount++
      }

      setAttachments(prev => [...prev, ...newAttachments])
      setProcessingFiles(false)

      // 重置 file input (使用 ref 而非已回收的事件 currentTarget)
      if (fileRef.current) fileRef.current.value = ''
    },
    [closeMenus]
  )

  /** 移除单个附件 */
  const removeAttachment = useCallback((id: string) => {
    setAttachments(prev => {
      const att = prev.find(a => a.id === id)
      if (att?.dataUrl) URL.revokeObjectURL(att.dataUrl)
      return prev.filter(a => a.id !== id)
    })
  }, [])

  /** 发送消息（含附件） */
  const handleSendWithAttachments = useCallback(() => {
    if (!canSubmit) return

    const readyAttachments = attachments.filter(a => a.status === 'ready')

    if (!input.trim() && readyAttachments.length === 0) return

    const { prompt } = buildMultimodalPrompt(input, readyAttachments)
    onUsePrompt(prompt, readyAttachments)
    onSend() // 触发实际发送

    // 清空输入和附件
    setAttachments([])
  }, [canSend, input, attachments, onUsePrompt, onSend])

  /** 语音输入 */
  const handleVoice = useCallback(() => {
    const w = window as unknown as Record<string, unknown>
    const SR = w.SpeechRecognition || w.webkitSpeechRecognition
    if (!SR) {
      alert('不支持语音')
      return
    }
    const r = new (SR as new () => any)()
    r.lang = 'zh-CN'
    r.onresult = (ev: any) => onInputChange(input + ev.results[0][0].transcript)
    r.onerror = () => alert('识别失败')
    r.start()
  }, [input, onInputChange])

  /** 文档解析 — 调用 DocumentParserUtil 进行深度解析 */
  const handleDocumentParse = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const files = e.target.files
      if (!files?.length) return

      closeMenus()
      const file = files[0]

      // 设置初始进度状态
      setDocParseProgress({
        stage: 'reading',
        fileName: file.name,
        fileSize: file.size,
        fileType: file.type || 'application/octet-stream',
        progress: 0,
      })

      try {
        // 阶段 1: 读取 (0-20%)
        setDocParseProgress(prev => (prev ? { ...prev, stage: 'reading', progress: 10 } : null))
        await new Promise(r => setTimeout(r, 200))

        // 阶段 2: 解析 (20-60%)
        setDocParseProgress(prev => (prev ? { ...prev, stage: 'parsing', progress: 25 } : null))
        const parseResult = await DocumentParserUtil.parse(file, {
          extractText: true,
          enableChunking: false,
        }).catch(err => {
          console.error('[文档解析] parse 失败:', err)
          return null
        })

        // 如果解析失败，展示错误并允许用户重试
        if (!parseResult) {
          setDocParseProgress(prev =>
            prev ? { ...prev, error: '解析引擎不可用，请检查 Ollama 服务' } : null
          )
          setTimeout(() => setDocParseProgress(null), 4000)
          return
        }

        // 检查解析结果是否成功
        if (!parseResult.success) {
          // 根据错误类型提供友好的错误消息
          const errorMsg = parseResult.error || '文档解析失败'
          let userFriendlyError = errorMsg

          // 将技术错误转换为用户友好的提示
          if (errorMsg.includes('not supported') || errorMsg.includes('不支持')) {
            userFriendlyError = `不支持的文件格式：${file.name.split('.').pop()?.toUpperCase()}。请使用支持的格式：PDF、Word(.docx)、TXT、Markdown、图片等。`
          } else if (
            errorMsg.includes('Invalid docx') ||
            errorMsg.includes('corrupt') ||
            errorMsg.includes('损坏')
          ) {
            userFriendlyError = `文件 "${file.name}" 似乎已损坏或不是有效的 Word 文档。请尝试在 Microsoft Word 中打开并重新保存。`
          } else if (errorMsg.includes('old .doc')) {
            userFriendlyError = `不支持旧的 .doc 格式。请将文档另存为 .docx 格式后重试。`
          } else if (errorMsg.includes('Invalid') && errorMsg.includes('file')) {
            userFriendlyError = `文件 "${file.name}" 格式无效或已损坏。`
          }

          setDocParseProgress(prev => (prev ? { ...prev, error: userFriendlyError } : null))
          setTimeout(() => setDocParseProgress(null), 6000)
          return
        }

        // 阶段 3: 提取文本 (60-80%)
        setDocParseProgress(prev => (prev ? { ...prev, stage: 'extracting', progress: 65 } : null))
        await new Promise(r => setTimeout(r, 150))

        // 阶段 4: 处理 (80-95%)
        setDocParseProgress(prev => (prev ? { ...prev, stage: 'processing', progress: 85 } : null))
        const extractedText = (parseResult && parseResult.text) || ''

        // 阶段 5: 完成 (95-100%)
        setDocParseProgress(prev => (prev ? { ...prev, stage: 'complete', progress: 100 } : null))

        // 包装为 MultimodalAttachment
        const attachment: MultimodalAttachment = {
          id: `doc_${Date.now()}`,
          name: file.name,
          type: file.type || 'application/octet-stream',
          size: file.size,
          textContent: extractedText,
          status: extractedText.length > 0 ? 'ready' : 'error',
          error: extractedText.length === 0 ? '文档内容为空' : undefined,
        }

        setAttachments(prev => [...prev, attachment])
        setDocParseProgress(null)
      } catch (err) {
        const errorMsg = err instanceof Error ? err.message : '解析失败'
        setDocParseProgress(prev => (prev ? { ...prev, error: errorMsg } : null))
        setTimeout(() => setDocParseProgress(null), 4000)
      }

      // 重置 file input
      if (documentRef.current) documentRef.current.value = ''
    },
    [closeMenus]
  )

  /** 翻译面板 — 生成翻译 prompt */
  const handleTranslationGenerate = useCallback(
    (prompt: string) => {
      onUsePrompt(prompt)
      onSend()
    },
    [onUsePrompt, onSend]
  )

  /** 截图问答 — 提交截图和问题 */
  const handleScreenshotSubmit = useCallback(
    (image: string, question: string) => {
      onUsePrompt(question, [
        {
          id: `ss_${Date.now()}`,
          name: 'screenshot.png',
          type: 'image/png',
          size: 0,
          dataUrl: image,
          status: 'ready',
        },
      ])
      onSend()
    },
    [onUsePrompt, onSend]
  )

  /** 处理快捷操作菜单点击 */
  const handleUploadAction = useCallback(
    (action: string) => {
      switch (action) {
        case 'select-file':
          fileRef.current?.click()
          break
        case 'screenshot':
          // 尝试从剪贴板读取图片
          if (navigator.clipboard && navigator.clipboard.read) {
            navigator.clipboard
              .read()
              .then(async items => {
                for (const item of items) {
                  for (const type of item.types) {
                    if (type.startsWith('image/')) {
                      const blob = await item.getType(type)
                      const file = new File([blob], `screenshot_${Date.now()}.png`, { type })
                      setProcessingFiles(true)
                      const att = await processAttachment(file)
                      setAttachments(prev => [...prev, att])
                      setProcessingFiles(false)
                      return
                    }
                  }
                }
                alert('剪贴板中没有图片')
              })
              .catch(() => alert('无法访问剪贴板'))
          } else {
            alert('请使用 Ctrl+V 粘贴截图')
          }
          break
        case 'camera':
          // 触发相机（如果支持）
          const cameraInput = document.createElement('input')
          cameraInput.type = 'file'
          cameraInput.accept = 'image/*,.video/*'
          cameraInput.capture = 'environment'
          cameraInput.onchange = e =>
            handleFileSelected(e as unknown as React.ChangeEvent<HTMLInputElement>)
          cameraInput.click()
          break
        case 'translation':
          setShowTranslation(true)
          break
        case 'screenshot-question':
          setShowScreenshot(true)
          break
        case 'image-gen':
          setShowImageGen(true)
          break
        case 'data-analysis':
          setShowDataAnalysis(true)
          break
        case 'deep-search':
        case 'code-review':
        case 'logic-mode':
        case 'writing':
        case 'ppt':
        case 'academic-search':
          // 调用 ollamaCapabilityService
          const capabilityMap: Record<string, string> = {
            'deep-search': '深度搜索：',
            'code-review': '请审查以下代码：',
            'logic-mode': '请用思维链模式分析：',
            writing: '请帮我写作：',
            ppt: '请生成PPT大纲：',
            'academic-search': '请进行学术搜索：',
          }
          onUsePrompt(capabilityMap[action] || '请帮助我：')
          onSend()
          break
        default:
          alert(`功能开发中: ${action}`)
      }
      closeMenus()
    },
    [closeMenus, handleFileSelected, onUsePrompt, onSend, setShowDataAnalysis]
  )

  /** 拖放进入 — 检测文件类型 */
  const handleDragEnter = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    const hasFiles = e.dataTransfer.types.includes('Files')
    setDragState(hasFiles ? 'drag-over' : 'invalid')
  }, [])

  const handleDragOver = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault()
      e.stopPropagation()
      if (dragState !== 'idle') setDragState('drag-over')
    },
    [dragState]
  )

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    // 仅当真正离开容器时才重置（避免子元素触发误判）
    if (dropZoneRef.current && !dropZoneRef.current.contains(e.relatedTarget as Node)) {
      setDragState('idle')
    }
  }, [])

  /** 拖放文件落地 */
  const handleDrop = useCallback(async (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setDragState('idle')

    const files = Array.from(e.dataTransfer.files)
    if (!files.length) return

    setProcessingFiles(true)
    const newAttachments: MultimodalAttachment[] = []
    for (let i = 0; i < files.length; i++) {
      const file = files[i]
      const sizeCheck = checkFileSize(file)
      if (!sizeCheck.valid) {
        newAttachments.push({
          id: `err_${Date.now()}_${i}`,
          name: file.name,
          type: file.type || 'application/octet-stream',
          size: file.size,
          status: 'error',
          error: `文件过大 (${formatFileSize(file.size)} > ${formatFileSize(sizeCheck.maxSize)})`,
        })
        continue
      }
      const attachment = await processAttachment(file)
      newAttachments.push(attachment)
    }
    setAttachments(prev => [...prev, ...newAttachments])
    setProcessingFiles(false)
    // 聚焦输入框
    dropZoneRef.current?.querySelector('textarea')?.focus()
  }, [])

  // 优先使用本地 attachments（不受父组件状态影响），有附件时也能发送
  const canSubmit = attachments.length > 0 || canSend

  return (
    <div
      ref={dropZoneRef}
      className="mx-auto w-full max-w-[720px] px-4"
      onDragEnter={handleDragEnter}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      {/* GuidanceBar — 插件驱动的推荐问题横条 */}
      <GuidanceBar
        onQuestionSelect={q => {
          onUsePrompt(q)
          onSend()
        }}
      />

      {/* 拖放遮罩 */}
      {dragState === 'drag-over' && (
        <div className="mb-2 flex flex-col items-center justify-center rounded-xl border-2 border-dashed border-[var(--brand-orange)]/50 bg-[var(--brand-orange)]/5 py-8 animate-in fade-in zoom-in-95 duration-200">
          <svg
            className="mb-2 h-10 w-10 text-[var(--brand-orange)]/60"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={1.5}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M12 16.5V9.75m0 0l3 3m-3-3l-3 3M6.75 19.5a4.5 4.5 0 01-1.41-8.775 5.25 5.25 0 0110.233-2.33 3 3 0 013.758 3.848A3.752 3.752 0 0118 19.5H6.75z"
            />
          </svg>
          <span className="text-sm font-medium text-[var(--brand-orange)]">释放以添加文件</span>
          <span className="mt-1 text-xs text-[var(--brand-orange)]/60">
            支持图片 / 音频 / 视频 / PDF / 文档等
          </span>
        </div>
      )}
      {dragState === 'invalid' && (
        <div className="mb-2 flex items-center justify-center rounded-xl border-2 border-dashed border-orange-300 bg-orange-50 py-4">
          <span className="text-sm text-orange-500">请拖放文件到此处</span>
        </div>
      )}

      {/* Attachment preview bar */}
      {attachments.length > 0 && (
        <div className="mb-2 flex flex-wrap gap-2 rounded-xl border border-[var(--border-light)] bg-[var(--bg-secondary)] p-2 animate-in slide-in-from-bottom-2 duration-200">
          {attachments.map(att => {
            const category = getFileCategory(att)
            const isError = att.status === 'error'
            const isParsedDoc = !!att.textContent // 文档解析后的附件

            return (
              <div
                key={att.id}
                className={`group relative flex max-w-[220px] items-center gap-1.5 rounded-lg border px-2 py-1.5 ${
                  isError
                    ? 'border-red-200 bg-red-50'
                    : isParsedDoc
                      ? 'border-green-200 bg-green-50/50 hover:border-green-300' // 文档解析卡片高亮
                      : 'border-[var(--border-light)] bg-[var(--bg-primary)] hover:border-[var(--brand-orange)]/30'
                }`}
              >
                {/* Thumbnail / Icon */}
                {att.dataUrl && category === 'image' ? (
                  <img src={att.dataUrl} alt={att.name} className="h-8 w-8 rounded object-cover" />
                ) : (
                  <span
                    className={`flex h-8 w-8 shrink-0 items-center justify-center rounded text-sm ${isParsedDoc ? 'bg-green-100 text-green-600' : 'bg-[var(--bg-tertiary)]'}`}
                  >
                    {isParsedDoc ? (
                      <svg
                        className="h-4 w-4"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                        strokeWidth={1.8}
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z"
                        />
                      </svg>
                    ) : (
                      getFileIcon(category)
                    )}
                  </span>
                )}

                {/* File info */}
                <div className="min-w-0 flex-1">
                  <div
                    className="truncate text-[11px] font-medium text-[var(--text-primary)]"
                    title={att.name}
                  >
                    {att.name}
                  </div>
                  <div className="text-[10px] text-[var(--text-tertiary)]">
                    {isError ? (
                      att.error
                    ) : isParsedDoc ? (
                      <span className="flex items-center gap-1">
                        <span className="inline-flex items-center gap-0.5 rounded-full bg-green-100 px-1 py-0.5 font-medium text-green-600">
                          <svg
                            className="h-2.5 w-2.5"
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                            strokeWidth={2.5}
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              d="M4.5 12.75l6 6 9-13.5"
                            />
                          </svg>
                          已解析
                        </span>
                        <span className="text-green-500/70">
                          {att.textContent?.length
                            ? `${att.textContent.length.toLocaleString()}字`
                            : `${formatFileSize(att.size)}`}
                        </span>
                      </span>
                    ) : (
                      `${getCategoryLabel(category)} · ${formatFileSize(att.size)}`
                    )}
                  </div>
                </div>

                {/* Remove button */}
                <button
                  type="button"
                  onClick={() => removeAttachment(att.id)}
                  className={`shrink-0 rounded p-0.5 opacity-0 transition group-hover:opacity-100 ${isParsedDoc ? 'hover:bg-red-100 hover:text-red-500' : ''}`}
                  title={isError ? '移除' : '移除附件'}
                >
                  <svg
                    className="h-3.5 w-3.5"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={2}
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>

                {/* Processing overlay */}
                {att.status === 'reading' && (
                  <div className="absolute inset-0 flex items-center justify-center rounded-lg bg-white/80">
                    <svg
                      className="h-4 w-4 animate-spin text-blue-500"
                      fill="none"
                      viewBox="0 0 24 24"
                    >
                      <circle
                        className="opacity-25"
                        cx="12"
                        cy="12"
                        r="10"
                        stroke="currentColor"
                        strokeWidth="4"
                      />
                      <path
                        className="opacity-75"
                        fill="currentColor"
                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                      />
                    </svg>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      {/* Upload popup menu */}
      {activeMenu === 'upload' && (
        <div
          className="mb-2 animate-in fade-in slide-in-from-bottom-2 rounded-xl border border-[var(--border-light)] bg-[var(--bg-primary)] p-1.5 shadow-lg max-h-[400px] overflow-y-auto"
          onMouseLeave={closeMenus}
        >
          {/* AI 能力区 */}
          <div className="px-2 py-1 text-[10px] font-medium text-[var(--text-tertiary)] uppercase tracking-wider">
            ✨ AI 能力
          </div>

          {/* Document parse — 文档深度解析入口 */}
          <button
            type="button"
            onClick={() => documentRef.current?.click()}
            className="flex h-auto w-full flex-col items-start gap-0.5 rounded-lg px-3 py-2 text-left transition hover:bg-green-50"
          >
            <span className="flex items-center gap-2 text-[13px] font-semibold text-green-600">
              <svg
                className="h-4 w-4"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={1.8}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z"
                />
              </svg>
              <span>文档深度解析</span>
            </span>
            <span className="text-[11px] text-green-500/70">
              PDF/Word/Excel/PPT — 智能提取结构化内容
            </span>
          </button>

          {/* 翻译入口 */}
          <button
            type="button"
            onClick={() => handleUploadAction('translation')}
            className="flex h-auto w-full flex-col items-start gap-0.5 rounded-lg px-3 py-2 text-left transition hover:bg-cyan-50"
          >
            <span className="flex items-center gap-2 text-[13px] font-semibold text-cyan-600">
              <svg
                className="h-4 w-4"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={1.8}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M10.5 21l4.5-12h-3m-9 0l-4.5 12h3m6 0h3m-3-18a9 9 0 100 18 9 9 0 000-18z"
                />
              </svg>
              <span>翻译助手</span>
            </span>
            <span className="text-[11px] text-cyan-500/70">
              支持 15 种语言 · 通用/技术/商务/医学翻译
            </span>
          </button>

          {/* 截图问答入口 */}
          <button
            type="button"
            onClick={() => handleUploadAction('screenshot-question')}
            className="flex h-auto w-full flex-col items-start gap-0.5 rounded-lg px-3 py-2 text-left transition hover:bg-amber-50"
          >
            <span className="flex items-center gap-2 text-[13px] font-semibold text-amber-600">
              <svg
                className="h-4 w-4"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={1.8}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909m-18 3.75h16.5a1.5 1.5 0 001.5-1.5V6a1.5 1.5 0 00-1.5-1.5H3.75A1.5 1.5 0 002.25 6v12a1.5 1.5 0 001.5 1.5zm10.5-11.25h.008v.008h-.008V8.25zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z"
                />
              </svg>
              <span>截图问答</span>
            </span>
            <span className="text-[11px] text-amber-500/70">截屏后 AI 自动识别并解答问题</span>
          </button>

          {/* 图片生成入口 */}
          <button
            type="button"
            onClick={() => handleUploadAction('image-gen')}
            className="flex h-auto w-full flex-col items-start gap-0.5 rounded-lg px-3 py-2 text-left transition hover:bg-pink-50"
          >
            <span className="flex items-center gap-2 text-[13px] font-semibold text-pink-600">
              <svg
                className="h-4 w-4"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={1.8}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.455 2.456L21.75 6l-1.035.259a3.375 3.375 0 00-2.456 2.456z"
                />
              </svg>
              <span>AI 图片生成</span>
            </span>
            <span className="text-[11px] text-pink-500/70">
              DALL-E 3 / Stable Diffusion · 8 种风格预设
            </span>
          </button>

          <div className="border-t border-[var(--border-light)] my-1" />

          {/* 高级能力区 */}
          <div className="px-2 py-1 text-[10px] font-medium text-[var(--text-tertiary)] uppercase tracking-wider">
            ⚡ 高级能力
          </div>

          {/* 深度搜索 */}
          <button
            type="button"
            onClick={() => handleUploadAction('deep-search')}
            className="flex h-auto w-full flex-col items-start gap-0.5 rounded-lg px-3 py-2 text-left transition hover:bg-emerald-50"
          >
            <span className="flex items-center gap-2 text-[13px] font-medium text-emerald-600">
              <span className="text-sm">🔬</span>
              <span>深度搜索</span>
            </span>
            <span className="text-[11px] text-emerald-500/70">多源交叉验证，输出研究报告</span>
          </button>

          {/* 代码审查 */}
          <button
            type="button"
            onClick={() => handleUploadAction('code-review')}
            className="flex h-auto w-full flex-col items-start gap-0.5 rounded-lg px-3 py-2 text-left transition hover:bg-purple-50"
          >
            <span className="flex items-center gap-2 text-[13px] font-medium text-purple-600">
              <span className="text-sm">⚙️</span>
              <span>代码审查</span>
            </span>
            <span className="text-[11px] text-purple-500/70">10+ 语言代码质量分析</span>
          </button>

          {/* 数据分析 */}
          <button
            type="button"
            onClick={() => handleUploadAction('data-analysis')}
            className="flex h-auto w-full flex-col items-start gap-0.5 rounded-lg px-3 py-2 text-left transition hover:bg-blue-50"
          >
            <span className="flex items-center gap-2 text-[13px] font-medium text-blue-600">
              <span className="text-sm">📊</span>
              <span>数据分析</span>
            </span>
            <span className="text-[11px] text-blue-500/70">CSV/JSON 数据可视化与分析</span>
          </button>

          {/* 思维链模式 */}
          <button
            type="button"
            onClick={() => handleUploadAction('logic-mode')}
            className="flex h-auto w-full flex-col items-start gap-0.5 rounded-lg px-3 py-2 text-left transition hover:bg-slate-50"
          >
            <span className="flex items-center gap-2 text-[13px] font-medium text-slate-600">
              <span className="text-sm">🧠</span>
              <span>思维链模式</span>
            </span>
            <span className="text-[11px] text-slate-500/70">深度推理与分步验证</span>
          </button>

          {/* PPT 生成 */}
          <button
            type="button"
            onClick={() => handleUploadAction('ppt')}
            className="flex h-auto w-full flex-col items-start gap-0.5 rounded-lg px-3 py-2 text-left transition hover:bg-orange-50"
          >
            <span className="flex items-center gap-2 text-[13px] font-medium text-orange-600">
              <span className="text-sm">📑</span>
              <span>PPT 生成</span>
            </span>
            <span className="text-[11px] text-orange-500/70">输入主题自动生成精美 PPT 大纲</span>
          </button>

          <div className="border-t border-[var(--border-light)] my-1" />

          {/* 文件上传区 */}
          <div className="px-2 py-1 text-[10px] font-medium text-[var(--text-tertiary)] uppercase tracking-wider">
            📎 文件上传
          </div>

          {[
            {
              icon: '\u{1F4CE}',
              label: '选择本地文件',
              action: 'select-file',
              desc: '支持图片/音频/视频/PDF/文档等',
            },
            {
              icon: '\u{1F5BC}\uFE0F',
              label: '粘贴截屏',
              action: 'screenshot',
              desc: '从剪贴板读取图片',
            },
            { icon: '\u{1F4F7}', label: '拍照上传', action: 'camera', desc: '使用摄像头拍摄' },
          ].map(item => (
            <button
              key={item.action}
              type="button"
              onClick={() => handleUploadAction(item.action)}
              className="flex h-auto w-full flex-col items-start gap-0.5 rounded-lg px-3 py-2 text-left transition hover:bg-[var(--bg-secondary)]"
            >
              <span className="flex items-center gap-2 text-[13px] font-medium text-[var(--text-primary)]">
                <span>{item.icon}</span>
                <span>{item.label}</span>
              </span>
              <span className="text-[11px] text-[var(--text-tertiary)]">{item.desc}</span>
            </button>
          ))}

          {/* Supported formats hint */}
          <div className="mt-1 border-t border-[var(--border-light)] px-2 pt-1.5 pb-0.5">
            <div className="text-[10px] text-[var(--text-disabled)]">
              支持格式：JPG/PNG/GIF/WebP · MP3/WAV/OGG/AAC · MP4/WebM · PDF · DOC/XLS/PPT ·
              TXT/MD/JSON/代码 等 60+ 种
            </div>
            <div className="mt-0.5 text-[10px] text-[var(--text-disabled)]">
              单文件最大：图片 20MB / 音频 25MB / 视频 50MB / 其他 10MB
            </div>
          </div>
        </div>
      )}

      {/* Document parse progress panel */}
      {docParseProgress && (
        <div className="mb-2 animate-in fade-in slide-in-from-bottom-2 rounded-xl border border-green-200 bg-green-50/80 p-3 shadow-sm backdrop-blur-sm">
          {/* File info + error state */}
          {docParseProgress.error ? (
            <div className="flex items-center gap-2 text-sm text-red-500">
              <svg
                className="h-4 w-4 shrink-0"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z"
                />
              </svg>
              <span className="font-medium">解析失败</span>
              <span className="text-red-400">{docParseProgress.error}</span>
            </div>
          ) : (
            <>
              {/* File meta */}
              <div className="mb-2 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <svg
                    className="h-4 w-4 text-green-600"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={1.8}
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z"
                    />
                  </svg>
                  <span
                    className="truncate max-w-[200px] text-[13px] font-medium text-green-700"
                    title={docParseProgress.fileName}
                  >
                    {docParseProgress.fileName}
                  </span>
                  <span className="text-[11px] text-green-500/60">
                    {formatFileSize(docParseProgress.fileSize)}
                  </span>
                </div>
                {docParseProgress.stage === 'complete' && (
                  <span className="flex items-center gap-1 text-[11px] font-medium text-green-600">
                    <svg
                      className="h-3.5 w-3.5"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      strokeWidth={2.5}
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M4.5 12.75l6 6 9-13.5"
                      />
                    </svg>
                    解析完成
                  </span>
                )}
              </div>

              {/* 5-stage progress */}
              <div className="mb-1.5 flex items-center gap-1">
                {(['reading', 'parsing', 'extracting', 'processing', 'complete'] as const).map(
                  (stage, idx) => {
                    const isActive = docParseProgress.stage === stage
                    const isDone =
                      ['reading', 'parsing', 'extracting', 'processing', 'complete'].indexOf(
                        docParseProgress.stage
                      ) > idx
                    return (
                      <div key={stage} className="relative flex flex-1 items-center">
                        {idx > 0 && (
                          <div
                            className={`absolute -left-1 h-0.5 w-full ${isDone ? 'bg-green-400' : 'bg-gray-200'}`}
                          />
                        )}
                        <div
                          className={`relative z-10 h-2 w-2 rounded-full transition-all duration-300 ${isActive ? 'scale-150 bg-green-500 shadow-sm shadow-green-300' : isDone ? 'bg-green-400' : 'bg-gray-200'}`}
                        />
                      </div>
                    )
                  }
                )}
              </div>

              {/* Stage labels */}
              <div className="mb-2 flex justify-between text-[9px] text-green-500/60">
                {['读取', '解析', '提取', '处理', '完成'].map((label, idx) => {
                  const stageNames: ParseStage[] = [
                    'reading',
                    'parsing',
                    'extracting',
                    'processing',
                    'complete',
                  ]
                  const isActive = docParseProgress.stage === stageNames[idx]
                  return (
                    <span key={label} className={isActive ? 'font-semibold text-green-600' : ''}>
                      {label}
                    </span>
                  )
                })}
              </div>

              {/* Progress bar */}
              <div className="relative h-1.5 overflow-hidden rounded-full bg-green-100">
                <div
                  className="absolute left-0 top-0 h-full rounded-full bg-gradient-to-r from-green-400 to-green-500 transition-all duration-500 ease-out"
                  style={{ width: `${docParseProgress.progress}%` }}
                />
              </div>
            </>
          )}
        </div>
      )}

      {/* More capabilities popup */}
      {activeMenu === 'more' && (
        <div
          className="mb-2 animate-in fade-in rounded-xl border border-[#eee] bg-white p-1.5 shadow-lg"
          onMouseLeave={closeMenus}
        >
          <div className="mb-1 px-2 py-1 text-[11px] font-medium text-[#999]">更多能力</div>
          {moreCapabilities.map(c => (
            <button
              key={c.title}
              type="button"
              onClick={() => {
                onUsePrompt(c.prompt)
                onSend()
                closeMenus()
              }}
              className="flex h-8 w-full items-center gap-2 rounded-lg px-3 text-left text-[12px] text-[#444] hover:bg-[#f5f5f5]"
            >
              <span>{c.title}</span>
            </button>
          ))}
        </div>
      )}

      {/* Hidden file input */}
      <input
        ref={fileRef}
        type="file"
        className="hidden"
        accept={effectiveAccept}
        multiple
        onChange={handleFileSelected}
      />
      {/* Hidden document parse input — 文档专用解析入口 */}
      <input
        ref={documentRef}
        type="file"
        className="hidden"
        accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.md,.html,.htm"
        onChange={handleDocumentParse}
      />
      {/* Hidden code input — 代码文件专用入口 */}
      <input
        ref={codeRef}
        type="file"
        className="hidden"
        accept=".py,.js,.ts,.tsx,.jsx,.java,.c,.cpp,.h,.hpp,.go,.rs,.rb,.php,.cs,.swift,.kt,.scala,.sql,.sh,.bash,.ps1,.json,.yaml,.yml,.xml,.html,.css,.scss,.less,.vue,.svelte"
        multiple
        onChange={handleCodeFileSelected}
      />

      {/* Input container — 优化版 */}
      <div
        className={`group/input relative flex items-end gap-2 rounded-2xl border bg-[var(--bg-primary)] dark:bg-[var(--dark-bg-primary)] p-2 transition-all duration-300 ease-out ${
          isFocused
            ? 'border-[var(--brand-orange)]/40 shadow-[0_0_0_3px_rgba(255,107,53,0.06),0_8px_32px_rgba(255,107,53,0.12)] dark:border-[var(--brand-orange)]/40 dark:shadow-[0_0_0_3px_rgba(255,107,53,0.08),0_8px_32px_rgba(255,107,53,0.12)]'
            : attachments.length > 0
              ? 'border-[var(--brand-orange)]/30 dark:border-[var(--brand-orange)]/30 shadow-lg shadow-[var(--brand-orange)]/10 dark:shadow-[var(--brand-orange)]/10'
              : 'border-[var(--border-light)] dark:border-[var(--dark-border)] hover:border-[var(--border-medium)] dark:hover:border-[var(--dark-border-hover)] hover:shadow-md hover:shadow-gray-100/40 dark:hover:shadow-none'
        }`}
      >
        {/* 聚焦时的背景光晕 */}
        {isFocused && (
          <div className="pointer-events-none absolute inset-0 rounded-2xl bg-gradient-to-r from-[var(--brand-orange)]/3 via-transparent to-[var(--brand-orange)]/3 animate-in fade-in duration-500" />
        )}
        {/* Left toolbar — 增强版 */}
        <div className="flex items-center gap-1 pl-0.5">
          {/* Document parse button */}
          <button
            type="button"
            onClick={() => documentRef.current?.click()}
            className="group/doc relative rounded-xl p-2 text-[#888] transition-all duration-200 hover:scale-105 hover:bg-gradient-to-br hover:from-green-50 hover:to-emerald-50 hover:text-green-600 active:scale-95"
            title="文档深度解析（PDF/Word/Excel/PPT）"
          >
            {/* 背景装饰 */}
            <div className="absolute inset-0 rounded-xl bg-gradient-to-br from-green-500/0 to-emerald-500/0 opacity-0 transition-opacity duration-200 group-hover/doc:opacity-100" />
            <svg
              className="relative h-[18px] w-[18px] transition-transform duration-200 group-hover/doc:-translate-y-0.5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={1.8}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z"
              />
            </svg>
          </button>

          {/* Upload button */}
          <button
            type="button"
            onClick={() => setActiveMenu(m => (m === 'upload' ? null : 'upload'))}
            className={`group/upload relative rounded-xl p-2 transition-all duration-200 ${
              activeMenu === 'upload'
                ? 'scale-110 bg-gradient-to-br from-[var(--brand-orange)]/10 to-[var(--brand-orange)]/5 text-[var(--brand-orange)] shadow-lg shadow-[var(--brand-orange)]/20'
                : 'text-[var(--text-secondary)] hover:scale-105 hover:bg-gradient-to-br hover:from-[var(--brand-orange)]/10 hover:to-[var(--brand-orange)]/5 hover:text-[var(--brand-orange)] active:scale-95'
            }`}
            title="添加附件（支持多模态）"
          >
            <svg
              className="relative h-[18px] w-[18px]"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
            </svg>
            {attachments.length > 0 && (
              <span className="absolute -right-1 -top-1 flex h-5 min-w-[20px] items-center justify-center rounded-full bg-gradient-to-br from-[var(--brand-orange)] to-[var(--brand-orange-dark)] px-1.5 text-[10px] font-bold text-white shadow-lg shadow-[var(--brand-orange)]/30 animate-in zoom-in-95">
                {attachments.length}
              </span>
            )}
          </button>

          {/* Document Analysis button */}
          <button
            type="button"
            onClick={() => setShowDocAnalysis(true)}
            className="group/doc relative rounded-xl p-2 text-[#888] transition-all duration-200 hover:scale-105 hover:bg-gradient-to-br hover:from-blue-50 hover:to-indigo-50 hover:text-blue-600 active:scale-95"
            title="文档智能分析"
          >
            <svg
              className="relative h-[18px] w-[18px] transition-transform duration-200 group-hover/doc:-translate-y-0.5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={1.8}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z"
              />
            </svg>
          </button>

          {/* Voice button */}
          <button
            type="button"
            onClick={handleVoice}
            className="group/voice relative rounded-xl p-2 text-[#888] transition-all duration-200 hover:scale-105 hover:bg-gradient-to-br hover:from-purple-50 hover:to-fuchsia-50 hover:text-purple-600 active:scale-95"
            title="语音输入"
          >
            <svg
              className="relative h-[18px] w-[18px] transition-transform duration-200 group-hover/voice:-translate-y-0.5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z"
              />
            </svg>
          </button>

          {/* Translation button */}
          <button
            type="button"
            onClick={() => setShowTranslation(true)}
            className="group/trans relative rounded-xl p-2 text-[#888] transition-all duration-200 hover:scale-105 hover:bg-gradient-to-br hover:from-cyan-50 hover:to-teal-50 hover:text-cyan-600 active:scale-95"
            title="翻译助手"
          >
            <svg
              className="relative h-[18px] w-[18px] transition-transform duration-200 group-hover/trans:-translate-y-0.5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={1.8}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M10.5 21l4.5-12h-3m-9 0l-4.5 12h3m6 0h3m-3-18a9 9 0 100 18 9 9 0 000-18z"
              />
            </svg>
          </button>

          {/* Screenshot question button */}
          <button
            type="button"
            onClick={() => setShowScreenshot(true)}
            className="group/ss relative rounded-xl p-2 text-[#888] transition-all duration-200 hover:scale-105 hover:bg-gradient-to-br hover:from-amber-50 hover:to-orange-50 hover:text-amber-600 active:scale-95"
            title="截图问答"
          >
            <svg
              className="relative h-[18px] w-[18px] transition-transform duration-200 group-hover/ss:-translate-y-0.5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={1.8}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909m-18 3.75h16.5a1.5 1.5 0 001.5-1.5V6a1.5 1.5 0 00-1.5-1.5H3.75A1.5 1.5 0 002.25 6v12a1.5 1.5 0 001.5 1.5zm10.5-11.25h.008v.008h-.008V8.25zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z"
              />
            </svg>
          </button>

          {/* Image generation button */}
          <button
            type="button"
            onClick={() => setShowImageGen(true)}
            className="group/img relative rounded-xl p-2 text-[#888] transition-all duration-200 hover:scale-105 hover:bg-gradient-to-br hover:from-pink-50 hover:to-rose-50 hover:text-pink-600 active:scale-95"
            title="AI 图片生成"
          >
            <svg
              className="relative h-[18px] w-[18px] transition-transform duration-200 group-hover/img:-translate-y-0.5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={1.8}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.455 2.456L21.75 6l-1.035.259a3.375 3.375 0 00-2.456 2.456zM16.894 20.567L16.5 21.75l-.394-1.183a2.25 2.25 0 00-1.423-1.423L13.5 18.75l1.183-.394a2.25 2.25 0 001.423-1.423l.394-1.183.394 1.183a2.25 2.25 0 001.423 1.423l1.183.394-1.183.394a2.25 2.25 0 00-1.423 1.423z"
              />
            </svg>
          </button>
        </div>

        {/* Textarea */}
        <textarea
          ref={textareaRef}
          value={input}
          onChange={e => {
            onInputChange(e.target.value)
            adjustTextareaHeight()
          }}
          onFocus={() => {
            setIsFocused(true)
          }}
          onBlur={() => setIsFocused(false)}
          onKeyDown={e => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault()
              handleSendWithAttachments()
            }
          }}
          placeholder={
            attachments.length > 0
              ? `已选择 ${attachments.length} 个附件，可补充说明...`
              : plugin.placeholder || '输入消息，Enter 发送 · Shift+Enter 换行'
          }
          rows={1}
          className="min-h-[32px] max-h-[120px] flex-1 resize-none border-0 bg-transparent py-1.5 text-[14px] leading-relaxed outline-none placeholder:text-[var(--text-disabled)] dark:placeholder:text-[var(--dark-text-disabled)] dark:text-[var(--dark-text-primary)] transition-all duration-150"
        />

        {/* Send button — 优化版 */}
        <button
          type="button"
          disabled={!canSubmit}
          onClick={handleSendWithAttachments}
          className={`relative shrink-0 flex items-center justify-center gap-2 rounded-xl px-5 py-2.5 text-sm font-semibold transition-all duration-300 ease-out overflow-hidden ${
            canSubmit
              ? 'bg-gradient-to-br from-[var(--brand-orange)] to-[var(--brand-orange-dark)] text-white shadow-lg shadow-[var(--brand-orange)]/30 hover:shadow-xl hover:shadow-[var(--brand-orange)]/40 hover:scale-[1.03] active:scale-[0.97]'
              : 'bg-[var(--bg-tertiary)] dark:bg-[var(--dark-bg-tertiary)] text-[var(--text-disabled)] dark:text-[var(--dark-text-disabled)] cursor-not-allowed'
          }`}
        >
          {/* 悬停光效 */}
          {canSubmit && (
            <div className="absolute inset-0 rounded-xl bg-gradient-to-r from-white/0 via-white/15 to-white/0 opacity-0 group-hover/input:opacity-100 transition-opacity duration-500" />
          )}

          {processingFiles ? (
            <>
              <svg className="h-4 w-4 animate-spin relative" fill="none" viewBox="0 0 24 24">
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                />
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                />
              </svg>
              <span className="relative">处理中</span>
            </>
          ) : canSubmit ? (
            <>
              <span className="relative flex items-center gap-1.5">
                <svg
                  className="h-4 w-4 transition-transform duration-200 group-hover/input:-translate-x-0.5"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2.5}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <line x1="22" y1="2" x2="11" y2="13" />
                  <polygon points="22 2 15 22 11 13 2 9 22 2" />
                </svg>
                <span>{plugin.sendButtonText || '发送'}</span>
              </span>
              {/* 顶部光泽 */}
              <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/30 to-transparent" />
            </>
          ) : (
            <svg
              className="h-4 w-4 opacity-40"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <line x1="22" y1="2" x2="11" y2="13" />
              <polygon points="22 2 15 22 11 13 2 9 22 2" />
            </svg>
          )}
        </button>
      </div>

      {/* SuggestionBar — 插件驱动的建议标签 */}
      <SuggestionBar
        onSuggestionClick={(item: SuggestionItem) => {
          onUsePrompt(item.prompt)
          onSend()
        }}
      />

      {/* Bottom hint — 增强版 */}
      <div className="mt-2 flex items-center justify-between px-1">
        <div className="flex items-center gap-4 text-[11px] text-[var(--text-disabled)] dark:text-[var(--dark-text-disabled)] transition-colors group-hover/input:text-[var(--text-tertiary)]">
          <div className="flex items-center gap-1.5">
            <kbd className="flex items-center justify-center rounded-lg bg-gradient-to-b from-[var(--bg-secondary)] to-[var(--bg-tertiary)] dark:from-[var(--dark-bg-secondary)] dark:to-[var(--dark-bg-tertiary)] px-1.5 py-0.5 font-mono text-[10px] text-[var(--text-secondary)] dark:text-[var(--dark-text-secondary)] shadow-sm ring-1 ring-inset ring-[var(--border-light)]/50 dark:ring-[var(--dark-border)]/50">
              Enter
            </kbd>
            <span className="text-[var(--text-disabled)]">发送</span>
          </div>
          <div className="flex items-center gap-1.5">
            <kbd className="flex items-center justify-center rounded-lg bg-gradient-to-b from-[var(--bg-secondary)] to-[var(--bg-tertiary)] px-1.5 py-0.5 font-mono text-[10px] text-[var(--text-secondary)] shadow-sm ring-1 ring-inset ring-[var(--border-light)]/50">
              Shift
            </kbd>
            <span className="text-[var(--text-disabled)]">+</span>
            <kbd className="flex items-center justify-center rounded-lg bg-gradient-to-b from-[var(--bg-secondary)] to-[var(--bg-tertiary)] px-1.5 py-0.5 font-mono text-[10px] text-[var(--text-secondary)] shadow-sm ring-1 ring-inset ring-[var(--border-light)]/50">
              Enter
            </kbd>
            <span className="text-[var(--text-disabled)]">换行</span>
          </div>
          {attachments.length > 0 && (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-gradient-to-r from-[var(--brand-orange)]/10 to-[var(--brand-orange)]/5 px-2.5 py-1 font-medium text-[var(--brand-orange)] shadow-sm">
              <svg className="h-3 w-3" fill="currentColor" viewBox="0 0 20 20">
                <path
                  fillRule="evenodd"
                  d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                  clipRule="evenodd"
                />
              </svg>
              {attachments.length} 个附件待发送
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[11px] text-[var(--text-disabled)] transition-colors group-hover/input:text-[var(--text-tertiary)] flex items-center gap-1.5">
            <span className="flex h-1.5 w-1.5 items-center justify-center rounded-full bg-emerald-400" />
            豆包AI
          </span>
          <span className="text-[var(--border-medium)]">·</span>
          <span className="text-[11px] text-[var(--text-disabled)] transition-colors group-hover/input:text-[var(--text-tertiary)]">
            多模态分析
          </span>
        </div>
      </div>

      {/* Translation Panel */}
      {showTranslation && (
        <TranslationPanel
          onClose={() => setShowTranslation(false)}
          onGenerate={handleTranslationGenerate}
        />
      )}

      {/* Screenshot Question Panel */}
      {showScreenshot && (
        <ScreenshotQuestionPanel
          onClose={() => setShowScreenshot(false)}
          onSubmit={handleScreenshotSubmit}
        />
      )}

      {/* Image Generation Panel */}
      {showImageGen && (
        <ImageGenPanel
          onClose={() => setShowImageGen(false)}
          onSendToChat={imageUrl => {
            // 将生成的图片发送到聊天
            onUsePrompt('请分析这张图片', [
              {
                id: `img_${Date.now()}`,
                name: 'generated_image.png',
                type: 'image/png',
                size: 0,
                dataUrl: imageUrl,
                status: 'ready',
              },
            ])
            onSend()
            setShowImageGen(false)
          }}
        />
      )}

      {/* Data Analysis Panel */}
      {showDataAnalysis && (
        <DataAnalysisPanel
          onClose={() => setShowDataAnalysis(false)}
          onGenerate={prompt => {
            onUsePrompt(prompt)
            onSend()
            setShowDataAnalysis(false)
          }}
        />
      )}

      {/* Document Analysis Panel */}
      {showDocAnalysis && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="w-full max-w-5xl max-h-[90vh] overflow-y-auto">
            <DocumentAnalysisPanel onClose={() => setShowDocAnalysis(false)} />
          </div>
        </div>
      )}
    </div>
  )
}
