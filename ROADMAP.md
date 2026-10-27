# AskDocs roadmap

Derived from the six steps in [`docs/tech-stack.svg`](docs/tech-stack.svg).
Tick a box only when the milestone's acceptance criteria pass.

## Current state

| Step | Technologies | Status |
| --- | --- | --- |
| 1. Foundations | Git, Linux, HTML, CSS, Tailwind, JS, TS | Basics done in `lesson1`, `lesson4`. Tailwind not introduced yet. |
| 2. Frontend | React, Next.js | Chat and documents pages exist in `askdocs/`. |
| 3. Backend and data | Node.js, Express, PostgreSQL, Prisma, Redis, Socket.IO | Express basics done. PostgreSQL + Prisma in progress. No Redis or Socket.IO yet. |
| 4. AI layer | Python, FastAPI, pgvector, Ollama | Not started. |
| 5. Security | OWASP | Request validation with Zod and CORS whitelist exist. Full pass pending. |
| 6. DevOps | Docker, GitHub Actions, Caddy, Prometheus, Grafana | Postgres runs in Docker. The rest is pending. |

## Milestones

- [ ] **M1 - Chat persistence** (current)
  Next.js chat -> Express -> Prisma -> PostgreSQL. History survives refreshes and
  API restarts. Guide: `docs/milestones/01-chat-persistence.md`.

- [ ] **M2 - Documents**
  Upload, list, and delete documents. Store metadata in Postgres and files on
  disk (or object storage). Link messages to a document.

- [ ] **M3 - AI answers**
  Python FastAPI service: chunk documents, embed with Ollama, store vectors in
  pgvector, answer questions with sources. Express calls the AI service.

- [ ] **M4 - Realtime**
  Socket.IO between the browser and Express so answers stream and multiple
  clients stay in sync. Cache hot data in Redis.

- [ ] **M5 - Security pass**
  OWASP checklist: auth, rate limiting, input validation everywhere, file-upload
  limits, security headers, secret handling, dependency audit.

- [ ] **M6 - Ship and watch**
  Dockerfiles and Compose for the whole stack, GitHub Actions CI, Caddy reverse
  proxy with HTTPS, Prometheus metrics and a Grafana dashboard.

## Later

- Tailwind migration for the frontend
- Tests (API integration tests with the real database, frontend tests)
- Seed data and a demo script
