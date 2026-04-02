// Background Service Worker - 处理扩展后台逻辑

import { logger } from '@core/utils/logger';
import { MessagePayload, CaptureResponse } from '@core/types';

logger.setPrefix('[Doubao Background]');

type Settings = {
  theme: 'light' | 'dark' | 'auto';
  language: string;
  autoOpen: boolean;
  contextMenu: boolean;
  temperature: number;
  streamResponse: boolean;
  maxContext: number;
};

const defaultSettings: Settings = {
  theme: 'light',
  language: 'zh-CN',
  autoOpen: false,
  contextMenu: true,
  temperature: 0.7,
  streamResponse: true,
  maxContext: 10,
};

async function openChatUI(options: { windowId?: number } = {}): Promise<void> {
  const sidePanel = (chrome as any).sidePanel as { open?: (opts: { windowId: number }) => Promise<void> } | undefined;
  const url = chrome.runtime.getURL('side-panel.html');

  if (sidePanel?.open && typeof options.windowId === 'number') {
    try {
      await sidePanel.open({ windowId: options.windowId });
      return;
    } catch (error) {
      logger.warn('Side panel open failed, fallback to tab:', error);
    }
  }

  await chrome.tabs.create({
    url,
    active: true,
    ...(typeof options.windowId === 'number' ? { windowId: options.windowId } : {}),
  });
}

async function getMergedSettings(): Promise<Settings> {
  const result = await chrome.storage.local.get('settings');
  const stored = result.settings as Partial<Settings> | undefined;
  return { ...defaultSettings, ...(stored || {}) };
}

async function updateContextMenu(enabled: boolean): Promise<void> {
  if (enabled) {
    try {
      await chrome.contextMenus.create({
        id: 'doubao-ai',
        title: '使用豆包AI解释',
        contexts: ['selection'],
      });
    } catch {}
    return;
  }

  try {
    await chrome.contextMenus.remove('doubao-ai');
  } catch {}
}

// 安装/更新事件
chrome.runtime.onInstalled.addListener((details) => {
  logger.info('Extension installed/updated:', details.reason);

  (async () => {
    const existing = await chrome.storage.local.get(['settings', 'sessions']);
    const mergedSettings = { ...defaultSettings, ...(existing.settings || {}) };
    const sessions = Array.isArray(existing.sessions) ? existing.sessions : [];

    await chrome.storage.local.set({
      settings: mergedSettings,
      sessions,
    });

    await updateContextMenu(Boolean(mergedSettings.contextMenu));
  })().catch((error) => {
    logger.error('Failed to initialize storage:', error);
  });
});

// 右键菜单点击事件
chrome.contextMenus.onClicked.addListener((info, tab) => {
  if (info.menuItemId === 'doubao-ai' && info.selectionText) {
    // 打开侧边栏并发送选中的文本
    void openChatUI({ windowId: tab?.windowId });
    // 存储选中的文本供侧边栏使用
    void chrome.storage.local.set({ selectedText: info.selectionText });
  }
});

chrome.storage.onChanged.addListener((changes, areaName) => {
  if (areaName !== 'local') return;
  if (!changes.settings) return;
  const next = changes.settings.newValue as Partial<Settings> | undefined;
  updateContextMenu(Boolean(next?.contextMenu)).catch((error) => {
    logger.error('Failed to update context menu:', error);
  });
});

