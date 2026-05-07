'use client';

import { useState, useCallback } from 'react';

interface LoadingState {
  isLoading: boolean;
  message: string;
  progress: number;
}

export function useLoadingState(initialMessage = '加载中...') {
  const [state, setState] = useState<LoadingState>({
    isLoading: false,
    message: initialMessage,
    progress: 0,
  });

  const startLoading = useCallback((message?: string) => {
    setState({
      isLoading: true,
      message: message || initialMessage,
      progress: 0,
    });
  }, [initialMessage]);

  const updateProgress = useCallback((progress: number, message?: string) => {
    setState(prev => ({
      ...prev,
      progress,
      message: message || prev.message,
    }));
  }, []);

  const stopLoading = useCallback(() => {
    setState({
      isLoading: false,
      message: '',
      progress: 100,
    });
  }, []);

  return {
    ...state,
    startLoading,
    updateProgress,
    stopLoading,
  };
}

export function LoadingSpinner({ size = 'md', text }: { size?: 'sm' | 'md' | 'lg'; text?: string }) {
  const sizeClasses = {
    sm: 'w-4 h-4',
    md: 'w-8 h-8',
    lg: 'w-12 h-12',
  };

  return (
    <div className="flex flex-col items-center justify-center gap-3">
      <div
        className={`${sizeClasses[size]} border-2 border-gray-200 border-t-blue-500 rounded-full animate-spin`}
      />
      {text && <p className="text-sm text-gray-600">{text}</p>}
    </div>
  );
}

export function LoadingOverlay({ message, progress }: { message?: string; progress?: number }) {
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 max-w-sm w-full mx-4">
        <LoadingSpinner size="lg" text={message} />
        {progress !== undefined && (
          <div className="mt-4 w-full bg-gray-200 rounded-full h-2">
            <div
              className="bg-blue-500 h-2 rounded-full transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>
        )}
      </div>
    </div>
  );
}
