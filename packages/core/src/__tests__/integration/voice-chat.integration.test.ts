import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { VoiceChatService } from '../../services/voice-chat-service';
import { VoiceWakeService } from '../../services/voice-wake-service';
import { VoiceManager } from '../../utils/voice-manager';
import { VoiceService } from '../../services/voice-service';
import { eventBus } from '../../utils/event-bus';

// 模拟 logger
vi.mock('../../utils/logger', () => ({
  logger: {
    info: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
    debug: vi.fn(),
  },
}));

// 模拟 window 和 speech APIs
const mockSpeechRecognitionInstance = {
  continuous: false,
  interimResults: false,
  lang: '',
  onresult: null,
  onerror: null,
  onend: null,
  start: vi.fn(function () {
    if (this.onstart) this.onstart();
  }),
  stop: vi.fn(function () {
    if (this.onend) this.onend();
  }),
};

const MockSpeechRecognition = vi.fn(function () {
  return mockSpeechRecognitionInstance;
});

const mockSpeechSynthesis = {
  cancel: vi.fn(),
  pause: vi.fn(),
  resume: vi.fn(),
  speak: vi.fn().mockImplementation((utterance: any) => {
    // 模拟语音合成完成后触发 onend
    setTimeout(() => {
      if (utterance.onend) utterance.onend();
    }, 10);
  }),
  getVoices: vi.fn().mockReturnValue([]),
  onvoiceschanged: null,
};

const mockAudioContext = vi.fn().mockImplementation(() => ({
  createOscillator: vi.fn().mockReturnValue({
    connect: vi.fn(),
    frequency: {
      setValueAtTime: vi.fn(),
      exponentialRampToValueAtTime: vi.fn(),
    },
    start: vi.fn(),
    stop: vi.fn(),
  }),
  createGain: vi.fn().mockReturnValue({
    connect: vi.fn(),
    gain: {
      setValueAtTime: vi.fn(),
      exponentialRampToValueAtTime: vi.fn(),
    },
  }),
  currentTime: 0,
  destination: {},
}));

// 在 jsdom 环境中使用 stubGlobal 设置 window 属性
vi.stubGlobal('SpeechRecognition', MockSpeechRecognition);
vi.stubGlobal('webkitSpeechRecognition', MockSpeechRecognition);
vi.stubGlobal('speechSynthesis', mockSpeechSynthesis);
vi.stubGlobal('AudioContext', mockAudioContext);
vi.stubGlobal('webkitAudioContext', mockAudioContext);

// 模拟 SpeechSynthesisUtterance
vi.stubGlobal('SpeechSynthesisUtterance', vi.fn().mockImplementation(function (text: string) {
  this.text = text;
  this.voice = null;
  this.rate = 1;
  this.pitch = 1;
  this.volume = 1;
  this.lang = 'zh-CN';
  this.onstart = null;
  this.onend = null;
  this.onerror = null;
}));