// 消息处理中心
chrome.runtime.onMessage.addListener((request: MessagePayload, sender, sendResponse) => {
  logger.info('Received message:', request.type, 'from:', sender.url);

  switch (request.type) {
    case 'capture':
      handleCapture(sendResponse);
      return true; // 保持消息通道开放

    case 'closePage':
      handleClosePage(request.url || '', false);
      sendResponse({ code: 0 });
      break;

    case 'closeAllPage':
      handleClosePage(request.url || '', true);
      sendResponse({ code: 0 });
      break;

    case 'getSettings':
      handleGetSettings(sendResponse);
      return true;

    case 'setSettings':
      handleSetSettings(request.data, sendResponse);
      return true;

    case 'getSessions':
      handleGetSessions(sendResponse);
      return true;

    case 'saveSession':
      handleSaveSession(request.data, sendResponse);
      return true;

    case 'openSidePanel':
      handleOpenSidePanel(request.data, sender, sendResponse);
      return true;

    case 'readPage':
      handleReadPage(sender.tab?.id, sendResponse);
      return true;

    case 'getTabInfo':
      handleGetTabInfo(sender.tab?.id, sendResponse);
      return true;

    case 'bookmarkPage':
      handleBookmarkPage(request.data, sendResponse);
      return true;

    case 'getBookmarks':
      handleGetBookmarks(sendResponse);
      return true;

    case 'ollamaChat':
      handleOllamaChat(request.data, sendResponse);
      return true;

    default:
      logger.warn('Unknown message type:', request.type);
      sendResponse({ code: -1, error: 'Unknown message type' });
  }
});

chrome.commands.onCommand.addListener((command) => {
  void handleCommand(command);
});

// 截图功能
async function handleCapture(sendResponse: (response: CaptureResponse) => void): Promise<void> {
  try {
    const dataUrl = await chrome.tabs.captureVisibleTab();
    sendResponse({ code: 0, data: dataUrl });
  } catch (error) {
    logger.error('Capture failed:', error);
    sendResponse({ code: -1, error: String(error) });
  }
}

// 关闭页面功能
async function handleClosePage(urlPrefix: string, closeAll: boolean): Promise<void> {
  try {
    const windows = await chrome.windows.getAll({ populate: true });
    const currentTab = await getCurrentTab();

    for (const window of windows) {
      for (const tab of window.tabs || []) {
        if (tab.url?.startsWith(urlPrefix)) {
          if (closeAll || tab.id !== currentTab?.id) {
            await chrome.tabs.remove(tab.id!);
          }
        }
      }
    }
  } catch (error) {
    logger.error('Close page failed:', error);
  }
}

// 获取当前标签页
async function getCurrentTab(): Promise<chrome.tabs.Tab | null> {
  const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
  return tabs[0] || null;
}

async function handleCommand(command: string): Promise<void> {
  try {
    const tab = await getCurrentTab();
    const windowId = tab?.windowId;

    if (command === 'open-side-panel') {
      await openChatUI({ windowId });
      return;
    }

    if (command === 'new-chat') {
      await chrome.storage.local.set({ pendingNewChat: true });
      await openChatUI({ windowId });
      return;
    }

    if (command === 'screenshot') {
      const dataUrl = await chrome.tabs.captureVisibleTab();
      await chrome.storage.local.set({ pendingScreenshot: dataUrl });
      await openChatUI({ windowId });
      return;
    }
  } catch (error) {
    logger.error('Command failed:', command, error);
  }
}

// 获取设置
async function handleGetSettings(sendResponse: (response: unknown) => void): Promise<void> {
  try {
    const settings = await getMergedSettings();
    sendResponse({ code: 0, data: settings });
  } catch (error) {
    sendResponse({ code: -1, error: String(error) });
  }
}

// 保存设置
async function handleSetSettings(data: unknown, sendResponse: (response: unknown) => void): Promise<void> {
  try {
    const current = await getMergedSettings();
    const next = (data && typeof data === 'object') ? (data as Partial<Settings>) : {};
    await chrome.storage.local.set({ settings: { ...current, ...next } });
    sendResponse({ code: 0 });
  } catch (error) {
    sendResponse({ code: -1, error: String(error) });
  }
}

// 获取会话列表
async function handleGetSessions(sendResponse: (response: unknown) => void): Promise<void> {
  try {
    const result = await chrome.storage.local.get('sessions');
    sendResponse({ code: 0, data: result.sessions || [] });
  } catch (error) {
    sendResponse({ code: -1, error: String(error) });
  }
}

// 保存会话
async function handleSaveSession(data: unknown, sendResponse: (response: unknown) => void): Promise<void> {
  try {
    const result = await chrome.storage.local.get('sessions');
    const sessions = result.sessions || [];
    sessions.push(data);
    await chrome.storage.local.set({ sessions });
    sendResponse({ code: 0 });
  } catch (error) {
    sendResponse({ code: -1, error: String(error) });
  }
}

