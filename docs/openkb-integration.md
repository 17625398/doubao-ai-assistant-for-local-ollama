# OpenKB 集成使用文档

## 概述

OpenKB 是一个开源的知识库系统，可以将原始文档编译成结构化的、相互链接的 wiki 风格知识库。本集成将 OpenKB 功能嵌入到 Doubao 应用程序中，提供以下能力：

- **文档到知识库的自动转换**：上传的文档自动编译为 wiki 格式
- **长文档的向量无关检索**：使用 PageIndex 进行树状索引检索
- **原生多模态理解**：理解图表、表格、图片、代码、公式等内容
- **自动生成文档摘要和概念页面**：提取关键概念和交叉引用
- **知识库查询和聊天**：在聊天中查询知识库内容
- **智能文档分块**：支持多种分块策略优化长文档处理
- **索引持久化**：自动保存和加载索引，提升性能
- **浏览器沙箱支持**：通过沙箱方案在浏览器环境中使用 OpenKB

## 安装

### 1. 安装 OpenKB CLI

OpenKB 是 Python CLI 工具，需要使用 pip 安装：

```bash
# 安装 OpenKB
pip install openkb

# 验证安装
openkb --help
```

### 2. 配置知识库目录

知识库目录位于：`d:\Doubao\refactored\knowledge-base`

首次使用时，系统会自动创建该目录并初始化知识库。

### 3. 初始化知识库

通过 Web 界面的"OpenKB 知识库浏览器"点击"初始化知识库"按钮，或运行：

```bash
cd d:\Doubao\refactored\knowledge-base
openkb init
```

## 运行环境支持

### Node.js 环境（完整功能）

在 Node.js 环境中，OpenKB 提供完整功能：

- ✅ 本地文件系统操作
- ✅ 直接调用 OpenKB CLI
- ✅ PageIndex 自动构建
- ✅ 索引持久化到磁盘

### 浏览器环境（沙箱模式）

在浏览器环境中，通过**沙箱服务**使用 OpenKB：

- ✅ 文件存储在内存中
- ✅ 通过 API 调用后端服务
- ✅ 透明的用户体验
- ⚠️ 需要后端 API 支持

## 浏览器沙箱方案

### 架构

```
浏览器环境
    ↓
OpenKB 沙箱服务 (OpenKBSandboxService)
    ├─ 文件存储在内存中 (Map)
    ├─ 通过 API 调用后端
    └─ 支持文件上传、查询等操作
    ↓
后端 API (/api/openkb/*)
    ├─ /add - 添加文档到 OpenKB
    └─ /query - 查询知识库
    ↓
OpenKB 服务 (Node.js)
    ↓
知识库处理
```

### 自动环境检测

系统自动检测运行环境并选择合适的模式：

```typescript
// 自动检测环境
const isNodeEnvironment = typeof process !== 'undefined' && process.versions?.node

if (isNodeEnvironment) {
  // 使用原生 OpenKB 服务
  await openKBService.addDocument(filePath)
} else {
  // 使用沙箱服务
  const uploadResult = await openKBSandboxService.uploadFile(file)
  await openKBSandboxService.addDocument(uploadResult.fileId, fileName)
}
```

### 沙箱服务 API

#### 上传文件到沙箱

```typescript
import { openKBSandboxService } from '@ai-intelligent-analysis-platform/core'

const uploadResult = await openKBSandboxService.uploadFile(file)
if (uploadResult.success) {
  console.log('文件 ID:', uploadResult.fileId)
}
```

#### 添加文档到 OpenKB

```typescript
const addResult = await openKBSandboxService.addDocument(uploadResult.fileId, 'document.pdf')

if (addResult.success) {
  console.log('文档 ID:', addResult.documentId)
}
```

#### 查询知识库

```typescript
const queryResult = await openKBSandboxService.query('什么是机器学习？')

if (queryResult.success) {
  console.log('回答:', queryResult.answer)
  console.log('来源:', queryResult.sources)
}
```

