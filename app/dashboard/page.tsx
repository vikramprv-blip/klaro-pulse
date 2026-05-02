'use client'
import { useState, useEffect, useCallback, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import { getUserProfile } from '@/lib/auth'

const PLAN_LIMITS: Record<string, any> = {
  trial:      { scans: 1,   compare: 1,  bulk: false, lam: false,  label: 'Trial' },
  free:       { scans: 1,   compare: 0,  bulk: false, lam: false,  label: 'Free' },
  single:     { scans: 1,   compare: 2,  bulk: false, lam: false,  label: 'Single Report' },
  starter:    { scans: 5,   compare: 2,  bulk: false, lam: false,  label: 'Starter' },
  growth:     { scans: 20,  compare: 3,  bulk: true,  lam: false,  label: 'Growth' },
  agency:     { scans: 999, compare: 5,  bulk: true,  lam: true,   label: 'Agency' },
  enterprise: { scans: 999, compare: 5,  bulk: true,  lam: true,   label: 'Enterprise' },
}

function sc(s: number) { return s >= 75 ? '#4ade80' : s >= 50 ? '#fbbf24' : '#f87171' }
function scBorder(s: number) { return s >= 75 ? '#166634' : s >= 50 ? '#92400e' : '#991b1b' }
function ago(ts: string) {
  if (!ts) return '—'
  const m = Math.floor((Date.now() - new Date(ts).getTime()) / 60000)
  if (m < 1) return 'just now'
  if (m < 60) return m + 'm ago'
  if (m < 1440) return Math.floor(m / 60) + 'h ago'
  return Math.floor(m / 1440) + 'd ago'
}

export default function Dashboard() {
  const [user, setUser] = useState<any>(null)
  const [profile, setProfile] = useState<any>(null)
  const [profileLoaded, setProfileLoaded] = useState(false)
  const [scans, setScans] = useState<any[]>([])
  const [lamRuns, setLamRuns] = useState<any[]>([])
  const [mode, setMode] = useState<'llm'|'compare'|'bulk'|'lam'>('llm')
  const [filter, setFilter] = useState('all')
  const [search, setSearch] = useState('')
  const [urlInput, setUrlInput] = useState('')
  const [compareUrls, setCompareUrls] = useState(['',''])
  const [bulkText, setBulkText] = useState('')
  const [lamUrl, setLamUrl] = useState('')
  const [scanning, setScanning] = useState(false)
  const [activeScanId, setActiveScanId] = useState<string|null>(null)
  const [scanStatus, setScanStatus] = useState<{msg:string,type:'scanning'|'success'|'error'}|null>(null)
  const [expandedCards, setExpandedCards] = useState<Set<string>>(new Set())
  const pollRef = useRef<any>(null)
  const sb = createClient()

  const loadScans = useCallback(async () => {
    const res = await fetch('/api/pulse/reports')
    if (!res.ok) return
    const data = await res.json()
    setScans(data.scans || [])
    setLamRuns(data.lam || [])
  }, [])

  useEffect(() => {
    getUserProfile().then(p => {
      if (!p) { window.location.href = '/signin'; return }
      setUser({ id: p.id, email: p.email })
      setProfile(p)
      setProfileLoaded(true)
      loadScans()
    })
  }, [])

  // Poll every 2s when there's an active scan
  useEffect(() => {
    if (activeScanId) {
      pollRef.current = setInterval(() => loadScans(), 2000)
    } else {
      clearInterval(pollRef.current)
    }
    return () => clearInterval(pollRef.current)
  }, [activeScanId])

  const plan = profile?.plan || 'trial'
  const limits = PLAN_LIMITS[plan] || PLAN_LIMITS.trial
  const isAdmin = profile?.is_admin || false

  const isLocked = (feature: string) => {
    if (!profileLoaded || isAdmin) return false
    if (feature === 'bulk') return !limits.bulk
    if (feature === 'lam') return !limits.lam
    if (feature === 'compare') return limits.compare === 0
    return false
  }

  async function triggerScan(url: string, scanType = 'llm') {
    setScanning(true)
    setScanStatus({ msg: `⏳ Connecting to ${url}...`, type: 'scanning' })
    try {
      if (scanType === 'lam') {
        const res = await fetch('/api/pulse/trigger', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ target_url: url, scan_mode: 'lam' })
        })
        const data = await res.json()
        if (data.ok) {
          setScanStatus({ msg: `🤖 ${data.message}`, type: 'success' })
          await loadScans()
        } else throw new Error(data.error || 'LAM trigger failed')
        setScanning(false)
      } else {
        // Fire scan — it will update progress in DB as it runs
        const res = await fetch('/api/pulse/scan', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ url })
        })
        const data = await res.json()
        setScanning(false)
        if (data.ok) {
          setScanStatus({ msg: `✅ Scan complete — score: ${data.score}/100`, type: 'success' })
          setActiveScanId(null)
        } else {
          setScanStatus({ msg: `❌ ${data.error || 'Scan failed'}`, type: 'error' })
          setActiveScanId(null)
        }
        await loadScans()
      }
    } catch (e: any) {
      setScanning(false)
      setActiveScanId(null)
      setScanStatus({ msg: `❌ ${e.message}`, type: 'error' })
    }
    setTimeout(() => setScanStatus(null), 10000)
  }

  async function handleScan() {
    if (mode === 'llm') {
      if (!urlInput.startsWith('http')) { setScanStatus({ msg: 'Enter a valid URL starting with https://', type: 'error' }); return }
      const url = urlInput.trim()
      setUrlInput('')
      // Start polling immediately
      setActiveScanId('pending')
      await loadScans()
      await triggerScan(url, 'llm')
    } else if (mode === 'compare') {
      const urls = compareUrls.filter(u => u.startsWith('http'))
      if (urls.length < 2) { setScanStatus({ msg: 'Enter at least 2 valid URLs', type: 'error' }); return }
      setActiveScanId('pending')
      for (const u of urls) await triggerScan(u, 'compare')
      setActiveScanId(null)
    } else if (mode === 'bulk') {
      const urls = bulkText.split('\n').map(u => u.trim()).filter(u => u.startsWith('http'))
      if (!urls.length) { setScanStatus({ msg: 'Enter at least 1 URL per line', type: 'error' }); return }
      setActiveScanId('pending')
      for (const u of urls) await triggerScan(u, 'bulk')
      setActiveScanId(null)
    } else if (mode === 'lam') {
      if (!lamUrl.startsWith('http')) { setScanStatus({ msg: 'Enter a valid URL', type: 'error' }); return }
      const url = lamUrl.trim()
      setLamUrl('')
      await triggerScan(url, 'lam')
    }
  }

  async function cancelScan(scanId: string) {
    await fetch('/api/pulse/cancel', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ scan_id: scanId })
    })
    setActiveScanId(null)
    setScanning(false)
    setScanStatus(null)
    await loadScans()
  }

  function toggleCard(id: string) {
    setExpandedCards(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n })
  }

  const allItems = [
    ...scans.map(s => ({ ...s, _type: 'llm' })),
    ...lamRuns.map(l => ({ ...l, _type: 'lam' }))
  ].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())

  const filtered = allItems.filter(s => {
    if (filter === 'strong' && (s.overall_score || 0) < 75) return false
    if (filter === 'needs' && ((s.overall_score || 0) < 50 || (s.overall_score || 0) >= 75)) return false
    if (filter === 'critical' && (s.overall_score || 0) >= 50) return false
    if (filter === 'error' && s.status !== 'error') return false
    if (filter === 'lam' && s._type !== 'lam') return false
    if (search && !s.url?.toLowerCase().includes(search.toLowerCase())) return false
    return true
  })

  const scores = scans.filter(s => s.overall_score && s.status === 'complete')
  const avgScore = scores.length ? Math.round(scores.reduce((a, b) => a + (b.overall_score || 0), 0) / scores.length) : 0
  const trialDaysLeft = profile?.trial_ends_at ? Math.max(0, Math.ceil((new Date(profile.trial_ends_at).getTime() - Date.now()) / 86400000)) : null

  if (!profileLoaded) return (
    <div style={{ minHeight: '100vh', background: '#080c14', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ color: '#6366f1', fontSize: '14px' }}>Loading...</div>
    </div>
  )

  return (
    <div style={S.page}>
      <div style={S.topbar}>
        <div style={S.topLogo}>KLARO <span style={S.accent}>PULSE</span></div>
        <div style={S.topRight}>
          {isAdmin && <div style={S.planBadge}>Enterprise · Admin</div>}
          {!isAdmin && plan === 'trial' && trialDaysLeft !== null && trialDaysLeft < 9999 && (
            <div style={S.trialBadge}>{trialDaysLeft}d trial · <a href="/settings" style={{ color: '#818cf8' }}>Upgrade</a></div>
          )}
          {!isAdmin && plan !== 'trial' && <div style={S.planBadge}>{limits.label}</div>}
          <div style={S.userPill}>
            <div style={S.avatar}>{user?.email?.charAt(0).toUpperCase()}</div>
            <span style={S.userEmail}>{user?.email}</span>
          </div>
          {isAdmin && <a href="/admin" style={S.adminBtn}>⚙ Admin</a>}
          <button style={S.signOutBtn} onClick={async () => { await sb.auth.signOut(); window.location.href = '/signin' }}>Sign out</button>
        </div>
      </div>

      <div style={S.main}>
        <div style={S.scanBar}>
          <div style={S.scanBarTop}>
            <div style={S.scanBarTitle}>🔍 Scan any website</div>
            <div style={S.tabs}>
              {(['llm', 'compare', 'bulk', 'lam'] as const).map(m => (
                <button key={m} onClick={() => setMode(m)}
                  style={{ ...S.tab, ...(mode === m ? S.tabActive : {}), ...(isLocked(m) ? S.tabLocked : {}) }}>
                  {m === 'llm' ? 'Single Site' : m === 'compare' ? 'Compare' : m === 'bulk' ? 'Bulk' : 'LAM Audit'}
                  {isLocked(m) && ' 🔒'}
                </button>
              ))}
            </div>
          </div>

          {isLocked(mode) ? (
            <div style={S.upgradeBox}>
              <div style={{ fontWeight: 700, color: 'white', marginBottom: '6px' }}>
                {mode === 'lam' ? '🤖 LAM Audit — Agency plan ($599/mo)' : mode === 'bulk' ? '⚡ Bulk scanning — Growth plan ($399/mo)' : '📊 Compare — Starter plan ($149/mo)'}
              </div>
              <a href="/settings" style={S.upgradeBtn}>Upgrade Plan →</a>
            </div>
          ) : (
            <>
              {mode === 'llm' && (
                <div style={S.inputRow}>
                  <input style={S.urlInput} type="url" placeholder="https://anywebsite.com" value={urlInput}
                    onChange={e => setUrlInput(e.target.value)} onKeyDown={e => e.key === 'Enter' && !scanning && handleScan()} />
                  <button style={{ ...S.scanBtn, opacity: scanning ? 0.7 : 1 }} onClick={handleScan} disabled={scanning}>
                    {scanning ? '⏳ Scanning...' : 'Scan Now →'}
                  </button>
                </div>
              )}
              {mode === 'compare' && (
                <div>
                  {compareUrls.map((u, i) => (
                    <input key={i} style={{ ...S.urlInput, marginBottom: '8px', width: '100%', boxSizing: 'border-box' as const }}
                      placeholder={i === 0 ? 'https://your-site.com' : `https://competitor${i}.com`}
                      value={u} onChange={e => { const n = [...compareUrls]; n[i] = e.target.value; setCompareUrls(n) }} />
                  ))}
                  <div style={{ display: 'flex', gap: '8px', marginTop: '4px' }}>
                    {compareUrls.length < limits.compare && (
                      <button style={S.ghostBtn} onClick={() => setCompareUrls([...compareUrls, ''])}>+ Add URL</button>
                    )}
                    <button style={S.scanBtn} onClick={handleScan} disabled={scanning}>Compare All →</button>
                  </div>
                </div>
              )}
              {mode === 'bulk' && (
                <div>
                  <textarea style={{ ...S.urlInput, height: '100px', resize: 'vertical' as const, width: '100%', boxSizing: 'border-box' as const }}
                    placeholder={'https://site1.com\nhttps://site2.com\nhttps://site3.com'}
                    value={bulkText} onChange={e => setBulkText(e.target.value)} />
                  <button style={{ ...S.scanBtn, marginTop: '8px' }} onClick={handleScan} disabled={scanning}>Run Bulk Scan →</button>
                </div>
              )}
              {mode === 'lam' && (
                <div>
                  <div style={{ fontSize: '12px', color: '#64748b', marginBottom: '10px' }}>
                    🤖 AI visits your site as a real potential client. Full ADA, SOC & conversion audit. 8-12 min.
                  </div>
                  <div style={S.inputRow}>
                    <input style={S.urlInput} type="url" placeholder="https://yoursite.com" value={lamUrl}
                      onChange={e => setLamUrl(e.target.value)} />
                    <button style={{ ...S.scanBtn, background: 'linear-gradient(135deg,#7c3aed,#a855f7)' }}
                      onClick={handleScan} disabled={scanning}>
                      {scanning ? '⏳ Queuing...' : 'Run LAM Audit →'}
                    </button>
                  </div>
                </div>
              )}

              {/* Live scan progress bar in scan bar */}
              {scanning && activeScanId && (
                <div style={{ marginTop: '16px', background: '#080c14', border: '1px solid #3b4fd8', borderRadius: '12px', padding: '16px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                    <span style={{ fontSize: '12px', color: '#818cf8', fontWeight: 600 }}>
                      {scans.find(s => s.status === 'scanning')?.progress_message || 'Scanning...'}
                    </span>
                    <button style={S.cancelBtn} onClick={() => {
                      const activeScan = scans.find(s => s.status === 'scanning')
                      if (activeScan) cancelScan(activeScan.id)
                      else { setScanning(false); setActiveScanId(null) }
                    }}>✕ Cancel</button>
                  </div>
                  <div style={S.progressTrack}>
                    <div style={{
                      ...S.progressFill,
                      width: `${scans.find(s => s.status === 'scanning')?.progress || 10}%`,
                      transition: 'width 1s ease'
                    }} />
                  </div>
                  <div style={{ fontSize: '11px', color: '#334155', marginTop: '6px' }}>
                    Results will appear below when complete · Takes 20-40 seconds
                  </div>
                </div>
              )}

              {scanStatus && !scanning && (
                <div style={{ ...S.statusBar, ...(scanStatus.type === 'error' ? S.statusError : scanStatus.type === 'success' ? S.statusSuccess : S.statusScanning) }}>
                  {scanStatus.msg}
                </div>
              )}
            </>
          )}
        </div>

        <div style={S.statsRow}>
          {[
            { val: scans.length + lamRuns.length, label: 'Total Scans', color: '#818cf8' },
            { val: avgScore || '—', label: 'Avg Score', color: '#4ade80', sub: 'out of 100' },
            { val: scans.filter(s => (s.overall_score || 0) < 50 && s.status === 'complete').length, label: 'Need Urgent Fix', color: '#f87171', sub: 'score below 50' },
            { val: allItems.filter(s => s.status === 'scanning' || s.status === 'pending').length, label: 'In Progress', color: '#fbbf24' },
          ].map(({ val, label, color, sub }) => (
            <div key={label} style={S.statCard}>
              <div style={{ ...S.statVal, color }}>{val}</div>
              <div style={S.statLabel}>{label}</div>
              {sub && <div style={S.statSub}>{sub}</div>}
            </div>
          ))}
        </div>

        <div style={S.filterRow}>
          <span style={S.filterLabel}>Filter:</span>
          {[['all','All'],['strong','Strong (75+)'],['needs','Needs Work'],['critical','Critical (<50)'],['error','Errors'],['lam','LAM Only']].map(([val,label]) => (
            <button key={val} style={{ ...S.filterBtn, ...(filter === val ? S.filterBtnActive : {}) }} onClick={() => setFilter(val)}>{label}</button>
          ))}
          <input style={S.searchInput} placeholder="Search URLs..." value={search} onChange={e => setSearch(e.target.value)} />
        </div>

        <div>
          {filtered.length === 0 && (
            <div style={S.empty}>
              <div style={{ fontSize: '48px', marginBottom: '16px' }}>📡</div>
              <div style={{ fontSize: '18px', fontWeight: 700, color: '#334155', marginBottom: '8px' }}>
                {allItems.length === 0 ? 'No scans yet' : 'No results for this filter'}
              </div>
              <div style={{ fontSize: '13px' }}>{allItems.length === 0 ? 'Enter a URL above and click Scan Now' : 'Try a different filter'}</div>
            </div>
          )}
          {filtered.map(item => {
            const isLam = item._type === 'lam'
            const score = item.overall_score || 0
            const isPending = item.status === 'pending' || item.status === 'scanning'
            const isExpanded = expandedCards.has(item.id)
            const r = item.report || {}
            const name = (() => { try { return new URL(item.url).hostname } catch { return item.url } })()
            return (
              <div key={item.id} style={{ ...S.card, ...(isPending ? { borderColor: '#3b4fd8' } : {}) }}>
                <div style={S.cardHeader}>
                  <div style={{ flex: 1 }}>
                    <div style={S.cardName}>{name}</div>
                    <a href={item.url} target="_blank" rel="noreferrer" style={S.cardUrl}>{item.url}</a>
                    <div style={S.cardMeta}>
                      {ago(item.created_at)} · <span style={{ color: isPending ? '#818cf8' : item.status === 'complete' ? '#4ade80' : item.status === 'error' ? '#f87171' : '#475569' }}>{item.status}</span>
                      {isLam && <span style={{ color: '#a78bfa', fontWeight: 700 }}> · LAM</span>}
                      {item.scan_type === 'compare' && <span style={{ color: '#60a5fa', fontWeight: 700 }}> · COMPARE</span>}
                      {item.scan_type === 'bulk' && <span style={{ color: '#34d399', fontWeight: 700 }}> · BULK</span>}
                    </div>
                    {isPending && (
                      <div style={S.progressWrap}>
                        <div style={{ flex: 1 }}>
                          <div style={S.progressTrack}>
                            <div style={{ ...S.progressFill, width: `${item.progress || 5}%` }} />
                          </div>
                          <div style={{ fontSize: '11px', color: '#64748b', marginTop: '4px' }}>{item.progress_message || 'Starting...'}</div>
                        </div>
                        <button style={S.cancelBtn} onClick={() => cancelScan(item.id)}>✕ Cancel</button>
                      </div>
                    )}
                  </div>
                  {!isPending && score > 0 && (
                    <div style={{ textAlign: 'center', flexShrink: 0 }}>
                      <div style={{ ...S.scoreRing, borderColor: scBorder(score), color: sc(score) }}>
                        <div style={{ fontSize: '22px', fontWeight: 900, lineHeight: 1 }}>{score}</div>
                        <div style={{ fontSize: '9px', opacity: 0.6, fontWeight: 700, textTransform: 'uppercase' as const }}>/100</div>
                      </div>
                      {item.grade && <div style={{ fontSize: '10px', color: '#475569', marginTop: '4px', fontWeight: 700 }}>Grade {item.grade}</div>}
                    </div>
                  )}
                </div>
                {!isPending && item.status === 'complete' && (
                  <>
                    {!isLam && (
                      <div style={S.bars}>
                        {[['Trust', item.trust_score],['Conversion', item.conversion_score],['Security', item.security_score],['Mobile', item.mobile_score]].map(([label, val]) => (
                          val ? <div key={label as string} style={S.barItem}>
                            <div style={S.barLabel}><span>{label}</span><span style={{ color: sc(val as number) }}>{val}/100</span></div>
                            <div style={S.barTrack}><div style={{ ...S.barFill, width: `${val}%`, background: sc(val as number) }} /></div>
                          </div> : null
                        ))}
                      </div>
                    )}
                    {isLam && (
                      <div style={S.bars}>
                        {[['LAM', item.lam_score],['ADA', item.ada_score],['SOC', item.soc_score],['Conversion', item.conversion_score]].map(([label, val]) => (
                          val ? <div key={label as string} style={S.barItem}>
                            <div style={S.barLabel}><span>{label}</span><span style={{ color: sc(val as number) }}>{val}/100</span></div>
                            <div style={S.barTrack}><div style={{ ...S.barFill, width: `${val}%`, background: sc(val as number) }} /></div>
                          </div> : null
                        ))}
                      </div>
                    )}
                    {(r.one_line_verdict || r.novice_summary || item.executive_brief?.one_line_verdict) && (
                      <div style={S.summary}>{r.one_line_verdict || r.novice_summary || item.executive_brief?.one_line_verdict}</div>
                    )}
                    {isExpanded && !isLam && (
                      <div style={S.detail}>
                        <div style={S.detailGrid}>
                          <div>
                            <div style={{ ...S.detailHead, color: '#f87171' }}>�� Problems Found</div>
                            {(r.ux_friction_points || []).map((p: string, i: number) => <div key={i} style={S.detailItem}>⚠ {p}</div>)}
                            {!(r.ux_friction_points||[]).length && <div style={{ ...S.detailItem, color: '#334155' }}>None detected</div>}
                          </div>
                          <div>
                            <div style={{ ...S.detailHead, color: '#4ade80' }}>🟢 How to Fix</div>
                            {(r.resolution_steps || []).map((p: string, i: number) => <div key={i} style={S.detailItem}><span style={{ color: '#4ade80', fontWeight: 700 }}>0{i+1}</span> {p}</div>)}
                          </div>
                          <div>
                            <div style={{ ...S.detailHead, color: '#fbbf24' }}>💰 Revenue Opportunities</div>
                            {(r.revenue_opportunities || []).map((p: string, i: number) => <div key={i} style={S.detailItem}>💰 {p}</div>)}
                          </div>
                        </div>
                        {(r.strengths || []).length > 0 && (
                          <div style={{ padding: '0 20px 16px' }}>
                            <div style={{ ...S.detailHead, color: '#60a5fa', marginBottom: '8px' }}>✓ Strengths</div>
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                              {(r.strengths || []).map((s: string, i: number) => (
                                <span key={i} style={{ fontSize: '11px', background: '#0c1a3a', color: '#818cf8', border: '1px solid #3b4fd8', borderRadius: '20px', padding: '3px 10px' }}>✓ {s}</span>
                              ))}
                            </div>
                          </div>
                        )}
                        {r.priority_actions && (
                          <div style={{ padding: '0 20px 16px' }}>
                            <div style={{ ...S.detailHead, color: '#fbbf24', marginBottom: '10px' }}>📅 Priority Actions</div>
                            {[['This Week', r.priority_actions.week_1, '#f87171'], ['This Month', r.priority_actions.month_1, '#fbbf24'], ['This Quarter', r.priority_actions.quarter_1, '#4ade80']].map(([label, val, color]) => val ? (
                              <div key={label as string} style={{ ...S.detailItem, marginBottom: '6px', borderLeft: `3px solid ${color}` }}>
                                <span style={{ fontSize: '10px', fontWeight: 700, color: color as string, display: 'block', marginBottom: '2px' }}>{label as string}</span>
                                {val as string}
                              </div>
                            ) : null)}
                          </div>
                        )}
                      </div>
                    )}
                    {isExpanded && isLam && (
                      <div style={S.detail}>
                        <div style={{ padding: '16px 20px' }}>
                          <div style={{ ...S.detailHead, color: '#818cf8', marginBottom: '10px' }}>📋 Top Actions</div>
                          {(item.executive_brief?.top_3_actions || []).map((a: string, i: number) => (
                            <div key={i} style={{ ...S.detailItem, marginBottom: '6px' }}><span style={{ color: '#818cf8', fontWeight: 700 }}>0{i+1}</span> {a}</div>
                          ))}
                        </div>
                      </div>
                    )}
                    <div style={S.cardActions}>
                      <button style={S.ghostBtn} onClick={() => toggleCard(item.id)}>{isExpanded ? '▲ Hide details' : '▼ View full analysis'}</button>
                      {isLam && <a href={`/reports/lam/${item.id}`} style={{ ...S.ghostBtn, textDecoration: 'none', display: 'inline-block' }}>📄 Full LAM Report</a>}
                      <a href={`/reports/${item.id}`} style={{ ...S.ghostBtn, textDecoration: 'none', display: 'inline-block' }}>📄 Full Report</a>n                      <button style={S.ghostBtn} onClick={() => triggerScan(item.url, isLam ? 'lam' : 'llm')}>↺ Re-scan</button>
                    </div>
                  </>
                )}
                {item.status === 'error' && (
                  <div style={{ padding: '12px 20px', color: '#f87171', fontSize: '12px', borderTop: '1px solid #0d1520' }}>
                    ❌ {item.error_text || 'Scan failed.'} &nbsp;
                    <button style={S.ghostBtn} onClick={() => triggerScan(item.url)}>Retry →</button>
                  </div>
                )}
                {item.status === 'cancelled' && (
                  <div style={{ padding: '12px 20px', color: '#475569', fontSize: '12px', borderTop: '1px solid #0d1520' }}>
                    Cancelled. <button style={S.ghostBtn} onClick={() => triggerScan(item.url)}>Re-scan →</button>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}

const S: Record<string, React.CSSProperties> = {
  page: { minHeight: '100vh', background: '#080c14', color: '#94a3b8' },
  topbar: { background: '#0a0f1a', borderBottom: '1px solid #1e2a3a', padding: '0 24px', height: '56px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', position: 'sticky', top: 0, zIndex: 20 },
  topLogo: { fontSize: '16px', fontWeight: 900, color: 'white', letterSpacing: '-0.3px', whiteSpace: 'nowrap' },
  accent: { color: '#6366f1' },
  topRight: { display: 'flex', alignItems: 'center', gap: '10px', flexShrink: 0 },
  trialBadge: { fontSize: '11px', background: '#1e2d4a', border: '1px solid #3b4fd8', borderRadius: '20px', padding: '4px 12px', color: '#818cf8', whiteSpace: 'nowrap' },
  planBadge: { fontSize: '11px', background: '#052e16', border: '1px solid #166534', borderRadius: '20px', padding: '4px 12px', color: '#4ade80', whiteSpace: 'nowrap' },
  userPill: { display: 'flex', alignItems: 'center', gap: '8px', background: '#0f1420', border: '1px solid #1e2a3a', borderRadius: '20px', padding: '4px 12px 4px 4px' },
  avatar: { width: '26px', height: '26px', borderRadius: '50%', background: 'linear-gradient(135deg,#6366f1,#8b5cf6)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '11px', fontWeight: 800, color: 'white' },
  userEmail: { fontSize: '11px', color: '#64748b', maxWidth: '140px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' },
  adminBtn: { fontSize: '11px', color: '#818cf8', border: '1px solid #3b4fd8', borderRadius: '8px', padding: '5px 10px', textDecoration: 'none', whiteSpace: 'nowrap' },
  signOutBtn: { background: 'transparent', color: '#f87171', border: '1px solid #991b1b', borderRadius: '8px', padding: '5px 10px', fontSize: '11px', cursor: 'pointer', fontFamily: 'inherit', whiteSpace: 'nowrap' },
  main: { maxWidth: '1200px', margin: '0 auto', padding: '28px 24px' },
  scanBar: { background: '#0f1420', border: '1px solid #1e2a3a', borderRadius: '16px', padding: '20px 24px', marginBottom: '24px' },
  scanBarTop: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px', flexWrap: 'wrap', gap: '12px' },
  scanBarTitle: { fontSize: '14px', fontWeight: 800, color: 'white' },
  tabs: { display: 'flex', gap: '6px', flexWrap: 'wrap' },
  tab: { padding: '6px 14px', borderRadius: '8px', fontSize: '12px', fontWeight: 600, cursor: 'pointer', border: '1px solid #1e2a3a', color: '#64748b', background: 'transparent', fontFamily: 'inherit' },
  tabActive: { background: '#1e2d4a', color: '#818cf8', borderColor: '#3b4fd8' },
  tabLocked: { opacity: 0.5, cursor: 'not-allowed' },
  upgradeBox: { background: '#0d1020', border: '1px solid #3b4fd8', borderRadius: '12px', padding: '20px' },
  upgradeBtn: { display: 'inline-block', padding: '8px 18px', background: 'linear-gradient(135deg,#6366f1,#8b5cf6)', color: 'white', borderRadius: '8px', fontSize: '12px', fontWeight: 700, textDecoration: 'none' },
  inputRow: { display: 'flex', gap: '10px', alignItems: 'center' },
  urlInput: { flex: 1, background: '#080c14', border: '1px solid #1e2a3a', borderRadius: '10px', padding: '10px 14px', color: 'white', fontSize: '13px', outline: 'none', fontFamily: 'inherit' },
  scanBtn: { padding: '10px 20px', background: 'linear-gradient(135deg,#6366f1,#8b5cf6)', color: 'white', border: 'none', borderRadius: '10px', fontSize: '13px', fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit', whiteSpace: 'nowrap' },
  ghostBtn: { padding: '6px 12px', background: 'transparent', color: '#64748b', border: '1px solid #1e2a3a', borderRadius: '8px', fontSize: '11px', cursor: 'pointer', fontFamily: 'inherit' },
  statusBar: { marginTop: '12px', padding: '10px 14px', borderRadius: '8px', fontSize: '12px' },
  statusScanning: { background: '#1e2d4a', color: '#818cf8', border: '1px solid #3b4fd8' },
  statusSuccess: { background: '#052e16', color: '#4ade80', border: '1px solid #166534' },
  statusError: { background: '#1c0505', color: '#f87171', border: '1px solid #991b1b' },
  statsRow: { display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: '12px', marginBottom: '24px' },
  statCard: { background: '#0f1420', border: '1px solid #1e2a3a', borderRadius: '14px', padding: '18px 20px' },
  statVal: { fontSize: '28px', fontWeight: 900, letterSpacing: '-0.5px' },
  statLabel: { fontSize: '10px', color: '#475569', textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: 600, marginTop: '4px' },
  statSub: { fontSize: '11px', color: '#334155', marginTop: '2px' },
  filterRow: { display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px', flexWrap: 'wrap' },
  filterLabel: { fontSize: '10px', color: '#334155', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em' },
  filterBtn: { padding: '5px 12px', borderRadius: '8px', fontSize: '11px', fontWeight: 700, cursor: 'pointer', border: '1px solid #1e2a3a', color: '#475569', background: 'transparent', fontFamily: 'inherit' },
  filterBtnActive: { background: '#1e2d4a', color: '#818cf8', borderColor: '#3b4fd8' },
  searchInput: { marginLeft: 'auto', background: '#080c14', border: '1px solid #1e2a3a', borderRadius: '10px', padding: '5px 12px', color: 'white', fontSize: '12px', outline: 'none', width: '200px', fontFamily: 'inherit' },
  empty: { textAlign: 'center', padding: '80px 20px', color: '#1e2a3a' },
  card: { background: '#0f1420', border: '1px solid #1e2a3a', borderRadius: '16px', overflow: 'hidden', marginBottom: '12px', transition: 'border-color 0.2s' },
  cardHeader: { padding: '18px 20px', display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '16px' },
  cardName: { fontSize: '16px', fontWeight: 800, color: 'white', marginBottom: '3px' },
  cardUrl: { fontSize: '11px', color: '#334155', textDecoration: 'none' },
  cardMeta: { fontSize: '10px', color: '#475569', marginTop: '4px' },
  progressWrap: { marginTop: '12px', display: 'flex', alignItems: 'flex-start', gap: '12px' },
  progressTrack: { width: '100%', height: '6px', background: '#1e2a3a', borderRadius: '6px', overflow: 'hidden' },
  progressFill: { height: '6px', background: 'linear-gradient(90deg,#6366f1,#8b5cf6)', borderRadius: '6px', transition: 'width 1s ease' },
  cancelBtn: { padding: '4px 12px', background: 'transparent', color: '#f87171', border: '1px solid #991b1b', borderRadius: '6px', fontSize: '11px', cursor: 'pointer', fontFamily: 'inherit', whiteSpace: 'nowrap', flexShrink: 0 },
  scoreRing: { width: '72px', height: '72px', borderRadius: '50%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', border: '3px solid' },
  bars: { padding: '12px 20px', display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: '12px', borderTop: '1px solid #0d1520' },
  barItem: { fontSize: '11px' },
  barLabel: { display: 'flex', justifyContent: 'space-between', marginBottom: '4px', color: '#475569', fontWeight: 600 },
  barTrack: { height: '4px', background: '#1e2a3a', borderRadius: '4px', overflow: 'hidden' },
  barFill: { height: '4px', borderRadius: '4px', transition: 'width 0.8s ease' },
  summary: { padding: '12px 20px', fontSize: '13px', color: '#64748b', lineHeight: 1.6, borderTop: '1px solid #0d1520' },
  detail: { borderTop: '1px solid #0d1520', background: '#0a0f18' },
  detailGrid: { display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: '12px', padding: '16px 20px' },
  detailHead: { fontSize: '10px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '8px' },
  detailItem: { fontSize: '11px', color: '#64748b', background: '#080c14', border: '1px solid #1e2a3a', borderRadius: '8px', padding: '8px 10px', marginBottom: '6px', lineHeight: 1.5 },
  cardActions: { padding: '12px 20px', display: 'flex', gap: '8px', alignItems: 'center', background: '#0a0f1a', borderTop: '1px solid #0d1520', flexWrap: 'wrap' },
}
