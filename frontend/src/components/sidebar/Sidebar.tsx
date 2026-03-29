import { useState } from 'react';
import clsx from 'clsx';
import { Plus, Search, X } from 'lucide-react';
import { ConversationList } from './ConversationList';
import { UserProfile } from './UserProfile';
import { useConversations } from '@/hooks/useConversations';
import type { Conversation } from '@/types/chat';
import { Logo } from '@/components/common/Logo';
import { ThemeToggle } from '@/components/common/ThemeToggle';

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
          'fixed inset-y-0 left-0 z-30 flex flex-col bg-white dark:bg-[#030712] border-r border-slate-200 dark:border-white/5 transition-transform duration-300 ease-in-out shadow-xl lg:shadow-none',
          'w-80 lg:static lg:translate-x-0',
          isOpen ? 'translate-x-0' : '-translate-x-full'
        )}
        aria-label="Barre latérale des conversations"
      >
        {/* Header content */}
        <div className="flex h-full flex-col">
          <div className="p-6">
            <div className="flex items-center justify-between mb-8">
              <Logo className="px-1 scale-110 origin-left" showText={false} />
              <button
                onClick={onClose}
                className="lg:hidden rounded-xl p-2 text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/5 transition-all"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* New Chat button */}
            <button
              id="new-chat-btn"
              onClick={handleNew}
              className="group flex w-full items-center justify-center gap-3 rounded-2xl bg-sky-600 px-4 py-3.5 text-sm font-bold text-white shadow-lg shadow-sky-600/20 hover:bg-sky-500 hover:scale-[1.02] active:scale-[0.98] transition-all duration-300"
            >
              <Plus className="h-5 w-5 text-white/80" />
              <span className="font-outfit uppercase tracking-widest text-[11px]">Nouvelle conversation</span>
            </button>
          </div>

          {/* Search */}
          <div className="px-6 pb-4">
            <div className="relative group/search">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 group-focus-within/search:text-sky-500 transition-colors" />
              <input
                type="search"
                placeholder="Rechercher dans l’historique…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full rounded-2xl bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/5 hover:border-slate-300 dark:hover:border-white/10 focus:border-sky-500/40 focus:bg-white dark:focus:bg-white/10 px-11 py-3 text-sm text-slate-900 dark:text-slate-200 placeholder-slate-400 focus:outline-none transition-all"
              />
              {search && (
                <button
                  onClick={() => setSearch('')}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-900 transition-colors"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>
          </div>

          {/* Conversation list */}
          <div className="flex-1 overflow-y-auto px-4 custom-scrollbar">
            <ConversationList
              conversations={filtered}
              activeId={activeConversationId}
              onSelect={handleSelect}
              onDelete={deleteConversation}
              onRename={renameConversation}
            />
          </div>

          {/* theme toggle and user profile at bottom */}
          <div className="mt-auto border-t border-slate-100 dark:border-white/5 p-6 bg-slate-50/50 dark:bg-white/[0.02]">
            <div className="mb-6">
              <ThemeToggle />
            </div>
            <UserProfile />
          </div>
        </div>
      </aside>
    </>
  );
}
