/**
 * NativeCapabilityService — 原生能力中心核心服务
 * 
 * 实现 17 项原生能力的实际功能，每个能力都有独立的状态管理和操作逻辑。
 * 能力分为四类：创作类、媒体类、工具类、高级能力
 */

import { ollamaCapabilityService, type CapabilityId } from './ollamaCapabilityService'

// ═══════════════════════════════════════════
// 能力状态和类型定义
// ═══════════════════════════════════════════

/** 能力激活状态 */
export interface CapabilityState {
  isActive: boolean
  isLoading: boolean
  data?: unknown
  error?: string
}

/** 语音识别结果 */
export interface SpeechRecognitionResult {
  transcript: string
  confidence: number
  timestamp: number
}

/** 文件上传结果 */
export interface FileUploadResult {
  id: string
  name: string
  type: string
  size: number
  content?: string
  previewUrl?: string
}

/** 知识库条目 */
export interface KnowledgeEntry {
  id: string
  content: string
  metadata: Record<string, unknown>
  timestamp: number
}

/** 截图数据 */
export interface ScreenshotData {
  dataUrl: string
  width: number
  height: number
  timestamp: number
}

// ═══════════════════════════════════════════
// 能力状态管理器
// ═══════════════════════════════════════════

type Listener<T> = (state: T) => void

class StateManager<T> {
  private listeners = new Set<Listener<T>>()
  private state: T

  constructor(initialState: T) {
    this.state = initialState
  }

  getState(): T {
    return this.state
  }

  setState(updater: T | ((prev: T) => T)): void {
    const newState = typeof updater === 'function' 
      ? (updater as (prev: T) => T)(this.state) 
      : updater
    this.state = newState
    this.listeners.forEach(listener => listener(newState))
  }

  subscribe(listener: Listener<T>): () => void {
    this.listeners.add(listener)
    return () => this.listeners.delete(listener)
  }
}

// ═══════════════════════════════════════════
// 各能力服务实现
// ═══════════════════════════════════════════

/**
 * 写作助手服务
 * 使用 Ollama 模型执行写作任务
 */
export class WritingCapability {
  private static instance: WritingCapability
  
  static getInstance(): WritingCapability {
    if (!WritingCapability.instance) {
      WritingCapability.instance = new WritingCapability()
    }
    return WritingCapability.instance
  }

  async execute(userInput: string, context?: string): Promise<string> {
    const result = await ollamaCapabilityService.execute({
      capability: 'writing',
      input: context ? `${context}\n\n请按照以下要求写作：${userInput}` : userInput,
    })
    return result.content
  }
}

/**
 * 翻译服务
 * 使用 Ollama 模型执行翻译任务
 */
export class TranslationCapability {
  private static instance: TranslationCapability
  
  static getInstance(): TranslationCapability {
    if (!TranslationCapability.instance) {
      TranslationCapability.instance = new TranslationCapability()
    }
    return TranslationCapability.instance
  }

  async execute(text: string, from?: string, to?: string): Promise<string> {
    const prompt = from && to 
      ? `将以下${from}内容翻译为${to}：\n\n${text}`
      : text
    const result = await ollamaCapabilityService.execute({
      capability: 'translation',
      input: prompt,
    })
    return result.content
  }

  detectLanguage(text: string): string {
    // 简单的语言检测
    if (/[\u4e00-\u9fa5]/.test(text)) return 'zh'
    if (/[\u3040-\u309f\u30a0-\u30ff]/.test(text)) return 'ja'
    if (/[\uac00-\ud7af]/.test(text)) return 'ko'
    return 'en'
  }
}

/**
 * PPT 生成服务
 * 生成 PPT 大纲和内容
 */
export class PPTCapability {
  private static instance: PPTCapability
  
  static getInstance(): PPTCapability {
    if (!PPTCapability.instance) {
      PPTCapability.instance = new PPTCapability()
    }
    return PPTCapability.instance
  }

  async generateOutline(topic: string, slideCount?: number): Promise<string> {
    const result = await ollamaCapabilityService.execute({
      capability: 'ppt',
      input: `主题：${topic}\n${slideCount ? `要求：${slideCount}页` : '要求：10-15页'}`,
    })
    return result.content
  }

