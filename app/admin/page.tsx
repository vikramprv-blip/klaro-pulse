'use client'
import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'

const PLANS = ['trial','free','single','starter','growth','agency','enterprise']

export default function AdminPanel() {
  const [users, setUsers] = useState<any[]>([])
  const [scans, setScans] = useState<any[]>([])
  const [lamRuns, setLamRuns] = useState<any[]>([])
  const [tab, setTab] = useState<'users'|'scans'|'lam'>('users')
  const [loading, setLoading] = useState(true)
  const [isAdmin, setIsAdmin] = useState(false)
  const [updating, setUpdating] = useState<string|null>(null)
  const sb = createClient()

  useEffect(() => {
    sb.auth.getUser().then(async ({ data: { user } }) => {
      if (!user) { window.location.href = '/signin'; return }
      const { data: adminRow } = await sb.from('pulse_admins').select('email').eq('email', user.email).single()
      if (!adminRow) { window.location.href = '/dashboard'; return }
      setIsAdmin(true)
      loadData()
    })
  }, [])

  async function loadData() {
    setLoading(true)
    const { data: u } = await sb.from('pulse_users').select('*').order('created_at', { ascending: false })
    const { data: s } = await sb.from('pulse_scans').select('*').order('created_at', { ascending: false }).limit(200)
    const { data: l } = await sb.from('lam_runs').select('*').order('created_at', { ascending: false }).limit(100)
    setUsers(u || [])
    setScans(s || [])
    setLamRuns(l || [])
    setLoading(false)
  }

  async function updatePlan(userId: string, plan: string) {
    setUpdating(userId)
    await sb.from('pulse_users').update({ plan }).eq('id', userId)
    setUsers(prev => prev.map(u => u.id === userId ? { ...u, plan } : u))
    setUpdating(null)
  }

  async function resetQuota(userId: string) {
    setUpdating(userId)
    await sb.from('pulse_users').update({ scans_used_this_month: 0 }).eq('id', userId)
    setUsers(prev => prev.map(u => u.id === userId ? { ...u, scans_used_this_month: 0 } : u))
    setUpdating(null)
  }

  function sc(s: number) { return s >= 75 ? '#4ade80' : s >= 50 ? '#fbbf24' : '#f87171' }
  function ago(ts: string) {
    if (!ts) return '—'
    const m = Math.floor((Date.now() - new Date(ts).getTime()) / 60000)
    if (m < 1) return 'just now'
    if (m < 60) return m + 'm ago'
    if (m < 1440) return Math.floor(m / 60) + 'h ago'
    return Math.floor(m / 1440) + 'd ago'
  }

  if (!isAdmin || loading) return (
    <div style={{ minHeight: '100vh', background: '#080c14', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ color: '#6366f1' }}>{!isAdmin ? 'Checking access...' : 'Loading...'}</div>
    </div>
  )

  const totalRevenue = users.filter(u => ['starter','growth','agency','enterprise'].includes(u.plan)).length
  const planCounts = PLANS.reduce((acc, p) => ({ ...acc, [p]: users.filter(u => u.plan === p).length }), {} as Record<string,number>)

  return (
    <div style={S.page}>
      <div style={S.topbar}>
        <div style={S.topLogo}>KLARO <span style={S.accent}>PULSE</span> <span style={S.adminTag}>ADMIN</span></div>
        <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
          <a href="/dashboard" style={S.backBtn}>← Dashboard</a>
          <button style={S.refreshBtn} onClick={loadData}>↺ Refresh</button>
        </div>
      </div>

      <div style={S.main}>
        {/* Stats */}
        <div style={S.statsRow}>
          {[
            { val: users.length, label: 'Total Users', color: '#818cf8' },
            { val: users.filter(u => u.plan === 'trial').length, label: 'On Trial', color: '#fbbf24' },
            { val: totalRevenue, label: 'Paid Users', color: '#4ade80' },
            { val: scans.length + lamRuns.length, label: 'Total Scans', color: '#60a5fa' },
            { val: scans.filter(s => s.status === 'pending' || s.status === 'scanning').length, label: 'Active Scans', color: '#f87171' },
            { val: lamRuns.length, label: 'LAM Audits', color: '#a78bfa' },
          ].map(({ val, label, color }) => (
            <div key={label} style={S.statCard}>
              <div style={{ fontSize: '28px', fontWeight: 900, color }}>{val}</div>
              <div style={{ fontSize: '10px', color: '#475569', textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: 600, marginTop: '4px' }}>{label}</div>
            </div>
          ))}
        </div>

        {/* Plan breakdown */}
        <div style={S.planRow}>
          {PLANS.map(p => (
            <div key={p} style={S.planChip}>
              <div style={{ fontSize: '16px', fontWeight: 900, color: 'white' }}>{planCounts[p] || 0}</div>
              <div style={{ fontSize: '10px', color: '#475569', textTransform: 'uppercase' }}>{p}</div>
            </div>
          ))}
        </div>

        {/* Tabs */}
        <div style={S.tabs}>
          {(['users','scans','lam'] as const).map(t => (
            <button key={t} style={{ ...S.tab, ...(tab === t ? S.tabActive : {}) }} onClick={() => setTab(t)}>
              {t === 'users' ? `Users (${users.length})` : t === 'scans' ? `LLM Scans (${scans.length})` : `LAM Audits (${lamRuns.length})`}
            </button>
          ))}
        </div>

        {/* Users table */}
        {tab === 'users' && (
          <div style={S.table}>
            <div style={S.tableHead}>
              <div style={{ flex: 2 }}>Email</div>
              <div style={{ flex: 1 }}>Plan</div>
              <div style={{ flex: 1 }}>Scans Used</div>
              <div style={{ flex: 1 }}>Trial Ends</div>
              <div style={{ flex: 1 }}>Joined</div>
              <div style={{ flex: 2 }}>Actions</div>
            </div>
            {users.map(u => (
              <div key={u.id} style={S.tableRow}>
                <div style={{ flex: 2, fontSize: '13px', color: 'white', overflow: 'hidden', textOverflow: 'ellipsis' }}>{u.email}</div>
                <div style={{ flex: 1 }}>
                  <select value={u.plan} onChange={e => updatePlan(u.id, e.target.value)}
                    disabled={updating === u.id}
                    style={{ background: '#080c14', border: '1px solid #1e2a3a', borderRadius: '6px', color: '#818cf8', fontSize: '11px', padding: '4px 8px', fontFamily: 'inherit', cursor: 'pointer' }}>
                    {PLANS.map(p => <option key={p} value={p}>{p}</option>)}
                  </select>
                </div>
                <div style={{ flex: 1, fontSize: '12px', color: '#64748b' }}>{u.scans_used_this_month || 0}</div>
                <div style={{ flex: 1, fontSize: '11px', color: '#64748b' }}>
                  {u.trial_ends_at ? new Date(u.trial_ends_at).toLocaleDateString() : '—'}
                </div>
                <div style={{ flex: 1, fontSize: '11px', color: '#475569' }}>{ago(u.created_at)}</div>
                <div style={{ flex: 2, display: 'flex', gap: '6px' }}>
                  <button style={S.actionBtn} onClick={() => resetQuota(u.id)} disabled={updating === u.id}>Reset Quota</button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Scans table */}
        {tab === 'scans' && (
          <div style={S.table}>
            <div style={S.tableHead}>
              <div style={{ flex: 3 }}>URL</div>
              <div style={{ flex: 1 }}>Type</div>
              <div style={{ flex: 1 }}>Status</div>
              <div style={{ flex: 1 }}>Score</div>
              <div style={{ flex: 1 }}>When</div>
            </div>
            {scans.map(s => (
              <div key={s.id} style={S.tableRow}>
                <div style={{ flex: 3, fontSize: '12px', color: '#94a3b8', overflow: 'hidden', textOverflow: 'ellipsis' }}>{s.url}</div>
                <div style={{ flex: 1, fontSize: '11px', color: '#64748b' }}>{s.scan_type || 'llm'}</div>
                <div style={{ flex: 1 }}>
                  <span style={{ fontSize: '11px', color: s.status === 'complete' ? '#4ade80' : s.status === 'error' ? '#f87171' : '#fbbf24', fontWeight: 600 }}>{s.status}</span>
                </div>
                <div style={{ flex: 1, fontSize: '13px', fontWeight: 700, color: sc(s.overall_score || 0) }}>{s.overall_score || '—'}</div>
                <div style={{ flex: 1, fontSize: '11px', color: '#475569' }}>{ago(s.created_at)}</div>
              </div>
            ))}
          </div>
        )}

        {/* LAM table */}
        {tab === 'lam' && (
          <div style={S.table}>
            <div style={S.tableHead}>
              <div style={{ flex: 3 }}>URL</div>
              <div style={{ flex: 1 }}>Status</div>
              <div style={{ flex: 1 }}>Overall</div>
              <div style={{ flex: 1 }}>ADA</div>
              <div style={{ flex: 1 }}>SOC</div>
              <div style={{ flex: 1 }}>When</div>
            </div>
            {lamRuns.map(l => (
              <div key={l.id} style={S.tableRow}>
                <div style={{ flex: 3, fontSize: '12px', color: '#94a3b8', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  <a href={`/reports/lam/${l.id}`} style={{ color: '#818cf8', textDecoration: 'none' }}>{l.url}</a>
                </div>
                <div style={{ flex: 1 }}>
                  <span style={{ fontSize: '11px', color: l.status === 'complete' ? '#4ade80' : l.status === 'error' ? '#f87171' : '#fbbf24', fontWeight: 600 }}>{l.status}</span>
                </div>
                <div style={{ flex: 1, fontSize: '13px', fontWeight: 700, color: sc(l.overall_score || 0) }}>{l.overall_score || '—'}</div>
                <div style={{ flex: 1, fontSize: '13px', fontWeight: 700, color: sc(l.ada_score || 0) }}>{l.ada_score || '—'}</div>
                <div style={{ flex: 1, fontSize: '13px', fontWeight: 700, color: sc(l.soc_score || 0) }}>{l.soc_score || '—'}</div>
                <div style={{ flex: 1, fontSize: '11px', color: '#475569' }}>{ago(l.created_at)}</div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

const S: Record<string, React.CSSProperties> = {
  page: { minHeight: '100vh', background: '#080c14', color: '#94a3b8' },
  topbar: { background: '#0a0f1a', borderBottom: '1px solid #1e2a3a', padding: '0 24px', height: '56px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', position: 'sticky', top: 0, zIndex: 20 },
  topLogo: { fontSize: '16px', fontWeight: 900, color: 'white' },
  accent: { color: '#6366f1' },
  adminTag: { fontSize: '10px', background: '#7c3aed', color: 'white', borderRadius: '4px', padding: '2px 8px', marginLeft: '10px', fontWeight: 700, letterSpacing: '0.08em' },
  backBtn: { fontSize: '12px', color: '#818cf8', textDecoration: 'none', border: '1px solid #3b4fd8', borderRadius: '8px', padding: '5px 12px' },
  refreshBtn: { fontSize: '12px', color: '#64748b', background: 'transparent', border: '1px solid #1e2a3a', borderRadius: '8px', padding: '5px 12px', cursor: 'pointer', fontFamily: 'inherit' },
  main: { maxWidth: '1400px', margin: '0 auto', padding: '28px 24px' },
  statsRow: { display: 'grid', gridTemplateColumns: 'repeat(6,1fr)', gap: '12px', marginBottom: '16px' },
  statCard: { background: '#0f1420', border: '1px solid #1e2a3a', borderRadius: '14px', padding: '16px' },
  planRow: { display: 'flex', gap: '8px', marginBottom: '24px', flexWrap: 'wrap' },
  planChip: { background: '#0f1420', border: '1px solid #1e2a3a', borderRadius: '10px', padding: '10px 16px', textAlign: 'center', minWidth: '70px' },
  tabs: { display: 'flex', gap: '6px', marginBottom: '16px' },
  tab: { padding: '8px 18px', borderRadius: '8px', fontSize: '12px', fontWeight: 600, cursor: 'pointer', border: '1px solid #1e2a3a', color: '#64748b', background: 'transparent', fontFamily: 'inherit' },
  tabActive: { background: '#1e2d4a', color: '#818cf8', borderColor: '#3b4fd8' },
  table: { background: '#0f1420', border: '1px solid #1e2a3a', borderRadius: '16px', overflow: 'hidden' },
  tableHead: { display: 'flex', padding: '12px 20px', background: '#0a0f1a', borderBottom: '1px solid #1e2a3a', fontSize: '10px', fontWeight: 700, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.06em', gap: '12px' },
  tableRow: { display: 'flex', padding: '12px 20px', borderBottom: '1px solid #0d1520', alignItems: 'center', gap: '12px' },
  actionBtn: { padding: '4px 10px', background: 'transparent', color: '#818cf8', border: '1px solid #3b4fd8', borderRadius: '6px', fontSize: '11px', cursor: 'pointer', fontFamily: 'inherit' },
}
