# OpenCLI 与扩展程序集成增强方案

## 🎯 集成目标

实现 OpenCLI CLI 工具与扩展程序的深度集成，提供无缝的浏览器自动化体验。

---

## 📋 当前状态

### ✅ 已实现功能

1. **基础命令执行**
   - ✅ 页面内容提取
   - ✅ 链接提取
   - ✅ 登录状态提取
   - ✅ JavaScript 执行

2. **UI 界面**
   - ✅ OpenCLI 操作面板
   - ✅ 状态指示器
   - ✅ 结果显示区域
   - ✅ 快速命令

3. **消息传递**
   - ✅ Side Panel → Background
   - ✅ Background → Content Script
   - ✅ 完整的响应处理

### ⚠️ 当前限制

1. **OpenCLI CLI 未完全集成**
   - ❌ 无法直接调用 OpenCLI CLI 命令
   - ❌ 缺少 CLI 命令队列管理
   - ❌ 无 CLI 会话复用

2. **功能不完整**
   - ❌ 不支持截图 (需要 CLI)
   - ❌ 不支持复杂交互 (需要 CLI)
   - ❌ 不支持文件下载 (需要 CLI)

3. **性能问题**
   - ❌ 每次操作都创建新连接
   - ❌ 无命令缓存
   - ❌ 无批量操作支持

---

## 🚀 增强方案

### 方案 1: 深度集成 OpenCLI CLI

#### 架构设计

```
┌─────────────────┐
│   Side Panel    │
│   (UI Layer)    │
└────────┬────────┘
         │ sendMessage
         ↓
┌─────────────────┐
│   Background    │
│  (Message Hub)  │
└────────┬────────┘
         │
    ┌────┴────┐
    │         │
    ↓         ↓
┌─────────┐ ┌──────────┐
│ Content │ │ OpenCLI  │
│ Script  │ │  Bridge  │
└─────────┘ └────┬─────┘
                 │
                 ↓
         ┌───────────────┐
         │ OpenCLI CLI   │
         │ (Node.js API) │
         └───────────────┘
```

#### 实现步骤

##### 步骤 1: 创建 OpenCLI Bridge 模块

**文件**: `packages/extension/src/services/opencli-bridge.ts`

```typescript
import { spawn } from 'child_process';

export class OpenCLIBridge {
  private static instance: OpenCLIBridge;
  private daemonPort: number = 19825;
  private daemonUrl: string = 'http://localhost:19825';
  private isConnected: boolean = false;

  private constructor() {}

  public static getInstance(): OpenCLIBridge {
    if (!OpenCLIBridge.instance) {
      OpenCLIBridge.instance = new OpenCLIBridge();
    }
    return OpenCLIBridge.instance;
  }

  /**
   * 检查 OpenCLI daemon 是否运行
   */
  public async checkDaemonStatus(): Promise<boolean> {
    try {
      const response = await fetch(this.daemonUrl);
      // 即使返回 403，也说明 daemon 在运行
      this.isConnected = true;
      return true;
    } catch {
      this.isConnected = false;
      return false;
    }
  }

  /**
   * 执行 OpenCLI 命令
   */
  public async execute(command: string, args: any[]): Promise<any> {
    if (!this.isConnected) {
      const isRunning = await this.checkDaemonStatus();
      if (!isRunning) {
        throw new Error('OpenCLI daemon 未运行，请先启动 daemon');
      }
    }

    const url = `${this.daemonUrl}/${command}`;
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ args }),
    });

    if (!response.ok) {
      throw new Error(`OpenCLI 命令执行失败：${response.statusText}`);
    }

    return await response.json();
  }

  /**
   * 打开网页
   */
  public async open(url: string): Promise<void> {
    await this.execute('open', [url]);
  }

  /**
   * 点击元素
   */
  public async click(selector: string): Promise<void> {
    await this.execute('click', [selector]);
  }

  /**
   * 输入文本
   */
  public async type(selector: string, text: string): Promise<void> {
    await this.execute('type', [selector, text]);
  }

  /**
   * 获取元素内容
   */
  public async get(selector: string): Promise<string> {
    const result = await this.execute('get', [selector]);
    return result.output;
  }

  /**
   * 截图
   */
  public async screenshot(outputPath?: string): Promise<string> {
    const result = await this.execute('screenshot', [outputPath].filter(Boolean));
    return result.output;
  }

  /**
   * 滚动页面
   */
  public async scroll(direction: string, amount?: number): Promise<void> {
    const args = [direction];
    if (amount !== undefined) {
      args.push(amount.toString());
    }
    await this.execute('scroll', args);
  }

  /**
   * 等待
   */
  public async wait(condition: string, timeout?: number): Promise<void> {
    const args = [condition];
    if (timeout !== undefined) {
      args.push(timeout.toString());
    }
    await this.execute('wait', args);
  }

  /**
   * 执行 JavaScript
   */
  public async eval(script: string): Promise<any> {
    const result = await this.execute('eval', [script]);
    return result.output;
  }

  /**
   * 获取当前状态
   */
  public async getStatus(): Promise<{
    connected: boolean;
    url?: string;
    title?: string;
  }> {
    try {
      const result = await this.execute('status', []);
      return {
        connected: this.isConnected,
        url: result.url,
        title: result.title,
      };
    } catch {
      return { connected: false };
    }
  }
}

export const opencliBridge = OpenCLIBridge.getInstance();
```