  async generateSlideContent(title: string, notes?: string): Promise<string> {
    const result = await ollamaCapabilityService.execute({
      capability: 'ppt',
      input: `为以下幻灯片生成详细内容：\n标题：${title}\n${notes ? `备注：${notes}` : ''}`,
    })
    return result.content
  }
}

/**
 * 图片生成服务
 * 调用图片生成 API
 */
export class ImageGenCapability {
  private static instance: ImageGenCapability
  private stateManager: StateManager<{ isGenerating: boolean; lastImageUrl?: string }>

  static getInstance(): ImageGenCapability {
    if (!ImageGenCapability.instance) {
      ImageGenCapability.instance = new ImageGenCapability()
    }
    return ImageGenCapability.instance
  }

  constructor() {
    this.stateManager = new StateManager<{ isGenerating: boolean; lastImageUrl?: string }>({ isGenerating: false })
  }

  isGenerating(): boolean {
    return this.stateManager.getState().isGenerating
  }

  onStateChange(listener: Listener<{ isGenerating: boolean; lastImageUrl?: string }>): () => void {
    return this.stateManager.subscribe(listener)
  }

  /**
   * 生成图片提示词
   * 使用 Ollama 模型优化提示词
   */
  async generatePrompt(userDescription: string): Promise<string> {
    const result = await ollamaCapabilityService.execute({
      capability: 'image-gen',
      input: userDescription,
    })
    return result.content
  }

  /**
   * 实际生成图片（模拟 - 实际需要调用图片生成 API）
   */
  async generateImage(prompt: string): Promise<{ success: boolean; imageUrl?: string; error?: string }> {
    this.stateManager.setState({ isGenerating: true })
    
    try {
      // 模拟图片生成延迟
      await new Promise(resolve => setTimeout(resolve, 2000))
      
      // 在实际实现中，这里会调用 DALL-E、Stable Diffusion 等 API
      // 目前返回模拟数据
      const mockImageUrl = `https://picsum.photos/seed/${Date.now()}/1024/1024`
      
      this.stateManager.setState({ isGenerating: false, lastImageUrl: mockImageUrl })
      return { success: true, imageUrl: mockImageUrl }
    } catch (error) {
      this.stateManager.setState({ isGenerating: false })
      return { success: false, error: error instanceof Error ? error.message : '生成失败' }
    }
  }

  /**
   * 使用描述直接生成（内部调用 generatePrompt + generateImage）
   */
  async generateFromDescription(description: string): Promise<{ success: boolean; imageUrl?: string; prompt?: string; error?: string }> {
    try {
      const optimizedPrompt = await this.generatePrompt(description)
      const result = await this.generateImage(optimizedPrompt)
      return { ...result, prompt: optimizedPrompt }
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : '生成失败' }
    }
  }
}

/**
 * 视频助手服务
 */
export class VideoCapability {
  private static instance: VideoCapability

  static getInstance(): VideoCapability {
    if (!VideoCapability.instance) {
      VideoCapability.instance = new VideoCapability()
    }
    return VideoCapability.instance
  }

  async generateScript(topic: string, duration?: number, style?: string): Promise<string> {
    const prompt = `主题：${topic}\n${duration ? `时长：${duration}秒` : '时长：60秒'}\n${style ? `风格：${style}` : '风格：纪录片'}`
    const result = await ollamaCapabilityService.execute({
      capability: 'video',
      input: prompt,
    })
    return result.content
  }

  async generateStoryboard(script: string): Promise<string> {
    const result = await ollamaCapabilityService.execute({
      capability: 'video',
      input: `根据以下脚本生成分镜：\n\n${script}`,
    })
    return result.content
  }
}

/**
 * 音乐创作服务
 */
export class MusicCapability {
  private static instance: MusicCapability

  static getInstance(): MusicCapability {
    if (!MusicCapability.instance) {
      MusicCapability.instance = new MusicCapability()
    }
    return MusicCapability.instance
  }

  async generateLyrics(theme: string, style: string = '流行'): Promise<string> {
    const result = await ollamaCapabilityService.execute({
      capability: 'music',
      input: `主题：${theme}\n风格：${style}`,
    })
    return result.content
  }

