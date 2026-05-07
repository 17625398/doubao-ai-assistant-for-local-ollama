// 提示词优化工具

import { PromptTemplate } from './prompt-template-library';

// 提示词质量评估结果
export interface PromptQualityAssessment {
  score: number; // 0-100的评分
  strengths: string[]; // 优势
  weaknesses: string[]; // 不足
  suggestions: string[]; // 优化建议
  complexity: 'low' | 'medium' | 'high'; // 复杂度
  estimatedTokens: number; // 估计token数
  recommendedModel: string; // 推荐模型
}

// 提示词优化器
class PromptOptimizer {
  private static instance: PromptOptimizer;

  static getInstance(): PromptOptimizer {
    if (!PromptOptimizer.instance) {
      PromptOptimizer.instance = new PromptOptimizer();
    }
    return PromptOptimizer.instance;
  }

  // 评估提示词质量
  assessPromptQuality(prompt: string): PromptQualityAssessment {
    const strengths: string[] = [];
    const weaknesses: string[] = [];
    const suggestions: string[] = [];

    // 检查提示词长度
    const length = prompt.length;
    if (length > 50) {
      strengths.push('提示词长度适中，包含足够的上下文信息');
    } else if (length < 20) {
      weaknesses.push('提示词长度过短，可能缺少必要的上下文信息');
      suggestions.push('增加更多的上下文信息和具体要求');
    } else {
      strengths.push('提示词长度合理');
    }

    // 检查是否包含明确的指令
    if (prompt.includes('请') || prompt.includes('请你') || prompt.includes('请帮忙') || prompt.includes('需要')) {
      strengths.push('包含明确的指令');
    } else {
      weaknesses.push('缺少明确的指令');
      suggestions.push('添加明确的指令，如"请"、"请你"等');
    }

    // 检查是否包含具体的要求
    if (prompt.includes('详细') || prompt.includes('具体') || prompt.includes('详细说明') || prompt.includes('具体步骤')) {
      strengths.push('包含具体的要求');
    } else {
      weaknesses.push('缺少具体的要求');
      suggestions.push('添加具体的要求，如"详细说明"、"具体步骤"等');
    }

    // 检查是否包含格式要求
    if (prompt.includes('格式') || prompt.includes('结构') || prompt.includes('层次') || prompt.includes('要点')) {
      strengths.push('包含格式要求');
    } else {
      suggestions.push('考虑添加格式要求，如"按要点列出"、"使用层次结构"等');
    }

    // 检查是否包含示例
    if (prompt.includes('例如') || prompt.includes('示例') || prompt.includes('比如') || prompt.includes('样例')) {
      strengths.push('包含示例');
    } else {
      suggestions.push('考虑添加示例，帮助模型更好地理解你的需求');
    }

    // 检查是否包含约束条件
    if (prompt.includes('不要') || prompt.includes('避免') || prompt.includes('禁止') || prompt.includes('不要使用')) {
      strengths.push('包含约束条件');
    } else {
      suggestions.push('考虑添加约束条件，如"不要使用专业术语"、"避免过于复杂的解释"等');
    }

    // 计算评分
    let score = 50; // 基础分
    score += strengths.length * 5; // 每个优势加5分
    score -= weaknesses.length * 3; // 每个不足减3分
    score = Math.max(0, Math.min(100, score)); // 确保评分在0-100之间

    // 评估复杂度
    let complexity: 'low' | 'medium' | 'high' = 'medium';
    if (length < 50) {
      complexity = 'low';
    } else if (length > 200) {
      complexity = 'high';
    }

    // 估计token数（粗略估计，1个英文单词约1.3个token，1个中文字符约2个token）
    const estimatedTokens = Math.ceil((prompt.length * 1.5));

    // 推荐模型
    let recommendedModel = 'gpt-3.5-turbo';
    if (complexity === 'high' || estimatedTokens > 1000) {
      recommendedModel = 'gpt-4';
    }

    return {
      score,
      strengths,
      weaknesses,
      suggestions,
      complexity,
      estimatedTokens,
      recommendedModel
    };
  }

  // 优化提示词
  optimizePrompt(prompt: string, context?: string): string {
    let optimizedPrompt = prompt;

    // 添加明确的指令
    if (!optimizedPrompt.includes('请')) {
      optimizedPrompt = '请' + optimizedPrompt;
    }

    // 添加具体的要求
    if (!optimizedPrompt.includes('详细') && !optimizedPrompt.includes('具体')) {
      optimizedPrompt += '，请提供详细的回答。';
    }

    // 添加格式要求
    if (!optimizedPrompt.includes('格式') && !optimizedPrompt.includes('结构') && !optimizedPrompt.includes('层次') && !optimizedPrompt.includes('要点')) {
      optimizedPrompt += '\n\n请按要点列出你的回答，确保层次清晰。';
    }

    // 添加约束条件
    if (!optimizedPrompt.includes('不要') && !optimizedPrompt.includes('避免') && !optimizedPrompt.includes('禁止')) {
      optimizedPrompt += '\n\n请避免使用过于专业的术语，确保回答通俗易懂。';
    }

    // 添加上下文信息
    if (context) {
      optimizedPrompt = `上下文信息：${context}\n\n${optimizedPrompt}`;
    }

    return optimizedPrompt;
  }

