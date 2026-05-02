'use client'
import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'

function sc(s: number) { return s >= 75 ? '#4ade80' : s >= 50 ? '#fbbf24' : '#f87171' }
function scBorder(s: number) { return s >= 75 ? '#166534' : s >= 50 ? '#92400e' : '#991b1b' }

export default function ReportPage({ params }: { params: { id: string } }) {
  const [scan, setScan] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const sb = createClient()

  useEffect(() => {
    sb.auth.getUser().then(({ data: { user } }) => {
      if (!user) { window.location.href = '/signin'; return }
    })
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
  const companyName = r.company_name || ''
  const domain = (() => { try { return new URL(scan.url).hostname } catch { return scan.url } })()
  const displayName = companyName || domain
  const date = new Date(scan.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })

  function downloadPDF() {
    const prev = document.title
    document.title = `Klaro Pulse — ${displayName} — ${date}`
    window.print()
    setTimeout(() => { document.title = prev }, 1000)
  }

  return (
    <>
      <style>{`
        @media print {
          .no-print { display: none !important; }
          * { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
        }
        @page { margin: 15mm; size: A4; }
      `}</style>

      <div className="no-print" style={{ background: '#0a0f1a', borderBottom: '1px solid #1e2a3a', padding: '0 24px', height: '56px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', position: 'sticky', top: 0, zIndex: 20 }}>
        <div style={{ fontSize: '16px', fontWeight: 900, color: 'white' }}>KLARO <span style={{ color: '#6366f1' }}>PULSE</span> <span style={{ fontSize: '11px', color: '#475569', fontWeight: 400, marginLeft: '8px' }}>SITE INTELLIGENCE REPORT</span></div>
        <div style={{ display: 'flex', gap: '10px' }}>
          <a href="/dashboard" style={{ fontSize: '12px', color: '#818cf8', textDecoration: 'none', border: '1px solid #3b4fd8', borderRadius: '8px', padding: '6px 14px' }}>← Dashboard</a>
          <button onClick={downloadPDF} style={{ fontSize: '12px', color: 'white', background: 'linear-gradient(135deg,#6366f1,#8b5cf6)', border: 'none', borderRadius: '8px', padding: '6px 16px', cursor: 'pointer', fontWeight: 700, fontFamily: 'inherit' }}>⬇ Download PDF</button>
        </div>
      </div>

      <div style={{ maxWidth: '900px', margin: '0 auto', padding: '40px 24px', background: '#080c14', minHeight: '100vh' }}>

        {/* Header */}
        <div style={{ background: '#0f1420', border: '1px solid #1e2a3a', borderRadius: '16px', padding: '32px', marginBottom: '20px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '20px' }}>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: '10px', color: '#334155', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '8px' }}>KLARO PULSE · SITE INTELLIGENCE REPORT · {date}</div>
              <div style={{ fontSize: '32px', fontWeight: 900, color: 'white', marginBottom: '4px' }}>{displayName}</div>
              {companyName && companyName !== domain && <div style={{ fontSize: '13px', color: '#475569', marginBottom: '2px' }}>{domain}</div>}
              <a href={scan.url} target="_blank" rel="noreferrer" style={{ fontSize: '13px', color: '#334155' }}>{scan.url}</a>
              {r.industry && <div style={{ fontSize: '12px', color: '#64748b', marginTop: '6px', background: '#080c14', border: '1px solid #1e2a3a', borderRadius: '20px', padding: '3px 12px', display: 'inline-block', marginTop: '8px' }}>🏢 {r.industry}</div>}
              {r.one_line_verdict && (
                <div style={{ fontSize: '15px', fontStyle: 'italic', color: '#94a3b8', marginTop: '16px', lineHeight: 1.6, borderLeft: '3px solid #6366f1', paddingLeft: '16px' }}>
                  "{r.one_line_verdict}"
                </div>
              )}
            </div>
            <div style={{ textAlign: 'center', flexShrink: 0 }}>
              <div style={{ width: '100px', height: '100px', borderRadius: '50%', border: `4px solid ${scBorder(score)}`, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', margin: '0 auto' }}>
                <div style={{ fontSize: '36px', fontWeight: 900, color: sc(score), lineHeight: 1 }}>{score}</div>
                <div style={{ fontSize: '11px', color: '#475569', fontWeight: 600 }}>/ 100</div>
              </div>
              {scan.grade && <div style={{ fontSize: '20px', fontWeight: 900, color: sc(score), marginTop: '8px' }}>Grade {scan.grade}</div>}
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: '16px', marginTop: '24px', paddingTop: '24px', borderTop: '1px solid #1e2a3a' }}>
            {[['Trust', scan.trust_score], ['Conversion', scan.conversion_score], ['Security', scan.security_score], ['Mobile', scan.mobile_score]].map(([label, val]) => (
              val ? <div key={label as string}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: '#475569', fontWeight: 600, marginBottom: '6px' }}>
                  <span>{label}</span><span style={{ color: sc(val as number) }}>{val}/100</span>
                </div>
                <div style={{ height: '6px', background: '#1e2a3a', borderRadius: '6px', overflow: 'hidden' }}>
                  <div style={{ height: '6px', width: `${val}%`, background: sc(val as number), borderRadius: '6px' }} />
                </div>
              </div> : null
            ))}
          </div>
        </div>

        {/* Executive Summary */}
        {r.novice_summary && (
          <div style={{ background: '#0f1420', border: '1px solid #1e2a3a', borderRadius: '16px', padding: '24px', marginBottom: '20px' }}>
            <div style={{ fontSize: '11px', fontWeight: 700, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '12px' }}>EXECUTIVE SUMMARY</div>
            <div style={{ fontSize: '14px', color: '#94a3b8', lineHeight: 1.8 }}>{r.novice_summary}</div>
            {r.revenue_impact && (
              <div style={{ marginTop: '16px', background: '#1c0505', border: '1px solid #991b1b', borderRadius: '10px', padding: '12px 16px', fontSize: '13px', color: '#f87171' }}>
                💰 Estimated Revenue Impact: <strong>{r.revenue_impact}</strong>
              </div>
            )}
          </div>
        )}

        {/* Problems + Fixes */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '20px' }}>
          <div style={{ background: '#0f1420', border: '1px solid #1e2a3a', borderRadius: '16px', padding: '24px' }}>
            <div style={{ fontSize: '11px', fontWeight: 700, color: '#f87171', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '12px' }}>🔴 PROBLEMS FOUND</div>
            {(r.ux_friction_points || []).map((p: string, i: number) => (
              <div key={i} style={{ fontSize: '12px', color: '#64748b', background: '#080c14', border: '1px solid #1e2a3a', borderRadius: '8px', padding: '10px 12px', marginBottom: '8px', lineHeight: 1.5 }}>⚠ {p}</div>
            ))}
          </div>
          <div style={{ background: '#0f1420', border: '1px solid #1e2a3a', borderRadius: '16px', padding: '24px' }}>
            <div style={{ fontSize: '11px', fontWeight: 700, color: '#4ade80', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '12px' }}>🟢 HOW TO FIX</div>
            {(r.resolution_steps || []).map((p: string, i: number) => (
              <div key={i} style={{ fontSize: '12px', color: '#64748b', background: '#080c14', border: '1px solid #1e2a3a', borderRadius: '8px', padding: '10px 12px', marginBottom: '8px', lineHeight: 1.5 }}>
                <span style={{ color: '#4ade80', fontWeight: 700 }}>0{i+1}</span> {p}
              </div>
            ))}
          </div>
        </div>

        {/* Revenue */}
        {(r.revenue_opportunities || []).length > 0 && (
          <div style={{ background: '#0f1420', border: '1px solid #1e2a3a', borderRadius: '16px', padding: '24px', marginBottom: '20px' }}>
            <div style={{ fontSize: '11px', fontWeight: 700, color: '#fbbf24', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '12px' }}>💰 REVENUE OPPORTUNITIES</div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: '12px' }}>
              {(r.revenue_opportunities || []).map((o: string, i: number) => (
                <div key={i} style={{ fontSize: '12px', color: '#64748b', background: '#080c14', border: '1px solid #1e2a3a', borderRadius: '8px', padding: '12px', lineHeight: 1.5 }}>💰 {o}</div>
              ))}
            </div>
          </div>
        )}

        {/* Strengths */}
        {(r.strengths || []).length > 0 && (
          <div style={{ background: '#0f1420', border: '1px solid #1e2a3a', borderRadius: '16px', padding: '24px', marginBottom: '20px' }}>
            <div style={{ fontSize: '11px', fontWeight: 700, color: '#60a5fa', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '12px' }}>✓ STRENGTHS</div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
              {(r.strengths || []).map((s: string, i: number) => (
                <span key={i} style={{ fontSize: '12px', background: '#0c1a3a', color: '#818cf8', border: '1px solid #3b4fd8', borderRadius: '20px', padding: '5px 14px' }}>✓ {s}</span>
              ))}
            </div>
          </div>
        )}

        {/* Priority Actions */}
        {r.priority_actions && (
          <div style={{ background: '#0f1420', border: '1px solid #1e2a3a', borderRadius: '16px', padding: '24px', marginBottom: '20px' }}>
            <div style={{ fontSize: '11px', fontWeight: 700, color: '#fbbf24', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '16px' }}>📅 90-DAY ACTION ROADMAP</div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: '16px' }}>
              {[['This Week', r.priority_actions.week_1, '#f87171'], ['This Month', r.priority_actions.month_1, '#fbbf24'], ['This Quarter', r.priority_actions.quarter_1, '#4ade80']].map(([label, val, color]) => (
                val ? <div key={label as string} style={{ background: '#080c14', border: `1px solid ${color}44`, borderLeft: `3px solid ${color}`, borderRadius: '10px', padding: '16px' }}>
                  <div style={{ fontSize: '10px', fontWeight: 700, color: color as string, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '8px' }}>{label as string}</div>
                  <div style={{ fontSize: '12px', color: '#64748b', lineHeight: 1.6 }}>{val as string}</div>
                </div> : null
              ))}
            </div>
          </div>
        )}

        {/* Compliance */}
        <div style={{ background: '#0f1420', border: '1px solid #1e2a3a', borderRadius: '16px', padding: '24px', marginBottom: '20px' }}>
          <div style={{ fontSize: '11px', fontWeight: 700, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '16px' }}>🔒 COMPLIANCE & TECHNICAL</div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: '12px' }}>
            {[['Mobile', r.mobile_readiness], ['Pricing', r.pricing_clarity], ['CTA', r.cta_effectiveness], ['Audience Clarity', r.target_audience_clarity]].map(([label, val]) => {
              const good = val === 'Good' || val === 'Clear' || val === 'Strong'
              const bad = val === 'Poor' || val === 'Hidden' || val === 'Missing' || val === 'Confusing'
              return (
                <div key={label as string} style={{ background: '#080c14', border: '1px solid #1e2a3a', borderRadius: '10px', padding: '14px', textAlign: 'center' }}>
                  <div style={{ fontSize: '13px', fontWeight: 700, color: good ? '#4ade80' : bad ? '#f87171' : '#fbbf24' }}>{val || '—'}</div>
                  <div style={{ fontSize: '10px', color: '#475569', textTransform: 'uppercase', letterSpacing: '0.06em', marginTop: '4px' }}>{label}</div>
                </div>
              )
            })}
          </div>
        </div>

        {/* Competitor insight */}
        {r.competitor_advantage && (
          <div style={{ background: '#0f1420', border: '1px solid #1e2a3a', borderRadius: '16px', padding: '24px', marginBottom: '20px' }}>
            <div style={{ fontSize: '11px', fontWeight: 700, color: '#a78bfa', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '10px' }}>⚡ COMPETITIVE INSIGHT</div>
            <div style={{ fontSize: '13px', color: '#64748b', lineHeight: 1.7, fontStyle: 'italic' }}>{r.competitor_advantage}</div>
          </div>
        )}

        {/* Footer */}
        <div style={{ textAlign: 'center', padding: '24px', borderTop: '1px solid #1e2a3a', marginTop: '20px' }}>
          <div style={{ fontSize: '14px', fontWeight: 900, color: 'white', marginBottom: '4px' }}>KLARO <span style={{ color: '#6366f1' }}>PULSE</span></div>
          <div style={{ fontSize: '11px', color: '#334155' }}>klaro.services/pulse · AI-powered site intelligence · © 2026 Klaro Global</div>
          <div style={{ fontSize: '10px', color: '#1e2a3a', marginTop: '4px' }}>Report ID: {scan.id} · Generated: {date}</div>
        </div>
      </div>
    </>
  )
}
