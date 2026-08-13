# 4 — Extend `/[handle]` with matches (~5 min)

## Route note (already done, not a to-do)

This page used to live at `/me/[...slug]`. It's been moved to the app root:
`app/[...slug]/page.tsx`, so a profile now lives at `/handle` or
`/handle/project` directly (e.g. `/torvalds` or `/torvalds/linux`) — no
`/me` prefix. `app/form/page.tsx`'s post-submit redirect already points at
`/${handle}` to match. `RESERVED_HANDLES` in `scripts/enrich.mjs` already
protects the app's own top-level routes (`form`, `profile`, `explore`,
`api`, plus the original list) from colliding with a real attendee's
handle/project slug — since profiles no longer live under a `/me/`
namespace, that collision is real now, not hypothetical; don't remove that
protection. Identification is by **handle+project**, not handle alone — a
person's `github` field can be `owner` (all repos) or `owner/repo` (one
specific project), and the catch-all route already handles both shapes via
`slug` being 1 or 2 segments. None of this needs rebuilding — it's already
live and build-verified (`next build` succeeds with `/`, `/[...slug]`,
`/form` coexisting cleanly). This step is purely additive on top of it.

## Prerequisite

3b is done and verified: `lib/match.js` exports
`findMatches(handle, { limit = 3 } = {})`. Confirmed working against the
seeded `mongodbtest*` data (`node scripts/match.mjs mongodbtesthelix` etc.),
see `scripts/qa_verify.mjs` for the existing test suite. Call it with no
options for this step — the default `limit: 3` is exactly what the page
needs.

## What to build

Add a matches section to the existing `app/[...slug]/page.tsx`.
**Additive only — don't rewrite the page.** It already fetches the person
doc via `/api/person/[...slug]` (that API route's path didn't need to
change, it's internal); either extend that route to also call
`findMatches` and include it in the response, or add a second small fetch
from the page to a new lightweight endpoint. Whichever is less code — this
is a 5-minute step, don't overthink the wiring.

Match the existing card/section styling already on this page (inline
`style={}` objects, the same dark palette, `lucide-react` icons already
imported) — this project has no CSS/component framework, just plain inline
styles plus `app/globals.css`. Don't reach for a new UI library or invent a
different visual pattern for this one section.

Render up to 3 cards, one per match. Each card needs:
- Name
- The shared reason (`match.reason` — a single tag string like
  `"stack:rust"`, strip the prefix for display, e.g. show "Rust" not
  `"stack:rust"`)
- The evidence repo, as a real clickable link (`match.evidenceRepo.url` /
  `.name`) — this is the "proof" that makes the match credible, don't drop it
- Email (`match.email`), so the attendee actually knows how to reach them

Match objects also carry `match.score` and `match.breakdown` (components:
`directTagScore`, `secondHopScore`, `vectorContribution`, `rawVectorScore`)
— internal/debug info, not for the card UI. Don't display raw scores to
attendees.

## States

- Zero matches (`matches: []`, e.g. only test seeds exist and none share
  anything with this particular person) → say so plainly ("No matches yet —
  check back as more people join"), matching the existing page's pattern for
  the zero-tags state. Not an error state.
- `degraded: true` on the response → matches still render normally. No
  visible degraded UI needed (same call made in `PLAN_5.md` for `/explore` —
  don't build two different degraded-state treatments).
- Unenriched person (`enriched: false`) → skip the match fetch entirely,
  keep the existing "reading your GitHub…" messaging. No point computing
  matches against an empty `tags`/`text`.

## Definition of done

- Load `/mongodbtesthelix` (or any enriched seeded handle) in a browser —
  3 match cards render with real names, a shared-tag reason, a working repo
  link, and an email.
- Load `/` + an unenriched or zero-match handle — no crash, plain language
  instead of empty space.
- `app/api/person/[...slug]/route.ts`'s existing `position`/`total` counter
  (added earlier) still works — don't regress it while wiring this in.

## Ship it

Once Definition of Done above passes locally:
```
git add -A
git commit -m "feat: show top matches on profile pages"
git push origin main
```
Automatic Vercel Production build (see `PLAN_deploy.md`). After pushing,
load `https://mongomatch.vercel.app/mongodbtesthelix` and confirm match
cards render in production, not just locally.
