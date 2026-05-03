"""
Klaro Pulse LAM Agent v6
Deep crawl — no page limit, country selector support, 10-section report.
Runtime target: 3-5 minutes per site.
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

# ── Supabase helpers ──────────────────────────────────────────────────────────

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
    supabase_request("PATCH", f"lam_runs?id=eq.{run_id}", data)

# ── LLM caller ────────────────────────────────────────────────────────────────

def call_llm(prompt: str, system: str = "", max_tokens: int = 6000) -> str:
    messages = []
    if system:
        messages.append({"role": "system", "content": system})
    messages.append({"role": "user", "content": prompt})

    # 1. Groq
    if GROQ_KEY:
        try:
            from groq import Groq
            client = Groq(api_key=GROQ_KEY)
            r = client.chat.completions.create(
                model="llama-3.3-70b-versatile",
                messages=messages,
                response_format={"type": "json_object"},
                temperature=0.2,
                max_tokens=max_tokens
            )
            print("  LLM: Groq llama-3.3-70b")
            return r.choices[0].message.content
        except Exception as e:
            print(f"  Groq failed: {e}")

    # 2. Cerebras
    if CEREBRAS_KEY:
        try:
            import requests
            r = requests.post(
                "https://api.cerebras.ai/v1/chat/completions",
                headers={"Authorization": f"Bearer {CEREBRAS_KEY}", "Content-Type": "application/json"},
                json={"model": "llama-3.3-70b", "messages": messages,
                      "response_format": {"type": "json_object"}, "temperature": 0.2, "max_tokens": max_tokens},
                timeout=60
            )
            r.raise_for_status()
            print("  LLM: Cerebras llama-3.3-70b")
            return r.json()["choices"][0]["message"]["content"]
        except Exception as e:
            print(f"  Cerebras failed: {e}")

    # 3. OpenAI
    if OPENAI_KEY:
        try:
            from openai import OpenAI
            client = OpenAI(api_key=OPENAI_KEY)
            r = client.chat.completions.create(
                model="gpt-4o-mini",
                messages=messages,
                response_format={"type": "json_object"},
                temperature=0.2,
                max_tokens=max_tokens
            )
            print("  LLM: OpenAI gpt-4o-mini")
            return r.choices[0].message.content
        except Exception as e:
            print(f"  OpenAI failed: {e}")

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

# ── Country selector detection ────────────────────────────────────────────────

COUNTRY_PATTERNS = [
    r"select.{0,10}country", r"choose.{0,10}country", r"select.{0,10}region",
    r"where.are.you.located", r"select.{0,10}location", r"which.country",
    r"select.{0,10}language", r"choose.{0,10}language", r"select.{0,10}market",
]

async def detect_country_selector(page) -> bool:
    """Returns True if the page has a country/region selector."""
    try:
        content = await page.content()
        text = await page.evaluate("() => document.body ? document.body.innerText : ''")
        combined = content + " " + text
        for pat in COUNTRY_PATTERNS:
            if re.search(pat, combined, re.I):
                return True
        # Check for select dropdowns with country options
        country_select = await page.evaluate("""() => {
            const selects = Array.from(document.querySelectorAll('select'));
            return selects.some(s => {
                const opts = Array.from(s.options).map(o => o.text.toLowerCase());
                const countries = ['united states', 'united kingdom', 'canada', 'india', 'australia', 'germany', 'france'];
                return countries.filter(c => opts.some(o => o.includes(c))).length >= 3;
            });
        }""")
        if country_select:
            return True
    except:
        pass
    return False

async def extract_country_urls(page, base_url: str) -> list:
    """
    Extract country-specific URLs from a country selector page.
    Returns list of {country, url} dicts.
    """
    results = []
    try:
        # Try anchor links with country codes or names
        links = await page.evaluate("""() => {
            const anchors = Array.from(document.querySelectorAll('a'));
            return anchors.map(a => ({
                href: a.href,
                text: a.innerText.trim(),
                title: a.title || ''
            })).filter(a => a.href && a.href.startsWith('http'));
        }""")

        country_map = {
            'united states': 'US', 'usa': 'US', 'us': 'US', 'america': 'US',
            'united kingdom': 'UK', 'uk': 'UK', 'great britain': 'UK', 'england': 'UK',
            'canada': 'CA', 'india': 'IN', 'australia': 'AU', 'germany': 'DE',
            'france': 'FR', 'singapore': 'SG', 'uae': 'UAE', 'dubai': 'UAE',
            'new zealand': 'NZ', 'ireland': 'IE', 'south africa': 'ZA',
        }

        seen_urls = set()
        for link in links:
            text_lower = (link['text'] + ' ' + link['title']).lower()
            for name, code in country_map.items():
                if name in text_lower and link['href'] not in seen_urls:
                    results.append({'country': code, 'name': name.title(), 'url': link['href']})
                    seen_urls.add(link['href'])
                    break

        # Also check URL patterns like /en-us /en-gb /in /au
        path_patterns = {
            '/en-us': 'US', '/en-gb': 'UK', '/en-in': 'IN', '/en-au': 'AU',
            '/en-ca': 'CA', '/en-sg': 'SG', '/us/': 'US', '/uk/': 'UK',
            '/in/': 'IN', '/au/': 'AU', '/ca/': 'CA',
        }
        for link in links:
            href_lower = link['href'].lower()
            for pattern, code in path_patterns.items():
                if pattern in href_lower and link['href'] not in seen_urls:
                    country_name = [k for k, v in country_map.items() if v == code]
                    results.append({'country': code, 'name': country_name[0].title() if country_name else code, 'url': link['href']})
                    seen_urls.add(link['href'])
                    break

    except Exception as e:
        print(f"  Country URL extraction error: {e}")

    return results[:8]  # Max 8 countries per scan

# ── Deep site crawler ─────────────────────────────────────────────────────────

async def crawl_site(page, browser, target_url: str, country_label: str = "") -> dict:
    """
    Deep crawl of a single site version (one country).
    No hard page cap — crawls all discoverable pages up to time budget.
    Target: ~90-120 seconds per country version.
    """
    from urllib.parse import urlparse, urljoin

    base_domain = urlparse(target_url).netloc
    label_prefix = f"[{country_label}] " if country_label else ""

    data = {
        "country": country_label,
        "pages": [],
        "screenshots": {},
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
        "has_chat": False,
        "has_search": False,
        "has_video": False,
        "has_faq": False,
        "has_case_studies": False,
        "nav_links": [],
        "cta_buttons": [],
        "page_texts": {},
        "load_time_ms": 0,
        "form_fields": [],
        "third_party_scripts": [],
        "mobile_viewport_issues": [],
        "page_load_times": {},
        "broken_links": [],
        "redirect_chain": [],
        "meta_data": {},
        "structured_data": [],
        "social_links": [],
        "errors": []
    }

    visited_urls = set()
    to_visit = [target_url]
    crawl_start = time.time()

    # Priority page patterns — visit these first
    priority_patterns = [
        (r"pricing|price|plans|packages|cost", "pricing"),
        (r"contact|get.in.touch|reach.us|talk.to", "contact"),
        (r"about|team|company|who.we|our.story", "about"),
        (r"feature|product|solution|service|what.we.do", "features"),
        (r"demo|book.a.call|schedule|consultation", "demo"),
        (r"case.stud|client|portfolio|work|success", "case_studies"),
        (r"faq|frequently.asked|help|support", "faq"),
        (r"blog|news|resource|insight|article", "blog"),
        (r"partner|integrat|api|developer", "partners"),
        (r"privacy|legal|terms|cookie", "legal"),
    ]

    async def analyse_page(url, label):
        if url in visited_urls:
            return None
        visited_urls.add(url)
        try:
            print(f"    {label_prefix}Visiting: {label} — {url}")
            start = time.time()
            await page.goto(url, wait_until="domcontentloaded", timeout=30000)
            # Human-like pause — read the page
            await page.wait_for_timeout(2500)
            load_ms = int((time.time() - start) * 1000)

            content = await page.content()
            text = await page.evaluate("() => document.body ? document.body.innerText : ''")
            title = await page.title()

            # Collect all internal links from this page
            internal_links = await page.evaluate(f"""() => {{
                return Array.from(document.querySelectorAll('a[href]'))
                    .map(a => a.href)
                    .filter(h => h && h.includes('{base_domain}') && !h.includes('#') && !h.match(/\.(pdf|jpg|png|gif|svg|zip|doc|xls)$/i))
                    .slice(0, 30);
            }}""")

            # Add undiscovered links to queue
            for link in internal_links:
                if link not in visited_urls and link not in to_visit:
                    to_visit.append(link)

            data["pages"].append({
                "url": url, "title": title,
                "load_ms": load_ms, "label": label,
                "text_length": len(text)
            })
            data["page_texts"][label] = text[:3000]
            data["page_load_times"][label] = load_ms

            if label == "home":
                data["load_time_ms"] = load_ms
                # Grab meta data from homepage
                meta = await page.evaluate("""() => ({
                    description: document.querySelector('meta[name="description"]')?.content || '',
                    keywords: document.querySelector('meta[name="keywords"]')?.content || '',
                    og_title: document.querySelector('meta[property="og:title"]')?.content || '',
                    og_description: document.querySelector('meta[property="og:description"]')?.content || '',
                    canonical: document.querySelector('link[rel="canonical"]')?.href || '',
                    viewport: document.querySelector('meta[name="viewport"]')?.content || '',
                    robots: document.querySelector('meta[name="robots"]')?.content || '',
                })""")
                data["meta_data"] = meta

                # Desktop screenshot of homepage
                try:
                    shot_bytes = await page.screenshot(full_page=False, type="jpeg", quality=75)
                    data["screenshots"]["desktop_home"] = shot_bytes
                    print(f"    📷 Screenshot: desktop homepage ({len(shot_bytes)//1024}KB)")
                except Exception as se:
                    print(f"    Screenshot failed: {se}")

                # Structured data
                structured = await page.evaluate("""() => {
                    return Array.from(document.querySelectorAll('script[type="application/ld+json"]'))
                        .map(s => { try { return JSON.parse(s.textContent); } catch { return null; } })
                        .filter(Boolean);
                }""")
                data["structured_data"] = structured

                # Social links
                social = await page.evaluate("""() => {
                    const links = Array.from(document.querySelectorAll('a[href]'));
                    const socials = ['linkedin', 'twitter', 'facebook', 'instagram', 'youtube', 'tiktok', 'x.com'];
                    return links.filter(a => socials.some(s => a.href.includes(s))).map(a => a.href).slice(0, 10);
                }""")
                data["social_links"] = social

            # Signal detection across all pages
            cl = content.lower()
            if re.search(r"cookie|consent|gdpr|ccpa", cl):
                data["has_cookie_banner"] = True
            if re.search(r"privacy.policy|privacy-policy|/privacy", cl):
                data["has_privacy_policy"] = True
            if re.search(r"terms.of.service|terms-of-service|terms.and.conditions|/terms", cl):
                data["has_terms"] = True
            if re.search(r"(\+\d{1,3}[\s.-]?)?\(?\d{3}\)?[\s.-]?\d{3}[\s.-]?\d{4}", text):
                data["has_phone"] = True
            if re.search(r"[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}", text):
                data["has_email"] = True
            if re.search(r"pricing|price|per month|per year|\$\d|£\d|€\d|₹\d|plans", cl):
                data["has_pricing"] = True
            if re.search(r"testimonial|review|rated|stars|trustpilot|clutch|g2|capterra", cl):
                data["has_testimonials"] = True
            if re.search(r"<form", cl):
                data["has_contact_form"] = True
            if re.search(r"sign.in|login|log.in", cl):
                data["has_login"] = True
            if re.search(r"sign.up|register|get.started|free.trial|create.account", cl):
                data["has_signup"] = True
            if re.search(r"live.chat|chat.with|intercom|drift|crisp|tawk|zendesk.chat", cl):
                data["has_chat"] = True
            if re.search(r"<video|youtube.com|vimeo.com|wistia|loom", cl):
                data["has_video"] = True
            if re.search(r"faq|frequently.asked", cl):
                data["has_faq"] = True
            if re.search(r"case.stud|success.stor|client.result", cl):
                data["has_case_studies"] = True
            if re.search(r'<input[^>]+type=["\']?search', cl):
                data["has_search"] = True

            # Third party scripts
            scripts = await page.evaluate(f"""() => {{
                return Array.from(document.querySelectorAll("script[src]"))
                    .map(s => s.src)
                    .filter(s => s && !s.includes('{base_domain}'))
                    .slice(0, 15);
            }}""")
            for s in scripts:
                if s not in data["third_party_scripts"]:
                    data["third_party_scripts"].append(s)

            return text, content

        except Exception as e:
            data["errors"].append(f"{label}: {str(e)[:120]}")
            print(f"    Error on {label}: {e}")
            return "", ""

    # ── Phase 1: Homepage ─────────────────────────────────────────────────────
    await analyse_page(target_url, "home")

    # Get nav links
    nav_links = await page.evaluate(f"""() => {{
        const links = Array.from(document.querySelectorAll("nav a, header a, [role=navigation] a, .navbar a, .nav a"));
        return [...new Set(links.map(a => a.href))]
            .filter(h => h && h.startsWith("http") && h.includes('{base_domain}'))
            .slice(0, 30);
    }}""")
    data["nav_links"] = nav_links

    # Get CTA buttons
    cta_buttons = await page.evaluate("""() => {
        const btns = Array.from(document.querySelectorAll("button, a"));
        return btns
            .filter(b => /get.started|sign.up|free.trial|contact|book|demo|try|start|talk|schedule|request|buy|purchase/i.test(b.innerText))
            .slice(0, 12)
            .map(b => b.innerText.trim());
    }""")
    data["cta_buttons"] = cta_buttons

    # Add nav links to queue (prioritised)
    priority_urls = []
    other_urls = []
    for link in nav_links:
        link_lower = link.lower()
        is_priority = False
        for pattern, label in priority_patterns:
            if re.search(pattern, link_lower):
                priority_urls.append((link, label))
                is_priority = True
                break
        if not is_priority:
            other_urls.append((link, f"page_{len(other_urls)+1}"))

    # ── Phase 2: Priority pages from nav ─────────────────────────────────────
    print(f"\n  {label_prefix}Phase 2: Visiting priority nav pages ({len(priority_urls)} found)")
    for link, label in priority_urls:
        if link not in visited_urls:
            await analyse_page(link, label)
            # Human reading delay — 2 to 4 seconds
            await page.wait_for_timeout(2000 + (hash(link) % 2000))

    # ── Phase 3: Deep crawl — follow discovered links ────────────────────────
    print(f"\n  {label_prefix}Phase 3: Deep crawl ({len(to_visit)} URLs discovered so far)")
    deep_count = 0
    while to_visit and (time.time() - crawl_start) < 150:  # 2.5 min budget per country
        url = to_visit.pop(0)
        if url in visited_urls:
            continue
        if not url.startswith("http"):
            continue
        parsed = urllib.parse.urlparse(url)
        if base_domain not in parsed.netloc:
            continue

        # Determine label from URL path
        path = parsed.path.lower()
        label = "page"
        for pattern, plabel in priority_patterns:
            if re.search(pattern, path):
                label = plabel + f"_{deep_count}"
                break
        if label == "page":
            label = f"deep_{deep_count}"

        await analyse_page(url, label)
        deep_count += 1
        await page.wait_for_timeout(2500 + (deep_count % 3) * 1000)  # 2.5 - 5.5s between pages

    print(f"  {label_prefix}Total pages crawled: {len(data['pages'])}")

    # ── Phase 4: ADA deep audit on homepage ──────────────────────────────────
    print(f"\n  {label_prefix}Phase 4: ADA audit")
    await page.goto(target_url, wait_until="domcontentloaded", timeout=20000)
    await page.wait_for_timeout(2000)

    ada_checks = await page.evaluate("""() => {
        const imgs = Array.from(document.querySelectorAll("img"));
        const imgsWithoutAlt = imgs.filter(i => !i.alt || i.alt.trim() === "").length;
        const inputs = Array.from(document.querySelectorAll("input, select, textarea"));
        const inputsWithoutLabel = inputs.filter(inp => {
            if (inp.type === 'hidden' || inp.type === 'submit' || inp.type === 'button') return false;
            if (!inp.id) return true;
            return !document.querySelector(`label[for="${inp.id}"]`) && !inp.getAttribute('aria-label') && !inp.getAttribute('aria-labelledby');
        }).length;
        const headings = Array.from(document.querySelectorAll("h1,h2,h3,h4,h5,h6"));
        const h1Count = document.querySelectorAll("h1").length;
        const links = Array.from(document.querySelectorAll("a"));
        const emptyLinks = links.filter(a => !a.innerText.trim() && !a.getAttribute("aria-label") && !a.getAttribute("title")).length;
        const hasSkipNav = !!document.querySelector("[href='#main'], [href='#content'], .skip-nav, .skip-link, [class*='skip']");
        const lang = document.documentElement.lang;
        const focusableElements = document.querySelectorAll("a, button, input, select, textarea, [tabindex]").length;
        const ariaLandmarks = document.querySelectorAll("main, nav, header, footer, aside, [role='main'], [role='navigation'], [role='banner']").length;
        const tabIndexIssues = Array.from(document.querySelectorAll("[tabindex]")).filter(e => parseInt(e.getAttribute("tabindex")) > 0).length;
        const iframes = document.querySelectorAll("iframe");
        const iframesWithoutTitle = Array.from(iframes).filter(f => !f.title).length;
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
            focusable_elements: focusableElements,
            aria_landmarks: ariaLandmarks,
            tab_index_issues: tabIndexIssues,
            iframes_total: iframes.length,
            iframes_without_title: iframesWithoutTitle,
        };
    }""")
    data["ada_checks"] = ada_checks

    # ── Phase 5: Mobile viewport check ───────────────────────────────────────
    print(f"\n  {label_prefix}Phase 5: Mobile viewport check")
    mobile_context = await browser.new_context(
        viewport={"width": 375, "height": 812},
        user_agent="Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15"
    )
    mobile_page = await mobile_context.new_page()
    try:
        await mobile_page.goto(target_url, wait_until="domcontentloaded", timeout=20000)
        await mobile_page.wait_for_timeout(2000)
        mobile_issues = await mobile_page.evaluate("""() => {
            const issues = [];
            const viewport = window.innerWidth;
            const overflowing = Array.from(document.querySelectorAll('*')).filter(el => {
                try { return el.scrollWidth > viewport + 5; } catch { return false; }
            }).slice(0, 5).map(el => el.tagName + (el.className ? '.' + el.className.toString().split(' ')[0] : ''));
            if (overflowing.length > 0) issues.push(`Horizontal overflow: ${overflowing.join(', ')}`);
            const smallText = Array.from(document.querySelectorAll('p, span, div')).filter(el => {
                const size = parseFloat(window.getComputedStyle(el).fontSize);
                return size > 0 && size < 12;
            }).length;
            if (smallText > 0) issues.push(`${smallText} elements with font < 12px`);
            const tinyTargets = Array.from(document.querySelectorAll('a, button')).filter(el => {
                const r = el.getBoundingClientRect();
                return r.width > 0 && r.height > 0 && (r.width < 44 || r.height < 44);
            }).length;
            if (tinyTargets > 0) issues.push(`${tinyTargets} tap targets smaller than 44x44px`);
            return issues;
        }""")
        data["mobile_viewport_issues"] = mobile_issues
        # Also check mobile load time
        mobile_start = time.time()
        await mobile_page.reload(wait_until="domcontentloaded", timeout=20000)
        data["mobile_load_ms"] = int((time.time() - mobile_start) * 1000)
    except Exception as e:
        data["errors"].append(f"mobile: {str(e)[:100]}")
    finally:
        await mobile_context.close()

    # ── Phase 6: Performance signals ─────────────────────────────────────────
    try:
        await page.goto(target_url, wait_until="networkidle", timeout=30000)
        perf = await page.evaluate("""() => {
            const nav = performance.getEntriesByType('navigation')[0];
            const paint = performance.getEntriesByType('paint');
            const fcp = paint.find(p => p.name === 'first-contentful-paint');
            return {
                dom_content_loaded: nav ? Math.round(nav.domContentLoadedEventEnd) : 0,
                load_complete: nav ? Math.round(nav.loadEventEnd) : 0,
                fcp_ms: fcp ? Math.round(fcp.startTime) : 0,
                transfer_size_kb: nav ? Math.round(nav.transferSize / 1024) : 0,
                resources_count: performance.getEntriesByType('resource').length,
            };
        }""")
        data["performance"] = perf
    except:
        data["performance"] = {}

    return data

# ── Main audit orchestrator ───────────────────────────────────────────────────

async def run_lam_audit(target_url: str):
    from playwright.async_api import async_playwright

    print("=" * 70)
    print(f"KLARO PULSE LAM AGENT v6 — DEEP CRAWL")
    print(f"Target: {target_url}")
    print(f"Started: {datetime.now().isoformat()}")
    print("=" * 70)

    user_id = os.getenv("LAM_USER_ID", None)
    encoded_url = urllib.parse.quote(target_url, safe='')

    # Find or create run
    existing = supabase_request("GET", f"lam_runs?url=eq.{encoded_url}&status=eq.pending&order=created_at.desc&limit=1")
    run_id = None
    if existing and len(existing) > 0:
        run_id = existing[0]["id"]
        print(f"  Found existing run: {run_id}")
        supabase_update(run_id, {"status": "running", "progress": 5, "progress_message": "Agent starting deep crawl..."})
    else:
        run_id = supabase_insert({
            "url": target_url,
            "status": "running",
            "progress": 5,
            "progress_message": "Agent starting deep crawl...",
            "user_id": user_id,
            "triggered_by": "docker-local"
        })
        print(f"  Created run: {run_id}")

    audit_start = time.time()
    all_country_data = []

    async with async_playwright() as p:
        browser = await p.chromium.launch(
            headless=True,
            args=["--no-sandbox", "--disable-setuid-sandbox", "--disable-dev-shm-usage",
                  "--disable-blink-features=AutomationControlled"]
        )

        # ── Desktop context ───────────────────────────────────────────────────
        context = await browser.new_context(
            viewport={"width": 1440, "height": 900},
            user_agent="Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
            locale="en-US",
        )
        page = await context.new_page()

        if run_id:
            supabase_update(run_id, {"progress": 10, "progress_message": "Loading homepage..."})

        # ── Check for country selector ────────────────────────────────────────
        print("\n[1/4] Checking for country selector...")
        await page.goto(target_url, wait_until="domcontentloaded", timeout=30000)
        await page.wait_for_timeout(3000)

        has_country_selector = await detect_country_selector(page)
        country_urls = []

        if has_country_selector:
            print("  Country selector detected!")
            country_urls = await extract_country_urls(page, target_url)
            print(f"  Found {len(country_urls)} country versions: {[c['country'] for c in country_urls]}")
            if run_id:
                supabase_update(run_id, {
                    "progress": 15,
                    "progress_message": f"Country selector found — scanning {len(country_urls) or 1} regions..."
                })

        # ── Crawl each country version ────────────────────────────────────────
        if country_urls:
            total = len(country_urls)
            for idx, cv in enumerate(country_urls):
                pct = 15 + int((idx / total) * 55)
                if run_id:
                    supabase_update(run_id, {
                        "progress": pct,
                        "progress_message": f"Crawling {cv['name']} version ({idx+1}/{total})..."
                    })
                print(f"\n[COUNTRY {idx+1}/{total}] Crawling {cv['name']} — {cv['url']}")
                country_data = await crawl_site(page, browser, cv['url'], cv['country'])
                country_data['country_name'] = cv['name']
                all_country_data.append(country_data)
                # Pause between countries
                await page.wait_for_timeout(3000)
        else:
            # No country selector — single crawl
            if run_id:
                supabase_update(run_id, {"progress": 20, "progress_message": "Deep crawling site..."})
            print("\n[2/4] Deep crawling site (no country selector)...")
            site_data = await crawl_site(page, browser, target_url, "")
            all_country_data.append(site_data)

        await browser.close()

    elapsed_browse = int(time.time() - audit_start)
    total_pages = sum(len(d['pages']) for d in all_country_data)
    print(f"\n  Browse complete: {total_pages} pages across {len(all_country_data)} region(s) in {elapsed_browse}s")

    # ── Upload screenshots to Supabase Storage ────────────────────────────────
    screenshot_urls = {}
    print("\n  Uploading screenshots...")
    import requests as _req_upload
    for cd in all_country_data:
        country = cd.get('country', 'main') or 'main'
        for shot_label, shot_bytes in cd.get('screenshots', {}).items():
            if not shot_bytes:
                continue
            try:
                path = f"lam/{run_id}/{country}/{shot_label}.jpg"
                upload_url = f"{SUPABASE_URL}/storage/v1/object/lam-screenshots/{path}"
                r = _req_upload.post(
                    upload_url,
                    data=shot_bytes,
                    headers={
                        "apikey": SUPABASE_KEY,
                        "Authorization": f"Bearer {SUPABASE_KEY}",
                        "Content-Type": "image/jpeg",
                        "x-upsert": "true"
                    },
                    timeout=30
                )
                if r.status_code in [200, 201]:
                    public_url = f"{SUPABASE_URL}/storage/v1/object/public/lam-screenshots/{path}"
                    screenshot_urls[f"{country}_{shot_label}"] = public_url
                    print(f"    ✓ Uploaded {shot_label} ({len(shot_bytes)//1024}KB)")
                else:
                    print(f"    ✗ Upload failed {shot_label}: {r.status_code} {r.text[:100]}")
            except Exception as e:
                print(f"    ✗ Screenshot upload error: {e}")

    if run_id:
        supabase_update(run_id, {"progress": 70, "progress_message": f"AI analysing {total_pages} pages..."})

    # ── AI Analysis ───────────────────────────────────────────────────────────
    print("\n[3/4] Running AI analysis (10-section report)...")

    # Build rich data summary for LLM
    primary = all_country_data[0]
    country_summary = ""
    if len(all_country_data) > 1:
        country_summary = f"\n\nCOUNTRY VERSIONS SCANNED: {len(all_country_data)}\n"
        for cd in all_country_data:
            country_summary += f"\n--- {cd.get('country_name', cd.get('country', 'Unknown'))} ---\n"
            country_summary += f"Pages crawled: {len(cd['pages'])}\n"
            country_summary += f"Homepage text: {cd['page_texts'].get('home', '')[:800]}\n"
            if cd.get('pricing'):
                country_summary += f"Pricing text: {cd['page_texts'].get('pricing', '')[:400]}\n"

    pages_list = primary['pages']
    page_texts_summary = "\n".join([
        f"[{k}] {v[:1500]}" for k, v in list(primary['page_texts'].items())[:12]
    ])

    system = "You are a world-class digital consultant producing a comprehensive LAM audit report. Be specific, actionable, and brutally honest. Return only valid JSON."

    prompt = f"""Produce a comprehensive 10-section LAM audit report for {target_url}.