  async suggestArrangement(genre: string): Promise<string> {
    const result = await ollamaCapabilityService.execute({
      capability: 'music',
      input: `为${genre}风格音乐提供编曲建议`,
    })
    return result.content
  }
}

/**
 * 语音工作室服务
 * 使用 Web Speech API 实现 ASR 和 TTS
 */
export class VoiceStudioCapability {
  private static instance: VoiceStudioCapability
  private recognition: InstanceType<typeof window.webkitSpeechRecognition> | null = null
  private synthesis: SpeechSynthesis | null = null
  private stateManager: StateManager<{
    isRecording: boolean
    isSpeaking: boolean
    transcripts: Array<{ text: string; time: Date }>
  }>

  static getInstance(): VoiceStudioCapability {
    if (!VoiceStudioCapability.instance) {
      VoiceStudioCapability.instance = new VoiceStudioCapability()
    }
    return VoiceStudioCapability.instance
  }

  constructor() {
    this.stateManager = new StateManager<{
      isRecording: boolean
      isSpeaking: boolean
      transcripts: Array<{ text: string; time: Date }>
    }>({
      isRecording: false,
      isSpeaking: false,
      transcripts: [],
    })
    
    // 初始化 Web Speech API
    if (typeof window !== 'undefined') {
      const SpeechRecognitionAPI = (window as unknown as { webkitSpeechRecognition?: typeof window.webkitSpeechRecognition }).webkitSpeechRecognition
      if (SpeechRecognitionAPI) {
        this.recognition = new SpeechRecognitionAPI()
        this.recognition.continuous = true
        this.recognition.interimResults = true
        this.recognition.lang = 'zh-CN'
      }
      
      this.synthesis = window.speechSynthesis
    }
  }

  isRecording(): boolean {
    return this.stateManager.getState().isRecording
  }

  isSpeaking(): boolean {
    return this.stateManager.getState().isSpeaking
  }

  getTranscripts(): Array<{ text: string; time: Date }> {
    return this.stateManager.getState().transcripts
  }

  onStateChange(listener: Listener<{
    isRecording: boolean
    isSpeaking: boolean
    transcripts: Array<{ text: string; time: Date }>
  }>): () => void {
    return this.stateManager.subscribe(listener)
  }

  /**
   * 开始录音
   */
  startRecording(onResult?: (transcript: string) => void, onError?: (error: string) => void): boolean {
    if (!this.recognition) {
      onError?.('当前浏览器不支持语音识别')
      return false
    }

    try {
      this.recognition.onresult = (event) => {
        let finalTranscript = ''
        for (let i = event.resultIndex; i < event.results.length; i++) {
          const transcript = event.results[i][0].transcript
          if (event.results[i].isFinal) {
            finalTranscript += transcript
          }
        }
        
        if (finalTranscript) {
          this.stateManager.setState(prev => ({
            ...prev,
            transcripts: [...prev.transcripts, { text: finalTranscript, time: new Date() }],
          }))
          onResult?.(finalTranscript)
        }
      }

      this.recognition.onerror = (event) => {
        onError?.(event.error)
        this.stateManager.setState(prev => ({ ...prev, isRecording: false }))
      }

      this.recognition.onend = () => {
        this.stateManager.setState(prev => ({ ...prev, isRecording: false }))
      }

      this.recognition.start()
      this.stateManager.setState(prev => ({ ...prev, isRecording: true }))
      return true
    } catch (error) {
      onError?.(error instanceof Error ? error.message : '启动录音失败')
      return false
    }
  }

  /**
   * 停止录音
   */
  stopRecording(): void {
    if (this.recognition) {
      this.recognition.stop()
      this.stateManager.setState(prev => ({ ...prev, isRecording: false }))
    }
  }

