import React, { useState, useRef } from 'react'
import { useAutoAnimate } from '@formkit/auto-animate/react'
import { SavedChatSession, ChatGroup } from '@/types'
import { useI18n } from '@/contexts/I18nContext'
import { SessionItem } from './SessionItem'
import { GroupItem, type SessionItemPassedProps } from './GroupItem'
import {
  Search,
  Settings,
  MessageSquare,
  Globe,
  Sparkles,
  Cloud,
  MoreHorizontal,
  HardDrive,
  Target,
  FileText,
  PenTool,
  Code,
  BookOpen,
  User,
  Wifi,
  ChevronDown,
  ChevronRight,
  X,
  Upload,
  Cpu,
} from 'lucide-react'
import { AppLogo } from '@/components/icons/AppLogo'
import { IconSidebarToggle, IconNewChat } from '@/components/icons/CustomIcons'
import { useHistorySidebarLogic } from '@/hooks/chat/useHistorySidebarLogic'

interface HistorySidebarProps {
  isOpen: boolean
  onToggle: () => void
  sessions: SavedChatSession[]
  groups: ChatGroup[]
  activeSessionId: string | null
  loadingSessionIds: Set<string>
  generatingTitleSessionIds: Set<string>
  onSelectSession: (sessionId: string) => void
  onNewChat: () => void
  onDeleteSession: (sessionId: string) => void
  onRenameSession: (sessionId: string, newTitle: string) => void
  onTogglePinSession: (sessionId: string) => void
  onDuplicateSession: (sessionId: string) => void
  onOpenExportModal: () => void
  onAddNewGroup: () => void
  onDeleteGroup: (groupId: string) => void
  onRenameGroup: (groupId: string, newTitle: string) => void
  onMoveSessionToGroup: (sessionId: string, groupId: string | null) => void
  onToggleGroupExpansion: (groupId: string) => void
  onOpenSettingsModal: () => void
  themeId: string
  newChatShortcut: string
  onNavigate?: (section: string) => void
  onQuickAction?: (action: string) => void
}

interface NavItemProps {
  icon: React.ElementType
  label: string
  isActive?: boolean
  onClick?: () => void
  hasSubmenu?: boolean
  isExpanded?: boolean
  onToggleExpand?: () => void
  badge?: string | number
}

interface LocalCapabilityStatus {
  ollama: 'unknown' | 'checking' | 'online' | 'offline'
  modelCount: number
  activeModel: string
  importedFileName?: string
  importedFileSize?: number
}

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

const statusText = {
  unknown: '未检测',
  checking: '检测中',
  online: '在线',
  offline: '离线',
}

