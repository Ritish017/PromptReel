#!/usr/bin/env python3
"""One-time import: creator posts listed on prompt-motion.com -> data/imported.json.
Keeps creator credit + X link; thumbnails/likes come from the creator's own X post (fxtwitter)."""
import re, json, time, html, urllib.request, os, concurrent.futures as cf
ROOT = os.path.dirname(os.path.abspath(__file__))
UA = {"User-Agent": "Mozilla/5.0 PromptReelImporter"}
def get(u, t=25):
    for i in range(3):
        try:
            return urllib.request.urlopen(urllib.request.Request(u, headers=UA), timeout=t).read().decode("utf-8", "ignore")
        except Exception:
            time.sleep(2 + i * 3)
    return ""
home = get("https://prompt-motion.com/")
slugs = list(dict.fromkeys(re.findall(r'href="/([a-z0-9][a-z0-9-]*-[0-9a-f]{6})"', home)))
print("slugs", len(slugs))
TAGMAP = {"product-ui": "Product UI", "phone": "Phone", "charts": "Charts", "diagrams": "Diagrams", "kinetic-type": "Kinetic type", "shapes": "Shapes",
          "particles": "Particles", "characters": "Characters", "photos": "Photos", "music": "Music", "code": "Code"}
def txt(s): return html.unescape(re.sub(r"<[^>]+>", "", s)).strip()
def one(slug):
    h = get(f"https://prompt-motion.com/{slug}")
    if not h: return None
    m = re.search(r'href="(https://x\.com/([^/"]+)/status/(\d+))"', h)
    if not m: return None
    post, handle, sid = m.groups()
    tags = [TAGMAP[t] for t in dict.fromkeys(re.findall(r'href="/tags/([a-z-]+)"', h)) if t in TAGMAP]
    title = txt((re.search(r"<h1[^>]*>(.*?)</h1>", h, re.S) or [None, ""])[1])
    prompt = ""
    pm = re.search(r"<pre[^>]*>(.*?)</pre>", h, re.S)
    if pm: prompt = txt(pm.group(1))
    skill = ""
    sm = re.search(r"<code[^>]*>(npx skills add[^<]*|[^<]*skills? (?:add|install)[^<]*)</code>", h)
    if sm: skill = txt(sm.group(1))
    repo = (re.search(r'href="(https://github\.com/[^"]+)"', h) or [None, ""])[1]
    def field(name):
        mm = re.search(name + r"</[^>]+>\s*<[^>]+>([^<]+)<", h)
        return txt(mm.group(1)) if mm else ""
    model, stack, posted = field("Model"), field("Stack"), field("Posted")
    fx = {}
    try: fx = json.loads(get(f"https://api.fxtwitter.com/{handle}/status/{sid}") or "{}").get("tweet") or {}
    except Exception: pass
    media = fx.get("media") or {}
    thumb = ((media.get("videos") or [{}])[0].get("thumbnail_url") or (media.get("photos") or [{}])[0].get("url") or "")
    return {"id": slug, "handle": handle, "display_name": (fx.get("author") or {}).get("name", handle), "post_url": post,
            "posted_date": posted, "added": time.strftime("%Y-%m-%d", time.gmtime(fx["created_timestamp"])) if fx.get("created_timestamp") else "",
            "model": model or "Claude Opus 5.5", "stack": stack, "type": "skill" if (skill and not prompt) else "prompt",
            "title_src": title, "title": title, "prompt_text": prompt, "skill": skill, "repo": repo, "tags": tags,
            "likes": fx.get("likes", 0), "image_url": thumb, "source": "x"}
out = []
with cf.ThreadPoolExecutor(6) as ex:
    for r in ex.map(one, slugs):
        if r: out.append(r)
json.dump(out, open(os.path.join(ROOT, "data", "imported.json"), "w"), indent=1, ensure_ascii=False)
print("imported", len(out), "with prompt", sum(bool(x["prompt_text"]) for x in out), "with thumb", sum(bool(x["image_url"]) for x in out))
