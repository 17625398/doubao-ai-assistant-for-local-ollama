/******/ (() => { // webpackBootstrap
/******/ 	"use strict";
/******/ 	var __webpack_modules__ = ({

/***/ "../core/src/utils/logger.ts"
/*!***********************************!*\
  !*** ../core/src/utils/logger.ts ***!
  \***********************************/
(__unused_webpack_module, __webpack_exports__, __webpack_require__) {

__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   LogLevel: () => (/* binding */ LogLevel),
/* harmony export */   Logger: () => (/* binding */ Logger),
/* harmony export */   logger: () => (/* binding */ logger)
/* harmony export */ });
// 日志工具
var LogLevel;
(function (LogLevel) {
    LogLevel[LogLevel["DEBUG"] = 0] = "DEBUG";
    LogLevel[LogLevel["INFO"] = 1] = "INFO";
    LogLevel[LogLevel["WARN"] = 2] = "WARN";
    LogLevel[LogLevel["ERROR"] = 3] = "ERROR";
})(LogLevel || (LogLevel = {}));
class Logger {
    constructor() {
        this.level = LogLevel.DEBUG;
        this.prefix = '[Doubao]';
    }
    static getInstance() {
        if (!Logger.instance) {
            Logger.instance = new Logger();
        }
        return Logger.instance;
    }
    setLevel(level) {
        this.level = level;
    }
    setPrefix(prefix) {
        this.prefix = prefix;
    }
    debug(...args) {
        if (this.level <= LogLevel.DEBUG) {
            console.log(this.prefix, '[DEBUG]', ...args);
        }
    }
    info(...args) {
        if (this.level <= LogLevel.INFO) {
            console.info(this.prefix, '[INFO]', ...args);
        }
    }
    warn(...args) {
        if (this.level <= LogLevel.WARN) {
            console.warn(this.prefix, '[WARN]', ...args);
        }
    }
    error(...args) {
        if (this.level <= LogLevel.ERROR) {
            console.error(this.prefix, '[ERROR]', ...args);
        }
    }
}
const logger = Logger.getInstance();
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibG9nZ2VyLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vLi4vLi4vLi4vY29yZS9zcmMvdXRpbHMvbG9nZ2VyLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBLE9BQU87QUFFUCxNQUFNLENBQU4sSUFBWSxRQUtYO0FBTEQsV0FBWSxRQUFRO0lBQ2xCLHlDQUFTLENBQUE7SUFDVCx1Q0FBUSxDQUFBO0lBQ1IsdUNBQVEsQ0FBQTtJQUNSLHlDQUFTLENBQUE7QUFDWCxDQUFDLEVBTFcsUUFBUSxLQUFSLFFBQVEsUUFLbkI7QUFFRCxNQUFNLE9BQU8sTUFBTTtJQUFuQjtRQUVVLFVBQUssR0FBYSxRQUFRLENBQUMsS0FBSyxDQUFDO1FBQ2pDLFdBQU0sR0FBVyxVQUFVLENBQUM7SUF3Q3RDLENBQUM7SUF0Q0MsTUFBTSxDQUFDLFdBQVc7UUFDaEIsSUFBSSxDQUFDLE1BQU0sQ0FBQyxRQUFRLEVBQUUsQ0FBQztZQUNyQixNQUFNLENBQUMsUUFBUSxHQUFHLElBQUksTUFBTSxFQUFFLENBQUM7UUFDakMsQ0FBQztRQUNELE9BQU8sTUFBTSxDQUFDLFFBQVEsQ0FBQztJQUN6QixDQUFDO0lBRUQsUUFBUSxDQUFDLEtBQWU7UUFDdEIsSUFBSSxDQUFDLEtBQUssR0FBRyxLQUFLLENBQUM7SUFDckIsQ0FBQztJQUVELFNBQVMsQ0FBQyxNQUFjO1FBQ3RCLElBQUksQ0FBQyxNQUFNLEdBQUcsTUFBTSxDQUFDO0lBQ3ZCLENBQUM7SUFFRCxLQUFLLENBQUMsR0FBRyxJQUFlO1FBQ3RCLElBQUksSUFBSSxDQUFDLEtBQUssSUFBSSxRQUFRLENBQUMsS0FBSyxFQUFFLENBQUM7WUFDakMsT0FBTyxDQUFDLEdBQUcsQ0FBQyxJQUFJLENBQUMsTUFBTSxFQUFFLFNBQVMsRUFBRSxHQUFHLElBQUksQ0FBQyxDQUFDO1FBQy9DLENBQUM7SUFDSCxDQUFDO0lBRUQsSUFBSSxDQUFDLEdBQUcsSUFBZTtRQUNyQixJQUFJLElBQUksQ0FBQyxLQUFLLElBQUksUUFBUSxDQUFDLElBQUksRUFBRSxDQUFDO1lBQ2hDLE9BQU8sQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLE1BQU0sRUFBRSxRQUFRLEVBQUUsR0FBRyxJQUFJLENBQUMsQ0FBQztRQUMvQyxDQUFDO0lBQ0gsQ0FBQztJQUVELElBQUksQ0FBQyxHQUFHLElBQWU7UUFDckIsSUFBSSxJQUFJLENBQUMsS0FBSyxJQUFJLFFBQVEsQ0FBQyxJQUFJLEVBQUUsQ0FBQztZQUNoQyxPQUFPLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxNQUFNLEVBQUUsUUFBUSxFQUFFLEdBQUcsSUFBSSxDQUFDLENBQUM7UUFDL0MsQ0FBQztJQUNILENBQUM7SUFFRCxLQUFLLENBQUMsR0FBRyxJQUFlO1FBQ3RCLElBQUksSUFBSSxDQUFDLEtBQUssSUFBSSxRQUFRLENBQUMsS0FBSyxFQUFFLENBQUM7WUFDakMsT0FBTyxDQUFDLEtBQUssQ0FBQyxJQUFJLENBQUMsTUFBTSxFQUFFLFNBQVMsRUFBRSxHQUFHLElBQUksQ0FBQyxDQUFDO1FBQ2pELENBQUM7SUFDSCxDQUFDO0NBQ0Y7QUFFRCxNQUFNLENBQUMsTUFBTSxNQUFNLEdBQUcsTUFBTSxDQUFDLFdBQVcsRUFBRSxDQUFDIiwic291cmNlc0NvbnRlbnQiOlsiLy8g5pel5b+X5bel5YW3XG5cbmV4cG9ydCBlbnVtIExvZ0xldmVsIHtcbiAgREVCVUcgPSAwLFxuICBJTkZPID0gMSxcbiAgV0FSTiA9IDIsXG4gIEVSUk9SID0gM1xufVxuXG5leHBvcnQgY2xhc3MgTG9nZ2VyIHtcbiAgcHJpdmF0ZSBzdGF0aWMgaW5zdGFuY2U6IExvZ2dlcjtcbiAgcHJpdmF0ZSBsZXZlbDogTG9nTGV2ZWwgPSBMb2dMZXZlbC5ERUJVRztcbiAgcHJpdmF0ZSBwcmVmaXg6IHN0cmluZyA9ICdbRG91YmFvXSc7XG5cbiAgc3RhdGljIGdldEluc3RhbmNlKCk6IExvZ2dlciB7XG4gICAgaWYgKCFMb2dnZXIuaW5zdGFuY2UpIHtcbiAgICAgIExvZ2dlci5pbnN0YW5jZSA9IG5ldyBMb2dnZXIoKTtcbiAgICB9XG4gICAgcmV0dXJuIExvZ2dlci5pbnN0YW5jZTtcbiAgfVxuXG4gIHNldExldmVsKGxldmVsOiBMb2dMZXZlbCk6IHZvaWQge1xuICAgIHRoaXMubGV2ZWwgPSBsZXZlbDtcbiAgfVxuXG4gIHNldFByZWZpeChwcmVmaXg6IHN0cmluZyk6IHZvaWQge1xuICAgIHRoaXMucHJlZml4ID0gcHJlZml4O1xuICB9XG5cbiAgZGVidWcoLi4uYXJnczogdW5rbm93bltdKTogdm9pZCB7XG4gICAgaWYgKHRoaXMubGV2ZWwgPD0gTG9nTGV2ZWwuREVCVUcpIHtcbiAgICAgIGNvbnNvbGUubG9nKHRoaXMucHJlZml4LCAnW0RFQlVHXScsIC4uLmFyZ3MpO1xuICAgIH1cbiAgfVxuXG4gIGluZm8oLi4uYXJnczogdW5rbm93bltdKTogdm9pZCB7XG4gICAgaWYgKHRoaXMubGV2ZWwgPD0gTG9nTGV2ZWwuSU5GTykge1xuICAgICAgY29uc29sZS5pbmZvKHRoaXMucHJlZml4LCAnW0lORk9dJywgLi4uYXJncyk7XG4gICAgfVxuICB9XG5cbiAgd2FybiguLi5hcmdzOiB1bmtub3duW10pOiB2b2lkIHtcbiAgICBpZiAodGhpcy5sZXZlbCA8PSBMb2dMZXZlbC5XQVJOKSB7XG4gICAgICBjb25zb2xlLndhcm4odGhpcy5wcmVmaXgsICdbV0FSTl0nLCAuLi5hcmdzKTtcbiAgICB9XG4gIH1cblxuICBlcnJvciguLi5hcmdzOiB1bmtub3duW10pOiB2b2lkIHtcbiAgICBpZiAodGhpcy5sZXZlbCA8PSBMb2dMZXZlbC5FUlJPUikge1xuICAgICAgY29uc29sZS5lcnJvcih0aGlzLnByZWZpeCwgJ1tFUlJPUl0nLCAuLi5hcmdzKTtcbiAgICB9XG4gIH1cbn1cblxuZXhwb3J0IGNvbnN0IGxvZ2dlciA9IExvZ2dlci5nZXRJbnN0YW5jZSgpO1xuIl19

/***/ }

/******/ 	});
/************************************************************************/
/******/ 	// The module cache
/******/ 	var __webpack_module_cache__ = {};
/******/ 	
/******/ 	// The require function
/******/ 	function __webpack_require__(moduleId) {
/******/ 		// Check if module is in cache
/******/ 		var cachedModule = __webpack_module_cache__[moduleId];
/******/ 		if (cachedModule !== undefined) {
/******/ 			return cachedModule.exports;
/******/ 		}
/******/ 		// Create a new module (and put it into the cache)
/******/ 		var module = __webpack_module_cache__[moduleId] = {
/******/ 			// no module.id needed
/******/ 			// no module.loaded needed
/******/ 			exports: {}
/******/ 		};
/******/ 	
/******/ 		// Execute the module function
/******/ 		if (!(moduleId in __webpack_modules__)) {
/******/ 			delete __webpack_module_cache__[moduleId];
/******/ 			var e = new Error("Cannot find module '" + moduleId + "'");
/******/ 			e.code = 'MODULE_NOT_FOUND';
/******/ 			throw e;
/******/ 		}
/******/ 		__webpack_modules__[moduleId](module, module.exports, __webpack_require__);
/******/ 	
/******/ 		// Return the exports of the module
/******/ 		return module.exports;
/******/ 	}
/******/ 	
/************************************************************************/
/******/ 	/* webpack/runtime/define property getters */
/******/ 	(() => {
/******/ 		// define getter functions for harmony exports
/******/ 		__webpack_require__.d = (exports, definition) => {
/******/ 			for(var key in definition) {
/******/ 				if(__webpack_require__.o(definition, key) && !__webpack_require__.o(exports, key)) {
/******/ 					Object.defineProperty(exports, key, { enumerable: true, get: definition[key] });
/******/ 				}
/******/ 			}
/******/ 		};
/******/ 	})();
/******/ 	
/******/ 	/* webpack/runtime/hasOwnProperty shorthand */
/******/ 	(() => {
/******/ 		__webpack_require__.o = (obj, prop) => (Object.prototype.hasOwnProperty.call(obj, prop))
/******/ 	})();
/******/ 	
/******/ 	/* webpack/runtime/make namespace object */
/******/ 	(() => {
/******/ 		// define __esModule on exports
/******/ 		__webpack_require__.r = (exports) => {
/******/ 			if(typeof Symbol !== 'undefined' && Symbol.toStringTag) {
/******/ 				Object.defineProperty(exports, Symbol.toStringTag, { value: 'Module' });
/******/ 			}
/******/ 			Object.defineProperty(exports, '__esModule', { value: true });
/******/ 		};
/******/ 	})();
/******/ 	
/************************************************************************/
var __webpack_exports__ = {};
// This entry needs to be wrapped in an IIFE because it needs to be isolated against other modules in the chunk.
(() => {
/*!*********************************!*\
  !*** ./src/background/index.ts ***!
  \*********************************/
__webpack_require__.r(__webpack_exports__);
/* harmony import */ var _core_utils_logger__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! @core/utils/logger */ "../core/src/utils/logger.ts");
// Background Service Worker - 处理扩展后台逻辑

_core_utils_logger__WEBPACK_IMPORTED_MODULE_0__.logger.setPrefix('[Doubao Background]');
const defaultSettings = {
    theme: 'light',
    language: 'zh-CN',
    autoOpen: false,
    contextMenu: true,
    temperature: 0.7,
    streamResponse: true,
    maxContext: 10,
};
async function openChatUI(options = {}) {
    const sidePanel = chrome.sidePanel;
    const url = chrome.runtime.getURL('side-panel.html');
    if (sidePanel?.open && typeof options.windowId === 'number') {
        try {
            await sidePanel.open({ windowId: options.windowId });
            return;
        }
        catch (error) {
            _core_utils_logger__WEBPACK_IMPORTED_MODULE_0__.logger.warn('Side panel open failed, fallback to tab:', error);
        }
    }
    await chrome.tabs.create({
        url,
        active: true,
        ...(typeof options.windowId === 'number' ? { windowId: options.windowId } : {}),
    });
}
async function getMergedSettings() {
    const result = await chrome.storage.local.get('settings');
    const stored = result.settings;
    return { ...defaultSettings, ...(stored || {}) };
}
async function updateContextMenu(enabled) {
    if (enabled) {
        try {
            await chrome.contextMenus.create({
                id: 'doubao-ai',
                title: '使用豆包AI解释',
                contexts: ['selection'],
            });
        }
        catch { }
        return;
    }
    try {
        await chrome.contextMenus.remove('doubao-ai');
    }
    catch { }
}
// 安装/更新事件
chrome.runtime.onInstalled.addListener((details) => {
    _core_utils_logger__WEBPACK_IMPORTED_MODULE_0__.logger.info('Extension installed/updated:', details.reason);
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
        _core_utils_logger__WEBPACK_IMPORTED_MODULE_0__.logger.error('Failed to initialize storage:', error);
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
    if (areaName !== 'local')
        return;
    if (!changes.settings)
        return;
    const next = changes.settings.newValue;
    updateContextMenu(Boolean(next?.contextMenu)).catch((error) => {
        _core_utils_logger__WEBPACK_IMPORTED_MODULE_0__.logger.error('Failed to update context menu:', error);
    });
});
// 消息处理中心
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    _core_utils_logger__WEBPACK_IMPORTED_MODULE_0__.logger.info('Received message:', request.type, 'from:', sender.url);
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
            _core_utils_logger__WEBPACK_IMPORTED_MODULE_0__.logger.warn('Unknown message type:', request.type);
            sendResponse({ code: -1, error: 'Unknown message type' });
    }
});
chrome.commands.onCommand.addListener((command) => {
    void handleCommand(command);
});
// 截图功能
async function handleCapture(sendResponse) {
    try {
        const dataUrl = await chrome.tabs.captureVisibleTab();
        sendResponse({ code: 0, data: dataUrl });
    }
    catch (error) {
        _core_utils_logger__WEBPACK_IMPORTED_MODULE_0__.logger.error('Capture failed:', error);
        sendResponse({ code: -1, error: String(error) });
    }
}
// 关闭页面功能
async function handleClosePage(urlPrefix, closeAll) {
    try {
        const windows = await chrome.windows.getAll({ populate: true });
        const currentTab = await getCurrentTab();
        for (const window of windows) {
            for (const tab of window.tabs || []) {
                if (tab.url?.startsWith(urlPrefix)) {
                    if (closeAll || tab.id !== currentTab?.id) {
                        await chrome.tabs.remove(tab.id);
                    }
                }
            }
        }
    }
    catch (error) {
        _core_utils_logger__WEBPACK_IMPORTED_MODULE_0__.logger.error('Close page failed:', error);
    }
}
// 获取当前标签页
async function getCurrentTab() {
    const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
    return tabs[0] || null;
}
async function handleCommand(command) {
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
    }
    catch (error) {
        _core_utils_logger__WEBPACK_IMPORTED_MODULE_0__.logger.error('Command failed:', command, error);
    }
}
// 获取设置
async function handleGetSettings(sendResponse) {
    try {
        const settings = await getMergedSettings();
        sendResponse({ code: 0, data: settings });
    }
    catch (error) {
        sendResponse({ code: -1, error: String(error) });
    }
}
// 保存设置
async function handleSetSettings(data, sendResponse) {
    try {
        const current = await getMergedSettings();
        const next = (data && typeof data === 'object') ? data : {};
        await chrome.storage.local.set({ settings: { ...current, ...next } });
        sendResponse({ code: 0 });
    }
    catch (error) {
        sendResponse({ code: -1, error: String(error) });
    }
}
// 获取会话列表
async function handleGetSessions(sendResponse) {
    try {
        const result = await chrome.storage.local.get('sessions');
        sendResponse({ code: 0, data: result.sessions || [] });
    }
    catch (error) {
        sendResponse({ code: -1, error: String(error) });
    }
}
// 保存会话
async function handleSaveSession(data, sendResponse) {
    try {
        const result = await chrome.storage.local.get('sessions');
        const sessions = result.sessions || [];
        sessions.push(data);
        await chrome.storage.local.set({ sessions });
        sendResponse({ code: 0 });
    }
    catch (error) {
        sendResponse({ code: -1, error: String(error) });
    }
}
async function handleOpenSidePanel(data, sender, sendResponse) {
    try {
        const selectedText = data && typeof data === 'object' && 'selectedText' in data && typeof data.selectedText === 'string'
            ? data.selectedText
            : '';
        if (!selectedText) {
            sendResponse({ code: -1, error: 'Missing selectedText' });
            return;
        }
        const windowId = sender.tab?.windowId;
        await openChatUI({ windowId });
        await chrome.storage.local.set({ selectedText });
        sendResponse({ code: 0 });
    }
    catch (error) {
        sendResponse({ code: -1, error: String(error) });
    }
}
// 读取页面内容
async function handleReadPage(tabId, sendResponse) {
    try {
        if (!tabId) {
            sendResponse({ code: -1, error: 'No tab ID' });
            return;
        }
        const response = await chrome.tabs.sendMessage(tabId, { type: 'readPage' });
        sendResponse(response);
    }
    catch (error) {
        sendResponse({ code: -1, error: String(error) });
    }
}
// 获取标签页信息
async function handleGetTabInfo(tabId, sendResponse) {
    try {
        if (!tabId) {
            sendResponse({ code: -1, error: 'No tab ID' });
            return;
        }
        const tab = await chrome.tabs.get(tabId);
        sendResponse({ code: 0, data: tab });
    }
    catch (error) {
        sendResponse({ code: -1, error: String(error) });
    }
}
// 书签页面
async function handleBookmarkPage(data, sendResponse) {
    try {
        const bookmarkData = data;
        if (!bookmarkData.url || !bookmarkData.title) {
            sendResponse({ code: -1, error: 'Missing url or title' });
            return;
        }
        const bookmark = await chrome.bookmarks.create({
            title: bookmarkData.title,
            url: bookmarkData.url,
        });
        sendResponse({ code: 0, data: bookmark });
    }
    catch (error) {
        sendResponse({ code: -1, error: String(error) });
    }
}
// 获取书签列表
async function handleGetBookmarks(sendResponse) {
    try {
        const bookmarks = await chrome.bookmarks.getTree();
        sendResponse({ code: 0, data: bookmarks });
    }
    catch (error) {
        sendResponse({ code: -1, error: String(error) });
    }
}
// 处理Ollama聊天请求
async function handleOllamaChat(data, sendResponse) {
    try {
        const chatData = data;
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
        }
        catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            _core_utils_logger__WEBPACK_IMPORTED_MODULE_0__.logger.error('Ollama chat failed:', error);
            sendResponse({
                code: -1,
                error: `无法连接到Web应用代理 (${errorMessage})。请确保Web应用已启动，地址：http://localhost:3000`
            });
        }
    }
    catch (error) {
        _core_utils_logger__WEBPACK_IMPORTED_MODULE_0__.logger.error('Ollama chat failed:', error);
        sendResponse({ code: -1, error: String(error) });
    }
}
// 标签页更新事件 - 用于注入内容脚本
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
    if (changeInfo.status === 'complete' && tab.url) {
        // 可以在这里根据URL进行特定处理
        _core_utils_logger__WEBPACK_IMPORTED_MODULE_0__.logger.debug('Tab updated:', tab.url);
    }
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaW5kZXguanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi8uLi8uLi9zcmMvYmFja2dyb3VuZC9pbmRleC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQSx1Q0FBdUM7QUFFdkMsT0FBTyxFQUFFLE1BQU0sRUFBRSxNQUFNLG9CQUFvQixDQUFDO0FBRzVDLE1BQU0sQ0FBQyxTQUFTLENBQUMscUJBQXFCLENBQUMsQ0FBQztBQVl4QyxNQUFNLGVBQWUsR0FBYTtJQUNoQyxLQUFLLEVBQUUsT0FBTztJQUNkLFFBQVEsRUFBRSxPQUFPO0lBQ2pCLFFBQVEsRUFBRSxLQUFLO0lBQ2YsV0FBVyxFQUFFLElBQUk7SUFDakIsV0FBVyxFQUFFLEdBQUc7SUFDaEIsY0FBYyxFQUFFLElBQUk7SUFDcEIsVUFBVSxFQUFFLEVBQUU7Q0FDZixDQUFDO0FBRUYsS0FBSyxVQUFVLFVBQVUsQ0FBQyxVQUFpQyxFQUFFO0lBQzNELE1BQU0sU0FBUyxHQUFJLE1BQWMsQ0FBQyxTQUFpRixDQUFDO0lBQ3BILE1BQU0sR0FBRyxHQUFHLE1BQU0sQ0FBQyxPQUFPLENBQUMsTUFBTSxDQUFDLGlCQUFpQixDQUFDLENBQUM7SUFFckQsSUFBSSxTQUFTLEVBQUUsSUFBSSxJQUFJLE9BQU8sT0FBTyxDQUFDLFFBQVEsS0FBSyxRQUFRLEVBQUUsQ0FBQztRQUM1RCxJQUFJLENBQUM7WUFDSCxNQUFNLFNBQVMsQ0FBQyxJQUFJLENBQUMsRUFBRSxRQUFRLEVBQUUsT0FBTyxDQUFDLFFBQVEsRUFBRSxDQUFDLENBQUM7WUFDckQsT0FBTztRQUNULENBQUM7UUFBQyxPQUFPLEtBQUssRUFBRSxDQUFDO1lBQ2YsTUFBTSxDQUFDLElBQUksQ0FBQywwQ0FBMEMsRUFBRSxLQUFLLENBQUMsQ0FBQztRQUNqRSxDQUFDO0lBQ0gsQ0FBQztJQUVELE1BQU0sTUFBTSxDQUFDLElBQUksQ0FBQyxNQUFNLENBQUM7UUFDdkIsR0FBRztRQUNILE1BQU0sRUFBRSxJQUFJO1FBQ1osR0FBRyxDQUFDLE9BQU8sT0FBTyxDQUFDLFFBQVEsS0FBSyxRQUFRLENBQUMsQ0FBQyxDQUFDLEVBQUUsUUFBUSxFQUFFLE9BQU8sQ0FBQyxRQUFRLEVBQUUsQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDO0tBQ2hGLENBQUMsQ0FBQztBQUNMLENBQUM7QUFFRCxLQUFLLFVBQVUsaUJBQWlCO0lBQzlCLE1BQU0sTUFBTSxHQUFHLE1BQU0sTUFBTSxDQUFDLE9BQU8sQ0FBQyxLQUFLLENBQUMsR0FBRyxDQUFDLFVBQVUsQ0FBQyxDQUFDO0lBQzFELE1BQU0sTUFBTSxHQUFHLE1BQU0sQ0FBQyxRQUF5QyxDQUFDO0lBQ2hFLE9BQU8sRUFBRSxHQUFHLGVBQWUsRUFBRSxHQUFHLENBQUMsTUFBTSxJQUFJLEVBQUUsQ0FBQyxFQUFFLENBQUM7QUFDbkQsQ0FBQztBQUVELEtBQUssVUFBVSxpQkFBaUIsQ0FBQyxPQUFnQjtJQUMvQyxJQUFJLE9BQU8sRUFBRSxDQUFDO1FBQ1osSUFBSSxDQUFDO1lBQ0gsTUFBTSxNQUFNLENBQUMsWUFBWSxDQUFDLE1BQU0sQ0FBQztnQkFDL0IsRUFBRSxFQUFFLFdBQVc7Z0JBQ2YsS0FBSyxFQUFFLFVBQVU7Z0JBQ2pCLFFBQVEsRUFBRSxDQUFDLFdBQVcsQ0FBQzthQUN4QixDQUFDLENBQUM7UUFDTCxDQUFDO1FBQUMsTUFBTSxDQUFDLENBQUEsQ0FBQztRQUNWLE9BQU87SUFDVCxDQUFDO0lBRUQsSUFBSSxDQUFDO1FBQ0gsTUFBTSxNQUFNLENBQUMsWUFBWSxDQUFDLE1BQU0sQ0FBQyxXQUFXLENBQUMsQ0FBQztJQUNoRCxDQUFDO0lBQUMsTUFBTSxDQUFDLENBQUEsQ0FBQztBQUNaLENBQUM7QUFFRCxVQUFVO0FBQ1YsTUFBTSxDQUFDLE9BQU8sQ0FBQyxXQUFXLENBQUMsV0FBVyxDQUFDLENBQUMsT0FBTyxFQUFFLEVBQUU7SUFDakQsTUFBTSxDQUFDLElBQUksQ0FBQyw4QkFBOEIsRUFBRSxPQUFPLENBQUMsTUFBTSxDQUFDLENBQUM7SUFFNUQsQ0FBQyxLQUFLLElBQUksRUFBRTtRQUNWLE1BQU0sUUFBUSxHQUFHLE1BQU0sTUFBTSxDQUFDLE9BQU8sQ0FBQyxLQUFLLENBQUMsR0FBRyxDQUFDLENBQUMsVUFBVSxFQUFFLFVBQVUsQ0FBQyxDQUFDLENBQUM7UUFDMUUsTUFBTSxjQUFjLEdBQUcsRUFBRSxHQUFHLGVBQWUsRUFBRSxHQUFHLENBQUMsUUFBUSxDQUFDLFFBQVEsSUFBSSxFQUFFLENBQUMsRUFBRSxDQUFDO1FBQzVFLE1BQU0sUUFBUSxHQUFHLEtBQUssQ0FBQyxPQUFPLENBQUMsUUFBUSxDQUFDLFFBQVEsQ0FBQyxDQUFDLENBQUMsQ0FBQyxRQUFRLENBQUMsUUFBUSxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUM7UUFFM0UsTUFBTSxNQUFNLENBQUMsT0FBTyxDQUFDLEtBQUssQ0FBQyxHQUFHLENBQUM7WUFDN0IsUUFBUSxFQUFFLGNBQWM7WUFDeEIsUUFBUTtTQUNULENBQUMsQ0FBQztRQUVILE1BQU0saUJBQWlCLENBQUMsT0FBTyxDQUFDLGNBQWMsQ0FBQyxXQUFXLENBQUMsQ0FBQyxDQUFDO0lBQy9ELENBQUMsQ0FBQyxFQUFFLENBQUMsS0FBSyxDQUFDLENBQUMsS0FBSyxFQUFFLEVBQUU7UUFDbkIsTUFBTSxDQUFDLEtBQUssQ0FBQywrQkFBK0IsRUFBRSxLQUFLLENBQUMsQ0FBQztJQUN2RCxDQUFDLENBQUMsQ0FBQztBQUNMLENBQUMsQ0FBQyxDQUFDO0FBRUgsV0FBVztBQUNYLE1BQU0sQ0FBQyxZQUFZLENBQUMsU0FBUyxDQUFDLFdBQVcsQ0FBQyxDQUFDLElBQUksRUFBRSxHQUFHLEVBQUUsRUFBRTtJQUN0RCxJQUFJLElBQUksQ0FBQyxVQUFVLEtBQUssV0FBVyxJQUFJLElBQUksQ0FBQyxhQUFhLEVBQUUsQ0FBQztRQUMxRCxnQkFBZ0I7UUFDaEIsS0FBSyxVQUFVLENBQUMsRUFBRSxRQUFRLEVBQUUsR0FBRyxFQUFFLFFBQVEsRUFBRSxDQUFDLENBQUM7UUFDN0MsZ0JBQWdCO1FBQ2hCLEtBQUssTUFBTSxDQUFDLE9BQU8sQ0FBQyxLQUFLLENBQUMsR0FBRyxDQUFDLEVBQUUsWUFBWSxFQUFFLElBQUksQ0FBQyxhQUFhLEVBQUUsQ0FBQyxDQUFDO0lBQ3RFLENBQUM7QUFDSCxDQUFDLENBQUMsQ0FBQztBQUVILE1BQU0sQ0FBQyxPQUFPLENBQUMsU0FBUyxDQUFDLFdBQVcsQ0FBQyxDQUFDLE9BQU8sRUFBRSxRQUFRLEVBQUUsRUFBRTtJQUN6RCxJQUFJLFFBQVEsS0FBSyxPQUFPO1FBQUUsT0FBTztJQUNqQyxJQUFJLENBQUMsT0FBTyxDQUFDLFFBQVE7UUFBRSxPQUFPO0lBQzlCLE1BQU0sSUFBSSxHQUFHLE9BQU8sQ0FBQyxRQUFRLENBQUMsUUFBeUMsQ0FBQztJQUN4RSxpQkFBaUIsQ0FBQyxPQUFPLENBQUMsSUFBSSxFQUFFLFdBQVcsQ0FBQyxDQUFDLENBQUMsS0FBSyxDQUFDLENBQUMsS0FBSyxFQUFFLEVBQUU7UUFDNUQsTUFBTSxDQUFDLEtBQUssQ0FBQyxnQ0FBZ0MsRUFBRSxLQUFLLENBQUMsQ0FBQztJQUN4RCxDQUFDLENBQUMsQ0FBQztBQUNMLENBQUMsQ0FBQyxDQUFDO0FBRUgsU0FBUztBQUNULE1BQU0sQ0FBQyxPQUFPLENBQUMsU0FBUyxDQUFDLFdBQVcsQ0FBQyxDQUFDLE9BQXVCLEVBQUUsTUFBTSxFQUFFLFlBQVksRUFBRSxFQUFFO0lBQ3JGLE1BQU0sQ0FBQyxJQUFJLENBQUMsbUJBQW1CLEVBQUUsT0FBTyxDQUFDLElBQUksRUFBRSxPQUFPLEVBQUUsTUFBTSxDQUFDLEdBQUcsQ0FBQyxDQUFDO0lBRXBFLFFBQVEsT0FBTyxDQUFDLElBQUksRUFBRSxDQUFDO1FBQ3JCLEtBQUssU0FBUztZQUNaLGFBQWEsQ0FBQyxZQUFZLENBQUMsQ0FBQztZQUM1QixPQUFPLElBQUksQ0FBQyxDQUFDLFdBQVc7UUFFMUIsS0FBSyxXQUFXO1lBQ2QsZUFBZSxDQUFDLE9BQU8sQ0FBQyxHQUFHLElBQUksRUFBRSxFQUFFLEtBQUssQ0FBQyxDQUFDO1lBQzFDLFlBQVksQ0FBQyxFQUFFLElBQUksRUFBRSxDQUFDLEVBQUUsQ0FBQyxDQUFDO1lBQzFCLE1BQU07UUFFUixLQUFLLGNBQWM7WUFDakIsZUFBZSxDQUFDLE9BQU8sQ0FBQyxHQUFHLElBQUksRUFBRSxFQUFFLElBQUksQ0FBQyxDQUFDO1lBQ3pDLFlBQVksQ0FBQyxFQUFFLElBQUksRUFBRSxDQUFDLEVBQUUsQ0FBQyxDQUFDO1lBQzFCLE1BQU07UUFFUixLQUFLLGFBQWE7WUFDaEIsaUJBQWlCLENBQUMsWUFBWSxDQUFDLENBQUM7WUFDaEMsT0FBTyxJQUFJLENBQUM7UUFFZCxLQUFLLGFBQWE7WUFDaEIsaUJBQWlCLENBQUMsT0FBTyxDQUFDLElBQUksRUFBRSxZQUFZLENBQUMsQ0FBQztZQUM5QyxPQUFPLElBQUksQ0FBQztRQUVkLEtBQUssYUFBYTtZQUNoQixpQkFBaUIsQ0FBQyxZQUFZLENBQUMsQ0FBQztZQUNoQyxPQUFPLElBQUksQ0FBQztRQUVkLEtBQUssYUFBYTtZQUNoQixpQkFBaUIsQ0FBQyxPQUFPLENBQUMsSUFBSSxFQUFFLFlBQVksQ0FBQyxDQUFDO1lBQzlDLE9BQU8sSUFBSSxDQUFDO1FBRWQsS0FBSyxlQUFlO1lBQ2xCLG1CQUFtQixDQUFDLE9BQU8sQ0FBQyxJQUFJLEVBQUUsTUFBTSxFQUFFLFlBQVksQ0FBQyxDQUFDO1lBQ3hELE9BQU8sSUFBSSxDQUFDO1FBRWQsS0FBSyxVQUFVO1lBQ2IsY0FBYyxDQUFDLE1BQU0sQ0FBQyxHQUFHLEVBQUUsRUFBRSxFQUFFLFlBQVksQ0FBQyxDQUFDO1lBQzdDLE9BQU8sSUFBSSxDQUFDO1FBRWQsS0FBSyxZQUFZO1lBQ2YsZ0JBQWdCLENBQUMsTUFBTSxDQUFDLEdBQUcsRUFBRSxFQUFFLEVBQUUsWUFBWSxDQUFDLENBQUM7WUFDL0MsT0FBTyxJQUFJLENBQUM7UUFFZCxLQUFLLGNBQWM7WUFDakIsa0JBQWtCLENBQUMsT0FBTyxDQUFDLElBQUksRUFBRSxZQUFZLENBQUMsQ0FBQztZQUMvQyxPQUFPLElBQUksQ0FBQztRQUVkLEtBQUssY0FBYztZQUNqQixrQkFBa0IsQ0FBQyxZQUFZLENBQUMsQ0FBQztZQUNqQyxPQUFPLElBQUksQ0FBQztRQUVkLEtBQUssWUFBWTtZQUNmLGdCQUFnQixDQUFDLE9BQU8sQ0FBQyxJQUFJLEVBQUUsWUFBWSxDQUFDLENBQUM7WUFDN0MsT0FBTyxJQUFJLENBQUM7UUFFZDtZQUNFLE1BQU0sQ0FBQyxJQUFJLENBQUMsdUJBQXVCLEVBQUUsT0FBTyxDQUFDLElBQUksQ0FBQyxDQUFDO1lBQ25ELFlBQVksQ0FBQyxFQUFFLElBQUksRUFBRSxDQUFDLENBQUMsRUFBRSxLQUFLLEVBQUUsc0JBQXNCLEVBQUUsQ0FBQyxDQUFDO0lBQzlELENBQUM7QUFDSCxDQUFDLENBQUMsQ0FBQztBQUVILE1BQU0sQ0FBQyxRQUFRLENBQUMsU0FBUyxDQUFDLFdBQVcsQ0FBQyxDQUFDLE9BQU8sRUFBRSxFQUFFO0lBQ2hELEtBQUssYUFBYSxDQUFDLE9BQU8sQ0FBQyxDQUFDO0FBQzlCLENBQUMsQ0FBQyxDQUFDO0FBRUgsT0FBTztBQUNQLEtBQUssVUFBVSxhQUFhLENBQUMsWUFBaUQ7SUFDNUUsSUFBSSxDQUFDO1FBQ0gsTUFBTSxPQUFPLEdBQUcsTUFBTSxNQUFNLENBQUMsSUFBSSxDQUFDLGlCQUFpQixFQUFFLENBQUM7UUFDdEQsWUFBWSxDQUFDLEVBQUUsSUFBSSxFQUFFLENBQUMsRUFBRSxJQUFJLEVBQUUsT0FBTyxFQUFFLENBQUMsQ0FBQztJQUMzQyxDQUFDO0lBQUMsT0FBTyxLQUFLLEVBQUUsQ0FBQztRQUNmLE1BQU0sQ0FBQyxLQUFLLENBQUMsaUJBQWlCLEVBQUUsS0FBSyxDQUFDLENBQUM7UUFDdkMsWUFBWSxDQUFDLEVBQUUsSUFBSSxFQUFFLENBQUMsQ0FBQyxFQUFFLEtBQUssRUFBRSxNQUFNLENBQUMsS0FBSyxDQUFDLEVBQUUsQ0FBQyxDQUFDO0lBQ25ELENBQUM7QUFDSCxDQUFDO0FBRUQsU0FBUztBQUNULEtBQUssVUFBVSxlQUFlLENBQUMsU0FBaUIsRUFBRSxRQUFpQjtJQUNqRSxJQUFJLENBQUM7UUFDSCxNQUFNLE9BQU8sR0FBRyxNQUFNLE1BQU0sQ0FBQyxPQUFPLENBQUMsTUFBTSxDQUFDLEVBQUUsUUFBUSxFQUFFLElBQUksRUFBRSxDQUFDLENBQUM7UUFDaEUsTUFBTSxVQUFVLEdBQUcsTUFBTSxhQUFhLEVBQUUsQ0FBQztRQUV6QyxLQUFLLE1BQU0sTUFBTSxJQUFJLE9BQU8sRUFBRSxDQUFDO1lBQzdCLEtBQUssTUFBTSxHQUFHLElBQUksTUFBTSxDQUFDLElBQUksSUFBSSxFQUFFLEVBQUUsQ0FBQztnQkFDcEMsSUFBSSxHQUFHLENBQUMsR0FBRyxFQUFFLFVBQVUsQ0FBQyxTQUFTLENBQUMsRUFBRSxDQUFDO29CQUNuQyxJQUFJLFFBQVEsSUFBSSxHQUFHLENBQUMsRUFBRSxLQUFLLFVBQVUsRUFBRSxFQUFFLEVBQUUsQ0FBQzt3QkFDMUMsTUFBTSxNQUFNLENBQUMsSUFBSSxDQUFDLE1BQU0sQ0FBQyxHQUFHLENBQUMsRUFBRyxDQUFDLENBQUM7b0JBQ3BDLENBQUM7Z0JBQ0gsQ0FBQztZQUNILENBQUM7UUFDSCxDQUFDO0lBQ0gsQ0FBQztJQUFDLE9BQU8sS0FBSyxFQUFFLENBQUM7UUFDZixNQUFNLENBQUMsS0FBSyxDQUFDLG9CQUFvQixFQUFFLEtBQUssQ0FBQyxDQUFDO0lBQzVDLENBQUM7QUFDSCxDQUFDO0FBRUQsVUFBVTtBQUNWLEtBQUssVUFBVSxhQUFhO0lBQzFCLE1BQU0sSUFBSSxHQUFHLE1BQU0sTUFBTSxDQUFDLElBQUksQ0FBQyxLQUFLLENBQUMsRUFBRSxNQUFNLEVBQUUsSUFBSSxFQUFFLGFBQWEsRUFBRSxJQUFJLEVBQUUsQ0FBQyxDQUFDO0lBQzVFLE9BQU8sSUFBSSxDQUFDLENBQUMsQ0FBQyxJQUFJLElBQUksQ0FBQztBQUN6QixDQUFDO0FBRUQsS0FBSyxVQUFVLGFBQWEsQ0FBQyxPQUFlO0lBQzFDLElBQUksQ0FBQztRQUNILE1BQU0sR0FBRyxHQUFHLE1BQU0sYUFBYSxFQUFFLENBQUM7UUFDbEMsTUFBTSxRQUFRLEdBQUcsR0FBRyxFQUFFLFFBQVEsQ0FBQztRQUUvQixJQUFJLE9BQU8sS0FBSyxpQkFBaUIsRUFBRSxDQUFDO1lBQ2xDLE1BQU0sVUFBVSxDQUFDLEVBQUUsUUFBUSxFQUFFLENBQUMsQ0FBQztZQUMvQixPQUFPO1FBQ1QsQ0FBQztRQUVELElBQUksT0FBTyxLQUFLLFVBQVUsRUFBRSxDQUFDO1lBQzNCLE1BQU0sTUFBTSxDQUFDLE9BQU8sQ0FBQyxLQUFLLENBQUMsR0FBRyxDQUFDLEVBQUUsY0FBYyxFQUFFLElBQUksRUFBRSxDQUFDLENBQUM7WUFDekQsTUFBTSxVQUFVLENBQUMsRUFBRSxRQUFRLEVBQUUsQ0FBQyxDQUFDO1lBQy9CLE9BQU87UUFDVCxDQUFDO1FBRUQsSUFBSSxPQUFPLEtBQUssWUFBWSxFQUFFLENBQUM7WUFDN0IsTUFBTSxPQUFPLEdBQUcsTUFBTSxNQUFNLENBQUMsSUFBSSxDQUFDLGlCQUFpQixFQUFFLENBQUM7WUFDdEQsTUFBTSxNQUFNLENBQUMsT0FBTyxDQUFDLEtBQUssQ0FBQyxHQUFHLENBQUMsRUFBRSxpQkFBaUIsRUFBRSxPQUFPLEVBQUUsQ0FBQyxDQUFDO1lBQy9ELE1BQU0sVUFBVSxDQUFDLEVBQUUsUUFBUSxFQUFFLENBQUMsQ0FBQztZQUMvQixPQUFPO1FBQ1QsQ0FBQztJQUNILENBQUM7SUFBQyxPQUFPLEtBQUssRUFBRSxDQUFDO1FBQ2YsTUFBTSxDQUFDLEtBQUssQ0FBQyxpQkFBaUIsRUFBRSxPQUFPLEVBQUUsS0FBSyxDQUFDLENBQUM7SUFDbEQsQ0FBQztBQUNILENBQUM7QUFFRCxPQUFPO0FBQ1AsS0FBSyxVQUFVLGlCQUFpQixDQUFDLFlBQXlDO0lBQ3hFLElBQUksQ0FBQztRQUNILE1BQU0sUUFBUSxHQUFHLE1BQU0saUJBQWlCLEVBQUUsQ0FBQztRQUMzQyxZQUFZLENBQUMsRUFBRSxJQUFJLEVBQUUsQ0FBQyxFQUFFLElBQUksRUFBRSxRQUFRLEVBQUUsQ0FBQyxDQUFDO0lBQzVDLENBQUM7SUFBQyxPQUFPLEtBQUssRUFBRSxDQUFDO1FBQ2YsWUFBWSxDQUFDLEVBQUUsSUFBSSxFQUFFLENBQUMsQ0FBQyxFQUFFLEtBQUssRUFBRSxNQUFNLENBQUMsS0FBSyxDQUFDLEVBQUUsQ0FBQyxDQUFDO0lBQ25ELENBQUM7QUFDSCxDQUFDO0FBRUQsT0FBTztBQUNQLEtBQUssVUFBVSxpQkFBaUIsQ0FBQyxJQUFhLEVBQUUsWUFBeUM7SUFDdkYsSUFBSSxDQUFDO1FBQ0gsTUFBTSxPQUFPLEdBQUcsTUFBTSxpQkFBaUIsRUFBRSxDQUFDO1FBQzFDLE1BQU0sSUFBSSxHQUFHLENBQUMsSUFBSSxJQUFJLE9BQU8sSUFBSSxLQUFLLFFBQVEsQ0FBQyxDQUFDLENBQUMsQ0FBRSxJQUEwQixDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUM7UUFDbkYsTUFBTSxNQUFNLENBQUMsT0FBTyxDQUFDLEtBQUssQ0FBQyxHQUFHLENBQUMsRUFBRSxRQUFRLEVBQUUsRUFBRSxHQUFHLE9BQU8sRUFBRSxHQUFHLElBQUksRUFBRSxFQUFFLENBQUMsQ0FBQztRQUN0RSxZQUFZLENBQUMsRUFBRSxJQUFJLEVBQUUsQ0FBQyxFQUFFLENBQUMsQ0FBQztJQUM1QixDQUFDO0lBQUMsT0FBTyxLQUFLLEVBQUUsQ0FBQztRQUNmLFlBQVksQ0FBQyxFQUFFLElBQUksRUFBRSxDQUFDLENBQUMsRUFBRSxLQUFLLEVBQUUsTUFBTSxDQUFDLEtBQUssQ0FBQyxFQUFFLENBQUMsQ0FBQztJQUNuRCxDQUFDO0FBQ0gsQ0FBQztBQUVELFNBQVM7QUFDVCxLQUFLLFVBQVUsaUJBQWlCLENBQUMsWUFBeUM7SUFDeEUsSUFBSSxDQUFDO1FBQ0gsTUFBTSxNQUFNLEdBQUcsTUFBTSxNQUFNLENBQUMsT0FBTyxDQUFDLEtBQUssQ0FBQyxHQUFHLENBQUMsVUFBVSxDQUFDLENBQUM7UUFDMUQsWUFBWSxDQUFDLEVBQUUsSUFBSSxFQUFFLENBQUMsRUFBRSxJQUFJLEVBQUUsTUFBTSxDQUFDLFFBQVEsSUFBSSxFQUFFLEVBQUUsQ0FBQyxDQUFDO0lBQ3pELENBQUM7SUFBQyxPQUFPLEtBQUssRUFBRSxDQUFDO1FBQ2YsWUFBWSxDQUFDLEVBQUUsSUFBSSxFQUFFLENBQUMsQ0FBQyxFQUFFLEtBQUssRUFBRSxNQUFNLENBQUMsS0FBSyxDQUFDLEVBQUUsQ0FBQyxDQUFDO0lBQ25ELENBQUM7QUFDSCxDQUFDO0FBRUQsT0FBTztBQUNQLEtBQUssVUFBVSxpQkFBaUIsQ0FBQyxJQUFhLEVBQUUsWUFBeUM7SUFDdkYsSUFBSSxDQUFDO1FBQ0gsTUFBTSxNQUFNLEdBQUcsTUFBTSxNQUFNLENBQUMsT0FBTyxDQUFDLEtBQUssQ0FBQyxHQUFHLENBQUMsVUFBVSxDQUFDLENBQUM7UUFDMUQsTUFBTSxRQUFRLEdBQUcsTUFBTSxDQUFDLFFBQVEsSUFBSSxFQUFFLENBQUM7UUFDdkMsUUFBUSxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsQ0FBQztRQUNwQixNQUFNLE1BQU0sQ0FBQyxPQUFPLENBQUMsS0FBSyxDQUFDLEdBQUcsQ0FBQyxFQUFFLFFBQVEsRUFBRSxDQUFDLENBQUM7UUFDN0MsWUFBWSxDQUFDLEVBQUUsSUFBSSxFQUFFLENBQUMsRUFBRSxDQUFDLENBQUM7SUFDNUIsQ0FBQztJQUFDLE9BQU8sS0FBSyxFQUFFLENBQUM7UUFDZixZQUFZLENBQUMsRUFBRSxJQUFJLEVBQUUsQ0FBQyxDQUFDLEVBQUUsS0FBSyxFQUFFLE1BQU0sQ0FBQyxLQUFLLENBQUMsRUFBRSxDQUFDLENBQUM7SUFDbkQsQ0FBQztBQUNILENBQUM7QUFFRCxLQUFLLFVBQVUsbUJBQW1CLENBQUMsSUFBYSxFQUFFLE1BQW9DLEVBQUUsWUFBeUM7SUFDL0gsSUFBSSxDQUFDO1FBQ0gsTUFBTSxZQUFZLEdBQ2hCLElBQUksSUFBSSxPQUFPLElBQUksS0FBSyxRQUFRLElBQUksY0FBYyxJQUFJLElBQUksSUFBSSxPQUFRLElBQW1DLENBQUMsWUFBWSxLQUFLLFFBQVE7WUFDakksQ0FBQyxDQUFFLElBQWlDLENBQUMsWUFBWTtZQUNqRCxDQUFDLENBQUMsRUFBRSxDQUFDO1FBRVQsSUFBSSxDQUFDLFlBQVksRUFBRSxDQUFDO1lBQ2xCLFlBQVksQ0FBQyxFQUFFLElBQUksRUFBRSxDQUFDLENBQUMsRUFBRSxLQUFLLEVBQUUsc0JBQXNCLEVBQUUsQ0FBQyxDQUFDO1lBQzFELE9BQU87UUFDVCxDQUFDO1FBRUQsTUFBTSxRQUFRLEdBQUcsTUFBTSxDQUFDLEdBQUcsRUFBRSxRQUFRLENBQUM7UUFDdEMsTUFBTSxVQUFVLENBQUMsRUFBRSxRQUFRLEVBQUUsQ0FBQyxDQUFDO1FBRS9CLE1BQU0sTUFBTSxDQUFDLE9BQU8sQ0FBQyxLQUFLLENBQUMsR0FBRyxDQUFDLEVBQUUsWUFBWSxFQUFFLENBQUMsQ0FBQztRQUNqRCxZQUFZLENBQUMsRUFBRSxJQUFJLEVBQUUsQ0FBQyxFQUFFLENBQUMsQ0FBQztJQUM1QixDQUFDO0lBQUMsT0FBTyxLQUFLLEVBQUUsQ0FBQztRQUNmLFlBQVksQ0FBQyxFQUFFLElBQUksRUFBRSxDQUFDLENBQUMsRUFBRSxLQUFLLEVBQUUsTUFBTSxDQUFDLEtBQUssQ0FBQyxFQUFFLENBQUMsQ0FBQztJQUNuRCxDQUFDO0FBQ0gsQ0FBQztBQUVELFNBQVM7QUFDVCxLQUFLLFVBQVUsY0FBYyxDQUFDLEtBQXlCLEVBQUUsWUFBeUM7SUFDaEcsSUFBSSxDQUFDO1FBQ0gsSUFBSSxDQUFDLEtBQUssRUFBRSxDQUFDO1lBQ1gsWUFBWSxDQUFDLEVBQUUsSUFBSSxFQUFFLENBQUMsQ0FBQyxFQUFFLEtBQUssRUFBRSxXQUFXLEVBQUUsQ0FBQyxDQUFDO1lBQy9DLE9BQU87UUFDVCxDQUFDO1FBRUQsTUFBTSxRQUFRLEdBQUcsTUFBTSxNQUFNLENBQUMsSUFBSSxDQUFDLFdBQVcsQ0FBQyxLQUFLLEVBQUUsRUFBRSxJQUFJLEVBQUUsVUFBVSxFQUFFLENBQUMsQ0FBQztRQUM1RSxZQUFZLENBQUMsUUFBUSxDQUFDLENBQUM7SUFDekIsQ0FBQztJQUFDLE9BQU8sS0FBSyxFQUFFLENBQUM7UUFDZixZQUFZLENBQUMsRUFBRSxJQUFJLEVBQUUsQ0FBQyxDQUFDLEVBQUUsS0FBSyxFQUFFLE1BQU0sQ0FBQyxLQUFLLENBQUMsRUFBRSxDQUFDLENBQUM7SUFDbkQsQ0FBQztBQUNILENBQUM7QUFFRCxVQUFVO0FBQ1YsS0FBSyxVQUFVLGdCQUFnQixDQUFDLEtBQXlCLEVBQUUsWUFBeUM7SUFDbEcsSUFBSSxDQUFDO1FBQ0gsSUFBSSxDQUFDLEtBQUssRUFBRSxDQUFDO1lBQ1gsWUFBWSxDQUFDLEVBQUUsSUFBSSxFQUFFLENBQUMsQ0FBQyxFQUFFLEtBQUssRUFBRSxXQUFXLEVBQUUsQ0FBQyxDQUFDO1lBQy9DLE9BQU87UUFDVCxDQUFDO1FBRUQsTUFBTSxHQUFHLEdBQUcsTUFBTSxNQUFNLENBQUMsSUFBSSxDQUFDLEdBQUcsQ0FBQyxLQUFLLENBQUMsQ0FBQztRQUN6QyxZQUFZLENBQUMsRUFBRSxJQUFJLEVBQUUsQ0FBQyxFQUFFLElBQUksRUFBRSxHQUFHLEVBQUUsQ0FBQyxDQUFDO0lBQ3ZDLENBQUM7SUFBQyxPQUFPLEtBQUssRUFBRSxDQUFDO1FBQ2YsWUFBWSxDQUFDLEVBQUUsSUFBSSxFQUFFLENBQUMsQ0FBQyxFQUFFLEtBQUssRUFBRSxNQUFNLENBQUMsS0FBSyxDQUFDLEVBQUUsQ0FBQyxDQUFDO0lBQ25ELENBQUM7QUFDSCxDQUFDO0FBRUQsT0FBTztBQUNQLEtBQUssVUFBVSxrQkFBa0IsQ0FBQyxJQUFhLEVBQUUsWUFBeUM7SUFDeEYsSUFBSSxDQUFDO1FBQ0gsTUFBTSxZQUFZLEdBQUcsSUFBNEQsQ0FBQztRQUNsRixJQUFJLENBQUMsWUFBWSxDQUFDLEdBQUcsSUFBSSxDQUFDLFlBQVksQ0FBQyxLQUFLLEVBQUUsQ0FBQztZQUM3QyxZQUFZLENBQUMsRUFBRSxJQUFJLEVBQUUsQ0FBQyxDQUFDLEVBQUUsS0FBSyxFQUFFLHNCQUFzQixFQUFFLENBQUMsQ0FBQztZQUMxRCxPQUFPO1FBQ1QsQ0FBQztRQUVELE1BQU0sUUFBUSxHQUFHLE1BQU0sTUFBTSxDQUFDLFNBQVMsQ0FBQyxNQUFNLENBQUM7WUFDN0MsS0FBSyxFQUFFLFlBQVksQ0FBQyxLQUFLO1lBQ3pCLEdBQUcsRUFBRSxZQUFZLENBQUMsR0FBRztTQUN0QixDQUFDLENBQUM7UUFFSCxZQUFZLENBQUMsRUFBRSxJQUFJLEVBQUUsQ0FBQyxFQUFFLElBQUksRUFBRSxRQUFRLEVBQUUsQ0FBQyxDQUFDO0lBQzVDLENBQUM7SUFBQyxPQUFPLEtBQUssRUFBRSxDQUFDO1FBQ2YsWUFBWSxDQUFDLEVBQUUsSUFBSSxFQUFFLENBQUMsQ0FBQyxFQUFFLEtBQUssRUFBRSxNQUFNLENBQUMsS0FBSyxDQUFDLEVBQUUsQ0FBQyxDQUFDO0lBQ25ELENBQUM7QUFDSCxDQUFDO0FBRUQsU0FBUztBQUNULEtBQUssVUFBVSxrQkFBa0IsQ0FBQyxZQUF5QztJQUN6RSxJQUFJLENBQUM7UUFDSCxNQUFNLFNBQVMsR0FBRyxNQUFNLE1BQU0sQ0FBQyxTQUFTLENBQUMsT0FBTyxFQUFFLENBQUM7UUFDbkQsWUFBWSxDQUFDLEVBQUUsSUFBSSxFQUFFLENBQUMsRUFBRSxJQUFJLEVBQUUsU0FBUyxFQUFFLENBQUMsQ0FBQztJQUM3QyxDQUFDO0lBQUMsT0FBTyxLQUFLLEVBQUUsQ0FBQztRQUNmLFlBQVksQ0FBQyxFQUFFLElBQUksRUFBRSxDQUFDLENBQUMsRUFBRSxLQUFLLEVBQUUsTUFBTSxDQUFDLEtBQUssQ0FBQyxFQUFFLENBQUMsQ0FBQztJQUNuRCxDQUFDO0FBQ0gsQ0FBQztBQUVELGVBQWU7QUFDZixLQUFLLFVBQVUsZ0JBQWdCLENBQUMsSUFBYSxFQUFFLFlBQXlDO0lBQ3RGLElBQUksQ0FBQztRQUNILE1BQU0sUUFBUSxHQUFHLElBQWlHLENBQUM7UUFDbkgsSUFBSSxDQUFDLFFBQVEsQ0FBQyxLQUFLLElBQUksQ0FBQyxRQUFRLENBQUMsUUFBUSxJQUFJLENBQUMsS0FBSyxDQUFDLE9BQU8sQ0FBQyxRQUFRLENBQUMsUUFBUSxDQUFDLEVBQUUsQ0FBQztZQUMvRSxZQUFZLENBQUMsRUFBRSxJQUFJLEVBQUUsQ0FBQyxDQUFDLEVBQUUsS0FBSyxFQUFFLDJCQUEyQixFQUFFLENBQUMsQ0FBQztZQUMvRCxPQUFPO1FBQ1QsQ0FBQztRQUVELG1DQUFtQztRQUNuQyxJQUFJLENBQUM7WUFDSCxNQUFNLFFBQVEsR0FBRyxNQUFNLEtBQUssQ0FBQywyQ0FBMkMsRUFBRTtnQkFDeEUsTUFBTSxFQUFFLE1BQU07Z0JBQ2QsT0FBTyxFQUFFO29CQUNQLGNBQWMsRUFBRSxrQkFBa0I7aUJBQ25DO2dCQUNELElBQUksRUFBRSxJQUFJLENBQUMsU0FBUyxDQUFDO29CQUNuQixLQUFLLEVBQUUsUUFBUSxDQUFDLEtBQUs7b0JBQ3JCLFFBQVEsRUFBRSxRQUFRLENBQUMsUUFBUTtvQkFDM0IsTUFBTSxFQUFFLFFBQVEsQ0FBQyxNQUFNLElBQUksS0FBSztpQkFDakMsQ0FBQzthQUNILENBQUMsQ0FBQztZQUVILElBQUksQ0FBQyxRQUFRLENBQUMsRUFBRSxFQUFFLENBQUM7Z0JBQ2pCLFlBQVksQ0FBQyxFQUFFLElBQUksRUFBRSxDQUFDLENBQUMsRUFBRSxLQUFLLEVBQUUsaUJBQWlCLFFBQVEsQ0FBQyxVQUFVLEVBQUUsRUFBRSxDQUFDLENBQUM7Z0JBQzFFLE9BQU87WUFDVCxDQUFDO1lBRUQsTUFBTSxZQUFZLEdBQUcsTUFBTSxRQUFRLENBQUMsSUFBSSxFQUFFLENBQUM7WUFDM0MsWUFBWSxDQUFDLEVBQUUsSUFBSSxFQUFFLENBQUMsRUFBRSxJQUFJLEVBQUUsWUFBWSxFQUFFLENBQUMsQ0FBQztRQUNoRCxDQUFDO1FBQUMsT0FBTyxLQUFLLEVBQUUsQ0FBQztZQUNmLE1BQU0sWUFBWSxHQUFHLEtBQUssWUFBWSxLQUFLLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxLQUFLLENBQUMsQ0FBQztZQUM1RSxNQUFNLENBQUMsS0FBSyxDQUFDLHFCQUFxQixFQUFFLEtBQUssQ0FBQyxDQUFDO1lBQzNDLFlBQVksQ0FBQztnQkFDWCxJQUFJLEVBQUUsQ0FBQyxDQUFDO2dCQUNSLEtBQUssRUFBRSxpQkFBaUIsWUFBWSx3Q0FBd0M7YUFDN0UsQ0FBQyxDQUFDO1FBQ0wsQ0FBQztJQUNILENBQUM7SUFBQyxPQUFPLEtBQUssRUFBRSxDQUFDO1FBQ2YsTUFBTSxDQUFDLEtBQUssQ0FBQyxxQkFBcUIsRUFBRSxLQUFLLENBQUMsQ0FBQztRQUMzQyxZQUFZLENBQUMsRUFBRSxJQUFJLEVBQUUsQ0FBQyxDQUFDLEVBQUUsS0FBSyxFQUFFLE1BQU0sQ0FBQyxLQUFLLENBQUMsRUFBRSxDQUFDLENBQUM7SUFDbkQsQ0FBQztBQUNILENBQUM7QUFFRCxxQkFBcUI7QUFDckIsTUFBTSxDQUFDLElBQUksQ0FBQyxTQUFTLENBQUMsV0FBVyxDQUFDLENBQUMsS0FBSyxFQUFFLFVBQVUsRUFBRSxHQUFHLEVBQUUsRUFBRTtJQUMzRCxJQUFJLFVBQVUsQ0FBQyxNQUFNLEtBQUssVUFBVSxJQUFJLEdBQUcsQ0FBQyxHQUFHLEVBQUUsQ0FBQztRQUNoRCxtQkFBbUI7UUFDbkIsTUFBTSxDQUFDLEtBQUssQ0FBQyxjQUFjLEVBQUUsR0FBRyxDQUFDLEdBQUcsQ0FBQyxDQUFDO0lBQ3hDLENBQUM7QUFDSCxDQUFDLENBQUMsQ0FBQyIsInNvdXJjZXNDb250ZW50IjpbIi8vIEJhY2tncm91bmQgU2VydmljZSBXb3JrZXIgLSDlpITnkIbmianlsZXlkI7lj7DpgLvovpFcblxuaW1wb3J0IHsgbG9nZ2VyIH0gZnJvbSAnQGNvcmUvdXRpbHMvbG9nZ2VyJztcbmltcG9ydCB7IE1lc3NhZ2VQYXlsb2FkLCBDYXB0dXJlUmVzcG9uc2UgfSBmcm9tICdAY29yZS90eXBlcyc7XG5cbmxvZ2dlci5zZXRQcmVmaXgoJ1tEb3ViYW8gQmFja2dyb3VuZF0nKTtcblxudHlwZSBTZXR0aW5ncyA9IHtcbiAgdGhlbWU6ICdsaWdodCcgfCAnZGFyaycgfCAnYXV0byc7XG4gIGxhbmd1YWdlOiBzdHJpbmc7XG4gIGF1dG9PcGVuOiBib29sZWFuO1xuICBjb250ZXh0TWVudTogYm9vbGVhbjtcbiAgdGVtcGVyYXR1cmU6IG51bWJlcjtcbiAgc3RyZWFtUmVzcG9uc2U6IGJvb2xlYW47XG4gIG1heENvbnRleHQ6IG51bWJlcjtcbn07XG5cbmNvbnN0IGRlZmF1bHRTZXR0aW5nczogU2V0dGluZ3MgPSB7XG4gIHRoZW1lOiAnbGlnaHQnLFxuICBsYW5ndWFnZTogJ3poLUNOJyxcbiAgYXV0b09wZW46IGZhbHNlLFxuICBjb250ZXh0TWVudTogdHJ1ZSxcbiAgdGVtcGVyYXR1cmU6IDAuNyxcbiAgc3RyZWFtUmVzcG9uc2U6IHRydWUsXG4gIG1heENvbnRleHQ6IDEwLFxufTtcblxuYXN5bmMgZnVuY3Rpb24gb3BlbkNoYXRVSShvcHRpb25zOiB7IHdpbmRvd0lkPzogbnVtYmVyIH0gPSB7fSk6IFByb21pc2U8dm9pZD4ge1xuICBjb25zdCBzaWRlUGFuZWwgPSAoY2hyb21lIGFzIGFueSkuc2lkZVBhbmVsIGFzIHsgb3Blbj86IChvcHRzOiB7IHdpbmRvd0lkOiBudW1iZXIgfSkgPT4gUHJvbWlzZTx2b2lkPiB9IHwgdW5kZWZpbmVkO1xuICBjb25zdCB1cmwgPSBjaHJvbWUucnVudGltZS5nZXRVUkwoJ3NpZGUtcGFuZWwuaHRtbCcpO1xuXG4gIGlmIChzaWRlUGFuZWw/Lm9wZW4gJiYgdHlwZW9mIG9wdGlvbnMud2luZG93SWQgPT09ICdudW1iZXInKSB7XG4gICAgdHJ5IHtcbiAgICAgIGF3YWl0IHNpZGVQYW5lbC5vcGVuKHsgd2luZG93SWQ6IG9wdGlvbnMud2luZG93SWQgfSk7XG4gICAgICByZXR1cm47XG4gICAgfSBjYXRjaCAoZXJyb3IpIHtcbiAgICAgIGxvZ2dlci53YXJuKCdTaWRlIHBhbmVsIG9wZW4gZmFpbGVkLCBmYWxsYmFjayB0byB0YWI6JywgZXJyb3IpO1xuICAgIH1cbiAgfVxuXG4gIGF3YWl0IGNocm9tZS50YWJzLmNyZWF0ZSh7XG4gICAgdXJsLFxuICAgIGFjdGl2ZTogdHJ1ZSxcbiAgICAuLi4odHlwZW9mIG9wdGlvbnMud2luZG93SWQgPT09ICdudW1iZXInID8geyB3aW5kb3dJZDogb3B0aW9ucy53aW5kb3dJZCB9IDoge30pLFxuICB9KTtcbn1cblxuYXN5bmMgZnVuY3Rpb24gZ2V0TWVyZ2VkU2V0dGluZ3MoKTogUHJvbWlzZTxTZXR0aW5ncz4ge1xuICBjb25zdCByZXN1bHQgPSBhd2FpdCBjaHJvbWUuc3RvcmFnZS5sb2NhbC5nZXQoJ3NldHRpbmdzJyk7XG4gIGNvbnN0IHN0b3JlZCA9IHJlc3VsdC5zZXR0aW5ncyBhcyBQYXJ0aWFsPFNldHRpbmdzPiB8IHVuZGVmaW5lZDtcbiAgcmV0dXJuIHsgLi4uZGVmYXVsdFNldHRpbmdzLCAuLi4oc3RvcmVkIHx8IHt9KSB9O1xufVxuXG5hc3luYyBmdW5jdGlvbiB1cGRhdGVDb250ZXh0TWVudShlbmFibGVkOiBib29sZWFuKTogUHJvbWlzZTx2b2lkPiB7XG4gIGlmIChlbmFibGVkKSB7XG4gICAgdHJ5IHtcbiAgICAgIGF3YWl0IGNocm9tZS5jb250ZXh0TWVudXMuY3JlYXRlKHtcbiAgICAgICAgaWQ6ICdkb3ViYW8tYWknLFxuICAgICAgICB0aXRsZTogJ+S9v+eUqOixhuWMhUFJ6Kej6YeKJyxcbiAgICAgICAgY29udGV4dHM6IFsnc2VsZWN0aW9uJ10sXG4gICAgICB9KTtcbiAgICB9IGNhdGNoIHt9XG4gICAgcmV0dXJuO1xuICB9XG5cbiAgdHJ5IHtcbiAgICBhd2FpdCBjaHJvbWUuY29udGV4dE1lbnVzLnJlbW92ZSgnZG91YmFvLWFpJyk7XG4gIH0gY2F0Y2gge31cbn1cblxuLy8g5a6J6KOFL+abtOaWsOS6i+S7tlxuY2hyb21lLnJ1bnRpbWUub25JbnN0YWxsZWQuYWRkTGlzdGVuZXIoKGRldGFpbHMpID0+IHtcbiAgbG9nZ2VyLmluZm8oJ0V4dGVuc2lvbiBpbnN0YWxsZWQvdXBkYXRlZDonLCBkZXRhaWxzLnJlYXNvbik7XG5cbiAgKGFzeW5jICgpID0+IHtcbiAgICBjb25zdCBleGlzdGluZyA9IGF3YWl0IGNocm9tZS5zdG9yYWdlLmxvY2FsLmdldChbJ3NldHRpbmdzJywgJ3Nlc3Npb25zJ10pO1xuICAgIGNvbnN0IG1lcmdlZFNldHRpbmdzID0geyAuLi5kZWZhdWx0U2V0dGluZ3MsIC4uLihleGlzdGluZy5zZXR0aW5ncyB8fCB7fSkgfTtcbiAgICBjb25zdCBzZXNzaW9ucyA9IEFycmF5LmlzQXJyYXkoZXhpc3Rpbmcuc2Vzc2lvbnMpID8gZXhpc3Rpbmcuc2Vzc2lvbnMgOiBbXTtcblxuICAgIGF3YWl0IGNocm9tZS5zdG9yYWdlLmxvY2FsLnNldCh7XG4gICAgICBzZXR0aW5nczogbWVyZ2VkU2V0dGluZ3MsXG4gICAgICBzZXNzaW9ucyxcbiAgICB9KTtcblxuICAgIGF3YWl0IHVwZGF0ZUNvbnRleHRNZW51KEJvb2xlYW4obWVyZ2VkU2V0dGluZ3MuY29udGV4dE1lbnUpKTtcbiAgfSkoKS5jYXRjaCgoZXJyb3IpID0+IHtcbiAgICBsb2dnZXIuZXJyb3IoJ0ZhaWxlZCB0byBpbml0aWFsaXplIHN0b3JhZ2U6JywgZXJyb3IpO1xuICB9KTtcbn0pO1xuXG4vLyDlj7PplK7oj5zljZXngrnlh7vkuovku7ZcbmNocm9tZS5jb250ZXh0TWVudXMub25DbGlja2VkLmFkZExpc3RlbmVyKChpbmZvLCB0YWIpID0+IHtcbiAgaWYgKGluZm8ubWVudUl0ZW1JZCA9PT0gJ2RvdWJhby1haScgJiYgaW5mby5zZWxlY3Rpb25UZXh0KSB7XG4gICAgLy8g5omT5byA5L6n6L655qCP5bm25Y+R6YCB6YCJ5Lit55qE5paH5pysXG4gICAgdm9pZCBvcGVuQ2hhdFVJKHsgd2luZG93SWQ6IHRhYj8ud2luZG93SWQgfSk7XG4gICAgLy8g5a2Y5YKo6YCJ5Lit55qE5paH5pys5L6b5L6n6L655qCP5L2/55SoXG4gICAgdm9pZCBjaHJvbWUuc3RvcmFnZS5sb2NhbC5zZXQoeyBzZWxlY3RlZFRleHQ6IGluZm8uc2VsZWN0aW9uVGV4dCB9KTtcbiAgfVxufSk7XG5cbmNocm9tZS5zdG9yYWdlLm9uQ2hhbmdlZC5hZGRMaXN0ZW5lcigoY2hhbmdlcywgYXJlYU5hbWUpID0+IHtcbiAgaWYgKGFyZWFOYW1lICE9PSAnbG9jYWwnKSByZXR1cm47XG4gIGlmICghY2hhbmdlcy5zZXR0aW5ncykgcmV0dXJuO1xuICBjb25zdCBuZXh0ID0gY2hhbmdlcy5zZXR0aW5ncy5uZXdWYWx1ZSBhcyBQYXJ0aWFsPFNldHRpbmdzPiB8IHVuZGVmaW5lZDtcbiAgdXBkYXRlQ29udGV4dE1lbnUoQm9vbGVhbihuZXh0Py5jb250ZXh0TWVudSkpLmNhdGNoKChlcnJvcikgPT4ge1xuICAgIGxvZ2dlci5lcnJvcignRmFpbGVkIHRvIHVwZGF0ZSBjb250ZXh0IG1lbnU6JywgZXJyb3IpO1xuICB9KTtcbn0pO1xuXG4vLyDmtojmga/lpITnkIbkuK3lv4NcbmNocm9tZS5ydW50aW1lLm9uTWVzc2FnZS5hZGRMaXN0ZW5lcigocmVxdWVzdDogTWVzc2FnZVBheWxvYWQsIHNlbmRlciwgc2VuZFJlc3BvbnNlKSA9PiB7XG4gIGxvZ2dlci5pbmZvKCdSZWNlaXZlZCBtZXNzYWdlOicsIHJlcXVlc3QudHlwZSwgJ2Zyb206Jywgc2VuZGVyLnVybCk7XG5cbiAgc3dpdGNoIChyZXF1ZXN0LnR5cGUpIHtcbiAgICBjYXNlICdjYXB0dXJlJzpcbiAgICAgIGhhbmRsZUNhcHR1cmUoc2VuZFJlc3BvbnNlKTtcbiAgICAgIHJldHVybiB0cnVlOyAvLyDkv53mjIHmtojmga/pgJrpgZPlvIDmlL5cblxuICAgIGNhc2UgJ2Nsb3NlUGFnZSc6XG4gICAgICBoYW5kbGVDbG9zZVBhZ2UocmVxdWVzdC51cmwgfHwgJycsIGZhbHNlKTtcbiAgICAgIHNlbmRSZXNwb25zZSh7IGNvZGU6IDAgfSk7XG4gICAgICBicmVhaztcblxuICAgIGNhc2UgJ2Nsb3NlQWxsUGFnZSc6XG4gICAgICBoYW5kbGVDbG9zZVBhZ2UocmVxdWVzdC51cmwgfHwgJycsIHRydWUpO1xuICAgICAgc2VuZFJlc3BvbnNlKHsgY29kZTogMCB9KTtcbiAgICAgIGJyZWFrO1xuXG4gICAgY2FzZSAnZ2V0U2V0dGluZ3MnOlxuICAgICAgaGFuZGxlR2V0U2V0dGluZ3Moc2VuZFJlc3BvbnNlKTtcbiAgICAgIHJldHVybiB0cnVlO1xuXG4gICAgY2FzZSAnc2V0U2V0dGluZ3MnOlxuICAgICAgaGFuZGxlU2V0U2V0dGluZ3MocmVxdWVzdC5kYXRhLCBzZW5kUmVzcG9uc2UpO1xuICAgICAgcmV0dXJuIHRydWU7XG5cbiAgICBjYXNlICdnZXRTZXNzaW9ucyc6XG4gICAgICBoYW5kbGVHZXRTZXNzaW9ucyhzZW5kUmVzcG9uc2UpO1xuICAgICAgcmV0dXJuIHRydWU7XG5cbiAgICBjYXNlICdzYXZlU2Vzc2lvbic6XG4gICAgICBoYW5kbGVTYXZlU2Vzc2lvbihyZXF1ZXN0LmRhdGEsIHNlbmRSZXNwb25zZSk7XG4gICAgICByZXR1cm4gdHJ1ZTtcblxuICAgIGNhc2UgJ29wZW5TaWRlUGFuZWwnOlxuICAgICAgaGFuZGxlT3BlblNpZGVQYW5lbChyZXF1ZXN0LmRhdGEsIHNlbmRlciwgc2VuZFJlc3BvbnNlKTtcbiAgICAgIHJldHVybiB0cnVlO1xuXG4gICAgY2FzZSAncmVhZFBhZ2UnOlxuICAgICAgaGFuZGxlUmVhZFBhZ2Uoc2VuZGVyLnRhYj8uaWQsIHNlbmRSZXNwb25zZSk7XG4gICAgICByZXR1cm4gdHJ1ZTtcblxuICAgIGNhc2UgJ2dldFRhYkluZm8nOlxuICAgICAgaGFuZGxlR2V0VGFiSW5mbyhzZW5kZXIudGFiPy5pZCwgc2VuZFJlc3BvbnNlKTtcbiAgICAgIHJldHVybiB0cnVlO1xuXG4gICAgY2FzZSAnYm9va21hcmtQYWdlJzpcbiAgICAgIGhhbmRsZUJvb2ttYXJrUGFnZShyZXF1ZXN0LmRhdGEsIHNlbmRSZXNwb25zZSk7XG4gICAgICByZXR1cm4gdHJ1ZTtcblxuICAgIGNhc2UgJ2dldEJvb2ttYXJrcyc6XG4gICAgICBoYW5kbGVHZXRCb29rbWFya3Moc2VuZFJlc3BvbnNlKTtcbiAgICAgIHJldHVybiB0cnVlO1xuXG4gICAgY2FzZSAnb2xsYW1hQ2hhdCc6XG4gICAgICBoYW5kbGVPbGxhbWFDaGF0KHJlcXVlc3QuZGF0YSwgc2VuZFJlc3BvbnNlKTtcbiAgICAgIHJldHVybiB0cnVlO1xuXG4gICAgZGVmYXVsdDpcbiAgICAgIGxvZ2dlci53YXJuKCdVbmtub3duIG1lc3NhZ2UgdHlwZTonLCByZXF1ZXN0LnR5cGUpO1xuICAgICAgc2VuZFJlc3BvbnNlKHsgY29kZTogLTEsIGVycm9yOiAnVW5rbm93biBtZXNzYWdlIHR5cGUnIH0pO1xuICB9XG59KTtcblxuY2hyb21lLmNvbW1hbmRzLm9uQ29tbWFuZC5hZGRMaXN0ZW5lcigoY29tbWFuZCkgPT4ge1xuICB2b2lkIGhhbmRsZUNvbW1hbmQoY29tbWFuZCk7XG59KTtcblxuLy8g5oiq5Zu+5Yqf6IO9XG5hc3luYyBmdW5jdGlvbiBoYW5kbGVDYXB0dXJlKHNlbmRSZXNwb25zZTogKHJlc3BvbnNlOiBDYXB0dXJlUmVzcG9uc2UpID0+IHZvaWQpOiBQcm9taXNlPHZvaWQ+IHtcbiAgdHJ5IHtcbiAgICBjb25zdCBkYXRhVXJsID0gYXdhaXQgY2hyb21lLnRhYnMuY2FwdHVyZVZpc2libGVUYWIoKTtcbiAgICBzZW5kUmVzcG9uc2UoeyBjb2RlOiAwLCBkYXRhOiBkYXRhVXJsIH0pO1xuICB9IGNhdGNoIChlcnJvcikge1xuICAgIGxvZ2dlci5lcnJvcignQ2FwdHVyZSBmYWlsZWQ6JywgZXJyb3IpO1xuICAgIHNlbmRSZXNwb25zZSh7IGNvZGU6IC0xLCBlcnJvcjogU3RyaW5nKGVycm9yKSB9KTtcbiAgfVxufVxuXG4vLyDlhbPpl63pobXpnaLlip/og71cbmFzeW5jIGZ1bmN0aW9uIGhhbmRsZUNsb3NlUGFnZSh1cmxQcmVmaXg6IHN0cmluZywgY2xvc2VBbGw6IGJvb2xlYW4pOiBQcm9taXNlPHZvaWQ+IHtcbiAgdHJ5IHtcbiAgICBjb25zdCB3aW5kb3dzID0gYXdhaXQgY2hyb21lLndpbmRvd3MuZ2V0QWxsKHsgcG9wdWxhdGU6IHRydWUgfSk7XG4gICAgY29uc3QgY3VycmVudFRhYiA9IGF3YWl0IGdldEN1cnJlbnRUYWIoKTtcblxuICAgIGZvciAoY29uc3Qgd2luZG93IG9mIHdpbmRvd3MpIHtcbiAgICAgIGZvciAoY29uc3QgdGFiIG9mIHdpbmRvdy50YWJzIHx8IFtdKSB7XG4gICAgICAgIGlmICh0YWIudXJsPy5zdGFydHNXaXRoKHVybFByZWZpeCkpIHtcbiAgICAgICAgICBpZiAoY2xvc2VBbGwgfHwgdGFiLmlkICE9PSBjdXJyZW50VGFiPy5pZCkge1xuICAgICAgICAgICAgYXdhaXQgY2hyb21lLnRhYnMucmVtb3ZlKHRhYi5pZCEpO1xuICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgfVxuICAgIH1cbiAgfSBjYXRjaCAoZXJyb3IpIHtcbiAgICBsb2dnZXIuZXJyb3IoJ0Nsb3NlIHBhZ2UgZmFpbGVkOicsIGVycm9yKTtcbiAgfVxufVxuXG4vLyDojrflj5blvZPliY3moIfnrb7pobVcbmFzeW5jIGZ1bmN0aW9uIGdldEN1cnJlbnRUYWIoKTogUHJvbWlzZTxjaHJvbWUudGFicy5UYWIgfCBudWxsPiB7XG4gIGNvbnN0IHRhYnMgPSBhd2FpdCBjaHJvbWUudGFicy5xdWVyeSh7IGFjdGl2ZTogdHJ1ZSwgY3VycmVudFdpbmRvdzogdHJ1ZSB9KTtcbiAgcmV0dXJuIHRhYnNbMF0gfHwgbnVsbDtcbn1cblxuYXN5bmMgZnVuY3Rpb24gaGFuZGxlQ29tbWFuZChjb21tYW5kOiBzdHJpbmcpOiBQcm9taXNlPHZvaWQ+IHtcbiAgdHJ5IHtcbiAgICBjb25zdCB0YWIgPSBhd2FpdCBnZXRDdXJyZW50VGFiKCk7XG4gICAgY29uc3Qgd2luZG93SWQgPSB0YWI/LndpbmRvd0lkO1xuXG4gICAgaWYgKGNvbW1hbmQgPT09ICdvcGVuLXNpZGUtcGFuZWwnKSB7XG4gICAgICBhd2FpdCBvcGVuQ2hhdFVJKHsgd2luZG93SWQgfSk7XG4gICAgICByZXR1cm47XG4gICAgfVxuXG4gICAgaWYgKGNvbW1hbmQgPT09ICduZXctY2hhdCcpIHtcbiAgICAgIGF3YWl0IGNocm9tZS5zdG9yYWdlLmxvY2FsLnNldCh7IHBlbmRpbmdOZXdDaGF0OiB0cnVlIH0pO1xuICAgICAgYXdhaXQgb3BlbkNoYXRVSSh7IHdpbmRvd0lkIH0pO1xuICAgICAgcmV0dXJuO1xuICAgIH1cblxuICAgIGlmIChjb21tYW5kID09PSAnc2NyZWVuc2hvdCcpIHtcbiAgICAgIGNvbnN0IGRhdGFVcmwgPSBhd2FpdCBjaHJvbWUudGFicy5jYXB0dXJlVmlzaWJsZVRhYigpO1xuICAgICAgYXdhaXQgY2hyb21lLnN0b3JhZ2UubG9jYWwuc2V0KHsgcGVuZGluZ1NjcmVlbnNob3Q6IGRhdGFVcmwgfSk7XG4gICAgICBhd2FpdCBvcGVuQ2hhdFVJKHsgd2luZG93SWQgfSk7XG4gICAgICByZXR1cm47XG4gICAgfVxuICB9IGNhdGNoIChlcnJvcikge1xuICAgIGxvZ2dlci5lcnJvcignQ29tbWFuZCBmYWlsZWQ6JywgY29tbWFuZCwgZXJyb3IpO1xuICB9XG59XG5cbi8vIOiOt+WPluiuvue9rlxuYXN5bmMgZnVuY3Rpb24gaGFuZGxlR2V0U2V0dGluZ3Moc2VuZFJlc3BvbnNlOiAocmVzcG9uc2U6IHVua25vd24pID0+IHZvaWQpOiBQcm9taXNlPHZvaWQ+IHtcbiAgdHJ5IHtcbiAgICBjb25zdCBzZXR0aW5ncyA9IGF3YWl0IGdldE1lcmdlZFNldHRpbmdzKCk7XG4gICAgc2VuZFJlc3BvbnNlKHsgY29kZTogMCwgZGF0YTogc2V0dGluZ3MgfSk7XG4gIH0gY2F0Y2ggKGVycm9yKSB7XG4gICAgc2VuZFJlc3BvbnNlKHsgY29kZTogLTEsIGVycm9yOiBTdHJpbmcoZXJyb3IpIH0pO1xuICB9XG59XG5cbi8vIOS/neWtmOiuvue9rlxuYXN5bmMgZnVuY3Rpb24gaGFuZGxlU2V0U2V0dGluZ3MoZGF0YTogdW5rbm93biwgc2VuZFJlc3BvbnNlOiAocmVzcG9uc2U6IHVua25vd24pID0+IHZvaWQpOiBQcm9taXNlPHZvaWQ+IHtcbiAgdHJ5IHtcbiAgICBjb25zdCBjdXJyZW50ID0gYXdhaXQgZ2V0TWVyZ2VkU2V0dGluZ3MoKTtcbiAgICBjb25zdCBuZXh0ID0gKGRhdGEgJiYgdHlwZW9mIGRhdGEgPT09ICdvYmplY3QnKSA/IChkYXRhIGFzIFBhcnRpYWw8U2V0dGluZ3M+KSA6IHt9O1xuICAgIGF3YWl0IGNocm9tZS5zdG9yYWdlLmxvY2FsLnNldCh7IHNldHRpbmdzOiB7IC4uLmN1cnJlbnQsIC4uLm5leHQgfSB9KTtcbiAgICBzZW5kUmVzcG9uc2UoeyBjb2RlOiAwIH0pO1xuICB9IGNhdGNoIChlcnJvcikge1xuICAgIHNlbmRSZXNwb25zZSh7IGNvZGU6IC0xLCBlcnJvcjogU3RyaW5nKGVycm9yKSB9KTtcbiAgfVxufVxuXG4vLyDojrflj5bkvJror53liJfooahcbmFzeW5jIGZ1bmN0aW9uIGhhbmRsZUdldFNlc3Npb25zKHNlbmRSZXNwb25zZTogKHJlc3BvbnNlOiB1bmtub3duKSA9PiB2b2lkKTogUHJvbWlzZTx2b2lkPiB7XG4gIHRyeSB7XG4gICAgY29uc3QgcmVzdWx0ID0gYXdhaXQgY2hyb21lLnN0b3JhZ2UubG9jYWwuZ2V0KCdzZXNzaW9ucycpO1xuICAgIHNlbmRSZXNwb25zZSh7IGNvZGU6IDAsIGRhdGE6IHJlc3VsdC5zZXNzaW9ucyB8fCBbXSB9KTtcbiAgfSBjYXRjaCAoZXJyb3IpIHtcbiAgICBzZW5kUmVzcG9uc2UoeyBjb2RlOiAtMSwgZXJyb3I6IFN0cmluZyhlcnJvcikgfSk7XG4gIH1cbn1cblxuLy8g5L+d5a2Y5Lya6K+dXG5hc3luYyBmdW5jdGlvbiBoYW5kbGVTYXZlU2Vzc2lvbihkYXRhOiB1bmtub3duLCBzZW5kUmVzcG9uc2U6IChyZXNwb25zZTogdW5rbm93bikgPT4gdm9pZCk6IFByb21pc2U8dm9pZD4ge1xuICB0cnkge1xuICAgIGNvbnN0IHJlc3VsdCA9IGF3YWl0IGNocm9tZS5zdG9yYWdlLmxvY2FsLmdldCgnc2Vzc2lvbnMnKTtcbiAgICBjb25zdCBzZXNzaW9ucyA9IHJlc3VsdC5zZXNzaW9ucyB8fCBbXTtcbiAgICBzZXNzaW9ucy5wdXNoKGRhdGEpO1xuICAgIGF3YWl0IGNocm9tZS5zdG9yYWdlLmxvY2FsLnNldCh7IHNlc3Npb25zIH0pO1xuICAgIHNlbmRSZXNwb25zZSh7IGNvZGU6IDAgfSk7XG4gIH0gY2F0Y2ggKGVycm9yKSB7XG4gICAgc2VuZFJlc3BvbnNlKHsgY29kZTogLTEsIGVycm9yOiBTdHJpbmcoZXJyb3IpIH0pO1xuICB9XG59XG5cbmFzeW5jIGZ1bmN0aW9uIGhhbmRsZU9wZW5TaWRlUGFuZWwoZGF0YTogdW5rbm93biwgc2VuZGVyOiBjaHJvbWUucnVudGltZS5NZXNzYWdlU2VuZGVyLCBzZW5kUmVzcG9uc2U6IChyZXNwb25zZTogdW5rbm93bikgPT4gdm9pZCk6IFByb21pc2U8dm9pZD4ge1xuICB0cnkge1xuICAgIGNvbnN0IHNlbGVjdGVkVGV4dCA9XG4gICAgICBkYXRhICYmIHR5cGVvZiBkYXRhID09PSAnb2JqZWN0JyAmJiAnc2VsZWN0ZWRUZXh0JyBpbiBkYXRhICYmIHR5cGVvZiAoZGF0YSBhcyB7IHNlbGVjdGVkVGV4dD86IHVua25vd24gfSkuc2VsZWN0ZWRUZXh0ID09PSAnc3RyaW5nJ1xuICAgICAgICA/IChkYXRhIGFzIHsgc2VsZWN0ZWRUZXh0OiBzdHJpbmcgfSkuc2VsZWN0ZWRUZXh0XG4gICAgICAgIDogJyc7XG5cbiAgICBpZiAoIXNlbGVjdGVkVGV4dCkge1xuICAgICAgc2VuZFJlc3BvbnNlKHsgY29kZTogLTEsIGVycm9yOiAnTWlzc2luZyBzZWxlY3RlZFRleHQnIH0pO1xuICAgICAgcmV0dXJuO1xuICAgIH1cblxuICAgIGNvbnN0IHdpbmRvd0lkID0gc2VuZGVyLnRhYj8ud2luZG93SWQ7XG4gICAgYXdhaXQgb3BlbkNoYXRVSSh7IHdpbmRvd0lkIH0pO1xuXG4gICAgYXdhaXQgY2hyb21lLnN0b3JhZ2UubG9jYWwuc2V0KHsgc2VsZWN0ZWRUZXh0IH0pO1xuICAgIHNlbmRSZXNwb25zZSh7IGNvZGU6IDAgfSk7XG4gIH0gY2F0Y2ggKGVycm9yKSB7XG4gICAgc2VuZFJlc3BvbnNlKHsgY29kZTogLTEsIGVycm9yOiBTdHJpbmcoZXJyb3IpIH0pO1xuICB9XG59XG5cbi8vIOivu+WPlumhtemdouWGheWuuVxuYXN5bmMgZnVuY3Rpb24gaGFuZGxlUmVhZFBhZ2UodGFiSWQ6IG51bWJlciB8IHVuZGVmaW5lZCwgc2VuZFJlc3BvbnNlOiAocmVzcG9uc2U6IHVua25vd24pID0+IHZvaWQpOiBQcm9taXNlPHZvaWQ+IHtcbiAgdHJ5IHtcbiAgICBpZiAoIXRhYklkKSB7XG4gICAgICBzZW5kUmVzcG9uc2UoeyBjb2RlOiAtMSwgZXJyb3I6ICdObyB0YWIgSUQnIH0pO1xuICAgICAgcmV0dXJuO1xuICAgIH1cblxuICAgIGNvbnN0IHJlc3BvbnNlID0gYXdhaXQgY2hyb21lLnRhYnMuc2VuZE1lc3NhZ2UodGFiSWQsIHsgdHlwZTogJ3JlYWRQYWdlJyB9KTtcbiAgICBzZW5kUmVzcG9uc2UocmVzcG9uc2UpO1xuICB9IGNhdGNoIChlcnJvcikge1xuICAgIHNlbmRSZXNwb25zZSh7IGNvZGU6IC0xLCBlcnJvcjogU3RyaW5nKGVycm9yKSB9KTtcbiAgfVxufVxuXG4vLyDojrflj5bmoIfnrb7pobXkv6Hmga9cbmFzeW5jIGZ1bmN0aW9uIGhhbmRsZUdldFRhYkluZm8odGFiSWQ6IG51bWJlciB8IHVuZGVmaW5lZCwgc2VuZFJlc3BvbnNlOiAocmVzcG9uc2U6IHVua25vd24pID0+IHZvaWQpOiBQcm9taXNlPHZvaWQ+IHtcbiAgdHJ5IHtcbiAgICBpZiAoIXRhYklkKSB7XG4gICAgICBzZW5kUmVzcG9uc2UoeyBjb2RlOiAtMSwgZXJyb3I6ICdObyB0YWIgSUQnIH0pO1xuICAgICAgcmV0dXJuO1xuICAgIH1cblxuICAgIGNvbnN0IHRhYiA9IGF3YWl0IGNocm9tZS50YWJzLmdldCh0YWJJZCk7XG4gICAgc2VuZFJlc3BvbnNlKHsgY29kZTogMCwgZGF0YTogdGFiIH0pO1xuICB9IGNhdGNoIChlcnJvcikge1xuICAgIHNlbmRSZXNwb25zZSh7IGNvZGU6IC0xLCBlcnJvcjogU3RyaW5nKGVycm9yKSB9KTtcbiAgfVxufVxuXG4vLyDkuabnrb7pobXpnaJcbmFzeW5jIGZ1bmN0aW9uIGhhbmRsZUJvb2ttYXJrUGFnZShkYXRhOiB1bmtub3duLCBzZW5kUmVzcG9uc2U6IChyZXNwb25zZTogdW5rbm93bikgPT4gdm9pZCk6IFByb21pc2U8dm9pZD4ge1xuICB0cnkge1xuICAgIGNvbnN0IGJvb2ttYXJrRGF0YSA9IGRhdGEgYXMgeyB1cmw6IHN0cmluZzsgdGl0bGU6IHN0cmluZzsgZGVzY3JpcHRpb24/OiBzdHJpbmcgfTtcbiAgICBpZiAoIWJvb2ttYXJrRGF0YS51cmwgfHwgIWJvb2ttYXJrRGF0YS50aXRsZSkge1xuICAgICAgc2VuZFJlc3BvbnNlKHsgY29kZTogLTEsIGVycm9yOiAnTWlzc2luZyB1cmwgb3IgdGl0bGUnIH0pO1xuICAgICAgcmV0dXJuO1xuICAgIH1cblxuICAgIGNvbnN0IGJvb2ttYXJrID0gYXdhaXQgY2hyb21lLmJvb2ttYXJrcy5jcmVhdGUoe1xuICAgICAgdGl0bGU6IGJvb2ttYXJrRGF0YS50aXRsZSxcbiAgICAgIHVybDogYm9va21hcmtEYXRhLnVybCxcbiAgICB9KTtcblxuICAgIHNlbmRSZXNwb25zZSh7IGNvZGU6IDAsIGRhdGE6IGJvb2ttYXJrIH0pO1xuICB9IGNhdGNoIChlcnJvcikge1xuICAgIHNlbmRSZXNwb25zZSh7IGNvZGU6IC0xLCBlcnJvcjogU3RyaW5nKGVycm9yKSB9KTtcbiAgfVxufVxuXG4vLyDojrflj5bkuabnrb7liJfooahcbmFzeW5jIGZ1bmN0aW9uIGhhbmRsZUdldEJvb2ttYXJrcyhzZW5kUmVzcG9uc2U6IChyZXNwb25zZTogdW5rbm93bikgPT4gdm9pZCk6IFByb21pc2U8dm9pZD4ge1xuICB0cnkge1xuICAgIGNvbnN0IGJvb2ttYXJrcyA9IGF3YWl0IGNocm9tZS5ib29rbWFya3MuZ2V0VHJlZSgpO1xuICAgIHNlbmRSZXNwb25zZSh7IGNvZGU6IDAsIGRhdGE6IGJvb2ttYXJrcyB9KTtcbiAgfSBjYXRjaCAoZXJyb3IpIHtcbiAgICBzZW5kUmVzcG9uc2UoeyBjb2RlOiAtMSwgZXJyb3I6IFN0cmluZyhlcnJvcikgfSk7XG4gIH1cbn1cblxuLy8g5aSE55CGT2xsYW1h6IGK5aSp6K+35rGCXG5hc3luYyBmdW5jdGlvbiBoYW5kbGVPbGxhbWFDaGF0KGRhdGE6IHVua25vd24sIHNlbmRSZXNwb25zZTogKHJlc3BvbnNlOiB1bmtub3duKSA9PiB2b2lkKTogUHJvbWlzZTx2b2lkPiB7XG4gIHRyeSB7XG4gICAgY29uc3QgY2hhdERhdGEgPSBkYXRhIGFzIHsgbW9kZWw/OiBzdHJpbmc7IG1lc3NhZ2VzPzogQXJyYXk8eyByb2xlOiBzdHJpbmc7IGNvbnRlbnQ6IHN0cmluZyB9Pjsgc3RyZWFtPzogYm9vbGVhbiB9O1xuICAgIGlmICghY2hhdERhdGEubW9kZWwgfHwgIWNoYXREYXRhLm1lc3NhZ2VzIHx8ICFBcnJheS5pc0FycmF5KGNoYXREYXRhLm1lc3NhZ2VzKSkge1xuICAgICAgc2VuZFJlc3BvbnNlKHsgY29kZTogLTEsIGVycm9yOiAnTWlzc2luZyBtb2RlbCBvciBtZXNzYWdlcycgfSk7XG4gICAgICByZXR1cm47XG4gICAgfVxuXG4gICAgLy8g6YCa6L+HV2Vi5bqU55So55qE5Luj55CG5ZCRT2xsYW1h5pyN5Yqh5Y+R6YCB6K+35rGC77yM6YG/5YWNQ09SU+mXrumimFxuICAgIHRyeSB7XG4gICAgICBjb25zdCByZXNwb25zZSA9IGF3YWl0IGZldGNoKCdodHRwOi8vbG9jYWxob3N0OjMwMDAvYXBpL29sbGFtYS9hcGkvY2hhdCcsIHtcbiAgICAgICAgbWV0aG9kOiAnUE9TVCcsXG4gICAgICAgIGhlYWRlcnM6IHtcbiAgICAgICAgICAnQ29udGVudC1UeXBlJzogJ2FwcGxpY2F0aW9uL2pzb24nLFxuICAgICAgICB9LFxuICAgICAgICBib2R5OiBKU09OLnN0cmluZ2lmeSh7XG4gICAgICAgICAgbW9kZWw6IGNoYXREYXRhLm1vZGVsLFxuICAgICAgICAgIG1lc3NhZ2VzOiBjaGF0RGF0YS5tZXNzYWdlcyxcbiAgICAgICAgICBzdHJlYW06IGNoYXREYXRhLnN0cmVhbSB8fCBmYWxzZSxcbiAgICAgICAgfSksXG4gICAgICB9KTtcblxuICAgICAgaWYgKCFyZXNwb25zZS5vaykge1xuICAgICAgICBzZW5kUmVzcG9uc2UoeyBjb2RlOiAtMSwgZXJyb3I6IGBPbGxhbWEg5pyN5Yqh6K+35rGC5aSx6LSl77yaJHtyZXNwb25zZS5zdGF0dXNUZXh0fWAgfSk7XG4gICAgICAgIHJldHVybjtcbiAgICAgIH1cblxuICAgICAgY29uc3QgcmVzcG9uc2VEYXRhID0gYXdhaXQgcmVzcG9uc2UuanNvbigpO1xuICAgICAgc2VuZFJlc3BvbnNlKHsgY29kZTogMCwgZGF0YTogcmVzcG9uc2VEYXRhIH0pO1xuICAgIH0gY2F0Y2ggKGVycm9yKSB7XG4gICAgICBjb25zdCBlcnJvck1lc3NhZ2UgPSBlcnJvciBpbnN0YW5jZW9mIEVycm9yID8gZXJyb3IubWVzc2FnZSA6IFN0cmluZyhlcnJvcik7XG4gICAgICBsb2dnZXIuZXJyb3IoJ09sbGFtYSBjaGF0IGZhaWxlZDonLCBlcnJvcik7XG4gICAgICBzZW5kUmVzcG9uc2UoeyBcbiAgICAgICAgY29kZTogLTEsIFxuICAgICAgICBlcnJvcjogYOaXoOazlei/nuaOpeWIsFdlYuW6lOeUqOS7o+eQhiAoJHtlcnJvck1lc3NhZ2V9KeOAguivt+ehruS/nVdlYuW6lOeUqOW3suWQr+WKqO+8jOWcsOWdgO+8mmh0dHA6Ly9sb2NhbGhvc3Q6MzAwMGAgXG4gICAgICB9KTtcbiAgICB9XG4gIH0gY2F0Y2ggKGVycm9yKSB7XG4gICAgbG9nZ2VyLmVycm9yKCdPbGxhbWEgY2hhdCBmYWlsZWQ6JywgZXJyb3IpO1xuICAgIHNlbmRSZXNwb25zZSh7IGNvZGU6IC0xLCBlcnJvcjogU3RyaW5nKGVycm9yKSB9KTtcbiAgfVxufVxuXG4vLyDmoIfnrb7pobXmm7TmlrDkuovku7YgLSDnlKjkuo7ms6jlhaXlhoXlrrnohJrmnKxcbmNocm9tZS50YWJzLm9uVXBkYXRlZC5hZGRMaXN0ZW5lcigodGFiSWQsIGNoYW5nZUluZm8sIHRhYikgPT4ge1xuICBpZiAoY2hhbmdlSW5mby5zdGF0dXMgPT09ICdjb21wbGV0ZScgJiYgdGFiLnVybCkge1xuICAgIC8vIOWPr+S7peWcqOi/memHjOagueaNrlVSTOi/m+ihjOeJueWumuWkhOeQhlxuICAgIGxvZ2dlci5kZWJ1ZygnVGFiIHVwZGF0ZWQ6JywgdGFiLnVybCk7XG4gIH1cbn0pO1xuIl19
})();

/******/ })()
;
//# sourceMappingURL=background.js.map