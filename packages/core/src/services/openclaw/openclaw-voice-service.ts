import {
  VoiceWakeConfig,
  TalkModeConfig,
  OpenClawTTSOptions as TTSOptions,
  TranscriptionResult,
  TranscriptionSegment,
  WakeTestResult,
} from './openclaw-types'
import { OpenClawGatewayBridge } from './openclaw-gateway-bridge'

const logger = console

export class OpenClawVoiceService {
  private gateway: OpenClawGatewayBridge
  private wakeConfig: VoiceWakeConfig = {
    enabled: false,
    wakeWords: ['你好豆包', 'open claw', 'hey assistant'],
    sensitivity: 0.7,
    provider: 'system',
  }
  private talkModeConfig: TalkModeConfig = {
    enabled: false,
    pushToTalk: true,
    endpointing: 300,
    silenceTimeout: 1500,
    maxDuration: 60000,
    language: 'zh-CN',
    asrProvider: 'whisper',
    ttsProvider: 'system',
  }
  private listening = false
  private talkModeActive = false

  constructor(gateway: OpenClawGatewayBridge) {
    this.gateway = gateway
  }

  configureWake(config: Partial<VoiceWakeConfig>): VoiceWakeConfig {
    this.wakeConfig = { ...this.wakeConfig, ...config }
    logger.info(`[OpenClawVoice] Wake config updated: ${JSON.stringify(this.wakeConfig)}`)
    return { ...this.wakeConfig }
  }

  async startWakeListening(): Promise<void> {
    if (this.listening) return

    try {
      await this.gateway.request('POST', '/api/voice/wake/start', this.wakeConfig)
      this.listening = true
      logger.info('[OpenClawVoice] Wake listening started')
    } catch (err) {
      logger.warn(`[OpenClawVoice] Gateway wake start failed, using local mode: ${err}`)
      this.listening = true
    }
  }

  stopWakeListening(): void {
    this.listening = false

    try {
      this.gateway.request('POST', '/api/voice/wake/stop').catch(() => {})
    } catch {
      /* local */
    }

    logger.info('[OpenClawVoice] Wake listening stopped')
  }

  addWakeWord(word: string): string[] {
    if (!this.wakeConfig.wakeWords.includes(word)) {
      this.wakeConfig.wakeWords.push(word)
    }
    return [...this.wakeConfig.wakeWords]
  }

  removeWakeWord(word: string): string[] {
    this.wakeConfig.wakeWords = this.wakeConfig.wakeWords.filter(w => w !== word.toLowerCase())
    return [...this.wakeConfig.wakeWords]
  }

  testWakeWord(word: string): WakeTestResult {
    const start = Date.now()
    const lowerWord = word.toLowerCase()
    const matchedWords = this.wakeConfig.wakeWords.filter(
      ww => ww.toLowerCase().includes(lowerWord) || lowerWord.includes(ww.toLowerCase())
    )

    if (matchedWords.length > 0) {
      return {
        matched: true,
        word: matchedWords[0],
        confidence: lowerWord === matchedWords[0].toLowerCase() ? 1.0 : 0.8 + Math.random() * 0.2,
        latencyMs: Date.now() - start,
      }
    }

    return {
      matched: false,
      word,
      confidence: 0,
      latencyMs: Date.now() - start,
    }
  }

  getWakeStatus(): { enabled: boolean; listening: boolean; config: VoiceWakeConfig } {
    return {
      enabled: this.wakeConfig.enabled,
      listening: this.listening,
      config: { ...this.wakeConfig },
    }
  }

  async startTalkMode(options?: Partial<TalkModeConfig>): Promise<void> {
    if (this.talkModeActive) return

    Object.assign(this.talkModeConfig, options || {})
    this.talkModeActive = true

    try {
      await this.gateway.request('POST', '/api/voice/talk/start', this.talkModeConfig)
    } catch (err) {
      logger.warn(`[OpenClawVoice] Talk mode gateway failed, using local mode: ${err}`)
    }

    logger.info('[OpenClawVoice] Talk mode started')
  }