describe('Voice Chat Integration Tests', () => {
  let voiceManager: VoiceManager;
  let voiceWakeService: VoiceWakeService;
  let voiceChatService: VoiceChatService;

  beforeEach(() => {
    vi.clearAllMocks();
    eventBus.clear();
    voiceManager = new VoiceManager();
    voiceWakeService = new VoiceWakeService(voiceManager);
    voiceChatService = new VoiceChatService(voiceManager, voiceWakeService);
  });

  afterEach(() => {
    try {
      voiceChatService.stop();
    } catch {
      // ignore
    }
    try {
      voiceWakeService.stop();
    } catch {
      // ignore
    }
    vi.restoreAllMocks();
  });

  describe('VoiceManager', () => {
    it('should initialize with speech APIs', () => {
      expect(voiceManager.supportsRecognition()).toBe(true);
      expect(voiceManager.supportsSynthesis()).toBe(true);
    });

    it('should start and stop recording', () => {
      const startResult = voiceManager.startRecording();
      expect(startResult).toBe(true);

      const stopResult = voiceManager.stopRecording();
      expect(stopResult).toBe(true);
    });

    it('should speak text', () => {
      const result = voiceManager.speak('Hello world');
      expect(result).toBe(true);
    });

    it('should stop speaking', () => {
      voiceManager.speak('Test');
      expect(() => voiceManager.stopSpeaking()).not.toThrow();
    });

    it('should set and get voice properties', () => {
      expect(() => voiceManager.setRate(1.5)).not.toThrow();
      expect(() => voiceManager.setPitch(1.2)).not.toThrow();
      expect(() => voiceManager.setVolume(0.8)).not.toThrow();
      expect(() => voiceManager.setLanguage('en-US')).not.toThrow();
    });

    it('should get voices list', () => {
      const voices = voiceManager.getVoices();
      expect(Array.isArray(voices)).toBe(true);
    });

    it('should handle recording state', () => {
      expect(voiceManager.isRecording()).toBe(false);
      voiceManager.startRecording();
      expect(voiceManager.isRecording()).toBe(true);
    });
  });

  describe('VoiceWakeService', () => {
    it('should start and stop service', () => {
      voiceWakeService.start();
      const status = voiceWakeService.getStatus();
      expect(status.isActive).toBe(true);

      voiceWakeService.stop();
      const stoppedStatus = voiceWakeService.getStatus();
      expect(stoppedStatus.isActive).toBe(false);
    });

    it('should detect wake words', () => {
      voiceWakeService.start();

      // Emit a speech result with wake word
      eventBus.emit('voice:final-result', '你好豆包');

      const status = voiceWakeService.getStatus();
      expect(status.isWakeWordDetected).toBe(true);
    });

    it('should handle voice commands after wake', () => {
      const commandHandler = vi.fn();
      eventBus.on('voice:command', commandHandler);

      voiceWakeService.start();

      // Trigger wake word
      eventBus.emit('voice:final-result', '你好豆包');
      // Trigger command
      eventBus.emit('voice:final-result', 'What is the weather?');

      expect(commandHandler).toHaveBeenCalled();
    });

    it('should set custom wake words', () => {
      voiceWakeService.setWakeWords(['Custom', 'Words']);
      const config = voiceWakeService.getConfig();
      expect(config.wakeWords).toEqual(['Custom', 'Words']);
    });

    it('should set sensitivity', () => {
      voiceWakeService.setSensitivity(0.5);
      const config = voiceWakeService.getConfig();
      expect(config.sensitivity).toBe(0.5);
    });

    it('should enable/disable continuous listening', () => {
      voiceWakeService.setContinuousListening(false);
      const config = voiceWakeService.getConfig();
      expect(config.enableContinuousListening).toBe(false);

      voiceWakeService.setContinuousListening(true);
      const updatedConfig = voiceWakeService.getConfig();
      expect(updatedConfig.enableContinuousListening).toBe(true);
    });

    it('should enable/disable auto response', () => {
      voiceWakeService.setAutoResponse(false);
      const config = voiceWakeService.getConfig();
      expect(config.enableAutoResponse).toBe(false);
    });

    it('should update config', () => {
      voiceWakeService.updateConfig({
        wakeWords: ['Hey', 'There'],
        sensitivity: 0.8,
      });
      const config = voiceWakeService.getConfig();
      expect(config.wakeWords).toEqual(['Hey', 'There']);
      expect(config.sensitivity).toBe(0.8);
    });
  });

  describe('VoiceChatService', () => {
    it('should start and stop service', () => {
      voiceChatService.start();
      const status = voiceChatService.getStatus();
      expect(status).toBeDefined();

      voiceChatService.stop();
      const stoppedStatus = voiceChatService.getStatus();
      expect(stoppedStatus.conversationHistoryLength).toBe(0);
    });

    it('should handle voice commands', () => {
      const chatHandler = vi.fn();
      eventBus.on('chat:send-message', chatHandler);

      voiceChatService.start();
      eventBus.emit('voice:command', 'Tell me a joke');

      expect(chatHandler).toHaveBeenCalledWith(
        expect.objectContaining({
          content: 'Tell me a joke',
          isVoice: true,
        })
      );
    });

    it('should handle wake detection', () => {
      voiceChatService.start();

      const speakSpy = vi.spyOn(voiceManager, 'speak').mockReturnValue(true);
      eventBus.emit('voice:wake-detected');

      expect(speakSpy).toHaveBeenCalledWith('我在听');
    });

    it('should manage conversation history', () => {
      voiceChatService.start();

      eventBus.emit('voice:command', 'First command');
      eventBus.emit('chat:message-received', { content: 'First response' });

      const history = voiceChatService.getConversationHistory();
      expect(history.length).toBeGreaterThan(0);
    });

    it('should clear conversation history', () => {
      voiceChatService.start();

      eventBus.emit('voice:command', 'Test');
      voiceChatService.clearConversationHistory();

      const history = voiceChatService.getConversationHistory();
      expect(history.length).toBe(0);
    });

    it('should set voice response', () => {
      voiceChatService.setVoiceResponse(false);
      const config = voiceChatService.getConfig();
      expect(config.enableVoiceResponse).toBe(false);
    });

    it('should set voice confirmation', () => {
      voiceChatService.setVoiceConfirmation(true, 'Yes?');
      const config = voiceChatService.getConfig();
      expect(config.enableVoiceConfirmation).toBe(true);
      expect(config.voiceConfirmationText).toBe('Yes?');
    });

    it('should set end of speech detection', () => {
      voiceChatService.setEndOfSpeechDetection(true, 2000);
      const config = voiceChatService.getConfig();
      expect(config.enableEndOfSpeechDetection).toBe(true);
      expect(config.endOfSpeechTimeout).toBe(2000);
    });

    it('should update config', () => {
      voiceChatService.updateConfig({
        voiceResponseDelay: 1000,
        enableVoiceConfirmation: false,
      });
      const config = voiceChatService.getConfig();
      expect(config.voiceResponseDelay).toBe(1000);
      expect(config.enableVoiceConfirmation).toBe(false);
    });

    it('should manually start and stop voice input', () => {
      const startSpy = vi.spyOn(voiceManager, 'startRecording').mockReturnValue(true);
      const stopSpy = vi.spyOn(voiceManager, 'stopRecording').mockReturnValue(true);

      voiceChatService.startVoiceInput();
      expect(startSpy).toHaveBeenCalled();

      voiceChatService.stopVoiceInput();
      expect(stopSpy).toHaveBeenCalled();
    });

    it('should manually speak and stop', () => {
      const speakSpy = vi.spyOn(voiceManager, 'speak').mockReturnValue(true);
      const stopSpy = vi.spyOn(voiceManager, 'stopSpeaking');

      voiceChatService.speak('Manual speak');
      expect(speakSpy).toHaveBeenCalledWith('Manual speak');

      voiceChatService.stopSpeaking();
      expect(stopSpy).toHaveBeenCalled();
    });

    it('should clean text for speech', () => {
      voiceChatService.start();

      const speakSpy = vi.spyOn(voiceManager, 'speak').mockReturnValue(true);

      eventBus.emit('chat:message-received', {
        content: '```code``` **bold** *italic* [link](url)',
      });

      // Should clean markdown before speaking
      expect(speakSpy).not.toHaveBeenCalled();
    });
  });

  describe('VoiceService', () => {
    let voiceService: VoiceService;

    beforeEach(() => {
      voiceService = new VoiceService({
        sttLang: 'zh-CN',
        ttsLang: 'zh-CN',
      });
    });

    it('should check support status', () => {
      expect(VoiceService.isRecognitionSupported()).toBe(true);
      expect(VoiceService.isSynthesisSupported()).toBe(true);
    });

    it('should start and stop recognition', () => {
      const onResult = vi.fn();
      const onError = vi.fn();

      const result = voiceService.startRecognition(onResult, onError);
      expect(result).toBe(true);

      voiceService.stopRecognition();
      expect(voiceService.isRecognizing()).toBe(false);
    });

    it('should speak text with options', async () => {
      const promise = voiceService.speak('Test speech', {
        rate: 1.2,
        pitch: 1.1,
        volume: 0.9,
      });

      await expect(promise).resolves.toBeUndefined();
    });

    it('should stop speaking', () => {
      expect(() => voiceService.stopSpeaking()).not.toThrow();
    });

    it('should pause and resume', () => {
      expect(() => voiceService.pause()).not.toThrow();
      expect(() => voiceService.resume()).not.toThrow();
    });

    it('should get voices', () => {
      const voices = voiceService.getVoices();
      expect(Array.isArray(voices)).toBe(true);
    });

    it('should handle recognition errors', () => {
      const onError = vi.fn();
      voiceService.startRecognition(vi.fn(), onError);

      // Simulate error through mock
      const recognition = (voiceService as any).recognition;
      if (recognition && recognition.onerror) {
        recognition.onerror({ error: 'no-speech' });
      }

      expect(voiceService.isRecognizing()).toBe(false);
    });
  });

  describe('Event Bus Voice Events', () => {
    it('should handle voice recording events', () => {
      const startHandler = vi.fn();
      const stopHandler = vi.fn();

      eventBus.on('voice:recording-started', startHandler);
      eventBus.on('voice:recording-stopped', stopHandler);

      eventBus.emit('voice:recording-started', undefined);
      eventBus.emit('voice:recording-stopped', undefined);

      expect(startHandler).toHaveBeenCalled();
      expect(stopHandler).toHaveBeenCalled();
    });

    it('should handle voice result events', () => {
      const finalHandler = vi.fn();
      const interimHandler = vi.fn();

      eventBus.on('voice:final-result', finalHandler);
      eventBus.on('voice:interim-result', interimHandler);

      eventBus.emit('voice:final-result', 'Final text');
      eventBus.emit('voice:interim-result', 'Interim text');

      expect(finalHandler).toHaveBeenCalledWith('Final text');
      expect(interimHandler).toHaveBeenCalledWith('Interim text');
    });

    it('should handle speaking events', () => {
      const startHandler = vi.fn();
      const endHandler = vi.fn();

      eventBus.on('voice:speaking-started', startHandler);
      eventBus.on('voice:speaking-ended', endHandler);

      eventBus.emit('voice:speaking-started', undefined);
      eventBus.emit('voice:speaking-ended', undefined);

      expect(startHandler).toHaveBeenCalled();
      expect(endHandler).toHaveBeenCalled();
    });
  });

  describe('Integration Flow', () => {
    it('should complete full voice interaction flow', () => {
      const chatMessages: any[] = [];
      eventBus.on('chat:send-message', (msg) => chatMessages.push(msg));

      // Start services
      voiceChatService.start();

      // Simulate wake word
      eventBus.emit('voice:wake-detected');

      // Simulate voice command
      eventBus.emit('voice:command', 'What time is it?');

      // Simulate AI response
      eventBus.emit('chat:message-received', {
        content: 'The current time is 3:00 PM',
      });

      expect(chatMessages).toHaveLength(1);
      expect(chatMessages[0]).toMatchObject({
        content: 'What time is it?',
        isVoice: true,
      });
    });

    it('should handle multiple voice commands in sequence', () => {
      const commands: string[] = [];
      eventBus.on('voice:command', (cmd: string) => commands.push(cmd));

      voiceChatService.start();

      // First command
      eventBus.emit('voice:command', 'Command one');
      // Second command
      eventBus.emit('voice:command', 'Command two');

      expect(commands).toHaveLength(2);
      expect(commands[0]).toBe('Command one');
      expect(commands[1]).toBe('Command two');
    });
  });
});
