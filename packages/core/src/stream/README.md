# 流式处理系统使用指南

## 📖 概述

流式处理系统提供完整的 AI 流式响应控制能力,包括暂停/恢复/取消、上下文注入、自动重试等功能。

---

## 🚀 快速开始

### 1. 基本流式请求

```typescript
import { createStreamController } from '@doubao/core';

// 创建控制器
const controller = createStreamController({
  apiUrl: 'https://api.openai.com/v1/chat/completions',
  apiKey: 'your-api-key',
  model: 'gpt-3.5-turbo',
  temperature: 0.7,
  maxTokens: 1000
});

// 开始流式
const content = await controller.start(
  [{ role: 'user', content: '你好' }],
  {
    onChunk: (chunk) => {
      console.log('增量:', chunk.delta);
      console.log('完整内容:', chunk.content);
    },
    onComplete: (fullContent) => {
      console.log('完成:', fullContent);
    },
    onError: (error) => {
      console.error('错误:', error);
    }
  }
);
```

### 2. 暂停和恢复

```typescript
// 开始流式
controller.start(messages, {
  onChunk: (chunk) => {
    // 暂停
    if (chunk.index === 5) {
      controller.pause();
      
      // 3 秒后恢复
      setTimeout(() => {
        controller.resume();
      }, 3000);
    }
  }
});
```

### 3. 取消流式

```typescript
controller.start(messages, {
  onChunk: (chunk) => {
    // 取消
    if (shouldCancel) {
      controller.cancel();
    }
  },
  onCancel: () => {
    console.log('已取消');
  }
});
```

---

## 🎯 核心功能

### StreamController (流式控制器)

**创建方式**:
```typescript
// 方式 1: 使用工厂函数
const controller = createStreamController(config);

// 方式 2: 直接实例化
const controller = new StreamController(config);
```

**配置选项**:
```typescript
interface StreamConfig {
  apiUrl: string;              // API 地址 (必需)
  apiKey?: string;             // API 密钥
  model: string;               // 模型名称 (必需)
  temperature?: number;        // 温度 0-1 (默认 0.7)
  maxTokens?: number;          // 最大 token 数
  timeout?: number;            // 超时时间 ms (默认 60000)
  enableRetry?: boolean;       // 启用重试 (默认 true)
  maxRetries?: number;         // 最大重试次数 (默认 3)
  retryDelay?: number;         // 重试延迟 ms (默认 1000)
}
```

### 流式状态

```typescript
type StreamState = 
  | 'idle'        // 空闲
  | 'connecting'  // 连接中
  | 'streaming'   // 流式中
  | 'paused'      // 已暂停
  | 'completed'   // 已完成
  | 'cancelled'   // 已取消
  | 'error';      // 错误

// 监听状态变化
controller.start(messages, {
  onStateChange: (state) => {
    console.log('状态:', state);
  }
});
```

### 流式 Chunk

```typescript
interface StreamChunk {
  content: string;           // 当前完整内容
  delta: string;             // 增量内容
  isComplete: boolean;       // 是否完成
  index: number;             // chunk 索引
  timestamp: number;         // 时间戳
  metadata?: {
    model?: string;
    usage?: {
      promptTokens: number;
      completionTokens: number;
      totalTokens: number;
    };
    finishReason?: string;
  };
}
```

---

## 💡 高级功能

### 1. 上下文注入

```typescript
import { streamContextInjector, contextManager } from '@doubao/core';

// 添加上下文
await contextManager.addManual('背景信息...');
await contextManager.addCode('function test() {}', 'javascript');

// 创建注入器
const injector = new StreamContextInjector({
  maxContextTokens: 2000,
  injectAtStart: true,
  contextTypes: ['manual', 'code']
});

// 注入上下文到消息
const messages = [{ role: 'user', content: '请解释代码' }];
const messagesWithContext = injector.injectContext(messages);

// 开始流式
await controller.start(messagesWithContext, callbacks);
```

### 2. 智能上下文选择

```typescript
const injector = new StreamContextInjector();

// 根据用户消息自动选择相关上下文
const relevantContext = injector.selectRelevantContext('React Hooks 是什么?');

// 返回最相关的上下文
console.log(relevantContext);
```

### 3. 动态上下文更新

```typescript
const injector = new StreamContextInjector({
  injectDynamically: true,
  updateInterval: 5000  // 每 5 秒更新
});

// 启动动态更新
injector.injectContextDynamically((context) => {
  console.log('上下文已更新:', context.length);
});

// 在流式过程中添加新上下文
await contextManager.addManual('新的上下文');
```

### 4. 获取统计信息

```typescript
await controller.start(messages, {
  onComplete: () => {
    const stats = controller.getStats();
    console.log('状态:', stats.state);
    console.log('总 chunks:', stats.totalChunks);
    console.log('总 tokens:', stats.totalTokens);
    console.log('持续时间:', stats.duration, 'ms');
  }
});
```

---

## 📱 React 集成示例

### 基础聊天组件

