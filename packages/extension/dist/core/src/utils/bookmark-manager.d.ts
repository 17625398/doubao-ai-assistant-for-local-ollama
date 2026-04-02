import { BookmarkItem, BookmarkCollection, BookmarkManager, BookmarkType } from '../types/bookmark';
export type { BookmarkItem, BookmarkCollection, BookmarkManager };
export { BookmarkType };
/**
 * 本地存储书签管理器
 */
export declare class LocalStorageBookmarkManager implements BookmarkManager {
    private readonly BOOKMARKS_KEY;
    private readonly COLLECTIONS_KEY;
    /**
     * 生成唯一ID
     */
    private generateId;
    /**
     * 获取当前时间
     */
    private getCurrentTime;
    /**
     * 从本地存储获取书签
     */
    private getBookmarksFromStorage;
    /**
     * 保存书签到本地存储
     */
    private saveBookmarksToStorage;
    /**
     * 从本地存储获取集合
     */
    private getCollectionsFromStorage;
    /**
     * 保存集合到本地存储
     */
    private saveCollectionsToStorage;
    /**
     * 添加书签
     */
    addBookmark(bookmark: Omit<BookmarkItem, 'id' | 'createdAt' | 'updatedAt'>): Promise<BookmarkItem>;
    /**
     * 获取书签
     */
    getBookmark(id: string): Promise<BookmarkItem | null>;
    /**
     * 更新书签
     */
    updateBookmark(id: string, data: Partial<BookmarkItem>): Promise<BookmarkItem | null>;
    /**
     * 删除书签
     */
    deleteBookmark(id: string): Promise<boolean>;
    /**
     * 获取所有书签
     */
    getAllBookmarks(): Promise<BookmarkItem[]>;
    /**
     * 搜索书签
     */
    searchBookmarks(query: string): Promise<BookmarkItem[]>;
    /**
     * 按标签过滤书签
     */
    filterBookmarksByTag(tag: string): Promise<BookmarkItem[]>;
    /**
     * 创建书签集合
     */
    createCollection(collection: Omit<BookmarkCollection, 'id' | 'createdAt' | 'updatedAt'>): Promise<BookmarkCollection>;
    /**
     * 获取所有集合
     */
    getAllCollections(): Promise<BookmarkCollection[]>;
    /**
     * 将书签添加到集合
     */
    addBookmarkToCollection(bookmarkId: string, collectionId: string): Promise<boolean>;
    /**
     * 从集合中移除书签
     */
    removeBookmarkFromCollection(bookmarkId: string, collectionId: string): Promise<boolean>;
}
/**
 * 全局书签管理器实例
 */
export declare const bookmarkManager: LocalStorageBookmarkManager;
export default bookmarkManager;
