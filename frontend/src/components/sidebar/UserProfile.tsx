import { useState } from 'react';
import { LogOut, ChevronUp } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { getErrorMessage } from '@/utils/errorHandler';
import toast from 'react-hot-toast';

export function UserProfile() {
  const { user, logout } = useAuth();
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const handleLogout = async () => {
    try {
      await logout();
      toast.success('Déconnexion réussie');
    } catch (err) {
      toast.error(getErrorMessage(err));
    }
  };

  const initials = user?.full_name
    ? user.full_name.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2)
    : user?.email?.[0]?.toUpperCase() ?? 'U';

  return (
    <div className="relative transition-colors duration-500">
      <button
        onClick={() => setIsMenuOpen((v) => !v)}
        className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-white/5 active:scale-[0.98] transition-all duration-300"
        aria-haspopup="menu"
        aria-expanded={isMenuOpen}
      >
        {/* Avatar */}
        <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-sky-500 to-indigo-600 text-xs font-semibold text-white shadow ring-1 ring-white/20">
          {initials}
        </div>
        <div className="flex-1 min-w-0 text-left">
          <p className="truncate text-sm font-semibold text-slate-900 dark:text-white transition-colors duration-500">
            {user?.full_name ?? user?.email?.split('@')[0]}
          </p>
          <p className="truncate text-[11px] text-slate-500 dark:text-slate-500 font-medium transition-colors duration-500">{user?.email}</p>
        </div>
        <ChevronUp
          className={`h-4 w-4 text-slate-400 transition-transform duration-200 ${isMenuOpen ? '' : 'rotate-180'}`}
        />
      </button>

      {isMenuOpen && (
        <>
          {/* Backdrop */}
          <div className="fixed inset-0 z-10" onClick={() => setIsMenuOpen(false)} />
          {/* Menu */}
          <div className="absolute bottom-full left-0 right-0 mb-2 z-20 rounded-2xl border border-slate-200 dark:border-white/10 bg-white dark:bg-[#0b0f1a] shadow-2xl dark:shadow-black/60 py-1.5 overflow-hidden backdrop-blur-xl transition-all duration-300">
            <div className="px-4 py-3 border-b border-slate-100 dark:border-white/5">
              <p className="text-sm font-semibold text-slate-900 dark:text-white">{user?.full_name ?? 'Utilisateur'}</p>
              <p className="text-[11px] text-slate-500 dark:text-slate-500 font-medium truncate mt-0.5">{user?.email}</p>
            </div>
            <div className="p-1.5">
              <button
                onClick={handleLogout}
                className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-white/[0.06] hover:text-red-500 dark:hover:text-red-400 transition-colors"
              >
                <LogOut className="h-4 w-4" />
                Se déconnecter
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
