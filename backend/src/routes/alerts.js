import express from 'express';
import { supabase } from '../index.js';

const router = express.Router();

// Helper: resolve organization_id server-side from JWT (same pattern as budgets.js / reports.js)
async function getUserOrgId(userId) {
  const { data, error } = await supabase
    .from('organization_members')
    .select('organization_id')
    .eq('user_id', userId)
    .eq('status', 'active')
    .limit(1)
    .maybeSingle();

  if (error || !data) {
    const { data: org } = await supabase
      .from('organizations')
      .select('id')
      .eq('user_id', userId)
      .limit(1)
      .maybeSingle();
    if (org) return org.id;
    throw new Error(`No active organization found for user ${userId}`);
  }
  return data.organization_id;
}

// Maps a DB row (alerts table) to the shape the frontend's `Alert` type expects
// (src/types/dashboard.types.ts): created_at -> time, is_read -> isRead.
function mapAlert(row) {
  return {
    id: row.id,
    type: row.type,
    severity: row.severity,
    title: row.title,
    message: row.message,
    time: row.created_at,
    isRead: row.is_read,
  };
}

// GET /api/alerts — all alerts for the org, newest first, mapped to frontend shape
router.get('/', async (req, res) => {
  try {
    const organization_id = await getUserOrgId(req.user.id);

    const { data, error } = await supabase
      .from('alerts')
      .select('id, type, severity, title, message, is_read, created_at')
      .eq('organization_id', organization_id)
      .order('created_at', { ascending: false })
      .limit(100);

    if (error) throw error;
    res.json((data || []).map(mapAlert));
  } catch (err) {
    console.error('[alerts] GET / error:', err.message, err);
    res.status(500).json({ error: 'Failed to fetch alerts' });
  }
});

// PUT /api/alerts/:id/read — mark a single alert as read
router.put('/:id/read', async (req, res) => {
  try {
    const organization_id = await getUserOrgId(req.user.id);

    const { data, error } = await supabase
      .from('alerts')
      .update({
        is_read: true,
        acknowledged_by: req.user.id,
        acknowledged_at: new Date().toISOString(),
      })
      .eq('id', req.params.id)
      .eq('organization_id', organization_id) // scope to org, same pattern as budgets.js PUT
      .select('id, type, severity, title, message, is_read, created_at')
      .single();

    if (error) throw error;
    if (!data) return res.status(404).json({ error: 'Alert not found' });

    res.json(mapAlert(data));
  } catch (err) {
    console.error('[alerts] PUT /:id/read error:', err.message, err);
    res.status(500).json({ error: 'Failed to mark alert as read' });
  }
});

// DELETE /api/alerts/:id — dismiss an alert
router.delete('/:id', async (req, res) => {
  try {
    const organization_id = await getUserOrgId(req.user.id);

    const { error } = await supabase
      .from('alerts')
      .delete()
      .eq('id', req.params.id)
      .eq('organization_id', organization_id);

    if (error) throw error;

    // 204 No Content — fetchWithAuth() on the frontend already handles
    // empty-body responses correctly (see dashboard.service.ts).
    res.status(204).send();
  } catch (err) {
    console.error('[alerts] DELETE /:id error:', err.message, err);
    res.status(500).json({ error: 'Failed to dismiss alert' });
  }
});

export default router;
