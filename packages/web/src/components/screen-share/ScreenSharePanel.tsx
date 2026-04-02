'use client';

import { useState, useRef, useEffect } from 'react';

interface ScreenSharePanelProps {
  onClose: () => void;
  onShare: (stream: MediaStream) => void;
}

interface ScreenShareSource {
  deviceId: string;
  kind: MediaDeviceKind;
  label: string;
  groupId: string;
}

export function ScreenSharePanel({ onClose, onShare }: ScreenSharePanelProps) {
  const [isSharing, setIsSharing] = useState(false);
  const [selectedSource, setSelectedSource] = useState<string>('');
  const [sources, setSources] = useState<ScreenShareSource[]>([]);
  const videoRef = useRef<HTMLVideoElement>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);

  useEffect(() => {
    // 加载可用的屏幕共享源
    const loadSources = async () => {
      try {
        // 获取真实的屏幕共享设备
        const devices = await navigator.mediaDevices.enumerateDevices();
        const screenSources = devices
          .filter(device => device.kind === 'videoinput' && device.label.includes('screen'))
          .map(device => ({
            deviceId: device.deviceId,
            kind: device.kind,
            label: device.label || '屏幕共享',
            groupId: device.groupId
          }));
        
        // 如果没有找到屏幕设备，添加一个默认选项
        if (screenSources.length === 0) {
          screenSources.push({
            deviceId: 'default',
            kind: 'videoinput',
            label: '整个屏幕',
            groupId: 'default'
          });
        }
        
        setSources(screenSources);
        if (screenSources.length > 0) {
          setSelectedSource(screenSources[0].deviceId);
        }
      } catch (error) {
        console.error('Error loading sources:', error);
        // 出错时添加一个默认选项
        setSources([{
          deviceId: 'default',
          kind: 'videoinput',
          label: '整个屏幕',
          groupId: 'default'
        }]);
        setSelectedSource('default');
      }
    };

    loadSources();
  }, []);

  const handleStartSharing = async () => {
    try {
      setIsSharing(true);
      
      // 使用真实的屏幕共享 API
      const stream = await navigator.mediaDevices.getDisplayMedia({
        video: ({ cursor: 'always' } as unknown) as MediaTrackConstraints,
        audio: false
      });
      
      mediaStreamRef.current = stream;
      
      // 显示共享的视频
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play();
      }
      
      // 监听流结束事件
      stream.getVideoTracks()[0].onended = () => {
        handleStopSharing();
      };
      
      onShare(stream);
    } catch (error) {
      console.error('Error starting screen share:', error);
      setIsSharing(false);
    }
  };

  const handleStopSharing = () => {
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach(track => track.stop());
      mediaStreamRef.current = null;
    }
    setIsSharing(false);
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-md">
        <div className="p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-semibold">共享屏幕</h2>
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {!isSharing ? (
            <div>
              {/* 选择共享源 */}
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">选择共享内容</label>
                <select
                  value={selectedSource}
                  onChange={(e) => setSelectedSource(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  {sources.map((source) => (
                    <option key={source.deviceId} value={source.deviceId}>
                      {source.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* 共享说明 */}
              <div className="mb-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                <p className="text-sm text-yellow-800">
                  <span className="font-medium">提示：</span>
                  共享屏幕时，请注意保护个人隐私，避免共享敏感信息。
                </p>
              </div>

              {/* 开始共享按钮 */}
              <button
                onClick={handleStartSharing}
                disabled={!selectedSource}
                className={`w-full py-3 rounded-lg transition-colors ${
                  selectedSource
                    ? 'bg-blue-500 text-white hover:bg-blue-600'
                    : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                }`}
              >
                开始共享
              </button>
            </div>
          ) : (
            <div>
              {/* 共享预览 */}
              <div className="mb-6 border border-gray-200 rounded-lg overflow-hidden">
                <video
                  ref={videoRef}
                  className="w-full h-auto"
                  autoPlay
                  playsInline
                />
              </div>

              {/* 共享状态 */}
              <div className="mb-6 flex items-center justify-center">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse"></div>
                  <span className="text-green-600 font-medium">正在共享屏幕</span>
                </div>
              </div>

              {/* 控制按钮 */}
              <div className="flex gap-3">
                <button
                  onClick={handleStopSharing}
                  className="flex-1 py-3 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors"
                >
                  停止共享
                </button>
                <button
                  onClick={onClose}
                  className="flex-1 py-3 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors"
                >
                  最小化
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default ScreenSharePanel;
