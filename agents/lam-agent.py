"""
Klaro Pulse LAM Agent v4
Large Action Model - visits website as a real human potential client.
Covers: Client Experience, All Pages, Signin/Signup test, ADA/WCAG, SOC, Conversion, Competitive Intel.
"""
import asyncio
import sys
import json
import os
import re
from datetime import datetime
from dotenv import load_dotenv
load_dotenv()

SUPABASE_URL = os.getenv("SUPABASE_URL", "")
SUPABASE_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY", "")
OPENAI_KEY = os.getenv("OPENAI_API_KEY", "")
GROQ_KEY = os.getenv("GROQ_API_KEY", "")
CEREBRAS_KEY = os.getenv("CEREBRAS_API_KEY", "")
GEMINI_KEY = os.getenv("GEMINI_API_KEY", "")

import urllib.request

def supabase_insert(data: dict):
    url = f"{SUPABASE_URL}/rest/v1/lam_runs"
    payload = json.dumps(data).encode()
    req = urllib.request.Request(url, data=payload, method='POST')
    req.add_header('apikey', SUPABASE_KEY)
    req.add_header('Authorization', f'Bearer {SUPABASE_KEY}')
    req.add_header('Content-Type', 'application/json')
    req.add_header('Prefer', 'return=representation')
    try:
        response = urllib.request.urlopen(req)
        result = json.loads(response.read())
        return result[0]['id'] if result else True
    except Exception as e:
        print(f"  Supabase error: {e}")
        return False

def supabase_update(run_id: str, data: dict):
    url = f"{SUPABASE_URL}/rest/v1/lam_runs?id=eq.{run_id}"
    payload = json.dumps(data).encode()
    req = urllib.request.Request(url, data=payload, method='PATCH')
    req.add_header('apikey', SUPABASE_KEY)
    req.add_header('Authorization', f'Bearer {SUPABASE_KEY}')
    req.add_header('Content-Type', 'application/json')
    try:
        urllib.request.urlopen(req)
        return True
    except Exception as e:
        print(f"  Supabase update error: {e}")
        return False

def call_llm(prompt: str) -> dict:
    providers = []
    if OPENAI_KEY:
        providers.append(('OpenAI', lambda: _call_openai(prompt)))
    if GROQ_KEY:
        providers.append(('Groq', lambda: _call_groq(prompt)))
    if CEREBRAS_KEY:
        providers.append(('Cerebras', lambda: _call_cerebras(prompt)))
    if GEMINI_KEY:
        providers.append(('Gemini', lambda: _call_gemini(prompt)))
    for name, fn in providers:
        try:
            result = fn()
            if result:
                print(f"  LLM success: {name}")
                return result
        except Exception as e:
            print(f"  {name} failed: {e}")
    raise Exception("All LLM providers failed")

def _call_openai(prompt):
    url = "https://api.openai.com/v1/chat/completions"
    payload = json.dumps({
        "model": "gpt-4o-mini",
        "messages": [{"role": "user", "content": prompt}],
        "response_format": {"type": "json_object"},
        "temperature": 0.2, "max_tokens": 6000
    }).encode()
    req = urllib.request.Request(url, data=payload, method='POST')
    req.add_header('Authorization', f'Bearer {OPENAI_KEY}')
    req.add_header('Content-Type', 'application/json')
    response = urllib.request.urlopen(req, timeout=90)
    data = json.loads(response.read())
    text = data['choices'][0]['message']['content']
    clean = re.sub(r'```json\n?', '', text)
    clean = re.sub(r'```\n?', '', clean).strip()
    return json.loads(clean)

