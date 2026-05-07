// 翻译插件 - 提供多语言翻译服务

import { ChatPlugin, PluginContext, SkillDefinition, SkillContext, SkillResult } from '../types';

/**
 * 翻译插件
 * 支持多种语言互译
 */
export class TranslatorPlugin implements ChatPlugin {
  id = 'translator';
  name = '智能翻译';
  version = '1.0.0';
  description = '提供多语言智能翻译服务,支持中英文等主流语言';
  author = 'Doubao Team';

  skills: SkillDefinition[] = [
    {
      id: 'translate-to-en',
      name: '翻译成英文',
      description: '将中文文本翻译成地道的英文',
      icon: '🇺🇸',
      category: 'translation',
      trigger: {
        keywords: ['翻译成英文', 'translate to english', '译成英语', '用英文说']
      },
      handler: this.handleTranslateToEnglish,
      ui: {
        showInToolbar: true,
        showInMenu: true
      }
    },
    {
      id: 'translate-to-zh',
      name: '翻译成中文',
      description: '将英文文本翻译成流畅的中文',
      icon: '🇨🇳',
      category: 'translation',
      trigger: {
        keywords: ['翻译成中文', 'translate to chinese', '译成中文', '用中文说']
      },
      handler: this.handleTranslateToChinese,
      ui: {
        showInToolbar: true,
        showInMenu: true
      }
    },
    {
      id: 'translate-to-jp',
      name: '翻译成日文',
      description: '将文本翻译成日文',
      icon: '🇯🇵',
      category: 'translation',
      trigger: {
        keywords: ['翻译成日文', 'translate to japanese', '日语翻译']
      },
      handler: this.handleTranslateToJapanese,
      ui: {
        showInToolbar: true,
        showInMenu: false
      }
    },
    {
      id: 'explain-translation',
      name: '解释翻译',
      description: '解释翻译结果并说明语法点',
      icon: '📚',
      category: 'translation',
      trigger: {
        keywords: ['为什么这样翻译', '解释翻译', '语法说明']
      },
      handler: this.handleExplainTranslation,
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
    console.log('[Translator] Initialized');
  }

  /**
   * 销毁插件
   */
  async destroy(): Promise<void> {
    this.context = null;
    console.log('[Translator] Destroyed');
  }

  /**
   * 翻译成英文
   */
  private async handleTranslateToEnglish(
    input: string,
    context: SkillContext
  ): Promise<SkillResult> {
    const text = this.extractTextToTranslate(input);
    
    return {
      prompt: `请将以下中文翻译成英文,要求:
1. 保持原意不变
2. 使用地道的美式英语
3. 注意语法和用词的准确性
4. 如果有多种表达方式,请列出 2-3 种

待翻译文本:
"""
${text}
"""

请先给出最推荐的翻译,然后可以列出其他可选版本。`,
      systemPrompt: '你是一个专业的中英翻译专家,擅长将中文准确、地道地翻译成英文。',
      metadata: {
        skill: 'translate-to-en',
        sourceLanguage: 'zh',
        targetLanguage: 'en',
        originalText: text
      }
    };
  }

  /**
   * 翻译成中文
   */
  private async handleTranslateToChinese(
    input: string,
    context: SkillContext
  ): Promise<SkillResult> {
    const text = this.extractTextToTranslate(input);
    
    return {
      prompt: `请将以下英文翻译成中文,要求:
1. 保持原意不变
2. 使用流畅、自然的中文表达
3. 注意中文的语法和习惯用法
4. 如果有文化差异,请适当本地化

待翻译文本:
"""
${text}
"""

请提供准确的中文翻译。`,
      systemPrompt: '你是一个专业的英中翻译专家,擅长将英文准确、流畅地翻译成中文。',
      metadata: {
        skill: 'translate-to-zh',
        sourceLanguage: 'en',
        targetLanguage: 'zh',
        originalText: text
      }
    };
  }

  /**
   * 翻译成日文
   */
  private async handleTranslateToJapanese(
    input: string,
    context: SkillContext
  ): Promise<SkillResult> {
    const text = this.extractTextToTranslate(input);
    
    return {
      prompt: `请将以下文本翻译成日文,要求:
1. 使用正确的敬语和礼貌用语
2. 注意日语的语法结构
3. 保持原意不变

待翻译文本:
"""
${text}
"""

请提供准确的日文翻译。`,
      systemPrompt: '你是一个专业的日语翻译专家。',
      metadata: {
        skill: 'translate-to-jp',
        sourceLanguage: 'auto',
        targetLanguage: 'ja',
        originalText: text
      }
    };
  }

  /**
   * 解释翻译
   */
  private async handleExplainTranslation(
    input: string,
    context: SkillContext
  ): Promise<SkillResult> {
    // 从上下文中获取最近的翻译结果
    const recentMessages = context.messages.slice(-5);
    const translationContext = recentMessages
      .filter(m => m.content.includes('翻译') || m.content.includes('translate'))
      .map(m => m.content)
      .join('\n');

    return {
      prompt: `请解释以下翻译中的语法要点和翻译技巧:

${translationContext || input}

请从以下几个方面进行解释:
1. 语法结构分析
2. 关键词汇说明
3. 翻译技巧
4. 文化背景 (如果有)
5. 常见错误提醒`,
      systemPrompt: '你是一个语言教学专家,擅长解释翻译中的语法和技巧。',
      metadata: {
        skill: 'explain-translation',
        hasContext: !!translationContext
      }
    };
  }

  /**
   * 提取需要翻译的文本
   */
  private extractTextToTranslate(input: string): string {
    // 移除翻译指令,保留实际内容
    let text = input
      .replace(/翻译(成|到)?(英文|中文|日文|日语|英语)?/g, '')
      .replace(/translate\s*(to)?\s*(english|chinese|japanese)?/gi, '')
      .replace(/用(英文|中文|日文|日语)说/g, '')
      .trim();

    // 如果提取后为空,返回原文
    return text || input;
  }
}

// 导出单例
export const translatorPlugin = new TranslatorPlugin();
