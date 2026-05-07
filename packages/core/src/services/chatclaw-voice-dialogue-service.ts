/**
 * ChatClaw 语音对话服务
 * 借鉴豆包 AI 的端到端语音大模型能力
 * 实现 Speech2Speech 框架，支持低时延对话、情绪承接与方言理解
 */

import { logger } from '../utils/logger';
import { eventBus } from '../utils/event-bus';
import { chatClawThinkingModeService, ThinkingMode } from './chatclaw-thinking-mode-service';

/**
 * 语音对话配置
 */
export interface VoiceDialogueConfig {
  /** 语音识别模型 */
  asrModel?: string;
  /** 语音合成模型 */
  ttsModel?: string;
  /** 对话模型 */
  dialogueModel?: string;
  /** 采样率 */
  sampleRate?: number;
  /** 语言 */
  language?: string;
  /** 方言 */
  dialect?: string;
  /** 音色 */
  voice?: string;
  /** 情绪风格 */
  emotion?: 'neutral' | 'happy' | 'sad' | 'angry' | 'excited';
  /** 语速 */
  speed?: number;
  /** 音量 */
  volume?: number;
  /** 启用 VAD（语音活动检测） */
  enableVAD?: boolean;
  /** VAD 阈值 */
  vadThreshold?: number;
  /** 静音超时（毫秒） */
  silenceTimeout?: number;
  /** 最大录音时长（毫秒） */
  maxRecordingDuration?: number;
}

/**
 * 语音对话状态
 */
export type VoiceDialogueState = 'idle' | 'listening' | 'processing' | 'speaking' | 'error';

/**
 * 语音对话事件
 */
export interface VoiceDialogueEvent {
  type: 'state_change' | 'transcript' | 'response' | 'error' | 'interruption';
  data: any;
  timestamp: number;
}

/**
 * 语音对话统计
 */
export interface VoiceDialogueStats {
  totalTurns: number;
  totalDuration: number;
  avgResponseTime: number;
  asrAccuracy: number;
  interruptionCount: number;
}

/**
 * 语音对话服务
 * 借鉴豆包 AI 的端到端语音处理技术
 */
export class ChatClawVoiceDialogueService {
  private config: VoiceDialogueConfig;
  private state: VoiceDialogueState = 'idle';
  private mediaRecorder: MediaRecorder | null = null;
  private audioContext: AudioContext | null = null;
  private stream: MediaStream | null = null;
  private stats: VoiceDialogueStats = {
    totalTurns: 0,
    totalDuration: 0,
    avgResponseTime: 0,
    asrAccuracy: 0,
    interruptionCount: 0,
  };
  private conversationHistory: Array<{ role: 'user' | 'assistant'; content: string; audioUrl?: string }> = [];
  private isInitialized = false;

  constructor(config: VoiceDialogueConfig = {}) {
    this.config = {
      asrModel: 'whisper-1',
      ttsModel: 'tts-1',
      dialogueModel: 'gpt-4',
      sampleRate: 16000,
      language: 'zh',
      dialect: 'mandarin',
      voice: 'alloy',
      emotion: 'neutral',
      speed: 1.0,
      volume: 1.0,
      enableVAD: true,
      vadThreshold: 0.02,
      silenceTimeout: 1500,
      maxRecordingDuration: 60000,
      ...config,
    };

    logger.info('[ChatClawVoiceDialogueService] Initialized with config:', this.config);
  }

