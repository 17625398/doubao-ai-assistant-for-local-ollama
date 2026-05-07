'use client';

import { useState, useCallback, useRef } from 'react';

export interface RAGContext {
  enabled: boolean;
  collectionName: string;
  topK: number;
  minScore: number;
  autoInject: boolean;
}

export interface RAGRetrievalResult {
  results: Array<{
    chunkId: string;
    text: string;
    score: number;
    source: string;
  }>;
  retrievedAt: number;
  durationMs: number;
  query: string;
}

export interface UseRAGChatOptions {
  defaultEnabled?: boolean;
  defaultCollection?: string;
  topK?: number;
  minScore?: number;
  autoInject?: boolean;
  onRetrievalStart?: (query: string) => void;
  onRetrievalComplete?: (result: RAGRetrievalResult) => void;
  onRetrievalError?: (error: string) => void;
}

const DEFAULT_OPTIONS: Required<UseRAGChatOptions> = {
  defaultEnabled: true,
  defaultCollection: '',
  topK: 3,
  minScore: 0.25,
  autoInject: true,
  onRetrievalStart: () => {},
  onRetrievalComplete: () => {},
  onRetrievalError: () => {},
};

export function useRAGChat(options: UseRAGChatOptions = {}) {
  const opts = { ...DEFAULT_OPTIONS, ...options };
  const [ragContext, setRagContext] = useState<RAGContext>({
    enabled: opts.defaultEnabled,
    collectionName: opts.defaultCollection || '',
    topK: opts.topK,
    minScore: opts.minScore,
    autoInject: opts.autoInject,
  });
  const [isRetrieving, setIsRetrieving] = useState(false);
  const [lastResult, setLastResult] = useState<RAGRetrievalResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const updateContext = useCallback((updates: Partial<RAGContext>) => {
    setRagContext(prev => ({ ...prev, ...updates }));
  }, []);

  const toggleEnabled = useCallback(() => {
    setRagContext(prev => ({ ...prev, enabled: !prev.enabled }));
  }, []);

  const retrieve = useCallback(
    async (userMessage: string): Promise<string | null> => {
      if (!ragContext.enabled || !ragContext.collectionName.trim()) return null;

      abortRef.current?.abort();
      const controller = new AbortController();
      abortRef.current = controller;

      setIsRetrieving(true);
      setError(null);
      opts.onRetrievalStart(userMessage);

      const startTime = Date.now();

      try {
        const res = await fetch('/api/linkmind/rag/query', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            collection: ragContext.collectionName,
            query: userMessage,
            topK: ragContext.topK,
            minScore: ragContext.minScore,
          }),
          signal: controller.signal,
        });

        if (!res.ok) {
          const errData = await res.json().catch(() => ({}));
          throw new Error(errData.error || `HTTP ${res.status}`);
        }

        const data = await res.json();
        const durationMs = Date.now() - startTime;

        const result: RAGRetrievalResult = {
          results: (data.results || []).map((r: any) => ({
            chunkId: r.chunk?.id || r.chunkId || '',
            text: r.chunk?.text || r.text || '',
            score: r.score || 0,
            source: r.chunk?.metadata?.source || r.source || '',
          })),
          retrievedAt: Date.now(),
          durationMs,
          query: userMessage,
        };

        setLastResult(result);
        opts.onRetrievalComplete(result);

        if (result.results.length === 0) return null;

        if (ragContext.autoInject) {
          const contextText = result.results
            .map(
              (r, i) =>
                `[引用${i + 1}] (相关度: ${(r.score * 100).toFixed(0)}%)\n${r.text}`
            )
            .join('\n\n');

          return `以下是从知识库中检索到的相关内容，请基于这些信息回答用户问题。如果信息不足，请说明。\n\n${contextText}`;
        }

        return null;
      } catch (e: any) {
        if (e.name === 'AbortError') {
          setError(null);
          return null;
        }

        const msg = e.message || String(e);
        setError(msg);
        opts.onRetrievalError(msg);
        console.error('[useRAGChat] Retrieval error:', msg);
        return null;
      } finally {
        setIsRetrieving(false);
      }
    },
    [ragContext, opts]
  );

  const enhanceMessage = useCallback(
    async (
      content: string
    ): Promise<{ enhancedContent: string; ragContext?: string }> => {
      const contextPrompt = await retrieve(content);
      return {
        enhancedContent: contextPrompt ? `${contextPrompt}\n\n用户问题：${content}` : content,
        ragContext: contextPrompt || undefined,
      };
    },
    [retrieve]
  );

  const cancelRetrieval = useCallback(() => {
    abortRef.current?.abort();
    setIsRetrieving(false);
  }, []);

  const reset = useCallback(() => {
    setLastResult(null);
    setError(null);
  }, []);

  return {
    ragContext,
    isRetrieving,
    lastResult,
    error,

    updateContext,
    toggleEnabled,
    retrieve,
    enhanceMessage,
    cancelRetrieval,
    reset,
  };
}
