import { chromium } from "playwright";
import { createClient } from "@supabase/supabase-js";
import { config } from "dotenv";
config();

const cleanEnv = (key) => (process.env[key] || "").replace(/['"]+/g, "").trim();
const supabase = createClient(cleanEnv("SUPABASE_URL"), cleanEnv("SUPABASE_SERVICE_ROLE_KEY"));

// Provider rotation — primary to emergency
const PROVIDERS = [
  {
    name: "OpenRouter/DeepSeek-R1",
    available: () => !!cleanEnv("OPENROUTER_API_KEY"),
    call: async (prompt) => {
      const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${cleanEnv("OPENROUTER_API_KEY")}`,
          "Content-Type": "application/json",
          "HTTP-Referer": "https://klaro.services",
          "X-Title": "Klaro Pulse"
        },
        body: JSON.stringify({
          model: "meta-llama/llama-3.3-70b-instruct:free",
          messages: [{ role: "user", content: prompt }],
          response_format: { type: "json_object" },
          temperature: 0.2,
          max_tokens: 4000,
        })
      });
      if (!res.ok) throw new Error(`OpenRouter ${res.status}: ${await res.text()}`);
      const data = await res.json();
      return data.choices[0].message.content;
    }
  },
  {
    name: "DeepSeek Direct",
    available: () => !!cleanEnv("DEEPSEEK_API_KEY"),
    call: async (prompt) => {
      const res = await fetch("https://api.deepseek.com/chat/completions", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${cleanEnv("DEEPSEEK_API_KEY")}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "deepseek-chat",
          messages: [{ role: "user", content: prompt }],
          response_format: { type: "json_object" },
          temperature: 0.2,
          max_tokens: 4000,
        })
      });
      if (!res.ok) throw new Error(`DeepSeek ${res.status}: ${await res.text()}`);
      const data = await res.json();
      return data.choices[0].message.content;
    }
  },
  {
    name: "Groq/Llama",
    available: () => !!cleanEnv("GROQ_API_KEY"),
    call: async (prompt) => {
      const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${cleanEnv("GROQ_API_KEY")}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "llama-3.3-70b-versatile",
          messages: [{ role: "user", content: prompt }],
          response_format: { type: "json_object" },
          temperature: 0.2,
          max_tokens: 4000,
        })
      });
      if (!res.ok) {
        const err = await res.text();
        if (res.status === 429) throw new Error(`RATE_LIMITED: ${err}`);
        throw new Error(`Groq ${res.status}: ${err}`);
      }
      const data = await res.json();
      return data.choices[0].message.content;
    }
  }
];

async function callAI(prompt) {
  for (const provider of PROVIDERS) {
    if (!provider.available()) { console.log(`  [Skip] ${provider.name} — no API key`); continue; }
    try {
      console.log(`  [AI] Using ${provider.name}...`);
      const result = await provider.call(prompt);
      // Strip any markdown fences just in case
      const clean = result.replace(/```json\n?/g,'').replace(/```\n?/g,'').trim();
      return JSON.parse(clean);
    } catch(e) {
      console.log(`  [Fallback] ${provider.name} failed: ${e.message.slice(0,80)}`);
      await sleep(2000);
    }
  }
  throw new Error("All AI providers failed");
}

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
      linkCount: document.querySelectorAll('a').length,
      imageCount: document.querySelectorAll('img').length,
      imagesWithAlt: document.querySelectorAll('img[alt]').length,
      formCount: document.querySelectorAll('form').length,
    }));
    return { ...data, loadTime, url, error: null };
  } catch(e) {
    return { error: e.message.split('\n')[0], url, loadTime: 0, text: '', title: '', metaDesc: '', h1s: [], h2s: [], ctas: [], hasPricing: false, hasTestimonials: false, hasCookieBanner: false, hasPrivacyPolicy: false, isHttps: false, imageCount: 0, imagesWithAlt: 0 };
  } finally {
    await browser.close();
  }
}

async function generateReport(target, pageData, competitorData) {
  const prompt = `You are a senior business intelligence consultant. Produce a comprehensive site intelligence report in JSON format. Be specific, commercial, revenue-focused. Write for a CEO — no jargon, plain English only.

TARGET: ${target.name} (${target.url})
Title: ${pageData.title}
Meta: ${pageData.metaDesc}
H1s: ${pageData.h1s.join(' | ')}
H2s: ${pageData.h2s.join(' | ')}
CTAs: ${pageData.ctas.join(' | ')}
Has phone: ${pageData.hasPhone} | Has email: ${pageData.hasEmail}
Has pricing: ${pageData.hasPricing} | Has testimonials: ${pageData.hasTestimonials}
Cookie consent: ${pageData.hasCookieBanner} | Privacy policy: ${pageData.hasPrivacyPolicy}
HTTPS: ${pageData.isHttps} | Load time: ${pageData.loadTime}ms
Images missing alt: ${pageData.imageCount - pageData.imagesWithAlt}/${pageData.imageCount}
Content: ${pageData.text.slice(0, 2000)}

COMPETITORS SCANNED:
${competitorData.map((c,i) => `
Competitor ${i+1}: ${c.url}
Title: ${c.title} | Has pricing: ${c.hasPricing} | Has testimonials: ${c.hasTestimonials}
Load: ${c.loadTime}ms | CTAs: ${c.ctas?.slice(0,5).join(' | ')}
Content: ${c.text?.slice(0,400)}
`).join('---')}

Return ONLY this JSON structure:
{
  "overall_score": <0-100>,
  "grade": "<A|B|C|D|F>",
  "executive_brief": {
    "one_line_verdict": "<one sentence a CEO would tell their board>",
    "plain_english_summary": "<3-4 sentences. What is this business, what is broken, what is the revenue impact>",
    "estimated_revenue_impact": "<specific estimate of what fixing top issues means in revenue>",
    "urgency": "<Low|Medium|High|Critical>",
    "top_3_actions": ["<do this week - no developer>", "<do this month>", "<do this quarter>"]
  },
  "competitive_intelligence": {
    "market_position": "<where this site stands vs competitors>",
    "where_losing_clients": "<specific reasons clients choose competitors>",
    "biggest_competitor_advantage": "<the one thing competitors do better>",
    "opportunity_to_win": "<the one thing that would take market share>"
  },
  "ux_conversion_audit": {
    "conversion_score": <0-100>,
    "trust_score": <0-100>,
    "issues": [
      {"issue": "<problem>", "priority": "<Critical|High|Medium>", "business_impact": "<revenue lost>", "fix": "<exact action>", "effort": "<1 hour|1 day|1 week>", "cost": "<Free|Under $500|$500-2000>"}
    ],
    "quick_wins": ["<win 1 under 1 hour free>", "<win 2>", "<win 3>"]
  },
  "security_compliance": {
    "security_score": <0-100>,
    "https": ${pageData.isHttps},
    "cookie_consent": ${pageData.hasCookieBanner},
    "privacy_policy": ${pageData.hasPrivacyPolicy},
    "accessibility_score": <0-100>,
    "legal_risks": ["<risk with law name>", "<risk 2>"],
    "security_issues": ["<issue 1>", "<issue 2>"],
    "soc2_readiness": "<Not Ready|Partial|Ready>",
    "gdpr_compliance": "<Non-Compliant|Partial|Compliant>",
    "recommendations": ["<fix 1>", "<fix 2>", "<fix 3>"]
  },
  "ninety_day_roadmap": {
    "week_1": {"actions": ["<action>", "<action>", "<action>"], "expected_score": <n>, "cost": "<estimate>"},
    "month_1": {"actions": ["<action>", "<action>", "<action>"], "expected_score": <n>, "cost": "<estimate>"},
    "month_2_3": {"actions": ["<action>", "<action>", "<action>"], "expected_score": <n>, "cost": "<estimate>"},
    "expected_outcome": "<what business sees in 90 days>"
  },
  "strengths": ["<strength 1>", "<strength 2>", "<strength 3>"],
  "industry": "<industry>",
  "target_audience": "<who they serve>",
  "mobile_readiness": "<Good|Needs Work|Poor>",
  "load_time_ms": ${pageData.loadTime},
  "pricing_clarity": "<Clear|Vague|Hidden|None>",
  "cta_effectiveness": "<Strong|Weak|Missing>"
}`;

  return await callAI(prompt);
}

async function runFullAudit(target) {
  const hostname = new URL(target.url).hostname.replace("www.","");
  if (BLOCKED.some(b => hostname.includes(b))) {
    console.log(`[Skipped] ${target.name} — blocks headless browsers`);
    return null;
  }

  console.log(`\n[Scanning] ${target.name} → ${target.url}`);
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

  // Scan 2 competitors
  console.log(`  Scanning competitors...`);
  const { data: allTargets } = await supabase.from('pulse_targets').select('url,name').eq('is_active', true).neq('url', target.url).limit(20);
  const picks = (allTargets || []).sort(() => 0.5 - Math.random()).slice(0, 2);
  const competitorData = [];
  for (const comp of picks) {
    try {
      const h = new URL(comp.url).hostname.replace("www.","");
      if (BLOCKED.some(b => h.includes(b))) continue;
      console.log(`  Competitor: ${comp.name}`);
      const d = await scanPage(comp.url);
      if (!d.error) competitorData.push(d);
      await sleep(2000);
    } catch(e) { console.log(`  Comp scan failed: ${e.message.slice(0,50)}`); }
  }

  console.log(`  Generating report with ${competitorData.length} competitors...`);
  let report;
  try {
    report = await generateReport(target, pageData, competitorData);
  } catch(e) {
    console.error(`  AI failed: ${e.message}`);
    await supabase.from('pulse_logs').insert([{
      url: target.url, status: 'ERROR',
      reasoning: `AI generation failed: ${e.message.slice(0,100)}`,
      metadata: { target_name: target.name, error: e.message }
    }]);
    return null;
  }

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
      report_version: 'v2',
    }
  }]);

  console.log(`  Done: ${report.overall_score}/100 — ${status} (via ${report._provider || 'AI'})`);
  return report;
}

async function run() {
  console.log("═══════════════════════════════════════════");
  console.log("  KLARO PULSE v2 — Multi-Provider AI Audit");
  console.log("═══════════════════════════════════════════");

  // Show which providers are active
  PROVIDERS.forEach(p => console.log(`  ${p.available() ? '✅' : '❌'} ${p.name}`));
  console.log('');

  const targetArg = process.argv[2];
  if (targetArg) {
    await runFullAudit({ name: new URL(targetArg).hostname, url: targetArg });
    return;
  }

  const { data: targets, error } = await supabase.from('pulse_targets').select('*').eq('is_active', true);
  if (error) { console.error("DB Error:", error.message); process.exit(1); }
  if (!targets?.length) { console.log("No active targets."); return; }

  const scannable = targets.filter(t => {
    try { const h = new URL(t.url).hostname.replace("www.",""); return !BLOCKED.some(b => h.includes(b)); }
    catch { return false; }
  });

  console.log(`[Batch] ${scannable.length} targets\n`);
  for (const t of scannable) {
    await runFullAudit(t);
    await sleep(5000);
  }
  console.log(`\nDone.`);
}

run();
