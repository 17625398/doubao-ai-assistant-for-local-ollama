# 文档解析和网页内容提取能力优化指南

本文档详细说明了项目中增强的文档解析和网页内容提取能力。

## 📑 目录

1. [文档解析器](#文档解析器)
2. [网页内容提取](#网页内容提取)
3. [Markdown转换](#markdown转换)
4. [流式处理](#流式处理)
5. [使用示例](#使用示例)

---

## 文档解析器

### 增强的文档格式支持

项目现在支持以下文档格式：

| 格式 | 解析器 | 特性 |
|------|--------|------|
| PDF | `PDFDocumentParser` | 文本、表格、图片提取，OCR支持 |
| Word | `WordDocumentParser` | 文本、表格、图片、样式提取 |
| Excel | `ExcelDocumentParser` | 表格、公式、格式保留 |
| PowerPoint | `PowerPointDocumentParser` | 幻灯片、备注、主题 |
| 图片 | `ImageDocumentParser` | OCR识别、元数据提取 |
| Markdown | `EnhancedMarkdownDocumentParser` | Front matter、目录、代码块统计 |
| CSV | `CsvDocumentParser` | 智能分隔符检测、编码处理 |
| RTF | `RtfDocumentParser` | 纯文本提取 |
| EPUB | `EpubDocumentParser` | 基本解析支持 |
| 文本 | `EnhancedTextDocumentParser` | 编码检测、结构化信息提取 |

### 新增解析器

#### CSV 解析器 (`CsvDocumentParser`)

```typescript
import { CsvDocumentParser } from './document-parsers/enhanced-document-parsers';

const parser = new CsvDocumentParser();

// 解析 CSV 文件
const result = await parser.parse(csvFile, {
  extractTables: true,
  extractText: true,
});
```

#### RTF 解析器 (`RtfDocumentParser`)

```typescript
import { RtfDocumentParser } from './document-parsers/enhanced-document-parsers';

const parser = new RtfDocumentParser();
const result = await parser.parse(rtfFile);
```

#### EPUB 解析器 (`EpubDocumentParser`)

```typescript
import { EpubDocumentParser } from './document-parsers/enhanced-document-parsers';

const parser = new EpubDocumentParser();
const result = await parser.parse(epubFile);
```

#### 增强型 Markdown 解析器 (`EnhancedMarkdownDocumentParser`)

```typescript
import { EnhancedMarkdownDocumentParser } from './document-parsers/enhanced-document-parsers';

const parser = new EnhancedMarkdownDocumentParser();

// 解析 Markdown，提取：
// - Front matter (YAML 头)
提取
// - 目录结构
// - 代码块统计
// - 表格
// - 图片
const result = await parser.parse(markdownFile);
```

#### 增强型文本解析器 (`EnhancedTextDocumentParser`)

```typescript
import { EnhancedTextDocumentParser } from './document-parsers/enhanced-document-parsers';

const parser = new EnhancedTextDocumentParser();

// 特性：
// - 自动编码检测和转换
// - 智能文本分块
// - 结构化信息提取（邮箱、URL、电话）
const result = await parser.parse(textFile);
```

---

## 网页内容提取

### 增强型网页提取器 (`EnhancedWebContentExtractor`)

#### 主要特性

1. **JavaScript 动态内容处理**
   - 等待 SPA 页面内容加载
   - 动态内容稳定性检测
   - 可配置等待时间和阈值

2. **结构化数据提取**
   - JSON-LD 提取
   - Microdata 提取
   - RDFa 提取

3. **多媒体内容提取**
   - 图片（支持懒加载）
   - 视频（支持 YouTube/Vimeo）
   - 音频
   - 嵌入内容

4. **增强的元数据**
   - 阅读时间估算
   - Schema.org 类型
   - 规范 URL

#### 使用示例

```typescript
import { enhancedWebContentExtractor } from './utils/enhanced-web-extractor';

// 基础提取
const result = enhancedWebContentExtractor.extract({
  maxChars: 120000,
  extractLinkUrl: true,
  extractImageUrl: true,
});

// 等待动态内容
await enhancedWebContentExtractor.waitForDynamicContent({
  maxWaitTime: 5000,
  stabilityThreshold: 500,
});

// 获取页面信息
const pageInfo = enhancedWebContentExtractor.getPageInfo();
console.log(pageInfo);
// {
//   url: "https://example.com",
//   title: "Example",
//   favicon: "...",
//   length: 12345,
//   wordCount: 2345,
//   readingTime: "5 分钟"
// }

// 提取选中内容
const selection = enhancedWebContentExtractor.extractSelection();
if (selection) {
  console.log(selection.text);
}
```

#### 提取结果结构

```typescript
interface EnhancedExtractResult {
  content: string;           // Markdown 内容
  title: string;             // 页面标题
  url: string;               // 页面 URL
  author?: string;            // 作者
  publishedAt?: string;       // 发布时间
  modifiedAt?: string;       // 修改时间
  summary?: string;          // 内容摘要
  structuredData: StructuredData[];  // 结构化数据
  media: MediaContent[];     // 媒体内容
  metadata: EnhancedPageMetadata;     // 完整元数据
  stats: EnhancedExtractionStats;     // 统计信息
  success: boolean;
  error?: string;
}
```

#### 结构化数据示例

```typescript
// JSON-LD 提取结果
const structuredData = result.structuredData;
structuredData.forEach(data => {
  console.log(data.type);    // e.g., "Article", "Product", "Event"
  console.log(data.format);   // "json-ld" | "microdata" | "rdfa"
  console.log(data.data);    // 实际数据结构
});
```

#### 媒体内容示例

```typescript
const media = result.media;

media.forEach(item => {
  console.log(item.type);    // "image" | "video" | "audio" | "embed"
  console.log(item.url);
  console.log(item.title);
  console.log(item.thumbnail); // 视频缩略图
});
```

---

## Markdown 转换

### 增强型 DOM 到 Markdown 转换器

#### 特性

1. **广泛的 HTML 支持**
   - 所有标准 HTML 标签
   - 数学公式 (MathML)
   - Ruby 注释
   - 定义列表
   - Details/Summary

2. **代码块优化**
   - 语言自动检测
   - 语法别名映射
   - 代码高亮识别

3. **表格增强**
   - CSV 格式输出
   - 嵌套表格处理
   - 列跨度支持

4. **链接优化**
   - URL 重写规则
   - 链接去重
   - 图片链接检测

5. **Markdown 扩展**
   - 脚注支持
   - 自定义 ID（标题）
   - 高亮标记

#### 使用示例

```typescript
import { EnhancedDomToMarkdownConverter } from './utils/enhanced-markdown-converter';

// 基本转换
const converter = new EnhancedDomToMarkdownConverter();
const { markdown, stats } = converter.convert(document.body);

// 自定义选项
const customConverter = new EnhancedDomToMarkdownConverter({
  maxChars: 50000,
  maxUrls: 100,
  extractLinkUrl: true,
  extractImageUrl: true,
  preserveCodeBlocks: true,
  extractTables: true,
  headingLevel: 0,
  includeFencedCode: true,
  includeDetails: true,
  linkRewriteRules: [
    {
      pattern: /example\.com/g,
      replacement: 'https://new-example.com',
    },
  ],
});

const { markdown } = customConverter.convert(element);

// 静态方法：从 HTML 字符串转换
const markdown = EnhancedDomToMarkdownConverter.htmlToMarkdown(
  '<h1>Title</h1><p>Content</p>',
  { extractTables: true }
);
```

#### 支持的 HTML 标签

**文本格式化**
- `<strong>`, `<b>` → `**text**`
- `<em>`, `<i>` → `_text_`
- `<mark>` → `==text==`
- `<del>`, `<s>` → `~~text~~`
- `<u>` → `<u>text</u>`
- `<kbd>` → `<kbd>text</kbd>`
- `<code>` → `` `code` ``
- `<pre>` → ` ```code``` `

**结构**
- `<h1>` - `<h6>` → `#` - `######`
- `<p>` → 段落
- `<blockquote>` → `> 引用`
- `<hr>` → `---`

**列表**
- `<ul>`, `<ol>` → `-` 或 `1.`
- `<dl>`, `<dt>`, `<dd>` → 定义列表

**表格**
- `<table>`, `<thead>`, `<tbody>`, `<tr>`, `<th>`, `<td>`
- CSV 格式输出

**媒体**
- `<img>` → `![alt](url)`
- `<video>`, `<audio>` → `[媒体信息]`
- `<iframe>` → `[嵌入内容]`

**高级**
- `<details>`, `<summary>` → 可折叠区域
- `<figure>`, `<figcaption>` → 带标题图片
- `<math>` → `$$数学公式$$`
- `<ruby>`, `<rt>`, `<rp>` → Ruby 注释
- `<abbr>` → 缩写
- `<cite>` → 引用
- `<time datetime="">` → 时间元素

#### 统计信息

```typescript
interface ConverterStats {
  imageCount: number;
  linkCount: number;
  codeBlockCount: number;
  tableCount: number;
  paragraphCount: number;
  listCount: number;
  headingCount: number;
  quoteCount: number;
}
```

---

## 流式处理

### 流式文档处理器 (`StreamingDocumentProcessor`)

用于高效处理大型文档，支持分块处理和进度跟踪。

#### 特性

1. **智能分块**
   - 语义分割点检测
   - 句子边界保持
   - 可配置重叠

2. **并行处理**
   - 可配置并发数
   - 批量处理

3. **进度跟踪**
   - 实时进度回调
   - 预计剩余时间
   - 每块处理回调

4. **文档类型检测**
   - Markdown
   - HTML
   - JSON
   - 代码
   - 纯文本

#### 使用示例

```typescript
import { streamingDocumentProcessor } from './services/streaming-document-processor';

// 基础用法
const result = await streamingDocumentProcessor.process(
  largeDocument,
  (progress) => {
    console.log(`Progress: ${progress.percentage}%`);
    console.log(`Processed: ${progress.processedChunks}/${progress.totalChunks}`);
    console.log(`Time remaining: ${progress.estimatedTimeRemaining}ms`);
  },
  (chunk) => {
    console.log(`Processing chunk ${chunk.index}: ${chunk.text.length} chars`);
  }
);

// 并行处理
const parallelResult = await streamingDocumentProcessor.processParallel(
  largeDocument,
  onProgress,
  onChunk
);

// 自定义选项
const customProcessor = new StreamingDocumentProcessor({
  chunkSize: 3000,
  chunkOverlap: 300,
  maxConcurrency: 5,
  enableProgress: true,
  processingInterval: 100, // ms
});

// 合并结果
const fullText = StreamingDocumentProcessor.mergeChunks(result.chunks);

// 获取统计
const stats = StreamingDocumentProcessor.getStats(result.chunks);
console.log(stats);
// {
//   totalChunks: 10,
//   totalChars: 25000,
//   avgChunkSize: 2500,
//   totalProcessingTime: 1500,
//   avgProcessingTime: 150
// }
```

#### 进度回调

```typescript
interface StreamingProgress {
  totalChunks: number;          // 总块数
  processedChunks: number;       // 已处理块数
  totalChars: number;            // 总字符数
  processedChars: number;        // 已处理字符数
  percentage: number;            // 百分比 (0-100)
  currentChunkIndex: number;     // 当前块索引
  startTime: number;             // 开始时间戳
  estimatedTimeRemaining?: number; // 预计剩余时间 (ms)
}
```

#### 块结果

```typescript
interface ChunkResult {
  index: number;           // 块索引
  text: string;           // 块文本
  startOffset: number;     // 原文起始位置
  endOffset: number;       // 原文结束位置
  isLast: boolean;         // 是否最后一块
  processingTime: number;  // 处理时间 (ms)
}
```

---

## 使用示例

### 完整工作流示例

```typescript
import { 
  documentParserRegistry 
} from './document-parsers/document-parser-registry';
import { 
  enhancedWebContentExtractor 
} from './utils/enhanced-web-extractor';
import { 
  EnhancedDomToMarkdownConverter 
} from './utils/enhanced-markdown-converter';
import { 
  streamingDocumentProcessor 
} from './services/streaming-document-processor';

async function processDocument(file: File) {
  // 1. 使用注册表自动检测并解析
  const parseResult = await documentParserRegistry.parse(file, {
    extractText: true,
    extractTables: true,
    extractImages: true,
    enableOCR: false,
  });
  
  if (!parseResult.success) {
    console.error('Parsing failed:', parseResult.error);
    return;
  }
  
  console.log('Parsed:', parseResult.metadata.name);
  console.log('Text length:', parseResult.text.length);
  console.log('Tables found:', parseResult.content.filter(c => c.type === 'TABLE').length);
  
  // 2. 流式处理大文档
  if (parseResult.text.length > 10000) {
    const chunks: string[] = [];
    
    await streamingDocumentProcessor.process(
      parseResult.text,
      (progress) => {
        console.log(`Processing: ${progress.percentage}%`);
      },
      (chunk) => {
        chunks.push(chunk.text);
      }
    );
    
    console.log('Total chunks:', chunks.length);
    return chunks;
  }
  
  return [parseResult.text];
}

// 网页内容提取示例
function extractWebContent() {
  // 等待页面加载
  enhancedWebContentExtractor.waitForDynamicContent({
    maxWaitTime: 5000,
    stabilityThreshold: 500,
  }).then(() => {
    // 提取内容
    const result = enhancedWebContentExtractor.extract({
      maxChars: 100000,
      extractJsonLd: true,
      extractMicrodata: true,
      extractVideos: true,
      extractAudios: true,
    });
    
    // 输出结果
    console.log('Title:', result.title);
    console.log('Author:', result.author);
    console.log('Published:', result.publishedAt);
    console.log('Reading time:', result.metadata.readingTime);
    console.log('Summary:', result.summary);
    console.log('Structured data types:', result.structuredData.map(s => s.type));
    console.log('Media items:', result.media.length);
    console.log('Images:', result.media.filter(m => m.type === 'image').length);
    console.log('Videos:', result.media.filter(m => m.type === 'video').length);
  });
}

// HTML 到 Markdown 转换示例
function convertHtmlToMarkdown(html: string) {
  const converter = new EnhancedDomToMarkdownConverter({
    preserveCodeBlocks: true,
    extractTables: true,
    includeDetails: true,
  });
  
  const { markdown, stats } = converter.convert(html);
  
  console.log('Converted markdown length:', markdown.length);
  console.log('Images:', stats.imageCount);
  console.log('Code blocks:', stats.codeBlockCount);
  console.log('Tables:', stats.tableCount);
  
  return markdown;
}
```

### React 组件示例

```tsx
import React, { useState } from 'react';
import { enhancedWebContentExtractor } from './utils/enhanced-web-extractor';
import { StreamingDocumentProcessor } from './services/streaming-document-processor';

export function ContentExtractor() {
  const [content, setContent] = useState('');
  const [progress, setProgress] = useState(0);
  const [isLoading, setIsLoading] = useState(false);

  const extractCurrentPage = async () => {
    setIsLoading(true);
    
    try {
      await enhancedWebContentExtractor.waitForDynamicContent();
      const result = enhancedWebContentExtractor.extract({
        extractJsonLd: true,
        extractVideos: true,
      });
      
      setContent(result.content);
    } catch (error) {
      console.error('Extraction failed:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const processLargeText = async () => {
    setIsLoading(true);
    setProgress(0);
    
    const chunks: string[] = [];
    
    await streamingDocumentProcessor.process(
      content,
      (p) => setProgress(p.percentage),
      (chunk) => chunks.push(chunk.text)
    );
    
    setContent(chunks.join('\n\n'));
    setIsLoading(false);
  };

  return (
    <div className="content-extractor">
      <button onClick={extractCurrentPage} disabled={isLoading}>
        提取当前页面
      </button>
      
      {isLoading && <progress value={progress} max={100} />}
      
      <textarea 
        value={content} 
        onChange={(e) => setContent(e.target.value)}
        rows={20}
      />
    </div>
  );
}
```

---

## 最佳实践

### 1. 文档解析

```typescript
// ✅ 推荐：使用注册表自动检测
const result = await documentParserRegistry.parse(file);

// ✅ 推荐：启用缓存
const result = await documentParserRegistry.parse(file, {
  enableCache: true,
  cacheExpiry: 3600000, // 1小时
});

// ✅ 推荐：分块处理大文档
const result = await streamingDocumentProcessor.process(largeContent);
```

### 2. 网页提取

```typescript
// ✅ 推荐：等待动态内容
await extractor.waitForDynamicContent({
  maxWaitTime: 5000,
  stabilityThreshold: 500,
});

// ✅ 推荐：只提取需要的内容
const result = extractor.extract({
  extractJsonLd: true,     // 需要结构化数据
  extractVideos: false,    // 不需要视频
  extractAudios: false,    // 不需要音频
});

// ✅ 推荐：限制内容长度
const result = extractor.extract({
  maxChars: 50000,  // 限制50K字符
});
```

### 3. Markdown 转换

```typescript
// ✅ 推荐：自定义链接重写
const converter = new EnhancedDomToMarkdownConverter({
  linkRewriteRules: [
    { pattern: /old-domain\.com/g, replacement: 'new-domain.com' },
  ],
});

// ✅ 推荐：保留代码块
const converter = new EnhancedDomToMarkdownConverter({
  preserveCodeBlocks: true,
  includeFencedCode: true,
});
```

---

## 性能优化

### 1. 缓存策略

```typescript
// 使用内存缓存
const result = await documentParserRegistry.parse(file, {
  enableCache: true,
  cacheExpiry: 600000, // 10分钟
});
```

### 2. 并行处理

```typescript
// 使用并行处理大文档
const result = await streamingDocumentProcessor.processParallel(content, onProgress);
```

### 3. 流式处理

```typescript
// 实时处理，不需要等待全部完成
for await (const chunk of streamProcessor.processStream(content)) {
  console.log('Received chunk:', chunk.index);
}
```

---

## 故障排除

### 常见问题

1. **PDF 解析失败**
   - 确保 PDF.js 已正确加载
   - 检查文件是否损坏

2. **网页提取内容不完整**
   - 增加等待时间
   - 检查页面是否需要登录

3. **编码问题**
   - 使用 `EnhancedTextDocumentParser`
   - 自动检测编码

4. **大文档处理超时**
   - 减小块大小
   - 使用并行处理
   - 增加超时限制

---

## API 参考

详细 API 文档请参考各模块的 TypeScript 定义文件。

---

**更新时间**: 2024年
**版本**: 2.0.0
