/**
 * Gemini Service
 * 集成 Google Gemini API 的多功能 AI 服务
 * 基于 All-Model-Chat 项目架构
 */

import { logger } from '../utils/logger'

// Gemini API 配置
export interface GeminiConfig {
  apiKey: string
  baseUrl?: string
  model?: string
}

// 消息类型
export interface GeminiMessage {
  role: 'user' | 'model' | 'system'
  content: string
  parts?: GeminiPart[]
}

// 多模态内容部分
export type GeminiPart =
  | { text: string }
  | { inlineData: { mimeType: string; data: string } }
  | { fileData: { mimeType: string; fileUri: string } }

// 聊天会话
export interface GeminiChatSession {
  sessionId: string
  messages: GeminiMessage[]
  model: string
  createdAt: number
  updatedAt: number
}

// 生成配置
export interface GenerationConfig {
  temperature?: number
  topP?: number
  topK?: number
  maxOutputTokens?: number
  candidateCount?: number
  stopSequences?: string[]
}

// 安全设置
export interface SafetySetting {
  category: string
  threshold: string
}

// 工具配置
export interface ToolConfig {
  googleSearch?: boolean
  codeExecution?: boolean
}

// 搜索结果
export interface SearchResult {
  title: string
  link: string
  snippet: string
  displayUrl: string
}

// 流式响应回调
export interface StreamCallbacks {
  onData?: (chunk: string) => void
  onError?: (error: Error) => void
  onComplete?: () => void
}

/**
 * Gemini Service 类
 */
export class GeminiService {
  private config: GeminiConfig
  private chatSessions: Map<string, GeminiChatSession> = new Map()

  constructor(config: GeminiConfig) {
    this.config = {
      model: 'gemini-2.0-flash',
      baseUrl: 'https://generativelanguage.googleapis.com',
      ...config,
    }
    logger.info('[GeminiService] Initialized with model:', this.config.model)
  }

  /**
   * 发送消息并获取流式响应
   */
  async sendMessageStream(
    messages: GeminiMessage[],
    callbacks: StreamCallbacks,
    config?: GenerationConfig
  ): Promise<void> {
    try {
      const url = `${this.config.baseUrl}/v1beta/models/${this.config.model}:streamGenerateContent?key=${this.config.apiKey}`

      const requestBody = {
        contents: this.formatMessages(messages),
        generationConfig: {
          temperature: config?.temperature ?? 0.7,
          topP: config?.topP ?? 0.95,
          topK: config?.topK ?? 40,
          maxOutputTokens: config?.maxOutputTokens ?? 8192,
          ...config,
        },
      }

      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      })

      if (!response.ok) {
        throw new Error(`Gemini API error: ${response.status} ${response.statusText}`)
      }

      const reader = response.body?.getReader()
      if (!reader) {
        throw new Error('No response body')
      }

      const decoder = new TextDecoder()
      let buffer = ''

      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        buffer += decoder.decode(value, { stream: true })
        const lines = buffer.split('\n')
        buffer = lines.pop() || ''

