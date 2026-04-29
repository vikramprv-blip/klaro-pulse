import { createClient } from '@supabase/supabase-js';
import { chromium } from 'playwright';
import Groq from 'groq-sdk';
import * as dotenv from 'dotenv';
dotenv.config();

const SUPABASE_URL = 'https://chwyrdublpuavcmjendw.supabase.co';
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_ANON_KEY;
const GROQ_KEY = process.env.GROQ_API_KEY;
const POLL_INTERVAL = 30000;
const MAX_HEAL = 2;
const VISION_MODEL = 'meta-llama/llama-4-scout-17b-16e-instruct';
const TEXT_MODEL = 'llama-3.3-70b-versatile';

const db = createClient(SUPABASE_URL, SUPABASE_KEY);
const groq = new Groq({ apiKey: GROQ_KEY });

let isRunning = false;

function log(msg) { console.log(`[${new Date().toISOString()}] ${msg}`); }

function parseJSON(text) {
  const clean = text.trim().replace(/```json|```/g, '').trim();
  try { return JSON.parse(clean); } catch {}
  const m = clean.match(/\{[\s\S]*\}/);
  if (m) { try { return JSON.parse(m[0]); } catch {} }
  return null;
}

async function uploadScreenshot(buffer, runId, stepIndex, suffix = '') {
  try {
    const filename = `screenshots/${runId}/step-${stepIndex}${suffix}.png`;
    await db.storage.from('screenshots').upload(filename, buffer, { contentType: 'image/png', upsert: true });
    const { data } = db.storage.from('screenshots').getPublicUrl(filename);
    return data.publicUrl;
  } catch (e) { return null; }
}

async function askAI(screenshot, prompt) {
  const response = await groq.chat.completions.create({
    model: VISION_MODEL,
    max_tokens: 600,
    messages: [{ role: 'user', content: [
      { type: 'image_url', image_url: { url: `data:image/png;base64,${screenshot.toString('base64')}` } },
      { type: 'text', text: prompt }
    ]}]
  });
  return response.choices[0].message.content;
}

async function decideAction(screenshot, ctx) {
  const prompt = `You are a QA testing agent controlling a real browser.

JOURNEY GOAL: ${ctx.goal}
TARGET SITE: ${ctx.targetUrl}
CURRENT STEP ${ctx.stepIndex + 1} of ${ctx.totalSteps}: ${ctx.stepDesc}
CURRENT URL: ${ctx.currentUrl}
COMPLETED: ${ctx.completed.join(', ') || 'nothing yet'}

RULES:
- ONLY interact with elements on ${ctx.targetUrl} or its pages
- DO NOT navigate to any other website
- If the step says "navigate", go to ${ctx.targetUrl}
- If the step says "screenshot", use action "screenshot"
- If the step says "verify" or "check", use action "assert_visible" or "assert"
- Be specific about what you see on screen

Respond ONLY with JSON, no markdown:
{"action":"navigate|click|type|wait|scroll|assert|assert_visible|screenshot","selector":null,"url":null,"value":null,"assertText":null,"reasoning":"one sentence","confidence":85}`;

  const text = await askAI(screenshot, prompt);
  const result = parseJSON(text);
  if (!result) return { action: 'screenshot', reasoning: 'Fallback — could not parse AI response', confidence: 50 };
  
  // Safety: never navigate off the target domain
  if (result.url && !result.url.includes(new URL(ctx.targetUrl).hostname)) {
    result.url = ctx.targetUrl;
    result.reasoning = 'Corrected: staying on target domain';
  }
  return result;
}

async function healAction(screenshot, ctx, error) {
  const prompt = `QA agent. A step FAILED. Self-heal it.

GOAL: ${ctx.goal}
TARGET SITE: ${ctx.targetUrl}  
STEP: ${ctx.stepDesc}
ERROR: ${error}
URL: ${ctx.currentUrl}

Try a completely different approach. Options: scroll to element, wait longer, use text instead of CSS selector, click coordinates, dismiss overlay first.
NEVER navigate to a different website.

Respond ONLY with JSON:
{"action":"click|scroll|wait|assert_visible|screenshot","selector":null,"url":null,"value":null,"assertText":null,"reasoning":"why this works","confidence":60}`;

  const text = await askAI(screenshot, prompt);
  return parseJSON(text) || { action: 'wait', reasoning: 'Wait and retry', confidence: 40 };
}

