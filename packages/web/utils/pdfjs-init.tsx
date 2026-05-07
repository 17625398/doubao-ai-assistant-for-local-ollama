'use client'

/**
 * PDF.js 客户端初始化
 * 
 * 此文件需要在应用启动时加载，用于预加载 pdfjs-dist 模块
 * 并将其提供给 core 包使用。
 * 
 * 在 _app.tsx 或 layout.tsx 中导入此模块
 */

import { useEffect } from 'react'

let initialized = false

async function initPdfJs() {
  if (initialized || typeof window === 'undefined') return
  initialized = true

  try {
    console.log('[pdfjs-init] Loading pdfjs-dist...')
    const pdfjsModule = await import('pdfjs-dist')
    
    // 提取 pdfjsLib
    const pdfjs = (pdfjsModule.default || pdfjsModule) as {
      getDocument?: (src: unknown) => unknown
      GlobalWorkerOptions?: { workerSrc?: string }
    }
    
    if (pdfjs?.getDocument) {
      // 尝试设置 workerSrc（如果需要）
      if (pdfjs.GlobalWorkerOptions) {
        // Worker 会在首次使用时自动加载
      }
      
      // 存储到全局变量，供 core 包使用
      ;(window as unknown as { pdfjsLib?: typeof pdfjs }).pdfjsLib = pdfjs
      
      console.log('[pdfjs-init] pdfjs-dist loaded successfully')
    }
  } catch (error) {
    console.error('[pdfjs-init] Failed to load pdfjs-dist:', error)
  }
}

// 立即初始化
initPdfJs()

/**
 * React hook 用于在组件中触发 PDF.js 预加载
 */
export function usePdfJsInit() {
  useEffect(() => {
    initPdfJs()
  }, [])
}

export default { usePdfJsInit }
