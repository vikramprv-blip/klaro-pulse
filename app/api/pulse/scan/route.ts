import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

export const maxDuration = 60

const svc = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

async function setProgress(id: string, pct: number, msg: string) {
  await svc.from('pulse_scans').update({ progress: pct, progress_message: msg, status: 'scanning' }).eq('id', id)
}

async function callLLM(prompt: string): Promise<any> {
  const providers: Array<{name: string, fn: () => Promise<any>}> = []

  if (process.env.CEREBRAS_API_KEY) {
    providers.push({ name: 'Cerebras', fn: async () => {
      const r = await fetch('https://api.cerebras.ai/v1/chat/completions', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${process.env.CEREBRAS_API_KEY}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ model: 'llama-3.3-70b', messages: [{ role: 'user', content: prompt }], response_format: { type: 'json_object' }, temperature: 0.2, max_tokens: 4000 })
      })
      const d = await r.json()
      if (!d.choices?.[0]?.message?.content) throw new Error('No content: ' + JSON.stringify(d))
      return JSON.parse(d.choices[0].message.content)
    }})
  }

  if (process.env.GROQ_API_KEY) {
    providers.push({ name: 'Groq', fn: async () => {
      const r = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${process.env.GROQ_API_KEY}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ model: 'llama-3.3-70b-versatile', messages: [{ role: 'user', content: prompt }], response_format: { type: 'json_object' }, temperature: 0.2, max_tokens: 4000 })
      })
      const d = await r.json()
      if (!d.choices?.[0]?.message?.content) throw new Error('No content: ' + JSON.stringify(d))
      return JSON.parse(d.choices[0].message.content)
    }})
  }

  for (const { name, fn } of providers) {
    try {
      console.log(`Trying LLM: ${name}`)
      const result = await fn()
      console.log(`LLM success: ${name}, score: ${result.overall_score}`)
      return result
    } catch (e: any) {
      console.error(`LLM ${name} failed:`, e.message)
    }
  }
  throw new Error('All LLM providers failed')
}

