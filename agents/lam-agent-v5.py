"""
Klaro Pulse LAM Agent v5
Pure Playwright — no browser-use dependency.
Visits website as a real human client using Chromium directly.
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
GROQ_KEY = os.getenv("GROQ_API_KEY", "")
CEREBRAS_KEY = os.getenv("CEREBRAS_API_KEY", "")
OPENAI_KEY = os.getenv("OPENAI_API_KEY", "")

import urllib.parse
import requests as req_lib

def supabase_request(method, path, data=None):
    url = f"{SUPABASE_URL}/rest/v1/{path}"
    headers = {
        "apikey": SUPABASE_KEY,
        "Authorization": f"Bearer {SUPABASE_KEY}",
        "Content-Type": "application/json",
        "Prefer": "return=representation"
    }
    try:
        r = req_lib.request(method, url, headers=headers, json=data, timeout=15)
        if r.status_code in [200, 201]:
            return r.json()
        elif r.status_code == 204:
            return True
        else:
            print(f"  Supabase {method} {r.status_code}: {r.text[:200]}")
            return None
    except Exception as e:
        print(f"  Supabase {method} error: {e}")
        return None

def supabase_insert(data):
    result = supabase_request("POST", "lam_runs", data)
    if result and len(result) > 0:
        return result[0].get("id")
    return None

def supabase_update(run_id, data):
    path = f"lam_runs?id=eq.{run_id}"
    supabase_request("PATCH", path, data)

def call_llm(prompt: str, system: str = "") -> str:
    """Call LLM using official SDKs — bypasses WAF blocks on urllib"""
    messages = []
    if system:
        messages.append({"role": "system", "content": system})
    messages.append({"role": "user", "content": prompt})

    # 1. Groq SDK
    if GROQ_KEY:
        try:
            from groq import Groq
            client = Groq(api_key=GROQ_KEY)
            r = client.chat.completions.create(
                model="llama-3.3-70b-versatile",
                messages=messages,
                response_format={"type": "json_object"},
                temperature=0.2,
                max_tokens=4000
            )
            print("  LLM: Groq llama-3.3-70b")
            return r.choices[0].message.content
        except Exception as e:
            print(f"  Groq SDK failed: {e}")

    # 2. OpenAI SDK
    if OPENAI_KEY:
        try:
            from openai import OpenAI
            client = OpenAI(api_key=OPENAI_KEY)
            r = client.chat.completions.create(
                model="gpt-4o-mini",
                messages=messages,
                response_format={"type": "json_object"},
                temperature=0.2,
                max_tokens=4000
            )
            print("  LLM: OpenAI gpt-4o-mini")
            return r.choices[0].message.content
        except Exception as e:
            print(f"  OpenAI SDK failed: {e}")

    # 3. Cerebras via requests library
    if CEREBRAS_KEY:
        try:
            import requests
            r = requests.post(
                "https://api.cerebras.ai/v1/chat/completions",
                headers={"Authorization": f"Bearer {CEREBRAS_KEY}", "Content-Type": "application/json"},
                json={"model": "llama-3.3-70b", "messages": messages, "response_format": {"type": "json_object"}, "temperature": 0.2, "max_tokens": 4000},
                timeout=30
            )
            r.raise_for_status()
            print("  LLM: Cerebras llama-3.3-70b")
            return r.json()["choices"][0]["message"]["content"]
        except Exception as e:
            print(f"  Cerebras failed: {e}")

    return "{}"

def extract_json(text):
    if not text:
        return {}
    try:
        return json.loads(text)
    except:
        match = re.search(r'\{.*\}', text, re.DOTALL)
        if match:
            try:
                return json.loads(match.group())
            except:
                pass
    return {}

async def browse_site(target_url: str) -> dict:
    """Visit site with real Playwright browser - deep multi-page audit"""
    from playwright.async_api import async_playwright
    from urllib.parse import urljoin, urlparse

    base_domain = urlparse(target_url).netloc

    data = {
        "pages": [],
        "has_contact_form": False,
        "has_phone": False,
        "has_email": False,
        "has_pricing": False,
        "has_testimonials": False,
        "has_cookie_banner": False,
        "has_privacy_policy": False,
        "has_terms": False,
        "has_ssl": target_url.startswith("https://"),
        "has_login": False,
        "has_signup": False,
        "nav_links": [],
        "cta_buttons": [],
        "page_texts": {},
        "load_time_ms": 0,
        "form_fields": [],
        "third_party_scripts": [],
        "mobile_viewport_issues": [],
        "errors": []
    }

    async with async_playwright() as p:
        browser = await p.chromium.launch(
            headless=True,
            args=["--no-sandbox", "--disable-setuid-sandbox", "--disable-dev-shm-usage"]
        )

        # Desktop context
        context = await browser.new_context(
            viewport={"width": 1280, "height": 800},
            user_agent="Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
        )
        page = await context.new_page()

        visited_urls = set()

        async def analyse_page(url, label):
            """Visit and analyse a single page"""
            if url in visited_urls:
                return
            visited_urls.add(url)
            try:
                print(f"    Visiting: {label} — {url}")
                start = time.time()
                await page.goto(url, wait_until="domcontentloaded", timeout=25000)
                await page.wait_for_timeout(2000)  # Let JS render
                load_ms = int((time.time() - start) * 1000)

                content = await page.content()
                text = await page.evaluate("() => document.body ? document.body.innerText : ''")
                title = await page.title()

                data["pages"].append({"url": url, "title": title, "load_ms": load_ms})
                data["page_texts"][label] = text[:2500]

                if label == "home":
                    data["load_time_ms"] = load_ms

                # Update signals from each page
                if re.search(r"cookie|consent|gdpr", content, re.I):
                    data["has_cookie_banner"] = True
                if re.search(r"privacy.policy|privacy-policy", content, re.I):
                    data["has_privacy_policy"] = True
                if re.search(r"terms.of.service|terms-of-service|terms.and.conditions", content, re.I):
                    data["has_terms"] = True
                if re.search(r"(\+\d{1,3}[\s.-]?)?\(?\d{3}\)?[\s.-]?\d{3}[\s.-]?\d{4}", text):
                    data["has_phone"] = True
                if re.search(r"[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}", text):
                    data["has_email"] = True
                if re.search(r"pricing|price|per month|\$\d|£\d|₹\d", content, re.I):
                    data["has_pricing"] = True
                if re.search(r"testimonial|review|rated|stars|trustpilot|clutch|g2", content, re.I):
                    data["has_testimonials"] = True
                if re.search(r"<form", content, re.I):
                    data["has_contact_form"] = True
                if re.search(r"sign.in|login|log.in", content, re.I):
                    data["has_login"] = True
                if re.search(r"sign.up|register|get.started|free.trial", content, re.I):
                    data["has_signup"] = True

                # Check third party scripts
                scripts = await page.evaluate("""() => {
                    return Array.from(document.querySelectorAll("script[src]"))
                        .map(s => s.src)
                        .filter(s => s && !s.includes(window.location.hostname))
                        .slice(0, 10);
                }""")
                data["third_party_scripts"].extend([s for s in scripts if s not in data["third_party_scripts"]])

                return text, content
            except Exception as e:
                data["errors"].append(f"{label}: {str(e)[:100]}")
                print(f"    Error on {label}: {e}")
                return "", ""

        try:
            # 1. Homepage
            await analyse_page(target_url, "home")

            # Get all nav links from homepage
            nav_links = await page.evaluate("""() => {
                const links = Array.from(document.querySelectorAll("nav a, header a, [role=navigation] a"));
                return [...new Set(links.map(a => a.href))]
                    .filter(h => h && h.startsWith("http"))
                    .slice(0, 20);
            }""")
            data["nav_links"] = nav_links

            # Get CTA buttons
            cta_buttons = await page.evaluate("""() => {
                const btns = Array.from(document.querySelectorAll("button, a"));
                return btns
                    .filter(b => /get.started|sign.up|free.trial|contact|book|demo|try|start/i.test(b.innerText))
                    .slice(0, 8)
                    .map(b => b.innerText.trim());
            }""")
            data["cta_buttons"] = cta_buttons

            # 2. Visit key pages from nav
            priority_patterns = [
                (r"pricing|price|plans", "pricing"),
                (r"contact|get.in.touch|reach", "contact"),
                (r"about|team|company|who.we", "about"),
                (r"feature|product|solution|service", "features"),
                (r"blog|news|resource", "blog"),
            ]

            pages_visited = 1
            for link in nav_links[:15]:
                if pages_visited >= 7:
                    break
                link_lower = link.lower()
                # Only visit same domain
                if base_domain not in link:
                    continue
                for pattern, label in priority_patterns:
                    if re.search(pattern, link_lower) and label not in data["page_texts"]:
                        await analyse_page(link, label)
                        pages_visited += 1
                        await page.wait_for_timeout(1500)
                        break

            # 3. Deep ADA audit on homepage
            await page.goto(target_url, wait_until="domcontentloaded", timeout=20000)
            await page.wait_for_timeout(1500)

            ada_checks = await page.evaluate("""() => {
                const imgs = Array.from(document.querySelectorAll("img"));
                const imgsWithoutAlt = imgs.filter(i => !i.alt || i.alt.trim() === "").length;
                const inputs = Array.from(document.querySelectorAll("input, select, textarea"));
                const inputsWithoutLabel = inputs.filter(inp => {
                    if (!inp.id) return true;
                    return !document.querySelector(`label[for="${inp.id}"]`);
                }).length;
                const headings = Array.from(document.querySelectorAll("h1,h2,h3,h4,h5,h6"));
                const h1Count = document.querySelectorAll("h1").length;
                const links = Array.from(document.querySelectorAll("a"));
                const emptyLinks = links.filter(a => !a.innerText.trim() && !a.getAttribute("aria-label")).length;
                const hasSkipNav = !!document.querySelector("[href='#main'], [href='#content'], .skip-nav, .skip-link");
                const lang = document.documentElement.lang;
                const focusableElements = document.querySelectorAll("a, button, input, select, textarea, [tabindex]").length;
                return {
                    imgs_total: imgs.length,
                    imgs_without_alt: imgsWithoutAlt,
                    inputs_total: inputs.length,
                    inputs_without_label: inputsWithoutLabel,
                    heading_count: headings.length,
                    h1_count: h1Count,
                    empty_links: emptyLinks,
                    has_skip_nav: hasSkipNav,
                    lang_attribute: lang || "missing",
                    focusable_elements: focusableElements
                };
            }""")
            data["ada_checks"] = ada_checks

            # 4. Mobile viewport check
            mobile_context = await browser.new_context(
                viewport={"width": 375, "height": 812},
                user_agent="Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15"
            )
            mobile_page = await mobile_context.new_page()
            try:
                await mobile_page.goto(target_url, wait_until="domcontentloaded", timeout=15000)
                await mobile_page.wait_for_timeout(1500)
                mobile_issues = await mobile_page.evaluate("""() => {
                    const issues = [];
                    const viewport = window.innerWidth;
                    const body = document.body;
                    if (body.scrollWidth > viewport + 10) issues.push("Horizontal scroll detected — content wider than viewport");
                    const smallText = Array.from(document.querySelectorAll("p, span, div"))
                        .filter(el => {
                            const size = parseFloat(window.getComputedStyle(el).fontSize);
                            return size > 0 && size < 12 && el.innerText.trim().length > 5;
                        }).length;
                    if (smallText > 3) issues.push(`${smallText} elements with text smaller than 12px`);
                    const smallButtons = Array.from(document.querySelectorAll("button, a"))
                        .filter(el => {
                            const r = el.getBoundingClientRect();
                            return r.width > 0 && r.height > 0 && (r.width < 44 || r.height < 44);
                        }).length;
                    if (smallButtons > 0) issues.push(`${smallButtons} tap targets smaller than 44px (WCAG minimum)`);
                    return issues;
                }""")
                data["mobile_viewport_issues"] = mobile_issues
                print(f"    Mobile check: {len(mobile_issues)} issues found")
            except Exception as e:
                data["errors"].append(f"mobile: {str(e)[:100]}")
            finally:
                await mobile_context.close()

            # 5. Try contact form interaction
            if data["has_contact_form"] and "contact" in data["page_texts"]:
                try:
                    contact_url = next((l for l in nav_links if re.search(r"contact", l, re.I)), None)
                    if contact_url:
                        await page.goto(contact_url, wait_until="domcontentloaded", timeout=15000)
                        await page.wait_for_timeout(1000)
                        form_fields = await page.evaluate("""() => {
                            return Array.from(document.querySelectorAll("input, textarea, select"))
                                .map(f => ({
                                    type: f.type || f.tagName.toLowerCase(),
                                    name: f.name || f.id || f.placeholder,
                                    required: f.required,
                                    label: document.querySelector(`label[for="${f.id}"]`)?.innerText || ""
                                }))
                                .filter(f => f.type !== "hidden" && f.type !== "submit");
                        }""")
                        data["form_fields"] = form_fields
                        print(f"    Form fields found: {len(form_fields)}")
                except Exception as e:
                    data["errors"].append(f"form: {str(e)[:100]}")

        except Exception as e:
            data["errors"].append(f"main: {str(e)[:100]}")
            print(f"  Browser error: {e}")
        finally:
            await browser.close()

    print(f"  Pages visited: {len(data['pages'])}")
    return data

async def run_lam_audit(target_url: str):
    print("=" * 60)
    print(f"KLARO PULSE LAM AGENT v5 (Pure Playwright)")
    print(f"Target: {target_url}")
    print(f"Started: {datetime.now().isoformat()}")
    print("=" * 60)

    # Find or create lam_run row
    user_id = os.getenv("LAM_USER_ID", None)
    encoded_url = urllib.parse.quote(target_url, safe='')
    existing = supabase_request("GET", f"lam_runs?url=eq.{encoded_url}&status=eq.pending&order=created_at.desc&limit=1")
    
    run_id = None
    if existing and len(existing) > 0:
        run_id = existing[0]["id"]
        print(f"  Found existing run: {run_id}")
        supabase_update(run_id, {"status": "running", "progress": 10, "progress_message": "Browser starting..."})
    else:
        run_id = supabase_insert({
            "url": target_url,
            "status": "running",
            "progress": 10,
            "progress_message": "Browser starting...",
            "user_id": user_id,
            "triggered_by": "docker-local"
        })
        print(f"  Created run: {run_id}")

    # Step 1 — Browse the site
    print("\n[1/3] Browsing site with Playwright...")
    if run_id:
        supabase_update(run_id, {"progress": 25, "progress_message": "AI agent visiting site..."})
    
    site_data = await browse_site(target_url)
    print(f"  Pages visited: {len(site_data['pages'])}")
    print(f"  Load time: {site_data['load_time_ms']}ms")
    print(f"  Contact form: {site_data['has_contact_form']}")
    print(f"  Cookie banner: {site_data['has_cookie_banner']}")
    print(f"  ADA checks: {site_data.get('ada_checks', {})}")

    if run_id:
        supabase_update(run_id, {"progress": 50, "progress_message": "Analysing with AI..."})

    # Step 2 — AI Analysis
    print("\n[2/3] Running AI analysis...")
    
    system = "You are a senior web consultant producing a professional LAM audit report. Return only valid JSON."
    
    prompt = f"""Analyse this website audit data for {target_url} and produce a comprehensive LAM report.

