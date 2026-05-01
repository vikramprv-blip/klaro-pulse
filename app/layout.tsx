import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Klaro Pulse — Site Intelligence',
  description: 'AI-powered site auditing. Find every flaw in any website, instantly.',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body style={{ margin: 0, padding: 0, background: '#080c14', color: '#94a3b8', fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif' }}>
        {children}
      </body>
    </html>
  )
}
