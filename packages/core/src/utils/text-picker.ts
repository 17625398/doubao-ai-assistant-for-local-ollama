// 文本选择器实现

import {
  TextPicker,
  TextPickerConfig,
  TextPickerAction,
  TextSelectionEvent,
} from '../types/text-picker'
import { logger } from './logger'

// 文本类型检测函数
function detectTextType(text: string): 'code' | 'url' | 'email' | 'phone' | 'plain' {
  // 检测URL
  const urlPattern = /^(https?:\/\/)?([\da-z.-]+)\.([a-z.]{2,6})([/\w .-]*)*\/?$/i;
  if (urlPattern.test(text)) {
    return 'url';
  }
  
  // 检测邮箱
  const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (emailPattern.test(text)) {
    return 'email';
  }
  
  // 检测电话
  const phonePattern = /^\d{11}$|^\d{3}-\d{3}-\d{4}$|^\d{4}-\d{3}-\d{4}$/;
  if (phonePattern.test(text)) {
    return 'phone';
  }
  
  // 检测代码
  const codePattern = /\b(const|let|var|function|class|import|export|return|if|else|for|while|switch|case|default)\b/;
  if (codePattern.test(text) && text.includes('{') && text.includes('}')) {
    return 'code';
  }
  
  return 'plain';
}

// 检查是否在浏览器环境中
const isBrowser = typeof window !== 'undefined' && typeof document !== 'undefined'

/**
 * 文本选择器实现
 */
export class BrowserTextPicker implements TextPicker {
  private config: TextPickerConfig
  private container: HTMLElement | null = null
  private isEnabled: boolean = false
  private mousePosition: { x: number; y: number } = { x: 0, y: 0 }
  private isBrowser: boolean
  private selectionHistory: string[] = []
  private maxHistorySize: number = 50

  constructor() {
    this.isBrowser = isBrowser
    this.config = {
      enabled: true,
      actions: [
        TextPickerAction.COPY,
        TextPickerAction.SEARCH,
        TextPickerAction.TRANSLATE,
        TextPickerAction.EXPLAIN,
        TextPickerAction.SUMMARIZE,
        TextPickerAction.SAVE,
        TextPickerAction.SHARE,
        TextPickerAction.MORE,
      ],
      enableInExtension: true,
      enableInWeb: true,
      customActions: [],
      enableContextMenu: true,
    }
  }

  /**
   * 初始化文本选择器
   */
  init(config?: Partial<TextPickerConfig>): void {
    if (!this.isBrowser) {
      logger.info('Text picker: not in browser environment, skipping initialization')
      return
    }

    if (config) {
      this.config = { ...this.config, ...config }
    }

    if (this.config.enabled) {
      this.enable()
    }

    logger.info('Text picker initialized')
  }

  /**
   * 启用文本选择器
   */
  enable(): void {
    if (!this.isBrowser) {
      return
    }

    if (this.isEnabled) return

    document.addEventListener('mouseup', this.handleMouseUp.bind(this))
    document.addEventListener('mousemove', this.handleMouseMove.bind(this))
    
    // 添加上下文菜单
    if (this.config.enableContextMenu) {
      document.addEventListener('contextmenu', this.handleContextMenu.bind(this))
    }
    
    this.isEnabled = true

    logger.info('Text picker enabled')
  }

  /**
   * 禁用文本选择器
   */
  disable(): void {
    if (!this.isBrowser) {
      return
    }

    if (!this.isEnabled) return

    document.removeEventListener('mouseup', this.handleMouseUp.bind(this))
    document.removeEventListener('mousemove', this.handleMouseMove.bind(this))
    
    // 移加上下文菜单
    if (this.config.enableContextMenu) {
      document.removeEventListener('contextmenu', this.handleContextMenu.bind(this))
    }
    
    this.isEnabled = false
    this.hidePicker()

    logger.info('Text picker disabled')
  }

  /**
   * 更新配置
   */
  updateConfig(config: Partial<TextPickerConfig>): void {
    this.config = { ...this.config, ...config }
    logger.info('Text picker config updated:', config)
  }

  /**
   * 销毁文本选择器
   */
  destroy(): void {
    this.disable()
    this.container = null
    logger.info('Text picker destroyed')
  }

