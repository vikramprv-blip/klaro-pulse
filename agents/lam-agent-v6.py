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
SAMBANOVA_KEY = os.getenv("SAMBANOVA_API_KEY", "32d5cbc4-2c1a-41c3-9546-4c02db49d338")

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
                json={"model": "llama3.3-70b", "messages": messages,
                      "response_format": {"type": "json_object"}, "temperature": 0.2, "max_tokens": max_tokens},
                timeout=60
            )
            r.raise_for_status()
            print("  LLM: Cerebras llama-3.3-70b")
            return r.json()["choices"][0]["message"]["content"]
        except Exception as e:
            print(f"  Cerebras failed: {e}")

    # 3. SambaNova
    if SAMBANOVA_KEY:
        try:
            import requests as _req
            r = _req.post("https://api.sambanova.ai/v1/chat/completions",
                headers={"Authorization":f"Bearer {SAMBANOVA_KEY}","Content-Type":"application/json","Accept":"application/json"},
                json={"model":"Meta-Llama-3.3-70B-Instruct","messages":messages,"temperature":0.2,"max_tokens":min(max_tokens,4000)},
                timeout=60)
            if r.status_code==200:
                print("  LLM: SambaNova Llama-3.3-70B ✓")
                return r.json()["choices"][0]["message"]["content"]
            else: print(f"  SambaNova: {r.status_code}")
        except Exception as e: print(f"  SambaNova failed: {e}")

    # 4. Groq 8b fallback
    if GROQ_KEY:
        try:
            from groq import Groq
            client = Groq(api_key=GROQ_KEY)
            r = client.chat.completions.create(model="llama-3.1-8b-instant",messages=messages,
                response_format={"type":"json_object"},temperature=0.2,max_tokens=min(max_tokens,4000))
            print("  LLM: Groq 8b ✓")
            return r.choices[0].message.content
        except Exception as e: print(f"  Groq 8b failed: {e}")

    # 5. Groq mixtral fallback
    if GROQ_KEY:
        try:
            from groq import Groq
            client = Groq(api_key=GROQ_KEY)
            r = client.chat.completions.create(
                model="mixtral-8x7b-32768",
                messages=messages,
                response_format={"type":"json_object"},
                temperature=0.2,
                max_tokens=min(max_tokens,4000))
            print("  LLM: Groq mixtral ✓")
            return r.choices[0].message.content
        except Exception as e: print(f"  Groq mixtral failed: {e}")

    print("  ⚠ All LLMs failed")
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

    import requests as _hdr_req
    try:
        _hdr_r = _hdr_req.head(target_url, timeout=8, allow_redirects=True)
        _hdrs = {k.lower(): v for k, v in _hdr_r.headers.items()}
    except:
        _hdrs = {}
    _header_tech = {
        "vercel": "x-vercel-id" in _hdrs or "x-vercel-cache" in _hdrs,
        "cloudflare": "cf-ray" in _hdrs,
        "nextjs": "next.js" in _hdrs.get("x-powered-by", "").lower(),
        "nginx": "nginx" in _hdrs.get("server", "").lower(),
        "apache": "apache" in _hdrs.get("server", "").lower(),
        "shopify": "myshopify" in target_url or "shopify" in _hdrs.get("x-shopid", "").lower(),
        "wordpress": "wordpress" in _hdrs.get("x-powered-by", "").lower(),
        "office365": "outlook" in _hdrs.get("x-ms-exchange-organization", "").lower() or "protection.outlook.com" in _hdrs.get("received", "").lower(),
        "server_raw": _hdrs.get("server", ""),
        "powered_by_raw": _hdrs.get("x-powered-by", ""),
    }

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
        "errors": [],
        "header_tech": _header_tech
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

                # Desktop screenshot
                try:
                    shot_bytes = await page.screenshot(full_page=False, type="jpeg", quality=75)
                    data["screenshots"]["desktop_home"] = shot_bytes
                    print(f"    📷 Screenshot: desktop ({len(shot_bytes)//1024}KB)")
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

    # ── Phase 4a: Functional testing + screenshots ───────────────────────
    print(f"  {label_prefix}Phase 4a: Functional testing + page screenshots")
    functional_results = {
        "signup_flow": "Not tested", "login_flow": "Not tested",
        "contact_form": "Not tested", "cta_click": "Not tested",
        "search": "Not tested", "navigation": "Not tested",
        "pricing_page": "Not tested", "404_page": "Not tested",
    }
    page_screenshots = {}

    async def take_screenshot(label, pg=None):
        try:
            _pg = pg or page
            shot = await _pg.screenshot(full_page=False, type="jpeg", quality=75)
            page_screenshots[label] = shot
            print(f"    📷 {label} ({len(shot)//1024}KB)")
        except Exception as e:
            print(f"    📷 {label} failed: {e}")

    try:
        await page.goto(target_url, wait_until="domcontentloaded", timeout=20000)
        await page.wait_for_timeout(2000)

        # CTA detection
        for sel in ["a[href*='signup']","a[href*='sign-up']","a[href*='register']",
                    "button:has-text('Get Started')","a:has-text('Get Started')",
                    "button:has-text('Sign up')","a:has-text('Sign up')",
                    "button:has-text('Try')","a:has-text('Book')"]:
            try:
                cta = page.locator(sel).first
                if await cta.count() > 0:
                    cta_text = await cta.inner_text()
                    cta_href = await cta.get_attribute("href") or ""
                    functional_results["cta_click"] = f"Found CTA '{cta_text[:50]}' linking to {cta_href[:80]}"
                    break
            except: pass

        # Pricing page
        pricing_pages = [p["url"] for p in data.get("pages",[]) if any(x in p["url"].lower() for x in ["pricing","price","plans","packages"])]
        if pricing_pages:
            try:
                await page.goto(pricing_pages[0], wait_until="domcontentloaded", timeout=15000)
                await page.wait_for_timeout(2000)
                await take_screenshot("pricing_page")
                pricing_text = await page.evaluate("() => document.body.innerText.slice(0, 500)")
                functional_results["pricing_page"] = f"Visited {pricing_pages[0]}. Content: {pricing_text[:300]}"
                await page.goto(target_url, wait_until="domcontentloaded", timeout=15000)
            except Exception as e:
                functional_results["pricing_page"] = f"Pricing page error: {str(e)[:80]}"
        else:
            functional_results["pricing_page"] = "No pricing page found — pricing not publicly available"

        # Signup flow
        signup_pages = [p["url"] for p in data.get("pages",[]) if any(x in p["url"].lower() for x in ["signup","sign-up","register","get-started","trial"])]
        if signup_pages:
            try:
                await page.goto(signup_pages[0], wait_until="domcontentloaded", timeout=15000)
                await page.wait_for_timeout(2000)
                await take_screenshot("signup_page")
                fields = await page.evaluate("""() => {
                    const inputs = Array.from(document.querySelectorAll('input:not([type=hidden])'));
                    return inputs.map(i => ({type: i.type, placeholder: i.placeholder, name: i.name})).slice(0,8);
                }""")
                field_desc = ", ".join([f"{f['type']}({f.get('placeholder') or f.get('name') or 'unnamed'})" for f in fields]) or "no fields found"
                filled = []
                for sel, val in [
                    ("input[type='email']", "test.audit@example.com"),
                    ("input[type='text']", "Test Auditor"),
                    ("input[type='password']", "TestPass123!"),
                ]:
                    try:
                        el = page.locator(sel).first
                        if await el.count() > 0:
                            await el.fill(val)
                            filled.append(sel.split("'")[1])
                    except: pass
                functional_results["signup_flow"] = f"Visited {signup_pages[0]}. Fields: {field_desc}. Filled {len(filled)}: {', '.join(filled) if filled else 'none'}."
                await page.goto(target_url, wait_until="domcontentloaded", timeout=15000)
            except Exception as e:
                functional_results["signup_flow"] = f"Signup at {signup_pages[0]} — error: {str(e)[:100]}"
        else:
            functional_results["signup_flow"] = "No signup page found across all crawled pages"

        # Login flow
        login_pages = [p["url"] for p in data.get("pages",[]) if any(x in p["url"].lower() for x in ["login","signin","sign-in","auth"])]
        if login_pages:
            try:
                await page.goto(login_pages[0], wait_until="domcontentloaded", timeout=15000)
                await page.wait_for_timeout(2000)
                await take_screenshot("login_page")
                em = page.locator("input[type='email'], input[name*='email'], input[name*='username']").first
                pw = page.locator("input[type='password']").first
                has_email = await em.count() > 0
                has_pw = await pw.count() > 0
                social = await page.evaluate("""() => {
                    const t = document.body.innerText.toLowerCase();
                    const b = Array.from(document.querySelectorAll('button,a')).map(x=>x.innerText.toLowerCase());
                    return {google:b.some(x=>x.includes('google')),github:b.some(x=>x.includes('github')),
                            sso:t.includes('sso')||t.includes('saml'),forgot:t.includes('forgot')||t.includes('reset password')}
                }""")
                extras = [k for k,v in social.items() if v]
                functional_results["login_flow"] = (
                    f"Visited {login_pages[0]}. Email: {'✓' if has_email else '✗'}, Password: {'✓' if has_pw else '✗'}. "
                    f"Extras: {', '.join(extras) if extras else 'none'}."
                )
                await page.goto(target_url, wait_until="domcontentloaded", timeout=15000)
            except Exception as e:
                functional_results["login_flow"] = f"Login at {login_pages[0]} — error: {str(e)[:100]}"
        else:
            functional_results["login_flow"] = "No login page found — site may not have authenticated area"

        # Contact form
        contact_pages = [p["url"] for p in data.get("pages",[]) if any(x in p["url"].lower() for x in ["contact","reach","touch","demo","book","schedule"])]
        if contact_pages:
            try:
                await page.goto(contact_pages[0], wait_until="domcontentloaded", timeout=15000)
                await page.wait_for_timeout(2000)
                await take_screenshot("contact_page")
                filled = []
                for sel, val in [
                    ("input[type='email']","test.audit@example.com"),
                    ("input[type='text']","Test Auditor"),
                    ("textarea","Testing contact form as part of a website audit."),
                ]:
                    try:
                        el = page.locator(sel).first
                        if await el.count() > 0:
                            await el.fill(val)
                            filled.append(sel.split("'")[1])
                    except: pass
                functional_results["contact_form"] = f"Visited {contact_pages[0]}. Filled {len(filled)} fields: {', '.join(filled) if filled else 'none found'}."
                await page.goto(target_url, wait_until="domcontentloaded", timeout=15000)
            except Exception as e:
                functional_results["contact_form"] = f"Contact error: {str(e)[:100]}"
        else:
            functional_results["contact_form"] = "No contact page found — major conversion barrier"

        # 404 test
        try:
            await page.goto(f"{target_url}/klaro-test-404-xyz", wait_until="domcontentloaded", timeout=10000)
            await page.wait_for_timeout(1000)
            await take_screenshot("404_page")
            has_nav = await page.evaluate("() => document.querySelectorAll('nav a, header a').length > 0")
            page_text = await page.evaluate("() => document.body.innerText.slice(0,150)")
            functional_results["404_page"] = f"404 page: has navigation {'Yes' if has_nav else 'No — users get stranded'}. Content: {page_text[:100]}"
            await page.goto(target_url, wait_until="domcontentloaded", timeout=15000)
        except Exception as e:
            functional_results["404_page"] = f"404 test error: {str(e)[:80]}"

        # Navigation
        nav_labels = await page.evaluate("""() =>
            Array.from(document.querySelectorAll('nav a, header a'))
                .map(a => a.innerText.trim()).filter(Boolean).slice(0,15)""")
        functional_results["navigation"] = (
            f"{len(data.get('nav_links',[]))} nav links. Items: {', '.join(nav_labels[:10]) if nav_labels else 'none'}. "
            f"{'Minimal navigation — may hinder discovery.' if len(data.get('nav_links',[])) < 4 else 'Navigation structure adequate.'}"
        )

        data["page_screenshots"] = page_screenshots
        data["functional_results"] = functional_results
        print(f"    ✓ Functional tests done — {len(page_screenshots)} screenshots taken")
    except Exception as e:
        print(f"    Functional error: {e}")
        data["functional_results"] = functional_results
        data["page_screenshots"] = page_screenshots

    # ── Phase 4b: axe-core + ARIA ────────────────────────────────────────────
    try:
        print(f"  {label_prefix}Phase 4b: axe-core + ARIA")
        await page.goto(target_url, wait_until="domcontentloaded", timeout=20000)
        await page.wait_for_timeout(3000)
        axe_path = "/app/axe.min.js"
        if os.path.exists(axe_path):
            await page.add_script_tag(path=axe_path)
        else:
            await page.add_script_tag(url="https://cdnjs.cloudflare.com/ajax/libs/axe-core/4.9.1/axe.min.js")
        await page.wait_for_timeout(2000)
        axe_results = await page.evaluate("""async () => {
            try {
                const r = await axe.run(document,{runOnly:{type:'tag',values:['wcag2a','wcag2aa','wcag21a','wcag21aa','best-practice']}});
                return {violations:r.violations.map(v=>({id:v.id,impact:v.impact,help:v.help,helpUrl:v.helpUrl,nodes_count:v.nodes.length,nodes_sample:v.nodes.slice(0,2).map(n=>({html:n.html.slice(0,150),target:n.target.join(', ')}))})),
                passes_count:r.passes.length,violations_count:r.violations.length,
                critical_count:r.violations.filter(v=>v.impact==='critical').length,
                serious_count:r.violations.filter(v=>v.impact==='serious').length,
                moderate_count:r.violations.filter(v=>v.impact==='moderate').length,
                minor_count:r.violations.filter(v=>v.impact==='minor').length};
            } catch(e){return {error:e.message,violations:[],violations_count:0};}
        }""")
        data["axe_results"] = axe_results
        aria_audit = await page.evaluate("""() => {
            const navEls=Array.from(document.querySelectorAll('nav,[role="navigation"]'));
            const mainEls=document.querySelectorAll('main,[role="main"]');
            const buttons=Array.from(document.querySelectorAll('button,[role="button"]'));
            const links=Array.from(document.querySelectorAll('a[href]'));
            return {main_count:mainEls.length,missing_main:mainEls.length===0,duplicate_main:mainEls.length>1,
            nav_count:navEls.length,unlabelled_navs:navEls.filter(n=>!n.getAttribute('aria-label')&&!n.getAttribute('aria-labelledby')).length,
            buttons_without_label:buttons.filter(b=>!b.innerText.trim()&&!b.getAttribute('aria-label')&&!b.getAttribute('title')).length,
            ambiguous_links:links.filter(a=>['click here','here','read more','more'].includes(a.innerText.trim().toLowerCase())).map(a=>a.innerText.trim()).slice(0,5),
            svgs_without_title:Array.from(document.querySelectorAll('svg')).filter(s=>!s.querySelector('title')&&!s.getAttribute('aria-label')).length,
            positive_tabindex:Array.from(document.querySelectorAll('[tabindex]')).filter(e=>parseInt(e.getAttribute('tabindex')||'0')>0).length,
            has_live_region:document.querySelectorAll('[aria-live],[role="alert"]').length>0};
        }""")
        data["aria_audit"] = aria_audit
        tab_order = []
        await page.keyboard.press("Tab")
        for i in range(15):
            try:
                f = await page.evaluate("""()=>{const el=document.activeElement;if(!el||el===document.body)return null;return {tag:el.tagName,text:(el.innerText||el.getAttribute('aria-label')||'').slice(0,40)};} """)
                if f: tab_order.append(f)
                await page.keyboard.press("Tab")
            except: pass
        data["keyboard_nav"] = {"tab_order":tab_order[:15],"tab_stops_count":len(tab_order)}
        aria_issues = []
        if aria_audit.get("missing_main"): aria_issues.append("No <main> landmark")
        if aria_audit.get("unlabelled_navs",0)>0: aria_issues.append(f"{aria_audit['unlabelled_navs']} unlabelled nav regions")
        if aria_audit.get("buttons_without_label",0)>0: aria_issues.append(f"{aria_audit['buttons_without_label']} buttons without label")
        if aria_audit.get("svgs_without_title",0)>0: aria_issues.append(f"{aria_audit['svgs_without_title']} SVGs without title")
        if aria_audit.get("positive_tabindex",0)>0: aria_issues.append(f"{aria_audit['positive_tabindex']} positive tabindex")
        if not aria_audit.get("has_live_region"): aria_issues.append("No ARIA live regions")
        data["aria_issues"] = aria_issues
        print(f"    axe: {axe_results.get('violations_count',0)} violations, ARIA: {len(aria_issues)} issues, tabs: {len(tab_order)}")
    except Exception as e:
        print(f"    axe/ARIA failed: {e}")
        data["axe_results"]={}; data["aria_audit"]={}; data["aria_issues"]=[]; data["keyboard_nav"]={}

    # ── Phase 4b.5: Email security (SPF / DKIM / DMARC) ────────────────────
    print(f"  {label_prefix}Phase 4b.5: Email security audit")
    import dns.resolver as _dns
    from urllib.parse import urlparse as _urlparse
    _domain = _urlparse(target_url).netloc.replace("www.", "")
    email_security = {"spf": {}, "dkim": {}, "dmarc": {}}
    try:
        spf_ans = _dns.resolve(_domain, "TXT")
        for r in spf_ans:
            txt = r.to_text().strip('"')
            if txt.startswith("v=spf1"):
                email_security["spf"] = {"configured": True, "value": txt, "is_permissive": "+all" in txt}
                break
        if not email_security["spf"]:
            email_security["spf"] = {"configured": False}
    except:
        email_security["spf"] = {"configured": False}
    try:
        dmarc_ans = _dns.resolve(f"_dmarc.{_domain}", "TXT")
        for r in dmarc_ans:
            txt = r.to_text().strip('"')
            if "DMARC1" in txt:
                import re as _re
                pol = _re.search(r'p=(\w+)', txt)
                email_security["dmarc"] = {"configured": True, "value": txt, "policy": pol.group(1) if pol else "none"}
                break
        if not email_security["dmarc"].get("configured"):
            email_security["dmarc"] = {"configured": False}
    except:
        email_security["dmarc"] = {"configured": False}
    _dkim_selectors = ["selector1","selector2","google","default","mail","dkim","k1","s1","s2","microsoft","pm","mandrill","sendgrid","mailchimp","smtp","email","amazonses"]
    email_security["dkim"] = {"configured": False}
    for _sel in _dkim_selectors:
        try:
            _dns.resolve(f"{_sel}._domainkey.{_domain}", "TXT")
            email_security["dkim"] = {"configured": True, "selector": _sel}
            print(f"    DKIM found: selector={_sel}")
            break
        except:
            pass
    data["email_security"] = email_security
    print(f"    SPF={email_security['spf'].get('configured')} DKIM={email_security['dkim'].get('configured')} DMARC={email_security['dmarc'].get('configured')}")

    # ── Phase 4c: PageSpeed ──────────────────────────────────────────────────
    pagespeed_data = {}
    try:
        print(f"  {label_prefix}Phase 4c: PageSpeed Insights")
        import requests as _psi
        for strategy in ['mobile','desktop']:
            r = _psi.get(f"https://www.googleapis.com/pagespeedonline/v5/runPagespeed?url={target_url}&strategy={strategy}",timeout=30)
            if r.status_code==200:
                psi=r.json(); cats=psi.get('lighthouseResult',{}).get('categories',{}); audits=psi.get('lighthouseResult',{}).get('audits',{})
                pagespeed_data[strategy]={'performance_score':int((cats.get('performance',{}).get('score',0)or 0)*100),'accessibility_score':int((cats.get('accessibility',{}).get('score',0)or 0)*100),'seo_score':int((cats.get('seo',{}).get('score',0)or 0)*100),'best_practices_score':int((cats.get('best-practices',{}).get('score',0)or 0)*100),'fcp':audits.get('first-contentful-paint',{}).get('displayValue','N/A'),'lcp':audits.get('largest-contentful-paint',{}).get('displayValue','N/A'),'tbt':audits.get('total-blocking-time',{}).get('displayValue','N/A'),'cls':audits.get('cumulative-layout-shift',{}).get('displayValue','N/A'),'tti':audits.get('interactive',{}).get('displayValue','N/A'),'opportunities':[{'title':a.get('title'),'savings':a.get('displayValue')}for k,a in audits.items()if a.get('details',{}).get('type')=='opportunity'and a.get('score',1)<0.9][:5]}
                print(f"    PSI {strategy}: perf={pagespeed_data[strategy]['performance_score']}, seo={pagespeed_data[strategy]['seo_score']}")
    except Exception as e: print(f"    PageSpeed failed: {e}")

    # ── Phase 4d: SEO Audit ──────────────────────────────────────────────────
    print(f"  {label_prefix}Phase 4d: SEO audit")
    try:
        import requests as _seo; from urllib.parse import urlparse as _up
        seo_data={"title_tags":{},"meta_descriptions":{},"h1_tags":{},"thin_content_pages":[],"duplicate_titles":[],"missing_meta":[],"schema_pages":[],"image_issues":[],"sitemap_exists":False,"robots_txt":"","llms_txt":False}
        base=f"{_up(target_url).scheme}://{_up(target_url).netloc}"
        for path,key in [("/sitemap.xml","sitemap"),("/robots.txt","robots"),("/llms.txt","llms")]:
            try:
                r=_seo.get(base+path,timeout=5)
                if key=="sitemap": seo_data["sitemap_exists"]=r.status_code==200
                elif key=="robots": seo_data["robots_txt"]=r.text[:300] if r.status_code==200 else ""
                elif key=="llms": seo_data["llms_txt"]=r.status_code==200
            except: pass
        await page.goto(target_url,wait_until="domcontentloaded",timeout=20000)
        for p_label in list(data.get("page_texts",{}).keys())[:5]:
            try:
                p_url=next((p["url"] for p in data.get("pages",[]) if p.get("label")==p_label),None)
                if p_url and p_url!=page.url:
                    await page.goto(p_url,wait_until="domcontentloaded",timeout=12000); await page.wait_for_timeout(800)
                sp=await page.evaluate("""()=>({title:document.title||"",meta_description:document.querySelector('meta[name="description"]')?.content||"",h1s:Array.from(document.querySelectorAll("h1")).map(h=>h.innerText.trim()).filter(Boolean).slice(0,3),word_count:(document.body?.innerText||"").split(/\s+/).length,has_schema:document.querySelectorAll('script[type="application/ld+json"]').length>0,imgs_no_alt:Array.from(document.querySelectorAll("img")).filter(i=>!i.alt).map(i=>i.src.split("/").pop()?.slice(0,30)||"img").slice(0,3)})""")
                seo_data["title_tags"][p_label]={"value":sp["title"][:80],"length":len(sp["title"]),"ok":10<=len(sp["title"])<=70}
                seo_data["meta_descriptions"][p_label]={"value":sp["meta_description"][:100],"length":len(sp["meta_description"]),"ok":50<=len(sp["meta_description"])<=160}
                seo_data["h1_tags"][p_label]={"h1s":sp["h1s"],"count":len(sp["h1s"]),"ok":len(sp["h1s"])==1}
                if sp["word_count"]<300: seo_data["thin_content_pages"].append({"page":p_label,"words":sp["word_count"]})
                if not sp["title"]: seo_data["missing_meta"].append(f"{p_label}: no title")
                if not sp["meta_description"]: seo_data["missing_meta"].append(f"{p_label}: no meta description")
                if sp["has_schema"]: seo_data["schema_pages"].append(p_label)
                if sp["imgs_no_alt"]: seo_data["image_issues"].extend([f"{p_label}/{img}" for img in sp["imgs_no_alt"]])
            except: pass
        seen={}
        for k,v in seo_data["title_tags"].items():
            t=v["value"]
            if t in seen: seo_data["duplicate_titles"].append(f"{k}={seen[t]}: '{t[:40]}'")
            else: seen[t]=k
        ss=100-(not seo_data["sitemap_exists"])*10-(not seo_data["robots_txt"])*5-(not seo_data["llms_txt"])*5-len(seo_data["duplicate_titles"])*5-len(seo_data["missing_meta"])*3-len(seo_data["thin_content_pages"])*5-len(seo_data["image_issues"])*2
        seo_data["seo_score"]=max(0,min(100,ss))
        data["seo_audit"]=seo_data
        print(f"    SEO: {seo_data['seo_score']}/100, sitemap={'✓' if seo_data['sitemap_exists'] else '✗'}, llms.txt={'✓' if seo_data['llms_txt'] else '✗'}")
        await page.goto(target_url,wait_until="domcontentloaded",timeout=20000)
    except Exception as e: print(f"    SEO failed: {e}"); data["seo_audit"]={}

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
        try:
            await mobile_page.wait_for_timeout(2000)
            mob_shot = await mobile_page.screenshot(full_page=False, type="jpeg", quality=70)
            data["screenshots"]["mobile_home"] = mob_shot
            print(f"    📷 Screenshot: mobile ({len(mob_shot)//1024}KB)")
        except Exception as mse:
            print(f"    Mobile screenshot failed: {mse}")
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
    # Use run ID passed by local runner if available
    run_id = os.getenv("LAM_RUN_ID", None)
    if run_id:
        print(f"  Using runner-provided run_id: {run_id}")
        supabase_update(run_id, {"status": "running", "progress": 5, "progress_message": "Agent starting deep crawl..."})
    else:
        existing = supabase_request("GET", f"lam_runs?url=eq.{encoded_url}&status=eq.pending&order=created_at.desc&limit=1")
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

    # Upload screenshots
    screenshot_urls = {}
    print("\n  Uploading screenshots...")
    for cd in all_country_data:
        country = cd.get('country','main') or 'main'
        all_shots = {}
        all_shots.update(cd.get('screenshots', {}))
        all_shots.update(cd.get('page_screenshots', {}))
        for shot_label, shot_bytes in all_shots.items():
            if not shot_bytes: continue
            try:
                path = f"lam/{run_id}/{country}/{shot_label}.jpg"
                r = req_lib.post(
                    f"{SUPABASE_URL}/storage/v1/object/lam-screenshots/{path}",
                    data=shot_bytes,
                    headers={"apikey":SUPABASE_KEY,"Authorization":f"Bearer {SUPABASE_KEY}","Content-Type":"image/jpeg","x-upsert":"true"},
                    timeout=30
                )
                if r.status_code in [200,201]:
                    screenshot_urls[f"{country}_{shot_label}"] = f"{SUPABASE_URL}/storage/v1/object/public/lam-screenshots/{path}"
                    print(f"    ✓ Uploaded {shot_label} ({len(shot_bytes)//1024}KB)")
                else:
                    print(f"    ✗ Upload failed {shot_label}: {r.status_code}")
            except Exception as e:
                print(f"    ✗ Upload error: {e}")

    print(f"\n  Browse complete: {total_pages} pages across {len(all_country_data)} region(s) in {elapsed_browse}s")

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

