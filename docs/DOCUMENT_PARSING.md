# 文档解析功能文档

## 概述

豆包 AI 助手的文档解析功能支持多种文档格式的解析和处理，包括 PDF、Word、Excel、PowerPoint、文本和图像文件。通过集成各种解析库，实现了文档内容的提取、结构化分析和 AI 辅助处理。

## 支持的文档格式

- **PDF**: 支持文本、图像和表格的提取
- **Word**: 支持文本和格式的提取
- **Excel**: 支持表格数据的提取
- **PowerPoint**: 支持幻灯片内容的提取
- **文本文件**: 支持 TXT、MD、HTML 等文本格式
- **图像文件**: 支持 JPG、PNG、GIF、WebP 等图像格式，包含 OCR 功能

## 核心组件

### 1. 文档解析器

文档解析器是文档处理的核心组件，负责识别文档类型并调用相应的解析器进行处理。

#### 主要类和方法

- **BaseDocumentParser**: 基础解析器类，提供通用的解析方法
- **TextDocumentParser**: 文本文件解析器
- **PDFDocumentParser**: PDF 文件解析器
- **WordDocumentParser**: Word 文件解析器
- **ExcelDocumentParser**: Excel 文件解析器
- **PowerPointDocumentParser**: PowerPoint 文件解析器
- **ImageDocumentParser**: 图像文件解析器
- **DocumentParserUtil**: 文档解析工具类，提供便捷的解析方法

#### 使用示例

```typescript
import { DocumentParserUtil, ParseOptions } from '@doubao/core';

// 解析 PDF 文档
const parseOptions: ParseOptions = {
  extractText: true,
  enableChunking: true,
  chunkSize: 2000,
  chunkOverlap: 200,
  enableCache: true,
};

const file = document.getElementById('fileInput').files[0];
const result = await DocumentParserUtil.parse(file, parseOptions);

if (result.success) {
  console.log('文档解析成功:', result.metadata);
  console.log('文档内容:', result.text);
} else {
  console.error('文档解析失败:', result.error);
}
```

### 2. AI 文档处理器

AI 文档处理器提供了基于 AI 的文档分析功能，包括文档问答、摘要生成、关键信息提取等。

#### 主要类和方法

- **AIDocumentProcessor**: AI 文档处理器类
  - `vectorizeDocument`: 向量化文档内容
  - `retrieveRelevantContent`: 语义检索相关内容
  - `answerDocumentQuestion`: 回答文档相关问题
  - `generateDocumentSummary`: 生成文档摘要
  - `extractKeyInformation`: 提取文档关键信息
  - `processMultilingualDocument`: 处理多语言文档

#### 使用示例

```typescript
import { aiDocumentProcessor } from '@doubao/core';

// 生成文档摘要
const summary = await aiDocumentProcessor.generateDocumentSummary(parseResult, {
  summaryLength: 'medium',
});
console.log('文档摘要:', summary);

// 回答文档相关问题
const answer = await aiDocumentProcessor.answerDocumentQuestion(
  '文档的主要内容是什么？',
  parseResult,
  {
    includeReferences: true,
  }
);
console.log('问题答案:', answer.answer);
console.log('参考内容:', answer.references);
```

### 3. 缓存管理器

缓存管理器用于缓存文档解析结果，提高系统性能。

#### 主要类和方法

- **CacheManager**: 缓存管理器类
  - `set`: 设置缓存
  - `get`: 获取缓存
  - `delete`: 删除缓存
  - `clear`: 清空缓存
  - `cleanup`: 清理过期缓存

### 4. 插件系统

插件系统支持扩展文档解析功能，允许添加自定义的解析器和处理器。

#### 主要类和方法

- **PluginManager**: 插件管理器类
  - `registerPlugin`: 注册插件
  - `unregisterPlugin`: 卸载插件
  - `getPluginsByType`: 获取指定类型的插件

#### 创建和注册插件示例

