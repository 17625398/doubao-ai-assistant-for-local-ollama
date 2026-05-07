'use client';

import React, { useState, useEffect } from 'react';
import { webContentExtractionService } from '@core/services/web-content-extraction-service';
import { WebContentExport } from './WebContentExport';

interface WebContentAnalysisProps {
  onClose?: () => void;
}

export function WebContentAnalysis({ onClose }: WebContentAnalysisProps) {
  const [pageData, setPageData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [exportModalOpen, setExportModalOpen] = useState(false);

  useEffect(() => {
    extractContent();
  }, []);

  const extractContent = async () => {
    try {
      setIsLoading(true);
      setError(null);

      const data = webContentExtractionService.extractCompletePageData();
      setPageData(data);
    } catch (err) {
      setError('提取网页内容时出错');
      console.error('Error extracting web content:', err);
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
          <div className="p-6">
            <div className="flex justify-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
            </div>
            <div className="mt-4 text-center text-gray-600">
              正在分析网页内容...
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
          <div className="p-6">
            <div className="text-center">
              <div className="text-red-500 text-4xl mb-4">❌</div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">提取失败</h3>
              <p className="text-gray-600 mb-4">{error}</p>
              <button
                onClick={extractContent}
                className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
              >
                重试
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!pageData) {
    return null;
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        <div className="flex items-center justify-between p-6 border-b bg-gradient-to-r from-blue-500 to-purple-500">
          <h2 className="text-xl font-semibold text-white">网页内容分析</h2>
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
          {/* 页面基本信息 */}
          <div className="mb-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">页面信息</h3>
            <div className="space-y-2">
              <div className="flex items-start gap-2">
                <span className="font-medium text-gray-700 min-w-[100px]">标题:</span>
                <span className="text-gray-900">{pageData.pageInfo.title || '无'}</span>
              </div>
              <div className="flex items-start gap-2">
                <span className="font-medium text-gray-700 min-w-[100px]">URL:</span>
                <span className="text-gray-600 text-sm break-all">{pageData.pageInfo.url || '无'}</span>
              </div>
              <div className="flex items-start gap-2">
                <span className="font-medium text-gray-700 min-w-[100px]">描述:</span>
                <span className="text-gray-900">{pageData.pageInfo.description || '无'}</span>
              </div>
              {pageData.pageInfo.keywords.length > 0 && (
                <div className="flex items-start gap-2">
                  <span className="font-medium text-gray-700 min-w-[100px]">关键词:</span>
                  <div className="flex flex-wrap gap-2">
                    {pageData.pageInfo.keywords.map((keyword: string, index: number) => (
                      <span key={index} className="px-2 py-1 bg-gray-100 text-gray-700 rounded-full text-sm">
                        {keyword}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* 页面统计 */}
          <div className="mb-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">页面统计</h3>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              <div className="bg-blue-50 rounded-lg p-4">
                <p className="text-sm text-gray-600 mb-1">单词数</p>
                <p className="text-2xl font-semibold text-blue-600">{pageData.pageStats.wordCount}</p>
              </div>
              <div className="bg-green-50 rounded-lg p-4">
                <p className="text-sm text-gray-600 mb-1">图片数</p>
                <p className="text-2xl font-semibold text-green-600">{pageData.pageStats.imageCount}</p>
              </div>
              <div className="bg-purple-50 rounded-lg p-4">
                <p className="text-sm text-gray-600 mb-1">链接数</p>
                <p className="text-2xl font-semibold text-purple-600">{pageData.pageStats.linkCount}</p>
              </div>
              <div className="bg-yellow-50 rounded-lg p-4">
                <p className="text-sm text-gray-600 mb-1">字符数</p>
                <p className="text-2xl font-semibold text-yellow-600">{pageData.pageStats.characterCount}</p>
              </div>
              <div className="bg-red-50 rounded-lg p-4">
                <p className="text-sm text-gray-600 mb-1">HTML大小</p>
                <p className="text-2xl font-semibold text-red-600">{Math.round(pageData.pageStats.htmlSize / 1024)}KB</p>
              </div>
            </div>
          </div>

          {/* 主要内容 */}
          <div className="mb-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">主要内容</h3>
            <div className="bg-gray-50 rounded-lg p-4">
              <p className="text-gray-700">
                {pageData.mainContent.text.length > 500
                  ? pageData.mainContent.text.substring(0, 500) + '...'
                  : pageData.mainContent.text || '无内容'}
              </p>
            </div>
          </div>

          {/* 图片 */}
          {pageData.mainContent.images.length > 0 && (
            <div className="mb-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4">图片</h3>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {pageData.mainContent.images.slice(0, 6).map((image: string, index: number) => (
                  <div key={index} className="bg-gray-100 rounded-lg p-2">
                    <img 
                      src={image} 
                      alt={`Image ${index + 1}`} 
                      className="w-full h-24 object-cover rounded"
                      onError={(e) => {
                        (e.target as HTMLImageElement).src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgZmlsbD0iI2YzZjNmMyIvPjx0ZXh0IHg9IjEwMCIgeT0iMTA1IiBmb250LWZhbWlseT0iQXJpYWwiIGZvbnQtc2l6ZT0iMTgiIGZpbGw9IiM4ODgiPuiAg+aIjTwvdGV4dD48L3N2Zz4=';
                      }}
                    />
                  </div>
                ))}
              </div>
              {pageData.mainContent.images.length > 6 && (
                <p className="mt-2 text-sm text-gray-500">
                  还有 {pageData.mainContent.images.length - 6} 张图片未显示
                </p>
              )}
            </div>
          )}

          {/* 链接 */}
          {pageData.mainContent.links.length > 0 && (
            <div className="mb-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4">链接</h3>
              <div className="space-y-2 max-h-60 overflow-y-auto">
                {pageData.mainContent.links.slice(0, 10).map((link: { text: string; url: string }, index: number) => (
                  <div key={index} className="flex items-start gap-2">
                    <span className="text-blue-500">🔗</span>
                    <div>
                      <a 
                        href={link.url} 
                        target="_blank" 
                        rel="noopener noreferrer" 
                        className="text-blue-600 hover:underline text-sm"
                      >
                        {link.text.length > 50 ? link.text.substring(0, 50) + '...' : link.text}
                      </a>
                      <p className="text-xs text-gray-500 break-all">{link.url}</p>
                    </div>
                  </div>
                ))}
              </div>
              {pageData.mainContent.links.length > 10 && (
                <p className="mt-2 text-sm text-gray-500">
                  还有 {pageData.mainContent.links.length - 10} 个链接未显示
                </p>
              )}
            </div>
          )}

          {/* 结构化数据 */}
          {Object.keys(pageData.structuredData).length > 0 && (
            <div className="mb-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4">结构化数据</h3>
              <div className="bg-gray-50 rounded-lg p-4 font-mono text-sm text-gray-700 overflow-x-auto">
                <pre>{JSON.stringify(pageData.structuredData, null, 2)}</pre>
              </div>
            </div>
          )}
        </div>

        <div className="flex items-center justify-end gap-3 p-6 border-t bg-gray-50">
          <button
            onClick={() => setExportModalOpen(true)}
            className="px-4 py-2 text-blue-600 hover:text-blue-800 transition-colors"
          >
            导出内容
          </button>
          <button
            onClick={extractContent}
            className="px-4 py-2 text-gray-700 hover:text-gray-900 transition-colors"
          >
            重新分析
          </button>
          <button
            onClick={onClose}
            className="px-6 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
          >
            关闭
          </button>
        </div>
      </div>

      {/* 导出模态框 */}
      {exportModalOpen && pageData && (
        <WebContentExport
          onClose={() => setExportModalOpen(false)}
          content={pageData}
        />
      )}
    </div>
  );
}

export default WebContentAnalysis;