  /**
   * 处理鼠标移动，记录鼠标位置
   */
  private handleMouseMove(e: MouseEvent): void {
    this.mousePosition = { x: e.clientX, y: e.clientY }
  }

  /**
   * 处理鼠标释放，显示文本选择器
   */
  private handleMouseUp(e: MouseEvent): void {
    if (!this.isBrowser) {
      return
    }

    const selection = window.getSelection()
    if (!selection || selection.isCollapsed) {
      this.hidePicker()
      return
    }

    const text = selection.toString().trim()
    if (text.length === 0) {
      this.hidePicker()
      return
    }

    const range = selection.getRangeAt(0)
    if (!range) {
      this.hidePicker()
      return
    }

    const event: TextSelectionEvent = {
      text,
      selection,
      range,
      mousePosition: this.mousePosition,
      url: window.location.href,
      title: document.title,
    }

    this.showPicker(event)
  }

  /**
   * 显示文本选择器
   */
  private showPicker(event: TextSelectionEvent): void {
    if (!this.isBrowser) {
      return
    }

    this.hidePicker()

    // 记录选择历史
    this.addToSelectionHistory(event.text)

    // 创建选择器容器
    this.container = document.createElement('div')
    this.container.className = 'text-picker-container'
    this.container.style.position = 'fixed'
    this.container.style.zIndex = '9999'
    this.container.style.backgroundColor = 'white'
    this.container.style.borderRadius = '12px'
    this.container.style.boxShadow = '0 4px 20px rgba(0, 0, 0, 0.15)'
    this.container.style.display = 'flex'
    this.container.style.padding = '6px'
    this.container.style.left = `${event.mousePosition.x + 10}px`
    this.container.style.top = `${event.mousePosition.y + 10}px`
    this.container.style.animation = 'fadeIn 0.2s ease-out'

    // 添加操作按钮
    this.config.actions.forEach(action => {
      const button = this.createActionButton(action, event)
      if (button) {
        this.container?.appendChild(button)
      }
    })

    // 添加自定义操作
    this.config.customActions?.forEach(action => {
      const button = this.createCustomActionButton(action, event)
      if (button) {
        this.container?.appendChild(button)
      }
    })

    // 添加到文档
    document.body.appendChild(this.container)

    // 点击其他地方关闭选择器
    setTimeout(() => {
      document.addEventListener('click', this.handleDocumentClick.bind(this), { once: true })
    }, 100)
  }

  /**
   * 隐藏文本选择器
   */
  private hidePicker(): void {
    if (!this.isBrowser) {
      return
    }

    if (this.container && this.container.parentNode) {
      this.container.parentNode.removeChild(this.container)
      this.container = null
    }
  }

  /**
   * 处理文档点击，关闭选择器
   */
  private handleDocumentClick(e: MouseEvent): void {
    if (!this.isBrowser) {
      return
    }

    if (this.container && !this.container.contains(e.target as Node)) {
      this.hidePicker()
    }
  }

  /**
   * 处理上下文菜单事件
   */
  private handleContextMenu(e: MouseEvent): void {
    if (!this.isBrowser) {
      return
    }

    const selection = window.getSelection()
    if (!selection || selection.isCollapsed) {
      return
    }

    const text = selection.toString().trim()
    if (text.length === 0) {
      return
    }

    const range = selection.getRangeAt(0)
    if (!range) {
      return
    }

    const event: TextSelectionEvent = {
      text,
      selection,
      range,
      mousePosition: { x: e.clientX, y: e.clientY },
      url: window.location.href,
      title: document.title,
    }

    // 阻止默认上下文菜单
    e.preventDefault()
    
    // 显示自定义上下文菜单
    this.showContextMenu(event)
  }