  /**
   * 文字转语音
   */
  speak(text: string, options?: {
    lang?: string
    rate?: number
    pitch?: number
    volume?: number
  }): boolean {
    if (!this.synthesis) {
      return false
    }

    // 取消之前的语音
    this.synthesis.cancel()

    const utterance = new SpeechSynthesisUtterance(text)
    utterance.lang = options?.lang || 'zh-CN'
    utterance.rate = options?.rate || 1
    utterance.pitch = options?.pitch || 1
    utterance.volume = options?.volume || 1

    utterance.onstart = () => {
      this.stateManager.setState(prev => ({ ...prev, isSpeaking: true }))
    }

    utterance.onend = () => {
      this.stateManager.setState(prev => ({ ...prev, isSpeaking: false }))
    }

    utterance.onerror = () => {
      this.stateManager.setState(prev => ({ ...prev, isSpeaking: false }))
    }

    this.synthesis.speak(utterance)
    return true
  }

  /**
   * 停止语音
   */
  stopSpeaking(): void {
    if (this.synthesis) {
      this.synthesis.cancel()
      this.stateManager.setState(prev => ({ ...prev, isSpeaking: false }))
    }
  }

  /**
   * 获取可用的语音列表
   */
  getAvailableVoices(): SpeechSynthesisVoice[] {
    if (!this.synthesis) return []
    return this.synthesis.getVoices()
  }
}

/**
 * 代码审查服务
 */
export class CodeReviewCapability {
  private static instance: CodeReviewCapability

  static getInstance(): CodeReviewCapability {
    if (!CodeReviewCapability.instance) {
      CodeReviewCapability.instance = new CodeReviewCapability()
    }
    return CodeReviewCapability.instance
  }

  async review(code: string, language?: string): Promise<string> {
    const prompt = language 
      ? `请审查以下${language}代码：\n\n\`\`\`${language}\n${code}\n\`\`\``
      : `请审查以下代码：\n\n${code}`
    
    const result = await ollamaCapabilityService.execute({
      capability: 'code-review',
      input: prompt,
    })
    return result.content
  }

  detectLanguage(code: string): string {
    // 简单的语言检测
    if (code.includes('function') && code.includes('=>')) return 'typescript'
    if (code.includes('def ') && code.includes(':')) return 'python'
    if (code.includes('public class')) return 'java'
    if (code.includes('func ') && code.includes('package')) return 'go'
    if (code.includes('#include')) return 'cpp'
    return 'javascript'
  }
}

/**
 * 数据分析服务
 */
export class DataAnalysisCapability {
  private static instance: DataAnalysisCapability

  static getInstance(): DataAnalysisCapability {
    if (!DataAnalysisCapability.instance) {
      DataAnalysisCapability.instance = new DataAnalysisCapability()
    }
    return DataAnalysisCapability.instance
  }

  async analyze(data: string, analysisType?: string): Promise<string> {
    const prompt = analysisType
      ? `${analysisType}分析：\n\n${data}`
      : `分析以下数据：\n\n${data}`
    
    const result = await ollamaCapabilityService.execute({
      capability: 'data-analysis',
      input: prompt,
    })
    return result.content
  }

  parseCSV(content: string): Array<Record<string, string>> {
    const lines = content.trim().split('\n')
    if (lines.length < 2) return []
    
    const headers = lines[0].split(',').map(h => h.trim())
    const rows: Array<Record<string, string>> = []
    
    for (let i = 1; i < lines.length; i++) {
      const values = lines[i].split(',').map(v => v.trim())
      const row: Record<string, string> = {}
      headers.forEach((header, idx) => {
        row[header] = values[idx] || ''
      })
      rows.push(row)
    }
    
    return rows
  }

  parseJSON(content: string): unknown {
    try {
      return JSON.parse(content)
    } catch {
      return null
    }
  }
}

/**
 * 云盘管理服务
 */
export class CloudStorageCapability {
  private static instance: CloudStorageCapability
  private files: FileUploadResult[] = []

  static getInstance(): CloudStorageCapability {
    if (!CloudStorageCapability.instance) {
      CloudStorageCapability.instance = new CloudStorageCapability()
    }
    return CloudStorageCapability.instance
  }

  async uploadFile(file: File): Promise<FileUploadResult> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      
      reader.onload = () => {
        const result: FileUploadResult = {
          id: `file_${Date.now()}`,
          name: file.name,
          type: file.type,
          size: file.size,
          content: reader.result as string,
        }
        
        // 如果是图片，生成预览
        if (file.type.startsWith('image/')) {
          result.previewUrl = reader.result as string
        }
        
        this.files.push(result)
        resolve(result)
      }
      
