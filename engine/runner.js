import { chromium } from 'playwright';
import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import { decideAction, healStep, auditPage, generateRunNarrative } from './claude-agent.js';
import { runAccessibilityAudit } from './audits/accessibility.js';
import { runPerformanceAudit } from './audits/performance.js';
import { runSecurityAudit } from './audits/security.js';
import { generateReport } from './reporter.js';

dotenv.config();

const SUPABASE_URL = 'https://vhnvclvzxkybnybqgyci.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZobnZjbHZ6eGt5Ym55YnFneWNpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzczOTc1MjIsImV4cCI6MjA5Mjk3MzUyMn0.toq9DNk257c58p2dNOvjc2vYBY7zClF2RY2tGv8m1VY';

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

const MAX_HEAL_ATTEMPTS = 2;
const COMMIT_SHA = process.env.GITHUB_SHA || 'local';
const BRANCH = process.env.GITHUB_REF_NAME || 'main';

async function uploadScreenshot(buffer, runId, stepIndex, suffix) {
  try {
    const s = suffix || '';
    const filename = 'screenshots/run-' + runId + '-step-' + stepIndex + s + '.png';
    await supabase.storage.from('screenshots').upload(filename, buffer, { contentType: 'image/png', upsert: true });
    const { data } = supabase.storage.from('screenshots').getPublicUrl(filename);
    return data.publicUrl;
  } catch (e) {
    console.log('Screenshot upload error: ' + e.message);
    return null;
  }
}

async function executeAction(page, decision) {
  const action = decision.action;
  const selector = decision.selector;
  const value = decision.value;
  const url = decision.url;
  const assertText = decision.assertText;
  const coordinates = decision.coordinates;

  if (action === 'navigate') {
    await page.goto(url || page.url(), { waitUntil: 'networkidle', timeout: 20000 });
  } else if (action === 'click') {
    if (selector) {
      await page.waitForSelector(selector, { timeout: 8000 });
      await page.click(selector);
    } else if (coordinates) {
      await page.mouse.click(coordinates.x, coordinates.y);
    }
  } else if (action === 'type') {
    if (selector) {
      await page.waitForSelector(selector, { timeout: 8000 });
      await page.fill(selector, value || '');
    }
  } else if (action === 'wait') {
    await page.waitForTimeout(2000);
  } else if (action === 'scroll') {
    await page.evaluate(() => window.scrollBy(0, 500));
  } else if (action === 'assert') {
    if (assertText) {
      const content = await page.textContent('body');
      if (!content.includes(assertText)) {
        throw new Error('Assertion failed: "' + assertText + '" not found on page');
      }
    }
  } else if (action === 'assert_visible') {
    if (selector) {
      await page.waitForSelector(selector, { state: 'visible', timeout: 8000 });
    }
  }
}

