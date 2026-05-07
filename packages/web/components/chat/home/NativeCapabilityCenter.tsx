/**
 * NativeCapabilityCenter — 原生能力中心 (完整功能实现)
 *
 * 将所有原生核心功能面板以精美卡片网格形式展示在首页。
 * 每个卡片对应一个独立功能，支持实时交互和结果预览。
 * 分为：创作类 / 媒体类 / 工具类 / 高级能力 四大分区。
 *
 * 设计原则：
 * - 每个能力有独特的图标、颜色渐变、描述
 * - 实时显示 Ollama 连接状态和当前模型
 * - 悬浮展示快速操作
 * - 点击打开能力专属面板进行实时交互
 */

import React, { useState, useCallback, useEffect, useRef } from 'react'
import { useSkillContext } from '../../../contexts/SkillContext'
import {
  ollamaCapabilityService,
  type CapabilityId,
} from '../../../services/doubao-home/services/ollamaCapabilityService'
import {
  ImageGenCapability,
  VoiceStudioCapability,
  CloudStorageCapability,
  ScreenshotQuestionCapability,
  RAGCapability,
  ReadDocumentCapability,
  PPTCapability,
  VideoCapability,
  MusicCapability,
  CodeReviewCapability,
  DataAnalysisCapability,
  WritingCapability,
  TranslationCapability,
} from '../../../services/doubao-home/services/nativeCapabilityService'
import {
  X,
  Sparkles,
  FileText,
  Mic,
  MicOff,
  Volume2,
  Upload,
  Camera,
  Brain,
  Search,
  BookOpen,
  Database,
  FileCode,
  FileImage,
  Layers,
} from 'lucide-react'

// ═══════════════════════════════════════════
// 能力定义 — 所有原生核心功能的元数据
// ═══════════════════════════════════════════

interface Capability {
  id: string
  name: string
  description: string
  icon: string
  gradient: string
  category: 'creative' | 'media' | 'tool' | 'advanced'
  skillId?: string
  quickActions?: Array<{ label: string; prompt: string }>
  badge?: string
  requiresFlag?: string
  hasPanel?: boolean // 是否有专属交互面板
}

