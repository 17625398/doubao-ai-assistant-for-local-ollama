// Ollama 聊天 Hook

import { useState, useCallback, useEffect, useRef } from 'react';
import {
  ChatMessage,
  OllamaChatMessage,
  aiConfigManager,
  ollamaClient,
  OpenAICompatibleChatMessage,
  OpenAICompatibleClient,
  logger,
  eventBus,
} from '@core/index';

interface UseOllamaChatOptions {
  onError?: (error: Error) => void;
}

interface UseOllamaChatReturn {
  messages: ChatMessage[];
  isLoading: boolean;
  error: Error | null;
  currentModel: string;
  sendMessage: (content: string, extra?: { images?: string[] }) => Promise<void>;
  clearMessages: () => void;
  regenerateMessage: (messageId: string) => Promise<void>;
  stopGeneration: () => void;
}

/**
 * Ollama 聊天 Hook
 */
export function useOllamaChat(options: UseOllamaChatOptions = {}): UseOllamaChatReturn {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [currentModel, setCurrentModel] = useState<string>('');
  const abortControllerRef = useRef<AbortController | null>(null);

  // 初始化时加载当前模型
  useEffect(() => {
    const model = aiConfigManager.getDefaultModel();
    setCurrentModel(model);

    // 监听配置变化
    const unsubscribe = eventBus.on('ai-config:changed', () => {
      const newModel = aiConfigManager.getDefaultModel();
      setCurrentModel(newModel);
    });

    return () => {
      unsubscribe();
    };
  }, []);

  /**
   * 发送消息
   */
  const sendMessage = useCallback(async (content: string, extra?: { images?: string[] }) => {
    if (!content.trim() || isLoading) return;

    setIsLoading(true);
    setError(null);

    // 创建用户消息
    const userMessage: ChatMessage = {
      id: generateMessageId(),
      role: 'user',
      content: content.trim(),
      timestamp: Date.now(),
    };

    // 添加用户消息到列表
    setMessages((prev) => [...prev, userMessage]);

    // 创建助手消息占位
    const assistantMessageId = generateMessageId();
    const assistantMessage: ChatMessage = {
      id: assistantMessageId,
      role: 'assistant',
      content: '',
      timestamp: Date.now(),
    };

    setMessages((prev) => [...prev, assistantMessage]);

    const controller = new AbortController();
    try {
      const config = aiConfigManager.getConfig();

      // 创建 AbortController 用于取消请求
      abortControllerRef.current?.abort();
      abortControllerRef.current = controller;

      const history = messages
        .map((msg) => ({ role: msg.role, content: msg.content } as OllamaChatMessage))
        .filter((msg) => msg.role === 'user' || msg.role === 'assistant' || msg.role === 'system');

      history.push({
        role: 'user',
        content: content.trim(),
        images: extra?.images && extra.images.length > 0 ? extra.images : undefined,
      } as OllamaChatMessage);

      if (config.provider === 'ollama' && config.ollama) {
        if (config.ollama.streamEnabled) {
          const stream = ollamaClient.chatStream(
            {
              model: config.ollama.defaultModel,
              messages: history as OllamaChatMessage[],
            },
            controller.signal
          );

          let fullContent = '';
          for await (const chunk of stream) {
            if (abortControllerRef.current !== controller || controller.signal.aborted) break;

            if (chunk.message?.content) {
              fullContent += chunk.message.content;
              setMessages((prev) =>
                prev.map((msg) => (msg.id === assistantMessageId ? { ...msg, content: fullContent } : msg))
              );
            }
          }
          return;
        }

        const response = await ollamaClient.chat({
          model: config.ollama.defaultModel,
          messages: history as OllamaChatMessage[],
        });

        setMessages((prev) =>
          prev.map((msg) => (msg.id === assistantMessageId ? { ...msg, content: response.message.content } : msg))
        );
        return;
      }

      if (config.provider === 'openai' && config.openai) {
        const client = new OpenAICompatibleClient({
          baseUrl: config.openai.baseUrl || 'https://api.openai.com/v1',
          apiKey: config.openai.apiKey,
          defaultModel: config.openai.defaultModel,
          timeout: config.openai.timeout ?? 30000,
          streamEnabled: config.openai.streamEnabled ?? true,
          headers: config.openai.headers,
        });

        if (client.getConfig().streamEnabled) {
          let fullContent = '';
          for await (const chunk of client.chatStream(
            {
              model: config.openai.defaultModel,
              messages: history as OpenAICompatibleChatMessage[],
            },
            controller.signal
          )) {
            if (abortControllerRef.current !== controller || controller.signal.aborted) break;
            if (chunk.delta) {
              fullContent += chunk.delta;
              setMessages((prev) =>
                prev.map((msg) => (msg.id === assistantMessageId ? { ...msg, content: fullContent } : msg))
              );
            }
          }
          return;
        }

        const response = await client.chat({
          model: config.openai.defaultModel,
          messages: history as OpenAICompatibleChatMessage[],
        });
        setMessages((prev) =>
          prev.map((msg) => (msg.id === assistantMessageId ? { ...msg, content: response.content } : msg))
        );
        return;
      }

      if (config.provider === 'custom' && config.custom) {
        const client = new OpenAICompatibleClient({
          baseUrl: config.custom.baseUrl,
          apiKey: config.custom.apiKey,
          defaultModel: config.custom.defaultModel,
          timeout: config.custom.timeout ?? 30000,
          streamEnabled: config.custom.streamEnabled ?? true,
          headers: config.custom.headers,
        });

        if (client.getConfig().streamEnabled) {
          let fullContent = '';
          for await (const chunk of client.chatStream(
            {
              model: config.custom.defaultModel,
              messages: history as OpenAICompatibleChatMessage[],
            },
            controller.signal
          )) {
            if (abortControllerRef.current !== controller || controller.signal.aborted) break;
            if (chunk.delta) {
              fullContent += chunk.delta;
              setMessages((prev) =>
                prev.map((msg) => (msg.id === assistantMessageId ? { ...msg, content: fullContent } : msg))
              );
            }
          }
          return;
        }

        const response = await client.chat({
          model: config.custom.defaultModel,
          messages: history as OpenAICompatibleChatMessage[],
        });
        setMessages((prev) =>
          prev.map((msg) => (msg.id === assistantMessageId ? { ...msg, content: response.content } : msg))
        );
        return;
      }

      throw new Error('AI 服务未配置');
    } catch (err) {
      if (isAbortError(err) || controller.signal.aborted) return;
      const error = err instanceof Error ? err : new Error(String(err));
      setError(error);
      logger.error('Failed to send message:', error);
      options.onError?.(error);

      // 更新助手消息显示错误
      setMessages((prev) =>
        prev.map((msg) =>
          msg.id === assistantMessageId
            ? { ...msg, content: '抱歉，生成回复时出现错误。请检查 AI 服务配置。' }
            : msg
        )
      );
    } finally {
      setIsLoading(false);
      if (abortControllerRef.current === controller) abortControllerRef.current = null;
    }
  }, [messages, isLoading, options]);

  /**
   * 重新生成消息
   */
  const regenerateMessage = useCallback(async (messageId: string) => {
    // 找到要重新生成的消息
    const messageIndex = messages.findIndex((msg) => msg.id === messageId);
    if (messageIndex === -1) return;

    // 找到对应的用户消息（前一条）
    let userMessageIndex = messageIndex - 1;
    while (userMessageIndex >= 0 && messages[userMessageIndex].role !== 'user') {
      userMessageIndex--;
    }

    if (userMessageIndex < 0) return;

    const userMessage = messages[userMessageIndex];

    // 删除当前助手消息及之后的所有消息
    setMessages((prev) => prev.slice(0, messageIndex));

    // 重新发送
    await sendMessage(userMessage.content);
  }, [messages, sendMessage]);

  /**
   * 停止生成
   */
  const stopGeneration = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      setIsLoading(false);
      logger.info('Generation stopped by user');
    }
  }, []);

  /**
   * 清空消息
   */
  const clearMessages = useCallback(() => {
    setMessages([]);
    setError(null);
    logger.info('Messages cleared');
  }, []);

  return {
    messages,
    isLoading,
    error,
    currentModel,
    sendMessage,
    clearMessages,
    regenerateMessage,
    stopGeneration,
  };
}

/**
   * 生成唯一消息 ID
   */
function generateMessageId(): string {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

function isAbortError(error: unknown): boolean {
  if (!error || typeof error !== 'object') return false;
  const anyError = error as { name?: unknown; message?: unknown };
  if (anyError.name === 'AbortError') return true;
  const message = typeof anyError.message === 'string' ? anyError.message : '';
  return message.includes('AbortError') || (message.includes('aborted') && message.includes('signal'));
}

export default useOllamaChat;
