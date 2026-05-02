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

  // Create lam_run row immediately so dashboard shows it
  const { data: lamRow } = await svc.from('lam_runs').insert({
    user_id: user.id,
    url: target_url,
    status: 'pending',
    progress: 5,
    progress_message: 'Queued — LAM agent starting...',
    triggered_by: user.email,
  }).select().single()

  const run_id = lamRow?.id

  // Try webhook server first (local Mac runner)
  const WEBHOOK_URL = process.env.LAM_WEBHOOK_URL || ''
  const WEBHOOK_SECRET = process.env.LAM_WEBHOOK_SECRET || 'klaro-lam-local-2026'

  if (WEBHOOK_URL) {
    try {
      const res = await fetch(`${WEBHOOK_URL}/lam-trigger`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Webhook-Secret': WEBHOOK_SECRET,
        },
        body: JSON.stringify({ target_url, user_id: user.id, run_id }),
        signal: AbortSignal.timeout(5000)
      })
      if (res.ok) {
        return NextResponse.json({
          ok: true,
          run_id,
          message: `🤖 LAM audit queued for ${target_url} — results in 8-12 minutes`
        })
      }
    } catch (e) {
      console.log('Webhook not available, falling back to GitHub Actions')
    }
  }

  // Fallback to GitHub Actions
  const GITHUB_TOKEN = process.env.GITHUB_PAT
  if (GITHUB_TOKEN) {
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
          inputs: { target_url, scan_mode: 'lam', lam_run_id: run_id || '', user_id: user.id }
        })
      }
    )
    if (response.status === 204) {
      return NextResponse.json({
        ok: true,
        run_id,
        message: `🤖 LAM audit queued for ${target_url} — results in 8-12 minutes`
      })
    }
  }

  // Neither worked — update row to error
  if (run_id) {
    await svc.from('lam_runs').update({
      status: 'error',
      progress_message: 'LAM runner not available. Run manually: ~/klaro-pulse/agents/lam-scan.sh ' + target_url
    }).eq('id', run_id)
  }

  return NextResponse.json({
    ok: false,
    run_id,
    message: `LAM runner offline. Run manually: ~/klaro-pulse/agents/lam-scan.sh ${target_url}`
  }, { status: 202 })
}
