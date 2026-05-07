# OpenCLI 内容发送到 AI 对话功能

## 🎯 功能说明

将 OpenCLI 从网页提取的内容直接发送到 AI 对话框，实现自动化工作流。

---

## 📋 实现方案

### 方案 1: 一键发送按钮（推荐）

在执行结果面板添加"发送到 AI"按钮。

```typescript
// 修改 showOpenCLIResult 方法
private showOpenCLIResult(result: any): void {
  let resultDiv = document.getElementById('opencli-result');
  if (!resultDiv) {
    resultDiv = document.createElement('div');
    resultDiv.id = 'opencli-result';
    resultDiv.className = 'opencli-result';
    
    const content = typeof result === 'string' ? result : JSON.stringify(result, null, 2);
    
    resultDiv.innerHTML = `
      <div class="result-header">
        <span>📊 执行结果</span>
        <div class="result-actions">
          <button class="btn-action" id="copy-result-btn" title="复制">📋</button>
          <button class="btn-action btn-send-ai" id="send-to-ai-btn" title="发送到 AI">💬</button>
        </div>
      </div>
      <pre class="result-content">${this.escapeHtml(content)}</pre>
    `;
    
    // 插入到执行按钮下方
    const executeBtn = document.getElementById('execute-opencli-btn');
    if (executeBtn) {
      executeBtn.parentElement?.insertBefore(resultDiv, executeBtn.nextSibling);
    }
    
    // 绑定复制事件
    resultDiv.querySelector('#copy-result-btn')?.addEventListener('click', () => {
      this.copyToClipboard(content);
      this.showToast('已复制到剪贴板');
    });
    
    // 绑定发送到 AI 事件
    resultDiv.querySelector('#send-to-ai-btn')?.addEventListener('click', () => {
      this.sendToAI(content);
    });
  }
}
```

### 方案 2: 自动填充到输入框

```typescript
/**
 * 发送内容到 AI 输入框
 */
private sendToAI(content: string): void {
  // 1. 获取 AI 输入框
  const messageInput = document.getElementById('message-input') as HTMLTextAreaElement;
  
  if (!messageInput) {
    this.showToast('未找到 AI 输入框', 'error');
    return;
  }
  
  // 2. 填充内容
  messageInput.value = content;
  
  // 3. 调整输入框高度
  this.adjustTextareaHeight();
  
  // 4. 滚动到输入框
  messageInput.scrollIntoView({ behavior: 'smooth', block: 'center' });
  
  // 5. 聚焦输入框
  messageInput.focus();
  
  // 6. 显示提示
  this.showToast('内容已填充到输入框，请确认后发送', 'success');
  
  // 7. 可选：自动发送（需要用户确认）
  // this.autoSendToAI(content);
}
```

### 方案 3: 智能上下文发送

```typescript
/**
 * 智能发送到 AI（带上下文）
 */
private async sendToAIWithContent(content: string, context?: {
  url?: string;
  pageTitle?: string;
  selector?: string;
}): Promise<void> {
  const messageInput = document.getElementById('message-input') as HTMLTextAreaElement;
  
  if (!messageInput) {
    this.showToast('未找到 AI 输入框', 'error');
    return;
  }
  
  // 构建智能提示词
  let prompt = '';
  
  if (context?.pageTitle) {
    prompt += `📄 页面：${context.pageTitle}\n`;
  }
  
  if (context?.url) {
    prompt += `🔗 URL: ${context.url}\n`;
  }
  
  if (context?.selector) {
    prompt += `🎯 选择器：${context.selector}\n\n`;
  }
  
  prompt += `📝 提取内容:\n${content}\n\n`;
  prompt += `请帮我分析/总结/处理以上内容。`;
  
  // 填充到输入框
  messageInput.value = prompt;
  this.adjustTextareaHeight();
  messageInput.focus();
  
  this.showToast('内容已填充，请确认后发送', 'success');
}
```

---

## 🎨 UI 设计

### 执行结果面板（增强版）

```
┌─────────────────────────────────────────┐
│  📊 执行结果          [📋] [💬 发送]   │
├─────────────────────────────────────────┤
│  这里是提取的内容...                    │
│                                         │
│  提取的文本内容会显示在这里             │
│  支持多行显示                           │
│  ...                                    │
└─────────────────────────────────────────┘

按钮说明:
📋 - 复制到剪贴板
💬 - 发送到 AI 对话框
```

---

## 🔧 完整实现代码

