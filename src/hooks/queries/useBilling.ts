/**
 * Billing server-state hooks (Phase 3 — C10).
 *
 * Scope split — this file deliberately mixes two data-access styles because
 * the billing feature legitimately spans both:
 *
 *   1. Authenticated backend REST (via the shared `axiosClient`) — the flows
 *      that talk to Lemon Squeezy through our own API:
 *        - GET  /api/billing/payment-method-url   → hosted "update card" URL
 *        - POST /api/billing/cancel-subscription  → { immediate }
 *        - POST /api/billing/resume-subscription
 *        - GET  /api/organization/access          → trial/access state
 *      These replace the component's old inline `authedFetch()` +
 *      `supabase.auth.getSession()` plumbing. Auth (token attached at request
 *      time) and error normalization (`ApiError`, 401 vs 403, no redirect)
 *      come from Phase A's axios layer for free. Tokens are never stored,
 *      cached, or logged here.
 *
 *   2. Supabase-direct reads (wrapped in React Query purely for caching) —
 *      `getPlans` / `getSubscription` / `getInvoices` / `getPaymentMethods`
 *      in `src/services/billing.ts` are legitimate RLS-protected Supabase
 *      queries and are INTENTIONALLY NOT migrated to Axios. React Query wraps
 *      them so the billing page benefits from caching + targeted
 *      invalidation, consistent with the rest of the app.
 *
 * NOT in scope (intentionally left as-is):
 *   - `createCheckoutSession()` — a Supabase Edge Function call; stays on
 *     native `fetch` in `src/services/billing.ts`.
 *   - Organization detail read (GET /api/organization) and billing-info save
 *     (PATCH /api/organization) — already covered by the C7 hooks
 *     `useOrganizationDetail()` / `useUpdateOrganization()`, which the Billing
 *     component reuses rather than duplicating.
 *
 * Query keys come from the centralized `queryKeys` factory. Mutation
 * invalidation mapping:
 *   - cancel / resume subscription → invalidate `billing.all` (subscription,
 *     invoices, payment methods may all change) plus `organization.access`
 *     (trial/access state can flip when a subscription ends or resumes).
 */

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { axiosClient } from '../../lib/axios';
import {
    getPlans,
    getSubscription,
    getInvoices,
    getPaymentMethods,
} from '../../services/billing';
import type { Plan, Invoice, PaymentMethod, Subscription } from '../../types/database.types';
import { queryKeys } from './queryKeys';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/** A subscription row joined with its plan (as returned by `getSubscription`). */
export type SubscriptionWithPlan = Subscription & { plan: Plan | null };

/**
 * Trial / access state as returned (unwrapped) from GET /api/organization/access.
 * `source` distinguishes an active trial from an expired/none state.
 */
export interface OrganizationAccess {
    source: string;
    daysLeft?: number;
    trialEndsAt?: string;
}

/** Payload for POST /api/billing/cancel-subscription. */
export interface CancelSubscriptionInput {
    immediate: boolean;
}

// ---------------------------------------------------------------------------
// Queries — Supabase-direct reads wrapped for caching
// ---------------------------------------------------------------------------

/**
 * Supabase-direct plans list (RLS-protected), wrapped in React Query.
 * Enabled unconditionally; plans are org-independent.
 */
export function usePlans(enabled: boolean = true) {
    return useQuery({
        queryKey: queryKeys.billing.plans(),
        queryFn: async (): Promise<Plan[]> => {
            const { data, error } = await getPlans();
            if (error) throw new Error(error);
            return data ?? [];
        },
        enabled,
    });
}

/**
 * Supabase-direct current subscription (joined with plan), wrapped in React
 * Query. Gated on `orgId` being resolved.
 */
export function useSubscription(orgId: string | null | undefined) {
    return useQuery({
        queryKey: [...queryKeys.billing.subscription(), orgId ?? null] as const,
        queryFn: async (): Promise<SubscriptionWithPlan | null> => {
            const { data, error } = await getSubscription(orgId as string);
            if (error) throw new Error(error);
            return data ?? null;
        },
        enabled: !!orgId,
    });
}

/**
 * Supabase-direct invoices list, wrapped in React Query. Gated on `orgId`.
 */
export function useInvoices(orgId: string | null | undefined, limit: number = 20) {
    return useQuery({
        queryKey: [...queryKeys.billing.invoices(), orgId ?? null, limit] as const,
        queryFn: async (): Promise<Invoice[]> => {
            const { data, error } = await getInvoices(orgId as string, { limit });
            if (error) throw new Error(error);
            return data ?? [];
        },
        enabled: !!orgId,
    });
}

/**
 * Supabase-direct payment methods list, wrapped in React Query. Gated on
 * `orgId`.
 */
export function usePaymentMethods(orgId: string | null | undefined) {
    return useQuery({
        queryKey: [...queryKeys.billing.paymentMethods(), orgId ?? null] as const,
        queryFn: async (): Promise<PaymentMethod[]> => {
            const { data, error } = await getPaymentMethods(orgId as string);
            if (error) throw new Error(error);
            return data ?? [];
        },
        enabled: !!orgId,
    });
}

/**
 * GET /api/organization/access — trial/access state for the org. Only needed
 * when there is no active subscription, so callers gate via `enabled`.
 */
export function useOrganizationAccess(enabled: boolean = true) {
    return useQuery({
        queryKey: queryKeys.organization.access(),
        queryFn: async (): Promise<OrganizationAccess | null> => {
            const { data } = await axiosClient.get<{ data?: OrganizationAccess }>(
                '/api/organization/access',
            );
            return data?.data ?? null;
        },
        enabled,
    });
}

// ---------------------------------------------------------------------------
// Mutations — authenticated backend REST
// ---------------------------------------------------------------------------

/**
 * GET /api/billing/payment-method-url — resolves the hosted Lemon Squeezy
 * "update payment method" URL. Modelled as a mutation because it is an
 * imperative, on-demand action (the caller redirects to the returned URL);
 * it is not cached server-state.
 */
export function usePaymentMethodUrl() {
    return useMutation({
        mutationFn: async (): Promise<string> => {
            const { data } = await axiosClient.get<{ data?: { url?: string } }>(
                '/api/billing/payment-method-url',
            );
            const url = data?.data?.url;
            if (!url) throw new Error('No payment method URL returned');
            return url;
        },
    });
}

/**
 * POST /api/billing/cancel-subscription — cancel now (`immediate: true`) or at
 * period end (`immediate: false`). Invalidates billing + org access on success.
 */
export function useCancelSubscription() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async ({ immediate }: CancelSubscriptionInput): Promise<void> => {
            await axiosClient.post('/api/billing/cancel-subscription', { immediate });
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: queryKeys.billing.all });
            queryClient.invalidateQueries({ queryKey: queryKeys.organization.access() });
        },
    });
}

/**
 * POST /api/billing/resume-subscription — undo a scheduled cancellation.
 * Invalidates billing + org access on success.
 */
export function useResumeSubscription() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async (): Promise<void> => {
            await axiosClient.post('/api/billing/resume-subscription');
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: queryKeys.billing.all });
            queryClient.invalidateQueries({ queryKey: queryKeys.organization.access() });
        },
    });
}
