# 多模型适配层 API 文档

## 目录

- [安装](#安装)
- [快速开始](#快速开始)
- [核心 API](#核心-api)
  - [MultiModelAdapterLayer](#multimodeladapterlayer)
  - [createMultiModelLayer](#createmultimodellayer)
- [适配器](#适配器)
  - [OllamaAdapter](#ollamaadapter)
  - [OpenAICompatibleAdapter](#openaicompatibleadapter)
  - [AzureOpenAIAdapter](#azureopenaicompatibleadapter)
  - [BedrockAdapter](#bedrockadapter)
  - [LocalModelAdapter](#localmodeladapter)
  - [GeminiAdapter](#geminiexadapter)
  - [ClaudeAdapter](#claudeexadapter)
- [缓存系统](#缓存系统)
  - [EnhancedCacheManager](#enhancedcachemanager)
  - [ResponseCache](#responsecache)
  - [SimilarQuestionCache](#similarquestioncache)
- [WebSocket 支持](#websocket-支持)
  - [ModelWebSocketClient](#modelwebsocketclient)
- [性能优化](#性能优化)
  - [ConnectionPool](#connectionpool)
  - [BatchRequestHandler](#batchrequesthandler)
  - [ParallelExecutor](#parallelexecutor)
  - [PerformanceMonitor](#performancemonitor)
- [CLI 工具](#cli-工具)
- [类型定义](#类型定义)

---

## 安装

```bash
npm install @refactored/core
```

或使用 yarn:

```bash
yarn add @refactored/core
```

---

## 快速开始

```typescript
import { createMultiModelLayer } from '@refactored/core';

// 创建多模型层
const layer = createMultiModelLayer({
  ollama: {
    baseUrl: 'http://localhost:11434',
    defaultModel: 'gemma4:26b',
  },
  openai: {
    deepseek: {
      provider: 'deepseek',
      model: 'deepseek-chat',
      baseUrl: 'https://api.deepseek.com',
      apiKey: process.env.DEEPSEEK_API_KEY,
    },
  },
  preferLocal: true,
});

// 简单聊天
const response = await layer.chat({
  messages: [{ role: 'user', content: '你好' }],
});

console.log(response.content);

// 流式聊天
for await (const chunk of layer.chatStream({
  messages: [{ role: 'user', content: '写一首诗' }],
})) {
  process.stdout.write(chunk.delta);
}
```

---

## 核心 API

### MultiModelAdapterLayer

多模型适配层主类。

#### 构造函数

```typescript
constructor(config: LayerConfig)
```

#### 方法

##### `chat(request)`

发送聊天请求。

```typescript
async chat(request: ChatRequest): Promise<ChatResponse>
```

##### `chatStream(request)`

流式聊天。

```typescript
async *chatStream(
  request: ChatRequest,
  signal?: AbortSignal
): AsyncGenerator<ChatChunk, void, unknown>
```

##### `listModels()`

列出所有可用模型。

```typescript
async listModels(): Promise<ModelInfo[]>
```

##### `getModelInfo(modelName)`

获取指定模型信息。

```typescript
async getModelInfo(modelName: string): Promise<ModelInfo>
```

##### `checkAdapter(name)`

检查适配器是否可用。

```typescript
async checkAdapter(name: string): Promise<boolean>
```

##### `getAvailableAdapters()`

获取可用适配器列表。

```typescript
getAvailableAdapters(): string[]
```

##### `selectModel(request)`

手动选择模型。

```typescript
selectModel(request: ChatRequest, preference?: ModelPreference): string
```

##### `getMetrics()`

获取性能指标。

```typescript
getMetrics(): MetricsSummary
```

##### `resetMetrics()`

重置指标。

```typescript
resetMetrics(): void
```

##### `clearCache()`

清空缓存。

```typescript
async clearCache(): Promise<void>
```

##### `on(event, listener)`

添加事件监听。

```typescript
on<K extends keyof LayerEvents>(event: K, listener: LayerEvents[K]): void
```

---

### createMultiModelLayer

工厂函数，创建多模型层实例。

```typescript
function createMultiModelLayer(config: LayerConfig): MultiModelAdapterLayer
```

---

## 适配器

### OllamaAdapter

Ollama 本地模型适配器。

```typescript
import { OllamaAdapter } from '@refactored/core';

const adapter = new OllamaAdapter({
  baseUrl: 'http://localhost:11434',
  defaultModel: 'gemma4:26b',
  timeout: 300000,
});

// 检查可用性
const isAvailable = await adapter.isAvailable();

// 聊天
const response = await adapter.chat({
  messages: [{ role: 'user', content: 'Hello' }],
});

// 流式
for await (const chunk of adapter.chatStream({
  messages: [{ role: 'user', content: 'Hello' }],
})) {
  console.log(chunk.delta);
}
```

#### 配置

```typescript
interface OllamaAdapterConfig {
  baseUrl: string;
  defaultModel: string;
  timeout?: number;
  fallbackModels?: string[];
}
```

---

### OpenAICompatibleAdapter

OpenAI 兼容 API 适配器。

```typescript
import { OpenAICompatibleAdapter } from '@refactored/core';

const adapter = new OpenAICompatibleAdapter({
  provider: 'openai',
  model: 'gpt-4',
  baseUrl: 'https://api.openai.com/v1',
  apiKey: process.env.OPENAI_API_KEY,
});
```

#### 支持的提供商

- `openai` - OpenAI
- `deepseek` - DeepSeek
- `mistral` - Mistral AI
- `groq` - Groq
- `openrouter` - OpenRouter
- `custom` - 自定义兼容服务

---

### AzureOpenAIAdapter

Azure OpenAI 适配器。

```typescript
import { AzureOpenAIAdapter } from '@refactored/core';

const adapter = new AzureOpenAIAdapter({
  endpoint: 'https://your-resource.openai.azure.com',
  apiKey: 'your-api-key',
  deploymentName: 'gpt-4-turbo',
  apiVersion: '2024-02-15-preview',
});
```

---

### BedrockAdapter

AWS Bedrock 适配器。

```typescript
import { BedrockAdapter } from '@refactored/core';

const adapter = new BedrockAdapter({
  region: 'us-east-1',
  accessKeyId: process.env.AWS_ACCESS_KEY_ID,
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  modelId: 'anthropic.claude-3-sonnet-20240229-v1:0',
});
```

#### 支持的模型

- Claude on Bedrock (`anthropic.*`)
- Llama 2 on Bedrock (`meta.*`)
- Titan on Bedrock
- 其他 Bedrock 支持的模型

---

### LocalModelAdapter

本地模型适配器。

```typescript
import { LocalModelAdapter } from '@refactored/core';

const adapter = new LocalModelAdapter({
  provider: 'ollama', // ollama, lm-studio, llama-cpp, text-generation-webui, koboldcpp
  baseUrl: 'http://localhost:11434',
  model: 'llama2:7b',
});
```

---

### GeminiExAdapter

Google Gemini 适配器。

```typescript
import { GeminiExAdapter } from '@refactored/core';

const adapter = new GeminiExAdapter({
  apiKey: process.env.GEMINI_API_KEY,
  model: 'gemini-1.5-pro',
});
```

---

### ClaudeExAdapter

Anthropic Claude 适配器。

```typescript
import { ClaudeExAdapter } from '@refactored/core';

const adapter = new ClaudeExAdapter({
  apiKey: process.env.ANTHROPIC_API_KEY,
  model: 'claude-3-5-sonnet-20241022',
});
```

---

## 缓存系统

### EnhancedCacheManager

增强缓存管理器。

```typescript
import { EnhancedCacheManager, type EnhancedCacheConfig } from '@refactored/core';

const cache = new EnhancedCacheManager<ChatResponse>({
  maxEntries: 1000,
  evictionPolicy: 'lru', // lru, lfu, fifo, lifespan
  ttl: 3600000, // 1小时
  persistence: 'localStorage',
  similarityCache: true,
  similarityThreshold: 0.85,
});

// 设置
await cache.set('key', response);

// 获取
const value = await cache.get('key');

// 相似查找
const similar = await cache.findSimilar('query string');
```

### ResponseCache

响应缓存。

```typescript
import { createResponseCache } from '@refactored/core';

const cache = createResponseCache({
  maxEntries: 500,
  ttl: 7200000,
});

// 获取响应
const response = await cache.get(request, modelId);

// 设置响应
await cache.set(request, response, modelId);

// 统计
const stats = cache.getStats();
console.log(`命中率: ${stats.hitRate}`);
```

### SimilarQuestionCache

相似问题缓存。

```typescript
import { createSimilarQuestionCache } from '@refactored/core';

const cache = createSimilarQuestionCache({
  similarityThreshold: 0.8,
});

// 查找相似响应
const response = await cache.findSimilarResponse('How to make coffee?');

// 添加新响应
await cache.add('How to brew coffee?', response);
```

---

## WebSocket 支持

### ModelWebSocketClient

WebSocket 客户端。

```typescript
import { ModelWebSocketClient } from '@refactored/core';

const ws = new ModelWebSocketClient({
  url: 'localhost:8080',
  token: 'optional-auth-token',
  maxReconnectAttempts: 5,
  heartbeatInterval: 30000,
});

// 连接
await ws.connect();

// 事件监听
ws.on('open', () => console.log('Connected'));
ws.on('close', (code, reason) => console.log('Disconnected'));
ws.on('error', (error) => console.error(error));
ws.on('message', (data) => console.log(data));
ws.on('streamStart', (streamId) => console.log('Stream started:', streamId));
ws.on('streamEnd', (streamId, response) => console.log('Stream ended'));

// 聊天
const response = await ws.chat({
  messages: [{ role: 'user', content: 'Hello' }],
});

// 流式
for await (const chunk of ws.chatStream({
  messages: [{ role: 'user', content: 'Hello' }],
})) {
  process.stdout.write(chunk.delta);
}

// 取消
ws.abort();

// 断开
ws.disconnect();
```

---

## 性能优化

### ConnectionPool

连接池。

```typescript
import { createConnectionPool } from '@refactored/core';

const pool = createConnectionPool({
  maxConnections: 10,
  minConnections: 2,
  idleTimeout: 60000,
  acquireTimeout: 30000,
  prewarm: true,
}, () => createConnection());

// 获取连接
const conn = await pool.acquire();

// 使用
await conn.execute();

// 释放
pool.release(conn);

// 统计
const stats = pool.getStats();
console.log(stats); // { total: 10, inUse: 5, idle: 5, waiting: 0 }
```

### BatchRequestHandler

批量请求处理器。

```typescript
import { createBatchHandler } from '@refactored/core';

const batch = createBatchHandler({
  maxBatchSize: 10,
  maxWaitTime: 100,
}, async (requests) => {
  // 批量处理请求
  return Promise.all(requests.map(r => processChat(r)));
});

// 添加请求
const response = await batch.execute({
  messages: [{ role: 'user', content: 'Hello' }],
});
```

### ParallelExecutor

并行执行器。

```typescript
import { createParallelExecutor } from '@refactored/core';

const executor = createParallelExecutor({
  maxConcurrency: 3,
  failStrategy: 'majority', // all, any, majority, none
});

// 并行执行多个任务
const { successful, failed } = await executor.execute([
  () => chat('model-a', message),
  () => chat('model-b', message),
  () => chat('model-c', message),
]);
```

### PerformanceMonitor

性能监控器。

```typescript
import { createPerformanceMonitor } from '@refactored/core';

const monitor = createPerformanceMonitor();

// 记录操作
const end = monitor.start('chat-request');

await chat();
end(true); // 成功

try {
  await chat();
  end(true);
} catch (error) {
  end(false, error.message); // 失败
}

// 获取统计
const stats = monitor.getStats();
console.log(stats);
// {
//   totalRecords: 100,
//   operations: {
//     'chat-request': {
//       count: 100,
//       avgDuration: 150,
//       minDuration: 50,
//       maxDuration: 500,
//       p50: 120,
//       p95: 300,
//       p99: 450
//     }
//   }
// }
```

---

## CLI 工具

安装 CLI:

```bash
npm install -g @refactored/core
```

或直接运行:

```bash
npx mllm-cli --help
```

### 命令

```bash
# 列出模型
mllm-cli models

# 单次聊天
mllm-cli chat:once "你好"

# 流式聊天
mllm-cli chat:stream "写一首诗"

# 交互式聊天
mllm-cli chat

# 缓存统计
mllm-cli cache:stats

# 性能指标
mllm-cli metrics

# 保存配置
mllm-cli config:save config.json

# 加载配置
mllm-cli config:load config.json
```

### 配置

创建 `config.json`:

```json
{
  "ollama": {
    "baseUrl": "http://localhost:11434",
    "defaultModel": "gemma4:26b"
  },
  "openai": {
    "deepseek": {
      "provider": "deepseek",
      "model": "deepseek-chat",
      "baseUrl": "https://api.deepseek.com",
      "apiKey": "${DEEPSEEK_API_KEY}"
    }
  },
  "preferLocal": true
}
```

运行:

```bash
mllm-cli chat --config config.json
```

---

## 类型定义

### ChatRequest

```typescript
interface ChatRequest {
  messages: ChatMessage[];
  model?: string;
  temperature?: number;
  maxTokens?: number;
  topP?: number;
  stop?: string | string[];
  stream?: boolean;
  tools?: ChatTool[];
  toolChoice?: 'auto' | 'none' | { type: 'function'; function: { name: string } };
  responseFormat?: { type: 'text' } | { type: 'json_object'; schema?: object };
}
```

### ChatResponse

```typescript
interface ChatResponse {
  id: string;
  model: string;
  content: string;
  role: 'assistant';
  usage?: {
    inputTokens: number;
    outputTokens: number;
    totalTokens: number;
  };
  finishReason?: 'stop' | 'length' | 'content_filter' | 'tool_calls' | 'function_call';
  raw?: unknown;
}
```

### ChatChunk

```typescript
interface ChatChunk {
  id: string;
  delta: string;
  done: boolean;
  fullContent?: string;
  finishReason?: string;
  usage?: {
    inputTokens: number;
    outputTokens: number;
    totalTokens: number;
  };
  raw?: unknown;
}
```

### ModelInfo

```typescript
interface ModelInfo {
  name: string;
  provider: string;
  capabilities: ModelCapability;
  contextWindow: number;
  maxOutputTokens: number;
}
```

### ModelCapability

```typescript
interface ModelCapability {
  streaming: boolean;
  functionCalling: boolean;
  vision: boolean;
  jsonMode: boolean;
}
```

---

## 许可证

MIT
