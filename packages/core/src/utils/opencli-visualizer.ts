/**
 * OpenCLI 可视化模块
 * 
 * 负责在页面上高亮显示元素、显示操作反馈等可视化功能
 */

export interface HighlightOptions {
  /** 高亮持续时间（毫秒） */
  duration?: number;
  /** 高亮颜色 */
  color?: string;
  /** 是否显示标签 */
  showLabel?: boolean;
  /** 标签文本 */
  label?: string;
}

export interface OperationFeedback {
  /** 操作类型 */
  type: 'click' | 'type' | 'scroll' | 'screenshot' | 'wait' | 'get';
  /** 操作状态 */
  status: 'pending' | 'success' | 'error';
  /** 操作目标 */
  target: string;
  /** 消息 */
  message?: string;
}

/**
 * OpenCLI 可视化类
 */
export class OpenCLIVisualizer {
  private static instance: OpenCLIVisualizer;
  private highlightOverlay: HTMLDivElement | null = null;
  private toastContainer: HTMLDivElement | null = null;
  private statusIndicator: HTMLDivElement | null = null;

  private constructor() {}

  /**
   * 获取单例实例
   */
  public static getInstance(): OpenCLIVisualizer {
    if (!OpenCLIVisualizer.instance) {
      OpenCLIVisualizer.instance = new OpenCLIVisualizer();
    }
    return OpenCLIVisualizer.instance;
  }

  /**
   * 初始化可视化组件
   */
  public init(): void {
    this.createHighlightOverlay();
    this.createToastContainer();
    this.createStatusIndicator();
  }

  /**
   * 创建高亮覆盖层
   */
  private createHighlightOverlay(): void {
    if (this.highlightOverlay) return;
    if (typeof document === 'undefined') return;

    this.highlightOverlay = document.createElement('div');
    this.highlightOverlay.id = 'opencli-highlight-overlay';
    this.highlightOverlay.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      pointer-events: none;
      z-index: 2147483647;
      display: none;
    `;
    document.body.appendChild(this.highlightOverlay);
  }

  /**
   * 创建消息提示容器
   */
  private createToastContainer(): void {
    if (this.toastContainer) return;
    if (typeof document === 'undefined') return;

    this.toastContainer = document.createElement('div');
    this.toastContainer.id = 'opencli-toast-container';
    this.toastContainer.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      max-width: 400px;
      z-index: 2147483647;
      display: flex;
      flex-direction: column;
      gap: 10px;
    `;
    document.body.appendChild(this.toastContainer);
  }

  /**
   * 创建状态指示器
   */
  private createStatusIndicator(): void {
    if (this.statusIndicator) return;
    if (typeof document === 'undefined') return;

    this.statusIndicator = document.createElement('div');
    this.statusIndicator.id = 'opencli-status-indicator';
    this.statusIndicator.style.cssText = `
      position: fixed;
      bottom: 20px;
      right: 20px;
      padding: 12px 20px;
      background: linear-gradient(135deg, #6366f1, #8b5cf6);
      color: white;
      border-radius: 12px;
      box-shadow: 0 4px 12px rgba(99, 102, 241, 0.4);
      font-size: 14px;
      font-weight: 500;
      z-index: 2147483647;
      display: flex;
      align-items: center;
      gap: 8px;
      cursor: move;
      user-select: none;
    `;
    this.statusIndicator.innerHTML = `
      <span class="status-dot" style="
        width: 8px;
        height: 8px;
        border-radius: 50%;
        background: #22c55e;
        animation: pulse 2s infinite;
      "></span>
      <span class="status-text">OpenCLI 就绪</span>
    `;
    document.body.appendChild(this.statusIndicator);

    // 添加拖拽功能
    this.makeDraggable(this.statusIndicator);
  }

  /**
   * 使元素可拖拽
   */
  private makeDraggable(element: HTMLElement): void {
    let isDragging = false;
    let startX = 0;
    let startY = 0;
    let initialX = 0;
    let initialY = 0;

    element.addEventListener('mousedown', (e) => {
      isDragging = true;
      startX = e.clientX;
      startY = e.clientY;
      const rect = element.getBoundingClientRect();
      initialX = rect.left;
      initialY = rect.top;
      element.style.cursor = 'grabbing';
    });

    document.addEventListener('mousemove', (e) => {
      if (!isDragging) return;
      const dx = e.clientX - startX;
      const dy = e.clientY - startY;
      element.style.left = `${initialX + dx}px`;
      element.style.top = `${initialY + dy}px`;
      element.style.right = 'auto';
      element.style.bottom = 'auto';
    });

    document.addEventListener('mouseup', () => {
      isDragging = false;
      element.style.cursor = 'move';
    });
  }

