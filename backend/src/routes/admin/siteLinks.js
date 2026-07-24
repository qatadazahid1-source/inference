import express from 'express';
import { supabase } from '../../index.js';

const router = express.Router();

const VALID_SECTIONS = ['product', 'company', 'legal', 'social'];

// ─── GET /api/admin/site-links ────────────────────────────────────────────────
// List every link (active and inactive), grouped by section.
router.get('/', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('site_links')
      .select('id, section, label, url, sort_order, is_active, created_at, updated_at')
      .order('section', { ascending: true })
      .order('sort_order', { ascending: true });

    if (error) throw error;

    res.json({ data: data || [] });
  } catch (err) {
    console.error('[admin/site-links] GET / error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// ─── POST /api/admin/site-links ───────────────────────────────────────────────
// Add a new link.
router.post('/', async (req, res) => {
  try {
    const { section, label, url, sort_order = 0 } = req.body;

    if (!section || !VALID_SECTIONS.includes(section)) {
      return res.status(400).json({ error: `section must be one of: ${VALID_SECTIONS.join(', ')}` });
    }
    if (!label || !url) {
      return res.status(400).json({ error: 'label and url are required' });
    }

    const { data, error } = await supabase
      .from('site_links')
      .insert({ section, label, url, sort_order })
      .select('id, section, label, url, sort_order, is_active, created_at, updated_at')
      .single();

    if (error) throw error;

    await supabase.from('audit_logs').insert({
      user_id: req.user.id,
      action: 'site_link.created',
      resource_type: 'site_link',
      resource_id: data.id,
      organization_id: null,
      new_values: { section, label, url },
      ip_address: req.ip || null,
    });

    res.status(201).json({ data });
  } catch (err) {
    console.error('[admin/site-links] POST / error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// ─── PUT /api/admin/site-links/:id ────────────────────────────────────────────
// Edit an existing link (label, url, sort_order, is_active).
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { label, url, sort_order, is_active } = req.body;

    const updatePayload = {};
    if (label !== undefined) updatePayload.label = label;
    if (url !== undefined) updatePayload.url = url;
    if (sort_order !== undefined) updatePayload.sort_order = sort_order;
    if (is_active !== undefined) updatePayload.is_active = is_active;
    updatePayload.updated_at = new Date().toISOString();

    const { data, error } = await supabase
      .from('site_links')
      .update(updatePayload)
      .eq('id', id)
      .select('id, section, label, url, sort_order, is_active, created_at, updated_at')
      .single();

    if (error) throw error;

    await supabase.from('audit_logs').insert({
      user_id: req.user.id,
      action: 'site_link.updated',
      resource_type: 'site_link',
      resource_id: id,
      organization_id: null,
      new_values: updatePayload,
      ip_address: req.ip || null,
    });

    res.json({ data });
  } catch (err) {
    console.error('[admin/site-links] PUT /:id error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// ─── DELETE /api/admin/site-links/:id ─────────────────────────────────────────
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const { error } = await supabase.from('site_links').delete().eq('id', id);
    if (error) throw error;

    await supabase.from('audit_logs').insert({
      user_id: req.user.id,
      action: 'site_link.deleted',
      resource_type: 'site_link',
      resource_id: id,
      organization_id: null,
      new_values: null,
      ip_address: req.ip || null,
    });

    res.status(204).send();
  } catch (err) {
    console.error('[admin/site-links] DELETE /:id error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

export default router;
