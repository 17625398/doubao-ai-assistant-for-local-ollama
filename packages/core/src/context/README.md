# 上下文管理系统使用指南

## 📖 概述

上下文管理系统为 AI 对话提供智能的上下文信息管理能力,支持多种来源的上下文捕获、优化和整合。

---

## 🚀 快速开始

### 1. 基本使用

```typescript
import { contextManager } from '@doubao/core';

// 添加手动上下文
const id = await contextManager.addManual(
  '这是项目的背景信息...',
  '项目背景'
);

// 添加代码片段
await contextManager.addCode(
  'function hello() { return "world"; }',
  'javascript',
  'hello.js'
);

// 获取合并后的上下文
const context = contextManager.getMergedContext();
console.log(context);
```

### 2. 捕获页面上下文 (浏览器环境)

```typescript
import { pageContextCapture, contextManager } from '@doubao/core';

// 捕获当前页面
const pageContext = await pageContextCapture.captureCurrentPage();

if (pageContext) {
  console.log('页面标题:', pageContext.title);
  console.log('页面 URL:', pageContext.url);
  console.log('内容长度:', pageContext.content.length);
  
  // 添加到上下文管理器
  await contextManager.addPageContext(pageContext);
}
```

### 3. 提取文档上下文

```typescript
import { documentContextExtract, contextManager } from '@doubao/core';

// 从 File 对象提取 (来自文件选择器)
const file = event.target.files[0];
const docContext = await documentContextExtract.extractFromFile(file);

if (docContext) {
  console.log('文件名:', docContext.fileName);
  console.log('内容长度:', docContext.content.length);
  
  // 添加到上下文管理器
  await contextManager.addDocumentContext(docContext);
}
```

---

## 📚 核心概念

### ContextManager (上下文管理器)

核心管理类,负责:
- 管理多个上下文来源
- 智能优化和压缩
- Token 数量控制
- 优先级排序

### ContextSource (上下文来源)

每个上下文来源包含:
```typescript
interface ContextSource {
  id: string;                    // 唯一标识
  type: ContextSourceType;       // 来源类型
  content: string;               // 内容
  summary?: string;              // 摘要
  metadata: Record<string, any>; // 元数据
  timestamp: number;             // 时间戳
  priority?: number;             // 优先级 1-10
  tokens?: number;               // Token 数量
}
```

### 来源类型

| 类型 | 说明 | 优先级 |
|-----|------|--------|
| `page` | 网页内容 | 6 |
| `document` | 文档内容 | 7 |
| `selection` | 选中文本 | 8 |
| `code` | 代码片段 | 7 |
| `manual` | 手动输入 | 5 |
| `image` | 图片描述 | 6 |
| `conversation` | 对话历史 | 5 |

---

## 🔧 详细使用

### 添加不同类型的上下文

#### 1. 手动上下文

```typescript
await contextManager.addManual(
  '这是重要的背景信息...',
  '背景说明' // 可选描述
);
```

#### 2. 代码片段

```typescript
await contextManager.addCode(
  `function fibonacci(n: number): number {
    if (n <= 1) return n;
    return fibonacci(n - 1) + fibonacci(n - 2);
  }`,
  'typescript',      // 语言
  'fibonacci.ts'     // 文件名
);
```

#### 3. 选中文本

```typescript
await contextManager.addSelection(
  '这是用户在页面上选中的文本',
  'https://example.com/page' // 来源 URL (可选)
);
```

#### 4. 页面上下文

```typescript
const pageContext = await pageContextCapture.captureCurrentPage();
await contextManager.addPageContext(pageContext);
```

#### 5. 文档上下文

```typescript
const docContext = await documentContextExtract.extractFromFile(file);
await contextManager.addDocumentContext(docContext);
```

---

## 🎯 高级功能

### 1. 获取合并上下文

```typescript
// 获取所有上下文
const all = contextManager.getMergedContext();

// 限制 Token 数量
const limited = contextManager.getMergedContext({
  maxTokens: 2000
});

// 按类型过滤
const codeOnly = contextManager.getMergedContext({
  types: ['code', 'selection']
});

// 包含摘要
const withSummary = contextManager.getMergedContext({
  includeSummary: true
});
```

### 2. 上下文优化

```typescript
// 创建自定义配置的管理器
const manager = new ContextManager({
  maxTotalTokens: 4000,        // 最大总 Token 数
  maxSources: 10,              // 最大来源数量
  sourceTimeout: 30 * 60 * 1000, // 30 分钟过期
  enableAutoOptimize: true,    // 自动优化
  enableCompression: true,     // 启用压缩
  defaultPriority: 5           // 默认优先级
});
```

### 3. 优先级管理

```typescript
// 更新优先级 (1-10)
contextManager.updatePriority(sourceId, 9);

// 查看所有来源 (按优先级排序)
const sources = contextManager.getAllSources();
sources.forEach(s => {
  console.log(`[${s.priority}] ${s.type}: ${s.content.substring(0, 50)}...`);
});
```

### 4. 上下文摘要

```typescript
const summary = contextManager.getSummary();
console.log(summary);
// {
//   totalSources: 5,           // 总来源数
//   totalTokens: 3500,         // 总 Token 数
//   sourcesByType: {           // 按类型统计
//     code: 2,
//     page: 1,
//     manual: 2
//   },
//   oldestSource: 300000,      // 最老来源年龄 (ms)
//   newestSource: 5000         // 最新来源年龄 (ms)
// }
```

### 5. 清理和管理

```typescript
// 清理过期上下文
const removed = contextManager.cleanup();
console.log(`清理了 ${removed} 个过期来源`);

// 移除特定来源
contextManager.removeSource(sourceId);

// 清空所有
contextManager.clear();
```

