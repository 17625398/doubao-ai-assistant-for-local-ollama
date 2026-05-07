// 主题管理器

import { eventBus } from './event-bus';

export type Theme = 'light' | 'dark' | 'system';
export type ResolvedTheme = 'light' | 'dark';

const STORAGE_KEY = 'doubao:theme';

export class ThemeManager {
  private static instance: ThemeManager;
  private mediaQuery: MediaQueryList | null = null;
  private mediaListener: ((e: MediaQueryListEvent) => void) | null = null;

  static getInstance(): ThemeManager {
    if (!ThemeManager.instance) {
      ThemeManager.instance = new ThemeManager();
    }
    return ThemeManager.instance;
  }

  constructor() {
    if (typeof window !== 'undefined') {
      this.mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
      this.mediaListener = (e: MediaQueryListEvent) => {
        if (this.getTheme() === 'system') {
          this.applyTheme(e.matches ? 'dark' : 'light');
          eventBus.emit('theme:changed', this.getResolvedTheme());
        }
      };
      this.mediaQuery.addEventListener('change', this.mediaListener);
    }
  }

  getTheme(): Theme {
    if (typeof window === 'undefined') return 'system';
    return (localStorage.getItem(STORAGE_KEY) as Theme) ?? 'system';
  }

  setTheme(theme: Theme): void {
    if (typeof window === 'undefined') return;
    localStorage.setItem(STORAGE_KEY, theme);
    const resolved = this.resolveTheme(theme);
    this.applyTheme(resolved);
    eventBus.emit('theme:changed', resolved);
  }

  getResolvedTheme(): ResolvedTheme {
    return this.resolveTheme(this.getTheme());
  }

  /** 初始化主题（在 layout 中调用，避免 FOUC） */
  init(): void {
    if (typeof window === 'undefined') return;
    this.applyTheme(this.getResolvedTheme());
  }

  onChange(callback: (theme: ResolvedTheme) => void): () => void {
    return eventBus.on('theme:changed', callback as (payload: unknown) => void);
  }

  private resolveTheme(theme: Theme): ResolvedTheme {
    if (theme === 'system') {
      if (typeof window === 'undefined') return 'light';
      return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    }
    return theme;
  }

  private applyTheme(resolved: ResolvedTheme): void {
    if (typeof document === 'undefined') return;
    if (resolved === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }
}

export const themeManager = ThemeManager.getInstance();
