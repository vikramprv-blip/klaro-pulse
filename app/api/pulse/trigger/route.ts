import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

const svc = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(req: NextRequest) {
  const cookieStore = await cookies()
  const auth = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { getAll: () => cookieStore.getAll(), setAll: () => {} } }
  )
  const { data: { user } } = await auth.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { target_url, scan_mode } = await req.json()
  if (!target_url) return NextResponse.json({ error: 'Missing target_url' }, { status: 400 })

  const GITHUB_TOKEN = process.env.GITHUB_PAT
  if (!GITHUB_TOKEN) return NextResponse.json({ error: 'GITHUB_PAT not configured' }, { status: 500 })

  // Create lam_run row so dashboard shows it immediately
  const { data: lamRow } = await svc.from('lam_runs').insert({
    user_id: user.id,
    url: target_url,
    status: 'pending',
    progress: 5,
    progress_message: 'Queued — GitHub Actions starting...',
    triggered_by: user.email,
  }).select().single()

  console.log('LAM run created:', lamRow?.id)

  // Trigger GitHub Actions
  const response = await fetch(
    'https://api.github.com/repos/vikramprv-blip/klaro-pulse/actions/workflows/pulse.yml/dispatches',
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${GITHUB_TOKEN}`,
        Accept: 'application/vnd.github.v3+json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        ref: 'main',
        inputs: {
          target_url,
          scan_mode: scan_mode || 'lam',
          lam_run_id: lamRow?.id || '',
          user_id: user.id,
        }
      })
    }
  )

  if (response.status === 204) {
    return NextResponse.json({
      ok: true,
      lam_run_id: lamRow?.id,
      message: `LAM audit queued for ${target_url} — results in 8-12 minutes. Check dashboard for progress.`
    })
  }

  const err = await response.text()
  console.error('GitHub trigger failed:', err)

  // Update lam_run to error if trigger failed
  if (lamRow?.id) {
    await svc.from('lam_runs').update({ status: 'error', progress_message: 'GitHub Actions trigger failed' }).eq('id', lamRow.id)
  }

  return NextResponse.json({ error: 'GitHub trigger failed', detail: err }, { status: 500 })
}
