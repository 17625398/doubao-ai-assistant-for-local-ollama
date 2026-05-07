/**
 * 流式处理系统使用示例
 * 
 * 展示如何使用 StreamController 和 StreamContextInjector
 */

import { 
  StreamController, 
  createStreamController,
  StreamContextInjector,
  streamContextInjector,
  StreamChunk,
  StreamState
} from './index';
import { contextManager } from '../context';


// ============================================
// 示例 1: 基本流式请求
// ============================================

async function example1_basicStreaming() {
  console.log('=== 示例 1: 基本流式请求 ===\n');

  // 创建流式控制器
  const controller = createStreamController({
    apiUrl: 'https://api.openai.com/v1/chat/completions',
    apiKey: 'your-api-key',
    model: 'gpt-3.5-turbo',
    temperature: 0.7,
    maxTokens: 1000,
    timeout: 60000
  });

  // 开始流式请求
  const content = await controller.start(
    [
      { role: 'user', content: '你好,请简单介绍一下人工智能的发展历史' }
    ],
    {
      onChunk: (chunk: StreamChunk) => {
        // 实时更新 UI
        process.stdout.write(chunk.delta);
      },
      onComplete: (fullContent: string) => {
        console.log('\n\n✅ 流式完成');
        console.log('总长度:', fullContent.length);
      },
      onError: (error: Error) => {
        console.error('❌ 错误:', error.message);
      },
      onStateChange: (state: StreamState) => {
        console.log('状态变化:', state);
      }
    }
  );

  console.log('\n完整内容:', content);
}


// ============================================
// 示例 2: 暂停和恢复流式
// ============================================

async function example2_pauseAndResume() {
  console.log('\n=== 示例 2: 暂停和恢复流式 ===\n');

  const controller = createStreamController({
    apiUrl: 'https://api.openai.com/v1/chat/completions',
    apiKey: 'your-api-key',
    model: 'gpt-3.5-turbo',
    timeout: 60000
  });

  // 开始流式
  const streamPromise = controller.start(
    [{ role: 'user', content: '请写一个长篇故事' }],
    {
      onChunk: (chunk: StreamChunk) => {
        process.stdout.write(chunk.delta);
        
        // 接收到 5 个 chunk 后暂停
        if (chunk.index === 5) {
          console.log('\n\n⏸️ 暂停流式...');
          controller.pause();
          
          // 3 秒后恢复
          setTimeout(() => {
            console.log('▶️ 恢复流式...');
            controller.resume();
          }, 3000);
        }
      },
      onComplete: (content) => {
        console.log('\n\n✅ 完成,总长度:', content.length);
      }
    }
  );

  await streamPromise;
}


// ============================================
// 示例 3: 取消流式
// ============================================

async function example3_cancelStream() {
  console.log('\n=== 示例 3: 取消流式 ===\n');

  const controller = createStreamController({
    apiUrl: 'https://api.openai.com/v1/chat/completions',
    apiKey: 'your-api-key',
    model: 'gpt-3.5-turbo',
    timeout: 60000
  });

  // 开始流式
  const streamPromise = controller.start(
    [{ role: 'user', content: '请写一个非常非常长的文章' }],
    {
      onChunk: (chunk: StreamChunk) => {
        process.stdout.write(chunk.delta);
        
        // 接收到 3 个 chunk 后取消
        if (chunk.index === 3) {
          console.log('\n\n❌ 取消流式...');
          controller.cancel();
        }
      },
      onCancel: () => {
        console.log('已取消');
      }
    }
  );

  try {
    await streamPromise;
  } catch (error) {
    console.log('捕获到取消错误:', (error as Error).message);
  }
}


// ============================================
// 示例 4: 带上下文注入的流式
// ============================================

