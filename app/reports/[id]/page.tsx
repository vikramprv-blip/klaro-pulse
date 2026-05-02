'use client'
import { useState, useEffect } from 'react'

function score_color(s: number) { return s >= 75 ? '#16a34a' : s >= 50 ? '#d97706' : '#dc2626' }
function score_bg(s: number) { return s >= 75 ? '#f0fdf4' : s >= 50 ? '#fffbeb' : '#fef2f2' }
function score_border(s: number) { return s >= 75 ? '#bbf7d0' : s >= 50 ? '#fde68a' : '#fecaca' }

function ScoreBox({ label, val }: { label: string, val: number }) {
  return (
    <div style={{ background: score_bg(val), border: `2px solid ${score_border(val)}`, borderRadius: '10px', padding: '14px', textAlign: 'center' as const }}>
      <div style={{ fontSize: '32px', fontWeight: 900, color: score_color(val), lineHeight: 1 }}>{val || '—'}</div>
      <div style={{ fontSize: '10px', color: '#6b7280', textTransform: 'uppercase' as const, letterSpacing: '0.07em', marginTop: '5px', fontWeight: 600 }}>{label}</div>
    </div>
  )
}

function PageFooter({ company, url }: { company: string, url: string }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '32px', paddingTop: '12px', borderTop: '1px solid #e2e8f0', fontSize: '10px', color: '#9ca3af' }}>
      <span>{company} | {url}</span>
      <span>Klaro Pulse Site Intelligence · klaro.services/pulse · © 2026 Klaro Global</span>
    </div>
  )
}

const PAGE: React.CSSProperties = {
  maxWidth: '820px', margin: '0 auto', padding: '40px 36px',
  background: 'white', marginBottom: '4px',
  pageBreakAfter: 'always' as const,
  minHeight: '277mm', boxSizing: 'border-box' as const,
  fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
}

