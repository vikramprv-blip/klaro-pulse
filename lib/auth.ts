import { createClient } from '@/lib/supabase/client'

export async function getUserProfile() {
  const sb = createClient()
  const { data: { user } } = await sb.auth.getUser()
  if (!user) return null

  // Check if admin first
  const { data: adminRow } = await sb
    .from('pulse_admins')
    .select('email')
    .eq('email', user.email)
    .single()

  if (adminRow) {
    return {
      id: user.id,
      email: user.email,
      plan: 'enterprise',
      scans_used_this_month: 0,
      trial_ends_at: '2099-01-01',
      is_admin: true,
    }
  }

  // Regular user — get from pulse_users
  const { data: profile } = await sb
    .from('pulse_users')
    .select('*')
    .eq('id', user.id)
    .single()

  return profile || { id: user.id, email: user.email, plan: 'trial', scans_used_this_month: 0, is_admin: false }
}
