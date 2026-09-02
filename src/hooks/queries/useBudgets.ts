/**
 * Budgets React Query hooks (Phase C2).
 *
 * Scope: everything the Budget Manager page needs —
 *   - `useBudgets`       → GET    /api/budgets
 *   - `useCreateBudget`  → POST   /api/budgets
 *   - `useUpdateBudget`  → PUT    /api/budgets/:id
 *   - `useDeleteBudget`  → DELETE /api/budgets/:id
 *
 * Design notes:
 * - Every backend call goes through the shared `axiosClient`, so auth
 *   (Supabase token attached at request time by the request interceptor) and
 *   error normalization (`ApiError`, 401 `unauthenticated` vs 403 `forbidden`)
 *   come from Phase A for free. These hooks never call
 *   `supabase.auth.getSession()` directly and never redirect.
 * - Query keys come from the centralized `queryKeys` factory:
 *     • budget list → `queryKeys.budgets.lists()` (invalidate via `.all`)
 * - Freshness parity: the previous component polled every 5s via
 *   `useDataPolling(fetchBudgets, 5000)`. That behavior is reproduced with
 *   `refetchInterval: 5000` on the list query (Phase C16). Background refetch
 *   is left at the default (paused while the tab is hidden) since the old
 *   polling loop also effectively idled when the component was unmounted.
 * - Mutation invalidation mapping:
 *     • create / update / delete → invalidate `queryKeys.budgets.all` so the
 *       list refetches and stays consistent with the server.
 * - Delete UX parity: the previous component did an immediate local filter so
 *   the card disappeared without waiting for the next poll. That is reproduced
 *   here via an optimistic `onMutate` (cancel + snapshot + cache patch) with
 *   `onError` rollback and `onSettled` invalidation.
 * - `DashboardService` and its `fetchWithAuth` are intentionally left intact
 *   for now (removed in Phase C15); these hooks mirror only the request shape
 *   the service already used.
 */

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { axiosClient } from '../../lib/axios';
import { queryKeys } from './queryKeys';

/**
 * Payload accepted when creating or updating a budget. Mirrors the shape the
 * backend `/api/budgets` routes expect. Kept loose (`Partial`-friendly) because
 * updates only send changed fields and the backend leaves the rest untouched.
 */
export interface BudgetInput {
    name: string;
    total_budget: number;
    period: string;
    alert_at_50: boolean;
    alert_at_75: boolean;
    alert_at_90: boolean;
    alert_at_100: boolean;
    hard_limit: boolean;
}

// ---------------------------------------------------------------------------
// Query
// ---------------------------------------------------------------------------

/**
 * Fetch the authenticated org's budgets. Polls every 5s to preserve the
 * previous `useDataPolling` refresh cadence.
 *
 * @param enabled  Gate the query on auth being ready (mirrors the old
 *                 `if (!user?.id) return;` guard). Defaults to `true`.
 */
export function useBudgets(enabled: boolean = true) {
    return useQuery({
        queryKey: queryKeys.budgets.lists(),
        queryFn: async (): Promise<any[]> => {
            const { data } = await axiosClient.get<any[]>('/api/budgets');
            return data ?? [];
        },
        enabled,
        refetchInterval: 5000,
    });
}

// ---------------------------------------------------------------------------
// Mutations
// ---------------------------------------------------------------------------

/** Create a budget, then invalidate the list so it refetches. */
export function useCreateBudget() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async (budget: BudgetInput): Promise<any> => {
            const { data } = await axiosClient.post('/api/budgets', budget);
            return data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: queryKeys.budgets.all });
        },
    });
}

/** Update a budget by id, then invalidate the list so it refetches. */
export function useUpdateBudget() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async ({
            budgetId,
            budget,
        }: {
            budgetId: string;
            budget: BudgetInput;
        }): Promise<any> => {
            const { data } = await axiosClient.put(`/api/budgets/${budgetId}`, budget);
            return data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: queryKeys.budgets.all });
        },
    });
}

/**
 * Delete a budget by id. Optimistically removes the card from the cached list
 * (parity with the previous immediate `setBudgets(prev => prev.filter(...))`),
 * rolls back on error, and reconciles with the server on settle.
 */
export function useDeleteBudget() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async (budgetId: string): Promise<void> => {
            await axiosClient.delete(`/api/budgets/${budgetId}`);
        },
        onMutate: async (budgetId: string) => {
            await queryClient.cancelQueries({ queryKey: queryKeys.budgets.all });
            const previous = queryClient.getQueryData<any[]>(queryKeys.budgets.lists());
            queryClient.setQueryData<any[]>(queryKeys.budgets.lists(), (old) =>
                (old ?? []).filter((b) => b.id !== budgetId),
            );
            return { previous };
        },
        onError: (_err, _budgetId, context) => {
            if (context?.previous) {
                queryClient.setQueryData(queryKeys.budgets.lists(), context.previous);
            }
        },
        onSettled: () => {
            queryClient.invalidateQueries({ queryKey: queryKeys.budgets.all });
        },
    });
}
