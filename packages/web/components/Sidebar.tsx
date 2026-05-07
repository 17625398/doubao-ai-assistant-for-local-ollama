import { useState, useEffect, useMemo, useRef } from 'react'
import { useChatStore } from '@/stores/chatStore'
import { dbService } from '@/utils/db'

interface SidebarProps {
  isOpen: boolean
  onClose: () => void
  onNewChat: () => void
  onSelectSession?: (sessionId: string) => void
}

// 本地能力状态类型
interface LocalCapabilityStatus {
  ollama: 'unknown' | 'checking' | 'online' | 'offline'
  modelCount: number
  activeModel: string
  importedFileName?: string
  importedFileSize?: number
}

const statusText = {
  unknown: '未检测',
  checking: '检测中',
  online: '在线',
  offline: '离线',
};

// 原生能力数据 - 从 NativeCapabilityCenter 迁移
interface NativeCapability {
  id: string
  name: string
  description: string
  icon: string
  gradient: string
  category: 'creative' | 'media' | 'tool' | 'advanced'
  quickActions?: Array<{ label: string; prompt: string }>
  badge?: string
}

const nativeCapabilities: NativeCapability[] = [
  { id: 'writing', name: '写作助手', description: '邮件/文章/报告/诗歌一键生成', icon: '✍️', gradient: 'from-violet-500 to-purple-600', category: 'creative', quickActions: [{ label: '写邮件', prompt: '帮我写一封专业的商务邮件' }, { label: '写文章', prompt: '帮我写一篇关于人工智能的文章' }, { label: '写周报', prompt: '请把本周工作整理成周报格式' }] },
  { id: 'translation', name: '多语言翻译', description: '支持12+语言互译，保留原文排版', icon: '🌐', gradient: 'from-cyan-500 to-teal-600', category: 'creative', quickActions: [{ label: '中→英', prompt: '翻译以下内容为英文：' }, { label: '日→中', prompt: '翻译以下日文内容：' }] },
  { id: 'ppt', name: 'PPT 生成', description: '输入主题自动生成精美PPT大纲', icon: '📊', gradient: 'from-orange-500 to-red-600', category: 'creative', quickActions: [{ label: '商业PPT', prompt: '生成一份商业计划书PPT大纲' }, { label: '年终总结', prompt: '生成2024年度工作总结PPT' }] },
  { id: 'image-gen', name: '图片生成', description: 'DALL-E 3 / Stable Diffusion 多模型', icon: '🎨', gradient: 'from-fuchsia-500 to-pink-600', category: 'media', badge: 'HOT', quickActions: [{ label: '写实风格', prompt: '生成一张写实风格的图片：' }, { label: '动漫风格', prompt: '生成一张动漫风格的图片：' }] },
  { id: 'video', name: '视频助手', description: 'AI视频脚本生成与分镜', icon: '🎬', gradient: 'from-red-500 to-rose-700', category: 'media', quickActions: [{ label: '短视频', prompt: '生成一个30秒的短视频脚本' }] },
  { id: 'music', name: '音乐创作', description: '智能作曲与编曲建议', icon: '🎵', gradient: 'from-green-500 to-emerald-700', category: 'media', quickActions: [{ label: '流行曲', prompt: '创作一首流行歌曲' }, { label: '轻音乐', prompt: '创作一首轻松的背景音乐' }] },
  { id: 'voice-studio', name: '语音工作室', description: 'ASR语音转文字+TTS文字转语音', icon: '🎤', gradient: 'from-indigo-500 to-purple-700', category: 'media', badge: 'NEW' },
  { id: 'code-review', name: '代码审查', description: '10+语言代码质量分析', icon: '⚙️', gradient: 'from-pink-500 to-rose-600', category: 'tool', quickActions: [{ label: 'JS审查', prompt: '审查这段JavaScript代码：' }, { label: 'Python审查', prompt: '审查这段Python代码：' }] },
  { id: 'data-analysis', name: '数据分析', description: 'CSV/JSON数据可视化与分析', icon: '📈', gradient: 'from-blue-500 to-cyan-600', category: 'tool', quickActions: [{ label: '数据摘要', prompt: '分析这组数据的统计特征' }] },
  { id: 'screenshot-question', name: '截图问答', description: '截屏后AI自动识别并解答', icon: '🖼️', gradient: 'from-amber-500 to-yellow-600', category: 'tool' },
  { id: 'deep-search', name: '深度搜索', description: '多源交叉验证，输出研究报告', icon: '🔍', gradient: 'from-emerald-500 to-teal-600', category: 'advanced', badge: 'PRO', quickActions: [{ label: '竞品对比', prompt: '深度对比GPT-4o和Claude 3.5的差异' }] },
  { id: 'academic-search', name: '学术搜索', description: '论文检索、文献综述、引用管理', icon: '📚', gradient: 'from-blue-600 to-indigo-700', category: 'advanced', quickActions: [{ label: '论文检索', prompt: '搜索关于机器学习的最新论文' }] },
  { id: 'read-document', name: '文档阅读', description: 'PDF/Word/PPT全格式解析', icon: '📄', gradient: 'from-amber-500 to-orange-600', category: 'advanced', quickActions: [{ label: '读PDF', prompt: '阅读这份PDF文件并总结要点' }] },
  { id: 'logic-mode', name: '思维链模式', description: '深度推理与分步验证', icon: '🧠', gradient: 'from-gray-600 to-slate-800', category: 'advanced' },
]

