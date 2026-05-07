'use client'

import { ChatMessage } from '@core/types'
import { useState, memo } from 'react'

interface MessageItemProps {
  message: ChatMessage
  isLast: boolean
}

function MessageItemComponent({ message, isLast }: MessageItemProps) {
  const [copied, setCopied] = useState(false)
  const isUser = message.role === 'user'

  const copyContent = () => {
    navigator.clipboard.writeText(message.content)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const formatTime = (timestamp: number) => {
    const date = new Date(timestamp)
    return date.toLocaleTimeString('zh-CN', {
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  return (
    <div
      className={`flex gap-4 py-2 ${isUser ? 'flex-row-reverse' : ''} animate-in fade-in slide-in-from-bottom-2`}
    >
      {/* 头像 */}
      <div
        className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${isUser ? 'bg-gray-200 text-gray-600' : 'bg-gradient-to-br from-orange-400 to-orange-600'} transition-transform hover:scale-105`}
      >
        {isUser ? (
          <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
            <path
              fillRule="evenodd"
              d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z"
              clipRule="evenodd"
            />
          </svg>
        ) : (
          <span className="text-lg text-white">豆</span>
        )}
      </div>

      {/* 消息内容 */}
      <div className={`flex-1 max-w-[80%] ${isUser ? 'text-right' : ''}`}>
        {/* 附件 */}
        {message.attachments && message.attachments.length > 0 && (
          <div className={`flex gap-2 mb-2 ${isUser ? 'justify-end' : ''}`}>
            {message.attachments.map((attachment, index) => (
              <div
                key={index}
                className={`rounded-lg flex items-center gap-2 max-w-xs overflow-hidden ${isUser ? 'bg-gray-100' : 'bg-white border border-gray-100'} transition-all hover:shadow-md`}
              >
                {attachment.type === 'image' ? (
                  <img
                    src={attachment.url}
                    alt={attachment.name}
                    className="w-24 h-24 object-cover transition-transform hover:scale-105"
                  />
                ) : (
                  <div className="p-3 flex items-center gap-2">
                    <svg
                      className="w-5 h-5 text-gray-500"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                      />
                    </svg>
                    <span className="text-sm text-gray-600 truncate">{attachment.name}</span>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {/* 文本内容 */}
        <div
          className={`inline-block text-left px-5 py-3 rounded-2xl shadow-sm ${isUser ? 'bg-blue-500 text-white' : 'bg-white border border-gray-100 text-gray-800'} transition-all hover:shadow-md`}
        >
          <p className="text-sm leading-relaxed whitespace-pre-wrap">{message.content}</p>
        </div>

        {/* 时间和操作 */}
        <div className={`flex items-center gap-3 mt-1 ${isUser ? 'justify-end' : ''}`}>
          <span className="text-xs text-gray-400">{formatTime(message.timestamp)}</span>
          {!isUser && (
            <button
              onClick={copyContent}
              className="text-xs text-gray-400 hover:text-blue-500 transition-colors"
            >
              {copied ? '已复制' : '复制'}
            </button>
          )}
          {!isUser && (
            <button className="text-xs text-gray-400 hover:text-blue-500 transition-colors">
              👍
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

export const MessageItem = memo(MessageItemComponent)
