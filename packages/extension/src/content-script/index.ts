import { capturePageContext } from './page-context'
import type { DoubaoExtensionMessage, DoubaoPageContext } from '../shared/protocol'

const BUTTON_ID = 'doubao-native-ai-copilot'
let lastSelection = ''

function sendMessage<T = unknown>(message: DoubaoExtensionMessage): Promise<T> {
  return new Promise((resolve, reject) => {
    chrome.runtime.sendMessage(message, response => {
      if (chrome.runtime.lastError) {
        reject(new Error(chrome.runtime.lastError.message))
        return
      }
      if (!response?.ok) {
        reject(new Error(response?.error || '请求失败'))
        return
      }
      resolve(response.data as T)
    })
  })
}

async function captureAndStoreContext(selectedText = lastSelection): Promise<DoubaoPageContext> {
  const context = capturePageContext(selectedText)
  await sendMessage<DoubaoPageContext>({
    type: 'DOUBAO_PAGE_CONTEXT_CAPTURED',
    payload: context,
  })
  return context
}

async function openSidePanel(skillId?: string): Promise<void> {
  const context = await captureAndStoreContext()
  await sendMessage({
    type: 'DOUBAO_OPEN_SIDE_PANEL',
    payload: { context, skillId },
  })
}

function injectCopilotButton(): void {
  if (document.getElementById(BUTTON_ID) || !document.body) return

  const button = document.createElement('button')
  button.id = BUTTON_ID
  button.type = 'button'
  button.textContent = '豆包'
  button.setAttribute('aria-label', '打开豆包 AI 侧边栏')
  button.style.cssText = `
    position: fixed;
    right: 18px;
    bottom: 22px;
    z-index: 2147483647;
    width: 52px;
    height: 52px;
    border: 1px solid rgba(255,255,255,.42);
    border-radius: 18px;
    color: #fff;
    cursor: pointer;
    font: 700 14px -apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;
    letter-spacing: .02em;
    background: linear-gradient(135deg,#4f46e5,#7c3aed 52%,#ec4899);
    box-shadow: 0 18px 40px rgba(79,70,229,.36), inset 0 1px 0 rgba(255,255,255,.28);
  `
  button.addEventListener('click', () => {
    void openSidePanel()
  })
  document.body.appendChild(button)
}

function installSelectionListener(): void {
  document.addEventListener('selectionchange', () => {
    const selection = window.getSelection()?.toString().trim() ?? ''
    if (selection === lastSelection) return
    lastSelection = selection.slice(0, 4000)
    if (lastSelection.length > 0) {
      void sendMessage({
        type: 'DOUBAO_SELECTION_CHANGED',
        payload: {
          title: document.title,
          url: location.href,
          selectedText: lastSelection,
          capturedAt: new Date().toISOString(),
        },
      }).catch(() => undefined)
    }
  })
}

chrome.runtime.onMessage.addListener((message: DoubaoExtensionMessage, _sender, sendResponse) => {
  if (message.type === 'DOUBAO_CAPTURE_PAGE_CONTEXT' || message.type === 'EXTRACT_CONTENT') {
    try {
      const context = capturePageContext(lastSelection)
      sendResponse({ ok: true, success: true, data: context })
    } catch (error) {
      sendResponse({ ok: false, success: false, error: error instanceof Error ? error.message : String(error) })
    }
    return true
  }

  return false
})

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    injectCopilotButton()
    installSelectionListener()
  })
} else {
  injectCopilotButton()
  installSelectionListener()
}

window.addEventListener('message', event => {
  if (event.source !== window) return
  if (event.data?.type === 'DOUBAO_REQUEST_PAGE_CONTEXT') {
    const context = capturePageContext(lastSelection)
    window.postMessage({ type: 'DOUBAO_PAGE_CONTEXT', payload: context }, '*')
  }
})

;(window as unknown as Record<string, unknown>).DoubaoExtension = {
  extractContent: () => captureAndStoreContext(),
  analyzeContent: (content: string) =>
    sendMessage({
      type: 'DOUBAO_ANALYZE_CONTEXT',
      payload: { skillId: 'summarize', prompt: content },
    }),
  openSidePanel,
}