CRAWL SUMMARY:
- Total pages visited: {len(pages_list)}
- Countries/regions scanned: {len(all_country_data)}
- Crawl duration: {elapsed_browse} seconds
- Has country selector: {has_country_selector}

SIGNALS DETECTED:
- SSL/HTTPS: {primary['has_ssl']}
- Contact form: {primary['has_contact_form']}
- Phone number: {primary['has_phone']}
- Email visible: {primary['has_email']}
- Pricing page: {primary['has_pricing']}
- Testimonials/reviews: {primary['has_testimonials']}
- Cookie consent: {primary['has_cookie_banner']}
- Privacy policy: {primary['has_privacy_policy']}
- Terms of service: {primary['has_terms']}
- Live chat: {primary['has_chat']}
- Video content: {primary['has_video']}
- FAQ section: {primary['has_faq']}
- Case studies: {primary['has_case_studies']}
- Login portal: {primary['has_login']}
- Signup/CTA: {primary['has_signup']}
- Site search: {primary['has_search']}
- Social links: {json.dumps(primary['social_links'][:5])}

PERFORMANCE:
- Desktop load time: {primary['load_time_ms']}ms
- Mobile load time: {primary.get('mobile_load_ms', 'N/A')}ms
- Performance data: {json.dumps(primary.get('performance', {}))}
- Mobile issues: {json.dumps(primary['mobile_viewport_issues'])}

