/**
 * Outbound Webhook Routes
 * ────────────────────────
 * GET    /api/webhooks                          — list org's webhook endpoints
 * POST   /api/webhooks                          — create new endpoint
 * PUT    /api/webhooks/:id                      — update endpoint
 * DELETE /api/webhooks/:id                      — delete endpoint
 *
 * GET    /api/webhooks/:id/subscriptions        — list event subscriptions
 * POST   /api/webhooks/:id/subscriptions        — add event subscription
 * DELETE /api/webhooks/:id/subscriptions/:subId — remove event subscription
 *
 * GET    /api/webhooks/:id/deliveries           — list delivery history
 *
 * Entitlement required: webhooks
 * Signing secret is generated server-side — never returned after creation.
 */

import express from 'express';
import crypto from 'crypto';
import { supabase } from '../index.js';
import { attachEntitlements } from '../middleware/requireEntitlements.js';

const router = express.Router();

// Supported event types (extensible)
const SUPPORTED_EVENTS = [
  'budget.threshold_reached',
  'budget.exceeded',
  'anomaly.detected',
  'report.generated',
  'alert.triggered',
];

async function getUserOrgId(userId) {
  const { data, error } = await supabase
    .from('organization_members')
    .select('organization_id')
    .eq('user_id', userId)
    .eq('status', 'active')
    .limit(1).maybeSingle();

  if (error || !data) {
    const { data: org } = await supabase
      .from('organizations').select('id')
      .eq('user_id', userId).limit(1).maybeSingle();
    if (org) return org.id;
    throw new Error('No active organization found');
  }
  return data.organization_id;
}

function requireWebhooksEntitlement(req, res) {
  if (!req.entitlements.hasFeature('webhooks')) {
    res.status(403).json({
      error: 'Outbound Webhooks are not available on your plan.',
      code: 'FEATURE_NOT_AVAILABLE',
      details: { feature: 'webhooks', upgrade_required: true },
    });
    return false;
  }
  return true;
}

// ─── Endpoints ───────────────────────────────────────────────────────────────

// GET /api/webhooks
router.get('/', attachEntitlements, async (req, res) => {
  try {
    if (!requireWebhooksEntitlement(req, res)) return;
    const organization_id = await getUserOrgId(req.user.id);

    const { data, error } = await supabase
      .from('webhook_endpoints')
      .select('id, url, description, enabled, created_at, updated_at')
      .eq('organization_id', organization_id)
      .order('created_at', { ascending: false });

    if (error) throw error;
    res.json(data ?? []);
  } catch (err) {
    console.error('[webhooks] GET / error:', err.message);
    res.status(500).json({ error: 'Failed to fetch webhook endpoints' });
  }
});

// POST /api/webhooks
router.post('/', attachEntitlements, async (req, res) => {
  try {
    if (!requireWebhooksEntitlement(req, res)) return;
    const organization_id = await getUserOrgId(req.user.id);

    const { url, description, enabled = true } = req.body;

    if (!url || typeof url !== 'string') {
      return res.status(400).json({ error: 'url is required' });
    }
    if (!url.startsWith('https://')) {
      return res.status(400).json({ error: 'Webhook URL must use HTTPS' });
    }

    // Generate signing secret (never returned again after this)
    const signing_secret = crypto.randomBytes(32).toString('hex');

    const { data, error } = await supabase
      .from('webhook_endpoints')
      .insert({
        organization_id,
        url,
        description: description ?? null,
        signing_secret,
        enabled,
        created_by: req.user.id,
      })
      .select('id, url, description, enabled, created_at')
      .single();

    if (error) throw error;

    // Return signing_secret ONCE at creation — customer must save it
    res.status(201).json({ ...data, signing_secret });
  } catch (err) {
    console.error('[webhooks] POST / error:', err.message);
    res.status(500).json({ error: 'Failed to create webhook endpoint' });
  }
});

