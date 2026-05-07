// 对话分析 Hook

import { useState, useCallback, useEffect } from 'react'
import type { ChatMessage as CoreChatMessage } from '@core/index'
import { ChatMessage } from '@/types'
import {
  conversationService,
  ConversationTopic,
  ConversationSummary,
} from '@core/services/conversation-service'
import { aiConfigManager } from '@core/index'
import { logger } from '@core/utils/logger'

interface UseConversationAnalysisOptions {
  autoAnalyze?: boolean
  analyzeInterval?: number
}

interface UseConversationAnalysisReturn {
  topics: ConversationTopic[]
  summary: ConversationSummary | null
  isAnalyzing: boolean
  error: Error | null
  analyzeConversation: () => Promise<void>
  detectTopics: () => Promise<ConversationTopic[]>
  generateSummary: () => Promise<ConversationSummary>
}

/**
 * 对话分析 Hook
 */
export function useConversationAnalysis(
  messages: ChatMessage[],
  options: UseConversationAnalysisOptions = {}
): UseConversationAnalysisReturn {
  const [topics, setTopics] = useState<ConversationTopic[]>([])
  const [summary, setSummary] = useState<ConversationSummary | null>(null)
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [error, setError] = useState<Error | null>(null)

  const { autoAnalyze = true, analyzeInterval = 3000 } = options

  const convertMessages = useCallback((msgs: ChatMessage[]): CoreChatMessage[] => {
    return msgs
      .filter(msg => msg.role !== 'error')
      .map(msg => ({
        ...msg,
        role: msg.role === 'model' ? 'assistant' : msg.role,
        timestamp: msg.timestamp instanceof Date ? msg.timestamp.getTime() : msg.timestamp,
      })) as unknown as CoreChatMessage[]
  }, [])

  /**
   * 分析对话
   */
  const analyzeConversation = useCallback(async () => {
    if (messages.length === 0) return

    setIsAnalyzing(true)
    setError(null)

    try {
      const model = aiConfigManager.getDefaultModel()
      const coreMessages = convertMessages(messages)

      // 并行执行主题检测和摘要生成
      const [detectedTopics, generatedSummary] = await Promise.all([
        conversationService.detectTopics(coreMessages, model),
        conversationService.generateSummary(coreMessages, model),
      ])

      setTopics(detectedTopics)
      setSummary(generatedSummary)
    } catch (err) {
      const error = err instanceof Error ? err : new Error(String(err))
      setError(error)
      logger.error('Failed to analyze conversation:', error)
    } finally {
      setIsAnalyzing(false)
    }
  }, [messages, convertMessages])

  /**
   * 检测对话主题
   */
  const detectTopics = useCallback(async (): Promise<ConversationTopic[]> => {
    if (messages.length === 0) return []

    setIsAnalyzing(true)
    setError(null)

    try {
      const model = aiConfigManager.getDefaultModel()
      const coreMessages = convertMessages(messages)
      const detectedTopics = await conversationService.detectTopics(coreMessages, model)
      setTopics(detectedTopics)
      return detectedTopics
    } catch (err) {
      const error = err instanceof Error ? err : new Error(String(err))
      setError(error)
      logger.error('Failed to detect topics:', error)
      return []
    } finally {
      setIsAnalyzing(false)
    }
  }, [messages, convertMessages])

  /**
   * 生成对话摘要
   */
  const generateSummary = useCallback(async (): Promise<ConversationSummary> => {
    if (messages.length === 0) {
      const emptySummary: ConversationSummary = {
        id: `summary_${Date.now()}`,
        content: '无对话内容',
        topics: [],
        keyPoints: [],
        generatedAt: Date.now(),
      }
      setSummary(emptySummary)
      return emptySummary
    }

    setIsAnalyzing(true)
    setError(null)

    try {
      const model = aiConfigManager.getDefaultModel()
      const coreMessages = convertMessages(messages)
      const generatedSummary = await conversationService.generateSummary(coreMessages, model)
      setSummary(generatedSummary)
      return generatedSummary
    } catch (err) {
      const error = err instanceof Error ? err : new Error(String(err))
      setError(error)
      logger.error('Failed to generate summary:', error)
      const errorSummary: ConversationSummary = {
        id: `summary_${Date.now()}`,
        content: '生成摘要时出错',
        topics: [],
        keyPoints: [],
        generatedAt: Date.now(),
      }
      setSummary(errorSummary)
      return errorSummary
    } finally {
      setIsAnalyzing(false)
    }
  }, [messages])

  // 自动分析对话
  useEffect(() => {
    if (autoAnalyze && messages.length > 0) {
      const timeoutId = setTimeout(() => {
        analyzeConversation()
      }, analyzeInterval)

      return () => clearTimeout(timeoutId)
    }
  }, [messages, autoAnalyze, analyzeInterval, analyzeConversation])

  return {
    topics,
    summary,
    isAnalyzing,
    error,
    analyzeConversation,
    detectTopics,
    generateSummary,
  }
}

export default useConversationAnalysis
