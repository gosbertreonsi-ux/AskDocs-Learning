# AskDocs staging on Vercel (no Render free compute required)

This guide is for the **dedicated AskDocs staging database**. It does not migrate or modify local PDFs, the E-Shop database, ProjectMail, Agrorange, or LeeHub.

## Import

1. Connect the `gosbertreonsi-ux/AskDocs-Learning` repository in Vercel.
2. Set **Root Directory** to `askdocs`.
3. Select the staging code branch `deploy/askdocs-free-staging-20261122` as the production branch; do **not** deploy old `main`.
4. Select Node.js 24.
5. The committed `vercel.json` config installs dependencies and runs `prisma migrate deploy && prisma generate && npm run build`.

## Environment variables (server-side only)

- `DATABASE_URL`: retrieve the TLS Postgres URL from the **askdocs-staging** Neon project; do not paste it into GitHub or ChatGPT.
- `APP_ORIGIN`: exactly `https://YOUR_ACTUAL_VERCEL_HOST` (no trailing slash). Set this after the first deployment provides its actual URL, then redeploy. This is required by same-origin CSRF protection.
- `NODE_ENV`: `production` is set by the hosting runtime.

Do not expose the database URL via any `NEXT_PUBLIC_*` variable. Passwords and session cookies are never stored in browser JS.

## What this deployment provides

- UI, lion icon, account registration, sign-in/sign-out, session isolation, documents and chat interface
- Neon PostgreSQL with the new additive `RateLimitCounter` table for atomic API rate limiting
- CI checks for migrations, TypeScript, and API security

## What still requires separate work

The original indexing pipeline uses a BullMQ worker and Ollama models, neither of which runs inside Vercel's request-only Next.js functions. Redis is not required for login after the rate-limit migration, but the current PDF upload route still expects it for indexing. Do **not** advertise functional PDF Q&A until a secure, reachable AI inference endpoint and durable indexing worker have been deployed and tested.

Free hosted AI providers can have strict quotas and data processing terms; do not send users' private PDFs to a third-party inference provider without deciding on those terms and communicating them clearly.

## Verification

1. Browse `/register` and register a test user (expects HTTP 201 on the API).
2. Log out and log back in (expected HTTP 200 on login).
3. Check `/api/auth/me`: authenticated 200; anonymous 401.
4. Confirm API rate limiting blocks excessive requests with HTTP 429.
5. Verify a second user's document access returns HTTP 404.
6. Validate indexing only after a worker and inference service are available.

Local execution still uses `npm.cmd run dev` from the `askdocs` directory.
