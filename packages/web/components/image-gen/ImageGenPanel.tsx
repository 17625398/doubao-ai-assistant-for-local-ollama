'use client';

import React, { useState, useCallback } from 'react';

interface ImageGenPanelProps {
  onClose?: () => void;
  onSendToChat?: (image: string) => void;
}

interface GeneratedImage {
  id: string;
  url: string | null;
  base64: string | null;
  prompt: string;
  timestamp: number;
}

interface HistoryItem {
  id: string;
  prompt: string;
  images: GeneratedImage[];
  timestamp: number;
}

const IMAGE_MODELS = [
  { id: 'dall-e-3', name: 'DALL-E 3', maxRes: '1024x1024' },
  { id: 'dall-e-2', name: 'DALL-E 2', maxRes: '1024x1024' },
  { id: 'stable-diffusion', name: 'Stable Diffusion', maxRes: '768x768' },
];

const SIZES = [
  { label: '正方形 (1:1)', value: '1024x1024' },
  { label: '竖版 (9:16)', value: '768x1344' },
  { label: '横版 (16:9)', value: '1344x768' },
  { label: '手机壁纸', value: '1080x1920' },
];

const STYLE_PRESETS = [
  { label: '写实摄影', prefix: 'professional photography, highly detailed, 8k resolution, ' },
  { label: '动漫风格', prefix: 'anime style, vibrant colors, detailed illustration, ' },
  { label: '油画艺术', prefix: 'oil painting style, classical art, rich textures, ' },
  { label: '水彩画', prefix: 'watercolor painting, soft edges, artistic, ' },
  { label: '赛博朋克', prefix: 'cyberpunk aesthetic, neon lights, futuristic, ' },
  { label: '极简主义', prefix: 'minimalist design, clean lines, modern, ' },
  { label: '像素风', prefix: 'pixel art style, retro game aesthetic, 16-bit, ' },
  { label: '3D渲染', prefix: '3D render, octane render, cinematic lighting, ' },
];

