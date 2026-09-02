/**
 * Dashboard-domain shared types (Phase 3).
 *
 * NOTE: This module used to also export a `DashboardService` object backed by a
 * bespoke `fetchWithAuth` helper (manual `supabase.auth.getSession()` +
 * `Authorization: Bearer` plumbing). During Phase 3 every consumer was migrated
 * to React Query hooks (`useDashboard` / `useAlerts` / `useBudgets` /
 * `useReports` / `usePlatformKeys`) that issue their requests through the shared
 * `axiosClient` (token attached at request time, responses normalized to
 * `ApiError`). With no remaining consumers, the `DashboardService` object and
 * its duplicated `fetchWithAuth` have been removed (C15) so there is a single
 * source of truth for authenticated REST access.
 *
 * Only the shared response/DTO interfaces remain — the hooks import these as
 * types.
 */

import type { AlertRule, Report } from '../../types/dashboard.types';

export interface DashboardOverview {
  totalSpend: number;
  totalRequests: number;
  avgLatency: number;
  /**
   * Total tokens processed across all requests in the window. Sourced directly
   * from the backend aggregation (`analytics.js` `totalTokens`).
   */
  totalTokens: number;
}

export interface CostOverTime {
  date: string;
  daily_cost: number;
  // Per-provider cost for that day, keyed by provider name (e.g. groq: 4.2,
  // openai: 1.1) — populated dynamically based on whichever providers the
  // org actually has usage for. Not a fixed set of known providers.
  [providerName: string]: any;
}

export interface ModelAnalytics {
  model: string;
  total_cost: number;
  requests: number;
  tokens: number;
}

export interface ApiUsageLog {
  id: string;
  model: string;
  provider: string;
  input_tokens: number;
  output_tokens: number;
  total_tokens: number;
  cost_usd: number;
  timestamp: string;
}

export interface AlertData {
  id: string;
  type: string;
  severity: 'info' | 'warning' | 'critical';
  title: string;
  message: string;
  time: string;
  isRead: boolean;
}

// `AlertRuleData` is the alert-rule DTO the React Query hooks consume. Its
// shape is identical to the UI-facing `AlertRule` in dashboard.types.ts, so it
// is consolidated to a single source of truth via a type alias (P4.9). NOTE:
// `AlertData` above is deliberately NOT consolidated with `Alert` in
// dashboard.types.ts — the DTO keeps `type: string` because the backend
// returns free-form alert `type` strings, whereas the UI `Alert.type` is a
// strict union; aliasing them would incorrectly narrow the API response.
export type AlertRuleData = AlertRule;

export interface PlatformKeyData {
  id: string;
  name: string;
  keyPreview: string;
  integrationId: string;
  isActive: boolean;
  lastUsedAt: string | null;
  createdAt: string;
}

// Re-exported for consumers that build report-generation payloads against the
// same shape the (now-removed) service used.
export type { Report };
