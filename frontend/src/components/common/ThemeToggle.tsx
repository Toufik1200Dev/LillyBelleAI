import { Sun, Moon } from 'lucide-react';
import { useTheme } from '@/contexts/ThemeContext';
import clsx from 'clsx';

export function ThemeToggle() {
  const { theme, toggleTheme } = useTheme();

  return (
    <button
      onClick={toggleTheme}
      className={clsx(
        "group relative flex items-center justify-between gap-4 w-full rounded-2xl px-4 py-3.5 transition-all duration-300",
        "bg-slate-100 hover:bg-slate-200 dark:bg-white/5 dark:hover:bg-white/10",
        "border border-slate-200 dark:border-white/5"
      )}
      aria-label="Changer de thème"
    >
      <div className="flex items-center gap-3">
        <div className={clsx(
          "flex h-8 w-8 items-center justify-center rounded-xl transition-all duration-500",
          theme === 'light' ? "bg-white text-orange-500 shadow-sm" : "bg-sky-500/20 text-sky-400"
        )}>
          {theme === 'light' ? <Sun className="h-4.5 w-4.5" /> : <Moon className="h-4.5 w-4.5" />}
        </div>
        <span className="text-[11px] font-bold uppercase tracking-widest text-slate-600 dark:text-slate-400 font-outfit">
          {theme === 'light' ? 'Mode clair' : 'Mode sombre'}
        </span>
      </div>
      
      {/* Small toggle indicator */}
      <div className="relative h-5 w-9 rounded-full bg-slate-200 dark:bg-white/10 p-1 flex items-center">
        <div className={clsx(
          "h-3 w-3 rounded-full bg-slate-400 dark:bg-sky-500 transition-all duration-300 transform",
          theme === 'light' ? "translate-x-0" : "translate-x-4"
        )} />
      </div>
    </button>
  );
}
