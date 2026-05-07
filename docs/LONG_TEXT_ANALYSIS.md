# 长文本分析和网页内容提取技术文档

## 概述

本文档详细描述了长文本分析和网页内容提取功能的技术实现，包括核心服务、API接口、使用方法和最佳实践。

## 核心服务

### 1. TextChunkingService - 文本分块服务

#### 功能描述
- 支持基于字符、句子和段落的分块策略
- 提供token数量估计和优化分块功能
- 实现了智能分块算法，根据文本长度和类型自动调整

#### API接口

```typescript
// 基于字符的分块
chunkText(text: string, chunkSize: number = 1000, overlap: number = 100): string[]

// 基于句子的智能分块
chunkBySentences(text: string, chunkSize: number = 1000, overlap: number = 100): string[]

// 基于段落的分块
chunkByParagraphs(text: string): string[]

// 估计token数量
estimateTokenCount(text: string): number

// 优化分块策略
optimizeChunks(text: string, maxTokens: number = 2000): string[]
```

#### 使用示例

```typescript
import { TextChunkingService } from '../services/text-chunking-service';

const chunkingService = new TextChunkingService();
const longText = 'This is a long text that needs to be chunked. '.repeat(100);
const chunks = chunkingService.chunkText(longText, 500, 100);
console.log(`Number of chunks: ${chunks.length}`);
```

### 2. WebContentExtractionPipeline - 网页内容提取管道

#### 功能描述
- 从URL和HTML中提取内容、标题和元数据
- 支持特定元素和链接的提取
- 已优化为浏览器兼容，使用内置fetch API

#### API接口

```typescript
// 从URL提取内容
extractFromUrl(url: string): Promise<{ content: string; title: string; metadata: Record<string, string> }>

// 从HTML提取内容
extractFromHtml(html: string): { content: string; title: string; metadata: Record<string, string> }

// 提取特定元素
extractElement(html: string, selector: string): string

// 提取链接
extractLinks(html: string): Array<{ text: string; href: string }>
```

#### 使用示例

```typescript
import { WebContentExtractionPipeline } from '../services/web-content-extraction-pipeline';

const pipeline = new WebContentExtractionPipeline();
const result = await pipeline.extractFromUrl('https://example.com');
console.log(`Title: ${result.title}`);
console.log(`Content: ${result.content.substring(0, 200)}...`);
```

### 3. LocalStorageService - 本地存储服务

#### 功能描述
- 实现Local-First数据存储机制
- 支持分析结果和提取内容的缓存
- 提供键值对存储和管理功能

#### API接口

```typescript
// 存储数据
set<T>(key: string, value: T): void

// 获取数据
get<T>(key: string, defaultValue: T): T

// 移除数据
remove(key: string): void

// 清空所有数据
clear(): void

// 获取所有键
getKeys(): string[]

// 检查存储是否存在
has(key: string): boolean

// 存储分析结果
storeAnalysisResult(id: string, result: any): void

// 获取分析结果
getAnalysisResult(id: string): any

// 存储提取的网页内容
storeExtractedContent(url: string, content: any): void

// 获取提取的网页内容
getExtractedContent(url: string): any
```

#### 使用示例

```typescript
import { LocalStorageService } from '../services/local-storage-service';

const storageService = new LocalStorageService();
storageService.set('userPreferences', { theme: 'dark', fontSize: 16 });
const preferences = storageService.get('userPreferences', { theme: 'light', fontSize: 14 });
```

### 4. TextSummaryService - 文本摘要服务

#### 功能描述
- 实现提取式摘要（基于TextRank算法）
- 支持生成式摘要（模拟实现）
- 提供摘要长度和格式控制

#### API接口

```typescript
// 生成摘要
generateSummary(text: string, type: 'extractive' | 'abstractive' = 'extractive', length: number = 5): Promise<string>

// 生成摘要（高级选项）
generateSummaryWithOptions(text: string, options: {
  type: 'extractive' | 'abstractive';
  length: number;
  language?: string;
  format?: 'plain' | 'bullet' | 'paragraph';
}): Promise<string>
```

#### 使用示例

