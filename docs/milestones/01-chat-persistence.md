# Milestone 1 - Chat persistence

**Goal:** the chat talks to the Express API, every message is stored in
PostgreSQL, and history survives a page refresh and an API restart.

```
React (askdocs) -> lib/api.ts -> Express :4000 -> Prisma -> PostgreSQL (askdocs-db)
```

## Already prepared

- `askdocs-api/prisma/schema.prisma` - `Message` model and `Role` enum.
- `askdocs-api/prisma/migrations/20261026144111_init_message/` - applied migration.
- `askdocs-api/src/db.ts` - shared Prisma client.
- `askdocs-api/src/index.ts` - Express app, CORS for `localhost:3000`, `/health`, `/messages` router.
- `askdocs-api/src/routes/messages.ts` - the three route stubs you will implement.
- `askdocs-api/.env` - DATABASE_URL for the running `askdocs-db` container.
- `askdocs/lib/api.ts` - typed `getMessages`, `sendMessage`, `deleteMessage`.
- `askdocs/.env.example` - `NEXT_PUBLIC_API_URL`.

> The API is an ES module (`"type": "module"` in `package.json`), so relative
> imports inside `askdocs-api/src` must end in `.js` - for example
> `import { prisma } from "../db.js";`. TypeScript resolves that to `db.ts`.

## Task 1 - Read the schema and migration

Open `askdocs-api/prisma/schema.prisma` and the generated
`migration.sql`. Then browse the table:

```bash
npm run db:studio        # from the AskDocs root
```

> `DATABASE_URL` points at `localhost:5432/askdocs`. On this machine that is the
> Windows PostgreSQL 18 service; the Docker `askdocs-db` container is idle
> because both want port 5432. See the repo notes in the root README.

Questions to answer for yourself:

- Why is `role` an enum instead of a free string?
- What does `@default(autoincrement())` guarantee for `id`?
- Why does `createdAt` have `@default(now())` instead of the API sending a date?

## Task 2 - Implement the routes

File: `askdocs-api/src/routes/messages.ts`

### `GET /messages`

- Return every message, oldest first:
  `prisma.message.findMany({ orderBy: { createdAt: "asc" } })`.
- Wrap the query in `try/catch` and answer `500` with
  `{ error: "..." }` if the database fails.
- Respond with `res.json(messages)`.

### `POST /messages`

- Validation is already done; use `parsed.data.text`.
- Persist a user message:
  `prisma.message.create({ data: { role: "user", text: parsed.data.text } })`.
- Respond with status `201` and the created row.
- The created row is the server's version - its `id` and `createdAt` are real
  and should replace any optimistic copy in the UI.

### `DELETE /messages/:id`

- Convert the parameter with `Number(req.params.id)`.
- If it is not a positive integer, answer `400`.
- Use `prisma.message.deleteMany({ where: { id } })` and inspect `count`:
  `0` -> `404`, otherwise `204` with no body.
  (`deleteMany` avoids throwing when the row is missing. You can also use
  `delete` and catch Prisma error `P2025`, but then you must handle the error.)
- Handle database errors with `500`, like the other routes.

## Task 3 - Test the API

From the AskDocs root:

```bash
npm run dev:api
```

In a second terminal:

```bash
curl -i -X POST http://localhost:4000/messages \
  -H "Content-Type: application/json" \
  -d '{"text":"first message"}'

curl http://localhost:4000/messages

curl -i -X DELETE http://localhost:4000/messages/1
curl -i -X DELETE http://localhost:4000/messages/999
```

Expected: `201` with the created row, then a JSON array, then `204`, then `404`.

Confirm the row is really stored: open `npm run db:studio` and check the
`Message` table. Also test bad input (empty text, text over 2000 characters) -
it must answer `400`.

## Task 4 - Wire the chat

File: `askdocs/components/Chat.tsx`

1. Import the client helpers: `getMessages` and `sendMessage` from `@/lib/api`.
2. On mount, load history with `useEffect` and `getMessages()`; show a loading
   state while it runs.
3. Replace the `fetch("/api/messages")` block with `await sendMessage(text)`.
4. Decide how the UI gets the persisted message. Two valid approaches:
   - **Replace the optimistic copy:** give the temporary message a negative or
     `Date.now()` id, then map that id to the returned row.
   - **Reload from the server:** after a successful POST, call `getMessages()`
     again. Simpler, one extra request, and it proves persistence.
5. Add an `error` state so failures are visible instead of only `console.error`.
   Disable the send button while a request is in flight.
6. The hardcoded greeting is not in the database. Remove it, or show it only
   when loaded history is empty.
7. Optional: copy `.env.example` to `.env.local` if you want to change the API URL.
8. Once the flow works end to end, delete `askdocs/app/api/messages/route.ts`
   (the mock route) so there is only one source of truth.

## Task 5 - Verify

- [ ] `GET /messages` returns rows oldest first
- [ ] `POST /messages` persists and returns `201`
- [ ] `DELETE` returns `204` for an existing id and `404` for a missing one
- [ ] Invalid input returns `400`
- [ ] Chat loads previous messages when the page opens
- [ ] Sending a message stores it; refreshing the page shows it again
- [ ] `Ctrl+C` the API, restart it, reload the page - history is still there
- [ ] With the API stopped, the chat shows an error instead of losing the message silently

## Concepts to be able to explain

- What `prisma generate` and `prisma migrate dev` each do
- Why the browser needs `NEXT_PUBLIC_` for the API URL
- Why CORS must allow `http://localhost:3000`
- The difference between optimistic UI and server-confirmed state
- Why `.js` extensions are required in ESM imports

## Stretch goals

- When a user message is stored, also store an `ai` reply (echo for now) so you
  can practice multi-row writes in a transaction.
- Add pagination (`take` / `cursor`).
- Replace the REST send with Socket.IO events (Milestone 4).
