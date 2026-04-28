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

async function deepAudit(target) {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();
  
  const auditData = {
    brokenLinks: [],
    consoleErrors: [],
    performance: 0,
    startTime: Date.now()
  };

  // Listen for Console Errors (Broken Code)
  page.on('console', msg => {
    if (msg.type() === 'error') auditData.consoleErrors.push(msg.text());
  });

  try {
    console.log(`[Deep Audit] Scanning ${target.name}...`);
    await page.goto(target.url, { waitUntil: 'networkidle' });

    // 1. Find all internal links
    const links = await page.evaluate(() => 
      Array.from(document.querySelectorAll('a')).map(a => a.href)
           .filter(href => href.startsWith(window.location.origin))
    );

    // 2. Check for Broken Links
    for (const link of links.slice(0, 5)) { // Limit to 5 for MVP speed
      const response = await page.request.get(link);
      if (response.status() >= 400) auditData.brokenLinks.push({ link, status: response.status() });
    }

    const content = await page.innerText('body');
    const latency = Date.now() - auditData.startTime;

    // 3. AI Analysis of "Broken" UX/Compliance
    const analysis = await groq.chat.completions.create({
      messages: [
        { role: "system", content: `Analyze this site for US Legal/Tax compliance and technical friction. Errors found: ${auditData.consoleErrors.join(', ')}. Broken Links: ${JSON.stringify(auditData.brokenLinks)}` },
        { role: "user", content: `Content: ${content.slice(0, 2000)}` }
      ],
      model: "llama-3.3-70b-versatile",
    });

    // 4. Save COMPREHENSIVE Data
    await supabase.from('pulse_logs').insert([{ 
      url: target.url, 
      status: auditData.brokenLinks.length > 0 || auditData.consoleErrors.length > 0 ? 'DEGRADED' : 'UP', 
      reasoning: analysis.choices[0].message.content, 
      latency_ms: latency,
      region: target.region,
      metadata: { // Add this column in Supabase
        errors: auditData.consoleErrors,
        broken_links: auditData.brokenLinks,
        pages_scanned: links.length
      }
    }]);

    console.log(`✅ ${target.name} Deep Audit Complete.`);
  } catch (err) {
    console.error(`❌ Audit Failed: ${err.message}`);
  } finally {
    await browser.close();
  }
}

async function run() {
  for (const t of targets) await deepAudit(t);
}
run();
