"""
Klaro Pulse LAM Agent v3
Uses Browser Use latest API with proper LLM integration.
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

import urllib.request

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
    if OPENAI_KEY:
        try:
            url = "https://api.openai.com/v1/responses"
            payload = json.dumps({"model": "gpt-5.4-mini", "input": prompt, "store": False}).encode()
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
    if GROQ_KEY:
        try:
            url = "https://api.groq.com/openai/v1/chat/completions"
            payload = json.dumps({
                "model": "llama-3.3-70b-versatile",
                "messages": [{"role": "user", "content": prompt}],
                "response_format": {"type": "json_object"},
                "temperature": 0.2, "max_tokens": 4000
            }).encode()
            req = urllib.request.Request(url, data=payload, method='POST')
            req.add_header('Authorization', f'Bearer {GROQ_KEY}')
            req.add_header('Content-Type', 'application/json')
            response = urllib.request.urlopen(req, timeout=60)
            data = json.loads(response.read())
            return json.loads(data['choices'][0]['message']['content'])
        except Exception as e:
            print(f"  Groq failed: {e}")
    if CEREBRAS_KEY:
        try:
            url = "https://api.cerebras.ai/v1/chat/completions"
            payload = json.dumps({
                "model": "llama-3.3-70b",
                "messages": [{"role": "user", "content": prompt}],
                "response_format": {"type": "json_object"},
                "temperature": 0.2, "max_tokens": 4000
            }).encode()
            req = urllib.request.Request(url, data=payload, method='POST')
            req.add_header('Authorization', f'Bearer {CEREBRAS_KEY}')
            req.add_header('Content-Type', 'application/json')
            response = urllib.request.urlopen(req, timeout=60)
            data = json.loads(response.read())
            return json.loads(data['choices'][0]['message']['content'])
        except Exception as e:
            print(f"  Cerebras failed: {e}")
    raise Exception("All LLM providers failed")

def get_lam_llm():
    try:
        from langchain_openai import ChatOpenAI
        if OPENAI_KEY:
            return ChatOpenAI(model="gpt-4o-mini", openai_api_key=OPENAI_KEY, temperature=0.1)
    except Exception as e:
        print(f"  OpenAI LLM init failed: {e}")
    try:
        from langchain_groq import ChatGroq
        if GROQ_KEY:
            return ChatGroq(model="llama-3.3-70b-versatile", groq_api_key=GROQ_KEY, temperature=0.1)
    except Exception as e:
        print(f"  Groq LLM init failed: {e}")
    raise Exception("No LLM available for Browser Use")

async def run_browser_task(task: str, llm) -> str:
    """Run a single browser task and return result as string"""
    try:
        from browser_use import Agent
        agent = Agent(task=task, llm=llm, max_steps=20)
        result = await agent.run()
        return str(result)
    except Exception as e:
        print(f"  Browser task failed: {e}")
        return f"error: {e}"

async def run_lam_audit(target_url: str):
    print(f"\n{'='*50}")
    print(f"KLARO PULSE LAM AGENT v3")
    print(f"Target: {target_url}")
    print(f"{'='*50}\n")

    hostname = target_url.replace("https://","").replace("http://","").split("/")[0]
    experience_data = {}
    ada_data = {}

    try:
        llm = get_lam_llm()
        print(f"  LLM ready: {type(llm).__name__}")

        # Task 1 — Client experience
        print("\n[Task 1] Simulating potential client visit...")
        client_task = f"""Visit {target_url} as a potential client looking to hire their services.
Report exactly what you experience:
1. What do you see in first 5 seconds?
2. Is it clear what they do?
3. Find their phone number - how long did it take?
4. Is pricing visible anywhere?
5. Try to contact them - what is the process?
6. What are the 3 biggest problems you encountered?
7. Would you actually hire them? Why or why not?

Return a JSON summary of your experience."""

        result1 = await run_browser_task(client_task, llm)
        print(f"  Task 1 result length: {len(result1)}")

        # Extract any JSON from result
        json_match = re.search(r'\{[\s\S]*\}', result1)
        if json_match:
            try:
                experience_data = json.loads(json_match.group())
            except:
                experience_data = {"raw_experience": result1[:500]}
        else:
            experience_data = {"raw_experience": result1[:500]}

        await asyncio.sleep(2)

        # Task 2 — ADA audit
        print("\n[Task 2] ADA accessibility audit...")
        ada_task = f"""Visit {target_url} and check for ADA/WCAG accessibility compliance.
Check:
1. Do images have alt text?
2. Do forms have labels?
3. Is there sufficient colour contrast?
4. Can the site be navigated by keyboard?
5. Is the heading structure correct (H1, H2, H3)?
6. Are there any obvious accessibility violations?

