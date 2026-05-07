'use client';

import { useState } from 'react';

interface QuickToolsPanelProps {
  onClose: () => void;
  onGenerate: (prompt: string) => void;
}

type ToolType = 'ppt' | 'write' | 'logic' | 'miniApp' | 'translate' | 'summary' | 'code' | 'email';

const tools = [
  { value: 'ppt', label: 'PPT生成', icon: '📊', description: '快速生成PPT演示文稿' },
  { value: 'write', label: '帮我写', icon: '✍️', description: '帮助撰写各种类型的内容' },
  { value: 'logic', label: '逻辑模式', icon: '🧠', description: '提供逻辑分析和推理' },
  { value: 'miniApp', label: '小程序', icon: '📱', description: '开发小程序相关功能' },
  { value: 'translate', label: '翻译', icon: '🌍', description: '多语言翻译服务' },
  { value: 'summary', label: '总结', icon: '📋', description: '总结长文本内容' },
  { value: 'code', label: '代码', icon: '💻', description: '生成和解释代码' },
  { value: 'email', label: '邮件', icon: '📧', description: '撰写专业邮件' },
];

export function QuickToolsPanel({ onClose, onGenerate }: QuickToolsPanelProps) {
  const [selectedTool, setSelectedTool] = useState<ToolType>('ppt');
  const [topic, setTopic] = useState('');
  const [details, setDetails] = useState('');

  const handleGenerate = () => {
    if (!topic.trim()) return;

    let prompt = '';
    switch (selectedTool) {
      case 'ppt':
        prompt = `请生成一个关于"${topic}"的PPT演示文稿，${details ? `详细要求：${details}` : ''}`;
        break;
      case 'write':
        prompt = `请帮我写关于"${topic}"的内容，${details ? `详细要求：${details}` : ''}`;
        break;
      case 'logic':
        prompt = `请对"${topic}"进行逻辑分析，${details ? `详细要求：${details}` : ''}`;
        break;
      case 'miniApp':
        prompt = `请开发一个关于"${topic}"的小程序功能，${details ? `详细要求：${details}` : ''}`;
        break;
      case 'translate':
        prompt = `请翻译"${topic}"，${details ? `详细要求：${details}` : ''}`;
        break;
      case 'summary':
        prompt = `请总结"${topic}"的内容，${details ? `详细要求：${details}` : ''}`;
        break;
      case 'code':
        prompt = `请生成关于"${topic}"的代码，${details ? `详细要求：${details}` : ''}`;
        break;
      case 'email':
        prompt = `请写一封关于"${topic}"的邮件，${details ? `详细要求：${details}` : ''}`;
        break;
    }

    onGenerate(prompt);
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-md">
        <div className="p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-semibold">快捷工具</h2>
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* 工具选择 */}
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">选择工具</label>
            <div className="grid grid-cols-4 gap-2">
              {tools.map((tool) => (
                <button
                  key={tool.value}
                  onClick={() => setSelectedTool(tool.value as ToolType)}
                  className={`flex flex-col items-center p-2 rounded-lg border transition-colors ${
                    selectedTool === tool.value
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                  title={tool.description}
                >
                  <span className="text-xl mb-1">{tool.icon}</span>
                  <span className="text-xs">{tool.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* 主题 */}
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">主题</label>
            <input
              type="text"
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              placeholder={`请输入${tools.find(t => t.value === selectedTool)?.label}的主题`}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* 详细要求 */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">详细要求</label>
            <textarea
              value={details}
              onChange={(e) => setDetails(e.target.value)}
              placeholder="请输入详细要求（可选）"
              rows={3}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* 生成按钮 */}
          <button
            onClick={handleGenerate}
            disabled={!topic.trim()}
            className={`w-full py-3 rounded-lg transition-colors ${
              topic.trim()
                ? 'bg-blue-500 text-white hover:bg-blue-600'
                : 'bg-gray-300 text-gray-500 cursor-not-allowed'
            }`}
          >
            生成内容
          </button>
        </div>
      </div>
    </div>
  );
}

export default QuickToolsPanel;