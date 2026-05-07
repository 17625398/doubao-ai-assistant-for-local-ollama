# PageIndex 详细使用指南

## 什么是 PageIndex

PageIndex 是 OpenKB 的核心组件，专门用于解决**长文档（20页以上）**的处理和检索问题。它采用**树状索引结构**，将长文档分层级组织，实现高效的向量无关检索。

## 核心优势

### 1. 解决传统 RAG 的长文档问题

| 问题 | 传统 RAG | PageIndex |
|------|----------|-----------|
| 长文档处理 | 截断或分块，丢失上下文 | 树状索引，保持层级关系 |
| 检索精度 | 向量相似度，可能偏离主题 | 推理式导航，精准定位 |
| 计算成本 | 高维向量计算 | 关键词匹配 + 层级加权 |
| 可解释性 | 黑盒相似度 | 清晰的导航路径 |

### 2. 多模态理解

PageIndex 不仅理解文本，还能识别：
- **表格数据** - Markdown 格式表格
- **代码块** - 代码片段和语法
- **数学公式** - LaTeX 格式公式
- **图表** - 图片和图表元数据

## 架构设计

```
长文档输入
    ↓
多模态分析
    ├─ 文本提取
    ├─ 表格检测
    ├─ 代码识别
    └─ 公式提取
    ↓
智能分块策略
    ├─ 语义分块（基于内容长度）
    ├─ 结构分块（基于章节标题）
    └─ 混合分块（推荐）
    ↓
树状索引构建
    ├─ ROOT（文档概览）
    ├─ CHAPTER（章节）
    ├─ SECTION（小节）
    └─ PAGE（页面）
    ↓
索引持久化
    └─ .pageindex/{documentId}.json
    ↓
检索与查询
    ├─ 关键词匹配
    ├─ 层级加权
    └─ 上下文组装
```

## 分块策略详解

### 1. 固定大小分块（FIXED_SIZE）

按固定页面数分块，简单直接。

```typescript
// 每50页一个块
chunkSize = 50

Pages 1-50    → Block 1
Pages 51-100  → Block 2
Pages 101-150 → Block 3
```

**适用场景**：
- 文档结构不明显
- 需要快速处理
- 内容分布均匀

### 2. 语义分块（SEMANTIC）

基于内容长度智能分块，保持语义完整性。

```typescript
// 目标：每个块约 50,000 字符
targetChunkSize = 50000

Block 1: Pages 1-15  (48,000 chars)
Block 2: Pages 16-35 (52,000 chars)
Block 3: Pages 36-50 (45,000 chars)
```

**适用场景**：
- 学术论文
- 技术文档
- 内容密度不均的文档

### 3. 结构分块（STRUCTURAL）

基于文档结构（章节标题）分块。

```typescript
// 识别章节标题
Chapter 1: Introduction      → Block 1 (Pages 1-15)
Chapter 2: Background        → Block 2 (Pages 16-30)
Chapter 3: Methodology       → Block 3 (Pages 31-50)
```

**适用场景**：
- 书籍
- 规范文档
- 结构化报告

### 4. 混合分块（HYBRID）⭐ 推荐

先按结构分块，大块再按语义分块。

```typescript
// Step 1: 结构分块
Chapter 1 (Pages 1-60)  → 太大，需要细分
Chapter 2 (Pages 61-90) → 合适

// Step 2: 语义细分
Chapter 1 Part 1 (Pages 1-30)
Chapter 1 Part 2 (Pages 31-60)
Chapter 2 (Pages 61-90)
```

**适用场景**：
- 综合文档
- 长章节的书籍
- 复杂技术文档

## 使用示例

### 基本使用

