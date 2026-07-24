import { supabase } from '../lib/supabase'
import type { Database } from '../types/database.types'

export { supabase }
export type Tables = Database['public']['Tables']

// ─── Typed helpers ───────────────────────────────────────
export function nowISO(): string {
  return new Date().toISOString()
}

export function startOfMonth(): string {
  const d = new Date()
  return new Date(d.getFullYear(), d.getMonth(), 1).toISOString()
}

export function startOfQuarter(): string {
  const d = new Date()
  return new Date(d.getFullYear(), Math.floor(d.getMonth() / 3) * 3, 1).toISOString()
}

export function startOfYear(): string {
  return new Date(new Date().getFullYear(), 0, 1).toISOString()
}

export function daysAgo(n: number): string {
  return new Date(Date.now() - n * 24 * 60 * 60 * 1000).toISOString()
}

// ─── Error helper ─────────────────────────────────────────
// ─── Realtime Subscriptions ────────────────────────────
export function subscribeToTable(
  table: string,
  filter: { event: 'INSERT' | 'UPDATE' | 'DELETE' | '*' },
  callback: (payload: any) => void,
  orgId?: string,
) {
  const channel = supabase.channel(`public:${table}`)
  const subscription = channel.on(
    'postgres_changes' as any,
    {
      event: filter.event,
      schema: 'public',
      table,
      filter: orgId ? `organization_id=eq.${orgId}` : undefined,
    },
    (payload: any) => callback(payload),
  )
  subscription.subscribe()
  return {
    unsubscribe: () => { supabase.removeChannel(channel) },
  }
}

export function subscribeToAlerts(orgId: string, onAlert: (alert: any) => void) {
  return subscribeToTable('alerts', { event: 'INSERT' }, (p) => onAlert(p.new), orgId)
}

export function subscribeToUsageLogs(orgId: string, onLog: (log: any) => void) {
  return subscribeToTable('api_usage_logs', { event: 'INSERT' }, (p) => onLog(p.new), orgId)
}

// ─── Auth helpers ──────────────────────────────────────
export async function invokeEdgeFunction<T = any>(
  functionName: string,
  body: Record<string, any>,
): Promise<{ data: T | null; error: string | null }> {
  const { data: { session } } = await supabase.auth.getSession()
  const token = session?.access_token
  if (!token) return { data: null, error: 'Not authenticated' }

  const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || ''
  try {
    const res = await fetch(`${SUPABASE_URL}/functions/v1/${functionName}`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })
    const data = await res.json()
    if (!res.ok) return { data: null, error: data.error || `Function returned ${res.status}` }
    return { data, error: null }
  } catch (err) {
    return { data: null, error: err instanceof Error ? err.message : 'Network error' }
  }
}

export function getErrorMessage(error: unknown): string {
  if (error instanceof Error) return error.message
  if (typeof error === 'object' && error !== null) {
    const e = error as { message?: string; error?: string; details?: string }
    return e.message || e.error || e.details || 'An unknown error occurred'
  }
  return 'An unknown error occurred'
}

// ─── Safe query helper ──────────────────────────────────
export async function safeQuery<T>(
  query: PromiseLike<{ data: T | null; error: unknown }>,
): Promise<{ data: T | null; error: string | null }> {
  try {
    const { data, error } = await query
    if (error) return { data: null, error: getErrorMessage(error) }
    return { data, error: null }
  } catch (err) {
    return { data: null, error: getErrorMessage(err) }
  }
}

// ─── Storage helpers ────────────────────────────────────
export function getPublicUrl(bucket: string, path: string): string {
  const { data } = supabase.storage.from(bucket).getPublicUrl(path)
  return data?.publicUrl || ''
}

export async function uploadFile(
  bucket: string,
  path: string,
  file: File | Blob,
  contentType?: string,
): Promise<{ url: string | null; error: string | null }> {
  const { data, error } = await supabase.storage
    .from(bucket)
    .upload(path, file, { contentType, upsert: true })

  if (error) return { url: null, error: error.message }
  return { url: getPublicUrl(bucket, data.path), error: null }
}

export async function deleteFile(
  bucket: string,
  path: string,
): Promise<{ error: string | null }> {
  const { error } = await supabase.storage.from(bucket).remove([path])
  return { error: error ? error.message : null }
}