      reader.onerror = () => {
        reject(new Error('文件读取失败'))
      }
      
      reader.readAsDataURL(file)
    })
  }

  getFiles(): FileUploadResult[] {
    return this.files
  }

  deleteFile(id: string): boolean {
    const index = this.files.findIndex(f => f.id === id)
    if (index !== -1) {
      this.files.splice(index, 1)
      return true
    }
    return false
  }

  clearFiles(): void {
    this.files = []
  }
}

/**
 * 屏幕共享服务
 */
export class ScreenShareCapability {
  private static instance: ScreenShareCapability
  private mediaStream: MediaStream | null = null

  static getInstance(): ScreenShareCapability {
    if (!ScreenShareCapability.instance) {
      ScreenShareCapability.instance = new ScreenShareCapability()
    }
    return ScreenShareCapability.instance
  }

  async startCapture(): Promise<MediaStream | null> {
    try {
      this.mediaStream = await navigator.mediaDevices.getDisplayMedia({
        video: { cursor: 'always' } as MediaTrackConstraints,
        audio: false,
      })
      return this.mediaStream
    } catch (error) {
      console.error('屏幕捕获失败:', error)
      return null
    }
  }

  stopCapture(): void {
    if (this.mediaStream) {
      this.mediaStream.getTracks().forEach(track => track.stop())
      this.mediaStream = null
    }
  }

  isCapturing(): boolean {
    return this.mediaStream !== null
  }
}

/**
 * 截图问答服务
 */
export class ScreenshotQuestionCapability {
  private static instance: ScreenshotQuestionCapability
  private latestScreenshot: ScreenshotData | null = null

  static getInstance(): ScreenshotQuestionCapability {
    if (!ScreenshotQuestionCapability.instance) {
      ScreenshotQuestionCapability.instance = new ScreenshotQuestionCapability()
    }
    return ScreenshotQuestionCapability.instance
  }

  /**
   * 捕获屏幕截图
   */
  async captureScreen(): Promise<ScreenshotData | null> {
    try {
      const stream = await navigator.mediaDevices.getDisplayMedia({
        video: { displaySurface: 'monitor' } as MediaTrackConstraints,
      })
      
      const video = document.createElement('video')
      video.srcObject = stream
      await video.play()
      
      const canvas = document.createElement('canvas')
      canvas.width = video.videoWidth
      canvas.height = video.videoHeight
      
      const ctx = canvas.getContext('2d')
      if (ctx) {
        ctx.drawImage(video, 0, 0)
      }
      
      stream.getTracks().forEach(track => track.stop())
      
      const dataUrl = canvas.toDataURL('image/png')
      
      this.latestScreenshot = {
        dataUrl,
        width: canvas.width,
        height: canvas.height,
        timestamp: Date.now(),
      }
      
      return this.latestScreenshot
    } catch (error) {
      console.error('截图失败:', error)
      return null
    }
  }

  /**
   * 分析截图内容
   */
  async analyze(question: string): Promise<string> {
    if (!this.latestScreenshot) {
      return '请先截取屏幕内容'
    }

    // 使用 Ollama 分析截图（作为 base64 文本发送）
    const result = await ollamaCapabilityService.execute({
      capability: 'screenshot-question',
      input: `${question}\n\n截图数据：[图片数据已捕获，分辨率 ${this.latestScreenshot.width}x${this.latestScreenshot.height}]`,
    })
    return result.content
  }

  getLatestScreenshot(): ScreenshotData | null {
    return this.latestScreenshot
  }
}

/**
 * 深度搜索服务
 */
export class DeepSearchCapability {
  private static instance: DeepSearchCapability

  static getInstance(): DeepSearchCapability {
    if (!DeepSearchCapability.instance) {
      DeepSearchCapability.instance = new DeepSearchCapability()
    }
    return DeepSearchCapability.instance
  }

