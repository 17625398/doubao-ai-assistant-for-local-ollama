/**
 * Feature Flags 系统 - 对齐原生豆包客户端 17+ 个 FEATURE_* 开关
 *
 * 继承旧 FeatureCapabilities 保持向后兼容，新增原生对齐开关和本地扩展能力。
 * 三级优先级: 环境变量 > localStorage > 默认值
 */
import { eventBus } from '../utils/event-bus'
import { logger } from '../utils/logger'

// ==================== 旧接口（保持向后兼容）====================
export interface FeatureCapabilities {
  enableFollowUpQuestions: boolean
  enableDocumentParsing: boolean
  enablePdfOcr: boolean
  enableWebContentAnalysis: boolean
  enableTextPicker: boolean
  enableDeepSearchTools: boolean
  enableThreadHeader: boolean
  enableImageEdit: boolean
  enableLinkMindChat: boolean
  enableLinkMindDocument: boolean
  enableLinkMindOcr: boolean
  enableLinkMindRag: boolean
  enableLinkMindAgentSync: boolean
  enableLinkMindProxyMode: boolean
}

// ==================== 新增：原生对齐开关 ====================
export interface NativeAlignedFeatures {
  /** PDF沉浸阅读模式 FEATURE_ENABLE_PDF_IMMERSIVE_READING */
  enablePdfImmersiveReading: boolean
  /** 多模型切换 FEATURE_MULTIPLE_LLM */
  enableMultipleLLM: boolean
  /** 用户反馈(更好/更差) FEATURE_REGEN_BETTER_OR_WORSE */
  enableRegenBetterWorse: boolean
  /** 翻译偏好语言 FEATURE_TRANS_PREFER_LANG */
  enableTransPreferLang: boolean
  /** 汽水音乐集成 FEATURE_ENABLE_QISHUI */
  enableQishuiMusic: boolean
  /** 第三方登录 FEATURE_ENABLE_THIRD_PARTY_LOGIN */
  enableThirdPartyLogin: boolean
  /** 埋点上报 FEATURE_REPORT_TEA */
  enableReportTea: boolean
  /** 深度搜索(强化版) FEATURE_ENABLE_DEEP_SEARCH */
  enableDeepSearch: boolean
  /** 显示用户UID FEATURE_SHOW_USER_UID */
  enableUserUid: boolean
  /** 日志开关 FEATURE_ENABLE_LOG */
  enableLog: boolean
}

// ==================== 新增：本地扩展能力 ====================
export interface ExtendedFeatures {
  /** 视频助手总开关 */
  enableVideoAssistant: boolean
  /** 音乐生成总开关 */
  enableMusicGeneration: boolean
  /** 学术搜索总开关 */
  enableAcademicSearch: boolean
  /** 白板Canvas总开关 */
  enableWhiteboardCanvas: boolean
  /** 技能输入插件系统总开关 */
  enableSkillInputPlugins: boolean
  /** 引导建议系统总开关 */
  enableGuidanceSystem: boolean
  /** Canvas Artifact 分享功能 */
  enableArtifactSharing: boolean
  /** PPT Artifact 预览 */
  enablePptArtifactPreview: boolean
  /** Video Artifact 预览 */
  enableVideoArtifactPreview: boolean
  /** Code Artifact 可编辑画布 */
  enableCodeArtifactCanvas: boolean
}

// ==================== 合并完整接口 ====================
export interface FeatureFlags extends FeatureCapabilities, NativeAlignedFeatures, ExtendedFeatures {}

// ==================== 默认值 ====================
const DEFAULT_CAPABILITIES: FeatureCapabilities = {
  enableFollowUpQuestions: true,
  enableDocumentParsing: true,
  enablePdfOcr: true,
  enableWebContentAnalysis: true,
  enableTextPicker: true,
  enableDeepSearchTools: true,
  enableThreadHeader: true,
  enableImageEdit: true,
  enableLinkMindChat: true,
  enableLinkMindDocument: true,
  enableLinkMindOcr: true,
  enableLinkMindRag: true,
  enableLinkMindAgentSync: true,
  enableLinkMindProxyMode: true,
}

const DEFAULT_NATIVE_ALIGNED: NativeAlignedFeatures = {
  enablePdfImmersiveReading: false,
  enableMultipleLLM: true,
  enableRegenBetterWorse: true,
  enableTransPreferLang: true,
  enableQishuiMusic: false,
  enableThirdPartyLogin: false,
  enableReportTea: true,
  enableDeepSearch: true,
  enableUserUid: false,
  enableLog: false,
}

const DEFAULT_EXTENDED: ExtendedFeatures = {
  enableVideoAssistant: true,
  enableMusicGeneration: true,
  enableAcademicSearch: true,
  enableWhiteboardCanvas: false,
  enableSkillInputPlugins: true,
  enableGuidanceSystem: true,
  enableArtifactSharing: true,
  enablePptArtifactPreview: true,
  enableVideoArtifactPreview: true,
  enableCodeArtifactCanvas: true,
}

