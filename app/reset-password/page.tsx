'use client'
import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'

export default function ResetPassword() {
  const [email, setEmail] = useState('')
  const [sent, setSent] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const sb = createClient()

  async function handleReset(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')
    const { error } = await sb.auth.resetPasswordForEmail(email, {
      redirectTo: 'https://klaro-pulse.vercel.app/auth/callback?next=/update-password'
    })
    if (error) { setError(error.message); setLoading(false); return }
    setSent(true)
    setLoading(false)
  }

  const S: Record<string, React.CSSProperties> = {
    page: { minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#080c14', padding: '20px' },
    card: { width: '100%', maxWidth: '420px', background: '#0f1420', border: '1px solid #1e2a3a', borderRadius: '24px', padding: '40px', textAlign: 'center' },
    logo: { fontSize: '22px', fontWeight: 900, color: 'white', marginBottom: '4px' },
    accent: { color: '#6366f1' },
    input: { width: '100%', background: '#080c14', border: '1px solid #1e2a3a', borderRadius: '12px', padding: '12px 16px', color: 'white', fontSize: '14px', outline: 'none', fontFamily: 'inherit', boxSizing: 'border-box' },
    btn: { width: '100%', padding: '13px', background: 'linear-gradient(135deg,#6366f1,#8b5cf6)', color: 'white', border: 'none', borderRadius: '12px', fontSize: '14px', fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit', marginTop: '12px' },
    error: { background: '#1c0505', border: '1px solid #991b1b', borderRadius: '8px', padding: '10px', color: '#f87171', fontSize: '13px', marginTop: '10px' },
    link: { color: '#818cf8', textDecoration: 'none', fontSize: '12px' },
  }

  if (sent) return (
    <div style={S.page}>
      <div style={S.card}>
        <div style={S.logo}>KLARO <span style={S.accent}>PULSE</span></div>
        <div style={{ fontSize: '40px', margin: '20px 0' }}>✉️</div>
        <div style={{ fontSize: '18px', fontWeight: 700, color: 'white', marginBottom: '8px' }}>Check your email</div>
        <p style={{ fontSize: '13px', color: '#64748b', lineHeight: 1.6 }}>
          We sent a password reset link to <strong style={{ color: 'white' }}>{email}</strong>.
        </p>
        <p style={{ marginTop: '20px' }}><a href="/signin" style={S.link}>← Back to Sign In</a></p>
      </div>
    </div>
  )

  return (
    <div style={S.page}>
      <div style={S.card}>
        <div style={S.logo}>KLARO <span style={S.accent}>PULSE</span></div>
        <p style={{ fontSize: '13px', color: '#64748b', margin: '16px 0 24px' }}>Enter your email and we'll send you a reset link.</p>
        <form onSubmit={handleReset} style={{ display: 'flex', flexDirection: 'column' }}>
          <input style={S.input} type="email" placeholder="Email address" value={email}
            onChange={e => setEmail(e.target.value)} required />
          {error && <div style={S.error}>{error}</div>}
          <button style={S.btn} type="submit" disabled={loading}>
            {loading ? 'Sending...' : 'Send Reset Link →'}
          </button>
        </form>
        <p style={{ marginTop: '20px' }}><a href="/signin" style={S.link}>← Back to Sign In</a></p>
      </div>
    </div>
  )
}
