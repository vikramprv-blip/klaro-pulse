"""
Klaro Pulse LAM Agent v2
Acts as a real potential client to audit UX, ADA compliance, and conversion barriers.
Uses Browser Use + GPT-5.4-mini to produce human-experience intelligence reports.
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

# Supabase client
import urllib.request
import urllib.error

def supabase_insert(data: dict):
    url = f"{SUPABASE_URL}/rest/v1/pulse_logs"
    payload = json.dumps(data).encode()
    req = urllib.request.Request(url, data=payload, method='POST')
    req.add_header('apikey', SUPABASE_KEY)
    req.add_header('Authorization', f'Bearer {SUPABASE_KEY}')
    req.add_header('Content-Type', 'application/json')
    req.add_header('Prefer', 'return=minimal')
    try:
        urllib.request.urlopen(req)
        return True
    except Exception as e:
        print(f"  Supabase error: {e}")
        return False

def call_llm(prompt: str) -> dict:
    """Call best available LLM"""
    # Try OpenAI first
    if OPENAI_KEY:
        try:
            url = "https://api.openai.com/v1/responses"
            payload = json.dumps({
                "model": "gpt-5.4-mini",
                "input": prompt,
                "store": False
            }).encode()
            req = urllib.request.Request(url, data=payload, method='POST')
            req.add_header('Authorization', f'Bearer {OPENAI_KEY}')
            req.add_header('Content-Type', 'application/json')
            response = urllib.request.urlopen(req, timeout=60)
            data = json.loads(response.read())
            text = data.get('output', [{}])[0].get('content', [{}])[0].get('text', '')
            if text:
                clean = re.sub(r'```json\n?', '', text)
                clean = re.sub(r'```\n?', '', clean).strip()
                return json.loads(clean)
        except Exception as e:
            print(f"  OpenAI failed: {e}")

    # Fallback to Groq
    if GROQ_KEY:
        try:
            url = "https://api.groq.com/openai/v1/chat/completions"
            payload = json.dumps({
                "model": "llama-3.3-70b-versatile",
                "messages": [{"role": "user", "content": prompt}],
                "response_format": {"type": "json_object"},
                "temperature": 0.2,
                "max_tokens": 4000
            }).encode()
            req = urllib.request.Request(url, data=payload, method='POST')
            req.add_header('Authorization', f'Bearer {GROQ_KEY}')
            req.add_header('Content-Type', 'application/json')
            response = urllib.request.urlopen(req, timeout=60)
            data = json.loads(response.read())
            return json.loads(data['choices'][0]['message']['content'])
        except Exception as e:
            print(f"  Groq failed: {e}")

    raise Exception("All LLM providers failed")

async def run_lam_audit(target_url: str):
    print(f"\n{'='*50}")
    print(f"KLARO PULSE LAM AGENT")
    print(f"Target: {target_url}")
    print(f"{'='*50}\n")

    hostname = target_url.replace("https://","").replace("http://","").split("/")[0]

    try:
        from browser_use import Agent, Browser
        from langchain_openai import ChatOpenAI
        from langchain_groq import ChatGroq

        # Get best LLM for Browser Use
        if OPENAI_KEY:
            llm = ChatOpenAI(model="gpt-4o-mini", api_key=OPENAI_KEY, temperature=0.1)
            print("  [LAM] Browser agent using GPT-4o-mini")
        elif GROQ_KEY:
            llm = ChatGroq(model="llama-3.3-70b-versatile", api_key=GROQ_KEY, temperature=0.1)
            print("  [LAM] Browser agent using Groq Llama")
        else:
            raise Exception("No LLM key available for Browser Use")

        browser = Browser()
        experience_data = {}
        ada_data = {}

        # TASK 1 — Potential client experience
        print("\n[Task 1] Acting as potential client...")
        client_task = f"""
You are a potential client visiting {target_url} for the first time, looking to hire their services.
Do these steps and record exactly what happened at each step:

1. Go to {target_url}
2. What do you see in the first 5 seconds? Is it immediately clear what they do and who they serve?
3. Look for a phone number — time yourself. How many seconds did it take? Where was it?
4. Look for pricing information — is it shown anywhere on the site?
5. Try to contact them or start a consultation booking — go through the full process
6. Note every moment of confusion, friction, or frustration
7. Would you actually contact this firm? Why or why not?