const nativeCapabilities: NativeCapability[] = [
  {
    id: 'writing',
    name: '写作助手',
    description: '邮件/文章/报告/诗歌一键生成',
    icon: '✍️',
    gradient: 'from-violet-500 to-purple-600',
    category: 'creative',
    badge: '',
    quickActions: [
      { label: '写邮件', prompt: '帮我写一封专业的商务邮件' },
      { label: '写文章', prompt: '帮我写一篇关于人工智能的文章' },
      { label: '写周报', prompt: '请把本周工作整理成周报格式' },
    ],
  },
  {
    id: 'translation',
    name: '多语言翻译',
    description: '支持12+语言互译',
    icon: '🌐',
    gradient: 'from-cyan-500 to-teal-600',
    category: 'creative',
    quickActions: [
      { label: '中→英', prompt: '翻译以下内容为英文：' },
      { label: '日→中', prompt: '翻译以下日文内容：' },
    ],
  },
  {
    id: 'ppt',
    name: 'PPT 生成',
    description: '输入主题自动生成PPT大纲',
    icon: '📊',
    gradient: 'from-orange-500 to-red-600',
    category: 'creative',
    quickActions: [
      { label: '商业PPT', prompt: '生成一份商业计划书PPT大纲' },
      { label: '年终总结', prompt: '生成2024年度工作总结PPT' },
    ],
  },
  {
    id: 'image-gen',
    name: '图片生成',
    description: 'DALL-E/Stable Diffusion多模型',
    icon: '🎨',
    gradient: 'from-fuchsia-500 to-pink-600',
    category: 'media',
    badge: 'HOT',
    quickActions: [
      { label: '写实风格', prompt: '生成一张写实风格的图片：' },
      { label: '动漫风格', prompt: '生成一张动漫风格的图片：' },
    ],
  },
  {
    id: 'video',
    name: '视频助手',
    description: 'AI视频脚本生成与分镜',
    icon: '🎬',
    gradient: 'from-red-500 to-rose-700',
    category: 'media',
    quickActions: [{ label: '短视频', prompt: '生成一个30秒的短视频脚本：' }],
  },
  {
    id: 'music',
    name: '音乐创作',
    description: '智能作曲与编曲建议',
    icon: '🎵',
    gradient: 'from-green-500 to-emerald-700',
    category: 'media',
    quickActions: [
      { label: '流行曲', prompt: '创作一首流行歌曲：' },
      { label: '轻音乐', prompt: '创作一首轻松的背景音乐：' },
    ],
  },
  {
    id: 'voice-studio',
    name: '语音工作室',
    description: 'ASR语音转文字+TTS文字转语音',
    icon: '🎤',
    gradient: 'from-indigo-500 to-purple-700',
    category: 'media',
    badge: 'NEW',
  },
  {
    id: 'code-review',
    name: '代码审查',
    description: '10+语言代码质量分析',
    icon: '⚙️',
    gradient: 'from-pink-500 to-rose-600',
    category: 'tool',
    quickActions: [
      { label: 'JS审查', prompt: '审查这段JavaScript代码：' },
      { label: 'Python审查', prompt: '审查这段Python代码：' },
    ],
  },
  {
    id: 'data-analysis',
    name: '数据分析',
    description: 'CSV/JSON数据可视化与分析',
    icon: '📈',
    gradient: 'from-blue-500 to-cyan-600',
    category: 'tool',
    quickActions: [{ label: '数据摘要', prompt: '分析这组数据的统计特征：' }],
  },
  {
    id: 'screenshot-question',
    name: '截图问答',
    description: '截屏后AI自动识别并解答',
    icon: '🖼️',
    gradient: 'from-amber-500 to-yellow-600',
    category: 'tool',
  },
  {
    id: 'deep-search',
    name: '深度搜索',
    description: '多源交叉验证，输出研究报告',
    icon: '🔍',
    gradient: 'from-emerald-500 to-teal-600',
    category: 'advanced',
    badge: 'PRO',
    quickActions: [{ label: '竞品对比', prompt: '深度对比GPT-4o和Claude 3.5的差异：' }],
  },
  {
    id: 'academic-search',
    name: '学术搜索',
    description: '论文检索、文献综述、引用管理',
    icon: '📚',
    gradient: 'from-blue-600 to-indigo-700',
    category: 'advanced',
    quickActions: [{ label: '论文检索', prompt: '搜索关于机器学习的最新论文：' }],
  },
  {
    id: 'read-document',
    name: '文档阅读',
    description: 'PDF/Word/PPT全格式解析',
    icon: '📄',
    gradient: 'from-amber-500 to-orange-600',
    category: 'advanced',
    quickActions: [{ label: '读PDF', prompt: '阅读这份PDF文件并总结要点：' }],
  },
  {
    id: 'logic-mode',
    name: '思维链模式',
    description: '深度推理与分步验证',
    icon: '🧠',
    gradient: 'from-gray-600 to-slate-800',
    category: 'advanced',
  },
]

const categoryConfig = {
  creative: { label: '✍️ 创作工坊', color: '#8B5CF6', bg: 'from-violet-50 to-purple-50' },
  media: { label: '🎨 媒体工坊', color: '#EC4899', bg: 'from-pink-50 to-fuchsia-50' },
  tool: { label: '🔧 效率工具', color: '#F97316', bg: 'from-orange-50 to-amber-50' },
  advanced: { label: '⚡ 高级能力', color: '#7C3AED', bg: 'from-indigo-50 to-violet-50' },
}

const skillCenterData = [
  {
    icon: '🔍',
    title: '搜索',
    description: '实时获取互联网信息并总结回答',
    color: 'from-blue-500 to-cyan-500',
    guides: [
      '今天有什么重大新闻？',
      '2024年AI领域有哪些突破？',
      '解释一下量子计算原理',
      '帮我查一下明天的天气',
    ],
  },
  {
    icon: '🔬',
    title: '深度搜索',
    description: '针对复杂问题进行深度分析和研究',
    color: 'from-emerald-500 to-teal-500',
    guides: [
      '分析全球经济增长趋势',
      '解读某项政策的深层影响',
      '研究某个科学发现的意义',
      '评估某个投资机会',
    ],
  },
  {
    icon: '📚',
    title: '学术搜索',
    description: '搜索学术论文和研究资料',
    color: 'from-indigo-500 to-purple-500',
    guides: [
      '查找机器学习相关论文',
      '搜索最近的医学研究进展',
      '找一些区块链技术文献',
      '推荐一些深度学习论文',
    ],
  },
  {
    icon: '📄',
    title: '文档阅读',
    description: '快速阅读和理解各类文档内容',
    color: 'from-amber-500 to-orange-500',
    guides: ['帮我总结这篇文档', '提取文档中的关键信息', '解释代码逻辑', '分析报告的主要内容'],
  },
  {
    icon: '✍️',
    title: '写作助手',
    description: '辅助各类写作任务，提升写作效率',
    color: 'from-violet-500 to-purple-600',
    guides: ['帮我写一封商务邮件', '润色这篇文章', '写一个产品介绍', '创作一个故事开头'],
  },
  {
    icon: '🌐',
    title: '翻译',
    description: '支持多语言互译，准确流畅',
    color: 'from-cyan-500 to-teal-600',
    guides: ['翻译这段英文到中文', '把中文翻译成日语', '解释这句英文的意思', '校对英文翻译'],
  },
  {
    icon: '💻',
    title: '代码编写',
    description: '编写和调试各类编程代码',
    color: 'from-orange-500 to-red-600',
    guides: ['写一个Python爬虫', '帮我优化这段代码', '解释这段代码的作用', '写一个排序算法'],
  },
  {
    icon: '🎨',
    title: '图片生成',
    description: '根据描述生成精美图片',
    color: 'from-fuchsia-500 to-pink-600',
    guides: ['生成一张风景图片', '画一个可爱的卡通形象', '创建一张海报背景', '设计一个logo'],
  },
]

