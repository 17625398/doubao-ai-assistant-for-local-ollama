// Popup 主逻辑

import { logger } from '@core/utils/logger';

logger.setPrefix('[Doubao Popup]');

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

class Popup {
  constructor() {
    this.init();
  }

  private init(): void {
    this.setupEventListeners();
    this.loadRecentSessions();
    logger.info('Popup initialized');
  }

  private setupEventListeners(): void {
    // 打开侧边栏
    document.getElementById('open-sidepanel')?.addEventListener('click', async () => {
      try {
        const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
        await openChatUI({ windowId: tab?.windowId });
        window.close();
      } catch (error) {
        logger.error('Failed to open side panel:', error);
      }
    });

    // 新建对话
    document.getElementById('new-chat')?.addEventListener('click', async () => {
      try {
        await chrome.storage.local.set({ pendingNewChat: true });

        // 打开侧边栏
        const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
        await openChatUI({ windowId: tab?.windowId });
        window.close();
      } catch (error) {
        logger.error('Failed to create new chat:', error);
      }
    });

    // 截图提问
    document.getElementById('capture-page')?.addEventListener('click', async () => {
      try {
        const response = await chrome.runtime.sendMessage({ type: 'capture' });
        if (response.code === 0) {
          // 存储截图并打开侧边栏
          await chrome.storage.local.set({
            pendingScreenshot: response.data,
          });

          const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
          await openChatUI({ windowId: tab?.windowId });
        }
        window.close();
      } catch (error) {
        logger.error('Failed to capture:', error);
      }
    });

    document.getElementById('read-page')?.addEventListener('click', async () => {
      try {
        await chrome.storage.local.set({ pendingReadPage: true });
        const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
        await openChatUI({ windowId: tab?.windowId });
        window.close();
      } catch (error) {
        logger.error('Failed to read page:', error);
      }
    });

    // 打开设置
    document.getElementById('open-settings')?.addEventListener('click', () => {
      chrome.runtime.openOptionsPage();
      window.close();
    });

    // 打开完整页面
    document.getElementById('open-full')?.addEventListener('click', () => {
      chrome.tabs.create({ url: 'https://www.doubao.com/chat' });
      window.close();
    });
  }

  private async loadRecentSessions(): Promise<void> {
    try {
      const result = await chrome.storage.local.get('sessions');
      const sessions = result.sessions || [];
      const sessionsList = document.getElementById('sessions-list');

      if (sessionsList && sessions.length > 0) {
        sessionsList.innerHTML = sessions
          .slice(-5)
          .reverse()
          .map((session: { id: string; title: string }) => `
            <li data-session-id="${session.id}">
              ${session.title}
            </li>
          `)
          .join('');

        // 添加点击事件
        sessionsList.querySelectorAll('li').forEach((li) => {
          li.addEventListener('click', async () => {
            const sessionId = li.getAttribute('data-session-id');
            if (sessionId) {
              // 加载选中的会话
              const session = sessions.find((s: { id: string }) => s.id === sessionId);
              if (session) {
                await chrome.storage.local.set({ currentSession: session });
                const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
                await openChatUI({ windowId: tab?.windowId });
                window.close();
              }
            }
          });
        });
      }
    } catch (error) {
      logger.error('Failed to load sessions:', error);
    }
  }
}

// 初始化
document.addEventListener('DOMContentLoaded', () => {
  new Popup();
});
