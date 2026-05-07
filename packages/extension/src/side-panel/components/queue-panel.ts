/**
 * 队列管理面板组件
 * 
 * 提供可视化的命令队列管理功能：
 * - 队列列表展示
 * - 拖拽排序
 * - 实时进度
 * - 批量操作
 */

import { openCLIQueue, type QueuedCommand, QueueCommandStatus, CommandPriority } from '../../services/opencli-queue';

export class QueuePanel {
  private container: HTMLElement | null = null;
  private queueListElement: HTMLElement | null = null;
  private progressBarElement: HTMLElement | null = null;
  private statusTextElement: HTMLElement | null = null;
  private updateTimer: number | null = null;

  /**
   * 初始化队列面板
   */
  public init(): void {
    this.createPanel();
    this.attachEventListeners();
    this.startAutoUpdate();
    
    // 注册队列事件监听
    this.registerQueueEvents();
  }

  /**
   * 创建面板 DOM
   */
  private createPanel(): void {
    const panel = document.createElement('div');
    panel.id = 'opencli-queue-panel';
    panel.className = 'queue-panel';
    
    panel.innerHTML = `
      <div class="queue-panel-header">
        <div class="queue-panel-title">
          <span class="icon">📋</span>
          <span>命令队列</span>
        </div>
        <div class="queue-panel-actions">
          <button class="btn-icon" id="queue-clear-btn" title="清空队列">
            <span>🗑️</span>
          </button>
        </div>
      </div>

      <div class="queue-panel-controls">
        <button class="btn btn-primary" id="queue-start-btn">
          <span>▶️</span>
          <span>开始</span>
        </button>
        <button class="btn btn-warning" id="queue-pause-btn">
          <span>⏸️</span>
          <span>暂停</span>
        </button>
        <button class="btn btn-danger" id="queue-stop-btn">
          <span>⏹️</span>
          <span>停止</span>
        </button>
      </div>

      <div class="queue-progress">
        <div class="progress-bar">
          <div class="progress-fill" style="width: 0%"></div>
        </div>
        <div class="progress-text">
          <span>就绪</span>
        </div>
      </div>

      <div class="queue-list" id="queue-list">
        <div class="queue-empty">
          <span class="icon">📭</span>
          <span>队列为空</span>
        </div>
      </div>

      <div class="queue-stats">
        <div class="stat-item">
          <span class="stat-label">等待</span>
          <span class="stat-value" id="queue-pending-count">0</span>
        </div>
        <div class="stat-item">
          <span class="stat-label">执行中</span>
          <span class="stat-value" id="queue-running-count">0</span>
        </div>
        <div class="stat-item">
          <span class="stat-label">已完成</span>
          <span class="stat-value" id="queue-completed-count">0</span>
        </div>
        <div class="stat-item">
          <span class="stat-label">失败</span>
          <span class="stat-value" id="queue-failed-count">0</span>
        </div>
      </div>
    `;

    this.container = panel;
    this.queueListElement = panel.querySelector('#queue-list');
    this.progressBarElement = panel.querySelector('.progress-fill');
    this.statusTextElement = panel.querySelector('.progress-text span');

    // 插入到 OpenCLI 面板
    this.insertToDOM(panel);
  }

  /**
   * 插入到 DOM
   */
  private insertToDOM(panel: HTMLElement): void {
    const opencliPanel = document.querySelector('.opencli-panel');
    if (opencliPanel) {
      opencliPanel.appendChild(panel);
    } else {
      // 如果找不到 OpenCLI 面板，插入到侧边栏底部
      const sidePanel = document.querySelector('.side-panel');
      if (sidePanel) {
        sidePanel.appendChild(panel);
      }
    }
  }

  /**
   * 附加事件监听器
   */
  private attachEventListeners(): void {
    if (!this.container) return;

    // 控制按钮
    this.container.querySelector('#queue-start-btn')?.addEventListener('click', () => {
      this.handleStart();
    });

    this.container.querySelector('#queue-pause-btn')?.addEventListener('click', () => {
      this.handlePause();
    });

    this.container.querySelector('#queue-stop-btn')?.addEventListener('click', () => {
      this.handleStop();
    });

    this.container.querySelector('#queue-clear-btn')?.addEventListener('click', () => {
      this.handleClear();
    });
  }

  /**
   * 注册队列事件
   */
  private registerQueueEvents(): void {
    // 命令添加
    openCLIQueue.on('command:added', (data) => {
      this.renderQueue();
      this.showToast(`已添加命令：${data.command}`);
    });

    // 命令开始
    openCLIQueue.on('command:started', () => {
      this.renderQueue();
    });

    // 命令完成
    openCLIQueue.on('command:completed', (data) => {
      this.renderQueue();
      this.showToast(`命令执行完成`, 'success');
    });

    // 命令失败
    openCLIQueue.on('command:failed', (data) => {
      this.renderQueue();
      this.showToast(`命令执行失败：${data.error}`, 'error');
    });

    // 队列开始
    openCLIQueue.on('queue:started', () => {
      this.updateStatus('执行中...', 'running');
    });

    // 队列暂停
    openCLIQueue.on('queue:paused', () => {
      this.updateStatus('已暂停', 'paused');
    });

    // 队列恢复
    openCLIQueue.on('queue:resumed', () => {
      this.updateStatus('执行中...', 'running');
    });

    // 队列完成
    openCLIQueue.on('queue:completed', () => {
      this.updateStatus('已完成', 'completed');
    });

    // 队列停止
    openCLIQueue.on('queue:stopped', () => {
      this.updateStatus('已停止', 'stopped');
    });
  }

