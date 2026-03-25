export function TypingIndicator() {
  return (
    <div className="group flex w-full animate-fade-slide justify-center py-6 bg-[#161B22]/50 border-y border-white/[0.02]">
      <div className="flex w-full max-w-3xl items-start gap-4 px-4">
        {/* Avatar */}
        <div className="flex-shrink-0 flex h-8 w-8 items-center justify-center rounded-xl bg-gradient-to-br from-gray-800 to-gray-900 text-white shadow-sm ring-1 ring-white/10 mt-0.5">
          <svg viewBox="0 0 24 24" fill="none" className="h-4 w-4 text-white" stroke="currentColor" strokeWidth={2.5}>
            <path d="M12 2v20M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </div>

        <div className="flex flex-col">
          <div className="flex items-center gap-1.5 h-6 animate-pulse">
            {[0, 1, 2].map((i) => (
              <span
                key={i}
                className="h-1.5 w-1.5 rounded-full bg-primary-400/60"
                style={{ animation: 'bounceDot 1.2s ease-in-out infinite', animationDelay: `${i * 0.15}s` }}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