### 需要实现的后端 API

要在浏览器环境中使用 OpenKB，需要实现以下后端 API：

#### 1. 添加文档 API

```typescript
// POST /api/openkb/add
// Content-Type: multipart/form-data

// Request:
{
  file: File,        // PDF 文件
  fileName: string   // 文件名
}

// Response:
{
  success: true,
  documentId: string,
  summaryPath: string
}
```

#### 2. 查询知识库 API

```typescript
// POST /api/openkb/query
// Content-Type: application/json

// Request:
{
  question: string   // 查询问题
}

// Response:
{
  success: true,
  answer: string,
  sources: string[]
}
```

### 后端 API 实现

后端 API 路由已创建，位于 `packages/web/src/app/api/openkb/` 目录：

#### 文件结构

```
packages/web/src/app/api/openkb/
├── add/
│   └── route.ts    # POST /api/openkb/add
└── query/
    └── route.ts    # POST /api/openkb/query
```

#### API 端点 1: 添加文档

**文件**: `packages/web/src/app/api/openkb/add/route.ts`

```typescript
import { openKBService } from '@ai-intelligent-analysis-platform/core'
import { writeFile } from 'fs/promises'
import { join } from 'path'
import { tmpdir } from 'os'

export async function POST(request: Request) {
  try {
    // 解析 FormData
    const formData = await request.formData()
    const file = formData.get('file') as File
    const fileName = formData.get('fileName') as string

    // 读取文件内容
    const arrayBuffer = await file.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)

    // 保存到临时文件
    const tempPath = join(tmpdir(), `openkb-${Date.now()}-${fileName}`)
    await writeFile(tempPath, buffer)

    // 添加到 OpenKB
    const result = await openKBService.addDocument(tempPath)

    return Response.json(result)
  } catch (error) {
    return Response.json({ success: false, error: error.message }, { status: 500 })
  }
}
```

**功能**:

- 接收 multipart/form-data 格式的文件上传
- 将文件保存到系统临时目录
- 调用 OpenKB 服务添加文档
- 返回文档 ID 和摘要路径

#### API 端点 2: 查询知识库

**文件**: `packages/web/src/app/api/openkb/query/route.ts`

```typescript
import { openKBService } from '@ai-intelligent-analysis-platform/core'

export async function POST(request: Request) {
  try {
    // 解析请求体
    const { question } = await request.json()

    // 查询 OpenKB
    const result = await openKBService.query(question)

    return Response.json(result)
  } catch (error) {
    return Response.json({ success: false, error: error.message }, { status: 500 })
  }
}
```

**功能**:

- 接收 JSON 格式的查询请求
- 调用 OpenKB 服务查询知识库
- 返回答案和来源信息

#### 测试 API

可以使用 curl 或 PowerShell 测试 API：

**Bash (Linux/macOS/Git Bash):**

```bash
# 测试添加文档
curl -X POST http://localhost:3000/api/openkb/add \
  -F "file=@document.pdf" \
  -F "fileName=document.pdf"

# 测试查询知识库
curl -X POST http://localhost:3000/api/openkb/query \
  -H "Content-Type: application/json" \
  -d '{"question": "什么是机器学习？"}'
```

**PowerShell (Windows) - 需要 PowerShell 6.1+:**

```powershell
# 测试添加文档（需要 PowerShell 6.1+ 才支持 -Form 参数）
Invoke-WebRequest -Uri "http://localhost:3000/api/openkb/add" `
  -Method POST `
  -Form @{
    file = Get-Item -Path "C:\path\to\document.pdf"
    fileName = "document.pdf"
  }

# 测试查询知识库
Invoke-WebRequest -Uri "http://localhost:3000/api/openkb/query" `
  -Method POST `
  -ContentType "application/json" `
  -Body '{"question": "什么是机器学习？"}'
