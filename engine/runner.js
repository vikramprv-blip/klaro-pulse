import { chromium } from 'playwright';
import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config();

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

const COMMIT_SHA = process.env.GITHUB_SHA || 'local';

async function captureScreenshot(page, runId, stepIndex) {
  const filename = `run-${runId}-step-${stepIndex}.png`;
  const buffer = await page.screenshot({ fullPage: false });
  const { data, error } = await supabase.storage
    .from('screenshots')
    .upload(filename, buffer, { contentType: 'image/png', upsert: true });
  if (error) return null;
  const { data: urlData } = supabase.storage.from('screenshots').getPublicUrl(filename);
  return urlData.publicUrl;
}

async function runJourney(journey) {
  console.log(`\n▶ Starting journey: ${journey.name}`);
  console.log(`  Goal: ${journey.goal}`);

  const { data: run } = await supabase.from('test_runs').insert({
    journey_id: journey.id,
    triggered_by: 'github-push',
    commit_sha: COMMIT_SHA,
    status: 'running'
  }).select().single();

  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  const steps = journey.steps;
  let passedSteps = 0;
  let failedSteps = 0;

  for (let i = 0; i < steps.length; i++) {
    const step = steps[i];
    const start = Date.now();
    let status = 'passed';
    let errorMessage = null;
    let screenshotUrl = null;

    try {
      if (step.action === 'navigate') {
        await page.goto(journey.target_url, { waitUntil: 'networkidle', timeout: 15000 });
      } else if (step.action === 'type') {
        await page.fill(step.selector, step.value);
      } else if (step.action === 'click') {
        if (step.selector) {
          await page.click(step.selector);
        } else {
          await page.getByRole('button', { name: /login|sign in|submit/i }).click();
        }
      } else if (step.action === 'assert') {
        await page.waitForTimeout(2000);
        const url = page.url();
        if (url === journey.target_url || url.includes('/login')) {
          throw new Error('Still on login page — assertion failed');
        }
      }

      screenshotUrl = await captureScreenshot(page, run.id, i);
      passedSteps++;
      console.log(`  ✅ Step ${i + 1}: ${step.description}`);
    } catch (err) {
      status = 'failed';
      errorMessage = err.message;
      failedSteps++;
      screenshotUrl = await captureScreenshot(page, run.id, i);
      console.log(`  ❌ Step ${i + 1}: ${step.description} — ${err.message}`);
    }

    await supabase.from('step_results').insert({
      run_id: run.id,
      step_index: i,
      step_description: step.description,
      status,
      ai_reasoning: `Executed action: ${step.action}`,
      screenshot_url: screenshotUrl,
      error_message: errorMessage,
      duration_ms: Date.now() - start
    });
  }

  await browser.close();

  const passed = failedSteps === 0;
  await supabase.from('outcomes').insert({
    run_id: run.id,
    journey_id: journey.id,
    passed,
    total_steps: steps.length,
    passed_steps: passedSteps,
    failed_steps: failedSteps,
    summary: passed
      ? `All ${steps.length} steps passed`
      : `${failedSteps} of ${steps.length} steps failed`
  });

  await supabase.from('test_runs').update({
    status: passed ? 'passed' : 'failed',
    completed_at: new Date().toISOString()
  }).eq('id', run.id);

  console.log(`\n${passed ? '✅ PASSED' : '❌ FAILED'}: ${journey.name}\n`);
  return passed;
}

async function main() {
  const { data: journeys, error } = await supabase
    .from('journeys')
    .select('*')
    .eq('is_active', true);

  if (error) { console.error('Failed to load journeys:', error.message); process.exit(1); }
  if (!journeys.length) { console.log('No active journeys found.'); process.exit(0); }

  console.log(`Found ${journeys.length} active journey(s)`);
  let allPassed = true;

  for (const journey of journeys) {
    const result = await runJourney(journey);
    if (!result) allPassed = false;
  }

  process.exit(allPassed ? 0 : 1);
}

main().catch(err => { console.error(err); process.exit(1); });
