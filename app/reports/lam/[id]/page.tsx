'use client'
import { useState, useEffect } from 'react'

const TOTAL = 14

function sc(s: number) { return s >= 75 ? '#16a34a' : s >= 50 ? '#d97706' : '#dc2626' }
function scBg(s: number) { return s >= 75 ? '#f0fdf4' : s >= 50 ? '#fffbeb' : '#fef2f2' }
function scBorder(s: number) { return s >= 75 ? '#bbf7d0' : s >= 50 ? '#fde68a' : '#fecaca' }

function ScoreBox({ label, val }: { label: string; val: number }) {
  return (
    <div style={{ background: scBg(val), border: `2px solid ${scBorder(val)}`, borderRadius: '10px', padding: '12px', textAlign: 'center' as const }}>
      <div style={{ fontSize: '26px', fontWeight: 900, color: sc(val), lineHeight: 1 }}>{val || '—'}</div>
      <div style={{ fontSize: '9px', color: '#6b7280', textTransform: 'uppercase' as const, letterSpacing: '0.07em', marginTop: '4px', fontWeight: 600 }}>{label}</div>
    </div>
  )
}

function RedFlag({ text }: { text: string }) {
  return <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderLeft: '3px solid #dc2626', borderRadius: '8px', padding: '10px 14px', marginBottom: '8px', fontSize: '12px', color: '#374151' }}>⚠ {text}</div>
}

function GreenWin({ text }: { text: string }) {
  return <div style={{ fontSize: '12px', color: '#374151', padding: '5px 0', borderBottom: '1px solid #dcfce7' }}>✓ {text}</div>
}

function InfoRow({ label, val }: { label: string; val: any }) {
  if (val === null || val === undefined || val === '') return null
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', padding: '7px 0', borderBottom: '1px solid #f1f5f9', fontSize: '12px' }}>
      <span style={{ color: '#6b7280' }}>{label}</span>
      <span style={{ fontWeight: 700, color: '#374151', textAlign: 'right' as const, maxWidth: '60%' }}>{String(val)}</span>
    </div>
  )
}

function PageFooter({ company, url, page }: { company: string; url: string; page: number }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '32px', paddingTop: '12px', borderTop: '1px solid #e2e8f0', fontSize: '10px', color: '#9ca3af' }}>
      <span>{company} | {url}</span>
      <span>Klaro Pulse LAM Intelligence · klaro.services/pulse · Page {page}/{TOTAL} · © 2026 Klaro Global</span>
    </div>
  )
}

