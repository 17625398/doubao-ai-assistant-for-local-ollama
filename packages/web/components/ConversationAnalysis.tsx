'use client';

import React from 'react';
import { useConversationAnalysis } from '@/hooks/chat/useConversationAnalysis';
import { ChatMessage } from '@/types';

interface ConversationAnalysisProps {
  messages: ChatMessage[];
}

export function ConversationAnalysis({ messages }: ConversationAnalysisProps) {
  const { topics, summary, isAnalyzing, error, analyzeConversation } = useConversationAnalysis(messages);

  if (messages.length === 0) {
    return null;
  }

  return (
    <div className="p-4 border-t border-gray-100">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-medium text-gray-800">对话分析</h3>
        <button
          onClick={analyzeConversation}
          disabled={isAnalyzing}
          className="px-3 py-1 text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-gray-400 transition-colors"
        >
          {isAnalyzing ? '分析中...' : '重新分析'}
        </button>
      </div>

      {error && (
        <div className="p-3 mb-4 bg-red-50 text-red-600 rounded-md">
          分析失败: {error.message}
        </div>
      )}

      {/* 对话主题 */}
      {topics.length > 0 && (
        <div className="mb-4">
          <h4 className="text-sm font-medium text-gray-700 mb-2">对话主题</h4>
          <div className="space-y-2">
            {topics.map((topic) => (
              <div key={topic.id} className="p-3 bg-gray-50 rounded-md border border-gray-200">
                <div className="flex justify-between items-center mb-1">
                  <span className="font-medium text-gray-800">{topic.title}</span>
                  <span className="text-xs text-gray-500">
                    置信度: {Math.round(topic.confidence * 100)}%
                  </span>
                </div>
                <div className="text-xs text-gray-500">
                  消息数: {topic.messageCount} | 
                  时间段: {new Date(topic.startTime).toLocaleTimeString()} - {new Date(topic.endTime).toLocaleTimeString()}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 对话摘要 */}
      {summary && (
        <div>
          <h4 className="text-sm font-medium text-gray-700 mb-2">对话摘要</h4>
          <div className="p-3 bg-gray-50 rounded-md border border-gray-200">
            <p className="text-sm text-gray-800 mb-3">{summary.content}</p>
            
            {summary.topics.length > 0 && (
              <div className="mb-2">
                <span className="text-xs font-medium text-gray-600">主要话题:</span>
                <div className="flex flex-wrap gap-1 mt-1">
                  {summary.topics.map((topic, index) => (
                    <span key={index} className="px-2 py-1 text-xs bg-blue-50 text-blue-600 rounded-full">
                      {topic}
                    </span>
                  ))}
                </div>
              </div>
            )}
            
            {summary.keyPoints.length > 0 && (
              <div>
                <span className="text-xs font-medium text-gray-600">关键点:</span>
                <ul className="mt-1 space-y-1">
                  {summary.keyPoints.map((point, index) => (
                    <li key={index} className="text-xs text-gray-700 flex items-start gap-1">
                      <span className="mt-0.5">•</span>
                      <span>{point}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
            
            <div className="mt-3 text-xs text-gray-400">
              生成时间: {new Date(summary.generatedAt).toLocaleString()}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
