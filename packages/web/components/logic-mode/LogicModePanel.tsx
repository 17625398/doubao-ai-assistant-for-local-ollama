'use client';

import { useState } from 'react';

interface LogicModePanelProps {
  onClose: () => void;
  onGenerate: (prompt: string) => void;
}

const logicTemplates = [
  { id: 'analysis', name: '问题分析', icon: '🔍', prompt: '请对以下问题进行深入分析：' },
  { id: 'reasoning', name: '逻辑推理', icon: '🧠', prompt: '请使用逻辑推理分析以下内容：' },
  { id: 'mindmap', name: '思维导图', icon: '🗺️', prompt: '请为以下内容创建思维导图结构：' },
  { id: 'decision', name: '决策分析', icon: '⚖️', prompt: '请对以下决策进行利弊分析：' },
  { id: 'cause', name: '因果分析', icon: '➡️', prompt: '请分析以下情况的因果关系：' },
  { id: 'compare', name: '对比分析', icon: '⚖️', prompt: '请对以下内容进行对比分析：' },
];

export function LogicModePanel({ onClose, onGenerate }: LogicModePanelProps) {
  const [selectedTemplate, setSelectedTemplate] = useState<string>('');
  const [content, setContent] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);

  const handleGenerate = async () => {
    if (!content.trim() || !selectedTemplate) return;

    const template = logicTemplates.find(t => t.id === selectedTemplate);
    if (!template) return;

    setIsGenerating(true);
    const prompt = `${template.prompt}${content}`;
    
    try {
      await onGenerate(prompt);
      onClose();
    } catch (error) {
      console.error('Logic mode generation failed:', error);
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[80vh] overflow-y-auto">
        {/* 头部 */}
        <div className="flex items-center justify-between p-4 border-b">
          <h2 className="text-lg font-semibold text-gray-900">逻辑模式</h2>
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-gray-600 transition-colors"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* 内容 */}
        <div className="p-6">
          {/* 逻辑类型选择 */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-3">
              选择分析类型
            </label>
            <div className="grid grid-cols-3 gap-3">
              {logicTemplates.map((template) => (
                <button
                  key={template.id}
                  onClick={() => setSelectedTemplate(template.id)}
                  className={`p-3 rounded-lg border-2 transition-all ${
                    selectedTemplate === template.id
                      ? 'border-blue-500 bg-blue-50 text-blue-700'
                      : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                  }`}
                >
                  <div className="text-2xl mb-1">{template.icon}</div>
                  <div className="text-xs font-medium">{template.name}</div>
                </button>
              ))}
            </div>
          </div>

          {/* 内容输入 */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              分析内容
            </label>
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="请输入需要分析的问题、情况或内容..."
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 min-h-[120px]"
            />
          </div>

          {/* 生成按钮 */}
          <button
            onClick={handleGenerate}
            disabled={isGenerating || !content.trim() || !selectedTemplate}
            className={`w-full py-3 px-4 rounded-lg transition-colors ${
              isGenerating || !content.trim() || !selectedTemplate
                ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                : 'bg-blue-500 text-white hover:bg-blue-600'
            }`}
          >
            {isGenerating ? '分析中...' : '开始分析'}
          </button>

          {/* 提示 */}
          <p className="text-xs text-gray-500 text-center mt-4">
            AI 将使用逻辑思维模式对您的内容进行深入分析
          </p>
        </div>
      </div>
    </div>
  );
}

export default LogicModePanel;