### 修改 side-panel/index.ts

```typescript
// 在 SidePanel 类中添加方法

/**
 * 发送提取内容到 AI
 */
private async sendExtractedContentToAI(content: string, options?: {
  selector?: string;
  autoSend?: boolean;
}): Promise<void> {
  const messageInput = document.getElementById('message-input') as HTMLTextAreaElement;
  
  if (!messageInput) {
    this.showToast('未找到输入框', 'error');
    return;
  }
  
  // 获取当前页面信息
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  
  // 构建消息
  let message = '';
  
  if (options?.selector) {
    message += `我从网页提取了以下内容（选择器：${options.selector}）:\n\n`;
  }
  
  message += content;
  message += `\n\n请帮我分析这个内容。`;
  
  // 填充输入框
  messageInput.value = message;
  this.adjustTextareaHeight();
  
  // 聚焦
  messageInput.focus();
  messageInput.scrollIntoView({ behavior: 'smooth', block: 'center' });
  
  // 显示提示
  this.showToast('内容已填充到 AI 输入框', 'success');
  
  // 可选：自动发送
  if (options?.autoSend) {
    setTimeout(() => {
      this.sendBtn.click();
    }, 500);
  }
}

/**
 * 显示执行结果（增强版）
 */
private showOpenCLIResult(result: any, selector?: string): void {
  let resultDiv = document.getElementById('opencli-result');
  if (!resultDiv) {
    resultDiv = document.createElement('div');
    resultDiv.id = 'opencli-result';
    resultDiv.className = 'opencli-result';
    
    const content = typeof result === 'string' ? result : JSON.stringify(result, null, 2);
    
    resultDiv.innerHTML = `
      <div class="result-header">
        <span>📊 执行结果</span>
        <div class="result-actions">
          <button class="btn-action" id="copy-result-btn" title="复制">📋</button>
          <button class="btn-action btn-send-ai" id="send-to-ai-btn" title="发送到 AI">💬</button>
        </div>
      </div>
      <pre class="result-content">${this.escapeHtml(content)}</pre>
      ${selector ? `<div class="selector-info">选择器：${selector}</div>` : ''}
    `;
    
    // 插入到执行按钮下方
    const executeBtn = document.getElementById('execute-opencli-btn');
    if (executeBtn) {
      const actionsDiv = executeBtn.parentElement;
      if (actionsDiv) {
        const executionStatus = actionsDiv.querySelector('#execution-status');
        if (executionStatus) {
          actionsDiv.insertBefore(resultDiv, executionStatus.nextSibling);
        }
      }
    }
    
    // 绑定复制事件
    resultDiv.querySelector('#copy-result-btn')?.addEventListener('click', () => {
      this.copyToClipboard(content);
      this.showToast('已复制到剪贴板', 'success');
    });
    
    // 绑定发送到 AI 事件
    resultDiv.querySelector('#send-to-ai-btn')?.addEventListener('click', () => {
      this.sendExtractedContentToAI(content, { selector });
    });
  }
}

/**
 * 复制文本到剪贴板
 */
private async copyToClipboard(text: string): Promise<void> {
  try {
    await navigator.clipboard.writeText(text);
  } catch (error) {
    // 降级方案
    const textarea = document.createElement('textarea');
    textarea.value = text;
    document.body.appendChild(textarea);
    textarea.select();
    document.execCommand('copy');
    document.body.removeChild(textarea);
  }
}
```

---

## 📋 使用流程

### 基础流程

```
1. 打开网页
   ↓
2. 点击扩展图标
   ↓
3. 点击 "OpenCLI" 按钮
   ↓
4. 选择"获取元素"
   ↓
5. 输入选择器（如 .content）
   ↓
6. 点击"执行操作"
   ↓
7. 查看提取结果
   ↓
8. 点击"💬 发送到 AI"按钮
   ↓
9. 内容自动填充到 AI 输入框
   ↓
10. 确认后发送
```

### 快捷操作

**方式 1: 一键发送**
```
执行提取 → 点击"发送" → 自动填充 → 手动发送
```

**方式 2: 自动发送**（需配置）
```
执行提取 → 点击"发送" → 自动填充 → 自动发送
```

---

## 🎯 应用场景

### 场景 1: 文章摘要

```
1. 提取文章正文：get .article-content
2. 点击"发送到 AI"
3. AI 自动总结摘要
```

### 场景 2: 数据分析

