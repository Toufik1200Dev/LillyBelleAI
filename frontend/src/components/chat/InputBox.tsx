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

export function InputBox({ onSend, isDisabled, placeholder = 'Posez une question sur vos documents…' }: InputBoxProps) {
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
    <div className="bg-gradient-to-t from-slate-50 dark:from-[#030712] via-slate-50/90 dark:via-[#030712]/90 to-transparent pt-10 pb-8 px-4 relative z-10">
      <div className="mx-auto max-w-4xl relative">
        <div
          className={clsx(
            'flex items-end gap-2 sm:gap-3 rounded-[1.5rem] sm:rounded-[2.5rem] border border-slate-200 dark:border-white/5 bg-white dark:bg-white/[0.03] p-1.5 sm:p-2 pl-4 sm:pl-6 shadow-2xl shadow-slate-200/60 dark:shadow-none transition-all duration-500 ease-out group',
            isDisabled ? 'opacity-50' : 'hover:border-slate-300 dark:hover:border-white/10 focus-within:border-sky-500/40 focus-within:ring-8 focus-within:ring-sky-500/5'
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
            aria-label="Saisie du message"
            className="flex-1 resize-none bg-transparent text-[15px] text-slate-900 dark:text-slate-200 placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none disabled:cursor-not-allowed min-h-[56px] max-h-[200px] py-4 leading-relaxed font-medium"
          />

          <div className="flex flex-shrink-0 items-center justify-center p-2">
            <button
              id="send-message-btn"
              onClick={() => { void handleSend(); }}
              disabled={!canSend}
              aria-label={isSending ? 'Envoi…' : 'Envoyer le message'}
              className={clsx(
                'flex h-10 w-10 sm:h-12 sm:w-12 items-center justify-center rounded-2xl sm:rounded-3xl transition-all duration-300 group-focus-within:shadow-[0_0_20px_rgba(14,165,233,0.3)]',
                canSend
                  ? 'bg-sky-600 text-white shadow-lg shadow-sky-600/20 hover:scale-105 active:scale-95 hover:bg-sky-500'
                  : 'bg-slate-100 dark:bg-white/5 text-slate-300 dark:text-slate-600 cursor-not-allowed'
              )}
            >
              {isSending ? (
                <StopCircle className="h-5 w-5 sm:h-6 sm:w-6 animate-pulse" />
              ) : (
                <SendHorizonal className={clsx('h-5 w-5 sm:h-6 sm:w-6 transition-transform duration-300', canSend && 'group-hover:translate-x-0.5 group-hover:-translate-y-0.5')} />
              )}
            </button>
          </div>
        </div>

        <p className="mt-5 text-center text-[10px] font-black text-slate-400 dark:text-slate-500 tracking-[0.25em] font-outfit uppercase">
          Assistant IA LillyBelle • Intelligence entreprise
        </p>
      </div>
    </div>
  );
}
