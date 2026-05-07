/**
 * Web Bridge - 用于 Web 应用与浏览器扩展之间的通信桥接
 * 注入到 Web 应用页面中，提供与扩展的通信能力
 */

import { logger } from '@core/utils/logger';

logger.setPrefix('[Doubao WebBridge]');

// 声明全局类型
declare global {
  interface Window {
    doubaoExtension?: {
      isAvailable: boolean;
      version: string;
      extractWithBrowserState: (options: {
        url: string;
        maxChars?: number;
        includeCookies?: boolean;
        includeDetailedReport?: boolean;
      }) => Promise<unknown>;
      checkLoginState: (url: string) => Promise<unknown>;
      openInNewTab: (url: string) => Promise<void>;
    };
  }
}

// 检查扩展是否可用
async function checkExtensionAvailable(): Promise<{ available: boolean; version?: string }> {
  return new Promise((resolve) => {
    if (typeof chrome === 'undefined' || !chrome.runtime) {
      resolve({ available: false });
      return;
    }

    chrome.runtime.sendMessage({ type: 'ping' }, (response) => {
      if (chrome.runtime.lastError) {
        resolve({ available: false });
      } else {
        resolve({ available: !!response, version: response?.version });
      }
    });

    setTimeout(() => resolve({ available: false }), 1000);
  });
}

// 查找匹配的标签页
async function findMatchingTabs(urlPattern: string): Promise<chrome.tabs.Tab[]> {
  return new Promise((resolve, reject) => {
    if (typeof chrome === 'undefined' || !chrome.tabs) {
      reject(new Error('Chrome tabs API not available'));
      return;
    }

    const queryUrl = urlPattern.replace(/\*$/, '') + '*';

    chrome.tabs.query({ url: queryUrl }, (tabs) => {
      if (chrome.runtime.lastError) {
        reject(new Error(chrome.runtime.lastError.message));
        return;
      }

      const sortedTabs = tabs
        .filter(tab => tab.url && tab.id)
        .sort((a, b) => (b.lastAccessed || 0) - (a.lastAccessed || 0));

      resolve(sortedTabs);
    });
  });
}

// 使用浏览器状态提取内容
async function extractWithBrowserState(options: {
  url: string;
  maxChars?: number;
  includeCookies?: boolean;
  includeDetailedReport?: boolean;
}): Promise<unknown> {
  const { url, maxChars = 120_000, includeCookies = false, includeDetailedReport = false } = options;

  const matchingTabs = await findMatchingTabs(url);

  if (matchingTabs.length === 0) {
    throw new Error('未找到匹配的标签页，请先打开并登录该网站');
  }

  const targetTab = matchingTabs[0];

  if (!targetTab.id) {
    throw new Error('目标标签页无效');
  }

  const tabId = targetTab.id;

  return new Promise((resolve, reject) => {
    const timeoutId = setTimeout(() => {
      reject(new Error('提取请求超时'));
    }, 30000);

    chrome.tabs.sendMessage(
      tabId,
      {
        type: 'extractWithBrowserState',
        maxChars,
        includeCookies,
        includeDetailedReport,
      },
      (response) => {
        clearTimeout(timeoutId);

        if (chrome.runtime.lastError) {
          reject(new Error(chrome.runtime.lastError.message));
          return;
        }

        if (!response) {
          reject(new Error('未收到响应'));
          return;
        }

        if (response.code !== 0) {
          reject(new Error(response.error || '提取失败'));
          return;
        }

        resolve(response.data);
      }
    );
  });
}

// 检查登录状态
async function checkLoginState(url: string): Promise<unknown> {
  const matchingTabs = await findMatchingTabs(url);

  if (matchingTabs.length === 0) {
    throw new Error('未找到匹配的标签页');
  }

  const targetTab = matchingTabs[0];

  if (!targetTab.id) {
    throw new Error('目标标签页无效');
  }

  const tabId = targetTab.id;

  return new Promise((resolve, reject) => {
    const timeoutId = setTimeout(() => {
      reject(new Error('检查登录状态超时'));
    }, 10000);

    chrome.tabs.sendMessage(
      tabId,
      { type: 'checkLoginState' },
      (response) => {
        clearTimeout(timeoutId);

        if (chrome.runtime.lastError) {
          reject(new Error(chrome.runtime.lastError.message));
          return;
        }

        if (!response) {
          reject(new Error('未收到响应'));
          return;
        }

        if (response.code !== 0) {
          reject(new Error(response.error || '检查登录状态失败'));
          return;
        }

        resolve(response.data);
      }
    );
  });
}

// 打开新标签页
async function openInNewTab(url: string): Promise<void> {
  return new Promise((resolve, reject) => {
    if (typeof chrome === 'undefined' || !chrome.tabs) {
      window.open(url, '_blank');
      resolve();
      return;
    }

    chrome.tabs.create({ url, active: true }, (tab) => {
      if (chrome.runtime.lastError) {
        reject(new Error(chrome.runtime.lastError.message));
        return;
      }
      resolve();
    });
  });
}

// 初始化 Web Bridge
async function initWebBridge(): Promise<void> {
  logger.info('Initializing Web Bridge...');

  const { available, version } = await checkExtensionAvailable();

  if (!available) {
    logger.warn('Extension not available');
    window.doubaoExtension = {
      isAvailable: false,
      version: '',
      extractWithBrowserState: async () => {
        throw new Error('浏览器扩展未安装或未启用');
      },
      checkLoginState: async () => {
        throw new Error('浏览器扩展未安装或未启用');
      },
      openInNewTab,
    };
    return;
  }

  logger.info('Extension available, version:', version);

  window.doubaoExtension = {
    isAvailable: true,
    version: version || '',
    extractWithBrowserState,
    checkLoginState,
    openInNewTab,
  };

  // 触发自定义事件通知 Web 应用
  window.dispatchEvent(new CustomEvent('doubao-extension-ready', {
    detail: { version },
  }));
}

// 自动初始化
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initWebBridge);
} else {
  initWebBridge();
}

export { initWebBridge };
