'use client';

import React, { ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw, X } from 'lucide-react';

interface ErrorBoundaryProps {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(_error: Error): ErrorBoundaryState {
    return { hasError: true, error: null };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('ErrorBoundary caught an error:', error, errorInfo);
    
    if (this.props.onError) {
      this.props.onError(error, errorInfo);
    }
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="flex flex-col items-center justify-center min-h-[200px] p-6">
          <div className="w-16 h-16 rounded-full bg-red-100 flex items-center justify-center mb-4">
            <AlertTriangle size={32} className="text-red-500" />
          </div>
          <h3 className="text-lg font-semibold text-[var(--theme-text-primary)] mb-2">
            组件加载出错
          </h3>
          <p className="text-sm text-[var(--theme-text-secondary)] mb-6 text-center max-w-md">
            抱歉，该组件遇到了一个问题。请尝试刷新页面或稍后再试。
          </p>
          <div className="flex gap-3">
            <button
              onClick={this.handleReset}
              className="flex items-center gap-2 px-4 py-2 rounded-lg bg-[var(--theme-accent-primary)] text-white hover:bg-[var(--theme-accent-primary)]/90 transition-colors"
            >
              <RefreshCw size={16} />
              重试
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export interface ErrorFallbackProps {
  error?: Error;
  resetErrorBoundary?: () => void;
  onClose?: () => void;
}

export const ErrorFallback: React.FC<ErrorFallbackProps> = ({ 
  error, 
  resetErrorBoundary, 
  onClose 
}) => {
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-[var(--theme-bg-secondary)] rounded-2xl shadow-2xl max-w-md w-full border border-[var(--theme-border-secondary)] overflow-hidden">
        <div className="flex items-center justify-between p-4 border-b border-[var(--theme-border-secondary)]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center">
              <AlertTriangle size={20} className="text-red-500" />
            </div>
            <div>
              <h3 className="font-semibold text-[var(--theme-text-primary)]">加载失败</h3>
              <p className="text-xs text-[var(--theme-text-tertiary)]">组件初始化出错</p>
            </div>
          </div>
          {onClose && (
            <button
              onClick={onClose}
              className="p-2 rounded-lg hover:bg-[var(--theme-bg-tertiary)] transition-colors"
            >
              <X size={18} className="text-[var(--theme-text-tertiary)]" />
            </button>
          )}
        </div>

        <div className="p-4">
          {error && (
            <div className="mb-4 p-3 bg-red-50/30 rounded-lg border border-red-200/50">
              <p className="text-xs text-red-600 font-mono break-all">
                {error.message}
              </p>
            </div>
          )}

          <p className="text-sm text-[var(--theme-text-secondary)] mb-4">
            抱歉，遇到了一个意外问题。请尝试刷新页面或联系支持团队。
          </p>

          <div className="flex gap-3">
            {resetErrorBoundary && (
              <button
                onClick={resetErrorBoundary}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-[var(--theme-accent-primary)] text-white hover:bg-[var(--theme-accent-primary)]/90 transition-colors"
              >
                <RefreshCw size={16} />
                重试加载
              </button>
            )}
            {onClose && (
              <button
                onClick={onClose}
                className="px-4 py-2.5 rounded-lg border border-[var(--theme-border-secondary)] text-[var(--theme-text-primary)] hover:bg-[var(--theme-bg-tertiary)] transition-colors"
              >
                关闭
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ErrorBoundary;