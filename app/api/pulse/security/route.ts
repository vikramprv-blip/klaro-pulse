import { NextRequest, NextResponse } from 'next/server'

export async function POST(req: NextRequest) {
  const { url } = await req.json()
  if (!url) return NextResponse.json({ error: 'Missing url' }, { status: 400 })

  let hostname = ''
  try { hostname = new URL(url).hostname } catch {
    return NextResponse.json({ error: 'Invalid URL' }, { status: 400 })
  }

  async function dnsLookup(name: string, type: string) {
    try {
      const r = await fetch(`https://cloudflare-dns.com/dns-query?name=${encodeURIComponent(name)}&type=${type}`, {
        headers: { 'Accept': 'application/dns-json' },
        signal: AbortSignal.timeout(6000)
      })
      const d = await r.json()
      return d.Answer || []
    } catch { return [] }
  }

  // 1. SSL check
  let sslValid = url.startsWith('https://')
  let sslStatus = 0
  try {
    const res = await fetch(`https://${hostname}`, { signal: AbortSignal.timeout(8000) })
    sslValid = true
    sslStatus = res.status
  } catch { sslValid = url.startsWith('https://') }

  // 2. MX records — identify email provider
  const mxRecords = await dnsLookup(hostname, 'MX')
  const mxData = mxRecords.map((r: any) => (r.data || '').toLowerCase())
  const mxFound = mxRecords.length > 0

  // Detect provider from MX
  let detectedProvider = 'Unknown'
  let providerSelectors: string[] = []

  if (mxData.some((m: string) => m.includes('zoho'))) {
    detectedProvider = 'Zoho Mail'
    providerSelectors = ['zoho', 'zmail', 'zohomail', 'zm1', 'zm2']
  } else if (mxData.some((m: string) => m.includes('google') || m.includes('gmail') || m.includes('googlemail'))) {
    detectedProvider = 'Google Workspace'
    providerSelectors = ['google', 'googlemail', 's1', 's2', 'gm1']
  } else if (mxData.some((m: string) => m.includes('outlook') || m.includes('microsoft') || m.includes('office365'))) {
    detectedProvider = 'Microsoft 365'
    providerSelectors = ['selector1', 'selector2', 'selector1-klaro-services', 'selector2-klaro-services']
  } else if (mxData.some((m: string) => m.includes('amazonses') || m.includes('amazon'))) {
    detectedProvider = 'Amazon SES'
    providerSelectors = ['ses', 'amazonses', 'amazon', 'ses1', 'ses2']
  } else if (mxData.some((m: string) => m.includes('mailgun'))) {
    detectedProvider = 'Mailgun'
    providerSelectors = ['mailo', 'pic', 'k1', 'k2', 'mg']
  } else if (mxData.some((m: string) => m.includes('sendgrid'))) {
    detectedProvider = 'SendGrid'
    providerSelectors = ['s1', 's2', 'sg', 'sendgrid', 'smtpapi']
  } else if (mxData.some((m: string) => m.includes('mailchimp') || m.includes('mandrill'))) {
    detectedProvider = 'Mailchimp/Mandrill'
    providerSelectors = ['mandrill', 'k1', 'k2', 'mc', 'mcsv']
  } else if (mxData.some((m: string) => m.includes('mimecast'))) {
    detectedProvider = 'Mimecast'
    providerSelectors = ['mc1', 'mc2', 'mimecast', 'selector1', 'selector2']
  } else if (mxData.some((m: string) => m.includes('proofpoint'))) {
    detectedProvider = 'Proofpoint'
    providerSelectors = ['pp1', 'pp2', 'proofpoint', 'selector1', 'selector2']
  }

  // Always try generic selectors too
  const genericSelectors = ['default', 'dkim', 'mail', 'email', 'key1', 'key2', 'dkim1', 'dkim2', 'smtp', 'selector1', 'selector2', 'k1', 'k2', 's1', 's2', 'resend', 'brevo', 'sendinblue', 'postmark', 'pm']
  const allSelectors = [...new Set([...providerSelectors, ...genericSelectors])]

  // 3. SPF check
  const txtRecords = await dnsLookup(hostname, 'TXT')
  const spfRecord = txtRecords.find((r: any) => r.data?.includes('v=spf1'))
  const spfFound = !!spfRecord
  const spfRecord_val = spfRecord?.data || null

  // 4. DMARC check
  const dmarcRecords = await dnsLookup(`_dmarc.${hostname}`, 'TXT')
  const dmarcRecord = dmarcRecords.find((r: any) => r.data?.includes('v=DMARC1'))
  const dmarcFound = !!dmarcRecord
  const dmarcPolicy = dmarcRecord?.data?.match(/p=(\w+)/)?.[1] || null

  // 5. DKIM — try provider-specific first, then generic
  let dkimFound = false
  let dkimSelector = ''
  let dkimRecord = ''

  for (const selector of allSelectors) {
    const records = await dnsLookup(`${selector}._domainkey.${hostname}`, 'TXT')
    if (records.length > 0 && records.some((r: any) => r.data?.includes('v=DKIM1') || r.data?.includes('p='))) {
      dkimFound = true
      dkimSelector = selector
      dkimRecord = records[0]?.data?.slice(0, 100) || ''
      break
    }
  }

  // Also try with subdomain stripped (e.g. mail.domain.com → domain.com)
  if (!dkimFound && hostname.split('.').length > 2) {
    const rootDomain = hostname.split('.').slice(-2).join('.')
    for (const selector of allSelectors.slice(0, 8)) {
      const records = await dnsLookup(`${selector}._domainkey.${rootDomain}`, 'TXT')
      if (records.length > 0 && records.some((r: any) => r.data?.includes('v=DKIM1') || r.data?.includes('p='))) {
        dkimFound = true
        dkimSelector = `${selector} (root domain)`
        dkimRecord = records[0]?.data?.slice(0, 100) || ''
        break
      }
    }
  }

  const emailScore = Math.round((
    (spfFound ? 100 : 0) +
    (dmarcFound ? 100 : 0) +
    (dkimFound ? 100 : 0)
  ) / 3)

  const recommendations = [
    !spfFound && 'Add SPF record: v=spf1 include:[yourprovider.com] ~all',
    !dmarcFound && 'Add DMARC policy: _dmarc.' + hostname + ' → v=DMARC1; p=quarantine; rua=mailto:dmarc@' + hostname,
    !dkimFound && `Configure DKIM in ${detectedProvider !== 'Unknown' ? detectedProvider : 'your email provider'} and add the DNS key they provide`,
    dmarcFound && dmarcPolicy === 'none' && 'Strengthen DMARC from p=none to p=quarantine or p=reject',
    spfFound && spfRecord_val?.includes('+all') && 'Your SPF record uses +all which is too permissive — change to ~all or -all',
  ].filter(Boolean)

  return NextResponse.json({
    hostname,
    email_provider: detectedProvider,
    email_security_score: emailScore,
    checks: {
      ssl: { valid: sslValid, enforced: url.startsWith('https://'), status: sslStatus },
      mx: { found: mxFound, records: mxData.slice(0, 3), provider: detectedProvider },
      spf: { found: spfFound, record: spfRecord_val, score: spfFound ? 100 : 0 },
      dmarc: { found: dmarcFound, record: dmarcRecord?.data || null, policy: dmarcPolicy, score: dmarcFound ? 100 : 0 },
      dkim: { found: dkimFound, selector: dkimSelector, record: dkimRecord, score: dkimFound ? 100 : 0 },
    },
    summary: {
      ssl_valid: sslValid,
      spf_configured: spfFound,
      dmarc_configured: dmarcFound,
      dkim_configured: dkimFound,
      email_security_score: emailScore,
      recommendations,
    }
  })
}
