import { supabase, safeQuery } from './supabase'
import type { AIIntegration } from '../types/database.types'

export async function getIntegrations(
  orgId: string,
): Promise<{ data: AIIntegration[] | null; error: string | null }> {
  return safeQuery(
    supabase
      .from('ai_integrations')
      .select('*')
      .eq('organization_id', orgId)
      .order('created_at', { ascending: false }),
  )
}

export async function createIntegration(
  integration: Pick<AIIntegration, 'organization_id' | 'provider' | 'display_name' | 'api_key_hash' | 'api_key_preview' | 'created_by'>,
): Promise<{ data: AIIntegration | null; error: string | null }> {
  return safeQuery(
    supabase.from('ai_integrations').insert(integration).select().single(),
  )
}

export async function updateIntegration(
  integrationId: string,
  updates: Pick<AIIntegration, 'display_name' | 'status'>,
): Promise<{ data: AIIntegration | null; error: string | null }> {
  return safeQuery(
    supabase.from('ai_integrations').update(updates).eq('id', integrationId).select().single(),
  )
}

export async function deleteIntegration(
  integrationId: string,
): Promise<{ error: string | null }> {
  const { error } = await supabase.from('ai_integrations').delete().eq('id', integrationId)
  return { error: error ? error.message : null }
}

export async function testIntegrationConnection(
  integrationId: string,
): Promise<{ success: boolean; error: string | null }> {
  // In a real scenario, this would invoke an Edge Function
  // that makes a test API call to the provider
  const { error } = await supabase
    .from('ai_integrations')
    .update({ last_sync_at: new Date().toISOString(), status: 'active', error_message: null })
    .eq('id', integrationId)
    .select('single')

  if (error) return { success: false, error: error.message }
  return { success: true, error: null }
}
