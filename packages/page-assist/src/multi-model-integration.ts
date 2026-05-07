/**
 * Page Assist 多模型集成层
 * 将多模型适配层集成到 Page Assist 项目
 */

import type {
  ChatRequest,
  ChatResponse,
  ChatChunk,
  ModelInfo,
  LayerConfig,
} from '@refactored/core';

// 延迟导入避免循环依赖
let multiModelLayer: any = null;

async function getLayer() {
  if (!multiModelLayer) {
    const module = await import('@refactored/core');
    multiModelLayer = module.createMultiModelLayer({
      ollama: {
        baseUrl: 'http://localhost:11434',
        defaultModel: 'gemma4:26b',
      },
      preferLocal: true,
      complexityThreshold: 0.6,
    });
  }
  return multiModelLayer;
}

// =============================================
// Page Assist 聊天服务
// =============================================

export interface PageAssistChatOptions {
  /** 模型选择策略 */
  strategy?: 'auto' | 'ollama' | 'cloud';
  /** 是否启用缓存 */
  enableCache?: boolean;
  /** 是否启用流式 */
  stream?: boolean;
  /** 系统提示词 */
  systemPrompt?: string;
}

/**
 * Page Assist 聊天接口
 */
export async function pageAssistChat(
  messages: Array<{ role: string; content: string }>,
  options: PageAssistChatOptions = {}
): Promise<ChatResponse> {
  const layer = await getLayer();

  const request: ChatRequest = {
    messages: messages as any,
    system: options.systemPrompt,
  };

  // 根据策略选择适配器
  if (options.strategy === 'ollama') {
    return layer.chatWith('ollama', request);
  } else if (options.strategy === 'cloud') {
    // 尝试使用云端模型
    const adapters = await layer.listAdapters();
    const cloudAdapter = adapters.find(a => a.provider !== 'ollama' && a.status === 'available');
    if (cloudAdapter) {
      return layer.chatWith(cloudAdapter.name, request);
    }
  }

  // 自动选择 (默认)
  return layer.chat(request);
}

/**
 * Page Assist 流式聊天
 */
export async function* pageAssistChatStream(
  messages: Array<{ role: string; content: string }>,
  options: PageAssistChatOptions = {}
): AsyncGenerator<ChatChunk> {
  const layer = await getLayer();

  const request: ChatRequest = {
    messages: messages as any,
    system: options.systemPrompt,
  };

  yield* layer.chatStream(request);
}

/**
 * 获取可用模型列表
 */
export async function getPageAssistModels(): Promise<ModelInfo[]> {
  const layer = await getLayer();
  return layer.listAdapters();
}

/**
 * 检查模型可用性
 */
export async function checkModelAvailability(): Promise<Record<string, boolean>> {
  const models = await getPageAssistModels();
  return models.reduce((acc, m) => {
    acc[m.name] = m.status === 'available';
    return acc;
  }, {} as Record<string, boolean>);
}

// =============================================
// Page Assist 设置接口
// =============================================

export interface PageAssistModelConfig {
  /** Ollama 配置 */
  ollama?: {
    url: string;
    defaultModel: string;
  };
  /** 云端模型配置 */
  cloud?: {
    provider: 'deepseek' | 'openai' | 'claude' | 'gemini';
    apiKey: string;
    model: string;
  };
}

/**
 * 更新配置
 */
export async function updatePageAssistConfig(config: PageAssistModelConfig): Promise<void> {
  const layer = await getLayer();

  if (config.ollama) {
    // 更新 Ollama 配置
    layer.adapters.get('ollama')?.updateConfig?.({
      baseUrl: config.ollama.url,
      defaultModel: config.ollama.defaultModel,
    });
  }

  if (config.cloud) {
    // 添加或更新云端模型
    // ...
  }
}

// =============================================
// Page Assist RAG 支持
// =============================================

export interface PageAssistRAGOptions {
  /** 检索的上下文 */
  context: string;
  /** 问题 */
  question: string;
  /** RAG 系统提示词 */
  systemPrompt?: string;
}

const DEFAULT_RAG_SYSTEM_PROMPT = `You are a helpful AI assistant. Use the following pieces of context to answer the question at the end. If you don't know the answer, just say you don't know. DO NOT try to make up an answer. If the question is not related to the context, politely respond that you are tuned to only answer questions that are related to the context.

Context:
{context}

Question: {question}

Helpful answer:`;

/**
 * Page Assist RAG 查询
 */
export async function pageAssistRAG(
  options: PageAssistRAGOptions
): Promise<ChatResponse> {
  const layer = await getLayer();

  const systemPrompt = options.systemPrompt || DEFAULT_RAG_SYSTEM_PROMPT;
  const formattedPrompt = systemPrompt
    .replace('{context}', options.context)
    .replace('{question}', options.question);

  return layer.chat({
    messages: [{ role: 'user', content: formattedPrompt }],
  });
}

// =============================================
// 导出类型
// =============================================

export type { ChatRequest, ChatResponse, ChatChunk, ModelInfo } from '@refactored/core';