##### 步骤 2: 更新 Background Script

**文件**: `packages/extension/src/background/index.ts`

添加 Bridge 调用:

```typescript
import { opencliBridge } from '../services/opencli-bridge';

async function handleExecuteOpenCLICommand(
  action: string,
  selector: string,
  value: string,
  tabId: number | undefined,
  sendResponse: (response: { success: boolean; result?: any; error?: string }) => void
): Promise<void> {
  try {
    // 优先使用 OpenCLI Bridge
    if (await opencliBridge.checkDaemonStatus()) {
      let result: any;

      switch (action) {
        case 'open':
          await opencliBridge.open(selector);
          result = { success: true, message: '已打开网页' };
          break;

        case 'click':
          await opencliBridge.click(selector);
          result = { success: true, message: '点击成功' };
          break;

        case 'type':
          await opencliBridge.type(selector, value);
          result = { success: true, message: '输入成功' };
          break;

        case 'get':
          const content = await opencliBridge.get(selector);
          result = { success: true, result: content };
          break;

        case 'screenshot':
          const screenshotPath = await opencliBridge.screenshot(value || undefined);
          result = { success: true, result: screenshotPath };
          break;

        case 'scroll':
          const [direction, amount] = value.split(',').map(s => s.trim());
          await opencliBridge.scroll(direction, amount ? parseInt(amount) : undefined);
          result = { success: true, message: '滚动成功' };
          break;

        case 'eval':
          const evalResult = await opencliBridge.eval(selector || value);
          result = { success: true, result: evalResult };
          break;

        case 'wait':
          const [condition, timeout] = value.split(',').map(s => s.trim());
          await opencliBridge.wait(condition, timeout ? parseInt(timeout) : undefined);
          result = { success: true, message: '等待完成' };
          break;

        default:
          // 回退到 Content Script 方式
          result = await executeViaContentScript(action, selector, value, tabId);
      }

      sendResponse(result);
      return;
    }

    // OpenCLI 不可用时，回退到 Content Script
    sendResponse({
      success: false,
      error: 'OpenCLI 未连接，请确保 daemon 正在运行',
    });
  } catch (error) {
    logger.error('OpenCLI Bridge 执行失败:', error);
    sendResponse({
      success: false,
      error: error instanceof Error ? error.message : '命令执行失败',
    });
  }
}
```

##### 步骤 3: 添加 CLI 命令队列

**文件**: `packages/extension/src/services/opencli-queue.ts`

