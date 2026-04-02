'use client';

import { useState, useRef } from 'react';

interface SummaryPanelProps {
  onClose: () => void;
  onGenerate: (prompt: string) => void;
}

export function SummaryPanel({ onClose, onGenerate }: SummaryPanelProps) {
  const [text, setText] = useState('');
  const [summaryType, setSummaryType] = useState('general');
  const [length, setLength] = useState('medium');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const summaryTypes = [
    { value: 'general', label: '通用总结' },
    { value: 'detailed', label: '详细总结' },
    { value: 'concise', label: ' concise总结' },
    { value: 'key-points', label: '要点提取' },
    { value: 'executive', label: '执行摘要' },
    { value: 'technical', label: '技术总结' },
  ];

  const lengthOptions = [
    { value: 'short', label: '简短 (1-2 段)' },
    { value: 'medium', label: '中等 (3-5 段)' },
    { value: 'long', label: '详细 (5+ 段)' },
  ];

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        const content = event.target?.result as string;
        setText(content);
      };
      reader.readAsText(file);
    }
  };

  const handleSubmit = () => {
    if (!text.trim()) return;

    let prompt = '';
    let lengthDescription = '';
    switch (length) {
      case 'short':
        lengthDescription = '1-2 段的简短总结';
        break;
      case 'medium':
        lengthDescription = '3-5 段的中等长度总结';
        break;
      case 'long':
        lengthDescription = '5+ 段的详细总结';
        break;
      default:
        lengthDescription = '中等长度总结';
    }

    switch (summaryType) {
      case 'general':
        prompt = `请对以下内容进行${lengthDescription}的通用总结，涵盖主要内容和关键点：\n\n${text}\n`;
        break;
      case 'detailed':
        prompt = `请对以下内容进行${lengthDescription}的详细总结，包括所有重要细节和信息：\n\n${text}\n`;
        break;
      case 'concise':
        prompt = `请对以下内容进行${lengthDescription}的简洁总结，只保留核心信息：\n\n${text}\n`;
        break;
      case 'key-points':
        prompt = `请从以下内容中提取${lengthDescription}的关键要点，以列表形式呈现：\n\n${text}\n`;
        break;
      case 'executive':
        prompt = `请对以下内容进行${lengthDescription}的执行摘要，适合管理层快速了解：\n\n${text}\n`;
        break;
      case 'technical':
        prompt = `请对以下内容进行${lengthDescription}的技术总结，强调技术细节和实现：\n\n${text}\n`;
        break;
      default:
        prompt = `请对以下内容进行${lengthDescription}的总结：\n\n${text}\n`;
    }

    onGenerate(prompt);
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-3xl max-h-[90vh] overflow-hidden flex flex-col">
        {/* 头部 */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-800">文本总结</h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* 内容 */}
        <div className="flex-1 p-4 overflow-y-auto">
          {/* 配置选项 */}
          <div className="flex flex-wrap gap-4 mb-4">
            <div className="flex-1 min-w-[200px]">
              <label className="block text-sm font-medium text-gray-700 mb-1">总结类型</label>
              <select
                value={summaryType}
                onChange={(e) => setSummaryType(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {summaryTypes.map((type) => (
                  <option key={type.value} value={type.value}>
                    {type.label}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex-1 min-w-[200px]">
              <label className="block text-sm font-medium text-gray-700 mb-1">总结长度</label>
              <select
                value={length}
                onChange={(e) => setLength(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {lengthOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* 文件上传 */}
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">上传文本文件</label>
            <div className="flex items-center gap-3">
              <input
                ref={fileInputRef}
                type="file"
                onChange={handleFileUpload}
                className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
              >
                选择文件
              </button>
            </div>
          </div>

          {/* 文本输入 */}
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">或直接输入文本</label>
            <textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="请输入要总结的文本..."
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 min-h-[200px]"
            />
          </div>
        </div>

        {/* 底部 */}
        <div className="flex items-center justify-end p-4 border-t border-gray-200 gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
          >
            取消
          </button>
          <button
            onClick={handleSubmit}
            disabled={!text.trim()}
            className={`px-4 py-2 rounded-lg transition-colors ${
              text.trim()
                ? 'bg-blue-500 text-white hover:bg-blue-600'
                : 'bg-gray-300 text-gray-500 cursor-not-allowed'
            }`}
          >
            开始总结
          </button>
        </div>
      </div>
    </div>
  );
}

export default SummaryPanel;