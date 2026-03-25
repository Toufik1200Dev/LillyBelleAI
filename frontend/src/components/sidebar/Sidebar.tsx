import { useState } from 'react';
import clsx from 'clsx';
import { Plus, Search, X } from 'lucide-react';
import { ConversationList } from './ConversationList';
import { UserProfile } from './UserProfile';
import { useConversations } from '@/hooks/useConversations';
import type { Conversation } from '@/types/chat';
import { Logo } from '@/components/common/Logo';

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

export function Sidebar({ isOpen, onClose }: SidebarProps) {
  const {
    conversations,
    activeConversationId,
    selectConversation,
    createConversation,
    deleteConversation,
    renameConversation,
  } = useConversations();

  const [search, setSearch] = useState('');

  const filtered = search.trim()
    ? conversations.filter((c: Conversation) =>
        c.title.toLowerCase().includes(search.toLowerCase())
      )
    : conversations;

  const handleNew = async () => {
    await createConversation();
    onClose(); // close on mobile after creating
  };

  const handleSelect = async (id: string) => {
    await selectConversation(id);
    onClose(); // close on mobile after selecting
  };

  return (
    <>
      {/* Mobile overlay backdrop */}
      {isOpen && (
        <div
          className="fixed inset-0 z-20 bg-black/60 backdrop-blur-sm lg:hidden"
          onClick={onClose}
          aria-hidden
        />
      )}

      {/* Sidebar panel */}
      <aside
        className={clsx(
          'fixed inset-y-0 left-0 z-30 flex flex-col bg-gray-900 border-r border-gray-800 transition-transform duration-300 ease-in-out',
          'w-72 lg:static lg:translate-x-0',
          isOpen ? 'translate-x-0' : '-translate-x-full'
        )}
        aria-label="Conversation sidebar"
      >
        {/* Header */}
        <div className="flex h-full flex-col">
          {/* Header */}
          <div className="p-4 border-b border-white/[0.02]">
            <div className="flex items-center justify-between mb-6">
              <Logo className="px-1" />
              <button
                onClick={onClose}
                className="lg:hidden rounded-lg p-1 text-gray-500 hover:text-white hover:bg-white/5 transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
          </div>

        {/* New Chat button */}
        <div className="px-3 py-2">
          <button
            id="new-chat-btn"
            onClick={handleNew}
            className="group flex w-full items-center justify-between gap-2 border border-white/10 rounded-xl bg-white/[0.03] px-3 py-2.5 text-sm font-medium text-gray-200 hover:bg-white/[0.08] transition-all duration-200 active:scale-[0.98]"
          >
            <span className="flex items-center gap-2">
              <span className="flex h-5 w-5 items-center justify-center rounded-full bg-white/10 group-hover:bg-white/20 transition-colors">
                <Plus className="h-3 w-3 text-white" />
              </span>
              New Chat
            </span>
          </button>
        </div>

        {/* Search */}
        <div className="px-3 pb-2 mt-2">
          <div className="relative group">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500 group-focus-within:text-primary-400 transition-colors" />
            <input
              type="search"
              placeholder="Search chats..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full rounded-xl bg-transparent border border-transparent hover:bg-white/[0.03] focus:bg-white/[0.03] focus:border-white/10 px-9 py-2 text-sm text-gray-200 placeholder-gray-500 focus:outline-none transition-all"
            />
            {search && (
              <button
                onClick={() => setSearch('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-white transition-colors"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
        </div>

        {/* Conversation list */}
        <div className="flex-1 overflow-y-auto">
          <ConversationList
            conversations={filtered}
            activeId={activeConversationId}
            onSelect={handleSelect}
            onDelete={deleteConversation}
            onRename={renameConversation}
          />
        </div>

        {/* User profile at bottom */}
        <div className="border-t border-gray-800 px-3 py-3">
          <UserProfile />
        </div>
        </div>
      </aside>
    </>
  );
}
