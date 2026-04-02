// 书签管理器实现

import { BookmarkItem, BookmarkCollection, BookmarkManager, BookmarkType } from '../types/bookmark';
import { logger } from './logger';

export type { BookmarkItem, BookmarkCollection, BookmarkManager };
export { BookmarkType };

/**
 * 本地存储书签管理器
 */
export class LocalStorageBookmarkManager implements BookmarkManager {
  private readonly BOOKMARKS_KEY = 'doubao_bookmarks';
  private readonly COLLECTIONS_KEY = 'doubao_bookmark_collections';

  /**
   * 生成唯一ID
   */
  private generateId(): string {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
  }

  /**
   * 获取当前时间
   */
  private getCurrentTime(): string {
    return new Date().toISOString();
  }

  /**
   * 从本地存储获取书签
   */
  private getBookmarksFromStorage(): BookmarkItem[] {
    try {
      const data = localStorage.getItem(this.BOOKMARKS_KEY);
      return data ? JSON.parse(data) : [];
    } catch (error) {
      logger.error('Failed to get bookmarks from storage:', error);
      return [];
    }
  }

  /**
   * 保存书签到本地存储
   */
  private saveBookmarksToStorage(bookmarks: BookmarkItem[]): void {
    try {
      localStorage.setItem(this.BOOKMARKS_KEY, JSON.stringify(bookmarks));
    } catch (error) {
      logger.error('Failed to save bookmarks to storage:', error);
    }
  }

  /**
   * 从本地存储获取集合
   */
  private getCollectionsFromStorage(): BookmarkCollection[] {
    try {
      const data = localStorage.getItem(this.COLLECTIONS_KEY);
      return data ? JSON.parse(data) : [];
    } catch (error) {
      logger.error('Failed to get collections from storage:', error);
      return [];
    }
  }

  /**
   * 保存集合到本地存储
   */
  private saveCollectionsToStorage(collections: BookmarkCollection[]): void {
    try {
      localStorage.setItem(this.COLLECTIONS_KEY, JSON.stringify(collections));
    } catch (error) {
      logger.error('Failed to save collections to storage:', error);
    }
  }

  /**
   * 添加书签
   */
  async addBookmark(bookmark: Omit<BookmarkItem, 'id' | 'createdAt' | 'updatedAt'>): Promise<BookmarkItem> {
    const bookmarks = this.getBookmarksFromStorage();
    const newBookmark: BookmarkItem = {
      ...bookmark,
      id: this.generateId(),
      createdAt: this.getCurrentTime(),
      updatedAt: this.getCurrentTime(),
    };
    bookmarks.push(newBookmark);
    this.saveBookmarksToStorage(bookmarks);
    logger.info('Bookmark added:', newBookmark.id);
    return newBookmark;
  }

  /**
   * 获取书签
   */
  async getBookmark(id: string): Promise<BookmarkItem | null> {
    const bookmarks = this.getBookmarksFromStorage();
    return bookmarks.find(bookmark => bookmark.id === id) || null;
  }

  /**
   * 更新书签
   */
  async updateBookmark(id: string, data: Partial<BookmarkItem>): Promise<BookmarkItem | null> {
    const bookmarks = this.getBookmarksFromStorage();
    const index = bookmarks.findIndex(bookmark => bookmark.id === id);
    if (index === -1) {
      return null;
    }
    bookmarks[index] = {
      ...bookmarks[index],
      ...data,
      updatedAt: this.getCurrentTime(),
    };
    this.saveBookmarksToStorage(bookmarks);
    logger.info('Bookmark updated:', id);
    return bookmarks[index];
  }

  /**
   * 删除书签
   */
  async deleteBookmark(id: string): Promise<boolean> {
    const bookmarks = this.getBookmarksFromStorage();
    const newBookmarks = bookmarks.filter(bookmark => bookmark.id !== id);
    if (newBookmarks.length === bookmarks.length) {
      return false;
    }
    this.saveBookmarksToStorage(newBookmarks);
    
    // 从所有集合中移除该书签
    const collections = this.getCollectionsFromStorage();
    const updatedCollections = collections.map(collection => ({
      ...collection,
      bookmarkIds: collection.bookmarkIds.filter(bookmarkId => bookmarkId !== id),
      updatedAt: this.getCurrentTime(),
    }));
    this.saveCollectionsToStorage(updatedCollections);
    
    logger.info('Bookmark deleted:', id);
    return true;
  }

  /**
   * 获取所有书签
   */
  async getAllBookmarks(): Promise<BookmarkItem[]> {
    return this.getBookmarksFromStorage();
  }

  /**
   * 搜索书签
   */
  async searchBookmarks(query: string): Promise<BookmarkItem[]> {
    const bookmarks = this.getBookmarksFromStorage();
    const lowerQuery = query.toLowerCase();
    return bookmarks.filter(bookmark => 
      bookmark.title.toLowerCase().includes(lowerQuery) ||
      bookmark.content.toLowerCase().includes(lowerQuery) ||
      bookmark.tags.some(tag => tag.toLowerCase().includes(lowerQuery))
    );
  }

  /**
   * 按标签过滤书签
   */
  async filterBookmarksByTag(tag: string): Promise<BookmarkItem[]> {
    const bookmarks = this.getBookmarksFromStorage();
    return bookmarks.filter(bookmark => bookmark.tags.includes(tag));
  }

  /**
   * 创建书签集合
   */
  async createCollection(collection: Omit<BookmarkCollection, 'id' | 'createdAt' | 'updatedAt'>): Promise<BookmarkCollection> {
    const collections = this.getCollectionsFromStorage();
    const newCollection: BookmarkCollection = {
      ...collection,
      id: this.generateId(),
      createdAt: this.getCurrentTime(),
      updatedAt: this.getCurrentTime(),
    };
    collections.push(newCollection);
    this.saveCollectionsToStorage(collections);
    logger.info('Collection created:', newCollection.id);
    return newCollection;
  }

  /**
   * 获取所有集合
   */
  async getAllCollections(): Promise<BookmarkCollection[]> {
    return this.getCollectionsFromStorage();
  }

  /**
   * 将书签添加到集合
   */
  async addBookmarkToCollection(bookmarkId: string, collectionId: string): Promise<boolean> {
    const collections = this.getCollectionsFromStorage();
    const collection = collections.find(c => c.id === collectionId);
    if (!collection) {
      return false;
    }
    if (collection.bookmarkIds.includes(bookmarkId)) {
      return true;
    }
    collection.bookmarkIds.push(bookmarkId);
    collection.updatedAt = this.getCurrentTime();
    this.saveCollectionsToStorage(collections);
    logger.info('Bookmark added to collection:', bookmarkId, '->', collectionId);
    return true;
  }

  /**
   * 从集合中移除书签
   */
  async removeBookmarkFromCollection(bookmarkId: string, collectionId: string): Promise<boolean> {
    const collections = this.getCollectionsFromStorage();
    const collection = collections.find(c => c.id === collectionId);
    if (!collection) {
      return false;
    }
    const originalLength = collection.bookmarkIds.length;
    collection.bookmarkIds = collection.bookmarkIds.filter(id => id !== bookmarkId);
    if (collection.bookmarkIds.length === originalLength) {
      return false;
    }
    collection.updatedAt = this.getCurrentTime();
    this.saveCollectionsToStorage(collections);
    logger.info('Bookmark removed from collection:', bookmarkId, '->', collectionId);
    return true;
  }
}

/**
 * 全局书签管理器实例
 */
export const bookmarkManager = new LocalStorageBookmarkManager();

export default bookmarkManager;
