'use client'
import { useState, useEffect } from 'react'

function sc(s: number) { return s >= 75 ? '#16a34a' : s >= 50 ? '#d97706' : '#dc2626' }
function scBg(s: number) { return s >= 75 ? '#f0fdf4' : s >= 50 ? '#fffbeb' : '#fef2f2' }
function scBorder(s: number) { return s >= 75 ? '#bbf7d0' : s >= 50 ? '#fde68a' : '#fecaca' }

function ScoreBox({ label, val }: { label: string, val: number }) {
  return (
    <div style={{ background: scBg(val), border: `2px solid ${scBorder(val)}`, borderRadius: '10px', padding: '14px', textAlign: 'center' as const }}>
      <div style={{ fontSize: '30px', fontWeight: 900, color: sc(val), lineHeight: 1 }}>{val || '—'}</div>
      <div style={{ fontSize: '10px', color: '#6b7280', textTransform: 'uppercase' as const, letterSpacing: '0.07em', marginTop: '5px', fontWeight: 600 }}>{label}</div>
    </div>
  )
}

function PageFooter({ company, url }: { company: string, url: string }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '32px', paddingTop: '12px', borderTop: '1px solid #e2e8f0', fontSize: '10px', color: '#9ca3af' }}>
      <span>{company} | {url}</span>
      <span>Klaro Pulse LAM Intelligence · klaro.services/pulse · © 2026 Klaro Global</span>
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

