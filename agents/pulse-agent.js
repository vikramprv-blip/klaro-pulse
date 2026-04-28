const { Groq } = require("groq-sdk");
const { chromium } = require("playwright");
const { createClient } = require("@supabase/supabase-js");
require("dotenv").config();

const cleanEnv = (key) => (process.env[key] || "").replace(/['"]+/g, "").trim();
const groq = new Groq({ apiKey: cleanEnv("GROQ_API_KEY") });
const supabase = createClient(cleanEnv("SUPABASE_URL"), cleanEnv("SUPABASE_SERVICE_ROLE_KEY"));

const targets = [
  { name: 'Klaro', url: 'https://klaro.services', goal: 'Navigate to US Login and verify the Blocker Resolution headline.' },
  { name: 'NomadPilot', url: 'https://nomadpilot.app', goal: 'Verify the AI Travel Orchestration flow is accessible.' }
];

async function runLAM(target) {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  const logs = [];
  
  page.on('console', msg => logs.push(`[Console] ${msg.type()}: ${msg.text()}`));

  try {
    console.log(`[LAM] Initiating Objective: ${target.goal}`);
    await page.goto(target.url, { waitUntil: 'networkidle' });

    // THE LAM "BRAIN": Determining the next click
    const domSnapshot = await page.evaluate(() => document.body.innerText.slice(0, 1000));
    
    const decision = await groq.chat.completions.create({
      messages: [{ 
        role: "system", 
        content: `You are a Large Action Model. Objective: ${target.goal}. Based on this HTML snapshot, what is the CSS selector of the most important button to click next? Return ONLY a JSON object: {"selector": "string", "reason": "string"}` 
      }, { 
        role: "user", content: domSnapshot 
      }],
      model: "llama-3.3-70b-versatile",
      response_format: { type: "json_object" }
    });

    const action = JSON.parse(decision.choices[0].message.content);
    console.log(`[LAM Action] Clicking: ${action.selector} | Reason: ${action.reason}`);

    // EXECUTE THE ACTION
    await page.click(action.selector).catch(e => console.log("Click failed, proceeding to audit."));
    await page.waitForTimeout(2000);

    const finalState = await page.evaluate(() => ({
      url: window.location.href,
      title: document.title,
      text: document.body.innerText.slice(0, 1500)
    }));

    // FINAL AUDIT
    const audit = await groq.chat.completions.create({
      messages: [{ 
        role: "system", 
        content: "You are the Lead Auditor. Compare the goal with the final page state. Identify any broken logic, UX friction, or compliance gaps." 
      }, { 
        role: "user", content: `Goal: ${target.goal}\nFinal State: ${JSON.stringify(finalState)}` 
      }],
      model: "llama-3.3-70b-versatile",
    });

    await supabase.from('pulse_logs').insert([{ 
      url: target.url, 
      status: logs.some(l => l.includes('error')) ? 'DEGRADED' : 'UP', 
      reasoning: audit.choices[0].message.content, 
      metadata: { action_taken: action, console_logs: logs, final_url: finalState.url }
    }]);

    console.log(`✅ ${target.name} LAM Cycle Complete.`);
  } catch (err) {
    console.error(`❌ LAM Failure: ${err.message}`);
  } finally {
    await browser.close();
  }
}

async function run() {
  for (const t of targets) await runLAM(t);
}
run();