// PUT /api/webhooks/:id
router.put('/:id', attachEntitlements, async (req, res) => {
  try {
    if (!requireWebhooksEntitlement(req, res)) return;
    const organization_id = await getUserOrgId(req.user.id);

    const { url, description, enabled } = req.body;
    const updates = { updated_at: new Date().toISOString() };
    if (url !== undefined)         { updates.url         = url; }
    if (description !== undefined) { updates.description = description; }
    if (enabled !== undefined)     { updates.enabled     = enabled; }

    if (updates.url && !updates.url.startsWith('https://')) {
      return res.status(400).json({ error: 'Webhook URL must use HTTPS' });
    }

    const { data, error } = await supabase
      .from('webhook_endpoints')
      .update(updates)
      .eq('id', req.params.id)
      .eq('organization_id', organization_id)
      .select('id, url, description, enabled, updated_at')
      .single();

    if (error) throw error;
    if (!data)  return res.status(404).json({ error: 'Webhook endpoint not found' });

    res.json(data);
  } catch (err) {
    console.error('[webhooks] PUT /:id error:', err.message);
    res.status(500).json({ error: 'Failed to update webhook endpoint' });
  }
});

// DELETE /api/webhooks/:id
router.delete('/:id', attachEntitlements, async (req, res) => {
  try {
    if (!requireWebhooksEntitlement(req, res)) return;
    const organization_id = await getUserOrgId(req.user.id);

    const { error } = await supabase
      .from('webhook_endpoints')
      .delete()
      .eq('id', req.params.id)
      .eq('organization_id', organization_id);

    if (error) throw error;
    res.status(204).send();
  } catch (err) {
    console.error('[webhooks] DELETE /:id error:', err.message);
    res.status(500).json({ error: 'Failed to delete webhook endpoint' });
  }
});

// ─── Subscriptions ────────────────────────────────────────────────────────────

// GET /api/webhooks/:id/subscriptions
router.get('/:id/subscriptions', attachEntitlements, async (req, res) => {
  try {
    if (!requireWebhooksEntitlement(req, res)) return;

    const { data, error } = await supabase
      .from('webhook_subscriptions')
      .select('id, event_type, enabled, created_at')
      .eq('webhook_endpoint_id', req.params.id);

    if (error) throw error;
    res.json({ available_events: SUPPORTED_EVENTS, subscriptions: data ?? [] });
  } catch (err) {
    console.error('[webhooks] GET subscriptions error:', err.message);
    res.status(500).json({ error: 'Failed to fetch subscriptions' });
  }
});

// POST /api/webhooks/:id/subscriptions
router.post('/:id/subscriptions', attachEntitlements, async (req, res) => {
  try {
    if (!requireWebhooksEntitlement(req, res)) return;

    const { event_type } = req.body;
    if (!event_type || !SUPPORTED_EVENTS.includes(event_type)) {
      return res.status(400).json({
        error: `event_type must be one of: ${SUPPORTED_EVENTS.join(', ')}`,
      });
    }

    const { data, error } = await supabase
      .from('webhook_subscriptions')
      .upsert({
        webhook_endpoint_id: req.params.id,
        event_type,
        enabled: true,
      }, { onConflict: 'webhook_endpoint_id,event_type' })
      .select('id, event_type, enabled')
      .single();

    if (error) throw error;
    res.status(201).json(data);
  } catch (err) {
    console.error('[webhooks] POST subscriptions error:', err.message);
    res.status(500).json({ error: 'Failed to add subscription' });
  }
});

// DELETE /api/webhooks/:id/subscriptions/:subId
router.delete('/:id/subscriptions/:subId', attachEntitlements, async (req, res) => {
  try {
    if (!requireWebhooksEntitlement(req, res)) return;

    const { error } = await supabase
      .from('webhook_subscriptions')
      .delete()
      .eq('id', req.params.subId)
      .eq('webhook_endpoint_id', req.params.id);

    if (error) throw error;
    res.status(204).send();
  } catch (err) {
    console.error('[webhooks] DELETE subscription error:', err.message);
    res.status(500).json({ error: 'Failed to remove subscription' });
  }
});

// ─── Deliveries ───────────────────────────────────────────────────────────────

// GET /api/webhooks/:id/deliveries
router.get('/:id/deliveries', attachEntitlements, async (req, res) => {
  try {
    if (!requireWebhooksEntitlement(req, res)) return;

    const { data, error } = await supabase
      .from('webhook_deliveries')
      .select('id, event_type, status, http_status, attempt_count, last_attempt_at, response_summary, created_at')
      .eq('webhook_endpoint_id', req.params.id)
      .order('created_at', { ascending: false })
      .limit(100);

    if (error) throw error;
    res.json(data ?? []);
  } catch (err) {
    console.error('[webhooks] GET deliveries error:', err.message);
    res.status(500).json({ error: 'Failed to fetch delivery history' });
  }
});

export default router;
