import express from 'express';
import { supabase } from '../index.js';
import { encrypt } from '../utils/encryption.js';

const router = express.Router();

// Helper: resolve the organization_id for the currently authenticated user.
// We never trust organization_id from the frontend — it is always looked up
// server-side from organization_members, using the verified user id from the JWT.
async function getOrganizationIdForUser(userId) {
  const { data, error } = await supabase
    .from('organization_members')
    .select('organization_id')
    .eq('user_id', userId)
    .eq('status', 'active')
    .limit(1)
    .single();

  if (error) {
    throw new Error(`Could not resolve organization for user ${userId}: ${error.message}`);
  }

  return data.organization_id;
}

// Get all API keys (integrations) for the authenticated user's organization
router.get('/', async (req, res) => {
  try {
    const organization_id = await getOrganizationIdForUser(req.user.id);

    const { data, error } = await supabase
      .from('ai_integrations')
      .select('*')
      .eq('organization_id', organization_id)
      .order('created_at', { ascending: false });

    if (error) throw error;

    // Attach a count of active platform keys per integration, so the
    // frontend can show "2 active API keys" on the card and warn before
    // a disconnect that would revoke them.
    const integrations = data || [];
    if (integrations.length > 0) {
      const { data: keyRows, error: keysError } = await supabase
        .from('api_keys')
        .select('integration_id')
        .eq('organization_id', organization_id)
        .eq('is_active', true);

      if (keysError) throw keysError;

      const countByIntegration = {};
      (keyRows || []).forEach((row) => {
        countByIntegration[row.integration_id] = (countByIntegration[row.integration_id] || 0) + 1;
      });

      integrations.forEach((integration) => {
        integration.active_platform_keys = countByIntegration[integration.id] || 0;
      });
    }

    res.json({ data: integrations });
  } catch (err) {
    console.error('[api-keys] GET error:', err.message, err);
    res.status(500).json({ error: err.message });
  }
});

// Create a new API key (integration)
router.post('/', async (req, res) => {
  const { provider, display_name, api_key } = req.body;
  try {
    const organization_id = await getOrganizationIdForUser(req.user.id);

    if (!provider || !display_name || !api_key) {
      return res.status(400).json({ error: 'provider, display_name, and api_key are all required' });
    }

    // Encrypt the API key using AES-256-GCM
    const api_key_preview = api_key.substring(0, 3) + '...' + api_key.slice(-4);
    const api_key_hash = encrypt(api_key);

    const { data, error } = await supabase
      .from('ai_integrations')
      .insert({
        organization_id,
        provider,
        display_name,
        api_key_hash,
        api_key_preview,
        created_by: req.user.id,
        status: 'active'
      })
      .select()
      .single();

    if (error) throw error;
    res.json({ data });
  } catch (err) {
    console.error('[api-keys] POST error:', err.message, err);
    res.status(500).json({ error: err.message });
  }
});

// Update an existing API key (integration) — display name and/or the key itself.
// api_key is OPTIONAL on update: if the user only wants to rename the integration,
// they can omit it and the existing encrypted key is left untouched.
router.put('/:id', async (req, res) => {
  const { id } = req.params;
  const { display_name, api_key } = req.body;

  try {
    const organization_id = await getOrganizationIdForUser(req.user.id);

    if (!display_name && !api_key) {
      return res.status(400).json({ error: 'Provide at least display_name or api_key to update' });
    }

    const updatePayload = { updated_at: new Date().toISOString() };

    if (display_name) {
      updatePayload.display_name = display_name;
    }

    if (api_key) {
      updatePayload.api_key_preview = api_key.substring(0, 3) + '...' + api_key.slice(-4);
      updatePayload.api_key_hash = encrypt(api_key);
    }

    // Scope the update to the user's own organization, same as DELETE, so a
    // user can never edit another organization's integration by guessing an id.
    const { data, error } = await supabase
      .from('ai_integrations')
      .update(updatePayload)
      .eq('id', id)
      .eq('organization_id', organization_id)
      .select()
      .single();

    if (error) throw error;

    if (!data) {
      return res.status(404).json({ error: 'Integration not found' });
    }

    res.json({ data });
  } catch (err) {
    console.error('[api-keys] PUT error:', err.message, err);
    res.status(500).json({ error: err.message });
  }
});

// Delete an API key
router.delete('/:id', async (req, res) => {
  const { id } = req.params;
  try {
    const organization_id = await getOrganizationIdForUser(req.user.id);

    // Revoke any active platform keys tied to this integration first. We
    // do this before the delete (not relying on a DB cascade) so it's
    // explicit and so a failure here stops the integration from being
    // deleted with dangling active keys left behind. This is a soft-revoke
    // (is_active = false), never a hard-delete — api_usage_logs rows may
    // still reference these keys via metadata.platform_key_id.
    const { error: revokeError } = await supabase
      .from('api_keys')
      .update({ is_active: false })
      .eq('integration_id', id)
      .eq('organization_id', organization_id)
      .eq('is_active', true);

    if (revokeError) throw revokeError;

    // Scope the delete to the user's own organization so users can never
    // delete another organization's integration by guessing an id.
    const { error } = await supabase
      .from('ai_integrations')
      .delete()
      .eq('id', id)
      .eq('organization_id', organization_id);

    if (error) throw error;
    res.json({ success: true });
  } catch (err) {
    console.error('[api-keys] DELETE error:', err.message, err);
    res.status(500).json({ error: err.message });
  }
});

export default router;