```typescript
import { TextSummaryService } from '../services/text-summary-service';

const summaryService = new TextSummaryService();
const text = 'This is a test text. It contains multiple sentences. The summary service should extract the most important parts. This is another sentence to make the text longer. The summary should be concise and capture the main ideas.';
const summary = await summaryService.generateSummary(text, 'extractive', 2);
console.log(`Summary: ${summary}`);
```

### 5. StructuredInformationExtractionService - 结构化信息提取服务

#### 功能描述
- 支持提取人物、组织、地点、日期、数值等实体
- 实现实体之间关系的提取
- 提供自定义实体提取功能

#### API接口

```typescript
// 提取结构化信息
extractStructuredInformation(text: string): {
  entities: Entity[];
  relationships: Relationship[];
}

// 提取自定义实体
extractCustomEntities(text: string, patterns: Array<{ type: string; pattern: RegExp }>): Entity[]
```

#### 使用示例

```typescript
import { StructuredInformationExtractionService } from '../services/structured-information-extraction-service';

const extractionService = new StructuredInformationExtractionService();
const text = 'Barack Obama was born in Hawaii. He was the 44th President of the United States.';
const result = extractionService.extractStructuredInformation(text);
console.log('Entities:', result.entities);
console.log('Relationships:', result.relationships);
```

### 6. WebContentExtractionService - 网页内容提取服务

#### 功能描述
- 整合网页内容提取功能
- 提供内容清洗、结构化提取、批量提取等功能
- 集成缓存机制

#### API接口

```typescript
// 从URL提取内容
extractFromUrl(url: string, options: ExtractionOptions = {}): Promise<ExtractionResult>

// 从HTML提取内容
extractFromHtml(html: string, options: ExtractionOptions = {}): ExtractionResult

// 提取特定元素
extractElement(url: string, selector: string): Promise<string>

// 提取链接
extractLinks(url: string): Promise<Array<{ text: string; href: string }>>

// 批量提取多个URL的内容
batchExtract(urls: string[], options: ExtractionOptions = {}): Promise<Array<{ url: string; result: ExtractionResult }>>

// 提取当前页面内容
extractContent(options: any = {}): ExtractionResult

// 获取页面信息
getPageInfo(): { url: string; title: string; length: number; wordCount: number }

// 提取选中文本
extractSelection(): { text: string } | null
```

#### 使用示例

```typescript
import { WebContentExtractionService } from '../services/web-content-extraction-service';

const webService = new WebContentExtractionService();
const result = await webService.extractFromUrl('https://example.com', {
  cleanContent: true,
  structured: true
});
console.log(`Title: ${result.title}`);
console.log(`Content: ${result.content.substring(0, 200)}...`);
```

### 7. JSHeavyWebProcessingService - JavaScript-heavy网页处理服务

#### 功能描述
- 使用playwright实现动态内容的渲染和提取
- 支持滚动加载、等待选择器、批量处理等功能
- 已优化为浏览器兼容，仅在Node.js环境加载playwright

#### API接口

```typescript
// 处理JavaScript-heavy网页
processJSHeavyPage(url?: string, options: JSHeavyProcessingOptions = {}): Promise<ExtractionResult>

// 提取特定元素
extractElement(url: string, selector: string, options: JSHeavyProcessingOptions = {}): Promise<string>

// 提取链接
extractLinks(url: string, options: JSHeavyProcessingOptions = {}): Promise<Array<{ text: string; href: string }>>

// 批量处理多个JavaScript-heavy网页
batchProcess(urls: string[], options: JSHeavyProcessingOptions = {}): Promise<Array<{ url: string; result: ExtractionResult }>>

// 关闭浏览器
closeBrowser(): Promise<void>
```

#### 使用示例

```typescript
import { JSHeavyWebProcessingService } from '../services/js-heavy-web-processing-service';

// 仅在Node.js环境使用
if (typeof window === 'undefined') {
  const jsService = new JSHeavyWebProcessingService();
  const result = await jsService.processJSHeavyPage('https://example.com', {
    waitUntil: 'networkidle',
    scrollToLoad: true,
    scrollTimes: 3
  });
  console.log(`Title: ${result.title}`);
  console.log(`Content: ${result.content.substring(0, 200)}...`);
  await jsService.closeBrowser();
}
```