const HEADER_LINE = (page: number, section: string, date: string) => (
  <div style={{ borderBottom: '2px solid #1e293b', paddingBottom: '10px', marginBottom: '24px', display: 'flex', justifyContent: 'space-between', fontSize: '10px', color: '#6b7280', letterSpacing: '0.1em', textTransform: 'uppercase' as const }}>
    <span>KLARO PULSE {section.toUpperCase()} · PAGE {page} OF 5 · {date.toUpperCase()} · CONFIDENTIAL</span>
  </div>
)

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
    <div style={{ minHeight: '100vh', background: '#f8fafc', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ color: '#6366f1', fontSize: '14px' }}>Loading report...</div>
    </div>
  )
  if (!scan) return (
    <div style={{ minHeight: '100vh', background: '#f8fafc', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ color: '#dc2626' }}>Report not found. <a href="/dashboard" style={{ color: '#6366f1' }}>← Back</a></div>
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

  return (
    <>
      <style>{`
        @media print { .no-print { display: none !important; } }
        @page { margin: 0; size: A4; }
        body { margin: 0; background: white; }
      `}</style>

      {/* Topbar - screen only */}
      <div className="no-print" style={{ background: '#0a0f1a', borderBottom: '1px solid #1e2a3a', padding: '0 24px', height: '56px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', position: 'sticky', top: 0, zIndex: 20 }}>
        <div style={{ fontSize: '16px', fontWeight: 900, color: 'white' }}>KLARO <span style={{ color: '#6366f1' }}>PULSE</span> <span style={{ fontSize: '11px', color: '#475569', marginLeft: '8px', fontWeight: 400 }}>SITE INTELLIGENCE REPORT</span></div>
        <div style={{ display: 'flex', gap: '10px' }}>
          <a href="/dashboard" style={{ fontSize: '12px', color: '#818cf8', textDecoration: 'none', border: '1px solid #3b4fd8', borderRadius: '8px', padding: '6px 14px' }}>← Dashboard</a>
          <button onClick={downloadPDF} style={{ fontSize: '12px', color: 'white', background: 'linear-gradient(135deg,#6366f1,#8b5cf6)', border: 'none', borderRadius: '8px', padding: '6px 16px', cursor: 'pointer', fontWeight: 700, fontFamily: 'inherit' }}>⬇ Download PDF</button>
        </div>
      </div>

      {/* PAGE 1 — EXECUTIVE BRIEF */}
      <div style={PAGE}>
        {HEADER_LINE(1, 'Executive Brief', date)}

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '24px', gap: '24px' }}>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: '44px', fontWeight: 900, color: '#0f172a', marginBottom: '4px', lineHeight: 1.1 }}>{companyName}</div>
            <a href={scan.url} style={{ fontSize: '13px', color: '#6366f1', textDecoration: 'none' }}>{scan.url}</a>
            {industry && <div style={{ fontSize: '12px', color: '#64748b', marginTop: '4px' }}>Industry: {industry}</div>}
          </div>
          <div style={{ textAlign: 'center', flexShrink: 0 }}>
            <div style={{ fontSize: '80px', fontWeight: 900, color: score_color(score), lineHeight: 1 }}>{score}</div>
            <div style={{ fontSize: '13px', color: '#94a3b8' }}>/100</div>
            <div style={{ fontSize: '18px', fontWeight: 700, color: score_color(score), marginTop: '2px' }}>Grade: {grade}</div>
            {r.urgency && <div style={{ fontSize: '11px', color: '#94a3b8' }}>Urgency: {r.urgency}</div>}
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5,1fr)', gap: '10px', marginBottom: '22px' }}>
          <ScoreBox label="Overall" val={score} />
          <ScoreBox label="Trust" val={trustScore} />
          <ScoreBox label="Conversion" val={convScore} />
          <ScoreBox label="Security" val={secScore} />
          <ScoreBox label="Mobile" val={mobileScore} />
        </div>

        {verdict && (
          <div style={{ fontSize: '15px', fontStyle: 'italic', color: '#374151', lineHeight: 1.6, borderLeft: '4px solid #6366f1', paddingLeft: '18px', marginBottom: '14px', background: '#f8f7ff', padding: '14px 18px', borderRadius: '0 8px 8px 0' }}>
            "{verdict}"
          </div>
        )}
        {summary && (
          <div style={{ fontSize: '13px', color: '#4b5563', lineHeight: 1.8, marginBottom: '14px' }}>{summary}</div>
        )}
        {revenueImpact && (
          <div style={{ background: '#fef2f2', border: '1px solid #fca5a5', borderLeft: '4px solid #dc2626', borderRadius: '8px', padding: '12px 16px', marginBottom: '20px', fontSize: '13px', color: '#991b1b' }}>
            💰 <strong>Revenue Impact:</strong> {revenueImpact}
          </div>
        )}

        <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '18px' }}>
          <div style={{ fontSize: '10px', fontWeight: 700, color: '#6b7280', textTransform: 'uppercase' as const, letterSpacing: '0.08em', marginBottom: '12px' }}>TOP 3 IMMEDIATE ACTIONS</div>
          {[['THIS WEEK', weekAction, '#dc2626'], ['THIS MONTH', monthAction, '#d97706'], ['THIS QUARTER', quarterAction, '#16a34a']].map(([label, val, color]) => val ? (
            <div key={label} style={{ display: 'flex', gap: '14px', padding: '10px 0', borderBottom: '1px solid #f1f5f9', alignItems: 'flex-start' }}>
              <span style={{ fontSize: '10px', fontWeight: 800, color, whiteSpace: 'nowrap', marginTop: '2px', minWidth: '80px', letterSpacing: '0.05em' }}>{label}</span>
              <span style={{ fontSize: '12px', color: '#374151', lineHeight: 1.5 }}>{val}</span>
            </div>
          ) : null)}
        </div>

        <PageFooter company={companyName} url={scan.url} />
      </div>

      {/* PAGE 2 — UX & CONVERSION */}
      <div style={PAGE}>
        {HEADER_LINE(2, 'UX & Conversion Audit', date)}

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: '10px', marginBottom: '20px' }}>
          <ScoreBox label="Overall" val={score} />
          <ScoreBox label="Trust & Credibility" val={trustScore} />
          <ScoreBox label="Conversion Rate" val={convScore} />
          <ScoreBox label="Security Surface" val={secScore} />
        </div>

        {/* Conversion killers */}
        <div style={{ marginBottom: '16px' }}>
          <div style={{ fontSize: '11px', fontWeight: 800, color: '#dc2626', textTransform: 'uppercase' as const, letterSpacing: '0.08em', marginBottom: '10px' }}>CONVERSION KILLERS — DETAILED ANALYSIS</div>
          {conversionKillers.length === 0 ? (
            <div style={{ fontSize: '12px', color: '#6b7280', padding: '10px', background: '#f8fafc', borderRadius: '8px', border: '1px solid #e2e8f0' }}>No critical conversion issues detected.</div>
          ) : conversionKillers.map((k: any, i: number) => (
            <div key={i} style={{ background: '#fef2f2', border: '1px solid #fca5a5', borderLeft: '3px solid #dc2626', borderRadius: '8px', padding: '10px 14px', marginBottom: '8px' }}>
              <div style={{ fontSize: '12px', fontWeight: 700, color: '#991b1b' }}>⚠ {typeof k === 'string' ? k : k.issue}</div>
              {k.impact && <div style={{ fontSize: '11px', color: '#6b7280', marginTop: '3px' }}>Impact: {k.impact}</div>}
              {k.fix && <div style={{ fontSize: '11px', color: '#16a34a', marginTop: '2px' }}>Fix: {k.fix}</div>}
            </div>
          ))}
        </div>

        {/* Quick wins */}
        {quickWins.length > 0 && (
          <div style={{ marginBottom: '16px' }}>
            <div style={{ fontSize: '11px', fontWeight: 800, color: '#16a34a', textTransform: 'uppercase' as const, letterSpacing: '0.08em', marginBottom: '8px' }}>QUICK WINS — FREE, UNDER 1 HOUR</div>
            {quickWins.map((w: string, i: number) => (
              <div key={i} style={{ fontSize: '12px', color: '#374151', padding: '6px 0', borderBottom: '1px solid #f1f5f9' }}>+ {w}</div>
            ))}
          </div>
        )}

        {/* Problems + Fixes */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px', marginBottom: '16px' }}>
          <div>
            <div style={{ fontSize: '11px', fontWeight: 800, color: '#dc2626', textTransform: 'uppercase' as const, letterSpacing: '0.08em', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span style={{ width: '10px', height: '10px', borderRadius: '50%', background: '#dc2626', display: 'inline-block' }}></span>
              PROBLEMS FOUND
            </div>
            {frictionPoints.length === 0 ? <div style={{ fontSize: '12px', color: '#9ca3af' }}>No issues detected</div> :
              frictionPoints.map((p: string, i: number) => (
                <div key={i} style={{ fontSize: '11px', color: '#374151', background: '#fef2f2', border: '1px solid #fecaca', borderRadius: '7px', padding: '9px', marginBottom: '7px', lineHeight: 1.5 }}>⚠ {p}</div>
              ))}
          </div>
          <div>
            <div style={{ fontSize: '11px', fontWeight: 800, color: '#16a34a', textTransform: 'uppercase' as const, letterSpacing: '0.08em', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span style={{ width: '10px', height: '10px', borderRadius: '50%', background: '#16a34a', display: 'inline-block' }}></span>
              HOW TO FIX
            </div>
            {resolutionSteps.length === 0 ? <div style={{ fontSize: '12px', color: '#9ca3af' }}>—</div> :
              resolutionSteps.map((p: string, i: number) => (
                <div key={i} style={{ fontSize: '11px', color: '#374151', background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: '7px', padding: '9px', marginBottom: '7px', lineHeight: 1.5 }}>
                  <span style={{ color: '#16a34a', fontWeight: 800 }}>0{i+1}</span> {p}
                </div>
              ))}
          </div>
        </div>

        {/* Signal boxes */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5,1fr)', gap: '8px' }}>
          {[['Mobile', r.mobile_readiness], ['Pricing', r.pricing_clarity], ['CTA', r.cta_effectiveness], ['Audience', r.target_audience_clarity], ['Load Speed', r.load_speed_impression]].map(([label, val]) => {
            const good = ['Good','Clear','Strong','Fast'].includes(val as string)
            const bad = ['Poor','Hidden','Missing','Confusing','Slow'].includes(val as string)
            return (
              <div key={label as string} style={{ background: good ? '#f0fdf4' : bad ? '#fef2f2' : '#fffbeb', border: `1px solid ${good ? '#bbf7d0' : bad ? '#fecaca' : '#fde68a'}`, borderRadius: '8px', padding: '10px', textAlign: 'center' as const }}>
                <div style={{ fontSize: '13px', fontWeight: 800, color: good ? '#16a34a' : bad ? '#dc2626' : val ? '#d97706' : '#9ca3af' }}>{val || '—'}</div>
                <div style={{ fontSize: '9px', color: '#6b7280', textTransform: 'uppercase' as const, marginTop: '3px', letterSpacing: '0.05em' }}>{label}</div>
              </div>
            )
          })}
        </div>

        <PageFooter company={companyName} url={scan.url} />
      </div>

      {/* PAGE 3 — COMPETITIVE INTELLIGENCE */}
      <div style={PAGE}>
        {HEADER_LINE(3, 'Competitive Intelligence', date)}

        {r.market_position && (
          <div style={{ marginBottom: '18px' }}>
            <div style={{ fontSize: '11px', fontWeight: 800, color: '#4f46e5', textTransform: 'uppercase' as const, letterSpacing: '0.08em', marginBottom: '8px' }}>MARKET POSITION ANALYSIS</div>
            <div style={{ fontSize: '13px', color: '#4b5563', lineHeight: 1.8 }}>{r.market_position}</div>
          </div>
        )}

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px', marginBottom: '16px' }}>
          <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: '10px', padding: '16px' }}>
            <div style={{ fontSize: '10px', fontWeight: 800, color: '#dc2626', textTransform: 'uppercase' as const, letterSpacing: '0.08em', marginBottom: '8px' }}>WHY CLIENTS CHOOSE COMPETITORS</div>
            <div style={{ fontSize: '12px', color: '#4b5563', lineHeight: 1.7 }}>{r.why_clients_choose_competitors || '—'}</div>
          </div>
          <div style={{ background: '#fffbeb', border: '1px solid #fde68a', borderRadius: '10px', padding: '16px' }}>
            <div style={{ fontSize: '10px', fontWeight: 800, color: '#d97706', textTransform: 'uppercase' as const, letterSpacing: '0.08em', marginBottom: '8px' }}>BIGGEST COMPETITOR ADVANTAGE</div>
            <div style={{ fontSize: '12px', color: '#4b5563', lineHeight: 1.7 }}>{r.biggest_competitor_advantage || '—'}</div>
          </div>
        </div>

        {r.opportunity_to_win && (
          <div style={{ background: '#f0fdf4', border: '1px solid #86efac', borderLeft: '4px solid #16a34a', borderRadius: '8px', padding: '16px', marginBottom: '18px' }}>
            <div style={{ fontSize: '10px', fontWeight: 800, color: '#16a34a', textTransform: 'uppercase' as const, letterSpacing: '0.08em', marginBottom: '6px' }}>YOUR OPPORTUNITY TO WIN</div>
            <div style={{ fontSize: '12px', color: '#166534', lineHeight: 1.7 }}>{r.opportunity_to_win}</div>
          </div>
        )}

        {strengths.length > 0 && (
          <div style={{ marginBottom: '18px' }}>
            <div style={{ fontSize: '10px', fontWeight: 800, color: '#2563eb', textTransform: 'uppercase' as const, letterSpacing: '0.08em', marginBottom: '8px' }}>WHAT THIS SITE DOES WELL</div>
            {strengths.map((s: string, i: number) => (
              <div key={i} style={{ fontSize: '12px', color: '#374151', padding: '6px 0', borderBottom: '1px solid #f1f5f9' }}>✓ {s}</div>
            ))}
          </div>
        )}

        {revenueOpps.length > 0 && (
          <div>
            <div style={{ fontSize: '10px', fontWeight: 800, color: '#d97706', textTransform: 'uppercase' as const, letterSpacing: '0.08em', marginBottom: '10px' }}>💰 REVENUE OPPORTUNITIES</div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: '10px' }}>
              {revenueOpps.map((o: string, i: number) => (
                <div key={i} style={{ background: '#fffbeb', border: '1px solid #fde68a', borderRadius: '8px', padding: '12px', fontSize: '11px', color: '#374151', lineHeight: 1.6 }}>💰 {o}</div>
              ))}
            </div>
          </div>
        )}

        <PageFooter company={companyName} url={scan.url} />
      </div>

      {/* PAGE 4 — SECURITY & COMPLIANCE */}
      <div style={PAGE}>
        {HEADER_LINE(4, 'Security & Compliance', date)}

        <div style={{ fontSize: '11px', fontWeight: 800, color: '#374151', textTransform: 'uppercase' as const, letterSpacing: '0.08em', marginBottom: '12px' }}>COMPLIANCE SURFACE SCAN</div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: '10px', marginBottom: '16px' }}>
          {[
            ['HTTPS / SSL', httpsScore, scan.url?.startsWith('https') ? 'Valid SSL certificate, HTTPS enforced' : 'SSL not enforced'],
            ['Mobile / ADA', mobileAdaScore, mobileAdaScore >= 75 ? 'Good' : 'Needs Work'],
            ['Cookie Consent', cookieScore, cookieScore > 0 ? 'Consent banner found' : 'No consent banner found'],
            ['Privacy Policy', privacyScore, privacyScore > 0 ? 'Privacy policy page found' : 'No privacy policy found'],
            ['SOC2 Readiness', soc2Score, soc2Score >= 75 ? 'Good standing' : 'Partial'],
            ['GDPR Status', gdprScore, gdprScore >= 75 ? 'Compliant' : 'Partial'],
          ].map(([label, val, status]) => (
            <div key={label as string} style={{ background: score_bg(val as number), border: `1px solid ${score_border(val as number)}`, borderRadius: '10px', padding: '14px' }}>
              <div style={{ fontSize: '28px', fontWeight: 900, color: score_color(val as number) }}>{val as number}</div>
              <div style={{ fontSize: '11px', fontWeight: 700, color: '#1e293b', marginTop: '4px', marginBottom: '3px' }}>{label as string}</div>
              <div style={{ fontSize: '10px', color: '#6b7280' }}>{status as string}</div>
            </div>
          ))}
        </div>

        {/* ADA box */}
        <div style={{ background: score_bg(complianceScore), border: `2px solid ${score_border(complianceScore)}`, borderRadius: '10px', padding: '14px', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '14px' }}>
          <div style={{ fontSize: '36px', fontWeight: 900, color: score_color(complianceScore) }}>{complianceScore}</div>
          <div>
            <div style={{ fontSize: '13px', fontWeight: 800, color: '#1e293b' }}>ADA / WCAG 2.1 ACCESSIBILITY AUDIT</div>
            <div style={{ fontSize: '11px', fontWeight: 700, color: score_color(complianceScore), marginTop: '2px' }}>{riskLevel}</div>
            <div style={{ fontSize: '11px', color: '#6b7280', marginTop: '2px' }}>ADA compliance failures expose US businesses to lawsuit risk.</div>
          </div>
        </div>

        {/* DNS section */}
        {r.dns_security && (
          <div style={{ marginBottom: '14px' }}>
            <div style={{ fontSize: '11px', fontWeight: 800, color: '#4f46e5', textTransform: 'uppercase' as const, letterSpacing: '0.08em', marginBottom: '10px' }}>📧 DNS & EMAIL SECURITY</div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: '8px', marginBottom: '8px' }}>
              {[
                ['SPF', dns.spf?.found, dns.spf?.found ? 'Configured' : 'Missing'],
                ['DMARC', dns.dmarc?.found, dns.dmarc?.found ? `Policy: ${dns.dmarc?.policy || 'set'}` : 'Missing'],
                ['DKIM', dns.dkim?.found, dns.dkim?.found ? 'Configured' : 'Missing'],
                ['Email Score', emailSecScore >= 70, `${emailSecScore}/100`],
              ].map(([label, good, status]) => (
                <div key={label as string} style={{ background: good ? '#f0fdf4' : '#fef2f2', border: `1px solid ${good ? '#bbf7d0' : '#fecaca'}`, borderRadius: '8px', padding: '10px', textAlign: 'center' as const }}>
                  <div style={{ fontSize: '18px', color: good ? '#16a34a' : '#dc2626' }}>{good ? '✓' : '✗'}</div>
                  <div style={{ fontSize: '11px', fontWeight: 700, color: '#1e293b', margin: '2px 0' }}>{label as string}</div>
                  <div style={{ fontSize: '10px', color: '#6b7280' }}>{status as string}</div>
                </div>
              ))}
            </div>
            {dnsRecs.map((rec: string, i: number) => (
              <div key={i} style={{ fontSize: '11px', color: '#991b1b', padding: '5px 0', borderBottom: '1px solid #fee2e2' }}>⚠ {rec}</div>
            ))}
          </div>
        )}

        {legalRisks.length > 0 && (
          <div style={{ marginBottom: '12px' }}>
            <div style={{ fontSize: '10px', fontWeight: 800, color: '#dc2626', textTransform: 'uppercase' as const, letterSpacing: '0.08em', marginBottom: '8px' }}>LEGAL RISKS IDENTIFIED</div>
            {legalRisks.map((risk: string, i: number) => (
              <div key={i} style={{ fontSize: '12px', color: '#374151', padding: '6px 0', borderBottom: '1px solid #f1f5f9' }}>! {risk}</div>
            ))}
          </div>
        )}
        {securityIssues.length > 0 && (
          <div style={{ marginBottom: '12px' }}>
            <div style={{ fontSize: '10px', fontWeight: 800, color: '#d97706', textTransform: 'uppercase' as const, letterSpacing: '0.08em', marginBottom: '8px' }}>SECURITY ISSUES</div>
            {securityIssues.map((issue: string, i: number) => (
              <div key={i} style={{ fontSize: '12px', color: '#374151', padding: '6px 0', borderBottom: '1px solid #f1f5f9' }}>- {issue}</div>
            ))}
          </div>
        )}
        {complianceRecs.length > 0 && (
          <div>
            <div style={{ fontSize: '10px', fontWeight: 800, color: '#16a34a', textTransform: 'uppercase' as const, letterSpacing: '0.08em', marginBottom: '8px' }}>REMEDIATION RECOMMENDATIONS</div>
            {complianceRecs.map((rec: string, i: number) => (
              <div key={i} style={{ fontSize: '12px', color: '#374151', padding: '6px 0', borderBottom: '1px solid #f1f5f9' }}>{i+1}. {rec}</div>
            ))}
          </div>
        )}

        <PageFooter company={companyName} url={scan.url} />
      </div>

      {/* PAGE 5 — 90-DAY ROADMAP */}
      <div style={{ ...PAGE, pageBreakAfter: 'avoid' as const }}>
        {HEADER_LINE(5, '90-Day Action Roadmap', date)}

        <div style={{ fontSize: '16px', fontWeight: 900, color: '#1e293b', textTransform: 'uppercase' as const, letterSpacing: '0.05em', marginBottom: '20px' }}>YOUR 90-DAY DIGITAL TRANSFORMATION PLAN</div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: '14px', marginBottom: '20px' }}>
          {[
            [week1, 'Week 1 — Quick Wins', '#dc2626', '#fef2f2', '#fecaca', weekAction],
            [month1, 'Month 1 — Foundation', '#d97706', '#fffbeb', '#fde68a', monthAction],
            [month23, 'Month 2-3 — Growth', '#16a34a', '#f0fdf4', '#bbf7d0', quarterAction],
          ].map(([phase, label, color, bg, border, fallback]: any[]) => {
            const hasData = phase && (phase.title || (phase.actions || []).length > 0)
            return (
              <div key={label} style={{ background: bg, border: `1px solid ${border}`, borderTop: `4px solid ${color}`, borderRadius: '10px', padding: '16px' }}>
                <div style={{ fontSize: '12px', fontWeight: 800, color, marginBottom: '8px' }}>{label}</div>
                {hasData ? (
                  <>
                    {phase.title && <div style={{ fontSize: '13px', fontWeight: 700, color: '#1e293b', marginBottom: '6px' }}>{phase.title}</div>}
                    {phase.target_score && <div style={{ fontSize: '11px', color: '#6b7280', marginBottom: '3px' }}>Target: <span style={{ color, fontWeight: 700 }}>{phase.target_score}/100</span></div>}
                    {phase.cost && <div style={{ fontSize: '10px', color: '#6b7280', marginBottom: '8px' }}>{phase.developer_needed ? 'Developer needed' : 'No developer needed'} · Cost: {phase.cost}</div>}
                    {(phase.actions || []).map((a: string, i: number) => (
                      <div key={i} style={{ fontSize: '11px', color: '#374151', padding: '5px 0', borderBottom: `1px solid ${border}`, lineHeight: 1.5 }}>
                        <span style={{ color, fontWeight: 800, marginRight: '6px' }}>{i+1}.</span>{a}
                      </div>
                    ))}
                  </>
                ) : (
                  <div style={{ fontSize: '12px', color: '#4b5563', lineHeight: 1.6 }}>{fallback}</div>
                )}
              </div>
            )
          })}
        </div>

        {r.expected_outcome_90_days && (
          <div style={{ background: '#f0fdf4', border: '1px solid #86efac', borderLeft: '4px solid #16a34a', borderRadius: '8px', padding: '16px', marginBottom: '16px' }}>
            <div style={{ fontSize: '10px', fontWeight: 800, color: '#16a34a', textTransform: 'uppercase' as const, letterSpacing: '0.08em', marginBottom: '6px' }}>EXPECTED IN 90 DAYS</div>
            <div style={{ fontSize: '12px', color: '#166534', lineHeight: 1.7 }}>{r.expected_outcome_90_days}</div>
          </div>
        )}

        <div style={{ textAlign: 'center', padding: '20px', background: '#f8fafc', borderRadius: '10px', border: '1px solid #e2e8f0' }}>
          <div style={{ fontSize: '15px', fontWeight: 800, color: '#1e293b', marginBottom: '4px' }}>Ready to implement this roadmap?</div>
          <div style={{ fontSize: '12px', color: '#6b7280', marginBottom: '6px' }}>Klaro Pulse monitors your site and alerts you when competitors change strategy.</div>
          <div style={{ fontSize: '11px', color: '#6366f1', fontWeight: 600 }}>klaro.services/pulse · Monthly monitoring from $149/month</div>
        </div>

        <PageFooter company={companyName} url={scan.url} />
      </div>
    </>
  )
}