```typescript
import { createDocumentParserPlugin, pluginManager, DocumentParser, DocumentType } from '@doubao/core';

// 创建自定义文档解析器
class CustomParser implements DocumentParser {
  supportedTypes = [DocumentType.TEXT];
  
  async detectType(file: File | ArrayBuffer | string) {
    return DocumentType.TEXT;
  }
  
  async parse(file: File | ArrayBuffer | string, options?) {
    // 实现解析逻辑
  }
  
  async parseMetadata(file: File | ArrayBuffer | string) {
    // 实现元数据解析逻辑
  }
  
  async extractText(file: File | ArrayBuffer | string, options?) {
    // 实现文本提取逻辑
  }
  
  async extractTables(file: File | ArrayBuffer | string, options?) {
    return [];
  }
  
  async extractImages(file: File | ArrayBuffer | string, options?) {
    return [];
  }
  
  chunkDocument(content: string, chunkSize?, chunkOverlap?) {
    return [];
  }
}

// 创建插件
const customPlugin = createDocumentParserPlugin(
  {
    name: 'custom-parser',
    version: '1.0.0',
    description: '自定义文档解析器',
    author: 'Your Name',
  },
  new CustomParser()
);

// 注册插件
await pluginManager.registerPlugin(customPlugin);
```

## 前端组件

### 1. DocumentUploader

文档上传组件，支持拖放上传和批量处理。

#### 使用示例

```tsx
import DocumentUploader from '@/components/DocumentUploader';

function MyComponent() {
  const handleDocumentUpload = async (file: File) => {
    // 处理单个文件上传
  };

  const handleDocumentsUpload = async (files: File[]) => {
    // 处理批量文件上传
  };

  return (
    <DocumentUploader
      onDocumentUpload={handleDocumentUpload}
      onDocumentsUpload={handleDocumentsUpload}
    />
  );
}
```

### 2. DocumentProcessingStatus

文档处理状态组件，显示处理进度和结果。

#### 使用示例

```tsx
import DocumentProcessingStatus from '@/components/DocumentProcessingStatus';

function MyComponent() {
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [status, setStatus] = useState('');
  const [error, setError] = useState<string | undefined>();

  return (
    <DocumentProcessingStatus
      isProcessing={isProcessing}
      progress={progress}
      status={status}
      error={error}
    />
  );
}
```

### 3. DocumentHistory

文档处理历史组件，显示用户之前处理过的文档。

#### 使用示例

```tsx
import DocumentHistory from '@/components/DocumentHistory';

function MyComponent() {
  const [history, setHistory] = useState([]);

  const handleSelectDocument = (item) => {
    // 处理文档选择
  };

  const handleDeleteDocument = (id) => {
    // 处理文档删除
  };

  return (
    <DocumentHistory
      history={history}
      onSelectDocument={handleSelectDocument}
      onDeleteDocument={handleDeleteDocument}
    />
  );
}
```

## 性能优化

1. **缓存机制**: 使用缓存管理器缓存解析结果，避免重复解析
2. **分块处理**: 对大文档进行分块处理，减少内存使用
3. **并行处理**: 支持批量文档的并行处理
4. **增量解析**: 支持大文档的增量解析和断点续传

## 扩展和定制

1. **添加新的文档格式支持**: 通过插件系统添加自定义解析器
2. **自定义 AI 处理逻辑**: 扩展 AI 文档处理器的功能
3. **添加新的 UI 组件**: 扩展前端界面功能

## 常见问题和解决方案

### 1. 文档解析失败

- **原因**: 文档格式不支持或损坏
- **解决方案**: 检查文档格式，确保使用支持的格式

### 2. 解析速度慢

- **原因**: 文档过大或系统资源不足
- **解决方案**: 启用缓存，使用分块处理，优化系统资源

### 3. OCR 识别不准确

- **原因**: 图像质量差或字体特殊
- **解决方案**: 提高图像质量，使用更准确的 OCR 模型

### 4. 内存使用过高

- **原因**: 处理大文档时内存消耗过大
- **解决方案**: 启用分块处理，优化内存管理

## 总结

豆包 AI 助手的文档解析功能提供了强大的文档处理能力，支持多种格式的文档解析和 AI 辅助分析。通过模块化的设计和插件系统，实现了高度的可扩展性和灵活性。用户可以根据自己的需求定制和扩展文档处理功能，满足不同场景的需求。