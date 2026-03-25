import { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { oneDark } from 'react-syntax-highlighter/dist/esm/styles/prism';
import remarkGfm from 'remark-gfm';
import clsx from 'clsx';
import { Copy, Check, AlertCircle, RefreshCw } from 'lucide-react';
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
      className="absolute right-2 top-2 rounded-md bg-gray-700 p-1.5 text-gray-400 hover:text-white hover:bg-gray-600 transition-colors opacity-0 group-hover:opacity-100"
      aria-label="Copy code"
    >
      {copied ? <Check className="h-3.5 w-3.5 text-green-400" /> : <Copy className="h-3.5 w-3.5" />}
    </button>
  );
}

export function MessageBubble({ message, isUser, showAvatar = true, onRetry }: MessageBubbleProps) {
  const hasError = message.isError;

  return (
    <div
      className={clsx(
        'group flex w-full animate-fade-slide justify-center',
        isUser ? 'py-4' : 'py-6 bg-[#161B22]/50 border-y border-white/[0.02]'
      )}
    >
      <div className="flex w-full max-w-3xl items-start gap-4 px-4">
        {/* Avatar */}
        {showAvatar ? (
          <div
            className={clsx(
              'flex-shrink-0 flex h-8 w-8 items-center justify-center rounded-xl text-xs font-bold shadow-sm ring-1 ring-white/10 mt-0.5',
              isUser
                ? 'bg-gradient-to-br from-primary-500 to-indigo-600 text-white'
                : 'bg-gradient-to-br from-gray-800 to-gray-900 text-white'
            )}
          >
            {isUser ? (
              'US'
            ) : (
              <svg viewBox="0 0 24 24" fill="none" className="h-4 w-4 text-white" stroke="currentColor" strokeWidth={2.5}>
                <path d="M12 2v20M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            )}
          </div>
        ) : (
          <div className="w-8 flex-shrink-0" />
        )}

        {/* Bubble */}
        <div className="flex w-full flex-col min-w-0">
          <div
            className={clsx(
              'text-[15px] leading-relaxed',
              isUser
                ? 'text-gray-100 font-medium'
                : 'text-gray-300',
              hasError && 'text-red-400'
            )}
          >
            {hasError && (
              <div className="flex items-center gap-2 text-red-400 mb-2 text-xs font-semibold uppercase tracking-wider">
                <AlertCircle className="h-4 w-4" />
                Network Error
              </div>
            )}

            {isUser ? (
              <p className="whitespace-pre-wrap break-words">{message.content}</p>
            ) : (
              <div className="prose prose-invert max-w-none prose-p:leading-relaxed prose-pre:bg-[#0D1117] prose-pre:border prose-pre:border-white/5 prose-pre:shadow-xl">
                <ReactMarkdown
                  remarkPlugins={[remarkGfm]}
                  components={{
                    code({ className, children, ...props }) {
                      const match = /language-(\w+)/.exec(className ?? '');
                      const codeString = String(children).replace(/\n$/, '');
                      if (match) {
                        return (
                          <div className="relative group my-5 rounded-xl overflow-hidden border border-white/5 bg-[#0D1117]">
                            <div className="flex items-center justify-between bg-white/[0.02] px-4 py-2 border-b border-white/5">
                              <span className="text-xs font-mono text-gray-400">{match[1]}</span>
                              <CopyButton text={codeString} />
                            </div>
                            <SyntaxHighlighter
                              style={oneDark as Record<string, React.CSSProperties>}
                              language={match[1]}
                              PreTag="div"
                              customStyle={{ margin: 0, padding: '1rem', background: 'transparent', fontSize: '13px' }}
                            >
                              {codeString}
                            </SyntaxHighlighter>
                          </div>
                        );
                      }
                      return (
                        <code
                          className="rounded-md bg-white/[0.05] px-1.5 py-0.5 font-mono text-[13px] text-gray-200"
                          {...props}
                        >
                          {children}
                        </code>
                      );
                    },
                    a({ href, children }) {
                      return (
                        <a href={href} target="_blank" rel="noopener noreferrer" className="text-primary-400 font-medium underline underline-offset-4 hover:text-primary-300 transition-colors">
                          {children}
                        </a>
                      );
                    },
                    p({ children }) {
                      return <p className="mb-4 last:mb-0">{children}</p>;
                    },
                    ul({ children }) {
                      return <ul className="list-disc list-outside ml-4 space-y-2 mb-4">{children}</ul>;
                    },
                    ol({ children }) {
                      return <ol className="list-decimal list-outside ml-4 space-y-2 mb-4">{children}</ol>;
                    },
                    li({ children }) {
                      return <li className="pl-1 marker:text-gray-500">{children}</li>;
                    },
                    blockquote({ children }) {
                      return (
                        <blockquote className="border-l-2 border-primary-500 pl-4 py-0.5 text-gray-400 italic my-4 bg-primary-500/5 rounded-r-lg">
                          {children}
                        </blockquote>
                      );
                    },
                  }}
                >
                  {message.content}
                </ReactMarkdown>
              </div>
            )}
          </div>

        {/* Sources */}
        {!isUser && message.metadata?.sources && message.metadata.sources.length > 0 && (
          <div className="mt-2 space-y-1.5 w-full">
            <p className="text-xs text-gray-500 font-medium">Sources:</p>
            {message.metadata.sources.map((source, idx) => (
              <a
                key={idx}
                href={source.url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-start gap-2 rounded-lg border border-gray-700 bg-gray-800/50 px-3 py-2 text-xs hover:border-primary-500/40 transition-colors group/source"
              >
                <span className="mt-0.5 flex-shrink-0 h-1.5 w-1.5 rounded-full bg-primary-400 group-hover/source:bg-primary-300" />
                <div>
                  <p className="font-medium text-gray-300 group-hover/source:text-primary-300 transition-colors">{source.title}</p>
                  {source.snippet && <p className="text-gray-500 mt-0.5 line-clamp-1">{source.snippet}</p>}
                </div>
              </a>
            ))}
          </div>
        )}

        {/* Timestamp + retry */}
        <div className="mt-1.5 flex items-center gap-2">
          <span className="text-[10px] text-gray-600">{formatTime(message.created_at)}</span>
          {hasError && onRetry && (
            <button
              onClick={onRetry}
              className="flex items-center gap-1 text-[10px] text-red-400 hover:text-red-300 transition-colors"
            >
              <RefreshCw className="h-3 w-3" />
              Retry
            </button>
          )}
        </div>
      </div>
    </div>
  </div>
);
}
