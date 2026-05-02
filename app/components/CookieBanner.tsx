'use client'
import { useState, useEffect } from 'react'

const COOKIE_KEY = 'klaro-pulse:cookie-consent'

type Prefs = { essential: true, analytics: boolean, marketing: boolean }

export default function CookieBanner() {
  const [show, setShow] = useState(false)
  const [showModal, setShowModal] = useState(false)
  const [prefs, setPrefs] = useState<Prefs>({ essential: true, analytics: false, marketing: false })

  useEffect(() => {
    try {
      const saved = localStorage.getItem(COOKIE_KEY)
      if (!saved) setShow(true)
    } catch { setShow(true) }
  }, [])

  function acceptAll() {
    save({ essential: true, analytics: true, marketing: true })
  }

  function rejectAll() {
    save({ essential: true, analytics: false, marketing: false })
  }

  function savePrefs() {
    save(prefs)
    setShowModal(false)
  }

  function save(p: Prefs) {
    try { localStorage.setItem(COOKIE_KEY, JSON.stringify({ ...p, savedAt: new Date().toISOString() })) } catch {}
    setShow(false)
  }

  if (!show) return null

  return (
    <>
      {/* Main banner */}
      {!showModal && (
        <div style={{ position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 9999, background: '#0f172a', borderTop: '1px solid #1e293b', padding: '16px 24px' }}>
          <div style={{ maxWidth: '1100px', margin: '0 auto', display: 'flex', alignItems: 'center', gap: '20px', flexWrap: 'wrap', justifyContent: 'space-between' }}>
            <div style={{ flex: 1, minWidth: '280px' }}>
              <div style={{ fontSize: '13px', fontWeight: 700, color: 'white', marginBottom: '4px' }}>🍪 Cookie Consent</div>
              <div style={{ fontSize: '12px', color: '#94a3b8', lineHeight: 1.5 }}>
                We use essential cookies for authentication and optional analytics cookies to improve our service. 
                We comply with <strong style={{ color: '#e2e8f0' }}>GDPR</strong>, <strong style={{ color: '#e2e8f0' }}>CCPA</strong>, <strong style={{ color: '#e2e8f0' }}>India DPDP</strong> and <strong style={{ color: '#e2e8f0' }}>PIPEDA</strong>.
                {' '}<a href="/pulse/cookies" style={{ color: '#818cf8', textDecoration: 'none' }}>Cookie Policy</a>
              </div>
            </div>
            <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', flexShrink: 0 }}>
              <button onClick={() => setShowModal(true)} style={{ padding: '8px 16px', background: 'transparent', color: '#94a3b8', border: '1px solid #334155', borderRadius: '8px', fontSize: '12px', cursor: 'pointer', fontFamily: 'inherit' }}>
                Manage Preferences
              </button>
              <button onClick={rejectAll} style={{ padding: '8px 16px', background: 'transparent', color: '#94a3b8', border: '1px solid #334155', borderRadius: '8px', fontSize: '12px', cursor: 'pointer', fontFamily: 'inherit' }}>
                Essential Only
              </button>
              <button onClick={acceptAll} style={{ padding: '8px 20px', background: 'linear-gradient(135deg,#6366f1,#8b5cf6)', color: 'white', border: 'none', borderRadius: '8px', fontSize: '12px', fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>
                Accept All
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Preferences modal */}
      {showModal && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 10000, background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
          <div style={{ background: '#0f172a', border: '1px solid #1e293b', borderRadius: '16px', padding: '32px', maxWidth: '540px', width: '100%', maxHeight: '90vh', overflowY: 'auto' }}>
            <div style={{ fontSize: '18px', fontWeight: 800, color: 'white', marginBottom: '4px' }}>Cookie Preferences</div>
            <div style={{ fontSize: '12px', color: '#64748b', marginBottom: '24px' }}>
              Control which cookies Klaro Pulse uses. Essential cookies cannot be disabled as they are required for the service to function.
            </div>

            {[
              {
                key: 'essential',
                label: 'Essential Cookies',
                required: true,
                desc: 'Required for authentication (Supabase session tokens), security, and core functionality. Cannot be disabled.',
                cookies: ['sb-access-token', 'sb-refresh-token', 'klaro-pulse:cookie-consent'],
              },
              {
                key: 'analytics',
                label: 'Analytics Cookies',
                required: false,
                desc: 'Help us understand how you use Klaro Pulse so we can improve the product. No personal data is sold.',
                cookies: ['Vercel Analytics', 'Page view tracking'],
              },
              {
                key: 'marketing',
                label: 'Marketing Cookies',
                required: false,
                desc: 'Used to measure the effectiveness of our marketing campaigns. Currently not active.',
                cookies: ['None currently active'],
              },
            ].map(({ key, label, required, desc, cookies }) => (
              <div key={key} style={{ background: '#080c14', border: '1px solid #1e2a3a', borderRadius: '12px', padding: '16px', marginBottom: '12px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                  <div style={{ fontSize: '14px', fontWeight: 700, color: 'white' }}>{label}</div>
                  {required ? (
                    <div style={{ fontSize: '11px', color: '#4ade80', background: '#052e16', border: '1px solid #166534', borderRadius: '20px', padding: '3px 10px' }}>Always On</div>
                  ) : (
                    <button
                      onClick={() => setPrefs(p => ({ ...p, [key]: !p[key as keyof Prefs] }))}
                      style={{
                        width: '44px', height: '24px', borderRadius: '12px',
                        background: prefs[key as keyof Prefs] ? '#6366f1' : '#334155',
                        border: 'none', cursor: 'pointer', position: 'relative', transition: 'background 0.2s',
                      }}>
                      <div style={{
                        position: 'absolute', top: '2px',
                        left: prefs[key as keyof Prefs] ? '22px' : '2px',
                        width: '20px', height: '20px', borderRadius: '50%',
                        background: 'white', transition: 'left 0.2s',
                      }} />
                    </button>
                  )}
                </div>
                <div style={{ fontSize: '12px', color: '#64748b', lineHeight: 1.5, marginBottom: '8px' }}>{desc}</div>
                <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                  {cookies.map(c => (
                    <span key={c} style={{ fontSize: '10px', color: '#475569', background: '#0f1420', border: '1px solid #1e2a3a', borderRadius: '6px', padding: '2px 8px', fontFamily: 'monospace' }}>{c}</span>
                  ))}
                </div>
              </div>
            ))}

            {/* Jurisdiction compliance */}
            <div style={{ background: '#0c1a3a', border: '1px solid #3b4fd8', borderRadius: '10px', padding: '14px', marginBottom: '20px' }}>
              <div style={{ fontSize: '11px', fontWeight: 700, color: '#818cf8', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Regulatory Compliance</div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2,1fr)', gap: '6px' }}>
                {[
                  ['🇪🇺 GDPR', 'EU & EEA — explicit consent'],
                  ['🇺🇸 CCPA/CPRA', 'California — opt-out rights'],
                  ['🇮🇳 DPDP 2023', 'India — consent & purpose'],
                  ['🇨🇦 PIPEDA', 'Canada — meaningful consent'],
                ].map(([flag, desc]) => (
                  <div key={flag} style={{ fontSize: '11px', color: '#64748b' }}>
                    <span style={{ color: '#e2e8f0', fontWeight: 600 }}>{flag}</span> — {desc}
                  </div>
                ))}
              </div>
            </div>

            <div style={{ display: 'flex', gap: '10px' }}>
              <button onClick={rejectAll} style={{ flex: 1, padding: '10px', background: 'transparent', color: '#94a3b8', border: '1px solid #334155', borderRadius: '8px', fontSize: '13px', cursor: 'pointer', fontFamily: 'inherit' }}>
                Essential Only
              </button>
              <button onClick={savePrefs} style={{ flex: 1, padding: '10px', background: 'linear-gradient(135deg,#6366f1,#8b5cf6)', color: 'white', border: 'none', borderRadius: '8px', fontSize: '13px', fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>
                Save Preferences
              </button>
              <button onClick={acceptAll} style={{ flex: 1, padding: '10px', background: '#4ade80', color: '#052e16', border: 'none', borderRadius: '8px', fontSize: '13px', fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>
                Accept All
              </button>
            </div>

            <div style={{ textAlign: 'center', marginTop: '12px', fontSize: '11px', color: '#334155' }}>
              You can change your preferences at any time. <a href="/pulse/cookies" style={{ color: '#818cf8', textDecoration: 'none' }}>Full Cookie Policy →</a>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
