import { createClient } from '@supabase/supabase-js';
import { chromium } from 'playwright';
import Groq from 'groq-sdk';
import * as dotenv from 'dotenv';
dotenv.config();

const SUPABASE_URL = 'https://vhnvclvzxkybnybqgyci.supabase.co';
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_ANON_KEY;
const db = createClient(SUPABASE_URL, SUPABASE_KEY);
const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });
const COMMIT_SHA = process.env.GITHUB_SHA || 'local';
const BRANCH = process.env.GITHUB_REF_NAME || 'main';
const MAX_HEAL = 2;
const VISION_MODEL = 'meta-llama/llama-4-scout-17b-16e-instruct';
const TEXT_MODEL = 'llama-3.3-70b-versatile';

function log(msg) { console.log(msg); }
function parseJSON(text) {
  const clean = text.trim().replace(/```json|```/g, '').trim();
  try { return JSON.parse(clean); } catch {}
  const m = clean.match(/\{[\s\S]*\}/); if (m) { try { return JSON.parse(m[0]); } catch {} }
  return null;
}

async function uploadScreenshot(buf, runId, idx, suf = '') {
  try {
    const fn = `screenshots/${runId}/step-${idx}${suf}.png`;
    await db.storage.from('screenshots').upload(fn, buf, { contentType: 'image/png', upsert: true });
    return db.storage.from('screenshots').getPublicUrl(fn).data.publicUrl;
  } catch { return null; }
}

async function askAI(shot, prompt) {
  const r = await groq.chat.completions.create({ model: VISION_MODEL, max_tokens: 600, messages: [{ role: 'user', content: [{ type: 'image_url', image_url: { url: `data:image/png;base64,${shot.toString('base64')}` } }, { type: 'text', text: prompt }] }] });
  return r.choices[0].message.content;
}

async function decideAction(shot, ctx) {
  const hostname = new URL(ctx.targetUrl).hostname;
  const text = await askAI(shot, `You are a QA testing agent controlling a real browser.
GOAL: ${ctx.goal}
TARGET SITE: ${ctx.targetUrl} (ONLY interact with ${hostname} — never navigate elsewhere)
CURRENT STEP ${ctx.stepIndex+1}/${ctx.totalSteps}: ${ctx.stepDesc}
CURRENT URL: ${ctx.currentUrl}

Look at the screenshot. Choose ONE action to complete this step.
- "navigate": go to ${ctx.targetUrl} (use this only if not already there)
- "click": click a visible element (provide CSS selector)
- "scroll": scroll the page down
- "wait": wait 2 seconds
- "assert_visible": check element is visible
- "assert": check text exists on page
- "screenshot": capture current state

Respond ONLY with JSON (no markdown):
{"action":"navigate","selector":null,"url":null,"value":null,"assertText":null,"reasoning":"why","confidence":85}`);
  const r = parseJSON(text) || { action: 'screenshot', reasoning: 'fallback', confidence: 50 };
  if (r.url && r.url !== ctx.targetUrl && !r.url.includes(hostname)) r.url = ctx.targetUrl;
  return r;
}

async function healAction(shot, ctx, err) {
  const text = await askAI(shot, `QA step FAILED. Self-heal.
GOAL: ${ctx.goal}
STEP: ${ctx.stepDesc}
ERROR: ${err}
URL: ${ctx.currentUrl}
STAY ON: ${ctx.targetUrl}

Try completely different approach. Never navigate elsewhere.
{"action":"scroll|wait|click|assert_visible|screenshot","selector":null,"url":null,"value":null,"assertText":null,"reasoning":"why","confidence":60}`);
  return parseJSON(text) || { action: 'wait', reasoning: 'wait and retry', confidence: 40 };
}