Be brutally honest. Report as a real person, not an AI.

Return ONLY this JSON:
{{
  "first_5_seconds": "exactly what you saw",
  "value_prop_clear": true/false,
  "phone_found": true/false,
  "phone_seconds": number or null,
  "phone_location": "where it was or not found",
  "pricing_visible": true/false,
  "pricing_detail": "what pricing info exists or none",
  "contact_attempted": true/false,
  "contact_steps": ["step 1", "step 2", "step 3"],
  "contact_friction_points": ["specific frustration 1", "specific frustration 2"],
  "would_contact": true/false,
  "reason": "honest reason why or why not",
  "overall_experience_score": 0-10,
  "standout_problems": ["the 3 most critical problems found"],
  "standout_strengths": ["what actually works well"]
}}
"""
        try:
            agent1 = Agent(task=client_task, llm=llm, browser=browser, max_steps=15)
            result1 = await agent1.run()
            result1_text = str(result1)
            json_match = re.search(r'\{[\s\S]*\}', result1_text)
            if json_match:
                experience_data = json.loads(json_match.group())
                print(f"  Client experience score: {experience_data.get('overall_experience_score')}/10")
                print(f"  Would contact: {experience_data.get('would_contact')}")
        except Exception as e:
            print(f"  Task 1 failed: {e}")
            experience_data = {"error": str(e), "overall_experience_score": 5}

        await asyncio.sleep(3)

        # TASK 2 — ADA/Accessibility audit
        print("\n[Task 2] ADA accessibility audit...")
        ada_task = f"""
You are an ADA accessibility compliance auditor checking {target_url}.
Check these specific items and report findings:

1. Navigate to {target_url}
2. Check if all images have descriptive alt text (right-click inspect a few images)
3. Check if form fields have proper labels
4. Check if there is sufficient colour contrast (text vs background)
5. Check if the site can be navigated with keyboard only (Tab key)
6. Check heading structure (H1, H2, H3 hierarchy)
7. Check if there are skip navigation links
8. Look for ARIA labels on interactive elements
9. Check if videos have captions
10. Check if error messages are descriptive

Return ONLY this JSON:
{{
  "images_have_alt_text": true/false,
  "alt_text_quality": "Good/Partial/Missing",
  "forms_have_labels": true/false,
  "colour_contrast_adequate": true/false,
  "keyboard_navigable": true/false,
  "heading_structure_correct": true/false,
  "skip_nav_links": true/false,
  "aria_labels_present": true/false,
  "wcag_aa_estimate": "Pass/Partial/Fail",
  "ada_risk_level": "Low/Medium/High/Critical",
  "specific_violations": ["violation 1", "violation 2", "violation 3"],
  "legal_exposure": "description of ADA lawsuit risk",
  "ada_score": 0-100,
  "quick_fixes": ["fix that takes 1 hour", "fix that takes 1 day"]
}}
"""
        try:
            agent2 = Agent(task=ada_task, llm=llm, browser=browser, max_steps=15)
            result2 = await agent2.run()
            result2_text = str(result2)
            json_match2 = re.search(r'\{[\s\S]*\}', result2_text)
            if json_match2:
                ada_data = json.loads(json_match2.group())
                print(f"  ADA score: {ada_data.get('ada_score')}/100")
                print(f"  Risk level: {ada_data.get('ada_risk_level')}")
        except Exception as e:
            print(f"  Task 2 failed: {e}")
            ada_data = {"error": str(e), "ada_score": 50, "ada_risk_level": "Unknown"}

        await browser.close()

    except ImportError:
        print("  Browser Use not available — using lightweight audit")
        experience_data = {"error": "browser_use_unavailable", "overall_experience_score": 5}
        ada_data = {"error": "browser_use_unavailable", "ada_score": 50}

    # TASK 3 — Generate executive LAM report using LLM
    print("\n[Task 3] Generating executive LAM report...")

    report_prompt = f"""
You are a senior business intelligence consultant.
You have just completed a human-experience audit of {target_url}.

CLIENT EXPERIENCE DATA:
{json.dumps(experience_data, indent=2)}

ADA ACCESSIBILITY DATA:
{json.dumps(ada_data, indent=2)}

