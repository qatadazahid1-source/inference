/**
 * Team settings React Query hooks (Phase C11).
 *
 * Scope: everything the Team settings page needs —
 *   - `useTeamMembers`     → org members list (Supabase-direct service fn)
 *   - `useTeamInvitations` → pending invitations list (Supabase-direct service fn)
 *   - `useUpdateMemberRole`→ change a member's role
 *   - `useRemoveMember`    → remove a member
 *   - `useCancelInvitation`→ cancel a pending invitation
 *   - `useInviteUsers`     → send invitations (Supabase Edge Function `invite-user`)
 *
 * Design notes:
 * - The organization id + `canEdit` permission come from the C7
 *   `useOrganizationDetail()` hook (GET /api/organization via axiosClient), so
 *   this file does NOT reimplement the inline `authedFetch('/api/organization')`
 *   the component previously used.
 * - The members/invitations reads and the role/remove/cancel writes are valid
 *   Supabase-direct (RLS-guarded) operations and intentionally REMAIN in
 *   `src/services/organizations.ts` / `src/services/team.ts`. Per the Phase 3
 *   rules we do NOT convert these to Axios just for consistency — instead we
 *   wrap them in React Query so the page gets caching, loading/error state, and
 *   targeted invalidation without changing the transport.
 * - `inviteUser` calls the Supabase Edge Function (`/functions/v1/invite-user`)
 *   and is preserved exactly; it is only wrapped as a mutation here.
 * - Query keys come from the centralized `queryKeys.team` factory. All mutations
 *   invalidate `queryKeys.team.all` so the members and invitations lists refresh
 *   after any change.
 * - The service functions return `{ data, error }`. These hooks throw on `error`
 *   so React Query's `isError`/`onError` paths work and the component's
 *   `mutateAsync().catch()` handlers surface a real message.
 */

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { queryKeys } from './queryKeys';
import {
    getOrganizationMembers,
    updateMemberRole,
    removeMember,
} from '../../services/organizations';
import {
    getInvitations,
    inviteUser,
    cancelInvitation,
} from '../../services/team';
import type { Invitation, OrganizationMember } from '../../types/database.types';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/** An organization member enriched with the joined user profile fields. */
export type TeamMember = OrganizationMember & {
    user?: { email: string; full_name: string; avatar_url: string | null };
};

/** Input for sending a single invitation. */
export interface InviteUserInput {
    email: string;
    role: string;
}

/** Result of a bulk invite operation: per-invite outcomes. */
export interface InviteUsersResult {
    sent: number;
    failed: { email: string; error: string }[];
}

// ---------------------------------------------------------------------------
// Queries
// ---------------------------------------------------------------------------

/**
 * Fetch the members of an organization (Supabase-direct via service).
 * Gated on a resolved `orgId` so it doesn't fire before
 * `useOrganizationDetail()` has provided one.
 */
export function useTeamMembers(orgId: string | null | undefined) {
    return useQuery({
        queryKey: queryKeys.team.members(orgId),
        queryFn: async (): Promise<TeamMember[]> => {
            const { data, error } = await getOrganizationMembers(orgId as string);
            if (error) throw new Error(error);
            return data ?? [];
        },
        enabled: !!orgId,
    });
}

/**
 * Fetch the pending invitations for an organization (Supabase-direct via
 * service). Gated on a resolved `orgId`.
 */
export function useTeamInvitations(orgId: string | null | undefined) {
    return useQuery({
        queryKey: queryKeys.team.invitations(orgId),
        queryFn: async (): Promise<Invitation[]> => {
            const { data, error } = await getInvitations(orgId as string);
            if (error) throw new Error(error);
            return data ?? [];
        },
        enabled: !!orgId,
    });
}

// ---------------------------------------------------------------------------
// Mutations
// ---------------------------------------------------------------------------

/**
 * Update a member's role. Invalidates the team domain so the members list
 * reflects the new role.
 */
export function useUpdateMemberRole() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async ({
            memberId,
            role,
        }: {
            memberId: string;
            role: OrganizationMember['role'];
        }): Promise<void> => {
            const { error } = await updateMemberRole(memberId, role);
            if (error) throw new Error(error);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: queryKeys.team.all });
        },
    });
}

/**
 * Remove a member from the organization. Invalidates the team domain so the
 * members list drops the removed row.
 */
export function useRemoveMember() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async (memberId: string): Promise<void> => {
            const { error } = await removeMember(memberId);
            if (error) throw new Error(error);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: queryKeys.team.all });
        },
    });
}

/**
 * Cancel a pending invitation. Invalidates the team domain so the invitations
 * list drops the cancelled row.
 */
export function useCancelInvitation() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async (invitationId: string): Promise<void> => {
            const { error } = await cancelInvitation(invitationId);
            if (error) throw new Error(error);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: queryKeys.team.all });
        },
    });
}

/**
 * Send one or more invitations via the Supabase `invite-user` Edge Function.
 * Runs the invites in parallel, aggregates per-invite failures, and returns a
 * summary rather than throwing on partial failure (the component decides how to
 * surface `failed`). Invalidates the team domain on success so the pending
 * invitations list refreshes.
 */
export function useInviteUsers() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async ({
            orgId,
            invites,
        }: {
            orgId: string;
            invites: InviteUserInput[];
        }): Promise<InviteUsersResult> => {
            const results = await Promise.all(
                invites.map(async (invite) => {
                    const { error } = await inviteUser(
                        orgId,
                        invite.email,
                        invite.role,
                    );
                    return { email: invite.email, error };
                }),
            );

            const failed = results
                .filter((r) => r.error)
                .map((r) => ({ email: r.email, error: r.error as string }));

            return { sent: results.length - failed.length, failed };
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: queryKeys.team.all });
        },
    });
}
