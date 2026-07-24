import { supabase } from '../../lib/supabase';
import type { Report } from '../../types/dashboard.types';

export interface DashboardOverview {
  totalSpend: number;
  totalRequests: number;
  avgLatency: number;
  timeSavedHours: number;
  valueGenerated: number;
  roiPercent: number;
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

export interface AlertRuleData {
  id: string;
  name: string;
  condition: 'budget_percent' | 'cost_spike' | 'daily_cost' | 'model_latency' | 'error_rate' | 'token_usage';
  threshold: number;
  scope: string;
  channels: ('in_app' | 'email' | 'slack' | 'sms')[];
  enabled: boolean;
}

export interface PlatformKeyData {
  id: string;
  name: string;
  keyPreview: string;
  integrationId: string;
  isActive: boolean;
  lastUsedAt: string | null;
  createdAt: string;
}

async function fetchWithAuth(url: string, options: RequestInit = {}) {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) throw new Error('Not authenticated');

  const headers = {
    ...options.headers,
    'Authorization': `Bearer ${session.access_token}`,
    'Content-Type': 'application/json'
  };

  const response = await fetch(url, { ...options, headers });
  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.error || `HTTP error! status: ${response.status}`);
  }

  // 204 No Content (e.g. DELETE responses) has no body at all — calling
  // .json() on it throws "Unexpected end of JSON input". Same applies to
  // any other response that legitimately has an empty body.
  if (response.status === 204) return null;
  const text = await response.text();
  return text ? JSON.parse(text) : null;
}

