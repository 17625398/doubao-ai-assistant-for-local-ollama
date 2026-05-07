// 代码助手插件 - 提供代码解释、优化、调试等技能

import { ChatPlugin, PluginContext, SkillDefinition, SkillContext, SkillResult, ChatMessage, ChatFooterProps } from '../types';
import React from 'react';

/**
 * 代码助手插件
 */
export class CodeAssistantPlugin implements ChatPlugin {
  id = 'code-assistant';
  name = '代码助手';
  version = '1.0.0';
  description = '提供代码解释、优化、调试等智能代码辅助功能';
  author = 'Doubao Team';

  skills: SkillDefinition[] = [
    {
      id: 'code-explain',
      name: '代码解释',
      description: '详细解释代码的功能和逻辑',
      icon: '💻',
      category: 'coding',
      trigger: {
        keywords: ['解释代码', 'explain code', '这段代码']
      },
      handler: this.handleCodeExplain,
      ui: {
        showInToolbar: true,
        showInMenu: true
      }
    },
    {
      id: 'code-optimize',
      name: '代码优化',
      description: '优化代码性能和可读性',
      icon: '✨',
      category: 'coding',
      trigger: {
        keywords: ['优化代码', 'optimize code', '改进代码']
      },
      handler: this.handleCodeOptimize,
      ui: {
        showInToolbar: true,
        showInMenu: true
      }
    },
    {
      id: 'code-debug',
      name: '代码调试',
      description: '查找并修复代码中的错误',
      icon: '🐛',
      category: 'coding',
      trigger: {
        keywords: ['调试', 'debug', '错误', 'bug']
      },
      handler: this.handleCodeDebug,
      ui: {
        showInToolbar: true,
        showInMenu: true
      }
    },
    {
      id: 'code-convert',
      name: '代码转换',
      description: '在不同编程语言间转换代码',
      icon: '🔄',
      category: 'coding',
      trigger: {
        keywords: ['转换为', 'convert to', '翻译成代码']
      },
      handler: this.handleCodeConvert,
      ui: {
        showInToolbar: true,
        showInMenu: false
      }
    }
  ];

  private context: PluginContext | null = null;

  /**
   * 初始化插件
   */
  async initialize(context: PluginContext): Promise<void> {
    this.context = context;
    console.log('[CodeAssistant] Initialized');
  }

  /**
   * 销毁插件
   */
  async destroy(): Promise<void> {
    this.context = null;
    console.log('[CodeAssistant] Destroyed');
  }

  /**
   * 渲染底部操作栏
   */
  renderFooter(props: ChatFooterProps): React.ReactNode {
    // 这里返回 React 组件,实际使用时需要导入 React
    // 由于这是 core 包,我们只返回 null,UI 层会处理
    return null;
  }

  /**
   * 预处理消息 - 检测代码片段
   */
  async preprocessMessage(message: ChatMessage): Promise<ChatMessage> {
    // 检测消息中是否包含代码块
    const codeBlockRegex = /```[\s\S]*?```/g;
    if (codeBlockRegex.test(message.content)) {
      // 如果包含代码,可以添加特殊标记
      message.metadata = {
        ...message.metadata,
        hasCode: true,
        detectedAt: Date.now()
      };
    }
    
    return message;
  }

  /**
   * 代码解释处理器
   */
  private async handleCodeExplain(
    input: string,
    context: SkillContext
  ): Promise<SkillResult> {
    const code = this.extractCode(input);
    
    return {
      prompt: `请详细解释以下代码的功能、逻辑和实现方式:

\`\`\`
${code}
\`\`\`

请从以下几个方面进行解释:
1. 代码的主要功能
2. 关键逻辑和算法
3. 输入输出说明
4. 可能的优化空间`,
      systemPrompt: '你是一个专业的代码解释助手,擅长清晰、详细地解释各种编程语言的代码。',
      metadata: {
        skill: 'code-explain',
        codeLanguage: this.detectLanguage(code)
      }
    };
  }

