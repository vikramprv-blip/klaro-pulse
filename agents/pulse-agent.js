import Groq from "groq-sdk";
import { chromium } from "playwright";
import { createClient } from "@supabase/supabase-js";
import { config } from "dotenv";
config();

const cleanEnv = (key) => (process.env[key] || "").replace(/['"]+/g, "").trim();
const groq = new Groq({ apiKey: cleanEnv("GROQ_API_KEY") });
const supabase = createClient(cleanEnv("SUPABASE_URL"), cleanEnv("SUPABASE_SERVICE_ROLE_KEY"));

const BLOCKED = ["rippling.com","deel.com","gusto.com","xero.com","datadoghq.com","webflow.com","clio.com","clickup.com","workday.com","salesforce.com","bamboohr.com"];

async function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

async function scanPage(url) {
  const browser = await chromium.launch({ headless: true, args: ['--no-sandbox','--disable-setuid-sandbox','--disable-dev-shm-usage'] });
  const page = await browser.newPage();
  await page.setExtraHTTPHeaders({ 'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36' });
  try {
    const t0 = Date.now();
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 });
    await sleep(1500);
    const loadTime = Date.now() - t0;
    const data = await page.evaluate(() => ({
      text: document.body.innerText.slice(0, 4000),
      title: document.title,
      metaDesc: document.querySelector('meta[name="description"]')?.content || '',
      h1s: Array.from(document.querySelectorAll('h1')).map(h => h.innerText.trim()).filter(Boolean).slice(0, 3),
      h2s: Array.from(document.querySelectorAll('h2')).map(h => h.innerText.trim()).filter(Boolean).slice(0, 6),
      ctas: Array.from(document.querySelectorAll('a,button')).map(el => el.innerText.trim()).filter(t => t.length > 1 && t.length < 50).slice(0, 15),
      hasPhone: /\+?\d[\d\s\-().]{8,}/.test(document.body.innerText),
      hasEmail: /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/.test(document.body.innerText),
      hasPricing: /pricing|price|per month|\/mo|from \$|from £|from ₹/i.test(document.body.innerText),
      hasTestimonials: /testimonial|review|trusted by|clients say|what our/i.test(document.body.innerText),
      hasCookieBanner: !!document.querySelector('[class*="cookie"],[id*="cookie"],[class*="consent"],[id*="consent"]'),
      hasPrivacyPolicy: Array.from(document.querySelectorAll('a')).some(a => /privacy/i.test(a.innerText||a.href||'')),
      isHttps: location.protocol === 'https:',
      techStack: navigator.userAgent,
      linkCount: document.querySelectorAll('a').length,
      imageCount: document.querySelectorAll('img').length,
      imagesWithAlt: document.querySelectorAll('img[alt]').length,
      formCount: document.querySelectorAll('form').length,
    }));
    return { ...data, loadTime, url, error: null };
  } catch(e) {
    return { error: e.message.split('\n')[0], url, loadTime: 0, text: '', title: '', metaDesc: '', h1s: [], h2s: [], ctas: [], hasPricing: false, hasTestimonials: false };
  } finally {
    await browser.close();
  }
}

