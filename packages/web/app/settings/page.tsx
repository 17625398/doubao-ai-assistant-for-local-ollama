'use client';

import React, { useState } from 'react';
import { Settings, Globe, Palette, Bell, Shield, Database, Keyboard } from 'lucide-react';

const settingsSections = [
  { icon: Globe, title: '语言设置', description: '设置界面语言和地区' },
  { icon: Palette, title: '主题设置', description: '选择深色或浅色主题' },
  { icon: Bell, title: '通知设置', description: '管理通知偏好' },
  { icon: Shield, title: '隐私设置', description: '管理数据和隐私' },
  { icon: Database, title: '数据管理', description: '管理聊天记录和数据' },
  { icon: Keyboard, title: '快捷键', description: '自定义键盘快捷键' },
];

const modelOptions = [
  { id: 'ollama', name: 'Ollama 本地模型', description: '使用本地部署的 AI 模型' },
  { id: 'openai', name: 'OpenAI', description: '使用 OpenAI API' },
  { id: 'gemini', name: 'Google Gemini', description: '使用 Google Gemini API' },
  { id: 'claude', name: 'Claude', description: '使用 Claude API' },
];

export default function SettingsPage() {
  const [selectedSection, setSelectedSection] = useState('model');
  const [selectedModel, setSelectedModel] = useState('ollama');

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-6xl mx-auto">
        <div className="bg-white border-b border-gray-200 px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-500 flex items-center justify-center">
              <Settings className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-gray-800">设置</h1>
              <p className="text-sm text-gray-500">管理您的豆包设置</p>
            </div>
          </div>
        </div>

        <div className="flex">
          <div className="w-72 shrink-0 bg-white border-r border-gray-200 p-4">
            <nav className="space-y-1">
              {settingsSections.map((section, index) => (
                <button
                  key={index}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left transition-colors ${
                    selectedSection === section.title.toLowerCase().replace(' ', '-')
                      ? 'bg-blue-50 text-blue-600'
                      : 'hover:bg-gray-50 text-gray-700'
                  }`}
                  onClick={() => setSelectedSection(section.title.toLowerCase().replace(' ', '-'))}
                >
                  <section.icon className="w-5 h-5" />
                  <div>
                    <span className="font-medium">{section.title}</span>
                    <p className="text-xs text-gray-500">{section.description}</p>
                  </div>
                </button>
              ))}
            </nav>
          </div>

          <div className="flex-1 p-6">
            <div className="bg-white rounded-xl p-6 shadow-sm">
              <h2 className="text-lg font-semibold text-gray-800 mb-6">AI 模型设置</h2>
              
              <div className="space-y-3">
                {modelOptions.map((model) => (
                  <div
                    key={model.id}
                    className={`p-4 rounded-xl border-2 cursor-pointer transition-all ${
                      selectedModel === model.id
                        ? 'border-blue-500 bg-blue-50'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                    onClick={() => setSelectedModel(model.id)}
                  >
                    <div className="flex items-center gap-4">
                      <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${
                        selectedModel === model.id ? 'border-blue-500 bg-blue-500' : 'border-gray-300'
                      }`}>
                        {selectedModel === model.id && (
                          <div className="w-2 h-2 rounded-full bg-white" />
                        )}
                      </div>
                      <div>
                        <span className="font-medium text-gray-800">{model.name}</span>
                        <p className="text-sm text-gray-500">{model.description}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {selectedModel === 'ollama' && (
                <div className="mt-6 p-4 bg-gray-50 rounded-xl">
                  <h3 className="font-medium text-gray-800 mb-3">Ollama 配置</h3>
                  <div className="space-y-3">
                    <div>
                      <label className="block text-sm text-gray-600 mb-1">Ollama 地址</label>
                      <input
                        type="text"
                        placeholder="http://localhost:11434"
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 placeholder:text-gray-400"
                      />
                    </div>
                    <div>
                      <label className="block text-sm text-gray-600 mb-1">默认模型</label>
                      <input
                        type="text"
                        placeholder="qwen3.6:latest"
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 placeholder:text-gray-400"
                      />
                    </div>
                  </div>
                </div>
              )}

              <button className="mt-6 px-6 py-2.5 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors">
                保存设置
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
