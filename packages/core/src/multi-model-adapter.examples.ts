/**
 * 多模型适配层使用示例
 */

import { 
  MultiModelAdapterLayer, 
  createMultiModelLayer,
  calculateMessageComplexity,
  selectModelType,
  type ChatRequest,
  type ChatMessage,
  type RoutingDecision 
} from './multi-model-adapter';

// =============================================
// 示例 1: 基础使用
// =============================================

async function basicExample() {
  // 创建适配层
  const layer = createMultiModelLayer({
    ollama: {
      baseUrl: 'http://localhost:11434',
      defaultModel: 'gemma4:26b',
    },
    default: 'ollama',
    preferLocal: true,
  });

  // 简单对话 - 自动路由
  const response = await layer.chat({
    messages: [
      { role: 'user', content: '你好，请介绍一下你自己' }
    ]
  });

  console.log('响应:', response.message.content);
}

// =============================================
// 示例 2: 流式响应
// =============================================

async function streamExample() {
  const layer = createMultiModelLayer({
    ollama: {
      baseUrl: 'http://localhost:11434',
      defaultModel: 'gemma4:26b',
    },
  });

  console.log('开始生成...\n');

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
}

// =============================================
// 示例 3: 指定模型
// =============================================

async function specifyModelExample() {
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
    default: 'ollama',
  });

  // 指定使用 DeepSeek
  const response = await layer.chatWith('deepseek', {
    messages: [
      { role: 'user', content: '解释量子计算的基本原理' }
    ]
  });

  console.log('DeepSeek 响应:', response.message.content);
}

// =============================================
// 示例 4: 复杂度分析
// =============================================

async function complexityAnalysisExample() {
  const testMessages = [
    '你好',
    '请帮我写一封邮件',
    `请分析以下代码:
\`\`\`javascript
function fibonacci(n) {
  return n <= 1 ? n : fibonacci(n-1) + fibonacci(n-2);
}
\`\`\`
有什么优化建议？`,
    `求解以下数学问题:
设函数 f(x) = ax² + bx + c，已知 f(0) = 1，f(1) = 2，f(2) = 5。
求 a, b, c 的值，并计算 f(3)。`,
  ];

  for (const msg of testMessages) {
    const complexity = calculateMessageComplexity(msg);
    const modelType = selectModelType(complexity);
    
    console.log(`\n消息: ${msg.slice(0, 50)}...`);
    console.log(`复杂度: ${(complexity * 100).toFixed(0)}%`);
    console.log(`推荐模型: ${modelType}`);
  }
}

// =============================================
// 示例 5: 多模型配置
// =============================================

async function multiModelExample() {
  const layer = createMultiModelLayer({
    // Ollama 本地模型 (零成本)
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
      anthropic: {
        provider: 'anthropic',
        model: 'claude-3-haiku-20240307',
        baseUrl: 'https://api.anthropic.com',
        apiKey: process.env.ANTHROPIC_API_KEY || '',
        capabilities: {
          supportsVision: true,
          supportsFunctionCall: true,
          costPerToken: 0.0003,
        },
      },
    },
    
    default: 'ollama',
    preferLocal: true,
    complexityThreshold: 0.6,
  });

  // 列出所有可用模型
  const adapters = await layer.listAdapters();
  console.log('\n可用模型:');
  for (const adapter of adapters) {
    console.log(`  - ${adapter.name} (${adapter.provider}:${adapter.model})`);
    console.log(`    状态: ${adapter.status}`);
    console.log(`    延迟: ${adapter.capabilities.typicalLatency}ms`);
    console.log(`    成本: ${adapter.capabilities.costPerToken}/token`);
  }

  // 获取统计
  const stats = layer.getStats();
  console.log('\n使用统计:');
  for (const [name, stat] of Object.entries(stats)) {
    console.log(`  ${name}: ${stat.totalQueries} 次调用`);
    console.log(`    成功率: ${((stat.successfulQueries / stat.totalQueries) * 100).toFixed(1)}%`);
    console.log(`    平均延迟: ${stat.averageResponseTime.toFixed(0)}ms`);
  }
}

// =============================================
// 示例 6: 带系统提示词
// =============================================

async function systemPromptExample() {
  const layer = createMultiModelLayer({
    ollama: {
      baseUrl: 'http://localhost:11434',
      defaultModel: 'gemma4:26b',
    },
  });

  const response = await layer.chat({
    messages: [
      { role: 'user', content: '代码有问题吗？' }
    ],
    system: `你是一个专业的代码审查助手。
请仔细分析代码，指出潜在问题并提供改进建议。
回答要简洁、专业。`
  });

  console.log('审查结果:', response.message.content);
}

// =============================================
// 示例 7: 多轮对话
// =============================================

async function multiTurnExample() {
  const layer = createMultiModelLayer({
    ollama: {
      baseUrl: 'http://localhost:11434',
      defaultModel: 'gemma4:26b',
    },
  });

  const messages: ChatMessage[] = [];

  // 第一轮
  messages.push({ role: 'user', content: '什么是 TypeScript？' });
  
  const response1 = await layer.chat({ messages });
  console.log('AI:', response1.message.content);
  messages.push(response1.message);

  // 第二轮
  messages.push({ role: 'user', content: '它和 JavaScript 有什么区别？' });
  
  const response2 = await layer.chat({ messages });
  console.log('\nAI:', response2.message.content);
  messages.push(response2.message);

  // 第三轮
  messages.push({ role: 'user', content: '如何开始学习？' });
  
  const response3 = await layer.chat({ messages });
  console.log('\nAI:', response3.message.content);
}

// =============================================
// 示例 8: 图像识别 (需要视觉模型)
// =============================================

async function visionExample() {
  const layer = createMultiModelLayer({
    openai: {
      openai: {
        provider: 'openai',
        model: 'gpt-4-vision-preview',
        baseUrl: 'https://api.openai.com/v1',
        apiKey: process.env.OPENAI_API_KEY || '',
        capabilities: {
          supportsVision: true,
          supportsMultimodal: true,
        },
      },
    },
  });

  // 带图片的请求
  const response = await layer.chat({
    messages: [
      {
        role: 'user',
        content: '这张图片里有什么？',
        images: ['data:image/jpeg;base64,/9j/4AAQ...'] // Base64 编码的图片
      }
    ]
  });

  console.log('图像描述:', response.message.content);
}

// =============================================
// 示例 9: 错误处理和降级
// =============================================

async function fallbackExample() {
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
    default: 'ollama',
  });

  try {
    // 如果 Ollama 不可用，会自动降级到 DeepSeek
    const response = await layer.chat({
      messages: [
        { role: 'user', content: '你好' }
      ]
    });
    console.log('成功:', response.message.content);
  } catch (error) {
    console.error('所有模型都失败了:', error);
  }
}

// =============================================
// 主函数
// =============================================

async function main() {
  console.log('=== 多模型适配层使用示例 ===\n');
  
  try {
    await basicExample();
    // await streamExample();
    // await complexityAnalysisExample();
    // await multiModelExample();
  } catch (error) {
    console.error('示例执行失败:', error);
  }
}

// 运行
main();
