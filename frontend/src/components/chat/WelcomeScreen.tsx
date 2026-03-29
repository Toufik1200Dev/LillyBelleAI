import { BookOpen, Shield, Zap } from 'lucide-react';
import { Logo } from '@/components/common/Logo';
import { useAuthContext } from '@/contexts/AuthContext';

export function WelcomeScreen() {
  const { user } = useAuthContext();
  const firstName = user?.full_name?.split(' ')[0]?.trim();

  return (
    <div className="flex flex-1 flex-col items-center justify-center px-4 sm:px-6 py-8 sm:py-12 animate-fade-slide relative overflow-hidden">
      <div className="relative mb-10 sm:mb-14 flex flex-col items-center text-center">
        <Logo className="mb-8 sm:mb-10 scale-110 sm:scale-125" showText={false} />

        <h2 className="mb-4 text-4xl lg:text-5xl font-extrabold tracking-tight text-slate-900 dark:text-white font-outfit">
          Bonjour
          {firstName ? (
            <>
              {' '}
              <span className="text-sky-600 dark:text-sky-400">{firstName}</span>,
            </>
          ) : (
            ','
          )}
          <span className="block mt-2">je suis l&apos;assistant IA LillyBelle.</span>
        </h2>
        <p className="max-w-md text-base lg:text-lg font-medium text-slate-500 dark:text-slate-400 leading-relaxed font-inter">
          Comment pouvons-nous vous aider ?
        </p>
      </div>

      <div className="mt-20 flex flex-wrap items-center justify-center gap-x-12 gap-y-4 text-[11px] font-bold uppercase tracking-[0.3em] text-slate-400 dark:text-slate-500 font-outfit">
        <div className="flex items-center gap-3 hover:text-slate-600 dark:hover:text-slate-300 transition-colors cursor-default">
          <BookOpen className="h-4 w-4 text-sky-500" />
          Base de connaissances
        </div>
        <div className="flex items-center gap-3 hover:text-slate-600 dark:hover:text-slate-300 transition-colors cursor-default">
          <Shield className="h-4 w-4 text-sky-500" />
          Niveau entreprise
        </div>
        <div className="flex items-center gap-3 hover:text-slate-600 dark:hover:text-slate-300 transition-colors cursor-default">
          <Zap className="h-4 w-4 text-sky-500" />
          Accès direct
        </div>
      </div>
    </div>
  );
}
