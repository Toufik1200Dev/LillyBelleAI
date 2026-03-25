import { Logo } from '@/components/common/Logo';

export function EmptyState() {
  return (
    <div className="flex flex-1 flex-col items-center justify-center py-20 px-4 text-center animate-fade-slide">
      <div className="mb-6">
        <Logo showText={false} className="scale-125 opacity-20" />
      </div>
      <h3 className="text-xl font-bold tracking-tight text-white mb-2">How can LillyBelle help you?</h3>
      <p className="text-sm font-medium text-gray-400 max-w-sm leading-relaxed">
        Ask questions and get precise answers powered by LillyBelle AI and your secure documents.
      </p>
    </div>
  );
}
