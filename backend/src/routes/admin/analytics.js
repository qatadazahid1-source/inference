import express from 'express';
import { supabase } from '../../index.js';

const router = express.Router();

// ─── GET /api/admin/analytics/overview ───────────────────────────────────────
// Platform-wide KPIs: total orgs, total users, total API requests, total spend.
router.get('/overview', async (req, res) => {
  try {
    const [orgsResult, usersResult, apiResult, intResult] = await Promise.all([
      // Total organizations
      supabase.from('organizations').select('id', { count: 'exact', head: true }),

      // Total users
      supabase.from('users').select('id', { count: 'exact', head: true }),

      // Total API requests & spend this month
      supabase
        .from('api_usage_logs')
        .select('cost_usd, input_tokens, output_tokens')
        .gte('logged_at', new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString()),

      // Total active integrations
      supabase.from('ai_integrations').select('id', { count: 'exact', head: true }).eq('status', 'active'),
    ]);

    const apiRows = apiResult.data || [];
    const totalSpend = apiRows.reduce((sum, r) => sum + Number(r.cost_usd || 0), 0);
    const totalTokens = apiRows.reduce((sum, r) => sum + Number(r.input_tokens || 0) + Number(r.output_tokens || 0), 0);

    res.json({
      data: {
        total_organizations: orgsResult.count ?? 0,
        total_users: usersResult.count ?? 0,
        active_integrations: intResult.count ?? 0,
        monthly_api_requests: apiRows.length,
        monthly_spend_usd: parseFloat(totalSpend.toFixed(4)),
        monthly_tokens_used: totalTokens,
      }
    });
  } catch (err) {
    console.error('[admin/analytics] GET /overview error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// ─── GET /api/admin/analytics/usage-trend ────────────────────────────────────
// Daily API request counts and spend for the last 30 days (chart data).
router.get('/usage-trend', async (req, res) => {
  try {
    const since = new Date();
    since.setDate(since.getDate() - 30);

    const { data, error } = await supabase
      .from('api_usage_logs')
      .select('logged_at, cost_usd, input_tokens, output_tokens')
      .gte('logged_at', since.toISOString())
      .order('logged_at', { ascending: true });

    if (error) throw error;

    // Group by date (YYYY-MM-DD)
    const grouped = {};
    for (const row of data || []) {
      const date = row.logged_at.slice(0, 10);
      if (!grouped[date]) grouped[date] = { date, requests: 0, spend: 0, tokens: 0 };
      grouped[date].requests += 1;
      grouped[date].spend += Number(row.cost_usd || 0);
      grouped[date].tokens += Number(row.input_tokens || 0) + Number(row.output_tokens || 0);
    }

    const trend = Object.values(grouped).map(d => ({
      ...d,
      spend: parseFloat(d.spend.toFixed(4)),
    }));

    res.json({ data: trend });
  } catch (err) {
    console.error('[admin/analytics] GET /usage-trend error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// ─── GET /api/admin/analytics/top-orgs ───────────────────────────────────────
// Top 10 organizations by API spend this month.
router.get('/top-orgs', async (req, res) => {
  try {
    const since = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString();

    const { data, error } = await supabase
      .from('api_usage_logs')
      .select('organization_id, cost_usd')
      .gte('logged_at', since);

    if (error) throw error;

    // Aggregate by org
    const byOrg = {};
    for (const row of data || []) {
      const orgId = row.organization_id;
      if (!orgId) continue;
      if (!byOrg[orgId]) {
        byOrg[orgId] = {
          organization_id: orgId,
          name: 'Unknown',
          slug: '',
          spend: 0,
          requests: 0,
        };
      }
      byOrg[orgId].spend += Number(row.cost_usd || 0);
      byOrg[orgId].requests += 1;
    }

    // Fetch org names/slugs separately — avoids PostgREST embedded-join
    // schema-cache issues seen elsewhere in this project.
    const orgIds = Object.keys(byOrg);
    if (orgIds.length) {
      const { data: orgs } = await supabase
        .from('organizations')
        .select('id, name, slug')
        .in('id', orgIds);
      for (const org of orgs || []) {
        if (byOrg[org.id]) {
          byOrg[org.id].name = org.name || 'Unknown';
          byOrg[org.id].slug = org.slug || '';
        }
      }
    }

    const ranked = Object.values(byOrg)
      .sort((a, b) => b.spend - a.spend)
      .slice(0, 10)
      .map(o => ({ ...o, spend: parseFloat(o.spend.toFixed(4)) }));

    res.json({ data: ranked });
  } catch (err) {
    console.error('[admin/analytics] GET /top-orgs error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// ─── GET /api/admin/analytics/provider-breakdown ─────────────────────────────
// Spend and request count broken down by AI provider this month.
router.get('/provider-breakdown', async (req, res) => {
  try {
    const since = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString();

    const { data, error } = await supabase
      .from('api_usage_logs')
      .select('provider, cost_usd')
      .gte('logged_at', since);

    if (error) throw error;

    const byProvider = {};
    for (const row of data || []) {
      const p = row.provider || 'unknown';
      if (!byProvider[p]) byProvider[p] = { provider: p, spend: 0, requests: 0 };
      byProvider[p].spend += Number(row.cost_usd || 0);
      byProvider[p].requests += 1;
    }

    const breakdown = Object.values(byProvider)
      .sort((a, b) => b.spend - a.spend)
      .map(p => ({ ...p, spend: parseFloat(p.spend.toFixed(4)) }));

    res.json({ data: breakdown });
  } catch (err) {
    console.error('[admin/analytics] GET /provider-breakdown error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

export default router;
