import { supabase, safeQuery } from './supabase'
import type { Plan, Subscription, Invoice, PaymentMethod } from '../types/database.types'

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || ''

// ─── Plans ─────────────────────────────────────────────

export async function getPlans(): Promise<{ data: Plan[] | null; error: string | null }> {
  return safeQuery(
    supabase.from('plans').select('*').eq('is_active', true).order('price_monthly', { ascending: true }),
  )
}

// ─── Subscriptions ─────────────────────────────────────

export async function getSubscription(
  orgId: string,
): Promise<{ data: (Subscription & { plan: Plan | null }) | null; error: string | null }> {
  // Avoid PostgREST embedded joins ('*, plans(*)') — this codebase has hit
  // repeated schema-drift bugs with embedded joins (see admin panel audit
  // notes). Two plain queries are slower by one round trip but don't break
  // silently when a join alias doesn't match the live schema.
  const { data: sub, error: subError } = await supabase
    .from('subscriptions')
    .select('*')
    .eq('organization_id', orgId)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (subError) return { data: null, error: subError.message }
  if (!sub) return { data: null, error: null }

  let plan: Plan | null = null
  if (sub.plan_id) {
    const { data: planRow } = await supabase
      .from('plans')
      .select('*')
      .eq('id', sub.plan_id)
      .maybeSingle()
    plan = planRow ?? null
  }

  return { data: { ...sub, plan }, error: null }
}

export async function createCheckoutSession(
  planId: string,
  orgId: string,
  billingCycle: 'monthly' | 'annual' = 'monthly',
): Promise<{ url: string | null; error: string | null }> {
  const { data: { session } } = await supabase.auth.getSession()
  const token = session?.access_token

  if (!token) return { url: null, error: 'Not authenticated' }

  try {
    const res = await fetch(
      `${SUPABASE_URL}/functions/v1/create-checkout-session`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          planId,
          organizationId: orgId,
          billingCycle,
          successUrl: `${window.location.origin}/settings/billing?success=true`,
          cancelUrl: `${window.location.origin}/settings/billing?cancelled=true`,
        }),
      },
    )

    const data = await res.json()
    if (!res.ok) return { url: null, error: data.error || 'Failed to create checkout' }
    return { url: data.url, error: null }
  } catch (err) {
    return { url: null, error: err instanceof Error ? err.message : 'Network error' }
  }
}

// ─── Invoices ──────────────────────────────────────────

export async function getInvoices(
  orgId: string,
  options?: { limit?: number; status?: Invoice['status'] },
): Promise<{ data: Invoice[] | null; error: string | null }> {
  let query = supabase
    .from('invoices')
    .select('*')
    .eq('organization_id', orgId)
    .order('created_at', { ascending: false })

  if (options?.status) query = query.eq('status', options.status)
  if (options?.limit) query = query.limit(options.limit)

  return safeQuery(query)
}

// ─── Payment Methods ───────────────────────────────────

export async function getPaymentMethods(
  orgId: string,
): Promise<{ data: PaymentMethod[] | null; error: string | null }> {
  return safeQuery(
    supabase
      .from('payment_methods')
      .select('*')
      .eq('organization_id', orgId)
      .order('created_at', { ascending: false }),
  )
}

export async function setDefaultPaymentMethod(
  pmId: string,
  orgId: string,
): Promise<{ error: string | null }> {
  // Unset current default
  await supabase
    .from('payment_methods')
    .update({ is_default: false })
    .eq('organization_id', orgId)
    .eq('is_default', true)

  // Set new default
  const { error } = await supabase
    .from('payment_methods')
    .update({ is_default: true })
    .eq('id', pmId)

  return { error: error ? error.message : null }
}

export async function deletePaymentMethod(
  pmId: string,
): Promise<{ error: string | null }> {
  const { error } = await supabase.from('payment_methods').delete().eq('id', pmId)
  return { error: error ? error.message : null }
}
