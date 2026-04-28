import Groq from 'groq-sdk';

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

const VISION_MODEL = 'meta-llama/llama-4-scout-17b-16e-instruct';
const TEXT_MODEL = 'llama-3.3-70b-versatile';

function bufToBase64(buffer) {
  return buffer.toString('base64');
}

function parseJSON(text) {
  const clean = text.trim();
  try { return JSON.parse(clean); } catch {}
  const match = clean.match(/\{[\s\S]*\}/);
  if (match) { try { return JSON.parse(match[0]); } catch {} }
  throw new Error(`Could not parse JSON from response: ${clean.slice(0, 200)}`);
}

export async function decideAction(screenshot, context) {
  const { goal, stepDescription, stepIndex, totalSteps, currentUrl, stepsCompleted } = context;

  const prompt = `You are an expert QA testing agent operating a real web browser.

JOURNEY GOAL: ${goal}
CURRENT STEP (${stepIndex + 1}/${totalSteps}): ${stepDescription}
CURRENT URL: ${currentUrl}
STEPS COMPLETED SO FAR: ${stepsCompleted.join(' → ') || 'None yet'}

Look at this screenshot. Decide the single best action to take RIGHT NOW to accomplish the current step.

Respond ONLY with this exact JSON, no markdown, no explanation outside it:
{
  "action": "click|type|navigate|wait|assert|scroll|screenshot|assert_visible",
  "selector": "css selector or null",
  "coordinates": {"x": 0, "y": 0},
  "value": "text to type or null",
  "url": "url if navigate else null",
  "assertText": "text to check if assert else null",
  "reasoning": "One sentence why this action achieves the step goal",
  "confidence": 85,
  "risk": "low|medium|high",
  "alternativeIfFails": "One sentence fallback"
}`;

  const response = await groq.chat.completions.create({
    model: VISION_MODEL,
    max_tokens: 500,
    messages: [{
      role: 'user',
      content: [
        { type: 'image_url', image_url: { url: `data:image/png;base64,${bufToBase64(screenshot)}` } },
        { type: 'text', text: prompt }
      ]
    }]
  });

  return parseJSON(response.choices[0].message.content);
}

export async function healStep(screenshot, context, failedAttempt) {
  const { goal, stepDescription, currentUrl } = context;
  const { action, selector, error } = failedAttempt;

  const prompt = `You are an expert QA agent. A test step FAILED and you must self-heal it.

JOURNEY GOAL: ${goal}
FAILING STEP: ${stepDescription}
CURRENT URL: ${currentUrl}
WHAT FAILED: Action "${action}" on selector "${selector || 'none'}" threw: "${error}"

Look at this screenshot. Suggest a completely different approach to achieve the same objective.

Common fixes to try:
- Different selector (text, role, aria-label instead of CSS class)
- Scroll to element first
- Wait for it to appear
- Click coordinates instead of selector
- Dismiss a modal/overlay blocking the element

Respond ONLY with JSON (same structure, no markdown):
{
  "action": "click|type|navigate|wait|assert|scroll|screenshot",
  "selector": "different selector or null",
  "coordinates": {"x": 0, "y": 0},
  "value": null,
  "url": null,
  "assertText": null,
  "reasoning": "Why this alternative approach will work",
  "confidence": 60,
  "risk": "medium",
  "alternativeIfFails": "Last resort"
}`;

  const response = await groq.chat.completions.create({
    model: VISION_MODEL,
    max_tokens: 400,
    messages: [{
      role: 'user',
      content: [
        { type: 'image_url', image_url: { url: `data:image/png;base64,${bufToBase64(screenshot)}` } },
        { type: 'text', text: prompt }
      ]
    }]
  });

  return parseJSON(response.choices[0].message.content);
}

export async function auditPage(screenshot, pageData) {
  const { url, title, metrics } = pageData;

  const prompt = `You are a senior web auditor performing a comprehensive audit.

URL: ${url}
PAGE TITLE: ${title}
PERFORMANCE METRICS: ${JSON.stringify(metrics, null, 2)}

Analyse this screenshot for:
- ACCESSIBILITY: missing alt text, poor contrast, unlabelled forms, no focus indicators
- UX: confusing navigation, broken layouts, unclear CTAs, responsiveness issues
- TRUST: missing cookie consent, no privacy policy, unclear pricing, no contact info
- PERFORMANCE: interpret the metrics, note anything suggesting slow load
- SECURITY: exposed sensitive fields, missing HTTPS indicators, suspicious iframes

Respond ONLY with this JSON (no markdown):
{
  "overallScore": 72,
  "grade": "B",
  "executiveSummary": "2-3 sentence plain-English summary for a CTO",
  "categories": {
    "accessibility": { "score": 65, "status": "needs_improvement", "findings": [{"severity": "high", "issue": "...", "recommendation": "..."}] },
    "ux": { "score": 80, "status": "good", "findings": [] },
    "trust": { "score": 70, "status": "needs_improvement", "findings": [] },
    "performance": { "score": 75, "status": "good", "findings": [] },
    "security": { "score": 90, "status": "excellent", "findings": [] }
  },
  "topPriorities": ["Fix 1", "Fix 2", "Fix 3"],
  "positives": ["Working well 1", "Working well 2"]
}`;

  const response = await groq.chat.completions.create({
    model: VISION_MODEL,
    max_tokens: 2000,
    messages: [{
      role: 'user',
      content: [
        { type: 'image_url', image_url: { url: `data:image/png;base64,${bufToBase64(screenshot)}` } },
        { type: 'text', text: prompt }
      ]
    }]
  });

  return parseJSON(response.choices[0].message.content);
}

export async function generateRunNarrative(runData) {
  const { journey, outcome, stepResults, auditResults } = runData;

  const prompt = `You are a senior QA consultant writing an executive report summary for a client.

JOURNEY: "${journey.name}"
GOAL: "${journey.goal}"
URL: ${journey.target_url}
RESULT: ${outcome.passed ? 'PASSED' : 'FAILED'}
STEPS: ${outcome.passed_steps}/${outcome.total_steps} passed
SELF-HEALED: ${outcome.healed_steps} steps required AI self-healing

STEP DETAILS:
${stepResults.map((s, i) => `Step ${i + 1} (${s.status}): ${s.step_description}
  AI reasoning: ${s.ai_reasoning || 'N/A'}
  ${s.error_message ? 'Error: ' + s.error_message : ''}
  ${s.heal_attempts > 0 ? 'Self-healed after ' + s.heal_attempts + ' attempt(s)' : ''}`).join('\n')}

AUDIT SCORES:
${auditResults.map(a => `${a.audit_type}: ${a.score}/100`).join(', ')}

Write a professional 3-paragraph executive summary:
1. What was tested and the overall result
2. Key findings — what worked, what failed, what was self-healed
3. Top priority recommendations for the engineering team

Plain English. Specific. Under 200 words. No bullet points. Paragraphs only.`;

  const response = await groq.chat.completions.create({
    model: TEXT_MODEL,
    max_tokens: 600,
    messages: [{ role: 'user', content: prompt }]
  });

  return response.choices[0].message.content.trim();
}
