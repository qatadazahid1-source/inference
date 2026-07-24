export interface User {
  id: string;
  email: string;
  name: string;
  avatar?: string;
  firstName?: string;
  lastName?: string;
  jobTitle?: string;
  phone?: string;
  timezone?: string;
  language?: string;
}

export interface AuthState {
  isAuthenticated: boolean;
  user: User | null;
  isLoading: boolean;
  error: string | null;
}

export interface AuthContextType extends AuthState {
  signIn: (user: User) => void;
  signOut: () => void;
  clearError: () => void;
  updateUser: (user: Partial<User>) => void;
}

export interface Organization {
  id: string;
  name: string;
  industry?: string;
  aiUseCases?: string[];
  monthlyAiSpend?: string;
  logo?: string;
  plan?: 'starter' | 'professional' | 'enterprise';
}

export interface OrganizationContextType {
  organization: Organization;
  setOrganization: (org: Organization) => void;
  updateOrganization: (org: Partial<Organization>) => void;
}