        for (const line of lines) {
          if (line.trim().startsWith('data:')) {
            const data = line.trim().substring(5).trim()
            if (data === '[DONE]') {
              callbacks.onComplete?.()
              return
            }

            try {
              const parsed = JSON.parse(data)
              const text = this.extractTextFromResponse(parsed)
              if (text) {
                callbacks.onData?.(text)
              }
            } catch (e) {
              // 忽略解析错误
            }
          }
        }
      }

      callbacks.onComplete?.()
    } catch (error) {
      logger.error('[GeminiService] Stream error:', error)
      callbacks.onError?.(error instanceof Error ? error : new Error(String(error)))
    }
  }

  /**
   * 发送消息并获取完整响应
   */
  async sendMessage(messages: GeminiMessage[], config?: GenerationConfig): Promise<string> {
    return new Promise((resolve, reject) => {
      let fullResponse = ''

      this.sendMessageStream(
        messages,
        {
          onData: chunk => {
            fullResponse += chunk
          },
          onError: error => {
            reject(error)
          },
          onComplete: () => {
            resolve(fullResponse)
          },
        },
        config
      )
    })
  }

  /**
   * 创建聊天会话
   */
  createSession(model?: string): GeminiChatSession {
    const sessionId = `gemini-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
    const session: GeminiChatSession = {
      sessionId,
      messages: [],
      model: model || this.config.model || 'gemini-2.0-flash',
      createdAt: Date.now(),
      updatedAt: Date.now(),
    }
    this.chatSessions.set(sessionId, session)
    logger.info('[GeminiService] Created session:', sessionId)
    return session
  }

  /**
   * 获取聊天会话
   */
  getSession(sessionId: string): GeminiChatSession | undefined {
    return this.chatSessions.get(sessionId)
  }

  /**
   * 更新聊天会话
   */
  updateSession(sessionId: string, messages: GeminiMessage[]): void {
    const session = this.chatSessions.get(sessionId)
    if (session) {
      session.messages = messages
      session.updatedAt = Date.now()
    }
  }

  /**
   * 删除聊天会话
   */
  deleteSession(sessionId: string): boolean {
    return this.chatSessions.delete(sessionId)
  }

  /**
   * 获取所有会话
   */
  getAllSessions(): GeminiChatSession[] {
    return Array.from(this.chatSessions.values()).sort((a, b) => b.updatedAt - a.updatedAt)
  }

  /**
   * 生成图片
   */
  async generateImage(
    prompt: string,
    aspectRatio: string = '1:1',
    imageSize?: string
  ): Promise<string[]> {
    try {
      const url = `${this.config.baseUrl}/v1beta/models/imagen-3.0-generate-002:predict?key=${this.config.apiKey}`

      const requestBody = {
        instances: [{ prompt }],
        parameters: {
          aspectRatio,
          ...(imageSize && { imageSize }),
        },
      }

      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      })

      if (!response.ok) {
        throw new Error(`Image generation error: ${response.status}`)
      }

      const data = await response.json()
      return data.predictions?.map((p: any) => p.bytesBase64Encoded) || []
    } catch (error) {
      logger.error('[GeminiService] Image generation error:', error)
      throw error
    }
  }

  /**
   * 语音合成
   */
  async generateSpeech(text: string, voice: string = 'en-US-Standard-A'): Promise<string> {
    try {
      const url = `${this.config.baseUrl}/v1beta/models/gemini-2.0-flash:generateContent?key=${this.config.apiKey}`

      const requestBody = {
        contents: [
          {
            role: 'user',
            parts: [
              {
                text: `Convert this text to speech: ${text}`,
              },
            ],
          },
        ],
        generationConfig: {
          responseModalities: ['AUDIO'],
          speechConfig: {
            voiceConfig: {
              prebuiltVoiceConfig: {
                voiceName: voice,
              },
            },
          },
        },
      }

      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      })

      if (!response.ok) {
        throw new Error(`Speech generation error: ${response.status}`)
      }

      const data = await response.json()
      return data.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data || ''
    } catch (error) {
      logger.error('[GeminiService] Speech generation error:', error)
      throw error
    }
  }

  /**
   * 语音转录
   */
  async transcribeAudio(audioBase64: string, mimeType: string = 'audio/mp3'): Promise<string> {
    try {
      const url = `${this.config.baseUrl}/v1beta/models/gemini-2.0-flash:generateContent?key=${this.config.apiKey}`

      const requestBody = {
        contents: [
          {
            role: 'user',
            parts: [
              {
                inlineData: {
                  mimeType,
                  data: audioBase64,
                },
              },
              {
                text: 'Transcribe this audio to text.',
              },
            ],
          },
        ],
      }

      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      })

      if (!response.ok) {
        throw new Error(`Transcription error: ${response.status}`)
      }

      const data = await response.json()
      return data.candidates?.[0]?.content?.parts?.[0]?.text || ''
    } catch (error) {
      logger.error('[GeminiService] Transcription error:', error)
      throw error
    }
  }

  /**
   * 计算 Token 数量
   */
  async countTokens(messages: GeminiMessage[]): Promise<number> {
    try {
      const url = `${this.config.baseUrl}/v1beta/models/${this.config.model}:countTokens?key=${this.config.apiKey}`

      const requestBody = {
        contents: this.formatMessages(messages),
      }

      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      })

      if (!response.ok) {
        throw new Error(`Token count error: ${response.status}`)
      }

      const data = await response.json()
      return data.totalTokens || 0
    } catch (error) {
      logger.error('[GeminiService] Token count error:', error)
      return 0
    }
  }

  /**
   * 使用 Google Search 工具进行搜索增强的对话
   */
  async chatWithSearch(
    messages: GeminiMessage[],
    callbacks: StreamCallbacks,
    config?: GenerationConfig
  ): Promise<void> {
    try {
      const url = `${this.config.baseUrl}/v1beta/models/${this.config.model}:streamGenerateContent?key=${this.config.apiKey}`

      const requestBody = {
        contents: this.formatMessages(messages),
        generationConfig: {
          temperature: config?.temperature ?? 0.7,
          topP: config?.topP ?? 0.95,
          topK: config?.topK ?? 40,
          maxOutputTokens: config?.maxOutputTokens ?? 8192,
          ...config,
        },
        tools: [
          {
            googleSearch: {},
          },
        ],
      }

      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      })

      if (!response.ok) {
        throw new Error(`Gemini API error: ${response.status} ${response.statusText}`)
      }

      const reader = response.body?.getReader()
      if (!reader) {
        throw new Error('No response body')
      }

      const decoder = new TextDecoder()
      let buffer = ''

      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        buffer += decoder.decode(value, { stream: true })
        const lines = buffer.split('\n')
        buffer = lines.pop() || ''

        for (const line of lines) {
          if (line.trim().startsWith('data:')) {
            const data = line.trim().substring(5).trim()
            if (data === '[DONE]') {
              callbacks.onComplete?.()
              return
            }

            try {
              const parsed = JSON.parse(data)
              const text = this.extractTextFromResponse(parsed)
              if (text) {
                callbacks.onData?.(text)
              }
            } catch (e) {
              // 忽略解析错误
            }
          }
        }
      }

      callbacks.onComplete?.()
    } catch (error) {
      logger.error('[GeminiService] Search chat error:', error)
      callbacks.onError?.(error instanceof Error ? error : new Error(String(error)))
    }
  }

  /**
   * 格式化消息为 Gemini API 格式
   */
  private formatMessages(messages: GeminiMessage[]): any[] {
    return messages.map(msg => ({
      role: msg.role === 'user' ? 'user' : 'model',
      parts: msg.parts || [{ text: msg.content }],
    }))
  }

  /**
   * 从响应中提取文本
   */
  private extractTextFromResponse(response: any): string {
    if (!response.candidates || response.candidates.length === 0) {
      return ''
    }

    const candidate = response.candidates[0]
    if (!candidate.content || !candidate.content.parts) {
      return ''
    }

    return candidate.content.parts
      .filter((part: any) => part.text)
      .map((part: any) => part.text)
      .join('')
  }
}

// 导出单例实例（可选）
let globalGeminiService: GeminiService | null = null

export function initGeminiService(config: GeminiConfig): GeminiService {
  globalGeminiService = new GeminiService(config)
  return globalGeminiService
}

export function getGeminiService(): GeminiService | null {
  return globalGeminiService
}
