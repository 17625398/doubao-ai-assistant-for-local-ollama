'use client';

import { useState, useRef, ChangeEvent, useCallback } from 'react';

interface ChatInputProps {
  onSend: (message: string, attachments?: File[]) => void;
  disabled?: boolean;
  onOpenConfig?: () => void;
  currentModel?: string;
  isStreaming?: boolean;
  onDocumentParse?: (file: File) => void;
}

const SUPPORTED_DOC_FORMATS = [
  { ext: '.pdf', label: 'PDF', color: 'text-red-500', bg: 'bg-red-50' },
  { ext: '.doc', label: 'Word', color: 'text-blue-500', bg: 'bg-blue-50' },
  { ext: '.docx', label: 'Word', color: 'text-blue-500', bg: 'bg-blue-50' },
  { ext: '.xls', label: 'Excel', color: 'text-green-500', bg: 'bg-green-50' },
  { ext: '.xlsx', label: 'Excel', color: 'text-green-500', bg: 'bg-green-50' },
  { ext: '.ppt', label: 'PPT', color: 'text-orange-500', bg: 'bg-orange-50' },
  { ext: '.pptx', label: 'PPT', color: 'text-orange-500', bg: 'bg-orange-50' },
  { ext: '.txt', label: '文本', color: 'text-gray-500', bg: 'bg-gray-50' },
  { ext: '.md', label: 'Markdown', color: 'text-gray-500', bg: 'bg-gray-50' },
  { ext: '.html', label: 'HTML', color: 'text-purple-500', bg: 'bg-purple-50' },
  { ext: '.htm', label: 'HTML', color: 'text-purple-500', bg: 'bg-purple-50' },
];

const getFileIcon = (fileName: string) => {
  const ext = '.' + fileName.split('.').pop()?.toLowerCase();
  const format = SUPPORTED_DOC_FORMATS.find(f => f.ext === ext);
  return format || { label: '文件', color: 'text-gray-500', bg: 'bg-gray-50' };
};