---

## 💡 实际应用场景

### 场景 1: AI 代码助手

```typescript
import { contextManager } from '@doubao/core';

async function handleCodeQuestion(question: string, codeFile: File) {
  // 1. 添加代码上下文
  const docContext = await documentContextExtract.extractFromFile(codeFile);
  await contextManager.addDocumentContext(docContext);
  
  // 2. 获取合并上下文
  const context = contextManager.getMergedContext({
    maxTokens: 3000
  });
  
  // 3. 构建 AI 提示词
  const prompt = `基于以下代码,回答用户的问题:

${context}

---

用户问题: ${question}

请提供详细的解答和优化建议。`;

  // 4. 发送到 AI
  return await sendToAI(prompt);
}
```

### 场景 2: 网页内容问答

```typescript
async function answerAboutCurrentPage(question: string) {
  // 1. 捕获当前页面
  const pageContext = await pageContextCapture.captureCurrentPage();
  if (!pageContext) return;
  
  // 2. 添加到上下文
  await contextManager.addPageContext(pageContext);
  
  // 3. 构建提示词
  const context = contextManager.getMergedContext({
    maxTokens: 4000
  });
  
  const prompt = `基于以下网页内容,回答问题:

${context}

---

问题: ${question}`;

  return await sendToAI(prompt);
}
```

### 场景 3: 多文档分析

```typescript
async function analyzeMultipleDocuments(files: File[], question: string) {
  // 1. 提取所有文档
  for (const file of files) {
    const docContext = await documentContextExtract.extractFromFile(file);
    if (docContext) {
      await contextManager.addDocumentContext(docContext);
    }
  }
  
  // 2. 获取优化后的上下文
  const context = contextManager.getMergedContext({
    maxTokens: 6000
  });
  
  // 3. 分析
  const prompt = `分析以下文档并回答问题:

${context}

---

问题: ${question}

请综合所有文档内容,提供全面的回答。`;

  return await sendToAI(prompt);
}
```

---

## ⚙️ 配置选项

### ContextConfig

```typescript
interface ContextConfig {
  maxTotalTokens: number;        // 最大总 Token 数 (默认 4000)
  maxSources: number;            // 最大来源数量 (默认 10)
  sourceTimeout: number;         // 来源过期时间 ms (默认 30 分钟)
  enableAutoOptimize: boolean;   // 是否自动优化 (默认 true)
  enableCompression: boolean;    // 是否启用压缩 (默认 true)
  defaultPriority: number;       // 默认优先级 (默认 5)
}
```

### ExtractOptions (页面提取)

```typescript
interface ExtractOptions {
  maxLength?: number;          // 最大长度 (默认 10000)
  extractLinks?: boolean;      // 提取链接 (默认 false)
  extractImages?: boolean;     // 提取图片 (默认 false)
  removeScripts?: boolean;     // 移除脚本 (默认 true)
  removeStyles?: boolean;      // 移除样式 (默认 true)
  onlyMainContent?: boolean;   // 只提取主要内容 (默认 true)
}
```

### DocumentExtractOptions (文档提取)

```typescript
interface DocumentExtractOptions {
  maxLength?: number;         // 最大长度 (默认 15000)
  extractMetadata?: boolean;  // 提取元数据 (默认 true)
  pageCount?: number;         // PDF/Word 页数限制 (默认 10)
}
```

---

## 🔍 最佳实践

### 1. 合理设置 Token 限制

```typescript
// 根据 AI 模型的上下文窗口设置
const manager = new ContextManager({
  maxTotalTokens: 3500 // GPT-3.5 约 4000 tokens,留一些余量
});
```

### 2. 使用优先级控制重要性

```typescript
// 用户选中的内容优先级最高
await contextManager.addSelection(selectedText); // 默认优先级 8

// 手动添加的背景信息可以设置较低优先级
const id = await contextManager.addManual(backgroundInfo);
contextManager.updatePriority(id, 4);
```

### 3. 定期清理过期上下文

```typescript
// 在适当的时候清理
setInterval(() => {
  contextManager.cleanup();
}, 5 * 60 * 1000); // 每 5 分钟清理一次
```

### 4. 按需获取上下文

```typescript
// 代码相关问题只获取代码上下文
const codeContext = contextManager.getMergedContext({
  types: ['code'],
  maxTokens: 2000
});

// 文档相关问题获取文档上下文
const docContext = contextManager.getMergedContext({
  types: ['document', 'page'],
  maxTokens: 4000
});
```

---

## ⚠️ 注意事项

1. **浏览器环境**: 页面捕获功能需要在浏览器中运行
2. **Token 估算**: Token 数量是粗略估算,实际可能有所不同
3. **性能考虑**: 大量上下文时注意性能影响
4. **隐私安全**: 注意不要捕获敏感信息
5. **内存管理**: 及时清理不需要的上下文

---

## 📊 完整示例

查看完整的可运行示例: [context-example.ts](./context-example.ts)

示例包括:
- ✅ 基本上下文管理
- ✅ 页面上下文捕获
- ✅ 文档上下文提取
- ✅ 智能上下文优化
- ✅ 优先级管理
- ✅ 类型过滤
- ✅ Token 限制控制
- ✅ AI 对话集成
- ✅ 清理和管理

---

## 🔗 相关资源

- [插件系统文档](../plugins/README.md)
- [上下文管理器源码](./context-manager.ts)
- [页面捕获器源码](./page-context-capture.ts)
- [文档提取器源码](./document-context-extract.ts)
- [使用示例](./context-example.ts)

---

**版本**: 1.0  
**更新日期**: 2026-04-16
