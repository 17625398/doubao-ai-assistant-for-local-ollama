'use client';

import { useState } from 'react';

interface PPTGenerationPanelProps {
  onClose: () => void;
  onGenerate: (title: string, content: string, style: string, pageCount: number) => void;
}

export function PPTGenerationPanel({ onClose, onGenerate }: PPTGenerationPanelProps) {
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [style, setStyle] = useState('professional');
  const [pageCount, setPageCount] = useState(10);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedPPT, setGeneratedPPT] = useState<string | null>(null);

  const handleGenerate = async () => {
    if (!title.trim() || !content.trim()) return;

    setIsGenerating(true);
    try {
      // 模拟 PPT 生成过程
      await new Promise(resolve => setTimeout(resolve, 3000));
      
      // 模拟生成的 PPT URL
      setGeneratedPPT('https://example.com/generated-ppt.pptx');
    } catch (error) {
      console.error('PPT generation failed:', error);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleDownload = () => {
    if (generatedPPT) {
      // 模拟下载
      window.open(generatedPPT, '_blank');
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[80vh] overflow-y-auto">
        {/* 头部 */}
        <div className="flex items-center justify-between p-4 border-b">
          <h2 className="text-lg font-semibold text-gray-900">PPT 生成</h2>
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
          {/* 标题输入 */}
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              标题
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="请输入 PPT 标题"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          {/* 内容输入 */}
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              内容
            </label>
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="请输入 PPT 内容，包括主要章节和要点"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 min-h-[150px]"
            />
          </div>

          {/* 风格选择 */}
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              风格
            </label>
            <select
              value={style}
              onChange={(e) => setStyle(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="professional">专业商务</option>
              <option value="creative">创意设计</option>
              <option value="minimalist">极简风格</option>
              <option value="academic">学术风格</option>
            </select>
          </div>

          {/* 页数设置 */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              页数: {pageCount}
            </label>
            <input
              type="range"
              min="5"
              max="30"
              value={pageCount}
              onChange={(e) => setPageCount(parseInt(e.target.value))}
              className="w-full"
            />
          </div>

          {/* 生成按钮 */}
          <button
            onClick={handleGenerate}
            disabled={isGenerating || !title.trim() || !content.trim()}
            className={`w-full py-2 px-4 rounded-lg transition-colors ${isGenerating || !title.trim() || !content.trim() ? 'bg-gray-300 text-gray-500 cursor-not-allowed' : 'bg-blue-500 text-white hover:bg-blue-600'}`}
          >
            {isGenerating ? '生成中...' : '生成 PPT'}
          </button>

          {/* 生成结果 */}
          {generatedPPT && (
            <div className="mt-6 p-4 bg-green-50 rounded-lg border border-green-200">
              <div className="flex items-center gap-2 mb-2">
                <svg className="w-5 h-5 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                <h3 className="font-medium text-green-800">PPT 生成成功</h3>
              </div>
              <p className="text-sm text-green-700 mb-4">
                您的 PPT 已生成完成，点击下方按钮下载。
              </p>
              <button
                onClick={handleDownload}
                className="w-full py-2 px-4 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors"
              >
                下载 PPT
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default PPTGenerationPanel;