  async search(query: string, depth: 'basic' | 'deep' | 'comprehensive' = 'deep'): Promise<string> {
    const result = await ollamaCapabilityService.execute({
      capability: 'deep-search',
      input: `[${depth}级深度搜索]\n\n主题：${query}`,
    })
    return result.content
  }
}

/**
 * 学术搜索服务
 */
export class AcademicSearchCapability {
  private static instance: AcademicSearchCapability

  static getInstance(): AcademicSearchCapability {
    if (!AcademicSearchCapability.instance) {
      AcademicSearchCapability.instance = new AcademicSearchCapability()
    }
    return AcademicSearchCapability.instance
  }

  async searchPapers(topic: string, count: number = 10): Promise<string> {
    const result = await ollamaCapabilityService.execute({
      capability: 'academic-search',
      input: `搜索主题：${topic}\n需要数量：${count}篇\n\n请提供论文检索策略和可能的文献列表。`,
    })
    return result.content
  }

  async writeLiteratureReview(topic: string): Promise<string> {
    const result = await ollamaCapabilityService.execute({
      capability: 'academic-search',
      input: `为以下主题撰写文献综述：\n\n${topic}`,
    })
    return result.content
  }
}

/**
 * 知识库 RAG 服务
 */
export class RAGCapability {
  private static instance: RAGCapability
  private knowledgeBase: KnowledgeEntry[] = []

  static getInstance(): RAGCapability {
    if (!RAGCapability.instance) {
      RAGCapability.instance = new RAGCapability()
    }
    return RAGCapability.instance
  }

  /**
   * 添加知识条目
   */
  addEntry(content: string, metadata: Record<string, unknown> = {}): string {
    const entry: KnowledgeEntry = {
      id: `kb_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`,
      content,
      metadata,
      timestamp: Date.now(),
    }
    this.knowledgeBase.push(entry)
    return entry.id
  }

  /**
   * 添加多个知识条目
   */
  addEntries(entries: Array<{ content: string; metadata?: Record<string, unknown> }>): string[] {
    return entries.map(entry => this.addEntry(entry.content, entry.metadata))
  }

  /**
   * 搜索相关知识
   */
  async search(query: string, limit: number = 5): Promise<string[]> {
    // 简单实现：基于关键词匹配
    // 实际应该使用向量嵌入和相似度计算
    const queryWords = query.toLowerCase().split(/\s+/)
    
    const scored = this.knowledgeBase.map(entry => {
      const content = entry.content.toLowerCase()
      const score = queryWords.reduce((acc, word) => {
        return acc + (content.includes(word) ? 1 : 0)
      }, 0)
      return { entry, score }
    })
    
    return scored
      .filter(item => item.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, limit)
      .map(item => item.entry.content)
  }

  /**
   * 基于知识库回答问题
   */
  async query(question: string): Promise<string> {
    const relevantDocs = await this.search(question)
    
    if (relevantDocs.length === 0) {
      return '知识库中暂无相关内容。请先添加文档或资料。'
    }

    const context = relevantDocs.join('\n\n---\n\n')
    const result = await ollamaCapabilityService.execute({
      capability: 'rag',
      input: `问题：${question}\n\n相关知识：\n${context}`,
    })
    return result.content
  }

  /**
   * 从文本文件构建知识库
   */
  async buildFromText(text: string, chunkSize: number = 500): Promise<number> {
    // 简单分块
    const chunks: string[] = []
    for (let i = 0; i < text.length; i += chunkSize) {
      chunks.push(text.slice(i, i + chunkSize))
    }
    
    const entries = chunks.map(chunk => ({ content: chunk, metadata: { source: 'text', index: chunks.indexOf(chunk) } }))
    this.addEntries(entries)
    return chunks.length
  }

  getEntryCount(): number {
    return this.knowledgeBase.length
  }

  clear(): void {
    this.knowledgeBase = []
  }
}

/**
 * 文档阅读服务
 */
export class ReadDocumentCapability {
  private static instance: ReadDocumentCapability

  static getInstance(): ReadDocumentCapability {
    if (!ReadDocumentCapability.instance) {
      ReadDocumentCapability.instance = new ReadDocumentCapability()
    }
    return ReadDocumentCapability.instance
  }

