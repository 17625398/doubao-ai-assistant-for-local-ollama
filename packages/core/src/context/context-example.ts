/**
 * 上下文管理系统使用示例
 * 
 * 展示如何使用 ContextManager 和相关工具
 */

import { 
  contextManager,
  ContextManager
} from './index';
import { pageContextCapture } from './page-context-capture';
import { documentContextExtract } from './document-context-extract';


// ============================================
// 示例 1: 基本上下文管理
// ============================================

async function example1_basicContextManagement() {
  console.log('=== 示例 1: 基本上下文管理 ===\n');

  // 添加手动上下文
  const id1 = await contextManager.addManual(
    '这是一段重要的背景信息,关于人工智能的发展历史...',
    'AI 发展历史'
  );
  console.log('添加手动上下文:', id1);

  // 添加代码片段
  const id2 = await contextManager.addCode(
    `function fibonacci(n: number): number {
  if (n <= 1) return n;
  return fibonacci(n - 1) + fibonacci(n - 2);
}`,
    'typescript',
    'fibonacci.ts'
  );
  console.log('添加代码上下文:', id2);

  // 查看摘要
  const summary = contextManager.getSummary();
  console.log('上下文摘要:', summary);

  // 获取合并后的上下文
  const merged = contextManager.getMergedContext();
  console.log('合并上下文长度:', merged.length);
  console.log(merged);
}


// ============================================
// 示例 2: 页面上下文捕获 (浏览器环境)
// ============================================

async function example2_pageContextCapture() {
  console.log('\n=== 示例 2: 页面上下文捕获 ===\n');

  // 注意: 这个示例需要在浏览器环境运行
  if (typeof document === 'undefined') {
    console.log('跳过: 不在浏览器环境\n');
    return;
  }

  try {
    // 捕获当前页面
    const pageContext = await pageContextCapture.captureCurrentPage();
    
    if (pageContext) {
      console.log('页面标题:', pageContext.title);
      console.log('页面 URL:', pageContext.url);
      console.log('内容长度:', pageContext.content.length);
      console.log('域名:', pageContext.metadata.domain);
      console.log('语言:', pageContext.metadata.language);

      // 添加到上下文管理器
      const id = await contextManager.addPageContext(pageContext);
      console.log('页面上下文已添加:', id);
    }
  } catch (error) {
    console.error('页面捕获失败:', error);
  }

  console.log();
}


// ============================================
// 示例 3: 文档上下文提取
// ============================================

async function example3_documentContextExtract() {
  console.log('=== 示例 3: 文档上下文提取 ===\n');

  // 创建模拟文件 (在实际应用中来自文件选择器)
  const markdownContent = `# 项目管理指南

## 概述
本文档介绍如何管理项目。

## 步骤
1. 创建项目
2. 配置设置
3. 添加团队成员
4. 开始协作

## 代码示例
\`\`\`typescript
const project = new Project({
  name: 'My Project',
  version: '1.0.0'
});
\`\`\`

## 注意事项
- 定期备份数据
- 保持文档更新
- 及时沟通反馈
`;

  const file = new File([markdownContent], 'guide.md', { 
    type: 'text/markdown' 
  });

  // 提取文档上下文
  const docContext = await documentContextExtract.extractFromFile(file);

  if (docContext) {
    console.log('文件名:', docContext.fileName);
    console.log('文件类型:', docContext.fileType);
    console.log('内容长度:', docContext.content.length);
    console.log('文件大小:', docContext.metadata.fileSize);
    console.log('\n提取的内容:');
    console.log(docContext.content);

    // 添加到上下文管理器
    const id = await contextManager.addDocumentContext(docContext);
    console.log('\n文档上下文已添加:', id);
  }

  console.log();
}


// ============================================
// 示例 4: 智能上下文优化
// ============================================

async function example4_contextOptimization() {
  console.log('=== 示例 4: 智能上下文优化 ===\n');

  // 创建新的上下文管理器用于演示
  const customManager = new ContextManager({
    maxTotalTokens: 2000,      // 限制 2000 tokens
    maxSources: 3,             // 最多 3 个来源
    sourceTimeout: 5 * 60 * 1000, // 5 分钟过期
    enableAutoOptimize: true,
    enableCompression: true
  });

  // 添加多个上下文
  await customManager.addManual('第一个上下文内容...'.repeat(50), '上下文 1');
  await customManager.addManual('第二个上下文内容...'.repeat(50), '上下文 2');
  await customManager.addManual('第三个上下文内容...'.repeat(50), '上下文 3');
  await customManager.addManual('第四个上下文内容...'.repeat(50), '上下文 4');

  console.log('添加 4 个上下文后的状态:');
  console.log(customManager.getSummary());

  // 获取优化后的上下文
  const optimized = customManager.getMergedContext();
  console.log('\n优化后的上下文长度:', optimized.length);
  console.log('优化后内容预览:', optimized.substring(0, 200) + '...');

  console.log();
}


// ============================================
// 示例 5: 上下文优先级管理
// ============================================

async function example5_priorityManagement() {
  console.log('=== 示例 5: 上下文优先级管理 ===\n');

  const manager = new ContextManager();

  // 添加不同优先级的上下文
  const id1 = await manager.addManual('低优先级内容', '低优先级');
  const id2 = await manager.addCode('console.log("重要代码");', 'javascript', 'important.js');
  const id3 = await manager.addSelection('用户选中的重要文本');

  // 更新优先级
  manager.updatePriority(id1, 2); // 降低优先级
  manager.updatePriority(id3, 10); // 提高优先级

  console.log('所有来源 (按优先级排序):');
  const sources = manager.getAllSources();
  sources.forEach((source, index) => {
    console.log(`${index + 1}. [优先级 ${source.priority}] ${source.type}: ${source.metadata.description || source.metadata.language || 'N/A'}`);
  });

  console.log();
}


