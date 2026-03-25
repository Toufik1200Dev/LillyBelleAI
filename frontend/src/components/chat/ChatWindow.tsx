import { useRef, useEffect } from 'react';
import type { Message } from '@/types/chat';
import { MessageBubble } from './MessageBubble';
import { TypingIndicator } from './TypingIndicator';
import { EmptyState } from './EmptyState';
import { Spinner } from '@/components/common/Spinner';

interface ChatWindowProps {
  messages: Message[];
  isLoadingMessages: boolean;
  isTyping: boolean;
  onSendMessage: (content: string) => Promise<void>;
}

export function ChatWindow({ messages, isLoadingMessages, isTyping }: ChatWindowProps) {
  const bottomRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    const isNearBottom =
      container.scrollHeight - container.scrollTop - container.clientHeight < 120;
    if (isNearBottom || isTyping) {
      bottomRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
    }
  }, [messages, isTyping]);

  if (isLoadingMessages) {
    return (
      <div className="flex flex-1 items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <Spinner size="lg" />
          <p className="text-sm text-gray-500">Loading conversation…</p>
        </div>
      </div>
    );
  }

  if (messages.length === 0) {
    return <EmptyState />;
  }

  return (
    <div
      ref={containerRef}
      className="flex-1 overflow-y-auto scroll-smooth"
      aria-label="Chat messages"
    >
      <div className="mx-auto max-w-3xl py-4">
        {messages.map((message, idx) => (
          <MessageBubble
            key={message.id}
            message={message}
            isUser={message.role === 'user'}
            showAvatar={
              idx === 0 || messages[idx - 1]?.role !== message.role
            }
          />
        ))}

        {isTyping && <TypingIndicator />}

        <div ref={bottomRef} className="h-4" />
      </div>
    </div>
  );
}
