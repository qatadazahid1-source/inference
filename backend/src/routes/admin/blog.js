import express from 'express';
import { supabase } from '../../index.js';

const router = express.Router();

const SLUG_PATTERN = /^[a-z0-9]+(-[a-z0-9]+)*$/;
const SELECT_COLS =
  'id, slug, title, excerpt, body, author, category, tags, featured_image, meta_title, meta_description, meta_keywords, canonical_url, og_image, robots, status, published_at, created_at, updated_at';

// Normalise a loose tags value (array or comma string) into a clean string[].
function normaliseTags(tags) {
  if (Array.isArray(tags)) {
    return tags.map((t) => String(t).trim()).filter(Boolean);
  }
  if (typeof tags === 'string') {
    return tags
      .split(',')
      .map((t) => t.trim())
      .filter(Boolean);
  }
  return [];
}

// ─── GET /api/admin/blog ────────────────────────────────────────────────────
// List every post (published and draft), newest first.
router.get('/', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('blog_posts')
      .select(SELECT_COLS)
      .order('created_at', { ascending: false });

    if (error) throw error;

    res.json({ data: data || [] });
  } catch (err) {
    console.error('[admin/blog] GET / error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// ─── POST /api/admin/blog ───────────────────────────────────────────────────
// Create a new post.
router.post('/', async (req, res) => {
  try {
    const {
      slug,
      title,
      excerpt = null,
      body = null,
      author = null,
      category = null,
      tags = [],
      featured_image = null,
      meta_title = null,
      meta_description = null,
      meta_keywords = null,
      canonical_url = null,
      og_image = null,
      robots = null,
      status = 'draft',
      published_at = null,
    } = req.body;

    if (!slug || !SLUG_PATTERN.test(slug)) {
      return res.status(400).json({
        error:
          'slug is required and must be lowercase letters, numbers and hyphens only (e.g. "llm-cost-tracking")',
      });
    }
    if (!title) {
      return res.status(400).json({ error: 'title is required' });
    }
    if (status !== 'draft' && status !== 'published') {
      return res.status(400).json({ error: 'status must be "draft" or "published"' });
    }

    // Stamp published_at on first publish if the client didn't supply one.
    const resolvedPublishedAt =
      status === 'published' ? published_at || new Date().toISOString() : published_at;

    const { data, error } = await supabase
      .from('blog_posts')
      .insert({
        slug,
        title,
        excerpt,
        body,
        author,
        category,
        tags: normaliseTags(tags),
        featured_image,
        meta_title,
        meta_description,
        meta_keywords,
        canonical_url,
        og_image,
        robots,
        status,
        published_at: resolvedPublishedAt,
      })
      .select(SELECT_COLS)
      .single();

    if (error) {
      if (error.code === '23505') {
        return res.status(409).json({ error: `A post with slug "${slug}" already exists.` });
      }
      throw error;
    }

    await supabase.from('audit_logs').insert({
      user_id: req.user.id,
      action: 'blog_post.created',
      resource_type: 'blog_post',
      resource_id: data.id,
      organization_id: null,
      new_values: { slug, title, status },
      ip_address: req.ip || null,
    });

    res.status(201).json({ data });
  } catch (err) {
    console.error('[admin/blog] POST / error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// ─── PUT /api/admin/blog/:id ────────────────────────────────────────────────
// Edit an existing post (any subset of fields). Handles publish/unpublish.
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const {
      slug,
      title,
      excerpt,
      body,
      author,
      category,
      tags,
      featured_image,
      meta_title,
      meta_description,
      meta_keywords,
      canonical_url,
      og_image,
      robots,
      status,
      published_at,
    } = req.body;

    if (slug !== undefined && !SLUG_PATTERN.test(slug)) {
      return res.status(400).json({
        error: 'slug must be lowercase letters, numbers and hyphens only (e.g. "llm-cost-tracking")',
      });
    }
    if (status !== undefined && status !== 'draft' && status !== 'published') {
      return res.status(400).json({ error: 'status must be "draft" or "published"' });
    }

    const updatePayload = {};
    if (slug !== undefined) updatePayload.slug = slug;
    if (title !== undefined) updatePayload.title = title;
    if (excerpt !== undefined) updatePayload.excerpt = excerpt;
    if (body !== undefined) updatePayload.body = body;
    if (author !== undefined) updatePayload.author = author;
    if (category !== undefined) updatePayload.category = category;
    if (tags !== undefined) updatePayload.tags = normaliseTags(tags);
    if (featured_image !== undefined) updatePayload.featured_image = featured_image;
    if (meta_title !== undefined) updatePayload.meta_title = meta_title;
    if (meta_description !== undefined) updatePayload.meta_description = meta_description;
    if (meta_keywords !== undefined) updatePayload.meta_keywords = meta_keywords;
    if (canonical_url !== undefined) updatePayload.canonical_url = canonical_url;
    if (og_image !== undefined) updatePayload.og_image = og_image;
    if (robots !== undefined) updatePayload.robots = robots;
    if (status !== undefined) updatePayload.status = status;

    // published_at handling: explicit value wins; otherwise stamp on first
    // transition to published, and leave untouched on unpublish (preserving
    // the original publish date for re-publish).
    if (published_at !== undefined) {
      updatePayload.published_at = published_at;
    } else if (status === 'published') {
      // Only stamp if the row has no published_at yet.
      const { data: existing } = await supabase
        .from('blog_posts')
        .select('published_at')
        .eq('id', id)
        .maybeSingle();
      if (existing && !existing.published_at) {
        updatePayload.published_at = new Date().toISOString();
      }
    }

    const { data, error } = await supabase
      .from('blog_posts')
      .update(updatePayload)
      .eq('id', id)
      .select(SELECT_COLS)
      .single();

    if (error) {
      if (error.code === '23505') {
        return res.status(409).json({ error: `A post with slug "${slug}" already exists.` });
      }
      throw error;
    }

    await supabase.from('audit_logs').insert({
      user_id: req.user.id,
      action: 'blog_post.updated',
      resource_type: 'blog_post',
      resource_id: id,
      organization_id: null,
      new_values: updatePayload,
      ip_address: req.ip || null,
    });

    res.json({ data });
  } catch (err) {
    console.error('[admin/blog] PUT /:id error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// ─── DELETE /api/admin/blog/:id ─────────────────────────────────────────────
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const { error } = await supabase.from('blog_posts').delete().eq('id', id);
    if (error) throw error;

    await supabase.from('audit_logs').insert({
      user_id: req.user.id,
      action: 'blog_post.deleted',
      resource_type: 'blog_post',
      resource_id: id,
      organization_id: null,
      new_values: null,
      ip_address: req.ip || null,
    });

    res.status(204).send();
  } catch (err) {
    console.error('[admin/blog] DELETE /:id error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

export default router;
