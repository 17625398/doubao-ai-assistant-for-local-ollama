# 豆包AI助手 - 重构项目

这是一个基于原生豆包程序逆向解析重构的本地项目，提供了类似豆包AI助手的功能，包括聊天、文档解析、代码审查、数据分析等多种AI工具。

## 项目架构

项目采用 Monorepo 架构，使用 Turborepo 进行管理，包含以下包：

- `@doubao/core` - 核心功能模块，包含文档解析、Ollama 客户端、配置管理等
- `@doubao/web` - Web 应用模块，基于 Next.js 14 开发
- `@doubao/extension` - Chrome 扩展模块，支持浏览器集成

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

### Chrome 扩展功能
- **侧边栏**：在浏览器侧边栏中使用 AI 助手
- **上下文菜单**：通过右键菜单使用 AI 功能
- **页面分析**：分析当前页面内容
- **文本选择**：选中文本后提供 AI 操作

## 技术栈

- **前端框架**：React 18, Next.js 14
- **构建工具**：Turborepo, Webpack
- **样式**：Tailwind CSS
- **状态管理**：Zustand
- **类型系统**：TypeScript
- **AI 集成**：Ollama API
- **文档解析**：Mammoth.js, pdf-parse, xlsx, Tesseract.js
- **浏览器扩展**：Chrome Extension API

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

### 代理配置
- **启用代理**：是否启用代理
- **代理 URL**：代理服务器的 URL

### UI 配置
- **主题**：应用主题
- **语言**：应用语言
- **自动打开**：是否自动打开应用
- **上下文菜单**：是否启用上下文菜单

### 隐私配置
- **保存聊天历史**：是否保存聊天历史
- **共享使用数据**：是否共享使用数据

## 开发指南

### 添加新功能
1. 在 `packages/core` 中添加核心功能
2. 在 `packages/web` 中添加 UI 组件
3. 在 `packages/extension` 中添加扩展功能
4. 更新相关文档

### 测试
- 运行单元测试：`npm run test`
- 运行端到端测试：`npm run e2e`

### 部署
- **Web 应用**：可部署到 Vercel、Netlify 等平台
- **Chrome 扩展**：可打包后上传到 Chrome 扩展商店

## 贡献

欢迎提交 Issue 和 Pull Request！

## 许可证

MIT 许可证
