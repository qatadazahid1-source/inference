import express from 'express';
import { supabase } from '../../index.js';

const router = express.Router();

const SLUG_PATTERN = /^[a-z0-9]+(-[a-z0-9]+)*$/;
const SELECT_COLS = 'id, slug, title, content, meta_title, meta_description, meta_keywords, canonical_url, og_image, robots, content_blocks, is_published, created_at, updated_at';

// ─── GET /api/admin/pages ──────────────────────────────────────────────────
// List every page (published and draft).
router.get('/', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('static_pages')
      .select(SELECT_COLS)
      .order('title', { ascending: true });

    if (error) throw error;

    res.json({ data: data || [] });
  } catch (err) {
    console.error('[admin/pages] GET / error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// ─── POST /api/admin/pages ─────────────────────────────────────────────────
// Create a new page.
router.post('/', async (req, res) => {
  try {
    const {
      slug,
      title,
      content = '',
      meta_title = '',
      meta_description = '',
      meta_keywords = null,
      canonical_url = null,
      og_image = null,
      robots = null,
      content_blocks = null,
      is_published = false,
    } = req.body;

    if (!slug || !SLUG_PATTERN.test(slug)) {
      return res.status(400).json({ error: 'slug is required and must be lowercase letters, numbers and hyphens only (e.g. "privacy-policy")' });
    }
    if (!title) {
      return res.status(400).json({ error: 'title is required' });
    }

    const { data, error } = await supabase
      .from('static_pages')
      .insert({ slug, title, content, meta_title, meta_description, meta_keywords, canonical_url, og_image, robots, content_blocks, is_published })
      .select(SELECT_COLS)
      .single();

    if (error) {
      if (error.code === '23505') {
        return res.status(409).json({ error: `A page with slug "${slug}" already exists.` });
      }
      throw error;
    }

    await supabase.from('audit_logs').insert({
      user_id: req.user.id,
      action: 'static_page.created',
      resource_type: 'static_page',
      resource_id: data.id,
      organization_id: null,
      new_values: { slug, title, is_published },
      ip_address: req.ip || null,
    });

    res.status(201).json({ data });
  } catch (err) {
    console.error('[admin/pages] POST / error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// ─── PUT /api/admin/pages/:id ───────────────────────────────────────────────
// Edit an existing page (any subset of fields).
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { slug, title, content, meta_title, meta_description, meta_keywords, canonical_url, og_image, robots, content_blocks, is_published } = req.body;

    if (slug !== undefined && !SLUG_PATTERN.test(slug)) {
      return res.status(400).json({ error: 'slug must be lowercase letters, numbers and hyphens only (e.g. "privacy-policy")' });
    }

    const updatePayload = {};
    if (slug !== undefined) updatePayload.slug = slug;
    if (title !== undefined) updatePayload.title = title;
    if (content !== undefined) updatePayload.content = content;
    if (meta_title !== undefined) updatePayload.meta_title = meta_title;
    if (meta_description !== undefined) updatePayload.meta_description = meta_description;
    if (meta_keywords !== undefined) updatePayload.meta_keywords = meta_keywords;
    if (canonical_url !== undefined) updatePayload.canonical_url = canonical_url;
    if (og_image !== undefined) updatePayload.og_image = og_image;
    if (robots !== undefined) updatePayload.robots = robots;
    if (content_blocks !== undefined) updatePayload.content_blocks = content_blocks;
    if (is_published !== undefined) updatePayload.is_published = is_published;

    const { data, error } = await supabase
      .from('static_pages')
      .update(updatePayload)
      .eq('id', id)
      .select(SELECT_COLS)
      .single();

    if (error) {
      if (error.code === '23505') {
        return res.status(409).json({ error: `A page with slug "${slug}" already exists.` });
      }
      throw error;
    }

    await supabase.from('audit_logs').insert({
      user_id: req.user.id,
      action: 'static_page.updated',
      resource_type: 'static_page',
      resource_id: id,
      organization_id: null,
      new_values: updatePayload,
      ip_address: req.ip || null,
    });

    res.json({ data });
  } catch (err) {
    console.error('[admin/pages] PUT /:id error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// ─── DELETE /api/admin/pages/:id ────────────────────────────────────────────
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const { error } = await supabase.from('static_pages').delete().eq('id', id);
    if (error) throw error;

    await supabase.from('audit_logs').insert({
      user_id: req.user.id,
      action: 'static_page.deleted',
      resource_type: 'static_page',
      resource_id: id,
      organization_id: null,
      new_values: null,
      ip_address: req.ip || null,
    });

    res.status(204).send();
  } catch (err) {
    console.error('[admin/pages] DELETE /:id error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

export default router;
