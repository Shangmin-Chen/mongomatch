# 5 — `/explore` + the narration layer (~20 min)

Renamed from the original "`/stage`" — same operator/demo view, different
route name (`/explore`) and now a real graph visualization instead of a
scripted path reveal. Linked from the homepage now too, not unlisted (see
`PLAN_home.md`).

## Prerequisite

3b is done and verified (`scripts/qa_verify.mjs`, `NOTES.md`). `lib/match.js`
exports `findMatches(handle, { limit = 3 } = {})` — the `limit` option is
confirmed working (`findMatches("mongodbtesthelix", { limit: 8 })` returns 8
ranked candidates). Per candidate you get: `handle, name, email, github,
githubUrl, description, sharedTags, reason, evidenceRepo, path, score,
breakdown`. Note the field is **`breakdown`**, not `scoreBreakdown` —
components are `directTagScore`, `secondHopScore`, `vectorContribution`,
`rawVectorScore`. `path` is a 4-hop array (`person` → `tag` → `repo` →
`match`) — still used below, just not animated hop-by-hop anymore, see
part 3. Step 4 (extending the profile page, `/[handle]`) doesn't need to be
done first, but it's small and unblocks real user-facing value sooner —
consider doing it first anyway.

## LLM provider: OpenRouter, not Gemini

Provider decision changed after this was first scoped: Gemini's free tier
(5 RPM) was going to force throttling logic just to test the thing. Swapped
to **OpenRouter** with a paid-but-cheap model — `OPENROUTER_API_KEY` and
`OPENROUTER_MODEL` (defaults to `openai/gpt-4o-mini`) are already set both
locally and on Vercel Production+Preview (see `PLAN_deploy.md`). At the call
volume this app makes, cost is a rounding error against the ~$10 budget —
don't add cost-tracking, model-downgrading, or any budget-guard logic.
There's also no meaningful rate limit at this volume — don't build
batching/throttling for this step.

OpenRouter is OpenAI-API-compatible. Use plain `fetch` against
`https://openrouter.ai/api/v1/chat/completions` — don't add the `openai` npm
package or any other SDK dependency for one call type. `@google/genai` has
already been removed from `package.json` (uninstalled) — don't reinstall it
or anything Gemini-shaped.

## Why this step looks the way it does

Earlier in planning this got flagged: as originally scoped, the model was
going to receive an already-decided #1 match and just write a caption for
it. That makes it decoration, not intelligence. The fix: **the model gets a
candidate pool, not a decided winner, and it does the picking.** It's doing
real retrieval-grounded reasoning (choose the best of N retrieved-from-Mongo
candidates) and taking an action (drafting the intro), in exactly one call.

There are now two LLM call sites in the app, not one — `PLAN_7.md` added a
separate, async, best-effort memory call inside enrichment itself. That one
writes back to `people` on ingest, unrelated to matching. This step
(`/explore`) is still the only call synchronous with a user-facing action,
and `findMatches` stays a pure read with no introduction-log/dedupe system —
that idea was considered separately and dropped, don't add one now either.

## What to build

### 1. `lib/narrate.js`

One exported function: `draftStageIntro(targetPerson, candidates)` where
`candidates` is the array `findMatches(handle, { limit: 8 })` returns (pull
more than the 3 the profile page (`/[handle]`) shows — the model needs
real options to choose between, not a fait accompli). (Keep this function name/file as-is even
though the route is renamed — it's a general-purpose narration helper, not
tied to the route name.)

The call — `POST https://openrouter.ai/api/v1/chat/completions`, header
`Authorization: Bearer ${process.env.OPENROUTER_API_KEY}`, body
`{ model: process.env.OPENROUTER_MODEL || "openai/gpt-4o-mini", messages: [...], response_format: { type: "json_object" } }`:
- Give the model the target person's `name`/`description` and, for each
  candidate, `name`, `sharedTags`, `evidenceRepo`, `breakdown`. This is the
  retrieved context — real data Mongo already found, nothing invented.
