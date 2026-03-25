import { useState } from 'react';
import { AuthLayout } from '@/components/auth/AuthLayout';
import { LoginForm } from '@/components/auth/LoginForm';
import { SignupForm } from '@/components/auth/SignupForm';

import { Navigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';

export function Auth() {
  const [mode, setMode] = useState<'login' | 'signup'>('login');
  const { user } = useAuth();

  if (user) {
    return <Navigate to="/" replace />;
  }

  return (
    <AuthLayout
      title={mode === 'login' ? 'Welcome back' : 'Create account'}
      subtitle={
        mode === 'login'
          ? 'Sign in to LillyBelle AI'
          : 'Start your journey with LillyBelle'
      }
    >
      {mode === 'login' ? (
        <LoginForm onSwitchToSignup={() => setMode('signup')} />
      ) : (
        <SignupForm onSwitchToLogin={() => setMode('login')} />
      )}
    </AuthLayout>
  );
}
