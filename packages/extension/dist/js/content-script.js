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
/*!*************************************!*\
  !*** ./src/content-script/index.ts ***!
  \*************************************/
__webpack_require__.r(__webpack_exports__);
/* harmony import */ var _core_utils_logger__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! @core/utils/logger */ "../core/src/utils/logger.ts");
// Content Script - 注入到网页中运行

_core_utils_logger__WEBPACK_IMPORTED_MODULE_0__.logger.setPrefix('[Doubao ContentScript]');
// 标记脚本已加载
window.screenPlugin = true;
class ReadPageDomToMarkdown {
    constructor(partialOptions) {
        this.nestedTables = new Map();
        this.tableCounter = 1;
        this.urlCount = 0;
        this.urlSeen = new Set();
        this.ignoreTags = new Set([
            'input',
            'select',
            'fieldset',
            'option',
            'optgroup',
            'script',
            'style',
            'link',
            'noscript',
        ]);
        this.blockTags = new Set([
            'address',
            'article',
            'aside',
            'audio',
            'blockquote',
            'body',
            'canvas',
            'center',
            'dd',
            'dir',
            'div',
            'dl',
            'dt',
            'fieldset',
            'figcaption',
            'figure',
            'footer',
            'form',
            'frameset',
            'h1',
            'h2',
            'h3',
            'h4',
            'h5',
            'h6',
            'header',
            'hgroup',
            'hr',
            'html',
            'isindex',
            'li',
            'main',
            'menu',
            'nav',
            'noframes',
            'noscript',
            'ol',
            'output',
            'p',
            'pre',
            'section',
            'table',
            'tbody',
            'td',
            'tfoot',
            'th',
            'thead',
            'tr',
            'ul',
        ]);
        this.options = {
            extractImageUrl: false,
            extractLinkUrl: false,
            maxUrls: 200,
            headingLevel: 1,
            ...(partialOptions || {}),
        };
    }
    convert(node) {
        if (!node)
            return '';
        let out = this.convertNode(node);
        out = out.replace(/\s+\n$/gim, '\n').replace(/\n{3,}/gim, '\n\n');
        if (this.nestedTables.size > 0) {
            const footnotes = [];
            this.nestedTables.forEach((content, id) => {
                footnotes.push({
                    id,
                    content: `\n\n[^table${id}]:\n${this.indent(this.codeWrap(content), 2, ' ')}\n`,
                });
            });
            out += footnotes
                .sort((a, b) => a.id - b.id)
                .map((x) => x.content)
                .join('');
        }
        return out.trim();
    }
    convertNode(node) {
        if (node.nodeType === Node.TEXT_NODE) {
            const text = node.textContent || '';
            return text.trim();
        }
        if (node.nodeType !== Node.ELEMENT_NODE)
            return '';
        const el = node;
        const tag = el.tagName.toLowerCase();
        if (this.ignoreTags.has(tag))
            return '';
        if (el instanceof HTMLSlotElement) {
            const assigned = el.assignedNodes();
            let out = '';
            for (const n of Array.from(assigned))
                out += this.convertNode(n);
            return out;
        }
        if (el.shadowRoot) {
            const shadow = el.shadowRoot;
            if (!shadow)
                return '';
            let out = '';
            for (const child of Array.from(shadow.childNodes))
                out += this.convertNode(child);
            return out;
        }
        let out = '';
        switch (tag) {
            case 'h1':
            case 'h2':
            case 'h3':
            case 'h4':
            case 'h5':
            case 'h6':
                out = this.handleHeading(el);
                break;
            case 'p':
                out = this.handleChildren(el);
                break;
            case 'strong':
            case 'b':
                out = this.handleBold(el);
                break;
            case 'em':
            case 'i':
                out = this.handleItalic(el);
                break;
            case 'a':
                out = this.handleLink(el);
                break;
            case 'img':
                out = this.handleImage(el);
                break;
            case 'ul':
            case 'ol':
                out = this.handleList(el);
                break;
            case 'li':
                out = this.handleChildren(el);
                break;
            case 'blockquote':
                out = this.handleBlockquote(el);
                break;
            case 'pre':
            case 'code':
                out = this.handleCode(el);
                break;
            case 'table':
                out = this.handleTable(el);
                break;
            case 'thead':
            case 'tbody':
            case 'tr':
            case 'th':
            case 'td':
                out = this.handleTableElement(el);
                break;
            default:
                out = this.handleChildren(el);
                break;
        }
        if (out.trim().length <= 0)
            return '';
        if (this.blockTags.has(tag)) {
            out = `\n\n${out}\n\n`;
        }
        else if (out.trim().length > 0) {
            out = `${out} `;
        }
        return out;
    }
    handleChildren(el) {
        let out = '';
        for (const child of Array.from(el.childNodes))
            out += this.convertNode(child);
        return out;
    }
    handleHeading(el) {
        const level = Number.parseInt(el.tagName[1] || '1', 10) + this.options.headingLevel;
        const text = this.handleChildren(el).replace(/^\s+/, '');
        if (text.trim().length <= 0)
            return '';
        return `${'#'.repeat(level)} ${text}`;
    }
    handleBold(el) {
        const text = this.handleChildren(el).trim();
        if (text.length <= 0)
            return '';
        return `**${text}**`;
    }
    handleItalic(el) {
        const text = this.handleChildren(el).trim();
        if (text.length <= 0)
            return '';
        return `_${text}_`;
    }
    normalizeUrl(url) {
        if (url.startsWith('//'))
            return `${location.protocol}${url}`;
        if (url.startsWith('/'))
            return `${location.origin}${url}`;
        return url;
    }
    takeUrl(raw) {
        if (!raw)
            return '';
        const normalized = this.normalizeUrl(raw.trim());
        if (normalized.startsWith('javascript:'))
            return '';
        if (normalized.length >= 256)
            return '';
        let abs;
        try {
            abs = new URL(normalized, location.href).toString();
        }
        catch {
            return '';
        }
        if (!abs.startsWith('http://') && !abs.startsWith('https://'))
            return '';
        if (this.urlSeen.has(abs))
            return abs;
        if (this.urlCount >= this.options.maxUrls)
            return '';
        this.urlSeen.add(abs);
        this.urlCount += 1;
        return abs;
    }
    handleLink(el) {
        const text = this.handleChildren(el).replace(/\n/g, ' ').trim();
        if (!text)
            return '';
        if (!this.options.extractLinkUrl)
            return text;
        const href = this.takeUrl(el.getAttribute('href') || '');
        if (!href)
            return text;
        const markdown = `[${text}](${href})`;
        if (/^#+ /.test(text))
            return `\n\n${markdown}\n\n`;
        return markdown;
    }
    handleImage(el) {
        const alt = (el.getAttribute('alt') || '').trim();
        if (!this.options.extractImageUrl)
            return alt ? `![${alt}]()` : '';
        const src = this.takeUrl(el.currentSrc || el.getAttribute('src') || '');
        if (!src && !alt)
            return '';
        if (!src)
            return alt ? `![${alt}]()` : '';
        return `![${alt}](${src})`;
    }
    indent(text, count = 0, unit = '\t') {
        if (count <= 0)
            return text;
        const prefix = unit.repeat(count);
        return text
            .split('\n')
            .map((line) => (line.trim() ? `${prefix}${line}` : line))
            .join('\n');
    }
    handleList(el) {
        const ordered = el.tagName.toLowerCase() === 'ol';
        let out = '';
        let index = 1;
        for (const child of Array.from(el.children)) {
            if (!(child instanceof Element))
                continue;
            if (child.tagName.toLowerCase() !== 'li') {
                out += this.convertNode(child);
                continue;
            }
            const inner = this.indent(this.handleChildren(child).trim(), 1).trim();
            if (!inner)
                continue;
            if (ordered) {
                out += `\n${index}. ${inner}`;
                index += 1;
            }
            else {
                out += `\n- ${inner}`;
            }
        }
        return out ? `${out}` : '';
    }
    handleBlockquote(el) {
        const text = this.handleChildren(el)
            .split('\n')
            .map((line) => `> ${line}`)
            .join('\n');
        return `${text}`;
    }
    codeWrap(code, lang = '') {
        const normalized = code.replace(/^\n+|\n+$/gi, '');
        return `\`\`\`${lang}\n${normalized}\n\`\`\``;
    }
    handleCode(el) {
        const tag = el.tagName.toLowerCase();
        const text = el.textContent || '';
        if (tag === 'code' && el.parentElement?.tagName.toLowerCase() !== 'pre')
            return `\`${text}\``;
        const cls = (el.getAttribute('class') || '').trim();
        const lang = cls.startsWith('language-') ? cls.replace('language-', '') : '';
        return this.codeWrap(text, lang);
    }
    escapeCsvCell(text) {
        if (!text)
            return '';
        let needWrap = false;
        const escaped = text.replace(/[,"\n]/gim, (ch) => {
            needWrap = true;
            if (ch === '"')
                return "'";
            if (ch === '\n')
                return '\\n';
            return ch;
        });
        return needWrap ? `"${escaped}"` : escaped;
    }
    processRowToCSV(tr) {
        const cells = Array.from(tr.children).filter((x) => {
            const tag = x.tagName.toLowerCase();
            return tag === 'th' || tag === 'td';
        });
        const row = [];
        for (const cell of cells) {
            let value = '';
            for (const child of Array.from(cell.childNodes)) {
                if (child.nodeType === Node.ELEMENT_NODE && child.tagName.toLowerCase() === 'table') {
                    const id = this.tableCounter;
                    this.tableCounter += 1;
                    const tableText = this.handleTableElement(child);
                    this.nestedTables.set(id, tableText);
                    value += `[^table${id}]`;
                    continue;
                }
                value += this.convertNode(child);
            }
            value = value.trim();
            const colspanRaw = cell.getAttribute('colspan') || '1';
            const colspan = Number.isFinite(Number(colspanRaw)) ? Math.max(1, Number(colspanRaw)) : 1;
            for (let i = 0; i < colspan; i += 1) {
                if (i === 0)
                    row.push(this.escapeCsvCell(value));
                else
                    row.push('');
            }
        }
        return row.join(',');
    }
    handleTableElement(el) {
        const tag = el.tagName.toLowerCase();
        if (tag === 'table') {
            let csv = '\n';
            const groups = Array.from(el.children).filter((x) => {
                const t = x.tagName.toLowerCase();
                return t === 'thead' || t === 'tbody' || t === 'tfoot';
            });
            let rows = [];
            if (groups.length > 0) {
                for (const g of groups) {
                    rows = rows.concat(Array.from(g.children).filter((x) => x.tagName.toLowerCase() === 'tr'));
                }
            }
            else {
                rows = Array.from(el.children).filter((x) => x.tagName.toLowerCase() === 'tr');
            }
            for (const tr of rows)
                csv += `${this.processRowToCSV(tr)}\n`;
            return `${csv}\n`;
        }
        if (tag === 'th' || tag === 'td')
            return this.convertNode(el).trim();
        return this.handleChildren(el);
    }
    codeWrapTable(csv) {
        return this.codeWrap(csv, 'csv');
    }
    handleTable(el) {
        const csv = this.handleTableElement(el);
        return this.codeWrapTable(csv);
    }
}
// 监听来自页面的消息
window.addEventListener('message', (event) => {
    // 安全检查：只处理来自当前页面的消息
    if (event.source !== window) {
        return;
    }
    const data = event.data;
    // 验证消息格式
    if (!data || typeof data !== 'object' || !('func' in data)) {
        return;
    }
    const messageData = data;
    _core_utils_logger__WEBPACK_IMPORTED_MODULE_0__.logger.debug('Received message from page:', messageData.func);
    switch (messageData.func) {
        case 'screenshop': {
            const screenshotData = messageData;
            handleScreenshot(screenshotData.method);
            break;
        }
        case 'closePage': {
            const closeData = messageData;
            handleClosePage(closeData.url, false);
            break;
        }
        case 'closeAllPage': {
            const closeAllData = messageData;
            handleClosePage(closeAllData.url, true);
            break;
        }
        default:
            // 转发其他消息到 background
            chrome.runtime.sendMessage({ type: messageData.func, data });
    }
}, false);
// 处理截图请求
function handleScreenshot(method) {
    chrome.runtime.sendMessage({ type: 'capture' }, (response) => {
        if (response?.code === 0) {
            window.postMessage({ method, data: response.data }, '*');
        }
        else {
            _core_utils_logger__WEBPACK_IMPORTED_MODULE_0__.logger.error('Screenshot failed:', response?.error);
        }
    });
}
// 处理关闭页面请求
function handleClosePage(url, closeAll) {
    chrome.runtime.sendMessage({
        type: closeAll ? 'closeAllPage' : 'closePage',
        url,
    });
}
// DOM 加载完成后标记页面
document.addEventListener('DOMContentLoaded', () => {
    const manifest = chrome.runtime.getManifest();
    document.body.setAttribute('data-screen', `1-${manifest.version}`);
    _core_utils_logger__WEBPACK_IMPORTED_MODULE_0__.logger.info('Content script loaded, version:', manifest.version);
});
// 监听来自 background 的消息
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    _core_utils_logger__WEBPACK_IMPORTED_MODULE_0__.logger.debug('Received message from background:', request);
    if (request && typeof request === 'object' && 'type' in request) {
        const typedRequest = request;
        switch (typedRequest.type) {
            case 'readPage':
                const maxChars = typeof typedRequest.maxChars === 'number' ? typedRequest.maxChars : 120000;
                const extractLinkUrl = typedRequest.extractLinkUrl === true;
                const extractImageUrl = typedRequest.extractImageUrl === true;
                const maxUrls = typeof typedRequest.maxUrls === 'number' ? typedRequest.maxUrls : 200;
                const converter = new ReadPageDomToMarkdown({
                    extractImageUrl,
                    extractLinkUrl,
                    maxUrls,
                });
                const content = converter.convert(document.body || document.documentElement);
                const data = content.length > maxChars ? content.slice(0, maxChars) : content;
                sendResponse({ code: 0, data, url: window.location.href, title: document.title });
                return true;
            case 'getPageInfo':
                sendResponse({
                    code: 0,
                    data: {
                        url: window.location.href,
                        title: document.title,
                        favicon: document.querySelector('link[rel="icon"]')?.getAttribute('href') || '',
                        length: document.body?.textContent?.length || 0,
                        wordCount: document.body?.textContent?.split(/\s+/).length || 0,
                    }
                });
                return true;
            case 'getSelection':
                const selection = window.getSelection();
                const selectedText = selection?.toString() || '';
                sendResponse({
                    code: 0,
                    data: {
                        text: selectedText,
                        length: selectedText.length,
                    }
                });
                return true;
            case 'scrollTo':
                if (typeof typedRequest.offset === 'number') {
                    window.scrollTo(0, typedRequest.offset);
                    sendResponse({ code: 0 });
                }
                else {
                    sendResponse({ code: -1, error: 'Invalid offset' });
                }
                return true;
            default:
                sendResponse({ received: true });
                return true;
        }
    }
    sendResponse({ received: true });
    return true;
});
const selectionButtonId = 'doubao-selection-action';
let selectionButton = null;
let selectionUpdateTimer = null;
let lastSelectionText = '';
function ensureSelectionButton() {
    if (selectionButton)
        return selectionButton;
    const btn = document.createElement('button');
    btn.id = selectionButtonId;
    btn.type = 'button';
    btn.textContent = '解释';
    btn.style.position = 'fixed';
    btn.style.zIndex = '2147483647';
    btn.style.display = 'none';
    btn.style.padding = '6px 10px';
    btn.style.border = '1px solid rgba(0,0,0,0.08)';
    btn.style.borderRadius = '10px';
    btn.style.background = '#0057ff';
    btn.style.color = '#fff';
    btn.style.fontSize = '12px';
    btn.style.fontWeight = '600';
    btn.style.lineHeight = '16px';
    btn.style.cursor = 'pointer';
    btn.style.boxShadow = '0 6px 18px rgba(0,0,0,0.12)';
    btn.style.userSelect = 'none';
    btn.style.webkitUserSelect = 'none';
    btn.addEventListener('mousedown', (e) => {
        e.preventDefault();
        e.stopPropagation();
    });
    btn.addEventListener('click', async (e) => {
        e.preventDefault();
        e.stopPropagation();
        const text = lastSelectionText.trim();
        if (!text)
            return;
        hideSelectionButton();
        await chrome.runtime.sendMessage({
            type: 'openSidePanel',
            data: { selectedText: text },
        });
    });
    document.documentElement.appendChild(btn);
    selectionButton = btn;
    return btn;
}
function hideSelectionButton() {
    if (!selectionButton)
        return;
    selectionButton.style.display = 'none';
}
function clamp(value, min, max) {
    return Math.max(min, Math.min(max, value));
}
function shouldIgnoreSelection(selection) {
    const anchor = selection.anchorNode;
    if (!anchor)
        return true;
    const element = anchor.nodeType === Node.ELEMENT_NODE ? anchor : anchor.parentElement;
    if (!element)
        return false;
    const editable = element.closest('input, textarea, [contenteditable="true"], [contenteditable=""], [role="textbox"]');
    return !!editable;
}
function updateSelectionButton() {
    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0 || selection.isCollapsed) {
        hideSelectionButton();
        return;
    }
    if (shouldIgnoreSelection(selection)) {
        hideSelectionButton();
        return;
    }
    const rawText = selection.toString();
    const text = rawText.replace(/\s+/g, ' ').trim();
    if (!text) {
        hideSelectionButton();
        return;
    }
    lastSelectionText = text.length > 10000 ? text.slice(0, 10000) : text;
    const range = selection.getRangeAt(0);
    const rect = range.getBoundingClientRect();
    const clientRects = range.getClientRects();
    const bestRect = (rect.width === 0 && rect.height === 0 && clientRects.length > 0) ? clientRects[clientRects.length - 1] : rect;
    if (bestRect.width === 0 && bestRect.height === 0) {
        hideSelectionButton();
        return;
    }
    const btn = ensureSelectionButton();
    const padding = 10;
    const top = clamp(bestRect.bottom + 8, padding, window.innerHeight - padding);
    const left = clamp(bestRect.left, padding, window.innerWidth - padding);
    btn.style.top = `${top}px`;
    btn.style.left = `${left}px`;
    btn.style.display = 'block';
}
function scheduleSelectionUpdate() {
    if (selectionUpdateTimer !== null)
        window.clearTimeout(selectionUpdateTimer);
    selectionUpdateTimer = window.setTimeout(() => {
        selectionUpdateTimer = null;
        updateSelectionButton();
    }, 80);
}
document.addEventListener('selectionchange', () => {
    scheduleSelectionUpdate();
});
document.addEventListener('mousedown', (e) => {
    const target = e.target;
    if (target && (target.id === selectionButtonId || target.closest(`#${selectionButtonId}`)))
        return;
    hideSelectionButton();
}, true);
window.addEventListener('scroll', () => {
    hideSelectionButton();
}, true);
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaW5kZXguanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi8uLi8uLi9zcmMvY29udGVudC1zY3JpcHQvaW5kZXgudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUEsNEJBQTRCO0FBRTVCLE9BQU8sRUFBRSxNQUFNLEVBQUUsTUFBTSxvQkFBb0IsQ0FBQztBQUc1QyxNQUFNLENBQUMsU0FBUyxDQUFDLHdCQUF3QixDQUFDLENBQUM7QUFFM0MsVUFBVTtBQUNULE1BQTZDLENBQUMsWUFBWSxHQUFHLElBQUksQ0FBQztBQVNuRSxNQUFNLHFCQUFxQjtJQXVFekIsWUFBWSxjQUFnRDtRQXJFcEQsaUJBQVksR0FBRyxJQUFJLEdBQUcsRUFBa0IsQ0FBQztRQUN6QyxpQkFBWSxHQUFHLENBQUMsQ0FBQztRQUNqQixhQUFRLEdBQUcsQ0FBQyxDQUFDO1FBQ2IsWUFBTyxHQUFHLElBQUksR0FBRyxFQUFVLENBQUM7UUFFNUIsZUFBVSxHQUFHLElBQUksR0FBRyxDQUFDO1lBQzNCLE9BQU87WUFDUCxRQUFRO1lBQ1IsVUFBVTtZQUNWLFFBQVE7WUFDUixVQUFVO1lBQ1YsUUFBUTtZQUNSLE9BQU87WUFDUCxNQUFNO1lBQ04sVUFBVTtTQUNYLENBQUMsQ0FBQztRQUVLLGNBQVMsR0FBRyxJQUFJLEdBQUcsQ0FBQztZQUMxQixTQUFTO1lBQ1QsU0FBUztZQUNULE9BQU87WUFDUCxPQUFPO1lBQ1AsWUFBWTtZQUNaLE1BQU07WUFDTixRQUFRO1lBQ1IsUUFBUTtZQUNSLElBQUk7WUFDSixLQUFLO1lBQ0wsS0FBSztZQUNMLElBQUk7WUFDSixJQUFJO1lBQ0osVUFBVTtZQUNWLFlBQVk7WUFDWixRQUFRO1lBQ1IsUUFBUTtZQUNSLE1BQU07WUFDTixVQUFVO1lBQ1YsSUFBSTtZQUNKLElBQUk7WUFDSixJQUFJO1lBQ0osSUFBSTtZQUNKLElBQUk7WUFDSixJQUFJO1lBQ0osUUFBUTtZQUNSLFFBQVE7WUFDUixJQUFJO1lBQ0osTUFBTTtZQUNOLFNBQVM7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QUFJLENBQUMsQ0FBQyIsInNvdXJjZXNDb250ZW50IjpbIi8vIENvbnRlbnQgU2NyaXB0IC0g5rOo5YWl5Yiw572R6aG15Lit6L+Q6KGMXG5cbmltcG9ydCB7IGxvZ2dlciB9IGZyb20gJ0Bjb3JlL3V0aWxzL2xvZ2dlcic7XG5pbXBvcnQgeyBTY3JlZW5zaG90UmVxdWVzdCwgQ2xvc2VQYWdlUmVxdWVzdCB9IGZyb20gJ0Bjb3JlL3R5cGVzJztcblxubG9nZ2VyLnNldFByZWZpeCgnW0RvdWJhbyBDb250ZW50U2NyaXB0XScpO1xuXG4vLyDmoIforrDohJrmnKzlt7LliqDovb1cbih3aW5kb3cgYXMgdW5rbm93biBhcyBSZWNvcmQ8c3RyaW5nLCBib29sZWFuPikuc2NyZWVuUGx1Z2luID0gdHJ1ZTtcblxudHlwZSBSZWFkUGFnZUNvbnZlcnRPcHRpb25zID0ge1xuICBleHRyYWN0TGlua1VybDogYm9vbGVhbjtcbiAgZXh0cmFjdEltYWdlVXJsOiBib29sZWFuO1xuICBtYXhVcmxzOiBudW1iZXI7XG4gIGhlYWRpbmdMZXZlbDogbnVtYmVyO1xufTtcblxuY2xhc3MgUmVhZFBhZ2VEb21Ub01hcmtkb3duIHtcbiAgcHJpdmF0ZSBvcHRpb25zOiBSZWFkUGFnZUNvbnZlcnRPcHRpb25zO1xuICBwcml2YXRlIG5lc3RlZFRhYmxlcyA9IG5ldyBNYXA8bnVtYmVyLCBzdHJpbmc+KCk7XG4gIHByaXZhdGUgdGFibGVDb3VudGVyID0gMTtcbiAgcHJpdmF0ZSB1cmxDb3VudCA9IDA7XG4gIHByaXZhdGUgdXJsU2VlbiA9IG5ldyBTZXQ8c3RyaW5nPigpO1xuXG4gIHByaXZhdGUgaWdub3JlVGFncyA9IG5ldyBTZXQoW1xuICAgICdpbnB1dCcsXG4gICAgJ3NlbGVjdCcsXG4gICAgJ2ZpZWxkc2V0JyxcbiAgICAnb3B0aW9uJyxcbiAgICAnb3B0Z3JvdXAnLFxuICAgICdzY3JpcHQnLFxuICAgICdzdHlsZScsXG4gICAgJ2xpbmsnLFxuICAgICdub3NjcmlwdCcsXG4gIF0pO1xuXG4gIHByaXZhdGUgYmxvY2tUYWdzID0gbmV3IFNldChbXG4gICAgJ2FkZHJlc3MnLFxuICAgICdhcnRpY2xlJyxcbiAgICAnYXNpZGUnLFxuICAgICdhdWRpbycsXG4gICAgJ2Jsb2NrcXVvdGUnLFxuICAgICdib2R5JyxcbiAgICAnY2FudmFzJyxcbiAgICAnY2VudGVyJyxcbiAgICAnZGQnLFxuICAgICdkaXInLFxuICAgICdkaXYnLFxuICAgICdkbCcsXG4gICAgJ2R0JyxcbiAgICAnZmllbGRzZXQnLFxuICAgICdmaWdjYXB0aW9uJyxcbiAgICAnZmlndXJlJyxcbiAgICAnZm9vdGVyJyxcbiAgICAnZm9ybScsXG4gICAgJ2ZyYW1lc2V0JyxcbiAgICAnaDEnLFxuICAgICdoMicsXG4gICAgJ2gzJyxcbiAgICAnaDQnLFxuICAgICdoNScsXG4gICAgJ2g2JyxcbiAgICAnaGVhZGVyJyxcbiAgICAnaGdyb3VwJyxcbiAgICAnaHInLFxuICAgICdodG1sJyxcbiAgICAnaXNpbmRleCcsXG4gICAgJ2xpJyxcbiAgICAnbWFpbicsXG4gICAgJ21lbnUnLFxuICAgICduYXYnLFxuICAgICdub2ZyYW1lcycsXG4gICAgJ25vc2NyaXB0JyxcbiAgICAnb2wnLFxuICAgICdvdXRwdXQnLFxuICAgICdwJyxcbiAgICAncHJlJyxcbiAgICAnc2VjdGlvbicsXG4gICAgJ3RhYmxlJyxcbiAgICAndGJvZHknLFxuICAgICd0ZCcsXG4gICAgJ3Rmb290JyxcbiAgICAndGgnLFxuICAgICd0aGVhZCcsXG4gICAgJ3RyJyxcbiAgICAndWwnLFxuICBdKTtcblxuICBjb25zdHJ1Y3RvcihwYXJ0aWFsT3B0aW9ucz86IFBhcnRpYWw8UmVhZFBhZ2VDb252ZXJ0T3B0aW9ucz4pIHtcbiAgICB0aGlzLm9wdGlvbnMgPSB7XG4gICAgICBleHRyYWN0SW1hZ2VVcmw6IGZhbHNlLFxuICAgICAgZXh0cmFjdExpbmtVcmw6IGZhbHNlLFxuICAgICAgbWF4VXJsczogMjAwLFxuICAgICAgaGVhZGluZ0xldmVsOiAxLFxuICAgICAgLi4uKHBhcnRpYWxPcHRpb25zIHx8IHt9KSxcbiAgICB9O1xuICB9XG5cbiAgY29udmVydChub2RlOiBOb2RlIHwgbnVsbCB8IHVuZGVmaW5lZCk6IHN0cmluZyB7XG4gICAgaWYgKCFub2RlKSByZXR1cm4gJyc7XG4gICAgbGV0IG91dCA9IHRoaXMuY29udmVydE5vZGUobm9kZSk7XG4gICAgb3V0ID0gb3V0LnJlcGxhY2UoL1xccytcXG4kL2dpbSwgJ1xcbicpLnJlcGxhY2UoL1xcbnszLH0vZ2ltLCAnXFxuXFxuJyk7XG5cbiAgICBpZiAodGhpcy5uZXN0ZWRUYWJsZXMuc2l6ZSA+IDApIHtcbiAgICAgIGNvbnN0IGZvb3Rub3RlczogQXJyYXk8eyBpZDogbnVtYmVyOyBjb250ZW50OiBzdHJpbmcgfT4gPSBbXTtcbiAgICAgIHRoaXMubmVzdGVkVGFibGVzLmZvckVhY2goKGNvbnRlbnQsIGlkKSA9PiB7XG4gICAgICAgIGZvb3Rub3Rlcy5wdXNoKHtcbiAgICAgICAgICBpZCxcbiAgICAgICAgICBjb250ZW50OiBgXFxuXFxuW150YWJsZSR7aWR9XTpcXG4ke3RoaXMuaW5kZW50KHRoaXMuY29kZVdyYXAoY29udGVudCksIDIsICcgJyl9XFxuYCxcbiAgICAgICAgfSk7XG4gICAgICB9KTtcbiAgICAgIG91dCArPSBmb290bm90ZXNcbiAgICAgICAgLnNvcnQoKGEsIGIpID0+IGEuaWQgLSBiLmlkKVxuICAgICAgICAubWFwKCh4KSA9PiB4LmNvbnRlbnQpXG4gICAgICAgIC5qb2luKCcnKTtcbiAgICB9XG5cbiAgICByZXR1cm4gb3V0LnRyaW0oKTtcbiAgfVxuXG4gIHByaXZhdGUgY29udmVydE5vZGUobm9kZTogTm9kZSk6IHN0cmluZyB7XG4gICAgaWYgKG5vZGUubm9kZVR5cGUgPT09IE5vZGUuVEVYVF9OT0RFKSB7XG4gICAgICBjb25zdCB0ZXh0ID0gbm9kZS50ZXh0Q29udGVudCB8fCAnJztcbiAgICAgIHJldHVybiB0ZXh0LnRyaW0oKTtcbiAgICB9XG5cbiAgICBpZiAobm9kZS5ub2RlVHlwZSAhPT0gTm9kZS5FTEVNRU5UX05PREUpIHJldHVybiAnJztcblxuICAgIGNvbnN0IGVsID0gbm9kZSBhcyBFbGVtZW50O1xuICAgIGNvbnN0IHRhZyA9IGVsLnRhZ05hbWUudG9Mb3dlckNhc2UoKTtcbiAgICBpZiAodGhpcy5pZ25vcmVUYWdzLmhhcyh0YWcpKSByZXR1cm4gJyc7XG5cbiAgICBpZiAoZWwgaW5zdGFuY2VvZiBIVE1MU2xvdEVsZW1lbnQpIHtcbiAgICAgIGNvbnN0IGFzc2lnbmVkID0gZWwuYXNzaWduZWROb2RlcygpO1xuICAgICAgbGV0IG91dCA9ICcnO1xuICAgICAgZm9yIChjb25zdCBuIG9mIEFycmF5LmZyb20oYXNzaWduZWQpKSBvdXQgKz0gdGhpcy5jb252ZXJ0Tm9kZShuKTtcbiAgICAgIHJldHVybiBvdXQ7XG4gICAgfVxuXG4gICAgaWYgKChlbCBhcyB1bmtub3duIGFzIHsgc2hhZG93Um9vdD86IFNoYWRvd1Jvb3QgfCBudWxsIH0pLnNoYWRvd1Jvb3QpIHtcbiAgICAgIGNvbnN0IHNoYWRvdyA9IChlbCBhcyB1bmtub3duIGFzIHsgc2hhZG93Um9vdD86IFNoYWRvd1Jvb3QgfCBudWxsIH0pLnNoYWRvd1Jvb3Q7XG4gICAgICBpZiAoIXNoYWRvdykgcmV0dXJuICcnO1xuICAgICAgbGV0IG91dCA9ICcnO1xuICAgICAgZm9yIChjb25zdCBjaGlsZCBvZiBBcnJheS5mcm9tKHNoYWRvdy5jaGlsZE5vZGVzKSkgb3V0ICs9IHRoaXMuY29udmVydE5vZGUoY2hpbGQpO1xuICAgICAgcmV0dXJuIG91dDtcbiAgICB9XG5cbiAgICBsZXQgb3V0ID0gJyc7XG4gICAgc3dpdGNoICh0YWcpIHtcbiAgICAgIGNhc2UgJ2gxJzpcbiAgICAgIGNhc2UgJ2gyJzpcbiAgICAgIGNhc2UgJ2gzJzpcbiAgICAgIGNhc2UgJ2g0JzpcbiAgICAgIGNhc2UgJ2g1JzpcbiAgICAgIGNhc2UgJ2g2JzpcbiAgICAgICAgb3V0ID0gdGhpcy5oYW5kbGVIZWFkaW5nKGVsIGFzIEhUTUxFbGVtZW50KTtcbiAgICAgICAgYnJlYWs7XG4gICAgICBjYXNlICdwJzpcbiAgICAgICAgb3V0ID0gdGhpcy5oYW5kbGVDaGlsZHJlbihlbCk7XG4gICAgICAgIGJyZWFrO1xuICAgICAgY2FzZSAnc3Ryb25nJzpcbiAgICAgIGNhc2UgJ2InOlxuICAgICAgICBvdXQgPSB0aGlzLmhhbmRsZUJvbGQoZWwpO1xuICAgICAgICBicmVhaztcbiAgICAgIGNhc2UgJ2VtJzpcbiAgICAgIGNhc2UgJ2knOlxuICAgICAgICBvdXQgPSB0aGlzLmhhbmRsZUl0YWxpYyhlbCk7XG4gICAgICAgIGJyZWFrO1xuICAgICAgY2FzZSAnYSc6XG4gICAgICAgIG91dCA9IHRoaXMuaGFuZGxlTGluayhlbCBhcyBIVE1MQW5jaG9yRWxlbWVudCk7XG4gICAgICAgIGJyZWFrO1xuICAgICAgY2FzZSAnaW1nJzpcbiAgICAgICAgb3V0ID0gdGhpcy5oYW5kbGVJbWFnZShlbCBhcyBIVE1MSW1hZ2VFbGVtZW50KTtcbiAgICAgICAgYnJlYWs7XG4gICAgICBjYXNlICd1bCc6XG4gICAgICBjYXNlICdvbCc6XG4gICAgICAgIG91dCA9IHRoaXMuaGFuZGxlTGlzdChlbCBhcyBIVE1MT0xpc3RFbGVtZW50IHwgSFRNTFVMaXN0RWxlbWVudCk7XG4gICAgICAgIGJyZWFrO1xuICAgICAgY2FzZSAnbGknOlxuICAgICAgICBvdXQgPSB0aGlzLmhhbmRsZUNoaWxkcmVuKGVsKTtcbiAgICAgICAgYnJlYWs7XG4gICAgICBjYXNlICdibG9ja3F1b3RlJzpcbiAgICAgICAgb3V0ID0gdGhpcy5oYW5kbGVCbG9ja3F1b3RlKGVsKTtcbiAgICAgICAgYnJlYWs7XG4gICAgICBjYXNlICdwcmUnOlxuICAgICAgY2FzZSAnY29kZSc6XG4gICAgICAgIG91dCA9IHRoaXMuaGFuZGxlQ29kZShlbCk7XG4gICAgICAgIGJyZWFrO1xuICAgICAgY2FzZSAndGFibGUnOlxuICAgICAgICBvdXQgPSB0aGlzLmhhbmRsZVRhYmxlKGVsIGFzIEhUTUxUYWJsZUVsZW1lbnQpO1xuICAgICAgICBicmVhaztcbiAgICAgIGNhc2UgJ3RoZWFkJzpcbiAgICAgIGNhc2UgJ3Rib2R5JzpcbiAgICAgIGNhc2UgJ3RyJzpcbiAgICAgIGNhc2UgJ3RoJzpcbiAgICAgIGNhc2UgJ3RkJzpcbiAgICAgICAgb3V0ID0gdGhpcy5oYW5kbGVUYWJsZUVsZW1lbnQoZWwpO1xuICAgICAgICBicmVhaztcbiAgICAgIGRlZmF1bHQ6XG4gICAgICAgIG91dCA9IHRoaXMuaGFuZGxlQ2hpbGRyZW4oZWwpO1xuICAgICAgICBicmVhaztcbiAgICB9XG5cbiAgICBpZiAob3V0LnRyaW0oKS5sZW5ndGggPD0gMCkgcmV0dXJuICcnO1xuXG4gICAgaWYgKHRoaXMuYmxvY2tUYWdzLmhhcyh0YWcpKSB7XG4gICAgICBvdXQgPSBgXFxuXFxuJHtvdXR9XFxuXFxuYDtcbiAgICB9IGVsc2UgaWYgKG91dC50cmltKCkubGVuZ3RoID4gMCkge1xuICAgICAgb3V0ID0gYCR7b3V0fSBgO1xuICAgIH1cblxuICAgIHJldHVybiBvdXQ7XG4gIH1cblxuICBwcml2YXRlIGhhbmRsZUNoaWxkcmVuKGVsOiBFbGVtZW50KTogc3RyaW5nIHtcbiAgICBsZXQgb3V0ID0gJyc7XG4gICAgZm9yIChjb25zdCBjaGlsZCBvZiBBcnJheS5mcm9tKGVsLmNoaWxkTm9kZXMpKSBvdXQgKz0gdGhpcy5jb252ZXJ0Tm9kZShjaGlsZCk7XG4gICAgcmV0dXJuIG91dDtcbiAgfVxuXG4gIHByaXZhdGUgaGFuZGxlSGVhZGluZyhlbDogSFRNTEVsZW1lbnQpOiBzdHJpbmcge1xuICAgIGNvbnN0IGxldmVsID0gTnVtYmVyLnBhcnNlSW50KGVsLnRhZ05hbWVbMV0gfHwgJzEnLCAxMCkgKyB0aGlzLm9wdGlvbnMuaGVhZGluZ0xldmVsO1xuICAgIGNvbnN0IHRleHQgPSB0aGlzLmhhbmRsZUNoaWxkcmVuKGVsKS5yZXBsYWNlKC9eXFxzKy8sICcnKTtcbiAgICBpZiAodGV4dC50cmltKCkubGVuZ3RoIDw9IDApIHJldHVybiAnJztcbiAgICByZXR1cm4gYCR7JyMnLnJlcGVhdChsZXZlbCl9ICR7dGV4dH1gO1xuICB9XG5cbiAgcHJpdmF0ZSBoYW5kbGVCb2xkKGVsOiBFbGVtZW50KTogc3RyaW5nIHtcbiAgICBjb25zdCB0ZXh0ID0gdGhpcy5oYW5kbGVDaGlsZHJlbihlbCkudHJpbSgpO1xuICAgIGlmICh0ZXh0Lmxlbmd0aCA8PSAwKSByZXR1cm4gJyc7XG4gICAgcmV0dXJuIGAqKiR7dGV4dH0qKmA7XG4gIH1cblxuICBwcml2YXRlIGhhbmRsZUl0YWxpYyhlbDogRWxlbWVudCk6IHN0cmluZyB7XG4gICAgY29uc3QgdGV4dCA9IHRoaXMuaGFuZGxlQ2hpbGRyZW4oZWwpLnRyaW0oKTtcbiAgICBpZiAodGV4dC5sZW5ndGggPD0gMCkgcmV0dXJuICcnO1xuICAgIHJldHVybiBgXyR7dGV4dH1fYDtcbiAgfVxuXG4gIHByaXZhdGUgbm9ybWFsaXplVXJsKHVybDogc3RyaW5nKTogc3RyaW5nIHtcbiAgICBpZiAodXJsLnN0YXJ0c1dpdGgoJy8vJykpIHJldHVybiBgJHtsb2NhdGlvbi5wcm90b2NvbH0ke3VybH1gO1xuICAgIGlmICh1cmwuc3RhcnRzV2l0aCgnLycpKSByZXR1cm4gYCR7bG9jYXRpb24ub3JpZ2lufSR7dXJsfWA7XG4gICAgcmV0dXJuIHVybDtcbiAgfVxuXG4gIHByaXZhdGUgdGFrZVVybChyYXc6IHN0cmluZyk6IHN0cmluZyB7XG4gICAgaWYgKCFyYXcpIHJldHVybiAnJztcbiAgICBjb25zdCBub3JtYWxpemVkID0gdGhpcy5ub3JtYWxpemVVcmwocmF3LnRyaW0oKSk7XG4gICAgaWYgKG5vcm1hbGl6ZWQuc3RhcnRzV2l0aCgnamF2YXNjcmlwdDonKSkgcmV0dXJuICcnO1xuICAgIGlmIChub3JtYWxpemVkLmxlbmd0aCA+PSAyNTYpIHJldHVybiAnJztcbiAgICBsZXQgYWJzOiBzdHJpbmc7XG4gICAgdHJ5IHtcbiAgICAgIGFicyA9IG5ldyBVUkwobm9ybWFsaXplZCwgbG9jYXRpb24uaHJlZikudG9TdHJpbmcoKTtcbiAgICB9IGNhdGNoIHtcbiAgICAgIHJldHVybiAnJztcbiAgICB9XG4gICAgaWYgKCFhYnMuc3RhcnRzV2l0aCgnaHR0cDovLycpICYmICFhYnMuc3RhcnRzV2l0aCgnaHR0cHM6Ly8nKSkgcmV0dXJuICcnO1xuICAgIGlmICh0aGlzLnVybFNlZW4uaGFzKGFicykpIHJldHVybiBhYnM7XG4gICAgaWYgKHRoaXMudXJsQ291bnQgPj0gdGhpcy5vcHRpb25zLm1heFVybHMpIHJldHVybiAnJztcbiAgICB0aGlzLnVybFNlZW4uYWRkKGFicyk7XG4gICAgdGhpcy51cmxDb3VudCArPSAxO1xuICAgIHJldHVybiBhYnM7XG4gIH1cblxuICBwcml2YXRlIGhhbmRsZUxpbmsoZWw6IEhUTUxBbmNob3JFbGVtZW50KTogc3RyaW5nIHtcbiAgICBjb25zdCB0ZXh0ID0gdGhpcy5oYW5kbGVDaGlsZHJlbihlbCkucmVwbGFjZSgvXFxuL2csICcgJykudHJpbSgpO1xuICAgIGlmICghdGV4dCkgcmV0dXJuICcnO1xuXG4gICAgaWYgKCF0aGlzLm9wdGlvbnMuZXh0cmFjdExpbmtVcmwpIHJldHVybiB0ZXh0O1xuXG4gICAgY29uc3QgaHJlZiA9IHRoaXMudGFrZVVybChlbC5nZXRBdHRyaWJ1dGUoJ2hyZWYnKSB8fCAnJyk7XG4gICAgaWYgKCFocmVmKSByZXR1cm4gdGV4dDtcbiAgICBjb25zdCBtYXJrZG93biA9IGBbJHt0ZXh0fV0oJHtocmVmfSlgO1xuICAgIGlmICgvXiMrIC8udGVzdCh0ZXh0KSkgcmV0dXJuIGBcXG5cXG4ke21hcmtkb3dufVxcblxcbmA7XG4gICAgcmV0dXJuIG1hcmtkb3duO1xuICB9XG5cbiAgcHJpdmF0ZSBoYW5kbGVJbWFnZShlbDogSFRNTEltYWdlRWxlbWVudCk6IHN0cmluZyB7XG4gICAgY29uc3QgYWx0ID0gKGVsLmdldEF0dHJpYnV0ZSgnYWx0JykgfHwgJycpLnRyaW0oKTtcbiAgICBpZiAoIXRoaXMub3B0aW9ucy5leHRyYWN0SW1hZ2VVcmwpIHJldHVybiBhbHQgPyBgIVske2FsdH1dKClgIDogJyc7XG5cbiAgICBjb25zdCBzcmMgPSB0aGlzLnRha2VVcmwoZWwuY3VycmVudFNyYyB8fCBlbC5nZXRBdHRyaWJ1dGUoJ3NyYycpIHx8ICcnKTtcbiAgICBpZiAoIXNyYyAmJiAhYWx0KSByZXR1cm4gJyc7XG4gICAgaWYgKCFzcmMpIHJldHVybiBhbHQgPyBgIVske2FsdH1dKClgIDogJyc7XG4gICAgcmV0dXJuIGAhWyR7YWx0fV0oJHtzcmN9KWA7XG4gIH1cblxuICBwcml2YXRlIGluZGVudCh0ZXh0OiBzdHJpbmcsIGNvdW50ID0gMCwgdW5pdCA9ICdcXHQnKTogc3RyaW5nIHtcbiAgICBpZiAoY291bnQgPD0gMCkgcmV0dXJuIHRleHQ7XG4gICAgY29uc3QgcHJlZml4ID0gdW5pdC5yZXBlYXQoY291bnQpO1xuICAgIHJldHVybiB0ZXh0XG4gICAgICAuc3BsaXQoJ1xcbicpXG4gICAgICAubWFwKChsaW5lKSA9PiAobGluZS50cmltKCkgPyBgJHtwcmVmaXh9JHtsaW5lfWAgOiBsaW5lKSlcbiAgICAgIC5qb2luKCdcXG4nKTtcbiAgfVxuXG4gIHByaXZhdGUgaGFuZGxlTGlzdChlbDogSFRNTE9MaXN0RWxlbWVudCB8IEhUTUxVTGlzdEVsZW1lbnQpOiBzdHJpbmcge1xuICAgIGNvbnN0IG9yZGVyZWQgPSBlbC50YWdOYW1lLnRvTG93ZXJDYXNlKCkgPT09ICdvbCc7XG4gICAgbGV0IG91dCA9ICcnO1xuICAgIGxldCBpbmRleCA9IDE7XG5cbiAgICBmb3IgKGNvbnN0IGNoaWxkIG9mIEFycmF5LmZyb20oZWwuY2hpbGRyZW4pKSB7XG4gICAgICBpZiAoIShjaGlsZCBpbnN0YW5jZW9mIEVsZW1lbnQpKSBjb250aW51ZTtcbiAgICAgIGlmIChjaGlsZC50YWdOYW1lLnRvTG93ZXJDYXNlKCkgIT09ICdsaScpIHtcbiAgICAgICAgb3V0ICs9IHRoaXMuY29udmVydE5vZGUoY2hpbGQpO1xuICAgICAgICBjb250aW51ZTtcbiAgICAgIH1cbiAgICAgIGNvbnN0IGlubmVyID0gdGhpcy5pbmRlbnQodGhpcy5oYW5kbGVDaGlsZHJlbihjaGlsZCkudHJpbSgpLCAxKS50cmltKCk7XG4gICAgICBpZiAoIWlubmVyKSBjb250aW51ZTtcbiAgICAgIGlmIChvcmRlcmVkKSB7XG4gICAgICAgIG91dCArPSBgXFxuJHtpbmRleH0uICR7aW5uZXJ9YDtcbiAgICAgICAgaW5kZXggKz0gMTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIG91dCArPSBgXFxuLSAke2lubmVyfWA7XG4gICAgICB9XG4gICAgfVxuICAgIHJldHVybiBvdXQgPyBgJHtvdXR9YCA6ICcnO1xuICB9XG5cbiAgcHJpdmF0ZSBoYW5kbGVCbG9ja3F1b3RlKGVsOiBFbGVtZW50KTogc3RyaW5nIHtcbiAgICBjb25zdCB0ZXh0ID0gdGhpcy5oYW5kbGVDaGlsZHJlbihlbClcbiAgICAgIC5zcGxpdCgnXFxuJylcbiAgICAgIC5tYXAoKGxpbmUpID0+IGA+ICR7bGluZX1gKVxuICAgICAgLmpvaW4oJ1xcbicpO1xuICAgIHJldHVybiBgJHt0ZXh0fWA7XG4gIH1cblxuICBwcml2YXRlIGNvZGVXcmFwKGNvZGU6IHN0cmluZywgbGFuZyA9ICcnKTogc3RyaW5nIHtcbiAgICBjb25zdCBub3JtYWxpemVkID0gY29kZS5yZXBsYWNlKC9eXFxuK3xcXG4rJC9naSwgJycpO1xuICAgIHJldHVybiBgXFxgXFxgXFxgJHtsYW5nfVxcbiR7bm9ybWFsaXplZH1cXG5cXGBcXGBcXGBgO1xuICB9XG5cbiAgcHJpdmF0ZSBoYW5kbGVDb2RlKGVsOiBFbGVtZW50KTogc3RyaW5nIHtcbiAgICBjb25zdCB0YWcgPSBlbC50YWdOYW1lLnRvTG93ZXJDYXNlKCk7XG4gICAgY29uc3QgdGV4dCA9IGVsLnRleHRDb250ZW50IHx8ICcnO1xuICAgIGlmICh0YWcgPT09ICdjb2RlJyAmJiBlbC5wYXJlbnRFbGVtZW50Py50YWdOYW1lLnRvTG93ZXJDYXNlKCkgIT09ICdwcmUnKSByZXR1cm4gYFxcYCR7dGV4dH1cXGBgO1xuICAgIGNvbnN0IGNscyA9IChlbC5nZXRBdHRyaWJ1dGUoJ2NsYXNzJykgfHwgJycpLnRyaW0oKTtcbiAgICBjb25zdCBsYW5nID0gY2xzLnN0YXJ0c1dpdGgoJ2xhbmd1YWdlLScpID8gY2xzLnJlcGxhY2UoJ2xhbmd1YWdlLScsICcnKSA6ICcnO1xuICAgIHJldHVybiB0aGlzLmNvZGVXcmFwKHRleHQsIGxhbmcpO1xuICB9XG5cbiAgcHJpdmF0ZSBlc2NhcGVDc3ZDZWxsKHRleHQ6IHN0cmluZyk6IHN0cmluZyB7XG4gICAgaWYgKCF0ZXh0KSByZXR1cm4gJyc7XG4gICAgbGV0IG5lZWRXcmFwID0gZmFsc2U7XG4gICAgY29uc3QgZXNjYXBlZCA9IHRleHQucmVwbGFjZSgvWyxcIlxcbl0vZ2ltLCAoY2gpID0+IHtcbiAgICAgIG5lZWRXcmFwID0gdHJ1ZTtcbiAgICAgIGlmIChjaCA9PT0gJ1wiJykgcmV0dXJuIFwiJ1wiO1xuICAgICAgaWYgKGNoID09PSAnXFxuJykgcmV0dXJuICdcXFxcbic7XG4gICAgICByZXR1cm4gY2g7XG4gICAgfSk7XG4gICAgcmV0dXJuIG5lZWRXcmFwID8gYFwiJHtlc2NhcGVkfVwiYCA6IGVzY2FwZWQ7XG4gIH1cblxuICBwcml2YXRlIHByb2Nlc3NSb3dUb0NTVih0cjogRWxlbWVudCk6IHN0cmluZyB7XG4gICAgY29uc3QgY2VsbHMgPSBBcnJheS5mcm9tKHRyLmNoaWxkcmVuKS5maWx0ZXIoKHgpID0+IHtcbiAgICAgIGNvbnN0IHRhZyA9IHgudGFnTmFtZS50b0xvd2VyQ2FzZSgpO1xuICAgICAgcmV0dXJuIHRhZyA9PT0gJ3RoJyB8fCB0YWcgPT09ICd0ZCc7XG4gICAgfSk7XG5cbiAgICBjb25zdCByb3c6IHN0cmluZ1tdID0gW107XG4gICAgZm9yIChjb25zdCBjZWxsIG9mIGNlbGxzKSB7XG4gICAgICBsZXQgdmFsdWUgPSAnJztcbiAgICAgIGZvciAoY29uc3QgY2hpbGQgb2YgQXJyYXkuZnJvbShjZWxsLmNoaWxkTm9kZXMpKSB7XG4gICAgICAgIGlmIChjaGlsZC5ub2RlVHlwZSA9PT0gTm9kZS5FTEVNRU5UX05PREUgJiYgKGNoaWxkIGFzIEVsZW1lbnQpLnRhZ05hbWUudG9Mb3dlckNhc2UoKSA9PT0gJ3RhYmxlJykge1xuICAgICAgICAgIGNvbnN0IGlkID0gdGhpcy50YWJsZUNvdW50ZXI7XG4gICAgICAgICAgdGhpcy50YWJsZUNvdW50ZXIgKz0gMTtcbiAgICAgICAgICBjb25zdCB0YWJsZVRleHQgPSB0aGlzLmhhbmRsZVRhYmxlRWxlbWVudChjaGlsZCBhcyBFbGVtZW50KTtcbiAgICAgICAgICB0aGlzLm5lc3RlZFRhYmxlcy5zZXQoaWQsIHRhYmxlVGV4dCk7XG4gICAgICAgICAgdmFsdWUgKz0gYFtedGFibGUke2lkfV1gO1xuICAgICAgICAgIGNvbnRpbnVlO1xuICAgICAgICB9XG4gICAgICAgIHZhbHVlICs9IHRoaXMuY29udmVydE5vZGUoY2hpbGQpO1xuICAgICAgfVxuICAgICAgdmFsdWUgPSB2YWx1ZS50cmltKCk7XG5cbiAgICAgIGNvbnN0IGNvbHNwYW5SYXcgPSAoY2VsbCBhcyBFbGVtZW50KS5nZXRBdHRyaWJ1dGUoJ2NvbHNwYW4nKSB8fCAnMSc7XG4gICAgICBjb25zdCBjb2xzcGFuID0gTnVtYmVyLmlzRmluaXRlKE51bWJlcihjb2xzcGFuUmF3KSkgPyBNYXRoLm1heCgxLCBOdW1iZXIoY29sc3BhblJhdykpIDogMTtcbiAgICAgIGZvciAobGV0IGkgPSAwOyBpIDwgY29sc3BhbjsgaSArPSAxKSB7XG4gICAgICAgIGlmIChpID09PSAwKSByb3cucHVzaCh0aGlzLmVzY2FwZUNzdkNlbGwodmFsdWUpKTtcbiAgICAgICAgZWxzZSByb3cucHVzaCgnJyk7XG4gICAgICB9XG4gICAgfVxuXG4gICAgcmV0dXJuIHJvdy5qb2luKCcsJyk7XG4gIH1cblxuICBwcml2YXRlIGhhbmRsZVRhYmxlRWxlbWVudChlbDogRWxlbWVudCk6IHN0cmluZyB7XG4gICAgY29uc3QgdGFnID0gZWwudGFnTmFtZS50b0xvd2VyQ2FzZSgpO1xuICAgIGlmICh0YWcgPT09ICd0YWJsZScpIHtcbiAgICAgIGxldCBjc3YgPSAnXFxuJztcbiAgICAgIGNvbnN0IGdyb3VwcyA9IEFycmF5LmZyb20oZWwuY2hpbGRyZW4pLmZpbHRlcigoeCkgPT4ge1xuICAgICAgICBjb25zdCB0ID0geC50YWdOYW1lLnRvTG93ZXJDYXNlKCk7XG4gICAgICAgIHJldHVybiB0ID09PSAndGhlYWQnIHx8IHQgPT09ICd0Ym9keScgfHwgdCA9PT0gJ3Rmb290JztcbiAgICAgIH0pO1xuXG4gICAgICBsZXQgcm93czogRWxlbWVudFtdID0gW107XG4gICAgICBpZiAoZ3JvdXBzLmxlbmd0aCA+IDApIHtcbiAgICAgICAgZm9yIChjb25zdCBnIG9mIGdyb3Vwcykge1xuICAgICAgICAgIHJvd3MgPSByb3dzLmNvbmNhdChBcnJheS5mcm9tKGcuY2hpbGRyZW4pLmZpbHRlcigoeCkgPT4geC50YWdOYW1lLnRvTG93ZXJDYXNlKCkgPT09ICd0cicpKTtcbiAgICAgICAgfVxuICAgICAgfSBlbHNlIHtcbiAgICAgICAgcm93cyA9IEFycmF5LmZyb20oZWwuY2hpbGRyZW4pLmZpbHRlcigoeCkgPT4geC50YWdOYW1lLnRvTG93ZXJDYXNlKCkgPT09ICd0cicpO1xuICAgICAgfVxuXG4gICAgICBmb3IgKGNvbnN0IHRyIG9mIHJvd3MpIGNzdiArPSBgJHt0aGlzLnByb2Nlc3NSb3dUb0NTVih0cil9XFxuYDtcbiAgICAgIHJldHVybiBgJHtjc3Z9XFxuYDtcbiAgICB9XG5cbiAgICBpZiAodGFnID09PSAndGgnIHx8IHRhZyA9PT0gJ3RkJykgcmV0dXJuIHRoaXMuY29udmVydE5vZGUoZWwpLnRyaW0oKTtcbiAgICByZXR1cm4gdGhpcy5oYW5kbGVDaGlsZHJlbihlbCk7XG4gIH1cblxuICBwcml2YXRlIGNvZGVXcmFwVGFibGUoY3N2OiBzdHJpbmcpOiBzdHJpbmcge1xuICAgIHJldHVybiB0aGlzLmNvZGVXcmFwKGNzdiwgJ2NzdicpO1xuICB9XG5cbiAgcHJpdmF0ZSBoYW5kbGVUYWJsZShlbDogSFRNTFRhYmxlRWxlbWVudCk6IHN0cmluZyB7XG4gICAgY29uc3QgY3N2ID0gdGhpcy5oYW5kbGVUYWJsZUVsZW1lbnQoZWwpO1xuICAgIHJldHVybiB0aGlzLmNvZGVXcmFwVGFibGUoY3N2KTtcbiAgfVxufVxuXG4vLyDnm5HlkKzmnaXoh6rpobXpnaLnmoTmtojmga9cbndpbmRvdy5hZGRFdmVudExpc3RlbmVyKCdtZXNzYWdlJywgKGV2ZW50OiBNZXNzYWdlRXZlbnQ8dW5rbm93bj4pID0+IHtcbiAgLy8g5a6J5YWo5qOA5p+l77ya5Y+q5aSE55CG5p2l6Ieq5b2T5YmN6aG16Z2i55qE5raI5oGvXG4gIGlmIChldmVudC5zb3VyY2UgIT09IHdpbmRvdykge1xuICAgIHJldHVybjtcbiAgfVxuXG4gIGNvbnN0IGRhdGEgPSBldmVudC5kYXRhO1xuXG4gIC8vIOmqjOivgea2iOaBr+agvOW8j1xuICBpZiAoIWRhdGEgfHwgdHlwZW9mIGRhdGEgIT09ICdvYmplY3QnIHx8ICEoJ2Z1bmMnIGluIGRhdGEpKSB7XG4gICAgcmV0dXJuO1xuICB9XG5cbiAgY29uc3QgbWVzc2FnZURhdGEgPSBkYXRhIGFzIHsgZnVuYzogc3RyaW5nOyBba2V5OiBzdHJpbmddOiB1bmtub3duIH07XG4gIGxvZ2dlci5kZWJ1ZygnUmVjZWl2ZWQgbWVzc2FnZSBmcm9tIHBhZ2U6JywgbWVzc2FnZURhdGEuZnVuYyk7XG5cbiAgc3dpdGNoIChtZXNzYWdlRGF0YS5mdW5jKSB7XG4gICAgY2FzZSAnc2NyZWVuc2hvcCc6IHtcbiAgICAgIGNvbnN0IHNjcmVlbnNob3REYXRhID0gbWVzc2FnZURhdGEgYXMgdW5rbm93biBhcyBTY3JlZW5zaG90UmVxdWVzdDtcbiAgICAgIGhhbmRsZVNjcmVlbnNob3Qoc2NyZWVuc2hvdERhdGEubWV0aG9kKTtcbiAgICAgIGJyZWFrO1xuICAgIH1cblxuICAgIGNhc2UgJ2Nsb3NlUGFnZSc6IHtcbiAgICAgIGNvbnN0IGNsb3NlRGF0YSA9IG1lc3NhZ2VEYXRhIGFzIHVua25vd24gYXMgQ2xvc2VQYWdlUmVxdWVzdDtcbiAgICAgIGhhbmRsZUNsb3NlUGFnZShjbG9zZURhdGEudXJsLCBmYWxzZSk7XG4gICAgICBicmVhaztcbiAgICB9XG5cbiAgICBjYXNlICdjbG9zZUFsbFBhZ2UnOiB7XG4gICAgICBjb25zdCBjbG9zZUFsbERhdGEgPSBtZXNzYWdlRGF0YSBhcyB1bmtub3duIGFzIENsb3NlUGFnZVJlcXVlc3Q7XG4gICAgICBoYW5kbGVDbG9zZVBhZ2UoY2xvc2VBbGxEYXRhLnVybCwgdHJ1ZSk7XG4gICAgICBicmVhaztcbiAgICB9XG5cbiAgICBkZWZhdWx0OlxuICAgICAgLy8g6L2s5Y+R5YW25LuW5raI5oGv5YiwIGJhY2tncm91bmRcbiAgICAgIGNocm9tZS5ydW50aW1lLnNlbmRNZXNzYWdlKHsgdHlwZTogbWVzc2FnZURhdGEuZnVuYywgZGF0YSB9KTtcbiAgfVxufSwgZmFsc2UpO1xuXG4vLyDlpITnkIbmiKrlm77or7fmsYJcbmZ1bmN0aW9uIGhhbmRsZVNjcmVlbnNob3QobWV0aG9kOiBzdHJpbmcpOiB2b2lkIHtcbiAgY2hyb21lLnJ1bnRpbWUuc2VuZE1lc3NhZ2UoXG4gICAgeyB0eXBlOiAnY2FwdHVyZScgfSxcbiAgICAocmVzcG9uc2U6IHsgY29kZTogbnVtYmVyOyBkYXRhPzogc3RyaW5nOyBlcnJvcj86IHN0cmluZyB9KSA9PiB7XG4gICAgICBpZiAocmVzcG9uc2U/LmNvZGUgPT09IDApIHtcbiAgICAgICAgd2luZG93LnBvc3RNZXNzYWdlKFxuICAgICAgICAgIHsgbWV0aG9kLCBkYXRhOiByZXNwb25zZS5kYXRhIH0sXG4gICAgICAgICAgJyonXG4gICAgICAgICk7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICBsb2dnZXIuZXJyb3IoJ1NjcmVlbnNob3QgZmFpbGVkOicsIHJlc3BvbnNlPy5lcnJvcik7XG4gICAgICB9XG4gICAgfVxuICApO1xufVxuXG4vLyDlpITnkIblhbPpl63pobXpnaLor7fmsYJcbmZ1bmN0aW9uIGhhbmRsZUNsb3NlUGFnZSh1cmw6IHN0cmluZywgY2xvc2VBbGw6IGJvb2xlYW4pOiB2b2lkIHtcbiAgY2hyb21lLnJ1bnRpbWUuc2VuZE1lc3NhZ2Uoe1xuICAgIHR5cGU6IGNsb3NlQWxsID8gJ2Nsb3NlQWxsUGFnZScgOiAnY2xvc2VQYWdlJyxcbiAgICB1cmwsXG4gIH0pO1xufVxuXG4vLyBET00g5Yqg6L295a6M5oiQ5ZCO5qCH6K6w6aG16Z2iXG5kb2N1bWVudC5hZGRFdmVudExpc3RlbmVyKCdET01Db250ZW50TG9hZGVkJywgKCkgPT4ge1xuICBjb25zdCBtYW5pZmVzdCA9IGNocm9tZS5ydW50aW1lLmdldE1hbmlmZXN0KCk7XG4gIGRvY3VtZW50LmJvZHkuc2V0QXR0cmlidXRlKCdkYXRhLXNjcmVlbicsIGAxLSR7bWFuaWZlc3QudmVyc2lvbn1gKTtcbiAgbG9nZ2VyLmluZm8oJ0NvbnRlbnQgc2NyaXB0IGxvYWRlZCwgdmVyc2lvbjonLCBtYW5pZmVzdC52ZXJzaW9uKTtcbn0pO1xuXG4vLyDnm5HlkKzmnaXoh6ogYmFja2dyb3VuZCDnmoTmtojmga9cbmNocm9tZS5ydW50aW1lLm9uTWVzc2FnZS5hZGRMaXN0ZW5lcigocmVxdWVzdCwgc2VuZGVyLCBzZW5kUmVzcG9uc2UpID0+IHtcbiAgbG9nZ2VyLmRlYnVnKCdSZWNlaXZlZCBtZXNzYWdlIGZyb20gYmFja2dyb3VuZDonLCByZXF1ZXN0KTtcblxuICBpZiAocmVxdWVzdCAmJiB0eXBlb2YgcmVxdWVzdCA9PT0gJ29iamVjdCcgJiYgJ3R5cGUnIGluIHJlcXVlc3QpIHtcbiAgICBjb25zdCB0eXBlZFJlcXVlc3QgPSByZXF1ZXN0IGFzIHtcbiAgICAgIHR5cGU6IHN0cmluZztcbiAgICAgIG1heENoYXJzPzogdW5rbm93bjtcbiAgICAgIGV4dHJhY3RMaW5rVXJsPzogdW5rbm93bjtcbiAgICAgIGV4dHJhY3RJbWFnZVVybD86IHVua25vd247XG4gICAgICBtYXhVcmxzPzogdW5rbm93bjtcbiAgICAgIG9mZnNldD86IHVua25vd247XG4gICAgfTtcblxuICAgIHN3aXRjaCAodHlwZWRSZXF1ZXN0LnR5cGUpIHtcbiAgICAgIGNhc2UgJ3JlYWRQYWdlJzpcbiAgICAgICAgY29uc3QgbWF4Q2hhcnMgPSB0eXBlb2YgdHlwZWRSZXF1ZXN0Lm1heENoYXJzID09PSAnbnVtYmVyJyA/IHR5cGVkUmVxdWVzdC5tYXhDaGFycyA6IDEyMF8wMDA7XG4gICAgICAgIGNvbnN0IGV4dHJhY3RMaW5rVXJsID0gdHlwZWRSZXF1ZXN0LmV4dHJhY3RMaW5rVXJsID09PSB0cnVlO1xuICAgICAgICBjb25zdCBleHRyYWN0SW1hZ2VVcmwgPSB0eXBlZFJlcXVlc3QuZXh0cmFjdEltYWdlVXJsID09PSB0cnVlO1xuICAgICAgICBjb25zdCBtYXhVcmxzID0gdHlwZW9mIHR5cGVkUmVxdWVzdC5tYXhVcmxzID09PSAnbnVtYmVyJyA/IHR5cGVkUmVxdWVzdC5tYXhVcmxzIDogMjAwO1xuXG4gICAgICAgIGNvbnN0IGNvbnZlcnRlciA9IG5ldyBSZWFkUGFnZURvbVRvTWFya2Rvd24oe1xuICAgICAgICAgIGV4dHJhY3RJbWFnZVVybCxcbiAgICAgICAgICBleHRyYWN0TGlua1VybCxcbiAgICAgICAgICBtYXhVcmxzLFxuICAgICAgICB9KTtcblxuICAgICAgICBjb25zdCBjb250ZW50ID0gY29udmVydGVyLmNvbnZlcnQoZG9jdW1lbnQuYm9keSB8fCBkb2N1bWVudC5kb2N1bWVudEVsZW1lbnQpO1xuICAgICAgICBjb25zdCBkYXRhID0gY29udGVudC5sZW5ndGggPiBtYXhDaGFycyA/IGNvbnRlbnQuc2xpY2UoMCwgbWF4Q2hhcnMpIDogY29udGVudDtcbiAgICAgICAgc2VuZFJlc3BvbnNlKHsgY29kZTogMCwgZGF0YSwgdXJsOiB3aW5kb3cubG9jYXRpb24uaHJlZiwgdGl0bGU6IGRvY3VtZW50LnRpdGxlIH0pO1xuICAgICAgICByZXR1cm4gdHJ1ZTtcblxuICAgICAgY2FzZSAnZ2V0UGFnZUluZm8nOlxuICAgICAgICBzZW5kUmVzcG9uc2Uoe1xuICAgICAgICAgIGNvZGU6IDAsXG4gICAgICAgICAgZGF0YToge1xuICAgICAgICAgICAgdXJsOiB3aW5kb3cubG9jYXRpb24uaHJlZixcbiAgICAgICAgICAgIHRpdGxlOiBkb2N1bWVudC50aXRsZSxcbiAgICAgICAgICAgIGZhdmljb246IGRvY3VtZW50LnF1ZXJ5U2VsZWN0b3IoJ2xpbmtbcmVsPVwiaWNvblwiXScpPy5nZXRBdHRyaWJ1dGUoJ2hyZWYnKSB8fCAnJyxcbiAgICAgICAgICAgIGxlbmd0aDogZG9jdW1lbnQuYm9keT8udGV4dENvbnRlbnQ/Lmxlbmd0aCB8fCAwLFxuICAgICAgICAgICAgd29yZENvdW50OiBkb2N1bWVudC5ib2R5Py50ZXh0Q29udGVudD8uc3BsaXQoL1xccysvKS5sZW5ndGggfHwgMCxcbiAgICAgICAgICB9XG4gICAgICAgIH0pO1xuICAgICAgICByZXR1cm4gdHJ1ZTtcblxuICAgICAgY2FzZSAnZ2V0U2VsZWN0aW9uJzpcbiAgICAgICAgY29uc3Qgc2VsZWN0aW9uID0gd2luZG93LmdldFNlbGVjdGlvbigpO1xuICAgICAgICBjb25zdCBzZWxlY3RlZFRleHQgPSBzZWxlY3Rpb24/LnRvU3RyaW5nKCkgfHwgJyc7XG4gICAgICAgIHNlbmRSZXNwb25zZSh7XG4gICAgICAgICAgY29kZTogMCxcbiAgICAgICAgICBkYXRhOiB7XG4gICAgICAgICAgICB0ZXh0OiBzZWxlY3RlZFRleHQsXG4gICAgICAgICAgICBsZW5ndGg6IHNlbGVjdGVkVGV4dC5sZW5ndGgsXG4gICAgICAgICAgfVxuICAgICAgICB9KTtcbiAgICAgICAgcmV0dXJuIHRydWU7XG5cbiAgICAgIGNhc2UgJ3Njcm9sbFRvJzpcbiAgICAgICAgaWYgKHR5cGVvZiB0eXBlZFJlcXVlc3Qub2Zmc2V0ID09PSAnbnVtYmVyJykge1xuICAgICAgICAgIHdpbmRvdy5zY3JvbGxUbygwLCB0eXBlZFJlcXVlc3Qub2Zmc2V0KTtcbiAgICAgICAgICBzZW5kUmVzcG9uc2UoeyBjb2RlOiAwIH0pO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgIHNlbmRSZXNwb25zZSh7IGNvZGU6IC0xLCBlcnJvcjogJ0ludmFsaWQgb2Zmc2V0JyB9KTtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gdHJ1ZTtcblxuICAgICAgZGVmYXVsdDpcbiAgICAgICAgc2VuZFJlc3BvbnNlKHsgcmVjZWl2ZWQ6IHRydWUgfSk7XG4gICAgICAgIHJldHVybiB0cnVlO1xuICAgIH1cbiAgfVxuXG4gIHNlbmRSZXNwb25zZSh7IHJlY2VpdmVkOiB0cnVlIH0pO1xuICByZXR1cm4gdHJ1ZTtcbn0pO1xuXG5jb25zdCBzZWxlY3Rpb25CdXR0b25JZCA9ICdkb3ViYW8tc2VsZWN0aW9uLWFjdGlvbic7XG5sZXQgc2VsZWN0aW9uQnV0dG9uOiBIVE1MQnV0dG9uRWxlbWVudCB8IG51bGwgPSBudWxsO1xubGV0IHNlbGVjdGlvblVwZGF0ZVRpbWVyOiBudW1iZXIgfCBudWxsID0gbnVsbDtcbmxldCBsYXN0U2VsZWN0aW9uVGV4dCA9ICcnO1xuXG5mdW5jdGlvbiBlbnN1cmVTZWxlY3Rpb25CdXR0b24oKTogSFRNTEJ1dHRvbkVsZW1lbnQge1xuICBpZiAoc2VsZWN0aW9uQnV0dG9uKSByZXR1cm4gc2VsZWN0aW9uQnV0dG9uO1xuXG4gIGNvbnN0IGJ0biA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ2J1dHRvbicpO1xuICBidG4uaWQgPSBzZWxlY3Rpb25CdXR0b25JZDtcbiAgYnRuLnR5cGUgPSAnYnV0dG9uJztcbiAgYnRuLnRleHRDb250ZW50ID0gJ+ino+mHiic7XG4gIGJ0bi5zdHlsZS5wb3NpdGlvbiA9ICdmaXhlZCc7XG4gIGJ0bi5zdHlsZS56SW5kZXggPSAnMjE0NzQ4MzY0Nyc7XG4gIGJ0bi5zdHlsZS5kaXNwbGF5ID0gJ25vbmUnO1xuICBidG4uc3R5bGUucGFkZGluZyA9ICc2cHggMTBweCc7XG4gIGJ0bi5zdHlsZS5ib3JkZXIgPSAnMXB4IHNvbGlkIHJnYmEoMCwwLDAsMC4wOCknO1xuICBidG4uc3R5bGUuYm9yZGVyUmFkaXVzID0gJzEwcHgnO1xuICBidG4uc3R5bGUuYmFja2dyb3VuZCA9ICcjMDA1N2ZmJztcbiAgYnRuLnN0eWxlLmNvbG9yID0gJyNmZmYnO1xuICBidG4uc3R5bGUuZm9udFNpemUgPSAnMTJweCc7XG4gIGJ0bi5zdHlsZS5mb250V2VpZ2h0ID0gJzYwMCc7XG4gIGJ0bi5zdHlsZS5saW5lSGVpZ2h0ID0gJzE2cHgnO1xuICBidG4uc3R5bGUuY3Vyc29yID0gJ3BvaW50ZXInO1xuICBidG4uc3R5bGUuYm94U2hhZG93ID0gJzAgNnB4IDE4cHggcmdiYSgwLDAsMCwwLjEyKSc7XG4gIGJ0bi5zdHlsZS51c2VyU2VsZWN0ID0gJ25vbmUnO1xuICBidG4uc3R5bGUud2Via2l0VXNlclNlbGVjdCA9ICdub25lJztcblxuICBidG4uYWRkRXZlbnRMaXN0ZW5lcignbW91c2Vkb3duJywgKGUpID0+IHtcbiAgICBlLnByZXZlbnREZWZhdWx0KCk7XG4gICAgZS5zdG9wUHJvcGFnYXRpb24oKTtcbiAgfSk7XG5cbiAgYnRuLmFkZEV2ZW50TGlzdGVuZXIoJ2NsaWNrJywgYXN5bmMgKGUpID0+IHtcbiAgICBlLnByZXZlbnREZWZhdWx0KCk7XG4gICAgZS5zdG9wUHJvcGFnYXRpb24oKTtcblxuICAgIGNvbnN0IHRleHQgPSBsYXN0U2VsZWN0aW9uVGV4dC50cmltKCk7XG4gICAgaWYgKCF0ZXh0KSByZXR1cm47XG4gICAgaGlkZVNlbGVjdGlvbkJ1dHRvbigpO1xuXG4gICAgYXdhaXQgY2hyb21lLnJ1bnRpbWUuc2VuZE1lc3NhZ2Uoe1xuICAgICAgdHlwZTogJ29wZW5TaWRlUGFuZWwnLFxuICAgICAgZGF0YTogeyBzZWxlY3RlZFRleHQ6IHRleHQgfSxcbiAgICB9KTtcbiAgfSk7XG5cbiAgZG9jdW1lbnQuZG9jdW1lbnRFbGVtZW50LmFwcGVuZENoaWxkKGJ0bik7XG4gIHNlbGVjdGlvbkJ1dHRvbiA9IGJ0bjtcbiAgcmV0dXJuIGJ0bjtcbn1cblxuZnVuY3Rpb24gaGlkZVNlbGVjdGlvbkJ1dHRvbigpOiB2b2lkIHtcbiAgaWYgKCFzZWxlY3Rpb25CdXR0b24pIHJldHVybjtcbiAgc2VsZWN0aW9uQnV0dG9uLnN0eWxlLmRpc3BsYXkgPSAnbm9uZSc7XG59XG5cbmZ1bmN0aW9uIGNsYW1wKHZhbHVlOiBudW1iZXIsIG1pbjogbnVtYmVyLCBtYXg6IG51bWJlcik6IG51bWJlciB7XG4gIHJldHVybiBNYXRoLm1heChtaW4sIE1hdGgubWluKG1heCwgdmFsdWUpKTtcbn1cblxuZnVuY3Rpb24gc2hvdWxkSWdub3JlU2VsZWN0aW9uKHNlbGVjdGlvbjogU2VsZWN0aW9uKTogYm9vbGVhbiB7XG4gIGNvbnN0IGFuY2hvciA9IHNlbGVjdGlvbi5hbmNob3JOb2RlO1xuICBpZiAoIWFuY2hvcikgcmV0dXJuIHRydWU7XG4gIGNvbnN0IGVsZW1lbnQgPSBhbmNob3Iubm9kZVR5cGUgPT09IE5vZGUuRUxFTUVOVF9OT0RFID8gKGFuY2hvciBhcyBFbGVtZW50KSA6IGFuY2hvci5wYXJlbnRFbGVtZW50O1xuICBpZiAoIWVsZW1lbnQpIHJldHVybiBmYWxzZTtcbiAgY29uc3QgZWRpdGFibGUgPSBlbGVtZW50LmNsb3Nlc3QoJ2lucHV0LCB0ZXh0YXJlYSwgW2NvbnRlbnRlZGl0YWJsZT1cInRydWVcIl0sIFtjb250ZW50ZWRpdGFibGU9XCJcIl0sIFtyb2xlPVwidGV4dGJveFwiXScpO1xuICByZXR1cm4gISFlZGl0YWJsZTtcbn1cblxuZnVuY3Rpb24gdXBkYXRlU2VsZWN0aW9uQnV0dG9uKCk6IHZvaWQge1xuICBjb25zdCBzZWxlY3Rpb24gPSB3aW5kb3cuZ2V0U2VsZWN0aW9uKCk7XG4gIGlmICghc2VsZWN0aW9uIHx8IHNlbGVjdGlvbi5yYW5nZUNvdW50ID09PSAwIHx8IHNlbGVjdGlvbi5pc0NvbGxhcHNlZCkge1xuICAgIGhpZGVTZWxlY3Rpb25CdXR0b24oKTtcbiAgICByZXR1cm47XG4gIH1cblxuICBpZiAoc2hvdWxkSWdub3JlU2VsZWN0aW9uKHNlbGVjdGlvbikpIHtcbiAgICBoaWRlU2VsZWN0aW9uQnV0dG9uKCk7XG4gICAgcmV0dXJuO1xuICB9XG5cbiAgY29uc3QgcmF3VGV4dCA9IHNlbGVjdGlvbi50b1N0cmluZygpO1xuICBjb25zdCB0ZXh0ID0gcmF3VGV4dC5yZXBsYWNlKC9cXHMrL2csICcgJykudHJpbSgpO1xuICBpZiAoIXRleHQpIHtcbiAgICBoaWRlU2VsZWN0aW9uQnV0dG9uKCk7XG4gICAgcmV0dXJuO1xuICB9XG5cbiAgbGFzdFNlbGVjdGlvblRleHQgPSB0ZXh0Lmxlbmd0aCA+IDEwXzAwMCA/IHRleHQuc2xpY2UoMCwgMTBfMDAwKSA6IHRleHQ7XG4gIGNvbnN0IHJhbmdlID0gc2VsZWN0aW9uLmdldFJhbmdlQXQoMCk7XG4gIGNvbnN0IHJlY3QgPSByYW5nZS5nZXRCb3VuZGluZ0NsaWVudFJlY3QoKTtcbiAgY29uc3QgY2xpZW50UmVjdHMgPSByYW5nZS5nZXRDbGllbnRSZWN0cygpO1xuICBjb25zdCBiZXN0UmVjdCA9IChyZWN0LndpZHRoID09PSAwICYmIHJlY3QuaGVpZ2h0ID09PSAwICYmIGNsaWVudFJlY3RzLmxlbmd0aCA+IDApID8gY2xpZW50UmVjdHNbY2xpZW50UmVjdHMubGVuZ3RoIC0gMV0gOiByZWN0O1xuXG4gIGlmIChiZXN0UmVjdC53aWR0aCA9PT0gMCAmJiBiZXN0UmVjdC5oZWlnaHQgPT09IDApIHtcbiAgICBoaWRlU2VsZWN0aW9uQnV0dG9uKCk7XG4gICAgcmV0dXJuO1xuICB9XG5cbiAgY29uc3QgYnRuID0gZW5zdXJlU2VsZWN0aW9uQnV0dG9uKCk7XG4gIGNvbnN0IHBhZGRpbmcgPSAxMDtcbiAgY29uc3QgdG9wID0gY2xhbXAoYmVzdFJlY3QuYm90dG9tICsgOCwgcGFkZGluZywgd2luZG93LmlubmVySGVpZ2h0IC0gcGFkZGluZyk7XG4gIGNvbnN0IGxlZnQgPSBjbGFtcChiZXN0UmVjdC5sZWZ0LCBwYWRkaW5nLCB3aW5kb3cuaW5uZXJXaWR0aCAtIHBhZGRpbmcpO1xuXG4gIGJ0bi5zdHlsZS50b3AgPSBgJHt0b3B9cHhgO1xuICBidG4uc3R5bGUubGVmdCA9IGAke2xlZnR9cHhgO1xuICBidG4uc3R5bGUuZGlzcGxheSA9ICdibG9jayc7XG59XG5cbmZ1bmN0aW9uIHNjaGVkdWxlU2VsZWN0aW9uVXBkYXRlKCk6IHZvaWQge1xuICBpZiAoc2VsZWN0aW9uVXBkYXRlVGltZXIgIT09IG51bGwpIHdpbmRvdy5jbGVhclRpbWVvdXQoc2VsZWN0aW9uVXBkYXRlVGltZXIpO1xuICBzZWxlY3Rpb25VcGRhdGVUaW1lciA9IHdpbmRvdy5zZXRUaW1lb3V0KCgpID0+IHtcbiAgICBzZWxlY3Rpb25VcGRhdGVUaW1lciA9IG51bGw7XG4gICAgdXBkYXRlU2VsZWN0aW9uQnV0dG9uKCk7XG4gIH0sIDgwKTtcbn1cblxuZG9jdW1lbnQuYWRkRXZlbnRMaXN0ZW5lcignc2VsZWN0aW9uY2hhbmdlJywgKCkgPT4ge1xuICBzY2hlZHVsZVNlbGVjdGlvblVwZGF0ZSgpO1xufSk7XG5cbmRvY3VtZW50LmFkZEV2ZW50TGlzdGVuZXIoJ21vdXNlZG93bicsIChlKSA9PiB7XG4gIGNvbnN0IHRhcmdldCA9IGUudGFyZ2V0IGFzIEVsZW1lbnQgfCBudWxsO1xuICBpZiAodGFyZ2V0ICYmICh0YXJnZXQuaWQgPT09IHNlbGVjdGlvbkJ1dHRvbklkIHx8IHRhcmdldC5jbG9zZXN0KGAjJHtzZWxlY3Rpb25CdXR0b25JZH1gKSkpIHJldHVybjtcbiAgaGlkZVNlbGVjdGlvbkJ1dHRvbigpO1xufSwgdHJ1ZSk7XG5cbndpbmRvdy5hZGRFdmVudExpc3RlbmVyKCdzY3JvbGwnLCAoKSA9PiB7XG4gIGhpZGVTZWxlY3Rpb25CdXR0b24oKTtcbn0sIHRydWUpO1xuIl19
})();

/******/ })()
;
//# sourceMappingURL=content-script.js.map