const capabilities: Capability[] = [
  // ── 创作类 ──
  {
    id: 'writing',
    name: '写作助手',
    description: '邮件/文章/报告/诗歌/简历 一键生成',
    icon: '✍️',
    gradient: 'from-violet-500 to-purple-600',
    category: 'creative',
    skillId: 'write',
    hasPanel: true,
    quickActions: [
      { label: '写邮件', prompt: '帮我写一封专业的商务邮件' },
      { label: '写文章', prompt: '帮我写一篇关于人工智能的文章' },
      { label: '写周报', prompt: '请把本周工作整理成周报格式' },
    ],
  },
  {
    id: 'translation',
    name: '多语言翻译',
    description: '支持12+语言互译，保留原文排版',
    icon: '🌐',
    gradient: 'from-cyan-500 to-teal-600',
    category: 'creative',
    skillId: 'translate',
    hasPanel: true,
    quickActions: [
      { label: '中→英', prompt: '翻译以下内容为英文：' },
      { label: '日→中', prompt: '翻译以下日文内容：' },
      { label: '全文翻译', prompt: '请完整翻译这段内容：' },
    ],
  },
  {
    id: 'ppt',
    name: 'PPT 生成',
    description: '输入主题自动生成精美 PPT 大纲',
    icon: '📊',
    gradient: 'from-orange-500 to-red-600',
    category: 'creative',
    skillId: 'ppt',
    hasPanel: true,
    quickActions: [
      { label: '商业 PPT', prompt: '生成一份商业计划书PPT大纲，10页' },
      { label: '教学 PPT', prompt: '生成一套教学课件PPT大纲' },
      { label: '年终总结', prompt: '生成2024年度工作总结PPT' },
    ],
  },

  // ── 媒体类 ──
  {
    id: 'image-gen',
    name: '图片生成',
    description: 'DALL-E 3 / Stable Diffusion 多模型',
    icon: '🎨',
    gradient: 'from-fuchsia-500 to-pink-600',
    category: 'media',
    skillId: 'image-gen',
    badge: 'HOT',
    hasPanel: true,
    quickActions: [
      { label: '写实风格', prompt: '生成一张写实风格的图片：' },
      { label: '动漫风格', prompt: '生成一张动漫风格的图片：' },
      { label: 'Logo设计', prompt: '设计一个科技公司 Logo：' },
    ],
  },
  {
    id: 'video',
    name: '视频助手',
    description: 'AI 视频脚本生成与分镜',
    icon: '🎬',
    gradient: 'from-red-500 to-rose-700',
    category: 'media',
    skillId: 'video',
    hasPanel: true,
    quickActions: [
      { label: '短视频', prompt: '生成一个30秒的短视频脚本：' },
      { label: '解说视频', prompt: '生成产品解说视频脚本：' },
    ],
  },
  {
    id: 'music',
    name: '音乐创作',
    description: '智能作曲与编曲建议',
    icon: '🎵',
    gradient: 'from-green-500 to-emerald-700',
    category: 'media',
    skillId: 'music',
    hasPanel: true,
    quickActions: [
      { label: '流行曲', prompt: '创作一首流行歌曲：' },
      { label: '轻音乐', prompt: '创作一首轻松的背景音乐：' },
    ],
  },
  {
    id: 'voice-studio',
    name: '语音工作室',
    description: 'ASR 语音转文字 + TTS 文字转语音',
    icon: '🎤',
    gradient: 'from-indigo-500 to-purple-700',
    category: 'media',
    badge: 'NEW',
    hasPanel: true,
    quickActions: [
      { label: '录音转文字', prompt: '将我接下来的语音转换为文字' },
      { label: '文字朗读', prompt: '用标准普通话朗读以下内容：' },
    ],
  },

  // ── 工具类 ──
  {
    id: 'code-review',
    name: '代码审查',
    description: '10+ 语言代码质量分析',
    icon: '⚙️',
    gradient: 'from-pink-500 to-rose-600',
    category: 'tool',
    skillId: 'code',
    hasPanel: true,
    quickActions: [
      { label: 'JS 审查', prompt: '审查这段 JavaScript 代码的质量和潜在问题：' },
      { label: 'TS 审查', prompt: '审查这段 TypeScript 代码：' },
      { label: 'Python 审查', prompt: '审查这段 Python 代码：' },
    ],
  },
  {
    id: 'data-analysis',
    name: '数据分析',
    description: 'CSV/JSON 数据可视化与分析',
    icon: '📈',
    gradient: 'from-blue-500 to-cyan-600',
    category: 'tool',
    hasPanel: true,
    quickActions: [
      { label: '数据摘要', prompt: '分析这组数据的统计特征和关键发现：' },
      { label: '趋势分析', prompt: '分析这组数据的变化趋势：' },
    ],
  },
  {
    id: 'cloud-storage',
    name: '云盘管理',
    description: '文件上传/下载/分享一体化',
    icon: '☁️',
    gradient: 'from-sky-500 to-blue-600',
    category: 'tool',
    hasPanel: true,
    quickActions: [
      { label: '上传文件', prompt: '请帮我处理这个文件：' },
      { label: '整理文件', prompt: '帮我整理这些文件资料：' },
    ],
  },
  {
    id: 'screen-share',
    name: '屏幕共享',
    description: '实时屏幕捕获与协作',
    icon: '🖥️',
    gradient: 'from-teal-500 to-emerald-600',
    category: 'tool',
    hasPanel: true,
  },
  {
    id: 'screenshot-question',
    name: '截图问答',
    description: '截屏后 AI 自动识别并解答',
    icon: '🖼️',
    gradient: 'from-amber-500 to-yellow-600',
    category: 'tool',
    hasPanel: true,
  },

  // ── 高级能力 ──
  {
    id: 'deep-search',
    name: '深度搜索',
    description: '多源交叉验证，输出研究报告',
    icon: '🔍',
    gradient: 'from-emerald-500 to-teal-600',
    category: 'advanced',
    skillId: 'deep-search',
    badge: 'PRO',
    hasPanel: true,
    quickActions: [
      { label: '竞品对比', prompt: '深度对比 GPT-4o 和 Claude 3.5 的差异：' },
      { label: '行业研究', prompt: '深度调研 2025 年 AI 行业趋势：' },
      { label: '技术调研', prompt: '调研 Server Actions 最佳实践：' },
    ],
  },
  {
    id: 'academic-search',
    name: '学术搜索',
    description: '论文检索、文献综述、引用管理',
    icon: '📚',
    gradient: 'from-blue-600 to-indigo-700',
    category: 'advanced',
    skillId: 'academic-search',
    hasPanel: true,
    quickActions: [
      { label: '论文检索', prompt: '搜索关于机器学习的最新论文：' },
      { label: '文献综述', prompt: '对以下领域做文献综述：' },
    ],
  },
  {
    id: 'rag',
    name: '知识库 RAG',
    description: '私有知识库构建与检索增强',
    icon: '📦',
    gradient: 'from-purple-600 to-violet-800',
    category: 'advanced',
    badge: 'ADV',
    hasPanel: true,
    quickActions: [
      { label: '创建知识库', prompt: '帮我从这些资料中构建知识库：' },
      { label: '知识问答', prompt: '基于知识库回答：' },
    ],
  },
  {
    id: 'read-document',
    name: '文档阅读',
    description: 'PDF/Word/PPT 全格式解析',
    icon: '📄',
    gradient: 'from-amber-500 to-orange-600',
    category: 'advanced',
    skillId: 'read-document',
    hasPanel: true,
    quickActions: [
      { label: '读 PDF', prompt: '阅读这份 PDF 文件并总结要点：' },
      { label: '读 Word', prompt: '阅读这份 Word 文档：' },
      { label: '读 PPT', prompt: '提取这份 PPT 的所有文字内容：' },
    ],
  },
  {
    id: 'logic-mode',
    name: '思维链模式',
    description: '深度推理与分步验证',
    icon: '🧠',
    gradient: 'from-gray-600 to-slate-800',
    category: 'advanced',
    hasPanel: true,
    quickActions: [
      { label: '数学推理', prompt: '一步步推导这个数学问题：' },
      { label: '逻辑分析', prompt: '逐步分析这个问题的逻辑关系：' },
    ],
  },
]

