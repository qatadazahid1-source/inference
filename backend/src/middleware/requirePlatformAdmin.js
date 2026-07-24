import { supabase } from '../index.js';

/**
 * requirePlatformAdmin
 *
 * Checks that the authenticated user has is_platform_admin = true in public.users.
 * Must be used AFTER requireAuth (which sets req.user).
 * Applied once at admin/index.js — never duplicated elsewhere.
 *
 * Returns:
 *   401 — if req.user is not set (requireAuth wasn't applied)
 *   403 — if user is not a platform admin
 */
export const requirePlatformAdmin = async (req, res, next) => {
  if (!req.user?.id) {
    return res.status(401).json({ error: 'Unauthorized.' });
  }

  try {
    const { data, error } = await supabase
      .from('users')
      .select('is_platform_admin')
      .eq('id', req.user.id)
      .single();

    if (error || !data?.is_platform_admin) {
      return res.status(403).json({ error: 'Admin access required.' });
    }

    next();
  } catch (err) {
    console.error('[requirePlatformAdmin] Error:', err.message);
    return res.status(500).json({ error: 'Authorization check failed.' });
  }
};
