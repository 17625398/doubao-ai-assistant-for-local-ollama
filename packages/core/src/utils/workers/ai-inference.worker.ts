// AI推理Worker - 处理AI模型推理、提示词优化等任务

import { messageRouter } from '../message-router';

// 注册消息处理器
messageRouter.register('optimizePrompt', async (payload: { prompt: string; context?: string }) => {
  return optimizePrompt(payload.prompt, payload.context);
});

messageRouter.register('generateResponse', async (payload: { prompt: string; model: string }) => {
  return generateResponse(payload.prompt, payload.model);
});

messageRouter.register('analyzePrompt', async (payload: { prompt: string }) => {
  return analyzePrompt(payload.prompt);
});

// 优化提示词
async function optimizePrompt(prompt: string, context?: string): Promise<string> {
  // 模拟提示词优化逻辑
  console.log('Optimizing prompt...');
  await simulateHeavyTask(1500);
  
  // 简单的提示词优化逻辑
  let optimizedPrompt = prompt;
  
  // 添加更具体的指令
  if (!optimizedPrompt.includes('详细')) {
    optimizedPrompt = optimizedPrompt.replace(/请(.*?)：/, '请详细且具体地$1：');
  }
  
  // 添加上下文（如果提供）
  if (context) {
    optimizedPrompt = `${context}\n\n${optimizedPrompt}`;
  }
  
  // 添加输出格式要求
  if (!optimizedPrompt.includes('格式')) {
    optimizedPrompt += '\n\n请以清晰的格式输出结果。';
  }
  
  return optimizedPrompt;
}

// 生成响应
async function generateResponse(prompt: string, model: string): Promise<string> {
  // 模拟AI响应生成
  console.log(`Generating response with model: ${model}...`);
  await simulateHeavyTask(3000);
  
  // 模拟不同模型的响应
  switch (model) {
    case 'gpt-4':
      return '这是GPT-4生成的详细响应，包含深入的分析和建议...';
    case 'gpt-3.5':
      return '这是GPT-3.5生成的响应，提供了基本的信息和建议...';
    case 'llama':
      return '这是Llama模型生成的响应，具有独特的视角和见解...';
    default:
      return '这是默认模型生成的响应...';
  }
}

// 分析提示词
async function analyzePrompt(prompt: string): Promise<any> {
  // 模拟提示词分析逻辑
  console.log('Analyzing prompt...');
  await simulateHeavyTask(1000);
  
  // 简单的提示词分析
  const length = prompt.length;
  const wordCount = prompt.split(/\s+/).length;
  const hasContext = prompt.includes('上下文') || prompt.includes('背景');
  const hasSpecificity = prompt.includes('具体') || prompt.includes('详细');
  const hasFormatRequirement = prompt.includes('格式') || prompt.includes('结构');
  
  return {
    length,
    wordCount,
    hasContext,
    hasSpecificity,
    hasFormatRequirement,
    score: calculatePromptScore({ hasContext, hasSpecificity, hasFormatRequirement }),
    suggestions: generatePromptSuggestions({ hasContext, hasSpecificity, hasFormatRequirement })
  };
}

// 计算提示词得分
function calculatePromptScore(factors: { hasContext: boolean; hasSpecificity: boolean; hasFormatRequirement: boolean }): number {
  let score = 50; // 基础分
  
  if (factors.hasContext) score += 20;
  if (factors.hasSpecificity) score += 20;
  if (factors.hasFormatRequirement) score += 10;
  
  return Math.min(score, 100);
}

// 生成提示词建议
function generatePromptSuggestions(factors: { hasContext: boolean; hasSpecificity: boolean; hasFormatRequirement: boolean }): string[] {
  const suggestions: string[] = [];
  
  if (!factors.hasContext) {
    suggestions.push('建议添加更多上下文信息，以便模型更好地理解您的需求');
  }
  
  if (!factors.hasSpecificity) {
    suggestions.push('建议提供更具体的要求，例如具体的输出格式或详细程度');
  }
  
  if (!factors.hasFormatRequirement) {
    suggestions.push('建议指定输出格式，例如列表、段落或步骤');
  }
  
  return suggestions;
}

// 模拟耗时任务
function simulateHeavyTask(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// 监听消息
self.onmessage = async (event) => {
  const message = event.data;
  
  if (message.type === 'event') {
    // 处理事件
    console.log('Received event:', message.event, message.payload);
  } else {
    // 处理消息
    const response = await messageRouter.handle(message);
    self.postMessage(response);
  }
};

// 发送初始化事件
self.postMessage({
  type: 'event',
  event: 'workerInitialized',
  payload: {
    workerType: 'ai-inference',
    timestamp: Date.now()
  }
});