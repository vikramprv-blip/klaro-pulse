import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function checkQuota(userId: string, reportType: 'pulse'|'lam'|'soc', competitorCount: number) {
  const { data: sub } = await supabase
    .from('subscriptions')
    .select('*, plans(*), usage(*)')
    .eq('user_id', userId)
    .eq('status', 'active')
    .order('created_at', { ascending: false })
    .limit(1)
    .single()

  if (!sub) return { allowed: false, reason: 'No active subscription' }

  const plan = sub.plans
  const usage = sub.usage?.[0]

  if (reportType === 'pulse') {
    if (plan.report_limit !== null && (usage?.reports_used ?? 0) >= plan.report_limit)
      return { allowed: false, reason: `Report limit reached (${plan.report_limit})` }
    if (competitorCount > plan.competitor_limit)
      return { allowed: false, reason: `Plan allows max ${plan.competitor_limit} competitors` }
  }

  if (reportType === 'lam') {
    if (!plan.lam_monitoring && plan.lam_audits === 0)
      return { allowed: false, reason: 'LAM not included in plan' }
    if (!plan.lam_monitoring && (usage?.lam_audits_used ?? 0) >= plan.lam_audits)
      return { allowed: false, reason: 'LAM audit limit reached' }
  }

  if (reportType === 'soc' && !plan.soc_monitoring)
    return { allowed: false, reason: 'SOC not included in plan' }

  return { allowed: true, subscription: sub }
}

export async function incrementUsage(userId: string, subscriptionId: string, field: 'reports_used'|'lam_audits_used') {
  const { data: usage } = await supabase
    .from('usage')
    .select('*')
    .eq('user_id', userId)
    .eq('subscription_id', subscriptionId)
    .single()

  if (usage) {
    await supabase.from('usage').update({ [field]: usage[field] + 1, updated_at: new Date().toISOString() }).eq('id', usage.id)
  } else {
    await supabase.from('usage').insert({ user_id: userId, subscription_id: subscriptionId, [field]: 1 })
  }
}
