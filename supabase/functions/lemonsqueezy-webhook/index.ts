// ============================================================================
// Lemon Squeezy Webhook — handles incoming Lemon Squeezy events
// ============================================================================
// SWITCHED FROM STRIPE. Key differences from the old stripe-webhook:
//  - Signature verification is HMAC-SHA256 over the raw body, hex-encoded,
//    in the `X-Signature` header (Stripe used a structured header + SDK
//    helper). Verified manually here with SubtleCrypto.
//  - Event names and payload shapes are different (JSON:API style, event
//    name in `meta.event_name`, org/plan/user/cycle carried in
//    `meta.custom_data` — set from checkout_data.custom in
//    create-checkout-session).
//  - No single "checkout completed" event covers both the subscription
//    and the first payment the way Stripe's did — Lemon Squeezy fires
//    `subscription_created` (the subscription object) and `order_created`
//    (the first invoice) as separate events. Handled both, same
//    check-then-write dedup pattern as before (still true that we can't
//    confirm unique constraints exist to safely rely on upsert/onConflict).
//  - For renewals, `subscription_payment_success` / `subscription_payment_failed`
//    replace Stripe's `invoice.paid` / `invoice.payment_failed`. These
//    don't reliably carry custom_data the way the very first event does,
//    so org resolution falls back to looking up our own `subscriptions`
//    row by lemonsqueezy_subscription_id instead of trusting custom_data.
import { serve } from 'https://deno.land/std@0.208.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.0'

const webhookSecret = Deno.env.get('LEMONSQUEEZY_WEBHOOK_SECRET')!
const supabaseUrl = Deno.env.get('SUPABASE_URL')!
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function verifySignature(rawBody: string, signatureHeader: string | null): Promise<boolean> {
  if (!signatureHeader) return false

  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(webhookSecret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  )
  const digest = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(rawBody))
  const computedHex = Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')

  // Timing-safe-ish comparison
  if (computedHex.length !== signatureHeader.length) return false
  let mismatch = 0
  for (let i = 0; i < computedHex.length; i++) {
    mismatch |= computedHex.charCodeAt(i) ^ signatureHeader.charCodeAt(i)
  }
  return mismatch === 0
}

const LS_STATUS_MAP: Record<string, string> = {
  on_trial: 'trialing',
  active: 'active',
  paused: 'paused',
  past_due: 'past_due',
  unpaid: 'past_due',
  cancelled: 'cancelled',
  expired: 'cancelled',
}

serve(async (req) => {
  const rawBody = await req.text()
  const signature = req.headers.get('x-signature')

  const isValid = await verifySignature(rawBody, signature)
  if (!isValid) {
    console.error('Lemon Squeezy webhook signature verification failed')
    return new Response('Invalid signature', { status: 400 })
  }

  let payload: any
  try {
    payload = JSON.parse(rawBody)
  } catch {
    return new Response('Invalid JSON', { status: 400 })
  }

  const eventName: string = payload?.meta?.event_name
  const customData = payload?.meta?.custom_data ?? {}
  const data = payload?.data
  const attrs = data?.attributes ?? {}

  try {
    switch (eventName) {
      case 'subscription_created':
        await handleSubscriptionCreated(data.id, attrs, customData)
        break

      case 'subscription_updated':
        await handleSubscriptionUpdated(data.id, attrs)
        break

      case 'subscription_cancelled':
        await handleSubscriptionCancelled(data.id, attrs)
        break

      case 'subscription_expired':
        await handleSubscriptionExpired(data.id)
        break

      case 'order_created':
        await handleOrderCreated(data.id, attrs, customData)
        break

      case 'subscription_payment_success':
        await handleSubscriptionPaymentSuccess(data.id, attrs)
        break

      case 'subscription_payment_failed':
        await handleSubscriptionPaymentFailed(data.id, attrs)
        break

      default:
        console.log(`Unhandled Lemon Squeezy event: ${eventName}`)
    }

    return new Response(JSON.stringify({ received: true }), {
      headers: { 'Content-Type': 'application/json' },
      status: 200,
    })
  } catch (err) {
    console.error(`Error processing Lemon Squeezy webhook: ${err.message}`)
    return new Response(JSON.stringify({ error: err.message }), {
      headers: { 'Content-Type': 'application/json' },
      status: 500,
    })
  }
})