async function example4_streamWithContext() {
  console.log('\n=== 示例 4: 带上下文注入的流式 ===\n');

  // 先添加一些上下文
  await contextManager.addManual(
    'React 是一个用于构建用户界面的 JavaScript 库,由 Facebook 开发。',
    'React 简介'
  );

  await contextManager.addCode(
    `function Hello() {
  return <h1>Hello, World!</h1>;
}`,
    'jsx',
    'Hello.jsx'
  );

  // 创建上下文注入器
  const injector = new StreamContextInjector({
    maxContextTokens: 1000,
    injectAtStart: true,
    contextTypes: ['manual', 'code']
  });

  // 创建流式控制器
  const controller = createStreamController({
    apiUrl: 'https://api.openai.com/v1/chat/completions',
    apiKey: 'your-api-key',
    model: 'gpt-3.5-turbo',
    timeout: 60000
  });

  // 准备消息
  const messages = [
    { role: 'user' as const, content: '请解释这段代码' }
  ];

  // 注入上下文
  const messagesWithContext = injector.injectContext(messages);
  
  console.log('注入上下文后的消息数:', messagesWithContext.length);
  console.log('系统消息长度:', messagesWithContext[0].content.length);

  // 开始流式
  await controller.start(
    messagesWithContext,
    {
      onChunk: (chunk: StreamChunk) => {
        process.stdout.write(chunk.delta);
      },
      onComplete: (content) => {
        console.log('\n\n✅ 完成');
      }
    }
  );
}


// ============================================
// 示例 5: 智能上下文选择
// ============================================

async function example5_smartContextSelection() {
  console.log('\n=== 示例 5: 智能上下文选择 ===\n');

  // 添加多种类型的上下文
  await contextManager.addManual('Python 是一种高级编程语言', 'Python');
  await contextManager.addCode('console.log("JavaScript");', 'javascript', 'test.js');
  await contextManager.addSelection('React Hooks 是 React 16.8 引入的新特性');

  // 创建注入器
  const injector = new StreamContextInjector();

  // 测试不同的用户消息
  const testMessages = [
    'Python 有什么特点?',
    '解释这段 JavaScript 代码',
    'React Hooks 是什么?'
  ];

  for (const message of testMessages) {
    console.log('\n用户消息:', message);
    const relevantContext = injector.selectRelevantContext(message);
    console.log('选择的上下文长度:', relevantContext.length);
    console.log('上下文预览:', relevantContext.substring(0, 100) + '...');
  }
}


// ============================================
// 示例 6: 流式统计信息
// ============================================

async function example6_streamStats() {
  console.log('\n=== 示例 6: 流式统计信息 ===\n');

  const controller = createStreamController({
    apiUrl: 'https://api.openai.com/v1/chat/completions',
    apiKey: 'your-api-key',
    model: 'gpt-3.5-turbo',
    timeout: 60000
  });

  await controller.start(
    [{ role: 'user', content: '写一首短诗' }],
    {
      onChunk: (chunk: StreamChunk) => {
        process.stdout.write(chunk.delta);
      },
      onComplete: (content) => {
        console.log('\n\n📊 流式统计:');
        const stats = controller.getStats();
        console.log('状态:', stats.state);
        console.log('总 chunks:', stats.totalChunks);
        console.log('总 tokens:', stats.totalTokens);
        console.log('持续时间:', stats.duration, 'ms');
        console.log('内容长度:', content.length);
      }
    }
  );
}


// ============================================
// 示例 7: 错误处理和重试
// ============================================

async function example7_errorHandling() {
  console.log('\n=== 示例 7: 错误处理和重试 ===\n');

  const controller = createStreamController({
    apiUrl: 'https://invalid-api.example.com/v1/chat/completions',
    apiKey: 'invalid-key',
    model: 'gpt-3.5-turbo',
    timeout: 10000,
    enableRetry: true,
    maxRetries: 2,
    retryDelay: 1000
  });

  try {
    await controller.start(
      [{ role: 'user', content: '测试' }],
      {
        onError: (error: Error) => {
          console.log('捕获到错误:', error.message);
        }
      }
    );
  } catch (error) {
    console.log('最终失败:', (error as Error).message);
    console.log('状态:', controller.getState());
  }
}


