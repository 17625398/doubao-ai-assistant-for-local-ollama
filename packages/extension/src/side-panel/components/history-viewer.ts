/**
 * 历史记录查看器组件
 * 
 * 提供历史记录的查看、搜索、过滤和导出功能
 */

import { openCLIHistory, type HistoryEntry, type HistoryFilter } from '../../services/opencli-history';

export class HistoryViewer {
  private container: HTMLElement | null = null;
  private searchInput: HTMLInputElement | null = null;
  private filterSelect: HTMLSelectElement | null = null;
  private resultListElement: HTMLElement | null = null;
  private currentPage: number = 1;
  private pageSize: number = 20;
  private totalRecords: number = 0;
  private currentFilter: HistoryFilter = {};

  /**
   * 初始化历史记录查看器
   */
  public init(): void {
    this.createViewer();
    this.attachEventListeners();
    this.loadHistory();
  }

  /**
   * 创建查看器 DOM
   */
  private createViewer(): void {
    const viewer = document.createElement('div');
    viewer.id = 'opencli-history-viewer';
    viewer.className = 'history-viewer';
    
    viewer.innerHTML = `
      <div class="history-viewer-header">
        <div class="history-viewer-title">
          <span class="icon">📜</span>
          <span>执行历史</span>
        </div>
        <div class="history-viewer-actions">
          <button class="btn btn-secondary" id="history-export-btn" title="导出历史">
            <span>📤</span>
            <span>导出</span>
          </button>
          <button class="btn btn-secondary" id="history-refresh-btn" title="刷新">
            <span>🔄</span>
          </button>
        </div>
      </div>

      <div class="history-viewer-filters">
        <div class="filter-group">
          <input 
            type="text" 
            class="input search-input" 
            id="history-search"
            placeholder="搜索命令、URL..."
          />
        </div>
        <div class="filter-group">
          <select class="select" id="history-command-filter">
            <option value="">全部命令</option>
            <option value="click">click</option>
            <option value="type">type</option>
            <option value="navigate">navigate</option>
            <option value="get">get</option>
            <option value="extract.content">extract.content</option>
          </select>
        </div>
        <div class="filter-group">
          <select class="select" id="history-result-filter">
            <option value="">全部结果</option>
            <option value="success">成功</option>
            <option value="failed">失败</option>
          </select>
        </div>
        <div class="filter-group">
          <select class="select" id="history-time-filter">
            <option value="1h">最近 1 小时</option>
            <option value="24h" selected>最近 24 小时</option>
            <option value="7d">最近 7 天</option>
            <option value="30d">最近 30 天</option>
            <option value="all">全部</option>
          </select>
        </div>
      </div>

      <div class="history-viewer-summary">
        <span id="history-summary-text">共 0 条记录</span>
        <span id="history-stats"></span>
      </div>

      <div class="history-viewer-list" id="history-list">
        <div class="history-loading">
          <span class="loading-spinner">⏳</span>
          <span>加载中...</span>
        </div>
      </div>

      <div class="history-viewer-pagination" id="history-pagination">
        <button class="btn btn-sm" id="history-prev-page" disabled>上一页</button>
        <span class="page-info" id="history-page-info">第 1 页</span>
        <button class="btn btn-sm" id="history-next-page" disabled>下一页</button>
      </div>
    `;

    this.container = viewer;
    this.searchInput = viewer.querySelector('#history-search');
    this.filterSelect = viewer.querySelector('#history-command-filter');
    this.resultListElement = viewer.querySelector('#history-list');

    // 插入到 DOM
    this.insertToDOM(viewer);
  }

  /**
   * 插入到 DOM
   */
  private insertToDOM(viewer: HTMLElement): void {
    const opencliPanel = document.querySelector('.opencli-panel');
    if (opencliPanel) {
      opencliPanel.appendChild(viewer);
    }
  }