```
1. 提取表格数据：get table
2. 点击"发送到 AI"
3. AI 分析数据趋势
```

### 场景 3: 代码审查

```
1. 提取代码：get pre code
2. 点击"发送到 AI"
3. AI 审查代码质量
```

### 场景 4: 内容翻译

```
1. 提取内容：get .content
2. 点击"发送到 AI"
3. AI 翻译内容
```

---

## ⚙️ 配置选项

### 添加快捷命令

在 OpenCLI 面板添加预设命令：

```html
<div class="quick-commands">
  <button class="quick-command" data-command="get" data-selector=".content" data-send-ai="true">
    📄 提取正文并发送
  </button>
  <button class="quick-command" data-command="get" data-selector="h1" data-send-ai="true">
    📝 提取标题并发送
  </button>
  <button class="quick-command" data-command="extract.links" data-send-ai="true">
    🔗 提取链接并发送
  </button>
</div>
```

---

## 🔍 增强功能

### 1. 智能提示词

```typescript
// 根据内容类型自动添加提示词
private buildSmartPrompt(content: string, type: string): string {
  switch (type) {
    case 'article':
      return `请总结这篇文章的核心观点:\n\n${content}`;
    case 'data':
      return `请分析这些数据，找出关键趋势:\n\n${content}`;
    case 'code':
      return `请审查这段代码，指出问题和改进建议:\n\n${content}`;
    case 'list':
      return `请整理这个列表，去重并分类:\n\n${content}`;
    default:
      return `请帮我分析以下内容:\n\n${content}`;
  }
}
```

### 2. 历史记录

```typescript
// 记录发送历史
private async logSendToAI(content: string, selector?: string): Promise<void> {
  await chrome.runtime.sendMessage({
    type: 'OPENCLI_HISTORY_ADD',
    data: {
      command: 'send_to_ai',
      args: { selector, contentLength: content.length },
      result: { success: true },
      duration: 0,
    },
  });
}
```

### 3. 批量发送

```typescript
// 批量提取并发送
private async batchExtractAndSend(commands: Array<{
  selector: string;
  prompt: string;
}>): Promise<void> {
  for (const cmd of commands) {
    const content = await this.extractContent(cmd.selector);
    await this.sendToAI(`${cmd.prompt}:\n\n${content}`);
    // 等待 AI 回复
    await this.waitForAIResponse();
  }
}
```

---

## 📊 状态反馈

### Toast 提示

```typescript
// 发送成功
this.showToast('内容已发送到 AI', 'success');

// 发送失败
this.showToast('发送失败，请重试', 'error');

// 自动发送
this.showToast('内容已自动发送给 AI', 'success');
```

### 按钮状态

```typescript
// 发送中
sendBtn.disabled = true;
sendBtn.textContent = '发送中...';

// 发送完成
sendBtn.disabled = false;
sendBtn.textContent = '💬 发送';
```

---

## 🎨 样式增强

```css
/* 结果面板样式 */
.opencli-result {
  margin-top: 12px;
  background: var(--bg-secondary);
  border: 1px solid var(--border-light);
  border-left: 3px solid var(--primary-color);
  border-radius: var(--radius);
  padding: 12px;
}

.result-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
  font-weight: 600;
}

.result-actions {
  display: flex;
  gap: 8px;
}

.btn-action {
  padding: 4px 8px;
  border: none;
  background: var(--bg-tertiary);
  border-radius: 4px;
  cursor: pointer;
  font-size: 16px;
  transition: all 0.2s;
}

.btn-action:hover {
  background: var(--primary-color);
  color: white;
  transform: scale(1.1);
}

.btn-send-ai {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
}

.result-content {
  max-height: 300px;
  overflow-y: auto;
  font-family: 'JetBrains Mono', monospace;
  font-size: 12px;
  white-space: pre-wrap;
  word-break: break-all;
}

.selector-info {
  margin-top: 8px;
  font-size: 11px;
  color: var(--text-secondary);
  font-family: 'JetBrains Mono', monospace;
}
```

---

## ✅ 验收标准

- [x] 执行结果面板显示"发送到 AI"按钮
- [x] 点击按钮后内容填充到 AI 输入框
- [x] 输入框自动调整高度
- [x] 输入框自动聚焦
- [x] 显示成功提示
- [x] 复制按钮正常工作
- [x] 响应式设计
- [x] 错误处理完善

---

**创建日期**: 2026-04-03  
**版本**: 1.0.0  
**状态**: 📋 功能设计
