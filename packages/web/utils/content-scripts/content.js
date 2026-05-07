// 网页内容提取脚本

interface TextSelectionEvent {
  text: string;
  selection: Selection;
  range: Range;
  mousePosition: { x: number; y: number };
  url: string;
  title: string;
}

type TextPickerAction = 
  | 'copy'
  | 'search'
  | 'translate'
  | 'explain'
  | 'summarize'
  | 'save'
  | 'share'
  | 'open'
  | 'email'
  | 'call'
  | 'more';

interface TextPickerConfig {
  enabled: boolean;
  actions: TextPickerAction[];
  enableInExtension: boolean;
  enableInWeb: boolean;
  customActions: Array<{
    id: string;
    name: string;
    icon?: string;
    handler: (event: TextSelectionEvent) => void;
  }>;
  enableContextMenu: boolean;
}

class BrowserTextPicker {
  private isBrowser: boolean;
  private isEnabled: boolean = false;
  private config: TextPickerConfig;
  private container: HTMLElement | null = null;
  private selectionHistory: string[] = [];
  private maxHistorySize = 50;

  constructor() {
    this.isBrowser = typeof window !== 'undefined' && typeof document !== 'undefined';
    this.config = {
      enabled: true,
      actions: [
        'copy',
        'search',
        'translate',
        'explain',
        'summarize',
        'save',
        'share',
        'more',
      ],
      enableInExtension: true,
      enableInWeb: true,
      customActions: [],
      enableContextMenu: true,
    };
  }

  /**
   * 启用文本选择器
   */
  enable(): void {
    if (!this.isBrowser) {
      return;
    }

    if (this.isEnabled) return;

    document.addEventListener('mouseup', this.handleMouseUp.bind(this));
    document.addEventListener('mousemove', this.handleMouseMove.bind(this));
    
    // 添加上下文菜单
    if (this.config.enableContextMenu) {
      document.addEventListener('contextmenu', this.handleContextMenu.bind(this));
    }
    
    this.isEnabled = true;
  }

  /**
   * 禁用文本选择器
   */
  disable(): void {
    if (!this.isBrowser) {
      return;
    }

    if (!this.isEnabled) return;

    document.removeEventListener('mouseup', this.handleMouseUp.bind(this));
    document.removeEventListener('mousemove', this.handleMouseMove.bind(this));
    
    // 移加上下文菜单
    if (this.config.enableContextMenu) {
      document.removeEventListener('contextmenu', this.handleContextMenu.bind(this));
    }
    
    this.isEnabled = false;
    this.hidePicker();
  }

  /**
   * 处理鼠标释放事件
   */
  private handleMouseUp(e: MouseEvent): void {
    if (!this.isBrowser) {
      return;
    }

    const selection = window.getSelection();
    if (!selection || selection.isCollapsed) {
      this.hidePicker();
      return;
    }

    const text = selection.toString().trim();
    if (text.length === 0) {
      this.hidePicker();
      return;
    }

    const range = selection.getRangeAt(0);
    if (!range) {
      this.hidePicker();
      return;
    }

    const event: TextSelectionEvent = {
      text,
      selection,
      range,
      mousePosition: { x: e.clientX, y: e.clientY },
      url: window.location.href,
      title: document.title,
    };

    this.showPicker(event);
  }

  /**
   * 处理鼠标移动事件
   */
  private handleMouseMove(e: MouseEvent): void {
    // 可以在这里添加鼠标移动时的逻辑
  }

  /**
   * 处理文档点击，关闭选择器
   */
  private handleDocumentClick(e: MouseEvent): void {
    if (!this.isBrowser) {
      return;
    }

    if (this.container && !this.container.contains(e.target as Node)) {
      this.hidePicker();
    }
  }

  /**
   * 处理上下文菜单事件
   */
  private handleContextMenu(e: MouseEvent): void {
    if (!this.isBrowser) {
      return;
    }

    const selection = window.getSelection();
    if (!selection || selection.isCollapsed) {
      return;
    }

    const text = selection.toString().trim();
    if (text.length === 0) {
      return;
    }

    const range = selection.getRangeAt(0);
    if (!range) {
      return;
    }

    const event: TextSelectionEvent = {
      text,
      selection,
      range,
      mousePosition: { x: e.clientX, y: e.clientY },
      url: window.location.href,
      title: document.title,
    };

    // 阻止默认上下文菜单
    e.preventDefault();
    
    // 显示自定义上下文菜单
    this.showContextMenu(event);
  }

