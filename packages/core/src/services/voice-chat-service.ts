// 语音对话服务
// 提供完整的语音交互流程，包括语音识别、处理和合成

import { logger } from '../utils/logger';
import { eventBus } from '../utils/event-bus';
import { VoiceManager } from '../utils/voice-manager';
import { VoiceWakeService } from './voice-wake-service';

/**
 * 语音对话配置
 */
export interface VoiceChatConfig {
  enableVoiceResponse: boolean;
  voiceResponseDelay: number; // 毫秒
  enableVoiceConfirmation: boolean;
  voiceConfirmationText: string;
  enableEndOfSpeechDetection: boolean;
  endOfSpeechTimeout: number; // 毫秒
}

/**
 * 语音对话服务
 */
export class VoiceChatService {
  private voiceManager: VoiceManager;
  private voiceWakeService: VoiceWakeService;
  private config: VoiceChatConfig;
  private isProcessing: boolean = false;
  private endOfSpeechTimer: NodeJS.Timeout | null = null;
  private conversationHistory: string[] = [];
  private maxHistoryLength: number = 10;

  constructor(voiceManager: VoiceManager, voiceWakeService: VoiceWakeService) {
    this.voiceManager = voiceManager;
    this.voiceWakeService = voiceWakeService;
    this.config = {
      enableVoiceResponse: true,
      voiceResponseDelay: 500,
      enableVoiceConfirmation: true,
      voiceConfirmationText: '我在听',
      enableEndOfSpeechDetection: true,
      endOfSpeechTimeout: 1500,
    };

    this.setupEventListeners();
  }

  /**
   * 设置事件监听器
   */
  private setupEventListeners(): void {
    // 监听语音命令
    eventBus.on('voice:command', (command: string) => {
      this.handleVoiceCommand(command);
    });

    // 监听聊天消息
    eventBus.on('chat:message-received', (message: any) => {
      this.handleChatMessage(message);
    });

    // 监听唤醒事件
    eventBus.on('voice:wake-detected', () => {
      this.handleWakeDetected();
    });

    // 监听语音识别结果
    eventBus.on('voice:final-result', (transcript: string) => {
      this.handleSpeechResult(transcript);
    });
  }

  /**
   * 启动语音对话服务
   */
  start(): void {
    this.voiceWakeService.start();
    logger.info('[VoiceChatService] Voice chat service started');
  }

  /**
   * 停止语音对话服务
   */
  stop(): void {
    this.voiceWakeService.stop();
    this.clearEndOfSpeechTimer();
    this.conversationHistory = [];
    logger.info('[VoiceChatService] Voice chat service stopped');
  }

  /**
   * 处理语音命令
   */
  private handleVoiceCommand(command: string): void {
    if (this.isProcessing) return;

    this.isProcessing = true;
    this.addToHistory(`User: ${command}`);

    logger.info(`[VoiceChatService] Processing voice command: ${command}`);

    // 发送消息到聊天服务
    eventBus.emit('chat:send-message', {
      content: command,
      isVoice: true,
    });

    // 重置语音检测计时器
    this.resetEndOfSpeechTimer();
  }

  /**
   * 处理聊天消息
   */
  private handleChatMessage(message: any): void {
    if (!message || !message.content) return;

    this.addToHistory(`Assistant: ${message.content}`);

    // 如果启用语音响应，朗读回复
    if (this.config.enableVoiceResponse) {
      setTimeout(() => {
        this.speakResponse(message.content);
      }, this.config.voiceResponseDelay);
    }

    this.isProcessing = false;
  }

  /**
   * 处理唤醒事件
   */
  private handleWakeDetected(): void {
    if (this.config.enableVoiceConfirmation) {
      this.voiceManager.speak(this.config.voiceConfirmationText);
    }
  }

  /**
   * 处理语音识别结果
   */
  private handleSpeechResult(transcript: string): void {
    // 重置语音检测计时器
    this.resetEndOfSpeechTimer();
  }

  /**
   * 朗读回复
   */
  private speakResponse(text: string): void {
    // 停止当前的语音播放
    this.voiceManager.stopSpeaking();

    // 过滤文本，移除不需要朗读的内容（如代码块）
    const cleanedText = this.cleanTextForSpeech(text);

    // 朗读清理后的文本
    this.voiceManager.speak(cleanedText);
    logger.info('[VoiceChatService] Speaking response');
  }

