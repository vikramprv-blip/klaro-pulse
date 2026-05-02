"""
Klaro Pulse LAM Agent v4
Large Action Model - visits website as a real human potential client.
"""
import asyncio
import sys
import json
import os
import re
import time
from datetime import datetime
from dotenv import load_dotenv
load_dotenv()

SUPABASE_URL = os.getenv("SUPABASE_URL", "")
SUPABASE_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY", "")
OPENAI_KEY = os.getenv("OPENAI_API_KEY", "")
GROQ_KEY = os.getenv("GROQ_API_KEY", "")
CEREBRAS_KEY = os.getenv("CEREBRAS_API_KEY", "")
GEMINI_KEY = os.getenv("GEMINI_API_KEY", "")
DEEPSEEK_KEY = os.getenv("DEEPSEEK_API_KEY", "")
OPENROUTER_KEY = os.getenv("OPENROUTER_API_KEY", "")
SAMBANOVA_KEY = os.getenv("SAMBANOVA_API_KEY", "")
MISTRAL_KEY = os.getenv("MISTRAL_API_KEY", "")
GH_MODELS_KEY = os.getenv("GH_MODELS_KEY", "")

import urllib.request

def clean_json(text):
    text = text.strip()
    lines = text.split("\n")
    if lines and lines[0].startswith("```"):
        lines = lines[1:]
    if lines and lines[-1].strip() == "```":
        lines = lines[:-1]
    return "\n".join(lines).strip()

def supabase_insert(data):
    url = f"{SUPABASE_URL}/rest/v1/lam_runs"
    payload = json.dumps(data).encode()
    req = urllib.request.Request(url, data=payload, method="POST")
    req.add_header("apikey", SUPABASE_KEY)
    req.add_header("Authorization", f"Bearer {SUPABASE_KEY}")
    req.add_header("Content-Type", "application/json")
    req.add_header("Prefer", "return=representation")
    try:
        response = urllib.request.urlopen(req)
        result = json.loads(response.read())
        return result[0]["id"] if result else True
    except Exception as e:
        print(f"  Supabase error: {e}")
        return False

def supabase_update(run_id, data):
    url = f"{SUPABASE_URL}/rest/v1/lam_runs?id=eq.{run_id}"
    payload = json.dumps(data).encode()
    req = urllib.request.Request(url, data=payload, method="PATCH")
    req.add_header("apikey", SUPABASE_KEY)
    req.add_header("Authorization", f"Bearer {SUPABASE_KEY}")
    req.add_header("Content-Type", "application/json")
    try:
        urllib.request.urlopen(req)
        return True
    except Exception as e:
        print(f"  Supabase update error: {e}")
        return False

def call_provider(url, payload, headers):
    req = urllib.request.Request(url, data=json.dumps(payload).encode(), method="POST")
    for k, v in headers.items():
        req.add_header(k, v)
    req.add_header("Content-Type", "application/json")
    response = urllib.request.urlopen(req, timeout=90)
    return json.loads(response.read())