const DEFAULT_FLAGS: FeatureFlags = {
  ...DEFAULT_CAPABILITIES,
  ...DEFAULT_NATIVE_ALIGNED,
  ...DEFAULT_EXTENDED,
}

/**
 * 环境变量名称映射表 — 用于运行时覆盖
 * 格式: NEXT_PUBLIC_FEATURE_{UPPER_SNAKE_CASE}
 */
const ENV_KEY_MAP: Record<keyof FeatureFlags, string> = {
  // 旧兼容
  enableFollowUpQuestions: 'NEXT_PUBLIC_FEATURE_ENABLE_FOLLOW_UP_QUESTIONS',
  enableDocumentParsing: 'NEXT_PUBLIC_FEATURE_ENABLE_DOCUMENT_PARSING',
  enablePdfOcr: 'NEXT_PUBLIC_FEATURE_ENABLE_PDF_OCR',
  enableWebContentAnalysis: 'NEXT_PUBLIC_FEATURE_ENABLE_WEB_CONTENT_ANALYSIS',
  enableTextPicker: 'NEXT_PUBLIC_FEATURE_ENABLE_TEXT_PICKER',
  enableDeepSearchTools: 'NEXT_PUBLIC_FEATURE_ENABLE_DEEP_SEARCH_TOOLS',
  enableThreadHeader: 'NEXT_PUBLIC_FEATURE_ENABLE_THREAD_HEADER',
  enableImageEdit: 'NEXT_PUBLIC_FEATURE_ENABLE_IMAGE_EDIT',
  enableLinkMindChat: 'NEXT_PUBLIC_FEATURE_ENABLE_LINKMIND_CHAT',
  enableLinkMindDocument: 'NEXT_PUBLIC_FEATURE_ENABLE_LINKMIND_DOCUMENT',
  enableLinkMindOcr: 'NEXT_PUBLIC_FEATURE_ENABLE_LINKMIND_OCR',
  enableLinkMindRag: 'NEXT_PUBLIC_FEATURE_ENABLE_LINKMIND_RAG',
  enableLinkMindAgentSync: 'NEXT_PUBLIC_FEATURE_ENABLE_LINKMIND_AGENT_SYNC',
  enableLinkMindProxyMode: 'NEXT_PUBLIC_FEATURE_ENABLE_LINKMIND_PROXY_MODE',
  // 原生对齐
  enablePdfImmersiveReading: 'NEXT_PUBLIC_FEATURE_ENABLE_PDF_IMMERSIVE_READING',
  enableMultipleLLM: 'NEXT_PUBLIC_FEATURE_MULTIPLE_LLM',
  enableRegenBetterWorse: 'NEXT_PUBLIC_FEATURE_REGEN_BETTER_OR_WORSE',
  enableTransPreferLang: 'NEXT_PUBLIC_FEATURE_TRANS_PREFER_LANG',
  enableQishuiMusic: 'NEXT_PUBLIC_FEATURE_ENABLE_QISHUI',
  enableThirdPartyLogin: 'NEXT_PUBLIC_FEATURE_ENABLE_THIRD_PARTY_LOGIN',
  enableReportTea: 'NEXT_PUBLIC_FEATURE_REPORT_TEA',
  enableDeepSearch: 'NEXT_PUBLIC_FEATURE_ENABLE_DEEP_SEARCH',
  enableUserUid: 'NEXT_PUBLIC_FEATURE_SHOW_USER_UID',
  enableLog: 'NEXT_PUBLIC_FEATURE_ENABLE_LOG',
  // 本地扩展
  enableVideoAssistant: 'NEXT_PUBLIC_FEATURE_ENABLE_VIDEO_ASSISTANT',
  enableMusicGeneration: 'NEXT_PUBLIC_FEATURE_ENABLE_MUSIC_GENERATION',
  enableAcademicSearch: 'NEXT_PUBLIC_FEATURE_ENABLE_ACADEMIC_SEARCH',
  enableWhiteboardCanvas: 'NEXT_PUBLIC_FEATURE_ENABLE_WHITEBOARD_CANVAS',
  enableSkillInputPlugins: 'NEXT_PUBLIC_FEATURE_ENABLE_SKILL_INPUT_PLUGINS',
  enableGuidanceSystem: 'NEXT_PUBLIC_FEATURE_ENABLE_GUIDANCE_SYSTEM',
  enableArtifactSharing: 'NEXT_PUBLIC_FEATURE_ENABLE_ARTIFACT_SHARING',
  enablePptArtifactPreview: 'NEXT_PUBLIC_FEATURE_ENABLE_PPT_ARTIFACT_PREVIEW',
  enableVideoArtifactPreview: 'NEXT_PUBLIC_FEATURE_ENABLE_VIDEO_ARTIFACT_PREVIEW',
  enableCodeArtifactCanvas: 'NEXT_PUBLIC_FEATURE_ENABLE_CODE_ARTIFACT_CANVAS',
}

