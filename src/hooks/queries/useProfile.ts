/**
 * Profile server-state hooks (Phase 3 — C8).
 *
 * Scope: the authenticated REST profile flows exposed by the backend at
 * `/api/profile`:
 *   - GET    /api/profile              → full profile ({ user, organization, role, plan, usage })
 *   - PATCH  /api/profile              → update whitelisted user fields
 *   - POST   /api/profile/change-email → trigger Supabase Auth email-change verification
 *   - DELETE /api/profile              → delete the authenticated account
 *
 * Design:
 *   - All calls go through the shared authenticated `axiosClient`, which
 *     attaches the Supabase session token at request time. Tokens are never
 *     stored, cached, or logged here.
 *   - The backend wraps every successful response in a `{ data: ... }`
 *     envelope; hooks unwrap `data?.data` so consumers read the inner shape.
 *   - Mutations invalidate `queryKeys.profile.all` on success so the profile
 *     query refetches the source-of-truth server state.
 *
 * NOT in scope (intentionally left as valid Supabase-direct):
 *   - Avatar upload — handled by `uploadAvatar()` in `src/services/users.ts`,
 *     which uploads to Supabase Storage (`user-content` bucket). That must NOT
 *     be migrated to Axios; it is a legitimate Storage operation.
 */

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { axiosClient } from '../../lib/axios';
import { queryKeys } from './queryKeys';

export interface ProfileUser {
    id?: string;
    email?: string;
    full_name?: string | null;
    job_title?: string | null;
    phone_number?: string | null;
    timezone?: string | null;
    language?: string | null;
    avatar_url?: string | null;
    [key: string]: unknown;
}

export interface ProfileData {
    user: ProfileUser;
    organization?: Record<string, unknown> | null;
    role?: string | null;
    plan?: Record<string, unknown> | null;
    usage?: {
        currentPeriodCost: number;
        requestCount: number;
        periodStart: string | null;
        periodEnd: string | null;
    } | null;
}

export interface UpdateProfileInput {
    full_name?: string;
    job_title?: string;
    phone_number?: string;
    timezone?: string;
    language?: string;
}

export interface ChangeEmailResult {
    success: boolean;
    message?: string;
}

/**
 * GET /api/profile — the authenticated user's full profile.
 */
export function useProfile(enabled: boolean = true) {
    return useQuery({
        queryKey: queryKeys.profile.detail(),
        queryFn: async (): Promise<ProfileData> => {
            const { data } = await axiosClient.get<{ data?: ProfileData }>('/api/profile');
            return data?.data ?? { user: {} };
        },
        enabled,
    });
}

/**
 * PATCH /api/profile — update whitelisted editable user fields.
 */
export function useUpdateProfile() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async (input: UpdateProfileInput): Promise<ProfileUser> => {
            const { data } = await axiosClient.patch<{ data?: ProfileUser }>('/api/profile', input);
            return data?.data ?? {};
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: queryKeys.profile.all });
        },
    });
}

/**
 * POST /api/profile/change-email — sends a verification email to the new
 * address. The email is not changed until the user confirms it.
 */
export function useChangeEmail() {
    return useMutation({
        mutationFn: async (newEmail: string): Promise<ChangeEmailResult> => {
            const { data } = await axiosClient.post<{ data?: ChangeEmailResult }>(
                '/api/profile/change-email',
                { newEmail },
            );
            return data?.data ?? { success: false };
        },
    });
}

/**
 * DELETE /api/profile — permanently deletes the authenticated account.
 * Caller is responsible for signing out afterward.
 */
export function useDeleteAccount() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async (): Promise<void> => {
            await axiosClient.delete('/api/profile');
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: queryKeys.profile.all });
        },
    });
}
