'use client';

import React from 'react';
import { FollowUpQuestion } from '@/hooks/chat/useOllamaChat';

interface FollowUpQuestionsProps {
  questions: FollowUpQuestion[];
  onQuestionClick: (question: string) => void;
}

// 根据分类获取标签颜色
function getCategoryColor(category: FollowUpQuestion['category']): string {
  switch (category) {
    case 'detail':
      return 'bg-blue-50 text-blue-600 border-blue-200 hover:bg-blue-100';
    case 'related':
      return 'bg-green-50 text-green-600 border-green-200 hover:bg-green-100';
    case 'solution':
      return 'bg-purple-50 text-purple-600 border-purple-200 hover:bg-purple-100';
    case 'example':
      return 'bg-yellow-50 text-yellow-600 border-yellow-200 hover:bg-yellow-100';
    case 'clarification':
      return 'bg-orange-50 text-orange-600 border-orange-200 hover:bg-orange-100';
    default:
      return 'bg-gray-50 text-gray-600 border-gray-200 hover:bg-gray-100';
  }
}

// 根据分类获取标签文本
function getCategoryText(category: FollowUpQuestion['category']): string {
  switch (category) {
    case 'detail':
      return '详情';
    case 'related':
      return '相关';
    case 'solution':
      return '方案';
    case 'example':
      return '示例';
    case 'clarification':
      return '澄清';
    default:
      return '';
  }
}

export function FollowUpQuestions({ questions, onQuestionClick }: FollowUpQuestionsProps) {
  if (questions.length === 0) {
    return null;
  }

  return (
    <div className="px-4 py-6 border-t border-gray-100">
      <div className="text-sm font-medium text-gray-500 mb-3">你可能还想问</div>
      <div className="flex flex-wrap gap-2">
        {questions.map((question) => (
          <button
            key={question.id}
            onClick={() => onQuestionClick(question.content)}
            className={`px-4 py-2 text-sm border rounded-full transition-colors ${getCategoryColor(question.category)}`}
          >
            <span className="flex items-center gap-1">
              <span className="text-xs font-medium">{getCategoryText(question.category)}</span>
              <span>{question.content}</span>
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}