async function doAction(page, d, targetUrl) {
  const hostname = new URL(targetUrl).hostname;
  if (d.action === 'navigate') {
    const url = (d.url && d.url.includes(hostname)) ? d.url : targetUrl;
    await page.goto(url, { waitUntil: 'networkidle', timeout: 20000 });
  } else if (d.action === 'click' && d.selector) {
    await page.waitForSelector(d.selector, { timeout: 6000 });
    await page.click(d.selector);
  } else if (d.action === 'type' && d.selector) {
    await page.waitForSelector(d.selector, { timeout: 6000 });
    await page.fill(d.selector, d.value || '');
  } else if (d.action === 'scroll') { await page.evaluate(() => window.scrollBy(0, 400)); await page.waitForTimeout(500);
  } else if (d.action === 'wait') { await page.waitForTimeout(2500);
  } else if (d.action === 'assert' && d.assertText) {
    const body = await page.textContent('body').catch(() => '');
    if (!body.includes(d.assertText)) throw new Error(`"${d.assertText}" not found`);
  } else if (d.action === 'assert_visible' && d.selector) { await page.waitForSelector(d.selector, { state: 'visible', timeout: 6000 }); }
}

async function runAudits(page, journey, runId) {
  const results = [];
  try {
    await page.goto(journey.target_url, { waitUntil: 'networkidle', timeout: 20000 });
    
    const a11y = await page.evaluate(() => {
      const r = [];
      document.querySelectorAll('img').forEach(i => { if (!i.alt) r.push({ severity:'high', issue:'Missing alt text', recommendation:'Add alt attribute' }); });
      document.querySelectorAll('input,select,textarea').forEach(el => {
        if (!document.querySelector(`label[for="${el.id}"]`) && !el.getAttribute('aria-label')) r.push({ severity:'medium', issue:'Unlabelled field', recommendation:'Add label' });
      });
      return r;
    }).catch(() => []);
    const a11yScore = Math.max(0, 100 - a11y.filter(i=>i.severity==='high').length*8 - a11y.filter(i=>i.severity==='medium').length*3);

    const perf = await page.evaluate(() => {
      const nav = performance.getEntriesByType('navigation')[0];
      const fcp = performance.getEntriesByType('paint').find(e=>e.name==='first-contentful-paint');
      return { fcp: Math.round(fcp?.startTime||0), ttfb: Math.round((nav?.responseStart||0)-(nav?.requestStart||0)), loadTime: Math.round(nav?.loadEventEnd||0), domSize: document.querySelectorAll('*').length };
    }).catch(() => ({ fcp:0, ttfb:0, loadTime:0, domSize:0 }));
    let perfScore = 100;
    if (perf.fcp > 3000) perfScore -= 20; else if (perf.fcp > 1800) perfScore -= 10;
    if (perf.ttfb > 600) perfScore -= 15;
    if (perf.loadTime > 5000) perfScore -= 20; else if (perf.loadTime > 3000) perfScore -= 10;

    let secScore = 100;
    const secFindings = [];
    if (!journey.target_url.startsWith('https://')) { secScore -= 30; secFindings.push({ severity:'critical', issue:'Not HTTPS', recommendation:'Enable HTTPS' }); }
    const mixedContent = await page.evaluate(() => document.querySelectorAll('img[src^="http:"],script[src^="http:"]').length).catch(() => 0);
    if (mixedContent > 0) { secScore -= 12; secFindings.push({ severity:'high', issue:'Mixed content', recommendation:'Update all resources to HTTPS' }); }

    const auditShot = await page.screenshot({ type:'png', fullPage:true });
    let visionScore = 70, visionNarrative = 'AI vision audit complete.';
    try {
      const vtext = await askAI(auditShot, `Senior web auditor. Analyse this screenshot.
URL: ${journey.target_url} | FCP: ${perf.fcp}ms | Load: ${perf.loadTime}ms
Check: alt text, contrast, CTAs, navigation clarity, trust signals, layout issues.
Respond ONLY with JSON: {"overallScore":75,"executiveSummary":"2-3 sentence summary for a CTO. Be specific about what you see."}`);
      const vr = parseJSON(vtext);
      if (vr) { visionScore = vr.overallScore || 70; visionNarrative = vr.executiveSummary || visionNarrative; }
    } catch {}

    const inserts = [
      { run_id:runId, journey_id:journey.id, audit_type:'accessibility', score:a11yScore, status:a11yScore>=80?'good':'needs_improvement', findings:a11y, ai_narrative:`${a11y.length} issues found.`, raw_data:{} },
      { run_id:runId, journey_id:journey.id, audit_type:'performance', score:Math.max(0,perfScore), status:perfScore>=80?'good':'needs_improvement', findings:[], ai_narrative:`FCP: ${perf.fcp}ms · TTFB: ${perf.ttfb}ms · Load: ${perf.loadTime}ms`, raw_data:{} },
      { run_id:runId, journey_id:journey.id, audit_type:'security', score:Math.max(0,secScore), status:secScore>=80?'good':'needs_improvement', findings:secFindings, ai_narrative:secFindings.length?secFindings[0].issue:'No critical issues.', raw_data:{} },
      { run_id:runId, journey_id:journey.id, audit_type:'ai_vision', score:visionScore, status:'complete', findings:[], ai_narrative:visionNarrative, raw_data:{} }
    ];
    for (const a of inserts) { await db.from('audit_results').insert(a); results.push(a); }
    log(`  Audits: A11y ${a11yScore} | Perf ${Math.max(0,perfScore)} | Sec ${Math.max(0,secScore)} | Vision ${visionScore}`);
  } catch (e) { log(`  Audit error: ${e.message}`); }
  return results;
}

