import { Logo } from '@/components/common/Logo';

interface AuthLayoutProps {
  children: React.ReactNode;
  title: string;
  subtitle: string;
}

export function AuthLayout({ children, title, subtitle }: AuthLayoutProps) {
  return (
    <div className="relative flex min-h-screen flex-col items-center justify-center bg-[#0B0F19] overflow-hidden selection:bg-primary-500/30">
      
      {/* Ambient Background Glows */}
      <div className="absolute top-[-10%] left-[-10%] h-[500px] w-[500px] rounded-full bg-primary-600/20 blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] h-[600px] w-[600px] rounded-full bg-blue-600/10 blur-[150px] pointer-events-none" />
      <div className="absolute top-[20%] right-[10%] h-[300px] w-[300px] rounded-full bg-purple-600/15 blur-[100px] pointer-events-none" />

      {/* Grid Pattern Overlay */}
      <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAiIGhlaWdodD0iMjAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGNpcmNsZSBjeD0iMSIgY3k9IjEiIHI9IjEiIGZpbGw9InJnYmEoMjU1LDI1NSwyNTUsMC4wMykiLz48L3N2Zz4=')] [mask-image:linear-gradient(to_bottom,white,transparent)] pointer-events-none" />

      <div className="relative z-10 w-full max-w-[420px] px-6">
        
        {/* Branding Header */}
        <div className="mb-10 flex flex-col items-center text-center">
          <Logo className="mb-8 scale-110" />
          <h1 className="text-3xl font-bold tracking-tight text-white mb-2">{title}</h1>
          <p className="text-sm text-gray-400 font-medium">{subtitle}</p>
        </div>

        {/* Glass Card */}
        <div className="overflow-hidden rounded-3xl border border-white/[0.08] bg-white/[0.02] p-8 backdrop-blur-2xl shadow-[0_0_40px_-10px_rgba(0,0,0,0.5)]">
          {children}
        </div>
        
        {/* Footer */}
        <p className="mt-8 text-center text-xs text-gray-600">
          By continuing, you agree to our Terms of Service and Privacy Policy.
        </p>
      </div>
    </div>
  );
}
