import express from 'express';
import { supabase } from '../index.js';
import { attachEntitlements } from '../middleware/requireEntitlements.js';
import rateLimit from 'express-rate-limit';

const router = express.Router();

// Helper: resolve organization_id server-side from JWT (same pattern as analytics.js)
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

// Builds the data_snapshot for a report: pulls real usage logs in the given
// date range (optionally filtered by provider) and computes the same kind
// of aggregates the Cost Analytics / API Usage pages show, so the report
// reflects actual data rather than placeholder numbers.
async function buildReportSnapshot(organization_id, { dateRangeStart, dateRangeEnd, providers }) {
  let query = supabase
    .from('api_usage_logs')
    .select('id, provider, model, input_tokens, output_tokens, total_tokens, cost_usd, latency_ms, logged_at')
    .eq('organization_id', organization_id)
    .order('logged_at', { ascending: false });

  if (dateRangeStart) query = query.gte('logged_at', dateRangeStart);
  if (dateRangeEnd) query = query.lte('logged_at', dateRangeEnd);

  const { data: logs, error } = await query.limit(5000);
  if (error) throw error;

  let rows = logs || [];
  if (providers && providers.length > 0) {
    const providerSet = new Set(providers.map((p) => p.toLowerCase()));
    rows = rows.filter((r) => providerSet.has((r.provider || '').toLowerCase()));
  }

  const totalRequests = rows.length;
  const totalTokens = rows.reduce((acc, r) => acc + Number(r.total_tokens || 0), 0);
  const totalCost = rows.reduce((acc, r) => acc + Number(r.cost_usd || 0), 0);

  const byProvider = rows.reduce((acc, r) => {
    const key = r.provider || 'unknown';
    if (!acc[key]) acc[key] = { requests: 0, tokens: 0, cost: 0 };
    acc[key].requests += 1;
    acc[key].tokens += Number(r.total_tokens || 0);
    acc[key].cost += Number(r.cost_usd || 0);
    return acc;
  }, {});

  const byModel = rows.reduce((acc, r) => {
    const key = r.model || 'unknown';
    if (!acc[key]) acc[key] = { requests: 0, tokens: 0, cost: 0 };
    acc[key].requests += 1;
    acc[key].tokens += Number(r.total_tokens || 0);
    acc[key].cost += Number(r.cost_usd || 0);
    return acc;
  }, {});

  return {
    generatedAt: new Date().toISOString(),
    totals: { totalRequests, totalTokens, totalCost },
    byProvider,
    byModel,
    rows: rows.slice(0, 1000), // cap raw rows kept in the snapshot to keep it light
  };
}

// GET /api/reports
router.get('/', attachEntitlements, async (req, res) => {
  try {
    if (!req.entitlements.hasFeature('reports')) {
      return res.status(403).json({ error: 'Reports feature is not available on your plan.' });
    }
    const organization_id = await getUserOrgId(req.user.id);

    const { data, error } = await supabase
      .from('reports')
      .select('id, name, type, format, status, date_range_start, date_range_end, providers, teams, recurring, frequency, error_message, created_at, data_snapshot')
      .eq('organization_id', organization_id)
      .order('created_at', { ascending: false });

    if (error) throw error;

    res.json((data || []).map((r) => ({
      id: r.id,
      name: r.name,
      type: r.type,
      format: r.format,
      status: r.status,
      created: r.created_at,
      dateRange: r.date_range_start && r.date_range_end
        ? { start: r.date_range_start, end: r.date_range_end }
        : undefined,
      recurring: r.recurring,
      frequency: r.frequency,
      errorMessage: r.error_message,
      isEmpty: r.data_snapshot?.isEmpty ?? false,
    })));

  } catch (err) {
    console.error('[reports] GET / error:', err.message);
    res.status(500).json({ error: 'Failed to fetch reports' });
  }
});