async function runJourney(journey) {
  log(`\n▶ ${journey.name} — ${journey.target_url}`);
  const { data: run } = await db.from('test_runs').insert({ journey_id:journey.id, customer_id:journey.customer_id, triggered_by:'github-push', commit_sha:COMMIT_SHA, branch:BRANCH, status:'running' }).select().single();
  if (!run) { log('Failed to create run'); return false; }

  const browser = await chromium.launch({ headless:true, args:['--no-sandbox','--disable-setuid-sandbox','--disable-dev-shm-usage'] });
  const page = await (await browser.newContext({ viewport:{width:1280,height:800} })).newPage();

  try { await page.goto(journey.target_url, { waitUntil:'networkidle', timeout:20000 }); } catch(e) { log(`Initial nav error: ${e.message}`); }

  const steps = journey.steps || [];
  const stepResults = [];
  let passed=0, failed=0, healed=0;
  const done = [];

  for (let i=0; i<steps.length; i++) {
    const step = steps[i]; const t0 = Date.now();
    let status='passed', error=null, reasoning='executed', confidence=80, screenshotUrl=null, healAttempts=0, healLog=[];
    log(`  [${i+1}/${steps.length}] ${step.description}`);
    try {
      const shot = await page.screenshot({type:'png'});
      const d = await decideAction(shot, { goal:journey.goal, targetUrl:journey.target_url, stepIndex:i, totalSteps:steps.length, stepDesc:step.description, currentUrl:page.url(), completed:done });
      reasoning=d.reasoning||'AI decision'; confidence=d.confidence||80;
      log(`    → ${d.action} (${confidence}%)`);
      await doAction(page, d, journey.target_url);
      screenshotUrl = await uploadScreenshot(await page.screenshot({type:'png'}), run.id, i);
      done.push(step.description); passed++;
      log(`    ✅ ${Date.now()-t0}ms`);
    } catch(err) {
      log(`    ❌ ${err.message}`);
      let ok=false;
      for (let h=0; h<MAX_HEAL; h++) {
        try {
          const shot = await page.screenshot({type:'png'});
          const fix = await healAction(shot, { goal:journey.goal, targetUrl:journey.target_url, stepDesc:step.description, currentUrl:page.url() }, err.message);
          healLog.push({attempt:h+1, reasoning:fix.reasoning});
          await doAction(page, fix, journey.target_url);
          screenshotUrl = await uploadScreenshot(await page.screenshot({type:'png'}), run.id, i, '-healed');
          reasoning='SELF-HEALED: '+fix.reasoning; done.push(step.description);
          healAttempts=h+1; healed++; passed++; ok=true;
          log(`    ✅ Healed`); break;
        } catch(he) { log(`    ✗ Heal: ${he.message}`); }
      }
      if (!ok) { status='failed'; error=err.message; failed++; try { screenshotUrl=await uploadScreenshot(await page.screenshot({type:'png'}), run.id, i, '-failed'); } catch {} }
    }
    const r = { run_id:run.id, step_index:i, step_description:step.description, status, ai_reasoning:reasoning, ai_confidence:confidence, screenshot_url:screenshotUrl, error_message:error, heal_attempts:healAttempts, heal_log:healLog, duration_ms:Date.now()-t0 };
    await db.from('step_results').insert(r);
    stepResults.push(r);
  }

  const auditResults = await runAudits(page, journey, run.id);
  await browser.close();

  const ok = failed === 0;
  const outcome = { run_id:run.id, journey_id:journey.id, customer_id:journey.customer_id, passed:ok, total_steps:steps.length, passed_steps:passed, failed_steps:failed, healed_steps:healed, ai_summary:`${passed}/${steps.length} steps passed.${healed>0?' '+healed+' self-healed.':''}` };
  await db.from('outcomes').insert(outcome);

  // Generate narrative
  let narrative = outcome.ai_summary;
  try {
    const r = await groq.chat.completions.create({ model:TEXT_MODEL, max_tokens:400, messages:[{role:'user',content:`QA consultant. Write 3 paragraphs (under 160 words, no bullets) for: Journey "${journey.name}", Goal "${journey.goal}", URL ${journey.target_url}, Result: ${ok?'PASSED':'FAILED'}, ${passed}/${steps.length} steps, ${healed} self-healed.`}] });
    narrative = r.choices[0].message.content.trim();
  } catch {}

  // Generate HTML report
  try {
    const date = new Date().toLocaleDateString('en-GB',{day:'numeric',month:'long',year:'numeric'});
    const sc = s => s>=80?'#10b981':s>=60?'#f59e0b':'#ef4444';
    const overall = auditResults.length ? Math.round(auditResults.reduce((s,a)=>s+(a.score||0),0)/auditResults.length) : null;
    const html = `<!DOCTYPE html><html><head><meta charset="UTF-8"><title>Klaro Pulse — ${journey.name}</title><style>*{box-sizing:border-box;margin:0;padding:0}body{font-family:Helvetica Neue,Arial,sans-serif;background:#f8fafc;color:#1e293b}.pg{max-width:900px;margin:0 auto;padding:48px 40px}.hdr{display:flex;justify-content:space-between;padding-bottom:24px;border-bottom:2px solid #e2e8f0;margin-bottom:32px}.logo{font-size:20px;font-weight:900}.logo span{color:#6366f1}.hero{background:#0f172a;border-radius:16px;padding:36px;margin-bottom:32px;color:white}.stats{display:grid;grid-template-columns:repeat(4,1fr);gap:14px;margin-top:18px}.stat{background:rgba(255,255,255,.06);border-radius:10px;padding:14px;text-align:center}.sv{font-size:24px;font-weight:900}.sl{font-size:10px;color:#94a3b8;text-transform:uppercase;margin-top:3px}.sec{font-size:15px;font-weight:800;margin:24px 0 12px;padding-bottom:8px;border-bottom:1px solid #e2e8f0}.nar{background:white;border:1px solid #e2e8f0;border-radius:12px;padding:22px;line-height:1.8;font-size:14px;color:#334155;margin-bottom:24px}.ag{display:grid;grid-template-columns:repeat(4,1fr);gap:10px;margin-bottom:20px}.ac{background:white;border:1px solid #e2e8f0;border-radius:10px;padding:14px;text-align:center}.step{padding:12px 0;border-bottom:1px solid #f1f5f9}.ft{text-align:center;font-size:11px;color:#94a3b8;padding-top:24px;border-top:1px solid #e2e8f0;margin-top:36px}</style></head>
<body><div class="pg">
<div class="hdr"><div class="logo">KLARO <span>PULSE</span></div><div style="font-size:12px;color:#64748b;text-align:right"><div style="font-weight:600;color:#1e293b">${date}</div><div>Run ${run.id.slice(0,8)}</div></div></div>
<div class="hero"><div style="font-size:22px;font-weight:800;margin-bottom:6px">${journey.name}</div><div style="color:#94a3b8;font-size:14px">${journey.goal}</div>
<div class="stats"><div class="stat"><div class="sv" style="color:${ok?'#10b981':'#ef4444'}">${ok?'PASS':'FAIL'}</div><div class="sl">Result</div></div><div class="stat"><div class="sv">${passed}/${steps.length}</div><div class="sl">Steps</div></div><div class="stat"><div class="sv" style="color:#f59e0b">${healed}</div><div class="sl">Healed</div></div>${overall!==null?`<div class="stat"><div class="sv" style="color:${sc(overall)}">${overall}</div><div class="sl">Audit</div></div>`:''}</div></div>
<div class="sec">Executive Summary</div><div class="nar">${narrative.split('\n\n').map(p=>`<p style="margin-bottom:10px">${p}</p>`).join('')}</div>
${auditResults.length?`<div class="sec">Audit Scores</div><div class="ag">${auditResults.map(a=>`<div class="ac"><div style="font-size:22px;font-weight:900;color:${sc(a.score||0)}">${a.score??'—'}</div><div style="font-size:11px;color:#64748b;text-transform:capitalize;margin-top:4px">${a.audit_type.replace('_',' ')}</div><div style="font-size:11px;color:#64748b;margin-top:2px">${a.ai_narrative||''}</div></div>`).join('')}</div>`:''}
<div class="sec">Journey Steps</div>${stepResults.map((s,i)=>`<div class="step"><div style="display:flex;align-items:center;gap:8px;margin-bottom:4px"><span style="font-size:10px;color:#94a3b8">STEP ${i+1}</span><span style="font-size:10px;font-weight:800;padding:2px 8px;border-radius:20px;background:${s.status==='passed'?'#d1fae5':'#fee2e2'};color:${s.status==='passed'?'#065f46':'#991b1b'}">${s.status.toUpperCase()}</span>${s.heal_attempts>0?'<span style="font-size:10px;background:#fef3c7;color:#92400e;padding:2px 8px;border-radius:20px;font-weight:700">⚡ HEALED</span>':''}</div><div style="font-size:14px;font-weight:600;color:#0f172a;margin-bottom:3px">${s.step_description}</div>${s.ai_reasoning?`<div style="font-size:12px;color:#64748b;font-style:italic">"${s.ai_reasoning}"</div>`:''} ${s.error_message?`<div style="font-size:11px;color:#ef4444;background:#fee2e2;padding:4px 8px;border-radius:6px;margin-top:4px">${s.error_message}</div>`:''} ${s.screenshot_url?`<img src="${s.screenshot_url}" style="width:100%;border-radius:8px;margin-top:8px;border:1px solid #e2e8f0" loading="lazy"/>`:''}</div>`).join('')}
<div class="ft">Klaro Pulse AI — klaro-pulse.vercel.app | © ${new Date().getFullYear()} Klaro Global</div>
</div></body></html>`;
    const fn = `reports/run-${run.id}.html`;
    await db.storage.from('reports').upload(fn, Buffer.from(html), { contentType:'text/html', upsert:true });
    const { data } = db.storage.from('reports').getPublicUrl(fn);
    await db.from('reports').insert({ run_id:run.id, journey_id:journey.id, customer_id:journey.customer_id, html_url:data.publicUrl, report_url:null });
    log(`  Report: ${data.publicUrl}`);
  } catch(e) { log(`  Report error: ${e.message}`); }

  await db.from('test_runs').update({ status:ok?'passed':'failed', completed_at:new Date().toISOString(), duration_ms:Date.now()-new Date(run.started_at).getTime() }).eq('id', run.id);
  log(`${ok?'✅ PASSED':'❌ FAILED'}: ${journey.name}\n`);
  return ok;
}

async function main() {
  console.log('Klaro Pulse Engine v2.0\n');
  const { data: journeys, error } = await db.from('journeys').select('*').eq('is_active', true);
  if (error) { console.error(error.message); process.exit(1); }
  if (!journeys?.length) { console.log('No active journeys.'); process.exit(0); }
  console.log(`Found ${journeys.length} journey(s)\n`);
  let allOk = true;
  for (const j of journeys) { const ok = await runJourney(j); if (!ok) allOk = false; }
  process.exit(allOk ? 0 : 1);
}

main().catch(e => { console.error(e); process.exit(1); });