  // 生成提示词使用指南
  generatePromptGuide(): string {
    return `# 提示词使用指南

## 什么是提示词？
提示词（Prompt）是你给AI模型的指令，告诉它你想要什么以及如何回答。一个好的提示词可以帮助AI模型生成更准确、更有用的回答。

## 提示词设计原则

### 1. 明确具体
- 清楚地表达你的需求
- 提供足够的上下文信息
- 指明你期望的输出格式

### 2. 结构化
- 使用层次结构组织你的提示词
- 按逻辑顺序排列信息
- 使用编号或项目符号使内容清晰易读

### 3. 提供示例
- 当你需要特定格式的输出时，提供示例
- 示例可以帮助AI模型更好地理解你的需求
- 示例应该与你的实际需求相关

### 4. 设置约束条件
- 明确指出你不想要什么
- 设定回答的长度限制
- 指明不应该使用的语言或风格

### 5. 调整复杂度
- 根据任务的复杂度选择合适的提示词长度
- 简单任务使用简洁的提示词
- 复杂任务提供更详细的上下文和指导

## 常见问题与解决方案

### 问题：AI生成的回答不够详细
解决方案：在提示词中明确要求详细回答，例如："请提供详细的回答，包括具体的步骤和例子。"

### 问题：AI生成的回答偏离主题
解决方案：在提示词中明确主题范围，例如："请仅围绕主题X回答，不要涉及其他无关内容。"

### 问题：AI生成的回答格式不符合要求
解决方案：在提示词中明确格式要求，例如："请按以下格式回答：1. 问题分析；2. 解决方案；3. 实施步骤。"

### 问题：AI生成的回答过于技术化
解决方案：在提示词中要求使用通俗易懂的语言，例如："请使用通俗易懂的语言回答，避免使用专业术语。"

## 最佳实践

1. 先简单后复杂：先使用简单的提示词，根据需要逐步添加细节
2. 测试和迭代：测试不同的提示词，根据结果进行调整
3. 学习和借鉴：参考成功的提示词示例，学习其结构和风格
4. 保持一致性：对于相似的任务，使用相似的提示词结构
5. 适应不同模型：不同的AI模型可能对提示词有不同的偏好，根据模型调整提示词

## 提示词优化工具

使用本平台提供的提示词优化工具，可以：
1. 评估提示词的质量和有效性
2. 生成针对不同场景的优化建议
3. 获取推荐的模型和参数设置

通过不断优化你的提示词，你可以获得更好的AI生成结果，提高工作效率和质量。`;
  }

  // 为特定场景生成优化建议
  generateSceneSpecificSuggestions(scene: string): string[] {
    const suggestionsMap: Record<string, string[]> = {
      '代码审查': [
        '明确指出你关注的代码质量方面，如安全性、性能、可读性等',
        '提供具体的代码示例，帮助AI更好地理解上下文',
        '指明你期望的审查深度和详细程度',
        '考虑添加代码的使用场景和上下文信息',
        '要求AI提供具体的改进建议和最佳实践'
      ],
      '文章总结': [
        '明确总结的长度要求，如"不超过200字"',
        '指明你关注的核心观点和重点内容',
        '要求AI保持原文的语气和风格',
        '考虑添加总结的用途，如"用于社交媒体分享"',
        '要求AI使用简洁明了的语言'
      ],
      '翻译': [
        '明确目标语言和原文语言',
        '指明翻译的风格要求，如"正式"、"口语化"等',
        '要求保持原文的格式和结构',
        '考虑添加上下文信息，帮助AI理解专业术语',
        '要求AI解释难以翻译的术语'
      ],
      '市场分析': [
        '提供具体的市场数据和背景信息',
        '明确分析的目标和关注点',
        '要求AI提供数据支持的洞察和建议',
        '考虑添加时间范围和地理范围',
        '要求AI使用结构化的分析框架'
      ],
      '研究文献综述': [
        '提供具体的研究文献和背景信息',
        '明确综述的目标和范围',
        '要求AI总结主要发现和研究趋势',
        '考虑添加研究领域的背景信息',
        '要求AI指出研究的局限性和未来方向'
      ],
      '创意写作': [
        '提供详细的场景描述和角色信息',
        '明确写作风格和体裁要求',
        '要求AI保持一致性和连贯性',
        '考虑添加情感和氛围要求',
        '要求AI使用生动的语言和具体的细节'
      ],
      '问题解决': [
        '提供详细的问题描述和背景信息',
        '明确问题的范围和限制条件',
        '要求AI提供多种解决方案',
        '考虑添加问题的紧急程度和影响范围',
        '要求AI评估每种解决方案的优缺点'
      ],
      '教育培训': [
        '明确教育目标和受众群体',
        '提供具体的学习内容和要求',
        '要求AI使用适合目标受众的语言',
        '考虑添加学习资源和参考资料',
        '要求AI提供互动式的学习活动'
      ]
    };

    return suggestionsMap[scene] || [
      '明确你的需求和期望',
      '提供足够的上下文信息',
      '指明你期望的输出格式',
      '考虑添加示例和约束条件',
      '根据任务复杂度调整提示词长度'
    ];
  }
}

export const promptOptimizer = PromptOptimizer.getInstance();
