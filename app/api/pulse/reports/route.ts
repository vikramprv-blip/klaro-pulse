import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

const svc = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function GET() {
  const cookieStore = await cookies()
  const auth = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { getAll: () => cookieStore.getAll(), setAll: () => {} } }
  )
  const { data: { user } } = await auth.auth.getUser()
  if (!user) return NextResponse.json({ scans: [], lam: [] })

  const { data: scans } = await svc.from('pulse_scans')
    .select('*').eq('user_id', user.id)
    .order('created_at', { ascending: false }).limit(100)

  const { data: lam } = await svc.from('lam_runs')
    .select('*').eq('user_id', user.id)
    .order('created_at', { ascending: false }).limit(50)

  return NextResponse.json({ scans: scans || [], lam: lam || [], user_id: user.id })
}
