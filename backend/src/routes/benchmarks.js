import express from 'express';
import { supabase } from '../index.js';
import { attachEntitlements, requireFeature } from '../middleware/requireEntitlements.js';

const router = express.Router();

/**
 * GET /api/benchmarks
 * Returns active model pricing & benchmark metrics for authorized users.
 * Protected by requireAuth, attachEntitlements, and requireFeature('benchmarks').
 */
router.get('/', attachEntitlements, requireFeature('benchmarks'), async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('model_pricing')
      .select('id, provider, model, input_cost_per_1k, output_cost_per_1k, access_tier, is_active')
      .eq('is_active', true)
      .order('provider', { ascending: true })
      .order('model', { ascending: true });

    if (error) throw error;

    res.json({ data: data || [] });
  } catch (err) {
    console.error('[benchmarks] GET / error:', err.message);
    res.status(500).json({ error: 'Failed to fetch benchmark data' });
  }
});

export default router;
