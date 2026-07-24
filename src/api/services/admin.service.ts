import { supabase } from '../../lib/supabase';

/**
 * fetchWithAuth — calls backend /api/* routes with the Supabase JWT
 * attached as a Bearer token so the backend can authenticate the request.
 */
async function fetchWithAuth(path: string, options: RequestInit = {}): Promise<any> {
  const { data: { session } } = await supabase.auth.getSession();
  const token = session?.access_token;

  const res = await fetch(path, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(options.headers ?? {}),
    },
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(err.error || `Request failed with status ${res.status}`);
  }

  if (res.status === 204) return null;
  return res.json();
}


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

export const adminService = {
  // --- Pricing ---
  getPricing: async (): Promise<ModelPricing[]> => {
    const data = await fetchWithAuth('/api/admin/pricing');
    return data.data;
  },

  updatePricing: async (id: string, updates: Partial<ModelPricing>): Promise<ModelPricing> => {
    const data = await fetchWithAuth(`/api/admin/pricing/${id}`, {
      method: 'PUT',
      body: JSON.stringify(updates),
    });
    return data.data;
  },

  createPricing: async (pricing: Omit<ModelPricing, 'id' | 'is_active' | 'effective_from' | 'updated_at'>): Promise<ModelPricing> => {
    const data = await fetchWithAuth('/api/admin/pricing', {
      method: 'POST',
      body: JSON.stringify(pricing),
    });
    return data.data;
  },

  deletePricing: async (id: string): Promise<ModelPricing> => {
    const data = await fetchWithAuth(`/api/admin/pricing/${id}`, {
      method: 'DELETE',
    });
    return data.data;
  },

  getPricingAuditLog: async (): Promise<PricingAuditLog[]> => {
    const data = await fetchWithAuth('/api/admin/pricing/audit-log');
    return data.data;
  },

  // --- Organizations ---
  getOrganizations: async (): Promise<any[]> => {
    const data = await fetchWithAuth('/api/admin/organizations');
    return data.data;
  },

  getOrganizationDetail: async (id: string): Promise<any> => {
    const data = await fetchWithAuth(`/api/admin/organizations/${id}`);
    return data.data;
  },

  updateOrganizationStatus: async (id: string, isActive: boolean): Promise<any> => {
    const data = await fetchWithAuth(`/api/admin/organizations/${id}/status`, {
      method: 'PUT',
      body: JSON.stringify({ is_active: isActive }),
    });
    return data.data;
  },

  // --- System Health ---
  getSystemHealth: async (): Promise<any> => {
    const data = await fetchWithAuth('/api/admin/system/health');
    return data.data;
  },

  getSystemAuditLog: async (): Promise<any[]> => {
    const data = await fetchWithAuth('/api/admin/system/audit-log');
    return data.data;
  },

  getSystemFailedRequests: async (): Promise<any[]> => {
    const data = await fetchWithAuth('/api/admin/system/failed-requests');
    return data.data;
  },

  // --- Analytics ---
  getAnalyticsOverview: async (): Promise<any> => {
    const data = await fetchWithAuth('/api/admin/analytics/overview');
    return data.data;
  },

  getAnalyticsUsageTrend: async (): Promise<any[]> => {
    const data = await fetchWithAuth('/api/admin/analytics/usage-trend');
    return data.data;
  },

  getAnalyticsTopOrgs: async (): Promise<any[]> => {
    const data = await fetchWithAuth('/api/admin/analytics/top-orgs');
    return data.data;
  },

  getAnalyticsProviderBreakdown: async (): Promise<any[]> => {
    const data = await fetchWithAuth('/api/admin/analytics/provider-breakdown');
    return data.data;
  },

  // --- Users ---
  getUsers: async (search = '', limit = 50, offset = 0): Promise<{ data: any[]; total: number }> => {
    const params = new URLSearchParams({ search, limit: String(limit), offset: String(offset) });
    const res = await fetchWithAuth(`/api/admin/users?${params}`);
    return { data: res.data, total: res.total };
  },

  getUserDetail: async (id: string): Promise<any> => {
    const data = await fetchWithAuth(`/api/admin/users/${id}`);
    return data.data;
  },

  updateUserRole: async (userId: string, organizationId: string, role: 'admin' | 'member'): Promise<any> => {
    const data = await fetchWithAuth(`/api/admin/users/${userId}/role`, {
      method: 'PUT',
      body: JSON.stringify({ organization_id: organizationId, role }),
    });
    return data.data;
  },

  togglePlatformAdmin: async (userId: string, is_platform_admin: boolean): Promise<any> => {
    const data = await fetchWithAuth(`/api/admin/users/${userId}/platform-admin`, {
      method: 'PUT',
      body: JSON.stringify({ is_platform_admin }),
    });
    return data.data;
  },

  toggleUserStatus: async (userId: string, is_active: boolean): Promise<any> => {
    const data = await fetchWithAuth(`/api/admin/users/${userId}/status`, {
      method: 'PUT',
      body: JSON.stringify({ is_active }),
    });
    return data.data;
  },

  // --- Budgets & Alerts ---
  getBudgets: async (search = '', status = 'all'): Promise<any[]> => {
    const params = new URLSearchParams({ search, status });
    const data = await fetchWithAuth(`/api/admin/budgets?${params}`);
    return data.data;
  },

  getBudgetsSummary: async (): Promise<any> => {
    const data = await fetchWithAuth('/api/admin/budgets/summary');
    return data.data;
  },

  getGlobalAlerts: async (): Promise<any[]> => {
    const data = await fetchWithAuth('/api/admin/budgets/alerts');
    return data.data;
  },

  toggleBudgetHardLimit: async (id: string, hard_limit: boolean): Promise<any> => {
    const data = await fetchWithAuth(`/api/admin/budgets/${id}/hard-limit`, {
      method: 'PUT',
      body: JSON.stringify({ hard_limit }),
    });
    return data.data;
  },

  // --- Integrations ---
  getIntegrations: async (search = '', provider = 'all', status = 'all'): Promise<any[]> => {
    const params = new URLSearchParams({ search, provider, status });
    const data = await fetchWithAuth(`/api/admin/integrations?${params}`);
    return data.data;
  },

  updateIntegrationStatus: async (id: string, status: 'active' | 'inactive'): Promise<any> => {
    const data = await fetchWithAuth(`/api/admin/integrations/${id}/status`, {
      method: 'PUT',
      body: JSON.stringify({ status }),
    });
    return data.data;
  },

  // --- Reports ---
  getReports: async (search = '', type = 'all', status = 'all'): Promise<any[]> => {
    const params = new URLSearchParams({ search, type, status });
    const data = await fetchWithAuth(`/api/admin/reports?${params}`);
    return data.data;
  },

  generateReport: async (payload: { organization_id: string; name: string; type: string; format: string }): Promise<any> => {
    const data = await fetchWithAuth('/api/admin/reports/generate', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
    return data.data;
  },

  deleteReport: async (id: string): Promise<void> => {
    await fetchWithAuth(`/api/admin/reports/${id}`, {
      method: 'DELETE',
    });
  },

  // --- Site Links (footer / social — shown on the public landing page) ---
  getSiteLinks: async (): Promise<any[]> => {
    const data = await fetchWithAuth('/api/admin/site-links');
    return data.data;
  },

  createSiteLink: async (payload: { section: string; label: string; url: string; sort_order?: number }): Promise<any> => {
    const data = await fetchWithAuth('/api/admin/site-links', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
    return data.data;
  },

  updateSiteLink: async (id: string, payload: Partial<{ label: string; url: string; sort_order: number; is_active: boolean }>): Promise<any> => {
    const data = await fetchWithAuth(`/api/admin/site-links/${id}`, {
      method: 'PUT',
      body: JSON.stringify(payload),
    });
    return data.data;
  },

  deleteSiteLink: async (id: string): Promise<void> => {
    await fetchWithAuth(`/api/admin/site-links/${id}`, {
      method: 'DELETE',
    });
  },
};


