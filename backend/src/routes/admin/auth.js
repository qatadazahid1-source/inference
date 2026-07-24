import express from 'express';
import { supabase } from '../../index.js';

const router = express.Router();

/**
 * GET /api/admin/auth/me
 *
 * Returns whether the current authenticated user is a platform admin.
 * Frontend uses this on app load to conditionally show the Admin link.
 * Never stores result in localStorage — lives only in React state.
 */
router.get('/me', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('users')
      .select('is_platform_admin, admin_role')
      .eq('id', req.user.id)
      .single();

    if (error) throw error;

    let permissions = [];
    if (data?.admin_role === 'super_admin') {
      permissions = ['*']; // full access, no need to check the grants table
    } else if (data?.admin_role === 'sub_admin') {
      const { data: grants, error: grantErr } = await supabase
        .from('admin_permissions')
        .select('permission')
        .eq('user_id', req.user.id);
      if (grantErr) console.warn('[admin/auth] Failed to fetch permissions:', grantErr);
      permissions = (grants || []).map(g => g.permission);
    }

    res.json({
      is_platform_admin: data?.is_platform_admin ?? false,
      admin_role: data?.admin_role ?? null,
      permissions,
    });
  } catch (err) {
    console.error('[admin/auth] GET /me error:', err.message);
    res.status(500).json({ error: 'Failed to fetch admin status.' });
  }
});

export default router;
