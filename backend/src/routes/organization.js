import express from 'express';
import { supabase } from '../index.js';

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

export default router;