  /**
   * 初始化语音对话服务
   */
  async initialize(): Promise<boolean> {
    try {
      logger.info('[ChatClawVoiceDialogueService] Initializing...');

      // 检查浏览器支持
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error('浏览器不支持音频录制');
      }

      // 请求麦克风权限
      this.stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          sampleRate: this.config.sampleRate,
          channelCount: 1,
          echoCancellation: true,
          noiseSuppression: true,
        },
      });

      // 创建 AudioContext
      this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)({
        sampleRate: this.config.sampleRate,
      });

      this.isInitialized = true;
      this.setState('idle');

      logger.info('[ChatClawVoiceDialogueService] Initialized successfully');
      return true;
    } catch (error) {
      logger.error('[ChatClawVoiceDialogueService] Initialization failed:', error);
      this.setState('error');
      return false;
    }
  }

  /**
   * 开始语音对话
   * 借鉴豆包的端到端语音对话流程
   */
  async startDialogue(options: {
    onStateChange?: (state: VoiceDialogueState) => void;
    onTranscript?: (transcript: string, isFinal: boolean) => void;
    onResponse?: (response: string, audioUrl: string) => void;
    onError?: (error: Error) => void;
  } = {}): Promise<void> {
    if (!this.isInitialized) {
      const initialized = await this.initialize();
      if (!initialized) {
        throw new Error('语音对话服务初始化失败');
      }
    }

    logger.info('[ChatClawVoiceDialogueService] Starting dialogue...');

    // 开始监听用户语音
    await this.startListening(options);
  }

  /**
   * 停止语音对话
   */
  stopDialogue(): void {
    logger.info('[ChatClawVoiceDialogueService] Stopping dialogue...');

    this.stopListening();
    this.cleanup();
    this.setState('idle');
  }

  /**
   * 开始监听语音输入
   */
  private async startListening(options: {
    onStateChange?: (state: VoiceDialogueState) => void;
    onTranscript?: (transcript: string, isFinal: boolean) => void;
    onResponse?: (response: string, audioUrl: string) => void;
    onError?: (error: Error) => void;
  }): Promise<void> {
    try {
      this.setState('listening');

      // 创建 MediaRecorder
      this.mediaRecorder = new MediaRecorder(this.stream!, {
        mimeType: 'audio/webm;codecs=opus',
      });

      const audioChunks: Blob[] = [];
      let silenceTimer: NodeJS.Timeout | null = null;

      this.mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunks.push(event.data);
        }
      };

      this.mediaRecorder.onstop = async () => {
        if (audioChunks.length === 0) return;

        const audioBlob = new Blob(audioChunks, { type: 'audio/webm' });
        await this.processVoiceInput(audioBlob, options);
      };

      // 开始录制
      this.mediaRecorder.start(100); // 每 100ms 收集一次数据

      // 设置最大录音时长
      setTimeout(() => {
        if (this.mediaRecorder?.state === 'recording') {
          this.mediaRecorder.stop();
        }
      }, this.config.maxRecordingDuration);

      // VAD 模拟（简化实现）
      if (this.config.enableVAD) {
        this.simulateVAD(() => {
          if (this.mediaRecorder?.state === 'recording') {
            this.mediaRecorder.stop();
          }
        });
      }
    } catch (error) {
      logger.error('[ChatClawVoiceDialogueService] Failed to start listening:', error);
      options.onError?.(error instanceof Error ? error : new Error('启动监听失败'));
      this.setState('error');
    }
  }

  /**
   * 停止监听
   */
  private stopListening(): void {
    if (this.mediaRecorder?.state === 'recording') {
      this.mediaRecorder.stop();
    }
  }

  /**
   * 处理语音输入
   * 端到端处理流程：语音 -> 文本 -> AI 处理 -> 语音输出
   */
  private async processVoiceInput(
    audioBlob: Blob,
    options: {
      onTranscript?: (transcript: string, isFinal: boolean) => void;
      onResponse?: (response: string, audioUrl: string) => void;
      onError?: (error: Error) => void;
    }
  ): Promise<void> {
    const startTime = Date.now();

    try {
      this.setState('processing');

      // 1. 语音识别（ASR）
      logger.info('[ChatClawVoiceDialogueService] Transcribing audio...');
      const transcript = await this.transcribeAudio(audioBlob);
      options.onTranscript?.(transcript, true);

      // 添加到对话历史
      this.conversationHistory.push({ role: 'user', content: transcript });

      // 2. AI 对话处理
      logger.info('[ChatClawVoiceDialogueService] Processing with AI...');
      const response = await this.processWithAI(transcript);

      // 3. 语音合成（TTS）
      logger.info('[ChatClawVoiceDialogueService] Synthesizing speech...');
      const audioUrl = await this.synthesizeSpeech(response);

      // 添加到对话历史
      this.conversationHistory.push({ role: 'assistant', content: response, audioUrl });

      // 更新统计
      this.updateStats(startTime);

      // 播放响应
      this.setState('speaking');
      await this.playAudio(audioUrl);

      // 回调
      options.onResponse?.(response, audioUrl);

      // 继续监听下一轮对话
      this.setState('listening');
      await this.startListening(options);
    } catch (error) {
      logger.error('[ChatClawVoiceDialogueService] Processing failed:', error);
      options.onError?.(error instanceof Error ? error : new Error('处理失败'));
      this.setState('error');
    }
  }

  /**
   * 语音识别
   * 借鉴豆包的高准确率语音识别能力
   */
  private async transcribeAudio(audioBlob: Blob): Promise<string> {
    // 这里应该调用实际的 ASR API（如 Whisper、豆包语音等）
    // 目前使用模拟实现

    logger.info('[ChatClawVoiceDialogueService] Transcribing with model:', this.config.asrModel);

    // 模拟 API 调用延迟
    await new Promise(resolve => setTimeout(resolve, 500));

    // 模拟识别结果
    const mockTranscripts = [
      '你好，我想了解一下这个功能怎么用',
      '请帮我分析一下这个数据',
      '能给我一些建议吗',
      '谢谢你的帮助',
    ];

    return mockTranscripts[Math.floor(Math.random() * mockTranscripts.length)];
  }

  /**
   * AI 对话处理
   */
  private async processWithAI(transcript: string): Promise<string> {
    // 根据对话历史生成响应
    const thinkingMode = chatClawThinkingModeService.autoSelectMode(transcript);
    const config = chatClawThinkingModeService.getModeConfig(thinkingMode);

    // 构建消息
    const messages = [
      ...this.conversationHistory.slice(-5), // 保留最近 5 轮对话
      { role: 'user' as const, content: transcript },
    ];

    // 这里应该调用实际的 AI API
    // 目前使用模拟实现
    logger.info('[ChatClawVoiceDialogueService] Processing with AI model:', this.config.dialogueModel);

    await new Promise(resolve => setTimeout(resolve, 800));

    // 模拟响应
    const mockResponses = [
      '好的，我来为您详细介绍这个功能的使用方法。首先，您需要...',
      '根据您的数据，我发现了以下几点：第一...第二...',
      '我的建议是：1. 先进行数据分析 2. 然后制定计划 3. 最后执行',
      '不客气！如果还有其他问题，随时告诉我。',
    ];

    return mockResponses[Math.floor(Math.random() * mockResponses.length)];
  }

  /**
   * 语音合成
   * 借鉴豆包的情绪承接语音合成能力
   */
  private async synthesizeSpeech(text: string): Promise<string> {
    // 这里应该调用实际的 TTS API（如 ElevenLabs、豆包语音等）
    // 目前使用模拟实现

    logger.info('[ChatClawVoiceDialogueService] Synthesizing with model:', this.config.ttsModel);
    logger.info('[ChatClawVoiceDialogueService] Voice:', this.config.voice);
    logger.info('[ChatClawVoiceDialogueService] Emotion:', this.config.emotion);

    // 模拟 API 调用延迟
    await new Promise(resolve => setTimeout(resolve, 600));

    // 生成模拟音频 URL（实际应该是从 TTS API 返回的音频数据）
    const mockAudioUrl = `data:audio/wav;base64,${btoa('mock_audio_data')}`;

    return mockAudioUrl;
  }

  /**
   * 播放音频
   */
  private async playAudio(audioUrl: string): Promise<void> {
    return new Promise((resolve, reject) => {
      const audio = new Audio(audioUrl);

      audio.onended = () => {
        resolve();
      };

      audio.onerror = (error) => {
        reject(error);
      };

      audio.play().catch(reject);
    });
  }

  /**
   * 模拟 VAD（语音活动检测）
   */
  private simulateVAD(onSilence: () => void): void {
    // 简化实现：3 秒后触发静音检测
    setTimeout(() => {
      onSilence();
    }, 3000);
  }

  /**
   * 设置状态
   */
  private setState(state: VoiceDialogueState): void {
    this.state = state;
    eventBus.emit('voice-dialogue:state-change', { state });
    logger.info('[ChatClawVoiceDialogueService] State changed to:', state);
  }

  /**
   * 更新统计
   */
  private updateStats(startTime: number): void {
    const responseTime = Date.now() - startTime;
    this.stats.totalTurns++;
    this.stats.totalDuration += responseTime;
    this.stats.avgResponseTime = this.stats.totalDuration / this.stats.totalTurns;
  }

  /**
   * 清理资源
   */
  private cleanup(): void {
    if (this.stream) {
      this.stream.getTracks().forEach(track => track.stop());
      this.stream = null;
    }

    if (this.audioContext) {
      this.audioContext.close();
      this.audioContext = null;
    }

    this.mediaRecorder = null;
  }

  /**
   * 获取当前状态
   */
  getState(): VoiceDialogueState {
    return this.state;
  }

  /**
   * 获取对话历史
   */
  getConversationHistory(): Array<{ role: 'user' | 'assistant'; content: string; audioUrl?: string }> {
    return [...this.conversationHistory];
  }

  /**
   * 清空对话历史
   */
  clearHistory(): void {
    this.conversationHistory = [];
    logger.info('[ChatClawVoiceDialogueService] Conversation history cleared');
  }

  /**
   * 获取统计信息
   */
  getStats(): VoiceDialogueStats {
    return { ...this.stats };
  }

  /**
   * 设置方言
   */
  setDialect(dialect: string): void {
    this.config.dialect = dialect;
    logger.info('[ChatClawVoiceDialogueService] Dialect set to:', dialect);
  }

  /**
   * 设置音色
   */
  setVoice(voice: string): void {
    this.config.voice = voice;
    logger.info('[ChatClawVoiceDialogueService] Voice set to:', voice);
  }

  /**
   * 设置情绪风格
   */
  setEmotion(emotion: VoiceDialogueConfig['emotion']): void {
    this.config.emotion = emotion;
    logger.info('[ChatClawVoiceDialogueService] Emotion set to:', emotion);
  }

  /**
   * 启用低延迟模式
   * 借鉴豆包的 20ms 延迟
   */
  enableLowLatencyMode(): void {
    this.config.silenceTimeout = 500;
    logger.info('[ChatClawVoiceDialogueService] Low latency mode enabled');
  }

  /**
   * 检查浏览器支持
   */
  static checkBrowserSupport(): {
    supported: boolean;
    missingFeatures: string[];
  } {
    const missingFeatures: string[] = [];

    if (!navigator.mediaDevices) {
      missingFeatures.push('mediaDevices');
    }

    if (!window.AudioContext && !(window as any).webkitAudioContext) {
      missingFeatures.push('AudioContext');
    }

    if (!window.MediaRecorder) {
      missingFeatures.push('MediaRecorder');
    }

    return {
      supported: missingFeatures.length === 0,
      missingFeatures,
    };
  }
}

// 导出单例实例
export const chatClawVoiceDialogueService = new ChatClawVoiceDialogueService();
