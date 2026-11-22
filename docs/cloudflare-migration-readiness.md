# AskDocs — migration readiness (NO PRODUCTION CUTOVER)

## Current confirmed architecture
- Next.js 16.4.6 with API routes, server-rendered/authenticated pages, `pdf-parse`, Prisma 7, PostgreSQL/pgvector, bcryptjs, Redis/BullMQ, and server-side document ownership controls.
- Active Render service `askdocs` at `https://askdocs-staging-violet.onrender.com` is **billing-suspended** after the shared workspace exhausted its monthly free bandwidth.
- Cloudflare Pages static assets do **not** provide a compatible replacement for these dynamic server features.
- Cloudflare Workers Next.js options (e.g. vinext) need a **separate compatibility test**, including PDF ingestion, Node/native modules, database connection, background jobs, and free-plan limits. Nothing has been converted to Workers here.

## Safe parallel plan
1. Preserve Render service ID, existing repo, deploy commit and URL. Do not rotate production session secrets or change access logic during migration.
2. Capture **encrypted** Postgres backup and validate restore to a throwaway **tester** DB before any migrations. Keep original Neon branch untouched.
3. Verify permissions for two users and ensure cross-user document access remains blocked. Exercise file upload -> parse -> chunk -> pgvector indexing -> source-cited answer.
4. Choose a server runtime that can run the current Node/Next stack, Redis workers and database connectivity within a genuine free plan. Avoid promising zero cost without checking resource limits.
5. Launch a **new preview URL** and use copied *test* data only. Do not share live user documents publicly.
6. Test auth, signed sessions, migrations, rate limiting, chunking, queues, RAG response, source links, fail-closed missing document.
7. Only cut over with explicit approval, post-migration monitoring and rollback to prior hostname.

## BLOCKED
No Cloudflare account/Workers runtime is connected to this ChatGPT session and no qualified replacement for server-side background jobs was verified. **This file is architecture-only, not a deployment.**
