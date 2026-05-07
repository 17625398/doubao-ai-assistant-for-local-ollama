import React, { useState, useEffect } from 'react';
import type { DocumentParseResult } from '@core/index';

interface DocumentProcessingStatusProps {
  document: DocumentParseResult | null;
  isProcessing: boolean;
  progress: number;
  error: string | null;
}

export function DocumentProcessingStatus({
  document,
  isProcessing,
  progress,
  error,
}: DocumentProcessingStatusProps) {
  const [elapsedTime, setElapsedTime] = useState(0);
  const [showDetails, setShowDetails] = useState(false);

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isProcessing) {
      interval = setInterval(() => {
        setElapsedTime(prev => prev + 1);
      }, 1000);
    } else {
      setElapsedTime(0);
    }
    return () => clearInterval(interval);
  }, [isProcessing]);

  const formatTime = (seconds: number): string => {
    if (seconds < 60) return `${seconds}秒`;
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}分${secs}秒`;
  };

  const getStageLabel = (progress: number): string => {
    if (progress < 20) return '正在读取文件...';
    if (progress < 40) return '正在解析内容...';
    if (progress < 60) return '正在提取文本...';
    if (progress < 80) return '正在处理表格和图片...';
    if (progress < 100) return '正在生成结果...';
    return '处理完成';
  };

  const getStageIcon = (progress: number) => {
    if (progress < 30) return (
      <svg className="w-5 h-5 text-blue-500 animate-bounce" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
      </svg>
    );
    if (progress < 60) return (
      <svg className="w-5 h-5 text-blue-500 animate-spin" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
      </svg>
    );
    if (progress < 90) return (
      <svg className="w-5 h-5 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
      </svg>
    );
    return (
      <svg className="w-5 h-5 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
      </svg>
    );
  };

  if (error) {
    return (
      <div className="p-4 bg-red-50 border border-red-200 rounded-xl animate-fade-in">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 flex items-center justify-center rounded-full bg-red-100 flex-shrink-0">
            <svg className="w-5 h-5 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <div className="flex-1">
            <h4 className="text-sm font-semibold text-red-800">处理失败</h4>
            <p className="text-sm text-red-600 mt-1">{error}</p>
            <div className="mt-3 flex gap-2">
              <button
                onClick={() => window.location.reload()}
                className="px-3 py-1.5 text-xs bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors"
              >
                重试
              </button>
              <button
                onClick={() => setShowDetails(!showDetails)}
                className="px-3 py-1.5 text-xs text-red-600 hover:text-red-800 transition-colors"
              >
                {showDetails ? '隐藏详情' : '查看详情'}
              </button>
            </div>
            {showDetails && (
              <div className="mt-3 p-3 bg-white rounded-lg text-xs text-gray-600 font-mono">
                <p>错误时间: {new Date().toLocaleString()}</p>
                <p>文档状态: 解析失败</p>
                <p>建议: 检查文件是否损坏或格式是否正确</p>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  if (isProcessing) {
    return (
      <div className="p-6 bg-white border rounded-xl shadow-sm animate-fade-in">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            {getStageIcon(progress)}
            <div>
              <h4 className="text-sm font-semibold text-gray-900">{getStageLabel(progress)}</h4>
              <p className="text-xs text-gray-500">已用时: {formatTime(elapsedTime)}</p>
            </div>
          </div>
          <span className="text-2xl font-bold text-blue-600">{Math.round(progress)}%</span>
        </div>

        {/* 进度条 */}
        <div className="relative w-full h-3 bg-gray-100 rounded-full overflow-hidden">
          <div
            className="absolute left-0 top-0 h-full bg-gradient-to-r from-blue-500 to-blue-600 rounded-full transition-all duration-500 ease-out"
            style={{ width: `${progress}%` }}
          >
            <div className="absolute inset-0 bg-white opacity-20 animate-shimmer" />
          </div>
        </div>

        {/* 处理阶段指示器 */}
        <div className="flex justify-between mt-4">
          {[
            { label: '读取', threshold: 0 },
            { label: '解析', threshold: 25 },
            { label: '提取', threshold: 50 },
            { label: '处理', threshold: 75 },
            { label: '完成', threshold: 100 },
          ].map((stage, index) => (
            <div key={index} className="flex flex-col items-center">
              <div
                className={`w-3 h-3 rounded-full transition-all duration-300 ${
                  progress >= stage.threshold
                    ? 'bg-blue-500 scale-110'
                    : 'bg-gray-200'
                }`}
              />
              <span
                className={`text-xs mt-1 transition-colors duration-300 ${
                  progress >= stage.threshold ? 'text-blue-600 font-medium' : 'text-gray-400'
                }`}
              >
                {stage.label}
              </span>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (document?.success) {
    const metadata = document.metadata;
    const content = document.content;
    const textContent = content.filter(c => c.type === 'text');
    const imageContent = content.filter(c => c.type === 'image');
    const tableContent = content.filter(c => c.type === 'table');

    return (
      <div className="p-6 bg-white border rounded-xl shadow-sm animate-fade-in">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 flex items-center justify-center rounded-full bg-green-100">
              <svg className="w-5 h-5 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <div>
              <h4 className="text-sm font-semibold text-gray-900">处理完成</h4>
              <p className="text-xs text-gray-500">耗时: {formatTime(document.parseTime || 0)}</p>
            </div>
          </div>
          <button
            onClick={() => setShowDetails(!showDetails)}
            className="text-sm text-blue-600 hover:text-blue-800 transition-colors"
          >
            {showDetails ? '收起详情' : '查看详情'}
          </button>
        </div>

        {/* 统计卡片 */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
          <div className="p-3 bg-blue-50 rounded-lg text-center">
            <p className="text-2xl font-bold text-blue-600">{metadata.pageCount || 0}</p>
            <p className="text-xs text-blue-500">页数</p>
          </div>
          <div className="p-3 bg-green-50 rounded-lg text-center">
            <p className="text-2xl font-bold text-green-600">{textContent.length}</p>
            <p className="text-xs text-green-500">文本块</p>
          </div>
          <div className="p-3 bg-purple-50 rounded-lg text-center">
            <p className="text-2xl font-bold text-purple-600">{imageContent.length}</p>
            <p className="text-xs text-purple-500">图片</p>
          </div>
          <div className="p-3 bg-orange-50 rounded-lg text-center">
            <p className="text-2xl font-bold text-orange-600">{tableContent.length}</p>
            <p className="text-xs text-orange-500">表格</p>
          </div>
        </div>

        {/* 详情面板 */}
        {showDetails && (
          <div className="space-y-3 animate-slide-down">
            {metadata.title && (
              <div className="p-3 bg-gray-50 rounded-lg">
                <p className="text-xs text-gray-500 mb-1">标题</p>
                <p className="text-sm font-medium text-gray-900">{metadata.title}</p>
              </div>
            )}
            {metadata.author && (
              <div className="p-3 bg-gray-50 rounded-lg">
                <p className="text-xs text-gray-500 mb-1">作者</p>
                <p className="text-sm text-gray-900">{metadata.author}</p>
              </div>
            )}

            <div className="p-3 bg-gray-50 rounded-lg">
              <p className="text-xs text-gray-500 mb-1">文件信息</p>
              <div className="flex flex-wrap gap-2">
                <span className="px-2 py-1 text-xs bg-white rounded border">类型: {metadata.type}</span>
                <span className="px-2 py-1 text-xs bg-white rounded border">大小: {(metadata.size / 1024).toFixed(1)} KB</span>
                {metadata.createdAt && (
                  <span className="px-2 py-1 text-xs bg-white rounded border">创建: {new Date(metadata.createdAt).toLocaleDateString()}</span>
                )}
                {metadata.modifiedAt && (
                  <span className="px-2 py-1 text-xs bg-white rounded border">修改: {new Date(metadata.modifiedAt).toLocaleDateString()}</span>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  return null;
}

export default DocumentProcessingStatus;
