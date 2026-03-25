import clsx from 'clsx';
import logoImg from '@/components/imgs/image.png';

interface LogoProps {
  className?: string;
  showText?: boolean;
}

export function Logo({ className, showText = true }: LogoProps) {
  return (
    <div className={clsx('flex items-center gap-3', className)}>
      <div className="relative flex-shrink-0">
        {/* Animated Background Glow */}
        <div className="absolute inset-x-0 top-1/2 -translate-y-1/2 h-10 w-full bg-primary-500/25 blur-3xl rounded-full animate-glow-pulse" />
        
        {/* Official PNG Logo */}
        <img
          src={logoImg}
          alt="LillyBelle Logo"
          className="relative h-14 w-auto drop-shadow-2xl"
        />
      </div>

      {showText && false && (
        <div className="flex flex-col leading-tight">
          <div className="flex items-baseline gap-0.5">
            <span className="text-xl font-extrabold tracking-tighter text-white">
              lillybelle
            </span>
            <span className="h-1.5 w-1.5 rounded-full bg-primary-500" />
          </div>
          <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-gray-500">
            networks for all
          </span>
        </div>
      )}
    </div>
  );
}
