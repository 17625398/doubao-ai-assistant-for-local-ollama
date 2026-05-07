import type {
  DiagnosticReport,
  DoubaoExtensionMessage,
  DoubaoExtensionResponse,
  DoubaoPageContext,
  DoubaoSkillRequest,
  DoubaoSkillResult,
} from '../shared/protocol'
import { createError, createResponse } from '../shared/protocol'
import { attachContext, runDoubaoSkill } from '../services/skill-runtime'
import { runDiagnostics } from '../services/diagnostics-service'
import {
  clearArtifacts,
  deleteArtifact,
  exportArtifacts,
  listArtifacts,
  saveDiagnosticArtifact,
  saveSkillArtifact,
} from '../services/artifact-store'

const contextByTab = new Map<number, DoubaoPageContext>()
let activeContext: DoubaoPageContext | null = null

function getTabId(sender?: chrome.runtime.MessageSender): number | undefined {
  return sender?.tab?.id
}

async function openSidePanel(tabId?: number): Promise<boolean> {
  try {
    if (!tabId) {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true })
      tabId = tab?.id
    }
    if (!tabId) return false

    await chrome.sidePanel.setOptions({ tabId, path: 'side-panel.html', enabled: true })
    await chrome.sidePanel.open({ tabId })
    return true
  } catch (error) {
    // sidePanel.open() 必须在用户手势上下文中调用，否则会抛出错误
    // 记录错误但不中断流程
    console.warn('[豆包扩展] 无法打开侧边栏（需要用户交互触发）:', error instanceof Error ? error.message : error)
    return false
  }
}

async function captureActiveTabContext(tabId: number): Promise<DoubaoPageContext | null> {
  const response = await chrome.tabs.sendMessage(tabId, { type: 'DOUBAO_CAPTURE_PAGE_CONTEXT' }).catch(() => null)
  if (response?.ok && response.data) {
    const context = { ...(response.data as DoubaoPageContext), tabId }
    contextByTab.set(tabId, context)
    activeContext = context
    return context
  }
  return null
}

async function runSkill(payload: unknown): Promise<DoubaoSkillResult> {
  const request = attachContext(payload as DoubaoSkillRequest, activeContext)
  const result = await runDoubaoSkill(request)
  await saveSkillArtifact(result, request.context || activeContext)
  return result
}

chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.removeAll(() => {
    chrome.contextMenus.create({ id: 'doubao-summarize-page', title: '豆包：总结当前页面', contexts: ['page'] })
    chrome.contextMenus.create({ id: 'doubao-analyze-selection', title: '豆包：分析选中内容', contexts: ['selection'] })
    chrome.contextMenus.create({ id: 'doubao-translate-selection', title: '豆包：翻译选中内容', contexts: ['selection'] })
  })
})

chrome.contextMenus.onClicked.addListener((info, tab) => {
  void (async () => {
    if (!tab?.id) return
    const context = await captureActiveTabContext(tab.id)
    if (context && info.selectionText) {
      context.selectedText = info.selectionText
      activeContext = context
      contextByTab.set(tab.id, context)
    }
    const opened = await openSidePanel(tab.id)
    if (opened) {
      const skillId = info.menuItemId === 'doubao-translate-selection' ? 'translate' : 'summarize'
      chrome.runtime.sendMessage({ type: 'DOUBAO_RUN_SKILL', payload: { skillId, context: activeContext } })
    }
  })()
})

chrome.runtime.onMessage.addListener((message: DoubaoExtensionMessage, sender, sendResponse: (response: DoubaoExtensionResponse) => void) => {
  void (async () => {
    try {
      const tabId = getTabId(sender)
      switch (message.type) {
        case 'DOUBAO_PAGE_CONTEXT_CAPTURED': {
          const context = { ...(message.payload as DoubaoPageContext), tabId }
          if (tabId) contextByTab.set(tabId, context)
          activeContext = context
          sendResponse(createResponse(context))
          break
        }
        case 'DOUBAO_SELECTION_CHANGED':
          sendResponse(createResponse(true))
          break
        case 'DOUBAO_GET_ACTIVE_CONTEXT': {
          const context = tabId ? contextByTab.get(tabId) || activeContext : activeContext
          sendResponse(createResponse(context))
          break
        }
        case 'DOUBAO_ANALYZE_CONTEXT':
        case 'DOUBAO_RUN_SKILL': {
          sendResponse(createResponse(await runSkill(message.payload)))
          break
        }
        case 'DOUBAO_OPEN_SIDE_PANEL': {
          const payload = message.payload as { context?: DoubaoPageContext }
          if (payload?.context) activeContext = payload.context
          const opened = await openSidePanel(tabId)
          sendResponse(createResponse(opened))
          break
        }
        case 'DOUBAO_HEALTH_CHECK':
          sendResponse(createResponse({ status: 'ok', contexts: contextByTab.size, activeUrl: activeContext?.url }))
          break
        case 'DOUBAO_RUN_DIAGNOSTICS': {
          const report = await runDiagnostics(activeContext)
          await saveDiagnosticArtifact(report, activeContext)
          sendResponse(createResponse(report))
          break
        }
        case 'DOUBAO_LIST_ARTIFACTS': {
          sendResponse(createResponse(await listArtifacts(message.payload as { pageUrl?: string; limit?: number } | undefined)))
          break
        }
        case 'DOUBAO_DELETE_ARTIFACT': {
          const payload = message.payload as { id: string }
          sendResponse(createResponse(await deleteArtifact(payload.id)))
          break
        }
        case 'DOUBAO_CLEAR_ARTIFACTS': {
          sendResponse(createResponse(await clearArtifacts(message.payload as { pageUrl?: string } | undefined)))
          break
        }
        case 'DOUBAO_EXPORT_ARTIFACTS': {
          sendResponse(createResponse(await exportArtifacts(message.payload as { pageUrl?: string } | undefined)))
          break
        }
        case 'DOUBAO_SAVE_ARTIFACT': {
          const payload = message.payload as { skillResult?: DoubaoSkillResult; diagnosticReport?: DiagnosticReport; context?: DoubaoPageContext }
          if (payload.skillResult) sendResponse(createResponse(await saveSkillArtifact(payload.skillResult, payload.context || activeContext)))
          else if (payload.diagnosticReport) sendResponse(createResponse(await saveDiagnosticArtifact(payload.diagnosticReport, payload.context || activeContext)))
          else throw new Error('缺少可保存的 Artifact')
          break
        }
        case 'EXTRACT_CONTENT': {
          if (!tabId) throw new Error('无法定位当前标签页')
          sendResponse(createResponse(await captureActiveTabContext(tabId)))
          break
        }
        case 'ANALYZE_CONTENT': {
          sendResponse(createResponse(await runSkill({ skillId: 'summarize', prompt: String(message.payload ?? '') })))
          break
        }
        default:
          sendResponse(createError(`Unknown message type: ${message.type}`))
      }
    } catch (error) {
      sendResponse(createError(error))
    }
  })()
  return true
})

chrome.tabs.onRemoved.addListener(tabId => {
  contextByTab.delete(tabId)
})

chrome.webNavigation.onCompleted.addListener(details => {
  if (details.frameId === 0) {
    contextByTab.delete(details.tabId)
  }
})
