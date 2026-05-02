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
  const errors: string[] = []

  if (process.env.CEREBRAS_API_KEY) {
    try {
      console.log('Trying Cerebras...')
      const r = await fetch('https://api.cerebras.ai/v1/chat/completions', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${process.env.CEREBRAS_API_KEY}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ model: 'llama-3.3-70b', messages: [{ role: 'user', content: prompt }], response_format: { type: 'json_object' }, temperature: 0.2, max_tokens: 6000 })
      })
      const d = await r.json()
      console.log('Cerebras status:', r.status, 'keys:', Object.keys(d))
      if (d.choices?.[0]?.message?.content) {
        const parsed = JSON.parse(d.choices[0].message.content)
        console.log('Cerebras parsed keys:', Object.keys(parsed).slice(0, 10).join(', '))
        console.log('overall_score:', parsed.overall_score, 'company_name:', parsed.company_name)
        return parsed
      }
      errors.push('Cerebras: no content - ' + JSON.stringify(d).slice(0, 200))
    } catch (e: any) {
      errors.push('Cerebras: ' + e.message)
      console.error('Cerebras failed:', e.message)
    }
  }

  if (process.env.GROQ_API_KEY) {
    try {
      console.log('Trying Groq...')
      const r = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${process.env.GROQ_API_KEY}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ model: 'llama-3.3-70b-versatile', messages: [{ role: 'user', content: prompt }], response_format: { type: 'json_object' }, temperature: 0.2, max_tokens: 6000 })
      })
      const d = await r.json()
      console.log('Groq status:', r.status)
      if (d.choices?.[0]?.message?.content) {
        const parsed = JSON.parse(d.choices[0].message.content)
        console.log('Groq parsed keys:', Object.keys(parsed).slice(0, 10).join(', '))
        return parsed
      }
      errors.push('Groq: no content - ' + JSON.stringify(d).slice(0, 200))
    } catch (e: any) {
      errors.push('Groq: ' + e.message)
      console.error('Groq failed:', e.message)
    }
  }

  throw new Error('All LLM providers failed: ' + errors.join(' | '))
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
    .replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 3000)
  console.log(`Fetched ${url}: ${html.length} bytes, title: "${rawTitle}", company: "${companyName}"`)
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

  // Check if we have a previous completed scan for this URL to use as score baseline
  const { data: prevScan } = await svc.from('pulse_scans')
    .select('overall_score, trust_score, conversion_score, security_score, mobile_score, grade')
    .eq('user_id', user.id)
    .eq('url', url)
    .eq('status', 'complete')
    .order('created_at', { ascending: false })
    .limit(1)
    .single()
  const lockedScores = prevScan || null

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
      console.error('Fetch failed:', e.message)
      s = { companyName: '', rawTitle: '', metaDesc: '', h1s: [], h2s: [], hasSSL: url.startsWith('https://'), hasCookie: false, hasPrivacy: false, hasTerms: false, hasForm: false, hasPhone: false, hasChat: false, hasTestimonials: false, hasPricing: false, hasCTA: false, imgs: 0, imgsAlt: 0, hasSchema: false, body: '', status: 0, size: 0 }
      await setProgress(id, 35, 'Running AI analysis...')
    }

    // Run DNS/SSL security check in parallel
    let securityData: any = {}
    try {
      const secRes = await fetch(`${process.env.NEXT_PUBLIC_APP_URL || 'https://klaro-pulse.vercel.app'}/api/pulse/security`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url })
      })
      securityData = await secRes.json()
      console.log('Security check done, email score:', securityData.email_security_score)
    } catch (e: any) {
      console.error('Security check failed:', e.message)
    }

    await setProgress(id, 55, 'Running AI audit...')

    const prompt = `You are a senior web consultant producing a professional site intelligence report for ${url}.

DETECTED DATA:
Company: "${s.companyName}" | Title: "${s.rawTitle}"
Description: "${s.metaDesc}"
H1s: ${s.h1s.join(' | ') || 'none found'}
H2s: ${s.h2s.slice(0,5).join(' | ') || 'none found'}
HTTPS: ${s.hasSSL} | Cookie consent: ${s.hasCookie} | Privacy policy: ${s.hasPrivacy} | Terms: ${s.hasTerms}
Contact form: ${s.hasForm} | Phone: ${s.hasPhone} | Live chat: ${s.hasChat}
Testimonials: ${s.hasTestimonials} | Pricing visible: ${s.hasPricing} | CTA: ${s.hasCTA}
Images: ${s.imgs} total / ${s.imgsAlt} with alt text | Schema: ${s.hasSchema}
Status: ${s.status} | Size: ${s.size} bytes
Content: "${s.body.slice(0, 2000)}"
DNS/EMAIL SECURITY:
- SPF record: ${securityData.checks?.spf?.found ? 'Found: ' + (securityData.checks.spf.record || 'yes') : 'NOT FOUND'}
- DMARC policy: ${securityData.checks?.dmarc?.found ? 'Found, policy=' + (securityData.checks.dmarc.policy || 'unknown') : 'NOT FOUND'}
- DKIM configured: ${securityData.checks?.dkim?.found ? 'Yes' : 'No'}
- Email security score: ${securityData.email_security_score ?? 'unknown'}/100
- SSL valid: ${securityData.checks?.ssl?.valid ?? s.hasSSL}

Return a JSON object with ALL these keys (no extras, no missing):
{
  "company_name": "actual business name not domain",
  "overall_score": 75,
  "trust_score": 80,
  "conversion_score": 60,
  "security_score": 90,
  "mobile_score": 70,
  "grade": "B",
  "urgency": "High",
  "industry": "very specific industry e.g. Chartered accountancy and tax advisory",
  "executive_verdict": "one punchy sentence about this specific site",
  "executive_summary": "3-4 sentences about the business and main issues",
  "revenue_impact": "Fixing top issues could lift enquiry volume by 20-35%",
  "priority_week_1": "specific action for this week",
  "priority_month_1": "specific action for this month",
  "priority_quarter_1": "specific action for this quarter",
  "conversion_killers": [],
  "quick_wins": ["free fix 1", "free fix 2", "free fix 3"],
  "ux_friction_points": ["problem 1", "problem 2", "problem 3", "problem 4", "problem 5"],
  "resolution_steps": ["fix 1", "fix 2", "fix 3", "fix 4", "fix 5"],
  "mobile_readiness": "Good",
  "pricing_clarity": "Vague",
  "cta_effectiveness": "Weak",
  "target_audience_clarity": "Clear",
  "load_speed_impression": "Average",
  "market_position": "2-3 sentences on market position",
  "why_clients_choose_competitors": "specific reasons",
  "biggest_competitor_advantage": "what competitors do better",
  "opportunity_to_win": "specific opportunity",
  "strengths": ["strength 1", "strength 2", "strength 3", "strength 4"],
  "revenue_opportunities": ["opportunity 1", "opportunity 2", "opportunity 3"],
  "https_score": 100,
  "mobile_ada_score": 70,
  "cookie_consent_score": 0,
  "privacy_policy_score": 80,
  "soc2_readiness_score": 50,
  "gdpr_status_score": 60,
  "overall_compliance_score": 65,
  "compliance_risk_level": "MEDIUM RISK",
  "https_status": "Valid SSL certificate, HTTPS enforced",
  "mobile_ada_status": "Needs Work",
  "cookie_status": "No consent banner found",
  "privacy_status": "Privacy policy page found",
  "legal_risks": ["legal risk 1", "legal risk 2"],
  "security_issues": ["security issue 1"],
  "compliance_recommendations": ["fix 1", "fix 2", "fix 3"],
  "roadmap_week_1": {"title": "Quick Wins", "target_score": 65, "cost": "Free", "developer_needed": false, "actions": ["action 1", "action 2", "action 3"]},
  "roadmap_month_1": {"title": "Foundation", "target_score": 75, "cost": "Under $500", "developer_needed": true, "actions": ["action 1", "action 2", "action 3"]},
  "roadmap_month_2_3": {"title": "Growth", "target_score": 90, "cost": "$500-$2000", "developer_needed": true, "actions": ["action 1", "action 2", "action 3"]},
  "expected_outcome_90_days": "specific expected outcome",
  "monitoring_recommendation": "recommendation for ongoing monitoring"
}`

    await setProgress(id, 75, 'Generating 5-section report...')
    const report = await callLLM(prompt)

    if (!report || !report.overall_score) {
      console.error('Report missing required fields:', JSON.stringify(report).slice(0, 300))
      throw new Error('LLM returned incomplete report')
    }

    await setProgress(id, 90, 'Saving report...')
    await svc.from('pulse_scans').update({
      status: 'complete', progress: 100, progress_message: 'Complete ✓',
      overall_score: report.overall_score || 0,
      baseline_score: lockedScores ? lockedScores.overall_score : (report.overall_score || 0),
      baseline_grade: lockedScores ? lockedScores.grade : (report.grade || '—'),
      score_delta: lockedScores ? (report.overall_score || 0) - lockedScores.overall_score : 0,
      is_baseline: !lockedScores,
      trust_score: report.trust_score || 0,
      conversion_score: report.conversion_score || 0,
      security_score: report.security_score || 0,
      mobile_score: report.mobile_score || 0,
      report: { ...report, dns_security: securityData }, completed_at: new Date().toISOString()
    }).eq('id', id)

    return NextResponse.json({ ok: true, score: report.overall_score, scan_id: id })
  } catch (e: any) {
    console.error('Scan error:', e.message)
    await svc.from('pulse_scans').update({
      status: 'error', error_text: e.message, progress: 0, progress_message: 'Failed'
    }).eq('id', id)
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
