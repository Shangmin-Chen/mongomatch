# 7 — Ingest-time memory pass, grounded in vector search (~10 min)

## What this is and where it fits

New scope, decided after 3a/3b/4/5 were already planned. Only touches
`scripts/enrich.mjs` (step 2's file) plus one new `lib/memory.js`. Doesn't
depend on step 4 or 5 being done, and doesn't touch `app/`. **Do this
before step 6's rehearsal** — rehearsal re-runs enrichment, and it should
exercise this new pass too.

## The idea

Every time `scripts/enrich.mjs` enriches a person (i.e. every real
submission, live, right up to demo time), fire one automatic, best-effort
AI call that **retrieves that person's nearest neighbors via
`$vectorSearch` on `people_vector`** (the "vector memory" — the index built
in 3a, already live) and synthesizes a short note describing how they fit
into the graph so far. This is not a separate script you run by hand — it's
a step inside the existing enrichment flow, so it fires automatically on
every enrichment run for whichever people were just (re-)enriched that pass.

The retrieval is the point: the model doesn't get a dump of the whole
collection ("running through everything") — it gets the handful of
genuinely similar people that `$vectorSearch` already found, the same
retrieval mechanism `findMatches` uses. That's what makes this a real
"agent reads current memory via retrieval, then writes back improved state"
loop instead of an LLM call that happens to run near a database.

This changes a claim in `BUILD_BRIEF.md` — see the update below. It does
**not** change how matching works: `findMatches`, `$vectorSearch`,
`$graphLookup`, and the deterministic `tags`/`text` fields this step reads
are completely unaffected by whether this call succeeds, fails, or is slow.

## What to build

### 1. `lib/memory.js`

One exported function: `generateMemoryNote(person, { limit = 5 } = {})`.

- Run `$vectorSearch` on `people_vector` using `person.text` (same syntax
  as `NOTES.md` / `lib/match.js`), excluding self, top `limit` results —
  this is the retrieved context, nothing else goes in the prompt.
- Call OpenRouter — `model: process.env.OPENROUTER_MODEL || "openai/gpt-4o-mini"`,
  same `OPENROUTER_API_KEY` already in `.env` and on Vercel (see
  `PLAN_deploy.md`; the fallback is defensive, the env var is already set
  everywhere it needs to be) — don't switch to a different/cheaper model
  for this; at this call volume the cost difference across the whole event
  is fractions of a dollar either way, and a proven reliable model matters
  more than shaving pennies. Prompt: this person's
  `name`/`description`/`tags`, plus the retrieved neighbors' `name`/`tags`.
  Ask for a short (1-2 sentence) note on how they fit into the graph so far
  — grounded in the real retrieved names/tags, not invented ones.
- Return the note string, or `null` on any failure (bad response, timeout,
  missing API key, network error). **Never throw.** Same guardrail
  discipline as `lib/narrate.js` in `PLAN_5.md` — this function's caller
  must never have to handle an exception from it.
- Short timeout (3-4s) — this can't be allowed to stall the enrichment
  worker's concurrency pool.

### 2. Wire it into `scripts/enrich.mjs`

In `processDoc`, right after the existing `peopleCol.updateOne(...)` that
writes `repos`/`tags`/`text`/`enriched` (around line 314-329) and the
`enrichedCount++` — **after** that write has already succeeded, call
`generateMemoryNote(...)` and, if it returned a note (not `null`), do a
second small `$set`:
```
{ memoryNote: note, text: `${text} ${note}` }
```
Appending the note into `text` means future embeddings (and future
matches) benefit from it — richer signal as more people join, which is the
actual "improves over time" story. If `generateMemoryNote` returns `null`,
skip this second write entirely — the person is still fully enriched and
matchable from the first write, they just don't have a memory note. **This
must never affect `enrichedCount`, never cause a `[TRANSIENT-SKIP]`, and
never block other people in the concurrency pool** — it's strictly
additive, after the fact, on top of a person who's already fully enriched
and functional.

**Verify, don't assume:** confirm the `people_vector` autoEmbed index
actually re-embeds when `text` is updated by this second write (it should —
autoEmbed indexes track the source field — but this wasn't tested in 3a
since nothing updated `text` after initial write back then). Check with
`scripts/vector-check.mjs` before/after: run it, seed a memory note change,
re-run it, confirm the ranking reflects the new text. If it doesn't
re-embed on update, drop the "append to `text`" part and just store
`memoryNote` as its own field — don't ship an assumption here.

### 3. `BUILD_BRIEF.md` — already done, nothing to do here

This was originally a to-do in this plan but has already been applied: the
"ZERO LLM calls in the ingest path" constraint and the `/explore` (formerly
`/stage`) "ONLY LLM call" line are both already updated in `BUILD_BRIEF.md`
to describe the two-call-site reality (ingest memory pass + `/explore`
narration). No action needed — just don't reintroduce either of the old
absolute claims if you touch that file for something else.

## Guardrails (same discipline as everywhere else in this app)

- No `OPENROUTER_API_KEY` → `generateMemoryNote` returns `null` immediately,
  no network call attempted.
- API error/timeout/bad response → `null`.
- A `null` result is a completely normal, expected outcome, not a
  degraded/error state — most of the time during rehearsal this will fire
  a lot (many calls in a short window), and that's fine, nothing downstream
  depends on it succeeding.

## Definition of done

- Run `node scripts/enrich.mjs` against the seeded `mongodbtest*` people —
  they still enrich successfully (tags/repos/text as before) regardless of
  whether the memory pass succeeds.
- At least a few of the 10 seeded people end up with a real `memoryNote`
  that references actual other seeded people/tags (read a few by hand —
  same bar as `scripts/match.mjs`: does it sound like it knows what it's
  talking about, or is it generic filler).
- Confirmed (not assumed) whether `text` updates re-embed in the vector
  index, and the doc reflects the answer either way.
- Temporarily broke `OPENROUTER_API_KEY` and re-ran enrichment — confirms
  enrichment still fully succeeds (tags/repos/matching unaffected), just
  without memory notes.

## Ship it

Enrichment (`scripts/enrich.mjs`) is a local/manual script, not something
Vercel runs — so there's no "deploy and check production" step for this one
the way there is for the UI-facing plans. Still commit and push so the repo
stays in sync (and because `lib/memory.js` needs to exist in the deployed
repo even though nothing on Vercel calls it yet):
```
git add -A
git commit -m "feat: add vector-search-grounded ingest memory pass to enrichment worker"
git push origin main
```