async function executeAction(page, decision, targetUrl) {
  const a = decision.action;
  if (a === 'navigate') {
    const dest = decision.url || targetUrl;
    const safeUrl = dest.startsWith('http') ? dest : targetUrl;
    await page.goto(safeUrl, { waitUntil: 'networkidle', timeout: 20000 });
  } else if (a === 'click') {
    if (decision.selector) { await page.waitForSelector(decision.selector, { timeout: 6000 }); await page.click(decision.selector); }
  } else if (a === 'type') {
    if (decision.selector && decision.value) { await page.waitForSelector(decision.selector, { timeout: 6000 }); await page.fill(decision.selector, decision.value); }
  } else if (a === 'scroll') {
    await page.evaluate(() => window.scrollBy(0, 400));
    await page.waitForTimeout(500);
  } else if (a === 'wait') {
    await page.waitForTimeout(2500);
  } else if (a === 'assert') {
    if (decision.assertText) {
      const content = await page.textContent('body').catch(() => '');
      if (!content.includes(decision.assertText)) throw new Error(`"${decision.assertText}" not found on page`);
    }
  } else if (a === 'assert_visible') {
    if (decision.selector) await page.waitForSelector(decision.selector, { state: 'visible', timeout: 6000 });
  } else if (a === 'screenshot') {
    // just capture below
  }
}

async function runAccessibility(page) {
  try {
    const issues = await page.evaluate(() => {
      const r = [];
      document.querySelectorAll('img').forEach(img => { if (!img.alt) r.push({ severity: 'high', issue: 'Image missing alt text', recommendation: 'Add alt attribute to all images' }); });
      document.querySelectorAll('input,select,textarea').forEach(el => {
        const id = el.id; const label = id ? document.querySelector(`label[for="${id}"]`) : null;
        if (!label && !el.getAttribute('aria-label')) r.push({ severity: 'medium', issue: `Unlabelled form field: ${el.tagName}`, recommendation: 'Add label or aria-label' });
      });
      document.querySelectorAll('a').forEach(a => { if (!a.textContent.trim() && !a.getAttribute('aria-label')) r.push({ severity: 'medium', issue: 'Empty link', recommendation: 'Add descriptive link text' }); });
      return r;
    });
    const score = Math.max(0, 100 - issues.filter(i => i.severity === 'high').length * 8 - issues.filter(i => i.severity === 'medium').length * 3);
    return { score, status: score >= 80 ? 'good' : 'needs_improvement', violations: issues };
  } catch (e) { return { score: 70, status: 'error', violations: [] }; }
}

async function runPerformance(page, url) {
  try {
    await page.goto(url, { waitUntil: 'networkidle', timeout: 25000 });
    const m = await page.evaluate(() => {
      const nav = performance.getEntriesByType('navigation')[0];
      const fcp = performance.getEntriesByType('paint').find(e => e.name === 'first-contentful-paint');
      return { fcp: Math.round(fcp?.startTime || 0), ttfb: Math.round((nav?.responseStart || 0) - (nav?.requestStart || 0)), loadTime: Math.round(nav?.loadEventEnd || 0), domSize: document.querySelectorAll('*').length, transferSize: Math.round((nav?.transferSize || 0) / 1024) };
    });
    let score = 100; const findings = [];
    if (m.fcp > 3000) { score -= 20; findings.push({ metric: 'FCP', value: m.fcp + 'ms', recommendation: 'Reduce render-blocking resources' }); }
    else if (m.fcp > 1800) { score -= 10; findings.push({ metric: 'FCP', value: m.fcp + 'ms', recommendation: 'FCP above 1.8s target' }); }
    if (m.ttfb > 600) { score -= 15; findings.push({ metric: 'TTFB', value: m.ttfb + 'ms', recommendation: 'Check server response time and CDN' }); }
    if (m.loadTime > 5000) { score -= 20; findings.push({ metric: 'Load', value: m.loadTime + 'ms', recommendation: 'Optimise images and defer scripts' }); }
    if (m.domSize > 1500) { score -= 10; findings.push({ metric: 'DOM Size', value: m.domSize + ' elements', recommendation: 'Simplify page structure' }); }
    return { score: Math.max(0, score), metrics: m, findings };
  } catch (e) { return { score: 60, metrics: {}, findings: [{ metric: 'Load', value: 'timeout', recommendation: 'Page took too long to load' }] }; }
}

