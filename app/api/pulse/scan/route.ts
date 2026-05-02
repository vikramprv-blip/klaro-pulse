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
        body: JSON.stringify({ model: 'llama-3.3-70b', messages: [{ role: 'user', content: prompt }], response_format: { type: 'json_object' }, temperature: 0.2, max_tokens: 6000 })
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
        body: JSON.stringify({ model: 'llama-3.3-70b-versatile', messages: [{ role: 'user', content: prompt }], response_format: { type: 'json_object' }, temperature: 0.2, max_tokens: 6000 })
      })
      const d = await r.json()
      if (!d.choices?.[0]?.message?.content) throw new Error('No content: ' + JSON.stringify(d))
      return JSON.parse(d.choices[0].message.content)
    }})
  }
  for (const { name, fn } of providers) {
    try { const r = await fn(); console.log(`${name} success, score: ${r.overall_score}`); return r }
    catch (e: any) { console.error(`${name} failed:`, e.message) }
  }
  throw new Error('All LLM providers failed')
}

async function fetchSiteData(url: string) {
  const r = await fetch(url, {
    headers: { 'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36' },
    signal: AbortSignal.timeout(20000)
  })
  const html = await r.text()
  const rawTitle = html.match(/<title[^>]*>([^<]+)<\/title>/i)?.[1]?.trim() || ''
  const companyName = rawTitle.split(/[|\-–—]{1,2}/)[0].trim() || rawTitle
  const metaDesc = html.match(/<meta[^>]+name=["']description["'][^>]+content=["']([^"']{10,})/i)?.[1] || ''
  const h1s = [...html.matchAll(/<h1[^>]*>([^<]{3,})<\/h1>/gi)].map(m => m[1].trim()).slice(0, 5)
  const h2s = [...html.matchAll(/<h2[^>]*>([^<]{3,})<\/h2>/gi)].map(m => m[1].trim()).slice(0, 10)
  const hasSSL = url.startsWith('https://')
  const hasCookie = /cookie.{0,20}(consent|banner|notice)|gdpr/i.test(html)
  const hasPrivacy = /privacy.{0,10}policy|privacy-policy/i.test(html)
  const hasTerms = /terms.{0,10}(of.{0,5}service|use|conditions)/i.test(html)
  const hasForm = /<form/i.test(html)
  const hasPhone = /(\+\d{1,3}[\s.-]?)?\(?\d{3}\)?[\s.-]?\d{3}[\s.-]?\d{4}/.test(html)
  const hasChat = /intercom|drift|crisp|tawk|livechat|zendesk/i.test(html)
  const hasTestimonials = /testimonial|review|rated|stars|trustpilot/i.test(html)
  const hasPricing = /pricing|price|per month|per year|\$\d/i.test(html)
  const hasCTA = /get started|sign up|book|contact us|free trial|buy now/i.test(html)
  const imgs = (html.match(/<img/gi) || []).length
  const imgsAlt = (html.match(/<img[^>]+alt=["'][^"']{3,}["']/gi) || []).length
  const hasSchema = /application\/ld\+json/i.test(html)
  const body = html.replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/<style[\s\S]*?<\/style>/gi, '')
    .replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 4000)
  return { companyName, rawTitle, metaDesc, h1s, h2s, hasSSL, hasCookie, hasPrivacy, hasTerms, hasForm, hasPhone, hasChat, hasTestimonials, hasPricing, hasCTA, imgs, imgsAlt, hasSchema, body, status: r.status, size: html.length }
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

  try {
    await setProgress(id, 15, 'Connecting to site...')
    let s: any
    try {
      s = await fetchSiteData(url)
      await setProgress(id, 35, `Analysing ${s.companyName || url}...`)
    } catch (e: any) {
      s = { companyName: '', rawTitle: '', metaDesc: '', h1s: [], h2s: [], hasSSL: url.startsWith('https://'), hasCookie: false, hasPrivacy: false, hasTerms: false, hasForm: false, hasPhone: false, hasChat: false, hasTestimonials: false, hasPricing: false, hasCTA: false, imgs: 0, imgsAlt: 0, hasSchema: false, body: '', status: 0, size: 0 }
      await setProgress(id, 35, 'Running AI analysis...')
    }

    await setProgress(id, 55, 'Running 5-section audit...')

    const prompt = `You are a senior web consultant producing a professional 5-section site intelligence report for ${url}.

DETECTED DATA:
Company: "${s.companyName}" | Title: "${s.rawTitle}"
Description: "${s.metaDesc}"
H1s: ${s.h1s.join(' | ') || 'none'}
H2s: ${s.h2s.join(' | ') || 'none'}
HTTPS: ${s.hasSSL} | Cookie consent: ${s.hasCookie} | Privacy policy: ${s.hasPrivacy} | Terms: ${s.hasTerms}
Contact form: ${s.hasForm} | Phone: ${s.hasPhone} | Live chat: ${s.hasChat}
Testimonials/reviews: ${s.hasTestimonials} | Pricing visible: ${s.hasPricing} | Clear CTA: ${s.hasCTA}
Images: ${s.imgs} total / ${s.imgsAlt} with alt text | Schema markup: ${s.hasSchema}
HTTP status: ${s.status} | Page size: ${s.size} bytes
Page content: "${s.body}"

Produce a comprehensive professional audit. Be SPECIFIC to this business — mention actual content, actual headings, actual products/services found.

Return ONLY a JSON object with ALL these exact keys:

SECTION 1 — EXECUTIVE BRIEF:
company_name (string, actual business name NOT domain),
overall_score (integer 0-100),
trust_score (integer 0-100),
conversion_score (integer 0-100),
security_score (integer 0-100),
mobile_score (integer 0-100),
grade (string A/B/C/D/F),
urgency (string: "Critical (Immediate action required)" | "High" | "Medium" | "Low"),
industry (string VERY specific e.g. "Bathroom fittings & sanitaryware retail" NOT "E-commerce"),
executive_verdict (string, one punchy sentence about this specific business),
executive_summary (string, 3-4 sentences about the business, what it does, main issues, revenue impact potential),
revenue_impact (string e.g. "Fixing top issues could lift enquiry volume by 20-35%"),
priority_week_1 (string, specific action for this week),
priority_month_1 (string, specific action for this month),
priority_quarter_1 (string, specific action for this quarter),

SECTION 2 — UX & CONVERSION:
performance_scores (object: overall, trust, conversion, security as integers),
conversion_killers (array of objects with: issue string, impact string, fix string — max 3, or empty array if none),
quick_wins (array of strings, 3 free under-1-hour fixes specific to this site),
ux_friction_points (array of 5 specific UX problems),
resolution_steps (array of 5 specific fixes),
mobile_readiness (string: "Good" | "Needs Work" | "Poor"),
pricing_clarity (string: "Clear" | "Vague" | "Hidden" | "Not applicable"),
cta_effectiveness (string: "Strong" | "Weak" | "Missing"),
target_audience_clarity (string: "Clear" | "Vague" | "Confusing"),
load_speed_impression (string: "Fast" | "Average" | "Slow"),

SECTION 3 — COMPETITIVE INTELLIGENCE:
market_position (string, 2-3 sentences on where this business stands),
why_clients_choose_competitors (string, specific reasons clients leave),
biggest_competitor_advantage (string, what competitors do better),
opportunity_to_win (string, specific opportunity for this business),
strengths (array of 4 specific things this site does well),
revenue_opportunities (array of 3 specific revenue opportunities),

SECTION 4 — SECURITY & COMPLIANCE:
https_score (integer 0-100),
mobile_ada_score (integer 0-100),
cookie_consent_score (integer 0-100),
privacy_policy_score (integer 0-100),
soc2_readiness_score (integer 0-100),
gdpr_status_score (integer 0-100),
overall_compliance_score (integer 0-100),
compliance_risk_level (string: "HIGH RISK" | "MEDIUM RISK" | "LOW RISK"),
https_status (string: "Valid SSL certificate, HTTPS enforced" | "SSL issues detected" | "No HTTPS"),
mobile_ada_status (string: "Good" | "Needs Work" | "Poor"),
cookie_status (string: "Consent banner found" | "No consent banner found"),
privacy_status (string: "Privacy policy page found" | "No privacy policy found"),
legal_risks (array of strings, specific legal risks identified),
security_issues (array of strings, specific security issues),
compliance_recommendations (array of 3 strings, specific remediation steps),

SECTION 5 — 90-DAY ROADMAP:
roadmap_week_1 (object: title string, target_score integer, cost string, developer_needed boolean, actions array of 3 strings),
roadmap_month_1 (object: title string, target_score integer, cost string, developer_needed boolean, actions array of 3 strings),
roadmap_month_2_3 (object: title string, target_score integer, cost string, developer_needed boolean, actions array of 3 strings),
expected_outcome_90_days (string, specific outcome for this business),
monitoring_recommendation (string)`

    await setProgress(id, 75, 'Generating 5-section report...')
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

    return NextResponse.json({ ok: true, score: report.overall_score, scan_id: id })
  } catch (e: any) {
    console.error('Scan error:', e.message)
    await svc.from('pulse_scans').update({ status: 'error', error_text: e.message, progress: 0 }).eq('id', id)
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
