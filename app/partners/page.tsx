'use client'

export default function PartnersPage() {
  return (
    <div style={{ minHeight: '100vh', background: '#080c14', color: '#94a3b8' }}>
      <div style={{ background: '#0a0f1a', borderBottom: '1px solid #1e2a3a', padding: '0 24px', height: '56px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', position: 'sticky', top: 0, zIndex: 20 }}>
        <div style={{ fontSize: '16px', fontWeight: 900, color: 'white' }}>KLARO <span style={{ color: '#6366f1' }}>PULSE</span> <span style={{ fontSize: '11px', color: '#475569', marginLeft: '8px' }}>PARTNER PROGRAM</span></div>
        <div style={{ display: 'flex', gap: '10px' }}>
          <a href="/dashboard" style={{ fontSize: '12px', color: '#818cf8', textDecoration: 'none', border: '1px solid #3b4fd8', borderRadius: '8px', padding: '5px 12px' }}>Dashboard</a>
          <a href="https://klaro.services/pulse" style={{ fontSize: '12px', color: '#818cf8', textDecoration: 'none', border: '1px solid #3b4fd8', borderRadius: '8px', padding: '5px 12px' }}>← Klaro Pulse</a>
        </div>
      </div>

      <div style={{ maxWidth: '1000px', margin: '0 auto', padding: '60px 24px' }}>

        {/* Hero */}
        <div style={{ textAlign: 'center', marginBottom: '60px' }}>
          <div style={{ fontSize: '11px', fontWeight: 700, color: '#818cf8', letterSpacing: '0.15em', textTransform: 'uppercase', marginBottom: '16px' }}>CPA & ACCOUNTING FIRM PARTNER PROGRAM</div>
          <div style={{ fontSize: '40px', fontWeight: 900, color: 'white', lineHeight: 1.2, marginBottom: '16px' }}>
            Offer Your Clients a<br /><span style={{ color: '#6366f1' }}>Competitive Edge</span>
          </div>
          <div style={{ fontSize: '16px', color: '#64748b', maxWidth: '600px', margin: '0 auto', lineHeight: 1.7 }}>
            White-label Klaro Pulse under your firm's brand. Run AI-powered site audits for your clients. Earn 40% revenue share on every scan.
          </div>
          <a href="mailto:ops@klaro.services?subject=CPA Partner Program Enquiry" style={{ display: 'inline-block', marginTop: '24px', padding: '14px 32px', background: 'linear-gradient(135deg,#6366f1,#8b5cf6)', color: 'white', borderRadius: '12px', fontSize: '15px', fontWeight: 700, textDecoration: 'none' }}>
            Apply for Partnership →
          </a>
        </div>

        {/* How it works */}
        <div style={{ background: '#0f1420', border: '1px solid #1e2a3a', borderRadius: '16px', padding: '32px', marginBottom: '24px' }}>
          <div style={{ fontSize: '18px', fontWeight: 800, color: 'white', marginBottom: '24px' }}>How It Works</div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: '20px' }}>
            {[
              { step: '01', title: 'You Bring the Client', desc: 'Use your existing CA/CPA client relationships. You know their business — we provide the intelligence tool.' },
              { step: '02', title: 'We Run the Audit', desc: 'Our AI scans their website, runs the LAM agent as a real visitor, checks ADA, SOC, GDPR compliance.' },
              { step: '03', title: 'You Deliver the Report', desc: 'Branded under your firm name. You present the findings, upsell your advisory services, we handle the tech.' },
            ].map(({ step, title, desc }) => (
              <div key={step} style={{ textAlign: 'center' }}>
                <div style={{ fontSize: '36px', fontWeight: 900, color: '#6366f1', marginBottom: '8px' }}>{step}</div>
                <div style={{ fontSize: '14px', fontWeight: 700, color: 'white', marginBottom: '8px' }}>{title}</div>
                <div style={{ fontSize: '13px', color: '#64748b', lineHeight: 1.6 }}>{desc}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Revenue model */}
        <div style={{ background: '#0f1420', border: '1px solid #1e2a3a', borderRadius: '16px', padding: '32px', marginBottom: '24px' }}>
          <div style={{ fontSize: '18px', fontWeight: 800, color: 'white', marginBottom: '20px' }}>Revenue Share Model</div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: '16px', marginBottom: '20px' }}>
            {[
              { product: 'LLM Site Audit', price: '$59.99', your_cut: '$24', desc: 'Single comprehensive site report' },
              { product: 'LAM Audit', price: '$299', your_cut: '$120', desc: 'AI visits site as real client' },
              { product: 'Monthly Monitoring', price: '$149/mo', your_cut: '$60/mo', desc: 'Weekly scans + alerts' },
            ].map(({ product, price, your_cut, desc }) => (
              <div key={product} style={{ background: '#080c14', border: '1px solid #1e2a3a', borderRadius: '12px', padding: '20px', textAlign: 'center' }}>
                <div style={{ fontSize: '13px', fontWeight: 700, color: 'white', marginBottom: '6px' }}>{product}</div>
                <div style={{ fontSize: '24px', fontWeight: 900, color: '#818cf8', marginBottom: '4px' }}>{price}</div>
                <div style={{ fontSize: '11px', color: '#475569', marginBottom: '12px' }}>{desc}</div>
                <div style={{ background: '#052e16', border: '1px solid #166534', borderRadius: '8px', padding: '8px' }}>
                  <div style={{ fontSize: '10px', color: '#4ade80', fontWeight: 700, marginBottom: '2px' }}>YOUR EARNINGS</div>
                  <div style={{ fontSize: '20px', fontWeight: 900, color: '#4ade80' }}>{your_cut}</div>
                </div>
              </div>
            ))}
          </div>
          <div style={{ background: '#0c1a3a', border: '1px solid #3b4fd8', borderRadius: '10px', padding: '16px', textAlign: 'center', fontSize: '13px', color: '#818cf8' }}>
            💡 A CPA firm with just 10 clients running monthly monitoring earns <strong style={{ color: 'white' }}>$600/month passive income</strong> with zero technical work.
          </div>
        </div>

        {/* What partners get */}
        <div style={{ background: '#0f1420', border: '1px solid #1e2a3a', borderRadius: '16px', padding: '32px', marginBottom: '24px' }}>
          <div style={{ fontSize: '18px', fontWeight: 800, color: 'white', marginBottom: '20px' }}>What You Get as a Partner</div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            {[
              '✓ White-label reports with your firm name and logo',
              '✓ Dedicated partner dashboard to manage all client scans',
              '✓ Priority support and dedicated account manager',
              '✓ 40% revenue share on all client-generated scans',
              '✓ Training materials and sales scripts for client conversations',
              '✓ Co-marketing opportunities — we promote your firm on our site',
              '✓ Early access to new features before public launch',
              '✓ Reseller rights — sub-license to other firms in your network',
            ].map((item, i) => (
              <div key={i} style={{ fontSize: '13px', color: '#64748b', padding: '10px 14px', background: '#080c14', border: '1px solid #1e2a3a', borderRadius: '8px' }}>{item}</div>
            ))}
          </div>
        </div>

        {/* SOC 2 readiness section */}
        <div style={{ background: '#0a0d18', border: '1px solid #3b4fd8', borderRadius: '16px', padding: '32px', marginBottom: '24px' }}>
          <div style={{ fontSize: '11px', fontWeight: 700, color: '#818cf8', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: '12px' }}>FOR ACCOUNTING FIRMS</div>
          <div style={{ fontSize: '22px', fontWeight: 900, color: 'white', marginBottom: '12px' }}>Help Your Clients Prepare for SOC 2</div>
          <div style={{ fontSize: '14px', color: '#64748b', lineHeight: 1.7, marginBottom: '20px' }}>
            Klaro Pulse provides a <strong style={{ color: 'white' }}>SOC 2 surface readiness assessment</strong> — scanning DNS security (SPF, DKIM, DMARC), SSL certificates, cookie consent, privacy policies, and ADA compliance. While full SOC 2 certification requires a licensed auditor (that's you), Klaro Pulse identifies the gaps before the formal audit — saving your clients time and your firm embarrassment.
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: '12px', marginBottom: '20px' }}>
            {[
              ['DNS Security', 'SPF, DKIM, DMARC verification'],
              ['SSL/TLS', 'Certificate validity and expiry'],
              ['Cookie Consent', 'GDPR/ePrivacy compliance signals'],
              ['ADA/WCAG', 'Accessibility compliance scoring'],
            ].map(([title, desc]) => (
              <div key={title} style={{ background: '#080c14', border: '1px solid #1e2a3a', borderRadius: '10px', padding: '14px', textAlign: 'center' }}>
                <div style={{ fontSize: '12px', fontWeight: 700, color: '#818cf8', marginBottom: '6px' }}>{title}</div>
                <div style={{ fontSize: '11px', color: '#475569', lineHeight: 1.5 }}>{desc}</div>
              </div>
            ))}
          </div>
          <div style={{ fontSize: '13px', color: '#64748b', fontStyle: 'italic' }}>
            Note: Klaro Pulse provides readiness assessment, not SOC 2 certification. Formal certification requires a licensed CPA auditor.
          </div>
        </div>

        {/* CTA */}
        <div style={{ textAlign: 'center', padding: '40px', background: '#0f1420', border: '1px solid #1e2a3a', borderRadius: '16px' }}>
          <div style={{ fontSize: '24px', fontWeight: 900, color: 'white', marginBottom: '8px' }}>Ready to Partner With Us?</div>
          <div style={{ fontSize: '14px', color: '#64748b', marginBottom: '24px' }}>We're currently onboarding a limited number of CPA partners. Apply now to secure your spot.</div>
          <div style={{ display: 'flex', gap: '12px', justifyContent: 'center', flexWrap: 'wrap' }}>
            <a href="mailto:ops@klaro.services?subject=CPA Partner Program Application" style={{ padding: '14px 32px', background: 'linear-gradient(135deg,#6366f1,#8b5cf6)', color: 'white', borderRadius: '12px', fontSize: '14px', fontWeight: 700, textDecoration: 'none' }}>
              Apply for Partnership →
            </a>
            <a href="mailto:ops@klaro.services?subject=Partner Program Questions" style={{ padding: '14px 32px', background: 'transparent', color: '#818cf8', border: '1px solid #3b4fd8', borderRadius: '12px', fontSize: '14px', fontWeight: 700, textDecoration: 'none' }}>
              Ask a Question
            </a>
          </div>
        </div>
      </div>
    </div>
  )
}