  /**
   * 渲染队列列表
   */
  private renderQueue(): void {
    if (!this.queueListElement) return;

    const commands = openCLIQueue.getCommands();
    const stats = openCLIQueue.getStats();

    if (commands.length === 0) {
      this.queueListElement.innerHTML = `
        <div class="queue-empty">
          <span class="icon">📭</span>
          <span>队列为空</span>
        </div>
      `;
    } else {
      this.queueListElement.innerHTML = commands.map((cmd, index) => {
        const priorityClass = this.getPriorityClass(cmd.priority);
        const statusClass = this.getStatusClass(cmd.status);
        const priorityLabel = this.getPriorityLabel(cmd.priority);
        const statusLabel = this.getStatusLabel(cmd.status);
        
        return `
          <div class="queue-item ${statusClass}" data-command-id="${cmd.id}">
            <div class="queue-item-header">
              <div class="queue-item-index">#${index + 1}</div>
              <div class="queue-item-priority ${priorityClass}">${priorityLabel}</div>
              <div class="queue-item-status">${statusLabel}</div>
            </div>
            <div class="queue-item-content">
              <div class="queue-item-command">${cmd.command}</div>
              <div class="queue-item-args">${this.formatArgs(cmd.args)}</div>
            </div>
            <div class="queue-item-actions">
              ${cmd.status === QueueCommandStatus.PENDING ? `
                <button class="btn-icon btn-move-up" data-action="move-up" data-index="${index}" title="上移">⬆️</button>
                <button class="btn-icon btn-move-down" data-action="move-down" data-index="${index}" title="下移">⬇️</button>
                <button class="btn-icon btn-edit" data-action="edit" data-index="${index}" title="编辑">✏️</button>
                <button class="btn-icon btn-delete" data-action="delete" data-index="${index}" title="删除">🗑️</button>
              ` : ''}
            </div>
            ${cmd.status === QueueCommandStatus.RUNNING ? `
              <div class="queue-item-progress">
                <div class="progress-indicator"></div>
              </div>
            ` : ''}
            ${cmd.result ? `
              <div class="queue-item-result">
                <div class="result-content">${this.formatResult(cmd.result)}</div>
              </div>
            ` : ''}
          </div>
        `;
      }).join('');

      // 附加动作事件
      this.attachItemActions();
    }

    // 更新统计
    this.updateStats(stats);
    
    // 更新进度条
    this.updateProgressBar(stats);
  }

