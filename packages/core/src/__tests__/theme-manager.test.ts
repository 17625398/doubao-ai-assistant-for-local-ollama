import { describe, it, expect, beforeEach, vi } from 'vitest';

// Mock DOM environment
const classList = new Set<string>();
const htmlElement = {
  classList: {
    add: (c: string) => classList.add(c),
    remove: (c: string) => classList.delete(c),
    contains: (c: string) => classList.has(c),
  },
};

vi.stubGlobal('document', {
  documentElement: htmlElement,
});

const store: Record<string, string> = {};
vi.stubGlobal('localStorage', {
  getItem: (k: string) => store[k] ?? null,
  setItem: (k: string, v: string) => { store[k] = v; },
  removeItem: (k: string) => { delete store[k]; },
  clear: () => { Object.keys(store).forEach(k => delete store[k]); },
});

// Mock matchMedia - default to light mode
let systemDark = false;
vi.stubGlobal('window', {
  matchMedia: (query: string) => ({
    matches: query.includes('dark') ? systemDark : false,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
  }),
  localStorage: store,
});

vi.mock('../utils/event-bus', () => ({
  eventBus: { emit: vi.fn(), on: vi.fn(() => vi.fn()) },
}));

const { ThemeManager } = await import('../utils/theme-manager');

function freshManager() {
  localStorage.clear();
  classList.clear();
  // @ts-expect-error reset singleton
  ThemeManager.instance = undefined;
  return ThemeManager.getInstance();
}

describe('ThemeManager - P3: 主题一致性', () => {
  beforeEach(() => {
    systemDark = false;
    classList.clear();
    localStorage.clear();
    // @ts-expect-error reset singleton
    ThemeManager.instance = undefined;
  });

  it('setTheme("light") → getResolvedTheme() === "light" 且无 dark class', () => {
    const mgr = freshManager();
    mgr.setTheme('light');
    expect(mgr.getResolvedTheme()).toBe('light');
    expect(classList.has('dark')).toBe(false);
  });

  it('setTheme("dark") → getResolvedTheme() === "dark" 且有 dark class', () => {
    const mgr = freshManager();
    mgr.setTheme('dark');
    expect(mgr.getResolvedTheme()).toBe('dark');
    expect(classList.has('dark')).toBe(true);
  });

  it('setTheme("system") 在浅色系统下 → getResolvedTheme() === "light"', () => {
    systemDark = false;
    const mgr = freshManager();
    mgr.setTheme('system');
    expect(mgr.getResolvedTheme()).toBe('light');
    expect(classList.has('dark')).toBe(false);
  });

  it('setTheme("system") 在深色系统下 → getResolvedTheme() === "dark"', () => {
    systemDark = true;
    const mgr = freshManager();
    mgr.setTheme('system');
    expect(mgr.getResolvedTheme()).toBe('dark');
    expect(classList.has('dark')).toBe(true);
  });

  it('getTheme 返回已保存的主题', () => {
    const mgr = freshManager();
    mgr.setTheme('dark');
    expect(mgr.getTheme()).toBe('dark');
    // 重新实例化后仍能读取
    // @ts-expect-error reset singleton
    ThemeManager.instance = undefined;
    const mgr2 = ThemeManager.getInstance();
    expect(mgr2.getTheme()).toBe('dark');
  });

  it('P3: setTheme 后 DOM class 与 getResolvedTheme 一致', () => {
    const themes = ['light', 'dark'] as const;
    for (const t of themes) {
      classList.clear();
      const mgr = freshManager();
      mgr.setTheme(t);
      const resolved = mgr.getResolvedTheme();
      const hasDark = classList.has('dark');
      // P3: resolved === 'dark' ↔ classList.contains('dark')
      expect(resolved === 'dark').toBe(hasDark);
    }
  });
});
