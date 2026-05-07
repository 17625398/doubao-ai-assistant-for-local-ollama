'use client';

import React from 'react';
import { WelcomeBanner } from '@/components/WelcomeBanner';
import { QuickActions } from '@/components/QuickActions';

export default function FeaturesPage() {
  const handleAction = (action: string) => {
    console.log('Selected action:', action);
    // 这里可以添加实际的导航或功能触发逻辑
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-6xl mx-auto">
        <WelcomeBanner />
        
        <div className="mb-6">
          <h3 className="text-lg font-semibold text-gray-800 mb-4">快捷操作</h3>
          <QuickActions onAction={handleAction} />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-white rounded-xl p-6 shadow-sm">
            <h3 className="text-lg font-semibold text-gray-800 mb-4">本地模型</h3>
            <p className="text-gray-600 mb-4">
              支持 Ollama 本地模型，无需网络即可使用 AI 功能，保护隐私安全。
            </p>
            <div className="flex items-center gap-2 text-sm text-blue-600">
              <span className="w-2 h-2 bg-green-500 rounded-full" />
              <span>Ollama 已连接</span>
            </div>
          </div>

          <div className="bg-white rounded-xl p-6 shadow-sm">
            <h3 className="text-lg font-semibold text-gray-800 mb-4">云端服务</h3>
            <p className="text-gray-600 mb-4">
              支持多种云端 AI 服务，包括 OpenAI、Gemini、Claude 等，提供丰富的模型选择。
            </p>
            <div className="flex items-center gap-2 text-sm text-gray-500">
              <span className="w-2 h-2 bg-gray-300 rounded-full" />
              <span>可配置多种服务</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
