import { supabase } from '../index.js';

/**
 * After each proxy call, check all active organization budgets.
 * If spend crosses a threshold that hasn't been alerted yet this period,
 * insert an alert row into the `alerts` table.
 * This runs async / fire-and-forget — errors are caught by the caller.
 */
export async function checkBudgetThresholds(organization_id, newCostUsd) {
  // 1. Fetch all active budgets for this org
  const { data: budgets, error } = await supabase
    .from('budgets')
    .select('id, name, total_budget, period, alert_at_50, alert_at_75, alert_at_90, alert_at_100')
    .eq('organization_id', organization_id)
    .eq('is_active', true);

  if (error || !budgets?.length) return;

  // 2. Compute current period start
  const now = new Date();
  let periodStart;
  const year = now.getUTCFullYear();
  const month = now.getUTCMonth();
  const quarter = Math.floor(month / 3);

  for (const budget of budgets) {
    if (budget.period === 'monthly') {
      periodStart = new Date(Date.UTC(year, month, 1)).toISOString();
    } else if (budget.period === 'quarterly') {
      periodStart = new Date(Date.UTC(year, quarter * 3, 1)).toISOString();
    } else {
      periodStart = new Date(Date.UTC(year, 0, 1)).toISOString();
    }

    // 3. Get total spend for this budget's period from api_usage_logs
    const { data: spendData } = await supabase
      .from('api_usage_logs')
      .select('cost_usd')
      .eq('organization_id', organization_id)
      .gte('logged_at', periodStart);

    const totalSpend = (spendData ?? []).reduce((sum, r) => sum + Number(r.cost_usd), 0);
    const totalBudget = Number(budget.total_budget);
    if (totalBudget <= 0) continue;

    const pct = (totalSpend / totalBudget) * 100;

    // 4. Define which thresholds to check
    const thresholds = [
      { pct: 100, enabled: budget.alert_at_100, label: '100%', severity: 'critical' },
      { pct: 90,  enabled: budget.alert_at_90,  label: '90%',  severity: 'critical' },
      { pct: 75,  enabled: budget.alert_at_75,  label: '75%',  severity: 'warning' },
      { pct: 50,  enabled: budget.alert_at_50,  label: '50%',  severity: 'info' },
    ];

    for (const t of thresholds) {
      if (!t.enabled || pct < t.pct) continue;

      // 5. Dedup: check if this alert was already created this period
      const dedupKey = `budget:${budget.id}:${t.pct}:${periodStart.slice(0, 7)}`; // e.g. budget:uuid:75:2026-06
      const { data: existing } = await supabase
        .from('alerts')
        .select('id')
        .eq('organization_id', organization_id)
        .contains('metadata', { dedup_key: dedupKey })
        .limit(1)
        .maybeSingle();

      if (existing) continue; // already fired this period

      // 6. Insert the alert
      const { error: alertErr } = await supabase
        .from('alerts')
        .insert({
          organization_id,
          type: 'budget_threshold',
          severity: t.severity,
          title: `Budget "${budget.name}" reached ${t.label}`,
          message: `Your organization has used ${pct.toFixed(1)}% ($${totalSpend.toFixed(2)} of $${totalBudget.toFixed(2)}) of the "${budget.name}" ${budget.period} budget.`,
          metadata: { budget_id: budget.id, threshold_pct: t.pct, dedup_key: dedupKey, spend_usd: totalSpend },
          is_read: false
        });

      if (alertErr) {
        console.error('[alertHelper] Insert alert error:', alertErr.message, alertErr);
      }

      break; // Only fire the highest breached threshold per budget per call
    }
  }
}
