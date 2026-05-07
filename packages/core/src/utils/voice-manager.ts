// 语音管理器
// 提供语音输入（STT）和语音输出（TTS）功能

import { logger } from './logger';
import { eventBus } from './event-bus';

// 使用 any 类型来避免 TypeScript 错误
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type SpeechRecognitionType = any;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type SpeechRecognitionEventType = any;

/**
 * 语音输入（STT）配置
 */
export interface STTConfig {
  language: string;
  continuous: boolean;
  interimResults: boolean;
}

/**
 * 语音输出（TTS）配置
 */
export interface TTSConfig {
  voice: SpeechSynthesisVoice | null;
  rate: number;
  pitch: number;
  volume: number;
}

/**
 * 语音管理器
 */
export class VoiceManager {
  private recognition: SpeechRecognitionType | null = null;
  private synthesis: SpeechSynthesis | null = null;
  private isListening: boolean = false;
  private isSpeaking: boolean = false;
  private sttConfig: STTConfig = {
    language: 'zh-CN',
    continuous: true,
    interimResults: true,
  };
  private ttsConfig: TTSConfig = {
    voice: null,
    rate: 1.0,
    pitch: 1.0,
    volume: 1.0,
  };

  private initialized: boolean = false;

  constructor() {
    // 延迟初始化，避免在服务端渲染时执行
    if (typeof window !== 'undefined') {
      this.initialize();
    }
  }

  /**
   * 初始化语音功能
   */
  private initialize(): void {
    if (this.initialized) return;
    
    // 只在浏览器环境中初始化
    if (typeof window === 'undefined') {
      logger.info('[VoiceManager] Running in server environment, skipping initialization');
      return;
    }
    
    this.initialized = true;

    // 初始化语音识别（STT）
    if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
      const SpeechRecognitionAPI = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      this.recognition = new SpeechRecognitionAPI();
      this.setupRecognition();
      logger.info('[VoiceManager] Speech recognition initialized');
    } else {
      logger.warn('[VoiceManager] Speech recognition not supported');
    }

