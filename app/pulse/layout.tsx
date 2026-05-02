import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Klaro Pulse — AI Site Intelligence & Compliance Audit',
  description: 'Scan any website in 30 seconds. AI audits UX, conversion, security, ADA compliance, DNS/email security and SOC2 readiness. No installation needed. Works on competitor sites too.',
  keywords: 'website audit, AI website scanner, UX audit, ADA compliance, SOC2 readiness, DNS security, DMARC, SPF, DKIM, conversion rate optimisation, site intelligence',
  authors: [{ name: 'Klaro Global', url: 'https://klaro.services' }],
  creator: 'Klaro Global',
  publisher: 'Klaro Global',
  metadataBase: new URL('https://klaro.services'),
  alternates: { canonical: 'https://klaro.services/pulse' },
  openGraph: {
    type: 'website',
    url: 'https://klaro.services/pulse',
    title: 'Klaro Pulse — Know your website score in 30 seconds',
    description: 'AI audits any public website for UX, conversion, security, ADA compliance and DNS health. No installation. Works on competitor sites.',
    siteName: 'Klaro Pulse',
    images: [{ url: '/og-pulse.png', width: 1200, height: 630, alt: 'Klaro Pulse — AI Site Intelligence' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Klaro Pulse — AI Site Intelligence',
    description: 'Scan any website in 30 seconds. UX, security, ADA, DNS, SOC2 readiness.',
    images: ['/og-pulse.png'],
  },
  robots: { index: true, follow: true, googleBot: { index: true, follow: true } },
}

export default function PulseLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
