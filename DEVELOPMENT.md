# 开发指南

本指南详细说明如何开发和扩展豆包AI助手重构项目。

## 开发环境设置

### 前提条件
- Node.js 18+ 
- npm 9+
- Ollama（可选，用于本地 AI 模型）
- Chrome 浏览器（用于扩展开发）

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

3. 启动开发服务器
   ```bash
   npm run dev
   ```
   - Web 应用将在 http://localhost:3000 启动
   - 扩展开发模式将在相应端口启动

## 项目结构

### 核心模块 (`@doubao/core`)
核心模块包含项目的核心功能，如文档解析、Ollama 客户端、配置管理等。

**文件结构**：
```
packages/core/src/
├── utils/            # 工具函数
│   ├── document-parser.ts    # 文档解析器
│   ├── ollama-client.ts      # Ollama 客户端
│   ├── ai-config-manager.ts  # AI 配置管理器
│   ├── logger.ts             # 日志工具
│   ├── event-bus.ts          # 事件总线
│   ├── cache-manager.ts      # 缓存管理器
│   ├── bookmark-manager.ts   # 书签管理器
│   └── text-picker.ts        # 文本选择器
├── types/             # 类型定义
│   ├── index.ts              # 类型导出
│   ├── document.ts           # 文档相关类型
│   ├── bookmark.ts           # 书签相关类型
│   └── text-picker.ts        # 文本选择器相关类型
└── index.ts           # 模块导出
```

### Web 应用模块 (`@doubao/web`)
Web 应用模块基于 Next.js 14 开发，提供用户界面和交互功能。

**文件结构**：
```
packages/web/src/
├── app/               # Next.js 应用
│   ├── page.tsx              # 主页面
│   ├── new-tab/              # 新标签页
│   ├── document-processing/  # 文档处理页面
│   └── api/                  # API 路由
├── components/        # React 组件
│   ├── Sidebar.tsx           # 侧边栏
│   ├── ChatInput.tsx         # 聊天输入
│   ├── MessageItem.tsx       # 消息项
│   ├── Header.tsx            # 头部
│   ├── AIConfigPanel.tsx     # AI 配置面板
│   ├── ai-creation/          # AI 创作相关组件
│   ├── cloud-storage/        # 云存储相关组件
│   ├── quick-tools/          # 快捷工具相关组件
│   ├── screenshot-question/  # 截图提问相关组件
│   ├── screen-share/         # 屏幕共享相关组件
│   ├── ppt-generation/       # PPT 生成相关组件
│   ├── writing-assistant/    # 写作助手相关组件
│   ├── voice-chat/           # 语音聊天相关组件
│   ├── audio-translate/      # 音频翻译相关组件
│   ├── logic-mode/           # 逻辑模式相关组件
│   ├── mini-program/         # 小程序相关组件
│   ├── bookmark/             # 书签相关组件
│   ├── text-picker/          # 文本选择器相关组件
│   ├── code-review/          # 代码审查相关组件
│   ├── data-analysis/        # 数据分析相关组件
│   ├── translation/          # 翻译工具相关组件
│   └── summary/              # 文本总结相关组件
├── hooks/             # 自定义 Hooks
│   └── useOllamaChat.ts      # Ollama 聊天 Hook
├── store/             # 状态管理
│   ├── chat-store.ts         # 聊天状态
│   ├── bookmark-store.ts     # 书签状态
│   └── text-picker-store.ts  # 文本选择器状态
└── utils/             # 工具函数
    └── document-parser.ts    # 文档解析工具
```

### Chrome 扩展模块 (`@doubao/extension`)
Chrome 扩展模块提供浏览器集成功能，包括侧边栏、上下文菜单等。

**文件结构**：
```
packages/extension/src/
├── background/        # 后台脚本
│   └── index.ts              # 后台入口
├── content-script/    # 内容脚本
│   └── index.ts              # 内容脚本入口
├── options/           # 选项页面
│   ├── index.ts              # 选项页面入口
│   └── Options.tsx           # 选项页面组件
├── side-panel/        # 侧边栏
│   ├── index.ts              # 侧边栏入口
│   └── SidePanel.tsx         # 侧边栏组件
└── popup/             # 弹出页面
    ├── index.ts              # 弹出页面入口
    └── Popup.tsx             # 弹出页面组件
```

## 开发流程

### 添加新功能

1. **核心功能开发**
   - 在 `packages/core/src/utils/` 中添加新的工具函数
   - 在 `packages/core/src/types/` 中添加相关类型定义
   - 在 `packages/core/src/index.ts` 中导出新功能

2. **Web 应用开发**
   - 在 `packages/web/src/components/` 中创建新的组件
   - 在 `packages/web/src/app/page.tsx` 中集成新组件
   - 添加相应的事件监听器和状态管理

3. **扩展功能开发**
   - 在 `packages/extension/src/` 中添加相应的脚本和组件
   - 更新 `manifest.json` 文件

### 测试

1. **单元测试**
   - 在相应模块中添加 `__tests__` 目录
   - 编写测试用例
   - 运行测试：`npm run test`

2. **端到端测试**
   - 使用 Cypress 或 Playwright 编写端到端测试
   - 运行测试：`npm run e2e`

### 构建与部署

1. **构建生产版本**
   ```bash
   npm run build
   ```

2. **部署 Web 应用**
   - 可部署到 Vercel、Netlify 等平台
   - 配置相应的环境变量

3. **打包 Chrome 扩展**
   - 构建完成后，扩展包将生成在 `packages/extension/dist` 目录
   - 可上传到 Chrome 扩展商店

## 代码规范

### TypeScript
- 使用 TypeScript 类型系统
- 为所有函数和变量添加类型注解
- 使用接口定义复杂类型

### React
- 使用函数组件和 Hooks
- 遵循 React 最佳实践
- 使用 Tailwind CSS 进行样式设计

### 命名规范
- 变量和函数：使用驼峰命名法
- 组件：使用 PascalCase
- 常量：使用全大写和下划线
- 文件和目录：使用小写和连字符

### 代码风格
- 使用 Prettier 进行代码格式化
- 使用 ESLint 进行代码检查
- 保持代码简洁明了

## 常见问题

### 开发服务器启动失败
- 检查 Node.js 版本是否符合要求
- 检查端口是否被占用
- 检查依赖是否正确安装

### Ollama 连接失败
- 检查 Ollama 服务是否正在运行
- 检查 Ollama 地址是否正确配置
- 检查网络连接是否正常

### 文档解析失败
- 检查文件格式是否支持
- 检查文件大小是否超过限制
- 检查相关依赖是否正确安装

### 扩展安装失败
- 检查 Chrome 版本是否符合要求
- 检查扩展清单文件是否正确
- 检查扩展代码是否有语法错误

## 贡献指南

### 提交代码
1. Fork 项目
2. 创建分支
3. 提交代码
4. 推送分支
5. 创建 Pull Request

### 代码审查
- 遵循代码规范
- 提供清晰的提交信息
- 确保代码测试通过
- 提供详细的功能说明

### 问题报告
- 提供详细的问题描述
- 提供复现步骤
- 提供相关的错误信息
- 提供环境信息

## 联系我们

如有任何问题或建议，欢迎联系我们！