// 分类配置
const categoryConfig = {
  creative: { label: '✍️ 创作工坊', color: '#8B5CF6', bg: 'from-violet-50/80 to-purple-50/30' },
  media: { label: '🎨 媒体工坊', color: '#EC4899', bg: 'from-pink-50/80 to-fuchsia-50/30' },
  tool: {
    label: '🔧 效率工具',
    color: 'var(--brand-orange)',
    bg: 'from-orange-50/80 to-amber-50/30',
  },
  advanced: { label: '⚡ 高级能力', color: '#7C3AED', bg: 'from-indigo-50/80 to-violet-50/30' },
}

const categoryOrder: Array<'creative' | 'media' | 'tool' | 'advanced'> = [
  'creative',
  'media',
  'tool',
  'advanced',
]

interface NativeCapabilityCenterProps {
  /** 点击能力项回调 */
  onActivate: (capabilityId: string, prompt?: string) => void
  /** 最大展示数量（默认全部） */
  maxItems?: number
}

/** Ollama 连接状态 */
interface OllamaStatus {
  connected: boolean
  modelCount: number
  currentModel: string
  checking: boolean
}

// ═══════════════════════════════════════════
// 能力面板组件 — 每个能力对应的专属交互界面
// ═══════════════════════════════════════════

interface CapabilityPanelProps {
  capability: Capability
  onClose: () => void
  onSendToChat: (content: string) => void
}

