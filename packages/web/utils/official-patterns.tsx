/**
 * 豆包官方应用架构模式集成
 * 基于逆向分析结果实现的核心工具函数和模式
 */

import React, { useState, useEffect, useCallback, useRef, createContext, useContext } from 'react';

/**
 * 官方模式1: 精简状态管理
 * 官方应用仅使用 7 个 useState，建议合并相关状态
 */
export function useMergedState<T extends Record<string, any>>(initialState: T) {
  const [state, setState] = useState<T>(initialState);
  
  const updateState = useCallback((updates: Partial<T>) => {
    setState(prev => ({ ...prev, ...updates }));
  }, []);
  
  return [state, updateState] as const;
}

/**
 * 官方模式2: 副作用分离
 * 官方应用使用 13 个 useEffect，每个只处理一个关注点
 */
export function useSingleEffect(effect: () => void | (() => void), deps: any[] = []) {
  useEffect(() => {
    const cleanup = effect();
    return cleanup;
  }, deps);
}

/**
 * 官方模式3: 回调函数优化
 * 官方应用使用 3 个 useCallback 优化性能
 */
export function useStableCallback<T extends (...args: any[]) => any>(callback: T, deps: any[] = []) {
  const ref = useRef<T>(callback);
  
  useEffect(() => {
    ref.current = callback;
  }, [callback, ...deps]);
  
  return useCallback((...args: Parameters<T>) => {
    return ref.current(...args);
  }, deps) as T;
}

/**
 * 官方模式4: 引用管理
 * 官方应用使用 4 个 useRef 管理 DOM 引用
 */
export function useStableRef<T>(initialValue: T) {
  const ref = useRef<T>(initialValue);
  return ref;
}

/**
 * 官方模式5: Context 提供者模式
 * 官方应用使用 1 个 createContext 和 2 个 Provider
 */
export function createSafeContext<T>(name: string) {
  const context = createContext<T | null>(null);
  
  const useContextValue = () => {
    const value = useContext(context);
    if (!value) {
      throw new Error(`${name} must be used within ${name}Provider`);
    }
    return value;
  };
  
  return { context, useContextValue };
}

/**
 * 官方模式6: 组件懒加载模式
 * 官方应用使用异步代码分割和懒加载
 */
export function createLazyComponent(
  importFn: () => Promise<{ default: React.ComponentType<any> }>,
  LoadingComponent?: React.ComponentType
) {
  const LazyComponent = React.lazy(importFn);
  
  return function LazyWrapper(props: any) {
    return (
      <React.Suspense fallback={LoadingComponent ? <LoadingComponent /> : <div>Loading...</div>}>
        <LazyComponent {...props} />
      </React.Suspense>
    );
  };
}

/**
 * 官方模式7: 事件处理优化
 * 官方应用使用事件处理器替代部分 useEffect
 */
export function useEventHandlers<T extends Record<string, (...args: any[]) => any>>(handlers: T) {
  const handlersRef = useRef(handlers);
  
  useEffect(() => {
    handlersRef.current = handlers;
  }, [handlers]);
  
  return handlersRef.current;
}

/**
 * 官方模式8: 性能优化模式
 * 使用 useMemo 缓存计算结果
 */
export function useCachedValue<T>(factory: () => T, deps: any[] = []) {
  const ref = useRef<T>();
  
  if (!ref.current || deps.some((d, i) => d !== deps[i])) {
    ref.current = factory();
  }
  
  return ref.current;
}

/**
 * 官方模式9: 条件渲染优化
 * 使用 switch-case 替代多个条件判断
 */
export function useConditionalRenderer<T extends string, R>(
  condition: T,
  renderers: Record<T, () => R>,
  defaultRenderer?: () => R
) {
  const renderer = renderers[condition] || defaultRenderer;
  return renderer ? renderer() : null;
}

/**
 * 官方模式10: 错误边界模式
 * 官方应用使用错误边界捕获组件错误
 */
export class ErrorBoundary extends React.Component<
  { children: React.ReactNode; fallback?: React.ReactNode },
  { hasError: boolean; error: Error | null }
> {
  constructor(props: any) {
    super(props);
    this.state = { hasError: false, error: null };
  }
  
  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }
  
  render() {
    if (this.state.hasError) {
      return this.props.fallback || <div>Something went wrong.</div>;
    }
    return this.props.children;
  }
}
