import { useEffect, useState } from 'react';
import clsx from 'clsx';
import { Logo } from '@/components/common/Logo';

const STATUS_PHRASES = [
  'Traitement en cours…',
  'Recherche des documents…',
  'Consultation des métadonnées SharePoint…',
  'Analyse des fichiers pertinents…',
  'Préparation de la réponse…',
] as const;

function SkeletonBar({ className }: { className?: string }) {
  return (
    <div
      className={clsx(
        'h-3.5 rounded-full bg-slate-200/90 dark:bg-white/[0.08] animate-skeleton-shimmer',
        className
      )}
    />
  );
}

export function TypingIndicator() {
  const [phraseIndex, setPhraseIndex] = useState(0);

  useEffect(() => {
    const id = window.setInterval(() => {
      setPhraseIndex((i) => (i + 1) % STATUS_PHRASES.length);
    }, 2800);
    return () => clearInterval(id);
  }, []);

  return (
    <div
      className="group flex w-full animate-fade-slide justify-start px-4 py-2.5 sm:py-3"
      role="status"
      aria-live="polite"
      aria-label={STATUS_PHRASES[phraseIndex]}
    >
      <div className="flex max-w-[85%] items-start gap-4">
        <div className="flex h-10 w-10 flex-shrink-0 items-start justify-center pt-0.5 -translate-x-5">
          <Logo showText={false} plain size="sm" className="!gap-0 scale-[0.52] origin-top" />
        </div>

        <div className="flex min-w-0 flex-col items-start">
          <div className="mb-2 flex items-center gap-2 px-1">
            <span className="font-outfit text-xs font-black uppercase tracking-widest text-slate-500 dark:text-slate-400">
              LillyBelle AI
            </span>
            <SkeletonBar className="h-2.5 w-10 opacity-70" />
          </div>

          <div
            className={clsx(
              'relative w-full min-w-[min(100%,280px)] max-w-lg rounded-[2rem] rounded-tl-none border px-6 py-5',
              'border-slate-200/80 bg-white shadow-xl shadow-slate-200/40 dark:border-white/5 dark:bg-white/[0.03] dark:shadow-none'
            )}
          >
            <p
              key={phraseIndex}
              className="mb-4 font-medium text-sm text-sky-600 dark:text-sky-400/90 animate-fade-slide"
            >
              {STATUS_PHRASES[phraseIndex]}
            </p>

            <div className="flex flex-col gap-3">
              <SkeletonBar className="w-[92%]" />
              <SkeletonBar className="w-[78%]" />
              <SkeletonBar className="w-[64%]" />
              <SkeletonBar className="h-4 w-[55%] rounded-lg bg-sky-200/50 dark:bg-sky-500/15" />
            </div>

            <div className="mt-5 flex items-center gap-1.5 border-t border-slate-100 pt-4 dark:border-white/5">
              {[0, 1, 2].map((i) => (
                <span
                  key={i}
                  className="h-1.5 w-1.5 rounded-full bg-sky-500/50 dark:bg-sky-400/50"
                  style={{
                    animation: 'bounceDot 1.2s ease-in-out infinite',
                    animationDelay: `${i * 0.15}s`,
                  }}
                />
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
