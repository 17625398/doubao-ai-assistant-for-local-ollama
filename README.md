# 豆包AI助手 - 重构项目

这是一个基于原生豆包程序逆向解析重构的本地项目，提供了类似豆包AI助手的功能，包括聊天、文档解析、代码审查、数据分析等多种AI工具。

## 本次重塑目标

本项目已按照对 `app` 原生客户端的分析，重塑为更接近真实桌面 AI 助手的本地架构：

1. **原生桌面宿主**：抽象 `Doubao.exe` / `Doubao.dll` / Chromium 资源包职责，定位为窗口、更新、崩溃和本地资源加载层。
2. **可信 Web 主站**：以 doubao/cici/dola 可信域为远程业务入口，保持账号、云端模型、搜索和内容服务边界。
3. **浏览器 AI 侧边栏扩展**：使用 Manifest V3，包含 background、preinject、content script、side panel、popup、options 等入口。
4. **AI 技能运行时**：统一组织网页阅读、文档问答、深度搜索、写作、代码、图片、视频、语音、PPT、音乐和飞书集成。
5. **Canvas / Artifact 工作区**：把模型输出沉淀为代码、文档、PPT、搜索结果、白板等可编辑产物。
6. **原生增强能力**：抽象网络、安全、推送、音视频、GPU、Shell 集成等桌面能力。
7. **诊断与运维体系**：对齐 AHA 电脑医生能力，覆盖网络、证书、代理、硬件、系统环境、三方冲突和 Dump/Trace。

新增核心蓝图位于 `packages/core/src/doubao-blueprint.ts`，Web 首页位于 `packages/web/src/components/doubao-workbench/DoubaoNativeWorkbench.tsx`。

## 项目架构

项目采用 Monorepo 架构，使用 Turborepo 进行管理，包含以下包：

- `@doubao/core` - 核心功能模块，包含文档解析、Ollama 客户端、配置管理等
- `@doubao/web` - Web 应用模块，基于 Next.js 14 开发
- `@doubao/extension` - Chrome 扩展模块，支持浏览器集成
- `@doubao/opencli-extension` - OpenCLI 浏览器自动化扩展，用于在隔离的 Chrome 窗口中执行命令

## 功能特性

### 核心功能

- **聊天功能**：与 AI 模型进行对话，支持流式响应
- **文档解析**：支持 PDF、Word、Excel、PowerPoint、图片等多种格式的文档解析
- **Ollama 集成**：支持本地 Ollama 模型服务，可自定义配置
- **配置管理**：支持多种配置选项，包括代理设置、UI 设置、隐私设置等

### Web 应用功能

- **AI 创作**：生成文章、故事、诗歌等内容
- **云盘集成**：管理和使用云存储文件
- **快捷工具**：提供各种实用的 AI 工具
- **截图提问**：通过截图向 AI 提问
- **屏幕共享**：共享屏幕内容进行分析
- **PPT 生成**：根据内容生成 PPT
- **写作助手**：辅助写作，提供写作建议
- **语音聊天**：通过语音与 AI 对话
- **音频翻译**：翻译音频内容
- **逻辑模式**：提供逻辑分析和推理
- **小程序**：集成各种小应用
- **书签管理**：保存和管理书签
- **文本选择器**：选中文本后提供各种操作
- **代码审查**：分析代码质量、安全漏洞等
- **数据分析**：分析各种格式的数据
- **翻译工具**：翻译各种语言的文本
- **文本总结**：总结文本内容
- **长文本分析**：结构化大纲、思维导图、文档对话等功能

### 新增功能（最新版本）

#### 1. 会话分组管理

- 历史会话按时间自动分组（今天、昨天、最近7天、最近30天、更早）
- 快速查找历史对话
- 支持会话搜索

#### 2. 代码块高亮与复制

- 支持多种编程语言的语法高亮（JavaScript/TypeScript、Python、CSS、HTML、JSON、Bash等）
- 一键复制代码块
- 美观的深色代码块样式

#### 3. 文件拖拽上传

- 支持拖拽文件到输入区域上传
- 支持图片和文档文件
- 拖拽时有视觉反馈

#### 4. 键盘快捷键

| 快捷键   | 功能           |
| -------- | -------------- |
| `Ctrl+N` | 新建对话       |
| `Ctrl+K` | 聚焦输入框     |
| `Ctrl+B` | 切换侧边栏     |
| `Ctrl+F` | 搜索消息       |
| `Ctrl+E` | 导出对话       |
| `Ctrl+P` | 模型参数设置   |
| `Ctrl+J` | 常用提示词     |
| `Ctrl+,` | 打开设置       |
| `?`      | 显示快捷键帮助 |

#### 5. 消息引用回复

- 引用任意消息进行回复
- 引用内容以引用格式显示
- 支持取消引用

#### 6. 主题切换（深色模式）

- 支持浅色、深色、跟随系统三种模式
- 全局深色模式适配
- 侧边栏快速切换

#### 7. 消息搜索

- 按内容搜索历史消息
- 搜索结果高亮显示
- 支持上下跳转搜索结果

#### 8. 导出对话

- 支持导出为 Markdown 格式（.md）
- 支持导出为纯文本格式（.txt）
- 支持复制到剪贴板

