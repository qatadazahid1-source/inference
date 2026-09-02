import express from 'express';
import { supabase } from '../index.js';
import { attachEntitlements } from '../middleware/requireEntitlements.js';

const router = express.Router();

// Same org-resolution pattern used in budgets.js / reports.js / alertRules.js
async function getUserMembership(userId) {
  const { data, error } = await supabase
    .from('organization_members')
    .select('organization_id, role')
    .eq('user_id', userId)
    .eq('status', 'active')
    .limit(1)
    .maybeSingle();

  if (!error && data) return data;

  const { data: org } = await supabase
    .from('organizations')
    .select('id')
    .eq('user_id', userId)
    .limit(1)
    .maybeSingle();

  if (org) return { organization_id: org.id, role: 'owner' };
  throw new Error(`No active organization found for user ${userId}`);
}

// Only owner/admin roles can edit org settings — everyone in the org can view.
const CAN_EDIT_ROLES = ['owner', 'admin'];

// Fields that actually exist as columns on `organizations` in the live schema.
// NOTE: the frontend Organization.tsx "Data & Privacy" section (data
// retention, anonymize cost data, share benchmarks, allow third-party
// processing) has no backing columns in the live schema snapshot — those
// toggles currently have nowhere real to persist to. Flagging rather than
// inventing a migration; decide whether that section stays UI-only,
// gets removed, or needs a real migration before wiring it up.
const EDITABLE_ORG_FIELDS = ['name', 'website', 'industry', 'company_size', 'country', 'logo_url', 'primary_color', 'billing_email', 'tax_id', 'billing_address'];

// GET /api/organization — the current user's org (view access for any active member)
router.get('/', async (req, res) => {
  try {
    const membership = await getUserMembership(req.user.id);

    const { data, error } = await supabase
      .from('organizations')
      .select('*')
      .eq('id', membership.organization_id)
      .single();

    if (error) throw error;

    res.json({ data: { ...data, currentUserRole: membership.role, canEdit: CAN_EDIT_ROLES.includes(membership.role) } });
  } catch (err) {
    console.error('[organization] GET error:', err.message, err);
    res.status(500).json({ error: err.message });
  }
});

// PATCH /api/organization — owner/admin only
router.patch('/', async (req, res) => {
  try {
    const membership = await getUserMembership(req.user.id);
    if (!CAN_EDIT_ROLES.includes(membership.role)) {
      return res.status(403).json({ error: 'Only organization owners and admins can edit organization settings' });
    }

    const updates = {};
    for (const field of EDITABLE_ORG_FIELDS) {
      if (Object.prototype.hasOwnProperty.call(req.body, field)) {
        updates[field] = req.body[field];
      }
    }

    if (Object.keys(updates).length === 0) {
      return res.status(400).json({ error: 'No editable fields provided' });
    }

    const { data, error } = await supabase
      .from('organizations')
      .update(updates)
      .eq('id', membership.organization_id)
      .select()
      .single();

    if (error) throw error;
    res.json({ data });
  } catch (err) {
    console.error('[organization] PATCH error:', err.message, err);
    res.status(500).json({ error: err.message });
  }
});

// POST /api/organization/logo — same pattern as profile avatar: client
// uploads to Supabase Storage first, this just persists the resulting URL.
router.post('/logo', async (req, res) => {
  try {
    const membership = await getUserMembership(req.user.id);
    if (!CAN_EDIT_ROLES.includes(membership.role)) {
      return res.status(403).json({ error: 'Only organization owners and admins can edit organization settings' });
    }

    const { logo_url } = req.body;
    if (!logo_url || typeof logo_url !== 'string') {
      return res.status(400).json({ error: 'logo_url is required' });
    }

    const { data, error } = await supabase
      .from('organizations')
      .update({ logo_url })
      .eq('id', membership.organization_id)
      .select()
      .single();

    if (error) throw error;
    res.json({ data });
  } catch (err) {
    console.error('[organization] logo error:', err.message, err);
    res.status(500).json({ error: err.message });
  }
});

// Subscription statuses that count as "paying" access, separate from trial.
// past_due is included deliberately as a short grace period rather than
// cutting access off the moment a renewal payment fails — that failure is
// already surfaced as an alert (see lemonsqueezy-webhook.js) so the org
// isn't left unaware, but access isn't yanked instantly either.
const PAID_ACCESS_STATUSES = ['active', 'trialing', 'past_due'];

// GET /api/organization/access — used by DashboardLayout to gate dashboard
// routes. Deliberately its own lightweight endpoint rather than folding
// this into GET / — the dashboard needs this on every load and doesn't
// need the rest of the org record.
router.get('/access', async (req, res) => {
  try {
    const membership = await getUserMembership(req.user.id);

    const [{ data: org, error: orgError }, { data: subscription }] = await Promise.all([
      supabase.from('organizations').select('id, trial_ends_at').eq('id', membership.organization_id).single(),
      supabase
        .from('subscriptions')
        .select('status, cancelled_at')
        .eq('organization_id', membership.organization_id)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle(),
    ]);

    if (orgError) throw orgError;

    if (subscription && PAID_ACCESS_STATUSES.includes(subscription.status)) {
      return res.json({ data: { hasAccess: true, source: 'subscription', subscriptionStatus: subscription.status } });
    }

    // Scheduled ("end of billing period") cancellation: Lemon Squeezy sets
    // status to 'cancelled' immediately when this is scheduled, with
    // cancelled_at holding the future date access actually ends — not the
    // moment they clicked cancel. Access should continue until then.
    if (subscription?.status === 'cancelled' && subscription.cancelled_at && new Date(subscription.cancelled_at) > new Date()) {
      return res.json({
        data: {
          hasAccess: true,
          source: 'subscription',
          subscriptionStatus: 'cancelled',
          cancelledAt: subscription.cancelled_at,
        },
      });
    }

    const trialEndsAt = org.trial_ends_at ? new Date(org.trial_ends_at) : null;
    const trialActive = trialEndsAt ? trialEndsAt.getTime() > Date.now() : false;
    const daysLeft = trialEndsAt ? Math.max(0, Math.ceil((trialEndsAt.getTime() - Date.now()) / (24 * 60 * 60 * 1000))) : 0;

    res.json({
      data: {
        hasAccess: trialActive,
        source: trialActive ? 'trial' : 'none',
        trialEndsAt: org.trial_ends_at,
        daysLeft,
      },
    });
  } catch (err) {
    console.error('[organization] access check error:', err.message, err);
    res.status(500).json({ error: err.message });
  }
});

// GET /api/organization/entitlements — return current system limits for UI enforcement
router.get('/entitlements', attachEntitlements, (req, res) => {
  const { limits, usage, features, rate_limits, model_access } = req.entitlements;
  res.json({ data: { limits, usage, features, rate_limits, model_access } });
});

export default router;
