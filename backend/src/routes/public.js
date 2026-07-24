import express from 'express';
import { supabase } from '../index.js';

const router = express.Router();

// ─── GET /api/public/site-links ──────────────────────────────────────────────
// Unauthenticated — read by the landing page footer. Only returns active
// links, grouped by section, ordered for display.
router.get('/site-links', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('site_links')
      .select('id, section, label, url, sort_order')
      .eq('is_active', true)
      .order('sort_order', { ascending: true });

    if (error) throw error;

    const grouped = { product: [], company: [], legal: [], social: [] };
    for (const link of data || []) {
      if (grouped[link.section]) grouped[link.section].push(link);
    }

    res.json({ data: grouped });
  } catch (err) {
    console.error('[public] GET /site-links error:', err.message);
    // Fail soft — footer should render with no links rather than break
    // the whole landing page if this table has an issue.
    res.json({ data: { product: [], company: [], legal: [], social: [] } });
  }
});

export default router;
