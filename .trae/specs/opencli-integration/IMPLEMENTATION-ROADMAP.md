# OpenCLI 集成增强 - 实施路线图

## 🎯 项目概述

本路线图指导您逐步实现 OpenCLI CLI 与扩展程序的深度集成。

---

## 📅 阶段 1: 基础集成 (1-2 周)

### 第 1 天：环境准备

#### 任务清单
- [ ] 确认 OpenCLI CLI 已安装 (`opencli --version`)
- [ ] 确认 daemon 可正常启动 (`opencli daemon start`)
- [ ] 检查扩展程序开发环境
- [ ] 创建 Git 分支 `feature/opencli-integration`

#### 验证命令
```bash
# 检查 OpenCLI
opencli --version  # 应显示 1.6.1

# 测试 daemon
opencli daemon start

# 检查端口
Test-NetConnection -ComputerName localhost -Port 19825
```

---

### 第 2-3 天：实现 OpenCLI Bridge

#### 步骤 1: 创建 Bridge 模块

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

#### 步骤 2: 添加类型定义

**文件**: `packages/extension/src/types/opencli.ts`

```typescript
export interface OpenCLIResult {
  success: boolean;
  output?: string;
  error?: string;
  duration?: number;
}

export interface OpenCLIStatus {
  connected: boolean;
  url?: string;
  title?: string;
}

export interface OpenCLICommand {
  name: string;
  args: any[];
  timeout?: number;
}
```

#### 验证
- [ ] TypeScript 编译通过
- [ ] 无类型错误
- [ ] ESLint 检查通过

---

### 第 4-5 天：集成到 Background

#### 步骤 1: 更新 Background Script

**文件**: `packages/extension/src/background/index.ts`

在文件顶部添加导入:
```typescript
import { opencliBridge } from '../services/opencli-bridge';
```

更新消息处理:
```typescript
case 'EXECUTE_OPENCLI_COMMAND':
  // 优先使用 OpenCLI Bridge
  if (await opencliBridge.checkDaemonStatus()) {
    handleExecuteWithBridge(request, sendResponse);
  } else {
    // 回退到 Content Script 方式
    handleExecuteViaContentScript(request, sendResponse);
  }
  return true;
```

#### 步骤 2: 实现 Bridge 处理器

```typescript
async function handleExecuteWithBridge(
  request: any,
  sendResponse: (response: any) => void
): Promise<void> {
  try {
    const { action, selector, value } = request;
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
        // 未知命令，回退到 Content Script
        return handleExecuteViaContentScript(request, sendResponse);
    }

    sendResponse(result);
  } catch (error) {
    logger.error('OpenCLI Bridge 执行失败:', error);
    sendResponse({
      success: false,
      error: error instanceof Error ? error.message : '命令执行失败',
    });
  }
}
```

#### 验证
- [ ] 编译成功
- [ ] 启动扩展程序
- [ ] 测试基本命令

---

### 第 6-7 天：测试与调试

#### 测试用例

**测试 1: 检查 Daemon 状态**
```typescript
const status = await opencliBridge.checkDaemonStatus();
console.log('Daemon status:', status); // true/false
```

**测试 2: 打开网页**
```typescript
await opencliBridge.open('https://www.example.com');
const status = await opencliBridge.getStatus();
console.log('Current URL:', status.url);
```

**测试 3: 获取内容**
```typescript
const title = await opencliBridge.get('title');
console.log('Page title:', title);
```

**测试 4: 执行 JS**
```typescript
const result = await opencliBridge.eval('document.title');
console.log('JS result:', result);
```

#### 调试技巧

1. **启用详细日志**
```typescript
// 在 background/index.ts 中
logger.setLevel('debug');
```

2. **检查 Bridge 连接**
```typescript
const status = await opencliBridge.getStatus();
console.log('Connection status:', status);
```

3. **监控命令执行**
```typescript
// 在 execute() 方法中添加日志
logger.debug('Executing OpenCLI command:', command, args);
```

---

## 📅 阶段 2: 功能增强 (2-3 周)

### 第 8-10 天：命令队列

#### 实现队列管理

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

  public async enqueue(command: string, args: any[]): Promise<string> {
    const id = this.generateId();
    this.queue.push({
      id,
      command,
      args,
      timestamp: Date.now(),
      status: 'pending',
    });

    if (!this.isProcessing) {
      this.processQueue();
    }

    return id;
  }

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

      this.queue.shift();
    }

    this.isProcessing = false;
  }

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

#### 使用示例

```typescript
// 批量执行命令
const queue = opencliQueue.getInstance();

await queue.enqueue('open', ['https://example.com']);
await queue.enqueue('click', ['#login-btn']);
await queue.enqueue('type', ['#username', 'test']);
await queue.enqueue('type', ['#password', 'secret']);
await queue.enqueue('click', ['button[type="submit"]']);

// 查看队列状态
const status = queue.getQueueStatus();
console.log('Queue status:', status);
```

---

### 第 11-14 天：历史记录功能

#### 实现历史管理

**文件**: `packages/extension/src/side-panel/index.ts`