async function generateFullReport(target, pageData, competitorData) {
  const FULL_REPORT_PROMPT = `You are a senior business intelligence consultant producing a comprehensive site intelligence report. You have scanned the target website and its competitors.

TARGET SITE: ${target.url}
NAME: ${target.name}

SCAN DATA:
Title: ${pageData.title}
Meta: ${pageData.metaDesc}
H1: ${pageData.h1s.join(' | ')}
H2: ${pageData.h2s.join(' | ')}
CTAs visible: ${pageData.ctas.join(' | ')}
Has phone number: ${pageData.hasPhone}
Has email: ${pageData.hasEmail}
Has pricing: ${pageData.hasPricing}
Has testimonials: ${pageData.hasTestimonials}
Has cookie consent: ${pageData.hasCookieBanner}
Has privacy policy: ${pageData.hasPrivacyPolicy}
HTTPS: ${pageData.isHttps}
Load time: ${pageData.loadTime}ms
Images with alt text: ${pageData.imagesWithAlt}/${pageData.imageCount}
Page content: ${pageData.text}

COMPETITOR DATA:
${competitorData.map(c => `
COMPETITOR: ${c.url}
Title: ${c.title}
Has pricing: ${c.hasPricing}
Has testimonials: ${c.hasTestimonials}
Load time: ${c.loadTime}ms
CTAs: ${c.ctas?.slice(0,5).join(' | ')}
Content preview: ${c.text?.slice(0,500)}
`).join('\n---\n')}

Produce a comprehensive business intelligence report in JSON format. Be specific, commercial, and focused on revenue impact. Write as a senior consultant advising a CEO. Use plain English. No jargon.

Return ONLY valid JSON:
{
  "overall_score": <0-100>,
  "grade": "<A|B|C|D|F>",
  
  "executive_brief": {
    "one_line_verdict": "<single sentence a CEO would tell their board>",
    "plain_english_summary": "<3-4 sentences. What is this company, what is their website doing right and wrong, what is the business impact>",
    "estimated_revenue_impact": "<what fixing the top issues could mean in revenue terms - be specific>",
    "urgency": "<Low|Medium|High|Critical>",
    "top_3_actions": ["<specific action 1 - do this week>", "<specific action 2 - do this month>", "<specific action 3 - do this quarter>"]
  },

  "competitive_intelligence": {
    "market_position": "<how this site compares to competitors overall>",
    "comparison_table": [
      ${competitorData.map(c => `{"competitor": "${c.url}", "strengths": "<what they do better>", "weaknesses": "<where target beats them>"}`).join(',\n      ')}
    ],
    "where_losing_clients": "<specific reasons clients choose competitors over this site>",
    "competitive_advantage_opportunity": "<the single biggest thing they could do to take market share>"
  },

  "ux_conversion_audit": {
    "conversion_score": <0-100>,
    "trust_score": <0-100>,
    "issues": [
      {
        "issue": "<specific problem>",
        "priority": "<Critical|High|Medium|Low>",
        "business_impact": "<what this costs in lost revenue or clients>",
        "fix": "<exactly what to do>",
        "effort": "<1 hour|1 day|1 week|1 month>",
        "cost": "<Free|Under $500|$500-2000|$2000+>"
      }
    ],
    "quick_wins": ["<thing 1 that takes under 1 hour and costs nothing>", "<thing 2>", "<thing 3>"]
  },

  "security_compliance": {
    "security_score": <0-100>,
    "https": ${pageData.isHttps},
    "cookie_consent": ${pageData.hasCookieBanner},
    "privacy_policy": ${pageData.hasPrivacyPolicy},
    "accessibility_score": <0-100>,
    "images_missing_alt": ${pageData.imageCount - pageData.imagesWithAlt},
    "legal_risks": ["<specific legal risk 1 with applicable law>", "<risk 2>"],
    "security_issues": ["<specific security concern 1>", "<concern 2>"],
    "soc2_readiness": "<Not Ready|Partial|Ready>",
    "gdpr_compliance": "<Non-Compliant|Partial|Compliant>",
    "recommendations": ["<specific security fix 1>", "<fix 2>", "<fix 3>"]
  },

  "ninety_day_roadmap": {
    "week_1": {
      "actions": ["<action 1 - no developer needed>", "<action 2>", "<action 3>"],
      "expected_score": <score after week 1>,
      "cost": "<estimated cost>"
    },
    "month_1": {
      "actions": ["<action 1>", "<action 2>", "<action 3>"],
      "expected_score": <score after month 1>,
      "cost": "<estimated cost>"
    },
    "month_2_3": {
      "actions": ["<action 1>", "<action 2>", "<action 3>"],
      "expected_score": <score after month 3>,
      "cost": "<estimated cost>"
    },
    "expected_outcome": "<what the business should see in enquiries/revenue after 90 days>"
  },

  "strengths": ["<genuine strength 1>", "<strength 2>", "<strength 3>"],
  "industry": "<detected industry>",
  "target_audience": "<who this site is trying to reach>",
  "mobile_readiness": "<Good|Needs Work|Poor>",
  "load_time_ms": ${pageData.loadTime},
  "pricing_clarity": "<Clear|Vague|Hidden|None>",
  "cta_effectiveness": "<Strong|Weak|Missing>"
}`;

  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const completion = await groq.chat.completions.create({
        messages: [{ role: "user", content: FULL_REPORT_PROMPT }],
        model: "llama-3.3-70b-versatile",
        response_format: { type: "json_object" },
        temperature: 0.2,
        max_tokens: 4000,
      });
      return JSON.parse(completion.choices[0].message.content);
    } catch(e) {
      if (e.message?.includes('429') && attempt < 2) {
        console.log(`  Rate limited — waiting ${(attempt+1)*20}s...`);
        await sleep((attempt+1) * 20000);
      } else throw e;
    }
  }
}

