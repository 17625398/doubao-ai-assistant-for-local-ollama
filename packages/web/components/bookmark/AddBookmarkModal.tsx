// 添加书签模态框组件

import React, { useState } from 'react';
import { BookmarkType, bookmarkManager } from '@core/utils/bookmark-manager';

interface AddBookmarkModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
  initialContent?: string;
  initialTitle?: string;
  initialType?: BookmarkType;
}

export function AddBookmarkModal({ isOpen, onClose, onSuccess, initialContent = '', initialTitle = '', initialType = BookmarkType.TEXT }: AddBookmarkModalProps) {
  const [title, setTitle] = useState(initialTitle);
  const [content, setContent] = useState(initialContent);
  const [type, setType] = useState(initialType);
  const [tags, setTags] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!title.trim() || !content.trim()) {
      alert('请填写标题和内容');
      return;
    }

    setIsLoading(true);
    
    try {
      const tagArray = tags.split(',').map(tag => tag.trim()).filter(tag => tag);
      
      await bookmarkManager.addBookmark({
        title: title.trim(),
        content: content.trim(),
        type,
        tags: tagArray,
      });
      
      onSuccess?.();
      onClose();
    } catch (error) {
      console.error('Failed to add bookmark:', error);
      alert('添加书签失败，请重试');
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-md p-6">
        <h2 className="text-xl font-bold text-gray-800 mb-4">添加书签</h2>
        
        <form onSubmit={handleSubmit}>
          {/* 标题 */}
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              标题
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="输入书签标题"
              required
            />
          </div>

          {/* 内容 */}
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              内容
            </label>
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 min-h-[100px]"
              placeholder="输入书签内容"
              required
            />
          </div>

          {/* 类型 */}
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              类型
            </label>
            <select
              value={type}
              onChange={(e) => setType(e.target.value as BookmarkType)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value={BookmarkType.TEXT}>文本</option>
              <option value={BookmarkType.LINK}>链接</option>
              <option value={BookmarkType.IMAGE}>图片</option>
              <option value={BookmarkType.CODE}>代码</option>
              <option value={BookmarkType.CHAT}>聊天</option>
            </select>
          </div>

          {/* 标签 */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              标签（用逗号分隔）
            </label>
            <input
              type="text"
              value={tags}
              onChange={(e) => setTags(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="例如：学习, 工作, 重要"
            />
          </div>

          {/* 按钮 */}
          <div className="flex gap-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 bg-gray-200 text-gray-800 rounded-md hover:bg-gray-300"
              disabled={isLoading}
            >
              取消
            </button>
            <button
              type="submit"
              className="flex-1 px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600"
              disabled={isLoading}
            >
              {isLoading ? '添加中...' : '添加书签'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default AddBookmarkModal;
