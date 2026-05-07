import { describe, it, expect, beforeEach, vi } from 'vitest';
import * as fc from 'fast-check';

// Mock localStorage
const store: Record<string, string> = {};
vi.stubGlobal('localStorage', {
  getItem: (k: string) => store[k] ?? null,
  setItem: (k: string, v: string) => { store[k] = v; },
  removeItem: (k: string) => { delete store[k]; },
  clear: () => { Object.keys(store).forEach(k => delete store[k]); },
});

const { PromptManager } = await import('../utils/prompt-manager');

function freshManager() {
  localStorage.clear();
  // @ts-expect-error reset singleton
  PromptManager.instance = undefined;
  return PromptManager.getInstance();
}

describe('PromptManager - P2: 持久性', () => {
  beforeEach(() => { localStorage.clear(); });

  it('add 后 getAll() 包含该提示词', () => {
    fc.assert(
      fc.property(
        fc.record({
          title: fc.string({ minLength: 1, maxLength: 50 }),
          content: fc.string({ minLength: 1, maxLength: 200 }),
          category: fc.string({ minLength: 1, maxLength: 20 }),
        }),
        (data) => {
          const mgr = freshManager();
          const added = mgr.add(data);
          const all = mgr.getAll();
          expect(all.some(p => p.id === added.id)).toBe(true);
        }
      )
    );
  });

  it('delete 后 getAll() 不包含该提示词', () => {
    fc.assert(
      fc.property(
        fc.record({
          title: fc.string({ minLength: 1, maxLength: 50 }),
          content: fc.string({ minLength: 1, maxLength: 200 }),
          category: fc.string({ minLength: 1, maxLength: 20 }),
        }),
        (data) => {
          const mgr = freshManager();
          const added = mgr.add(data);
          mgr.delete(added.id);
          const all = mgr.getAll();
          expect(all.some(p => p.id === added.id)).toBe(false);
        }
      )
    );
  });

  it('search 能找到包含关键词的提示词', () => {
    const mgr = freshManager();
    mgr.add({ title: '代码审查', content: '请审查以下代码', category: '开发' });
    mgr.add({ title: '文章总结', content: '请总结文章', category: '写作' });

    const results = mgr.search('代码');
    expect(results.length).toBeGreaterThan(0);
    expect(results.every(p => p.title.includes('代码') || p.content.includes('代码'))).toBe(true);
  });

  it('update 后数据正确更新', () => {
    const mgr = freshManager();
    const p = mgr.add({ title: '原标题', content: '原内容', category: '通用' });
    const updated = mgr.update(p.id, { title: '新标题' });
    expect(updated.title).toBe('新标题');
    expect(updated.content).toBe('原内容');
    expect(mgr.getAll().find(x => x.id === p.id)?.title).toBe('新标题');
  });

  it('getCategories 返回所有不重复分类', () => {
    const mgr = freshManager();
    mgr.add({ title: 'A', content: 'a', category: '开发' });
    mgr.add({ title: 'B', content: 'b', category: '写作' });
    mgr.add({ title: 'C', content: 'c', category: '开发' });
    const cats = mgr.getCategories();
    expect(new Set(cats).size).toBe(cats.length); // 无重复
    expect(cats).toContain('开发');
    expect(cats).toContain('写作');
  });
});
