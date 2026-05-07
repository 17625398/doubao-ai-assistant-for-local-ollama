'use client';

import React, { useState, useEffect } from 'react';

interface AllModelChatProps {
  onClose?: () => void;
}

export function AllModelChat({ onClose }: AllModelChatProps) {
  const [selectedModel, setSelectedModel] = useState('llama3');
  const [message, setMessage] = useState('');
  const [responses, setResponses] = useState<Record<string, string>>({});

  const models = [
    { id: 'llama3', name: 'Llama 3', provider: 'Ollama' },
    { id: 'qwen', name: 'Qwen', provider: 'Ollama' },
    { id: 'gpt-4', name: 'GPT-4', provider: 'OpenAI' },
    { id: 'gpt-3.5-turbo', name: 'GPT-3.5', provider: 'OpenAI' },
    { id: 'claude-3', name: 'Claude 3', provider: 'Anthropic' },
  ];

  const handleSend = async () => {
    if (!message.trim()) return;

    for (const model of models) {
      setResponses(prev => ({ ...prev, [model.id]: '思考中...' }));
    }

    // 模拟多模型响应
    setTimeout(() => {
      setResponses({
        llama3: `Llama 3 响应: ${message}`,
        qwen: `Qwen 响应: ${message}`,
        'gpt-4': `GPT-4 响应: ${message}`,
        'gpt-3.5-turbo': `GPT-3.5 响应: ${message}`,
        'claude-3': `Claude 3 响应: ${message}`,
      });
    }, 1000);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        <div className="flex items-center justify-between p-6 border-b bg-gradient-to-r from-purple-500 to-blue-500">
          <h2 className="text-xl font-semibold text-white">AllModelChat - 多模型同时对话</h2>
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
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">输入消息</label>
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              rows={3}
              placeholder="输入您的问题..."
            />
          </div>

          <div className="mb-4">
            <button
              onClick={handleSend}
              className="px-6 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
            >
              发送给所有模型
            </button>
          </div>

          <div className="space-y-4">
            {models.map(model => (
              <div key={model.id} className="border border-gray-200 rounded-lg p-4">
                <div className="flex items-center gap-2 mb-2">
                  <span className="font-medium text-gray-900">{model.name}</span>
                  <span className="text-xs text-gray-500">({model.provider})</span>
                </div>
                <div className="bg-gray-50 rounded-lg p-3 min-h-[60px]">
                  {responses[model.id] || '等待输入...'}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

export default AllModelChat;
