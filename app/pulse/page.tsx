export default function PulseLanding() {
  return (
    <main style={{ fontFamily: 'sans-serif', maxWidth: 900, margin: '0 auto', padding: '60px 24px' }}>
      <h1 style={{ fontSize: 48, fontWeight: 800, marginBottom: 16 }}>Klaro Pulse</h1>
      <p style={{ fontSize: 22, color: '#555', marginBottom: 40 }}>
        Competitive intelligence reports for Indian businesses. Know what your rivals are doing — before your customers do.
      </p>
      <div style={{ display: 'flex', gap: 16, marginBottom: 64 }}>
        <a href="/pulseapp" style={{ background: '#2563eb', color: '#fff', padding: '14px 32px', borderRadius: 8, textDecoration: 'none', fontWeight: 700, fontSize: 18 }}>
          Launch App →
        </a>
        <a href="#pricing" style={{ border: '2px solid #2563eb', color: '#2563eb', padding: '14px 32px', borderRadius: 8, textDecoration: 'none', fontWeight: 700, fontSize: 18 }}>
          See Pricing
        </a>
      </div>

      <section style={{ marginBottom: 64 }}>
        <h2 style={{ fontSize: 32, fontWeight: 700, marginBottom: 24 }}>What you get</h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 24 }}>
          {[
            { title: 'Competitor Tracking', desc: 'Monitor up to 5 competitors across pricing, offers, and messaging.' },
            { title: 'Weekly Reports', desc: 'Automated reports delivered to your dashboard every week.' },
            { title: 'LAM Audits', desc: 'Deep AI-powered audits of your competitors digital presence.' },
          ].map(f => (
            <div key={f.title} style={{ background: '#f8fafc', borderRadius: 12, padding: 28 }}>
              <h3 style={{ fontSize: 20, fontWeight: 700, marginBottom: 8 }}>{f.title}</h3>
              <p style={{ color: '#555', lineHeight: 1.6 }}>{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      <section id="pricing" style={{ marginBottom: 64 }}>
        <h2 style={{ fontSize: 32, fontWeight: 700, marginBottom: 24 }}>Pricing</h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 20 }}>
          {[
            { name: 'Single Report', price: '₹4,999', desc: '1 report, 2 competitors', badge: '' },
            { name: 'Starter', price: '₹12,499/mo', desc: '5 reports, 2 competitors', badge: '' },
            { name: 'Growth', price: '₹32,999/mo', desc: '20 reports, 3 competitors', badge: 'Popular' },
            { name: 'Agency', price: '₹49,999/mo', desc: 'Unlimited reports, 5 competitors', badge: '' },
          ].map(p => (
            <div key={p.name} style={{ background: '#fff', border: '1.5px solid #e2e8f0', borderRadius: 12, padding: 28, position: 'relative' }}>
              {p.badge && <span style={{ position: 'absolute', top: 16, right: 16, background: '#2563eb', color: '#fff', borderRadius: 20, padding: '2px 12px', fontSize: 13, fontWeight: 700 }}>{p.badge}</span>}
              <h3 style={{ fontSize: 20, fontWeight: 700, marginBottom: 4 }}>{p.name}</h3>
              <div style={{ fontSize: 28, fontWeight: 800, color: '#2563eb', marginBottom: 8 }}>{p.price}</div>
              <p style={{ color: '#555', marginBottom: 20 }}>{p.desc}</p>
              <a href="/pulseapp" style={{ display: 'inline-block', background: '#2563eb', color: '#fff', padding: '10px 24px', borderRadius: 8, textDecoration: 'none', fontWeight: 600 }}>Get Started</a>
            </div>
          ))}
        </div>
      </section>

      <footer style={{ borderTop: '1px solid #e2e8f0', paddingTop: 32, color: '#888', fontSize: 14 }}>
        <p>© {new Date().getFullYear()} Klaro Services. All rights reserved.</p>
        <p style={{ marginTop: 8 }}>
          <a href="/pulseapp" style={{ color: '#2563eb', marginRight: 16 }}>App</a>
          <a href="mailto:hello@klaro.services" style={{ color: '#2563eb' }}>Contact</a>
        </p>
      </footer>
    </main>
  )
}
