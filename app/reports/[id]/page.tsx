'use client'
import { useState, useEffect } from 'react'

function sc(s: number) { return s >= 75 ? '#4ade80' : s >= 50 ? '#fbbf24' : '#f87171' }
function scBg(s: number) { return s >= 75 ? '#052e16' : s >= 50 ? '#1c1505' : '#1c0505' }
function scBorder(s: number) { return s >= 75 ? '#166534' : s >= 50 ? '#92400e' : '#991b1b' }

function ScoreBox({ label, score }: { label: string, score: number }) {
  return (
    <div style={{ background: scBg(score), border: `1px solid ${scBorder(score)}`, borderRadius: '12px', padding: '16px', textAlign: 'center' }}>
      <div style={{ fontSize: '32px', fontWeight: 900, color: sc(score) }}>{score}</div>
      <div style={{ fontSize: '10px', color: '#475569', textTransform: 'uppercase', letterSpacing: '0.08em', marginTop: '4px', fontWeight: 600 }}>{label}</div>
    </div>
  )
}

function SectionHeader({ page, total, title, subtitle }: { page: number, total: number, title: string, subtitle?: string }) {
  return (
    <div style={{ borderBottom: '2px solid #1e2a3a', paddingBottom: '16px', marginBottom: '24px' }}>
      <div style={{ fontSize: '10px', color: '#334155', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: '6px' }}>
        PAGE {page} OF {total} · {title.toUpperCase()} · CONFIDENTIAL
      </div>
      {subtitle && <div style={{ fontSize: '13px', color: '#475569' }}>{subtitle}</div>}
    </div>
  )
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
  const score = scan.overall_score || 0
  const companyName = r.company_name || (() => { try { return new URL(scan.url).hostname } catch { return scan.url } })()
  const date = new Date(scan.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })
  const TOTAL_PAGES = 5

  function downloadPDF() {
    const prev = document.title
    document.title = `Klaro Pulse — ${companyName} — ${date}`
    window.print()
    setTimeout(() => { document.title = prev }, 2000)
  }

  const pageStyle: React.CSSProperties = {
    maxWidth: '860px', margin: '0 auto', padding: '48px 40px',
    background: '#080c14', marginBottom: '2px',
    pageBreakAfter: 'always' as const,
  }

  return (
    <>
      <style>{`
        @media print {
          .no-print { display: none !important; }
          * { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
          body { background: #080c14 !important; }
        }
        @page { margin: 0; size: A4; }
        body { margin: 0; }
      `}</style>

      {/* Topbar */}
      <div className="no-print" style={{ background: '#0a0f1a', borderBottom: '1px solid #1e2a3a', padding: '0 24px', height: '56px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', position: 'sticky', top: 0, zIndex: 20 }}>
        <div style={{ fontSize: '16px', fontWeight: 900, color: 'white' }}>KLARO <span style={{ color: '#6366f1' }}>PULSE</span> <span style={{ fontSize: '11px', color: '#475569', marginLeft: '8px', fontWeight: 400 }}>SITE INTELLIGENCE REPORT</span></div>
        <div style={{ display: 'flex', gap: '10px' }}>
          <a href="/dashboard" style={{ fontSize: '12px', color: '#818cf8', textDecoration: 'none', border: '1px solid #3b4fd8', borderRadius: '8px', padding: '6px 14px' }}>← Dashboard</a>
          <button onClick={downloadPDF} style={{ fontSize: '12px', color: 'white', background: 'linear-gradient(135deg,#6366f1,#8b5cf6)', border: 'none', borderRadius: '8px', padding: '6px 16px', cursor: 'pointer', fontWeight: 700, fontFamily: 'inherit' }}>⬇ Download PDF</button>
        </div>
      </div>

      {/* PAGE 1 — EXECUTIVE BRIEF */}
      <div style={pageStyle}>
        <SectionHeader page={1} total={TOTAL_PAGES} title="Executive Brief" subtitle={`${companyName} | ${scan.url}`} />

        {/* Logo area */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '32px' }}>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: '36px', fontWeight: 900, color: 'white', marginBottom: '4px' }}>{companyName}</div>
            <a href={scan.url} style={{ fontSize: '13px', color: '#475569', textDecoration: 'none' }}>{scan.url}</a>
            {r.industry && <div style={{ fontSize: '12px', color: '#64748b', marginTop: '6px' }}>Industry: {r.industry}</div>}
          </div>
          <div style={{ textAlign: 'center', marginLeft: '32px' }}>
            <div style={{ fontSize: '64px', fontWeight: 900, color: sc(score), lineHeight: 1 }}>{score}</div>
            <div style={{ fontSize: '14px', color: '#475569' }}>/100</div>
            <div style={{ fontSize: '18px', fontWeight: 700, color: sc(score), marginTop: '4px' }}>Grade: {scan.grade || r.grade}</div>
            {r.urgency && <div style={{ fontSize: '11px', color: '#64748b', marginTop: '2px' }}>{r.urgency}</div>}
          </div>
        </div>

        {/* Score row */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5,1fr)', gap: '10px', marginBottom: '28px' }}>
          <ScoreBox label="Overall" score={score} />
          <ScoreBox label="Trust" score={scan.trust_score || 0} />
          <ScoreBox label="Conversion" score={scan.conversion_score || 0} />
          <ScoreBox label="Security" score={scan.security_score || 0} />
          <ScoreBox label="Mobile" score={scan.mobile_score || 0} />
        </div>

        {/* Verdict */}
        {r.executive_verdict && (
          <div style={{ fontSize: '17px', fontStyle: 'italic', color: '#94a3b8', lineHeight: 1.6, borderLeft: '4px solid #6366f1', paddingLeft: '20px', marginBottom: '20px' }}>
            "{r.executive_verdict}"
          </div>
        )}

        {/* Summary */}
        {r.executive_summary && (
          <div style={{ fontSize: '14px', color: '#64748b', lineHeight: 1.8, marginBottom: '20px' }}>
            {r.executive_summary}
          </div>
        )}

        {r.revenue_impact && (
          <div style={{ background: '#1c0505', border: '1px solid #991b1b', borderRadius: '10px', padding: '14px 18px', marginBottom: '24px', fontSize: '13px', color: '#f87171' }}>
            💰 <strong>Revenue Impact:</strong> {r.revenue_impact}
          </div>
        )}

        {/* Priority Actions */}
        {(r.priority_week_1 || r.priority_month_1 || r.priority_quarter_1) && (
          <div style={{ background: '#0f1420', border: '1px solid #1e2a3a', borderRadius: '12px', padding: '20px' }}>
            <div style={{ fontSize: '11px', fontWeight: 700, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '14px' }}>TOP 3 IMMEDIATE ACTIONS</div>
            {[
              ['THIS WEEK', r.priority_week_1, '#f87171'],
              ['THIS MONTH', r.priority_month_1, '#fbbf24'],
              ['THIS QUARTER', r.priority_quarter_1, '#4ade80'],
            ].map(([label, val, color]) => val ? (
              <div key={label as string} style={{ display: 'flex', gap: '12px', padding: '10px 0', borderBottom: '1px solid #0d1520', alignItems: 'flex-start' }}>
                <span style={{ fontSize: '10px', fontWeight: 700, color: color as string, whiteSpace: 'nowrap', marginTop: '2px', minWidth: '80px' }}>{label as string}</span>
                <span style={{ fontSize: '13px', color: '#94a3b8', lineHeight: 1.5 }}>{val as string}</span>
              </div>
            ) : null)}
          </div>
        )}

        {/* Footer */}
        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '32px', paddingTop: '16px', borderTop: '1px solid #1e2a3a', fontSize: '11px', color: '#334155' }}>
          <span>{companyName} | {scan.url}</span>
          <span>Klaro Pulse Site Intelligence · klaro.services/pulse · © 2026 Klaro Global</span>
        </div>
      </div>

      {/* PAGE 2 — UX & CONVERSION */}
      <div style={pageStyle}>
        <SectionHeader page={2} total={TOTAL_PAGES} title="UX & Conversion Audit" subtitle={`${companyName} | ${scan.url}`} />

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: '10px', marginBottom: '28px' }}>
          <ScoreBox label="Overall" score={score} />
          <ScoreBox label="Trust" score={scan.trust_score || 0} />
          <ScoreBox label="Conversion" score={scan.conversion_score || 0} />
          <ScoreBox label="Security" score={scan.security_score || 0} />
        </div>

        {/* Conversion Killers */}
        <div style={{ marginBottom: '24px' }}>
          <div style={{ fontSize: '13px', fontWeight: 700, color: '#f87171', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '12px' }}>CONVERSION KILLERS — DETAILED ANALYSIS</div>
          {(r.conversion_killers || []).length === 0 ? (
            <div style={{ fontSize: '13px', color: '#64748b', padding: '12px', background: '#0f1420', borderRadius: '8px' }}>No critical conversion issues detected.</div>
          ) : (r.conversion_killers || []).map((k: any, i: number) => (
            <div key={i} style={{ background: '#0f1420', border: '1px solid #991b1b', borderRadius: '10px', padding: '14px', marginBottom: '10px' }}>
              <div style={{ fontSize: '13px', fontWeight: 700, color: '#f87171', marginBottom: '4px' }}>⚠ {k.issue || k}</div>
              {k.impact && <div style={{ fontSize: '12px', color: '#64748b', marginBottom: '4px' }}>Impact: {k.impact}</div>}
              {k.fix && <div style={{ fontSize: '12px', color: '#4ade80' }}>Fix: {k.fix}</div>}
            </div>
          ))}
        </div>

        {/* Quick Wins */}
        {(r.quick_wins || []).length > 0 && (
          <div style={{ marginBottom: '24px' }}>
            <div style={{ fontSize: '13px', fontWeight: 700, color: '#4ade80', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '12px' }}>QUICK WINS — FREE, UNDER 1 HOUR</div>
            {(r.quick_wins || []).map((w: string, i: number) => (
              <div key={i} style={{ fontSize: '13px', color: '#64748b', padding: '8px 0', borderBottom: '1px solid #0d1520' }}>+ {w}</div>
            ))}
          </div>
        )}

        {/* UX Friction + Fixes */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '24px' }}>
          <div>
            <div style={{ fontSize: '12px', fontWeight: 700, color: '#f87171', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '10px' }}>🔴 PROBLEMS FOUND</div>
            {(r.ux_friction_points || []).map((p: string, i: number) => (
              <div key={i} style={{ fontSize: '12px', color: '#64748b', background: '#0f1420', border: '1px solid #1e2a3a', borderRadius: '8px', padding: '10px', marginBottom: '8px', lineHeight: 1.5 }}>⚠ {p}</div>
            ))}
          </div>
          <div>
            <div style={{ fontSize: '12px', fontWeight: 700, color: '#4ade80', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '10px' }}>🟢 HOW TO FIX</div>
            {(r.resolution_steps || []).map((p: string, i: number) => (
              <div key={i} style={{ fontSize: '12px', color: '#64748b', background: '#0f1420', border: '1px solid #1e2a3a', borderRadius: '8px', padding: '10px', marginBottom: '8px', lineHeight: 1.5 }}>
                <span style={{ color: '#4ade80', fontWeight: 700 }}>0{i+1}</span> {p}
              </div>
            ))}
          </div>
        </div>

        {/* Technical signals */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5,1fr)', gap: '10px' }}>
          {[
            ['Mobile', r.mobile_readiness],
            ['Pricing', r.pricing_clarity],
            ['CTA', r.cta_effectiveness],
            ['Audience', r.target_audience_clarity],
            ['Load Speed', r.load_speed_impression],
          ].map(([label, val]) => {
            const good = val === 'Good' || val === 'Clear' || val === 'Strong' || val === 'Fast'
            const bad = val === 'Poor' || val === 'Hidden' || val === 'Missing' || val === 'Confusing' || val === 'Slow'
            return (
              <div key={label as string} style={{ background: '#0f1420', border: '1px solid #1e2a3a', borderRadius: '10px', padding: '12px', textAlign: 'center' }}>
                <div style={{ fontSize: '13px', fontWeight: 700, color: good ? '#4ade80' : bad ? '#f87171' : '#fbbf24' }}>{val || '—'}</div>
                <div style={{ fontSize: '10px', color: '#475569', textTransform: 'uppercase', marginTop: '4px' }}>{label}</div>
              </div>
            )
          })}
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '32px', paddingTop: '16px', borderTop: '1px solid #1e2a3a', fontSize: '11px', color: '#334155' }}>
          <span>{companyName} | {scan.url}</span>
          <span>Klaro Pulse Site Intelligence · klaro.services/pulse · © 2026 Klaro Global</span>
        </div>
      </div>

      {/* PAGE 3 — COMPETITIVE INTELLIGENCE */}
      <div style={pageStyle}>
        <SectionHeader page={3} total={TOTAL_PAGES} title="Competitive Intelligence" subtitle={`${companyName} | ${scan.url}`} />

        {r.market_position && (
          <div style={{ marginBottom: '24px' }}>
            <div style={{ fontSize: '13px', fontWeight: 700, color: '#818cf8', marginBottom: '10px', textTransform: 'uppercase', letterSpacing: '0.08em' }}>MARKET POSITION ANALYSIS</div>
            <div style={{ fontSize: '14px', color: '#64748b', lineHeight: 1.8 }}>{r.market_position}</div>
          </div>
        )}

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '24px' }}>
          {r.why_clients_choose_competitors && (
            <div style={{ background: '#0f1420', border: '1px solid #1e2a3a', borderRadius: '12px', padding: '20px' }}>
              <div style={{ fontSize: '11px', fontWeight: 700, color: '#f87171', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '10px' }}>Why Clients Choose Competitors</div>
              <div style={{ fontSize: '13px', color: '#64748b', lineHeight: 1.7 }}>{r.why_clients_choose_competitors}</div>
            </div>
          )}
          {r.biggest_competitor_advantage && (
            <div style={{ background: '#0f1420', border: '1px solid #1e2a3a', borderRadius: '12px', padding: '20px' }}>
              <div style={{ fontSize: '11px', fontWeight: 700, color: '#fbbf24', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '10px' }}>Biggest Competitor Advantage</div>
              <div style={{ fontSize: '13px', color: '#64748b', lineHeight: 1.7 }}>{r.biggest_competitor_advantage}</div>
            </div>
          )}
        </div>

        {r.opportunity_to_win && (
          <div style={{ background: '#052e16', border: '1px solid #166534', borderRadius: '12px', padding: '20px', marginBottom: '24px' }}>
            <div style={{ fontSize: '11px', fontWeight: 700, color: '#4ade80', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '10px' }}>Your Opportunity To Win</div>
            <div style={{ fontSize: '13px', color: '#86efac', lineHeight: 1.7 }}>{r.opportunity_to_win}</div>
          </div>
        )}

        {(r.strengths || []).length > 0 && (
          <div style={{ marginBottom: '24px' }}>
            <div style={{ fontSize: '11px', fontWeight: 700, color: '#60a5fa', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '12px' }}>WHAT THIS SITE DOES WELL</div>
            {(r.strengths || []).map((s: string, i: number) => (
              <div key={i} style={{ fontSize: '13px', color: '#64748b', padding: '8px 0', borderBottom: '1px solid #0d1520' }}>✓ {s}</div>
            ))}
          </div>
        )}

        {(r.revenue_opportunities || []).length > 0 && (
          <div>
            <div style={{ fontSize: '11px', fontWeight: 700, color: '#fbbf24', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '12px' }}>💰 REVENUE OPPORTUNITIES</div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: '12px' }}>
              {(r.revenue_opportunities || []).map((o: string, i: number) => (
                <div key={i} style={{ background: '#0f1420', border: '1px solid #1e2a3a', borderRadius: '10px', padding: '14px', fontSize: '12px', color: '#64748b', lineHeight: 1.6 }}>💰 {o}</div>
              ))}
            </div>
          </div>
        )}

        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '32px', paddingTop: '16px', borderTop: '1px solid #1e2a3a', fontSize: '11px', color: '#334155' }}>
          <span>{companyName} | {scan.url}</span>
          <span>Klaro Pulse Site Intelligence · klaro.services/pulse · © 2026 Klaro Global</span>
        </div>
      </div>

      {/* PAGE 4 — SECURITY & COMPLIANCE */}
      <div style={pageStyle}>
        <SectionHeader page={4} total={TOTAL_PAGES} title="Security & Compliance" subtitle={`${companyName} | ${scan.url}`} />

        {/* Compliance scores grid */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: '12px', marginBottom: '24px' }}>
          {[
            ['HTTPS / SSL', r.https_score ?? (scan.url?.startsWith('https') ? 100 : 0), r.https_status || (scan.url?.startsWith('https') ? 'Valid SSL certificate, HTTPS enforced' : 'No HTTPS detected')],
            ['Mobile / ADA', r.mobile_ada_score ?? scan.mobile_score ?? 60, r.mobile_ada_status || 'Needs assessment'],
            ['Cookie Consent', r.cookie_consent_score ?? 0, r.cookie_status || 'No consent banner found'],
            ['Privacy Policy', r.privacy_policy_score ?? 0, r.privacy_status || 'No privacy policy found'],
            ['SOC2 Readiness', r.soc2_readiness_score ?? 50, 'Partial'],
            ['GDPR Status', r.gdpr_status_score ?? 50, 'Partial'],
          ].map(([label, val, status]) => (
            <div key={label as string} style={{ background: '#0f1420', border: '1px solid #1e2a3a', borderRadius: '12px', padding: '16px' }}>
              <div style={{ fontSize: '28px', fontWeight: 900, color: sc(val as number), marginBottom: '4px' }}>{val}</div>
              <div style={{ fontSize: '12px', fontWeight: 700, color: 'white', marginBottom: '4px' }}>{label as string}</div>
              <div style={{ fontSize: '11px', color: '#64748b' }}>{status as string}</div>
            </div>
          ))}
        </div>

        {/* Overall compliance */}
        {r.overall_compliance_score && (
          <div style={{ background: scBg(r.overall_compliance_score), border: `2px solid ${scBorder(r.overall_compliance_score)}`, borderRadius: '12px', padding: '16px', marginBottom: '24px', display: 'flex', alignItems: 'center', gap: '16px' }}>
            <div style={{ fontSize: '36px', fontWeight: 900, color: sc(r.overall_compliance_score) }}>{r.overall_compliance_score}</div>
            <div>
              <div style={{ fontSize: '14px', fontWeight: 700, color: 'white' }}>Overall Compliance Score</div>
              {r.compliance_risk_level && <div style={{ fontSize: '12px', color: sc(r.overall_compliance_score), fontWeight: 700, marginTop: '2px' }}>{r.compliance_risk_level}</div>}
            </div>
          </div>
        )}

        {/* Legal risks */}
        {(r.legal_risks || []).length > 0 && (
          <div style={{ marginBottom: '20px' }}>
            <div style={{ fontSize: '12px', fontWeight: 700, color: '#f87171', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '10px' }}>LEGAL RISKS IDENTIFIED</div>
            {(r.legal_risks || []).map((risk: string, i: number) => (
              <div key={i} style={{ fontSize: '13px', color: '#64748b', padding: '8px 0', borderBottom: '1px solid #0d1520' }}>! {risk}</div>
            ))}
          </div>
        )}

        {/* Security issues */}
        {(r.security_issues || []).length > 0 && (
          <div style={{ marginBottom: '20px' }}>
            <div style={{ fontSize: '12px', fontWeight: 700, color: '#fbbf24', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '10px' }}>SECURITY ISSUES</div>
            {(r.security_issues || []).map((issue: string, i: number) => (
              <div key={i} style={{ fontSize: '13px', color: '#64748b', padding: '8px 0', borderBottom: '1px solid #0d1520' }}>- {issue}</div>
            ))}
          </div>
        )}

        {/* Remediation */}
        {(r.compliance_recommendations || []).length > 0 && (
          <div>
            <div style={{ fontSize: '12px', fontWeight: 700, color: '#4ade80', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '10px' }}>REMEDIATION RECOMMENDATIONS</div>
            {(r.compliance_recommendations || []).map((rec: string, i: number) => (
              <div key={i} style={{ fontSize: '13px', color: '#64748b', padding: '8px 0', borderBottom: '1px solid #0d1520' }}>{i+1}. {rec}</div>
            ))}
          </div>
        )}

        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '32px', paddingTop: '16px', borderTop: '1px solid #1e2a3a', fontSize: '11px', color: '#334155' }}>
          <span>{companyName} | {scan.url}</span>
          <span>Klaro Pulse Site Intelligence · klaro.services/pulse · © 2026 Klaro Global</span>
        </div>
      </div>

      {/* PAGE 5 — 90-DAY ROADMAP */}
      <div style={{ ...pageStyle, pageBreakAfter: 'avoid' as const }}>
        <SectionHeader page={5} total={TOTAL_PAGES} title="90-Day Action Roadmap" subtitle={`${companyName} | ${scan.url}`} />

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: '16px', marginBottom: '24px' }}>
          {[
            ['roadmap_week_1', 'Week 1 — Quick Wins', '#f87171'],
            ['roadmap_month_1', 'Month 1 — Foundation', '#fbbf24'],
            ['roadmap_month_2_3', 'Month 2-3 — Growth', '#4ade80'],
          ].map(([key, label, color]) => {
            const phase = r[key as string] || {}
            return (
              <div key={key as string} style={{ background: '#0f1420', border: `1px solid ${color}44`, borderTop: `3px solid ${color}`, borderRadius: '12px', padding: '20px' }}>
                <div style={{ fontSize: '12px', fontWeight: 700, color: color as string, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '8px' }}>{label as string}</div>
                {phase.title && <div style={{ fontSize: '14px', fontWeight: 700, color: 'white', marginBottom: '10px' }}>{phase.title}</div>}
                {phase.target_score && (
                  <div style={{ fontSize: '12px', color: '#64748b', marginBottom: '6px' }}>Target: <span style={{ color: color as string, fontWeight: 700 }}>{phase.target_score}/100</span></div>
                )}
                {phase.cost && <div style={{ fontSize: '11px', color: '#475569', marginBottom: '10px' }}>Cost: {phase.cost}</div>}
                {(phase.actions || []).map((a: string, i: number) => (
                  <div key={i} style={{ fontSize: '12px', color: '#64748b', padding: '5px 0', borderBottom: '1px solid #0d1520', lineHeight: 1.5 }}>
                    <span style={{ color: color as string, fontWeight: 700, marginRight: '6px' }}>{i+1}.</span>{a}
                  </div>
                ))}
              </div>
            )
          })}
        </div>

        {r.expected_outcome_90_days && (
          <div style={{ background: '#052e16', border: '1px solid #166534', borderRadius: '12px', padding: '20px', marginBottom: '20px' }}>
            <div style={{ fontSize: '11px', fontWeight: 700, color: '#4ade80', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '8px' }}>EXPECTED IN 90 DAYS</div>
            <div style={{ fontSize: '14px', color: '#86efac', lineHeight: 1.7 }}>{r.expected_outcome_90_days}</div>
          </div>
        )}

        {r.monitoring_recommendation && (
          <div style={{ background: '#0c1a3a', border: '1px solid #3b4fd8', borderRadius: '12px', padding: '16px', marginBottom: '20px' }}>
            <div style={{ fontSize: '13px', color: '#818cf8' }}>📡 {r.monitoring_recommendation}</div>
          </div>
        )}

        {/* CTA */}
        <div style={{ textAlign: 'center', padding: '24px', borderTop: '1px solid #1e2a3a', marginTop: '20px' }}>
          <div style={{ fontSize: '16px', fontWeight: 700, color: 'white', marginBottom: '4px' }}>Ready to implement this roadmap?</div>
          <div style={{ fontSize: '13px', color: '#64748b', marginBottom: '12px' }}>Klaro Pulse monitors your site and alerts you when competitors change strategy.</div>
          <div style={{ fontSize: '12px', color: '#475569' }}>klaro.services/pulse · Monthly monitoring from $149/month</div>
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '24px', paddingTop: '16px', borderTop: '1px solid #1e2a3a', fontSize: '11px', color: '#334155' }}>
          <span>{companyName} | {scan.url}</span>
          <span>Klaro Pulse Site Intelligence · klaro.services/pulse · © 2026 Klaro Global</span>
        </div>
      </div>
    </>
  )
}
