// ============================================================================
// Aggregate Usage — computes daily/provider usage aggregates
// Called on a schedule or on-demand via a cron trigger
// ============================================================================
import { serve } from 'https://deno.land/std@0.208.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.0'

const supabaseUrl = Deno.env.get('SUPABASE_URL')!
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

serve(async (req) => {
  try {
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    // Use the materialized view-style query
    const { data: dailyUsage, error } = await supabase
      .from('api_usage_logs')
      .select('organization_id, provider, logged_at, cost_usd, input_tokens, output_tokens, total_tokens')
      .gte('logged_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())

    if (error) {
      console.error('Error fetching usage data:', error)
      return new Response(JSON.stringify({ error: error.message }), { status: 500 })
    }

    // Group by organization and provider
    const aggregated: Record<string, {
      org_id: string
      providers: Record<string, { cost: number; input_tokens: number; output_tokens: number; total_tokens: number; count: number }>
    }> = {}

    for (const log of dailyUsage || []) {
      if (!aggregated[log.organization_id]) {
        aggregated[log.organization_id] = {
          org_id: log.organization_id,
          providers: {},
        }
      }
      if (!aggregated[log.organization_id].providers[log.provider]) {
        aggregated[log.organization_id].providers[log.provider] = {
          cost: 0, input_tokens: 0, output_tokens: 0, total_tokens: 0, count: 0,
        }
      }
      const p = aggregated[log.organization_id].providers[log.provider]
      p.cost += Number(log.cost_usd)
      p.input_tokens += Number(log.input_tokens)
      p.output_tokens += Number(log.output_tokens)
      p.total_tokens += Number(log.total_tokens)
      p.count++
    }

    // Check budget thresholds and create alerts
    for (const [orgId, agg] of Object.entries(aggregated)) {
      const totalDailyCost = Object.values(agg.providers).reduce((sum, p) => sum + p.cost, 0)

      // Get active budgets for this org
      const { data: budgets } = await supabase
        .from('budgets')
        .select('*')
        .eq('organization_id', orgId)
        .eq('is_active', true)

      if (!budgets) continue

      for (const budget of budgets) {
        // Compute period start
        let periodStart: Date
        switch (budget.period) {
          case 'monthly':
            periodStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1)
            break
          case 'quarterly':
            periodStart = new Date(new Date().getFullYear(), Math.floor(new Date().getMonth() / 3) * 3, 1)
            break
          case 'annual':
            periodStart = new Date(new Date().getFullYear(), 0, 1)
            break
        }

        // Get total spend for this period
        const { data: periodUsage } = await supabase
          .from('api_usage_logs')
          .select('cost_usd')
          .eq('organization_id', orgId)
          .gte('logged_at', periodStart.toISOString())

        const periodSpend = periodUsage?.reduce((sum, l) => sum + Number(l.cost_usd), 0) || 0
        const pctUsed = budget.amount > 0 ? (periodSpend / Number(budget.amount)) * 100 : 0

        // Check alert thresholds
        const thresholds: { pct: number; key: string; label: string }[] = [
          { pct: 50, key: 'alert_at_50', label: '50%' },
          { pct: 75, key: 'alert_at_75', label: '75%' },
          { pct: 90, key: 'alert_at_90', label: '90%' },
          { pct: 100, key: 'alert_at_100', label: '100%' },
        ]

        for (const threshold of thresholds) {
          if (
            (budget as any)[threshold.key] &&
            pctUsed >= threshold.pct &&
            pctUsed < threshold.pct + 5 // Only alert once near each threshold
          ) {
            // Check if we already sent this alert recently
            const { data: recentAlerts } = await supabase
              .from('alerts')
              .select('id')
              .eq('organization_id', orgId)
              .eq('type', 'budget_threshold')
              .gte('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())
              .limit(1)

            if (!recentAlerts || recentAlerts.length === 0) {
              await supabase.from('alerts').insert({
                organization_id: orgId,
                type: 'budget_threshold',
                severity: pctUsed >= 100 ? 'critical' : pctUsed >= 75 ? 'warning' : 'info',
                title: `Budget at ${threshold.label}`,
                message: `Your ${budget.name} budget has reached ${Math.round(pctUsed)}% for this period ($${periodSpend.toFixed(2)} of $${Number(budget.amount).toFixed(2)}).`,
                metadata: { budget_id: budget.id, pct_used: pctUsed, period_spend: periodSpend },
              })
            }
          }
        }
      }
    }

    return new Response(JSON.stringify({
      success: true,
      organizations_processed: Object.keys(aggregated).length,
    }), {
      headers: { 'Content-Type': 'application/json' },
    })
  } catch (err) {
    console.error('Error in aggregate-usage:', err)
    return new Response(JSON.stringify({ error: err.message }), { status: 500 })
  }
})