HTTP HEADERS TECH DETECTION: {json.dumps(primary.get('header_tech', {}))}

THIRD-PARTY SCRIPTS: {json.dumps(primary['third_party_scripts'][:15])}

PAGES VISITED: {json.dumps([p['url'] for p in pages_list[:25]])}

PAGE CONTENT (up to 12 pages, 1500 chars each):
{page_texts_summary}
{country_summary}

ERRORS DURING CRAWL: {json.dumps(primary['errors'][:5])}

REAL FUNCTIONAL TESTING (Playwright browser interactions):
- Signup: {primary.get('functional_results',{}).get('signup_flow','Not tested')}
- Login: {primary.get('functional_results',{}).get('login_flow','Not tested')}
- Contact form: {primary.get('functional_results',{}).get('contact_form','Not tested')}
- Primary CTA: {primary.get('functional_results',{}).get('cta_click','Not tested')}
- Navigation: {primary.get('functional_results',{}).get('navigation','Not tested')}

KEYBOARD NAV & ARIA AUDIT:
- Tab stops: {primary.get('keyboard_nav',{}).get('tab_stops_count',0)}
- Missing main landmark: {primary.get('aria_audit',{}).get('missing_main','unknown')}
- Unlabelled navs: {primary.get('aria_audit',{}).get('unlabelled_navs',0)}
- Buttons without label: {primary.get('aria_audit',{}).get('buttons_without_label',0)}
- ARIA issues: {json.dumps(primary.get('aria_issues',[]))}