```

**注意**:

- 请将 `C:\path\to\document.pdf` 替换为实际的 PDF 文件路径
- PowerShell 5.1 及以下版本不支持 `-Form` 参数，建议使用 Bash 或升级 PowerShell

## 使用方法

### 1. 将文档添加到知识库

上传文档时，勾选"添加到 OpenKB 知识库"选项：

```typescript
const result = await chatClawDocumentService.uploadDocument(file, fileName, {
  addToOpenKB: true,
})
```

文档将被：

- 解析并提取文本
- 编译为 wiki 格式的知识库
- 生成文档摘要
- 提取关键概念和交叉引用
- 如果是长文档（>20页），使用 PageIndex 进行索引

### 2. 查询知识库

在聊天中使用 `/chatclaw openkb-query <问题>` 命令：

```
/chatclaw openkb-query 什么是人工智能？
```

系统将：

- 在知识库中检索相关信息
- 基于编译的知识生成回答
- 显示参考来源

### 3. 与知识库聊天

使用 `/chatclaw openkb-chat <消息>` 命令进行多轮对话：

```
/chatclaw openkb-chat 请解释这个概念
```

### 4. 查看知识库状态

使用 `/chatclaw openkb-status` 命令：

```
/chatclaw openkb-status
```

显示：

- 知识库初始化状态
- 文档数量
- Wiki 就绪状态

### 5. 使用知识库浏览器

在应用程序界面中打开知识库浏览器组件：

```typescript
import { KnowledgeBaseBrowser } from '@ai-intelligent-analysis-platform/web'

<KnowledgeBaseBrowser />
```

功能：

- 浏览所有 wiki 页面
- 查看文档摘要和概念页面
- 查询知识库
- 查看交叉引用

## PageIndex 长文档处理

PageIndex 是 OpenKB 的核心组件，专门用于处理长文档（20页以上）。

### 核心特性

1. **分层树状索引**：将长文档组织成 ROOT → CHAPTER → SECTION → PAGE 的树结构
2. **智能文档分块**：支持多种分块策略
3. **多模态内容识别**：自动检测表格、代码块、公式等
4. **索引持久化**：自动保存到磁盘，避免重复构建
5. **向量无关检索**：基于关键词和层级加权的推理式检索

### 分块策略

```typescript
enum ChunkingStrategy {
  FIXED_SIZE = 'fixed_size', // 固定大小分块
  SEMANTIC = 'semantic', // 基于语义的分块
  STRUCTURAL = 'structural', // 基于文档结构的分块
  HYBRID = 'hybrid', // 混合策略（推荐）
}
```

### 使用 PageIndex

```typescript
import { openKBService, ChunkingStrategy } from '@ai-intelligent-analysis-platform/core'

// 检查文档是否需要 PageIndex
const needPageIndex = openKBService.shouldUsePageIndex(100) // true

// 为长文档构建索引
const tree = await openKBService.buildPageIndex('doc-123', '人工智能论文.pdf', [
  { index: 0, content: '...', text: '...' },
  { index: 1, content: '...', text: '...' },
  // ... 更多页面
])

// 使用 PageIndex 检索
const results = await openKBService.searchWithPageIndex(
  'doc-123',
  '深度学习应用',
  5 // 返回前5个结果
)

// PageIndex 增强查询
const answer = await openKBService.queryWithPageIndex('什么是神经网络？', 'doc-123')

