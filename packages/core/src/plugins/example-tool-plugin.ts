// 示例工具插件
// 演示如何实现一个工具插件

import { ToolPlugin } from '../types/plugin';
import { logger } from '../utils/logger';

/**
 * 计算器插件
 * 提供简单的数学计算功能
 */
export class CalculatorPlugin implements ToolPlugin {
  id = 'calculator';
  name = '计算器';
  version = '1.0.0';
  description = '提供简单的数学计算功能';
  author = 'Doubao Team';
  icon = '🧮';
  enabled = false;
  type = 'tool' as const;
  category = 'utility';

  async initialize(): Promise<void> {
    logger.info('[CalculatorPlugin] Initialized');
  }

  async destroy(): Promise<void> {
    logger.info('[CalculatorPlugin] Destroyed');
  }

  /**
   * 执行计算
   */
  async execute(params: { expression: string }): Promise<{ result: number | string }> {
    try {
      // 安全地计算表达式
      const result = this.safeEvaluate(params.expression);
      return { result };
    } catch (error) {
      logger.error('[CalculatorPlugin] Calculation error:', error);
      return { result: '计算错误: ' + (error as Error).message };
    }
  }

  /**
   * 安全地计算表达式
   * 只允许基本的数学运算
   */
  private safeEvaluate(expression: string): number {
    // 移除所有空白字符
    const cleanExpr = expression.replace(/\s/g, '');
    
    // 只允许数字和基本运算符
    if (!/^[\d+\-*/.()]+$/.test(cleanExpr)) {
      throw new Error('表达式包含非法字符');
    }

    // 使用 Function 构造函数安全地计算
    // 注意：这仍然需要谨慎使用，只在受信任的环境中使用
    const func = new Function(`return ${cleanExpr}`);
    const result = func();
    
    if (typeof result !== 'number' || !isFinite(result)) {
      throw new Error('计算结果无效');
    }
    
    return result;
  }
}

/**
 * 翻译插件
 * 提供文本翻译功能（模拟）
 */
export class TranslatorPlugin implements ToolPlugin {
  id = 'translator';
  name = '翻译助手';
  version = '1.0.0';
  description = '提供简单的文本翻译功能';
  author = 'Doubao Team';
  icon = '🌐';
  enabled = false;
  type = 'tool' as const;
  category = 'language';

  private translations: Map<string, Map<string, string>> = new Map([
    ['hello', new Map([['zh', '你好'], ['ja', 'こんにちは'], ['ko', '안녕하세요']])],
    ['world', new Map([['zh', '世界'], ['ja', '世界'], ['ko', '세계']])],
    ['thank you', new Map([['zh', '谢谢'], ['ja', 'ありがとう'], ['ko', '감사합니다']])],
  ]);

  async initialize(): Promise<void> {
    logger.info('[TranslatorPlugin] Initialized');
  }

  async destroy(): Promise<void> {
    logger.info('[TranslatorPlugin] Destroyed');
  }

  /**
   * 执行翻译
   */
  async execute(params: { 
    text: string; 
    targetLang: string;
    sourceLang?: string;
  }): Promise<{ 
    translated: string;
    sourceLang: string;
    targetLang: string;
  }> {
    const { text, targetLang, sourceLang = 'auto' } = params;
    
    // 模拟翻译（实际应用中应该调用翻译 API）
    const lowerText = text.toLowerCase().trim();
    const translation = this.translations.get(lowerText)?.get(targetLang);
    
    if (translation) {
      return {
        translated: translation,
        sourceLang,
        targetLang,
      };
    }

    // 如果没有找到翻译，返回原文
    return {
      translated: `[${targetLang}] ${text}`,
      sourceLang,
      targetLang,
    };
  }
}

/**
 * 代码格式化插件
 * 提供代码格式化功能
 */
export class CodeFormatterPlugin implements ToolPlugin {
  id = 'code-formatter';
  name = '代码格式化';
  version = '1.0.0';
  description = '提供简单的代码格式化功能';
  author = 'Doubao Team';
  icon = '💻';
  enabled = false;
  type = 'tool' as const;
  category = 'development';

  async initialize(): Promise<void> {
    logger.info('[CodeFormatterPlugin] Initialized');
  }

  async destroy(): Promise<void> {
    logger.info('[CodeFormatterPlugin] Destroyed');
  }

  /**
   * 执行代码格式化
   */
  async execute(params: { 
    code: string; 
    language: string;
  }): Promise<{ 
    formatted: string;
    language: string;
  }> {
    const { code, language } = params;
    
    // 简单的格式化逻辑（实际应用中应该使用专业的格式化库）
    let formatted = code;
    
    switch (language.toLowerCase()) {
      case 'json':
        formatted = this.formatJSON(code);
        break;
      case 'javascript':
      case 'typescript':
        formatted = this.formatJavaScript(code);
        break;
      case 'html':
        formatted = this.formatHTML(code);
        break;
      default:
        // 默认只进行基本的空白字符处理
        formatted = code.trim();
    }
    
    return { formatted, language };
  }

  private formatJSON(code: string): string {
    try {
      const obj = JSON.parse(code);
      return JSON.stringify(obj, null, 2);
    } catch {
      return code;
    }
  }

  private formatJavaScript(code: string): string {
    // 简单的 JavaScript 格式化
    return code
      .replace(/;\s*/g, ';\n')
      .replace(/\{\s*/g, ' {\n  ')
      .replace(/\}\s*/g, '\n}\n')
      .replace(/,\s*/g, ', ')
      .trim();
  }

  private formatHTML(code: string): string {
    // 简单的 HTML 格式化
    return code
      .replace(/>\s*</g, '>\n<')
      .replace(/\n\s*\n/g, '\n')
      .trim();
  }
}