- Ask it to return two things in a single JSON response: which candidate
  (by `handle`, constrained to the exact set you gave it — don't let it
  invent a person) is the best introduction to make, and a punchy
  2-sentence narration citing the specific shared tag / evidence repo.
- `openai/gpt-4o-mini` follows `response_format: { type: "json_object" }`
  reliably — use that instead of hand-parsing free text. Still validate the
  returned `handle` is actually in the candidate set before trusting it —
  treat an out-of-set handle the same as a parse failure, see guardrails.
- **Enforce a short timeout** (3-4s, `AbortSignal.timeout(4000)`) — this
  runs live in front of people, a hung request can't freeze the demo.

**Guardrails, all of which fall back to the same thing — candidate #1 by
`score` (already deterministically ranked) plus a canned template string
built from that candidate's `sharedTags`/`evidenceRepo`:**
- No `OPENROUTER_API_KEY` set at all → never call the API, always use the
  template.
- API call errors, non-2xx, or times out → template.
- Response doesn't parse as JSON, or names a handle outside the given
  candidate set (hallucinated pick) → template.

**This function must never throw and must never return nothing.**

### 2. `app/api/explore/route.ts`

Takes a handle (from the query box, not free text — see below), calls
`findMatches(handle, { limit: 8 })`, then `draftStageIntro`. Returns:
```
{
  target: { handle, name, description },
  candidates: [ ...all 8, each with handle, name, sharedTags, evidenceRepo, path, score ],
  chosenHandle: string,   // which candidate the model (or fallback) picked
  narration: string,
  degraded: boolean,      // true if any guardrail above fired
}
```
Note this returns the **full candidate list**, not just the chosen one —
the graph in part 3 needs all 8 to draw the neighborhood, not just the
winning path.

**The query box takes a handle, not arbitrary free text.** `findMatches` is
handle-based (per 3b — "never write a second matching path"), so
`/explore` reuses it exactly as the profile page (`/[handle]`) does. The
operator types the handle of whoever's being highlighted (or picks from the
`mongodbtest*` seeded handles while rehearsing).

### 3. `app/explore/page.tsx` — a real graph, not a scripted animation

This changed after the first draft of this plan: originally this was a
hop-by-hop CSS-animated path reveal. Redesigned to be an actual node/link
graph, rendered with an existing graph-visualization library — not
hand-built with SVG/canvas/d3-from-scratch. **Use `react-force-graph-3d`**
(wraps `three.js`/WebGL, renders an interactive 3D force-directed graph from
a plain `{ nodes, links }` object — this is exactly the "framework doing the
work" the rest of the app's plain-CSS pages don't need but this one does).

```
npm install react-force-graph-3d three
```

**Next.js gotcha, don't skip this**: `react-force-graph-3d` touches
`window`/WebGL at import time and will break server-side rendering. Import
it with `next/dynamic` and `{ ssr: false }`:
```tsx
const ForceGraph3D = dynamic(() => import("react-force-graph-3d"), { ssr: false });
```

**Data shape** — built from the `/api/explore` response's `target` +
`candidates` array, client-side, no new backend endpoint needed:
- One node for `target` (`type: "you"`).
- One node per unique tag across all candidates' `sharedTags` (`type:
  "tag"`, `id: "tag:" + tagString`).
- One node per candidate (`type: "match"`).
- One node for the **chosen** candidate's `evidenceRepo` only (`type:
  "repo"`) — don't add a repo node per candidate, that's too much clutter
  for a graph that needs to read clearly from across a room.
- Links: target↔tag for every tag any candidate shares with the target,
  tag↔candidate for each candidate's shared tags, and chosen-candidate↔repo
  for the one highlighted path.

**Highlighting the answer, using the library's own features — not custom
animation code:**
- Color the chosen path's nodes/links in the app's accent color (`#00ed64`,
  same as everywhere else in the app); dim everything else (gray/low
  opacity) via `nodeColor`/`linkColor` callback props.
