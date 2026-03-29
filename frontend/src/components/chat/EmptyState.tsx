import { Logo } from '@/components/common/Logo';

export function EmptyState() {
  return (
    <div className="flex flex-1 flex-col items-center justify-center py-20 px-4 text-center animate-fade-slide">
      <div className="mb-6">
        <Logo showText={false} className="scale-125 opacity-20" />
      </div>
      <h3 className="text-xl font-bold tracking-tight text-slate-900 dark:text-white mb-2">Comment pouvons-nous vous aider ?</h3>
      <p className="text-base font-medium text-slate-500 dark:text-slate-400 max-w-sm leading-relaxed">
        Posez vos questions et obtenez des réponses précises grâce à LillyBelle AI et vos documents sécurisés.
      </p>
    </div>
  );
}
