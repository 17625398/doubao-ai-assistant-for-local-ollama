'use client';

import { useState, useRef, ChangeEvent } from 'react';

interface ChatInputProps {
  onSend: (message: string, attachments?: File[]) => void;
  disabled?: boolean;
  onOpenConfig?: () => void;
  currentModel?: string;
}

export function ChatInput({ onSend, disabled, onOpenConfig, currentModel }: ChatInputProps) {
  const [message, setMessage] = useState('');
  const [attachments, setAttachments] = useState<File[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [showMoreOptions, setShowMoreOptions] = useState(false);
  const [showMoreMenu, setShowMoreMenu] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const codeInputRef = useRef<HTMLInputElement>(null);

  const handleSubmit = () => {
    if ((!message.trim() && attachments.length === 0) || disabled) return;

    onSend(message, attachments.length > 0 ? attachments : undefined);
    setMessage('');
    setAttachments([]);

    // 重置 textarea 高度
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  const handleInput = (e: ChangeEvent<HTMLTextAreaElement>) => {
    setMessage(e.target.value);

    // 自动调整高度
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

  const canSubmit = message.trim().length > 0 || attachments.length > 0;

  return (
    <div
      className={`border-t bg-white px-4 py-4 ${isDragging ? 'bg-blue-50' : ''}`}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      <div className="max-w-4xl mx-auto">
        {/* 附件预览 */}
        {attachments.length > 0 && (
          <div className="flex gap-2 mb-3 flex-wrap">
            {attachments.map((file, index) => (
              <div
                key={index}
                className="flex items-center gap-2 bg-gray-100 rounded-lg px-3 py-2"
              >
                {file.type.startsWith('image/') ? (
                  <img
                    src={URL.createObjectURL(file)}
                    alt={file.name}
                    className="w-8 h-8 object-cover rounded"
                  />
                ) : (
                  <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                )}
                <span className="text-sm text-gray-600 max-w-[150px] truncate">
                  {file.name}
                </span>
                <button
                  onClick={() => removeAttachment(index)}
                  className="text-gray-400 hover:text-red-500"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            ))}
          </div>
        )}

        {/* 输入框 */}
        <div className="flex items-end gap-3 bg-gray-100 rounded-2xl px-4 py-3">
          {/* 功能按钮 */}
          <div className="flex items-center gap-2">
            {/* 上传文件按钮 */}
            <div className="relative group">
              <button
                onClick={() => fileInputRef.current?.click()}
                className="p-2 text-gray-500 hover:text-blue-500 transition-colors"
                disabled={disabled}
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
              <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 w-48 bg-white shadow-lg rounded-lg p-2 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200">
                <div className="text-xs text-gray-700 mb-1">上传文件或图片</div>
                <div className="text-xs text-gray-500">支持 PDF、Word、图片等格式</div>
              </div>
            </div>

            {/* 上传代码按钮 */}
            <div className="relative group">
              <button
                onClick={() => codeInputRef.current?.click()}
                className="p-2 text-gray-500 hover:text-blue-500 transition-colors"
                disabled={disabled}
                title="上传代码"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </button>
              <input
                ref={codeInputRef}
                type="file"
                className="hidden"
                onChange={handleFileSelect}
                accept=".js,.ts,.jsx,.tsx,.html,.css,.py,.java,.c,.cpp,.cs"
              />
              <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 w-48 bg-white shadow-lg rounded-lg p-2 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200">
                <div className="text-xs text-gray-700 mb-1">上传代码</div>
                <div className="text-xs text-gray-500">支持多种编程语言</div>
              </div>
            </div>

            {/* 截图提问按钮 */}
            <div className="relative group">
              <button
                onClick={() => window.dispatchEvent(new CustomEvent('open-screenshot-question'))}
                className="p-2 text-gray-500 hover:text-blue-500 transition-colors"
                disabled={disabled}
                title="截图提问"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
              </button>
              <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 w-48 bg-white shadow-lg rounded-lg p-2 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200">
                <div className="text-xs text-gray-700 mb-1">截图提问</div>
                <div className="text-xs text-gray-500">截取屏幕内容进行分析</div>
              </div>
            </div>

            {/* 书签按钮 */}
            <div className="relative group">
              <button
                onClick={() => window.dispatchEvent(new CustomEvent('open-bookmark-panel'))}
                className="p-2 text-gray-500 hover:text-blue-500 transition-colors"
                disabled={disabled}
                title="查看书签"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
                </svg>
              </button>
              <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 w-48 bg-white shadow-lg rounded-lg p-2 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200">
                <div className="text-xs text-gray-700 mb-1">查看书签</div>
                <div className="text-xs text-gray-500">管理和查看已保存的书签</div>
              </div>
            </div>

            {/* 更多选项按钮 */}
            <div className="relative group">
              <button
                onClick={() => setShowMoreOptions(!showMoreOptions)}
                className="p-2 text-gray-500 hover:text-blue-500 transition-colors"
                disabled={disabled}
                title="更多选项"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                </svg>
              </button>
              {showMoreOptions && (
                <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 w-48 bg-white shadow-lg rounded-lg p-2">
                  <div className="text-xs text-gray-700 mb-1">更多选项</div>
                  <button 
                    className="w-full text-left text-xs text-gray-600 hover:bg-gray-100 rounded px-2 py-1"
                    onClick={() => window.dispatchEvent(new CustomEvent('open-screen-share'))}
                  >
                    共享屏幕
                  </button>
                  <button 
                    className="w-full text-left text-xs text-gray-600 hover:bg-gray-100 rounded px-2 py-1"
                    onClick={() => window.dispatchEvent(new CustomEvent('open-add-bookmark', { detail: { content: message, title: message.substring(0, 50) } }))}
                  >
                    添加书签
                  </button>
                  <button className="w-full text-left text-xs text-gray-600 hover:bg-gray-100 rounded px-2 py-1">
                    应用
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* 文本输入 */}
          <textarea
            ref={textareaRef}
            value={message}
            onChange={handleInput}
            onKeyDown={handleKeyDown}
            placeholder="有什么我能帮你的吗？"
            className="flex-1 bg-transparent resize-none outline-none text-sm max-h-[200px] min-h-[24px]"
            rows={1}
            disabled={disabled}
          />

          {/* 发送按钮 */}
          <button
            onClick={handleSubmit}
            disabled={!canSubmit || disabled}
            className={`p-2 rounded-xl transition-all ${
              canSubmit && !disabled
                ? 'bg-blue-500 text-white hover:bg-blue-600'
                : 'bg-gray-300 text-gray-500 cursor-not-allowed'
            }`}
            title="发送消息"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
            </svg>
          </button>
        </div>

        {/* 底部工具栏 */}
        <div className="flex items-center justify-between mt-2">
          {/* 快捷功能按钮 */}
          <div className="flex items-center gap-2">
            <button className="text-xs text-gray-500 hover:text-blue-500 transition-colors flex items-center gap-1">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
              快捷
            </button>
            <span className="text-gray-300">|</span>
            <button 
              className="text-xs text-gray-500 hover:text-blue-500 transition-colors flex items-center gap-1"
              onClick={() => window.dispatchEvent(new CustomEvent('open-ppt-generation'))}
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              PPT 生成
            </button>
            <span className="text-gray-300">|</span>
            <button 
              className="text-xs text-gray-500 hover:text-blue-500 transition-colors flex items-center gap-1"
              onClick={() => window.dispatchEvent(new CustomEvent('open-writing-assistant'))}
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
              </svg>
              帮我写
            </button>
            <span className="text-gray-300">|</span>
            <button 
              className="text-xs text-gray-500 hover:text-blue-500 transition-colors flex items-center gap-1"
              onClick={() => window.dispatchEvent(new CustomEvent('open-logic-mode'))}
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
              </svg>
              逻辑模式
            </button>
            <span className="text-gray-300">|</span>
            <button 
              className="text-xs text-gray-500 hover:text-blue-500 transition-colors flex items-center gap-1"
              onClick={() => window.dispatchEvent(new CustomEvent('open-mini-program'))}
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
              </svg>
              小程序
            </button>
            <span className="text-gray-300">|</span>
            <div className="relative">
              <button 
                className="text-xs text-gray-500 hover:text-blue-500 transition-colors flex items-center gap-1"
                onClick={() => setShowMoreMenu(!showMoreMenu)}
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
                更多
              </button>
              
              {/* 更多菜单 */}
              {showMoreMenu && (
                <div className="absolute bottom-full left-0 mb-2 w-48 bg-white shadow-lg rounded-lg border border-gray-200 py-2 z-50">
                  <button
                    className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 transition-colors"
                    onClick={() => {
                      console.log('[ChatInput] 设置按钮被点击');
                      onOpenConfig?.();
                      setShowMoreMenu(false);
                    }}
                  >
                    ⚙️ 设置
                  </button>
                  <button
                    className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 transition-colors"
                    onClick={() => {
                      window.dispatchEvent(new CustomEvent('open-translation'));
                      setShowMoreMenu(false);
                    }}
                  >
                    🌐 翻译
                  </button>
                  <button
                    className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 transition-colors"
                    onClick={() => {
                      window.dispatchEvent(new CustomEvent('open-audio-translate'));
                      setShowMoreMenu(false);
                    }}
                  >
                    🎵 音频翻译
                  </button>
                  <button
                    className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 transition-colors"
                    onClick={() => {
                      window.dispatchEvent(new CustomEvent('open-summary'));
                      setShowMoreMenu(false);
                    }}
                  >
                    📝 总结
                  </button>
                  <button
                    className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 transition-colors"
                    onClick={() => {
                      window.dispatchEvent(new CustomEvent('open-code-review'));
                      setShowMoreMenu(false);
                    }}
                  >
                    💻 代码审查
                  </button>
                  <button
                    className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 transition-colors"
                    onClick={() => {
                      window.dispatchEvent(new CustomEvent('open-data-analysis'));
                      setShowMoreMenu(false);
                    }}
                  >
                    📊 数据分析
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* 语音输入按钮 */}
          <button 
            className="p-1 text-gray-500 hover:text-blue-500 transition-colors"
            onClick={() => window.dispatchEvent(new CustomEvent('open-voice-chat'))}
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
            </svg>
          </button>
        </div>

        {/* 提示文字 */}
        <p className="text-xs text-gray-400 text-center mt-1">
          AI 生成的内容可能存在错误，请仔细核对
        </p>
      </div>
    </div>
  );
}

export default ChatInput;