def _call_groq(prompt):
    url = "https://api.groq.com/openai/v1/chat/completions"
    payload = json.dumps({
        "model": "llama-3.3-70b-versatile",
        "messages": [{"role": "user", "content": prompt}],
        "response_format": {"type": "json_object"},
        "temperature": 0.2, "max_tokens": 6000
    }).encode()
    req = urllib.request.Request(url, data=payload, method='POST')
    req.add_header('Authorization', f'Bearer {GROQ_KEY}')
    req.add_header('Content-Type', 'application/json')
    response = urllib.request.urlopen(req, timeout=90)
    data = json.loads(response.read())
    return json.loads(data['choices'][0]['message']['content'])

def _call_cerebras(prompt):
    url = "https://api.cerebras.ai/v1/chat/completions"
    payload = json.dumps({
        "model": "llama-3.3-70b",
        "messages": [{"role": "user", "content": prompt}],
        "response_format": {"type": "json_object"},
        "temperature": 0.2, "max_tokens": 6000
    }).encode()
    req = urllib.request.Request(url, data=payload, method='POST')
    req.add_header('Authorization', f'Bearer {CEREBRAS_KEY}')
    req.add_header('Content-Type', 'application/json')
    response = urllib.request.urlopen(req, timeout=90)
    data = json.loads(response.read())
    return json.loads(data['choices'][0]['message']['content'])

def _call_gemini(prompt):
    url = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key={GEMINI_KEY}"
    payload = json.dumps({
        "contents": [{"parts": [{"text": prompt}]}],
        "generationConfig": {"responseMimeType": "application/json", "temperature": 0.2, "maxOutputTokens": 6000}
    }).encode()
    req = urllib.request.Request(url, data=payload, method='POST')
    req.add_header('Content-Type', 'application/json')
    response = urllib.request.urlopen(req, timeout=90)
    data = json.loads(response.read())
    text = data['candidates'][0]['content']['parts'][0]['text']
    clean = re.sub(r'```json\n?', '', text)
    clean = re.sub(r'```\n?', '', clean).strip()
    return json.loads(clean)

def get_lam_llm():
    try:
        from langchain_openai import ChatOpenAI
        if OPENAI_KEY:
            llm = ChatOpenAI(model="gpt-4o-mini", api_key=OPENAI_KEY, temperature=0.1)
            print(f"  Using OpenAI gpt-4o-mini")
            return llm
    except Exception as e:
        print(f"  OpenAI LLM init failed: {e}")
    try:
        from langchain_groq import ChatGroq
        if GROQ_KEY:
            llm = ChatGroq(model="llama-3.3-70b-versatile", api_key=GROQ_KEY, temperature=0.1)
            print(f"  Using Groq llama-3.3-70b")
            return llm
    except Exception as e:
        print(f"  Groq LLM init failed: {e}")
    try:
        from langchain_google_genai import ChatGoogleGenerativeAI
        if GEMINI_KEY:
            llm = ChatGoogleGenerativeAI(model="gemini-2.0-flash", google_api_key=GEMINI_KEY, temperature=0.1)
            print(f"  Using Gemini 2.0 Flash")
            return llm
    except Exception as e:
        print(f"  Gemini LLM init failed: {e}")
    raise Exception("No LLM available for Browser Use")

async def run_browser_task(task: str, llm, max_steps: int = 25) -> str:
    try:
        from browser_use import Agent, BrowserConfig, Browser
        browser = Browser(config=BrowserConfig(headless=True))
        agent = Agent(task=task, llm=llm, max_steps=max_steps, browser=browser)
        result = await agent.run()
        await browser.close()
        return str(result)
    except TypeError as e:
        if "provider" in str(e) or "attribute" in str(e):
            # Browser Use version mismatch - try alternate init
            try:
                from browser_use import Agent
                agent = Agent(task=task, llm=llm)
                result = await agent.run()
                return str(result)
            except Exception as e2:
                print(f"  Browser task failed (alt): {e2}")
                return f"error: {e2}"
        print(f"  Browser task failed: {e}")
        return f"error: {e}"
    except Exception as e:
        print(f"  Browser task failed: {e}")
        return f"error: {e}"