#### 9. 模型参数实时调节

- Temperature（温度）：控制输出随机性
- Top P（核采样）：控制词汇选择多样性
- Max Tokens（最大令牌数）：控制生成文本长度
- Frequency Penalty（频率惩罚）：惩罚重复词汇
- Presence Penalty（存在惩罚）：鼓励引入新主题

#### 10. 移动端适配

- 响应式布局设计
- 移动端优化的按钮和输入框
- 移动端侧边栏适配

#### 11. 常用提示词面板

- 15+ 预设常用提示词
- 按分类筛选（编程、翻译、写作、学习、分析、创意）
- 搜索功能
- 一键填充到输入框
- 快捷键 `Ctrl+J` 快速打开

#### 12. 清空对话功能

- 一键清空当前会话的所有消息
- 确认对话框防止误操作
- 侧边栏快速访问

#### 13. Seafile 私有云盘对接

- 支持 Seafile API 访问
- 通过 Repo Token 认证
- 目录浏览和文件管理
- 文件上传和下载
- 文本文件预览

#### 14. 数据备份与恢复

- 完整数据备份（聊天记录、配置、书签等）
- 从备份文件恢复
- 导出特定数据类型
- 清空数据前自动备份

#### 15. 性能监控面板

- 实时 FPS 监控
- 内存使用监控
- 页面加载时间分析
- 资源加载统计
- 系统信息显示

#### 16. 智能网页内容提取（v2.1.0）

- **智能内容识别**：基于多维度评分的智能提取算法
- **增强Markdown转换**：保留文档结构、代码高亮、表格转换
- **元数据提取**：标题、作者、发布时间、站点信息
- **可视化面板**：三栏式结果展示（内容/元数据/统计）
- **一键复制**：快速复制提取的内容
- **直接使用**：提取内容可直接用于对话

#### 17. Lightpanda 浏览器集成（v2.2.0）

- **多模式支持**：CLI、CDP服务器、Docker三种运行模式
- **高性能提取**：比Chrome快9倍，内存占用少16倍
- **JavaScript执行**：支持SPA页面和动态内容提取
- **CDP协议**：兼容Puppeteer和Playwright API
- **多引擎策略**：Lightpanda、Jina.ai、Readability自动选择
- **智能降级**：失败时自动切换到备用引擎
- **引擎统计**：记录各引擎使用情况和响应时间

#### 18. 浏览器登录状态提取（v2.3.0）

- **bb-browser集成**：利用真实浏览器登录状态提取内容
- **登录状态检测**：自动检测用户是否已登录目标网站
- **智能指示器**：🟢已登录/🟡未知/🔴未登录状态显示
- **一键提取**：使用浏览器Cookie和Session提取需要登录的页面
- **重试机制**：自动重试3次，提高成功率
- **错误分类**：友好的错误提示和解决方案
- **支持场景**：管理后台、企业内网、需要登录的表单页面

#### 19. 长文本分析和网页内容提取（v2.4.0）

- **文本分块**：支持基于字符、句子和段落的智能分块
- **文本摘要**：实现提取式摘要（基于TextRank算法）
- **结构化信息提取**：从文本中提取实体和关系
- **网页内容提取**：从URL和HTML中提取内容、标题和元数据
- **JavaScript-heavy网页处理**：使用Playwright处理动态内容
- **多格式支持**：支持PDF、TXT、HTML、Markdown、Word、Excel、PowerPoint、图片等多种格式
- **多引擎统一调度**：集成HTTP、CDP、Dynamic、Stealth、CLIBrowser等引擎
- **Local-First数据存储**：数据优先存储在本地，确保隐私和离线访问
- **浏览器兼容性**：所有服务都已优化为浏览器兼容

#### 20. 深度推理功能（v2.5.0）

- **思维链可视化**：展示AI的思考过程，提高透明度
- **Token预算管理**：精确控制Token使用，支持预算检查和自动降低深度
- **多步骤推理**：支持复杂问题的分步推理
- **推理模式**：支持演绎、归纳、类比等多种推理模式

#### 21. 网络拦截器功能（v2.5.0）

- **API代理**：灵活的API代理配置
- **请求路径重写**：支持自定义路径重写规则
- **Vertex AI兼容路径**：自动转换为Vertex AI兼容格式
- **拦截器管理**：支持请求前、响应后、错误处理拦截器

#### 22. 多引擎统一调度增强（v2.5.0）

- **5层智能降级**：SiteAdapter → HTTP → CDP → Dynamic → Stealth → CLIBrowser
- **每引擎独立健康监控**：实时监控各引擎状态
- **站点注册表**：内置67个站点的最优引擎匹配
- **健康引擎优先**：自动选择健康状态最佳的引擎

#### 23. 意图感知查询扩展（v2.5.0）

- **9种查询意图**：搜索、获取信息、比较、总结、分析、提取、转换、生成、验证
- **130+关键词模式**：丰富的意图识别关键词库
- **匹配位置权重**：关键词出现在查询开头时增加权重
- **置信度阈值检查**：确保意图识别的准确性

#### 24. 熔断限流重试机制（v2.5.0）

