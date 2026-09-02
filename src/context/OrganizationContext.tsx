/**
 * OrganizationContext (Phase C12).
 *
 * Migrated from a manual `supabase.auth.getSession()` + raw
 * `fetch('/api/organization')` on mount to the shared React Query stack.
 *
 * Design notes:
 * - The authenticated org detail is fetched through `useOrganizationDetail()`
 *   (React Query → `axiosClient` → GET /api/organization). Auth token
 *   attachment and `ApiError` normalization come from the shared axios layer;
 *   this file never touches `supabase.auth` and never redirects. The provider
 *   is mounted inside `QueryClientProvider` in `main.tsx`, so the hook is safe
 *   to call here.
 * - The backend is the source of truth. Query data is projected into the
 *   public `Organization` shape and synced into local state so that the
 *   existing context contract (`organization`, `setOrganization`,
 *   `updateOrganization`) is preserved for consumers such as the dashboard
 *   Topbar and Billing/Organization settings pages.
 * - `setOrganization` / `updateOrganization` remain synchronous local setters
 *   so callers that optimistically tweak org fields keep working. When the
 *   underlying query refetches (e.g. after a settings mutation invalidates
 *   `organization.all`), the fresh backend values are re-projected on top.
 * - The previous localStorage/mock seed has been removed entirely.
 */

import {
  createContext,
  useState,
  useCallback,
  useEffect,
  type ReactNode,
} from 'react';
import { useOrganizationDetail } from '../hooks/queries/useOrganization';
import type { Organization, OrganizationContextType } from '../types/auth.types';

export const OrganizationContext = createContext<OrganizationContextType | null>(null);

const FALLBACK_ORG: Organization = { id: '', name: 'My Organization', plan: 'starter' };

/**
 * Project the (unwrapped) backend org detail payload into the public
 * `Organization` shape consumed across the app. The backend org row does not
 * carry a `plan` column directly; the API exposes `plan_name` from the
 * subscriptions join when present, so we fall back through
 * `plan_name → plan → 'starter'`.
 */
function toOrganization(detail: Record<string, unknown> | undefined): Organization | null {
  if (!detail || !detail.id) return null;
  const planName = (detail.plan_name ?? detail.plan) as Organization['plan'] | undefined;
  return {
    id: (detail.id as string) ?? '',
    name: (detail.name as string) ?? 'My Organization',
    industry: (detail.industry as string | undefined) ?? undefined,
    logo: (detail.logo_url as string | undefined) ?? undefined,
    plan: planName ?? 'starter',
  };
}

export function OrganizationProvider({ children }: { children: ReactNode }) {
  const [organization, setOrganizationState] = useState<Organization>(FALLBACK_ORG);

  // Backend is the source of truth (React Query → axiosClient → GET /api/organization).
  const { data } = useOrganizationDetail();

  // Sync fresh backend values into local state whenever the query resolves or
  // is invalidated/refetched. Local optimistic edits made via
  // setOrganization/updateOrganization are overwritten by authoritative data.
  useEffect(() => {
    const mapped = toOrganization(data);
    if (mapped) setOrganizationState(mapped);
  }, [data]);

  const setOrganization = useCallback((org: Organization) => {
    setOrganizationState(org);
  }, []);

  const updateOrganization = useCallback((partial: Partial<Organization>) => {
    setOrganizationState((prev) => ({ ...prev, ...partial }));
  }, []);

  return (
    <OrganizationContext.Provider value={{ organization, setOrganization, updateOrganization }}>
      {children}
    </OrganizationContext.Provider>
  );
}
