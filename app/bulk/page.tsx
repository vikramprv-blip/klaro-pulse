'use client'
import { useState, useEffect } from 'react'
import { getUserProfile } from '@/lib/auth'

function sc(s: number) { return s >= 75 ? '#4ade80' : s >= 50 ? '#fbbf24' : '#f87171' }

export default function BulkPage() {
  const [profile, setProfile] = useState<any>(null)
  const [urlText, setUrlText] = useState('')
  const [scanning, setScanning] = useState(false)
  const [results, setResults] = useState<any[]>([])
  const [current, setCurrent] = useState('')
  const [progress, setProgress] = useState({ done: 0, total: 0 })

  useEffect(() => {
    getUserProfile().then(p => {
      if (!p) { window.location.href = '/signin'; return }
      if (!p.is_admin && !['growth','agency','enterprise'].includes(p.plan)) {
        window.location.href = '/settings'
        return
      }
      setProfile(p)
    })
  }, [])

  async function runBulk() {
    const urls = urlText.split('\n').map(u => u.trim()).filter(u => u.startsWith('http'))
    if (!urls.length) return
    setScanning(true)
    setResults([])
    setProgress({ done: 0, total: urls.length })
    const scanned: any[] = []

    for (let i = 0; i < urls.length; i++) {
      const url = urls[i]
      setCurrent(url)
      setProgress({ done: i, total: urls.length })
      try {
        const res = await fetch('/api/pulse/scan', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ url })
        })
        const data = await res.json()
        if (data.ok) {
          const rep = await fetch('/api/pulse/reports').then(r => r.json())
          const scan = (rep.scans || []).find((s: any) => s.id === data.scan_id)
          if (scan) { scanned.push(scan); setResults([...scanned]) }
        }
      } catch (e) { console.error('Failed:', url) }
    }

    setProgress({ done: urls.length, total: urls.length })
    setScanning(false)
    setCurrent('')
  }

  const avgScore = results.length ? Math.round(results.reduce((a, b) => a + (b.overall_score || 0), 0) / results.length) : 0
  const critical = results.filter(r => (r.overall_score || 0) < 50).length
  const strong = results.filter(r => (r.overall_score || 0) >= 75).length

  return (
    <div style={{ minHeight: '100vh', background: '#080c14', color: '#94a3b8' }}>
      <div style={{ background: '#0a0f1a', borderBottom: '1px solid #1e2a3a', padding: '0 24px', height: '56px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', position: 'sticky', top: 0, zIndex: 20 }}>
        <div style={{ fontSize: '16px', fontWeight: 900, color: 'white' }}>KLARO <span style={{ color: '#6366f1' }}>PULSE</span> <span style={{ fontSize: '11px', color: '#475569', marginLeft: '8px' }}>BULK SCAN</span></div>
        <a href="/dashboard" style={{ fontSize: '12px', color: '#818cf8', textDecoration: 'none', border: '1px solid #3b4fd8', borderRadius: '8px', padding: '5px 12px' }}>← Dashboard</a>
      </div>

      <div style={{ maxWidth: '1000px', margin: '0 auto', padding: '32px 24px' }}>
        <div style={{ background: '#0f1420', border: '1px solid #1e2a3a', borderRadius: '16px', padding: '24px', marginBottom: '24px' }}>
          <div style={{ fontSize: '16px', fontWeight: 800, color: 'white', marginBottom: '8px' }}>⚡ Bulk Site Scanner</div>
          <div style={{ fontSize: '12px', color: '#64748b', marginBottom: '16px' }}>One URL per line. Scans sequentially — each takes 30-60 seconds.</div>
          <textarea style={{ width: '100%', height: '160px', background: '#080c14', border: '1px solid #1e2a3a', borderRadius: '10px', padding: '12px', color: 'white', fontSize: '13px', outline: 'none', fontFamily: 'inherit', resize: 'vertical', boxSizing: 'border-box' as const }}
            placeholder={'https://client1.com\nhttps://client2.com\nhttps://competitor.com\nhttps://prospect.com'}
            value={urlText} onChange={e => setUrlText(e.target.value)} />

          {scanning && (
            <div style={{ margin: '12px 0', background: '#0a0d18', border: '1px solid #3b4fd8', borderRadius: '10px', padding: '14px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', fontSize: '12px' }}>
                <span style={{ color: '#818cf8' }}>Scanning: {current}</span>
                <span style={{ color: '#475569' }}>{progress.done}/{progress.total} complete</span>
              </div>
              <div style={{ height: '6px', background: '#1e2a3a', borderRadius: '6px', overflow: 'hidden' }}>
                <div style={{ height: '6px', width: `${progress.total ? (progress.done / progress.total) * 100 : 0}%`, background: 'linear-gradient(90deg,#6366f1,#8b5cf6)', borderRadius: '6px', transition: 'width 0.5s ease' }} />
              </div>
            </div>
          )}

          <button style={{ marginTop: '12px', padding: '10px 24px', background: 'linear-gradient(135deg,#6366f1,#8b5cf6)', color: 'white', border: 'none', borderRadius: '10px', fontSize: '13px', fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit', opacity: scanning ? 0.7 : 1 }}
            onClick={runBulk} disabled={scanning}>
            {scanning ? `⏳ Scanning ${progress.done + 1} of ${progress.total}...` : 'Run Bulk Scan →'}
          </button>
        </div>

        {results.length > 0 && (
          <>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: '12px', marginBottom: '20px' }}>
              {[
                { val: results.length, label: 'Scanned', color: '#818cf8' },
                { val: avgScore, label: 'Avg Score', color: '#4ade80' },
                { val: strong, label: 'Strong (75+)', color: '#4ade80' },
                { val: critical, label: 'Critical (<50)', color: '#f87171' },
              ].map(({ val, label, color }) => (
                <div key={label} style={{ background: '#0f1420', border: '1px solid #1e2a3a', borderRadius: '12px', padding: '16px', textAlign: 'center' }}>
                  <div style={{ fontSize: '28px', fontWeight: 900, color }}>{val}</div>
                  <div style={{ fontSize: '10px', color: '#475569', textTransform: 'uppercase', letterSpacing: '0.06em', marginTop: '4px' }}>{label}</div>
                </div>
              ))}
            </div>

            <div style={{ background: '#0f1420', border: '1px solid #1e2a3a', borderRadius: '16px', overflow: 'hidden' }}>
              <div style={{ padding: '14px 20px', borderBottom: '1px solid #0d1520', display: 'flex', gap: '20px', fontSize: '10px', fontWeight: 700, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                <span style={{ flex: 3 }}>Site</span>
                <span style={{ flex: 1, textAlign: 'center' }}>Score</span>
                <span style={{ flex: 1, textAlign: 'center' }}>Trust</span>
                <span style={{ flex: 1, textAlign: 'center' }}>Conversion</span>
                <span style={{ flex: 1, textAlign: 'center' }}>Security</span>
                <span style={{ flex: 1, textAlign: 'center' }}>Grade</span>
                <span style={{ flex: 1 }}>Action</span>
              </div>
              {results.sort((a, b) => (b.overall_score || 0) - (a.overall_score || 0)).map(r => {
                const name = r.report?.company_name || (() => { try { return new URL(r.url).hostname } catch { return r.url } })()
                const score = r.overall_score || 0
                return (
                  <div key={r.id} style={{ padding: '12px 20px', borderBottom: '1px solid #0d1520', display: 'flex', gap: '20px', alignItems: 'center' }}>
                    <div style={{ flex: 3 }}>
                      <div style={{ fontSize: '13px', fontWeight: 700, color: 'white' }}>{name}</div>
                      <div style={{ fontSize: '11px', color: '#334155' }}>{r.url}</div>
                    </div>
                    <div style={{ flex: 1, textAlign: 'center', fontSize: '18px', fontWeight: 900, color: sc(score) }}>{score}</div>
                    <div style={{ flex: 1, textAlign: 'center', fontSize: '14px', fontWeight: 700, color: sc(r.trust_score || 0) }}>{r.trust_score || '—'}</div>
                    <div style={{ flex: 1, textAlign: 'center', fontSize: '14px', fontWeight: 700, color: sc(r.conversion_score || 0) }}>{r.conversion_score || '—'}</div>
                    <div style={{ flex: 1, textAlign: 'center', fontSize: '14px', fontWeight: 700, color: sc(r.security_score || 0) }}>{r.security_score || '—'}</div>
                    <div style={{ flex: 1, textAlign: 'center', fontSize: '14px', fontWeight: 700, color: sc(score) }}>{r.report?.grade || '—'}</div>
                    <div style={{ flex: 1 }}>
                      <a href={`/reports/${r.id}`} style={{ fontSize: '11px', color: '#818cf8', textDecoration: 'none', border: '1px solid #3b4fd8', borderRadius: '6px', padding: '4px 8px' }}>Report</a>
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