- **断路器状态管理**：闭合、打开、半开状态
- **每引擎独立监控**：每个引擎有独立的熔断和限流
- **智能重试策略**：递增延迟的重试机制
- **限流保护**：滑动窗口限流算法

#### 25. 结构化大纲生成（v2.5.0）

- **标题自动检测**：支持Markdown、编号、中文等多种标题格式
- **层次化大纲结构**：支持最多6级深度
- **关键要点提取**：自动识别和提取文档关键论点
- **多格式导出**：支持文本、JSON等多种格式
- **大纲复制功能**：一键复制大纲到剪贴板

#### 26. 可视化思维导图生成（v2.5.0）

- **Mermaid.js集成**：专业的图形渲染引擎
- **多主题支持**：默认、森林、中性、深色主题
- **多布局方向**：从上到下、从下到上、从左到右、从右到左
- **三级思维导图**：适合复杂文档的可视化
- **代码和文件下载**：支持复制Mermaid代码和下载文件

#### 27. 文档对话功能（v2.5.0）

- **基于文档问答**：回答严格基于文档内容
- **严格模式**：确保回答不超出文档范围
- **文档分块处理**：智能分块和检索相关内容
- **对话历史管理**：完整的对话历史记录
- **引用来源显示**：显示回答引用的文档片段
- **会话管理**：支持多个文档对话会话

### 20. 上下文工程系统（v2.3.0）

- **行为规则管理**：创建和管理条件-动作规则，支持优先级和组合模式
- **多轮对话流程**：设计复杂的对话流程，支持状态转换和条件判断
- **预批准响应模板**：管理标准化的响应模板，提高回复一致性
- **工具管理**：注册和使用各种工具，扩展 AI 能力
- **词汇表管理**：维护领域特定术语，确保 AI 理解专业概念
- **范例数据**：内置丰富的范例数据，包括5条行为规则、2个对话流程、6个响应模板、4个工具和8个领域术语
- **数据持久化**：使用 localStorage 持久化存储配置
- **管理界面**：直观的管理面板，支持创建、编辑和删除操作
- **集成到聊天**：自动应用上下文工程规则到聊天对话中

#### 20. 多语言国际化支持（v2.2.0）

- **双语支持**：中文（zh-CN）和英文（en-US）
- **语言切换**：Header 中的语言选择器，一键切换
- **自动保存**：语言偏好自动保存到 localStorage
- **服务端渲染兼容**：支持 Next.js App Router SSR
- **完整文档**：详见 [I18N_GUIDE.md](./docs/I18N_GUIDE.md)

#### 21. 上下文工程系统（v2.3.0）

- **行为规则管理**：创建和管理条件-动作规则，支持优先级和组合模式
- **多轮对话流程**：设计复杂的对话流程，支持状态转换和条件判断
- **预批准响应模板**：管理标准化的响应模板，提高回复一致性
- **工具管理**：注册和使用各种工具，扩展 AI 能力
- **词汇表管理**：维护领域特定术语，确保 AI 理解专业概念
- **范例数据**：内置丰富的范例数据，包括5条行为规则、2个对话流程、6个响应模板、4个工具和8个领域术语
- **数据持久化**：使用 localStorage 持久化存储配置
- **管理界面**：直观的管理面板，支持创建、编辑和删除操作
- **集成到聊天**：自动应用上下文工程规则到聊天对话中

#### 22. All-Model-Chat 集成（v2.6.0）