    // 初始化语音合成（TTS）
    if ('speechSynthesis' in window) {
      this.synthesis = window.speechSynthesis;
      this.loadVoices();
      
      // 某些浏览器需要等待 voices loaded 事件
      if (speechSynthesis.onvoiceschanged !== undefined) {
        speechSynthesis.onvoiceschanged = () => this.loadVoices();
      }
      
      logger.info('[VoiceManager] Speech synthesis initialized');
    } else {
      logger.warn('[VoiceManager] Speech synthesis not supported');
    }
  }

  /**
   * 设置语音识别事件
   */
  private setupRecognition(): void {
    if (!this.recognition) return;

    this.recognition.continuous = this.sttConfig.continuous;
    this.recognition.interimResults = this.sttConfig.interimResults;
    this.recognition.lang = this.sttConfig.language;

    this.recognition.onstart = () => {
      this.isListening = true;
      eventBus.emit('voice:recording-started', undefined);
      logger.info('[VoiceManager] Recording started');
    };

    this.recognition.onresult = (event: SpeechRecognitionEventType) => {
      let finalTranscript = '';
      let interimTranscript = '';

      for (let i = event.resultIndex; i < event.results.length; i++) {
        const transcript = event.results[i][0].transcript;
        if (event.results[i].isFinal) {
          finalTranscript += transcript;
        } else {
          interimTranscript += transcript;
        }
      }

      if (finalTranscript) {
        eventBus.emit('voice:final-result', finalTranscript);
      }
      if (interimTranscript) {
        eventBus.emit('voice:interim-result', interimTranscript);
      }
    };

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    this.recognition.onerror = (event: any) => {
      logger.error('[VoiceManager] Recognition error:', event.error);
      eventBus.emit('voice:error', event.error);
      this.isListening = false;
    };

    this.recognition.onend = () => {
      this.isListening = false;
      eventBus.emit('voice:recording-stopped', undefined);
      logger.info('[VoiceManager] Recording stopped');
    };
  }

  /**
   * 加载可用的语音
   */
  private loadVoices(): void {
    if (!this.synthesis) return;

    const voices = this.synthesis.getVoices();
    
    // 优先选择中文语音
    const zhVoice = voices.find(v => v.lang.startsWith('zh'));
    if (zhVoice) {
      this.ttsConfig.voice = zhVoice;
    } else if (voices.length > 0) {
      this.ttsConfig.voice = voices[0];
    }

    eventBus.emit('voice:voices-loaded', voices);
    logger.info('[VoiceManager] Loaded', voices.length, 'voices');
  }

  /**
   * 开始语音识别
   */
  startRecording(): boolean {
    if (!this.recognition) {
      logger.warn('[VoiceManager] Recognition not available');
      return false;
    }

    if (this.isListening) {
      logger.warn('[VoiceManager] Already recording');
      return false;
    }

    try {
      this.recognition.start();
      return true;
    } catch (error) {
      logger.error('[VoiceManager] Failed to start recording:', error);
      return false;
    }
  }

  /**
   * 停止语音识别
   */
  stopRecording(): boolean {
    if (!this.recognition) return false;

    try {
      this.recognition.stop();
      return true;
    } catch (error) {
      logger.error('[VoiceManager] Failed to stop recording:', error);
      return false;
    }
  }

  /**
   * 语音合成（朗读文本）
   */
  speak(text: string): boolean {
    if (!this.synthesis) {
      logger.warn('[VoiceManager] Synthesis not available');
      return false;
    }

    // 停止当前播放
    this.stopSpeaking();

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.voice = this.ttsConfig.voice;
    utterance.rate = this.ttsConfig.rate;
    utterance.pitch = this.ttsConfig.pitch;
    utterance.volume = this.ttsConfig.volume;
    utterance.lang = 'zh-CN';

    utterance.onstart = () => {
      this.isSpeaking = true;
      eventBus.emit('voice:speaking-started', undefined);
      logger.info('[VoiceManager] Started speaking');
    };

    utterance.onend = () => {
      this.isSpeaking = false;
      eventBus.emit('voice:speaking-ended', undefined);
      logger.info('[VoiceManager] Finished speaking');
    };

    utterance.onerror = (event) => {
      // 'interrupted' 和 'canceled' 是正常的用户操作，不需要记录为错误
      if (event.error === 'interrupted' || event.error === 'canceled') {
        logger.info('[VoiceManager] Speech', event.error);
      } else {
        logger.error('[VoiceManager] Speech error:', event.error);
      }
      this.isSpeaking = false;
      eventBus.emit('voice:speaking-ended', undefined);
    };

    this.synthesis.speak(utterance);
    return true;
  }

  /**
   * 停止语音播放
   */
  stopSpeaking(): void {
    if (!this.synthesis) return;

    this.synthesis.cancel();
    this.isSpeaking = false;
    eventBus.emit('voice:speaking-stopped', undefined);
    logger.info('[VoiceManager] Stopped speaking');
  }

  /**
   * 暂停语音播放
   */
  pauseSpeaking(): void {
    if (!this.synthesis) return;

    this.synthesis.pause();
    eventBus.emit('voice:speaking-paused', undefined);
    logger.info('[VoiceManager] Paused speaking');
  }

  /**
   * 恢复语音播放
   */
  resumeSpeaking(): void {
    if (!this.synthesis) return;

    this.synthesis.resume();
    eventBus.emit('voice:speaking-resumed', undefined);
    logger.info('[VoiceManager] Resumed speaking');
  }

  /**
   * 获取可用的语音列表
   */
  getVoices(): SpeechSynthesisVoice[] {
    if (!this.synthesis) return [];
    return this.synthesis.getVoices();
  }

  /**
   * 设置语音
   */
  setVoice(voice: SpeechSynthesisVoice): void {
    this.ttsConfig.voice = voice;
    logger.info('[VoiceManager] Voice set to:', voice.name);
  }

  /**
   * 设置语速
   */
  setRate(rate: number): void {
    this.ttsConfig.rate = Math.max(0.1, Math.min(2.0, rate));
    logger.info('[VoiceManager] Rate set to:', this.ttsConfig.rate);
  }

  /**
   * 设置音调
   */
  setPitch(pitch: number): void {
    this.ttsConfig.pitch = Math.max(0.1, Math.min(2.0, pitch));
    logger.info('[VoiceManager] Pitch set to:', this.ttsConfig.pitch);
  }

  /**
   * 设置音量
   */
  setVolume(volume: number): void {
    this.ttsConfig.volume = Math.max(0, Math.min(1.0, volume));
    logger.info('[VoiceManager] Volume set to:', this.ttsConfig.volume);
  }

  /**
   * 设置识别语言
   */
  setLanguage(language: string): void {
    this.sttConfig.language = language;
    if (this.recognition) {
      this.recognition.lang = language;
    }
    logger.info('[VoiceManager] Language set to:', language);
  }

  /**
   * 是否正在录音
   */
  isRecording(): boolean {
    return this.isListening;
  }

  /**
   * 是否正在播放
   */
  isSpeakingNow(): boolean {
    return this.isSpeaking;
  }

  /**
   * 检查是否支持语音识别
   */
  supportsRecognition(): boolean {
    return this.recognition !== null;
  }

  /**
   * 检查是否支持语音合成
   */
  supportsSynthesis(): boolean {
    return this.synthesis !== null;
  }
}

// 注意：单例实例通过 core/index.ts 中的 getVoiceManager() 函数导出
// 避免在模块加载时直接实例化，以支持 SSR