// subscription_created: first time we see this subscription — org/plan/cycle
// come from custom_data since no local subscription row exists to look up yet.
async function handleSubscriptionCreated(lsSubscriptionId: string, attrs: any, customData: any) {
  const orgId = customData?.organization_id
  const planId = customData?.plan_id
  const billingCycle = customData?.billing_cycle === 'annual' ? 'annual' : 'monthly'

  if (!orgId || !planId) {
    console.error('Missing org or plan in subscription_created custom_data')
    return
  }

  const { data: existingSub } = await supabase
    .from('subscriptions')
    .select('id')
    .eq('organization_id', orgId)
    .maybeSingle()

  const subPayload = {
    organization_id: orgId,
    plan_id: planId,
    status: LS_STATUS_MAP[attrs.status] || 'active',
    billing_cycle: billingCycle,
    lemonsqueezy_subscription_id: lsSubscriptionId,
    current_period_start: new Date().toISOString(),
    current_period_end: attrs.renews_at ? new Date(attrs.renews_at).toISOString() : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
    trial_ends_at: attrs.trial_ends_at ? new Date(attrs.trial_ends_at).toISOString() : null,
    cancelled_at: null,
  }

  const { error: subError } = existingSub
    ? await supabase.from('subscriptions').update(subPayload).eq('id', existingSub.id)
    : await supabase.from('subscriptions').insert(subPayload)

  if (subError) console.error('Error saving subscription:', subError)

  if (attrs.customer_id) {
    const { error: orgError } = await supabase
      .from('organizations')
      .update({ lemonsqueezy_customer_id: String(attrs.customer_id) })
      .eq('id', orgId)
    if (orgError) console.error('Error updating org:', orgError)
  }

  await upsertPaymentMethod(orgId, lsSubscriptionId, attrs)
}

async function handleSubscriptionUpdated(lsSubscriptionId: string, attrs: any) {
  const { error } = await supabase
    .from('subscriptions')
    .update({
      status: LS_STATUS_MAP[attrs.status] || 'cancelled',
      current_period_end: attrs.renews_at ? new Date(attrs.renews_at).toISOString() : undefined,
      cancelled_at: attrs.status === 'cancelled' && attrs.ends_at ? new Date(attrs.ends_at).toISOString() : null,
    })
    .eq('lemonsqueezy_subscription_id', lsSubscriptionId)

  if (error) console.error('Error updating subscription:', error)

  const { data: sub } = await supabase
    .from('subscriptions')
    .select('organization_id')
    .eq('lemonsqueezy_subscription_id', lsSubscriptionId)
    .maybeSingle()
  if (sub) await upsertPaymentMethod(sub.organization_id, lsSubscriptionId, attrs)
}

async function handleSubscriptionCancelled(lsSubscriptionId: string, attrs: any) {
  await supabase
    .from('subscriptions')
    .update({
      status: 'cancelled',
      cancelled_at: attrs.ends_at ? new Date(attrs.ends_at).toISOString() : new Date().toISOString(),
    })
    .eq('lemonsqueezy_subscription_id', lsSubscriptionId)
}

async function handleSubscriptionExpired(lsSubscriptionId: string) {
  await supabase
    .from('subscriptions')
    .update({ status: 'cancelled', cancelled_at: new Date().toISOString() })
    .eq('lemonsqueezy_subscription_id', lsSubscriptionId)
}