export class FeatureFlagService {
  private static instance: FeatureFlagService
  private readonly storageKey = 'feature-flags-v2'
  private flags: FeatureFlags = { ...DEFAULT_FLAGS }
  private loadPromise: Promise<void>

  private constructor() {
    this.loadPromise = this.load()
  }

  static getInstance(): FeatureFlagService {
    if (!FeatureFlagService.instance) {
      FeatureFlagService.instance = new FeatureFlagService()
    }
    return FeatureFlagService.instance
  }

  async ensureLoaded(): Promise<void> {
    await this.loadPromise
  }

  getFlags(): FeatureFlags {
    return { ...this.flags }
  }

  isEnabled(key: keyof FeatureFlags): boolean {
    return !!this.flags[key]
  }

  isAnyEnabled(keys: (keyof FeatureFlags)[]): boolean {
    return keys.some((k) => this.flags[k])
  }

  areAllEnabled(keys: (keyof FeatureFlags)[]): boolean {
    return keys.every((k) => this.flags[k])
  }

  async updateFlags(partial: Partial<FeatureFlags>): Promise<void> {
    this.flags = { ...this.flags, ...partial }
    await this.save()
    eventBus.emit('feature-flag:changed', this.getFlags())
  }

  async resetToDefaults(): Promise<void> {
    this.flags = { ...DEFAULT_FLAGS }
    await this.save()
    eventBus.emit('feature-flag:changed', this.getFlags())
  }

  getEnvVarName(key: keyof FeatureFlags): string {
    return ENV_KEY_MAP[key] || `NEXT_PUBLIC_FEATURE_${String(key).toUpperCase()}`
  }

  // ==================== 私有方法 ====================

  private async load(): Promise<void> {
    try {
      const envOverrides = this.getFlagsFromEnv()
      const isExtensionEnv =
        typeof chrome !== 'undefined' && Boolean(chrome?.runtime?.id) && Boolean(chrome?.storage?.local)

      if (isExtensionEnv) {
        const result = await chrome.storage.local.get(this.storageKey)
        if (result[this.storageKey]) {
          this.flags = { ...DEFAULT_FLAGS, ...result[this.storageKey], ...envOverrides }
          return
        }
      } else if (typeof window !== 'undefined' && window.localStorage) {
        const raw = localStorage.getItem(this.storageKey)
        if (raw) {
          this.flags = { ...DEFAULT_FLAGS, ...(JSON.parse(raw) as Partial<FeatureFlags>), ...envOverrides }
          return
        }
      }

      this.flags = { ...DEFAULT_FLAGS, ...envOverrides }
    } catch (error) {
      logger.warn('Failed to load feature flags, fallback to defaults:', error)
      this.flags = { ...DEFAULT_FLAGS, ...this.getFlagsFromEnv() }
    }
  }

  private async save(): Promise<void> {
    try {
      const isExtensionEnv =
        typeof chrome !== 'undefined' && Boolean(chrome?.runtime?.id) && Boolean(chrome?.storage?.local)

      if (isExtensionEnv) {
        await chrome.storage.local.set({ [this.storageKey]: this.flags })
      } else if (typeof window !== 'undefined' && window.localStorage) {
        localStorage.setItem(this.storageKey, JSON.stringify(this.flags))
      }
    } catch (error) {
      logger.warn('Failed to save feature flags:', error)
    }
  }

  private parseBooleanEnv(value: string | undefined): boolean | undefined {
    if (value === undefined) return undefined
    const normalized = value.trim().toLowerCase()
    if (['1', 'true', 'yes', 'on'].includes(normalized)) return true
    if (['0', 'false', 'no', 'off'].includes(normalized)) return false
    return undefined
  }

  private getFlagsFromEnv(): Partial<FeatureFlags> {
    if (typeof process === 'undefined' || !process.env) return {}
    const env = process.env
    const overrides: Partial<FeatureFlags> = {}

    for (const [key, envName] of Object.entries(ENV_KEY_MAP) as Array<[keyof FeatureFlags, string]>) {
      const parsed = this.parseBooleanEnv(env[envName])
      if (parsed !== undefined) {
        overrides[key] = parsed
      }
    }
    return overrides
  }
}

/** 全局单例 */
export const featureFlagService = FeatureFlagService.getInstance()

/** 向后兼容别名 — 旧代码可继续使用 */
export const featureCapabilityService = featureFlagService as unknown as {
  getCapabilities: () => FeatureCapabilities
  isEnabled: (key: keyof FeatureCapabilities) => boolean
  updateCapabilities: (partial: Partial<FeatureCapabilities>) => Promise<void>
}
