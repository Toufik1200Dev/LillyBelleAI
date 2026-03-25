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
        'group relative flex items-center gap-3 rounded-xl px-3 py-2.5 cursor-pointer transition-all duration-200',
        isActive
          ? 'bg-white/[0.08] text-white font-medium shadow-sm'
          : 'text-gray-400 hover:bg-white/[0.04] hover:text-gray-200'
      )}
      onClick={() => { if (!isEditing) onSelect(); }}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => { if (e.key === 'Enter') onSelect(); }}
      aria-current={isActive ? 'page' : undefined}
    >
      <MessageSquare className={clsx("h-4 w-4 flex-shrink-0 transition-colors", isActive ? "text-primary-400" : "text-gray-500 group-hover:text-gray-400")} />

      {isEditing ? (
        <div className="flex flex-1 items-center gap-1" onClick={(e) => e.stopPropagation()}>
          <input
            autoFocus
            value={editValue}
            onChange={(e) => setEditValue(e.target.value)}
            onKeyDown={handleKeyDown}
            onBlur={handleRename}
            className="flex-1 min-w-0 bg-gray-700 rounded-md px-2 py-0.5 text-xs text-white focus:outline-none focus:ring-1 focus:ring-primary-500"
          />
          <button onClick={handleRename} className="text-green-400 hover:text-green-300">
            <Check className="h-3.5 w-3.5" />
          </button>
          <button onClick={() => { setEditValue(conversation.title); setIsEditing(false); }} className="text-gray-500 hover:text-gray-300">
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      ) : (
        <>
          <div className="flex-1 min-w-0">
            <p className="truncate text-xs font-medium leading-snug">
              {truncate(conversation.title, 40)}
            </p>
            <p className="text-[10px] text-gray-600 mt-0.5">
              {formatRelativeTime(conversation.updated_at)}
            </p>
          </div>

          {/* Action buttons */}
          <div
            className="hidden group-hover:flex items-center gap-1 flex-shrink-0"
            onClick={(e) => e.stopPropagation()}
          >
            {confirmDelete ? (
              <>
                <button
                  onClick={onDelete}
                  className="rounded-md p-1 text-red-400 hover:bg-red-500/20 text-[10px] font-medium px-1.5"
                >
                  Delete
                </button>
                <button
                  onClick={() => setConfirmDelete(false)}
                  className="rounded-md p-1 text-gray-500 hover:text-gray-300"
                >
                  <X className="h-3 w-3" />
                </button>
              </>
            ) : (
              <>
                <button
                  onClick={() => { setEditValue(conversation.title); setIsEditing(true); }}
                  className="rounded-md p-1 text-gray-500 hover:text-gray-300 hover:bg-gray-700"
                  aria-label="Rename conversation"
                >
                  <Pencil className="h-3 w-3" />
                </button>
                <button
                  onClick={() => setConfirmDelete(true)}
                  className="rounded-md p-1 text-gray-500 hover:text-red-400 hover:bg-gray-700"
                  aria-label="Delete conversation"
                >
                  <Trash2 className="h-3 w-3" />
                </button>
              </>
            )}
          </div>
        </>
      )}
    </div>
  );
}