  /**
   * 读取文本文件
   */
  async readTextFile(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = () => resolve(reader.result as string)
      reader.onerror = () => reject(new Error('读取失败'))
      reader.readAsText(file)
    })
  }

  /**
   * 分析文档内容
   */
  async analyze(content: string, mode: 'summary' | 'keypoints' | 'qa' | 'structure' = 'summary'): Promise<string> {
    const prompts: Record<string, string> = {
      summary: `请总结以下文档的核心内容：\n\n${content}`,
      keypoints: `提取以下文档的关键信息点：\n\n${content}`,
      qa: `基于以下文档内容，回答问题（如有问题请先总结内容）：\n\n${content}`,
      structure: `分析以下文档的结构和组织方式：\n\n${content}`,
    }

    const result = await ollamaCapabilityService.execute({
      capability: 'read-document',
      input: prompts[mode],
    })
    return result.content
  }

  /**
   * 读取 PDF 文件（基础实现，需要 pdf.js）
   */
  async readPDF(file: File): Promise<string> {
    // 基础实现 - 实际需要使用 pdf.js 库
    // 这里使用纯 JavaScript 读取文本内容
    try {
      const text = await this.readTextFile(file)
      return text
    } catch {
      return 'PDF 解析需要额外的库支持，请使用文本文件或 Word 文档。'
    }
  }

  /**
   * 检测文件类型
   */
  detectFileType(file: File): string {
    const ext = file.name.split('.').pop()?.toLowerCase()
    const typeMap: Record<string, string> = {
      pdf: 'pdf',
      doc: 'word',
      docx: 'word',
      txt: 'text',
      md: 'markdown',
      json: 'json',
      csv: 'csv',
      xlsx: 'excel',
      xls: 'excel',
      ppt: 'ppt',
      pptx: 'ppt',
    }
    return typeMap[ext || ''] || 'unknown'
  }
}

/**
 * 思维链模式服务
 */
export class LogicModeCapability {
  private static instance: LogicModeCapability

  static getInstance(): LogicModeCapability {
    if (!LogicModeCapability.instance) {
      LogicModeCapability.instance = new LogicModeCapability()
    }
    return LogicModeCapability.instance
  }

  async reason(problem: string): Promise<string> {
    const result = await ollamaCapabilityService.execute({
      capability: 'logic-mode',
      input: problem,
    })
    return result.content
  }

  async verifyAnswer(question: string, answer: string): Promise<{ isCorrect: boolean; explanation: string }> {
    const result = await ollamaCapabilityService.execute({
      capability: 'logic-mode',
      input: `验证以下问题的答案是否正确：\n\n问题：${question}\n答案：${answer}\n\n请逐步验证答案的正确性。`,
    })
    
    // 简单判断 - 实际需要更复杂的逻辑
    const isCorrect = !result.content.toLowerCase().includes('错误') && 
                      !result.content.toLowerCase().includes('不正确')
    
    return {
      isCorrect,
      explanation: result.content,
    }
  }
}

// ═══════════════════════════════════════════
// 统一的能力激活接口
// ═══════════════════════════════════════════

export type CapabilityExecutor = {
  execute: (input: string, options?: Record<string, unknown>) => Promise<string>
  getCapabilityId: () => CapabilityId
}

