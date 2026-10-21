# PromptReel launch configuration

Newsletter is free. No trial, card, UPI, payment integration, or automatic billing is enabled.

## Connected Supabase project

- Organization: Ritish
- Project: PromptReel
- Ref: uqwolvmvfufjrrhxpxbt
- Region: Mumbai (ap-south-1)
- Public configuration: data/supabase_public.json. This contains only a publishable key; it is intentionally browser-safe.
- Schema and operations are recorded in supabase/schema.sql and supabase/operations.sql. They were applied through the Supabase plugin. Do not blindly replay these files on the existing project.
- Access verification: supabase/verify_access.sql uses disposable fixtures inside a rolled-back transaction.
- Private storage bucket: promptreel-private.
- Daily repository snapshot: 07:00 IST. Weekly editorial draft: Monday 10:00 IST.
- Edge Function promptreel-jobs implements its own admin/job-secret authentication. Its gateway JWT check is disabled because scheduled requests use a private job secret.
- Job secret remains in a private database table. It is not present in source, browser configuration, or this document.

## Required before public email signup

1. Verify the Supabase Auth Site URL is https://promptreels.vercel.app. It was saved during setup, but could not be rechecked after browser access was disabled.
2. Allow https://promptreels.vercel.app/signin/ as an auth redirect. Add local preview URLs only when needed. Keep email confirmation enabled.
3. Configure a real SMTP provider. Supabase's default mail server is restricted to authorized team email addresses and is not a public newsletter service.
4. Configure a verified sender domain with the provider's required DNS records. Suggested sender identity: PromptReel Weekly · Ritish Kurma. Reply-to is kurmaritish017@gmail.com.
5. Test sign-in, confirmation, checkbox consent, duplicate signup, unsubscribe, logout, and account isolation. Only then set PR_EMAIL_AUTH_ENABLED=true in Vercel and rebuild. Public email forms are paused by default; existing verified sessions still work.
6. Optional Google auth requires the provider configuration in Supabase. Then build with PR_GOOGLE_AUTH_ENABLED=true. It remains hidden otherwise.
7. Do not claim public signup or email delivery is operational until a real confirmation and a real opted-in test issue have been received.

A signup without the newsletter box creates only an account. A checked box records pending intent; subscription is saved only after confirmed Supabase sign-in. Subscribers can stop emails without deleting their account.

## Newsletter operations

The scheduled function fetches the weekly GitHub Trending subset and credited creative examples, then saves JSON to pr_issues with status draft. It never sends email. The first live function run created an issue with three repositories and three examples.

At /admin/, the owner account can review and approve drafts, then explicitly publish an approved web edition. Publishing a web edition does not send email. Published issues cannot be reapproved from the editor. Preview links use /newsletter/issue/?id=ISSUE_ID. RLS restricts unpublished drafts to the editor. Public archives show only published rows.

newsletter/render.py is the email template. It uses email-safe table layouts, source links, readable prompts, linked video posters, and Ritish's name/contact links. Email clients do not reliably support inline video; posters open watch pages.

scripts/send_newsletter.py remains disabled unless --send and NEWSLETTER_SEND_ENABLED=true are both supplied. Required server-only settings: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, RESEND_API_KEY, NEWSLETTER_FROM, and PR_DOMAIN. Store secrets in a proper provider/host secret manager, never in Git or chat. The sender paginates active consented subscribers, rechecks suppression, records delivery, and uses provider idempotency. Uncertain deliveries older than the provider's retry window require manual review. Configure provider bounce/complaint suppression before volume sending.

## Promotions

Book by email: kurmaritish017@gmail.com.
- Product card: introductory ₹499 per seven days.
- Featured homepage launch: introductory ₹999 per seven days.
- Maximum five active products, including at most one featured homepage campaign.
- Set approved campaigns in data/sponsors.json. Each needs id, name, description, HTTPS url, starts, ends, and optional tier=featured.
- No invented client logos, visitor counts, sales, or reach guarantees.
- Actual campaigns receive sponsor_impression and sponsor_click events with campaign and slot IDs. Empty sales placeholders use promotion_interest instead.
- Newsletter placement is quoted only when delivery is configured. Never sell a placement that cannot be delivered.

## Domain and indexing

The intended purchase is promptreels.in (plural). It has not been purchased or connected by this work. After ownership is confirmed, copy the exact DNS records shown by Vercel, add the HTTPS origin in Supabase Auth, rebuild with PR_DOMAIN=https://promptreels.in, and redirect alternate origins. Verify Search Console and submit the sitemap. Do not add an unowned domain to auth redirects.

SEO fixes cover UTF-8 builds, valid upload dates, safe JSON-LD, internal links, consistent domain-derived structured data, source wording, and honest ranking scope. Indexing and Google position are not guaranteed. llms.txt is supporting documentation, not an AI-ranking switch.

## Legacy audience records

New code no longer reads or writes the old public Blob store. The three legacy objects (420 bytes, categories state and subs) were copied into promptreel-private. Every copy passed SHA-256 validation and read-back verification. After user authorization, all three public originals were deleted; a new inventory confirmed zero remaining objects. No legacy email address was subscribed automatically. The temporary migration route and Blob dependency were removed. The private scheduled-job secret was rotated, which invalidates the migration bridge on older previews.

Standard Vercel Authentication protection is enabled for generated deployment URLs and previews. Production domains stay public. Anonymous requests to the prior production deployment and a prior preview returned HTTP 302 to https://vercel.com/sso-api; production /api/stats remained publicly accessible with HTTP 200. Preserve private backups and unsubscribe suppression. See https://vercel.com/docs/deployment-protection/methods-to-protect-deployments/vercel-authentication.

## Build and verification

    cd api_src
    npm ci
    npx esbuild browser-client.js --bundle --minify --format=esm --outfile=../static/supabase-client.js
    cd ..
    python build.py
    python -m unittest discover -s tests -p '*checks.py'
    node --test api_src/tests/security.test.mjs
    node api_src/dev-server.mjs

The build generates the browser client from the exact pinned Supabase SDK. Package versions and lockfile are committed. The static build is network-independent once repo snapshots exist; collect fresh snapshots with node api_src/collect-repos.mjs.

## Deployment boundary

Deploy source and tests to a review branch. Preview deployment includes public/ contents and api_src/api + api_src/lib, with api_src/package.json and its lockfile at the deployment root. No legacy Blob token is needed by the replacement API. Do not disable deployment protection in a script.

An SMTP provider, final auth redirect configuration, real email acceptance tests, and domain ownership remain launch gates. Email signup stays visibly paused until these email gates pass. Generated deployment URLs require Vercel access; use the production domain for public browsing. There is no paid X ingestion or broad competitor scraping. New creator submissions enter a private moderation queue; publication requires source and permission review.
