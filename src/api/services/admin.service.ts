import { axiosClient } from '../../lib/axios';

/**
 * adminService — thin data-access layer for the platform admin panel.
 *
 * All calls go through the shared authenticated `axiosClient` (Phase 3, C14),
 * which attaches the Supabase JWT at request time and normalizes failures into
 * an `ApiError` (401 → unauthenticated, 403 → forbidden, etc.). The previous
 * bespoke `fetchWithAuth` helper has been removed so there is a single source
 * of truth for authenticated REST access.
 *
 * Backend response envelopes:
 *   - Most routes return `{ data: ... }`; methods below unwrap `.data`.
 *   - `getUsers` returns `{ data, total }` at the top level.
 *   - Sync endpoints return their payload at the top level (no `.data` wrap).
 *   - Providers routes return `{ data }` (GET), `{ success, data }` (POST/PUT),
 *     and `{ success }` (DELETE).
 */

export interface ModelPricing {
  id: string;
  provider: string;
  model: string;
  input_cost_per_1k: number;
  output_cost_per_1k: number;
  batch_input_cost?: number;
  batch_output_cost?: number;
  context_window?: number;
  is_active: boolean;
  effective_from: string;
  effective_to?: string;
  updated_at: string;
}

export interface PricingAuditLog {
  id: string;
  provider: string;
  model_name: string;
  old_input_cost?: number;
  old_output_cost?: number;
  new_input_cost: number;
  new_output_cost: number;
  action: string;
  changed_at: string;
  changed_by_email: string;
  changed_by_name: string;
}

export interface ProviderData {
  id: string;
  name: string;
  provider_id: string;
  color: string;
  is_active: boolean;
}

export interface ProviderInput {
  name: string;
  provider_id: string;
  color: string;
  is_active: boolean;
}

