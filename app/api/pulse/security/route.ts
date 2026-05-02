import { NextRequest, NextResponse } from 'next/server'

export async function POST(req: NextRequest) {
  const { url } = await req.json()
  if (!url) return NextResponse.json({ error: 'Missing url' }, { status: 400 })

  let hostname = ''
  try { hostname = new URL(url).hostname } catch { return NextResponse.json({ error: 'Invalid URL' }, { status: 400 }) }

  const results: any = { hostname, checks: {} }

  async function dnsLookup(name: string, type: string) {
    try {
      const r = await fetch(`https://cloudflare-dns.com/dns-query?name=${name}&type=${type}`, {
        headers: { 'Accept': 'application/dns-json' },
        signal: AbortSignal.timeout(8000)
      })
      const d = await r.json()
      return d.Answer || []
    } catch { return [] }
  }

  // SSL check
  try {
    const res = await fetch(`https://${hostname}`, { signal: AbortSignal.timeout(10000) })
    results.checks.ssl = { valid: true, enforced: url.startsWith('https://'), status: res.status }
  } catch (e: any) {
    results.checks.ssl = { valid: url.startsWith('https://'), enforced: url.startsWith('https://'), error: e.message }
  }

  // SPF
  const txtRecords = await dnsLookup(hostname, 'TXT')
  const spfRecord = txtRecords.find((r: any) => r.data?.includes('v=spf1'))
  results.checks.spf = { found: !!spfRecord, record: spfRecord?.data || null, score: spfRecord ? 100 : 0 }

  // DMARC
  const dmarcRecords = await dnsLookup(`_dmarc.${hostname}`, 'TXT')
  const dmarcRecord = dmarcRecords.find((r: any) => r.data?.includes('v=DMARC1'))
  results.checks.dmarc = {
    found: !!dmarcRecord, record: dmarcRecord?.data || null,
    score: dmarcRecord ? 100 : 0,
    policy: dmarcRecord?.data?.match(/p=(\w+)/)?.[1] || null
  }

  // DKIM — comprehensive selector list including Zoho, Google, Microsoft etc
  const dkimSelectors = ['default', 'google', 'mail', 'dkim', 'k1', 'k2',
    'zoho', 'zmail', 'smtp', 'email', 'mandrill', 'sendgrid', 'mailgun',
    's1', 's2', 'key1', 'key2', 'selector1', 'selector2', 'mx', 'mxvault',
    'protonmail', 'pm', 'mailchimp', 'brevo', 'sendinblue', 'postmark',
    'amazonses', 'ses', 'resend', 'dkim1', 'dkim2', 'sig1']
  let dkimFound = false
  let dkimSelector = ''
  for (const selector of dkimSelectors) {
    const records = await dnsLookup(`${selector}._domainkey.${hostname}`, 'TXT')
    if (records.length > 0) { dkimFound = true; dkimSelector = selector; break }
  }
  results.checks.dkim = { found: dkimFound, selector: dkimSelector, score: dkimFound ? 100 : 0 }

  // MX records
  const mxRecords = await dnsLookup(hostname, 'MX')
  results.checks.mx = {
    found: mxRecords.length > 0,
    records: mxRecords.slice(0, 3).map((r: any) => r.data),
    score: mxRecords.length > 0 ? 100 : 0
  }

  const emailScore = Math.round(
    (results.checks.spf.score + results.checks.dmarc.score + results.checks.dkim.score) / 3
  )
  results.email_security_score = emailScore

  results.summary = {
    ssl_valid: results.checks.ssl.valid,
    spf_configured: results.checks.spf.found,
    dmarc_configured: results.checks.dmarc.found,
    dkim_configured: results.checks.dkim.found,
    email_security_score: emailScore,
    recommendations: [
      !results.checks.spf.found && 'Add SPF record to prevent email spoofing',
      !results.checks.dmarc.found && 'Add DMARC policy to protect domain from phishing',
      !results.checks.dkim.found && 'Configure DKIM signing for email authentication',
      !results.checks.ssl.valid && 'Fix SSL certificate — site is not secure',
      results.checks.dmarc.found && results.checks.dmarc.policy === 'none' && 'Strengthen DMARC from p=none to p=quarantine or p=reject',
    ].filter(Boolean)
  }

  return NextResponse.json(results)
}