def call_llm(prompt):
    providers = []
    if CEREBRAS_KEY:
        providers.append(("Cerebras", lambda: json.loads(call_provider(
            "https://api.cerebras.ai/v1/chat/completions",
            {"model": "llama-3.3-70b", "messages": [{"role": "user", "content": prompt}], "response_format": {"type": "json_object"}, "temperature": 0.2, "max_tokens": 6000},
            {"Authorization": f"Bearer {CEREBRAS_KEY}"}
        )["choices"][0]["message"]["content"])))
    if SAMBANOVA_KEY:
        providers.append(("SambaNova", lambda: json.loads(clean_json(call_provider(
            "https://api.sambanova.ai/v1/chat/completions",
            {"model": "Meta-Llama-3.3-70B-Instruct", "messages": [{"role": "user", "content": prompt}], "response_format": {"type": "json_schema", "json_schema": {"name": "report", "strict": True, "schema": {"type": "object", "properties": {}, "additionalProperties": True}}}, "temperature": 0.2, "max_tokens": 6000},
            {"Authorization": f"Bearer {SAMBANOVA_KEY}"}
        )["choices"][0]["message"]["content"]))))
    if GROQ_KEY:
        providers.append(("Groq", lambda: json.loads(call_provider(
            "https://api.groq.com/openai/v1/chat/completions",
            {"model": "meta-llama/llama-4-scout-17b-16e-instruct", "messages": [{"role": "user", "content": prompt}], "response_format": {"type": "json_object"}, "temperature": 0.2, "max_tokens": 6000},
            {"Authorization": f"Bearer {GROQ_KEY}"}
        )["choices"][0]["message"]["content"])))
    if MISTRAL_KEY:
        mk = MISTRAL_KEY
        providers.append(("Mistral", lambda mk=mk: json.loads(call_provider(
            "https://api.mistral.ai/v1/chat/completions",
            {"model": "mistral-large-latest", "messages": [{"role": "user", "content": prompt}], "response_format": {"type": "json_object"}, "temperature": 0.2, "max_tokens": 6000},
            {"Authorization": f"Bearer {mk}"}
        )["choices"][0]["message"]["content"])))
    if DEEPSEEK_KEY:
        providers.append(("DeepSeek", lambda: json.loads(call_provider(
            "https://api.deepseek.com/chat/completions",
            {"model": "deepseek-chat", "messages": [{"role": "user", "content": prompt}], "response_format": {"type": "json_object"}, "temperature": 0.2, "max_tokens": 6000},
            {"Authorization": f"Bearer {DEEPSEEK_KEY}"}
        )["choices"][0]["message"]["content"])))
    if OPENROUTER_KEY:
        providers.append(("OpenRouter", lambda: json.loads(clean_json(call_provider(
            "https://openrouter.ai/api/v1/chat/completions",
            {"model": "meta-llama/llama-3.3-70b-instruct", "messages": [{"role": "user", "content": prompt}], "response_format": {"type": "json_object"}, "temperature": 0.2, "max_tokens": 6000},
            {"Authorization": f"Bearer {OPENROUTER_KEY}"}
        )["choices"][0]["message"]["content"]))))
    if GH_MODELS_KEY:
        gk = GH_MODELS_KEY
        providers.append(("GitHubModels", lambda gk=gk: json.loads(call_provider(
            "https://models.inference.ai.azure.com/chat/completions",
            {"model": "gpt-4.1-mini", "messages": [{"role": "user", "content": prompt}], "response_format": {"type": "json_object"}, "temperature": 0.2, "max_tokens": 6000},
            {"Authorization": f"Bearer {gk}"}
        )["choices"][0]["message"]["content"])))
    if OPENAI_KEY:
        providers.append(("OpenAI", lambda: json.loads(call_provider(
            "https://api.openai.com/v1/chat/completions",
            {"model": "gpt-4o-mini", "messages": [{"role": "user", "content": prompt}], "response_format": {"type": "json_object"}, "temperature": 0.2, "max_tokens": 6000},
            {"Authorization": f"Bearer {OPENAI_KEY}"}
        )["choices"][0]["message"]["content"])))
    for name, fn in providers:
        try:
            result = fn()
            if result:
                print(f"  LLM success: {name}")
                return result
        except Exception as e:
            print(f"  {name} failed: {e}")
            time.sleep(2)
    raise Exception("All LLM providers failed")

