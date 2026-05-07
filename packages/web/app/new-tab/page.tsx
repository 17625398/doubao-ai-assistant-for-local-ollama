'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

export default function NewTabPage() {
  const [recentSessions, setRecentSessions] = useState<any[]>([]);
  const [timeOfDay, setTimeOfDay] = useState('');

  useEffect(() => {
    // 加载最近会话
    loadRecentSessions();
    // 设置问候语
    updateTimeOfDay();
  }, []);

  const loadRecentSessions = () => {
    try {
      const storedSessions = localStorage.getItem('doubao_sessions');
      if (storedSessions) {
        const sessions = JSON.parse(storedSessions);
        setRecentSessions(sessions.slice(0, 5)); // 显示最近5个会话
      }
    } catch (error) {
      console.error('Failed to load recent sessions:', error);
    }
  };

  const updateTimeOfDay = () => {
    const hour = new Date().getHours();
    if (hour < 6) {
      setTimeOfDay('凌晨');
    } else if (hour < 12) {
      setTimeOfDay('上午');
    } else if (hour < 18) {
      setTimeOfDay('下午');
    } else {
      setTimeOfDay('晚上');
    }
  };

  const quickPrompts = [
    {
      id: 1,
      title: '帮我写一篇文章',
      prompt: '帮我写一篇关于人工智能发展的文章',
      icon: '📝'
    },
    {
      id: 2,
      title: '解释量子力学',
      prompt: '解释一下量子力学的基本原理',
      icon: '🔬'
    },
    {
      id: 3,
      title: '翻译文本',
      prompt: '翻译这段文字：Hello, how are you?',
      icon: '🌐'
    },
    {
      id: 4,
      title: '写代码',
      prompt: '写一段React组件代码',
      icon: '💻'
    }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50">
      {/* 顶部导航 */}
      <nav className="bg-white shadow-sm p-4 flex justify-between items-center">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-full bg-orange-500 flex items-center justify-center">
            <span className="text-white font-bold">豆</span>
          </div>
          <h1 className="text-xl font-semibold text-gray-800">豆包</h1>
        </div>
        <div className="flex items-center gap-4">
          <Link href="/" className="text-gray-600 hover:text-blue-500 transition-colors">
            首页
          </Link>
          <Link href="/new-tab" className="text-blue-500 font-medium">
            新标签页
          </Link>
          <Link href="/settings" className="text-gray-600 hover:text-blue-500 transition-colors">
            设置
          </Link>
        </div>
      </nav>

      {/* 主内容区 */}
      <div className="max-w-6xl mx-auto px-4 py-12">
        {/* 问候语 */}
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold text-gray-800 mb-2">
            {timeOfDay}好！有什么我能帮你的吗？
          </h2>
          <p className="text-gray-600">
            豆包是你的 AI 聊天智能对话问答助手，写作文案翻译编程全能工具
          </p>
        </div>

        {/* 快速功能区 */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
          {quickPrompts.map(prompt => (
            <Link
              key={prompt.id}
              href="/?prompt="
              className="bg-white rounded-xl shadow-sm hover:shadow-md transition-shadow p-6 flex flex-col items-center text-center"
            >
              <div className="text-4xl mb-4">{prompt.icon}</div>
              <h3 className="font-medium text-gray-800 mb-2">{prompt.title}</h3>
              <p className="text-sm text-gray-600 line-clamp-2">{prompt.prompt}</p>
            </Link>
          ))}
        </div>

        {/* 最近会话 */}
        <div className="bg-white rounded-xl shadow-sm p-6 mb-12">
          <h3 className="text-lg font-semibold text-gray-800 mb-4">最近会话</h3>
          {recentSessions.length === 0 ? (
            <p className="text-gray-500">暂无最近会话</p>
          ) : (
            <div className="space-y-3">
              {recentSessions.map((session, index) => (
                <div key={index} className="p-3 rounded-lg hover:bg-gray-50 transition-colors">
                  <h4 className="font-medium text-gray-800">{session.title || `会话 ${index + 1}`}</h4>
                  <p className="text-sm text-gray-600 line-clamp-1">
                    {session.messages?.[0]?.content || '无内容'}
                  </p>
                  <p className="text-xs text-gray-400 mt-1">
                    {new Date(session.createdAt || Date.now()).toLocaleString()}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* AI 工具推荐 */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white rounded-xl shadow-sm p-6">
            <div className="text-3xl mb-4">🎨</div>
            <h3 className="font-semibold text-gray-800 mb-2">创意生成</h3>
            <p className="text-sm text-gray-600 mb-4">生成文章、故事、诗歌等创意内容</p>
            <Link
              href="/"
              className="text-blue-500 hover:text-blue-600 text-sm font-medium"
            >
              开始使用 →
            </Link>
          </div>
          <div className="bg-white rounded-xl shadow-sm p-6">
            <div className="text-3xl mb-4">💻</div>
            <h3 className="font-semibold text-gray-800 mb-2">代码助手</h3>
            <p className="text-sm text-gray-600 mb-4">编写、解释和优化代码</p>
            <Link
              href="/"
              className="text-blue-500 hover:text-blue-600 text-sm font-medium"
            >
              开始使用 →
            </Link>
          </div>
          <div className="bg-white rounded-xl shadow-sm p-6">
            <div className="text-3xl mb-4">🌐</div>
            <h3 className="font-semibold text-gray-800 mb-2">翻译助手</h3>
            <p className="text-sm text-gray-600 mb-4">翻译文本、文档和网页内容</p>
            <Link
              href="/"
              className="text-blue-500 hover:text-blue-600 text-sm font-medium"
            >
              开始使用 →
            </Link>
          </div>
        </div>
      </div>

      {/* 底部 */}
      <footer className="bg-white border-t mt-12 py-6">
        <div className="max-w-6xl mx-auto px-4 text-center text-gray-500 text-sm">
          <p>豆包 AI 助手 © {new Date().getFullYear()}</p>
          <p className="mt-2">让 AI 成为你的智能助手</p>
        </div>
      </footer>
    </div>
  );
}
