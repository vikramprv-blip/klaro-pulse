const { Groq } = require("groq-sdk");
const { chromium } = require("playwright");
const { createClient } = require("@supabase/supabase-js");
require("dotenv").config();

const cleanEnv = (key) => (process.env[key] || "").replace(/['"]+/g, "").trim();
const groq = new Groq({ apiKey: cleanEnv("GROQ_API_KEY") });
const supabase = createClient(cleanEnv("SUPABASE_URL"), cleanEnv("SUPABASE_SERVICE_ROLE_KEY"));

const targets = [
  { name: 'Klaro Services', url: 'https://klaro.services', mission: 'Assess if a new US customer can easily understand how to start a blocker resolution.' },
  { name: 'NomadPilot', url: 'https://nomadpilot.app', mission: 'Evaluate the clarity of the AI Travel Orchestration value prop for a global traveler.' }
];

async function runMasterAudit(target) {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  const consoleErrors = [];
  
  page.on('console', msg => { if (msg.type() === 'error') consoleErrors.push(msg.text()); });

  try {
    console.log(`[Audit Start] ${target.name}`);
    await page.goto(target.url, { waitUntil: 'networkidle', timeout: 30000 });

    const pageData = await page.evaluate(() => ({
      text: document.body.innerText.slice(0, 2000),
      links: Array.from(document.querySelectorAll('a')).map(a => ({ text: a.innerText, href: a.href })).slice(0, 10)
    }));

    // THE PROPRIETARY BRAIN: Generating the novice-friendly report
    const completion = await groq.chat.completions.create({
      messages: [
        { 
          role: "system", 
          content: `You are the World's Leading UX & Compliance Auditor. 
          Your goal is to explain website failures so simply that a novice CEO understands them, but with enough technical detail for a lead developer.
          
          OUTPUT ONLY JSON:
          {
            "novice_summary": "1-sentence 'What is wrong'",
            "ux_friction_points": ["point 1", "point 2"],
            "technical_blockers": ["specific errors or dead links"],
            "resolution_steps": ["step 1", "step 2"],
            "authority_score": 1-100
          }` 
        },
        { role: "user", content: `Mission: ${target.mission}\nContent: ${pageData.text}\nErrors: ${consoleErrors.join(', ')}` }
      ],
      model: "llama-3.3-70b-versatile",
      response_format: { type: "json_object" }
    });

    const report = JSON.parse(completion.choices[0].message.content);

    await supabase.from('pulse_logs').insert([{ 
      url: target.url, 
      status: (consoleErrors.length > 0 || report.authority_score < 70) ? 'DEGRADED' : 'UP', 
      reasoning: report.novice_summary, 
      metadata: { 
        full_report: report, 
        mission: target.mission,
        raw_errors: consoleErrors 
      }
    }]);

    console.log(`✅ Audit Published for ${target.name}`);
  } catch (err) {
    console.error(`❌ Audit FAILED: ${err.message}`);
  } finally {
    await browser.close();
  }
}

async function run() {
  for (const t of targets) await runMasterAudit(t);
}
run();