  /**
   * 显示选择器
   */
  private showPicker(event: TextSelectionEvent): void {
    if (!this.isBrowser) {
      return;
    }

    this.hidePicker();

    // 记录选择历史
    this.addToSelectionHistory(event.text);

    // 创建选择器容器
    this.container = document.createElement('div');
    this.container.style.position = 'fixed';
    this.container.style.zIndex = '9999';
    this.container.style.backgroundColor = 'white';
    this.container.style.borderRadius = '12px';
    this.container.style.boxShadow = '0 4px 20px rgba(0, 0, 0, 0.15)';
    this.container.style.animation = 'fadeIn 0.2s ease-out';

    // 计算位置
    const range = event.range;
    const rect = range.getBoundingClientRect();
    this.container.style.left = `${rect.left + rect.width / 2 - 100}px`;
    this.container.style.top = `${rect.top - 50}px`;

    // 添加操作按钮
    this.config.actions.forEach(action => {
      const button = this.createActionButton(action, event);
      this.container?.appendChild(button);
    });

    // 添加到文档
    document.body.appendChild(this.container);

    // 点击其他地方关闭选择器
    setTimeout(() => {
      document.addEventListener('click', this.handleDocumentClick.bind(this), { once: true });
    }, 100);
  }

  /**
   * 显示上下文菜单
   */
  private showContextMenu(event: TextSelectionEvent): void {
    if (!this.isBrowser) {
      return;
    }

    this.hidePicker();

    // 记录选择历史
    this.addToSelectionHistory(event.text);

    // 创建上下文菜单容器
    this.container = document.createElement('div');
    this.container.style.position = 'fixed';
    this.container.style.zIndex = '9999';
    this.container.style.backgroundColor = 'white';
    this.container.style.borderRadius = '8px';
    this.container.style.boxShadow = '0 4px 20px rgba(0, 0, 0, 0.15)';
    this.container.style.padding = '8px 0';
    this.container.style.left = `${event.mousePosition.x}px`;
    this.container.style.top = `${event.mousePosition.y}px`;
    this.container.style.animation = 'fadeIn 0.2s ease-out';
    this.container.style.minWidth = '160px';

    // 根据文本类型添加相应的操作
    const textType = this.detectTextType(event.text);
    const contextActions = this.getContextActions(textType);

    // 添加操作菜单项
    contextActions.forEach(action => {
      const menuItem = this.createContextMenuItem(action, event);
      if (menuItem) {
        this.container?.appendChild(menuItem);
      }
    });

    // 添加到文档
    document.body.appendChild(this.container);

    // 点击其他地方关闭菜单
    setTimeout(() => {
      document.addEventListener('click', this.handleDocumentClick.bind(this), { once: true });
    }, 100);
  }

  /**
   * 根据文本类型获取上下文操作
   */
  private getContextActions(textType: string): TextPickerAction[] {
    const baseActions: TextPickerAction[] = ['copy', 'search'];

    switch (textType) {
      case 'url':
        return [...baseActions, 'open', 'share', 'more'];
      case 'email':
        return [...baseActions, 'email', 'share', 'more'];
      case 'phone':
        return [...baseActions, 'call', 'share', 'more'];
      case 'code':
        return [...baseActions, 'explain', 'copy', 'more'];
      default:
        return [...baseActions, 'translate', 'explain', 'summarize', 'save', 'share', 'more'];
    }
  }

