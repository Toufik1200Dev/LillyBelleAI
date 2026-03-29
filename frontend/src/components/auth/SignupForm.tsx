import { useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { isValidEmail, isValidPassword } from '@/utils/validators';
import { getErrorMessage } from '@/utils/errorHandler';
import { Eye, EyeOff, UserPlus } from 'lucide-react';
import { Spinner } from '@/components/common/Spinner';

interface SignupFormProps {
  onSwitchToLogin: () => void;
}

export function SignupForm({ onSwitchToLogin }: SignupFormProps) {
  const { signup } = useAuth();
  const [fullName, setFullName] = useState(import.meta.env.DEV ? 'Test User' : '');
  const [email, setEmail] = useState(import.meta.env.DEV ? 'test@example.com' : '');
  const [password, setPassword] = useState(import.meta.env.DEV ? 'password123' : '');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!fullName.trim()) return setError('Veuillez saisir votre nom complet.');
    if (!isValidEmail(email)) return setError('Veuillez saisir une adresse e-mail valide.');
    const pwdCheck = isValidPassword(password);
    if (!pwdCheck.valid) return setError(pwdCheck.message!);

    setIsLoading(true);
    try {
      await signup({ email, password, full_name: fullName.trim() });
      setSuccess(true);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setIsLoading(false);
    }
  }

  if (success) {
    return (
      <div className="rounded-2xl border border-slate-200 dark:border-white/10 bg-white dark:bg-white/[0.02] p-8 text-center backdrop-blur-xl">
        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-green-500/10 dark:bg-green-500/20 text-green-600 dark:text-green-400 ring-1 ring-green-200 dark:ring-green-500/30">
          <svg viewBox="0 0 24 24" fill="none" className="h-6 w-6" stroke="currentColor" strokeWidth={2}>
            <path d="M5 13l4 4L19 7" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </div>
        <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-2">Vérifiez votre boîte mail</h3>
        <p className="text-sm text-slate-500 dark:text-gray-400 leading-relaxed">
          Nous avons envoyé un lien de vérification à <br/>
          <strong className="text-slate-900 dark:text-white font-medium">{email}</strong>
        </p>
        <button
          onClick={onSwitchToLogin}
          className="mt-8 rounded-lg bg-slate-100 dark:bg-white/5 px-4 py-2 text-sm font-semibold text-slate-900 dark:text-white ring-1 ring-slate-200 dark:ring-white/10 hover:bg-slate-200 dark:hover:bg-white/10 transition-colors"
        >
          Retour à la connexion
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label htmlFor="signup-name" className="block text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-gray-400 mb-2">
          Nom complet
        </label>
        <input
          id="signup-name"
          type="text"
          autoComplete="name"
          value={fullName}
          onChange={(e) => setFullName(e.target.value)}
          placeholder="Marie Dupont"
          required
          className="w-full rounded-xl bg-slate-100 dark:bg-white/[0.03] border border-slate-200 dark:border-white/10 px-4 py-3 text-sm text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-gray-500 focus:bg-white dark:focus:bg-white/[0.05] focus:border-sky-500 dark:focus:border-sky-500/50 focus:outline-none focus:ring-4 focus:ring-sky-500/10 transition-all font-semibold"
        />
      </div>

      <div>
        <label htmlFor="signup-email" className="block text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-gray-400 mb-2">
          Adresse e-mail
        </label>
        <input
          id="signup-email"
          type="email"
          autoComplete="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="name@company.com"
          required
          className="w-full rounded-xl bg-slate-100 dark:bg-white/[0.03] border border-slate-200 dark:border-white/10 px-4 py-3 text-sm text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-gray-500 focus:bg-white dark:focus:bg-white/[0.05] focus:border-sky-500 dark:focus:border-sky-500/50 focus:outline-none focus:ring-4 focus:ring-sky-500/10 transition-all font-semibold"
        />
      </div>

      <div>
        <div className="flex justify-between items-end mb-2">
          <label htmlFor="signup-password" className="block text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-gray-400">
            Mot de passe
          </label>
          <span className="text-[10px] text-slate-400 dark:text-gray-500 font-medium tracking-wide uppercase">8 car. min.</span>
        </div>
        <div className="relative">
          <input
            id="signup-password"
            type={showPassword ? 'text' : 'password'}
            autoComplete="new-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••"
            required
            className="w-full rounded-xl bg-slate-100 dark:bg-white/[0.03] border border-slate-200 dark:border-white/10 px-4 py-3 pr-11 text-sm text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-gray-500 focus:bg-white dark:focus:bg-white/[0.05] focus:border-sky-500 dark:focus:border-sky-500/50 focus:outline-none focus:ring-4 focus:ring-sky-500/10 transition-all font-semibold"
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
        <div className="rounded-xl bg-red-500/10 border border-red-500/20 px-4 py-3 text-sm text-red-400 flex items-center gap-2 mt-2">
          <svg viewBox="0 0 24 24" fill="none" className="h-4 w-4 flex-shrink-0" stroke="currentColor" strokeWidth={2}>
            <circle cx="12" cy="12" r="10"/><path d="M12 8v4M12 16h.01"/>
          </svg>
          {error}
        </div>
      )}

      <button
        type="submit"
        disabled={isLoading}
        className="group relative flex w-full items-center justify-center gap-2 rounded-xl bg-sky-600 dark:bg-white text-white dark:text-gray-950 px-6 py-3 mt-4 text-sm font-bold shadow-lg shadow-sky-600/20 dark:shadow-[0_0_20px_rgba(255,255,255,0.1)] hover:bg-sky-500 dark:hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed transition-all focus:outline-none focus:ring-4 focus:ring-sky-500/20 dark:focus:ring-white/20 active:scale-[0.98]"
      >
        {isLoading ? <Spinner size="sm" /> : <UserPlus className="h-4 w-4 transition-transform group-hover:scale-110" />}
        {isLoading ? 'Création du compte…' : 'Créer un compte espace de travail'}
      </button>

      <p className="text-center text-sm text-slate-500 dark:text-gray-400 mt-6">
        Vous avez déjà un accès ?{' '}
        <button
          type="button"
          onClick={onSwitchToLogin}
          className="font-bold text-sky-600 dark:text-white hover:text-sky-500 dark:hover:text-sky-400 transition-colors"
        >
          Se connecter
        </button>
      </p>
    </form>
  );
}
