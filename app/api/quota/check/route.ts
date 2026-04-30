import { NextRequest, NextResponse } from 'next/server'
import { checkQuota } from '@/lib/quota'

export async function POST(req: NextRequest) {
  const { user_id, report_type, competitor_count } = await req.json()
  if (!user_id || !report_type) return NextResponse.json({ error: 'Missing params' }, { status: 400 })
  const result = await checkQuota(user_id, report_type, competitor_count ?? 0)
  return NextResponse.json(result, { status: result.allowed ? 200 : 403 })
}
