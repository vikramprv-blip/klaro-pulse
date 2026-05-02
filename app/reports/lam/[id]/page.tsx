'use client'
import { useState, useEffect } from 'react'

function sc(s: number) { return s >= 75 ? '#16a34a' : s >= 50 ? '#d97706' : '#dc2626' }
function scBg(s: number) { return s >= 75 ? '#f0fdf4' : s >= 50 ? '#fffbeb' : '#fef2f2' }
function scBorder(s: number) { return s >= 75 ? '#bbf7d0' : s >= 50 ? '#fde68a' : '#fecaca' }

function ScoreBox({ label, val }: { label: string, val: number }) {
  return (
    <div style={{ background: scBg(val), border: `2px solid ${scBorder(val)}`, borderRadius: '10px', padding: '14px', textAlign: 'center' as const }}>
      <div style={{ fontSize: '28px', fontWeight: 900, color: sc(val), lineHeight: 1 }}>{val || '—'}</div>
      <div style={{ fontSize: '10px', color: '#6b7280', textTransform: 'uppercase' as const, letterSpacing: '0.07em', marginTop: '5px', fontWeight: 600 }}>{label}</div>
    </div>
  )
}

function Chip({ text, color = '#374151', bg = '#f1f5f9', border = '#e2e8f0' }: { text: string, color?: string, bg?: string, border?: string }) {
  return <span style={{ background: bg, border: `1px solid ${border}`, borderRadius: '20px', padding: '3px 10px', fontSize: '11px', color, marginRight: '6px', marginBottom: '6px', display: 'inline-block' }}>{text}</span>
}

function InfoRow({ label, val }: { label: string, val: any }) {
  if (val === null || val === undefined || val === '') return null
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', padding: '7px 0', borderBottom: '1px solid #f1f5f9', fontSize: '12px' }}>
      <span style={{ color: '#6b7280' }}>{label}</span>
      <span style={{ fontWeight: 700, color: '#374151', textAlign: 'right', maxWidth: '55%' }}>{String(val)}</span>
    </div>
  )
}

function RedFlag({ text }: { text: string }) {
  return <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderLeft: '3px solid #dc2626', borderRadius: '8px', padding: '10px 14px', marginBottom: '8px', fontSize: '12px', color: '#374151' }}>⚠ {text}</div>
}

function GreenWin({ text }: { text: string }) {
  return <div style={{ fontSize: '12px', color: '#374151', padding: '5px 0', borderBottom: '1px solid #dcfce7' }}>✓ {text}</div>
}

function PageFooter({ company, url, page, total }: { company: string, url: string, page: number, total: number }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '32px', paddingTop: '12px', borderTop: '1px solid #e2e8f0', fontSize: '10px', color: '#9ca3af' }}>
      <span>{company} | {url}</span>
      <span>Klaro Pulse LAM Intelligence · klaro.services/pulse · Page {page}/{total} · © 2026 Klaro Global</span>
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

const TOTAL = 10

