import express from 'express';
import crypto from 'crypto';
import { supabase } from '../index.js';
import { attachEntitlements } from '../middleware/requireEntitlements.js';

const router = express.Router();

// Helper: resolve organization_id server-side from JWT (same pattern as
// budgets.js / reports.js / alertRules.js)
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

const KEY_PREFIX = 'ii_sk_live_';

function generatePlatformKey() {
  const randomPart = crypto.randomBytes(24).toString('hex'); // 48 chars
  const plainKey = `${KEY_PREFIX}${randomPart}`;
  const keyHash = crypto.createHash('sha256').update(plainKey).digest('hex');
  // Preview only ever shows the prefix + last 4 chars, e.g. "ii_sk_live_...a1b2"
  // — never enough to reconstruct the key, just enough for the user to
  // recognize which one they're looking at in the dashboard.
  const keyPreview = `${KEY_PREFIX}••••${randomPart.slice(-4)}`;
  return { plainKey, keyHash, keyPreview };
}

function mapKey(row) {
  return {
    id: row.id,
    name: row.name,
    keyPreview: row.key_preview,
    integrationId: row.integration_id,
    isActive: row.is_active,
    lastUsedAt: row.last_used_at,
    createdAt: row.created_at,
  };
}

// GET /api/platform-keys — list all platform keys for the org.
// Optional ?integration_id= filter, used by the Integrations page to show
// only the keys tied to one specific provider card.
router.get('/', async (req, res) => {
  try {
    const organization_id = await getUserOrgId(req.user.id);

    let query = supabase
      .from('api_keys')
      .select('id, name, key_preview, integration_id, is_active, last_used_at, created_at')
      .eq('organization_id', organization_id)
      .order('created_at', { ascending: false });

    if (req.query.integration_id) {
      query = query.eq('integration_id', req.query.integration_id);
    }

    const { data, error } = await query;
    if (error) throw error;

    res.json((data || []).map(mapKey));
  } catch (err) {
    console.error('[platformKeys] GET / error:', err.message, err);
    res.status(500).json({ error: 'Failed to fetch platform keys' });
  }
});

// POST /api/platform-keys — generate a new platform key for a given
// integration. The plain key is returned ONLY in this response; after this,
// only key_preview is ever retrievable.
router.post('/', attachEntitlements, async (req, res) => {
  try {
    const { integration_id, name } = req.body;

    if (!integration_id || !name) {
      return res.status(400).json({ error: 'integration_id and name are required' });
    }

    const organization_id = await getUserOrgId(req.user.id);

    // Enforce max_platform_keys limit
    const { count, error: countErr } = await supabase
      .from('api_keys')
      .select('*', { count: 'exact', head: true })
      .eq('organization_id', organization_id)
      .eq('is_active', true);
    
    if (countErr) throw countErr;
    if (!req.entitlements.checkLimit('platform_keys', count)) {
      const maxPlatformKeys = req.entitlements.getLimit('platform_keys');
      return res.status(403).json({ error: `Plan limit reached. You can only create up to ${maxPlatformKeys} platform keys.` });
    }

    // Confirm the integration belongs to this org and is active — never let
    // a user mint a key for an integration they don't own or that's been
    // disconnected.
    const { data: integration, error: intError } = await supabase
      .from('ai_integrations')
      .select('id, status')
      .eq('id', integration_id)
      .eq('organization_id', organization_id)
      .maybeSingle();

    if (intError || !integration) {
      return res.status(404).json({ error: 'Integration not found' });
    }
    if (integration.status !== 'active') {
      return res.status(400).json({ error: 'Cannot create a platform key for an inactive integration' });
    }

    const { plainKey, keyHash, keyPreview } = generatePlatformKey();

    const { data, error } = await supabase
      .from('api_keys')
      .insert({
        organization_id,
        user_id: req.user.id,
        integration_id,
        name,
        key_hash: keyHash,
        key_preview: keyPreview,
        is_active: true,
      })
      .select('id, name, key_preview, integration_id, is_active, last_used_at, created_at')
      .single();

    if (error) throw error;

    res.status(201).json({
      ...mapKey(data),
      // Only field that's ever sent back in full — the caller must show
      // this once and discard it.
      plainKey,
    });
  } catch (err) {
    console.error('[platformKeys] POST / error:', err.message, err);
    res.status(500).json({ error: 'Failed to create platform key' });
  }
});

// DELETE /api/platform-keys/:id — revoke (soft-delete). We never hard-delete
// because api_usage_logs rows may reference requests made with this key
// (via metadata.platform_key_id), and we don't want to break that history.
router.delete('/:id', async (req, res) => {
  try {
    const organization_id = await getUserOrgId(req.user.id);

    const { data, error } = await supabase
      .from('api_keys')
      .update({ is_active: false })
      .eq('id', req.params.id)
      .eq('organization_id', organization_id)
      .select('id')
      .single();

    if (error) throw error;
    if (!data) return res.status(404).json({ error: 'Platform key not found' });

    res.status(204).send();
  } catch (err) {
    console.error('[platformKeys] DELETE /:id error:', err.message, err);
    res.status(500).json({ error: 'Failed to revoke platform key' });
  }
});

export default router;
