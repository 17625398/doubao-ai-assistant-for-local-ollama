/**
 * 豆包官方应用架构模式集成 - 核心 Hook
 * 基于逆向分析结果实现的核心自定义 Hook
 */

import { useState, useEffect, useCallback, useRef, useMemo } from 'react';

/**
 * 官方模式: 聊天状态管理 Hook
 * 模仿官方应用的精简状态管理模式
 */
export interface UseChatStateReturn {
  messages: any[];
  input: string;
  loading: boolean;
  error: Error | null;
  addMessage: (message: any) => void;
  setInput: (input: string) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: Error | null) => void;
  clearMessages: () => void;
}

export function useChatState(): UseChatStateReturn {
  const [state, setState] = useState({
    messages: [] as any[],
    input: '',
    loading: false,
    error: null as Error | null,
  });

  const addMessage = useCallback((message: any) => {
    setState(prev => ({ ...prev, messages: [...prev.messages, message] }));
  }, []);

  const setInput = useCallback((input: string) => {
    setState(prev => ({ ...prev, input }));
  }, []);

  const setLoading = useCallback((loading: boolean) => {
    setState(prev => ({ ...prev, loading }));
  }, []);

  const setError = useCallback((error: Error | null) => {
    setState(prev => ({ ...prev, error }));
  }, []);

  const clearMessages = useCallback(() => {
    setState(prev => ({ ...prev, messages: [] }));
  }, []);

  return {
    ...state,
    addMessage,
    setInput,
    setLoading,
    setError,
    clearMessages,
  };
}

/**
 * 官方模式: UI 状态管理 Hook
 * 模仿官方应用的 UI 状态管理模式
 */
export interface UseUIStateReturn {
  sidebarOpen: boolean;
  settingsOpen: boolean;
  panelView: string;
  toggleSidebar: () => void;
  toggleSettings: () => void;
  setPanelView: (view: string) => void;
}

export function useUIState(): UseUIStateReturn {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [panelView, setPanelView] = useState('chat');

  const toggleSidebar = useCallback(() => {
    setSidebarOpen(prev => !prev);
  }, []);

  const toggleSettings = useCallback(() => {
    setSettingsOpen(prev => !prev);
  }, []);

  return {
    sidebarOpen,
    settingsOpen,
    panelView,
    toggleSidebar,
    toggleSettings,
    setPanelView,
  };
}

/**
 * 官方模式: 事件监听 Hook
 * 模仿官方应用的事件处理模式
 */
export function useEventListeners(
  events: [string, EventListener][],
  target: EventTarget = window
) {
  useEffect(() => {
    events.forEach(([event, handler]) => {
      target.addEventListener(event, handler);
    });

    return () => {
      events.forEach(([event, handler]) => {
        target.removeEventListener(event, handler);
      });
    };
  }, [events, target]);
}

/**
 * 官方模式: 自动滚动 Hook
 * 模仿官方应用的自动滚动模式
 */
export function useAutoScroll(dependency: any) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    ref.current?.scrollIntoView({ behavior: 'smooth' });
  }, [dependency]);

  return ref;
}

/**
 * 官方模式: 面板渲染 Hook
 * 模仿官方应用的面板渲染模式
 */
export function usePanelRenderer<T extends string>(
  currentPanel: T,
  panels: Record<T, () => React.ReactNode>
) {
  const renderPanel = useMemo(() => {
    const renderer = panels[currentPanel];
    return renderer ? renderer() : null;
  }, [currentPanel, panels]);

  return renderPanel;
}

/**
 * 官方模式: 文件处理 Hook
 * 模仿官方应用的文件处理模式
 */
export function useFileHandler() {
  const [files, setFiles] = useState<File[]>([]);

  const addFiles = useCallback((newFiles: File[]) => {
    setFiles(prev => [...prev, ...newFiles]);
  }, []);

  const removeFile = useCallback((index: number) => {
    setFiles(prev => prev.filter((_, i) => i !== index));
  }, []);

  const clearFiles = useCallback(() => {
    setFiles([]);
  }, []);

  return {
    files,
    addFiles,
    removeFile,
    clearFiles,
  };
}

/**
 * 官方模式: 消息发送 Hook
 * 模仿官方应用的消息发送模式
 */
export function useMessageSender(sendFn: (content: string, options?: any) => Promise<void>) {
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const sendMessage = useCallback(async (content: string, options?: any) => {
    setSending(true);
    setError(null);
    try {
      await sendFn(content, options);
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Unknown error'));
    } finally {
      setSending(false);
    }
  }, [sendFn]);

  return {
    sendMessage,
    sending,
    error,
  };
}