const NavItem: React.FC<NavItemProps> = ({
  icon: Icon,
  label,
  isActive = false,
  onClick,
  hasSubmenu = false,
  isExpanded = false,
  onToggleExpand,
  badge,
}) => (
  <button
    onClick={hasSubmenu ? onToggleExpand : onClick}
    className={`w-full flex items-center gap-2.5 px-3 py-2 text-xs font-medium rounded-lg transition-all duration-200 group relative ${
      isActive
        ? 'bg-[var(--theme-bg-accent)] text-[var(--theme-text-link)]'
        : 'text-[var(--theme-text-secondary)] hover:bg-[var(--theme-bg-tertiary)] hover:text-[var(--theme-text-primary)]'
    }`}
  >
    <Icon
      size={16}
      strokeWidth={2}
      className={`flex-shrink-0 transition-colors ${
        isActive
          ? 'text-[var(--theme-text-link)]'
          : 'text-[var(--theme-icon-history)] group-hover:text-[var(--theme-text-primary)]'
      }`}
    />
    <span className="flex-1 text-left truncate">{label}</span>
    {badge && (
      <span className="px-1.5 py-0.5 text-[9px] font-semibold bg-[var(--brand-orange)] text-white rounded">
        {badge}
      </span>
    )}
    {hasSubmenu && (
      <ChevronRight
        size={12}
        strokeWidth={2}
        className={`transition-transform duration-200 ${isExpanded ? 'rotate-90' : ''}`}
      />
    )}
  </button>
)

const QuickActionButton = ({
  icon: Icon,
  label,
  onClick,
}: {
  icon: React.ElementType
  label: string
  onClick?: () => void
}) => (
  <button
    onClick={onClick}
    className="flex flex-col items-center justify-center gap-1 p-2 rounded-xl hover:bg-[var(--theme-bg-tertiary)] transition-colors group"
    title={label}
  >
    <Icon
      size={22}
      strokeWidth={1.8}
      className="text-[var(--theme-icon-history)] group-hover:text-[var(--theme-brand-primary)] transition-colors"
    />
  </button>
)

// Internal component to handle auto-animate for a list of sessions in a category
const SessionListGroup = ({
  title,
  sessions,
  sessionItemProps,
}: {
  title: string
  sessions: SavedChatSession[]
  sessionItemProps: SessionItemPassedProps
}) => {
  const [parent] = useAutoAnimate<HTMLUListElement>({ duration: 200 })
  return (
    <div>
      <div className="px-4 pt-4 pb-1 text-xs font-semibold uppercase tracking-wider text-[var(--theme-text-tertiary)]">
        {title}
      </div>
      <ul ref={parent}>
        {sessions.map(session => (
          <SessionItem key={session.id} session={session} {...sessionItemProps} />
        ))}
      </ul>
    </div>
  )
}