// ============================================
// 示例 8: 在 React 中使用 (伪代码)
// ============================================

function example8_reactIntegration() {
  console.log('\n=== 示例 8: 在 React 中使用 (伪代码) ===\n');
  console.log(`
import { useState, useEffect } from 'react';
import { createStreamController, streamContextInjector } from '@doubao/core';

function ChatComponent() {
  const [content, setContent] = useState('');
  const [isStreaming, setIsStreaming] = useState(false);
  const [controller, setController] = useState(null);

  const handleSend = async (message: string) => {
    // 创建控制器
    const ctrl = createStreamController({
      apiUrl: '/api/chat',
      model: 'gpt-3.5-turbo'
    });

    setController(ctrl);
    setIsStreaming(true);
    setContent('');

    // 准备消息并注入上下文
    const messages = [{ role: 'user', content: message }];
    const messagesWithContext = streamContextInjector.injectContext(messages);

    // 开始流式
    await ctrl.start(messagesWithContext, {
      onChunk: (chunk) => {
        setContent(chunk.content); // 实时更新
      },
      onComplete: () => {
        setIsStreaming(false);
      },
      onError: (error) => {
        console.error('Stream error:', error);
        setIsStreaming(false);
      }
    });
  };

  const handlePause = () => {
    controller?.pause();
  };

  const handleResume = () => {
    controller?.resume();
  };

  const handleCancel = () => {
    controller?.cancel();
    setIsStreaming(false);
  };

  return (
    <div>
      <div className="content">{content}</div>
      
      {isStreaming && (
        <div className="controls">
          <button onClick={handlePause}>暂停</button>
          <button onClick={handleResume}>恢复</button>
          <button onClick={handleCancel}>取消</button>
        </div>
      )}
    </div>
  );
}
`);
}


// ============================================
// 示例 9: 动态上下文更新
// ============================================

async function example9_dynamicContextUpdate() {
  console.log('\n=== 示例 9: 动态上下文更新 ===\n');

  const injector = new StreamContextInjector({
    injectDynamically: true,
    updateInterval: 3000,
    maxContextTokens: 1500
  });

  // 启动动态更新
  injector.injectContextDynamically((context) => {
    console.log('上下文已更新,长度:', context.length);
  });

  // 模拟在运行时添加新上下文
  setTimeout(async () => {
    console.log('添加新的上下文...');
    await contextManager.addManual('这是动态添加的新上下文', '动态上下文');
  }, 2000);

  // 5 秒后停止 (实际应用中会在流式完成时停止)
  setTimeout(() => {
    console.log('停止动态更新');
  }, 5000);
}


// ============================================
// 运行所有示例
// ============================================

async function runAllExamples() {
  console.log('╔════════════════════════════════════════╗');
  console.log('║   流式处理系统使用示例                 ║');
  console.log('╚════════════════════════════════════════╝\n');

  try {
    // 注意: 示例 1-3, 6-7 需要真实的 API,这里只演示结构
    await example4_streamWithContext();
    await example5_smartContextSelection();
    example8_reactIntegration();
    await example9_dynamicContextUpdate();

    console.log('\n╔════════════════════════════════════════╗');
    console.log('║   示例执行完成!                        ║');
    console.log('╚════════════════════════════════════════╝');
    console.log('\n注意: 示例 1-3, 6-7 需要真实的 API 密钥才能运行');
  } catch (error) {
    console.error('示例执行失败:', error);
  }
}


// ============================================
// 导出示例函数
// ============================================

export {
  example1_basicStreaming,
  example2_pauseAndResume,
  example3_cancelStream,
  example4_streamWithContext,
  example5_smartContextSelection,
  example6_streamStats,
  example7_errorHandling,
  example8_reactIntegration,
  example9_dynamicContextUpdate,
  runAllExamples
};

// 如果在 Node.js 环境,可以直接运行
if (typeof process !== 'undefined' && process.argv[1]?.includes('stream-example')) {
  runAllExamples();
}
