import { describe, it, expect, beforeEach, vi } from 'vitest';
import * as fc from 'fast-check';

// Mock localStorage and eventBus for Node environment
const store: Record<string, string> = {};
vi.stubGlobal('localStorage', {
  getItem: (k: string) => store[k] ?? null,
  setItem: (k: string, v: string) => { store[k] = v; },
  removeItem: (k: string) => { delete store[k]; },
  clear: () => { Object.keys(store).forEach(k => delete store[k]); },
});

// Mock eventBus emit to avoid side effects
vi.mock('../utils/event-bus', () => ({
  eventBus: { emit: vi.fn(), on: vi.fn(() => vi.fn()) },
}));

// Import after mocks
const { NotificationManager } = await import('../utils/notification-manager');

describe('NotificationManager - P1: 通知 ID 唯一性', () => {
  let manager: InstanceType<typeof NotificationManager>;

  beforeEach(() => {
    localStorage.clear();
    // Reset singleton
    // @ts-expect-error accessing private static
    NotificationManager.instance = undefined;
    manager = NotificationManager.getInstance();
  });

  it('单次 notify 后 getAll() 中无重复 ID', () => {
    fc.assert(
      fc.property(
        fc.array(
          fc.record({
            type: fc.constantFrom('info', 'success', 'warning', 'error') as fc.Arbitrary<'info' | 'success' | 'warning' | 'error'>,
            title: fc.string({ minLength: 1, maxLength: 50 }),
            content: fc.string({ minLength: 1, maxLength: 200 }),
          }),
          { minLength: 1, maxLength: 20 }
        ),
        (notifications) => {
          localStorage.clear();
          // @ts-expect-error accessing private static
          NotificationManager.instance = undefined;
          const mgr = NotificationManager.getInstance();

          notifications.forEach(n => mgr.notify(n));

          const all = mgr.getAll();
          const ids = all.map(n => n.id);
          const uniqueIds = new Set(ids);

          // P1: 所有通知 ID 唯一
          expect(uniqueIds.size).toBe(ids.length);
        }
      )
    );
  });

  it('getUnreadCount 等于未读通知数量', () => {
    fc.assert(
      fc.property(
        fc.array(
          fc.record({
            type: fc.constantFrom('info', 'success') as fc.Arbitrary<'info' | 'success'>,
            title: fc.string({ minLength: 1, maxLength: 20 }),
            content: fc.string({ minLength: 1, maxLength: 50 }),
          }),
          { minLength: 0, maxLength: 10 }
        ),
        (notifications) => {
          localStorage.clear();
          // @ts-expect-error accessing private static
          NotificationManager.instance = undefined;
          const mgr = NotificationManager.getInstance();

          notifications.forEach(n => mgr.notify(n));
          const all = mgr.getAll();
          const unreadCount = all.filter(n => !n.read).length;

          expect(mgr.getUnreadCount()).toBe(unreadCount);
        }
      )
    );
  });

  it('markAllRead 后 getUnreadCount 为 0', () => {
    manager.notify({ type: 'info', title: 'A', content: 'test' });
    manager.notify({ type: 'success', title: 'B', content: 'test2' });
    manager.markAllRead();
    expect(manager.getUnreadCount()).toBe(0);
  });

  it('clear 后通知从列表中移除', () => {
    const id = manager.notify({ type: 'info', title: 'X', content: 'y' });
    manager.clear(id);
    expect(manager.getAll().find(n => n.id === id)).toBeUndefined();
  });
});
