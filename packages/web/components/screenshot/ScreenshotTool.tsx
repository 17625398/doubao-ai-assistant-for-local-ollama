'use client';

import React, { useState, useCallback } from 'react';
import { Camera, Image, Edit3, Send, X, Check } from 'lucide-react';

interface ScreenshotToolProps {
  onImageCapture: (imageDataUrl: string) => void;
  onClose: () => void;
}

export const ScreenshotTool: React.FC<ScreenshotToolProps> = ({ onImageCapture, onClose }) => {
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isDrawing, setIsDrawing] = useState(false);
  const [drawPoints, setDrawPoints] = useState<{ x: number; y: number }[]>([]);

  const handleClipboardPaste = useCallback(async () => {
    try {
      const items = await navigator.clipboard.read();
      
      for (const item of items) {
        if (item.types.includes('image/png') || item.types.includes('image/jpeg') || item.types.includes('image/webp')) {
          const blob = await item.getType(item.types.find(t => t.startsWith('image/'))!);
          const url = URL.createObjectURL(blob);
          setCapturedImage(url);
          return;
        }
      }
      
      alert('剪贴板中没有图片');
    } catch (error) {
      console.error('Failed to read clipboard:', error);
      alert('无法访问剪贴板，请尝试手动粘贴');
    }
  }, []);

  const handleScreenCapture = useCallback(async () => {
    try {
      setIsProcessing(true);
      
      const stream = await navigator.mediaDevices.getDisplayMedia({
        video: { displaySurface: 'monitor' },
        audio: false,
      });

      const video = document.createElement('video');
      video.srcObject = stream;
      
      await new Promise((resolve) => {
        video.onloadedmetadata = resolve;
      });

      const canvas = document.createElement('canvas');
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      
      const ctx = canvas.getContext('2d');
      ctx?.drawImage(video, 0, 0);
      
      stream.getTracks().forEach(track => track.stop());
      
      const dataUrl = canvas.toDataURL('image/png');
      setCapturedImage(dataUrl);
    } catch (error) {
      console.error('Screen capture failed:', error);
      alert('截图失败，请检查浏览器权限设置');
    } finally {
      setIsProcessing(false);
    }
  }, []);

  const handleDraw = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDrawing || !capturedImage) return;
    
    const canvas = e.currentTarget;
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    setDrawPoints(prev => [...prev, { x, y }]);
  }, [isDrawing, capturedImage]);

  const handleDrawStart = useCallback(() => {
    setIsDrawing(true);
  }, []);

  const handleDrawEnd = useCallback(() => {
    setIsDrawing(false);
  }, []);

  const handleClearDrawing = useCallback(() => {
    setDrawPoints([]);
  }, []);

  const handleSend = useCallback(() => {
    if (!capturedImage) return;

    if (drawPoints.length > 0) {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext('2d');
        ctx?.drawImage(img, 0, 0);
        
        ctx!.strokeStyle = '#ef4444';
        ctx!.lineWidth = 3;
        ctx!.lineCap = 'round';
        ctx!.lineJoin = 'round';
        
        if (drawPoints.length > 1) {
          ctx!.beginPath();
          ctx!.moveTo(drawPoints[0].x, drawPoints[0].y);
          for (let i = 1; i < drawPoints.length; i++) {
            ctx!.lineTo(drawPoints[i].x, drawPoints[i].y);
          }
          ctx!.stroke();
        }
        
        const finalImage = canvas.toDataURL('image/png');
        onImageCapture(finalImage);
      };
      img.src = capturedImage;
    } else {
      onImageCapture(capturedImage);
    }
  }, [capturedImage, drawPoints, onImageCapture]);

  if (!capturedImage) {
    return (
      <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
        <div className="bg-[var(--theme-bg-secondary)] rounded-2xl shadow-2xl w-full max-w-md border border-[var(--theme-border-secondary)]">
          <div className="p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-semibold text-[var(--theme-text-primary)]">截图提问</h2>
              <button
                onClick={onClose}
                className="p-2 rounded-lg hover:bg-[var(--theme-bg-tertiary)] transition-colors"
              >
                <X size={20} className="text-[var(--theme-text-tertiary)]" />
              </button>
            </div>

            <div className="space-y-4">
              <button
                onClick={handleScreenCapture}
                disabled={isProcessing}
                className="w-full flex items-center justify-center gap-3 p-4 rounded-xl bg-[var(--theme-accent-primary)] text-white font-medium hover:bg-[var(--theme-accent-primary)]/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Camera size={20} />
                {isProcessing ? '截图中...' : '截取屏幕'}
              </button>

              <button
                onClick={handleClipboardPaste}
                className="w-full flex items-center justify-center gap-3 p-4 rounded-xl border border-[var(--theme-border-secondary)] text-[var(--theme-text-primary)] font-medium hover:bg-[var(--theme-bg-tertiary)] transition-colors"
              >
                <Image size={20} />
                从剪贴板粘贴图片
              </button>
            </div>

            <p className="text-xs text-[var(--theme-text-tertiary)] text-center mt-4">
              截取屏幕或粘贴图片后，可以在图片上画标记来突出重点
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
      <div className="bg-[var(--theme-bg-secondary)] rounded-2xl shadow-2xl w-full max-w-4xl border border-[var(--theme-border-secondary)] flex flex-col">
        <div className="flex items-center justify-between p-4 border-b border-[var(--theme-border-secondary)]">
          <h2 className="text-lg font-semibold text-[var(--theme-text-primary)]">编辑截图</h2>
          <div className="flex items-center gap-2">
            {drawPoints.length > 0 && (
              <button
                onClick={handleClearDrawing}
                className="p-2 rounded-lg hover:bg-[var(--theme-bg-tertiary)] transition-colors"
                title="清除标记"
              >
                <X size={18} className="text-[var(--theme-text-tertiary)]" />
              </button>
            )}
            <button
              onClick={onClose}
              className="p-2 rounded-lg hover:bg-[var(--theme-bg-tertiary)] transition-colors"
            >
              <X size={20} className="text-[var(--theme-text-tertiary)]" />
            </button>
          </div>
        </div>

        <div className="flex-1 p-4 overflow-auto flex justify-center items-center">
          <div className="relative">
            <canvas
              width={600}
              height={400}
              className="border border-[var(--theme-border-secondary)] rounded-xl cursor-crosshair"
              onMouseDown={handleDrawStart}
              onMouseMove={handleDraw}
              onMouseUp={handleDrawEnd}
              onMouseLeave={handleDrawEnd}
              style={{
                backgroundImage: `url(${capturedImage})`,
                backgroundSize: 'contain',
                backgroundRepeat: 'no-repeat',
                backgroundPosition: 'center',
              }}
            />
            {drawPoints.length > 0 && (
              <svg
                width={600}
                height={400}
                className="absolute top-0 left-0 pointer-events-none"
              >
                <path
                  d={drawPoints.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ')}
                  stroke="#ef4444"
                  strokeWidth="3"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  fill="none"
                />
              </svg>
            )}
          </div>
        </div>

        <div className="flex items-center justify-between p-4 border-t border-[var(--theme-border-secondary)]">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsDrawing(!isDrawing)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors ${
                isDrawing
                  ? 'bg-[var(--theme-accent-primary)] text-white'
                  : 'bg-[var(--theme-bg-tertiary)] text-[var(--theme-text-primary)]'
              }`}
            >
              <Edit3 size={16} />
              {isDrawing ? '停止标记' : '绘制标记'}
            </button>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                setCapturedImage(null);
                setDrawPoints([]);
              }}
              className="px-4 py-2 rounded-lg border border-[var(--theme-border-secondary)] text-[var(--theme-text-primary)] font-medium hover:bg-[var(--theme-bg-tertiary)] transition-colors"
            >
              重新截图
            </button>
            <button
              onClick={handleSend}
              className="flex items-center gap-2 px-6 py-2 rounded-lg bg-[var(--theme-accent-primary)] text-white font-medium hover:bg-[var(--theme-accent-primary)]/90 transition-colors"
            >
              <Send size={16} />
              发送提问
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ScreenshotTool;