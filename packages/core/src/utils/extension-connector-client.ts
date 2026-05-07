/**
 * 浏览器扩展连接器（客户端）
 * 用于在浏览器环境中与扩展通信
 */

export interface ExtractWithBrowserStateOptions {
  url: string;
  maxChars?: number;
  includeCookies?: boolean;
  includeDetailedReport?: boolean;
  timeout?: number;
}

export interface ExtractWithBrowserStateResult {
  success: boolean;
  content: string;
  title?: string;
  url: string;
  loginState: {
    isLoggedIn: boolean;
    confidence: 'high' | 'medium' | 'low';
    indicators: {
      hasLogoutButton: boolean;
      hasUserAvatar: boolean;
      hasUsername: boolean;
      hasUserMenu: boolean;
      noLoginForm: boolean;
      hasSessionCookie: boolean;
    };
    username?: string;
    userId?: string;
    avatarUrl?: string;
  };
  detailedReport?: {
    state: unknown;
    url: string;
    timestamp: string;
    cookies: string;
    localStorage: Record<string, string>;
    sessionStorage: Record<string, string>;
  };
  cookies?: string;
  timestamp: string;
  error?: string;
}

export interface ChromeTab {
  id?: number;
  url?: string;
  title?: string;
  active?: boolean;
  lastAccessed?: number;
}

/**
 * 检查浏览器扩展是否可用
 */
export async function isExtensionAvailable(): Promise<boolean> {
  return new Promise((resolve) => {
    if (typeof chrome === 'undefined' || !chrome.runtime) {
      resolve(false);
      return;
    }

    chrome.runtime.sendMessage({ type: 'ping' }, (response) => {
      if (chrome.runtime.lastError) {
        resolve(false);
      } else {
        resolve(!!response);
      }
    });

    setTimeout(() => resolve(false), 1000);
  });
}

/**
 * 查询匹配的标签页
 */
export async function findMatchingTabs(urlPattern: string): Promise<ChromeTab[]> {
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

      resolve(sortedTabs as ChromeTab[]);
    });
  });
}

/**
 * 使用浏览器状态提取内容
 */
export async function extractWithBrowserState(
  options: ExtractWithBrowserStateOptions
): Promise<ExtractWithBrowserStateResult> {
  const { url, maxChars = 120_000, includeCookies = false, includeDetailedReport = false, timeout = 30000 } = options;

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
    }, timeout);

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

        resolve(response.data as ExtractWithBrowserStateResult);
      }
    );
  });
}

/**
 * 检查指定 URL 的登录状态
 */
export async function checkLoginState(url: string): Promise<{
  success: boolean;
  loginState: ExtractWithBrowserStateResult['loginState'];
  url: string;
  timestamp: string;
  error?: string;
}> {
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

/**
 * 打开指定 URL 的新标签页
 */
export async function openInNewTab(url: string): Promise<void> {
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

/**
 * 错误分类和处理
 */
export function classifyExtensionError(error: Error): {
  type: 'not-installed' | 'not-found' | 'not-logged-in' | 'timeout' | 'permission' | 'unknown';
  message: string;
  solution: string;
} {
  const errorMessage = error.message.toLowerCase();

  if (errorMessage.includes('chrome runtime not available') || 
      errorMessage.includes('could not establish connection')) {
    return {
      type: 'not-installed',
      message: '浏览器扩展未安装或未启用',
      solution: '请安装AI智能分析平台AI助手浏览器扩展，并确保已启用',
    };
  }

  if (errorMessage.includes('未找到匹配的标签页')) {
    return {
      type: 'not-found',
      message: '未找到目标网站的标签页',
      solution: '请先在新标签页中打开目标网站并登录',
    };
  }

  if (errorMessage.includes('未登录') || errorMessage.includes('登录')) {
    return {
      type: 'not-logged-in',
      message: '目标网站未登录',
      solution: '请在目标网站标签页中完成登录',
    };
  }

  if (errorMessage.includes('timeout') || errorMessage.includes('超时')) {
    return {
      type: 'timeout',
      message: '请求超时',
      solution: '请检查网络连接，或稍后重试',
    };
  }

  if (errorMessage.includes('permission') || errorMessage.includes('权限')) {
    return {
      type: 'permission',
      message: '权限不足',
      solution: '请检查扩展权限设置，确保已授予必要的权限',
    };
  }

  return {
    type: 'unknown',
    message: error.message,
    solution: '请刷新页面后重试，或联系技术支持',
  };
}
