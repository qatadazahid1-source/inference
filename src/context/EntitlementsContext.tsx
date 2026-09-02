import { createContext, useContext, useMemo, ReactNode } from 'react';
import { useEntitlementsQuery } from '../hooks/queries/useOrganization';

// ─── Types ───────────────────────────────────────────────────────────────────

export interface SystemLimits {
  limits: {
    integrations: number | null;
    platform_keys: number | null;
    alert_rules: number | null;
    budget_rules: number | null;
    team_members: number | null;
    monthly_spend_usd: number | null;
  };
  usage: {
    warning_threshold_percent: number;
  };
  features: {
    api_gateway: boolean;
    analytics: boolean;
    advanced_analytics: boolean;
    alerts: boolean;
    budget_manager: boolean;
    ai_playground: boolean;
    benchmarks: boolean;
    roi_calculator: boolean;
    reports: boolean;
    csv_export: boolean;
    pdf_export: boolean;
    premium_models: boolean;
    webhooks: boolean;
    slack_alerts: boolean;
    cost_spike_detection: boolean;
    anomaly_detection: boolean;
  };
  rate_limits: {
    requests_per_minute: number | null;
    concurrent_requests: number | null;
  };
  model_access: {
    tier: string;
  };
}

interface EntitlementsContextType {
  limits: SystemLimits;
  isLoading: boolean;
  refresh: () => void;
  /** Typed helper: returns limit value for key, null = unlimited */
  getLimit: (key: keyof SystemLimits['limits']) => number | null;
  /** Typed helper: returns true if feature is enabled */
  hasFeature: (key: keyof SystemLimits['features']) => boolean;
  /** Typed helper: returns true if at or over limit (null limit = always false) */
  isAtLimit: (key: keyof SystemLimits['limits'], current: number) => boolean;
}

// Safe fallback — zero access until plan is confirmed
const FALLBACK_LIMITS: SystemLimits = {
  limits: {
    integrations: 0,
    platform_keys: 0,
    alert_rules: 0,
    budget_rules: 0,
    team_members: 0,
    monthly_spend_usd: 0,
  },
  usage: { warning_threshold_percent: 80 },
  features: {
    api_gateway: false,
    analytics: false,
    advanced_analytics: false,
    alerts: false,
    budget_manager: false,
    ai_playground: false,
    benchmarks: false,
    roi_calculator: false,
    reports: false,
    csv_export: false,
    pdf_export: false,
    premium_models: false,
    webhooks: false,
    slack_alerts: false,
    cost_spike_detection: false,
    anomaly_detection: false,
  },
  rate_limits: { requests_per_minute: 0, concurrent_requests: 0 },
  model_access: { tier: 'basic' },
};

/**
 * Deep-merge a partial entitlements payload over the zero-access fallback.
 * Any block the backend omits keeps its safe defaults, so a missing/empty
 * response (or an error → `{}`) leaves the user at zero access.
 */
function mergeWithFallback(data: Partial<SystemLimits>): SystemLimits {
  return {
    limits: { ...FALLBACK_LIMITS.limits, ...(data.limits || {}) },
    usage: { ...FALLBACK_LIMITS.usage, ...(data.usage || {}) },
    features: { ...FALLBACK_LIMITS.features, ...(data.features || {}) },
    rate_limits: { ...FALLBACK_LIMITS.rate_limits, ...(data.rate_limits || {}) },
    model_access: { ...FALLBACK_LIMITS.model_access, ...(data.model_access || {}) },
  };
}

// ─── Context ─────────────────────────────────────────────────────────────────

const EntitlementsContext = createContext<EntitlementsContextType>({
  limits: FALLBACK_LIMITS,
  isLoading: true,
  refresh: () => { },
  getLimit: () => 0,
  hasFeature: () => false,
  isAtLimit: () => true,
});

// ─── Provider ────────────────────────────────────────────────────────────────

/**
 * Provides plan entitlements to the app. Server-state fetching is delegated to
 * the `useEntitlementsQuery` React Query hook (Phase C13) which goes through the
 * shared `axiosClient` — auth (Supabase token at request time) and 401/403
 * normalization come from Phase A, so this provider no longer touches
 * `supabase.auth.getSession()` or raw `fetch`. React Query also handles the
 * refetch-on-auth-change concern via cache invalidation elsewhere; `refresh`
 * exposes a manual refetch for callers that need it.
 *
 * The public context API (`limits`, `isLoading`, `refresh`, `getLimit`,
 * `hasFeature`, `isAtLimit`) is preserved so existing consumers
 * (`Integrations.tsx`, `Alerts.tsx`) need no changes.
 */
export function EntitlementsProvider({ children }: { children: ReactNode }) {
  const { data, isLoading, refetch } = useEntitlementsQuery();

  const limits = useMemo(() => mergeWithFallback(data ?? {}), [data]);

  const value = useMemo<EntitlementsContextType>(() => {
    const getLimit = (key: keyof SystemLimits['limits']): number | null =>
      limits.limits[key];
    const hasFeature = (key: keyof SystemLimits['features']): boolean =>
      !!limits.features[key];
    const isAtLimit = (
      key: keyof SystemLimits['limits'],
      current: number,
    ): boolean => {
      const lim = limits.limits[key];
      if (lim === null) return false; // unlimited
      return current >= lim;
    };

    return {
      limits,
      isLoading,
      refresh: () => {
        void refetch();
      },
      getLimit,
      hasFeature,
      isAtLimit,
    };
  }, [limits, isLoading, refetch]);

  return (
    <EntitlementsContext.Provider value={value}>
      {children}
    </EntitlementsContext.Provider>
  );
}

// ─── Hook ────────────────────────────────────────────────────────────────────

export function useEntitlements() {
  return useContext(EntitlementsContext);
}
