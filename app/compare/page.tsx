'use client'
import { useState, useEffect, useCallback } from 'react'
import { getUserProfile } from '@/lib/auth'

function sc(s: number) { return s >= 75 ? '#4ade80' : s >= 50 ? '#fbbf24' : '#f87171' }
function scBorder(s: number) { return s >= 75 ? '#166534' : s >= 50 ? '#92400e' : '#991b1b' }

export default function ComparePage() {
  const [profile, setProfile] = useState<any>(null)
  const [urls, setUrls] = useState(['', ''])
  const [scanning, setScanning] = useState(false)
  const [results, setResults] = useState<any[]>([])
  const [status, setStatus] = useState<{msg: string, type: string} | null>(null)

  useEffect(() => {
    getUserProfile().then(p => {
      if (!p) { window.location.href = '/signin'; return }
      setProfile(p)
    })
  }, [])

  const maxUrls = profile?.plan === 'enterprise' || profile?.plan === 'agency' ? 5 :
    profile?.plan === 'growth' ? 3 : profile?.plan === 'starter' ? 2 : 2

  async function runCompare() {
    const validUrls = urls.filter(u => u.startsWith('http'))
    if (validUrls.length < 2) { setStatus({ msg: 'Enter at least 2 valid URLs', type: 'error' }); return }
    setScanning(true)
    setResults([])
    setStatus({ msg: `Scanning ${validUrls.length} sites — takes 30-90 seconds...`, type: 'scanning' })
    const scanned: any[] = []
    for (const url of validUrls) {
      try {
        setStatus({ msg: `Scanning ${url}...`, type: 'scanning' })
        const res = await fetch('/api/pulse/scan', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ url })
        })
        const data = await res.json()
        if (data.ok) {
          const rep = await fetch('/api/pulse/reports').then(r => r.json())
          const scan = (rep.scans || []).find((s: any) => s.id === data.scan_id)
          if (scan) scanned.push(scan)
        }
      } catch (e) { console.error('Scan failed for', url) }
    }
    setResults(scanned)
    setScanning(false)
    setStatus({ msg: `✅ Comparison complete — ${scanned.length} sites analysed`, type: 'success' })
    setTimeout(() => setStatus(null), 8000)
  }

  const winner = results.length > 0 ? results.reduce((a, b) => (a.overall_score || 0) > (b.overall_score || 0) ? a : b) : null

  return (
    <div style={{ minHeight: '100vh', background: '#080c14', color: '#94a3b8' }}>
      <div style={{ background: '#0a0f1a', borderBottom: '1px solid #1e2a3a', padding: '0 24px', height: '56px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', position: 'sticky', top: 0, zIndex: 20 }}>
        <div style={{ fontSize: '16px', fontWeight: 900, color: 'white' }}>KLARO <span style={{ color: '#6366f1' }}>PULSE</span> <span style={{ fontSize: '11px', color: '#475569', marginLeft: '8px' }}>COMPARE</span></div>
        <a href="/dashboard" style={{ fontSize: '12px', color: '#818cf8', textDecoration: 'none', border: '1px solid #3b4fd8', borderRadius: '8px', padding: '5px 12px' }}>← Dashboard</a>
      </div>

      <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '32px 24px' }}>
        {/* Input section */}
        <div style={{ background: '#0f1420', border: '1px solid #1e2a3a', borderRadius: '16px', padding: '24px', marginBottom: '24px' }}>
          <div style={{ fontSize: '16px', fontWeight: 800, color: 'white', marginBottom: '16px' }}>📊 Side-by-Side Site Comparison</div>
          <div style={{ display: 'grid', gridTemplateColumns: `repeat(${Math.min(urls.length, 3)}, 1fr)`, gap: '10px', marginBottom: '12px' }}>
            {urls.map((u, i) => (
              <input key={i} style={{ background: '#080c14', border: '1px solid #1e2a3a', borderRadius: '10px', padding: '10px 14px', color: 'white', fontSize: '13px', outline: 'none', fontFamily: 'inherit' }}
                placeholder={i === 0 ? 'https://your-site.com' : `https://competitor${i}.com`}
                value={u} onChange={e => { const n = [...urls]; n[i] = e.target.value; setUrls(n) }} />
            ))}
          </div>
          <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
            {urls.length < maxUrls && (
              <button style={{ padding: '8px 16px', background: 'transparent', color: '#818cf8', border: '1px solid #3b4fd8', borderRadius: '8px', fontSize: '12px', cursor: 'pointer', fontFamily: 'inherit' }}
                onClick={() => setUrls([...urls, ''])}>+ Add URL</button>
            )}
            {urls.length > 2 && (
              <button style={{ padding: '8px 16px', background: 'transparent', color: '#f87171', border: '1px solid #991b1b', borderRadius: '8px', fontSize: '12px', cursor: 'pointer', fontFamily: 'inherit' }}
                onClick={() => setUrls(urls.slice(0, -1))}>− Remove</button>
            )}
            <button style={{ padding: '10px 24px', background: 'linear-gradient(135deg,#6366f1,#8b5cf6)', color: 'white', border: 'none', borderRadius: '10px', fontSize: '13px', fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit', opacity: scanning ? 0.7 : 1 }}
              onClick={runCompare} disabled={scanning}>
              {scanning ? '⏳ Scanning...' : 'Compare Now →'}
            </button>
          </div>
          {status && (
            <div style={{ marginTop: '12px', padding: '10px 14px', borderRadius: '8px', fontSize: '12px', background: status.type === 'error' ? '#1c0505' : status.type === 'success' ? '#052e16' : '#1e2d4a', color: status.type === 'error' ? '#f87171' : status.type === 'success' ? '#4ade80' : '#818cf8', border: `1px solid ${status.type === 'error' ? '#991b1b' : status.type === 'success' ? '#166534' : '#3b4fd8'}` }}>
              {status.msg}
            </div>
          )}
        </div>

        {/* Results */}
        {results.length > 0 && (
          <>
            {winner && (
              <div style={{ background: '#052e16', border: '1px solid #166534', borderRadius: '12px', padding: '16px 20px', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div style={{ fontSize: '24px' }}>🏆</div>
                <div>
                  <div style={{ fontSize: '14px', fontWeight: 700, color: '#4ade80' }}>Top Performer</div>
                  <div style={{ fontSize: '13px', color: '#86efac' }}>{winner.report?.company_name || new URL(winner.url).hostname} — Score: {winner.overall_score}/100</div>
                </div>
              </div>
            )}

            {/* Score comparison table */}
            <div style={{ background: '#0f1420', border: '1px solid #1e2a3a', borderRadius: '16px', overflow: 'hidden', marginBottom: '20px' }}>
              <div style={{ padding: '16px 20px', borderBottom: '1px solid #0d1520', fontSize: '11px', fontWeight: 700, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.08em' }}>SCORE COMPARISON</div>
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr style={{ background: '#0a0f1a' }}>
                      <td style={{ padding: '12px 20px', fontSize: '11px', color: '#475569', fontWeight: 700, textTransform: 'uppercase' }}>Metric</td>
                      {results.map(r => (
                        <td key={r.id} style={{ padding: '12px 16px', fontSize: '12px', color: 'white', fontWeight: 700, textAlign: 'center', borderLeft: '1px solid #0d1520' }}>
                          {r.report?.company_name || (() => { try { return new URL(r.url).hostname } catch { return r.url } })()}
                          {r.id === winner?.id && <span style={{ marginLeft: '6px', fontSize: '10px', color: '#4ade80' }}>🏆</span>}
                        </td>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {[
                      ['Overall Score', 'overall_score'],
                      ['Trust', 'trust_score'],
                      ['Conversion', 'conversion_score'],
                      ['Security', 'security_score'],
                      ['Mobile', 'mobile_score'],
                    ].map(([label, key]) => {
                      const scores = results.map(r => r[key] || 0)
                      const maxScore = Math.max(...scores)
                      return (
                        <tr key={key} style={{ borderTop: '1px solid #0d1520' }}>
                          <td style={{ padding: '12px 20px', fontSize: '12px', color: '#64748b', fontWeight: 600 }}>{label}</td>
                          {results.map(r => {
                            const val = r[key] || 0
                            const isMax = val === maxScore && maxScore > 0
                            return (
                              <td key={r.id} style={{ padding: '12px 16px', textAlign: 'center', borderLeft: '1px solid #0d1520' }}>
                                <div style={{ fontSize: '20px', fontWeight: 900, color: sc(val) }}>{val || '—'}</div>
                                <div style={{ height: '4px', background: '#1e2a3a', borderRadius: '4px', marginTop: '6px', overflow: 'hidden' }}>
                                  <div style={{ height: '4px', width: `${val}%`, background: sc(val), borderRadius: '4px' }} />
                                </div>
                                {isMax && scores.filter(s => s === maxScore).length === 1 && (
                                  <div style={{ fontSize: '9px', color: '#4ade80', marginTop: '2px', fontWeight: 700 }}>BEST</div>
                                )}
                              </td>
                            )
                          })}
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Industry & compliance comparison */}
            <div style={{ background: '#0f1420', border: '1px solid #1e2a3a', borderRadius: '16px', overflow: 'hidden', marginBottom: '20px' }}>
              <div style={{ padding: '16px 20px', borderBottom: '1px solid #0d1520', fontSize: '11px', fontWeight: 700, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.08em' }}>COMPLIANCE & SIGNALS</div>
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr style={{ background: '#0a0f1a' }}>
                      <td style={{ padding: '12px 20px', fontSize: '11px', color: '#475569', fontWeight: 700 }}>Signal</td>
                      {results.map(r => (
                        <td key={r.id} style={{ padding: '12px 16px', fontSize: '12px', color: 'white', fontWeight: 700, textAlign: 'center', borderLeft: '1px solid #0d1520' }}>
                          {r.report?.company_name || (() => { try { return new URL(r.url).hostname } catch { return r.url } })()}
                        </td>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {[
                      ['Industry', (r: any) => r.report?.industry || '—'],
                      ['Grade', (r: any) => r.report?.grade || r.grade || '—'],
                      ['Mobile', (r: any) => r.report?.mobile_readiness || '—'],
                      ['Pricing Clarity', (r: any) => r.report?.pricing_clarity || '—'],
                      ['CTA', (r: any) => r.report?.cta_effectiveness || '—'],
                      ['Cookie Consent', (r: any) => r.report?.cookie_consent_score > 0 ? '✓' : '✗'],
                      ['Privacy Policy', (r: any) => r.report?.privacy_policy_score > 0 ? '✓' : '✗'],
                      ['HTTPS', (r: any) => r.url?.startsWith('https') ? '✓' : '✗'],
                    ].map(([label, getter]) => (
                      <tr key={label as string} style={{ borderTop: '1px solid #0d1520' }}>
                        <td style={{ padding: '10px 20px', fontSize: '12px', color: '#64748b', fontWeight: 600 }}>{label as string}</td>
                        {results.map(r => {
                          const val = (getter as Function)(r)
                          const good = ['✓', 'Good', 'Clear', 'Strong', 'A', 'B'].includes(val)
                          const bad = ['✗', 'Poor', 'Hidden', 'Missing', 'F'].includes(val)
                          return (
                            <td key={r.id} style={{ padding: '10px 16px', textAlign: 'center', borderLeft: '1px solid #0d1520', fontSize: '12px', fontWeight: 600, color: good ? '#4ade80' : bad ? '#f87171' : '#94a3b8' }}>
                              {val}
                            </td>
                          )
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Key insights per site */}
            <div style={{ display: 'grid', gridTemplateColumns: `repeat(${Math.min(results.length, 3)}, 1fr)`, gap: '16px' }}>
              {results.map(r => {
                const name = r.report?.company_name || (() => { try { return new URL(r.url).hostname } catch { return r.url } })()
                const score = r.overall_score || 0
                const isWinner = r.id === winner?.id
                return (
                  <div key={r.id} style={{ background: '#0f1420', border: `1px solid ${isWinner ? '#166534' : '#1e2a3a'}`, borderRadius: '14px', padding: '20px' }}>
                    {isWinner && <div style={{ fontSize: '10px', fontWeight: 700, color: '#4ade80', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '8px' }}>🏆 TOP PERFORMER</div>}
                    <div style={{ fontSize: '16px', fontWeight: 800, color: 'white', marginBottom: '4px' }}>{name}</div>
                    <div style={{ fontSize: '11px', color: '#334155', marginBottom: '12px' }}>{r.url}</div>
                    <div style={{ fontSize: '36px', fontWeight: 900, color: sc(score), marginBottom: '4px' }}>{score}/100</div>

                    {r.report?.executive_verdict && (
                      <div style={{ fontSize: '12px', color: '#64748b', fontStyle: 'italic', lineHeight: 1.6, borderLeft: '2px solid #6366f1', paddingLeft: '10px', marginBottom: '12px' }}>
                        "{r.report.executive_verdict}"
                      </div>
                    )}

                    {(r.report?.ux_friction_points || []).slice(0, 3).map((p: string, i: number) => (
                      <div key={i} style={{ fontSize: '11px', color: '#64748b', padding: '5px 0', borderBottom: '1px solid #0d1520' }}>⚠ {p}</div>
                    ))}

                    <div style={{ display: 'flex', gap: '8px', marginTop: '12px' }}>
                      <a href={`/reports/${r.id}`} style={{ fontSize: '11px', color: '#818cf8', textDecoration: 'none', border: '1px solid #3b4fd8', borderRadius: '6px', padding: '5px 10px' }}>Full Report →</a>
                    </div>
                  </div>
                )
              })}
            </div>
          </>
        )}
      </div>
    </div>
  )
}
