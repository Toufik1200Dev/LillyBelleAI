import type { Conversation } from '@/types/chat';
import { ConversationItem } from './ConversationItem';
import { groupByDate } from '@/utils/dateFormatter';

interface ConversationListProps {
  conversations: Conversation[];
  activeId: string | null;
  onSelect: (id: string) => void;
  onDelete: (id: string) => void;
  onRename: (id: string, title: string) => void;
}

export function ConversationList({ conversations, activeId, onSelect, onDelete, onRename }: ConversationListProps) {
  if (conversations.length === 0) {
    return (
      <div className="px-4 py-6 text-center">
        <p className="text-xs text-gray-600">No conversations yet.</p>
        <p className="text-xs text-gray-600 mt-0.5">Start a new chat above.</p>
      </div>
    );
  }

  const groups = groupByDate(conversations);

  return (
    <div className="space-y-4 px-2">
      {Array.from(groups.entries()).map(([label, items]) => (
        <div key={label}>
          <p className="mb-1 px-2 text-[10px] font-semibold uppercase tracking-widest text-gray-600">
            {label}
          </p>
          <div className="space-y-0.5">
            {(items as Conversation[]).map((conv) => (
              <ConversationItem
                key={conv.id}
                conversation={conv}
                isActive={conv.id === activeId}
                onSelect={() => onSelect(conv.id)}
                onDelete={() => onDelete(conv.id)}
                onRename={(title) => onRename(conv.id, title)}
              />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