```typescript
interface QueuedCommand {
  id: string;
  command: string;
  args: any[];
  timestamp: number;
  status: 'pending' | 'running' | 'completed' | 'failed';
  result?: any;
  error?: string;
}

export class OpenCLIQueue {
  private static instance: OpenCLIQueue;
  private queue: QueuedCommand[] = [];
  private isProcessing: boolean = false;
  private maxRetries: number = 3;

  private constructor() {}

  public static getInstance(): OpenCLIQueue {
    if (!OpenCLIQueue.instance) {
      OpenCLIQueue.instance = new OpenCLIQueue();
    }
    return OpenCLIQueue.instance;
  }

  /**
   * 添加命令到队列
   */
  public async enqueue(command: string, args: any[]): Promise<string> {
    const id = this.generateId();
    this.queue.push({
      id,
      command,
      args,
      timestamp: Date.now(),
      status: 'pending',
    });

    // 如果队列未在运行，开始处理
    if (!this.isProcessing) {
      this.processQueue();
    }

    return id;
  }

  /**
   * 处理队列
   */
  private async processQueue(): Promise<void> {
    if (this.queue.length === 0) {
      this.isProcessing = false;
      return;
    }

    this.isProcessing = true;

    while (this.queue.length > 0) {
      const job = this.queue[0];
      job.status = 'running';

      try {
        const { opencliBridge } = await import('./opencli-bridge');
        const result = await opencliBridge.execute(job.command, job.args);
        job.result = result;
        job.status = 'completed';
      } catch (error) {
        job.error = error instanceof Error ? error.message : '未知错误';
        job.status = 'failed';
      }

      // 移除已处理的命令
      this.queue.shift();
    }

    this.isProcessing = false;
  }

  /**
   * 获取队列状态
   */
  public getQueueStatus(): {
    pending: number;
    running: number;
    completed: number;
    failed: number;
  } {
    return {
      pending: this.queue.filter(j => j.status === 'pending').length,
      running: this.queue.filter(j => j.status === 'running').length,
      completed: this.queue.filter(j => j.status === 'completed').length,
      failed: this.queue.filter(j => j.status === 'failed').length,
    };
  }

  /**
   * 清空队列
   */
  public clear(): void {
    this.queue = [];
    this.isProcessing = false;
  }

  private generateId(): string {
    return `cmd_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}

export const opencliQueue = OpenCLIQueue.getInstance();
```

### 方案 2: 增强 UI 功能

#### 1. 添加命令历史

**文件**: `packages/extension/src/side-panel/index.ts`

```typescript
class SidePanel {
  private commandHistory: Array<{
    action: string;
    selector: string;
    value: string;
    timestamp: number;
    result: any;
  }> = [];

  private addToHistory(action: string, selector: string, value: string, result: any): void {
    this.commandHistory.push({
      action,
      selector,
      value,
      timestamp: Date.now(),
      result,
    });

    // 保留最近 50 条记录
    if (this.commandHistory.length > 50) {
      this.commandHistory.shift();
    }

    this.saveHistory();
  }

  private saveHistory(): void {
    localStorage.setItem('opencli_history', JSON.stringify(this.commandHistory));
  }

  private loadHistory(): void {
    const saved = localStorage.getItem('opencli_history');
    if (saved) {
      this.commandHistory = JSON.parse(saved);
    }
  }

  private showHistory(): void {
    // 显示历史记录 UI
    const historyDiv = document.createElement('div');
    historyDiv.className = 'opencli-history';
    historyDiv.innerHTML = `
      <h3>📜 历史记录</h3>
      <ul>
        ${this.commandHistory.map(cmd => `
          <li>
            <span class="action">${cmd.action}</span>
            <span class="selector">${cmd.selector}</span>
            <span class="time">${new Date(cmd.timestamp).toLocaleTimeString()}</span>
            <button class="replay-btn" data-cmd='${JSON.stringify(cmd)}'>↻ 重放</button>
          </li>
        `).join('')}
      </ul>
    `;
    // 添加到 UI
  }
}
```

#### 2. 添加批量操作

```typescript
interface BatchOperation {
  name: string;
  operations: Array<{
    action: string;
    selector: string;
    value: string;
    delay?: number;
  }>;
}

async function executeBatch(operations: BatchOperation): Promise<void> {
  for (const op of operations.operations) {
    await this.executeOpenCLICommand(op.action, op.selector, op.value);
    
    if (op.delay) {
      await new Promise(resolve => setTimeout(resolve, op.delay));
    }
  }
}
```

#### 3. 添加脚本录制

```typescript
class OpenCLIRecorder {
  private isRecording: boolean = false;
  private recordedCommands: Array<{
    action: string;
    selector: string;
    value: string;
    timestamp: number;
  }> = [];

  public startRecording(): void {
    this.isRecording = true;
    this.recordedCommands = [];
  }

  public stopRecording(): string {
    this.isRecording = false;
    return JSON.stringify(this.recordedCommands, null, 2);
  }

  public recordCommand(action: string, selector: string, value: string): void {
    if (this.isRecording) {
      this.recordedCommands.push({
        action,
        selector,
        value,
        timestamp: Date.now(),
      });
    }
  }

