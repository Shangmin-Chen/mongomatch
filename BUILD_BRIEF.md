# Build Brief: MongoMatch

## What
A live graph of everyone at a conference, built from their GitHub, that tells each person which other attendee can unblock them. Gets better as more people join.

## Hard constraints
- **90 minutes**: Ship over polish.
- **No auth, no validation, no error states, no admin UI.**
- **Ingest triggers exactly one best-effort, vector-search-grounded, non-blocking memory call** per enriched person — it never blocks or fails the deterministic write. Matching (`tags`/`text`/`repos`/`$vectorSearch`/`$graphLookup`) is fully computed and committed independent of whether this call succeeds.
- **Exactly one LLM call synchronous with a user-facing action**, at demo time (`/explore`), to narrate a path the DB already found. (The ingest-time memory call is the other LLM call site — it's async/best-effort, never something a human is waiting on.)
- **Idempotent, re-runnable enrichment** — people submit right up to demo time.

## Stack
- **Framework**: Next.js (App Router, API routes / Server Actions)
- **Database**: MongoDB Atlas (M10 Dedicated, `us-west-1`)
- **LLM**: OpenRouter (paid, cheap model — `openai/gpt-4o-mini` — ~$10 budget, no rate-limit design needed at this call volume)

## MongoDB Atlas — REQUIRED (The Core Superpowers)
- **Automated Embedding / Vector Index**: Indexed concatenated `text` field (`description` + `repo descriptions` + `topics`).
- **`$vectorSearch`**: Semantic retrieval on the user ask.
- **`$graphLookup`**: Multi-hop graph traversal (`person` → `topics/repos` → `people`). This is the core differentiator.
- **`$rerank`**: On the candidate set if available on cluster; drop gracefully if not.
- **One collection document model**: Raw form input, cached GitHub payload, derived topics, and embedding all in one doc. No second store, no ETL.

## Data model
- **Nodes**: `person` | `repo` | `topic` | `language`
- **Edges**: 
  - `person → repo` (owns)
  - `repo → topic` (tagged)
  - `repo → language` (uses)
- All edges derive deterministically from GitHub API (`language`, `topics`, `description`, `pushed_at`). No entity extraction.
- Each person doc gets a concatenated `text` field (`description` + `repo descriptions` + `topics`).

## The One Pipeline (Built once, used by both surfaces)
```
$vectorSearch on ask 
  → $graphLookup (person → topics → repos → people) 
  → group + rank by shared-topic count 
  → $rerank (or scoring) 
  → $project
```

## Surfaces
1. **`/` (Homepage)**:
   - Brief one-pager, three buttons: Add Yourself (`/form`), Search Profile (`/profile`), Explore (`/explore`). No DB calls from this page itself. See `PLAN_home.md`.
2. **`/form` (Submit Form)**:
   - Inputs: `name`, `description` (ask/what unblocks you), `email`, `github` handle or repo.
   - Action: Submit → write person doc → redirect to `/[handle]`. Enrichment runs separately (`scripts/enrich.mjs`, manual/local, not triggered from this route).
3. **`/[handle]` or `/[handle]/[project]` (The Permanent Product URL)**:
   - No `/me` prefix — identification is by handle+project, matching the `github` field's `owner` or `owner/repo` shape, so the URL is the identifier directly. Catch-all route (`app/[...slug]/page.tsx`), coexists cleanly with the static `/`, `/form`, `/profile`, `/explore` routes (Next.js resolves static routes before the catch-all). `RESERVED_HANDLES` in `scripts/enrich.mjs` protects those static route names from colliding with a real attendee's handle.
   - Results page showing Top 3 people to talk to: Name, Email, Shared Tag, and a link to the specific repo that proves it. Also a live "you're #N of N so far" counter.
   - Live & dynamic: Reloading later gives updated results as more attendees join.
4. **`/profile`**:
   - Two inputs — GitHub handle, and an optional project name — submits straight to `/[handle]` or `/[handle]/[project]`. No new backend — reuses the profile page's existing lookup/not-found handling. See `PLAN_home.md`.
5. **`/explore` (Operator/Demo Graph View)**:
   - Linked from the homepage, not unlisted. Big dark screen, readable from the back of a room.
   - Query box; renders an actual node/link graph (target person, shared tags, candidate matches, one evidence repo) via `react-force-graph-3d`, with the model-chosen path visually highlighted (color + animated particles) against the rest of the graph. See `PLAN_5.md`.
   - Drafted AI introduction narrated via OpenRouter (the only LLM call synchronous with a user-facing action).

## Enrichment worker
- GitHub PAT via `GITHUB_TOKEN` (never unauthenticated).
- ~3 API calls per person (`/users/{handle}`, `/users/{handle}/repos?sort=pushed&per_page=10`).
- Cache raw response in MongoDB doc.
- Fallback to description text if profile is empty/missing.
- After the deterministic write: one best-effort memory call — `$vectorSearch` retrieves the person's nearest neighbors in `people_vector`, OpenRouter synthesizes a short note on how they fit the graph so far, written to `memoryNote` and blended into `text`. Never blocks, never fails the enrichment run if it errors or times out. See `PLAN_7.md`.

## Build Order
Done: 1. Next.js scaffold + Form + Mongo write. 2. Enrichment worker +
tags/text materialization. 3. `$vectorSearch` + `$graphLookup` pipeline
(`lib/match.js`). Route already moved off `/me` to the app root.

Remaining, **in this exact order** (later steps' prerequisites depend on
earlier ones — see each `PLAN_*.md`'s own Prerequisite section):
1. `PLAN_home.md` — homepage + `/profile`.
2. `PLAN_4.md` — match cards on `/[handle]`.
3. `PLAN_5.md` — `/explore` graph view + OpenRouter narration.
4. `PLAN_7.md` — ingest-time memory pass.
5. `PLAN_6.md` — Rehearse. **Must be last** — its own prerequisite section
   requires `PLAN_home.md`, 4, 5, and 7 all already done.

`PLAN_deploy.md` isn't a build step — it documents state (git/Vercel
connection, env vars) that's already confirmed working. Every other plan's
"Ship it" section is what actually deploys each step.

## Non-goals
- Auth, profile editing, notifications, realtime websocket push, avatars, mobile styling beyond readable, commit velocity ranking.
