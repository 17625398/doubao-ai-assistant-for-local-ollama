import type { ParseOptions, PdfOcrMode, PdfProcessingPolicy } from '../types/document'
import { featureCapabilityService } from './feature-capability-service'

const DEFAULT_PDF_POLICY: PdfProcessingPolicy = {
  mode: 'textFirst',
  timeoutMs: 60000,
  maxRetries: 1,
}

export class PdfProcessingPolicyService {
  private parseBoolean(value: string | undefined): boolean | undefined {
    if (value === undefined) return undefined
    const normalized = value.trim().toLowerCase()
    if (['1', 'true', 'yes', 'on'].includes(normalized)) return true
    if (['0', 'false', 'no', 'off'].includes(normalized)) return false
    return undefined
  }

  private parseMode(value: string | undefined): PdfOcrMode | undefined {
    if (!value) return undefined
    if (value === 'textFirst' || value === 'ocrFirst' || value === 'disabled') {
      return value
    }
    return undefined
  }

  private parseNumber(value: string | undefined): number | undefined {
    if (!value) return undefined
    const parsed = Number(value)
    return Number.isFinite(parsed) ? parsed : undefined
  }

  private readEnvOverrides(): Partial<PdfProcessingPolicy> {
    if (typeof process === 'undefined' || !process.env) return {}

    const envMode = this.parseMode(process.env.NEXT_PUBLIC_PDF_OCR_MODE)
    const envTimeout = this.parseNumber(process.env.NEXT_PUBLIC_PDF_OCR_TIMEOUT_MS)
    const envRetries = this.parseNumber(process.env.NEXT_PUBLIC_PDF_OCR_MAX_RETRIES)
    const envEnableOcr = this.parseBoolean(process.env.NEXT_PUBLIC_FEATURE_ENABLE_PDF_OCR)

    const overrides: Partial<PdfProcessingPolicy> = {}
    if (envEnableOcr === false) {
      overrides.mode = 'disabled'
      return overrides
    }
    if (envMode) overrides.mode = envMode
    if (envTimeout !== undefined) overrides.timeoutMs = Math.max(1000, envTimeout)
    if (envRetries !== undefined) overrides.maxRetries = Math.max(0, Math.floor(envRetries))
    return overrides
  }

  getDefaultPolicy(): PdfProcessingPolicy {
    const envOverrides = this.readEnvOverrides()
    const policy = { ...DEFAULT_PDF_POLICY, ...envOverrides }
    if (!featureCapabilityService.isEnabled('enablePdfOcr')) {
      policy.mode = 'disabled'
    }
    return policy
  }

  resolvePolicy(options?: ParseOptions): PdfProcessingPolicy {
    const defaultPolicy = this.getDefaultPolicy()
    const optionPolicy = options?.pdfOcrPolicy || {}

    const requestedMode: PdfOcrMode =
      optionPolicy.mode || (options?.enableOCR === false ? 'disabled' : defaultPolicy.mode)

    const merged: PdfProcessingPolicy = {
      mode: requestedMode,
      timeoutMs: optionPolicy.timeoutMs ?? defaultPolicy.timeoutMs,
      maxRetries: optionPolicy.maxRetries ?? defaultPolicy.maxRetries,
    }

    if (!featureCapabilityService.isEnabled('enablePdfOcr')) {
      merged.mode = 'disabled'
    }

    return merged
  }

  applyPolicyToOptions(options?: ParseOptions): ParseOptions {
    const resolved = this.resolvePolicy(options)
    return {
      ...options,
      pdfOcrPolicy: resolved,
      enableOCR: resolved.mode !== 'disabled',
    }
  }
}

export const pdfProcessingPolicyService = new PdfProcessingPolicyService()
