/**
 * Dashboard React Query hooks (Phase B pilot).
 *
 * Scope: only the hooks the Overview page needs today —
 *   - `useAnalytics`  → GET /api/analytics?period=<period>
 *   - `useApiUsage`   → GET /api/analytics/logs?limit=<limit>
 *
 * Design notes:
 * - Both hooks call the backend through the shared `axiosClient` so auth
 *   (Supabase token attached at request time) and error normalization
 *   (`ApiError`, 401 vs 403 distinction) come from Phase A for free. These
 *   hooks never call `supabase.auth.getSession()` directly and never redirect.
 * - Query keys come from the centralized `queryKeys` factory so future
 *   mutations can invalidate predictable keys.
 * - The response transformations mirror the existing `DashboardService`
 *   methods EXACTLY (getOverview / getCostOverTime / getModelAnalytics /
 *   getApiUsage) so no dashboard calculation or shape changes.
 * - IMPORTANT (no duplicate requests): the old Overview code called
 *   getOverview, getCostOverTime and getModelAnalytics separately, each of
 *   which internally hit the SAME `/api/analytics?period=30d` endpoint — three
 *   redundant network calls. `useAnalytics` fetches `/api/analytics` ONCE and
 *   derives all three shapes client-side via `select`, eliminating the
 *   duplication while preserving every transformation.
 * - `DashboardService` and its `fetchWithAuth` are intentionally left intact;
 *   these hooks are additive and re-implement only the small amount of
 *   transformation logic Overview relies on.
 */

import { useQuery } from '@tanstack/react-query';
import { axiosClient } from '../../lib/axios';
import { queryKeys } from './queryKeys';
import type {
    DashboardOverview,
    CostOverTime,
    ModelAnalytics,
    ApiUsageLog,
} from '../../api/services/dashboard.service';

/**
 * Preserve polling parity with the previous `useDataPolling(fetchData, 5000)`
 * on Overview: refetch every 5s, including while the tab is backgrounded
 * (setInterval kept firing regardless of focus, so we opt into background
 * refetching to match that behavior).
 */
const OVERVIEW_POLL_MS = 5000;

/**
 * Shape of the raw `/api/analytics` response we depend on. Kept permissive
 * (matching the previous `any`-based service code) because the backend payload
 * carries more fields than Overview consumes.
 */
interface RawAnalyticsResponse {
    totalCost?: number;
    totalRequests?: number;
    totalTokens?: number;
    avgLatency?: number;
    providers?: string[];
    timeSeriesData?: Array<{ date: string; cost: number;[providerName: string]: any }>;
    providerData?: Array<{ name: string; value: number }>;
    /**
     * Real per-model aggregation from the backend (`analytics.js` `modelData`):
     * cost, request count and token totals per model. Previously the frontend
     * had no per-model data and reused provider costs with requests/tokens
     * hardcoded to 0.
     */
    modelData?: Array<{ model: string; total_cost: number; requests: number; tokens: number }>;
}

/** Combined, pre-derived analytics shapes consumed by Overview. */
export interface AnalyticsDerived {
    overview: DashboardOverview;
    costOverTime: CostOverTime[];
    modelAnalytics: ModelAnalytics[];
    /**
     * The list of providers the org actually has usage for, surfaced straight
     * from the backend (`analytics.js` `providers`). Overview uses this to draw
     * exactly one chart line per real provider instead of three hardcoded
     * openai/anthropic/google series.
     */
    providers: string[];
    /**
     * Per-provider total cost (`analytics.js` `providerData`). Drives the
     * "Cost by Provider" pie chart, which previously reused the per-model data
     * and was therefore mislabeled.
     */
    providerData: Array<{ name: string; value: number }>;
}

/**
 * Map a numeric `days` window to the backend `period` query param, matching
 * `DashboardService.getAnalytics`'s mapping exactly.
 */
function periodFromDays(days: number): string {
    if (days === 7) return '7d';
    if (days === 90 || days === 365) return 'all';
    return '30d';
}

/** Transform raw analytics → DashboardOverview (mirrors getOverview). */
function toOverview(data: RawAnalyticsResponse): DashboardOverview {
    return {
        totalSpend: data.totalCost ?? 0,
        totalRequests: data.totalRequests ?? 0,
        avgLatency: data.avgLatency ?? 0,
        totalTokens: data.totalTokens ?? 0,
    };
}

/** Transform raw analytics → CostOverTime[] (mirrors getCostOverTime). */
function toCostOverTime(data: RawAnalyticsResponse): CostOverTime[] {
    const providers: string[] = data.providers || [];
    return (data.timeSeriesData || []).map((d) => ({
        date: d.date,
        daily_cost: d.cost,
        // Spread each provider's per-day cost so the chart renders one line per
        // provider the org actually has usage for.
        ...Object.fromEntries(providers.map((p) => [p, d[p] ?? 0])),
    }));
}

/**
 * Transform raw analytics → ModelAnalytics[]. Uses the backend's real
 * per-model aggregation (`modelData`: cost + requests + tokens per model).
 * Falls back to the provider breakdown only for older responses that predate
 * `modelData`, so nothing renders empty against a stale cache.
 */
function toModelAnalytics(data: RawAnalyticsResponse): ModelAnalytics[] {
    if (data.modelData && data.modelData.length > 0) {
        return data.modelData.map((m) => ({
            model: m.model,
            total_cost: m.total_cost,
            requests: m.requests,
            tokens: m.tokens,
        }));
    }
    return (data.providerData || []).map((p) => ({
        model: p.name,
        total_cost: p.value,
        requests: 0,
        tokens: 0,
    }));
}

/**
 * Single analytics query for the Overview page. Fetches `/api/analytics` once
 * for the given window and derives overview / cost-over-time / model shapes.
 *
 * @param days  Window in days (defaults to 30, matching Overview).
 */
export function useAnalytics(days: number = 30) {
    const period = periodFromDays(days);

    return useQuery({
        queryKey: queryKeys.analytics.period(period),
        queryFn: async (): Promise<RawAnalyticsResponse> => {
            const { data } = await axiosClient.get<RawAnalyticsResponse>(
                `/api/analytics?period=${period}`
            );
            return data;
        },
        select: (data): AnalyticsDerived => ({
            overview: toOverview(data),
            costOverTime: toCostOverTime(data),
            modelAnalytics: toModelAnalytics(data),
            providers: data.providers || [],
            providerData: data.providerData || [],
        }),
        refetchInterval: OVERVIEW_POLL_MS,
        refetchIntervalInBackground: true,
    });
}

/**
 * Recent API usage logs for the Overview activity table.
 *
 * @param limit  Max rows to fetch (Overview uses 10).
 */
export function useApiUsage(limit: number = 100) {
    return useQuery({
        queryKey: queryKeys.analytics.logs(limit),
        queryFn: async (): Promise<ApiUsageLog[]> => {
            const { data } = await axiosClient.get<any[]>(
                `/api/analytics/logs?limit=${limit}`
            );
            return (data || []).map((log: any) => ({
                id: log.id,
                model: log.model,
                provider: log.provider,
                input_tokens: log.input_tokens ?? 0,
                output_tokens: log.output_tokens ?? 0,
                total_tokens: log.total_tokens ?? 0,
                cost_usd: log.cost_usd ?? 0,
                timestamp: log.logged_at,
            }));
        },
        refetchInterval: OVERVIEW_POLL_MS,
        refetchIntervalInBackground: true,
    });
}
