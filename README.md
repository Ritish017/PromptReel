# PromptReel

A free gallery of creative AI examples, shared prompts, agent skills, and useful GitHub projects. Curated by Ritish Kurma (Rynavo).

## This launch update

- Supabase verified identity, private audience records, explicit newsletter consent, owner-only saved libraries, and signed-in community actions.
- Free weekly field notes with repository descriptions and weekly Trending gains, credited creative examples, linked video posters, and practical build ideas.
- Daily repo snapshots and Monday editorial drafts in Supabase; no email is sent until a provider is configured.
- Bounded section previews, safe structured data, normalized video dates, consistent canonical origins, and source-aware copy.
- Email-booked product promotion: up to five active products; launch pricing from ₹499 per week. No reader payments.

## Build

    npm ci
    npm run build
    node api_src/dev-server.mjs

## Verify

    python -m unittest discover -s tests -p '*checks.py'
    npm test

Read DEPLOYMENT.md for the connected Supabase project, SMTP and auth URL gates, domain migration, newsletter operations, legacy audience cleanup, and promotion setup. No secrets belong in source.

Videos, prompts, and skills belong to their credited creators. Verify original sources and applicable creator terms before reuse.
