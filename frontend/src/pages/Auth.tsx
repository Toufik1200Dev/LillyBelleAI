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
      showBrandHeader={mode === 'login'}
      title={mode === 'signup' ? 'Créer un compte' : undefined}
      subtitle={
        mode === 'login'
          ? 'Connectez-vous à LillyBelle AI'
          : 'Commencez avec LillyBelle'
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
