'use client'

/**
 * PDF.js 提供者组件
 * 
 * 使用 <script type="module"> 标签从 CDN 动态加载 PDF.js ESM 模块
 * 这避免了 webpack 无法处理外部 https:// URL 的问题
 */

let initialized = false

export function PdfJsProvider({ children }: { children: React.ReactNode }) {
  if (typeof window === 'undefined') {
    return <>{children}</>
  }

  if (!initialized) {
    initialized = true
    loadPdfJsModule()
  }

  return <>{children}</>
}

async function loadPdfJsModule(): Promise<void> {
  const win = window as unknown as { pdfjsLib?: unknown; pdfjsDistLoaded?: boolean }
  
  if (win.pdfjsDistLoaded) {
    console.log('[PdfJsProvider] pdfjs-dist already loaded')
    return
  }

  const PDFJS_VERSION = '4.0.379'
  const PDFJS_CDN_URL = `https://cdn.jsdelivr.net/npm/pdfjs-dist@${PDFJS_VERSION}/build/pdf.min.mjs`

  console.log('[PdfJsProvider] Loading pdfjs-dist from CDN:', PDFJS_CDN_URL)

  // 检查是否已加载
  if (typeof win.pdfjsLib !== 'undefined') {
    console.log('[PdfJsProvider] pdfjs-dist already in global scope')
    win.pdfjsDistLoaded = true
    return
  }

  return new Promise((resolve) => {
    // 创建 module script
    const script = document.createElement('script')
    script.type = 'module'
    
    // 动态导入并设置到全局，同时配置 worker
    const PDFJS_WORKER_CDN_URL = `https://cdn.jsdelivr.net/npm/pdfjs-dist@${PDFJS_VERSION}/build/pdf.worker.min.mjs`
    
    script.textContent = `
      import('${PDFJS_CDN_URL}')
        .then(pdfjs => {
          // 配置 worker src
          if (pdfjs.GlobalWorkerOptions) {
            pdfjs.GlobalWorkerOptions.workerSrc = '${PDFJS_WORKER_CDN_URL}';
          }
          window.pdfjsLib = pdfjs;
          window.pdfjsDistLoaded = true;
          console.log('[PdfJsProvider] pdfjs-dist loaded successfully with worker');
        })
        .catch(err => {
          console.error('[PdfJsProvider] Failed to load pdfjs-dist:', err);
          window.pdfjsDistLoaded = true;
        });
    `
    
    script.onerror = () => {
      console.error('[PdfJsProvider] Script load error')
      win.pdfjsDistLoaded = true
      resolve()
    }

    // 添加到文档
    document.head.appendChild(script)
    
    // 等待加载完成或超时
    const timeout = setTimeout(() => {
      console.warn('[PdfJsProvider] Loading timeout, using fallback')
      win.pdfjsDistLoaded = true
      resolve()
    }, 10000)

    // 定期检查是否加载完成
    const checkLoaded = setInterval(() => {
      if (win.pdfjsDistLoaded) {
        clearTimeout(timeout)
        clearInterval(checkLoaded)
        resolve()
      }
    }, 100)
  })
}