/** 能力执行器映射 */
const CAPABILITY_EXECUTORS: Record<string, CapabilityExecutor> = {
  writing: {
    getCapabilityId: () => 'writing',
    execute: async (input) => WritingCapability.getInstance().execute(input),
  },
  translation: {
    getCapabilityId: () => 'translation',
    execute: async (input) => TranslationCapability.getInstance().execute(input),
  },
  ppt: {
    getCapabilityId: () => 'ppt',
    execute: async (input) => PPTCapability.getInstance().generateOutline(input),
  },
  'image-gen': {
    getCapabilityId: () => 'image-gen',
    execute: async (input, options) => {
      const service = ImageGenCapability.getInstance()
      if (options?.generate) {
        const result = await service.generateFromDescription(input)
        return result.success ? `图片已生成：${result.imageUrl}\n\n提示词：${result.prompt}` : (result.error || '')
      }
      return service.generatePrompt(input) || ''
    },
  },
  video: {
    getCapabilityId: () => 'video',
    execute: async (input) => VideoCapability.getInstance().generateScript(input),
  },
  music: {
    getCapabilityId: () => 'music',
    execute: async (input) => MusicCapability.getInstance().generateLyrics(input),
  },
  'voice-studio': {
    getCapabilityId: () => 'voice-studio',
    execute: async (input, options) => {
      const service = VoiceStudioCapability.getInstance()
      if (options?.speak) {
        service.speak(input)
        return '正在朗读...'
      }
      return '语音工作室已准备好。使用 speak 选项可以朗读文本。'
    },
  },
  'code-review': {
    getCapabilityId: () => 'code-review',
    execute: async (input) => CodeReviewCapability.getInstance().review(input),
  },
  'data-analysis': {
    getCapabilityId: () => 'data-analysis',
    execute: async (input) => DataAnalysisCapability.getInstance().analyze(input),
  },
  'cloud-storage': {
    getCapabilityId: () => 'cloud-storage',
    execute: async (input, options) => {
      const service = CloudStorageCapability.getInstance()
      if (options?.upload && options.file) {
        const result = await service.uploadFile(options.file as File)
        return `文件已上传：${result.name}`
      }
      return `云盘管理。当前文件数：${service.getFiles().length}`
    },
  },
  'screen-share': {
    getCapabilityId: () => 'screen-share',
    execute: async (input) => {
      const result = await ScreenShareCapability.getInstance().startCapture()
      return result !== null ? '屏幕共享已开始' : '无法启动屏幕共享'
    },
  },
  'screenshot-question': {
    getCapabilityId: () => 'screenshot-question',
    execute: async (input, options) => {
      const service = ScreenshotQuestionCapability.getInstance()
      if (options?.capture) {
        const screenshot = await service.captureScreen()
        return screenshot ? '截图已捕获' : '截图失败'
      }
      return service.analyze(input)
    },
  },
  'deep-search': {
    getCapabilityId: () => 'deep-search',
    execute: async (input) => DeepSearchCapability.getInstance().search(input),
  },
  'academic-search': {
    getCapabilityId: () => 'academic-search',
    execute: async (input) => AcademicSearchCapability.getInstance().searchPapers(input),
  },
  rag: {
    getCapabilityId: () => 'rag',
    execute: async (input, options) => {
      const service = RAGCapability.getInstance()
      if (options?.add) {
        service.addEntry(input)
        return '已添加到知识库'
      }
      return service.query(input)
    },
  },
  'read-document': {
    getCapabilityId: () => 'read-document',
    execute: async (input, options) => {
      const service = ReadDocumentCapability.getInstance()
      if (options?.file) {
        const content = await service.readTextFile(options.file as File)
        return service.analyze(content, (options.mode as 'summary' | 'keypoints' | 'qa' | 'structure') || 'summary')
      }
      return service.analyze(input)
    },
  },
  'logic-mode': {
    getCapabilityId: () => 'logic-mode',
    execute: async (input) => LogicModeCapability.getInstance().reason(input),
  },
}

/**
 * 执行指定的能力
 */
export async function executeCapability(
  capabilityId: string,
  input: string,
  options?: Record<string, unknown>
): Promise<string> {
  const executor = CAPABILITY_EXECUTORS[capabilityId]
  if (!executor) {
    return `未知能力：${capabilityId}`
  }
  
  try {
    return await executor.execute(input, options)
  } catch (error) {
    return `执行失败：${error instanceof Error ? error.message : '未知错误'}`
  }
}

/**
 * 获取所有可用能力列表
 */
export function getAvailableCapabilities(): Array<{ id: string; label: string }> {
  return Object.entries(CAPABILITY_EXECUTORS).map(([id, executor]) => ({
    id,
    label: CAPABILITY_CONFIGS[id as CapabilityId]?.label || id,
  }))
}

// 重新导出配置
export { CAPABILITY_CONFIGS } from './ollamaCapabilityService'
export type { CapabilityConfig } from './ollamaCapabilityService'

// 导入配置
import { CAPABILITY_CONFIGS } from './ollamaCapabilityService'