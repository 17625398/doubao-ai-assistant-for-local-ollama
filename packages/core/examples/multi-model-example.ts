/**
 * 多模型适配层 - 完整示例
 */

import {
  createMultiModelLayer,
  OllamaAdapter,
  OpenAICompatibleAdapter,
  AzureOpenAIAdapter,
  BedrockAdapter,
  LocalModelAdapter,
  GeminiExAdapter,
  ClaudeExAdapter,
  createResponseCache,
  createSimilarQuestionCache,
  createBatchHandler,
  createParallelExecutor,
  createPerformanceMonitor,
  type LayerConfig,
  type ChatRequest,
} from '../src';

// =============================================
// 示例 1: 基础使用
// =============================================

async function basicExample() {
  console.log('=== 示例 1: 基础使用 ===\n');

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
        apiKey: process.env.DEEPSEEK_API_KEY || '',
      },
    },
    preferLocal: true,
  });

  // 检查可用模型
  const models = await layer.listModels();
  console.log('可用模型:', models.map((m) => m.name).join(', '));

  // 简单聊天
  const response = await layer.chat({
    messages: [{ role: 'user', content: '你好，请介绍一下你自己' }],
  });

  console.log('\nAI 响应:', response.content);
  console.log('使用模型:', response.model);
  console.log('Token 使用:', response.usage?.totalTokens);
}

// =============================================
// 示例 2: 流式聊天
// =============================================

async function streamingExample() {
  console.log('\n=== 示例 2: 流式聊天 ===\n');

  const layer = createMultiModelLayer({
    ollama: {
      baseUrl: 'http://localhost:11434',
      defaultModel: 'gemma4:26b',
    },
  });

  process.stdout.write('AI: ');

  for await (const chunk of layer.chatStream({
    messages: [
      {
        role: 'user',
        content: '请用三句话介绍一下人工智能的发展历史',
      },
    ],
  })) {
    if (chunk.delta) {
      process.stdout.write(chunk.delta);
    }
    if (chunk.done) {
      console.log('\n');
    }
  }
}

// =============================================
// 示例 3: 手动选择模型
// =============================================

async function manualSelectionExample() {
  console.log('\n=== 示例 3: 手动选择模型 ===\n');

  const layer = createMultiModelLayer({
    ollama: {
      baseUrl: 'http://localhost:11434',
      defaultModel: 'gemma4:26b',
    },
    openai: {
      gpt4: {
        provider: 'openai',
        model: 'gpt-4',
        baseUrl: 'https://api.openai.com/v1',
        apiKey: process.env.OPENAI_API_KEY || '',
      },
    },
  });

  // 手动指定使用 GPT-4
  const response = await layer.chat(
    {
      messages: [{ role: 'user', content: '什么是量子计算？' }],
    },
    { preferredModel: 'gpt-4' }
  );

  console.log('使用模型:', response.model);
  console.log('响应:', response.content.substring(0, 100) + '...');
}

// =============================================
// 示例 4: 事件监听
// =============================================

async function eventsExample() {
  console.log('\n=== 示例 4: 事件监听 ===\n');

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
        apiKey: process.env.DEEPSEEK_API_KEY || '',
      },
    },
  });

  // 监听事件
  layer.on('routingDecision', (decision) => {
    console.log('路由决策:', decision.selectedModel, '(', decision.reason, ')');
  });

  layer.on('modelError', (error) => {
    console.error('模型错误:', error.model, error.error.message);
  });

  layer.on('fallback', (event) => {
    console.log('降级:', event.from, '->', event.to);
  });

  layer.on('cacheHit', (event) => {
    console.log('缓存命中:', event.model);
  });

  // 发送请求
  const response = await layer.chat({
    messages: [{ role: 'user', content: '你好' }],
  });

  console.log('响应:', response.content.substring(0, 50) + '...');
}

// =============================================
// 示例 5: 使用缓存
// =============================================

