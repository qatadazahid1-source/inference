import { supabase, safeQuery } from './supabase'
import type { NotificationPreferences } from '../types/database.types'

export async function getNotificationPreferences(
  userId: string,
): Promise<{ data: NotificationPreferences | null; error: string | null }> {
  return safeQuery(
    supabase
      .from('notification_preferences')
      .select('*')
      .eq('user_id', userId)
      .single(),
  )
}

export async function updateNotificationPreferences(
  userId: string,
  updates: Partial<NotificationPreferences>,
): Promise<{ data: NotificationPreferences | null; error: string | null }> {
  return safeQuery(
    supabase
      .from('notification_preferences')
      .update(updates)
      .eq('user_id', userId)
      .select()
      .single(),
  )
}

export async function resetNotificationPreferences(
  userId: string,
): Promise<{ data: NotificationPreferences | null; error: string | null }> {
  const defaults: Partial<NotificationPreferences> = {
    budget_alerts_email: true,
    budget_alerts_inapp: true,
    budget_alerts_slack: false,
    budget_alerts_sms: false,
    cost_anomaly_email: true,
    cost_anomaly_inapp: true,
    cost_anomaly_slack: true,
    cost_anomaly_sms: false,
    weekly_digest_email: true,
    monthly_report_email: true,
    team_alerts_inapp: true,
    security_alerts_email: true,
    security_alerts_sms: false,
    billing_alerts_email: true,
  }

  return safeQuery(
    supabase.from('notification_preferences').update(defaults).eq('user_id', userId).select().single(),
  )
}
