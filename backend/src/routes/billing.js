import express from 'express';
import { supabase } from '../index.js';

const router = express.Router();

const lemonSqueezyApiKey = process.env.LEMONSQUEEZY_API_KEY;
const LEMONSQUEEZY_API = 'https://api.lemonsqueezy.com/v1';

// Same org-resolution pattern used elsewhere (budgets.js, organization.js, etc.)
async function getUserOrgId(userId) {
  const { data, error } = await supabase
    .from('organization_members')
    .select('organization_id')
    .eq('user_id', userId)
    .eq('status', 'active')
    .limit(1)
    .maybeSingle();

  if (!error && data) return data.organization_id;

  const { data: org } = await supabase
    .from('organizations')
    .select('id')
    .eq('user_id', userId)
    .limit(1)
    .maybeSingle();

  if (org) return org.id;
  throw new Error(`No active organization found for user ${userId}`);
}

// GET /api/billing/payment-method-url
//
// IMPORTANT: this deliberately does NOT collect a card number anywhere in
// this app. Lemon Squeezy is a Merchant of Record — like Stripe, PCI-DSS
// compliance means raw card data can only ever be entered on their own
// hosted, PCI-compliant page, never inside a form we control and post to
// our own backend. Building a custom "enter your card" form here — even
// with good intentions — would mean card numbers passing through our
// servers, which is both a serious security liability and not something
// Lemon Squeezy's API supports anyway (there's no endpoint to attach a
// raw card to a customer).
//
// The correct and secure way to do this: fetch the subscription's
// `update_payment_method` URL from the Lemon Squeezy API and send the
// user there. It's a Lemon Squeezy-hosted page, pre-filled for their
// subscription, and the card never passes through our backend at all.
router.get('/payment-method-url', async (req, res) => {
  try {
    const orgId = await getUserOrgId(req.user.id);

    const { data: subscription, error: subError } = await supabase
      .from('subscriptions')
      .select('lemonsqueezy_subscription_id')
      .eq('organization_id', orgId)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (subError) throw subError;

    if (!subscription?.lemonsqueezy_subscription_id) {
      // No subscription yet — Lemon Squeezy doesn't have a concept of
      // "add a card with nothing to charge it for". Card entry happens
      // naturally as part of checkout once a plan is picked, so that's
      // the honest answer here rather than pretending a standalone
      // add-card flow exists.
      return res.status(404).json({
        error: 'No subscription yet — pick a plan first. Card details are added as part of checkout.',
        code: 'no_subscription',
      });
    }

    const lsRes = await fetch(`${LEMONSQUEEZY_API}/subscriptions/${subscription.lemonsqueezy_subscription_id}`, {
      headers: {
        Accept: 'application/vnd.api+json',
        Authorization: `Bearer ${lemonSqueezyApiKey}`,
      },
    });

    const lsBody = await lsRes.json();

    if (!lsRes.ok) {
      console.error('[billing] Lemon Squeezy subscription fetch error:', lsBody);
      return res.status(502).json({ error: 'Could not reach Lemon Squeezy' });
    }

    const updateUrl = lsBody?.data?.attributes?.urls?.update_payment_method;

    if (!updateUrl) {
      return res.status(502).json({ error: 'Lemon Squeezy did not return a payment method URL' });
    }

    res.json({ data: { url: updateUrl } });
  } catch (err) {
    console.error('[billing] payment-method-url error:', err.message, err);
    res.status(500).json({ error: err.message });
  }
});

