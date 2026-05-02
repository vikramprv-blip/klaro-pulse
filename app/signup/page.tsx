'use client'
import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'

export default function SignUp() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [done, setDone] = useState(false)
  const sb = createClient()

  async function handleSignUp(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    if (password !== confirm) { setError('Passwords do not match'); return }
    if (password.length < 8) { setError('Password must be at least 8 characters'); return }
    setLoading(true)
    const { data, error: signUpError } = await sb.auth.signUp({
      email, password,
      options: { emailRedirectTo: `${window.location.origin}/dashboard` }
    })
    if (signUpError) { setError(signUpError.message); setLoading(false); return }
    // Create pulse_users row via API route (uses service role, bypasses RLS)
    if (data.user) {
      try {
        await fetch('/api/pulse/register', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ user_id: data.user.id, email: data.user.email })
        })
      } catch (e) { console.error('Profile create failed', e) }
    }
    setDone(true)
    setLoading(false)
  }

  if (done) return (
    <div style={S.page}>
      <div style={S.card}>
        <div style={S.logo}>KLARO <span style={S.accent}>PULSE</span></div>
        <div style={{ fontSize: '40px', margin: '20px 0' }}>✉️</div>
        <div style={{ fontSize: '18px', fontWeight: 700, color: 'white', marginBottom: '8px' }}>Check your email</div>
        <p style={{ fontSize: '13px', color: '#64748b', lineHeight: 1.6 }}>
          We sent a confirmation link to <strong style={{ color: 'white' }}>{email}</strong>.<br />
          Click it to activate your 14-day free trial.
        </p>
        <p style={{ fontSize: '12px', color: '#334155', marginTop: '20px' }}>
          Already confirmed? <a href="/signin" style={S.link}>Sign in</a>
        </p>
      </div>
    </div>
  )

  return (
    <div style={S.page}>
      <div style={S.card}>
        <div style={S.logo}>KLARO <span style={S.accent}>PULSE</span></div>
        <p style={S.sub}>14-day free trial · No credit card needed</p>
        <div style={S.trialBox}>
          <div style={{ fontSize: '12px', fontWeight: 700, color: '#818cf8', marginBottom: '6px' }}>TRIAL INCLUDES</div>
          <div style={S.trialItem}>✓ 1 full site report</div>
          <div style={S.trialItem}>✓ 1 competitor comparison</div>
          <div style={S.trialItem}>✓ UX, Security & ADA audit</div>
          <div style={S.trialItem}>✓ 90-day action roadmap</div>
        </div>
        <form onSubmit={handleSignUp} style={S.form}>
          <input style={S.input} type="email" placeholder="Work email address" value={email}
            onChange={e => setEmail(e.target.value)} required autoComplete="email" />
          <input style={S.input} type="password" placeholder="Password (min 8 chars)" value={password}
            onChange={e => setPassword(e.target.value)} required />
          <input style={S.input} type="password" placeholder="Confirm password" value={confirm}
            onChange={e => setConfirm(e.target.value)} required />
          {error && <div style={S.error}>{error}</div>}
          <button style={S.btn} type="submit" disabled={loading}>
            {loading ? 'Creating account...' : 'Start Free Trial →'}
          </button>
        </form>
        <p style={S.foot}>Already have an account? <a href="/signin" style={S.link}>Sign in</a></p>
        <p style={{ fontSize: '11px', color: '#1e2a3a', marginTop: '12px', lineHeight: 1.5 }}>
          By signing up you agree to our <a href="https://klaro.services/terms" style={S.link}>Terms</a> and <a href="https://klaro.services/privacy" style={S.link}>Privacy Policy</a>
        </p>
      </div>
    </div>
  )
}

const S: Record<string, React.CSSProperties> = {
  page: { minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#080c14', padding: '20px' },
  card: { width: '100%', maxWidth: '440px', background: '#0f1420', border: '1px solid #1e2a3a', borderRadius: '24px', padding: '40px', textAlign: 'center' },
  logo: { fontSize: '22px', fontWeight: 900, color: 'white', marginBottom: '4px', letterSpacing: '-0.5px' },
  accent: { color: '#6366f1' },
  sub: { fontSize: '11px', color: '#334155', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '20px' },
  trialBox: { background: '#080c14', border: '1px solid #1e2a3a', borderRadius: '12px', padding: '16px', marginBottom: '20px', textAlign: 'left' },
  trialItem: { fontSize: '12px', color: '#64748b', padding: '3px 0' },
  form: { display: 'flex', flexDirection: 'column', gap: '12px' },
  input: { background: '#080c14', border: '1px solid #1e2a3a', borderRadius: '12px', padding: '12px 16px', color: 'white', fontSize: '14px', outline: 'none', fontFamily: 'inherit' },
  error: { background: '#1c0505', border: '1px solid #991b1b', borderRadius: '8px', padding: '10px', color: '#f87171', fontSize: '13px' },
  btn: { padding: '13px', background: 'linear-gradient(135deg,#6366f1,#8b5cf6)', color: 'white', border: 'none', borderRadius: '12px', fontSize: '14px', fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' },
  foot: { fontSize: '12px', color: '#334155', marginTop: '16px' },
  link: { color: '#818cf8', textDecoration: 'none' },
}
