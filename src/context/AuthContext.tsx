import { createContext, useState, useEffect, useCallback, type ReactNode } from 'react';
import type { User } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';

export interface AppUser {
  id: string
  email: string
  full_name: string
  avatar_url: string | null
  firstName?: string
  jobTitle?: string
  phone?: string
  timezone?: string
  language?: string
  onboarding_completed: boolean
}

export interface AuthContextType {
  isAuthenticated: boolean
  user: AppUser | null
  supabaseUser: User | null
  isLoading: boolean
  error: string | null
  signOut: () => Promise<void>
  clearError: () => void
}

export const AuthContext = createContext<AuthContextType | null>(null);

function mapUser(sbUser: User): AppUser {
  return {
    id: sbUser.id,
    email: sbUser.email ?? '',
    full_name: sbUser.user_metadata?.full_name ?? sbUser.user_metadata?.name ?? '',
    avatar_url: sbUser.user_metadata?.avatar_url ?? sbUser.user_metadata?.picture ?? null,
    firstName: sbUser.user_metadata?.given_name ?? '',
    jobTitle: sbUser.user_metadata?.job_title ?? '',
    phone: sbUser.user_metadata?.phone_number ?? '',
    timezone: sbUser.user_metadata?.timezone ?? 'UTC',
    language: sbUser.user_metadata?.language ?? 'en',
    onboarding_completed: sbUser.user_metadata?.onboarding_completed ?? false,
  };
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [supabaseUser, setSupabaseUser] = useState<User | null>(null);
  const [onboardingCompleted, setOnboardingCompleted] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadOnboardingStatus = useCallback(async (sbUser: User) => {
    // `onboarding_progress.completed_at` is the source of truth (set in
    // Onboarding.tsx, row created by the handle_new_auth_user trigger at
    // signup). user_metadata is kept as a fallback only, since it can lag
    // behind right after updateUser() + a full page reload.
    const { data, error: dbError } = await supabase
      .from('onboarding_progress')
      .select('completed_at, skipped_at')
      .eq('user_id', sbUser.id)
      .single();

    if (dbError || !data) {
      setOnboardingCompleted(sbUser.user_metadata?.onboarding_completed ?? false);
    } else {
      setOnboardingCompleted(!!data.completed_at || !!data.skipped_at);
    }
  }, []);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSupabaseUser(session?.user ?? null);
      if (session?.user) {
        loadOnboardingStatus(session.user).finally(() => setIsLoading(false));
      } else {
        setIsLoading(false);
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSupabaseUser(session?.user ?? null);
      if (session?.user) {
        loadOnboardingStatus(session.user).finally(() => setIsLoading(false));
      } else {
        setIsLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, [loadOnboardingStatus]);

  const signOut = useCallback(async () => {
    await supabase.auth.signOut();
  }, []);

  const clearError = useCallback(() => setError(null), []);

  const user = supabaseUser ? { ...mapUser(supabaseUser), onboarding_completed: onboardingCompleted } : null;

  return (
    <AuthContext.Provider value={{ isAuthenticated: !!supabaseUser, user, supabaseUser, isLoading, error, signOut, clearError }}>
      {children}
    </AuthContext.Provider>
  );
}
