'use client';

import React from 'react';
import { FileText, Image, MessageSquare, Code, BookOpen, Music } from 'lucide-react';

const actions = [
  { icon: MessageSquare, label: '聊天', color: 'bg-blue-100 text-blue-600' },
  { icon: FileText, label: '文档分析', color: 'bg-green-100 text-green-600' },
  { icon: Image, label: '图片生成', color: 'bg-purple-100 text-purple-600' },
  { icon: Code, label: '代码编写', color: 'bg-orange-100 text-orange-600' },
  { icon: BookOpen, label: '知识库', color: 'bg-pink-100 text-pink-600' },
  { icon: Music, label: '音乐生成', color: 'bg-indigo-100 text-indigo-600' },
];

interface QuickActionsProps {
  onAction: (action: string) => void;
}

export function QuickActions({ onAction }: QuickActionsProps) {
  return (
    <div className="grid grid-cols-3 md:grid-cols-6 gap-3">
      {actions.map((action, index) => (
        <button
          key={index}
          onClick={() => onAction(action.label)}
          className="flex flex-col items-center gap-2 p-4 rounded-xl bg-gray-50 hover:bg-gray-100 transition-colors group"
        >
          <div className={`w-12 h-12 rounded-xl ${action.color} flex items-center justify-center group-hover:scale-110 transition-transform`}>
            <action.icon className="w-6 h-6" />
          </div>
          <span className="text-sm font-medium text-gray-700">{action.label}</span>
        </button>
      ))}
    </div>
  );
}
