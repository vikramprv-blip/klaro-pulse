import Groq from "groq-sdk";
import { chromium } from "playwright";
import { createClient } from "@supabase/supabase-js";
import { config } from "dotenv";
config();

const cleanEnv = (key) => (process.env[key] || "").replace(/['"]+/g, "").trim();
const groq = new Groq({ apiKey: cleanEnv("GROQ_API_KEY") });
const supabase = createClient(cleanEnv("SUPABASE_URL"), cleanEnv("SUPABASE_SERVICE_ROLE_KEY"));

// Sites that block headless browsers — skip them
const BLOCKED_SITES = [
  "rippling.com", "deel.com", "gusto.com", "xero.com", "datadoghq.com",
  "webflow.com", "clio.com", "clickup.com", "workday.com", "salesforce.com",
  "hubspot.com", "zendesk.com", "intercom.com", "bamboohr.com"
];

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

async function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

async function runMasterAudit(target) {
  // Skip known bot-blocking sites
  const hostname = new URL(target.url).hostname.replace("www.", "");
  if (BLOCKED_SITES.some(b => hostname.includes(b))) {
    console.log(`[Skipped] ${target.name} — blocks headless browsers`);
    return null;
  }

  const browser = await chromium.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage']
  });
  const page = await browser.newPage();
  await page.setViewportSize({ width: 1280, height: 800 });

  // Set a real user agent to avoid bot detection
  await page.setExtraHTTPHeaders({
    'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
  });

  const consoleErrors = [];
  page.on('console', msg => { if (msg.type() === 'error') consoleErrors.push(msg.text()); });

  try {
    console.log(`[Scanning] ${target.name} → ${target.url}`);
    const startTime = Date.now();

    // Use domcontentloaded instead of networkidle — faster and more reliable
    await page.goto(target.url, { waitUntil: 'domcontentloaded', timeout: 30000 });
    await sleep(2000); // Let JS render
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
Meta: ${pageData.metaDesc}
H1: ${pageData.h1s.join(' | ')}
H2: ${pageData.h2s.join(' | ')}
CTAs: ${pageData.ctaButtons.join(' | ')}
Has pricing: ${pageData.hasPricing}
Has testimonials: ${pageData.hasTestimonials}
Load time: ${loadTime}ms
Console errors: ${consoleErrors.length}
Content: ${pageData.text}
    `.trim();

    // Retry on rate limit with exponential backoff
    let report = null;
    for (let attempt = 0; attempt < 3; attempt++) {
      try {
        const completion = await groq.chat.completions.create({
          messages: [
            { role: "system", content: SYSTEM_PROMPT },
            { role: "user", content: userContent }
          ],
          model: "llama-3.3-70b-versatile",
          response_format: { type: "json_object" },
          temperature: 0.3,
        });
        report = JSON.parse(completion.choices[0].message.content);
        break;
      } catch (e) {
        if (e.message?.includes('429') && attempt < 2) {
          const wait = (attempt + 1) * 15000; // 15s, 30s backoff
          console.log(`  Rate limited — waiting ${wait/1000}s before retry...`);
          await sleep(wait);
        } else throw e;
      }
    }

    if (!report) throw new Error('Failed after 3 attempts');

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
      }
    }]);

    console.log(`✅ ${target.name} — Score: ${report.authority_score}/100 — ${status}`);
    return report;

  } catch (err) {
    console.error(`❌ Failed ${target.name}: ${err.message.split('\n')[0]}`);
    await supabase.from('pulse_logs').insert([{
      url: target.url,
      status: 'ERROR',
      reasoning: `Scan failed: ${err.message.split('\n')[0]}`,
      metadata: { target_name: target.name, error: err.message.split('\n')[0] }
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
      mission: 'Audit this website for UX friction, trust signals, conversion clarity and competitive weaknesses.'
    });
    return;
  }

  const { data: targets, error } = await supabase
    .from('pulse_targets')
    .select('*')
    .eq('is_active', true);

  if (error) { console.error("DB Error:", error.message); process.exit(1); }
  if (!targets?.length) { console.log("No active targets."); return; }

  // Filter out known blocked sites
  const scannable = targets.filter(t => {
    try {
      const h = new URL(t.url).hostname.replace("www.", "");
      return !BLOCKED_SITES.some(b => h.includes(b));
    } catch { return false; }
  });

  console.log(`[Batch Mode] ${scannable.length}/${targets.length} scannable targets\n`);

  for (const t of scannable) {
    await runMasterAudit(t);
    // 5 second delay between scans to avoid rate limiting
    await sleep(5000);
  }

  console.log(`\n✅ Done. ${scannable.length} sites scanned.`);
}

run();