export default function LAMReportPage({ params }: { params: { id: string } }) {
  const [scan, setScan] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    fetch('/api/pulse/reports').then(r => r.json()).then(data => {
      const found = (data.lam || []).find((s: any) => s.id === params.id)
      if (found) {
        setScan(found)
      } else {
        setError(`Report ${params.id} not found. ${data.lam?.length || 0} LAM reports available.`)
      }
      setLoading(false)
    }).catch(e => {
      setError(`Failed to load: ${e.message}`)
      setLoading(false)
    })
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

  const score = scan.overall_score || 0
  const lamScore = scan.lam_score || 0
  const adaScore = scan.ada_score || 0
  const socScore = scan.soc_score || 0
  const convScore = scan.conversion_score || 0
  const perfScore = perf.performance_score || raw.performance_score || 0
  const contentScore = content.content_score || raw.content_score || 0
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
          KLARO <span style={{ color: '#a78bfa' }}>PULSE</span>
          <span style={{ fontSize: '11px', color: '#475569', marginLeft: '8px', fontWeight: 400 }}>LAM AUDIT · {pagesCrawled} pages · {countriesScanned} region{countriesScanned > 1 ? 's' : ''} · {Math.round(elapsedSeconds / 60)}m {elapsedSeconds % 60}s</span>
        </div>
        <div style={{ display: 'flex', gap: '10px' }}>
          <a href="/dashboard" style={{ fontSize: '12px', color: '#818cf8', textDecoration: 'none', border: '1px solid #3b4fd8', borderRadius: '8px', padding: '6px 14px' }}>← Dashboard</a>
          <button onClick={downloadPDF} style={{ fontSize: '12px', color: 'white', background: 'linear-gradient(135deg,#7c3aed,#a855f7)', border: 'none', borderRadius: '8px', padding: '6px 16px', cursor: 'pointer', fontWeight: 700, fontFamily: 'inherit' }}>⬇ Download PDF</button>
        </div>
      </div>

      {/* ── PAGE 1 — EXECUTIVE BRIEF ─────────────────────────────────────── */}
      <div style={PAGE}>
        {hdr(1, 'Executive Brief')}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '24px', gap: '24px' }}>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: '11px', fontWeight: 700, color: '#7c3aed', textTransform: 'uppercase' as const, letterSpacing: '0.1em', marginBottom: '6px' }}>🤖 DEEP LAM AGENT AUDIT · {pagesCrawled} PAGES · {countriesScanned} REGION{countriesScanned > 1 ? 'S' : ''}</div>
            <div style={{ fontSize: '38px', fontWeight: 900, color: '#0f172a', marginBottom: '4px', lineHeight: 1.1 }}>{domain}</div>
            <a href={scan.url} style={{ fontSize: '13px', color: '#6366f1', textDecoration: 'none' }}>{scan.url}</a>
            {ci.industry && <div style={{ fontSize: '12px', color: '#64748b', marginTop: '4px' }}>Industry: {ci.industry}</div>}
            <div style={{ fontSize: '11px', color: '#94a3b8', marginTop: '4px' }}>Audit date: {date} · Scan duration: {Math.floor(elapsedSeconds/60)}m {elapsedSeconds%60}s</div>
          </div>
          <div style={{ textAlign: 'center', flexShrink: 0 }}>
            <div style={{ fontSize: '80px', fontWeight: 900, color: sc(score), lineHeight: 1 }}>{score}</div>
            <div style={{ fontSize: '13px', color: '#94a3b8' }}>/100</div>
            <div style={{ fontSize: '20px', fontWeight: 700, color: sc(score), marginTop: '2px' }}>Grade: {grade}</div>
            {eb.urgency && <div style={{ fontSize: '11px', background: sc(score) === '#dc2626' ? '#fef2f2' : '#f8fafc', color: sc(score), border: `1px solid ${scBorder(score)}`, borderRadius: '20px', padding: '3px 12px', marginTop: '6px', fontWeight: 700 }}>{eb.urgency} Priority</div>}
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6,1fr)', gap: '8px', marginBottom: '22px' }}>
          <ScoreBox label="Overall" val={score} />
          <ScoreBox label="LAM Agent" val={lamScore} />
          <ScoreBox label="ADA/WCAG" val={adaScore} />
          <ScoreBox label="SOC/Legal" val={socScore} />
          <ScoreBox label="Conversion" val={convScore} />
          <ScoreBox label="Performance" val={perfScore} />
        </div>

        {eb.one_line_verdict && (
          <div style={{ fontSize: '14px', fontStyle: 'italic', color: '#374151', lineHeight: 1.6, borderLeft: '4px solid #7c3aed', paddingLeft: '18px', marginBottom: '14px', background: '#faf5ff', padding: '14px 18px', borderRadius: '0 8px 8px 0' }}>
            "{eb.one_line_verdict}"
          </div>
        )}
        {eb.plain_english_summary && (
          <div style={{ fontSize: '13px', color: '#4b5563', lineHeight: 1.8, marginBottom: '14px' }}>{eb.plain_english_summary}</div>
        )}
        {eb.key_finding && (
          <div style={{ background: '#fffbeb', border: '1px solid #fde68a', borderLeft: '4px solid #d97706', borderRadius: '8px', padding: '12px 16px', marginBottom: '14px', fontSize: '13px', color: '#92400e' }}>
            🔍 <strong>Key Finding:</strong> {eb.key_finding}
          </div>
        )}
        {eb.estimated_monthly_revenue_lost && (
          <div style={{ background: '#fef2f2', border: '1px solid #fca5a5', borderLeft: '4px solid #dc2626', borderRadius: '8px', padding: '12px 16px', marginBottom: '20px', fontSize: '13px', color: '#991b1b' }}>
            💰 <strong>Estimated Monthly Revenue Lost:</strong> {eb.estimated_monthly_revenue_lost}
          </div>
        )}
        {eb.country_selector_finding && (
          <div style={{ background: '#eff6ff', border: '1px solid #bfdbfe', borderLeft: '4px solid #2563eb', borderRadius: '8px', padding: '12px 16px', marginBottom: '14px', fontSize: '13px', color: '#1e40af' }}>
            🌍 <strong>Multi-Region:</strong> {eb.country_selector_finding}
          </div>
        )}

        {(eb.top_5_actions || eb.top_3_actions || []).length > 0 && (
          <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '18px' }}>
            <div style={{ fontSize: '10px', fontWeight: 700, color: '#6b7280', textTransform: 'uppercase' as const, letterSpacing: '0.08em', marginBottom: '12px' }}>TOP IMMEDIATE ACTIONS</div>
            {(eb.top_5_actions || eb.top_3_actions || []).map((action: string, i: number) => (
              <div key={i} style={{ display: 'flex', gap: '12px', padding: '9px 0', borderBottom: '1px solid #f1f5f9', alignItems: 'flex-start' }}>
                <span style={{ fontSize: '11px', fontWeight: 800, color: i === 0 ? '#dc2626' : i === 1 ? '#dc2626' : i === 2 ? '#d97706' : '#16a34a', whiteSpace: 'nowrap', marginTop: '2px', minWidth: '24px' }}>0{i+1}</span>
                <span style={{ fontSize: '12px', color: '#374151', lineHeight: 1.5 }}>{action}</span>
              </div>
            ))}
          </div>
        )}
        <PageFooter company={domain} url={scan.url} page={1} total={TOTAL} />
      </div>

      {/* ── PAGE 2 — CLIENT VISIT NARRATIVE ─────────────────────────────── */}
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
            <InfoRow label="Time to Understand Business" val={ce.time_to_understand_business} />
            <InfoRow label="Time to Find Contact" val={ce.time_to_find_contact} />
            <InfoRow label="Contact Form Experience" val={ce.contact_form_experience} />
            <InfoRow label="Conversion Probability" val={ce.conversion_probability !== undefined ? `${ce.conversion_probability}%` : null} />
            <InfoRow label="Would Real Client Convert?" val={ce.would_real_client_convert !== undefined ? (ce.would_real_client_convert ? '✓ Yes' : '✗ No') : null} />
            <InfoRow label="Navigation Quality" val={ce.navigation_quality} />
            <InfoRow label="Mobile Experience" val={ce.mobile_experience} />
            <InfoRow label="Live Chat Present" val={ce.chat_support_present !== undefined ? (ce.chat_support_present ? '✓ Yes' : '✗ No') : null} />
            <InfoRow label="Site Search" val={ce.search_functionality !== undefined ? (ce.search_functionality ? '✓ Yes' : '✗ No') : null} />
          </div>
          <div>
            {(ce.trust_signals_found || []).length > 0 && (
              <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: '10px', padding: '16px', marginBottom: '12px' }}>
                <div style={{ fontSize: '10px', fontWeight: 700, color: '#16a34a', textTransform: 'uppercase' as const, letterSpacing: '0.08em', marginBottom: '8px' }}>✓ TRUST SIGNALS FOUND</div>
                {(ce.trust_signals_found || []).map((s: string, i: number) => <GreenWin key={i} text={s} />)}
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
          <div>
            <div style={{ fontSize: '11px', fontWeight: 700, color: '#dc2626', textTransform: 'uppercase' as const, letterSpacing: '0.08em', marginBottom: '10px' }}>🚫 CONVERSION BLOCKERS</div>
            {(ce.conversion_blockers || []).map((b: string, i: number) => <RedFlag key={i} text={b} />)}
          </div>
        )}
        <PageFooter company={domain} url={scan.url} page={2} total={TOTAL} />
      </div>

      {/* ── PAGE 3 — PERFORMANCE ─────────────────────────────────────────── */}
      <div style={PAGE}>
        {hdr(3, 'Performance & Speed')}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '24px', gap: '24px' }}>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: '11px', fontWeight: 700, color: '#2563eb', textTransform: 'uppercase' as const, letterSpacing: '0.08em', marginBottom: '8px' }}>⚡ PERFORMANCE AUDIT</div>
            {perf.performance_narrative && <div style={{ fontSize: '13px', color: '#4b5563', lineHeight: 1.8 }}>{perf.performance_narrative}</div>}
          </div>
          <div style={{ textAlign: 'center', flexShrink: 0 }}>
            <ScoreBox label="Performance" val={perfScore} />
            {perf.performance_grade && <div style={{ fontSize: '14px', fontWeight: 700, color: sc(perfScore), marginTop: '8px' }}>Grade: {perf.performance_grade}</div>}
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

        {(perf.mobile_issues || []).length > 0 && (
          <div style={{ marginBottom: '16px' }}>
            <div style={{ fontSize: '11px', fontWeight: 700, color: '#d97706', textTransform: 'uppercase' as const, letterSpacing: '0.08em', marginBottom: '8px' }}>📱 MOBILE ISSUES DETECTED</div>
            {(perf.mobile_issues || []).map((issue: string, i: number) => (
              <div key={i} style={{ background: '#fffbeb', border: '1px solid #fde68a', borderLeft: '3px solid #d97706', borderRadius: '8px', padding: '9px 14px', marginBottom: '7px', fontSize: '12px', color: '#374151' }}>⚠ {issue}</div>
            ))}
          </div>
        )}

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
        <PageFooter company={domain} url={scan.url} page={3} total={TOTAL} />
      </div>

      {/* ── PAGE 4 — CONTENT QUALITY ──────────────────────────────────────── */}
      <div style={PAGE}>
        {hdr(4, 'Content Quality & SEO')}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '24px', gap: '24px' }}>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: '11px', fontWeight: 700, color: '#0891b2', textTransform: 'uppercase' as const, letterSpacing: '0.08em', marginBottom: '8px' }}>📝 CONTENT & SEO AUDIT</div>
            {content.content_narrative && <div style={{ fontSize: '13px', color: '#4b5563', lineHeight: 1.8 }}>{content.content_narrative}</div>}
          </div>
          <div style={{ textAlign: 'center', flexShrink: 0 }}>
            <ScoreBox label="Content" val={contentScore} />
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: '10px', marginBottom: '20px' }}>
          {[
            ['Value Proposition', content.value_proposition_clarity],
            ['SEO Signals', content.seo_signals?.substring(0, 30) + (content.seo_signals?.length > 30 ? '...' : '') || 'Not assessed'],
            ['Social Proof', content.social_proof_strength],
            ['Content Tone', content.tone_assessment],
            ['Meta Description', content.meta_description_quality],
            ['Structured Data', content.structured_data_present ? '✓ Present' : '✗ Missing'],
          ].map(([label, val]) => (
            <div key={label as string} style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '14px' }}>
              <div style={{ fontSize: '10px', fontWeight: 700, color: '#6b7280', textTransform: 'uppercase' as const, marginBottom: '4px' }}>{label as string}</div>
              <div style={{ fontSize: '12px', fontWeight: 700, color: '#374151' }}>{val as string || '—'}</div>
            </div>
          ))}
        </div>

        {content.seo_signals && (
          <div style={{ background: '#f0f9ff', border: '1px solid #bae6fd', borderRadius: '10px', padding: '16px', marginBottom: '16px' }}>
            <div style={{ fontSize: '10px', fontWeight: 700, color: '#0369a1', textTransform: 'uppercase' as const, marginBottom: '6px' }}>SEO DETAIL</div>
            <div style={{ fontSize: '12px', color: '#374151', lineHeight: 1.7 }}>{content.seo_signals}</div>
          </div>
        )}

        {(content.content_gaps || []).length > 0 && (
          <div style={{ marginBottom: '16px' }}>
            <div style={{ fontSize: '11px', fontWeight: 700, color: '#dc2626', textTransform: 'uppercase' as const, letterSpacing: '0.08em', marginBottom: '8px' }}>CONTENT GAPS</div>
            {(content.content_gaps || []).map((gap: string, i: number) => <RedFlag key={i} text={gap} />)}
          </div>
        )}

        {(content.pages_with_thin_content || []).length > 0 && (
          <div style={{ background: '#fffbeb', border: '1px solid #fde68a', borderRadius: '10px', padding: '16px' }}>
            <div style={{ fontSize: '10px', fontWeight: 700, color: '#d97706', textTransform: 'uppercase' as const, marginBottom: '8px' }}>PAGES WITH THIN CONTENT</div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
              {(content.pages_with_thin_content || []).map((p: string, i: number) => (
                <Chip key={i} text={p} color="#92400e" bg="#fffbeb" border="#fde68a" />
              ))}
            </div>
          </div>
        )}
        <PageFooter company={domain} url={scan.url} page={4} total={TOTAL} />
      </div>

      {/* ── PAGE 5 — ADA / WCAG ──────────────────────────────────────────── */}
      <div style={PAGE}>
        {hdr(5, 'ADA & WCAG 2.1 Compliance')}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '24px', gap: '24px' }}>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: '11px', fontWeight: 700, color: '#dc2626', textTransform: 'uppercase' as const, letterSpacing: '0.08em', marginBottom: '8px' }}>♿ ADA / WCAG 2.1 ACCESSIBILITY AUDIT</div>
            {ada.ada_narrative && <div style={{ fontSize: '13px', color: '#4b5563', lineHeight: 1.8 }}>{ada.ada_narrative}</div>}
          </div>
          <div style={{ textAlign: 'center', flexShrink: 0 }}>
            <ScoreBox label="ADA Score" val={adaScore} />
            {ada.risk_level && <div style={{ fontSize: '12px', fontWeight: 700, color: sc(adaScore), marginTop: '8px' }}>{ada.risk_level}</div>}
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: '10px', marginBottom: '20px' }}>
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
            <div key={label as string} style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '14px' }}>
              <div style={{ fontSize: '10px', fontWeight: 700, color: '#6b7280', textTransform: 'uppercase' as const, marginBottom: '4px' }}>{label as string}</div>
              <div style={{ fontSize: '12px', fontWeight: 600, color: '#374151' }}>{val as string || '—'}</div>
            </div>
          ))}
        </div>

        {(ada.critical_violations || []).length > 0 && (
          <div style={{ marginBottom: '16px' }}>
            <div style={{ fontSize: '11px', fontWeight: 700, color: '#dc2626', textTransform: 'uppercase' as const, letterSpacing: '0.08em', marginBottom: '10px' }}>CRITICAL VIOLATIONS</div>
            {(ada.critical_violations || []).map((v: string, i: number) => <RedFlag key={i} text={v} />)}
          </div>
        )}

        {ada.legal_exposure && (
          <div style={{ background: '#fef2f2', border: '1px solid #fca5a5', borderRadius: '10px', padding: '16px', marginBottom: '16px' }}>
            <div style={{ fontSize: '10px', fontWeight: 700, color: '#dc2626', textTransform: 'uppercase' as const, marginBottom: '6px' }}>⚖ LEGAL EXPOSURE</div>
            <div style={{ fontSize: '13px', color: '#374151' }}>{ada.legal_exposure}</div>
          </div>
        )}

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
          {ada.remediation_cost && (
            <div style={{ background: '#fffbeb', border: '1px solid #fde68a', borderRadius: '10px', padding: '16px' }}>
              <div style={{ fontSize: '10px', fontWeight: 700, color: '#d97706', textTransform: 'uppercase' as const, marginBottom: '4px' }}>REMEDIATION COST</div>
              <div style={{ fontSize: '18px', fontWeight: 700, color: '#374151' }}>{ada.remediation_cost}</div>
            </div>
          )}
          {ada.remediation_time && (
            <div style={{ background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: '10px', padding: '16px' }}>
              <div style={{ fontSize: '10px', fontWeight: 700, color: '#2563eb', textTransform: 'uppercase' as const, marginBottom: '4px' }}>REMEDIATION TIME</div>
              <div style={{ fontSize: '18px', fontWeight: 700, color: '#374151' }}>{ada.remediation_time}</div>
            </div>
          )}
        </div>
        <PageFooter company={domain} url={scan.url} page={5} total={TOTAL} />
      </div>

      {/* ── PAGE 6 — SOC & SECURITY ───────────────────────────────────────── */}
      <div style={PAGE}>
        {hdr(6, 'SOC & Compliance')}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '24px', gap: '24px' }}>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: '11px', fontWeight: 700, color: '#7c3aed', textTransform: 'uppercase' as const, letterSpacing: '0.08em', marginBottom: '8px' }}>🔒 SOC & COMPLIANCE AUDIT</div>
            {soc.soc_narrative && <div style={{ fontSize: '13px', color: '#4b5563', lineHeight: 1.8 }}>{soc.soc_narrative}</div>}
          </div>
          <div style={{ textAlign: 'center', flexShrink: 0 }}>
            <ScoreBox label="SOC Score" val={socScore} />
            {soc.legal_risk_level && <div style={{ fontSize: '12px', fontWeight: 700, color: sc(socScore), marginTop: '8px' }}>{soc.legal_risk_level} Risk</div>}
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: '10px', marginBottom: '20px' }}>
          {[
            ['HTTPS Enforced', soc.https_enforced],
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
          <div style={{ marginBottom: '16px' }}>
            <div style={{ fontSize: '11px', fontWeight: 700, color: '#dc2626', textTransform: 'uppercase' as const, letterSpacing: '0.08em', marginBottom: '8px' }}>COMPLIANCE GAPS</div>
            {(soc.compliance_gaps || []).map((gap: string, i: number) => <RedFlag key={i} text={gap} />)}
          </div>
        )}

        {(soc.third_party_trackers_found || []).length > 0 && (
          <div style={{ marginBottom: '14px' }}>
            <div style={{ fontSize: '11px', fontWeight: 700, color: '#d97706', textTransform: 'uppercase' as const, letterSpacing: '0.08em', marginBottom: '8px' }}>THIRD-PARTY TRACKERS</div>
            <div style={{ display: 'flex', flexWrap: 'wrap' }}>
              {(soc.third_party_trackers_found || []).map((t: string, i: number) => <Chip key={i} text={t} color="#92400e" bg="#fffbeb" border="#fde68a" />)}
            </div>
          </div>
        )}

        {(soc.recommended_compliance_actions || []).length > 0 && (
          <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '16px' }}>
            <div style={{ fontSize: '10px', fontWeight: 700, color: '#6b7280', textTransform: 'uppercase' as const, marginBottom: '8px' }}>RECOMMENDED ACTIONS</div>
            {(soc.recommended_compliance_actions || []).map((a: string, i: number) => (
              <div key={i} style={{ fontSize: '12px', color: '#374151', padding: '6px 0', borderBottom: '1px solid #f1f5f9' }}>{i+1}. {a}</div>
            ))}
          </div>
        )}
        <PageFooter company={domain} url={scan.url} page={6} total={TOTAL} />
      </div>

      {/* ── PAGE 7 — TECH STACK ───────────────────────────────────────────── */}
      <div style={PAGE}>
        {hdr(7, 'Technology Stack')}
        <div style={{ fontSize: '11px', fontWeight: 700, color: '#0f766e', textTransform: 'uppercase' as const, letterSpacing: '0.08em', marginBottom: '16px' }}>🔧 TECHNOLOGY AUDIT</div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '20px' }}>
          <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '18px' }}>
            <div style={{ fontSize: '10px', fontWeight: 700, color: '#6b7280', textTransform: 'uppercase' as const, marginBottom: '12px' }}>DETECTED STACK</div>
            <InfoRow label="CMS / Platform" val={tech.cms_platform} />
            <InfoRow label="Tech Debt Level" val={tech.tech_debt_assessment} />
            <InfoRow label="Third-Party Risk" val={tech.third_party_risk} />
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {(tech.analytics_tools || []).length > 0 && (
              <div style={{ background: '#f0f9ff', border: '1px solid #bae6fd', borderRadius: '10px', padding: '14px' }}>
                <div style={{ fontSize: '10px', fontWeight: 700, color: '#0369a1', textTransform: 'uppercase' as const, marginBottom: '8px' }}>ANALYTICS</div>
                <div style={{ display: 'flex', flexWrap: 'wrap' }}>{(tech.analytics_tools || []).map((t: string, i: number) => <Chip key={i} text={t} />)}</div>
              </div>
            )}
            {(tech.marketing_tools || []).length > 0 && (
              <div style={{ background: '#faf5ff', border: '1px solid #e9d5ff', borderRadius: '10px', padding: '14px' }}>
                <div style={{ fontSize: '10px', fontWeight: 700, color: '#7c3aed', textTransform: 'uppercase' as const, marginBottom: '8px' }}>MARKETING</div>
                <div style={{ display: 'flex', flexWrap: 'wrap' }}>{(tech.marketing_tools || []).map((t: string, i: number) => <Chip key={i} text={t} />)}</div>
              </div>
            )}
          </div>
        </div>

        {(tech.detected_technologies || []).length > 0 && (
          <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '18px', marginBottom: '16px' }}>
            <div style={{ fontSize: '10px', fontWeight: 700, color: '#6b7280', textTransform: 'uppercase' as const, marginBottom: '12px' }}>ALL DETECTED TECHNOLOGIES</div>
            <div style={{ display: 'flex', flexWrap: 'wrap' }}>
              {(tech.detected_technologies || []).map((t: string, i: number) => <Chip key={i} text={t} />)}
            </div>
          </div>
        )}

        {/* Multi-region summary */}
        {multi.has_country_selector && (
          <div style={{ background: '#eff6ff', border: '1px solid #bfdbfe', borderLeft: '4px solid #2563eb', borderRadius: '8px', padding: '16px' }}>
            <div style={{ fontSize: '11px', fontWeight: 700, color: '#1d4ed8', textTransform: 'uppercase' as const, marginBottom: '10px' }}>🌍 MULTI-REGION ANALYSIS · {multi.regions_scanned} regions scanned</div>
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
        <PageFooter company={domain} url={scan.url} page={7} total={TOTAL} />
      </div>

      {/* ── PAGE 8 — COMPETITIVE INTELLIGENCE ────────────────────────────── */}
      <div style={PAGE}>
        {hdr(8, 'Competitive Intelligence')}
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
          <div style={{ background: '#f0fdf4', border: '1px solid #86efac', borderLeft: '4px solid #16a34a', borderRadius: '8px', padding: '16px', marginBottom: '16px' }}>
            <div style={{ fontSize: '10px', fontWeight: 700, color: '#16a34a', textTransform: 'uppercase' as const, marginBottom: '6px' }}>OPPORTUNITY TO WIN</div>
            <div style={{ fontSize: '12px', color: '#166534', lineHeight: 1.7 }}>{ci.opportunity_to_win}</div>
          </div>
        )}

        {(ci.competitor_advantages_to_counter || []).length > 0 && (
          <div style={{ marginBottom: '16px' }}>
            <div style={{ fontSize: '11px', fontWeight: 700, color: '#374151', textTransform: 'uppercase' as const, letterSpacing: '0.08em', marginBottom: '8px' }}>COMPETITOR ADVANTAGES TO COUNTER</div>
            {(ci.competitor_advantages_to_counter || []).map((a: string, i: number) => (
              <div key={i} style={{ fontSize: '12px', color: '#374151', padding: '6px 0', borderBottom: '1px solid #f1f5f9' }}>• {a}</div>
            ))}
          </div>
        )}

        {(Array.isArray(st) ? st : []).length > 0 && (
          <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: '10px', padding: '16px' }}>
            <div style={{ fontSize: '11px', fontWeight: 700, color: '#16a34a', textTransform: 'uppercase' as const, letterSpacing: '0.08em', marginBottom: '10px' }}>STRENGTHS IDENTIFIED</div>
            {(Array.isArray(st) ? st : []).map((s: any, i: number) => <GreenWin key={i} text={typeof s === 'string' ? s : JSON.stringify(s)} />)}
          </div>
        )}
        <PageFooter company={domain} url={scan.url} page={8} total={TOTAL} />
      </div>

      {/* ── PAGE 9 — 90-DAY ROADMAP ───────────────────────────────────────── */}
      <div style={PAGE}>
        {hdr(9, '90-Day Action Roadmap')}
        <div style={{ fontSize: '16px', fontWeight: 900, color: '#1e293b', textTransform: 'uppercase' as const, letterSpacing: '0.05em', marginBottom: '20px' }}>YOUR 90-DAY RECOVERY & GROWTH PLAN</div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: '14px', marginBottom: '20px' }}>
          {[
            [rm.week_1, 'Week 1 — Critical Fixes', '#dc2626', '#fef2f2', '#fecaca'],
            [rm.month_1, 'Month 1 — Foundation', '#d97706', '#fffbeb', '#fde68a'],
            [rm.month_2_3, 'Month 2–3 — Growth', '#16a34a', '#f0fdf4', '#bbf7d0'],
          ].map(([phase, label, color, bg, border]: any[]) => phase ? (
            <div key={label} style={{ background: bg, border: `1px solid ${border}`, borderTop: `4px solid ${color}`, borderRadius: '10px', padding: '16px' }}>
              <div style={{ fontSize: '11px', fontWeight: 800, color, marginBottom: '6px' }}>{label}{phase.title ? ` — ${phase.title}` : ''}</div>
              {phase.estimated_cost && <div style={{ fontSize: '11px', color: '#6b7280', marginBottom: '3px' }}>Cost: {phase.estimated_cost}</div>}
              {phase.expected_score_improvement && <div style={{ fontSize: '11px', color, fontWeight: 700, marginBottom: '8px' }}>Target: +{phase.expected_score_improvement} pts</div>}
              {(phase.actions || []).map((a: string, i: number) => (
                <div key={i} style={{ fontSize: '11px', color: '#374151', padding: '5px 0', borderBottom: `1px solid ${border}`, lineHeight: 1.5 }}>
                  <span style={{ color, fontWeight: 800, marginRight: '6px' }}>{i+1}.</span>{a}
                </div>
              ))}
            </div>
          ) : null)}
        </div>

        {rm.expected_outcome_90_days && (
          <div style={{ background: '#f0fdf4', border: '1px solid #86efac', borderLeft: '4px solid #16a34a', borderRadius: '8px', padding: '16px', marginBottom: '12px' }}>
            <div style={{ fontSize: '10px', fontWeight: 700, color: '#16a34a', textTransform: 'uppercase' as const, marginBottom: '6px' }}>EXPECTED IN 90 DAYS</div>
            <div style={{ fontSize: '12px', color: '#166534', lineHeight: 1.7 }}>{rm.expected_outcome_90_days}</div>
          </div>
        )}

        {rm.roi_estimate && (
          <div style={{ background: '#faf5ff', border: '1px solid #e9d5ff', borderLeft: '4px solid #7c3aed', borderRadius: '8px', padding: '16px', marginBottom: '12px' }}>
            <div style={{ fontSize: '10px', fontWeight: 700, color: '#7c3aed', textTransform: 'uppercase' as const, marginBottom: '6px' }}>ROI ESTIMATE</div>
            <div style={{ fontSize: '12px', color: '#374151', lineHeight: 1.7 }}>{rm.roi_estimate}</div>
          </div>
        )}

        <div style={{ textAlign: 'center', padding: '20px', background: '#f8fafc', borderRadius: '10px', border: '1px solid #e2e8f0' }}>
          <div style={{ fontSize: '15px', fontWeight: 800, color: '#1e293b', marginBottom: '4px' }}>Ready to implement this roadmap?</div>
          <div style={{ fontSize: '12px', color: '#6b7280' }}>klaro.services/pulse · LAM monitoring from $499/month · ops@klaro.services</div>
        </div>
        <PageFooter company={domain} url={scan.url} page={9} total={TOTAL} />
      </div>

      {/* ── PAGE 10 — METHODOLOGY & ABOUT ────────────────────────────────── */}
      <div style={{ ...PAGE, pageBreakAfter: 'avoid' as const }}>
        {hdr(10, 'Methodology & About Klaro')}

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px', marginBottom: '24px' }}>
          {[
            { icon: '🌐', title: 'Real Browser Crawl', desc: `The LAM agent used a real Chromium browser (Playwright) visiting ${pagesCrawled} pages across ${countriesScanned} region${countriesScanned > 1 ? 's' : ''} — exactly as a human client would.` },
            { icon: '👤', title: 'Client Persona', desc: 'The agent acts as a potential client, attempting to understand the offering, find contact info, and convert — measuring every friction point.' },
            { icon: '🌍', title: 'Multi-Region Intelligence', desc: 'For sites with country selectors, the agent visits each country version independently, comparing compliance, content, and UX consistency.' },
            { icon: '♿', title: 'ADA / WCAG Testing', desc: 'Automated WCAG 2.1 AA checks: keyboard navigation, screen reader signals, color contrast estimation, alt text, ARIA landmarks.' },
            { icon: '🔒', title: 'Compliance Scan', desc: 'HTTPS, cookie consent, privacy policy, GDPR/CCPA/DPDP/PIPEDA signals, third-party tracker exposure, and data collection risks.' },
            { icon: '⚡', title: 'Performance Profiling', desc: 'Real load times captured on desktop and mobile viewports. Page weight, resource count, Core Web Vitals estimation.' },
            { icon: '📝', title: 'Content Intelligence', desc: 'Value proposition clarity, SEO signal strength, meta data quality, structured data, social proof assessment, thin content detection.' },
            { icon: '🤖', title: 'AI Analysis', desc: 'All data is analysed by frontier LLMs (Groq Llama 3.3 70B, Cerebras) to produce a 10-section intelligence report.' },
          ].map(({ icon, title, desc }) => (
            <div key={title} style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '14px' }}>
              <div style={{ fontSize: '20px', marginBottom: '6px' }}>{icon}</div>
              <div style={{ fontSize: '12px', fontWeight: 700, color: '#1e293b', marginBottom: '4px' }}>{title}</div>
              <div style={{ fontSize: '11px', color: '#6b7280', lineHeight: 1.6 }}>{desc}</div>
            </div>
          ))}
        </div>

        <div style={{ textAlign: 'center', marginBottom: '20px' }}>
          <img src="/klaro-logo.png" alt="Klaro" style={{ width: '48px', height: '48px', borderRadius: '10px', objectFit: 'cover' as const, marginBottom: '10px' }} />
          <div style={{ fontSize: '22px', fontWeight: 900, color: '#1e293b', marginBottom: '6px' }}>Klaro <span style={{ color: '#7c3aed' }}>Pulse</span></div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: '10px', marginBottom: '16px' }}>
          {[
            { title: 'LLM Single Report', price: '$59.99', desc: '5-page LLM audit PDF' },
            { title: 'LAM One-off', price: '$299', desc: '10-page deep LAM audit' },
            { title: 'LAM Monthly', price: '$499/mo', desc: 'Weekly monitoring + alerts' },
          ].map(({ title, price, desc }) => (
            <div key={title} style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '14px', textAlign: 'center' as const }}>
              <div style={{ fontSize: '12px', fontWeight: 700, color: '#374151', marginBottom: '4px' }}>{title}</div>
              <div style={{ fontSize: '20px', fontWeight: 900, color: '#7c3aed', marginBottom: '4px' }}>{price}</div>
              <div style={{ fontSize: '11px', color: '#6b7280' }}>{desc}</div>
            </div>
          ))}
        </div>

        <div style={{ background: 'linear-gradient(135deg,#faf5ff,#eff6ff)', border: '1px solid #e9d5ff', borderRadius: '12px', padding: '20px', textAlign: 'center' as const }}>
          <div style={{ fontSize: '14px', fontWeight: 800, color: '#1e293b', marginBottom: '6px' }}>CPA & Accounting Firm Partners — 40% Revenue Share</div>
          <div style={{ fontSize: '12px', color: '#6b7280', marginBottom: '10px' }}>White-label reports under your firm name. We handle the tech.</div>
          <div style={{ fontSize: '12px', color: '#7c3aed', fontWeight: 600 }}>ops@klaro.services · klaro.services/pulse</div>
        </div>

        <PageFooter company={domain} url={scan.url} page={10} total={TOTAL} />
      </div>
    </>
  )
}
