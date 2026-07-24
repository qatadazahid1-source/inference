import { supabase, safeQuery } from './supabase'
import type { Alert, AlertRule } from '../types/database.types'

// ─── Alerts ────────────────────────────────────────────

export async function getAlerts(
  orgId: string,
  options?: {
    unreadOnly?: boolean
    limit?: number
    type?: Alert['type']
  },
): Promise<{ data: Alert[] | null; error: string | null }> {
  let query = supabase
    .from('alerts')
    .select('*')
    .eq('organization_id', orgId)
    .order('created_at', { ascending: false })

  if (options?.unreadOnly) query = query.eq('is_read', false)
  if (options?.type) query = query.eq('type', options.type)
  if (options?.limit) query = query.limit(options.limit)

  return safeQuery(query)
}

export async function markAlertRead(
  alertId: string,
): Promise<{ error: string | null }> {
  const { error } = await supabase
    .from('alerts')
    .update({ is_read: true, acknowledged_at: new Date().toISOString() })
    .eq('id', alertId)

  return { error: error ? error.message : null }
}

export async function markAllAlertsRead(
  orgId: string,
): Promise<{ error: string | null }> {
  const { error } = await supabase
    .from('alerts')
    .update({ is_read: true })
    .eq('organization_id', orgId)
    .eq('is_read', false)

  return { error: error ? error.message : null }
}

export async function getUnreadAlertCount(
  orgId: string,
): Promise<{ data: number; error: string | null }> {
  const { count, error } = await supabase
    .from('alerts')
    .select('*', { count: 'exact', head: true })
    .eq('organization_id', orgId)
    .eq('is_read', false)

  return { data: count || 0, error: error ? error.message : null }
}

// ─── Alert Rules ───────────────────────────────────────

export async function getAlertRules(
  orgId: string,
): Promise<{ data: AlertRule[] | null; error: string | null }> {
  return safeQuery(
    supabase
      .from('alert_rules')
      .select('*')
      .eq('organization_id', orgId)
      .order('created_at', { ascending: false }),
  )
}

export async function createAlertRule(
  rule: Pick<AlertRule, 'organization_id' | 'name' | 'condition_type' | 'condition_value' | 'created_by'> &
    Partial<Pick<AlertRule, 'scope' | 'channels' | 'is_active'>>,
): Promise<{ data: AlertRule | null; error: string | null }> {
  return safeQuery(
    supabase.from('alert_rules').insert(rule).select().single(),
  )
}

export async function updateAlertRule(
  ruleId: string,
  updates: Partial<AlertRule>,
): Promise<{ data: AlertRule | null; error: string | null }> {
  return safeQuery(
    supabase.from('alert_rules').update(updates).eq('id', ruleId).select().single(),
  )
}

export async function deleteAlertRule(
  ruleId: string,
): Promise<{ error: string | null }> {
  const { error } = await supabase.from('alert_rules').delete().eq('id', ruleId)
  return { error: error ? error.message : null }
}
