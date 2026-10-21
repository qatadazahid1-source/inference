import express from 'express';
import { supabase } from '../index.js';
import { attachEntitlements, requireFeature } from '../middleware/requireEntitlements.js';
import {
  getSystemCuratedModels,
  getUserAddedModels,
  MAX_CURATED_MODELS,
} from '../services/benchmarkCurationService.js';

const router = express.Router();

/**
 * GET /api/benchmarks
 * Returns:
 *   - Section A: System-Curated Models (at most 20 admin-selected premium models)
 *   - Section B: Added by You (approved, usable custom models for the current user/org)
 * Protected by requireAuth, attachEntitlements, and requireFeature('benchmarks').
 * Optimized: Never downloads the entire ~1,000 model catalog.
 */
router.get('/', attachEntitlements, requireFeature('benchmarks'), async (req, res) => {
  try {
    // 1. Resolve user organization for tenant-isolated user-added models
    const { data: member } = await supabase
      .from('organization_members')
      .select('organization_id')
      .eq('user_id', req.user.id)
      .eq('status', 'active')
      .limit(1)
      .maybeSingle();

    const orgId = member?.organization_id || null;

    // 2. Fetch curated models (strictly <= 20)
    const curated = await getSystemCuratedModels();

    // 3. Fetch approved user/org-associated models
    const userAdded = await getUserAddedModels(req.user.id, orgId);

    // 4. Return structured response
    res.json({
      data: {
        curated: curated.slice(0, MAX_CURATED_MODELS),
        user_added: userAdded,
        total_curated: Math.min(curated.length, MAX_CURATED_MODELS),
        total_user_added: userAdded.length,
        max_curated_limit: MAX_CURATED_MODELS,
      },
    });
  } catch (err) {
    console.error('[benchmarks] GET / error:', err.message);
    res.status(500).json({ error: 'Failed to fetch benchmark data' });
  }
});

export default router;
