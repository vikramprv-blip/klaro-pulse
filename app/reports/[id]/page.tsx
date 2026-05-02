'use client'
import { useState, useEffect } from 'react'

function sc(s: number) { return s >= 75 ? '#4ade80' : s >= 50 ? '#fbbf24' : '#f87171' }
function scBg(s: number) { return s >= 75 ? '#052e16' : s >= 50 ? '#1c1505' : '#1c0505' }
function scBorder(s: number) { return s >= 75 ? '#166534' : s >= 50 ? '#92400e' : '#991b1b' }

function ScoreBox({ label, score }: { label: string, score: number }) {
  return (
    <div style={{ background: scBg(score), border: `1px solid ${scBorder(score)}`, borderRadius: '12px', padding: '16px', textAlign: 'center' }}>
      <div style={{ fontSize: '32px', fontWeight: 900, color: sc(score) }}>{score || '—'}</div>
      <div style={{ fontSize: '10px', color: '#475569', textTransform: 'uppercase' as const, letterSpacing: '0.08em', marginTop: '4px', fontWeight: 600 }}>{label}</div>
    </div>
  )
}

function PageFooter({ company, url }: { company: string, url: string }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '32px', paddingTop: '16px', borderTop: '1px solid #1e2a3a', fontSize: '11px', color: '#334155' }}>
      <span>{company} | {url}</span>
      <span>Klaro Pulse Site Intelligence · klaro.services/pulse · © 2026 Klaro Global</span>
    </div>
  )
}

