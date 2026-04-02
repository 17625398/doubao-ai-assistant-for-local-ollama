'use client';

import { useState, useEffect } from 'react';

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
  onNewChat: () => void;
}

// 从本地存储加载历史会话数据
const loadSessionsFromStorage = () => {
  try {
    // 检查是否在浏览器环境中
    if (typeof window !== 'undefined' && window.localStorage) {
      const storedSessions = localStorage.getItem('chat-sessions');
      if (storedSessions) {
        return JSON.parse(storedSessions);
      }
    }
    // 默认会话数据
    return [
      { id: '1', title: '欢迎使用豆包', date: '今天' },
    ];
  } catch (error) {
    console.error('Error loading sessions from storage:', error);
    return [
      { id: '1', title: '欢迎使用豆包', date: '今天' },
    ];
  }
};

export function Sidebar({ isOpen, onClose, onNewChat }: SidebarProps) {
  const [activeSession, setActiveSession] = useState<string | null>(null);
  const [sessions, setSessions] = useState([
    { id: '1', title: '欢迎使用豆包', date: '今天' },
  ]);

  const handleNewChat = () => {
    onNewChat();
    setActiveSession(null);
    if (window.innerWidth < 768) {
      onClose();
    }
  };

  const handleSessionClick = (sessionId: string) => {
    setActiveSession(sessionId);
    if (window.innerWidth < 768) {
      onClose();
    }
  };

  // 在客户端加载会话数据
  useEffect(() => {
    const loadSessions = () => {
      try {
        if (typeof window !== 'undefined' && window.localStorage) {
          const storedSessions = localStorage.getItem('chat-sessions');
          if (storedSessions) {
            setSessions(JSON.parse(storedSessions));
          }
        }
      } catch (error) {
        console.error('Error loading sessions from storage:', error);
      }
    };

    loadSessions();
  }, []);

  return (
    <>
      {/* 遮罩层 */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/30 z-40 md:hidden"
          onClick={onClose}
        />
      )}

      {/* 侧边栏 */}
      <aside
        className={`fixed md:relative w-72 h-full bg-white border-r border-gray-200 flex flex-col z-50 transition-transform duration-300 ${
          isOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0 md:hidden'
        }`}
      >
        {/* 顶部豆包头像 */}
        <div className="p-4 border-b border-gray-100">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-orange-400 to-orange-600 flex items-center justify-center shadow-sm">
                <span className="text-xl font-bold text-white">豆</span>
              </div>
              <div>
                <h2 className="font-semibold text-gray-800">豆包</h2>
                <p className="text-xs text-gray-500">智能AI助手</p>
              </div>
            </div>
            <button 
              onClick={handleNewChat}
              className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
              title="新建对话"
            >
              <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
            </button>
          </div>
        </div>

        {/* 导航菜单 */}
        <div className="p-3 border-b border-gray-100">
          <ul className="space-y-1">
            <li>
              <button className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left text-sm text-gray-700 hover:bg-gray-50 transition-colors">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                </svg>
                <span>AI对话</span>
              </button>
            </li>
            <li>
              <button 
                className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                onClick={() => window.dispatchEvent(new CustomEvent('open-ai-creation'))}
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                </svg>
                <span>AI创作</span>
              </button>
            </li>
            <li>
              <button 
                className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                onClick={() => window.dispatchEvent(new CustomEvent('open-cloud-storage'))}
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                </svg>
                <span>云盘</span>
              </button>
            </li>
            <li>
              <button 
                className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                onClick={() => window.dispatchEvent(new CustomEvent('open-quick-tools'))}
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
                <span>快捷工具</span>
              </button>
            </li>
            <li>
              <button className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left text-sm text-gray-700 hover:bg-gray-50 transition-colors">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
                </svg>
                <span>更多</span>
              </button>
            </li>
          </ul>
        </div>

        {/* 历史对话 */}
        <div className="flex-1 overflow-y-auto p-3">
          <div className="mb-4">
            <div className="flex items-center justify-between mb-2 px-3">
              <h3 className="text-xs font-medium text-gray-500 uppercase tracking-wider">
                历史对话
              </h3>
              <button className="text-xs text-blue-500 hover:text-blue-600 transition-colors">
                清空
              </button>
            </div>
            <ul className="space-y-1">
              {sessions.map(session => (
                <li key={session.id}>
                  <button
                    onClick={() => handleSessionClick(session.id)}
                    className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-left text-sm transition-colors ${
                      activeSession === session.id
                        ? 'bg-blue-50 text-blue-600'
                        : 'text-gray-700 hover:bg-gray-50'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                      </svg>
                      <span className="truncate">{session.title}</span>
                    </div>
                    <span className="text-xs text-gray-400">{session.date}</span>
                  </button>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* 底部 */}
        <div className="p-4 border-t border-gray-100">
          <div className="space-y-2">
            <button className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left text-sm text-gray-700 hover:bg-gray-50 transition-colors">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              <span>设置</span>
            </button>
            <button className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left text-sm text-gray-700 hover:bg-gray-50 transition-colors">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span>帮助与反馈</span>
            </button>
          </div>
        </div>
      </aside>
    </>
  );
}
