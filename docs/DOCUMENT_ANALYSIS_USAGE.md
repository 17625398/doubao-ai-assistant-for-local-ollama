# 文档智能分析功能使用指南

## 功能概述

文档智能分析功能基于本地大语言模型（Ollama），支持对 PDF、Word、Excel、文本等多种格式的文档进行深度语义分析。

## 核心特性

### 🎯 5种分析模式

1. **全文摘要** - 智能提取文档核心内容和要点
2. **结构提取** - 分析文档章节结构和层次关系
3. **关键信息抽取** - 抽取实体、日期、数字等关键信息
4. **问答模式** - 基于文档内容回答您的问题
5. **对比分析** - 对比多个文档的异同点

### 📄 支持的文档格式

- PDF (.pdf)
- Word (.doc, .docx)
- Excel (.xls, .xlsx)
- 文本文件 (.txt)
- Markdown (.md)

## 使用方法

### 方式一：从首页入口进入（推荐）

1. 打开豆包AI助手首页
2. 滚动到"高级功能"区域
3. 点击"📄 **文档智能分析**"按钮
4. 上传您的文档
5. 选择分析模式
6. 点击"开始分析"

### 方式二：通过快捷操作

```typescript
import { DocumentAnalysisPanel } from '@/components/DocumentAnalysisPanel'

// 在您的组件中使用
<DocumentAnalysisPanel onClose={() => setShow(false)} />
```

## 代码示例

### 基本使用

```typescript
import { DocumentAnalyzer } from '@/components/DocumentAnalyzer'

const MyComponent = () => {
  const handleAnalysisComplete = (result, llmResult) => {
    console.log('分析结果:', result)
    console.log('AI回复:', llmResult)
  }

  return (
    <DocumentAnalyzer
      document={selectedFile}
      onAnalysisComplete={handleAnalysisComplete}
    />
  )
}
```

### 编程式调用

```typescript
import { DocumentAnalysisService, setOllamaConfig } from '@core/services/document-analysis-service'

// 配置 Ollama（可选）
setOllamaConfig({
  baseUrl: 'http://localhost:11434',
  model: 'qwen2.5:latest',
  temperature: 0.7,
  maxTokens: 2048
})

// 创建服务实例
const service = new DocumentAnalysisService()

// 解析文档
const content = await service.parseDocument(file)
console.log('文档内容:', content.text)

// 执行完整分析
const { content, llmResult, analysisResult } = await service.fullAnalysis(
  file,
  'summary',  // 分析模式
  undefined    // 自定义问题（仅问答模式需要）
)

console.log('AI分析结果:', llmResult)
console.log('结构化结果:', analysisResult)
```

## API 参考

### DocumentAnalysisService

#### 主要方法

| 方法 | 说明 | 参数 | 返回值 |
|------|------|------|--------|
| `parseDocument(file)` | 解析文档 | `File` | `Promise<DocumentContent>` |
| `analyzeDocument(content, options)` | 本地分析 | `DocumentContent`, `AnalysisOptions` | `Promise<AnalysisResult>` |
| `fullAnalysis(file, mode, question?)` | 完整分析（使用LLM） | `File`, `AnalysisMode`, `string?` | `Promise<{content, llmResult, analysisResult}>` |
| `analyzeWithLLM(content, mode, question?)` | LLM语义分析 | `DocumentContent`, `AnalysisMode`, `string?` | `Promise<string>` |

#### 配置方法

```typescript
// 设置 Ollama 配置
setOllamaConfig({
  baseUrl: 'http://localhost:11434',  // Ollama 服务地址
  model: 'qwen2.5:latest',            // 使用的模型
  temperature: 0.7,                   // 温度参数
  maxTokens: 2048                      // 最大 token 数
})

// 获取当前配置
const config = getOllamaConfig()
```

### AnalysisMode 类型

```typescript
type AnalysisMode = 
  | 'summary'      // 全文摘要
  | 'structure'    // 结构提取
  | 'extraction'   // 关键信息抽取
  | 'qa'           // 问答模式
  | 'compare'      // 对比分析
```

### AnalysisResult 接口

```typescript
interface AnalysisResult {
  summary: string                    // 摘要
  keyPoints: string[]               // 关键点
  topics: string[]                   // 主题词
  sentiment?: string                // 情感分析
  entities?: Array<{                // 实体列表
    name: string
    type: string
  }>
  questions?: string[]              // 生成的问题
}
```

## 技术架构

```
DocumentAnalysisPanel (UI)
    ↓
DocumentAnalyzer (组件逻辑)
    ↓
DocumentAnalysisService (核心服务)
    ├─ parseDocument() - 文档解析
    │   ├─ PDFDocumentParser (pdfjs-dist)
    │   ├─ WordDocumentParser (mammoth)
    │   └─ TextParser (原生)
    │
    └─ fullAnalysis() - 完整分析
        ├─ parseDocument() - 解析文档
        ├─ analyzeWithLLM() - LLM语义分析
        │   └─ Ollama API (/api/chat)
        └─ parseLLMResult() - 解析结果
```

## 注意事项

### 性能优化

1. **大文档处理**：系统会自动分块处理长文档
2. **内存管理**：及时释放不再使用的文档内容
3. **流式响应**：支持 Ollama 流式输出（未来版本）

### 常见问题

#### Q: Ollama 服务无法连接？

```bash
# 检查 Ollama 是否运行
curl http://localhost:11434/api/tags

# 如果未运行，启动 Ollama
ollama serve

# 下载模型（如需要）
ollama pull qwen2.5:latest
```

#### Q: 文档解析失败？

- 检查文件是否损坏
- 确认文件格式是否支持
- 检查文件大小是否超过 50MB

#### Q: 分析结果不准确？

- 尝试调整 Ollama 模型的 temperature 参数
- 使用更大的模型（如 qwen2.5:14b）
- 确保 Ollama 服务正常运行

### 最佳实践

1. **选择合适的模型**：根据文档复杂度和分析需求选择模型
2. **批量处理**：对于多个文档，建议逐个分析以避免资源竞争
3. **结果验证**：AI 分析结果仅供参考，请结合原始文档验证
4. **隐私保护**：所有处理都在本地完成，数据不会上传到云端

## 更新日志

### v2.6.1 (当前版本)

✨ **新增功能**

- 5种智能分析模式（摘要、结构、抽取、问答、对比）
- 支持本地 Ollama LLM 语义分析
- PDF 文档深度解析（使用 pdfjs-dist）
- Word 文档解析（使用 mammoth）
- 实时进度显示
- 错误处理和友好提示

🐛 **问题修复**

- 修复了文档解析的占位符问题
- 完善了 Ollama 集成逻辑
- 优化了用户界面交互

## 相关文档

- [Ollama 配置指南](./OLLAMA_CONFIG.md)
- [文档解析器文档](./DOCUMENT_PARSING.md)
- [项目架构说明](../README.md)

## 技术支持

如遇到问题，请：

1. 查看浏览器控制台错误信息
2. 检查 Ollama 服务状态
3. 确认模型是否已下载
4. 查看 [项目 Issue](https://github.com/your-repo/issues)

---

**版本**: v2.6.1  
**更新日期**: 2026-04-28  
**维护者**: Doubao AI Team
