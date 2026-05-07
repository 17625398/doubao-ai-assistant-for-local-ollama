/**
 * 技能输入插件系统 — 核心接口定义
 *
 * 原生豆包的核心创新：每个技能有独立的输入框插件(*-input-plugin.js)，
 * 决定 placeholder、附件能力、工具按钮、Footer行为、引导问题等。
 *
 * 设计原则：
 * - Core 包零 UI 依赖：纯数据/TypeScript 接口
 * - 插件注册表 O(1) 查找，guidance 数据懒加载
 * - 通过 FeatureFlag 控制，默认渐进开启
 */

/** 技能分类枚举 */
export type SkillCategory =
  | 'chat'
  | 'search'
  | 'deep-search'
  | 'academic-search'
  | 'read-document'
  | 'read-website'
  | 'write'
  | 'translate'
  | 'code'
  | 'image-gen'
  | 'video'
  | 'music'
  | 'ppt'

export const SKILL_CATEGORIES: Record<SkillCategory, { label: string; icon: string }> = {
  chat: { label: '通用聊天', icon: 'MessageCircle' },
  search: { label: '搜索', icon: 'Search' },
  'deep-search': { label: '深度搜索', icon: 'Brain' },
  'academic-search': { label: '学术搜索', icon: 'GraduationCap' },
  'read-document': { label: '文档阅读', icon: 'FileText' },
  'read-website': { label: '网页阅读', icon: 'Globe' },
  write: { label: '写作助手', icon: 'PenTool' },
  translate: { label: '翻译', icon: 'Languages' },
  code: { label: '代码编写', icon: 'Code2' },
  'image-gen': { label: '图片生成', icon: 'ImagePlus' },
  video: { label: '视频助手', icon: 'Video' },
  music: { label: '音乐生成', icon: 'Music' },
  ppt: { label: 'PPT生成', icon: 'Presentation' },
}

/** 工具栏按钮配置 */
export interface ToolbarButtonConfig {
  id: string
  label: string
  icon?: string
  /** 按钮位置: left(输入框内左侧) / right(发送按钮旁) / bottom(底部工具栏) */
  position?: 'left' | 'right' | 'bottom'
  action?: string // 事件标识
}

/** Footer 操作配置 */
export interface FooterActionConfig {
  id: string
  label: string
  icon?: string
  variant?: 'default' | 'primary' | 'ghost'
  action?: string
}

/** 引导模板 — 空状态引导页配置 */
export interface GuidanceTemplate {
  title: string
  subtitle?: string
  description: string
  icon: string
  steps?: GuidanceStep[]
  quickActions?: QuickActionItem[]
}

export interface GuidanceStep {
  title: string
  description: string
  icon?: string
  action?: { label: string; prompt: string }
}

/** 快捷操作入口 */
export interface QuickActionItem {
  id: string
  label: string
  prompt: string
  icon?: string
  color?: string
}

/** 建议项 — 输入框下方的推荐标签/问题 */
export interface SuggestionItem {
  id: string
  label: string
  prompt: string
  icon?: string
  category?: 'recommended' | 'template' | 'recent' | 'trending'
}

/** 多模态附件（与现有 multimodal 类型对齐） */
export interface MultimodalAttachment {
  id: string
  file: File
  type: 'image' | 'file' | 'audio' | 'video'
  preview?: string
}

/** 提交载荷（submitTransform 的输出） */
export interface SubmitPayload {
  content: string
  attachments?: MultimodalAttachment[]
  skillId: string
  metadata?: Record<string, unknown>
}

/**
 * 技能输入插件核心接口
 *
 * 每个技能实现此接口来控制 ChatInputBox 的行为表现。
 */
export interface SkillInputPlugin {
  /** 唯一标识 */
  id: string
  /** 显示名称 */
  name: string
  /** 分类 */
  category: SkillCategory
  /** 描述（用于 Skill 切换指示栏） */
  description?: string

  // ==================== 输入框行为 ====================

  /** 输入框占位符文本 */
  placeholder: string
  /** 是否接受多模态附件 */
  acceptMultimodal: boolean
  /** 限制接受的文件 MIME 类型列表 */
  acceptedFileTypes?: string[]
  /** 最大附件数量 */
  maxAttachments?: number

  // ==================== 工具栏定制 ====================

  /** 自定义工具栏按钮 */
  toolbarButtons?: ToolbarButtonConfig[]
  /** 是否显示发送按钮（默认 true） */
  showSendButton?: boolean
  /** 发送按钮文案（默认 "发送"） */
  sendButtonText?: string

  // ==================== 引导系统 ====================

  /** 空状态推荐问题列表 */
  guidanceQuestions?: string[]
  /** 完整引导页模板 */
  guidanceTemplate?: GuidanceTemplate
  /** 底部建议项 */
  suggestions?: SuggestionItem[]

  // ==================== Footer 行为 ====================

  /** 底部附加操作 */
  footerActions?: FooterActionConfig[]

  // ==================== 提交处理 ====================

  /** 提交前的数据转换（可选） */
  submitTransform?: (input: string, attachments: MultimodalAttachment[]) => SubmitPayload

  // ==================== 开关控制 ====================

  /** 所需的 FeatureFlag key 列表 — 任一不满足则禁用此插件 */
  requiredFlags?: (string & {})[]
}

/** 插件注册/激活/切换事件 */
export type PluginEventType = 'plugin:registered' | 'plugin:activated' | 'plugin:deactivated' | 'plugin:list-changed'

export interface PluginEvent {
  type: PluginEventType
  pluginId: string
  timestamp: number
}