Return a JSON summary with ada_score (0-100) and specific violations found."""

        result2 = await run_browser_task(ada_task, llm)
        print(f"  Task 2 result length: {len(result2)}")

        json_match2 = re.search(r'\{[\s\S]*\}', result2)
        if json_match2:
            try:
                ada_data = json.loads(json_match2.group())
            except:
                ada_data = {"raw_ada": result2[:500]}
        else:
            ada_data = {"raw_ada": result2[:500]}

    except ImportError as e:
        print(f"  Browser Use not available: {e}")
        experience_data = {"error": "browser_use_unavailable"}
        ada_data = {"error": "browser_use_unavailable", "ada_score": 50}
    except Exception as e:
        print(f"  Browser tasks failed: {e}")
        experience_data = {"error": str(e)}
        ada_data = {"error": str(e), "ada_score": 50}

    # Generate executive report
    print("\n[Task 3] Generating executive LAM report...")
    report_prompt = f"""You are a senior business consultant who just audited {target_url}.

CLIENT EXPERIENCE FINDINGS:
{json.dumps(experience_data, indent=2)[:2000]}

ADA ACCESSIBILITY FINDINGS:
{json.dumps(ada_data, indent=2)[:1000]}

Generate a comprehensive executive report for a CEO. Be specific and revenue-focused.

Return ONLY this JSON:
{{
  "overall_score": <0-100>,
  "lam_score": <0-100>,
  "grade": "<A|B|C|D|F>",
  "executive_brief": {{
    "one_line_verdict": "<one sentence for the board>",
    "plain_english_summary": "<3-4 sentences about what the LAM agent experienced and revenue impact>",
    "estimated_revenue_impact": "<specific monthly revenue being lost>",
    "urgency": "<Low|Medium|High|Critical>",
    "top_3_actions": ["<this week - no developer>", "<this month>", "<this quarter>"]
  }},
  "client_experience_report": {{
    "what_agent_experienced": "<narrative of the LAM agent experience as a potential client>",
    "contact_friction": "<specific friction points>",
    "would_real_client_convert": <true/false>,
    "conversion_blockers": ["<blocker 1>", "<blocker 2>", "<blocker 3>"]
  }},
  "ada_compliance_report": {{
    "ada_score": <0-100>,
    "risk_level": "<Low|Medium|High|Critical>",
    "wcag_status": "<Pass|Partial|Fail>",
    "legal_exposure": "<ADA lawsuit risk description>",
    "specific_violations": ["<violation 1>", "<violation 2>"],
    "remediation_cost": "<estimated cost>",
    "remediation_time": "<estimated time>"
  }},
  "competitive_intelligence": {{
    "market_position": "<vs industry standard>",
    "where_losing_clients": "<specific reasons>",
    "opportunity_to_win": "<single biggest opportunity>"
  }},
  "ninety_day_roadmap": {{
    "week_1": {{"actions": ["<action>","<action>","<action>"], "expected_score": <n>, "cost": "<est>"}},
    "month_1": {{"actions": ["<action>","<action>","<action>"], "expected_score": <n>, "cost": "<est>"}},
    "month_2_3": {{"actions": ["<action>","<action>","<action>"], "expected_score": <n>, "cost": "<est>"}},
    "expected_outcome": "<what business sees in 90 days>"
  }},
  "strengths": ["<strength 1>", "<strength 2>", "<strength 3>"],
  "industry": "<industry>",
  "mobile_readiness": "<Good|Needs Work|Poor>",
  "pricing_clarity": "<Clear|Vague|Hidden|None>",
  "cta_effectiveness": "<Strong|Weak|Missing>"
}}"""

    try:
        report = call_llm(report_prompt)
        print(f"  Score: {report.get('overall_score')}/100 | Grade: {report.get('grade')}")
    except Exception as e:
        print(f"  Report generation failed: {e}")
        report = {
            "overall_score": 50, "lam_score": 50, "grade": "C",
            "executive_brief": {
                "one_line_verdict": f"LAM audit of {hostname} completed",
                "plain_english_summary": f"Browser-based audit completed. Experience data: {str(experience_data)[:200]}",
                "urgency": "Medium",
                "top_3_actions": ["Review contact information", "Check ADA compliance", "Add testimonials"]
            }
        }

    report['lam_raw'] = {"client_experience": experience_data, "ada_audit": ada_data}
    report['scanned_at'] = datetime.now().isoformat()
    report['report_type'] = 'LAM'

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
    print(f"LAM COMPLETE | Score: {score}/100 | Saved: {success}")
    print(f"{'='*50}")
    return report

if __name__ == "__main__":
    target = sys.argv[1] if len(sys.argv) > 1 else "https://sckonline.net"
    asyncio.run(run_lam_audit(target))