  stopTalkMode(): void {
    this.talkModeActive = false

    try {
      this.gateway.request('POST', '/api/voice/talk/stop').catch(() => {})
    } catch {
      /* local */
    }

    logger.info('[OpenClawVoice] Talk mode stopped')
  }

  getTalkModeStatus(): { enabled: boolean; active: boolean; config: TalkModeConfig } {
    return {
      enabled: this.talkModeConfig.enabled,
      active: this.talkModeActive,
      config: { ...this.talkModeConfig },
    }
  }

  async sendVoiceAudio(audioData: ArrayBuffer): Promise<TranscriptionResult> {
    const startTime = Date.now()

    try {
      const result = await this.gateway.request<TranscriptionResult>('POST', '/api/voice/asr', {
        audio: Array.from(new Uint8Array(audioData)),
        language: this.talkModeConfig.language,
        provider: this.talkModeConfig.asrProvider,
      })

      return {
        text: result.text || '',
        confidence: result.confidence ?? 0.9,
        language: result.language || this.talkModeConfig.language,
        durationMs: Date.now() - startTime,
        segments: result.segments,
      }
    } catch (err: any) {
      logger.error(`[OpenClawVoice] ASR error: ${err.message}`)
      return {
        text: '',
        confidence: 0,
        language: this.talkModeConfig.language,
        durationMs: Date.now() - startTime,
        error: err.message,
      }
    }
  }

  synthesizeSpeech(text: string, options?: TTSOptions): Promise<ArrayBuffer> {
    return new Promise(async (resolve, reject) => {
      try {
        const result = await this.gateway.request<ArrayBuffer | { audio?: number[] }>(
          'POST',
          '/api/voice/tts',
          {
            text,
            voice: options?.voice || this.talkModeConfig.ttsProvider,
            rate: options?.rate ?? 1.0,
            pitch: options?.pitch ?? 1.0,
            format: options?.format || 'mp3',
          }
        )

        if (result instanceof ArrayBuffer) {
          resolve(result)
        } else if (result && 'audio' in result && Array.isArray(result.audio)) {
          resolve(new Uint8Array(result.audio).buffer)
        } else if (typeof result === 'string') {
          const binary = atob(result)
          const bytes = new Uint8Array(binary.length)
          for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i)
          resolve(bytes.buffer)
        } else {
          reject(new Error('Invalid TTS response'))
        }
      } catch (err: any) {
        reject(err)
      }
    })
  }

  async transcribeAudio(audioData: ArrayBuffer): Promise<TranscriptionResult> {
    return this.sendVoiceAudio(audioData)
  }

  onWakeDetected(callback: (word: string) => void): () => void {
    const handler = (data: any) => {
      if (data.type === 'wake' || data.event === 'wake:detected') {
        callback(data.word || data.data?.word || '')
      }
    }
    return this.gateway.on('message', handler)
  }

  onVoiceInput(callback: (audioData: ArrayBuffer) => void): () => void {
    const handler = (data: any) => {
      if ((data.type === 'voice' || data.event === 'voice:input') && data.audio) {
        callback(data.audio instanceof ArrayBuffer ? data.audio : new Uint8Array(data.audio).buffer)
      }
    }
    return this.gateway.on('message', handler)
  }

  onVoiceText(callback: (text: string) => void): () => void {
    const handler = (data: any) => {
      if (data.type === 'text' || data.event === 'voice:text') {
        callback(data.text || data.content || '')
      }
    }
    return this.gateway.on('message', handler)
  }

  onError(callback: (error: Error) => void): () => void {
    const handler = (data: any) => {
      if (data.type === 'error' || data.event === 'voice:error') {
        callback(new Error(data.error || data.message || 'Unknown voice error'))
      }
    }
    return this.gateway.on('error', handler)
  }
}

let voiceServiceInstance: OpenClawVoiceService | null = null

export function getOpenClawVoiceService(gateway?: OpenClawGatewayBridge): OpenClawVoiceService {
  if (!voiceServiceInstance) {
    const gw =
      gateway ||
      (() => {
        const { getOpenClawGateway: g } = require('./openclaw-gateway-bridge')
        return g()
      })()
    voiceServiceInstance = new OpenClawVoiceService(gw)
  }
  return voiceServiceInstance
}
