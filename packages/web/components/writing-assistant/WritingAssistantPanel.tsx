'use client';

import { useState } from 'react';

interface WritingAssistantPanelProps {
  onClose: () => void;
  onGenerate: (prompt: string) => void;
}

const writingTemplates = [
  { id: 'email', name: '邮件', icon: '✉️', prompt: '帮我写一封专业的邮件，主题是：' },
  { id: 'summary', name: '总结', icon: '📝', prompt: '请帮我总结以下内容：' },
  { id: 'report', name: '报告', icon: '📊', prompt: '帮我写一份报告，主题是：' },
  { id: 'essay', name: '文章', icon: '📄', prompt: '帮我写一篇文章，主题是：' },
  { id: 'story', name: '故事', icon: '📖', prompt: '帮我写一个有趣的故事，主题是：' },
  { id: 'poem', name: '诗歌', icon: '🎭', prompt: '帮我写一首诗歌，主题是：' },
  { id: 'code', name: '代码', icon: '💻', prompt: '帮我写一段代码，需求是：' },
  { id: 'resume', name: '简历', icon: '👤', prompt: '帮我写一份简历，突出以下经历：' },
];

export function WritingAssistantPanel({ onClose, onGenerate }: WritingAssistantPanelProps) {
  const [selectedTemplate, setSelectedTemplate] = useState<string>('');
  const [content, setContent] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);

  const handleGenerate = async () => {
    if (!content.trim() || !selectedTemplate) return;

    const template = writingTemplates.find(t => t.id === selectedTemplate);
    if (!template) return;

    setIsGenerating(true);
    const prompt = `${template.prompt}${content}`;
    
    try {
      await onGenerate(prompt);
      onClose();
    } catch (error) {
      console.error('Writing generation failed:', error);
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[80vh] overflow-y-auto">
        {/* 头部 */}
        <div className="flex items-center justify-between p-4 border-b">
          <h2 className="text-lg font-semibold text-gray-900">帮我写</h2>
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
          {/* 写作类型选择 */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-3">
              选择写作类型
            </label>
            <div className="grid grid-cols-4 gap-3">
              {writingTemplates.map((template) => (
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
              内容描述
            </label>
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="请输入您想要写作的内容描述、主题或要求..."
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
            {isGenerating ? '生成中...' : '开始写作'}
          </button>

          {/* 提示 */}
          <p className="text-xs text-gray-500 text-center mt-4">
            AI 将根据您的描述生成相应的内容，请尽量详细描述您的需求
          </p>
        </div>
      </div>
    </div>
  );
}

export default WritingAssistantPanel;
