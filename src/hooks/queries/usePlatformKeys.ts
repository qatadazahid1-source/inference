/**
 * Integrations / Platform Keys React Query hooks (Phase C4).
 *
 * Scope: everything the Integrations page needs from the authenticated
 * backend REST API —
 *   - `useAiProviders`        → GET    /api/api-keys/providers
 *   - `useIntegrations`       → GET    /api/api-keys
 *   - `useCreateIntegration`  → POST   /api/api-keys
 *   - `useUpdateIntegration`  → PUT    /api/api-keys/:id
 *   - `useDisconnectIntegration` → DELETE /api/api-keys/:id
 *   - `usePlatformKeys`       → GET    /api/platform-keys[?integration_id=]
 *   - `useCreatePlatformKey`  → POST   /api/platform-keys
 *   - `useRevokePlatformKey`  → DELETE /api/platform-keys/:id
 *
 * Design notes:
 * - Every backend call goes through the shared `axiosClient`, so auth
 *   (Supabase token attached at request time by the request interceptor) and
 *   error normalization (`ApiError`, 401 `unauthenticated` vs 403 `forbidden`)
 *   come from Phase A for free. These hooks never call
 *   `supabase.auth.getSession()` directly and never redirect — replacing the
 *   component's previous raw `fetch()` + manual `Authorization: Bearer` plumbing.
 * - Query keys come from the centralized `queryKeys` factory:
 *     • integrations list → `queryKeys.platformKeys.list()` (invalidate via `.all`)
 *     • ai providers      → `queryKeys.platformKeys.providers()`
 *     • per-integration
 *       platform keys      → `queryKeys.platformKeys.list(integrationId)`
 * - Mutation invalidation mapping:
 *     • create / update / disconnect integration → invalidate `platformKeys.all`
 *       (the integration list AND its active-key counts change)
 *     • create / revoke platform key             → invalidate `platformKeys.all`
 *       (per-integration key list AND the card's active-key count badge change)
 * - SECURITY: the plain platform key is only ever present in the create
 *   response and is returned to the caller for a one-time reveal. It is NEVER
 *   logged, cached in a query, or persisted here.
 * - Provider color fallback / the static 'custom' provider are UI concerns and
 *   are intentionally left in the component (Phase 4).
 */

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { axiosClient } from '../../lib/axios';
import { queryKeys } from './queryKeys';
import type { PlatformKeyData } from '../../api/services/dashboard.service';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/** An AI provider as returned by the backend providers catalog. */
export interface AiProvider {
    id: string;
    name: string;
    color?: string;
    [key: string]: unknown;
}

/** A connected integration, normalized for the UI. */
export interface ConnectedIntegration {
    id: string;
    provider: string;
    displayName: string;
    status: string;
    lastSync: string;
    totalCost: number;
    activePlatformKeys: number;
}

/** Payload for creating a new integration (API key connection). */
export interface CreateIntegrationInput {
    provider?: string;
    display_name: string;
    api_key: string;
    metadata?: { base_url: string };
}

/** Payload for updating an existing integration. `api_key` optional. */
export interface UpdateIntegrationInput {
    id: string;
    display_name: string;
    api_key?: string;
}

// ---------------------------------------------------------------------------
// Queries
// ---------------------------------------------------------------------------

/**
 * Fetch the AI provider catalog. The backend returns `{ data: [...] }`; each
 * provider's `provider_id` is mapped to `id` for the UI's connect/available
 * logic (mirroring the old component mapping).
 *
 * @param enabled  Gate on auth being ready. Defaults to `true`.
 */
export function useAiProviders(enabled: boolean = true) {
    return useQuery({
        queryKey: queryKeys.platformKeys.providers(),
        queryFn: async (): Promise<AiProvider[]> => {
            const { data } = await axiosClient.get<{ data?: any[] }>('/api/api-keys/providers');
            const providers = data?.data ?? [];
            return providers.map((p: any) => ({ ...p, id: p.provider_id }));
        },
        enabled,
    });
}

/**
 * Fetch the authenticated org's connected integrations, normalized to the
 * shape the Integrations UI consumes.
 *
 * @param enabled  Gate on auth being ready. Defaults to `true`.
 */
