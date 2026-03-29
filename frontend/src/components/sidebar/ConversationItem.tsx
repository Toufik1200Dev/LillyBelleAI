import { useState } from 'react';
import clsx from 'clsx';
import { Pencil, Trash2, MessageSquare, Check, X } from 'lucide-react';
import type { Conversation } from '@/types/chat';
import { formatRelativeTime } from '@/utils/dateFormatter';

// Re-export truncateText from dateFormatter isn't ideal, move inline
function truncate(text: string, max: number) {
  return text.length <= max ? text : text.slice(0, max) + '…';
}

interface ConversationItemProps {
  conversation: Conversation;
  isActive: boolean;
  onSelect: () => void;
  onDelete: () => void;
  onRename: (title: string) => void;
}

export function ConversationItem({
  conversation,
  isActive,
  onSelect,
  onDelete,
  onRename,
}: ConversationItemProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState(conversation.title);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const handleRename = () => {
    const trimmed = editValue.trim();
    if (trimmed && trimmed !== conversation.title) {
      onRename(trimmed);
    }
    setIsEditing(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') handleRename();
    if (e.key === 'Escape') { setEditValue(conversation.title); setIsEditing(false); }
  };

  return (
    <div
      className={clsx(
        'group relative flex items-center gap-4 rounded-2xl px-4 py-3.5 cursor-pointer transition-all duration-300 ease-out',
        isActive
          ? 'bg-sky-50 dark:bg-sky-500/10 text-sky-600 dark:text-sky-400 font-bold border border-sky-100 dark:border-sky-500/20 shadow-sm'
          : 'text-slate-500 dark:text-slate-400 hover:bg-slate-100/50 dark:hover:bg-white/5 hover:text-slate-900 dark:hover:text-white border border-transparent'
      )}
      onClick={() => { if (!isEditing) onSelect(); }}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => { if (e.key === 'Enter') onSelect(); }}
      aria-current={isActive ? 'page' : undefined}
    >
      {/* Active Indicator Dot */}
      {isActive && (
        <div className="absolute left-[-2px] top-1/2 -translate-y-1/2 h-5 w-1.5 rounded-full bg-sky-500 shadow-[0_0_10px_rgba(14,165,233,0.4)]" />
      )}

      <MessageSquare className={clsx("h-4.5 w-4.5 flex-shrink-0 transition-colors duration-300", isActive ? "text-sky-500 dark:text-sky-400" : "text-slate-400 dark:text-slate-600 group-hover:text-slate-600 dark:group-hover:text-slate-400")} />

      {isEditing ? (
        <div className="flex flex-1 items-center gap-1" onClick={(e) => e.stopPropagation()}>
          <input
            autoFocus
            value={editValue}
            onChange={(e) => setEditValue(e.target.value)}
            onKeyDown={handleKeyDown}
            onBlur={handleRename}
            className="flex-1 min-w-0 bg-slate-100 dark:bg-white/10 border border-slate-200 dark:border-white/20 rounded-lg px-2 py-1.5 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-sky-500/50 transition-colors"
          />
          <button onClick={handleRename} className="text-sky-600 dark:text-sky-400 hover:text-sky-700 p-1">
            <Check className="h-4 w-4" />
          </button>
        </div>
      ) : (
        <>
          <div className="flex-1 min-w-0">
            <p className={clsx("truncate text-[13px] leading-tight font-outfit transition-colors", isActive ? "text-slate-900 dark:text-white" : "text-slate-600 dark:text-slate-400 font-medium")}>
              {truncate(conversation.title, 36)}
            </p>
            <p className="text-[10px] text-slate-400 dark:text-slate-600 mt-1.5 font-bold tracking-wider uppercase transition-colors">
              {formatRelativeTime(conversation.updated_at)}
            </p>
          </div>

          {/* Action buttons */}
          <div
            className="hidden group-hover:flex items-center gap-1 flex-shrink-0 pl-2"
            onClick={(e) => e.stopPropagation()}
          >
            {confirmDelete ? (
              <div className="flex items-center gap-1 animate-fade-slide">
                <button
                  onClick={onDelete}
                  className="rounded-lg bg-red-50 dark:bg-red-500/10 px-2 py-1 text-red-600 dark:text-red-400 hover:bg-red-600 hover:text-white transition-all text-[10px] font-black uppercase tracking-wider"
                >
                  Supprimer
                </button>
                <button
                  onClick={() => setConfirmDelete(false)}
                  className="rounded-lg p-1 text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/10"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-0.5 opacity-60 hover:opacity-100 transition-opacity">
                <button
                  onClick={() => { setEditValue(conversation.title); setIsEditing(true); }}
                  className="rounded-lg p-1.5 text-slate-400 hover:text-sky-600 dark:hover:text-sky-400 hover:bg-sky-50 dark:hover:bg-sky-500/10 transition-all"
                  aria-label="Renommer la conversation"
                >
                  <Pencil className="h-3.5 w-3.5" />
                </button>
                <button
                  onClick={() => setConfirmDelete(true)}
                  className="rounded-lg p-1.5 text-slate-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-500/10 transition-all"
                  aria-label="Supprimer la conversation"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
