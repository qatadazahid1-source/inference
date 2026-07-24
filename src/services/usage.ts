import { supabase, safeQuery, startOfMonth, startOfQuarter, startOfYear } from './supabase'
import type { APIUsageLog } from '../types/database.types'

// ─── Usage Logs ────────────────────────────────────────

export async function getUsageLogs(
  orgId: string,
  options?: {
    limit?: number
    offset?: number
    provider?: string
    model?: string
    startDate?: string
    endDate?: string
    orderBy?: { column: string; ascending: boolean }
  },
): Promise<{ data: APIUsageLog[] | null; error: string | null }> {
  let query = supabase
    .from('api_usage_logs')
    .select('*')
    .eq('organization_id', orgId)

  if (options?.provider) query = query.eq('provider', options.provider)
  if (options?.model) query = query.eq('model', options.model)
  if (options?.startDate) query = query.gte('logged_at', options.startDate)
  if (options?.endDate) query = query.lte('logged_at', options.endDate)

  const orderColumn = options?.orderBy?.column || 'logged_at'
  const orderAsc = options?.orderBy?.ascending ?? false
  query = query.order(orderColumn as any, { ascending: orderAsc })

  if (options?.limit) query = query.limit(options.limit)
  if (options?.offset) query = query.range(options.offset, options.offset + (options.limit || 50) - 1)

  return safeQuery(query)
}

export async function logUsage(
  log: Pick<APIUsageLog, 'organization_id' | 'provider' | 'model' | 'input_tokens' | 'output_tokens' | 'total_tokens' | 'cost_usd'> & Partial<Pick<APIUsageLog, 'integration_id' | 'latency_ms' | 'task_type' | 'project_tag' | 'team_tag' | 'metadata'>>,
): Promise<{ data: APIUsageLog | null; error: string | null }> {
  return safeQuery(
    supabase.from('api_usage_logs').insert({ ...log, logged_at: new Date().toISOString() }).select().single(),
  )
}

// ─── Aggregated Stats ──────────────────────────────────

export async function getSpendByProvider(
  orgId: string,
  period: 'month' | 'quarter' | 'year' = 'month',
): Promise<{ data: { provider: string; total_cost: number; total_tokens: number; request_count: number }[] | null; error: string | null }> {
  const startDate = period === 'month' ? startOfMonth() : period === 'quarter' ? startOfQuarter() : startOfYear()

  // Use the materialized view
  return safeQuery(
    (supabase as any)
      .rpc('get_spend_by_provider', { org_id: orgId, since: startDate }) as any,
  )
}

// Fallback: direct query aggregation
export async function getDailySpend(
  orgId: string,
  days: number = 30,
): Promise<{ data: { date: string; provider: string; cost: number }[] | null; error: string | null }> {
  const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString()

  const { data, error } = await supabase
    .from('api_usage_logs')
    .select('logged_at, provider, cost_usd')
    .eq('organization_id', orgId)
    .gte('logged_at', startDate)
    .order('logged_at', { ascending: true })

  if (error) return { data: null, error: error.message }

  // Group by date and provider
  const grouped: Record<string, Record<string, number>> = {}
  for (const row of data) {
    const date = row.logged_at.split('T')[0]
    if (!grouped[date]) grouped[date] = {}
    grouped[date][row.provider] = (grouped[date][row.provider] || 0) + Number(row.cost_usd)
  }

  const result = Object.entries(grouped).flatMap(([date, providers]) =>
    Object.entries(providers).map(([provider, cost]) => ({
      date,
      provider,
      cost: Math.round(cost * 100) / 100,
    })),
  )

  return { data: result, error: null }
}

export async function getTopModels(
  orgId: string,
  limit: number = 10,
): Promise<{ data: { model: string; cost: number }[] | null; error: string | null }> {
  const startDate = startOfMonth()

  const { data, error } = await supabase
    .from('api_usage_logs')
    .select('model, cost_usd')
    .eq('organization_id', orgId)
    .gte('logged_at', startDate)

  if (error) return { data: null, error: error.message }

  const byModel: Record<string, number> = {}
  for (const row of data) {
    byModel[row.model] = (byModel[row.model] || 0) + Number(row.cost_usd)
  }

  const sorted = Object.entries(byModel)
    .map(([model, cost]) => ({ model, cost: Math.round(cost * 100) / 100 }))
    .sort((a, b) => b.cost - a.cost)
    .slice(0, limit)

  return { data: sorted, error: null }
}

export async function getTotalSpend(
  orgId: string,
  period: 'month' | 'quarter' | 'year' = 'month',
): Promise<{ data: { total_cost: number; total_tokens: number; request_count: number } | null; error: string | null }> {
  const startDate = period === 'month' ? startOfMonth() : period === 'quarter' ? startOfQuarter() : startOfYear()

  const { data, error } = await supabase
    .from('api_usage_logs')
    .select('cost_usd, total_tokens')
    .eq('organization_id', orgId)
    .gte('logged_at', startDate)

  if (error) return { data: null, error: error.message }

  const total_cost = data.reduce((sum, r) => sum + Number(r.cost_usd), 0)
  const total_tokens = data.reduce((sum, r) => sum + Number(r.total_tokens), 0)

  return {
    data: {
      total_cost: Math.round(total_cost * 100) / 100,
      total_tokens,
      request_count: data.length,
    },
    error: null,
  }
}