export function ImageGenPanel({ onClose, onSendToChat }: ImageGenPanelProps) {
  const [prompt, setPrompt] = useState('');
  const [negativePrompt, setNegativePrompt] = useState('');
  const [selectedModel, setSelectedModel] = useState('dall-e-3');
  const [selectedSize, setSelectedSize] = useState('1024x1024');
  const [count, setCount] = useState(1);
  const [isGenerating, setIsGenerating] = useState(false);
  const [images, setImages] = useState<GeneratedImage[]>([]);
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [previewImage, setPreviewImage] = useState<GeneratedImage | null>(null);

  const generate = useCallback(async () => {
    if (!prompt.trim()) return;

    setIsGenerating(true);
    setError(null);
    setImages([]);

    try {
      const res = await fetch('/api/linkmind/multimodal/image-gen', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: selectedModel,
          prompt,
          negative_prompt: negativePrompt || undefined,
          size: selectedSize,
          n: count,
        }),
      });

      const data = await res.json();

      if (data.success && Array.isArray(data.images)) {
        const newImages: GeneratedImage[] = data.images.map((img: any, i: number) => ({
          id: crypto.randomUUID(),
          url: img.url || null,
          base64: img.base64 || null,
          prompt,
          timestamp: Date.now(),
        }));

        setImages(newImages);

        if (newImages.length > 0) {
          setHistory((prev) => [
            { id: crypto.randomUUID(), prompt, images: newImages, timestamp: Date.now() },
            ...prev.slice(0, 19),
          ]);
        }
      } else {
        setError(data.error || '图像生成失败，请重试');
      }
    } catch (err) {
      setError('网络错误：无法连接到图像生成服务');
    } finally {
      setIsGenerating(false);
    }
  }, [prompt, negativePrompt, selectedModel, selectedSize, count]);

  const downloadImage = useCallback((img: GeneratedImage) => {
    const src = img.base64 ? `data:image/png;base64,${img.base64}` : img.url;
    if (!src) return;

    const a = document.createElement('a');
    a.href = src;
    a.download = `ai-image-${Date.now()}.png`;
    a.target = '_blank';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  }, []);

  const copyToClipboard = async (img: GeneratedImage) => {
    try {
      const src = img.base64 ? `data:image/png;base64,${img.base64}` : img.url;
      if (!src) return;

      const resp = await fetch(src);
      const blob = await resp.blob();
      await navigator.clipboard.write([new ClipboardItem({ 'image/png': blob })]);
    } catch {}
  };

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-900 rounded-xl shadow-2xl w-full max-w-5xl max-h-[92vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-700 bg-gradient-to-r from-pink-500 via-purple-500 to-indigo-500">
          <div className="flex items-center gap-3">
            <span className="text-2xl">🎨</span>
            <h2 className="text-lg font-semibold text-white">AI 绘图</h2>
          </div>
          <button onClick={onClose} className="text-white/80 hover:text-white transition-colors p-1">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="flex flex-1 overflow-hidden">
          {/* Left: Controls */}
          <div className="w-[340px] border-r border-gray-200 dark:border-gray-700 overflow-y-auto p-5 space-y-4 flex-shrink-0">
            {/* Prompt */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                描述提示词
              </label>
              <textarea
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                placeholder="描述你想生成的图像... 例如：一只在月球上喝咖啡的猫，赛博朋克风格"
                rows={4}
                maxLength={2000}
                className="w-full px-3 py-2.5 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-sm focus:ring-2 focus:ring-purple-500 outline-none resize-none"
              />
              <span className="text-xs text-gray-400">{prompt.length} / 2000</span>
            </div>

            {/* Negative Prompt */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                负面提示词（可选）
              </label>
              <input
                type="text"
                value={negativePrompt}
                onChange={(e) => setNegativePrompt(e.target.value)}
                placeholder="不希望出现的内容..."
                maxLength={500}
                className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-sm focus:ring-2 focus:ring-purple-500 outline-none"
              />
            </div>

            {/* Style Presets */}
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1.5">快速风格</label>
              <div className="flex flex-wrap gap-1.5">
                {STYLE_PRESETS.map((s) => (
                  <button
                    key={s.label}
                    onClick={() => setPrompt(s.prefix + prompt)}
                    className="px-2.5 py-1 text-xs rounded-full border border-gray-200 dark:border-gray-600 text-gray-600 dark:text-gray-400 hover:border-purple-400 hover:text-purple-600 hover:bg-purple-50 dark:hover:bg-purple-950 transition-colors"
                  >
                    {s.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Model + Size */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">模型</label>
                <select
                  value={selectedModel}
                  onChange={(e) => setSelectedModel(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-sm"
                >
                  {IMAGE_MODELS.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">尺寸</label>
                <select
                  value={selectedSize}
                  onChange={(e) => setSelectedSize(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-sm"
                >
                  {SIZES.map((s) => (
                    <option key={s.value} value={s.value}>
                      {s.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Count */}
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">
                生成数量: {count}
              </label>
              <input
                type="range"
                min="1"
                max="4"
                value={count}
                onChange={(e) => setCount(parseInt(e.target.value))}
                className="w-full accent-purple-500"
              />
            </div>

            {/* Generate Button */}
            <button
              onClick={generate}
              disabled={!prompt.trim() || isGenerating}
              className="w-full py-3 bg-gradient-to-r from-pink-500 via-purple-500 to-indigo-500 text-white rounded-xl text-sm font-semibold hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2"
            >
              {isGenerating ? (
                <>
                  <div className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full" />
                  正在生成...
                </>
              ) : (
                <>🎨 开始创作</>
              )}
            </button>

            {/* Error */}
            {error && (
              <div className="p-2.5 bg-red-50 dark:bg-red-950 border border-red-200 rounded-lg text-xs text-red-600 flex items-start gap-2">
                <span>⚠️</span> {error}
                <button onClick={() => setError(null)} className="ml-auto text-red-400">×</button>
              </div>
            )}

            {/* History Summary */}
            {history.length > 0 && (
              <div>
                <h3 className="text-xs font-medium text-gray-400 mb-2">历史 ({history.length})</h3>
                <div className="space-y-1.5 max-h-36 overflow-y-auto">
                  {history.slice(0, 8).map((item) => (
                    <button
                      key={item.id}
                      onClick={() => setImages(item.images)}
                      className="w-full text-left p-2 bg-gray-50 dark:bg-gray-800 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-750 transition-colors text-xs truncate"
                    >
                      {item.prompt.slice(0, 60)}{item.prompt.length > 60 ? '...' : ''}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Right: Gallery */}
          <div className="flex-1 overflow-y-auto p-5">
            {images.length === 0 && !isGenerating ? (
              <div className="h-full flex flex-col items-center justify-center text-gray-400">
                <p className="text-6xl mb-4">🖼️</p>
                <p className="text-sm font-medium">输入提示词开始创作</p>
                <p className="text-xs mt-1">AI 将根据你的描述生成图像</p>
              </div>
            ) : isGenerating ? (
              <div className="h-full flex flex-col items-center justify-center">
                <div className="relative w-24 h-24 mb-4">
                  <div className="absolute inset-0 rounded-full border-4 border-purple-200" />
                  <div className="absolute inset-0 rounded-full border-4 border-transparent border-t-purple-500 animate-spin" />
                  <div className="absolute inset-3 rounded-full border-4 border-transparent border-b-pink-500 animate-spin" style={{ animationDirection: 'reverse', animationDuration: '1.5s' }} />
                </div>
                <p className="text-sm text-gray-600 dark:text-gray-400 font-medium">正在生成中...</p>
                <p className="text-xs text-gray-400 mt-1">{selectedModel} · {selectedSize}</p>
              </div>
            ) : (
              <div className={`grid gap-4 ${images.length === 1 ? 'grid-cols-1 max-w-md mx-auto' : images.length === 2 ? 'grid-cols-2' : 'grid-cols-2'}`}>
                {images.map((img) => {
                  const src = img.base64 ? `data:image/png;base64,${img.base64}` : img.url;
                  return (
                    <div key={img.id} className="group relative bg-gray-100 dark:bg-gray-800 rounded-xl overflow-hidden">
                      {src ? (
                        <>
                          <img
                            src={src}
                            alt={img.prompt}
                            className="w-full aspect-square object-cover cursor-pointer"
                            onClick={() => setPreviewImage(img)}
                          />
                          <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-end justify-center pb-3 gap-2">
                            <button
                              onClick={() => downloadImage(img)}
                              className="px-3 py-1.5 bg-white/90 backdrop-blur text-gray-700 rounded-lg text-xs font-medium hover:bg-white transition-colors"
                            >
                              ⬇ 下载
                            </button>
                            <button
                              onClick={() => copyToClipboard(img)}
                              className="px-3 py-1.5 bg-white/90 backdrop-blur text-gray-700 rounded-lg text-xs font-medium hover:bg-white transition-colors"
                            >
                              📋 复制
                            </button>
                            {onSendToChat && (
                              <button
                                onClick={() => onSendToChat(src!)}
                                className="px-3 py-1.5 bg-purple-500/90 backdrop-blur text-white rounded-lg text-xs font-medium hover:bg-purple-500 transition-colors"
                              >
                                💬 发送
                              </button>
                            )}
                          </div>
                        </>
                      ) : (
                        <div className="w-full aspect-square flex items-center justify-center text-gray-400">
                          加载失败
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50 text-xs text-gray-400 flex justify-between">
          <span>AI Image Generator v1.0</span>
          <span>Powered by LinkMind Multimodal API</span>
        </div>
      </div>

      {/* Preview Modal */}
      {previewImage && (
        <div className="fixed inset-0 bg-black/80 z-[60] flex items-center justify-center p-8" onClick={() => setPreviewImage(null)}>
          <img
            src={previewImage.base64 ? `data:image/png;base64,${previewImage.base64}` : previewImage.url!}
            alt={previewImage.prompt}
            className="max-w-full max-h-full object-contain rounded-lg shadow-2xl"
          />
        </div>
      )}
    </div>
  );
}
