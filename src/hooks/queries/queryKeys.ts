/**
 * Centralized React Query key factory (Phase A).
 *
 * All query keys used across the app should originate here so that mutations
 * can invalidate predictable, stable keys without magic strings scattered
 * throughout components.
 *
 * Conventions:
 * - Each domain exposes helpers returning `readonly` tuples.
 * - `all` is the broadest key for a domain (invalidate everything in it).
 * - `lists()` / `list(params)` and `details()` / `detail(id)` follow the
 *   community-standard hierarchical pattern so partial invalidation works:
 *   invalidating `budgets.all` also matches `budgets.list(...)` etc.
 *
 * NOTE (Phase A): No hooks consume these yet. This file only defines the key
 * structure that later phases (Dashboard/Settings/Admin hooks) will build on.
 */

export const queryKeys = {
  // ---- Dashboard domains -------------------------------------------------
  analytics: {
    all: ['analytics'] as const,
    period: (period: string) => ['analytics', 'period', period] as const,
    logs: (limit?: number) => ['analytics', 'logs', limit ?? null] as const,
  },

  alerts: {
    all: ['alerts'] as const,
    lists: () => ['alerts', 'list'] as const,
  },

  alertRules: {
    all: ['alert-rules'] as const,
    lists: () => ['alert-rules', 'list'] as const,
  },

  budgets: {
    all: ['budgets'] as const,
    lists: () => ['budgets', 'list'] as const,
    detail: (id: string) => ['budgets', 'detail', id] as const,
  },

  reports: {
    all: ['reports'] as const,
    lists: () => ['reports', 'list'] as const,
    detail: (id: string) => ['reports', 'detail', id] as const,
    snapshot: (id: string) => ['reports', 'snapshot', id] as const,
  },

  platformKeys: {
    all: ['platform-keys'] as const,
    list: (integrationId?: string) =>
      ['platform-keys', 'list', integrationId ?? null] as const,
    providers: () => ['platform-keys', 'providers'] as const,
  },

  // ---- Settings domains --------------------------------------------------
  organization: {
    all: ['organization'] as const,
    detail: () => ['organization', 'detail'] as const,
    access: () => ['organization', 'access'] as const,
    entitlements: () => ['organization', 'entitlements'] as const,
  },

  profile: {
    all: ['profile'] as const,
    detail: () => ['profile', 'detail'] as const,
  },

  security: {
    all: ['security'] as const,
    twoFactor: () => ['security', '2fa'] as const,
    sessions: () => ['security', 'sessions'] as const,
    loginHistory: () => ['security', 'login-history'] as const,
  },

  billing: {
    all: ['billing'] as const,
    subscription: () => ['billing', 'subscription'] as const,
    plans: () => ['billing', 'plans'] as const,
    invoices: () => ['billing', 'invoices'] as const,
    paymentMethods: () => ['billing', 'payment-methods'] as const,
  },

  team: {
    all: ['team'] as const,
    members: (orgId: string | null | undefined) =>
      ['team', 'members', orgId ?? null] as const,
    invitations: (orgId: string | null | undefined) =>
      ['team', 'invitations', orgId ?? null] as const,
  },

  // ---- Admin domains -----------------------------------------------------
  admin: {
    all: ['admin'] as const,

    organizations: {
      all: ['admin', 'organizations'] as const,
      lists: () => ['admin', 'organizations', 'list'] as const,
      detail: (id: string) => ['admin', 'organizations', 'detail', id] as const,
    },

    users: {
      all: ['admin', 'users'] as const,
      lists: () => ['admin', 'users', 'list'] as const,
      detail: (id: string) => ['admin', 'users', 'detail', id] as const,
    },

    pricing: {
      all: ['admin', 'pricing'] as const,
      lists: () => ['admin', 'pricing', 'list'] as const,
    },

    budgets: {
      all: ['admin', 'budgets'] as const,
      lists: () => ['admin', 'budgets', 'list'] as const,
    },

    reports: {
      all: ['admin', 'reports'] as const,
      lists: () => ['admin', 'reports', 'list'] as const,
    },

    analytics: {
      all: ['admin', 'analytics'] as const,
    },

    integrations: {
      all: ['admin', 'integrations'] as const,
      lists: () => ['admin', 'integrations', 'list'] as const,
    },

    siteLinks: {
      all: ['admin', 'site-links'] as const,
      lists: () => ['admin', 'site-links', 'list'] as const,
    },

    plans: {
      all: ['admin', 'plans'] as const,
      lists: () => ['admin', 'plans', 'list'] as const,
    },

    pages: {
      all: ['admin', 'pages'] as const,
      lists: () => ['admin', 'pages', 'list'] as const,
      detail: (slug: string) => ['admin', 'pages', 'detail', slug] as const,
    },

    system: {
      all: ['admin', 'system'] as const,
      health: () => ['admin', 'system', 'health'] as const,
    },

    auth: {
      all: ['admin', 'auth'] as const,
      me: () => ['admin', 'auth', 'me'] as const,
    },

    providers: {
      all: ['admin', 'providers'] as const,
      lists: () => ['admin', 'providers', 'list'] as const,
    },
  },
} as const;

export default queryKeys;