async function runJourney(journey) {
  console.log('\nRunning journey: ' + journey.name);
  console.log('Goal: ' + journey.goal);
  console.log('URL: ' + journey.target_url);

  const { data: run } = await supabase.from('test_runs').insert({
    journey_id: journey.id,
    customer_id: journey.customer_id,
    triggered_by: 'github-push',
    commit_sha: COMMIT_SHA,
    branch: BRANCH,
    status: 'running'
  }).select().single();

  if (!run) {
    console.log('Failed to create test run record');
    return false;
  }

  const browser = await chromium.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  const context = await browser.newContext({ viewport: { width: 1280, height: 800 } });
  const page = await context.newPage();

  const steps = journey.steps || [];
  const stepResults = [];
  let passedSteps = 0;
  let failedSteps = 0;
  let healedSteps = 0;
  const stepsCompleted = [];

  for (let i = 0; i < steps.length; i++) {
    const step = steps[i];
    const stepStart = Date.now();
    let status = 'passed';
    let errorMessage = null;
    let aiReasoning = 'Step executed';
    let aiConfidence = 80;
    let screenshotUrl = null;
    let healAttempts = 0;
    const healLog = [];

    console.log('  Step ' + (i + 1) + '/' + steps.length + ': ' + step.description);

    try {
      const screenshot = await page.screenshot({ type: 'png' });
      let decision;
      try {
        decision = await decideAction(screenshot, {
          goal: journey.goal,
          stepDescription: step.description,
          stepIndex: i,
          totalSteps: steps.length,
          currentUrl: page.url(),
          stepsCompleted
        });
        aiReasoning = decision.reasoning || 'AI decision made';
        aiConfidence = decision.confidence || 80;
        console.log('    Action: ' + decision.action + ' (' + aiConfidence + '%)');
      } catch (aiErr) {
        console.log('    AI error, using step action: ' + aiErr.message);
        decision = { action: step.action || 'navigate', url: journey.target_url, selector: step.selector, value: step.value };
      }

      await executeAction(page, decision);
      screenshotUrl = await uploadScreenshot(await page.screenshot({ type: 'png' }), run.id, i, '');
      stepsCompleted.push(step.description);
      passedSteps++;
      console.log('    PASSED');

    } catch (err) {
      console.log('    FAILED: ' + err.message);
      let healed = false;

      for (let h = 0; h < MAX_HEAL_ATTEMPTS; h++) {
        console.log('    Heal attempt ' + (h + 1));
        try {
          const screenshot = await page.screenshot({ type: 'png' });
          const healDecision = await healStep(screenshot, {
            goal: journey.goal,
            stepDescription: step.description,
            currentUrl: page.url()
          }, { action: 'unknown', selector: null, error: err.message });

          healLog.push({ attempt: h + 1, reasoning: healDecision.reasoning });
          await executeAction(page, healDecision);
          screenshotUrl = await uploadScreenshot(await page.screenshot({ type: 'png' }), run.id, i, '-healed');
          aiReasoning = 'SELF-HEALED: ' + healDecision.reasoning;
          stepsCompleted.push(step.description);
          healAttempts = h + 1;
          healedSteps++;
          passedSteps++;
          healed = true;
          console.log('    Self-healed');
          break;
        } catch (healErr) {
          console.log('    Heal failed: ' + healErr.message);
        }
      }

      if (!healed) {
        status = 'failed';
        errorMessage = err.message;
        failedSteps++;
        try {
          screenshotUrl = await uploadScreenshot(await page.screenshot({ type: 'png' }), run.id, i, '-failed');
        } catch (e) {}
      }
    }

    const result = {
      run_id: run.id,
      step_index: i,
      step_description: step.description,
      status,
      ai_reasoning: aiReasoning,
      ai_confidence: aiConfidence,
      screenshot_url: screenshotUrl,
      error_message: errorMessage,
      heal_attempts: healAttempts,
      heal_log: healLog,
      duration_ms: Date.now() - stepStart
    };

    await supabase.from('step_results').insert(result);
    stepResults.push(result);
  }

  const auditResults = [];
  try {
    console.log('  Running audits...');
    await page.goto(journey.target_url, { waitUntil: 'networkidle', timeout: 20000 });

    const a11y = await runAccessibilityAudit(page);
    const perf = await runPerformanceAudit(page, journey.target_url);
    const sec = await runSecurityAudit(page, journey.target_url);

    let aiAudit = { overallScore: 70, executiveSummary: 'AI visual audit complete.', categories: {} };
    try {
      const auditScreenshot = await page.screenshot({ type: 'png', fullPage: true });
      aiAudit = await auditPage(auditScreenshot, { url: journey.target_url, title: await page.title(), metrics: perf.metrics });
    } catch (e) {
      console.log('  AI audit error: ' + e.message);
    }

    const inserts = [
      { run_id: run.id, journey_id: journey.id, audit_type: 'accessibility', score: a11y.score, status: a11y.status, findings: a11y.violations || [], ai_narrative: 'Accessibility audit complete.', raw_data: {} },
      { run_id: run.id, journey_id: journey.id, audit_type: 'performance', score: perf.score, status: perf.status, findings: perf.findings || [], ai_narrative: 'FCP: ' + perf.metrics.fcp + 'ms, Load: ' + perf.metrics.loadTime + 'ms', raw_data: {} },
      { run_id: run.id, journey_id: journey.id, audit_type: 'security', score: sec.score, status: sec.status, findings: sec.findings || [], ai_narrative: 'Security audit complete.', raw_data: {} },
      { run_id: run.id, journey_id: journey.id, audit_type: 'ai_vision', score: aiAudit.overallScore, status: 'complete', findings: [], ai_narrative: aiAudit.executiveSummary, raw_data: {} }
    ];

    for (const a of inserts) {
      await supabase.from('audit_results').insert(a);
      auditResults.push(a);
    }
    console.log('  Audits done. A11y:' + a11y.score + ' Perf:' + perf.score + ' Sec:' + sec.score);
  } catch (e) {
    console.log('  Audit error: ' + e.message);
  }

  await browser.close();

  const passed = failedSteps === 0;
  const outcome = {
    run_id: run.id,
    journey_id: journey.id,
    customer_id: journey.customer_id,
    passed,
    total_steps: steps.length,
    passed_steps: passedSteps,
    failed_steps: failedSteps,
    healed_steps: healedSteps,
    ai_summary: (passed ? 'All' : passedSteps + ' of') + ' ' + steps.length + ' steps passed.' + (healedSteps > 0 ? ' ' + healedSteps + ' step(s) self-healed.' : '')
  };

  await supabase.from('outcomes').insert(outcome);

  try {
    let narrative = outcome.ai_summary;
    try {
      narrative = await generateRunNarrative({ journey, outcome, stepResults, auditResults });
    } catch (e) {
      console.log('  Narrative error: ' + e.message);
    }
    await generateReport(run.id, journey, outcome, stepResults, auditResults, narrative);
  } catch (e) {
    console.log('  Report error: ' + e.message);
  }

  await supabase.from('test_runs').update({
    status: passed ? 'passed' : 'failed',
    completed_at: new Date().toISOString(),
    duration_ms: Date.now() - new Date(run.started_at).getTime()
  }).eq('id', run.id);

  console.log(passed ? 'PASSED: ' : 'FAILED: ' + journey.name);
  return passed;
}

async function main() {
  console.log('Klaro Pulse Engine v2.0 starting...');

  const { data: journeys, error } = await supabase
    .from('journeys')
    .select('*')
    .eq('is_active', true);

  if (error) {
    console.error('Failed to load journeys: ' + error.message);
    process.exit(1);
  }

  if (!journeys || journeys.length === 0) {
    console.log('No active journeys found.');
    process.exit(0);
  }

  console.log('Found ' + journeys.length + ' journey(s)');
  let allPassed = true;

  for (const journey of journeys) {
    const result = await runJourney(journey);
    if (!result) allPassed = false;
  }

  console.log(allPassed ? 'All journeys passed' : 'One or more journeys failed');
  process.exit(allPassed ? 0 : 1);
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
