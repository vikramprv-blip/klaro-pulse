export async function runSecurityAudit(page, url) {
  const findings = [];
  let score = 100;
  if (!url.startsWith('https://')) {
    findings.push({ severity: 'critical', issue: 'Page served over HTTP', recommendation: 'Enforce HTTPS across all pages.' });
    score -= 30;
  }
  try {
    const pageFindings = await page.evaluate(() => {
      const issues = [];
      document.querySelectorAll('input[type=password]').forEach(el => {
        const ac = el.getAttribute('autocomplete');
        if (ac !== 'off' && ac !== 'new-password') issues.push({ type: 'autocomplete_password' });
      });
      document.querySelectorAll('form').forEach(form => {
        const hasToken = form.querySelector('input[name*=csrf], input[name*=token], input[name*=_token]');
        if (!hasToken && form.method?.toLowerCase() === 'post') issues.push({ type: 'missing_csrf' });
      });
      document.querySelectorAll('iframe').forEach(el => {
        if (el.src && !el.src.includes(window.location.hostname)) issues.push({ type: 'third_party_iframe', src: el.src });
      });
      document.querySelectorAll('img[src^="http:"], script[src^="http:"]').forEach(() => {
        issues.push({ type: 'mixed_content' });
      });
      return issues;
    });
    pageFindings.forEach(f => {
      if (f.type === 'autocomplete_password') { findings.push({ severity: 'medium', issue: 'Password field allows autocomplete', recommendation: 'Set autocomplete="new-password" on password fields.' }); score -= 8; }
      if (f.type === 'missing_csrf') { findings.push({ severity: 'high', issue: 'POST form may lack CSRF protection', recommendation: 'Add CSRF tokens to all POST forms.' }); score -= 15; }
      if (f.type === 'mixed_content') { findings.push({ severity: 'high', issue: 'Mixed content: HTTP resources on HTTPS page', recommendation: 'Update all resource URLs to HTTPS.' }); score -= 12; }
      if (f.type === 'third_party_iframe') { findings.push({ severity: 'medium', issue: `Third-party iframe: ${f.src}`, recommendation: 'Audit and sandbox third-party iframes.' }); score -= 5; }
    });
  } catch (e) {}
  return { score: Math.max(0, score), findings, status: score >= 80 ? 'good' : score >= 60 ? 'needs_improvement' : 'critical' };
}
