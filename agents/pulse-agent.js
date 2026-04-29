import Groq from "groq-sdk";
import { chromium } from "playwright";
import { createClient } from "@supabase/supabase-js";
import { config } from "dotenv";
config();

const cleanEnv = (key) => (process.env[key] || "").replace(/['"]+/g, "").trim();
const groq = new Groq({ apiKey: cleanEnv("GROQ_API_KEY") });
const supabase = createClient(cleanEnv("SUPABASE_URL"), cleanEnv("SUPABASE_SERVICE_ROLE_KEY"));

const SYSTEM_PROMPT = `You are a world-class UX auditor and conversion strategist.
Analyze the website content provided and return ONLY a valid JSON object with exactly these fields:
{
  "authority_score": <integer 0-100>,
  "novice_summary": "<2-3 sentence plain English summary a CEO can understand>",
  "ux_friction_points": ["<specific problem>", "<specific problem>", "<specific problem>"],
  "resolution_steps": ["<actionable fix>", "<actionable fix>", "<actionable fix>"],
  "strengths": ["<what they do well>", "<what they do well>"],
  "revenue_opportunities": ["<money left on table>", "<money left on table>"],
  "competitor_advantage": "<one sentence on how a competitor could steal their customers>",
  "trust_score": <integer 0-100>,
  "conversion_score": <integer 0-100>,
  "mobile_readiness": "<Good|Needs Work|Poor>",
  "target_audience_clarity": "<Clear|Vague|Confusing>",
  "pricing_clarity": "<Clear|Vague|Hidden|None>",
  "cta_effectiveness": "<Strong|Weak|Missing>",
  "industry": "<detected industry>"
}
Be brutally honest. A layman reading this should instantly understand the problems and opportunities.`;

async function runMasterAudit(target) {
  const browser = await chromium.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  const page = await browser.newPage();
  await page.setViewportSize({ width: 1280, height: 800 });
  const consoleErrors = [];
  page.on('console', msg => { if (msg.type() === 'error') consoleErrors.push(msg.text()); });

  try {
    console.log(`[Scanning] ${target.name} → ${target.url}`);
    const startTime = Date.now();
    await page.goto(target.url, { waitUntil: 'networkidle', timeout: 45000 });
    const loadTime = Date.now() - startTime;

    const pageData = await page.evaluate(() => ({
      text: document.body.innerText.slice(0, 3000),
      title: document.title,
      metaDesc: document.querySelector('meta[name="description"]')?.content || '',
      h1s: Array.from(document.querySelectorAll('h1')).map(h => h.innerText).slice(0, 3),
      h2s: Array.from(document.querySelectorAll('h2')).map(h => h.innerText).slice(0, 5),
      ctaButtons: Array.from(document.querySelectorAll('a,button')).map(el => el.innerText.trim()).filter(t => t.length > 0 && t.length < 40).slice(0, 10),
      hasPricing: document.body.innerText.toLowerCase().includes('pricing') || document.body.innerText.toLowerCase().includes('per month'),
      hasTestimonials: document.body.innerText.toLowerCase().includes('testimonial') || document.body.innerText.toLowerCase().includes('review') || document.body.innerText.toLowerCase().includes('trusted by'),
    }));

    const userContent = `
Website: ${target.url}
Title: ${pageData.title}
Meta Description: ${pageData.metaDesc}
H1 Headlines: ${pageData.h1s.join(' | ')}
H2 Headlines: ${pageData.h2s.join(' | ')}
CTA Buttons visible: ${pageData.ctaButtons.join(' | ')}
Has pricing visible: ${pageData.hasPricing}
Has social proof/testimonials: ${pageData.hasTestimonials}
Page load time: ${loadTime}ms
Console errors: ${consoleErrors.length}
Page content: ${pageData.text}
Mission: ${target.mission}
    `.trim();

    const completion = await groq.chat.completions.create({
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: userContent }
      ],
      model: "llama-3.3-70b-versatile",
      response_format: { type: "json_object" },
      temperature: 0.3,
    });

    const report = JSON.parse(completion.choices[0].message.content);
    report.scanned_at = new Date().toISOString();
    report.load_time_ms = loadTime;
    report.console_errors = consoleErrors.length;

    const status = report.authority_score >= 75 && consoleErrors.length === 0 ? 'UP' :
                   report.authority_score >= 50 ? 'DEGRADED' : 'DOWN';

    await supabase.from('pulse_logs').insert([{
      url: target.url,
      status,
      reasoning: report.novice_summary,
      metadata: {
        full_report: report,
        mission: target.mission,
        target_name: target.name,
        errors: consoleErrors,
        page_data: { title: pageData.title, hasPricing: pageData.hasPricing, hasTestimonials: pageData.hasTestimonials }
      }
    }]);

    console.log(`✅ ${target.name} — Score: ${report.authority_score}/100 — ${status}`);
    return report;

  } catch (err) {
    console.error(`❌ Failed ${target.name}: ${err.message}`);
    await supabase.from('pulse_logs').insert([{
      url: target.url,
      status: 'ERROR',
      reasoning: `Scan failed: ${err.message}`,
      metadata: { target_name: target.name, error: err.message }
    }]);
  } finally {
    await browser.close();
  }
}

async function run() {
  console.log("═══════════════════════════════════");
  console.log("  KLARO PULSE — Universal Site Scan");
  console.log("═══════════════════════════════════");

  const targetArg = process.argv[2];

  if (targetArg) {
    console.log(`[Single Scan Mode] ${targetArg}`);
    await runMasterAudit({
      name: new URL(targetArg).hostname,
      url: targetArg,
      mission: 'Audit this website for UX friction, trust signals, conversion clarity and competitive weaknesses. Return authority_score, novice_summary, ux_friction_points, resolution_steps, strengths, revenue_opportunities, competitor_advantage, trust_score, conversion_score, mobile_readiness, target_audience_clarity, pricing_clarity, cta_effectiveness, industry.'
    });
    return;
  }

  const { data: targets, error } = await supabase
    .from('pulse_targets')
    .select('*')
    .eq('is_active', true);

  if (error) { console.error("DB Error:", error.message); process.exit(1); }
  if (!targets?.length) { console.log("No active targets. Add rows to pulse_targets table."); return; }

  console.log(`[Batch Mode] Scanning ${targets.length} targets...\n`);
  for (const t of targets) {
    await runMasterAudit(t);
    await new Promise(r => setTimeout(r, 2000));
  }

  console.log(`\n✅ Done. ${targets.length} sites scanned.`);
}

run();
