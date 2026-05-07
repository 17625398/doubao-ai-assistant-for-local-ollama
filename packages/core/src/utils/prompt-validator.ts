// 提示词验证和评估工具

import { PromptTemplate } from './prompt-template-library';
import { PromptQualityAssessment, promptOptimizer } from './prompt-optimizer';

// 提示词验证结果
export interface PromptValidationResult {
  isValid: boolean; // 是否有效
  errors: string[]; // 错误信息
  warnings: string[]; // 警告信息
  suggestions: string[]; // 改进建议
  qualityAssessment: PromptQualityAssessment; // 质量评估
}

// 提示词评估结果
export interface PromptEvaluationResult {
  template: PromptTemplate; // 提示词模板
  effectivenessScore: number; // 有效性评分（0-100）
  clarityScore: number; // 清晰度评分（0-100）
  relevanceScore: number; // 相关性评分（0-100）
  completenessScore: number; // 完整性评分（0-100）
  overallScore: number; // 总体评分（0-100）
  feedback: string[]; // 反馈意见
  suggestions: string[]; // 改进建议
  testResults: TestResult[]; // 测试结果
}

// 测试结果
export interface TestResult {
  testCase: string; // 测试用例
  input: string; // 输入
  expectedOutput: string; // 期望输出
  actualOutput: string; // 实际输出
  success: boolean; // 是否成功
  score: number; // 评分（0-100）
  feedback: string; // 反馈
}

// 提示词验证器
class PromptValidator {
  private static instance: PromptValidator;

  static getInstance(): PromptValidator {
    if (!PromptValidator.instance) {
      PromptValidator.instance = new PromptValidator();
    }
    return PromptValidator.instance;
  }

