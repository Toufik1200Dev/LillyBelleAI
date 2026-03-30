import { useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { isValidEmail, isValidPassword } from '@/utils/validators';
import { getErrorMessage } from '@/utils/errorHandler';
import { Eye, EyeOff, LogIn } from 'lucide-react';
import { Spinner } from '@/components/common/Spinner';

interface LoginFormProps {
  onSwitchToSignup: () => void;
}

export function LoginForm({ onSwitchToSignup }: LoginFormProps) {
  const { login } = useAuth();
  const [email, setEmail] = useState(import.meta.env.DEV ? 'test@example.com' : '');
  const [password, setPassword] = useState(import.meta.env.DEV ? 'password123' : '');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!isValidEmail(email)) return setError('Veuillez saisir une adresse e-mail valide.');
    const pwdCheck = isValidPassword(password);
    if (!pwdCheck.valid) return setError(pwdCheck.message!);

    setIsLoading(true);
    try {
      await login({ email, password });
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div>
        <label htmlFor="login-email" className="block text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-gray-400 mb-2">
          Adresse e-mail
        </label>
        <input
          id="login-email"
          type="email"
          autoComplete="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="name@company.com"
          required
          className="w-full rounded-2xl bg-slate-100/80 dark:bg-white/[0.03] border border-slate-200/80 dark:border-white/10 px-4 py-3 text-sm text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-gray-500 focus:bg-white dark:focus:bg-white/[0.05] focus:border-sky-500 dark:focus:border-sky-500/50 focus:outline-none focus:ring-4 focus:ring-sky-500/15 transition-all font-medium backdrop-blur-sm"
        />
      </div>

      <div>
        <label htmlFor="login-password" className="block text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-gray-400 mb-2">
          Mot de passe
        </label>
        <div className="relative">
          <input
            id="login-password"
            type={showPassword ? 'text' : 'password'}
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••"
            required
            className="w-full rounded-2xl bg-slate-100/80 dark:bg-white/[0.03] border border-slate-200/80 dark:border-white/10 px-4 py-3 pr-11 text-sm text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-gray-500 focus:bg-white dark:focus:bg-white/[0.05] focus:border-sky-500 dark:focus:border-sky-500/50 focus:outline-none focus:ring-4 focus:ring-sky-500/15 transition-all font-medium backdrop-blur-sm"
          />
          <button
            type="button"
            onClick={() => setShowPassword((v) => !v)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:text-gray-500 dark:hover:text-gray-300 transition-colors"
            aria-label={showPassword ? 'Masquer le mot de passe' : 'Afficher le mot de passe'}
          >
            {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </button>
        </div>
      </div>

      {error && (
        <div className="rounded-xl bg-red-500/10 border border-red-500/20 px-4 py-3 text-sm text-red-400 flex items-center gap-2">
          <svg viewBox="0 0 24 24" fill="none" className="h-4 w-4 flex-shrink-0" stroke="currentColor" strokeWidth={2}>
            <circle cx="12" cy="12" r="10"/><path d="M12 8v4M12 16h.01"/>
          </svg>
          {error}
        </div>
      )}

      <button
        type="submit"
        disabled={isLoading}
        className="group relative flex w-full items-center justify-center gap-2 rounded-xl bg-sky-600 dark:bg-white text-white dark:text-gray-950 px-6 py-3 text-sm font-bold shadow-lg shadow-sky-600/20 dark:shadow-[0_0_20px_rgba(255,255,255,0.1)] hover:bg-sky-500 dark:hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed transition-all focus:outline-none focus:ring-4 focus:ring-sky-500/20 dark:focus:ring-white/20 active:scale-[0.98]"
      >
        {isLoading ? <Spinner size="sm" /> : <LogIn className="h-4 w-4 transition-transform group-hover:-translate-x-0.5" />}
        {isLoading ? 'Connexion…' : 'Se connecter à l’espace de travail'}
      </button>

      <p className="text-center text-sm text-slate-500 dark:text-gray-400 mt-6">
        Pas encore de compte ?{' '}
        <button
          type="button"
          onClick={onSwitchToSignup}
          className="font-bold text-sky-600 dark:text-white hover:text-sky-500 dark:hover:text-sky-400 transition-colors"
        >
          Demander l’accès
        </button>
      </p>
    </form>
  );
}