async function cacheExample() {
  console.log('\n=== 示例 5: 使用缓存 ===\n');

  const cache = createResponseCache({
    maxEntries: 1000,
    ttl: 3600000, // 1小时
    evictionPolicy: 'lru',
  });

  const request: ChatRequest = {
    messages: [{ role: 'user', content: '什么是机器学习？' }],
  };

  // 第一次请求 (无缓存)
  const response1 = await cache.get(request);
  if (!response1) {
    console.log('缓存未命中，执行请求...');
    const newResponse = {
      id: '1',
      model: 'gemma4:26b',
      content: '机器学习是人工智能的一个分支...',
      role: 'assistant' as const,
    };
    await cache.set(request, newResponse);
    console.log('响应已缓存');
  }

  // 第二次请求 (有缓存)
  const response2 = await cache.get(request);
  if (response2) {
    console.log('缓存命中!');
    console.log('响应:', response2.content);
  }

  // 显示统计
  const stats = cache.getStats();
  console.log('\n缓存统计:');
  console.log('- 命中率:', (stats.hitRate * 100).toFixed(2) + '%');
  console.log('- 命中次数:', stats.hits);
  console.log('- 未命中次数:', stats.misses);
}

// =============================================
// 示例 6: 相似问题缓存
// =============================================

async function similarityCacheExample() {
  console.log('\n=== 示例 6: 相似问题缓存 ===\n');

  const cache = createSimilarQuestionCache({
    similarityThreshold: 0.8,
  });

  // 添加一个问题
  const query = 'How does photosynthesis work?';
  const response = {
    id: '1',
    model: 'gpt-4',
    content:
      'Photosynthesis is the process by which plants convert sunlight into energy...',
    role: 'assistant' as const,
  };

  await cache.add(query, response);
  console.log('已添加问题到缓存');

  // 查找相似问题
  const similarQuery = 'Tell me about photosynthesis';
  const similarResponse = await cache.findSimilarResponse(similarQuery);

  if (similarResponse) {
    console.log('找到相似响应!');
    console.log('响应:', similarResponse.content.substring(0, 50) + '...');
  } else {
    console.log('未找到相似响应');
  }
}

// =============================================
// 示例 7: 批量请求
// =============================================

async function batchExample() {
  console.log('\n=== 示例 7: 批量请求 ===\n');

  const layer = createMultiModelLayer({
    ollama: {
      baseUrl: 'http://localhost:11434',
      defaultModel: 'gemma4:26b',
    },
  });

  const batch = createBatchHandler(
    {
      maxBatchSize: 5,
      maxWaitTime: 100,
    },
    async (requests) => {
      console.log('处理', requests.length, '个请求...');
      // 实际应用中，这里会将请求批量发送到模型
      // 这里简化为顺序处理
      return Promise.all(
        requests.map((req) =>
          layer.chat(req).catch((e) => ({
            id: 'error',
            model: 'unknown',
            content: `Error: ${e.message}`,
            role: 'assistant' as const,
          }))
        )
      );
    }
  );

  // 模拟多个请求
  const queries = ['你好', '天气', '时间', '日期', '新闻'];

  for (const query of queries) {
    const response = await batch.execute({
      messages: [{ role: 'user', content: query }],
    });
    console.log('-', query, '->', response.content.substring(0, 30));
  }
}

// =============================================
// 示例 8: 并行执行
// =============================================

async function parallelExample() {
  console.log('\n=== 示例 8: 并行执行 ===\n');

  const executor = createParallelExecutor({
    maxConcurrency: 3,
    failStrategy: 'majority',
  });

  const tasks = [
    () =>
      Promise.resolve({
        model: 'model-a',
        content: 'Response from model A',
      }),
    () =>
      Promise.resolve({
        model: 'model-b',
        content: 'Response from model B',
      }),
    () =>
      Promise.resolve({
        model: 'model-c',
        content: 'Response from model C',
      }),
    () =>
      new Promise((_, reject) =>
        setTimeout(() => reject(new Error('Model D failed')), 100)
      ),
    () =>
      Promise.resolve({
        model: 'model-e',
        content: 'Response from model E',
      }),
  ];

  const { successful, failed } = await executor.execute(tasks);

  console.log('成功:', successful.length);
  console.log('失败:', failed.length);
  console.log('结果:', successful.map((r) => (r as { model: string }).model).join(', '));
}

// =============================================
// 示例 9: 性能监控
// =============================================