// 获取文档结构概览
const overview = openKBService.getPageIndexOverview('doc-123')
console.log(overview.structure)
```

## API 参考

### OpenKBService

#### 基础方法

##### `init(): Promise<boolean>`

初始化 OpenKB 知识库。

##### `addDocument(filePath: string): Promise<OpenKBAddResult>`

将文档添加到知识库。

**参数：**

- `filePath`: 文档文件路径

**返回：**

```typescript
{
  success: boolean
  documentId?: string
  summaryPath?: string
  error?: string
}
```

##### `query(question: string): Promise<OpenKBQueryResult>`

查询知识库。

**参数：**

- `question`: 查询问题

**返回：**

```typescript
{
  success: boolean
  answer?: string
  sources?: string[]
  error?: string
}
```

##### `chat(message: string, sessionId?: string): Promise<OpenKBChatResult>`

与知识库聊天。

**参数：**

- `message`: 聊天消息
- `sessionId`: 会话 ID（可选）

**返回：**

```typescript
{
  success: boolean
  messages?: OpenKBChatMessage[]
  error?: string
}
```

##### `chatWithKnowledgeBase(message: string, options?: OpenKBChatOptions): Promise<OpenKBChatResult>`

基于知识库的增强聊天功能。

**参数：**

- `message`: 聊天消息
- `options`: 配置选项
  - `sessionId`: 会话ID
  - `systemPrompt`: 系统提示词
  - `maxHistory`: 最大历史消息数
  - `includeSources`: 是否包含来源

#### PageIndex 方法

##### `shouldUsePageIndex(pageCount: number): boolean`

检查文档是否需要使用 PageIndex（默认阈值：20页）。

##### `buildPageIndex(documentId, title, pages, metadata?): Promise<PageIndexTree | null>`

为长文档构建 PageIndex 索引。

**参数：**

- `documentId`: 文档唯一标识
- `documentTitle`: 文档标题
- `pages`: 页面内容数组
- `metadata`: 可选元数据（字数、图片数、表格数）

**返回：**

```typescript
{
  documentId: string
  documentTitle: string
  totalPages: number
  root: PageIndexNode
  createdAt: number
  updatedAt: number
}
```

##### `searchWithPageIndex(documentId, query, maxResults?): Promise<PageIndexSearchResult[]>`

使用 PageIndex 检索文档。

**返回：**

```typescript
[{
  node: PageIndexNode
  relevance: number
  path: string[]
  context: string
}]
```

##### `queryWithPageIndex(question, documentId?): Promise<OpenKBQueryResult>`

PageIndex 增强的知识库查询。

##### `getPageIndexOverview(documentId): { title: string; structure: string } | null`

获取文档的树形结构概览。

##### `getPageIndexConfig(): PageIndexConfig`

获取 PageIndex 配置。

### PageIndexService

#### 直接使用 PageIndex 服务

```typescript
import { pageIndexService, ChunkingStrategy } from '@ai-intelligent-analysis-platform/core'

// 创建自定义配置的服务
const customService = new PageIndexService({
  threshold: 15, // 15页以上使用 PageIndex
  maxDepth: 5, // 最大5层深度
  maxPagesPerNode: 30, // 每节点最多30页
  chunkingStrategy: ChunkingStrategy.SEMANTIC, // 使用语义分块
  enableMultimodal: true, // 启用多模态分析
  enablePersistence: true, // 启用持久化
})

// 构建索引
const tree = await customService.buildIndexTree('doc-1', 'Title', pages)

// 检索
const results = await customService.search('doc-1', 'query', { maxResults: 10 })

// 获取树结构
const overview = customService.getTreeOverview('doc-1')

// 获取缓存统计
const stats = customService.getCacheStats()
```

## 配置

### OpenKB 配置

配置文件：`d:\Doubao\refactored\knowledge-base\.openkb\config.yaml`

```yaml
# OpenKB Configuration
llm: ollama/qwen3.6

# Knowledge base settings
knowledge_base:
  name: Doubao Knowledge Base
  description: Auto-generated knowledge base from uploaded documents

# PageIndex settings for long documents
pageindex:
  enabled: true
  threshold: 20 # 触发 PageIndex 的页面阈值
  max_depth: 4 # 最大树深度
  max_pages_per_node: 50 # 每节点最大页面数
  chunking_strategy: hybrid # 分块策略
  enable_multimodal: true # 启用多模态分析
  enable_persistence: true # 启用索引持久化

# Wiki compilation settings
wiki:
  auto_compile: true
  generate_summaries: true
  generate_concepts: true
  cross_reference: true

# Watch mode settings
watch:
  enabled: true
  interval: 30 # seconds
