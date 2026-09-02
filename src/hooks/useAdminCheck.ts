import { useAuth } from './useAuth';
import { useAdminMe } from './queries/admin/useAdminAuth';

export interface AdminCheckResult {
  isPlatformAdmin: boolean;
  isLoading: boolean;
  isUnauthenticated: boolean;
}

/**
 * useAdminCheck
 *
 * Determines whether the current user is a platform super-admin by querying
 * GET /api/admin/auth/me (via the `useAdminMe` React Query hook, which runs on
 * the shared `axiosClient`). Returns three states to drive AdminRoute:
 *
 *   isLoading        — true while the auth context or the admin check is in flight
 *   isUnauthenticated — true when there's no Supabase session (the query is
 *                       gated off) or when /api/admin/auth/me returns 401
 *   isPlatformAdmin  — true only when the DB confirms is_platform_admin = true
 *
 * Behavior preserved from the previous inline-fetch implementation:
 * - The 401-vs-403 distinction is honored: a 403 means "authenticated but not
 *   a platform admin" (NOT unauthenticated); a 401 means unauthenticated. This
 *   mapping lives in `useAdminMe` (via `ApiError.isForbidden` /
 *   `ApiError.isUnauthenticated`).
 * - The result is NEVER stored in localStorage. React Query keeps it in memory
 *   only and re-evaluates whenever the auth session changes (the query is
 *   gated on `isAuthenticated && !!supabaseUser`).
 */
export function useAdminCheck(): AdminCheckResult {
  const { isAuthenticated, isLoading: authLoading, supabaseUser } = useAuth();

  // Only hit /api/admin/auth/me once auth has settled AND a session exists.
  const enabled = !authLoading && isAuthenticated && !!supabaseUser;

  const { data, isLoading: queryLoading, isFetching } = useAdminMe(enabled);

  // No session → unauthenticated, and we're done loading (query is disabled).
  if (!authLoading && (!isAuthenticated || !supabaseUser)) {
    return { isPlatformAdmin: false, isLoading: false, isUnauthenticated: true };
  }

  // Auth still resolving, or the enabled query hasn't produced data yet.
  const isLoading = authLoading || (enabled && (queryLoading || (!data && isFetching)));

  return {
    isPlatformAdmin: data?.isPlatformAdmin ?? false,
    isLoading,
    isUnauthenticated: data?.isUnauthenticated ?? false,
  };
}