GOOGLE PAGESPEED INSIGHTS:
Desktop: perf={primary.get('pagespeed',{}).get('desktop',{}).get('performance_score','N/A')}, seo={primary.get('pagespeed',{}).get('desktop',{}).get('seo_score','N/A')}, a11y={primary.get('pagespeed',{}).get('desktop',{}).get('accessibility_score','N/A')}
Desktop CWV: FCP={primary.get('pagespeed',{}).get('desktop',{}).get('fcp','N/A')}, LCP={primary.get('pagespeed',{}).get('desktop',{}).get('lcp','N/A')}, TBT={primary.get('pagespeed',{}).get('desktop',{}).get('tbt','N/A')}, CLS={primary.get('pagespeed',{}).get('desktop',{}).get('cls','N/A')}
Mobile: perf={primary.get('pagespeed',{}).get('mobile',{}).get('performance_score','N/A')}, LCP={primary.get('pagespeed',{}).get('mobile',{}).get('lcp','N/A')}

SEO TECHNICAL AUDIT:
- SEO Score: {primary.get('seo_audit',{}).get('seo_score','N/A')}/100
- Sitemap: {primary.get('seo_audit',{}).get('sitemap_exists',False)}
- Robots.txt: {bool(primary.get('seo_audit',{}).get('robots_txt',''))}
- llms.txt: {primary.get('seo_audit',{}).get('llms_txt',False)}
- Duplicate titles: {json.dumps(primary.get('seo_audit',{}).get('duplicate_titles',[]))}
- Missing meta: {json.dumps(primary.get('seo_audit',{}).get('missing_meta',[])[:8])}
- Thin content: {json.dumps(primary.get('seo_audit',{}).get('thin_content_pages',[]))}

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
    "estimated_revenue_at_risk": "Estimate based on observed friction only — NOT a guarantee: $X,000 - $Y,000/month at risk",
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
    "friction_cost_note": "IMPORTANT: Do NOT make specific revenue promises. Instead write: Based on industry conversion benchmarks for [industry type], sites with similar friction patterns typically see [X]% lower conversion than optimised peers. This is an illustrative benchmark only, not a financial projection or guarantee."
  }},
  "soc_readiness": {{
    "overall_readiness": "Not Ready/Partial/Approaching/Ready",
    "narrative": "3-4 sentences on SOC 2 readiness based on publicly observable signals only",
    "cc6_access_control": "What login/auth/access controls are visible? MFA indicators? Session management?",
    "cc7_system_operations": "Error handling quality, uptime indicators, status page, monitoring signals visible",
    "cc2_communication": "Privacy policy quality, terms completeness, cookie consent implementation, data collection transparency",
    "availability": "Is there an SLA or uptime commitment visible? Status page?",
    "encryption": "HTTPS enforced? Certificate quality? Mixed content?",
    "vendor_risk": "Third party scripts that represent data risk",
    "gaps": ["specific gap 1", "specific gap 2", "specific gap 3"],
    "recommended_controls": ["control 1", "control 2", "control 3"]
  }},
  "seo_page_analysis": {{
    "narrative": "3-4 sentences summarising SEO health across all crawled pages",
    "critical_issues": ["issue with specific page URL", "issue with specific element"],
    "title_tag_assessment": "Overall assessment of title tags across crawled pages — cite specific missing/duplicate ones",
    "meta_description_assessment": "Overall assessment of meta descriptions — cite specific pages missing them",
    "heading_structure": "Assessment of H1/H2 hierarchy across pages — cite specific violations",
    "internal_linking": "Assessment of internal link structure quality",
    "content_depth": "Assessment of content depth — which pages are thin, which have good depth",
    "quick_wins": ["specific SEO fix 1 with page URL", "specific fix 2", "specific fix 3", "specific fix 4", "specific fix 5"]
  }},
  "security_assessment": {{
    "narrative": "4-5 sentences on overall security posture based on publicly observable signals",
    "https_quality": "Certificate details, HSTS, mixed content assessment",
    "headers_assessment": "Security headers observable — CSP, X-Frame-Options, referrer policy etc",
    "data_exposure_risk": "PII collection without consent, form security, third party data sharing",
    "authentication_security": "Login page security signals — brute force protection, captcha, MFA options",
    "third_party_risk": "Detailed assessment of each third party script and its data risk",
    "email_security_summary": "SPF/DKIM/DMARC status and what it means for this business specifically",
    "vulnerabilities": ["specific observable vulnerability 1", "specific vulnerability 2"],
    "recommendations": ["specific fix 1", "specific fix 2", "specific fix 3"]
  }}
}}"""

    result_text = call_llm(prompt, system, max_tokens=8000)
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
        "soc_report": {
            **report.get("soc_report", {}),
            "email_security": primary.get("email_security", {}),
            "email_provider": "Office 365" if primary.get("email_security", {}).get("dkim", {}).get("selector", "").startswith(("selector1","selector2","microsoft")) else "Unknown",
        },
        "competitive_intel": report.get("competitive_intel", {}),
        "strengths": report.get("strengths", []),
        "roadmap": report.get("roadmap", {}),

        "raw_data": {
            "browser_data": {k: v for k, v in primary.items() if k not in ["page_texts","pages","screenshots","page_screenshots"]},
            "pages_crawled": len(pages_list),
            "countries_scanned": len(all_country_data),
            "has_country_selector": has_country_selector,
            "elapsed_seconds": int(time.time() - audit_start),
            "screenshot_urls": screenshot_urls,
            "functional_results": primary.get("functional_results", {}),
            "functional_screenshots": {k: v for k, v in screenshot_urls.items() if k not in ["main_desktop_home", "main_mobile_home"]},
            "axe_results": {k:v for k,v in primary.get("axe_results",{}).items() if k!="violations"} if primary.get("axe_results") else {},
            "axe_violations": primary.get("axe_results",{}).get("violations",[]),
            "aria_audit": primary.get("aria_audit",{}),
            "aria_issues": primary.get("aria_issues",[]),
            "keyboard_nav": primary.get("keyboard_nav",{}),
            "seo_audit": dict(primary.get("seo_audit",{})),
            "pagespeed": primary.get("pagespeed", {}),
            "email_security": primary.get("email_security", {}),
            "performance_report": report.get("performance_report", {}),
            "soc_readiness": report.get("soc_readiness", {}),
            "seo_page_analysis": report.get("seo_page_analysis", {}),
            "security_assessment": report.get("security_assessment", {}),
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
