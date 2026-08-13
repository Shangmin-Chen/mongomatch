# 6 — Rehearse (~15 min, non-negotiable)

## Prerequisite

Steps `PLAN_home.md`, 4, 5, and 7 are all done: `/` is the real three-button
homepage, the profile page (`/[handle]`, or `/[handle]/[project]`) shows
match cards, `/explore` renders a graph and a narration for a handle
(`lib/narrate.js` + `OPENROUTER_API_KEY`), and
enrichment now also fires a best-effort `memoryNote` call per person
(`lib/memory.js`, per `PLAN_7.md`). Every prior step has already been
pushed to `main` and confirmed live on Vercel individually — this step
touches no new architecture, it's end-to-end verification of what's already
shipped, plus one small resilience artifact, then you stop.

## What to do, in order

### 1. Re-run enrichment

`node scripts/enrich.mjs` (full run, not `--only-new`) — picks up anyone who
submitted since the last run, refreshes anyone whose GitHub activity
changed, and now also fires the `PLAN_7.md` memory pass for each of them.
Idempotent, safe to run as many times as you want right up to doors-open.
Confirm the summary output shows 0 unexpected permanent-skips among real
attendees (test seeds skipping is fine/expected — they're real repos, they
won't skip), and that a normal run's `enrichedCount` is unaffected by
whether individual memory-note calls succeed or fail — that's the whole
point of `PLAN_7.md`'s guardrails, confirm it holds under a real full run.

### 2. Pick the hero query and run it ten times

Pick one handle — a real attendee if enough have registered by rehearsal
time, otherwise one of the `mongodbtest*` seeds (`mongodbtesthelix` and
`mongodbtestollama` have both produced good-looking results in earlier
testing) — whose `/explore` result is genuinely the "aha" moment: a clear
shared tag, a real evidence repo, a narration that reads as smart rather
than generic.

Run `/explore` against that handle **ten times**, back to back. You're
checking two different things:
- The deterministic side (`findMatches` — ranking, `path`, `evidenceRepo`)
  should be **identical every time**. If it isn't, something's non-
  deterministic in the pipeline that shouldn't be — that's a bug, not
  demo-day variance, go fix it before moving on.
- The model side (`draftStageIntro`'s narration) will vary in wording
  between runs — that's fine — but should never (a) pick a different
  candidate than the top-ranked one without good reason, (b) produce a
  broken/truncated sentence, or (c) trip a guardrail and fall back to the
  template unexpectedly. If it trips the guardrail even once in ten runs,
  read why (bad JSON parse? timeout? hallucinated handle?) and tighten the
  prompt or timeout before rehearsal ends — a guardrail firing live isn't
  catastrophic (the fallback template is still a coherent result) but the
  model path should work more often than not if you're going to rely on it
  as the "aha" moment.

No rate-limit or budget concerns running this ten times back to back —
OpenRouter's paid tier at this volume doesn't need batching or pacing.

### 3. Hardcode a known-good offline fallback

Everything above still depends on network access (Mongo Atlas + OpenRouter
both need it). If wifi dies entirely at the venue, `/explore`'s normal
guardrails (which still hit the DB) can't save you. Prepare a fully
hardcoded fallback for the hero query specifically:

- Capture the hero query's actual result object (`target`, `chosen`
  including its `path`, and a good `narration`) from a real run in step 2.
- Hardcode it as a literal constant in `app/explore/page.tsx` (or a small
  `lib/hero-fallback.json` it imports) — the exact real output, not an
  invented example.
- Wire a manual trigger that bypasses `fetch` entirely and renders that
  constant directly — e.g. typing a specific sentinel into the query box
  (`"offline"` or similar), or a small hidden button. Keep it simple; this
  is a break-glass path, not a feature.
- Confirm it renders correctly with the Next.js dev/prod server running but
  Mongo/network calls failing (e.g. temporarily point `MONGODB_URI` at a
  bad host, or just turn off wifi, and confirm the sentinel path still
  works while a normal handle query fails gracefully rather than hanging).

### 4. Screenshot a good profile page

Once you're confident in the hero handle's profile page (`/handle` or
`/handle/project`, from step 4), take an actual screenshot of it and save
it somewhere reachable without wifi (phone camera roll, saved image on the
presenting laptop). This covers the case where wifi dies before you even
get to `/explore` — you can still show the product visually and talk
through it from a static image.

### 5. Walk the full flow on production once, then stop building

On the live Vercel URL (not localhost), click through all three homepage
buttons once: Add Yourself → submit a real test entry, Search Profile →
find a seeded handle (and try the handle+project variant too), Explore →
run the hero query and confirm the graph actually renders (WebGL in
production, not just `next dev`). This is the first time the entire chain
gets exercised end-to-end in production rather than in pieces per-plan —
do it before declaring done, not after.

If step 3's offline fallback constant needs updating (e.g. you picked a
better hero query in step 2 after writing the fallback), commit and push
that final tweak now:
```
git add -A
git commit -m "chore: rehearsal fixes, final offline fallback"
git push origin main
```

This is the last step. Don't scope-creep into "one more thing" after this —
that's exactly what step 6 exists to prevent.

## Cut list, in priority order, if you're still short on time before this

1. `$rerank` — already cut in 3a (unavailable on this cluster tier, see
   `NOTES.md`), nothing left to do here.
2. Second-hop graph scoring — direct tag overlap alone still demos fine if
   this needs to go.
3. The `/explore` graph: 3D → 2D (`react-force-graph-3d` → `react-force-graph`,
   same data shape, see `PLAN_5.md`'s cut list) before dropping it further;
   don't skip straight to static path text — a 2D graph is the floor.
4. The model-drafted intro — showing the path + contact info is enough
   without it (this is also literally what happens automatically if
   `OPENROUTER_API_KEY` is unset — the guardrail template covers this cut
   for free, no code change needed).

**Never cut:** `/form`, enrichment, `$vectorSearch` + `$graphLookup`, the
profile page.

## Definition of done

- Enrichment re-run clean, no unexpected permanent skips.
- Hero query run 10x: deterministic side identical every time, model side
  sane every time (or the one failure mode found and fixed).
- Offline fallback for the hero query renders with zero network calls,
  verified by actually killing connectivity and checking it still works.
- Screenshot of a good profile page saved somewhere that doesn't need wifi
  to open.
- Full flow walked on the live Vercel production URL, not just localhost:
  homepage → Add Yourself → Search Profile → Explore, all working.
- You've stopped building.
