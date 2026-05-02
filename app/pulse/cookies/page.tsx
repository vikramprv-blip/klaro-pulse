import Link from 'next/link'

export const metadata = {
  title: 'Cookie Policy — Klaro Pulse',
  description: 'How Klaro Pulse uses cookies and how to manage your preferences.',
}

export default function CookiePolicyPage() {
  return (
    <div style={{ fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif', background: 'white', minHeight: '100vh' }}>
      {/* Nav */}
      <div style={{ background: '#0a0f1a', borderBottom: '1px solid #1e2a3a', padding: '0 40px', height: '56px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <img src="/klaro-logo.png" alt="Klaro" style={{ width: '28px', height: '28px', borderRadius: '6px', objectFit: 'cover' }} />
          <span style={{ fontSize: '15px', fontWeight: 800, color: 'white' }}>Klaro <span style={{ color: '#6366f1' }}>Pulse</span></span>
        </div>
        <Link href="/pulse" style={{ fontSize: '12px', color: '#818cf8', textDecoration: 'none' }}>← Back to Pulse</Link>
      </div>

      <div style={{ maxWidth: '760px', margin: '0 auto', padding: '60px 32px' }}>
        <div style={{ fontSize: '12px', color: '#6366f1', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '12px' }}>LEGAL · KLARO PULSE</div>
        <h1 style={{ fontSize: '36px', fontWeight: 900, color: '#0f172a', marginBottom: '8px' }}>Cookie Policy</h1>
        <p style={{ fontSize: '13px', color: '#94a3b8', marginBottom: '48px' }}>Last updated: 2 May 2026 · Applies to klaro.services/pulse and klaro-pulse.vercel.app</p>

        {[
          {
            title: 'What are cookies?',
            content: 'Cookies are small text files stored on your device when you visit Klaro Pulse. They help us keep you signed in, remember your preferences, and understand how the product is being used so we can improve it.'
          },
          {
            title: 'What cookies we use',
            table: [
              ['sb-access-token', 'Essential', 'Supabase authentication — keeps you signed in', '1 hour'],
              ['sb-refresh-token', 'Essential', 'Renews your session automatically', '30 days'],
              ['klaro-pulse:cookie-consent', 'Essential', 'Stores your cookie consent preference', '1 year'],
              ['klaro-pulse:session', 'Essential', 'Maintains your current session state', 'Session'],
              ['_vercel_analytics', 'Analytics (opt-in)', 'Anonymous page view analytics via Vercel', '1 year'],
            ]
          },
          {
            title: 'Your rights by region',
            regions: [
              { flag: '🇪🇺', name: 'European Union — GDPR', rights: ['Right to withdraw consent at any time', 'Right to access your data', 'Right to erasure ("right to be forgotten")', 'Right to data portability', 'Right to object to processing'] },
              { flag: '🇺🇸', name: 'California — CCPA/CPRA', rights: ['Right to know what personal information is collected', 'Right to delete personal information', 'Right to opt-out of sale of personal information (we do not sell data)', 'Right to non-discrimination for exercising rights'] },
              { flag: '🇮🇳', name: 'India — DPDP Act 2023', rights: ['Right to information about processing', 'Right to correction and erasure', 'Right to grievance redressal', 'Right to nominate a representative'] },
              { flag: '🇨🇦', name: 'Canada — PIPEDA', rights: ['Right to access personal information', 'Right to challenge accuracy', 'Meaningful consent required before collection'] },
            ]
          },
          {
            title: 'Third-party services',
            content: 'Klaro Pulse uses the following third-party services that may set their own cookies: Supabase (authentication and database), Vercel (hosting and analytics). We do not use Google Analytics, Facebook Pixel, or any advertising cookies. We do not sell your personal data to any third party.'
          },
          {
            title: 'How to manage cookies',
            content: 'You can manage your cookie preferences at any time by clicking "Cookie Preferences" in the footer of any Klaro Pulse page. You can also control cookies through your browser settings. Note that disabling essential cookies will prevent you from signing in to Klaro Pulse.'
          },
          {
            title: 'Contact us',
            content: 'For any questions about this cookie policy, your data rights, or to make a data subject access request, contact us at: privacy@klaro.services · Klaro Global · ops@klaro.services'
          },
        ].map(({ title, content, table, regions }) => (
          <div key={title} style={{ marginBottom: '40px' }}>
            <h2 style={{ fontSize: '18px', fontWeight: 800, color: '#0f172a', marginBottom: '12px', paddingBottom: '8px', borderBottom: '1px solid #f1f5f9' }}>{title}</h2>
            {content && <p style={{ fontSize: '14px', color: '#4b5563', lineHeight: 1.8 }}>{content}</p>}
            {table && (
              <div style={{ border: '1px solid #e2e8f0', borderRadius: '12px', overflow: 'hidden' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                  <thead>
                    <tr style={{ background: '#f8fafc' }}>
                      {['Cookie', 'Category', 'Purpose', 'Duration'].map(h => (
                        <th key={h} style={{ padding: '10px 16px', textAlign: 'left', fontWeight: 700, color: '#374151', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.04em' }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {table.map(([name, cat, purpose, dur]) => (
                      <tr key={name} style={{ borderTop: '1px solid #f1f5f9' }}>
                        <td style={{ padding: '10px 16px', fontFamily: 'monospace', fontSize: '12px', color: '#6366f1' }}>{name}</td>
                        <td style={{ padding: '10px 16px', color: cat.includes('opt-in') ? '#d97706' : '#16a34a', fontWeight: 600, fontSize: '12px' }}>{cat}</td>
                        <td style={{ padding: '10px 16px', color: '#4b5563' }}>{purpose}</td>
                        <td style={{ padding: '10px 16px', color: '#94a3b8' }}>{dur}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
            {regions && (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                {regions.map(({ flag, name, rights }) => (
                  <div key={name} style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '18px' }}>
                    <div style={{ fontSize: '14px', fontWeight: 700, color: '#0f172a', marginBottom: '10px' }}>{flag} {name}</div>
                    {rights.map(r => (
                      <div key={r} style={{ fontSize: '12px', color: '#4b5563', padding: '4px 0', borderBottom: '1px solid #f1f5f9' }}>✓ {r}</div>
                    ))}
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Footer */}
      <div style={{ background: '#020617', borderTop: '1px solid #1e293b', padding: '24px 40px', textAlign: 'center' }}>
        <div style={{ fontSize: '12px', color: '#475569' }}>
          © 2026 Klaro Global · <a href="mailto:privacy@klaro.services" style={{ color: '#818cf8', textDecoration: 'none' }}>privacy@klaro.services</a> · <Link href="/pulse" style={{ color: '#818cf8', textDecoration: 'none' }}>klaro.services/pulse</Link>
        </div>
      </div>
    </div>
  )
}