async function handleOpenSidePanel(data: unknown, sender: chrome.runtime.MessageSender, sendResponse: (response: unknown) => void): Promise<void> {
  try {
    const selectedText =
      data && typeof data === 'object' && 'selectedText' in data && typeof (data as { selectedText?: unknown }).selectedText === 'string'
        ? (data as { selectedText: string }).selectedText
        : '';

    if (!selectedText) {
      sendResponse({ code: -1, error: 'Missing selectedText' });
      return;
    }

    const windowId = sender.tab?.windowId;
    await openChatUI({ windowId });

    await chrome.storage.local.set({ selectedText });
    sendResponse({ code: 0 });
  } catch (error) {
    sendResponse({ code: -1, error: String(error) });
  }
}

// 读取页面内容
async function handleReadPage(tabId: number | undefined, sendResponse: (response: unknown) => void): Promise<void> {
  try {
    if (!tabId) {
      sendResponse({ code: -1, error: 'No tab ID' });
      return;
    }

    const response = await chrome.tabs.sendMessage(tabId, { type: 'readPage' });
    sendResponse(response);
  } catch (error) {
    sendResponse({ code: -1, error: String(error) });
  }
}

// 获取标签页信息
async function handleGetTabInfo(tabId: number | undefined, sendResponse: (response: unknown) => void): Promise<void> {
  try {
    if (!tabId) {
      sendResponse({ code: -1, error: 'No tab ID' });
      return;
    }

    const tab = await chrome.tabs.get(tabId);
    sendResponse({ code: 0, data: tab });
  } catch (error) {
    sendResponse({ code: -1, error: String(error) });
  }
}

// 书签页面
async function handleBookmarkPage(data: unknown, sendResponse: (response: unknown) => void): Promise<void> {
  try {
    const bookmarkData = data as { url: string; title: string; description?: string };
    if (!bookmarkData.url || !bookmarkData.title) {
      sendResponse({ code: -1, error: 'Missing url or title' });
      return;
    }

    const bookmark = await chrome.bookmarks.create({
      title: bookmarkData.title,
      url: bookmarkData.url,
    });

    sendResponse({ code: 0, data: bookmark });
  } catch (error) {
    sendResponse({ code: -1, error: String(error) });
  }
}

// 获取书签列表
async function handleGetBookmarks(sendResponse: (response: unknown) => void): Promise<void> {
  try {
    const bookmarks = await chrome.bookmarks.getTree();
    sendResponse({ code: 0, data: bookmarks });
  } catch (error) {
    sendResponse({ code: -1, error: String(error) });
  }
}

// 处理Ollama聊天请求
async function handleOllamaChat(data: unknown, sendResponse: (response: unknown) => void): Promise<void> {
  try {
    const chatData = data as { model?: string; messages?: Array<{ role: string; content: string }>; stream?: boolean };
    if (!chatData.model || !chatData.messages || !Array.isArray(chatData.messages)) {
      sendResponse({ code: -1, error: 'Missing model or messages' });
      return;
    }

    // 通过Web应用的代理向Ollama服务发送请求，避免CORS问题
    try {
      const response = await fetch('http://localhost:3000/api/ollama/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: chatData.model,
          messages: chatData.messages,
          stream: chatData.stream || false,
        }),
      });

      if (!response.ok) {
        sendResponse({ code: -1, error: `Ollama 服务请求失败：${response.statusText}` });
        return;
      }

      const responseData = await response.json();
      sendResponse({ code: 0, data: responseData });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      logger.error('Ollama chat failed:', error);
      sendResponse({ 
        code: -1, 
        error: `无法连接到Web应用代理 (${errorMessage})。请确保Web应用已启动，地址：http://localhost:3000` 
      });
    }
  } catch (error) {
    logger.error('Ollama chat failed:', error);
    sendResponse({ code: -1, error: String(error) });
  }
}

// 标签页更新事件 - 用于注入内容脚本
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (changeInfo.status === 'complete' && tab.url) {
    // 可以在这里根据URL进行特定处理
    logger.debug('Tab updated:', tab.url);
  }
});
