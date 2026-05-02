'use client'
import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'

export default function UpdatePassword() {
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [done, setDone] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const sb = createClient()

  async function handleUpdate(e: React.FormEvent) {
    e.preventDefault()
    if (password !== confirm) { setError('Passwords do not match'); return }
    if (password.length < 8) { setError('Password must be at least 8 characters'); return }
    setLoading(true)
    setError('')
    const { error } = await sb.auth.updateUser({ password })
    if (error) { setError(error.message); setLoading(false); return }
    setDone(true)
    setTimeout(() => { window.location.href = '/dashboard' }, 2000)
  }

  const S: Record<string, React.CSSProperties> = {
    page: { minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#080c14', padding: '20px' },
    card: { width: '100%', maxWidth: '420px', background: '#0f1420', border: '1px solid #1e2a3a', borderRadius: '24px', padding: '40px', textAlign: 'center' },
    logo: { fontSize: '22px', fontWeight: 900, color: 'white', marginBottom: '4px' },
    accent: { color: '#6366f1' },
    input: { width: '100%', background: '#080c14', border: '1px solid #1e2a3a', borderRadius: '12px', padding: '12px 16px', color: 'white', fontSize: '14px', outline: 'none', fontFamily: 'inherit', boxSizing: 'border-box', marginBottom: '12px' },
    btn: { width: '100%', padding: '13px', background: 'linear-gradient(135deg,#6366f1,#8b5cf6)', color: 'white', border: 'none', borderRadius: '12px', fontSize: '14px', fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' },
    error: { background: '#1c0505', border: '1px solid #991b1b', borderRadius: '8px', padding: '10px', color: '#f87171', fontSize: '13px', marginBottom: '12px' },
  }

  if (done) return (
    <div style={S.page}>
      <div style={S.card}>
        <div style={S.logo}>KLARO <span style={S.accent}>PULSE</span></div>
        <div style={{ fontSize: '40px', margin: '20px 0' }}>✅</div>
        <div style={{ fontSize: '18px', fontWeight: 700, color: 'white' }}>Password updated!</div>
        <p style={{ fontSize: '13px', color: '#64748b', marginTop: '8px' }}>Redirecting to dashboard...</p>
      </div>
    </div>
  )

  return (
    <div style={S.page}>
      <div style={S.card}>
        <div style={S.logo}>KLARO <span style={S.accent}>PULSE</span></div>
        <p style={{ fontSize: '13px', color: '#64748b', margin: '16px 0 24px' }}>Enter your new password.</p>
        <form onSubmit={handleUpdate} style={{ display: 'flex', flexDirection: 'column' }}>
          <input style={S.input} type="password" placeholder="New password (min 8 chars)" value={password}
            onChange={e => setPassword(e.target.value)} required />
          <input style={S.input} type="password" placeholder="Confirm new password" value={confirm}
            onChange={e => setConfirm(e.target.value)} required />
          {error && <div style={S.error}>{error}</div>}
          <button style={S.btn} type="submit" disabled={loading}>
            {loading ? 'Updating...' : 'Update Password →'}
          </button>
        </form>
      </div>
    </div>
  )
}
