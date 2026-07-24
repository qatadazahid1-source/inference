import { supabase, safeQuery } from './supabase'
import type { User } from '../types/database.types'

export async function getCurrentUserProfile(): Promise<{ data: User | null; error: string | null }> {
  const { data: authUser } = await supabase.auth.getUser()
  if (!authUser?.user) return { data: null, error: 'Not authenticated' }
  return safeQuery(
    supabase.from('users').select('*').eq('id', authUser.user.id).single(),
  )
}

export async function updateUserProfile(
  userId: string,
  updates: Partial<Pick<User, 'full_name' | 'avatar_url' | 'job_title' | 'phone_number' | 'timezone' | 'language'>>,
): Promise<{ data: User | null; error: string | null }> {
  return safeQuery(
    supabase.from('users').update(updates).eq('id', userId).select().single(),
  )
}

export async function uploadAvatar(
  userId: string,
  file: File,
): Promise<{ url: string | null; error: string | null }> {
  const ext = file.name.split('.').pop() || 'png'
  const path = `avatars/${userId}.${ext}`

  const { error: uploadError } = await supabase.storage
    .from('user-content')
    .upload(path, file, { upsert: true })

  if (uploadError) return { url: null, error: uploadError.message }

  const { data: urlData } = supabase.storage
    .from('user-content')
    .getPublicUrl(path)

  if (urlData?.publicUrl) {
    await supabase.from('users').update({ avatar_url: urlData.publicUrl }).eq('id', userId)
  }

  return { url: urlData?.publicUrl || null, error: null }
}