async function performanceExample() {
  console.log('\n=== 示例 9: 性能监控 ===\n');

  const monitor = createPerformanceMonitor();

  const layer = createMultiModelLayer({
    ollama: {
      baseUrl: 'http://localhost:11434',
      defaultModel: 'gemma4:26b',
    },
  });

  // 模拟多次请求
  for (let i = 0; i < 5; i++) {
    const end = monitor.start('chat-request');

    await new Promise((resolve) => setTimeout(resolve, Math.random() * 100));

    end(true);
  }

  // 显示统计
  const stats = monitor.getStats();
  console.log('总记录数:', stats.totalRecords);

  for (const [op, stat] of Object.entries(stats.operations)) {
    console.log(`\n${op}:`);
    console.log('  - 调用次数:', stat.count);
    console.log('  - 平均耗时:', stat.avgDuration.toFixed(2), 'ms');
    console.log('  - 最小耗时:', stat.minDuration.toFixed(2), 'ms');
    console.log('  - 最大耗时:', stat.maxDuration.toFixed(2), 'ms');
    console.log('  - P50:', stat.p50.toFixed(2), 'ms');
    console.log('  - P95:', stat.p95.toFixed(2), 'ms');
    console.log('  - P99:', stat.p99.toFixed(2), 'ms');
  }
}

// =============================================
// 示例 10: 直接使用适配器
// =============================================

async function adapterExample() {
  console.log('\n=== 示例 10: 直接使用适配器 ===\n');

  // Ollama
  const ollama = new OllamaAdapter({
    baseUrl: 'http://localhost:11434',
    defaultModel: 'gemma4:26b',
  });

  // OpenAI
  const openai = new OpenAICompatibleAdapter({
    provider: 'deepseek',
    model: 'deepseek-chat',
    baseUrl: 'https://api.deepseek.com',
    apiKey: process.env.DEEPSEEK_API_KEY || '',
  });

  // Azure OpenAI
  const azure = new AzureOpenAIAdapter({
    endpoint: 'https://xxx.openai.azure.com',
    apiKey: 'xxx',
    deploymentName: 'gpt-4',
  });

  // AWS Bedrock
  const bedrock = new BedrockAdapter({
    region: 'us-east-1',
    accessKeyId: process.env.AWS_ACCESS_KEY_ID || '',
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || '',
    modelId: 'anthropic.claude-3-sonnet-20240229-v1:0',
  });

  // 本地模型
  const local = new LocalModelAdapter({
    provider: 'lm-studio',
    baseUrl: 'http://localhost:1234',
    model: 'llama2',
  });

  // Gemini
  const gemini = new GeminiExAdapter({
    apiKey: process.env.GEMINI_API_KEY || '',
    model: 'gemini-1.5-pro',
  });

  // Claude
  const claude = new ClaudeExAdapter({
    apiKey: process.env.ANTHROPIC_API_KEY || '',
    model: 'claude-3-5-sonnet-20241022',
  });

  // 检查可用性
  console.log('检查适配器可用性...\n');

  const adapters = [
    { name: 'Ollama', adapter: ollama },
    { name: 'OpenAI', adapter: openai },
    { name: 'Azure', adapter: azure },
    { name: 'Bedrock', adapter: bedrock },
    { name: 'Local', adapter: local },
    { name: 'Gemini', adapter: gemini },
    { name: 'Claude', adapter: claude },
  ];

  for (const { name, adapter } of adapters) {
    try {
      const available = await adapter.isAvailable();
      console.log(`  ${name}: ${available ? '✅ 可用' : '⚠️ 不可用'}`);
    } catch (error) {
      console.log(`  ${name}: ❌ 错误`);
    }
  }

  // 使用第一个可用的
  const firstAvailable = adapters.find(async ({ adapter }) => {
    try {
      return await adapter.isAvailable();
    } catch {
      return false;
    }
  });

  if (firstAvailable) {
    const response = await firstAvailable.adapter.chat({
      messages: [{ role: 'user', content: '你好' }],
    });
    console.log('\n响应:', response.content);
  }
}

// =============================================
// 运行所有示例
// =============================================

async function main() {
  console.log('╔════════════════════════════════════════════════╗');
  console.log('║     多模型适配层 - 示例演示                     ║');
  console.log('╚════════════════════════════════════════════════╝\n');

  try {
    await basicExample();
    // await streamingExample(); // 取消注释以测试流式
    // await manualSelectionExample();
    // await eventsExample();
    // await cacheExample();
    // await similarityCacheExample();
    // await batchExample();
    // await parallelExample();
    // await performanceExample();
    // await adapterExample();
  } catch (error) {
    console.error('Error:', error);
  }

  console.log('\n示例演示完成!\n');
}

main();