export default function LAMReportPage({ params }: { params: { id: string } }) {
  const [scan, setScan] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/pulse/reports').then(r => r.json()).then(data => {
      const found = (data.lam || []).find((s: any) => s.id === params.id)
      setScan(found)
      setLoading(false)
    })
  }, [params.id])

  if (loading) return (
    <div style={{ minHeight: '100vh', background: '#f8fafc', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ color: '#6366f1' }}>Loading LAM report...</div>
    </div>
  )
  if (!scan) return (
    <div style={{ minHeight: '100vh', background: '#f8fafc', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ color: '#dc2626' }}>LAM report not found. <a href="/dashboard" style={{ color: '#6366f1' }}>← Back</a></div>
    </div>
  )

  const eb = scan.executive_brief || {}
  const ce = scan.client_experience || {}
  const ada = scan.ada_report || {}
  const soc = scan.soc_report || {}
  const ci = scan.competitive_intel || {}
  const rm = scan.roadmap || {}
  const st = scan.strengths || []

  const score = scan.overall_score || 0
  const lamScore = scan.lam_score || 0
  const adaScore = scan.ada_score || 0
  const socScore = scan.soc_score || 0
  const convScore = scan.conversion_score || 0
  const grade = scan.grade || '—'
  const domain = (() => { try { return new URL(scan.url).hostname } catch { return scan.url } })()
  const date = new Date(scan.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })
  const TOTAL = 8

  function downloadPDF() {
    const prev = document.title
    document.title = `Klaro Pulse LAM — ${domain} — ${date}`
    window.print()
    setTimeout(() => { document.title = prev }, 2000)
  }

  const hdr = (page: number, section: string) => (
    <div style={{ borderBottom: '2px solid #1e293b', paddingBottom: '10px', marginBottom: '24px', display: 'flex', justifyContent: 'space-between', fontSize: '10px', color: '#6b7280', letterSpacing: '0.1em', textTransform: 'uppercase' as const }}>
      <span>KLARO PULSE LAM AUDIT · {section.toUpperCase()} · PAGE {page} OF {TOTAL} · {date.toUpperCase()} · CONFIDENTIAL</span>
    </div>
  )

  return (
    <>
      <style>{`
        @media print { .no-print { display: none !important; } }
        @page { margin: 0; size: A4; }
        body { margin: 0; background: white; }
      `}</style>

      {/* Topbar */}
      <div className="no-print" style={{ background: '#0a0f1a', borderBottom: '1px solid #1e2a3a', padding: '0 24px', height: '56px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', position: 'sticky', top: 0, zIndex: 20 }}>
        <div style={{ fontSize: '16px', fontWeight: 900, color: 'white', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <img src="/klaro-logo.png" alt="Klaro" style={{ width: '28px', height: '28px', borderRadius: '6px', objectFit: 'cover' as const }} />
          KLARO <span style={{ color: '#a78bfa' }}>PULSE</span> <span style={{ fontSize: '11px', color: '#475569', marginLeft: '8px', fontWeight: 400 }}>LAM AUDIT REPORT</span>
        </div>
        <div style={{ display: 'flex', gap: '10px' }}>
          <a href="/dashboard" style={{ fontSize: '12px', color: '#818cf8', textDecoration: 'none', border: '1px solid #3b4fd8', borderRadius: '8px', padding: '6px 14px' }}>← Dashboard</a>
          <button onClick={downloadPDF} style={{ fontSize: '12px', color: 'white', background: 'linear-gradient(135deg,#7c3aed,#a855f7)', border: 'none', borderRadius: '8px', padding: '6px 16px', cursor: 'pointer', fontWeight: 700, fontFamily: 'inherit' }}>⬇ Download PDF</button>
        </div>
      </div>

      {/* PAGE 1 — EXECUTIVE BRIEF */}
      <div style={PAGE}>
        {hdr(1, 'Executive Brief')}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '24px', gap: '24px' }}>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: '11px', fontWeight: 700, color: '#7c3aed', textTransform: 'uppercase' as const, letterSpacing: '0.1em', marginBottom: '6px' }}>🤖 LAM AGENT AUDIT</div>
            <div style={{ fontSize: '40px', fontWeight: 900, color: '#0f172a', marginBottom: '4px', lineHeight: 1.1 }}>{domain}</div>
            <a href={scan.url} style={{ fontSize: '13px', color: '#6366f1', textDecoration: 'none' }}>{scan.url}</a>
            {ci.industry && <div style={{ fontSize: '12px', color: '#64748b', marginTop: '4px' }}>Industry: {ci.industry}</div>}
          </div>
          <div style={{ textAlign: 'center', flexShrink: 0 }}>
            <div style={{ fontSize: '80px', fontWeight: 900, color: sc(score), lineHeight: 1 }}>{score}</div>
            <div style={{ fontSize: '13px', color: '#94a3b8' }}>/100</div>
            <div style={{ fontSize: '18px', fontWeight: 700, color: sc(score), marginTop: '2px' }}>Grade: {grade}</div>
            {eb.urgency && <div style={{ fontSize: '11px', color: '#94a3b8', marginTop: '2px' }}>{eb.urgency}</div>}
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: '10px', marginBottom: '22px' }}>
          <ScoreBox label="Overall" val={score} />
          <ScoreBox label="LAM Agent" val={lamScore} />
          <ScoreBox label="ADA / WCAG" val={adaScore} />
          <ScoreBox label="SOC Readiness" val={socScore} />
        </div>

        {eb.one_line_verdict && (
          <div style={{ fontSize: '15px', fontStyle: 'italic', color: '#374151', lineHeight: 1.6, borderLeft: '4px solid #7c3aed', paddingLeft: '18px', marginBottom: '14px', background: '#faf5ff', padding: '14px 18px', borderRadius: '0 8px 8px 0' }}>
            "{eb.one_line_verdict}"
          </div>
        )}
        {eb.plain_english_summary && (
          <div style={{ fontSize: '13px', color: '#4b5563', lineHeight: 1.8, marginBottom: '14px' }}>{eb.plain_english_summary}</div>
        )}
        {eb.estimated_monthly_revenue_lost && (
          <div style={{ background: '#fef2f2', border: '1px solid #fca5a5', borderLeft: '4px solid #dc2626', borderRadius: '8px', padding: '12px 16px', marginBottom: '20px', fontSize: '13px', color: '#991b1b' }}>
            💰 <strong>Estimated Monthly Revenue Lost:</strong> {eb.estimated_monthly_revenue_lost}
          </div>
        )}

        {(eb.top_3_actions || []).length > 0 && (
          <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '18px' }}>
            <div style={{ fontSize: '10px', fontWeight: 700, color: '#6b7280', textTransform: 'uppercase' as const, letterSpacing: '0.08em', marginBottom: '12px' }}>TOP 3 IMMEDIATE ACTIONS</div>
            {(eb.top_3_actions || []).map((action: string, i: number) => (
              <div key={i} style={{ display: 'flex', gap: '12px', padding: '9px 0', borderBottom: '1px solid #f1f5f9', alignItems: 'flex-start' }}>
                <span style={{ fontSize: '11px', fontWeight: 800, color: i === 0 ? '#dc2626' : i === 1 ? '#d97706' : '#16a34a', whiteSpace: 'nowrap', marginTop: '2px', minWidth: '24px' }}>0{i+1}</span>
                <span style={{ fontSize: '12px', color: '#374151', lineHeight: 1.5 }}>{action}</span>
              </div>
            ))}
          </div>
        )}
        <PageFooter company={domain} url={scan.url} />
      </div>

      {/* PAGE 2 — VISIT NARRATIVE */}
      <div style={PAGE}>
        {hdr(2, 'Client Visit Narrative')}
        <div style={{ fontSize: '11px', fontWeight: 700, color: '#7c3aed', textTransform: 'uppercase' as const, letterSpacing: '0.08em', marginBottom: '16px' }}>🤖 WHAT THE AI AGENT EXPERIENCED</div>

        {ce.what_agent_experienced && (
          <div style={{ background: '#faf5ff', border: '1px solid #e9d5ff', borderRadius: '12px', padding: '20px', marginBottom: '20px' }}>
            <div style={{ fontSize: '13px', color: '#374151', lineHeight: 1.8 }}>{ce.what_agent_experienced}</div>
          </div>
        )}

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '20px' }}>
          <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '18px' }}>
            <div style={{ fontSize: '10px', fontWeight: 700, color: '#6b7280', textTransform: 'uppercase' as const, letterSpacing: '0.08em', marginBottom: '12px' }}>VISIT METRICS</div>
            {[
              ['Time to Understand Business', ce.time_to_understand_business],
              ['Time to Find Contact', ce.time_to_find_contact],
              ['Contact Form Experience', ce.contact_form_experience],
              ['Conversion Probability', ce.conversion_probability !== undefined ? `${ce.conversion_probability}%` : null],
              ['Would Real Client Convert?', ce.would_real_client_convert !== undefined ? (ce.would_real_client_convert ? '✓ Yes' : '✗ No') : null],
            ].map(([label, val]) => val ? (
              <div key={label as string} style={{ display: 'flex', justifyContent: 'space-between', padding: '7px 0', borderBottom: '1px solid #f1f5f9', fontSize: '12px' }}>
                <span style={{ color: '#6b7280' }}>{label as string}</span>
                <span style={{ fontWeight: 700, color: '#374151' }}>{val as string}</span>
              </div>
            ) : null)}
          </div>
          <div>
            {(ce.trust_signals_found || []).length > 0 && (
              <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: '10px', padding: '16px', marginBottom: '12px' }}>
                <div style={{ fontSize: '10px', fontWeight: 700, color: '#16a34a', textTransform: 'uppercase' as const, letterSpacing: '0.08em', marginBottom: '8px' }}>✓ TRUST SIGNALS FOUND</div>
                {(ce.trust_signals_found || []).map((s: string, i: number) => (
                  <div key={i} style={{ fontSize: '12px', color: '#374151', padding: '4px 0', borderBottom: '1px solid #dcfce7' }}>✓ {s}</div>
                ))}
              </div>
            )}
            {(ce.trust_signals_missing || []).length > 0 && (
              <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: '10px', padding: '16px' }}>
                <div style={{ fontSize: '10px', fontWeight: 700, color: '#dc2626', textTransform: 'uppercase' as const, letterSpacing: '0.08em', marginBottom: '8px' }}>✗ TRUST SIGNALS MISSING</div>
                {(ce.trust_signals_missing || []).map((s: string, i: number) => (
                  <div key={i} style={{ fontSize: '12px', color: '#374151', padding: '4px 0', borderBottom: '1px solid #fee2e2' }}>✗ {s}</div>
                ))}
              </div>
            )}
          </div>
        </div>

        {(ce.conversion_blockers || []).length > 0 && (
          <div style={{ marginBottom: '20px' }}>
            <div style={{ fontSize: '11px', fontWeight: 700, color: '#dc2626', textTransform: 'uppercase' as const, letterSpacing: '0.08em', marginBottom: '10px' }}>🚫 CONVERSION BLOCKERS</div>
            {(ce.conversion_blockers || []).map((b: string, i: number) => (
              <div key={i} style={{ background: '#fef2f2', border: '1px solid #fecaca', borderLeft: '3px solid #dc2626', borderRadius: '8px', padding: '10px 14px', marginBottom: '8px', fontSize: '12px', color: '#374151' }}>⚠ {b}</div>
            ))}
          </div>
        )}
        <PageFooter company={domain} url={scan.url} />
      </div>

      {/* PAGE 3 — ADA / WCAG */}
      <div style={PAGE}>
        {hdr(3, 'ADA & WCAG 2.1 Compliance')}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '24px', gap: '24px' }}>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: '11px', fontWeight: 700, color: '#dc2626', textTransform: 'uppercase' as const, letterSpacing: '0.08em', marginBottom: '8px' }}>ADA / WCAG 2.1 ACCESSIBILITY AUDIT</div>
            {ada.ada_narrative && <div style={{ fontSize: '13px', color: '#4b5563', lineHeight: 1.8 }}>{ada.ada_narrative}</div>}
          </div>
          <div style={{ textAlign: 'center', flexShrink: 0 }}>
            <ScoreBox label="ADA Score" val={adaScore} />
            {ada.risk_level && <div style={{ fontSize: '11px', fontWeight: 700, color: sc(adaScore), marginTop: '8px' }}>{ada.risk_level}</div>}
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: '12px', marginBottom: '20px' }}>
          {[
            ['WCAG Level', ada.wcag_level_achieved],
            ['Screen Reader', ada.screen_reader_compatible],
            ['Keyboard Nav', ada.keyboard_navigation],
            ['Color Contrast', ada.color_contrast_issues],
            ['Images w/o Alt', ada.images_missing_alt],
            ['Legal Exposure', ada.legal_exposure ? 'Risk identified' : 'Not assessed'],
          ].map(([label, val]) => (
            <div key={label as string} style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '14px' }}>
              <div style={{ fontSize: '10px', fontWeight: 700, color: '#6b7280', textTransform: 'uppercase' as const, marginBottom: '4px' }}>{label as string}</div>
              <div style={{ fontSize: '13px', fontWeight: 600, color: '#374151' }}>{val || '—'}</div>
            </div>
          ))}
        </div>

        {(ada.critical_violations || []).length > 0 && (
          <div style={{ marginBottom: '20px' }}>
            <div style={{ fontSize: '11px', fontWeight: 700, color: '#dc2626', textTransform: 'uppercase' as const, letterSpacing: '0.08em', marginBottom: '10px' }}>CRITICAL VIOLATIONS</div>
            {(ada.critical_violations || []).map((v: string, i: number) => (
              <div key={i} style={{ background: '#fef2f2', border: '1px solid #fecaca', borderLeft: '3px solid #dc2626', borderRadius: '8px', padding: '10px 14px', marginBottom: '8px', fontSize: '12px', color: '#374151' }}>⚠ {v}</div>
            ))}
          </div>
        )}

        {ada.legal_exposure && (
          <div style={{ background: '#fef2f2', border: '1px solid #fca5a5', borderRadius: '10px', padding: '16px', marginBottom: '16px' }}>
            <div style={{ fontSize: '10px', fontWeight: 700, color: '#dc2626', textTransform: 'uppercase' as const, marginBottom: '6px' }}>⚖ LEGAL EXPOSURE</div>
            <div style={{ fontSize: '13px', color: '#374151' }}>{ada.legal_exposure}</div>
          </div>
        )}

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
          {ada.remediation_cost && (
            <div style={{ background: '#fffbeb', border: '1px solid #fde68a', borderRadius: '10px', padding: '16px' }}>
              <div style={{ fontSize: '10px', fontWeight: 700, color: '#d97706', textTransform: 'uppercase' as const, marginBottom: '4px' }}>REMEDIATION COST</div>
              <div style={{ fontSize: '16px', fontWeight: 700, color: '#374151' }}>{ada.remediation_cost}</div>
            </div>
          )}
          {ada.remediation_time && (
            <div style={{ background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: '10px', padding: '16px' }}>
              <div style={{ fontSize: '10px', fontWeight: 700, color: '#2563eb', textTransform: 'uppercase' as const, marginBottom: '4px' }}>REMEDIATION TIME</div>
              <div style={{ fontSize: '16px', fontWeight: 700, color: '#374151' }}>{ada.remediation_time}</div>
            </div>
          )}
        </div>
        <PageFooter company={domain} url={scan.url} />
      </div>

      {/* PAGE 4 — SOC & SECURITY */}
      <div style={PAGE}>
        {hdr(4, 'SOC & Security Compliance')}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '24px', gap: '24px' }}>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: '11px', fontWeight: 700, color: '#7c3aed', textTransform: 'uppercase' as const, letterSpacing: '0.08em', marginBottom: '8px' }}>SOC / SECURITY AUDIT</div>
            {soc.soc_narrative && <div style={{ fontSize: '13px', color: '#4b5563', lineHeight: 1.8 }}>{soc.soc_narrative}</div>}
          </div>
          <div style={{ textAlign: 'center', flexShrink: 0 }}>
            <ScoreBox label="SOC Score" val={socScore} />
            {soc.legal_risk_level && <div style={{ fontSize: '11px', fontWeight: 700, color: sc(socScore), marginTop: '8px' }}>{soc.legal_risk_level}</div>}
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: '10px', marginBottom: '20px' }}>
          {[
            ['HTTPS Enforced', soc.https_enforced],
            ['Privacy Policy', soc.privacy_policy_adequate],
            ['Cookie Consent', soc.cookie_consent_compliant],
            ['GDPR Compliant', soc.gdpr_compliant],
            ['CCPA Compliant', soc.ccpa_compliant],
            ['India DPDP', soc.india_dpdp_compliant],
          ].map(([label, val]) => {
            const good = val === true || val === 'Yes' || val === 'Compliant'
            const bad = val === false || val === 'No' || val === 'Non-compliant'
            return (
              <div key={label as string} style={{ background: good ? '#f0fdf4' : bad ? '#fef2f2' : '#f8fafc', border: `1px solid ${good ? '#bbf7d0' : bad ? '#fecaca' : '#e2e8f0'}`, borderRadius: '10px', padding: '14px', textAlign: 'center' as const }}>
                <div style={{ fontSize: '18px', marginBottom: '4px' }}>{good ? '✓' : bad ? '✗' : '?'}</div>
                <div style={{ fontSize: '11px', fontWeight: 700, color: '#374151', marginBottom: '2px' }}>{label as string}</div>
                <div style={{ fontSize: '10px', color: good ? '#16a34a' : bad ? '#dc2626' : '#6b7280' }}>{String(val) || 'Not assessed'}</div>
              </div>
            )
          })}
        </div>

        {(soc.compliance_gaps || []).length > 0 && (
          <div style={{ marginBottom: '20px' }}>
            <div style={{ fontSize: '11px', fontWeight: 700, color: '#dc2626', textTransform: 'uppercase' as const, letterSpacing: '0.08em', marginBottom: '10px' }}>COMPLIANCE GAPS</div>
            {(soc.compliance_gaps || []).map((gap: string, i: number) => (
              <div key={i} style={{ background: '#fef2f2', border: '1px solid #fecaca', borderLeft: '3px solid #dc2626', borderRadius: '8px', padding: '10px 14px', marginBottom: '8px', fontSize: '12px', color: '#374151' }}>⚠ {gap}</div>
            ))}
          </div>
        )}

        {(soc.third_party_trackers_found || []).length > 0 && (
          <div>
            <div style={{ fontSize: '11px', fontWeight: 700, color: '#d97706', textTransform: 'uppercase' as const, letterSpacing: '0.08em', marginBottom: '10px' }}>THIRD-PARTY TRACKERS FOUND</div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
              {(soc.third_party_trackers_found || []).map((t: string, i: number) => (
                <span key={i} style={{ background: '#fffbeb', border: '1px solid #fde68a', borderRadius: '20px', padding: '4px 12px', fontSize: '11px', color: '#374151' }}>{t}</span>
              ))}
            </div>
          </div>
        )}
        <PageFooter company={domain} url={scan.url} />
      </div>

      {/* PAGE 5 — COMPETITIVE INTELLIGENCE */}
      <div style={PAGE}>
        {hdr(5, 'Competitive Intelligence')}
        {ci.market_position && (
          <div style={{ marginBottom: '20px' }}>
            <div style={{ fontSize: '11px', fontWeight: 700, color: '#4f46e5', textTransform: 'uppercase' as const, letterSpacing: '0.08em', marginBottom: '8px' }}>MARKET POSITION</div>
            <div style={{ fontSize: '13px', color: '#4b5563', lineHeight: 1.8, background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '16px' }}>{ci.market_position}</div>
          </div>
        )}

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '20px' }}>
          {ci.where_losing_clients_to_competitors && (
            <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: '10px', padding: '16px' }}>
              <div style={{ fontSize: '10px', fontWeight: 700, color: '#dc2626', textTransform: 'uppercase' as const, marginBottom: '8px' }}>WHERE LOSING CLIENTS</div>
              <div style={{ fontSize: '12px', color: '#4b5563', lineHeight: 1.7 }}>{ci.where_losing_clients_to_competitors}</div>
            </div>
          )}
          {ci.biggest_competitive_weakness && (
            <div style={{ background: '#fffbeb', border: '1px solid #fde68a', borderRadius: '10px', padding: '16px' }}>
              <div style={{ fontSize: '10px', fontWeight: 700, color: '#d97706', textTransform: 'uppercase' as const, marginBottom: '8px' }}>BIGGEST WEAKNESS</div>
              <div style={{ fontSize: '12px', color: '#4b5563', lineHeight: 1.7 }}>{ci.biggest_competitive_weakness}</div>
            </div>
          )}
        </div>

        {ci.opportunity_to_win && (
          <div style={{ background: '#f0fdf4', border: '1px solid #86efac', borderLeft: '4px solid #16a34a', borderRadius: '8px', padding: '16px', marginBottom: '20px' }}>
            <div style={{ fontSize: '10px', fontWeight: 700, color: '#16a34a', textTransform: 'uppercase' as const, marginBottom: '6px' }}>OPPORTUNITY TO WIN</div>
            <div style={{ fontSize: '12px', color: '#166534', lineHeight: 1.7 }}>{ci.opportunity_to_win}</div>
          </div>
        )}

        {(Array.isArray(st) ? st : Object.values(st)).length > 0 && (
          <div>
            <div style={{ fontSize: '11px', fontWeight: 700, color: '#2563eb', textTransform: 'uppercase' as const, letterSpacing: '0.08em', marginBottom: '10px' }}>STRENGTHS IDENTIFIED</div>
            {(Array.isArray(st) ? st : Object.values(st)).map((s: any, i: number) => (
              <div key={i} style={{ fontSize: '12px', color: '#374151', padding: '6px 0', borderBottom: '1px solid #f1f5f9' }}>✓ {typeof s === 'string' ? s : JSON.stringify(s)}</div>
            ))}
          </div>
        )}
        <PageFooter company={domain} url={scan.url} />
      </div>

      {/* PAGE 6 — 90-DAY ROADMAP */}
      <div style={PAGE}>
        {hdr(6, '90-Day Action Roadmap')}
        <div style={{ fontSize: '16px', fontWeight: 900, color: '#1e293b', textTransform: 'uppercase' as const, letterSpacing: '0.05em', marginBottom: '20px' }}>YOUR 90-DAY RECOVERY & GROWTH PLAN</div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: '14px', marginBottom: '20px' }}>
          {[
            [rm.week_1, 'Week 1', '#dc2626', '#fef2f2', '#fecaca'],
            [rm.month_1, 'Month 1', '#d97706', '#fffbeb', '#fde68a'],
            [rm.month_2_3, 'Month 2-3', '#16a34a', '#f0fdf4', '#bbf7d0'],
          ].map(([phase, label, color, bg, border]: any[]) => phase ? (
            <div key={label} style={{ background: bg, border: `1px solid ${border}`, borderTop: `4px solid ${color}`, borderRadius: '10px', padding: '16px' }}>
              <div style={{ fontSize: '12px', fontWeight: 800, color, marginBottom: '6px' }}>{label} — {phase.title}</div>
              {phase.estimated_cost && <div style={{ fontSize: '11px', color: '#6b7280', marginBottom: '4px' }}>Cost: {phase.estimated_cost}</div>}
              {phase.expected_score_improvement && <div style={{ fontSize: '11px', color, fontWeight: 700, marginBottom: '8px' }}>Target: +{phase.expected_score_improvement} points</div>}
              {(phase.actions || []).map((a: string, i: number) => (
                <div key={i} style={{ fontSize: '11px', color: '#374151', padding: '5px 0', borderBottom: `1px solid ${border}`, lineHeight: 1.5 }}>
                  <span style={{ color, fontWeight: 800, marginRight: '6px' }}>{i+1}.</span>{a}
                </div>
              ))}
            </div>
          ) : null)}
        </div>

        {rm.expected_outcome_90_days && (
          <div style={{ background: '#f0fdf4', border: '1px solid #86efac', borderLeft: '4px solid #16a34a', borderRadius: '8px', padding: '16px', marginBottom: '16px' }}>
            <div style={{ fontSize: '10px', fontWeight: 700, color: '#16a34a', textTransform: 'uppercase' as const, marginBottom: '6px' }}>EXPECTED IN 90 DAYS</div>
            <div style={{ fontSize: '12px', color: '#166534', lineHeight: 1.7 }}>{rm.expected_outcome_90_days}</div>
          </div>
        )}

        <div style={{ textAlign: 'center', padding: '20px', background: '#f8fafc', borderRadius: '10px', border: '1px solid #e2e8f0' }}>
          <div style={{ fontSize: '15px', fontWeight: 800, color: '#1e293b', marginBottom: '4px' }}>Ready to implement this roadmap?</div>
          <div style={{ fontSize: '12px', color: '#6b7280' }}>klaro.services/pulse · LAM monitoring from $499/month</div>
        </div>
        <PageFooter company={domain} url={scan.url} />
      </div>

      {/* PAGE 7 — METHODOLOGY */}
      <div style={PAGE}>
        {hdr(7, 'LAM Methodology')}
        <div style={{ fontSize: '11px', fontWeight: 700, color: '#7c3aed', textTransform: 'uppercase' as const, letterSpacing: '0.08em', marginBottom: '16px' }}>HOW THE LAM AGENT WORKS</div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '24px' }}>
          {[
            { icon: '🌐', title: 'Real Browser Visit', desc: 'The LAM agent uses a real Chromium browser (Playwright) to visit your site exactly as a human would — no API calls, no shortcuts.' },
            { icon: '👤', title: 'Client Persona', desc: 'The agent acts as a potential client in your target market, attempting to understand your offering, find contact information, and convert.' },
            { icon: '♿', title: 'ADA / WCAG Testing', desc: 'Automated accessibility checks against WCAG 2.1 AA standards. Tests keyboard navigation, screen reader compatibility, color contrast, and alt text.' },
            { icon: '🔒', title: 'SOC Surface Scan', desc: 'Checks HTTPS enforcement, cookie consent, privacy policy adequacy, GDPR/CCPA signals, and third-party tracker exposure.' },
            { icon: '🤖', title: 'AI Analysis', desc: 'Multiple LLM providers (Cerebras, Groq, SambaNova) analyse the raw experience data to produce actionable intelligence.' },
            { icon: '📊', title: 'Scoring Model', desc: 'Scores are calculated across four dimensions: overall experience, LAM agent journey, ADA compliance, and SOC readiness.' },
          ].map(({ icon, title, desc }) => (
            <div key={title} style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '18px' }}>
              <div style={{ fontSize: '24px', marginBottom: '8px' }}>{icon}</div>
              <div style={{ fontSize: '13px', fontWeight: 700, color: '#1e293b', marginBottom: '6px' }}>{title}</div>
              <div style={{ fontSize: '12px', color: '#6b7280', lineHeight: 1.6 }}>{desc}</div>
            </div>
          ))}
        </div>

        <div style={{ background: '#faf5ff', border: '1px solid #e9d5ff', borderRadius: '10px', padding: '16px' }}>
          <div style={{ fontSize: '11px', fontWeight: 700, color: '#7c3aed', textTransform: 'uppercase' as const, marginBottom: '8px' }}>IMPORTANT NOTES</div>
          <div style={{ fontSize: '12px', color: '#4b5563', lineHeight: 1.7 }}>
            This LAM audit is a surface-level assessment based on what is publicly visible to any website visitor. It does not access backend systems, databases, or authenticated areas unless specifically configured. SOC2 readiness scores reflect observable compliance signals only — formal SOC2 certification requires a licensed auditor. ADA scores reflect automated testing and may not capture all manual testing requirements under WCAG 2.1.
          </div>
        </div>
        <PageFooter company={domain} url={scan.url} />
      </div>

      {/* PAGE 8 — ABOUT */}
      <div style={{ ...PAGE, pageBreakAfter: 'avoid' as const }}>
        {hdr(8, 'About Klaro Pulse')}

        <div style={{ textAlign: 'center', marginBottom: '32px' }}>
          <img src="/klaro-logo.png" alt="Klaro" style={{ width: '64px', height: '64px', borderRadius: '14px', objectFit: 'cover' as const, marginBottom: '16px' }} />
          <div style={{ fontSize: '28px', fontWeight: 900, color: '#1e293b', marginBottom: '8px' }}>Klaro <span style={{ color: '#7c3aed' }}>Pulse</span></div>
          <div style={{ fontSize: '14px', color: '#6b7280', maxWidth: '500px', margin: '0 auto', lineHeight: 1.7 }}>
            The world's first Large Action Model (LAM) built specifically to audit business logic, UX, compliance and security for any public website — in minutes, not months.
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: '16px', marginBottom: '32px' }}>
          {[
            { title: 'Single Report', price: '$59.99', desc: 'Full 5-page LLM audit with PDF' },
            { title: 'LAM One-off', price: '$299', desc: 'Full 8-page LAM agent audit' },
            { title: 'LAM Monthly', price: '$499/mo', desc: 'Weekly monitoring + alerts' },
          ].map(({ title, price, desc }) => (
            <div key={title} style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '18px', textAlign: 'center' as const }}>
              <div style={{ fontSize: '13px', fontWeight: 700, color: '#374151', marginBottom: '4px' }}>{title}</div>
              <div style={{ fontSize: '24px', fontWeight: 900, color: '#7c3aed', marginBottom: '4px' }}>{price}</div>
              <div style={{ fontSize: '11px', color: '#6b7280' }}>{desc}</div>
            </div>
          ))}
        </div>

        <div style={{ background: 'linear-gradient(135deg, #faf5ff, #eff6ff)', border: '1px solid #e9d5ff', borderRadius: '14px', padding: '24px', textAlign: 'center' as const }}>
          <div style={{ fontSize: '16px', fontWeight: 800, color: '#1e293b', marginBottom: '8px' }}>CPA & Accounting Firm Partners</div>
          <div style={{ fontSize: '13px', color: '#6b7280', marginBottom: '16px', lineHeight: 1.6 }}>
            Earn 40% revenue share on every client scan. White-label reports under your firm name. We handle the tech.
          </div>
          <div style={{ fontSize: '13px', color: '#7c3aed', fontWeight: 600 }}>ops@klaro.services · klaro.services/pulse</div>
        </div>

        <PageFooter company={domain} url={scan.url} />
      </div>
    </>
  )
}
