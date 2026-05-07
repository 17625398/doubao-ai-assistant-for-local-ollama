// 代码分析插件 - 提供代码审查、优化建议等功能

import { ChatPlugin, PluginContext, SkillDefinition, SkillContext, SkillResult } from '../types';

/**
 * 代码分析插件
 * 提供代码审查、性能优化建议、安全检查等功能
 */
export class CodeAnalyzerPlugin implements ChatPlugin {
  id = 'code-analyzer';
  name = '代码分析';
  version = '1.0.0';
  description = '提供代码审查、性能优化、安全检查等专业分析';
  author = 'Doubao Team';

  skills: SkillDefinition[] = [
    {
      id: 'code-review',
      name: '代码审查',
      description: '全面审查代码质量和最佳实践',
      icon: '🔍',
      category: 'coding',
      trigger: {
        keywords: ['代码审查', 'code review', 'review code', '检查代码']
      },
      handler: this.handleCodeReview,
      ui: {
        showInToolbar: true,
        showInMenu: true
      }
    },
    {
      id: 'performance-analysis',
      name: '性能分析',
      description: '分析代码性能瓶颈并提供优化建议',
      icon: '⚡',
      category: 'coding',
      trigger: {
        keywords: ['性能分析', 'performance', '优化性能', '太慢了']
      },
      handler: this.handlePerformanceAnalysis,
      ui: {
        showInToolbar: true,
        showInMenu: true
      }
    },
    {
      id: 'security-check',
      name: '安全检查',
      description: '检查代码中的安全漏洞',
      icon: '🔒',
      category: 'coding',
      trigger: {
        keywords: ['安全检查', 'security', '安全漏洞', '安全隐患']
      },
      handler: this.handleSecurityCheck,
      ui: {
        showInToolbar: true,
        showInMenu: true
      }
    },
    {
      id: 'code-complexity',
      name: '复杂度分析',
      description: '分析代码复杂度并提供简化建议',
      icon: '📊',
      category: 'coding',
      trigger: {
        keywords: ['复杂度', 'complexity', '太复杂', '简化代码']
      },
      handler: this.handleComplexityAnalysis,
      ui: {
        showInToolbar: false,
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
    console.log('[CodeAnalyzer] Initialized');
  }

  /**
   * 销毁插件
   */
  async destroy(): Promise<void> {
    this.context = null;
    console.log('[CodeAnalyzer] Destroyed');
  }

  /**
   * 代码审查
   */
  private async handleCodeReview(
    input: string,
    context: SkillContext
  ): Promise<SkillResult> {
    const code = this.extractCode(input);
    const language = this.detectLanguage(code);
    
    return {
      prompt: `请对以下 ${language} 代码进行全面审查:

\`\`\`${language}
${code}
\`\`\`

审查维度:
1. **代码风格**: 命名规范、格式、注释
2. **最佳实践**: 设计模式、SOLID 原则
3. **潜在 bug**: 逻辑错误、边界情况
4. **可维护性**: 模块化、复用性
5. **可读性**: 清晰度、简洁性

请逐一指出问题,并提供改进建议和优化后的代码。`,
      systemPrompt: '你是一个资深代码审查专家,熟悉各种编程语言的最佳实践。',
      metadata: {
        skill: 'code-review',
        language: language,
        codeLength: code.length
      }
    };
  }

  /**
   * 性能分析
   */
  private async handlePerformanceAnalysis(
    input: string,
    context: SkillContext
  ): Promise<SkillResult> {
    const code = this.extractCode(input);
    const language = this.detectLanguage(code);
    
    return {
      prompt: `请分析以下 ${language} 代码的性能瓶颈:

\`\`\`${language}
${code}
\`\`\`

分析要求:
1. **时间复杂度**: 识别 O(n²) 或更差的操作
2. **空间复杂度**: 检查内存使用
3. **循环优化**: 减少不必要的迭代
4. **缓存策略**: 建议使用缓存的地方
5. **异步处理**: 可以并行化的操作
6. **数据结构**: 更高效的数据结构选择

请指出具体性能问题,并提供优化方案和优化后的代码。`,
      systemPrompt: '你是一个性能优化专家,擅长识别和解决性能瓶颈。',
      metadata: {
        skill: 'performance-analysis',
        language: language,
        codeLength: code.length
      }
    };
  }

  /**
   * 安全检查
   */
  private async handleSecurityCheck(
    input: string,
    context: SkillContext
  ): Promise<SkillResult> {
    const code = this.extractCode(input);
    const language = this.detectLanguage(code);
    
    return {
      prompt: `请检查以下 ${language} 代码的安全漏洞:

\`\`\`${language}
${code}
\`\`\`

检查项目:
1. **注入攻击**: SQL 注入、XSS、命令注入
2. **认证授权**: 权限控制、会话管理
3. **数据验证**: 输入验证、类型检查
4. **敏感信息**: 硬编码密码、密钥泄露
5. **错误处理**: 信息泄露、异常暴露
6. **依赖安全**: 不安全的第三方库

请列出所有安全隐患,严重程度评级,并提供修复方案。`,
      systemPrompt: '你是一个网络安全专家,专注于代码安全审计。',
      metadata: {
        skill: 'security-check',
        language: language,
        codeLength: code.length
      }
    };
  }

  /**
   * 复杂度分析
   */
  private async handleComplexityAnalysis(
    input: string,
    context: SkillContext
  ): Promise<SkillResult> {
    const code = this.extractCode(input);
    const language = this.detectLanguage(code);
    
    return {
      prompt: `请分析以下 ${language} 代码的复杂度:

\`\`\`${language}
${code}
\`\`\`

分析维度:
1. **圈复杂度**: 识别高复杂度的函数
2. **嵌套深度**: 过多的 if/for 嵌套
3. **函数长度**: 过长的函数需要拆分
4. **依赖关系**: 过强的耦合
5. **重复代码**: 可以提取的公共逻辑

请提供:
- 复杂度评分
- 具体问题列表
- 简化建议
- 重构后的代码示例`,
      systemPrompt: '你是一个代码重构专家,擅长简化复杂代码。',
      metadata: {
        skill: 'code-complexity',
        language: language,
        codeLength: code.length
      }
    };
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

    // 否则尝试移除指令
    let code = input
      .replace(/(代码审查|性能分析|安全检查|复杂度分析)/g, '')
      .replace(/(code\s*review|performance|security|complexity)/gi, '')
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
    if (lowerCode.includes('fn ') || lowerCode.includes('let mut')) {
      return 'rust';
    }
    if (lowerCode.includes('package main') || lowerCode.includes('func ')) {
      return 'go';
    }
    if (lowerCode.includes('import React') || lowerCode.includes('<div>')) {
      return 'jsx';
    }

    return 'code';
  }
}

// 导出单例
export const codeAnalyzerPlugin = new CodeAnalyzerPlugin();
