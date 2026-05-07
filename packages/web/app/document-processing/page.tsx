'use client';

import React, { useState, useCallback } from 'react';
import { DocumentParserUtil, aiDocumentProcessor, DocumentParseResult } from '@doubao/core';
import DocumentUploader from '@/components/DocumentUploader';
import DocumentProcessingStatus from '@/components/DocumentProcessingStatus';
import DocumentHistory from '@/components/DocumentHistory';

interface DocumentHistoryItem {
  id: string;
  name: string;
  type: string;
  size: number;
  processedAt: Date;
  parseResult: DocumentParseResult;
}

export default function DocumentProcessingPage() {
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [status, setStatus] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [currentDocument, setCurrentDocument] = useState<DocumentParseResult | null>(null);
  const [history, setHistory] = useState<DocumentHistoryItem[]>([]);

  const processDocument = useCallback(async (file: File) => {
    setIsProcessing(true);
    setProgress(0);
    setStatus('正在解析文档...');
    setError(null);

    try {
      // 解析文档
      setProgress(20);
      const parseResult = await DocumentParserUtil.parse(file, {
        extractText: true,
        enableChunking: true,
        chunkSize: 2000,
        chunkOverlap: 200,
      });

      if (!parseResult.success) {
        throw new Error(parseResult.error || '解析失败');
      }

      setProgress(60);
      setStatus('正在生成摘要...');

      // 生成文档摘要
      const summary = await aiDocumentProcessor.generateDocumentSummary(parseResult);
      console.log('Document summary:', summary);

      setProgress(80);
      setStatus('处理完成');

      // 添加到历史记录
      const historyItem: DocumentHistoryItem = {
        id: Date.now().toString(),
        name: file.name,
        type: file.type || 'application/octet-stream',
        size: file.size,
        processedAt: new Date(),
        parseResult,
      };

      setHistory(prev => [historyItem, ...prev]);
      setCurrentDocument(parseResult);
    } catch (err) {
      setError(err instanceof Error ? err.message : '处理失败');
      console.error('Document processing error:', err);
    } finally {
      setIsProcessing(false);
      setProgress(100);
    }
  }, []);

  const processDocuments = useCallback(async (files: File[]) => {
    for (const file of files) {
      await processDocument(file);
    }
  }, [processDocument]);

  const handleSelectDocument = useCallback((item: DocumentHistoryItem) => {
    setCurrentDocument(item.parseResult);
  }, []);

  const handleDeleteDocument = useCallback((id: string) => {
    setHistory(prev => prev.filter(item => item.id !== id));
    if (currentDocument && history.find(item => item.id === id)?.parseResult === currentDocument) {
      setCurrentDocument(null);
    }
  }, [currentDocument, history]);

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold mb-6">文档处理</h1>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* 左侧：上传和处理 */}
        <div className="lg:col-span-2">
          <DocumentUploader
            onDocumentUpload={processDocument}
            onDocumentsUpload={processDocuments}
            disabled={isProcessing}
          />

          <DocumentProcessingStatus
            document={currentDocument}
            isProcessing={isProcessing}
            progress={progress}
            error={error}
          />

          {currentDocument && (
            <div className="mt-6 p-4 border rounded-lg">
              <h2 className="text-lg font-medium mb-4">文档信息</h2>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-gray-600">文档名称:</span>
                  <span>{currentDocument.metadata.name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">文档类型:</span>
                  <span>{currentDocument.metadata.type}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">文档大小:</span>
                  <span>{currentDocument.metadata.size} 字节</span>
                </div>
                {currentDocument.metadata.pageCount && (
                  <div className="flex justify-between">
                    <span className="text-gray-600">页数:</span>
                    <span>{currentDocument.metadata.pageCount}</span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span className="text-gray-600">字数:</span>
                  <span>{currentDocument.metadata.wordCount}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">解析时间:</span>
                  <span>{currentDocument.parseTime} ms</span>
                </div>
              </div>

              {currentDocument.text && (
                <div className="mt-4">
                  <h3 className="text-md font-medium mb-2">文档内容预览</h3>
                  <div className="border p-4 rounded-md bg-gray-50 max-h-60 overflow-y-auto">
                    <p className="text-sm">{currentDocument.text.substring(0, 500)}{currentDocument.text.length > 500 ? '...' : ''}</p>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* 右侧：历史记录 */}
        <div>
          <h2 className="text-lg font-medium mb-4">处理历史</h2>
          <DocumentHistory
            history={history}
            onSelectDocument={handleSelectDocument}
            onDeleteDocument={handleDeleteDocument}
          />
        </div>
      </div>
    </div>
  );
}