export function useIntegrations(enabled: boolean = true) {
    return useQuery({
        queryKey: queryKeys.platformKeys.list(),
        queryFn: async (): Promise<ConnectedIntegration[]> => {
            const { data } = await axiosClient.get<{ data?: any[] }>('/api/api-keys');
            const items = data?.data ?? [];
            return items.map((item: any) => ({
                id: item.id,
                provider: item.provider,
                displayName: item.display_name,
                status: item.status,
                lastSync: item.last_sync_at
                    ? new Date(item.last_sync_at).toLocaleDateString()
                    : 'Never',
                totalCost: 0,
                activePlatformKeys: item.active_platform_keys ?? 0,
            }));
        },
        enabled,
    });
}

/**
 * Fetch the platform keys tied to one integration. Listing only ever returns
 * `keyPreview`, never the real key. On-demand (enabled only while the "Manage
 * Keys" modal is open for a given integration).
 *
 * @param integrationId  The integration to list keys for; when `undefined`
 *                       the query is disabled.
 */
export function usePlatformKeys(integrationId: string | undefined) {
    return useQuery({
        queryKey: queryKeys.platformKeys.list(integrationId),
        queryFn: async (): Promise<PlatformKeyData[]> => {
            const url = integrationId
                ? `/api/platform-keys?integration_id=${integrationId}`
                : '/api/platform-keys';
            const { data } = await axiosClient.get<PlatformKeyData[]>(url);
            return data ?? [];
        },
        enabled: !!integrationId,
    });
}

// ---------------------------------------------------------------------------
// Integration mutations
// ---------------------------------------------------------------------------

/**
 * Connect a new integration (POST /api/api-keys). `organization_id` is
 * resolved server-side. Invalidates the integration list on success.
 */
export function useCreateIntegration() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (payload: CreateIntegrationInput): Promise<void> => {
            await axiosClient.post('/api/api-keys', payload);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: queryKeys.platformKeys.all });
        },
    });
}

/**
 * Update an existing integration (PUT /api/api-keys/:id). Only sends `api_key`
 * when the user typed a new one; leaving it out keeps the existing encrypted
 * key untouched. Invalidates the integration list on success.
 */
export function useUpdateIntegration() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async ({ id, ...body }: UpdateIntegrationInput): Promise<void> => {
            await axiosClient.put(`/api/api-keys/${id}`, body);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: queryKeys.platformKeys.all });
        },
    });
}

/**
 * Disconnect an integration (DELETE /api/api-keys/:id). This also revokes any
 * platform keys linked to it server-side, so the full `platformKeys` domain is
 * invalidated on success.
 */
export function useDisconnectIntegration() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (integrationId: string): Promise<void> => {
            await axiosClient.delete(`/api/api-keys/${integrationId}`);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: queryKeys.platformKeys.all });
        },
    });
}

// ---------------------------------------------------------------------------
// Platform-key mutations
// ---------------------------------------------------------------------------

/**
 * Generate a platform key for one integration (POST /api/platform-keys).
 *
 * SECURITY: the returned `plainKey` is present in THIS response only — the
 * caller shows it once and must not retrieve it again. It is never logged or
 * cached here. Invalidates `platformKeys.all` so both the per-integration key
 * list and the integration card's active-key count refresh.
 */
export function useCreatePlatformKey() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async ({
            integrationId,
            name,
        }: {
            integrationId: string;
            name: string;
        }): Promise<PlatformKeyData & { plainKey: string }> => {
            const { data } = await axiosClient.post<PlatformKeyData & { plainKey: string }>(
                '/api/platform-keys',
                { integration_id: integrationId, name },
            );
            return data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: queryKeys.platformKeys.all });
        },
    });
}

/**
 * Revoke a platform key (DELETE /api/platform-keys/:id). Invalidates
 * `platformKeys.all` so the key list and active-key counts refresh.
 */
export function useRevokePlatformKey() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (keyId: string): Promise<void> => {
            await axiosClient.delete(`/api/platform-keys/${keyId}`);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: queryKeys.platformKeys.all });
        },
    });
}
