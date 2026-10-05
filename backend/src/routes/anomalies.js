/**
 * Anomaly Routes
 * ───────────────
 * GET  /api/anomalies          — list org anomalies (paginated)
 * GET  /api/anomalies/:id      — single anomaly detail
 * PUT  /api/anomalies/:id      — update status (acknowledge / resolve)
 * POST /api/anomalies/run      — manually trigger detection run (admin/dev)
 *
 * Entitlement required: anomaly_detection
 */

import express from 'express';
import { supabase } from '../index.js';
import { attachEntitlements } from '../middleware/requireEntitlements.js';
import { detectAnomaliesForOrg } from '../services/anomalyDetector.js';

const router = express.Router();

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

// GET /api/anomalies
router.get('/', attachEntitlements, async (req, res) => {
  try {
    if (!req.entitlements.hasFeature('anomaly_detection')) {
      return res.status(403).json({
        error: 'Anomaly Detection is not available on your plan.',
        code: 'FEATURE_NOT_AVAILABLE',
        details: { feature: 'anomaly_detection', upgrade_required: true },
      });
    }

    const organization_id = await getUserOrgId(req.user.id);
    const { status, severity, limit = 50, offset = 0 } = req.query;

    let query = supabase
      .from('anomalies')
      .select('*', { count: 'exact' })
      .eq('organization_id', organization_id)
      .order('detected_at', { ascending: false })
      .range(Number(offset), Number(offset) + Number(limit) - 1);

    if (status)   query = query.eq('status', status);
    if (severity) query = query.eq('severity', severity);

    const { data, error, count } = await query;
    if (error) throw error;

    res.json({ anomalies: data ?? [], total: count ?? 0 });
  } catch (err) {
    console.error('[anomalies] GET / error:', err.message);
    res.status(500).json({ error: 'Failed to fetch anomalies' });
  }
});

// GET /api/anomalies/:id
router.get('/:id', attachEntitlements, async (req, res) => {
  try {
    if (!req.entitlements.hasFeature('anomaly_detection')) {
      return res.status(403).json({
        error: 'Anomaly Detection is not available on your plan.',
        code: 'FEATURE_NOT_AVAILABLE',
        details: { feature: 'anomaly_detection', upgrade_required: true },
      });
    }

    const organization_id = await getUserOrgId(req.user.id);

    const { data, error } = await supabase
      .from('anomalies')
      .select('*')
      .eq('id', req.params.id)
      .eq('organization_id', organization_id)
      .single();

    if (error || !data) return res.status(404).json({ error: 'Anomaly not found' });
    res.json(data);
  } catch (err) {
    console.error('[anomalies] GET /:id error:', err.message);
    res.status(500).json({ error: 'Failed to fetch anomaly' });
  }
});

// PUT /api/anomalies/:id — acknowledge or resolve
router.put('/:id', attachEntitlements, async (req, res) => {
  try {
    if (!req.entitlements.hasFeature('anomaly_detection')) {
      return res.status(403).json({
        error: 'Anomaly Detection is not available on your plan.',
        code: 'FEATURE_NOT_AVAILABLE',
        details: { feature: 'anomaly_detection', upgrade_required: true },
      });
    }

    const organization_id = await getUserOrgId(req.user.id);
    const { status } = req.body;
    const VALID_STATUSES = ['open', 'acknowledged', 'resolved'];

    if (!status || !VALID_STATUSES.includes(status)) {
      return res.status(400).json({ error: `status must be one of: ${VALID_STATUSES.join(', ')}` });
    }

    const { data, error } = await supabase
      .from('anomalies')
      .update({ status })
      .eq('id', req.params.id)
      .eq('organization_id', organization_id)
      .select()
      .single();

    if (error) throw error;
    if (!data)  return res.status(404).json({ error: 'Anomaly not found' });

    res.json(data);
  } catch (err) {
    console.error('[anomalies] PUT /:id error:', err.message);
    res.status(500).json({ error: 'Failed to update anomaly' });
  }
});

// POST /api/anomalies/run — manually trigger detection (useful for testing/admin)
router.post('/run', attachEntitlements, async (req, res) => {
  try {
    if (!req.entitlements.hasFeature('anomaly_detection')) {
      return res.status(403).json({
        error: 'Anomaly Detection is not available on your plan.',
        code: 'FEATURE_NOT_AVAILABLE',
        details: { feature: 'anomaly_detection', upgrade_required: true },
      });
    }

    const organization_id = await getUserOrgId(req.user.id);

    // Run async, return immediately
    detectAnomaliesForOrg(organization_id).then(results => {
      console.log(`[anomalies] Manual run for org ${organization_id}: ${results.length} detected`);
    }).catch(err => {
      console.error('[anomalies] Manual run error:', err.message);
    });

    res.json({ message: 'Anomaly detection run started. Results will appear shortly.' });
  } catch (err) {
    console.error('[anomalies] POST /run error:', err.message);
    res.status(500).json({ error: 'Failed to start anomaly detection' });
  }
});

export default router;