深度集成 [All-Model-Chat](https://github.com/yeahhe365/All-Model-Chat) 项目，提供企业级 AI 聊天体验：

- **多模态交互**：支持文本、语音、图片、视频等多种输入方式
- **实时联网搜索**：基于 Google Search API 的实时信息检索
- **代码执行**：浏览器端 Python 代码执行（基于 Pyodide）
- **Canvas 预览**：支持 ECharts 图表、Mermaid 流程图、Graphviz 图形渲染
- **语音交互**：语音识别（STT）和语音合成（TTS）
- **长文档分析**：支持 PDF、Word 等大文档的深度分析和问答
- **Gemini 生态**：深度集成 Google Gemini 2.0 系列模型
  - Gemini 2.0 Flash：快速响应
  - Gemini 2.0 Pro：深度推理
  - Gemini 2.0 Flash Thinking：思维链可视化

## 技术栈

- **前端框架**：React 18, Next.js 14
- **构建工具**：Turborepo, Webpack
- **样式**：Tailwind CSS
- **状态管理**：Zustand
- **类型系统**：TypeScript
- **AI 集成**：Ollama API, OpenAI Compatible Client
- **文档解析**：pdfjs-dist, Mammoth.js, xlsx, JSZip, Tesseract.js
- **浏览器扩展**：Chrome Extension API
- **浏览器引擎**：Lightpanda (CDP协议), Playwright
- **登录状态提取**：bb-browser 集成
- **网页内容提取**：Cheerio, Playwright
- **文本处理**：内置文本处理算法 (TextRank, 实体提取)
- **结构化大纲**：层次化标题检测和提取
- **思维导图**：Mermaid.js 集成
- **文档对话**：智能检索和问答系统
- **深度推理**：思维链可视化，Token预算管理
- **多引擎调度**：HTTP, CDP, Dynamic, Stealth, CLIBrowser 引擎
- **网络拦截器**：Fetch拦截，路径重写，Vertex AI兼容
- **意图识别**：9种查询意图，130+关键词模式
- **熔断限流**：每引擎独立健康监控，断路器模式
- **存储**：LocalStorage
- **容器化**：Docker & Docker Compose
- **上下文工程**：基于规则的对话管理系统
- **All-Model-Chat**：
  - **AI 模型**：Google Gemini 2.0 API
  - **Python 执行**：Pyodide（浏览器端 Python）
  - **搜索**：Google Custom Search API
  - **图表渲染**：ECharts, Mermaid.js, Graphviz
  - **语音**：Web Speech API
  - **文档解析**：PDF.js, Mammoth.js

## 安装与运行

### 前提条件

- Node.js 18+
- npm 9+
- Ollama（可选，用于本地 AI 模型）

### 安装步骤

1. 克隆项目

   ```bash
   git clone <项目地址>
   cd doubao-refactored
   ```

2. 安装依赖

   ```bash
   npm install
   ```

3. 配置 Ollama（可选）
   - 下载并安装 Ollama：https://ollama.ai/
   - 启动 Ollama 服务
   - 在 Web 应用的配置面板中设置 Ollama 地址

4. 配置 Lightpanda（可选，用于增强网页内容提取）
   - **方式一：Docker（推荐）**

     ```bash
     # Windows
     .\scripts\start-lightpanda.bat

     # 或使用 Docker Compose
     docker-compose up -d lightpanda
     ```

   - **方式二：本地安装**
     - 下载 Lightpanda：https://github.com/lightpanda-io/browser/releases
     - 添加到系统 PATH
     - 设置环境变量 `LIGHTPANDA_BIN=lightpanda`

### 运行开发模式

```bash
npm run dev
```

Web 应用将在 http://localhost:3000 启动

### 构建生产版本

```bash
npm run build
```

### 打包 Chrome 扩展

```bash
npm run build
```

扩展包将生成在 `packages/extension/dist` 目录

### 构建 OpenCLI 扩展

```bash
npm run build:opencli
```

扩展包将生成在 `packages/opencli-extension/dist` 目录

### 加载 OpenCLI 扩展

1. 打开 Chrome/Edge 浏览器
2. 访问 `chrome://extensions/`
3. 开启"开发者模式"
4. 点击"加载已解压的扩展程序"
5. 选择 `packages/opencli-extension/dist` 目录

## 网页内容提取 API

### 基本使用

```bash
# 自动选择引擎提取网页内容
curl "http://localhost:3000/api/read?url=https://example.com"

# 指定 Lightpanda 引擎
curl "http://localhost:3000/api/read?url=https://example.com&engine=lightpanda"

# 带滚动和等待（用于动态内容）
curl "http://localhost:3000/api/read?url=https://example.com&scrollToBottom=true&waitForSelector=.content"
```

### API 参数

| 参数              | 类型    | 说明                                         | 默认值 |
| ----------------- | ------- | -------------------------------------------- | ------ |
| `url`             | string  | 要提取的网页 URL                             | 必填   |
| `engine`          | string  | 提取引擎（auto/lightpanda/jina/readability） | auto   |
| `timeoutMs`       | number  | 超时时间（毫秒）                             | 30000  |
| `scrollToBottom`  | boolean | 是否滚动到页面底部                           | false  |
| `waitForSelector` | string  | 等待的 CSS 选择器                            | -      |

### 引擎管理 API

```bash
# 检查引擎可用性
curl -X POST "http://localhost:3000/api/read?action=check&engine=lightpanda"

# 获取引擎统计信息
curl -X POST "http://localhost:3000/api/read?action=stats"
```

### 响应格式

```json
{
  "success": true,
  "engine": "lightpanda",
  "mode": "cdp",
  "content": "提取的网页内容...",
  "title": "页面标题",
  "metadata": {
    "loadTime": 1234
  }
}
```

## 项目结构

```
doubao-refactored/
├── packages/
│   ├── core/              # 核心功能模块
│   │   ├── src/
│   │   │   ├── utils/     # 工具函数
│   │   │   ├── types/      # 类型定义
│   │   │   └── index.ts    # 入口文件
│   ├── web/               # Web 应用模块
│   │   ├── src/
│   │   │   ├── app/        # Next.js 应用
│   │   │   ├── components/ # React 组件
│   │   │   ├── hooks/      # 自定义 Hooks
│   │   │   ├── store/      # 状态管理
│   │   │   └── utils/      # 工具函数
│   ├── extension/         # Chrome 扩展模块
│   │   ├── src/
│   │   │   ├── background/  # 后台脚本
│   │   │   ├── content-script/ # 内容脚本
│   │   │   ├── options/     # 选项页面
│   │   │   └── side-panel/  # 侧边栏
│   ├── opencli-extension/ # OpenCLI 浏览器自动化扩展
│   │   ├── src/
│   │   │   ├── background/  # 后台服务脚本
│   │   │   └── popup/       # 弹出页面
│   │   └── dist/           # 构建输出
├── turbo.json             # Turborepo 配置
├── package.json           # 根包配置
└── README.md              # 项目文档
```

## 配置说明

### Ollama 配置

- **服务地址**：Ollama 服务的地址，默认为 http://localhost:11434
- **默认模型**：默认使用的 Ollama 模型
- **请求超时**：API 请求的超时时间
- **流式响应**：是否启用流式响应

### 模型参数配置

- **Temperature**：控制输出的随机性（0-2）
- **Top P**：控制词汇选择的多样性（0-1）
- **Max Tokens**：控制生成文本的最大长度（256-8192）
- **Frequency Penalty**：惩罚重复词汇（-2到2）
- **Presence Penalty**：鼓励引入新主题（-2到2）

### 代理配置

- **启用代理**：是否启用代理
- **代理 URL**：代理服务器的 URL

### Lightpanda 配置

- **使用模式**：CLI / CDP / Docker
- **二进制路径**：Lightpanda 可执行文件路径（CLI模式）
- **CDP 地址**：CDP 服务器地址（默认 127.0.0.1:9222）
- **容器名称**：Docker 容器名称（默认 lightpanda-browser）
- **超时时间**：请求超时时间（默认 30秒）
- **遵守 robots.txt**：是否遵守网站的 robots.txt 规则
- **最大并发**：最大并发请求数（默认 5）

### UI 配置

- **主题**：应用主题（浅色/深色/跟随系统）
- **语言**：应用语言
- **自动打开**：是否自动打开应用
- **上下文菜单**：是否启用上下文菜单

### 隐私配置

- **保存聊天历史**：是否保存聊天历史
- **共享使用数据**：是否共享使用数据

## Lightpanda 使用指南

### 什么是 Lightpanda？

Lightpanda 是一个专为 AI 和自动化设计的无头浏览器，具有以下优势：

- **超低内存占用**：比 Chrome 少 16 倍内存
- **极速执行**：比 Chrome 快 9 倍
- **即时启动**：无需等待浏览器启动
- **CDP 兼容**：兼容 Puppeteer、Playwright、chromedp

### 使用场景

1. **JavaScript 渲染页面**
   - React、Vue、Angular 等 SPA 应用
   - 动态加载内容的页面

2. **需要交互的页面**
   - 需要滚动加载更多内容
   - 需要点击才能显示的内容

3. **登录态页面**
   - 需要 Cookie 或 Session
   - 需要自定义请求头

### 启动方式

#### Docker 模式（推荐）

```bash
# Windows
.\scripts\start-lightpanda.bat

# 停止
.\scripts\stop-lightpanda.bat

# Docker Compose
docker-compose up -d lightpanda
docker-compose down
```

#### CLI 模式

```bash
# 确保 lightpanda 在 PATH 中
lightpanda serve --host 127.0.0.1 --port 9222
```

#### CDP 模式

```bash
# 在项目代码中使用
import { lightpandaClient } from '@doubao/core';

await lightpandaClient.startCdpServer();
```

### 多引擎策略说明

系统会按以下优先级自动选择引擎：

1. **Lightpanda**（如果可用）
   - 支持 JavaScript 执行
   - 适合 SPA 和动态页面
   - 需要额外安装或 Docker

2. **Jina.ai**（后备引擎）
   - 云端服务，无需安装
   - 适合静态页面
   - 可能有速率限制

3. **Readability**（浏览器扩展）
   - 仅在浏览器扩展中使用
   - 本地执行，无需网络

### 故障排除

#### Lightpanda 无法启动

- 检查 Docker 是否运行
- 检查端口 9222 是否被占用
- 查看容器日志：`docker logs lightpanda-browser`

#### 提取失败

- 检查 URL 是否可访问
- 增加超时时间：`timeoutMs=60000`
- 尝试不同的引擎：`engine=jina`

#### 动态内容提取不完整

- 启用滚动：`scrollToBottom=true`
- 等待特定元素：`waitForSelector=.content`
- 增加等待时间：`timeoutMs=60000`

## 浏览器登录状态提取指南

### 什么是浏览器登录状态提取？

基于 [bb-browser](https://github.com/epiral/bb-browser) 理念："Your browser is the API"，利用用户真实浏览器的登录状态来提取需要认证的网页内容。

### 使用场景

1. **管理后台页面**
   - Django Admin、WordPress 后台
   - 企业内部管理系统
   - 需要登录的仪表盘

2. **企业内网页面**
   - 内部文档系统
   - 企业 Wiki
   - 内部工具页面

3. **需要登录的表单**
   - 会员专属内容
   - 付费内容页面
   - 个人中心页面

### 使用方法

#### 方式一：通过 WebContentExtractorPanel（推荐）

1. **安装浏览器扩展**
   - 构建扩展：`npm run build:extension`
   - 在 Chrome/Edge 中加载 `packages/extension/dist` 目录

2. **打开目标网站并登录**
   - 在浏览器中打开需要提取的网站
   - 完成登录流程

3. **使用提取面板**
   - 在 Web 应用中打开网页内容提取面板
   - 输入目标 URL
   - 勾选"使用浏览器登录状态提取"
   - 查看登录状态指示器
   - 点击"使用登录状态提取"按钮

#### 方式二：通过 API 调用

```bash
# 使用浏览器扩展引擎（需要扩展已安装且已登录）
curl "http://localhost:3000/api/read?url=http://192.168.0.230:8000/admin/&engine=browser-extension"
```

### 登录状态指示器

| 状态   | 图标 | 说明                     | 操作                   |
| ------ | ---- | ------------------------ | ---------------------- |
| 已登录 | 🟢   | 检测到登录状态，可以提取 | 点击提取按钮           |
| 未登录 | 🔴   | 未检测到登录状态         | 点击"打开网站"按钮登录 |
| 未知   | 🟡   | 无法确定登录状态         | 检查扩展是否安装       |
| 错误   | ⚠️   | 发生错误                 | 查看错误提示和解决方案 |

### 工作原理

1. **标签页匹配**
   - 根据 URL 模式查找已打开的标签页
   - 优先选择最近访问的标签页

2. **登录状态检测**
   - 检测页面中的注销按钮
   - 检测用户头像和用户名
   - 检测用户菜单
   - 检测登录表单（反向指标）
   - 检测会话 Cookie

3. **内容提取**
   - 使用浏览器扩展的内容脚本
   - 提取页面文本、表单、iframe
   - 保留原始 Cookie 和 Session

4. **重试机制**
   - 自动重试 3 次
   - 递增延迟（1s, 2s, 3s）
   - 提高成功率

### 故障排除

#### 扩展未安装

- 错误提示："浏览器扩展未安装"
- 解决方案：安装豆包AI助手浏览器扩展

#### 未找到标签页

- 错误提示："未找到匹配的标签页"
- 解决方案：先在浏览器中打开目标网站

#### 未登录

- 错误提示："未登录"
- 解决方案：在目标网站标签页中完成登录

#### 提取超时

- 错误提示："提取请求超时"
- 解决方案：检查网络连接，或稍后重试

### 安全说明

- Cookie 只在用户同意时返回
- 不存储敏感信息到服务器
- 所有操作在本地浏览器完成
- 符合 CORS 策略

## All-Model-Chat 使用指南

### 什么是 All-Model-Chat？

All-Model-Chat 是一个功能丰富的 AI 聊天助手，深度集成 Google Gemini 生态，提供多模态交互、实时联网搜索、代码执行、长文档分析等高级功能。

### 组件架构

All-Model-Chat 采用模块化组件设计，便于维护和扩展：

```
AllModelChat/
├── index.ts                 # 统一导出所有组件和类型
├── types.ts                 # 集中类型定义
├── AllModelChatPanel.tsx    # 主面板组件（逻辑整合）
├── Header.tsx               # 头部组件
│   ├── 模型选择器（Gemini 2.0 Flash/Pro/Thinking）
│   ├── 工具切换（聊天/Python/搜索）
│   └── 清空对话按钮
├── EmptyState.tsx           # 空状态欢迎界面
│   └── 快捷提示按钮（根据当前工具动态变化）
├── MessageItem.tsx          # 消息项组件
│   ├── 代码块高亮与复制
│   ├── Python 代码执行按钮
│   ├── 执行结果展示
│   ├── 搜索结果卡片
│   └── 消息操作（复制、重新生成）
└── ChatInput.tsx            # 输入区域组件
    ├── 自动调整高度的文本输入框
    ├── 语音输入按钮
    ├── 文件上传按钮
    ├── 附件预览
    └── 发送按钮
```

### 使用方式

#### 导入组件

```typescript
// 方式一：导入主组件
import { AllModelChatPanel } from '@/components/AllModelChat'

// 方式二：导入子组件（用于自定义布局）
import { Header, EmptyState, MessageItem, ChatInput } from '@/components/AllModelChat'

// 方式三：导入类型
import type { Message, ToolMode, CodeExecutionResult } from '@/components/AllModelChat'
```

#### 基础用法

```tsx
import { AllModelChatPanel } from '@/components/AllModelChat'

function ChatPage() {
  return (
    <div className="h-screen">
      <AllModelChatPanel currentModel="gemini-2.0-flash-exp" currentProvider="gemini" />
    </div>
  )
}
```

### 核心功能

#### 1. 多模态聊天

**支持的输入类型**：

- **文本**：普通文本消息
- **图片**：PNG、JPG、GIF、WebP 等格式
- **音频**：语音消息、音频文件
- **视频**：视频文件分析

**使用方法**：

1. 在聊天界面中，点击输入框下方的功能按钮
2. 选择要发送的内容类型（图片、音频、视频）
3. 选择或录制内容后发送

#### 2. 实时联网搜索

**功能说明**：

- 基于 Google Custom Search API
- 实时获取最新信息
- 自动引用搜索结果来源

**启用方法**：

1. 在 `.env.local` 中配置搜索 API：
   ```
   NEXT_PUBLIC_GOOGLE_API_KEY=your_api_key
   NEXT_PUBLIC_GOOGLE_CX=your_search_engine_id
   ```
2. 在聊天中，系统会自动根据需要使用搜索功能

#### 3. Python 代码执行

**功能说明**：

- 浏览器端执行 Python 代码（基于 Pyodide）
- 支持 numpy、pandas 等常用库
- 代码执行结果可视化

**使用方法**：

1. 发送包含 Python 代码的消息
2. 系统会自动检测并执行代码
3. 查看执行结果和输出

**示例**：

```python
import matplotlib.pyplot as plt
import numpy as np

x = np.linspace(0, 10, 100)
y = np.sin(x)

plt.plot(x, y)
plt.title('Sine Wave')
plt.show()
```

#### 4. Canvas 预览

**支持的图表类型**：

- **ECharts**：交互式图表（折线图、柱状图、饼图等）
- **Mermaid**：流程图、时序图、类图等
- **Graphviz**：复杂图形和网络图
- **HTML**：自定义 HTML 内容

**使用方法**：

1. 在代码执行或 AI 回复中生成图表代码
2. 系统会自动渲染并显示预览
3. 支持交互操作（缩放、平移等）

#### 5. 语音交互

**语音识别（STT）**：

- 点击麦克风按钮开始录音
- 实时转录为文本
- 支持中文和英文

**语音合成（TTS）**：

- AI 回复可转换为语音播放
- 支持调节语速和音调
- 支持多种语音类型

**使用方法**：

1. 点击输入框旁的麦克风图标进行语音输入
2. 点击消息旁的播放按钮听取语音回复

#### 6. 长文档分析

**支持的文档格式**：

- PDF（.pdf）
- Word（.doc, .docx）
- 文本文件（.txt, .md）

**功能说明**：

- 文档内容提取和解析
- 基于文档的问答
- 文档摘要生成

**使用方法**：

1. 点击文档上传按钮
2. 选择要分析的文档
3. 系统会自动提取内容
4. 基于文档内容进行问答

### 模型配置

#### Gemini 模型选择

| 模型                      | 特点             | 适用场景               |
| ------------------------- | ---------------- | ---------------------- |
| Gemini 2.0 Flash          | 快速响应，成本低 | 日常对话、简单查询     |
| Gemini 2.0 Pro            | 深度推理，能力强 | 复杂分析、代码生成     |
| Gemini 2.0 Flash Thinking | 思维链可视化     | 需要展示思考过程的场景 |

**切换方法**：

1. 在聊天界面右上角点击模型选择器
2. 选择要使用的模型
3. 新消息将使用选中的模型

### 环境变量配置

在 `.env.local` 文件中配置以下变量：

```bash
# Gemini API 配置
NEXT_PUBLIC_GEMINI_API_KEY=your_gemini_api_key

# Google 搜索配置（可选，用于实时搜索）
NEXT_PUBLIC_GOOGLE_API_KEY=your_google_api_key
NEXT_PUBLIC_GOOGLE_CX=your_search_engine_id

# Pyodide 配置（可选）
NEXT_PUBLIC_PYODIDE_CDN_URL=https://cdn.jsdelivr.net/pyodide/v0.25.0/full/
```

### API 使用示例

#### 发送多模态消息

```typescript
import { GeminiService } from '@ai-intelligent-analysis-platform/core'

const geminiService = new GeminiService({
  apiKey: 'your_api_key',
  model: 'gemini-2.0-flash-exp',
})

// 发送图片消息
const imageFile = await fetch('image.png').then(r => r.blob())
await geminiService.sendMessageWithImage('描述这张图片', imageFile)
```

#### 执行 Python 代码

```typescript
import { PythonExecutionService } from '@ai-intelligent-analysis-platform/core'

const pythonService = PythonExecutionService.getInstance()
await pythonService.initialize()

const result = await pythonService.executeCode(`
import pandas as pd
data = {'name': ['Alice', 'Bob'], 'age': [25, 30]}
df = pd.DataFrame(data)
print(df)
`)

console.log(result.output)
```

#### 语音识别

```typescript
import { VoiceService } from '@ai-intelligent-analysis-platform/core'

const voiceService = VoiceService.getInstance()

// 开始识别
voiceService.startRecognition(
  result => {
    console.log('识别结果:', result.transcript)
  },
  error => {
    console.error('识别错误:', error)
  }
)

// 停止识别
voiceService.stopRecognition()
```

### 故障排除

#### Gemini API 错误

- **错误提示**："API key invalid"
  - 解决方案：检查 `.env.local` 中的 API key 是否正确

- **错误提示**："Rate limit exceeded"
  - 解决方案：等待一段时间后重试，或升级 API 配额

#### Python 执行失败

- **错误提示**："Pyodide not loaded"
  - 解决方案：检查网络连接，确保可以访问 Pyodide CDN

- **错误提示**："Module not found"
  - 解决方案：部分 Python 模块可能不支持，尝试使用标准库

#### 语音识别失败

- **错误提示**："Speech recognition not supported"
  - 解决方案：确保浏览器支持 Web Speech API（Chrome、Edge 支持较好）

- **错误提示**："No speech detected"
  - 解决方案：检查麦克风权限，确保环境安静

## 长文本分析功能使用指南

### 如何打开长文本分析面板

#### 方式一：通过测试按钮（推荐）

1. 在 Web 应用右下角，点击绿色的 **"测试打开长文本分析"** 按钮
2. 长文本分析面板将弹出，您可以开始使用

#### 方式二：通过事件触发

```javascript
// 在代码中触发
window.dispatchEvent(new Event('open-long-text-analysis'))
```

### 功能说明

#### 1. 结构化大纲生成

**适用场景**：

- 快速了解文档结构
- 提取文档关键点
- 生成文档目录

**使用步骤**：

1. 选择"结构化大纲"标签页
2. 输入或粘贴文档文本
3. 配置选项（最大深度、包含内容、提取关键点）
4. 点击"生成大纲"按钮
5. 查看生成的大纲树和关键要点
6. 点击"复制大纲"将结果复制到剪贴板

**支持的标题格式**：

- Markdown 标题：`# 标题`、`## 二级标题` 等
- 编号标题：`1. 标题`、`1.1. 子标题` 等
- 中文标题：`一、标题`、`二、标题` 等
- 全大写标题：自动识别为标题

#### 2. 可视化思维导图生成

**适用场景**：

- 可视化文档结构
- 快速理解内容关系
- 制作演示文稿

**使用步骤**：

1. 选择"思维导图"标签页
2. 输入或粘贴文档文本
3. 配置选项（最大深度、布局方向、主题）
4. 点击"生成思维导图"按钮
5. 查看生成的 Mermaid 代码
6. 点击"复制代码"或"下载文件"保存结果

**主题选项**：

- **默认**：清晰的黑白主题
- **森林**：绿色调的自然主题
- **中性**：柔和的灰色调主题
- **深色**：适合夜间使用的深色主题

**布局方向**：

- **从上到下 (TB)**：适合层次清晰的文档
- **从下到上 (BT)**：逆向布局
- **从左到右 (LR)**：适合时间线或流程
- **从右到左 (RL)**：适合从右往左阅读的语言

**如何渲染 Mermaid 图表**：

1. 复制生成的 Mermaid 代码
2. 访问 https://mermaid.live/ 或使用支持 Mermaid 的编辑器
3. 粘贴代码即可看到渲染效果

#### 3. 文档对话功能

**适用场景**：

- 基于文档内容提问
- 查找文档中的特定信息
- 深入理解文档内容

**使用步骤**：

1. 选择"文档对话"标签页
2. 输入或粘贴文档文本
3. 配置选项（严格模式、显示引用）
4. 点击"加载文档"按钮
5. 在输入框中输入您的问题
6. 按 Enter 键或点击发送按钮
7. 查看 AI 的回答和引用来源

**严格模式**：

- 启用后，AI 只会基于文档内容回答
- 如果文档中没有相关信息，会明确告知
- 避免 AI 编造或猜测答案

**引用来源**：

- 显示回答引用的文档片段
- 帮助您追溯信息来源
- 提高回答的可信度

### 核心服务说明

#### 深度推理服务

- **思维链可视化**：展示 AI 的思考过程
- **Token 预算管理**：精确控制 Token 使用
- **自动降级**：预算不足时自动降低推理深度

#### 多引擎调度服务

- **5 层智能降级**：HTTP → CDP → Dynamic → Stealth → CLIBrowser
- **健康监控**：每引擎独立的健康状态检查
- **站点注册表**：67 个站点的最优引擎匹配

#### 意图识别服务

- **9 种查询意图**：搜索、获取信息、比较、总结、分析、提取、转换、生成、验证
- **130+ 关键词模式**：丰富的意图识别库
- **智能扩展**：基于意图智能扩展查询

#### 熔断限流服务

- **断路器模式**：闭合、打开、半开状态
- **限流保护**：滑动窗口限流算法
- **智能重试**：递增延迟的重试策略

### 技术特点

1. **Local-First 架构**：所有数据优先存储在本地
2. **浏览器兼容**：所有服务都优化为浏览器环境
3. **模块化设计**：各功能独立，易于扩展
4. **TypeScript 支持**：完整的类型定义和类型安全
5. **性能优化**：智能缓存和懒加载

## 开发指南

### 添加新功能

1. 在 `packages/core` 中添加核心功能
2. 在 `packages/web` 中添加 UI 组件
3. 在 `packages/extension` 中添加扩展功能
4. 更新相关文档

### 测试

项目建立了完整的测试体系，包括集成测试、性能测试、安全测试和兼容性测试：

```bash
# 运行所有测试
cd packages/core
npm run test

# 运行集成测试
npx vitest run --config vitest.config.ts src/__tests__/integration/

# 运行性能测试
npx vitest run --config vitest.config.ts src/__tests__/performance/

# 运行安全测试
npx vitest run --config vitest.config.ts src/__tests__/security/

# 运行兼容性测试
npx vitest run --config vitest.config.ts src/__tests__/compatibility/

# 运行安全审计
npm run security-audit
```

**测试覆盖范围**：

| 测试类型 | 文件数 | 测试数 | 说明 |
|---------|-------|-------|------|
| 集成测试 | 5 | 60+ | 文档解析、AI服务、缓存、语音、网页提取 |
| 性能测试 | 3 | 18 | 文档处理速度、内存使用、缓存性能 |
| 安全测试 | 3 | 103 | 输入验证、文件上传、API安全 |
| 兼容性测试 | 4 | 207 | 浏览器API、Node.js API、文档格式、模型API |
| **总计** | **15** | **388+** | **全部通过 ✅** |

### 部署

- **Web 应用**：可部署到 Vercel、Netlify 等平台
- **Chrome 扩展**：可打包后上传到 Chrome 扩展商店

## 贡献

欢迎提交 Issue 和 Pull Request！

## 许可证

MIT 许可证
