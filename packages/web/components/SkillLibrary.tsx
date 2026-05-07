'use client';

import React, { useState } from 'react';

interface SkillLibraryProps {
  onClose?: () => void;
}

interface Skill {
  id: string;
  name: string;
  description: string;
  category: string;
  icon: string;
}

export function SkillLibrary({ onClose }: SkillLibraryProps) {
  const [selectedCategory, setSelectedCategory] = useState('all');

  const skills: Skill[] = [
    { id: '1', name: '代码审查', description: '自动分析代码问题，提供优化建议', category: 'development', icon: '🔍' },
    { id: '2', name: '翻译助手', description: '多语言翻译，支持专业术语', category: 'tools', icon: '🌐' },
    { id: '3', name: '写作助手', description: '优化文案，提升表达效果', category: 'tools', icon: '✍️' },
    { id: '4', name: '数据分析', description: '智能分析数据，生成可视化报告', category: 'data', icon: '📊' },
    { id: '5', name: 'PPT生成', description: '快速生成专业PPT演示文稿', category: 'tools', icon: '📑' },
    { id: '6', name: '文本总结', description: '自动提取关键信息，生成摘要', category: 'tools', icon: '📝' },
    { id: '7', name: '逻辑推理', description: '帮助进行逻辑分析和推理', category: 'thinking', icon: '🧠' },
    { id: '8', name: '创意头脑风暴', description: '激发创意，生成创新想法', category: 'thinking', icon: '💡' },
  ];

  const categories = [
    { id: 'all', name: '全部' },
    { id: 'development', name: '开发' },
    { id: 'tools', name: '工具' },
    { id: 'data', name: '数据' },
    { id: 'thinking', name: '思维' },
  ];

  const filteredSkills = selectedCategory === 'all'
    ? skills
    : skills.filter(skill => skill.category === selectedCategory);

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        <div className="flex items-center justify-between p-6 border-b bg-gradient-to-r from-green-500 to-teal-500">
          <h2 className="text-xl font-semibold text-white">技能库</h2>
          <button
            onClick={onClose}
            className="text-white hover:text-gray-200 transition-colors"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="p-6">
          <div className="flex gap-2 mb-6 flex-wrap">
            {categories.map(cat => (
              <button
                key={cat.id}
                onClick={() => setSelectedCategory(cat.id)}
                className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                  selectedCategory === cat.id
                    ? 'bg-green-500 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                {cat.name}
              </button>
            ))}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {filteredSkills.map(skill => (
              <div
                key={skill.id}
                className="border border-gray-200 rounded-lg p-4 hover:border-green-300 hover:bg-green-50 transition-colors cursor-pointer"
              >
                <div className="flex items-start gap-3">
                  <span className="text-3xl">{skill.icon}</span>
                  <div>
                    <h3 className="font-medium text-gray-900">{skill.name}</h3>
                    <p className="text-sm text-gray-600 mt-1">{skill.description}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

export default SkillLibrary;