// GET /api/reports/:id/snapshot — fetch the saved data snapshot for download/PDF generation
router.get('/:id/snapshot', async (req, res) => {
  try {
    const organization_id = await getUserOrgId(req.user.id);

    const { data, error } = await supabase
      .from('reports')
      .select('id, name, type, format, data_snapshot, status')
      .eq('id', req.params.id)
      .eq('organization_id', organization_id)
      .single();

    if (error) throw error;
    if (!data) return res.status(404).json({ error: 'Report not found' });
    if (data.status !== 'ready') {
      return res.status(409).json({ error: `Report is not ready (status: ${data.status})` });
    }

    res.json(data);

  } catch (err) {
    console.error('[reports] GET /:id/snapshot error:', err.message);
    res.status(500).json({ error: 'Failed to fetch report snapshot' });
  }
});

// POST /api/reports — generate a new report with a real data snapshot
const reportsLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => req.user?.id || req['ip'],
  message: { error: 'Too many report generation requests. Please try again later.' }
});

router.post('/', attachEntitlements, reportsLimiter, async (req, res) => {
  if (!req.entitlements.hasFeature('reports')) {
    return res.status(403).json({ error: 'Reports feature is not available on your plan.' });
  }

  const { name, type, format, dateRangeStart, dateRangeEnd, providers, teams, recurring, frequency } = req.body;

  if (!name || !type || !format) {
    return res.status(400).json({ error: 'name, type, and format are required' });
  }

  let reportId;
  try {
    const organization_id = await getUserOrgId(req.user.id);

    // Insert as 'generating' first so the UI can show a spinner immediately
    const { data: inserted, error: insertError } = await supabase
      .from('reports')
      .insert({
        organization_id,
        created_by: req.user.id,
        name,
        type,
        format,
        status: 'generating',
        date_range_start: dateRangeStart || null,
        date_range_end: dateRangeEnd || null,
        providers: providers || [],
        teams: teams || [],
        recurring: !!recurring,
        frequency: frequency || null,
      })
      .select('id, name, type, format, status, date_range_start, date_range_end, recurring, frequency, created_at')
      .single();

    if (insertError) throw insertError;
    reportId = inserted.id;

    // Build the real data snapshot
    const snapshot = await buildReportSnapshot(organization_id, { dateRangeStart, dateRangeEnd, providers });

    // The report still generates successfully even if no logs matched the
    // filters (that's a valid outcome, not an error) — but we flag it in
    // the snapshot so the UI/PDF can show "no data for these filters"
    // instead of leaving the user wondering if something's broken.
    snapshot.isEmpty = snapshot.totals.totalRequests === 0;

    const { error: updateError } = await supabase
      .from('reports')
      .update({ status: 'ready', data_snapshot: snapshot, updated_at: new Date().toISOString() })
      .eq('id', reportId);

    if (updateError) throw updateError;

    res.status(201).json({
      id: inserted.id,
      name: inserted.name,
      type: inserted.type,
      format: inserted.format,
      status: 'ready',
      created: inserted.created_at,
      dateRange: dateRangeStart && dateRangeEnd ? { start: dateRangeStart, end: dateRangeEnd } : undefined,
      recurring: inserted.recurring,
      frequency: inserted.frequency,
    });

  } catch (err) {
    console.error('[reports] POST / error:', err.message);

    // If the row was already inserted, mark it failed rather than leaving it
    // stuck on 'generating' forever.
    if (reportId) {
      await supabase
        .from('reports')
        .update({ status: 'failed', error_message: err.message })
        .eq('id', reportId)
        .then(() => {})
        .catch(() => {});
    }

    res.status(500).json({ error: 'Failed to generate report' });
  }
});

// DELETE /api/reports/:id
router.delete('/:id', attachEntitlements, async (req, res) => {
  try {
    if (!req.entitlements.hasFeature('reports')) {
      return res.status(403).json({ error: 'Reports feature is not available on your plan.' });
    }
    const organization_id = await getUserOrgId(req.user.id);

    const { error } = await supabase
      .from('reports')
      .delete()
      .eq('id', req.params.id)
      .eq('organization_id', organization_id);

    if (error) throw error;

    res.status(204).send();

  } catch (err) {
    console.error('[reports] DELETE /:id error:', err.message);
    res.status(500).json({ error: 'Failed to delete report' });
  }
});

export default router;
