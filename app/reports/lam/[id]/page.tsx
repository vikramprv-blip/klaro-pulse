'use client'
import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'

function sc(s: number) { return s >= 75 ? '#4ade80' : s >= 50 ? '#fbbf24' : '#f87171' }
function scBorder(s: number) { return s >= 75 ? '#166534' : s >= 50 ? '#92400e' : '#991b1b' }
function scBg(s: number) { return s >= 75 ? '#052e16' : s >= 50 ? '#1c1505' : '#1c0505' }

export default function LamReport({ params }: { params: { id: string } }) {
  const [report, setReport] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const sb = createClient()

  useEffect(() => {
    sb.auth.getUser().then(({ data: { user } }) => {
      if (!user) { window.location.href = '/signin'; return }
      sb.from('lam_runs').select('*').eq('id', params.id).single()
        .then(({ data }) => { setReport(data); setLoading(false) })
    })
  }, [params.id])

  if (loading) return (
    <div style={{ minHeight: '100vh', background: '#080c14', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ color: '#6366f1', fontSize: '14px' }}>Loading LAM Report...</div>
    </div>
  )
  if (!report) return (
    <div style={{ minHeight: '100vh', background: '#080c14', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ color: '#f87171' }}>Report not found. <a href="/dashboard" style={{ color: '#818cf8' }}>← Back</a></div>
    </div>
  )

  const eb = report.executive_brief || {}
  const ce = report.client_experience || {}
  const ada = report.ada_report || {}
  const soc = report.soc_report || {}
  const ci = report.competitive_intel || {}
  const rm = report.roadmap || {}
  const overall = report.overall_score || 0
  const hostname = (() => { try { return new URL(report.url).hostname } catch { return report.url } })()
  const grade = report.grade || '—'

  return (
    <div style={S.page}>
      {/* Topbar */}
      <div style={S.topbar}>
        <div style={S.topLogo}>KLARO <span style={S.accent}>PULSE</span> <span style={S.topSub}>LAM AUDIT REPORT</span></div>
        <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
          <a href="/dashboard" style={S.backBtn}>← Dashboard</a>
          <div style={{ fontSize: '11px', color: '#475569' }}>Report ID: {report.id?.slice(0, 8)}</div>
        </div>
      </div>

      <div style={S.main}>
        {/* Page 1 — Executive Brief */}
        <div style={S.section}>
          <div style={S.sectionLabel}>PAGE 1 OF 8 · EXECUTIVE BRIEF</div>
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '24px', flexWrap: 'wrap' }}>
            <div style={{ flex: 1 }}>
              <div style={S.siteName}>{hostname}</div>
              <a href={report.url} target="_blank" rel="noreferrer" style={S.siteUrl}>{report.url}</a>
              <div style={S.verdict}>"{eb.one_line_verdict || eb.plain_english_summary || 'LAM audit complete.'}"</div>
              {eb.plain_english_summary && eb.one_line_verdict && (
                <div style={S.summary}>{eb.plain_english_summary}</div>
              )}
              {eb.estimated_monthly_revenue_lost && (
                <div style={S.revImpact}>
                  <span style={{ color: '#f87171', fontWeight: 700 }}>Revenue Impact:</span> {eb.estimated_monthly_revenue_lost}
                </div>
              )}
            </div>
            <div style={{ textAlign: 'center', flexShrink: 0 }}>
              <div style={{ ...S.bigRing, borderColor: scBorder(overall), color: sc(overall) }}>
                <div style={{ fontSize: '48px', fontWeight: 900, lineHeight: 1 }}>{overall}</div>
                <div style={{ fontSize: '12px', opacity: 0.6, fontWeight: 700 }}>OVERALL</div>
              </div>
              <div style={{ fontSize: '28px', fontWeight: 900, color: sc(overall), marginTop: '8px' }}>Grade: {grade}</div>
              <div style={{ fontSize: '11px', color: '#475569', marginTop: '4px' }}>{eb.urgency || 'Standard'} Priority</div>
            </div>
          </div>

          {/* Score grid */}
          <div style={S.scoreGrid}>
            {[['Overall', overall], ['LAM', report.lam_score], ['ADA', report.ada_score], ['SOC', report.soc_score]].map(([label, val]) => (
              <div key={label} style={{ ...S.scoreBox, background: scBg(val as number), borderColor: scBorder(val as number) }}>
                <div style={{ fontSize: '28px', fontWeight: 900, color: sc(val as number) }}>{val || '—'}</div>
                <div style={S.scoreBoxLabel}>{label}</div>
              </div>
            ))}
          </div>

          {/* Top 3 actions */}
          {(eb.top_3_actions || []).length > 0 && (
            <div style={S.actionsBox}>
              <div style={S.actionsTitle}>TOP 3 IMMEDIATE ACTIONS</div>
              {(eb.top_3_actions || []).map((action: string, i: number) => (
                <div key={i} style={S.actionItem}>
                  <span style={{ color: '#818cf8', fontWeight: 700, marginRight: '10px', fontSize: '11px' }}>
                    {i === 0 ? 'THIS WEEK' : i === 1 ? 'THIS MONTH' : 'THIS QUARTER'}
                  </span>
                  {action}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Page 2 — Visit Narrative */}
        <div style={S.section}>
          <div style={S.sectionLabel}>PAGE 2 OF 8 · THE LAM AGENT VISIT</div>
          <div style={S.sectionTitle}>How our AI agent experienced this website as a real potential client</div>
          <div style={S.narrative}>{report.visit_narrative || ce.what_agent_experienced || 'Visit narrative not available.'}</div>

          <div style={S.metricsGrid}>
            {[
              ['Time to understand business', ce.time_to_understand_business],
              ['Time to find contact', ce.time_to_find_contact],
              ['Contact form experience', ce.contact_form_experience],
              ['Would real client convert?', ce.would_real_client_convert],
              ['Conversion probability', ce.conversion_probability],
            ].filter(([, v]) => v).map(([label, val]) => (
              <div key={label as string} style={S.metricItem}>
                <div style={S.metricLabel}>{label as string}</div>
                <div style={S.metricVal}>{val as string}</div>
              </div>
            ))}
          </div>

          {(ce.conversion_blockers || []).length > 0 && (
            <div style={{ marginTop: '16px' }}>
              <div style={S.subhead}>CONVERSION BLOCKERS</div>
              {(ce.conversion_blockers || []).map((b: string, i: number) => (
                <div key={i} style={{ ...S.detailItem, marginBottom: '6px' }}>⚠ {b}</div>
              ))}
            </div>
          )}
        </div>

        {/* Page 3 — Auth Flow */}
        <div style={S.section}>
          <div style={S.sectionLabel}>PAGE 3 OF 8 · SIGNIN / SIGNUP EXPERIENCE</div>
          <div style={S.sectionTitle}>Our LAM agent attempted to create an account and sign in</div>
          <div style={S.twoCol}>
            <div>
              <div style={S.subhead}>SIGNUP FLOW</div>
              <div style={S.detailItem}>{report.auth_flow_report?.signup_experience || ce.signup_experience || 'Not tested'}</div>
            </div>
            <div>
              <div style={S.subhead}>SIGNIN FLOW</div>
              <div style={S.detailItem}>{report.auth_flow_report?.signin_experience || ce.signin_experience || 'Not tested'}</div>
            </div>
          </div>
          <div style={S.scoreGrid}>
            <div style={{ ...S.scoreBox, background: scBg(report.auth_score || 0), borderColor: scBorder(report.auth_score || 0) }}>
              <div style={{ fontSize: '28px', fontWeight: 900, color: sc(report.auth_score || 0) }}>{report.auth_score || '—'}</div>
              <div style={S.scoreBoxLabel}>Auth Score</div>
            </div>
            <div style={{ ...S.scoreBox }}>
              <div style={{ fontSize: '20px', fontWeight: 900, color: 'white' }}>{report.auth_flow_report?.has_social_login ? '✓' : '✗'}</div>
              <div style={S.scoreBoxLabel}>Social Login</div>
            </div>
          </div>
        </div>

        {/* Page 4 — ADA */}
        <div style={S.section}>
          <div style={S.sectionLabel}>PAGE 4 OF 8 · ADA / WCAG 2.1 AA ACCESSIBILITY</div>
          <div style={S.sectionTitle}>Full accessibility audit against WCAG 2.1 AA standards</div>
          <div style={S.scoreGrid}>
            {[['ADA Score', ada.ada_score || report.ada_score], ['WCAG Level', ada.wcag_level_achieved || '—'], ['Risk', ada.risk_level || '—'], ['Legal Exposure', ada.legal_exposure || '—']].map(([label, val]) => (
              <div key={label as string} style={S.scoreBox}>
                <div style={{ fontSize: typeof val === 'number' ? '28px' : '16px', fontWeight: 900, color: typeof val === 'number' ? sc(val as number) : '#fbbf24' }}>{val || '—'}</div>
                <div style={S.scoreBoxLabel}>{label as string}</div>
              </div>
            ))}
          </div>
          <div style={S.narrative}>{ada.ada_narrative || 'ADA audit narrative not available.'}</div>
          {(ada.critical_violations || []).length > 0 && (
            <div>
              <div style={S.subhead}>CRITICAL VIOLATIONS</div>
              {(ada.critical_violations || []).map((v: string, i: number) => (
                <div key={i} style={{ ...S.detailItem, marginBottom: '6px', borderColor: '#991b1b' }}>✗ {v}</div>
              ))}
            </div>
          )}
          {(ada.remediation_cost || ada.remediation_time) && (
            <div style={S.twoCol}>
              <div style={S.metricItem}><div style={S.metricLabel}>Remediation Cost</div><div style={S.metricVal}>{ada.remediation_cost || '—'}</div></div>
              <div style={S.metricItem}><div style={S.metricLabel}>Remediation Time</div><div style={S.metricVal}>{ada.remediation_time || '—'}</div></div>
            </div>
          )}
        </div>

        {/* Page 5 — SOC */}
        <div style={S.section}>
          <div style={S.sectionLabel}>PAGE 5 OF 8 · SOC / SECURITY COMPLIANCE</div>
          <div style={S.sectionTitle}>Public security and compliance signal audit</div>
          <div style={S.complianceGrid}>
            {[
              ['HTTPS', soc.https_enforced],
              ['Cookie Consent', soc.cookie_consent_compliant],
              ['GDPR', soc.gdpr_compliant],
              ['CCPA', soc.ccpa_compliant],
              ['India DPDP', soc.india_dpdp_compliant],
              ['Privacy Policy', soc.privacy_policy_adequate],
            ].map(([label, val]) => (
              <div key={label as string} style={S.complianceItem}>
                <div style={{ fontSize: '20px', color: val ? '#4ade80' : '#f87171' }}>{val ? '✓' : '✗'}</div>
                <div style={S.scoreBoxLabel}>{label as string}</div>
              </div>
            ))}
          </div>
          <div style={S.narrative}>{soc.soc_narrative || 'SOC audit narrative not available.'}</div>
          {(soc.compliance_gaps || []).length > 0 && (
            <div>
              <div style={S.subhead}>COMPLIANCE GAPS</div>
              {(soc.compliance_gaps || []).map((g: string, i: number) => (
                <div key={i} style={{ ...S.detailItem, marginBottom: '6px' }}>⚠ {g}</div>
              ))}
            </div>
          )}
        </div>

        {/* Page 6 — Competitive Intel */}
        <div style={S.section}>
          <div style={S.sectionLabel}>PAGE 6 OF 8 · MARKET POSITION ANALYSIS</div>
          <div style={S.sectionTitle}>Where you stand against competitors</div>
          <div style={S.twoCol}>
            <div>
              <div style={S.subhead}>WHERE LOSING CLIENTS</div>
              <div style={S.detailItem}>{ci.where_losing_clients_to_competitors || '—'}</div>
              <div style={{ marginTop: '12px' }}></div>
              <div style={S.subhead}>BIGGEST WEAKNESS</div>
              <div style={S.detailItem}>{ci.biggest_competitive_weakness || '—'}</div>
            </div>
            <div>
              <div style={S.subhead}>OPPORTUNITY TO WIN</div>
              <div style={{ ...S.detailItem, borderColor: '#166534', background: '#052e16', color: '#4ade80' }}>{ci.opportunity_to_win || '—'}</div>
              <div style={{ marginTop: '12px' }}></div>
              <div style={S.subhead}>MARKET POSITION</div>
              <div style={S.detailItem}>{ci.market_position || '—'}</div>
            </div>
          </div>
        </div>

        {/* Page 7 — 90-Day Roadmap */}
        <div style={S.section}>
          <div style={S.sectionLabel}>PAGE 7 OF 8 · 90-DAY ACTION ROADMAP</div>
          <div style={S.sectionTitle}>Your Digital Transformation Plan</div>
          <div style={S.roadmapGrid}>
            {[
              { key: 'week_1', label: 'WEEK 1', color: '#f87171' },
              { key: 'month_1', label: 'MONTH 1', color: '#fbbf24' },
              { key: 'month_2_3', label: 'MONTH 2-3', color: '#4ade80' },
            ].map(({ key, label, color }) => {
              const phase = rm[key] || {}
              return (
                <div key={key} style={{ ...S.roadmapCard, borderColor: color + '44' }}>
                  <div style={{ fontSize: '11px', fontWeight: 700, color, marginBottom: '6px', letterSpacing: '0.08em' }}>{label}</div>
                  <div style={{ fontSize: '13px', fontWeight: 700, color: 'white', marginBottom: '10px' }}>{phase.title || '—'}</div>
                  {(phase.actions || []).map((a: string, i: number) => (
                    <div key={i} style={{ fontSize: '12px', color: '#64748b', padding: '4px 0', borderBottom: '1px solid #0d1520' }}>
                      <span style={{ color, marginRight: '6px' }}>{i + 1}.</span>{a}
                    </div>
                  ))}
                  {phase.estimated_cost && <div style={{ fontSize: '11px', color: '#475569', marginTop: '8px' }}>Cost: {phase.estimated_cost}</div>}
                  {phase.expected_score_improvement && <div style={{ fontSize: '11px', color }}>Expected: +{phase.expected_score_improvement} points</div>}
                </div>
              )
            })}
          </div>
          {rm.expected_outcome_90_days && (
            <div style={{ ...S.detailItem, marginTop: '16px', borderColor: '#166534', background: '#052e16', color: '#4ade80' }}>
              🎯 {rm.expected_outcome_90_days}
            </div>
          )}
        </div>

        {/* Page 8 — Methodology */}
        <div style={S.section}>
          <div style={S.sectionLabel}>PAGE 8 OF 8 · ABOUT THIS LAM AUDIT</div>
          <div style={S.sectionTitle}>Unlike standard AI reports that only read HTML, our LAM agent actually visits your website</div>
          <div style={S.twoCol}>
            {[
              ['Site Exploration', 'Visited homepage, about, services, pricing, contact as a potential client'],
              ['Conversion Attempt', 'Tried to contact the business — phone, email, contact form'],
              ['Auth Flow Test', 'Attempted account creation and signin, noted all friction points'],
              ['ADA/WCAG Audit', 'Full WCAG 2.1 AA check — keyboard nav, screen reader, contrast, alt text'],
              ['SOC/Compliance', 'Scanned all public pages for HTTPS, cookie consent, privacy, GDPR signals'],
              ['Executive Report', 'AI synthesised all findings into business-focused recommendations'],
            ].map(([label, desc]) => (
              <div key={label as string} style={S.methodItem}>
                <div style={{ fontSize: '11px', fontWeight: 700, color: '#818cf8', marginBottom: '4px' }}>{label as string}</div>
                <div style={{ fontSize: '12px', color: '#64748b' }}>{desc as string}</div>
              </div>
            ))}
          </div>
          <div style={S.scanDetails}>
            <div style={S.scanDetailItem}><span style={{ color: '#475569' }}>Target URL</span><span style={{ color: 'white' }}>{report.url}</span></div>
            <div style={S.scanDetailItem}><span style={{ color: '#475569' }}>Scan Date</span><span style={{ color: 'white' }}>{new Date(report.created_at).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</span></div>
            <div style={S.scanDetailItem}><span style={{ color: '#475569' }}>Agent Version</span><span style={{ color: 'white' }}>LAM v4 — Browser Use + Multi-LLM</span></div>
            <div style={S.scanDetailItem}><span style={{ color: '#475569' }}>Report ID</span><span style={{ color: 'white' }}>{report.id}</span></div>
          </div>
        </div>
      </div>
    </div>
  )
}

const S: Record<string, React.CSSProperties> = {
  page: { minHeight: '100vh', background: '#080c14', color: '#94a3b8' },
  topbar: { background: '#0a0f1a', borderBottom: '1px solid #1e2a3a', padding: '0 24px', height: '56px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', position: 'sticky', top: 0, zIndex: 20 },
  topLogo: { fontSize: '16px', fontWeight: 900, color: 'white' },
  accent: { color: '#6366f1' },
  topSub: { fontSize: '11px', color: '#475569', fontWeight: 400, marginLeft: '8px', letterSpacing: '0.08em' },
  backBtn: { fontSize: '12px', color: '#818cf8', textDecoration: 'none', border: '1px solid #3b4fd8', borderRadius: '8px', padding: '5px 12px' },
  main: { maxWidth: '900px', margin: '0 auto', padding: '40px 24px' },
  section: { background: '#0f1420', border: '1px solid #1e2a3a', borderRadius: '16px', padding: '32px', marginBottom: '24px' },
  sectionLabel: { fontSize: '10px', fontWeight: 700, color: '#334155', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '16px', borderBottom: '1px solid #1e2a3a', paddingBottom: '10px' },
  sectionTitle: { fontSize: '18px', fontWeight: 700, color: 'white', marginBottom: '20px', lineHeight: 1.4 },
  siteName: { fontSize: '28px', fontWeight: 900, color: 'white', marginBottom: '4px' },
  siteUrl: { fontSize: '13px', color: '#334155', textDecoration: 'none' },
  verdict: { fontSize: '16px', fontStyle: 'italic', color: '#94a3b8', margin: '16px 0', lineHeight: 1.6, borderLeft: '3px solid #6366f1', paddingLeft: '16px' },
  summary: { fontSize: '14px', color: '#64748b', lineHeight: 1.7, marginBottom: '12px' },
  revImpact: { fontSize: '13px', background: '#1c0505', border: '1px solid #991b1b', borderRadius: '8px', padding: '10px 14px', marginTop: '12px' },
  bigRing: { width: '120px', height: '120px', borderRadius: '50%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', border: '4px solid', margin: '0 auto' },
  scoreGrid: { display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: '12px', margin: '20px 0' },
  scoreBox: { background: '#080c14', border: '1px solid #1e2a3a', borderRadius: '12px', padding: '16px', textAlign: 'center' },
  scoreBoxLabel: { fontSize: '10px', color: '#475569', textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: 600, marginTop: '6px' },
  actionsBox: { background: '#080c14', border: '1px solid #1e2a3a', borderRadius: '12px', padding: '16px', marginTop: '16px' },
  actionsTitle: { fontSize: '10px', fontWeight: 700, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '12px' },
  actionItem: { fontSize: '13px', color: '#94a3b8', padding: '8px 0', borderBottom: '1px solid #0d1520', display: 'flex', alignItems: 'flex-start', gap: '8px' },
  narrative: { fontSize: '14px', color: '#64748b', lineHeight: 1.8, marginBottom: '20px', whiteSpace: 'pre-wrap' },
  metricsGrid: { display: 'grid', gridTemplateColumns: 'repeat(2,1fr)', gap: '10px', margin: '16px 0' },
  metricItem: { background: '#080c14', border: '1px solid #1e2a3a', borderRadius: '10px', padding: '12px' },
  metricLabel: { fontSize: '10px', color: '#475569', textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: 600, marginBottom: '4px' },
  metricVal: { fontSize: '13px', color: 'white', fontWeight: 600 },
  subhead: { fontSize: '10px', fontWeight: 700, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '8px' },
  detailItem: { fontSize: '13px', color: '#64748b', background: '#080c14', border: '1px solid #1e2a3a', borderRadius: '8px', padding: '10px 14px', lineHeight: 1.6 },
  twoCol: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', margin: '16px 0' },
  complianceGrid: { display: 'grid', gridTemplateColumns: 'repeat(6,1fr)', gap: '10px', margin: '16px 0' },
  complianceItem: { background: '#080c14', border: '1px solid #1e2a3a', borderRadius: '10px', padding: '12px', textAlign: 'center' },
  roadmapGrid: { display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: '16px', margin: '16px 0' },
  roadmapCard: { background: '#080c14', border: '1px solid', borderRadius: '12px', padding: '16px' },
  methodItem: { background: '#080c14', border: '1px solid #1e2a3a', borderRadius: '10px', padding: '14px', marginBottom: '10px' },
  scanDetails: { background: '#080c14', border: '1px solid #1e2a3a', borderRadius: '12px', padding: '16px', marginTop: '20px' },
  scanDetailItem: { display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid #0d1520', fontSize: '12px' },
}
