import express from 'express';
import { supabase } from '../index.js';
import { attachEntitlements } from '../middleware/requireEntitlements.js';
import rateLimit from 'express-rate-limit';
import { generatePDF }  from '../services/pdfGenerator.js';
import { generateXLSX } from '../services/xlsxGenerator.js';
import { getFirstRunAt } from '../services/scheduledReports.js';

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
      .select('id, name, type, format, status, date_range_start, date_range_end, providers, teams, recurring, frequency, error_message, created_at, data_snapshot, next_run_at, last_run_at, last_run_status, recipients, enabled')
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
      nextRunAt: r.next_run_at,
      lastRunAt: r.last_run_at,
      lastRunStatus: r.last_run_status,
      recipients: r.recipients ?? [],
      enabled: r.enabled ?? true,
      errorMessage: r.error_message,
      isEmpty: r.data_snapshot?.isEmpty ?? false,
    })));

  } catch (err) {
    console.error('[reports] GET / error:', err.message);
    res.status(500).json({ error: 'Failed to fetch reports' });
  }
});

// GET /api/reports/:id/snapshot — JSON snapshot (for UI preview)
router.get('/:id/snapshot', attachEntitlements, async (req, res) => {
  try {
    if (!req.entitlements.hasFeature('reports')) {
      return res.status(403).json({
        error: 'Reports feature is not available on your plan.',
        code: 'FEATURE_NOT_AVAILABLE',
        details: { feature: 'reports', upgrade_required: true },
      });
    }

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

// GET /api/reports/:id/download/pdf — REAL PDF binary download
router.get('/:id/download/pdf', attachEntitlements, async (req, res) => {
  try {
    if (!req.entitlements.hasFeature('reports')) {
      return res.status(403).json({ error: 'Reports feature is not available on your plan.', code: 'FEATURE_NOT_AVAILABLE' });
    }
    if (!req.entitlements.hasFeature('pdf_export')) {
      return res.status(403).json({
        error: 'PDF export is not available on your plan.',
        code: 'FEATURE_NOT_AVAILABLE',
        details: { feature: 'pdf_export', upgrade_required: true },
      });
    }

    const organization_id = await getUserOrgId(req.user.id);

    const { data: report, error } = await supabase
      .from('reports')
      .select('id, name, type, format, status, date_range_start, date_range_end, data_snapshot')
      .eq('id', req.params.id)
      .eq('organization_id', organization_id)
      .single();

    if (error || !report) return res.status(404).json({ error: 'Report not found' });
    if (report.status !== 'ready') return res.status(409).json({ error: `Report is not ready (status: ${report.status})` });

    const { data: org } = await supabase.from('organizations').select('name')
      .eq('id', organization_id).maybeSingle();
    const orgName = org?.name ?? 'Your Organization';

    const pdfBuffer = await generatePDF(report, orgName);
    const filename  = `${report.name.replace(/[^a-z0-9]/gi, '_')}_${new Date().toISOString().slice(0,10)}.pdf`;

    res.set('Content-Type', 'application/pdf');
    res.set('Content-Disposition', `attachment; filename="${filename}"`);
    res.set('Content-Length', pdfBuffer.length);
    res.send(pdfBuffer);
  } catch (err) {
    console.error('[reports] PDF download error:', err.message);
    res.status(500).json({ error: 'Failed to generate PDF' });
  }
});

// GET /api/reports/:id/download/xlsx — REAL XLSX binary download
router.get('/:id/download/xlsx', attachEntitlements, async (req, res) => {
  try {
    if (!req.entitlements.hasFeature('reports')) {
      return res.status(403).json({ error: 'Reports feature is not available on your plan.', code: 'FEATURE_NOT_AVAILABLE' });
    }
    if (!req.entitlements.hasFeature('xlsx_export')) {
      return res.status(403).json({
        error: 'XLSX export is not available on your plan.',
        code: 'FEATURE_NOT_AVAILABLE',
        details: { feature: 'xlsx_export', upgrade_required: true },
      });
    }

    const organization_id = await getUserOrgId(req.user.id);

    const { data: report, error } = await supabase
      .from('reports')
      .select('id, name, type, format, status, date_range_start, date_range_end, data_snapshot')
      .eq('id', req.params.id)
      .eq('organization_id', organization_id)
      .single();

    if (error || !report) return res.status(404).json({ error: 'Report not found' });
    if (report.status !== 'ready') return res.status(409).json({ error: `Report is not ready (status: ${report.status})` });

    const { data: org } = await supabase.from('organizations').select('name')
      .eq('id', organization_id).maybeSingle();
    const orgName = org?.name ?? 'Your Organization';

    const xlsxBuffer = await generateXLSX(report, orgName);
    const filename   = `${report.name.replace(/[^a-z0-9]/gi, '_')}_${new Date().toISOString().slice(0,10)}.xlsx`;

    res.set('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.set('Content-Disposition', `attachment; filename="${filename}"`);
    res.set('Content-Length', xlsxBuffer.length);
    res.send(xlsxBuffer);
  } catch (err) {
    console.error('[reports] XLSX download error:', err.message);
    res.status(500).json({ error: 'Failed to generate XLSX' });
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
    return res.status(403).json({
      error: 'Reports feature is not available on your plan.',
      code: 'FEATURE_NOT_AVAILABLE',
      details: { feature: 'reports', upgrade_required: true },
    });
  }

  const { name, type, format, dateRangeStart, dateRangeEnd, providers, teams, recurring, frequency, recipients } = req.body;

  if (!name || !type || !format) {
    return res.status(400).json({ error: 'name, type, and format are required' });
  }

  const fmt = format.toUpperCase();
  if (fmt === 'CSV' && !req.entitlements.hasFeature('csv_export')) {
    return res.status(403).json({
      error: 'CSV export feature is not available on your plan. Upgrade your plan to generate CSV reports.',
      code: 'FEATURE_NOT_AVAILABLE',
      details: { feature: 'csv_export', upgrade_required: true },
    });
  }
  if (fmt === 'PDF' && !req.entitlements.hasFeature('pdf_export')) {
    return res.status(403).json({
      error: 'PDF export feature is not available on your plan. Upgrade your plan to generate PDF reports.',
      code: 'FEATURE_NOT_AVAILABLE',
      details: { feature: 'pdf_export', upgrade_required: true },
    });
  }
  if (fmt === 'XLSX' && !req.entitlements.hasFeature('xlsx_export')) {
    return res.status(403).json({
      error: 'XLSX export feature is not available on your plan.',
      code: 'FEATURE_NOT_AVAILABLE',
      details: { feature: 'xlsx_export', upgrade_required: true },
    });
  }

  // Validate recurring settings
  const VALID_FREQS = ['daily', 'weekly', 'monthly'];
  if (recurring && (!frequency || !VALID_FREQS.includes(frequency))) {
    return res.status(400).json({ error: `frequency must be one of: ${VALID_FREQS.join(', ')} for recurring reports` });
  }

  let reportId;
  try {
    const organization_id = await getUserOrgId(req.user.id);

    // Calculate next_run_at for recurring reports
    const next_run_at = recurring ? getFirstRunAt(frequency).toISOString() : null;

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
        next_run_at,
        recipients: Array.isArray(recipients) ? recipients : [],
        enabled: true,
      })
      .select('id, name, type, format, status, date_range_start, date_range_end, recurring, frequency, next_run_at, created_at')
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
      nextRunAt: inserted.next_run_at,
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