  /**
   * 创建操作按钮
   */
  private createActionButton(action: TextPickerAction, event: TextSelectionEvent): HTMLButtonElement {
    if (!this.isBrowser) {
      return document.createElement('button');
    }

    const button = document.createElement('button');
    button.className = 'text-picker-button';
    button.style.padding = '8px 12px';
    button.style.border = 'none';
    button.style.background = 'none';
    button.style.cursor = 'pointer';
    button.style.fontSize = '14px';
    button.style.transition = 'background-color 0.2s';
    button.style.borderRadius = '8px';

    button.addEventListener('mouseenter', () => {
      button.style.backgroundColor = '#f0f0f0';
    });

    button.addEventListener('mouseleave', () => {
      button.style.backgroundColor = 'transparent';
    });

    switch (action) {
      case 'copy':
        button.textContent = '复制';
        button.addEventListener('click', () => {
          this.copyText(event.text);
          this.hidePicker();
        });
        break;
      case 'search':
        button.textContent = '搜索';
        button.addEventListener('click', () => {
          this.searchText(event.text);
          this.hidePicker();
        });
        break;
      case 'translate':
        button.textContent = '翻译';
        button.addEventListener('click', () => {
          this.translateText(event.text);
          this.hidePicker();
        });
        break;
      case 'explain':
        button.textContent = '解释';
        button.addEventListener('click', () => {
          this.explainText(event.text);
          this.hidePicker();
        });
        break;
      case 'summarize':
        button.textContent = '总结';
        button.addEventListener('click', () => {
          this.summarizeText(event.text);
          this.hidePicker();
        });
        break;
      case 'save':
        button.textContent = '保存';
        button.addEventListener('click', () => {
          this.saveText(event.text);
          this.hidePicker();
        });
        break;
      case 'share':
        button.textContent = '分享';
        button.addEventListener('click', () => {
          this.shareText(event.text);
          this.hidePicker();
        });
        break;
      case 'more':
        button.textContent = '更多';
        button.addEventListener('click', () => {
          this.showMoreOptions(event);
        });
        break;
      default:
        button.textContent = action;
        break;
    }

    return button;
  }

  /**
   * 创建上下文菜单项
   */
  private createContextMenuItem(action: TextPickerAction, event: TextSelectionEvent): HTMLElement {
    if (!this.isBrowser) {
      return document.createElement('div');
    }

    const menuItem = document.createElement('div');
    menuItem.className = 'text-picker-menu-item';
    menuItem.style.padding = '8px 16px';
    menuItem.style.cursor = 'pointer';
    menuItem.style.fontSize = '14px';
    menuItem.style.transition = 'background-color 0.2s';

    menuItem.addEventListener('mouseenter', () => {
      menuItem.style.backgroundColor = '#f0f0f0';
    });

    menuItem.addEventListener('mouseleave', () => {
      menuItem.style.backgroundColor = 'transparent';
    });

    switch (action) {
      case 'copy':
        menuItem.textContent = '复制';
        menuItem.addEventListener('click', () => {
          this.copyText(event.text);
          this.hidePicker();
        });
        break;
      case 'search':
        menuItem.textContent = '搜索';
        menuItem.addEventListener('click', () => {
          this.searchText(event.text);
          this.hidePicker();
        });
        break;
      case 'translate':
        menuItem.textContent = '翻译';
        menuItem.addEventListener('click', () => {
          this.translateText(event.text);
          this.hidePicker();
        });
        break;
      case 'explain':
        menuItem.textContent = '解释';
        menuItem.addEventListener('click', () => {
          this.explainText(event.text);
          this.hidePicker();
        });
        break;
      case 'summarize':
        menuItem.textContent = '总结';
        menuItem.addEventListener('click', () => {
          this.summarizeText(event.text);
          this.hidePicker();
        });
        break;
      case 'save':
        menuItem.textContent = '保存';
        menuItem.addEventListener('click', () => {
          this.saveText(event.text);
          this.hidePicker();
        });
        break;
      case 'share':
        menuItem.textContent = '分享';
        menuItem.addEventListener('click', () => {
          this.shareText(event.text);
          this.hidePicker();
        });
        break;
      case 'open':
        menuItem.textContent = '打开链接';
        menuItem.addEventListener('click', () => {
          this.openUrl(event.text);
          this.hidePicker();
        });
        break;
      case 'email':
        menuItem.textContent = '发送邮件';
        menuItem.addEventListener('click', () => {
          this.sendEmail(event.text);
          this.hidePicker();
        });
        break;
      case 'call':
        menuItem.textContent = '拨打电话';
        menuItem.addEventListener('click', () => {
          this.callPhone(event.text);
          this.hidePicker();
        });
        break;
      case 'more':
        menuItem.textContent = '更多选项';
        menuItem.addEventListener('click', () => {
          this.showMoreOptions(event);
        });
        break;
      default:
        return menuItem;
    }

    return menuItem;
  }

