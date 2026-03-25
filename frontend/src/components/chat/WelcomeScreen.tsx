import { BookOpen, Shield, Zap } from 'lucide-react';
import { Logo } from '@/components/common/Logo';

interface WelcomeScreenProps {
  onSuggestionClick: (text: string) => void;
}

const SUGGESTIONS = [
  "What is the company's vacation policy?",
  'How do I submit an expense report?',
  'What are the IT security guidelines?',
  'Where can I find the onboarding checklist?',
];

export function WelcomeScreen({ onSuggestionClick }: WelcomeScreenProps) {
  return (
    <div className="flex flex-1 flex-col items-center justify-center px-6 py-12 animate-fade-slide">
      {/* Header Container */}
      <div className="relative mb-12 flex flex-col items-center">
        {/* Ambient Glow */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 h-40 w-40 rounded-full bg-primary-500/20 blur-[60px] animate-glow-pulse" />
        
        <Logo className="scale-150 mb-8" showText={false} />

        <h2 className="mb-3 text-4xl font-extrabold tracking-tight text-white text-center">
          How can LillyBelle help you?
        </h2>
        <p className="max-w-md text-center text-lg font-medium text-gray-500 leading-relaxed italic">
          "Expert knowledge at your fingertips."
        </p>
      </div>

      {/* Suggestion Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-2xl w-full">
        {SUGGESTIONS.map((suggestion) => (
          <button
            key={suggestion}
            onClick={() => onSuggestionClick(suggestion)}
            className="flex flex-col gap-1 rounded-2xl border border-white/5 bg-white/[0.03] px-5 py-4 text-left hover:bg-white/[0.06] hover:border-white/10 transition-all duration-200 group relative overflow-hidden"
          >
            <div className="absolute inset-0 bg-gradient-to-br from-primary-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
            <p className="text-sm font-semibold text-gray-200 group-hover:text-white transition-colors relative z-10">
              {suggestion}
            </p>
            <p className="text-xs text-gray-500 group-hover:text-gray-400 transition-colors relative z-10">
              Instant document search
            </p>
          </button>
        ))}
      </div>

      {/* Footer Features */}
      <div className="mt-16 flex flex-wrap items-center justify-center gap-x-8 gap-y-4 text-xs font-semibold uppercase tracking-widest text-gray-600">
        <div className="flex items-center gap-2">
          <BookOpen className="h-3.5 w-3.5" />
          SharePoint Integrated
        </div>
        <div className="flex items-center gap-2">
          <Shield className="h-3.5 w-3.5" />
          Enterprise Secure
        </div>
        <div className="flex items-center gap-2">
          <Zap className="h-3.5 w-3.5" />
          Zero Hallucination
        </div>
      </div>
    </div>
  );
}
