// 多进程架构使用示例

import { workerManager } from './worker-manager';
import { crossProcessEventBus } from './cross-process-event-bus';

// 初始化Worker
async function initializeWorkers() {
  console.log('Initializing workers...');
  
  // 创建数据处理Worker
  const dataProcessingWorker = workerManager.createWorker(
    'data-processing',
    './utils/workers/data-processing.worker.ts'
  );
  
  // 创建AI推理Worker
  const aiInferenceWorker = workerManager.createWorker(
    'ai-inference',
    './utils/workers/ai-inference.worker.ts'
  );
  
  // 创建网络Worker
  const networkWorker = workerManager.createWorker(
    'network',
    './utils/workers/network.worker.ts'
  );
  
  // 监听Worker初始化事件
  dataProcessingWorker.on('workerInitialized', (payload) => {
    console.log('Data processing worker initialized:', payload);
  });
  
  aiInferenceWorker.on('workerInitialized', (payload) => {
    console.log('AI inference worker initialized:', payload);
  });
  
  networkWorker.on('workerInitialized', (payload) => {
    console.log('Network worker initialized:', payload);
  });
  
  return {
    dataProcessingWorker,
    aiInferenceWorker,
    networkWorker
  };
}

// 测试数据处理Worker
async function testDataProcessing() {
  console.log('Testing data processing worker...');
  
  try {
    // 处理PDF文档
    const pdfResult = await workerManager.sendMessage(
      'data-processing',
      'processDocument',
      { type: 'pdf', data: { path: 'sample.pdf' } }
    );
    console.log('PDF processing result:', pdfResult);
    
    // 提取文本
    const textResult = await workerManager.sendMessage(
      'data-processing',
      'extractText',
      { content: 'This is a sample text for extraction' }
    );
    console.log('Text extraction result:', textResult);
    
    // 分析内容
    const analysisResult = await workerManager.sendMessage(
      'data-processing',
      'analyzeContent',
      { content: 'This is a sample content for analysis. It contains multiple sentences.\n\nAnd a new paragraph.' }
    );
    console.log('Content analysis result:', analysisResult);
  } catch (error) {
    console.error('Data processing error:', error);
  }
}

// 测试AI推理Worker
async function testAIInference() {
  console.log('Testing AI inference worker...');
  
  try {
    // 优化提示词
    const optimizedPrompt = await workerManager.sendMessage(
      'ai-inference',
      'optimizePrompt',
      { prompt: '请解释量子计算', context: '面向初学者' }
    );
    console.log('Optimized prompt:', optimizedPrompt);
    
    // 生成响应
    const response = await workerManager.sendMessage(
      'ai-inference',
      'generateResponse',
      { prompt: optimizedPrompt, model: 'gpt-4' }
    );
    console.log('Generated response:', response);
    
    // 分析提示词
    const analysis = await workerManager.sendMessage(
      'ai-inference',
      'analyzePrompt',
      { prompt: '请解释量子计算' }
    );
    console.log('Prompt analysis:', analysis);
  } catch (error) {
    console.error('AI inference error:', error);
  }
}

// 测试网络Worker
async function testNetwork() {
  console.log('Testing network worker...');
  
  try {
    // 发送网络请求
    const fetchResult = await workerManager.sendMessage(
      'network',
      'fetch',
      { url: 'https://jsonplaceholder.typicode.com/todos/1' }
    );
    console.log('Fetch result:', fetchResult);
  } catch (error) {
    console.error('Network error:', error);
  }
}

// 测试跨进程事件
function testCrossProcessEvents() {
  console.log('Testing cross-process events...');
  
  // 监听跨进程事件
  crossProcessEventBus.on('testEvent', (payload) => {
    console.log('Received cross-process event:', payload);
  });
  
  // 发送跨进程事件
  crossProcessEventBus.emit('testEvent', { message: 'Hello from main thread', timestamp: Date.now() });
}

// 主函数
async function main() {
  console.log('Starting multi-process architecture test...');
  
  // 初始化Worker
  const workers = await initializeWorkers();
  
  // 等待一段时间让Worker初始化
  await new Promise(resolve => setTimeout(resolve, 1000));
  
  // 测试各个Worker
  await testDataProcessing();
  await testAIInference();
  await testNetwork();
  
  // 测试跨进程事件
  testCrossProcessEvents();
  
  console.log('Multi-process architecture test completed!');
}

// 导出示例函数
export { initializeWorkers, testDataProcessing, testAIInference, testNetwork, testCrossProcessEvents, main };