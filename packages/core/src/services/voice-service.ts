/**
 * Voice Service
 * 语音识别 (STT) 和语音合成 (TTS) 服务
 * 基于 All-Model-Chat 项目的语音功能
 */

import { logger } from '../utils/logger'

// Web Speech API 类型声明
interface SpeechRecognition extends EventTarget {
  continuous: boolean
  interimResults: boolean
  lang: string
  onresult: ((event: SpeechRecognitionEvent) => void) | null
  onerror: ((event: SpeechRecognitionErrorEvent) => void) | null
  onend: (() => void) | null
  start(): void
  stop(): void
}

interface SpeechRecognitionEvent extends Event {
  resultIndex: number
  results: SpeechRecognitionResultList
}

interface SpeechRecognitionResultList {
  length: number
  item(index: number): WebSpeechRecognitionResult
  [index: number]: WebSpeechRecognitionResult
}

interface WebSpeechRecognitionResult {
  isFinal: boolean
  length: number
  item(index: number): SpeechRecognitionAlternative
  [index: number]: SpeechRecognitionAlternative
}

interface SpeechRecognitionAlternative {
  transcript: string
  confidence: number
}

interface SpeechRecognitionErrorEvent extends Event {
  error: string
}

declare global {
  interface Window {
    SpeechRecognition: new () => SpeechRecognition
    webkitSpeechRecognition: new () => SpeechRecognition
  }
}

// 语音识别结果
export interface VoiceRecognitionResult {
  transcript: string
  confidence: number
  isFinal: boolean
}

// 语音合成选项
export interface TTSOptions {
  voice?: string
  rate?: number
  pitch?: number
  volume?: number
}

// 语音服务配置
export interface VoiceServiceConfig {
  sttLang?: string
  ttsLang?: string
  ttsVoice?: string
}

/**
 * Voice Service 类
 */
export class VoiceService {
  private config: VoiceServiceConfig
  private recognition: SpeechRecognition | null = null
  private synthesis: SpeechSynthesis | null = null
  private isListening: boolean = false
  private onResultCallback: ((result: VoiceRecognitionResult) => void) | null = null
  private onErrorCallback: ((error: Error) => void) | null = null

  constructor(config: VoiceServiceConfig = {}) {
    this.config = {
      sttLang: 'zh-CN',
      ttsLang: 'zh-CN',
      ttsVoice: '',
      ...config,
    }

    // 初始化 Web Speech API
    if (typeof window !== 'undefined') {
      this.initializeSpeechRecognition()
      this.synthesis = window.speechSynthesis
    }
  }

  /**
   * 初始化语音识别
   */
  private initializeSpeechRecognition(): void {
    try {
      const SpeechRecognitionAPI = window.SpeechRecognition || window.webkitSpeechRecognition

      if (!SpeechRecognitionAPI) {
        logger.warn('[VoiceService] SpeechRecognition not supported')
        return
      }

      this.recognition = new SpeechRecognitionAPI()
      this.recognition.continuous = true
      this.recognition.interimResults = true
      this.recognition.lang = this.config.sttLang || 'zh-CN'

      this.recognition.onresult = (event: SpeechRecognitionEvent) => {
        for (let i = event.resultIndex; i < event.results.length; i++) {
          const result = event.results[i]
          const transcript = result[0].transcript
          const confidence = result[0].confidence

          this.onResultCallback?.({
            transcript,
            confidence,
            isFinal: result.isFinal,
          })
        }
      }

      this.recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
        logger.error('[VoiceService] Recognition error:', event.error)
        this.onErrorCallback?.(new Error(`Speech recognition error: ${event.error}`))
        this.isListening = false
      }

      this.recognition.onend = () => {
        this.isListening = false
      }
    } catch (error) {
      logger.error('[VoiceService] Failed to initialize speech recognition:', error)
    }
  }

  /**
   * 开始语音识别
   */
  startRecognition(
    onResult: (result: VoiceRecognitionResult) => void,
    onError?: (error: Error) => void
  ): boolean {
    if (!this.recognition) {
      onError?.(new Error('Speech recognition not supported'))
      return false
    }

    if (this.isListening) {
      return true
    }

    try {
      this.onResultCallback = onResult
      this.onErrorCallback = onError || null
      this.recognition.start()
      this.isListening = true
      logger.info('[VoiceService] Started speech recognition')
      return true
    } catch (error) {
      logger.error('[VoiceService] Failed to start recognition:', error)
      onError?.(error instanceof Error ? error : new Error(String(error)))
      return false
    }
  }

  /**
   * 停止语音识别
   */
  stopRecognition(): void {
    if (!this.recognition || !this.isListening) {
      return
    }

    try {
      this.recognition.stop()
      this.isListening = false
      logger.info('[VoiceService] Stopped speech recognition')
    } catch (error) {
      logger.error('[VoiceService] Failed to stop recognition:', error)
    }
  }

  /**
   * 检查是否正在监听
   */
  isRecognizing(): boolean {
    return this.isListening
  }

  /**
   * 语音合成 (TTS)
   */
  speak(text: string, options: TTSOptions = {}): Promise<void> {
    return new Promise((resolve, reject) => {
      if (!this.synthesis) {
        reject(new Error('Speech synthesis not supported'))
        return
      }

      try {
        // 取消之前的语音
        this.synthesis.cancel()

        const utterance = new SpeechSynthesisUtterance(text)
        utterance.lang = this.config.ttsLang || 'zh-CN'
        utterance.rate = options.rate || 1
        utterance.pitch = options.pitch || 1
        utterance.volume = options.volume || 1

        // 选择语音
        if (options.voice) {
          const voices = this.synthesis.getVoices()
          const selectedVoice = voices.find(v => v.name === options.voice)
          if (selectedVoice) {
            utterance.voice = selectedVoice
          }
        }

        utterance.onend = () => {
          logger.info('[VoiceService] Speech synthesis completed')
          resolve()
        }

        utterance.onerror = event => {
          logger.error('[VoiceService] Speech synthesis error:', event)
          reject(new Error(`Speech synthesis error: ${event.error}`))
        }

        this.synthesis.speak(utterance)
      } catch (error) {
        logger.error('[VoiceService] Failed to speak:', error)
        reject(error)
      }
    })
  }

  /**
   * 停止语音合成
   */
  stopSpeaking(): void {
    if (this.synthesis) {
      this.synthesis.cancel()
      logger.info('[VoiceService] Stopped speech synthesis')
    }
  }

  /**
   * 获取可用的语音列表
   */
  getVoices(): SpeechSynthesisVoice[] {
    if (!this.synthesis) {
      return []
    }
    return this.synthesis.getVoices()
  }

  /**
   * 暂停语音合成
   */
  pause(): void {
    if (this.synthesis) {
      this.synthesis.pause()
    }
  }

  /**
   * 恢复语音合成
   */
  resume(): void {
    if (this.synthesis) {
      this.synthesis.resume()
    }
  }

  /**
   * 检查是否支持语音识别
   */
  static isRecognitionSupported(): boolean {
    return (
      typeof window !== 'undefined' &&
      ('SpeechRecognition' in window || 'webkitSpeechRecognition' in window)
    )
  }

  /**
   * 检查是否支持语音合成
   */
  static isSynthesisSupported(): boolean {
    return typeof window !== 'undefined' && 'speechSynthesis' in window
  }
}

// 导出单例实例
let globalVoiceService: VoiceService | null = null

export function getVoiceService(config?: VoiceServiceConfig): VoiceService {
  if (!globalVoiceService) {
    globalVoiceService = new VoiceService(config)
  }
  return globalVoiceService
}
