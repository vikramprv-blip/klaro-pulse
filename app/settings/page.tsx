'use client'
import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { getUserProfile } from '@/lib/auth'

const PLANS = [
  { id: 'single', name: 'Single Report', price: '$59.99', period: 'one-off', scans: 1, compare: 2, bulk: false, lam: false, features: ['1 full site report', '2 competitor comparisons', 'UX + conversion audit', 'Security + ADA scan', '90-day roadmap', 'PDF download'] },
  { id: 'starter', name: 'Starter', price: '$149', period: '/mo', scans: 5, compare: 2, bulk: false, lam: false, popular: false, features: ['5 reports/month', '2 competitors per report', 'Shareable report links', 'Email delivery', 'Everything in Single'] },
  { id: 'growth', name: 'Growth', price: '$399', period: '/mo', scans: 20, compare: 3, bulk: true, lam: false, popular: true, features: ['20 reports/month', '3 competitors per report', 'Bulk scanning', 'Weekly monitoring alerts', 'Priority AI processing', 'White-label PDF'] },
  { id: 'agency', name: 'Agency', price: '$599', period: '/mo', scans: 999, compare: 5, bulk: true, lam: true, features: ['Unlimited reports', '5 competitors per report', 'LAM audit access', 'API access', 'White-label + your logo', 'Reseller rights'] },
]

