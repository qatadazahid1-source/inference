import { supabase, safeQuery } from './supabase'
import type { Invitation } from '../types/database.types'

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || ''

// ─── Invitations ───────────────────────────────────────

export async function getInvitations(
  orgId: string,
): Promise<{ data: Invitation[] | null; error: string | null }> {
  return safeQuery(
    supabase
      .from('invitations')
      .select('*')
      .eq('organization_id', orgId)
      .is('accepted_at', null)
      .is('cancelled_at', null)
      .order('created_at', { ascending: false }),
  )
}

export async function inviteUser(
  orgId: string,
  email: string,
  role: string,
): Promise<{ data: Invitation | null; error: string | null }> {
  const { data: { session } } = await supabase.auth.getSession()
  const token = session?.access_token

  if (!token) return { data: null, error: 'Not authenticated' }

  try {
    const res = await fetch(
      `${SUPABASE_URL}/functions/v1/invite-user`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, role, organizationId: orgId }),
      },
    )

    const data = await res.json()
    if (!res.ok) return { data: null, error: data.error || 'Failed to invite user' }
    return { data: data.invitation, error: null }
  } catch (err) {
    return { data: null, error: err instanceof Error ? err.message : 'Network error' }
  }
}

export async function cancelInvitation(
  invitationId: string,
): Promise<{ error: string | null }> {
  const { error } = await supabase
    .from('invitations')
    .update({ cancelled_at: new Date().toISOString() })
    .eq('id', invitationId)

  return { error: error ? error.message : null }
}

export async function acceptInvitation(
  token: string,
  userId: string,
): Promise<{ error: string | null }> {
  // Get the invitation
  const { data: invitation, error: invError } = await supabase
    .from('invitations')
    .select('*')
    .eq('token', token)
    .is('accepted_at', null)
    .is('cancelled_at', null)
    .single()

  if (invError || !invitation) return { error: 'Invalid or expired invitation token' }

  if (new Date(invitation.expires_at) < new Date()) {
    return { error: 'Invitation has expired' }
  }

  // Create org membership
  const { error: memberError } = await supabase
    .from('organization_members')
    .insert({
      organization_id: invitation.organization_id,
      user_id: userId,
      role: invitation.role,
      status: 'active',
      joined_at: new Date().toISOString(),
    })

  if (memberError) return { error: memberError.message }

  // Mark invitation as accepted
  await supabase
    .from('invitations')
    .update({ accepted_at: new Date().toISOString() })
    .eq('id', invitation.id)

  return { error: null }
}

// ─── Security Sessions ─────────────────────────────────

export async function getSessions(
  userId: string,
): Promise<{ data: any[] | null; error: string | null }> {
  return safeQuery(
    supabase
      .from('security_sessions')
      .select('*')
      .eq('user_id', userId)
      .is('revoked_at', null)
      .order('last_active_at', { ascending: false }),
  )
}

export async function revokeSession(
  sessionId: string,
): Promise<{ error: string | null }> {
  const { error } = await supabase
    .from('security_sessions')
    .update({ revoked_at: new Date().toISOString(), is_current: false })
    .eq('id', sessionId)

  return { error: error ? error.message : null }
}
