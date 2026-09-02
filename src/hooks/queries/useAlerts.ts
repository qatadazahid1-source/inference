/**
 * Alerts React Query hooks (Phase C1).
 *
 * Scope: everything the Alerts page needs —
 *   - `useAlerts`           → GET  /api/alerts
 *   - `useAlertRules`       → GET  /api/alert-rules
 *   - `useMarkAlertRead`    → PUT  /api/alerts/:id/read
 *   - `useDismissAlert`     → DELETE /api/alerts/:id
 *   - `useCreateAlertRule`  → POST /api/alert-rules
 *   - `useUpdateAlertRule`  → PUT  /api/alert-rules/:id
 *   - `useToggleAlertRule`  → PUT  /api/alert-rules/:id  { enabled }
 *   - `useDeleteAlertRule`  → DELETE /api/alert-rules/:id
 *   - `useCheckAlertRules`  → POST /api/alert-rules/check
 *
 * Design notes:
 * - Every backend call goes through the shared `axiosClient`, so auth
 *   (Supabase token attached at request time by the request interceptor) and
 *   error normalization (`ApiError`, 401 `unauthenticated` vs 403 `forbidden`)
 *   come from Phase A for free. These hooks never call
 *   `supabase.auth.getSession()` directly and never redirect.
 * - Query keys come from the centralized `queryKeys` factory:
 *     • alert list      → `queryKeys.alerts.lists()`  (invalidate via `.all`)
 *     • alert-rule list → `queryKeys.alertRules.lists()` (invalidate via `.all`)
 * - Mutation invalidation mapping:
 *     • mark-read / dismiss           → invalidate `alerts`
 *     • create / update / toggle /
 *       delete rule                   → invalidate `alertRules`
 *     • check rules (evaluates rules, may create alerts + bump
 *       last_triggered_at)           → invalidate BOTH `alerts` and `alertRules`
 * - Optimistic UX parity: the previous component did immediate, fire-and-forget
 *   optimistic updates with revert-on-failure for mark-read, dismiss and
 *   toggle. That behavior is reproduced here via `onMutate` (cancel + snapshot
 *   + cache patch), `onError` (rollback to snapshot) and `onSettled`
 *   (invalidate to reconcile with the server). Callers fire these without
 *   awaiting, preserving the intentional non-blocking behavior.
 * - Realtime is NOT handled here. The Alerts page keeps its Supabase Realtime
 *   subscription; on a change it invalidates `queryKeys.alerts.all` so React
 *   Query refetches. No polling (`refetchInterval`) is configured — realtime
 *   drives freshness, avoiding aggressive background requests.
 * - `DashboardService` and its `fetchWithAuth` are intentionally left intact;
 *   these hooks are additive and mirror only the request/transform shape the
 *   service already used.
 */

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { axiosClient } from '../../lib/axios';
import { queryKeys } from './queryKeys';
import type { AlertData, AlertRuleData } from '../../api/services/dashboard.service';

/** Payload accepted when creating an alert rule (mirrors DashboardService). */
export interface CreateAlertRuleInput {
    name: string;
    condition: string;
    threshold: number;
    scope?: string;
    channels?: string[];
    enabled?: boolean;
}

/** Partial payload accepted when updating an alert rule. */
export type UpdateAlertRuleInput = Partial<{
    name: string;
    condition: string;
    threshold: number;
    scope: string;
    channels: string[];
    enabled: boolean;
}>;

/** Result shape returned by the on-demand rule evaluation endpoint. */
export interface CheckAlertRulesResult {
    checked: number;
    triggered: number;
}

// ---------------------------------------------------------------------------
// Queries
// ---------------------------------------------------------------------------

/**
 * Fetch the authenticated org's alerts. Freshness is driven by the Alerts
 * page's Supabase Realtime subscription (which invalidates this key), not by
 * polling.
 *
 * @param enabled  Gate the query on auth being ready (mirrors the old
 *                 `if (!user?.id) return;` guard). Defaults to `true`.
 */
export function useAlerts(enabled: boolean = true) {
    return useQuery({
        queryKey: queryKeys.alerts.lists(),
        queryFn: async (): Promise<AlertData[]> => {
            const { data } = await axiosClient.get<AlertData[]>('/api/alerts');
            return data ?? [];
        },
        enabled,
    });
}

/**
 * Fetch the authenticated org's alert rules.
 *
 * @param enabled  Gate the query on auth being ready. Defaults to `true`.
 */
export function useAlertRules(enabled: boolean = true) {
    return useQuery({
        queryKey: queryKeys.alertRules.lists(),
        queryFn: async (): Promise<AlertRuleData[]> => {
            const { data } = await axiosClient.get<AlertRuleData[]>('/api/alert-rules');
            return data ?? [];
        },
        enabled,
    });
}

// ---------------------------------------------------------------------------
// Alert mutations (optimistic, fire-and-forget parity)
// ---------------------------------------------------------------------------

/**
 * Mark a single alert as read. Optimistically flips `isRead` in the cached
 * list, reverts on failure, and reconciles with the server on settle.
 */
export function useMarkAlertRead() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (alertId: string): Promise<AlertData> => {
            const { data } = await axiosClient.put<AlertData>(`/api/alerts/${alertId}/read`);
            return data;
        },
        onMutate: async (alertId: string) => {
            await queryClient.cancelQueries({ queryKey: queryKeys.alerts.all });
            const previous = queryClient.getQueryData<AlertData[]>(queryKeys.alerts.lists());
            queryClient.setQueryData<AlertData[]>(queryKeys.alerts.lists(), (old) =>
                (old ?? []).map((a) => (a.id === alertId ? { ...a, isRead: true } : a)),
            );
            return { previous };
        },
        onError: (_err, _alertId, context) => {
            if (context?.previous) {
                queryClient.setQueryData(queryKeys.alerts.lists(), context.previous);
            }
        },
        onSettled: () => {
            queryClient.invalidateQueries({ queryKey: queryKeys.alerts.all });
        },
    });
}

