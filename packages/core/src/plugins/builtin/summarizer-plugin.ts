// 摘要生成插件 - 提供各类摘要生成功能

import { ChatPlugin, PluginContext, SkillDefinition, SkillContext, SkillResult } from '../types';

/**
 * 摘要生成插件
 * 提供文档摘要、会议纪要、代码摘要等生成功能
 */
export class SummarizerPlugin implements ChatPlugin {
  id = 'summarizer';
  name = '智能摘要';
  version = '1.0.0';
  description = '提供文档摘要、会议纪要、代码摘要等智能摘要生成服务';
  author = 'Doubao Team';

  skills: SkillDefinition[] = [
    {
      id: 'document-summary',
      name: '文档摘要',
      description: '为长文档生成简洁摘要',
      icon: '📄',
      category: 'analysis',
      trigger: {
        keywords: ['文档摘要', '总结文档', 'document summary', '概括一下']
      },
      handler: this.handleDocumentSummary,
      ui: {
        showInToolbar: true,
        showInMenu: true
      }
    },
    {
      id: 'meeting-notes',
      name: '会议纪要',
      description: '从对话记录生成会议纪要',
      icon: '📝',
      category: 'analysis',
      trigger: {
        keywords: ['会议纪要', 'meeting notes', '会议总结', '整理会议']
      },
      handler: this.handleMeetingNotes,
      ui: {
        showInToolbar: true,
        showInMenu: true
      }
    },
    {
      id: 'code-summary',
      name: '代码摘要',
      description: '为代码文件或项目生成摘要说明',
      icon: '💻',
      category: 'coding',
      trigger: {
        keywords: ['代码摘要', 'code summary', '这段代码', '解释代码']
      },
      handler: this.handleCodeSummary,
      ui: {
        showInToolbar: true,
        showInMenu: true
      }
    },
    {
      id: 'bullet-points',
      name: '要点提取',
      description: '从文本中提取关键要点',
      icon: '📌',
      category: 'analysis',
      trigger: {
        keywords: ['要点', '关键点', 'bullet points', '提取重点']
      },
      handler: this.handleBulletPoints,
      ui: {
        showInToolbar: true,
        showInMenu: true
      }
    }
  ];

  private context: PluginContext | null = null;

  /**
   * 初始化插件
   */
  async initialize(context: PluginContext): Promise<void> {
    this.context = context;
    console.log('[Summarizer] Initialized');
  }

  /**
   * 销毁插件
   */
  async destroy(): Promise<void> {
    this.context = null;
    console.log('[Summarizer] Destroyed');
  }

  /**
   * 文档摘要
   */
  private async handleDocumentSummary(
    input: string,
    context: SkillContext
  ): Promise<SkillResult> {
    const text = this.extractText(input);
    
    return {
      prompt: `请为以下文档生成摘要:

"""
${text}
"""

摘要要求:
1. **核心主题**: 用一句话概括主要内容
2. **关键论点**: 列出 3-5 个主要观点
3. **重要细节**: 包含关键数据和事实
4. **结论**: 总结最终结论或建议
5. **长度**: 控制在原文的 15-25%

请使用以下格式:

## 摘要
[一句话概括]

## 核心要点
- 要点 1
- 要点 2
- 要点 3

## 关键信息
- [具体信息]

## 结论
[总结]`,
      systemPrompt: '你是一个文档摘要专家,擅长从长文档中提取核心信息。',
      metadata: {
        skill: 'document-summary',
        textLength: text.length
      }
    };
  }

  /**
   * 会议纪要
   */
  private async handleMeetingNotes(
    input: string,
    context: SkillContext
  ): Promise<SkillResult> {
    const text = this.extractText(input);
    
    return {
      prompt: `请从以下对话记录生成会议纪要:

"""
${text}
"""

会议纪要格式:

## 会议信息
- **时间**: [日期时间]
- **主题**: [会议主题]
- **参与者**: [人员名单]

## 讨论要点
1. [议题 1]
   - 讨论内容
   - 结论

2. [议题 2]
   - 讨论内容
   - 结论

## 决策事项
- [决策 1]
- [决策 2]

## 待办事项
- [ ] [任务 1] - 负责人: [姓名] - 截止日期: [日期]
- [ ] [任务 2] - 负责人: [姓名] - 截止日期: [日期]

## 下次会议
- **时间**: [建议时间]
- **议题**: [建议议题]

请根据对话内容填充以上模板。`,
      systemPrompt: '你是一个会议纪要专家,擅长整理和总结会议内容。',
      metadata: {
        skill: 'meeting-notes',
        textLength: text.length
      }
    };
  }