export const DashboardService = {
  // Wired to real /api/analytics data. timeSavedHours, valueGenerated, and
  // roiPercent are not yet computed on the backend (no ROI calculator logic
  // exists yet), so they stay at 0 rather than showing a fabricated number.
  getOverview: async (userId: string): Promise<DashboardOverview> => {
    const data = await DashboardService.getAnalytics(30);
    return {
      totalSpend: data.totalCost ?? 0,
      totalRequests: data.totalRequests ?? 0,
      avgLatency: data.avgLatency ?? 0,
      timeSavedHours: 0,
      valueGenerated: 0,
      roiPercent: 0
    };
  },

  getAnalytics: async (days: number) => {
    let period = '30d';
    if (days === 7) period = '7d';
    else if (days === 90 || days === 365) period = 'all';

    return fetchWithAuth(`/api/analytics?period=${period}`);
  },

  // Fallbacks using the new /api/analytics
  getCostOverTime: async (userId: string, days = 30): Promise<CostOverTime[]> => {
    const data = await DashboardService.getAnalytics(days);
    const providers: string[] = data.providers || [];
    return data.timeSeriesData.map((d: any) => ({
      date: d.date,
      daily_cost: d.cost,
      // Spread each provider's per-day cost (already computed server-side
      // in analytics.js) so the chart can render one line per provider the
      // org actually has usage for, instead of three hardcoded ones.
      ...Object.fromEntries(providers.map((p) => [p, d[p] ?? 0])),
    }));
  },

  getModelAnalytics: async (userId: string): Promise<ModelAnalytics[]> => {
    const data = await DashboardService.getAnalytics(30);
    return data.providerData.map((p: any) => ({
      model: p.name, // using provider as model for now, or adapt backend
      total_cost: p.value,
      requests: 0,
      tokens: 0
    }));
  },

  getApiUsage: async (userId: string, limit = 100): Promise<ApiUsageLog[]> => {
    const data = await fetchWithAuth(`/api/analytics/logs?limit=${limit}`);
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

  getAlerts: async (userId: string): Promise<AlertData[]> =>
    fetchWithAuth('/api/alerts'),

  markAlertRead: async (alertId: string): Promise<AlertData> =>
    fetchWithAuth(`/api/alerts/${alertId}/read`, {
      method: 'PUT',
    }),

  dismissAlert: async (alertId: string): Promise<void> =>
    fetchWithAuth(`/api/alerts/${alertId}`, {
      method: 'DELETE',
    }),

  getAlertRules: async (): Promise<AlertRuleData[]> =>
    fetchWithAuth('/api/alert-rules'),

  createAlertRule: async (rule: {
    name: string;
    condition: string;
    threshold: number;
    scope?: string;
    channels?: string[];
    enabled?: boolean;
  }): Promise<AlertRuleData> =>
    fetchWithAuth('/api/alert-rules', {
      method: 'POST',
      body: JSON.stringify(rule),
    }),

  // Partial update — only send the fields that changed. Used both for the
  // (currently disabled) edit flow and for the enable/disable toggle.
  updateAlertRule: async (ruleId: string, rule: Partial<{
    name: string;
    condition: string;
    threshold: number;
    scope: string;
    channels: string[];
    enabled: boolean;
  }>): Promise<AlertRuleData> =>
    fetchWithAuth(`/api/alert-rules/${ruleId}`, {
      method: 'PUT',
      body: JSON.stringify(rule),
    }),

  toggleAlertRule: async (ruleId: string, enabled: boolean): Promise<AlertRuleData> =>
    fetchWithAuth(`/api/alert-rules/${ruleId}`, {
      method: 'PUT',
      body: JSON.stringify({ enabled }),
    }),

  deleteAlertRule: async (ruleId: string): Promise<void> =>
    fetchWithAuth(`/api/alert-rules/${ruleId}`, {
      method: 'DELETE',
    }),

  // Triggers on-demand evaluation of all active rules for the org. Called
  // once when the Alerts page mounts — there is no background scheduler.
  checkAlertRules: async (): Promise<{ checked: number; triggered: number }> =>
    fetchWithAuth('/api/alert-rules/check', {
      method: 'POST',
    }),

  // Platform Keys — let a user generate a key tied to one connected
  // integration, for use from their OWN external code (any OpenAI-compatible
  // SDK pointed at /v1/chat/completions). Listing only ever returns
  // keyPreview, never the real key.
  getPlatformKeys: async (integrationId?: string): Promise<PlatformKeyData[]> =>
    fetchWithAuth(integrationId ? `/api/platform-keys?integration_id=${integrationId}` : '/api/platform-keys'),

  // The plain key is only ever present in THIS response — the caller must
  // show it once and not rely on retrieving it again.
  createPlatformKey: async (integrationId: string, name: string): Promise<PlatformKeyData & { plainKey: string }> =>
    fetchWithAuth('/api/platform-keys', {
      method: 'POST',
      body: JSON.stringify({ integration_id: integrationId, name }),
    }),

  revokePlatformKey: async (keyId: string): Promise<void> =>
    fetchWithAuth(`/api/platform-keys/${keyId}`, {
      method: 'DELETE',
    }),

  getBudgets: async (userId: string): Promise<any[]> =>
    fetchWithAuth('/api/budgets'),

  createBudget: async (budgetData: any): Promise<any> =>
    fetchWithAuth('/api/budgets', {
      method: 'POST',
      body: JSON.stringify(budgetData)
    }),

  // Updates an existing budget. Only send the fields that changed —
  // the backend leaves anything not included in the body untouched.
  updateBudget: async (budgetId: string, budgetData: any): Promise<any> =>
    fetchWithAuth(`/api/budgets/${budgetId}`, {
      method: 'PUT',
      body: JSON.stringify(budgetData)
    }),

  deleteBudget: async (budgetId: string): Promise<any> =>
    fetchWithAuth(`/api/budgets/${budgetId}`, {
      method: 'DELETE'
    }),

  getReports: async (): Promise<Report[]> =>
    fetchWithAuth('/api/reports'),

  // Generates a report on the backend: it computes a real data_snapshot
  // from api_usage_logs (filtered by date range / providers if given) and
  // saves it. Returns the report metadata once generation completes
  // (status will be 'ready' or 'failed').
  generateReport: async (params: {
    name: string;
    type: Report['type'];
    format: Report['format'];
    dateRangeStart?: string;
    dateRangeEnd?: string;
    providers?: string[];
    teams?: string[];
    recurring?: boolean;
    frequency?: string;
  }): Promise<Report> =>
    fetchWithAuth('/api/reports', {
      method: 'POST',
      body: JSON.stringify(params),
    }),

  // Fetches the saved data_snapshot for a ready report, used to build the
  // downloadable PDF/CSV client-side.
  getReportSnapshot: async (reportId: string): Promise<{ id: string; name: string; type: string; format: string; data_snapshot: any }> =>
    fetchWithAuth(`/api/reports/${reportId}/snapshot`),

  deleteReport: async (reportId: string): Promise<void> =>
    fetchWithAuth(`/api/reports/${reportId}`, {
      method: 'DELETE',
    }),
};
