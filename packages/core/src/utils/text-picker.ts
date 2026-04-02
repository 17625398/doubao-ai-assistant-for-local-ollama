// 文本选择器实现

import { TextPicker, TextPickerConfig, TextPickerAction, TextSelectionEvent } from '../types/text-picker';
import { logger } from './logger';

/**
 * 文本选择器实现
 */
export class BrowserTextPicker implements TextPicker {
  private config: TextPickerConfig;
  private container: HTMLElement | null = null;
  private isEnabled: boolean = false;
  private mousePosition: { x: number; y: number } = { x: 0, y: 0 };

  constructor() {
    this.config = {
      enabled: true,
      actions: [
        TextPickerAction.COPY,
        TextPickerAction.SEARCH,
        TextPickerAction.TRANSLATE,
        TextPickerAction.EXPLAIN,
        TextPickerAction.MORE
      ],
      enableInExtension: true,
      enableInWeb: true,
      customActions: []
    };
  }

  /**
   * 初始化文本选择器
   */
  init(config?: Partial<TextPickerConfig>): void {
    if (config) {
      this.config = { ...this.config, ...config };
    }

    if (this.config.enabled) {
      this.enable();
    }

    logger.info('Text picker initialized');
  }

  /**
   * 启用文本选择器
   */
  enable(): void {
    if (this.isEnabled) return;

    document.addEventListener('mouseup', this.handleMouseUp.bind(this));
    document.addEventListener('mousemove', this.handleMouseMove.bind(this));
    this.isEnabled = true;

    logger.info('Text picker enabled');
  }

  /**
   * 禁用文本选择器
   */
  disable(): void {
    if (!this.isEnabled) return;

    document.removeEventListener('mouseup', this.handleMouseUp.bind(this));
    document.removeEventListener('mousemove', this.handleMouseMove.bind(this));
    this.isEnabled = false;
    this.hidePicker();

    logger.info('Text picker disabled');
  }

  /**
   * 更新配置
   */
  updateConfig(config: Partial<TextPickerConfig>): void {
    this.config = { ...this.config, ...config };
    logger.info('Text picker config updated:', config);
  }

  /**
   * 销毁文本选择器
   */
  destroy(): void {
    this.disable();
    this.container = null;
    logger.info('Text picker destroyed');
  }

  /**
   * 处理鼠标移动，记录鼠标位置
   */
  private handleMouseMove(e: MouseEvent): void {
    this.mousePosition = { x: e.clientX, y: e.clientY };
  }

  /**
   * 处理鼠标释放，显示文本选择器
   */
  private handleMouseUp(e: MouseEvent): void {
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
      mousePosition: this.mousePosition,
      url: window.location.href,
      title: document.title
    };