### 8. MultiFormatSupportService - 多格式支持服务

#### 功能描述
- 整合现有的文档解析器
- 支持PDF、TXT、HTML、Markdown、Word、Excel、PowerPoint、图片等多种格式
- 提供统一的文档解析接口

#### API接口

```typescript
// 解析文档
parseDocument(file: string | ArrayBuffer): Promise<DocumentParseResult>

// 根据文件扩展名获取内容类型
getContentTypeFromFilename(filename: string): string

// 获取支持的文件格式
getSupportedFormats(): Array<{
  extension: string;
  contentType: string;
  description: string;
}>

// 批量解析多个文档
batchParse(files: Array<{
  file: string | ArrayBuffer;
}>): Promise<Array<{
  index: number;
  document: DocumentParseResult;
  error?: string;
}>>

// 获取所有支持的文档类型
getSupportedTypes(): DocumentType[]
```

#### 使用示例

```typescript
import { MultiFormatSupportService } from '../services/multi-format-support-service';

const formatService = new MultiFormatSupportService();
const result = await formatService.parseDocument('path/to/document.pdf');
console.log(`Content: ${result.content}`);
console.log(`Metadata: ${result.metadata}`);
```

### 9. MultiEngineSchedulerService - 多引擎统一调度服务

#### 功能描述
- 集成HTTP、CDP、Dynamic、Stealth、CLIBrowser等引擎
- 实现智能引擎选择、健康监控和自动降级机制
- 已优化为浏览器兼容，仅在Node.js环境注册高级引擎

#### API接口

```typescript
// 调度引擎处理请求
schedule(url: string, options: ExtractionOptions = {}): Promise<ExtractionResult>

// 获取引擎健康状态
getEngineHealth(): Map<string, EngineHealth>

// 添加自定义引擎
addEngine(name: string, engine: WebEngine): void

// 移除引擎
removeEngine(name: string): void

// 添加站点到注册表
addSiteToRegistry(domain: string, engine: string): void

// 从注册表中移除站点
removeSiteFromRegistry(domain: string): void

// 获取所有引擎
getEngines(): Map<string, WebEngine>

// 获取站点注册表
getSiteRegistry(): Map<string, string>
```

#### 使用示例

```typescript
import { MultiEngineSchedulerService } from '../services/multi-engine-scheduler-service';

const schedulerService = new MultiEngineSchedulerService();
const result = await schedulerService.schedule('https://example.com');
console.log(`Title: ${result.title}`);
console.log(`Content: ${result.content.substring(0, 200)}...`);
```

## 技术实现要点

### 1. 浏览器兼容性

所有服务都已优化为浏览器兼容，避免使用Node.js特定模块：
- 使用条件导入，仅在Node.js环境加载Playwright等依赖
- 使用内置fetch API替代node-fetch
- 提供浏览器环境的降级实现

### 2. 模块化设计

采用模块化设计，每个功能都被封装为独立的服务：
- 便于维护和扩展
- 支持按需加载
- 减少依赖冲突

### 3. 性能优化

实现了多种性能优化策略：
- 文本分块，减少内存消耗
- 缓存机制，避免重复处理
- 批量处理，提高处理效率
- 智能引擎选择，优化提取速度

### 4. 错误处理

完善的错误处理机制：
- 优雅处理网络错误
- 智能降级到备用引擎
- 详细的错误信息
- 重试机制

### 5. 可扩展性

支持自定义扩展：
- 自定义文档解析器
- 自定义Web引擎
- 自定义实体提取模式
- 自定义分块策略

### 6. Local-First原则

数据优先存储在本地：
- 保护用户隐私
- 支持离线访问
- 提高响应速度
- 减少网络依赖

## 技术栈

- **前端**：TypeScript、React、Next.js
- **后端**：Node.js
- **NLP库**：内置文本处理算法
- **网页内容提取**：Cheerio、Playwright
- **文档解析**：集成现有文档解析器
- **存储**：LocalStorage

## 使用最佳实践

### 1. 长文本处理

- 使用`TextChunkingService`对长文本进行分块处理，避免内存溢出
- 根据模型的token限制选择合适的分块大小
- 使用`optimizeChunks`方法自动优化分块策略

