'use client';

import { useState } from 'react';

interface MiniProgramPanelProps {
  onClose: () => void;
  onGenerate: (prompt: string) => void;
}

const miniProgramTemplates = [
  { id: 'calculator', name: '计算器', icon: '🧮', prompt: '帮我创建一个计算器小程序，功能包括：' },
  { id: 'todo', name: '待办事项', icon: '✅', prompt: '帮我创建一个待办事项管理小程序，功能包括：' },
  { id: 'weather', name: '天气查询', icon: '🌤️', prompt: '帮我创建一个天气查询小程序，功能包括：' },
  { id: 'timer', name: '计时器', icon: '⏱️', prompt: '帮我创建一个计时器小程序，功能包括：' },
  { id: 'converter', name: '单位换算', icon: '🔄', prompt: '帮我创建一个单位换算小程序，功能包括：' },
  { id: 'notes', name: '便签', icon: '📝', prompt: '帮我创建一个便签小程序，功能包括：' },
  { id: 'password', name: '密码生成', icon: '🔐', prompt: '帮我创建一个密码生成器小程序，功能包括：' },
  { id: 'qr', name: '二维码', icon: '🔲', prompt: '帮我创建一个二维码生成小程序，功能包括：' },
];

export function MiniProgramPanel({ onClose, onGenerate }: MiniProgramPanelProps) {
  const [selectedTemplate, setSelectedTemplate] = useState<string>('');
  const [content, setContent] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);

  const handleGenerate = async () => {
    if (!content.trim() || !selectedTemplate) return;

    const template = miniProgramTemplates.find(t => t.id === selectedTemplate);
    if (!template) return;

    setIsGenerating(true);
    const prompt = `${template.prompt}${content}`;
    
    try {
      await onGenerate(prompt);
      onClose();
    } catch (error) {
      console.error('Mini program generation failed:', error);
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[80vh] overflow-y-auto">
        {/* 头部 */}
        <div className="flex items-center justify-between p-4 border-b">
          <h2 className="text-lg font-semibold text-gray-900">小程序</h2>
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
          {/* 小程序类型选择 */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-3">
              选择小程序类型
            </label>
            <div className="grid grid-cols-4 gap-3">
              {miniProgramTemplates.map((template) => (
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

          {/* 功能描述 */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              功能需求
            </label>
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="请描述您想要的小程序功能需求..."
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
            {isGenerating ? '生成中...' : '生成小程序'}
          </button>

          {/* 提示 */}
          <p className="text-xs text-gray-500 text-center mt-4">
            AI 将根据您的需求生成相应的小程序代码
          </p>
        </div>
      </div>
    </div>
  );
}

export default MiniProgramPanel;
