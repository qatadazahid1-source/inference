import { supabase, safeQuery } from './supabase'
import type { Report } from '../types/database.types'

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || ''

export async function getReports(
  orgId: string,
  options?: { status?: Report['status']; type?: Report['type']; limit?: number },
): Promise<{ data: Report[] | null; error: string | null }> {
  let query = supabase
    .from('reports')
    .select('*')
    .eq('organization_id', orgId)
    .order('created_at', { ascending: false })

  if (options?.status) query = query.eq('status', options.status)
  if (options?.type) query = query.eq('type', options.type)
  if (options?.limit) query = query.limit(options.limit)

  return safeQuery(query)
}

export async function createReport(
  report: Pick<Report, 'organization_id' | 'name' | 'type' | 'created_by'> &
    Partial<Pick<Report, 'format' | 'parameters' | 'scheduled' | 'schedule_cron'>>,
): Promise<{ data: Report | null; error: string | null }> {
  return safeQuery(
    supabase.from('reports').insert(report).select().single(),
  )
}

export async function generateReport(
  reportId: string,
): Promise<{ success: boolean; error: string | null }> {
  const { data: { session } } = await supabase.auth.getSession()
  const token = session?.access_token

  if (!token) return { success: false, error: 'Not authenticated' }

  try {
    const res = await fetch(
      `${SUPABASE_URL}/functions/v1/generate-report`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ reportId }),
      },
    )

    const data = await res.json()
    if (!res.ok) return { success: false, error: data.error || 'Failed to generate report' }
    return { success: true, error: null }
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : 'Network error' }
  }
}

export async function deleteReport(
  reportId: string,
): Promise<{ error: string | null }> {
  const { error } = await supabase.from('reports').delete().eq('id', reportId)
  return { error: error ? error.message : null }
}
