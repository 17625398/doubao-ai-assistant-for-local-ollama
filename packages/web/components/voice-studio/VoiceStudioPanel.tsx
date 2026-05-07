'use client';

import React, { useState, useRef, useCallback, useEffect } from 'react';

interface VoiceStudioPanelProps {
  onClose?: () => void;
  onSend?: (text: string) => void;
}

interface ASRHistoryItem {
  id: string;
  text: string;
  timestamp: number;
  duration?: number;
}

interface TTSHistoryItem {
  id: string;
  text: string;
  voice: string;
  timestamp: number;
  audioUrl?: string;
}

const VOICES = [
  { id: 'alloy', name: 'Alloy (中性)', lang: 'en' },
  { id: 'echo', name: 'Echo (男声)', lang: 'en' },
  { id: 'fable', name: 'Fable (叙事)', lang: 'en' },
  { id: 'onyx', name: 'Onyx (低沉)', lang: 'en' },
  { id: 'nova', name: 'Nova (女声)', lang: 'en' },
  { id: 'shimmer', name: 'Shimmer (柔和)', lang: 'en' },
];

// 错误码到用户友好提示的映射
const ERROR_MESSAGES: Record<string, string> = {
  UPSTREAM_UNREACHABLE: '语音服务连接失败，请确认 LinkMind 后端服务 (http://localhost:8080) 已启动',
  UPSTREAM_TIMEOUT: '语音服务响应超时，请稍后重试',
  UPSTREAM_DNS_ERROR: '语音服务地址无法解析，请检查 .env.local 中 LINKMIND_BASE_URL 配置',
  UPSTREAM_ERROR: '语音服务返回异常，请查看后端日志',
  PAYLOAD_TOO_LARGE: '提交的数据过大',
  INTERNAL_ERROR: '内部错误',
};

function getErrorMessage(apiError?: string, code?: string): string {
  if (code && ERROR_MESSAGES[code]) return ERROR_MESSAGES[code];
  if (apiError?.includes('ECONNREFUSED') || apiError?.includes('fetch failed')) {
    return ERROR_MESSAGES.UPSTREAM_UNREACHABLE;
  }
  if (apiError?.includes('timeout') || apiError?.includes('abort')) {
    return ERROR_MESSAGES.UPSTREAM_TIMEOUT;
  }
  return apiError || '未知错误';
}