  // 验证提示词
  validatePrompt(prompt: string): PromptValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];
    const suggestions: string[] = [];

    // 检查提示词是否为空
    if (!prompt || prompt.trim().length === 0) {
      errors.push('提示词不能为空');
    }

    // 检查提示词长度
    if (prompt.length > 10000) {
      errors.push('提示词长度不能超过10000个字符');
    } else if (prompt.length < 5) {
      warnings.push('提示词长度过短，可能缺少必要的信息');
      suggestions.push('增加更多的上下文信息和具体要求');
    }

    // 检查提示词是否包含敏感内容
    const sensitiveKeywords = ['侮辱', '歧视', '暴力', '色情', '违法'];
    for (const keyword of sensitiveKeywords) {
      if (prompt.includes(keyword)) {
        errors.push(`提示词包含敏感内容：${keyword}`);
      }
    }

    // 评估提示词质量
    const qualityAssessment = promptOptimizer.assessPromptQuality(prompt);

    // 添加质量评估的建议
    suggestions.push(...qualityAssessment.suggestions);

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
      suggestions,
      qualityAssessment
    };
  }

  // 评估提示词模板
  evaluatePromptTemplate(template: PromptTemplate, testCases: TestResult[]): PromptEvaluationResult {
    let totalEffectiveness = 0;
    let totalClarity = 0;
    let totalRelevance = 0;
    let totalCompleteness = 0;
    const feedback: string[] = [];
    const suggestions: string[] = [];

    // 验证提示词模板
    const validationResult = this.validatePrompt(template.content);
    if (!validationResult.isValid) {
      feedback.push(...validationResult.errors.map(error => `验证错误：${error}`));
    }
    if (validationResult.warnings.length > 0) {
      feedback.push(...validationResult.warnings.map(warning => `验证警告：${warning}`));
    }
    suggestions.push(...validationResult.suggestions);

    // 分析测试结果
    if (testCases.length > 0) {
      for (const testCase of testCases) {
        totalEffectiveness += testCase.score;
        
        // 评估清晰度
        const clarityScore = this.evaluateClarity(testCase.actualOutput);
        totalClarity += clarityScore;
        
        // 评估相关性
        const relevanceScore = this.evaluateRelevance(testCase.actualOutput, testCase.expectedOutput);
        totalRelevance += relevanceScore;
        
        // 评估完整性
        const completenessScore = this.evaluateCompleteness(testCase.actualOutput, testCase.expectedOutput);
        totalCompleteness += completenessScore;
        
        if (testCase.feedback) {
          feedback.push(`测试用例 "${testCase.testCase}"：${testCase.feedback}`);
        }
      }

      totalEffectiveness /= testCases.length;
      totalClarity /= testCases.length;
      totalRelevance /= testCases.length;
      totalCompleteness /= testCases.length;
    } else {
      // 如果没有测试用例，使用质量评估结果
      totalEffectiveness = validationResult.qualityAssessment.score;
      totalClarity = validationResult.qualityAssessment.score;
      totalRelevance = validationResult.qualityAssessment.score;
      totalCompleteness = validationResult.qualityAssessment.score;
    }

    // 计算总体评分
    const overallScore = (totalEffectiveness + totalClarity + totalRelevance + totalCompleteness) / 4;

    // 生成改进建议
    if (totalEffectiveness < 70) {
      suggestions.push('提高提示词的有效性，确保它能够引导模型生成符合预期的输出');
    }
    if (totalClarity < 70) {
      suggestions.push('提高提示词的清晰度，使用更明确、更具体的语言');
    }
    if (totalRelevance < 70) {
      suggestions.push('提高提示词的相关性，确保它与任务目标直接相关');
    }
    if (totalCompleteness < 70) {
      suggestions.push('提高提示词的完整性，确保它包含所有必要的信息和要求');
    }

    return {
      template,
      effectivenessScore: Math.round(totalEffectiveness),
      clarityScore: Math.round(totalClarity),
      relevanceScore: Math.round(totalRelevance),
      completenessScore: Math.round(totalCompleteness),
      overallScore: Math.round(overallScore),
      feedback,
      suggestions,
      testResults: testCases
    };
  }

  // 评估输出的清晰度
  private evaluateClarity(output: string): number {
    // 简单的清晰度评估：检查输出是否流畅、连贯
    const sentences = output.split(/[。！？.!?]/).filter(s => s.trim().length > 0);
    if (sentences.length === 0) return 0;
    
    const avgSentenceLength = output.length / sentences.length;
    if (avgSentenceLength > 100) {
      return 50; // 句子过长，清晰度较低
    } else if (avgSentenceLength > 50) {
      return 70; // 句子较长，清晰度中等
    } else {
      return 90; // 句子长度适中，清晰度较高
    }
  }

  // 评估输出的相关性
  private evaluateRelevance(actualOutput: string, expectedOutput: string): number {
    // 简单的相关性评估：检查实际输出是否包含期望输出的关键词
    const expectedKeywords = expectedOutput.split(/\s+/).filter(w => w.length > 2);
    if (expectedKeywords.length === 0) return 100;
    
    let matchingKeywords = 0;
    for (const keyword of expectedKeywords) {
      if (actualOutput.includes(keyword)) {
        matchingKeywords++;
      }
    }
    
    return (matchingKeywords / expectedKeywords.length) * 100;
  }

  // 评估输出的完整性
  private evaluateCompleteness(actualOutput: string, expectedOutput: string): number {
    // 简单的完整性评估：检查实际输出长度是否达到期望输出的一定比例
    const expectedLength = expectedOutput.length;
    const actualLength = actualOutput.length;
    
    if (expectedLength === 0) return 100;
    
    const lengthRatio = Math.min(1, actualLength / expectedLength);
    return lengthRatio * 100;
  }

  // 生成测试用例
  generateTestCases(template: PromptTemplate): TestResult[] {
    const testCases: TestResult[] = [];
    
    // 根据模板类型生成测试用例
    switch (template.category) {
      case '开发':
        testCases.push({
          testCase: '代码审查',
          input: 'function calculateTotal(prices) {\n  let total = 0;\n  for (let i = 0; i < prices.length; i++) {\n    total += prices[i];\n  }\n  return total;\n}',
          expectedOutput: '代码审查结果，包括潜在问题、安全漏洞和改进建议',
          actualOutput: '', // 实际输出将在测试时填写
          success: false,
          score: 0,
          feedback: ''
        });
        break;
      case '写作':
        testCases.push({
          testCase: '文章总结',
          input: '人工智能（AI）是计算机科学的一个分支，旨在创造能够模拟人类智能的机器。AI的发展已经在许多领域产生了重大影响，包括医疗、金融、交通等。然而，AI的发展也带来了一些挑战，如隐私问题、就业影响等。',
          expectedOutput: '人工智能的定义、应用领域和挑战的简要总结',
          actualOutput: '', // 实际输出将在测试时填写
          success: false,
          score: 0,
          feedback: ''
        });
        break;
      case '翻译':
        testCases.push({
          testCase: '翻译为中文',
          input: 'Artificial intelligence is transforming the way we live and work. It has applications in healthcare, finance, transportation, and many other fields.',
          expectedOutput: '人工智能正在改变我们的生活和工作方式。它在医疗、金融、交通等许多领域都有应用。',
          actualOutput: '', // 实际输出将在测试时填写
          success: false,
          score: 0,
          feedback: ''
        });
        break;
      case '分析':
        testCases.push({
          testCase: '市场分析',
          input: '2023年Q1智能手机市场份额：苹果25%，三星20%，小米15%，OPPO 10%，vivo 8%，其他22%',
          expectedOutput: '智能手机市场份额分析，包括市场趋势和竞争格局',
          actualOutput: '', // 实际输出将在测试时填写
          success: false,
          score: 0,
          feedback: ''
        });
        break;
      case '研究':
        testCases.push({
          testCase: '研究文献综述',
          input: 'Smith et al. (2020) investigated the effects of artificial intelligence on job automation. They found that AI is likely to automate 30% of jobs by 2030, but will also create new job opportunities.',
          expectedOutput: '关于AI对就业影响的研究文献综述',
          actualOutput: '', // 实际输出将在测试时填写
          success: false,
          score: 0,
          feedback: ''
        });
        break;
      default:
        testCases.push({
          testCase: '通用测试',
          input: '测试输入',
          expectedOutput: '测试输出',
          actualOutput: '', // 实际输出将在测试时填写
          success: false,
          score: 0,
          feedback: ''
        });
    }
    
    return testCases;
  }

  // 收集反馈并迭代改进
  collectFeedback(evaluationResult: PromptEvaluationResult): string[] {
    const feedback: string[] = [];
    
    // 基于评估结果收集反馈
    if (evaluationResult.overallScore < 60) {
      feedback.push('提示词需要重大改进，建议重新设计');
    } else if (evaluationResult.overallScore < 80) {
      feedback.push('提示词有改进空间，建议根据具体建议进行调整');
    } else {
      feedback.push('提示词质量良好，建议继续优化');
    }
    
    // 基于各维度评分收集反馈
    if (evaluationResult.effectivenessScore < 70) {
      feedback.push('提示词的有效性需要提高，确保它能够引导模型生成符合预期的输出');
    }
    if (evaluationResult.clarityScore < 70) {
      feedback.push('提示词的清晰度需要提高，使用更明确、更具体的语言');
    }
    if (evaluationResult.relevanceScore < 70) {
      feedback.push('提示词的相关性需要提高，确保它与任务目标直接相关');
    }
    if (evaluationResult.completenessScore < 70) {
      feedback.push('提示词的完整性需要提高，确保它包含所有必要的信息和要求');
    }
    
    // 基于测试结果收集反馈
    const failedTests = evaluationResult.testResults.filter(test => !test.success);
    if (failedTests.length > 0) {
      feedback.push(`有 ${failedTests.length} 个测试用例失败，建议分析失败原因并改进提示词`);
    }
    
    return feedback;
  }
}

export const promptValidator = PromptValidator.getInstance();
