import clsx from 'clsx';
import logoImg from '@/components/imgs/image.png';

interface LogoProps {
  className?: string;
  showText?: boolean;
  size?: 'sm' | 'md' | 'lg';
  /** No hover glow — use in compact chat avatars */
  plain?: boolean;
}

export function Logo({ className, showText = true, size = 'md', plain = false }: LogoProps) {
  const textSizes = {
    sm: 'text-lg',
    md: 'text-xl',
    lg: 'text-4xl'
  };

  const imgSizes = {
    sm: 'h-8',
    md: 'h-12',
    lg: 'h-16'
  };

  return (
    <div className={clsx('flex items-center gap-4 transition-colors duration-500', className)}>
      <div className={clsx('relative flex-shrink-0', !plain && 'group/logo')}>
        {!plain && (
          <div className="absolute inset-[-10px] bg-sky-500/10 blur-2xl rounded-full opacity-0 group-hover/logo:opacity-100 transition-opacity duration-500" />
        )}
        <img
          src={logoImg}
          alt="LillyBelle AI"
          className={clsx(
            'relative w-auto transition-transform duration-300',
            !plain && 'drop-shadow-[0_10px_20px_rgba(0,0,0,0.1)] group-hover/logo:scale-105',
            imgSizes[size]
          )}
        />
      </div>

      {showText && (
        <div className="flex flex-col leading-none">
          <span className={clsx(
            'font-black tracking-tighter text-slate-900 dark:text-white font-outfit transition-colors duration-500',
            textSizes[size]
          )}>
            LillyBelle <span className="text-sky-600">AI</span>
          </span>
        </div>
      )}
    </div>
  );
}
