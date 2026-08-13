# Build Brief: MongoMatch

## What
A live graph of everyone at a conference, built from their GitHub, that tells each person which other attendee can unblock them. Gets better as more people join.

## Hard constraints
- **90 minutes**: Ship over polish.
- **No auth, no validation, no error states, no admin UI.**
- **ZERO LLM calls in the ingest path.** Ingest is fully deterministic.
- **Exactly one LLM call**, at demo time (`/stage`), to narrate a path the DB already found.
- **Idempotent, re-runnable enrichment** — people submit right up to demo time.

## Stack
- **Framework**: Next.js (App Router, API routes / Server Actions)
- **Database**: MongoDB Atlas (M10 Dedicated, `us-west-1`)
- **LLM**: Gemini (free tier, tight rate limits — design so they never matter)

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
1. **`/` (Submit Form)**:
   - Inputs: `description` (ask/what unblocks you), `contact` (handle/phone/email), `github` handle.
   - Action: Submit → write person doc → trigger background enrichment → redirect to `/me/[handle]`.
2. **`/me/[handle]` (The Permanent Product URL)**:
   - Results page showing Top 3 people to talk to: Name, Contact, Shared Topic, and a link to the specific repo that proves it.
   - Live & dynamic: Reloading later gives updated results as more attendees join.
3. **`/stage` (The Unlisted Operator Stage View)**:
   - High-impact big dark screen demo view.
   - Query box for live onstage asks.
   - Renders the multi-hop traversal path hop-by-hop (Node A → Topic X → Repo Y → Attendee B).
   - Drafted AI introduction narrated by Gemini (the ONLY LLM call in the entire app).

## Enrichment worker
- GitHub PAT via `GITHUB_TOKEN` (never unauthenticated).
- ~3 API calls per person (`/users/{handle}`, `/users/{handle}/repos?sort=pushed&per_page=10`).
- Cache raw response in MongoDB doc.
- Fallback to description text if profile is empty/missing.

## Build Order
1. Next.js app scaffold + Form + Mongo write.
2. Enrichment worker + node/edge/topics materialization into MongoDB doc.
3. Graph aggregation pipeline (`$graphLookup` / `$vectorSearch`).
4. `/me/[handle]` dynamic match page.
5. `/stage` visual path renderer + Gemini narrative generator.

## Non-goals
- Auth, profile editing, notifications, realtime websocket push, avatars, mobile styling beyond readable, commit velocity ranking.
