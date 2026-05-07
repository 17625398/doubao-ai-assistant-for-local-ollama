'use client';

import React from 'react';
import { Sparkles, Zap, Shield, Brain } from 'lucide-react';

const features = [
  {
    icon: Sparkles,
    title: '智能对话',
    description: '支持多种AI模型，提供智能问答服务',
  },
  {
    icon: Zap,
    title: '快速响应',
    description: '本地模型支持，快速响应无需等待',
  },
  {
    icon: Shield,
    title: '隐私安全',
    description: '本地部署，数据安全可控',
  },
  {
    icon: Brain,
    title: '多模态支持',
    description: '支持文本、图片等多种输入',
  },
];

export function WelcomeBanner() {
  return (
    <div className="bg-gradient-to-r from-blue-500 via-indigo-500 to-purple-500 rounded-2xl p-6 mb-6 text-white">
      <div className="flex flex-col md:flex-row items-center justify-between gap-6">
        <div className="flex-1">
          <h2 className="text-2xl font-bold mb-2">豆包 AI 助手</h2>
          <p className="text-blue-100">你的智能对话伙伴，支持本地模型和云端服务</p>
        </div>
        <div className="flex gap-4">
          {features.map((feature, index) => (
            <div key={index} className="flex items-center gap-2 bg-white/10 backdrop-blur-sm px-4 py-2 rounded-lg">
              <feature.icon className="w-5 h-5" />
              <span className="text-sm font-medium">{feature.title}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
