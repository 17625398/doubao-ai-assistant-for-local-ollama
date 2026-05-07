'use client';

import React from 'react';
import { MessageSquare, Clock, Trash2 } from 'lucide-react';

interface ChatHistoryItem {
  id: string;
  title: string;
  lastMessage: string;
  timestamp: string;
  unread?: number;
}

interface ChatHistoryProps {
  history: ChatHistoryItem[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  onDelete: (id: string) => void;
}

export function ChatHistory({ history, selectedId, onSelect, onDelete }: ChatHistoryProps) {
  if (history.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-gray-400">
        <MessageSquare className="w-12 h-12 mb-3 opacity-50" />
        <p>暂无聊天记录</p>
      </div>
    );
  }

  return (
    <div className="space-y-1">
      {history.map((item) => (
        <div
          key={item.id}
          className={`flex items-center gap-3 p-3 rounded-lg cursor-pointer transition-colors ${
            selectedId === item.id
              ? 'bg-blue-50 border border-blue-200'
              : 'hover:bg-gray-50'
          }`}
          onClick={() => onSelect(item.id)}
        >
          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-400 to-indigo-500 flex items-center justify-center shrink-0">
            <MessageSquare className="w-5 h-5 text-white" />
          </div>
          
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between">
              <span className="font-medium text-gray-800 truncate">{item.title}</span>
              <span className="text-xs text-gray-400 flex items-center gap-1">
                <Clock className="w-3 h-3" />
                {item.timestamp}
              </span>
            </div>
            <p className="text-sm text-gray-500 truncate mt-0.5">{item.lastMessage}</p>
          </div>

          {item.unread && item.unread > 0 && (
            <div className="w-5 h-5 rounded-full bg-blue-500 text-white text-xs flex items-center justify-center shrink-0">
              {item.unread}
            </div>
          )}

          <button
            onClick={(e) => {
              e.stopPropagation();
              onDelete(item.id);
            }}
            className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors opacity-0 group-hover:opacity-100"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      ))}
    </div>
  );
}
