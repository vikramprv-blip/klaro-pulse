export async function runAccessibilityAudit(page) {
  try {
    const results = await page.evaluate(() => {
      const issues = [];
      document.querySelectorAll('img').forEach(img => {
        if (!img.getAttribute('alt')) issues.push({ severity: 'high', issue: 'Image missing alt text', recommendation: 'Add descriptive alt attribute to all images.' });
      });
      document.querySelectorAll('input, select, textarea').forEach(el => {
        const id = el.getAttribute('id');
        const label = id ? document.querySelector(`label[for="${id}"]`) : null;
        const ariaLabel = el.getAttribute('aria-label');
        if (!label && !ariaLabel) issues.push({ severity: 'high', issue: `Form field missing label: ${el.outerHTML.slice(0, 60)}`, recommendation: 'Add a label element or aria-label to every form field.' });
      });
      document.querySelectorAll('a').forEach(a => {
        if (!a.textContent.trim() && !a.getAttribute('aria-label')) issues.push({ severity: 'medium', issue: 'Link has no visible text', recommendation: 'Add descriptive text or aria-label to all links.' });
      });
      const headings = Array.from(document.querySelectorAll('h1,h2,h3,h4,h5,h6')).map(h => parseInt(h.tagName[1]));
      for (let i = 1; i < headings.length; i++) {
        if (headings[i] - headings[i-1] > 1) { issues.push({ severity: 'low', issue: 'Heading levels skip (e.g. h1 to h3)', recommendation: 'Use sequential heading levels for proper document structure.' }); break; }
      }
      return issues;
    });
    const critical = results.filter(v => v.severity === 'critical').length;
    const high = results.filter(v => v.severity === 'high').length;
    const medium = results.filter(v => v.severity === 'medium').length;
    const score = Math.max(0, 100 - (critical * 15) - (high * 8) - (medium * 3));
    return { score, status: score >= 80 ? 'good' : score >= 60 ? 'needs_improvement' : 'critical', violations: results };
  } catch (e) {
    return { score: 50, status: 'error', violations: [], error: e.message };
  }
}