  /**
   * 清理文本以适合语音朗读
   */
  private cleanTextForSpeech(text: string): string {
    // 移除代码块
    let cleaned = text.replace(/```[\s\S]*?```/g, '');
    // 移除Markdown标记
    cleaned = cleaned.replace(/#{1,6}\s/g, ''); // 标题
    cleaned = cleaned.replace(/\*\*(.*?)\*\*/g, '$1'); // 粗体
    cleaned = cleaned.replace(/\*(.*?)\*/g, '$1'); // 斜体
    cleaned = cleaned.replace(/\[(.*?)\]\(.*?\)/g, '$1'); // 链接
    // 移除多余的空白
    cleaned = cleaned.replace(/\s+/g, ' ').trim();
    return cleaned;
  }

  /**
   * 重置语音结束检测计时器
   */
  private resetEndOfSpeechTimer(): void {
    if (!this.config.enableEndOfSpeechDetection) return;

    this.clearEndOfSpeechTimer();
    this.endOfSpeechTimer = setTimeout(() => {
      logger.info('[VoiceChatService] End of speech detected');
      eventBus.emit('voice:end-of-speech', undefined);
    }, this.config.endOfSpeechTimeout);
  }

  /**
   * 清除语音结束检测计时器
   */
  private clearEndOfSpeechTimer(): void {
    if (this.endOfSpeechTimer) {
      clearTimeout(this.endOfSpeechTimer);
      this.endOfSpeechTimer = null;
    }
  }

  /**
   * 添加到对话历史
   */
  private addToHistory(entry: string): void {
    this.conversationHistory.push(entry);
    if (this.conversationHistory.length > this.maxHistoryLength) {
      this.conversationHistory.shift();
    }
  }

  /**
   * 获取对话历史
   */
  getConversationHistory(): string[] {
    return [...this.conversationHistory];
  }

  /**
   * 清除对话历史
   */
  clearConversationHistory(): void {
    this.conversationHistory = [];
  }

  /**
   * 设置语音响应
   */
  setVoiceResponse(enabled: boolean): void {
    this.config.enableVoiceResponse = enabled;
    logger.info('[VoiceChatService] Voice response', enabled ? 'enabled' : 'disabled');
  }

  /**
   * 设置语音确认
   */
  setVoiceConfirmation(enabled: boolean, text?: string): void {
    this.config.enableVoiceConfirmation = enabled;
    if (text) {
      this.config.voiceConfirmationText = text;
    }
    logger.info('[VoiceChatService] Voice confirmation', enabled ? 'enabled' : 'disabled');
  }

  /**
   * 设置语音结束检测
   */
  setEndOfSpeechDetection(enabled: boolean, timeout?: number): void {
    this.config.enableEndOfSpeechDetection = enabled;
    if (timeout) {
      this.config.endOfSpeechTimeout = timeout;
    }
    logger.info('[VoiceChatService] End of speech detection', enabled ? 'enabled' : 'disabled');
  }

  /**
   * 获取当前状态
   */
  getStatus(): {
    isProcessing: boolean;
    isListening: boolean;
    isSpeaking: boolean;
    conversationHistoryLength: number;
  } {
    return {
      isProcessing: this.isProcessing,
      isListening: this.voiceManager.isRecording(),
      isSpeaking: this.voiceManager.isSpeakingNow(),
      conversationHistoryLength: this.conversationHistory.length,
    };
  }

  /**
   * 获取配置
   */
  getConfig(): VoiceChatConfig {
    return { ...this.config };
  }

  /**
   * 更新配置
   */
  updateConfig(config: Partial<VoiceChatConfig>): void {
    this.config = { ...this.config, ...config };
    logger.info('[VoiceChatService] Config updated:', this.config);
  }

  /**
   * 手动触发语音识别
   */
  startVoiceInput(): boolean {
    return this.voiceManager.startRecording();
  }

  /**
   * 手动停止语音识别
   */
  stopVoiceInput(): boolean {
    return this.voiceManager.stopRecording();
  }

  /**
   * 手动触发语音输出
   */
  speak(text: string): boolean {
    return this.voiceManager.speak(text);
  }

  /**
   * 停止语音输出
   */
  stopSpeaking(): void {
    this.voiceManager.stopSpeaking();
  }
}
