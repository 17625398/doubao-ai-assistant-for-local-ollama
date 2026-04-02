/**
 * 书签类型
 */
export declare enum BookmarkType {
    TEXT = "text",
    LINK = "link",
    IMAGE = "image",
    CODE = "code",
    CHAT = "chat"
}
/**
 * 书签项
 */
export interface BookmarkItem {
    /** 书签ID */
    id: string;
    /** 书签标题 */
    title: string;
    /** 书签内容 */
    content: string;
    /** 书签类型 */
    type: BookmarkType;
    /** 书签创建时间 */
    createdAt: string;
    /** 书签更新时间 */
    updatedAt: string;
    /** 标签 */
    tags: string[];
    /** 来源 */
    source?: string;
    /** 元数据 */
    metadata?: Record<string, any>;
}
/**
 * 书签集合
 */
export interface BookmarkCollection {
    /** 集合ID */
    id: string;
    /** 集合名称 */
    name: string;
    /** 集合描述 */
    description?: string;
    /** 书签项ID列表 */
    bookmarkIds: string[];
    /** 创建时间 */
    createdAt: string;
    /** 更新时间 */
    updatedAt: string;
}
/**
 * 书签管理器接口
 */
export interface BookmarkManager {
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