export function VoiceStudioPanel({ onClose, onSend }: VoiceStudioPanelProps) {
  const [activeTab, setActiveTab] = useState<'asr' | 'tts'>('asr');
  const [isRecording, setIsRecording] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [asrResult, setAsrResult] = useState('');
  const [ttsText, setTtsText] = useState('');
  const [selectedVoice, setSelectedVoice] = useState('alloy');
  const [ttsSpeed, setTtsSpeed] = useState(1.0);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [asrHistory, setAsrHistory] = useState<ASRHistoryItem[]>([]);
  const [ttsHistory, setTtsHistory] = useState<TTSHistoryItem[]>([]);
  const [error, setError] = useState<string | null>(null);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    return () => {
      stopRecording();
    };
  }, []);

  const startRecording = useCallback(async () => {
    try {
      setError(null);
      audioChunksRef.current = [];
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;

      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: MediaRecorder.isTypeSupported('audio/webm') ? 'audio/webm' : 'audio/wav',
      });

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) audioChunksRef.current.push(e.data);
      };

      mediaRecorder.onstop = async () => {
        const blob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        await processAudio(blob);
      };

      mediaRecorderRef.current = mediaRecorder;
      mediaRecorder.start(100);
      setIsRecording(true);
    } catch (err) {
      setError('无法访问麦克风，请检查权限设置');
      console.error('[VoiceStudio] Mic access error:', err);
    }
  }, []);

  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    setIsRecording(false);
  }, []);

  const processAudio = useCallback(async (blob: Blob) => {
    setIsProcessing(true);
    try {
      const formData = new FormData();
      formData.append('file', blob, `recording-${Date.now()}.webm`);

      const res = await fetch('/api/linkmind/multimodal/asr', {
        method: 'POST',
        body: formData,
      });

      const data = await res.json();

      if (data.success && data.text) {
        setAsrResult(data.text);
        setAsrHistory((prev) => [
          { id: crypto.randomUUID(), text: data.text, timestamp: Date.now(), duration: data.duration },
          ...prev.slice(0, 19),
        ]);
      } else {
        setError(getErrorMessage(data.error, data.code));
      }
    } catch (err) {
      setError(getErrorMessage('网络错误：无法连接到语音识别服务'));
    } finally {
      setIsProcessing(false);
    }
  }, []);

  const handleSendAsrResult = useCallback(() => {
    if (asrResult.trim() && onSend) {
      onSend(asrResult.trim());
    }
  }, [asrResult, onSend]);

  const generateSpeech = useCallback(async () => {
    if (!ttsText.trim()) return;

    setIsProcessing(true);
    setError(null);
    try {
      const res = await fetch('/api/linkmind/multimodal/tts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          input: ttsText,
          voice: selectedVoice,
          speed: ttsSpeed,
          response_format: 'mp3',
        }),
      });

      const data = await res.json();

      if (data.success) {
        if (data.audioBase64) {
          setAudioUrl(`data:audio/mp3;base64,${data.audioBase64}`);
        } else if (data.audioUrl || data.url) {
          setAudioUrl(data.audioUrl || data.url);
        }

        setTtsHistory((prev) => [
          { id: crypto.randomUUID(), text: ttsText, voice: selectedVoice, timestamp: Date.now() },
          ...prev.slice(0, 19),
        ]);
      } else {
        setError(getErrorMessage(data.error, data.code));
      }
    } catch (err) {
      setError(getErrorMessage('网络错误：无法连接到语音合成服务'));
    } finally {
      setIsProcessing(false);
    }
  }, [ttsText, selectedVoice, ttsSpeed]);

  const playAudio = useCallback((url: string) => {
    if (audioRef.current) {
      audioRef.current.pause();
    }
    const audio = new Audio(url);
    audioRef.current = audio;
    audio.play().catch(() => {});
  }, []);

  const formatTime = (ts: number) =>
    new Date(ts).toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit', second: '2-digit' });

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-900 rounded-xl shadow-2xl w-full max-w-2xl max-h-[88vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-700 bg-gradient-to-r from-blue-500 to-cyan-500">
          <div className="flex items-center gap-3">
            <span className="text-2xl">🎙️</span>
            <h2 className="text-lg font-semibold text-white">语音工作室</h2>
          </div>
          <button onClick={onClose} className="text-white/80 hover:text-white transition-colors p-1">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-gray-200 dark:border-gray-700 px-6">
          {[
            { id: 'asr' as const, label: '🎤 语音转文字 (ASR)' },
            { id: 'tts' as const, label: '🔊 文字转语音 (TTS)' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-5 py-3 text-sm font-medium border-b-2 transition-colors ${
                activeTab === tab.id
                  ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {error && (
            <div className="mb-4 p-3 bg-red-50 dark:bg-red-950 border border-red-200 rounded-lg text-sm text-red-600 flex items-center gap-2">
              <span>⚠️</span> {error}
              <button onClick={() => setError(null)} className="ml-auto text-red-400 hover:text-red-600">×</button>
            </div>
          )}

          {activeTab === 'asr' && (
            <div className="space-y-5">
              {/* Recorder */}
              <div className="flex flex-col items-center py-8">
                <button
                  onClick={isRecording ? stopRecording : startRecording}
                  disabled={isProcessing}
                  className={`relative w-24 h-24 rounded-full flex items-center justify-center transition-all duration-300 ${
                    isRecording
                      ? 'bg-red-500 hover:bg-red-600 animate-pulse shadow-lg shadow-red-200'
                      : 'bg-gradient-to-br from-blue-500 to-cyan-500 hover:from-blue-600 hover:to-cyan-600 shadow-lg shadow-blue-200'
                  } ${isProcessing ? 'opacity-50 cursor-not-allowed' : ''}`}
                >
                  {isProcessing ? (
                    <div className="animate-spin w-8 h-8 border-3 border-white border-t-transparent rounded-full" />
                  ) : isRecording ? (
                    <svg className="w-10 h-10 text-white" fill="currentColor" viewBox="0 0 24 24">
                      <rect x="6" y="6" width="12" height="12" rx="2" />
                    </svg>
                  ) : (
                    <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                      <path d="M12 1a3 3 0 00-3 3v8a3 3 0 006 0V4a3 3 0 00-3-3z" />
                      <path d="M19 10v2a7 7 0 01-14 0v-2M12 19v4M8 23h8" />
                    </svg>
                  )}
                </button>

                <p className="mt-4 text-sm text-gray-500">
                  {isProcessing ? '正在识别...' : isRecording ? '点击停止录音' : '点击开始录音'}
                </p>

                {isRecording && (
                  <div className="mt-3 flex gap-1">
                    {[...Array(20)].map((_, i) => (
                      <div
                        key={i}
                        className="w-1 bg-red-400 rounded-full animate-pulse"
                        style={{
                          height: `${Math.random() * 24 + 8}px`,
                          animationDelay: `${i * 50}ms`,
                          animationDuration: `${Math.random() * 300 + 300}ms`,
                        }}
                      />
                    ))}
                  </div>
                )}
              </div>

              {/* Result */}
              {asrResult && (
                <div className="bg-blue-50 dark:bg-blue-950/30 border border-blue-200 rounded-lg p-4">
                  <p className="text-xs font-medium text-blue-500 mb-1">识别结果</p>
                  <p className="text-sm text-gray-800 dark:text-gray-200 leading-relaxed">{asrResult}</p>
                  {onSend && (
                    <button
                      onClick={handleSendAsrResult}
                      className="mt-3 px-4 py-1.5 bg-blue-500 text-white text-sm rounded-lg hover:bg-blue-600 transition-colors"
                    >
                      发送到对话 →
                    </button>
                  )}
                </div>
              )}

              {/* History */}
              {asrHistory.length > 0 && (
                <div>
                  <h3 className="text-xs font-medium text-gray-400 mb-2">历史记录 ({asrHistory.length})</h3>
                  <div className="space-y-2 max-h-48 overflow-y-auto">
                    {asrHistory.map((item) => (
                      <div
                        key={item.id}
                        className="p-3 bg-gray-50 dark:bg-gray-800 rounded-lg cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-750 transition-colors"
                        onClick={() => setAsrResult(item.text)}
                      >
                        <p className="text-sm text-gray-800 dark:text-gray-200 line-clamp-2">{item.text}</p>
                        <span className="text-[11px] text-gray-400 mt-1">{formatTime(item.timestamp)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {activeTab === 'tts' && (
            <div className="space-y-5">
              {/* Text Input */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  输入要合成的文字
                </label>
                <textarea
                  value={ttsText}
                  onChange={(e) => setTtsText(e.target.value)}
                  placeholder="输入文字内容..."
                  rows={4}
                  maxLength={4000}
                  className="w-full px-3 py-2.5 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-sm focus:ring-2 focus:ring-blue-500 outline-none resize-none"
                />
                <div className="flex justify-between mt-1">
                  <span className="text-xs text-gray-400">{ttsText.length} / 4000 字符</span>
                </div>
              </div>

              {/* Controls */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">音色</label>
                  <select
                    value={selectedVoice}
                    onChange={(e) => setSelectedVoice(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-sm"
                  >
                    {VOICES.map((v) => (
                      <option key={v.id} value={v.id}>
                        {v.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">
                    语速: {ttsSpeed.toFixed(1)}x
                  </label>
                  <input
                    type="range"
                    min="0.25"
                    max="4.0"
                    step="0.25"
                    value={ttsSpeed}
                    onChange={(e) => setTtsSpeed(parseFloat(e.target.value))}
                    className="w-full"
                  />
                </div>
              </div>

              <button
                onClick={generateSpeech}
                disabled={!ttsText.trim() || isProcessing}
                className="w-full py-2.5 bg-gradient-to-r from-blue-500 to-cyan-500 text-white rounded-lg text-sm font-medium hover:from-blue-600 hover:to-cyan-600 disabled:opacity-40 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
              >
                {isProcessing ? (
                  <>
                    <div className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full" />
                    正在合成...
                  </>
                ) : (
                  <>🔊 合成语音</>
                )}
              </button>

              {/* Player */}
              {audioUrl && (
                <div className="bg-cyan-50 dark:bg-cyan-950/30 border border-cyan-200 rounded-lg p-4">
                  <p className="text-xs font-medium text-cyan-500 mb-2">合成结果</p>
                  <audio controls src={audioUrl} className="w-full h-10" preload="none" />
                </div>
              )}

              {/* TTS History */}
              {ttsHistory.length > 0 && (
                <div>
                  <h3 className="text-xs font-medium text-gray-400 mb-2">历史记录 ({ttsHistory.length})</h3>
                  <div className="space-y-2 max-h-48 overflow-y-auto">
                    {ttsHistory.map((item) => (
                      <div key={item.id} className="p-3 bg-gray-50 dark:bg-gray-800 rounded-lg flex items-start gap-3">
                        <button
                          onClick={() => generateSpeechFromHistory(item)}
                          className="mt-0.5 w-7 h-7 flex items-center justify-center rounded-full bg-cyan-100 text-cyan-600 hover:bg-cyan-200 transition-colors flex-shrink-0"
                        >
                          ▶
                        </button>
                        <div className="min-w-0 flex-1">
                          <p className="text-sm text-gray-800 dark:text-gray-200 line-clamp-2">{item.text}</p>
                          <span className="text-[11px] text-gray-400">{item.voice} · {formatTime(item.timestamp)}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50 text-xs text-gray-400 flex justify-between">
          <span>Voice Studio v1.0</span>
          <span>Powered by LinkMind Multimodal API</span>
        </div>
      </div>
    </div>
  );
}

function generateSpeechFromHistory(_item: TTSHistoryItem) {}