def get_lam_llm():
    """
    Browser-Use LLM - uses langchain_groq.ChatGroq which has .provider attribute
    compatible with browser-use. Groq is fast, free, and works natively.
    """
    # 1. Groq with llama-3.3-70b — native browser-use .provider support
    try:
        from langchain_groq import ChatGroq
        if GROQ_KEY:
            os.environ["GROQ_API_KEY"] = GROQ_KEY
            llm = ChatGroq(model="llama-3.3-70b-versatile", temperature=0.2, max_tokens=4000)
            print("  Using Groq llama-3.3-70b-versatile for Browser Use")
            return llm
    except Exception as e:
        print(f"  Groq 3.3-70b failed: {e}")
    # 2. Groq smaller model
    try:
        from langchain_groq import ChatGroq
        if GROQ_KEY:
            llm = ChatGroq(model="llama-3.1-8b-instant", temperature=0.2)
            print("  Using Groq llama-3.1-8b-instant for Browser Use")
            return llm
    except Exception as e:
        print(f"  Groq 3.1-8b failed: {e}")
    # 3. OpenAI fallback
    try:
        from langchain_openai import ChatOpenAI
        if OPENAI_KEY:
            os.environ["OPENAI_API_KEY"] = OPENAI_KEY
            llm = ChatOpenAI(model="gpt-4o-mini", temperature=0.2)
            print("  Using OpenAI gpt-4o-mini for Browser Use")
            return llm
    except Exception as e:
        print(f"  OpenAI failed: {e}")
    raise Exception("No LLM available — set GROQ_API_KEY")

def extract_json(text):
    try:
        return json.loads(clean_json(text))
    except:
        pass
    match = re.search(r"\{[\s\S]*\}", text)
    if match:
        try:
            return json.loads(match.group())
        except:
            pass
    return {"raw": text[:800]}

async def run_browser_task(task, llm, max_steps=25):
    try:
        from browser_use import Agent
        agent = Agent(task=task, llm=llm, max_steps=max_steps)
        result = await agent.run()
        return str(result)
    except Exception as e:
        print(f"  Browser task failed: {e}")
        return f"error: {e}"

