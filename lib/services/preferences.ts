import { supabase } from '@/lib/supabase'

export interface UserPreferences {
  moments_theme: 'dark' | 'light'
}

const DEFAULTS: UserPreferences = {
  moments_theme: 'dark',
}

export async function getUserPreferences(): Promise<UserPreferences> {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return DEFAULTS

  const { data, error } = await supabase
    .from('user_preferences')
    .select('moments_theme')
    .eq('user_id', user.id)
    .single()

  if (error || !data) return DEFAULTS

  return {
    moments_theme: data.moments_theme || 'dark',
  }
}

export async function updateUserPreferences(
  preferences: Partial<UserPreferences>
): Promise<boolean> {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return false

  const { error } = await supabase
    .from('user_preferences')
    .upsert(
      { user_id: user.id, ...preferences },
      { onConflict: 'user_id' }
    )

  if (error) {
    console.error('Failed to save preferences:', error.message)
    return false
  }

  return true
}
