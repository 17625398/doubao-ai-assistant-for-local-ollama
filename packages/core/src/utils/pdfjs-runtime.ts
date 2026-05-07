export interface PdfJsRuntime {
  version?: string
  GlobalWorkerOptions?: {
    workerSrc?: string
  }
  getDocument?: (src: unknown) => PdfJsDocumentTask
}

export interface PdfJsDocumentTask {
  promise: Promise<PdfJsDocument>
}

export interface PdfJsDocument {
  numPages: number
  getPage: (pageNumber: number) => Promise<PdfJsPage>
  destroy?: () => Promise<void>
}

export interface PdfJsPage {
  getViewport: (options: { scale: number }) => PdfJsViewport
  getTextContent: () => Promise<PdfJsTextContent>
  render: (options: { canvasContext: CanvasRenderingContext2D; viewport: PdfJsViewport; [key: string]: unknown }) => {
    promise: Promise<void>
  }
}

export interface PdfJsViewport {
  width: number
  height: number
}

export interface PdfJsTextContent {
  items: Array<{ str: string }>
}

interface PdfJsGlobalScope {
  pdfjsLib?: PdfJsRuntime
  __doubaoPdfJsRuntimePromise__?: Promise<PdfJsRuntime>
  __pdfjsDistModule__?: { default?: PdfJsRuntime; pdfjsDist?: PdfJsRuntime }
}

export interface EnsurePdfJsRuntimeOptions {
  browserWorkerSrc?: string
  nodeWorkerSrc?: string
  allowCdnFallback?: boolean
  cdnUrl?: string
}

// PDF.js 版本常量（与 package.json 保持一致）
const DEFAULT_CDN_VERSION = '4.0.379'

function getGlobalScope(): PdfJsGlobalScope {
  return globalThis as PdfJsGlobalScope
}

function configurePdfJsWorker(
  pdfjs: PdfJsRuntime,
  options: EnsurePdfJsRuntimeOptions = {}
): PdfJsRuntime {
  if (!pdfjs?.GlobalWorkerOptions) {
    return pdfjs
  }

  // 浏览器端：使用打包后的 worker 路径
  if (typeof window !== 'undefined') {
    if (options.browserWorkerSrc) {
      pdfjs.GlobalWorkerOptions.workerSrc = options.browserWorkerSrc
    }
    return pdfjs
  }

  // Node.js 端
  pdfjs.GlobalWorkerOptions.workerSrc =
    options.nodeWorkerSrc ||
    `https://cdn.jsdelivr.net/npm/pdfjs-dist@${pdfjs.version || DEFAULT_CDN_VERSION}/build/pdf.worker.min.mjs`

  return pdfjs
}

// 预加载的 pdfjs-dist 模块（通过 webpack 提供）
let _pdfjsDistModule: PdfJsRuntime | null = null

function getPdfJsModule(): PdfJsRuntime | null {
  if (_pdfjsDistModule) return _pdfjsDistModule

  const globalScope = getGlobalScope() as PdfJsGlobalScope & {
    __pdfjsDistModule__?: { default?: PdfJsRuntime; pdfjsDist?: PdfJsRuntime }
  }

  if (globalScope.__pdfjsDistModule__) {
    _pdfjsDistModule = globalScope.__pdfjsDistModule__.default || globalScope.__pdfjsDistModule__.pdfjsDist || null
    return _pdfjsDistModule
  }

  return null
}

async function loadBrowserPdfJs(options: EnsurePdfJsRuntimeOptions = {}): Promise<PdfJsRuntime> {
  const globalScope = getGlobalScope()

  if (globalScope.pdfjsLib?.getDocument) {
    return configurePdfJsWorker(globalScope.pdfjsLib, options)
  }

  if (globalScope.__doubaoPdfJsRuntimePromise__) {
    return globalScope.__doubaoPdfJsRuntimePromise__
  }

  globalScope.__doubaoPdfJsRuntimePromise__ = (async () => {
    // 尝试使用预加载的模块
    let pdfjs = getPdfJsModule()

    if (pdfjs?.getDocument) {
      console.log('[pdfjs-runtime] Using preloaded PDF.js module')
      return configurePdfJsWorker(pdfjs, options)
    }

    // 尝试使用全局 pdfjsLib
    const globalLib = (globalScope as unknown as { pdfjsLib?: PdfJsRuntime }).pdfjsLib
    if (globalLib?.getDocument) {
      console.log('[pdfjs-runtime] Using global pdfjsLib')
      return configurePdfJsWorker(globalLib, options)
    }

    // 尝试使用已加载到 window 的 pdfjs-dist
    if (typeof window !== 'undefined') {
      const winAny = window as unknown as { pdfjsLib?: PdfJsRuntime; pdfjsDist?: { getDocument?: PdfJsRuntime['getDocument'] } }
      if (winAny.pdfjsLib?.getDocument) {
        console.log('[pdfjs-runtime] Using window.pdfjsLib')
        return configurePdfJsWorker(winAny.pdfjsLib, options)
      }
    }

    // 最后 fallback：使用 mock
    const mockPdfJs: PdfJsRuntime = {
      version: 'mock',
      getDocument: () => ({
        promise: Promise.reject(new Error('PDF.js not available, using fallback text extraction')),
      }),
    }

    globalScope.pdfjsLib = mockPdfJs
    console.log('[pdfjs-runtime] Using mock PDF.js runtime (fallback)')
    return mockPdfJs
  })()

  try {
    return await globalScope.__doubaoPdfJsRuntimePromise__
  } finally {
    // 不删除 promise，让它缓存起来
  }
}

export async function ensurePdfJsRuntime(
  options: EnsurePdfJsRuntimeOptions = {}
): Promise<PdfJsRuntime> {
  if (typeof window !== 'undefined') {
    return loadBrowserPdfJs(options)
  }

  // Node.js 端：使用动态导入
  const pdfjsLib = await import('pdfjs-dist')
  const pdfjs = (pdfjsLib.default || pdfjsLib) as unknown as PdfJsRuntime

  if (!pdfjs?.getDocument) {
    throw new Error('Failed to load pdfjs-dist: getDocument function not found')
  }

  return configurePdfJsWorker(pdfjs, options)
}

export function createPdfLoadOptions(buffer: ArrayBuffer): Record<string, unknown> {
  const baseOptions: Record<string, unknown> = {
    data: new Uint8Array(buffer),
    disableFontFace: true,
  }

  // 浏览器端使用 public 目录中的资源（通过 next.config.js 复制）
  if (typeof window !== 'undefined') {
    return {
      ...baseOptions,
      cMapUrl: '/node_modules/pdfjs-dist/cmaps/',
      cMapPacked: true,
      standardFontDataUrl: '/node_modules/pdfjs-dist/standard_fonts/',
    }
  }

  return {
    ...baseOptions,
    cMapUrl: `https://cdn.jsdelivr.net/npm/pdfjs-dist@${DEFAULT_CDN_VERSION}/cmaps/`,
    cMapPacked: true,
    standardFontDataUrl: `https://cdn.jsdelivr.net/npm/pdfjs-dist@${DEFAULT_CDN_VERSION}/standard_fonts/`,
  }
}