def extract_json(text: str) -> dict:
    json_match = re.search(r'\{[\s\S]*\}', text)
    if json_match:
        try:
            return json.loads(json_match.group())
        except:
            pass
    return {"raw": text[:800]}

async def run_lam_audit(target_url: str):
    print(f"\n{'='*60}")
    print(f"KLARO PULSE LAM AGENT v4")
    print(f"Target: {target_url}")
    print(f"Started: {datetime.now().isoformat()}")
    print(f"{'='*60}\n")

    hostname = target_url.replace("https://","").replace("http://","").split("/")[0]

    # Data collectors
    pages_visited = []
    experience_data = {}
    ada_data = {}
    soc_data = {}
    signup_data = {}
    conversion_data = {}

    browser_available = True
    try:
        llm = get_lam_llm()
        print(f"  LLM ready: {type(llm).__name__}")
    except Exception as e:
        print(f"  No LLM for browser: {e}")
        browser_available = False

    if browser_available:
        # ── TASK 1: Full site exploration as potential client ──
        print("\n[Task 1/6] Exploring site as a potential client...")
        task1 = f"""You are a potential client visiting {target_url} for the first time.
You are looking to hire or buy from this business. Spend time exploring the site naturally.

Visit these pages in order if they exist:
1. Homepage - what do you see in first 5 seconds?
2. About/Team page - who are these people? Do you trust them?
3. Services/Products page - what do they offer and at what price?
4. Pricing page - is pricing clear or hidden?
5. Contact page - how do you reach them?
6. Blog/Resources - is there useful content?

For EACH page visited, record:
- URL of the page
- What you saw and experienced
- Time spent looking for key information
- Any confusion or friction

Return JSON:
{{
  "pages_visited": [
    {{"url": "", "page_name": "", "first_impression": "", "time_to_find_key_info": "", "friction_points": [], "trust_signals_found": []}}
  ],
  "overall_first_impression": "",
  "time_to_understand_what_they_do": "",
  "found_phone_number": true/false,
  "found_pricing": true/false,
  "found_testimonials": true/false,
  "navigation_clarity": "Clear/Confusing/Broken",
  "would_continue_to_contact": true/false,
  "why_or_why_not": ""
}}"""

        result1 = await run_browser_task(task1, llm, max_steps=30)
        experience_data = extract_json(result1)
        pages_visited = experience_data.get('pages_visited', [])
        print(f"  Pages visited: {len(pages_visited)}")
        await asyncio.sleep(3)

        # ── TASK 2: Contact & conversion attempt ──
        print("\n[Task 2/6] Attempting to contact/convert...")
        task2 = f"""Visit {target_url} and try to become a customer or client.

Attempt ALL of the following:
1. Find and fill in the contact form - what fields are required? Did it submit?
2. Find a phone number - how many clicks did it take?
3. Find an email address - was it visible or hidden?
4. Try to book a consultation or demo if available
5. Try to make a purchase or start a free trial if available
6. Click the main CTA button - where does it take you?

Record exactly what happened at each step. Be specific about errors, timeouts, missing fields.

Return JSON:
{{
  "contact_form": {{"found": true/false, "fields_count": 0, "submitted_successfully": true/false, "error_encountered": "", "time_to_complete_seconds": 0}},
  "phone_number": {{"found": true/false, "clicks_to_find": 0, "number": ""}},
  "email_address": {{"found": true/false, "visible_without_clicking": true/false}},
  "booking_system": {{"found": true/false, "platform": "", "friction_level": "Low/Medium/High"}},
  "purchase_flow": {{"found": true/false, "steps_to_checkout": 0, "issues": []}},
  "main_cta": {{"text": "", "destination": "", "effective": true/false}},
  "conversion_verdict": "",
  "estimated_conversion_rate": "",
  "biggest_conversion_blocker": ""
}}"""

        result2 = await run_browser_task(task2, llm, max_steps=25)
        conversion_data = extract_json(result2)
        print(f"  Conversion data collected")
        await asyncio.sleep(3)

        # ── TASK 3: Signin/Signup experience ──
        print("\n[Task 3/6] Testing signin/signup flow...")
        task3 = f"""Visit {target_url} and test the account creation and login experience.

1. Find the signup/register link - how many clicks from homepage?
2. Start creating an account with test data:
   - Email: test.lam.audit@example.com
   - Name: LAM Test User
   - Company: Test Co
   DO NOT complete the signup - stop before final submission
3. Note every field, every step, every error message
4. Find the signin/login page - how many clicks from homepage?
5. Check if there is SSO (Google, Microsoft, LinkedIn login)
6. Check if there is a password strength indicator
7. Is there a forgot password link?

Return JSON:
{{
  "signup": {{
    "found": true/false,
    "clicks_from_homepage": 0,
    "fields_required": [],
    "steps_in_flow": 0,
    "has_social_login": true/false,
    "social_providers": [],
    "friction_level": "Low/Medium/High",
    "issues_found": [],
    "error_messages_quality": "Clear/Vague/None"
  }},
  "signin": {{
    "found": true/false,
    "clicks_from_homepage": 0,
    "has_forgot_password": true/false,
    "has_remember_me": true/false,
    "has_2fa_option": true/false
  }},
  "auth_overall_score": 0,
  "auth_narrative": ""
}}"""

        result3 = await run_browser_task(task3, llm, max_steps=20)
        signup_data = extract_json(result3)
        print(f"  Auth flow tested")
        await asyncio.sleep(3)

        # ── TASK 4: ADA/WCAG accessibility audit ──
        print("\n[Task 4/6] ADA/WCAG accessibility audit...")
        task4 = f"""Visit {target_url} and conduct a thorough ADA/WCAG 2.1 AA accessibility audit.

Check every page you can access:
1. Images - do they all have meaningful alt text?
2. Forms - do all inputs have visible labels?
3. Color contrast - is text readable against backgrounds?
4. Keyboard navigation - tab through the page, does it work logically?
5. Heading structure - is it H1 > H2 > H3 in correct order?
6. Links - are all links descriptive (not just "click here")?
7. Videos - do they have captions?
8. Focus indicators - can you see where keyboard focus is?
9. Skip navigation - is there a skip to main content link?
10. ARIA labels - are interactive elements properly labeled?
11. Font sizes - is text at least 16px on mobile?
12. Touch targets - are buttons at least 44x44px on mobile?

Return JSON:
{{
  "ada_score": 0,
  "wcag_level": "A/AA/AAA/Fail",
  "critical_violations": [
    {{"issue": "", "location": "", "impact": "Critical/High/Medium/Low", "fix": ""}}
  ],
  "images_without_alt": 0,
  "forms_without_labels": 0,
  "color_contrast_failures": 0,
  "keyboard_navigation": "Works/Partial/Broken",
  "heading_structure": "Correct/Incorrect",
  "focus_indicators": "Visible/Missing",
  "skip_navigation": true/false,
  "aria_labels_present": true/false,
  "mobile_font_sizes": "Adequate/Small",
  "touch_targets": "Adequate/Too Small",
  "legal_risk": "Low/Medium/High/Critical",
  "estimated_remediation_cost": "",
  "estimated_remediation_time": "",
  "ada_narrative": ""
}}"""

        result4 = await run_browser_task(task4, llm, max_steps=25)
        ada_data = extract_json(result4)
        print(f"  ADA score: {ada_data.get('ada_score', 'N/A')}")
        await asyncio.sleep(3)

        # ── TASK 5: SOC & Security public page audit ──
        print("\n[Task 5/6] SOC/Security public page audit...")
        task5 = f"""Visit {target_url} and audit all publicly visible security and compliance signals.

Check without logging in:
1. SSL/HTTPS - is the entire site served over HTTPS?
2. Cookie consent banner - is there one? Does it have accept/reject options?
3. Privacy policy - does it exist? Is it linked in footer? Is it up to date?
4. Terms of service - does it exist?
5. Data processing disclosure - do they mention what data they collect?
6. Third party scripts - look for Google Analytics, Facebook Pixel, Hotjar etc
7. Security headers - check for Content-Security-Policy mentions
8. GDPR compliance signals - right to be forgotten, data portability mentioned?
9. CCPA compliance - California privacy rights mentioned?
10. India DPDP compliance - Indian data protection mentioned?
11. SOC 2 badge or mention - do they claim SOC compliance?
12. Penetration test - any mention of security testing?
13. Uptime/status page - do they have one?
14. Vulnerability disclosure - is there a security.txt or responsible disclosure?

Return JSON:
{{
  "soc_score": 0,
  "https_enforced": true/false,
  "cookie_consent": {{"present": true/false, "has_reject_option": true/false, "gdpr_compliant": true/false}},
  "privacy_policy": {{"present": true/false, "linked_in_footer": true/false, "mentions_data_collection": true/false, "last_updated_visible": true/false}},
  "terms_of_service": {{"present": true/false}},
  "third_party_trackers": [],
  "gdpr_signals": {{"mentioned": true/false, "right_to_erasure": true/false, "data_portability": true/false}},
  "ccpa_signals": {{"mentioned": true/false}},
  "india_dpdp_signals": {{"mentioned": true/false}},
  "soc2_claimed": true/false,
  "security_page": true/false,
  "status_page": true/false,
  "compliance_gaps": [],
  "legal_risk_level": "Low/Medium/High/Critical",
  "soc_narrative": ""
}}"""

        result5 = await run_browser_task(task5, llm, max_steps=20)
        soc_data = extract_json(result5)
        print(f"  SOC score: {soc_data.get('soc_score', 'N/A')}")
        await asyncio.sleep(3)

    else:
        print("  Browser Use unavailable - using LLM-only fallback")
        experience_data = {"error": "browser_unavailable", "raw": "Browser Use not available in this environment"}
        ada_data = {"ada_score": 0, "error": "browser_unavailable"}
        soc_data = {"soc_score": 0, "error": "browser_unavailable"}
        signup_data = {"error": "browser_unavailable"}
        conversion_data = {"error": "browser_unavailable"}

    # ── TASK 6: Generate full executive LAM report ──
    print("\n[Task 6/6] Generating executive LAM report...")

    report_prompt = f"""You are a senior business consultant and digital strategist.
You just spent 2 hours auditing {target_url} as both a potential client AND a technical auditor.

Here is everything your team found:

PAGES VISITED:
{json.dumps(pages_visited, indent=2)[:1500]}

CLIENT EXPERIENCE & FIRST IMPRESSIONS:
{json.dumps(experience_data, indent=2)[:1500]}

CONVERSION & CONTACT ATTEMPT:
{json.dumps(conversion_data, indent=2)[:1500]}

SIGNIN/SIGNUP FLOW TEST:
{json.dumps(signup_data, indent=2)[:1000]}

ADA/WCAG ACCESSIBILITY AUDIT:
{json.dumps(ada_data, indent=2)[:1500]}

SOC/SECURITY/COMPLIANCE AUDIT:
{json.dumps(soc_data, indent=2)[:1500]}

Write a comprehensive executive report. Be specific, revenue-focused, and write the narrative sections in first person as if you personally visited the site.

Return ONLY this JSON:
{{
  "overall_score": <0-100>,
  "lam_score": <0-100>,
  "ada_score": <0-100>,
  "soc_score": <0-100>,
  "conversion_score": <0-100>,
  "auth_score": <0-100>,
  "grade": "<A|B|C|D|F>",
  "executive_brief": {{
    "one_line_verdict": "<one powerful sentence for the board>",
    "plain_english_summary": "<4-5 sentences written as a human consultant — what you experienced, what you found, what it means for their revenue>",
    "estimated_monthly_revenue_lost": "<specific $ amount being lost due to identified issues>",
    "urgency": "<Low|Medium|High|Critical>",
    "top_3_actions": [
      "<action this week — no developer needed>",
      "<action this month — minor dev work>",
      "<action this quarter — strategic investment>"
    ]
  }},
  "visit_narrative": "<Write 3-4 paragraphs in first person describing the full experience of visiting this website as a potential client. Be specific about what you saw, what confused you, what impressed you, and whether you would have become a customer. Mention specific pages visited, specific friction points, and specific moments of trust or distrust.>",
  "pages_audited": [
    {{
      "page": "<page name>",
      "url": "<url>",
      "score": <0-100>,
      "findings": "<what was found on this page>",
      "issues": ["<issue 1>", "<issue 2>"]
    }}
  ],
  "client_experience_report": {{
    "what_agent_experienced": "<detailed narrative>",
    "time_to_understand_business": "<seconds/minutes>",
    "time_to_find_contact": "<seconds/minutes or not found>",
    "contact_form_experience": "<what happened when trying to contact>",
    "would_real_client_convert": <true/false>,
    "conversion_probability": "<0-100%>",
    "conversion_blockers": ["<blocker 1>", "<blocker 2>", "<blocker 3>"],
    "trust_signals_found": ["<signal 1>", "<signal 2>"],
    "trust_signals_missing": ["<missing 1>", "<missing 2>"]
  }},
  "auth_flow_report": {{
    "signup_experience": "<narrative of signup attempt>",
    "signin_experience": "<narrative of signin>",
    "auth_score": <0-100>,
    "issues": ["<issue 1>", "<issue 2>"],
    "has_social_login": <true/false>,
    "recommendations": ["<rec 1>", "<rec 2>"]
  }},
  "ada_compliance_report": {{
    "ada_score": <0-100>,
    "wcag_level_achieved": "<A|AA|AAA|Fail>",
    "risk_level": "<Low|Medium|High|Critical>",
    "legal_exposure": "<ADA lawsuit risk — be specific about US/India exposure>",
    "critical_violations": ["<violation 1>", "<violation 2>", "<violation 3>"],
    "keyboard_navigation": "<Works/Partial/Broken>",
    "screen_reader_compatible": <true/false>,
    "color_contrast_issues": <number>,
    "images_missing_alt": <number>,
    "remediation_cost": "<estimated cost>",
    "remediation_time": "<estimated time>",
    "ada_narrative": "<paragraph about ADA findings>"
  }},
  "soc_compliance_report": {{
    "soc_score": <0-100>,
    "https_enforced": <true/false>,
    "cookie_consent_compliant": <true/false>,
    "privacy_policy_adequate": <true/false>,
    "gdpr_compliant": <true/false>,
    "ccpa_compliant": <true/false>,
    "india_dpdp_compliant": <true/false>,
    "third_party_trackers_found": ["<tracker 1>", "<tracker 2>"],
    "compliance_gaps": ["<gap 1>", "<gap 2>", "<gap 3>"],
    "legal_risk_level": "<Low|Medium|High|Critical>",
    "soc_narrative": "<paragraph about SOC/compliance findings>"
  }},
  "competitive_intelligence": {{
    "industry": "<detected industry>",
    "market_position": "<how they compare to industry standard>",
    "where_losing_clients_to_competitors": "<specific reasons>",
    "biggest_competitive_weakness": "<single biggest weakness>",
    "opportunity_to_win": "<single biggest opportunity>"
  }},
  "ninety_day_roadmap": {{
    "week_1": {{
      "title": "Quick wins — no developer needed",
      "actions": ["<action 1>", "<action 2>", "<action 3>"],
      "expected_score_improvement": <points>,
      "estimated_cost": "<$0-500>"
    }},
    "month_1": {{
      "title": "Conversion fixes",
      "actions": ["<action 1>", "<action 2>", "<action 3>"],
      "expected_score_improvement": <points>,
      "estimated_cost": "<$500-2000>"
    }},
    "month_2_3": {{
      "title": "Strategic improvements",
      "actions": ["<action 1>", "<action 2>", "<action 3>"],
      "expected_score_improvement": <points>,
      "estimated_cost": "<$2000-10000>"
    }},
    "expected_outcome_90_days": "<what the business will look like in 90 days if they follow the roadmap>"
  }},
  "strengths": ["<genuine strength 1>", "<genuine strength 2>", "<genuine strength 3>"],
  "mobile_readiness": "<Good|Needs Work|Poor>",
  "pricing_clarity": "<Clear|Vague|Hidden|None>",
  "cta_effectiveness": "<Strong|Weak|Missing>",
  "load_speed_impression": "<Fast|Acceptable|Slow>",
  "content_quality": "<Excellent|Good|Average|Poor>"
}}"""

    try:
        report = call_llm(report_prompt)
        print(f"  Score: {report.get('overall_score')}/100 | Grade: {report.get('grade')}")
    except Exception as e:
        print(f"  Report generation failed: {e}")
        report = {
            "overall_score": 50, "lam_score": 50, "ada_score": 50, "soc_score": 50,
            "conversion_score": 50, "auth_score": 50, "grade": "C",
            "executive_brief": {
                "one_line_verdict": f"LAM audit of {hostname} completed with limited browser data",
                "plain_english_summary": f"The LAM agent attempted to audit {target_url}. Browser data collection encountered issues. Manual review recommended.",
                "urgency": "Medium",
                "top_3_actions": ["Review contact information visibility", "Check ADA compliance manually", "Add cookie consent banner"]
            },
            "visit_narrative": f"The LAM agent visited {target_url} and attempted a full audit. Some browser tasks encountered errors. The site requires manual follow-up review.",
            "pages_audited": []
        }

    # Attach raw data
    report['lam_raw'] = {
        "experience": experience_data,
        "conversion": conversion_data,
        "signup": signup_data,
        "ada": ada_data,
        "soc": soc_data,
        "pages": pages_visited
    }
    report['scanned_at'] = datetime.now().isoformat()
    report['report_version'] = 'v4'

    score = report.get('overall_score', 50)
    status = 'complete'

    user_id = os.getenv("LAM_USER_ID", None)
    run_id = supabase_insert({
        'url': target_url,
        'user_id': user_id,
        'status': status,
        'overall_score': score,
        'grade': report.get('grade', 'C'),
        'lam_score': report.get('lam_score', score),
        'ada_score': report.get('ada_score', report.get('ada_compliance_report', {}).get('ada_score', 50)),
        'soc_score': report.get('soc_score', report.get('soc_compliance_report', {}).get('soc_score', 50)),
        'executive_brief': report.get('executive_brief', {}),
        'client_experience': report.get('client_experience_report', {}),
        'ada_report': report.get('ada_compliance_report', {}),
        'soc_report': report.get('soc_compliance_report', {}),
        'competitive_intel': report.get('competitive_intelligence', {}),
        'roadmap': report.get('ninety_day_roadmap', {}),
        'strengths': report.get('strengths', []),
        'raw_data': report.get('lam_raw', {}),
        'triggered_by': os.getenv("LAM_TRIGGERED_BY", "manual"),
        'completed_at': datetime.now().isoformat()
    })

    print(f"\n{'='*60}")
    print(f"LAM v4 COMPLETE")
    print(f"Overall: {score}/100 | Grade: {report.get('grade')} | Run ID: {run_id}")
    print(f"ADA: {report.get('ada_score')}/100 | SOC: {report.get('soc_score')}/100")
    print(f"Conversion: {report.get('conversion_score')}/100 | Auth: {report.get('auth_score')}/100")
    print(f"{'='*60}")
    return report

if __name__ == "__main__":
    target = sys.argv[1] if len(sys.argv) > 1 else "https://sckonline.net"
    asyncio.run(run_lam_audit(target))
