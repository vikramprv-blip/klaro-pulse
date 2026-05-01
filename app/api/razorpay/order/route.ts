import { NextRequest, NextResponse } from 'next/server'

export async function POST(req: NextRequest) {
  const key_id = process.env.RAZORPAY_KEY_ID
  const key_secret = process.env.RAZORPAY_KEY_SECRET
  if (!key_id || !key_secret) {
    return NextResponse.json({ error: 'Razorpay not configured' }, { status: 503 })
  }
  const Razorpay = (await import('razorpay')).default
  const razorpay = new Razorpay({ key_id, key_secret })
  const { amount, currency = 'USD', receipt } = await req.json()
  const order = await razorpay.orders.create({ amount, currency, receipt })
  return NextResponse.json(order)
}