```tsx
import { useState } from 'react';
import { createStreamController, streamContextInjector } from '@doubao/core';

function ChatComponent() {
  const [content, setContent] = useState('');
  const [isStreaming, setIsStreaming] = useState(false);
  const [controller, setController] = useState<StreamController | null>(null);

  const handleSend = async (message: string) => {
    const ctrl = createStreamController({
      apiUrl: '/api/chat',
      model: 'gpt-3.5-turbo'
    });

    setController(ctrl);
    setIsStreaming(true);
    setContent('');

    const messages = [{ role: 'user', content: message }];
    const messagesWithContext = streamContextInjector.injectContext(messages);

    await ctrl.start(messagesWithContext, {
      onChunk: (chunk) => {
        setContent(chunk.content);
      },
      onComplete: () => {
        setIsStreaming(false);
      },
      onError: (error) => {
        console.error('Error:', error);
        setIsStreaming(false);
      }
    });
  };

  return (
    <div>
      <div className="content">{content}</div>
      
      {isStreaming && controller && (
        <div className="controls">
          <button onClick={() => controller.pause()}>暂停</button>
          <button onClick={() => controller.resume()}>恢复</button>
          <button onClick={() => controller.cancel()}>取消</button>
        </div>
      )}
    </div>
  );
}
```

### 带进度显示

```tsx
function StreamingWithProgress() {
  const [chunks, setChunks] = useState<StreamChunk[]>([]);
  const [state, setState] = useState<StreamState>('idle');

  const handleSend = async () => {
    const controller = createStreamController(config);

    await controller.start(messages, {
      onChunk: (chunk) => {
        setChunks(prev => [...prev, chunk]);
      },
      onStateChange: (state) => {
        setState(state);
      }
    });
  };

  return (
    <div>
      <div>状态: {state}</div>
      <div>Chunks: {chunks.length}</div>
      <div>Tokens: {chunks[chunks.length - 1]?.metadata?.usage?.totalTokens}</div>
    </div>
  );
}
```

---

## 🔧 最佳实践

### 1. 错误处理

```typescript
try {
  await controller.start(messages, {
    onError: (error) => {
      // 处理错误
      showError(error.message);
    }
  });
} catch (error) {
  // 捕获未处理的错误
  console.error('Stream failed:', error);
}
```

### 2. 资源清理

```typescript
useEffect(() => {
  const controller = createStreamController(config);

  // 组件卸载时清理
  return () => {
    controller.destroy();
  };
}, []);
```

### 3. 取消之前的请求

```typescript
const handleNewMessage = async () => {
  // 取消正在进行的流式
  if (controller && controller.getState() === 'streaming') {
    controller.cancel();
  }

  // 开始新的流式
  controller = createStreamController(config);
  await controller.start(newMessages);
};
```

### 4. 性能优化

```typescript
// 使用 requestAnimationFrame 更新 UI
controller.start(messages, {
  onChunk: (chunk) => {
    requestAnimationFrame(() => {
      setContent(chunk.content);
    });
  }
});

// 节流更新
const throttledUpdate = throttle((content) => setContent(content), 50);
controller.start(messages, {
  onChunk: (chunk) => throttledUpdate(chunk.content)
});
```

---

## ⚙️ 配置示例

### OpenAI

```typescript
const controller = createStreamController({
  apiUrl: 'https://api.openai.com/v1/chat/completions',
  apiKey: process.env.OPENAI_API_KEY,
  model: 'gpt-3.5-turbo',
  temperature: 0.7,
  maxTokens: 2000,
  timeout: 60000
});
```

### 本地 Ollama

```typescript
const controller = createStreamController({
  apiUrl: 'http://localhost:11434/api/chat',
  model: 'llama2',
  temperature: 0.8,
  timeout: 120000,
  enableRetry: true,
  maxRetries: 2
});
```

### Azure OpenAI

```typescript
const controller = createStreamController({
  apiUrl: 'https://your-resource.openai.azure.com/openai/deployments/your-deployment/chat/completions?api-version=2023-05-15',
  apiKey: process.env.AZURE_API_KEY,
  model: 'gpt-4',
  headers: {
    'api-key': process.env.AZURE_API_KEY
  }
});
```

---

## ⚠️ 注意事项

1. **浏览器兼容**: 需要支持 Fetch API 和 ReadableStream
2. **内存管理**: 大量 chunks 可能占用内存,及时清理
3. **网络稳定性**: 启用重试以应对网络波动
4. **超时设置**: 根据模型响应时间合理设置
5. **取消操作**: 用户离开页面时记得取消流式

---

## 📊 完整示例

查看完整的可运行示例: [stream-example.ts](./stream-example.ts)

示例包括:
- ✅ 基本流式请求
- ✅ 暂停和恢复
- ✅ 取消流式
- ✅ 上下文注入
- ✅ 智能上下文选择
- ✅ 统计信息
- ✅ 错误处理和重试
- ✅ React 集成
- ✅ 动态上下文更新

---

## 🔗 相关资源

- [流式控制器源码](./stream-controller.ts)
- [上下文注入器源码](./stream-context-injector.ts)
- [使用示例](./stream-example.ts)
- [上下文管理文档](../context/README.md)
- [插件系统文档](../plugins/README.md)

---

**版本**: 1.0  
**更新日期**: 2026-04-16