BROWSER DATA COLLECTED:
- Pages visited: {json.dumps(site_data['pages'])}
- Load time: {site_data['load_time_ms']}ms
- Has contact form: {site_data['has_contact_form']}
- Has phone number: {site_data['has_phone']}
- Has email: {site_data['has_email']}
- Has pricing: {site_data['has_pricing']}
- Has testimonials: {site_data['has_testimonials']}
- Has cookie consent banner: {site_data['has_cookie_banner']}
- Has privacy policy: {site_data['has_privacy_policy']}
- Has terms of service: {site_data['has_terms']}
- Has SSL/HTTPS: {site_data['has_ssl']}
- Has login: {site_data['has_login']}
- Has signup: {site_data['has_signup']}
- Navigation links: {json.dumps(site_data['nav_links'][:8])}
- CTA buttons: {json.dumps(site_data['cta_buttons'])}
- ADA checks: {json.dumps(site_data.get('ada_checks', {}))}
- Homepage text: {site_data['page_texts'].get('home', '')[:2000]}
- Contact page text: {site_data['page_texts'].get('contact', '')[:1000]}
- Errors: {json.dumps(site_data['errors'])}

Return a JSON object with ALL these fields:
{{
  "overall_score": 75,
  "grade": "B",
  "lam_score": 70,
  "ada_score": 60,
  "soc_score": 65,
  "conversion_score": 55,
  "executive_brief": {{
    "urgency": "High",
    "one_line_verdict": "one punchy sentence about this specific site",
    "plain_english_summary": "3-4 sentences about what the AI agent found",
    "estimated_monthly_revenue_lost": "$X,000 - $Y,000",
    "top_3_actions": ["action 1", "action 2", "action 3"]
  }},
  "client_experience": {{
    "what_agent_experienced": "detailed narrative of what the AI saw",
    "time_to_understand_business": "X seconds/minutes",
    "time_to_find_contact": "X seconds or Not found",
    "contact_form_experience": "description",
    "conversion_probability": 45,
    "would_real_client_convert": true,
    "conversion_blockers": ["blocker 1", "blocker 2"],
    "trust_signals_found": ["signal 1", "signal 2"],
    "trust_signals_missing": ["missing 1", "missing 2"]
  }},
  "ada_report": {{
    "ada_score": 60,
    "wcag_level_achieved": "A",
    "risk_level": "Medium Risk",
    "ada_narrative": "detailed ADA assessment",
    "images_missing_alt": "X of Y images",
    "keyboard_navigation": "Good/Poor/Not tested",
    "screen_reader_compatible": "Partial",
    "color_contrast_issues": "None detected/X issues found",
    "critical_violations": ["violation 1", "violation 2"],
    "legal_exposure": "description of legal risk",
    "remediation_cost": "$X,000 - $Y,000",
    "remediation_time": "X weeks"
  }},
  "soc_report": {{
    "soc_score": 65,
    "legal_risk_level": "Medium",
    "soc_narrative": "detailed SOC assessment",
    "https_enforced": true,
    "cookie_consent_compliant": false,
    "privacy_policy_adequate": true,
    "gdpr_compliant": "Partial",
    "ccpa_compliant": "Unknown",
    "india_dpdp_compliant": "Unknown",
    "third_party_trackers_found": [],
    "compliance_gaps": ["gap 1", "gap 2"]
  }},
  "competitive_intel": {{
    "industry": "very specific industry name",
    "market_position": "where this company sits in the market",
    "where_losing_clients_to_competitors": "specific reasons",
    "biggest_competitive_weakness": "main weakness",
    "opportunity_to_win": "specific opportunity"
  }},
  "strengths": ["strength 1", "strength 2", "strength 3"],
  "roadmap": {{
    "week_1": {{
      "title": "Quick Wins",
      "actions": ["action 1", "action 2", "action 3"],
      "estimated_cost": "$0 - $500",
      "expected_score_improvement": 15
    }},
    "month_1": {{
      "title": "Foundation",
      "actions": ["action 1", "action 2", "action 3"],
      "estimated_cost": "$500 - $2,000",
      "expected_score_improvement": 25
    }},
    "month_2_3": {{
      "title": "Growth",
      "actions": ["action 1", "action 2", "action 3"],
      "estimated_cost": "$2,000 - $10,000",
      "expected_score_improvement": 20
    }},
    "expected_outcome_90_days": "specific outcome for this business"
  }}
}}"""

    result_text = call_llm(prompt, system)
    report = extract_json(result_text)
    
    if not report or not report.get("overall_score"):
        print("  LLM returned empty — using site data defaults")
        report = {
            "overall_score": 40,
            "grade": "D",
            "lam_score": 30,
            "ada_score": 40,
            "soc_score": 35,
            "conversion_score": 35,
            "executive_brief": {
                "urgency": "High",
                "one_line_verdict": f"Audit of {target_url} completed with limited data",
                "plain_english_summary": "The LAM agent visited the site but encountered issues analysing the content.",
                "estimated_monthly_revenue_lost": "Unknown",
                "top_3_actions": ["Review site accessibility", "Add cookie consent", "Improve contact visibility"]
            }
        }

    # Step 3 — Save to Supabase
    print("\n[3/3] Saving results...")
    if run_id:
        supabase_update(run_id, {"progress": 90, "progress_message": "Saving report..."})

    score = report.get("overall_score", 0)
    result_data = {
        "status": "complete",
        "progress": 100,
        "progress_message": "Complete ✓",
        "overall_score": score,
        "grade": report.get("grade", "F"),
        "lam_score": report.get("lam_score", 0),
        "ada_score": report.get("ada_score", 0),
        "soc_score": report.get("soc_score", 0),
        "executive_brief": report.get("executive_brief", {}),
        "client_experience": report.get("client_experience", {}),
        "ada_report": report.get("ada_report", {}),
        "soc_report": report.get("soc_report", {}),
        "competitive_intel": report.get("competitive_intel", {}),
        "strengths": report.get("strengths", []),
        "roadmap": report.get("roadmap", {}),
        "raw_data": {
            "browser_data": {k: v for k, v in site_data.items() if k != "page_texts"},
            "page_texts_length": {k: len(v) for k, v in site_data["page_texts"].items()}
        },
        "completed_at": datetime.now().isoformat()
    }

    if run_id:
        supabase_update(run_id, result_data)
    else:
        run_id = supabase_insert({**result_data, "url": target_url, "triggered_by": "docker-local", "user_id": user_id})

    print("=" * 60)
    print(f"LAM v5 COMPLETE")
    print(f"Overall: {score}/100 | Grade: {report.get('grade')} | Run ID: {run_id}")
    print(f"LAM: {report.get('lam_score')}/100 | ADA: {report.get('ada_score')}/100 | SOC: {report.get('soc_score')}/100")
    print("=" * 60)

if __name__ == "__main__":
    target = sys.argv[1] if len(sys.argv) > 1 else "https://klaro.services"
    asyncio.run(run_lam_audit(target))