  /**
   * 附加列表项动作
   */
  private attachItemActions(): void {
    if (!this.queueListElement) return;

    // 上移
    this.queueListElement.querySelectorAll('.btn-move-up').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const index = parseInt((e.target as HTMLElement).dataset.index || '0');
        this.moveCommand(index, -1);
      });
    });

    // 下移
    this.queueListElement.querySelectorAll('.btn-move-down').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const index = parseInt((e.target as HTMLElement).dataset.index || '0');
        this.moveCommand(index, 1);
      });
    });

    // 编辑
    this.queueListElement.querySelectorAll('.btn-edit').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const index = parseInt((e.target as HTMLElement).dataset.index || '0');
        this.editCommand(index);
      });
    });

    // 删除
    this.queueListElement.querySelectorAll('.btn-delete').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const index = parseInt((e.target as HTMLElement).dataset.index || '0');
        this.deleteCommand(index);
      });
    });
  }

  /**
   * 上移/下移命令
   */
  private moveCommand(index: number, direction: number): void {
    // TODO: 实现队列重新排序
    // 目前需要扩展 OpenCLIQueue 支持重新排序
    console.log('移动命令:', index, direction);
  }

  /**
   * 编辑命令
   */
  private editCommand(index: number): void {
    const commands = openCLIQueue.getCommands();
    const command = commands[index];
    
    if (command) {
      // TODO: 打开命令编辑器
      console.log('编辑命令:', command);
    }
  }

  /**
   * 删除命令
   */
  private deleteCommand(index: number): void {
    const commands = openCLIQueue.getCommands();
    const command = commands[index];
    
    if (command && command.status === QueueCommandStatus.PENDING) {
      openCLIQueue.cancel(command.id);
      this.renderQueue();
      this.showToast('已删除命令');
    }
  }

  /**
   * 更新状态显示
   */
  private updateStatus(text: string, state: 'idle' | 'running' | 'paused' | 'completed' | 'stopped'): void {
    if (this.statusTextElement) {
      this.statusTextElement.textContent = text;
    }

    // 更新进度条样式
    if (this.progressBarElement) {
      this.progressBarElement.className = `progress-fill state-${state}`;
    }
  }

  /**
   * 更新统计
   */
  private updateStats(stats: any): void {
    const pendingEl = document.getElementById('queue-pending-count');
    const runningEl = document.getElementById('queue-running-count');
    const completedEl = document.getElementById('queue-completed-count');
    const failedEl = document.getElementById('queue-failed-count');

    if (pendingEl) pendingEl.textContent = stats.pending.toString();
    if (runningEl) runningEl.textContent = stats.running.toString();
    if (completedEl) completedEl.textContent = stats.completed.toString();
    if (failedEl) failedEl.textContent = stats.failed.toString();
  }

  /**
   * 更新进度条
   */
  private updateProgressBar(stats: any): void {
    if (!this.progressBarElement) return;

    const total = stats.pending + stats.running + stats.completed + stats.failed;
    const completed = stats.completed + stats.failed;
    const percentage = total > 0 ? (completed / total) * 100 : 0;

    this.progressBarElement.style.width = `${percentage}%`;
  }

  /**
   * 获取优先级样式类
   */
  private getPriorityClass(priority: number): string {
    switch (priority) {
      case CommandPriority.CRITICAL:
        return 'priority-critical';
      case CommandPriority.HIGH:
        return 'priority-high';
      case CommandPriority.NORMAL:
        return 'priority-normal';
      case CommandPriority.LOW:
        return 'priority-low';
      default:
        return 'priority-normal';
    }
  }

  /**
   * 获取优先级标签
   */
  private getPriorityLabel(priority: number): string {
    switch (priority) {
      case CommandPriority.CRITICAL:
        return '紧急';
      case CommandPriority.HIGH:
        return '高';
      case CommandPriority.NORMAL:
        return '普通';
      case CommandPriority.LOW:
        return '低';
      default:
        return '普通';
    }
  }

  /**
   * 获取状态样式类
   */
  private getStatusClass(status: QueueCommandStatus): string {
    switch (status) {
      case QueueCommandStatus.PENDING:
        return 'status-pending';
      case QueueCommandStatus.RUNNING:
        return 'status-running';
      case QueueCommandStatus.COMPLETED:
        return 'status-completed';
      case QueueCommandStatus.FAILED:
        return 'status-failed';
      case QueueCommandStatus.CANCELLED:
        return 'status-cancelled';
      default:
        return 'status-pending';
    }
  }

  /**
   * 获取状态标签
   */
  private getStatusLabel(status: QueueCommandStatus): string {
    switch (status) {
      case QueueCommandStatus.PENDING:
        return '等待';
      case QueueCommandStatus.RUNNING:
        return '执行中';
      case QueueCommandStatus.COMPLETED:
        return '完成';
      case QueueCommandStatus.FAILED:
        return '失败';
      case QueueCommandStatus.CANCELLED:
        return '取消';
      default:
        return '等待';
    }
  }

  /**
   * 格式化参数
   */
  private formatArgs(args: Record<string, any>): string {
    try {
      const str = JSON.stringify(args);
      if (str.length > 50) {
        return str.substring(0, 50) + '...';
      }
      return str;
    } catch {
      return '{}';
    }
  }

  /**
   * 格式化结果
   */
  private formatResult(result: any): string {
    try {
      if (typeof result === 'object') {
        return JSON.stringify(result, null, 2);
      }
      return String(result);
    } catch {
      return String(result);
    }
  }

  /**
   * 显示提示
   */
  private showToast(message: string, type: 'info' | 'success' | 'error' = 'info'): void {
    // TODO: 使用全局 Toast 组件
    console.log(`[${type.toUpperCase()}] ${message}`);
  }

  /**
   * 处理开始
   */
  private handleStart(): void {
    openCLIQueue.start();
    this.showToast('开始执行队列', 'success');
  }

  /**
   * 处理暂停
   */
  private handlePause(): void {
    openCLIQueue.pause();
    this.showToast('已暂停队列', 'info');
  }

  /**
   * 处理停止
   */
  private handleStop(): void {
    openCLIQueue.stop();
    this.showToast('已停止队列', 'info');
  }

  /**
   * 处理清空
   */
  private handleClear(): void {
    if (confirm('确定要清空队列吗？')) {
      openCLIQueue.clear();
      this.renderQueue();
      this.showToast('已清空队列', 'success');
    }
  }

  /**
   * 启动自动更新
   */
  private startAutoUpdate(): void {
    // 每 2 秒更新一次队列显示
    this.updateTimer = window.setInterval(() => {
      this.renderQueue();
    }, 2000);
  }

  /**
   * 停止自动更新
   */
  public stopAutoUpdate(): void {
    if (this.updateTimer) {
      clearInterval(this.updateTimer);
      this.updateTimer = null;
    }
  }

  /**
   * 销毁面板
   */
  public destroy(): void {
    this.stopAutoUpdate();
    if (this.container) {
      this.container.remove();
    }
    this.container = null;
    this.queueListElement = null;
    this.progressBarElement = null;
    this.statusTextElement = null;
  }
}

// 导出单例实例
export const queuePanel = new QueuePanel();