  /**
   * 显示上下文菜单
   */
  private showContextMenu(event: TextSelectionEvent): void {
    if (!this.isBrowser) {
      return
    }

    this.hidePicker()

    // 记录选择历史
    this.addToSelectionHistory(event.text)

    // 创建上下文菜单容器
    this.container = document.createElement('div')
    this.container.className = 'text-picker-context-menu'
    this.container.style.position = 'fixed'
    this.container.style.zIndex = '9999'
    this.container.style.backgroundColor = 'white'
    this.container.style.borderRadius = '8px'
    this.container.style.boxShadow = '0 4px 20px rgba(0, 0, 0, 0.15)'
    this.container.style.padding = '8px 0'
    this.container.style.left = `${event.mousePosition.x}px`
    this.container.style.top = `${event.mousePosition.y}px`
    this.container.style.animation = 'fadeIn 0.2s ease-out'
    this.container.style.minWidth = '160px'

    // 根据文本类型添加相应的操作
    const textType = detectTextType(event.text)
    const contextActions = this.getContextActions(textType)

    // 添加操作菜单项
    contextActions.forEach(action => {
      const menuItem = this.createContextMenuItem(action, event)
      if (menuItem) {
        this.container?.appendChild(menuItem)
      }
    })

    // 添加到文档
    document.body.appendChild(this.container)

    // 点击其他地方关闭菜单
    setTimeout(() => {
      document.addEventListener('click', this.handleDocumentClick.bind(this), { once: true })
    }, 100)
  }

  /**
   * 根据文本类型获取上下文操作
   */
  private getContextActions(textType: string): TextPickerAction[] {
    const baseActions = [
      TextPickerAction.COPY,
      TextPickerAction.SEARCH,
    ]

    switch (textType) {
      case 'url':
        return [...baseActions, TextPickerAction.OPEN, TextPickerAction.SHARE, TextPickerAction.MORE]
      case 'email':
        return [...baseActions, TextPickerAction.EMAIL, TextPickerAction.SHARE, TextPickerAction.MORE]
      case 'phone':
        return [...baseActions, TextPickerAction.CALL, TextPickerAction.SHARE, TextPickerAction.MORE]
      case 'code':
        return [...baseActions, TextPickerAction.EXPLAIN, TextPickerAction.COPY, TextPickerAction.MORE]
      default:
        return [...baseActions, TextPickerAction.TRANSLATE, TextPickerAction.EXPLAIN, TextPickerAction.SUMMARIZE, TextPickerAction.SAVE, TextPickerAction.SHARE, TextPickerAction.MORE]
    }
  }

  /**
   * 创建上下文菜单项
   */
  private createContextMenuItem(action: TextPickerAction, event: TextSelectionEvent): HTMLElement {
    if (!this.isBrowser) {
      return document.createElement('div')
    }

    const menuItem = document.createElement('div')
    menuItem.className = 'text-picker-menu-item'
    menuItem.style.padding = '8px 16px'
    menuItem.style.cursor = 'pointer'
    menuItem.style.fontSize = '14px'
    menuItem.style.transition = 'background-color 0.2s'

    menuItem.addEventListener('mouseenter', () => {
      menuItem.style.backgroundColor = '#f0f0f0'
    })

    menuItem.addEventListener('mouseleave', () => {
      menuItem.style.backgroundColor = 'transparent'
    })

    switch (action) {
      case TextPickerAction.COPY:
        menuItem.textContent = '复制'
        menuItem.addEventListener('click', () => {
          this.copyText(event.text)
          this.hidePicker()
        })
        break
      case TextPickerAction.SEARCH:
        menuItem.textContent = '搜索'
        menuItem.addEventListener('click', () => {
          this.searchText(event.text)
          this.hidePicker()
        })
        break
      case TextPickerAction.TRANSLATE:
        menuItem.textContent = '翻译'
        menuItem.addEventListener('click', () => {
          this.translateText(event.text)
          this.hidePicker()
        })
        break
      case TextPickerAction.EXPLAIN:
        menuItem.textContent = '解释'
        menuItem.addEventListener('click', () => {
          this.explainText(event.text)
          this.hidePicker()
        })
        break
      case TextPickerAction.SUMMARIZE:
        menuItem.textContent = '总结'
        menuItem.addEventListener('click', () => {
          this.summarizeText(event.text)
          this.hidePicker()
        })
        break
      case TextPickerAction.SAVE:
        menuItem.textContent = '保存'
        menuItem.addEventListener('click', () => {
          this.saveText(event.text)
          this.hidePicker()
        })
        break
      case TextPickerAction.SHARE:
        menuItem.textContent = '分享'
        menuItem.addEventListener('click', () => {
          this.shareText(event.text)
          this.hidePicker()
        })
        break
      case TextPickerAction.OPEN:
        menuItem.textContent = '打开链接'
        menuItem.addEventListener('click', () => {
          this.openUrl(event.text)
          this.hidePicker()
        })
        break
      case TextPickerAction.EMAIL:
        menuItem.textContent = '发送邮件'
        menuItem.addEventListener('click', () => {
          this.sendEmail(event.text)
          this.hidePicker()
        })
        break
      case TextPickerAction.CALL:
        menuItem.textContent = '拨打电话'
        menuItem.addEventListener('click', () => {
          this.callPhone(event.text)
          this.hidePicker()
        })
        break
      case TextPickerAction.MORE:
        menuItem.textContent = '更多选项'
        menuItem.addEventListener('click', () => {
          this.showMoreOptions(event)
        })
        break
      default:
        return menuItem
    }

    return menuItem
  }