// order_created: the very first payment (signup order). Same
// check-then-write dedup as before, keyed on the Lemon Squeezy order ID.
async function handleOrderCreated(lsOrderId: string, attrs: any, customData: any) {
  const orgId = customData?.organization_id
  if (!orgId) {
    console.error('Missing organization_id in order_created custom_data')
    return
  }

  const { data: sub } = await supabase
    .from('subscriptions')
    .select('id')
    .eq('organization_id', orgId)
    .maybeSingle()

  await writeInvoice(lsOrderId, {
    invoice_number: attrs.order_number ? `INV-${attrs.order_number}` : `INV-${lsOrderId}`,
    organization_id: orgId,
    subscription_id: sub?.id,
    amount: (attrs.total ?? 0) / 100,
    currency: attrs.currency?.toUpperCase() || 'USD',
    status: attrs.status === 'paid' ? 'paid' : 'pending',
    description: attrs.first_order_item?.product_name || 'Subscription',
    pdf_url: attrs.urls?.receipt ?? null,
    paid_at: attrs.status === 'paid' ? new Date().toISOString() : null,
    due_date: new Date().toISOString().split('T')[0],
  })
}

async function handleSubscriptionPaymentSuccess(lsInvoiceId: string, attrs: any) {
  const { data: sub } = await supabase
    .from('subscriptions')
    .select('id, organization_id')
    .eq('lemonsqueezy_subscription_id', String(attrs.subscription_id))
    .maybeSingle()

  if (!sub) {
    console.error('No local subscription found for Lemon Squeezy subscription', attrs.subscription_id)
    return
  }

  await writeInvoice(lsInvoiceId, {
    invoice_number: `INV-${lsInvoiceId}`,
    organization_id: sub.organization_id,
    subscription_id: sub.id,
    amount: (attrs.total ?? 0) / 100,
    currency: attrs.currency?.toUpperCase() || 'USD',
    status: 'paid',
    description: 'Subscription renewal',
    pdf_url: attrs.urls?.invoice_url ?? null,
    paid_at: new Date().toISOString(),
    due_date: new Date().toISOString().split('T')[0],
  })
}

async function handleSubscriptionPaymentFailed(lsInvoiceId: string, attrs: any) {
  const { data: sub } = await supabase
    .from('subscriptions')
    .select('id, organization_id')
    .eq('lemonsqueezy_subscription_id', String(attrs.subscription_id))
    .maybeSingle()

  if (!sub) return

  await supabase.from('alerts').insert({
    organization_id: sub.organization_id,
    type: 'security',
    severity: 'warning',
    title: 'Payment Failed',
    message: 'Your subscription payment failed. Please update your payment method.',
  })

  await writeInvoice(lsInvoiceId, {
    invoice_number: `INV-${lsInvoiceId}`,
    organization_id: sub.organization_id,
    subscription_id: sub.id,
    amount: (attrs.total ?? 0) / 100,
    currency: attrs.currency?.toUpperCase() || 'USD',
    status: 'failed',
  })
}

// Shared check-then-write helper — avoids depending on an unconfirmed
// unique constraint (same reasoning as the earlier Stripe bug fixes).
async function writeInvoice(lsOrderOrInvoiceId: string, payload: Record<string, unknown>) {
  const { data: existing } = await supabase
    .from('invoices')
    .select('id')
    .eq('lemonsqueezy_order_id', lsOrderOrInvoiceId)
    .maybeSingle()

  const { error } = existing
    ? await supabase.from('invoices').update(payload).eq('id', existing.id)
    : await supabase.from('invoices').insert({ ...payload, lemonsqueezy_order_id: lsOrderOrInvoiceId })

  if (error) console.error('Error saving invoice:', error)
}

// Lemon Squeezy attaches card_brand/card_last_four directly to the
// subscription object (no separate payment-method object to fetch).
async function upsertPaymentMethod(orgId: string, lsSubscriptionId: string, attrs: any) {
  if (!attrs.card_brand && !attrs.card_last_four) return

  const { data: existing } = await supabase
    .from('payment_methods')
    .select('id')
    .eq('lemonsqueezy_subscription_id', lsSubscriptionId)
    .maybeSingle()

  const payload = {
    organization_id: orgId,
    type: 'card',
    card_brand: attrs.card_brand ?? null,
    card_last_four: attrs.card_last_four ?? null,
    is_default: true,
    lemonsqueezy_subscription_id: lsSubscriptionId,
  }

  const { error } = existing
    ? await supabase.from('payment_methods').update(payload).eq('id', existing.id)
    : await supabase.from('payment_methods').insert(payload)

  if (error) console.error('Error saving payment method:', error)
}
