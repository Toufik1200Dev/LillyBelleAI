import { useState } from 'react';
import { Menu, Plus } from 'lucide-react';
import { Sidebar } from '@/components/sidebar/Sidebar';
import { useChat } from '@/hooks/useChat';
import { Logo } from '@/components/common/Logo';

interface AppLayoutProps {
  children: React.ReactNode;
}

export function AppLayout({ children }: AppLayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { createConversation } = useChat();

  return (
    <div className="relative flex h-screen w-full bg-slate-50 dark:bg-[#030712] text-slate-900 dark:text-white overflow-hidden font-inter selection:bg-sky-500/20 transition-colors duration-500">
      {/* Global Mesh Background */}
      <div className="bg-mesh">
        <div className="mesh-gradient mesh-1 opacity-10 dark:opacity-20" />
        <div className="mesh-gradient mesh-2 opacity-10 dark:opacity-20" />
        <div className="mesh-gradient mesh-3 opacity-5 dark:opacity-10" />
      </div>

      {/* Sidebar */}
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      {/* Main content */}
      <div className="flex flex-1 flex-col overflow-hidden min-w-0 bg-transparent">
        {/* Mobile header */}
        <header className="flex items-center justify-between border-b border-slate-200 dark:border-white/5 bg-white/80 dark:bg-slate-900/80 backdrop-blur-3xl px-4 py-2.5 lg:hidden z-10 sticky top-0 shadow-sm transition-colors duration-500">
          <button
            onClick={() => setSidebarOpen(true)}
            className="rounded-xl p-2 text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/5 transition-all"
            aria-label="Ouvrir la barre latérale"
          >
            <Menu className="h-5 w-5" />
          </button>

          <Logo showText={false} className="scale-75" />

          <button
            onClick={() => createConversation()}
            className="rounded-xl p-2 text-sky-600 dark:text-sky-400 hover:text-white hover:bg-sky-500 transition-all shadow-lg shadow-sky-500/10 dark:shadow-sky-500/5"
            aria-label="Nouvelle conversation"
          >
            <Plus className="h-5 w-5" />
          </button>
        </header>

        {/* Page content */}
        <main className="flex flex-1 flex-col overflow-hidden relative z-0">
          {children}
        </main>
      </div>
    </div>
  );
}
