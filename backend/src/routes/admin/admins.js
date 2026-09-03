import express from 'express';
import { supabase } from '../../index.js';

const router = express.Router();

// Middleware: only a super_admin may touch any route in this file.
// (requirePlatformAdmin has already run at the /api/admin mount point â€”
// this adds the stricter super_admin-only check on top of it.)
async function requireSuperAdmin(req, res, next) {
  try {
    const { data: user, error } = await supabase
      .from('users')
      .select('admin_role')
      .eq('id', req.user.id)
      .single();

    if (error || user?.admin_role !== 'super_admin') {
      return res.status(403).json({ error: 'Only the super admin can manage admin accounts.' });
    }
    next();
  } catch (err) {
    res.status(500).json({ error: 'An internal server error occurred.' });
  }
}

router.use(requireSuperAdmin);

// â”€â”€â”€ GET /api/admin/admins â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
// List every admin (super_admin + sub_admins) with their granted permissions.
router.get('/', async (req, res) => {
  try {
    const { data: admins, error } = await supabase
      .from('users')
      .select('id, email, full_name, avatar_url, admin_role, is_platform_admin, created_at')
      .eq('is_platform_admin', true)
      .order('created_at', { ascending: true });

    if (error) throw error;

    const adminIds = (admins || []).map(a => a.id);
    let permsByUser = new Map();
    if (adminIds.length) {
      const { data: perms, error: permErr } = await supabase
        .from('admin_permissions')
        .select('user_id, permission')
        .in('user_id', adminIds);
      if (permErr) console.warn('[admin/admins] Failed to fetch permissions:', permErr);

      for (const p of perms || []) {
        const list = permsByUser.get(p.user_id) || [];
        list.push(p.permission);
        permsByUser.set(p.user_id, list);
      }
    }

    const data = (admins || []).map(a => ({
      ...a,
      permissions: a.admin_role === 'super_admin' ? ['*'] : (permsByUser.get(a.id) || []),
    }));

    res.json({ data });
  } catch (err) {
    console.error('[admin/admins] GET / error:', err.message);
    res.status(500).json({ error: 'An internal server error occurred.' });
  }
});

// â”€â”€â”€ GET /api/admin/admins/permission-catalog â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
// Returns the fixed list of assignable permission keys, grouped by category.
router.get('/permission-catalog', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('admin_permission_catalog')
      .select('key, label, category')
      .order('category', { ascending: true });

    if (error) throw error;
    res.json({ data });
  } catch (err) {
    console.error('[admin/admins] GET /permission-catalog error:', err.message);
    res.status(500).json({ error: 'An internal server error occurred.' });
  }
});

// â”€â”€â”€ POST /api/admin/admins/:userId/promote â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
// Make a regular user into a sub_admin (is_platform_admin = true, admin_role = 'sub_admin').
// They start with ZERO permissions â€” the super admin must explicitly grant each one.
router.post('/:userId/promote', async (req, res) => {
  const { userId } = req.params;
  try {
    const { data, error } = await supabase
      .from('users')
      .update({ is_platform_admin: true, admin_role: 'sub_admin' })
      .eq('id', userId)
      .select('id, email, full_name, is_platform_admin, admin_role')
      .single();

    if (error) throw error;

    await supabase.from('audit_logs').insert({
      user_id: req.user.id,
      action: 'admin.promoted',
      resource_type: 'user',
      resource_id: userId,
      organization_id: null,
      new_values: { admin_role: 'sub_admin' },
      ip_address: req.ip || null,
    });

    res.json({ data });
  } catch (err) {
    console.error('[admin/admins] POST /:userId/promote error:', err.message);
    res.status(500).json({ error: 'An internal server error occurred.' });
  }
});

// â”€â”€â”€ POST /api/admin/admins/:userId/demote â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
// Remove admin access entirely from a sub_admin (cannot demote a super_admin
// through this route â€” that requires a manual DB change for safety).
router.post('/:userId/demote', async (req, res) => {
  const { userId } = req.params;

  if (userId === req.user.id) {
    return res.status(400).json({ error: 'You cannot demote yourself.' });
  }

  try {
    const { data: target, error: targetErr } = await supabase
      .from('users')
      .select('admin_role')
      .eq('id', userId)
      .single();

    if (targetErr) throw targetErr;
    if (target?.admin_role === 'super_admin') {
      return res.status(400).json({ error: 'The super admin cannot be demoted from the UI.' });
    }

    const { data, error } = await supabase
      .from('users')
      .update({ is_platform_admin: false, admin_role: null })
      .eq('id', userId)
      .select('id, email, full_name, is_platform_admin, admin_role')
      .single();

    if (error) throw error;

    // Clean up their permission grants too.
    await supabase.from('admin_permissions').delete().eq('user_id', userId);

    await supabase.from('audit_logs').insert({
      user_id: req.user.id,
      action: 'admin.demoted',
      resource_type: 'user',
      resource_id: userId,
      organization_id: null,
      new_values: { is_platform_admin: false },
      ip_address: req.ip || null,
    });

    res.json({ data });
  } catch (err) {
    console.error('[admin/admins] POST /:userId/demote error:', err.message);
    res.status(500).json({ error: 'An internal server error occurred.' });
  }
});

// â”€â”€â”€ PUT /api/admin/admins/:userId/permissions â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
// Body: { permissions: string[] } â€” the FULL desired permission set for this
// sub_admin. Replaces whatever they currently have (simplest mental model:
// "this checkbox list is exactly what they can do").
router.put('/:userId/permissions', async (req, res) => {
  const { userId } = req.params;
  const { permissions } = req.body;

  if (!Array.isArray(permissions)) {
    return res.status(400).json({ error: 'permissions must be an array of permission keys.' });
  }

  try {
    const { data: target, error: targetErr } = await supabase
      .from('users')
      .select('admin_role')
      .eq('id', userId)
      .single();

    if (targetErr) throw targetErr;
    if (target?.admin_role !== 'sub_admin') {
      return res.status(400).json({ error: 'Permissions can only be assigned to sub_admins.' });
    }

    // Replace: delete existing grants, insert the new set.
    const { error: delErr } = await supabase.from('admin_permissions').delete().eq('user_id', userId);
    if (delErr) throw delErr;

    if (permissions.length) {
      const rows = permissions.map(p => ({ user_id: userId, permission: p, granted_by: req.user.id }));
      const { error: insErr } = await supabase.from('admin_permissions').insert(rows);
      if (insErr) throw insErr;
    }

    await supabase.from('audit_logs').insert({
      user_id: req.user.id,
      action: 'admin.permissions_updated',
      resource_type: 'user',
      resource_id: userId,
      organization_id: null,
      new_values: { permissions },
      ip_address: req.ip || null,
    });

    res.json({ success: true, data: { user_id: userId, permissions } });
  } catch (err) {
    console.error('[admin/admins] PUT /:userId/permissions error:', err.message);
    res.status(500).json({ error: 'An internal server error occurred.' });
  }
});

export default router;
