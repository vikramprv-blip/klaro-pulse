const { Groq } = require("groq-sdk");
const { chromium } = require("playwright");
const { createClient } = require("@supabase/supabase-js");
const dns = require("node:dns");
require("dotenv").config();

// FORCE IPv4 for older Mac Docker bridges
dns.setDefaultResultOrder("ipv4first");

// Clean whitespace/quotes from env vars
const cleanEnv = (key) => (process.env[key] || "").replace(/['"]+/g, "").trim();

const supabaseUrl = cleanEnv("SUPABASE_URL");
const supabaseKey = cleanEnv("SUPABASE_SERVICE_ROLE_KEY");
const groqKey = cleanEnv("GROQ_API_KEY");
const klaroUrl = cleanEnv("KLARO_URL");

const groq = new Groq({ apiKey: groqKey });
const supabase = createClient(supabaseUrl, supabaseKey);

async function runPulse() {
  console.log(`[Pulse] Bridge Active. Target: ${klaroUrl}`);
  
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  const startTime = Date.now();

  try {
    await page.goto(klaroUrl, { waitUntil: 'networkidle' });
    
    // Check if we need to click US
    if (page.url().includes("klaro.services") && !page.url().includes("/us")) {
       try { await page.click('text=US', { timeout: 3000 }); } catch(e) {}
    }

    const pageData = await page.evaluate(() => ({
      url: window.location.href,
      content: document.body.innerText.slice(0, 2000),
      hasLogin: !!document.querySelector('input[type="email"]') || document.body.innerText.includes("Sign In")
    }));

    const analysis = await groq.chat.completions.create({
      messages: [
        { role: "system", content: "You are Klaro Pulse. Audit for US Lawyers/Accountants. Focus on 'Blocker' resolution clarity." },
        { role: "user", content: `Content: ${pageData.content}` }
      ],
      model: "llama-3.3-70b-versatile",
    });

    const reasoning = analysis.choices[0].message.content;
    const latency = Date.now() - startTime;

    console.log(`[Pulse Reasoning]: ${reasoning.slice(0, 150)}...`);

    console.log(`[Pulse] Attempting Supabase sync to: ${supabaseUrl}`);
    
    const { error } = await supabase.from('pulse_logs').insert([{ 
      url: pageData.url, 
      status: pageData.hasLogin ? 'UP' : 'DEGRADED', 
      reasoning: reasoning, 
      latency_ms: latency,
      region: 'US'
    }]);

    if (error) throw error;
    console.log("✅ Pulse Success: Data synced to Supabase.");

  } catch (err) {
    console.error(`❌ Pulse Error: ${err.message}`);
    if (err.stack) console.error(err.stack);
  } finally {
    await browser.close();
  }
}

runPulse();