async function runSecurity(page, url) {
  let score = 100; const findings = [];
  if (!url.startsWith('https://')) { score -= 30; findings.push({ severity: 'critical', issue: 'Not using HTTPS', recommendation: 'Enable HTTPS' }); }
  try {
    const pf = await page.evaluate(() => {
      const r = [];
      document.querySelectorAll('input[type=password]').forEach(el => { if (el.autocomplete !== 'off') r.push({ type: 'autocomplete' }); });
      document.querySelectorAll('img[src^="http:"],script[src^="http:"]').forEach(() => r.push({ type: 'mixed_content' }));
      return r;
    });
    pf.forEach(f => {
      if (f.type === 'autocomplete') { score -= 8; findings.push({ severity: 'medium', issue: 'Password autocomplete enabled', recommendation: 'Set autocomplete="new-password"' }); }
      if (f.type === 'mixed_content') { score -= 12; findings.push({ severity: 'high', issue: 'Mixed HTTP content on HTTPS page', recommendation: 'Update all resources to HTTPS' }); }
    });
  } catch (e) {}
  return { score: Math.max(0, score), findings };
}

async function runAIVisionAudit(screenshot, url, title, metrics) {
  const prompt = `You are a senior web auditor. Analyse this screenshot.

URL: ${url}
TITLE: ${title}
PERFORMANCE: FCP ${metrics.fcp || 0}ms, Load ${metrics.loadTime || 0}ms, TTFB ${metrics.ttfb || 0}ms

Check for: missing alt text, poor contrast, unlabelled forms, confusing navigation, missing CTAs, trust signals (privacy policy, contact), mixed content, layout issues.

Respond ONLY with JSON:
{"overallScore":75,"grade":"B","executiveSummary":"2-3 sentence plain English summary for a CTO","topPriorities":["Fix 1","Fix 2","Fix 3"],"positives":["Good thing 1","Good thing 2"]}`;

  try {
    const text = await askAI(screenshot, prompt);
    return parseJSON(text) || { overallScore: 70, grade: 'B', executiveSummary: 'AI vision audit complete.', topPriorities: [], positives: [] };
  } catch (e) { return { overallScore: 70, grade: 'B', executiveSummary: 'Vision audit skipped.', topPriorities: [], positives: [] }; }
}

async function generateNarrative(journey, outcome, stepResults) {
  const prompt = `You are a senior QA consultant. Write an executive summary for a client report.

JOURNEY: "${journey.name}"
GOAL: "${journey.goal}"  
URL: ${journey.target_url}
RESULT: ${outcome.passed ? 'PASSED' : 'FAILED'}
STEPS: ${outcome.passed_steps}/${outcome.total_steps} passed
SELF-HEALED: ${outcome.healed_steps} steps

STEP DETAILS:
${stepResults.map((s, i) => `Step ${i+1} (${s.status}): ${s.step_description}${s.heal_attempts > 0 ? ' [SELF-HEALED]' : ''}${s.error_message ? ' ERROR: ' + s.error_message : ''}`).join('\n')}

Write 3 paragraphs. Plain English. Under 180 words. No bullet points. Sound like a consultant.`;

  try {
    const response = await groq.chat.completions.create({ model: TEXT_MODEL, max_tokens: 500, messages: [{ role: 'user', content: prompt }] });
    return response.choices[0].message.content.trim();
  } catch (e) { return `${journey.name} ${outcome.passed ? 'passed' : 'failed'} with ${outcome.passed_steps} of ${outcome.total_steps} steps completed. ${outcome.healed_steps} steps required AI self-healing.`; }
}

