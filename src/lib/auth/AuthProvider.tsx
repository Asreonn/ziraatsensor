import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import type { Session, User } from '@supabase/supabase-js';
import { isSupabaseConfigured, supabase } from '@/lib/supabase/client';

interface Credentials {
  email: string;
  password: string;
}

interface AuthContextValue {
  configured: boolean;
  loading: boolean;
  user: User | null;
  session: Session | null;
  signIn: (credentials: Credentials) => Promise<void>;
  signUp: (credentials: Credentials) => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [loading, setLoading] = useState(isSupabaseConfigured);
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    if (!supabase) {
      setLoading(false);
      return;
    }

    let mounted = true;

    supabase.auth.getSession().then(({ data, error }) => {
      if (!mounted) return;
      if (error) {
        setLoading(false);
        return;
      }

      setSession(data.session);
      setUser(data.session?.user ?? null);
      setLoading(false);
    });

    const { data: listener } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession);
      setUser(nextSession?.user ?? null);
      setLoading(false);
    });

    return () => {
      mounted = false;
      listener.subscription.unsubscribe();
    };
  }, []);

  const value = useMemo<AuthContextValue>(() => ({
    configured: isSupabaseConfigured,
    loading,
    user,
    session,
    async signIn({ email, password }) {
      if (!supabase) throw new Error('Supabase is not configured.');
      const normalizedEmail = email.trim().toLowerCase();
      const { error } = await supabase.auth.signInWithPassword({ email: normalizedEmail, password });
      if (error) throw error;
    },
    async signUp({ email, password }) {
      if (!supabase) throw new Error('Supabase is not configured.');
      const normalizedEmail = email.trim().toLowerCase();

      const { data, error } = await supabase.functions.invoke('register-user', {
        body: {
          email: normalizedEmail,
          password,
        },
      });

      if (error) {
        throw error;
      }

      if (data?.error) {
        throw new Error(data.error);
      }

      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: normalizedEmail,
        password,
      });

      if (signInError) throw signInError;
    },
    async signOut() {
      if (!supabase) return;
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
    },
  }), [loading, session, user]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
