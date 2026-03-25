import { useState, useRef, useCallback, useEffect } from 'react';
import { SendHorizonal, StopCircle } from 'lucide-react';
import clsx from 'clsx';
import { isValidMessage } from '@/utils/validators';

interface InputBoxProps {
  onSend: (message: string) => Promise<void>;
  isDisabled: boolean;
  placeholder?: string;
}

const MAX_CHARS = 8000;

export function InputBox({ onSend, isDisabled, placeholder = 'Ask anything about company documents…' }: InputBoxProps) {
  const [value, setValue] = useState('');
  const [isSending, setIsSending] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Auto-resize textarea
  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = `${Math.min(el.scrollHeight, 200)}px`;
  }, [value]);

  // Focus on mount
  useEffect(() => {
    textareaRef.current?.focus();
  }, []);

  const handleSend = useCallback(async () => {
    const trimmed = value.trim();
    if (!isValidMessage(trimmed) || isDisabled || isSending) return;

    setIsSending(true);
    setValue('');
    if (textareaRef.current) textareaRef.current.style.height = 'auto';

    try {
      await onSend(trimmed);
    } finally {
      setIsSending(false);
      setTimeout(() => textareaRef.current?.focus(), 50);
    }
  }, [value, isDisabled, isSending, onSend]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      void handleSend();
    }
  };

  const remaining = MAX_CHARS - value.length;
  const isOverLimit = remaining < 0;
  const canSend = !isDisabled && !isSending && isValidMessage(value) && !isOverLimit;

  return (
    <div className="bg-gradient-to-t from-[#0B0F19] via-[#0B0F19] to-transparent pt-6 pb-6 px-4">
      <div className="mx-auto max-w-3xl relative">
        <div
          className={clsx(
            'flex items-end gap-3 rounded-3xl border border-white/10 bg-[#161B22] p-2 pl-5 shadow-[0_0_40px_rgba(0,0,0,0.5)] transition-all duration-300',
            isDisabled ? 'opacity-50' : 'focus-within:border-white/20 focus-within:bg-[#1C212B]'
          )}
        >
          <textarea
            ref={textareaRef}
            id="chat-input"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            onKeyDown={handleKeyDown}
            disabled={isDisabled || isSending}
            placeholder={placeholder}
            rows={1}
            aria-label="Message input"
            className="flex-1 resize-none bg-transparent text-sm text-white placeholder-gray-500 focus:outline-none disabled:cursor-not-allowed min-h-[24px] max-h-[200px] py-3 leading-relaxed"
          />

          <div className="flex flex-shrink-0 items-center gap-2 pb-1 pr-1">
            {/* Character counter */}
            {value.length > MAX_CHARS * 0.8 && (
              <span className={clsx('text-xs font-medium px-2', isOverLimit ? 'text-red-400' : 'text-gray-500')}>
                {remaining}
              </span>
            )}

            <button
              id="send-message-btn"
              onClick={() => { void handleSend(); }}
              disabled={!canSend}
              aria-label={isSending ? 'Sending…' : 'Send message'}
              className={clsx(
                'flex h-10 w-10 items-center justify-center rounded-2xl transition-all duration-200',
                canSend
                  ? 'bg-white text-gray-950 shadow-lg hover:scale-105 active:scale-95'
                  : 'bg-white/5 text-gray-600 cursor-not-allowed'
              )}
            >
              {isSending ? (
                <StopCircle className="h-5 w-5" />
              ) : (
                <SendHorizonal className="h-5 w-5" />
              )}
            </button>
          </div>
        </div>

        <p className="mt-3 text-center text-[11px] font-medium text-gray-500 tracking-wide">
          LillyBelle AI can make mistakes. Verify important information.
        </p>
      </div>
    </div>
  );
}