- Use `linkDirectionalParticles` (a built-in prop, e.g. value `4`) **only**
  on the highlighted path's links — animated flow along the real answer,
  static elsewhere. This replaces the old hand-rolled `setTimeout`/CSS-delay
  hop animation entirely; it's the library doing it, not you.
- A slow auto-rotating camera (`onEngineStop` / `controls().autoRotate =
  true` — check the library's actual API surface, it varies by version) is
  a nice built-in touch for a screen nobody's actively dragging, but skip
  it if it's fighting the API — not required.

**Everything else on the page (query input, narration text reveal, back
link) stays plain inline `style={}` + `app/globals.css`, exactly like the
rest of the app** — layered as absolutely-positioned overlays on top of the
graph canvas, which itself fills the viewport with a dark background. The
graph library is the one deliberate exception to "no framework, plain CSS"
on this page specifically — don't let that exception creep into the profile
page (`/[handle]`), `/form`, or `/profile`.

- Query box (handle input) overlaid near the top.
- Graph renders the full neighborhood (target + tags + candidates), chosen
  path highlighted per above.
- Narration text reveals below/beside the graph once the API response
  lands — plain text, plain styling, no animation needed here, the graph is
  already doing the visual work.
- If `degraded` is true, render normally — a fallback result looks like a
  normal result, just from a template instead of a model call. No visible
  "degraded" badge needed.

## Definition of done

- `lib/narrate.js` → `draftStageIntro` runs against real candidates from the
  seeded `mongodbtest*` data and returns a sane pick + narration for at
  least 3 different target handles.
- You've manually forced each guardrail once (unset `OPENROUTER_API_KEY`, or
  temporarily point at a bad model name / short-circuit the fetch) and
  confirmed the fallback template still produces a usable result.
- `/explore` renders end-to-end for a `mongodbtest*` handle: the graph draws
  (target, tags, all 8 candidates, one repo node), the chosen path is
  visually distinct (color + particles) from the rest, and the narration
  text appears.
- The profile page (`/[handle]`) and `findMatches` remain fully
  deterministic — no model call in their path. (Enrichment has its own
  separate, async, best-effort memory call per `PLAN_7.md` — unrelated to
  this step and to matching.)

## Cut-list awareness (updated from the master plan)

If time runs short, in order:
1. `$rerank` — already cut in 3a (unavailable on this cluster tier).
2. Second-hop graph scoring — direct tag overlap alone still demos fine.
3. **3D → 2D graph**: swap `import("react-force-graph-3d")` for
   `import("react-force-graph")` (2D, same author/family, near-identical
   props/data shape) if 3D is fighting you on time, performance, or the
   venue's hardware/projector. Cheap downgrade, same data model, don't
   rebuild anything else.
4. Drop `linkDirectionalParticles`/color highlighting and just render a
   plain graph with no chosen-path emphasis — still "a graph, using a
   framework," just not visually pointing at the answer.
5. The model-drafted intro itself — showing the graph + contact info is
   enough without it (this is also literally what happens automatically if
   `OPENROUTER_API_KEY` is unset — the guardrail template covers this cut
   for free).

**Never cut:** `/form`, enrichment, `$vectorSearch` + `$graphLookup`, the
profile page (`/[handle]`), and — new for this revision — the graph itself
shouldn't regress all the way back to plain path text; a 2D graph (step 3
above) is the floor, not "no graph."

## Ship it

Once Definition of Done above passes locally:
```
git add -A
git commit -m "feat: add /explore graph view (react-force-graph-3d) with OpenRouter narration"
git push origin main
```
Automatic Vercel Production build (see `PLAN_deploy.md`). After pushing,
load `https://mongomatch.vercel.app/explore`, run a real query against a
seeded `mongodbtest*` handle, and confirm both the graph renders (WebGL
works in production, not just `next dev`) and the narration comes back —
don't skip this live check, a working `fetch` to OpenRouter locally doesn't
guarantee the deployed serverless function has the env var wired the same
way, and a client-only WebGL library is exactly the kind of thing that can
behave differently under a production build.