  /**
   * 高亮显示元素
   */
  public highlightElement(
    element: Element,
    options: HighlightOptions = {}
  ): void {
    const {
      duration = 2000,
      color = 'rgba(99, 102, 241, 0.3)',
      showLabel = true,
      label = '',
    } = options;

    if (!this.highlightOverlay) return;

    const rect = element.getBoundingClientRect();
    const scrollX = window.scrollX;
    const scrollY = window.scrollY;

    // 创建高亮框
    const highlightBox = document.createElement('div');
    highlightBox.style.cssText = `
      position: absolute;
      left: ${rect.left + scrollX}px;
      top: ${rect.top + scrollY}px;
      width: ${rect.width}px;
      height: ${rect.height}px;
      background: ${color};
      border: 2px solid #6366f1;
      border-radius: 4px;
      box-shadow: 0 0 20px rgba(99, 102, 241, 0.5);
      transition: all 0.3s ease;
      animation: highlight-pulse 1s ease-in-out infinite;
    `;

    // 添加标签
    if (showLabel && label) {
      const labelEl = document.createElement('div');
      labelEl.style.cssText = `
        position: absolute;
        left: ${rect.left + scrollX}px;
        top: ${rect.top + scrollY - 30}px;
        background: #6366f1;
        color: white;
        padding: 4px 12px;
        border-radius: 4px;
        font-size: 12px;
        font-weight: 600;
        white-space: nowrap;
      `;
      labelEl.textContent = label;
      this.highlightOverlay.appendChild(labelEl);
    }

    this.highlightOverlay.appendChild(highlightBox);
    this.highlightOverlay.style.display = 'block';

    // 自动移除
    setTimeout(() => {
      highlightBox.remove();
      if (this.highlightOverlay?.children.length === 0) {
        this.highlightOverlay.style.display = 'none';
      }
    }, duration);
  }

  /**
   * 高亮显示元素（通过选择器）
   */
  public highlightBySelector(
    selector: string,
    options: HighlightOptions = {}
  ): void {
    if (typeof document === 'undefined') return;
    
    const element = document.querySelector(selector);
    if (element) {
      this.highlightElement(element, {
        ...options,
        label: options.label || selector,
      });
    } else {
      this.showToast(`未找到元素：${selector}`, 'error');
    }
  }

  /**
   * 显示操作反馈
   */
  public showOperationFeedback(feedback: OperationFeedback): void {
    if (typeof document === 'undefined') return;
    
    const { type, status, target, message } = feedback;

    let icon = '';
    let color = '';

    switch (type) {
      case 'click':
        icon = '👆';
        break;
      case 'type':
        icon = '⌨️';
        break;
      case 'scroll':
        icon = '📜';
        break;
      case 'screenshot':
        icon = '📷';
        break;
      case 'wait':
        icon = '⏳';
        break;
      case 'get':
        icon = '📄';
        break;
    }

    switch (status) {
      case 'pending':
        color = '#fbbf24';
        break;
      case 'success':
        color = '#22c55e';
        break;
      case 'error':
        color = '#ef4444';
        break;
    }

    const toast = document.createElement('div');
    toast.style.cssText = `
      padding: 12px 16px;
      background: white;
      border-left: 4px solid ${color};
      border-radius: 8px;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
      display: flex;
      align-items: center;
      gap: 10px;
      font-size: 14px;
      animation: slideInRight 0.3s ease;
      max-width: 400px;
    `;

    const statusText = status === 'pending' ? '执行中...' : status === 'success' ? '成功' : '失败';
    toast.innerHTML = `
      <span style="font-size: 18px;">${icon}</span>
      <div style="flex: 1;">
        <div style="font-weight: 600; color: #1f2937;">${type.toUpperCase()} - ${statusText}</div>
        <div style="font-size: 12px; color: #6b7280;">${target}${message ? ` - ${message}` : ''}</div>
      </div>
    `;

    this.toastContainer?.appendChild(toast);

    // 3 秒后自动移除
    setTimeout(() => {
      toast.style.animation = 'slideOutRight 0.3s ease';
      setTimeout(() => toast.remove(), 300);
    }, 3000);
  }

