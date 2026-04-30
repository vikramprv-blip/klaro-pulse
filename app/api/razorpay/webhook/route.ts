import { NextRequest, NextResponse } from 'next/server'
import crypto from 'crypto'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(req: NextRequest) {
  const body = await req.text()
  const sig = req.headers.get('x-razorpay-signature')!
  const expected = crypto.createHmac('sha256', process.env.RAZORPAY_WEBHOOK_SECRET!).update(body).digest('hex')
  if (expected !== sig) return NextResponse.json({ error: 'Invalid signature' }, { status: 400 })

  const event = JSON.parse(body)
  const entity = event?.payload?.payment?.entity

  if (event.event === 'payment.captured' && entity) {
    const { user_id, plan_id } = entity.notes ?? {}
    if (user_id && plan_id) {
      const ONE_TIME = ['single_report','lam_one_off','lam_setup','lam_soc_bundle']
      await supabase.from('subscriptions').insert({
        user_id, plan_id,
        stripe_subscription_id: entity.id,
        stripe_customer_id: entity.contact ?? null,
        status: 'active',
        current_period_start: new Date().toISOString(),
        current_period_end: ONE_TIME.includes(plan_id) ? null : new Date(Date.now() + 30*24*60*60*1000).toISOString()
      })
    }
  }

  if (event.event === 'subscription.cancelled') {
    const sub = event?.payload?.subscription?.entity
    if (sub?.id) {
      await supabase.from('subscriptions')
        .update({ status: 'canceled', updated_at: new Date().toISOString() })
        .eq('stripe_subscription_id', sub.id)
    }
  }

  return NextResponse.json({ received: true })
}
