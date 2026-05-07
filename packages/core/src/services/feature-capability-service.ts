import { eventBus } from '../utils/event-bus'
import { logger } from '../utils/logger'

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

export class FeatureCapabilityService {
  private static instance: FeatureCapabilityService
  private readonly storageKey = 'feature-capabilities'
  private capabilities: FeatureCapabilities = { ...DEFAULT_CAPABILITIES }
  private loadPromise: Promise<void>

  private constructor() {
    this.loadPromise = this.load()
  }

  static getInstance(): FeatureCapabilityService {
    if (!FeatureCapabilityService.instance) {
      FeatureCapabilityService.instance = new FeatureCapabilityService()
    }
    return FeatureCapabilityService.instance
  }

  async ensureLoaded(): Promise<void> {
    await this.loadPromise
  }

  getCapabilities(): FeatureCapabilities {
    return { ...this.capabilities }
  }

  isEnabled(key: keyof FeatureCapabilities): boolean {
    return this.capabilities[key]
  }

  async updateCapabilities(partial: Partial<FeatureCapabilities>): Promise<void> {
    this.capabilities = { ...this.capabilities, ...partial }
    await this.save()
    eventBus.emit('feature-capability:changed', this.getCapabilities())
  }

  private async load(): Promise<void> {
    try {
      const envOverrides = this.getCapabilitiesFromEnv()
      const isExtensionEnv =
        typeof chrome !== 'undefined' && Boolean(chrome?.runtime?.id) && Boolean(chrome?.storage?.local)

      if (isExtensionEnv) {
        const result = await chrome.storage.local.get(this.storageKey)
        if (result[this.storageKey]) {
          this.capabilities = {
            ...DEFAULT_CAPABILITIES,
            ...result[this.storageKey],
            ...envOverrides,
          }
          return
        }
      } else if (typeof window !== 'undefined' && window.localStorage) {
        const raw = localStorage.getItem(this.storageKey)
        if (raw) {
          this.capabilities = {
            ...DEFAULT_CAPABILITIES,
            ...(JSON.parse(raw) as Partial<FeatureCapabilities>),
            ...envOverrides,
          }
          return
        }
      }

      this.capabilities = { ...DEFAULT_CAPABILITIES, ...envOverrides }
    } catch (error) {
      logger.warn('Failed to load feature capabilities, fallback to defaults:', error)
      this.capabilities = { ...DEFAULT_CAPABILITIES, ...this.getCapabilitiesFromEnv() }
    }
  }

  private async save(): Promise<void> {
    try {
      const isExtensionEnv =
        typeof chrome !== 'undefined' && Boolean(chrome?.runtime?.id) && Boolean(chrome?.storage?.local)

      if (isExtensionEnv) {
        await chrome.storage.local.set({ [this.storageKey]: this.capabilities })
      } else if (typeof window !== 'undefined' && window.localStorage) {
        localStorage.setItem(this.storageKey, JSON.stringify(this.capabilities))
      }
    } catch (error) {
      logger.warn('Failed to save feature capabilities:', error)
    }
  }

  private parseBooleanEnv(value: string | undefined): boolean | undefined {
    if (value === undefined) return undefined
    const normalized = value.trim().toLowerCase()
    if (['1', 'true', 'yes', 'on'].includes(normalized)) return true
    if (['0', 'false', 'no', 'off'].includes(normalized)) return false
    return undefined
  }

  private getCapabilitiesFromEnv(): Partial<FeatureCapabilities> {
    if (typeof process === 'undefined' || !process.env) return {}
    const env = process.env
    const entries: Array<[keyof FeatureCapabilities, string | undefined]> = [
      ['enableFollowUpQuestions', env.NEXT_PUBLIC_FEATURE_ENABLE_FOLLOW_UP_QUESTIONS],
      ['enableDocumentParsing', env.NEXT_PUBLIC_FEATURE_ENABLE_DOCUMENT_PARSING],
      ['enablePdfOcr', env.NEXT_PUBLIC_FEATURE_ENABLE_PDF_OCR],
      ['enableWebContentAnalysis', env.NEXT_PUBLIC_FEATURE_ENABLE_WEB_CONTENT_ANALYSIS],
      ['enableTextPicker', env.NEXT_PUBLIC_FEATURE_ENABLE_TEXT_PICKER],
      ['enableDeepSearchTools', env.NEXT_PUBLIC_FEATURE_ENABLE_DEEP_SEARCH_TOOLS],
      ['enableThreadHeader', env.NEXT_PUBLIC_FEATURE_ENABLE_THREAD_HEADER],
      ['enableImageEdit', env.NEXT_PUBLIC_FEATURE_ENABLE_IMAGE_EDIT],
      ['enableLinkMindChat', env.NEXT_PUBLIC_FEATURE_ENABLE_LINKMIND_CHAT],
      ['enableLinkMindDocument', env.NEXT_PUBLIC_FEATURE_ENABLE_LINKMIND_DOCUMENT],
      ['enableLinkMindOcr', env.NEXT_PUBLIC_FEATURE_ENABLE_LINKMIND_OCR],
      ['enableLinkMindRag', env.NEXT_PUBLIC_FEATURE_ENABLE_LINKMIND_RAG],
      ['enableLinkMindAgentSync', env.NEXT_PUBLIC_FEATURE_ENABLE_LINKMIND_AGENT_SYNC],
      ['enableLinkMindProxyMode', env.NEXT_PUBLIC_FEATURE_ENABLE_LINKMIND_PROXY_MODE],
    ]

    const overrides: Partial<FeatureCapabilities> = {}
    for (const [key, rawValue] of entries) {
      const parsed = this.parseBooleanEnv(rawValue)
      if (parsed !== undefined) {
        overrides[key] = parsed
      }
    }
    return overrides
  }
}

export const featureCapabilityService = FeatureCapabilityService.getInstance()