```

### 环境变量

环境文件：`d:\Doubao\refactored\knowledge-base\.env`

```
OLLAMA_BASE_URL=http://192.168.0.32:11434
```

## 故障排除

### 知识库未初始化

如果知识库未初始化，系统会自动尝试初始化。也可以手动运行：

```bash
cd d:\Doubao\refactored\knowledge-base
openkb init
```

### 文档添加失败

检查：

1. OpenKB 是否正确安装：`pip install openkb`
2. Ollama 服务器是否运行：`http://192.168.0.32:11434`
3. 文档格式是否支持

### 查询无结果

检查：

1. 知识库中是否有文档
2. 文档是否已完成编译
3. 查询问题是否与文档内容相关
4. 对于长文档，检查 PageIndex 是否已构建

### PageIndex 索引未找到

检查：

1. 文档页数是否超过阈值（默认20页）
2. 索引是否已持久化到 `.pageindex/` 目录
3. 尝试重新构建索引

## 技术细节

### 架构

```
Documents → OpenKB → Wiki (Markdown)
                ↓
            PageIndex (Long docs > 20 pages)
                ↓
            ├─ Smart Chunking (Semantic/Structural/Hybrid)
            ├─ Multimodal Analysis (Tables/Code/Formulas)
            ├─ Tree Index Building
            └─ Persistence (.pageindex/)
                ↓
            LLM (Ollama)
                ↓
            Query/Chat
```

### 文件结构

```
knowledge-base/
├── .openkb/
│   └── config.yaml          # OpenKB 配置
├── .env                     # 环境变量
├── .pageindex/              # PageIndex 持久化索引
│   ├── doc-1.json
│   └── doc-2.json
├── raw/                     # 原始文档
└── wiki/                    # 编译后的 wiki
    ├── index.md             # 知识库索引
    ├── sources/             # 文档全文
    ├── summaries/           # 文档摘要
    └── concepts/            # 概念页面
```

### 支持的文档格式

- PDF
- Word (.doc, .docx)
- Markdown (.md)
- PowerPoint (.ppt, .pptx)
- HTML (.html, .htm)
- Excel (.xls, .xlsx)
- 文本文件 (.txt)

### PageIndex 节点结构

```typescript
interface PageIndexNode {
  id: string
  type: 'root' | 'chapter' | 'section' | 'page'
  title: string
  summary: string
  content?: string
  pageRange: { start: number; end: number }
  children: PageIndexNode[]
  level: number
  multimodalContent?: MultimodalContentItem[]
  metadata?: {
    wordCount?: number
    imageCount?: number
    tableCount?: number
    chartCount?: number
    codeBlockCount?: number
    keyConcepts?: string[]
    semanticTags?: string[]
    contentTypeDistribution?: Record<MultimodalContentType, number>
  }
}
```

## 最佳实践

1. **定期编译**：使用 watch 模式自动编译新文档
2. **合理组织**：按主题组织文档，便于交叉引用
3. **查询优化**：使用具体、清晰的问题查询
4. **多模态利用**：充分利用图表、表格等多模态内容
5. **长文档处理**：对于超过20页的文档，确保 PageIndex 正常工作
6. **索引持久化**：利用持久化功能避免重复构建索引
7. **分块策略选择**：
   - 技术文档：使用 STRUCTURAL 分块
   - 论文：使用 SEMANTIC 分块
   - 混合内容：使用 HYBRID 分块（推荐）

## 性能优化

- **索引缓存**：PageIndex 索引在内存中缓存，快速访问
- **持久化加载**：服务启动时自动加载已保存的索引
- **智能分块**：根据文档特性选择最优分块策略
- **异步处理**：索引构建和检索都是异步非阻塞的

## 相关链接

- [OpenKB GitHub](https://github.com/VectifyAI/OpenKB)
- [OpenKB 文档](https://docs.vectify.ai/openkb)
- [PageIndex 文档](https://docs.vectify.ai/pageindex)
- [Andrej Karpathy 的 LLM Wiki 概念](https://twitter.com/karpathy/status/...)