CTA BUTTONS FOUND: {json.dumps(primary['cta_buttons'])}

META DATA: {json.dumps(primary.get('meta_data', {}))}

STRUCTURED DATA PRESENT: {'Yes, ' + str(len(primary.get('structured_data', []))) + ' schemas' if primary.get('structured_data') else 'None'}

ADA CHECKS:
{json.dumps(primary.get('ada_checks', {}), indent=2)}

THIRD-PARTY SCRIPTS: {json.dumps(primary['third_party_scripts'][:15])}

PAGES VISITED: {json.dumps([p['url'] for p in pages_list[:25]])}

PAGE CONTENT (up to 12 pages, 1500 chars each):
{page_texts_summary}
{country_summary}

ERRORS DURING CRAWL: {json.dumps(primary['errors'][:5])}

Return a JSON object with ALL these fields. Be highly specific to this actual site — no generic responses:

{{
  "overall_score": 72,
  "grade": "C+",
  "lam_score": 68,
  "ada_score": 55,
  "soc_score": 70,
  "conversion_score": 65,
  "performance_score": 60,
  "content_score": 75,

  "executive_brief": {{
    "urgency": "High/Medium/Low",
    "one_line_verdict": "one punchy, specific sentence about THIS site",
    "plain_english_summary": "4-5 sentences — what did the AI agent actually experience? Be specific.",
    "estimated_monthly_revenue_lost": "$X,000 - $Y,000",
    "key_finding": "the single most important discovery from this audit",
    "top_5_actions": ["action 1", "action 2", "action 3", "action 4", "action 5"],
    "country_selector_finding": "findings about multi-region experience if applicable, else null"
  }},

  "client_experience": {{
    "what_agent_experienced": "detailed 4-6 sentence narrative of the full visit — specific pages, specific issues",
    "time_to_understand_business": "X seconds",
    "time_to_find_contact": "X seconds or Not found",
    "contact_form_experience": "detailed description",
    "conversion_probability": 45,
    "would_real_client_convert": true,
    "conversion_blockers": ["specific blocker 1", "specific blocker 2", "specific blocker 3"],
    "trust_signals_found": ["signal 1", "signal 2", "signal 3"],
    "trust_signals_missing": ["missing 1", "missing 2", "missing 3"],
    "navigation_quality": "Good/Poor/Fair with specific reason",
    "mobile_experience": "description of mobile experience based on viewport data",
    "chat_support_present": true,
    "search_functionality": true
  }},

  "performance_report": {{
    "performance_score": 60,
    "desktop_load_ms": {primary['load_time_ms']},
    "mobile_load_ms": {primary.get('mobile_load_ms', 0)},
    "performance_grade": "A/B/C/D/F",
    "performance_narrative": "detailed assessment of load speed and its business impact",
    "core_web_vitals_estimate": "Good/Needs Improvement/Poor",
    "mobile_issues": {json.dumps(primary['mobile_viewport_issues'])},
    "resource_bloat": "assessment of third-party script load",
    "recommendations": ["rec 1", "rec 2", "rec 3"]
  }},

  "content_quality": {{
    "content_score": 75,
    "content_narrative": "assessment of content quality, clarity, and persuasiveness",
    "value_proposition_clarity": "Clear/Unclear/Missing",
    "seo_signals": "assessment of meta tags, structured data, headings",
    "social_proof_strength": "Strong/Weak/Missing",
    "content_gaps": ["gap 1", "gap 2", "gap 3"],
    "tone_assessment": "Professional/Casual/Inconsistent",
    "pages_with_thin_content": ["page 1", "page 2"],
    "structured_data_present": true,
    "meta_description_quality": "Good/Missing/Too short"
  }},

  "ada_report": {{
    "ada_score": 55,
    "wcag_level_achieved": "A/AA/AAA/None",
    "risk_level": "High/Medium/Low Risk",
    "ada_narrative": "detailed 3-4 sentence ADA assessment with specific numbers",
    "images_missing_alt": "X of Y images",
    "inputs_missing_labels": "X of Y inputs",
    "keyboard_navigation": "Good/Poor/Not tested",
    "screen_reader_compatible": "Yes/Partial/No",
    "color_contrast_issues": "None detected/X issues",
    "skip_navigation": true,
    "lang_attribute": "Present/Missing",
    "aria_landmarks": "X found",
    "tab_index_issues": "X found",
    "critical_violations": ["specific violation 1", "specific violation 2"],
    "legal_exposure": "specific legal risk description",
    "remediation_cost": "$X,000 - $Y,000",
    "remediation_time": "X weeks"
  }},

  "soc_report": {{
    "soc_score": 70,
    "legal_risk_level": "High/Medium/Low",
    "soc_narrative": "detailed SOC/compliance assessment",
    "https_enforced": true,
    "cookie_consent_compliant": false,
    "privacy_policy_adequate": true,
    "gdpr_compliant": "Yes/No/Partial",
    "ccpa_compliant": "Yes/No/Unknown",
    "india_dpdp_compliant": "Yes/No/Unknown",
    "pipeda_compliant": "Yes/No/Unknown",
    "third_party_trackers_found": ["tracker 1", "tracker 2"],
    "data_collection_risks": ["risk 1", "risk 2"],
    "compliance_gaps": ["gap 1", "gap 2", "gap 3"],
    "recommended_compliance_actions": ["action 1", "action 2"]
  }},

  "tech_stack": {{
    "detected_technologies": ["tech 1", "tech 2", "tech 3"],
    "cms_platform": "WordPress/Webflow/Custom/Unknown",
    "analytics_tools": ["Google Analytics", "etc"],
    "marketing_tools": ["HubSpot", "etc"],
    "chat_tools": ["Intercom", "etc"],
    "payment_systems": ["Stripe", "etc"],
    "tech_debt_assessment": "Low/Medium/High — specific reason",
    "third_party_risk": "assessment of third-party dependencies"
  }},

  "multi_region": {{
    "has_country_selector": {str(has_country_selector).lower()},
    "regions_scanned": {len(all_country_data)},
    "region_consistency": "Consistent/Inconsistent/N/A",
    "localisation_quality": "Good/Poor/N/A",
    "compliance_variance": "description of how compliance differs by region",
    "recommended_regions_to_prioritise": ["region 1", "region 2"],
    "region_specific_issues": ["issue 1", "issue 2"]
  }},

  "competitive_intel": {{
    "industry": "very specific industry name",
    "market_position": "where this company sits in the market",
    "target_audience_clarity": "Clear/Unclear",
    "where_losing_clients_to_competitors": "specific reasons",
    "biggest_competitive_weakness": "main weakness",
    "opportunity_to_win": "specific opportunity",
    "competitor_advantages_to_counter": ["advantage 1", "advantage 2"]
  }},

  "strengths": ["specific strength 1", "specific strength 2", "specific strength 3", "specific strength 4"],

  "roadmap": {{
    "week_1": {{
      "title": "Critical Fixes",
      "actions": ["specific action 1", "specific action 2", "specific action 3", "specific action 4"],
      "estimated_cost": "$0 - $500",
      "expected_score_improvement": 12
    }},
    "month_1": {{
      "title": "Foundation & Compliance",
      "actions": ["specific action 1", "specific action 2", "specific action 3", "specific action 4"],
      "estimated_cost": "$500 - $3,000",
      "expected_score_improvement": 20
    }},
    "month_2_3": {{
      "title": "Growth & Conversion",
      "actions": ["specific action 1", "specific action 2", "specific action 3", "specific action 4"],
      "estimated_cost": "$3,000 - $15,000",
      "expected_score_improvement": 18
    }},
    "expected_outcome_90_days": "specific, measurable outcome for this business",
    "roi_estimate": "estimated ROI from implementing this roadmap"
  }}
}}"""

    result_text = call_llm(prompt, system, max_tokens=6000)
    report = extract_json(result_text)

    if not report or not report.get("overall_score"):
        print("  LLM returned empty — using defaults")
        report = {
            "overall_score": 40, "grade": "D", "lam_score": 30,
            "ada_score": 40, "soc_score": 35, "conversion_score": 35,
            "performance_score": 40, "content_score": 40,
            "executive_brief": {
                "urgency": "High",
                "one_line_verdict": f"Audit of {target_url} completed with limited data",
                "plain_english_summary": "The LAM agent visited the site but encountered issues analysing the content.",
                "estimated_monthly_revenue_lost": "Unknown",
                "top_5_actions": ["Review site accessibility", "Add cookie consent", "Improve contact visibility", "Add pricing page", "Add testimonials"]
            }
        }

    # ── Save to Supabase ──────────────────────────────────────────────────────
    print("\n[4/4] Saving 10-section report to Supabase...")
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
        "conversion_score": report.get("conversion_score", 0),
        "executive_brief": report.get("executive_brief", {}),
        "client_experience": report.get("client_experience", {}),
        "ada_report": report.get("ada_report", {}),
        "soc_report": report.get("soc_report", {}),
        "competitive_intel": report.get("competitive_intel", {}),
        "strengths": report.get("strengths", []),
        "roadmap": report.get("roadmap", {}),
        "raw_data": {
            "browser_data": {k: v for k, v in primary.items() if k not in ["page_texts", "pages", "screenshots"]},
            "pages_crawled": len(pages_list),
            "countries_scanned": len(all_country_data),
            "has_country_selector": has_country_selector,
            "elapsed_seconds": int(time.time() - audit_start),
            "screenshot_urls": screenshot_urls,
            "performance_report": report.get("performance_report", {}),
            "content_quality": report.get("content_quality", {}),
            "tech_stack": report.get("tech_stack", {}),
            "multi_region": report.get("multi_region", {}),
        },
        "completed_at": datetime.now().isoformat()
    }

    if run_id:
        supabase_update(run_id, result_data)
    else:
        run_id = supabase_insert({**result_data, "url": target_url, "triggered_by": "docker-local", "user_id": user_id})

    elapsed_total = int(time.time() - audit_start)
    print("=" * 70)
    print(f"LAM v6 COMPLETE — {elapsed_total}s total")
    print(f"Pages: {total_pages} | Regions: {len(all_country_data)} | Country selector: {has_country_selector}")
    print(f"Overall: {score}/100 | Grade: {report.get('grade')} | Run ID: {run_id}")
    print(f"LAM: {report.get('lam_score')} | ADA: {report.get('ada_score')} | SOC: {report.get('soc_score')} | Conv: {report.get('conversion_score')}")
    print("=" * 70)

if __name__ == "__main__":
    target = sys.argv[1] if len(sys.argv) > 1 else "https://klaro.services"
    asyncio.run(run_lam_audit(target))
