// Ollama 聊天 Hook

import { useState, useCallback, useEffect, useRef } from 'react'
import {
  ChatMessage,
  OllamaChatMessage,
  aiConfigManager,
  ollamaClient,
  OpenAICompatibleChatMessage,
  OpenAICompatibleClient,
  logger,
  eventBus,
  featureCapabilityService,
  linkMindService,
} from '@core/index'
import { parseFollowUpResponse } from '@/utils/followup-parser'

interface UseOllamaChatOptions {
  onError?: (error: Error) => void
}

// 追问问题接口
export interface FollowUpQuestion {
  id: string
  content: string
  category: 'detail' | 'related' | 'solution' | 'example' | 'clarification'
  priority: number // 1-5, 1最高
}

interface UseOllamaChatReturn {
  messages: ChatMessage[]
  isLoading: boolean
  error: Error | null
  currentModel: string
  followUpQuestions: FollowUpQuestion[]
  sendMessage: (content: string, extra?: { images?: string[] }) => Promise<void>
  clearMessages: () => void
  regenerateMessage: (messageId: string) => Promise<void>
  stopGeneration: () => void
}

/**
 * Ollama 聊天 Hook
 */
export function useOllamaChat(options: UseOllamaChatOptions = {}): UseOllamaChatReturn {
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<Error | null>(null)
  const [currentModel, setCurrentModel] = useState<string>('')
  const [followUpQuestions, setFollowUpQuestions] = useState<FollowUpQuestion[]>([])
  const abortControllerRef = useRef<AbortController | null>(null)

  const emitFollowUpTelemetry = useCallback(
    (
      status: 'success' | 'timeout' | 'parse-fallback' | 'parse-empty' | 'no-response' | 'error',
      details?: Record<string, unknown>
    ) => {
      eventBus.emit('followup:telemetry', {
        status,
        provider: aiConfigManager.getConfig().provider,
        timestamp: Date.now(),
        ...details,
      })
    },
    []
  )

  // 初始化时加载当前模型
  useEffect(() => {
    const model = aiConfigManager.getDefaultModel()
    setCurrentModel(model)

    void featureCapabilityService.ensureLoaded().catch(err => {
      logger.warn('Failed to load feature capabilities in chat hook:', err)
    })

    // 监听配置变化
    const unsubscribe = eventBus.on('ai-config:changed', () => {
      const newModel = aiConfigManager.getDefaultModel()
      setCurrentModel(newModel)
    })

    return () => {
      unsubscribe()
    }
  }, [])

  /**
   * 发送消息
   */
  const sendMessage = useCallback(
    async (content: string, extra?: { images?: string[] }) => {
      if (!content.trim() || isLoading) return

      setIsLoading(true)
      setError(null)

      // 创建用户消息
      const userMessage: ChatMessage = {
        id: generateMessageId(),
        role: 'user',
        content: content.trim(),
        timestamp: Date.now(),
      }

      // 添加用户消息到列表
      setMessages(prev => [...prev, userMessage])

      // 创建助手消息占位
      const assistantMessageId = generateMessageId()
      const assistantMessage: ChatMessage = {
        id: assistantMessageId,
        role: 'assistant',
        content: '',
        timestamp: Date.now(),
      }

      setMessages(prev => [...prev, assistantMessage])

      const controller = new AbortController()
      try {
        const config = aiConfigManager.getConfig()

        // 创建 AbortController 用于取消请求
        abortControllerRef.current?.abort()
        abortControllerRef.current = controller

        // 构建历史消息，只包含最近的消息以保持上下文连贯性
        const history = messages
          .map(msg => {
            // 只复制必要的字段，避免传递images字段
            const cleanMsg: OllamaChatMessage = {
              role: msg.role,
              content: msg.content,
            }
            return cleanMsg
          })
          .filter(msg => msg.role === 'user' || msg.role === 'assistant' || msg.role === 'system')

        // 限制历史消息数量，避免上下文过长
        const maxHistoryLength = 10 // 只保留最近的10条消息
        const trimmedHistory = history.slice(-maxHistoryLength)

        // 构建用户消息，只有包含图片时才添加images字段
        const userMessage: OllamaChatMessage = {
          role: 'user',
          content: content.trim(),
        }
        if (extra?.images && extra.images.length > 0) {
          userMessage.images = extra.images
        }
        trimmedHistory.push(userMessage)

        if (config.provider === 'ollama' && config.ollama) {
          if (config.ollama.streamEnabled) {
            const stream = ollamaClient.chatStream(
              {
                model: config.ollama.defaultModel,
                messages: trimmedHistory as OllamaChatMessage[],
              },
              controller.signal
            )

            let fullContent = ''
            for await (const chunk of stream) {
              if (abortControllerRef.current !== controller || controller.signal.aborted) break

              if (chunk.message?.content) {
                fullContent += chunk.message.content
                setMessages(prev =>
                  prev.map(msg =>
                    msg.id === assistantMessageId ? { ...msg, content: fullContent } : msg
                  )
                )
              }
            }

            // 生成追加问题
            logger.info('Before generating follow-up questions')
            // 构建完整的对话历史用于生成追问问题
            const updatedMessages = [
              ...messages,
              userMessage,
              { role: 'assistant', content: fullContent },
            ]
            const conversation = updatedMessages
              .map(msg => `${msg.role === 'user' ? '用户' : '助手'}: ${msg.content}`)
              .join('\n')
            logger.info('Full conversation for follow-up:', conversation)
            // 不使用await，确保即使生成追加问题失败，sendMessage函数也能正常完成
            generateFollowUpQuestions(conversation).catch(err => {
              logger.error('Error generating follow-up questions:', err)
            })
            logger.info('After generating follow-up questions')
            return
          }

          const response = await ollamaClient.chat({
            model: config.ollama.defaultModel,
            messages: trimmedHistory as OllamaChatMessage[],
          })

          setMessages(prev =>
            prev.map(msg =>
              msg.id === assistantMessageId ? { ...msg, content: response.message.content } : msg
            )
          )

          // 生成追加问题
          logger.info('Before generating follow-up questions (non-streaming)')
          // 构建完整的对话历史用于生成追问问题
          const updatedMessages = [
            ...messages,
            userMessage,
            { role: 'assistant', content: response.message.content },
          ]
          const conversation = updatedMessages
            .map(msg => `${msg.role === 'user' ? '用户' : '助手'}: ${msg.content}`)
            .join('\n')
          logger.info('Full conversation for follow-up (non-streaming):', conversation)
          // 不使用await，确保即使生成追加问题失败，sendMessage函数也能正常完成
          generateFollowUpQuestions(conversation).catch(err => {
            logger.error('Error generating follow-up questions (non-streaming):', err)
          })
          logger.info('After generating follow-up questions (non-streaming)')
          return
        }

        if (config.provider === 'openai' && config.openai) {
          const client = new OpenAICompatibleClient({
            baseUrl: config.openai.baseUrl || 'https://api.openai.com/v1',
            apiKey: config.openai.apiKey,
            defaultModel: config.openai.defaultModel,
            timeout: config.openai.timeout ?? 30000,
            streamEnabled: config.openai.streamEnabled ?? true,
            headers: config.openai.headers,
          })

          if (client.getConfig().streamEnabled) {
            let fullContent = ''
            for await (const chunk of client.chatStream(
              {
                model: config.openai.defaultModel,
                messages: trimmedHistory as OpenAICompatibleChatMessage[],
              },
              controller.signal
            )) {
              if (abortControllerRef.current !== controller || controller.signal.aborted) break
              if (chunk.delta) {
                fullContent += chunk.delta
                setMessages(prev =>
                  prev.map(msg =>
                    msg.id === assistantMessageId ? { ...msg, content: fullContent } : msg
                  )
                )
              }
            }
            return
          }

          const response = await client.chat({
            model: config.openai.defaultModel,
            messages: trimmedHistory as OpenAICompatibleChatMessage[],
          })
          setMessages(prev =>
            prev.map(msg =>
              msg.id === assistantMessageId ? { ...msg, content: response.content } : msg
            )
          )
          return
        }

        if (config.provider === 'custom' && config.custom) {
          const client = new OpenAICompatibleClient({
            baseUrl: config.custom.baseUrl,
            apiKey: config.custom.apiKey,
            defaultModel: config.custom.defaultModel,
            timeout: config.custom.timeout ?? 30000,
            streamEnabled: config.custom.streamEnabled ?? true,
            headers: config.custom.headers,
          })

          if (client.getConfig().streamEnabled) {
            let fullContent = ''
            for await (const chunk of client.chatStream(
              {
                model: config.custom.defaultModel,
                messages: trimmedHistory as OpenAICompatibleChatMessage[],
              },
              controller.signal
            )) {
              if (abortControllerRef.current !== controller || controller.signal.aborted) break
              if (chunk.delta) {
                fullContent += chunk.delta
                setMessages(prev =>
                  prev.map(msg =>
                    msg.id === assistantMessageId ? { ...msg, content: fullContent } : msg
                  )
                )
              }
            }
            return
          }

          const response = await client.chat({
            model: config.custom.defaultModel,
            messages: trimmedHistory as OpenAICompatibleChatMessage[],
          })
          setMessages(prev =>
            prev.map(msg =>
              msg.id === assistantMessageId ? { ...msg, content: response.content } : msg
            )
          )
          return
        }

        if (config.provider === 'linkmind' && config.linkmind) {
          if (!featureCapabilityService.isEnabled('enableLinkMindChat')) {
            throw new Error('LinkMind chat capability is disabled by feature flag')
          }
          linkMindService.updateConfig({
            baseUrl: config.linkmind.baseUrl,
            apiKey: config.linkmind.apiKey,
            timeout: config.linkmind.timeout ?? 60000,
            transportMode: config.linkmind.transportMode ?? 'proxy',
            gatewayPath: config.linkmind.gatewayPath ?? '/api/linkmind',
          })

          const linkMindMessages = trimmedHistory.map(msg => ({
            role: msg.role,
            content: msg.content,
          })) as Array<{ role: 'system' | 'user' | 'assistant'; content: string }>

          if (config.linkmind.transportMode !== 'direct') {
            // 非直连模式默认启用流式，降低长文本响应等待感知
            let fullContent = ''
            await linkMindService.chatStream(
              {
                model: config.linkmind.defaultModel || 'qwen-plus',
                messages: linkMindMessages,
                stream: true,
              },
              chunk => {
                if (abortControllerRef.current !== controller || controller.signal.aborted) return
                fullContent += chunk
                setMessages(prev =>
                  prev.map(msg =>
                    msg.id === assistantMessageId ? { ...msg, content: fullContent } : msg
                  )
                )
              }
            )
            return
          }

          const response = await linkMindService.chat({
            model: config.linkmind.defaultModel || 'qwen-plus',
            messages: linkMindMessages,
            stream: false,
          })
          const text = response.choices?.[0]?.message?.content || ''
          setMessages(prev =>
            prev.map(msg => (msg.id === assistantMessageId ? { ...msg, content: text } : msg))
          )
          return
        }

        throw new Error('AI 服务未配置')
      } catch (err) {
        if (isAbortError(err) || controller.signal.aborted) return
        const error = err instanceof Error ? err : new Error(String(err))
        setError(error)
        logger.error('Failed to send message:', error)
        options.onError?.(error)

        // 更新助手消息显示错误
        setMessages(prev =>
          prev.map(msg =>
            msg.id === assistantMessageId
              ? { ...msg, content: '抱歉，生成回复时出现错误。请检查 AI 服务配置。' }
              : msg
          )
        )
      } finally {
        setIsLoading(false)
        if (abortControllerRef.current === controller) abortControllerRef.current = null
      }
    },
    [messages, isLoading, options]
  )

  /**
   * 重新生成消息
   */
  const regenerateMessage = useCallback(
    async (messageId: string) => {
      // 找到要重新生成的消息
      const messageIndex = messages.findIndex(msg => msg.id === messageId)
      if (messageIndex === -1) return

      // 找到对应的用户消息（前一条）
      let userMessageIndex = messageIndex - 1
      while (userMessageIndex >= 0 && messages[userMessageIndex].role !== 'user') {
        userMessageIndex--
      }

      if (userMessageIndex < 0) return

      const userMessage = messages[userMessageIndex]

      // 删除当前助手消息及之后的所有消息
      setMessages(prev => prev.slice(0, messageIndex))

      // 重新发送
      await sendMessage(userMessage.content)
    },
    [messages, sendMessage]
  )

  /**
   * 停止生成
   */
  const stopGeneration = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort()
      setIsLoading(false)
      logger.info('Generation stopped by user')
    }
  }, [])

  /**
   * 生成追加问题
   */
  const generateFollowUpQuestions = useCallback(async (content: string) => {
    if (!featureCapabilityService.isEnabled('enableFollowUpQuestions')) {
      setFollowUpQuestions([])
      return
    }
    try {
      logger.info('Generating follow-up questions...')
      const config = aiConfigManager.getConfig()
      logger.info('AI config:', config.provider)

      // 立即设置默认的追问问题，确保用户体验
      const defaultQuestions: FollowUpQuestion[] = [
        {
          id: generateMessageId(),
          content: '能详细解释一下吗？',
          category: 'detail',
          priority: 2
        },
        {
          id: generateMessageId(),
          content: '还有其他相关的信息吗？',
          category: 'related',
          priority: 3
        },
        {
          id: generateMessageId(),
          content: '这个问题有什么解决方案？',
          category: 'solution',
          priority: 1
        }
      ]
      setFollowUpQuestions(defaultQuestions)

      if (config.provider === 'ollama' && config.ollama) {
        const prompt = `基于以下对话内容，生成3个相关的追加问题，每个问题需要包含分类和优先级：\n\n${content}\n\n分类可以是：detail（详细解释）、related（相关信息）、solution（解决方案）、example（示例）、clarification（澄清）\n优先级范围：1-5，1最高\n\n请以JSON格式返回，例如：{"questions": [{"content": "问题1", "category": "detail", "priority": 2}, {"content": "问题2", "category": "related", "priority": 3}, {"content": "问题3", "category": "solution", "priority": 1}]}`
        logger.info('Follow-up prompt length:', prompt.length)

        try {
          // 创建一个AbortController，设置合理的超时时间
          const controller = new AbortController()
          const timeoutId = setTimeout(() => controller.abort(), 10000) // 10秒超时

          try {
            const response = await ollamaClient.generate(
              prompt,
              {
                model: config.ollama.defaultModel,
                stream: false,
              },
              controller.signal
            )

            clearTimeout(timeoutId)
            logger.info('Follow-up response received')

            if (!response.response) {
              logger.warn('No response content received')
              emitFollowUpTelemetry('no-response')
              return
            }

            try {
              const parsedResult = parseFollowUpResponse(response.response)
              const questions: FollowUpQuestion[] = parsedResult.questions.map(item => ({
                id: generateMessageId(),
                content: item.content,
                category: item.category,
                priority: item.priority,
              }))

              if (questions.length > 0) {
                logger.info('Setting follow-up questions:', questions)
                setFollowUpQuestions(questions)
                if (parsedResult.strategy === 'text-fallback') {
                  emitFollowUpTelemetry('parse-fallback', {
                    strategy: parsedResult.strategy,
                    questionCount: questions.length,
                  })
                } else {
                  emitFollowUpTelemetry('success', {
                    strategy: parsedResult.strategy,
                    questionCount: questions.length,
                  })
                }
              } else {
                emitFollowUpTelemetry('parse-empty')
              }
            } catch (e) {
              logger.warn('Failed to parse follow-up questions:', e)
              logger.warn('Raw response:', response.response)
              emitFollowUpTelemetry('error', {
                stage: 'parse',
                message: e instanceof Error ? e.message : String(e),
              })
            }
          } catch (e) {
            // 处理超时错误，不记录为错误，保持默认的追问问题
            if (e instanceof Error && e.name === 'AbortError') {
              logger.info('Follow-up question generation timed out, using default questions')
              emitFollowUpTelemetry('timeout')
            } else {
              logger.error('Error generating follow-up questions:', e)
              emitFollowUpTelemetry('error', {
                stage: 'generate',
                message: e instanceof Error ? e.message : String(e),
              })
            }
            // 保持默认的追问问题
          } finally {
            clearTimeout(timeoutId)
          }
        } catch (e) {
          logger.error('Error generating follow-up questions:', e)
          emitFollowUpTelemetry('error', {
            stage: 'request',
            message: e instanceof Error ? e.message : String(e),
          })
          // 保持默认的追问问题
        }
      } else {
        logger.warn('No ollama config found:', config)
        emitFollowUpTelemetry('error', { stage: 'provider', provider: config.provider })
        // 保持默认的追问问题
      }
    } catch (e) {
      logger.error('Failed to generate follow-up questions:', e)
      emitFollowUpTelemetry('error', {
        stage: 'unexpected',
        message: e instanceof Error ? e.message : String(e),
      })
      // 保持默认的追问问题
    }
  }, [emitFollowUpTelemetry])

  /**
   * 清空消息
   */
  const clearMessages = useCallback(() => {
    setMessages([])
    setError(null)
    setFollowUpQuestions([])
    logger.info('Messages cleared')
  }, [])

  return {
    messages,
    isLoading,
    error,
    currentModel,
    followUpQuestions,
    sendMessage,
    clearMessages,
    regenerateMessage,
    stopGeneration,
  }
}

/**
 * 生成唯一消息 ID
 */
function generateMessageId(): string {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
}

function isAbortError(error: unknown): boolean {
  if (!error || typeof error !== 'object') return false
  const anyError = error as { name?: unknown; message?: unknown }
  if (anyError.name === 'AbortError') return true
  const message = typeof anyError.message === 'string' ? anyError.message : ''
  return (
    message.includes('AbortError') || (message.includes('aborted') && message.includes('signal'))
  )
}

export default useOllamaChat
