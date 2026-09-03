// ============================================================================
// Create Lemon Squeezy Checkout — called from frontend to start subscription
// ============================================================================
// SWITCHED FROM STRIPE. Key differences that shaped this rewrite:
//  - Lemon Squeezy has no dynamic price_data like Stripe. Products/variants
//    (= plan + billing cycle combos) must be pre-created in the Lemon
//    Squeezy dashboard, and their variant IDs stored on `plans`
//    (lemonsqueezy_variant_id_monthly / lemonsqueezy_variant_id_annual —
//    see migration 00006). If a plan is missing the variant ID for the
//    requested cycle, this returns a clear error instead of guessing.
//  - No separate customer object needs managing up front — passing `email`
//    in checkout_data lets Lemon Squeezy create/match the customer itself.
//  - No `cancel_url` concept the way Stripe has one. Lemon Squeezy only
//    supports a post-purchase `redirect_url`; there's nothing to redirect
//    to on abandonment, so `cancelUrl` from the frontend is accepted but
//    unused here — flagging rather than pretending it's wired.
import { serve } from 'https://deno.land/std@0.208.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.0'

const lemonSqueezyApiKey = Deno.env.get('LEMONSQUEEZY_API_KEY')!
const lemonSqueezyStoreId = Deno.env.get('LEMONSQUEEZY_STORE_ID')!
const supabaseUrl = Deno.env.get('SUPABASE_URL')!
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

const supabase = createClient(supabaseUrl, supabaseServiceKey)

const LEMONSQUEEZY_API = 'https://api.lemonsqueezy.com/v1'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405, headers: corsHeaders })
  }

  try {
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return new Response('Missing Authorization header', { status: 401, headers: corsHeaders })
    }

    const token = authHeader.replace('Bearer ', '')
    const { data: { user }, error: authError } = await supabase.auth.getUser(token)

    if (authError || !user) {
      return new Response('Unauthorized', { status: 401, headers: corsHeaders })
    }

    const { planId, organizationId, billingCycle, successUrl } = await req.json()

    if (!planId || !organizationId) {
      return new Response(JSON.stringify({ error: 'Missing planId or organizationId' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // SECURITY FIX: Verify that the authenticated user is an active member of the target organization.
    // This prevents an attacker from passing someone else's organizationId to buy a plan for them
    // (potentially overriding or disrupting their existing subscription).
    const { data: member, error: memberError } = await supabase
      .from('organization_members')
      .select('id')
      .eq('organization_id', organizationId)
      .eq('user_id', user.id)
      .eq('status', 'active')
      .maybeSingle()

    if (memberError || !member) {
      return new Response(JSON.stringify({ error: 'Forbidden: You do not have access to this organization' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const { data: plan, error: planError } = await supabase
      .from('plans')
      .select('*')
      .eq('id', planId)
      .single()

    if (planError || !plan) {
      return new Response(JSON.stringify({ error: 'Plan not found' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // For enterprise (custom), redirect to contact sales
    if (plan.slug === 'enterprise') {
      return new Response(JSON.stringify({ url: '/contact-sales' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const cycle = billingCycle === 'annual' ? 'annual' : 'monthly'
    const variantId = cycle === 'annual'
      ? plan.lemonsqueezy_variant_id_annual
      : plan.lemonsqueezy_variant_id_monthly

    if (!variantId) {
      return new Response(
        JSON.stringify({
          error: `This plan isn't fully set up for checkout yet — no Lemon Squeezy ${cycle} variant ID configured for "${plan.name}". Add it to plans.lemonsqueezy_variant_id_${cycle} once the product/variant exists in the Lemon Squeezy dashboard.`,
        }),
        { status: 422, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      )
    }

    const redirectUrl = successUrl || `${req.headers.get('origin') || 'http://localhost:5173'}/settings/billing?success=true`

    const checkoutRes = await fetch(`${LEMONSQUEEZY_API}/checkouts`, {
      method: 'POST',
      headers: {
        Accept: 'application/vnd.api+json',
        'Content-Type': 'application/vnd.api+json',
        Authorization: `Bearer ${lemonSqueezyApiKey}`,
      },
      body: JSON.stringify({
        data: {
          type: 'checkouts',
          attributes: {
            checkout_data: {
              email: user.email,
              // Passed straight through to every webhook event for this
              // checkout as meta.custom_data — this is how the webhook
              // resolves which org/plan/user/cycle a payment belongs to.
              custom: {
                organization_id: organizationId,
                plan_id: planId,
                user_id: user.id,
                billing_cycle: cycle,
              },
            },
            product_options: {
              redirect_url: redirectUrl,
            },
          },
          relationships: {
            store: { data: { type: 'stores', id: String(lemonSqueezyStoreId) } },
            variant: { data: { type: 'variants', id: String(variantId) } },
          },
        },
      }),
    })

    const checkoutBody = await checkoutRes.json()

    if (!checkoutRes.ok) {
      console.error('Lemon Squeezy checkout error:', checkoutBody)
      const message = checkoutBody?.errors?.[0]?.detail || 'Failed to create checkout'
      return new Response(JSON.stringify({ error: message }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const checkoutUrl = checkoutBody?.data?.attributes?.url
    return new Response(JSON.stringify({ url: checkoutUrl }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (err) {
    console.error('Error creating checkout:', err)
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
