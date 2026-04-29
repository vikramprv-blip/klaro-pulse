import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://vhnvclvzxkybnybqgyci.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZobnZjbHZ6eGt5Ym55YnFneWNpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzczOTc1MjIsImV4cCI6MjA5Mjk3MzUyMn0.toq9DNk257c58p2dNOvjc2vYBY7zClF2RY2tGv8m1VY'
);

export async function generateReport(runId, journey, outcome, stepResults, auditResults, narrative) {
  console.log('Generating report for run ' + runId);
  const date = new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });

  function scoreColor(s) {
    if (s >= 80) return '#10b981';
    if (s >= 60) return '#f59e0b';
    return '#ef4444';
  }

  const stepsHtml = stepResults.map((s, i) => `
    <div style="padding:12px 0;border-bottom:1px solid #e2e8f0">
      <div style="display:flex;align-items:center;gap:8px;margin-bottom:4px">
        <span style="font-size:11px;color:#94a3b8">STEP ${i + 1}</span>
        <span style="font-size:10px;font-weight:800;padding:2px 8px;border-radius:20px;background:${s.status === 'passed' ? '#d1fae5' : '#fee2e2'};color:${s.status === 'passed' ? '#065f46' : '#991b1b'}">${s.status.toUpperCase()}</span>
        ${s.heal_attempts > 0 ? '<span style="font-size:10px;background:#fef3c7;color:#92400e;padding:2px 8px;border-radius:20px;font-weight:700">SELF-HEALED</span>' : ''}
      </div>
      <div style="font-size:14px;font-weight:600;color:#0f172a;margin-bottom:3px">${s.step_description}</div>
      ${s.ai_reasoning ? '<div style="font-size:12px;color:#64748b;font-style:italic">"' + s.ai_reasoning + '"</div>' : ''}
      ${s.error_message ? '<div style="font-size:11px;color:#ef4444;margin-top:4px">' + s.error_message + '</div>' : ''}
    </div>`).join('');

  const auditsHtml = auditResults.map(a => `
    <div style="display:flex;justify-content:space-between;padding:8px 0;border-bottom:1px solid #e2e8f0">
      <span style="font-size:13px;text-transform:capitalize;color:#334155">${a.audit_type.replace('_', ' ')}</span>
      <span style="font-size:16px;font-weight:900;color:${scoreColor(a.score || 0)}">${a.score != null ? a.score : '-'}/100</span>
    </div>`).join('');

  const overallScore = auditResults.length
    ? Math.round(auditResults.reduce((s, a) => s + (a.score || 0), 0) / auditResults.length)
    : null;

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<title>Klaro Pulse Report</title>
<style>
* { box-sizing: border-box; margin: 0; padding: 0; }
body { font-family: Helvetica Neue, Arial, sans-serif; background: #f8fafc; color: #1e293b; }
.page { max-width: 860px; margin: 0 auto; padding: 48px 40px; }
.header { display: flex; justify-content: space-between; align-items: flex-start; padding-bottom: 28px; border-bottom: 2px solid #e2e8f0; margin-bottom: 36px; }
.logo { font-size: 20px; font-weight: 900; color: #0f172a; }
.logo span { color: #6366f1; }
.hero { background: #0f172a; border-radius: 16px; padding: 36px; margin-bottom: 36px; color: white; }
.stats { display: grid; grid-template-columns: repeat(4, 1fr); gap: 16px; margin-top: 20px; }
.stat { background: rgba(255,255,255,.05); border-radius: 10px; padding: 14px; }
.stat-value { font-size: 26px; font-weight: 900; }
.stat-label { font-size: 10px; color: #94a3b8; text-transform: uppercase; margin-top: 3px; }
.section-title { font-size: 16px; font-weight: 800; color: #0f172a; margin: 28px 0 14px; padding-bottom: 8px; border-bottom: 1px solid #e2e8f0; }
.narrative { background: white; border: 1px solid #e2e8f0; border-radius: 12px; padding: 24px; line-height: 1.8; font-size: 14px; color: #334155; }
.footer { text-align: center; font-size: 11px; color: #94a3b8; padding-top: 28px; border-top: 1px solid #e2e8f0; margin-top: 40px; }
</style>
</head>
<body>
<div class="page">
  <div class="header">
    <div class="logo">KLARO <span>PULSE</span></div>
    <div style="text-align:right;font-size:12px;color:#64748b">
      <div style="font-weight:600;color:#1e293b">${date}</div>
      <div>Run ${runId.slice(0, 8)}</div>
    </div>
  </div>
  <div class="hero">
    <div style="font-size:22px;font-weight:800;margin-bottom:6px">${journey.name}</div>
    <div style="color:#94a3b8;font-size:14px">${journey.goal}</div>
    <div class="stats">
      <div class="stat"><div class="stat-value" style="color:${outcome.passed ? '#10b981' : '#ef4444'}">${outcome.passed ? 'PASS' : 'FAIL'}</div><div class="stat-label">Result</div></div>
      <div class="stat"><div class="stat-value">${outcome.passed_steps}/${outcome.total_steps}</div><div class="stat-label">Steps</div></div>
      <div class="stat"><div class="stat-value" style="color:#f59e0b">${outcome.healed_steps || 0}</div><div class="stat-label">Self-Healed</div></div>
      ${overallScore !== null ? '<div class="stat"><div class="stat-value" style="color:' + scoreColor(overallScore) + '">' + overallScore + '</div><div class="stat-label">Audit Score</div></div>' : ''}
    </div>
  </div>
  <div class="section-title">Executive Summary</div>
  <div class="narrative">${narrative}</div>
  <div class="section-title">Journey Steps</div>
  ${stepsHtml}
  ${auditsHtml ? '<div class="section-title">Audit Scores</div>' + auditsHtml : ''}
  <div class="footer">Generated by Klaro Pulse AI &mdash; klaro-pulse.vercel.app<br>&copy; ${new Date().getFullYear()} Klaro Global. Confidential.</div>
</div>
</body>
</html>`;

  try {
    const htmlFilename = 'reports/run-' + runId + '.html';
    await supabase.storage.from('reports').upload(htmlFilename, Buffer.from(html), { contentType: 'text/html', upsert: true });
    const { data } = supabase.storage.from('reports').getPublicUrl(htmlFilename);
    await supabase.from('reports').insert({
      run_id: runId,
      journey_id: journey.id,
      customer_id: journey.customer_id,
      html_url: data.publicUrl,
      report_url: null
    });
    console.log('Report saved: ' + data.publicUrl);
    return { htmlUrl: data.publicUrl, pdfUrl: null };
  } catch (e) {
    console.log('Report save error: ' + e.message);
    return { htmlUrl: null, pdfUrl: null };
  }
}
