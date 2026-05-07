# 多模型适配层 (Multi-Model Adapter Layer)

> 统一接口 + 智能路由 + 多模型支持

## 特性

- **统一接口** - 所有模型使用相同的 API
- **智能路由** - 基于复杂度自动选择模型
- **本地优先** - 优先使用 Ollama 本地模型（零成本）
- **自动降级** - 主模型失败自动切换备用模型
- **流式响应** - 支持 SSE 流式输出
- **成本控制** - 按需选择模型

## 安装

```typescript
// 从 core 模块导入
import { 
  createMultiModelLayer,
  OllamaAdapter,
  calculateMessageComplexity 
} from './core';
```

## 快速开始

### 1. 基础使用

```typescript
import { createMultiModelLayer } from './core';

// 创建适配层
const layer = createMultiModelLayer({
  ollama: {
    baseUrl: 'http://localhost:11434',
    defaultModel: 'gemma4:26b',
  },
});

// 简单对话 - 自动路由
const response = await layer.chat({
  messages: [
    { role: 'user', content: '你好，请介绍一下你自己' }
  ]
});

console.log(response.message.content);
```

### 2. 流式响应

```typescript
// 流式输出
for await (const chunk of layer.chatStream({
  messages: [
    { role: 'user', content: '写一首关于春天的诗' }
  ]
})) {
  process.stdout.write(chunk.delta);
  
  if (chunk.done) {
    console.log('\n\n生成完成');
    if (chunk.metrics) {
      console.log('Tokens:', chunk.metrics.evalCount);
    }
  }
}
```

### 3. 多模型配置

```typescript
const layer = createMultiModelLayer({
  // Ollama 本地模型 (零成本)
  ollama: {
    baseUrl: 'http://localhost:11434',
    defaultModel: 'gemma4:26b',
  },
  
  // DeepSeek (低成本)
  openai: {
    deepseek: {
      provider: 'deepseek',
      model: 'deepseek-chat',
      baseUrl: 'https://api.deepseek.com',
      apiKey: process.env.DEEPSEEK_API_KEY || '',
    },
  },
  
  // Claude (高质量)
  anthropic: {
      provider: 'anthropic',
      model: 'claude-3-haiku-20240307',
      baseUrl: 'https://api.anthropic.com',
      apiKey: process.env.ANTHROPIC_API_KEY || '',
    },
  
  default: 'ollama',
  preferLocal: true,
  complexityThreshold: 0.6,
});
```

### 4. 指定模型

```typescript
// 指定使用 DeepSeek
const response = await layer.chatWith('deepseek', {
  messages: [
    { role: 'user', content: '解释量子计算的基本原理' }
  ]
});
```

### 5. 带系统提示词

```typescript
const response = await layer.chat({
  messages: [
    { role: 'user', content: '代码有问题吗？' }
  ],
  system: `你是一个专业的代码审查助手。
请仔细分析代码，指出潜在问题并提供改进建议。
回答要简洁、专业。`
});
```

### 6. 多轮对话

```typescript
const messages: ChatMessage[] = [];

// 第一轮
messages.push({ role: 'user', content: '什么是 TypeScript？' });
const r1 = await layer.chat({ messages });
messages.push(r1.message);

// 第二轮
messages.push({ role: 'user', content: '它和 JavaScript 有什么区别？' });
const r2 = await layer.chat({ messages });
messages.push(r2.message);

// 第三轮
messages.push({ role: 'user', content: '如何开始学习？' });
const r3 = await layer.chat({ messages });
```

## 架构

```
┌─────────────────────────────────────────────────────────┐
│                    MultiModelLayer                       │
├─────────────────────────────────────────────────────────┤
│                                                          │
│  ┌──────────────────────────────────────────────────┐  │
│  │              Unified Interface                     │  │
│  │  chat() / chatStream() / generate()              │  │
│  └─────────────────────┬────────────────────────────┘  │
│                        ▼                                 │
│  ┌──────────────────────────────────────────────────┐  │
│  │              Router Engine                       │  │
│  │  • 复杂度分析 (length + code + math)            │  │
│  │  • 能力匹配 (vision + multimodal)               │  │
│  │  • 成本优化 (prefer local)                      │  │
│  └─────────────────────┬────────────────────────────┘  │
│                        ▼                                 │
│  ┌──────────────────────────────────────────────────┐  │
│  │              Model Adapters                       │  │
│  │  ┌────────────┐  ┌────────────┐  ┌──────────┐ │  │
│  │  │  Ollama    │  │   OpenAI   │  │ DeepSeek │ │  │
│  │  │  Adapter   │  │  Adapter   │  │ Adapter  │ │  │
│  │  └────────────┘  └────────────┘  └──────────┘ │  │
│  └──────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────┘
```

## 路由算法

### 复杂度计算

```typescript
复杂度 = 长度(50%) + 代码(30%) + 数学(20%) + 多问题(10%)

// 示例
"你好"                              → 复杂度: 5%
"帮我写代码..."                      → 复杂度: 35%
"分析代码+求数学问题..."             → 复杂度: 95%
```

### 模型选择

| 复杂度 | 模型类型 | 示例模型 |
|--------|----------|----------|
| ≤ 60% | lightweight | Ollama (gemma4:26b) |
| > 60% | heavyweight | DeepSeek / Claude |

## API 参考

### 类型

```typescript
interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
  images?: string[];  // Base64 或 URL
}

interface ChatRequest {
  model?: string;
  messages: ChatMessage[];
  system?: string;
  temperature?: number;
  maxTokens?: number;
  stream?: boolean;
}

interface ChatResponse {
  message: ChatMessage;
  done: boolean;
  totalDuration?: number;
}

interface ChatChunk {
  delta: string;
  done: boolean;
  metrics?: {
    promptEvalCount?: number;
    evalCount?: number;
    totalDuration?: number;
  };
}
```

### 方法

| 方法 | 说明 |
|------|------|
| `layer.chat(request)` | 发送聊天请求（自动路由） |
| `layer.chatStream(request)` | 流式聊天（自动路由） |
| `layer.chatWith(name, request)` | 指定适配器发送请求 |
| `layer.listAdapters()` | 列出所有可用模型 |
| `layer.getStats()` | 获取使用统计 |

## 配置选项

```typescript
interface LayerConfig {
  ollama?: OllamaConfig;
  openai?: Record<string, OpenAIConfig>;
  default?: string;           // 默认适配器名称
  preferLocal?: boolean;       // 优先使用本地模型
  complexityThreshold?: number; // 复杂度阈值 (默认 0.6)
}

interface OllamaConfig {
  baseUrl?: string;
  defaultModel?: string;
  timeout?: number;
}

interface OpenAIConfig {
  provider: 'openai' | 'deepseek' | 'anthropic' | 'gemini' | 'azure';
  model: string;
  baseUrl: string;
  apiKey: string;
}
```

## 错误处理

```typescript
try {
  const response = await layer.chat({
    messages: [{ role: 'user', content: '你好' }]
  });
  console.log('成功:', response.message.content);
} catch (error) {
  if (error.message.includes('403')) {
    console.error('权限错误：检查 API 密钥或 CORS 设置');
  } else if (error.message.includes('timeout')) {
    console.error('请求超时：检查网络连接');
  } else {
    console.error('未知错误:', error);
  }
}
```

## 最佳实践

1. **环境检测** - 自动检测 Extension vs Web 环境
2. **降级策略** - 配置多个模型作为备用
3. **缓存结果** - 相同问题避免重复调用
4. **监控统计** - 定期检查 `layer.getStats()`

## 示例代码

完整示例请参考 `multi-model-adapter.examples.ts`
