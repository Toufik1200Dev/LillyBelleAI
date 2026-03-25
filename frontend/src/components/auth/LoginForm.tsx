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

    if (!isValidEmail(email)) return setError('Please enter a valid email address.');
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
        <label htmlFor="login-email" className="block text-xs font-semibold uppercase tracking-wider text-gray-400 mb-2">
          Email Address
        </label>
        <input
          id="login-email"
          type="email"
          autoComplete="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="name@company.com"
          required
          className="w-full rounded-xl bg-white/[0.03] border border-white/10 px-4 py-3 text-sm text-white placeholder-gray-500 focus:bg-white/[0.05] focus:border-primary-500/50 focus:outline-none focus:ring-4 focus:ring-primary-500/10 transition-all"
        />
      </div>

      <div>
        <label htmlFor="login-password" className="block text-xs font-semibold uppercase tracking-wider text-gray-400 mb-2">
          Password
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
            className="w-full rounded-xl bg-white/[0.03] border border-white/10 px-4 py-3 pr-11 text-sm text-white placeholder-gray-500 focus:bg-white/[0.05] focus:border-primary-500/50 focus:outline-none focus:ring-4 focus:ring-primary-500/10 transition-all"
          />
          <button
            type="button"
            onClick={() => setShowPassword((v) => !v)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300 transition-colors"
            aria-label={showPassword ? 'Hide password' : 'Show password'}
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
        className="group relative flex w-full items-center justify-center gap-2 rounded-xl bg-white text-gray-950 px-6 py-3 text-sm font-bold shadow-[0_0_20px_rgba(255,255,255,0.1)] hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed transition-all focus:outline-none focus:ring-4 focus:ring-white/20 active:scale-[0.98]"
      >
        {isLoading ? <Spinner size="sm" /> : <LogIn className="h-4 w-4 transition-transform group-hover:-translate-x-0.5" />}
        {isLoading ? 'Signing in...' : 'Sign in to workspace'}
      </button>

      <p className="text-center text-sm text-gray-400 mt-6">
        Don't have an account?{' '}
        <button
          type="button"
          onClick={onSwitchToSignup}
          className="font-semibold text-white hover:text-primary-400 transition-colors"
        >
          Request access
        </button>
      </p>
    </form>
  );
}
