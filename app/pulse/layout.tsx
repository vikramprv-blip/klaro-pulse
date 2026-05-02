import type { Metadata } from 'next'
import CookieBanner from '../components/CookieBanner'

export const metadata: Metadata = {
  title: 'Klaro Pulse — AI Site Intelligence & Compliance Audit',
  description: 'Scan any website in 30 seconds. AI audits UX, conversion, security, ADA compliance, DNS/email security and SOC2 readiness. No installation needed.',
  keywords: 'website audit, AI website scanner, UX audit, ADA compliance, SOC2 readiness, DNS security, DMARC, SPF, DKIM, conversion optimisation',
  authors: [{ name: 'Klaro Global', url: 'https://klaro.services' }],
  metadataBase: new URL('https://klaro.services'),
  alternates: { canonical: 'https://klaro.services/pulse' },
  openGraph: {
    type: 'website',
    url: 'https://klaro.services/pulse',
    title: 'Klaro Pulse — Know your website score in 30 seconds',
    description: 'AI audits any public website for UX, conversion, security, ADA compliance and DNS health. No installation. Works on competitor sites.',
    siteName: 'Klaro Pulse',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Klaro Pulse — AI Site Intelligence',
    description: 'Scan any website in 30 seconds. UX, security, ADA, DNS, SOC2 readiness.',
  },
  robots: { index: true, follow: true },
}

export default function PulseLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      {children}
      <CookieBanner />
    </>
  )
}
