// ============================================================================
// Stripe Webhook — handles incoming Stripe events
// ============================================================================
import { serve } from 'https://deno.land/std@0.208.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.0'
import Stripe from 'https://esm.sh/stripe@14.11.0?target=deno'

const stripeSecretKey = Deno.env.get('STRIPE_SECRET_KEY')!
const stripeWebhookSecret = Deno.env.get('STRIPE_WEBHOOK_SECRET')!
const supabaseUrl = Deno.env.get('SUPABASE_URL')!
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

const stripe = new Stripe(stripeSecretKey, { apiVersion: '2024-11-20.acacia' })
const supabase = createClient(supabaseUrl, supabaseServiceKey)

serve(async (req) => {
  const signature = req.headers.get('stripe-signature')
  if (!signature) {
    return new Response('Missing stripe-signature header', { status: 400 })
  }

  const body = await req.text()

  let event: Stripe.Event
  try {
    event = stripe.webhooks.constructEvent(body, signature, stripeWebhookSecret)
  } catch (err) {
    console.error(`Webhook signature verification failed: ${err.message}`)
    return new Response(`Webhook Error: ${err.message}`, { status: 400 })
  }

  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session
        await handleCheckoutCompleted(session)
        break
      }

      case 'invoice.paid': {
        const invoice = event.data.object as Stripe.Invoice
        await handleInvoicePaid(invoice)
        break
      }

      case 'invoice.payment_failed': {
        const invoice = event.data.object as Stripe.Invoice
        await handleInvoicePaymentFailed(invoice)
        break
      }

      case 'customer.subscription.updated': {
        const subscription = event.data.object as Stripe.Subscription
        await handleSubscriptionUpdated(subscription)
        break
      }

      case 'customer.subscription.deleted': {
        const subscription = event.data.object as Stripe.Subscription
        await handleSubscriptionDeleted(subscription)
        break
      }

      case 'checkout.session.expired': {
        // BUG FIX: previously unhandled — fell through to the generic
        // "Unhandled event type" log with no record of the abandoned
        // checkout. There's no dedicated abandoned-checkout table in the
        // schema, so this logs it clearly rather than staying silent;
        // revisit if you want it surfaced in the admin panel later.
        const session = event.data.object as Stripe.Checkout.Session
        console.log(`Checkout session expired (abandoned): org=${session.metadata?.organization_id}, plan=${session.metadata?.plan_id}`)
        break
      }

      default:
        console.log(`Unhandled event type: ${event.type}`)
    }

    return new Response(JSON.stringify({ received: true }), {
      headers: { 'Content-Type': 'application/json' },
      status: 200,
    })
  } catch (err) {
    console.error(`Error processing webhook: ${err.message}`)
    return new Response(JSON.stringify({ error: err.message }), {
      headers: { 'Content-Type': 'application/json' },
      status: 500,
    })
  }
})

async function handleCheckoutCompleted(session: Stripe.Checkout.Session) {
  const orgId = session.metadata?.organization_id
  const planId = session.metadata?.plan_id
  // BUG FIX: billing_cycle used to be derived from session.mode, which is
  // always 'subscription' now — that would have made every subscription
  // resolve to 'monthly' regardless of what the user picked. Read the real
  // value passed through checkout metadata instead.
  const billingCycle = session.metadata?.billing_cycle === 'annual' ? 'annual' : 'monthly'
  if (!orgId || !planId) {
    console.error('Missing org or plan in checkout session metadata')
    return
  }

  // BUG FIX: the previous `.upsert({...})` had no onConflict target, so
  // every checkout created a brand new subscriptions row instead of
  // updating the org's existing one — duplicates piled up. Doing an
  // explicit check-then-write instead of relying on upsert, since we can't
  // confirm a unique constraint exists on organization_id in the live
  // schema to safely target with onConflict.
  const { data: existingSub } = await supabase
    .from('subscriptions')
    .select('id')
    .eq('organization_id', orgId)
    .maybeSingle()

  const subPayload = {
    organization_id: orgId,
    plan_id: planId,
    status: 'active',
    billing_cycle: billingCycle,
    stripe_subscription_id: session.subscription?.toString(),
    current_period_start: new Date().toISOString(),
    current_period_end: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
    cancelled_at: null,
  }

  const { error: subError } = existingSub
    ? await supabase.from('subscriptions').update(subPayload).eq('id', existingSub.id)
    : await supabase.from('subscriptions').insert(subPayload)

  if (subError) console.error('Error saving subscription:', subError)

  // Update org with Stripe customer ID
  if (session.customer) {
    const { error: orgError } = await supabase
      .from('organizations')
      .update({ stripe_customer_id: session.customer.toString() })
      .eq('id', orgId)

    if (orgError) console.error('Error updating org:', orgError)
  }
}

