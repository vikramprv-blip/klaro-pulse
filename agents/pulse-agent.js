const { Groq } = require("groq-sdk");
const { chromium } = require("playwright");
const { createClient } = require("@supabase/supabase-js");
require("dotenv").config();

const cleanEnv = (key) => (process.env[key] || "").replace(/['"]+/g, "").trim();
const groq = new Groq({ apiKey: cleanEnv("GROQ_API_KEY") });
const supabase = createClient(cleanEnv("SUPABASE_URL"), cleanEnv("SUPABASE_SERVICE_ROLE_KEY"));

const targets = [
  { name: 'Klaro', url: 'https://klaro.services', goal: 'Verify if the US legal landing page is clear.' },
  { name: 'NomadPilot', url: 'https://nomadpilot.app', goal: 'Check the travel orchestration call-to-action.' }
];

// Scrub Markdown from LLM JSON responses
function scrubJSON(raw) {
  const match = raw.match(/\{[\s\S]*\}/);
  return match ? JSON.parse(match[0]) : null;
}

async function runLAM(target) {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();
  const consoleLogs = [];
  
  page.on('console', msg => { if (msg.type() === 'error') consoleLogs.push(msg.text()); });

  try {
    console.log(`[LAM] Objective: ${target.goal}`);
    await page.goto(target.url, { waitUntil: 'networkidle' });

    const dom = await page.evaluate(() => document.body.innerText.slice(0, 1000));
    
    const decision = await groq.chat.completions.create({
      messages: [{ role: "system", content: "You are a LAM. Return ONLY JSON: {\"selector\": \"css_selector\", \"reason\": \"why\"}" },
                 { role: "user", content: `Goal: ${target.goal}\nDOM: ${dom}` }],
      model: "llama-3.3-70b-versatile",
    });

    const action = scrubJSON(decision.choices[0].message.content);
    
    if (action && action.selector) {
      console.log(`[LAM] Executing: ${action.selector}`);
      await page.click(action.selector).catch(() => {});
      await page.waitForTimeout(2000);
    }

    const audit = await groq.chat.completions.create({
      messages: [{ role: "system", content: "Audit the final state for US compliance and technical friction." },
                 { role: "user", content: `Final URL: ${page.url()}\nGoal: ${target.goal}` }],
      model: "llama-3.3-70b-versatile",
    });

    await supabase.from('pulse_logs').insert([{ 
      url: target.url, 
      status: consoleLogs.length > 0 ? 'DEGRADED' : 'UP', 
      reasoning: audit.choices[0].message.content, 
      metadata: { action_taken: action, errors: consoleLogs, final_url: page.url() }
    }]);

  } catch (err) {
    console.error(`❌ ${target.name} Failed: ${err.message}`);
  } finally {
    await browser.close();
  }
}

async function run() {
  for (const t of targets) await runLAM(t);
  console.log("🚀 All audits pushed to Supabase.");
}
run();
