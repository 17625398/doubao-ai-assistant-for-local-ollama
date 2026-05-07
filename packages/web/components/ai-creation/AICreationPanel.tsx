'use client';

import { useState } from 'react';

interface AICreationPanelProps {
  onClose: () => void;
  onGenerate: (prompt: string) => void;
}

type CreationType = 'article' | 'story' | 'poem' | 'code' | 'email' | 'summary' | 'other';

const creationTypes = [
  { value: 'article', label: '文章', icon: '📝' },
  { value: 'story', label: '故事', icon: '📖' },
  { value: 'poem', label: '诗歌', icon: '🎭' },
  { value: 'code', label: '代码', icon: '💻' },
  { value: 'email', label: '邮件', icon: '📧' },
  { value: 'summary', label: '总结', icon: '📋' },
  { value: 'other', label: '其他', icon: '✨' },
];

export function AICreationPanel({ onClose, onGenerate }: AICreationPanelProps) {
  const [creationType, setCreationType] = useState<CreationType>('article');
  const [topic, setTopic] = useState('');
  const [length, setLength] = useState('medium');
  const [tone, setTone] = useState('neutral');
  const [additionalInfo, setAdditionalInfo] = useState('');

  const handleGenerate = () => {
    if (!topic.trim()) return;

    let prompt = '';
    switch (creationType) {
      case 'article':
        prompt = `请写一篇关于"${topic}"的文章，风格${getToneText(tone)}，长度${getLengthText(length)}。${additionalInfo ? `额外要求：${additionalInfo}` : ''}`;
        break;
      case 'story':
        prompt = `请写一个关于"${topic}"的故事，风格${getToneText(tone)}，长度${getLengthText(length)}。${additionalInfo ? `额外要求：${additionalInfo}` : ''}`;
        break;
      case 'poem':
        prompt = `请写一首关于"${topic}"的诗歌，风格${getToneText(tone)}，长度${getLengthText(length)}。${additionalInfo ? `额外要求：${additionalInfo}` : ''}`;
        break;
      case 'code':
        prompt = `请编写关于"${topic}"的代码，风格${getToneText(tone)}，长度${getLengthText(length)}。${additionalInfo ? `额外要求：${additionalInfo}` : ''}`;
        break;
      case 'email':
        prompt = `请写一封关于"${topic}"的邮件，风格${getToneText(tone)}，长度${getLengthText(length)}。${additionalInfo ? `额外要求：${additionalInfo}` : ''}`;
        break;
      case 'summary':
        prompt = `请总结关于"${topic}"的内容，风格${getToneText(tone)}，长度${getLengthText(length)}。${additionalInfo ? `额外要求：${additionalInfo}` : ''}`;
        break;
      case 'other':
        prompt = `请创作关于"${topic}"的内容，风格${getToneText(tone)}，长度${getLengthText(length)}。${additionalInfo ? `额外要求：${additionalInfo}` : ''}`;
        break;
    }

    onGenerate(prompt);
    onClose();
  };

  const getToneText = (tone: string) => {
    switch (tone) {
      case 'formal': return '正式';
      case 'casual': return '轻松';
      case 'professional': return '专业';
      case 'creative': return '创意';
      default: return '中性';
    }
  };

  const getLengthText = (length: string) => {
    switch (length) {
      case 'short': return '简短';
      case 'medium': return '中等';
      case 'long': return '详细';
      default: return '中等';
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-md">
        <div className="p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-semibold">AI创作</h2>
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* 创作类型 */}
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">创作类型</label>
            <div className="grid grid-cols-3 gap-2">
              {creationTypes.map((type) => (
                <button
                  key={type.value}
                  onClick={() => setCreationType(type.value as CreationType)}
                  className={`flex flex-col items-center p-3 rounded-lg border transition-colors ${
                    creationType === type.value
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <span className="text-2xl mb-1">{type.icon}</span>
                  <span className="text-sm">{type.label}</span>
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
              placeholder="请输入创作主题"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* 长度和风格 */}
          <div className="grid grid-cols-2 gap-4 mb-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">长度</label>
              <select
                value={length}
                onChange={(e) => setLength(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="short">简短</option>
                <option value="medium">中等</option>
                <option value="long">详细</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">风格</label>
              <select
                value={tone}
                onChange={(e) => setTone(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="neutral">中性</option>
                <option value="formal">正式</option>
                <option value="casual">轻松</option>
                <option value="professional">专业</option>
                <option value="creative">创意</option>
              </select>
            </div>
          </div>

          {/* 额外信息 */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">额外要求</label>
            <textarea
              value={additionalInfo}
              onChange={(e) => setAdditionalInfo(e.target.value)}
              placeholder="请输入额外的创作要求（可选）"
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

export default AICreationPanel;