const CapabilityPanel: React.FC<CapabilityPanelProps> = ({ capability, onClose, onSendToChat }) => {
  const [input, setInput] = useState('')
  const [output, setOutput] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [file, setFile] = useState<File | null>(null)
  const [isRecording, setIsRecording] = useState(false)
  const [transcripts, setTranscripts] = useState<Array<{ text: string; time: Date }>>([])

  const fileInputRef = useRef<HTMLInputElement>(null)
  const voiceService = VoiceStudioCapability.getInstance()

  // 监听语音服务状态
  useEffect(() => {
    const unsubscribe = voiceService.onStateChange(state => {
      setIsRecording(state.isRecording)
      setTranscripts(state.transcripts)
    })
    return unsubscribe
  }, [])

  const executeCapability = useCallback(async () => {
    if (!input.trim() && !file) return

    setIsLoading(true)
    setError(null)

    try {
      let result = ''

      switch (capability.id) {
        case 'writing':
          result = await WritingCapability.getInstance().execute(input)
          break

        case 'translation':
          result = await TranslationCapability.getInstance().execute(input)
          break

        case 'ppt':
          result = await PPTCapability.getInstance().generateOutline(input)
          break

        case 'image-gen':
          const imgService = ImageGenCapability.getInstance()
          if (file) {
            const reader = new FileReader()
            reader.onload = async () => {
              const imgResult = await imgService.generateFromDescription(input || '生成一张图片')
              setOutput(
                imgResult.success
                  ? `图片已生成：\n\n提示词：${imgResult.prompt}\n\n链接：${imgResult.imageUrl}`
                  : imgResult.error || '生成失败'
              )
            }
            reader.readAsDataURL(file)
          } else {
            const prompt = await imgService.generatePrompt(input)
            setOutput(`优化后的提示词：\n\n${prompt}`)
          }
          break

        case 'video':
          result = await VideoCapability.getInstance().generateScript(input)
          break

        case 'music':
          result = await MusicCapability.getInstance().generateLyrics(input)
          break

        case 'voice-studio':
          if (transcripts.length > 0) {
            const lastTranscript = transcripts[transcripts.length - 1].text
            result = `语音识别结果：\n\n${lastTranscript}\n\n（已识别 ${transcripts.length} 段语音）`
          } else {
            result = '请先录音，然后点击执行'
          }
          break

        case 'code-review':
          if (file) {
            const reader = new FileReader()
            reader.onload = async () => {
              const code = reader.result as string
              const codeResult = await CodeReviewCapability.getInstance().review(code)
              setOutput(codeResult)
            }
            reader.readAsText(file)
          } else {
            result = await CodeReviewCapability.getInstance().review(input)
          }
          break

        case 'data-analysis':
          if (file) {
            const reader = new FileReader()
            reader.onload = async () => {
              const data = reader.result as string
              const dataResult = await DataAnalysisCapability.getInstance().analyze(data)
              setOutput(dataResult)
            }
            reader.readAsText(file)
          } else {
            result = await DataAnalysisCapability.getInstance().analyze(input)
          }
          break

        case 'cloud-storage':
          if (file) {
            const uploadResult = await CloudStorageCapability.getInstance().uploadFile(file)
            result = `文件已上传：\n\n名称：${uploadResult.name}\n大小：${(uploadResult.size / 1024).toFixed(2)} KB\n\n现在可以基于这个文件进行问答或分析`
          } else {
            const files = CloudStorageCapability.getInstance().getFiles()
            result = `云盘中共有 ${files.length} 个文件`
          }
          break

        case 'screen-share':
          const screenStream = await navigator.mediaDevices.getDisplayMedia({ video: true })
          result = '屏幕共享已启动，可以共享屏幕让 AI 进行分析'
          break

        case 'screenshot-question':
          const screenshotService = ScreenshotQuestionCapability.getInstance()
          if (input) {
            result = await screenshotService.analyze(input)
          } else {
            result = '请输入您的问题，然后 AI 将分析当前截取的屏幕内容'
          }
          break

        case 'deep-search':
          result = await ollamaCapabilityService.quickExecute('deep-search', input)
          break

        case 'academic-search':
          result = await ollamaCapabilityService.quickExecute('academic-search', input)
          break

        case 'rag':
          const ragService = RAGCapability.getInstance()
          if (file) {
            const reader = new FileReader()
            reader.onload = async () => {
              const text = reader.result as string
              const chunks = await ragService.buildFromText(text)
              setOutput(
                `已将文档添加到知识库，共 ${chunks} 个知识块\n\n当前知识库共 ${ragService.getEntryCount()} 个条目`
              )
            }
            reader.readAsText(file)
          } else if (input) {
            result = await ragService.query(input)
          }
          break

        case 'read-document':
          const docService = ReadDocumentCapability.getInstance()
          if (file) {
            const reader = new FileReader()
            reader.onload = async () => {
              const content = reader.result as string
              const docResult = await docService.analyze(content)
              setOutput(docResult)
            }
            reader.readAsText(file)
          } else {
            result = await docService.analyze(input)
          }
          break

        case 'logic-mode':
          result = await ollamaCapabilityService.quickExecute('logic-mode', input)
          break

        default:
          result = await ollamaCapabilityService.quickExecute(capability.id as CapabilityId, input)
      }

      if (result) setOutput(prev => (prev ? `${prev}\n\n${result}` : result))
    } catch (err) {
      setError(err instanceof Error ? err.message : '执行失败')
    } finally {
      setIsLoading(false)
    }
  }, [capability.id, input, file, transcripts])

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files?.[0]) {
      setFile(e.target.files[0])
    }
  }

  const toggleRecording = () => {
    if (isRecording) {
      voiceService.stopRecording()
    } else {
      voiceService.startRecording(
        transcript => {
          setInput(prev => prev + transcript)
        },
        error => {
          setError(error)
        }
      )
    }
  }

  const speakOutput = () => {
    if (output) {
      voiceService.speak(output)
    }
  }

  const captureScreenshot = async () => {
    try {
      const screenshotService = ScreenshotQuestionCapability.getInstance()
      const screenshot = await screenshotService.captureScreen()
      if (screenshot) {
        setOutput(prev => (prev ? `${prev}\n\n[截图已捕获]` : '[截图已捕获]'))
      }
    } catch (err) {
      setError('截图失败，请检查浏览器权限')
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-2xl max-h-[85vh] overflow-hidden rounded-2xl bg-[var(--bg-primary)] shadow-2xl border border-[var(--border-light)] animate-in zoom-in-95 duration-300">
        {/* 头部 */}
        <div
          className={`flex items-center justify-between px-6 py-4 border-b border-[var(--border-light)] bg-gradient-to-r ${capability.gradient} to-transparent`}
        >
          <div className="flex items-center gap-3">
            <span className="text-2xl">{capability.icon}</span>
            <div>
              <h3 className="text-[16px] font-bold text-white">{capability.name}</h3>
              <p className="text-[12px] text-white/80">{capability.description}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-full bg-white/20 text-white hover:bg-white/30 transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* 内容区 */}
        <div className="overflow-y-auto p-6 max-h-[calc(85vh-140px)]">
          {/* 输入区域 */}
          <div className="space-y-4">
            {/* 文件上传（部分能力需要） */}
            {[
              'image-gen',
              'code-review',
              'data-analysis',
              'cloud-storage',
              'rag',
              'read-document',
            ].includes(capability.id) && (
              <div className="flex items-center gap-3">
                <input
                  ref={fileInputRef}
                  type="file"
                  onChange={handleFileChange}
                  className="hidden"
                  accept={
                    capability.id === 'image-gen'
                      ? 'image/*'
                      : '.txt,.md,.json,.csv,.pdf,.doc,.docx'
                  }
                />
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="flex items-center gap-2 px-4 py-2 rounded-xl border border-[var(--border-light)] bg-[var(--bg-secondary)] text-[13px] text-[var(--text-secondary)] hover:border-[var(--brand-orange)]/30 hover:text-[var(--brand-orange)] transition-colors"
                >
                  <Upload size={16} />
                  {file ? file.name : '上传文件'}
                </button>
                {file && (
                  <span className="text-[12px] text-[var(--text-tertiary)]">
                    {(file.size / 1024).toFixed(1)} KB
                  </span>
                )}
              </div>
            )}

            {/* 录音按钮（语音工作室） */}
            {capability.id === 'voice-studio' && (
              <div className="flex items-center gap-3">
                <button
                  onClick={toggleRecording}
                  className={`flex items-center gap-2 px-4 py-2 rounded-xl text-white transition-all ${
                    isRecording
                      ? 'bg-red-500 hover:bg-red-600 animate-pulse'
                      : 'bg-gradient-to-r from-[var(--brand-orange)] to-[var(--brand-orange-dark)] hover:shadow-lg hover:shadow-[var(--brand-orange)]/30'
                  }`}
                >
                  {isRecording ? <MicOff size={18} /> : <Mic size={18} />}
                  {isRecording ? '停止录音' : '开始录音'}
                </button>
                {transcripts.length > 0 && (
                  <span className="text-[12px] text-[var(--text-tertiary)]">
                    已识别 {transcripts.length} 段
                  </span>
                )}
              </div>
            )}

            {/* 截图按钮（截图问答） */}
            {capability.id === 'screenshot-question' && (
              <div className="flex items-center gap-3">
                <button
                  onClick={captureScreenshot}
                  className="flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-[var(--brand-orange)] to-[var(--brand-orange-dark)] text-white hover:shadow-lg hover:shadow-[var(--brand-orange)]/30 transition-all"
                >
                  <Camera size={18} />
                  截取屏幕
                </button>
              </div>
            )}

            {/* 文本输入 */}
            <textarea
              value={input}
              onChange={e => setInput(e.target.value)}
              placeholder={`输入您的${capability.name}内容...`}
              className="w-full h-32 px-4 py-3 rounded-xl border border-[var(--border-light)] bg-[var(--bg-secondary)] text-[14px] text-[var(--text-primary)] placeholder:text-[var(--text-disabled)] focus:outline-none focus:border-[var(--brand-orange)]/50 focus:ring-2 focus:ring-[var(--brand-orange)]/20 resize-none transition-all"
            />

            {/* 执行按钮 */}
            <button
              onClick={executeCapability}
              disabled={isLoading || (!input.trim() && !file)}
              className="w-full py-3 rounded-xl bg-gradient-to-r from-[var(--brand-orange)] to-[var(--brand-orange-dark)] text-white font-semibold text-[14px] hover:shadow-lg hover:shadow-[var(--brand-orange)]/30 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2"
            >
              {isLoading ? (
                <>
                  <span className="h-4 w-4 rounded-full border-2 border-white/30 border-t-white animate-spin" />
                  处理中...
                </>
              ) : (
                <>
                  <Sparkles size={18} />
                  执行 {capability.name}
                </>
              )}
            </button>
          </div>

          {/* 错误提示 */}
          {error && (
            <div className="mt-4 p-3 rounded-xl bg-red-50 border border-red-200 text-[13px] text-red-600">
              {error}
            </div>
          )}

          {/* 输出区域 */}
          {output && (
            <div className="mt-6">
              <div className="flex items-center justify-between mb-2">
                <h4 className="text-[14px] font-semibold text-[var(--text-primary)]">执行结果</h4>
                <div className="flex items-center gap-2">
                  <button
                    onClick={speakOutput}
                    className="flex items-center gap-1 px-2 py-1 rounded-lg bg-[var(--bg-secondary)] text-[11px] text-[var(--text-secondary)] hover:text-[var(--brand-orange)] transition-colors"
                  >
                    <Volume2 size={14} />
                    朗读
                  </button>
                  <button
                    onClick={() => navigator.clipboard.writeText(output)}
                    className="flex items-center gap-1 px-2 py-1 rounded-lg bg-[var(--bg-secondary)] text-[11px] text-[var(--text-secondary)] hover:text-[var(--brand-orange)] transition-colors"
                  >
                    复制
                  </button>
                </div>
              </div>
              <div className="p-4 rounded-xl bg-[var(--bg-secondary)] border border-[var(--border-light)]">
                <pre className="text-[13px] text-[var(--text-secondary)] whitespace-pre-wrap leading-relaxed font-mono">
                  {output}
                </pre>
              </div>

              {/* 发送到聊天按钮 */}
              <button
                onClick={() => onSendToChat(output)}
                className="mt-3 w-full py-2.5 rounded-xl border border-[var(--brand-orange)]/30 bg-[var(--brand-orange)]/5 text-[var(--brand-orange)] text-[13px] font-medium hover:bg-[var(--brand-orange)]/10 transition-colors"
              >
                发送到聊天继续对话
              </button>
            </div>
          )}

          {/* 快捷操作 */}
          {capability.quickActions && capability.quickActions.length > 0 && !output && (
            <div className="mt-6">
              <h4 className="text-[14px] font-semibold text-[var(--text-primary)] mb-3">
                快捷操作
              </h4>
              <div className="grid grid-cols-2 gap-2">
                {capability.quickActions.map((action, idx) => (
                  <button
                    key={idx}
                    onClick={() => setInput(action.prompt)}
                    className="p-3 rounded-xl border border-[var(--border-light)] bg-[var(--bg-secondary)] text-[12px] text-[var(--text-secondary)] hover:border-[var(--brand-orange)]/30 hover:text-[var(--brand-orange)] text-left transition-colors"
                  >
                    {action.label}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// ═══════════════════════════════════════════
// 主组件
// ═══════════════════════════════════════════

export const NativeCapabilityCenter: React.FC<NativeCapabilityCenterProps> = ({
  onActivate,
  maxItems,
}) => {
  const { switchToSkill } = useSkillContext()
  const [expandedCategory, setExpandedCategory] = useState<string | null>('creative')
  const [activePanel, setActivePanel] = useState<Capability | null>(null)

  // Ollama 状态
  const [ollamaStatus, setOllamaStatus] = useState<OllamaStatus>({
    connected: false,
    modelCount: 0,
    currentModel: '',
    checking: true,
  })

  // 检测 Ollama 连接状态
  useEffect(() => {
    let cancelled = false

    const checkStatus = async () => {
      try {
        const status = await ollamaCapabilityService.checkConnection()
        if (!cancelled) {
          setOllamaStatus({
            connected: status.connected,
            modelCount: status.modelCount,
            currentModel: status.currentModel,
            checking: false,
          })
        }
      } catch {
        if (!cancelled) {
          setOllamaStatus(prev => ({ ...prev, checking: false }))
        }
      }
    }

    checkStatus()
    // 每 30 秒刷新一次状态
    const interval = setInterval(checkStatus, 30000)
    return () => {
      cancelled = true
      clearInterval(interval)
    }
  }, [])

  // 按分类分组
  const grouped = React.useMemo(() => {
    const map = new Map<(typeof capabilities)[0]['category'], (typeof capabilities)[0][]>()
    for (const cap of capabilities) {
      const list = map.get(cap.category) ?? []
      list.push(cap)
      map.set(cap.category, list)
    }
    return map
  }, [])

  const handleCardClick = useCallback(
    (cap: Capability) => {
      // 如果有专属面板，打开面板
      if (cap.hasPanel) {
        setActivePanel(cap)
        return
      }

      // 如果关联了 SkillPlugin，先切换技能
      if (cap.skillId) {
        switchToSkill(cap.skillId)
      }

      // 如果有快捷操作，使用第一个；否则使用 ID
      const prompt = cap.quickActions?.[0]?.prompt
      onActivate(cap.id, prompt)
    },
    [onActivate, switchToSkill]
  )

  const handleQuickAction = useCallback(
    (e: React.MouseEvent, cap: Capability, action: string) => {
      e.stopPropagation()
      if (cap.hasPanel) {
        setActivePanel(cap)
        return
      }
      if (cap.skillId) {
        switchToSkill(cap.skillId)
      }
      onActivate(cap.id, action)
    },
    [onActivate, switchToSkill]
  )

  const handleSendToChat = useCallback(
    (content: string) => {
      setActivePanel(null)
      onActivate('chat', content)
    },
    [onActivate]
  )

  return (
    <>
      <section className="w-full max-w-[1060px] mx-auto">
        {/* 标题 */}
        <div className="mb-6 flex items-center justify-center gap-4">
          <div className="h-px flex-1 max-w-[140px] bg-gradient-to-r from-transparent to-[var(--border-light)]" />
          <div className="flex items-center gap-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-gradient-to-br from-[var(--brand-orange)]/10 to-[var(--brand-orange)]/5 shadow-sm">
              <svg
                className="h-5 w-5 text-[var(--brand-orange)]"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"
                />
              </svg>
            </div>
            <h2 className="text-[17px] font-bold text-[var(--text-primary)] tracking-tight flex items-center gap-2">
              原生能力中心
              <span className="text-xs font-normal text-[var(--text-tertiary)] ml-1">
                — 核心功能直通
              </span>
            </h2>
          </div>
          <div className="h-px flex-1 max-w-[140px] bg-gradient-to-l from-transparent to-[var(--border-light)]" />

          {/* 本地模型标识 */}
          {ollamaStatus.connected && (
            <div className="absolute right-8 inline-flex items-center gap-1.5 rounded-full bg-gradient-to-r from-emerald-50 to-teal-50 border border-emerald-200 px-3 py-1 shadow-sm">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
              </span>
              <span className="text-[11px] font-medium text-emerald-700">本地 Ollama</span>
            </div>
          )}
        </div>

        {/* 分类折叠手风琴 */}
        <div className="space-y-4">
          {categoryOrder.map(cat => {
            const config = categoryConfig[cat]
            const items = grouped.get(cat) ?? []
            if (!items.length || (maxItems && items.length === 0)) return null

            const isExpanded = expandedCategory === cat

            return (
              <div
                key={cat}
                className="overflow-hidden rounded-2xl border border-[var(--border-light)] bg-[var(--bg-primary)] shadow-[0_2px_12px_rgba(15,23,42,0.04)]"
              >
                {/* 分类头 */}
                <button
                  type="button"
                  onClick={() => setExpandedCategory(isExpanded ? null : cat)}
                  className="w-full flex items-center gap-3 px-5 py-4 text-left hover:bg-[var(--bg-secondary)] transition-colors"
                >
                  {/* 分类图标 */}
                  <div
                    className={`flex h-8 w-8 items-center justify-center rounded-xl bg-gradient-to-br ${config.bg} shadow-sm`}
                  >
                    <span className="text-base" style={{ color: config.color }}>
                      {config.label.slice(0, 2)}
                    </span>
                  </div>
                  <span className="text-[14px] font-semibold" style={{ color: config.color }}>
                    {config.label}
                  </span>
                  <span className="ml-auto text-xs text-[var(--text-disabled)]">
                    {items.length} 项
                  </span>
                  <div
                    className={`flex h-6 w-6 items-center justify-center rounded-lg bg-[var(--bg-secondary)] transition-all duration-200 ${isExpanded ? 'rotate-180 bg-[var(--brand-orange)]/10' : ''}`}
                  >
                    <svg
                      className={`w-3.5 h-3.5 text-[var(--text-secondary)] transition-colors ${isExpanded ? 'text-[var(--brand-orange)]' : ''}`}
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      strokeWidth={2.5}
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                    </svg>
                  </div>
                </button>

                {/* 内容区 */}
                <div
                  className={`${isExpanded ? 'max-h-[1000px] opacity-100' : 'max-h-0 opacity-0'} overflow-hidden transition-all duration-400 ease-out`}
                >
                  <div className="px-5 pb-5 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
                    {items.slice(0, maxItems).map((cap, idx) => (
                      <div
                        key={cap.id}
                        onClick={() => handleCardClick(cap)}
                        className={`group relative cursor-pointer overflow-hidden rounded-xl border border-[var(--border-light)] bg-gradient-to-b from-[var(--bg-primary)] to-[var(--bg-secondary)] p-4
                                   transition-all duration-300 ease-out
                                   hover:-translate-y-1.5 hover:shadow-xl hover:shadow-[var(--brand-orange)]/10 hover:border-[var(--brand-orange)]/30
                                   active:scale-[0.98]
                                   animate-in fade-in slide-in-from-bottom-2`}
                        style={{ animationDelay: `${idx * 50}ms`, animationFillMode: 'backwards' }}
                      >
                        {/* 顶部光泽 */}
                        <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-[var(--brand-orange)]/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />

                        {/* 头部：图标 + 名称 + 徽章 */}
                        <div className="flex items-center gap-3 mb-3">
                          <div
                            className={`relative w-10 h-10 rounded-xl bg-gradient-to-br ${cap.gradient} flex items-center justify-center text-white text-lg shadow-lg shadow-current/20`}
                          >
                            {cap.icon}
                            {/* 图标外发光 */}
                            <div className="absolute inset-0 rounded-xl opacity-0 group-hover:opacity-50 transition-opacity duration-300 bg-white/30 blur-sm" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <span className="text-[14px] font-bold text-[var(--text-primary)] truncate block group-hover:text-[var(--brand-orange)] transition-colors">
                              {cap.name}
                            </span>
                          </div>
                          {cap.badge && (
                            <span className="ml-auto px-2 py-0.5 text-[9px] font-bold rounded-full bg-gradient-to-r from-red-500 to-rose-500 text-white shadow-sm">
                              {cap.badge}
                            </span>
                          )}
                        </div>

                        {/* 描述 */}
                        <p className="text-[12px] leading-relaxed text-[var(--text-secondary)] line-clamp-2 mb-3">
                          {cap.description}
                        </p>

                        {/* 快捷操作预览 */}
                        {cap.quickActions && cap.quickActions.length > 0 && (
                          <div className="flex flex-wrap gap-1.5">
                            {cap.quickActions.slice(0, 2).map((action, i) => (
                              <button
                                key={i}
                                type="button"
                                onClick={e => handleQuickAction(e, cap, action.prompt)}
                                className="truncate max-w-[100px] px-2.5 py-1 rounded-lg bg-[var(--bg-secondary)] text-[11px] text-[var(--text-secondary)] flex items-center gap-1
                                           hover:bg-gradient-to-r hover:from-[var(--brand-orange)]/10 hover:to-[var(--brand-orange)]/5 hover:text-[var(--brand-orange)] transition-all duration-200"
                              >
                                <svg
                                  className="h-2.5 w-2.5 text-[var(--border-medium)] flex-shrink-0"
                                  fill="none"
                                  viewBox="0 0 24 24"
                                  stroke="currentColor"
                                  strokeWidth={2}
                                >
                                  <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    d="M13 7l5 5m0 0l-5 5m5-5H6"
                                  />
                                </svg>
                                {action.label}
                              </button>
                            ))}
                          </div>
                        )}

                        {/* 悬浮遮罩 */}
                        <div className="absolute inset-0 rounded-xl bg-gradient-to-t from-[var(--brand-orange)]/5 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none" />
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )
          })}
        </div>

        {/* 底部提示 */}
        <div className="mt-6 flex items-center justify-center gap-4 text-[12px] text-[var(--text-disabled)]">
          <span className="flex items-center gap-2">
            <svg
              className="h-4 w-4 text-[var(--text-disabled)]"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={1.5}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"
              />
            </svg>
            共 {capabilities.length} 项原生能力
          </span>
          <span className="text-[var(--border-medium)]">|</span>

          {/* Ollama 状态指示器 */}
          {ollamaStatus.checking ? (
            <span className="inline-flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-yellow-400 animate-pulse" />
              <span className="text-yellow-600">检测本地模型...</span>
            </span>
          ) : ollamaStatus.connected ? (
            <span className="inline-flex items-center gap-2 text-emerald-600">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
              </span>
              本地 Ollama 已连接
              <span className="text-[var(--text-disabled)]">·</span>
              <span className="font-mono bg-emerald-50 px-1.5 py-0.5 rounded text-[10px]">
                {ollamaStatus.currentModel || '默认模型'}
              </span>
              <span className="text-[var(--text-disabled)]">·</span>
              <span>{ollamaStatus.modelCount} 个可用</span>
            </span>
          ) : (
            <span className="inline-flex items-center gap-1.5 text-orange-500">
              <span className="h-2 w-2 rounded-full bg-orange-400" />
              本地模型离线 — 请检查 Ollama 服务
            </span>
          )}

          <span className="text-[var(--border-medium)]">|</span>
          <span className="flex items-center gap-1.5">
            <svg
              className="h-3.5 w-3.5 text-[var(--brand-orange)]/50"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M15 15l-2 5L9 9l11 4-5 2zm0 0l5 5M7.188 2.239l.777 2.897M5.136 7.965l-2.898-.777M13.95 4.05l-2.122 2.122m-5.657 5.656l-2.12 2.122"
              />
            </svg>
            点击卡片即可使用
          </span>
        </div>
      </section>

      {/* 能力专属面板 */}
      {activePanel && (
        <CapabilityPanel
          capability={activePanel}
          onClose={() => setActivePanel(null)}
          onSendToChat={handleSendToChat}
        />
      )}
    </>
  )
}

export default NativeCapabilityCenter
