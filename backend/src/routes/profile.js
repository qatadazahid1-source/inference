import express from 'express';
import { supabase } from '../index.js';

const router = express.Router();

// Helper: resolve organization_id + role server-side from JWT (same pattern as budgets.js / reports.js)
async function getUserOrgMembership(userId) {
  const { data, error } = await supabase
    .from('organization_members')
    .select('organization_id, role, status, last_active_at')
    .eq('user_id', userId)
    .eq('status', 'active')
    .limit(1)
    .maybeSingle();

  if (!error && data) return data;

  // Fallback: user owns an org directly (organizations.user_id) but has no
  // organization_members row yet — treat them as owner.
  const { data: org } = await supabase
    .from('organizations')
    .select('id')
    .eq('user_id', userId)
    .limit(1)
    .maybeSingle();

  if (org) return { organization_id: org.id, role: 'owner', status: 'active', last_active_at: null };

  throw new Error(`No active organization found for user ${userId}`);
}

// Only these fields are allowed to be updated via PATCH /api/profile.
// Deliberately whitelisted — do NOT spread req.body into the update, that
// would let a client overwrite is_active, is_platform_admin, admin_role, etc.
const EDITABLE_USER_FIELDS = ['full_name', 'job_title', 'phone_number', 'timezone', 'language'];

// GET /api/profile — full profile: user + org + role + plan + current-period usage
router.get('/', async (req, res) => {
  try {
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('id, email, full_name, avatar_url, job_title, phone_number, timezone, language, email_verified, is_active, last_login_at, created_at, updated_at')
      .eq('id', req.user.id)
      .single();

    if (userError) throw userError;

    let organization = null;
    let role = null;
    let plan = null;

    try {
      const membership = await getUserOrgMembership(req.user.id);
      role = membership.role;

      const { data: org, error: orgError } = await supabase
        .from('organizations')
        .select('id, name, logo_url, plan_id, billing_email, default_currency')
        .eq('id', membership.organization_id)
        .single();
      if (orgError) throw orgError;
      organization = org;

      if (org.plan_id) {
        const { data: planRow } = await supabase
          .from('plans')
          .select('id, name, slug, price_monthly, price_annual, features')
          .eq('id', org.plan_id)
          .maybeSingle();
        plan = planRow || null;
      }
    } catch (orgErr) {
      // A user with no org yet (e.g. mid-onboarding) shouldn't 500 the whole
      // profile page — just return null org/plan and let the frontend handle it.
      console.warn('[profile] No organization resolved for user:', orgErr.message);
    }

    // Usage summary — org-level only. api_usage_logs has no user_id column
    // (confirmed from live schema), so this is org-wide spend, not per-user.
    let usage = { currentPeriodCost: 0, requestCount: 0, periodStart: null, periodEnd: null };
    if (organization) {
      const periodStart = new Date();
      periodStart.setDate(1);
      periodStart.setHours(0, 0, 0, 0);

      const { data: logs, error: usageError } = await supabase
        .from('api_usage_logs')
        .select('cost_usd')
        .eq('organization_id', organization.id)
        .gte('logged_at', periodStart.toISOString());

      if (!usageError && logs) {
        usage = {
          currentPeriodCost: logs.reduce((sum, l) => sum + Number(l.cost_usd || 0), 0),
          requestCount: logs.length,
          periodStart: periodStart.toISOString(),
          periodEnd: new Date().toISOString(),
        };
      }
    }

    res.json({ data: { user, organization, role, plan, usage } });
  } catch (err) {
    console.error('[profile] GET error:', err.message, err);
    res.status(500).json({ error: err.message });
  }
});

// PATCH /api/profile — update only whitelisted, editable fields
router.patch('/', async (req, res) => {
  try {
    const updates = {};
    for (const field of EDITABLE_USER_FIELDS) {
      if (Object.prototype.hasOwnProperty.call(req.body, field)) {
        updates[field] = req.body[field];
      }
    }

    if (Object.keys(updates).length === 0) {
      return res.status(400).json({ error: 'No editable fields provided' });
    }

    const { data, error } = await supabase
      .from('users')
      .update(updates)
      .eq('id', req.user.id)
      .select()
      .single();

    if (error) throw error;
    res.json({ data });
  } catch (err) {
    console.error('[profile] PATCH error:', err.message, err);
    res.status(500).json({ error: err.message });
  }
});

// Keep PUT as an alias of PATCH for backward compatibility with the existing
// frontend call in Profile.tsx (which currently uses method: 'PUT'). Same
// whitelist logic — avatar_url is deliberately excluded here; it's written
// server-side only after a real Supabase Storage upload, never accepted raw
// from the client (the old code accepted a base64 data URL directly, which
// would have bloated the users table with image blobs).
router.put('/', async (req, res) => {
  try {
    const updates = {};
    for (const field of EDITABLE_USER_FIELDS) {
      if (Object.prototype.hasOwnProperty.call(req.body, field)) {
        updates[field] = req.body[field];
      }
    }

    if (Object.keys(updates).length === 0) {
      return res.status(400).json({ error: 'No editable fields provided' });
    }

    const { data, error } = await supabase
      .from('users')
      .update(updates)
      .eq('id', req.user.id)
      .select()
      .single();

    if (error) throw error;
    res.json({ data });
  } catch (err) {
    console.error('[profile] PUT error:', err.message, err);
    res.status(500).json({ error: err.message });
  }
});

// POST /api/profile/avatar — accepts a public URL already uploaded to
// Supabase Storage from the client (via the existing uploadAvatar() helper
// in src/services/users.ts, which uploads to the 'user-content' bucket).
// This endpoint just confirms/persists it server-side so avatar_url updates
// go through the same whitelist path as everything else.
router.post('/avatar', async (req, res) => {
  try {
    const { avatar_url } = req.body;
    if (!avatar_url || typeof avatar_url !== 'string') {
      return res.status(400).json({ error: 'avatar_url is required' });
    }

    const { data, error } = await supabase
      .from('users')
      .update({ avatar_url })
      .eq('id', req.user.id)
      .select()
      .single();

    if (error) throw error;
    res.json({ data });
  } catch (err) {
    console.error('[profile] avatar error:', err.message, err);
    res.status(500).json({ error: err.message });
  }
});

// Note: no /change-password route — this platform is Google OAuth only
// (see src/pages/auth/SignIn.tsx / lib/auth.ts). There's no password-based
// sign-in for a changed password to ever be used with, so this endpoint
// was removed rather than left as dead/misleading functionality.

// POST /api/profile/change-email — Supabase Auth sends a verification email
// to the new address; email is not changed until the user confirms it.
router.post('/change-email', async (req, res) => {
  try {
    const { newEmail } = req.body;
    if (!newEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(newEmail)) {
      return res.status(400).json({ error: 'A valid email is required' });
    }

    const { error } = await supabase.auth.admin.updateUserById(req.user.id, {
      email: newEmail,
    });

    if (error) throw error;
    res.json({ data: { success: true, message: 'Verification email sent to the new address' } });
  } catch (err) {
    console.error('[profile] change-email error:', err.message, err);
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/profile — deletes the Supabase Auth user. The `users` row and
// dependent rows should cascade via FK ON DELETE CASCADE where configured;
// if that's not set up in the live schema, this will need a cleanup step
// added before going live — flagging rather than guessing.
router.delete('/', async (req, res) => {
  try {
    const { error } = await supabase.auth.admin.deleteUser(req.user.id);
    if (error) throw error;
    res.json({ data: { success: true } });
  } catch (err) {
    console.error('[profile] delete error:', err.message, err);
    res.status(500).json({ error: err.message });
  }
});

export default router;