async function runFullAudit(target) {
  const hostname = new URL(target.url).hostname.replace("www.","");
  if (BLOCKED.some(b => hostname.includes(b))) {
    console.log(`[Skipped] ${target.name} — blocks headless browsers`);
    return null;
  }

  console.log(`\n[Scanning] ${target.name} → ${target.url}`);

  // Scan target
  const pageData = await scanPage(target.url);
  if (pageData.error && pageData.loadTime === 0) {
    console.error(`  Failed: ${pageData.error}`);
    await supabase.from('pulse_logs').insert([{
      url: target.url, status: 'ERROR',
      reasoning: `Scan failed: ${pageData.error}`,
      metadata: { target_name: target.name, error: pageData.error }
    }]);
    return null;
  }

  // Scan up to 3 competitors from same industry (from our database)
  console.log(`  Scanning competitors...`);
  const { data: allTargets } = await supabase.from('pulse_targets').select('url,name').eq('is_active', true).neq('url', target.url).limit(20);
  
  // Pick 3 random other targets as "competitors" for comparison
  const competitorTargets = (allTargets || []).sort(() => 0.5 - Math.random()).slice(0, 3);
  const competitorData = [];
  
  for (const comp of competitorTargets) {
    const compHostname = new URL(comp.url).hostname.replace("www.","");
    if (BLOCKED.some(b => compHostname.includes(b))) continue;
    console.log(`  Scanning competitor: ${comp.name}`);
    const compData = await scanPage(comp.url);
    if (!compData.error) competitorData.push(compData);
    await sleep(3000);
  }

  // Generate full 5-section report
  console.log(`  Generating AI report with ${competitorData.length} competitors...`);
  const report = await generateFullReport(target, pageData, competitorData);
  report.scanned_at = new Date().toISOString();
  report.competitors_scanned = competitorData.map(c => c.url);

  const status = report.overall_score >= 75 ? 'UP' : report.overall_score >= 50 ? 'DEGRADED' : 'DOWN';

  await supabase.from('pulse_logs').insert([{
    url: target.url,
    status,
    reasoning: report.executive_brief?.plain_english_summary || '',
    metadata: {
      full_report: report,
      target_name: target.name,
      report_version: 'v2_competitive',
    }
  }]);

  console.log(`  Score: ${report.overall_score}/100 — ${status}`);
  return report;
}

async function run() {
  console.log("═══════════════════════════════════════════");
  console.log("  KLARO PULSE v2 — Full Competitive Audit");
  console.log("═══════════════════════════════════════════");

  const targetArg = process.argv[2];

  if (targetArg) {
    await runFullAudit({
      name: new URL(targetArg).hostname,
      url: targetArg,
      mission: 'Full competitive audit'
    });
    return;
  }

  const { data: targets, error } = await supabase.from('pulse_targets').select('*').eq('is_active', true);
  if (error) { console.error("DB Error:", error.message); process.exit(1); }
  if (!targets?.length) { console.log("No active targets."); return; }

  const scannable = targets.filter(t => {
    try { const h = new URL(t.url).hostname.replace("www.",""); return !BLOCKED.some(b => h.includes(b)); }
    catch { return false; }
  });

  console.log(`[Batch] ${scannable.length} scannable targets\n`);
  for (const t of scannable) {
    await runFullAudit(t);
    await sleep(8000); // Prevent rate limiting
  }
  console.log(`\nDone.`);
}

run();
