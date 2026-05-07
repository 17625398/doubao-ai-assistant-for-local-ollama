'use client';

import React, { useState, useCallback, useRef, useEffect } from 'react';

interface RAGKnowledgePanelProps {
  onClose?: () => void;
}

interface CollectionInfo {
  name: string;
  description?: string;
  documentCount: number;
  chunkCount: number;
  createdAt: number;
  updatedAt: number;
}

interface QueryResult {
  chunkId: string;
  text: string;
  score: number;
  highlightedText?: string;
  source: string;
  metadata: Record<string, any>;
}

export function RAGKnowledgePanel({ onClose }: RAGKnowledgePanelProps) {
  const [collections, setCollections] = useState<CollectionInfo[]>([]);
  const [selectedCollection, setSelectedCollection] = useState<string>('');
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<QueryResult[]>([]);
  const [isQuerying, setIsQuerying] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [activeTab, setActiveTab] = useState<'browse' | 'upload' | 'query'>('browse');
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    loadCollections();
  }, []);

  const loadCollections = async () => {
    try {
      const res = await fetch('/api/linkmind/rag/collections');
      if (res.ok) {
        const data = await res.json();
        setCollections(data.collections || []);
      }
    } catch (e) {
      console.warn('[RAGPanel] Failed to load collections:', e);
    }
  };

  const handleQuery = useCallback(async () => {
    if (!query.trim() || !selectedCollection) return;

    setIsQuerying(true);
    setResults([]);

    try {
      const res = await fetch('/api/linkmind/rag/query', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          collection: selectedCollection,
          query: query.trim(),
          topK: 5,
          minScore: 0.2,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        setResults(data.results || []);
      }
    } catch (e) {
      console.error('[RAGPanel] Query error:', e);
    } finally {
      setIsQuerying(false);
    }
  }, [query, selectedCollection]);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0 || !selectedCollection) return;

    setUploading(true);

    try {
      for (const file of Array.from(files)) {
        const text = await file.text();
        const res = await fetch('/api/linkmind/rag/documents', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            collection: selectedCollection,
            documents: [{ text, metadata: { source: file.name } }],
          }),
        });

        if (!res.ok) {
          console.warn(`[RAGPanel] Failed to upload ${file.name}`);
        }
      }

      await loadCollections();
    } catch (e) {
      console.error('[RAGPanel] Upload error:', e);
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      const files = e.dataTransfer.files;
      if (files && fileInputRef.current) {
        const dt = new DataTransfer();
        for (const f of Array.from(files)) dt.items.add(f);
        fileInputRef.current.files = dt.files;
        handleFileUpload({ target: fileInputRef.current } as unknown as React.ChangeEvent<HTMLInputElement>);
      }
    },
    [selectedCollection]
  );

  const formatDate = (ts: number) =>
    new Date(ts).toLocaleString('zh-CN', {
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });

  const scoreColor = (score: number) => {
    if (score >= 0.8) return 'text-green-600 bg-green-50';
    if (score >= 0.5) return 'text-yellow-600 bg-yellow-50';
    return 'text-red-500 bg-red-50';
  };

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-900 rounded-xl shadow-2xl w-full max-w-4xl max-h-[88vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-700 bg-gradient-to-r from-violet-500 to-purple-600">
          <div className="flex items-center gap-3">
            <span className="text-2xl">🧠</span>
            <h2 className="text-lg font-semibold text-white">知识库</h2>
            <span className="px-2 py-0.5 text-xs bg-white/20 rounded-full text-white">
              {collections.length} 个集合
            </span>
          </div>
          <button
            onClick={onClose}
            className="text-white/80 hover:text-white transition-colors p-1"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-gray-200 dark:border-gray-700 px-6">
          {[
            { id: 'browse' as const, label: '浏览', icon: '📚' },
            { id: 'upload' as const, label: '上传文档', icon: '📤' },
            { id: 'query' as const, label: '智能检索', icon: '🔍' },
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
                activeTab === tab.id
                  ? 'border-violet-500 text-violet-600 dark:text-violet-400'
                  : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400'
              }`}
            >
              <span className="mr-1">{tab.icon}</span>
              {tab.label}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {/* Collection Selector - always visible */}
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              知识库集合
            </label>
            <select
              value={selectedCollection}
              onChange={e => setSelectedCollection(e.target.value)}
              className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-sm focus:ring-2 focus:ring-violet-500"
            >
              <option value="">-- 选择或创建集合 --</option>
              {collections.map(c => (
                <option key={c.name} value={c.name}>
                  {c.name} ({c.documentCount} 文档 / {c.chunkCount} 分块)
                </option>
              ))}
            </select>
          </div>

          {/* Browse Tab */}
          {activeTab === 'browse' && (
            <div>
              {collections.length === 0 ? (
                <div className="text-center py-16 text-gray-400">
                  <p className="text-4xl mb-3">📭</p>
                  <p>暂无知识库集合</p>
                  <p className="text-sm mt-1">切换到「上传文档」标签页创建集合并添加文档</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {collections.map(c => (
                    <div
                      key={c.name}
                      onClick={() => setSelectedCollection(c.name)}
                      className={`p-4 rounded-lg border cursor-pointer transition-colors ${
                        selectedCollection === c.name
                          ? 'border-violet-400 bg-violet-50 dark:bg-violet-950'
                          : 'border-gray-200 dark:border-gray-700 hover:border-violet-300'
                      }`}
                    >
                      <div className="flex justify-between items-start">
                        <div>
                          <h3 className="font-medium text-gray-900 dark:text-white">{c.name}</h3>
                          {c.description && (
                            <p className="text-xs text-gray-500 mt-0.5">{c.description}</p>
                          )}
                        </div>
                        <span className="text-xs text-gray-400">{formatDate(c.updatedAt)}</span>
                      </div>
                      <div className="flex gap-4 mt-2 text-xs text-gray-500">
                        <span>📄 {c.documentCount} 文档</span>
                        <span>🧩 {c.chunkCount} 分块</span>
                        <span>🕐 创建于 {formatDate(c.createdAt)}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Upload Tab */}
          {activeTab === 'upload' && (
            <div
              onDragOver={e => e.preventDefault()}
              onDrop={handleDrop}
              className={`border-2 border-dashed rounded-xl p-8 text-center transition-colors ${
                uploading
                  ? 'border-violet-400 bg-violet-50'
                  : 'border-gray-300 dark:border-gray-600 hover:border-violet-400'
              }`}
            >
              <input
                ref={fileInputRef}
                type="file"
                multiple
                accept=".txt,.md,.pdf,.docx,.json,.csv"
                onChange={handleFileUpload}
                className="hidden"
              />

              {uploading ? (
                <div className="py-8">
                  <div className="animate-spin w-10 h-10 border-3 border-violet-500 border-t-transparent rounded-full mx-auto mb-3" />
                  <p className="text-sm text-gray-600">正在处理文档...</p>
                  <p className="text-xs text-gray-400 mt-1">分块、向量化、入库中</p>
                </div>
              ) : (
                <>
                  <p className="text-3xl mb-3">📁</p>
                  <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    拖拽文件到此处，或点击选择文件
                  </p>
                  <p className="text-xs text-gray-400 mt-1">
                    支持 .txt .md .pdf .docx .json .csv 格式
                  </p>
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    disabled={!selectedCollection}
                    className="mt-4 px-4 py-2 bg-violet-500 text-white rounded-lg text-sm hover:bg-violet-600 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                  >
                    选择文件
                  </button>
                  {!selectedCollection && (
                    <p className="text-xs text-amber-500 mt-2">请先选择或创建一个知识库集合</p>
                  )}
                </>
              )}
            </div>
          )}

          {/* Query Tab */}
          {activeTab === 'query' && (
            <div>
              <div className="flex gap-2 mb-4">
                <input
                  type="text"
                  value={query}
                  onChange={e => setQuery(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleQuery()}
                  placeholder="输入问题，在知识库中检索相关内容..."
                  className="flex-1 px-4 py-2.5 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-sm focus:ring-2 focus:ring-violet-500 outline-none"
                  disabled={!selectedCollection || isQuerying}
                />
                <button
                  onClick={handleQuery}
                  disabled={!selectedCollection || isQuerying || !query.trim()}
                  className="px-5 py-2.5 bg-violet-500 text-white rounded-lg text-sm font-medium hover:bg-violet-600 disabled:opacity-40 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
                >
                  {isQuerying ? (
                    <>
                      <div className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full" />
                      检索中...
                    </>
                  ) : (
                    <>🔍 检索</>
                  )}
                </button>
              </div>

              {!selectedCollection && (
                <p className="text-sm text-amber-500 mb-4">请先选择一个知识库集合</p>
              )}

              {results.length > 0 ? (
                <div className="space-y-3">
                  <p className="text-xs text-gray-500">找到 {results.length} 条相关结果</p>
                  {results.map((r, i) => (
                    <div key={r.chunkId || i} className="border border-gray-200 dark:border-gray-700 rounded-lg p-4">
                      <div className="flex justify-between items-start mb-2">
                        <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${scoreColor(r.score)}`}>
                          相关度 {(r.score * 100).toFixed(1)}%
                        </span>
                        <span className="text-xs text-gray-400">{r.source}</span>
                      </div>
                      <p className="text-sm text-gray-800 dark:text-gray-200 leading-relaxed whitespace-pre-wrap line-clamp-6">
                        {r.highlightedText || r.text}
                      </p>
                    </div>
                  ))}
                </div>
              ) : query && !isQuerying ? (
                <div className="text-center py-12 text-gray-400">
                  <p className="text-3xl mb-2">🔎</p>
                  <p className="text-sm">未找到匹配结果，尝试更换关键词</p>
                </div>
              ) : null}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50 text-xs text-gray-400 flex justify-between">
          <span>RAG Knowledge Base v1.0</span>
          <span>Powered by LinkMind + In-Memory Vector Store</span>
        </div>
      </div>
    </div>
  );
}