// 分类配置
const categoryConfig = {
  creative: { label: '✍️ 创作工坊', color: '#8B5CF6', bg: 'from-violet-50 to-purple-50' },
  media: { label: '🎨 媒体工坊', color: '#EC4899', bg: 'from-pink-50 to-fuchsia-50' },
  tool: { label: '🔧 效率工具', color: '#F97316', bg: 'from-orange-50 to-amber-50' },
  advanced: { label: '⚡ 高级能力', color: '#7C3AED', bg: 'from-indigo-50 to-violet-50' },
}

// 技能中心数据
const skillCenterData = [
  {
    icon: '🔍',
    title: '搜索',
    description: '实时获取互联网信息并总结回答',
    guides: ['今天有什么重大新闻？', '2024年AI领域有哪些突破？', '解释一下量子计算原理', '帮我查一下明天的天气']
  },
  {
    icon: '🔬',
    title: '深度搜索',
    description: '针对复杂问题进行深度分析和研究',
    guides: ['分析全球经济增长趋势', '解读某项政策的深层影响', '研究某个科学发现的意义', '评估某个投资机会']
  },
  {
    icon: '📚',
    title: '学术搜索',
    description: '搜索学术论文和研究资料',
    guides: ['查找机器学习相关论文', '搜索最近的医学研究进展', '找一些区块链技术文献', '推荐一些深度学习论文']
  },
  {
    icon: '📄',
    title: '文档阅读',
    description: '快速阅读和理解各类文档内容',
    guides: ['帮我总结这篇文档', '提取文档中的关键信息', '解释代码逻辑', '分析报告的主要内容']
  },
  {
    icon: '✍️',
    title: '写作助手',
    description: '辅助各类写作任务，提升写作效率',
    guides: ['帮我写一封商务邮件', '润色这篇文章', '写一个产品介绍', '创作一个故事开头']
  },
  {
    icon: '🌐',
    title: '翻译',
    description: '支持多语言互译，准确流畅',
    guides: ['翻译这段英文到中文', '把中文翻译成日语', '解释这句英文的意思', '校对英文翻译']
  },
  {
    icon: '💻',
    title: '代码编写',
    description: '编写和调试各类编程代码',
    guides: ['写一个Python爬虫', '帮我优化这段代码', '解释这段代码的作用', '写一个排序算法']
  },
  {
    icon: '🎨',
    title: '图片生成',
    description: '根据描述生成精美图片',
    guides: ['生成一张风景图片', '画一个可爱的卡通形象', '创建一张海报背景', '设计一个logo']
  },
  {
    icon: '🎬',
    title: '视频助手',
    description: '辅助视频创作和脚本编写',
    guides: ['写一个短视频脚本', '帮我策划视频内容', '设计视频开场']
  },
  {
    icon: '📑',
    title: 'PPT生成',
    description: '快速生成专业演示文稿',
    guides: ['生成一个项目汇报PPT', '创建培训课件模板', '制作产品介绍PPT']
  },
  {
    icon: '🎵',
    title: '音乐生成',
    description: '创作原创音乐和配乐',
    guides: ['生成一段轻音乐', '创作背景配乐', '制作广告音乐']
  },
]

// 格式化相对时间
const formatRelativeTime = (timestamp: number): string => {
  const now = Date.now()
  const diff = now - timestamp
  const oneDay = 24 * 60 * 60 * 1000
  const oneWeek = 7 * oneDay

  if (diff < oneDay) {
    return '今天'
  } else if (diff < 2 * oneDay) {
    return '昨天'
  } else if (diff < oneWeek) {
    return `${Math.floor(diff / oneDay)} 天前`
  } else if (diff < 30 * oneDay) {
    return `${Math.floor(diff / oneWeek)} 周前`
  } else {
    return new Date(timestamp).toLocaleDateString('zh-CN', {
      month: 'short',
      day: 'numeric'
    })
  }
}

type SavedSessions = ReturnType<typeof useChatStore.getState>['savedSessions']

// 会话分组
interface GroupedSessions {
  pinned: SavedSessions
  today: SavedSessions
  yesterday: SavedSessions
  thisWeek: SavedSessions
  thisMonth: SavedSessions
  older: SavedSessions
}