  public async playback(script: string): Promise<void> {
    const commands = JSON.parse(script);
    for (const cmd of commands) {
      await this.executeOpenCLICommand(cmd.action, cmd.selector, cmd.value);
    }
  }
}
```

### 方案 3: 性能优化

#### 1. 连接池

```typescript
class OpenCLIConnectionPool {
  private static instance: OpenCLIConnectionPool;
  private connections: Map<string, any> = new Map();
  private maxConnections: number = 5;

  private constructor() {}

  public static getInstance(): OpenCLIConnectionPool {
    if (!OpenCLIConnectionPool.instance) {
      OpenCLIConnectionPool.instance = new OpenCLIConnectionPool();
    }
    return OpenCLIConnectionPool.instance;
  }

  public getConnection(tabId: number): any {
    if (!this.connections.has(tabId.toString()) && this.connections.size < this.maxConnections) {
      // 创建新连接
      const connection = this.createConnection(tabId);
      this.connections.set(tabId.toString(), connection);
    }
    return this.connections.get(tabId.toString());
  }

  private createConnection(tabId: number): any {
    // 创建与 OpenCLI daemon 的连接
    return {
      tabId,
      lastUsed: Date.now(),
      // ... 连接相关属性
    };
  }

  public releaseConnection(tabId: number): void {
    // 释放连接
    this.connections.delete(tabId.toString());
  }

  public cleanup(): void {
    // 清理空闲连接
    const now = Date.now();
    for (const [tabId, conn] of this.connections.entries()) {
      if (now - conn.lastUsed > 5 * 60 * 1000) { // 5 分钟未使用
        this.connections.delete(tabId);
      }
    }
  }
}
```

#### 2. 命令缓存

```typescript
class OpenCLICache {
  private cache: Map<string, { data: any; timestamp: number }> = new Map();
  private ttl: number = 5 * 60 * 1000; // 5 分钟

  public get(key: string): any | null {
    const item = this.cache.get(key);
    if (!item) return null;

    if (Date.now() - item.timestamp > this.ttl) {
      this.cache.delete(key);
      return null;
    }

    return item.data;
  }

  public set(key: string, data: any): void {
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
    });
  }

  public clear(): void {
    this.cache.clear();
  }
}
```

---

## 📊 实施计划

### 阶段 1: 基础集成 (1-2 周)

- [ ] 实现 OpenCLI Bridge
- [ ] 集成到 Background Script
- [ ] 测试基本命令
- [ ] 错误处理优化

### 阶段 2: 功能增强 (2-3 周)

- [ ] 命令队列实现
- [ ] 历史记录功能
- [ ] 批量操作支持
- [ ] 脚本录制回放

### 阶段 3: 性能优化 (1-2 周)

- [ ] 连接池实现
- [ ] 命令缓存
- [ ] 性能监控
- [ ] 内存管理

### 阶段 4: UI/UX 改进 (持续)

- [ ] 历史管理界面
- [ ] 脚本编辑器
- [ ] 批量操作界面
- [ ] 性能监控面板

---

## 🎯 预期效果

### 功能提升

| 功能 | 当前 | 增强后 | 提升 |
|------|------|--------|------|
| **支持的命令** | 4 个 | 13 个 | ⬆️ 225% |
| **响应速度** | ~500ms | ~100ms | ⬆️ 400% |
| **并发能力** | 无 | 5 个连接 | ⬆️ ∞ |
| **历史记录** | 无 | 50 条 | ⬆️ ∞ |
| **批量操作** | 无 | 支持 | ⬆️ ∞ |

### 用户体验提升

- ✅ **更直观** - 实时状态反馈
- ✅ **更高效** - 批量操作支持
- ✅ **更智能** - 自动重试和错误恢复
- ✅ **更强大** - 完整的 OpenCLI 功能

---

## 📞 相关文档

- [OPENCLI-FIX.md](./OPENCLI-FIX.md) - 网页内容提取修复
- [UX-OPTIMIZATION.md](./UX-OPTIMIZATION.md) - UX 优化报告
- [EXTENSION-GUIDE.md](./EXTENSION-GUIDE.md) - 使用指南

---

**创建日期**: 2026-04-03  
**版本**: 1.0.0  
**状态**: 📋 规划中
