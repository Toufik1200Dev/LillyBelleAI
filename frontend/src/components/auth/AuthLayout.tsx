import { Logo } from '@/components/common/Logo';

interface AuthLayoutProps {
  children: React.ReactNode;
  subtitle: string;
  /** Connexion : grand logo seul. Inscription : logo + titre. */
  showBrandHeader?: boolean;
  title?: string;
}

export function AuthLayout({ children, subtitle, showBrandHeader, title }: AuthLayoutProps) {
  return (
    <div className="relative flex min-h-screen flex-col items-center justify-center bg-slate-50 dark:bg-[#030712] overflow-hidden selection:bg-sky-500/30 transition-colors duration-500">
      
      {/* Ambient Background Glows */}
      <div className="absolute top-[-10%] left-[-10%] h-[500px] w-[500px] rounded-full bg-sky-500/10 dark:bg-sky-500/20 blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] h-[600px] w-[600px] rounded-full bg-indigo-500/5 dark:bg-blue-600/10 blur-[150px] pointer-events-none" />
      <div className="absolute top-[20%] right-[10%] h-[300px] w-[300px] rounded-full bg-sky-500/5 dark:bg-purple-600/15 blur-[100px] pointer-events-none" />

      {/* Grid Pattern Overlay */}
      <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAiIGhlaWdodD0iMjAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGNpcmNsZSBjeD0iMSIgY3k9IjEiIHI9IjEiIGZpbGw9InJnYmEoMTUsIDIzLCA0MiwgMC4wMykiLz48L3N2Zz4=')] dark:bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAiIGhlaWdodD0iMjAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGNpcmNsZSBjeD0iMSIgY3k9IjEiIHI9IjEiIGZpbGw9InJnYmEoMjU1LDI1NSwyNTUsMC4wMykiLz48L3N2Zz4=')] [mask-image:linear-gradient(to_bottom,white,transparent)] pointer-events-none" />

      <div className="relative z-10 w-full max-w-[420px] px-6">
        
        {/* Branding Header */}
        <div className="mb-10 flex flex-col items-center text-center">
          {showBrandHeader ? (
            <Logo size="lg" className="mb-4" />
          ) : (
            <>
              <Logo className="mb-8 scale-110" />
              {title ? (
                <h1 className="text-4xl font-bold tracking-tight text-slate-900 dark:text-white mb-2">{title}</h1>
              ) : null}
            </>
          )}
          <p className="text-base text-slate-500 dark:text-slate-400 font-medium">{subtitle}</p>
        </div>

        {/* Glass Card */}
        <div className="overflow-hidden rounded-3xl border border-slate-200 dark:border-white/[0.08] bg-white dark:bg-white/[0.02] p-8 backdrop-blur-2xl shadow-xl shadow-slate-200/50 dark:shadow-[0_0_40px_-10px_rgba(0,0,0,0.5)]">
          {children}
        </div>
        
        {/* Footer */}
        <p className="mt-8 text-center text-xs text-gray-600 dark:text-slate-500">
          En continuant, vous acceptez nos Conditions d&apos;utilisation et notre Politique de confidentialité.
        </p>
      </div>
    </div>
  );
}