  /**
   * 代码优化处理器
   */
  private async handleCodeOptimize(
    input: string,
    context: SkillContext
  ): Promise<SkillResult> {
    const code = this.extractCode(input);
    
    return {
      prompt: `请优化以下代码,提高其性能、可读性和可维护性:

\`\`\`
${code}
\`\`\`

请提供:
1. 优化后的代码
2. 优化点说明
3. 性能提升分析
4. 最佳实践建议`,
      systemPrompt: '你是一个资深的代码优化专家,精通各种编程语言的性能优化和最佳实践。',
      metadata: {
        skill: 'code-optimize',
        codeLanguage: this.detectLanguage(code)
      }
    };
  }

  /**
   * 代码调试处理器
   */
  private async handleCodeDebug(
    input: string,
    context: SkillContext
  ): Promise<SkillResult> {
    const code = this.extractCode(input);
    
    return {
      prompt: `请帮助调试以下代码,找出可能存在的错误和问题:

\`\`\`
${code}
\`\`\`

请提供:
1. 发现的bug和问题
2. 问题原因分析
3. 修复方案
4. 修复后的完整代码
5. 预防建议`,
      systemPrompt: '你是一个专业的代码调试专家,擅长快速定位和修复各种编程错误。',
      metadata: {
        skill: 'code-debug',
        codeLanguage: this.detectLanguage(code)
      }
    };
  }

  /**
   * 代码转换处理器
   */
  private async handleCodeConvert(
    input: string,
    context: SkillContext
  ): Promise<SkillResult> {
    // 从输入中提取目标语言
    const targetLangMatch = input.match(/转换为\s+(\w+)/) || input.match(/convert to\s+(\w+)/i);
    const targetLang = targetLangMatch ? targetLangMatch[1] : 'JavaScript';
    
    const code = this.extractCode(input);
    const sourceLang = this.detectLanguage(code);
    
    return {
      prompt: `请将以下${sourceLang}代码转换为${targetLang}代码:

\`\`\`${sourceLang}
${code}
\`\`\`

要求:
1. 保持功能完全一致
2. 遵循目标语言的最佳实践
3. 提供必要的注释
4. 说明转换过程中的关键点`,
      systemPrompt: `你是一个精通多种编程语言的技术专家,擅长在不同编程语言间进行准确的代码转换。`,
      metadata: {
        skill: 'code-convert',
        sourceLanguage: sourceLang,
        targetLanguage: targetLang
      }
    };
  }

  /**
   * 从输入中提取代码
   */
  private extractCode(input: string): string {
    // 尝试提取代码块
    const codeBlockRegex = /```(?:\w+)?\n([\s\S]*?)```/;
    const match = input.match(codeBlockRegex);
    
    if (match && match[1]) {
      return match[1].trim();
    }
    
    // 如果没有代码块,返回整个输入
    return input.trim();
  }

  /**
   * 检测代码语言
   */
  private detectLanguage(code: string): string {
    const lowerCode = code.toLowerCase();
    
    if (lowerCode.includes('function') || lowerCode.includes('const ') || lowerCode.includes('let ')) {
      return 'JavaScript';
    }
    if (lowerCode.includes('def ') || lowerCode.includes('import ')) {
      return 'Python';
    }
    if (lowerCode.includes('public class') || lowerCode.includes('private ')) {
      return 'Java';
    }
    if (lowerCode.includes('#include') || lowerCode.includes('std::')) {
      return 'C++';
    }
    if (lowerCode.includes('fn ') || lowerCode.includes('let mut')) {
      return 'Rust';
    }
    if (lowerCode.includes('package main') || lowerCode.includes('func ')) {
      return 'Go';
    }
    
    return 'Unknown';
  }
}

// 导出单例
export const codeAssistantPlugin = new CodeAssistantPlugin();
