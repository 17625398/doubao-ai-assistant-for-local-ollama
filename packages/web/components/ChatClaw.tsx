'use client';

import React, { useState } from 'react';

interface ChatClawProps {
  onClose?: () => void;
}

export function ChatClaw({ onClose }: ChatClawProps) {
  const [inputText, setInputText] = useState('');
  const [analysis, setAnalysis] = useState<{
    emotion?: string;
    sentiment?: string;
    keywords?: string[];
    suggestions?: string[];
  } | null>(null);

  const analyzeText = () => {
    if (!inputText.trim()) return;

    // 简单的情感分析模拟
    const positiveWords = ['好', '喜欢', '开心', '高兴', '棒', '优秀', '完美', '谢谢', '爱你'];
    const negativeWords = ['差', '讨厌', '难过', '失望', '糟糕', '垃圾', '烂', '烦', '恨'];
    const neutralWords = ['是', '的', '了', '和', '与', '或'];

    const words = inputText.split('');
    let positiveCount = 0;
    let negativeCount = 0;

    positiveWords.forEach(w => {
      if (inputText.includes(w)) positiveCount++;
    });

    negativeWords.forEach(w => {
      if (inputText.includes(w)) negativeCount++;
    });

    let sentiment = '中性';
    let emotion = '平静';

    if (positiveCount > negativeCount) {
      sentiment = '积极';
      emotion = '开心';
    } else if (negativeCount > positiveCount) {
      sentiment = '消极';
      emotion = '沮丧';
    }

    // 提取关键词
    const keywords = inputText.split('').filter(w => w.length >= 2).slice(0, 5);

    setAnalysis({
      emotion,
      sentiment,
      keywords,
      suggestions: [
        '继续保持积极的心态',
        '可以尝试更多的表达方式',
        '建议多与朋友交流'
      ]
    });
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
        <div className="flex items-center justify-between p-6 border-b bg-gradient-to-r from-pink-500 to-purple-500">
          <h2 className="text-xl font-semibold text-white">ChatClaw - 情绪分析与建议</h2>
          <button
            onClick={onClose}
            className="text-white hover:text-gray-200 transition-colors"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              输入聊天内容进行分析
            </label>
            <textarea
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-pink-500"
              rows={4}
              placeholder="输入聊天内容，我将分析情绪和提供建议..."
            />
          </div>

          <button
            onClick={analyzeText}
            className="w-full px-6 py-3 bg-gradient-to-r from-pink-500 to-purple-500 text-white rounded-lg hover:opacity-90 transition-opacity mb-6"
          >
            分析情绪
          </button>

          {analysis && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-gradient-to-br from-pink-50 to-purple-50 rounded-lg p-4">
                  <h3 className="text-sm font-medium text-gray-700 mb-2">情绪识别</h3>
                  <p className="text-2xl font-bold text-pink-600">{analysis.emotion}</p>
                </div>
                <div className="bg-gradient-to-br from-blue-50 to-cyan-50 rounded-lg p-4">
                  <h3 className="text-sm font-medium text-gray-700 mb-2">情感倾向</h3>
                  <p className="text-2xl font-bold text-blue-600">{analysis.sentiment}</p>
                </div>
              </div>

              {analysis.keywords && analysis.keywords.length > 0 && (
                <div className="bg-gray-50 rounded-lg p-4">
                  <h3 className="text-sm font-medium text-gray-700 mb-2">关键词</h3>
                  <div className="flex flex-wrap gap-2">
                    {analysis.keywords.map((keyword, index) => (
                      <span key={index} className="px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-sm">
                        {keyword}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {analysis.suggestions && analysis.suggestions.length > 0 && (
                <div className="bg-green-50 rounded-lg p-4">
                  <h3 className="text-sm font-medium text-gray-700 mb-2">建议</h3>
                  <ul className="space-y-1">
                    {analysis.suggestions.map((suggestion, index) => (
                      <li key={index} className="text-sm text-green-700 flex items-start gap-2">
                        <span className="text-green-500">•</span>
                        {suggestion}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default ChatClaw;