  /**
   * 代码摘要
   */
  private async handleCodeSummary(
    input: string,
    context: SkillContext
  ): Promise<SkillResult> {
    const code = this.extractCode(input);
    const language = this.detectLanguage(code);
    
    return {
      prompt: `请为以下 ${language} 代码生成摘要说明:

\`\`\`${language}
${code}
\`\`\`

摘要内容:
1. **功能概述**: 这段代码的主要功能
2. **核心逻辑**: 关键算法或流程
3. **输入输出**: 接受什么输入,产生什么输出
4. **依赖关系**: 使用的主要库或模块
5. **复杂度**: 时间复杂度和空间复杂度
6. **使用场景**: 适合在什么情况下使用

请使用简洁清晰的语言描述。`,
      systemPrompt: '你是一个代码文档专家,擅长为代码生成清晰的说明文档。',
      metadata: {
        skill: 'code-summary',
        language: language,
        codeLength: code.length
      }
    };
  }

  /**
   * 要点提取
   */
  private async handleBulletPoints(
    input: string,
    context: SkillContext
  ): Promise<SkillResult> {
    const text = this.extractText(input);
    
    return {
      prompt: `请从以下文本中提取关键要点:

"""
${text}
"""

提取要求:
1. **重要性**: 只提取最重要的信息
2. **简洁性**: 每个要点 1-2 句话
3. **完整性**: 覆盖所有关键方面
4. **数量**: 5-10 个要点
5. **逻辑性**: 按逻辑顺序排列

请使用以下格式:

## 关键要点

1. **[要点标题]**
   - 详细说明

2. **[要点标题]**
   - 详细说明

3. **[要点标题]**
   - 详细说明

请确保每个要点都是独立且有价值的。`,
      systemPrompt: '你是一个信息提取专家,擅长从复杂文本中提炼关键点。',
      metadata: {
        skill: 'bullet-points',
        textLength: text.length
      }
    };
  }

  /**
   * 提取文本
   */
  private extractText(input: string): string {
    // 移除指令,保留内容
    let text = input
      .replace(/(文档摘要|总结文档|document\s*summary|概括)/g, '')
      .replace(/(会议纪要|meeting\s*notes|会议总结|整理会议)/g, '')
      .replace(/(要点|关键点|bullet\s*points|提取重点)/g, '')
      .trim();

    return text || input;
  }

  /**
   * 提取代码
   */
  private extractCode(input: string): string {
    // 尝试从代码块提取
    const codeBlockMatch = input.match(/```[\s\S]*?```/);
    if (codeBlockMatch) {
      return codeBlockMatch[0].replace(/^```\w*\n?|\n?```$/g, '').trim();
    }

    // 否则移除指令
    let code = input
      .replace(/(代码摘要|code\s*summary|这段代码|解释代码)/g, '')
      .trim();

    return code || input;
  }

  /**
   * 检测编程语言
   */
  private detectLanguage(code: string): string {
    const lowerCode = code.toLowerCase();
    
    if (lowerCode.includes('function') && (lowerCode.includes('=>') || lowerCode.includes('const'))) {
      return 'javascript';
    }
    if (lowerCode.includes('def ') && lowerCode.includes(':')) {
      return 'python';
    }
    if (lowerCode.includes('public class') || lowerCode.includes('private ')) {
      return 'java';
    }
    if (lowerCode.includes('import React') || lowerCode.includes('<div>')) {
      return 'jsx';
    }

    return 'code';
  }
}

// 导出单例
export const summarizerPlugin = new SummarizerPlugin();
