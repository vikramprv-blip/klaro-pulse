"""
Klaro Pulse LAM Agent
Uses Browser Use to act as a real potential client visiting the target site.
Produces a human-experience report — what it's like to actually use the site.
"""
import asyncio
import sys
import json
import os
from datetime import datetime
from dotenv import load_dotenv
load_dotenv()

from supabase import create_client
from browser_use import Agent, Browser
from langchain_google_genai import ChatGoogleGenerativeAI
from langchain_openai import ChatOpenAI
from langchain_groq import ChatGroq

SUPABASE_URL = os.getenv("SUPABASE_URL", "")
SUPABASE_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY", "")
supabase = create_client(SUPABASE_URL, SUPABASE_KEY)

def get_llm():
    """Get best available LLM for Browser Use"""
    if os.getenv("GEMINI_API_KEY"):
        print("  [LAM] Using Gemini 2.0 Flash")
        return ChatGoogleGenerativeAI(
            model="gemini-2.0-flash",
            google_api_key=os.getenv("GEMINI_API_KEY"),
            temperature=0.2
        )
    if os.getenv("OPENAI_API_KEY"):
        print("  [LAM] Using GPT-4o-mini")
        return ChatOpenAI(model="gpt-4o-mini", temperature=0.2)
    if os.getenv("GROQ_API_KEY"):
        print("  [LAM] Using Groq Llama")
        return ChatGroq(model="llama-3.3-70b-versatile", temperature=0.2)
    raise ValueError("No LLM API key found")

async def run_lam_audit(target_url: str):
    print(f"\n[LAM Audit] {target_url}")
    print("Acting as a potential client visiting this site...\n")

    hostname = target_url.replace("https://","").replace("http://","").split("/")[0]

    llm = get_llm()
    browser = Browser()

    # Task 1 — First impression + contact attempt
    task1 = f"""
    You are a potential business client visiting {target_url} for the first time.
    You are looking to hire their services.

    Please do the following and report exactly what happened:
    1. Visit {target_url}
    2. Note your FIRST IMPRESSION in the first 10 seconds — what do you see, is it clear what they do?
    3. Try to find their phone number — how long did it take? Was it visible?
    4. Try to find their pricing — is it shown anywhere?
    5. Try to contact them or book a consultation — what is the process like?
    6. Note any problems you encountered

    Return a detailed JSON report with these exact fields:
    {{
      "first_impression": "what you saw in first 10 seconds",
      "time_to_find_phone": "how long it took or 'not found'",
      "pricing_visible": true/false,
      "pricing_details": "what pricing info was shown or 'none'",
      "contact_process": "describe the contact/booking process",
      "contact_friction": "specific problems encountered trying to contact them",
      "broken_elements": ["list any broken links, errors, non-working elements"],
      "trust_signals": ["list trust signals you saw - testimonials, certifications, etc"],
      "missing_trust_signals": ["important trust signals that were absent"],
      "mobile_issues": "any obvious mobile/responsive issues noticed",
      "overall_experience": "1-2 sentences on the overall experience as a potential client",
      "would_contact": true/false,
      "reason_would_not_contact": "if false, why not"
    }}
    """

    # Task 2 — Competitive comparison
    task2 = f"""
    You are a business analyst. Compare {target_url} with what a high-quality competitor site should look like.

    Visit {target_url} and assess:
    1. How professional does it look vs industry standards?
    2. Is the value proposition clear within 5 seconds?
    3. Are there clear calls-to-action?
    4. How does the navigation feel?

    Return JSON with:
    {{
      "professionalism_score": 0-100,
      "value_prop_clarity": "Clear/Vague/Confusing",
      "cta_quality": "Strong/Weak/Missing",
      "navigation_quality": "Intuitive/Confusing/Broken",
      "page_load_feel": "Fast/Acceptable/Slow",
      "design_quality": "Modern/Dated/Poor",
      "content_quality": "Excellent/Good/Poor",
      "vs_industry_standard": "Above Average/Average/Below Average",
      "key_differentiators": ["what makes them stand out"],
      "critical_gaps": ["what's missing vs competitors"]
    }}
    """

    results = {}

    try:
        print("  Running Task 1: Client experience audit...")
        agent1 = Agent(task=task1, llm=llm, browser=browser)
        result1 = await agent1.run()
        # Extract JSON from result
        result1_text = str(result1)
        json_start = result1_text.find('{')
        json_end = result1_text.rfind('}') + 1
        if json_start >= 0:
            results['client_experience'] = json.loads(result1_text[json_start:json_end])
        print("  Task 1 complete")
    except Exception as e:
        print(f"  Task 1 failed: {e}")
        results['client_experience'] = {"error": str(e)}

    await asyncio.sleep(3)

    try:
        print("  Running Task 2: Competitive analysis...")
        agent2 = Agent(task=task2, llm=llm, browser=browser)
        result2 = await agent2.run()
        result2_text = str(result2)
        json_start = result2_text.find('{')
        json_end = result2_text.rfind('}') + 1
        if json_start >= 0:
            results['competitive_analysis'] = json.loads(result2_text[json_start:json_end])
        print("  Task 2 complete")
    except Exception as e:
        print(f"  Task 2 failed: {e}")
        results['competitive_analysis'] = {"error": str(e)}

    await browser.close()

    # Build final LAM report
    ce = results.get('client_experience', {})
    ca = results.get('competitive_analysis', {})

    lam_report = {
        "report_type": "LAM",
        "scanned_at": datetime.now().isoformat(),
        "target_url": target_url,
        "lam_summary": f"As a potential client, {ce.get('overall_experience', 'the site was evaluated.')} {'Would contact: Yes' if ce.get('would_contact') else 'Would NOT contact: ' + ce.get('reason_would_not_contact', '')}",
        "client_experience": ce,
        "competitive_analysis": ca,
        "lam_score": ca.get('professionalism_score', 50),
        "would_contact": ce.get('would_contact', False),
        "contact_friction": ce.get('contact_friction', ''),
        "critical_gaps": ca.get('critical_gaps', []),
        "broken_elements": ce.get('broken_elements', []),
        "trust_signals_found": ce.get('trust_signals', []),
        "trust_signals_missing": ce.get('missing_trust_signals', []),
    }

    # Save to Supabase
    status = 'UP' if lam_report['lam_score'] >= 75 else 'DEGRADED' if lam_report['lam_score'] >= 50 else 'DOWN'

    result = supabase.table('pulse_logs').insert({
        'url': target_url,
        'status': status,
        'reasoning': lam_report['lam_summary'],
        'metadata': {
            'full_report': lam_report,
            'target_name': hostname,
            'report_version': 'v2_lam',
        }
    }).execute()

    print(f"\n  LAM Score: {lam_report['lam_score']}/100")
    print(f"  Would contact: {lam_report['would_contact']}")
    print(f"  Saved to Supabase: {bool(result.data)}")
    return lam_report

if __name__ == "__main__":
    target = sys.argv[1] if len(sys.argv) > 1 else "https://sckonline.net"
    asyncio.run(run_lam_audit(target))
