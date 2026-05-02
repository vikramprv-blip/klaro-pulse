'use client'
import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'

export default function SignIn() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSignIn(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')
    const sb = createClient()
    const { error } = await sb.auth.signInWithPassword({ email, password })
    if (error) { setError(error.message); setLoading(false); return }
    window.location.href = 'https://klaro.services/pulse/dashboard'
  }

  return (
    <div style={styles.page}>
      <div style={styles.card}>
        <div style={styles.logo}>KLARO <span style={styles.accent}>PULSE</span></div>
        <p style={styles.sub}>Site Intelligence Platform</p>
        <form onSubmit={handleSignIn} style={styles.form}>
          <input style={styles.input} type="email" placeholder="Email address" value={email}
            onChange={e => setEmail(e.target.value)} required autoComplete="email" />
          <input style={styles.input} type="password" placeholder="Password" value={password}
            onChange={e => setPassword(e.target.value)} required autoComplete="current-password" />
          {error && <div style={styles.error}>{error}</div>}
          <button style={styles.btn} type="submit" disabled={loading}>
            {loading ? 'Signing in...' : 'Sign In →'}
          </button>
        </form>
        <p style={styles.foot}>
          <a href="/reset-password" style={styles.link}>Forgot password?</a></p>n        <p style={styles.foot}>n          No account? <a href="/signup" style={styles.link}>Start free 14-day trial</a>
        </p>
        <p style={styles.foot}>
          <a href="https://klaro.services/pulse" style={styles.link}>← Back to Klaro Pulse</a>
        </p>
      </div>
    </div>
  )
}

const styles: Record<string, React.CSSProperties> = {
  page: { minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#080c14', padding: '20px' },
  card: { width: '100%', maxWidth: '420px', background: '#0f1420', border: '1px solid #1e2a3a', borderRadius: '24px', padding: '40px', textAlign: 'center' },
  logo: { fontSize: '22px', fontWeight: 900, color: 'white', marginBottom: '4px', letterSpacing: '-0.5px' },
  accent: { color: '#6366f1' },
  sub: { fontSize: '11px', color: '#334155', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '28px' },
  form: { display: 'flex', flexDirection: 'column', gap: '12px' },
  input: { background: '#080c14', border: '1px solid #1e2a3a', borderRadius: '12px', padding: '12px 16px', color: 'white', fontSize: '14px', outline: 'none', fontFamily: 'inherit' },
  error: { background: '#1c0505', border: '1px solid #991b1b', borderRadius: '8px', padding: '10px', color: '#f87171', fontSize: '13px' },
  btn: { padding: '13px', background: 'linear-gradient(135deg,#6366f1,#8b5cf6)', color: 'white', border: 'none', borderRadius: '12px', fontSize: '14px', fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' },
  foot: { fontSize: '12px', color: '#334155', marginTop: '16px' },
  link: { color: '#818cf8', textDecoration: 'none' },
}