  /**
   * 附加事件监听器
   */
  private attachEventListeners(): void {
    if (!this.container) return;

    // 搜索
    this.container.querySelector('#history-search')?.addEventListener('input', (e) => {
      this.currentFilter.command = (e.target as HTMLInputElement).value || undefined;
      this.currentPage = 1;
      this.loadHistory();
    });

    // 命令过滤
    this.container.querySelector('#history-command-filter')?.addEventListener('change', (e) => {
      const value = (e.target as HTMLSelectElement).value;
      this.currentFilter.command = value || undefined;
      this.currentPage = 1;
      this.loadHistory();
    });

    // 结果过滤
    this.container.querySelector('#history-result-filter')?.addEventListener('change', (e) => {
      const value = (e.target as HTMLSelectElement).value;
      if (value) {
        this.currentFilter.success = value === 'success';
      } else {
        delete this.currentFilter.success;
      }
      this.currentPage = 1;
      this.loadHistory();
    });

    // 时间过滤
    this.container.querySelector('#history-time-filter')?.addEventListener('change', (e) => {
      const value = (e.target as HTMLSelectElement).value;
      this.applyTimeFilter(value);
      this.currentPage = 1;
      this.loadHistory();
    });

    // 导出
    this.container.querySelector('#history-export-btn')?.addEventListener('click', () => {
      this.handleExport();
    });

    // 刷新
    this.container.querySelector('#history-refresh-btn')?.addEventListener('click', () => {
      this.loadHistory();
    });

    // 分页
    this.container.querySelector('#history-prev-page')?.addEventListener('click', () => {
      if (this.currentPage > 1) {
        this.currentPage--;
        this.loadHistory();
      }
    });

    this.container.querySelector('#history-next-page')?.addEventListener('click', () => {
      const totalPages = Math.ceil(this.totalRecords / this.pageSize);
      if (this.currentPage < totalPages) {
        this.currentPage++;
        this.loadHistory();
      }
    });
  }

  /**
   * 应用时间过滤
   */
  private applyTimeFilter(value: string): void {
    const now = Date.now();
    
    switch (value) {
      case '1h':
        this.currentFilter.startTime = now - 3600000;
        break;
      case '24h':
        this.currentFilter.startTime = now - 86400000;
        break;
      case '7d':
        this.currentFilter.startTime = now - 604800000;
        break;
      case '30d':
        this.currentFilter.startTime = now - 2592000000;
        break;
      case 'all':
        delete this.currentFilter.startTime;
        delete this.currentFilter.endTime;
        break;
    }
  }

  /**
   * 加载历史记录
   */
  private async loadHistory(): Promise<void> {
    if (!this.resultListElement) return;

    // 显示加载状态
    this.resultListElement.innerHTML = `
      <div class="history-loading">
        <span class="loading-spinner">⏳</span>
        <span>加载中...</span>
      </div>
    `;

    try {
      // 应用分页
      this.currentFilter.limit = this.pageSize;
      this.currentFilter.offset = (this.currentPage - 1) * this.pageSize;

      const history = openCLIHistory.query(this.currentFilter);
      const stats = openCLIHistory.getStats();
      
      this.totalRecords = history.length;

      // 更新摘要
      this.updateSummary(history.length, stats);

      // 渲染列表
      if (history.length === 0) {
        this.renderEmpty();
      } else {
        this.renderList(history);
      }

      // 更新分页
      this.updatePagination();
    } catch (error) {
      this.renderError(error instanceof Error ? error.message : '加载失败');
    }
  }

  /**
   * 更新摘要
   */
  private updateSummary(count: number, stats: any): void {
    const summaryText = document.getElementById('history-summary-text');
    const statsEl = document.getElementById('history-stats');

    if (summaryText) {
      summaryText.textContent = `共 ${count} 条记录`;
    }

    if (statsEl) {
      const successRate = stats.successRate?.toFixed(1) || 0;
      const avgDuration = stats.averageDuration?.toFixed(0) || 0;
      statsEl.textContent = `成功率 ${successRate}% | 平均 ${avgDuration}ms`;
    }
  }

