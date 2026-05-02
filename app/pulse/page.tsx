'use client'
import { useState } from 'react'

const I = '#4f46e5'
const IC = '#06b6d4'
const T1 = '#0f172a'
const T2 = '#475569'
const T3 = '#94a3b8'
const W = 'white'
const G1 = '#f8fafc'
const IL = '#eef2ff'

export default function PulsePage() {
  const [url, setUrl] = useState('')
  const [scanning, setScanning] = useState(false)
  const [scanned, setScanned] = useState(false)

  async function handleScan() {
    if (!url.startsWith('http')) return
    setScanning(true)
    await new Promise(r => setTimeout(r, 2000))
    setScanning(false)
    setScanned(true)
  }

  return (
    <div style={{ fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif', background: W, color: T1 }}>

      {/* Nav */}
      <nav style={{ position: 'sticky', top: 0, zIndex: 50, background: 'rgba(255,255,255,0.95)', backdropFilter: 'blur(10px)', borderBottom: '1px solid #e2e8f0', padding: '0 40px', height: '64px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '32px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <img src="/klaro-logo.png" alt="Klaro" style={{ width: '36px', height: '36px', borderRadius: '8px', objectFit: 'cover' }} />
            <div style={{ fontSize: '16px', fontWeight: 800, color: T1 }}>Klaro <span style={{ color: I }}>Pulse</span></div>
          </div>
          <div style={{ display: 'flex', gap: '24px' }}>
            {[['Features', '#features'], ['Pricing', '#pricing'], ['Partners', '#partners']].map(([label, href]) => (
              <a key={label} href={href} style={{ fontSize: '14px', color: T2, textDecoration: 'none', fontWeight: 500 }}>{label}</a>
            ))}
          </div>
        </div>
        <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
          <a href="/signin" style={{ fontSize: '14px', color: T2, textDecoration: 'none', fontWeight: 500 }}>Sign in</a>
          <a href="/signup" style={{ fontSize: '14px', color: W, background: I, borderRadius: '8px', padding: '8px 18px', textDecoration: 'none', fontWeight: 700 }}>Start free trial →</a>
        </div>
      </nav>

      {/* Hero */}
      <section style={{ background: `linear-gradient(135deg, ${IL} 0%, white 50%, #ecfeff 100%)`, padding: '80px 40px 60px', textAlign: 'center' }}>
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', background: IL, border: `1px solid ${I}33`, borderRadius: '20px', padding: '6px 16px', marginBottom: '24px' }}>
          <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: IC }}></div>
          <span style={{ fontSize: '12px', fontWeight: 700, color: I, letterSpacing: '0.05em' }}>LIVE · Powered by AI + LAM Agent</span>
        </div>
        <h1 style={{ fontSize: '56px', fontWeight: 900, color: T1, lineHeight: 1.1, marginBottom: '20px', maxWidth: '800px', margin: '0 auto 20px' }}>
          Know your website score<br />
          <span style={{ background: `linear-gradient(135deg, ${I}, ${IC})`, WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>in 30 seconds</span>
        </h1>
        <p style={{ fontSize: '18px', color: T2, maxWidth: '580px', margin: '0 auto 40px', lineHeight: 1.7 }}>
          AI audits any public website for UX, conversion, security, ADA compliance and DNS health. No installation. Works on competitor sites too.
        </p>

        <div style={{ maxWidth: '600px', margin: '0 auto 24px' }}>
          <div style={{ display: 'flex', gap: '10px', background: W, border: `2px solid ${scanned ? I : '#e2e8f0'}`, borderRadius: '12px', padding: '6px 6px 6px 18px', boxShadow: '0 4px 24px rgba(79,70,229,0.1)' }}>
            <input
              style={{ flex: 1, border: 'none', outline: 'none', fontSize: '15px', color: T1, background: 'transparent', fontFamily: 'inherit' }}
              placeholder="https://yourwebsite.com"
              value={url}
              onChange={e => setUrl(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && !scanning && handleScan()}
            />
            <button onClick={handleScan} disabled={scanning}
              style={{ padding: '10px 24px', background: scanning ? T3 : `linear-gradient(135deg, ${I}, ${IC})`, color: W, border: 'none', borderRadius: '8px', fontSize: '14px', fontWeight: 700, cursor: scanning ? 'default' : 'pointer', fontFamily: 'inherit', whiteSpace: 'nowrap' }}>
              {scanning ? '⏳ Scanning...' : 'Scan Free →'}
            </button>
          </div>
          <div style={{ fontSize: '12px', color: T3, marginTop: '8px' }}>Free scan · No credit card · Results in 30 seconds</div>
        </div>

        {scanned && (
          <div style={{ maxWidth: '700px', margin: '0 auto', position: 'relative' }}>
            <div style={{ filter: 'blur(4px)', background: W, border: '1px solid #e2e8f0', borderRadius: '16px', padding: '24px', boxShadow: '0 8px 32px rgba(0,0,0,0.08)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '16px' }}>
                <div><div style={{ fontSize: '20px', fontWeight: 800 }}>yourwebsite.com</div></div>
                <div style={{ fontSize: '48px', fontWeight: 900, color: '#d97706' }}>68</div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: '8px' }}>
                {[['Trust', 72, '#16a34a'], ['Conversion', 55, '#d97706'], ['Security', 80, '#16a34a'], ['Mobile', 65, '#d97706']].map(([l, v, c]) => (
                  <div key={l as string} style={{ background: G1, borderRadius: '8px', padding: '10px', textAlign: 'center' }}>
                    <div style={{ fontSize: '22px', fontWeight: 800, color: c as string }}>{v}</div>
                    <div style={{ fontSize: '10px', color: T3 }}>{l}</div>
                  </div>
                ))}
              </div>
            </div>
            <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: 'rgba(255,255,255,0.7)', borderRadius: '16px', backdropFilter: 'blur(2px)' }}>
              <div style={{ fontSize: '16px', fontWeight: 800, color: T1, marginBottom: '8px' }}>Your results are ready!</div>
              <div style={{ fontSize: '13px', color: T2, marginBottom: '16px' }}>Create a free account to see your full report</div>
              <a href="/signup" style={{ padding: '12px 28px', background: `linear-gradient(135deg, ${I}, ${IC})`, color: W, borderRadius: '10px', fontSize: '14px', fontWeight: 700, textDecoration: 'none' }}>See Full Report — Free →</a>
            </div>
          </div>
        )}

        <div style={{ display: 'flex', gap: '32px', justifyContent: 'center', marginTop: '40px', flexWrap: 'wrap' }}>
          {[['500+', 'Sites scanned'], ['5 sec', 'Avg scan time'], ['14-day', 'Free trial'], ['40%', 'CPA revenue share']].map(([val, label]) => (
            <div key={label} style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '24px', fontWeight: 900, color: I }}>{val}</div>
              <div style={{ fontSize: '12px', color: T3, fontWeight: 500 }}>{label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* Features */}
      <section id="features" style={{ padding: '80px 40px', background: W }}>
        <div style={{ maxWidth: '1100px', margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: '48px' }}>
            <div style={{ fontSize: '12px', fontWeight: 700, color: I, letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: '12px' }}>COMPREHENSIVE AUDIT</div>
            <h2 style={{ fontSize: '36px', fontWeight: 900, color: T1, marginBottom: '12px' }}>Everything your site needs to win</h2>
            <p style={{ fontSize: '16px', color: T2, maxWidth: '500px', margin: '0 auto' }}>One scan covers what used to take 5 different tools and a consultant.</p>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: '20px' }}>
            {[
              { icon: '🎯', title: 'UX & Conversion', color: I, desc: 'Identifies exactly what stops visitors from becoming clients. Conversion killers, friction points, CTA effectiveness.', tags: ['Friction Analysis', 'CTA Score', 'Quick Wins'] },
              { icon: '🔒', title: 'Security & Compliance', color: '#dc2626', desc: 'SSL, cookie consent, GDPR status, SOC2 readiness surface scan, ADA/WCAG accessibility check.', tags: ['SSL Check', 'ADA/WCAG', 'GDPR Status'] },
              { icon: '📧', title: 'DNS & Email Security', color: '#d97706', desc: 'SPF, DMARC, DKIM verification. Identifies if your domain can be spoofed for phishing attacks.', tags: ['SPF Record', 'DMARC Policy', 'DKIM Signing'] },
              { icon: '🤖', title: 'LAM Agent Audit', color: '#7c3aed', desc: 'Our AI visits your site as a real potential client — testing contact forms, auth flows, and user journeys.', tags: ['Real Browsing', 'Form Testing', 'Journey Audit'] },
              { icon: '📊', title: 'Competitive Intel', color: IC, desc: 'Scan competitor sites to see exactly where they win and where your opportunity lies.', tags: ['Side-by-Side', 'Bulk Scan', 'Win Analysis'] },
              { icon: '📅', title: '90-Day Roadmap', color: '#16a34a', desc: 'Not just problems — a prioritised action plan with costs, timelines and expected score improvements.', tags: ['Priority Actions', 'Cost Estimates', 'Score Targets'] },
            ].map(({ icon, title, color, desc, tags }) => (
              <div key={title} style={{ background: G1, border: '1px solid #e2e8f0', borderRadius: '16px', padding: '24px' }}>
                <div style={{ fontSize: '32px', marginBottom: '12px' }}>{icon}</div>
                <div style={{ fontSize: '16px', fontWeight: 800, color: T1, marginBottom: '8px' }}>{title}</div>
                <div style={{ fontSize: '13px', color: T2, lineHeight: 1.6, marginBottom: '14px' }}>{desc}</div>
                <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                  {tags.map(t => (
                    <span key={t} style={{ fontSize: '11px', fontWeight: 600, color, background: `${color}15`, border: `1px solid ${color}33`, borderRadius: '20px', padding: '3px 10px' }}>{t}</span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How it works */}
      <section style={{ padding: '80px 40px', background: T1 }}>
        <div style={{ maxWidth: '1100px', margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: '48px' }}>
            <div style={{ fontSize: '12px', fontWeight: 700, color: IC, letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: '12px' }}>HOW IT WORKS</div>
            <h2 style={{ fontSize: '36px', fontWeight: 900, color: W, marginBottom: '12px' }}>Four steps from URL to full AI audit report</h2>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: '16px' }}>
            {[
              { n: '1', title: 'Paste any URL', desc: 'Any public website — a competitor, a client, a law firm. No setup, no login to the target site.' },
              { n: '2', title: 'AI scans everything', desc: 'Our agent browses like a human. AI analyses UX, trust, conversion, compliance and DNS security.' },
              { n: '3', title: 'Plain English report', desc: 'No jargon. No WCAG numbers. Just: here is the problem, here is the money you are losing.' },
              { n: '4', title: 'Share with clients', desc: 'One click to download a PDF. Send it before the meeting. They\'ll be impressed before you arrive.' },
            ].map(({ n, title, desc }) => (
              <div key={n} style={{ background: '#0f1a2e', border: '1px solid #1e3a5f', borderRadius: '16px', padding: '24px' }}>
                <div style={{ width: '32px', height: '32px', background: I, borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '14px', fontWeight: 900, color: W, marginBottom: '16px' }}>{n}</div>
                <div style={{ fontSize: '16px', fontWeight: 800, color: W, marginBottom: '8px' }}>{title}</div>
                <div style={{ fontSize: '13px', color: T3, lineHeight: 1.6 }}>{desc}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* vs competitors */}
      <section style={{ padding: '80px 40px', background: G1 }}>
        <div style={{ maxWidth: '900px', margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: '40px' }}>
            <div style={{ fontSize: '12px', fontWeight: 700, color: I, letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: '12px' }}>WHY KLARO PULSE</div>
            <h2 style={{ fontSize: '36px', fontWeight: 900, color: T1, marginBottom: '12px' }}>No installation. Works on any site.</h2>
            <p style={{ fontSize: '16px', color: T2 }}>Backend compliance tools cost $15,000+/year and require IT integration. We audit any public website in 30 seconds.</p>
          </div>
          <div style={{ background: W, borderRadius: '16px', overflow: 'hidden', border: '1px solid #e2e8f0', boxShadow: '0 4px 24px rgba(0,0,0,0.06)' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: IL }}>
                  <td style={{ padding: '14px 20px', fontSize: '12px', fontWeight: 700, color: T2, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Feature</td>
                  <td style={{ padding: '14px 20px', fontSize: '13px', fontWeight: 800, color: I, textAlign: 'center', borderLeft: '1px solid #e2e8f0' }}>Klaro Pulse</td>
                  <td style={{ padding: '14px 20px', fontSize: '13px', fontWeight: 700, color: T2, textAlign: 'center', borderLeft: '1px solid #e2e8f0' }}>Scrut / Drata</td>
                  <td style={{ padding: '14px 20px', fontSize: '13px', fontWeight: 700, color: T2, textAlign: 'center', borderLeft: '1px solid #e2e8f0' }}>Manual Audit</td>
                </tr>
              </thead>
              <tbody>
                {[
                  ['Scan competitor sites', '✓', '✗', '✓'],
                  ['No installation needed', '✓', '✗', '✓'],
                  ['Results in 30 seconds', '✓', '✗', '✗'],
                  ['AI visits site as real user', '✓', '✗', '✗'],
                  ['DNS / Email security check', '✓', '✓', '✗'],
                  ['ADA / WCAG compliance', '✓', '✗', '✓'],
                  ['SOC2 surface readiness', '✓', '✓', '✗'],
                  ['Starting price', '$59.99', '$15,000/yr', '$2,000+'],
                ].map(([feature, klaro, scrut, manual], i) => (
                  <tr key={feature} style={{ borderTop: '1px solid #f1f5f9', background: i % 2 === 0 ? W : G1 }}>
                    <td style={{ padding: '12px 20px', fontSize: '13px', color: T1, fontWeight: 500 }}>{feature}</td>
                    <td style={{ padding: '12px 20px', textAlign: 'center', borderLeft: '1px solid #f1f5f9', fontSize: '13px', fontWeight: 700, color: klaro === '✓' ? '#16a34a' : klaro === '✗' ? '#dc2626' : I }}>{klaro}</td>
                    <td style={{ padding: '12px 20px', textAlign: 'center', borderLeft: '1px solid #f1f5f9', fontSize: '13px', color: scrut === '✓' ? '#16a34a' : scrut === '✗' ? '#dc2626' : T2 }}>{scrut}</td>
                    <td style={{ padding: '12px 20px', textAlign: 'center', borderLeft: '1px solid #f1f5f9', fontSize: '13px', color: manual === '✓' ? '#16a34a' : manual === '✗' ? '#dc2626' : T2 }}>{manual}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section id="pricing" style={{ padding: '80px 40px', background: W }}>
        <div style={{ maxWidth: '1100px', margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: '48px' }}>
            <div style={{ fontSize: '12px', fontWeight: 700, color: I, letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: '12px' }}>PRICING</div>
            <h2 style={{ fontSize: '36px', fontWeight: 900, color: T1, marginBottom: '12px' }}>Simple, transparent pricing</h2>
            <p style={{ fontSize: '16px', color: T2 }}>Start free. No credit card. Upgrade when you need more.</p>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: '16px', marginBottom: '24px' }}>
            {[
              { name: 'Single Report', price: '$59.99', period: 'one-off', scans: '1 report', color: '#475569', popular: false, features: ['Full 5-page audit', '2 competitor comparisons', 'PDF download', 'DNS security check', '90-day roadmap'] },
              { name: 'Starter', price: '$149', period: '/month', scans: '5 reports/mo', color: I, popular: false, features: ['Everything in Single', '2 competitor reports', 'Email delivery', 'Shareable links', '14-day free trial'] },
              { name: 'Growth', price: '$399', period: '/month', scans: '20 reports/mo', color: I, popular: true, features: ['Everything in Starter', '3 competitors per scan', 'Bulk scanner', 'Weekly monitoring', 'White-label PDF'] },
              { name: 'Agency', price: '$599', period: '/month', scans: 'Unlimited', color: '#7c3aed', popular: false, features: ['Everything in Growth', '5 competitors per scan', 'LAM audit access', 'API access', 'Reseller rights'] },
            ].map(({ name, price, period, scans, features, color, popular }) => (
              <div key={name} style={{ background: popular ? IL : W, border: `2px solid ${popular ? I : '#e2e8f0'}`, borderRadius: '16px', padding: '24px', position: 'relative' }}>
                {popular && <div style={{ position: 'absolute', top: '-12px', left: '50%', transform: 'translateX(-50%)', background: I, color: W, fontSize: '10px', fontWeight: 700, padding: '3px 14px', borderRadius: '20px', whiteSpace: 'nowrap' }}>MOST POPULAR</div>}
                <div style={{ fontSize: '14px', fontWeight: 700, color: T1, marginBottom: '8px', marginTop: popular ? '8px' : '0' }}>{name}</div>
                <div style={{ fontSize: '36px', fontWeight: 900, color: T1, lineHeight: 1 }}>{price}</div>
                <div style={{ fontSize: '13px', color: T3, marginBottom: '4px' }}>{period}</div>
                <div style={{ fontSize: '12px', fontWeight: 600, color, marginBottom: '16px' }}>{scans}</div>
                <div style={{ borderTop: '1px solid #f1f5f9', paddingTop: '16px', marginBottom: '20px' }}>
                  {features.map(f => (
                    <div key={f} style={{ fontSize: '12px', color: T2, padding: '4px 0', display: 'flex', gap: '8px' }}>
                      <span style={{ color: '#16a34a', fontWeight: 700 }}>✓</span> {f}
                    </div>
                  ))}
                </div>
                <a href="/signup" style={{ display: 'block', textAlign: 'center', padding: '10px', background: popular ? `linear-gradient(135deg, ${I}, ${IC})` : 'transparent', color: popular ? W : I, border: `2px solid ${popular ? 'transparent' : I}`, borderRadius: '10px', fontSize: '13px', fontWeight: 700, textDecoration: 'none' }}>
                  {name === 'Single Report' ? 'Buy Report' : 'Start Free Trial'}
                </a>
              </div>
            ))}
          </div>

          {/* LAM pricing */}
          <div style={{ background: 'linear-gradient(135deg, #faf5ff, #f0f9ff)', border: '1px solid #e9d5ff', borderRadius: '16px', padding: '32px' }}>
            <div style={{ fontSize: '12px', fontWeight: 700, color: '#7c3aed', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: '12px' }}>🤖 LAM AGENT AUDITS</div>
            <div style={{ fontSize: '22px', fontWeight: 900, color: T1, marginBottom: '8px' }}>AI visits your site as a real client</div>
            <div style={{ fontSize: '14px', color: T2, marginBottom: '24px', lineHeight: 1.6 }}>Full journey testing, ADA compliance, SOC2 surface audit. Takes 8-12 minutes.</div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: '16px' }}>
              {[
                { name: 'One-off Audit', price: '$299', period: 'one-time', desc: 'Single deep LAM audit' },
                { name: 'Monthly Monitor', price: '$499', period: '/month', desc: 'Weekly LAM + alerts' },
                { name: 'LAM + SOC Bundle', price: '$7,999', period: '+ $1,299/mo', desc: 'Full SOC monitoring' },
                { name: 'Self-hosted', price: '$4,999', period: 'one-time', desc: 'LAM in your infrastructure' },
              ].map(({ name, price, period, desc }) => (
                <div key={name} style={{ background: W, border: '1px solid #e9d5ff', borderRadius: '12px', padding: '16px', textAlign: 'center' }}>
                  <div style={{ fontSize: '12px', fontWeight: 700, color: '#7c3aed', marginBottom: '6px' }}>{name}</div>
                  <div style={{ fontSize: '22px', fontWeight: 900, color: T1, lineHeight: 1 }}>{price}</div>
                  <div style={{ fontSize: '11px', color: T3, marginBottom: '6px' }}>{period}</div>
                  <div style={{ fontSize: '11px', color: T2 }}>{desc}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* CPA Partners */}
      <section id="partners" style={{ padding: '80px 40px', background: `linear-gradient(135deg, ${IL} 0%, #ecfeff 100%)` }}>
        <div style={{ maxWidth: '900px', margin: '0 auto', textAlign: 'center' }}>
          <div style={{ fontSize: '12px', fontWeight: 700, color: I, letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: '12px' }}>CPA & ACCOUNTING FIRM PARTNERS</div>
          <h2 style={{ fontSize: '36px', fontWeight: 900, color: T1, marginBottom: '16px' }}>Earn 40% on every client scan</h2>
          <p style={{ fontSize: '16px', color: T2, maxWidth: '560px', margin: '0 auto 40px', lineHeight: 1.7 }}>
            White-label Klaro Pulse under your firm brand. Run AI audits for clients. We handle the tech — you keep 40% of every scan, forever.
          </p>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: '16px', marginBottom: '32px', textAlign: 'left' }}>
            {[
              { icon: '🏷', title: 'White-label', desc: 'Reports branded with your firm name and logo. Clients never see Klaro Pulse.' },
              { icon: '💰', title: '40% Revenue Share', desc: 'Earn $24 per LLM audit, $120 per LAM audit, $60/mo per monitoring client.' },
              { icon: '🔒', title: 'SOC2 Readiness', desc: 'Help clients identify compliance gaps before formal audits. No extra tools needed.' },
            ].map(({ icon, title, desc }) => (
              <div key={title} style={{ background: W, border: '1px solid #e2e8f0', borderRadius: '14px', padding: '20px' }}>
                <div style={{ fontSize: '28px', marginBottom: '10px' }}>{icon}</div>
                <div style={{ fontSize: '15px', fontWeight: 700, color: T1, marginBottom: '6px' }}>{title}</div>
                <div style={{ fontSize: '13px', color: T2, lineHeight: 1.6 }}>{desc}</div>
              </div>
            ))}
          </div>
          <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
            <a href="/partners" style={{ padding: '14px 32px', background: `linear-gradient(135deg, ${I}, ${IC})`, color: W, borderRadius: '10px', fontSize: '14px', fontWeight: 700, textDecoration: 'none' }}>Apply for Partnership →</a>
            <a href="/partners" style={{ padding: '14px 32px', background: 'transparent', color: I, border: `2px solid ${I}`, borderRadius: '10px', fontSize: '14px', fontWeight: 700, textDecoration: 'none' }}>Learn More</a>
          </div>
        </div>
      </section>

      {/* Enterprise */}
      <section style={{ padding: '80px 40px', background: T1 }}>
        <div style={{ maxWidth: '900px', margin: '0 auto', textAlign: 'center' }}>
          <div style={{ fontSize: '12px', fontWeight: 700, color: IC, letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: '12px' }}>ENTERPRISE & SELF-HOSTED</div>
          <h2 style={{ fontSize: '36px', fontWeight: 900, color: W, marginBottom: '16px' }}>Need LAM inside your own infrastructure?</h2>
          <p style={{ fontSize: '16px', color: T3, maxWidth: '560px', margin: '0 auto 40px', lineHeight: 1.7 }}>For EU/US enterprises requiring SOC 1/2/3 continuous monitoring within your own backend.</p>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2,1fr)', gap: '16px', maxWidth: '600px', margin: '0 auto 32px', textAlign: 'left' }}>
            {[
              { title: 'LAM Setup & Installation', price: '$4,999 one-time', period: '+ $1,299/month monitoring', desc: 'Full implementation into your infrastructure. Your servers, your data.' },
              { title: 'CPA Reseller Program', price: '40% Revenue Share', period: 'on all client scans', desc: 'Offer LAM audits to clients under your brand. We handle the tech.' },
            ].map(({ title, price, period, desc }) => (
              <div key={title} style={{ background: '#1e293b', border: '1px solid #334155', borderRadius: '14px', padding: '20px' }}>
                <div style={{ fontSize: '12px', fontWeight: 700, color: IC, marginBottom: '6px' }}>{title}</div>
                <div style={{ fontSize: '20px', fontWeight: 900, color: W, marginBottom: '2px' }}>{price}</div>
                <div style={{ fontSize: '11px', color: T3, marginBottom: '8px', fontStyle: 'italic' }}>{period}</div>
                <div style={{ fontSize: '12px', color: '#64748b' }}>{desc}</div>
              </div>
            ))}
          </div>
          <a href="mailto:ops@klaro.services?subject=Enterprise Enquiry" style={{ padding: '14px 32px', background: `linear-gradient(135deg, ${I}, ${IC})`, color: W, borderRadius: '10px', fontSize: '14px', fontWeight: 700, textDecoration: 'none', display: 'inline-block' }}>Talk to Us →</a>
        </div>
      </section>

      {/* Footer */}
      <footer style={{ padding: '40px', background: '#020617', borderTop: '1px solid #1e293b' }}>
        <div style={{ maxWidth: '1100px', margin: '0 auto', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <img src="/klaro-logo.png" alt="Klaro" style={{ width: '28px', height: '28px', borderRadius: '6px', objectFit: 'cover' }} />
            <div style={{ fontSize: '14px', fontWeight: 700, color: W }}>Klaro <span style={{ color: I }}>Pulse</span></div>
            <span style={{ color: '#334155', margin: '0 8px' }}>·</span>
            <span style={{ fontSize: '12px', color: T3 }}>AI-powered site intelligence</span>
          </div>
          <div style={{ display: 'flex', gap: '24px' }}>
            {[['Privacy', 'https://klaro.services/privacy'], ['Terms', 'https://klaro.services/terms'], ['Partners', '/partners'], ['Contact', 'mailto:ops@klaro.services']].map(([label, href]) => (
              <a key={label} href={href} style={{ fontSize: '12px', color: T3, textDecoration: 'none' }}>{label}</a>
            ))}
          </div>
          <div style={{ fontSize: '12px', color: '#475569' }}>© 2026 Klaro Global</div>
        </div>
      </footer>
    </div>
  )
}