```typescript
import { pageIndexService, ChunkingStrategy } from '@ai-intelligent-analysis-platform/core';

// 1. 准备页面数据
const pages = [
  { index: 0, content: '<html>...</html>', text: 'Page 1 content...' },
  { index: 1, content: '<html>...</html>', text: 'Page 2 content...' },
  // ... 更多页面
];

// 2. 构建索引
const tree = await pageIndexService.buildIndexTree(
  'doc-ai-research-2024',
  '人工智能研究综述 2024',
  pages,
  { wordCount: 150000, imageCount: 45, tableCount: 12 }
);

// 3. 检索
const results = await pageIndexService.search(
  'doc-ai-research-2024',
  '深度学习在计算机视觉中的应用',
  { maxResults: 5, includeContext: true }
);

// 4. 使用结果
for (const result of results) {
  console.log(`标题: ${result.node.title}`);
  console.log(`页码: ${result.node.pageRange.start + 1}-${result.node.pageRange.end + 1}`);
  console.log(`相关度: ${result.relevance}`);
  console.log(`摘要: ${result.node.summary}`);
  console.log(`路径: ${result.path.join(' > ')}`);
}
```

### 自定义配置

```typescript
import { PageIndexService, ChunkingStrategy } from '@ai-intelligent-analysis-platform/core';

const customService = new PageIndexService({
  // 基础配置
  threshold: 15,                    // 15页以上使用 PageIndex
  maxDepth: 5,                      // 最大5层深度
  maxPagesPerNode: 30,              // 每节点最多30页
  minPagesPerNode: 3,               // 每节点最少3页
  
  // 功能开关
  generateSummaries: true,          // 生成摘要
  extractConcepts: true,            // 提取关键概念
  enableMultimodal: true,           // 启用多模态分析
  enableSemanticSearch: true,       // 启用语义标签
  
  // 分块策略
  chunkingStrategy: ChunkingStrategy.HYBRID,
  
  // 持久化
  enablePersistence: true,
  persistencePath: './custom-indexes',
  
  // LLM 配置（用于摘要生成）
  llmConfig: {
    model: 'ollama/qwen3.6',
    temperature: 0.3,
    maxTokens: 2000,
  },
});
```

### 批量处理多个文档

```typescript
import { pageIndexService } from '@ai-intelligent-analysis-platform/core';

const documents = [
  { id: 'doc-1', title: '论文 A', pages: pagesA },
  { id: 'doc-2', title: '论文 B', pages: pagesB },
  { id: 'doc-3', title: '论文 C', pages: pagesC },
];

// 并行构建索引
const buildPromises = documents.map(doc =>
  pageIndexService.buildIndexTree(doc.id, doc.title, doc.pages)
);

const trees = await Promise.all(buildPromises);

// 跨文档检索
for (const doc of documents) {
  const results = await pageIndexService.search(
    doc.id,
    '机器学习算法',
    { maxResults: 3 }
  );
  
  if (results.length > 0) {
    console.log(`在 ${doc.title} 中找到 ${results.length} 个相关章节`);
  }
}
```

### 获取文档结构概览

```typescript
const overview = pageIndexService.getTreeOverview('doc-ai-research-2024');

console.log(overview.title);
// 输出: 人工智能研究综述 2024

console.log(overview.structure);
// 输出:
// - 人工智能研究综述 2024 (Pages 1-150)
//   - 第1章 引言 (Pages 1-15)
//   - 第2章 深度学习基础 (Pages 16-45)
//     - 2.1 神经网络 (Pages 16-25)
//     - 2.2 反向传播 (Pages 26-35)
//     - 2.3 优化算法 (Pages 36-45)
//   - 第3章 计算机视觉 (Pages 46-80)
//     - 3.1 图像分类 (Pages 46-60)
//     - 3.2 目标检测 (Pages 61-80)
//   - 第4章 自然语言处理 (Pages 81-120)
//   - 第5章 总结与展望 (Pages 121-150)
```

## 多模态内容处理

### 自动检测的内容类型

PageIndex 会自动检测并记录以下多模态内容：

```typescript
interface MultimodalContentItem {
  type: 'table' | 'code' | 'formula' | 'image' | 'chart';
  content: string;
  description?: string;
  pageIndex: number;
}
```

### 示例：包含多模态内容的文档

```typescript
const pages = [
  {
    index: 0,
    content: '...',
    text: `
# 第一章 算法复杂度

## 1.1 时间复杂度

以下是常见算法的时间复杂度对比：

| 算法 | 最好情况 | 平均情况 | 最坏情况 |
|------|----------|----------|----------|
| 快速排序 | O(n log n) | O(n log n) | O(n²) |
| 归并排序 | O(n log n) | O(n log n) | O(n log n) |
| 堆排序 | O(n log n) | O(n log n) | O(n log n) |

