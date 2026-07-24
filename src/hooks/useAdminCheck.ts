import { useState, useEffect } from 'react';
import { useAuth } from './useAuth';
import { supabase } from '../lib/supabase';

export interface AdminCheckResult {
  isPlatformAdmin: boolean;
  isLoading: boolean;
  isUnauthenticated: boolean;
}

/**
 * useAdminCheck
 *
 * Fetches /api/admin/auth/me to determine whether the current user is a
 * platform super-admin. Returns three states to drive AdminRoute:
 *
 *   isLoading        — true while the check is in flight
 *   isUnauthenticated — true when there's no Supabase session (skip API call)
 *                       or when /api/admin/auth/me returns 401
 *   isPlatformAdmin  — true only when the DB confirms is_platform_admin = true
 *
 * The result is NEVER stored in localStorage. It lives only in React state
 * and is re-evaluated whenever the auth session changes.
 */
export function useAdminCheck(): AdminCheckResult {
  const { isAuthenticated, isLoading: authLoading, supabaseUser } = useAuth();

  const [isPlatformAdmin, setIsPlatformAdmin] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isUnauthenticated, setIsUnauthenticated] = useState(false);

  useEffect(() => {
    // Wait for the auth context to finish loading before acting
    if (authLoading) return;

    // If there's no active session, skip the API call entirely
    if (!isAuthenticated || !supabaseUser) {
      setIsUnauthenticated(true);
      setIsLoading(false);
      return;
    }

    let cancelled = false;

    async function checkAdmin() {
      setIsLoading(true);
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) {
          if (!cancelled) {
            setIsUnauthenticated(true);
            setIsLoading(false);
          }
          return;
        }

        const response = await fetch('/api/admin/auth/me', {
          headers: {
            Authorization: `Bearer ${session.access_token}`,
            'Content-Type': 'application/json',
          },
        });

        if (cancelled) return;

        if (response.status === 401) {
          // Not authenticated — e.g. token expired between checks
          setIsUnauthenticated(true);
          setIsPlatformAdmin(false);
        } else if (response.status === 403) {
          // Authenticated but not a platform admin
          setIsUnauthenticated(false);
          setIsPlatformAdmin(false);
        } else if (response.ok) {
          const json = await response.json();
          setIsUnauthenticated(false);
          setIsPlatformAdmin(json?.is_platform_admin === true);
        } else {
          // Unexpected error — treat as non-admin, not unauthenticated
          setIsUnauthenticated(false);
          setIsPlatformAdmin(false);
        }
      } catch {
        if (!cancelled) {
          setIsUnauthenticated(false);
          setIsPlatformAdmin(false);
        }
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    }

    checkAdmin();

    return () => {
      cancelled = true;
    };
  }, [isAuthenticated, authLoading, supabaseUser]);

  return { isPlatformAdmin, isLoading, isUnauthenticated };
}
