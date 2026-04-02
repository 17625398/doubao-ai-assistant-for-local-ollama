'use client';

import { useState } from 'react';

interface TranslationPanelProps {
  onClose: () => void;
  onGenerate: (prompt: string) => void;
}

export function TranslationPanel({ onClose, onGenerate }: TranslationPanelProps) {
  const [text, setText] = useState('');
  const [sourceLanguage, setSourceLanguage] = useState('auto');
  const [targetLanguage, setTargetLanguage] = useState('zh-CN');
  const [translationType, setTranslationType] = useState('general');

  const languages = [
    { value: 'auto', label: '自动检测' },
    { value: 'zh-CN', label: '中文' },
    { value: 'en', label: '英语' },
    { value: 'ja', label: '日语' },
    { value: 'ko', label: '韩语' },
    { value: 'fr', label: '法语' },
    { value: 'de', label: '德语' },
    { value: 'es', label: '西班牙语' },
    { value: 'ru', label: '俄语' },
    { value: 'ar', label: '阿拉伯语' },
    { value: 'pt', label: '葡萄牙语' },
    { value: 'it', label: '意大利语' },
    { value: 'nl', label: '荷兰语' },
    { value: 'sv', label: '瑞典语' },
    { value: 'pl', label: '波兰语' },
  ];

  const translationTypes = [
    { value: 'general', label: '通用翻译' },
    { value: 'technical', label: '技术翻译' },
    { value: 'literary', label: '文学翻译' },
    { value: 'business', label: '商务翻译' },
    { value: 'medical', label: '医学翻译' },
    { value: 'legal', label: '法律翻译' },
  ];

  const handleSubmit = () => {
    if (!text.trim()) return;

    let prompt = '';
    switch (translationType) {
      case 'general':
        prompt = `请将以下从${languages.find(l => l.value === sourceLanguage)?.label}到${languages.find(l => l.value === targetLanguage)?.label}进行通用翻译：\n\n${text}\n`;
        break;
      case 'technical':
        prompt = `请将以下从${languages.find(l => l.value === sourceLanguage)?.label}到${languages.find(l => l.value === targetLanguage)?.label}进行技术翻译，保持专业术语的准确性：\n\n${text}\n`;
        break;
      case 'literary':
        prompt = `请将以下从${languages.find(l => l.value === sourceLanguage)?.label}到${languages.find(l => l.value === targetLanguage)?.label}进行文学翻译，保持文学性和艺术性：\n\n${text}\n`;
        break;
      case 'business':
        prompt = `请将以下从${languages.find(l => l.value === sourceLanguage)?.label}到${languages.find(l => l.value === targetLanguage)?.label}进行商务翻译，保持正式和专业：\n\n${text}\n`;
        break;
      case 'medical':
        prompt = `请将以下从${languages.find(l => l.value === sourceLanguage)?.label}到${languages.find(l => l.value === targetLanguage)?.label}进行医学翻译，保持医学术语的准确性：\n\n${text}\n`;
        break;
      case 'legal':
        prompt = `请将以下从${languages.find(l => l.value === sourceLanguage)?.label}到${languages.find(l => l.value === targetLanguage)?.label}进行法律翻译，保持法律术语的准确性：\n\n${text}\n`;
        break;
      default:
        prompt = `请将以下从${languages.find(l => l.value === sourceLanguage)?.label}到${languages.find(l => l.value === targetLanguage)?.label}进行翻译：\n\n${text}\n`;
    }

    onGenerate(prompt);
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-3xl max-h-[90vh] overflow-hidden flex flex-col">
        {/* 头部 */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-800">翻译工具</h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* 内容 */}
        <div className="flex-1 p-4 overflow-y-auto">
          {/* 配置选项 */}
          <div className="flex flex-wrap gap-4 mb-4">
            <div className="flex-1 min-w-[150px]">
              <label className="block text-sm font-medium text-gray-700 mb-1">源语言</label>
              <select
                value={sourceLanguage}
                onChange={(e) => setSourceLanguage(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {languages.map((lang) => (
                  <option key={lang.value} value={lang.value}>
                    {lang.label}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex items-center justify-center">
              <button
                onClick={() => {
                  const temp = sourceLanguage;
                  setSourceLanguage(targetLanguage);
                  setTargetLanguage(temp);
                }}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                </svg>
              </button>
            </div>
            <div className="flex-1 min-w-[150px]">
              <label className="block text-sm font-medium text-gray-700 mb-1">目标语言</label>
              <select
                value={targetLanguage}
                onChange={(e) => setTargetLanguage(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {languages.map((lang) => (
                  <option key={lang.value} value={lang.value}>
                    {lang.label}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex-1 min-w-[150px]">
              <label className="block text-sm font-medium text-gray-700 mb-1">翻译类型</label>
              <select
                value={translationType}
                onChange={(e) => setTranslationType(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {translationTypes.map((type) => (
                  <option key={type.value} value={type.value}>
                    {type.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* 文本输入 */}
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">输入文本</label>
            <textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="请输入要翻译的文本..."
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 min-h-[200px]"
            />
          </div>
        </div>

        {/* 底部 */}
        <div className="flex items-center justify-end p-4 border-t border-gray-200 gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
          >
            取消
          </button>
          <button
            onClick={handleSubmit}
            disabled={!text.trim()}
            className={`px-4 py-2 rounded-lg transition-colors ${
              text.trim()
                ? 'bg-blue-500 text-white hover:bg-blue-600'
                : 'bg-gray-300 text-gray-500 cursor-not-allowed'
            }`}
          >
            开始翻译
          </button>
        </div>
      </div>
    </div>
  );
}

export default TranslationPanel;