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
    <div className="flex h-screen overflow-hidden bg-gray-950">
      {/* Sidebar */}
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      {/* Main content */}
      <div className="flex flex-1 flex-col overflow-hidden min-w-0 bg-[#0B0F19]">
        {/* Mobile header */}
        <header className="flex items-center justify-between border-b border-white/5 bg-[#0B0F19]/80 backdrop-blur-xl px-4 py-3 lg:hidden z-10 sticky top-0">
          <button
            onClick={() => setSidebarOpen(true)}
            className="rounded-xl p-2 text-gray-400 hover:text-white hover:bg-white/5 transition-colors"
            aria-label="Open sidebar"
          >
            <Menu className="h-5 w-5" />
          </button>

          <Logo showText={false} className="scale-75" />

          <button
            onClick={() => createConversation()}
            className="rounded-xl p-2 text-gray-400 hover:text-white hover:bg-white/5 transition-colors"
            aria-label="New chat"
          >
            <Plus className="h-5 w-5" />
          </button>
        </header>

        {/* Page content */}
        <main className="flex flex-1 flex-col overflow-hidden">
          {children}
        </main>
      </div>
    </div>
  );
}