### 2. 网页内容提取

- 对于静态网页，使用`WebContentExtractionService`的`extractFromUrl`方法
- 对于动态网页，使用`JSHeavyWebProcessingService`的`processJSHeavyPage`方法
- 使用`batchExtract`方法批量处理多个URL，提高效率

### 3. 文本摘要

- 对于长文本，先分块再分别生成摘要，最后合并
- 使用`generateSummaryWithOptions`方法自定义摘要格式
- 对于重要内容，使用提取式摘要以保证准确性

### 4. 结构化信息提取

- 结合自定义实体提取模式，提高提取准确性
- 对于复杂文本，先进行分块处理，再分别提取结构化信息
- 使用提取的结构化信息构建知识图谱

### 5. 多格式支持

- 使用`MultiFormatSupportService`统一处理不同格式的文档
- 对于大型文档，先解析为文本，再进行分块处理
- 结合文档类型选择合适的分析策略

### 6. 多引擎调度

- 使用`MultiEngineSchedulerService`自动选择最优引擎
- 对于复杂网站，添加到站点注册表以优化引擎选择
- 监控引擎健康状态，及时调整引擎策略

## 部署和集成

### 安装依赖

```bash
# 安装核心依赖
npm install

# 安装Playwright（仅在Node.js环境需要）
npm install playwright
npx playwright install
```

### 集成到现有项目

```typescript
// 导入所需服务
import {
  TextChunkingService,
  TextSummaryService,
  StructuredInformationExtractionService,
  WebContentExtractionService,
  MultiFormatSupportService,
  MultiEngineSchedulerService
} from '@your-package/core';

// 创建服务实例
const chunkingService = new TextChunkingService();
const summaryService = new TextSummaryService();
const extractionService = new StructuredInformationExtractionService();
const webService = new WebContentExtractionService();
const formatService = new MultiFormatSupportService();
const schedulerService = new MultiEngineSchedulerService();

// 使用服务
const chunks = chunkingService.chunkText(longText);
const summary = await summaryService.generateSummary(longText);
const structuredInfo = extractionService.extractStructuredInformation(longText);
const webContent = await webService.extractFromUrl('https://example.com');
```

### 浏览器环境注意事项

- `JSHeavyWebProcessingService`仅在Node.js环境可用
- 在浏览器环境中，部分高级功能可能受限
- 确保使用HTTPS连接，避免混合内容问题
- 注意浏览器的CORS限制，可能需要配置代理

## 故障排除

### 1. Playwright相关错误

- **错误**：`Module not found: Can't resolve 'net'`
- **原因**：Playwright试图在浏览器环境中加载Node.js特定模块
- **解决**：确保仅在Node.js环境中使用`JSHeavyWebProcessingService`

### 2. 网页内容提取失败

- **错误**：`Failed to extract content from URL`
- **原因**：网络问题、网站反爬虫、页面结构复杂
- **解决**：
  - 检查网络连接
  - 使用`MultiEngineSchedulerService`尝试不同引擎
  - 调整提取选项，如增加超时时间

### 3. 内存溢出

- **错误**：`JavaScript heap out of memory`
- **原因**：处理的文本过大，超出内存限制
- **解决**：
  - 使用`TextChunkingService`对长文本进行分块
  - 增加Node.js内存限制：`NODE_OPTIONS=--max-old-space-size=4096`
  - 分批处理大型文档

### 4. 服务初始化失败

- **错误**：`TextSummaryService is undefined`
- **原因**：服务模块加载顺序问题
- **解决**：使用动态导入和延迟初始化，参考`chatclaw-chat-integration-service.ts`的实现

## 总结

长文本分析和网页内容提取功能已实现核心服务，包括文本分块、网页内容提取、本地存储、文本摘要、结构化信息提取、JavaScript-heavy网页处理、多格式支持和多引擎统一调度等功能。这些服务提供了强大的文本处理和网页内容提取能力，可用于各种应用场景，如研究分析、内容创作、数据采集等。

通过模块化设计、性能优化和浏览器兼容性处理，这些服务可以在不同环境中灵活使用，为用户提供高效、准确的文本分析和网页内容提取体验。