  /**
   * 显示消息提示
   */
  public showToast(message: string, type: 'info' | 'success' | 'error' = 'info'): void {
    if (typeof document === 'undefined') return;
    
    const colors = {
      info: '#6366f1',
      success: '#22c55e',
      error: '#ef4444',
    };

    const toast = document.createElement('div');
    toast.style.cssText = `
      padding: 12px 16px;
      background: white;
      border-left: 4px solid ${colors[type]};
      border-radius: 8px;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
      font-size: 14px;
      animation: slideInRight 0.3s ease;
      max-width: 400px;
    `;
    toast.textContent = message;

    this.toastContainer?.appendChild(toast);

    // 3 秒后自动移除
    setTimeout(() => {
      toast.style.animation = 'slideOutRight 0.3s ease';
      setTimeout(() => toast.remove(), 300);
    }, 3000);
  }

  /**
   * 更新状态指示器
   */
  public updateStatus(text: string, status: 'ready' | 'busy' | 'error' = 'ready'): void {
    if (typeof document === 'undefined') return;
    if (!this.statusIndicator) return;

    const statusDot = this.statusIndicator.querySelector('.status-dot') as HTMLElement;
    const statusText = this.statusIndicator.querySelector('.status-text') as HTMLElement;

    const colors = {
      ready: '#22c55e',
      busy: '#fbbf24',
      error: '#ef4444',
    };

    statusDot.style.background = colors[status];
    statusText.textContent = text;

    if (status === 'busy') {
      statusDot.style.animation = 'pulse 1s infinite';
    } else {
      statusDot.style.animation = 'none';
    }
  }

  /**
   * 清除所有高亮
   */
  public clearAllHighlights(): void {
    if (typeof document === 'undefined') return;
    
    if (this.highlightOverlay) {
      this.highlightOverlay.innerHTML = '';
      this.highlightOverlay.style.display = 'none';
    }
  }

  /**
   * 显示页面信息面板
   */
  public showPageInfo(): void {
    const info = {
      url: window.location.href,
      title: document.title,
      elements: document.querySelectorAll('*').length,
      links: document.querySelectorAll('a').length,
      images: document.querySelectorAll('img').length,
    };

    const infoHtml = `
      <div style="
        position: fixed;
        top: 20px;
        left: 20px;
        background: white;
        padding: 16px;
        border-radius: 12px;
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
        z-index: 2147483647;
        font-size: 13px;
        max-width: 300px;
      ">
        <h3 style="margin: 0 0 12px 0; font-size: 16px; color: #6366f1;">📊 页面信息</h3>
        <div style="display: grid; gap: 8px;">
          <div><strong>标题:</strong> ${info.title.substring(0, 50)}${info.title.length > 50 ? '...' : ''}</div>
          <div><strong>URL:</strong> ${info.url.substring(0, 50)}${info.url.length > 50 ? '...' : ''}</div>
          <div><strong>元素数:</strong> ${info.elements}</div>
          <div><strong>链接数:</strong> ${info.links}</div>
          <div><strong>图片数:</strong> ${info.images}</div>
        </div>
        <button onclick="document.getElementById('opencli-page-info')?.remove()" style="
          margin-top: 12px;
          padding: 6px 12px;
          background: #6366f1;
          color: white;
          border: none;
          border-radius: 4px;
          cursor: pointer;
          font-size: 12px;
        ">关闭</button>
      </div>
    `;

    const container = document.createElement('div');
    container.id = 'opencli-page-info';
    container.innerHTML = infoHtml;
    document.body.appendChild(container);
  }
}

// 添加动画样式（仅在浏览器环境中）
if (typeof document !== 'undefined') {
  const style = document.createElement('style');
  style.textContent = `
    @keyframes highlight-pulse {
      0%, 100% {
        opacity: 1;
        transform: scale(1);
      }
      50% {
        opacity: 0.7;
        transform: scale(1.02);
      }
    }
    
    @keyframes slideInRight {
      from {
        transform: translateX(400px);
        opacity: 0;
      }
      to {
        transform: translateX(0);
        opacity: 1;
      }
    }
    
    @keyframes slideOutRight {
      from {
        transform: translateX(0);
        opacity: 1;
      }
      to {
        transform: translateX(400px);
        opacity: 0;
      }
    }
    
    @keyframes pulse {
      0%, 100% {
        opacity: 1;
      }
      50% {
        opacity: 0.5;
      }
    }
  `;
  document.head.appendChild(style);
}

// 导出单例
export const opencliVisualizer = OpenCLIVisualizer.getInstance();