    this.showPicker(event);
  }

  /**
   * 显示文本选择器
   */
  private showPicker(event: TextSelectionEvent): void {
    this.hidePicker();

    // 创建选择器容器
    this.container = document.createElement('div');
    this.container.className = 'text-picker-container';
    this.container.style.position = 'fixed';
    this.container.style.zIndex = '9999';
    this.container.style.backgroundColor = 'white';
    this.container.style.borderRadius = '8px';
    this.container.style.boxShadow = '0 2px 10px rgba(0, 0, 0, 0.1)';
    this.container.style.display = 'flex';
    this.container.style.padding = '4px';
    this.container.style.left = `${event.mousePosition.x + 10}px`;
    this.container.style.top = `${event.mousePosition.y + 10}px`;

    // 添加操作按钮
    this.config.actions.forEach(action => {
      const button = this.createActionButton(action, event);
      if (button) {
        this.container?.appendChild(button);
      }
    });

    // 添加自定义操作
    this.config.customActions?.forEach(action => {
      const button = this.createCustomActionButton(action, event);
      if (button) {
        this.container?.appendChild(button);
      }
    });

    // 添加到文档
    document.body.appendChild(this.container);

    // 点击其他地方关闭选择器
    setTimeout(() => {
      document.addEventListener('click', this.handleDocumentClick.bind(this), { once: true });
    }, 100);
  }

  /**
   * 隐藏文本选择器
   */
  private hidePicker(): void {
    if (this.container && this.container.parentNode) {
      this.container.parentNode.removeChild(this.container);
      this.container = null;
    }
  }

  /**
   * 处理文档点击，关闭选择器
   */
  private handleDocumentClick(e: MouseEvent): void {
    if (this.container && !this.container.contains(e.target as Node)) {
      this.hidePicker();
    }
  }

  /**
   * 创建操作按钮
   */
  private createActionButton(action: TextPickerAction, event: TextSelectionEvent): HTMLElement {
    const button = document.createElement('button');
    button.className = 'text-picker-button';
    button.style.padding = '8px 12px';
    button.style.border = 'none';
    button.style.background = 'none';
    button.style.borderRadius = '4px';
    button.style.cursor = 'pointer';
    button.style.fontSize = '14px';
    button.style.margin = '0 2px';
    button.style.transition = 'background-color 0.2s';

    button.addEventListener('mouseenter', () => {
      button.style.backgroundColor = '#f0f0f0';
    });

    button.addEventListener('mouseleave', () => {
      button.style.backgroundColor = 'transparent';
    });

    switch (action) {
      case TextPickerAction.COPY:
        button.textContent = '复制';
        button.addEventListener('click', () => {
          this.copyText(event.text);
          this.hidePicker();
        });
        break;

      case TextPickerAction.SEARCH:
        button.textContent = '搜索';
        button.addEventListener('click', () => {
          this.searchText(event.text);
          this.hidePicker();
        });
        break;

      case TextPickerAction.TRANSLATE:
        button.textContent = '翻译';
        button.addEventListener('click', () => {
          this.translateText(event.text);
          this.hidePicker();
        });
        break;

      case TextPickerAction.EXPLAIN:
        button.textContent = '解释';
        button.addEventListener('click', () => {
          this.explainText(event.text);
          this.hidePicker();
        });
        break;

      case TextPickerAction.SUMMARIZE:
        button.textContent = '总结';
        button.addEventListener('click', () => {
          this.summarizeText(event.text);
          this.hidePicker();
        });
        break;

      case TextPickerAction.SAVE:
        button.textContent = '保存';
        button.addEventListener('click', () => {
          this.saveText(event.text);
          this.hidePicker();
        });
        break;

      case TextPickerAction.SHARE:
        button.textContent = '分享';
        button.addEventListener('click', () => {
          this.shareText(event.text);
          this.hidePicker();
        });
        break;

      case TextPickerAction.MORE:
        button.textContent = '更多';
        button.addEventListener('click', () => {
          this.showMoreOptions(event);
        });
        break;

      default:
        return button;
    }

    return button;
  }

  /**
   * 创建自定义操作按钮
   */
  private createCustomActionButton(action: any, event: TextSelectionEvent): HTMLElement {
    const button = document.createElement('button');
    button.className = 'text-picker-button custom-action';
    button.style.padding = '8px 12px';
    button.style.border = 'none';
    button.style.background = 'none';
    button.style.borderRadius = '4px';
    button.style.cursor = 'pointer';
    button.style.fontSize = '14px';
    button.style.margin = '0 2px';
    button.style.transition = 'background-color 0.2s';

    button.textContent = action.name;

    button.addEventListener('mouseenter', () => {
      button.style.backgroundColor = '#f0f0f0';
    });

    button.addEventListener('mouseleave', () => {
      button.style.backgroundColor = 'transparent';
    });

    button.addEventListener('click', () => {
      if (typeof action.handler === 'function') {
        action.handler(event.text, event.selection);
      }
      this.hidePicker();
    });

    return button;
  }

  /**
   * 复制文本
   */
  private copyText(text: string): void {
    navigator.clipboard.writeText(text).then(() => {
      logger.info('Text copied to clipboard');
    }).catch(err => {
      logger.error('Failed to copy text:', err);
    });
  }

  /**
   * 搜索文本
   */
  private searchText(text: string): void {
    const searchUrl = `https://www.baidu.com/s?wd=${encodeURIComponent(text)}`;
    window.open(searchUrl, '_blank');
  }

  /**
   * 翻译文本
   */
  private translateText(text: string): void {
    const translateUrl = `https://fanyi.baidu.com/#auto/zh/${encodeURIComponent(text)}`;
    window.open(translateUrl, '_blank');
  }

  /**
   * 解释文本
   */
  private explainText(text: string): void {
    // 这里可以实现调用AI来解释文本
    window.dispatchEvent(new CustomEvent('text-picker:explain', { detail: { text } }));
  }

  /**
   * 总结文本
   */
  private summarizeText(text: string): void {
    // 这里可以实现调用AI来总结文本
    window.dispatchEvent(new CustomEvent('text-picker:summarize', { detail: { text } }));
  }

  /**
   * 保存文本
   */
  private saveText(text: string): void {
    // 这里可以实现保存文本到书签或其他存储
    window.dispatchEvent(new CustomEvent('text-picker:save', { detail: { text } }));
  }

  /**
   * 分享文本
   */
  private shareText(text: string): void {
    if (navigator.share) {
      navigator.share({
        title: document.title,
        text: text,
        url: window.location.href
      }).catch(err => {
        logger.error('Failed to share text:', err);
      });
    } else {
      //  fallback for browsers that don't support the Share API
      this.copyText(text);
    }
  }

  /**
   * 显示更多选项
   */
  private showMoreOptions(event: TextSelectionEvent): void {
    // 这里可以实现显示更多选项的逻辑
    window.dispatchEvent(new CustomEvent('text-picker:more', { detail: event }));
  }
}

/**
 * 全局文本选择器实例
 */
export const textPicker = new BrowserTextPicker();

export default textPicker;
