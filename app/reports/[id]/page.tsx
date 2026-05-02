'use client'
import { useState, useEffect } from 'react'

// Screen colors (dark theme)
const C = {
  bg: '#080c14',
  card: '#0f1420',
  border: '#1e2a3a',
  borderDim: '#0d1520',
  text: '#94a3b8',
  textDim: '#64748b',
  textFaint: '#475569',
  textFainter: '#334155',
  white: 'white',
  accent: '#6366f1',
  green: '#4ade80',
  greenBg: '#052e16',
  greenBorder: '#166534',
  greenText: '#86efac',
  yellow: '#fbbf24',
  red: '#f87171',
  redBg: '#1c0505',
  redBorder: '#991b1b',
  blue: '#818cf8',
  blueBg: '#0c1a3a',
  blueBorder: '#3b4fd8',
  purple: '#a78bfa',
}

function sc(s: number) { return s >= 75 ? C.green : s >= 50 ? C.yellow : C.red }
function scBg(s: number) { return s >= 75 ? C.greenBg : s >= 50 ? '#1c1505' : C.redBg }
function scBorder(s: number) { return s >= 75 ? C.greenBorder : s >= 50 ? '#92400e' : C.redBorder }

export default function ReportPage({ params }: { params: { id: string } }) {
  const [scan, setScan] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/pulse/reports').then(r => r.json()).then(data => {
      const found = [...(data.scans || []), ...(data.lam || [])].find((s: any) => s.id === params.id)
      setScan(found)
      setLoading(false)
    })
  }, [params.id])

  if (loading) return (
    <div style={{ minHeight: '100vh', background: C.bg, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ color: C.accent }}>Loading report...</div>
    </div>
  )
  if (!scan) return (
    <div style={{ minHeight: '100vh', background: C.bg, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ color: C.red }}>Report not found. <a href="/dashboard" style={{ color: C.blue }}>← Back</a></div>
    </div>
  )

  const r = scan.report || {}
  const score = scan.overall_score || 0
  const trustScore = scan.trust_score || 0
  const convScore = scan.conversion_score || 0
  const secScore = scan.security_score || 0
  const mobileScore = scan.mobile_score || 0
  const grade = r.grade || '—'
  const companyName = r.company_name || (() => { try { return new URL(scan.url).hostname } catch { return scan.url } })()
  const industry = r.industry || ''
  const date = new Date(scan.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })

  const verdict = r.executive_verdict || r.one_line_verdict || ''
  const summary = r.executive_summary || r.novice_summary || ''
  const revenueImpact = r.revenue_impact || ''
  const weekAction = r.priority_week_1 || r.priority_actions?.week_1 || ''
  const monthAction = r.priority_month_1 || r.priority_actions?.month_1 || ''
  const quarterAction = r.priority_quarter_1 || r.priority_actions?.quarter_1 || ''
  const frictionPoints = r.ux_friction_points || []
  const resolutionSteps = r.resolution_steps || []
  const quickWins = r.quick_wins || []
  const conversionKillers = r.conversion_killers || []
  const strengths = r.strengths || []
  const revenueOpps = r.revenue_opportunities || []
  const legalRisks = r.legal_risks || []
  const securityIssues = r.security_issues || []
  const complianceRecs = r.compliance_recommendations || []
  const httpsScore = r.https_score ?? (scan.url?.startsWith('https') ? 100 : 0)
  const mobileAdaScore = r.mobile_ada_score ?? mobileScore
  const cookieScore = r.cookie_consent_score ?? 0
  const privacyScore = r.privacy_policy_score ?? 0
  const soc2Score = r.soc2_readiness_score ?? 50
  const gdprScore = r.gdpr_status_score ?? 50
  const complianceScore = r.overall_compliance_score ?? Math.round((httpsScore + mobileAdaScore + cookieScore + privacyScore) / 4)
  const riskLevel = r.compliance_risk_level || (complianceScore < 50 ? 'HIGH RISK' : complianceScore < 75 ? 'MEDIUM RISK' : 'LOW RISK')
  const dns = r.dns_security?.checks || {}
  const emailSecScore = r.dns_security?.email_security_score ?? 0
  const dnsRecs = r.dns_security?.summary?.recommendations || []
  const week1 = r.roadmap_week_1 || {}
  const month1 = r.roadmap_month_1 || {}
  const month23 = r.roadmap_month_2_3 || {}

  function downloadPDF() {
    const prev = document.title
    document.title = `Klaro Pulse — ${companyName} — ${date}`
    window.print()
    setTimeout(() => { document.title = prev }, 2000)
  }

  // Reusable components as inline elements
  const pageHeader = (page: number, section: string) => (
    <div style={{ borderBottom: '2px solid #1e2a3a', paddingBottom: '10px', marginBottom: '24px', fontSize: '10px', color: '#475569', letterSpacing: '0.1em', textTransform: 'uppercase' as const, display: 'flex', justifyContent: 'space-between' }}>
      <span>KLARO PULSE {section.toUpperCase()} · PAGE {page} OF 5 · {date.toUpperCase()} · CONFIDENTIAL</span>
    </div>
  )

  const pageFooter = () => (
    <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '32px', paddingTop: '14px', borderTop: '1px solid #1e2a3a', fontSize: '10px', color: '#334155' }}>
      <span>{companyName} | {scan.url}</span>
      <span>Klaro Pulse Site Intelligence · klaro.services/pulse · © 2026 Klaro Global</span>
    </div>
  )

  const scoreBox = (label: string, val: number) => (
    <div style={{ background: scBg(val), border: `1px solid ${scBorder(val)}`, borderRadius: '10px', padding: '14px', textAlign: 'center' as const }}>
      <div style={{ fontSize: '30px', fontWeight: 900, color: sc(val), lineHeight: 1 }}>{val || '—'}</div>
      <div style={{ fontSize: '10px', color: '#475569', textTransform: 'uppercase' as const, letterSpacing: '0.07em', marginTop: '5px', fontWeight: 600 }}>{label}</div>
    </div>
  )

  const pageStyle: React.CSSProperties = {
    maxWidth: '820px', margin: '0 auto', padding: '40px 36px',
    background: C.bg, marginBottom: '4px', pageBreakAfter: 'always' as const,
    minHeight: '297mm', boxSizing: 'border-box' as const,
  }

  return (
    <>
      <style>{`
        @media print {
          .no-print { display: none !important; }
          body { margin: 0 !important; }
        }
        @page { margin: 0; size: A4; }
        body { margin: 0; background: #080c14; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; }

        @media print {
          body, div { background-color: white !important; color: #1e293b !important; }
          body { background: white !important; }

          /* Score boxes — light */
          div[style*="052e16"], div[style*="1c1505"], div[style*="1c0505"] {
            background: #f8fafc !important;
            border-color: #e2e8f0 !important;
          }

          /* Cards */
          div[style*="0f1420"], div[style*="080c14"], div[style*="0a0f1a"],
          div[style*="0a0d18"], div[style*="0c1a3a"] {
            background: white !important;
            border-color: #e2e8f0 !important;
          }

          /* Text colors — make readable on white */
          div[style*="color: #94a3b8"], div[style*="color: #64748b"],
          div[style*="color: #475569"], div[style*="color: #334155"] {
            color: #374151 !important;
          }
          div[style*="color: white"], div[style*='color: "white"'] {
            color: #111827 !important;
          }

          /* Score colors stay — green/yellow/red are fine on white */
          /* Border separators */
          div[style*="1e2a3a"], div[style*="0d1520"] {
            border-color: #e2e8f0 !important;
          }

          /* Green opportunity box */
          div[style*="052e16"] { background: #f0fdf4 !important; border-color: #bbf7d0 !important; }
          div[style*="86efac"] { color: #166534 !important; }

          /* Red revenue impact box */
          div[style*="1c0505"] { background: #fef2f2 !important; border-color: #fecaca !important; }

          /* Blue box */
          div[style*="0c1a3a"] { background: #eff6ff !important; border-color: #bfdbfe !important; }
          div[style*="818cf8"] { color: #4f46e5 !important; }

          /* Page header line */
          div[style*="border-bottom: 2px solid"] { border-bottom-color: #1e293b !important; }

          /* Footer */
          div[style*="border-top: 1px solid #1e2a3a"] { border-top-color: #e2e8f0 !important; }
        }
      `}</style>

      {/* Topbar */}
      <div className="no-print" style={{ background: '#0a0f1a', borderBottom: '1px solid #1e2a3a', padding: '0 24px', height: '56px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', position: 'sticky', top: 0, zIndex: 20 }}>
        <div style={{ fontSize: '16px', fontWeight: 900, color: 'white' }}>KLARO <span style={{ color: C.accent }}>PULSE</span> <span style={{ fontSize: '11px', color: '#475569', marginLeft: '8px', fontWeight: 400 }}>SITE INTELLIGENCE REPORT</span></div>
        <div style={{ display: 'flex', gap: '10px' }}>
          <a href="/dashboard" style={{ fontSize: '12px', color: C.blue, textDecoration: 'none', border: `1px solid ${C.blueBorder}`, borderRadius: '8px', padding: '6px 14px' }}>← Dashboard</a>
          <button onClick={downloadPDF} style={{ fontSize: '12px', color: 'white', background: 'linear-gradient(135deg,#6366f1,#8b5cf6)', border: 'none', borderRadius: '8px', padding: '6px 16px', cursor: 'pointer', fontWeight: 700, fontFamily: 'inherit' }}>⬇ Download PDF</button>
        </div>
      </div>

      {/* PAGE 1 — EXECUTIVE BRIEF */}
      <div style={pageStyle}>
        {pageHeader(1, 'Executive Brief')}

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '28px', gap: '24px' }}>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: '42px', fontWeight: 900, color: 'white', marginBottom: '4px', lineHeight: 1.1 }}>{companyName}</div>
            <a href={scan.url} style={{ fontSize: '13px', color: '#475569', textDecoration: 'none' }}>{scan.url}</a>
            {industry && <div style={{ fontSize: '12px', color: '#64748b', marginTop: '5px' }}>Industry: {industry}</div>}
          </div>
          <div style={{ textAlign: 'center', flexShrink: 0 }}>
            <div style={{ fontSize: '80px', fontWeight: 900, color: sc(score), lineHeight: 1 }}>{score}</div>
            <div style={{ fontSize: '13px', color: '#475569' }}>/100</div>
            <div style={{ fontSize: '18px', fontWeight: 700, color: sc(score), marginTop: '2px' }}>Grade: {grade}</div>
            {r.urgency && <div style={{ fontSize: '11px', color: '#64748b' }}>Urgency: {r.urgency}</div>}
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5,1fr)', gap: '10px', marginBottom: '24px' }}>
          {scoreBox('Overall', score)}
          {scoreBox('Trust', trustScore)}
          {scoreBox('Conversion', convScore)}
          {scoreBox('Security', secScore)}
          {scoreBox('Mobile', mobileScore)}
        </div>

        {verdict && (
          <div style={{ fontSize: '15px', fontStyle: 'italic', color: '#94a3b8', lineHeight: 1.6, borderLeft: '4px solid #6366f1', paddingLeft: '18px', marginBottom: '16px' }}>
            "{verdict}"
          </div>
        )}
        {summary && (
          <div style={{ fontSize: '13px', color: '#64748b', lineHeight: 1.8, marginBottom: '16px' }}>{summary}</div>
        )}
        {revenueImpact && (
          <div style={{ background: C.redBg, border: `1px solid ${C.redBorder}`, borderRadius: '10px', padding: '12px 16px', marginBottom: '20px', fontSize: '13px', color: C.red }}>
            💰 <strong>Revenue Impact:</strong> {revenueImpact}
          </div>
        )}

        <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: '12px', padding: '18px' }}>
          <div style={{ fontSize: '10px', fontWeight: 700, color: '#475569', textTransform: 'uppercase' as const, letterSpacing: '0.08em', marginBottom: '12px' }}>TOP 3 IMMEDIATE ACTIONS</div>
          {[['THIS WEEK', weekAction, C.red], ['THIS MONTH', monthAction, C.yellow], ['THIS QUARTER', quarterAction, C.green]].map(([label, val, color]) => val ? (
            <div key={label} style={{ display: 'flex', gap: '12px', padding: '9px 0', borderBottom: `1px solid ${C.borderDim}`, alignItems: 'flex-start' }}>
              <span style={{ fontSize: '10px', fontWeight: 700, color, whiteSpace: 'nowrap', marginTop: '2px', minWidth: '80px' }}>{label}</span>
              <span style={{ fontSize: '12px', color: '#94a3b8', lineHeight: 1.5 }}>{val}</span>
            </div>
          ) : null)}
        </div>

        {pageFooter()}
      </div>

      {/* PAGE 2 — UX & CONVERSION */}
      <div style={pageStyle}>
        {pageHeader(2, 'UX & Conversion Audit')}

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: '10px', marginBottom: '20px' }}>
          {scoreBox('Overall', score)}
          {scoreBox('Trust & Credibility', trustScore)}
          {scoreBox('Conversion Rate', convScore)}
          {scoreBox('Security Surface', secScore)}
        </div>

        <div style={{ marginBottom: '18px' }}>
          <div style={{ fontSize: '11px', fontWeight: 700, color: C.red, textTransform: 'uppercase' as const, letterSpacing: '0.08em', marginBottom: '10px' }}>CONVERSION KILLERS — DETAILED ANALYSIS</div>
          {conversionKillers.length === 0 ? (
            <div style={{ fontSize: '12px', color: '#64748b', padding: '10px', background: C.card, borderRadius: '8px' }}>No critical conversion issues detected.</div>
          ) : conversionKillers.map((k: any, i: number) => (
            <div key={i} style={{ background: C.card, border: `1px solid ${C.redBorder}`, borderRadius: '8px', padding: '12px', marginBottom: '8px' }}>
              <div style={{ fontSize: '12px', fontWeight: 700, color: C.red }}>⚠ {typeof k === 'string' ? k : k.issue}</div>
              {k.impact && <div style={{ fontSize: '11px', color: '#64748b', marginTop: '3px' }}>Impact: {k.impact}</div>}
              {k.fix && <div style={{ fontSize: '11px', color: C.green, marginTop: '2px' }}>Fix: {k.fix}</div>}
            </div>
          ))}
        </div>

        {quickWins.length > 0 && (
          <div style={{ marginBottom: '18px' }}>
            <div style={{ fontSize: '11px', fontWeight: 700, color: C.green, textTransform: 'uppercase' as const, letterSpacing: '0.08em', marginBottom: '8px' }}>QUICK WINS — FREE, UNDER 1 HOUR</div>
            {quickWins.map((w: string, i: number) => (
              <div key={i} style={{ fontSize: '12px', color: '#64748b', padding: '6px 0', borderBottom: `1px solid ${C.borderDim}` }}>+ {w}</div>
            ))}
          </div>
        )}

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px', marginBottom: '18px' }}>
          <div>
            <div style={{ fontSize: '11px', fontWeight: 700, color: C.red, textTransform: 'uppercase' as const, letterSpacing: '0.08em', marginBottom: '8px' }}>🔴 PROBLEMS FOUND</div>
            {frictionPoints.length === 0 ? <div style={{ fontSize: '12px', color: '#334155' }}>No issues detected</div> :
              frictionPoints.map((p: string, i: number) => (
                <div key={i} style={{ fontSize: '11px', color: '#64748b', background: C.card, border: `1px solid ${C.border}`, borderRadius: '7px', padding: '9px', marginBottom: '7px', lineHeight: 1.5 }}>⚠ {p}</div>
              ))}
          </div>
          <div>
            <div style={{ fontSize: '11px', fontWeight: 700, color: C.green, textTransform: 'uppercase' as const, letterSpacing: '0.08em', marginBottom: '8px' }}>🟢 HOW TO FIX</div>
            {resolutionSteps.length === 0 ? <div style={{ fontSize: '12px', color: '#334155' }}>—</div> :
              resolutionSteps.map((p: string, i: number) => (
                <div key={i} style={{ fontSize: '11px', color: '#64748b', background: C.card, border: `1px solid ${C.border}`, borderRadius: '7px', padding: '9px', marginBottom: '7px', lineHeight: 1.5 }}>
                  <span style={{ color: C.green, fontWeight: 700 }}>0{i+1}</span> {p}
                </div>
              ))}
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5,1fr)', gap: '8px' }}>
          {[['Mobile', r.mobile_readiness], ['Pricing', r.pricing_clarity], ['CTA', r.cta_effectiveness], ['Audience', r.target_audience_clarity], ['Load Speed', r.load_speed_impression]].map(([label, val]) => {
            const good = ['Good','Clear','Strong','Fast'].includes(val as string)
            const bad = ['Poor','Hidden','Missing','Confusing','Slow'].includes(val as string)
            return (
              <div key={label as string} style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: '8px', padding: '10px', textAlign: 'center' as const }}>
                <div style={{ fontSize: '12px', fontWeight: 700, color: good ? C.green : bad ? C.red : val ? C.yellow : '#334155' }}>{val || '—'}</div>
                <div style={{ fontSize: '9px', color: '#475569', textTransform: 'uppercase' as const, marginTop: '3px', letterSpacing: '0.05em' }}>{label}</div>
              </div>
            )
          })}
        </div>

        {pageFooter()}
      </div>

      {/* PAGE 3 — COMPETITIVE INTELLIGENCE */}
      <div style={pageStyle}>
        {pageHeader(3, 'Competitive Intelligence')}

        {r.market_position && (
          <div style={{ marginBottom: '18px' }}>
            <div style={{ fontSize: '11px', fontWeight: 700, color: C.blue, textTransform: 'uppercase' as const, letterSpacing: '0.08em', marginBottom: '8px' }}>MARKET POSITION ANALYSIS</div>
            <div style={{ fontSize: '13px', color: '#64748b', lineHeight: 1.8 }}>{r.market_position}</div>
          </div>
        )}

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px', marginBottom: '18px' }}>
          <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: '10px', padding: '16px' }}>
            <div style={{ fontSize: '10px', fontWeight: 700, color: C.red, textTransform: 'uppercase' as const, letterSpacing: '0.08em', marginBottom: '8px' }}>Why Clients Choose Competitors</div>
            <div style={{ fontSize: '12px', color: '#64748b', lineHeight: 1.7 }}>{r.why_clients_choose_competitors || '—'}</div>
          </div>
          <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: '10px', padding: '16px' }}>
            <div style={{ fontSize: '10px', fontWeight: 700, color: C.yellow, textTransform: 'uppercase' as const, letterSpacing: '0.08em', marginBottom: '8px' }}>Biggest Competitor Advantage</div>
            <div style={{ fontSize: '12px', color: '#64748b', lineHeight: 1.7 }}>{r.biggest_competitor_advantage || '—'}</div>
          </div>
        </div>

        {r.opportunity_to_win && (
          <div style={{ background: C.greenBg, border: `1px solid ${C.greenBorder}`, borderRadius: '10px', padding: '16px', marginBottom: '18px' }}>
            <div style={{ fontSize: '10px', fontWeight: 700, color: C.green, textTransform: 'uppercase' as const, letterSpacing: '0.08em', marginBottom: '6px' }}>Your Opportunity To Win</div>
            <div style={{ fontSize: '12px', color: C.greenText, lineHeight: 1.7 }}>{r.opportunity_to_win}</div>
          </div>
        )}

        {strengths.length > 0 && (
          <div style={{ marginBottom: '18px' }}>
            <div style={{ fontSize: '10px', fontWeight: 700, color: '#60a5fa', textTransform: 'uppercase' as const, letterSpacing: '0.08em', marginBottom: '8px' }}>WHAT THIS SITE DOES WELL</div>
            {strengths.map((s: string, i: number) => (
              <div key={i} style={{ fontSize: '12px', color: '#64748b', padding: '6px 0', borderBottom: `1px solid ${C.borderDim}` }}>✓ {s}</div>
            ))}
          </div>
        )}

        {revenueOpps.length > 0 && (
          <div>
            <div style={{ fontSize: '10px', fontWeight: 700, color: C.yellow, textTransform: 'uppercase' as const, letterSpacing: '0.08em', marginBottom: '10px' }}>💰 REVENUE OPPORTUNITIES</div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: '10px' }}>
              {revenueOpps.map((o: string, i: number) => (
                <div key={i} style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: '8px', padding: '12px', fontSize: '11px', color: '#64748b', lineHeight: 1.6 }}>💰 {o}</div>
              ))}
            </div>
          </div>
        )}

        {pageFooter()}
      </div>

      {/* PAGE 4 — SECURITY & COMPLIANCE */}
      <div style={pageStyle}>
        {pageHeader(4, 'Security & Compliance')}

        <div style={{ fontSize: '11px', fontWeight: 700, color: '#475569', textTransform: 'uppercase' as const, letterSpacing: '0.08em', marginBottom: '14px' }}>COMPLIANCE SURFACE SCAN</div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: '10px', marginBottom: '16px' }}>
          {[
            ['HTTPS / SSL', httpsScore, scan.url?.startsWith('https') ? 'Valid SSL certificate, HTTPS enforced' : 'SSL not enforced'],
            ['Mobile / ADA', mobileAdaScore, mobileAdaScore >= 75 ? 'Good' : 'Needs Work'],
            ['Cookie Consent', cookieScore, cookieScore > 0 ? 'Consent banner found' : 'No consent banner found'],
            ['Privacy Policy', privacyScore, privacyScore > 0 ? 'Privacy policy page found' : 'No privacy policy found'],
            ['SOC2 Readiness', soc2Score, soc2Score >= 75 ? 'Good standing' : 'Partial'],
            ['GDPR Status', gdprScore, gdprScore >= 75 ? 'Compliant' : 'Partial'],
          ].map(([label, val, status]) => (
            <div key={label as string} style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: '10px', padding: '14px' }}>
              <div style={{ fontSize: '26px', fontWeight: 900, color: sc(val as number) }}>{val as number}</div>
              <div style={{ fontSize: '11px', fontWeight: 700, color: 'white', marginTop: '3px', marginBottom: '3px' }}>{label as string}</div>
              <div style={{ fontSize: '10px', color: '#64748b' }}>{status as string}</div>
            </div>
          ))}
        </div>

        <div style={{ background: scBg(complianceScore), border: `2px solid ${scBorder(complianceScore)}`, borderRadius: '10px', padding: '14px', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '14px' }}>
          <div style={{ fontSize: '36px', fontWeight: 900, color: sc(complianceScore) }}>{complianceScore}</div>
          <div>
            <div style={{ fontSize: '13px', fontWeight: 700, color: 'white' }}>ADA / WCAG 2.1 ACCESSIBILITY AUDIT</div>
            <div style={{ fontSize: '11px', color: sc(complianceScore), fontWeight: 700 }}>{riskLevel}</div>
            <div style={{ fontSize: '11px', color: '#64748b', marginTop: '2px' }}>ADA compliance failures expose US businesses to lawsuit risk.</div>
          </div>
        </div>

        {/* DNS & Email Security */}
        {r.dns_security && (
          <div style={{ marginBottom: '14px' }}>
            <div style={{ fontSize: '11px', fontWeight: 700, color: C.blue, textTransform: 'uppercase' as const, letterSpacing: '0.08em', marginBottom: '10px' }}>📧 DNS & EMAIL SECURITY</div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: '8px', marginBottom: '10px' }}>
              {[
                ['SPF', dns.spf?.found, dns.spf?.found ? 'Configured' : 'Missing'],
                ['DMARC', dns.dmarc?.found, dns.dmarc?.found ? `Policy: ${dns.dmarc?.policy || 'set'}` : 'Missing'],
                ['DKIM', dns.dkim?.found, dns.dkim?.found ? 'Configured' : 'Missing'],
                ['Email Score', emailSecScore >= 70, `${emailSecScore}/100`],
              ].map(([label, good, status]) => (
                <div key={label as string} style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: '8px', padding: '10px', textAlign: 'center' as const }}>
                  <div style={{ fontSize: '18px', color: good ? C.green : C.red }}>{good ? '✓' : '✗'}</div>
                  <div style={{ fontSize: '11px', fontWeight: 700, color: 'white', margin: '2px 0' }}>{label as string}</div>
                  <div style={{ fontSize: '10px', color: '#64748b' }}>{status as string}</div>
                </div>
              ))}
            </div>
            {dnsRecs.map((rec: string, i: number) => (
              <div key={i} style={{ fontSize: '11px', color: C.red, padding: '5px 0', borderBottom: `1px solid ${C.borderDim}` }}>⚠ {rec}</div>
            ))}
          </div>
        )}

        {legalRisks.length > 0 && (
          <div style={{ marginBottom: '12px' }}>
            <div style={{ fontSize: '10px', fontWeight: 700, color: C.red, textTransform: 'uppercase' as const, letterSpacing: '0.08em', marginBottom: '8px' }}>LEGAL RISKS IDENTIFIED</div>
            {legalRisks.map((risk: string, i: number) => (
              <div key={i} style={{ fontSize: '12px', color: '#64748b', padding: '6px 0', borderBottom: `1px solid ${C.borderDim}` }}>! {risk}</div>
            ))}
          </div>
        )}

        {securityIssues.length > 0 && (
          <div style={{ marginBottom: '12px' }}>
            <div style={{ fontSize: '10px', fontWeight: 700, color: C.yellow, textTransform: 'uppercase' as const, letterSpacing: '0.08em', marginBottom: '8px' }}>SECURITY ISSUES</div>
            {securityIssues.map((issue: string, i: number) => (
              <div key={i} style={{ fontSize: '12px', color: '#64748b', padding: '6px 0', borderBottom: `1px solid ${C.borderDim}` }}>- {issue}</div>
            ))}
          </div>
        )}

        {complianceRecs.length > 0 && (
          <div>
            <div style={{ fontSize: '10px', fontWeight: 700, color: C.green, textTransform: 'uppercase' as const, letterSpacing: '0.08em', marginBottom: '8px' }}>REMEDIATION RECOMMENDATIONS</div>
            {complianceRecs.map((rec: string, i: number) => (
              <div key={i} style={{ fontSize: '12px', color: '#64748b', padding: '6px 0', borderBottom: `1px solid ${C.borderDim}` }}>{i+1}. {rec}</div>
            ))}
          </div>
        )}

        {pageFooter()}
      </div>

      {/* PAGE 5 — 90-DAY ROADMAP */}
      <div style={{ ...pageStyle, pageBreakAfter: 'avoid' as const }}>
        {pageHeader(5, '90-Day Action Roadmap')}

        <div style={{ fontSize: '16px', fontWeight: 900, color: C.blue, textTransform: 'uppercase' as const, letterSpacing: '0.05em', marginBottom: '20px' }}>YOUR 90-DAY DIGITAL TRANSFORMATION PLAN</div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: '14px', marginBottom: '20px' }}>
          {[
            [week1, 'Week 1 — Quick Wins', C.red],
            [month1, 'Month 1 — Foundation', C.yellow],
            [month23, 'Month 2-3 — Growth', C.green],
          ].map(([phase, label, color]: any[]) => {
            const weekLabel = label.includes('Week') ? weekAction : label.includes('Month 1') ? monthAction : quarterAction
            const hasData = phase && (phase.title || (phase.actions || []).length > 0)
            return (
              <div key={label} style={{ background: C.card, borderTop: `3px solid ${color}`, borderRadius: '10px', padding: '16px' }}>
                <div style={{ fontSize: '12px', fontWeight: 700, color, marginBottom: '8px' }}>{label}</div>
                {hasData ? (
                  <>
                    {phase.title && <div style={{ fontSize: '13px', fontWeight: 600, color: 'white', marginBottom: '6px' }}>{phase.title}</div>}
                    {phase.target_score && <div style={{ fontSize: '11px', color: '#64748b', marginBottom: '3px' }}>Target: <span style={{ color, fontWeight: 700 }}>{phase.target_score}/100</span></div>}
                    {phase.cost && <div style={{ fontSize: '10px', color: '#475569', marginBottom: '8px' }}>{phase.developer_needed ? 'Developer needed' : 'No developer needed'} · Cost: {phase.cost}</div>}
                    {(phase.actions || []).map((a: string, i: number) => (
                      <div key={i} style={{ fontSize: '11px', color: '#64748b', padding: '4px 0', borderBottom: `1px solid ${C.borderDim}`, lineHeight: 1.5 }}>
                        <span style={{ color, fontWeight: 700, marginRight: '5px' }}>{i+1}.</span>{a}
                      </div>
                    ))}
                  </>
                ) : (
                  <div style={{ fontSize: '12px', color: '#64748b', lineHeight: 1.6 }}>{weekLabel}</div>
                )}
              </div>
            )
          })}
        </div>

        {r.expected_outcome_90_days && (
          <div style={{ background: C.greenBg, border: `1px solid ${C.greenBorder}`, borderRadius: '10px', padding: '16px', marginBottom: '16px' }}>
            <div style={{ fontSize: '10px', fontWeight: 700, color: C.green, textTransform: 'uppercase' as const, letterSpacing: '0.08em', marginBottom: '6px' }}>EXPECTED IN 90 DAYS</div>
            <div style={{ fontSize: '12px', color: C.greenText, lineHeight: 1.7 }}>{r.expected_outcome_90_days}</div>
          </div>
        )}

        <div style={{ textAlign: 'center', padding: '20px', borderTop: `1px solid ${C.border}`, marginTop: '16px' }}>
          <div style={{ fontSize: '15px', fontWeight: 700, color: 'white', marginBottom: '4px' }}>Ready to implement this roadmap?</div>
          <div style={{ fontSize: '12px', color: '#64748b', marginBottom: '6px' }}>Klaro Pulse monitors your site and alerts you when competitors change strategy.</div>
          <div style={{ fontSize: '11px', color: '#475569' }}>klaro.services/pulse · Monthly monitoring from $149/month</div>
        </div>

        {pageFooter()}
      </div>
    </>
  )
}