  /**
   * 创建操作按钮
   */
  private createActionButton(action: TextPickerAction, event: TextSelectionEvent): HTMLElement {
    if (!this.isBrowser) {
      return document.createElement('button')
    }

    const button = document.createElement('button')
    button.className = 'text-picker-button'
    button.style.padding = '8px 12px'
    button.style.border = 'none'
    button.style.background = 'none'
    button.style.borderRadius = '4px'
    button.style.cursor = 'pointer'
    button.style.fontSize = '14px'
    button.style.margin = '0 2px'
    button.style.transition = 'background-color 0.2s'

    button.addEventListener('mouseenter', () => {
      button.style.backgroundColor = '#f0f0f0'
    })

    button.addEventListener('mouseleave', () => {
      button.style.backgroundColor = 'transparent'
    })

    switch (action) {
      case TextPickerAction.COPY:
        button.textContent = '复制'
        button.addEventListener('click', () => {
          this.copyText(event.text)
          this.hidePicker()
        })
        break

      case TextPickerAction.SEARCH:
        button.textContent = '搜索'
        button.addEventListener('click', () => {
          this.searchText(event.text)
          this.hidePicker()
        })
        break

      case TextPickerAction.TRANSLATE:
        button.textContent = '翻译'
        button.addEventListener('click', () => {
          this.translateText(event.text)
          this.hidePicker()
        })
        break

      case TextPickerAction.EXPLAIN:
        button.textContent = '解释'
        button.addEventListener('click', () => {
          this.explainText(event.text)
          this.hidePicker()
        })
        break

      case TextPickerAction.SUMMARIZE:
        button.textContent = '总结'
        button.addEventListener('click', () => {
          this.summarizeText(event.text)
          this.hidePicker()
        })
        break

      case TextPickerAction.SAVE:
        button.textContent = '保存'
        button.addEventListener('click', () => {
          this.saveText(event.text)
          this.hidePicker()
        })
        break

      case TextPickerAction.SHARE:
        button.textContent = '分享'
        button.addEventListener('click', () => {
          this.shareText(event.text)
          this.hidePicker()
        })
        break

      case TextPickerAction.MORE:
        button.textContent = '更多'
        button.addEventListener('click', () => {
          this.showMoreOptions(event)
        })
        break

      default:
        return button
    }

    return button
  }

  /**
   * 创建自定义操作按钮
   */
  private createCustomActionButton(action: any, event: TextSelectionEvent): HTMLElement {
    if (!this.isBrowser) {
      return document.createElement('button')
    }

    const button = document.createElement('button')
    button.className = 'text-picker-button custom-action'
    button.style.padding = '8px 12px'
    button.style.border = 'none'
    button.style.background = 'none'
    button.style.borderRadius = '4px'
    button.style.cursor = 'pointer'
    button.style.fontSize = '14px'
    button.style.margin = '0 2px'
    button.style.transition = 'background-color 0.2s'

    button.textContent = action.name

    button.addEventListener('mouseenter', () => {
      button.style.backgroundColor = '#f0f0f0'
    })

    button.addEventListener('mouseleave', () => {
      button.style.backgroundColor = 'transparent'
    })

    button.addEventListener('click', () => {
      if (typeof action.handler === 'function') {
        action.handler(event.text, event.selection)
      }
      this.hidePicker()
    })

    return button
  }