/**
 * Dismiss (delete) a single alert. Optimistically removes it from the cached
 * list, restores it on failure, and reconciles with the server on settle.
 */
export function useDismissAlert() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (alertId: string): Promise<void> => {
            await axiosClient.delete(`/api/alerts/${alertId}`);
        },
        onMutate: async (alertId: string) => {
            await queryClient.cancelQueries({ queryKey: queryKeys.alerts.all });
            const previous = queryClient.getQueryData<AlertData[]>(queryKeys.alerts.lists());
            queryClient.setQueryData<AlertData[]>(queryKeys.alerts.lists(), (old) =>
                (old ?? []).filter((a) => a.id !== alertId),
            );
            return { previous };
        },
        onError: (_err, _alertId, context) => {
            if (context?.previous) {
                queryClient.setQueryData(queryKeys.alerts.lists(), context.previous);
            }
        },
        onSettled: () => {
            queryClient.invalidateQueries({ queryKey: queryKeys.alerts.all });
        },
    });
}

// ---------------------------------------------------------------------------
// Alert-rule mutations
// ---------------------------------------------------------------------------

/**
 * Toggle an alert rule's enabled state. Optimistically flips `enabled` in the
 * cached list, reverts on failure, and reconciles on settle.
 */
export function useToggleAlertRule() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async ({
            ruleId,
            enabled,
        }: {
            ruleId: string;
            enabled: boolean;
        }): Promise<AlertRuleData> => {
            const { data } = await axiosClient.put<AlertRuleData>(
                `/api/alert-rules/${ruleId}`,
                { enabled },
            );
            return data;
        },
        onMutate: async ({ ruleId, enabled }) => {
            await queryClient.cancelQueries({ queryKey: queryKeys.alertRules.all });
            const previous = queryClient.getQueryData<AlertRuleData[]>(
                queryKeys.alertRules.lists(),
            );
            queryClient.setQueryData<AlertRuleData[]>(queryKeys.alertRules.lists(), (old) =>
                (old ?? []).map((r) => (r.id === ruleId ? { ...r, enabled } : r)),
            );
            return { previous };
        },
        onError: (_err, _vars, context) => {
            if (context?.previous) {
                queryClient.setQueryData(queryKeys.alertRules.lists(), context.previous);
            }
        },
        onSettled: () => {
            queryClient.invalidateQueries({ queryKey: queryKeys.alertRules.all });
        },
    });
}

/**
 * Create a new alert rule. Invalidates the rule list on success so the new
 * rule appears.
 */
export function useCreateAlertRule() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (rule: CreateAlertRuleInput): Promise<AlertRuleData> => {
            const { data } = await axiosClient.post<AlertRuleData>('/api/alert-rules', rule);
            return data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: queryKeys.alertRules.all });
        },
    });
}

/**
 * Update an existing alert rule (partial). Invalidates the rule list on
 * success.
 */
export function useUpdateAlertRule() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async ({
            ruleId,
            rule,
        }: {
            ruleId: string;
            rule: UpdateAlertRuleInput;
        }): Promise<AlertRuleData> => {
            const { data } = await axiosClient.put<AlertRuleData>(
                `/api/alert-rules/${ruleId}`,
                rule,
            );
            return data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: queryKeys.alertRules.all });
        },
    });
}

/**
 * Delete an alert rule. Optimistically removes it from the cached list (a full
 * snapshot is kept so ordering is restored on failure), reverts on error, and
 * reconciles with the server on settle. Callers can still `await` the mutation
 * (via `mutateAsync`) to decide whether to close a confirmation dialog.
 */
export function useDeleteAlertRule() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (ruleId: string): Promise<void> => {
            await axiosClient.delete(`/api/alert-rules/${ruleId}`);
        },
        onMutate: async (ruleId: string) => {
            await queryClient.cancelQueries({ queryKey: queryKeys.alertRules.all });
            const previous = queryClient.getQueryData<AlertRuleData[]>(
                queryKeys.alertRules.lists(),
            );
            queryClient.setQueryData<AlertRuleData[]>(queryKeys.alertRules.lists(), (old) =>
                (old ?? []).filter((r) => r.id !== ruleId),
            );
            return { previous };
        },
        onError: (_err, _ruleId, context) => {
            if (context?.previous) {
                queryClient.setQueryData(queryKeys.alertRules.lists(), context.previous);
            }
        },
        onSettled: () => {
            queryClient.invalidateQueries({ queryKey: queryKeys.alertRules.all });
        },
    });
}

/**
 * Trigger on-demand evaluation of all active rules for the org. Called once
 * when the Alerts page mounts (there is no background scheduler). A run can
 * create new alerts and bump `last_triggered_at`, so both the alerts and
 * alert-rules lists are invalidated on settle.
 */
export function useCheckAlertRules() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (): Promise<CheckAlertRulesResult> => {
            const { data } = await axiosClient.post<CheckAlertRulesResult>(
                '/api/alert-rules/check',
            );
            return data;
        },
        onSettled: () => {
            queryClient.invalidateQueries({ queryKey: queryKeys.alerts.all });
            queryClient.invalidateQueries({ queryKey: queryKeys.alertRules.all });
        },
    });
}
