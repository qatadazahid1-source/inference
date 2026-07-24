import express from 'express';
import { supabase } from '../../index.js';

const router = express.Router();

// ─── GET /api/admin/budgets ───────────────────────────────────────────────────
// All budgets platform-wide with org info, current month spend, and utilization %.
router.get('/', async (req, res) => {
  try {
    const { search = '' } = req.query;

    // Fetch all budgets (org fetched separately — avoids PostgREST
    // embedded-join schema-cache issues seen elsewhere in this project)
    let budgetQuery = supabase
      .from('budgets')
      .select(`
        id, name, scope, scope_value, total_budget, current_spend, period,
        hard_limit, created_at, organization_id,
        alert_at_50, alert_at_75, alert_at_90, alert_at_100
      `)
      .order('created_at', { ascending: false });

    const { data: rawBudgets, error } = await budgetQuery;
    if (error) throw error;

    const orgIds = [...new Set((rawBudgets || []).map(b => b.organization_id).filter(Boolean))];
    let orgsById = new Map();
    if (orgIds.length) {
      const { data: orgs, error: orgErr } = await supabase
        .from('organizations')
        .select('id, name, slug, is_active')
        .in('id', orgIds);
      if (orgErr) console.warn('[admin/budgets] Failed to fetch organizations:', orgErr);
      orgsById = new Map((orgs || []).map(o => [o.id, o]));
    }

    const budgets = (rawBudgets || []).map(b => ({
      ...b,
      organizations: b.organization_id ? (orgsById.get(b.organization_id) || null) : null
    }));

    // Get current month start
    const monthStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString();

    // Fetch this month's spend grouped by org
    const { data: usageData } = await supabase
      .from('api_usage_logs')
      .select('organization_id, cost_usd')
      .gte('logged_at', monthStart);

    // Build spend map: org_id → spend
    const spendByOrg = {};
    for (const row of usageData || []) {
      const oid = row.organization_id;
      if (!oid) continue;
      spendByOrg[oid] = (spendByOrg[oid] || 0) + Number(row.cost_usd || 0);
    }

    // Filter by search and enrich with utilization
    let enriched = (budgets || []).map(b => {
      const orgId = b.organizations?.id;
      const spend = spendByOrg[orgId] || 0;
      const utilization_pct = b.total_budget > 0 ? Math.min((spend / b.total_budget) * 100, 999) : 0;
      return {
        ...b,
        current_spend: parseFloat(spend.toFixed(4)),
        utilization_pct: parseFloat(utilization_pct.toFixed(1)),
        status:
          utilization_pct >= 100 ? 'exceeded' :
          utilization_pct >= 90  ? 'critical' :
          utilization_pct >= 75  ? 'warning'  :
          utilization_pct >= 50  ? 'moderate' : 'healthy',
      };
    });

    if (search) {
      const q = search.toLowerCase();
      enriched = enriched.filter(b =>
        b.name?.toLowerCase().includes(q) ||
        b.organizations?.name?.toLowerCase().includes(q)
      );
    }

    res.json({ data: enriched });
  } catch (err) {
    console.error('[admin/budgets] GET / error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// ─── GET /api/admin/budgets/summary ──────────────────────────────────────────
// Quick KPIs: total budgets, exceeded count, critical count, total allocated.
router.get('/summary', async (req, res) => {
  try {
    const monthStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString();

    const [budgetsResult, usageResult] = await Promise.all([
      supabase.from('budgets').select('id, total_budget, organization_id'),
      supabase.from('api_usage_logs').select('organization_id, cost_usd').gte('logged_at', monthStart),
    ]);

    const budgets = budgetsResult.data || [];
    const usage = usageResult.data || [];

    const spendByOrg = {};
    for (const row of usage) {
      if (!row.organization_id) continue;
      spendByOrg[row.organization_id] = (spendByOrg[row.organization_id] || 0) + Number(row.cost_usd || 0);
    }

    let exceeded = 0, critical = 0, warning = 0, totalAllocated = 0;
    for (const b of budgets) {
      totalAllocated += Number(b.total_budget);
      const spend = spendByOrg[b.organization_id] || 0;
      const pct = b.total_budget > 0 ? (spend / b.total_budget) * 100 : 0;
      if (pct >= 100) exceeded++;
      else if (pct >= 90) critical++;
      else if (pct >= 75) warning++;
    }

    res.json({
      data: {
        total_budgets: budgets.length,
        total_allocated_usd: parseFloat(totalAllocated.toFixed(2)),
        exceeded_count: exceeded,
        critical_count: critical,
        warning_count: warning,
      }
    });
  } catch (err) {
    console.error('[admin/budgets] GET /summary error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// ─── GET /api/admin/budgets/alerts ───────────────────────────────────────────
// Global platform alerts: unread, recent 100.
router.get('/alerts', async (req, res) => {
  try {
    const { data: rawAlerts, error } = await supabase
      .from('alerts')
      .select(`
        id, type, severity, title, message, is_read,
        acknowledged_at, created_at, organization_id
      `)
      .order('created_at', { ascending: false })
      .limit(100);

    if (error) throw error;

    const orgIds = [...new Set((rawAlerts || []).map(a => a.organization_id).filter(Boolean))];
    let orgsById = new Map();
    if (orgIds.length) {
      const { data: orgs, error: orgErr } = await supabase
        .from('organizations')
        .select('id, name')
        .in('id', orgIds);
      if (orgErr) console.warn('[admin/budgets] Failed to fetch organizations:', orgErr);
      orgsById = new Map((orgs || []).map(o => [o.id, o]));
    }

    const data = (rawAlerts || []).map(a => ({
      ...a,
      organizations: a.organization_id ? (orgsById.get(a.organization_id) || null) : null
    }));

    res.json({ data });
  } catch (err) {
    console.error('[admin/budgets] GET /alerts error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// ─── PUT /api/admin/budgets/:id/hard-limit ───────────────────────────────────
// Admin can toggle hard-limit enforcement on any budget (pause/resume
// blocking). NOTE: budgets have no is_active/enabled column in this schema —
// hard_limit is the closest real lever admins have over enforcement.
router.put('/:id/hard-limit', async (req, res) => {
  try {
    const { id } = req.params;
    const { hard_limit } = req.body;

    if (typeof hard_limit !== 'boolean') {
      return res.status(400).json({ error: 'hard_limit (boolean) required' });
    }

    const { data, error } = await supabase
      .from('budgets')
      .update({ hard_limit })
      .eq('id', id)
      .select('id, name, hard_limit, organization_id')
      .single();

    if (error) throw error;

    await supabase.from('audit_logs').insert({
      user_id: req.user.id,
      action: hard_limit ? 'budget.hard_limit_enabled' : 'budget.hard_limit_disabled',
      resource_type: 'budget',
      resource_id: id,
      organization_id: data.organization_id,
      new_values: { hard_limit },
      ip_address: req.ip || null,
    });

    res.json({ data });
  } catch (err) {
    console.error('[admin/budgets] PUT /:id/hard-limit error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// ─── PUT /api/admin/budgets/alerts/:id/read ──────────────────────────────────
// Mark a triggered alert as read/acknowledged.
router.put('/alerts/:id/read', async (req, res) => {
  try {
    const { id } = req.params;

    const { data, error } = await supabase
      .from('alerts')
      .update({
        is_read: true,
        acknowledged_by: req.user.id,
        acknowledged_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select('id, organization_id, is_read')
      .single();

    if (error) throw error;

    await supabase.from('audit_logs').insert({
      user_id: req.user.id,
      action: 'alert.acknowledged',
      resource_type: 'alert',
      resource_id: id,
      organization_id: data.organization_id,
      new_values: { is_read: true },
      ip_address: req.ip || null,
    });

    res.json({ data });
  } catch (err) {
    console.error('[admin/budgets] PUT /alerts/:id/read error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

export default router;
