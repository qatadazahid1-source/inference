import { supabase, safeQuery } from './supabase'
import type { Budget } from '../types/database.types'

export async function getBudgets(
  orgId: string,
): Promise<{ data: Budget[] | null; error: string | null }> {
  return safeQuery(
    supabase
      .from('budgets')
      .select('*')
      .eq('organization_id', orgId)
      .order('created_at', { ascending: false }),
  )
}

export async function getBudget(
  budgetId: string,
): Promise<{ data: Budget | null; error: string | null }> {
  return safeQuery(
    supabase.from('budgets').select('*').eq('id', budgetId).single(),
  )
}

export async function createBudget(
  budget: Pick<Budget, 'organization_id' | 'name' | 'amount' | 'created_by'> &
    Partial<Pick<Budget, 'scope' | 'scope_value' | 'period' | 'alert_at_50' | 'alert_at_75' | 'alert_at_90' | 'alert_at_100' | 'hard_limit' | 'rollover'>>,
): Promise<{ data: Budget | null; error: string | null }> {
  return safeQuery(
    supabase.from('budgets').insert(budget).select().single(),
  )
}

export async function updateBudget(
  budgetId: string,
  updates: Partial<Budget>,
): Promise<{ data: Budget | null; error: string | null }> {
  return safeQuery(
    supabase.from('budgets').update(updates).eq('id', budgetId).select().single(),
  )
}

export async function deleteBudget(
  budgetId: string,
): Promise<{ error: string | null }> {
  const { error } = await supabase.from('budgets').delete().eq('id', budgetId)
  return { error: error ? error.message : null }
}

export async function getBudgetUtilization(
  orgId: string,
): Promise<{ data: { budget_id: string; name: string; amount: number; spent: number; utilization_pct: number }[] | null; error: string | null }> {
  return safeQuery(
    (supabase as any).rpc('get_budget_utilization', { org_id: orgId }) as any,
  )
}
