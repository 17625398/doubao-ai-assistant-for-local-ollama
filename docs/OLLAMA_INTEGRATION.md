# Ollama 集成文档

本文档详细描述了豆包AI助手中 Ollama 本地模型服务的集成方案和使用方法。

## 📑 目录

- [概述](#概述)
- [功能特性](#功能特性)
- [配置说明](#配置说明)
- [API 接口](#api-接口)
- [UI 组件](#ui-组件)
- [使用示例](#使用示例)
- [故障排除](#故障排除)

---

## 概述

Ollama 是一个用于在本地运行大型语言模型（LLM）的工具。通过集成 Ollama，豆包AI助手可以在不依赖云服务的情况下，使用本地部署的 AI 模型进行对话。

### 架构设计

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│   Web 应用      │────▶│  Ollama Client  │────▶│  Ollama 服务    │
│                 │     │                 │     │  localhost:11434│
│ - ChatInput     │◀────│ - HTTP API      │◀────│                 │
│ - MessageList   │     │ - Streaming     │     │ - llama2        │
│ - AIConfigPanel │     │ - Error Handler │     │ - mistral       │
└─────────────────┘     └─────────────────┘     └─────────────────┘
         │                       │
         ▼                       ▼
┌─────────────────┐     ┌─────────────────┐
│  AI Config      │     │  Event Bus      │
│  Manager        │     │                 │
│                 │     │ - config:changed│
│ - LocalStorage  │     │ - ollama:connected
│ - Chrome Storage│     │ - models-updated│
└─────────────────┘     └─────────────────┘
```

---

## 功能特性

### 核心功能

- ✅ **自定义服务地址** - 支持配置 Ollama 服务地址（默认 localhost:11434）
- ✅ **模型选择** - 自动获取并显示本地可用的模型列表
- ✅ **流式响应** - 支持实时流式输出，提升用户体验
- ✅ **连接测试** - 内置连接测试功能，验证服务可用性
- ✅ **配置持久化** - 配置自动保存到 localStorage / chrome.storage
- ✅ **多环境支持** - 同时支持 Web 应用和 Chrome 扩展环境

### 支持的模型

通过 Ollama 可以运行多种开源模型：

| 模型 | 描述 | 参数规模 |
|------|------|----------|
| llama2 | Meta 的 Llama 2 模型 | 7B/13B/70B |
| mistral | Mistral AI 的模型 | 7B |
| codellama | 代码专用模型 | 7B/13B/34B |
| vicuna | 基于 Llama 的指令模型 | 7B/13B |
| neural-chat | Intel 的神经网络对话模型 | 7B |

---

## 配置说明

### 配置项

```typescript
interface OllamaConfig {
  /** 服务地址，默认 http://localhost:11434 */
  baseUrl: string;
  
  /** 默认使用的模型 */
  defaultModel: string;
  
  /** 请求超时时间（毫秒） */
  timeout: number;
  
  /** 是否启用流式响应 */
  streamEnabled: boolean;
  
  /** 自定义请求头 */
  headers?: Record<string, string>;
}
```

### 默认配置

```typescript
const defaultConfig: OllamaConfig = {
  baseUrl: 'http://localhost:11434',
  defaultModel: 'llama2',
  timeout: 30000,
  streamEnabled: true,
};
```

### 配置界面

在聊天界面点击右下角的"配置"按钮，打开 AI 配置面板：

1. **服务地址** - 输入 Ollama 服务的 URL
2. **模型选择** - 从下拉列表选择可用模型
3. **连接测试** - 点击"测试连接"验证服务
4. **流式响应** - 开关控制是否启用流式输出

---

## API 接口

### OllamaClient

核心客户端类，封装了 Ollama HTTP API。

```typescript
class OllamaClient {
  constructor(config?: Partial<OllamaConfig>);
  
  // 更新配置
  updateConfig(config: Partial<OllamaConfig>): void;
  
  // 检查服务可用性
  async isAvailable(): Promise<boolean>;
  
  // 获取模型列表
  async listModels(): Promise<OllamaModel[]>;
  
  // 生成文本（非流式）
  async generate(
    prompt: string,
    options?: Partial<OllamaGenerateRequest>
  ): Promise<OllamaGenerateResponse>;
  
  // 生成文本（流式）
  async *generateStream(
    prompt: string,
    options?: Partial<OllamaGenerateRequest>
  ): AsyncGenerator<OllamaGenerateResponse, void, unknown>;
  
  // 聊天（非流式）
  async chat(
    request: OllamaChatRequest
  ): Promise<OllamaChatResponse>;
  
  // 聊天（流式）
  async *chatStream(
    request: OllamaChatRequest
  ): AsyncGenerator<OllamaChatResponse, void, unknown>;
}
```

### AIConfigManager

配置管理器，负责配置的读取、保存和同步。

```typescript
class AIConfigManager {
  static getInstance(): AIConfigManager;
  
  // 获取当前配置
  getConfig(): AIServiceConfig;
  
  // 更新配置
  async updateConfig(config: Partial<AIServiceConfig>): Promise<void>;
  
  // 获取 Ollama 配置
  getOllamaConfig(): OllamaConfig | undefined;
  
  // 更新 Ollama 配置
  async updateOllamaConfig(config: Partial<OllamaConfig>): Promise<void>;
  
  // 测试连接
  async testOllamaConnection(): Promise<{
    success: boolean;
    version?: string;
    error?: string;
  }>;
  
  // 获取可用模型
  async getOllamaModels(): Promise<OllamaModel[]>;
  
  // 获取默认模型名称
  getDefaultModel(): string;
  
  // 设置默认模型
  async setDefaultModel(model: string): Promise<void>;
  
  // 重置为默认配置
  async resetToDefaults(): Promise<void>;
  
  // 导出/导入配置
  exportConfig(): string;
  async importConfig(configJson: string): Promise<void>;
}

// 全局实例
export const aiConfigManager = AIConfigManager.getInstance();
```

### useOllamaChat Hook

React Hook，用于在组件中集成 Ollama 聊天功能。

```typescript
function useOllamaChat(options?: {
  onError?: (error: Error) => void;
}): {
  messages: ChatMessage[];
  isLoading: boolean;
  error: Error | null;
  currentModel: string;
  sendMessage: (content: string) => Promise<void>;
  clearMessages: () => void;
  regenerateMessage: (messageId: string) => Promise<void>;
  stopGeneration: () => void;
};
```

---

## UI 组件

### AIConfigPanel

AI 配置面板组件，提供可视化的配置界面。

```typescript
interface AIConfigPanelProps {
  onClose: () => void;
}

// 使用示例
<AIConfigPanel onClose={() => setConfigPanelOpen(false)} />
```

**功能特性：**
- 服务地址输入
- 模型选择下拉框
- 连接状态显示
- 连接测试按钮
- 配置保存/重置

### ChatInput 扩展

增强的聊天输入组件，新增配置入口和模型显示。

```typescript
interface ChatInputProps {
  onSend: (message: string, attachments?: File[]) => void;
  disabled?: boolean;
  onOpenConfig?: () => void;  // 新增：打开配置面板
  currentModel?: string;       // 新增：当前模型名称
}

// 使用示例
<ChatInput
  onSend={handleSendMessage}
  disabled={isLoading}
  onOpenConfig={() => setConfigPanelOpen(true)}
  currentModel={currentModel}
/>
```

---

## 使用示例

### 1. 基础使用

```typescript
import { aiConfigManager, ollamaClient } from '@core/index';

// 发送消息
async function sendMessage(content: string) {
  const config = aiConfigManager.getConfig();
  
  if (config.provider !== 'ollama') {
    throw new Error('Ollama 服务未配置');
  }
  
  const response = await ollamaClient.chat({
    model: config.ollama!.defaultModel,
    messages: [{ role: 'user', content }],
  });
  
  return response.message.content;
}
```

### 2. 流式响应

```typescript
async function* streamMessage(content: string) {
  const config = aiConfigManager.getConfig();
  
  const stream = ollamaClient.chatStream({
    model: config.ollama!.defaultModel,
    messages: [{ role: 'user', content }],
  });
  
  for await (const chunk of stream) {
    if (chunk.message?.content) {
      yield chunk.message.content;
    }
  }
}

// 使用
for await (const text of streamMessage('你好')) {
  console.log(text); // 逐字输出
}
```

### 3. 在 React 组件中使用

```typescript
import { useOllamaChat } from '@/hooks/useOllamaChat';

function ChatPage() {
  const {
    messages,
    isLoading,
    error,
    currentModel,
    sendMessage,
    clearMessages,
    stopGeneration,
  } = useOllamaChat({
    onError: (err) => console.error('Chat error:', err),
  });

  return (
    <div>
      <MessageList messages={messages} />
      <ChatInput
        onSend={(msg) => sendMessage(msg)}
        disabled={isLoading}
        currentModel={currentModel}
      />
      {isLoading && (
        <button onClick={stopGeneration}>停止生成</button>
      )}
    </div>
  );
}
```

### 4. 配置管理

```typescript
import { aiConfigManager } from '@core/index';

// 更新配置
await aiConfigManager.updateOllamaConfig({
  baseUrl: 'http://192.168.1.100:11434',
  defaultModel: 'mistral',
  timeout: 60000,
});

// 测试连接
const result = await aiConfigManager.testOllamaConnection();
if (result.success) {
  console.log('连接成功');
} else {
  console.error('连接失败:', result.error);
}

// 获取可用模型
const models = await aiConfigManager.getOllamaModels();
console.log('可用模型:', models.map(m => m.name));
```

---

## 故障排除

### 常见问题

#### 1. 连接失败

**症状：** 测试连接时显示"连接失败"

**排查步骤：**
1. 确认 Ollama 服务已启动：`ollama serve`
2. 检查服务地址是否正确（默认 http://localhost:11434）
3. 检查防火墙设置，确保端口 11434 可访问
4. 查看浏览器控制台是否有 CORS 错误

**解决方案：**
```bash
# 启动 Ollama 服务
ollama serve

# 验证服务状态
curl http://localhost:11434/api/tags
```

#### 2. 模型不存在

**症状：** 发送消息时提示模型不存在

**解决方案：**
```bash
# 列出已下载的模型
ollama list

# 下载模型
ollama pull llama2
ollama pull mistral
```

#### 3. 跨域错误 (CORS)

**症状：** 浏览器控制台显示 CORS 错误

**解决方案：**
启动 Ollama 时设置环境变量：
```bash
# Linux/Mac
OLLAMA_ORIGINS="*" ollama serve

# Windows PowerShell
$env:OLLAMA_ORIGINS="*"
ollama serve
```

#### 4. 响应超时

**症状：** 长时间无响应后显示超时错误

**解决方案：**
- 增加超时时间设置
- 检查模型是否正在加载（首次使用需要下载）
- 降低生成长度限制

```typescript
await aiConfigManager.updateOllamaConfig({
  timeout: 120000, // 增加到 2 分钟
});
```

### 调试技巧

1. **启用日志**
```typescript
import { logger } from '@core/index';

logger.setLevel('debug');
```

2. **检查网络请求**
打开浏览器开发者工具，查看 Network 标签页的请求和响应。

3. **验证 Ollama API**
```bash
# 测试生成接口
curl -X POST http://localhost:11434/api/generate -d '{
  "model": "llama2",
  "prompt": "Hello"
}'

# 测试聊天接口
curl -X POST http://localhost:11434/api/chat -d '{
  "model": "llama2",
  "messages": [{"role": "user", "content": "Hello"}]
}'
```

#### 多模态图片输入（Ollama）

当使用支持图片输入的模型时，可以在单条 message 上携带 `images` 字段（base64 字符串数组）：

```bash
curl -X POST http://localhost:11434/api/chat -d '{
  "model": "llama3.2-vision",
  "messages": [{
    "role": "user",
    "content": "描述这张图片",
    "images": ["<BASE64_IMAGE>"]
  }]
}'
```

---

## 更新日志

### v1.0.0 (2024-03-31)

- ✅ 实现 OllamaClient 核心客户端
- ✅ 实现 AIConfigManager 配置管理器
- ✅ 创建 AIConfigPanel 配置面板 UI
- ✅ 实现 useOllamaChat React Hook
- ✅ 集成到主聊天界面
- ✅ 支持流式响应
- ✅ 支持连接测试
- ✅ 支持模型列表自动获取