async function fetchSiteData(url: string) {
  const r = await fetch(url, {
    headers: { 'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36' },
    signal: AbortSignal.timeout(20000)
  })
  const html = await r.text()
  const title = html.match(/<title[^>]*>([^<]+)<\/title>/i)?.[1]?.trim() || ''
  const metaDesc = html.match(/<meta[^>]+name=["']description["'][^>]+content=["']([^"']{10,})/i)?.[1] || ''
  const h1s = [...html.matchAll(/<h1[^>]*>([^<]{3,})<\/h1>/gi)].map(m => m[1].trim()).slice(0, 5)
  const h2s = [...html.matchAll(/<h2[^>]*>([^<]{3,})<\/h2>/gi)].map(m => m[1].trim()).slice(0, 10)
  const hasSSL = url.startsWith('https://')
  const hasCookie = /cookie.{0,20}(consent|banner|notice)|gdpr/i.test(html)
  const hasPrivacy = /privacy.{0,10}policy|privacy-policy/i.test(html)
  const hasForm = /<form/i.test(html)
  const hasPhone = /(\+\d{1,3}[\s.-]?)?\(?\d{3}\)?[\s.-]?\d{3}[\s.-]?\d{4}/.test(html)
  const imgs = (html.match(/<img/gi) || []).length
  const imgsAlt = (html.match(/<img[^>]+alt=["'][^"']{3,}["']/gi) || []).length
  const body = html.replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/<style[\s\S]*?<\/style>/gi, '')
    .replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 4000)
  return { title, metaDesc, h1s, h2s, hasSSL, hasCookie, hasPrivacy, hasForm, hasPhone, imgs, imgsAlt, body, status: r.status, size: html.length }
}

export async function POST(req: NextRequest) {
  const cookieStore = await cookies()
  const auth = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { getAll: () => cookieStore.getAll(), setAll: () => {} } }
  )
  const { data: { user } } = await auth.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { url } = await req.json()
  if (!url) return NextResponse.json({ error: 'Missing url' }, { status: 400 })

  const { data: row, error: ie } = await svc.from('pulse_scans').insert({
    user_id: user.id, url, scan_type: 'llm',
    status: 'scanning', progress: 5, progress_message: 'Starting scan...'
  }).select().single()

  if (ie || !row) return NextResponse.json({ error: ie?.message || 'Insert failed' }, { status: 500 })
  const id = row.id

  // Return scan_id immediately so dashboard can show progress bar
  // Then continue processing async
  const responsePromise = (async () => {
    try {
      await setProgress(id, 15, 'Connecting to site...')
      let siteData: any
      try {
        siteData = await fetchSiteData(url)
        await setProgress(id, 35, `Site fetched (${Math.round(siteData.size/1024)}KB) — analysing content...`)
      } catch (e: any) {
        console.error('Fetch failed:', e.message)
        siteData = { title: '', metaDesc: '', h1s: [], h2s: [], hasSSL: url.startsWith('https://'), hasCookie: false, hasPrivacy: false, hasForm: false, hasPhone: false, imgs: 0, imgsAlt: 0, body: '', status: 0, size: 0 }
        await setProgress(id, 35, 'Site fetch timed out — running AI analysis with available data...')
      }

      await setProgress(id, 55, 'Running AI audit (UX, trust, conversion, security)...')

      const prompt = `You are a senior web consultant doing a detailed audit of ${url} for a business client.

SITE DATA COLLECTED:
- Page title: "${siteData.title}"
- Meta description: "${siteData.metaDesc}"
- H1 headings: ${siteData.h1s.length ? siteData.h1s.map((h: string) => `"${h}"`).join(', ') : 'none found'}
- H2 headings: ${siteData.h2s.length ? siteData.h2s.map((h: string) => `"${h}"`).join(', ') : 'none found'}
- HTTPS/SSL: ${siteData.hasSSL}
- Cookie consent banner: ${siteData.hasCookie}
- Privacy policy linked: ${siteData.hasPrivacy}
- Contact/conversion form: ${siteData.hasForm}
- Phone number visible: ${siteData.hasPhone}
- Total images: ${siteData.imgs}, with alt text: ${siteData.imgsAlt}
- HTTP status: ${siteData.status}, page size: ${siteData.size} bytes
- Page text: "${siteData.body}"

Provide a thorough, specific audit mentioning actual content found. Be critical and specific.

Return ONLY JSON with:
overall_score (0-100), trust_score (0-100), conversion_score (0-100), security_score (0-100), mobile_score (0-100),
grade (A/B/C/D/F), industry (string),
novice_summary (3-4 sentences specific to this site),
one_line_verdict (one punchy sentence about this specific site),
competitor_advantage (what competitors do better specifically),
ux_friction_points (array of 5 specific UX problems),
resolution_steps (array of 5 specific fixes),
revenue_opportunities (array of 3 specific opportunities),
strengths (array of 4 specific strengths),
mobile_readiness ("Good"|"Needs Work"|"Poor"),
pricing_clarity ("Clear"|"Vague"|"Hidden"|"Not applicable"),
cta_effectiveness ("Strong"|"Weak"|"Missing"),
target_audience_clarity ("Clear"|"Vague"|"Confusing"),
revenue_impact (string e.g. "$3,000 - $8,000/month lost"),
priority_actions (object: week_1 string, month_1 string, quarter_1 string)`

      await setProgress(id, 75, 'AI analysis running...')
      const report = await callLLM(prompt)

      await setProgress(id, 90, 'Saving report...')
      await svc.from('pulse_scans').update({
        status: 'complete', progress: 100, progress_message: 'Complete ✓',
        overall_score: report.overall_score || 0,
        trust_score: report.trust_score || 0,
        conversion_score: report.conversion_score || 0,
        security_score: report.security_score || 0,
        mobile_score: report.mobile_score || 0,
        report, completed_at: new Date().toISOString()
      }).eq('id', id)

      return { ok: true, score: report.overall_score, scan_id: id }
    } catch (e: any) {
      console.error('Scan error:', e.message)
      await svc.from('pulse_scans').update({ status: 'error', error_text: e.message, progress: 0 }).eq('id', id)
      return { error: e.message }
    }
  })()

  const result = await responsePromise
  return NextResponse.json(result)
}
