// 语音唤醒服务
// 提供语音唤醒词检测和语音对话模式功能

import { logger } from '../utils/logger';
import { eventBus } from '../utils/event-bus';
import { VoiceManager } from '../utils/voice-manager';

/**
 * 语音唤醒配置
 */
export interface VoiceWakeConfig {
  wakeWords: string[];
  sensitivity: number; // 0.0 - 1.0
  enableContinuousListening: boolean;
  enableAutoResponse: boolean;
  responseDelay: number; // 毫秒
}

/**
 * 语音唤醒服务
 */
export class VoiceWakeService {
  private voiceManager: VoiceManager;
  private config: VoiceWakeConfig;
  private isWakeWordDetected: boolean = false;
  private isActive: boolean = false;
  private wakeWordDetectionInterval: NodeJS.Timeout | null = null;
  private continuousListeningInterval: NodeJS.Timeout | null = null;
  private lastSpeechTime: number = 0;
  private audioContext: AudioContext | null = null;
  private mediaStream: MediaStream | null = null;
  private analyser: AnalyserNode | null = null;
  private scriptProcessor: ScriptProcessorNode | null = null;
  private speechBuffer: string = '';
  private maxBufferLength: number = 1000;

  constructor(voiceManager: VoiceManager) {
    this.voiceManager = voiceManager;
    this.config = {
      wakeWords: ['你好豆包', '嗨豆包', '豆包'],
      sensitivity: 0.7,
      enableContinuousListening: true,
      enableAutoResponse: true,
      responseDelay: 1000,
    };

    this.setupEventListeners();
  }

  /**
   * 设置事件监听器
   */
  private setupEventListeners(): void {
    eventBus.on('voice:final-result', (transcript: string) => {
      this.processSpeechTranscript(transcript);
    });

    eventBus.on('voice:speaking-ended', () => {
      // 语音播放结束后，恢复监听
      if (this.isActive && this.config.enableContinuousListening) {
        this.startContinuousListening();
      }
    });
  }

  /**
   * 启动语音唤醒服务
   */
  start(): void {
    if (this.isActive) {
      logger.warn('[VoiceWakeService] Service already active');
      return;
    }

    this.isActive = true;
    this.startContinuousListening();
    logger.info('[VoiceWakeService] Voice wake service started');
  }

  /**
   * 停止语音唤醒服务
   */
  stop(): void {
    this.isActive = false;
    this.isWakeWordDetected = false;
    this.speechBuffer = '';

    if (this.wakeWordDetectionInterval) {
      clearInterval(this.wakeWordDetectionInterval);
      this.wakeWordDetectionInterval = null;
    }

    if (this.continuousListeningInterval) {
      clearInterval(this.continuousListeningInterval);
      this.continuousListeningInterval = null;
    }

    this.voiceManager.stopRecording();
    logger.info('[VoiceWakeService] Voice wake service stopped');
  }

  /**
   * 开始连续监听
   */
  private startContinuousListening(): void {
    if (!this.isActive || this.voiceManager.isRecording()) {
      return;
    }

    // 开始语音识别
    this.voiceManager.startRecording();
    logger.info('[VoiceWakeService] Started continuous listening');

    // 设置连续监听间隔，确保语音识别持续运行
    this.continuousListeningInterval = setInterval(() => {
      if (this.isActive && !this.voiceManager.isRecording()) {
        this.voiceManager.startRecording();
      }
    }, 5000);
  }

  /**
   * 处理语音识别结果
   */
  private processSpeechTranscript(transcript: string): void {
    if (!this.isActive) return;

    this.speechBuffer += transcript;
    
    // 限制缓冲区大小
    if (this.speechBuffer.length > this.maxBufferLength) {
      this.speechBuffer = this.speechBuffer.substring(this.speechBuffer.length - this.maxBufferLength);
    }

    this.lastSpeechTime = Date.now();

    if (!this.isWakeWordDetected) {
      // 检测唤醒词
      if (this.detectWakeWord(this.speechBuffer)) {
        this.handleWakeWordDetected();
      }
    } else {
      // 处理唤醒后的语音命令
      this.handleVoiceCommand(transcript);
    }
  }

