# PromptReel

A free gallery of AI-made motion videos, each paired with the exact prompt or agent skill that made it. Live at **https://promptreels.vercel.app**.

## Features
- 254 videos from 233 creators, credited and linked to their original public posts
- Inline video previews that play only while on screen, with a pause toggle
- Combined filters: search (`/`), prompt/skill, topic, made-with platform, shape, saved, and sort (recent, popular on X, most liked, most discussed, shuffle)
- Like, dislike, save and comment on every video (comments use Google sign-in)
- "Make it yours" prompt customizer and Open in Claude
- 16 original, free animated website sections to copy into Claude Code, Cursor or v0
- My Library, Pricing, Help, Privacy, Terms
- SEO/GEO: VideoObject, CreativeWork, BreadcrumbList and ItemList JSON-LD, video sitemap, `llms.txt`, AI-crawler-friendly `robots.txt`

## Structure
- `build.py` generates the static site into `public/` from `data/entries.json` and `data/sections.py`
- `static/` CSS and JS copied into the build
- `api_src/api/` Vercel serverless functions (votes, comments, stats, subscribe) backed by Vercel Blob
- `merge.py` adds new entries (dedupes by X status id); `enrich_video.py` adds video preview URLs
- `deploy.py` deploys `public/` + `api_src/` to Vercel

## Run
```bash
python3 build.py              # builds public/
python3 -m http.server -d public 8000
python3 deploy.py promptreel  # needs a Vercel token
```

## Credits
Videos, prompts and skills belong to their creators. Creators can claim or remove their work via the Submit page.
