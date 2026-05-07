// 模型工具函数

import { OllamaModel } from '../types';
import { OpenAICompatibleModel } from './openai-compatible-client';

/**
 * 检测模型是否支持Vision功能
 * @param model 模型信息
 * @returns 是否支持Vision功能
 */
export function isVisionModel(model: OllamaModel | OpenAICompatibleModel): boolean {
  const modelName = 'name' in model ? model.name : model.id;
  if (!modelName) return false;

  // 常见的支持Vision的模型关键词
  const visionKeywords = [
    'vision',
    'llava',
    'gemma',
    'gpt-4o',
    'gpt-4-vision',
    'claude-3',
    'claude-3-opus',
    'claude-3-sonnet',
    'claude-3-haiku',
    'gemini',
    'multimodal',
    'image',
    'qwen3.5',
    'qwen3.6',
    'vision-pro',
    'vision-plus'
  ];

  const lowerModelName = modelName.toLowerCase();
  return visionKeywords.some(keyword => lowerModelName.includes(keyword));
}

/**
 * 获取模型的显示名称
 * @param model 模型信息
 * @returns 显示名称
 */
export function getModelDisplayName(model: OllamaModel | OpenAICompatibleModel): string {
  return 'name' in model ? model.name : model.id;
}

/**
 * 按模型名称排序
 * @param models 模型列表
 * @returns 排序后的模型列表
 */
export function sortModels(models: (OllamaModel | OpenAICompatibleModel)[]): (OllamaModel | OpenAICompatibleModel)[] {
  return models.sort((a, b) => {
    const nameA = getModelDisplayName(a).toLowerCase();
    const nameB = getModelDisplayName(b).toLowerCase();
    return nameA.localeCompare(nameB);
  });
}
