/**
 * Admin identity ("am I a platform admin?") React Query hook (Phase 3, C14).
 *
 * Scope: drives `AdminRoute` via the `useAdminCheck` wrapper —
 *   - `useAdminMe` → GET /api/admin/auth/me
 *
 * Design notes:
 * - Access goes through `adminService.getAdminMe()` on the shared `axiosClient`,
 *   so the Supabase token is attached at request time and failures are
 *   normalized into an `ApiError`. Crucially this preserves the 401-vs-403
 *   distinction that `AdminRoute` depends on:
 *     • 401 (`ApiError.isUnauthenticated`) → treat as unauthenticated
 *       (AdminRoute redirects to /auth/signin)
 *     • 403 (`ApiError.isForbidden`)       → authenticated but NOT a platform
 *       admin (AdminRoute redirects to /403) — NOT a login failure
 *     • any other error                    → non-admin, not unauthenticated
 * - The result is NEVER stored in localStorage; React Query keeps it in memory
 *   only, keyed by `queryKeys.admin.auth.me()`, and re-evaluates on cache
 *   invalidation / auth changes (via the `enabled` gate in `useAdminCheck`).
 */

import { useQuery } from '@tanstack/react-query';
import { ApiError } from '../../../lib/axios';
import { adminService } from '../../../api/services/admin.service';
import { queryKeys } from '../queryKeys';

/** Normalized admin-identity result derived from GET /api/admin/auth/me. */
export interface AdminMeResult {
    isPlatformAdmin: boolean;
    isUnauthenticated: boolean;
}

/**
 * Fetch and normalize the current user's platform-admin status.
 *
 * The query function converts the raw backend response / `ApiError` into the
 * `{ isPlatformAdmin, isUnauthenticated }` shape so the mapping to
 * `AdminRoute`'s three-state contract lives in exactly one place. It never
 * throws for the "forbidden" (403) case, because that is an expected,
 * non-admin outcome rather than a query failure.
 *
 * @param enabled  Gate on the auth context being ready + a session existing.
 */
export function useAdminMe(enabled: boolean = true) {
    return useQuery<AdminMeResult>({
        queryKey: queryKeys.admin.auth.me(),
        queryFn: async (): Promise<AdminMeResult> => {
            try {
                const me = await adminService.getAdminMe();
                return {
                    isPlatformAdmin: me?.is_platform_admin === true,
                    isUnauthenticated: false,
                };
            } catch (err) {
                if (err instanceof ApiError) {
                    if (err.isUnauthenticated) {
                        // 401 — token missing/expired: treat as unauthenticated.
                        return { isPlatformAdmin: false, isUnauthenticated: true };
                    }
                    if (err.isForbidden) {
                        // 403 — authenticated but not a platform admin.
                        return { isPlatformAdmin: false, isUnauthenticated: false };
                    }
                }
                // Any other error → non-admin, not unauthenticated.
                return { isPlatformAdmin: false, isUnauthenticated: false };
            }
        },
        enabled,
        // Identity rarely changes within a session; avoid noisy refetching but
        // still let invalidation / remount re-evaluate it.
        staleTime: 60_000,
    });
}
