/**
 * Pre-inject script - 在 document_start 时注入
 * 用于提前初始化一些必要的功能
 */

import { logger } from '@core/utils/logger';

logger.setPrefix('[Doubao PreInject]');

// 声明全局类型
declare global {
  interface Window {
    __doubaoContentScriptReady?: boolean;
    __doubaoCheckReady?: () => boolean | undefined;
  }
}

// 标记内容脚本已加载
window.__doubaoContentScriptReady = false;

// 通知后台脚本内容脚本已准备就绪
function notifyReady() {
  if (typeof chrome !== 'undefined' && chrome.runtime) {
    chrome.runtime.sendMessage({ type: 'contentScriptReady', url: window.location.href });
  }
}

// 页面加载完成后标记为就绪
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    window.__doubaoContentScriptReady = true;
    notifyReady();
    logger.info('Content script ready (DOMContentLoaded)');
  });
} else {
  window.__doubaoContentScriptReady = true;
  notifyReady();
  logger.info('Content script ready (already loaded)');
}

// 导出全局函数供调试
window.__doubaoCheckReady = function() {
  return window.__doubaoContentScriptReady;
};

logger.info('Pre-inject script loaded');
