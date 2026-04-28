const { Groq } = require("groq-sdk");
const { chromium } = require("playwright");
const { createClient } = require("@supabase/supabase-js");
require("dotenv").config();

const cleanEnv = (key) => (process.env[key] || "").replace(/['"]+/g, "").trim();
const groq = new Groq({ apiKey: cleanEnv("GROQ_API_KEY") });
const supabase = createClient(cleanEnv("SUPABASE_URL"), cleanEnv("SUPABASE_SERVICE_ROLE_KEY"));

// Scrub Markdown from LLM JSON responses
function scrubJSON(raw) {
  const match = raw.match(/\{[\s\S]*\}/);
  return match ? JSON.parse(match[0]) : null;
}

async function runMasterAudit(target) {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  const consoleErrors = [];
  
  page.on('console', msg => { if (msg.type() === 'error') consoleErrors.push(msg.text()); });

  try {
    console.log(`[Universal Audit] Scanning: ${target.name} (${target.url})`);
    await page.goto(target.url, { waitUntil: 'networkidle', timeout: 30000 });

    const pageData = await page.evaluate(() => ({
      text: document.body.innerText.slice(0, 2000),
      links: Array.from(document.querySelectorAll('a')).map(a => a.href).slice(0, 15)
    }));

    const completion = await groq.chat.completions.create({
      messages: [
        { role: "system", content: "You are a Senior UX Auditor. Mission: " + target.mission + ". Return ONLY JSON: {\"novice_summary\": \"string\", \"ux_friction_points\": [], \"technical_blockers\": [], \"resolution_steps\": [], \"authority_score\": 1-100}" },
        { role: "user", content: `URL: ${target.url}\nContent: ${pageData.text}\nErrors: ${consoleErrors.join(', ')}` }
      ],
      model: "llama-3.3-70b-versatile",
      response_format: { type: "json_object" }
    });

    const report = scrubJSON(completion.choices[0].message.content);

    await supabase.from('pulse_logs').insert([{ 
      url: target.url, 
      status: (consoleErrors.length > 0 || report.authority_score < 75) ? 'DEGRADED' : 'UP', 
      reasoning: report.novice_summary, 
      metadata: { full_report: report, mission: target.mission, errors: consoleErrors }
    }]);

    console.log(`✅ Audit Complete for ${target.name}`);
  } catch (err) {
    console.error(`❌ FAILED ${target.name}: ${err.message}`);
  } finally {
    await browser.close();
  }
}

async function run() {
  // Fetch dynamic targets from Supabase
  const { data: targets, error } = await supabase.from('pulse_targets').select('*');
  if (error || !targets) return console.log("No targets found.");

  for (const t of targets) {
    await runMasterAudit(t);
  }
}
run();
