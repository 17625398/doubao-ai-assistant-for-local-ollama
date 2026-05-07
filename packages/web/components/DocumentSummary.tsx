'use client';

import React, { useState, useEffect } from 'react';
import type { DocumentParseResult } from '@core/index';
import type { DocumentSummary as DocumentSummaryResult } from '@core/services/document-summary-service';
import { documentSummaryService } from '@core/services/document-summary-service';
import { aiConfigManager } from '@core/index';

interface DocumentSummaryProps {
  document: DocumentParseResult;
  onSummaryGenerated?: (summary: DocumentSummaryResult) => void;
}

export function DocumentSummary({ document, onSummaryGenerated }: DocumentSummaryProps) {
  const [summary, setSummary] = useState<DocumentSummaryResult | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (document.success) {
      generateSummary();
    }
  }, [document]);

  const generateSummary = async () => {
    setIsGenerating(true);
    setError(null);

    try {
      const model = aiConfigManager.getDefaultModel();
      const generatedSummary = await documentSummaryService.generateSummary(document, model);
      setSummary(generatedSummary);
      onSummaryGenerated?.(generatedSummary);
    } catch (err) {
      setError('生成摘要时出错');
      console.error('Failed to generate summary:', err);
    } finally {
      setIsGenerating(false);
    }
  };

  if (!document.success) {
    return null;
  }

  return (
    <div className="p-4 border-t border-gray-100">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-medium text-gray-800">文档摘要</h3>
        <button
          onClick={generateSummary}
          disabled={isGenerating}
          className="px-3 py-1 text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-gray-400 transition-colors"
        >
          {isGenerating ? '生成中...' : '重新生成'}
        </button>
      </div>

      {error && (
        <div className="p-3 mb-4 bg-red-50 text-red-600 rounded-md">
          {error}
        </div>
      )}

      {isGenerating ? (
        <div className="p-4 flex justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      ) : summary ? (
        <div className="space-y-4">
          <div>
            <h4 className="text-md font-medium text-gray-700 mb-2">{summary.title}</h4>
            <p className="text-sm text-gray-600 mb-3">{summary.content}</p>
            <div className="text-xs text-gray-500 mb-4">
              字数: {summary.wordCount} | 预计阅读时间: {summary.readTime} 分钟
            </div>
          </div>

          {summary.keyPoints.length > 0 && (
            <div>
              <h5 className="text-sm font-medium text-gray-700 mb-2">关键要点</h5>
              <ul className="list-disc list-inside space-y-1 text-sm text-gray-600">
                {summary.keyPoints.map((point, index) => (
                  <li key={index}>{point}</li>
                ))}
              </ul>
            </div>
          )}

          {summary.topics.length > 0 && (
            <div>
              <h5 className="text-sm font-medium text-gray-700 mb-2">主要话题</h5>
              <div className="flex flex-wrap gap-1">
                {summary.topics.map((topic, index) => (
                  <span key={index} className="px-2 py-1 text-xs bg-blue-50 text-blue-600 rounded-full">
                    {topic}
                  </span>
                ))}
              </div>
            </div>
          )}

          {summary.entities.length > 0 && (
            <div>
              <h5 className="text-sm font-medium text-gray-700 mb-2">重要实体</h5>
              <div className="flex flex-wrap gap-1">
                {summary.entities.map((entity, index) => (
                  <span key={index} className="px-2 py-1 text-xs bg-green-50 text-green-600 rounded-full">
                    {entity}
                  </span>
                ))}
              </div>
            </div>
          )}

          <div className="text-xs text-gray-400">
            生成时间: {new Date(summary.generatedAt).toLocaleString()}
          </div>
        </div>
      ) : (
        <div className="p-4 text-center text-gray-500">
          点击"重新生成"按钮生成文档摘要
        </div>
      )}
    </div>
  );
}