function Screenshot({ url, label, caption }: { url?: string; label: string; caption?: string }) {
  if (!url) return (
    <div style={{ background: '#f1f5f9', border: '1px dashed #cbd5e1', borderRadius: '8px', height: '160px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#94a3b8', fontSize: '12px' }}>
      📷 {label} (screenshot not available)
    </div>
  )
  return (
    <div>
      <img src={url} alt={label} style={{ width: '100%', borderRadius: '8px', border: '1px solid #e2e8f0', objectFit: 'cover' as const, maxHeight: '200px' }} />
      {caption && <div style={{ fontSize: '10px', color: '#94a3b8', marginTop: '4px', textAlign: 'center' as const }}>{caption}</div>}
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
  const [error, setError] = useState('')

  useEffect(() => {
    fetch('/api/pulse/reports').then(r => r.json()).then(data => {
      const found = (data.lam || []).find((s: any) => s.id === params.id)
      if (found) setScan(found)
      else setError(`Report ${params.id} not found. ${data.lam?.length || 0} LAM reports available.`)
      setLoading(false)
    }).catch(e => { setError(e.message); setLoading(false) })
  }, [params.id])

  if (loading) return (
    <div style={{ minHeight: '100vh', background: '#f8fafc', display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: '16px' }}>
      <div style={{ width: '40px', height: '40px', border: '3px solid #e2e8f0', borderTop: '3px solid #6366f1', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
      <div style={{ color: '#6366f1', fontSize: '14px' }}>Loading LAM report...</div>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  )

  if (error || !scan) return (
    <div style={{ minHeight: '100vh', background: '#f8fafc', display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: '12px' }}>
      <div style={{ color: '#dc2626', fontSize: '16px', fontWeight: 700 }}>Report not found</div>
      <div style={{ color: '#6b7280', fontSize: '13px' }}>{error}</div>
      <a href="/dashboard" style={{ color: '#6366f1', fontSize: '13px' }}>← Back to Dashboard</a>
    </div>
  )

  const eb = scan.executive_brief || {}
  const ce = scan.client_experience || {}
  const mob = ce.functional_tests ? ce : (scan.raw_data?.mobile_experience || {})
  const mobile = scan.raw_data?.mobile_experience || ce
  const ada = scan.ada_report || {}
  const soc = scan.soc_report || {}
  const ci = scan.competitive_intel || {}
  const rm = scan.roadmap || {}
  const st = scan.strengths || []
  const raw = scan.raw_data || {}
  const perf = raw.performance_report || {}
  const content = raw.content_quality || {}
  const tech = raw.tech_stack || {}
  const multi = raw.multi_region || {}
  const shots = raw.screenshot_urls || {}
  const ft = ce.functional_tests || {}

  const score = scan.overall_score || 0
  const lamScore = scan.lam_score || 0
  const adaScore = scan.ada_score || 0
  const socScore = scan.soc_score || 0
  const convScore = scan.conversion_score || 0
  const perfScore = perf.performance_score || 0
  const contentScore = content.content_score || 0
  const mobileScore = mobile.mobile_score || 0
  const grade = scan.grade || '—'

  const domain = (() => { try { return new URL(scan.url).hostname } catch { return scan.url } })()
  const date = new Date(scan.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })
  const pagesCrawled = raw.pages_crawled || 0
  const countriesScanned = raw.countries_scanned || 1
  const elapsedSeconds = raw.elapsed_seconds || 0

  function downloadPDF() {
    const prev = document.title
    document.title = `Klaro Pulse LAM — ${domain} — ${date}`
    window.print()
    setTimeout(() => { document.title = prev }, 2000)
  }

  const hdr = (page: number, section: string) => (
    <div style={{ borderBottom: '2px solid #1e293b', paddingBottom: '10px', marginBottom: '24px', fontSize: '10px', color: '#6b7280', letterSpacing: '0.1em', textTransform: 'uppercase' as const }}>
      KLARO PULSE LAM AUDIT · {section.toUpperCase()} · PAGE {page} OF {TOTAL} · {date.toUpperCase()} · CONFIDENTIAL
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
        <div style={{ fontSize: '15px', fontWeight: 900, color: 'white', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <img src="/klaro-logo.png" alt="Klaro" style={{ width: '28px', height: '28px', borderRadius: '6px', objectFit: 'cover' as const }} />
          KLARO <span style={{ color: '#a78bfa' }}>PULSE</span>
          <span style={{ fontSize: '11px', color: '#475569', marginLeft: '8px', fontWeight: 400 }}>LAM AUDIT · {pagesCrawled} pages · {countriesScanned} region{countriesScanned > 1 ? 's' : ''}</span>
        </div>
        <div style={{ display: 'flex', gap: '10px' }}>
          <a href="/dashboard" style={{ fontSize: '12px', color: '#818cf8', textDecoration: 'none', border: '1px solid #3b4fd8', borderRadius: '8px', padding: '6px 14px' }}>← Dashboard</a>
          <button onClick={downloadPDF} style={{ fontSize: '12px', color: 'white', background: 'linear-gradient(135deg,#7c3aed,#a855f7)', border: 'none', borderRadius: '8px', padding: '6px 16px', cursor: 'pointer', fontWeight: 700, fontFamily: 'inherit' }}>⬇ Download PDF</button>
        </div>
      </div>

      {/* PAGE 1 — EXECUTIVE BRIEF */}
      <div style={PAGE}>
        {hdr(1, 'Executive Brief')}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '20px', gap: '24px' }}>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: '10px', fontWeight: 700, color: '#7c3aed', textTransform: 'uppercase' as const, letterSpacing: '0.1em', marginBottom: '6px' }}>🤖 LAM DEEP JOURNEY AUDIT · {pagesCrawled} PAGES · {Math.floor(elapsedSeconds/60)}m {elapsedSeconds%60}s</div>
            <div style={{ fontSize: '36px', fontWeight: 900, color: '#0f172a', marginBottom: '4px', lineHeight: 1.1 }}>{domain}</div>
            <a href={scan.url} style={{ fontSize: '12px', color: '#6366f1', textDecoration: 'none' }}>{scan.url}</a>
            {ci.industry && <div style={{ fontSize: '12px', color: '#64748b', marginTop: '4px' }}>Industry: {ci.industry}</div>}
            <div style={{ fontSize: '11px', color: '#94a3b8', marginTop: '2px' }}>Audit: {date}</div>
          </div>
          <div style={{ textAlign: 'center', flexShrink: 0 }}>
            <div style={{ fontSize: '72px', fontWeight: 900, color: sc(score), lineHeight: 1 }}>{score}</div>
            <div style={{ fontSize: '12px', color: '#94a3b8' }}>/100</div>
            <div style={{ fontSize: '18px', fontWeight: 700, color: sc(score), marginTop: '2px' }}>Grade: {grade}</div>
            {eb.urgency && <div style={{ fontSize: '11px', background: scBg(score), color: sc(score), border: `1px solid ${scBorder(score)}`, borderRadius: '20px', padding: '3px 12px', marginTop: '6px', fontWeight: 700 }}>{eb.urgency} Priority</div>}
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7,1fr)', gap: '6px', marginBottom: '18px' }}>
          <ScoreBox label="Overall" val={score} />
          <ScoreBox label="LAM Score" val={lamScore} />
          <ScoreBox label="ADA/WCAG" val={adaScore} />
          <ScoreBox label="SOC/Legal" val={socScore} />
          <ScoreBox label="Conversion" val={convScore} />
          <ScoreBox label="Performance" val={perfScore} />
          <ScoreBox label="Mobile" val={mobileScore} />
        </div>

        {eb.one_line_verdict && (
          <div style={{ fontSize: '14px', fontStyle: 'italic', color: '#374151', lineHeight: 1.6, borderLeft: '4px solid #7c3aed', background: '#faf5ff', padding: '14px 18px', borderRadius: '0 8px 8px 0', marginBottom: '14px' }}>
            "{eb.one_line_verdict}"
          </div>
        )}
        {eb.plain_english_summary && (
          <div style={{ fontSize: '13px', color: '#4b5563', lineHeight: 1.8, marginBottom: '12px' }}>{eb.plain_english_summary}</div>
        )}
        {eb.key_finding && (
          <div style={{ background: '#fffbeb', border: '1px solid #fde68a', borderLeft: '4px solid #d97706', borderRadius: '8px', padding: '12px 16px', marginBottom: '12px', fontSize: '13px', color: '#92400e' }}>
            🔍 <strong>Key Finding:</strong> {eb.key_finding}
          </div>
        )}
        {eb.estimated_revenue_at_risk && (
          <div style={{ background: '#fef2f2', border: '1px solid #fca5a5', borderLeft: '4px solid #dc2626', borderRadius: '8px', padding: '12px 16px', marginBottom: '12px', fontSize: '12px', color: '#991b1b' }}>
            ⚠ <strong>Revenue at Risk (estimate only — not a guarantee):</strong> {eb.estimated_revenue_at_risk}
          </div>
        )}
        {(eb.top_5_actions || eb.top_3_actions || []).length > 0 && (
          <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '16px' }}>
            <div style={{ fontSize: '10px', fontWeight: 700, color: '#6b7280', textTransform: 'uppercase' as const, letterSpacing: '0.08em', marginBottom: '10px' }}>TOP IMMEDIATE ACTIONS</div>
            {(eb.top_5_actions || eb.top_3_actions || []).map((action: string, i: number) => (
              <div key={i} style={{ display: 'flex', gap: '10px', padding: '7px 0', borderBottom: '1px solid #f1f5f9', alignItems: 'flex-start' }}>
                <span style={{ fontSize: '11px', fontWeight: 800, color: i < 2 ? '#dc2626' : i < 4 ? '#d97706' : '#16a34a', minWidth: '22px' }}>0{i+1}</span>
                <span style={{ fontSize: '12px', color: '#374151', lineHeight: 1.5 }}>{action}</span>
              </div>
            ))}
          </div>
        )}
        <PageFooter company={domain} url={scan.url} page={1} />
      </div>

      {/* PAGE 2 — FIRST PERSON VISIT NARRATIVE */}
      <div style={PAGE}>
        {hdr(2, 'My Visit — What I Experienced')}
        <div style={{ fontSize: '11px', fontWeight: 700, color: '#7c3aed', textTransform: 'uppercase' as const, letterSpacing: '0.08em', marginBottom: '16px' }}>🤖 FIRST-PERSON LAM AGENT REPORT — DESKTOP VISIT</div>

        {shots['main_desktop_home'] || shots['_desktop_home'] ? (
          <div style={{ marginBottom: '16px' }}>
            <Screenshot url={shots['main_desktop_home'] || shots['_desktop_home']} label="Desktop Homepage" caption="What I saw when I first arrived — desktop view" />
          </div>
        ) : null}

        {(ce.first_person_narrative || ce.what_agent_experienced) && (
          <div style={{ background: '#faf5ff', border: '1px solid #e9d5ff', borderRadius: '12px', padding: '20px', marginBottom: '20px' }}>
            <div style={{ fontSize: '10px', fontWeight: 700, color: '#7c3aed', textTransform: 'uppercase' as const, marginBottom: '10px' }}>MY EXPERIENCE AS YOUR POTENTIAL CLIENT</div>
            <div style={{ fontSize: '13px', color: '#374151', lineHeight: 1.9, fontStyle: 'italic' }}>{ce.first_person_narrative || ce.what_agent_experienced}</div>
          </div>
        )}

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
          <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '16px' }}>
            <div style={{ fontSize: '10px', fontWeight: 700, color: '#6b7280', textTransform: 'uppercase' as const, marginBottom: '10px' }}>MY VISIT METRICS</div>
            <InfoRow label="Time to understand business" val={ce.time_to_understand_business} />
            <InfoRow label="Time to find contact" val={ce.time_to_find_contact} />
            <InfoRow label="Contact form experience" val={ce.contact_form_experience} />
            <InfoRow label="Would I convert?" val={ce.would_real_client_convert !== undefined ? (ce.would_real_client_convert ? '✓ Yes' : '✗ No') : null} />
            <InfoRow label="My conversion probability" val={ce.conversion_probability !== undefined ? `${ce.conversion_probability}%` : null} />
            <InfoRow label="Navigation quality" val={ce.navigation_quality} />
            <InfoRow label="Live chat available" val={ce.chat_support_present !== undefined ? (ce.chat_support_present ? '✓ Yes' : '✗ No') : null} />
            <InfoRow label="Site search" val={ce.search_functionality !== undefined ? (ce.search_functionality ? '✓ Yes' : '✗ No') : null} />
          </div>
          <div style={{ display: 'flex', flexDirection: 'column' as const, gap: '12px' }}>
            {(ce.trust_signals_found || []).length > 0 && (
              <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: '10px', padding: '14px' }}>
                <div style={{ fontSize: '10px', fontWeight: 700, color: '#16a34a', textTransform: 'uppercase' as const, marginBottom: '8px' }}>✓ TRUST SIGNALS I FOUND</div>
                {(ce.trust_signals_found || []).map((s: string, i: number) => <GreenWin key={i} text={s} />)}
              </div>
            )}
            {(ce.trust_signals_missing || []).length > 0 && (
              <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: '10px', padding: '14px' }}>
                <div style={{ fontSize: '10px', fontWeight: 700, color: '#dc2626', textTransform: 'uppercase' as const, marginBottom: '8px' }}>✗ TRUST SIGNALS I EXPECTED BUT DIDN'T FIND</div>
                {(ce.trust_signals_missing || []).map((s: string, i: number) => (
                  <div key={i} style={{ fontSize: '12px', color: '#374151', padding: '4px 0', borderBottom: '1px solid #fee2e2' }}>✗ {s}</div>
                ))}
              </div>
            )}
          </div>
        </div>
        <PageFooter company={domain} url={scan.url} page={2} />
      </div>

      {/* PAGE 3 — MOBILE EXPERIENCE */}
      <div style={PAGE}>
        {hdr(3, 'Mobile Experience')}
        <div style={{ fontSize: '11px', fontWeight: 700, color: '#0891b2', textTransform: 'uppercase' as const, letterSpacing: '0.08em', marginBottom: '16px' }}>📱 WHAT I FOUND ON MOBILE — 375px iPhone Viewport</div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '20px' }}>
          <div>
            {shots['main_mobile_home'] || shots['_mobile_home'] ? (
              <Screenshot url={shots['main_mobile_home'] || shots['_mobile_home']} label="Mobile Homepage" caption="What I saw on mobile — 375px width" />
            ) : (
              <div style={{ background: '#f1f5f9', border: '1px dashed #cbd5e1', borderRadius: '8px', height: '300px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#94a3b8', fontSize: '12px', flexDirection: 'column' as const, gap: '8px' }}>
                <span style={{ fontSize: '32px' }}>📱</span>
                <span>Mobile screenshot</span>
              </div>
            )}
          </div>
          <div>
            <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '16px', marginBottom: '12px' }}>
              <div style={{ fontSize: '10px', fontWeight: 700, color: '#6b7280', textTransform: 'uppercase' as const, marginBottom: '10px' }}>MOBILE METRICS</div>
              <InfoRow label="Mobile load time" val={perf.mobile_load_ms ? `${perf.mobile_load_ms}ms` : raw.browser_data?.mobile_load_ms ? `${raw.browser_data.mobile_load_ms}ms` : 'N/A'} />
              <InfoRow label="Responsive design" val={mobile.responsive_design} />
              <InfoRow label="Mobile CTA visible" val={mobile.mobile_cta_visible !== undefined ? (mobile.mobile_cta_visible ? '✓ Yes' : '✗ No') : null} />
            </div>
            <ScoreBox label="Mobile Score" val={mobileScore || convScore} />
          </div>
        </div>

        {mobile.first_person_mobile && (
          <div style={{ background: '#f0f9ff', border: '1px solid #bae6fd', borderRadius: '12px', padding: '16px', marginBottom: '16px' }}>
            <div style={{ fontSize: '10px', fontWeight: 700, color: '#0369a1', textTransform: 'uppercase' as const, marginBottom: '8px' }}>MY MOBILE EXPERIENCE</div>
            <div style={{ fontSize: '13px', color: '#374151', lineHeight: 1.8, fontStyle: 'italic' }}>{mobile.first_person_mobile}</div>
          </div>
        )}

        {(perf.mobile_issues || raw.browser_data?.mobile_viewport_issues || []).length > 0 && (
          <div style={{ marginBottom: '16px' }}>
            <div style={{ fontSize: '11px', fontWeight: 700, color: '#d97706', textTransform: 'uppercase' as const, letterSpacing: '0.08em', marginBottom: '8px' }}>MOBILE ISSUES I DETECTED</div>
            {(perf.mobile_issues || raw.browser_data?.mobile_viewport_issues || []).map((issue: string, i: number) => (
              <div key={i} style={{ background: '#fffbeb', border: '1px solid #fde68a', borderLeft: '3px solid #d97706', borderRadius: '8px', padding: '9px 14px', marginBottom: '7px', fontSize: '12px', color: '#374151' }}>⚠ {issue}</div>
            ))}
          </div>
        )}

        {(mobile.mobile_recommendations || []).length > 0 && (
          <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '14px' }}>
            <div style={{ fontSize: '10px', fontWeight: 700, color: '#6b7280', textTransform: 'uppercase' as const, marginBottom: '8px' }}>MOBILE RECOMMENDATIONS</div>
            {(mobile.mobile_recommendations || []).map((r: string, i: number) => (
              <div key={i} style={{ fontSize: '12px', color: '#374151', padding: '5px 0', borderBottom: '1px solid #f1f5f9' }}>{i+1}. {r}</div>
            ))}
          </div>
        )}
        <PageFooter company={domain} url={scan.url} page={3} />
      </div>

      {/* PAGE 4 — CONVERSION JOURNEY */}
      <div style={PAGE}>
        {hdr(4, 'Conversion Journey')}
        <div style={{ fontSize: '11px', fontWeight: 700, color: '#dc2626', textTransform: 'uppercase' as const, letterSpacing: '0.08em', marginBottom: '16px' }}>🚫 WHERE I GOT STUCK TRYING TO BECOME YOUR CLIENT</div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '20px' }}>
          <div>
            <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '16px', marginBottom: '12px' }}>
              <div style={{ fontSize: '10px', fontWeight: 700, color: '#6b7280', textTransform: 'uppercase' as const, marginBottom: '8px' }}>CONVERSION SCORE</div>
              <ScoreBox label="Conversion" val={convScore} />
              <div style={{ marginTop: '12px', fontSize: '12px' }}>
                <InfoRow label="Would I convert?" val={ce.would_real_client_convert !== undefined ? (ce.would_real_client_convert ? '✓ Yes — I would' : '✗ No — I would not') : null} />
                <InfoRow label="My conversion probability" val={ce.conversion_probability !== undefined ? `${ce.conversion_probability}%` : null} />
              </div>
            </div>
          </div>
          <div>
            {(ce.conversion_blockers || []).length > 0 && (
              <div>
                <div style={{ fontSize: '10px', fontWeight: 700, color: '#dc2626', textTransform: 'uppercase' as const, marginBottom: '8px' }}>WHAT STOPPED ME FROM CONVERTING</div>
                {(ce.conversion_blockers || []).map((b: string, i: number) => <RedFlag key={i} text={b} />)}
              </div>
            )}
          </div>
        </div>

        {/* Functional tests */}
        {(ft.signup_flow || ft.login_flow || ft.contact_form || ft.cta_click) && (
          <div style={{ marginBottom: '16px' }}>
            <div style={{ fontSize: '11px', fontWeight: 700, color: '#374151', textTransform: 'uppercase' as const, letterSpacing: '0.08em', marginBottom: '12px' }}>🧪 WHAT HAPPENED WHEN I TESTED YOUR FLOWS</div>
            {[
              ['Signup Flow', ft.signup_flow, '📝'],
              ['Login Flow', ft.login_flow, '🔑'],
              ['Contact Form', ft.contact_form, '📬'],
              ['Main CTA Click', ft.cta_click, '👆'],
              ['Search', ft.search, '🔍'],
            ].filter(([, val]) => val && val !== 'N/A').map(([label, val, icon]) => (
              <div key={label as string} style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderLeft: '3px solid #6366f1', borderRadius: '8px', padding: '10px 14px', marginBottom: '8px', fontSize: '12px', color: '#374151' }}>
                <span style={{ marginRight: '8px' }}>{icon as string}</span>
                <strong>{label as string}:</strong> {val as string}
              </div>
            ))}
          </div>
        )}

        <div style={{ background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: '10px', padding: '16px' }}>
          <div style={{ fontSize: '10px', fontWeight: 700, color: '#2563eb', textTransform: 'uppercase' as const, marginBottom: '8px' }}>💡 HOW TO WIN ME AS A CLIENT</div>
          {(eb.top_5_actions || eb.top_3_actions || []).slice(0, 3).map((action: string, i: number) => (
            <div key={i} style={{ fontSize: '12px', color: '#374151', padding: '5px 0', borderBottom: '1px solid #dbeafe' }}>{i+1}. {action}</div>
          ))}
        </div>
        <PageFooter company={domain} url={scan.url} page={4} />
      </div>

      {/* PAGE 5 — PERFORMANCE */}
      <div style={PAGE}>
        {hdr(5, 'Performance & Speed')}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '20px', gap: '20px' }}>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: '11px', fontWeight: 700, color: '#2563eb', textTransform: 'uppercase' as const, letterSpacing: '0.08em', marginBottom: '8px' }}>⚡ PERFORMANCE AUDIT</div>
            {perf.performance_narrative && <div style={{ fontSize: '13px', color: '#4b5563', lineHeight: 1.8, fontStyle: 'italic' }}>{perf.performance_narrative}</div>}
          </div>
          <div>
            <ScoreBox label="Performance" val={perfScore} />
            {perf.performance_grade && <div style={{ fontSize: '13px', fontWeight: 700, color: sc(perfScore), marginTop: '8px', textAlign: 'center' as const }}>Grade: {perf.performance_grade}</div>}
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: '10px', marginBottom: '20px' }}>
          {[
            ['Desktop Load', perf.desktop_load_ms ? `${perf.desktop_load_ms}ms` : `${scan.raw_data?.browser_data?.load_time_ms || 0}ms`],
            ['Mobile Load', perf.mobile_load_ms ? `${perf.mobile_load_ms}ms` : 'N/A'],
            ['Core Web Vitals', perf.core_web_vitals_estimate || 'Not measured'],
            ['Pages Crawled', pagesCrawled],
            ['Regions Scanned', countriesScanned],
            ['Resource Bloat', perf.resource_bloat || 'Unknown'],
          ].map(([label, val]) => (
            <div key={label as string} style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '14px' }}>
              <div style={{ fontSize: '10px', fontWeight: 700, color: '#6b7280', textTransform: 'uppercase' as const, marginBottom: '4px' }}>{label as string}</div>
              <div style={{ fontSize: '14px', fontWeight: 700, color: '#374151' }}>{val as string}</div>
            </div>
          ))}
        </div>

        {(perf.recommendations || []).length > 0 && (
          <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '16px' }}>
            <div style={{ fontSize: '10px', fontWeight: 700, color: '#6b7280', textTransform: 'uppercase' as const, marginBottom: '10px' }}>PERFORMANCE RECOMMENDATIONS</div>
            {(perf.recommendations || []).map((r: string, i: number) => (
              <div key={i} style={{ display: 'flex', gap: '10px', padding: '7px 0', borderBottom: '1px solid #f1f5f9', fontSize: '12px', color: '#374151' }}>
                <span style={{ color: '#2563eb', fontWeight: 800, minWidth: '18px' }}>{i+1}.</span>{r}
              </div>
            ))}
          </div>
        )}
        <PageFooter company={domain} url={scan.url} page={5} />
      </div>

      {/* PAGE 6 — CONTENT QUALITY */}
      <div style={PAGE}>
        {hdr(6, 'Content Quality & SEO')}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '20px', gap: '20px' }}>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: '11px', fontWeight: 700, color: '#0891b2', textTransform: 'uppercase' as const, letterSpacing: '0.08em', marginBottom: '8px' }}>📝 CONTENT & SEO AUDIT</div>
            {content.content_narrative && <div style={{ fontSize: '13px', color: '#4b5563', lineHeight: 1.8, fontStyle: 'italic' }}>{content.content_narrative}</div>}
          </div>
          <ScoreBox label="Content" val={contentScore} />
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: '10px', marginBottom: '16px' }}>
          {[
            ['Value Proposition', content.value_proposition_clarity],
            ['Social Proof', content.social_proof_strength],
            ['Tone', content.tone_assessment],
            ['Meta Description', content.meta_description_quality],
            ['Structured Data', content.structured_data_present ? '✓ Present' : '✗ Missing'],
            ['SEO Signals', content.seo_signals?.substring(0, 25) + '...' || '—'],
          ].map(([label, val]) => (
            <div key={label as string} style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '12px' }}>
              <div style={{ fontSize: '10px', fontWeight: 700, color: '#6b7280', textTransform: 'uppercase' as const, marginBottom: '4px' }}>{label as string}</div>
              <div style={{ fontSize: '12px', fontWeight: 700, color: '#374151' }}>{val as string || '—'}</div>
            </div>
          ))}
        </div>

        {content.seo_signals && (
          <div style={{ background: '#f0f9ff', border: '1px solid #bae6fd', borderRadius: '10px', padding: '14px', marginBottom: '14px' }}>
            <div style={{ fontSize: '10px', fontWeight: 700, color: '#0369a1', textTransform: 'uppercase' as const, marginBottom: '6px' }}>SEO DETAIL</div>
            <div style={{ fontSize: '12px', color: '#374151', lineHeight: 1.7 }}>{content.seo_signals}</div>
          </div>
        )}

        {(content.content_gaps || []).length > 0 && (
          <div>
            <div style={{ fontSize: '11px', fontWeight: 700, color: '#dc2626', textTransform: 'uppercase' as const, letterSpacing: '0.08em', marginBottom: '8px' }}>CONTENT GAPS</div>
            {(content.content_gaps || []).map((gap: string, i: number) => <RedFlag key={i} text={gap} />)}
          </div>
        )}
        <PageFooter company={domain} url={scan.url} page={6} />
      </div>

      {/* PAGE 7 — ADA */}
      <div style={PAGE}>
        {hdr(7, 'ADA & WCAG 2.1 Compliance')}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '20px', gap: '20px' }}>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: '11px', fontWeight: 700, color: '#dc2626', textTransform: 'uppercase' as const, letterSpacing: '0.08em', marginBottom: '8px' }}>♿ ADA / WCAG 2.1 ACCESSIBILITY AUDIT</div>
            {ada.ada_narrative && <div style={{ fontSize: '13px', color: '#4b5563', lineHeight: 1.8, fontStyle: 'italic' }}>{ada.ada_narrative}</div>}
          </div>
          <div>
            <ScoreBox label="ADA Score" val={adaScore} />
            {ada.risk_level && <div style={{ fontSize: '12px', fontWeight: 700, color: sc(adaScore), marginTop: '8px', textAlign: 'center' as const }}>{ada.risk_level}</div>}
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: '10px', marginBottom: '16px' }}>
          {[
            ['WCAG Level', ada.wcag_level_achieved],
            ['Screen Reader', ada.screen_reader_compatible],
            ['Keyboard Nav', ada.keyboard_navigation],
            ['Color Contrast', ada.color_contrast_issues],
            ['Images w/o Alt', ada.images_missing_alt],
            ['Inputs w/o Label', ada.inputs_missing_labels],
            ['Skip Navigation', ada.skip_navigation ? '✓ Present' : '✗ Missing'],
            ['Lang Attribute', ada.lang_attribute],
            ['ARIA Landmarks', ada.aria_landmarks],
          ].map(([label, val]) => (
            <div key={label as string} style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '12px' }}>
              <div style={{ fontSize: '10px', fontWeight: 700, color: '#6b7280', textTransform: 'uppercase' as const, marginBottom: '4px' }}>{label as string}</div>
              <div style={{ fontSize: '12px', fontWeight: 600, color: '#374151' }}>{val as string || '—'}</div>
            </div>
          ))}
        </div>

        {(ada.critical_violations || []).length > 0 && (
          <div style={{ marginBottom: '14px' }}>
            <div style={{ fontSize: '11px', fontWeight: 700, color: '#dc2626', textTransform: 'uppercase' as const, letterSpacing: '0.08em', marginBottom: '8px' }}>CRITICAL VIOLATIONS</div>
            {(ada.critical_violations || []).map((v: string, i: number) => <RedFlag key={i} text={v} />)}
          </div>
        )}

        {ada.legal_exposure && (
          <div style={{ background: '#fef2f2', border: '1px solid #fca5a5', borderRadius: '10px', padding: '14px', marginBottom: '12px' }}>
            <div style={{ fontSize: '10px', fontWeight: 700, color: '#dc2626', textTransform: 'uppercase' as const, marginBottom: '6px' }}>⚖ LEGAL EXPOSURE</div>
            <div style={{ fontSize: '13px', color: '#374151' }}>{ada.legal_exposure}</div>
          </div>
        )}

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
          {ada.remediation_cost && (
            <div style={{ background: '#fffbeb', border: '1px solid #fde68a', borderRadius: '10px', padding: '14px' }}>
              <div style={{ fontSize: '10px', fontWeight: 700, color: '#d97706', textTransform: 'uppercase' as const, marginBottom: '4px' }}>REMEDIATION COST</div>
              <div style={{ fontSize: '18px', fontWeight: 700, color: '#374151' }}>{ada.remediation_cost}</div>
            </div>
          )}
          {ada.remediation_time && (
            <div style={{ background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: '10px', padding: '14px' }}>
              <div style={{ fontSize: '10px', fontWeight: 700, color: '#2563eb', textTransform: 'uppercase' as const, marginBottom: '4px' }}>REMEDIATION TIME</div>
              <div style={{ fontSize: '18px', fontWeight: 700, color: '#374151' }}>{ada.remediation_time}</div>
            </div>
          )}
        </div>
        <PageFooter company={domain} url={scan.url} page={7} />
      </div>

      {/* PAGE 8 — SOC */}
      <div style={PAGE}>
        {hdr(8, 'SOC & Compliance')}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '20px', gap: '20px' }}>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: '11px', fontWeight: 700, color: '#7c3aed', textTransform: 'uppercase' as const, letterSpacing: '0.08em', marginBottom: '8px' }}>🔒 SOC & COMPLIANCE AUDIT</div>
            {soc.soc_narrative && <div style={{ fontSize: '13px', color: '#4b5563', lineHeight: 1.8, fontStyle: 'italic' }}>{soc.soc_narrative}</div>}
          </div>
          <div>
            <ScoreBox label="SOC Score" val={socScore} />
            {soc.legal_risk_level && <div style={{ fontSize: '12px', fontWeight: 700, color: sc(socScore), marginTop: '8px', textAlign: 'center' as const }}>{soc.legal_risk_level} Risk</div>}
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: '8px', marginBottom: '16px' }}>
          {[
            ['HTTPS', soc.https_enforced],
            ['Privacy Policy', soc.privacy_policy_adequate],
            ['Cookie Consent', soc.cookie_consent_compliant],
            ['GDPR', soc.gdpr_compliant],
            ['CCPA', soc.ccpa_compliant],
            ['India DPDP', soc.india_dpdp_compliant],
            ['PIPEDA', soc.pipeda_compliant],
          ].map(([label, val]) => {
            const good = val === true || val === 'Yes' || val === 'Compliant'
            const bad = val === false || val === 'No' || val === 'Non-compliant'
            return (
              <div key={label as string} style={{ background: good ? '#f0fdf4' : bad ? '#fef2f2' : '#f8fafc', border: `1px solid ${good ? '#bbf7d0' : bad ? '#fecaca' : '#e2e8f0'}`, borderRadius: '10px', padding: '12px', textAlign: 'center' as const }}>
                <div style={{ fontSize: '16px', marginBottom: '4px' }}>{good ? '✓' : bad ? '✗' : '?'}</div>
                <div style={{ fontSize: '10px', fontWeight: 700, color: '#374151', marginBottom: '2px' }}>{label as string}</div>
                <div style={{ fontSize: '9px', color: good ? '#16a34a' : bad ? '#dc2626' : '#6b7280' }}>{String(val) || '—'}</div>
              </div>
            )
          })}
        </div>

        {(soc.compliance_gaps || []).length > 0 && (
          <div style={{ marginBottom: '14px' }}>
            <div style={{ fontSize: '11px', fontWeight: 700, color: '#dc2626', textTransform: 'uppercase' as const, letterSpacing: '0.08em', marginBottom: '8px' }}>COMPLIANCE GAPS</div>
            {(soc.compliance_gaps || []).map((gap: string, i: number) => <RedFlag key={i} text={gap} />)}
          </div>
        )}

        {(soc.third_party_trackers_found || []).length > 0 && (
          <div style={{ marginBottom: '12px' }}>
            <div style={{ fontSize: '11px', fontWeight: 700, color: '#d97706', textTransform: 'uppercase' as const, letterSpacing: '0.08em', marginBottom: '8px' }}>THIRD-PARTY TRACKERS I DETECTED</div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
              {(soc.third_party_trackers_found || []).map((t: string, i: number) => (
                <span key={i} style={{ background: '#fffbeb', border: '1px solid #fde68a', borderRadius: '20px', padding: '3px 10px', fontSize: '11px', color: '#374151' }}>{t}</span>
              ))}
            </div>
          </div>
        )}
        <PageFooter company={domain} url={scan.url} page={8} />
      </div>

      {/* PAGE 9 — TECH STACK */}
      <div style={PAGE}>
        {hdr(9, 'Technology Stack')}
        <div style={{ fontSize: '11px', fontWeight: 700, color: '#0f766e', textTransform: 'uppercase' as const, letterSpacing: '0.08em', marginBottom: '16px' }}>🔧 WHAT I DETECTED UNDER THE HOOD</div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
          <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '16px' }}>
            <div style={{ fontSize: '10px', fontWeight: 700, color: '#6b7280', textTransform: 'uppercase' as const, marginBottom: '10px' }}>DETECTED STACK</div>
            <InfoRow label="CMS / Platform" val={tech.cms_platform} />
            <InfoRow label="Tech Debt" val={tech.tech_debt_assessment} />
            <InfoRow label="Third-Party Risk" val={tech.third_party_risk} />
          </div>
          <div style={{ display: 'flex', flexDirection: 'column' as const, gap: '10px' }}>
            {(tech.analytics_tools || []).length > 0 && (
              <div style={{ background: '#f0f9ff', border: '1px solid #bae6fd', borderRadius: '10px', padding: '12px' }}>
                <div style={{ fontSize: '10px', fontWeight: 700, color: '#0369a1', textTransform: 'uppercase' as const, marginBottom: '6px' }}>ANALYTICS</div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>{(tech.analytics_tools || []).map((t: string, i: number) => <span key={i} style={{ background: '#e0f2fe', borderRadius: '20px', padding: '2px 8px', fontSize: '11px', color: '#0369a1' }}>{t}</span>)}</div>
              </div>
            )}
            {(tech.marketing_tools || []).length > 0 && (
              <div style={{ background: '#faf5ff', border: '1px solid #e9d5ff', borderRadius: '10px', padding: '12px' }}>
                <div style={{ fontSize: '10px', fontWeight: 700, color: '#7c3aed', textTransform: 'uppercase' as const, marginBottom: '6px' }}>MARKETING</div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>{(tech.marketing_tools || []).map((t: string, i: number) => <span key={i} style={{ background: '#ede9fe', borderRadius: '20px', padding: '2px 8px', fontSize: '11px', color: '#7c3aed' }}>{t}</span>)}</div>
              </div>
            )}
          </div>
        </div>

        {(tech.detected_technologies || []).length > 0 && (
          <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '16px', marginBottom: '16px' }}>
            <div style={{ fontSize: '10px', fontWeight: 700, color: '#6b7280', textTransform: 'uppercase' as const, marginBottom: '10px' }}>ALL DETECTED TECHNOLOGIES</div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
              {(tech.detected_technologies || []).map((t: string, i: number) => <span key={i} style={{ background: '#f1f5f9', border: '1px solid #e2e8f0', borderRadius: '20px', padding: '3px 10px', fontSize: '11px', color: '#374151' }}>{t}</span>)}
            </div>
          </div>
        )}

        {multi.has_country_selector && (
          <div style={{ background: '#eff6ff', border: '1px solid #bfdbfe', borderLeft: '4px solid #2563eb', borderRadius: '8px', padding: '16px' }}>
            <div style={{ fontSize: '11px', fontWeight: 700, color: '#1d4ed8', textTransform: 'uppercase' as const, marginBottom: '10px' }}>🌍 MULTI-REGION — {multi.regions_scanned} regions I scanned</div>
            <InfoRow label="Region Consistency" val={multi.region_consistency} />
            <InfoRow label="Localisation Quality" val={multi.localisation_quality} />
            <InfoRow label="Compliance Variance" val={multi.compliance_variance} />
            {(multi.region_specific_issues || []).length > 0 && (
              <div style={{ marginTop: '10px' }}>
                {(multi.region_specific_issues || []).map((issue: string, i: number) => <RedFlag key={i} text={issue} />)}
              </div>
            )}
          </div>
        )}
        <PageFooter company={domain} url={scan.url} page={9} />
      </div>

      {/* PAGE 10 — COMPETITIVE INTELLIGENCE */}
      <div style={PAGE}>
        {hdr(10, 'Competitive Intelligence')}
        {ci.market_position && (
          <div style={{ marginBottom: '16px' }}>
            <div style={{ fontSize: '11px', fontWeight: 700, color: '#4f46e5', textTransform: 'uppercase' as const, letterSpacing: '0.08em', marginBottom: '8px' }}>MARKET POSITION</div>
            <div style={{ fontSize: '13px', color: '#4b5563', lineHeight: 1.8, background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '14px' }}>{ci.market_position}</div>
          </div>
        )}

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px', marginBottom: '16px' }}>
          {ci.where_losing_clients_to_competitors && (
            <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: '10px', padding: '14px' }}>
              <div style={{ fontSize: '10px', fontWeight: 700, color: '#dc2626', textTransform: 'uppercase' as const, marginBottom: '8px' }}>WHERE YOU'RE LOSING CLIENTS</div>
              <div style={{ fontSize: '12px', color: '#4b5563', lineHeight: 1.7 }}>{ci.where_losing_clients_to_competitors}</div>
            </div>
          )}
          {ci.biggest_competitive_weakness && (
            <div style={{ background: '#fffbeb', border: '1px solid #fde68a', borderRadius: '10px', padding: '14px' }}>
              <div style={{ fontSize: '10px', fontWeight: 700, color: '#d97706', textTransform: 'uppercase' as const, marginBottom: '8px' }}>BIGGEST WEAKNESS</div>
              <div style={{ fontSize: '12px', color: '#4b5563', lineHeight: 1.7 }}>{ci.biggest_competitive_weakness}</div>
            </div>
          )}
        </div>

        {ci.opportunity_to_win && (
          <div style={{ background: '#f0fdf4', border: '1px solid #86efac', borderLeft: '4px solid #16a34a', borderRadius: '8px', padding: '14px', marginBottom: '14px' }}>
            <div style={{ fontSize: '10px', fontWeight: 700, color: '#16a34a', textTransform: 'uppercase' as const, marginBottom: '6px' }}>OPPORTUNITY TO WIN</div>
            <div style={{ fontSize: '12px', color: '#166534', lineHeight: 1.7 }}>{ci.opportunity_to_win}</div>
          </div>
        )}

        {(Array.isArray(st) ? st : []).length > 0 && (
          <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: '10px', padding: '14px' }}>
            <div style={{ fontSize: '11px', fontWeight: 700, color: '#16a34a', textTransform: 'uppercase' as const, letterSpacing: '0.08em', marginBottom: '10px' }}>STRENGTHS I IDENTIFIED</div>
            {(Array.isArray(st) ? st : []).map((s: any, i: number) => <GreenWin key={i} text={typeof s === 'string' ? s : JSON.stringify(s)} />)}
          </div>
        )}
        <PageFooter company={domain} url={scan.url} page={10} />
      </div>

      {/* PAGE 11 — FUNCTIONAL TESTING EVIDENCE */}
      <div style={PAGE}>
        {hdr(11, 'Functional Testing Evidence')}
        <div style={{ fontSize: '11px', fontWeight: 700, color: '#7c3aed', textTransform: 'uppercase' as const, letterSpacing: '0.08em', marginBottom: '16px' }}>
          🧪 WHAT I TESTED — BEHAVIORAL PROOF FOR AUDITORS
        </div>

        <div style={{ background: '#faf5ff', border: '1px solid #e9d5ff', borderRadius: '12px', padding: '16px', marginBottom: '20px' }}>
          <div style={{ fontSize: '12px', color: '#374151', lineHeight: 1.8 }}>
            The LAM agent interacted with your site as a real user would — clicking CTAs, attempting signups, filling forms, testing navigation flows, and verifying that key user journeys work end-to-end. This section provides behavioral evidence that your controls are (or aren't) working in production.
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '16px' }}>
          {[
            { label: 'Signup Flow', val: ft.signup_flow, icon: '📝', criterion: 'CC6.1' },
            { label: 'Login / Auth Flow', val: ft.login_flow, icon: '🔑', criterion: 'CC6.1' },
            { label: 'Contact Form', val: ft.contact_form, icon: '📬', criterion: 'CC2.2' },
            { label: 'Primary CTA', val: ft.cta_click, icon: '👆', criterion: 'Conversion' },
            { label: 'Search Functionality', val: ft.search, icon: '🔍', criterion: 'PI1' },
            { label: 'Navigation Flow', val: ce.navigation_quality, icon: '🧭', criterion: 'UX' },
          ].map(({ label, val, icon, criterion }) => (
            <div key={label} style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderLeft: `3px solid ${val && val !== 'N/A' ? '#7c3aed' : '#e2e8f0'}`, borderRadius: '8px', padding: '12px 14px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                <div style={{ fontSize: '12px', fontWeight: 700, color: '#1e293b' }}>{icon} {label}</div>
                <span style={{ fontSize: '9px', color: '#7c3aed', background: '#faf5ff', border: '1px solid #e9d5ff', borderRadius: '20px', padding: '2px 6px' }}>{criterion}</span>
              </div>
              <div style={{ fontSize: '12px', color: val && val !== 'N/A' ? '#374151' : '#9ca3af', lineHeight: 1.6 }}>
                {val && val !== 'N/A' ? val : 'Not tested / Not applicable'}
              </div>
            </div>
          ))}
        </div>

        <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: '10px', padding: '14px' }}>
          <div style={{ fontSize: '10px', fontWeight: 700, color: '#16a34a', textTransform: 'uppercase' as const, marginBottom: '8px' }}>📋 AUDITOR NOTE</div>
          <div style={{ fontSize: '12px', color: '#374151', lineHeight: 1.7 }}>
            This functional testing evidence was collected by the Klaro LAM agent on {date} at {new Date(scan.created_at).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })} UTC. The agent visited {pagesCrawled} pages across {countriesScanned} region{countriesScanned > 1 ? 's' : ''}. Screenshots of the desktop and mobile experience are included in this report as behavioral proof. This evidence can be provided to SOC 2 auditors as documentation that public-facing controls were tested in production.
          </div>
        </div>
        <PageFooter company={domain} url={scan.url} page={11} />
      </div>

      {/* PAGE 12 — 90-DAY ROADMAP */}
      <div style={PAGE}>
        {hdr(12, '90-Day Action Roadmap')}
        <div style={{ fontSize: '16px', fontWeight: 900, color: '#1e293b', textTransform: 'uppercase' as const, letterSpacing: '0.05em', marginBottom: '20px' }}>YOUR 90-DAY RECOVERY & GROWTH PLAN</div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: '12px', marginBottom: '16px' }}>
          {[
            [rm.week_1, 'Week 1 — Critical Fixes', '#dc2626', '#fef2f2', '#fecaca'],
            [rm.month_1, 'Month 1 — Foundation', '#d97706', '#fffbeb', '#fde68a'],
            [rm.month_2_3, 'Month 2–3 — Growth', '#16a34a', '#f0fdf4', '#bbf7d0'],
          ].map(([phase, label, color, bg, border]: any[]) => phase ? (
            <div key={label} style={{ background: bg, border: `1px solid ${border}`, borderTop: `4px solid ${color}`, borderRadius: '10px', padding: '14px' }}>
              <div style={{ fontSize: '11px', fontWeight: 800, color, marginBottom: '6px' }}>{label}{phase.title ? ` — ${phase.title}` : ''}</div>
              {phase.estimated_cost && <div style={{ fontSize: '10px', color: '#6b7280', marginBottom: '3px' }}>Cost: {phase.estimated_cost}</div>}
              {phase.expected_score_improvement && <div style={{ fontSize: '10px', color, fontWeight: 700, marginBottom: '8px' }}>Target: +{phase.expected_score_improvement} pts</div>}
              {(phase.actions || []).map((a: string, i: number) => (
                <div key={i} style={{ fontSize: '11px', color: '#374151', padding: '5px 0', borderBottom: `1px solid ${border}`, lineHeight: 1.5 }}>
                  <span style={{ color, fontWeight: 800, marginRight: '6px' }}>{i+1}.</span>{a}
                </div>
              ))}
            </div>
          ) : null)}
        </div>

        {rm.expected_outcome_90_days && (
          <div style={{ background: '#f0fdf4', border: '1px solid #86efac', borderLeft: '4px solid #16a34a', borderRadius: '8px', padding: '14px', marginBottom: '12px' }}>
            <div style={{ fontSize: '10px', fontWeight: 700, color: '#16a34a', textTransform: 'uppercase' as const, marginBottom: '6px' }}>EXPECTED IN 90 DAYS</div>
            <div style={{ fontSize: '12px', color: '#166534', lineHeight: 1.7 }}>{rm.expected_outcome_90_days}</div>
          </div>
        )}

        <div style={{ background: '#faf5ff', border: '1px solid #e9d5ff', borderRadius: '10px', padding: '14px', marginBottom: '12px' }}>
          <div style={{ fontSize: '10px', fontWeight: 700, color: '#7c3aed', textTransform: 'uppercase' as const, marginBottom: '6px' }}>⚠ DISCLAIMER</div>
          <div style={{ fontSize: '11px', color: '#6b7280', lineHeight: 1.7 }}>
            Revenue at risk figures in this report are estimates based solely on observed UX friction and compliance gaps. They are not revenue guarantees, predictions, or financial advice. Klaro Global accepts no liability for business decisions made based on these estimates. Actual business impact depends on many factors outside the scope of this audit.
          </div>
        </div>

        <div style={{ textAlign: 'center', padding: '16px', background: '#f8fafc', borderRadius: '10px', border: '1px solid #e2e8f0' }}>
          <div style={{ fontSize: '14px', fontWeight: 800, color: '#1e293b', marginBottom: '4px' }}>Ready to implement this roadmap?</div>
          <div style={{ fontSize: '12px', color: '#6b7280' }}>klaro.services/pulse · LAM monitoring from $499/month · ops@klaro.services</div>
        </div>
        <PageFooter company={domain} url={scan.url} page={12} />
      </div>

      {/* PAGE 13 — METHODOLOGY */}
      <div style={PAGE}>
        {hdr(13, 'LAM Methodology')}
        <div style={{ fontSize: '11px', fontWeight: 700, color: '#7c3aed', textTransform: 'uppercase' as const, letterSpacing: '0.08em', marginBottom: '16px' }}>HOW THE LAM AGENT WORKS — MYSTERY SHOPPER FOR YOUR WEBSITE</div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '20px' }}>
          {[
            { icon: '🌐', title: 'Real Browser Visit', desc: `I used a real Chromium browser (Playwright) visiting ${pagesCrawled} pages across ${countriesScanned} region${countriesScanned > 1 ? 's' : ''} — no API shortcuts, no simulated clicks. Every interaction was real.` },
            { icon: '👤', title: 'Mystery Shopper Persona', desc: 'I acted as your ideal client — I tried to understand what you do, find your pricing, contact you, and sign up. Every friction point I encountered is documented in this report.' },
            { icon: '📷', title: 'Visual Evidence', desc: 'I took screenshots of your homepage on desktop and mobile, giving you visual proof of what visitors actually see when they arrive at your site.' },
            { icon: '🧪', title: 'Functional Testing', desc: 'I tested your signup flow, contact form, navigation, and CTAs — providing behavioral evidence that your controls are working (or not) in production.' },
            { icon: '♿', title: 'ADA / WCAG Testing', desc: 'I ran automated WCAG 2.1 AA checks: keyboard navigation, screen reader signals, color contrast, alt text, ARIA landmarks, and input labelling.' },
            { icon: '🔒', title: 'Compliance Scan', desc: 'I checked HTTPS, cookie consent, privacy policy signals, GDPR/CCPA/DPDP compliance, and detected third-party tracker exposure.' },
            { icon: '⚡', title: 'Performance Profiling', desc: 'I measured real load times on desktop and mobile, estimated Core Web Vitals, and identified resource bloat from third-party scripts.' },
            { icon: '🤖', title: 'AI Analysis', desc: 'All my observations were analysed by frontier LLMs (Groq Llama 3.3 70B, SambaNova) to produce this 14-section intelligence report.' },
          ].map(({ icon, title, desc }) => (
            <div key={title} style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '14px' }}>
              <div style={{ fontSize: '20px', marginBottom: '6px' }}>{icon}</div>
              <div style={{ fontSize: '12px', fontWeight: 700, color: '#1e293b', marginBottom: '4px' }}>{title}</div>
              <div style={{ fontSize: '11px', color: '#6b7280', lineHeight: 1.6 }}>{desc}</div>
            </div>
          ))}
        </div>

        <div style={{ background: '#faf5ff', border: '1px solid #e9d5ff', borderRadius: '10px', padding: '14px' }}>
          <div style={{ fontSize: '11px', fontWeight: 700, color: '#7c3aed', textTransform: 'uppercase' as const, marginBottom: '8px' }}>IMPORTANT NOTES</div>
          <div style={{ fontSize: '12px', color: '#4b5563', lineHeight: 1.7 }}>
            This LAM audit is based on publicly visible information and my experience as a simulated visitor. I did not access backend systems, databases, or authenticated areas beyond public signup/login flows. SOC2 readiness scores reflect observable compliance signals only — formal SOC2 certification requires a licensed CPA auditor. ADA scores reflect automated testing and may not capture all manual WCAG 2.1 requirements. Revenue at risk figures are estimates only and not guarantees.
          </div>
        </div>
        <PageFooter company={domain} url={scan.url} page={13} />
      </div>

      {/* PAGE 14 — ABOUT */}
      <div style={{ ...PAGE, pageBreakAfter: 'avoid' as const }}>
        {hdr(14, 'About Klaro Pulse')}

        <div style={{ textAlign: 'center', marginBottom: '24px' }}>
          <img src="/klaro-logo.png" alt="Klaro" style={{ width: '56px', height: '56px', borderRadius: '12px', objectFit: 'cover' as const, marginBottom: '12px' }} />
          <div style={{ fontSize: '24px', fontWeight: 900, color: '#1e293b', marginBottom: '6px' }}>Klaro <span style={{ color: '#7c3aed' }}>Pulse</span></div>
          <div style={{ fontSize: '13px', color: '#6b7280', maxWidth: '480px', margin: '0 auto', lineHeight: 1.7 }}>
            The world's first Large Action Model (LAM) that audits your website as a real human visitor — delivering mystery shopper intelligence, ADA compliance, SOC readiness, and 90-day roadmaps in minutes.
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: '10px', marginBottom: '16px' }}>
          {[
            { title: 'LLM Report', price: '$59.99', desc: '5-page LLM audit PDF' },
            { title: 'LAM One-off', price: '$299', desc: '14-page deep LAM audit' },
            { title: 'LAM Monthly', price: '$499/mo', desc: 'Weekly monitoring + alerts' },
            { title: 'SOC Readiness', price: '$7,999', desc: 'Full SOC 2 audit package' },
          ].map(({ title, price, desc }) => (
            <div key={title} style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '14px', textAlign: 'center' as const }}>
              <div style={{ fontSize: '11px', fontWeight: 700, color: '#374151', marginBottom: '4px' }}>{title}</div>
              <div style={{ fontSize: '20px', fontWeight: 900, color: '#7c3aed', marginBottom: '4px' }}>{price}</div>
              <div style={{ fontSize: '10px', color: '#6b7280' }}>{desc}</div>
            </div>
          ))}
        </div>

        <div style={{ background: 'linear-gradient(135deg,#faf5ff,#eff6ff)', border: '1px solid #e9d5ff', borderRadius: '12px', padding: '20px', textAlign: 'center' as const }}>
          <div style={{ fontSize: '14px', fontWeight: 800, color: '#1e293b', marginBottom: '6px' }}>CPA & Accounting Firm Partners — 40% Revenue Share</div>
          <div style={{ fontSize: '12px', color: '#6b7280', marginBottom: '10px' }}>White-label reports under your firm name. We handle the tech. You earn 40% of every scan.</div>
          <div style={{ fontSize: '12px', color: '#7c3aed', fontWeight: 600 }}>ops@klaro.services · klaro.services/pulse</div>
        </div>

        <PageFooter company={domain} url={scan.url} page={14} />
      </div>
    </>
  )
}