async function handleInvoicePaid(invoice: Stripe.Invoice) {
  const { data: organization } = await supabase
    .from('organizations')
    .select('id')
    .eq('stripe_customer_id', invoice.customer?.toString())
    .single()

  if (!organization) return

  // BUG FIX: same missing-onConflict issue as subscriptions — explicit
  // check-then-write on stripe_invoice_id (Stripe's own dedup key) instead.
  const { data: existingInvoice } = await supabase
    .from('invoices')
    .select('id')
    .eq('stripe_invoice_id', invoice.id)
    .maybeSingle()

  const invoicePayload = {
    invoice_number: invoice.number || `INV-${invoice.id}`,
    organization_id: organization.id,
    subscription_id: invoice.subscription?.toString(),
    amount: invoice.amount_paid / 100,
    currency: invoice.currency?.toUpperCase() || 'USD',
    status: 'paid',
    description: invoice.description || `Invoice for ${invoice.lines.data[0]?.period?.start ? new Date(invoice.lines.data[0].period.start * 1000).toLocaleDateString() : ''}`,
    pdf_url: invoice.invoice_pdf,
    stripe_invoice_id: invoice.id,
    paid_at: new Date().toISOString(),
    due_date: new Date(invoice.due_date ? invoice.due_date * 1000 : Date.now()).toISOString().split('T')[0],
  }

  const { error } = existingInvoice
    ? await supabase.from('invoices').update(invoicePayload).eq('id', existingInvoice.id)
    : await supabase.from('invoices').insert(invoicePayload)

  if (error) console.error('Error saving invoice:', error)
}

async function handleInvoicePaymentFailed(invoice: Stripe.Invoice) {
  const { data: organization } = await supabase
    .from('organizations')
    .select('id')
    .eq('stripe_customer_id', invoice.customer?.toString())
    .single()

  if (!organization) return

  // Create alert for failed payment
  await supabase.from('alerts').insert({
    organization_id: organization.id,
    type: 'security',
    severity: 'warning',
    title: 'Payment Failed',
    message: `Invoice ${invoice.number} payment failed. Please update your payment method.`,
  })

  const { data: existingInvoice } = await supabase
    .from('invoices')
    .select('id')
    .eq('stripe_invoice_id', invoice.id)
    .maybeSingle()

  const invoicePayload = {
    invoice_number: invoice.number || `INV-${invoice.id}`,
    organization_id: organization.id,
    amount: invoice.amount_due / 100,
    currency: invoice.currency?.toUpperCase() || 'USD',
    status: 'failed',
    stripe_invoice_id: invoice.id,
  }

  const { error } = existingInvoice
    ? await supabase.from('invoices').update(invoicePayload).eq('id', existingInvoice.id)
    : await supabase.from('invoices').insert(invoicePayload)

  if (error) console.error('Error saving failed invoice:', error)
}

async function handleSubscriptionUpdated(subscription: Stripe.Subscription) {
  const { data: org } = await supabase
    .from('organizations')
    .select('id')
    .eq('stripe_customer_id', subscription.customer?.toString())
    .single()

  if (!org) return

  const statusMap: Record<string, string> = {
    active: 'active',
    past_due: 'past_due',
    canceled: 'cancelled',
    unpaid: 'past_due',
    trialing: 'trialing',
    incomplete: 'past_due',
    incomplete_expired: 'cancelled',
    paused: 'paused',
  }

  await supabase
    .from('subscriptions')
    .update({
      status: statusMap[subscription.status] || 'cancelled',
      current_period_start: new Date(subscription.current_period_start * 1000).toISOString(),
      current_period_end: new Date(subscription.current_period_end * 1000).toISOString(),
      cancelled_at: subscription.canceled_at ? new Date(subscription.canceled_at * 1000).toISOString() : null,
    })
    .eq('stripe_subscription_id', subscription.id)
}

async function handleSubscriptionDeleted(subscription: Stripe.Subscription) {
  await supabase
    .from('subscriptions')
    .update({
      status: 'cancelled',
      cancelled_at: new Date().toISOString(),
    })
    .eq('stripe_subscription_id', subscription.id)
}
