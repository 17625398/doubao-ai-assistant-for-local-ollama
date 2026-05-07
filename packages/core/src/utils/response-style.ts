import type { ExtendedMode, WenyanMode, CavemanMode } from '../services/caveman-service';
import type { ResponseStylePreset } from '../types';

const WENYAN_RESPONSE_STYLES = ['wenyan-lite', 'wenyan', 'wenyan-ultra'] as const;
const EXTENDED_RESPONSE_STYLES = ['concise', 'technical', 'code'] as const;

const RESPONSE_STYLE_PROMPTS: Record<Exclude<ResponseStylePreset, 'normal'>, string> = {
  'caveman-lite': [
    '回答保持精简，但信息完整。',
    '使用与用户相同的语言。',
    '删除客套、铺垫、重复和不必要的解释。',
    '优先给结论，再给关键步骤。',
    '保持正常语法，不要牺牲可读性。',
    '代码、命令、路径、参数原样输出。',
  ].join('\n'),
  caveman: [
    '回答使用 caveman 风格：短句、短段落、少废话，但技术信息必须完整准确。',
    '使用与用户相同的语言。',
    '允许使用片段句。',
    '先说结论，再说必要步骤、风险和限制。',
    '不要寒暄，不要重复用户问题。',
    '代码、命令、路径、参数原样输出。',
  ].join('\n'),
  'caveman-ultra': [
    '回答使用 ultra caveman 风格：极度精简，只保留必要技术信息。',
    '使用与用户相同的语言。',
    '优先使用短句或片段句。',
    '保留关键结论、步骤、参数、风险、边界条件。',
    '不要寒暄，不要背景铺垫，不要重复。',
    '代码、命令、路径、参数原样输出。',
  ].join('\n'),
  'wenyan-lite': [
    '回答使用轻度文言文风格：简洁典雅，但保持现代可读性。',
    '使用与用户相同的语言。',
    '适当使用文言虚词，如"之"、"乎"、"者"、"也"。',
    '保留关键信息完整，避免过度简化。',
    '代码、命令、路径、参数原样输出。',
  ].join('\n'),
  wenyan: [
    '回答使用文言文风格：言简意赅，典雅庄重。',
    '使用与用户相同的语言。',
    '使用文言虚词和句式，如"夫"、"盖"、"故曰"。',
    '先说结论，再说详细内容。',
    '代码、命令、路径、参数原样输出。',
  ].join('\n'),
  'wenyan-ultra': [
    '回答使用重度文言文风格：极简极雅，如古文经典。',
    '使用与用户相同的语言。',
    '大量使用文言词汇和句式。',
    '只保留最核心的信息。',
    '代码、命令、路径、参数原样输出。',
  ].join('\n'),
  concise: [
    '回答使用简洁模式：用简单词替换复杂词。',
    '使用与用户相同的语言。',
    '将复杂词汇替换为简单同义词。',
    '保持信息完整，但表达更直接。',
    '代码、命令、路径、参数原样输出。',
  ].join('\n'),
  technical: [
    '回答使用技术术语模式：使用标准缩写和术语。',
    '使用与用户相同的语言。',
    '使用技术领域的标准缩写。',
    '保持专业性和准确性。',
    '代码、命令、路径、参数原样输出。',
  ].join('\n'),
  code: [
    '回答使用代码优化模式：精简代码相关表达。',
    '使用与用户相同的语言。',
    '优化代码描述和注释。',
    '保持代码的可读性和功能性。',
    '代码、命令、路径、参数原样输出。',
  ].join('\n'),
};

export function getResponseStyleSystemPrompt(style: ResponseStylePreset | undefined): string | null {
  if (!style || style === 'normal') {
    return null;
  }

  return RESPONSE_STYLE_PROMPTS[style];
}

export function isWenyanResponseStyle(style: ResponseStylePreset | undefined): style is WenyanMode {
  return WENYAN_RESPONSE_STYLES.includes(style as WenyanMode);
}

export function isExtendedResponseStyle(style: ResponseStylePreset | undefined): style is ExtendedMode {
  return EXTENDED_RESPONSE_STYLES.includes(style as ExtendedMode);
}

export function toCavemanServiceMode(
  style: ResponseStylePreset | undefined
): CavemanMode | WenyanMode | ExtendedMode | null {
  if (!style || style === 'normal') {
    return null;
  }

  if (isWenyanResponseStyle(style) || isExtendedResponseStyle(style)) {
    return style;
  }

  switch (style) {
    case 'caveman-lite':
      return 'lite';
    case 'caveman-ultra':
      return 'ultra';
    default:
      return 'full';
  }
}
