// 写作助手插件 - 提供写作辅助服务

import { ChatPlugin, PluginContext, SkillDefinition, SkillContext, SkillResult } from '../types';

/**
 * 写作助手插件
 * 提供文章撰写、改写、润色等写作辅助功能
 */
export class WritingAssistantPlugin implements ChatPlugin {
  id = 'writing-assistant';
  name = '写作助手';
  version = '1.0.0';
  description = '提供文章撰写、改写、润色、扩写等写作辅助功能';
  author = 'Doubao Team';

  skills: SkillDefinition[] = [
    {
      id: 'write-article',
      name: '写文章',
      description: '根据主题撰写完整文章',
      icon: '✍️',
      category: 'writing',
      trigger: {
        keywords: ['写一篇文章', '写一篇', 'write an article', '帮我写']
      },
      handler: this.handleWriteArticle,
      ui: {
        showInToolbar: true,
        showInMenu: true
      }
    },
    {
      id: 'rewrite-text',
      name: '改写文本',
      description: '改写文本使其更流畅或改变风格',
      icon: '🔄',
      category: 'writing',
      trigger: {
        keywords: ['改写', '重写', 'rewrite', '换个说法']
      },
      handler: this.handleRewriteText,
      ui: {
        showInToolbar: true,
        showInMenu: true
      }
    },
    {
      id: 'polish-text',
      name: '润色文本',
      description: '优化文本表达,使其更加优美',
      icon: '✨',
      category: 'writing',
      trigger: {
        keywords: ['润色', '优化', 'polish', '写得好一点']
      },
      handler: this.handlePolishText,
      ui: {
        showInToolbar: true,
        showInMenu: true
      }
    },
    {
      id: 'expand-text',
      name: '扩写文本',
      description: '将简短内容扩展为详细文章',
      icon: '📝',
      category: 'writing',
      trigger: {
        keywords: ['扩写', '展开', 'expand', '详细写']
      },
      handler: this.handleExpandText,
      ui: {
        showInToolbar: true,
        showInMenu: false
      }
    },
    {
      id: 'summarize-text',
      name: '摘要总结',
      description: '将长文本总结为简洁的摘要',
      icon: '📋',
      category: 'writing',
      trigger: {
        keywords: ['总结', '摘要', 'summarize', '概括']
      },
      handler: this.handleSummarizeText,
      ui: {
        showInToolbar: true,
        showInMenu: true
      }
    },
    {
      id: 'change-tone',
      name: '改变语气',
      description: '改变文本的语气和风格',
      icon: '🎭',
      category: 'writing',
      trigger: {
        keywords: ['正式一点', '随意一点', 'change tone', '改变语气']
      },
      handler: this.handleChangeTone,
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
    console.log('[WritingAssistant] Initialized');
  }

  /**
   * 销毁插件
   */
  async destroy(): Promise<void> {
    this.context = null;
    console.log('[WritingAssistant] Destroyed');
  }

  /**
   * 写文章
   */
  private async handleWriteArticle(
    input: string,
    context: SkillContext
  ): Promise<SkillResult> {
    // 提取主题
    const topic = this.extractTopic(input);
    
    return {
      prompt: `请根据以下主题撰写一篇文章:

主题: ${topic}

要求:
1. 文章结构清晰,包含引言、正文和结论
2. 内容丰富,逻辑严密
3. 语言流畅,表达准确
4. 适当使用例证和数据支撑观点
5. 字数在 800-1500 字之间

请直接开始撰写文章。`,
      systemPrompt: '你是一个专业的写作者,擅长撰写各类主题的文章。',
      metadata: {
        skill: 'write-article',
        topic: topic
      }
    };
  }

  /**
   * 改写文本
   */
  private async handleRewriteText(
    input: string,
    context: SkillContext
  ): Promise<SkillResult> {
    const text = this.extractTextToProcess(input);
    
    return {
      prompt: `请改写以下文本,要求:
1. 保持原意不变
2. 使用不同的表达方式
3. 使语言更加流畅自然
4. 可以适当调整句式结构

原文本:
"""
${text}
"""

请提供改写后的版本。`,
      systemPrompt: '你是一个文字编辑专家,擅长改写和优化文本。',
      metadata: {
        skill: 'rewrite-text',
        originalLength: text.length
      }
    };
  }

  /**
   * 润色文本
   */
  private async handlePolishText(
    input: string,
    context: SkillContext
  ): Promise<SkillResult> {
    const text = this.extractTextToProcess(input);
    
    return {
      prompt: `请润色以下文本,使其更加优美流畅:

原文本:
"""
${text}
"""

润色要求:
1. 优化词汇选择,使用更精准的表达
2. 改善句式结构,增加变化
3. 增强语言的感染力和表现力
4. 保持原文的核心意思
5. 适当添加修辞手法

请提供润色后的版本,并简要说明主要修改点。`,
      systemPrompt: '你是一个文字润色专家,擅长提升文本的文学性和表达力。',
      metadata: {
        skill: 'polish-text',
        originalLength: text.length
      }
    };
  }

  /**
   * 扩写文本
   */
  private async handleExpandText(
    input: string,
    context: SkillContext
  ): Promise<SkillResult> {
    const text = this.extractTextToProcess(input);
    
    return {
      prompt: `请将以下简短内容扩展为详细的文章:

原文本:
"""
${text}
"""

扩写要求:
1. 添加具体的细节和例证
2. 展开论述,深入分析
3. 补充相关背景信息
4. 增加过渡句,使逻辑更连贯
5. 扩展到原文的 2-3 倍长度

请提供扩写后的完整版本。`,
      systemPrompt: '你是一个擅长扩写的作者,能够将简短内容丰富为详细的文章。',
      metadata: {
        skill: 'expand-text',
        originalLength: text.length
      }
    };
  }

  /**
   * 摘要总结
   */
  private async handleSummarizeText(
    input: string,
    context: SkillContext
  ): Promise<SkillResult> {
    const text = this.extractTextToProcess(input);
    
    return {
      prompt: `请对以下文本进行摘要总结:

原文本:
"""
${text}
"""

摘要要求:
1. 提取核心观点和关键信息
2. 保持逻辑清晰
3. 语言简洁明了
4. 长度为原文的 20-30%
5. 包含所有重要信息

请提供简洁准确的摘要。`,
      systemPrompt: '你是一个摘要专家,擅长从长文本中提取关键信息。',
      metadata: {
        skill: 'summarize-text',
        originalLength: text.length
      }
    };
  }

  /**
   * 改变语气
   */
  private async handleChangeTone(
    input: string,
    context: SkillContext
  ): Promise<SkillResult> {
    const text = this.extractTextToProcess(input);
    
    // 检测目标语气
    let targetTone = '正式';
    if (input.includes('随意') || input.includes('casual')) {
      targetTone = '随意';
    } else if (input.includes('正式') || input.includes('formal')) {
      targetTone = '正式';
    } else if (input.includes('幽默') || input.includes('humorous')) {
      targetTone = '幽默';
    } else if (input.includes('严肃') || input.includes('serious')) {
      targetTone = '严肃';
    }

    return {
      prompt: `请将以下文本的语气改为${targetTone}风格:

原文本:
"""
${text}
"""

要求:
1. 保持原意不变
2. 调整用词和句式以符合${targetTone}的语气
3. 适当添加或删除语气词
4. 整体风格统一

请提供修改后的版本。`,
      systemPrompt: `你是一个文字风格调整专家,擅长改变文本的语气和风格。`,
      metadata: {
        skill: 'change-tone',
        targetTone: targetTone,
        originalLength: text.length
      }
    };
  }

  /**
   * 提取主题
   */
  private extractTopic(input: string): string {
    // 移除写作指令
    let topic = input
      .replace(/写(一篇|一个|段)?(文章|作文|报告)?/g, '')
      .replace(/write\s*(an)?\s*(article|essay)?/gi, '')
      .replace(/帮我/g, '')
      .trim();

    return topic || '人工智能的发展';
  }

  /**
   * 提取需要处理的文本
   */
  private extractTextToProcess(input: string): string {
    // 移除处理指令,保留实际内容
    let text = input
      .replace(/(改写|重写|润色|优化|扩写|总结|摘要|改变语气)/g, '')
      .replace(/(rewrite|polish|expand|summarize|change\s*tone)/gi, '')
      .replace(/(正式|随意|幽默|严肃)一点/g, '')
      .trim();

    // 如果提取后为空,返回原文
    return text || input;
  }
}

// 导出单例
export const writingAssistantPlugin = new WritingAssistantPlugin();
