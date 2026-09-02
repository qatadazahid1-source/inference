import express from 'express';
import { supabase } from '../index.js';
import { attachEntitlements } from '../middleware/requireEntitlements.js';

const router = express.Router();

// Helper: resolve organization_id server-side from JWT
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

// GET /api/analytics/logs
// Returns raw, paginated api_usage_logs rows for the API Usage page.
// Unlike GET /api/analytics above (which aggregates), this returns individual
// request-level records so the UI can show a real log table instead of an
// empty state.
router.get('/logs', attachEntitlements, async (req, res) => {
  try {
    if (!req.entitlements.hasFeature('analytics')) {
      return res.status(403).json({ error: 'Analytics feature is not available on your plan.' });
    }

    const organization_id = await getUserOrgId(req.user.id);
    const limit = Math.min(Number(req.query.limit) || 100, 500);

    const { data: logs, error } = await supabase
      .from('api_usage_logs')
      .select('id, provider, model, input_tokens, output_tokens, total_tokens, cost_usd, latency_ms, logged_at')
      .eq('organization_id', organization_id)
      .order('logged_at', { ascending: false })
      .limit(limit);

    if (error) throw error;

    return res.json(logs || []);

  } catch (err) {
    console.error('[analytics] GET /logs error:', err.message);
    res.status(500).json({ error: 'Failed to fetch API usage logs' });
  }
});

// GET /api/analytics
router.get('/', attachEntitlements, async (req, res) => {
  try {
    if (!req.entitlements.hasFeature('analytics')) {
      return res.status(403).json({ error: 'Analytics feature is not available on your plan.' });
    }

    const organization_id = await getUserOrgId(req.user.id);
    const { period = '30d' } = req.query; // '7d', '30d', 'all'

    // Compute date cutoff
    let dateCutoff = new Date(0).toISOString(); // all time
    const now = new Date();
    if (period === '7d') {
      dateCutoff = new Date(now.setDate(now.getDate() - 7)).toISOString();
    } else if (period === '30d') {
      dateCutoff = new Date(now.setDate(now.getDate() - 30)).toISOString();
    }

    // Fetch raw usage logs for the org
    const { data: logs, error } = await supabase
      .from('api_usage_logs')
      .select('id, provider, model, input_tokens, output_tokens, total_tokens, cost_usd, latency_ms, logged_at')
      .eq('organization_id', organization_id)
      .gte('logged_at', dateCutoff);

    if (error) throw error;

    // Aggregate data
    let totalCost = 0;
    let totalRequests = 0;
    let totalTokens = 0;
    let totalLatency = 0;
    let latencyCount = 0;
    const providerCosts = {};
    // Per-model aggregation (cost/requests/tokens). The raw logs already carry
    // `model`, `cost_usd` and `total_tokens`, so this reuses the same stored
    // values as the provider breakdown — no separate pricing logic. Powers the
    // "Cost by Model" chart, which previously duplicated the provider data.
    const modelStats = {};
    // costOverTime now tracks per-provider cost per day, not just a single
    // total — e.g. { '2026-06-27': { total: 12.5, groq: 8.0, openai: 4.5 } }.
    // This lets the frontend draw one line per connected provider instead
    // of three hardcoded ones (openai/anthropic/google) that may not even
    // match what the org actually uses (e.g. Groq).
    const costOverTime = {};
    const providersSeen = new Set();

    (logs || []).forEach(log => {
      const cost = Number(log.cost_usd) || 0;
      totalCost += cost;
      totalRequests += 1;
      totalTokens += Number(log.total_tokens) || 0;

      // Latency average — only count rows where latency_ms was actually recorded
      if (log.latency_ms !== null && log.latency_ms !== undefined) {
        totalLatency += Number(log.latency_ms);
        latencyCount += 1;
      }

      // Provider breakdown (overall, for the pie/bar charts — unchanged)
      providerCosts[log.provider] = (providerCosts[log.provider] || 0) + cost;

      // Per-model breakdown — reuses the same stored cost/token values, so the
      // "Cost by Model" chart shows real per-model spend, requests and tokens
      // instead of the provider-level numbers it was falling back to.
      const modelKey = log.model || 'unknown';
      if (!modelStats[modelKey]) {
        modelStats[modelKey] = { total_cost: 0, requests: 0, tokens: 0 };
      }
      modelStats[modelKey].total_cost += cost;
      modelStats[modelKey].requests += 1;
      modelStats[modelKey].tokens += Number(log.total_tokens) || 0;

      // Time series breakdown — now per provider per day
      const dateKey = log.logged_at.split('T')[0];
      const provider = log.provider || 'unknown';
      providersSeen.add(provider);

      if (!costOverTime[dateKey]) {
        costOverTime[dateKey] = { total: 0 };
      }
      costOverTime[dateKey].total += cost;
      costOverTime[dateKey][provider] = (costOverTime[dateKey][provider] || 0) + cost;
    });

    const avgLatency = latencyCount > 0 ? Math.round(totalLatency / latencyCount) : 0;

    // Format for frontend
    const providerData = Object.entries(providerCosts).map(([name, value]) => ({ name, value }));
    const providers = Array.from(providersSeen);

    // Real per-model breakdown (cost + requests + tokens), sorted by spend so
    // the "Cost by Model" chart shows the biggest models first.
    const modelData = Object.entries(modelStats)
      .map(([model, stats]) => ({ model, ...stats }))
      .sort((a, b) => b.total_cost - a.total_cost);

    // Each row: { date, cost, <provider1>: x, <provider2>: y, ... } — cost
    // stays as the total for backward compatibility with anything still
    // reading that field; the per-provider keys are new. Every provider
    // gets a value for every day (0 if there was no spend that day), so
    // each line in the chart stays continuous instead of having gaps.
    const timeSeriesData = Object.entries(costOverTime)
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([date, dayData]) => ({
        date,
        cost: dayData.total,
        ...Object.fromEntries(providers.map((p) => [p, dayData[p] ?? 0])),
      }));

    return res.json({
      totalCost,
      totalRequests,
      totalTokens,
      avgLatency,
      providerData,
      providers,
      modelData,
      timeSeriesData
    });

  } catch (err) {
    console.error('[analytics] GET error:', err.message);
    res.status(500).json({ error: 'Failed to fetch analytics data' });
  }
});

export default router;