快速排序的 Python 实现：

\`\`\`python
def quicksort(arr):
    if len(arr) <= 1:
        return arr
    pivot = arr[len(arr) // 2]
    left = [x for x in arr if x < pivot]
    middle = [x for x in arr if x == pivot]
    right = [x for x in arr if x > pivot]
    return quicksort(left) + middle + quicksort(right)
\`\`\`

数学公式：

时间复杂度的递归关系：
$$T(n) = 2T(n/2) + O(n)$$

解得：
$$T(n) = O(n \log n)$$
    `
  }
];

// 构建索引时会自动提取：
// - 1 个表格（时间复杂度对比）
// - 1 个代码块（quicksort 实现）
// - 2 个数学公式
```

## 性能优化建议

### 1. 索引缓存

```typescript
// 获取缓存统计
const stats = pageIndexService.getCacheStats();
console.log(`内存中缓存了 ${stats.totalTrees} 个索引树`);

// 清理缓存
pageIndexService.clearCache();
```

### 2. 持久化管理

```typescript
// 索引会自动持久化到 .pageindex/ 目录
// 服务重启后会自动加载

// 手动删除特定文档的索引
pageIndexService.deleteIndexTree('doc-old');
```

### 3. 批量处理优化

```typescript
// 对于大量文档，使用批量处理
const batchSize = 5;
for (let i = 0; i < documents.length; i += batchSize) {
  const batch = documents.slice(i, i + batchSize);
  await Promise.all(
    batch.map(doc => pageIndexService.buildIndexTree(doc.id, doc.title, doc.pages))
  );
  
  // 批次间添加延迟，避免内存压力
  if (i + batchSize < documents.length) {
    await new Promise(resolve => setTimeout(resolve, 1000));
  }
}
```

## 故障排除

### 索引构建失败

```typescript
// 检查文档是否满足条件
const pageCount = pages.length;
const shouldIndex = pageIndexService.shouldUsePageIndex(pageCount);

if (!shouldIndex) {
  console.log(`文档只有 ${pageCount} 页，不需要 PageIndex`);
}

// 尝试构建并捕获错误
try {
  const tree = await pageIndexService.buildIndexTree(id, title, pages);
  if (!tree) {
    console.error('索引构建返回 null');
  }
} catch (error) {
  console.error('索引构建失败:', error);
}
```

### 检索无结果

```typescript
// 检查索引是否存在
const tree = pageIndexService.getIndexTree('doc-id');
if (!tree) {
  console.error('索引不存在，需要先构建索引');
  return;
}

// 尝试不同查询
const queries = [
  '深度学习',
  'deep learning',
  '神经网络',
  'neural network',
];

for (const query of queries) {
  const results = await pageIndexService.search('doc-id', query, {
    maxResults: 5,
    minRelevance: 0.1,  // 降低相关性阈值
  });
  
  if (results.length > 0) {
    console.log(`查询 "${query}" 找到 ${results.length} 个结果`);
    break;
  }
}
```

### 内存问题

```typescript
// 对于超大文档，限制多模态内容存储
const customService = new PageIndexService({
  enableMultimodal: true,
  // 其他配置...
});

// 构建索引后清理缓存
await pageIndexService.buildIndexTree(id, title, pages);
pageIndexService.clearCache();
```

## 最佳实践

1. **选择合适的分块策略**
   - 技术文档 → STRUCTURAL
   - 论文 → SEMANTIC
   - 混合内容 → HYBRID（推荐）

2. **合理设置阈值**
   - 默认 20 页适合大多数场景
   - 技术文档可降至 15 页
   - 书籍可提高到 30 页

3. **启用持久化**
   - 避免重复构建索引
   - 提升服务启动速度
   - 减少内存占用

4. **定期清理缓存**
   - 对于不常用的文档
   - 释放内存资源
   - 保持系统性能

5. **监控索引大小**
   - 检查 `.pageindex/` 目录大小
   - 定期归档旧索引
   - 优化存储空间

## 相关文档

- [OpenKB 集成文档](./openkb-integration.md)
- [API 参考文档](./api-reference.md)
- [OpenKB GitHub](https://github.com/VectifyAI/OpenKB)