Generate a comprehensive executive report. Be specific, commercial, and CEO-focused.

Return ONLY this JSON:
{{
  "overall_score": 0-100,
  "lam_score": 0-100,
  "grade": "A/B/C/D/F",
  "executive_brief": {{
    "one_line_verdict": "single sentence a CEO would tell their board",
    "plain_english_summary": "3-4 sentences. What did the LAM agent experience? What is the revenue impact?",
    "estimated_revenue_impact": "specific estimate of monthly revenue being lost",
    "urgency": "Low/Medium/High/Critical",
    "top_3_actions": [
      "most important action this week - no developer needed",
      "second action this month",
      "third action this quarter"
    ]
  }},
  "client_experience_report": {{
    "what_agent_experienced": "narrative of what the LAM agent experienced as a potential client",
    "time_to_find_contact": "seconds or not found",
    "contact_friction": "specific friction points encountered",
    "would_real_client_convert": true/false,
    "conversion_blockers": ["blocker 1", "blocker 2", "blocker 3"]
  }},
  "ada_compliance_report": {{
    "ada_score": 0-100,
    "risk_level": "Low/Medium/High/Critical",
    "wcag_status": "Pass/Partial/Fail",
    "legal_exposure": "description of lawsuit risk",
    "specific_violations": ["violation 1", "violation 2"],
    "remediation_cost": "estimated cost to fix",
    "remediation_time": "estimated time to fix"
  }},
  "competitive_intelligence": {{
    "market_position": "how this site compares to industry standard",
    "where_losing_clients": "specific reasons",
    "opportunity_to_win": "the one thing that would change everything"
  }},
  "ninety_day_roadmap": {{
    "week_1": {{
      "actions": ["action 1", "action 2", "action 3"],
      "expected_score": 0-100,
      "cost": "estimated cost"
    }},
    "month_1": {{
      "actions": ["action 1", "action 2", "action 3"],
      "expected_score": 0-100,
      "cost": "estimated cost"
    }},
    "month_2_3": {{
      "actions": ["action 1", "action 2", "action 3"],
      "expected_score": 0-100,
      "cost": "estimated cost"
    }},
    "expected_outcome": "what the business should see after 90 days"
  }},
  "strengths": ["strength 1", "strength 2", "strength 3"],
  "industry": "detected industry",
  "mobile_readiness": "Good/Needs Work/Poor",
  "pricing_clarity": "Clear/Vague/Hidden/None",
  "cta_effectiveness": "Strong/Weak/Missing"
}}
"""

    try:
        report = call_llm(report_prompt)
        print(f"  Overall score: {report.get('overall_score')}/100")
        print(f"  LAM score: {report.get('lam_score')}/100")
        print(f"  Grade: {report.get('grade')}")
    except Exception as e:
        print(f"  Report generation failed: {e}")
        report = {
            "overall_score": 50,
            "lam_score": experience_data.get('overall_experience_score', 5) * 10,
            "grade": "C",
            "executive_brief": {
                "one_line_verdict": "LAM audit completed with partial data",
                "plain_english_summary": str(experience_data),
                "urgency": "Medium",
                "top_3_actions": ["Review contact information visibility", "Check ADA compliance", "Add testimonials"]
            }
        }

    # Add raw data to report
    report['lam_raw'] = {
        "client_experience": experience_data,
        "ada_audit": ada_data,
    }
    report['scanned_at'] = datetime.now().isoformat()
    report['report_type'] = 'LAM'

    # Save to Supabase
    score = report.get('overall_score', 50)
    status = 'UP' if score >= 75 else 'DEGRADED' if score >= 50 else 'DOWN'

    success = supabase_insert({
        'url': target_url,
        'status': status,
        'reasoning': report.get('executive_brief', {}).get('plain_english_summary', ''),
        'metadata': {
            'full_report': report,
            'target_name': hostname,
            'report_version': 'v3_lam',
        }
    })

    print(f"\n{'='*50}")
    print(f"LAM AUDIT COMPLETE")
    print(f"Score: {score}/100 | Status: {status}")
    print(f"Saved to Supabase: {success}")
    print(f"{'='*50}")
    return report

if __name__ == "__main__":
    target = sys.argv[1] if len(sys.argv) > 1 else "https://sckonline.net"
    asyncio.run(run_lam_audit(target))