async function generateReport(runId, journey, outcome, stepResults, auditResults, narrative) {
  const date = new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });
  const sc = (s) => s >= 80 ? '#10b981' : s >= 60 ? '#f59e0b' : '#ef4444';

  const stepsHtml = stepResults.map((s, i) => `
    <div style="padding:12px 0;border-bottom:1px solid #e2e8f0">
      <div style="display:flex;align-items:center;gap:8px;margin-bottom:4px">
        <span style="font-size:10px;color:#94a3b8">STEP ${i+1}</span>
        <span style="font-size:10px;font-weight:800;padding:2px 8px;border-radius:20px;background:${s.status==='passed'?'#d1fae5':'#fee2e2'};color:${s.status==='passed'?'#065f46':'#991b1b'}">${s.status.toUpperCase()}</span>
        ${s.heal_attempts > 0 ? '<span style="font-size:10px;background:#fef3c7;color:#92400e;padding:2px 8px;border-radius:20px;font-weight:700">⚡ SELF-HEALED</span>' : ''}
      </div>
      <div style="font-size:14px;font-weight:600;color:#0f172a;margin-bottom:3px">${s.step_description}</div>
      ${s.ai_reasoning ? `<div style="font-size:12px;color:#64748b;font-style:italic">"${s.ai_reasoning}"</div>` : ''}
      ${s.error_message ? `<div style="font-size:11px;color:#ef4444;margin-top:4px;background:#fee2e2;padding:4px 8px;border-radius:6px">${s.error_message}</div>` : ''}
      ${s.screenshot_url ? `<img src="${s.screenshot_url}" style="width:100%;border-radius:8px;margin-top:8px;border:1px solid #e2e8f0" loading="lazy"/>` : ''}
    </div>`).join('');

  const overallScore = auditResults.length ? Math.round(auditResults.reduce((s, a) => s + (a.score || 0), 0) / auditResults.length) : null;

  const html = `<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8"><title>Klaro Pulse Report — ${journey.name}</title>
<style>*{box-sizing:border-box;margin:0;padding:0}body{font-family:Helvetica Neue,Arial,sans-serif;background:#f8fafc;color:#1e293b}.page{max-width:900px;margin:0 auto;padding:48px 40px}.hdr{display:flex;justify-content:space-between;align-items:flex-start;padding-bottom:28px;border-bottom:2px solid #e2e8f0;margin-bottom:36px}.logo{font-size:20px;font-weight:900;color:#0f172a}.logo span{color:#6366f1}.hero{background:#0f172a;border-radius:16px;padding:36px;margin-bottom:36px;color:white}.stats{display:grid;grid-template-columns:repeat(4,1fr);gap:16px;margin-top:20px}.stat{background:rgba(255,255,255,.06);border-radius:10px;padding:14px;text-align:center}.stat-v{font-size:26px;font-weight:900}.stat-l{font-size:10px;color:#94a3b8;text-transform:uppercase;margin-top:3px}.sec{font-size:16px;font-weight:800;color:#0f172a;margin:28px 0 14px;padding-bottom:8px;border-bottom:1px solid #e2e8f0}.nar{background:white;border:1px solid #e2e8f0;border-radius:12px;padding:24px;line-height:1.8;font-size:14px;color:#334155;margin-bottom:28px}.audit-grid{display:grid;grid-template-columns:repeat(4,1fr);gap:12px;margin-bottom:20px}.audit-card{background:white;border:1px solid #e2e8f0;border-radius:12px;padding:16px;text-align:center}.footer{text-align:center;font-size:11px;color:#94a3b8;padding-top:28px;border-top:1px solid #e2e8f0;margin-top:40px}</style></head>
<body><div class="page">
<div class="hdr"><div class="logo">KLARO <span>PULSE</span></div><div style="text-align:right;font-size:12px;color:#64748b"><div style="font-weight:600;color:#1e293b">${date}</div><div>Run ${runId.slice(0,8)}</div></div></div>
<div class="hero">
  <div style="font-size:22px;font-weight:800;margin-bottom:6px">${journey.name}</div>
  <div style="color:#94a3b8;font-size:14px;margin-bottom:20px">${journey.goal}</div>
  <div style="font-size:12px;color:#64748b">Target: ${journey.target_url}</div>
  <div class="stats">
    <div class="stat"><div class="stat-v" style="color:${outcome.passed?'#10b981':'#ef4444'}">${outcome.passed?'PASS':'FAIL'}</div><div class="stat-l">Result</div></div>
    <div class="stat"><div class="stat-v">${outcome.passed_steps}/${outcome.total_steps}</div><div class="stat-l">Steps Passed</div></div>
    <div class="stat"><div class="stat-v" style="color:#f59e0b">${outcome.healed_steps||0}</div><div class="stat-l">Self-Healed</div></div>
    ${overallScore!==null?`<div class="stat"><div class="stat-v" style="color:${sc(overallScore)}">${overallScore}</div><div class="stat-l">Audit Score</div></div>`:''}
  </div>
</div>
<div class="sec">Executive Summary</div>
<div class="nar">${narrative.split('\n\n').map(p=>`<p style="margin-bottom:12px">${p}</p>`).join('')}</div>
${auditResults.length ? `<div class="sec">Audit Scores</div><div class="audit-grid">${auditResults.map(a=>`<div class="audit-card"><div style="font-size:24px;font-weight:900;color:${sc(a.score||0)}">${a.score??'—'}</div><div style="font-size:11px;color:#64748b;text-transform:capitalize;margin-top:4px">${a.audit_type.replace('_',' ')}</div><div style="font-size:10px;color:${sc(a.score||0)};margin-top:2px">${a.score>=80?'Good':a.score>=60?'Fair':'Poor'}</div></div>`).join('')}</div>` : ''}
<div class="sec">Journey Steps</div>${stepsHtml}
<div class="footer">Klaro Pulse AI — klaro-pulse.vercel.app &nbsp;|&nbsp; © ${new Date().getFullYear()} Klaro Global. Confidential.</div>
</div></body></html>`;

  try {
    const fn = `reports/run-${runId}.html`;
    await db.storage.from('reports').upload(fn, Buffer.from(html), { contentType: 'text/html', upsert: true });
    const { data } = db.storage.from('reports').getPublicUrl(fn);
    await db.from('reports').insert({ run_id: runId, journey_id: journey.id, customer_id: journey.customer_id, html_url: data.publicUrl, report_url: null });
    log('Report saved: ' + data.publicUrl);
    return data.publicUrl;
  } catch (e) { log('Report error: ' + e.message); return null; }
}

