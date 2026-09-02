/**
 * Reports React Query hooks (Phase C3).
 *
 * Scope: everything the Reports page needs —
 *   - `useReports`          → GET    /api/reports
 *   - `useGenerateReport`   → POST   /api/reports
 *   - `useReportSnapshot`   → GET    /api/reports/:id/snapshot  (on-demand)
 *   - `useDeleteReport`     → DELETE /api/reports/:id
 *
 * Design notes:
 * - Every backend call goes through the shared `axiosClient`, so auth
 *   (Supabase token attached at request time by the request interceptor) and
 *   error normalization (`ApiError`) come from Phase A for free. These hooks
 *   never call `supabase.auth.getSession()` directly and never redirect.
 * - Query keys come from the centralized `queryKeys` factory:
 *     • report list → `queryKeys.reports.lists()` (invalidate via `.all`)
 * - Mutation invalidation mapping:
 *     • generate → invalidate `queryKeys.reports.all` so the freshly generated
 *       report appears in the list.
 *     • delete   → optimistic removal from the cached list (parity with the
 *       previous `setAllReports(prev => prev.filter(...))`), rollback on error,
 *       and invalidation on settle to reconcile with the server.
 * - The report snapshot is a per-report, on-demand fetch used to build the
 *   downloadable PDF/CSV/XLSX. It is modeled as a mutation (an explicit action
 *   triggered by a Download click) rather than a cached query — there is no
 *   list of snapshots to keep fresh, and callers need the data returned
 *   imperatively. PDF/XLSX/CSV export logic itself stays in the component.
 * - `DashboardService` and its `fetchWithAuth` are intentionally left intact
 *   for now (removed in Phase C15); these hooks mirror only the request shape
 *   the service already used. Report generation semantics and backend routes
 *   are unchanged.
 */

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { axiosClient } from '../../lib/axios';
import { queryKeys } from './queryKeys';
import type { Report } from '../../types/dashboard.types';

/** Parameters accepted when generating a report (mirrors DashboardService). */
export interface GenerateReportInput {
    name: string;
    type: Report['type'];
    format: Report['format'];
    dateRangeStart?: string;
    dateRangeEnd?: string;
    providers?: string[];
    teams?: string[];
    recurring?: boolean;
    frequency?: string;
}

/** Shape returned by the snapshot endpoint. */
export interface ReportSnapshot {
    id: string;
    name: string;
    type: string;
    format: string;
    data_snapshot: any;
}

// ---------------------------------------------------------------------------
// Query
// ---------------------------------------------------------------------------

/**
 * Fetch the authenticated org's reports.
 *
 * @param enabled  Gate the query on auth being ready (mirrors the old
 *                 `if (!user?.id) return;` guard). Defaults to `true`.
 */
export function useReports(enabled: boolean = true) {
    return useQuery({
        queryKey: queryKeys.reports.lists(),
        queryFn: async (): Promise<Report[]> => {
            const { data } = await axiosClient.get<Report[]>('/api/reports');
            return data ?? [];
        },
        enabled,
    });
}

// ---------------------------------------------------------------------------
// Mutations
// ---------------------------------------------------------------------------

/**
 * Generate a report on the backend, then invalidate the list so the new
 * report appears. Recurring/frequency are persisted on the record but there is
 * no background scheduler yet — this generates the report once, now.
 */
export function useGenerateReport() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async (params: GenerateReportInput): Promise<Report> => {
            const { data } = await axiosClient.post<Report>('/api/reports', params);
            return data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: queryKeys.reports.all });
        },
    });
}

/**
 * Fetch a report's saved `data_snapshot` on demand (used to build the
 * downloadable file client-side). Modeled as a mutation because it is an
 * explicit, imperative action rather than cached list state.
 */
export function useReportSnapshot() {
    return useMutation({
        mutationFn: async (reportId: string): Promise<ReportSnapshot> => {
            const { data } = await axiosClient.get<ReportSnapshot>(
                `/api/reports/${reportId}/snapshot`,
            );
            return data;
        },
    });
}

/**
 * Delete a report by id. Optimistically removes the row from the cached list
 * (parity with the previous immediate `setAllReports(prev => prev.filter(...))`),
 * rolls back on error, and reconciles with the server on settle.
 */
export function useDeleteReport() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async (reportId: string): Promise<void> => {
            await axiosClient.delete(`/api/reports/${reportId}`);
        },
        onMutate: async (reportId: string) => {
            await queryClient.cancelQueries({ queryKey: queryKeys.reports.all });
            const previous = queryClient.getQueryData<Report[]>(queryKeys.reports.lists());
            queryClient.setQueryData<Report[]>(queryKeys.reports.lists(), (old) =>
                (old ?? []).filter((r) => r.id !== reportId),
            );
            return { previous };
        },
        onError: (_err, _reportId, context) => {
            if (context?.previous) {
                queryClient.setQueryData(queryKeys.reports.lists(), context.previous);
            }
        },
        onSettled: () => {
            queryClient.invalidateQueries({ queryKey: queryKeys.reports.all });
        },
    });
}
