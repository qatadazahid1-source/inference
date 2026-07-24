import express from 'express';
import { supabase } from '../../index.js';

const router = express.Router();

// ─── GET /api/admin/integrations ──────────────────────────────────────────────
// List all AI integrations platform-wide with organization details.
// Note: We omit api_key_hash for security.
router.get('/', async (req, res) => {
  try {
    const { search = '', provider = 'all', status = 'all' } = req.query;

    let query = supabase
      .from('ai_integrations')
      .select(`
        id, provider, display_name, api_key_preview, status,
        last_sync_at, error_message, created_at, organization_id
      `)
      .order('created_at', { ascending: false });

    if (provider !== 'all') {
      query = query.eq('provider', provider);
    }
    if (status !== 'all') {
      query = query.eq('status', status);
    }

    const { data: rawIntegrations, error } = await query;
    if (error) throw error;

    // Organizations fetched separately — avoids PostgREST embedded-join
    // schema-cache issues seen elsewhere in this project.
    const orgIds = [...new Set((rawIntegrations || []).map(i => i.organization_id).filter(Boolean))];
    let orgsById = new Map();
    if (orgIds.length) {
      const { data: orgs, error: orgErr } = await supabase
        .from('organizations')
        .select('id, name, slug, is_active')
        .in('id', orgIds);
      if (orgErr) console.warn('[admin/integrations] Failed to fetch organizations:', orgErr);
      orgsById = new Map((orgs || []).map(o => [o.id, o]));
    }

    let filtered = (rawIntegrations || []).map(i => ({
      ...i,
      organizations: i.organization_id ? (orgsById.get(i.organization_id) || null) : null
    }));

    if (search) {
      const q = search.toLowerCase();
      filtered = filtered.filter(i =>
        i.display_name?.toLowerCase().includes(q) ||
        i.organizations?.name?.toLowerCase().includes(q)
      );
    }

    res.json({ data: filtered });
  } catch (err) {
    console.error('[admin/integrations] GET / error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// ─── PUT /api/admin/integrations/:id/status ───────────────────────────────────
// Admin can suspend/deactivate or reactivate an integration.
router.put('/:id/status', async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body; // 'active' | 'inactive'

    if (!['active', 'inactive'].includes(status)) {
      return res.status(400).json({ error: "status must be 'active' or 'inactive'" });
    }

    const { data: integration, error } = await supabase
      .from('ai_integrations')
      .update({ status })
      .eq('id', id)
      .select('id, display_name, provider, status, organization_id')
      .single();

    if (error) throw error;

    // Log the action
    await supabase.from('audit_logs').insert({
      user_id: req.user.id,
      action: status === 'active' ? 'integration.reactivated' : 'integration.suspended',
      resource_type: 'integration',
      resource_id: id,
      organization_id: integration.organization_id,
      new_values: { status },
      ip_address: req.ip || null,
    });

    res.json({ data: integration });
  } catch (err) {
    console.error('[admin/integrations] PUT /status error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

export default router;
