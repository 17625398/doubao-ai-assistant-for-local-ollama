import { logger } from '../utils/logger'
import { linkMindService, type LinkMindServiceConfig } from './linkmind-service'

export interface ASRRequest {
  audio: Blob | File | ArrayBuffer
  language?: string
  format?: string
}

export interface ASRResult {
  success: boolean
  text: string
  confidence?: number
  language?: string
  duration?: number
  raw?: any
  error?: string
}

export interface TTSRequest {
  text: string
  voice?: string
  speed?: number
  format?: 'mp3' | 'wav' | 'opus'
  sampleRate?: number
}

export interface TTSResult {
  success: boolean
  audioUrl?: string
  audioBlob?: Blob
  duration?: number
  raw?: any
  error?: string
}

export interface ImageGenRequest {
  prompt: string
  negativePrompt?: string
  width?: number
  height?: number
  steps?: number
  seed?: number
  model?: string
  count?: number
}

export interface ImageGenResult {
  success: boolean
  images: Array<{
    url?: string
    base64?: string
    width?: number
    height?: number
  }>
  raw?: any
  error?: string
}

export interface VisionRequest {
  image: string | File | Blob
  prompt: string
  detail?: 'low' | 'high' | 'auto'
  maxTokens?: number
}

export interface VisionResult {
  success: boolean
  text: string
  raw?: any
  error?: string
}

export interface VideoAnalysisRequest {
  videoUrl: string
  prompt: string
  maxFrames?: number
}

export interface VideoAnalysisResult {
  success: boolean
  text: string
  frames?: Array<{ index: number; description: string }>
  raw?: any
  error?: string
}

export interface MultimodalServiceConfig extends Partial<LinkMindServiceConfig> {
  asrEndpoint?: string
  ttsEndpoint?: string
  imageGenEndpoint?: string
  visionEndpoint?: string
  defaultVoice?: string
  defaultImageModel?: string
  maxAudioSize?: number
  maxImageSize?: number
}

const DEFAULT_CONFIG: Required<Omit<MultimodalServiceConfig, keyof LinkMindServiceConfig>> & {
  asrEndpoint: string
  ttsEndpoint: string
  imageGenEndpoint: string
  visionEndpoint: string
  defaultVoice: string
  defaultImageModel: string
  maxAudioSize: number
  maxImageSize: number
} = {
  asrEndpoint: '/audio/speech2text',
  ttsEndpoint: '/audio/text2speech',
  imageGenEndpoint: '/image/text2image',
  visionEndpoint: '/v1/chat/completions',
  defaultVoice: 'alloy',
  defaultImageModel: 'dall-e-3',
  maxAudioSize: 25 * 1024 * 1024,
  maxImageSize: 20 * 1024 * 1024,
}

export class MultimodalService {
  private config: MultimodalServiceConfig

