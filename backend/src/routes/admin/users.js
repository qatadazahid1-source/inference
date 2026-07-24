import express from 'express';
import { supabase } from '../../index.js';

const router = express.Router();

// ─── GET /api/admin/users ─────────────────────────────────────────────────────
// List all users across the platform with their org membership and role.
router.get('/', async (req, res) => {
  try {
    const { search = '', limit = 50, offset = 0 } = req.query;

    let query = supabase
      .from('users')
      .select('id, full_name, email, avatar_url, created_at, is_platform_admin, is_active', { count: 'exact' })
      .order('created_at', { ascending: false })
      .range(Number(offset), Number(offset) + Number(limit) - 1);

    if (search) {
      query = query.or(`full_name.ilike.%${search}%,email.ilike.%${search}%`);
    }

    const { data: rawUsers, error, count } = await query;
    if (error) throw error;

    // Org memberships + orgs fetched separately (avoids PostgREST embedded-
    // join issues — organization_members has more than one FK to users,
    // e.g. user_id AND invited_by/created_by, so PostgREST can't auto-embed
    // without an explicit hint. Fetching separately sidesteps this entirely.)
    const userIds = (rawUsers || []).map(u => u.id);
    let membersByUser = new Map();
    if (userIds.length) {
      const { data: members, error: memErr } = await supabase
        .from('organization_members')
        .select('user_id, role, joined_at, organization_id')
        .in('user_id', userIds);
      if (memErr) console.warn('[admin/users] Failed to fetch memberships:', memErr);

      const orgIds = [...new Set((members || []).map(m => m.organization_id).filter(Boolean))];
      let orgsById = new Map();
      if (orgIds.length) {
        const { data: orgs, error: orgErr } = await supabase
          .from('organizations')
          .select('id, name, slug, is_active')
          .in('id', orgIds);
        if (orgErr) console.warn('[admin/users] Failed to fetch organizations:', orgErr);
        orgsById = new Map((orgs || []).map(o => [o.id, o]));
      }

      for (const m of members || []) {
        const list = membersByUser.get(m.user_id) || [];
        list.push({ ...m, organizations: orgsById.get(m.organization_id) || null });
        membersByUser.set(m.user_id, list);
      }
    }

    // Flatten organization membership for each user
    const users = (rawUsers || []).map(u => {
      const memberships = membersByUser.get(u.id) || [];
      return {
        id: u.id,
        full_name: u.full_name,
        email: u.email,
        avatar_url: u.avatar_url,
        created_at: u.created_at,
        is_platform_admin: u.is_platform_admin,
        is_active: u.is_active,
        // Take first membership (most users belong to one org)
        organization: memberships[0]?.organizations ?? null,
        role: memberships[0]?.role ?? null,
        joined_at: memberships[0]?.joined_at ?? null,
        org_count: memberships.length,
      };
    });

    res.json({ data: users, total: count });
  } catch (err) {
    console.error('[admin/users] GET / error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// ─── GET /api/admin/users/:id ─────────────────────────────────────────────────
// Full detail for a single user: profile + all org memberships + usage stats.
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const { data: user, error: userErr } = await supabase
      .from('users')
      .select('id, full_name, email, avatar_url, created_at, is_platform_admin, is_active')
      .eq('id', id)
      .single();

    if (userErr) throw userErr;

    // Org memberships — fetched separately (avoids nested embedded-join
    // schema-cache issues seen elsewhere in this project).
    const { data: memberships, error: memErr } = await supabase
      .from('organization_members')
      .select('role, joined_at, organization_id')
      .eq('user_id', id);
    if (memErr) console.warn('[admin/users] Failed to fetch memberships:', memErr);

    const orgIds = [...new Set((memberships || []).map(m => m.organization_id).filter(Boolean))];
    let orgsById = new Map();
    if (orgIds.length) {
      const { data: orgs, error: orgErr } = await supabase
        .from('organizations')
        .select('id, name, slug, is_active')
        .in('id', orgIds);
      if (orgErr) console.warn('[admin/users] Failed to fetch organizations:', orgErr);
      orgsById = new Map((orgs || []).map(o => [o.id, o]));
    }

    const organization_members = (memberships || []).map(m => ({
      ...m,
      organizations: orgsById.get(m.organization_id) || null
    }));

    // NOTE: api_usage_logs has no user_id column — usage is only tracked at
    // the organization level in this schema, not per individual user. As a
    // best-effort approximation, stats_30d reports the last-30-day usage
    // for the organization(s) this user belongs to.
    let stats_30d = { requests: 0, spend_usd: 0, tokens: 0 };
    if (orgIds.length) {
      const { data: usage, error: usageErr } = await supabase
        .from('api_usage_logs')
        .select('cost_usd, input_tokens, output_tokens')
        .in('organization_id', orgIds)
        .gte('logged_at', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString());
      if (usageErr) console.warn('[admin/users] Failed to fetch usage:', usageErr);

      const rows = usage || [];
      stats_30d = {
        requests: rows.length,
        spend_usd: parseFloat(rows.reduce((s, r) => s + Number(r.cost_usd || 0), 0).toFixed(4)),
        tokens: rows.reduce((s, r) => s + Number(r.input_tokens || 0) + Number(r.output_tokens || 0), 0),
      };
    }

    res.json({
      data: {
        ...user,
        organization_members,
        stats_30d,
      }
    });
  } catch (err) {
    console.error('[admin/users] GET /:id error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// ─── PUT /api/admin/users/:id/role ───────────────────────────────────────────
// Change a user's role ('admin' | 'member') within a specific organization.
router.put('/:id/role', async (req, res) => {
  try {
    const { id } = req.params;
    const { organization_id, role } = req.body;

    if (!organization_id || !['admin', 'member'].includes(role)) {
      return res.status(400).json({ error: 'organization_id and role (admin|member) required' });
    }

    const { data, error } = await supabase
      .from('organization_members')
      .update({ role })
      .eq('user_id', id)
      .eq('organization_id', organization_id)
      .select()
      .single();

    if (error) throw error;

    // Audit log
    await supabase.from('audit_logs').insert({
      user_id: req.user.id,
      action: 'user.role_changed',
      resource_type: 'user',
      resource_id: id,
      organization_id,
      new_values: { role },
      ip_address: req.ip || null,
    });

    res.json({ data });
  } catch (err) {
    console.error('[admin/users] PUT /:id/role error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// ─── PUT /api/admin/users/:id/platform-admin ─────────────────────────────────
// Toggle platform-admin status for a user.
router.put('/:id/platform-admin', async (req, res) => {
  try {
    const { id } = req.params;
    const { is_platform_admin } = req.body;

    if (typeof is_platform_admin !== 'boolean') {
      return res.status(400).json({ error: 'is_platform_admin (boolean) required' });
    }

    // Security: an admin must not be able to remove their own admin status
    if (req.user.id === id && is_platform_admin === false) {
      return res.status(400).json({ error: 'You cannot remove your own admin access.' });
    }

    const { data, error } = await supabase
      .from('users')
      .update({ is_platform_admin })
      .eq('id', id)
      .select('id, email, full_name, is_platform_admin')
      .single();

    if (error) throw error;

    // Audit log
    await supabase.from('audit_logs').insert({
      user_id: req.user.id,
      action: is_platform_admin ? 'user.granted_platform_admin' : 'user.revoked_platform_admin',
      resource_type: 'user',
      resource_id: id,
      organization_id: null,
      new_values: { is_platform_admin },
      ip_address: req.ip || null,
    });

    res.json({ data });
  } catch (err) {
    console.error('[admin/users] PUT /:id/platform-admin error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// ─── PUT /api/admin/users/:id/status ─────────────────────────────────────────
// Activate/deactivate a user's account platform-wide.
router.put('/:id/status', async (req, res) => {
  try {
    const { id } = req.params;
    const { is_active } = req.body;

    if (typeof is_active !== 'boolean') {
      return res.status(400).json({ error: 'is_active (boolean) required' });
    }

    // Safety: an admin must not be able to lock themselves out.
    if (req.user.id === id && is_active === false) {
      return res.status(400).json({ error: 'You cannot deactivate your own account.' });
    }

    const { data, error } = await supabase
      .from('users')
      .update({ is_active })
      .eq('id', id)
      .select('id, email, full_name, is_active')
      .single();

    if (error) throw error;

    await supabase.from('audit_logs').insert({
      user_id: req.user.id,
      action: is_active ? 'user.reactivated' : 'user.deactivated',
      resource_type: 'user',
      resource_id: id,
      organization_id: null,
      new_values: { is_active },
      ip_address: req.ip || null,
    });

    res.json({ data });
  } catch (err) {
    console.error('[admin/users] PUT /:id/status error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

export default router;
