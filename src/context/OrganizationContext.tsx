import { createContext, useState, useCallback, type ReactNode } from 'react';
import type { Organization, OrganizationContextType } from '../types/auth.types';

export const OrganizationContext = createContext<OrganizationContextType | null>(null);

const STORAGE_KEY = 'ii_org';

function loadOrg(): Organization {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw) as Organization;
  } catch {
  }
  return { id: '1', name: 'My Company', plan: 'professional' };
}

export function OrganizationProvider({ children }: { children: ReactNode }) {
  const [organization, setOrganizationState] = useState<Organization>(loadOrg);

  const setOrganization = useCallback((org: Organization) => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(org));
    setOrganizationState(org);
  }, []);

  const updateOrganization = useCallback((partial: Partial<Organization>) => {
    setOrganizationState((prev) => {
      const updated = { ...prev, ...partial };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
      return updated;
    });
  }, []);

  return (
    <OrganizationContext.Provider value={{ organization, setOrganization, updateOrganization }}>
      {children}
    </OrganizationContext.Provider>
  );
}
