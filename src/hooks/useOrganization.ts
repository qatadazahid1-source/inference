import { useContext } from 'react';
import { OrganizationContext } from '../context/OrganizationContext';
import type { OrganizationContextType } from '../types/auth.types';

export function useOrganization(): OrganizationContextType {
  const context = useContext(OrganizationContext);
  if (!context) {
    throw new Error('useOrganization must be used within an OrganizationProvider');
  }
  return context;
}
