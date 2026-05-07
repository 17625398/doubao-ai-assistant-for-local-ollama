'use client';

import { useState, useRef } from 'react';

interface ScreenshotQuestionPanelProps {
  onClose: () => void;
  onSubmit: (image: string, question: string) => void;
}

export function ScreenshotQuestionPanel({ onClose, onSubmit }: ScreenshotQuestionPanelProps) {
  const [screenshot, setScreenshot] = useState<string | null>(null);
  const [question, setQuestion] = useState('');
  const [isCapturing, setIsCapturing] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleCaptureScreenshot = async () => {
    // 使用真实的屏幕捕获 API
    setIsCapturing(true);
    
    try {
      // 请求屏幕共享权限
      const stream = await navigator.mediaDevices.getDisplayMedia({
        video: ({ cursor: 'always' } as unknown) as MediaTrackConstraints,
        audio: false
      });
      
      // 创建视频元素来显示流
      const video = document.createElement('video');
      video.srcObject = stream;
      video.onloadedmetadata = async () => {
        video.play();
        
        // 创建画布并捕获帧
        const canvas = document.createElement('canvas');
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        const ctx = canvas.getContext('2d');
        
        if (ctx) {
          ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
          
          // 将画布转换为 data URL
          const screenshotData = canvas.toDataURL('image/png');
          setScreenshot(screenshotData);
        }
        
        // 停止流
        stream.getTracks().forEach(track => track.stop());
        setIsCapturing(false);
      };
    } catch (error) {
      console.error('Error capturing screenshot:', error);
      setIsCapturing(false);
    }
  };

  const handleUploadScreenshot = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        setScreenshot(event.target?.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = () => {
    if (!screenshot || !question.trim()) return;
    onSubmit(screenshot, question);
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-md">
        <div className="p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-semibold">截图提问</h2>
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* 截图区域 */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">截图</label>
            {screenshot ? (
              <div className="border border-gray-200 rounded-lg overflow-hidden">
                <img
                  src={screenshot}
                  alt="Screenshot"
                  className="w-full h-auto"
                />
                <div className="p-3 bg-gray-50 flex justify-between">
                  <button
                    onClick={handleCaptureScreenshot}
                    className="px-3 py-1 text-sm bg-gray-200 hover:bg-gray-300 rounded-lg transition-colors"
                  >
                    重新截图
                  </button>
                  <button
                    onClick={() => setScreenshot(null)}
                    className="px-3 py-1 text-sm text-red-600 hover:text-red-800 transition-colors"
                  >
                    删除截图
                  </button>
                </div>
              </div>
            ) : (
              <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center">
                {isCapturing ? (
                  <div className="flex flex-col items-center">
                    <div className="w-12 h-12 border-4 border-t-blue-500 border-blue-200 rounded-full animate-spin mb-4"></div>
                    <p className="text-gray-600">正在截图...</p>
                  </div>
                ) : (
                  <div>
                    <svg className="w-16 h-16 text-gray-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                    <p className="text-gray-600 mb-4">请截图或上传图片</p>
                    <div className="flex flex-col gap-2">
                      <button
                        onClick={handleCaptureScreenshot}
                        className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
                      >
                        开始截图
                      </button>
                      <button
                        onClick={() => fileInputRef.current?.click()}
                        className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors"
                      >
                        上传图片
                      </button>
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={handleUploadScreenshot}
                      />
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* 问题描述 */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">问题描述</label>
            <textarea
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              placeholder="请描述您的问题..."
              rows={4}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* 提交按钮 */}
          <button
            onClick={handleSubmit}
            disabled={!screenshot || !question.trim()}
            className={`w-full py-3 rounded-lg transition-colors ${
              screenshot && question.trim()
                ? 'bg-blue-500 text-white hover:bg-blue-600'
                : 'bg-gray-300 text-gray-500 cursor-not-allowed'
            }`}
          >
            提交问题
          </button>
        </div>
      </div>
    </div>
  );
}

export default ScreenshotQuestionPanel;
