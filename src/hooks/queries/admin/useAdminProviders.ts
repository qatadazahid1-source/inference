/**
 * Admin AI Providers React Query hooks (Phase 3, C14).
 *
 * Scope: the platform-admin "AI Providers" page (`AdminProviders.tsx`) —
 *   - `useAdminProviders`    → GET    /api/admin/providers
 *   - `useCreateProvider`    → POST   /api/admin/providers
 *   - `useUpdateProvider`    → PUT    /api/admin/providers/:id
 *   - `useDeleteProvider`    → DELETE /api/admin/providers/:id
 *
 * Design notes:
 * - All backend access goes through `adminService`, which is itself built on
 *   the shared `axiosClient`. Auth (Supabase token attached at request time)
 *   and error normalization (`ApiError`; 401 `unauthenticated` vs 403
 *   `forbidden`) come from Phase A for free. These hooks never call
 *   `supabase.auth.getSession()` directly and never redirect — replacing the
 *   component's previous inline `fetch()` + manual `Authorization: Bearer`
 *   plumbing.
 * - A 403 from `/api/admin/*` is a genuine "forbidden" (not a login failure);
 *   it surfaces as `ApiError.isForbidden` and is NOT converted into a redirect.
 * - Query keys come from the centralized `queryKeys` factory:
 *     • providers list → `queryKeys.admin.providers.lists()`
 * - Mutation invalidation mapping:
 *     • create / update / delete provider → invalidate
 *       `queryKeys.admin.providers.all` so the list reflects the change.
 */

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { adminService } from '../../../api/services/admin.service';
import type { ProviderData, ProviderInput } from '../../../api/services/admin.service';
import { queryKeys } from '../queryKeys';

// ---------------------------------------------------------------------------
// Queries
// ---------------------------------------------------------------------------

/**
 * Fetch the list of global AI providers.
 *
 * @param enabled  Gate on auth/admin being ready. Defaults to `true`.
 */
export function useAdminProviders(enabled: boolean = true) {
    return useQuery({
        queryKey: queryKeys.admin.providers.lists(),
        queryFn: (): Promise<ProviderData[]> => adminService.getProviders(),
        enabled,
    });
}

// ---------------------------------------------------------------------------
// Mutations
// ---------------------------------------------------------------------------

/** Create a new AI provider. Invalidates the providers domain on success. */
export function useCreateProvider() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (payload: ProviderInput): Promise<ProviderData> =>
            adminService.createProvider(payload),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: queryKeys.admin.providers.all });
        },
    });
}

/** Update an existing AI provider. Invalidates the providers domain on success. */
export function useUpdateProvider() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: ({
            id,
            payload,
        }: {
            id: string;
            payload: ProviderInput;
        }): Promise<ProviderData> => adminService.updateProvider(id, payload),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: queryKeys.admin.providers.all });
        },
    });
}

/** Delete an AI provider. Invalidates the providers domain on success. */
export function useDeleteProvider() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (id: string): Promise<void> => adminService.deleteProvider(id),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: queryKeys.admin.providers.all });
        },
    });
}
