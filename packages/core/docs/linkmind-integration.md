# LinkMind 集成文档

## 概述
LinkMind 是一个企业级多模态 AI 中间件，支持 OpenClaw、Hermes Agent 和 DeerFlow 的运行时同步。本集成提供了与 LinkMind 服务的完整对接，包括聊天完成、模型管理、文档解析和 OCR 功能。

## 功能特性

### 1. 核心服务
- **聊天完成**：通过 LinkMind 的统一路由发送聊天请求
- **模型管理**：获取和管理 LinkMind 可用的模型
- **文档解析**：支持 PDF、Word、Excel、PowerPoint、文本和图像的解析
- **OCR 识别**：通过 LinkMind 进行图像文字识别
- **文本到 SQL**：将自然语言转换为 SQL 查询

### 2. 配置管理
- **服务配置**：服务器地址、API Key 配置
- **连接测试**：验证与 LinkMind 服务器的连接状态
- **模型列表**：自动获取并显示 LinkMind 可用的模型

## 配置指南

### 1. 基本配置
1. 打开 AI 配置面板
2. 选择 **LinkMind** 作为服务提供商
3. 输入 LinkMind 服务器地址（默认：`http://localhost:8080`）
4. 输入 API Key（如服务器需要认证）
5. 点击 **测试连接** 验证连接状态

### 2. 高级配置
- **超时设置**：默认 60 秒，可在代码中调整
- **流式响应**：支持逐字显示的流式聊天响应
- **代理设置**：可通过系统代理配置连接 LinkMind

## API 接口

### 核心服务

#### 聊天完成
```typescript
import { linkMindService } from '@core/index';

const response = await linkMindService.chat({
  model: 'gpt-4',
  messages: [
    { role: 'user', content: 'Hello, LinkMind!' }
  ],
  temperature: 0.7,
  stream: false
});
```

#### 流式聊天
```typescript
await linkMindService.chatStream(
  {
    model: 'gpt-4',
    messages: [{ role: 'user', content: 'Tell me a story' }]
  },
  (content) => {
    console.log('Received chunk:', content);
  }
);
```

#### 模型列表
```typescript
const models = await linkMindService.listModels();
console.log('Available models:', models);
```

### 文档处理

#### 文档解析
```typescript
import { linkMindDocumentParser } from '@core/index';

const result = await linkMindDocumentParser.parse(file, {
  extractText: true,
  extractTables: true,
  extractImages: true
});

console.log('Extracted text:', result.text);
```

#### OCR 识别
```typescript
const ocrText = await linkMindDocumentParser.performOCR(imageFile, 'eng');
console.log('OCR result:', ocrText);
```

## 集成示例

### 在 AI 聊天中使用 LinkMind

1. **配置 LinkMind**：在 AI 配置面板中完成 LinkMind 配置
2. **选择 LinkMind**：在模型选择中选择 LinkMind 作为服务提供商
3. **发送消息**：系统会自动通过 LinkMind 路由消息

### 文档解析集成

```typescript
import { documentParserRegistry } from '@core/index';

// 自动选择解析器（包括 LinkMind）
const result = await documentParserRegistry.parse(file, {
  extractText: true,
  enableOCR: true
});

console.log('Parsed document:', result);
```

## 故障排除

### 连接问题
- **检查服务器地址**：确保 LinkMind 服务器正在运行且地址正确
- **验证 API Key**：如果服务器需要认证，确保 API Key 正确
- **网络连接**：检查网络连接和防火墙设置

### 解析错误
- **文件格式**：确保文件格式被 LinkMind 支持
- **文件大小**：检查文件大小是否超出 LinkMind 限制
- **权限**：确保 LinkMind 服务器有足够的权限处理文件

## 性能优化

- **缓存**：启用文档解析缓存提高性能
- **分块处理**：对于大文档，使用分块处理
- **并行处理**：多个文档可并行解析

## 版本兼容性

- **LinkMind 版本**：推荐使用 1.2.3+ 版本
- **Node.js**：推荐 18.0+ 版本
- **浏览器**：支持所有现代浏览器

## 常见问题

### Q: LinkMind 服务器需要什么配置？
A: LinkMind 服务器需要 JDK 8+ 环境，推荐 8GB+ 内存。

### Q: 如何查看 LinkMind 服务器日志？
A: LinkMind 服务器日志默认存储在 `logs/` 目录。

### Q: 支持哪些文档格式？
A: 支持 PDF、Word、Excel、PowerPoint、文本和图像格式。

### Q: OCR 支持哪些语言？
A: 支持英文、中文、日文、韩文等多种语言。

## 技术支持

- **官方文档**：https://github.com/landingbj/LinkMind
- **在线演示**：https://lagi.landingbj.com
- **本地控制台**：http://localhost:8080

## 总结

LinkMind 集成提供了一个强大的企业级 AI 中间件解决方案，支持多模型路由、文档处理和 OCR 功能。通过简单的配置，您可以将 LinkMind 集成到现有的 AI 工作流中，获得更强大的 AI 能力。
