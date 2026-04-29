const { Groq } = require("groq-sdk");
const { chromium } = require("playwright");
const { createClient } = require("@supabase/supabase-js");
require("dotenv").config();

const cleanEnv = (key) => (process.env[key] || "").replace(/['"]+/g, "").trim();
const groq = new Groq({ apiKey: cleanEnv("GROQ_API_KEY") });
const supabase = createClient(cleanEnv("SUPABASE_URL"), cleanEnv("SUPABASE_SERVICE_ROLE_KEY"));

async function runMasterAudit(target) {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  const consoleErrors = [];
  page.on('console', msg => { if (msg.type() === 'error') consoleErrors.push(msg.text()); });

  try {
    console.log(`[Target] ${target.name} -> ${target.url}`);
    await page.goto(target.url, { waitUntil: 'networkidle', timeout: 30000 });
    const dom = await page.evaluate(() => document.body.innerText.slice(0, 1500));

    const completion = await groq.chat.completions.create({
      messages: [{ role: "system", content: "You are a UX Auditor. Mission: " + target.mission + ". Return ONLY JSON." },
                 { role: "user", content: dom }],
      model: "llama-3.3-70b-versatile",
      response_format: { type: "json_object" }
    });

    const report = JSON.parse(completion.choices[0].message.content);
    await supabase.from('pulse_logs').insert([{ 
      url: target.url, 
      status: (consoleErrors.length > 0 || report.authority_score < 75) ? 'DEGRADED' : 'UP', 
      reasoning: report.novice_summary, 
      metadata: { full_report: report, mission: target.mission, errors: consoleErrors }
    }]);
    console.log(`✅ Success: ${target.name}`);
  } catch (err) {
    console.error(`❌ Failed ${target.name}: ${err.message}`);
  } finally {
    await browser.close();
  }
}

async function run() {
  console.log("--- Starting Universal Audit ---");
  const { data: targets, error } = await supabase.from('pulse_targets').select('*');
  
  if (error) {
    console.error("Database Error:", error.message);
    process.exit(1);
  }

  if (!targets || targets.length === 0) {
    console.log("No targets found in pulse_targets table. Add a row to audit any site.");
    return;
  }

  for (const t of targets) await runMasterAudit(t);
}
run();
