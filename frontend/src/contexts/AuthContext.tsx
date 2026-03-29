import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import type { User, AuthState, LoginCredentials, SignupCredentials } from '@/types/auth';
import { supabase } from '@/services/supabase';
import { getErrorMessage } from '@/utils/errorHandler';

interface AuthContextValue extends AuthState {
  login: (credentials: LoginCredentials) => Promise<void>;
  signup: (credentials: SignupCredentials) => Promise<void>;
  logout: () => Promise<void>;
  updateProfile: (updates: Partial<Pick<User, 'full_name'>>) => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<AuthState>({
    user: null,
    isLoading: true,
    isAuthenticated: false,
  });

  const setUser = useCallback((user: User | null) => {
    setState({ user, isLoading: false, isAuthenticated: !!user });
  }, []);

  useEffect(() => {
    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        fetchProfile(session.user.id).catch(() => setUser(null));
      } else {
        setUser(null);
      }
    });

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        fetchProfile(session.user.id).catch(() => setUser(null));
      } else {
        setUser(null);
      }
    });

    return () => subscription.unsubscribe();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  async function fetchProfile(userId: string): Promise<void> {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .maybeSingle();

    if (error) {
      console.error('Error fetching profile:', error);
      setUser(null);
      return;
    }

    // If no profile exists, create a basic one or just use session data
    if (!data) {
      const { data: sessionData } = await supabase.auth.getSession();
      const user = sessionData.session?.user;
      
      if (user) {
        const newProfile = {
          id: user.id,
          email: user.email || '',
          full_name: user.user_metadata?.full_name || user.email?.split('@')[0] || 'Utilisateur',
        };
        
        await supabase.from('profiles').upsert(newProfile);
        setUser(newProfile as User);
      } else {
        setUser(null);
      }
      return;
    }

    setUser(data as User);
  }

  async function login({ email, password }: LoginCredentials): Promise<void> {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw new Error(getErrorMessage(error));
  }

  async function signup({ email, password, full_name }: SignupCredentials): Promise<void> {
    const { data, error } = await supabase.auth.signUp({ email, password });
    if (error) throw new Error(getErrorMessage(error));

    if (data.user) {
      await supabase.from('profiles').upsert({
        id: data.user.id,
        email,
        full_name,
      });
    }
  }

  async function logout(): Promise<void> {
    const { error } = await supabase.auth.signOut();
    if (error) throw new Error(getErrorMessage(error));
  }

  async function updateProfile(updates: Partial<Pick<User, 'full_name'>>): Promise<void> {
    if (!state.user) return;
    const { error } = await supabase
      .from('profiles')
      .update(updates)
      .eq('id', state.user.id);
    if (error) throw new Error(getErrorMessage(error));
    setState((prev) => ({ ...prev, user: prev.user ? { ...prev.user, ...updates } : null }));
  }

  return (
    <AuthContext.Provider value={{ ...state, login, signup, logout, updateProfile }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuthContext(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuthContext doit être utilisé dans un AuthProvider');
  return ctx;
}