async function runJourney(run, journey) {
  log(`Starting: ${journey.name} (${journey.target_url})`);

  await db.from('test_runs').update({ status: 'running' }).eq('id', run.id);

  const browser = await chromium.launch({ headless: true, args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage'] });
  const page = await (await browser.newContext({ viewport: { width: 1280, height: 800 } })).newPage();

  const steps = journey.steps || [];
  const stepResults = [];
  let passedSteps = 0, failedSteps = 0, healedSteps = 0;
  const completed = [];

  // Always navigate to target first
  try {
    await page.goto(journey.target_url, { waitUntil: 'networkidle', timeout: 20000 });
    log(`Navigated to ${journey.target_url}`);
  } catch (e) {
    log(`Initial navigation failed: ${e.message}`);
  }

  for (let i = 0; i < steps.length; i++) {
    const step = steps[i];
    const t0 = Date.now();
    let status = 'passed', error = null, reasoning = 'Step executed', confidence = 80;
    let screenshotUrl = null, healAttempts = 0;
    const healLog = [];

    log(`  Step ${i+1}/${steps.length}: ${step.description}`);

    try {
      const shot = await page.screenshot({ type: 'png' });
      const decision = await decideAction(shot, {
        goal: journey.goal,
        targetUrl: journey.target_url,
        stepIndex: i,
        totalSteps: steps.length,
        stepDesc: step.description,
        currentUrl: page.url(),
        completed
      });

      reasoning = decision.reasoning || 'AI decision';
      confidence = decision.confidence || 80;
      log(`    → ${decision.action} (${confidence}%): ${reasoning}`);

      await executeAction(page, decision, journey.target_url);
      screenshotUrl = await uploadScreenshot(await page.screenshot({ type: 'png' }), run.id, i);
      completed.push(step.description);
      passedSteps++;
      log(`    ✅ Passed (${Date.now()-t0}ms)`);

    } catch (err) {
      log(`    ❌ Failed: ${err.message}`);
      let healed = false;

      for (let h = 0; h < MAX_HEAL; h++) {
        log(`    🔄 Heal ${h+1}`);
        try {
          const shot = await page.screenshot({ type: 'png' });
          const fix = await healAction(shot, { goal: journey.goal, targetUrl: journey.target_url, stepDesc: step.description, currentUrl: page.url() }, err.message);
          healLog.push({ attempt: h+1, reasoning: fix.reasoning });
          await executeAction(page, fix, journey.target_url);
          screenshotUrl = await uploadScreenshot(await page.screenshot({ type: 'png' }), run.id, i, '-healed');
          reasoning = 'SELF-HEALED: ' + fix.reasoning;
          completed.push(step.description);
          healAttempts = h+1; healedSteps++; passedSteps++;
          healed = true;
          log(`    ✅ Self-healed`);
          break;
        } catch (he) { log(`    ✗ Heal failed: ${he.message}`); }
      }

      if (!healed) {
        status = 'failed'; error = err.message; failedSteps++;
        try { screenshotUrl = await uploadScreenshot(await page.screenshot({ type: 'png' }), run.id, i, '-failed'); } catch {}
      }
    }

    const result = { run_id: run.id, step_index: i, step_description: step.description, status, ai_reasoning: reasoning, ai_confidence: confidence, screenshot_url: screenshotUrl, error_message: error, heal_attempts: healAttempts, heal_log: healLog, duration_ms: Date.now()-t0 };
    await db.from('step_results').insert(result);
    stepResults.push(result);
  }

  // Audits
  log('  Running audits...');
  const auditResults = [];
  try {
    await page.goto(journey.target_url, { waitUntil: 'networkidle', timeout: 20000 });
    const a11y = await runAccessibility(page);
    const perf = await runPerformance(page, journey.target_url);
    const sec = await runSecurity(page, journey.target_url);
    const auditShot = await page.screenshot({ type: 'png', fullPage: true });
    const title = await page.title();
    const vision = await runAIVisionAudit(auditShot, journey.target_url, title, perf.metrics);

    const inserts = [
      { run_id: run.id, journey_id: journey.id, audit_type: 'accessibility', score: a11y.score, status: a11y.status, findings: a11y.violations || [], ai_narrative: `${a11y.violations?.length || 0} issues found.`, raw_data: {} },
      { run_id: run.id, journey_id: journey.id, audit_type: 'performance', score: perf.score, status: perf.score >= 80 ? 'good' : 'needs_improvement', findings: perf.findings || [], ai_narrative: `FCP: ${perf.metrics.fcp}ms, TTFB: ${perf.metrics.ttfb}ms, Load: ${perf.metrics.loadTime}ms`, raw_data: {} },
      { run_id: run.id, journey_id: journey.id, audit_type: 'security', score: sec.score, status: sec.score >= 80 ? 'good' : 'needs_improvement', findings: sec.findings || [], ai_narrative: sec.findings.length ? sec.findings[0].issue : 'No critical issues.', raw_data: {} },
      { run_id: run.id, journey_id: journey.id, audit_type: 'ai_vision', score: vision.overallScore, status: 'complete', findings: (vision.topPriorities||[]).map(p=>({issue:p})), ai_narrative: vision.executiveSummary, raw_data: {} }
    ];

    for (const a of inserts) { await db.from('audit_results').insert(a); auditResults.push(a); }
    log(`  Audits: A11y ${a11y.score} | Perf ${perf.score} | Sec ${sec.score} | Vision ${vision.overallScore}`);
  } catch (e) { log(`  Audit error: ${e.message}`); }

  await browser.close();

  const passed = failedSteps === 0;
  const outcome = { run_id: run.id, journey_id: journey.id, customer_id: journey.customer_id, passed, total_steps: steps.length, passed_steps: passedSteps, failed_steps: failedSteps, healed_steps: healedSteps, ai_summary: `${passedSteps} of ${steps.length} steps passed.${healedSteps > 0 ? ` ${healedSteps} self-healed.` : ''}` };
  await db.from('outcomes').insert(outcome);

  const narrative = await generateNarrative(journey, outcome, stepResults);
  await generateReport(run.id, journey, outcome, stepResults, auditResults, narrative);

  await db.from('test_runs').update({ status: passed ? 'passed' : 'failed', completed_at: new Date().toISOString(), duration_ms: Date.now() - new Date(run.started_at).getTime() }).eq('id', run.id);

  log(`${passed ? '✅ PASSED' : '❌ FAILED'}: ${journey.name}`);
}

async function poll() {
  if (isRunning) return;
  isRunning = true;

  try {
    const { data: pendingRuns } = await db.from('test_runs')
      .select('*, journeys(*)')
      .eq('status', 'pending')
      .order('started_at', { ascending: true })
      .limit(1);

    if (pendingRuns && pendingRuns.length > 0) {
      const run = pendingRuns[0];
      const journey = run.journeys;
      if (journey) {
        await runJourney(run, journey);
      } else {
        await db.from('test_runs').update({ status: 'failed' }).eq('id', run.id);
        log(`No journey found for run ${run.id}`);
      }
    }
  } catch (e) {
    log(`Poll error: ${e.message}`);
  }

  isRunning = false;
}

log('Klaro Pulse Runner v2.0 — polling every 30s');
log(`Supabase: ${SUPABASE_URL}`);
poll();
setInterval(poll, POLL_INTERVAL);
