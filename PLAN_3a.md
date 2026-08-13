# 3a — Vector index + verified syntax (~10 min)

## Context you need before starting

Canonical schema is the `people` collection. This is the *only* schema —
an earlier parallel implementation (`attendees` collection, `lib/matching.ts`,
`lib/enrich.ts`, `lib/gemini.ts`, `lib/types.ts`) was deleted. Don't recreate
anything shaped like that. If you see any of those names, something's wrong —
stop and check with the PM.

Current `people` doc shape (see `lib/mongodb.ts` for the connection helper,
`scripts/tags.mjs` for how `tags`/`text` are derived):

```
{
  handle: string,          // lowercase, unique-ish key
  name: string,
  description: string,     // raw "what I'm building / stuck on" ask
  email: string,
  github: string | null,
  githubUrl: string | null,
  repos: [{ name, url, description, language, topics, stars, pushedAt }],
  tags: string[],           // prefixed: "topic:", "ai:", "stack:", "role:", "lang:"
  text: string,             // concatenated description + repo descriptions/names + bare tags, capped 2000 chars
  enriched: boolean,
  enrichedAt: Date,
  enrichError?: string,
  createdAt: Date,
  updatedAt: Date,
}
```

`text` is already deterministic and populated by `scripts/enrich.mjs` for every
enriched doc (including permanent-skip docs, where it falls back to raw
`description`). That's the field to embed. Don't invent a different field.

DB name: `process.env.MONGODB_DB_NAME` (defaults to `"mongomatch"`).
Connect via `MONGODB_URI` — same env vars `scripts/enrich.mjs` already uses
(loads `.env` manually, or falls back to real env).

## What to build

### 1. `scripts/create-index.mjs`

Creates a vector search index named `people_vector` on the `people`
collection, using Atlas's `autoEmbed` type on the `text` field — i.e. Atlas
does the embedding server-side, you are not calling an embeddings API
yourself. Use the Node driver's `db.collection("people").createSearchIndex(...)`
(or the equivalent Atlas Admin API call if the driver version here doesn't
support `createSearchIndex` — check `mongodb` package version in
`package.json`, currently `^7.5.0`, which should support it).

After creating, **poll until status is READY** before exiting — don't just
fire-and-forget. Print the final index definition it created.

Should be re-runnable: if the index already exists, don't error, just report
its current status.

### 2. `scripts/vector-check.mjs "<query>"`

Takes a raw text query as a CLI arg, runs a `$vectorSearch` aggregation stage
against `people_vector` on `text`, prints the ranked results (handle + score).

**Verification requirement, don't skip this**: run it with three different,
semantically distinct query strings (e.g. something like a backend/infra ask,
a frontend/design ask, and an AI/ML ask — pick queries that fit whatever real
data is in the `people` collection right now). The three result rankings
must differ from each other. If two queries return identical top-N rankings,
the index is not actually embedding on `text` — it's returning some default
order (natural order, insertion order, etc). Don't move on until you've
proven three distinct rankings with your own eyes, not just "it ran without
error."

### 3. `NOTES.md` (repo root)

Write down, verbatim, so 3b doesn't have to guess:
- The exact index definition JSON that worked (what `create-index.mjs` sent).
- The exact `$vectorSearch` aggregation stage that worked (what
  `vector-check.mjs` sent) — field names, `path`, `queryVector` vs raw-text
  autoEmbed query syntax, `numCandidates`, `limit`, index name, exactly as
  used.
- One line: is `$rerank` available on this cluster tier or not. (Try it or
  check Atlas docs/cluster tier — M10 dedicated per `BUILD_BRIEF.md`.) This
  gates whether `$rerank` stays in scope for 3b or goes on the cut list.

## Stop condition

If `autoEmbed` isn't available on this cluster tier (i.e. index creation
rejects the `autoEmbed` field type, or Atlas requires you to pass precomputed
vectors instead), **stop and escalate to the PM** — don't work around it by
switching to manual embedding calls. That changes the "zero LLM calls in
ingest path" constraint from `BUILD_BRIEF.md` and needs a decision, not a
silent pivot.

## Definition of done

- `scripts/create-index.mjs` runs clean, index reaches READY, re-running it
  doesn't error.
- `scripts/vector-check.mjs` proves three distinct rankings for three
  distinct queries against real data in `people`.
- `NOTES.md` exists with the working index definition, the working
  `$vectorSearch` stage, and the `$rerank` availability verdict.
- Nothing in `app/` changed. 3a is scripts + notes only — the pipeline
  (`lib/match.js`, wired into routes) is 3b, not this step.