const groupSessions = (sessions: SavedSessions) => {
  const now = Date.now()
  const oneDay = 24 * 60 * 60 * 1000
  const twoDays = 2 * oneDay
  const oneWeek = 7 * oneDay
  const oneMonth = 30 * oneDay

  const grouped: GroupedSessions = {
    pinned: [],
    today: [],
    yesterday: [],
    thisWeek: [],
    thisMonth: [],
    older: []
  }

  sessions.forEach(session => {
    const diff = now - session.timestamp

    if (session.isPinned) {
      grouped.pinned.push(session)
    } else if (diff < oneDay) {
      grouped.today.push(session)
    } else if (diff < twoDays) {
      grouped.yesterday.push(session)
    } else if (diff < oneWeek) {
      grouped.thisWeek.push(session)
    } else if (diff < oneMonth) {
      grouped.thisMonth.push(session)
    } else {
      grouped.older.push(session)
    }
  })

  return grouped
}

export function Sidebar({ isOpen, onClose, onNewChat, onSelectSession }: SidebarProps) {
  const [activeSession, setActiveSession] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [isSearching, setIsSearching] = useState(false)
  const [filteredSessions, setFilteredSessions] = useState<string[]>([])
  
  // 原生能力中心状态
  const [showNativeCapability, setShowNativeCapability] = useState(false)
  const [expandedCategory, setExpandedCategory] = useState<string | null>('creative')
  const [localStatus, setLocalStatus] = useState<LocalCapabilityStatus>({
    ollama: 'unknown',
    modelCount: 0,
    activeModel: '-',
  })
  const fileInputRef = useRef<HTMLInputElement>(null)

  // 从 chatStore 获取会话数据
  const savedSessions = useChatStore(state => state.savedSessions)
  const activeSessionId = useChatStore(state => state.activeSessionId)
  const refreshSessions = useChatStore(state => state.refreshSessions)
  const setActiveSessionId = useChatStore(state => state.setActiveSessionId)
  const setActiveMessages = useChatStore(state => state.setActiveMessages)
  const updateAndPersistSessions = useChatStore(state => state.updateAndPersistSessions)

  // 加载会话数据
  useEffect(() => {
    refreshSessions()
  }, [refreshSessions])

  // 搜索会话
  useEffect(() => {
    const searchSessions = async () => {
      if (!searchQuery.trim()) {
        setFilteredSessions([])
        return
      }
      const results = await dbService.searchSessions(searchQuery)
      setFilteredSessions(results)
    }
    searchSessions()
  }, [searchQuery])

  // 根据搜索结果过滤会话
  const displayedSessions = useMemo(() => {
    if (searchQuery.trim() && filteredSessions.length > 0) {
      return savedSessions.filter(s => filteredSessions.includes(s.id))
    }
    return savedSessions
  }, [savedSessions, searchQuery, filteredSessions])

  // 分组会话
  const groupedSessions = useMemo(() => {
    return groupSessions(displayedSessions)
  }, [displayedSessions])

  // 设置当前会话并加载消息
  const handleSessionClick = async (sessionId: string) => {
    setActiveSession(sessionId)
    setActiveSessionId(sessionId)

    // 从 IndexedDB 加载会话消息
    const session = await dbService.getSession(sessionId)
    if (session) {
      setActiveMessages(session.messages || [])
    }

    if (onSelectSession) {
      onSelectSession(sessionId)
    }

    if (window.innerWidth < 768) {
      onClose()
    }
  }

  const handleNewChat = () => {
    setActiveSession(null)
    setActiveSessionId(null)
    setActiveMessages([])
    onNewChat()
    if (window.innerWidth < 768) {
      onClose()
    }
  }

  // 删除单个会话
  const handleDeleteSession = async (e: React.MouseEvent, sessionId: string) => {
    e.stopPropagation()
    if (confirm('确定要删除这个会话吗？')) {
      await dbService.deleteSession(sessionId)
      updateAndPersistSessions(sessions => sessions.filter(s => s.id !== sessionId))
      if (activeSession === sessionId) {
        handleNewChat()
      }
    }
  }

  // 清空所有会话
  const handleClearAll = async () => {
    if (confirm('确定要清空所有会话记录吗？此操作无法撤销。')) {
      for (const session of savedSessions) {
        await dbService.deleteSession(session.id)
      }
      updateAndPersistSessions(() => [])
      handleNewChat()
    }
  }

  // 切换会话置顶状态
  const handleTogglePin = async (e: React.MouseEvent, sessionId: string) => {
    e.stopPropagation()
    updateAndPersistSessions(sessions =>
      sessions.map(s =>
        s.id === sessionId ? { ...s, isPinned: !s.isPinned } : s
      )
    )
  }

  // 本地能力中心操作
  const handleInspectLocal = async () => {
    setLocalStatus(prev => ({ ...prev, ollama: 'checking' }))
    try {
      const response = await fetch('/api/ollama/api/tags')
      if (response.ok) {
        const data = await response.json()
        setLocalStatus(prev => ({
          ...prev,
          ollama: 'online',
          modelCount: data.models?.length || 0,
          activeModel: data.models?.[0]?.name || '-',
        }))
      } else {
        setLocalStatus(prev => ({ ...prev, ollama: 'offline', modelCount: 0 }))
      }
    } catch {
      setLocalStatus(prev => ({ ...prev, ollama: 'offline', modelCount: 0 }))
    }
  }

  const handleImportFile = () => {
    fileInputRef.current?.click()
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      setLocalStatus(prev => ({
        ...prev,
        importedFileName: file.name,
        importedFileSize: file.size,
      }))
    }
  }

  const handleOpenSettings = () => {
    window.dispatchEvent(new CustomEvent('open-settings'))
    setShowNativeCapability(false)
  }

  // 渲染分组标题
  const renderGroupHeader = (title: string, count: number) => {
    if (count === 0) return null
    return (
      <div className="px-3 py-2">
        <span className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider flex items-center gap-2">
          <span className="w-1 h-1 rounded-full bg-gray-300"></span>
          {title} ({count})
        </span>
      </div>
    )
  }

  // 渲染会话列表项
  const renderSessionItem = (session: ReturnType<typeof useChatStore.getState>['savedSessions'][0]) => {
    const isActive = activeSessionId === session.id
    return (
      <li key={session.id}>
        <div className="group relative">
          <button
            onClick={() => handleSessionClick(session.id)}
            className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-left text-sm transition-colors ${
              isActive
                ? 'bg-blue-50 text-blue-600'
                : 'text-gray-700 hover:bg-gray-50'
            }`}
          >
            <div className="flex items-center gap-3 min-w-0 flex-1">
              {/* 置顶图标 */}
              {session.isPinned && (
                <svg
                  className="w-4 h-4 flex-shrink-0 text-amber-500"
                  fill="currentColor"
                  viewBox="0 0 20 20"
                >
                  <path d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
                </svg>
              )}
              {/* 未置顶的图标 */}
              {!session.isPinned && (
                <svg
                  className="w-4 h-4 flex-shrink-0"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
                  />
                </svg>
              )}
              <span className="truncate flex-1">{session.title || '新对话'}</span>
            </div>
            <span className="text-xs text-gray-400 ml-2 flex-shrink-0">
              {formatRelativeTime(session.timestamp)}
            </span>
          </button>

          {/* 操作按钮 - 悬停时显示 */}
          <div className="absolute right-2 top-1/2 -translate-y-1/2 hidden group-hover:flex items-center gap-1 bg-white shadow-sm rounded-md p-0.5">
            <button
              onClick={(e) => handleTogglePin(e, session.id)}
              className="p-1.5 rounded hover:bg-gray-100 text-gray-500 hover:text-amber-500 transition-colors"
              title={session.isPinned ? '取消置顶' : '置顶'}
            >
              <svg
                className="w-4 h-4"
                fill={session.isPinned ? 'currentColor' : 'none'}
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z"
                />
              </svg>
            </button>
            <button
              onClick={(e) => handleDeleteSession(e, session.id)}
              className="p-1.5 rounded hover:bg-red-50 text-gray-500 hover:text-red-500 transition-colors"
              title="删除"
            >
              <svg
                className="w-4 h-4"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                />
              </svg>
            </button>
          </div>
        </div>
      </li>
    )
  }

  const hasSessions = displayedSessions.length > 0

  return (
    <>
      {/* 遮罩层 */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/30 z-40 md:hidden"
          onClick={onClose}
        />
      )}

      {/* 侧边栏 - 豆包App原生宽度 240px */}
      <aside
        className={`fixed md:relative w-60 h-full bg-gradient-to-b from-white to-gray-50 border-r border-gray-100 flex flex-col z-50 transition-all duration-300 shadow-lg ${
          isOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0 md:hidden'
        }`}
      >
        {/* 顶部标题栏 - 优化设计 */}
        <div className="px-4 py-3 flex items-center justify-between border-b border-gray-100 bg-white/80 backdrop-blur-sm">
          <div className="flex items-center gap-2.5">
            <div className="relative">
              <div className="absolute inset-0 bg-gradient-to-br from-orange-400 to-orange-600 rounded-xl blur-md opacity-40"></div>
              <div className="relative w-8 h-8 rounded-xl bg-gradient-to-br from-orange-400 to-orange-600 flex items-center justify-center shadow-md">
                <span className="text-sm font-bold text-white">豆</span>
              </div>
            </div>
            <div className="flex flex-col">
              <span className="text-sm font-bold text-gray-800">豆包 AI</span>
              <span className="text-[10px] text-gray-400">智能助手</span>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-orange-50 text-gray-400 hover:text-orange-500 transition-all duration-200 active:scale-95"
            title={isOpen ? "收起侧边栏" : "展开侧边栏"}
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16"/>
            </svg>
          </button>
        </div>

        {/* 可滚动内容区域 */}
        <div className="flex-1 overflow-y-auto scrollbar-thin scrollbar-thumb-gray-200 scrollbar-track-transparent">
          {/* 导航菜单 - 简洁风格 */}
          <div className="px-2 py-2">
            <ul className="space-y-0.5">
              <li>
                <button className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-left text-[13px] text-gray-900 font-medium bg-gray-50 transition-all duration-200">
                  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                    <path d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"/>
                  </svg>
                  <span className="flex-1">豆包</span>
                </button>
              </li>
              <li>
                <button className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-left text-[13px] text-gray-600 hover:bg-gray-50 transition-all duration-200 group">
                  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                    <circle cx="12" cy="12" r="10"/>
                    <path d="M2 12h20M12 2a15.3 15.3 0 014 10 15.3 15.3 0 01-4 10 15.3 15.3 0 01-4-10 15.3 15.3 0 014-10z"/>
                  </svg>
                  <span className="flex-1">AI 浏览器</span>
                  <svg className="w-3.5 h-3.5 text-gray-400 group-hover:text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7"/>
                  </svg>
                </button>
              </li>
              <li>
                <button className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-left text-[13px] text-gray-600 hover:bg-gray-50 transition-all duration-200 group">
                  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                    <path d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707"/>
                    <circle cx="12" cy="12" r="4"/>
                  </svg>
                  <span className="flex-1">AI 创作</span>
                  <svg className="w-3.5 h-3.5 text-gray-400 group-hover:text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7"/>
                  </svg>
                </button>
              </li>
              <li>
                <button className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-left text-[13px] text-gray-600 hover:bg-gray-50 transition-all duration-200 group">
                  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                    <path d="M3 15a4 4 0 004 4h9a5 5 0 10-.1-9.999 5.002 5.002 0 10-9.78 2.096A4.001 4.001 0 003 15z"/>
                  </svg>
                  <span className="flex-1">云盘</span>
                  <svg className="w-3.5 h-3.5 text-gray-400 group-hover:text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7"/>
                  </svg>
                </button>
              </li>
              <li>
                <button className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-left text-[13px] text-gray-600 hover:bg-gray-50 transition-all duration-200 group">
                  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                    <rect x="3" y="3" width="7" height="7"/>
                    <rect x="14" y="3" width="7" height="7"/>
                    <rect x="14" y="14" width="7" height="7"/>
                    <rect x="3" y="14" width="7" height="7"/>
                  </svg>
                  <span className="flex-1">更多</span>
                  <svg className="w-3.5 h-3.5 text-gray-400 group-hover:text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7"/>
                  </svg>
                </button>
              </li>
            </ul>
          </div>

          {/* 分隔线 */}
          <div className="mx-3 h-px bg-gray-100"></div>

          {/* 功能列表 */}
          <div className="px-2 py-2">
            <ul className="space-y-0.5">
              <li>
                <button 
                  onClick={() => setShowNativeCapability(!showNativeCapability)}
                  className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-left text-[13px] transition-all duration-200 ${
                    showNativeCapability 
                      ? 'text-gray-900 bg-gray-50 font-medium' 
                      : 'text-gray-600 hover:bg-gray-50'
                  }`}
                >
                  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                    <path d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"/>
                  </svg>
                  <span className="flex-1">发现智能体</span>
                  <svg 
                    className={`w-3.5 h-3.5 text-gray-400 transition-transform duration-200 ${showNativeCapability ? 'rotate-90' : ''}`} 
                    fill="none" stroke="currentColor" viewBox="0 0 24 24"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7"/>
                  </svg>
                </button>
              </li>
            </ul>
          </div>

          {/* 能力中心 - 折叠手风琴 */}
          {showNativeCapability && (
            <div className="px-3 pb-3 animate-in slide-in-from-top-2 duration-200">
              <div className="space-y-2">
                {(['creative', 'media', 'tool', 'advanced'] as const).map(cat => {
                  const config = categoryConfig[cat]
                  const items = nativeCapabilities.filter(c => c.category === cat)
                  const isExpanded = expandedCategory === cat
                  
                  return (
                    <div key={cat} className="overflow-hidden rounded-xl border border-gray-100 bg-white shadow-sm">
                      {/* 分类头 */}
                      <button
                        type="button"
                        onClick={() => setExpandedCategory(isExpanded ? null : cat)}
                        className="w-full flex items-center gap-2.5 px-3 py-2.5 text-left hover:bg-gray-50 transition-colors"
                      >
                        <div className={`flex h-7 w-7 items-center justify-center rounded-lg bg-gradient-to-br ${config.bg} shadow-sm`}>
                          <span className="text-xs" style={{ color: config.color }}>{config.label.slice(0, 2)}</span>
                        </div>
                        <span className="text-[12px] font-semibold" style={{ color: config.color }}>
                          {config.label}
                        </span>
                        <span className="ml-auto text-[10px] text-gray-400">{items.length} 项</span>
                        <div className={`flex h-5 w-5 items-center justify-center rounded bg-gray-100 transition-all duration-200 ${isExpanded ? 'rotate-180 bg-orange-100' : ''}`}>
                          <svg className={`w-3 h-3 text-gray-500 transition-colors ${isExpanded ? 'text-orange-500' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                          </svg>
                        </div>
                      </button>
                      
                      {/* 内容区 */}
                      <div className={`${isExpanded ? 'max-h-[500px] opacity-100' : 'max-h-0 opacity-0'} overflow-hidden transition-all duration-300 ease-out`}>
                        <div className="px-3 pb-3 grid grid-cols-1 gap-2">
                          {items.map((cap, idx) => (
                            <div
                              key={cap.id}
                              onClick={() => window.dispatchEvent(new CustomEvent('open-capability', { detail: cap }))}
                              className="group relative cursor-pointer overflow-hidden rounded-lg border border-gray-50 bg-gradient-to-b from-white to-gray-50/50 p-2.5 transition-all duration-300 ease-out hover:-translate-y-0.5 hover:shadow-md hover:shadow-orange-500/10 hover:border-orange-200 active:scale-[0.98] animate-in fade-in slide-in-from-bottom-2"
                              style={{ animationDelay: `${idx * 50}ms` }}
                            >
                              <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-orange-400/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                              <div className="flex items-center gap-2.5">
                                <div className={`relative w-8 h-8 rounded-lg bg-gradient-to-br ${cap.gradient} flex items-center justify-center text-sm shadow-md flex-shrink-0 group-hover:scale-110 transition-transform duration-200`}>
                                  {cap.icon}
                                  {cap.badge && (
                                    <span className="absolute -top-1 -right-1 px-1 py-0.5 text-[6px] font-bold rounded-full bg-red-500 text-white shadow-sm">
                                      {cap.badge}
                                    </span>
                                  )}
                                </div>
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center gap-1.5 mb-0.5">
                                    <span className="text-[11px] font-bold text-gray-800 truncate group-hover:text-orange-500 transition-colors">{cap.name}</span>
                                  </div>
                                  <p className="text-[9px] leading-relaxed text-gray-500 line-clamp-1">{cap.description}</p>
                                  {cap.quickActions && cap.quickActions.length > 0 && (
                                    <div className="flex flex-wrap gap-1 mt-1.5">
                                      {cap.quickActions.slice(0, 2).map((action, i) => (
                                        <button
                                          key={i}
                                          type="button"
                                          onClick={(e) => { e.stopPropagation(); window.dispatchEvent(new CustomEvent('send-prompt', { detail: action.prompt })) }}
                                          className="truncate max-w-[80px] px-1.5 py-0.5 rounded bg-gray-50 text-[8px] text-gray-500 hover:bg-orange-50 hover:text-orange-500 transition-colors flex items-center gap-0.5"
                                        >
                                          <svg className="h-2 w-2 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M13 7l5 5m0 0l-5 5m5-5H6" /></svg>
                                          {action.label}
                                        </button>
                                      ))}
                                    </div>
                                  )}
                                </div>
                              </div>
                              <div className="absolute inset-0 rounded-lg bg-gradient-to-t from-orange-500/5 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none" />
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  )
                })}

                {/* 底部：Ollama 状态 */}
                <div className="flex items-center justify-center gap-2 text-[10px] text-gray-400 pt-1">
                  <span className="flex items-center gap-1">
                    <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                    </svg>
                    {nativeCapabilities.length} 项能力
                  </span>
                  <span className="text-gray-300">|</span>
                  {localStatus.ollama === 'online' ? (
                    <span className="flex items-center gap-1 text-emerald-600">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                      本地在线
                    </span>
                  ) : localStatus.ollama === 'checking' ? (
                    <span className="flex items-center gap-1 text-amber-600">⏳ 检测中</span>
                  ) : (
                    <span className="flex items-center gap-1 text-orange-500">○ 离线</span>
                  )}
                  <span className="text-gray-300">|</span>
                  <span className="flex items-center gap-1">
                    <svg className="h-3 w-3 text-orange-400/50" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M15 15l-2 5L9 9l11 4-5 2zm0 0l5 5M7.188 2.239l.777 2.897M5.136 7.965l-2.898-.777M13.95 4.05l-2.122 2.122m-5.657 5.656l-2.12 2.122" />
                    </svg>
                    点击使用
                  </span>
                </div>
                {/* 重新检测按钮 */}
                <button
                  onClick={handleInspectLocal}
                  className="w-full py-1.5 rounded-lg bg-gray-50 text-[10px] text-gray-500 hover:bg-gray-100 transition-colors flex items-center justify-center gap-1"
                >
                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                  {localStatus.ollama === 'checking' ? '检测中...' : '刷新本地状态'}
                </button>
              </div>
            </div>
          )}

          {/* 快捷功能 */}
          <div className="px-2 py-3 border-t border-gray-100">
            <div className="grid grid-cols-4 gap-2">
              <button
                onClick={() => window.dispatchEvent(new CustomEvent('open-quick-tools'))}
                className="flex flex-col items-center gap-1.5 px-2 py-2.5 rounded-xl bg-white hover:bg-gradient-to-br hover:from-orange-50 hover:to-orange-50/50 border border-gray-100 hover:border-orange-200 shadow-sm hover:shadow-md transition-all duration-200 active:scale-95"
              >
                <span className="text-lg">🔍</span>
                <span className="text-[10px] text-gray-600 text-center font-medium">搜索</span>
              </button>
              <button
                onClick={() => window.dispatchEvent(new CustomEvent('open-screenshot-question'))}
                className="flex flex-col items-center gap-1.5 px-2 py-2.5 rounded-xl bg-white hover:bg-gradient-to-br hover:from-blue-50 hover:to-blue-50/50 border border-gray-100 hover:border-blue-200 shadow-sm hover:shadow-md transition-all duration-200 active:scale-95"
              >
                <span className="text-lg">📄</span>
                <span className="text-[10px] text-gray-600 text-center font-medium">文档</span>
              </button>
              <button
                onClick={() => window.dispatchEvent(new CustomEvent('open-ai-creation'))}
                className="flex flex-col items-center gap-1.5 px-2 py-2.5 rounded-xl bg-white hover:bg-gradient-to-br hover:from-purple-50 hover:to-purple-50/50 border border-gray-100 hover:border-purple-200 shadow-sm hover:shadow-md transition-all duration-200 active:scale-95"
              >
                <span className="text-lg">✍️</span>
                <span className="text-[10px] text-gray-600 text-center font-medium">写作</span>
              </button>
              <button
                onClick={() => window.dispatchEvent(new CustomEvent('open-translation'))}
                className="flex flex-col items-center gap-1.5 px-2 py-2.5 rounded-xl bg-white hover:bg-gradient-to-br hover:from-green-50 hover:to-green-50/50 border border-gray-100 hover:border-green-200 shadow-sm hover:shadow-md transition-all duration-200 active:scale-95"
              >
                <span className="text-lg">🌐</span>
                <span className="text-[10px] text-gray-600 text-center font-medium">翻译</span>
              </button>
              <button
                onClick={() => window.dispatchEvent(new CustomEvent('open-code-review'))}
                className="flex flex-col items-center gap-1.5 px-2 py-2.5 rounded-xl bg-white hover:bg-gradient-to-br hover:from-cyan-50 hover:to-cyan-50/50 border border-gray-100 hover:border-cyan-200 shadow-sm hover:shadow-md transition-all duration-200 active:scale-95"
              >
                <span className="text-lg">💻</span>
                <span className="text-[10px] text-gray-600 text-center font-medium">代码</span>
              </button>
              <button
                onClick={() => window.dispatchEvent(new CustomEvent('open-image-gen'))}
                className="flex flex-col items-center gap-1.5 px-2 py-2.5 rounded-xl bg-white hover:bg-gradient-to-br hover:from-pink-50 hover:to-pink-50/50 border border-gray-100 hover:border-pink-200 shadow-sm hover:shadow-md transition-all duration-200 active:scale-95"
              >
                <span className="text-lg">🎨</span>
                <span className="text-[10px] text-gray-600 text-center font-medium">图片</span>
              </button>
              <button
                onClick={() => window.dispatchEvent(new CustomEvent('open-summary'))}
                className="flex flex-col items-center gap-1.5 px-2 py-2.5 rounded-xl bg-white hover:bg-gradient-to-br hover:from-amber-50 hover:to-amber-50/50 border border-gray-100 hover:border-amber-200 shadow-sm hover:shadow-md transition-all duration-200 active:scale-95"
              >
                <span className="text-lg">📑</span>
                <span className="text-[10px] text-gray-600 text-center font-medium">PPT</span>
              </button>
              <button
                onClick={() => window.dispatchEvent(new CustomEvent('open-data-analysis'))}
                className="flex flex-col items-center gap-1.5 px-2 py-2.5 rounded-xl bg-white hover:bg-gradient-to-br hover:from-indigo-50 hover:to-indigo-50/50 border border-gray-100 hover:border-indigo-200 shadow-sm hover:shadow-md transition-all duration-200 active:scale-95"
              >
                <span className="text-lg">📚</span>
                <span className="text-[10px] text-gray-600 text-center font-medium">学术</span>
              </button>
            </div>
          </div>

          {/* 历史对话 */}
          <div className="flex-1 overflow-y-auto">
            {/* 搜索框 */}
            <div className="p-3 pb-2">
              <div className="relative group">
                <div className="absolute inset-0 bg-gradient-to-r from-orange-400 to-orange-500 rounded-xl blur-sm opacity-0 group-focus-within:opacity-20 transition-opacity"></div>
                <div className="relative">
                  <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 group-focus-within:text-orange-500 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    onFocus={() => setIsSearching(true)}
                    onBlur={() => !searchQuery && setIsSearching(false)}
                    placeholder="搜索历史对话..."
                    className="w-full pl-9 pr-8 py-2.5 text-sm bg-white border border-gray-200 rounded-xl group-focus-within:border-orange-300 group-focus-within:ring-2 group-focus-within:ring-orange-500/20 transition-all shadow-sm"
                  />
                  {searchQuery && (
                    <button
                      onClick={() => {
                        setSearchQuery('')
                        setIsSearching(false)
                      }}
                      className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 hover:bg-gray-100 rounded-full transition-colors"
                    >
                      <svg className="w-3.5 h-3.5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* 分组标题和清空按钮 */}
            <div className="flex items-center justify-between px-4 pb-2">
              <h3 className="text-xs font-semibold text-gray-500">
                {isSearching ? `🔍 搜索结果 (${displayedSessions.length})` : '📝 历史对话'}
              </h3>
              {!isSearching && hasSessions && (
                <button
                  onClick={handleClearAll}
                  className="text-xs text-red-500 hover:text-red-600 hover:bg-red-50 px-2.5 py-1 rounded-lg transition-colors font-medium"
                >
                  🗑️ 清空
                </button>
              )}
            </div>

            {/* 会话列表 */}
            <div className="px-3 pb-3 space-y-1">
              {/* 空状态 */}
              {!hasSessions && (
                <div className="py-12 text-center">
                  <div className="relative inline-block mb-4">
                    <div className="absolute inset-0 bg-gradient-to-br from-gray-100 to-gray-200 rounded-2xl blur-sm"></div>
                    <div className="relative w-20 h-20 mx-auto rounded-2xl bg-gradient-to-br from-gray-50 to-white flex items-center justify-center shadow-lg border border-gray-100">
                      <svg className="w-10 h-10 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                      </svg>
                    </div>
                  </div>
                  <p className="text-sm text-gray-400 font-medium">
                    {isSearching ? '没有找到匹配的对话' : '暂无历史对话'}
                  </p>
                  {!isSearching && (
                    <button
                      onClick={handleNewChat}
                      className="mt-4 text-sm font-semibold text-orange-500 hover:text-orange-600 hover:bg-orange-50 px-4 py-2 rounded-xl transition-colors shadow-sm"
                    >
                      ✨ 开始新对话
                    </button>
                  )}
                </div>
              )}

              {/* 置顶会话 */}
              {groupedSessions.pinned.length > 0 && (
                <>
                  {renderGroupHeader('📌 置顶', groupedSessions.pinned.length)}
                  {groupedSessions.pinned.map(renderSessionItem)}
                </>
              )}

              {/* 今天 */}
              {groupedSessions.today.length > 0 && (
                <>
                  {renderGroupHeader('今天', groupedSessions.today.length)}
                  {groupedSessions.today.map(renderSessionItem)}
                </>
              )}

              {/* 昨天 */}
              {groupedSessions.yesterday.length > 0 && (
                <>
                  {renderGroupHeader('昨天', groupedSessions.yesterday.length)}
                  {groupedSessions.yesterday.map(renderSessionItem)}
                </>
              )}

              {/* 本周 */}
              {groupedSessions.thisWeek.length > 0 && (
                <>
                  {renderGroupHeader('本周', groupedSessions.thisWeek.length)}
                  {groupedSessions.thisWeek.map(renderSessionItem)}
                </>
              )}

              {/* 本月 */}
              {groupedSessions.thisMonth.length > 0 && (
                <>
                  {renderGroupHeader('本月', groupedSessions.thisMonth.length)}
                  {groupedSessions.thisMonth.map(renderSessionItem)}
                </>
              )}

              {/* 更早 */}
              {groupedSessions.older.length > 0 && (
                <>
                  {renderGroupHeader('更早', groupedSessions.older.length)}
                  {groupedSessions.older.map(renderSessionItem)}
                </>
              )}
            </div>
          </div>
        </div>

        {/* 底部用户区域 - 简洁风格 */}
        <div className="px-3 py-3 border-t border-gray-100">
          <div className="flex items-center gap-3 px-2 py-1.5 rounded-lg hover:bg-gray-50 transition-all duration-200 cursor-pointer">
            <div className="relative flex-shrink-0">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-orange-400 text-white text-sm font-bold shadow-sm">
                豆
              </div>
            </div>
            <div className="flex flex-col flex-1 min-w-0">
              <span className="text-[13px] font-medium text-gray-800">用户昵称</span>
            </div>
            <button
              onClick={() => window.dispatchEvent(new CustomEvent('open-settings'))}
              className="rounded-lg p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-all duration-200"
              title="设置"
            >
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <circle cx="12" cy="12" r="3"/>
                <path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z"/>
              </svg>
            </button>
          </div>
        </div>
      </aside>
    </>
  )
}