export function ChatInput({ onSend, disabled, onOpenConfig, currentModel, isStreaming, onDocumentParse }: ChatInputProps) {
  const [message, setMessage] = useState('');
  const [attachments, setAttachments] = useState<File[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [showMoreMenu, setShowMoreMenu] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [showDocPanel, setShowDocPanel] = useState(false);
  const [docParseStatus, setDocParseStatus] = useState<'idle' | 'parsing' | 'done' | 'error'>('idle');
  const [docParseError, setDocParseError] = useState<string | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const codeInputRef = useRef<HTMLInputElement>(null);
  const docInputRef = useRef<HTMLInputElement>(null);
  const recordingIntervalRef = useRef<NodeJS.Timeout | null>(null);

  const handleSubmit = useCallback(() => {
    if ((!message.trim() && attachments.length === 0) || disabled || isStreaming) return;

    onSend(message, attachments.length > 0 ? attachments : undefined);
    setMessage('');
    setAttachments([]);

    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }
  }, [message, attachments, disabled, isStreaming, onSend]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  const handleInput = (e: ChangeEvent<HTMLTextAreaElement>) => {
    setMessage(e.target.value);

    const textarea = e.target;
    textarea.style.height = 'auto';
    textarea.style.height = `${Math.min(textarea.scrollHeight, 200)}px`;
  };

  const handleFileSelect = (e: ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    setAttachments(prev => [...prev, ...files]);
  };

  const removeAttachment = (index: number) => {
    setAttachments(prev => prev.filter((_, i) => i !== index));
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);

    const files = Array.from(e.dataTransfer.files);
    setAttachments(prev => [...prev, ...files]);
  };

  const toggleRecording = () => {
    if (isRecording) {
      setIsRecording(false);
      if (recordingIntervalRef.current) {
        clearInterval(recordingIntervalRef.current);
        recordingIntervalRef.current = null;
      }
      setRecordingTime(0);
      window.dispatchEvent(new CustomEvent('voice-input-stop'));
    } else {
      setIsRecording(true);
      setRecordingTime(0);
      recordingIntervalRef.current = setInterval(() => {
        setRecordingTime(prev => prev + 1);
      }, 1000);
      window.dispatchEvent(new CustomEvent('voice-input-start'));
    }
  };

  const formatRecordingTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // 文档解析相关
  const handleDocSelect = (e: ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length > 0) {
      const file = files[0];
      // 验证文件
      const maxSize = 50 * 1024 * 1024;
      if (file.size > maxSize) {
        setDocParseError(`文件超过 50MB 限制`);
        setDocParseStatus('error');
        return;
      }
      const supportedExts = SUPPORTED_DOC_FORMATS.map(f => f.ext);
      const ext = '.' + file.name.split('.').pop()?.toLowerCase();
      if (!supportedExts.includes(ext)) {
        setDocParseError(`不支持的文件格式: ${ext}`);
        setDocParseStatus('error');
        return;
      }

      setDocParseStatus('parsing');
      setDocParseError(null);
      setShowDocPanel(true);

      // 调用解析回调
      if (onDocumentParse) {
        onDocumentParse(file);
      } else {
        // 如果没有提供回调，模拟解析完成
        setTimeout(() => {
          setDocParseStatus('done');
        }, 2000);
      }
    }
    if (docInputRef.current) {
      docInputRef.current.value = '';
    }
  };

  const handleDocButtonClick = () => {
    docInputRef.current?.click();
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const canSubmit = message.trim().length > 0 || attachments.length > 0;

  return (
    <div
      className={`border-t bg-white px-4 py-4 transition-all duration-300 ${isDragging ? 'bg-blue-50' : ''}`}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      <div className="max-w-4xl mx-auto">
        {/* 文档解析面板 */}
        {showDocPanel && (
          <div className="mb-3 p-4 bg-blue-50 border border-blue-200 rounded-xl animate-fade-in">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                <span className="text-sm font-medium text-blue-800">文档解析</span>
              </div>
              <button
                onClick={() => {
                  setShowDocPanel(false);
                  setDocParseStatus('idle');
                  setDocParseError(null);
                }}
                className="text-blue-400 hover:text-blue-600"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {docParseStatus === 'parsing' && (
              <div className="flex items-center gap-3">
                <div className="w-5 h-5 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
                <span className="text-sm text-blue-700">正在解析文档...</span>
              </div>
            )}

            {docParseStatus === 'done' && (
              <div className="flex items-center gap-2 text-green-700">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                <span className="text-sm">文档解析完成，可以在对话中提问了</span>
              </div>
            )}

            {docParseStatus === 'error' && docParseError && (
              <div className="flex items-center gap-2 text-red-700">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span className="text-sm">{docParseError}</span>
              </div>
            )}

            {docParseStatus === 'idle' && (
              <div className="flex items-center gap-2">
                <button
                  onClick={handleDocButtonClick}
                  className="px-4 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 transition-colors"
                >
                  选择文档
                </button>
                <span className="text-xs text-blue-500">支持 PDF、Word、Excel、PPT 等格式</span>
              </div>
            )}
          </div>
        )}

        {/* 文档解析专用隐藏输入 */}
        <input
          ref={docInputRef}
          type="file"
          className="hidden"
          onChange={handleDocSelect}
          accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.md,.html,.htm"
        />

        {/* 附件预览 */}
        {attachments.length > 0 && (
          <div className="flex gap-2 mb-3 flex-wrap animate-fade-in">
            {attachments.map((file, index) => {
              const icon = getFileIcon(file.name);
              return (
                <div
                  key={index}
                  className="flex items-center gap-2 bg-gray-100 rounded-lg px-3 py-2 hover:bg-gray-200 transition-colors group"
                >
                  {file.type.startsWith('image/') ? (
                    <img
                      src={URL.createObjectURL(file)}
                      alt={file.name}
                      className="w-8 h-8 object-cover rounded"
                    />
                  ) : (
                    <div className={`w-8 h-8 flex items-center justify-center rounded ${icon.bg}`}>
                      <span className={`text-xs font-bold ${icon.color}`}>{icon.label[0]}</span>
                    </div>
                  )}
                  <span className="text-sm text-gray-600 max-w-[150px] truncate">
                    {file.name}
                  </span>
                  <span className="text-xs text-gray-400">{formatFileSize(file.size)}</span>
                  <button
                    onClick={() => removeAttachment(index)}
                    className="text-gray-400 hover:text-red-500 transition-colors p-1"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              );
            })}
          </div>
        )}

        {/* 录音状态指示器 */}
        {isRecording && (
          <div className="flex items-center gap-3 mb-3 p-3 bg-red-50 border border-red-200 rounded-xl animate-pulse">
            <div className="w-3 h-3 bg-red-500 rounded-full animate-ping" />
            <div className="flex-1">
              <p className="text-sm font-medium text-red-700">正在录音...</p>
              <div className="flex items-center gap-1 mt-1">
                {[...Array(5)].map((_, i) => (
                  <div
                    key={i}
                    className="w-1 bg-red-400 rounded-full animate-sound-wave"
                    style={{
                      height: `${Math.random() * 20 + 8}px`,
                      animationDelay: `${i * 0.1}s`
                    }}
                  />
                ))}
              </div>
            </div>
            <span className="text-lg font-mono font-bold text-red-600">{formatRecordingTime(recordingTime)}</span>
            <button
              onClick={toggleRecording}
              className="px-3 py-1.5 text-sm bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
            >
              停止
            </button>
          </div>
        )}

        {/* 输入框 */}
        <div className="flex items-end gap-3 bg-gray-100 rounded-2xl px-4 py-3 transition-all duration-200 focus-within:ring-2 focus-within:ring-blue-500 focus-within:bg-white">
          {/* 功能按钮 */}
          <div className="flex items-center gap-1">
            {/* 文档解析按钮 - 新增 */}
            <div className="relative group">
              <button
                onClick={() => {
                  if (showDocPanel) {
                    setShowDocPanel(false);
                  } else {
                    handleDocButtonClick();
                  }
                }}
                className={`p-2 rounded-lg transition-all ${
                  showDocPanel 
                    ? 'text-blue-600 bg-blue-100' 
                    : 'text-gray-500 hover:text-blue-500 hover:bg-blue-50'
                }`}
                disabled={disabled || isRecording}
                title="文档解析"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </button>
              <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-3 py-2 bg-gray-800 text-white text-xs rounded-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 whitespace-nowrap z-50">
                文档解析
                <div className="absolute top-full left-1/2 transform -translate-x-1/2 border-4 border-transparent border-t-gray-800" />
              </div>
            </div>

            {/* 上传文件按钮 */}
            <div className="relative group">
              <button
                onClick={() => fileInputRef.current?.click()}
                className="p-2 text-gray-500 hover:text-blue-500 hover:bg-blue-50 rounded-lg transition-all"
                disabled={disabled || isRecording}
                title="上传文件或图片"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
                </svg>
              </button>
              <input
                ref={fileInputRef}
                type="file"
                multiple
                className="hidden"
                onChange={handleFileSelect}
                accept="image/*,.pdf,.doc,.docx,.txt"
              />
              <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-3 py-2 bg-gray-800 text-white text-xs rounded-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 whitespace-nowrap z-50">
                上传文件或图片
                <div className="absolute top-full left-1/2 transform -translate-x-1/2 border-4 border-transparent border-t-gray-800" />
              </div>
            </div>

            {/* 上传代码按钮 */}
            <div className="relative group">
              <button
                onClick={() => codeInputRef.current?.click()}
                className="p-2 text-gray-500 hover:text-blue-500 hover:bg-blue-50 rounded-lg transition-all"
                disabled={disabled || isRecording}
                title="上传代码"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
                </svg>
              </button>
              <input
                ref={codeInputRef}
                type="file"
                className="hidden"
                onChange={handleFileSelect}
                accept=".js,.ts,.jsx,.tsx,.html,.css,.py,.java,.c,.cpp,.cs"
              />
              <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-3 py-2 bg-gray-800 text-white text-xs rounded-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 whitespace-nowrap z-50">
                上传代码文件
                <div className="absolute top-full left-1/2 transform -translate-x-1/2 border-4 border-transparent border-t-gray-800" />
              </div>
            </div>

            {/* 截图提问按钮 */}
            <div className="relative group">
              <button
                onClick={() => window.dispatchEvent(new CustomEvent('open-screenshot-question'))}
                className="p-2 text-gray-500 hover:text-blue-500 hover:bg-blue-50 rounded-lg transition-all"
                disabled={disabled || isRecording}
                title="截图提问"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
              </button>
              <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-3 py-2 bg-gray-800 text-white text-xs rounded-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 whitespace-nowrap z-50">
                截图提问
                <div className="absolute top-full left-1/2 transform -translate-x-1/2 border-4 border-transparent border-t-gray-800" />
              </div>
            </div>
          </div>

          {/* 文本输入 */}
          <textarea
            ref={textareaRef}
            value={message}
            onChange={handleInput}
            onKeyDown={handleKeyDown}
            placeholder={isRecording ? '正在听您说话...' : showDocPanel ? '文档已上传，可以提问了...' : '有什么我能帮你的吗？'}
            className="flex-1 bg-transparent resize-none outline-none text-sm max-h-[200px] min-h-[24px] disabled:opacity-50"
            rows={1}
            disabled={disabled || isRecording}
          />

          {/* 发送按钮 */}
          <button
            onClick={handleSubmit}
            disabled={!canSubmit || disabled || isStreaming || isRecording}
            className={`p-2.5 rounded-xl transition-all duration-200 ${
              canSubmit && !disabled && !isStreaming && !isRecording
                ? 'bg-blue-500 text-white hover:bg-blue-600 hover:scale-105 active:scale-95 shadow-md'
                : 'bg-gray-300 text-gray-500 cursor-not-allowed'
            }`}
            title="发送消息 (Enter)"
          >
            {isStreaming ? (
              <svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
              </svg>
            ) : (
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
              </svg>
            )}
          </button>
        </div>

        {/* 底部工具栏 */}
        <div className="flex items-center justify-between mt-2">
          {/* 快捷功能按钮 */}
          <div className="flex items-center gap-2 flex-wrap">
            <button 
              className="text-xs text-gray-500 hover:text-blue-500 transition-colors flex items-center gap-1 px-2 py-1 rounded hover:bg-gray-100"
              onClick={() => window.dispatchEvent(new CustomEvent('open-ppt-generation'))}
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              PPT 生成
            </button>
            <span className="text-gray-300">|</span>
            <button 
              className="text-xs text-gray-500 hover:text-blue-500 transition-colors flex items-center gap-1 px-2 py-1 rounded hover:bg-gray-100"
              onClick={() => window.dispatchEvent(new CustomEvent('open-writing-assistant'))}
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
              </svg>
              帮我写
            </button>
            <span className="text-gray-300">|</span>
            <button 
              className="text-xs text-gray-500 hover:text-blue-500 transition-colors flex items-center gap-1 px-2 py-1 rounded hover:bg-gray-100"
              onClick={() => window.dispatchEvent(new CustomEvent('open-logic-mode'))}
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
              </svg>
              逻辑模式
            </button>
            <span className="text-gray-300">|</span>
            <div className="relative">
              <button 
                className="text-xs text-gray-500 hover:text-blue-500 transition-colors flex items-center gap-1 px-2 py-1 rounded hover:bg-gray-100"
                onClick={() => setShowMoreMenu(!showMoreMenu)}
              >
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 12h.01M12 12h.01M19 12h.01M6 12a1 1 0 11-2 0 1 1 0 012 0zm7 0a1 1 0 11-2 0 1 1 0 012 0zm7 0a1 1 0 11-2 0 1 1 0 012 0z" />
                </svg>
                更多
              </button>
              
              {/* 更多菜单 */}
              {showMoreMenu && (
                <div className="absolute bottom-full left-0 mb-2 w-48 bg-white shadow-lg rounded-xl border border-gray-200 py-2 z-50 animate-fade-in">
                  <button
                    className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 transition-colors flex items-center gap-2"
                    onClick={() => {
                      onOpenConfig?.();
                      setShowMoreMenu(false);
                    }}
                  >
                    <span>⚙️</span> 设置
                  </button>
                  <button
                    className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 transition-colors flex items-center gap-2"
                    onClick={() => {
                      window.dispatchEvent(new CustomEvent('open-translation'));
                      setShowMoreMenu(false);
                    }}
                  >
                    <span>🌐</span> 翻译
                  </button>
                  <button
                    className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 transition-colors flex items-center gap-2"
                    onClick={() => {
                      window.dispatchEvent(new CustomEvent('open-summary'));
                      setShowMoreMenu(false);
                    }}
                  >
                    <span>📝</span> 总结
                  </button>
                  <button
                    className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 transition-colors flex items-center gap-2"
                    onClick={() => {
                      window.dispatchEvent(new CustomEvent('open-code-review'));
                      setShowMoreMenu(false);
                    }}
                  >
                    <span>💻</span> 代码审查
                  </button>
                  <button
                    className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 transition-colors flex items-center gap-2"
                    onClick={() => {
                      window.dispatchEvent(new CustomEvent('open-data-analysis'));
                      setShowMoreMenu(false);
                    }}
                  >
                    <span>📊</span> 数据分析
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* 右侧工具 */}
          <div className="flex items-center gap-2">
            {/* 语音输入按钮 */}
            <button 
              className={`p-2 rounded-lg transition-all duration-200 ${
                isRecording 
                  ? 'bg-red-100 text-red-500 animate-pulse' 
                  : 'text-gray-500 hover:text-blue-500 hover:bg-blue-50'
              }`}
              onClick={toggleRecording}
              title={isRecording ? '停止录音' : '语音输入'}
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
              </svg>
            </button>

            {/* 当前模型显示 */}
            {currentModel && (
              <span className="text-xs text-gray-400 bg-gray-100 px-2 py-1 rounded-full">
                {currentModel}
              </span>
            )}
          </div>
        </div>

        {/* 提示文字 */}
        <p className="text-xs text-gray-400 text-center mt-1">
          {isStreaming ? 'AI 正在思考中...' : showDocPanel ? '文档已解析，可以直接提问文档内容' : 'AI 生成的内容可能存在错误，请仔细核对'}
        </p>
      </div>
    </div>
  );
}

export default ChatInput;
