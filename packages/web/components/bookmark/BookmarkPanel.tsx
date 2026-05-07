// 书签面板组件

import React, { useState, useEffect } from 'react';
import { BookmarkItem, BookmarkType, bookmarkManager } from '@core/utils/bookmark-manager';

interface BookmarkPanelProps {
  isOpen: boolean;
  onClose: () => void;
}

export function BookmarkPanel({ isOpen, onClose }: BookmarkPanelProps) {
  const [bookmarks, setBookmarks] = useState<BookmarkItem[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTag, setSelectedTag] = useState<string>('');
  const [allTags, setAllTags] = useState<string[]>([]);

  useEffect(() => {
    if (isOpen) {
      loadBookmarks();
    }
  }, [isOpen]);

  const loadBookmarks = async () => {
    try {
      const allBookmarks = await bookmarkManager.getAllBookmarks();
      setBookmarks(allBookmarks);
      
      // 提取所有标签
      const tags = new Set<string>();
      allBookmarks.forEach(bookmark => {
        bookmark.tags.forEach(tag => tags.add(tag));
      });
      setAllTags(Array.from(tags));
    } catch (error) {
      console.error('Failed to load bookmarks:', error);
    }
  };

  const handleSearch = async () => {
    if (searchQuery) {
      const results = await bookmarkManager.searchBookmarks(searchQuery);
      setBookmarks(results);
    } else {
      loadBookmarks();
    }
  };

  const handleTagFilter = async (tag: string) => {
    if (selectedTag === tag) {
      setSelectedTag('');
      loadBookmarks();
    } else {
      setSelectedTag(tag);
      const results = await bookmarkManager.filterBookmarksByTag(tag);
      setBookmarks(results);
    }
  };

  const handleDeleteBookmark = async (id: string) => {
    if (confirm('确定要删除这个书签吗？')) {
      await bookmarkManager.deleteBookmark(id);
      loadBookmarks();
    }
  };

  const getBookmarkIcon = (type: BookmarkType) => {
    switch (type) {
      case BookmarkType.TEXT:
        return '📝';
      case BookmarkType.LINK:
        return '🔗';
      case BookmarkType.IMAGE:
        return '🖼️';
      case BookmarkType.CODE:
        return '💻';
      case BookmarkType.CHAT:
        return '💬';
      default:
        return '📑';
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[80vh] flex flex-col">
        {/* 头部 */}
        <div className="p-4 border-b flex justify-between items-center">
          <h2 className="text-xl font-bold text-gray-800">我的书签</h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700"
          >
            ✕
          </button>
        </div>

        {/* 搜索和标签过滤 */}
        <div className="p-4 border-b">
          <div className="flex gap-2 mb-4">
            <input
              type="text"
              placeholder="搜索书签..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
              className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <button
              onClick={handleSearch}
              className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600"
            >
              搜索
            </button>
          </div>

          {/* 标签过滤 */}
          <div className="flex flex-wrap gap-2">
            {allTags.map(tag => (
              <button
                key={tag}
                onClick={() => handleTagFilter(tag)}
                className={`px-3 py-1 rounded-full text-sm ${selectedTag === tag ? 'bg-blue-500 text-white' : 'bg-gray-100 text-gray-800 hover:bg-gray-200'}`}
              >
                {tag}
              </button>
            ))}
          </div>
        </div>

        {/* 书签列表 */}
        <div className="flex-1 overflow-y-auto p-4">
          {bookmarks.length === 0 ? (
            <div className="text-center py-10 text-gray-500">
              <p>暂无书签</p>
              <p className="text-sm mt-2">添加一些内容到书签吧</p>
            </div>
          ) : (
            <div className="space-y-3">
              {bookmarks.map(bookmark => (
                <div key={bookmark.id} className="border rounded-lg p-3 hover:bg-gray-50">
                  <div className="flex justify-between items-start">
                    <div className="flex items-start gap-3">
                      <span className="text-2xl">{getBookmarkIcon(bookmark.type)}</span>
                      <div className="flex-1">
                        <h3 className="font-medium text-gray-800">{bookmark.title}</h3>
                        <p className="text-sm text-gray-600 mt-1 line-clamp-2">{bookmark.content}</p>
                        <div className="flex flex-wrap gap-1 mt-2">
                          {bookmark.tags.map(tag => (
                            <span key={tag} className="text-xs px-2 py-0.5 bg-gray-100 rounded-full text-gray-700">
                              {tag}
                            </span>
                          ))}
                        </div>
                        <p className="text-xs text-gray-400 mt-2">
                          {new Date(bookmark.createdAt).toLocaleString()}
                        </p>
                      </div>
                    </div>
                    <button
                      onClick={() => handleDeleteBookmark(bookmark.id)}
                      className="text-red-500 hover:text-red-700"
                    >
                      🗑️
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* 底部 */}
        <div className="p-4 border-t flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-gray-200 text-gray-800 rounded-md hover:bg-gray-300"
          >
            关闭
          </button>
        </div>
      </div>
    </div>
  );
}

export default BookmarkPanel;
