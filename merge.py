#!/usr/bin/env python3
"""Merge new entry files into data/entries.json, dedupe by X status id, enrich from the creator's X post via fxtwitter.
Usage: python3 merge.py file1.json [file2.json ...]   (each a JSON array of entries)"""
import json, os, re, sys, time, hashlib, urllib.request, concurrent.futures as cf
ROOT = os.path.dirname(os.path.abspath(__file__)); DB = os.path.join(ROOT, "data", "entries.json")
TAGS = {"product ui": "Product UI", "phone": "Phone", "charts": "Charts", "diagrams": "Diagrams", "kinetic type": "Kinetic type", "shapes": "Shapes",
        "particles": "Particles", "characters": "Characters", "photos": "Photos", "music": "Music", "code": "Code", "3d": "3D"}
def sid(u):
    m = re.search(r"/status/(\d+)", u or ""); return m.group(1) if m else None
def fx(handle, s):
    try:
        r = urllib.request.urlopen(urllib.request.Request(f"https://api.fxtwitter.com/{handle}/status/{s}", headers={"User-Agent": "PromptReel"}), timeout=20)
        return json.loads(r.read()).get("tweet") or {}
    except Exception:
        return {}
def norm(x):
    x = dict(x)
    x["post_url"] = (x.get("post_url") or "").replace("twitter.com", "x.com").split("?")[0]
    x["handle"] = (x.get("handle") or "").lstrip("@")
    x["tags"] = [TAGS.get(t.strip().lower(), t.strip()) for t in (x.get("tags") or []) if t.strip().lower() in TAGS]
    x["title"] = x.get("title") or x.get("short_title") or "Untitled"
    x["skill"] = x.get("skill") or (x.get("skill_install_or_repo") if not str(x.get("skill_install_or_repo", "")).startswith("http") else "")
    if not x.get("repo") and str(x.get("skill_install_or_repo", "")).startswith("https://github.com"): x["repo"] = x["skill_install_or_repo"]
    x["type"] = "skill" if (x.get("type") == "skill" or (x.get("skill") and not x.get("prompt_text"))) else "prompt"
    if not x.get("id"):
        x["id"] = re.sub(r"[^a-z0-9]+", "-", x["handle"].lower()).strip("-") + "-" + hashlib.md5(x["post_url"].encode()).hexdigest()[:6]
    for k in ("skill_install_or_repo", "short_title"): x.pop(k, None)
    return x
def main(files):
    db = json.load(open(DB)) if os.path.exists(DB) else []
    seen = {sid(x["post_url"]) for x in db if sid(x["post_url"])}
    new = []
    for f in files:
        for x in json.load(open(f)):
            x = norm(x); s = sid(x["post_url"])
            if not s or s in seen or not (x.get("prompt_text") or x.get("skill") or x.get("repo")): continue
            seen.add(s); new.append(x)
    def enrich(x):
        t = fx(x["handle"], sid(x["post_url"]))
        m = t.get("media") or {}
        x["image_url"] = ((m.get("videos") or [{}])[0].get("thumbnail_url") or (m.get("photos") or [{}])[0].get("url") or x.get("image_url", ""))
        x["likes"] = t.get("likes", x.get("likes") or 0) if isinstance(t.get("likes"), int) else 0
        if t.get("author", {}).get("name"): x["display_name"] = t["author"]["name"]
        if t.get("created_timestamp"): x["added"] = time.strftime("%Y-%m-%d", time.gmtime(t["created_timestamp"]))
        x.setdefault("added", time.strftime("%Y-%m-%d")); x["source"] = "x"
        return x
    with cf.ThreadPoolExecutor(6) as ex: new = list(ex.map(enrich, new))
    db += new
    json.dump(db, open(DB, "w"), indent=1, ensure_ascii=False)
    print(f"added {len(new)}; total {len(db)}")
    for x in new: print(" +", x["handle"], x["title"])
if __name__ == "__main__": main(sys.argv[1:])