  /**
   * 隐藏选择器
   */
  private hidePicker(): void {
    if (this.container && this.container.parentNode) {
      this.container.parentNode.removeChild(this.container);
      this.container = null;
    }
  }

  /**
   * 复制文本
   */
  private copyText(text: string): void {
    if (!this.isBrowser) {
      return;
    }

    navigator.clipboard.writeText(text).catch(err => {
      console.error('Failed to copy text:', err);
    });
  }

  /**
   * 搜索文本
   */
  private searchText(text: string): void {
    if (!this.isBrowser) {
      return;
    }

    const searchUrl = `https://www.google.com/search?q=${encodeURIComponent(text)}`;
    window.open(searchUrl, '_blank');
  }

  /**
   * 翻译文本
   */
  private translateText(text: string): void {
    if (!this.isBrowser) {
      return;
    }

    const translateUrl = `https://translate.google.com/?text=${encodeURIComponent(text)}`;
    window.open(translateUrl, '_blank');
  }

  /**
   * 解释文本
   */
  private explainText(text: string): void {
    if (!this.isBrowser) {
      return;
    }

    // 触发自定义事件，由主应用处理
    window.dispatchEvent(new CustomEvent('text-picker:explain', { detail: { text } }));
  }

  /**
   * 总结文本
   */
  private summarizeText(text: string): void {
    if (!this.isBrowser) {
      return;
    }

    // 触发自定义事件，由主应用处理
    window.dispatchEvent(new CustomEvent('text-picker:summarize', { detail: { text } }));
  }

  /**
   * 保存文本
   */
  private saveText(text: string): void {
    if (!this.isBrowser) {
      return;
    }

    // 触发自定义事件，由主应用处理
    window.dispatchEvent(new CustomEvent('text-picker:save', { detail: { text } }));
  }

  /**
   * 分享文本
   */
  private shareText(text: string): void {
    if (!this.isBrowser) {
      return;
    }

    if (navigator.share) {
      navigator.share({
        title: document.title,
        text: text,
        url: window.location.href
      }).catch(err => {
        console.error('Failed to share:', err);
      });
    } else {
      // 降级方案
      this.copyText(text);
    }
  }

  /**
   * 打开URL
   */
  private openUrl(url: string): void {
    if (!this.isBrowser) {
      return;
    }

    // 确保URL格式正确
    let fullUrl = url;
    if (!url.startsWith('http://') && !url.startsWith('https://')) {
      fullUrl = `https://${url}`;
    }

    window.open(fullUrl, '_blank');
  }

  /**
   * 发送邮件
   */
  private sendEmail(email: string): void {
    if (!this.isBrowser) {
      return;
    }

    const mailtoUrl = `mailto:${email}`;
    window.open(mailtoUrl);
  }

  /**
   * 拨打电话
   */
  private callPhone(phone: string): void {
    if (!this.isBrowser) {
      return;
    }

    const telUrl = `tel:${phone}`;
    window.open(telUrl);
  }

  /**
   * 显示更多选项
   */
  private showMoreOptions(event: TextSelectionEvent): void {
    if (!this.isBrowser) {
      return;
    }

    // 这里可以实现显示更多选项的逻辑
    window.dispatchEvent(new CustomEvent('text-picker:more', { detail: event }));
  }

  /**
   * 文本类型检测
   */
  private detectTextType(text: string): 'code' | 'url' | 'email' | 'phone' | 'plain' {
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

  /**
   * 添加到选择历史
   */
  private addToSelectionHistory(text: string): void {
    // 移除重复项
    const index = this.selectionHistory.indexOf(text);
    if (index !== -1) {
      this.selectionHistory.splice(index, 1);
    }

    // 添加到历史记录开头
    this.selectionHistory.unshift(text);

    // 限制历史记录长度
    if (this.selectionHistory.length > this.maxHistorySize) {
      this.selectionHistory = this.selectionHistory.slice(0, this.maxHistorySize);
    }
  }

  /**
   * 获取选择历史
   */
  getSelectionHistory(): string[] {
    return [...this.selectionHistory];
  }

  /**
   * 清空选择历史
   */
  clearSelectionHistory(): void {
    this.selectionHistory = [];
  }
}

// 导出单例实例
export const textPicker = new BrowserTextPicker();

// 初始化文本选择器
if (typeof window !== 'undefined') {
  textPicker.enable();
}
