// ============================================================================
// Create Stripe Checkout Session — called from frontend to start subscription
// ============================================================================
import { serve } from 'https://deno.land/std@0.208.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.0'
import Stripe from 'https://esm.sh/stripe@14.11.0?target=deno'

const stripeSecretKey = Deno.env.get('STRIPE_SECRET_KEY')!
const supabaseUrl = Deno.env.get('SUPABASE_URL')!
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

const stripe = new Stripe(stripeSecretKey, { apiVersion: '2024-11-20.acacia' })
const supabase = createClient(supabaseUrl, supabaseServiceKey)

serve(async (req) => {
  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 })
  }

  try {
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return new Response('Missing Authorization header', { status: 401 })
    }

    const token = authHeader.replace('Bearer ', '')
    const { data: { user }, error: authError } = await supabase.auth.getUser(token)

    if (authError || !user) {
      return new Response('Unauthorized', { status: 401 })
    }

    const { planId, organizationId, billingCycle, successUrl, cancelUrl } = await req.json()

    if (!planId || !organizationId) {
      return new Response(JSON.stringify({ error: 'Missing planId or organizationId' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    // Fetch plan details
    const { data: plan, error: planError } = await supabase
      .from('plans')
      .select('*')
      .eq('id', planId)
      .single()

    if (planError || !plan) {
      return new Response(JSON.stringify({ error: 'Plan not found' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    const price = billingCycle === 'annual' ? plan.price_annual : plan.price_monthly

    // For enterprise (custom), redirect to contact sales
    if (plan.slug === 'enterprise') {
      return new Response(JSON.stringify({ url: '/contact-sales' }), {
        headers: { 'Content-Type': 'application/json' },
      })
    }

    // Create Stripe checkout session
    // BUG FIX (was mode: 'payment'): recurring price_data is only valid
    // under mode: 'subscription' — Stripe rejected every checkout attempt
    // before this fix.
    const session = await stripe.checkout.sessions.create({
      customer_email: user.email,
      mode: 'subscription',
      line_items: [
        {
          price_data: {
            currency: 'usd',
            product_data: {
              name: `${plan.name} Plan — ${billingCycle === 'annual' ? 'Annual' : 'Monthly'}`,
              description: `Inference Intelligence ${plan.name} plan`,
            },
            unit_amount: Math.round(price * 100), // Stripe uses cents
            recurring: billingCycle === 'monthly'
              ? { interval: 'month' }
              : { interval: 'year' },
          },
          quantity: 1,
        },
      ],
      metadata: {
        organization_id: organizationId,
        plan_id: planId,
        user_id: user.id,
        // BUG FIX: billing_cycle used to be inferred from session.mode in the
        // webhook, which was always wrong (mode doesn't encode monthly vs
        // annual). Passing it explicitly so the webhook can read the real
        // value instead of guessing.
        billing_cycle: billingCycle === 'annual' ? 'annual' : 'monthly',
      },
      success_url: successUrl || `${req.headers.get('origin') || 'http://localhost:5173'}/settings/billing?success=true`,
      cancel_url: cancelUrl || `${req.headers.get('origin') || 'http://localhost:5173'}/settings/billing?cancelled=true`,
    })

    return new Response(JSON.stringify({ url: session.url }), {
      headers: { 'Content-Type': 'application/json' },
    })
  } catch (err) {
    console.error('Error creating checkout session:', err)
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    })
  }
})