async def run_lam_audit(target_url):
    print(f"\n" + "="*60)
    print(f"KLARO PULSE LAM AGENT v4")
    print(f"Target: {target_url}")
    print(f"Started: {datetime.now().isoformat()}")
    print("="*60 + "\n")

    hostname = target_url.replace("https://","").replace("http://","").split("/")[0]
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
        print("\n[Task 1/6] Exploring site as a potential client...")
        task1 = f"""Visit {target_url} as a potential client. Explore homepage, about, services, pricing, contact pages.
For each page record: url, page_name, first_impression, friction_points, trust_signals_found.
Also record: overall_first_impression, found_phone_number, found_pricing, found_testimonials, navigation_clarity, would_continue_to_contact, why_or_why_not.
Return as JSON object."""
        result1 = await run_browser_task(task1, llm, 30)
        experience_data = extract_json(result1)
        pages_visited = experience_data.get("pages_visited", [])
        print(f"  Pages visited: {len(pages_visited)}")
        await asyncio.sleep(10)

        print("\n[Task 2/6] Attempting to contact/convert...")
        task2 = f"""Visit {target_url} and try to become a customer. Find and attempt: contact form, phone number, email, booking system, main CTA.
Return JSON with: contact_form, phone_number, email_address, booking_system, main_cta, conversion_verdict, biggest_conversion_blocker."""
        result2 = await run_browser_task(task2, llm, 25)
        conversion_data = extract_json(result2)
        print("  Conversion data collected")
        await asyncio.sleep(10)

        print("\n[Task 3/6] Testing signin/signup flow...")
        task3 = f"""Visit {target_url} and test account creation and login. Find signup and signin pages. Note all fields, steps, errors, social login options.
DO NOT complete signup. Return JSON with: signup object, signin object, auth_overall_score, auth_narrative."""
        result3 = await run_browser_task(task3, llm, 20)
        signup_data = extract_json(result3)
        print("  Auth flow tested")
        await asyncio.sleep(10)

        print("\n[Task 4/6] ADA/WCAG accessibility audit...")
        task4 = f"""Visit {target_url} and conduct ADA/WCAG 2.1 AA audit. Check: alt text, form labels, color contrast, keyboard navigation, heading structure, focus indicators, skip navigation, ARIA labels, font sizes, touch targets.
Return JSON with: ada_score, wcag_level, critical_violations array, specific counts, legal_risk, remediation estimates, ada_narrative."""
        result4 = await run_browser_task(task4, llm, 25)
        ada_data = extract_json(result4)
        print(f"  ADA score: {ada_data.get('ada_score', 'N/A')}")
        await asyncio.sleep(10)

        print("\n[Task 5/6] SOC/Security public page audit...")
        task5 = f"""Visit {target_url} and audit public security and compliance signals. Check: HTTPS, cookie consent, privacy policy, terms of service, third party trackers, GDPR/CCPA/India DPDP signals, SOC2 claims, security page, status page.
Return JSON with: soc_score, https_enforced, cookie_consent, privacy_policy, gdpr_signals, ccpa_signals, india_dpdp_signals, third_party_trackers, compliance_gaps, legal_risk_level, soc_narrative."""
        result5 = await run_browser_task(task5, llm, 20)
        soc_data = extract_json(result5)
        print(f"  SOC score: {soc_data.get('soc_score', 'N/A')}")
        await asyncio.sleep(10)

    else:
        experience_data = {"error": "browser_unavailable"}
        ada_data = {"ada_score": 0, "error": "browser_unavailable"}
        soc_data = {"soc_score": 0, "error": "browser_unavailable"}
        signup_data = {"error": "browser_unavailable"}
        conversion_data = {"error": "browser_unavailable"}

    print("\n[Task 6/6] Generating executive LAM report...")
    report_prompt = f"""You are a senior business consultant who just audited {target_url}.

PAGES VISITED: {json.dumps(pages_visited)[:1000]}
CLIENT EXPERIENCE: {json.dumps(experience_data)[:1000]}
CONVERSION DATA: {json.dumps(conversion_data)[:1000]}
SIGNIN/SIGNUP: {json.dumps(signup_data)[:800]}
ADA AUDIT: {json.dumps(ada_data)[:1000]}
SOC AUDIT: {json.dumps(soc_data)[:1000]}

Return ONLY a JSON object with these exact keys:
overall_score (0-100), lam_score (0-100), ada_score (0-100), soc_score (0-100), conversion_score (0-100), auth_score (0-100), grade (A/B/C/D/F),
executive_brief (object with: one_line_verdict, plain_english_summary, estimated_monthly_revenue_lost, urgency, top_3_actions array),
visit_narrative (3-4 paragraph string in first person describing the full visit experience),
pages_audited (array of objects with: page, url, score, findings, issues array),
client_experience_report (object with: what_agent_experienced, time_to_understand_business, time_to_find_contact, contact_form_experience, would_real_client_convert, conversion_probability, conversion_blockers array, trust_signals_found array, trust_signals_missing array),
auth_flow_report (object with: signup_experience, signin_experience, auth_score, issues array, has_social_login, recommendations array),
ada_compliance_report (object with: ada_score, wcag_level_achieved, risk_level, legal_exposure, critical_violations array, keyboard_navigation, screen_reader_compatible, color_contrast_issues, images_missing_alt, remediation_cost, remediation_time, ada_narrative),
soc_compliance_report (object with: soc_score, https_enforced, cookie_consent_compliant, privacy_policy_adequate, gdpr_compliant, ccpa_compliant, india_dpdp_compliant, third_party_trackers_found array, compliance_gaps array, legal_risk_level, soc_narrative),
competitive_intelligence (object with: industry, market_position, where_losing_clients_to_competitors, biggest_competitive_weakness, opportunity_to_win),
ninety_day_roadmap (object with: week_1, month_1, month_2_3 each having title/actions array/expected_score_improvement/estimated_cost, plus expected_outcome_90_days),
strengths (array), mobile_readiness, pricing_clarity, cta_effectiveness, load_speed_impression, content_quality"""

    try:
        report = call_llm(report_prompt)
        print(f"  Score: {report.get('overall_score')}/100 | Grade: {report.get('grade')}")
    except Exception as e:
        print(f"  Report generation failed: {e}")
        report = {
            "overall_score": 50, "lam_score": 50, "ada_score": 50,
            "soc_score": 50, "conversion_score": 50, "auth_score": 50, "grade": "C",
            "executive_brief": {
                "one_line_verdict": f"LAM audit of {hostname} completed with limited data",
                "plain_english_summary": f"The LAM agent visited {target_url}. Some tasks encountered errors. Manual review recommended.",
                "urgency": "Medium",
                "top_3_actions": ["Review contact information", "Check ADA compliance", "Add cookie consent"]
            },
            "visit_narrative": f"The LAM agent visited {target_url} and conducted a partial audit.",
            "pages_audited": []
        }

    report["lam_raw"] = {"experience": experience_data, "conversion": conversion_data, "signup": signup_data, "ada": ada_data, "soc": soc_data, "pages": pages_visited}
    report["scanned_at"] = datetime.now().isoformat()
    report["report_version"] = "v4"

    score = report.get("overall_score", 50)
    user_id = os.getenv("LAM_USER_ID", None)

    existing_run_id = None
    try:
        import urllib.parse
        encoded_url = urllib.parse.quote(target_url, safe='')
        check_url = f"{SUPABASE_URL}/rest/v1/lam_runs?url=eq.{encoded_url}&status=eq.pending&order=created_at.desc&limit=1"
        check_req = urllib.request.Request(check_url)
        check_req.add_header("apikey", SUPABASE_KEY)
        check_req.add_header("Authorization", f"Bearer {SUPABASE_KEY}")
        resp = urllib.request.urlopen(check_req)
        runs = json.loads(resp.read())
        if runs and len(runs) > 0:
            existing_run_id = runs[0]['id']
            print(f"  Found existing pending run: {existing_run_id}")
    except Exception as e:
        print(f"  Could not check existing runs: {e}")

    result_data = {
        "status": "complete",
        "overall_score": score,
        "grade": report.get("grade", "C"),
        "lam_score": report.get("lam_score", score),
        "ada_score": report.get("ada_score", 50),
        "soc_score": report.get("soc_score", 50),
        "executive_brief": report.get("executive_brief", {}),
        "client_experience": report.get("client_experience_report", {}),
        "ada_report": report.get("ada_compliance_report", {}),
        "soc_report": report.get("soc_compliance_report", {}),
        "competitive_intel": report.get("competitive_intelligence", {}),
        "roadmap": report.get("ninety_day_roadmap", {}),
        "strengths": report.get("strengths", []),
        "raw_data": report.get("lam_raw", {}),
        "triggered_by": os.getenv("LAM_TRIGGERED_BY", "manual"),
        "completed_at": datetime.now().isoformat()
    }

    if existing_run_id:
        run_id = existing_run_id
        supabase_update(run_id, result_data)
    else:
        run_id = supabase_insert({
            "url": target_url,
            "user_id": user_id,
            **result_data
        })

    print("\n" + "="*60)
    print(f"LAM v4 COMPLETE")
    print(f"Overall: {score}/100 | Grade: {report.get('grade')} | Run ID: {run_id}")
    print(f"ADA: {report.get('ada_score')}/100 | SOC: {report.get('soc_score')}/100")
    print(f"Conversion: {report.get('conversion_score')}/100 | Auth: {report.get('auth_score')}/100")
    print(f"LLM chain: Cerebras -> SambaNova -> Groq -> OpenAI")
    print("="*60)
    return report

if __name__ == "__main__":
    target = sys.argv[1] if len(sys.argv) > 1 else "https://sckonline.net"
    asyncio.run(run_lam_audit(target))