const pageStyle: React.CSSProperties = {
  maxWidth: '860px', margin: '0 auto', padding: '48px 40px',
  background: '#080c14', marginBottom: '2px', pageBreakAfter: 'always' as const,
}

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
    <div style={{ minHeight: '100vh', background: '#080c14', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ color: '#6366f1' }}>Loading report...</div>
    </div>
  )
  if (!scan) return (
    <div style={{ minHeight: '100vh', background: '#080c14', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ color: '#f87171' }}>Report not found. <a href="/dashboard" style={{ color: '#818cf8' }}>← Back</a></div>
    </div>
  )

  const r = scan.report || {}

  // Support both old and new report field formats
  const score = scan.overall_score || 0
  const trustScore = scan.trust_score || r.trust_score || 0
  const convScore = scan.conversion_score || r.conversion_score || 0
  const secScore = scan.security_score || r.security_score || 0
  const mobileScore = scan.mobile_score || r.mobile_score || 0
  const grade = r.grade || scan.grade || '—'
  const companyName = r.company_name || (() => { try { return new URL(scan.url).hostname } catch { return scan.url } })()
  const industry = r.industry || '—'
  const urgency = r.urgency || 'Medium'
  const date = new Date(scan.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })

  // Executive brief — support old and new formats
  const verdict = r.executive_verdict || r.one_line_verdict || r.novice_summary?.slice(0, 120) || '—'
  const summary = r.executive_summary || r.novice_summary || '—'
  const revenueImpact = r.revenue_impact || '—'
  const weekAction = r.priority_week_1 || r.priority_actions?.week_1 || '—'
  const monthAction = r.priority_month_1 || r.priority_actions?.month_1 || '—'
  const quarterAction = r.priority_quarter_1 || r.priority_actions?.quarter_1 || '—'

  // UX section
  const frictionPoints = r.ux_friction_points || []
  const resolutionSteps = r.resolution_steps || []
  const quickWins = r.quick_wins || []
  const conversionKillers = r.conversion_killers || []

  // Competitive
  const strengths = r.strengths || []
  const revenueOpps = r.revenue_opportunities || []
  const marketPosition = r.market_position || r.competitor_advantage || '—'
  const whyCompetitors = r.why_clients_choose_competitors || '—'
  const biggestAdvantage = r.biggest_competitor_advantage || '—'
  const opportunityToWin = r.opportunity_to_win || '—'

  // Compliance
  const httpsScore = r.https_score ?? (scan.url?.startsWith('https') ? 100 : 0)
  const mobileAdaScore = r.mobile_ada_score ?? mobileScore
  const cookieScore = r.cookie_consent_score ?? 0
  const privacyScore = r.privacy_policy_score ?? 0
  const soc2Score = r.soc2_readiness_score ?? 50
  const gdprScore = r.gdpr_status_score ?? 50
  const complianceScore = r.overall_compliance_score ?? Math.round((httpsScore + mobileAdaScore + cookieScore + privacyScore) / 4)
  const riskLevel = r.compliance_risk_level || (complianceScore < 50 ? 'HIGH RISK' : complianceScore < 75 ? 'MEDIUM RISK' : 'LOW RISK')
  const legalRisks = r.legal_risks || []
  const securityIssues = r.security_issues || []
  const complianceRecs = r.compliance_recommendations || []

  // Roadmap
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
        @media print {n          html, body { background: #080c14 !important; color: #94a3b8 !important; }
          .no-print { display: none !important; }
          * { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
          body { background: white !important; color: #1e293b !important; }n          .report-page { background: white !important; }n          div[style] { background-color: transparent !important; }n          div { background-color: inherit; }
        }
        @page { margin: 0; size: A4; }
        body { margin: 0; background: #080c14; }
      `}</style>

      <div className="no-print" style={{ background: '#0a0f1a', borderBottom: '1px solid #1e2a3a', padding: '0 24px', height: '56px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', position: 'sticky', top: 0, zIndex: 20 }}>
        <div style={{ fontSize: '16px', fontWeight: 900, color: 'white' }}>KLARO <span style={{ color: '#6366f1' }}>PULSE</span> <span style={{ fontSize: '11px', color: '#475569', marginLeft: '8px', fontWeight: 400 }}>SITE INTELLIGENCE REPORT</span></div>
        <div style={{ display: 'flex', gap: '10px' }}>
          <a href="/dashboard" style={{ fontSize: '12px', color: '#818cf8', textDecoration: 'none', border: '1px solid #3b4fd8', borderRadius: '8px', padding: '6px 14px' }}>← Dashboard</a>
          <button onClick={downloadPDF} style={{ fontSize: '12px', color: 'white', background: 'linear-gradient(135deg,#6366f1,#8b5cf6)', border: 'none', borderRadius: '8px', padding: '6px 16px', cursor: 'pointer', fontWeight: 700, fontFamily: 'inherit' }}>⬇ Download PDF</button>
        </div>
      </div>

      {/* PAGE 1 — EXECUTIVE BRIEF */}
      <div style={pageStyle}>
        <div style={{ borderBottom: '2px solid #1e2a3a', paddingBottom: '12px', marginBottom: '24px', fontSize: '10px', color: '#334155', letterSpacing: '0.1em', textTransform: 'uppercase' as const }}>
          KLARO PULSE EXECUTIVE BRIEF · PAGE 1 OF 5 · {date.toUpperCase()} · CONFIDENTIAL
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '28px' }}>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: '40px', fontWeight: 900, color: 'white', marginBottom: '4px' }}>{companyName}</div>
            <a href={scan.url} style={{ fontSize: '13px', color: '#475569', textDecoration: 'none' }}>{scan.url}</a>
            {industry !== '—' && <div style={{ fontSize: '12px', color: '#64748b', marginTop: '4px' }}>Industry: {industry}</div>}
          </div>
          <div style={{ textAlign: 'center', marginLeft: '32px' }}>
            <div style={{ fontSize: '72px', fontWeight: 900, color: sc(score), lineHeight: 1 }}>{score}</div>
            <div style={{ fontSize: '13px', color: '#475569' }}>/100</div>
            <div style={{ fontSize: '16px', fontWeight: 700, color: sc(score), marginTop: '2px' }}>Grade: {grade}</div>
            <div style={{ fontSize: '11px', color: '#64748b', marginTop: '2px' }}>Urgency: {urgency}</div>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5,1fr)', gap: '10px', marginBottom: '24px' }}>
          <ScoreBox label="Overall" score={score} />
          <ScoreBox label="Trust" score={trustScore} />
          <ScoreBox label="Conversion" score={convScore} />
          <ScoreBox label="Security" score={secScore} />
          <ScoreBox label="Mobile" score={mobileScore} />
        </div>

        {verdict !== '—' && (
          <div style={{ fontSize: '16px', fontStyle: 'italic', color: '#94a3b8', lineHeight: 1.6, borderLeft: '4px solid #6366f1', paddingLeft: '20px', marginBottom: '18px' }}>
            "{verdict}"
          </div>
        )}

        {summary !== '—' && (
          <div style={{ fontSize: '13px', color: '#64748b', lineHeight: 1.8, marginBottom: '18px' }}>{summary}</div>
        )}

        {revenueImpact !== '—' && (
          <div style={{ background: '#1c0505', border: '1px solid #991b1b', borderRadius: '10px', padding: '14px 18px', marginBottom: '20px', fontSize: '13px', color: '#f87171' }}>
            💰 <strong>Revenue Impact:</strong> {revenueImpact}
          </div>
        )}

        <div style={{ background: '#0f1420', border: '1px solid #1e2a3a', borderRadius: '12px', padding: '20px' }}>
          <div style={{ fontSize: '11px', fontWeight: 700, color: '#475569', textTransform: 'uppercase' as const, letterSpacing: '0.08em', marginBottom: '14px' }}>TOP 3 IMMEDIATE ACTIONS</div>
          {[['THIS WEEK', weekAction, '#f87171'], ['THIS MONTH', monthAction, '#fbbf24'], ['THIS QUARTER', quarterAction, '#4ade80']].map(([label, val, color]) => (
            <div key={label} style={{ display: 'flex', gap: '12px', padding: '10px 0', borderBottom: '1px solid #0d1520', alignItems: 'flex-start' }}>
              <span style={{ fontSize: '10px', fontWeight: 700, color, whiteSpace: 'nowrap', marginTop: '2px', minWidth: '80px' }}>{label}</span>
              <span style={{ fontSize: '13px', color: '#94a3b8', lineHeight: 1.5 }}>{val}</span>
            </div>
          ))}
        </div>

        <PageFooter company={companyName} url={scan.url} />
      </div>

      {/* PAGE 2 — UX & CONVERSION */}
      <div style={pageStyle}>
        <div style={{ borderBottom: '2px solid #1e2a3a', paddingBottom: '12px', marginBottom: '24px', fontSize: '10px', color: '#334155', letterSpacing: '0.1em', textTransform: 'uppercase' as const }}>
          KLARO PULSE UX & CONVERSION AUDIT · PAGE 2 OF 5 · {date.toUpperCase()} · CONFIDENTIAL
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: '10px', marginBottom: '24px' }}>
          <ScoreBox label="Overall" score={score} />
          <ScoreBox label="Trust & Credibility" score={trustScore} />
          <ScoreBox label="Conversion Rate" score={convScore} />
          <ScoreBox label="Security Surface" score={secScore} />
        </div>

        <div style={{ marginBottom: '20px' }}>
          <div style={{ fontSize: '12px', fontWeight: 700, color: '#f87171', textTransform: 'uppercase' as const, letterSpacing: '0.08em', marginBottom: '12px' }}>CONVERSION KILLERS — DETAILED ANALYSIS</div>
          {conversionKillers.length === 0 ? (
            <div style={{ fontSize: '13px', color: '#64748b', padding: '12px', background: '#0f1420', borderRadius: '8px' }}>No critical conversion issues detected.</div>
          ) : conversionKillers.map((k: any, i: number) => (
            <div key={i} style={{ background: '#0f1420', border: '1px solid #991b1b', borderRadius: '10px', padding: '14px', marginBottom: '10px' }}>
              <div style={{ fontSize: '13px', fontWeight: 700, color: '#f87171', marginBottom: '4px' }}>⚠ {typeof k === 'string' ? k : k.issue}</div>
              {k.impact && <div style={{ fontSize: '12px', color: '#64748b', marginBottom: '4px' }}>Impact: {k.impact}</div>}
              {k.fix && <div style={{ fontSize: '12px', color: '#4ade80' }}>Fix: {k.fix}</div>}
            </div>
          ))}
        </div>

        {quickWins.length > 0 && (
          <div style={{ marginBottom: '20px' }}>
            <div style={{ fontSize: '12px', fontWeight: 700, color: '#4ade80', textTransform: 'uppercase' as const, letterSpacing: '0.08em', marginBottom: '10px' }}>QUICK WINS — FREE, UNDER 1 HOUR</div>
            {quickWins.map((w: string, i: number) => (
              <div key={i} style={{ fontSize: '13px', color: '#64748b', padding: '7px 0', borderBottom: '1px solid #0d1520' }}>+ {w}</div>
            ))}
          </div>
        )}

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '20px' }}>
          <div>
            <div style={{ fontSize: '11px', fontWeight: 700, color: '#f87171', textTransform: 'uppercase' as const, letterSpacing: '0.08em', marginBottom: '10px' }}>🔴 PROBLEMS FOUND</div>
            {frictionPoints.length === 0 ? <div style={{ fontSize: '12px', color: '#334155', padding: '8px' }}>No issues detected</div> :
              frictionPoints.map((p: string, i: number) => (
                <div key={i} style={{ fontSize: '12px', color: '#64748b', background: '#0f1420', border: '1px solid #1e2a3a', borderRadius: '8px', padding: '10px', marginBottom: '8px', lineHeight: 1.5 }}>⚠ {p}</div>
              ))}
          </div>
          <div>
            <div style={{ fontSize: '11px', fontWeight: 700, color: '#4ade80', textTransform: 'uppercase' as const, letterSpacing: '0.08em', marginBottom: '10px' }}>🟢 HOW TO FIX</div>
            {resolutionSteps.length === 0 ? <div style={{ fontSize: '12px', color: '#334155', padding: '8px' }}>—</div> :
              resolutionSteps.map((p: string, i: number) => (
                <div key={i} style={{ fontSize: '12px', color: '#64748b', background: '#0f1420', border: '1px solid #1e2a3a', borderRadius: '8px', padding: '10px', marginBottom: '8px', lineHeight: 1.5 }}>
                  <span style={{ color: '#4ade80', fontWeight: 700 }}>0{i+1}</span> {p}
                </div>
              ))}
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5,1fr)', gap: '10px' }}>
          {[['Mobile', r.mobile_readiness], ['Pricing', r.pricing_clarity], ['CTA', r.cta_effectiveness], ['Audience', r.target_audience_clarity], ['Load Speed', r.load_speed_impression]].map(([label, val]) => {
            const good = ['Good','Clear','Strong','Fast'].includes(val)
            const bad = ['Poor','Hidden','Missing','Confusing','Slow'].includes(val)
            return (
              <div key={label as string} style={{ background: '#0f1420', border: '1px solid #1e2a3a', borderRadius: '10px', padding: '12px', textAlign: 'center' }}>
                <div style={{ fontSize: '13px', fontWeight: 700, color: good ? '#4ade80' : bad ? '#f87171' : val ? '#fbbf24' : '#334155' }}>{val || '—'}</div>
                <div style={{ fontSize: '10px', color: '#475569', textTransform: 'uppercase' as const, marginTop: '4px' }}>{label}</div>
              </div>
            )
          })}
        </div>

        <PageFooter company={companyName} url={scan.url} />
      </div>

      {/* PAGE 3 — COMPETITIVE INTELLIGENCE */}
      <div style={pageStyle}>
        <div style={{ borderBottom: '2px solid #1e2a3a', paddingBottom: '12px', marginBottom: '24px', fontSize: '10px', color: '#334155', letterSpacing: '0.1em', textTransform: 'uppercase' as const }}>
          KLARO PULSE COMPETITIVE INTELLIGENCE · PAGE 3 OF 5 · {date.toUpperCase()} · CONFIDENTIAL
        </div>

        <div style={{ marginBottom: '20px' }}>
          <div style={{ fontSize: '12px', fontWeight: 700, color: '#818cf8', textTransform: 'uppercase' as const, letterSpacing: '0.08em', marginBottom: '10px' }}>MARKET POSITION ANALYSIS</div>
          <div style={{ fontSize: '14px', color: '#64748b', lineHeight: 1.8 }}>{marketPosition}</div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '20px' }}>
          <div style={{ background: '#0f1420', border: '1px solid #1e2a3a', borderRadius: '12px', padding: '18px' }}>
            <div style={{ fontSize: '11px', fontWeight: 700, color: '#f87171', textTransform: 'uppercase' as const, letterSpacing: '0.08em', marginBottom: '10px' }}>Why Clients Choose Competitors</div>
            <div style={{ fontSize: '13px', color: '#64748b', lineHeight: 1.7 }}>{whyCompetitors}</div>
          </div>
          <div style={{ background: '#0f1420', border: '1px solid #1e2a3a', borderRadius: '12px', padding: '18px' }}>
            <div style={{ fontSize: '11px', fontWeight: 700, color: '#fbbf24', textTransform: 'uppercase' as const, letterSpacing: '0.08em', marginBottom: '10px' }}>Biggest Competitor Advantage</div>
            <div style={{ fontSize: '13px', color: '#64748b', lineHeight: 1.7 }}>{biggestAdvantage}</div>
          </div>
        </div>

        {opportunityToWin !== '—' && (
          <div style={{ background: '#052e16', border: '1px solid #166534', borderRadius: '12px', padding: '18px', marginBottom: '20px' }}>
            <div style={{ fontSize: '11px', fontWeight: 700, color: '#4ade80', textTransform: 'uppercase' as const, letterSpacing: '0.08em', marginBottom: '8px' }}>Your Opportunity To Win</div>
            <div style={{ fontSize: '13px', color: '#86efac', lineHeight: 1.7 }}>{opportunityToWin}</div>
          </div>
        )}

        {strengths.length > 0 && (
          <div style={{ marginBottom: '20px' }}>
            <div style={{ fontSize: '11px', fontWeight: 700, color: '#60a5fa', textTransform: 'uppercase' as const, letterSpacing: '0.08em', marginBottom: '10px' }}>WHAT THIS SITE DOES WELL</div>
            {strengths.map((s: string, i: number) => (
              <div key={i} style={{ fontSize: '13px', color: '#64748b', padding: '7px 0', borderBottom: '1px solid #0d1520' }}>✓ {s}</div>
            ))}
          </div>
        )}

        {revenueOpps.length > 0 && (
          <div>
            <div style={{ fontSize: '11px', fontWeight: 700, color: '#fbbf24', textTransform: 'uppercase' as const, letterSpacing: '0.08em', marginBottom: '10px' }}>💰 REVENUE OPPORTUNITIES</div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: '12px' }}>
              {revenueOpps.map((o: string, i: number) => (
                <div key={i} style={{ background: '#0f1420', border: '1px solid #1e2a3a', borderRadius: '10px', padding: '14px', fontSize: '12px', color: '#64748b', lineHeight: 1.6 }}>💰 {o}</div>
              ))}
            </div>
          </div>
        )}

        <PageFooter company={companyName} url={scan.url} />
      </div>

      {/* PAGE 4 — SECURITY & COMPLIANCE */}
      <div style={pageStyle}>
        <div style={{ borderBottom: '2px solid #1e2a3a', paddingBottom: '12px', marginBottom: '24px', fontSize: '10px', color: '#334155', letterSpacing: '0.1em', textTransform: 'uppercase' as const }}>
          KLARO PULSE SECURITY & COMPLIANCE · PAGE 4 OF 5 · {date.toUpperCase()} · CONFIDENTIAL
        </div>

        <div style={{ fontSize: '12px', fontWeight: 700, color: '#475569', textTransform: 'uppercase' as const, letterSpacing: '0.08em', marginBottom: '16px' }}>COMPLIANCE SURFACE SCAN</div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: '12px', marginBottom: '20px' }}>
          {[
            ['HTTPS / SSL', httpsScore, scan.url?.startsWith('https') ? 'Valid SSL certificate, HTTPS enforced' : 'SSL not enforced'],
            ['Mobile / ADA', mobileAdaScore, mobileAdaScore >= 75 ? 'Good' : 'Needs Work'],
            ['Cookie Consent', cookieScore, cookieScore > 0 ? 'Consent banner found' : 'No consent banner found'],
            ['Privacy Policy', privacyScore, privacyScore > 0 ? 'Privacy policy page found' : 'No privacy policy found'],
            ['SOC2 Readiness', soc2Score, soc2Score >= 75 ? 'Good' : 'Partial'],
            ['GDPR Status', gdprScore, gdprScore >= 75 ? 'Compliant' : 'Partial'],
          ].map(([label, val, status]) => (
            <div key={label as string} style={{ background: '#0f1420', border: '1px solid #1e2a3a', borderRadius: '12px', padding: '16px' }}>
              <div style={{ fontSize: '28px', fontWeight: 900, color: sc(val as number) }}>{val as number}</div>
              <div style={{ fontSize: '12px', fontWeight: 700, color: 'white', marginTop: '4px', marginBottom: '4px' }}>{label as string}</div>
              <div style={{ fontSize: '11px', color: '#64748b' }}>{status as string}</div>
            </div>
          ))}
        </div>

        <div style={{ background: scBg(complianceScore), border: `2px solid ${scBorder(complianceScore)}`, borderRadius: '12px', padding: '16px', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div style={{ fontSize: '40px', fontWeight: 900, color: sc(complianceScore) }}>{complianceScore}</div>
          <div>
            <div style={{ fontSize: '14px', fontWeight: 700, color: 'white' }}>ADA / WCAG 2.1 ACCESSIBILITY AUDIT</div>
            <div style={{ fontSize: '12px', color: sc(complianceScore), fontWeight: 700, marginTop: '2px' }}>{riskLevel}</div>
            <div style={{ fontSize: '11px', color: '#64748b', marginTop: '2px' }}>ADA compliance failures expose US businesses to lawsuit risk.</div>
          </div>
        </div>

        {legalRisks.length > 0 && (
          <div style={{ marginBottom: '16px' }}>
            <div style={{ fontSize: '11px', fontWeight: 700, color: '#f87171', textTransform: 'uppercase' as const, letterSpacing: '0.08em', marginBottom: '10px' }}>LEGAL RISKS IDENTIFIED</div>
            {legalRisks.map((r: string, i: number) => (
              <div key={i} style={{ fontSize: '13px', color: '#64748b', padding: '7px 0', borderBottom: '1px solid #0d1520' }}>! {r}</div>
            ))}
          </div>
        )}

        {securityIssues.length > 0 && (
          <div style={{ marginBottom: '16px' }}>
            <div style={{ fontSize: '11px', fontWeight: 700, color: '#fbbf24', textTransform: 'uppercase' as const, letterSpacing: '0.08em', marginBottom: '10px' }}>SECURITY ISSUES</div>
            {securityIssues.map((r: string, i: number) => (
              <div key={i} style={{ fontSize: '13px', color: '#64748b', padding: '7px 0', borderBottom: '1px solid #0d1520' }}>- {r}</div>
            ))}
          </div>
        )}

        {complianceRecs.length > 0 && (
          <div>
            <div style={{ fontSize: '11px', fontWeight: 700, color: '#4ade80', textTransform: 'uppercase' as const, letterSpacing: '0.08em', marginBottom: '10px' }}>REMEDIATION RECOMMENDATIONS</div>
            {complianceRecs.map((r: string, i: number) => (
              <div key={i} style={{ fontSize: '13px', color: '#64748b', padding: '7px 0', borderBottom: '1px solid #0d1520' }}>{i+1}. {r}</div>
            ))}
          </div>
        )}

        <PageFooter company={companyName} url={scan.url} />
      </div>

      {/* PAGE 5 — 90-DAY ROADMAP */}
      <div style={{ ...pageStyle, pageBreakAfter: 'avoid' as const }}>
        <div style={{ borderBottom: '2px solid #1e2a3a', paddingBottom: '12px', marginBottom: '24px', fontSize: '10px', color: '#334155', letterSpacing: '0.1em', textTransform: 'uppercase' as const }}>
          KLARO PULSE 90-DAY ACTION ROADMAP · PAGE 5 OF 5 · {date.toUpperCase()} · CONFIDENTIAL
        </div>

        <div style={{ fontSize: '18px', fontWeight: 900, color: '#818cf8', textTransform: 'uppercase' as const, letterSpacing: '0.05em', marginBottom: '20px' }}>YOUR 90-DAY DIGITAL TRANSFORMATION PLAN</div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: '16px', marginBottom: '24px' }}>
          {[
            [week1, 'Week 1 — Quick Wins', '#f87171'],
            [month1, 'Month 1 — Foundation', '#fbbf24'],
            [month23, 'Month 2-3 — Growth', '#4ade80'],
          ].map(([phase, label, color]: any[]) => {
            const hasData = phase && (phase.title || phase.actions?.length > 0 || phase.target_score)
            if (!hasData) {
              // Fallback for old format
              const fallbackActions = label.includes('Week') ? [weekAction] : label.includes('Month 1') ? [monthAction] : [quarterAction]
              return (
                <div key={label} style={{ background: '#0f1420', border: `1px solid ${color}44`, borderTop: `3px solid ${color}`, borderRadius: '12px', padding: '18px' }}>
                  <div style={{ fontSize: '13px', fontWeight: 700, color, marginBottom: '10px' }}>{label}</div>
                  {fallbackActions.map((a: string, i: number) => (
                    <div key={i} style={{ fontSize: '12px', color: '#64748b', lineHeight: 1.6 }}>{i+1}. {a}</div>
                  ))}
                </div>
              )
            }
            return (
              <div key={label} style={{ background: '#0f1420', border: `1px solid ${color}44`, borderTop: `3px solid ${color}`, borderRadius: '12px', padding: '18px' }}>
                <div style={{ fontSize: '13px', fontWeight: 700, color, marginBottom: '6px' }}>{label}</div>
                {phase.title && <div style={{ fontSize: '13px', fontWeight: 600, color: 'white', marginBottom: '8px' }}>{phase.title}</div>}
                {phase.target_score && <div style={{ fontSize: '12px', color: '#64748b', marginBottom: '4px' }}>Target: <span style={{ color, fontWeight: 700 }}>{phase.target_score}/100</span></div>}
                {phase.cost && <div style={{ fontSize: '11px', color: '#475569', marginBottom: '8px' }}>{phase.developer_needed ? 'Developer needed' : 'No developer needed'} · Cost: {phase.cost}</div>}
                {(phase.actions || []).map((a: string, i: number) => (
                  <div key={i} style={{ fontSize: '12px', color: '#64748b', padding: '5px 0', borderBottom: '1px solid #0d1520', lineHeight: 1.5 }}>
                    <span style={{ color, fontWeight: 700, marginRight: '6px' }}>{i+1}.</span>{a}
                  </div>
                ))}
              </div>
            )
          })}
        </div>

        {r.expected_outcome_90_days && (
          <div style={{ background: '#052e16', border: '1px solid #166534', borderRadius: '12px', padding: '18px', marginBottom: '16px' }}>
            <div style={{ fontSize: '11px', fontWeight: 700, color: '#4ade80', textTransform: 'uppercase' as const, letterSpacing: '0.08em', marginBottom: '6px' }}>EXPECTED IN 90 DAYS</div>
            <div style={{ fontSize: '13px', color: '#86efac', lineHeight: 1.7 }}>{r.expected_outcome_90_days}</div>
          </div>
        )}

        <div style={{ textAlign: 'center', padding: '20px', borderTop: '1px solid #1e2a3a', marginTop: '16px' }}>
          <div style={{ fontSize: '15px', fontWeight: 700, color: 'white', marginBottom: '4px' }}>Ready to implement this roadmap?</div>
          <div style={{ fontSize: '12px', color: '#64748b', marginBottom: '8px' }}>Klaro Pulse monitors your site and alerts you when competitors change strategy.</div>
          <div style={{ fontSize: '12px', color: '#475569' }}>klaro.services/pulse · Monthly monitoring from $149/month</div>
        </div>

        <PageFooter company={companyName} url={scan.url} />
      </div>
    </>
  )
}
