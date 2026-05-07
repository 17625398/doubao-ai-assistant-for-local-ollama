// 通知管理器

import { eventBus } from './event-bus';

export interface AppNotification {
  id: string;
  type: 'info' | 'success' | 'warning' | 'error';
  title: string;
  content: string;
  timestamp: number;
  read: boolean;
  timeout?: number; // ms，0 表示不自动消失
}

const STORAGE_KEY = 'doubao:notifications';
const MAX_STORED = 100;

function generateId(): string {
  return `notif_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

export class NotificationManager {
  private static instance: NotificationManager;

  static getInstance(): NotificationManager {
    if (!NotificationManager.instance) {
      NotificationManager.instance = new NotificationManager();
    }
    return NotificationManager.instance;
  }

  private load(): AppNotification[] {
    if (typeof window === 'undefined') return [];
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      return raw ? (JSON.parse(raw) as AppNotification[]) : [];
    } catch {
      return [];
    }
  }

  private save(notifications: AppNotification[]): void {
    if (typeof window === 'undefined') return;
    try {
      // 只保留最新的 MAX_STORED 条
      const trimmed = notifications.slice(-MAX_STORED);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(trimmed));
    } catch {
      // ignore storage errors
    }
  }

  notify(data: Omit<AppNotification, 'id' | 'timestamp' | 'read'>): string {
    const notification: AppNotification = {
      ...data,
      id: generateId(),
      timestamp: Date.now(),
      read: false,
    };
    const all = this.load();
    all.push(notification);
    this.save(all);
    eventBus.emit('notification:new', notification);
    return notification.id;
  }

  markRead(id: string): void {
    const all = this.load().map(n => n.id === id ? { ...n, read: true } : n);
    this.save(all);
    eventBus.emit('notification:updated', { id, read: true });
  }

  markAllRead(): void {
    const all = this.load().map(n => ({ ...n, read: true }));
    this.save(all);
    eventBus.emit('notification:all-read', null);
  }

  clear(id: string): void {
    const all = this.load().filter(n => n.id !== id);
    this.save(all);
    eventBus.emit('notification:cleared', { id });
  }

  clearAll(): void {
    this.save([]);
    eventBus.emit('notification:cleared-all', null);
  }

  getAll(): AppNotification[] {
    return this.load();
  }

  getUnreadCount(): number {
    return this.load().filter(n => !n.read).length;
  }
}

export const notificationManager = NotificationManager.getInstance();