添加历史管理方法:

```typescript
class SidePanel {
  private commandHistory: Array<{
    id: string;
    action: string;
    selector: string;
    value: string;
    timestamp: number;
    result: any;
    success: boolean;
  }> = [];

  private addToHistory(
    action: string,
    selector: string,
    value: string,
    result: any,
    success: boolean
  ): void {
    const historyItem = {
      id: `hist_${Date.now()}`,
      action,
      selector,
      value,
      timestamp: Date.now(),
      result,
      success,
    };

    this.commandHistory.push(historyItem);

    // 保留最近 50 条
    if (this.commandHistory.length > 50) {
      this.commandHistory.shift();
    }

    this.saveHistory();
    this.updateHistoryUI();
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

  private updateHistoryUI(): void {
    const historyContainer = document.getElementById('opencli-history');
    if (!historyContainer) return;

    if (this.commandHistory.length === 0) {
      historyContainer.innerHTML = '<p class="empty-history">暂无历史记录</p>';
      return;
    }

    historyContainer.innerHTML = `
      <div class="history-list">
        ${this.commandHistory.map(item => `
          <div class="history-item ${item.success ? 'success' : 'error'}">
            <div class="history-header">
              <span class="history-action">${item.action}</span>
              <span class="history-time">${new Date(item.timestamp).toLocaleString()}</span>
            </div>
            <div class="history-details">
              <span class="history-selector">${item.selector || '-'}</span>
              <span class="history-value">${item.value || '-'}</span>
            </div>
            <div class="history-actions">
              <button class="replay-btn" data-item='${JSON.stringify(item)}'>
                ↻ 重放
              </button>
              <button class="copy-btn" data-result='${JSON.stringify(item.result)}'>
                📋 复制
              </button>
            </div>
          </div>
        `).join('')}
      </div>
    `;

    // 绑定事件
    this.bindHistoryEvents();
  }

  private bindHistoryEvents(): void {
    // 重放按钮
    document.querySelectorAll('.replay-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const item = JSON.parse((e.target as HTMLElement).dataset.item!);
        this.replayCommand(item);
      });
    });

    // 复制按钮
    document.querySelectorAll('.copy-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const result = JSON.parse((e.target as HTMLElement).dataset.result!);
        navigator.clipboard.writeText(JSON.stringify(result, null, 2));
        this.showToast('结果已复制', 2000);
      });
    });
  }

  private async replayCommand(item: any): Promise<void> {
    // 填充输入框
    const selectorInput = document.getElementById('opencli-selector') as HTMLInputElement;
    const valueInput = document.getElementById('opencli-value') as HTMLTextAreaElement;

    selectorInput.value = item.selector;
    valueInput.value = item.value;

    // 执行命令
    await this.executeOpenCLICommand();
  }

  public clearHistory(): void {
    this.commandHistory = [];
    localStorage.removeItem('opencli_history');
    this.updateHistoryUI();
    this.showToast('历史记录已清空', 2000);
  }
}
```

#### 添加历史 UI

**文件**: `packages/extension/src/side-panel/index.html`

在 OpenCLI 面板中添加:

```html
<!-- 历史记录区域 -->
<div class="opencli-section">
  <div class="section-title">
    <span>📜</span>
    <span>历史记录</span>
    <button id="clear-history-btn" class="clear-history-btn" title="清空历史">
      🗑️
    </button>
  </div>
  <div id="opencli-history" class="opencli-history">
    <!-- 动态填充 -->
  </div>
</div>
```

---

## 📅 阶段 3: 性能优化 (1-2 周)

### 第 15-17 天：连接池

#### 实现连接池

**文件**: `packages/extension/src/services/opencli-connection-pool.ts`

```typescript
interface Connection {
  id: string;
  tabId: number;
  created: number;
  lastUsed: number;
  requestCount: number;
}

export class OpenCLIConnectionPool {
  private static instance: OpenCLIConnectionPool;
  private connections: Map<string, Connection> = new Map();
  private maxConnections: number = 5;
  private cleanupInterval: number = 5 * 60 * 1000; // 5 分钟

  private constructor() {
    // 定期清理空闲连接
    setInterval(() => this.cleanup(), this.cleanupInterval);
  }

  public static getInstance(): OpenCLIConnectionPool {
    if (!OpenCLIConnectionPool.instance) {
      OpenCLIConnectionPool.instance = new OpenCLIConnectionPool();
    }
    return OpenCLIConnectionPool.instance;
  }

  public getConnection(tabId: number): Connection {
    const key = tabId.toString();
    
    if (this.connections.has(key)) {
      const conn = this.connections.get(key)!;
      conn.lastUsed = Date.now();
      conn.requestCount++;
      return conn;
    }

    // 检查是否超过最大连接数
    if (this.connections.size >= this.maxConnections) {
      this.removeOldestConnection();
    }

    // 创建新连接
    const newConn: Connection = {
      id: `conn_${Date.now()}`,
      tabId,
      created: Date.now(),
      lastUsed: Date.now(),
      requestCount: 1,
    };

    this.connections.set(key, newConn);
    return newConn;
  }

  public releaseConnection(tabId: number): void {
    this.connections.delete(tabId.toString());
  }

  private removeOldestConnection(): void {
    let oldestKey: string | null = null;
    let oldestTime = Infinity;

    for (const [key, conn] of this.connections.entries()) {
      if (conn.lastUsed < oldestTime) {
        oldestTime = conn.lastUsed;
        oldestKey = key;
      }
    }

    if (oldestKey) {
      this.connections.delete(oldestKey);
    }
  }

  private cleanup(): void {
    const now = Date.now();
    for (const [key, conn] of this.connections.entries()) {
      if (now - conn.lastUsed > this.cleanupInterval) {
        this.connections.delete(key);
      }
    }
  }

  public getStats(): {
    totalConnections: number;
    activeConnections: number;
    maxConnections: number;
  } {
    const now = Date.now();
    const activeConnections = Array.from(this.connections.values())
      .filter(conn => now - conn.lastUsed < 60000) // 1 分钟内
      .length;

    return {
      totalConnections: this.connections.size,
      activeConnections,
      maxConnections: this.maxConnections,
    };
  }

  public clear(): void {
    this.connections.clear();
  }
}

export const opencliConnectionPool = OpenCLIConnectionPool.getInstance();
```

