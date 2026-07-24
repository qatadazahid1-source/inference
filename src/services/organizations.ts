import { supabase, safeQuery } from './supabase'
import type { Organization, OrganizationMember } from '../types/database.types'

// ─── Organizations ─────────────────────────────────────

export async function getOrganization(
  orgId: string,
): Promise<{ data: Organization | null; error: string | null }> {
  return safeQuery(
    supabase.from('organizations').select('*').eq('id', orgId).single(),
  )
}

export async function getUserOrganizations(): Promise<{
  data: (Organization & { role: string })[] | null
  error: string | null
}> {
  return safeQuery(
    supabase
      .from('organization_members')
      .select('organizations!inner(*), role')
      .eq('status', 'active') as any,
  )
}

export async function createOrganization(
  org: Pick<Organization, 'name' | 'slug'>,
): Promise<{ data: Organization | null; error: string | null }> {
  const { data: user } = await supabase.auth.getUser()
  if (!user?.user) return { data: null, error: 'Not authenticated' }

  const { data: orgData, error: orgError } = await safeQuery<Organization>(
    supabase.from('organizations').insert(org).select().single(),
  )

  if (orgError || !orgData) return { data: null, error: orgError }

  // Add creator as owner
  await supabase.from('organization_members').insert({
    organization_id: orgData.id,
    user_id: user.user.id,
    role: 'owner',
    status: 'active',
    joined_at: new Date().toISOString(),
  })

  return { data: orgData, error: null }
}

export async function updateOrganization(
  orgId: string,
  updates: Partial<Organization>,
): Promise<{ data: Organization | null; error: string | null }> {
  return safeQuery(
    supabase.from('organizations').update(updates).eq('id', orgId).select().single(),
  )
}

// ─── Members ───────────────────────────────────────────

export async function getOrganizationMembers(
  orgId: string,
): Promise<{ data: (OrganizationMember & { user?: { email: string; full_name: string; avatar_url: string | null } })[] | null; error: string | null }> {
  // Avoid the embedded PostgREST join ('*, users(...)') — this exact pattern
  // has repeatedly broken elsewhere in this codebase when the FK alias
  // didn't match the live schema. Two plain queries + a manual merge is a
  // few more lines but doesn't fail silently.
  const { data: members, error: membersError } = await safeQuery<OrganizationMember[]>(
    supabase.from('organization_members').select('*').eq('organization_id', orgId),
  )

  if (membersError || !members) return { data: null, error: membersError }
  if (members.length === 0) return { data: [], error: null }

  const userIds = members.map((m) => m.user_id)
  const { data: users, error: usersError } = await safeQuery<
    { id: string; email: string; full_name: string; avatar_url: string | null }[]
  >(supabase.from('users').select('id, email, full_name, avatar_url').in('id', userIds))

  if (usersError) return { data: null, error: usersError }

  const usersById = new Map((users ?? []).map((u) => [u.id, u]))
  const merged = members.map((m) => ({ ...m, user: usersById.get(m.user_id) }))

  return { data: merged, error: null }
}

export async function updateMemberRole(
  memberId: string,
  role: OrganizationMember['role'],
): Promise<{ data: OrganizationMember | null; error: string | null }> {
  return safeQuery(
    supabase.from('organization_members').update({ role }).eq('id', memberId).select().single(),
  )
}

export async function removeMember(
  memberId: string,
): Promise<{ error: string | null }> {
  const { error } = await supabase.from('organization_members').delete().eq('id', memberId)
  return { error: error ? error.message : null }
}
