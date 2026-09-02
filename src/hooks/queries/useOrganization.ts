/**
 * Organization Settings React Query hooks (Phase C7).
 *
 * Scope: everything the Organization settings page needs from the
 * authenticated backend REST API —
 *   - `useOrganizationDetail`   → GET   /api/organization
 *   - `useUpdateOrganization`   → PATCH /api/organization
 *   - `useUpdateOrganizationLogo` → POST /api/organization/logo
 *
 * Design notes:
 * - Every backend call goes through the shared `axiosClient`, so auth
 *   (Supabase token attached at request time by the request interceptor) and
 *   error normalization (`ApiError`, 401 `unauthenticated` vs 403 `forbidden`)
 *   come from Phase A for free. These hooks never call
 *   `supabase.auth.getSession()` directly and never redirect — replacing the
 *   component's previous inline `authedFetch()` + manual `Authorization: Bearer`
 *   plumbing.
 * - Query keys come from the centralized `queryKeys` factory:
 *     • org detail → `queryKeys.organization.detail()` (invalidate via `.all`)
 * - Mutation invalidation mapping:
 *     • update org / update logo → invalidate `organization.all`
 *       (the detail query reflects the new name/branding/logo immediately)
 * - The backend wraps its payload in a `{ data }` envelope. GET returns the
 *   org row plus derived `currentUserRole` and `canEdit`; these hooks unwrap
 *   and return the inner object so the component reads `data.name`,
 *   `data.canEdit`, etc. directly (mirroring the old component contract).
 * - NOTE: The company-logo file upload itself is a valid Supabase-direct
 *   Storage operation and intentionally stays in the component
 *   (`supabase.storage.from('user-content')...`). Only the REST persistence of
 *   the resolved public URL (POST /api/organization/logo) is migrated here.
 */

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { axiosClient } from '../../lib/axios';
import { queryKeys } from './queryKeys';
import type { SystemLimits } from '../../context/EntitlementsContext';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/**
 * The organization detail payload as returned (unwrapped) from
 * GET /api/organization. Includes the raw org columns plus derived
 * access fields. Extra columns are permitted via the index signature so the
 * hook does not need to be updated for every backend field addition.
 */
export interface OrganizationDetail {
    id?: string;
    name?: string;
    industry?: string;
    company_size?: string;
    website?: string;
    primary_color?: string;
    logo_url?: string | null;
    currentUserRole?: string;
    canEdit?: boolean;
    [key: string]: unknown;
}

/**
 * Structured billing address stored on the organization row (jsonb). Used by
 * the Billing settings page; kept here because it is persisted via
 * PATCH /api/organization alongside `tax_id`.
 */
export interface BillingAddress {
    legalName?: string;
    street?: string;
    city?: string;
    state?: string;
    zip?: string;
    country?: string;
}

/** Editable organization fields accepted by PATCH /api/organization. */
export interface UpdateOrganizationInput {
    name?: string;
    industry?: string;
    company_size?: string;
    website?: string;
    country?: string;
    logo_url?: string;
    primary_color?: string;
    billing_email?: string;
    tax_id?: string;
    billing_address?: BillingAddress;
}

// ---------------------------------------------------------------------------
// Queries
// ---------------------------------------------------------------------------

/**
 * Fetch the authenticated user's organization detail. The backend returns
 * `{ data: { ...org, currentUserRole, canEdit } }`; this hook unwraps and
 * returns the inner object.
 *
 * @param enabled  Gate on auth being ready. Defaults to `true`.
 */
export function useOrganizationDetail(enabled: boolean = true) {
    return useQuery({
        queryKey: queryKeys.organization.detail(),
        queryFn: async (): Promise<OrganizationDetail> => {
            const { data } = await axiosClient.get<{ data?: OrganizationDetail }>(
                '/api/organization',
            );
            return data?.data ?? {};
        },
        enabled,
    });
}

/**
 * Fetch the authenticated organization's entitlements (plan limits, feature
 * flags, usage thresholds, rate limits and model-access tier) from
 * GET /api/organization/entitlements.
 *
 * The backend wraps the payload in a `{ data }` envelope; this hook unwraps
 * and returns the raw (possibly partial) `SystemLimits` shape. Deep-merging
 * over safe fallbacks is intentionally left to the consumer
 * (`EntitlementsProvider`) so the zero-access fallback policy lives in one
 * place. Returns `{}` when the backend sends no `data`.
 *
 * Auth + 401/403 normalization come from `axiosClient` (Phase A); this hook
 * never calls `supabase.auth.getSession()` and never redirects.
 *
 * @param enabled  Gate on auth being ready. Defaults to `true`.
 */
export function useEntitlementsQuery(enabled: boolean = true) {
    return useQuery({
        queryKey: queryKeys.organization.entitlements(),
        queryFn: async (): Promise<Partial<SystemLimits>> => {
            const { data } = await axiosClient.get<{ data?: Partial<SystemLimits> }>(
                '/api/organization/entitlements',
            );
            return data?.data ?? {};
        },
        enabled,
    });
}

// ---------------------------------------------------------------------------
// Mutations
// ---------------------------------------------------------------------------

/**
 * Update editable organization fields (owner/admin only server-side).
 * Invalidates the organization domain on success so the detail query
 * reflects the saved values.
 */
export function useUpdateOrganization() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async (
            input: UpdateOrganizationInput,
        ): Promise<OrganizationDetail> => {
            const { data } = await axiosClient.patch<{ data?: OrganizationDetail }>(
                '/api/organization',
                input,
            );
            return data?.data ?? {};
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: queryKeys.organization.all });
        },
    });
}

/**
 * Persist a new organization logo URL (owner/admin only server-side). The
 * caller is responsible for the Supabase Storage upload that produces the
 * public URL (valid Supabase-direct); this only records it via the REST API.
 * Invalidates the organization domain on success.
 */
export function useUpdateOrganizationLogo() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async (logoUrl: string): Promise<OrganizationDetail> => {
            const { data } = await axiosClient.post<{ data?: OrganizationDetail }>(
                '/api/organization/logo',
                { logo_url: logoUrl },
            );
            return data?.data ?? {};
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: queryKeys.organization.all });
        },
    });
}