export default function Settings() {
  const [profile, setProfile] = useState<any>(null)
  const [user, setUser] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const sb = createClient()

  useEffect(() => {
    getUserProfile().then(p => {
      if (!p) { window.location.href = '/signin'; return }
      setProfile(p)
      setUser({ id: p.id, email: p.email })
      setLoading(false)
    })
  }, [])

  if (loading) return (
    <div style={{ minHeight: '100vh', background: '#080c14', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ color: '#6366f1' }}>Loading...</div>
    </div>
  )

  const currentPlan = profile?.plan || 'trial'
  const trialDaysLeft = profile?.trial_ends_at
    ? Math.max(0, Math.ceil((new Date(profile.trial_ends_at).getTime() - Date.now()) / 86400000))
    : null

  return (
    <div style={S.page}>
      <div style={S.topbar}>
        <div style={S.topLogo}>KLARO <span style={S.accent}>PULSE</span></div>
        <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
          <a href="/dashboard" style={S.backBtn}>← Dashboard</a>
          <button style={S.signOutBtn} onClick={async () => { await sb.auth.signOut(); window.location.href = '/signin' }}>Sign out</button>
        </div>
      </div>

      <div style={S.main}>
        {/* Current plan */}
        <div style={S.section}>
          <div style={S.sectionTitle}>Your Account</div>
          <div style={{ display: 'flex', gap: '24px', flexWrap: 'wrap' }}>
            <div style={S.infoCard}>
              <div style={S.infoLabel}>Email</div>
              <div style={S.infoVal}>{user?.email}</div>
            </div>
            <div style={S.infoCard}>
              <div style={S.infoLabel}>Current Plan</div>
              <div style={{ ...S.infoVal, color: '#4ade80', textTransform: 'capitalize' }}>{currentPlan}</div>
            </div>
            <div style={S.infoCard}>
              <div style={S.infoLabel}>Scans Used This Month</div>
              <div style={S.infoVal}>{profile?.scans_used_this_month || 0}</div>
            </div>
            {currentPlan === 'trial' && trialDaysLeft !== null && (
              <div style={S.infoCard}>
                <div style={S.infoLabel}>Trial Expires</div>
                <div style={{ ...S.infoVal, color: trialDaysLeft < 3 ? '#f87171' : '#fbbf24' }}>{trialDaysLeft} days left</div>
              </div>
            )}
          </div>
        </div>

        {/* LAM Pricing */}
        <div style={S.section}>
          <div style={S.sectionTitle}>LAM Audit Pricing</div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: '16px' }}>
            {[
              { name: 'One-off LAM Audit', price: '$299', desc: 'Single deep audit. AI visits your site as a real client.' },
              { name: 'LAM Monthly Monitoring', price: '$499/mo', desc: 'Weekly LAM audits + alerts when issues are detected.' },
              { name: 'LAM + SOC Bundle', price: '$7,999 + $1,299/mo', desc: 'Full SOC compliance monitoring + continuous LAM auditing.' },
            ].map(p => (
              <div key={p.name} style={S.lamCard}>
                <div style={{ fontSize: '14px', fontWeight: 700, color: 'white', marginBottom: '6px' }}>{p.name}</div>
                <div style={{ fontSize: '22px', fontWeight: 900, color: '#818cf8', marginBottom: '8px' }}>{p.price}</div>
                <div style={{ fontSize: '12px', color: '#64748b', lineHeight: 1.6, marginBottom: '16px' }}>{p.desc}</div>
                <a href="mailto:ops@klaro.services?subject=LAM Audit Enquiry" style={S.contactBtn}>Contact Us →</a>
              </div>
            ))}
          </div>
        </div>

        {/* Plans */}
        <div style={S.section}>
          <div style={S.sectionTitle}>Upgrade Your Plan</div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: '16px' }}>
            {PLANS.map(plan => {
              const isCurrent = currentPlan === plan.id
              return (
                <div key={plan.id} style={{ ...S.planCard, ...(plan.popular ? S.planCardPopular : {}), ...(isCurrent ? S.planCardCurrent : {}) }}>
                  {plan.popular && <div style={S.popularBadge}>MOST POPULAR</div>}
                  {isCurrent && <div style={S.currentBadge}>CURRENT PLAN</div>}
                  <div style={S.planName}>{plan.name}</div>
                  <div style={S.planPrice}>{plan.price}<span style={{ fontSize: '14px', fontWeight: 400, color: '#475569' }}>{plan.period}</span></div>
                  <div style={{ borderTop: '1px solid #1e2a3a', paddingTop: '16px', marginTop: '16px' }}>
                    {plan.features.map(f => (
                      <div key={f} style={S.planFeature}>✓ {f}</div>
                    ))}
                  </div>
                  {!isCurrent && (
                    <a href="mailto:ops@klaro.services?subject=Upgrade to ${plan.name}" style={S.upgradeBtn}>
                      {plan.id === 'single' ? 'Buy Report' : 'Get Started →'}
                    </a>
                  )}
                </div>
              )
            })}
          </div>
        </div>

        {/* Enterprise */}
        <div style={{ ...S.section, background: '#0a0d18', border: '1px solid #3b4fd8' }}>
          <div style={{ textAlign: 'center', marginBottom: '24px' }}>
            <div style={{ fontSize: '11px', color: '#818cf8', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: '8px' }}>ENTERPRISE & IMPLEMENTATION</div>
            <div style={{ fontSize: '24px', fontWeight: 900, color: 'white', marginBottom: '8px' }}>Need LAM inside your own infrastructure?</div>
            <div style={{ fontSize: '14px', color: '#64748b', maxWidth: '600px', margin: '0 auto', lineHeight: 1.7 }}>For EU/US enterprises requiring SOC 1/2/3 continuous monitoring, ADA compliance, and LAM running within your own backend. We handle the full implementation.</div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', maxWidth: '600px', margin: '0 auto' }}>
            <div style={S.enterpriseCard}>
              <div style={{ fontSize: '12px', fontWeight: 700, color: '#818cf8', marginBottom: '6px' }}>LAM Setup & Installation</div>
              <div style={{ fontSize: '28px', fontWeight: 900, color: 'white', marginBottom: '4px' }}>$4,999 <span style={{ fontSize: '14px', color: '#475569' }}>one-time</span></div>
              <div style={{ fontSize: '12px', color: '#64748b' }}>Full implementation into your infrastructure.</div>
            </div>
            <div style={S.enterpriseCard}>
              <div style={{ fontSize: '12px', fontWeight: 700, color: '#4ade80', marginBottom: '6px' }}>Reseller / CPA Partner</div>
              <div style={{ fontSize: '28px', fontWeight: 900, color: 'white', marginBottom: '4px' }}>Revenue Share</div>
              <div style={{ fontSize: '12px', color: '#64748b' }}>Offer LAM audits to your clients and earn a cut.</div>
            </div>
          </div>
          <div style={{ textAlign: 'center', marginTop: '20px' }}>
            <a href="mailto:ops@klaro.services?subject=Enterprise LAM Enquiry" style={{ ...S.upgradeBtn, display: 'inline-block', padding: '12px 32px' }}>Talk to Us →</a>
          </div>
        </div>
      </div>
    </div>
  )
}

