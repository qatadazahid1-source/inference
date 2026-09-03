import express from 'express';
import { supabase } from '../../index.js';

const router = express.Router();

// â”€â”€â”€ GET /api/admin/reports â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
// List all generated reports platform-wide with organization context.
router.get('/', async (req, res) => {
  try {
    const { search = '', type = 'all', status = 'all' } = req.query;

    let query = supabase
      .from('reports')
      .select(`
        id, name, type, format, status, date_range_start, date_range_end,
        providers, teams, recurring, frequency, error_message,
        created_at, updated_at, organization_id, created_by
      `)
      .order('created_at', { ascending: false });

    if (type !== 'all') query = query.eq('type', type);
    if (status !== 'all') query = query.eq('status', status);

    const { data: rawReports, error } = await query;
    if (error) throw error;

    // Organizations + creators fetched separately â€” avoids PostgREST
    // embedded-join schema-cache issues seen elsewhere in this project.
    const orgIds = [...new Set((rawReports || []).map(r => r.organization_id).filter(Boolean))];
    const userIds = [...new Set((rawReports || []).map(r => r.created_by).filter(Boolean))];

    const [orgsRes, usersRes] = await Promise.all([
      orgIds.length
        ? supabase.from('organizations').select('id, name, slug').in('id', orgIds)
        : { data: [] },
      userIds.length
        ? supabase.from('users').select('id, email, full_name').in('id', userIds)
        : { data: [] },
    ]);

    const orgsById = new Map((orgsRes.data || []).map(o => [o.id, o]));
    const usersById = new Map((usersRes.data || []).map(u => [u.id, u]));

    let filtered = (rawReports || []).map(r => ({
      ...r,
      organizations: r.organization_id ? (orgsById.get(r.organization_id) || null) : null,
      created_by_user: r.created_by ? (usersById.get(r.created_by) || null) : null,
    }));

    if (search) {
      const q = search.toLowerCase();
      filtered = filtered.filter(r =>
        r.name?.toLowerCase().includes(q) ||
        r.organizations?.name?.toLowerCase().includes(q)
      );
    }

    res.json({ data: filtered });
  } catch (err) {
    console.error('[admin/reports] GET / error:', err.message);
    res.status(500).json({ error: 'An internal server error occurred.' });
  }
});

// â”€â”€â”€ POST /api/admin/reports/generate â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
// Instantly trigger or mock generation of a report.
router.post('/generate', async (req, res) => {
  try {
    const { organization_id, name, type, format } = req.body;

    if (!organization_id || !name || !type || !format) {
      return res.status(400).json({ error: 'organization_id, name, type, and format are required' });
    }

    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

    const { data: report, error } = await supabase
      .from('reports')
      .insert({
        organization_id,
        created_by: req.user.id,
        name,
        type,
        format,
        status: 'ready',
        date_range_start: monthStart.toISOString().slice(0, 10),
        date_range_end: now.toISOString().slice(0, 10),
        data_snapshot: { generated_by: 'admin_panel', note: 'Admin-triggered report' },
      })
      .select(`
        id, name, type, format, status, date_range_start, date_range_end,
        providers, teams, recurring, frequency, error_message,
        created_at, updated_at, organization_id, created_by
      `)
      .single();

    if (error) throw error;

    // Org fetched separately â€” avoids the same embedded-join schema-cache
    // issue seen elsewhere in this project.
    const { data: org, error: orgErr } = await supabase
      .from('organizations')
      .select('id, name, slug')
      .eq('id', organization_id)
      .maybeSingle();
    if (orgErr) console.warn('[admin/reports] Failed to fetch organization:', orgErr);

    const reportWithOrg = { ...report, organizations: org || null };

    await supabase.from('audit_logs').insert({
      user_id: req.user.id,
      action: 'report.generated',
      resource_type: 'report',
      resource_id: report.id,
      organization_id,
      new_values: { type, format, name },
      ip_address: req.ip || null,
    });

    res.status(201).json({ data: reportWithOrg });
  } catch (err) {
    console.error('[admin/reports] POST /generate error:', err.message);
    res.status(500).json({ error: 'An internal server error occurred.' });
  }
});

// â”€â”€â”€ DELETE /api/admin/reports/:id â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
// Admin can delete a report record.
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const { data: report, error: getErr } = await supabase
      .from('reports')
      .select('id, name, organization_id')
      .eq('id', id)
      .single();

    if (getErr) throw getErr;

    const { error: delErr } = await supabase
      .from('reports')
      .delete()
      .eq('id', id);

    if (delErr) throw delErr;

    await supabase.from('audit_logs').insert({
      user_id: req.user.id,
      action: 'report.deleted',
      resource_type: 'report',
      resource_id: id,
      organization_id: report.organization_id,
      new_values: { name: report.name },
      ip_address: req.ip || null,
    });

    res.status(204).send();
  } catch (err) {
    console.error('[admin/reports] DELETE /:id error:', err.message);
    res.status(500).json({ error: 'An internal server error occurred.' });
  }
});

// â”€â”€â”€ DELETE /api/admin/reports/bulk â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
// Bulk delete reports by id array.
router.delete('/bulk', async (req, res) => {
  try {
    const { ids } = req.body;
    if (!Array.isArray(ids) || !ids.length) {
      return res.status(400).json({ error: 'ids (non-empty array) required' });
    }

    const { error } = await supabase.from('reports').delete().in('id', ids);
    if (error) throw error;

    await supabase.from('audit_logs').insert({
      user_id: req.user.id,
      action: 'report.bulk_deleted',
      resource_type: 'report',
      resource_id: null,
      organization_id: null,
      new_values: { count: ids.length, ids },
      ip_address: req.ip || null,
    });

    res.status(204).send();
  } catch (err) {
    console.error('[admin/reports] DELETE /bulk error:', err.message);
    res.status(500).json({ error: 'An internal server error occurred.' });
  }
});

export default router;
