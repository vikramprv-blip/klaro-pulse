const { Groq } = require("groq-sdk");
const { chromium } = require("playwright");
const { createClient } = require("@supabase/supabase-js");
const dns = require("node:dns");
require("dotenv").config();

dns.setDefaultResultOrder("ipv4first");

const cleanEnv = (key) => (process.env[key] || "").replace(/['"]+/g, "").trim();
const groq = new Groq({ apiKey: cleanEnv("GROQ_API_KEY") });
const supabase = createClient(cleanEnv("SUPABASE_URL"), cleanEnv("SUPABASE_SERVICE_ROLE_KEY"));

const targets = [
  { name: 'Klaro', url: 'https://klaro.services', region: 'US' },
  { name: 'NomadPilot', url: 'https://nomadpilot.app', region: 'Global' }
];

async function runAudit(target) {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  const startTime = Date.now();

  try {
    console.log(`[Pulse] Auditing ${target.name}...`);
    await page.goto(target.url, { waitUntil: 'networkidle' });
    
    if (target.name === 'Klaro' && !page.url().includes("/us")) {
       try { await page.click('text=US', { timeout: 3000 }); } catch(e) {}
    }

    const pageData = await page.evaluate(() => ({
      url: window.location.href,
      content: document.body.innerText.slice(0, 2000),
      hasLogin: !!document.querySelector('input[type="email"]') || document.body.innerText.includes("Sign In")
    }));

    const analysis = await groq.chat.completions.create({
      messages: [
        { role: "system", content: `You are Klaro Pulse auditing ${target.name}. Focus on ${target.region} market standards and blocker clarity.` },
        { role: "user", content: `Content: ${pageData.content}` }
      ],
      model: "llama-3.3-70b-versatile",
    });

    const reasoning = analysis.choices[0].message.content;
    const latency = Date.now() - startTime;

    await supabase.from('pulse_logs').insert([{ 
      url: pageData.url, 
      status: pageData.hasLogin ? 'UP' : 'DEGRADED', 
      reasoning: reasoning, 
      latency_ms: latency,
      region: target.region
    }]);

    console.log(`✅ ${target.name} Audit Saved.`);
  } catch (err) {
    console.error(`❌ ${target.name} Error: ${err.message}`);
  } finally {
    await browser.close();
  }
}

async function runPulse() {
  for (const target of targets) {
    await runAudit(target);
  }
}

runPulse();
