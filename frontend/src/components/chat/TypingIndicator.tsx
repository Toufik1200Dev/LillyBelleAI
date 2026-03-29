import { Logo } from '@/components/common/Logo';

export function TypingIndicator() {
  return (
    <div className="group flex w-full animate-fade-slide justify-center py-6 bg-slate-50/50 dark:bg-white/[0.01] border-y border-slate-100 dark:border-white/[0.02]">
      <div className="flex w-full max-w-3xl items-start gap-4 px-4">
        {/* Avatar */}
        <div className="flex-shrink-0 flex h-8 w-8 items-center justify-center rounded-xl bg-white dark:bg-white/5 text-slate-600 dark:text-sky-400 shadow-sm border border-slate-200 dark:border-white/5 mt-0.5">
          <Logo showText={false} className="scale-[0.4]" />
        </div>

        <div className="flex flex-col">
          <div className="flex items-center gap-1.5 h-8 animate-pulse">
            {[0, 1, 2].map((i) => (
              <span
                key={i}
                className="h-1.5 w-1.5 rounded-full bg-sky-500/60 dark:bg-sky-400/60"
                style={{ animation: 'bounceDot 1.2s ease-in-out infinite', animationDelay: `${i * 0.15}s` }}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
