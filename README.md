# AskDocs

AskDocs is a document Q&A app used as a hands-on learning project. The target
architecture is described in [`docs/tech-stack.svg`](docs/tech-stack.svg) and
[`docs/askdocs-technology-flow.svg`](docs/askdocs-technology-flow.svg):

```
Browser -> Next.js -> Express API -> Prisma / PostgreSQL
                          |
                          +-> Python AI service (FastAPI, pgvector, Ollama)

Docker + GitHub Actions + Caddy + Prometheus + Grafana, secured with OWASP practices
```

Only the first layers exist today. The plan for the rest is in
[`ROADMAP.md`](ROADMAP.md).

## Folder map

| Path | What it is |
| --- | --- |
| `askdocs/` | Next.js 16 frontend (chat + documents pages), runs on `:3000` |
| `askdocs-api/` | Express 5 API, runs on `:4000` |
| `docs/` | Architecture references and per-milestone guides |
| `lesson1/`, `lesson4/` | Earlier lessons, kept for reference |
| `package.json` | Convenience scripts that run both apps from the root |

## Prerequisites

- Node.js 24 and npm
- PostgreSQL 18 running on `localhost:5432` with a database named `askdocs`.
  On this machine it runs as the Windows service `postgresql-x64-18`.
- Docker Desktop (used for the database container and later milestones)

## First run

```bash
npm run db:generate     # generate the Prisma client from the schema
npm run db:migrate      # create the Message table in Postgres
npm run dev:api         # terminal 1 -> http://localhost:4000
npm run dev:web         # terminal 2 -> http://localhost:3000
```

Useful extras:

```bash
npm run db:studio       # browse the database in Prisma Studio
npm run typecheck       # TypeScript check for the API
curl http://localhost:4000/health
```

## Current milestone

**Milestone 1: wire the chat to Express and persist messages in PostgreSQL.**

Start here: [`docs/milestones/01-chat-persistence.md`](docs/milestones/01-chat-persistence.md).

The shell is in place: schema, database client, typed API client, and route
skeletons. Files marked `TODO` are yours to implement. The app keeps running
with the old in-memory/mock behavior until you switch it over.

## How to work

1. Pick the current milestone in [`ROADMAP.md`](ROADMAP.md).
2. Read its guide in `docs/milestones/`.
3. Write the code for the `TODO`s.
4. Ask for a review and verify the acceptance criteria.

## Repo notes

- **Port 5432 is occupied twice.** The Windows `postgresql-x64-18` service owns
  `localhost:5432`, so the `askdocs-db` Docker container (PostgreSQL 17) is not
  reachable through localhost. The API currently uses the Windows service. If
  you later want the container instead, stop the service or move one of them to
  another port, then update `askdocs-api/.env`.
- `askdocs-api/` currently has its own nested `.git` directory, so the parent
  repository does not track it. Decide later whether to merge its history into
  the main repo.
- `.env` files are ignored. `.env.example` files are committed and safe to share.
- `lesson4/node_modules` is no longer tracked; dependencies are ignored.
