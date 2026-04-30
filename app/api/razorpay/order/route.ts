import { NextRequest, NextResponse } from 'next/server'
import Razorpay from 'razorpay'

const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID!,
  key_secret: process.env.RAZORPAY_KEY_SECRET!,
})

const PLAN_AMOUNTS: Record<string, { amount: number; currency: string }> = {
  single_report:  { amount: 499900,   currency: 'INR' },
  starter:        { amount: 1249900,  currency: 'INR' },
  growth:         { amount: 3299900,  currency: 'INR' },
  agency:         { amount: 4999900,  currency: 'INR' },
  lam_one_off:    { amount: 2499900,  currency: 'INR' },
  lam_monthly:    { amount: 4149900,  currency: 'INR' },
  soc_monthly:    { amount: 8299900,  currency: 'INR' },
  lam_setup:      { amount: 41499900, currency: 'INR' },
  lam_soc_bundle: { amount: 66499900, currency: 'INR' },
}

export async function POST(req: NextRequest) {
  const { user_id, plan_id, email, name, contact } = await req.json()
  const plan = PLAN_AMOUNTS[plan_id]
  if (!plan) return NextResponse.json({ error: 'Invalid plan' }, { status: 400 })

  const order = await razorpay.orders.create({
    amount: plan.amount,
    currency: plan.currency,
    receipt: `${user_id}_${plan_id}_${Date.now()}`,
    notes: { user_id, plan_id, email, name, contact }
  })

  return NextResponse.json({
    order_id: order.id,
    amount: plan.amount,
    currency: plan.currency,
    key_id: process.env.RAZORPAY_KEY_ID,
    name, email, contact
  })
}
