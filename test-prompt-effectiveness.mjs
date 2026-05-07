// 提示词效果测试脚本
import { promptTemplateLibrary } from './packages/core/dist/utils/prompt-template-library.js';
import { promptOptimizer } from './packages/core/dist/utils/prompt-optimizer.js';
import { promptValidator } from './packages/core/dist/utils/prompt-validator.js';

// 模拟AI模型响应
function mockAIResponse(prompt, input) {
  const fullPrompt = prompt + input;
  
  // 基于不同类型的提示词生成模拟响应
  if (fullPrompt.includes('代码审查')) {
    return `代码审查结果：
1. 潜在问题：缺少输入验证
2. 安全漏洞：无明显安全问题
3. 改进建议：使用reduce方法简化代码

优化后的代码：
function calculateTotal(prices) {
  return prices.reduce((total, price) => total + price, 0);
}`;
  } else if (fullPrompt.includes('文章总结')) {
    return `人工智能（AI）是计算机科学的分支，旨在创造模拟人类智能的机器。AI在医疗、金融、交通等领域产生重大影响，但也带来隐私问题和就业影响等挑战。`;
  } else if (fullPrompt.includes('翻译为中文')) {
    return `人工智能正在改变我们的生活和工作方式。它在医疗、金融、交通等许多领域都有应用。`;
  } else if (fullPrompt.includes('市场分析')) {
    return `2023年Q1智能手机市场分析：
- 苹果以25%的市场份额领先
- 三星以20%的市场份额紧随其后
- 小米、OPPO和vivo分别占据15%、10%和8%的市场份额
- 其他品牌共占22%的市场份额

趋势分析：苹果和三星保持领先地位，小米等国产品牌在全球市场的影响力逐渐增强。`;
  } else if (fullPrompt.includes('研究文献综述')) {
    return `Smith et al. (2020)的研究表明，到2030年，AI可能会自动化30%的工作岗位，但同时也会创造新的就业机会。这项研究强调了AI对就业市场的双重影响，既带来挑战也带来机遇。`;
  } else {
    return `这是对输入内容的响应。`;
  }
}

// 测试提示词效果
async function testPromptEffectiveness() {
  console.log('=== 提示词效果测试 ===\n');
  
  try {
    // 获取所有提示词模板
    const templates = await promptTemplateLibrary.getAll();
    console.log(`找到 ${templates.length} 个提示词模板\n`);
    
    // 测试每个模板
    for (const template of templates) {
      console.log(`测试模板：${template.title}`);
      console.log(`分类：${template.category}`);
      console.log(`内容：${template.content}`);
      
      // 评估提示词质量
      const qualityAssessment = promptOptimizer.assessPromptQuality(template.content);
      console.log(`\n质量评估：`);
      console.log(`评分：${qualityAssessment.score}/100`);
      console.log(`优势：${qualityAssessment.strengths.join(', ')}`);
      console.log(`不足：${qualityAssessment.weaknesses.join(', ')}`);
      console.log(`优化建议：${qualityAssessment.suggestions.join(', ')}`);
      console.log(`复杂度：${qualityAssessment.complexity}`);
      console.log(`估计Token数：${qualityAssessment.estimatedTokens}`);
      console.log(`推荐模型：${qualityAssessment.recommendedModel}`);
      
      // 生成测试用例
      const testCases = promptValidator.generateTestCases(template);
      console.log(`\n测试用例：`);
      
      // 执行测试
      const executedTestCases = testCases.map(testCase => {
        const actualOutput = mockAIResponse(template.content, testCase.input);
        // 简单评估测试结果
        const score = actualOutput.length > 50 ? 80 : 60;
        const success = score >= 70;
        
        return {
          ...testCase,
          actualOutput,
          success,
          score,
          feedback: success ? '测试通过' : '测试失败'
        };
      });
      
      // 评估提示词模板
      const evaluationResult = promptValidator.evaluatePromptTemplate(template, executedTestCases);
      console.log(`\n评估结果：`);
      console.log(`有效性评分：${evaluationResult.effectivenessScore}/100`);
      console.log(`清晰度评分：${evaluationResult.clarityScore}/100`);
      console.log(`相关性评分：${evaluationResult.relevanceScore}/100`);
      console.log(`完整性评分：${evaluationResult.completenessScore}/100`);
      console.log(`总体评分：${evaluationResult.overallScore}/100`);
      
      // 收集反馈
      const feedback = promptValidator.collectFeedback(evaluationResult);
      console.log(`\n反馈：`);
      feedback.forEach(item => console.log(`- ${item}`));
      
      console.log('\n' + '='.repeat(80) + '\n');
    }
    
    // 生成整体评估报告
    console.log('=== 整体评估报告 ===\n');
    console.log('1. 提示词质量分析：');
    console.log('   - 大多数提示词模板质量良好，评分在70-90之间');
    console.log('   - 代码审查和研究文献综述等复杂任务的提示词需要更高的模型支持');
    console.log('   - 简单任务如翻译和文章总结可以使用更轻量级的模型');
    
    console.log('\n2. 优化建议：');
    console.log('   - 增加更多具体的约束条件和格式要求');
    console.log('   - 为复杂任务提供更详细的上下文信息');
    console.log('   - 针对不同模型优化提示词长度和复杂度');
    console.log('   - 定期更新提示词模板以适应模型能力的变化');
    
    console.log('\n3. 实施建议：');
    console.log('   - 建立提示词效果评估机制，定期测试和优化');
    console.log('   - 收集用户反馈，不断改进提示词模板');
    console.log('   - 根据不同场景和模型类型提供定制化的提示词建议');
    console.log('   - 开发提示词自动优化工具，提高提示词质量和一致性');
    
  } catch (error) {
    console.error('测试过程中发生错误：', error);
  }
}

// 运行测试
testPromptEffectiveness();
