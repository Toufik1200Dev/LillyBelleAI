import { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { oneDark } from 'react-syntax-highlighter/dist/esm/styles/prism';
import remarkGfm from 'remark-gfm';
import clsx from 'clsx';
import { Copy, Check, AlertCircle, RefreshCw, User, Share2 } from 'lucide-react';
import { Logo } from '@/components/common/Logo';
import type { Message } from '@/types/chat';
import { formatTime } from '@/utils/dateFormatter';

interface MessageBubbleProps {
  message: Message;
  isUser: boolean;
  showAvatar?: boolean;
  onRetry?: () => void;
}

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  const copy = () => {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };
  return (
    <button
      onClick={copy}
      className="rounded-lg bg-slate-50 dark:bg-white/5 p-1.5 text-slate-400 hover:text-sky-600 hover:bg-slate-100 dark:hover:bg-white/10 transition-all border border-slate-200 dark:border-white/5"
      aria-label="Copier le contenu"
    >
      {copied ? <Check className="h-4 w-4 text-green-600" /> : <Copy className="h-4 w-4" />}
    </button>
  );
}

export function MessageBubble({ message, isUser, showAvatar = true, onRetry }: MessageBubbleProps) {
  const hasError = message.isError;

  return (
    <div
      className={clsx(
        'group flex w-full animate-fade-slide px-4 py-2.5 sm:py-3 transition-colors duration-500',
        isUser ? 'justify-end' : 'justify-start'
      )}
    >
      <div className={clsx('flex max-w-[85%] items-start gap-4', isUser && 'flex-row-reverse')}>
        {/* Avatar */}
        {showAvatar ? (
          <div
            className={clsx(
              'flex-shrink-0 flex h-10 w-10 items-center justify-center rounded-2xl text-xs font-bold shadow-sm border transition-all duration-500 group-hover:scale-105',
              isUser
                ? 'bg-sky-100 dark:bg-sky-500/20 border-sky-200 dark:border-sky-500/30 text-sky-600 dark:text-sky-400 shadow-sky-500/5'
                : 'bg-slate-100 dark:bg-white/5 border-slate-200 dark:border-white/5 text-slate-600 dark:text-slate-400 shadow-slate-200/5'
            )}
          >
            {isUser ? <User className="h-5.5 w-5.5" /> : <Logo showText={false} className="scale-50" />}
          </div>
        ) : (
          <div className="w-10 flex-shrink-0" />
        )}

        {/* Content Area */}
        <div className={clsx('flex flex-col min-w-0', isUser ? 'items-end' : 'items-start')}>
          <div className="flex items-center gap-2 mb-2 px-1">
            <span className={clsx("text-xs uppercase font-black tracking-widest font-outfit", isUser ? "text-sky-600 dark:text-sky-400" : "text-slate-500 dark:text-slate-400")}>
              {isUser ? 'Vous' : 'LillyBelle AI'}
            </span>
            <span className="text-[11px] text-slate-400 dark:text-slate-500 font-medium">{formatTime(message.created_at)}</span>
          </div>

          <div
            className={clsx(
              'relative rounded-[2rem] px-6 py-5 transition-all duration-500',
              isUser
                ? 'bg-sky-600 text-white shadow-xl shadow-sky-600/10 rounded-tr-none'
                : 'bg-white dark:bg-white/[0.03] border border-slate-200/80 dark:border-white/5 text-slate-700 dark:text-slate-200 shadow-xl shadow-slate-200/40 dark:shadow-none rounded-tl-none'
            )}
          >
            {hasError && (
              <div className="flex items-center gap-2 text-red-500 mb-3 text-xs font-bold font-outfit uppercase tracking-wider">
                <AlertCircle className="h-4 w-4" />
                Erreur de connexion
              </div>
            )}

            {isUser ? (
              <p className="whitespace-pre-wrap break-words leading-relaxed font-medium">{message.content}</p>
            ) : (
              <div className="prose prose-custom max-w-none prose-p:leading-relaxed">
                <ReactMarkdown
                  remarkPlugins={[remarkGfm]}
                  components={{
                    code({ className, children, ...props }) {
                      const match = /language-(\w+)/.exec(className ?? '');
                      const codeString = String(children).replace(/\n$/, '');
                      if (match) {
                        return (
                          <div className="relative group my-6 rounded-2xl overflow-hidden border border-slate-200 dark:border-white/5 bg-slate-50 dark:bg-[#0B0F19] shadow-inner">
                            <div className="flex items-center justify-between bg-slate-100/50 dark:bg-white/5 px-4 py-2.5 border-b border-slate-200 dark:border-white/5">
                              <span className="text-xs font-black uppercase tracking-widest text-slate-500 dark:text-slate-400 font-outfit">{match[1]}</span>
                              <CopyButton text={codeString} />
                            </div>
                            <SyntaxHighlighter
                              style={oneDark as Record<string, React.CSSProperties>}
                              language={match[1]}
                              PreTag="div"
                              customStyle={{ margin: 0, padding: '1.5rem', background: '#282c34', fontSize: '14px' }}
                            >
                              {codeString}
                            </SyntaxHighlighter>
                          </div>
                        );
                      }
                      return (
                        <code
                          className="rounded-lg bg-slate-100 dark:bg-white/5 px-1.5 py-1 font-mono text-sm text-sky-700 dark:text-sky-400 font-bold border border-slate-200 dark:border-white/5"
                          {...props}
                        >
                          {children}
                        </code>
                      );
                    },
                    a({ href, children }) {
                      return (
                        <a href={href} target="_blank" rel="noopener noreferrer" className="text-sky-600 dark:text-sky-400 font-bold underline underline-offset-4 decoration-sky-500/30 dark:decoration-sky-500/50 hover:decoration-sky-500 dark:hover:decoration-sky-400 transition-all">
                          {children}
                        </a>
                      );
                    },
                    p({ children }) {
                      return <p className="mb-4 last:mb-0 leading-relaxed">{children}</p>;
                    },
                    ul({ children }) {
                      return <ul className="list-disc list-outside ml-4 space-y-2 mb-4 marker:text-sky-500">{children}</ul>;
                    },
                    li({ children }) {
                      return <li className="pl-1 text-slate-600 dark:text-slate-400 font-medium">{children}</li>;
                    },
                  }}
                >
                  {message.content}
                </ReactMarkdown>
              </div>
            )}

            {/* Actions for Assistant */}
            {!isUser && !hasError && (
              <div className="mt-5 flex items-center justify-end gap-2 pt-4 border-t border-slate-100 dark:border-white/5 transition-colors duration-500">
                <CopyButton text={message.content} />
                <button
                  className="rounded-lg bg-slate-50 dark:bg-white/5 p-1.5 text-slate-400 dark:text-slate-500 hover:text-sky-600 dark:hover:text-sky-400 hover:bg-slate-100 dark:hover:bg-white/10 transition-all border border-slate-200 dark:border-white/10"
                  aria-label="Partager la réponse"
                >
                  <Share2 className="h-4 w-4" />
                </button>
              </div>
            )}
          </div>

          {/* Sources Area */}
          {!isUser && message.metadata?.sources && message.metadata.sources.length > 0 && (
            <div className="mt-4 flex flex-wrap gap-2 w-full">
              {message.metadata.sources.map((source, idx) => (
                <a
                  key={idx}
                  href={source.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2.5 rounded-2xl border border-slate-200 dark:border-white/5 bg-white/50 dark:bg-white/[0.02] px-4 py-2 text-xs hover:border-sky-300 dark:hover:border-sky-500 hover:bg-white dark:hover:bg-white/[0.05] hover:shadow-lg hover:shadow-sky-500/5 transition-all group/source"
                >
                  <Share2 className="h-3 w-3 text-sky-500 opacity-60" />
                  <span className="font-bold text-slate-500 dark:text-slate-400 group-hover/source:text-slate-900 dark:group-hover:text-white transition-colors max-w-[150px] truncate">
                    {source.title}
                  </span>
                </a>
              ))}
            </div>
          )}

          {/* Retry Button */}
          {hasError && onRetry && (
            <button
              onClick={onRetry}
              className="mt-4 flex items-center gap-2.5 rounded-2xl bg-red-50 dark:bg-red-500/10 px-5 py-2.5 text-xs font-black text-red-500 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-500/20 transition-all border border-red-200 dark:border-red-500/20 font-outfit uppercase tracking-wider shadow-sm"
            >
              <RefreshCw className="h-4 w-4" />
              Réessayer la connexion
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
