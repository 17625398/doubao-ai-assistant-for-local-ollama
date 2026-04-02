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
/*!****************************!*\
  !*** ./src/popup/index.ts ***!
  \****************************/
__webpack_require__.r(__webpack_exports__);
/* harmony import */ var _core_utils_logger__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! @core/utils/logger */ "../core/src/utils/logger.ts");
// Popup 主逻辑

_core_utils_logger__WEBPACK_IMPORTED_MODULE_0__.logger.setPrefix('[Doubao Popup]');
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
class Popup {
    constructor() {
        this.init();
    }
    init() {
        this.setupEventListeners();
        this.loadRecentSessions();
        _core_utils_logger__WEBPACK_IMPORTED_MODULE_0__.logger.info('Popup initialized');
    }
    setupEventListeners() {
        // 打开侧边栏
        document.getElementById('open-sidepanel')?.addEventListener('click', async () => {
            try {
                const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
                await openChatUI({ windowId: tab?.windowId });
                window.close();
            }
            catch (error) {
                _core_utils_logger__WEBPACK_IMPORTED_MODULE_0__.logger.error('Failed to open side panel:', error);
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
            }
            catch (error) {
                _core_utils_logger__WEBPACK_IMPORTED_MODULE_0__.logger.error('Failed to create new chat:', error);
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
            }
            catch (error) {
                _core_utils_logger__WEBPACK_IMPORTED_MODULE_0__.logger.error('Failed to capture:', error);
            }
        });
        document.getElementById('read-page')?.addEventListener('click', async () => {
            try {
                await chrome.storage.local.set({ pendingReadPage: true });
                const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
                await openChatUI({ windowId: tab?.windowId });
                window.close();
            }
            catch (error) {
                _core_utils_logger__WEBPACK_IMPORTED_MODULE_0__.logger.error('Failed to read page:', error);
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
    async loadRecentSessions() {
        try {
            const result = await chrome.storage.local.get('sessions');
            const sessions = result.sessions || [];
            const sessionsList = document.getElementById('sessions-list');
            if (sessionsList && sessions.length > 0) {
                sessionsList.innerHTML = sessions
                    .slice(-5)
                    .reverse()
                    .map((session) => `
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
                            const session = sessions.find((s) => s.id === sessionId);
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
        }
        catch (error) {
            _core_utils_logger__WEBPACK_IMPORTED_MODULE_0__.logger.error('Failed to load sessions:', error);
        }
    }
}
// 初始化
document.addEventListener('DOMContentLoaded', () => {
    new Popup();
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaW5kZXguanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi8uLi8uLi9zcmMvcG9wdXAvaW5kZXgudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUEsWUFBWTtBQUVaLE9BQU8sRUFBRSxNQUFNLEVBQUUsTUFBTSxvQkFBb0IsQ0FBQztBQUU1QyxNQUFNLENBQUMsU0FBUyxDQUFDLGdCQUFnQixDQUFDLENBQUM7QUFFbkMsS0FBSyxVQUFVLFVBQVUsQ0FBQyxVQUFpQyxFQUFFO0lBQzNELE1BQU0sU0FBUyxHQUFJLE1BQWMsQ0FBQyxTQUFpRixDQUFDO0lBQ3BILE1BQU0sR0FBRyxHQUFHLE1BQU0sQ0FBQyxPQUFPLENBQUMsTUFBTSxDQUFDLGlCQUFpQixDQUFDLENBQUM7SUFFckQsSUFBSSxTQUFTLEVBQUUsSUFBSSxJQUFJLE9BQU8sT0FBTyxDQUFDLFFBQVEsS0FBSyxRQUFRLEVBQUUsQ0FBQztRQUM1RCxJQUFJLENBQUM7WUFDSCxNQUFNLFNBQVMsQ0FBQyxJQUFJLENBQUMsRUFBRSxRQUFRLEVBQUUsT0FBTyxDQUFDLFFBQVEsRUFBRSxDQUFDLENBQUM7WUFDckQsT0FBTztRQUNULENBQUM7UUFBQyxPQUFPLEtBQUssRUFBRSxDQUFDO1lBQ2YsTUFBTSxDQUFDLElBQUksQ0FBQywwQ0FBMEMsRUFBRSxLQUFLLENBQUMsQ0FBQztRQUNqRSxDQUFDO0lBQ0gsQ0FBQztJQUVELE1BQU0sTUFBTSxDQUFDLElBQUksQ0FBQyxNQUFNLENBQUM7UUFDdkIsR0FBRztRQUNILE1BQU0sRUFBRSxJQUFJO1FBQ1osR0FBRyxDQUFDLE9BQU8sT0FBTyxDQUFDLFFBQVEsS0FBSyxRQUFRLENBQUMsQ0FBQyxDQUFDLEVBQUUsUUFBUSxFQUFFLE9BQU8sQ0FBQyxRQUFRLEVBQUUsQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDO0tBQ2hGLENBQUMsQ0FBQztBQUNMLENBQUM7QUFFRCxNQUFNLEtBQUs7SUFDVDtRQUNFLElBQUksQ0FBQyxJQUFJLEVBQUUs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T0FBTyxFQUFFLENBQUM7Z0NBQ1osTUFBTSxNQUFNLENBQUMsT0FBTyxDQUFDLEtBQUssQ0FBQyxHQUFHLENBQUMsRUFBRSxjQUFjLEVBQUUsT0FBTyxFQUFFLENBQUMsQ0FBQztnQ0FDNUQsTUFBTSxDQUFDLEdBQUcsQ0FBQyxHQUFHLE1BQU0sTUFBTSxDQUFDLElBQUksQ0FBQyxLQUFLLENBQUMsRUFBRSxNQUFNLEVBQUUsSUFBSSxFQUFFLGFBQWEsRUFBRSxJQUFJLEVBQUUsQ0FBQyxDQUFDO2dDQUM3RSxNQUFNLFVBQVUsQ0FBQyxFQUFFLFFBQVEsRUFBRSxHQUFHLEVBQUUsUUFBUSxFQUFFLENBQUMsQ0FBQztnQ0FDOUMsTUFBTSxDQUFDLEtBQUssRUFBRSxDQUFDOzRCQUNqQixDQUFDO3dCQUNILENBQUM7b0JBQ0gsQ0FBQyxDQUFDLENBQUM7Z0JBQ0wsQ0FBQyxDQUFDLENBQUM7WUFDTCxDQUFDO1FBQ0gsQ0FBQztRQUFDLE9BQU8sS0FBSyxFQUFFLENBQUM7WUFDZixNQUFNLENBQUMsS0FBSyxDQUFDLDBCQUEwQixFQUFFLEtBQUssQ0FBQyxDQUFDO1FBQ2xELENBQUM7SUFDSCxDQUFDO0NBQ0Y7QUFFRCxNQUFNO0FBQ04sUUFBUSxDQUFDLGdCQUFnQixDQUFDLGtCQUFrQixFQUFFLEdBQUcsRUFBRTtJQUNqRCxJQUFJLEtBQUssRUFBRSxDQUFDO0FBQ2QsQ0FBQyxDQUFDLENBQUMiLCJzb3VyY2VzQ29udGVudCI6WyIvLyBQb3B1cCDkuLvpgLvovpFcblxuaW1wb3J0IHsgbG9nZ2VyIH0gZnJvbSAnQGNvcmUvdXRpbHMvbG9nZ2VyJztcblxubG9nZ2VyLnNldFByZWZpeCgnW0RvdWJhbyBQb3B1cF0nKTtcblxuYXN5bmMgZnVuY3Rpb24gb3BlbkNoYXRVSShvcHRpb25zOiB7IHdpbmRvd0lkPzogbnVtYmVyIH0gPSB7fSk6IFByb21pc2U8dm9pZD4ge1xuICBjb25zdCBzaWRlUGFuZWwgPSAoY2hyb21lIGFzIGFueSkuc2lkZVBhbmVsIGFzIHsgb3Blbj86IChvcHRzOiB7IHdpbmRvd0lkOiBudW1iZXIgfSkgPT4gUHJvbWlzZTx2b2lkPiB9IHwgdW5kZWZpbmVkO1xuICBjb25zdCB1cmwgPSBjaHJvbWUucnVudGltZS5nZXRVUkwoJ3NpZGUtcGFuZWwuaHRtbCcpO1xuXG4gIGlmIChzaWRlUGFuZWw/Lm9wZW4gJiYgdHlwZW9mIG9wdGlvbnMud2luZG93SWQgPT09ICdudW1iZXInKSB7XG4gICAgdHJ5IHtcbiAgICAgIGF3YWl0IHNpZGVQYW5lbC5vcGVuKHsgd2luZG93SWQ6IG9wdGlvbnMud2luZG93SWQgfSk7XG4gICAgICByZXR1cm47XG4gICAgfSBjYXRjaCAoZXJyb3IpIHtcbiAgICAgIGxvZ2dlci53YXJuKCdTaWRlIHBhbmVsIG9wZW4gZmFpbGVkLCBmYWxsYmFjayB0byB0YWI6JywgZXJyb3IpO1xuICAgIH1cbiAgfVxuXG4gIGF3YWl0IGNocm9tZS50YWJzLmNyZWF0ZSh7XG4gICAgdXJsLFxuICAgIGFjdGl2ZTogdHJ1ZSxcbiAgICAuLi4odHlwZW9mIG9wdGlvbnMud2luZG93SWQgPT09ICdudW1iZXInID8geyB3aW5kb3dJZDogb3B0aW9ucy53aW5kb3dJZCB9IDoge30pLFxuICB9KTtcbn1cblxuY2xhc3MgUG9wdXAge1xuICBjb25zdHJ1Y3RvcigpIHtcbiAgICB0aGlzLmluaXQoKTtcbiAgfVxuXG4gIHByaXZhdGUgaW5pdCgpOiB2b2lkIHtcbiAgICB0aGlzLnNldHVwRXZlbnRMaXN0ZW5lcnMoKTtcbiAgICB0aGlzLmxvYWRSZWNlbnRTZXNzaW9ucygpO1xuICAgIGxvZ2dlci5pbmZvKCdQb3B1cCBpbml0aWFsaXplZCcpO1xuICB9XG5cbiAgcHJpdmF0ZSBzZXR1cEV2ZW50TGlzdGVuZXJzKCk6IHZvaWQge1xuICAgIC8vIOaJk+W8gOS+p+i+ueagj1xuICAgIGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKCdvcGVuLXNpZGVwYW5lbCcpPy5hZGRFdmVudExpc3RlbmVyKCdjbGljaycsIGFzeW5jICgpID0+IHtcbiAgICAgIHRyeSB7XG4gICAgICAgIGNvbnN0IFt0YWJdID0gYXdhaXQgY2hyb21lLnRhYnMucXVlcnkoeyBhY3RpdmU6IHRydWUsIGN1cnJlbnRXaW5kb3c6IHRydWUgfSk7XG4gICAgICAgIGF3YWl0IG9wZW5DaGF0VUkoeyB3aW5kb3dJZDogdGFiPy53aW5kb3dJZCB9KTtcbiAgICAgICAgd2luZG93LmNsb3NlKCk7XG4gICAgICB9IGNhdGNoIChlcnJvcikge1xuICAgICAgICBsb2dnZXIuZXJyb3IoJ0ZhaWxlZCB0byBvcGVuIHNpZGUgcGFuZWw6JywgZXJyb3IpO1xuICAgICAgfVxuICAgIH0pO1xuXG4gICAgLy8g5paw5bu65a+56K+dXG4gICAgZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoJ25ldy1jaGF0Jyk/LmFkZEV2ZW50TGlzdGVuZXIoJ2NsaWNrJywgYXN5bmMgKCkgPT4ge1xuICAgICAgdHJ5IHtcbiAgICAgICAgYXdhaXQgY2hyb21lLnN0b3JhZ2UubG9jYWwuc2V0KHsgcGVuZGluZ05ld0NoYXQ6IHRydWUgfSk7XG5cbiAgICAgICAgLy8g5omT5byA5L6n6L655qCPXG4gICAgICAgIGNvbnN0IFt0YWJdID0gYXdhaXQgY2hyb21lLnRhYnMucXVlcnkoeyBhY3RpdmU6IHRydWUsIGN1cnJlbnRXaW5kb3c6IHRydWUgfSk7XG4gICAgICAgIGF3YWl0IG9wZW5DaGF0VUkoeyB3aW5kb3dJZDogdGFiPy53aW5kb3dJZCB9KTtcbiAgICAgICAgd2luZG93LmNsb3NlKCk7XG4gICAgICB9IGNhdGNoIChlcnJvcikge1xuICAgICAgICBsb2dnZXIuZXJyb3IoJ0ZhaWxlZCB0byBjcmVhdGUgbmV3IGNoYXQ6JywgZXJyb3IpO1xuICAgICAgfVxuICAgIH0pO1xuXG4gICAgLy8g5oiq5Zu+5o+Q6ZeuXG4gICAgZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoJ2NhcHR1cmUtcGFnZScpPy5hZGRFdmVudExpc3RlbmVyKCdjbGljaycsIGFzeW5jICgpID0+IHtcbiAgICAgIHRyeSB7XG4gICAgICAgIGNvbnN0IHJlc3BvbnNlID0gYXdhaXQgY2hyb21lLnJ1bnRpbWUuc2VuZE1lc3NhZ2UoeyB0eXBlOiAnY2FwdHVyZScgfSk7XG4gICAgICAgIGlmIChyZXNwb25zZS5jb2RlID09PSAwKSB7XG4gICAgICAgICAgLy8g5a2Y5YKo5oiq5Zu+5bm25omT5byA5L6n6L655qCPXG4gICAgICAgICAgYXdhaXQgY2hyb21lLnN0b3JhZ2UubG9jYWwuc2V0KHtcbiAgICAgICAgICAgIHBlbmRpbmdTY3JlZW5zaG90OiByZXNwb25zZS5kYXRhLFxuICAgICAgICAgIH0pO1xuXG4gICAgICAgICAgY29uc3QgW3RhYl0gPSBhd2FpdCBjaHJvbWUudGFicy5xdWVyeSh7IGFjdGl2ZTogdHJ1ZSwgY3VycmVudFdpbmRvdzogdHJ1ZSB9KTtcbiAgICAgICAgICBhd2FpdCBvcGVuQ2hhdFVJKHsgd2luZG93SWQ6IHRhYj8ud2luZG93SWQgfSk7XG4gICAgICAgIH1cbiAgICAgICAgd2luZG93LmNsb3NlKCk7XG4gICAgICB9IGNhdGNoIChlcnJvcikge1xuICAgICAgICBsb2dnZXIuZXJyb3IoJ0ZhaWxlZCB0byBjYXB0dXJlOicsIGVycm9yKTtcbiAgICAgIH1cbiAgICB9KTtcblxuICAgIGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKCdyZWFkLXBhZ2UnKT8uYWRkRXZlbnRMaXN0ZW5lcignY2xpY2snLCBhc3luYyAoKSA9PiB7XG4gICAgICB0cnkge1xuICAgICAgICBhd2FpdCBjaHJvbWUuc3RvcmFnZS5sb2NhbC5zZXQoeyBwZW5kaW5nUmVhZFBhZ2U6IHRydWUgfSk7XG4gICAgICAgIGNvbnN0IFt0YWJdID0gYXdhaXQgY2hyb21lLnRhYnMucXVlcnkoeyBhY3RpdmU6IHRydWUsIGN1cnJlbnRXaW5kb3c6IHRydWUgfSk7XG4gICAgICAgIGF3YWl0IG9wZW5DaGF0VUkoeyB3aW5kb3dJZDogdGFiPy53aW5kb3dJZCB9KTtcbiAgICAgICAgd2luZG93LmNsb3NlKCk7XG4gICAgICB9IGNhdGNoIChlcnJvcikge1xuICAgICAgICBsb2dnZXIuZXJyb3IoJ0ZhaWxlZCB0byByZWFkIHBhZ2U6JywgZXJyb3IpO1xuICAgICAgfVxuICAgIH0pO1xuXG4gICAgLy8g5omT5byA6K6+572uXG4gICAgZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoJ29wZW4tc2V0dGluZ3MnKT8uYWRkRXZlbnRMaXN0ZW5lcignY2xpY2snLCAoKSA9PiB7XG4gICAgICBjaHJvbWUucnVudGltZS5vcGVuT3B0aW9uc1BhZ2UoKTtcbiAgICAgIHdpbmRvdy5jbG9zZSgpO1xuICAgIH0pO1xuXG4gICAgLy8g5omT5byA5a6M5pW06aG16Z2iXG4gICAgZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoJ29wZW4tZnVsbCcpPy5hZGRFdmVudExpc3RlbmVyKCdjbGljaycsICgpID0+IHtcbiAgICAgIGNocm9tZS50YWJzLmNyZWF0ZSh7IHVybDogJ2h0dHBzOi8vd3d3LmRvdWJhby5jb20vY2hhdCcgfSk7XG4gICAgICB3aW5kb3cuY2xvc2UoKTtcbiAgICB9KTtcbiAgfVxuXG4gIHByaXZhdGUgYXN5bmMgbG9hZFJlY2VudFNlc3Npb25zKCk6IFByb21pc2U8dm9pZD4ge1xuICAgIHRyeSB7XG4gICAgICBjb25zdCByZXN1bHQgPSBhd2FpdCBjaHJvbWUuc3RvcmFnZS5sb2NhbC5nZXQoJ3Nlc3Npb25zJyk7XG4gICAgICBjb25zdCBzZXNzaW9ucyA9IHJlc3VsdC5zZXNzaW9ucyB8fCBbXTtcbiAgICAgIGNvbnN0IHNlc3Npb25zTGlzdCA9IGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKCdzZXNzaW9ucy1saXN0Jyk7XG5cbiAgICAgIGlmIChzZXNzaW9uc0xpc3QgJiYgc2Vzc2lvbnMubGVuZ3RoID4gMCkge1xuICAgICAgICBzZXNzaW9uc0xpc3QuaW5uZXJIVE1MID0gc2Vzc2lvbnNcbiAgICAgICAgICAuc2xpY2UoLTUpXG4gICAgICAgICAgLnJldmVyc2UoKVxuICAgICAgICAgIC5tYXAoKHNlc3Npb246IHsgaWQ6IHN0cmluZzsgdGl0bGU6IHN0cmluZyB9KSA9PiBgXG4gICAgICAgICAgICA8bGkgZGF0YS1zZXNzaW9uLWlkPVwiJHtzZXNzaW9uLmlkfVwiPlxuICAgICAgICAgICAgICAke3Nlc3Npb24udGl0bGV9XG4gICAgICAgICAgICA8L2xpPlxuICAgICAgICAgIGApXG4gICAgICAgICAgLmpvaW4oJycpO1xuXG4gICAgICAgIC8vIOa3u+WKoOeCueWHu+S6i+S7tlxuICAgICAgICBzZXNzaW9uc0xpc3QucXVlcnlTZWxlY3RvckFsbCgnbGknKS5mb3JFYWNoKChsaSkgPT4ge1xuICAgICAgICAgIGxpLmFkZEV2ZW50TGlzdGVuZXIoJ2NsaWNrJywgYXN5bmMgKCkgPT4ge1xuICAgICAgICAgICAgY29uc3Qgc2Vzc2lvbklkID0gbGkuZ2V0QXR0cmlidXRlKCdkYXRhLXNlc3Npb24taWQnKTtcbiAgICAgICAgICAgIGlmIChzZXNzaW9uSWQpIHtcbiAgICAgICAgICAgICAgLy8g5Yqg6L296YCJ5Lit55qE5Lya6K+dXG4gICAgICAgICAgICAgIGNvbnN0IHNlc3Npb24gPSBzZXNzaW9ucy5maW5kKChzOiB7IGlkOiBzdHJpbmcgfSkgPT4gcy5pZCA9PT0gc2Vzc2lvbklkKTtcbiAgICAgICAgICAgICAgaWYgKHNlc3Npb24pIHtcbiAgICAgICAgICAgICAgICBhd2FpdCBjaHJvbWUuc3RvcmFnZS5sb2NhbC5zZXQoeyBjdXJyZW50U2Vzc2lvbjogc2Vzc2lvbiB9KTtcbiAgICAgICAgICAgICAgICBjb25zdCBbdGFiXSA9IGF3YWl0IGNocm9tZS50YWJzLnF1ZXJ5KHsgYWN0aXZlOiB0cnVlLCBjdXJyZW50V2luZG93OiB0cnVlIH0pO1xuICAgICAgICAgICAgICAgIGF3YWl0IG9wZW5DaGF0VUkoeyB3aW5kb3dJZDogdGFiPy53aW5kb3dJZCB9KTtcbiAgICAgICAgICAgICAgICB3aW5kb3cuY2xvc2UoKTtcbiAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICAgIH0pO1xuICAgICAgICB9KTtcbiAgICAgIH1cbiAgICB9IGNhdGNoIChlcnJvcikge1xuICAgICAgbG9nZ2VyLmVycm9yKCdGYWlsZWQgdG8gbG9hZCBzZXNzaW9uczonLCBlcnJvcik7XG4gICAgfVxuICB9XG59XG5cbi8vIOWIneWni+WMllxuZG9jdW1lbnQuYWRkRXZlbnRMaXN0ZW5lcignRE9NQ29udGVudExvYWRlZCcsICgpID0+IHtcbiAgbmV3IFBvcHVwKCk7XG59KTtcbiJdfQ==
})();

/******/ })()
;
//# sourceMappingURL=popup.js.map