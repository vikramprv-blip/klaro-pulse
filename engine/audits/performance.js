export async function runPerformanceAudit(page, url) {
  try {
    await page.goto(url, { waitUntil: 'networkidle', timeout: 30000 });
    const metrics = await page.evaluate(() => {
      const nav = performance.getEntriesByType('navigation')[0];
      const paint = performance.getEntriesByType('paint');
      const fcp = paint.find(e => e.name === 'first-contentful-paint');
      return {
        domContentLoaded: Math.round(nav?.domContentLoadedEventEnd || 0),
        loadTime: Math.round(nav?.loadEventEnd || 0),
        ttfb: Math.round((nav?.responseStart || 0) - (nav?.requestStart || 0)),
        fcp: Math.round(fcp?.startTime || 0),
        domSize: document.querySelectorAll('*').length,
        imageCount: document.querySelectorAll('img').length,
        scriptCount: document.querySelectorAll('script').length,
        transferSize: Math.round((nav?.transferSize || 0) / 1024)
      };
    });
    let score = 100;
    const findings = [];
    if (metrics.fcp > 3000) { score -= 20; findings.push({ metric: 'FCP', value: `${metrics.fcp}ms`, recommendation: 'First Contentful Paint exceeds 3s. Reduce render-blocking resources.' }); }
    else if (metrics.fcp > 1800) { score -= 10; findings.push({ metric: 'FCP', value: `${metrics.fcp}ms`, recommendation: 'First Contentful Paint exceeds 1.8s target.' }); }
    if (metrics.ttfb > 600) { score -= 15; findings.push({ metric: 'TTFB', value: `${metrics.ttfb}ms`, recommendation: 'Time to First Byte is high. Check server response time and CDN.' }); }
    if (metrics.loadTime > 5000) { score -= 20; findings.push({ metric: 'Load', value: `${metrics.loadTime}ms`, recommendation: 'Total load time exceeds 5s. Optimise images and defer scripts.' }); }
    else if (metrics.loadTime > 3000) { score -= 10; findings.push({ metric: 'Load', value: `${metrics.loadTime}ms`, recommendation: 'Total load time exceeds 3s.' }); }
    if (metrics.domSize > 1500) { score -= 10; findings.push({ metric: 'DOM Size', value: metrics.domSize, recommendation: 'Large DOM may cause rendering slowness.' }); }
    return { score: Math.max(0, score), metrics, findings, status: score >= 80 ? 'good' : score >= 60 ? 'needs_improvement' : 'poor' };
  } catch (e) {
    return { score: 50, metrics: {}, findings: [], status: 'error', error: e.message };
  }
}