// POST /api/billing/cancel-subscription
// body: { immediate: boolean }
//
// Lemon Squeezy has two distinct cancel operations:
//  - PATCH .../subscriptions/{id} with { cancelled: true } → "soft" cancel:
//    status flips to 'cancelled' right away but `ends_at` is set to the
//    current period end, so the user keeps access until then (matches the
//    "end of billing cycle" option from the original spec).
//  - DELETE .../subscriptions/{id} → immediate cancel, access ends now.
router.post('/cancel-subscription', async (req, res) => {
  try {
    const orgId = await getUserOrgId(req.user.id);
    const immediate = req.body?.immediate === true;

    const { data: subscription, error: subError } = await supabase
      .from('subscriptions')
      .select('id, lemonsqueezy_subscription_id, status, current_period_end')
      .eq('organization_id', orgId)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (subError) throw subError;
    if (!subscription?.lemonsqueezy_subscription_id) {
      return res.status(404).json({ error: 'No active subscription to cancel' });
    }
    if (subscription.status === 'cancelled') {
      return res.status(400).json({ error: 'This subscription is already cancelled' });
    }

    const lsUrl = `${LEMONSQUEEZY_API}/subscriptions/${subscription.lemonsqueezy_subscription_id}`;
    const lsRes = await fetch(lsUrl, {
      method: immediate ? 'DELETE' : 'PATCH',
      headers: {
        Accept: 'application/vnd.api+json',
        'Content-Type': 'application/vnd.api+json',
        Authorization: `Bearer ${lemonSqueezyApiKey}`,
      },
      ...(immediate
        ? {}
        : {
            body: JSON.stringify({
              data: {
                type: 'subscriptions',
                id: subscription.lemonsqueezy_subscription_id,
                attributes: { cancelled: true },
              },
            }),
          }),
    });

    if (!lsRes.ok) {
      const lsBody = await lsRes.json().catch(() => ({}));
      console.error('[billing] Lemon Squeezy cancel error:', lsBody);
      return res.status(502).json({ error: lsBody?.errors?.[0]?.detail || 'Could not cancel subscription with Lemon Squeezy' });
    }

    // Update our own record immediately rather than waiting on the webhook —
    // the webhook will arrive shortly after and reconcile to the exact
    // Lemon Squeezy-confirmed date, but the user shouldn't see a stale
    // "active" status (or, for a scheduled cancel, lose access early) just
    // because a webhook round-trip hasn't landed yet. For a scheduled
    // cancel, use the subscription's already-known current_period_end as
    // the interim cancelled_at — NOT null, since the access check treats a
    // null cancelled_at on a 'cancelled' subscription as "access already
    // ended", which would incorrectly cut them off immediately instead of
    // at period end.
    const { error: updateError } = await supabase
      .from('subscriptions')
      .update({
        status: 'cancelled',
        cancelled_at: immediate ? new Date().toISOString() : subscription.current_period_end,
      })
      .eq('id', subscription.id);

    if (updateError) console.error('[billing] Error updating local subscription after cancel:', updateError);

    res.json({ data: { success: true, immediate } });
  } catch (err) {
    console.error('[billing] cancel-subscription error:', err.message, err);
    res.status(500).json({ error: err.message });
  }
});

// POST /api/billing/resume-subscription
// Only works for a *scheduled* cancellation (cancel-at-period-end) that
// hasn't taken effect yet — Lemon Squeezy supports un-cancelling via the
// same PATCH endpoint with cancelled: false. An immediately-cancelled
// subscription can't be resumed this way; the user would need to
// re-subscribe via checkout instead.
router.post('/resume-subscription', async (req, res) => {
  try {
    const orgId = await getUserOrgId(req.user.id);

    const { data: subscription, error: subError } = await supabase
      .from('subscriptions')
      .select('id, lemonsqueezy_subscription_id, status, cancelled_at')
      .eq('organization_id', orgId)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (subError) throw subError;
    if (!subscription?.lemonsqueezy_subscription_id) {
      return res.status(404).json({ error: 'No subscription found' });
    }
    if (subscription.status !== 'cancelled' || !subscription.cancelled_at || new Date(subscription.cancelled_at) <= new Date()) {
      return res.status(400).json({ error: 'This subscription has no pending cancellation to undo' });
    }

    const lsRes = await fetch(`${LEMONSQUEEZY_API}/subscriptions/${subscription.lemonsqueezy_subscription_id}`, {
      method: 'PATCH',
      headers: {
        Accept: 'application/vnd.api+json',
        'Content-Type': 'application/vnd.api+json',
        Authorization: `Bearer ${lemonSqueezyApiKey}`,
      },
      body: JSON.stringify({
        data: {
          type: 'subscriptions',
          id: subscription.lemonsqueezy_subscription_id,
          attributes: { cancelled: false },
        },
      }),
    });

    if (!lsRes.ok) {
      const lsBody = await lsRes.json().catch(() => ({}));
      console.error('[billing] Lemon Squeezy resume error:', lsBody);
      return res.status(502).json({ error: lsBody?.errors?.[0]?.detail || 'Could not resume subscription with Lemon Squeezy' });
    }

    const { error: updateError } = await supabase
      .from('subscriptions')
      .update({ status: 'active', cancelled_at: null })
      .eq('id', subscription.id);

    if (updateError) console.error('[billing] Error updating local subscription after resume:', updateError);

    res.json({ data: { success: true } });
  } catch (err) {
    console.error('[billing] resume-subscription error:', err.message, err);
    res.status(500).json({ error: err.message });
  }
});

export default router;