const S: Record<string, React.CSSProperties> = {
  page: { minHeight: '100vh', background: '#080c14', color: '#94a3b8' },
  topbar: { background: '#0a0f1a', borderBottom: '1px solid #1e2a3a', padding: '0 24px', height: '56px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', position: 'sticky', top: 0, zIndex: 20 },
  topLogo: { fontSize: '16px', fontWeight: 900, color: 'white' },
  accent: { color: '#6366f1' },
  backBtn: { fontSize: '12px', color: '#818cf8', textDecoration: 'none', border: '1px solid #3b4fd8', borderRadius: '8px', padding: '5px 12px' },
  signOutBtn: { background: 'transparent', color: '#f87171', border: '1px solid #991b1b', borderRadius: '8px', padding: '5px 10px', fontSize: '11px', cursor: 'pointer', fontFamily: 'inherit' },
  main: { maxWidth: '1100px', margin: '0 auto', padding: '40px 24px' },
  section: { background: '#0f1420', border: '1px solid #1e2a3a', borderRadius: '16px', padding: '32px', marginBottom: '24px' },
  sectionTitle: { fontSize: '18px', fontWeight: 800, color: 'white', marginBottom: '20px' },
  infoCard: { background: '#080c14', border: '1px solid #1e2a3a', borderRadius: '12px', padding: '16px 20px', minWidth: '160px' },
  infoLabel: { fontSize: '10px', color: '#475569', textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: 600, marginBottom: '6px' },
  infoVal: { fontSize: '16px', fontWeight: 700, color: 'white' },
  lamCard: { background: '#080c14', border: '1px solid #1e2a3a', borderRadius: '14px', padding: '20px' },
  contactBtn: { display: 'inline-block', padding: '8px 16px', background: 'transparent', color: '#818cf8', border: '1px solid #3b4fd8', borderRadius: '8px', fontSize: '12px', fontWeight: 700, textDecoration: 'none' },
  planCard: { background: '#080c14', border: '1px solid #1e2a3a', borderRadius: '16px', padding: '24px', position: 'relative' },
  planCardPopular: { border: '1px solid #6366f1', background: '#0c0f1e' },
  planCardCurrent: { border: '1px solid #166534', background: '#052e16' },
  popularBadge: { position: 'absolute', top: '-12px', left: '50%', transform: 'translateX(-50%)', background: '#6366f1', color: 'white', fontSize: '10px', fontWeight: 700, padding: '3px 12px', borderRadius: '20px', letterSpacing: '0.08em', whiteSpace: 'nowrap' },
  currentBadge: { position: 'absolute', top: '-12px', left: '50%', transform: 'translateX(-50%)', background: '#166534', color: '#4ade80', fontSize: '10px', fontWeight: 700, padding: '3px 12px', borderRadius: '20px', letterSpacing: '0.08em', whiteSpace: 'nowrap' },
  planName: { fontSize: '14px', fontWeight: 700, color: 'white', marginBottom: '8px', marginTop: '8px' },
  planPrice: { fontSize: '32px', fontWeight: 900, color: 'white', marginBottom: '4px' },
  planFeature: { fontSize: '12px', color: '#64748b', padding: '4px 0', borderBottom: '1px solid #0d1520' },
  upgradeBtn: { display: 'block', textAlign: 'center', marginTop: '16px', padding: '10px', background: 'linear-gradient(135deg,#6366f1,#8b5cf6)', color: 'white', borderRadius: '10px', fontSize: '13px', fontWeight: 700, textDecoration: 'none' },
  enterpriseCard: { background: '#080c14', border: '1px solid #1e2a3a', borderRadius: '12px', padding: '20px' },
}
