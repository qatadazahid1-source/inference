import { supabase } from '../index.js';

/**
 * requirePermission(key)
 *
 * Use AFTER requirePlatformAdmin in a route chain. Allows the request through if:
 *   - the user is a super_admin (implicit full access), OR
 *   - the user has an explicit row in admin_permissions for this key
 *
 * requirePlatformAdmin already confirmed req.user exists and is_platform_admin
 * is true — this middleware only narrows down WHICH admin sections a
 * sub_admin can touch.
 */
export function requirePermission(key) {
  return async (req, res, next) => {
    try {
      const { data: user, error } = await supabase
        .from('users')
        .select('admin_role')
        .eq('id', req.user.id)
        .single();

      if (error || !user) {
        return res.status(403).json({ error: 'Admin access required.' });
      }

      // Super admins bypass all granular checks.
      if (user.admin_role === 'super_admin') {
        return next();
      }

      const { data: grant, error: grantErr } = await supabase
        .from('admin_permissions')
        .select('permission')
        .eq('user_id', req.user.id)
        .eq('permission', key)
        .maybeSingle();

      if (grantErr) {
        console.error('[requirePermission] lookup error:', grantErr.message);
        return res.status(500).json({ error: 'Permission check failed.' });
      }

      if (!grant) {
        return res.status(403).json({
          error: `You don't have the "${key}" permission. Ask your super admin to grant it.`
        });
      }

      next();
    } catch (err) {
      console.error('[requirePermission] error:', err.message);
      res.status(500).json({ error: 'Permission check failed.' });
    }
  };
}
