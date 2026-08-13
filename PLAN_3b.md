# 3b — The matching pipeline (~20 min)

## Prerequisite

3a must be done first: `NOTES.md` (repo root) must exist with the exact
working `$vectorSearch` stage and index name (`people_vector`), and the
`$rerank` availability verdict. **Read `NOTES.md`, don't re-derive the vector
search syntax from scratch or from docs.** If `NOTES.md` doesn't exist yet,
stop — 3a isn't done.

## Context you need before starting

Canonical schema is the `people` collection (see `PLAN_3a.md`'s schema block
if you need the doc shape again — `handle`, `tags[]` prefixed `topic:`/`ai:`/
`stack:`/`role:`/`lang:`, `text`, `repos[]`, `enriched`). There is no other
schema. `attendees`/`AttendeeDoc`/`lib/matching.ts` do not exist — don't
recreate them.

There are 10 real test people already seeded and enriched in `people`, handle
prefix `mongodbtest` (e.g. `mongodbtestollama`, `mongodbtestpgvector`,
`mongodbtestripgrep`, `mongodbtesthelix`) — use these to sanity-check your
pipeline instead of waiting on real attendee signups. Cleanup later: `db.people.deleteMany({ handle: /^mongodbtest/ })`. Tag spread across them: several
`lang:rust` + `stack:rust` (just, fd, zellij, helix, ripgrep), `ai:llm`/
`ai:ollama`/`ai:openai`/`ai:embeddings` (ollama, pgvector, llm), `lang:go`
(ollama, bubbletea), `lang:python` + `stack:postgres` (pgcli). Good for
testing both vector similarity and tag/graph overlap on the same data.

`tagstats` collection already exists (built by `scripts/enrich.mjs`): one doc
per tag, `{ _id: <tag>, count: <int>, people: [<handles>] }`, sorted by count
desc. That's your inverse-frequency source — don't recompute it inline.

## What to build

**One exported function, one file: `lib/match.js` → `findMatches(handle)`.**
This is used by every surface (`/me`, `/stage`) from step 4 onward. Never
write a second matching path — if you're tempted to write a quick one-off
query in a route handler instead of calling this, don't.

### Pipeline

1. `$vectorSearch` on `people_vector` using the target person's `text`,
   syntax exactly as verified in `NOTES.md`.
2. `$match` excluding the target person themself (by `handle`).
3. `$graphLookup` self-joining `people` on `tags` (people who share at least
   one tag with the target), `maxDepth: 1` — this is the second-hop
   contribution (a friend-of-a-friend via shared tags).
4. Score each candidate (see Scoring below).
5. `$sort` by score desc, `$limit` to a small top-N (3 is what surfaces need,
   pull a few extra internally in case of ties/degraded fallback).

### Scoring

For each shared tag between target and candidate:
- Weight by prefix: `topic:` = 5, `ai:` = 4, `stack:` = 3, `role:` = 2,
  `lang:` = 1.
- Scale by inverse frequency from `tagstats` — a tag two people share that
  only 2 people in the whole graph have should count for more than a tag 40
  people have. Use something like `weight * (1 / count)` or
  `weight * log(totalPeople / count)` — pick one, document which in a code
  comment only if the formula itself isn't self-evident from the code.
- Add a smaller contribution for second-hop connections found via
  `$graphLookup` (shared-tag-of-a-shared-tag, i.e. candidates reachable
  through an intermediate person) — this should meaningfully matter less
  than a direct shared tag, not dominate it.
- Add the raw `$vectorSearch` score as an additional signal (normalize it
  onto a comparable scale with the tag score, don't just add a 0-1 float to
  a tag score in the tens/hundreds — pick a sane blend, e.g. weight the
  vector score by a constant tuned by eyeballing `scripts/match.mjs` output
  on the seeded test data, see below).

### Return shape

Per match, `findMatches` returns:
```
{
  handle, name, email, githubUrl,
  sharedTags: string[],
  reason: string,       // single tag, the strongest shared signal, for display
  evidenceRepo: { name, url, ... },  // a real repo URL backing the match, not a placeholder
  path: [...],          // hop array for /stage's step 5 visualization: you -> tag -> person -> repo, or similar
  score: number,
}
```
Exact `path` shape is your call, but it needs to be renderable hop-by-hop by
step 5 without another database round-trip — bake in what step 5 needs
(labels for each hop) now rather than re-deriving it in `/stage` later.

### Degrade, never throw

- Target has empty/no `tags` → skip the tag/graph scoring, fall back to
  vector-only ranking. Don't throw, don't return empty — still return
  results if `$vectorSearch` succeeds.
- `$vectorSearch` fails or errors (e.g. index not ready, network hiccup) →
  fall back to plain tag-overlap ranking (`$match` + `$addFields` +
  `$setIntersection`-style overlap counting, no vector stage at all). Mark
  the result with `degraded: true` so callers can show a subtler UI state
  later if they want (step 4/5 aren't required to use this flag yet, but the
  field needs to exist).
- Handle with zero matches found (e.g. only person in the graph, or the
  10 test seeds are all that exist) → return `{ matches: [], degraded:
  false }`, not an error.

## `scripts/match.mjs <handle>` CLI harness

- Prints `findMatches(handle)`'s results with a score breakdown per match
  (not just the final number — show the tag-score component, the graph-hop
  component, and the vector-score component separately, so a human can see
  why #1 beat #2).
- `--all` flag: runs `findMatches` for every enriched person in `people` and
  prints a compact one-line-per-person summary (top match + score).
- **Run it against the seeded test data before building any UI.** Try
  `node scripts/match.mjs mongodbtestollama` — does it surface `pgvector`
  or `llm` (both AI-adjacent) above `bubbletea` (same language, unrelated
  domain)? Try `node scripts/match.mjs mongodbtesthelix` — does it surface
  other Rust CLI tools (`ripgrep`, `fd`, `just`, `zellij`) above the
  Python/Go ones? If the ranking looks wrong to a human reading it, the
  scoring formula is wrong — fix it here, before step 4 wires it into a
  page. The bar from the original plan: *"the question is whether you'd walk
  across a room to meet the person it picked."*

## Definition of done

- `lib/match.js` exports `findMatches(handle)`, used nowhere yet (step 4
  wires it in) but callable standalone.
- `scripts/match.mjs <handle>` and `scripts/match.mjs --all` both run clean
  against the real seeded data.
- You've personally read the match.mjs output for at least 3 of the 10
  `mongodbtest*` handles and the rankings make sense to a human.
- Degrade paths (`empty tags`, `$vectorSearch` failure) verified by hand —
  temporarily point at a bad index name or blank a test doc's `tags` and
  confirm it still returns results instead of throwing, then revert.
- Nothing in `app/` changed — 3b is `lib/match.js` + `scripts/match.mjs`
  only. Wiring it into `/me` is step 4.

## Cut-list awareness (from the master plan, don't lose sight of this)

If time runs short later, the plan's cut order is: `$rerank` first, then
second-hop scoring, then the `/stage` hop animation, then the Gemini intro.
**Never cut**: `/form`, enrichment, `$vectorSearch` + `$graphLookup`, `/me`.
So build the second-hop `$graphLookup` contribution, but don't gold-plate it
— direct tag overlap is the part that must work well; second-hop is allowed
to be rougher since it's first on the chopping block.