export const adminService = {
  // --- Pricing ---
  getPricing: async (): Promise<ModelPricing[]> => {
    const { data } = await axiosClient.get<{ data: ModelPricing[] }>('/api/admin/pricing');
    return data.data;
  },

  syncOpenRouterPricing: async (): Promise<{ updatedCount: number, insertedCount: number, totalProcessed: number }> => {
    const { data } = await axiosClient.post<{ updatedCount: number, insertedCount: number, totalProcessed: number }>('/api/admin/pricing/sync-openrouter');
    return data;
  },

  syncCustomUrlsPricing: async (providers: Array<{ providerName: string; url: string }>): Promise<{
    updatedCount: number,
    insertedCount: number,
    providerResults: Array<{ providerName: string; unchanged: number; updated: number; newModels: number }>,
    failedProviders: any[]
  }> => {
    const { data } = await axiosClient.post<{
      updatedCount: number,
      insertedCount: number,
      providerResults: Array<{ providerName: string; unchanged: number; updated: number; newModels: number }>,
      failedProviders: any[]
    }>('/api/admin/pricing/sync-custom-urls', { providers });
    return data;
  },

  updatePricing: async (id: string, updates: Partial<ModelPricing>): Promise<ModelPricing> => {
    const { data } = await axiosClient.put<{ data: ModelPricing }>(`/api/admin/pricing/${id}`, updates);
    return data.data;
  },

  createPricing: async (pricing: Omit<ModelPricing, 'id' | 'is_active' | 'effective_from' | 'updated_at'>): Promise<ModelPricing> => {
    const { data } = await axiosClient.post<{ data: ModelPricing }>('/api/admin/pricing', pricing);
    return data.data;
  },

  deletePricing: async (id: string): Promise<ModelPricing> => {
    const { data } = await axiosClient.delete<{ data: ModelPricing }>(`/api/admin/pricing/${id}`);
    return data.data;
  },

  getPricingAuditLog: async (): Promise<PricingAuditLog[]> => {
    const { data } = await axiosClient.get<{ data: PricingAuditLog[] }>('/api/admin/pricing/audit-log');
    return data.data;
  },

  // --- Organizations ---
  getOrganizations: async (): Promise<any[]> => {
    const { data } = await axiosClient.get<{ data: any[] }>('/api/admin/organizations');
    return data.data;
  },

  getOrganizationDetail: async (id: string): Promise<any> => {
    const { data } = await axiosClient.get<{ data: any }>(`/api/admin/organizations/${id}`);
    return data.data;
  },

  updateOrganizationStatus: async (id: string, isActive: boolean): Promise<any> => {
    const { data } = await axiosClient.put<{ data: any }>(`/api/admin/organizations/${id}/status`, { is_active: isActive });
    return data.data;
  },

  givePlan: async (organizationId: string, planId: string, billingCycle: 'monthly' | 'annual'): Promise<any> => {
    const { data } = await axiosClient.post<{ data: any }>(`/api/admin/organizations/${organizationId}/give-plan`, { plan_id: planId, billing_cycle: billingCycle });
    return data.data;
  },

  // --- System Health ---
  getSystemHealth: async (): Promise<any> => {
    const { data } = await axiosClient.get<{ data: any }>('/api/admin/system/health');
    return data.data;
  },

  getSystemAuditLog: async (): Promise<any[]> => {
    const { data } = await axiosClient.get<{ data: any[] }>('/api/admin/system/audit-log');
    return data.data;
  },

  getSystemFailedRequests: async (): Promise<any[]> => {
    const { data } = await axiosClient.get<{ data: any[] }>('/api/admin/system/failed-requests');
    return data.data;
  },

  // --- Analytics ---
  getAnalyticsOverview: async (): Promise<any> => {
    const { data } = await axiosClient.get<{ data: any }>('/api/admin/analytics/overview');
    return data.data;
  },

  getAnalyticsUsageTrend: async (): Promise<any[]> => {
    const { data } = await axiosClient.get<{ data: any[] }>('/api/admin/analytics/usage-trend');
    return data.data;
  },

  getAnalyticsTopOrgs: async (): Promise<any[]> => {
    const { data } = await axiosClient.get<{ data: any[] }>('/api/admin/analytics/top-orgs');
    return data.data;
  },

  getAnalyticsProviderBreakdown: async (): Promise<any[]> => {
    const { data } = await axiosClient.get<{ data: any[] }>('/api/admin/analytics/provider-breakdown');
    return data.data;
  },

  // --- Users ---
  getUsers: async (search = '', limit = 50, offset = 0): Promise<{ data: any[]; total: number }> => {
    const params = new URLSearchParams({ search, limit: String(limit), offset: String(offset) });
    const { data } = await axiosClient.get<{ data: any[]; total: number }>(`/api/admin/users?${params}`);
    return { data: data.data, total: data.total };
  },

  getUserDetail: async (id: string): Promise<any> => {
    const { data } = await axiosClient.get<{ data: any }>(`/api/admin/users/${id}`);
    return data.data;
  },

  updateUserRole: async (userId: string, organizationId: string, role: 'admin' | 'member'): Promise<any> => {
    const { data } = await axiosClient.put<{ data: any }>(`/api/admin/users/${userId}/role`, { organization_id: organizationId, role });
    return data.data;
  },

  togglePlatformAdmin: async (userId: string, is_platform_admin: boolean): Promise<any> => {
    const { data } = await axiosClient.put<{ data: any }>(`/api/admin/users/${userId}/platform-admin`, { is_platform_admin });
    return data.data;
  },

  toggleUserStatus: async (userId: string, is_active: boolean): Promise<any> => {
    const { data } = await axiosClient.put<{ data: any }>(`/api/admin/users/${userId}/status`, { is_active });
    return data.data;
  },

  // --- Budgets & Alerts ---
  getBudgets: async (search = '', status = 'all'): Promise<any[]> => {
    const params = new URLSearchParams({ search, status });
    const { data } = await axiosClient.get<{ data: any[] }>(`/api/admin/budgets?${params}`);
    return data.data;
  },

  getBudgetsSummary: async (): Promise<any> => {
    const { data } = await axiosClient.get<{ data: any }>('/api/admin/budgets/summary');
    return data.data;
  },

  getGlobalAlerts: async (): Promise<any[]> => {
    const { data } = await axiosClient.get<{ data: any[] }>('/api/admin/budgets/alerts');
    return data.data;
  },

  toggleBudgetHardLimit: async (id: string, hard_limit: boolean): Promise<any> => {
    const { data } = await axiosClient.put<{ data: any }>(`/api/admin/budgets/${id}/hard-limit`, { hard_limit });
    return data.data;
  },

  // --- Integrations ---
  getIntegrations: async (search = '', provider = 'all', status = 'all'): Promise<any[]> => {
    const params = new URLSearchParams({ search, provider, status });
    const { data } = await axiosClient.get<{ data: any[] }>(`/api/admin/integrations?${params}`);
    return data.data;
  },

  updateIntegrationStatus: async (id: string, status: 'active' | 'inactive'): Promise<any> => {
    const { data } = await axiosClient.put<{ data: any }>(`/api/admin/integrations/${id}/status`, { status });
    return data.data;
  },

  // --- Reports ---
  getReports: async (search = '', type = 'all', status = 'all'): Promise<any[]> => {
    const params = new URLSearchParams({ search, type, status });
    const { data } = await axiosClient.get<{ data: any[] }>(`/api/admin/reports?${params}`);
    return data.data;
  },

  generateReport: async (payload: { organization_id: string; name: string; type: string; format: string }): Promise<any> => {
    const { data } = await axiosClient.post<{ data: any }>('/api/admin/reports/generate', payload);
    return data.data;
  },

  deleteReport: async (id: string): Promise<void> => {
    await axiosClient.delete(`/api/admin/reports/${id}`);
  },

  // --- Site Links (footer / social — shown on the public landing page) ---
  getSiteLinks: async (): Promise<any[]> => {
    const { data } = await axiosClient.get<{ data: any[] }>('/api/admin/site-links');
    return data.data;
  },

  createSiteLink: async (payload: { section: string; label: string; url: string; sort_order?: number }): Promise<any> => {
    const { data } = await axiosClient.post<{ data: any }>('/api/admin/site-links', payload);
    return data.data;
  },

  updateSiteLink: async (id: string, payload: Partial<{ label: string; url: string; sort_order: number; is_active: boolean }>): Promise<any> => {
    const { data } = await axiosClient.put<{ data: any }>(`/api/admin/site-links/${id}`, payload);
    return data.data;
  },

  deleteSiteLink: async (id: string): Promise<void> => {
    await axiosClient.delete(`/api/admin/site-links/${id}`);
  },

  // --- Landing Pricing Plans (admin-editable plans for the landing page) ---
  getLandingPlans: async (): Promise<any[]> => {
    const { data } = await axiosClient.get<{ data: any[] }>('/api/admin/plans');
    return data.data;
  },

  createLandingPlan: async (payload: {
    name: string; slug: string; price_monthly: number; price_annual: number;
    tagline?: string; is_popular?: boolean; cta_text?: string; cta_variant?: string;
    sort_order?: number; display_features?: Array<{ text: string; included: boolean }>;
    lemonsqueezy_variant_id_monthly?: string; lemonsqueezy_variant_id_annual?: string;
  }): Promise<any> => {
    const { data } = await axiosClient.post<{ data: any }>('/api/admin/plans', payload);
    return data.data;
  },

  updateLandingPlan: async (id: string, payload: Partial<{
    name: string; slug: string; price_monthly: number; price_annual: number;
    tagline: string; is_popular: boolean; cta_text: string; cta_variant: string;
    sort_order: number; display_features: Array<{ text: string; included: boolean }>;
    lemonsqueezy_variant_id_monthly: string; lemonsqueezy_variant_id_annual: string;
    is_active: boolean;
  }>): Promise<any> => {
    const { data } = await axiosClient.put<{ data: any }>(`/api/admin/plans/${id}`, payload);
    return data.data;
  },

  deleteLandingPlan: async (id: string): Promise<any> => {
    const { data } = await axiosClient.delete<{ data: any }>(`/api/admin/plans/${id}`);
    return data.data;
  },

  // --- Static Pages (About, Privacy Policy, Terms, etc.) ---
  getPages: async (): Promise<any[]> => {
    const { data } = await axiosClient.get<{ data: any[] }>('/api/admin/pages');
    return data.data;
  },

  createPage: async (payload: {
    slug: string; title: string; content?: string;
    meta_title?: string; meta_description?: string;
    meta_keywords?: string | null; canonical_url?: string | null;
    og_image?: string | null; robots?: string | null;
    content_blocks?: Record<string, any> | null;
    is_published?: boolean;
  }): Promise<any> => {
    const { data } = await axiosClient.post<{ data: any }>('/api/admin/pages', payload);
    return data.data;
  },

  updatePage: async (id: string, payload: Partial<{
    slug: string; title: string; content: string;
    meta_title: string; meta_description: string;
    meta_keywords: string | null; canonical_url: string | null;
    og_image: string | null; robots: string | null;
    content_blocks: Record<string, any> | null;
    is_published: boolean;
  }>): Promise<any> => {
    const { data } = await axiosClient.put<{ data: any }>(`/api/admin/pages/${id}`, payload);
    return data.data;
  },

  deletePage: async (id: string): Promise<void> => {
    await axiosClient.delete(`/api/admin/pages/${id}`);
  },

  // --- AI Providers (global providers users can connect) ---
  getProviders: async (): Promise<ProviderData[]> => {
    const { data } = await axiosClient.get<{ data: ProviderData[] }>('/api/admin/providers');
    return data.data;
  },

  createProvider: async (payload: ProviderInput): Promise<ProviderData> => {
    const { data } = await axiosClient.post<{ success: boolean; data: ProviderData }>('/api/admin/providers', payload);
    return data.data;
  },

  updateProvider: async (id: string, payload: ProviderInput): Promise<ProviderData> => {
    const { data } = await axiosClient.put<{ success: boolean; data: ProviderData }>(`/api/admin/providers/${id}`, payload);
    return data.data;
  },

  deleteProvider: async (id: string): Promise<void> => {
    await axiosClient.delete(`/api/admin/providers/${id}`);
  },

  // --- Admin identity ---
  // GET /api/admin/auth/me returns the admin's identity at the top level
  // (e.g. `{ is_platform_admin: boolean, ... }`), NOT wrapped in `{ data }`.
  // A 403 here is a genuine "not a platform admin" (ApiError.isForbidden),
  // and a 401 is unauthenticated — the caller maps these to route state.
  getAdminMe: async (): Promise<{ is_platform_admin?: boolean;[key: string]: any }> => {
    const { data } = await axiosClient.get<{ is_platform_admin?: boolean;[key: string]: any }>('/api/admin/auth/me');
    return data;
  },

  // --- Pricing AI Agent (REST — SSE stays on native fetch elsewhere) ---
  pricingAgentChat: async (prompt: string): Promise<{ preview: any }> => {
    const { data } = await axiosClient.post<{ preview: any }>('/api/admin/pricing-agent/chat', { prompt });
    return data;
  },

  pricingAgentExecute: async (action: string, payload: any): Promise<any> => {
    const { data } = await axiosClient.post<any>('/api/admin/pricing-agent/execute', { action, payload });
    return data;
  },
};