  /**
   * 检测唤醒词
   */
  private detectWakeWord(transcript: string): boolean {
    const lowerTranscript = transcript.toLowerCase();
    
    for (const wakeWord of this.config.wakeWords) {
      if (lowerTranscript.includes(wakeWord.toLowerCase())) {
        logger.info(`[VoiceWakeService] Wake word detected: ${wakeWord}`);
        return true;
      }
    }
    
    return false;
  }

  /**
   * 处理唤醒词检测
   */
  private handleWakeWordDetected(): void {
    this.isWakeWordDetected = true;
    this.speechBuffer = '';
    
    // 播放唤醒确认音
    this.playWakeConfirmation();
    
    // 触发唤醒事件
    eventBus.emit('voice:wake-detected', undefined);
    logger.info('[VoiceWakeService] Wake word detected, entering active mode');

    // 30秒后如果没有语音输入，退出唤醒状态
    setTimeout(() => {
      if (this.isWakeWordDetected && Date.now() - this.lastSpeechTime > 30000) {
        this.exitWakeMode();
      }
    }, 30000);
  }

  /**
   * 处理语音命令
   */
  private handleVoiceCommand(command: string): void {
    if (!this.isWakeWordDetected) return;

    logger.info(`[VoiceWakeService] Voice command received: ${command}`);
    
    // 触发语音命令事件
    eventBus.emit('voice:command', command);

    // 如果启用自动响应，发送命令到聊天服务
    if (this.config.enableAutoResponse) {
      eventBus.emit('chat:send-message', { content: command, isVoice: true });
    }
  }

  /**
   * 退出唤醒模式
   */
  private exitWakeMode(): void {
    this.isWakeWordDetected = false;
    this.speechBuffer = '';
    logger.info('[VoiceWakeService] Exited wake mode');
  }

  /**
   * 播放唤醒确认音
   */
  private playWakeConfirmation(): void {
    // 使用Web Audio API播放简单的确认音
    try {
      if (!this.audioContext) {
        this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      }

      const oscillator = this.audioContext.createOscillator();
      const gainNode = this.audioContext.createGain();

      oscillator.connect(gainNode);
      gainNode.connect(this.audioContext.destination);

      oscillator.frequency.setValueAtTime(800, this.audioContext.currentTime);
      oscillator.frequency.exponentialRampToValueAtTime(400, this.audioContext.currentTime + 0.1);

      gainNode.gain.setValueAtTime(0.3, this.audioContext.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, this.audioContext.currentTime + 0.1);

      oscillator.start(this.audioContext.currentTime);
      oscillator.stop(this.audioContext.currentTime + 0.1);
    } catch (error) {
      logger.error('[VoiceWakeService] Error playing wake confirmation:', error);
    }
  }

  /**
   * 设置唤醒词
   */
  setWakeWords(words: string[]): void {
    this.config.wakeWords = words;
    logger.info('[VoiceWakeService] Wake words updated:', words);
  }

  /**
   * 设置灵敏度
   */
  setSensitivity(sensitivity: number): void {
    this.config.sensitivity = Math.max(0.0, Math.min(1.0, sensitivity));
    logger.info('[VoiceWakeService] Sensitivity set to:', this.config.sensitivity);
  }

  /**
   * 启用/禁用连续监听
   */
  setContinuousListening(enabled: boolean): void {
    this.config.enableContinuousListening = enabled;
    logger.info('[VoiceWakeService] Continuous listening', enabled ? 'enabled' : 'disabled');
  }

  /**
   * 启用/禁用自动响应
   */
  setAutoResponse(enabled: boolean): void {
    this.config.enableAutoResponse = enabled;
    logger.info('[VoiceWakeService] Auto response', enabled ? 'enabled' : 'disabled');
  }

  /**
   * 获取当前状态
   */
  getStatus(): {
    isActive: boolean;
    isWakeWordDetected: boolean;
    isListening: boolean;
  } {
    return {
      isActive: this.isActive,
      isWakeWordDetected: this.isWakeWordDetected,
      isListening: this.voiceManager.isRecording(),
    };
  }

  /**
   * 获取配置
   */
  getConfig(): VoiceWakeConfig {
    return { ...this.config };
  }

  /**
   * 更新配置
   */
  updateConfig(config: Partial<VoiceWakeConfig>): void {
    this.config = { ...this.config, ...config };
    logger.info('[VoiceWakeService] Config updated:', this.config);
  }
}