  /**
   * 复制文本
   */
  private copyText(text: string): void {
    if (!this.isBrowser) {
      return
    }

    navigator.clipboard
      .writeText(text)
      .then(() => {
        logger.info('Text copied to clipboard')
      })
      .catch(err => {
        logger.error('Failed to copy text:', err)
      })
  }

  /**
   * 搜索文本
   */
  private searchText(text: string): void {
    if (!this.isBrowser) {
      return
    }

    const searchUrl = `https://www.baidu.com/s?wd=${encodeURIComponent(text)}`
    window.open(searchUrl, '_blank')
  }

  /**
   * 翻译文本
   */
  private translateText(text: string): void {
    if (!this.isBrowser) {
      return
    }

    const translateUrl = `https://fanyi.baidu.com/#auto/zh/${encodeURIComponent(text)}`
    window.open(translateUrl, '_blank')
  }

  /**
   * 解释文本
   */
  private explainText(text: string): void {
    if (!this.isBrowser) {
      return
    }

    // 这里可以实现调用AI来解释文本
    window.dispatchEvent(new CustomEvent('text-picker:explain', { detail: { text } }))
  }

  /**
   * 总结文本
   */
  private summarizeText(text: string): void {
    if (!this.isBrowser) {
      return
    }

    // 这里可以实现调用AI来总结文本
    window.dispatchEvent(new CustomEvent('text-picker:summarize', { detail: { text } }))
  }

  /**
   * 保存文本
   */
  private saveText(text: string): void {
    if (!this.isBrowser) {
      return
    }

    // 这里可以实现保存文本到书签或其他存储
    window.dispatchEvent(new CustomEvent('text-picker:save', { detail: { text } }))
  }

  /**
   * 分享文本
   */
  private shareText(text: string): void {
    if (!this.isBrowser) {
      return
    }

    if (navigator.share) {
      navigator
        .share({
          title: document.title,
          text: text,
          url: window.location.href,
        })
        .catch(err => {
          logger.error('Failed to share text:', err)
        })
    } else {
      //  fallback for browsers that don't support the Share API
      this.copyText(text)
    }
  }

  /**
   * 显示更多选项
   */
  private showMoreOptions(event: TextSelectionEvent): void {
    if (!this.isBrowser) {
      return
    }

    // 这里可以实现显示更多选项的逻辑
    window.dispatchEvent(new CustomEvent('text-picker:more', { detail: event }))
  }

  /**
   * 打开URL
   */
  private openUrl(url: string): void {
    if (!this.isBrowser) {
      return
    }

    // 确保URL格式正确
    let fullUrl = url
    if (!url.startsWith('http://') && !url.startsWith('https://')) {
      fullUrl = `https://${url}`
    }

    window.open(fullUrl, '_blank')
  }

  /**
   * 发送邮件
   */
  private sendEmail(email: string): void {
    if (!this.isBrowser) {
      return
    }

    const mailtoUrl = `mailto:${email}`
    window.open(mailtoUrl)
  }

  /**
   * 拨打电话
   */
  private callPhone(phone: string): void {
    if (!this.isBrowser) {
      return
    }

    const telUrl = `tel:${phone}`
    window.open(telUrl)
  }

  /**
   * 添加到选择历史
   */
  private addToSelectionHistory(text: string): void {
    // 移除重复项
    const index = this.selectionHistory.indexOf(text)
    if (index !== -1) {
      this.selectionHistory.splice(index, 1)
    }

    // 添加到历史记录开头
    this.selectionHistory.unshift(text)

    // 限制历史记录长度
    if (this.selectionHistory.length > this.maxHistorySize) {
      this.selectionHistory = this.selectionHistory.slice(0, this.maxHistorySize)
    }
  }

  /**
   * 获取选择历史
   */
  getSelectionHistory(): string[] {
    return [...this.selectionHistory]
  }

  /**
   * 清空选择历史
   */
  clearSelectionHistory(): void {
    this.selectionHistory = []
  }
}

/**
 * 全局文本选择器实例
 */
export const textPicker = new BrowserTextPicker()

export default textPicker
