'use client';

import { memo } from 'react';
import { ChatMessage } from '@core/types';
import { MessageItem } from './MessageItem';

interface MessageListProps {
  messages: ChatMessage[];
}

export const MessageList = memo(function MessageList({ messages }: MessageListProps) {
  return (
    <div className="flex flex-col gap-6 px-4 py-6 max-w-4xl mx-auto">
      {messages.map((message, index) => (
        <MessageItem
          key={message.id}
          message={message}
          isLast={index === messages.length - 1}
        />
      ))}
    </div>
  );
});