export const HistorySidebar: React.FC<HistorySidebarProps> = props => {
  const { t } = useI18n()
  const [skillCenterOpen, setSkillCenterOpen] = useState(false)
  const [localCapabilityOpen, setLocalCapabilityOpen] = useState(false)
  const [activeNav, setActiveNav] = useState('doubao')
  const [localStatus, setLocalStatus] = useState<LocalCapabilityStatus>({
    ollama: 'unknown',
    modelCount: 0,
    activeModel: '-',
  })
  const [showNativeCapabilities, setShowNativeCapabilities] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const {
    isOpen,
    onToggle,
    sessions,
    groups,
    activeSessionId,
    loadingSessionIds,
    generatingTitleSessionIds,
    onOpenExportModal,
    onAddNewGroup,
    onDeleteGroup,
    onToggleGroupExpansion,
    themeId,
    onNewChat,
    onDeleteSession,
    onTogglePinSession,
    onDuplicateSession,
    onOpenSettingsModal,
    onRenameSession,
    onRenameGroup,
    onMoveSessionToGroup,
    onSelectSession,
    newChatShortcut,
    onNavigate,
    onQuickAction,
  } = props

  const handleNavigate = (section: string) => {
    setActiveNav(section)
    if (onNavigate) {
      onNavigate(section)
    }
  }

  const handleQuickAction = (action: string) => {
    if (onQuickAction) {
      onQuickAction(action)
    }
  }

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
    setLocalCapabilityOpen(false)
  }

  const {
    searchQuery,
    setSearchQuery,
    isSearching,
    setIsSearching,
    editingItem,
    setEditingItem,
    activeMenu,
    setActiveMenu,
    dragOverId,
    setDragOverId,
    newlyTitledSessionId,
    menuRef,
    editInputRef,
    sessionsByGroupId,
    sortedGroups,
    categorizedUngroupedSessions,
    handleStartEdit,
    handleRenameConfirm,
    handleRenameKeyDown,
    toggleMenu,
    handleDragStart,
    handleDragOver,
    handleDrop,
    handleMainDragLeave,
    handleMiniSearchClick,
    handleEmptySpaceClick,
    handleSessionSelect,
  } = useHistorySidebarLogic({
    onToggle,
    sessions,
    groups,
    generatingTitleSessionIds,
    onRenameSession,
    onRenameGroup,
    onMoveSessionToGroup,
    onSelectSession,
  })

  const ungroupedSessions = sessionsByGroupId.get(null) || []
  const pinnedUngrouped = ungroupedSessions.filter(s => s.isPinned)
  const { categories, categoryOrder } = categorizedUngroupedSessions

  const sessionItemSharedProps = {
    activeSessionId,
    editingItem,
    activeMenu,
    loadingSessionIds,
    generatingTitleSessionIds,
    newlyTitledSessionId,
    editInputRef,
    menuRef,
    onSelectSession: handleSessionSelect,
    onTogglePinSession,
    onDeleteSession,
    onDuplicateSession,
    onOpenExportModal,
    handleStartEdit: (item: SavedChatSession) => handleStartEdit('session', item),
    handleRenameConfirm,
    handleRenameKeyDown,
    setEditingItem,
    toggleMenu,
    setActiveMenu,
    handleDragStart,
    t,
  }

  const [listParentRef] = useAutoAnimate<HTMLDivElement>({ duration: 200 })

  return (
    <aside
      className={`h-full flex flex-col ${themeId === 'onyx' ? 'bg-[var(--theme-bg-primary)]' : 'bg-[var(--theme-bg-secondary)]'} flex-shrink-0
                 transition-all duration-300 ease-[cubic-bezier(0.19,1,0.22,1)] md:transition-[width] transform-gpu
                 absolute md:static top-0 left-0 z-50
                 overflow-hidden
                 ${isOpen ? 'w-72 lg:w-80 translate-x-0' : 'w-72 md:w-[72px] -translate-x-full md:translate-x-0'}
                 
                 border-r border-[var(--theme-border-primary)]`}
      role="complementary"
      aria-label={t('history_title')}
    >
      {/* ========== 区域1: 顶部标题栏 ========== */}
      <div
        aria-hidden={!isOpen}
        className={`w-72 lg:w-80 h-full flex flex-col shrink-0 min-w-[18rem] lg:min-w-[20rem] md:absolute md:inset-0 transition-opacity duration-200 ${
          isOpen
            ? 'opacity-100 pointer-events-auto'
            : 'opacity-100 pointer-events-auto md:opacity-0 md:pointer-events-none'
        }`}
      >
        {/* Header */}
        <div className="p-3 sm:p-4 flex items-center justify-between flex-shrink-0 border-b border-[var(--theme-border-secondary)]">
          <a
            href="/"
            className="flex items-center gap-2.5 no-underline hover:opacity-80 transition-opacity"
          >
            <AppLogo className="h-7 w-auto" />
            <span className="text-base font-bold text-[var(--theme-text-primary)]">豆包 AI</span>
          </a>
          <button
            onClick={onToggle}
            className="p-2 text-[var(--theme-icon-history)] hover:bg-[var(--theme-bg-tertiary)] rounded-lg transition-colors"
            aria-label={t('historySidebarClose')}
          >
            <IconSidebarToggle size={20} strokeWidth={2} />
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto custom-scrollbar">
          {/* ========== 区域2: 导航菜单 ========== */}
          <nav className="px-2 py-2 space-y-0.5">
            <NavItem
              icon={MessageSquare}
              label="豆包"
              isActive={activeNav === 'doubao'}
              onClick={() => handleNavigate('doubao')}
            />
            <NavItem
              icon={Globe}
              label="AI 浏览器"
              isActive={activeNav === 'browser'}
              onClick={() => handleNavigate('browser')}
            />
            <NavItem
              icon={Sparkles}
              label="AI 创作"
              isActive={activeNav === 'creation'}
              onClick={() => handleNavigate('creation')}
            />
            <NavItem
              icon={Cloud}
              label="云盘"
              isActive={activeNav === 'cloud'}
              onClick={() => handleNavigate('cloud')}
            />
            <NavItem
              icon={MoreHorizontal}
              label="更多"
              isActive={activeNav === 'more'}
              onClick={() => handleNavigate('more')}
            />
            <NavItem
              icon={HardDrive}
              label="本地能力"
              hasSubmenu={true}
              isExpanded={localCapabilityOpen}
              onToggleExpand={() => setLocalCapabilityOpen(!localCapabilityOpen)}
            />
            <NavItem
              icon={Target}
              label="技能中心"
              hasSubmenu={true}
              isExpanded={skillCenterOpen}
              onToggleExpand={() => setSkillCenterOpen(!skillCenterOpen)}
              badge="8"
            />

            {/* ========== 区域5: 本地能力展开面板 ========== */}
            {localCapabilityOpen && (
              <div className="ml-0 mt-1 px-2 animate-fade-in-up">
                <div className="rounded-xl border border-[var(--theme-border-secondary)] bg-[var(--theme-bg-primary)] p-3 shadow-sm">
                  <div className="flex items-center gap-2 mb-3">
                    <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center shadow-sm">
                      <Cpu size={14} className="text-white" strokeWidth={2} />
                    </div>
                    <h3 className="text-xs font-semibold text-[var(--theme-text-primary)]">
                      本地能力中心
                    </h3>
                  </div>

                  <div className="grid grid-cols-2 gap-2 mb-3">
                    <div className="rounded-lg bg-[var(--theme-bg-secondary)] p-2 border border-[var(--theme-border-light)]">
                      <div className="flex items-center gap-1.5 mb-0.5">
                        <span
                          className={`w-1.5 h-1.5 rounded-full ${
                            localStatus.ollama === 'online'
                              ? 'bg-green-500'
                              : localStatus.ollama === 'checking'
                                ? 'bg-amber-500'
                                : 'bg-gray-400'
                          }`}
                        />
                        <div className="text-[9px] text-[var(--theme-text-tertiary)] font-medium">
                          Ollama
                        </div>
                      </div>
                      <div
                        className={`text-[11px] font-bold ${
                          localStatus.ollama === 'online'
                            ? 'text-green-600'
                            : localStatus.ollama === 'checking'
                              ? 'text-amber-600'
                              : 'text-[var(--theme-text-secondary)]'
                        }`}
                      >
                        {statusText[localStatus.ollama]}
                      </div>
                    </div>
                    <div className="rounded-lg bg-[var(--theme-bg-secondary)] p-2 border border-[var(--theme-border-light)]">
                      <div className="flex items-center gap-1.5 mb-0.5">
                        <span className="w-1.5 h-1.5 rounded-full bg-purple-400"></span>
                        <div className="text-[9px] text-[var(--theme-text-tertiary)] font-medium">
                          模型数量
                        </div>
                      </div>
                      <div className="text-[11px] font-bold text-[var(--theme-text-primary)]">
                        {localStatus.modelCount}
                      </div>
                    </div>
                  </div>

                  <div className="rounded-lg bg-[var(--theme-bg-secondary)] p-2 border border-[var(--theme-border-light)] mb-3">
                    <div className="flex items-center gap-1.5 mb-0.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-amber-400"></span>
                      <div className="text-[9px] text-[var(--theme-text-tertiary)] font-medium">
                        当前模型
                      </div>
                    </div>
                    <div className="text-[10px] font-semibold text-[var(--theme-text-primary)] truncate">
                      {localStatus.activeModel}
                    </div>
                  </div>

                  {localStatus.importedFileName && (
                    <div className="mb-3 rounded-lg bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-900/20 dark:to-purple-900/20 px-2 py-1.5 border border-blue-100/50 dark:border-blue-800/30">
                      <div className="text-[9px] text-blue-600 dark:text-blue-400 font-medium flex items-center gap-1.5">
                        <Upload size={9} />
                        已导入：{localStatus.importedFileName}
                      </div>
                    </div>
                  )}

                  <div className="flex gap-2 mb-3">
                    <button
                      onClick={handleInspectLocal}
                      disabled={localStatus.ollama === 'checking'}
                      className="flex-1 rounded-lg bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 px-2 py-1.5 text-[10px] font-semibold text-white shadow-sm hover:shadow transition-all duration-200 disabled:opacity-50"
                    >
                      {localStatus.ollama === 'checking' ? '检测中...' : '🔍 检测模型'}
                    </button>
                    <button
                      onClick={handleImportFile}
                      className="flex-1 rounded-lg bg-[var(--theme-bg-secondary)] border border-[var(--theme-border-secondary)] px-2 py-1.5 text-[10px] font-semibold text-[var(--theme-text-primary)] hover:bg-[var(--theme-bg-hover)] transition-all duration-200"
                    >
                      📁 导入文件
                    </button>
                  </div>

                  <button
                    onClick={() => setShowNativeCapabilities(!showNativeCapabilities)}
                    className={`w-full rounded-lg px-2 py-2 text-[10px] font-medium transition-all duration-200 ${
                      showNativeCapabilities
                        ? 'bg-[var(--theme-brand-primary)]/10 text-[var(--theme-text-link)] border border-[var(--theme-brand-primary)]/20'
                        : 'bg-[var(--theme-bg-secondary)] text-[var(--theme-text-secondary)] border border-[var(--theme-border-light)] hover:bg-[var(--theme-bg-hover)]'
                    }`}
                  >
                    <span className="flex items-center justify-center gap-1.5">
                      <Sparkles size={12} strokeWidth={2} />
                      原生能力中心
                      <ChevronRight
                        size={12}
                        strokeWidth={2}
                        className={`transition-transform duration-200 ${showNativeCapabilities ? 'rotate-90' : ''}`}
                      />
                    </span>
                  </button>

                  <input
                    ref={fileInputRef}
                    type="file"
                    className="hidden"
                    accept=".txt,.md,.json,.csv,.log,.ts,.tsx,.js,.jsx,.css,.html,.xml,.yaml,.yml"
                    onChange={handleFileChange}
                  />

                  {showNativeCapabilities && (
                    <div className="mt-2 space-y-2 max-h-[250px] overflow-y-auto custom-scrollbar pr-1 animate-fade-in-up">
                      {(Object.keys(categoryConfig) as Array<keyof typeof categoryConfig>).map(
                        category => {
                          const capabilities = nativeCapabilities.filter(
                            c => c.category === category
                          )
                          if (capabilities.length === 0) return null

                          const config = categoryConfig[category]

                          return (
                            <div key={category}>
                              <div className="text-[10px] font-semibold text-[var(--theme-text-secondary)] mb-1.5 flex items-center gap-1">
                                <span>{config.label}</span>
                                <span
                                  className="w-1 h-1 rounded-full"
                                  style={{ backgroundColor: config.color }}
                                ></span>
                              </div>
                              <div className="space-y-1">
                                {capabilities.map(cap => (
                                  <button
                                    key={cap.id}
                                    onClick={() => handleQuickAction(`native-${cap.id}`)}
                                    className="w-full group flex items-center gap-2 px-2 py-1.5 rounded-lg bg-[var(--theme-bg-secondary)] border border-[var(--theme-border-light)] hover:border-[var(--theme-border-focus)] hover:bg-[var(--theme-bg-hover)] transition-all duration-150 text-left"
                                  >
                                    <span className="text-sm w-5 h-5 flex items-center justify-center rounded-md bg-gradient-to-br ${cap.gradient} shadow-sm flex-shrink-0">
                                      {cap.icon}
                                    </span>
                                    <div className="flex-1 min-w-0">
                                      <div className="flex items-center gap-1">
                                        <span className="text-[10px] font-medium text-[var(--theme-text-primary)] truncate">
                                          {cap.name}
                                        </span>
                                        {cap.badge && (
                                          <span
                                            className={`px-1 py-0 text-[8px] font-bold rounded ${
                                              cap.badge === 'HOT'
                                                ? 'bg-red-500 text-white'
                                                : cap.badge === 'NEW'
                                                  ? 'bg-green-500 text-white'
                                                  : cap.badge === 'PRO'
                                                    ? 'bg-purple-500 text-white'
                                                    : 'bg-gray-200 text-gray-600'
                                            }`}
                                          >
                                            {cap.badge}
                                          </span>
                                        )}
                                      </div>
                                    </div>
                                    <ChevronRight
                                      size={12}
                                      className="text-[var(--theme-text-tertiary)] opacity-0 group-hover:opacity-100 transition-opacity"
                                      strokeWidth={2}
                                    />
                                  </button>
                                ))}
                              </div>
                            </div>
                          )
                        }
                      )}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* ========== 区域4: 技能中心展开面板 ========== */}
            {skillCenterOpen && (
              <div className="ml-0 mt-1 px-2 animate-fade-in-up">
                <div className="rounded-xl border border-[var(--theme-border-secondary)] bg-[var(--theme-bg-primary)] p-3 shadow-sm">
                  <div className="flex items-center gap-2 mb-3">
                    <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center shadow-sm">
                      <Target size={14} className="text-white" strokeWidth={2} />
                    </div>
                    <h3 className="text-xs font-semibold text-[var(--theme-text-primary)]">
                      技能中心
                    </h3>
                    <span className="ml-auto px-1.5 py-0.5 text-[9px] font-bold bg-violet-100 dark:bg-violet-900/30 text-violet-600 dark:text-violet-400 rounded-full">
                      8 项
                    </span>
                  </div>

                  <div className="relative mb-2">
                    <Search
                      size={12}
                      className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[var(--theme-text-tertiary)]"
                    />
                    <input
                      type="text"
                      placeholder="搜索技能..."
                      className="w-full pl-8 pr-2.5 py-2 text-xs bg-[var(--theme-bg-secondary)] border border-[var(--theme-border-light)] rounded-lg focus:outline-none focus:border-[var(--theme-brand-primary)] focus:ring-1 focus:ring-[var(--theme-brand-primary)]/20 transition-all"
                    />
                  </div>

                  <div className="space-y-1.5 max-h-[280px] overflow-y-auto custom-scrollbar pr-1">
                    {skillCenterData.map((skill, index) => (
                      <button
                        key={skill.title}
                        onClick={() => handleQuickAction(`skill-${skill.title}`)}
                        className={`w-full group text-left rounded-lg p-2 transition-all duration-200 ${
                          index === 0
                            ? 'bg-gradient-to-r from-blue-50 to-cyan-50 dark:from-blue-900/20 dark:to-cyan-900/20 border border-blue-100 dark:border-blue-800/30'
                            : 'bg-[var(--theme-bg-secondary)] border border-[var(--theme-border-light)] hover:border-[var(--theme-border-focus)] hover:bg-[var(--theme-bg-hover)]'
                        }`}
                      >
                        <div className="flex items-start gap-2">
                          <span className="text-base w-6 h-6 flex items-center justify-center rounded-md bg-gradient-to-br ${skill.color} shadow-sm flex-shrink-0 mt-0.5">
                            {skill.icon}
                          </span>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-1.5 mb-0.5">
                              <span className="text-[11px] font-semibold text-[var(--theme-text-primary)]">
                                {skill.title}
                              </span>
                              <ChevronRight
                                size={12}
                                strokeWidth={2}
                                className="text-[var(--theme-text-tertiary)] opacity-0 group-hover:opacity-100 transition-opacity ml-auto flex-shrink-0"
                              />
                            </div>
                            <p className="text-[10px] text-[var(--theme-text-tertiary)] mb-1 leading-relaxed">
                              {skill.description}
                            </p>
                            <div className="grid grid-cols-2 gap-1">
                              {skill.guides.slice(0, 2).map((guide, i) => (
                                <span
                                  key={i}
                                  className="text-[9px] text-[var(--theme-text-secondary)] bg-[var(--theme-bg-primary)] px-1.5 py-0.5 rounded truncate"
                                >
                                  · {guide}
                                </span>
                              ))}
                            </div>
                          </div>
                        </div>
                      </button>
                    ))}
                  </div>

                  <div className="mt-2 pt-2 border-t border-[var(--theme-border-secondary)]">
                    <div className="flex items-center justify-between text-[9px] text-[var(--theme-text-tertiary)]">
                      <span>💡 点击卡片快速使用</span>
                      <span className="flex items-center gap-1">
                        <span className="w-1 h-1 rounded-full bg-green-400"></span>
                        全部可用
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </nav>

          {/* ========== 区域6: 历史对话搜索和列表 ========== */}
          <div className="px-3 pb-2">
            {/* Search Bar */}
            {isSearching ? (
              <div className="flex items-center gap-2 w-full px-3 py-2 text-sm bg-[var(--theme-bg-primary)] border border-[var(--theme-border-focus)] rounded-xl shadow-sm">
                <Search
                  size={16}
                  className="text-[var(--theme-icon-history)] flex-shrink-0"
                  strokeWidth={2}
                />
                <input
                  type="text"
                  placeholder={t('history_search_placeholder') || '搜索历史对话...'}
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  className="w-full bg-transparent border-0 py-0 text-sm focus:ring-0 outline-none text-[var(--theme-text-primary)] placeholder:text-[var(--theme-text-tertiary)]"
                  autoFocus
                  onKeyDown={e => {
                    if (e.key === 'Escape') setIsSearching(false)
                  }}
                />
                <button
                  onClick={() => {
                    setIsSearching(false)
                    setSearchQuery('')
                  }}
                  className="h-5 w-5 flex items-center justify-center text-[var(--theme-icon-history)] hover:text-[var(--theme-text-primary)] rounded-md hover:bg-[var(--theme-bg-tertiary)]"
                >
                  <X size={12} strokeWidth={2} />
                </button>
              </div>
            ) : (
              <button
                onClick={() => setIsSearching(true)}
                className="flex items-center gap-2 w-full px-3 py-2 text-sm text-[var(--theme-text-tertiary)] hover:text-[var(--theme-text-secondary)] hover:bg-[var(--theme-bg-tertiary)] rounded-xl transition-colors"
              >
                <Search size={16} strokeWidth={2} />
                <span>{t('history_search_button') || '搜索历史对话...'}</span>
              </button>
            )}

            {/* Session List */}
            <div
              className="mt-2 overflow-y-auto max-h-[calc(100vh-580px)] custom-scrollbar"
              onClick={handleEmptySpaceClick}
            >
              {sessions.length === 0 && !searchQuery ? (
                <p className="p-4 text-xs text-center text-[var(--theme-text-tertiary)]">
                  {t('history_empty')}
                </p>
              ) : (
                <div
                  ref={listParentRef}
                  onDragOver={handleDragOver}
                  onDrop={e => handleDrop(e, 'all-conversations')}
                  onDragEnter={() => setDragOverId('all-conversations')}
                  onDragLeave={handleMainDragLeave}
                  className={`rounded-lg transition-colors min-h-[50px] ${
                    dragOverId === 'all-conversations'
                      ? 'bg-[var(--theme-bg-accent)] bg-opacity-10 ring-2 ring-[var(--theme-bg-accent)] ring-inset ring-opacity-50'
                      : ''
                  }`}
                >
                  {sortedGroups.map(group => (
                    <GroupItem
                      key={group.id}
                      group={group}
                      sessions={sessionsByGroupId.get(group.id) || []}
                      dragOverId={dragOverId}
                      onToggleGroupExpansion={onToggleGroupExpansion}
                      handleGroupStartEdit={item => handleStartEdit('group', item)}
                      handleDrop={handleDrop}
                      handleDragOver={handleDragOver}
                      setDragOverId={setDragOverId}
                      onDeleteGroup={onDeleteGroup}
                      {...sessionItemSharedProps}
                    />
                  ))}

                  {pinnedUngrouped.length > 0 && (
                    <SessionListGroup
                      title={t('history_pinned')}
                      sessions={pinnedUngrouped}
                      sessionItemProps={sessionItemSharedProps}
                    />
                  )}

                  {categoryOrder.map(categoryName => (
                    <SessionListGroup
                      key={categoryName}
                      title={categoryName}
                      sessions={categories[categoryName]}
                      sessionItemProps={sessionItemSharedProps}
                    />
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* ========== 区域7: 底部用户区域 ========== */}
        <div className="px-3 py-2 border-t border-[var(--theme-border-secondary)] bg-[var(--theme-bg-secondary)]/50">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-full bg-gradient-to-br from-[var(--brand-orange)] to-[var(--brand-orange-dark)] flex items-center justify-center shadow-sm flex-shrink-0">
              <User size={14} strokeWidth={2} className="text-white" />
            </div>
            <span className="text-xs font-medium text-[var(--theme-text-primary)] truncate">
              用户
            </span>
            <button
              onClick={onOpenSettingsModal}
              className="ml-auto p-1.5 text-[var(--theme-icon-history)] hover:bg-[var(--theme-bg-tertiary)] rounded-lg transition-colors"
              title={t('settingsTitle')}
            >
              <Settings size={14} strokeWidth={2} />
            </button>
          </div>
        </div>
      </div>

      {/* Collapsed Sidebar Icons (Desktop Only) */}
      <div
        aria-hidden={isOpen}
        className={`hidden md:flex absolute inset-0 flex-col items-center py-4 h-full gap-4 w-full min-w-[72px] cursor-pointer hover:bg-[var(--theme-bg-tertiary)]/30 transition-colors transition-opacity duration-200 ${
          isOpen ? 'opacity-0 pointer-events-none' : 'opacity-100 pointer-events-auto'
        }`}
        onClick={onToggle}
      >
        <button
          onClick={e => {
            e.stopPropagation()
            onToggle()
          }}
          className="flex items-center justify-center p-2.5 rounded-xl text-[var(--theme-icon-history)] hover:bg-[var(--theme-bg-tertiary)] hover:text-[var(--theme-text-primary)] transition-colors"
          title={t('historySidebarOpen')}
        >
          <IconSidebarToggle size={20} strokeWidth={2} />
        </button>

        <div className="w-8 h-px bg-[var(--theme-border-primary)] my-1"></div>

        <a
          href="/"
          onClick={e => {
            if (e.button === 0 && !e.ctrlKey && !e.metaKey && !e.shiftKey) {
              e.preventDefault()
              e.stopPropagation()
              onNewChat()
            }
          }}
          className="flex items-center justify-center p-2.5 rounded-xl text-[var(--theme-icon-history)] hover:bg-[var(--theme-bg-tertiary)] hover:text-[var(--theme-text-primary)] transition-colors no-underline"
          title={t('newChat') + (newChatShortcut ? ` (${newChatShortcut})` : '')}
        >
          <IconNewChat size={20} strokeWidth={2} />
        </a>

        <button
          onClick={e => {
            e.stopPropagation()
            handleMiniSearchClick()
          }}
          className="flex items-center justify-center p-2.5 rounded-xl text-[var(--theme-icon-history)] hover:bg-[var(--theme-bg-tertiary)] hover:text-[var(--theme-text-primary)] transition-colors"
          title={t('history_search_button')}
        >
          <Search size={20} strokeWidth={2} />
        </button>

        <div className="mt-auto">
          <button
            onClick={e => {
              e.stopPropagation()
              onOpenSettingsModal()
            }}
            className="flex items-center justify-center p-2.5 rounded-xl text-[var(--theme-icon-history)] hover:bg-[var(--theme-bg-tertiary)] hover:text-[var(--theme-text-primary)] transition-colors"
            title={t('settingsTitle')}
          >
            <Settings size={20} strokeWidth={2} />
          </button>
        </div>
      </div>
    </aside>
  )
}