---

### 第 18-20 天：命令缓存

#### 实现缓存系统

**文件**: `packages/extension/src/services/opencli-cache.ts`

```typescript
interface CacheItem {
  data: any;
  timestamp: number;
  hits: number;
}

export class OpenCLICache {
  private static instance: OpenCLICache;
  private cache: Map<string, CacheItem> = new Map();
  private defaultTTL: number = 5 * 60 * 1000; // 5 分钟
  private maxItems: number = 100;

  private constructor() {}

  public static getInstance(): OpenCLICache {
    if (!OpenCLICache.instance) {
      OpenCLICache.instance = new OpenCLICache();
    }
    return OpenCLICache.instance;
  }

  public get(key: string): any | null {
    const item = this.cache.get(key);
    if (!item) return null;

    if (Date.now() - item.timestamp > this.defaultTTL) {
      this.cache.delete(key);
      return null;
    }

    item.hits++;
    return item.data;
  }

  public set(key: string, data: any, ttl?: number): void {
    // 检查是否超过最大缓存数
    if (this.cache.size >= this.maxItems) {
      this.removeLeastUsed();
    }

    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      hits: 0,
    });
  }

  public delete(key: string): void {
    this.cache.delete(key);
  }

  public clear(): void {
    this.cache.clear();
  }

  private removeLeastUsed(): void {
    let leastUsedKey: string | null = null;
    let leastHits = Infinity;

    for (const [key, item] of this.cache.entries()) {
      if (item.hits < leastHits) {
        leastHits = item.hits;
        leastUsedKey = key;
      }
    }

    if (leastUsedKey) {
      this.cache.delete(leastUsedKey);
    }
  }

  public getStats(): {
    size: number;
    maxItems: number;
    hits: number;
    misses: number;
  } {
    const hits = Array.from(this.cache.values())
      .reduce((sum, item) => sum + item.hits, 0);

    return {
      size: this.cache.size,
      maxItems: this.maxItems,
      hits,
      misses: 0, // 需要单独跟踪
    };
  }
}

export const opencliCache = OpenCLICache.getInstance();
```

---

## ✅ 验收标准

### 阶段 1 验收
- [ ] OpenCLI Bridge 正常工作
- [ ] 所有基本命令可执行
- [ ] 错误处理完善
- [ ] 编译无错误

### 阶段 2 验收
- [ ] 命令队列正常处理
- [ ] 历史记录功能完整
- [ ] 可重放历史命令
- [ ] UI 显示正确

### 阶段 3 验收
- [ ] 连接池正常工作
- [ ] 缓存系统生效
- [ ] 性能指标提升
- [ ] 内存使用合理

---

## 📊 验收测试

### 性能测试

```typescript
// 测试响应时间
const start = Date.now();
await opencliBridge.get('h1');
const duration = Date.now() - start;
console.log('Response time:', duration, 'ms'); // 应 < 200ms

// 测试并发
const promises = [];
for (let i = 0; i < 5; i++) {
  promises.push(opencliBridge.get(`h${i}`));
}
await Promise.all(promises);
console.log('Concurrent test passed');
```

### 稳定性测试

```typescript
// 连续执行 100 次
for (let i = 0; i < 100; i++) {
  await opencliBridge.get('body');
}
console.log('Stability test passed');
```

---

## 📞 相关资源

- [OPENCLI-FIX.md](./OPENCLI-FIX.md) - 内容提取修复
- [OPENCLI-INTEGRATION-ENHANCEMENT.md](./OPENCLI-INTEGRATION-ENHANCEMENT.md) - 集成方案
- [EXTENSION-GUIDE.md](./EXTENSION-GUIDE.md) - 使用指南

---

**创建日期**: 2026-04-03  
**版本**: 1.0.0  
**状态**: 📋 实施指南