  constructor(config: MultimodalServiceConfig = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config }
  }

  updateConfig(updates: Partial<MultimodalServiceConfig>): void {
    this.config = { ...this.config, ...updates }
  }

  async speechToText(request: ASRRequest): Promise<ASRResult> {
    const startTime = Date.now()
    const maxAudio = this.config.maxAudioSize ?? DEFAULT_CONFIG.maxAudioSize
    try {
      let body: FormData | Record<string, any>

      if (request.audio instanceof Blob || request.audio instanceof File) {
        if (request.audio.size > maxAudio) {
          return {
            success: false,
            text: '',
            error: `Audio file too large (${(request.audio.size / 1024 / 1024).toFixed(1)}MB > ${(maxAudio / 1024 / 1024).toFixed(1)}MB limit)`,
          }
        }

        const formData = new FormData()
        formData.append('file', request.audio)
        if (request.language) formData.append('language', request.language)
        if (request.format) formData.append('format', request.format)
        body = formData
      } else {
        body = {
          audio_data: Buffer.from(request.audio).toString('base64'),
          language: request.language || 'zh-CN',
          format: request.format || 'wav',
        }
      }

      logger.info(
        `[MultimodalService] speechToText() size=${request.audio instanceof Blob ? (request.audio.size / 1024).toFixed(1) + 'KB' : 'buffer'}, lang=${request.language || 'auto'}`
      )

      const response = await linkMindService.request<any>(this.config.asrEndpoint!, {
        method: 'POST',
        body: body instanceof FormData ? body : JSON.stringify(body),
        headers: body instanceof FormData ? undefined : { 'Content-Type': 'application/json' },
      })

      const duration = Date.now() - startTime
      logger.info(`[MultimodalService] speechToText() done in ${duration}ms`)

      return {
        success: true,
        text: response.text || response.result || response.transcript || '',
        confidence: response.confidence,
        language: response.language,
        duration: response.duration || duration,
        raw: response,
      }
    } catch (error) {
      logger.error('[MultimodalService] speechToText() error:', error)
      return {
        success: false,
        text: '',
        error: error instanceof Error ? error.message : 'Speech to text failed',
      }
    }
  }

  async textToSpeech(request: TTSRequest): Promise<TTSResult> {
    const startTime = Date.now()
    try {
      if (!request.text || request.text.trim().length === 0) {
        return { success: false, error: 'Empty text for TTS' }
      }

      const body: Record<string, any> = {
        input: request.text,
        voice: request.voice || this.config.defaultVoice,
        speed: request.speed ?? 1.0,
        response_format: request.format || 'mp3',
      }

      if (request.sampleRate) body.sample_rate = request.sampleRate

      logger.info(
        `[MultimodalService] textToSpeech() len=${request.text.length}, voice=${body.voice}, fmt=${body.response_format}`
      )

      const response = await linkMindService.request<any>(this.config.ttsEndpoint!, {
        method: 'POST',
        body: JSON.stringify(body),
      })

      const duration = Date.now() - startTime
      logger.info(`[MultimodalService] textToSpeech() done in ${duration}ms`)

      if (response.audio_url || response.url) {
        return {
          success: true,
          audioUrl: response.audio_url || response.url,
          duration: response.duration || duration,
          raw: response,
        }
      }

      if (response.audio_base64 || response.data) {
        const b64 = response.audio_base64 || response.data
        const mimeType = `audio/${body.response_format}`
        try {
          const binary = atob(b64)
          const bytes = new Uint8Array(binary.length)
          for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i)
          return {
            success: true,
            audioBlob: new Blob([bytes], { type: mimeType }),
            duration: response.duration || duration,
            raw: response,
          }
        } catch {
          return {
            success: true,
            audioUrl: `data:${mimeType};base64,${b64}`,
            duration: response.duration || duration,
            raw: response,
          }
        }
      }

      return {
        success: false,
        error: 'Invalid TTS response format',
        raw: response,
      }
    } catch (error) {
      logger.error('[MultimodalService] textToSpeech() error:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Text to speech failed',
      }
    }
  }

  async textToImage(request: ImageGenRequest): Promise<ImageGenResult> {
    const startTime = Date.now()
    try {
      if (!request.prompt || request.prompt.trim().length === 0) {
        return { success: false, images: [], error: 'Empty prompt for image generation' }
      }

      const body: Record<string, any> = {
        model: request.model || this.config.defaultImageModel,
        prompt: request.prompt,
        n: request.count || 1,
        size: `${request.width || 1024}x${request.height || 1024}`,
      }

      if (request.negativePrompt) body.negative_prompt = request.negativePrompt
      if (request.steps) body.steps = request.steps
      if (request.seed !== undefined) body.seed = request.seed

      logger.info(`[MultimodalService] textToImage() model=${body.model}, size=${body.size}`)

      const response = await linkMindService.request<any>(this.config.imageGenEndpoint!, {
        method: 'POST',
        body: JSON.stringify(body),
      })

      const duration = Date.now() - startTime
      logger.info(`[MultimodalService] textToImage() done in ${duration}ms`)

      const images: ImageGenResult['images'] = []

      if (Array.isArray(response.data)) {
        for (const item of response.data) {
          images.push({
            url: item.url || item.b64_json ? undefined : undefined,
            base64: item.b64_json || item.base64,
            width: item.width || request.width,
            height: item.height || request.height,
          })
          if (!images[images.length - 1].url && !images[images.length - 1].base64) {
            images[images.length - 1].url = item.url
          }
        }
      } else if (response.images && Array.isArray(response.images)) {
        for (const img of response.images) {
          images.push({
            url: img.url,
            base64: img.base64,
            width: img.width || request.width,
            height: img.height || request.height,
          })
        }
      } else if (response.image_url || response.url) {
        images.push({ url: response.image_url || response.url })
      } else if (response.image_base64 || response.data) {
        images.push({ base64: response.image_base64 || response.data })
      }

      return {
        success: images.length > 0,
        images,
        raw: response,
      }
    } catch (error) {
      logger.error('[MultimodalService] textToImage() error:', error)
      return {
        success: false,
        images: [],
        error: error instanceof Error ? error.message : 'Image generation failed',
      }
    }
  }

  async imageUnderstand(request: VisionRequest): Promise<VisionResult> {
    const startTime = Date.now()
    const maxImage = this.config.maxImageSize ?? DEFAULT_CONFIG.maxImageSize
    try {
      let imageUrl: string
      let imageType = 'url'

      if (typeof request.image === 'string') {
        imageUrl = request.image
      } else if (request.image instanceof File || request.image instanceof Blob) {
        if (request.image.size > maxImage) {
          return {
            success: false,
            text: '',
            error: `Image too large (${(request.image.size / 1024 / 1024).toFixed(1)}MB)`,
          }
        }
        const reader = new FileReader()
        const dataUrl = await new Promise<string>((resolve, reject) => {
          reader.onload = () => resolve(reader.result as string)
          reader.onerror = reject
          reader.readAsDataURL(request.image as Blob)
        })
        imageUrl = dataUrl
        imageType = 'base64'
      } else {
        return { success: false, text: '', error: 'Invalid image input type' }
      }

      const messages = [
        {
          role: 'user' as const,
          content: [
            { type: 'image_url', image_url: { url: imageUrl } },
            { type: 'text', text: request.prompt || '请详细描述这张图片的内容' },
          ],
        },
      ]

      const body: Record<string, any> = {
        model: this.config.defaultImageModel || 'gpt-4o-mini',
        messages,
        max_tokens: request.maxTokens || 1000,
      }

      logger.info(
        `[MultimodalService] imageUnderstand() type=${imageType}, prompt_len=${request.prompt.length}`
      )

      const response = await linkMindService.request<any>(this.config.visionEndpoint!, {
        method: 'POST',
        body: JSON.stringify(body),
      })

      const duration = Date.now() - startTime
      logger.info(`[MultimodalService] imageUnderstand() done in ${duration}ms`)

      const text =
        response.choices?.[0]?.message?.content || response.text || response.description || ''

      return {
        success: !!text,
        text,
        raw: response,
      }
    } catch (error) {
      logger.error('[MultimodalService] imageUnderstand() error:', error)
      return {
        success: false,
        text: '',
        error: error instanceof Error ? error.message : 'Image understanding failed',
      }
    }
  }

  async analyzeVideo(request: VideoAnalysisRequest): Promise<VideoAnalysisResult> {
    const startTime = Date.now()
    try {
      const body: Record<string, any> = {
        video_url: request.videoUrl,
        prompt: request.prompt,
        max_frames: request.maxFrames || 10,
      }

      logger.info(`[MultimodalService] analyzeVideo() frames=${body.max_frames}`)

      const response = await linkMindService.request<any>('/video/analyze', {
        method: 'POST',
        body: JSON.stringify(body),
      })

      const duration = Date.now() - startTime
      logger.info(`[MultimodalService] analyzeVideo() done in ${duration}ms`)

      return {
        success: true,
        text: response.summary || response.analysis || response.text || '',
        frames: response.frames?.map((f: any, i: number) => ({
          index: f.index ?? i,
          description: f.description || f.text || '',
        })),
        raw: response,
      }
    } catch (error) {
      logger.error('[MultimodalService] analyzeVideo() error:', error)
      return {
        success: false,
        text: '',
        error: error instanceof Error ? error.message : 'Video analysis failed',
      }
    }
  }

  getCapabilities(): {
    asr: boolean
    tts: boolean
    imageGen: boolean
    vision: boolean
    video: boolean
  } {
    return {
      asr: !!this.config.asrEndpoint,
      tts: !!this.config.ttsEndpoint,
      imageGen: !!this.config.imageGenEndpoint,
      vision: !!this.config.visionEndpoint,
      video: true,
    }
  }
}

export const multimodalService = new MultimodalService()
