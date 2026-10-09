import dotenv from 'dotenv';
dotenv.config({ path: '../.env' });
dotenv.config({ path: '.env' });
import { createClient } from '@supabase/supabase-js';

const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(url, key);

const orgId = 'a256a3f4-d2d8-4dfa-9a91-3dbcb6ec8922';

async function verify() {
  console.log('====================================================');
  console.log('RECONCILING BUDGET AND USAGE LOGS');
  console.log('====================================================');

  // 1. Fetch budget
  const { data: budgets } = await supabase.from('budgets').select('*').eq('organization_id', orgId);
  const targetBudget = budgets.find(b => b.name === 'o');

  console.log('Found budget:', targetBudget.name);
  console.log('Stored total_budget:', targetBudget.total_budget, `(type: ${typeof targetBudget.total_budget})`);
  console.log('Stored hard_limit:', targetBudget.hard_limit);

  // 2. Query usage logs for October 2026
  const now = new Date();
  const periodStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
  const { data: logs, error: logsErr } = await supabase
    .from('api_usage_logs')
    .select('id, cost_usd, logged_at, provider, model, status')
    .eq('organization_id', orgId)
    .neq('status', 'blocked')
    .gte('logged_at', periodStart);

  if (logsErr) throw logsErr;

  console.log('\n--- Usage Records (October 2026) ---');
  let totalCost = 0;
  for (const log of logs) {
    totalCost += Number(log.cost_usd || 0);
    console.log(`[LOG] ${log.id} | Date: ${log.logged_at} | Model: ${log.model} | Cost: $${log.cost_usd}`);
  }

  console.log('\nTotal unrounded spend sum: $' + totalCost);
  const activeSpend = parseFloat(totalCost.toFixed(4));
  console.log('Active Spend (4 decimal precision): $' + activeSpend);

  const budgetNum = Number(targetBudget.total_budget);
  const utilizationPct = budgetNum > 0 ? (activeSpend / budgetNum) * 100 : 0;
  console.log('Utilization %: ' + utilizationPct + '%');

  function formatCurrency(val) {
    const num = Number(val) || 0;
    if (num === 0) return '$0.00';
    if (Math.abs(num) < 0.01) {
      return `$${num.toLocaleString(undefined, { minimumFractionDigits: 3, maximumFractionDigits: 4 })}`;
    }
    return `$${num.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  }

  console.log('\n--- UI Card Formatting ---');
  console.log('Budget Card Amount:', `${formatCurrency(budgetNum)} / month`);
  console.log('KPI Active Spend:', formatCurrency(activeSpend));
  console.log('KPI Total Allocated:', formatCurrency(budgetNum));
  console.log('KPI Utilization:', `${utilizationPct >= 100 ? Math.round(utilizationPct) : utilizationPct.toFixed(1)}%`);
  console.log('Card Used Text:', `${utilizationPct >= 100 ? Math.round(utilizationPct) : utilizationPct.toFixed(1)}% used (${formatCurrency(activeSpend)} of ${formatCurrency(budgetNum)})`);

  if (targetBudget.total_budget !== 0.001) throw new Error('Budget amount is not 0.001');
  if (activeSpend !== 0.0057) throw new Error(`Active spend mismatch: expected 0.0057, got ${activeSpend}`);
  if (Math.round(utilizationPct) !== 570) throw new Error(`Utilization mismatch: expected 570%, got ${utilizationPct}`);

  console.log('\nRECONCILIATION RESULT: PASS (100% Match with actual usage logs)');
}

verify().catch(e => {
  console.error('Verification failed:', e);
  process.exit(1);
});