  /**
   * 渲染列表
   */
  private renderList(history: HistoryEntry[]): void {
    if (!this.resultListElement) return;

    this.resultListElement.innerHTML = history.map((entry, index) => {
      const statusClass = entry.result.success ? 'status-success' : 'status-failed';
      const statusIcon = entry.result.success ? '✅' : '❌';
      const time = new Date(entry.timestamp).toLocaleString('zh-CN');
      
      return `
        <div class="history-item ${statusClass}">
          <div class="history-item-header">
            <div class="history-item-index">#${this.currentPage * this.pageSize - this.pageSize + index + 1}</div>
            <div class="history-item-status">${statusIcon}</div>
            <div class="history-item-time">${time}</div>
          </div>
          <div class="history-item-content">
            <div class="history-item-command">
              <span class="command-name">${entry.command}</span>
              <span class="command-args">${this.formatArgs(entry.args)}</span>
            </div>
            ${entry.url ? `
              <div class="history-item-url">
                <span class="icon">🌐</span>
                <span>${this.truncate(entry.url, 80)}</span>
              </div>
            ` : ''}
            <div class="history-item-duration">
              <span>⏱️</span>
              <span>${entry.duration}ms</span>
            </div>
          </div>
          ${entry.result.error || entry.result.message ? `
            <div class="history-item-error">
              <span class="error-icon">⚠️</span>
              <span class="error-message">${entry.result.error || entry.result.message}</span>
            </div>
          ` : ''}
          <div class="history-item-actions">
            <button class="btn-link" data-action="view-detail" data-index="${index}">查看详情</button>
            <button class="btn-link" data-action="replay" data-index="${index}">重放</button>
          </div>
        </div>
      `;
    }).join('');

    // 附加详情查看事件
    this.resultListElement.querySelectorAll('[data-action="view-detail"]').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const index = parseInt((e.target as HTMLElement).dataset.index || '0');
        this.viewDetail(history[index]);
      });
    });

    // 附加重放事件
    this.resultListElement.querySelectorAll('[data-action="replay"]').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const index = parseInt((e.target as HTMLElement).dataset.index || '0');
        this.replayCommand(history[index]);
      });
    });
  }

  /**
   * 渲染空状态
   */
  private renderEmpty(): void {
    if (!this.resultListElement) return;

    this.resultListElement.innerHTML = `
      <div class="history-empty">
        <span class="icon">📭</span>
        <span>暂无历史记录</span>
        <p>执行命令后，历史记录将显示在这里</p>
      </div>
    `;
  }

  /**
   * 渲染错误
   */
  private renderError(message: string): void {
    if (!this.resultListElement) return;

    this.resultListElement.innerHTML = `
      <div class="history-error">
        <span class="icon">❌</span>
        <span>${message}</span>
      </div>
    `;
  }

  /**
   * 更新分页
   */
  private updatePagination(): void {
    const totalPages = Math.ceil(this.totalRecords / this.pageSize);
    
    const prevBtn = document.getElementById('history-prev-page');
    const nextBtn = document.getElementById('history-next-page');
    const pageInfo = document.getElementById('history-page-info');

    if (prevBtn) {
      (prevBtn as HTMLButtonElement).disabled = this.currentPage <= 1;
    }

    if (nextBtn) {
      (nextBtn as HTMLButtonElement).disabled = this.currentPage >= totalPages;
    }

    if (pageInfo) {
      pageInfo.textContent = `第 ${this.currentPage}/${totalPages || 1} 页`;
    }
  }

  /**
   * 查看详情
   */
  private viewDetail(entry: HistoryEntry): void {
    const detail = `
命令：${entry.command}
参数：${JSON.stringify(entry.args, null, 2)}
结果：${entry.result.success ? '成功' : '失败'}
${entry.result.data ? '数据：' + JSON.stringify(entry.result.data, null, 2) : ''}
${entry.result.error ? '错误：' + entry.result.error : ''}
耗时：${entry.duration}ms
时间：${new Date(entry.timestamp).toLocaleString('zh-CN')}
${entry.url ? 'URL: ' + entry.url : ''}
${entry.pageTitle ? '标题：' + entry.pageTitle : ''}
`.trim();

    alert(detail);
  }

  /**
   * 重放命令
   */
  private async replayCommand(entry: HistoryEntry): Promise<void> {
    try {
      const response = await chrome.runtime.sendMessage({
        type: 'EXECUTE_OPENCLI_COMMAND',
        action: entry.command,
        selector: entry.args.selector,
        value: entry.args.value,
      });

      if (response.success) {
        this.showToast('命令重放成功', 'success');
      } else {
        this.showToast('命令重放失败：' + response.error, 'error');
      }
    } catch (error) {
      this.showToast('命令重放失败：' + (error instanceof Error ? error.message : '未知错误'), 'error');
    }
  }

  /**
   * 处理导出
   */
  private handleExport(): void {
    try {
      const data = openCLIHistory.export('csv');
      const blob = new Blob([data], { type: 'text/csv' });
      const url = URL.createObjectURL(blob);
      
      const a = document.createElement('a');
      a.href = url;
      a.download = `opencli-history-${Date.now()}.csv`;
      a.click();
      
      URL.revokeObjectURL(url);
      
      this.showToast('导出成功', 'success');
    } catch (error) {
      this.showToast('导出失败：' + (error instanceof Error ? error.message : '未知错误'), 'error');
    }
  }

  /**
   * 格式化参数
   */
  private formatArgs(args: Record<string, any>): string {
    try {
      const str = JSON.stringify(args);
      return this.truncate(str, 60);
    } catch {
      return '{}';
    }
  }

  /**
   * 截断文本
   */
  private truncate(text: string, length: number): string {
    if (text.length <= length) return text;
    return text.substring(0, length) + '...';
  }

  /**
   * 显示提示
   */
  private showToast(message: string, type: 'info' | 'success' | 'error' = 'info'): void {
    console.log(`[${type.toUpperCase()}] ${message}`);
  }

  /**
   * 销毁查看器
   */
  public destroy(): void {
    if (this.container) {
      this.container.remove();
    }
    this.container = null;
    this.searchInput = null;
    this.filterSelect = null;
    this.resultListElement = null;
  }
}

// 导出单例实例
export const historyViewer = new HistoryViewer();