// ============================================
// 示例 6: 按类型过滤上下文
// ============================================

async function example6_typeFiltering() {
  console.log('=== 示例 6: 按类型过滤上下文 ===\n');

  const manager = new ContextManager();

  // 添加不同类型的上下文
  await manager.addManual('手动输入的内容', '手动');
  await manager.addCode('const x = 1;', 'javascript', 'test.js');
  await manager.addSelection('选中的文本');

  // 只获取代码类型的上下文
  const codeOnly = manager.getMergedContext({
    types: ['code']
  });
  console.log('仅代码类型:');
  console.log(codeOnly);

  // 获取代码和手动类型
  const codeAndManual = manager.getMergedContext({
    types: ['code', 'manual']
  });
  console.log('\n代码 + 手动类型:');
  console.log(codeAndManual);

  console.log();
}


// ============================================
// 示例 7: Token 限制控制
// ============================================

async function example7_tokenLimit() {
  console.log('=== 示例 7: Token 限制控制 ===\n');

  const manager = new ContextManager({
    maxTotalTokens: 500 // 限制 500 tokens
  });

  // 添加大量内容
  await manager.addManual('长文本内容...'.repeat(100), '长文本');
  await manager.addCode('function test() { ' + 'console.log("test"); '.repeat(50) + '}', 'javascript', 'long.js');

  console.log('总 token 数:', manager.getSummary().totalTokens);

  // 获取限制后的上下文
  const limited = manager.getMergedContext({
    maxTokens: 500
  });
  console.log('限制后的长度:', limited.length);
  console.log('限制后的内容:', limited.substring(0, 300) + '...');

  console.log();
}


// ============================================
// 示例 8: 在 AI 对话中使用上下文
// ============================================

async function example8_useInAIChat() {
  console.log('=== 示例 8: 在 AI 对话中使用上下文 ===\n');

  // 模拟在聊天中积累上下文
  const manager = new ContextManager();

  // 用户选中了一段代码
  await manager.addSelection(
    `function calculateTotal(items) {
  return items.reduce((sum, item) => sum + item.price, 0);
}`,
    'https://example.com/code'
  );

  // 用户查看了相关文档
  await manager.addManual(
    'calculateTotal 函数用于计算商品总价,使用 reduce 方法累加所有商品的价格。',
    '函数说明'
  );

  // 获取上下文用于 AI 对话
  const context = manager.getMergedContext({
    maxTokens: 3000
  });

  // 构建 AI 消息
  const userQuestion = '这个函数有什么可以优化的地方?';
  
  const aiPrompt = `基于以下上下文,回答用户的问题:

${context}

---

用户问题: ${userQuestion}

请提供详细的优化建议。`;

  console.log('构建的 AI 提示词:');
  console.log(aiPrompt);
  console.log('\n提示词总长度:', aiPrompt.length);

  console.log();
}


// ============================================
// 示例 9: 上下文清理和管理
// ============================================

async function example9_cleanupAndManagement() {
  console.log('=== 示例 9: 上下文清理和管理 ===\n');

  const manager = new ContextManager({
    sourceTimeout: 1000 // 1 秒过期,用于演示
  });

  // 添加一些上下文
  await manager.addManual('临时内容 1', '临时 1');
  await manager.addManual('临时内容 2', '临时 2');

  console.log('清理前:', manager.getSummary().totalSources, '个来源');

  // 等待过期
  await new Promise(resolve => setTimeout(resolve, 1500));

  // 清理过期内容
  const removed = manager.cleanup();
  console.log('清理后:', manager.getSummary().totalSources, '个来源');
  console.log('移除数量:', removed);

  // 清空所有
  await manager.addManual('新内容', '新');
  console.log('添加新内容后:', manager.getSummary().totalSources, '个来源');

  manager.clear();
  console.log('清空后:', manager.getSummary().totalSources, '个来源');

  console.log();
}


// ============================================
// 运行所有示例
// ============================================

async function runAllExamples() {
  console.log('╔════════════════════════════════════════╗');
  console.log('║   上下文管理系统使用示例               ║');
  console.log('╚════════════════════════════════════════╝\n');

  try {
    await example1_basicContextManagement();
    await example2_pageContextCapture();
    await example3_documentContextExtract();
    await example4_contextOptimization();
    await example5_priorityManagement();
    await example6_typeFiltering();
    await example7_tokenLimit();
    await example8_useInAIChat();
    await example9_cleanupAndManagement();

    console.log('╔════════════════════════════════════════╗');
    console.log('║   所有示例执行完成!                    ║');
    console.log('╚════════════════════════════════════════╝');
  } catch (error) {
    console.error('示例执行失败:', error);
  }
}


// ============================================
// 导出示例函数
// ============================================

export {
  example1_basicContextManagement,
  example2_pageContextCapture,
  example3_documentContextExtract,
  example4_contextOptimization,
  example5_priorityManagement,
  example6_typeFiltering,
  example7_tokenLimit,
  example8_useInAIChat,
  example9_cleanupAndManagement,
  runAllExamples
};

// 如果在 Node.js 环境,可以直接运行
if (typeof process !== 'undefined' && process.argv[1]?.includes('context-example')) {
  runAllExamples();
}
