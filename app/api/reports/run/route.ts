import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { checkQuota, incrementUsage } from '@/lib/quota'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(req: NextRequest) {
  const { user_id, report_type, competitor_count } = await req.json()
  const quota = await checkQuota(user_id, report_type, competitor_count ?? 0)
  if (!quota.allowed) return NextResponse.json({ error: quota.reason }, { status: 403 })

  const { data: run } = await supabase.from('report_runs').insert({
    user_id, subscription_id: quota.subscription.id,
    report_type, competitor_count, status: 'running'
  }).select().single()

  await incrementUsage(user_id, quota.subscription.id, report_type === 'lam' ? 'lam_audits_used' : 'reports_used')

  return NextResponse.json({ run_id: run.id, status: 'running' })
}
