import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

export const maxDuration = 60

const svc = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

async function callLLM(prompt: string): Promise<any> {
  const providers: Array<() => Promise<any>> = []
  if (process.env.CEREBRAS_API_KEY) {
    providers.push(async () => {
      const r = await fetch('https://api.cerebras.ai/v1/chat/completions', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${process.env.CEREBRAS_API_KEY}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ model: 'llama-3.3-70b', messages: [{ role: 'user', content: prompt }], response_format: { type: 'json_object' }, temperature: 0.2, max_tokens: 4000 })
      })
      const d = await r.json()
      return JSON.parse(d.choices[0].message.content)
    })
  }
  if (process.env.GROQ_API_KEY) {
    providers.push(async () => {
      const r = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${process.env.GROQ_API_KEY}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ model: 'llama-3.3-70b-versatile', messages: [{ role: 'user', content: prompt }], response_format: { type: 'json_object' }, temperature: 0.2, max_tokens: 4000 })
      })
      const d = await r.json()
      return JSON.parse(d.choices[0].message.content)
    })
  }
  for (const fn of providers) {
    try { return await fn() } catch (e) { console.error('LLM failed:', e) }
  }
  throw new Error('All LLM providers failed')
}

export async function POST(req: NextRequest) {
  const cookieStore = await cookies()
  const auth = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { getAll: () => cookieStore.getAll(), setAll: () => {} } }
  )
  const { data: { user } } = await auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { url } = await req.json()
  if (!url) return NextResponse.json({ error: 'Missing url' }, { status: 400 })

  const { data: row, error: ie } = await svc.from('pulse_scans').insert({
    user_id: user.id, url, scan_type: 'llm', status: 'scanning', progress: 10, progress_message: 'Connecting...'
  }).select().single()

  if (ie || !row) return NextResponse.json({ error: ie?.message || 'Insert failed' }, { status: 500 })
  const id = row.id

  try {
    const res = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0 KlaroPulse/2.0' }, signal: AbortSignal.timeout(15000) })
    const html = await res.text()
    const title = html.match(/<title[^>]*>([^<]+)<\/title>/i)?.[1]?.trim() || ''
    const h1s = [...html.matchAll(/<h1[^>]*>([^<]+)<\/h1>/gi)].map(m => m[1].trim()).slice(0, 5)
    const h2s = [...html.matchAll(/<h2[^>]*>([^<]+)<\/h2>/gi)].map(m => m[1].trim()).slice(0, 8)
    const body = html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 3000)
    const hasSSL = url.startsWith('https://')
    const hasCookie = /cookie|consent|gdpr/i.test(html)
    const hasPrivacy = /privacy.policy|privacy-policy/i.test(html)
    const hasForm = /<form/i.test(html)
    const imgs = (html.match(/<img/gi) || []).length
    const imgsAlt = (html.match(/<img[^>]+alt=["'][^"']+["']/gi) || []).length

    await svc.from('pulse_scans').update({ progress: 50, progress_message: 'Running AI analysis...' }).eq('id', id)

    const report = await callLLM(`You are a senior web consultant auditing ${url}.
Title: ${title} | H1s: ${h1s.join(' | ')} | H2s: ${h2s.join(' | ')}
SSL: ${hasSSL} | Cookie banner: ${hasCookie} | Privacy policy: ${hasPrivacy} | Contact form: ${hasForm}
Images: ${imgs} total, ${imgsAlt} with alt text
Page content: ${body}

Return ONLY JSON with: overall_score, trust_score, conversion_score, security_score, mobile_score (all 0-100 integers), grade (A-F), industry, novice_summary, one_line_verdict, competitor_advantage, ux_friction_points (array), resolution_steps (array), revenue_opportunities (array), strengths (array), mobile_readiness, pricing_clarity, cta_effectiveness, target_audience_clarity, revenue_impact`)

    await svc.from('pulse_scans').update({
      status: 'complete', progress: 100, progress_message: 'Complete',
      overall_score: report.overall_score || 0,
      trust_score: report.trust_score || 0,
      conversion_score: report.conversion_score || 0,
      security_score: report.security_score || 0,
      mobile_score: report.mobile_score || 0,
      report, completed_at: new Date().toISOString()
    }).eq('id', id)

    return NextResponse.json({ ok: true, score: report.overall_score, scan_id: id })
  } catch (e: any) {
    await svc.from('pulse_scans').update({ status: 'error', error_text: e.message, progress: 0 }).eq('id', id)
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
